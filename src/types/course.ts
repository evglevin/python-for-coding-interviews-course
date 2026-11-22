export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'code'; code: string; caption?: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'note'; title?: string; text: string };

export interface ChallengeFunction {
  signature: string;
  description: string;
}

export interface TestCase {
  name: string;
  inputDisplay: string;
  expectedDisplay: string;
  /**
   * Python code executed with the user's module globals available.
   * Must assign `_actual` and `_expected` (and optionally `_passed: bool`
   * and `_message: str` for custom invariants like non-mutation or heap property).
   */
  testCode: string;
}

export interface Lesson {
  id: string;
  /** Position in the full course (0-based); derived from order in src/data/index.ts. */
  index: number;
  sectionId: string;
  title: string;
  blocks: ContentBlock[];
  challenge: {
    intro: string;
    functions: ChallengeFunction[];
    notes?: string[];
  };
  complexity: {
    time: string;
    space: string;
    note?: string;
  };
  hints: string[];
  starterCode: string;
  expectedOutput: string;
  solutionCode: string;
  solutionExplanation: string;
  testCases: TestCase[];
}

/** A lesson as authored in src/data/sections/*.ts; `index` is assigned on load. */
export type LessonData = Omit<Lesson, 'index'>;

export interface Section {
  id: string;
  number: number;
  shortTitle: string;
}

export interface TestCaseResult {
  name: string;
  inputDisplay: string;
  expectedDisplay: string;
  actualDisplay: string;
  passed: boolean;
  error?: string;
  message?: string;
}

export interface RunResult {
  mode: 'run' | 'submit';
  stdout: string;
  stderr: string;
  expectedOutput: string;
  outputMatches: boolean;
  runtimeMs: number;
  error?: string;
  testResults?: TestCaseResult[];
  allTestsPassed?: boolean;
}

export interface SolutionTab {
  id: string;
  name: string;
  code: string;
}

export type RuntimeStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error';
