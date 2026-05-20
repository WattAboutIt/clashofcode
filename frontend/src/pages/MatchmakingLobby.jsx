import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

const ALLOWED_DIFFICULTIES = new Set(["all", "easy", "medium", "hard"]);

function MatchmakingLobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusText, setStatusText] = useState("Joining queue...");
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState(false);
  const pollRef = useRef(null);

  const requestedDifficulty = String(searchParams.get("difficulty") || "easy").toLowerCase();
  const difficulty = ALLOWED_DIFFICULTIES.has(requestedDifficulty) ? requestedDifficulty : "easy";

  const clearPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const resolveMatchFromPayload = (payload) => {
      if (payload?.status === "matched" && payload?.roomCode) {
        return payload.roomCode;
      }
      return null;
    };

    const searchForMatch = async () => {
      if (cancelled) return;
      setError("");
      setStatusText(
        difficulty === "all"
          ? "Searching across all difficulties..."
          : `Searching for a ${difficulty} match...`
      );

      try {
        const [matchResponse, statusResponse] = await Promise.allSettled([
          api.post("/rooms/matchmake", { difficulty }),
          api.get("/rooms/matchmake/status"),
        ]);

        if (cancelled) return;

        const matchedRoomCode = (
          matchResponse.status === "fulfilled"
            ? resolveMatchFromPayload(matchResponse.value?.data)
            : null
        ) || (
          statusResponse.status === "fulfilled"
            ? resolveMatchFromPayload(statusResponse.value?.data)
            : null
        );

        if (matchedRoomCode) {
          clearPolling();
          try {
            await api.post("/rooms/join", { roomCode: matchedRoomCode });
          } catch (_) {
            // best-effort join; BattleRoom will retry on mount
          }
          navigate(`/battle-room/${matchedRoomCode}`, { replace: true });
          return;
        }

        setStatusText("Waiting for another player...");
      } catch (matchError) {
        setError(matchError?.response?.data?.detail || "Unable to check matchmaking status.");
      }
    };

    searchForMatch();
    pollRef.current = setInterval(searchForMatch, 2000);

    return () => {
      cancelled = true;
      clearPolling();
    };
  }, [difficulty, navigate]);

  const cancelQueue = async () => {
    setCanceling(true);
    setError("");
    try {
      await api.post("/rooms/matchmake/cancel");
      clearPolling();
      navigate("/dashboard", { replace: true });
    } catch (cancelError) {
      setError(cancelError?.response?.data?.detail || "Unable to cancel queue.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <section className="page-shell page-enter">
      <div className="page-container">
        <Card className="room-waiting">
          <p className="label-text">Global Matchmaking</p>
          <h1 className="section-title">Finding your battle</h1>
          <p className="section-subtitle">{statusText}</p>
          <p className="muted-text" style={{ marginTop: "0.35rem" }}>
            You will be redirected automatically when a room is ready.
          </p>
          {error && <div className="room-error">{error}</div>}
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
            <Button type="button" variant="secondary" onClick={cancelQueue} disabled={canceling}>
              {canceling ? "Cancelling..." : "Cancel Matchmaking"}
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default MatchmakingLobby;
