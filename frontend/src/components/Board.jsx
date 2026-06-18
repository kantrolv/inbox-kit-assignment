import React from "react";
import Tile from "./Tile.jsx";

// Renders the grid ONCE. Memoized so it only rebuilds when the dimensions or
// your identity change — never on individual tile updates (those go straight
// to the affected Tile via the store).
function Board({ cols, rows, myId, store, onClaim }) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const id = `${x}:${y}`;
      cells.push(<Tile key={id} id={id} myId={myId} store={store} onClaim={onClaim} />);
    }
  }
  return (
    <div className="board" style={{ "--cols": cols, "--rows": rows }} role="grid" aria-label="Claim grid">
      {cells}
    </div>
  );
}
export default React.memo(Board);
