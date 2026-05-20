import { io } from "socket.io-client";

const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const isBrowser = typeof window !== "undefined";
const isLocalRuntime = isBrowser && localHosts.has(window.location.hostname);
const forceRemoteApi = String(import.meta.env.VITE_USE_REMOTE_API || "").toLowerCase() === "true";

const defaultSocketUrl =
  (import.meta.env.DEV && isLocalRuntime && !forceRemoteApi
    ? "http://localhost:8000"
    : null) ||
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalRuntime
    ? "http://localhost:8000"
    : "");

const socket = io(defaultSocketUrl, {
  autoConnect: false,
  transports: ["websocket"],
});

export default socket;
