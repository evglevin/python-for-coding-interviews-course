import React, { useCallback, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelLeftClose,
  Moon,
  Sun,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Github,
} from 'lucide-react';
import type { Section } from '../types/course';
import { isPlainLeftClick, lessonPath } from '../lib/lessonUrl';

interface TopBarProps {
  section: Section;
  positionInSection: number;
  sectionTotal: number;
  totalLessons: number;
  solvedCount: number;
  prevLessonId: string | null;
  nextLessonId: string | null;
  onPrev: () => void;
  onNext: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const REPO_URL = 'https://github.com/evglevin/learn-python-for-coding-interviews';

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const TopBar = React.memo(function TopBar({
  section,
  positionInSection,
  sectionTotal,
  totalLessons,
  solvedCount,
  prevLessonId,
  nextLessonId,
  onPrev,
  onNext,
  sidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
}: TopBarProps) {
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerId = useRef<number | null>(null);

  const startTimer = () => {
    if (timerId.current !== null) return;
    timerId.current = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    setTimerRunning(true);
  };

  const clearTimer = useCallback(() => {
    if (timerId.current === null) return;
    window.clearInterval(timerId.current);
    timerId.current = null;
  }, []);

  const pauseTimer = () => {
    clearTimer();
    setTimerRunning(false);
  };

  const attachHeader = useCallback((header: HTMLElement | null) => {
    if (header) return clearTimer;
  }, [clearTimer]);

  const progressRatio = totalLessons > 0 ? solvedCount / totalLessons : 0;
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);

  return (
    <header
      ref={attachHeader}
      className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-2 select-none md:px-3"
      style={{
        backgroundColor: 'var(--bg-topbar)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Left Navigation Cluster */}
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer ${
            sidebarOpen ? 'bg-[var(--bg-elevated)]' : ''
          }`}
          title={sidebarOpen ? 'Hide lessons sidebar' : 'Show lessons sidebar'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </button>
        <span className="hidden truncate px-1 text-sm font-medium text-[var(--text-primary)] sm:inline">
          Python for Coding Interviews
        </span>

        {!sidebarOpen && (
          <>
            <div className="flex shrink-0 items-center gap-0.5">
              {prevLessonId ? (
                <a
                  href={lessonPath(prevLessonId)}
                  onClick={(e) => {
                    if (!isPlainLeftClick(e)) return;
                    e.preventDefault();
                    onPrev();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Previous lesson"
                  aria-label="Previous lesson"
                >
                  <ChevronLeft className="h-4 w-4" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] disabled:opacity-30 disabled:pointer-events-none"
                  title="Previous lesson"
                  aria-label="Previous lesson"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {nextLessonId ? (
                <a
                  href={lessonPath(nextLessonId)}
                  onClick={(e) => {
                    if (!isPlainLeftClick(e)) return;
                    e.preventDefault();
                    onNext();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Next lesson"
                  aria-label="Next lesson"
                >
                  <ChevronRight className="h-4 w-4" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] disabled:opacity-30 disabled:pointer-events-none"
                  title="Next lesson"
                  aria-label="Next lesson"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="ml-1 flex min-w-0 items-center gap-1.5 text-xs">
              <span className="truncate font-medium text-[var(--text-secondary)]">
                {section.shortTitle}
              </span>
              <span className="shrink-0 text-[var(--text-muted)]">
                ({positionInSection} / {sectionTotal})
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right Utility Cluster */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Stopwatch Timer */}
        {timerOpen ? (
          <div
            className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={timerRunning ? pauseTimer : startTimer}
              className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
              title={timerRunning ? 'Pause timer' : 'Start timer'}
            >
              {timerRunning ? (
                <Pause className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Play className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </button>
            <span className="min-w-[42px] text-center font-mono text-xs font-medium text-[var(--text-primary)]">
              {formatSeconds(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={() => {
                pauseTimer();
                setElapsedSeconds(0);
              }}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Reset timer"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setTimerOpen(false)}
              className="ml-0.5 rounded px-1 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Hide timer"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setTimerOpen(true);
              startTimer();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
            title="Start interview timer"
          >
            <Timer className="h-4 w-4" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Source Code Repository Link */}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] sm:flex"
          title="View source code on GitHub"
          aria-label="View source code on GitHub"
        >
          <Github className="h-4 w-4" aria-hidden="true" />
        </a>

        {/* Progress Ring Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center gap-2 rounded-full border px-1.5 py-1 text-xs font-medium sm:px-2.5 transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
          }}
          title={sidebarOpen ? 'Hide lessons sidebar' : 'Show lessons sidebar'}
        >
          <svg className="h-6 w-6 -rotate-90" viewBox="0 0 28 28">
            <circle
              cx="14"
              cy="14"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-[var(--border-strong)]"
            />
            <circle
              cx="14"
              cy="14"
              r={radius}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-300"
            />
          </svg>
          <span className="font-mono text-xs text-[var(--text-primary)]">
            {solvedCount}/{totalLessons}
          </span>
        </button>
      </div>
    </header>
  );
});
