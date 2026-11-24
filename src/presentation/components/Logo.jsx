// Logo W Drivers: W con volante integrado, negro y dorado.
export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="W Drivers">
      <defs>
        <linearGradient id="wdGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F9D976" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#9E7C16" />
        </linearGradient>
        <radialGradient id="wdBg" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="200" rx="44" fill="url(#wdBg)" />
      <rect x="3" y="3" width="194" height="194" rx="41" fill="none" stroke="url(#wdGold)" strokeWidth="2" opacity="0.5" />
      <g transform="translate(100,104)">
        <circle cx="0" cy="0" r="52" fill="none" stroke="url(#wdGold)" strokeWidth="7" />
        <circle cx="0" cy="0" r="11" fill="url(#wdGold)" />
        <rect x="-46" y="-4.5" width="35" height="9" rx="4.5" fill="url(#wdGold)" />
        <rect x="11" y="-4.5" width="35" height="9" rx="4.5" fill="url(#wdGold)" />
        <rect x="-4.5" y="11" width="9" height="38" rx="4.5" fill="url(#wdGold)" />
      </g>
      <path d="M 56 60 L 72 60 L 84 104 L 100 68 L 116 104 L 128 60 L 144 60 L 124 134 L 108 134 L 100 104 L 92 134 L 76 134 Z"
        fill="url(#wdGold)" stroke="#0a0a0a" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
