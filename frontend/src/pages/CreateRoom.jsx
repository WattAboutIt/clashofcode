import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import "../styles/room.css";

const DIFFICULTIES = [
  { key: "easy", label: "Easy", icon: "🌱", desc: "Beginner friendly" },
  { key: "medium", label: "Medium", icon: "🔥", desc: "Intermediate" },
  { key: "hard", label: "Hard", icon: "⚡", desc: "Expert level" },
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
      .then((response) => setQuestions(response.data || []))
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

  const selectedDiff = DIFFICULTIES.find((item) => item.key === difficulty);

  return (
    <section className="page-shell page-enter">
      <div className="page-container room-layout-split">
        <Card className="room-layout-card">
          <p className="label-text">Battle Lobby</p>
          <h1 className="section-title">Create or Join</h1>
          <p className="section-subtitle">
            Pick a difficulty, preview the live question pool, and launch your match.
          </p>

          <div className="panel-grid">
            <Card className="room-panel surface-card--soft">
              <p className="label-text">Create Room</p>
              <h2>Launch a new match</h2>
              <p className="section-subtitle">One random question from your selected difficulty.</p>

              <div className="room-difficulty-grid">
                {DIFFICULTIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`room-difficulty-card ${difficulty === item.key ? "room-difficulty-card--active" : ""}`}
                    onClick={() => setDifficulty(item.key)}
                  >
                    <div>{item.icon}</div>
                    <strong>{item.label}</strong>
                    <p className="muted-text">{item.desc}</p>
                  </button>
                ))}
              </div>

              <Button onClick={createRoom} className="w-full" size="lg" disabled={loading}>
                {loading ? "Creating..." : "Create Room"}
              </Button>

              {created && roomCode && (
                <div className="room-result room-result--success">
                  <div>
                    <strong>Room created! Redirecting...</strong>
                    <p className="muted-text">{roomCode}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="room-panel surface-card--soft">
              <p className="label-text">Join Room</p>
              <h2>Enter a room code</h2>
              <form className="panel-grid" onSubmit={joinRoom}>
                <Input
                  label="Room Code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="AB12CD"
                />
                <Button type="submit" className="w-full" variant="secondary" size="lg" disabled={loading}>
                  Join Battle
                </Button>
              </form>
              {error && <div className="room-error">{error}</div>}
            </Card>
          </div>
        </Card>

        <Card className="room-layout-card">
          <div className="dashboard-banner__top">
            <div>
              <p className="label-text">Question Pool</p>
              <h2>{selectedDiff?.icon} {difficulty} challenges</h2>
            </div>
            <span className="status-chip">{questions.length} available</span>
          </div>

          <div className="room-pool-list">
            {questions.length === 0 ? (
              <div className="room-empty">
                <p>No questions for this level yet.</p>
              </div>
            ) : (
              questions.map((question) => (
                <div key={question.id} className="room-pool-card">
                  <div className="dashboard-row">
                    <strong>{question.title}</strong>
                    <span className="status-chip">{question.points} pts</span>
                  </div>
                  <p className="muted-text">{question.description}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

export default CreateRoom;
