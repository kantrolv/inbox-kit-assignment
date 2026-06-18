import React, { useSyncExternalStore, useEffect, useReducer } from "react";

function LockIcon() {
  return (
    <svg className="tile__lock" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" />
      <rect x="5" y="10" width="14" height="9" rx="2" fill="currentColor" />
    </svg>
  );
}

// Subscribes to ONLY its own coordinate. Re-renders when its tile changes,
// or (if locked) once when the lock expires — never on unrelated updates.
function Tile({ id, myId, store, onClaim }) {
  const tile = useSyncExternalStore(
    (cb) => store.subscribeTile(id, cb),
    () => store.getTile(id)
  );

  const [, force] = useReducer((x) => x + 1, 0);
  const lockedUntil = tile ? tile.lockedUntil : 0;
  useEffect(() => {
    if (lockedUntil && lockedUntil > Date.now()) {
      const t = setTimeout(force, lockedUntil - Date.now() + 30);
      return () => clearTimeout(t);
    }
  }, [lockedUntil]);

  const owned = Boolean(tile && tile.color);
  const locked = owned && tile.lockedUntil > Date.now();
  const mine = owned && tile.ownerId === myId;

  return (
    <button
      type="button"
      className={"tile" + (owned ? " tile--owned" : "") +
        (mine ? " tile--mine" : "") + (locked ? " tile--locked" : "")}
      style={owned ? { "--owner": tile.color } : undefined}
      onClick={() => onClaim(id)}
      title={owned ? `Claimed by ${tile.name}${locked ? " (locked)" : ""}` : undefined}
      aria-label={owned ? `Tile ${id}, claimed by ${tile.name}` : `Tile ${id}, unclaimed`}
    >
      {locked ? <LockIcon /> : null}
    </button>
  );
}
export default React.memo(Tile);
