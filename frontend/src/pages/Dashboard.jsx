import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

const stats = [
  { label: "Wins", value: "27", accent: "text-cyan-300" },
  { label: "Rank", value: "Diamond II", accent: "text-violet-300" },
  { label: "XP", value: "14.8K", accent: "text-blue-300" },
  { label: "Matches", value: "82", accent: "text-slate-200" },
];

const recentBattles = [
  { title: "Array Shuffle Showdown", result: "Victory", time: "12 min ago" },
  { title: "Binary Search Blitz", result: "Close Loss", time: "1 hr ago" },
  { title: "Graph Traversal Gauntlet", result: "Victory", time: "Yesterday" },
];

function Dashboard() {
  const { user } = useAuth();

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/80">Welcome back</p>
              <h1 className="mt-3 text-4xl font-black text-white">Hello, {user?.username || "Champion"}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Your gaming profile is ready. Create rooms, join battles, and take the top spot in the leaderboard.</p>
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
              <p className={`mt-4 text-4xl font-black ${stat.accent}`}>{stat.value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Next battle</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Quantum Queue</h2>
            </div>
            <div className="rounded-3xl bg-cyan-500/15 px-4 py-3 text-sm text-cyan-100">Live</div>
          </div>
          <div className="mt-7 space-y-4 text-sm text-slate-300">
            <p>Room code: <span className="font-semibold text-white">Q9T4-R2B7</span></p>
            <p>Challenge: Optimize path search in a contested graph.</p>
            <p>Participants: 8 coders currently queued.</p>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Match history</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Recent battles</h2>
            </div>
            <Button variant="secondary">View all</Button>
          </div>
          <div className="mt-8 space-y-4">
            {recentBattles.map((battle) => (
              <div key={battle.title} className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 transition hover:border-cyan-400/20 hover:bg-slate-900/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{battle.title}</h3>
                    <p className="text-sm text-slate-400">{battle.time}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${battle.result === "Victory" ? "bg-cyan-500/15 text-cyan-200" : "bg-rose-500/15 text-rose-200"}`}>
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

export default Dashboard