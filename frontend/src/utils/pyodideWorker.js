importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

async function initPyodide() {
    self.pyodide = await loadPyodide();
    return self.pyodide;
}

const pyodideReadyPromise = initPyodide();

self.onmessage = async (event) => {
    const { code, testCases } = event.data;
    const pyodide = await pyodideReadyPromise;

    const testCasesJson = JSON.stringify(testCases || []);

    const runnerCode = `
import json
import traceback
import inspect

def __run_tests():
    user_code = """${code.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""
    test_cases_json = """${testCasesJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""
    
    try:
        env = {}
        exec(user_code, env)
        
        funcs = [v for k, v in env.items() if inspect.isfunction(v)]
            
        if not funcs:
            return json.dumps({"error": "No function defined in your code. Please define the solution function."})
        
        func = funcs[-1]  
        
        tests = json.loads(test_cases_json)
        results = []
        passedCount = 0
        
        for i, t in enumerate(tests):
            inputs_dict = t.get("input", {})
            expected_output = t.get("expected_output")
            try:
                res = func(**inputs_dict)
                passed = (res == expected_output)
                if passed:
                    passedCount += 1
                results.append({
                    "name": f"Case {i+1}", 
                    "passed": passed, 
                    "actual": res, 
                    "expected": expected_output
                })
            except Exception as e:
                results.append({
                    "name": f"Case {i+1}", 
                    "passed": False, 
                    "error": str(e)
                })
                
        all_passed = (passedCount == len(tests)) and len(tests) > 0
        return json.dumps({
            "passed": all_passed, 
            "test_results": results,
            "passed_count": passedCount,
            "total_count": len(tests)
        })
    except Exception as parse_e:
        return json.dumps({"error": str(parse_e), "traceback": traceback.format_exc()})

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
