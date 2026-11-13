import { useId, type CSSProperties, type ReactNode } from 'react';
import type { PetBuild, PetMood, PetSlot, PetSpecies, PetStage } from '@/models/types/pet';
import { ItemGlyph } from './ItemArt';
import './pet.css';

/**
 * Zwierzak rysowany w kodzie (viewBox 200×200, stopy na y=188).
 *
 * Budowa: nieruchome transformacje (etap, lustro lewej strony) siedzą w atrybutach
 * `transform`, a wszystko, co się rusza, dostaje klasę z `pet.css` i punkt obrotu
 * w jednostkach viewBoxa. Prawa łapka, ucho i stopa to lustrzane odbicie lewych,
 * więc jedna reguła CSS porusza obiema „na zewnątrz”.
 */

export type PetAction = 'idle' | 'cheer' | 'eat' | 'pet' | 'header' | 'tug' | 'chew' | 'catch' | 'lift' | 'run';

/** Która animacja odpowiada której zabawce. */
export const TOY_ACTION: Record<string, PetAction> = {
  toy_ball: 'header',
  toy_rope: 'tug',
  toy_chew: 'chew',
  toy_frisbee: 'catch',
  toy_dumbbells: 'lift',
  toy_treadmill: 'run',
};

const INK = '#2A1D19';

interface Look {
  fur: string;
  shade: string;
  light: string;
  belly: string;
  bellyShade: string;
  earInner: string;
  nose: string;
  /** Łapki i stopy. */
  paw: string;
  pawShade: string;
  blush: string;
  /** Pół odległości między oczami, promienie oka, wysokość nosa. */
  eyeDx: number;
  eye: [number, number];
  noseY: number;
}

const LOOKS: Record<PetSpecies, Look> = {
  hamster: {
    fur: '#F4B768',
    shade: '#D98D44',
    light: '#FCD596',
    belly: '#FFF5E3',
    bellyShade: '#F1DDBD',
    earInner: '#F6A49B',
    nose: '#E57C73',
    paw: '#F9CFA4',
    pawShade: '#E3A873',
    blush: '#FF93A4',
    eyeDx: 20,
    eye: [7, 8.6],
    noseY: 91,
  },
  fox: {
    fur: '#F4803E',
    shade: '#C9551F',
    light: '#FBA468',
    belly: '#FFF7EE',
    bellyShade: '#EFDCC8',
    earInner: '#FFE6D2',
    nose: '#2B1F1C',
    paw: '#4A2E26',
    pawShade: '#33201B',
    blush: '#FF8F86',
    eyeDx: 18,
    eye: [6.6, 8.4],
    noseY: 97,
  },
  bear: {
    fur: '#AD7B52',
    shade: '#7F5437',
    light: '#C89870',
    belly: '#ECD4B0',
    bellyShade: '#D6B68B',
    earInner: '#E6C29A',
    nose: '#3A261B',
    paw: '#8C6042',
    pawShade: '#6F4A32',
    blush: '#F28B7D',
    eyeDx: 17,
    eye: [6, 7.2],
    noseY: 92,
  },
};

const STAGE_SCALE: Record<PetStage, { all: number; head: number }> = {
  baby: { all: 0.72, head: 1.18 },
  junior: { all: 0.86, head: 1.08 },
  adult: { all: 1, head: 1 },
  master: { all: 1.04, head: 1 },
};

/** Barki, biodra, dół tułowia i grubość łapki — z tego wynika sylwetka. */
const BUILDS: Record<PetBuild, { sw: number; hw: number; bottom: number; arm: number; footRx: number; footX: number }> = {
  balanced: { sw: 31, hw: 45, bottom: 186, arm: 7.6, footRx: 15, footX: 80 },
  runner: { sw: 27, hw: 37, bottom: 180, arm: 6.6, footRx: 13, footX: 83 },
  strong: { sw: 41, hw: 44, bottom: 186, arm: 9.6, footRx: 16, footX: 79 },
};

type EyeStyle = 'open' | 'sparkle' | 'half' | 'sleep' | 'joy' | 'sad' | 'up' | 'focus';
type MouthStyle = 'smile' | 'open' | 'o' | 'frown' | 'flat' | 'chew' | 'grit' | 'none';
type BrowStyle = 'none' | 'sad' | 'up' | 'focus' | 'flat';

interface Expression {
  eyes: EyeStyle;
  mouth: MouthStyle;
  brows: BrowStyle;
  blush: number;
}

function expressionFor(mood: PetMood, action: PetAction): Expression {
  switch (action) {
    case 'cheer':
      return { eyes: 'sparkle', mouth: 'open', brows: 'up', blush: 0.7 };
    case 'eat':
      return { eyes: 'joy', mouth: 'chew', brows: 'none', blush: 0.85 };
    case 'pet':
      return { eyes: 'joy', mouth: 'smile', brows: 'none', blush: 0.95 };
    case 'header':
      return { eyes: 'up', mouth: 'open', brows: 'up', blush: 0.6 };
    case 'tug':
      return { eyes: 'focus', mouth: 'grit', brows: 'focus', blush: 0.6 };
    case 'chew':
      return { eyes: 'joy', mouth: 'none', brows: 'none', blush: 0.8 };
    case 'catch':
      return { eyes: 'sparkle', mouth: 'open', brows: 'up', blush: 0.6 };
    case 'lift':
      return { eyes: 'focus', mouth: 'grit', brows: 'focus', blush: 0.75 };
    case 'run':
      return { eyes: 'open', mouth: 'open', brows: 'up', blush: 0.8 };
    default:
      break;
  }
  switch (mood) {
    case 'energetic':
      return { eyes: 'sparkle', mouth: 'open', brows: 'up', blush: 0.6 };
    case 'hungry':
      return { eyes: 'open', mouth: 'o', brows: 'sad', blush: 0.4 };
    case 'sad':
      return { eyes: 'sad', mouth: 'frown', brows: 'sad', blush: 0.2 };
    case 'lazy':
      return { eyes: 'half', mouth: 'flat', brows: 'flat', blush: 0.35 };
    case 'sleepy':
      return { eyes: 'sleep', mouth: 'o', brows: 'none', blush: 0.4 };
    default:
      return { eyes: 'open', mouth: 'smile', brows: 'none', blush: 0.5 };
  }
}

