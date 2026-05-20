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
    // Room-specific routes (e.g. /rooms/:roomCode/...) are room CRUD and must go to Railway
    try {
        const path = lower.split("?")[0];
        const roomPathMatch = path.match(/^\/rooms\/[^\/]+\//);
        if (roomPathMatch) return railwayAPI;
    } catch {}

    // Matchmaking and queue related endpoints should go to local
    if (lower.includes("/rooms/matchmake") || lower.includes("matchmake") || lower.includes("matchmaking") || lower.includes("find") || lower.includes("queue")) {
        return localAPI;
    }

    return railwayAPI;
}

/**
 * Central request handler. `options` may contain { method, data, config }.
 */
export async function requestAPI(url, options = {}) {
    const method = (options.method || "get").toLowerCase();
    const data = options.data;
    const config = options.config || {};

    const instance = chooseApiInstance(url);

    if (instance === localAPI) {
        console.log("LOCAL BACKEND → matchmaking request");
    } else {
        console.log("RAILWAY BACKEND → database request");
    }

    try {
        if (method === "get") {
            return await instance.get(url, { params: data, ...config });
        }
        // for post/put/patch/delete, axios expects (url, data, config)
        return await instance[method](url, data, config);
    } catch (err) {
        // If routing to local and it fails, give a helpful matchmaking-specific error
        const isLocal = instance === localAPI;
        if (isLocal) {
            console.warn(`⚠ Local backend failed for ${url}`, err?.message || err);
            const customErr = new Error("Matchmaking service unavailable (local server not running)");
            customErr.response = { data: { detail: "Matchmaking service unavailable (local server not running)" } };
            throw customErr;
        }
        throw err;
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