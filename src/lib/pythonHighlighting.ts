import { python, pythonLanguage } from '@codemirror/lang-python';
import { HighlightStyle, LanguageSupport, syntaxTree } from '@codemirror/language';
import { Prec, RangeSetBuilder, type Extension } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { highlightTree, styleTags, tags as t, type Highlighter, type Tag } from '@lezer/highlight';
import { StyleModule } from 'style-mod';

/**
 * The Lezer Python grammar tags every identifier as a plain `VariableName`, including the
 * ones inside type annotations, so `typeName` styles never applied. These context rules
 * retag identifiers by their position in the tree. A `*` matches exactly one node, so one
 * rule per nesting depth covers annotations like `Dict[str, List[Tuple[int, int]]]`.
 */
function nestedPaths(context: string, maxDepth: number, leaves: string[]): string {
  const paths: string[] = [];
  for (let depth = 0; depth <= maxDepth; depth++) {
    const prefix = [context, ...Array<string>(depth).fill('*')].join('/');
    for (const leaf of leaves) paths.push(`${prefix}/${leaf}`);
  }
  return paths.join(' ');
}

const pythonStyleOverrides = styleTags({
  in: t.keyword,
  // `x: int`, `def f(a: List[int]) -> Optional[str]`, `c: int | None`
  [nestedPaths('TypeDef', 6, ['VariableName', 'PropertyName'])]: t.typeName,
  // `class Foo(Base, typing.Generic[T])`
  [nestedPaths('ClassDefinition/ArgList', 3, ['VariableName', 'PropertyName'])]: t.className,
  // `@dataclass`, `@functools.cache`
  'Decorator/At Decorator/VariableName': t.function(t.variableName),
});

export const pythonLanguageSupport = new LanguageSupport(
  pythonLanguage.configure({ props: [pythonStyleOverrides] }),
  python().support
);

type SyntaxTree = ReturnType<typeof syntaxTree>;
type SyntaxNode = SyntaxTree['topNode'];

function tagWords(words: string, tag: Tag): [string, Tag][] {
  return words.split(/\s+/).map((word) => [word, tag]);
}

/**
 * The grammar can't tell `int` in `defaultdict(int)` from any other name, so well-known
 * names get their tag by spelling, the way VS Code colors builtins and imported classes.
 */
const KNOWN_NAMES = new Map<string, Tag>([
  ...tagWords(
    'bool bytearray bytes complex dict float frozenset int list object range set slice str tuple type',
    t.typeName
  ),
  ...tagWords(
    'Any Callable DefaultDict Deque Dict FrozenSet Generator Hashable Iterable Iterator ' +
      'List Mapping Optional Sequence Set Tuple Union',
    t.typeName
  ),
  ...tagWords(
    'Counter OrderedDict defaultdict deque SortedDict SortedList SortedSet ' +
      'Exception IndexError KeyError StopIteration TypeError ValueError ZeroDivisionError',
    t.className
  ),
  ...tagWords('bisect collections functools heapq itertools math sortedcontainers typing', t.namespace),
  ...tagWords('self cls', t.self),
]);

/** Positions where a known spelling still names something new, so it keeps its grammar tag. */
function keepsGrammarTag(node: SyntaxNode, tag: Tag): boolean {
  const parent = node.parent?.name;
  if (parent === 'FunctionDefinition' || parent === 'ClassDefinition' || parent === 'Decorator') {
    return true;
  }
  // A parameter called `list` is a variable, but `self` reads the same everywhere.
  if (parent === 'ParamList') return tag !== t.self;
  // Keyword argument names: `f(type=...)`
  return parent === 'ArgList' && node.nextSibling?.name === 'AssignOp';
}

interface StyledSpan {
  from: number;
  to: number;
  classes: string;
}

/**
 * The one source of colors for both the editor and the read-only code blocks: grammar
 * highlighting, with known names recolored. Emits spans in document order.
 */
