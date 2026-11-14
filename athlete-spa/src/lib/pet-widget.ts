import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PetBuild, PetSlot, PetSpecies, PetStage } from '@/models/types/pet';

/**
 * The pet's home-screen widget on Android (PetWidgetProvider + PetWidgetPlugin
 * in the android project).
 *
 * The app hands over the pet's state and a set of drawings, one per face; the
 * widget then lets hunger and joy sink on its own and picks the face that
 * goes with the mood. Strokes made on the widget wait there until the app
 * runs — see takePetWidgetStrokes.
 */

// A type rather than an interface: the plugin call needs an implicit index signature.
export type PetWidgetState = {
  name: string;
  species: PetSpecies;
  stageLabel: string;
  level: number;
  hunger: number;
  joy: number;
  /** Epoch ms hunger reaches the "hungry" threshold; null once it is below. */
  hungryAt: number | null;
  /** `YYYY-MM-DD` of the last workout day — the widget derives the form from it. */
  lastActiveDay: string | null;
  /** Chests waiting to be opened. */
  chests: number;
};

/** Everything that changes how the pet is drawn. */
export interface PetWidgetLook {
  species: PetSpecies;
  stage: PetStage;
  build: PetBuild;
  equipped: Partial<Record<PetSlot, string>>;
  shiny: boolean;
}

/** Bump when the drawings themselves change, so widgets in the field get redrawn. */
const ART_VERSION = 1;

interface PetWidgetPlugin {
  publish(options: {
    state: (PetWidgetState & { sampledAt: number }) | null;
    artKey?: string;
    /** Base64 PNG per face: the six moods and `pet` (being stroked). */
    art?: Record<string, string>;
  }): Promise<void>;
  getArtKey(): Promise<{ artKey: string | null }>;
  takeStrokes(): Promise<{ count: number }>;
}

const PetWidget = registerPlugin<PetWidgetPlugin>('PetWidget');

export function isPetWidgetSupported(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('PetWidget');
}

/** Calls run one after another, so the widget ends up in the state of the last one made. */
let queue: Promise<void> = Promise.resolve();

function enqueue(label: string, task: () => Promise<unknown>): Promise<void> {
  if (!isPetWidgetSupported()) return Promise.resolve();
  queue = queue.then(task).then(
    () => undefined,
    error => console.error(`Pet widget ${label} failed:`, error)
  );
  return queue;
}

/** Shows this pet on the widget, redrawing its pictures if it looks different from the ones the widget has. */
export function publishPetWidget(state: PetWidgetState, look: PetWidgetLook): Promise<void> {
  return enqueue('publish', async () => {
    const sampled = { ...state, sampledAt: Date.now() };
    const artKey = `${ART_VERSION}:${JSON.stringify([look.species, look.stage, look.build, look.shiny, Object.entries(look.equipped).sort()])}`;
    const { artKey: current } = await PetWidget.getArtKey();
    if (current === artKey) {
      await PetWidget.publish({ state: sampled });
      return;
    }

    let art: Record<string, string> | undefined;
    try {
      // Pulls in react-dom/server; only needed on the rare redraw.
      const { renderPetWidgetArt } = await import('@/components/pet/pet-widget-art');
      art = await renderPetWidgetArt(look);
    } catch (error) {
      // The widget falls back to an emoji; the state is still worth showing.
      console.error('Pet widget drawing failed:', error);
    }
    await PetWidget.publish(art ? { state: sampled, artKey, art } : { state: sampled });
  });
}

/** Takes the pet off the widget: there is none (yet), or the athlete signed out. */
export function clearPetWidget(): Promise<void> {
  return enqueue('clear', () => PetWidget.publish({ state: null }));
}

/** How many times the pet was stroked on the widget since the last call; each is reported once. */
export async function takePetWidgetStrokes(): Promise<number> {
  if (!isPetWidgetSupported()) return 0;
  try {
    return (await PetWidget.takeStrokes()).count;
  } catch (error) {
    console.error('Reading pet widget strokes failed:', error);
    return 0;
  }
}
