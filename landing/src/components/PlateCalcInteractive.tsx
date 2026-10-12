import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { reveal } from '../lib/reveal';

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
type Plate = (typeof PLATES)[number];

/* IWF colours + real diameters (mm), drawn to scale */
const STYLE: Record<Plate, { fill: string; text: string; d: number; t: number }> = {
  25: { fill: 'var(--color-plate-25)', text: 'var(--color-plate-5)', d: 450, t: 27 },
  20: { fill: 'var(--color-plate-20)', text: 'var(--color-plate-5)', d: 450, t: 23 },
  15: { fill: 'var(--color-plate-15)', text: 'var(--color-ink)', d: 400, t: 21 },
  10: { fill: 'var(--color-plate-10)', text: 'var(--color-plate-5)', d: 325, t: 21 },
  5: { fill: 'var(--color-plate-5)', text: 'var(--color-ink)', d: 228, t: 20 },
  2.5: { fill: 'var(--color-plate-2)', text: 'var(--color-plate-5)', d: 190, t: 16 },
  1.25: { fill: 'var(--color-plate-1)', text: 'var(--color-ink)', d: 160, t: 13 },
};

const PRESETS = [60, 100, 140, 180, 220];
const MAX = 500;

function solve(target: number, bar: number) {
  let left = Math.round(((target - bar) / 2) * 100) / 100;
  const out: Plate[] = [];
  if (left <= 0) return { plates: out, rest: 0 };
  for (const p of PLATES) {
    while (left + 1e-9 >= p) {
      out.push(p);
      left = Math.round((left - p) * 100) / 100;
    }
  }
  return { plates: out, rest: left };
}

const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 2 });

function BarbellSide({ plates }: { plates: Plate[] }) {
  // 1 mm = 0.4 units
  const s = 0.4;
  const H = 200;
  const cy = H / 2;
  let x = 70;
  return (
    <svg viewBox={`0 0 520 ${H}`} role="img" aria-label="Widok końcówki sztangi z talerzami" className="h-auto w-full">
      {/* shaft + collar + sleeve */}
      <rect x="0" y={cy - 6} width="52" height="12" fill="var(--color-steel)" />
      <rect x="52" y={cy - 18} width="14" height="36" rx="1" fill="var(--color-steel)" />
      <rect x="66" y={cy - 10} width="440" height="20" rx="2" fill="var(--color-steel)" opacity="0.7" />
      {plates.map((p, i) => {
        const st = STYLE[p];
        const h = st.d * s;
        const w = Math.max(st.t * s * 1.6, 6);
        const el = (
          <g key={i}>
            <rect x={x} y={cy - h / 2} width={w} height={h} rx="2" fill={st.fill} stroke="var(--color-ink)" strokeOpacity="0.25" />
            {h > 70 && (
              <text
                x={x + w / 2}
                y={cy - h / 2 + 18}
                fill={st.text}
                fontSize="9"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {fmt(p)}
              </text>
            )}
          </g>
        );
        x += w + 1.5;
        return el;
      })}
      {plates.length > 0 && <rect x={x + 2} y={cy - 16} width="12" height="32" rx="1" fill="var(--color-rule-strong)" />}
    </svg>
  );
}

