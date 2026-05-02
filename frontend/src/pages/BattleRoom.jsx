import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import socket from "../utils/socket";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

function BattleRoom() {
  const { roomCode } = useParams();
  const { user, token } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function fetchRoom() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/rooms/${roomCode}`);
        setRoom(response.data);
      } catch (err) {
        setError("Unable to load room. Please check the room code.");
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();
  }, [roomCode]);

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_SOCKET !== "true" || !token) {
      return;
    }

    socket.auth = { token };
    socket.connect();
    socket.emit("join_room", { roomCode });
    socket.on("room_updated", (nextRoom) => setRoom(nextRoom));
    socket.on("player_joined", (payload) => console.log("Player joined", payload));

    return () => {
      socket.off("room_updated");
      socket.off("player_joined");
      socket.disconnect();
    };
  }, [roomCode, token]);

  const isHost = useMemo(() => {
    if (!room || !user) return false;
    return room.host?.username === user.username || room.host === user.username;
  }, [room, user]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await api.post(`/rooms/${roomCode}/start`);
    } catch (err) {
      setError("Unable to start the game right now.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card className="border-cyan-500/20 p-6 shadow-[0_30px_120px_-50px_rgba(34,211,238,0.35)]">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">Room code</p>
              <p className="mt-2 text-2xl font-black text-white">{roomCode}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-3xl bg-slate-900/85 px-4 py-3 text-sm text-slate-200">Timer: 09:42</div>
              <div className="rounded-3xl bg-cyan-500/15 px-4 py-3 text-sm text-cyan-100">Status: {room?.status || "waiting"}</div>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        </Card>

        <div className="grid gap-8 xl:grid-cols-[1.8fr_1fr]">
          <Card className="overflow-hidden p-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Live editor</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Shared code view</h2>
              </div>
              <Button variant="secondary">Sync preview</Button>
            </div>
            <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-4">
              <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span>TypeScript</span>
                <span className="h-1 w-1 rounded-full bg-slate-500" />
                <span>Live sync ready</span>
              </div>
              <pre className="rounded-[1.5rem] bg-[#020613] p-5 text-sm leading-6 text-slate-200 shadow-[0_20px_70px_-45px_rgba(15,23,42,0.8)]">
{`function battleRound(player, challenge) {
  const result = challenge.solve(player.code);
  return result.score > 0 ? "victory" : "retry";
}

const arena = battleRound(activePlayer, problem);
console.log(arena);`}
              </pre>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Problem statement</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Realtime multiplayer challenge</h2>
                </div>
                {isHost && (
                  <Button variant="primary" onClick={handleStart} disabled={starting}>
                    {starting ? "Starting…" : "Start game"}
                  </Button>
                )}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">The host can begin the match once players are ready. Future socket events will keep the room state synced in real time.</p>
              <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-300">
                <div className="flex items-center justify-between"><span>Time limit</span><span>12 min</span></div>
                <div className="flex items-center justify-between"><span>Memory cap</span><span>256 MB</span></div>
                <div className="flex items-center justify-between"><span>Difficulty</span><span>Hard</span></div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Participants</p>
                <span className="text-sm text-slate-400">{room?.players?.length ?? 0} coders</span>
              </div>
              <div className="mt-6 space-y-3">
                {(room?.players || []).map((player) => (
                  <div key={player.username || player.name} className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{player.username || player.name}</p>
                      <p className="text-xs text-slate-500">{player.status || "Ready"}</p>
                    </div>
                    <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100">{player.status === "Active" ? "Active" : "Waiting"}</span>
                  </div>
                ))}
                {!room?.players?.length && <p className="text-sm text-slate-400">Waiting for players to join...</p>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BattleRoom;