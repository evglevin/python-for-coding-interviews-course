/**
 * Python grading harness. Defines `_run_user_code(user_code, mode, expected_output,
 * test_cases_json) -> str (JSON-encoded RunResult)`.
 *
 * Shared by the Pyodide worker (what learners hit) and `scripts/verify-lessons.mjs`
 * (which runs it under CPython), so lesson verification grades exactly like the app.
 */
export const PYTHON_HARNESS = `
import io
import json
import linecache
import sys
import time
import traceback
from contextlib import redirect_stdout, redirect_stderr

_USER_FILENAME = "<solution.py>"

def _format_user_traceback(exc_type, exc_value, exc_tb):
    # Show only the learner's own frames; harness frames are noise. With none
    # (e.g. a SyntaxError raised by compile()), the exception text alone says
    # where the problem is.
    frames = [f for f in traceback.extract_tb(exc_tb) if f.filename == _USER_FILENAME]
    lines = []
    if frames:
        lines.append("Traceback (most recent call last):\\n")
        lines.extend(traceback.format_list(frames))
    lines.extend(traceback.format_exception_only(exc_type, exc_value))
    return "".join(lines).rstrip()

def _normalize_output(text):
    return "\\n".join(line.rstrip() for line in text.strip().splitlines())

def _run_user_code(user_code, mode, expected_output, test_cases_json):
    # The interpreter is reused across runs, so undo process-wide changes a
    # learner's code makes (sys.setrecursionlimit) before the next run.
    saved_recursion_limit = sys.getrecursionlimit()
    try:
        return _grade(user_code, mode, expected_output, test_cases_json)
    finally:
        sys.setrecursionlimit(saved_recursion_limit)

def _grade(user_code, mode, expected_output, test_cases_json):
    start = time.perf_counter()
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    namespace = {"__name__": "__main__"}
    exec_error = None

    # Register the source so tracebacks can quote the offending line.
    linecache.cache[_USER_FILENAME] = (
        len(user_code), None, user_code.splitlines(True), _USER_FILENAME
    )

    try:
        compiled = compile(user_code, _USER_FILENAME, "exec")
        with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
            exec(compiled, namespace)
    except SystemExit:
        pass
    except BaseException as exc:
        exec_error = _format_user_traceback(type(exc), exc, exc.__traceback__)

    stdout_text = stdout_buf.getvalue()
    output_matches = exec_error is None and (
        _normalize_output(stdout_text) == _normalize_output(expected_output)
    )

    result = {
        "mode": mode,
        "stdout": stdout_text,
        "stderr": stderr_buf.getvalue(),
        "expectedOutput": expected_output,
        "outputMatches": output_matches,
        "runtimeMs": 0,
        "error": exec_error,
    }

    if mode == "submit":
        test_results = []
        all_passed = exec_error is None

        for tc in json.loads(test_cases_json):
            base = {
                "name": tc["name"],
                "inputDisplay": tc["inputDisplay"],
                "expectedDisplay": tc["expectedDisplay"],
            }
            if exec_error is not None:
                test_results.append({
                    **base,
                    "actualDisplay": "Error before tests ran",
                    "passed": False,
                    "error": exec_error,
                })
                continue

            tc_ns = dict(namespace)
            try:
                compiled_tc = compile(tc["testCode"], "<test_case>", "exec")
                with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                    exec(compiled_tc, tc_ns)

                actual_val = tc_ns.get("_actual")
                custom_passed = tc_ns.get("_passed", None)
                if custom_passed is not None:
                    passed = bool(custom_passed)
                else:
                    passed = actual_val == tc_ns.get("_expected")

                if not passed:
                    all_passed = False
                test_results.append({
                    **base,
                    "actualDisplay": repr(actual_val),
                    "passed": passed,
                    "message": tc_ns.get("_message", None),
                })
            except BaseException as exc:
                all_passed = False
                test_results.append({
                    **base,
                    "actualDisplay": f"{type(exc).__name__}: {exc}",
                    "passed": False,
                    "error": _format_user_traceback(type(exc), exc, exc.__traceback__),
                })

        result["testResults"] = test_results
        result["allTestsPassed"] = all_passed and len(test_results) > 0

    result["runtimeMs"] = round((time.perf_counter() - start) * 1000, 1)
    return json.dumps(result)
`;
