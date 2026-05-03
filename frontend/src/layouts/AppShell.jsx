function AppShell({ children }) {
  return (
    <main className="app-shell is-mounted">
      <div className="app-shell__backdrop" aria-hidden="true">
        <div className="app-shell__orb app-shell__orb--left" />
        <div className="app-shell__orb app-shell__orb--right" />
        <div className="app-shell__grid" />
      </div>
      <div className="app-shell__content">{children}</div>
    </main>
  );
}

export default AppShell;
