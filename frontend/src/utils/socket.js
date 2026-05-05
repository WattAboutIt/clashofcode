import { io } from "socket.io-client";

const defaultSocketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://clashofcode-production.up.railway.app");

const socket = io(defaultSocketUrl, {
  autoConnect: false,
  transports: ["websocket"],
});

export default socket;
