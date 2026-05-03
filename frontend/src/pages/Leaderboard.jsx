import { useEffect, useState } from "react";
import api from "../api/axios";
import Card from "../components/ui/Card";
import "../styles/leaderboard.css";

const MEDALS = ["🥇", "🥈", "🥉"];

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/leaderboard")
      .then((response) => setPlayers(response.data.players || []))
      .catch(() => setError("Unable to load the leaderboard right now."))
      .finally(() => setLoading(false));
  }, []);

  const topPlayers = players.slice(0, 3);
  const remainingPlayers = players.slice(3);

  return (
    <section className="page-shell page-enter">
      <div className="page-container leaderboard-page">
        <Card className="leaderboard-hero">
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            Live rankings
          </span>
          <h1 className="section-title">Leaderboard</h1>
          <p className="section-subtitle">
            Real-time rankings based on match results, win rates, and total points earned.
          </p>
        </Card>

        {!loading && topPlayers.length > 0 && (
          <div className="leaderboard-podium">
            {topPlayers.map((player, index) => (
              <Card key={player.username} className="leaderboard-podium-card">
                <span className="leaderboard-podium-card__medal" aria-hidden="true">{MEDALS[index]}</span>
                <p className="label-text">#{player.rank}</p>
                <h2>{player.username}</h2>
                <p className="section-subtitle">{player.totalPoints} pts</p>
                <div className="panel-grid">
                  <div className="dashboard-row">
                    <span className="muted-text">Wins</span>
                    <strong>{player.wins}</strong>
                  </div>
                  <div className="dashboard-row">
                    <span className="muted-text">Losses</span>
                    <strong>{player.losses}</strong>
                  </div>
                  <div className="dashboard-row">
                    <span className="muted-text">Best streak</span>
                    <strong>{player.bestStreak}</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="leaderboard-table-card">
          <div className="dashboard-banner__top">
            <div>
              <p className="label-text">All Rankings</p>
              <h2>Competitive board</h2>
            </div>
            <span className="status-chip">
              <span className="eyebrow__dot" />
              Live
            </span>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {loading ? (
            <div className="panel-grid">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="skeleton loading-slab loading-slab--sm" />
              ))}
            </div>
          ) : players.length === 0 && !error ? (
            <div className="leaderboard-empty">
              <h3>No ranked players yet</h3>
              <p>Finish a battle to appear here.</p>
            </div>
          ) : (
            <>
              <div className="leaderboard-table-header">
                <span>#</span>
                <span>Player</span>
                <span>W/L</span>
                <span>Win%</span>
                <span>Points</span>
              </div>
              <div className="leaderboard-rows">
                {remainingPlayers.map((player) => (
                  <div key={player.rank} className="leaderboard-row">
                    <span>#{player.rank}</span>
                    <strong>{player.username}</strong>
                    <span>{player.wins}/{player.losses}</span>
                    <span>{player.winRate}%</span>
                    <strong>{player.totalPoints}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}

export default Leaderboard;
