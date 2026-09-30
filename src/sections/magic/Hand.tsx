/**
 * A magician's white glove, rigged for a finger snap (back of the right
 * hand, thumb on the left). Each finger segment is a group rotating about
 * its own joint, so the timeline animates real articulation rather than
 * swapping drawings.
 *
 * Joint positions (viewBox units) are exported for the animation code.
 */

export const HAND_RIG = {
  thumb: { base: [140, 400], len1: 86, len2: 60 },
  index: { base: [184, 298], len1: 70, len2: 62 },
  middle: { base: [219, 290], len1: 62, len2: 52 },
  ring: { base: [252, 294], len1: 40 },
  pinky: { base: [282, 306], len1: 34 },
  /** Where thumb and middle fingertip meet before the snap. */
  contact: [143, 264],
} as const;

const STROKE = "#16130f";
const SW = 3.5;

function Capsule({ len, width }: { len: number; width: number }) {
  const r = width / 2;
  return <rect x={-r} y={-len - r * 0.4} width={width} height={len + r * 0.8} rx={r} fill="url(#glove)" stroke={STROKE} strokeWidth={SW} />;
}

function Crease({ y, width }: { y: number; width: number }) {
  return <path d={`M${-width * 0.28} ${y} q${width * 0.28} ${-4} ${width * 0.56} 0`} fill="none" stroke="#b7afa1" strokeWidth={1.6} strokeLinecap="round" />;
}

/** Two-segment finger: proximal group rotates at the knuckle, distal at the middle joint. */
function Finger({ name, base, len1, len2, width, a1, a2 }: { name: string; base: readonly number[]; len1: number; len2: number; width: number; a1: number; a2: number }) {
  return (
    <g transform={`translate(${base[0]} ${base[1]})`}>
      <g data-joint={`${name}-1`} transform={`rotate(${a1})`}>
        <g transform={`translate(0 ${-len1})`}>
          <g data-joint={`${name}-2`} transform={`rotate(${a2})`}>
            <Capsule len={len2} width={width * 0.94} />
            <Crease y={-len2 * 0.45} width={width} />
          </g>
        </g>
        <Capsule len={len1} width={width} />
        <Crease y={-len1 * 0.55} width={width} />
      </g>
    </g>
  );
}

export default function Hand({ className }: { className?: string }) {
  const R = HAND_RIG;
  return (
    <svg className={className} viewBox="0 0 420 640" aria-hidden="true" data-hand="">
      <defs>
        <linearGradient id="glove" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fdfcf8" />
          <stop offset="0.6" stopColor="#f1ede4" />
          <stop offset="1" stopColor="#d9d2c4" />
        </linearGradient>
        <linearGradient id="sleeve" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1d1d22" />
          <stop offset="0.45" stopColor="#0b0b0e" />
          <stop offset="1" stopColor="#1a1a20" />
        </linearGradient>
        <radialGradient id="link" cx="0.35" cy="0.35">
          <stop offset="0" stopColor="#fff1c2" />
          <stop offset="1" stopColor="#9b7632" />
        </radialGradient>
      </defs>

      <g data-hand-body="">
        {/* Sleeve and cuff */}
        <path d="M118 640 L134 500 H302 L318 640 Z" fill="url(#sleeve)" />
        <path d="M150 500 L146 640" stroke="#2a2a31" strokeWidth="2" />
        <rect x="128" y="462" width="180" height="50" rx="7" fill="#f8f6f1" stroke={STROKE} strokeWidth={SW} />
        <circle cx="286" cy="487" r="7" fill="url(#link)" stroke={STROKE} strokeWidth="2" />

        {/* Folded ring and little fingers sit behind the palm edge */}
        <g transform={`translate(${R.pinky.base[0]} ${R.pinky.base[1]})`}>
          <g data-joint="pinky-1" transform="rotate(14)">
            <Capsule len={R.pinky.len1} width={30} />
            <path d="M-9 -24 q9 5 18 0" fill="none" stroke="#b7afa1" strokeWidth="1.6" />
          </g>
        </g>
        <g transform={`translate(${R.ring.base[0]} ${R.ring.base[1]})`}>
          <g data-joint="ring-1" transform="rotate(6)">
            <Capsule len={R.ring.len1} width={34} />
            <path d="M-10 -30 q10 5 20 0" fill="none" stroke="#b7afa1" strokeWidth="1.6" />
          </g>
        </g>

        {/* Index finger — extended */}
        <Finger name="index" base={R.index.base} len1={R.index.len1} len2={R.index.len2} width={36} a1={-8} a2={6} />

        {/* Palm / back of the glove */}
        <path
          d="M148 470 C138 420 134 378 140 334 C145 304 165 290 192 290 L276 288 C300 290 310 312 308 342 C306 392 298 432 290 470 Z"
          fill="url(#glove)"
          stroke={STROKE}
          strokeWidth={SW}
          strokeLinejoin="round"
        />
        {/* Classic three-line stitching on the back of the glove */}
        <g fill="none" stroke="#bdb5a7" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round">
          <path d="M196 312 C198 350 200 390 204 440" />
          <path d="M228 308 C229 350 230 390 232 440" />
          <path d="M260 312 C259 350 258 390 258 440" />
        </g>

        {/* Thumb */}
        <Finger name="thumb" base={R.thumb.base} len1={R.thumb.len1} len2={R.thumb.len2} width={40} a1={-10} a2={30} />

        {/* Middle finger — curled over onto the thumb, ready to snap */}
        <Finger name="middle" base={R.middle.base} len1={R.middle.len1} len2={R.middle.len2} width={36} a1={-35} a2={-90} />

        {/* Motion smear drawn for a couple of frames at the snap */}
        <path data-smear="" d="M146 262 C160 292 180 312 200 322" fill="none" stroke="#fdfcf8" strokeWidth="26" strokeLinecap="round" opacity="0" />
      </g>
    </svg>
  );
}
