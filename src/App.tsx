import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  LESSONS,
  SECTIONS,
  getLessonById,
  getLessonsBySection,
  getSectionById,
} from './data';
import type { RunResult, SolutionTab } from './types/course';
import { pyodideRunner } from './lib/pyodideRunner';
import {
  clearAllProgress,
  defaultTabs,
  loadCollapsedSections,
  loadFontSize,
  loadLessonTabs,
  loadProgress,
  loadSidebarOpen,
  loadSolvedIds,
  loadWelcomeSeen,
  replaceProgress,
  saveActiveLessonId,
  saveCollapsedSections,
  saveFontSize,
  saveLessonTabs,
  saveSidebarOpen,
  saveSolvedIds,
  saveTheme,
  saveWelcomeSeen,
} from './lib/storage';
import { lessonIdFromUrl, pushLessonUrl, showLessonInUrl } from './lib/lessonUrl';
import { updateDocumentSeo } from './lib/seo';
import {
  copyProgressLink,
  decodeProgress,
  takeProgressFromUrl,
  type IncomingProgress,
} from './lib/progressLink';
import { TopBar } from './components/TopBar';
import { LessonPane } from './components/LessonPane';
import { CodeEditor, type CodeEditorHandle } from './components/CodeEditor';
import { ConsolePanel } from './components/ConsolePanel';
import { CurriculumSidebar } from './components/CurriculumSidebar';
import { WelcomeDialog } from './components/WelcomeDialog';
import { ImportProgressDialog } from './components/ImportProgressDialog';
import { ConfettiOverlay } from './components/ConfettiOverlay';
import { useIsMobile } from './lib/useIsMobile';
import { BookOpen, Code2, X } from 'lucide-react';

/** Tracks a mouse or touch drag on window until release, with a resize cursor shown meanwhile. */
function startDrag(
  e: React.PointerEvent,
  cursor: 'col-resize' | 'row-resize',
  onMove: (ev: PointerEvent) => void
) {
  e.preventDefault();
  const onPointerUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.body.style.cursor = '';
  };
  document.body.style.cursor = cursor;
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

type MobileView = 'lesson' | 'code';

/** Tallest the console may grow while leaving the editor room above it. */
function maxConsoleHeight() {
  return Math.min(500, Math.max(130, window.innerHeight - 400));
}

const ResizeGutter: React.FC<{ onPointerDown: (e: React.PointerEvent) => void; title: string }> = ({
  onPointerDown,
  title,
}) => (
  <div
    onPointerDown={onPointerDown}
    className="group flex w-2.5 shrink-0 cursor-col-resize touch-none items-center justify-center"
    title={title}
  >
    <div className="h-10 w-1 rounded-full bg-[var(--border-strong)] transition-colors group-hover:bg-accent" />
  </div>
);

