import { useEffect, useState } from "react";

function AppShell({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main
      className={`min-h-screen overflow-hidden transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}
    >
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_24%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.45),rgba(15,23,42,0.85))]" />
        <div className="relative">{children}</div>
      </div>
    </main>
  );
}

export default AppShell;
