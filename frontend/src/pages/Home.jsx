import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import "../styles/landing.css";

const FEATURES = [
  {
    icon: "⚡",
    tag: "Speed Mode",
    title: "Lightning Rounds",
    desc: "Split-second algorithm challenges with instant feedback. Your reflexes get tested as much as your logic.",
  },
  {
    icon: "⚔️",
    tag: "Live Arena",
    title: "Real-time Battles",
    desc: "Race other developers to solve problems before the clock hits zero. Every second counts.",
  },
  {
    icon: "🏆",
    tag: "Rankings",
    title: "Weekly Leaderboard",
    desc: "Earn XP, stack wins, and fight for the top spot in our circuit-style ranking system.",
  },
];

function FeatureCard({ feature }) {
  return (
    <Card className="landing-feature-card">
      <div className="landing-feature-card__icon" aria-hidden="true">{feature.icon}</div>
      <span className="landing-feature-card__tag">{feature.tag}</span>
      <h3>{feature.title}</h3>
      <p className="section-subtitle">{feature.desc}</p>
    </Card>
  );
}

function Home() {
  return (
    <section className="page-shell landing-page page-enter">
      <div className="page-container">
        <div className="landing-hero">
          <Card className="landing-hero__content">
            <div className="landing-hero__copy">
              <span className="eyebrow">
                <span className="eyebrow__dot" />
                Live coding arena
              </span>
              <div>
                <h1 className="section-title">
                  Warm, fast, premium <span className="gradient-text">coding battles</span>
                </h1>
                <p className="section-subtitle">
                  Step into the developer arena built for speed, strategy, and live code showdowns.
                  Battle in real time, climb the board, and earn your rank.
                </p>
              </div>
              <div className="landing-hero__actions">
                <Link to="/create-room">
                  <Button size="lg">Join Battle</Button>
                </Link>
                <Link to="/create-room">
                  <Button variant="secondary" size="lg">Create Room</Button>
                </Link>
              </div>
              <div className="metric-row">
                {[
                  { value: "10K+", label: "Battles fought" },
                  { value: "50+", label: "Challenges" },
                  { value: "1K+", label: "Developers" },
                ].map((stat) => (
                  <div key={stat.label} className="metric-pill">
                    <span className="metric-value">{stat.value}</span>
                    <span className="metric-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="landing-hero__preview">
            <div className="landing-terminal">
              <div className="landing-terminal__bar">
                <span className="terminal-dot terminal-dot--rose" />
                <span className="terminal-dot terminal-dot--gold" />
                <span className="terminal-dot terminal-dot--green" />
                <span className="landing-terminal__meta">Live match</span>
              </div>
              <div className="landing-terminal__body">
                <div>
                  <p className="label-text">#1 Clan Rush</p>
                  <h2>Two Sum Challenge</h2>
                  <p className="section-subtitle">
                    Given an array of integers, return indices of the two numbers that add up to the target.
                  </p>
                </div>
                <div className="landing-terminal__code">
                  <div>def two_sum(nums, target):</div>
                  <div>&nbsp;&nbsp;seen = {"{}"}</div>
                  <div>&nbsp;&nbsp;for i, n in enumerate(nums):</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;...</div>
                </div>
                <div className="landing-terminal__stats">
                  {[
                    { label: "Timer", value: "08:23" },
                    { label: "Players", value: "12" },
                    { label: "Points", value: "150" },
                  ].map((stat) => (
                    <div key={stat.label} className="landing-terminal__stat">
                      <span className="label-text">{stat.label}</span>
                      <span className="landing-terminal__stat-value">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="landing-features">
          <div className="landing-features__header">
            <p className="label-text">Why Clash of Code</p>
            <h2>Built for competitive coders</h2>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.tag} feature={feature} />
            ))}
          </div>
        </Card>

        <Card className="landing-cta">
          <p className="label-text">Ready to prove yourself?</p>
          <h2>Jump in. Code fast. Win glory.</h2>
          <p className="section-subtitle">
            Your rank is waiting. Start a room, enter a duel, and turn every second into an edge.
          </p>
          <div className="landing-cta__actions">
            <Link to="/register">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="secondary" size="lg">View Leaderboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Home;
