import os
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