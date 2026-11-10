/**
 * Sprawdza czystą logikę modułu nagród — bez bazy i bez sieci.
 *   MONGO_DB_URI=mongodb://unused npx tsx scripts/check-gamification.ts
 *
 * (Zmienna jest wymagana przy imporcie `lib/mongodb`, ale skrypt z nikim się nie łączy.)
 */
import assert from 'node:assert/strict';
import { computeStreaks, dayKey, effectiveStreak, weekStartKey } from '../src/lib/gamification/streaks';
import { summarizeActivity, workoutVolumeKg, LogLike } from '../src/lib/gamification/stats';
import { buildTracks, CATALOG, evaluateCatalog } from '../src/lib/gamification/catalog';
import { bestsFromLog, findNewRecords } from '../src/lib/gamification/records';
import { goalFraction, goalPace, isGoalReached } from '../src/lib/gamification/goal-progress';
import { buildQuestViews, pickWeeklyQuests } from '../src/lib/gamification/quests';
import { currentFromRaw } from '../src/lib/gamification/goals';
import {
  calculateLevelFromXP,
  calculateRunPoints,
  streakMilestoneCrossed,
} from '../src/lib/gamification/point-calculator';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const set = (weight: number, reps: number, completed = true) => ({ weight, reps, completed });
const log = (endTime: string, sets: ReturnType<typeof set>[], extra: Partial<LogLike> = {}): LogLike => ({
  endTime,
  duration: 60,
  exercises: [{ exerciseId: 'bench', exercise: { type: 'weight', name: 'Wyciskanie' }, sets }],
  ...extra,
});

console.log('Serie dni');
check('klucz dnia w strefie Europe/Warsaw (23:30 UTC to już następny dzień)', () => {
  assert.equal(dayKey('2026-11-09T23:30:00Z'), '2026-11-10');
});
check('seria liczy dni kalendarzowe, nie treningi', () => {
  const s = computeStreaks(['2026-11-08', '2026-11-09', '2026-11-09', '2026-11-10'], '2026-11-10');
  assert.deepEqual([s.current, s.longest, s.activeDays], [3, 3, 3]);
});
check('wczorajsza aktywność podtrzymuje serię, przedwczorajsza już nie', () => {
  assert.equal(computeStreaks(['2026-11-08', '2026-11-09'], '2026-11-10').current, 2);
  assert.equal(computeStreaks(['2026-11-07', '2026-11-08'], '2026-11-10').current, 0);
});
check('najdłuższa seria przeżywa przerwę; przejście przez koniec miesiąca', () => {
  const s = computeStreaks(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-09'], '2026-11-10');
  assert.deepEqual([s.current, s.longest], [1, 4]);
});
check('seria ze snapshotu wygasa po dniu przerwy', () => {
  assert.equal(effectiveStreak(5, '2026-11-09', '2026-11-10'), 5);
  assert.equal(effectiveStreak(5, '2026-11-08', '2026-11-10'), 0);
  assert.equal(effectiveStreak(5, null, '2026-11-10'), 0);
});
check('tydzień zaczyna się w poniedziałek', () => {
  assert.equal(weekStartKey('2026-11-10'), '2026-11-09'); // wtorek
  assert.equal(weekStartKey('2026-11-15'), '2026-11-09'); // niedziela
  assert.equal(weekStartKey('2026-11-09'), '2026-11-09');
});

console.log('Statystyki');
check('objętość: tylko odhaczone serie ćwiczeń siłowych', () => {
  const l: LogLike = {
    exercises: [
      { exerciseId: 'a', exercise: { type: 'weight' }, sets: [set(100, 5), set(100, 5, false)] },
      { exerciseId: 'b', exercise: { type: 'reps' }, sets: [set(20, 10)] },
    ],
  };
  assert.equal(workoutVolumeKg(l), 500);
});
check('podsumowanie: tonaż, tydzień, ranny trening, weekend', () => {
  const now = new Date('2026-11-10T18:00:00Z'); // wtorek
  const stats = summarizeActivity(
    {
      logs: [
        log('2026-11-10T05:30:00Z', [set(100, 10)]), // 6:30 czasu polskiego → ranny
        log('2026-11-08T10:00:00Z', [set(50, 10)], { gymId: 'g1' }), // niedziela, poprzedni tydzień
        log('2026-10-01T10:00:00Z', [set(200, 10)], { gymId: 'g2' }),
      ],
      runs: [{ date: '2026-11-09T07:00:00Z', km: 5.24 }],
      otherActivityDates: [],
      prCount: 2,
      goalsCompleted: 1,
      habitCompletions: 7,
      measurementsCount: 3,
    },
    now
  );
  assert.equal(stats.totalVolumeKg, 3500);
  assert.equal(stats.bestWorkoutVolumeKg, 2000);
  assert.equal(stats.workoutCount, 3);
  assert.equal(stats.earlyWorkouts, 1);
  assert.equal(stats.weekendWorkouts, 1);
  assert.equal(stats.distinctGyms, 2);
  assert.equal(stats.currentStreakDays, 3); // 8, 9 (bieg), 10
  assert.deepEqual(stats.week, { weekKey: '2026-11-09', workouts: 1, volumeKg: 1000, activeDays: 2, runKm: 5.2 });
  assert.equal(stats.baseline.workoutsPerWeek, 0.25);
});

console.log('Katalog osiągnięć');
const emptyStats = summarizeActivity(
  { logs: [], runs: [], otherActivityDates: [], prCount: 0, goalsCompleted: 0, habitCompletions: 0, measurementsCount: 0 },
  new Date('2026-11-10T12:00:00Z')
);
check('klucze katalogu są unikalne', () => {
  assert.equal(new Set(CATALOG.map(a => a.key)).size, CATALOG.length);
});
check('pusty dorobek nie odblokowuje niczego', () => {
  assert.equal(evaluateCatalog(emptyStats, 1, []).length, 0);
});
check('12 ton i 10 treningów: progi tonażu w kilogramach, bez powtórnego odblokowania', () => {
  const stats = { ...emptyStats, totalVolumeKg: 12_000, workoutCount: 10 };
  const keys = evaluateCatalog(stats, 1, ['volume_1']).map(a => a.key);
  assert.deepEqual(keys.sort(), ['volume_10', 'workouts_1', 'workouts_10'].sort());
});
check('ścieżka pokazuje postęp do następnego progu', () => {
  const stats = { ...emptyStats, totalVolumeKg: 30_000 };
  const volume = buildTracks(stats, 1, [{ key: 'volume_1' }, { key: 'volume_10' }]).find(t => t.id === 'volume')!;
  assert.equal(volume.value, 30);
  assert.equal(volume.nextThreshold, 50);
  assert.equal(volume.progressToNext, 0.5); // (30 − 10) / (50 − 10)
  assert.equal(volume.unlockedCount, 2);
});

console.log('Rekordy życiowe');
check('pierwszy raz w ćwiczeniu ustala bazę, nie daje rekordu', () => {
  const current = bestsFromLog(log('2026-11-10T10:00:00Z', [set(80, 5), set(100, 3)]));
  assert.deepEqual(current.map(b => [b.value, b.reps]), [[100, 3]]);
  assert.equal(findNewRecords(current, new Map()).length, 0);
});
check('rekord tylko przy wyniku wyższym niż dotychczasowy', () => {
  const current = bestsFromLog(log('2026-11-10T10:00:00Z', [set(100, 3)]));
  assert.equal(findNewRecords(current, new Map([['bench', 100]])).length, 0);
  assert.equal(findNewRecords(current, new Map([['bench', 97.5]])).length, 1);
});
check('nieodhaczona seria i seria bez powtórzeń nie są rekordem', () => {
  assert.equal(bestsFromLog(log('2026-11-10T10:00:00Z', [set(200, 5, false), set(150, 0)])).length, 0);
});

console.log('Cele');
check('cel narastający: postęp = current / target', () => {
  assert.equal(goalFraction({ metric: 'total_volume', target: 50, current: 12.5, startValue: 80_000 }), 0.25);
  assert.equal(currentFromRaw('total_volume', 92_500, 80_000), 12.5);
  assert.equal(currentFromRaw('workout_count', 42, 40), 2);
});
check('cel bezwzględny liczy drogę od startu (80 → 100 kg, jest 90)', () => {
  assert.equal(goalFraction({ metric: 'exercise_max_weight', target: 100, current: 90, startValue: 80 }), 0.5);
});
check('waga ciała w dół: 90 → 80 kg, jest 84', () => {
  const goal = { metric: 'body_weight' as const, direction: 'down' as const, target: 80, current: 84, startValue: 90 };
  assert.equal(goalFraction(goal), 0.6);
  assert.equal(isGoalReached(goal), false);
  assert.equal(isGoalReached({ ...goal, current: 79.8 }), true);
});
check('tempo: w terminie, za wolno, po terminie', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const base = { metric: 'manual' as const, target: 100, startDate: '2026-10-31T12:00:00Z' };
  // 50% w 10 dni → jeszcze 10 dni
  assert.equal(goalPace({ ...base, current: 50, deadline: '2026-11-25T12:00:00Z' }, now).status, 'on_track');
  assert.equal(goalPace({ ...base, current: 50, deadline: '2026-11-15T12:00:00Z' }, now).status, 'behind');
  const overdue = goalPace({ ...base, current: 50, deadline: '2026-11-07T12:00:00Z' }, now);
  assert.deepEqual([overdue.status, overdue.daysLeft], ['overdue', -3]);
  assert.equal(goalPace({ ...base, current: 0, deadline: '2026-11-25T12:00:00Z' }, now).status, 'not_started');
  assert.equal(goalPace({ ...base, current: 100, deadline: '2026-11-07T12:00:00Z' }, now).status, 'done');
});

