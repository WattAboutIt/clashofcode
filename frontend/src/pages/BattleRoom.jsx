import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import socket from "../utils/socket";

const DIFF_COLORS = {
  easy: "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  medium: "border-amber-500/25 bg-amber-500/15 text-amber-300",
  hard: "border-rose-500/25 bg-rose-500/15 text-rose-300",
};

function CountdownTimer({ startedAt, limitMinutes }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!startedAt) return undefined;

    const end = new Date(startedAt).getTime() + limitMinutes * 60 * 1000;
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setRemaining("00:00");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [startedAt, limitMinutes]);

  return <span>{remaining || "--:--"}</span>;
}

function QuestionPanel({ question, difficulty }) {
  if (!question) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Problem</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{question.title}</h2>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${DIFF_COLORS[difficulty] || "text-slate-300"}`}>
            {difficulty}
          </span>
          <span className="rounded-full border border-violet-500/25 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">
            {question.points} pts
          </span>
        </div>
      </div>

      <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm leading-7 text-slate-300">
        {question.description}
      </div>

      {question.examples?.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Examples</p>
          {question.examples.map((example, index) => (
            <div key={`${question.id}-example-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm font-mono">
              <p className="text-slate-400">Input: <span className="text-slate-200">{example.input}</span></p>
              <p className="mt-1 text-slate-400">Output: <span className="text-slate-200">{example.output}</span></p>
              {example.explanation && <p className="mt-1 text-slate-500">// {example.explanation}</p>}
            </div>
          ))}
        </div>
      )}

      {question.constraints && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-slate-400">Constraints</p>
          <p className="text-sm text-slate-400">{question.constraints}</p>
        </div>
      )}
    </div>
  );
}

