import os
import json
import logging
import traceback
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import AsyncGroq, AuthenticationError, RateLimitError, APIError

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

logger = logging.getLogger("app.chat")


# Singleton client holder
_groq_client: Optional[AsyncGroq] = None


def get_groq_api_key() -> Optional[str]:
    # Do NOT log the key contents; only its presence.
    return os.environ.get("GROQ_API_KEY")


def get_groq_client() -> AsyncGroq:
    """Return a cached AsyncGroq client or initialize a new one.

    Initialization is lazy so startup doesn't fail if the env var is missing;
    errors are logged with full traceback so Railway logs show root causes.
    """
    global _groq_client
    if _groq_client is not None:
        return _groq_client

    api_key = get_groq_api_key()
    logger.info("GROQ_API_KEY present: %s", bool(api_key))

    try:
        _groq_client = AsyncGroq(api_key=api_key)
        logger.info("Initialized AsyncGroq client (no key printed)")
        return _groq_client
    except Exception as e:
        # Log full traceback for debugging in Railway logs
        logger.exception("Failed to initialize AsyncGroq client: %s", e)
        raise


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


class AnalyzeQuestion(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    constraints: Optional[str] = None


class AnalyzeJudgeResult(BaseModel):
    status: Optional[str] = "Unknown"
    passed: int = 0
    total: int = 0
    runtime_ms: Optional[float] = None
    memory_kb: Optional[float] = None


class AnalyzeRequest(BaseModel):
    code: str
    language: str
    question: Optional[AnalyzeQuestion] = None
    judge_result: AnalyzeJudgeResult


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    user_msg = payload.message.strip()
    if not user_msg:
        return {"reply": "Please send a message to start the chat."}

    api_key_present = bool(get_groq_api_key())
    model_name = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    logger.info("/chat called; GROQ_API_KEY present=%s, model=%s", api_key_present, model_name)

    try:
        client = get_groq_client()

        # Call the chat completions endpoint. Keep payload minimal and explicit.
        completion = await client.chat.completions.create(
            model=model_name,
            max_tokens=1024,
            messages=[{"role": "user", "content": user_msg}],
        )

        # Try multiple access patterns to be robust against SDK shape changes
        try:
            reply = completion.choices[0].message.content or "No response."
        except Exception:
            # Fallback: attempt to read `completion.output_text` or string repr
            reply = getattr(completion, "output_text", None) or str(completion)

        logger.info("Groq reply length=%d", len(str(reply)))
        return {"reply": reply}

    except AuthenticationError as e:
        logger.warning("Groq AuthenticationError: %s", e)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=401, detail="Invalid Groq API key.")
    except RateLimitError as e:
        logger.warning("Groq RateLimitError: %s", e)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=429, detail="Rate limit hit — try again shortly.")
    except APIError as e:
        # APIError often contains useful metadata; log everything.
        logger.error("Groq APIError: %s", e)
        logger.debug(traceback.format_exc())
        # Try to surface status code or response if available
        extra = {}
        for attr in ("status_code", "http_status", "response", "body"):
            if hasattr(e, attr):
                try:
                    extra[attr] = getattr(e, attr)
                except Exception:
                    extra[attr] = "<unreadable>"
        if extra:
            logger.error("Groq API error details: %s", extra)
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")
    except Exception as e:
        # Unexpected errors (networking, connection timeouts, SDK issues)
        logger.exception("Unexpected error calling Groq: %s", e)
        # Include traceback in logs; respond with a generic message so no secrets leak
        raise HTTPException(status_code=502, detail="Groq API error: Connection error.")


def _build_analysis_prompt(
    question: Optional[AnalyzeQuestion],
    code: str,
    language: str,
    judge_result: AnalyzeJudgeResult,
) -> str:
    title = (question.title if question else None) or "Unknown Challenge"
    description = (question.description if question else None) or ""
    constraints = (question.constraints if question else None) or "Not specified"
    passed_str = f"{judge_result.passed}/{judge_result.total}"
    submission_status = judge_result.status or "Unknown"
    runtime_str = f"{judge_result.runtime_ms}" if judge_result.runtime_ms is not None else "N/A"
    memory_str = f"{judge_result.memory_kb} KB" if judge_result.memory_kb else "N/A"

    return (
        f"You are an expert competitive programming judge. Analyze this code submission concisely.\n\n"
        f"Problem: {title}\n"
        f"Description: {description}\n"
        f"Constraints: {constraints}\n"
        f"Language: {language}\n"
        f"Status: {submission_status}\n"
        f"Passed Tests: {passed_str}\n"
        f"Execution Time: {runtime_str} ms\n"
        f"Memory: {memory_str}\n\n"
        f"User's Code:\n```{language}\n{code}\n```\n\n"
        f"Return ONLY a valid JSON object — no markdown fences, no preamble, no trailing text:\n"
        f'{{\n'
        f'  "rating": <number 0-10 one decimal>,\n'
        f'  "status": "{submission_status}",\n'
        f'  "passedTests": "{passed_str}",\n'
        f'  "timeComplexity": "<your estimate>",\n'
        f'  "spaceComplexity": "<your estimate>",\n'
        f'  "bestTimeComplexity": "<optimal for this problem>",\n'
        f'  "bestSpaceComplexity": "<optimal for this problem>",\n'
        f'  "isOptimal": <true|false>,\n'
        f'  "strengths": ["<max 3 short points>"],\n'
        f'  "issues": ["<max 3 short points, empty if none>"],\n'
        f'  "recommendation": "<1-2 sentences>",\n'
        f'  "concepts": ["<DSA concept>"],\n'
        f'  "verdict": "<1 sentence>"\n'
        f"}}\n\n"
        f"Rules: Keep total word count under 200. Be specific to this code — no generic advice."
    )


