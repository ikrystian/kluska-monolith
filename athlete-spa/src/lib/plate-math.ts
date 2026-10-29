/** Plate denominations found on a typical gym rack, heaviest first (kg). */
export const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export interface BarOption {
  weight: number;
  label: string;
}

export const BAR_OPTIONS: BarOption[] = [
  { weight: 20, label: 'Olimpijska 20 kg' },
  { weight: 15, label: 'Damska 15 kg' },
  { weight: 10, label: 'Lekka 10 kg' },
  { weight: 0, label: 'Bez gryfu' },
];

const BAR_STORAGE_KEY = 'athlete-spa:plate-calc-bar';

export function getPreferredBarWeight(): number {
  const stored = Number(localStorage.getItem(BAR_STORAGE_KEY));
  return BAR_OPTIONS.some(option => option.weight === stored) ? stored : 20;
}

export function setPreferredBarWeight(weight: number): void {
  try {
    localStorage.setItem(BAR_STORAGE_KEY, String(weight));
  } catch {
    // Preference is a nicety; the calculator still works without it.
  }
}

export interface PlateBreakdown {
  /** Plates for one side, heaviest first. */
  plates: number[];
  /** Weight actually achievable with the available denominations. */
  achievable: number;
  /** Target minus achievable; non-zero when the target can't be loaded exactly. */
  remainder: number;
  /** Target is below the bar alone. */
  belowBar: boolean;
}

/**
 * Which plates go on each side of the bar to reach `target`.
 *
 * Greedy from the heaviest denomination down, which is optimal here because
 * every plate divides evenly into the ones above it — and it also matches how
 * a bar is actually loaded, big plates innermost.
 */
export function calculatePlates(target: number, barWeight: number): PlateBreakdown {
  if (!Number.isFinite(target) || target <= 0) {
    return { plates: [], achievable: barWeight, remainder: 0, belowBar: false };
  }

  if (target < barWeight) {
    return { plates: [], achievable: barWeight, remainder: 0, belowBar: true };
  }

  // Everything is per side, so the bar's contribution is split in half too.
  let perSide = (target - barWeight) / 2;
  const plates: number[] = [];

  for (const plate of AVAILABLE_PLATES) {
    // Floating point: 2.5 * 3 can land at 7.499999, so compare with a margin
    // smaller than the finest denomination.
    while (perSide + 1e-9 >= plate) {
      plates.push(plate);
      perSide -= plate;
    }
  }

  const loadedPerSide = plates.reduce((sum, plate) => sum + plate, 0);
  const achievable = barWeight + loadedPerSide * 2;

  return {
    plates,
    achievable: Math.round(achievable * 100) / 100,
    remainder: Math.round((target - achievable) * 100) / 100,
    belowBar: false,
  };
}

/** Groups a per-side plate list into `{ plate, count }` for display. */
export function groupPlates(plates: number[]): { plate: number; count: number }[] {
  const grouped: { plate: number; count: number }[] = [];
  for (const plate of plates) {
    const last = grouped[grouped.length - 1];
    if (last && last.plate === plate) last.count += 1;
    else grouped.push({ plate, count: 1 });
  }
  return grouped;
}
