/**
 * Sprawdza czystą logikę modułu nagród — bez bazy i bez sieci.
 *   MONGO_DB_URI=mongodb://unused npx tsx scripts/check-gamification.ts
 *
 * (Zmienna jest wymagana przy imporcie `lib/mongodb`, ale skrypt z nikim się nie łączy.)
 */
import assert from 'node:assert/strict';
import { computeStreaks, computeWeeklyStreak, dayKey, effectiveStreak, weekStartKey } from '../src/lib/gamification/streaks';
import { summarizeActivity, workoutVolumeKg, LogLike } from '../src/lib/gamification/stats';
import { buildTracks, CATALOG, evaluateCatalog, TRACKS } from '../src/lib/gamification/catalog';
import { bestsFromLog, findNewRecords } from '../src/lib/gamification/records';
import { goalFraction, goalPace, isGoalReached } from '../src/lib/gamification/goal-progress';
import { buildQuestViews, pickWeeklyQuests } from '../src/lib/gamification/quests';
import { currentFromRaw } from '../src/lib/gamification/goals';
import {
  calculateLevelFromXP,
  calculateRunPoints,
  calculateWorkoutPoints,
  streakMilestoneCrossed,
  weeklyMultiplier,
} from '../src/lib/gamification/point-calculator';
import { boostStat, decayedValue, formFromActivity, HUNGER_DECAY_PER_HOUR, petMood, petThought, timeUntilBelow } from '../src/lib/pet/state';
import { petBuild, petProgress, liftPetXp, runPetXp } from '../src/lib/pet/progression';
import { PET_ITEMS } from '../src/lib/pet/catalog';
import { rollChestLoot } from '../src/lib/pet/service';

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
check('progi w każdej ścieżce rosną', () => {
  for (const track of TRACKS) {
    for (let i = 1; i < track.tiers.length; i++) assert.ok(track.tiers[i].threshold > track.tiers[i - 1].threshold, track.id);
  }
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
  assert.equal(calculateRunPoints(5.9), 59); // 10 pkt/km
  assert.equal(calculateRunPoints(10), 120); // + bonus wytrzymałości
  assert.equal(calculateRunPoints(21.1), 261);
  assert.equal(calculateRunPoints(42), 300); // limit
  assert.deepEqual(calculateLevelFromXP(250), { level: 3, currentXP: 40, xpForNextLevel: 121 });
});

check('punkty za trening rosną z tonażem, z limitem', () => {
  assert.equal(calculateWorkoutPoints(0, 0), 20);
  assert.equal(calculateWorkoutPoints(60, 5000), 20 + 30 + 50);
  assert.equal(calculateWorkoutPoints(200, 100_000), 20 + 30 + 200);
});
check('seria tygodniowa: 3 aktywne dni w tygodniu, bieżący tydzień nie zrywa', () => {
  const lastWeek = ['2026-11-02', '2026-11-04', '2026-11-06'];
  const twoWeeksAgo = ['2026-10-26', '2026-10-27', '2026-10-31'];
  // wtorek 10.11, w tym tygodniu dopiero 1 dzień — liczą się dwa poprzednie tygodnie
  assert.equal(computeWeeklyStreak([...twoWeeksAgo, ...lastWeek, '2026-11-09'], '2026-11-10'), 2);
  assert.equal(computeWeeklyStreak([...lastWeek, '2026-11-09', '2026-11-10', '2026-11-11'], '2026-11-11'), 2);
  // dziura: poprzedni tydzień miał 2 dni
  assert.equal(computeWeeklyStreak([...twoWeeksAgo, '2026-11-02', '2026-11-04'], '2026-11-10'), 0);
  assert.equal(computeWeeklyStreak([], '2026-11-10'), 0);
});
check('mnożnik tygodniowy', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(weeklyMultiplier), [1, 1.1, 1.25, 1.25, 1.5, 1.5]);
});

