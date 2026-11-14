import type { ReactNode } from 'react';

/**
 * Ilustracje przedmiotów sklepu, każda w polu 48×48. Te same rysunki trafiają
 * do sceny (jedzenie w łapkach, piłka, frisbee), więc sklep i pokój wyglądają
 * spójnie. Światło pada z lewej góry: jasna krawędź u góry, cień u dołu.
 */

const INK = '#2B211D';

const GLYPHS: Record<string, ReactNode> = {
  /* ---------- Jedzenie ---------- */
  food_kibble: (
    <>
      <ellipse cx={24} cy={41} rx={17} ry={3} fill="#000" opacity={0.16} />
      <path d="M8 22 C10 16 15 12 24 12 C33 12 38 16 40 22 Z" fill="#B67A45" />
      {[
        [14, 19, '#C98A52'],
        [20, 15, '#A56B38'],
        [27, 16, '#C98A52'],
        [33, 19, '#A56B38'],
        [23, 20, '#D39B63'],
        [30, 21, '#B67A45'],
        [17, 22, '#A56B38'],
      ].map(([x, y, fill]) => (
        <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r={3.4} fill={fill as string} />
      ))}
      <path d="M5 23 H43 L39 37 C38 40 36 41 33 41 H15 C12 41 10 40 9 37 Z" fill="#3D7FF0" />
      <path d="M5 23 H43 L42 27 H6 Z" fill="#6BA1FF" />
      <path d="M12 31 C13 35 14 37 16 38" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" />
      <path d="M21 31 l3 -2.4 l3 2.4 l-1.2 3.6 h-3.6 Z" fill="#fff" opacity={0.85} />
    </>
  ),
  food_apple: (
    <>
      <ellipse cx={24} cy={42} rx={13} ry={2.6} fill="#000" opacity={0.16} />
      <path d="M24 14 C18 9 7 12 7 24 C7 34 14 42 20 42 C22 42 23 41 24 41 C25 41 26 42 28 42 C34 42 41 34 41 24 C41 12 30 9 24 14 Z" fill="#E5484D" />
      <path d="M24 14 C30 9 41 12 41 24 C41 34 34 42 28 42 C26 42 25 41 24 41 C30 36 33 26 24 14 Z" fill="#C7353B" />
      <path d="M12 21 C13 17 16 15 19 15" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M24 15 C24 11 25 8 27 6" fill="none" stroke="#6B4226" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M27 9 C31 4 37 5 39 8 C35 12 30 12 27 9 Z" fill="#4CAF6A" />
      <path d="M28 9 C32 8 35 8 38 8" fill="none" stroke="#2F8A4E" strokeWidth={1} />
    </>
  ),
  food_veggies: (
    <>
      <ellipse cx={24} cy={42} rx={17} ry={2.8} fill="#000" opacity={0.16} />
      <path d="M9 24 C6 16 12 10 18 13 C19 8 28 7 30 13 C36 10 42 16 39 24 Z" fill="#5DBB6E" />
      <path d="M12 24 C11 18 15 15 19 17 C21 13 27 13 29 17 C33 15 37 18 36 24 Z" fill="#7FD08A" />
      <path d="M25 9 l3 -5 l4 2 l-4 9 Z" fill="#F4923A" />
      <path d="M31 11 l5 -4 l3 3 l-6 7 Z" fill="#F7A54F" />
      <circle cx={16} cy={20} r={5} fill="#E5484D" />
      <path d="M13 18 a4 4 0 0 1 4 -2" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M4 24 H44 C44 34 37 41 24 41 C11 41 4 34 4 24 Z" fill="#FBF3E6" />
      <path d="M4 24 H44 C44 26 43.6 27.6 43 29 H5 C4.4 27.6 4 26 4 24 Z" fill="#fff" />
      <path d="M10 33 C13 37 18 39 24 39" fill="none" stroke="#E7D6BC" strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  food_chicken_rice: (
    <>
      <ellipse cx={24} cy={38} rx={21} ry={6} fill="#000" opacity={0.14} />
      <ellipse cx={24} cy={34} rx={21} ry={8} fill="#F4F1EC" />
      <ellipse cx={24} cy={33} rx={15} ry={5} fill="#E3DED6" />
      <path d="M6 31 C6 22 14 18 21 20 C26 21 28 26 26 32 C22 36 8 36 6 31 Z" fill="#fff" />
      {[
        [10, 26],
        [15, 23],
        [20, 25],
        [13, 30],
        [19, 30],
        [23, 28],
      ].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={2.2} ry={1.2} fill="#E9E4DA" transform={`rotate(${(x * 37) % 90} ${x} ${y})`} />
      ))}
      <path d="M22 30 C20 22 26 13 34 13 C40 13 43 18 41 24 C39 30 30 34 22 30 Z" fill="#C97A36" />
      <path d="M26 30 C30 31 36 28 39 23 C40 20 40 17 38 15 C42 16 44 20 41 25 C38 30 31 33 26 30 Z" fill="#A85E22" />
      <path d="M28 17 C30 15 33 15 35 16" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" />
      <path d="M36 13 L41 7" stroke="#F4EBDD" strokeWidth={4} strokeLinecap="round" />
      <circle cx={40.5} cy={5.5} r={2.6} fill="#F4EBDD" />
      <circle cx={43} cy={8.5} r={2.6} fill="#F4EBDD" />
      <circle cx={17} cy={21} r={1.6} fill="#5DBB6E" />
      <circle cx={11} cy={22.5} r={1.3} fill="#5DBB6E" />
    </>
  ),
  food_energy_bar: (
    <>
      <ellipse cx={24} cy={41} rx={17} ry={2.6} fill="#000" opacity={0.16} />
      <g transform="rotate(-18 24 24)">
        <rect x={9} y={8} width={22} height={18} rx={3} fill="#8A5A34" />
        <rect x={9} y={8} width={22} height={5} rx={2.5} fill="#A9744A" />
        {[
          [14, 15],
          [20, 12],
          [26, 16],
          [17, 21],
          [25, 22],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.7} fill="#F2D9A6" />
        ))}
        <path d="M7 22 H33 L35 26 L33 30 L35 34 L33 38 L35 42 H5 L7 38 L5 34 L7 30 L5 26 Z" fill="#FF6B2C" />
        <path d="M7 22 H33 L34 24 H6 Z" fill="#FF935F" />
        <path d="M22 26 L16 33 H20 L18 39 L25 31 H21 Z" fill="#fff" />
      </g>
    </>
  ),
  food_protein_shake: (
    <>
      <ellipse cx={24} cy={43} rx={11} ry={2.4} fill="#000" opacity={0.16} />
      <path d="M13 16 H35 L33 40 C33 42 31.5 43 30 43 H18 C16.5 43 15 42 15 40 Z" fill="#EEF3F8" />
      <path d="M14.3 26 H33.7 L33 40 C33 42 31.5 43 30 43 H18 C16.5 43 15 42 15 40 Z" fill="#F29BC0" />
      <path d="M14.3 26 H33.7 L33.5 29 H14.5 Z" fill="#F8BED6" />
      <path d="M18 19 L19 39" stroke="#fff" strokeOpacity={0.7} strokeWidth={2.4} strokeLinecap="round" />
      {[22, 27, 32].map(y => (
        <path key={y} d={`M29 ${y} h3.4`} stroke="#9AA9BA" strokeWidth={1.2} strokeLinecap="round" />
      ))}
      <rect x={11} y={10} width={26} height={7} rx={2.5} fill={INK} />
      <rect x={11} y={10} width={26} height={2.6} rx={1.3} fill="#4A3D38" />
      <path d="M19 10 V7 C19 5.5 20 5 21.5 5 H27 C28.5 5 29.5 5.5 29.5 7 V10 Z" fill="#3A2E2A" />
      <circle cx={31} cy={6} r={2} fill="#FF6B2C" />
    </>
  ),

  /* ---------- Zabawki ---------- */
  toy_ball: (
    <>
      <ellipse cx={24} cy={43} rx={13} ry={2.4} fill="#000" opacity={0.18} />
      <circle cx={24} cy={24} r={18} fill="#FF4D6D" />
      <path d="M24 6 A18 18 0 0 1 24 42 A26 26 0 0 0 24 6 Z" fill="#E03358" />
      <path d="M7 19 C16 13 32 13 41 19 C40.5 22 40.5 26 41 29 C32 23 16 23 7 29 C7.5 26 7.5 22 7 19 Z" fill="#fff" />
      <path d="M7 19 C16 13 32 13 41 19" fill="none" stroke="#FFD166" strokeWidth={2.2} />
      <path d="M7 29 C16 23 32 23 41 29" fill="none" stroke="#FFD166" strokeWidth={2.2} />
      <ellipse cx={17} cy={13} rx={5} ry={2.6} fill="#fff" opacity={0.55} transform="rotate(-28 17 13)" />
    </>
  ),
  toy_rope: (
    <>
      <ellipse cx={24} cy={41} rx={17} ry={2.4} fill="#000" opacity={0.16} />
      <path d="M5.5 31 l-4 2.6 M6.5 34.4 l-3.2 3.8 M10 35.6 l-0.6 4.6 M42.4 18 l4 -3 M43.4 21.6 l4.4 -1.2 M39.6 16 l1.4 -4.4" stroke="#D2B985" strokeWidth={2.6} strokeLinecap="round" />
      <path d="M10 29 C18 17 30 35 38 21" fill="none" stroke="#E8D3A8" strokeWidth={8} strokeLinecap="round" />
      <path d="M10 29 C18 17 30 35 38 21" fill="none" stroke="#3D7FF0" strokeWidth={8} strokeDasharray="3.4 6" strokeDashoffset={-4} />
      <path d="M11 27 C18 17.4 29 33 36.6 20" fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" />
      <circle cx={9.5} cy={30} r={6.8} fill="#E8D3A8" />
      <circle cx={38.5} cy={20.5} r={6.8} fill="#E8D3A8" />
      <path d="M5 33 a6 6 0 0 0 8 2.4 M34 23.6 a6 6 0 0 0 8 2.4" fill="none" stroke="#C9AE7A" strokeWidth={2} strokeLinecap="round" />
      <path d="M5.4 27.6 a5 5 0 0 1 4.6 -3 M34.4 18 a5 5 0 0 1 4.6 -3" fill="none" stroke="#fff" strokeOpacity={0.65} strokeWidth={1.8} strokeLinecap="round" />
    </>
  ),
  toy_chew: (
    <>
      <ellipse cx={24} cy={41} rx={17} ry={2.4} fill="#000" opacity={0.16} />
      <g transform="rotate(-24 24 24)">
        <rect x={11} y={19} width={26} height={10} rx={5} fill="#FBF1DF" />
        {[
          [10, 18],
          [10, 30],
          [38, 18],
          [38, 30],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={6.4} fill="#FBF1DF" />
        ))}
        <path d="M13 27 H35 C36 29 37 31 38 32 C34 37 31 33 30 29 H18 C17 33 14 37 10 32 C11 31 12 29 13 27 Z" fill="#E6D5B8" />
        <path d="M7 15 a5 5 0 0 1 5 -3 M15 21 H28" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      </g>
    </>
  ),
  toy_frisbee: (
    <>
      <ellipse cx={24} cy={40} rx={18} ry={2.6} fill="#000" opacity={0.16} />
      <ellipse cx={24} cy={26} rx={21} ry={10} fill="#2563D9" />
      <ellipse cx={24} cy={23} rx={21} ry={10} fill="#3D7FF0" />
      <ellipse cx={24} cy={23} rx={14} ry={6.2} fill="#6BA1FF" />
      <ellipse cx={24} cy={23} rx={7} ry={3} fill="#3D7FF0" />
      <path d="M8 19 C12 15 19 13.4 25 13.4" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  toy_dumbbells: (
    <>
      <ellipse cx={24} cy={41} rx={18} ry={2.4} fill="#000" opacity={0.16} />
      <g transform="rotate(-20 24 24)">
        <rect x={13} y={21} width={22} height={6} rx={2} fill="#B9C1CD" />
        <rect x={13} y={21} width={22} height={2.2} rx={1} fill="#E4E8EE" />
        {[4, 35].map(x => (
          <g key={x}>
            <rect x={x} y={11} width={9} height={26} rx={3.4} fill="#FF6B2C" />
            <rect x={x} y={11} width={9} height={7} rx={3.4} fill="#FF935F" />
            <rect x={x} y={30} width={9} height={7} rx={3.4} fill="#D9501A" />
          </g>
        ))}
        <rect x={1} y={16} width={4} height={16} rx={2} fill="#3A2E2A" />
        <rect x={43} y={16} width={4} height={16} rx={2} fill="#3A2E2A" />
      </g>
    </>
  ),
  toy_treadmill: (
    <>
      <ellipse cx={24} cy={43} rx={19} ry={2.4} fill="#000" opacity={0.16} />
      <path d="M33 34 L37 9" stroke="#8D97A8" strokeWidth={3.4} strokeLinecap="round" />
      <path d="M30 34 L34 12" stroke="#B9C1CD" strokeWidth={2} strokeLinecap="round" />
      <rect x={29} y={5} width={15} height={9} rx={3} fill="#2B303B" transform="rotate(8 36 9)" />
      <rect x={31.5} y={7} width={10} height={4.6} rx={1.4} fill="#7CE0A3" transform="rotate(8 36 9)" />
      <path d="M30 20 L21 22" stroke="#8D97A8" strokeWidth={3} strokeLinecap="round" />
      <path d="M4 34 H40 C43 34 44 36 44 38 C44 40 43 42 40 42 H6 C3 42 2 40 2 38 C2 36 2.6 34 4 34 Z" fill="#2B303B" />
      <rect x={5} y={32} width={34} height={5} rx={2.5} fill="#4A5262" />
      <path d="M9 34.5 h5 M18 34.5 h5 M27 34.5 h5" stroke="#8D97A8" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={8} cy={40} r={1.8} fill="#FF6B2C" />
    </>
  ),

  /* ---------- Ubranka ---------- */
  wear_wristbands: (
    <>
      <ellipse cx={24} cy={42} rx={17} ry={2.4} fill="#000" opacity={0.16} />
      {[
        [5, 18, '#FF4D6D', '#E03358', '#FF8AA0'],
        [24, 12, '#FF6B2C', '#D9501A', '#FF935F'],
      ].map(([x, y, base, shade, light]) => (
        <g key={x as number} transform={`translate(${x} ${y})`}>
          <path d="M0 5 C0 2 4 0 9.5 0 C15 0 19 2 19 5 V19 C19 22 15 24 9.5 24 C4 24 0 22 0 19 Z" fill={base as string} />
          <path d="M13 0.6 C17 1.4 19 3 19 5 V19 C19 21 17 22.6 13 23.4 Z" fill={shade as string} />
          <ellipse cx={9.5} cy={5} rx={9.5} ry={4.6} fill={light as string} />
          <ellipse cx={9.5} cy={5} rx={6} ry={2.6} fill={shade as string} />
          <path d="M0 11 C3 13.6 16 13.6 19 11 V14 C16 16.6 3 16.6 0 14 Z" fill="#fff" opacity={0.9} />
        </g>
      ))}
    </>
  ),
  wear_cap: (
    <>
      <ellipse cx={24} cy={39} rx={19} ry={2.6} fill="#000" opacity={0.16} />
      <path d="M6 30 C6 16 14 9 25 9 C36 9 40 18 40 28 Z" fill="#E4572E" />
      <path d="M25 9 C36 9 40 18 40 28 L30 29 C31 21 29 13 25 9 Z" fill="#C44420" />
      <path d="M25 9 C22 14 20 21 20 29" fill="none" stroke="#B93C1A" strokeWidth={1.2} />
      <path d="M5 29 C16 26 32 26 46 31 C46 35 42 37 36 36 C26 34 14 33 5 33 Z" fill="#B93C1A" />
      <path d="M5 29 C16 26 32 26 46 31 C38 30 20 29 5 31 Z" fill="#E96A45" />
      <circle cx={25} cy={8.5} r={2.6} fill="#FFD166" />
      <path d="M11 22 C12 17 15 14 19 12.6" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
  wear_headband: (
    <>
      <ellipse cx={23} cy={41} rx={17} ry={2.4} fill="#000" opacity={0.16} />
      <ellipse cx={22} cy={20} rx={16} ry={8} fill="none" stroke="#1E4FB3" strokeWidth={8} />
      <path d="M40 17 L47 11 L46 19.6 L47.6 26 L40 23 Z" fill="#2563D9" />
      <path d="M6 20 C6 32 38 32 38 20" fill="none" stroke="#3D7FF0" strokeWidth={10} strokeLinecap="round" />
      <path d="M6 22.4 C8 32 36 32 38 22.4" fill="none" stroke="#fff" strokeOpacity={0.92} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M5 16 C7 26 20 28 22 28" fill="none" stroke="#6BA1FF" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={39.4} cy={20.4} r={3.6} fill="#1E4FB3" />
    </>
  ),
  wear_sunglasses: (
    <>
      <ellipse cx={24} cy={38} rx={18} ry={2.2} fill="#000" opacity={0.14} />
      <path d="M3 17 H45" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d="M4 17 H21 C21.6 25 19 32 13 32 C7 32 3.4 25 4 17 Z" fill="#1B1B22" />
      <path d="M27 17 H44 C44.6 25 41 32 35 32 C29 32 26.4 25 27 17 Z" fill="#1B1B22" />
      <path d="M21 19 C23 17.6 25 17.6 27 19" fill="none" stroke={INK} strokeWidth={2.6} />
      <path d="M7 20 L15 20 L9 28 Z" fill="#6BA1FF" opacity={0.55} />
      <path d="M30 20 L38 20 L32 28 Z" fill="#6BA1FF" opacity={0.55} />
      <path d="M17 20 l-5 9 M40 20 l-5 9" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.6} strokeLinecap="round" />
    </>
  ),
  wear_sneakers: (
    <>
      <ellipse cx={25} cy={42} rx={20} ry={2.4} fill="#000" opacity={0.16} />
      <path d="M6 35 V20 C6 18 7.5 17 9 17 H15 C16.5 17 17.5 18 18.5 19 L26 26 C30 28.5 37 28.5 41 31 C43 32.2 44 33.6 44 35 Z" fill="#F7F7FA" />
      <path d="M6 35 V23 H12.4 C12.6 28 11.6 32 10.4 35 Z" fill="#3D7FF0" />
      <path d="M34 28.6 C38 29.4 41.4 30.6 43 32.4 C43.6 33.2 44 34.2 44 35 H32.5 C32.5 32.6 33 30.4 34 28.6 Z" fill="#DCE0E8" />
      <path d="M14 33 C21 32 27.4 29.6 31 25.4" fill="none" stroke="#3D7FF0" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M19.5 21 l3.5 -2.6 M22.5 23.8 l3.5 -2.6 M25.5 26.4 l3.4 -2.4" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M8.6 19.6 H15" stroke="#C9CED8" strokeWidth={2} strokeLinecap="round" />
      <path d="M4 35 H44.6 C45.6 35 46 36 46 37.5 C46 39.5 44.5 41 42 41 H7 C5 41 4 39.6 4 38 Z" fill="#fff" />
      <path d="M4 38 H45.9 C45.6 39.8 44.2 41 42 41 H7 C5 41 4 39.6 4 38 Z" fill="#FF6B2C" />
    </>
  ),
  wear_cape: (
    <>
      <ellipse cx={24} cy={43} rx={16} ry={2.2} fill="#000" opacity={0.16} />
      <path d="M14 8 H34 C38 20 43 30 45 40 C40 36 36 40 32 37 C28 41 24 37 20 40 C16 36 10 40 3 40 C5 30 10 20 14 8 Z" fill="#D7263D" />
      <path d="M26 8 H34 C38 20 43 30 45 40 C40 36 36 40 32 37 C31 26 29 16 26 8 Z" fill="#B11A2F" />
      <path d="M17 12 C14 20 11 28 9 35" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M12 5 H36 C37 5 38 6 37.6 7.4 L36 11 H12 L10.4 7.4 C10 6 11 5 12 5 Z" fill="#F0364E" />
      <circle cx={24} cy={8.4} r={4.2} fill="#FFC53D" />
      <path d="M24 5.6 l0.9 1.9 l2.1 0.2 l-1.6 1.4 l0.5 2 l-1.9 -1.1 l-1.9 1.1 l0.5 -2 l-1.6 -1.4 l2.1 -0.2 Z" fill="#fff" />
    </>
  ),
};

