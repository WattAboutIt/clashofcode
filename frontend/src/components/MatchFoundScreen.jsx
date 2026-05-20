import { useEffect } from "react";

function MatchFoundScreen({ roomCode, opponentName, onComplete }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete(), 2200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 24 }}>
      <h1 style={{ fontSize: 48, color: "var(--accent)", textShadow: "0 8px 32px rgba(255,122,89,0.18)" }}>MATCH FOUND!</h1>
      <div style={{ fontSize: 18 }}>Room: <strong>{roomCode}</strong></div>
      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>{opponentName?.slice(0,2).toUpperCase()}</div>
          <div>{opponentName || "Opponent"} joined</div>
        </div>
      </div>
    </div>
  );
}

export default MatchFoundScreen;

