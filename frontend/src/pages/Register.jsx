import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { register, token, loading } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
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
    <section className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 py-20 sm:px-6">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/80">Join the arena</p>
          <h1 className="text-4xl font-black text-white">Create your account</h1>
          <p className="text-sm leading-6 text-slate-300">Start competing in ranked matches and earn your place on the leaderboard.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input
            label="Username"
            type="text"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder="Your handle"
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
            placeholder="Create a secure password"
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Register"}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-300 hover:text-cyan-100">
            Login
          </Link>
        </p>
      </Card>
    </section>
  );
}

export default Register