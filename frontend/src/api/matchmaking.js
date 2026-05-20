/**
 * Matchmaking API helper
 *
 * Tries Railway (production) first, then falls back to local on network/timeouts.
 */
import { requestAPI } from "./axios";

/**
 * POST request helper that attempts Railway first, then falls back to local on network errors/timeouts.
 * @param {string} endpoint
 * @param {Object} data
 * @param {Object} config
 * @returns {Promise<any>}
 */
export async function postRequest(endpoint, data, config = {}) {
  // requestAPI will route to local for matchmaking endpoints and handle local failure
  const response = await requestAPI(endpoint, { method: "post", data, config });
  return response.data;
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
