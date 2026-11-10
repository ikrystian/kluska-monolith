import { useId } from 'react';
import { cn } from '@/lib/utils';
import type { MuscleAreaId, AreaReadiness } from '@/lib/muscle-areas';

export function getReadinessColor(ready: number): {
  fill: string;
  twText: string;
  twBg: string;
  twBorder: string;
  dotColor: string;
  statusLabel: string;
} {
  if (ready >= 1) {
    return {
      fill: 'hsl(var(--volt))',
      twText: 'text-volt',
      twBg: 'bg-volt/15',
      twBorder: 'border-volt/40',
      dotColor: 'bg-volt',
      statusLabel: 'Gotowe',
    };
  }
  if (ready >= 0.5) {
    return {
      fill: 'hsl(var(--food))',
      twText: 'text-food',
      twBg: 'bg-food/15',
      twBorder: 'border-food/40',
      dotColor: 'bg-food',
      statusLabel: 'Regeneracja',
    };
  }
  return {
    fill: 'hsl(var(--primary))',
    twText: 'text-primary',
    twBg: 'bg-primary/15',
    twBorder: 'border-primary/40',
    dotColor: 'bg-primary',
    statusLabel: 'Zmęczone',
  };
}

interface BodyAnatomySvgProps {
  areas: AreaReadiness[];
  selectedArea: MuscleAreaId | null;
  onSelectArea: (id: MuscleAreaId) => void;
  className?: string;
}

/**
 * Anatomical human body SVG showing Front and Back views.
 * Muscle groups are interactive vector paths colored dynamically by recovery state.
 */
