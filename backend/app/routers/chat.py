import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import AsyncGroq, AuthenticationError, RateLimitError, APIError

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

# AsyncGroq keeps the event loop unblocked inside async endpoints.
client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    user_msg = payload.message.strip()
    if not user_msg:
        return {"reply": "Please send a message to start the chat."}

    try:
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",   # swap to any model on console.groq.com/docs/models
            max_tokens=1024,
            messages=[
                {"role": "user", "content": user_msg}
            ]
        )
        reply = completion.choices[0].message.content or "No response."
        return {"reply": reply}

    # NOTE: Keep this order — AuthenticationError and RateLimitError are both
    # subclasses of APIError, so they must be caught first.
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid Groq API key.")
    except RateLimitError:
        raise HTTPException(status_code=429, detail="Rate limit hit — try again shortly.")
    except APIError as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")