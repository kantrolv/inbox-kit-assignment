# Claimground

A real-time shared grid. Anyone who opens the site picks a name and a unique
color, then captures tiles on a live 40×24 board. Every action is broadcast to
all players instantly, you can see everyone's cursor moving in real time, and
you can claim, lock, or erase tiles.

The project is split into two independent apps:

```
claimground/
├── backend/     Node + Express + Socket.IO  (the real-time server)
└── frontend/    React + Vite                 (the UI)
```

---

## Run it on your laptop

You need **Node.js 20+**. Open **two terminals**.

```bash
# Terminal 1 — backend
cd backend
npm install
npm start          # -> http://localhost:3001

# Terminal 2 — frontend
cd frontend
npm install
npm run dev        # -> http://localhost:5173
```

Open `http://localhost:5173`, pick a name and color, and join. Start the
backend first (if you don't, the page waits and connects automatically once it
is up).

---

## How to test it (multiple players)

Open the site in **several incognito windows** — each one is a separate player
with its own identity and color. (Tabs in the *same* browser share one
identity on purpose, so use incognito or different browsers for distinct
players.)

Then try:
- **Claim** — default mode. Click tiles to capture them; they sync instantly to
  every window.
- **Lock** — switch to Lock mode and click: the tile is protected for ~8s and
  nobody else can overwrite it. Locks recharge on their own timer.
- **Erase** — switch to Erase mode and click one of *your* tiles to remove it.
- **Cursors** — move your mouse over the board; the other windows see your
  cursor and name moving live.
- **Leave & change name** — removes all your tiles, frees your color, and
  returns you to the entry screen so you can rejoin with a new name/color.
- Refresh a window: you keep your identity, color, and tiles.

---

## How it works (the design)

**The server is the single source of truth.** A client never paints its own
tile — it emits an action, the server decides, then the server broadcasts the
result to everyone (including the sender). Every action is processed one at a
time by the single Node process, so there are no torn writes and no conflicts.

**Identity is keyed on a persistent player id, not the connection.** Each
browser generates a stable id (stored locally) and sends it when joining. Tile
ownership and the leaderboard are grouped by *that* id — so when a player
refreshes or briefly drops, their tiles stay theirs and they remain a single
leaderboard row instead of splitting into a new "owner" each reconnect. The
same id lets a refresh re-claim the player's own color and shares one identity
across that player's tabs.

**Colors are unique per player.** Taken colors are disabled live in the entry
screen, and the server rejects a taken color (first to ask wins). When a player
leaves or closes their last tab, the color frees up again. No accounts or
passwords — the per-browser id keeps identity stable without that overhead.

**Rendering is fine-grained.** The board renders once; each tile subscribes
(via `useSyncExternalStore`) to *only its own* coordinate through a small store
(`gridStore.js`). A tile update re-renders exactly one cell — not all 960 — so
the board stays smooth even when many players act at once. Cursor updates are
batched to one render per animation frame and never touch the tile grid.

**The frontend renders whatever the server describes.** On connect the server
sends the board dimensions and rule timings, so the client hardcodes nothing
about the grid — change `COLS`/`ROWS` in `backend/config.js` and the UI follows.

### Rules
- Normal claims are instant (no cooldown) and overwritable — the later claim wins.
- **Lock** protects a tile for `LOCK_DURATION_MS` (8s); it has its own recharge
  (`LOCK_COOLDOWN_MS`) so locks stay scarce and the board never freezes.
- **Erase** only works on your own tiles (enforced server-side).
- All rules are enforced on the server, so the client can't cheat them.

### Message protocol

| Direction | Event | Payload |
|---|---|---|
| server → client | `lobby` | board snapshot, dimensions, rules, palette, taken colors, leaderboard |
| client → server | `join` | `{ name, color, clientId }` |
| server → one | `joined` / `join_rejected` | your identity / `{ reason }` |
| client → server | `claim` | `{ tileId, lock }` |
| client → server | `remove` | `{ tileId }` (your own tile) |
| client → server | `leave` | — |
| server → all | `tile_update` | `{ tileId, color, name, ownerId, ts, lockedUntil }` |
| server → all | `tiles_cleared` | `{ tileIds }` |
| server → one | `claim_rejected` | `{ tileId, reason, retryInMs }` (locked / lock_cooldown) |
| server → all | `presence` / `taken_colors` / `leaderboard` | live counts and standings |
| client ↔ server | `cursor` / `cursor_leave` / `cursor_gone` | live cursor positions (normalized 0–1) |

---

## Deploying

The two apps deploy separately.

**Backend** → a host that runs Node persistently and supports WebSockets
(Render works on the free tier; Vercel/Netlify do **not** — they're serverless).
On Render: New Web Service, root directory `backend`, build `npm install`,
start `npm start`.

**Frontend** → build it pointing at the deployed backend, then host the static
output anywhere:
```bash
cd frontend
VITE_SERVER_URL="https://your-backend.onrender.com" npm run build
# deploy the resulting dist/ folder (Render static site, Netlify, Vercel, ...)
```

Render's free backend sleeps after ~15 min idle and the in-memory board resets
when it does — fine for a demo; for persistence you'd add Redis/Postgres.

---

## Stack rationale
React + Vite for a fast, clean UI with fine-grained per-tile rendering.
Node + Socket.IO for the real-time layer — reconnection and broadcast come
free, and Node's single event loop serializes actions so the conflict logic
needs no locks. State lives in memory because the live board is fast-changing,
ephemeral game state; a database is the right tool only for things meant to
outlive a restart (all-time stats), which is the natural next step.
