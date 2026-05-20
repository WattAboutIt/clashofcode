import { useState } from "react";
import { useNavigate } from "react-router-dom";
import matchmaking from "../api/matchmaking";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

const DIFFICULTIES = ["easy", "medium", "hard"];

function FindMatch() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("easy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFind = async () => {
    setError("");
    setLoading(true);
    try {
      await matchmaking.findMatch({ difficulty });
      // navigate to the centralized matchmaking lobby which polls status
      navigate(`/matchmaking?difficulty=${encodeURIComponent(difficulty)}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to join matchmaking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-shell page-enter">
      <div className="page-container">
        <Card className="panel-grid">
          <div>
            <p className="label-text">Find a Match</p>
            <h1 className="section-title">Quick Matchmaking</h1>
            <p className="section-subtitle">Select difficulty and find a real-time opponent.</p>

            <div style={{ marginTop: 16 }}>
              <label className="ui-field-label">Difficulty</label>
              <div style={{ display: "flex", gap: 8 }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`ui-button ${difficulty === d ? "ui-button--primary" : ""}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d[0].toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <Button onClick={onFind} disabled={loading}>
                {loading ? "Searching..." : "Find Match"}
              </Button>
              {error && <div style={{ marginTop: 8, color: "var(--danger)" }}>{error}</div>}
            </div>
          </div>

          <div>
            <p className="label-text">Queue Status</p>
            <h2>Search Tips</h2>
            <p className="section-subtitle">Matches are prioritized by difficulty and player skill.</p>
            <ul style={{ marginTop: 12 }}>
              <li>Try different difficulty to shorten wait time.</li>
              <li>Invite friends using room invites.</li>
            </ul>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default FindMatch;

