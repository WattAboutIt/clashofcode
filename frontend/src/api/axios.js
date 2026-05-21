import axios from "axios";

/**
 * ==============================
 * CONFIGURATION
 * ==============================
 */

const RAILWAY_API = "https://clashofcode-production.up.railway.app";
const LOCAL_API = "http://localhost:8000";

// Public base URL for components that build raw URLs
export const API_BASE_URL = RAILWAY_API;

/**
 * Auto-routing logic: choose local for matchmaking-related endpoints, otherwise railway.
 * Matching keywords: match, matchmaking, find, queue
 */
function chooseApiInstance(url) {
    const lower = String(url).toLowerCase();
    // If the app is running locally, prefer the local backend for matchmaking
    // and join/ready flows so dev UX doesn't hit the deployed Railway server first.
    const isLocalHost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (lower.includes("/ready") || lower.includes("/matchmake") || lower.includes("matchmake") || lower.includes("matchmaking") || lower.includes("find") || lower.includes("queue")) {
        return isLocalHost ? localAPI : railwayAPI;
    }

    // Explicitly route the simple join endpoint to local in dev (the deployed
    // Railway backend may return unexpected 400s during development).
    if (lower.includes("/rooms/join")) {
        return isLocalHost ? localAPI : railwayAPI;
    }

    // Room-specific routes (e.g. /rooms/:roomCode/...) are room CRUD and must go to Railway
    try {
        const path = lower.split("?")[0];
        const roomPathMatch = path.match(/^\/rooms\/[^\/]+\//);
        if (roomPathMatch) return railwayAPI;
    } catch {}

    return railwayAPI;
}

/**
 * Central request handler. `options` may contain { method, data, config }.
 */
export async function requestAPI(url, options = {}) {
    const method = (options.method || "get").toLowerCase();
    const data = options.data;
    const config = options.config || {};
    const forceLocal = options.forceLocal || false;
    const forceRailway = options.forceRailway || false;

    let instance = chooseApiInstance(url);
    if (forceLocal) instance = localAPI;
    if (forceRailway) instance = railwayAPI;

    if (instance === localAPI) {
        console.log("LOCAL BACKEND → matchmaking request");
    } else {
        console.log("RAILWAY BACKEND → database request");
    }

    // Ensure Authorization header is present on the axios instance if token exists in localStorage.
    try {
        const stored = localStorage.getItem("clashofcode_token");
        const header = stored && stored !== "undefined" ? `Bearer ${stored}` : null;
        if (header && !instance.defaults.headers.common.Authorization) {
            instance.defaults.headers.common.Authorization = header;
        }
    } catch (e) {
        // ignore (e.g., non-browser env)
    }

    try {
        if (method === "get") {
            return await instance.get(url, { params: data, ...config });
        }
        // for post/put/patch/delete, axios expects (url, data, config)
        return await instance[method](url, data, config);
    } catch (err) {
        const isLocal = instance === localAPI;
        // If the primary (Railway) failed and this was not explicitly a local request, try local fallback.
        if (!isLocal) {
            console.warn(`⚠ Primary backend failed for ${url}, attempting local fallback`, err?.message || err);
            try {
                if (method === "get") {
                    return await localAPI.get(url, { params: data, ...config });
                }
                return await localAPI[method](url, data, config);
            } catch (localErr) {
                console.error(`❌ Both Railway and Local backend failed for ${url}`, localErr?.message || localErr);
                const customErr = new Error("Matchmaking service unavailable (both Railway and local failed)");
                customErr.response = { data: { detail: "Matchmaking service unavailable (both Railway and local failed)" } };
                throw customErr;
            }
        }

        // If we were already trying local, give a friendly matchmaking-specific error
        console.warn(`⚠ Local backend failed for ${url}`, err?.message || err);
        const customErr = new Error("Matchmaking service unavailable (local server not running)");
        customErr.response = { data: { detail: "Matchmaking service unavailable (local server not running)" } };
        throw customErr;
    }
}

/**
 * ==============================
 * AXIOS INSTANCES
 * ==============================
 */
const railwayAPI = axios.create({
    baseURL: RAILWAY_API,
    timeout: 5000,
});

const localAPI = axios.create({
    baseURL: LOCAL_API,
    timeout: 5000,
});

// Attach auth token from localStorage to both instances and provide matchmaking-specific error mapping
function attachAuthInterceptors(instance, isLocal = false) {
    instance.interceptors.request.use(
        (config) => {
            try {
                const stored = localStorage.getItem("clashofcode_token");
                if (stored && stored !== "undefined") {
                    config.headers = config.headers || {};
                    config.headers.Authorization = `Bearer ${stored}`;
                }
            } catch (e) {
                // ignore
            }
            return config;
        },
        (err) => Promise.reject(err)
    );

    instance.interceptors.response.use(
        (res) => res,
        (err) => {
            if (isLocal) {
                // Map local backend failures to a friendly matchmaking error
                const status = err?.response?.status;
                if (!err.response || status === 401 || status >= 500) {
                    const customErr = new Error("Matchmaking service unavailable");
                    customErr.response = { data: { detail: "Matchmaking service unavailable" } };
                    return Promise.reject(customErr);
                }
            }
            return Promise.reject(err);
        }
    );
}

attachAuthInterceptors(railwayAPI, false);
attachAuthInterceptors(localAPI, true);

/**
 * Keep the old smart fallback util for code that used it directly.
 */
export const apiRequest = async (config) => {
    try {
        const response = await railwayAPI(config);
        return response.data;
    } catch (error) {
        console.warn("⚠ Railway failed. Switching to local backend...");

        const shouldFallback = !error.response || error.response.status === 404 || error.response.status >= 500;
        if (shouldFallback) {
            try {
                const response = await localAPI(config);
                return response.data;
            } catch (localError) {
                console.error("❌ Both Railway and Local backend failed");
                throw localError;
            }
        }
        throw error;
    }
};

export const railway = railwayAPI;
export const local = localAPI;

/**
 * Set or remove Authorization header on both API instances.
 * @param {string|null} token
 */
export function setAuthToken(token) {
    if (token) {
        const header = `Bearer ${token}`;
        railwayAPI.defaults.headers.common.Authorization = header;
        localAPI.defaults.headers.common.Authorization = header;
    } else {
        delete railwayAPI.defaults.headers.common.Authorization;
        delete localAPI.defaults.headers.common.Authorization;
    }
}

/**
 * Backwards-compatible default API object that routes requests automatically.
 * It exposes `get`, `post`, `put`, `delete`, and `defaults` so existing code continues to work.
 */
const api = {
    defaults: railwayAPI.defaults,
    get: (url, config = {}) => requestAPI(url, { method: "get", data: config.params, config }),
    post: (url, data, config = {}) => requestAPI(url, { method: "post", data, config }),
    put: (url, data, config = {}) => requestAPI(url, { method: "put", data, config }),
    patch: (url, data, config = {}) => requestAPI(url, { method: "patch", data, config }),
    delete: (url, data, config = {}) => requestAPI(url, { method: "delete", data, config }),
};

export default api;