function highlightPython(
  tree: SyntaxTree,
  readText: (from: number, to: number) => string,
  highlighter: Highlighter,
  from: number,
  to: number,
  putStyle: (from: number, to: number, classes: string) => void
): void {
  const named: StyledSpan[] = [];
  tree.iterate({
    from,
    to,
    enter(node) {
      if (node.name !== 'VariableName') return;
      const tag = KNOWN_NAMES.get(readText(node.from, node.to));
      if (!tag || keepsGrammarTag(node.node, tag)) return;
      const classes = highlighter.style([tag]);
      if (classes) named.push({ from: node.from, to: node.to, classes });
    },
  });

  // Grammar spans with the recolored names cut out of them, then merged back in order.
  const spans: StyledSpan[] = [...named];
  let first = 0;
  highlightTree(
    tree,
    highlighter,
    (spanFrom, spanTo, classes) => {
      while (first < named.length && named[first].to <= spanFrom) first++;
      let pos = spanFrom;
      for (let i = first; i < named.length && named[i].from < spanTo; i++) {
        if (named[i].from > pos) spans.push({ from: pos, to: named[i].from, classes });
        pos = Math.max(pos, named[i].to);
      }
      if (pos < spanTo) spans.push({ from: pos, to: spanTo, classes });
    },
    from,
    to
  );
  spans.sort((a, b) => a.from - b.from);
  for (const span of spans) putStyle(span.from, span.to, span.classes);
}

/** Highlighted segments of a whole snippet; unstyled text has empty `classes`. */
export function highlightPythonCode(
  code: string,
  highlighter: Highlighter
): { text: string; classes: string }[] {
  const tree = pythonLanguageSupport.language.parser.parse(code);
  const segments: { text: string; classes: string }[] = [];
  let pos = 0;
  highlightPython(tree, (from, to) => code.slice(from, to), highlighter, 0, code.length, (from, to, classes) => {
    if (from > pos) segments.push({ text: code.slice(pos, from), classes: '' });
    segments.push({ text: code.slice(from, to), classes });
    pos = to;
  });
  if (pos < code.length) segments.push({ text: code.slice(pos), classes: '' });
  return segments;
}

/** Replaces CodeMirror's `syntaxHighlighting` so the editor uses `highlightPython` too. */
export function pythonSyntaxHighlighting(style: HighlightStyle): Extension {
  const marks = new Map<string, Decoration>();
  const markFor = (classes: string) => {
    let mark = marks.get(classes);
    if (!mark) marks.set(classes, (mark = Decoration.mark({ class: classes })));
    return mark;
  };

  const build = (view: EditorView): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    const tree = syntaxTree(view.state);
    const readText = (from: number, to: number) => view.state.doc.sliceString(from, to);
    for (const { from, to } of view.visibleRanges) {
      highlightPython(tree, readText, style, from, to, (spanFrom, spanTo, classes) =>
        builder.add(spanFrom, spanTo, markFor(classes))
      );
    }
    return builder.finish();
  };

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = build(view);
      }
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          syntaxTree(update.startState) !== syntaxTree(update.state)
        ) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (value) => value.decorations }
  );

  return [Prec.high(plugin), style.module ? EditorView.styleModule.of(style.module) : []];
}

const darkHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#c586c0' },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: '#9cdcfe' },
  { tag: [t.propertyName], color: '#9cdcfe' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#dcdcaa' },
  { tag: [t.labelName], color: '#dcdcaa' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#4fc1ff' },
  { tag: [t.definition(t.name), t.separator], color: '#d4d4d4' },
  { tag: [t.typeName, t.className, t.changed, t.annotation, t.modifier, t.namespace], color: '#4ec9b0' },
  { tag: t.number, color: '#b5cea8' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link], color: '#d4d4d4' },
  { tag: [t.meta, t.comment], color: '#6a9955', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: [t.atom, t.bool, t.null, t.self, t.special(t.variableName)], color: '#569cd6' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#ce9178' },
  { tag: t.invalid, color: '#f44747' },
]);

const lightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#7c3aed' },
  { tag: [t.name, t.propertyName], color: '#1e293b' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#b45309' },
  { tag: [t.typeName, t.className, t.namespace], color: '#0369a1' },
  { tag: t.number, color: '#047857' },
  { tag: [t.comment], color: '#15803d', fontStyle: 'italic' },
  { tag: [t.string, t.inserted], color: '#c2410c' },
  { tag: [t.atom, t.bool, t.null, t.self, t.special(t.variableName)], color: '#2563eb' },
  { tag: t.invalid, color: '#b91c1c' },
]);

export const pythonHighlighting = {
  dark: { style: darkHighlightStyle, foreground: '#e4e4e7' },
  light: { style: lightHighlightStyle, foreground: '#18181b' },
};

export function mountPythonHighlighting(root: Document): void {
  // The read-only code blocks also render when the editor is hidden.
  const modules = [darkHighlightStyle.module, lightHighlightStyle.module].filter(
    (module) => module !== null
  );
  StyleModule.mount(root, modules);
}
