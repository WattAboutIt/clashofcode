import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const guestLinks = [
  { label: "Home", to: "/" },
  { label: "Leaderboard", to: "/leaderboard" },
];

const authLinks = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Create Room", to: "/create-room" },
  { label: "Profile", to: "/profile" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const { token, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navItems = token ? authLinks : guestLinks;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 text-cyan-300">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-lg font-bold text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
            C
          </span>
          <div>
            <p className="font-black text-white">Clash of Code</p>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Neon Arena</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive ? "text-cyan-300" : "text-slate-300 hover:text-cyan-200"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-200"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          {token ? (
            <> 
              <span className="text-sm text-slate-300">{user?.username || "Coder"}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/30 hover:bg-cyan-500/15"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-cyan-200">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/30 hover:bg-cyan-500/15"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-200 md:hidden"
          aria-label="Toggle menu"
        >
          <span className="text-xl">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      <div className={`overflow-hidden border-t border-white/10 bg-slate-950/95 transition-all duration-300 md:hidden ${open ? "max-h-72" : "max-h-0"}`}>
        <div className="space-y-1 px-4 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? "bg-cyan-500/15 text-cyan-200" : "text-slate-300 hover:bg-white/5 hover:text-cyan-200"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
            className="block rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-200"
          >
            Switch to {theme === "dark" ? "Light" : "Dark"}
          </button>
          {token ? (
            <button
              type="button"
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="block rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-left text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="block rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
