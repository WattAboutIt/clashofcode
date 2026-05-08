/* global importScripts, loadPyodide */
importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

const pyodideReadyPromise = loadPyodide();

function escapePythonString(value) {
  return JSON.stringify(String(value ?? ""));
}

function buildCaseRunner(code, testCases) {
  return `
import contextlib, inspect, io, json, time, traceback

user_code = ${escapePythonString(code)}
test_cases = json.loads(${escapePythonString(JSON.stringify(testCases || []))})
stdout_buffer = io.StringIO()
env = {}
started_all = time.perf_counter()

try:
    compiled = compile(user_code, "<solution>", "exec")
    with contextlib.redirect_stdout(stdout_buffer):
        exec(compiled, env)
except SyntaxError:
    json.dumps({
        "status": "Compilation Error",
        "stdout": stdout_buffer.getvalue(),
        "stderr": traceback.format_exc(limit=4),
        "error": traceback.format_exc(limit=4),
        "runtime_ms": int((time.perf_counter() - started_all) * 1000),
        "passed": 0,
        "total": len(test_cases),
        "results": []
    })
else:
    funcs = [(name, value) for name, value in env.items() if inspect.isfunction(value) and not name.startswith("_")]
    if not funcs:
        json.dumps({
            "status": "Compilation Error",
            "stdout": stdout_buffer.getvalue(),
            "stderr": "No solution function found. Define at least one function.",
            "error": "No solution function found. Define at least one function.",
            "runtime_ms": int((time.perf_counter() - started_all) * 1000),
            "passed": 0,
            "total": len(test_cases),
            "results": []
        })
    else:
        func = funcs[-1][1]

        def normalize(value):
            if isinstance(value, tuple):
                return list(value)
            if isinstance(value, list):
                try:
                    return sorted(value)
                except Exception:
                    return value
            return value

        results = []
        for index, tc in enumerate(test_cases):
            case_stdout = io.StringIO()
            case_input = tc.get("input", {})
            expected = tc.get("expected", tc.get("expected_output"))
            started = time.perf_counter()
            try:
                with contextlib.redirect_stdout(case_stdout):
                    if isinstance(case_input, dict):
                        actual = func(**case_input)
                    elif case_input is None:
                        actual = func()
                    else:
                        actual = func(case_input)
                passed = normalize(actual) == normalize(expected)
                results.append({
                    "name": tc.get("name") or f"Case {index + 1}",
                    "passed": passed,
                    "input": case_input,
                    "expected": expected,
                    "actual": actual,
                    "stdout": case_stdout.getvalue(),
                    "stderr": "",
                    "error": None,
                    "status": "Accepted" if passed else "Wrong Answer",
                    "runtime_ms": int((time.perf_counter() - started) * 1000),
                    "memory_kb": None
                })
            except Exception:
                results.append({
                    "name": tc.get("name") or f"Case {index + 1}",
                    "passed": False,
                    "input": case_input,
                    "expected": expected,
                    "actual": None,
                    "stdout": case_stdout.getvalue(),
                    "stderr": traceback.format_exc(limit=4),
                    "error": traceback.format_exc(limit=4),
                    "status": "Runtime Error",
                    "runtime_ms": int((time.perf_counter() - started) * 1000),
                    "memory_kb": None
                })

        aggregate = "Accepted" if results and all(item["passed"] for item in results) else "Wrong Answer"
        for item in results:
            if item["status"] in ("Compilation Error", "Runtime Error", "Time Limit Exceeded"):
                aggregate = item["status"]
                break

        json.dumps({
            "status": aggregate,
            "stdout": stdout_buffer.getvalue() + "\\n".join(item["stdout"] for item in results if item["stdout"]),
            "stderr": "\\n".join(item["stderr"] for item in results if item["stderr"]),
            "error": next((item["error"] for item in results if item["error"]), None),
            "runtime_ms": sum(item["runtime_ms"] for item in results),
            "passed": sum(1 for item in results if item["passed"]),
            "total": len(results),
            "results": results
        })
`;
}

function buildStdinRunner(code, stdin) {
  return `
import builtins, contextlib, io, time, traceback

user_code = ${escapePythonString(code)}
stdin_lines = ${escapePythonString(stdin)}.splitlines()
stdin_index = 0
stdout_buffer = io.StringIO()
started = time.perf_counter()

def fake_input(prompt=""):
    global stdin_index
    if prompt:
        print(prompt, end="")
    if stdin_index >= len(stdin_lines):
        return ""
    value = stdin_lines[stdin_index]
    stdin_index += 1
    return value

try:
    compiled = compile(user_code, "<solution>", "exec")
    old_input = builtins.input
    builtins.input = fake_input
    try:
        with contextlib.redirect_stdout(stdout_buffer):
            exec(compiled, {})
    finally:
        builtins.input = old_input
    json.dumps({
        "status": "Accepted",
        "stdout": stdout_buffer.getvalue(),
        "stderr": "",
        "error": None,
        "runtime_ms": int((time.perf_counter() - started) * 1000),
        "passed": 1,
        "total": 1,
        "results": []
    })
except SyntaxError:
    json.dumps({
        "status": "Compilation Error",
        "stdout": stdout_buffer.getvalue(),
        "stderr": traceback.format_exc(limit=4),
        "error": traceback.format_exc(limit=4),
        "runtime_ms": int((time.perf_counter() - started) * 1000),
        "passed": 0,
        "total": 1,
        "results": []
    })
except Exception:
    json.dumps({
        "status": "Runtime Error",
        "stdout": stdout_buffer.getvalue(),
        "stderr": traceback.format_exc(limit=4),
        "error": traceback.format_exc(limit=4),
        "runtime_ms": int((time.perf_counter() - started) * 1000),
        "passed": 0,
        "total": 1,
        "results": []
    })
`;
}

self.onmessage = async (event) => {
  const { code, testCases, stdin, mode = "cases" } = event.data;
  try {
    const pyodide = await pyodideReadyPromise;
    const runnerCode = mode === "stdin"
      ? buildStdinRunner(code, stdin)
      : buildCaseRunner(code, testCases);
    const raw = await pyodide.runPythonAsync(runnerCode);
    self.postMessage({ type: "DONE", result: JSON.parse(raw) });
  } catch (error) {
    self.postMessage({
      type: "DONE",
      result: {
        status: "Runtime Error",
        stdout: "",
        stderr: error?.message || String(error),
        error: error?.message || String(error),
        runtime_ms: 0,
        passed: 0,
        total: 0,
        results: [],
      },
    });
  }
};
