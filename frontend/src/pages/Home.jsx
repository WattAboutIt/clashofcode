import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

const FEATURES = [
  {
    icon: "⚡",
    accent: "cyan",
    tag: "Speed Mode",
    title: "Lightning Rounds",
    desc: "Split-second algorithm challenges with instant feedback. Your reflexes get tested as much as your logic.",
  },
  {
    icon: "⚔️",
    accent: "violet",
    tag: "Live Arena",
    title: "Real-time Battles",
    desc: "Race other developers to solve problems before the clock hits zero. Every second counts.",
  },
  {
    icon: "🏆",
    accent: "amber",
    tag: "Rankings",
    title: "Weekly Leaderboard",
    desc: "Earn XP, stack wins, and fight for the top spot in our circuit-style ranking system.",
  },
];

function FeatureCard({ feature }) {
  const accentMap = {
    cyan: {
      tag: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
      icon: "bg-cyan-500/10 text-cyan-300",
      border: "hover:border-cyan-500/30",
    },
    violet: {
      tag: "text-violet-300 bg-violet-500/10 border-violet-500/20",
      icon: "bg-violet-500/10 text-violet-300",
      border: "hover:border-violet-500/30",
    },
    amber: {
      tag: "text-amber-300 bg-amber-500/10 border-amber-500/20",
      icon: "bg-amber-500/10 text-amber-300",
      border: "hover:border-amber-500/30",
    },
  };

  const a = accentMap[feature.accent];

  return (
    <Card className={`p-7 group transition-all duration-300 ${a.border}`}>
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-xl ${a.icon} mb-5 transition-transform duration-300 group-hover:scale-110`}>
        {feature.icon}
      </div>
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest ${a.tag}`}>
        {feature.tag}
      </span>
      <h3 className="mt-4 text-xl font-bold text-[var(--text)]">{feature.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{feature.desc}</p>
    </Card>
  );
}

function Home() {
  return (
    <section className="relative min-h-screen px-4 py-20 sm:px-6 lg:px-8 page-enter">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-mesh" />

      {/* Glowing orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 top-3/4 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/6 blur-[100px]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-20 lg:gap-28">
        {/* Hero Section */}
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                Live coding arena
              </span>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1
                className="font-display text-6xl font-black leading-none tracking-tight text-white sm:text-7xl lg:text-8xl"
                style={{
                  background: "linear-gradient(135deg, #ffffff 30%, #22d3ee 70%, #818cf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Clash of<br />Code
              </h1>
              <p className="max-w-xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
                Step into the developer arena built for speed, strategy, and glowing code showdowns. 
                Battle real-time. Climb the board. Earn your rank.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link to="/create-room">
                <Button size="lg" className="min-w-[160px]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Join Battle
                </Button>
              </Link>
              <Link to="/create-room">
                <Button variant="secondary" size="lg" className="min-w-[160px]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Room
                </Button>
              </Link>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-6 pt-2">
              {[
                { value: "10K+", label: "Battles fought" },
                { value: "50+", label: "Challenges" },
                { value: "1K+", label: "Developers" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live match preview card */}
          <div className="float">
            <Card
              glow
              className="relative overflow-hidden p-1"
              style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(99,102,241,0.12) 100%)" }}
            >
              <div className="rounded-xl overflow-hidden border border-white/5 bg-[var(--bg-secondary)]">
                {/* Terminal header */}
                <div className="flex items-center gap-2 border-b border-white/8 bg-[rgba(0,0,0,0.3)] px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">
                    live_match.exe
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400">LIVE</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Match title */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-cyan-300/70 font-semibold">#1 Clan Rush</p>
                    <h2 className="mt-1 text-2xl font-black text-white">Two Sum Challenge</h2>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                      Given an array of integers, return indices of the two numbers that add up to the target.
                    </p>
                  </div>

                  {/* Code snippet */}
                  <div className="rounded-lg bg-[rgba(0,0,0,0.4)] p-4 font-mono text-xs leading-5">
                    <p className="text-violet-300">def <span className="text-cyan-300">two_sum</span><span className="text-white">(nums, target):</span></p>
                    <p className="text-[var(--text-muted)] ml-4">seen = {"{}"}</p>
                    <p className="text-[var(--text-muted)] ml-4">for i, n in <span className="text-amber-300">enumerate</span>(nums):</p>
                    <p className="text-emerald-400 ml-8">▍</p>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Timer", value: "08:23", color: "text-cyan-300" },
                      { label: "Players", value: "12", color: "text-violet-300" },
                      { label: "Points", value: "150", color: "text-amber-300" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-white/5 bg-[rgba(0,0,0,0.3)] p-3 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{s.label}</p>
                        <p className={`mt-1 text-xl font-black font-mono ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Why Clash of Code</p>
            <h2 className="text-3xl font-black text-white">Built for competitive coders</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.tag} feature={f} />
            ))}
          </div>
        </div>

        {/* Bottom CTA banner */}
        <Card className="relative overflow-hidden p-10 text-center" glow>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-indigo-500/8 to-violet-500/5" />
          <div className="relative space-y-4">
            <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to prove yourself?</h2>
            <p className="mx-auto max-w-lg text-[var(--text-secondary)]">
              Jump in. Code fast. Win glory. Your rank is waiting.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link to="/register">
                <Button size="lg">Get Started — Free</Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="secondary" size="lg">View Leaderboard</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Home;