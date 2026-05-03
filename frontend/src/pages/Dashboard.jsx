import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

function formatMatchTime(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(date);
}

function StatCard({ label, value, accent, icon, loading }) {
  return (
    <Card className="group relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at 50% 0%, ${accent}10 0%, transparent 60%)` }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
          <span className="text-xl">{icon}</span>
        </div>
        <p className={`mt-3 text-4xl font-black transition-all ${accent}`}>
          {loading ? <span className="skeleton inline-block h-8 w-20 rounded-lg" /> : value}
        </p>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/user/dashboard")
      .then((r) => setData(r.data))
      .catch(() => setError("Unable to load your dashboard right now."))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Wins", value: data?.stats?.wins ?? 0, accent: "text-cyan-300", icon: "🏆" },
    { label: "Rank", value: data?.stats?.rank ?? "—", accent: "text-violet-300", icon: "⚡" },
    { label: "Points", value: data?.stats?.totalPoints ?? 0, accent: "text-blue-300", icon: "💎" },
    { label: "Matches", value: data?.stats?.gamesPlayed ?? 0, accent: "text-slate-200", icon: "⚔️" },
  ];

  const questionCounts = data?.questionCounts || { easy: 0, medium: 0, hard: 0 };
  const recentBattles = data?.recentBattles || [];

  const LEVELS = [
    { key: "easy", label: "Easy", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
    { key: "medium", label: "Medium", color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" },
    { key: "hard", label: "Hard", color: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20", dot: "bg-rose-400" },
  ];

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8 page-enter">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--surface-border)] p-8"
          style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(99,102,241,0.08) 100%)" }}>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-30"
            style={{ background: "radial-gradient(circle at 80% 50%, rgba(34,211,238,0.15), transparent 60%)" }} />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/70">Control Panel</p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                Welcome back, <span className="text-cyan-300">{user?.username || "Champion"}</span>
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Your live stats, battle history, and question pool — all in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/create-room"><Button>Create Room</Button></Link>
              <Link to="/create-room"><Button variant="secondary">Join Room</Button></Link>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} loading={loading} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {/* Question pool */}
          <Card className="p-7">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Question Pool</p>
                <h2 className="mt-1 text-xl font-bold text-white">Levels ready to play</h2>
              </div>
              <Link to="/create-room">
                <Button variant="secondary" size="sm">Open Lobby</Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {LEVELS.map((level) => (
                <div key={level.key} className={`rounded-xl border p-5 ${level.bg} transition-all duration-200 hover:scale-[1.02]`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${level.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${level.color}`}>{level.label}</span>
                  </div>
                  <p className="mt-3 text-4xl font-black text-white">
                    {loading ? "—" : questionCounts[level.key]}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">challenges</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Performance */}
          <Card className="p-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Performance</p>
            <h2 className="mt-1 text-xl font-bold text-white mb-5">Current form</h2>
            <div className="space-y-4">
              {[
                { label: "Win rate", value: `${data?.stats?.winRate ?? 0}%`, accent: "text-cyan-300" },
                { label: "Current streak", value: data?.stats?.currentStreak ?? 0, accent: "text-violet-300" },
                { label: "Best streak", value: data?.stats?.bestStreak ?? 0, accent: "text-amber-300" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.2)] px-4 py-3">
                  <span className="text-sm text-[var(--text-secondary)]">{row.label}</span>
                  <span className={`text-lg font-black font-mono ${row.accent}`}>
                    {loading ? "—" : row.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent battles */}
        <Card className="p-7">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Match History</p>
              <h2 className="mt-1 text-xl font-bold text-white">Recent battles</h2>
            </div>
            <Link to="/leaderboard"><Button variant="secondary" size="sm">Leaderboard</Button></Link>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {!loading && recentBattles.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--surface-border)] bg-[rgba(0,0,0,0.15)] p-8 text-center">
                <p className="text-3xl mb-2">⚔️</p>
                <p className="text-sm font-semibold text-[var(--text-secondary)]">No battles yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Start a room to generate live stats and history.</p>
              </div>
            )}
            {recentBattles.map((battle) => (
              <div key={battle.id}
                className="group flex flex-col gap-3 rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.2)] px-5 py-4 transition-all duration-200 hover:border-[var(--surface-border-hover)] hover:bg-[rgba(34,211,238,0.03)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{battle.title}</h3>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {battle.difficulty} · {formatMatchTime(battle.playedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[var(--text-secondary)]">{battle.score} pts</span>
                  <span className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    battle.result === "Victory"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                  }`}>
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