def _strip_json_fences(content: str) -> str:
    clean = content.strip()
    if clean.startswith("```"):
        clean = clean[3:]
        if clean.lower().startswith("json"):
            clean = clean[4:]
        if clean.endswith("```"):
            clean = clean[:-3]
    return clean.strip()


@router.post("/analyze")
async def analyze_submission(payload: AnalyzeRequest):
    """Analyze a code submission via Groq, called directly by the client
    right after a successful /rooms/{room_code}/submit — same request
    pattern as /chat/ (lazy client, health-checked base URL on the client
    side, no WebSocket round-trip required).
    """
    model_name = os.environ.get("GROQ_ANALYSIS_MODEL", os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"))
    prompt = _build_analysis_prompt(payload.question, payload.code, payload.language, payload.judge_result)

    logger.info("/chat/analyze called; model=%s language=%s", model_name, payload.language)

    try:
        client = get_groq_client()
        completion = await client.chat.completions.create(
            model=model_name,
            max_tokens=700,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            content = completion.choices[0].message.content or ""
        except Exception:
            content = getattr(completion, "output_text", None) or str(completion)

        clean = _strip_json_fences(content)

        try:
            analysis = json.loads(clean)
        except json.JSONDecodeError as exc:
            logger.warning("Analysis JSON parse error: %s", exc)
            # Return 200 with an error payload — the client renders this as
            # an "analysis unavailable" state rather than a hard failure.
            return {"error": f"Could not parse AI response: {exc}"}

        logger.info("Analysis rating=%s status=%s", analysis.get("rating"), analysis.get("status"))
        return analysis

    except AuthenticationError as e:
        logger.warning("Groq AuthenticationError (analyze): %s", e)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=401, detail="Invalid Groq API key.")
    except RateLimitError as e:
        logger.warning("Groq RateLimitError (analyze): %s", e)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=429, detail="Rate limit hit — try again shortly.")
    except APIError as e:
        logger.error("Groq APIError (analyze): %s", e)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")
    except Exception as e:
        logger.exception("Unexpected error calling Groq for analysis: %s", e)
        raise HTTPException(status_code=502, detail="Groq API error: Connection error.")


@router.get("/debug/groq")
async def groq_debug():
    """Debug endpoint to report Groq-related diagnostics for deployment debugging.

    - Whether `GROQ_API_KEY` exists in environment
    - Whether the client can be initialized
    - The configured model name
    - If possible, attempt a lightweight models list call to ensure network reachability
    """
    api_key = get_groq_api_key()
    key_exists = bool(api_key)
    model_name = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    result = {
        "groq_key_exists": key_exists,
        "configured_model": model_name,
    }

    try:
        client = get_groq_client()
        # Attempt a lightweight call to list available models — useful to detect network/connectivity issues.
        try:
            models_resp = await client.models.list()
            # Attempt to extract friendly model ids if present
            model_ids = []
            if hasattr(models_resp, "data"):
                for item in getattr(models_resp, "data"):
                    model_ids.append(getattr(item, "id", str(item)))
            elif isinstance(models_resp, (list, tuple)):
                model_ids = [getattr(m, "id", str(m)) for m in models_resp]
            else:
                model_ids = [str(models_resp)][:5]

            result["models_sample"] = model_ids[:10]
            result["client_initialized"] = True
        except Exception as e:
            logger.exception("Groq models.list() failed: %s", e)
            result["client_initialized"] = True
            result["models_list_error"] = str(e)
    except Exception as e:
        logger.exception("Failed to initialize Groq client in debug endpoint: %s", e)
        result["client_initialized"] = False
        result["init_error"] = str(e)

    return result


@router.get("/debug/groq_raw")
async def groq_debug_raw():
    """Perform a raw HTTPS GET to Groq's models endpoint to detect network/egress issues.

    This avoids the SDK and uses a simple HTTP fetch with the Authorization header.
    """
    api_key = get_groq_api_key()
    if not api_key:
        return {"ok": False, "reason": "GROQ_API_KEY missing"}

    url = os.environ.get("GROQ_RAW_CHECK_URL", "https://api.groq.com/v1/models")

    import json
    import urllib.request
    import urllib.error

    def fetch():
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": "clashofcode-debug/1.0",
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.getcode()
            body = resp.read(4096)
            return status, body

    try:
        status, body = await __import__("asyncio").to_thread(fetch)
        safe_body = None
        try:
            safe_body = json.loads(body.decode("utf-8", errors="replace"))
        except Exception:
            safe_body = body.decode("utf-8", errors="replace")[:1024]
        return {"ok": True, "status": status, "body_sample": safe_body}
    except urllib.error.HTTPError as e:
        logger.exception("Raw Groq HTTPError: %s", e)
        return {"ok": False, "status": getattr(e, "code", None), "reason": str(e)}
    except Exception as e:
        logger.exception("Raw Groq request failed: %s", e)
        return {"ok": False, "reason": str(e)}