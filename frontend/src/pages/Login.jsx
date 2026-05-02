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
    if (token) {
      navigate("/dashboard", { replace: true });
    }
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
    <section className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 py-20 sm:px-6">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/80">Welcome back</p>
          <h1 className="text-4xl font-black text-white">Login to Clash of Code</h1>
          <p className="text-sm leading-6 text-slate-300">Access your battle rooms, view your rank, and jump into live duels.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input
            label="Username or Email"
            type="text"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder="Username or email"
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Enter your password"
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400">
          New to Clash of Code?{' '}
          <Link to="/register" className="text-cyan-300 hover:text-cyan-100">
            Create an account
          </Link>
        </p>
      </Card>
    </section>
  );
}

export default Login