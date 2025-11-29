import { WorkoutsListView } from '@/components/shared/WorkoutsListView';

export default function TrainerWorkoutsPage() {
    return (
        <WorkoutsListView
            role="trainer"
            createHref="/trainer/workouts/create"
            detailsBasePath="/trainer/workouts"
        />
    );
}
