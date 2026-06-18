import React, { useState } from "react";

const ADJ = ["Swift", "Calm", "Bold", "Lucky", "Sly", "Keen", "Wild", "Brave",
  "Quick", "Jolly", "Witty", "Cosmic", "Royal", "Hazel", "Misty", "Solar"];
const NOUN = ["Otter", "Fox", "Hawk", "Lynx", "Wolf", "Crane", "Koi", "Raven",
  "Wren", "Owl", "Stag", "Heron", "Moth", "Newt", "Bison", "Mole"];
function suggestName() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  return a + n;
}

export default function Lobby({ palette, takenColors, savedIdentity, message, onJoin }) {
  const taken = new Set(takenColors);
  const firstFree = palette.find((c) => !taken.has(c)) || null;

  const [name, setName] = useState((savedIdentity && savedIdentity.name) || suggestName());
  const [color, setColor] = useState(
    (savedIdentity && !taken.has(savedIdentity.color) && savedIdentity.color) || firstFree
  );

  const colorOk = color && !taken.has(color);
  const canJoin = name.trim().length > 0 && colorOk;

  return (
    <div className="lobby">
      <div className="lobby__card">
        <h1 className="lobby__title">Claimground</h1>
        <p className="lobby__sub">Pick a name and a color, then capture the board.</p>

        <label className="lobby__label" htmlFor="name">Your name</label>
        <input
          id="name" className="lobby__input" value={name} maxLength={16}
          onChange={(e) => setName(e.target.value)} placeholder="Enter a name"
          onKeyDown={(e) => { if (e.key === "Enter" && canJoin) onJoin(name.trim(), color); }}
        />

        <span className="lobby__label">Your color</span>
        <div className="swatches">
          {palette.map((c) => {
            const isTaken = taken.has(c);
            const selected = c === color;
            return (
              <button
                key={c} type="button"
                className={"swatch" + (selected ? " swatch--on" : "") + (isTaken ? " swatch--taken" : "")}
                style={{ "--c": c }} disabled={isTaken}
                onClick={() => setColor(c)}
                title={isTaken ? "Taken" : c}
                aria-label={isTaken ? `${c}, taken` : c}
              />
            );
          })}
        </div>

        {message ? <p className="lobby__msg">{message}</p> : null}

        <button type="button" className="lobby__join" disabled={!canJoin}
          onClick={() => onJoin(name.trim(), color)}>
          {firstFree ? "Join the board" : "All colors taken — try again soon"}
        </button>
      </div>
    </div>
  );
}
