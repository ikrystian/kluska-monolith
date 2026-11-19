/**
 * Różnice między panelem admina (/admin) a panelem trenera (/trainer).
 *
 * Widoki tworzenia i edycji planów, treningów, planów dietetycznych i posiłków są wspólne.
 * Tutaj zapisane jest tylko to, czym panele się różnią: endpointy API i reguły dla nowych rekordów.
 */
export type PanelRole = 'admin' | 'trainer';

interface PanelConfig {
    /** Posiłki: lista (GET), zapis (POST), odczyt i edycja (`${mealsApi}/${id}`). */
    mealsApi: string;
    /** Plany dietetyczne: zapis (POST), odczyt i edycja (`${dietPlansApi}/${id}`). */
    dietPlansApi: string;
    /** Posiłek utworzony w panelu admina trafia do publicznego katalogu. */
    newMealsArePublic: boolean;
}

export const panelConfig: Record<PanelRole, PanelConfig> = {
    admin: {
        mealsApi: '/api/admin/meals',
        dietPlansApi: '/api/admin/diet-plans',
        newMealsArePublic: true,
    },
    trainer: {
        mealsApi: '/api/trainer/meals',
        dietPlansApi: '/api/trainer/diets',
        newMealsArePublic: false,
    },
};

export interface SavedMeal {
    _id: string;
    name: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    category?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
}

/** Wszystkie posiłki widoczne dla danej roli. Lista admina jest stronicowana (maks. 100 na stronę). */
export async function fetchSavedMeals(role: PanelRole): Promise<SavedMeal[]> {
    if (role === 'trainer') {
        const res = await fetch(`${panelConfig.trainer.mealsApi}?include=public`);
        if (!res.ok) throw new Error('Nie udało się pobrać posiłków.');
        const data = await res.json();
        return data.meals ?? [];
    }

    const meals: SavedMeal[] = [];
    for (let page = 1; ; page++) {
        const res = await fetch(`${panelConfig.admin.mealsApi}?page=${page}&limit=100`);
        if (!res.ok) throw new Error('Nie udało się pobrać posiłków.');
        const data = await res.json();
        meals.push(...(data.meals ?? []));
        if (!data.meals?.length || page >= data.pagination?.pages) return meals;
    }
}
