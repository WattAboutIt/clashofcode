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
  const res = await requestAPI("/rooms/matchmake", { method: "post", data: payload, forceLocal: true });
  return res.data;
}

/**
 * Get matchmaking status
 */
export async function getMatchStatus() {
  const res = await requestAPI("/rooms/matchmake/status", { method: "get", forceLocal: true });
  return res.data;
}

/**
 * Request to join a specific room (used after matchmaking finds a match)
 * @param {string} roomCode
 */
export async function requestJoin(roomCode) {
  const res = await requestAPI("/rooms/join", { method: "post", data: { roomCode } });
  return res.data;
}

/**
 * Cancel matchmaking / leave queue
 */
export async function cancelMatchmaking() {
  const res = await requestAPI("/rooms/matchmake/cancel", { method: "post", forceLocal: true });
  return res.data;
}

/**
 * Mark player ready in a room
 */
export async function setPlayerReady(roomCode) {
  // Deprecated: ready should be sent via WebSocket. Throw to prevent accidental HTTP calls.
  throw new Error("Deprecated: use WebSocket PLAYER_READY instead of HTTP /ready");
}

export default {
  findMatch,
  getMatchStatus,
  cancelMatchmaking,
  requestJoin,
};
