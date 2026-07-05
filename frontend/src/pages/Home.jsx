import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import PixelAvatar from "../components/PixelAvatar";
import "../styles/landing.css";

const MYTH_RANKS = ["Satyr", "Minotaur", "Medusa", "Hercules", "Ares", "Zeus"];

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
    title: "Olympus Leaderboard",
    desc: "Earn points, stack wins, and ascend from Satyr to Zeus on the mythic ranking ladder.",
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
    const { user } = useAuth();
  return (
    <section className="landing-page page-enter">
      {/* Stein World-style hero banner — Greek Olympus reskin */}
      <header className="olympus-hero" role="banner">
        <div className="olympus-hero__sky" aria-hidden="true" />
        <div className="olympus-hero__stars" aria-hidden="true" />
        <div className="olympus-hero__mountains" aria-hidden="true">
          <div className="olympus-hero__mountain olympus-hero__mountain--far" />
          <div className="olympus-hero__mountain olympus-hero__mountain--mid" />
          <div className="olympus-hero__mountain olympus-hero__mountain--near" />
        </div>
        <div className="olympus-hero__temple" aria-hidden="true" />

        <div className="olympus-hero__content">
          <h1 className="olympus-hero__title" aria-label="Clash of Code">
            <span className="olympus-hero__title-line">CLASH OF CODE</span>
          </h1>
          <div className="olympus-hero__sign">
            <span className="olympus-hero__sign-text">OLYMPUS EDITION</span>
          </div>
        </div>

        <div className="olympus-hero__ground">
          <div className="olympus-hero__fence" aria-hidden="true" />
          <div className="olympus-hero__characters">
            {MYTH_RANKS.map((rank) => (
              <div
                key={rank}
                className={`olympus-hero__avatar${rank === "Zeus" ? " olympus-hero__avatar--legend" : ""}`}
              >
                <PixelAvatar rank={rank} scale={rank === "Zeus" ? 3.2 : 2.6} />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Tan "Free to Play" strip — matches reference proportions below banner */}
      {!user && (
        <div className="olympus-cta-strip">
          <div className="olympus-cta-box">
          <p className="olympus-cta-box__label">FREE TO PLAY</p>
          <div className="olympus-cta-box__preview" aria-hidden="true">
            <div className="olympus-cta-box__preview-scene" />
          </div>
          <div className="olympus-cta-box__actions">
            <Link to="/register" className="olympus-cta-box__cta-link">
              <button type="button" className="olympus-cta-box__button">
                ▶ ENTER THE ARENA
              </button>
            </Link>
            <div className="olympus-cta-box__secondary">
              <Link to="/login">Log in</Link>
              <span aria-hidden="true">·</span>
              <Link to="/leaderboard">Leaderboard</Link>
            </div>
          </div>
          </div>
        </div>
      )}

      <div className="page-container landing-page__body">
        <Card className="landing-features">
          <div className="landing-features__header">
            <p className="label-text">Why Clash of Code</p>
            <h2 className="section-title">Built for competitive coders</h2>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.tag} feature={feature} />
            ))}
          </div>
        </Card>

        <Card className="landing-cta">
          <p className="label-text">Ready to prove yourself?</p>
          <h2 className="section-title">Jump in. Code fast. Win glory.</h2>
          <p className="section-subtitle">
            Your rank is waiting. Start a room, enter a duel, and turn every second into an edge.
          </p>
          <div className="landing-cta__actions">
            <Link to="/register">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link to="/create-room">
              <Button variant="secondary" size="lg">Join Battle</Button>
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
