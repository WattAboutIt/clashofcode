/**
 * Matchmaking API helper
 *
 * Tries Railway (production) first, then falls back to local on network/timeouts.
 */
/**
 * Send matchmaking 'find' request.
 * @param {Object} data
 * @returns {Promise<any>}
 */
import { requestAPI } from "./axios";

/**
 * Trigger matchmaking (join queue)
 * @param {{difficulty: string}} payload
 */
export async function findMatch(payload) {
  const res = await requestAPI("/rooms/matchmake", { method: "post", data: payload });
  return res.data;
}

/**
 * Get matchmaking status
 */
export async function getMatchStatus() {
  const res = await requestAPI("/rooms/matchmake/status", { method: "get" });
  return res.data;
}

/**
 * Cancel matchmaking / leave queue
 */
export async function cancelMatchmaking() {
  const res = await requestAPI("/rooms/matchmake/cancel", { method: "post" });
  return res.data;
}

/**
 * Mark player ready in a room
 */
export async function setPlayerReady(roomCode) {
  const res = await requestAPI(`/rooms/${roomCode}/ready`, { method: "post", data: {} });
  return res.data;
}

export default {
  findMatch,
  getMatchStatus,
  cancelMatchmaking,
  setPlayerReady,
};
