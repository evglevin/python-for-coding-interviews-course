import React, { useState } from 'react';
import {
  FileText,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { Lesson } from '../types/course';
import { PythonCodeBlock } from './PythonCodeBlock';
import { PanelTab } from './PanelTab';

interface LessonPaneProps {
  lesson: Lesson;
  theme: 'dark' | 'light';
  isSolved: boolean;
  onApplySolution: (code: string) => void;
}

type LeftTab = 'question' | 'solution' | 'hints';

/**
 * Renders simple inline markdown: `code`, **bold**, *italic*
 */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="rounded px-1.5 py-0.5 font-mono text-[12.5px]"
          style={{
            backgroundColor: 'var(--inline-code-bg)',
            color: 'var(--inline-code-text)',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*')) {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/** Render with `key={lesson.id}` so tab and revealed hints reset per lesson. */
export const LessonPane = React.memo(function LessonPane({
  lesson,
  theme,
  isSolved,
  onApplySolution,
}: LessonPaneProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>('question');
  const [revealedHints, setRevealedHints] = useState<number>(0);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Top Tabs: Question | Solution | Hints */}
      <div
        className="flex shrink-0 items-center overflow-x-auto border-b px-1 md:px-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {(
          [
            { id: 'question', label: 'Question', icon: FileText },
            { id: 'solution', label: 'Solution', icon: Lightbulb },
            { id: 'hints', label: `Hints (${lesson.hints.length})`, icon: Sparkles },
          ] as const
        ).map((tab) => (
          <PanelTab
            key={tab.id}
            active={activeTab === tab.id}
            icon={tab.icon}
            label={tab.label}
            onClick={() => setActiveTab(tab.id)}
            padding="shrink-0 px-3 py-2.5 md:px-3.5"
          />
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
        {activeTab === 'question' && (
          <div className="space-y-4 text-[14.5px] leading-relaxed text-[var(--text-secondary)]">
            {/* Title + Solved Badge */}
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                {lesson.title}
              </h1>
              {isSolved && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Solved
                </span>
              )}
            </div>

            {/* Lesson Content Blocks */}
            {lesson.blocks.map((block, idx) => {
              if (block.type === 'paragraph') {
                return <p key={idx}>{renderInline(block.text)}</p>;
              }
              if (block.type === 'heading') {
                return (
                  <h3
                    key={idx}
                    className="pt-2 text-base font-bold text-[var(--text-primary)]"
                  >
                    {block.text}
                  </h3>
                );
              }
              if (block.type === 'code') {
                return (
                  <PythonCodeBlock
                    key={idx}
                    code={block.code}
                    theme={theme}
                    caption={block.caption}
                  />
                );
              }
              if (block.type === 'list') {
                return (
                  <ul key={idx} className="list-disc space-y-1.5 pl-5">
                    {block.items.map((item, j) => (
                      <li key={j}>{renderInline(item)}</li>
                    ))}
                  </ul>
                );
              }
              if (block.type === 'note') {
                return (
                  <div
                    key={idx}
                    className="flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div className="space-y-0.5">
                      {block.title && (
                        <div className="font-semibold text-[var(--text-primary)]">
                          {block.title}
                        </div>
                      )}
                      <div>{renderInline(block.text)}</div>
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {/* Challenge Section */}
            <div className="pt-3">
              <h2 className="mb-2 text-base font-bold text-[var(--text-primary)]">
                Challenge
              </h2>
              <p className="mb-3">{renderInline(lesson.challenge.intro)}</p>
              <ul className="list-disc space-y-2.5 pl-5">
                {lesson.challenge.functions.map((fn, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <code
                      className="rounded px-1.5 py-0.5 font-mono text-[12.5px] font-medium"
                      style={{
                        backgroundColor: 'var(--inline-code-bg)',
                        color: 'var(--inline-code-text)',
                      }}
                    >
                      {fn.signature}
                    </code>{' '}
                    — {renderInline(fn.description)}
                  </li>
                ))}
              </ul>
              {lesson.challenge.notes && lesson.challenge.notes.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
                  {lesson.challenge.notes.map((n, i) => (
                    <p key={i}>{renderInline(n)}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Time & Space Complexity */}
            <div className="pt-3">
              <h2 className="mb-2 text-base font-bold text-[var(--text-primary)]">
                Time and Space Complexity
              </h2>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-[var(--text-primary)]">Time:</strong>{' '}
                  {renderInline(lesson.complexity.time)}
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Space:</strong>{' '}
                  {renderInline(lesson.complexity.space)}
                </li>
              </ul>
              {lesson.complexity.note && (
                <p className="mt-3 text-[13.5px] text-[var(--text-muted)]">
                  <em className="font-medium text-[var(--text-secondary)]">Note:</em>{' '}
                  {renderInline(lesson.complexity.note)}
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'solution' && (
          <div className="space-y-4 text-[14.5px] leading-relaxed text-[var(--text-secondary)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Code
            </h2>
            <PythonCodeBlock
              code={lesson.solutionCode}
              theme={theme}
              caption="Python — Reference Solution"
              onApplyToEditor={() => onApplySolution(lesson.solutionCode)}
            />
            <div className="pt-1">
              <h3 className="mb-1.5 text-sm font-bold text-[var(--text-primary)]">
                Explanation
              </h3>
              <p>{renderInline(lesson.solutionExplanation)}</p>
            </div>
            <div
              className="rounded-lg border p-3.5 text-sm"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="mb-1 font-semibold text-[var(--text-primary)]">
                Complexity
              </div>
              <div className="space-y-1 text-[13.5px]">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">Time:</span>{' '}
                  {renderInline(lesson.complexity.time)}
                </div>
                <div>
                  <span className="font-medium text-[var(--text-primary)]">Space:</span>{' '}
                  {renderInline(lesson.complexity.space)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hints' && (
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Progressive Hints
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Reveal one hint at a time when you get stuck before looking at the full solution.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {lesson.hints.map((hint, idx) => {
                const isRevealed = idx < revealedHints;
                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    {isRevealed ? (
                      <div className="p-3.5">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                          Hint {idx + 1}
                        </div>
                        <p className="leading-relaxed">{renderInline(hint)}</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevealedHints(idx + 1)}
                        className="flex w-full items-center justify-between px-3.5 py-3 text-left text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <span>Reveal Hint {idx + 1}</span>
                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
