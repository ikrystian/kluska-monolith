'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { Exercise } from '@/lib/types';
import { SETUP_GROUPS } from '@/components/shared/exercises/setup';

/**
 * Serwerowa biblioteka ćwiczeń: paginacja (50/str.) + filtrowanie w Mongo.
 *
 * - pierwsza strona pobierana od razu, kolejne dokładane przez `loadMore`
 *   (infinite scroll),
 * - wyszukiwanie i filtry trafiają do `/api/db/exercises` jako `query`,
 *   więc filtruje serwer, a przeglądarka trzyma tylko załadowane strony,
 * - osobne lekkie zapytania `count=1` zwracają liczbę wszystkich
 *   i przefiltrowanych ćwiczeń.
 */

export const EXERCISE_PAGE_SIZE = 50;

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const isSet = (value: string) => Boolean(value) && value !== 'all';

/** Buduje filtr Mongo na podstawie pól dokumentu ćwiczenia. */
export function buildExerciseFilter(filters: ExerciseLibraryFilters): Record<string, unknown> {
  const conds: Record<string, unknown>[] = [];

  const term = filters.search.trim();
  if (term) {
    // RegExp nie przechodzi przez JSON — wysyłamy $regex jako string.
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

/** Kolejność listy: alfabetycznie albo od ostatnio edytowanych. */
export type ExerciseSort = 'name' | 'updatedAt';

const SORT_QUERY: Record<ExerciseSort, Record<string, 1 | -1>> = {
  name: { name: 1, _id: 1 },
  updatedAt: { updatedAt: -1, _id: -1 },
};

async function pageFetcher(url: string): Promise<ExercisePage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  return res.json();
}

async function countFetcher(url: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  const payload = (await res.json()) as { total?: number };
  return payload.total ?? 0;
}

function collectionUrl(
  query: Record<string, unknown>,
  sort: ExerciseSort,
  params: Record<string, string> = {}
): string {
  const qs = new URLSearchParams({ query: JSON.stringify(query), sort: JSON.stringify(SORT_QUERY[sort]), ...params });
  return `/api/db/exercises?${qs.toString()}`;
}

export interface ExerciseLibraryResult {
  exercises: Exercise[];
  isLoading: boolean;
  isLoadingMore: boolean;
  /** Trwa pobieranie (np. po zmianie filtrów), a na ekranie są poprzednie wyniki. */
  isRefreshing: boolean;
  error: Error | null;
  hasMore: boolean;
  totalAll: number;
  totalFiltered: number;
  /** Klucz bieżącego filtra — zmienia się razem z wynikami. */
  queryKey: string;
  loadMore: () => void;
  refetch: () => Promise<void>;
}

/** `enabled=false` odracza wszystkie zapytania (np. przed zalogowaniem). */
export function useExerciseLibrary(
  filters: ExerciseLibraryFilters,
  enabled = true,
  sort: ExerciseSort = 'name'
): ExerciseLibraryResult {
  const queryKey = useMemo(() => JSON.stringify(buildExerciseFilter(filters)), [filters]);

  const getKey = (pageIndex: number, previousPageData: ExercisePage | null): string | null => {
    if (!enabled) return null;
    if (previousPageData && previousPageData.data.length < EXERCISE_PAGE_SIZE) return null;
    return collectionUrl(JSON.parse(queryKey), sort, {
      limit: String(EXERCISE_PAGE_SIZE),
      skip: String(pageIndex * EXERCISE_PAGE_SIZE),
    });
  };

  const { data, size, setSize, isLoading, isValidating, error, mutate } = useSWRInfinite<ExercisePage>(
    getKey,
    pageFetcher,
    { keepPreviousData: true, revalidateFirstPage: false }
  );

  const exercises = useMemo(() => (data ?? []).flatMap((page) => page.data ?? []), [data]);

  const lastPage = data?.[data.length - 1];
  const hasMore = Boolean(lastPage) && (lastPage!.data?.length ?? 0) >= EXERCISE_PAGE_SIZE;
  const isLoadingMore = size > 0 && data !== undefined && typeof data[size - 1] === 'undefined';

  const filteredKey = enabled ? collectionUrl(JSON.parse(queryKey), sort, { count: '1' }) : null;
  const { data: totalFiltered, mutate: mutateFiltered } = useSWR<number>(filteredKey, countFetcher, {
    keepPreviousData: true,
  });

  const allKey = enabled ? collectionUrl({}, sort, { count: '1' }) : null;
  const { data: totalAll, mutate: mutateAll } = useSWR<number>(allKey, countFetcher);

  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;
    void setSize((s) => s + 1);
  };

  const refetch = async () => {
    await Promise.all([mutate(), mutateFiltered(), mutateAll()]);
  };

  return {
    exercises,
    isLoading: isLoading && data === undefined,
    isLoadingMore,
    isRefreshing: isValidating && !isLoadingMore && data !== undefined,
    error: error ? (error instanceof Error ? error : new Error('Unknown error')) : null,
    hasMore,
    totalAll: totalAll ?? 0,
    totalFiltered: totalFiltered ?? 0,
    queryKey,
    loadMore,
    refetch,
  };
}
