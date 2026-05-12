from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
import uuid
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/execution", tags=["Execution"])

ExecutionStatus = Literal[
    "Accepted",
    "Wrong Answer",
    "Runtime Error",
    "Time Limit Exceeded",
    "Compilation Error",
]

SUPPORTED_SERVER_LANGUAGES = {"python", "javascript", "js", "cpp", "c++"}
DEFAULT_TIMEOUT_SECONDS = 6


class RunTestCase(BaseModel):
    input: dict[str, Any] | str | None = Field(default_factory=dict)
    expected: Any = None
    expected_output: Any = None
    name: str | None = None


class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    stdin: str = ""
    test_cases: list[RunTestCase] = Field(default_factory=list)
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS


class CaseResult(BaseModel):
    name: str
    passed: bool
    input: Any = None
    expected: Any = None
    actual: Any = None
    stdout: str = ""
    stderr: str = ""
    error: str | None = None
    status: ExecutionStatus
    runtime_ms: int = 0
    memory_kb: int | None = None


class CodeExecutionResponse(BaseModel):
    status: ExecutionStatus
    stdout: str = ""
    stderr: str = ""
    error: str | None = None
    exit_code: int | None = None
    runtime_ms: int = 0
    memory_kb: int | None = None
    passed: int = 0
    total: int = 0
    results: list[CaseResult] = Field(default_factory=list)


class CodeEvaluationRequest(BaseModel):
    code: str
    language: str = "python"
    test_cases: list[RunTestCase]
    problem_title: str = "Unknown"
    timeout_seconds: int = 10


CodeEvaluationResponse = CodeExecutionResponse


JUDGE_TEMPLATE = r'''
import contextlib
import inspect
import io
import json
import sys
import time
import traceback

with open(sys.argv[1], encoding="utf-8") as f:
    test_cases = json.load(f)

user_code = {user_code_json}
env = {}
compile_started = time.perf_counter()

try:
    compiled = compile(user_code, "<solution>", "exec")
    with contextlib.redirect_stdout(io.StringIO()):
        exec(compiled, env)
except SyntaxError:
    print(json.dumps({
        "fatal_status": "Compilation Error",
        "error": traceback.format_exc(limit=4),
        "compile_ms": int((time.perf_counter() - compile_started) * 1000),
    }))
    sys.exit(0)
except Exception:
    print(json.dumps({
        "fatal_status": "Runtime Error",
        "error": traceback.format_exc(limit=4),
        "compile_ms": int((time.perf_counter() - compile_started) * 1000),
    }))
    sys.exit(0)

funcs = [(name, value) for name, value in env.items() if inspect.isfunction(value) and not name.startswith("_")]
if not funcs:
    print(json.dumps({
        "fatal_status": "Compilation Error",
        "error": "No solution function found. Define at least one function.",
        "compile_ms": int((time.perf_counter() - compile_started) * 1000),
    }))
    sys.exit(0)

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
    expected = tc.get("expected", tc.get("expected_output"))
    case_input = tc.get("input", {})
    started = time.perf_counter()
    stdout_buffer = io.StringIO()

    try:
        with contextlib.redirect_stdout(stdout_buffer):
            if isinstance(case_input, dict):
                actual = func(**case_input)
            elif case_input is None:
                actual = func()
            else:
                actual = func(case_input)

        runtime_ms = int((time.perf_counter() - started) * 1000)
        passed = normalize(actual) == normalize(expected)
        results.append({
            "name": tc.get("name") or f"Case {index + 1}",
            "passed": passed,
            "input": case_input,
            "expected": expected,
            "actual": actual,
            "stdout": stdout_buffer.getvalue(),
            "stderr": "",
            "error": None,
            "status": "Accepted" if passed else "Wrong Answer",
            "runtime_ms": runtime_ms,
            "memory_kb": None,
        })
    except Exception:
        runtime_ms = int((time.perf_counter() - started) * 1000)
        results.append({
            "name": tc.get("name") or f"Case {index + 1}",
            "passed": False,
            "input": case_input,
            "expected": expected,
            "actual": None,
            "stdout": stdout_buffer.getvalue(),
            "stderr": "",
            "error": traceback.format_exc(limit=4),
            "status": "Runtime Error",
            "runtime_ms": runtime_ms,
            "memory_kb": None,
        })

print(json.dumps({"results": results}))
'''


