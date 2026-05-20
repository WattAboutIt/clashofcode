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
 * ==============================
 * AXIOS INSTANCES
 * ==============================
 */

const railwayAPI = axios.create({
    baseURL: RAILWAY_API,
    timeout: 5000
});

const localAPI = axios.create({
    baseURL: LOCAL_API,
    timeout: 5000
});

/**
 * ==============================
 * SMART API REQUEST (FALLBACK SYSTEM)
 * ==============================
 */

export const apiRequest = async (config) => {
    try {
        // 1️⃣ Try Railway (Production Backend)
        const response = await railwayAPI(config);
        return response.data;

    } catch (error) {

        console.warn("⚠ Railway failed. Switching to local backend...");

        // 2️⃣ Fallback only on useful failures
        const shouldFallback =
            !error.response || 
            error.response.status === 404 ||
            error.response.status >= 500;

        if (shouldFallback) {
            try {
                const response = await localAPI(config);
                return response.data;
            } catch (localError) {
                console.error("❌ Both Railway and Local backend failed");
                throw localError;
            }
        }

        // If it's a valid API error (like 400), don't fallback
        throw error;
    }
};

/**
 * ==============================
 * OPTIONAL: DIRECT EXPORTS
 * ==============================
 */

export const railway = railwayAPI;
export const local = localAPI;

// Backwards-compatible default export used across the app
const api = railwayAPI;
export default api;