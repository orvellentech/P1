/** Decorative SVG artwork for the theater and the title card. All aria-hidden. */

export function DecoFrame({ className }: { className?: string }) {
  const corner = (
    <g fill="none" stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke">
      <path d="M10 44 V10 H44" />
      <path d="M10 26 A16 16 0 0 1 26 10" />
      <path d="M10 34 A24 24 0 0 1 34 10" />
      <path d="M16 16 L22 22" />
      <path d="M22 22 l3 -3 l3 3 l-3 3 z" fill="currentColor" />
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 368 273" preserveAspectRatio="none" aria-hidden="true">
      <rect x="1" y="1" width="366" height="271" fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <rect x="6" y="6" width="356" height="261" fill="none" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      {corner}
      <g transform="translate(368 0) scale(-1 1)">{corner}</g>
      <g transform="translate(0 273) scale(1 -1)">{corner}</g>
      <g transform="translate(368 273) scale(-1 -1)">{corner}</g>
      <g stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke">
        <path d="M150 6 L184 14 L218 6" fill="none" />
        <path d="M150 267 L184 259 L218 267" fill="none" />
      </g>
    </svg>
  );
}

export function Crest({ className }: { className?: string }) {
  const rays = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI + (i / 12) * Math.PI;
    return <line key={i} x1={60 + Math.cos(a) * 16} y1={60 + Math.sin(a) * 16} x2={60 + Math.cos(a) * 52} y2={60 + Math.sin(a) * 52} />;
  });
  return (
    <svg className={className} viewBox="0 0 120 66" aria-hidden="true">
      <defs>
        <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3d692" />
          <stop offset="0.5" stopColor="#b58a3e" />
          <stop offset="1" stopColor="#5f4318" />
        </linearGradient>
      </defs>
      <path d="M4 62 A56 56 0 0 1 116 62 Z" fill="#1a1009" stroke="url(#crestGold)" strokeWidth="3" />
      <g stroke="url(#crestGold)" strokeWidth="2.2" strokeLinecap="round">{rays}</g>
      <path d="M60 30 l7 9 l-7 9 l-7 -9 z" fill="url(#crestGold)" />
      <rect x="2" y="60" width="116" height="5" fill="url(#crestGold)" />
    </svg>
  );
}

function seatPath(x: number, y: number, w: number, h: number, r: number) {
  return `M${x} ${y + h} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h} Z`;
}

/** Two rows of empty velvet seats, rim-lit by the screen. */
export function Seats() {
  const rows = [
    { y: 96, w: 62, gap: 70, h: 180, offset: 12, shade: "#0a0605" },
    { y: 140, w: 96, gap: 106, h: 160, offset: -40, shade: "#050303" },
  ];
  return (
    <svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255, 236, 210, 0.3)" />
          <stop offset="0.12" stopColor="rgba(255, 236, 210, 0)" />
        </linearGradient>
      </defs>
      {rows.map((row, ri) => {
        const count = Math.ceil(1300 / row.gap);
        return (
          <g key={ri}>
            {Array.from({ length: count }, (_, i) => {
              const x = row.offset + i * row.gap;
              const d = seatPath(x, row.y, row.w, row.h, row.w * 0.28);
              return (
                <g key={i}>
                  <path d={d} fill={row.shade} />
                  <path d={d} fill="url(#rim)" />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