const origin = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });
const MIRROR = 'matrix(-1 0 0 1 200 0)';

/* ---------- Głowa ---------- */

const FOX_HEAD =
  'M100 38 C128 38 146 56 148 78 C156 84 160 92 163 101 C153 100 146 102 140 107 C130 118 116 124 100 124 C84 124 70 118 60 107 C54 102 47 100 37 101 C40 92 44 84 52 78 C54 56 72 38 100 38 Z';

function HeadShape({ species, fill }: { species: PetSpecies; fill: string }) {
  if (species === 'fox') return <path d={FOX_HEAD} fill={fill} />;
  if (species === 'hamster') return <ellipse cx={100} cy={80} rx={52} ry={42} fill={fill} />;
  return <ellipse cx={100} cy={80} rx={46} ry={42} fill={fill} />;
}

/** Jaśniejsze znaczenia pyszczka — to one najmocniej odróżniają gatunki. */
function FaceMask({ species, look }: { species: PetSpecies; look: Look }) {
  if (species === 'fox') {
    return (
      <path
        d="M30 104 C46 96 60 92 72 92 C85 92 95 99 100 110 C105 99 115 92 128 92 C140 92 154 96 170 104 L150 130 H50 Z"
        fill={look.belly}
      />
    );
  }
  if (species === 'bear') {
    return (
      <>
        <ellipse cx={100} cy={100} rx={22} ry={17} fill={look.belly} />
        <ellipse cx={100} cy={106} rx={15} ry={8} fill={look.bellyShade} opacity={0.5} />
      </>
    );
  }
  return (
    <path
      d="M44 86 C54 77 70 82 81 91 C89 97 94 98 100 98 C106 98 111 97 119 91 C130 82 146 77 156 86 L150 130 H50 Z"
      fill={look.belly}
    />
  );
}

