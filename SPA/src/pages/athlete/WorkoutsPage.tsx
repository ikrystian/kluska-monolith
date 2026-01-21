import { useNavigate } from 'react-router-dom';
import { WorkoutsListView } from '@/components/shared/WorkoutsListView';
import { useActiveWorkout } from '@/contexts/ActiveWorkoutContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dumbbell, ArrowRight } from 'lucide-react';

export default function WorkoutsPage() {
    const { hasActiveWorkout, activeWorkout } = useActiveWorkout();
    const navigate = useNavigate();

    return (
        <div>
            {hasActiveWorkout && (
                <div className="container mx-auto px-4 pt-4 md:px-8 md:pt-8">
                    <Alert className="border-primary/50 bg-primary/5">
                        <Dumbbell className="h-4 w-4" />
                        <AlertTitle>Masz aktywny trening</AlertTitle>
                        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span>
                                Trening &quot;{activeWorkout?.workoutName}&quot; jest w trakcie.
                                Zakończ go przed rozpoczęciem nowego.
                            </span>
                            <Button
                                size="sm"
                                onClick={() => navigate(`/athlete/log?logId=${activeWorkout?.id}`)}
                            >
                                Wróć do treningu
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            )}
            <WorkoutsListView
                role="athlete"
                createHref="/athlete/workouts/create"
                detailsBasePath="/athlete/workouts"
            />
        </div>
    );
}
