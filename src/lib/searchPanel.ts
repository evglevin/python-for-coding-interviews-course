import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  search,
  selectMatches,
  setSearchQuery,
} from '@codemirror/search';
import type { EditorState } from '@codemirror/state';
import { runScopeHandlers, type EditorView, type Panel, type ViewUpdate } from '@codemirror/view';

/** Lucide icon nodes (same set the rest of the app uses via lucide-react). */
const ICONS = {
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  caseSensitive:
    '<path d="m3 15 4-8 4 8"/><path d="M4 13h6"/><circle cx="18" cy="12" r="3"/><path d="M21 9v6"/>',
  wholeWord:
    '<circle cx="7" cy="12" r="3"/><path d="M10 9v6"/><circle cx="17" cy="12" r="3"/><path d="M14 7v8"/><path d="M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1"/>',
  regex:
    '<path d="M17 3v10"/><path d="m12.67 5.5 8.66 5"/><path d="m12.67 10.5 8.66-5"/><path d="M9 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2z"/>',
  selectAll:
    '<path d="M14 21h1"/><path d="M14 3h1"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 14v1"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M3 9v1"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M5 3a2 2 0 0 0-2 2"/><path d="M7 12h10"/><path d="M7 16h6"/><path d="M7 8h8"/><path d="M9 21h1"/><path d="M9 3h1"/>',
  replace:
    '<path d="M14 4a2 2 0 0 1 2-2"/><path d="M16 10a2 2 0 0 1-2-2"/><path d="M20 2a2 2 0 0 1 2 2"/><path d="M22 8a2 2 0 0 1-2 2"/><path d="m3 7 3 3 3-3"/><path d="M6 10V5a3 3 0 0 1 3-3h1"/><rect x="2" y="14" width="8" height="8" rx="2"/>',
  replaceAll:
    '<path d="M14 14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2"/><path d="M14 4a2 2 0 0 1 2-2"/><path d="M16 10a2 2 0 0 1-2-2"/><path d="M20 14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2"/><path d="M20 2a2 2 0 0 1 2 2"/><path d="M22 8a2 2 0 0 1-2 2"/><path d="m3 7 3 3 3-3"/><path d="M6 10V5a3 3 0 0 1 3-3h1"/><rect x="2" y="14" width="8" height="8" rx="2"/>',
} as const;

type IconName = keyof typeof ICONS;

const MAX_COUNTED_MATCHES = 999;

function icon(name: IconName): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

function iconButton(
  name: IconName,
  label: string,
  onClick: () => void,
  extraClass = ''
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `pci-search-btn ${extraClass}`.trim();
  button.title = label;
  button.setAttribute('aria-label', label);
  button.innerHTML = icon(name);
  button.addEventListener('click', onClick);
  return button;
}

function textField(placeholder: string): HTMLInputElement {
  const input = document.createElement('input');
  input.className = 'pci-search-input';
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  input.spellcheck = false;
  input.autocomplete = 'off';
  return input;
}

/** "3 of 12" / "No results", based on the current query and main selection. */
function describeMatches(state: EditorState, query: SearchQuery): string {
  if (!query.search) return '';
  if (!query.valid) return 'Invalid';
  const { from, to } = state.selection.main;
  const cursor = query.getCursor(state);
  let total = 0;
  let current = 0;
  for (let next = cursor.next(); !next.done; next = cursor.next()) {
    total++;
    if (next.value.from === from && next.value.to === to) current = total;
    if (total > MAX_COUNTED_MATCHES) return `${MAX_COUNTED_MATCHES}+`;
  }
  if (total === 0) return 'No results';
  return current ? `${current} of ${total}` : `${total} found`;
}

class SearchPanel implements Panel {
  dom: HTMLElement;
  top = true;
  private query: SearchQuery;
  private searchField: HTMLInputElement;
  private replaceField: HTMLInputElement;
  private toggles: Record<'caseSensitive' | 'wholeWord' | 'regexp', HTMLButtonElement>;
  private count: HTMLElement;
  private replaceRow: HTMLElement;
  private expandButton: HTMLButtonElement | null = null;