function Ear({ species, look, id }: { species: PetSpecies; look: Look; id: string }) {
  if (species === 'fox') {
    return (
      <g className="pet-ear" style={origin(76, 58)}>
        <path d="M58 68 C52 46 54 24 59 10 C75 21 90 37 96 52 Z" fill={`url(#${id}-fur)`} />
        <path d="M64 60 C60 46 61 32 64 23 C73 31 82 41 87 51 Z" fill={look.earInner} />
        <path d="M59 10 C56.6 18 55.6 25 55.6 31 C61 28 67 26 71 21.6 C67 17 63 13 59 10 Z" fill="#3E2A25" />
      </g>
    );
  }
  if (species === 'bear') {
    return (
      <g className="pet-ear" style={origin(72, 58)}>
        <circle cx={64} cy={47} r={16.5} fill={`url(#${id}-fur)`} />
        <circle cx={64.5} cy={48} r={9.2} fill={look.earInner} />
        <path d="M57 43 a9 9 0 0 1 8 -4.4" fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g className="pet-ear" style={origin(70, 56)}>
      <ellipse cx={62} cy={45} rx={13.5} ry={14.5} fill={`url(#${id}-fur)`} transform="rotate(-14 62 45)" />
      <ellipse cx={62.6} cy={46.4} rx={8} ry={9} fill={look.earInner} transform="rotate(-14 62 45)" />
    </g>
  );
}

function Eye({ cx, cy, rx, ry, style, look }: { cx: number; cy: number; rx: number; ry: number; style: EyeStyle; look: Look }) {
  const stroke = { fill: 'none', stroke: INK, strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (style === 'sleep') return <path d={`M${cx - 7.5} ${cy + 1} Q${cx} ${cy + 7.5} ${cx + 7.5} ${cy + 1}`} {...stroke} />;
  if (style === 'joy') return <path d={`M${cx - 7.5} ${cy + 3} Q${cx} ${cy - 6.5} ${cx + 7.5} ${cy + 3}`} {...stroke} />;

  const big = style === 'sparkle' || style === 'sad' ? 1.12 : 1;
  const erx = rx * big;
  const ery = ry * big;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={erx} ry={ery} fill={INK} />
      <ellipse cx={cx} cy={cy + ery * 0.42} rx={erx * 0.68} ry={ery * 0.34} fill="#7A5140" opacity={0.75} />
      <circle cx={cx - erx * 0.3} cy={cy - ery * 0.36} r={erx * 0.42} fill="#fff" />
      <circle cx={cx + erx * 0.36} cy={cy + ery * 0.34} r={erx * 0.2} fill="#fff" opacity={0.9} />
      {style === 'sparkle' && (
        <path
          d={`M${cx + erx * 0.3} ${cy - ery * 0.62} l1 2.2 l2.2 1 l-2.2 1 l-1 2.2 l-1 -2.2 l-2.2 -1 l2.2 -1 Z`}
          fill="#fff"
        />
      )}
      {style === 'sad' && <ellipse cx={cx} cy={cy + ery * 0.5} rx={erx * 0.62} ry={ery * 0.26} fill="#BFE3F2" opacity={0.85} />}
      {style === 'half' && (
        <>
          {/* Powieka w kolorze futra zasłania górę oka */}
          <path d={`M${cx - erx - 2} ${cy - ery - 2} H${cx + erx + 2} V${cy - 0.5} H${cx - erx - 2} Z`} fill={look.fur} />
          <path d={`M${cx - erx - 0.5} ${cy - 0.5} H${cx + erx + 0.5}`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function Brows({ style, dx, y, color }: { style: BrowStyle; dx: number; y: number; color: string }) {
  if (style === 'none') return null;
  const tilt: Record<Exclude<BrowStyle, 'none'>, [number, number]> = {
    // [wewnętrzny koniec, zewnętrzny koniec] względem y
    sad: [-4, 2],
    up: [-3, -1],
    focus: [3, -2.5],
    flat: [2, 2],
  };
  const [inner, outer] = tilt[style];
  return (
    <g fill="none" stroke={color} strokeWidth={3} strokeLinecap="round">
      <path d={`M${100 - dx + 6.5} ${y + inner} L${100 - dx - 6.5} ${y + outer}`} />
      <path d={`M${100 + dx - 6.5} ${y + inner} L${100 + dx + 6.5} ${y + outer}`} />
    </g>
  );
}

function Nose({ species, look }: { species: PetSpecies; look: Look }) {
  const y = look.noseY;
  if (species === 'bear') {
    return (
      <>
        <ellipse cx={100} cy={y} rx={7.6} ry={5.4} fill={look.nose} />
        <ellipse cx={98} cy={y - 1.8} rx={2.8} ry={1.4} fill="#fff" opacity={0.45} />
      </>
    );
  }
  if (species === 'fox') {
    return (
      <>
        <path d={`M93 ${y - 3.5} Q100 ${y - 6.5} 107 ${y - 3.5} Q106 ${y + 4.5} 100 ${y + 4.5} Q94 ${y + 4.5} 93 ${y - 3.5} Z`} fill={look.nose} />
        <ellipse cx={98} cy={y - 2.4} rx={2.6} ry={1.2} fill="#fff" opacity={0.4} />
      </>
    );
  }
  return (
    <>
      <path d={`M95.4 ${y - 2.6} Q100 ${y - 4.6} 104.6 ${y - 2.6} Q103.6 ${y + 3} 100 ${y + 3} Q96.4 ${y + 3} 95.4 ${y - 2.6} Z`} fill={look.nose} />
      <ellipse cx={98.8} cy={y - 1.8} rx={1.6} ry={0.9} fill="#fff" opacity={0.6} />
    </>
  );
}

function Mouth({ style, y, species }: { style: MouthStyle; y: number; species: PetSpecies }) {
  const line = { fill: 'none', stroke: INK, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const teeth = species === 'hamster';
  switch (style) {
    case 'none':
      return null;
    case 'open':
      return (
        <g>
          <path d={`M90.5 ${y - 1} Q100 ${y + 2} 109.5 ${y - 1} Q108.5 ${y + 12} 100 ${y + 12} Q91.5 ${y + 12} 90.5 ${y - 1} Z`} fill="#7B2D36" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <ellipse cx={100} cy={y + 8.6} rx={5} ry={3} fill="#F2828E" />
          {teeth && <path d={`M96.6 ${y + 0.6} h6.8 v3.4 a1.2 1.2 0 0 1 -1.2 1.2 h-4.4 a1.2 1.2 0 0 1 -1.2 -1.2 Z M100 ${y + 0.6} v4.4`} fill="#fff" stroke={INK} strokeWidth={0.9} />}
        </g>
      );
    case 'o':
      return <ellipse cx={100} cy={y + 4} rx={4.2} ry={4.8} fill="#7B2D36" stroke={INK} strokeWidth={1.8} />;
    case 'frown':
      return <path d={`M93 ${y + 6} Q100 ${y - 0.5} 107 ${y + 6}`} {...line} />;
    case 'flat':
      return <path d={`M94.5 ${y + 3} Q100 ${y + 4.2} 105.5 ${y + 3}`} {...line} />;
    case 'grit':
      return (
        <g>
          <rect x={92} y={y - 0.5} width={16} height={8} rx={3.4} fill="#fff" stroke={INK} strokeWidth={2} />
          <path d={`M92.6 ${y + 3.5} H107.4 M97 ${y} v7.2 M103 ${y} v7.2`} stroke={INK} strokeWidth={1.1} />
        </g>
      );
    case 'chew':
      return <path d={`M94 ${y + 2.5} Q97 ${y + 5.5} 100 ${y + 2.5} Q103 ${y + 5.5} 106 ${y + 2.5}`} {...line} />;
    default:
      return (
        <g>
          <path d={`M100 ${y - 3.6} V${y + 0.4}`} {...line} strokeWidth={2} />
          <path d={`M92 ${y - 0.6} Q96 ${y + 5.4} 100 ${y + 0.4} Q104 ${y + 5.4} 108 ${y - 0.6}`} {...line} />
        </g>
      );
  }
}

/* ---------- Ubranka ---------- */

function HeadWear({ item }: { item?: string }) {
  if (item === 'wear_cap') {
    return (
      <g>
        <path d="M54 63 C52 26 148 26 146 63 C128 55 72 55 54 63 Z" fill="#E4572E" />
        <path d="M100 30 C128 30 147 44 146 63 C138 59 128 57 116 56 C116 44 110 34 100 30 Z" fill="#C44420" />
        <path d="M100 30 C92 36 87 46 86 56" fill="none" stroke="#B93C1A" strokeWidth={1.4} />
        <path d="M64 52 C66 42 72 36 80 33" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />
        <path d="M60 60 C84 52 122 52 152 62 C158 68 152 73 140 71 C116 66 86 65 62 67 C57 66 56 62 60 60 Z" fill="#B93C1A" />
        <path d="M60 60 C84 52 122 52 152 62 C128 57 88 57 61 63 Z" fill="#EA6B46" />
        <circle cx={100} cy={30} r={4.4} fill="#FFD166" />
      </g>
    );
  }
  if (item === 'wear_headband') {
    return (
      <g>
        <g className="pet-knot" style={origin(146, 60)}>
          <path d="M144 58 L166 50 L162 62 L170 72 L148 66 Z" fill="#2563D9" />
          <path d="M146 60 L162 55" stroke="#6BA1FF" strokeWidth={1.6} strokeLinecap="round" />
        </g>
        <path d="M53 66 C66 50 134 50 147 66 L146 76 C132 62 68 62 54 76 Z" fill="#3D7FF0" />
        <path d="M54 71.4 C68 58 132 58 146 71.4 L146 76 C132 62 68 62 54 76 Z" fill="#2563D9" />
        <path d="M58 66 C72 55 128 55 142 66" fill="none" stroke="#fff" strokeOpacity={0.9} strokeWidth={2.2} />
        <circle cx={146} cy={66} r={5} fill="#1E4FB3" />
      </g>
    );
  }
  return null;
}

function EyeWear({ item, dx }: { item?: string; dx: number }) {
  if (item !== 'wear_sunglasses') return null;
  const l = 100 - dx;
  const r = 100 + dx;
  const lens = (cx: number) => `M${cx - 15} 70 H${cx + 15} C${cx + 16} 82 ${cx + 10} 92 ${cx} 92 C${cx - 10} 92 ${cx - 16} 82 ${cx - 15} 70 Z`;
  return (
    <g>
      <path d={`M${l - 16} 71 L${l - 30} 66 M${r + 16} 71 L${r + 30} 66`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${l + 14} 73 Q100 68 ${r - 14} 73`} fill="none" stroke={INK} strokeWidth={3.4} />
      <path d={lens(l)} fill="#17171D" />
      <path d={lens(r)} fill="#17171D" />
      <path d={`M${l - 15} 70 H${l + 15} M${r - 15} 70 H${r + 15}`} stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
      <path d={`M${l - 9} 75 H${l + 3} L${l - 6} 87 Z M${r - 9} 75 H${r + 3} L${r - 6} 87 Z`} fill="#6BA1FF" opacity={0.5} />
      <path d={`M${l + 8} 75 l-7 12 M${r + 8} 75 l-7 12`} stroke="#fff" strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

/* ---------- Rekwizyty ---------- */

function Dumbbell({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 12} y={y - 2.4} width={24} height={4.8} rx={2} fill="#C4CBD6" />
      {[-1, 1].map(side => (
        <g key={side}>
          <rect x={x + side * 15 - 4.5} y={y - 9} width={9} height={18} rx={3} fill="#FF6B2C" />
          <rect x={x + side * 15 - 4.5} y={y - 9} width={9} height={5} rx={2.5} fill="#FF935F" />
          <rect x={x + side * 15 - 4.5} y={y + 4} width={9} height={5} rx={2.5} fill="#D9501A" />
        </g>
      ))}
    </g>
  );
}

function Treadmill() {
  return (
    <g>
      {/* Słupki i konsola — widok od frontu, za zwierzakiem */}
      {[38, 162].map(x => (
        <g key={x}>
          <rect x={x - 4} y={96} width={8} height={92} rx={4} fill="#8D97A8" />
          <rect x={x - 4} y={96} width={3} height={92} rx={1.5} fill="#B9C1CD" />
          <rect x={x - 7} y={88} width={14} height={16} rx={6} fill="#2B303B" />
        </g>
      ))}
      <rect x={38} y={104} width={124} height={7} rx={3.5} fill="#5B6577" />
      {/* Pas biegnie w stronę widza */}
      <path d="M40 180 H160 L176 200 H24 Z" fill="#232831" />
      <clipPath id="pet-belt-clip">
        <path d="M46 182 H154 L166 198 H34 Z" />
      </clipPath>
      <path d="M46 182 H154 L166 198 H34 Z" fill="#3A4150" />
      <g clipPath="url(#pet-belt-clip)">
        <g className="pet-belt">
          {[166, 174, 182, 190, 198].map(y => (
            <path key={y} d={`M24 ${y} H176`} stroke="#566074" strokeWidth={2.4} />
          ))}
        </g>
      </g>
      <path d="M24 200 H176 V204 C176 206 174.6 207 173 207 H27 C25.4 207 24 206 24 204 Z" fill="#171A21" />
      <rect x={30} y={202} width={10} height={2.6} rx={1.3} fill="#FF6B2C" />
    </g>
  );
}

const CONFETTI: [number, number, string, number, number, number][] = [
  // x, y, kolor, dx, dy, obrót
  [70, 70, '#FF4D6D', -46, -50, -200],
  [130, 70, '#3D7FF0', 46, -54, 220],
  [60, 96, '#FFC53D', -62, -18, 160],
  [140, 96, '#7CE0A3', 62, -22, -180],
  [86, 54, '#C8FF3D', -22, -70, 260],
  [114, 54, '#FF935F', 24, -68, -240],
  [100, 48, '#B892FF', 2, -80, 120],
];

/* ---------- Awatar ---------- */

export interface PetAvatarProps {
  species: PetSpecies;
  stage?: PetStage;
  build?: PetBuild;
  mood?: PetMood;
  equipped?: Partial<Record<PetSlot, string>>;
  shiny?: boolean;
  action?: PetAction;
  /** Klucz jedzenia trzymanego w łapkach podczas `eat`. */
  food?: string;
  size?: number;
  /** Pozycja, gdy awatar jest osadzony w SVG pokoju. */
  x?: number;
  y?: number;
  className?: string;
  /** Wyłącza ruch w miniaturach list (sklep, drużyna). */
  still?: boolean;
  children?: ReactNode;
}

export function PetAvatar({
  species,
  stage = 'adult',
  build = 'balanced',
  mood = 'happy',
  equipped = {},
  shiny = false,
  action = 'idle',
  food,
  size = 160,
  x,
  y,
  className,
  still = false,
  children,
}: PetAvatarProps) {
  const id = `pet${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const look = LOOKS[species];
  const scale = STAGE_SCALE[stage];
  const b = BUILDS[build];
  const face = expressionFor(mood, action);
  const fur = `url(#${id}-fur)`;

  const top = 104;
  const shoulderY = top + 19;
  const armX = 100 - b.sw - 1;
  const armLen = 27;
  const pawY = shoulderY + armLen - b.arm + 1;
  const bodyPath = `M${100 - b.sw} ${top + 15} C${100 - b.sw} ${top - 2} ${100 + b.sw} ${top - 2} ${100 + b.sw} ${top + 15} C${100 + b.hw + 7} ${top + 36} ${100 + b.hw + 2} ${b.bottom} 100 ${b.bottom} C${100 - b.hw - 2} ${b.bottom} ${100 - b.hw - 7} ${top + 36} ${100 - b.sw} ${top + 15} Z`;
  const bellyCy = b.bottom - 35;
  const mouthY = look.noseY + 9;
  const eyeL = 100 - look.eyeDx;
  const eyeR = 100 + look.eyeDx;
  const eyesHidden = equipped.eyes === 'wear_sunglasses';

  /* Jedna strona ciała; prawa to jej lustrzane odbicie. */
  const arm = (
    <g className="pet-arm" style={origin(armX, shoulderY)}>
      {build === 'strong' && <ellipse cx={armX - 2} cy={shoulderY + 9} rx={b.arm + 2.6} ry={10} fill={fur} />}
      <rect x={armX - b.arm} y={shoulderY - b.arm} width={b.arm * 2} height={armLen + b.arm} rx={b.arm} fill={fur} />
      <circle cx={armX} cy={pawY} r={b.arm + 0.9} fill={look.paw} />
      <path d={`M${armX - 3} ${pawY + 3.4} v3 M${armX + 2} ${pawY + 3.8} v3`} stroke={look.pawShade} strokeWidth={1.3} strokeLinecap="round" />
      {equipped.wrists === 'wear_wristbands' && (
        <g>
          <rect x={armX - b.arm - 1.4} y={pawY - 15} width={b.arm * 2 + 2.8} height={9.6} rx={3.4} fill="#FF4D6D" />
          <rect x={armX - b.arm - 1.4} y={pawY - 11.6} width={b.arm * 2 + 2.8} height={2.8} fill="#fff" opacity={0.9} />
        </g>
      )}
      {action === 'lift' && <Dumbbell x={armX} y={pawY + 1} />}
    </g>
  );

  const foot = (
    <g className="pet-foot" style={origin(b.footX, 176)}>
      <rect x={b.footX - 7} y={166} width={14} height={18} rx={6} fill={look.shade} />
      {equipped.feet === 'wear_sneakers' ? (
        <g>
          <path d={`M${b.footX - 17} 190 C${b.footX - 18} 178 ${b.footX - 10} 171 ${b.footX} 171 C${b.footX + 10} 171 ${b.footX + 17} 178 ${b.footX + 17} 187 V190 Z`} fill="#F7F7FA" />
          <path d={`M${b.footX - 10} 190 C${b.footX - 10} 183 ${b.footX - 5} 179 ${b.footX} 179 C${b.footX + 5} 179 ${b.footX + 10} 183 ${b.footX + 10} 190 Z`} fill="#E4E6EC" />
          <path d={`M${b.footX - 5} 176.6 h10 M${b.footX - 6} 180 h12`} stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
          <path d={`M${b.footX - 14} 181 l5 -6`} stroke="#3D7FF0" strokeWidth={3} strokeLinecap="round" />
          <path d={`M${b.footX - 18} 188 H${b.footX + 18} V191 a2.4 2.4 0 0 1 -2.4 2.4 H${b.footX - 15.6} a2.4 2.4 0 0 1 -2.4 -2.4 Z`} fill="#FF6B2C" />
          <path d={`M${b.footX - 18} 188 H${b.footX + 18} v1.6 H${b.footX - 18} Z`} fill="#fff" />
        </g>
      ) : (
        <g>
          <ellipse cx={b.footX - 1} cy={185.4} rx={b.footRx + 1} ry={9} fill={look.paw} />
          <ellipse cx={b.footX - 1} cy={188.4} rx={b.footRx - 1} ry={5} fill={look.pawShade} opacity={0.5} />
          <path d={`M${b.footX - 7} 184.4 v4.4 M${b.footX - 1} 185 v4.4`} stroke={look.pawShade} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
    </g>
  );

  const cheek = (
    <ellipse
      className="pet-cheek"
      cx={100 - look.eyeDx - 13}
      cy={96}
      rx={8.6}
      ry={5.4}
      fill={look.blush}
      opacity={face.blush}
      style={origin(100 - look.eyeDx - 13, 96)}
    />
  );

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      x={x}
      y={y}
      className={className ? `pet ${className}` : 'pet'}
      data-action={action}
      data-mood={mood}
      data-still={still || undefined}
      role="img"
      aria-label="Zwierzak"
    >
      <defs>
        <linearGradient id={`${id}-fur`} x1="0.25" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor={look.light} />
          <stop offset="0.42" stopColor={look.fur} />
          <stop offset="1" stopColor={look.shade} />
        </linearGradient>
        <radialGradient id={`${id}-belly`} cx="0.5" cy="0.32" r="0.75">
          <stop offset="0" stopColor={look.belly} />
          <stop offset="1" stopColor={look.bellyShade} />
        </radialGradient>
        <radialGradient id={`${id}-aura`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE27A" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFE27A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-ray`} gradientUnits="userSpaceOnUse" cx={100} cy={112} r={88}>
          <stop offset="0.35" stopColor="#FFE27A" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFE27A" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-head`}>
          <HeadShape species={species} fill="#000" />
        </clipPath>
        <clipPath id={`${id}-body`}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      <ellipse className="pet-shadow" cx={100} cy={190} rx={50 * scale.all} ry={6.6} fill="#000" opacity={0.2} style={origin(100, 190)} />

      {stage === 'master' && (
        <g>
          <g className="pet-aura-rays" style={origin(100, 112)} opacity={0.5}>
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M100 112 L93 26 H107 Z" fill={`url(#${id}-ray)`} transform={`rotate(${i * 30} 100 112)`} />
            ))}
          </g>
          <circle className="pet-aura-glow" cx={100} cy={112} r={86} fill={`url(#${id}-aura)`} style={origin(100, 112)} />
        </g>
      )}

      <g transform={`translate(100 188) scale(${scale.all}) translate(-100 -188)`}>
        {action === 'run' && <Treadmill />}

        <g className="pet-jump" style={origin(100, 188)}>
          {/* Ogon */}
          {species === 'fox' && (
            <g className="pet-tail" style={origin(132, 172)}>
              <path d="M126 174 C150 190 190 176 188 138 C187 119 178 106 166 98 C171 118 163 137 146 146 C137 151 130 160 126 174 Z" fill={fur} />
              <path d="M166 98 C178 106 187 119 188 138 C181 133 173 130 164 130 C168 120 169 109 166 98 Z" fill={look.belly} />
              <path d="M140 172 C158 176 176 164 180 146" fill="none" stroke={look.shade} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />
            </g>
          )}
          {species === 'bear' && (
            <g className="pet-tail" style={origin(136, 170)}>
              <circle cx={139} cy={169} r={9.5} fill={look.shade} />
            </g>
          )}
          {species === 'hamster' && (
            <g className="pet-tail" style={origin(134, 174)}>
              <ellipse cx={138} cy={173} rx={8} ry={6.4} fill={look.belly} />
            </g>
          )}

          {equipped.back === 'wear_cape' && (
            <g className="pet-cape" style={origin(100, 110)}>
              <path d="M70 110 H130 C140 136 152 162 158 188 C146 180 138 190 128 182 C118 190 110 180 100 186 C90 180 82 190 72 182 C62 190 54 180 42 188 C48 162 60 136 70 110 Z" fill="#D7263D" />
              <path d="M112 110 H130 C140 136 152 162 158 188 C146 180 138 190 128 182 C126 156 120 132 112 110 Z" fill="#B11A2F" />
              <path d="M74 118 C66 138 58 158 52 178" fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={3} strokeLinecap="round" />
            </g>
          )}

          {/* Stopy */}
          <g className="pet-side-l">{foot}</g>
          <g className="pet-side-r" transform={MIRROR}>
            {foot}
          </g>

          {/* Tułów */}
          <g className="pet-torso" style={origin(100, b.bottom)}>
            <path d={bodyPath} fill={fur} />
            <g clipPath={`url(#${id}-body)`}>
              <ellipse cx={100} cy={top + 14} rx={b.sw + 6} ry={12} fill={look.shade} opacity={0.38} />
              <g className="pet-belly" style={origin(100, bellyCy)}>
                <ellipse cx={100} cy={bellyCy} rx={b.hw - 14} ry={species === 'fox' ? 33 : 28} fill={`url(#${id}-belly)`} />
              </g>
              <path d={`M${100 - b.hw - 8} ${top + 30} C${100 - b.hw + 4} ${b.bottom - 10} ${100 - 20} ${b.bottom + 2} 100 ${b.bottom + 2} V${b.bottom + 8} H${100 - b.hw - 10} Z`} fill={look.shade} opacity={0.18} />
              {build === 'strong' && (
                <path d={`M80 ${top + 30} Q100 ${top + 40} 120 ${top + 30} M100 ${top + 36} V${top + 46}`} fill="none" stroke={look.bellyShade} strokeWidth={2.2} strokeLinecap="round" />
              )}
            </g>
            <g className="pet-rumble" style={origin(100, bellyCy)} fill="none" stroke={INK} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round">
              <path d={`M${100 - b.hw - 6} ${bellyCy - 8} q-5 4 0 8 q5 4 0 8`} />
              <path d={`M${100 + b.hw + 6} ${bellyCy - 8} q5 4 0 8 q-5 4 0 8`} />
            </g>
            {stage === 'master' && (
              <g>
                <path d={`M88 ${top + 16} L100 ${top + 34} L112 ${top + 16}`} fill="none" stroke="#3D7FF0" strokeWidth={5} strokeLinejoin="round" />
                <path d={`M88 ${top + 16} L100 ${top + 34}`} fill="none" stroke="#6BA1FF" strokeWidth={2} />
                <circle cx={100} cy={top + 41} r={10.5} fill="#C98A00" />
                <circle cx={100} cy={top + 40} r={10.5} fill="#FFC53D" />
                <circle cx={100} cy={top + 40} r={7.4} fill="#FFD970" />
                <path d={`M100 ${top + 34.4} l1.7 3.5 l3.9 0.4 l-2.9 2.6 l0.8 3.8 l-3.5 -2 l-3.5 2 l0.8 -3.8 l-2.9 -2.6 l3.9 -0.4 Z`} fill="#fff" />
              </g>
            )}
            {equipped.back === 'wear_cape' && (
              <g>
                <path d={`M${100 - b.sw + 2} ${top + 6} C${100 - 14} ${top + 16} ${100 + 14} ${top + 16} ${100 + b.sw - 2} ${top + 6} L${100 + b.sw - 6} ${top + 14} C${100 + 12} ${top + 23} ${100 - 12} ${top + 23} ${100 - b.sw + 6} ${top + 14} Z`} fill="#F0364E" />
                <circle cx={100} cy={top + 19} r={4.6} fill="#FFC53D" />
              </g>
            )}
          </g>

          {/* Łapki */}
          <g className="pet-bob">
            <g className="pet-side-l">{arm}</g>
            <g className="pet-side-r" transform={MIRROR}>
              {arm}
            </g>
          </g>

          {action === 'tug' && (
            <g className="pet-rope">
              <path d={`M${armX + 22} ${shoulderY + 12} C150 ${shoulderY + 16} 220 ${shoulderY + 26} 330 ${shoulderY + 40}`} fill="none" stroke="#E8D3A8" strokeWidth={7} strokeLinecap="round" />
              <path d={`M${armX + 22} ${shoulderY + 12} C150 ${shoulderY + 16} 220 ${shoulderY + 26} 330 ${shoulderY + 40}`} fill="none" stroke="#3D7FF0" strokeWidth={7} strokeDasharray="4 8" />
              <circle cx={armX + 20} cy={shoulderY + 12} r={6} fill="#E8D3A8" />
            </g>
          )}

          {/* Głowa */}
          <g className="pet-bob">
            <g transform={`translate(100 116) scale(${scale.head}) translate(-100 -116)`}>
              <g className="pet-pose" style={origin(100, 116)}>
                <g className="pet-side-l">
                  <Ear species={species} look={look} id={id} />
                </g>
                <g className="pet-side-r" transform={MIRROR}>
                  <Ear species={species} look={look} id={id} />
                </g>

                <HeadShape species={species} fill={fur} />
                <g clipPath={`url(#${id}-head)`}>
                  <FaceMask species={species} look={look} />
                  <ellipse cx={80} cy={53} rx={22} ry={8} fill="#fff" opacity={0.13} transform="rotate(-18 80 53)" />
                </g>

                {species === 'hamster' && (
                  <g stroke={look.shade} strokeOpacity={0.55} strokeWidth={1.4} strokeLinecap="round">
                    <path d="M58 98 L44 95 M58 102 L45 104" />
                    <path d="M142 98 L156 95 M142 102 L155 104" />
                  </g>
                )}

                <g className="pet-side-l">{cheek}</g>
                <g className="pet-side-r" transform={MIRROR}>
                  {cheek}
                </g>

                {!eyesHidden && (
                  <>
                    <Brows style={face.brows} dx={look.eyeDx} y={66} color={look.shade} />
                    <g className={face.eyes === 'up' ? undefined : 'pet-gaze'} transform={face.eyes === 'up' ? 'translate(0 -2.4)' : undefined}>
                      <g className="pet-blink" style={origin(100, 80)}>
                        <Eye cx={eyeL} cy={80} rx={look.eye[0]} ry={look.eye[1]} style={face.eyes} look={look} />
                        <Eye cx={eyeR} cy={80} rx={look.eye[0]} ry={look.eye[1]} style={face.eyes} look={look} />
                      </g>
                    </g>
                    <path className="pet-tear" d={`M${eyeL - 4} 90 q-3.4 5.4 0 7.4 q3.4 -2 0 -7.4 Z`} fill="#8FD3F4" style={origin(eyeL - 4, 90)} />
                  </>
                )}

                <Nose species={species} look={look} />
                <g className="pet-mouth-main">
                  <Mouth style={face.mouth} y={mouthY} species={species} />
                </g>
                <g className="pet-mouth-yawn" style={origin(100, mouthY + 4)}>
                  <ellipse cx={100} cy={mouthY + 5} rx={7} ry={8.4} fill="#7B2D36" stroke={INK} strokeWidth={2} />
                  <ellipse cx={100} cy={mouthY + 9.4} rx={4.4} ry={3} fill="#F2828E" />
                </g>
                <path className="pet-drool" d={`M104 ${mouthY + 7} q-2.6 5 0 7 q2.6 -2 0 -7 Z`} fill="#BFE8FA" style={origin(104, mouthY + 7)} />

                <EyeWear item={equipped.eyes} dx={look.eyeDx} />
                <HeadWear item={equipped.head} />

                {action === 'chew' && (
                  <g transform={`translate(${100 - 22} ${mouthY - 19}) scale(0.92)`}>
                    <ItemGlyph itemKey="toy_chew" />
                  </g>
                )}
                {action === 'catch' && (
                  <g className="pet-disc-held">
                    <ellipse cx={100} cy={mouthY + 6} rx={30} ry={8} fill="#2563D9" />
                    <ellipse cx={100} cy={mouthY + 3.6} rx={30} ry={8} fill="#3D7FF0" />
                    <ellipse cx={100} cy={mouthY + 3.6} rx={20} ry={4.8} fill="#6BA1FF" />
                  </g>
                )}

                {action === 'eat' && (
                  <g>
                    <circle className="pet-crumbs" cx={93} cy={mouthY + 8} r={1.8} fill="#D9A45F" style={{ '--dx': '-9px' } as CSSProperties} />
                    <circle className="pet-crumbs" cx={104} cy={mouthY + 9} r={1.5} fill="#C48A45" style={{ '--dx': '8px' } as CSSProperties} />
                    <circle className="pet-crumbs" cx={99} cy={mouthY + 10} r={1.3} fill="#E0B273" style={{ '--dx': '-2px' } as CSSProperties} />
                  </g>
                )}

                {action === 'header' && (
                  <g className="pet-ball" style={origin(100, 36)}>
                    <g className="pet-ball-spin" style={origin(100, 18)}>
                      <g transform="translate(80 -2) scale(0.84)">
                        <ItemGlyph itemKey="toy_ball" />
                      </g>
                    </g>
                  </g>
                )}

                <g>
                  {[0, 1].map(i => (
                    <path
                      key={i}
                      className="pet-sweat"
                      d={`M${i ? 150 : 50} 58 q-3.6 6 0 8.4 q3.6 -2.4 0 -8.4 Z`}
                      fill="#8FD3F4"
                      style={{ ...origin(i ? 150 : 50, 58), '--dx': i ? '10px' : '-10px' } as CSSProperties}
                    />
                  ))}
                </g>
              </g>
            </g>
          </g>

          {/* Jedzenie trzymane w łapkach — przed głową, maleje z każdym kęsem */}
          {action === 'eat' && food && (
            <g transform={`translate(100 116) scale(${scale.head}) translate(-100 -116)`}>
              <g key={food} className="pet-food" style={origin(100, mouthY + 14)}>
                <g transform={`translate(${100 - 17} ${mouthY - 4}) scale(0.72)`}>
                  <ItemGlyph itemKey={food} />
                </g>
              </g>
            </g>
          )}
        </g>

        {action === 'catch' && (
          <g className="pet-disc-fly" style={origin(100, 100)}>
            <ellipse cx={100} cy={106} rx={30} ry={8} fill="#2563D9" />
            <ellipse cx={100} cy={103.6} rx={30} ry={8} fill="#3D7FF0" />
            <ellipse cx={100} cy={103.6} rx={20} ry={4.8} fill="#6BA1FF" />
          </g>
        )}
      </g>

      {/* Nakładki nad zwierzakiem */}
      <g fill="none" stroke="#7A88B8" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        {[
          [142, 58, 0.8],
          [154, 42, 1],
          [168, 24, 1.25],
        ].map(([zx, zy, s]) => (
          <path key={zx} className="pet-zzz" d={`M${zx} ${zy} h${8 * s} l${-8 * s} ${9 * s} h${8 * s}`} style={origin(zx, zy)} />
        ))}
      </g>

      <g>
        {CONFETTI.map(([cx, cy, color, dx, dy, rot], i) => (
          <rect
            key={i}
            className="pet-confetti"
            x={cx - 3}
            y={cy - 2}
            width={i % 2 ? 6 : 7}
            height={i % 2 ? 6 : 4}
            rx={i % 2 ? 3 : 1}
            fill={color}
            style={{ ...origin(cx, cy), '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg`, animationDelay: `${-(i % 3) * 0.26}s` } as CSSProperties}
          />
        ))}
      </g>

      {shiny && (
        <g fill="#FFE27A">
          {[
            [40, 62, 1],
            [162, 96, 0.8],
            [150, 34, 1.1],
            [52, 132, 0.7],
          ].map(([sx, sy, s]) => (
            <path
              key={`${sx}-${sy}`}
              className="pet-shine"
              d={`M${sx} ${sy - 9 * s} L${sx + 2.4 * s} ${sy - 2.4 * s} L${sx + 9 * s} ${sy} L${sx + 2.4 * s} ${sy + 2.4 * s} L${sx} ${sy + 9 * s} L${sx - 2.4 * s} ${sy + 2.4 * s} L${sx - 9 * s} ${sy} L${sx - 2.4 * s} ${sy - 2.4 * s} Z`}
              style={origin(sx, sy)}
            />
          ))}
        </g>
      )}

      {children}
    </svg>
  );
}
