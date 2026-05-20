import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import * as matchmaking from "../api/matchmaking";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import MatchFoundScreen from "../components/MatchFoundScreen";

const POLL_INTERVAL = 2000;

function MatchmakingLobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusText, setStatusText] = useState("Joining queue...");
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [phase, setPhase] = useState("searching"); // searching, waiting, found, ready
  const [foundRoom, setFoundRoom] = useState(null);
  const [opponent, setOpponent] = useState(null);

  const pollRef = useRef(null);
  const cancelledRef = useRef(false);

  const difficulty = String(searchParams.get("difficulty") || "easy").toLowerCase();

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(checkStatus, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  async function checkStatus() {
    try {
      const data = await matchmaking.getMatchStatus();
      if (cancelledRef.current) return;
      // data shape is backend dependent; we expect something like { status, players_in_queue, matched_room }
      setQueueCount(data?.players_in_queue ?? 0);
      if (data?.status === "matched" && data?.roomCode) {
        setFoundRoom({ roomCode: data.roomCode });
        setOpponent(data.opponent || null);
        setPhase("found");
        stopPolling();
      } else {
        setPhase("waiting");
        setStatusText(difficulty === "all" ? "Searching across all difficulties..." : `Searching for a ${difficulty} match...`);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to check matchmaking status.");
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    setPhase("searching");
    setError("");

    // Start by polling status — if the user reached here after calling findMatch, the queue should be active
    checkStatus();
    startPolling();

    return () => {
      cancelledRef.current = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  useEffect(() => {
    if (phase === "found" && foundRoom) {
      // automatically attempt join then navigate to the battle room
      (async () => {
        try {
          await matchmaking.requestJoin?.(foundRoom.roomCode);
        } catch (err) {
          // ignore join failures here; navigation still proceeds to let the room UI handle join errors
          console.warn("Auto-join failed", err);
        }
        // navigate to the battle room where WebSocket and ready handshake occur
        navigate(`/battle-room/${encodeURIComponent(foundRoom.roomCode)}`);
      })();
    }
  }, [phase, foundRoom]);

  const cancelQueue = async () => {
    setCanceling(true);
    setError("");
    try {
      await matchmaking.cancelMatchmaking();
      stopPolling();
      navigate("/dashboard", { replace: true });
    } catch (cancelError) {
      setError(cancelError?.response?.data?.detail || "Unable to cancel queue.");
    } finally {
      setCanceling(false);
    }
  };

  const onFoundComplete = () => {
    // move user to battle room UI (ready handshake happens there)
    if (foundRoom?.roomCode) navigate(`/battle-room/${encodeURIComponent(foundRoom.roomCode)}`);
  };

  const onReady = async () => {
    // Deprecated: ready is handled via WebSocket in the battle room.
    setError("Ready is handled in the battle room via WebSocket.");
  };

  if (phase === "found" && foundRoom) {
    return (
      <section className="page-shell page-enter">
        <div className="page-container">
          <Card className="room-waiting">
            <MatchFoundScreen roomCode={foundRoom.roomCode} opponentName={opponent?.username} onComplete={onFoundComplete} />
          </Card>
        </div>
      </section>
    );
  }

  if (phase === "ready" && foundRoom) {
    // ready phase removed: users are navigated to the battle room where WebSocket ready handshake occurs
    navigate(`/battle-room/${encodeURIComponent(foundRoom.roomCode)}`);
    return null;
  }

  return (
    <section className="page-shell page-enter">
      <div className="page-container">
        <Card className="room-waiting">
          <p className="label-text">Global Matchmaking</p>
          <h1 className="section-title">{phase === "searching" ? "Joining queue..." : "Waiting for opponent..."}</h1>
          <p className="section-subtitle">{statusText}</p>
          <div style={{ marginTop: 12 }}>
            <div>Players in queue: <strong>{queueCount}</strong></div>
            <div style={{ marginTop: 8 }} className="muted-text">Estimated wait: ~{Math.max(5, Math.floor(queueCount / 2))}s</div>
          </div>
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
