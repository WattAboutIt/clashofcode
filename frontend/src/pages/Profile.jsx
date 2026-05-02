import { useEffect, useState } from "react";
import api from "../api/axios";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get("/user/profile"),
          api.get("/user/stats"),
        ]);
        setStats({
          ...statsRes.data,
          username: profileRes.data.username,
          email: profileRes.data.email,
        });
      } catch (err) {
        setError("Unable to load profile. Refresh to retry.");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/80">Profile</p>
          <h1 className="text-4xl font-black text-white">Your account</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">Manage your stats and keep an eye on wins, losses, and your competitive rank.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Account</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Basic details</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-sm text-slate-400">Username</p>
                  <p className="mt-2 text-lg font-semibold text-white">{user?.username || stats?.username || "N/A"}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="mt-2 text-lg font-semibold text-white">{user?.email || stats?.email || "N/A"}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Rank badge</p>
              <div className="rounded-[2rem] border border-white/10 bg-cyan-500/10 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.32em] text-cyan-200/80">Current status</p>
                <p className="mt-4 text-3xl font-black text-white">{stats?.rank || "Unranked"}</p>
                <p className="mt-2 text-sm text-slate-300">Keep winning to climb the arena ladder.</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Total games</p>
            <p className="mt-4 text-4xl font-black text-white">{loading ? "..." : stats?.gamesPlayed ?? 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Wins</p>
            <p className="mt-4 text-4xl font-black text-cyan-300">{loading ? "..." : stats?.wins ?? 0}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Losses</p>
            <p className="mt-4 text-4xl font-black text-slate-300">{loading ? "..." : stats?.losses ?? 0}</p>
          </Card>
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </section>
  );
}

export default Profile;
