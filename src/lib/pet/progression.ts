/**
 * Rozwój zwierzaka: doświadczenie z kilometrów i ton, etapy dorastania
 * i sylwetka zależna od dominującej aktywności. Czyste funkcje.
 */

export const RUN_XP_PER_KM = 10;
export const LIFT_XP_PER_TONNE = 5;
export const PET_XP_PER_LEVEL = 200;

export const PET_STAGES = ['baby', 'junior', 'adult', 'master'] as const;
export type PetStage = (typeof PET_STAGES)[number];

export const STAGE_META: Record<PetStage, { name: string; minXp: number }> = {
  baby: { name: 'Maluch', minXp: 0 },
  junior: { name: 'Junior', minXp: 500 },
  adult: { name: 'Dorosły', minXp: 2500 },
  master: { name: 'Mistrz', minXp: 8000 },
};

export type PetBuild = 'runner' | 'strong' | 'balanced';

export function runPetXp(distanceKm: number): number {
  return Math.round(Math.max(0, distanceKm) * RUN_XP_PER_KM);
}

export function liftPetXp(volumeKg: number): number {
  return Math.round((Math.max(0, volumeKg) / 1000) * LIFT_XP_PER_TONNE);
}

export function petStage(xp: number): PetStage {
  let stage: PetStage = 'baby';
  for (const candidate of PET_STAGES) {
    if (xp >= STAGE_META[candidate].minXp) stage = candidate;
  }
  return stage;
}

export interface PetProgress {
  xp: number;
  level: number;
  stage: PetStage;
  stageName: string;
  nextStage: PetStage | null;
  /** 0–1 w drodze do następnego etapu; 1 u Mistrza. */
  stageProgress: number;
  xpToNextStage: number;
  build: PetBuild;
}

/** Sylwetka: przewaga biegania → smukła, przewaga siłowni → muskularna. */
export function petBuild(runXp: number, liftXp: number): PetBuild {
  const total = runXp + liftXp;
  if (total < 200) return 'balanced';
  const runShare = runXp / total;
  if (runShare >= 0.65) return 'runner';
  if (runShare <= 0.35) return 'strong';
  return 'balanced';
}

export function petProgress(runXp: number, liftXp: number): PetProgress {
  const xp = runXp + liftXp;
  const stage = petStage(xp);
  const index = PET_STAGES.indexOf(stage);
  const nextStage = PET_STAGES[index + 1] ?? null;
  const from = STAGE_META[stage].minXp;
  const to = nextStage ? STAGE_META[nextStage].minXp : from;

  return {
    xp,
    level: Math.floor(xp / PET_XP_PER_LEVEL) + 1,
    stage,
    stageName: STAGE_META[stage].name,
    nextStage,
    stageProgress: nextStage ? Math.min(1, (xp - from) / (to - from)) : 1,
    xpToNextStage: nextStage ? to - xp : 0,
    build: petBuild(runXp, liftXp),
  };
}
