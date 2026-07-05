import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

function Register() {
  const { register, token, loading } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate("/dashboard", { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await register(form);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Registration failed. Try a different email."
      );
    }
  };

  return (
    <section className="page-shell auth-page page-enter">
      <div className="auth-wrap">
        <Card className="auth-intro">
          <h1 className="section-title">Create your account</h1>
          <p className="section-subtitle">Start competing in ranked matches with a warm, premium onboarding flow.</p>
        </Card>

        <Card className="auth-card">
          <form onSubmit={handleSubmit}>
            <Input
              label="Username"
              type="text"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder="your_handle"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="hello@coder.com"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Create a strong password"
            />

            {error && <div className="auth-error">{error}</div>}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="section-subtitle">
            Already a coder?{" "}
            <Link to="/login" className="gradient-text">Sign in</Link>
          </p>
        </Card>

        <Card className="auth-trust">
          {["Free to join", "No credit card", "Instant access"].map((item) => (
            <span key={item}>
              <span className="eyebrow__dot" />
              {item}
            </span>
          ))}
        </Card>
      </div>
    </section>
  );
}

export default Register;
