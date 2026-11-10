import { plural, type Season } from '../lib/season';

const pad = (n: number) => String(n).padStart(2, '0');

/* Time left to 1 January, ticking. Outside the campaign months it reads the day of the year instead. */
export function Countdown({ season, className = '' }: { season: Season; className?: string }) {
  if (!season.pre) {
    return (
      <p className={`flex items-baseline gap-3 ${className}`}>
        <span className="big text-[clamp(2.5rem,9vw,4.25rem)]">
          {season.dayOfYear}
          <span className="text-ink-2">/{season.daysInYear}</span>
        </span>
        <span className="label max-w-[11rem] text-ink-2">dzień roku {season.planYear}. Każdy następny też się liczy.</span>
      </p>
    );
  }

  const units = [
    {
      value: String(season.days),
      label: plural(season.days, 'dzień', 'dni', 'dni'),
    },
    { value: pad(season.hours), label: 'godz.' },
    { value: pad(season.minutes), label: 'min' },
    { value: pad(season.seconds), label: 's' },
  ];

  return (
    <div className={className}>
      <p className="label text-ink-2">Do 1 stycznia {season.planYear} zostało</p>
      <p
        role="timer"
        aria-label={`${season.days} ${units[0].label} do 1 stycznia ${season.planYear}`}
        className="mt-1.5 flex items-baseline gap-x-4 sm:gap-x-6"
      >
        {units.map((u) => (
          <span key={u.label} className="flex items-baseline gap-1.5" aria-hidden>
            <span className="big text-[clamp(2.5rem,9vw,4.25rem)]">
              <span key={u.value} className="tick">
                {u.value}
              </span>
            </span>
            <span className="text-sm font-semibold text-ink-2">{u.label}</span>
          </span>
        ))}
      </p>
    </div>
  );
}
