import { useEffect, useMemo } from 'react';
import { useUser } from '@/lib/db-hooks';
import { usePet } from '@/hooks/usePet';
import {
  clearPetWidget,
  isPetWidgetSupported,
  publishPetWidget,
  takePetWidgetStrokes,
  type PetWidgetLook,
  type PetWidgetState,
} from '@/lib/pet-widget';
import type { PetState } from '@/models/types/pet';
import { STAGE_LABEL } from './pet-meta';

function toWidget(state: PetState): { state: PetWidgetState; look: PetWidgetLook } | null {
  const pet = state.pets.find(entry => entry.id === state.activePetId);
  if (!pet) return null;
  const hungryAt = pet.hungryAt ? Date.parse(pet.hungryAt) : NaN;
  return {
    state: {
      name: pet.name,
      species: pet.species,
      stageLabel: STAGE_LABEL[pet.progress.stage],
      level: pet.progress.level,
      hunger: pet.hunger,
      joy: pet.joy,
      hungryAt: Number.isNaN(hungryAt) ? null : hungryAt,
      lastActiveDay: state.lastActiveDay,
      chests: state.chests.length,
    },
    look: {
      species: pet.species,
      stage: pet.progress.stage,
      build: pet.progress.build,
      equipped: pet.equipped,
      shiny: pet.shiny,
    },
  };
}

/**
 * Keeps the pet's home-screen widget (Android) in step with the pet, and
 * carries out the strokes made on it. Renders nothing; in the browser it
 * doesn't even fetch the pet.
 */
export function PetWidgetBridge() {
  const { user } = useUser();
  const supported = isPetWidgetSupported();
  const { state, stroke } = usePet(supported && Boolean(user));

  // Compared as JSON: every pet action returns a fresh but often identical state.
  const widgetJson = useMemo(() => (state ? JSON.stringify(toWidget(state)) : undefined), [state]);

  useEffect(() => {
    if (widgetJson === undefined) return;
    const widget = JSON.parse(widgetJson) as ReturnType<typeof toWidget>;
    if (widget) void publishPetWidget(widget.state, widget.look);
    else void clearPetWidget();
  }, [widgetJson]);

  // The widget can't reach the server: its strokes wait until the app is up
  // (now) or comes back to the front. The server's cooldown makes any number
  // of them count once, and its answer lands back on the widget above.
  const hasPet = Boolean(state?.activePetId);
  useEffect(() => {
    if (!supported || !hasPet) return;
    const apply = async () => {
      if (document.visibilityState !== 'visible') return;
      if ((await takePetWidgetStrokes()) > 0) await stroke().catch(() => undefined);
    };
    void apply();
    document.addEventListener('visibilitychange', apply);
    return () => document.removeEventListener('visibilitychange', apply);
  }, [supported, hasPet, stroke]);

  return null;
}
