import { useCallback } from 'react';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import { jsonFetcher } from '@/lib/db-hooks';
import type { ChestLoot, PetSlot, PetSpecies, PetState } from '@/models/types/pet';

export const PET_KEY = '/api/pet';

async function send<T>(path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Coś poszło nie tak. Spróbuj ponownie.');
  return payload as T;
}

/**
 * Stan zwierzaka i wszystkie akcje. Serwer po każdej akcji odsyła cały
 * świeży stan, więc wstawiamy go do cache bez dodatkowego odczytu.
 */
export function usePet(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<PetState>(enabled ? PET_KEY : null, jsonFetcher);

  const run = useCallback(
    async <T extends PetState>(path: string, body: unknown): Promise<T> => {
      const next = await send<T>(path, body);
      await mutate(next, { revalidate: false });
      return next;
    },
    [mutate]
  );
  const action = useCallback(<T extends PetState = PetState>(body: unknown) => run<T>('/api/pet/actions', body), [run]);

  return {
    state: data,
    pet: data?.pets.find(pet => pet.id === data.activePetId) ?? null,
    error,
    isLoading,
    refresh: mutate,
    adopt: useCallback((species: PetSpecies, name: string) => run(PET_KEY, { species, name }), [run]),
    buy: useCallback((itemKey: string, qty = 1) => run('/api/pet/shop', { itemKey, qty }), [run]),
    feed: useCallback((itemKey: string) => action({ action: 'feed', itemKey }), [action]),
    play: useCallback((itemKey: string) => action<PetState & { joyGained: number }>({ action: 'play', itemKey }), [action]),
    stroke: useCallback(() => action<PetState & { joyGained: number }>({ action: 'pet' }), [action]),
    equip: useCallback((slot: PetSlot, itemKey: string | null) => action({ action: 'equip', slot, itemKey }), [action]),
    setRoom: useCallback(
      (room: { background?: string; furniture?: string[] }) => action({ action: 'room', ...room }),
      [action]
    ),
    openChest: useCallback((chestId: string) => action<PetState & { loot: ChestLoot }>({ action: 'openChest', chestId }), [action]),
    rename: useCallback((name: string) => action({ action: 'rename', name }), [action]),
    switchPet: useCallback((petId: string) => action({ action: 'switch', petId }), [action]),
  };
}
