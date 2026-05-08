from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, List, Optional
import subprocess, sys, uuid, os, tempfile, json

router = APIRouter(prefix="/execution", tags=["Execution"])

# ─── Schemas ────────────────────────────────────────────────────────────────

class CodeExecutionRequest(BaseModel):
    code: str

class CodeExecutionResponse(BaseModel):
    output: str
    error: str

class TestCase(BaseModel):
    input: dict          # {"nums": [2,7], "target": 9}
    expected: Any        # [0, 1]  ← matches DB field name

class CodeEvaluationRequest(BaseModel):
    code: str
    test_cases: List[TestCase]
    problem_title: str = "Unknown"

class TestResult(BaseModel):
    test_case: int
    status: str          # "passed" | "failed" | "error" | "timeout"
    expected: Any
    actual: Any = None
    error: Optional[str] = None

class CodeEvaluationResponse(BaseModel):
    success: bool
    passed: int
    total: int
    results: List[TestResult]


# ─── Judge script template ───────────────────────────────────────────────────
# Injected into a temp file and run per-evaluation (not per test case).
# Receives test cases via a JSON sidecar file to avoid shell-escaping issues.

JUDGE_TEMPLATE = '''
import json, inspect, sys, traceback

# Load test cases from sidecar
with open(sys.argv[1]) as f:
    test_cases = json.load(f)

# ── User code ──
{user_code}

# ── Auto-detect solution function (last defined function) ──
_funcs = [(k, v) for k, v in list(locals().items()) + list(globals().items())
          if inspect.isfunction(v) and not k.startswith("_")]
if not _funcs:
    print(json.dumps({{"error": "No function found. Define your solution function."}}))
    sys.exit(0)

_func = _funcs[-1][1]

results = []
for i, tc in enumerate(test_cases):
    inp      = tc["input"]        # dict of kwargs
    expected = tc["expected"]     # any type

    try:
        actual = _func(**inp)

        # ── Normalise for comparison ──
        def _norm(v):
            if isinstance(v, list):
                # Try sorted compare for order-independent problems
                try:    return sorted(v)
                except: return v
            return v

        passed = (_norm(actual) == _norm(expected))

        results.append({{
            "test_case": i + 1,
            "status":    "passed" if passed else "failed",
            "expected":  expected,
            "actual":    actual,
            "error":     None
        }})
    except Exception:
        results.append({{
            "test_case": i + 1,
            "status":    "error",
            "expected":  expected,
            "actual":    None,
            "error":     traceback.format_exc(limit=3)
        }})

print(json.dumps(results))
'''


# ─── /run  (plain code execution, unchanged behaviour) ───────────────────────

@router.post("/run", response_model=CodeExecutionResponse)
async def run_code(request: CodeExecutionRequest):
    fp = os.path.join(tempfile.gettempdir(), f"run_{uuid.uuid4().hex}.py")
    try:
        with open(fp, "w") as f:
            f.write(request.code)
        r = subprocess.run([sys.executable, fp],
                           capture_output=True, text=True, timeout=5)
        return CodeExecutionResponse(output=r.stdout, error=r.stderr)
    except subprocess.TimeoutExpired:
        return CodeExecutionResponse(output="", error="Execution timed out")
    except Exception as e:
        return CodeExecutionResponse(output="", error=str(e))
    finally:
        if os.path.exists(fp): os.remove(fp)


# ─── /evaluate  (LeetCode-style kwargs judge) ────────────────────────────────

@router.post("/evaluate", response_model=CodeEvaluationResponse)
async def evaluate_code(request: CodeEvaluationRequest):
    uid        = uuid.uuid4().hex
    tmpdir     = tempfile.gettempdir()
    judge_fp   = os.path.join(tmpdir, f"judge_{uid}.py")
    sidecar_fp = os.path.join(tmpdir, f"cases_{uid}.json")

    try:
        # Write sidecar JSON (avoids any escaping issues)
        with open(sidecar_fp, "w") as f:
            json.dump([tc.dict() for tc in request.test_cases], f)

        # Build judge script — user code indented inside template
        judge_script = JUDGE_TEMPLATE.replace("{user_code}", request.code)
        with open(judge_fp, "w") as f:
            f.write(judge_script)

        # Run judge once for all test cases
        proc = subprocess.run(
            [sys.executable, judge_fp, sidecar_fp],
            capture_output=True, text=True, timeout=10
        )

        # ── Parse output ────────────────────────────────────────────────────
        raw_results: List[TestResult] = []
        passed_count = 0

        if proc.returncode != 0 or not proc.stdout.strip():
            # Crash before any test ran (syntax error, import error, etc.)
            error_msg = proc.stderr.strip() or "Unknown error"
            raw_results = [
                TestResult(
                    test_case=i + 1,
                    status="error",
                    expected=tc.expected,
                    actual=None,
                    error=error_msg
                )
                for i, tc in enumerate(request.test_cases)
            ]
        else:
            try:
                parsed = json.loads(proc.stdout.strip())
                # Check for top-level error (e.g. no function found)
                if isinstance(parsed, dict) and "error" in parsed:
                    raw_results = [
                        TestResult(
                            test_case=i + 1,
                            status="error",
                            expected=tc.expected,
                            actual=None,
                            error=parsed["error"]
                        )
                        for i, tc in enumerate(request.test_cases)
                    ]
                else:
                    for r in parsed:
                        if r["status"] == "passed":
                            passed_count += 1
                        raw_results.append(TestResult(**r))
            except json.JSONDecodeError:
                raw_results = [
                    TestResult(
                        test_case=i + 1,
                        status="error",
                        expected=tc.expected,
                        actual=None,
                        error=f"Judge parse error: {proc.stdout[:200]}"
                    )
                    for i, tc in enumerate(request.test_cases)
                ]

    except subprocess.TimeoutExpired:
        raw_results = [
            TestResult(
                test_case=i + 1,
                status="timeout",
                expected=tc.expected,
                actual=None,
                error="Execution timed out (>10 seconds)"
            )
            for i, tc in enumerate(request.test_cases)
        ]
        passed_count = 0

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for fp in (judge_fp, sidecar_fp):
            if os.path.exists(fp): os.remove(fp)

    return CodeEvaluationResponse(
        success=passed_count == len(request.test_cases),
        passed=passed_count,
        total=len(request.test_cases),
        results=raw_results
    )


@router.get("/")
async def execution_home():
    return {"message": "Clash of Code Runner is running"}