console.log('Zwierzak');
const at = (iso: string) => new Date(iso);
check('sytość spada do zera w 48 h, a sycący posiłek wstrzymuje zanik', () => {
  const fed = { value: 100, updatedAt: at('2026-11-10T08:00:00Z') };
  assert.equal(decayedValue(fed, HUNGER_DECAY_PER_HOUR, at('2026-11-11T08:00:00Z')), 50);
  assert.equal(decayedValue(fed, HUNGER_DECAY_PER_HOUR, at('2026-11-20T08:00:00Z')), 0);
  const held = boostStat({ value: 20, updatedAt: at('2026-11-10T08:00:00Z') }, HUNGER_DECAY_PER_HOUR, 85, at('2026-11-10T08:00:00Z'), 24);
  assert.equal(held.value, 100);
  assert.equal(decayedValue(held, HUNGER_DECAY_PER_HOUR, at('2026-11-11T08:00:00Z')), 100);
  assert.equal(decayedValue(held, HUNGER_DECAY_PER_HOUR, at('2026-11-12T08:00:00Z')), 50);
});
check('moment zgłodnienia do powiadomień', () => {
  const fed = { value: 100, updatedAt: at('2026-11-10T08:00:00Z') };
  assert.equal(timeUntilBelow(fed, HUNGER_DECAY_PER_HOUR, 25, at('2026-11-10T08:00:00Z'))?.toISOString(), '2026-11-11T20:00:00.000Z');
  assert.equal(timeUntilBelow({ value: 10, updatedAt: at('2026-11-10T08:00:00Z') }, HUNGER_DECAY_PER_HOUR, 25, at('2026-11-10T08:00:00Z')), null);
});
check('forma: przerwa rozleniwia, ale nie karze; trening od razu przywraca', () => {
  assert.equal(formFromActivity('2026-11-10', '2026-11-10'), 100);
  assert.equal(formFromActivity('2026-11-09', '2026-11-10'), 100);
  assert.equal(formFromActivity('2026-11-07', '2026-11-10'), 70);
  assert.equal(formFromActivity('2026-09-01', '2026-11-10'), 20);
  assert.equal(formFromActivity(null, '2026-11-10'), 20);
});
check('nastrój i myśl zwierzaka', () => {
  assert.equal(petMood({ hunger: 80, joy: 80, form: 100 }), 'energetic');
  assert.equal(petMood({ hunger: 10, joy: 80, form: 100 }), 'hungry');
  assert.equal(petMood({ hunger: 80, joy: 10, form: 100 }), 'sad');
  assert.equal(petMood({ hunger: 80, joy: 80, form: 40 }), 'lazy');
  assert.equal(petMood({ hunger: 0, joy: 0, form: 20 }), 'sleepy');
  assert.equal(petThought({ hunger: 30, joy: 80, form: 100 }), 'food');
  assert.equal(petThought({ hunger: 80, joy: 80, form: 55 }), 'workout');
  assert.equal(petThought({ hunger: 80, joy: 80, form: 100 }), null);
});
check('rozwój: XP z km i ton, etapy, sylwetka', () => {
  assert.equal(runPetXp(5.2), 52);
  assert.equal(liftPetXp(12_000), 60);
  assert.deepEqual(
    [0, 499, 500, 2500, 8000].map(xp => petProgress(xp, 0).stage),
    ['baby', 'baby', 'junior', 'adult', 'master']
  );
  const p = petProgress(1000, 500);
  assert.deepEqual([p.level, p.nextStage, p.stageProgress, p.xpToNextStage], [8, 'adult', 0.5, 1000]);
  assert.equal(petProgress(9000, 0).stageProgress, 1);
  assert.equal(petBuild(100, 50), 'balanced'); // za mało danych
  assert.equal(petBuild(800, 200), 'runner');
  assert.equal(petBuild(200, 800), 'strong');
  assert.equal(petBuild(500, 500), 'balanced');
});
check('katalog sklepu: unikalne klucze, każda kategoria ma przedmioty', () => {
  assert.equal(new Set(PET_ITEMS.map(i => i.key)).size, PET_ITEMS.length);
  for (const category of ['food', 'toy', 'clothes', 'decor']) {
    assert.ok(PET_ITEMS.some(i => i.category === category));
  }
  assert.ok(PET_ITEMS.filter(i => i.category === 'clothes').every(i => i.slot));
});
check('skrzynia: przedmiot, którego nie masz, albo paczka monet', () => {
  const item = rollChestLoot([], () => 0);
  assert.equal(item.kind, 'item');
  const everything = PET_ITEMS.map(i => i.key);
  const coins = rollChestLoot(everything, () => 0.9);
  assert.deepEqual(coins, { kind: 'coins', amount: 250 });
});

console.log(`\nWszystkie sprawdzenia przeszły (${passed}).`);
