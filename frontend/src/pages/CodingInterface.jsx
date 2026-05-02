/**
 * CodingInterface.jsx
 *
 * Route: /battle-room/:roomCode
 *
 * This component is STRICTLY room-based. It will never render without a valid
 * roomCode — if one is missing it redirects to /dashboard immediately.
 *
 * Room session state shape:
 *   { roomCode, code, output }
 *
 * WebSocket events stubbed (NOT implemented yet):
 *   join_room | leave_room | code_update | game_start
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CODE = `# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

from collections import deque
from typing import Optional, List

class Solution:
    def zigzagLevelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        `;

const TEST_CASES = {
  1: "[3,9,20,null,null,15,7]",
  2: "[1]",
  3: "[1,2,3,4,5,6,7]",
};

// ─── WebSocket Stub ───────────────────────────────────────────────────────────
// Replace this object with a real WebSocket / Socket.io client later.
// All methods are intentional no-ops until the backend is ready.

const wsStub = {
  /** Emit when the user enters the room page. */
  joinRoom: (roomCode) => {
    console.log(`[WS stub] join_room  → roomCode: ${roomCode}`);
    // TODO: socket.emit("join_room", { roomCode });
  },

  /** Emit on unmount / user leaves. */
  leaveRoom: (roomCode) => {
    console.log(`[WS stub] leave_room → roomCode: ${roomCode}`);
    // TODO: socket.emit("leave_room", { roomCode });
  },

  /** Broadcast code changes to other players in the same room. */
  codeUpdate: (roomCode, code) => {
    console.log(`[WS stub] code_update → roomCode: ${roomCode}, chars: ${code.length}`);
    // TODO: socket.emit("code_update", { roomCode, code });
  },

  /** Signal that the game has started (host only). */
  gameStart: (roomCode) => {
    console.log(`[WS stub] game_start → roomCode: ${roomCode}`);
    // TODO: socket.emit("game_start", { roomCode });
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

  .lc-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .lc-root {
    font-family: 'Inter', sans-serif;
    background: #1a1a1a;
    color: #eff1f6;
    height: 100vh;
    display: flex;
    flex-direction: column;
    font-size: 13px;
    overflow: hidden;
  }

  /* Topbar */
  .lc-topbar {
    background: #282828;
    border-bottom: 1px solid #3e3e3e;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 44px;
    flex-shrink: 0;
  }
  .lc-topbar-left  { display: flex; align-items: center; gap: 12px; }
  .lc-topbar-right { display: flex; align-items: center; gap: 8px; }
  .lc-logo { color: #ffa116; font-weight: 700; font-size: 18px; letter-spacing: -0.5px; }
  .lc-problem-title { color: #eff1f6; font-weight: 600; font-size: 14px; }
  .lc-sep { color: #3e3e3e; }

  /* Room pill */
  .lc-room-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,161,22,0.08);
    border: 1px solid rgba(255,161,22,0.25);
    border-radius: 20px;
    padding: 3px 12px 3px 8px;
    font-size: 12px;
    font-weight: 600;
    color: #ffa116;
    letter-spacing: 0.03em;
  }
  .lc-room-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #2cbb5d;
    animation: lc-pulse 2s ease-in-out infinite;
  }
  @keyframes lc-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }

  /* Badges */
  .lc-badge-easy {
    background: rgba(44,187,93,0.1);
    border: 1px solid rgba(44,187,93,0.25);
    color: #2cbb5d;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }

  /* Buttons */
  .lc-btn {
    padding: 5px 16px;
    border-radius: 5px;
    border: none;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .lc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .lc-btn-ghost  { background: #3e3e3e; color: #eff1f6; }
  .lc-btn-ghost:hover:not(:disabled)   { background: #4e4e4e; }
  .lc-btn-primary { background: #2cbb5d; color: #fff; }
  .lc-btn-primary:hover:not(:disabled) { background: #29a854; }
  .lc-btn-run     { background: #3e3e3e; color: #ffa116; border: 1px solid rgba(255,161,22,0.25); }
  .lc-btn-run:hover:not(:disabled)     { background: #4e4e4e; }
  .lc-btn-leave   { background: rgba(239,70,70,0.12); color: #ef4646; border: 1px solid rgba(239,70,70,0.25); }
  .lc-btn-leave:hover { background: rgba(239,70,70,0.2); }

  /* Layout */
  .lc-main { display: flex; flex: 1; overflow: hidden; }

  /* Left panel */
  .lc-left {
    width: 42%;
    background: #282828;
    border-right: 1px solid #3e3e3e;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }
  .lc-panel-tabs {
    display: flex;
    border-bottom: 1px solid #3e3e3e;
    background: #1a1a1a;
    padding: 0 12px;
    flex-shrink: 0;
  }
  .lc-panel-tab {
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #8a8a8a;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
  }
  .lc-panel-tab.active { color: #eff1f6; border-bottom-color: #ffa116; }

  .lc-problem-content {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
    line-height: 1.7;
  }
  .lc-problem-content h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #eff1f6; }
  .lc-problem-content p  { color: #cfd3de; margin-bottom: 14px; font-size: 13.5px; }
  .lc-code-inline {
    background: #1a1a1a;
    padding: 1px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    color: #e5c07b;
  }
  .lc-example-box {
    background: #1a1a1a;
    border: 1px solid #3e3e3e;
    border-radius: 8px;
    padding: 14px 16px;
    margin: 14px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
  }
  .lc-io-label {
    font-size: 11px;
    color: #8a8a8a;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 6px;
    font-family: 'Inter', sans-serif;
  }
  .lc-io-value    { color: #eff1f6; }
  .lc-section-title { font-size: 14px; font-weight: 700; color: #eff1f6; margin: 20px 0 10px; }
  .lc-constraints   { list-style: disc; padding-left: 20px; color: #cfd3de; font-size: 13px; }
  .lc-constraints li { margin-bottom: 6px; }
  .lc-hint {
    background: #1a1a1a;
    border: 1px solid #3e3e3e;
    border-radius: 8px;
    padding: 12px 14px;
    color: #8a8a8a;
    font-size: 13px;
    cursor: pointer;
  }
  .lc-hint-text { color: #cfd3de; margin-top: 6px; }

  /* Right panel */
  .lc-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #1e1e1e; }
  .lc-editor-topbar {
    background: #282828;
    border-bottom: 1px solid #3e3e3e;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 40px;
    flex-shrink: 0;
  }
  .lc-lang-select {
    background: #1a1a1a;
    border: 1px solid #3e3e3e;
    color: #eff1f6;
    padding: 4px 10px;
    border-radius: 5px;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    outline: none;
    cursor: pointer;
  }
  .lc-editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .lc-code-wrap   { flex: 1; display: flex; overflow: hidden; }
  .lc-line-nums {
    padding: 16px 12px 16px 8px;
    background: #1e1e1e;
    text-align: right;
    color: #4a4a4a;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
    user-select: none;
    min-width: 44px;
    border-right: 1px solid #2a2a2a;
    overflow: hidden;
  }
  .lc-textarea {
    flex: 1;
    background: #1e1e1e;
    color: #abb2bf;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
    padding: 16px;
    border: none;
    outline: none;
    resize: none;
    tab-size: 4;
    overflow-y: auto;
  }

  /* Bottom panel */
  .lc-bottom { border-top: 1px solid #3e3e3e; background: #282828; flex-shrink: 0; }
  .lc-bottom-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #3e3e3e;
    padding: 0 16px;
    height: 38px;
  }
  .lc-bottom-tabs-left { display: flex; }
  .lc-bottom-tab {
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #8a8a8a;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s;
  }
  .lc-bottom-tab.active { color: #eff1f6; border-bottom-color: #ffa116; }
  .lc-bottom-actions    { display: flex; gap: 8px; }

  .lc-testcase-area { padding: 12px 16px; }
  .lc-case-tabs     { display: flex; gap: 8px; margin-bottom: 12px; }
  .lc-case-tab {
    padding: 3px 12px;
    border-radius: 4px;
    border: 1px solid #3e3e3e;
    background: transparent;
    color: #8a8a8a;
    font-size: 12px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.15s;
  }
  .lc-case-tab.active { background: #1a1a1a; color: #eff1f6; border-color: #5a5a5a; }
  .lc-io-box {
    background: #1a1a1a;
    border: 1px solid #3e3e3e;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    color: #eff1f6;
    margin-bottom: 10px;
  }
  .lc-result-badge   { padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-right: 8px; }
  .lc-badge-accepted { background: rgba(44,187,93,0.1); color: #2cbb5d; border: 1px solid rgba(44,187,93,0.2); }
  .lc-badge-wrong    { background: rgba(239,70,70,0.1); color: #ef4646; border: 1px solid rgba(239,70,70,0.2); }

  .lc-root ::-webkit-scrollbar       { width: 6px; }
  .lc-root ::-webkit-scrollbar-track { background: transparent; }
  .lc-root ::-webkit-scrollbar-thumb { background: #3e3e3e; border-radius: 3px; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CodingInterface() {
  const { roomCode } = useParams();
  const navigate     = useNavigate();

  // ── Guard: must have a roomCode ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) navigate("/dashboard", { replace: true });
  }, [roomCode, navigate]);

  // ── Room session state ──────────────────────────────────────────────────────
  // Shape: { roomCode, code, output }
  // Future: this object will be hydrated from / synced to the WebSocket server.
  const [roomSession, setRoomSession] = useState({
    roomCode: roomCode ?? null,
    code:     DEFAULT_CODE,
    output:   null,
  });

  const code   = roomSession.code;
  const output = roomSession.output;

  const setCode = useCallback((newCode) => {
    setRoomSession((prev) => ({ ...prev, code: newCode }));
    // TODO: debounce → wsStub.codeUpdate(roomCode, newCode);
  }, []);

  const setOutput = useCallback((val) => {
    setRoomSession((prev) => ({ ...prev, output: val }));
  }, []);

  // ── UI-only state (not synced to room) ──────────────────────────────────────
  const [leftTab,    setLeftTab]    = useState("Description");
  const [bottomTab,  setBottomTab]  = useState("Testcase");
  const [activeCase, setActiveCase] = useState(1);
  const [hintOpen,   setHintOpen]   = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const [statusColor,setStatusColor]= useState("#8a8a8a");
  const [isRunning,  setIsRunning]  = useState(false);

  const textareaRef = useRef(null);
  const lineNumRef  = useRef(null);
  const lineCount   = code.split("\n").length;

  // ── WebSocket lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return;
    wsStub.joinRoom(roomCode);
    return () => wsStub.leaveRoom(roomCode);
  }, [roomCode]);

  // ── Line-number scroll sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [code]);

  const handleScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // ── Tab key ─────────────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const s   = e.target.selectionStart;
    const end = e.target.selectionEnd;
    setCode(code.slice(0, s) + "    " + code.slice(end));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = s + 4;
        textareaRef.current.selectionEnd   = s + 4;
      }
    }, 0);
  };

  // ── Run code ────────────────────────────────────────────────────────────────
  const runCode = () => {
    setIsRunning(true);
    setStatusText("Running…");
    setStatusColor("#ffa116");
    setTimeout(() => {
      setStatusText("Done");
      setStatusColor("#2cbb5d");
      setIsRunning(false);
      setOutput({
        accepted: true,
        runtime:  "36 ms",
        input:    TEST_CASES[activeCase],
        output:   "[[3],[20,9],[15,7]]",
        expected: "[[3],[20,9],[15,7]]",
      });
      setBottomTab("Test Result");
    }, 900);
  };

  // ── Leave room ──────────────────────────────────────────────────────────────
  const handleLeaveRoom = () => {
    wsStub.leaveRoom(roomCode);
    navigate("/dashboard");
  };

  // ── Guard render ────────────────────────────────────────────────────────────
  if (!roomCode) return null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="lc-root">

        {/* Topbar */}
        <div className="lc-topbar">
          <div className="lc-topbar-left">
            <span className="lc-logo">⚡ LC</span>
            <span className="lc-sep">|</span>
            <span className="lc-problem-title">103. Binary Tree Zigzag Level Order Traversal</span>
            <span className="lc-badge-easy">Easy</span>
          </div>
          <div className="lc-topbar-right">
            <div className="lc-room-pill">
              <span className="lc-room-dot" />
              Room&nbsp;{roomCode}
            </div>
            <button className="lc-btn lc-btn-ghost">Problems</button>
            <button className="lc-btn lc-btn-leave" onClick={handleLeaveRoom}>
              Leave
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="lc-main">

          {/* Left: Problem */}
          <div className="lc-left">
            <div className="lc-panel-tabs">
              {["Description", "Solutions", "Submissions"].map((tab) => (
                <div
                  key={tab}
                  className={`lc-panel-tab${leftTab === tab ? " active" : ""}`}
                  onClick={() => setLeftTab(tab)}
                >
                  {tab}
                </div>
              ))}
            </div>

            <div className="lc-problem-content">
              <h3>Binary Tree Zigzag Level Order Traversal</h3>
              <p>
                Given the <code className="lc-code-inline">root</code> of a binary tree, return the{" "}
                <strong>zigzag level order traversal</strong> of its nodes' values — left to right,
                then right to left for the next level, alternating between.
              </p>

              <div className="lc-section-title">Example 1</div>
              <div className="lc-example-box">
                <div className="lc-io-label">Input</div>
                <div className="lc-io-value">root = [3,9,20,null,null,15,7]</div>
              </div>
              <div className="lc-example-box">
                <div className="lc-io-label">Output</div>
                <div className="lc-io-value">[[3],[20,9],[15,7]]</div>
              </div>
              <div className="lc-example-box">
                <div className="lc-io-label">Explanation</div>
                <div style={{ color: "#cfd3de", fontFamily: "'Inter',sans-serif", fontSize: 13 }}>
                  Level 0: [3] (left→right)<br />
                  Level 1: [20,9] (right→left)<br />
                  Level 2: [15,7] (left→right)
                </div>
              </div>

              <div className="lc-section-title">Example 2</div>
              <div className="lc-example-box">
                <div className="lc-io-label">Input</div>
                <div className="lc-io-value">root = [1]</div>
              </div>
              <div className="lc-example-box">
                <div className="lc-io-label">Output</div>
                <div className="lc-io-value">[[1]]</div>
              </div>

              <div className="lc-section-title">Constraints</div>
              <ul className="lc-constraints">
                <li>Nodes in range <code className="lc-code-inline">[0, 2000]</code></li>
                <li><code className="lc-code-inline">-100 ≤ Node.val ≤ 100</code></li>
              </ul>

              <div className="lc-section-title">Hints</div>
              <div className="lc-hint" onClick={() => setHintOpen(true)}>
                💡 Hint 1 — click to reveal
                {hintOpen && (
                  <div className="lc-hint-text">
                    Use BFS to traverse each level. Reverse every second row in the output.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Editor */}
          <div className="lc-right">
            <div className="lc-editor-topbar">
              <select className="lc-lang-select">
                <option>Python3</option>
                <option>C++</option>
                <option>Java</option>
                <option>JavaScript</option>
              </select>
              <span style={{ color: statusColor, fontSize: 12 }}>{statusText}</span>
            </div>

            <div className="lc-editor-area">
              <div className="lc-code-wrap">
                <div className="lc-line-nums" ref={lineNumRef}>
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  className="lc-textarea"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onScroll={handleScroll}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Bottom: Testcase / Result */}
            <div className="lc-bottom">
              <div className="lc-bottom-tabs">
                <div className="lc-bottom-tabs-left">
                  {["Testcase", "Test Result"].map((tab) => (
                    <div
                      key={tab}
                      className={`lc-bottom-tab${bottomTab === tab ? " active" : ""}`}
                      onClick={() => setBottomTab(tab)}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
                <div className="lc-bottom-actions">
                  <button className="lc-btn lc-btn-run" onClick={runCode} disabled={isRunning}>▶ Run</button>
                  <button className="lc-btn lc-btn-primary" onClick={runCode} disabled={isRunning}>Submit</button>
                </div>
              </div>

              {bottomTab === "Testcase" ? (
                <div className="lc-testcase-area">
                  <div className="lc-case-tabs">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        className={`lc-case-tab${activeCase === n ? " active" : ""}`}
                        onClick={() => setActiveCase(n)}
                      >
                        Case {n}
                      </button>
                    ))}
                  </div>
                  <div className="lc-io-label">root =</div>
                  <div className="lc-io-box">{TEST_CASES[activeCase]}</div>
                </div>
              ) : (
                <div className="lc-testcase-area">
                  {output ? (
                    <>
                      <div style={{ marginBottom: 10 }}>
                        <span className={`lc-result-badge ${output.accepted ? "lc-badge-accepted" : "lc-badge-wrong"}`}>
                          {output.accepted ? "Accepted" : "Wrong Answer"}
                        </span>
                        <span style={{ color: "#8a8a8a", fontSize: 12 }}>Runtime: {output.runtime}</span>
                      </div>
                      <div className="lc-io-label">Input</div>
                      <div className="lc-io-box">{output.input}</div>
                      <div className="lc-io-label">Output</div>
                      <div className="lc-io-box">{output.output}</div>
                      <div className="lc-io-label">Expected</div>
                      <div className="lc-io-box" style={{ color: "#2cbb5d" }}>{output.expected}</div>
                    </>
                  ) : (
                    <div style={{ color: "#8a8a8a", fontSize: 13 }}>Run your code to see results.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}