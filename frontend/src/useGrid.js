import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { createGridStore } from "./gridStore.js";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : window.location.origin);

function getClientId() {
  let id = localStorage.getItem("cg_client_id");
  if (!id) {
    id = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("cg_client_id", id);
  }
  return id;
}
function loadIdentity() {
  try { return JSON.parse(localStorage.getItem("cg_identity") || "null"); }
  catch { return null; }
}

export function useGrid() {
  const storeRef = useRef(null);
  if (!storeRef.current) storeRef.current = createGridStore();
  const store = storeRef.current;

  const [phase, setPhase] = useState("lobby");
  const [me, setMe] = useState(null);
  const [online, setOnline] = useState(0);
  const [leaders, setLeaders] = useState([]);
  const [connected, setConnected] = useState(false);
  const [dims, setDims] = useState(null);
  const [rules, setRules] = useState(null);
  const [palette, setPalette] = useState([]);
  const [takenColors, setTakenColors] = useState([]);
  const [lockReadyAt, setLockReadyAt] = useState(0);
  const [notice, setNotice] = useState("");
  const [lobbyMessage, setLobbyMessage] = useState("");
  const [savedIdentity, setSavedIdentity] = useState(loadIdentity());
  const [cursors, setCursors] = useState({});

  const socketRef = useRef(null);
  const rulesRef = useRef(null);
  const clientId = useRef(getClientId());
  const leftManually = useRef(false);

  // Cursor batching: write to a ref on each event, flush to state ~once a frame.
  const cursorsRef = useRef({});
  const rafRef = useRef(0);
  function flushCursors() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      setCursors({ ...cursorsRef.current });
    });
  }

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("lobby", (data) => {
      store.setAll(data.grid);
      setDims({ cols: data.cols, rows: data.rows });
      const r = { lockCooldownMs: data.lockCooldownMs, lockDurationMs: data.lockDurationMs };
      setRules(r); rulesRef.current = r;
      setPalette(data.palette || []);
      setTakenColors(data.takenColors || []);
      setOnline(data.online);
      setLeaders(data.leaderboard || []);
      const saved = loadIdentity();
      if (!leftManually.current && saved && saved.color && saved.name) {
        socket.emit("join", { name: saved.name, color: saved.color, clientId: clientId.current });
      }
    });

    socket.on("joined", (data) => {
      setMe(data.you);
      setPhase("playing");
      setLobbyMessage("");
      const idn = { name: data.you.name, color: data.you.color };
      localStorage.setItem("cg_identity", JSON.stringify(idn));
      setSavedIdentity(idn);
    });

    socket.on("join_rejected", (r) => {
      setPhase("lobby");
      setTakenColors(r.takenColors || []);
      setLobbyMessage(r.reason === "color_taken"
        ? "That color was just taken — pick another."
        : "Please pick a color.");
    });

    socket.on("taken_colors", (d) => setTakenColors(d.takenColors || []));
    socket.on("tile_update", (t) => {
      store.setTile(t.tileId, {
        color: t.color, name: t.name, ownerId: t.ownerId, ts: t.ts, lockedUntil: t.lockedUntil || 0,
      });
    });
    socket.on("tiles_cleared", (d) => store.clearTiles(d.tileIds || []));
    socket.on("presence", (p) => setOnline(p.online));
    socket.on("leaderboard", (d) => setLeaders(d.top || []));
    socket.on("claim_rejected", (r) => {
      if (r.reason === "lock_cooldown") setLockReadyAt(Date.now() + r.retryInMs);
      else if (r.reason === "locked") flash("That tile is locked");
    });

    socket.on("cursor", (c) => { cursorsRef.current[c.id] = c; flushCursors(); });
    socket.on("cursor_gone", ({ id }) => { delete cursorsRef.current[id]; flushCursors(); });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      socket.disconnect();
    };
  }, [store]);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 1400);
  }

  const join = useCallback((name, color) => {
    leftManually.current = false;
    socketRef.current?.emit("join", { name, color, clientId: clientId.current });
  }, []);

  const claim = useCallback((id, lock = false) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("claim", { tileId: id, lock });
    if (lock && rulesRef.current) setLockReadyAt(Date.now() + rulesRef.current.lockCooldownMs);
  }, []);

  const remove = useCallback((id) => {
    socketRef.current?.emit("remove", { tileId: id });
  }, []);

  const leave = useCallback(() => {
    socketRef.current?.emit("leave");
    localStorage.removeItem("cg_identity");
    setSavedIdentity(null);
    leftManually.current = true;
    setMe(null);
    setPhase("lobby");
    cursorsRef.current = {};
    setCursors({});
  }, []);

  const lastCursor = useRef(0);
  const sendCursor = useCallback((x, y) => {
    const now = performance.now();
    if (now - lastCursor.current < 45) return;
    lastCursor.current = now;
    socketRef.current?.emit("cursor", { x, y });
  }, []);
  const sendCursorLeave = useCallback(() => {
    socketRef.current?.emit("cursor_leave");
  }, []);

  return {
    store, phase, me, online, leaders, connected, dims, rules, palette, takenColors,
    join, claim, remove, leave, lockReadyAt, notice, lobbyMessage, savedIdentity,
    cursors, sendCursor, sendCursorLeave, flash,
  };
}
