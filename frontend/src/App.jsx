import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import Board from "./components/Board.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Lobby from "./components/Lobby.jsx";
import Cursors from "./components/Cursors.jsx";
import { useGrid } from "./useGrid.js";

export default function App() {
  const {
    store, phase, me, online, leaders, connected, dims, rules, palette, takenColors,
    join, claim, remove, leave, lockReadyAt, notice, lobbyMessage, savedIdentity,
    cursors, sendCursor, sendCursorLeave, flash,
  } = useGrid();

  const [theme, setTheme] = useState(() => localStorage.getItem("cg_theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cg_theme", theme);
  }, [theme]);

  const [mode, setMode] = useState("claim"); // claim | lock | erase

  const playing = phase === "playing";
  const playingRef = useRef(playing);
  const modeRef = useRef(mode);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Stable onClaim so the 960-tile Board never rebuilds on mode/phase change.
  const onClaim = useCallback((id) => {
    if (!playingRef.current) return;
    const m = modeRef.current;
    if (m === "erase") {
      const t = store.getTile(id);
      if (t && t.ownerId === me?.id) remove(id);
      else flash("You can only erase your own tiles");
    } else {
      claim(id, m === "lock");
    }
  }, [store, claim, remove, me, flash]);

  // Cursor reporting, throttled in the hook. Coords are normalized to the board.
  const boardWrapRef = useRef(null);
  const onMouseMove = useCallback((e) => {
    if (!playingRef.current || !boardWrapRef.current) return;
    const r = boardWrapRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    sendCursor(x, y);
  }, [sendCursor]);

  const claimedCount = useSyncExternalStore(store.subscribeMeta, store.getCount);
  const total = dims ? dims.cols * dims.rows : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <i style={{ background: "#ff6b6b" }} />
            <i style={{ background: "#06d6a0" }} />
            <i style={{ background: "#4d96ff" }} />
            <i style={{ background: "#ffd166" }} />
          </span>
          <span className="brand__name">Claimground</span>
        </div>
        <div className="topbar__meta">
          <button
            className="themebtn"
            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>
          <div className={"pill" + (connected ? " pill--on" : "")}>
            <span className="pill__dot" />{connected ? `${online} online` : "connecting…"}
          </div>
          <div className="stat">
            <span className="stat__value">{claimedCount}</span>
            <span className="stat__label">/ {total || "…"} claimed</span>
          </div>
        </div>
      </header>

      <main className="stage">
        <div
          className={"board-wrap" + (playing ? "" : " board-wrap--idle")}
          ref={boardWrapRef}
          onMouseMove={onMouseMove}
          onMouseLeave={sendCursorLeave}
        >
          {dims ? (
            <Board cols={dims.cols} rows={dims.rows} myId={me?.id} store={store} onClaim={onClaim} />
          ) : (
            <div className="loading">Connecting to the board…</div>
          )}
          {playing && <Cursors cursors={cursors} />}
        </div>

        <Sidebar
          me={me} leaders={leaders} rules={rules} lockReadyAt={lockReadyAt}
          mode={mode} onSetMode={setMode} onLeave={leave}
        />
      </main>

      <footer className="hint">
        {notice
          ? <span className="hint__notice">{notice}</span>
          : "Claim, Lock, or Erase using the panel on the right. Open incognito windows to play with others."}
      </footer>

      {!playing && dims && (
        <Lobby
          palette={palette} takenColors={takenColors} savedIdentity={savedIdentity}
          message={lobbyMessage} onJoin={join}
        />
      )}
    </div>
  );
}
