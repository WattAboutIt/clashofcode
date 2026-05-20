/**
 * Matchmaking API helper
 *
 * Tries Railway (production) first, then falls back to local on network/timeouts.
 */
import { railway, local } from "./axios";

/**
 * POST request helper that attempts Railway first, then falls back to local on network errors/timeouts.
 * @param {string} endpoint
 * @param {Object} data
 * @param {Object} config
 * @returns {Promise<any>}
 */
export async function postRequest(endpoint, data, config = {}) {
  try {
    const res = await railway.post(endpoint, data, config);
    return res.data;
  } catch (error) {
    const isNetworkOrTimeout =
      !error.response ||
      error.code === "ECONNABORTED" ||
      /Network Error/i.test(error.message || "");

    if (isNetworkOrTimeout) {
      console.warn(
        `⚠ Railway failed for ${endpoint}. Falling back to local backend.`,
        error?.message || error
      );

      try {
        const res2 = await local.post(endpoint, data, config);
        return res2.data;
      } catch (err2) {
        console.error("❌ Both Railway and Local backends failed for matchmaking", err2);
        throw err2;
      }
    }

    throw error;
  }
}

/**
 * Send matchmaking 'find' request.
 * @param {Object} data
 * @returns {Promise<any>}
 */
export async function findMatch(data) {
  return postRequest("/match/find", data);
}

export default {
  postRequest,
  findMatch,
};
