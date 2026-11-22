import type { PyodideAPI } from 'pyodide';
import { SORTEDCONTAINERS_PY } from './sortedcontainersPolyfill';
import { PYTHON_HARNESS } from './pythonHarness';
import { makeErrorResult } from '../lib/runResult';
import type { RunResult, TestCase } from '../types/course';

interface ExecuteMessage {
  type: 'execute';
  requestId: number;
  mode: 'run' | 'submit';
  code: string;
  expectedOutput: string;
  testCases: TestCase[];
}

interface InitMessage {
  type: 'init';
}

type IncomingMessage = ExecuteMessage | InitMessage;

type RunUserCode = (
  code: string,
  mode: string,
  expectedOutput: string,
  testCasesJson: string
) => string;

let runtimePromise: Promise<RunUserCode> | null = null;

/** Loads Pyodide, installs the sortedcontainers polyfill and the grading harness (once). */
function initRuntime(): Promise<RunUserCode> {
  runtimePromise ??= (async () => {
    // Resolve against Vite's base and installed Pyodide version so immutable caching never mixes versions.
    const indexURL = new URL(
      `${import.meta.env.BASE_URL}pyodide/${__PYODIDE_VERSION__}/`,
      self.location.origin
    ).href;
    const mod = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`);
    const pyodide: PyodideAPI = await mod.loadPyodide({ indexURL });

    pyodide.FS.writeFile('/home/pyodide/sortedcontainers.py', SORTEDCONTAINERS_PY);
    await pyodide.runPythonAsync(`
import sys
if '/home/pyodide' not in sys.path:
    sys.path.insert(0, '/home/pyodide')
import sortedcontainers
`);
    await pyodide.runPythonAsync(PYTHON_HARNESS);
    return pyodide.globals.get('_run_user_code') as RunUserCode;
  })();
  return runtimePromise;
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;

  if (msg.type === 'init') {
    try {
      await initRuntime();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'init-error', error: errorMessage(err) });
    }
    return;
  }

  let result: RunResult;
  try {
    const runUserCode = await initRuntime();
    const json = runUserCode(msg.code, msg.mode, msg.expectedOutput, JSON.stringify(msg.testCases));
    result = JSON.parse(json) as RunResult;
  } catch (err) {
    result = makeErrorResult(msg.mode, msg.expectedOutput, errorMessage(err));
  }
  self.postMessage({ type: 'result', requestId: msg.requestId, result });
};