export function PlateCalcInteractive() {
  const [target, setTarget] = useState(140);
  const [bar, setBar] = useState(20);
  const { plates, rest } = useMemo(() => solve(target, bar), [target, bar]);

  const grouped = useMemo(() => {
    const m = new Map<Plate, number>();
    plates.forEach((p) => m.set(p, (m.get(p) ?? 0) + 1));
    return [...m.entries()];
  }, [plates]);

  const set = (v: number) => setTarget(Math.min(MAX, Math.max(bar, Math.round(v * 4) / 4)));

  return (
    <section id="kalkulator" aria-labelledby="calc-title" className="bg-paper-2">
      <div className="grid lg:grid-cols-12">
        <figure {...reveal(0, 'image')} className="relative overflow-hidden lg:col-span-5">
          <img
            src="/images/plates-stack.webp"
            alt="Stos kolorowych talerzy olimpijskich od 25 do 2,5 kg ułożonych na podłodze siłowni"
            width={1400}
            height={1750}
            loading="lazy"
            className="block h-[70vw] max-h-[34rem] w-full object-cover lg:h-full lg:max-h-none"
          />
        </figure>

        <div className="px-4 py-16 sm:px-8 sm:py-20 lg:col-span-7 lg:px-12 xl:pr-[max(3rem,calc((100vw-84rem)/2+3rem))]">
          <h2 {...reveal(0)} id="calc-title" className="display text-[clamp(2.5rem,5.5vw,4.5rem)]">
            Nie licz talerzy w{'\u00a0'}głowie.
          </h2>
          <p {...reveal(1)} className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
            Czwarta seria przysiadów to nie czas na matematykę. Wpisz ciężar — aplikacja rozpisze talerze na stronę.
            Spróbuj tutaj.
          </p>

          <div {...reveal(2)} className="mt-10 rounded-[var(--radius-ui)] border border-rule-strong bg-paper-3/60">
            <div className="grid gap-6 border-b border-rule p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-6">
              <div>
                <label htmlFor="target" className="label text-ink-2">
                  Ciężar docelowy
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set(target - 2.5)}
                    disabled={target <= bar}
                    aria-label="Odejmij 2,5 kg"
                    className="btn btn-ghost !min-h-12 !w-12 !px-0"
                  >
                    <Minus className="size-4" />
                  </button>
                  <div className="relative">
                    <input
                      id="target"
                      type="number"
                      inputMode="decimal"
                      min={bar}
                      max={MAX}
                      step={2.5}
                      value={target}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!Number.isNaN(v)) setTarget(Math.min(MAX, v));
                      }}
                      onBlur={() => set(target)}
                      className="num h-12 w-32 rounded-[var(--radius-ui)] border border-rule-strong bg-paper pl-3 pr-10 text-2xl font-semibold focus:border-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2">kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => set(target + 2.5)}
                    disabled={target >= MAX}
                    aria-label="Dodaj 2,5 kg"
                    className="btn btn-ghost !min-h-12 !w-12 !px-0"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              <fieldset>
                <legend className="label text-ink-2">Gryf</legend>
                <div className="mt-2 inline-flex rounded-[var(--radius-ui)] border border-rule-strong p-1">
                  {[
                    [20, 'Męski 20 kg'],
                    [15, 'Damski 15 kg'],
                  ].map(([w, l]) => (
                    <button
                      key={w}
                      type="button"
                      aria-pressed={bar === w}
                      onClick={() => {
                        setBar(w as number);
                        if (target < (w as number)) setTarget(w as number);
                      }}
                      className={`h-10 whitespace-nowrap rounded-[2px] px-3.5 text-sm font-semibold transition-colors ${
                        bar === w ? 'bg-paper-3 text-ink shadow-[inset_0_-2px_0_var(--color-accent)]' : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-rule px-5 py-3 sm:px-6">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set(p)}
                  aria-pressed={target === p}
                  className={`num h-9 rounded-[2px] border px-3 text-sm transition-colors ${
                    target === p ? 'border-accent bg-accent text-on-accent' : 'border-rule-strong hover:border-ink'
                  }`}
                >
                  {p} kg
                </button>
              ))}
            </div>

            <div className="px-3 pt-6 sm:px-6">
              <BarbellSide plates={plates} />
            </div>

            <div className="px-5 pb-6 pt-4 sm:px-6" aria-live="polite">
              <p className="label text-ink-2">Na każdą stronę</p>
              {grouped.length === 0 ? (
                <p className="mt-2">Sam gryf — {bar} kg.</p>
              ) : (
                <p className="num mt-2 text-xl font-semibold">
                  {grouped.map(([p, n], i) => (
                    <span key={p}>
                      {i > 0 && <span className="text-ink-2"> + </span>}
                      {n > 1 && `${n} × `}
                      {fmt(p)}
                    </span>
                  ))}
                  <span className="text-ink-2"> kg</span>
                </p>
              )}
              {rest > 0 && (
                <p className="mt-2 text-sm text-accent-ink">
                  Z talerzami do 1,25 kg brakuje {fmt(rest * 2)} kg — najbliżej: {fmt(target - rest * 2)} kg.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
