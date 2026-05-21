import axios from "axios";

/**
 * ==============================
 * CONFIGURATION
 * ==============================
 */

const RAILWAY_API = "https://clashofcode-production.up.railway.app";
const LOCAL_API = "http://localhost:8000";

export const API_BASE_URL = RAILWAY_API;

/**
 * ==============================
 * AXIOS INSTANCES (declared first)
 * ==============================
 */
const railwayAPI = axios.create({
    baseURL: RAILWAY_API,
    timeout: 8000,
});

const localAPI = axios.create({
    baseURL: LOCAL_API,
    timeout: 5000,
});

// Attach auth token from localStorage to both instances
function attachAuthInterceptors(instance) {
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
        (err) => Promise.reject(err)
    );
}

attachAuthInterceptors(railwayAPI);
attachAuthInterceptors(localAPI);

/**
 * ==============================
 * HELPERS
 * ==============================
 */

function chooseApiInstance() {
    return railwayAPI;
}

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
 * Central request handler.
 */
export async function requestAPI(url, options = {}) {
    const method = (options.method || "get").toLowerCase();
    const data = options.data;
    const config = options.config || {};

    const instance = chooseApiInstance();

    // Ensure Authorization header is set if token exists in localStorage.
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
        return await instance[method](url, data, config);
    } catch (err) {
        const httpStatus = err?.response?.status;
        const detail = err?.response?.data?.detail || err?.message || "Request failed";
        console.error(`❌ Railway request failed for ${url} [${httpStatus ?? "network"}]:`, detail);
        throw err;
    }
}

/**
 * Backwards-compatible apiRequest util.
 */
export const apiRequest = async (config) => {
    try {
        const response = await railwayAPI(config);
        return response.data;
    } catch (error) {
        console.warn("⚠ Railway request failed:", error?.response?.data?.detail || error?.message);
        throw error;
    }
};

export const railway = railwayAPI;
export const local = localAPI;

/**
 * Backwards-compatible default API object.
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