  constructor(private view: EditorView) {
    this.query = getSearchQuery(view.state);

    this.searchField = textField('Find');
    this.searchField.setAttribute('main-field', 'true');
    this.searchField.addEventListener('input', () => this.commit());

    this.replaceField = textField('Replace');
    this.replaceField.addEventListener('input', () => this.commit());

    this.toggles = {
      caseSensitive: this.optionToggle('caseSensitive', 'Match case'),
      wholeWord: this.optionToggle('wholeWord', 'Match whole word'),
      regexp: this.optionToggle('regex', 'Use regular expression'),
    };

    const findBox = document.createElement('div');
    findBox.className = 'pci-search-field';
    findBox.append(this.searchField, ...Object.values(this.toggles));

    this.count = document.createElement('span');
    this.count.className = 'pci-search-count';
    this.count.setAttribute('aria-live', 'polite');

    const findRow = document.createElement('div');
    findRow.className = 'pci-search-row';
    findRow.append(
      findBox,
      this.count,
      iconButton('arrowUp', 'Previous match (Shift+Enter)', () => findPrevious(view)),
      iconButton('arrowDown', 'Next match (Enter)', () => findNext(view)),
      iconButton('selectAll', 'Select all matches', () => selectMatches(view)),
      iconButton('x', 'Close (Escape)', () => closeSearchPanel(view), 'pci-search-close')
    );

    const replaceBox = document.createElement('div');
    replaceBox.className = 'pci-search-field';
    replaceBox.append(this.replaceField);

    this.replaceRow = document.createElement('div');
    this.replaceRow.className = 'pci-search-row';
    this.replaceRow.append(
      replaceBox,
      iconButton('replace', 'Replace (Enter)', () => replaceNext(view)),
      iconButton('replaceAll', 'Replace all', () => replaceAll(view))
    );

    const rows = document.createElement('div');
    rows.className = 'pci-search-rows';
    rows.append(findRow);

    this.dom = document.createElement('div');
    this.dom.className = 'pci-search';
    this.dom.addEventListener('keydown', (e) => this.keydown(e));

    if (!view.state.readOnly) {
      this.expandButton = iconButton(
        'chevronRight',
        'Toggle replace',
        () => this.setReplaceVisible(this.replaceRow.hidden),
        'pci-search-expand'
      );
      rows.append(this.replaceRow);
      this.dom.append(this.expandButton);
      this.setReplaceVisible(Boolean(this.query.replace));
    }
    this.dom.append(rows);

    this.setQuery(this.query);
  }

  private optionToggle(name: IconName, label: string): HTMLButtonElement {
    const el = iconButton(name, label, () => {
      el.setAttribute('aria-pressed', String(!this.isPressed(el)));
      this.commit();
    }, 'pci-search-toggle');
    return el;
  }

  private setReplaceVisible(visible: boolean) {
    this.replaceRow.hidden = !visible;
    this.expandButton?.setAttribute('aria-expanded', String(visible));
  }

  private isPressed(el: HTMLButtonElement) {
    return el.getAttribute('aria-pressed') === 'true';
  }

  private commit() {
    const query = new SearchQuery({
      search: this.searchField.value,
      replace: this.replaceField.value,
      caseSensitive: this.isPressed(this.toggles.caseSensitive),
      wholeWord: this.isPressed(this.toggles.wholeWord),
      regexp: this.isPressed(this.toggles.regexp),
    });
    if (!query.eq(this.query)) {
      this.query = query;
      this.view.dispatch({ effects: setSearchQuery.of(query) });
    }
  }

  private keydown(e: KeyboardEvent) {
    if (runScopeHandlers(this.view, e, 'search-panel')) {
      e.preventDefault();
    } else if (e.key === 'Enter' && e.target === this.searchField) {
      e.preventDefault();
      (e.shiftKey ? findPrevious : findNext)(this.view);
    } else if (e.key === 'Enter' && e.target === this.replaceField) {
      e.preventDefault();
      (e.metaKey || e.ctrlKey ? replaceAll : replaceNext)(this.view);
    }
  }

  private setQuery(query: SearchQuery) {
    this.query = query;
    this.searchField.value = query.search;
    this.replaceField.value = query.replace;
    this.toggles.caseSensitive.setAttribute('aria-pressed', String(query.caseSensitive));
    this.toggles.wholeWord.setAttribute('aria-pressed', String(query.wholeWord));
    this.toggles.regexp.setAttribute('aria-pressed', String(query.regexp));
    this.updateCount();
  }

  private updateCount() {
    const text = describeMatches(this.view.state, this.query);
    this.count.textContent = text;
    this.count.classList.toggle('pci-search-count-empty', text === 'No results' || text === 'Invalid');
  }

  update(update: ViewUpdate) {
    let queryChanged = false;
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (!effect.is(setSearchQuery)) continue;
        queryChanged = true;
        if (!effect.value.eq(this.query)) this.setQuery(effect.value);
      }
    }
    if (queryChanged || update.docChanged || update.selectionSet) this.updateCount();
  }

  mount() {
    this.searchField.select();
  }
}

/** CodeMirror search configured with a panel styled like the rest of the app. */
export const appSearch = search({
  top: true,
  createPanel: (view) => new SearchPanel(view),
});
