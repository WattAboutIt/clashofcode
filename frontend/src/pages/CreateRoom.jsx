import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

function CreateRoom() {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createRoom = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/rooms/create", {
        host: user?.username,
      });
      setRoomCode(response.data.roomCode || response.data.code);
      navigate(`/battle-room/${response.data.roomCode || response.data.code}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to create room. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (event) => {
    event.preventDefault();
    setError("");
    if (!joinCode.trim()) {
      setError("Enter a valid room code.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/rooms/join", { roomCode: joinCode.trim() });
      navigate(`/battle-room/${response.data.roomCode || response.data.code}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to join room. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/80">Create or join</p>
          <h1 className="text-4xl font-black text-white">Room lobby</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">Build a battlefield for code, invite friends, and prepare the room before the duel begins.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-8">
            <div className="space-y-5">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Create room</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Launch a new match</h2>
              </div>
              <p className="text-sm leading-6 text-slate-300">Generate a fresh multiplayer room and share the code with your team before the countdown starts.</p>
              <Button onClick={createRoom} className="w-full" disabled={loading}>
                {loading ? "Creating…" : "Create Room"}
              </Button>
              {roomCode && (
                <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  Room created: <span className="font-semibold">{roomCode}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-8">
            <div className="space-y-5">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Join room</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Enter a room code</h2>
              </div>
              <form className="space-y-5" onSubmit={joinRoom}>
                <Input
                  label="Room code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="AB12CD"
                />
                <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
                  {loading ? "Joining…" : "Join Room"}
                </Button>
              </form>
              {error && <p className="text-sm text-rose-300">{error}</p>}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default CreateRoom;
