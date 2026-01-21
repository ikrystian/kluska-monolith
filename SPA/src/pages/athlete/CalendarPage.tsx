import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { WorkoutLog, PlannedWorkout } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Calendar as CalendarIcon,
  CheckCircle,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'completed' | 'planned';
  data: WorkoutLog | PlannedWorkout;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch workout history
  const { data: workoutLogs, isLoading: logsLoading } = useCollection<WorkoutLog>(
    user?.id ? 'workoutLogs' : null,
    { query: { athleteId: user?.id } }
  );

  // Fetch planned workouts
  const { data: plannedWorkouts, isLoading: plannedLoading } = useCollection<PlannedWorkout>(
    user?.id ? 'plannedWorkouts' : null,
    { query: { userId: user?.id } }
  );

  const isLoading = logsLoading || plannedLoading;

  // Convert all events to calendar format
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Completed workouts
    workoutLogs?.forEach(log => {
      if (log.endTime) {
        events.push({
          id: `workout-${log.id}`,
          title: log.workoutName || 'Trening',
          date: new Date(log.endTime),
          type: 'completed',
          data: log,
        });
      }
    });

    // Planned workouts
    plannedWorkouts?.forEach(plan => {
      if (plan.date) {
        events.push({
          id: `planned-${plan.id}`,
          title: plan.workoutName || 'Zaplanowany trening',
          date: new Date(plan.date),
          type: 'planned',
          data: plan,
        });
      }
    });

    return events;
  }, [workoutLogs, plannedWorkouts]);

  // Get events for a specific day
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return calendarEvents.filter(event => isSameDay(event.date, day));
  };

  // Get events for selected day
  const selectedDayEvents = useMemo(() => {
    return getEventsForDay(selectedDate);
  }, [selectedDate, calendarEvents]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'completed') {
      navigate(`/athlete/history/${(event.data as WorkoutLog).id}`);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold flex items-center gap-2">
        <CalendarDays className="h-8 w-8" />
        Kalendarz treningowy
      </h1>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm mb-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Ukończone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>Zaplanowane</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-headline">
                {format(currentMonth, 'LLLL yyyy', { locale: pl })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Dziś
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`
                                                relative p-2 min-h-[60px] md:min-h-[80px] text-left rounded-lg transition-colors
                                                ${!isCurrentMonth ? 'text-muted-foreground/50' : ''}
                                                ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-secondary'}
                                                ${isTodayDate ? 'font-bold' : ''}
                                            `}
                    >
                      <span className={`text-sm ${isTodayDate ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className={`h-1.5 w-1.5 rounded-full ${event.type === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">
              {format(selectedDate, 'EEEE, d MMMM', { locale: pl })}
            </CardTitle>
            <CardDescription>
              {selectedDayEvents.length > 0 ? 'Treningi na ten dzień' : 'Brak treningów na ten dzień'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : selectedDayEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Brak treningów. Czas na odpoczynek lub zaplanowanie czegoś!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="p-3 rounded-lg border hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(event.date, 'HH:mm')}
                        </p>
                      </div>
                      <Badge variant={event.type === 'completed' ? 'default' : 'secondary'}>
                        {event.type === 'completed' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Ukończono</>
                        ) : (
                          <><Dumbbell className="h-3 w-3 mr-1" /> Zaplanowano</>
                        )}
                      </Badge>
                    </div>
                    {event.type === 'completed' && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {((event.data as WorkoutLog).exercises?.length || 0)} ćwiczeń
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
