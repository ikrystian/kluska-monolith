import { useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import { Exercise } from '@/lib/types';
import { SETUP_GROUPS } from '@/components/shared/exercises/setup';

/**
 * Serwerowa biblioteka ćwiczeń z paginacją (30/str.) + filtrowaniem na serwerze.
 *
 * - pierwsze 30 pozycji pobierane od razu,
 * - kolejne strony dokładane przy scrollowaniu (infinite scroll),
 * - wyszukiwanie i filtry (partia, typ, część ciała, sprzęt, kategoria) idą
 *   w parametrze `query` Mongo do `/api/db/exercises`, więc filtruje serwer,
 *   nie klient,
 * - zwraca też liczby: wszystkich ćwiczeń (`totalAll`) i przefiltrowanych
 *   (`totalFiltered`).
 */

export const EXERCISE_PAGE_SIZE = 30;

/** Wartość "all" oznacza brak filtra dla danego pola. */
export interface ExerciseLibraryFilters {
  search: string;
  muscleGroup: string;
  type: string;
  bodyPart: string;
  equipment: string;
  category: string;
}

export const EMPTY_EXERCISE_FILTERS: ExerciseLibraryFilters = {
  search: '',
  muscleGroup: 'all',
  type: 'all',
  bodyPart: 'all',
  equipment: 'all',
  category: 'all',
};

/** Liczba aktywnych filtrów poza wyszukiwaniem i partią mięśniową (chipy). */
export function countExtraFilters(filters: ExerciseLibraryFilters): number {
  return (['type', 'bodyPart', 'equipment', 'category'] as const)
    .filter((key) => filters[key] !== EMPTY_EXERCISE_FILTERS[key]).length;
}

const isSet = (value: string) => Boolean(value) && value !== 'all';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Buduje filtr Mongo na podstawie pól dokumentu ćwiczenia. */
export function buildExerciseFilter(filters: ExerciseLibraryFilters): Record<string, unknown> {
  const conds: Record<string, unknown>[] = [];

  const term = filters.search.trim();
  if (term) {
    // RegExp nie przechodzi przez JSON (serializuje się do `{}`) — wysyłamy $regex jako string.
    const rx = { $regex: escapeRegExp(term), $options: 'i' };
    conds.push({
      $or: [
        { name: rx },
        { original_name: rx },
        { muscleGroup: rx },
        { 'mainMuscleGroups.name': rx },
        { 'secondaryMuscleGroups.name': rx },
        { setup: { $elemMatch: { group: { $ne: SETUP_GROUPS.animation }, value: rx } } },
      ],
    });
  }

  if (isSet(filters.muscleGroup)) {
    conds.push({
      $or: [{ 'mainMuscleGroups.name': filters.muscleGroup }, { muscleGroup: filters.muscleGroup }],
    });
  }

  if (isSet(filters.type)) {
    conds.push({ type: filters.type });
  }

  const setupFilters: [string, string][] = [
    [SETUP_GROUPS.bodyPart, filters.bodyPart],
    [SETUP_GROUPS.equipment, filters.equipment],
    [SETUP_GROUPS.category, filters.category],
  ];
  for (const [group, value] of setupFilters) {
    if (isSet(value)) conds.push({ setup: { $elemMatch: { group, value } } });
  }

  return conds.length ? { $and: conds } : {};
}

interface ExercisePage {
  data: Exercise[];
}

const SORT = JSON.stringify({ name: 1, _id: 1 });

function pageFetcher(url: string): Promise<ExercisePage> {
  return apiFetch(url).then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
    return res.json();
  });
}

async function countFetcher(url: string): Promise<number> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  const payload = (await res.json()) as { total?: number };
  return payload.total ?? 0;
}

function collectionUrl(query: Record<string, unknown>, params: Record<string, string> = {}): string {
  const qs = new URLSearchParams({
    query: JSON.stringify(query),
    sort: SORT,
    ...params,
  });
  return `/api/db/exercises?${qs.toString()}`;
}

export interface ExerciseLibraryResult {
  exercises: Exercise[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  totalAll: number;
  totalFiltered: number;
  /** Klucz bieżącego filtra — zmienia się razem z wynikami. */
  queryKey: string;
  loadMore: () => void;
  refetch: () => void;
}

/**
 * `enabled=false` odracza wszystkie zapytania (np. przed zalogowaniem).
 */
export function useExerciseLibrary(
  filters: ExerciseLibraryFilters,
  enabled = true
): ExerciseLibraryResult {
  const query = useMemo(
    () => (enabled ? buildExerciseFilter(filters) : null),
    [filters, enabled]
  );
  const queryJson = useMemo(() => (query ? JSON.stringify(query) : ''), [query]);

  // Stronicowanie: klucz zmienia się z każdą przewiniętą stroną.
  const getKey = (pageIndex: number, previousPageData: ExercisePage | null): string | null => {
    if (!query) return null;
    if (pageIndex > 0 && (!previousPageData?.data || previousPageData.data.length === 0)) return null;
    return collectionUrl(query, {
      limit: String(EXERCISE_PAGE_SIZE),
      skip: String(pageIndex * EXERCISE_PAGE_SIZE),
    });
  };

  const { data, size, setSize, isLoading, isValidating, error, mutate } = useSWRInfinite<ExercisePage>(
    getKey,
    pageFetcher
  );

  const exercises = useMemo(
    () => (data ? ([] as Exercise[]).concat(...data.map((p) => p.data ?? [])) : []),
    [data]
  );

  const hasMore = useMemo(() => {
    if (!query || !data) return false;
    const last = data[data.length - 1];
    return !last || (last.data?.length ?? 0) >= EXERCISE_PAGE_SIZE;
  }, [data, query]);

  const isLoadingMore = Boolean(isValidating) && data !== undefined && data.length > 0;

  // Liczba przefiltrowanych ćwiczeń (osobne lekkie zapytanie count=1).
  const filteredKey = query ? collectionUrl(query, { count: '1' }) : null;
  const { data: totalFilteredData } = useSWR<number>(filteredKey, countFetcher);

  // Liczba wszystkich ćwiczeń – zawsze z pustym filtrem.
  const allKey = enabled ? collectionUrl({}, { count: '1' }) : null;
  const { data: totalAllData } = useSWR<number>(allKey, countFetcher);

  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;
    setSize((s) => s + 1);
  };

  return {
    exercises,
    isLoading: isLoading && data === undefined,
    isLoadingMore,
    error: error ? (error instanceof Error ? error : new Error('Unknown error')) : null,
    hasMore,
    totalAll: totalAllData ?? 0,
    totalFiltered: totalFilteredData ?? 0,
    queryKey: queryJson,
    loadMore,
    refetch: () => {
      void mutate();
    },
  };
}