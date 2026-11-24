import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Play,
  Send,
  Square,
  Terminal,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FlaskConical,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { RunResult, RuntimeStatus } from '../types/course';
import { PanelTab } from './PanelTab';

interface ConsolePanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  height: number;
  onResizeStart: (e: React.PointerEvent) => void;
  result: RunResult | null;
  runtimeStatus: RuntimeStatus;
  onRun: () => void;
  onSubmit: () => void;
  onStop: () => void;
  hasNextLesson: boolean;
  onNextLesson: () => void;
}

type ConsoleTab = 'output' | 'tests';

export const ConsolePanel = React.memo(function ConsolePanel({
  isOpen,
  onToggleOpen,
  height,
  onResizeStart,
  result,
  runtimeStatus,
  onRun,
  onSubmit,
  onStop,
  hasNextLesson,
  onNextLesson,
}: ConsolePanelProps) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('output');
  const [selectedTestIdx, setSelectedTestIdx] = useState(0);
  const [shownResult, setShownResult] = useState(result);

  const tests = result?.testResults ?? [];

  // When a new result arrives, jump to the relevant tab (adjusted during render,
  // so the stale tab is never painted).
  if (result !== shownResult) {
    setShownResult(result);
    if (result?.mode === 'submit' && tests.length > 0) {
      setActiveTab('tests');
      setSelectedTestIdx(Math.max(0, tests.findIndex((t) => !t.passed)));
    } else if (result) {
      setActiveTab('output');
    }
  }

  const isRunning = runtimeStatus === 'running';

  const passedTests = tests.filter((t) => t.passed).length;
  const totalTests = tests.length;
  const selectedTest = tests[selectedTestIdx];

  return (
    <div className="flex shrink-0 flex-col">
      {/* Resizable Drawer Body */}
      {isOpen && (
        <div
          className="relative flex flex-col border-t"
          style={{
            height: `${height}px`,
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-panel)',
          }}
        >
          {/* Top Drag Handle */}
          <div
            onPointerDown={onResizeStart}
            className="absolute -top-1.5 right-0 left-0 z-10 h-3 cursor-row-resize touch-none transition-colors hover:bg-accent/40 md:-top-1 md:h-2"
            title="Drag to resize console"
          />

          {/* Console Tabs */}
          <div
            className="flex shrink-0 items-center justify-between border-b px-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center">
              <PanelTab
                active={activeTab === 'output'}
                icon={Terminal}
                label="Output"
                onClick={() => setActiveTab('output')}
              />
              <PanelTab
                active={activeTab === 'tests'}
                icon={FlaskConical}
                label="Test Cases"
                onClick={() => setActiveTab('tests')}
              >
                {totalTests > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-semibold ${
                      result?.allTestsPassed
                        ? 'bg-emerald-500/15 text-success'
                        : 'bg-rose-500/15 text-danger'
                    }`}
                  >
                    {passedTests}/{totalTests}
                  </span>
                )}
              </PanelTab>
            </div>

            {result && (
              <span className="pr-2 font-mono text-[11px] text-[var(--text-muted)]">
                Runtime: {result.runtimeMs} ms
              </span>
            )}
          </div>

          {/* Console Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3.5 text-sm">
            {isRunning && !result ? (
              <div className="flex h-full items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span>Running Python...</span>
              </div>
            ) : !result ? (
              <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-xs text-[var(--text-muted)]">
                <p>Click <strong className="text-[var(--text-secondary)]">Run</strong><span className="hidden md:inline"> (<kbd className="rounded border border-[var(--border-strong)] px-1 py-0.5 font-mono text-[10px]">⌘/Ctrl + Enter</kbd>)</span> to execute your Python code,</p>
                <p>or <strong className="text-[var(--text-secondary)]">Submit</strong><span className="hidden md:inline"> (<kbd className="rounded border border-[var(--border-strong)] px-1 py-0.5 font-mono text-[10px]">⌘/Ctrl + Shift + Enter</kbd>)</span> to run all test cases.</p>
              </div>
            ) : activeTab === 'output' ? (
              <div className="space-y-3">
                {/* Status Banner */}
                {result.error ? (
                  <div
                    className="flex items-start gap-2 rounded-lg border border-rose-500/30 p-3 text-xs"
                    style={{ backgroundColor: 'var(--accent-red-bg)' }}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 font-semibold text-danger">
                        Runtime Error
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-danger-soft">
                        {result.error}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${
                      result.outputMatches
                        ? 'border-emerald-500/30 text-success'
                        : 'border-amber-500/30 text-warning'
                    }`}
                    style={{
                      backgroundColor: result.outputMatches
                        ? 'var(--accent-green-bg)'
                        : 'rgba(245, 158, 11, 0.08)',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {result.outputMatches ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Output matches expected sample output!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          <span>Output differs from expected sample output</span>
                        </>
                      )}
                    </div>
                    {result.outputMatches && result.mode === 'run' && (
                      <button
                        type="button"
                        onClick={onSubmit}
                        className="rounded bg-[#237a4b] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1d6e43] cursor-pointer"
                      >
                        Submit Now
                      </button>
                    )}
                  </div>
                )}

                {/* Your Output vs Expected Output */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Your Output (stdout)
                    </div>
                    <pre
                      className="min-h-[68px] overflow-x-auto rounded-lg border p-2.5 font-mono text-xs leading-relaxed text-[var(--text-primary)]"
                      style={{
                        backgroundColor: 'var(--bg-code)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {result.stdout.trimEnd() || '(no output)'}
                    </pre>
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Expected Output
                    </div>
                    <pre
                      className="min-h-[68px] overflow-x-auto rounded-lg border p-2.5 font-mono text-xs leading-relaxed text-[var(--text-secondary)]"
                      style={{
                        backgroundColor: 'var(--bg-code)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {result.expectedOutput}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              /* Test Cases Tab */
              <div className="space-y-3">
                {totalTests === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                    Click <strong className="text-[var(--text-secondary)]">Submit</strong> to evaluate your code against all unit & edge-case tests.
                  </div>
                ) : (
                  <>
                    {/* Accepted / Failed Summary Banner */}
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 ${
                        result.allTestsPassed
                          ? 'border-emerald-500/35'
                          : 'border-rose-500/35'
                      }`}
                      style={{
                        backgroundColor: result.allTestsPassed
                          ? 'var(--accent-green-bg)'
                          : 'var(--accent-red-bg)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {result.allTestsPassed ? (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        ) : (
                          <XCircle className="h-5 w-5 text-danger" />
                        )}
                        <div>
                          <div
                            className={`text-sm font-bold ${
                              result.allTestsPassed
                                ? 'text-success'
                                : 'text-danger'
                            }`}
                          >
                            {result.allTestsPassed ? 'Accepted!' : 'Wrong Answer'}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {passedTests} / {totalTests} test cases passed
                          </div>
                        </div>
                      </div>

                      {result.allTestsPassed && hasNextLesson && (
                        <button
                          type="button"
                          onClick={onNextLesson}
                          className="flex items-center gap-1.5 rounded-md bg-[#237a4b] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1d6e43] cursor-pointer"
                        >
                          <span>Next Lesson</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Case Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {tests.map((tc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedTestIdx(idx)}
                          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                            idx === selectedTestIdx
                              ? 'border-accent/60 bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                              : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              tc.passed ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>Case {idx + 1}</span>
                        </button>
                      ))}
                    </div>

                    {/* Selected Test Case Detail */}
                    {selectedTest && (
                      <div className="space-y-2.5 text-xs">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {selectedTest.name}
                        </div>

                        {selectedTest.message && (
                          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-warning-soft">
                            {selectedTest.message}
                          </div>
                        )}

                        <div>
                          <div className="mb-1 text-[11px] font-medium text-[var(--text-muted)]">
                            Input
                          </div>
                          <pre
                            className="overflow-x-auto rounded-md border p-2 font-mono text-[12px]"
                            style={{
                              backgroundColor: 'var(--bg-code)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            {selectedTest.inputDisplay}
                          </pre>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[11px] font-medium text-[var(--text-muted)]">
                              Your Output
                            </div>
                            <pre
                              className={`overflow-x-auto rounded-md border p-2 font-mono text-[12px] ${
                                selectedTest.passed
                                  ? 'text-success-soft'
                                  : 'text-danger'
                              }`}
                              style={{
                                backgroundColor: 'var(--bg-code)',
                                borderColor: 'var(--border-subtle)',
                              }}
                            >
                              {selectedTest.actualDisplay}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-medium text-[var(--text-muted)]">
                              Expected
                            </div>
                            <pre
                              className="overflow-x-auto rounded-md border p-2 font-mono text-[12px] text-[var(--text-secondary)]"
                              style={{
                                backgroundColor: 'var(--bg-code)',
                                borderColor: 'var(--border-subtle)',
                              }}
                            >
                              {selectedTest.expectedDisplay}
                            </pre>
                          </div>
                        </div>

                        {selectedTest.error && (
                          <div>
                            <div className="mb-1 text-[11px] font-medium text-danger">
                              Traceback
                            </div>
                            <pre
                              className="overflow-x-auto whitespace-pre-wrap rounded-md border border-rose-500/30 p-2 font-mono text-[11.5px] text-danger-soft"
                              style={{ backgroundColor: 'var(--bg-code)' }}
                            >
                              {selectedTest.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div
        className="flex h-12 shrink-0 items-center justify-between border-t px-2 md:px-3.5"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <span>Console</span>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-md bg-rose-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-600 cursor-pointer"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onRun}
                className="flex items-center gap-1.5 rounded-md border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                style={{
                  borderColor: 'var(--border-strong)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
                title="Run code (Cmd/Ctrl + Enter)"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Run</span>
              </button>

              <button
                type="button"
                onClick={onSubmit}
                className="flex items-center gap-1.5 rounded-md bg-[#237a4b] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1d6e43] cursor-pointer"
                title="Run all tests & submit (Cmd/Ctrl + Shift + Enter)"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
