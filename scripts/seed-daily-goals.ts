/**
 * Dosiewa treści dla kafelków "Cele dnia" na dashboardzie wybranego użytkownika.
 * Niczego nie usuwa. Dodaje nawyki tylko wtedy, gdy użytkownik nie ma żadnego
 * aktywnego, oraz logi dzisiejszego dnia dla pierwszych nawyków (sprawdzane
 * po habitId + date, więc skrypt można uruchamiać wielokrotnie).
 *
 * Użycie:
 *   npx tsx scripts/seed-daily-goals.ts --email=ktos@example.com --dry-run   (tylko podgląd, bez połączenia z bazą)
 *   npx tsx scripts/seed-daily-goals.ts --email=ktos@example.com
 *
 * Uwaga: skrypt łączy się z MONGO_DB_URI z .env. Nie uruchamiaj go na
 * współdzielonej bazie (Atlas), jeśli nie chcesz tam nowych danych.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

import { User } from '../src/models/User';
import { Habit } from '../src/models/Habit';
import { HabitLog } from '../src/models/HabitLog';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const emailArg = process.argv.find(arg => arg.startsWith('--email='));
const EMAIL = emailArg?.slice('--email='.length).trim().toLowerCase();

const DEMO_HABITS = [
  { name: 'Picie wody', description: 'Minimum 2,5 litra wody dziennie.', icon: '💧', color: '#3b82f6' },
  { name: 'Kroki', description: 'Minimum 10 000 kroków dziennie.', icon: '🚶', color: '#10b981' },
  { name: 'Sen', description: '8 godzin snu bez przerwy.', icon: '😴', color: '#8b5cf6' },
  { name: 'Rozciąganie', description: '10 minut rozciągania po treningu.', icon: '🧘', color: '#f59e0b' },
];

/** Dzisiejsza data jako YYYY-MM-DD w strefie lokalnej, tak jak zapisuje ją aplikacja. */
function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function main() {
  if (!EMAIL) {
    console.error('Podaj użytkownika: --email=adres@example.com');
    process.exit(1);
  }

  const date = todayKey();

  if (DRY_RUN) {
    console.log(`[dry-run] Użytkownik: ${EMAIL}`);
    console.log(`[dry-run] Nawyki do dodania, jeśli brak aktywnych: ${DEMO_HABITS.map(h => h.name).join(', ')}`);
    console.log(`[dry-run] Logi na dzień ${date}: pierwsze 2 nawyki jako zrobione.`);
    return;
  }

  const MONGO_DB_URI = process.env.MONGO_DB_URI;
  if (!MONGO_DB_URI || MONGO_DB_URI.includes('<db_password>')) {
    console.error('Brak poprawnego MONGO_DB_URI w .env.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_DB_URI);
  try {
    const user = await User.findOne({ email: EMAIL }).lean();
    if (!user) {
      console.error(`Nie znaleziono użytkownika ${EMAIL}.`);
      process.exit(1);
    }
    const ownerId = String(user._id);

    let habits = await Habit.find({ ownerId, isActive: true }).lean();
    if (habits.length === 0) {
      const created = await Habit.insertMany(
        DEMO_HABITS.map(h => ({ ...h, ownerId, frequency: { type: 'daily' }, isActive: true }))
      );
      habits = created.map(h => h.toObject());
      console.log(`Dodano ${created.length} nawyków.`);
    } else {
      console.log(`Użytkownik ma już ${habits.length} aktywnych nawyków, pomijam dodawanie.`);
    }

    let logged = 0;
    for (const habit of habits.slice(0, 2)) {
      const habitId = String(habit._id);
      const exists = await HabitLog.exists({ habitId, date });
      if (exists) continue;
      await HabitLog.create({ habitId, ownerId, date, completed: true });
      logged++;
    }
    console.log(`Dodano ${logged} logów na dzień ${date}.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('Błąd seedowania:', err);
  process.exit(1);
});
