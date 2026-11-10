/**
 * Dosiewa publiczny katalog 50 popularnych dań (SavedMeal, właściciel "system")
 * do ISTNIEJĄCEJ bazy danych. Niczego nie usuwa - dania dopasowane po nazwie
 * są aktualizowane, brakujące dodawane. Można uruchamiać wielokrotnie.
 *
 * Użycie:
 *   npm run db:seed:meals -- --dry-run   (tylko podgląd)
 *   npm run db:seed:meals
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

import { SavedMeal } from '../src/models/SavedMeal';
import { SYSTEM_MEAL_OWNER } from '../src/lib/meal-catalog';
import { INGREDIENTS, POPULAR_MEALS } from './data/popular-meals';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DRY_RUN = process.argv.includes('--dry-run');
let MONGO_DB_URI = process.env.MONGO_DB_URI;
if (!MONGO_DB_URI || MONGO_DB_URI.includes('<db_password>')) {
    console.log('⚠️ Brak poprawnego MONGO_DB_URI w .env - używam lokalnej bazy.');
    MONGO_DB_URI = 'mongodb://localhost:27017/kluska-monolith';
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function buildMeal(meal: (typeof POPULAR_MEALS)[number]) {
    const ingredients = meal.ingredients.map(([name, grams]) => {
        const [kcal, protein, carbs, fat] = INGREDIENTS[name];
        const f = grams / 100;
        return {
            name,
            amount: grams,
            unit: 'g',
            source: 'manual' as const,
            calories: round1(kcal * f),
            protein: round1(protein * f),
            carbs: round1(carbs * f),
            fat: round1(fat * f),
        };
    });
    const sum = (key: 'calories' | 'protein' | 'carbs' | 'fat') => ingredients.reduce((acc, i) => acc + i[key], 0);
    return {
        name: meal.name,
        description: meal.description,
        trainerId: SYSTEM_MEAL_OWNER,
        isPublic: true,
        dishCategory: meal.dishCategory,
        category: meal.mealType,
        ingredients,
        totalCalories: Math.round(sum('calories')),
        totalProtein: round1(sum('protein')),
        totalCarbs: round1(sum('carbs')),
        totalFat: round1(sum('fat')),
    };
}

async function main() {
    const names = new Set(POPULAR_MEALS.map((m) => m.name));
    if (names.size !== POPULAR_MEALS.length) throw new Error('Zduplikowane nazwy dań w danych');

    const meals = POPULAR_MEALS.map(buildMeal);
    if (DRY_RUN) {
        for (const m of meals) {
            console.log(`${m.dishCategory.padEnd(10)} ${String(m.totalCalories).padStart(5)} kcal  B${m.totalProtein} W${m.totalCarbs} T${m.totalFat}  ${m.name}`);
        }
        console.log(`\n${meals.length} dań (dry run - nic nie zapisano).`);
        return;
    }

    await mongoose.connect(MONGO_DB_URI!);
    let created = 0;
    let updated = 0;
    for (const meal of meals) {
        const result = await SavedMeal.updateOne(
            { name: meal.name, trainerId: SYSTEM_MEAL_OWNER },
            { $set: meal },
            { upsert: true, runValidators: true }
        );
        if (result.upsertedCount) created++;
        else if (result.modifiedCount) updated++;
    }
    console.log(`✅ Katalog dań: ${created} dodanych, ${updated} zaktualizowanych, ${meals.length - created - updated} bez zmian.`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error('❌ Błąd seedowania dań:', error);
    await mongoose.disconnect();
    process.exit(1);
});