JUDGE_TEMPLATE_JS = r'''
const fs = require('fs');
const vm = require('vm');

const testCases = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const userCode = {user_code_json};
const sandbox = { console };
vm.createContext(sandbox);

try {
    vm.runInContext(userCode, sandbox, { timeout: 1000 });
} catch (e) {
    console.log(JSON.stringify({ fatal_status: 'Compilation Error', error: e.stack || String(e) }));
    process.exit(0);
}

function normalize(value) {
    if (Array.isArray(value)) {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }
    if (value && typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }
    return String(value ?? '').trim().replace(/\r\n/g, '\n');
}

const functionNames = Object.keys(sandbox).filter((name) => typeof sandbox[name] === 'function' && name !== 'console');
if (!functionNames.length) {
    console.log(JSON.stringify({ fatal_status: 'Compilation Error', error: 'No solution function found. Define at least one function.' }));
    process.exit(0);
}

const func = sandbox[functionNames[functionNames.length - 1]];
const results = [];

for (let i = 0; i < testCases.length; ++i) {
    const tc = testCases[i];
    const input = tc.input === undefined ? null : tc.input;
    const expected = tc.expected !== undefined ? tc.expected : tc.expected_output;
    const name = tc.name || `Case ${i + 1}`;

    try {
        const started = Date.now();
        let actual;
        if (input === null) {
            actual = func();
        } else if (Array.isArray(input)) {
            actual = func(...input);
        } else if (typeof input === 'object') {
            actual = func(...Object.values(input));
        } else {
            actual = func(input);
        }
        const runtime = Date.now() - started;
        const passed = normalize(actual) === normalize(expected);
        results.push({
            name,
            passed,
            input,
            expected,
            actual,
            stdout: '',
            stderr: '',
            error: null,
            status: passed ? 'Accepted' : 'Wrong Answer',
            runtime_ms: runtime,
            memory_kb: null,
        });
    } catch (e) {
        results.push({
            name,
            passed: false,
            input,
            expected,
            actual: null,
            stdout: '',
            stderr: '',
            error: e.stack || String(e),
            status: 'Runtime Error',
            runtime_ms: 0,
            memory_kb: null,
        });
    }
}

console.log(JSON.stringify({ results }));
'''


def _status_from_results(results: list[CaseResult]) -> ExecutionStatus:
    if not results:
        return "Accepted"
    for status in ("Compilation Error", "Runtime Error", "Time Limit Exceeded"):
        if any(result.status == status for result in results):
            return status  # type: ignore[return-value]
    return "Accepted" if all(result.passed for result in results) else "Wrong Answer"


def normalize_test_case(raw: dict[str, Any] | RunTestCase, index: int) -> RunTestCase:
    if isinstance(raw, RunTestCase):
        case = raw
    else:
        case = RunTestCase(**raw)
    if case.name:
        return case
    return case.model_copy(update={"name": f"Case {index + 1}"})


def run_python_file(code: str, stdin: str, timeout_seconds: int) -> CodeExecutionResponse:
    uid = uuid.uuid4().hex
    fp = os.path.join(tempfile.gettempdir(), f"run_{uid}.py")
    started = time.perf_counter()

    try:
        with open(fp, "w", encoding="utf-8") as file:
            file.write(code)
        proc = subprocess.run(
            [sys.executable, fp],
            input=stdin,
            capture_output=True,
            text=True,
            timeout=max(1, min(timeout_seconds, 15)),
        )
        runtime_ms = int((time.perf_counter() - started) * 1000)
        status: ExecutionStatus = "Accepted" if proc.returncode == 0 else "Runtime Error"
        return CodeExecutionResponse(
            status=status,
            stdout=proc.stdout,
            stderr=proc.stderr,
            error=proc.stderr.strip() or None,
            exit_code=proc.returncode,
            runtime_ms=runtime_ms,
            passed=1 if status == "Accepted" else 0,
            total=1,
        )
    except subprocess.TimeoutExpired as exc:
        return CodeExecutionResponse(
            status="Time Limit Exceeded",
            stdout=exc.stdout or "",
            stderr=exc.stderr or "",
            error=f"Execution timed out after {timeout_seconds} seconds.",
            exit_code=None,
            runtime_ms=int((time.perf_counter() - started) * 1000),
            passed=0,
            total=1,
        )
    finally:
        if os.path.exists(fp):
            os.remove(fp)


