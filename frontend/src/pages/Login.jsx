import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

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
    <section className="page-shell auth-page page-enter">
      <div className="auth-wrap">
        <Card className="auth-intro">
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            Clash of Code
          </span>
          <h1 className="section-title">Welcome back</h1>
          <p className="section-subtitle">Access your battle rooms and live duels from a calmer, sharper workspace.</p>
        </Card>

        <Card className="auth-card">
          <form onSubmit={handleSubmit}>
            <Input
              label="Username or Email"
              type="text"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder="your@email.com"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="••••••••"
            />

            {error && <div className="auth-error">{error}</div>}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="section-subtitle">
            New to Clash of Code?{" "}
            <Link to="/register" className="gradient-text">Create an account</Link>
          </p>
        </Card>
      </div>
    </section>
  );
}

export default Login;
