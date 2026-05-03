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
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await api.get("/user/dashboard");
        setData(response.data);
      } catch {
        setError("Unable to load your dashboard right now.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const stats = [
    { label: "Wins", value: data?.stats?.wins ?? 0, accent: "text-cyan-300" },
    { label: "Rank", value: data?.stats?.rank ?? "Unranked", accent: "text-violet-300" },
    { label: "Points", value: data?.stats?.totalPoints ?? 0, accent: "text-blue-300" },
    { label: "Matches", value: data?.stats?.gamesPlayed ?? 0, accent: "text-slate-200" },
  ];

  const questionCounts = data?.questionCounts || { easy: 0, medium: 0, hard: 0 };
  const recentBattles = data?.recentBattles || [];

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-8 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Welcome back</p>
              <h1 className="mt-3 text-4xl font-black text-white">Hello, {user?.username || "Champion"}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Track your live stats, launch a room, and jump into the next coding battle with a real question pool.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/create-room">
                <Button>Create Room</Button>
              </Link>
              <Link to="/create-room">
                <Button variant="secondary">Join Room</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{stat.label}</p>
              <p className={`mt-4 text-4xl font-black ${stat.accent}`}>{loading ? "..." : stat.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Question pool</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Levels ready to play</h2>
              </div>
              <Link to="/create-room">
                <Button variant="secondary" size="sm">Open lobby</Button>
              </Link>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {[
                { key: "easy", label: "Easy", accent: "text-emerald-300 bg-emerald-500/10" },
                { key: "medium", label: "Medium", accent: "text-amber-300 bg-amber-500/10" },
                { key: "hard", label: "Hard", accent: "text-rose-300 bg-rose-500/10" },
              ].map((level) => (
                <div key={level.key} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${level.accent}`}>
                    {level.label}
                  </span>
                  <p className="mt-4 text-3xl font-black text-white">{loading ? "..." : questionCounts[level.key]}</p>
                  <p className="mt-1 text-sm text-slate-400">available challenges</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Performance</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Current form</h2>
            </div>
            <div className="mt-7 space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Win rate</span>
                <span className="font-semibold text-white">{loading ? "..." : `${data?.stats?.winRate ?? 0}%`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Current streak</span>
                <span className="font-semibold text-cyan-200">{loading ? "..." : data?.stats?.currentStreak ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Best streak</span>
                <span className="font-semibold text-white">{loading ? "..." : data?.stats?.bestStreak ?? 0}</span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Match history</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Recent battles</h2>
            </div>
            <Link to="/leaderboard">
              <Button variant="secondary">Leaderboard</Button>
            </Link>
          </div>
          {error && <p className="mt-6 text-sm text-rose-300">{error}</p>}
          <div className="mt-8 space-y-4">
            {!loading && recentBattles.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-6 text-sm text-slate-400">
                No battles recorded yet. Start a room to generate live stats and history.
              </div>
            )}
            {recentBattles.map((battle) => (
              <div key={battle.id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 transition hover:border-cyan-400/20 hover:bg-slate-900/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{battle.title}</h3>
                    <p className="text-sm text-slate-400">
                      {battle.difficulty} - {formatMatchTime(battle.playedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-200">{battle.score} pts</span>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${battle.result === "Victory" ? "bg-cyan-500/15 text-cyan-200" : "bg-rose-500/15 text-rose-200"}`}>
                      {battle.result}
                    </span>
                  </div>
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
