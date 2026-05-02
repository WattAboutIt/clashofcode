import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import AppShell from "./layouts/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateRoom from "./pages/CreateRoom";
import CodingInterface from "./pages/CodingInterface";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
            <Navbar />
            <AppShell>
              <div className="pt-28">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/create-room" element={<CreateRoom />} />
                    <Route path="/battle-room/:roomCode" element={<CodingInterface />} />
                    <Route path="/coding-interface" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                </Routes>
              </div>
            </AppShell>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;