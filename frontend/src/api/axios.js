import axios from "axios";

const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const isBrowser = typeof window !== "undefined";
const isLocalRuntime = isBrowser && localHosts.has(window.location.hostname);
const forceRemoteApi = String(import.meta.env.VITE_USE_REMOTE_API || "").toLowerCase() === "true";

const rawApiBaseUrl =
  (import.meta.env.DEV && isLocalRuntime && !forceRemoteApi
    ? "http://localhost:8000"
    : null) ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalRuntime ? "http://localhost:8000" : "");

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("clashofcode_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
