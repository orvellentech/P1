/** Engraved-style ornaments for the antique chapters. */

export function Flourish({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 40" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" data-draw>
        <path d="M150 20 C130 4 110 4 100 14 C92 22 100 30 108 26 C114 23 112 16 106 16" />
        <path d="M150 20 C170 4 190 4 200 14 C208 22 200 30 192 26 C186 23 188 16 194 16" />
        <path d="M100 20 H18" />
        <path d="M200 20 H282" />
        <path d="M150 20 C140 30 132 34 124 34" />
        <path d="M150 20 C160 30 168 34 176 34" />
      </g>
      <path d="M150 12 l6 8 l-6 8 l-6 -8 z" fill="currentColor" />
      <circle cx="14" cy="20" r="2.2" fill="currentColor" />
      <circle cx="286" cy="20" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function Divider(props: React.SVGProps<SVGSVGElement> & { "data-divider"?: string }) {
  return (
    <svg {...props} viewBox="0 0 420 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" data-draw>
        <path d="M10 12 H180" />
        <path d="M240 12 H410" />
        <path d="M180 12 C190 2 200 2 210 12 C220 22 230 22 240 12" />
        <path d="M180 12 C190 22 200 22 210 12 C220 2 230 2 240 12" />
      </g>
      <circle cx="210" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}
