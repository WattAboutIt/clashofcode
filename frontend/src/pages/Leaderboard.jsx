import { useEffect, useState } from "react";
import api from "../api/axios";
import Card from "../components/ui/Card";

const MEDALS = ["🥇", "🥈", "🥉"];
const TOP_ACCENTS = [
  {
    border: "border-amber-400/30",
    bg: "bg-gradient-to-br from-amber-500/10 to-amber-600/5",
    glow: "shadow-[0_0_40px_rgba(251,191,36,0.2)]",
    label: "text-amber-300",
    pts: "text-amber-300",
  },
  {
    border: "border-slate-400/25",
    bg: "bg-gradient-to-br from-slate-400/8 to-slate-500/5",
    glow: "",
    label: "text-slate-300",
    pts: "text-slate-300",
  },
  {
    border: "border-orange-600/25",
    bg: "bg-gradient-to-br from-orange-700/8 to-orange-800/5",
    glow: "",
    label: "text-orange-400",
    pts: "text-orange-300",
  },
];

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/leaderboard")
      .then((r) => setPlayers(r.data.players || []))
      .catch(() => setError("Unable to load the leaderboard right now."))
      .finally(() => setLoading(false));
  }, []);

  const topPlayers = players.slice(0, 3);
  const remainingPlayers = players.slice(3);

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8 page-enter">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/8 px-4 py-2">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-300">Live rankings</span>
          </div>
          <h1 className="font-display text-5xl font-black text-white">Leaderboard</h1>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto text-sm">
            Real-time rankings based on match results, win rates, and total points earned.
          </p>
        </div>

        {/* Top 3 podium */}
        {!loading && topPlayers.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-3">
            {topPlayers.map((player, i) => {
              const a = TOP_ACCENTS[i];
              return (
                <Card
                  key={player.username}
                  className={`relative overflow-hidden p-6 ${a.bg} ${a.border} ${a.glow} transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className="pointer-events-none absolute right-4 top-4 text-5xl opacity-10 select-none">{MEDALS[i]}</div>
                  <div className="relative space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{MEDALS[i]}</span>
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${a.label}`}>#{player.rank}</p>
                        <h2 className="text-xl font-black text-white">{player.username}</h2>
                      </div>
                    </div>
                    <div className={`inline-flex rounded-lg border px-3 py-1.5 ${a.border}`}>
                      <span className={`font-mono text-sm font-bold ${a.pts}`}>{player.totalPoints} pts</span>
                    </div>
                    <div className="space-y-1 text-xs text-[var(--text-muted)]">
                      <div className="flex justify-between">
                        <span>Wins</span>
                        <span className="text-[var(--text)]">{player.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Losses</span>
                        <span className="text-[var(--text)]">{player.losses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Best streak</span>
                        <span className="text-amber-300">{player.bestStreak}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--surface-border)] px-6 py-4">
            <h2 className="text-base font-bold text-white">All Rankings</h2>
            <div className="flex items-center gap-2">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Live</span>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_80px_80px_80px] gap-3 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">W/L</span>
            <span className="text-right">Win%</span>
            <span className="text-right">Points</span>
          </div>

          {error && (
            <div className="px-6 py-3 text-xs text-rose-300">{error}</div>
          )}

          {loading && (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          )}

          {!loading && players.length === 0 && !error && (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">🏆</p>
              <p className="text-sm text-[var(--text-muted)]">No ranked players yet. Finish a battle to appear here.</p>
            </div>
          )}

          <div className="divide-y divide-[var(--surface-border)]">
            {remainingPlayers.map((player) => (
              <div key={player.rank}
                className="grid grid-cols-[48px_1fr_80px_80px_80px] items-center gap-3 px-6 py-4 text-sm transition-all duration-150 hover:bg-[rgba(34,211,238,0.03)]">
                <span className="font-mono text-sm font-bold text-[var(--text-muted)]">#{player.rank}</span>
                <div>
                  <p className="font-semibold text-white">{player.username}</p>
                </div>
                <p className="text-right text-xs text-[var(--text-muted)]">
                  <span className="text-emerald-400">{player.wins}</span>
                  <span className="mx-1">/</span>
                  <span className="text-rose-400">{player.losses}</span>
                </p>
                <p className="text-right font-mono text-xs text-violet-300">{player.winRate}%</p>
                <p className="text-right font-mono text-sm font-bold text-cyan-300">{player.totalPoints}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Leaderboard;