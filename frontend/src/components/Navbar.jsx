import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "../styles/navbar.css";

const guestLinks = [
  { label: "Home", to: "/" },
  { label: "Leaderboard", to: "/leaderboard" },
];

const authLinks = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Create Room", to: "/create-room" },
  { label: "Profile", to: "/profile" },
];

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { token, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const dropdownRef = useRef(null);
  const navItems = token ? authLinks : guestLinks;
  const initials = useMemo(() => (user?.username || "C").slice(0, 1).toUpperCase(), [user]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen]);

  const dropdownItems = [
    {
      label: "Profile",
      to: "/profile",
      icon: (
        <Icon>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        </Icon>
      ),
    },
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: (
        <Icon>
          <path d="M3 13h8V3H3z" />
          <path d="M13 21h8v-6h-8z" />
          <path d="M13 11h8V3h-8z" />
          <path d="M3 21h8v-4H3z" />
        </Icon>
      ),
    },
    {
      label: "Battle History",
      to: "/dashboard#match-history",
      icon: (
        <Icon>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </Icon>
      ),
    },
    {
      label: "Settings",
      to: "/profile#settings",
      icon: (
        <Icon>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.6 1.6 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.6 1.6 0 0 0 15 19.4a1.6 1.6 0 0 0-1 .6 1.6 1.6 0 0 0-.4 1V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-.4-1 1.6 1.6 0 0 0-1-.6 1.6 1.6 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-.6-1 1.6 1.6 0 0 0-1-.4H3a2 2 0 1 1 0-4h.09a1.6 1.6 0 0 0 1-.4 1.6 1.6 0 0 0 .6-1 1.6 1.6 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9 4.6c.38 0 .74-.14 1-.4.26-.26.4-.62.4-1V3a2 2 0 1 1 4 0v.09c0 .38.14.74.4 1 .26.26.62.4 1 .4a1.6 1.6 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.33 1.82c.09.36.3.68.6 1 .26.26.62.4 1 .4H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1 .4c-.3.32-.51.64-.6 1Z" />
        </Icon>
      ),
    },
  ];

  return (
    <header className="navbar">
      <div className="navbar__wrap">
        <div className="navbar__surface">
          <Link to="/" className="navbar__brand" onClick={() => setOpen(false)}>
            <span className="navbar__brand-mark" aria-hidden="true">C</span>
            <div className="navbar__brand-copy">
              <p className="navbar__brand-title">Clash of Code</p>
              <span className="navbar__brand-subtitle">Premium Arena</span>
            </div>
          </Link>

          <nav className="navbar__nav" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `navbar__link ${isActive ? "navbar__link--active" : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="navbar__actions">
            {token ? (
              <div className="navbar__profile" ref={dropdownRef}>
                <button
                  type="button"
                  className="navbar__avatar"
                  aria-expanded={dropdownOpen}
                  aria-label="Open profile menu"
                  onClick={() => setDropdownOpen((current) => !current)}
                >
                  {initials}
                  <span className="navbar__avatar-dot" />
                </button>
                {dropdownOpen && (
                  <div className="navbar__dropdown">
                    <div className="navbar__dropdown-header">
                      <span className="navbar__dropdown-avatar">{initials}</span>
                      <div>
                        <p className="navbar__dropdown-name">{user?.username || "Coder"}</p>
                        <p className="navbar__dropdown-meta">Online and ready to battle</p>
                      </div>
                    </div>
                    <div className="navbar__menu">
                      {dropdownItems.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          className="navbar__menu-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      ))}
                      <button
                        type="button"
                        className="navbar__menu-item"
                        onClick={() => {
                          toggleTheme();
                          setDropdownOpen(false);
                        }}
                      >
                        <Icon>
                          <path d="M12 3v1" />
                          <path d="M12 20v1" />
                          <path d="M3 12h1" />
                          <path d="M20 12h1" />
                          <path d="m18.36 5.64-.7.7" />
                          <path d="m6.34 17.66-.7.7" />
                          <path d="m5.64 5.64.7.7" />
                          <path d="m17.66 17.66.7.7" />
                          <circle cx="12" cy="12" r="4" />
                        </Icon>
                        <span>Theme Toggle</span>
                        <span>{theme === "warm" ? "Warm" : "Light"}</span>
                      </button>
                      <div className="navbar__menu-divider" />
                      <button
                        type="button"
                        className="navbar__menu-item"
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                        }}
                      >
                        <Icon>
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <path d="m16 17 5-5-5-5" />
                          <path d="M21 12H9" />
                        </Icon>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="navbar__guest-links">
                <Link to="/login" className="navbar__ghost-link">Login</Link>
                <Link to="/register" className="ui-button ui-button--primary ui-button--sm">Get Started</Link>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="navbar__mobile-toggle"
            aria-label="Toggle menu"
          >
            {open ? "X" : "="}
          </button>
        </div>

        {open && (
          <div className="navbar__mobile-panel">
            {token && (
              <div className="navbar__mobile-profile">
                <button type="button" className="navbar__avatar">
                  {initials}
                  <span className="navbar__avatar-dot" />
                </button>
                <div>
                  <p className="navbar__dropdown-name">{user?.username || "Coder"}</p>
                  <p className="navbar__dropdown-meta">Signed in</p>
                </div>
              </div>
            )}
            <div className="navbar__mobile-stack">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`}
                >
                  <span>{item.label}</span>
                  <span>+</span>
                </NavLink>
              ))}
            </div>
            <div className="navbar__mobile-divider" />
            <div className="navbar__mobile-actions">
              <button
                type="button"
                className="navbar__mobile-action"
                onClick={() => {
                  toggleTheme();
                  setOpen(false);
                }}
              >
                <span>Theme Toggle</span>
                <span>{theme === "warm" ? "Warm" : "Light"}</span>
              </button>
              {token ? (
                <>
                  <Link to="/dashboard#match-history" className="navbar__mobile-action" onClick={() => setOpen(false)}>
                    <span>Battle History</span>
                    <span>+</span>
                  </Link>
                  <Link to="/profile#settings" className="navbar__mobile-action" onClick={() => setOpen(false)}>
                    <span>Settings</span>
                    <span>+</span>
                  </Link>
                  <button
                    type="button"
                    className="navbar__mobile-action"
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                  >
                    <span>Logout</span>
                    <span>+</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="navbar__mobile-action" onClick={() => setOpen(false)}>
                    <span>Login</span>
                    <span>+</span>
                  </Link>
                  <Link to="/register" className="navbar__mobile-action" onClick={() => setOpen(false)}>
                    <span>Register</span>
                    <span>+</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
