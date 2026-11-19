import { redirect } from 'next/navigation';

// Dawny, osobny formularz treningu został zastąpiony przez wspólny widok tworzenia.
export default function AdminNewWorkoutPage() {
    redirect('/admin/workouts/create');
}
