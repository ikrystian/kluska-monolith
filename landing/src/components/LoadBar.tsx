import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BAR_KG, FULL_KG, STAGES, useCountUp, type StageId } from '../lib/stages';

/* The hero's barbell: four plates, one per part of the app. The visitor loads them.
   Drawn in SVG from tokens; plates move by transform only. */

type Geometry = { width: number; collar: number; gap: number; font: number };

const HEIGHT = 240;
const MID = HEIGHT / 2;
const COLLAR_W = 14;
const SPACE = 4;
const PLATE_W: Record<number, number> = { 25: 40, 20: 36, 15: 30, 10: 26 };
const PLATE_H: Record<number, number> = { 25: 216, 20: 216, 15: 178, 10: 142 };

const WIDE: Geometry = { width: 1000, collar: 262, gap: 150, font: 112 };
const COMPACT: Geometry = { width: 560, collar: 176, gap: 96, font: 78 };

type Plate = (typeof STAGES)[number] & { loaded: boolean };

function Sleeve({ plates, collar, mirrored }: { plates: Plate[]; collar: number; mirrored: boolean }) {
  // Loaded plates sit against the collar, heaviest first; the rest wait further out as outlines.
  const ordered = [...plates].sort((a, b) => Number(b.loaded) - Number(a.loaded) || b.kg - a.kg);
  let cursor = collar - SPACE;

  return (
    <>
      {ordered.map((p) => {
        const w = PLATE_W[p.kg];
        const h = PLATE_H[p.kg];
        const x = cursor - w;
        cursor = x - SPACE;
        return (
          <g key={p.id} className="bar-plate" style={{ transform: `translateX(${x}px)`, opacity: p.loaded ? 1 : 0.5 }}>
            <rect
              y={MID - h / 2}
              width={w}
              height={h}
              rx={7}
              fill={p.loaded ? p.tone : 'transparent'}
              stroke={p.loaded ? 'none' : 'var(--color-ink-3)'}
              strokeWidth={1.5}
              strokeDasharray={p.loaded ? undefined : '5 5'}
            />
            {p.loaded && <rect x={5} y={MID - h / 2 + 9} width={3} height={h - 18} rx={1.5} fill="var(--color-ink)" opacity={0.25} />}
            {/* the right sleeve is the left one mirrored, so its labels are flipped back */}
            <g transform={mirrored ? `translate(${w} 0) scale(-1 1)` : undefined}>
              <text
                transform={`translate(${w / 2 + 6} ${MID}) rotate(-90)`}
                textAnchor="middle"
                fontSize={18}
                className="big max-sm:hidden"
                fill={p.loaded ? 'var(--color-on-plate)' : 'var(--color-ink-3)'}
              >
                {p.kg}
              </text>
            </g>
          </g>
        );
      })}
    </>
  );
}

function Bar({ plates, total, g, className }: { plates: Plate[]; total: number; g: Geometry; className: string }) {
  const cx = g.width / 2;
  const inner = g.collar + COLLAR_W;
  const shaft = Math.max(0, cx - g.gap - inner);
  const side = (mirrored: boolean) => (
    <>
      <rect x={0} y={MID - 9} width={g.collar} height={18} rx={4} fill="var(--color-steel)" opacity={0.75} />
      <rect x={g.collar} y={MID - 24} width={COLLAR_W} height={48} rx={3} fill="var(--color-steel)" />
      {shaft > 0 && <rect x={inner} y={MID - 4} width={shaft} height={8} fill="var(--color-steel)" opacity={0.5} />}
      <Sleeve plates={plates} collar={g.collar} mirrored={mirrored} />
    </>
  );

  return (
    <svg viewBox={`0 0 ${g.width} ${HEIGHT}`} className={`h-auto w-full ${className}`} aria-hidden>
      <g>{side(false)}</g>
      <g transform={`translate(${g.width} 0) scale(-1 1)`}>{side(true)}</g>
      <text x={cx} y={MID + g.font * 0.34} textAnchor="middle" fontSize={g.font} className="big" fill="var(--color-ink)">
        {total}
        <tspan dx={g.font * 0.08} fontSize={g.font * 0.3} fill="var(--color-ink-2)">
          kg
        </tspan>
      </text>
    </svg>
  );
}

export function LoadBar() {
  const [loaded, setLoaded] = useState<Set<StageId>>(new Set());
  const touched = useRef(false);

  // Opening move: two plates go on by themselves, the other two are left for the visitor.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLoaded(new Set<StageId>(['trening', 'dieta']));
      return;
    }
    const add = (id: StageId) => () => {
      if (!touched.current) setLoaded((prev) => new Set(prev).add(id));
    };
    const timers = [window.setTimeout(add('trening'), 900), window.setTimeout(add('dieta'), 1500)];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const toggle = (id: StageId) => {
    touched.current = true;
    setLoaded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const plates: Plate[] = STAGES.map((s) => ({ ...s, loaded: loaded.has(s.id) }));
  const total = BAR_KG + 2 * plates.reduce((sum, p) => sum + (p.loaded ? p.kg : 0), 0);
  const shown = useCountUp(total);
  const full = total === FULL_KG;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="label text-ink-2">Załaduj sztangę — każdy talerz to część aplikacji</p>
        <p className={`label shrink-0 ${full ? 'text-volt' : 'text-ink-2'}`} aria-live="polite">
          {full ? 'Lightweight, baby!' : `do pełna ${FULL_KG - total} kg`}
        </p>
      </div>

      <div className="mt-4" role="img" aria-label={`Sztanga: ${total} z ${FULL_KG} kilogramów`}>
        <Bar plates={plates} total={shown} g={WIDE} className="hidden sm:block" />
        <Bar plates={plates} total={shown} g={COMPACT} className="sm:hidden" />
      </div>

      <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-2 min-[520px]:grid-cols-2 lg:grid-cols-4">
        {plates.map((p) => (
          <li key={p.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={p.loaded}
              onClick={() => toggle(p.id)}
              style={{ '--tone': p.tone } as CSSProperties}
              className="group flex w-full items-center gap-3 rounded-[var(--radius-ui)] bg-paper-2 px-3.5 py-3 text-left transition-[background-color,transform] duration-150 hover:bg-paper-3 active:scale-[0.98]"
            >
              <span className="min-w-0 flex-1">
                <span className={`block h-1 rounded-full transition-colors duration-300 ${p.loaded ? 'bg-[var(--tone)]' : 'bg-paper-3 group-hover:bg-rule-strong'}`} />
                <span className="mt-2 block truncate text-[15px] font-semibold leading-tight">{p.label}</span>
                <span className="block truncate text-[13px] text-ink-2">{p.hint}</span>
              </span>
              <span className={`big shrink-0 text-3xl transition-colors duration-300 ${p.loaded ? 'text-ink' : 'text-ink-3'}`}>
                {p.kg}
                <span className="ml-0.5 font-sans text-xs font-semibold text-ink-2">kg</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
