import type { CSSProperties } from 'react';
import { plural, type Season } from '../lib/season';

const pad = (n: number) => String(n).padStart(2, '0');

const R_YEAR = 184;
const R_DAY = 158;
const C_YEAR = 2 * Math.PI * R_YEAR;
const C_DAY = 2 * Math.PI * R_DAY;

const ring = (len: number, part: number) =>
  ({ '--ring-len': len, strokeDasharray: len, strokeDashoffset: len * (1 - part) }) as CSSProperties;

/* The hero's one number. The lime ring is the year that has already gone, the thin one is today;
   inside, the days left to 1 January tick down. Outside the campaign months the centre reads the
   day of the year instead. Everything is calendar arithmetic — nothing estimated. */
export function PulseRing({ season, now, className = '' }: { season: Season; now: Date; className?: string }) {
  const dayPart = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86_400;
  const yearPart = (season.dayOfYear - 1 + dayPart) / season.daysInYear;
  const year = now.getFullYear();

  return (
    <div className={`relative isolate aspect-square ${className}`}>
      <div aria-hidden className="ring-glow absolute -inset-[18%] -z-10" />

      <svg viewBox="0 0 400 400" aria-hidden className="size-full -rotate-90 overflow-visible">
        <circle cx="200" cy="200" r={R_YEAR} fill="none" strokeWidth="2" stroke="var(--color-accent)" className="ring-pulse" />
        <circle cx="200" cy="200" r={R_YEAR} fill="none" strokeWidth="14" stroke="var(--color-paper-3)" />
        <circle
          cx="200"
          cy="200"
          r={R_YEAR}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          stroke="var(--color-accent)"
          className="ring-year"
          style={ring(C_YEAR, yearPart)}
        />
        {/* twelve month marks between the two rings */}
        {Array.from({ length: 12 }, (_, m) => (
          <line
            key={m}
            x1="200"
            y1={200 - 173}
            x2="200"
            y2={200 - 167}
            strokeWidth="2"
            strokeLinecap="round"
            stroke="var(--color-rule-strong)"
            transform={`rotate(${m * 30 + 90} 200 200)`}
          />
        ))}
        <circle cx="200" cy="200" r={R_DAY} fill="none" strokeWidth="4" stroke="var(--color-paper-3)" />
        <circle
          cx="200"
          cy="200"
          r={R_DAY}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          stroke="var(--color-ink)"
          className="ring-day"
          style={ring(C_DAY, dayPart)}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">
        {season.pre ? (
          <div role="timer" aria-label={`${season.days} ${plural(season.days, 'dzień', 'dni', 'dni')} do 1 stycznia ${season.planYear}`}>
            <p className="label text-ink-2" aria-hidden>
              do 1 stycznia {season.planYear}
            </p>
            <p className="big -mt-[0.02em] text-[clamp(5.5rem,34cqi,11rem)] !leading-[0.9] text-accent" aria-hidden>
              {season.days}
            </p>
            <p className="t-item" aria-hidden>
              {plural(season.days, 'dzień', 'dni', 'dni')}
            </p>
            <p className="big mt-2 text-[clamp(1.25rem,7cqi,2rem)] text-ink-2" aria-hidden>
              {pad(season.hours)}:{pad(season.minutes)}:
              <span key={season.seconds} className="tick">
                {pad(season.seconds)}
              </span>
            </p>
          </div>
        ) : (
          <div>
            <p className="label text-ink-2">dzień roku {year}</p>
            <p className="big text-[clamp(5.5rem,34cqi,11rem)] !leading-[0.9] text-accent">{season.dayOfYear}</p>
            <p className="t-item text-ink-2">z {season.daysInYear}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* What the two rings mean, in words. */
export function RingLegend({ season, now, className = '' }: { season: Season; now: Date; className?: string }) {
  const gone = Math.floor(((season.dayOfYear - 1) / season.daysInYear) * 100);

  return (
    <ul className={`space-y-1.5 text-sm text-ink-2 ${className}`}>
      <li className="flex items-center gap-2.5">
        <span aria-hidden className="h-1.5 w-5 shrink-0 rounded-full bg-accent" />
        <span>
          Rok {now.getFullYear()}: za nami <span className="num font-semibold text-ink">{gone}%</span>
        </span>
      </li>
      <li className="flex items-center gap-2.5">
        <span aria-hidden className="h-1 w-5 shrink-0 rounded-full bg-ink" />
        <span>
          Dziś: <span className="num font-semibold text-ink">{pad(now.getHours())}:{pad(now.getMinutes())}</span> — jeszcze zdążysz
        </span>
      </li>
    </ul>
  );
}
