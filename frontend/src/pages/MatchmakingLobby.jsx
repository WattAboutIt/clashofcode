import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import * as matchmaking from "../api/matchmaking";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import MatchFoundScreen from "../components/MatchFoundScreen";

const POLL_INTERVAL = 3000;

function MatchmakingLobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusText, setStatusText] = useState("Joining queue...");
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [phase, setPhase] = useState("searching");
  const [foundRoom, setFoundRoom] = useState(null);
  const [opponent, setOpponent] = useState(null);

  const stoppedRef = useRef(false); // ✅ single source of truth for stopping
  const isPollingRef = useRef(false); // ✅ prevent duplicate poll loops

  const difficulty = String(searchParams.get("difficulty") || "easy").toLowerCase();

  async function checkStatus() {
    if (stoppedRef.current) return;
    try {
      const data = await matchmaking.getMatchStatus();
      if (stoppedRef.current) return;

      setQueueCount(data?.players_in_queue ?? 0);

      if (data?.status === "matched" && data?.roomCode) {
        setFoundRoom({ roomCode: data.roomCode });
        setOpponent(data.opponent || null);
        setPhase("found");
        stoppedRef.current = true; // ✅ stop polling on match found
      } else {
        setPhase("waiting");
        setStatusText(
          difficulty === "all"
            ? "Searching across all difficulties..."
            : `Searching for a ${difficulty} match...`
        );
      }
    } catch (err) {
      if (!stoppedRef.current) {
        setError(err?.response?.data?.detail || err?.message || "Unable to check status.");
      }
    }
  }

  const startPolling = () => {
    if (isPollingRef.current) return; // ✅ prevent duplicate loops
    isPollingRef.current = true;

    const failures = { count: 0 };
    const MAX_BACKOFF = 30000;

    (async function pollLoop() {
      while (!stoppedRef.current) {
        try {
          await checkStatus(); // ✅ no extra manual call needed
          failures.count = 0;
        } catch {
          failures.count = Math.min(failures.count + 1, 6);
        }

        if (stoppedRef.current) break; // ✅ check again before waiting

        const base = POLL_INTERVAL * Math.pow(2, failures.count);
        const delay = Math.min(base, MAX_BACKOFF);
        const jitter = Math.floor(Math.random() * 300);

        await new Promise((res) => setTimeout(res, delay + jitter));
      }
      isPollingRef.current = false;
    })();
  };

  useEffect(() => {
    stoppedRef.current = false; // ✅ reset on mount
    isPollingRef.current = false;
    setPhase("searching");
    setError("");

    // Attempt to join the matchmaking queue once on mount / difficulty change
    (async () => {
      try {
        setError("");
        const res = await matchmaking.findMatch({ difficulty });
        if (res?.status === "matched" && res?.roomCode) {
          setFoundRoom({ roomCode: res.roomCode });
          setPhase("found");
          stoppedRef.current = true;
          return;
        }
      } catch (err) {
        // show but keep polling status so UI can recover
        setError(err?.response?.data?.detail || err?.message || "Unable to join matchmaking.");
      }

      startPolling(); // ✅ only one call, checkStatus runs inside
    })();

    return () => {
      stoppedRef.current = true; // ✅ cleanup on unmount
    };
  }, [difficulty]);

  useEffect(() => {
    if (phase === "found" && foundRoom) {
      (async () => {
        try {
          await matchmaking.requestJoin?.(foundRoom.roomCode);
        } catch (err) {
          console.warn("Auto-join failed", err);
        }
        navigate(`/battle-room/${encodeURIComponent(foundRoom.roomCode)}`);
      })();
    }
  }, [phase, foundRoom]);

  const cancelQueue = async () => {
    setCanceling(true);
    stoppedRef.current = true; // ✅ stop polling immediately
    setError("");
    try {
      await matchmaking.cancelMatchmaking();
      navigate("/dashboard", { replace: true });
    } catch (cancelError) {
      setError(cancelError?.response?.data?.detail || "Unable to cancel queue.");
      setCanceling(false);
    }
  };

  const onFoundComplete = () => {
    if (foundRoom?.roomCode)
      navigate(`/battle-room/${encodeURIComponent(foundRoom.roomCode)}`);
  };

  if (phase === "found" && foundRoom) {
    return (
      <section className="page-shell page-enter">
        <div className="page-container">
          <Card className="room-waiting">
            <MatchFoundScreen
              roomCode={foundRoom.roomCode}
              opponentName={opponent?.username}
              onComplete={onFoundComplete}
            />
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell page-enter">
      <div className="page-container">
        <Card className="room-waiting">
          <p className="label-text">Global Matchmaking</p>
          <h1 className="section-title">
            {phase === "searching" ? "Joining queue..." : "Waiting for opponent..."}
          </h1>
          <p className="section-subtitle">{statusText}</p>
          <div style={{ marginTop: 12 }}>
            <div>Players in queue: <strong>{queueCount}</strong></div>
            {/* ✅ Fixed: shows 0s when no players, not always 5s */}
            <div style={{ marginTop: 8 }} className="muted-text">
              Estimated wait: ~{queueCount === 0 ? "?" : Math.max(5, Math.floor(queueCount / 2))}s
            </div>
          </div>
          {error && <div className="room-error">{error}</div>}
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={cancelQueue}
              disabled={canceling}
            >
              {canceling ? "Cancelling..." : "Cancel Matchmaking"}
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default MatchmakingLobby;