import React, { useCallback, useRef, useState } from 'react';
import { EditorState, Compartment, Prec, type Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  tooltips,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentUnit,
} from '@codemirror/language';
import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {
  pythonHighlighting,
  pythonLanguageSupport,
  pythonSyntaxHighlighting,
} from '../lib/pythonHighlighting';
import { pythonCompletionSource, pythonSignatureHelp } from '../lib/pythonCompletions';
import {
  RotateCcw,
  Plus,
  X,
  Maximize2,
  Minimize2,
  Minus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { RuntimeStatus, SolutionTab } from '../types/course';
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from '../lib/storage';

export interface CodeEditorHandle {
  openDocument: (code: string) => void;
  replaceCode: (code: string) => void;
  configureAppearance: (theme: 'dark' | 'light', fontSize: number) => void;
}

interface CodeEditorProps {
  tabs: SolutionTab[];
  activeTabId: string;
  initialCode: string;
  editorRef: React.RefObject<CodeEditorHandle | null>;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
  onCloseTab: (id: string) => void;
  onChangeCode: (code: string) => void;
  onResetCode: () => void;
  onRun: () => void;
  onSubmit: () => void;
  theme: 'dark' | 'light';
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  runtimeStatus: RuntimeStatus;
  runtimeError?: string;
  isExpanded: boolean;
  /** False on phones, where the editor already fills the screen. */
  canExpand: boolean;
  onToggleExpand: () => void;
}

const MONO_FONT =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace';

/** 16×16 stroke icons in the spirit of VS Code's codicons, used as CSS masks. */
const COMPLETION_ICON_SVGS: Record<string, string> = {
  method:
    '<path d="M8 1.6l5.6 3.1v6.6L8 14.4l-5.6-3.1V4.7z"/><path d="M2.6 4.8L8 7.9l5.4-3.1M8 7.9v6.3"/>',
  variable:
    '<path d="M4 3.5H2.5v9H4M12 3.5h1.5v9H12"/><path d="M5 10l1.6-4h4.4L9.4 10z"/>',
  namespace:
    '<path d="M5.5 2.5c-1.4 0-2 .6-2 2v1.6c0 1-.5 1.9-1.5 1.9 1 0 1.5.9 1.5 1.9v1.6c0 1.4.6 2 2 2M10.5 2.5c1.4 0 2 .6 2 2v1.6c0 1 .5 1.9 1.5 1.9-1 0-1.5.9-1.5 1.9v1.6c0 1.4-.6 2-2 2"/>',
  class:
    '<path d="M2.5 5.5h4v4h-4zM10.5 2.5h3v3h-3zM10.5 10.5h3v3h-3z"/><path d="M6.5 7.5h2.5M9 4v8M9 4h1.5M9 12h1.5"/>',
  keyword: '<path d="M2 4.5h7M11 4.5h3M2 8h3M7 8h7M2 11.5h12"/>',
  constant:
    '<rect x="2.5" y="3.5" width="11" height="9" rx="1"/><path d="M5.5 7h5M5.5 9.5h5"/>',
  property:
    '<path d="M10 2.5a3.5 3.5 0 1 1-1.3 6.8L4 14H2v-2l4.7-4.7A3.5 3.5 0 0 1 10 2.5z"/>',
};

function svgMask(inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function completionIconStyles(isDark: boolean) {
  const colors: Record<string, string> = isDark
    ? { method: '#b180d7', variable: '#75beff', namespace: '#c5c5c5', class: '#ee9d28', keyword: '#c5c5c5', constant: '#75beff', property: '#75beff' }
    : { method: '#652d90', variable: '#007acc', namespace: '#424242', class: '#d67e00', keyword: '#424242', constant: '#007acc', property: '#007acc' };
  const aliases: Record<string, string[]> = {
    method: ['method', 'function'],
    variable: ['variable'],
    namespace: ['namespace'],
    class: ['class', 'type'],
    keyword: ['keyword', 'text'],
    constant: ['constant', 'enum'],
    property: ['property'],
  };
  const styles: Record<string, Record<string, string>> = {};
  for (const [icon, types] of Object.entries(aliases)) {
    const selector = types.map((t) => `.cm-completionIcon-${t}`).join(', ');
    const mask = svgMask(COMPLETION_ICON_SVGS[icon]);
    styles[selector] = { backgroundColor: colors[icon], maskImage: mask, WebkitMaskImage: mask };
  }
  return styles;
}

function makeEditorTheme(theme: 'dark' | 'light', fontSize: number) {
  const isDark = theme === 'dark';
  const completionRowHeight = Math.round(fontSize * 1.7);
  return EditorView.theme(
    {
      '&': {
        backgroundColor: isDark ? '#1e1e22' : '#ffffff',
        color: pythonHighlighting[theme].foreground,
        fontSize: `${fontSize}px`,
      },
      '.cm-content': {
        caretColor: isDark ? '#e4e4e7' : '#18181b',
        padding: '10px 0 24px 0',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: isDark ? '#e4e4e7' : '#18181b',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: isDark ? 'rgba(77, 142, 255, 0.30)' : 'rgba(7, 102, 255, 0.18)',
      },
      '.cm-gutters': {
        backgroundColor: isDark ? '#1e1e22' : '#fafafa',
        color: isDark ? '#8b8b96' : '#6b7280',
        borderRight: isDark ? '1px solid #2a2a30' : '1px solid #e5e7eb',
        paddingRight: '4px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: isDark ? '#26262c' : '#f1f5f9',
        color: isDark ? '#c4c4cc' : '#334155',
      },
      '.cm-activeLine': {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(7, 102, 255, 0.04)',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: isDark ? '#2e2e36' : '#e5e7eb',
        border: 'none',
        color: isDark ? '#a1a1aa' : '#52525b',
        padding: '0 4px',
        borderRadius: '3px',
      },
      '.cm-matchingBracket': {
        backgroundColor: isDark ? 'rgba(77, 142, 255, 0.25)' : 'rgba(7, 102, 255, 0.18)',
        outline: isDark ? '1px solid rgba(77, 142, 255, 0.6)' : '1px solid rgba(7, 102, 255, 0.5)',
      },
      '.cm-tooltip': {
        backgroundColor: isDark ? '#25252b' : '#ffffff',
        border: isDark ? '1px solid #3c3c46' : '1px solid #d4d7de',
        borderRadius: '8px',
        boxShadow: isDark
          ? '0 10px 28px rgba(0, 0, 0, 0.5)'
          : '0 8px 24px rgba(15, 23, 42, 0.14)',
        overflow: 'hidden',
        zIndex: '100',
      },
      // Autocomplete popup inherits `.cm-tooltip` surface, border, radius, and shadow
      // so it matches the signature-help panel above the cursor.
      '.cm-tooltip.cm-tooltip-autocomplete > ul': {
        fontFamily: MONO_FONT,
        fontSize: `${fontSize}px`,
        maxHeight: `${completionRowHeight * 12 + 8}px`,
        minWidth: '260px',
        maxWidth: '520px',
        padding: '4px',
      },
      '.cm-tooltip-autocomplete ul li': {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: `${completionRowHeight}px`,
        lineHeight: `${completionRowHeight}px`,
        padding: '0 8px',
        borderRadius: '5px',
        color: isDark ? '#e4e4e7' : '#18181b',
      },
      '.cm-tooltip-autocomplete ul li:hover': {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
      },
      '.cm-tooltip-autocomplete ul li[aria-selected], .cm-tooltip-autocomplete-disabled ul li[aria-selected]': {
        backgroundColor: isDark ? 'rgba(77, 142, 255, 0.24)' : 'rgba(7, 102, 255, 0.12)',
        color: isDark ? '#ffffff' : '#14161a',
      },
      '.cm-completionLabel': {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      '.cm-completionMatchedText': {
        textDecoration: 'none',
        fontWeight: '700',
        color: isDark ? '#6da6ff' : '#0766ff',
      },
      // Like VS Code, only the focused row shows its detail.
      '.cm-completionDetail': {
        display: 'none',
        marginLeft: 'auto',
        paddingLeft: '16px',
        fontStyle: 'normal',
        fontSize: '0.9em',
        whiteSpace: 'nowrap',
        color: isDark ? '#a1a1aa' : '#6b7280',
      },
      'li[aria-selected] .cm-completionDetail': {
        display: 'inline',
      },
      '.cm-completionIcon': {
        flexShrink: '0',
        width: '16px',
        height: '16px',
        padding: '0',
        opacity: '1',
        boxSizing: 'border-box',
        backgroundColor: isDark ? '#c5c5c5' : '#424242',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: '16px 16px',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: '16px 16px',
      },
      '.cm-completionIcon::after': {
        content: 'none',
      },
      ...completionIconStyles(isDark),
      '.cm-tooltip.cm-completionInfo': {
        padding: '8px 10px',
        fontSize: '12px',
        lineHeight: '1.45',
        color: isDark ? '#c4c4cc' : '#374151',
        maxWidth: '300px',
      },
      '.cm-signature-tooltip': {
        padding: '6px 10px',
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
        fontSize: '12px',
        lineHeight: '1.45',
        maxWidth: '460px',
      },
      '.cm-signature-line': {
        whiteSpace: 'pre-wrap',
      },
      '.cm-signature-name': {
        fontWeight: '700',
        color: isDark ? '#dcdcaa' : '#b45309',
      },
      '.cm-signature-params': {
        color: isDark ? '#e4e4e7' : '#18181b',
      },
      '.cm-signature-doc': {
        marginTop: '3px',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '11.5px',
        color: isDark ? '#a1a1aa' : '#6b7280',
      },
    },
    { dark: isDark }
  );
}

function themeExtensions(theme: 'dark' | 'light', fontSize: number): Extension {
  return [
    makeEditorTheme(theme, fontSize),
    pythonSyntaxHighlighting(pythonHighlighting[theme].style),
  ];
}

const STATUS_UI: Partial<
  Record<
    RuntimeStatus,
    { Icon: typeof Loader2; iconClass: string; label: string; labelClass: string }
  >
> = {
  loading: { Icon: Loader2, iconClass: 'animate-spin text-warning', label: 'Loading Python...', labelClass: 'text-[var(--text-muted)]' },
  error: { Icon: AlertCircle, iconClass: 'text-danger', label: 'Runtime Error', labelClass: 'text-danger' },
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  tabs,
  activeTabId,
  initialCode,
  editorRef,
  onSelectTab,
  onAddTab,
  onCloseTab,
  onChangeCode,
  onResetCode,
  onRun,
  onSubmit,
  theme,
  fontSize,
  onChangeFontSize,
  runtimeStatus,
  runtimeError,
  isExpanded,
  onToggleExpand,
  canExpand,
}) => {
  const initialSettings = useRef({ code: initialCode, theme, fontSize });
  const callbacks = useRef({ onChangeCode, onRun, onSubmit });
  callbacks.current = { onChangeCode, onRun, onSubmit };
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const attachEditor = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;

    const themeCompartment = new Compartment();
    const settings = initialSettings.current;
    const initialAppearance = themeExtensions(settings.theme, settings.fontSize);
    let replacingCode = false;

    const runShortcut = keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          callbacks.current.onRun();
          return true;
        },
      },
      {
        key: 'Mod-Shift-Enter',
        run: () => {
          callbacks.current.onSubmit();
          return true;
        },
      },
    ]);

    const extensions = [
      EditorView.contentAttributes.of({ 'aria-label': 'Python code editor' }),
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      indentUnit.of('    '),
      bracketMatching(),
      closeBrackets(),
      tooltips({ position: 'fixed' }),
      pythonSignatureHelp,
      autocompletion({
        activateOnTyping: true,
        override: [pythonCompletionSource],
        maxRenderedOptions: 30,
        icons: true,
      }),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      pythonLanguageSupport,
      runShortcut,
      Prec.high(
        keymap.of([
          { key: 'Tab', run: acceptCompletion },
          ...completionKeymap,
        ])
      ),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !replacingCode) {
          callbacks.current.onChangeCode(update.state.doc.toString());
        }
        if (update.selectionSet || update.docChanged) {
          const head = update.state.selection.main.head;
          const line = update.state.doc.lineAt(head);
          setCursorPos({
            line: line.number,
            col: head - line.from + 1,
          });
        }
      }),
    ];

    const createState = (doc: string, appearance: Extension) =>
      EditorState.create({ doc, extensions: [...extensions, themeCompartment.of(appearance)] });

    const view = new EditorView({ state: createState(settings.code, initialAppearance), parent: container });

    editorRef.current = {
      openDocument(code) {
        // A fresh state keeps undo history local to each visit to a document.
        const appearance = themeCompartment.get(view.state) ?? initialAppearance;
        view.setState(createState(code, appearance));
        setCursorPos({ line: 1, col: 1 });
      },
      replaceCode(code) {
        const doc = view.state.doc;
        if (doc.toString() === code) return;
        replacingCode = true;
        try {
          view.dispatch({ changes: { from: 0, to: doc.length, insert: code } });
        } finally {
          replacingCode = false;
        }
      },
      configureAppearance(theme, fontSize) {
        view.dispatch({ effects: themeCompartment.reconfigure(themeExtensions(theme, fontSize)) });
      },
    };

    return () => {
      editorRef.current = null;
      view.destroy();
    };
  }, [editorRef]);

  const status = STATUS_UI[runtimeStatus];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top Editor Toolbar */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-1.5 md:px-3"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
            <span>Python 3</span>
          </div>

          {status && (
            <>
              <span className="h-3.5 w-px shrink-0 bg-[var(--border-subtle)]" />

              {/* Runtime status indicator */}
              <div
                className="flex min-w-0 items-center gap-1.5 text-xs"
                title={runtimeError || 'In-browser Python interpreter'}
              >
                <status.Icon className={`h-3.5 w-3.5 shrink-0 ${status.iconClass}`} />
                <span className={`truncate ${status.labelClass}`}>{status.label}</span>
              </div>
            </>
          )}
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <div
            className="mr-1 flex items-center rounded border px-1 py-0.5 text-xs"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => onChangeFontSize(Math.max(FONT_SIZE_MIN, fontSize - 1))}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer md:p-0.5"
              title="Decrease font size"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[26px] text-center font-mono text-[11px] text-[var(--text-secondary)]">
              {fontSize}
            </span>
            <button
              type="button"
              onClick={() => onChangeFontSize(Math.min(FONT_SIZE_MAX, fontSize + 1))}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer md:p-0.5"
              title="Increase font size"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={onResetCode}
            className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
            title="Reset code to starter template"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {canExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
              title={isExpanded ? 'Restore split view' : 'Maximize editor pane'}
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Solution Tabs Bar */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-1"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <span>{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="rounded p-0.5 opacity-60 hover:bg-[var(--bg-hover)] hover:opacity-100 cursor-pointer"
                    title="Close tab"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
          {tabs.length < 5 && (
            <button
              type="button"
              onClick={onAddTab}
              className="shrink-0 rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Add new scratchpad tab"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="hidden shrink-0 pr-2 font-mono text-[11px] text-[var(--text-muted)] sm:block">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </div>
      </div>

      {/* CodeMirror Mount */}
      <div ref={attachEditor} className="min-h-0 flex-1 overflow-hidden" />
    </div>
  );
};
