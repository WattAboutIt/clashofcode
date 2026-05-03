import { useEffect, useState } from "react";

import api from "../api/axios";
import Card from "../components/ui/Card";

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await api.get("/leaderboard");
        setPlayers(response.data.players || []);
      } catch {
        setError("Unable to load the leaderboard right now.");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const topPlayers = players.slice(0, 3);
  const remainingPlayers = players.slice(3);

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/80">Leaderboard</p>
          <h1 className="text-4xl font-black text-white">Top competitors</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            Live rankings are now generated from real backend stats, points, and match results.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {topPlayers.map((player, index) => (
            <Card
              key={player.username}
              className={`p-6 ${index === 0 ? "border-cyan-400/25 bg-cyan-500/10 shadow-[0_0_60px_-20px_rgba(34,211,238,0.45)]" : index === 1 ? "border-violet-400/20 bg-violet-500/10" : "bg-slate-950/70"}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">#{player.rank}</p>
                  <h2 className="mt-4 text-3xl font-black text-white">{player.username}</h2>
                </div>
                <span className="rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100">
                  {player.totalPoints} pts
                </span>
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-300">
                {player.wins} wins - {player.losses} losses - Best streak {player.bestStreak}
              </p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Rankings</h2>
            <span className="text-sm uppercase tracking-[0.24em] text-slate-400">Live</span>
          </div>
          {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}
          {!loading && players.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
              No ranked players yet. Finish a room to populate the standings.
            </div>
          )}
          <div className="space-y-3">
            {remainingPlayers.map((player) => (
              <div key={player.rank} className="grid grid-cols-[48px_1fr_auto] items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-300 transition hover:border-cyan-400/20 hover:bg-slate-900/80">
                <span className="text-lg font-semibold text-white">#{player.rank}</span>
                <div>
                  <span className="block text-white">{player.username}</span>
                  <span className="block text-xs text-slate-500">{player.winRate}% win rate</span>
                </div>
                <span className="text-right font-semibold text-cyan-200">{player.totalPoints}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Leaderboard;
