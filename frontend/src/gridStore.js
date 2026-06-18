// A tiny external store with per-tile subscriptions. Each Tile subscribes to
// ONLY its own coordinate, so a tile update re-renders exactly one cell
// instead of rebuilding all 960. This keeps the board smooth under load.

export function createGridStore() {
  const tilesMap = new Map();
  const tileListeners = new Map();
  const metaListeners = new Set();
  let count = 0;

  function notifyTile(id) {
    const set = tileListeners.get(id);
    if (set) set.forEach((cb) => cb());
  }
  function notifyMeta() { metaListeners.forEach((cb) => cb()); }

  return {
    setAll(obj) {
      tilesMap.clear();
      for (const k in obj) tilesMap.set(k, obj[k]);
      count = tilesMap.size;
      tileListeners.forEach((_set, id) => notifyTile(id));
      notifyMeta();
    },
    setTile(id, tile) {
      const isNew = !tilesMap.has(id);
      tilesMap.set(id, tile);
      if (isNew) { count += 1; notifyMeta(); }
      notifyTile(id);
    },
    clearTiles(ids) {
      let changed = false;
      for (const id of ids) {
        if (tilesMap.delete(id)) { count -= 1; changed = true; notifyTile(id); }
      }
      if (changed) notifyMeta();
    },
    getTile(id) { return tilesMap.get(id); },
    subscribeTile(id, cb) {
      let set = tileListeners.get(id);
      if (!set) { set = new Set(); tileListeners.set(id, set); }
      set.add(cb);
      return () => set.delete(cb);
    },
    getCount() { return count; },
    subscribeMeta(cb) { metaListeners.add(cb); return () => metaListeners.delete(cb); },
  };
}
