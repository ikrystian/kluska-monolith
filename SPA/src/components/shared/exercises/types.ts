// Types for the shared ExercisesListView component
import { Exercise } from '@/types';

export type ExercisesRole = 'athlete' | 'trainer' | 'admin';

export interface ExercisesListViewProps {
    /** Role determines permissions and display options */
    role: ExercisesRole;

    /** Whether user can create new exercises (default: based on role) */
    canCreate?: boolean;

    /** Whether user can edit exercises (default: based on role) */
    canEdit?: boolean;

    /** Whether user can delete exercises (default: based on role) */
    canDelete?: boolean;

    /** Show progress charts - athlete feature (default: true for athlete) */
    showProgress?: boolean;

    /** Show owner badges - admin feature (default: true for admin) */
    showOwnerBadge?: boolean;

    /** Custom title */
    title?: string;

    /** Custom empty state message */
    emptyMessage?: string;
}

export interface ExerciseCardProps {
    exercise: Exercise;
    userId?: string;
    canEdit: boolean;
    canDelete: boolean;
    showProgress: boolean;
    showOwnerBadge: boolean;
    onEdit: (exercise: Exercise) => void;
    onDelete: (exercise: Exercise) => void;
    onShowProgress: (exercise: Exercise) => void;
}

export interface ExerciseFormProps {
    exercise: Exercise | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ExerciseFormData) => Promise<void>;
    isSubmitting: boolean;
    muscleGroupOptions: { label: string; value: string }[];
}

export interface ExerciseFormData {
    name: string;
    mainMuscleGroups: string[];
    secondaryMuscleGroups?: string[];
    instructions?: string;
    mediaUrl?: string;
    type?: 'weight' | 'duration' | 'reps';
    description?: string;
}

export interface ExerciseFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedMuscleGroup: string;
    onMuscleGroupChange: (value: string) => void;
    muscleGroupOptions: { label: string; value: string }[];
}

export interface ProgressDialogProps {
    exercise: Exercise | null;
    userId: string | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Default configurations by role
export const roleDefaults: Record<ExercisesRole, Partial<ExercisesListViewProps>> = {
    athlete: {
        canCreate: true,
        canEdit: true,  // Only own exercises
        canDelete: true, // Only own exercises
        showProgress: true,
        showOwnerBadge: false,
        title: 'Biblioteka Ćwiczeń',
        emptyMessage: 'Nie znaleziono żadnych ćwiczeń. Dodaj swoje pierwsze ćwiczenie, aby zacząć.',
    },
    trainer: {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        showProgress: false,
        showOwnerBadge: false,
        title: 'Biblioteka Ćwiczeń',
        emptyMessage: 'Nie znaleziono żadnych ćwiczeń. Dodaj swoje pierwsze ćwiczenie, aby zacząć.',
    },
    admin: {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        showProgress: false,
        showOwnerBadge: true,
        title: 'Wszystkie Ćwiczenia',
        emptyMessage: 'Brak ćwiczeń spełniających kryteria.',
    },
};
