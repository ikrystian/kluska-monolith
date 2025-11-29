import { WorkoutsListView } from '@/components/shared/WorkoutsListView';

export default function AdminWorkoutsPage() {
    return (
        <WorkoutsListView
            role="admin"
            createHref="/admin/workouts/create"
            detailsBasePath="/admin/workouts"
        />
    );
}
