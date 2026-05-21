import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import api, { API_BASE_URL } from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import "../styles/room.css";

const DIFFICULTIES = [
  { key: "all", label: "All", desc: "Browse every challenge" },
  { key: "easy", label: "Easy", desc: "Beginner friendly" },
  { key: "medium", label: "Medium", desc: "Intermediate" },
  { key: "hard", label: "Hard", desc: "Expert level" },
];

const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

function groupQuestionsByDifficulty(questions) {
  return questions.reduce((groups, question) => {
    const key = String(question.difficulty || "uncategorized").toLowerCase();
    groups[key] = groups[key] || [];
    groups[key].push(question);
    return groups;
  }, {});
}

function normalizeQuestionResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.questions)) {
    return data.questions;
  }
  return [];
}

function CreateRoom() {
  const { user, token } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [openMatchmaking, setOpenMatchmaking] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [error, setError] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const navigate = useNavigate();

  const loadQuestions = useCallback(async () => {
    setQuestionError("");
    setQuestionsLoading(true);
    try {
      const params = difficulty === "all" ? {} : { difficulty };
      const response = await axios.get(`${API_BASE_URL}/questions`, { params });
      const nextQuestions = normalizeQuestionResponse(response.data);
      setQuestions(nextQuestions);
      setSelectedQuestions((current) =>
        current.filter((questionId) => nextQuestions.some((question) => question.id === questionId))
      );
    } catch (err) {
      setQuestions([]);
      setSelectedQuestions([]);
      setQuestionError(err?.response?.data?.detail || "Unable to load questions. Please try again.");
    } finally {
      setQuestionsLoading(false);
    }
  }, [difficulty]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQuestions();
  }, [loadQuestions]);

  const toggleQuestion = (questionId) => {
    setSelectedQuestions((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
  };

  const createRoom = async () => {
    setError("");
    setLoading(true);
    setCreated(false);
    try {
      const response = await api.post("/rooms", {
        name: roomName.trim() || null,
        difficulty,
        questions: selectedQuestions,
        created_by: user?.username,
        open_matchmaking: openMatchmaking,
      });
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
      const response = await api.post(
        "/rooms/join",
        { roomCode: joinCode.trim() },
        { headers: { Authorization: token ? `Bearer ${token}` : undefined } }
      );
      navigate(`/battle-room/${response.data.roomCode || response.data.code}`);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to join room. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const groupedQuestions = useMemo(() => groupQuestionsByDifficulty(questions), [questions]);
  const visibleGroups = useMemo(() => {
    const knownGroups = DIFFICULTY_ORDER.filter((key) => groupedQuestions[key]?.length);
    const extraGroups = Object.keys(groupedQuestions).filter((key) => !DIFFICULTY_ORDER.includes(key));
    return [...knownGroups, ...extraGroups];
  }, [groupedQuestions]);
  const selectedDiff = DIFFICULTIES.find((item) => item.key === difficulty);

  return (
    <section className="page-shell page-enter">
      <div className="page-container room-layout-split">
        <Card className="room-layout-card">
          <p className="label-text">Battle Lobby</p>
          <h1 className="section-title">Create or Join</h1>
          <p className="section-subtitle">
            Pick a difficulty, choose the exact questions you want, and launch your match.
          </p>

          <div className="panel-grid">
            <Card className="room-panel surface-card--soft">
              <p className="label-text">Create Room</p>
              <h2>Launch a new match</h2>

              <Input
                label="Room Name"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Optional"
              />

              <label className="block">
                <span className="ui-field-label">Difficulty</span>
                <select
                  className="ui-input"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                >
                  {DIFFICULTIES.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </label>

              <div className="room-difficulty-grid">
                {DIFFICULTIES.filter((item) => item.key !== "all").map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`room-difficulty-card ${difficulty === item.key ? "room-difficulty-card--active" : ""}`}
                    onClick={() => setDifficulty(item.key)}
                  >
                    <strong>{item.label}</strong>
                    <p className="muted-text">{item.desc}</p>
                  </button>
                ))}
              </div>

              <label className="room-matchmaking-toggle" htmlFor="open-matchmaking">
                <input
                  id="open-matchmaking"
                  type="checkbox"
                  checked={openMatchmaking}
                  onChange={(event) => setOpenMatchmaking(event.target.checked)}
                />
                <span>
                  <strong>Enable global matchmaking</strong>
                  <p className="muted-text">Anyone using Find Match can be placed into this room.</p>
                </span>
              </label>

              <Button type="button" onClick={loadQuestions} className="w-full" variant="secondary" disabled={questionsLoading}>
                {questionsLoading ? "Loading Questions..." : "Load Questions"}
              </Button>

              <Button onClick={createRoom} className="w-full" size="lg" disabled={loading}>
                {loading ? "Creating..." : "Create Room with Selected Questions"}
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
              <h2>{selectedDiff?.label} challenges</h2>
            </div>
            <span className="status-chip">{selectedQuestions.length} selected / {(questions || []).length} available</span>
          </div>

          <div className="room-pool-list">
            {questionsLoading ? (
              <div className="room-empty"><p>Loading questions...</p></div>
            ) : questionError ? (
              <div className="room-error">{questionError}</div>
            ) : !questions?.length ? (
              <div className="room-empty">
                <p>No questions found</p>
              </div>
            ) : (
              visibleGroups.map((group) => (
                <div key={group} className="room-question-group">
                  <div className="room-question-group__header">
                    <strong>{group}</strong>
                    <span className="status-chip">{groupedQuestions[group].length}</span>
                  </div>
                  {groupedQuestions[group].map((question) => (
                    <label key={question.id} className="room-pool-card room-pool-card--selectable">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(question.id)}
                        onChange={() => toggleQuestion(question.id)}
                      />
                      <span>
                        <span className="dashboard-row">
                          <strong>{question.title || "Untitled question"}</strong>
                          <span className="status-chip">{question.points || 0} pts</span>
                        </span>
                        <span className="muted-text room-pool-card__copy">
                          {question.question_text || question.description}
                        </span>
                      </span>
                    </label>
                  ))}
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