/** Zawartość ilustracji (pole 48×48) do osadzenia w innym SVG. */
export function ItemGlyph({ itemKey }: { itemKey: string }) {
  return (
    <>
      {GLYPHS[itemKey] ?? (
        <>
          <rect x={8} y={14} width={32} height={26} rx={5} fill="#C99A6B" />
          <path d="M8 22 H40 M24 14 V40" stroke="#8A5A32" strokeWidth={3} />
        </>
      )}
    </>
  );
}

export const hasItemArt = (itemKey: string) => itemKey in GLYPHS;

export function ItemArt({ itemKey, size = 44, className }: { itemKey: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden>
      <ItemGlyph itemKey={itemKey} />
    </svg>
  );
}

/** Moneta FitCoin — zamiast ikony z biblioteki, żeby saldo i ceny miały własny znak. */
export function CoinIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <circle cx={12} cy={12.6} r={10} fill="#C98A00" />
      <circle cx={12} cy={11.4} r={10} fill="#FFC53D" />
      <circle cx={12} cy={11.4} r={7.2} fill="#FFD970" />
      <circle cx={12} cy={11.4} r={7.2} fill="none" stroke="#E0A200" strokeWidth={1} />
      <path d="M13.2 5.8 L8.6 12.2 H11.4 L10.6 17 L15.4 10.4 H12.4 Z" fill="#B77400" />
      <path d="M5.4 8.4 C6.6 5.8 9 4.2 11.6 4" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

/** Stos monet do odsłonięcia łupu ze skrzyni. */
export function CoinStackArt({ size = 96 }: { size?: number }) {
  const coin = (x: number, y: number, key: string) => (
    <g key={key}>
      <ellipse cx={x} cy={y + 3.4} rx={13} ry={5.4} fill="#C98A00" />
      <ellipse cx={x} cy={y} rx={13} ry={5.4} fill="#FFC53D" />
      <ellipse cx={x} cy={y} rx={8.6} ry={3.2} fill="#FFD970" />
    </g>
  );
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <ellipse cx={24} cy={42} rx={19} ry={3} fill="#000" opacity={0.16} />
      {[36, 31, 26].map(y => coin(16, y, `a${y}`))}
      {[37, 32, 27, 22, 17].map(y => coin(32, y, `b${y}`))}
      <path d="M32 12 l1.4 3 l3.2 0.3 l-2.4 2.1 l0.7 3.1 l-2.9 -1.7 l-2.9 1.7 l0.7 -3.1 l-2.4 -2.1 l3.2 -0.3 Z" fill="#fff" opacity={0.9} />
    </svg>
  );
}
