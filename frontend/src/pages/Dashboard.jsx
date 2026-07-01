import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import PixelAvatar from "../components/PixelAvatar";
import "../styles/dashboard.css";

function formatMatchTime(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function StatCard({ label, value, icon, loading }) {
  return (
    <Card className="dashboard-stat">
      <span className="dashboard-stat__icon" aria-hidden="true">{icon}</span>
      <p className="dashboard-stat__label">{label}</p>
      <div className="dashboard-stat__value">{loading ? "—" : value}</div>
    </Card>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [queueDifficulty, setQueueDifficulty] = useState("easy");
  const navigate = useNavigate();

  const handleFindMatch = () => {
    setShowMatchPopup(true);
  };

  const startMatchmaking = () => {
    setShowMatchPopup(false);
    navigate(`/matchmaking?difficulty=${encodeURIComponent(queueDifficulty)}`);
  };

  useEffect(() => {
    api.get("/user/dashboard")
      .then((response) => setData(response.data))
      .catch(() => setError("Unable to load your dashboard right now."))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Wins", value: data?.stats?.wins ?? 0, icon: "🏆" },
    { label: "Rank", value: data?.stats?.rank ?? "—", icon: "⚡" },
    { label: "Points", value: data?.stats?.totalPoints ?? 0, icon: "💎" },
    { label: "Matches", value: data?.stats?.gamesPlayed ?? 0, icon: "⚔️" },
  ];

  const questionCounts = data?.questionCounts || { easy: 0, medium: 0, hard: 0 };
  const recentBattles = data?.recentBattles || [];
  const levels = [
    { key: "easy", label: "Easy" },
    { key: "medium", label: "Medium" },
    { key: "hard", label: "Hard" },
  ];
  const matchLevels = [
    { key: "all", label: "All" },
    ...levels,
  ];

  return (
    <section className="page-shell page-enter">
      <div className="page-container dashboard-page">
        <Card className="dashboard-banner">
          <div className="dashboard-banner__top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: 1 }}>
              <span className="eyebrow">
                <span className="eyebrow__dot" />
                Control panel
              </span>
              <h1 className="section-title">
                Welcome back, <span className="gradient-text">{user?.username || "Champion"}</span>
              </h1>
              <p className="section-subtitle">
                Your live stats, battle history, and question pool
              </p>
              <div className="dashboard-actions" style={{ marginTop: '1.5rem' }}>
                <Button onClick={handleFindMatch} className="battle-room__chip--difficulty">Find Match</Button>
                <Link to="/create-room"><Button>Create Room</Button></Link>
                <Link to="/create-room"><Button variant="secondary">Join Room</Button></Link>
              </div>
            </div>
            <div style={{ marginLeft: '2rem', flexShrink: 0 }}>
              <PixelAvatar rank={data?.stats?.rank || user?.stats?.rank || "Satyr"} scale={5} />
            </div>
          </div>
        </Card>

        {showMatchPopup && createPortal(
          <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label="Select match difficulty">
            <div className="dashboard-modal__backdrop" onClick={() => setShowMatchPopup(false)} />
            <Card className="dashboard-modal__panel">
              <p className="label-text">Quick Match</p>
              <h2>Select difficulty</h2>
              <p className="section-subtitle">Choose your preferred challenge level before entering matchmaking.</p>
              <div className="dashboard-modal__difficulty-grid">
                {matchLevels.map((level) => (
                  <button
                    key={level.key}
                    type="button"
                    className={`dashboard-modal__difficulty ${queueDifficulty === level.key ? "is-active" : ""}`}
                    onClick={() => setQueueDifficulty(level.key)}
                  >
                    <strong>{level.label}</strong>
                  </button>
                ))}
              </div>
              <div className="dashboard-modal__actions">
                <Button type="button" variant="secondary" onClick={() => setShowMatchPopup(false)}>Cancel</Button>
                <Button type="button" onClick={startMatchmaking}>Find Match</Button>
              </div>
            </Card>
          </div>,
          document.body,
        )}

        <div className="dashboard-grid">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} loading={loading} />
          ))}
        </div>

        <div className="dashboard-split">
          <Card className="dashboard-panel">
            <div className="dashboard-banner__top">
              <div>
                <p className="label-text">Question Pool</p>
                <h2>Levels ready to play</h2>
              </div>
              <Link to="/create-room">
                <Button variant="secondary" size="sm">Open Lobby</Button>
              </Link>
            </div>
            <div className="dashboard-level-grid">
              {levels.map((level) => (
                <div key={level.key} className="dashboard-level-card">
                  <p className="label-text">{level.label}</p>
                  <div className="dashboard-level-card__count">{loading ? "—" : questionCounts[level.key]}</div>
                  <p className="muted-text">Challenges ready</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="dashboard-panel">
            <p className="label-text">Performance</p>
            <h2>Current form</h2>
            <div className="panel-grid">
              {[
                { label: "Win rate", value: `${data?.stats?.winRate ?? 0}%` },
                { label: "Current streak", value: data?.stats?.currentStreak ?? 0 },
                { label: "Best streak", value: data?.stats?.bestStreak ?? 0 },
              ].map((row) => (
                <div key={row.label} className="dashboard-row">
                  <span className="muted-text">{row.label}</span>
                  <strong>{loading ? "—" : row.value}</strong>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="dashboard-panel" id="match-history">
          <div className="dashboard-banner__top">
            <div>
              <p className="label-text">Match History</p>
              <h2>Recent battles</h2>
            </div>
            <Link to="/leaderboard">
              <Button variant="secondary" size="sm">Leaderboard</Button>
            </Link>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="dashboard-history">
            {!loading && recentBattles.length === 0 && (
              <div className="dashboard-history-empty">
                <h3>No battles yet</h3>
                <p className="muted-text">Start a room to generate live stats and history.</p>
              </div>
            )}
            {recentBattles.map((battle) => (
              <div key={battle.id} className="dashboard-history-item">
                <div>
                  <h3>{battle.title}</h3>
                  <p className="muted-text">{battle.difficulty} · {formatMatchTime(battle.playedAt)}</p>
                </div>
                <div className="dashboard-actions">
                  <strong>{battle.score} pts</strong>
                  <span className={`dashboard-result ${battle.result === "Victory" ? "dashboard-result--win" : "dashboard-result--loss"}`}>
                    {battle.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Dashboard;
