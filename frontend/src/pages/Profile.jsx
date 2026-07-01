import { useEffect, useState } from "react";
import api from "../api/axios";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import "../styles/profile.css";

function StatBadge({ label, value, loading }) {
  return (
    <Card className="profile-stat-card">
      <p className="label-text">{label}</p>
      <div className="profile-stat-card__value">{loading ? "—" : value}</div>
    </Card>
  );
}

const MYTH_RANK_ICONS = {
  Satyr: "🐐",
  Minotaur: "🐂",
  Medusa: "🐍",
  Hercules: "💪",
  Ares: "⚔️",
  Zeus: "⚡",
  Developer: "🛠️",
};

function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/user/profile"), api.get("/user/stats")])
      .then(([profileRes, statsRes]) => {
        setStats({ ...statsRes.data, username: profileRes.data.username, email: profileRes.data.email });
        setError("");
      })
      .catch(() => setError("Unable to load profile. Refresh to retry."))
      .finally(() => setLoading(false));
  }, []);

  const username = user?.username || stats?.username || "—";
  const initials = username.slice(0, 2).toUpperCase();
  const winRate = stats?.winRate ?? 0;
  const email = user?.email || stats?.email || "—";
  const rankIcon = MYTH_RANK_ICONS[stats?.rank] ?? "🏛️";

  return (
    <section className="page-shell page-enter">
      <div className="page-container profile-page">
        <div>
          <p className="label-text">Profile</p>
          <h1 className="section-title">Your account</h1>
        </div>

        <div className="profile-grid">
          <Card className="profile-card">
            <div className="profile-header-row">
              <div className="profile-avatar">
                {initials}
                <span className="profile-avatar__dot" />
              </div>
              <div>
                <h2>{username}</h2>
                <p className="muted-text">{email}</p>
              </div>
            </div>

            <div className="profile-field-grid">
              {[
                { label: "Username", value: username },
                { label: "Email", value: email },
              ].map((field) => (
                <div key={field.label} className="profile-field">
                  <p className="label-text">{field.label}</p>
                  <strong>{field.value}</strong>
                </div>
              ))}
            </div>

            <div id="settings">
              <div className="dashboard-row">
                <span className="label-text">Win rate</span>
                <strong>{loading ? "—" : `${winRate}%`}</strong>
              </div>
              <progress className="profile-progress" max="100" value={loading ? 0 : winRate} />
            </div>
          </Card>

          <Card className="profile-card">
            <p className="label-text">Rank badge</p>
            <div className="profile-rank">
              <div className="profile-rank__icon" aria-hidden="true">{rankIcon}</div>
              <h2>{loading ? "—" : stats?.rank || "Unranked"}</h2>
              <p className="muted-text">{loading ? "Loading..." : `${stats?.totalPoints ?? 0} pts collected`}</p>
            </div>
            <div className="profile-mini-grid">
              <div className="profile-mini-card">
                <p className="label-text">Streak</p>
                <strong>{loading ? "—" : stats?.currentStreak ?? 0}</strong>
              </div>
              <div className="profile-mini-card">
                <p className="label-text">Best</p>
                <strong>{loading ? "—" : stats?.bestStreak ?? 0}</strong>
              </div>
            </div>
          </Card>
        </div>

        <div className="profile-stats-grid">
          <StatBadge label="Total Games" value={stats?.gamesPlayed ?? 0} loading={loading} />
          <StatBadge label="Wins" value={stats?.wins ?? 0} loading={loading} />
          <StatBadge label="Losses" value={stats?.losses ?? 0} loading={loading} />
          <StatBadge label="Win Rate" value={`${stats?.winRate ?? 0}%`} loading={loading} />
          <StatBadge label="Best Streak" value={stats?.bestStreak ?? 0} loading={loading} />
        </div>

        {error && <div className="auth-error">{error}</div>}
      </div>
    </section>
  );
}

export default Profile;
