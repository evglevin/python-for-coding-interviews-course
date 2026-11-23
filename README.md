# Python for Coding Interviews — Local Interactive Course

A completely local, offline-capable interactive Python course covering all **40 lessons across 8 sections** for coding interview preparation — with in-browser Python execution (Pyodide WebAssembly), CodeMirror 6 Python syntax highlighting, unit test grading, progressive hints, and persistent progress tracking.

<img width="3456" height="2234" alt="python-for-coding-interviews-mbp16" src="https://github.com/user-attachments/assets/9d219b45-308d-4bd5-ab50-6ad8726f1df9" />


## Quick Start

```bash
npm install
npm run dev
```

## Features

- **40 Interactive Lessons across 8 Sections**:
  1. **Sorting** (0–4): Sort Ascending, Sort Descending, Sort Custom, Sort Lambda, Sorted Copy
  2. **Pythonic Code** (5–10): Unpacking, Loop Unpacking, Enumerate, Zip, Inequality, Min Max Shortcut
  3. **Lists** (11–16): Resizable List Part 1 & 2, List Concat, List Initialization, List Clone, List Comprehension
  4. **Stacks and Queues** (17–19): Stack Push and Pop, Queue Enqueue and Dequeue, Double Ended Queue
  5. **2-D Lists** (20–22): Multi-Dimensional List, 2D Grid, Nested List Comprehension
  6. **Hashmaps and Hashsets** (23–30): Hash Map Basics, Default Dict, Counter, Dict Comprehension, Dict Items, Hash Set Basics, Set Comprehension, Tuple Keys
  7. **Heaps / Priority Queues** (31–37): Heap Push, Heap Pop, Heapify, Max Heap, Custom Heap, Heap N Smallest, Heap N Largest
  8. **Sorted Dicts and Sorted Sets** (38–39): Sorted Dict Basics, Sorted Set Basics (with built-in `sortedcontainers` support!)
- **In-Browser Python Execution (Pyodide in a Web Worker)**:
  - Bundled locally into `public/pyodide/` — works 100% offline with zero backend needed.
  - Infinite-loop protection with a Stop button and 6-second timeout.
  - `Run` (`Cmd/Ctrl + Enter`) runs your code and diffs stdout against expected output.
  - `Submit` (`Cmd/Ctrl + Shift + Enter`) executes the automated unit test suite (including edge cases and mutation checks) and marks solved lessons with `✓`.
- **Full IDE Workspace**:
  - CodeMirror 6 editor with Python syntax highlighting, line numbers, folding, auto-indent, bracket matching, multi-tab scratchpads (`Solution 1`, `+`), font size controls, and dark/light themes.
  - Resizable split-pane layout, collapsible console, interview stopwatch timer, progressive hints, and localStorage persistence.
  - **Save to Link** (sidebar footer) copies a link that carries your solved lessons and editor code. Open it on another device and confirm to replace the progress there. The data lives in the URL fragment, so it is never sent to a server.

## Scripts

- `npm run dev` — Start local development server on `http://localhost:5173`
- `npm run build` — Type-check and create production build
- `npm run verify` — Run automated Python verification across all 40 lessons

## License

[MIT](LICENSE) © 2026 Evgenii Levin
