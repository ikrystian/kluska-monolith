import { useMemo } from 'react';
import type { WorkoutLog } from '@/types';
import { useCollection } from '@/hooks';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, LineChart as ChartIcon } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ProgressDialogProps } from './types';

export function ProgressDialog({
    exercise,
    userId,
    open,
    onOpenChange,
}: ProgressDialogProps) {
    const { data: logs, isLoading } = useCollection<WorkoutLog>(
        userId ? 'workoutLogs' : null,
        {
            query: userId ? { athleteId: userId, status: 'completed' } : undefined,
            enabled: !!userId,
        }
    );

    const chartData = useMemo(() => {
        if (!logs || !exercise) return [];

        return logs
            .filter(log => log.exercises?.some(ex => ex.exercise?.id === exercise.id))
            .map(log => {
                const exLog = log.exercises?.find(ex => ex.exercise?.id === exercise.id);
                // Calculate max weight for weight-based, or max reps/duration
                let value = 0;
                if (exercise.type === 'weight' || !exercise.type) {
                    value = Math.max(...(exLog?.sets?.map(s => s.weight || 0) || [0]));
                } else if (exercise.type === 'reps') {
                    value = Math.max(...(exLog?.sets?.map(s => s.reps || 0) || [0]));
                } else if (exercise.type === 'duration') {
                    value = Math.max(...(exLog?.sets?.map(s => s.duration || 0) || [0]));
                }

                return {
                    rawDate: new Date(log.endTime as unknown as string),
                    date: format(new Date(log.endTime as unknown as string), 'd MMM', { locale: pl }),
                    value: value
                };
            })
            .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    }, [logs, exercise]);

    if (!exercise) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Postęp: {exercise.name}</DialogTitle>
                    <DialogDescription>
                        Twoje najlepsze wyniki w czasie.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : chartData.length < 2 ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center p-4 border-2 border-dashed rounded-lg">
                        <ChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Za mało danych, aby wyświetlić wykres.</p>
                        <p className="text-sm text-muted-foreground">Wykonaj to ćwiczenie w co najmniej dwóch treningach.</p>
                    </div>
                ) : (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [`${value ?? 0} ${exercise.type === 'duration' ? 's' : (exercise.type === 'reps' ? 'powt.' : 'kg')}`, 'Wynik']}
                                />
                                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
