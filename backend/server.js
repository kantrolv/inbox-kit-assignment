import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import {
  COLS, ROWS, LOCK_DURATION_MS, LOCK_COOLDOWN_MS, MAX_NAME, PALETTE,
} from "./config.js";

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true, methods: ["GET", "POST"] } });
app.get("/", (_req, res) => res.send("Claimground backend is running."));

/* STATE — single source of truth. Identity keyed on persistent clientId. */
const tiles = new Map();          // "x:y" -> { color, name, ownerId, ts, lockedUntil }
const players = new Map();         // clientId -> { clientId, name, color, lastLock, conns }
const socketToClient = new Map();  // socket.id -> clientId

function snapshot() {
  const obj = {};
  for (const [id, t] of tiles) obj[id] = t;
  return obj;
}
function takenColors() {
  return [...new Set([...players.values()].map((p) => p.color))];
}
function leaderboard(limit = 6) {
  const counts = new Map();
  for (const t of tiles.values()) {
    const e = counts.get(t.ownerId) || { name: t.name, color: t.color, count: 0 };
    e.count += 1; e.name = t.name; e.color = t.color;
    counts.set(t.ownerId, e);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
function isValidTile(id) {
  if (typeof id !== "string") return false;
  const p = id.split(":");
  if (p.length !== 2) return false;
  const x = Number(p[0]), y = Number(p[1]);
  return Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 && x < COLS && y >= 0 && y < ROWS;
}
function cleanName(raw) {
  if (typeof raw !== "string") return "Player";
  const n = raw.trim().slice(0, MAX_NAME);
  return n.length ? n : "Player";
}
function clearTilesOf(clientId) {
  const cleared = [];
  for (const [id, t] of tiles) {
    if (t.ownerId === clientId) { tiles.delete(id); cleared.push(id); }
  }
  return cleared;
}

io.on("connection", (socket) => {
  socket.emit("lobby", {
    grid: snapshot(),
    cols: COLS, rows: ROWS,
    lockDurationMs: LOCK_DURATION_MS,
    lockCooldownMs: LOCK_COOLDOWN_MS,
    palette: PALETTE,
    takenColors: takenColors(),
    online: players.size,
    leaderboard: leaderboard(),
  });

  socket.on("join", (payload) => {
    const name = cleanName(payload && payload.name);
    const color = payload && payload.color;
    const clientId = (payload && typeof payload.clientId === "string" && payload.clientId) || socket.id;

    if (!PALETTE.includes(color)) {
      socket.emit("join_rejected", { reason: "bad_color", takenColors: takenColors() });
      return;
    }
    const holder = [...players.values()].find((p) => p.color === color);
    if (holder && holder.clientId !== clientId) {
      socket.emit("join_rejected", { reason: "color_taken", takenColors: takenColors() });
      return;
    }

    let p = players.get(clientId);
    if (!p) p = { clientId, name, color, lastLock: 0, conns: 0 };
    p.name = name; p.color = color; p.conns += 1;
    players.set(clientId, p);
    socketToClient.set(socket.id, clientId);

    socket.emit("joined", { you: { id: clientId, name: p.name, color: p.color } });
    io.emit("presence", { online: players.size });
    io.emit("taken_colors", { takenColors: takenColors() });
    io.emit("leaderboard", { top: leaderboard() });
  });

  socket.on("claim", (payload) => {
    const clientId = socketToClient.get(socket.id);
    if (!clientId) return;
    const me = players.get(clientId);
    if (!me) return;

    const id = payload && payload.tileId;
    if (!isValidTile(id)) return;

    const wantLock = Boolean(payload && payload.lock);
    const now = Date.now();

    const existing = tiles.get(id);
    if (existing && existing.lockedUntil > now && existing.ownerId !== clientId) {
      socket.emit("claim_rejected", { tileId: id, reason: "locked", retryInMs: existing.lockedUntil - now });
      return;
    }

    if (wantLock) {
      const since = now - me.lastLock;
      if (since < LOCK_COOLDOWN_MS) {
        socket.emit("claim_rejected", { tileId: id, reason: "lock_cooldown", retryInMs: LOCK_COOLDOWN_MS - since });
        return;
      }
      me.lastLock = now;
      const tile = { color: me.color, name: me.name, ownerId: clientId, ts: now, lockedUntil: now + LOCK_DURATION_MS };
      tiles.set(id, tile);
      io.emit("tile_update", { tileId: id, ...tile });
      io.emit("leaderboard", { top: leaderboard() });
      return;
    }

    // Normal claim — instant, no cooldown.
    const tile = { color: me.color, name: me.name, ownerId: clientId, ts: now, lockedUntil: 0 };
    tiles.set(id, tile);
    io.emit("tile_update", { tileId: id, ...tile });
    io.emit("leaderboard", { top: leaderboard() });
  });

  socket.on("remove", (payload) => {
    const clientId = socketToClient.get(socket.id);
    if (!clientId) return;
    const id = payload && payload.tileId;
    if (!isValidTile(id)) return;
    const t = tiles.get(id);
    if (!t || t.ownerId !== clientId) return; // only your own tiles
    tiles.delete(id);
    io.emit("tiles_cleared", { tileIds: [id] });
    io.emit("leaderboard", { top: leaderboard() });
  });

  socket.on("leave", () => {
    const clientId = socketToClient.get(socket.id);
    if (!clientId) return;
    const cleared = clearTilesOf(clientId);
    players.delete(clientId);
    for (const [sid, cid] of socketToClient) {
      if (cid === clientId) socketToClient.delete(sid);
    }
    if (cleared.length) io.emit("tiles_cleared", { tileIds: cleared });
    io.emit("presence", { online: players.size });
    io.emit("taken_colors", { takenColors: takenColors() });
    io.emit("leaderboard", { top: leaderboard() });
    io.emit("cursor_gone", { id: clientId });
  });

  socket.on("cursor", (payload) => {
    const clientId = socketToClient.get(socket.id);
    if (!clientId) return;
    const p = players.get(clientId);
    if (!p) return;
    const x = Number(payload && payload.x);
    const y = Number(payload && payload.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    socket.broadcast.emit("cursor", { id: clientId, name: p.name, color: p.color, x, y });
  });
  socket.on("cursor_leave", () => {
    const clientId = socketToClient.get(socket.id);
    if (clientId) socket.broadcast.emit("cursor_gone", { id: clientId });
  });

  socket.on("disconnect", () => {
    const clientId = socketToClient.get(socket.id);
    if (!clientId) return;
    socketToClient.delete(socket.id);
    const p = players.get(clientId);
    if (p) {
      p.conns -= 1;
      if (p.conns <= 0) players.delete(clientId);
    }
    io.emit("presence", { online: players.size });
    io.emit("taken_colors", { takenColors: takenColors() });
    io.emit("cursor_gone", { id: clientId });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Claimground backend listening on http://localhost:${PORT}`);
});
