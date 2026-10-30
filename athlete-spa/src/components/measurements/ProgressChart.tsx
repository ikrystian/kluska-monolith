import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import type { BodyMeasurement } from '@/lib/types';
import { METRICS, formatDelta, metricOf, seriesOf, type MetricKey } from './measurement-utils';

const RANGES = [
  { id: '30', label: '30 dni', days: 30 },
  { id: '90', label: '3 mies.', days: 90 },
  { id: '365', label: 'Rok', days: 365 },
  { id: 'all', label: 'Całość', days: null },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

const config = { value: { label: 'Wartość', color: 'hsl(var(--primary))' } } satisfies ChartConfig;

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { fullDate: string; value: number } }[];
  unit: string;
}

function ChartTip({ active, payload, unit }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { fullDate, value } = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 shadow-lifted">
      <p className="text-[11px] text-muted-foreground">{fullDate}</p>
      <p className="font-headline text-base font-bold tabular-nums">
        {value.toFixed(1)} <span className="text-xs font-medium text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

interface ProgressChartProps {
  measurements: BodyMeasurement[];
  metric: MetricKey;
  onMetricChange: (key: MetricKey) => void;
}

/** Trend of one metric over a selectable window, with start / now / change underneath. */
export function ProgressChart({ measurements, metric, onMetricChange }: ProgressChartProps) {
  const [range, setRange] = useState<RangeId>('90');
  const { label, unit } = metricOf(metric);

  // Only offer metrics that have at least one data point.
  const available = useMemo(() => METRICS.filter(m => seriesOf(measurements, m.key).length > 0), [measurements]);

  const data = useMemo(() => {
    const days = RANGES.find(r => r.id === range)?.days;
    const since = days ? subDays(new Date(), days) : null;
    return seriesOf(measurements, metric)
      .filter(p => !since || p.date >= since)
      .map(p => ({
        value: p.value,
        label: format(p.date, 'd MMM', { locale: pl }),
        fullDate: format(p.date, 'd MMMM yyyy', { locale: pl }),
      }));
  }, [measurements, metric, range]);

  const start = data[0]?.value;
  const now = data[data.length - 1]?.value;
  const gradientId = `fill-${metric}`;

  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Trend</p>
          <h2 className="font-headline text-2xl font-bold tracking-tight">{label}</h2>
        </div>
        <div className="flex rounded-full bg-secondary p-1" role="group" aria-label="Zakres czasu">
          {RANGES.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              aria-pressed={range === r.id}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
                range === r.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {available.length > 1 && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-5 md:px-5 [&::-webkit-scrollbar]:hidden">
          {available.map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => onMetricChange(m.key)}
              aria-pressed={metric === m.key}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                metric === m.key ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {data.length < 2 ? (
        <div className="grid h-56 place-items-center text-center text-muted-foreground">
          <div>
            <LineChartIcon className="mx-auto h-8 w-8" />
            <p className="mt-2 text-sm font-medium">Za mało danych w tym zakresie</p>
            <p className="text-xs">Potrzebne są co najmniej dwa pomiary: {label.toLowerCase()}.</p>
          </div>
        </div>
      ) : (
        <>
          <ChartContainer config={config} className="mt-4 aspect-auto h-56 w-full">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={v => Number(v).toFixed(0)}
                domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTip unit={unit} />} />
              <Area
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={data.length <= 24}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>

          <dl className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-2xl bg-secondary/50 py-3 text-center">
            {[
              ['Start', `${start.toFixed(1)} ${unit}`],
              ['Teraz', `${now.toFixed(1)} ${unit}`],
              ['Zmiana', formatDelta(now - start, unit)],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col-reverse px-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="font-headline text-base font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
