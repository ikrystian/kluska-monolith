import './pet.css';

/**
 * Skrzynia za rekord. `closed` kołysze się zachęcająco, `shake` to chwila
 * przed otwarciem, `open` unosi wieko i wypuszcza światło.
 */
export type ChestState = 'closed' | 'shake' | 'open';

export function ChestArt({ state = 'closed', size = 120 }: { state?: ChestState; size?: number }) {
  const cls = state === 'open' ? 'chest chest-open' : 'chest';
  const motion = state === 'closed' ? 'chest-idle' : state === 'shake' ? 'chest-shake' : undefined;

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={cls} style={{ overflow: 'visible' }} aria-hidden>
      <defs>
        <radialGradient id="chest-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3B0" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#FFD24D" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FFD24D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="chest-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B4713A" />
          <stop offset="1" stopColor="#8A4F24" />
        </linearGradient>
        <linearGradient id="chest-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D08A4C" />
          <stop offset="1" stopColor="#A9652F" />
        </linearGradient>
        <clipPath id="chest-lid-clip">
          <path d="M14 62 V44 C14 30 26 22 60 22 C94 22 106 30 106 44 V62 Z" />
        </clipPath>
        <linearGradient id="chest-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset="1" stopColor="#E0A200" />
        </linearGradient>
      </defs>

      <g className="chest-rays" style={{ transformOrigin: '60px 58px' }}>
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d="M60 58 L52 -22 H68 Z" fill="#FFE27A" opacity={0.5} transform={`rotate(${i * 36} 60 58)`} />
        ))}
      </g>
      <circle className="chest-light" cx={60} cy={54} r={62} fill="url(#chest-glow)" />

      <ellipse cx={60} cy={106} rx={44} ry={6} fill="#000" opacity={0.22} />

      <g className={motion} style={{ transformOrigin: '60px 104px' }}>
        {/* Wnętrze widoczne po uniesieniu wieka */}
        <path d="M20 60 H100 V70 H20 Z" fill="#3A2110" />
        <ellipse className="chest-light" cx={60} cy={62} rx={36} ry={9} fill="#FFE27A" />

        {/* Skrzynia */}
        <path d="M16 60 H104 V98 C104 102 101 104 98 104 H22 C19 104 16 102 16 98 Z" fill="url(#chest-wood)" />
        <path d="M16 74 H104 M16 88 H104" stroke="#6F3D1A" strokeWidth={1.6} opacity={0.6} />
        <path d="M16 60 H104 V66 H16 Z" fill="#6F3D1A" opacity={0.5} />
        {[16, 92].map(x => (
          <rect key={x} x={x} y={60} width={12} height={44} rx={2} fill="url(#chest-gold)" />
        ))}
        <rect x={52} y={60} width={16} height={44} fill="url(#chest-gold)" />
        {[22, 98].map(x => (
          <g key={x} fill="#B77400">
            <circle cx={x} cy={68} r={1.8} />
            <circle cx={x} cy={96} r={1.8} />
          </g>
        ))}

        {/* Wieko */}
        <g className="chest-lid" style={{ transformOrigin: '18px 60px' }}>
          <path d="M14 62 V44 C14 30 26 22 60 22 C94 22 106 30 106 44 V62 Z" fill="url(#chest-lid)" />
          <path d="M14 46 C30 40 90 40 106 46" fill="none" stroke="#8A4F24" strokeWidth={1.6} opacity={0.6} />
          <path d="M22 36 C32 28 46 26 60 26" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />
          <g clipPath="url(#chest-lid-clip)">
            <rect x={14} y={20} width={13} height={44} fill="url(#chest-gold)" />
            <rect x={93} y={20} width={13} height={44} fill="url(#chest-gold)" />
          </g>
          <rect x={52} y={22} width={16} height={40} fill="url(#chest-gold)" />
          <rect x={12} y={56} width={96} height={8} rx={2.5} fill="url(#chest-gold)" />
          {/* Zamek */}
          <path d="M50 54 H70 V70 C70 75 66 78 60 78 C54 78 50 75 50 70 Z" fill="#FFD24D" stroke="#B77400" strokeWidth={2} />
          <circle cx={60} cy={64} r={3.4} fill="#7A4A00" />
          <path d="M58.6 65 H61.4 L62.4 72 H57.6 Z" fill="#7A4A00" />
        </g>
      </g>

      <g fill="#fff">
        {[
          [18, 30],
          [102, 22],
          [88, 4],
        ].map(([x, y]) => (
          <path
            key={`${x}-${y}`}
            className="chest-spark"
            d={`M${x} ${y - 8} L${x + 2} ${y - 2} L${x + 8} ${y} L${x + 2} ${y + 2} L${x} ${y + 8} L${x - 2} ${y + 2} L${x - 8} ${y} L${x - 2} ${y - 2} Z`}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        ))}
      </g>
    </svg>
  );
}
