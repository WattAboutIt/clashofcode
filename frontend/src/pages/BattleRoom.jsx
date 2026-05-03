import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import socket from "../utils/socket";

const DIFF_STYLES = {
  easy: { pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  medium: { pill: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  hard: { pill: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
};

function CountdownTimer({ startedAt, limitMinutes }) {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!startedAt) return undefined;
    const end = new Date(startedAt).getTime() + limitMinutes * 60 * 1000;
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setRemaining("00:00"); setUrgent(true); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setUrgent(diff < 60000);
      setRemaining(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, limitMinutes]);

  return (
    <span className={`font-mono text-2xl font-black transition-colors ${urgent ? "text-rose-400" : "text-cyan-300"}`}>
      {remaining || "--:--"}
    </span>
  );
}

function QuestionPanel({ question, difficulty }) {
  if (!question) return null;
  const diff = DIFF_STYLES[difficulty] || {};

  return (
    <div className="space-y-5">
      {/* Title + badges */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Problem</p>
          <h2 className="mt-1 text-2xl font-black text-white">{question.title}</h2>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className={`rounded-lg border px-3 py-1 text-xs font-bold ${diff.pill || "border-[var(--surface-border)] text-[var(--text-muted)]"}`}>
            {difficulty}
          </span>
          <span className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">
            {question.points} pts
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.3)] p-5 text-sm leading-7 text-[var(--text-secondary)] whitespace-pre-wrap">
        {question.description}
      </div>

      {/* Examples */}
      {question.examples?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Examples</p>
          {question.examples.map((ex, i) => (
            <div key={`${question.id}-${i}`} className="rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.25)] p-4 font-mono text-xs space-y-1">
              <p><span className="text-[var(--text-muted)]">Input: </span><span className="text-cyan-200">{ex.input}</span></p>
              <p><span className="text-[var(--text-muted)]">Output: </span><span className="text-emerald-300">{ex.output}</span></p>
              {ex.explanation && <p className="text-[var(--text-muted)] italic">// {ex.explanation}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Constraints */}
      {question.constraints && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Constraints</p>
          <p className="text-xs text-[var(--text-muted)] leading-5">{question.constraints}</p>
        </div>
      )}
    </div>
  );
}

function CodeEditor({ value, onChange, language = "python" }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--surface-border)]">
      {/* Editor toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--surface-border)] bg-[rgba(0,0,0,0.4)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          solution.{language === "python" ? "py" : language === "javascript" ? "js" : language === "java" ? "java" : "cpp"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span className="text-[10px] text-cyan-400 font-mono">EDITING</span>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="
          min-h-[320px] w-full resize-y bg-[rgba(0,0,0,0.5)] p-5 font-mono text-sm
          leading-7 text-[var(--text)] outline-none
          placeholder:text-[var(--text-muted)]
        "
        placeholder={`# Write your ${language} solution here...\n`}
      />
    </div>
  );
}

function PlayerRow({ player, isMe, host }) {
  const isHost = player.username === host;
  const statusStyles = {
    submitted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    active: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    waiting: "bg-[rgba(0,0,0,0.3)] text-[var(--text-muted)] border-[var(--surface-border)]",
  };
  const s = statusStyles[player.status] || statusStyles.waiting;

  return (
    <div className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
      isMe ? "border-cyan-500/30 bg-cyan-500/8" : "border-[var(--surface-border)] bg-[rgba(0,0,0,0.2)]"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black ${
          isMe ? "bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950" : "bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)]"
        }`}>
          {player.username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text)] flex items-center gap-1.5">
            {player.username}
            {isHost && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/30 rounded px-1 py-0.5">host</span>}
            {isMe && <span className="text-[10px] text-[var(--text-muted)]">you</span>}
          </p>
          <p className={`text-[10px] font-semibold uppercase tracking-wide capitalize ${
            player.status === "submitted" ? "text-emerald-400" : player.status === "active" ? "text-cyan-400" : "text-[var(--text-muted)]"
          }`}>
            {player.status}
          </p>
        </div>
      </div>
      <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${s}`}>
        {player.status === "submitted" ? `${player.score} pts` : player.status}
      </span>
    </div>
  );
}

function BattleRoom() {
  const { roomCode } = useParams();
  const { user, token } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [language, setLanguage] = useState("python");
  const previousQuestionId = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/rooms/${roomCode}`)
      .then((r) => setRoom(r.data))
      .catch(() => setError("Unable to load room. Please check the room code."))
      .finally(() => setLoading(false));
  }, [roomCode]);

  useEffect(() => {
    const nextId = room?.question?.id;
    if (nextId && previousQuestionId.current !== nextId) {
      setCode(room?.question?.starter_code || "");
      previousQuestionId.current = nextId;
    }
  }, [room?.question]);

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_SOCKET !== "true" || !token) return undefined;
    socket.auth = { token };
    socket.connect();
    socket.emit("join_room", { roomCode });
    socket.on("room_updated", (nextRoom) => setRoom(nextRoom));
    return () => { socket.off("room_updated"); socket.disconnect(); };
  }, [roomCode, token]);

  const isHost = useMemo(() => room?.host === user?.username, [room, user]);
  const myPlayer = useMemo(() => room?.players?.find((p) => p.username === user?.username), [room, user]);

  const handleStart = async () => {
    setStarting(true); setError("");
    try {
      const r = await api.post(`/rooms/${roomCode}/start`);
      setRoom(r.data); setSubmissionResult(null);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to start the game right now.");
    } finally { setStarting(false); }
  };

  const handleSubmit = async () => {
    if (!code.trim()) { setError("Write some code before submitting."); return; }
    setSubmitting(true); setError("");
    try {
      const r = await api.post(`/rooms/${roomCode}/submit`, { code, language });
      setSubmissionResult(r.data);
      const updated = await api.get(`/rooms/${roomCode}`);
      setRoom(updated.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Submission failed.");
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
            <div className="skeleton h-96 rounded-2xl" />
            <div className="skeleton h-96 rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  const statusStyle = {
    active: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25",
    finished: "bg-[rgba(0,0,0,0.3)] text-[var(--text-muted)] border-[var(--surface-border)]",
    waiting: "bg-cyan-500/12 text-cyan-300 border-cyan-500/25",
  };

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top bar */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--surface-border)] p-5"
          style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.05) 0%, rgba(99,102,241,0.07) 100%)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Room Code</p>
                <p className="mt-0.5 text-2xl font-black font-mono text-white tracking-widest">{roomCode}</p>
              </div>
              <div className="hidden sm:block h-8 w-px bg-[var(--surface-border)]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Host</p>
                <p className="mt-0.5 text-sm font-semibold text-cyan-300">{room?.host}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {room?.status === "active" && room?.started_at && (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.3)] px-4 py-2.5">
                  <svg className="h-4 w-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <CountdownTimer startedAt={room.started_at} limitMinutes={room.time_limit_minutes} />
                </div>
              )}
              <span className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest ${statusStyle[room?.status] || statusStyle.waiting}`}>
                {room?.status || "waiting"}
              </span>
              {room?.difficulty && (
                <span className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest ${DIFF_STYLES[room.difficulty]?.pill || ""}`}>
                  {room.difficulty}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="grid gap-6 xl:grid-cols-[1.85fr_1fr]">
          {/* Left panel */}
          <div className="space-y-5">
            {room?.status === "waiting" ? (
              <Card className="p-10 text-center space-y-5">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-3xl mx-auto">
                  ⚔️
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">
                    {isHost ? "You're the host" : "Waiting for host"}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {isHost
                      ? "When all players are ready, hit Start to begin the battle."
                      : "The host will start the battle soon. Get your fingers ready!"}
                  </p>
                </div>
                {isHost && (
                  <Button onClick={handleStart} disabled={starting} size="lg">
                    {starting ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Starting…
                      </span>
                    ) : "⚡ Start Battle"}
                  </Button>
                )}
              </Card>
            ) : (
              <>
                {/* Question */}
                <Card className="p-6">
                  <QuestionPanel question={room?.question} difficulty={room?.difficulty} />
                </Card>

                {/* Code editor */}
                <Card className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Your Solution</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">Write and submit your code</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="input-field rounded-xl border px-3 py-2 text-xs font-mono focus:outline-none cursor-pointer"
                      >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || myPlayer?.status === "submitted"}
                        size="sm"
                      >
                        {submitting ? "Submitting…" : myPlayer?.status === "submitted" ? "✓ Submitted" : "Submit"}
                      </Button>
                    </div>
                  </div>

                  <CodeEditor value={code} onChange={setCode} language={language} />

                  {submissionResult && (
                    <div className={`flex items-start gap-3 rounded-xl border p-4 ${
                      submissionResult.passed
                        ? "border-emerald-500/25 bg-emerald-500/10"
                        : "border-amber-500/25 bg-amber-500/10"
                    }`}>
                      <span className="text-lg shrink-0">{submissionResult.passed ? "✅" : "📬"}</span>
                      <div>
                        <p className={`text-sm font-bold ${submissionResult.passed ? "text-emerald-300" : "text-amber-300"}`}>
                          {submissionResult.passed ? "All tests passed!" : "Submission received"}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          Score: {submissionResult.score} pts · {submissionResult.test_results?.length ?? 0} test cases
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-5">
            {/* Match info */}
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Match Info</p>
              <div className="space-y-2">
                {[
                  { label: "Time Limit", value: `${room?.time_limit_minutes ?? 0} min`, accent: "text-cyan-300" },
                  { label: "Difficulty", value: room?.difficulty, accent: DIFF_STYLES[room?.difficulty]?.pill.split(" ").find((c) => c.startsWith("text-")) || "text-[var(--text)]" },
                  { label: "Points", value: room?.question?.points ?? "—", accent: "text-violet-300" },
                  { label: "Host", value: room?.host, accent: "text-amber-300" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.2)] px-4 py-3">
                    <span className="text-xs text-[var(--text-secondary)]">{row.label}</span>
                    <span className={`text-xs font-bold capitalize font-mono ${row.accent}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Players */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Participants</p>
                <span className="text-xs font-bold text-[var(--text-muted)]">{room?.players?.length ?? 0} coders</span>
              </div>
              <div className="space-y-2">
                {room?.players?.length ? (
                  room.players.map((p) => (
                    <PlayerRow
                      key={p.username}
                      player={p}
                      isMe={p.username === user?.username}
                      host={room.host}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--surface-border)] p-5 text-center">
                    <p className="text-xs text-[var(--text-muted)]">Waiting for players to join…</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BattleRoom;