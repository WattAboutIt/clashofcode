import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { login, token, loading } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(form);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Login failed. Check your credentials."
      );
    }
  };

  return (
    <section className="relative flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-16 sm:px-6 page-enter">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/4 blur-[150px]" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Logo / Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 pulse-dot" />
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Clash of Code</span>
          </div>
          <h1 className="text-3xl font-black text-white">Welcome back</h1>
          <p className="text-sm text-[var(--text-secondary)]">Access your battle rooms and live duels</p>
        </div>

        <Card className="p-8 space-y-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Username or Email"
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="your@email.com"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--surface-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-muted)]">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-[var(--text-secondary)]">
            New to Clash of Code?{" "}
            <Link to="/register" className="font-semibold text-cyan-300 hover:text-cyan-100 transition-colors">
              Create an account →
            </Link>
          </p>
        </Card>
      </div>
    </section>
  );
}

export default Login;