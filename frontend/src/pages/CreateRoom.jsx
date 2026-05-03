import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

function CreateRoom() {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const response = await api.get(`/questions?level=${difficulty}`);
        setQuestions(response.data || []);
      } catch {
        setQuestions([]);
      }
    }

    fetchQuestions();
  }, [difficulty]);

  const createRoom = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/rooms/create", {
        host: user?.username,
        difficulty,
      });
      setRoomCode(response.data.roomCode || response.data.code);
      navigate(`/battle-room/${response.data.roomCode || response.data.code}`);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to create room. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (event) => {
    event.preventDefault();
    setError("");
    if (!joinCode.trim()) {
      setError("Enter a valid room code.");
      return;
    }
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

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/80">Create or join</p>
          <h1 className="text-4xl font-black text-white">Room lobby</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            Pick a difficulty, review the live question pool, and start a room without changing the app's routing flow.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card className="p-8">
              <div className="space-y-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Create room</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Launch a new match</h2>
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  Every room starts with one random question from the level you choose below.
                </p>
                <label className="block text-sm text-slate-300">
                  <span className="mb-2 block text-sm font-semibold text-slate-100">Difficulty level</span>
                  <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <Button onClick={createRoom} className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Room"}
                </Button>
                {roomCode && (
                  <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                    Room created: <span className="font-semibold">{roomCode}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-8">
              <div className="space-y-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Join room</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">Enter a room code</h2>
                </div>
                <form className="space-y-5" onSubmit={joinRoom}>
                  <Input
                    label="Room code"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    placeholder="AB12CD"
                  />
                  <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
                    {loading ? "Joining..." : "Join Room"}
                  </Button>
                </form>
                {error && <p className="text-sm text-rose-300">{error}</p>}
              </div>
            </Card>
          </div>

          <Card className="p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Question preview</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Live {difficulty} pool</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200">
                {questions.length} questions
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {questions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-5 text-sm text-slate-400">
                  No questions available for this level yet.
                </div>
              ) : (
                questions.map((question) => (
                  <div key={question.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-white">{question.title}</h3>
                      <span className="text-sm font-semibold text-cyan-200">{question.points} pts</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{question.description}</p>
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