export function BodyAnatomySvg({
  areas,
  selectedArea,
  onSelectArea,
  className,
}: BodyAnatomySvgProps) {
  const filterId = useId();
  const areaMap = new Map(areas.map(a => [a.id, a]));

  const getColor = (id: MuscleAreaId) => {
    const area = areaMap.get(id);
    return getReadinessColor(area?.ready ?? 1).fill;
  };

  const getOpacity = (id: MuscleAreaId) => {
    if (!selectedArea) return 1;
    return selectedArea === id ? 1 : 0.35;
  };

  const isSelected = (id: MuscleAreaId) => selectedArea === id;

  const renderMuscleGroup = (
    id: MuscleAreaId,
    label: string,
    children: React.ReactNode
  ) => {
    const selected = isSelected(id);
    const color = getColor(id);
    const opacity = getOpacity(id);

    return (
      <g
        id={`muscle-group-${id}`}
        tabIndex={0}
        role="button"
        aria-label={`${label} - ${Math.round((areaMap.get(id)?.ready ?? 1) * 100)}% regeneracji`}
        aria-pressed={selected}
        onClick={e => {
          e.stopPropagation();
          onSelectArea(id);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectArea(id);
          }
        }}
        className="cursor-pointer outline-none transition-all duration-300"
        style={{
          fill: color,
          opacity,
          filter: selected ? `url(#${filterId}-glow)` : undefined,
        }}
      >
        {children}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 250 216"
      className={cn('w-full select-none', className)}
      role="img"
      aria-label="Mapa regeneracji mięśniowej"
    >
      <defs>
        <filter id={`${filterId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="currentColor" floodOpacity="0.65" />
        </filter>
        <style>{`
          .body-joint { fill: hsl(var(--secondary)); stroke: hsl(var(--border)); stroke-width: 0.6; }
          .muscle-path { stroke: hsl(var(--card)); stroke-width: 0.85; stroke-linejoin: round; transition: all 0.25s ease; }
          .muscle-path:hover { stroke: hsl(var(--foreground)); stroke-width: 1.2; }
          .body-caption { fill: hsl(var(--muted-foreground)); font-size: 9.5px; font-weight: 700; text-anchor: middle; letter-spacing: 1.5px; }
        `}</style>
      </defs>

      {/* FRONT FIGURE */}
      <g transform="translate(15, 6)">
        <text x="50" y="206" className="body-caption">PRZÓD</text>

        {/* Base joints / silhouette */}
        <ellipse cx="50" cy="18" rx="8.5" ry="11.5" className="body-joint" />
        <path d="M46 27 L46 36 L54 36 L54 27 Z" className="body-joint" />
        <path d="M42 97 L58 97 L54 106 L46 106 Z" className="body-joint" />
        <path d="M17 114 C15 117 14 123 15 128 C16 130 19 131 20 128 C22 124 23 119 23 114 Z" className="body-joint" />
        <path d="M83 114 C85 117 86 123 85 128 C84 130 81 131 80 128 C78 124 77 119 77 114 Z" className="body-joint" />
        <circle cx="41" cy="148" r="3.8" className="body-joint" />
        <circle cx="59" cy="148" r="3.8" className="body-joint" />
        <path d="M35 185 C34 190 30 194 26 196 C32 197 41 197 42 193 C42 189 42 185 42 185 Z" className="body-joint" />
        <path d="M65 185 C66 190 70 194 74 196 C68 197 59 197 58 193 C58 189 58 185 58 185 Z" className="body-joint" />

        {/* Shoulders (Barki - Front deltoids) */}
        {renderMuscleGroup('shoulders', 'Barki', (
          <>
            <path d="M35 37 C29 39 22 43 21 51 C20 56 23 61 26 63 C29 61 31 57 32 51 C33 45 35 40 35 37 Z" className="muscle-path" />
            <path d="M65 37 C71 39 78 43 79 51 C80 56 77 61 74 63 C71 61 69 57 68 51 C67 45 65 40 65 37 Z" className="muscle-path" />
          </>
        ))}

        {/* Chest (Klatka) */}
        {renderMuscleGroup('chest', 'Klatka', (
          <>
            <path d="M48.5 39 L36 39 C34 44 33 53 34 59 C36 66 43 68 48.5 67 Z" className="muscle-path" />
            <path d="M51.5 39 L64 39 C66 44 67 53 66 59 C64 66 57 68 51.5 67 Z" className="muscle-path" />
          </>
        ))}

        {/* Arms (Ramiona - Biceps & Forearms front) */}
        {renderMuscleGroup('arms', 'Ramiona', (
          <>
            <path d="M24 64 C22 66 21 73 22 80 C23 83 26 84 28 83 C30 78 30 71 28 64 Z" className="muscle-path" />
            <path d="M76 64 C78 66 79 73 78 80 C77 83 74 84 72 83 C70 78 70 71 72 64 Z" className="muscle-path" />
            <path d="M22 85 C18 88 16 96 17 103 C17 108 20 113 22 113 C23 113 25 106 26 97 L26 85 Z" className="muscle-path" />
            <path d="M78 85 C82 88 84 96 83 103 C83 108 80 113 78 113 C77 113 75 106 74 97 L74 85 Z" className="muscle-path" />
          </>
        ))}

        {/* Core (Brzuch - Abs & Obliques) */}
        {renderMuscleGroup('core', 'Brzuch', (
          <>
            <path d="M48.5 69 L40 69 C39 72 39 76 40 79 L48.5 79 Z" className="muscle-path" />
            <path d="M51.5 69 L60 69 C61 72 61 76 60 79 L51.5 79 Z" className="muscle-path" />
            <path d="M48.5 80.5 L40.5 80.5 C41 83.5 41 87.5 41.5 90.5 L48.5 90.5 Z" className="muscle-path" />
            <path d="M51.5 80.5 L59.5 80.5 C59 83.5 59 87.5 58.5 90.5 L51.5 90.5 Z" className="muscle-path" />
            <path d="M48.5 92 L42 92 C42 95.5 44 99.5 48 101 C48.5 101 48.5 97 48.5 92 Z" className="muscle-path" />
            <path d="M51.5 92 L58 92 C58 95.5 56 99.5 52 101 C51.5 101 51.5 97 51.5 92 Z" className="muscle-path" />
            <path d="M38 70 C35 72 33 77 34 83 C35 88 37 93 40 98 L41 92 C40 85 39 78 38 70 Z" className="muscle-path" />
            <path d="M62 70 C65 72 67 77 66 83 C65 88 63 93 60 98 L59 92 C60 85 61 78 62 70 Z" className="muscle-path" />
          </>
        ))}

        {/* Legs (Nogi - Quads & Calves front) */}
        {renderMuscleGroup('legs', 'Nogi', (
          <>
            <path d="M48 104 L36 103 C33 107 30 118 31 130 C32 139 34 144 36 146 L45 146 C47 141 48 123 48 104 Z" className="muscle-path" />
            <path d="M52 104 L64 103 C67 107 70 118 69 130 C68 139 66 144 64 146 L55 146 C53 141 52 123 52 104 Z" className="muscle-path" />
            <path d="M36 151 C32 156 31 166 33 175 C34 180 37 184 41 184 C43 184 44 177 44 168 L44 151 Z" className="muscle-path" />
            <path d="M64 151 C68 156 69 166 67 175 C66 180 63 184 59 184 C57 184 56 177 56 168 L56 151 Z" className="muscle-path" />
          </>
        ))}
      </g>

      {/* BACK FIGURE */}
      <g transform="translate(130, 6)">
        <text x="50" y="206" className="body-caption">TYŁ</text>

        {/* Base joints / silhouette */}
        <ellipse cx="50" cy="18" rx="8.5" ry="11.5" className="body-joint" />
        <path d="M46 27 L46 36 L54 36 L54 27 Z" className="body-joint" />
        <path d="M17 114 C15 117 14 123 15 128 C16 130 19 131 20 128 C22 124 23 119 23 114 Z" className="body-joint" />
        <path d="M83 114 C85 117 86 123 85 128 C84 130 81 131 80 128 C78 124 77 119 77 114 Z" className="body-joint" />
        <circle cx="41" cy="148" r="3.8" className="body-joint" />
        <circle cx="59" cy="148" r="3.8" className="body-joint" />
        <path d="M35 185 C34 190 30 194 26 196 C32 197 41 197 42 193 C42 189 42 185 42 185 Z" className="body-joint" />
        <path d="M65 185 C66 190 70 194 74 196 C68 197 59 197 58 193 C58 189 58 185 58 185 Z" className="body-joint" />

        {/* Back (Plecy - Trapezius, Lats, Lower back) */}
        {renderMuscleGroup('back', 'Plecy', (
          <>
            <path d="M50 31 L42 35 C38 39 36 43 36 46 C41 51 46 55 50 60 C54 55 59 51 64 46 C64 43 62 39 58 35 Z" className="muscle-path" />
            <path d="M35 47 C33 52 31 61 33 73 C35 79 38 85 42 89 L48.5 89 L48.5 61 C45 57 40 52 35 47 Z" className="muscle-path" />
            <path d="M65 47 C67 52 69 61 67 73 C65 79 62 85 58 89 L51.5 89 L51.5 61 C55 57 60 52 65 47 Z" className="muscle-path" />
            <path d="M43.5 90.5 L56.5 90.5 C55.5 96.5 54.5 100.5 50 101.5 C45.5 100.5 44.5 96.5 43.5 90.5 Z" className="muscle-path" />
          </>
        ))}

        {/* Shoulders (Barki - Rear deltoids) */}
        {renderMuscleGroup('shoulders', 'Barki', (
          <>
            <path d="M35 37 C29 39 22 43 21 51 C20 56 23 61 26 63 C29 61 31 57 32 51 C33 45 35 40 35 37 Z" className="muscle-path" />
            <path d="M65 37 C71 39 78 43 79 51 C80 56 77 61 74 63 C71 61 69 57 68 51 C67 45 65 40 65 37 Z" className="muscle-path" />
          </>
        ))}

        {/* Arms (Ramiona - Triceps & Forearms back) */}
        {renderMuscleGroup('arms', 'Ramiona', (
          <>
            <path d="M24 64 C22 66 21 73 22 80 C23 83 26 84 28 83 C30 78 30 71 28 64 Z" className="muscle-path" />
            <path d="M76 64 C78 66 79 73 78 80 C77 83 74 84 72 83 C70 78 70 71 72 64 Z" className="muscle-path" />
            <path d="M22 85 C18 88 16 96 17 103 C17 108 20 113 22 113 C23 113 25 106 26 97 L26 85 Z" className="muscle-path" />
            <path d="M78 85 C82 88 84 96 83 103 C83 108 80 113 78 113 C77 113 75 106 74 97 L74 85 Z" className="muscle-path" />
          </>
        ))}

        {/* Legs (Nogi - Glutes, Hamstrings, Calves back) */}
        {renderMuscleGroup('legs', 'Nogi', (
          <>
            <path d="M48.5 103 L36 102 C32 106 31 114 33 122 C36 126 42 127 48.5 125 Z" className="muscle-path" />
            <path d="M51.5 103 L64 102 C68 106 69 114 67 122 C64 126 58 127 51.5 125 Z" className="muscle-path" />
            <path d="M48.5 126 C43 128 35 127 34 130 C33 135 34 141 35 146 L46 146 C47 142 48 134 48.5 126 Z" className="muscle-path" />
            <path d="M51.5 126 C57 128 65 127 66 130 C67 135 66 141 65 146 L54 146 C53 142 52 134 51.5 126 Z" className="muscle-path" />
            <path d="M36 151 C31 156 31 166 33 175 C34 180 37 184 41 184 C43 184 44 177 44 168 L44 151 Z" className="muscle-path" />
            <path d="M64 151 C69 156 69 166 67 175 C66 180 63 184 59 184 C57 184 56 177 56 168 L56 151 Z" className="muscle-path" />
          </>
        ))}
      </g>
    </svg>
  );
}

interface MuscleAreaIconProps {
  id: MuscleAreaId;
  ready: number;
  className?: string;
}

/**
 * Focused SVG illustration for an individual muscle group,
 * displaying that specific anatomy with the target muscle highlighted.
 */
export function MuscleAreaIcon({ id, ready, className }: MuscleAreaIconProps) {
  const { fill } = getReadinessColor(ready);

  return (
    <svg
      viewBox="0 0 50 50"
      className={cn('h-10 w-10 shrink-0', className)}
      role="img"
      aria-hidden="true"
    >
      <style>{`
        .icon-base { fill: hsl(var(--secondary)); opacity: 0.55; }
        .icon-active { transition: fill 0.3s ease; }
      `}</style>

      {id === 'chest' && (
        <g transform="translate(0, 1)">
          {/* Head & neck base */}
          <circle cx="25" cy="7" r="4.5" className="icon-base" />
          <rect x="23" y="11" width="4" height="4" className="icon-base" />
          {/* Shoulders base */}
          <path d="M17 15 C13 16 10 18 9 22 L13 25 C14 21 15 19 17 17 Z" className="icon-base" />
          <path d="M33 15 C37 16 40 18 41 22 L37 25 C36 21 35 19 33 17 Z" className="icon-base" />
          {/* Pectorals ACTIVE */}
          <path d="M24 16 L17 16 C15.5 19 15 23 16 26 C17 30 21 31 24 30 Z" fill={fill} className="icon-active" />
          <path d="M26 16 L33 16 C34.5 19 35 23 34 26 C33 30 29 31 26 30 Z" fill={fill} className="icon-active" />
          {/* Abs base */}
          <path d="M21 31 L29 31 L27 42 L23 42 Z" className="icon-base" opacity="0.35" />
        </g>
      )}

      {id === 'back' && (
        <g transform="translate(0, 1)">
          <circle cx="25" cy="7" r="4.5" className="icon-base" />
          {/* Trapezius ACTIVE */}
          <path d="M25 12 L20 15 C18 17 17 19 17 21 C20 23 23 25 25 28 C27 25 30 23 33 21 C33 19 32 17 30 15 Z" fill={fill} className="icon-active" />
          {/* Lats ACTIVE */}
          <path d="M16 21 C15 24 14 29 15 34 C16 37 18 40 21 42 L24 42 L24 28 C21 26 18 23 16 21 Z" fill={fill} className="icon-active" />
          <path d="M34 21 C35 24 36 29 35 34 C34 37 32 40 29 42 L26 42 L26 28 C29 26 32 23 34 21 Z" fill={fill} className="icon-active" />
          {/* Lower back ACTIVE */}
          <path d="M21.5 42.5 L28.5 42.5 C28 45.5 27.5 47 25 47.5 C22.5 47 22 45.5 21.5 42.5 Z" fill={fill} className="icon-active" />
        </g>
      )}

      {id === 'shoulders' && (
        <g transform="translate(0, 1)">
          <circle cx="25" cy="7" r="4.5" className="icon-base" />
          <rect x="23" y="11" width="4" height="4" className="icon-base" />
          {/* Torso base */}
          <path d="M19 16 L31 16 L29 36 L21 36 Z" className="icon-base" opacity="0.4" />
          {/* Shoulders ACTIVE */}
          <path d="M18 15 C14 16 10 19 9 24 C9 27 11 29 13 30 C15 29 16 26 17 22 C17 19 18 17 18 15 Z" fill={fill} className="icon-active" />
          <path d="M32 15 C36 16 40 19 41 24 C41 27 39 29 37 30 C35 29 34 26 33 22 C33 19 32 17 32 15 Z" fill={fill} className="icon-active" />
          {/* Biceps base */}
          <path d="M11 31 L14 31 L13 40 L11 40 Z" className="icon-base" opacity="0.3" />
          <path d="M36 31 L39 31 L39 40 L37 40 Z" className="icon-base" opacity="0.3" />
        </g>
      )}

      {id === 'arms' && (
        <g transform="translate(0, 1)">
          <circle cx="25" cy="7" r="4.5" className="icon-base" opacity="0.4" />
          <path d="M19 15 L31 15 L29 36 L21 36 Z" className="icon-base" opacity="0.3" />
          {/* Biceps ACTIVE */}
          <path d="M13 18 C11 20 10 24 11 28 C12 31 14 32 16 31 C16 27 16 23 15 19 Z" fill={fill} className="icon-active" />
          <path d="M37 18 C39 20 40 24 39 28 C38 31 36 32 34 31 C34 27 34 23 35 19 Z" fill={fill} className="icon-active" />
          {/* Forearms ACTIVE */}
          <path d="M11 29 C9 32 8 36 8 40 C8 42 10 44 12 44 C13 43 14 39 14 35 L14 30 Z" fill={fill} className="icon-active" />
          <path d="M39 29 C41 32 42 36 42 40 C42 42 40 44 38 44 C37 43 36 39 36 35 L36 30 Z" fill={fill} className="icon-active" />
        </g>
      )}

      {id === 'core' && (
        <g transform="translate(0, 1)">
          <path d="M17 14 L33 14 L31 20 L19 20 Z" className="icon-base" opacity="0.3" />
          {/* Abs ACTIVE */}
          <path d="M24 21 L19 21 C18 23 18 25 19 27 L24 27 Z" fill={fill} className="icon-active" />
          <path d="M26 21 L31 21 C32 23 32 25 31 27 L26 27 Z" fill={fill} className="icon-active" />
          <path d="M24 28 L19 28 C19 30 19 32 20 34 L24 34 Z" fill={fill} className="icon-active" />
          <path d="M26 28 L31 28 C31 30 31 32 30 34 L26 34 Z" fill={fill} className="icon-active" />
          <path d="M24 35 L20 35 C20 37 21 39 24 40.5 Z" fill={fill} className="icon-active" />
          <path d="M26 35 L30 35 C30 37 29 39 26 40.5 Z" fill={fill} className="icon-active" />
          {/* Obliques ACTIVE */}
          <path d="M18 22 C16 24 15 27 16 31 C17 34 18 37 20 39 L20 35 C19 31 18 26 18 22 Z" fill={fill} className="icon-active" />
          <path d="M32 22 C34 24 35 27 34 31 C33 34 32 37 30 39 L30 35 C31 31 32 26 32 22 Z" fill={fill} className="icon-active" />
        </g>
      )}

      {id === 'legs' && (
        <g transform="translate(0, 1)">
          <path d="M20 12 L30 12 L28 16 L22 16 Z" className="icon-base" opacity="0.35" />
          {/* Thighs ACTIVE */}
          <path d="M24 16 L17 15 C15 17 14 23 15 29 C15 33 16 36 17 37 L22 37 C23 34 24 25 24 16 Z" fill={fill} className="icon-active" />
          <path d="M26 16 L33 15 C35 17 36 23 35 29 C35 33 34 36 33 37 L28 37 C27 34 26 25 26 16 Z" fill={fill} className="icon-active" />
          {/* Knee joints */}
          <circle cx="19.5" cy="38.5" r="1.5" className="icon-base" />
          <circle cx="30.5" cy="38.5" r="1.5" className="icon-base" />
          {/* Calves ACTIVE */}
          <path d="M17 40 C15 42 15 45 16 48 C16 49 18 50 19 50 C20 50 21 48 21 45 L21 40 Z" fill={fill} className="icon-active" />
          <path d="M33 40 C35 42 35 45 34 48 C34 49 32 50 31 50 C30 50 29 48 29 45 L29 40 Z" fill={fill} className="icon-active" />
        </g>
      )}
    </svg>
  );
}
