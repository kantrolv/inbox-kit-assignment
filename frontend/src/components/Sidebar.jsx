import React, { useEffect, useState } from "react";

function Bar({ label, until, window }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [until]);
  const remaining = Math.max(0, until - now);
  const busy = remaining > 0;
  const pct = busy ? Math.min(100, (1 - remaining / window) * 100) : 100;
  return (
    <div className="bar">
      <div className="bar__row">
        <span className="bar__label">{label}</span>
        <span className={"dot" + (busy ? " dot--busy" : " dot--ready")} />
      </div>
      <div className="bar__track"><div className="bar__fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

const MODE_HINT = {
  claim: "Click any tile to capture it.",
  lock: "Click a tile to claim + lock it (protected ~8s).",
  erase: "Click one of your own tiles to remove it.",
};

function Sidebar({ me, leaders, rules, lockReadyAt, mode, onSetMode, onLeave }) {
  return (
    <aside className="sidebar">
      <section className="card">
        <h2 className="card__title">You</h2>
        {me ? (
          <div className="identity">
            <span className="identity__swatch" style={{ background: me.color }} />
            <span className="identity__name">{me.name}</span>
          </div>
        ) : <div className="identity identity--muted">connecting…</div>}

        <div className="modes" role="tablist" aria-label="Tile mode">
          {["claim", "lock", "erase"].map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={"mode" + (mode === m ? " mode--on" : "") + (m === "erase" ? " mode--erase" : "")}
              onClick={() => onSetMode(m)}
            >
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <p className="modes__hint">{MODE_HINT[mode]}</p>

        {rules && <Bar label="Lock recharge" until={lockReadyAt} window={rules.lockCooldownMs} />}

        <button type="button" className="leave" onClick={onLeave}>
          Leave &amp; change name
        </button>
      </section>

      <section className="card">
        <h2 className="card__title">Leaderboard <span className="card__hint">tiles held</span></h2>
        {leaders.length === 0 ? (
          <p className="empty">No tiles yet — claim the first.</p>
        ) : (
          <ol className="ranks">
            {leaders.map((l, i) => (
              <li className={"rank" + (i === 0 ? " rank--lead" : "")} key={`${l.name}-${i}`}>
                <span className="rank__pos">{i + 1}</span>
                <span className="rank__swatch" style={{ background: l.color }} />
                <span className="rank__name">{l.name}</span>
                <span className="rank__count">{l.count}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}
export default React.memo(Sidebar);
