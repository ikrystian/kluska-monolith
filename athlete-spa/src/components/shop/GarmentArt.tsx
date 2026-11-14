import type { ProductCategory, ProductColor } from '@/lib/shop';

const TEE_BODY =
  'M70 30 C82 44 118 44 130 30 L172 48 L190 88 L162 98 L152 80 L152 176 L48 176 L48 80 L38 98 L10 88 L28 48 Z';
const HOODIE_BODY =
  'M72 46 L34 62 L12 152 L40 160 L52 108 L52 180 L148 180 L148 108 L160 160 L188 152 L166 62 L128 46 C118 62 82 62 72 46 Z';
const HOODIE_HOOD = 'M72 46 C66 14 134 14 128 46 C118 62 82 62 72 46 Z';

interface GarmentArtProps {
  category: ProductCategory;
  color: ProductColor;
  print: string[];
  className?: string;
}

/** The product drawn in its fabric colour with its chest print — stands in for a photo. */
export function GarmentArt({ category, color, print, className }: GarmentArtProps) {
  const hoodie = category === 'hoodie';
  const shade = 'rgb(0 0 0 / 0.16)';
  // Keeps a black garment readable on the dark theme's tile.
  const edge = { stroke: 'hsl(var(--foreground) / 0.2)', strokeWidth: 1.5, strokeLinejoin: 'round' as const };
  const printTop = hoodie ? 100 : 92;

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={`${hoodie ? 'Bluza' : 'Koszulka'}, ${color.name.toLowerCase()}`}>
      <ellipse cx="100" cy="188" rx="62" ry="5" fill="rgb(0 0 0 / 0.18)" />
      {hoodie ? (
        <>
          <path d={HOODIE_BODY} fill={color.fill} {...edge} />
          <path d={HOODIE_HOOD} fill={color.fill} {...edge} />
          <path d="M80 46 C80 28 120 28 120 46 C112 56 88 56 80 46 Z" fill={shade} />
          <path d={HOODIE_HOOD} fill="none" stroke={shade} strokeWidth="2" />
          <path d="M92 58 V82 M108 58 V82" stroke={color.ink} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M74 142 H126 L134 172 H66 Z" fill="none" stroke={shade} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M52 172 H148 V180 H52 Z" fill={shade} />
          <path d="M52 108 V172 M148 108 V172" stroke={shade} strokeWidth="2" />
        </>
      ) : (
        <>
          <path d={TEE_BODY} fill={color.fill} {...edge} />
          <path d="M70 30 C82 44 118 44 130 30 L124 28 C114 38 86 38 76 28 Z" fill={shade} />
          <path d="M48 80 V176 M152 80 V176" stroke={shade} strokeWidth="2" />
        </>
      )}
      {print.map((line, index) => (
        <text
          key={line}
          x="100"
          y={printTop + index * 19}
          textAnchor="middle"
          fill={color.ink}
          fontSize="20"
          fontWeight="700"
          letterSpacing="0.5"
          style={{ fontFamily: 'var(--font-display-stack)' }}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