def run_js_file(code: str, stdin: str, timeout_seconds: int) -> CodeExecutionResponse:
    uid = uuid.uuid4().hex
    fp = os.path.join(tempfile.gettempdir(), f"run_{uid}.js")
    started = time.perf_counter()

    try:
        with open(fp, "w", encoding="utf-8") as file:
            file.write(code)
        proc = subprocess.run(
            ["node", fp],
            input=stdin,
            capture_output=True,
            text=True,
            timeout=max(1, min(timeout_seconds, 15)),
        )
        runtime_ms = int((time.perf_counter() - started) * 1000)
        status: ExecutionStatus = "Accepted" if proc.returncode == 0 else "Runtime Error"
        return CodeExecutionResponse(
            status=status,
            stdout=proc.stdout,
            stderr=proc.stderr,
            error=proc.stderr.strip() or None,
            exit_code=proc.returncode,
            runtime_ms=runtime_ms,
            passed=1 if status == "Accepted" else 0,
            total=1,
        )
    except subprocess.TimeoutExpired as exc:
        return CodeExecutionResponse(
            status="Time Limit Exceeded",
            stdout=exc.stdout or "",
            stderr=exc.stderr or "",
            error=f"Execution timed out after {timeout_seconds} seconds.",
            exit_code=None,
            runtime_ms=int((time.perf_counter() - started) * 1000),
            passed=0,
            total=1,
        )
    finally:
        if os.path.exists(fp):
            os.remove(fp)


