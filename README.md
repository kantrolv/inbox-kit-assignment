# Claimground

A real-time, multiplayer "capture the grid" web app. Anyone who opens the site
picks a name and a unique color, then competes on a shared 50x30 board: click
tiles to capture them, lock tiles to defend them, and erase your own tiles.
Every action is broadcast to all connected players instantly, and you can see
everyone else's cursor moving in real time.

**Live demo:** https://inbox-kit-assignment-1.onrender.com/

---

## Table of contents

1. [What this is (the assignment)](#what-this-is-the-assignment)
2. [What you can do (first-time guide)](#what-you-can-do-first-time-guide)
3. [Features explained in detail](#features-explained-in-detail)
4. [Tech stack and why](#tech-stack-and-why)
5. [How the project works](#how-the-project-works)
6. [Where the data is stored](#where-the-data-is-stored)
7. [Using a database (if you want persistence)](#using-a-database-if-you-want-persistence)
8. [Project structure](#project-structure)
9. [Run it locally](#run-it-locally)
10. [How to test it](#how-to-test-it)
11. [Deploying](#deploying)
12. [Possible next steps](#possible-next-steps)

---

## What this is (the assignment)

The brief was to build a real-time shared grid: a board made of hundreds of
blocks where many users can be online at the same time, anyone can click a
block to capture it, and every other user sees that change instantly. The
emphasis was explicitly on backend and real-time thinking, on handling
conflicts when many people act at once, and on a clean, clear interface.

Claimground answers that brief and adds a small game layer on top so the core
mechanics have a reason to exist: claiming is competitive (tiles can be taken
over), locking lets you defend territory, and a leaderboard tracks who holds
the most tiles.

---

## What you can do (first-time guide)

When you open the site for the first time:

1. **You land on an entry screen.** It asks for a name and a color. A name is
   suggested for you, and the color palette shows which colors are still
   available (colors already used by other players are greyed out). Pick a free
   color and a name that is not already taken, then press "Join the board."

2. **You are now on the board.** The large grid in the centre is the shared
   board. The panel on the right shows your identity, your current action mode,
   and the leaderboard.

3. **Click any tile to capture it.** It instantly turns your color, for you and
   for everyone else online.

4. **Switch modes on the right** to change what a click does:
   - **Claim** captures a tile (the default).
   - **Lock** captures and protects a tile so others cannot overwrite it for a
     few seconds.
   - **Erase** removes one of your own tiles.

5. **Watch other players.** Their cursors move across the board in real time,
   each labelled with their name and shown in their color. The online count and
   the leaderboard update live as people join, leave, and claim.

6. **Leave when you want.** "Leave and change name" removes all your tiles,
   frees your color for others, and returns you to the entry screen so you can
   rejoin with a new identity.

To play with others, open the site in separate browsers or in incognito
windows. Each window is treated as a distinct player.

---

## Features explained in detail

### The entry screen (lobby)
Before you join you are a spectator: you can see the live board but cannot act.
You choose a name and a color here. The color swatches reflect the real,
current state of the server, so a color another player is using appears dimmed
and cannot be selected. This prevents two players from ending up with the same
color.

### Identity and persistence
Each browser generates a stable, private id the first time it visits and stores
it locally. Your chosen name and color are also saved locally. Because of this:
- If you refresh the page, you are put straight back in with the same name,
  color, and tiles. You do not have to pick again.
- Your tiles and your leaderboard position stay tied to you across refreshes,
  rather than resetting every time the connection changes.

There are no accounts or passwords. The per-browser id is enough to keep your
identity stable for a game like this, without the overhead and risk of building
a full login system.

### Name and color uniqueness
The server enforces that, among currently active players:
- No two players can have the same color.
- No two players can have the same name (checked case-insensitively, so "Raku"
  and "raku" count as the same).

Your own refresh is always allowed to keep your own name and color. If you try
to join with a name or color another player is already using, the entry screen
tells you and asks you to pick another.

### The board
A grid of 50 columns by 30 rows, which is 1,500 tiles. Each tile is either
unclaimed (a faint empty cell) or owned by a player (filled with that player's
color). The board scales to fit your screen while keeping its shape.

### Claiming (and overwriting)
Clicking a tile in Claim mode captures it for you immediately. Claims are
instant, with no waiting. Tiles are overwritable: if a tile already belongs to
someone else, your claim takes it over, and the later claim wins. This is what
makes the board competitive, like a territory fight.

### Lock and the lock timer
Lock mode lets you defend a tile. When you claim a tile in Lock mode, that tile
becomes protected: no one else can overwrite it until the protection expires
(about 8 seconds). A locked tile shows a small lock icon.

Because an unlimited lock would let one player freeze the whole board, locks are
rate-limited. After you place a lock, you must wait before you can place
another. The right-hand panel shows a **Lock recharge** bar:
- When the bar is full and the dot is green, you can place a lock.
- Right after you place one, the bar empties and the dot turns amber, then the
  bar refills over the recharge period until it is ready again.

So there are two separate timings working together: how long a placed lock stays
protected (about 8 seconds), and how often you are allowed to place a new lock.
This keeps locks scarce and the board lively.

### Erase
Erase mode lets you remove one of your own tiles, turning it back to unclaimed.
You can only erase tiles you own; clicking someone else's tile in Erase mode
does nothing and shows a short message.

### Leave and change name
The "Leave and change name" button does three things at once: it removes all of
your tiles from the board, frees your color so other players can use it, and
returns you to the entry screen. Your saved name is cleared so you can type a
new one. This is also the way to switch identity.

### Leaderboard
The right panel ranks the top players by how many tiles they currently hold.
Each row shows the rank, the player's color, their name, and their tile count.
The leader is highlighted. The leaderboard updates live as tiles change owners,
are erased, or are cleared when a player leaves.

### Online count and claimed count
The top bar shows two live numbers:
- **Online** is how many players are currently connected and playing.
- **Claimed** is how many tiles on the board are currently owned, out of the
  total (for example, "120 / 1500 claimed").

### Live cursors
While you move your mouse over the board, every other player sees your cursor
moving in real time, drawn in your color with your name beside it. This is the
clearest sign that the app is genuinely multiplayer and live. Cursor positions
are sent as fractions of the board size, so they line up correctly on any screen,
and they are sent at a limited rate and batched on the receiving side so the
board stays smooth even with several people moving at once.

### Light and dark theme
A button in the top bar switches between a clean dark theme and a clean light
theme. Your choice is saved, so the site remembers it on your next visit.

### Reconnect grace period
When a player disconnects (closes the tab or loses connection), their tiles and
color are held for a short grace period of about 10 seconds rather than being
removed instantly. If they were only refreshing, they reconnect within that
window and reclaim everything seamlessly. If they do not return, their tiles are
cleared and their color is freed. This prevents "orphaned" tiles and keeps the
board, the colors, and the leaderboard consistent.

---

## Tech stack and why

**Frontend: React with Vite.**
React makes it easy to build the interface out of small components (the board,
a tile, the sidebar, the entry screen, the cursors). Vite is the build tool and
dev server. For a board of this size, plain elements (one button per tile) are
fast and keep styling and interaction simple.

**Backend: Node.js with Express and Socket.IO.**
Node runs the server-side JavaScript. Express serves a basic health route.
Socket.IO is the real-time layer: it keeps a live, two-way connection open
between every browser and the server, handles reconnection automatically, and
makes it easy to broadcast a message to everyone at once. Node's single-threaded
event loop is an advantage here: incoming actions are processed one at a time,
so the conflict logic does not need locks.

**State: in-memory on the server (see the next sections).**

**Real-time transport: WebSockets (through Socket.IO).**

---

## How the project works

### The core rule: the server is the single source of truth
A client never changes the board on its own. It sends a request ("claim this
tile", "lock this tile", "remove this tile") to the server. The server checks
the rules, updates its own state, and then broadcasts the result to everyone,
including the player who asked. Each player's screen updates only when the
server's broadcast arrives.

This single rule is what makes many players work without conflicts. Every action
passes through one handler on one Node process, one at a time, so there is never
a moment where two claims are applied at once. If two people click the same tile
at almost the same time, the server simply processes them in order, and the
result is well-defined.

### The flow of a single click
1. You click a tile. The client sends a `claim` message with the tile id (and
   whether Lock mode is on).
2. The server validates it: are you a joined player, is the tile id valid, is
   the tile locked by someone else, are you allowed to lock right now.
3. If allowed, the server updates its in-memory board and broadcasts a
   `tile_update` to all clients, plus an updated `leaderboard`.
4. Every client, including yours, receives the `tile_update` and repaints that
   one tile.

### Identity is tied to a stable player id, not the connection
Ownership of tiles and leaderboard rows is grouped by the persistent per-browser
id, not by the temporary socket connection. That is why a refresh keeps your
tiles and keeps you as a single leaderboard row instead of splitting you into a
new "owner" every time you reconnect.

### Fine-grained rendering keeps it smooth
The board is rendered once. Each tile subscribes to only its own coordinate
through a small in-memory store on the client. When a `tile_update` arrives,
exactly one tile repaints, not all 1,500. Cursor updates are batched to one
repaint per animation frame and never touch the tile grid. This is what keeps
the board responsive even when many people are claiming at the same time.

### The message protocol
| Direction | Event | Meaning |
|---|---|---|
| server to client | `lobby` | Full board snapshot, dimensions, rules, palette, taken colors, leaderboard, online count |
| client to server | `join` | Request to join with a name, color, and client id |
| server to one | `joined` / `join_rejected` | Your identity, or a rejection reason (name_taken, color_taken) |
| client to server | `claim` | Capture a tile (optionally locking it) |
| client to server | `remove` | Remove one of your own tiles |
| client to server | `leave` | Drop all your tiles and leave |
| server to all | `tile_update` | A tile changed owner or was locked |
| server to all | `tiles_cleared` | One or more tiles became unclaimed |
| server to one | `claim_rejected` | Your action was refused (locked, lock_cooldown) |
| server to all | `presence` / `taken_colors` / `leaderboard` | Live online count, used colors, standings |
| both directions | `cursor` / `cursor_leave` / `cursor_gone` | Live cursor positions |

---

## Where the data is stored

All live game state lives **in memory on the backend server**, in plain
JavaScript `Map` objects. There is no database. Specifically, the server holds:

- **`tiles`** - every claimed tile, keyed by its `"x:y"` coordinate. Each entry
  stores the owner's color, the owner's name, the owner's stable id, a
  timestamp, and a lock-expiry time.
- **`players`** - every player, keyed by their stable browser id. Each entry
  stores the name, color, last lock time, how many tabs are connected, and a
  cleanup timer used by the grace period.
- **`socketToClient`** - a small lookup that maps each live socket connection to
  the player id behind it.

On the client side, only two small things are stored in the browser's local
storage: your stable browser id and your chosen name and color. That is what
lets a refresh restore your identity. The board itself is never stored in the
browser; the client always renders whatever the server sends.

This choice is deliberate. The live board changes many times per second and is
ephemeral game state, so keeping it in memory is fast and simple. The trade-off
is that the board resets if the server restarts (for example, when the free
host puts it to sleep). The next section explains how to add a database if you
want the data to survive restarts.

---

## Using a database (if you want persistence)

A database is not required for this app, and the most important insight is that
**not all state belongs in a database**. The live board changes constantly and
is fine in memory; writing a database row on every single click would be the
wrong tool. A database earns its place for the things you want to outlive a
server restart.

### What would go in a database
- **All-time player stats and leaderboard**: total tiles ever captured, games
  played, best rank. This is data you genuinely want to keep.
- **Board persistence**: the current state of the board, so it survives a
  restart instead of resetting.
- **A trivia or content bank**, if the game were extended with questions.

### Which database to use
- **Redis** is the natural fit for the live board and for running more than one
  server instance. You would keep the board in a Redis hash and use Redis
  publish/subscribe so that an update on one server instance reaches clients
  connected to another. Hosted free options include Upstash.
- **Postgres** is the natural fit for persistent stats and an all-time
  leaderboard, because that data is relational and queried after the fact.
  Hosted free options include Neon and Supabase.

### Where it would plug in
The code is structured so this is a localized change. Today the server reads and
writes the `tiles` and `players` maps directly inside the Socket.IO handlers.
To add persistence you would:

1. Replace the in-memory maps with a thin data layer (for example, functions
   like `getTile`, `setTile`, `removeTile`, `getPlayer`, `setPlayer`).
2. Back that data layer with Redis (for live board state) and/or Postgres
   (for stats), instead of plain maps.
3. On server startup, load the board from the store so it is not empty after a
   restart. On each claim, write through to the store.

A minimal stats schema in Postgres could be a single table:

```sql
CREATE TABLE player_stats (
  client_id     TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  total_claims  INTEGER NOT NULL DEFAULT 0,
  games_played  INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

You would increment `total_claims` whenever a player captures a tile, and read
from this table to show an all-time leaderboard alongside the live one.

### Why it is in memory today
For this assignment, the live board is ephemeral and the priority was clean
real-time behavior, so in-memory state is the right call and the deliberate
choice. The structure above is the natural next step if persistence were
required.

---

## Project structure

```
claimground/
├── backend/
│   ├── server.js        Express + Socket.IO: state, rules, conflict handling, broadcasts
│   ├── config.js        Board size, palette, lock timings, name limit
│   └── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx          Top-level layout, modes, theme, cursor tracking
        ├── useGrid.js       Owns the socket connection and all synced state
        ├── gridStore.js     Per-tile store for fine-grained rendering
        ├── index.css        All styling and the light/dark themes
        └── components/
            ├── Board.jsx     Builds the grid once
            ├── Tile.jsx      One cell; subscribes to only its own coordinate
            ├── Sidebar.jsx   Identity, mode control, lock recharge, leaderboard
            ├── Lobby.jsx     The entry screen (name and color)
            └── Cursors.jsx   Other players' live cursors
```

---

## Run it locally

You need Node.js version 20 or newer. Open two terminals.

```bash
# Terminal 1 - backend
cd backend
npm install
npm start          # runs on http://localhost:3001

# Terminal 2 - frontend
cd frontend
npm install
npm run dev        # runs on http://localhost:5173
```

Open http://localhost:5173 and start the backend first. If the page says it is
connecting, it will connect on its own once the backend is running.

---

## How to test it

Open the site in several incognito windows (or different browsers). Each one is
a separate player with its own identity and color. Then:

- Claim a tile in one window and watch it appear instantly in the others.
- Move your mouse over the board and see your cursor and name appear in the
  other windows.
- Switch to Lock mode, lock a tile, and try to take it from another window; it
  will be refused until the lock expires.
- Switch to Erase mode and remove one of your own tiles.
- Try to join a second window with the same name or color as the first; it will
  be rejected.
- Refresh a window; your name, color, and tiles are restored.
- Use "Leave and change name"; your tiles disappear and your color becomes
  available again.

Note: tabs in the same browser share one identity on purpose, so use incognito
windows or different browsers to act as distinct players.

---

## Deploying

The two apps deploy separately.

**Backend** needs a host that runs Node continuously and supports WebSockets.
Render works on the free tier. Serverless hosts such as Vercel and Netlify do
not support the long-lived WebSocket connection this app needs.

On Render: New Web Service, root directory `backend`, build command
`npm install`, start command `npm start`.

**Frontend** is a static site. Build it pointing at the deployed backend, then
host the output:

```bash
cd frontend
VITE_SERVER_URL="https://your-backend.onrender.com" npm run build
# deploy the resulting dist/ folder (Render static site, Netlify, Vercel, etc.)
```

The `VITE_SERVER_URL` value tells the frontend where to open its WebSocket
connection. The backend already accepts connections from any origin.

On a free backend, the server sleeps after about 15 minutes of inactivity and
takes around a minute to wake on the next visit. Because state is in memory, the
board also resets when it sleeps. This is expected for a demo.

---

## Possible next steps

- Persist the all-time leaderboard and player stats in a database (see above).
- Run multiple server instances behind a load balancer, using Redis
  publish/subscribe so updates reach clients on every instance.
- Add round-based scoring with area control, or a trivia layer that grants
  in-game advantages.
- Add zoom and pan for an even larger board.
