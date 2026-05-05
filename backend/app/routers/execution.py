from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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

@router.get("/")
async def execution_home():
    return {"message": "Clash of Code Runner is running"}