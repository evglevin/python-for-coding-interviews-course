import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Link,
  Search,
  Trash2,
} from 'lucide-react';
import type { Lesson, Section } from '../types/course';
import { isPlainLeftClick, lessonPath } from '../lib/lessonUrl';

interface CurriculumSidebarProps {
  sections: Section[];
  lessons: Lesson[];
  currentLesson: Lesson;
  solvedIds: Set<string>;
  collapsedSections: ReadonlySet<string>;
  onSelectLesson: (lessonId: string) => void;
  onToggleSection: (sectionId: string) => void;
  onResetProgress: () => void;
  /** Copies a link carrying the learner's progress; rejects if the clipboard refuses. */
  onSaveProgressLink: () => Promise<void>;
  /** Pixels, or any CSS width (the phone drawer passes one). */
  width: number | string;
}

function scrollActiveLessonIntoView(item: HTMLElement | null) {
  item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export const CurriculumSidebar = React.memo(function CurriculumSidebar({
  sections,
  lessons,
  currentLesson,
  solvedIds,
  collapsedSections,
  onSelectLesson,
  onToggleSection,
  onResetProgress,
  onSaveProgressLink,
  width,
}: CurriculumSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [linkStatus, setLinkStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const linkStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProgressLink = () => {
    const showStatus = (status: 'copied' | 'failed') => {
      setLinkStatus(status);
      if (linkStatusTimer.current !== null) clearTimeout(linkStatusTimer.current);
      linkStatusTimer.current = setTimeout(() => setLinkStatus('idle'), 2500);
    };
    onSaveProgressLink().then(
      () => showStatus('copied'),
      () => showStatus('failed')
    );
  };
  const query = searchQuery.trim().toLowerCase();
  const isFiltering = query.length > 0;

  const lessonsBySection = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const sec of sections) {
      const matched = lessons.filter((l) => {
        if (l.sectionId !== sec.id) return false;
        if (!query) return true;
        return (
          l.title.toLowerCase().includes(query) ||
          String(l.index) === query ||
          sec.shortTitle.toLowerCase().includes(query)
        );
      });
      if (matched.length > 0) {
        map.set(sec.id, matched);
      }
    }
    return map;
  }, [sections, lessons, query]);

  const sectionStats = useMemo(() => {
    const stats = new Map<string, { total: number; solved: number }>();
    for (const l of lessons) {
      const s = stats.get(l.sectionId) ?? { total: 0, solved: 0 };
      s.total++;
      if (solvedIds.has(l.id)) s.solved++;
      stats.set(l.sectionId, s);
    }
    return stats;
  }, [lessons, solvedIds]);

  const solvedCount = solvedIds.size;
  const totalCount = lessons.length;
  const progressPct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return (
    <aside
      className="flex h-full shrink-0 flex-col overflow-hidden rounded-lg border select-none"
      style={{
        width,
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Header + Progress */}
      <div
        className="shrink-0 border-b px-3.5 py-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Lessons
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {solvedCount} of {totalCount} solved ({progressPct}%)
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Search Input */}
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter lessons..."
            className="w-full rounded-md border py-1.5 pr-2.5 pl-8 text-base outline-none md:text-xs transition-colors focus:border-accent"
            style={{
              backgroundColor: 'var(--bg-code)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Scrollable Sections & Lessons */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {lessonsBySection.size === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
            No lessons matching &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            {sections.map((sec) => {
              const secLessons = lessonsBySection.get(sec.id);
              if (!secLessons) return null;

              const { total: secTotal, solved: secSolved } = sectionStats.get(sec.id)!;
              const isSectionComplete = secSolved === secTotal;
              const isCollapsed = !isFiltering && collapsedSections.has(sec.id);

              return (
                <div key={sec.id}>
                  {/* Section Header Banner */}
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    disabled={isFiltering}
                    onClick={() => onToggleSection(sec.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border px-2 py-2 text-left transition-colors enabled:cursor-pointer enabled:hover:border-[var(--border-strong)]"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10.5px] font-mono font-bold ${
                          isSectionComplete
                            ? 'bg-emerald-500/20 text-emerald-500'
                            : 'bg-accent/15 text-accent'
                        }`}
                      >
                        {sec.number}
                      </span>
                      <span className="truncate text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        {sec.shortTitle}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          isSectionComplete
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'text-[var(--text-muted)]'
                        }`}
                        style={
                          isSectionComplete
                            ? undefined
                            : { backgroundColor: 'var(--bg-code)' }
                        }
                      >
                        {secSolved}/{secTotal}
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </button>

                  {/* Nested Section Lesson Rows */}
                  {!isCollapsed && (
                    <div
                      className="mt-1 ml-3 space-y-0.5 border-l pl-2"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      {secLessons.map((lesson) => {
                        const isSolved = solvedIds.has(lesson.id);
                        const isCurrent = lesson.id === currentLesson.id;

                        return (
                          <a
                            key={lesson.id}
                            ref={isCurrent ? scrollActiveLessonIntoView : undefined}
                            href={lessonPath(lesson.id)}
                            aria-current={isCurrent ? 'page' : undefined}
                            onClick={(e) => {
                              if (!isPlainLeftClick(e)) return;
                              e.preventDefault();
                              onSelectLesson(lesson.id);
                            }}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm no-underline md:py-1.5 md:text-[13px] transition-colors cursor-pointer ${
                              isCurrent
                                ? 'ring-1 ring-inset ring-accent/60 font-semibold text-[var(--text-primary)]'
                                : 'font-normal text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                            }`}
                            style={{
                              backgroundColor: isCurrent
                                ? isSolved
                                  ? 'rgba(34, 197, 94, 0.16)'
                                  : 'color-mix(in srgb, var(--accent) 14%, transparent)'
                                : isSolved
                                ? 'var(--accent-green-bg)'
                                : undefined,
                            }}
                          >
                            <span
                              className={`w-5 shrink-0 text-right font-mono text-[11px] ${
                                isSolved
                                  ? 'text-emerald-500'
                                  : isCurrent
                                  ? 'text-accent'
                                  : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {lesson.index}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {lesson.title}
                            </span>
                            {isSolved && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500 stroke-[2.5]" />
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: Reset Progress + Save to Link */}
      <div
        className="flex shrink-0 items-center justify-between border-t px-3 py-2 text-xs"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        {confirmReset ? (
          <div className="flex w-full items-center justify-between gap-1.5">
            <span className="text-[11px] text-rose-400">Reset all?</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  setConfirmReset(false);
                }}
                className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-rose-500 cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded px-1.5 py-0.5 text-[11px] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[11.5px] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-rose-400 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Reset Progress</span>
            </button>
            <button
              type="button"
              onClick={saveProgressLink}
              className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[11.5px] transition-colors hover:bg-[var(--bg-hover)] cursor-pointer ${
                linkStatus === 'copied'
                  ? 'text-emerald-500'
                  : linkStatus === 'failed'
                  ? 'text-rose-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Copy a link that moves your solved lessons and code to another device"
            >
              {linkStatus === 'copied' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
              <span aria-live="polite">
                {linkStatus === 'copied'
                  ? 'Link copied'
                  : linkStatus === 'failed'
                  ? 'Couldn\u2019t copy'
                  : 'Save to Link'}
              </span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
});