def run_cpp_file(code: str, stdin: str, timeout_seconds: int) -> CodeExecutionResponse:
    uid = uuid.uuid4().hex
    src_fp = os.path.join(tempfile.gettempdir(), f"run_{uid}.cpp")
    exe_fp = os.path.join(tempfile.gettempdir(), f"run_{uid}_exe")
    started = time.perf_counter()

    try:
        with open(src_fp, "w", encoding="utf-8") as file:
            file.write(code)

        compile_proc = subprocess.run(["g++", src_fp, "-O2", "-o", exe_fp], capture_output=True, text=True)
        if compile_proc.returncode != 0:
            runtime_ms = int((time.perf_counter() - started) * 1000)
            return CodeExecutionResponse(
                status="Compilation Error",
                stdout=compile_proc.stdout,
                stderr=compile_proc.stderr,
                error=compile_proc.stderr.strip() or "Compilation failed.",
                exit_code=compile_proc.returncode,
                runtime_ms=runtime_ms,
                passed=0,
                total=0,
            )

        proc = subprocess.run([exe_fp], input=stdin, capture_output=True, text=True, timeout=max(1, min(timeout_seconds, 15)))
        runtime_ms = int((time.perf_counter() - started) * 1000)
        status: ExecutionStatus = "Accepted" if proc.returncode == 0 else "Runtime Error"
        return CodeExecutionResponse(
            status=status,
            stdout=proc.stdout,
            stderr=proc.stderr,
            error=proc.stderr.strip() or None,
            exit_code=proc.returncode,
            runtime_ms=runtime_ms,
            passed=1 if status == "Accepted" else 0,
            total=1,
        )
    except subprocess.TimeoutExpired as exc:
        return CodeExecutionResponse(
            status="Time Limit Exceeded",
            stdout=exc.stdout or "",
            stderr=exc.stderr or "",
            error=f"Execution timed out after {timeout_seconds} seconds.",
            exit_code=None,
            runtime_ms=int((time.perf_counter() - started) * 1000),
            passed=0,
            total=1,
        )
    finally:
        for fp in (src_fp, exe_fp):
            if os.path.exists(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass


def evaluate_python_cases(
    code: str,
    test_cases: list[RunTestCase | dict[str, Any]],
    timeout_seconds: int = 10,
) -> CodeExecutionResponse:
    uid = uuid.uuid4().hex
    tmpdir = tempfile.gettempdir()
    judge_fp = os.path.join(tmpdir, f"judge_{uid}.py")
    sidecar_fp = os.path.join(tmpdir, f"cases_{uid}.json")
    normalized_cases = [normalize_test_case(case, index) for index, case in enumerate(test_cases)]
    started = time.perf_counter()

    try:
        with open(sidecar_fp, "w", encoding="utf-8") as file:
            json.dump([case.model_dump() for case in normalized_cases], file)

        judge_script = JUDGE_TEMPLATE.replace("{user_code_json}", json.dumps(code))
        with open(judge_fp, "w", encoding="utf-8") as file:
            file.write(judge_script)

        proc = subprocess.run(
            [sys.executable, judge_fp, sidecar_fp],
            capture_output=True,
            text=True,
            timeout=max(1, min(timeout_seconds, 20)),
        )
        runtime_ms = int((time.perf_counter() - started) * 1000)

        if proc.returncode != 0 or not proc.stdout.strip():
            error = proc.stderr.strip() or "Judge crashed before producing output."
            results = [
                CaseResult(
                    name=case.name or f"Case {index + 1}",
                    passed=False,
                    input=case.input,
                    expected=case.expected if case.expected is not None else case.expected_output,
                    status="Runtime Error",
                    error=error,
                    runtime_ms=runtime_ms,
                )
                for index, case in enumerate(normalized_cases)
            ]
            return CodeExecutionResponse(
                status="Runtime Error",
                stderr=proc.stderr,
                error=error,
                exit_code=proc.returncode,
                runtime_ms=runtime_ms,
                passed=0,
                total=len(results),
                results=results,
            )

        parsed = json.loads(proc.stdout.strip())
        if isinstance(parsed, dict) and "fatal_status" in parsed:
            status = parsed["fatal_status"]
            error = parsed.get("error") or status
            results = [
                CaseResult(
                    name=case.name or f"Case {index + 1}",
                    passed=False,
                    input=case.input,
                    expected=case.expected if case.expected is not None else case.expected_output,
                    status=status,
                    error=error,
                    runtime_ms=parsed.get("compile_ms", runtime_ms),
                )
                for index, case in enumerate(normalized_cases)
            ]
        else:
            results = [CaseResult(**item) for item in parsed.get("results", [])]

        aggregate_status = _status_from_results(results)
        return CodeExecutionResponse(
            status=aggregate_status,
            stdout="\n".join(result.stdout for result in results if result.stdout),
            stderr="\n".join(result.stderr for result in results if result.stderr),
            error=next((result.error for result in results if result.error), None),
            exit_code=0,
            runtime_ms=sum(result.runtime_ms for result in results),
            passed=sum(1 for result in results if result.passed),
            total=len(results),
            results=results,
        )
    except subprocess.TimeoutExpired as exc:
        runtime_ms = int((time.perf_counter() - started) * 1000)
        results = [
            CaseResult(
                name=case.name or f"Case {index + 1}",
                passed=False,
                input=case.input,
                expected=case.expected if case.expected is not None else case.expected_output,
                status="Time Limit Exceeded",
                stdout=exc.stdout or "",
                stderr=exc.stderr or "",
                error=f"Execution timed out after {timeout_seconds} seconds.",
                runtime_ms=runtime_ms,
            )
            for index, case in enumerate(normalized_cases)
        ]
        return CodeExecutionResponse(
            status="Time Limit Exceeded",
            stdout=exc.stdout or "",
            stderr=exc.stderr or "",
            error=f"Execution timed out after {timeout_seconds} seconds.",
            runtime_ms=runtime_ms,
            passed=0,
            total=len(results),
            results=results,
        )
    except json.JSONDecodeError:
        runtime_ms = int((time.perf_counter() - started) * 1000)
        return CodeExecutionResponse(
            status="Runtime Error",
            stdout="",
            stderr="",
            error="Judge returned malformed output.",
            runtime_ms=runtime_ms,
            passed=0,
            total=len(normalized_cases),
            results=[],
        )
    finally:
        for fp in (judge_fp, sidecar_fp):
            if os.path.exists(fp):
                os.remove(fp)


def evaluate_js_cases(
    code: str,
    test_cases: list[RunTestCase | dict[str, Any]],
    timeout_seconds: int = 10,
) -> CodeExecutionResponse:
    uid = uuid.uuid4().hex
    tmpdir = tempfile.gettempdir()
    judge_fp = os.path.join(tmpdir, f"judge_js_{uid}.js")
    sidecar_fp = os.path.join(tmpdir, f"cases_js_{uid}.json")
    normalized_cases = [normalize_test_case(case, index) for index, case in enumerate(test_cases)]
    started = time.perf_counter()

    try:
        with open(sidecar_fp, "w", encoding="utf-8") as file:
            json.dump([case.model_dump() for case in normalized_cases], file)

        judge_script = JUDGE_TEMPLATE_JS.replace("{user_code_json}", json.dumps(code))
        with open(judge_fp, "w", encoding="utf-8") as file:
            file.write(judge_script)

        proc = subprocess.run(
            ["node", judge_fp, sidecar_fp],
            capture_output=True,
            text=True,
            timeout=max(1, min(timeout_seconds, 20)),
        )
        runtime_ms = int((time.perf_counter() - started) * 1000)

        if proc.returncode != 0 or not proc.stdout.strip():
            error = proc.stderr.strip() or "JS judge crashed before producing output."
            results = [
                CaseResult(
                    name=case.name or f"Case {index + 1}",
                    passed=False,
                    input=case.input,
                    expected=case.expected if case.expected is not None else case.expected_output,
                    status="Runtime Error",
                    error=error,
                    runtime_ms=runtime_ms,
                )
                for index, case in enumerate(normalized_cases)
            ]
            return CodeExecutionResponse(
                status="Runtime Error",
                stderr=proc.stderr,
                error=error,
                exit_code=proc.returncode,
                runtime_ms=runtime_ms,
                passed=0,
                total=len(results),
                results=results,
            )

        parsed = json.loads(proc.stdout.strip())
        results = [CaseResult(**item) for item in parsed.get("results", [])]
        aggregate_status = _status_from_results(results)
        return CodeExecutionResponse(
            status=aggregate_status,
            stdout="\n".join(result.stdout for result in results if result.stdout),
            stderr="\n".join(result.stderr for result in results if result.stderr),
            error=next((result.error for result in results if result.error), None),
            exit_code=0,
            runtime_ms=sum(result.runtime_ms for result in results),
            passed=sum(1 for result in results if result.passed),
            total=len(results),
            results=results,
        )
    except subprocess.TimeoutExpired as exc:
        runtime_ms = int((time.perf_counter() - started) * 1000)
        results = [
            CaseResult(
                name=case.name or f"Case {index + 1}",
                passed=False,
                input=case.input,
                expected=case.expected if case.expected is not None else case.expected_output,
                status="Time Limit Exceeded",
                stdout=exc.stdout or "",
                stderr=exc.stderr or "",
                error=f"Execution timed out after {timeout_seconds} seconds.",
                runtime_ms=runtime_ms,
            )
            for index, case in enumerate(normalized_cases)
        ]
        return CodeExecutionResponse(
            status="Time Limit Exceeded",
            stdout=exc.stdout or "",
            stderr=exc.stderr or "",
            error=f"Execution timed out after {timeout_seconds} seconds.",
            runtime_ms=runtime_ms,
            passed=0,
            total=len(results),
            results=results,
        )
    except json.JSONDecodeError:
        runtime_ms = int((time.perf_counter() - started) * 1000)
        return CodeExecutionResponse(
            status="Runtime Error",
            stdout="",
            stderr="",
            error="JS Judge returned malformed output.",
            runtime_ms=runtime_ms,
            passed=0,
            total=len(normalized_cases),
            results=[],
        )
    finally:
        for fp in (judge_fp, sidecar_fp):
            if os.path.exists(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass


def evaluate_cpp_cases(
    code: str,
    test_cases: list[RunTestCase | dict[str, Any]],
    timeout_seconds: int = 10,
) -> CodeExecutionResponse:
    uid = uuid.uuid4().hex
    tmpdir = tempfile.gettempdir()
    src_fp = os.path.join(tmpdir, f"eval_{uid}.cpp")
    exe_fp = os.path.join(tmpdir, f"eval_{uid}_exe")
    normalized_cases = [normalize_test_case(case, index) for index, case in enumerate(test_cases)]
    started = time.perf_counter()

    try:
        with open(src_fp, "w", encoding="utf-8") as f:
            f.write(code)

        compile_proc = subprocess.run(["g++", src_fp, "-O2", "-o", exe_fp], capture_output=True, text=True)
        if compile_proc.returncode != 0:
            runtime_ms = int((time.perf_counter() - started) * 1000)
            return CodeExecutionResponse(
                status="Compilation Error",
                stdout=compile_proc.stdout,
                stderr=compile_proc.stderr,
                error=compile_proc.stderr.strip() or "Compilation failed.",
                exit_code=compile_proc.returncode,
                runtime_ms=runtime_ms,
                passed=0,
                total=0,
            )

        results: list[CaseResult] = []
        passed = 0
        for index, case in enumerate(normalized_cases):
            tc_input = case.input
            if isinstance(tc_input, dict):
                # join values by newline to simulate multiple inputs
                stdin = "\n".join(str(v) for v in tc_input.values())
            elif isinstance(tc_input, list):
                stdin = "\n".join(str(v) for v in tc_input)
            elif tc_input is None:
                stdin = ""
            else:
                stdin = str(tc_input)

            try:
                proc = subprocess.run([exe_fp], input=stdin, capture_output=True, text=True, timeout=max(1, min(timeout_seconds, 15)))
                stdout = proc.stdout.strip()
                expected = case.expected if case.expected is not None else case.expected_output
                # normalize by stripping whitespace
                passed_case = str(stdout).strip() == str(expected).strip()
                status = "Accepted" if passed_case else "Wrong Answer"
                if passed_case:
                    passed += 1
                results.append(CaseResult(name=case.name or f"Case {index+1}", passed=passed_case, input=case.input, expected=expected, actual=stdout, stdout=proc.stdout, stderr=proc.stderr, error=None if proc.returncode==0 else proc.stderr, status=status, runtime_ms=0))
            except subprocess.TimeoutExpired as exc:
                results.append(CaseResult(name=case.name or f"Case {index+1}", passed=False, input=case.input, expected=case.expected if case.expected is not None else case.expected_output, actual=None, stdout=exc.stdout or "", stderr=exc.stderr or "", error=f"Execution timed out after {timeout_seconds} seconds.", status="Time Limit Exceeded", runtime_ms=0))

        aggregate_status = _status_from_results(results)
        runtime_ms = int((time.perf_counter() - started) * 1000)
        return CodeExecutionResponse(status=aggregate_status, stdout="\n".join(r.stdout for r in results if r.stdout), stderr="\n".join(r.stderr for r in results if r.stderr), error=next((r.error for r in results if r.error), None), exit_code=0, runtime_ms=runtime_ms, passed=sum(1 for r in results if r.passed), total=len(results), results=results)
    finally:
        for fp in (src_fp, exe_fp):
            if os.path.exists(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass


def unsupported_language_response(language: str) -> CodeExecutionResponse:
    return CodeExecutionResponse(
        status="Compilation Error",
        error=f"Server execution is currently available for Python only. {language} editing is supported in the browser.",
        passed=0,
        total=0,
    )


@router.post("/run", response_model=CodeExecutionResponse)
async def run_code(request: CodeExecutionRequest):
    language = request.language.lower()
    if language not in SUPPORTED_SERVER_LANGUAGES:
        return unsupported_language_response(request.language)
    # For test case based evaluation keep Python-only judge
    if request.test_cases:
        if language in ("python",):
            return evaluate_python_cases(request.code, request.test_cases, request.timeout_seconds)
        if language in ("javascript", "js"):
            return evaluate_js_cases(request.code, request.test_cases, request.timeout_seconds)
        if language in ("cpp", "c++"):
            return evaluate_cpp_cases(request.code, request.test_cases, request.timeout_seconds)
        return CodeExecutionResponse(status="Compilation Error", error=f"Test-case evaluation not supported for {language} on server.", passed=0, total=len(request.test_cases))

    # Simple run paths for supported languages
    if language in ("python",):
        return run_python_file(request.code, request.stdin, request.timeout_seconds)
    if language in ("javascript", "js"):
        return run_js_file(request.code, request.stdin, request.timeout_seconds)
    if language in ("cpp", "c++"):
        return run_cpp_file(request.code, request.stdin, request.timeout_seconds)
    return unsupported_language_response(request.language)


@router.post("/evaluate", response_model=CodeEvaluationResponse)
async def evaluate_code(request: CodeEvaluationRequest):
    language = request.language.lower()
    if language not in SUPPORTED_SERVER_LANGUAGES:
        return unsupported_language_response(request.language)
    if language in ("python",):
        return evaluate_python_cases(request.code, request.test_cases, request.timeout_seconds)
    if language in ("javascript", "js"):
        return evaluate_js_cases(request.code, request.test_cases, request.timeout_seconds)
    if language in ("cpp", "c++"):
        return evaluate_cpp_cases(request.code, request.test_cases, request.timeout_seconds)
    return unsupported_language_response(request.language)


@router.get("/")
async def execution_home():
    return {"message": "Clash of Code Runner is running"}