function CodeEditor({ value, onChange, language = "python" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#020613]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs uppercase tracking-[0.3em] text-slate-500">{language}</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="min-h-[320px] w-full resize-none bg-transparent p-5 font-mono text-sm leading-7 text-slate-200 outline-none"
        placeholder="// Write your solution here..."
      />
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
    async function fetchRoom() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/rooms/${roomCode}`);
        setRoom(response.data);
      } catch {
        setError("Unable to load room. Please check the room code.");
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();
  }, [roomCode]);

  useEffect(() => {
    const nextQuestionId = room?.question?.id;
    if (nextQuestionId && previousQuestionId.current !== nextQuestionId) {
      setCode(room?.question?.starter_code || "");
      previousQuestionId.current = nextQuestionId;
    }
  }, [room?.question]);

  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_SOCKET !== "true" || !token) return undefined;

    socket.auth = { token };
    socket.connect();
    socket.emit("join_room", { roomCode });
    socket.on("room_updated", (nextRoom) => setRoom(nextRoom));

    return () => {
      socket.off("room_updated");
      socket.disconnect();
    };
  }, [roomCode, token]);

  const isHost = useMemo(() => {
    if (!room || !user) return false;
    return room.host === user.username;
  }, [room, user]);

  const myPlayer = useMemo(() => room?.players?.find((player) => player.username === user?.username), [room, user]);

  const handleStart = async () => {
    setStarting(true);
    setError("");
    try {
      const response = await api.post(`/rooms/${roomCode}/start`);
      setRoom(response.data);
      setSubmissionResult(null);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to start the game right now.");
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError("Write some code before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await api.post(`/rooms/${roomCode}/submit`, { code, language });
      setSubmissionResult(response.data);
      const updatedRoom = await api.get(`/rooms/${roomCode}`);
      setRoom(updatedRoom.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-32 animate-pulse rounded-3xl bg-slate-900" />
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card className="border-cyan-500/20 p-6 shadow-[0_30px_120px_-50px_rgba(34,211,238,0.35)]">
          <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">Room code</p>
              <p className="mt-2 text-2xl font-black text-white">{roomCode}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {room?.status === "active" && room?.started_at && (
                <div className="rounded-3xl bg-slate-900/85 px-4 py-3 text-sm font-mono text-slate-200">
                  Timer <CountdownTimer startedAt={room.started_at} limitMinutes={room.time_limit_minutes} />
                </div>
              )}
              <div className={`rounded-3xl px-4 py-3 text-sm font-semibold ${
                room?.status === "active"
                  ? "bg-emerald-500/15 text-emerald-200"
                  : room?.status === "finished"
                    ? "bg-slate-700/50 text-slate-300"
                    : "bg-cyan-500/15 text-cyan-100"
              }`}>
                {room?.status || "waiting"}
              </div>
              {room?.difficulty && (
                <div className={`rounded-3xl border px-4 py-3 text-sm font-semibold ${DIFF_COLORS[room.difficulty]}`}>
                  {room.difficulty}
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}
        </Card>

        <div className="grid gap-8 xl:grid-cols-[1.8fr_1fr]">
          <div className="space-y-6">
            {room?.status === "waiting" ? (
              <Card className="space-y-4 p-8 text-center">
                <h2 className="text-2xl font-semibold text-white">Waiting for host to start</h2>
                <p className="text-sm text-slate-400">
                  {isHost
                    ? "You're the host. Add players then click Start Game."
                    : "The host will start the battle soon. Get ready!"}
                </p>
                {isHost && (
                  <Button onClick={handleStart} disabled={starting} className="mt-2">
                    {starting ? "Starting..." : "Start Game"}
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <Card className="p-6">
                  <QuestionPanel question={room?.question} difficulty={room?.difficulty} />
                </Card>

                <Card className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Your solution</p>
                      <p className="mt-2 text-sm text-slate-400">
                        Submission recording is live. Judging hooks can plug into this same flow later.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-cyan-500/50"
                      >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
                      <Button onClick={handleSubmit} disabled={submitting || myPlayer?.status === "submitted"}>
                        {submitting ? "Submitting..." : myPlayer?.status === "submitted" ? "Submitted" : "Submit"}
                      </Button>
                    </div>
                  </div>

                  <CodeEditor value={code} onChange={setCode} language={language} />

                  {submissionResult && (
                    <div className={`rounded-2xl border p-4 text-sm ${
                      submissionResult.passed
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    }`}>
                      <p className="font-semibold">
                        {submissionResult.passed ? "All tests passed." : "Submission received."}
                      </p>
                      <p className="mt-1 text-xs opacity-75">
                        Score: {submissionResult.score} pts - {submissionResult.test_results?.length ?? 0} test cases
                      </p>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Match info</p>
              <div className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Time limit</span>
                  <span>{room?.time_limit_minutes ?? 0} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Difficulty</span>
                  <span className="capitalize">{room?.difficulty}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Points</span>
                  <span>{room?.question?.points ?? "--"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Host</span>
                  <span className="text-cyan-200">{room?.host}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Participants</p>
                <span className="text-sm text-slate-400">{room?.players?.length ?? 0} coders</span>
              </div>
              <div className="mt-6 space-y-3">
                {room?.players?.length ? (
                  room.players.map((player) => (
                    <div
                      key={player.username}
                      className={`flex items-center justify-between rounded-3xl border p-4 transition ${
                        player.username === user?.username
                          ? "border-cyan-500/30 bg-cyan-500/10"
                          : "border-white/10 bg-slate-950/70"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {player.username}
                          {player.username === room.host && <span className="ml-2 text-xs text-cyan-400">host</span>}
                          {player.username === user?.username && <span className="ml-1 text-xs text-slate-500">you</span>}
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-slate-500">{player.status}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        player.status === "submitted"
                          ? "bg-emerald-500/15 text-emerald-200"
                          : player.status === "active"
                            ? "bg-cyan-500/15 text-cyan-100"
                            : "bg-slate-700/50 text-slate-400"
                      }`}>
                        {player.status === "submitted" ? `${player.score} pts` : player.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Waiting for players to join...</p>
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
