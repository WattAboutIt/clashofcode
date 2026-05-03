import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

const DIFFICULTIES = [
  { key: "easy", label: "Easy", color: "text-emerald-300", border: "border-emerald-500/30", bg: "bg-emerald-500/10", activeBg: "bg-emerald-500/20", icon: "🌱", desc: "Beginner friendly" },
  { key: "medium", label: "Medium", color: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/10", activeBg: "bg-amber-500/20", icon: "🔥", desc: "Intermediate" },
  { key: "hard", label: "Hard", color: "text-rose-300", border: "border-rose-500/30", bg: "bg-rose-500/10", activeBg: "bg-rose-500/20", icon: "⚡", desc: "Expert level" },
];

function CreateRoom() {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/questions?level=${difficulty}`)
      .then((r) => setQuestions(r.data || []))
      .catch(() => setQuestions([]));
  }, [difficulty]);

  const createRoom = async () => {
    setError("");
    setLoading(true);
    setCreated(false);
    try {
      const response = await api.post("/rooms/create", { host: user?.username, difficulty });
      const code = response.data.roomCode || response.data.code;
      setRoomCode(code);
      setCreated(true);
      setTimeout(() => navigate(`/battle-room/${code}`), 600);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to create room. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (event) => {
    event.preventDefault();
    setError("");
    if (!joinCode.trim()) { setError("Enter a valid room code."); return; }
    setLoading(true);
    try {
      const response = await api.post("/rooms/join", { roomCode: joinCode.trim() });
      navigate(`/battle-room/${response.data.roomCode || response.data.code}`);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to join room. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedDiff = DIFFICULTIES.find((d) => d.key === difficulty);

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8 page-enter">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Battle Lobby</p>
          <h1 className="text-4xl font-black text-white">Create or Join</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg">
            Pick a difficulty, preview the live question pool, and launch your match.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            {/* Create room card */}
            <Card className="p-7 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Create Room</p>
                <h2 className="mt-1 text-2xl font-black text-white">Launch a new match</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  One random question from your selected difficulty.
                </p>
              </div>

              {/* Difficulty selector */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Difficulty</p>
                <div className="grid grid-cols-3 gap-3">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDifficulty(d.key)}
                      className={`rounded-xl border p-4 text-center transition-all duration-200 hover:scale-[1.02] focus:outline-none ${
                        difficulty === d.key
                          ? `${d.border} ${d.activeBg} ${d.color} shadow-lg`
                          : "border-[var(--surface-border)] bg-transparent text-[var(--text-muted)] hover:border-[var(--surface-border-hover)]"
                      }`}
                    >
                      <div className="text-xl mb-1">{d.icon}</div>
                      <p className="text-xs font-bold">{d.label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={createRoom} className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Room
                  </span>
                )}
              </Button>

              {created && roomCode && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-xs text-emerald-300">Room created! Redirecting…</p>
                    <p className="text-sm font-mono font-bold text-emerald-200">{roomCode}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Join room card */}
            <Card className="p-7 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Join Room</p>
                <h2 className="mt-1 text-xl font-black text-white">Enter a room code</h2>
              </div>
              <form className="space-y-4" onSubmit={joinRoom}>
                <Input
                  label="Room Code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="AB12CD"
                />
                <Button type="submit" className="w-full" variant="secondary" size="lg" disabled={loading}>
                  Join Battle
                </Button>
              </form>
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-rose-300">{error}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Question preview */}
          <Card className="p-7 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Question Pool</p>
                <h2 className="mt-1 text-xl font-black text-white capitalize">
                  {selectedDiff?.icon} {difficulty} challenges
                </h2>
              </div>
              <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${selectedDiff?.border} ${selectedDiff?.bg} ${selectedDiff?.color}`}>
                {questions.length} available
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[480px] pr-1">
              {questions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--surface-border)] bg-[rgba(0,0,0,0.15)] p-8 text-center">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-sm text-[var(--text-muted)]">No questions for this level yet.</p>
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="group rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.2)] p-5 transition-all duration-200 hover:border-[var(--surface-border-hover)] hover:bg-[rgba(34,211,238,0.03)]">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold text-white">{q.title}</h3>
                      <span className="shrink-0 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-300">
                        {q.points} pts
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)] line-clamp-2">{q.description}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default CreateRoom;