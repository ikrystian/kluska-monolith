import { MuscleGroupName } from '@/lib/types';
import type { BodyView } from './body-paths';

/**
 * Tappable regions of the body figure and the muscle group each one stands for.
 * Regions left out (head, hair, neck, hands, knees, ankles, feet) are only
 * drawn as part of the silhouette.
 *
 * The groups follow the library import (`import-opengym-exercises.ts`), so a
 * tap lands on the same names the exercises are stored under. The deltoids
 * differ by side: the front shows the shoulder, the back the rear delt.
 */
export const REGION_MUSCLE: Record<BodyView, Record<string, MuscleGroupName>> = {
  front: {
    chest: MuscleGroupName.Chest,
    abs: MuscleGroupName.Core,
    obliques: MuscleGroupName.Core,
    biceps: MuscleGroupName.Biceps,
    triceps: MuscleGroupName.Triceps,
    deltoids: MuscleGroupName.Shoulders,
    trapezius: MuscleGroupName.Traps,
    forearm: MuscleGroupName.Forearms,
    quadriceps: MuscleGroupName.Quads,
    adductors: MuscleGroupName.Adductors,
    calves: MuscleGroupName.Calves,
    tibialis: MuscleGroupName.AnteriorTibialis,
  },
  back: {
    trapezius: MuscleGroupName.Traps,
    deltoids: MuscleGroupName.RearDelts,
    'upper-back': MuscleGroupName.Back,
    'lower-back': MuscleGroupName.LowerBack,
    triceps: MuscleGroupName.Triceps,
    forearm: MuscleGroupName.Forearms,
    gluteal: MuscleGroupName.Glutes,
    adductors: MuscleGroupName.Adductors,
    hamstring: MuscleGroupName.Hamstrings,
    calves: MuscleGroupName.Calves,
  },
};

const onFigure = new Set<MuscleGroupName>([
  ...Object.values(REGION_MUSCLE.front),
  ...Object.values(REGION_MUSCLE.back),
]);

/** Groups with no region on the figure (e.g. full body), so they need a button of their own. */
export const MUSCLES_WITHOUT_REGION = Object.values(MuscleGroupName).filter(name => !onFigure.has(name));
