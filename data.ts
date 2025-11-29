export enum MuscleGroupName {
    Back = 'Back',
    Biceps = 'Biceps',
    Calves = 'Calves',
    Chest = 'Chest',
    Core = 'Core',
    Forearms = 'Forearms',
    FullBody = 'Full Body',
    Glutes = 'Glutes',
    Hamstrings = 'Hamstrings',
    LowerBack = 'Lower Back',
    Quads = 'Quads',
    RearDelts = 'Rear Delts',
    Shoulders = 'Shoulders',
    AnteriorTibialis = 'Anterior Tibialis',
    Traps = 'Traps',
    Triceps = 'Triceps',
    Adductors = 'Adductors',
    Hips = 'Hips',
    Abductors = 'Abductors'
}
export enum TrainingLevel {
    Beginner = 'beginner',
    Intermediate = 'intermediate',
    Advanced = 'advanced'
}
export enum SetType {
    BackOffSet = 'Back-off set',
    WorkingSet = 'Working set',
    WarmUpSet = 'Warm-up set',
    DropSet = 'Drop set',
    FailureSet = 'Failure set'
}
export interface MuscleGroup {
    name: MuscleGroupName;
    imageUrl?: string;
}
export interface Exercise {
    name: string;
    mainMuscleGroups: MuscleGroup[];
    secondaryMuscleGroups: MuscleGroup[];
    instructions?: string;
    mediaUrl?: string; // Image or Video URL
}
export interface WorkoutSet {
    number: number;
    type: SetType;
    reps: number;
    weight: number;
    restTimeSeconds: number;
}
export interface ExerciseSeries {
    exercise: Exercise;
    tempo: string; // e.g., "3-0-1-0"
    tip?: string;
    sets: WorkoutSet[];
}
export interface Workout {
    name: string;
    imageUrl?: string;
    level: TrainingLevel;
    durationMinutes: number;
    exerciseSeries: ExerciseSeries[];
}
export type DayPlan = Workout | 'Rest Day';
export interface TrainingWeek {
    // Array of 7 days, index 0 = Monday, etc.
    days: [DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan];
}
export interface TrainingStage {
    name: string;
    weeks: TrainingWeek[];
}
export interface TrainingPlan {
    name: string;
    level: TrainingLevel;
    description?: string;
    stages: TrainingStage[];
}
export interface User {
    id: string;
    name: string;
    email: string;
    currentPlan?: TrainingPlan;
    completedWorkouts: {
        date: Date;
        workout: Workout;
        // Potentially store actual performance data here if different from the plan
        actualDurationMinutes?: number;
    }[];
}