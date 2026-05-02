import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

function Home() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 lg:gap-24">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.16)]">
              Neon coding battles • Fast-paced tournaments
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                Clash of Code
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Step into a developer arena built for speed, strategy, and glowing code showdowns. Battle in real-time, climb the leaderboard, and earn your rank.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/create-room">
                <Button className="min-w-[160px]">Join Battle</Button>
              </Link>
              <Link to="/create-room">
                <Button variant="secondary" className="min-w-[160px]">Create Room</Button>
              </Link>
            </div>
          </div>

          <Card className="relative overflow-hidden p-7 shadow-[0_30px_80px_-35px_rgba(56,189,248,0.5)]">
            <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle,rgba(99,102,241,0.2),transparent_55%)]" />
            <div className="relative space-y-5">
              <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-[0_40px_80px_-50px_rgba(15,23,42,0.9)]">
                <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/80">Live match preview</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">#1 Clan Rush</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">A high-stakes rapid challenge where top coders fight for rank and XP in 10-minute duels.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-950/70 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-violet-300/80">Time</p>
                  <p className="mt-3 text-4xl font-black text-white">08:23</p>
                </div>
                <div className="rounded-3xl bg-slate-950/70 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-violet-300/80">Participants</p>
                  <p className="mt-3 text-4xl font-black text-white">12</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Card className="p-7">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Speed Coding</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Lightning-fast rounds</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">Sharpen your algorithm timing with split-second challenges and instant score feedback.</p>
          </Card>
          <Card className="p-7">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Real-time Battles</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Compete live</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">Join rooms against other developers and race to solve problems before the timer runs out.</p>
          </Card>
          <Card className="p-7">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Leaderboard</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Rank up weekly</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">Earn XP, claim wins, and fight for a top spot in the circuit-style ranking board.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default Home