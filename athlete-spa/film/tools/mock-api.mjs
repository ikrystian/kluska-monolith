// Throwaway mock API for capturing real UI. No DB, no network.
import http from 'node:http';
const PORT = +process.env.PORT || 4061;
const U = 'u1';
const day = (d, h = 18, m = 0) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString(); };
const ex = (name, mg, sets) => ({
  exercise: { id: name, name, type: 'weight', mainMuscleGroups: [{ name: mg }], secondaryMuscleGroups: [] },
  tempo: '2-0-1-0',
  sets: sets.map(([reps, weight], i) => ({ number: i + 1, type: 'Working set', reps, weight, restTimeSeconds: 120, completed: true })),
});
const wl = (id, d, name, dur, exs) => ({ id, athleteId: U, status: 'completed', workoutName: name, duration: dur, startTime: day(d, 17), endTime: day(d, 18, dur % 60), exercises: exs });
const workouts = [
  wl('w1', 0, 'Push A', 62, [ex('Wyciskanie sztangi leżąc', 'Klatka piersiowa', [[8, 100], [8, 100], [6, 105]]), ex('Wyciskanie hantli skos', 'Klatka piersiowa', [[10, 36], [10, 36], [9, 36]]), ex('OHP', 'Barki', [[8, 60], [8, 60], [7, 60]])]),
  wl('w2', -2, 'Pull A', 58, [ex('Martwy ciąg', 'Plecy', [[5, 160], [5, 170], [3, 180]]), ex('Podciąganie', 'Plecy', [[10, 0], [9, 0], [8, 0]]), ex('Wiosłowanie sztangą', 'Plecy', [[8, 80], [8, 80], [8, 80]])]),
  wl('w3', -4, 'Nogi', 74, [ex('Przysiad ze sztangą', 'Czworogłowe', [[6, 140], [6, 140], [5, 145]]), ex('Rumuński martwy ciąg', 'Dwugłowe', [[8, 110], [8, 110], [8, 110]])]),
  wl('w4', -6, 'Push B', 55, [ex('Wyciskanie sztangi leżąc', 'Klatka piersiowa', [[8, 97.5], [8, 97.5], [7, 97.5]])]),
  wl('w5', -8, 'Pull B', 52, [ex('Podciąganie', 'Plecy', [[9, 0], [8, 0]])]),
];
const goals = [
  { id: 'g1', ownerId: U, title: 'Wyciskanie 120 kg', target: 120, current: 105, unit: 'kg', deadline: day(60) },
  { id: 'g2', ownerId: U, title: 'Waga 84 kg', target: 84, current: 86.4, unit: 'kg', deadline: day(45) },
  { id: 'g3', ownerId: U, title: '10 km poniżej 50 min', target: 50, current: 53, unit: 'min', deadline: day(90) },
];
const meas = [
  { id: 'm1', ownerId: U, date: day(0), weight: 86.4, bodyFat: 14.2 },
  { id: 'm2', ownerId: U, date: day(-7), weight: 87.1, bodyFat: 14.6 },
];
const runs = [
  { id: 'r1', ownerId: U, date: day(-1, 7), distance: 8.2, duration: 2550, pace: 311, name: 'Poranny bieg' },
  { id: 'r2', ownerId: U, date: day(-5, 7), distance: 5.1, duration: 1560, pace: 306, name: 'Interwały' },
];
const planned = [
  { id: 'p1', ownerId: U, date: day(1, 17), workoutName: 'Pull A', exercises: [{ name: 'Martwy ciąg' }, { name: 'Podciąganie' }, { name: 'Wiosłowanie' }, { name: 'Face pull' }] },
  { id: 'p2', ownerId: U, date: day(3, 17), workoutName: 'Nogi', exercises: [{ name: 'Przysiad' }, { name: 'RDL' }, { name: 'Wykroki' }] },
  { id: 'p3', ownerId: U, date: day(0, 19), workoutName: 'Push A', exercises: [{ name: 'Wyciskanie' }, { name: 'OHP' }, { name: 'Triceps' }] },
];
const habits = [
  { id: 'h1', ownerId: U, name: 'Woda 3 litry', icon: '💧', frequency: { type: 'daily' }, isActive: true, createdAt: day(-30), updatedAt: day(-30) },
  { id: 'h2', ownerId: U, name: 'Sen 8 godzin', icon: '😴', frequency: { type: 'daily' }, isActive: true, createdAt: day(-30), updatedAt: day(-30) },
  { id: 'h3', ownerId: U, name: 'Rozciąganie', icon: '🧘', frequency: { type: 'daily' }, isActive: true, createdAt: day(-30), updatedAt: day(-30) },
];
const today = new Date().toISOString().slice(0, 10);
const habitlogs = [{ id: 'hl1', habitId: 'h1', ownerId: U, date: today, completed: true }, { id: 'hl2', habitId: 'h2', ownerId: U, date: today, completed: true }];
const entries = [
  { id: 'e1', date: today, mealType: 'Breakfast', name: 'Owsianka z bananem', amount: 350, unit: 'g', calories: 520, protein: 24, carbs: 78, fat: 12 },
  { id: 'e2', date: today, mealType: 'Lunch', name: 'Kurczak, ryż, brokuły', amount: 520, unit: 'g', calories: 710, protein: 58, carbs: 82, fat: 14 },
  { id: 'e3', date: today, mealType: 'Snack', name: 'Skyr naturalny', amount: 200, unit: 'g', calories: 130, protein: 22, carbs: 8, fat: 0 },
];
const diary = { entries, totals: { calories: 1360, protein: 104, carbs: 168, fat: 26 }, goal: { dailyCalories: 2600, dailyProtein: 180, dailyCarbs: 300, dailyFat: 75 } };
const user = { id: U, name: 'Kuba Nowak', email: 'kuba@example.com', role: 'athlete', onboardingCompleted: true, weight: 86.4, height: 182, trainingLevel: 'Intermediate', location: 'Kraków' };
const gam = { totalPointsEarned: 4820, currentFitCoins: 740, level: 12, experiencePoints: 4820, xpForNextLevel: 5400, currentXP: 4820, streaks: { workout: 14, goals: 3, checkins: 6 }, achievementCount: 18, redeemedRewardsCount: 2, rank: 3 };
const lb = [['Ola K.', 6210, 14], ['Marcin W.', 5480, 13], ['Kuba N.', 4820, 12], ['Pati S.', 4310, 11], ['Tomek B.', 3900, 10]].map(([userName, totalPoints, level], i) => ({ rank: i + 1, userId: 'x' + i, userName, totalPoints, level }));
const col = { workoutLogs: workouts, goals, bodyMeasurements: meas, runningSessions: runs, plannedWorkouts: planned, habits, habitlogs, stravaActivities: [], workoutPlans: [], trainingSessions: [], articles: [], articleCategories: [], personalRecords: [] };
const send = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }); res.end(JSON.stringify(body)); };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const p = u.pathname;
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'GET') { req.resume(); return send(res, 200, { data: { id: 'new' }, id: 'new', ok: true }); }
  let m;
  if (p === '/api/athlete/nutrition/diary') return send(res, 200, diary);
  if (p === '/api/gamification/profile') return send(res, 200, gam);
  if (p === '/api/gamification/leaderboard') return send(res, 200, lb);
  if (p === '/api/gamification/rewards' || p === '/api/gamification/achievements') return send(res, 200, []);
  if (p === '/api/check-ins') return send(res, 200, { checkIns: [] });
  if ((m = p.match(/^\/api\/db\/users\/(.+)$/))) return send(res, 200, { data: user });
  if ((m = p.match(/^\/api\/db\/([^/]+)$/))) {
    let rows = col[m[1]] || [];
    try { const q = JSON.parse(u.searchParams.get('query') || '{}'); if (q.status) rows = rows.filter(r => r.status === q.status); } catch {}
    return send(res, 200, { data: rows });
  }
  if ((m = p.match(/^\/api\/db\/([^/]+)\/(.+)$/))) { const r = (col[m[1]] || []).find(x => x.id === m[2]); return r ? send(res, 200, { data: r }) : send(res, 404, {}); }
  send(res, 404, { error: 'mock' });
}).listen(PORT, '127.0.0.1', () => console.log('mock on', PORT));
