import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateDoc } from '@/hooks/useMutation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Workout } from '@/types';
import { cn } from '@/lib/utils';

interface ScheduleWorkoutDialogProps {
    workout: Workout;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ScheduleWorkoutDialog({
    workout,
    open,
    onOpenChange,
}: ScheduleWorkoutDialogProps) {
    const { user } = useAuth();
    const { mutate: createDoc, isPending: isLoading } = useCreateDoc('plannedWorkouts');

    // Initialize with today's date
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [hour, setHour] = useState('04');
    const [minute, setMinute] = useState('00');

    // Generate days for the current month view
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonthDate),
        end: endOfMonth(currentMonthDate),
    });

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Scroll to selected date on open
    useEffect(() => {
        if (open && scrollContainerRef.current) {
            // Find the selected date element index
            const selectedIndex = daysInMonth.findIndex(d => isSameDay(d, selectedDate));
            if (selectedIndex !== -1) {
                const itemWidth = 78; // 70px width + 8px gap roughly
                const containerWidth = scrollContainerRef.current.clientWidth;
                const scrollPos = (selectedIndex * itemWidth) - (containerWidth / 2) + (itemWidth / 2);
                scrollContainerRef.current.scrollLeft = scrollPos;
            }
        }
    }, [open, currentMonthDate, daysInMonth, selectedDate]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleSchedule = async () => {
        if (!user || !selectedDate) return;

        try {
            const scheduledDate = new Date(selectedDate);
            scheduledDate.setHours(parseInt(hour), parseInt(minute));

            const plannedWorkout = {
                date: scheduledDate.toISOString(),
                workoutName: workout.name,
                exercises: workout.exerciseSeries.map((series) => ({
                    name: series.exercise.name,
                    sets: series.sets.length.toString(),
                    reps: series.sets.map((s) => s.reps).join(','),
                })),
                ownerId: user.id,
                workoutId: workout.id,
            };

            createDoc(plannedWorkout, {
                onSuccess: () => {
                    toast.success('Trening został zaplanowany');
                    onOpenChange(false);
                },
                onError: (error) => {
                    console.error('Error scheduling workout:', error);
                    toast.error('Nie udało się zaplanować treningu');
                },
            });
        } catch (error) {
            console.error('Error scheduling workout:', error);
            toast.error('Nie udało się zaplanować treningu');
        }
    };

    const handleMonthChange = (increment: number) => {
        const newDate = new Date(currentMonthDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentMonthDate(newDate);
    };

    // Helper to format day name (e.g., "PON")
    const formatDayName = (date: Date) => {
        const dayName = format(date, 'EEE', { locale: pl });
        return dayName.toUpperCase().replace('.', '');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#09090b] text-white border-zinc-800 p-0 overflow-hidden gap-0">
                <div className="p-6 pb-0">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-2xl font-bold text-white">Zaplanuj trening</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Wybierz czas, aby zaplanować trening
                        </DialogDescription>
                    </DialogHeader>

                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mt-6 mb-4">
                        <h3 className="text-xl font-semibold text-white capitalize">
                            {format(currentMonthDate, 'MMMM', { locale: pl })}
                        </h3>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMonthChange(-1)}
                                className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-zinc-800"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMonthChange(1)}
                                className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-zinc-800"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Horizontal Date Picker */}
                <div
                    ref={scrollContainerRef}
                    className={cn(
                        "flex overflow-x-auto pb-6 px-6 gap-2 scrollbar-hide snap-x cursor-grab active:cursor-grabbing",
                        isDragging && "snap-none" // Disable snap while dragging for smoothness
                    )}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                >
                    {daysInMonth.map((date) => {
                        const isSelected = isSameDay(date, selectedDate);
                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => setSelectedDate(date)}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-xl transition-all snap-start border-2",
                                    isSelected
                                        ? "bg-zinc-900 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                                        : "bg-zinc-900/50 border-transparent hover:bg-zinc-800"
                                )}
                            >
                                <span className={cn(
                                    "text-2xl font-bold mb-1",
                                    isSelected ? "text-white" : "text-zinc-300"
                                )}>
                                    {format(date, 'd')}
                                </span>
                                <span className={cn(
                                    "text-xs font-medium uppercase tracking-wider",
                                    isSelected ? "text-white" : "text-zinc-500"
                                )}>
                                    {formatDayName(date)}
                                </span>
                                {isSelected && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white mt-2" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Time Picker */}
                <div className="px-6 py-4 flex items-center justify-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            value={hour}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length > 2) val = val.slice(0, 2);
                                if (parseInt(val) > 23) val = '23';
                                setHour(val);
                            }}
                            onBlur={() => setHour(hour.padStart(2, '0'))}
                            className="w-24 h-16 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-3xl font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <span className="text-4xl font-bold text-zinc-600">:</span>
                    <div className="relative">
                        <input
                            type="text"
                            value={minute}
                            onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '');
                                if (val.length > 2) val = val.slice(0, 2);
                                if (parseInt(val) > 59) val = '59';
                                setMinute(val);
                            }}
                            onBlur={() => setMinute(minute.padStart(2, '0'))}
                            className="w-24 h-16 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-3xl font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="p-6 pt-2">
                    <Button
                        onClick={handleSchedule}
                        disabled={!selectedDate || isLoading}
                        className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    >
                        {isLoading ? 'Planowanie...' : 'Zaplanuj trening'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
