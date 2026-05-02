import Card from "../components/ui/Card";

const topPlayers = [
  { name: "Astra", score: 1920, badge: "1st" },
  { name: "Flux", score: 1860, badge: "2nd" },
  { name: "Nova", score: 1785, badge: "3rd" },
];

const leaderboard = [
  { rank: 4, name: "Echo", score: 1710 },
  { rank: 5, name: "Cipher", score: 1605 },
  { rank: 6, name: "Pulse", score: 1498 },
  { rank: 7, name: "Zen", score: 1422 },
  { rank: 8, name: "Rune", score: 1350 },
];

function Leaderboard() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/80">Leaderboard</p>
          <h1 className="text-4xl font-black text-white">Top competitors</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">View the elite coders dominating the Clash of Code arena. The top 3 earn special glowing badges and style points.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {topPlayers.map((player, index) => (
            <Card
              key={player.name}
              className={`p-6 ${index === 0 ? "bg-cyan-500/10 border-cyan-400/25 shadow-[0_0_60px_-20px_rgba(34,211,238,0.45)]" : index === 1 ? "bg-violet-500/10 border-violet-400/20" : "bg-slate-950/70"}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{player.badge}</p>
                  <h2 className="mt-4 text-3xl font-black text-white">{player.name}</h2>
                </div>
                <span className="rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100">{player.score}</span>
              </div>
              <p className="mt-6 text-sm leading-6 text-slate-300">Fastest solve time: 3m 12s • Current streak: {index === 0 ? "13" : index === 1 ? "9" : "7"} wins</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Rankings</h2>
            <span className="text-sm uppercase tracking-[0.24em] text-slate-400">Weekly</span>
          </div>
          <div className="space-y-3">
            {leaderboard.map((player) => (
              <div key={player.rank} className="grid grid-cols-[48px_1fr_auto] items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-300 transition hover:border-cyan-400/20 hover:bg-slate-900/80">
                <span className="text-lg font-semibold text-white">#{player.rank}</span>
                <span>{player.name}</span>
                <span className="text-right font-semibold text-cyan-200">{player.score}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Leaderboard