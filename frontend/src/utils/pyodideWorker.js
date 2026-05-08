importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

async function initPyodide() {
  self.pyodide = await loadPyodide();
  return self.pyodide;
}

const pyodideReadyPromise = initPyodide();

self.onmessage = async (event) => {
  const { code, testCases } = event.data;
  const pyodide = await pyodideReadyPromise;

  // testCases format from DB:
  //   [{ input: { nums: [2,7], target: 9 }, expected: [0,1] }, ...]
  const testCasesJson = JSON.stringify(testCases || []);

  const runnerCode = `
import json, traceback, inspect

def __run_tests():
    test_cases = json.loads("""${testCasesJson.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"')}""")

    # ── Execute user code ──────────────────────────────────────────────────
    user_code = """${code.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"')}"""
    try:
        env = {}
        exec(user_code, env)
    except Exception as e:
        return json.dumps({
            "error": f"Syntax/runtime error in your code: {e}",
            "traceback": traceback.format_exc()
        })

    # ── Find solution function (last non-private function defined) ─────────
    funcs = [(k, v) for k, v in env.items()
             if inspect.isfunction(v) and not k.startswith("_")]
    if not funcs:
        return json.dumps({"error": "No function defined. Write your solution function."})

    func = funcs[-1][1]

    # ── Run each test case ─────────────────────────────────────────────────
    results      = []
    passed_count = 0

    for i, tc in enumerate(test_cases):
        inp      = tc.get("input", {})      # dict  → func(**inp)
        expected = tc.get("expected")       # any type

        try:
            actual = func(**inp)

            # Normalise: try sorted for lists (order-independent problems)
            def norm(v):
                if isinstance(v, list):
                    try:    return sorted(v)
                    except: return v
                return v

            passed = (norm(actual) == norm(expected))
            if passed:
                passed_count += 1

            results.append({
                "name":     f"Case {i+1}",
                "passed":   passed,
                "actual":   actual,
                "expected": expected,
                "error":    None
            })

        except Exception as e:
            results.append({
                "name":     f"Case {i+1}",
                "passed":   False,
                "actual":   None,
                "expected": expected,
                "error":    str(e)
            })

    return json.dumps({
        "passed":       passed_count == len(test_cases) and len(test_cases) > 0,
        "test_results": results,
        "passed_count": passed_count,
        "total_count":  len(test_cases)
    })

__run_tests()
`;

  try {
    const resultJsonStr = await pyodide.runPythonAsync(runnerCode);
    const result = JSON.parse(resultJsonStr);
    self.postMessage({ type: "DONE", result });
  } catch (error) {
    self.postMessage({ type: "DONE", result: { error: error.message } });
  }
};