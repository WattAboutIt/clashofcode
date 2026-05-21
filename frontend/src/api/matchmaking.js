/**
 * Matchmaking API helper
 *
 * Tries Railway (production) first, then falls back to local on network/timeouts.
 */
import { requestAPI } from "./axios";

/**
 * Trigger matchmaking (join queue)
 * @param {{difficulty: string}} payload
 * @returns {Promise<{status: string, roomCode?: string}>}
 */
export async function findMatch(payload) {
  const res = await requestAPI("/rooms/matchmake", { method: "post", data: payload });
  return res.data;
}

/**
 * Get current matchmaking status
 * @returns {Promise<{status: string, roomCode?: string, players_in_queue?: number}>}
 */
export async function getMatchStatus() {
  const res = await requestAPI("/rooms/matchmake/status", { method: "get" });
  return res.data;
}

/**
 * Request to join a specific room (used after matchmaking finds a match)
 * @param {string} roomCode
 * @returns {Promise<{roomCode: string}>}
 */
export async function requestJoin(roomCode) {
  const res = await requestAPI("/rooms/join", { method: "post", data: { roomCode } });
  return res.data;
}

/**
 * Cancel matchmaking / leave queue
 * @returns {Promise<{status: string}>}
 */
export async function cancelMatchmaking() {
  const res = await requestAPI("/rooms/matchmake/cancel", { method: "post" });
  return res.data;
}

/**
 * Mark the current player as ready in a room via HTTP.
 * If all players are ready the backend will auto-start the battle.
 * @param {string} roomCode
 * @returns {Promise<{status: string, all_ready: boolean, roomCode?: string}>}
 */
export async function setPlayerReady(roomCode) {
  const res = await requestAPI(`/rooms/${roomCode}/ready`, { method: "post" });
  return res.data;
}

export default {
  findMatch,
  getMatchStatus,
  cancelMatchmaking,
  requestJoin,
  setPlayerReady,
};