export default function App({
  initialTheme,
  initialLessonId,
  enteredViaLessonUrl,
  incomingProgress: initialIncomingProgress,
}: {
  initialTheme: 'dark' | 'light';
  initialLessonId: string;
  /** False when opened at `/` so the home page keeps its canonical metadata through initial mount. */
  enteredViaLessonUrl: boolean;
  /** Progress from a link the page was opened with, awaiting the learner's decision. */
  incomingProgress: IncomingProgress | null;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [fontSize, setFontSize] = useState<number>(() => loadFontSize());
  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => loadSolvedIds());
  const solvedIdsRef = useRef(solvedIds);
  solvedIdsRef.current = solvedIds;
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => !loadWelcomeSeen());
  const [incomingProgress, setIncomingProgress] = useState(initialIncomingProgress);

  const [activeLessonId, setActiveLessonId] = useState(initialLessonId);
  const activeLessonIdRef = useRef(activeLessonId);
  activeLessonIdRef.current = activeLessonId;
  const hasLessonSeoRef = useRef(enteredViaLessonUrl);

  // Phone layout: one pane at a time, and the lessons list slides over the content.
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<MobileView>('lesson');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentLesson = useMemo(() => getLessonById(activeLessonId), [activeLessonId]);
  const currentSection = useMemo(
    () => getSectionById(currentLesson.sectionId),
    [currentLesson.sectionId]
  );
  const sectionLessons = useMemo(
    () => getLessonsBySection(currentLesson.sectionId),
    [currentLesson.sectionId]
  );
  const positionInSection =
    sectionLessons.findIndex((l) => l.id === currentLesson.id) + 1;

  // CodeMirror can emit multiple edits before React renders the updated tabs.
  const [tabs, setTabs] = useState<SolutionTab[]>(() =>
    loadLessonTabs(currentLesson.id, currentLesson.starterCode)
  );
  const tabsRef = useRef(tabs);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const editorRef = useRef<CodeEditorHandle>(null);

  // Lessons sidebar
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => loadSidebarOpen());
  const [sidebarWidth, setSidebarWidth] = useState<number>(268);
  // The saved state may collapse the restored lesson's section; keep it visible on load.
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const collapsed = loadCollapsedSections();
    collapsed.delete(currentLesson.sectionId);
    return collapsed;
  });

  // Runtime + console state
  const { status: runtimeStatus, error: runtimeError } = useSyncExternalStore(
    pyodideRunner.subscribe,
    pyodideRunner.getSnapshot
  );
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(250);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  // Split pane state
  const [leftWidthPct, setLeftWidthPct] = useState(44);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const contentSplitRef = useRef<HTMLDivElement | null>(null);

  const updateTabs = useCallback((next: SolutionTab[]) => {
    tabsRef.current = next;
    setTabs(next);
  }, []);

  const persistTabs = useCallback((next: SolutionTab[]) => {
    updateTabs(next);
    saveLessonTabs(activeLessonId, next);
  }, [activeLessonId, updateTabs]);

  const openTab = useCallback((tab: SolutionTab) => {
    setActiveTabId(tab.id);
    editorRef.current?.openDocument(tab.code);
  }, []);

  const setSectionCollapsed = useCallback((sectionId: string, collapsed: boolean) => {
    if (collapsedSections.has(sectionId) === collapsed) return;
    const next = new Set(collapsedSections);
    if (collapsed) next.add(sectionId);
    else next.delete(sectionId);
    setCollapsedSections(next);
    saveCollapsedSections(next);
  }, [collapsedSections]);

  /** Opens a lesson. `fromHistory` means the URL already points at it (Back/Forward). */
  const selectLesson = useCallback(
    (lessonId: string, fromHistory = false) => {
      if (lessonId === activeLessonId) return;
      const lesson = getLessonById(lessonId);
      if (lesson.sectionId !== currentLesson.sectionId) {
        setSectionCollapsed(lesson.sectionId, false);
      }
      hasLessonSeoRef.current = true;
      activeLessonIdRef.current = lesson.id;
      setActiveLessonId(lesson.id);
      saveActiveLessonId(lesson.id);
      if (!fromHistory) pushLessonUrl(lesson.id);
      const nextTabs = loadLessonTabs(lesson.id, lesson.starterCode);
      updateTabs(nextTabs);
      openTab(nextTabs[0]);
      setRunResult(null);
    },
    [activeLessonId, currentLesson.sectionId, openTab, setSectionCollapsed, updateTabs]
  );

  // Keep document title, description, and canonical synced once viewing a lesson route.
  // When entered at `/`, leave the home page's canonical & head metadata intact through initial mount.
  useEffect(() => {
    if (!hasLessonSeoRef.current) return;
    updateDocumentSeo(currentLesson, currentSection);
  }, [currentLesson, currentSection]);

  // Defer loading Pyodide WASM until the user first interacts so initial page load stays fast.
  useEffect(() => {
    const startRuntime = () => pyodideRunner.warmup();
    window.addEventListener('pointerdown', startRuntime, { once: true, passive: true });
    window.addEventListener('keydown', startRuntime, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', startRuntime);
      window.removeEventListener('keydown', startRuntime);
    };
  }, []);

  // Browser Back/Forward changes the URL; open the lesson it now names.
  useEffect(() => {
    const onPopState = () => {
      const lessonId = lessonIdFromUrl();
      if (lessonId) selectLesson(lessonId, true);
      else showLessonInUrl(activeLessonId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeLessonId, selectLesson]);

  // A progress link for the lesson that is already open changes only the URL fragment.
  useEffect(() => {
    const onHashChange = () => {
      const data = takeProgressFromUrl();
      if (data !== null) void decodeProgress(data).then(setIncomingProgress);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const handleChangeCode = useCallback(
    (newCode: string) => {
      persistTabs(
        tabsRef.current.map((t) => (t.id === activeTabId ? { ...t, code: newCode } : t))
      );
    },
    [activeTabId, persistTabs]
  );

  const handleSelectTab = useCallback((tabId: string) => {
    if (tabId === activeTabId) return;
    const tab = tabsRef.current.find((tab) => tab.id === tabId);
    if (tab) openTab(tab);
  }, [activeTabId, openTab]);

  const handleAddTab = useCallback(() => {
    const tabs = tabsRef.current;
    const newTab: SolutionTab = {
      id: `tab-${Date.now()}`,
      name: `Solution ${tabs.length + 1}`,
      code: currentLesson.starterCode,
    };
    persistTabs([...tabs, newTab]);
    openTab(newTab);
  }, [currentLesson.starterCode, openTab, persistTabs]);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tabs = tabsRef.current;
      if (tabs.length <= 1) return;
      const next = tabs.filter((t) => t.id !== tabId);
      persistTabs(next);
      if (tabId === activeTabId) openTab(next[0]);
    },
    [activeTabId, openTab, persistTabs]
  );

  const handleApplyCode = useCallback((code: string) => {
    editorRef.current?.replaceCode(code);
    handleChangeCode(code);
  }, [handleChangeCode]);

  // On a phone the editor is hidden behind the lesson, so show it with the code just loaded.
  const handleApplySolution = useCallback((code: string) => {
    handleApplyCode(code);
    setMobileView('code');
  }, [handleApplyCode]);

  const handleResetCode = useCallback(() => {
    handleApplyCode(currentLesson.starterCode);
  }, [currentLesson.starterCode, handleApplyCode]);

  const executeCode = useCallback(
    async (mode: 'run' | 'submit') => {
      if (runtimeStatus === 'running') return;
      setConsoleOpen(true);
      const lesson = currentLesson;
      const tabs = tabsRef.current;
      const tab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
      const res = await pyodideRunner.execute({
        mode,
        code: tab.code,
        expectedOutput: lesson.expectedOutput,
        testCases: lesson.testCases,
      });

      if (mode === 'submit' && res.allTestsPassed) {
        const prev = solvedIdsRef.current;
        if (!prev.has(lesson.id)) {
          const next = new Set(prev);
          next.add(lesson.id);
          solvedIdsRef.current = next;
          saveSolvedIds(next);
          setSolvedIds(next);

          if (LESSONS.length > 0 && LESSONS.every((l) => next.has(l.id))) {
            setShowConfetti(true);
          }
        }
      }

      // Ignore stale console results if the learner switched lessons while Python was starting/running.
      if (activeLessonIdRef.current === lesson.id) {
        setRunResult(res);
      }
    },
    [activeTabId, currentLesson, runtimeStatus]
  );

  const handleRun = useCallback(() => {
    void executeCode('run');
  }, [executeCode]);

  const handleSubmit = useCallback(() => {
    void executeCode('submit');
  }, [executeCode]);

  const handleStop = useCallback(() => {
    pyodideRunner.stopExecution();
  }, []);

  const currentIdx = currentLesson.index;
  const prevLessonId = currentIdx > 0 ? LESSONS[currentIdx - 1].id : null;
  const nextLessonId = currentIdx < LESSONS.length - 1 ? LESSONS[currentIdx + 1].id : null;

  const goToPrev = useCallback(() => {
    if (prevLessonId) selectLesson(prevLessonId);
  }, [prevLessonId, selectLesson]);

  const goToNext = useCallback(() => {
    if (nextLessonId) selectLesson(nextLessonId);
  }, [nextLessonId, selectLesson]);

  const handleResetProgress = useCallback(() => {
    clearAllProgress();
    const empty = new Set<string>();
    solvedIdsRef.current = empty;
    setSolvedIds(empty);
    setShowConfetti(false);
    const next = defaultTabs(currentLesson.starterCode);
    updateTabs(next);
    if (activeTabId === next[0].id) editorRef.current?.replaceCode(next[0].code);
    else openTab(next[0]);
    setRunResult(null);
  }, [activeTabId, currentLesson.starterCode, openTab, updateTabs]);

  const handleSaveProgressLink = useCallback(
    () => copyProgressLink(loadProgress(), activeLessonId),
    [activeLessonId]
  );

  const handleCloseImportProgress = useCallback(
    (load: boolean) => {
      if (load && incomingProgress?.status === 'valid') {
        const result = replaceProgress(incomingProgress.progress);
        if (result !== 'saved') {
          setIncomingProgress({ status: result === 'partial' ? 'savePartial' : 'saveFailed' });
          return;
        }
        const importedSolved = new Set(incomingProgress.progress.solved);
        solvedIdsRef.current = importedSolved;
        setSolvedIds(importedSolved);
        const next = loadLessonTabs(currentLesson.id, currentLesson.starterCode);
        updateTabs(next);
        openTab(next[0]);
        setRunResult(null);
        // Someone moving their progress over has already used the course.
        saveWelcomeSeen();
        setShowWelcome(false);
      }
      setIncomingProgress(null);
    },
    [currentLesson, incomingProgress, openTab, updateTabs]
  );

  const handleChangeFontSize = useCallback((size: number) => {
    if (size === fontSize) return;
    setFontSize(size);
    saveFontSize(size);
    editorRef.current?.configureAppearance(theme, size);
  }, [fontSize, theme]);

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setDrawerOpen((open) => !open);
      return;
    }
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarOpen(next);
  }, [isMobile, sidebarOpen]);

  const handleSelectLessonFromSidebar = useCallback((lessonId: string) => {
    selectLesson(lessonId);
    if (isMobile) {
      setDrawerOpen(false);
      setMobileView('lesson');
    }
  }, [isMobile, selectLesson]);

  const handleNextLessonFromConsole = useCallback(() => {
    goToNext();
    setMobileView('lesson');
  }, [goToNext]);

  // Escape closes the lessons drawer.
  useEffect(() => {
    if (!isMobile || !drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, isMobile]);

  const handleToggleSection = useCallback((sectionId: string) => {
    setSectionCollapsed(sectionId, !collapsedSections.has(sectionId));
  }, [collapsedSections, setSectionCollapsed]);

  const handleToggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    saveTheme(next);
    editorRef.current?.configureAppearance(next, fontSize);
  }, [fontSize, theme]);

  const handleCloseWelcome = useCallback(() => {
    saveWelcomeSeen();
    setShowWelcome(false);
  }, []);

  const handleToggleExpand = useCallback(() => setEditorExpanded((e) => !e), []);
  const handleToggleConsole = useCallback(() => setConsoleOpen((o) => !o), []);
  const handleConfettiComplete = useCallback(() => setShowConfetti(false), []);

  // Pane resizing
  const handleSidebarDrag = (e: React.PointerEvent) => {
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    startDrag(e, 'col-resize', (ev) => {
      setSidebarWidth(Math.min(400, Math.max(210, startWidth + ev.clientX - startX)));
    });
  };

  const handleHorizontalDrag = (e: React.PointerEvent) => {
    const container = contentSplitRef.current;
    if (!container) return;
    startDrag(e, 'col-resize', (ev) => {
      const rect = container.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftWidthPct(Math.min(68, Math.max(26, pct)));
    });
  };

  const handleConsoleDrag = useCallback(
    (e: React.PointerEvent) => {
      const startY = e.clientY;
      const startHeight = Math.min(consoleHeight, maxConsoleHeight());
      startDrag(e, 'row-resize', (ev) => {
        setConsoleHeight(
          Math.min(maxConsoleHeight(), Math.max(130, startHeight + startY - ev.clientY))
        );
      });
    },
    [consoleHeight]
  );

  const sidebar = (
    <CurriculumSidebar
      sections={SECTIONS}
      lessons={LESSONS}
      currentLesson={currentLesson}
      solvedIds={solvedIds}
      collapsedSections={collapsedSections}
      onSelectLesson={handleSelectLessonFromSidebar}
      onToggleSection={handleToggleSection}
      onResetProgress={handleResetProgress}
      onSaveProgressLink={handleSaveProgressLink}
      width={isMobile ? 'min(320px, calc(100vw - 48px))' : sidebarWidth}
    />
  );

  const showLessonPane = isMobile ? mobileView === 'lesson' : !editorExpanded;
  const showCodePane = !isMobile || mobileView === 'code';

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <TopBar
        section={currentSection}
        positionInSection={positionInSection}
        sectionTotal={sectionLessons.length}
        totalLessons={LESSONS.length}
        solvedCount={solvedIds.size}
        prevLessonId={prevLessonId}
        nextLessonId={nextLessonId}
        onPrev={goToPrev}
        onNext={goToNext}
        sidebarOpen={isMobile ? drawerOpen : sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Phone layout: switch between the lesson and the editor */}
      {isMobile && (
        <div className="shrink-0 px-1.5 pt-1.5">
          <div
            role="tablist"
            aria-label="Pane"
            className="grid grid-cols-2 gap-1 rounded-lg border p-1"
            style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
          >
            {(
              [
                { id: 'lesson', label: 'Lesson', Icon: BookOpen },
                { id: 'code', label: 'Code', Icon: Code2 },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mobileView === id}
                onClick={() => setMobileView(id)}
                className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                  mobileView === id
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Split Workspace */}
      <main className="flex min-h-0 flex-1 overflow-hidden p-1.5 md:p-2">
        {/* Collapsible & Resizable Lessons Sidebar */}
        {!isMobile && sidebarOpen && (
          <>
            {sidebar}
            <ResizeGutter onPointerDown={handleSidebarDrag} title="Drag to resize sidebar" />
          </>
        )}

        {/* Content Split: Question Pane + Code Editor/Console */}
        <div
          ref={contentSplitRef}
          className="flex h-full min-w-0 flex-1 overflow-hidden"
        >
          {/* Left Pane: Question / Solution / Hints, plus resizable gutter */}
          {showLessonPane && (
            <>
              <div
                className="h-full min-w-0 shrink-0"
                style={{ width: isMobile ? '100%' : `${leftWidthPct}%` }}
              >
                <LessonPane
                  key={currentLesson.id}
                  lesson={currentLesson}
                  theme={theme}
                  isSolved={solvedIds.has(currentLesson.id)}
                  onApplySolution={handleApplySolution}
                />
              </div>
              {!isMobile && (
                <ResizeGutter onPointerDown={handleHorizontalDrag} title="Drag to resize panes" />
              )}
            </>
          )}

          {/* Right Pane: Code Editor + Console. Hidden, not unmounted, so the editor keeps its state. */}
          <div
            className={`h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border ${
              showCodePane ? 'flex' : 'hidden'
            }`}
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <CodeEditor
                tabs={tabs}
                activeTabId={activeTab.id}
                initialCode={activeTab.code}
                editorRef={editorRef}
                onSelectTab={handleSelectTab}
                onAddTab={handleAddTab}
                onCloseTab={handleCloseTab}
                onChangeCode={handleChangeCode}
                onResetCode={handleResetCode}
                onRun={handleRun}
                onSubmit={handleSubmit}
                theme={theme}
                fontSize={fontSize}
                onChangeFontSize={handleChangeFontSize}
                runtimeStatus={runtimeStatus}
                runtimeError={runtimeError}
                isExpanded={editorExpanded}
                onToggleExpand={handleToggleExpand}
                canExpand={!isMobile}
              />
            </div>

            <ConsolePanel
              isOpen={consoleOpen}
              onToggleOpen={handleToggleConsole}
              height={isMobile ? Math.min(consoleHeight, maxConsoleHeight()) : consoleHeight}
              onResizeStart={handleConsoleDrag}
              result={runResult}
              runtimeStatus={runtimeStatus}
              onRun={handleRun}
              onSubmit={handleSubmit}
              onStop={handleStop}
              hasNextLesson={nextLessonId !== null}
              onNextLesson={handleNextLessonFromConsole}
            />
          </div>
        </div>
      </main>

      {/* Phone layout: lessons list as a slide-over drawer */}
      {isMobile && drawerOpen && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex p-1.5">
            {sidebar}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white cursor-pointer"
            aria-label="Close lessons"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {incomingProgress ? (
        <ImportProgressDialog
          // A new status needs a new <dialog>: the closed one doesn't reopen itself.
          key={incomingProgress.status}
          incoming={incomingProgress}
          currentSolvedCount={solvedIds.size}
          onClose={handleCloseImportProgress}
        />
      ) : (
        showWelcome && (
          <WelcomeDialog
            totalLessons={LESSONS.length}
            totalSections={SECTIONS.length}
            onClose={handleCloseWelcome}
          />
        )
      )}

      {showConfetti && <ConfettiOverlay onComplete={handleConfettiComplete} />}
    </div>
  );
}
