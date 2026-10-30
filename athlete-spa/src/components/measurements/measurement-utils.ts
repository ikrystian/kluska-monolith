import { differenceInCalendarDays, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { BodyMeasurement } from '@/lib/types';

export type CircumferenceKey = keyof BodyMeasurement['circumferences'];
export type MetricKey = 'weight' | CircumferenceKey;

export interface Metric {
  key: MetricKey;
  label: string;
  unit: 'kg' | 'cm';
}

export const WEIGHT: Metric = { key: 'weight', label: 'Waga', unit: 'kg' };

/** Ordered the way people usually read a tape-measure routine: core first, limbs after. */
export const CIRCUMFERENCES: (Metric & { key: CircumferenceKey })[] = [
  { key: 'waist', label: 'Talia', unit: 'cm' },
  { key: 'chest', label: 'Klatka', unit: 'cm' },
  { key: 'biceps', label: 'Biceps', unit: 'cm' },
  { key: 'hips', label: 'Biodra', unit: 'cm' },
  { key: 'thigh', label: 'Udo', unit: 'cm' },
  { key: 'calf', label: 'Łydka', unit: 'cm' },
  { key: 'neck', label: 'Szyja', unit: 'cm' },
];

export const METRICS: Metric[] = [WEIGHT, ...CIRCUMFERENCES];

export function metricOf(key: MetricKey): Metric {
  return METRICS.find(m => m.key === key) ?? WEIGHT;
}

/** A recorded value, or undefined — older entries stored 0 for "not measured". */
export function metricValue(m: BodyMeasurement, key: MetricKey): number | undefined {
  const value = key === 'weight' ? m.weight : m.circumferences?.[key];
  return typeof value === 'number' && value > 0 ? value : undefined;
}

export interface SeriesPoint {
  id: string;
  date: Date;
  value: number;
}

/** Oldest → newest points for one metric, skipping entries that don't have it. */
export function seriesOf(measurements: BodyMeasurement[], key: MetricKey): SeriesPoint[] {
  return measurements
    .map(m => ({ id: m.id, date: new Date(m.date), value: metricValue(m, key) }))
    .filter((p): p is SeriesPoint => p.value !== undefined)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Newest-first measurements → change between the latest value and the one before it. */
export function lastDelta(series: SeriesPoint[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1].value - series[series.length - 2].value;
}

export function formatDelta(delta: number, unit: string, digits = 1): string {
  const rounded = Number(delta.toFixed(digits));
  if (rounded === 0) return `0 ${unit}`;
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(digits)} ${unit}`;
}

export function daysSince(date: Date | string): number {
  return differenceInCalendarDays(new Date(), new Date(date));
}

export function relativeDays(days: number): string {
  if (days <= 0) return 'dzisiaj';
  if (days === 1) return 'wczoraj';
  return `${days} dni temu`;
}

export const monthLabel = (date: Date | string) => format(new Date(date), 'LLLL yyyy', { locale: pl });