console.log('Wyzwania tygodnia i punkty');
check('początkujący dostaje osiągalne minimum', () => {
  assert.deepEqual(
    pickWeeklyQuests({ workoutsPerWeek: 0, volumePerWeekKg: 0 }).map(q => q.target),
    [2, 2000, 3]
  );
});
check('regularny użytkownik dostaje trochę więcej niż średnia', () => {
  assert.deepEqual(
    pickWeeklyQuests({ workoutsPerWeek: 3.25, volumePerWeekKg: 18_200 }).map(q => q.target),
    [4, 20_000, 5]
  );
});
check('widok wyzwania: ukończone po osiągnięciu celu', () => {
  const views = buildQuestViews(
    [{ id: 'workouts', target: 3, xp: 100 }],
    { weekKey: '2026-11-09', workouts: 4, volumeKg: 0, activeDays: 2, runKm: 0 }
  );
  assert.deepEqual([views[0].progress, views[0].completed, views[0].title], [3, true, 'Zrób 3 treningi']);
});
check('bonus za serię płaci raz, przy przekroczeniu progu', () => {
  assert.equal(streakMilestoneCrossed(6, 7), 50);
  assert.equal(streakMilestoneCrossed(7, 8), 0);
  assert.equal(streakMilestoneCrossed(0, 30), 250);
});
check('punkty za bieg i poziom z XP', () => {
  assert.equal(calculateRunPoints(5.9), 55);
  assert.equal(calculateRunPoints(42), 100);
  assert.deepEqual(calculateLevelFromXP(250), { level: 3, currentXP: 0, xpForNextLevel: 225 });
});

console.log(`\nWszystkie sprawdzenia przeszły (${passed}).`);
