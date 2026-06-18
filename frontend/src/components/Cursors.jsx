import React from "react";

// Overlay of other players' live cursors, each labelled with their name.
// Positioned with percentages so it maps across any screen size.
function Cursors({ cursors }) {
  return (
    <div className="cursors" aria-hidden="true">
      {Object.values(cursors).map((c) => (
        <div
          key={c.id}
          className="cursor"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, color: c.color }}
        >
          <svg className="cursor__arrow" viewBox="0 0 16 16" width="15" height="15">
            <path d="M1 1l5 14 2.4-5.6L14 7z" fill="currentColor" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
          </svg>
          <span className="cursor__name" style={{ background: c.color }}>{c.name}</span>
        </div>
      ))}
    </div>
  );
}
export default React.memo(Cursors);
