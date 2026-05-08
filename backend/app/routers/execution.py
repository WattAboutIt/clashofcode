from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import subprocess
import sys
import uuid
import os
import tempfile

router = APIRouter(
    prefix="/execution",
    tags=["Execution"],
)

class CodeExecutionRequest(BaseModel):
    code: str

class CodeExecutionResponse(BaseModel):
    output: str
    error: str

class TestCase(BaseModel):
    input: str
    expected_output: str

class CodeEvaluationRequest(BaseModel):
    code: str
    test_cases: List[TestCase]
    problem_title: str = "Unknown"
    problem_description: str = ""

class TestResult(BaseModel):
    test_case: int
    status: str  # "passed" or "failed"
    expected: str
    actual: str
    error: str = None

class CodeEvaluationResponse(BaseModel):
    success: bool
    passed: int
    total: int
    results: List[TestResult]

@router.post("/run", response_model=CodeExecutionResponse)
async def run_code(request: CodeExecutionRequest):
    # Generate a unique filename
    filename = f"temp_{uuid.uuid4().hex}.py"
    filepath = os.path.join(tempfile.gettempdir(), filename)

    try:
        # Write code to temporary file
        with open(filepath, 'w') as f:
            f.write(request.code)

        # Execute the code
        result = subprocess.run(
            [sys.executable, filepath],
            capture_output=True,
            text=True,
            timeout=5  # 5 seconds timeout
        )

        output = result.stdout
        error = result.stderr

    except subprocess.TimeoutExpired:
        output = ""
        error = "Execution timed out"
    except Exception as e:
        output = ""
        error = f"Execution failed: {str(e)}"
    finally:
        # Clean up the temporary file
        if os.path.exists(filepath):
            os.remove(filepath)

    return CodeExecutionResponse(output=output, error=error)

@router.post("/evaluate", response_model=CodeEvaluationResponse)
async def evaluate_code(request: CodeEvaluationRequest):
    """
    Evaluate user code against test cases.
    Simulates exact online judge behavior with stdin/stdout comparison.
    """
    filename = f"temp_{uuid.uuid4().hex}.py"
    filepath = os.path.join(tempfile.gettempdir(), filename)
    results: List[TestResult] = []
    passed_count = 0

    try:
        # Write code to temporary file once
        with open(filepath, 'w') as f:
            f.write(request.code)

        # Test each test case
        for idx, test_case in enumerate(request.test_cases, 1):
            try:
                # Execute code with test input via stdin
                result = subprocess.run(
                    [sys.executable, filepath],
                    input=test_case.input,  # Pass input through stdin
                    capture_output=True,
                    text=True,
                    timeout=5  # 5 seconds timeout
                )

                output = result.stdout
                error = result.stderr

                # Check for runtime errors
                if error:
                    results.append(TestResult(
                        test_case=idx,
                        status="failed",
                        expected=test_case.expected_output,
                        actual=output,
                        error=error.strip()
                    ))
                    continue

                # Normalize: trim trailing whitespace from each line but preserve structure
                actual_normalized = "\n".join(line.rstrip() for line in output.split("\n")).rstrip()
                expected_normalized = "\n".join(line.rstrip() for line in test_case.expected_output.split("\n")).rstrip()

                # Compare exactly
                if actual_normalized == expected_normalized:
                    results.append(TestResult(
                        test_case=idx,
                        status="passed",
                        expected=test_case.expected_output,
                        actual=output,
                        error=None
                    ))
                    passed_count += 1
                else:
                    results.append(TestResult(
                        test_case=idx,
                        status="failed",
                        expected=test_case.expected_output,
                        actual=output,
                        error="Output mismatch"
                    ))

            except subprocess.TimeoutExpired:
                results.append(TestResult(
                    test_case=idx,
                    status="failed",
                    expected=test_case.expected_output,
                    actual="",
                    error="Execution timed out (>5 seconds)"
                ))
            except Exception as e:
                results.append(TestResult(
                    test_case=idx,
                    status="failed",
                    expected=test_case.expected_output,
                    actual="",
                    error=f"Execution failed: {str(e)}"
                ))

    finally:
        # Clean up the temporary file
        if os.path.exists(filepath):
            os.remove(filepath)

    return CodeEvaluationResponse(
        success=passed_count == len(request.test_cases),
        passed=passed_count,
        total=len(request.test_cases),
        results=results
    )

@router.get("/")
async def execution_home():
    return {"message": "Clash of Code Runner is running"}