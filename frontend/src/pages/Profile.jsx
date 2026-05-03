import { useEffect, useState } from "react";
import api from "../api/axios";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

function StatBadge({ label, value, accent, loading }) {
  return (
    <Card className="group p-5 text-center transition-all duration-200 hover:-translate-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-black font-mono ${accent}`}>
        {loading ? "—" : value}
      </p>
    </Card>
  );
}

function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/user/profile"), api.get("/user/stats")])
      .then(([profileRes, statsRes]) => {
        setStats({ ...statsRes.data, username: profileRes.data.username, email: profileRes.data.email });
      })
      .catch(() => setError("Unable to load profile. Refresh to retry."))
      .finally(() => setLoading(false));
  }, []);

  const username = user?.username || stats?.username || "—";
  const initials = username.slice(0, 2).toUpperCase();
  const winRate = stats?.winRate ?? 0;

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8 page-enter">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Profile</p>
          <h1 className="text-4xl font-black text-white">Your account</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Account details */}
          <Card className="p-8 space-y-6">
            {/* Avatar row */}
            <div className="flex items-center gap-5">
              <div className="relative h-16 w-16 shrink-0">
                <div className="h-full w-full rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-xl font-black text-slate-950 shadow-lg">
                  {initials}
                </div>
                <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[var(--bg)] bg-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{username}</h2>
                <p className="text-sm text-[var(--text-muted)]">{user?.email || stats?.email || "—"}</p>
              </div>
            </div>

            {/* Info fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Username", value: username },
                { label: "Email", value: user?.email || stats?.email || "—" },
              ].map((field) => (
                <div key={field.label} className="rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.2)] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{field.label}</p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--text)] truncate">{field.value}</p>
                </div>
              ))}
            </div>

            {/* Win rate progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Win rate</p>
                <p className="text-sm font-black text-cyan-300">{loading ? "—" : `${winRate}%`}</p>
              </div>
              <div className="h-2 rounded-full bg-[rgba(0,0,0,0.3)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-700"
                  style={{ width: loading ? "0%" : `${winRate}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Rank card */}
          <Card className="p-8 flex flex-col gap-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Rank Badge</p>
            <div className="flex-1 relative rounded-xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(99,102,241,0.12))", border: "1px solid rgba(34,211,238,0.15)" }}>
              <div className="absolute inset-0 bg-grid opacity-30" />
              <div className="relative flex h-full min-h-[160px] flex-col items-center justify-center p-6 text-center">
                <div className="text-5xl mb-3">
                  {stats?.rank === "Diamond" ? "💎" : stats?.rank === "Gold" ? "🥇" : stats?.rank === "Silver" ? "🥈" : "🏅"}
                </div>
                <p className="text-3xl font-black text-white neon-text">{loading ? "—" : (stats?.rank || "Unranked")}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {loading ? "Loading..." : `${stats?.totalPoints ?? 0} pts collected`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Streak</p>
                <p className="mt-1 text-2xl font-black text-amber-300">{loading ? "—" : stats?.currentStreak ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--surface-border)] bg-[rgba(0,0,0,0.2)] p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Best</p>
                <p className="mt-1 text-2xl font-black text-cyan-300">{loading ? "—" : stats?.bestStreak ?? 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
          <StatBadge label="Total Games" value={stats?.gamesPlayed ?? 0} accent="text-white" loading={loading} />
          <StatBadge label="Wins" value={stats?.wins ?? 0} accent="text-cyan-300" loading={loading} />
          <StatBadge label="Losses" value={stats?.losses ?? 0} accent="text-rose-300" loading={loading} />
          <StatBadge label="Win Rate" value={`${stats?.winRate ?? 0}%`} accent="text-violet-300" loading={loading} />
          <StatBadge label="Best Streak" value={stats?.bestStreak ?? 0} accent="text-amber-300" loading={loading} />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-xs text-rose-300">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

export default Profile;