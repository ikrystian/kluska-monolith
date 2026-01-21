import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/hooks/useMutation';
import { Habit, HabitLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  PlusCircle,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';

const EMOJI_OPTIONS = ['💪', '📚', '🏃', '💻', '🧘', '🎯', '⏰', '💧', '🥗', '😴', '🎨', '🎵', '🚴', '🏋️', '🧠', '❤️'];
const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

interface HabitFormData {
  name: string;
  icon: string;
  color: string;
}

export default function HabitsPage() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteHabit, setDeleteHabit] = useState<Habit | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [formData, setFormData] = useState<HabitFormData>({ name: '', icon: '💪', color: '#10b981' });

  // Fetch habits
  const { data: habits, isLoading: habitsLoading, refetch: refetchHabits } = useCollection<Habit>(
    user?.id ? 'habits' : null,
    { query: { ownerId: user?.id, isActive: true } }
  );

  // Fetch habit logs
  const { data: habitLogs, isLoading: logsLoading, refetch: refetchLogs } = useCollection<HabitLog>(
    user?.id ? 'habitlogs' : null,
    { query: { ownerId: user?.id } }
  );

  const { mutate: createDoc, isPending: isCreating } = useCreateDoc<Habit>('habits');
  const { mutate: updateDoc, isPending: isUpdating } = useUpdateDoc<Habit>('habits');
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDoc('habits');

  const { mutate: createLog } = useCreateDoc<HabitLog>('habitlogs');
  const { mutate: deleteLog } = useDeleteDoc('habitlogs');

  const isLoading = habitsLoading || logsLoading;

  // Week dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Log lookup
  const logsByHabitAndDate = useMemo(() => {
    const map = new Map<string, string>();
    habitLogs?.forEach(log => {
      if (log.completed && log.date) {
        map.set(`${log.habitId}-${log.date}`, log.id);
      }
    });
    return map;
  }, [habitLogs]);

  const isHabitCompleted = (habitId: string, date: string): boolean => {
    return logsByHabitAndDate.has(`${habitId}-${date}`);
  };

  // Stats
  const stats = useMemo(() => {
    if (!habits || habits.length === 0) return { completionRate: 0, totalCompleted: 0 };

    const today = format(new Date(), 'yyyy-MM-dd');
    let totalPossible = 0;
    let totalCompleted = 0;

    weekDates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (dateStr <= today) {
        habits.forEach(habit => {
          totalPossible++;
          if (isHabitCompleted(habit.id, dateStr)) {
            totalCompleted++;
          }
        });
      }
    });

    return {
      completionRate: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
      totalCompleted,
    };
  }, [habits, weekDates, logsByHabitAndDate]);

  const handleOpenDialog = (habit?: Habit) => {
    if (habit) {
      setEditingHabit(habit);
      setFormData({ name: habit.name, icon: habit.icon || '💪', color: habit.color || '#10b981' });
    } else {
      setEditingHabit(null);
      setFormData({ name: '', icon: '💪', color: '#10b981' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const habitData = {
      name: formData.name,
      icon: formData.icon,
      color: formData.color,
      ownerId: user.id,
      isActive: true,
    };

    if (editingHabit) {
      updateDoc({ id: editingHabit.id, data: habitData }, {
        onSuccess: () => {
          toast.success('Nawyk zaktualizowany.');
          setIsDialogOpen(false);
          refetchHabits();
        },
        onError: () => toast.error('Nie udało się zaktualizować nawyku.'),
      });
    } else {
      createDoc(habitData, {
        onSuccess: () => {
          toast.success('Nawyk dodany.');
          setIsDialogOpen(false);
          refetchHabits();
        },
        onError: () => toast.error('Nie udało się dodać nawyku.'),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteHabit) return;
    deleteDoc(deleteHabit.id, {
      onSuccess: () => {
        toast.success('Nawyk usunięty.');
        setDeleteHabit(null);
        refetchHabits();
      },
      onError: () => toast.error('Nie udało się usunąć nawyku.'),
    });
  };

  const toggleHabitCompletion = (habitId: string, date: string) => {
    if (!user?.id) return;

    const key = `${habitId}-${date}`;
    const existingLogId = logsByHabitAndDate.get(key);

    if (existingLogId) {
      deleteLog(existingLogId, {
        onSuccess: () => {
          toast.success('Nawyk odznaczony.');
          refetchLogs();
        },
      });
    } else {
      createLog({ habitId, ownerId: user.id, date, completed: true }, {
        onSuccess: () => {
          toast.success('Nawyk zaznaczony!');
          refetchLogs();
        },
      });
    }
  };

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const isSaving = isCreating || isUpdating;

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
            <CheckSquare className="h-8 w-8" />
            Nawyki
          </h1>
          <p className="text-muted-foreground mt-1">Śledź swoje codzienne nawyki</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj Nawyk
        </Button>
      </div>

      {/* Stats */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Postęp tygodnia</span>
            <span className="flex items-center gap-1 text-sm font-semibold">
              <Flame className="h-4 w-4 text-orange-500" />
              {stats.completionRate}%
            </span>
          </div>
          <Progress value={stats.completionRate} />
        </CardContent>
      </Card>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {format(currentWeekStart, 'd MMM', { locale: pl })} - {format(addDays(currentWeekStart, 6), 'd MMM yyyy', { locale: pl })}
          </span>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>Dziś</Button>
        </div>
        <Button variant="outline" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Habits Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : habits?.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-headline text-xl font-semibold mb-2">Brak nawyków</h3>
            <p className="text-muted-foreground mb-4">Zacznij śledzić swoje codzienne nawyki</p>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Dodaj Pierwszy Nawyk
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Day headers */}
          <div className="grid grid-cols-[1fr,repeat(7,40px)] md:grid-cols-[1fr,repeat(7,50px)] gap-2 items-center">
            <div></div>
            {weekDates.map((date, idx) => (
              <div key={idx} className="text-center">
                <div className="text-xs text-muted-foreground">{format(date, 'EEE', { locale: pl })}</div>
                <div className={`text-sm font-medium ${isSameDay(date, new Date()) ? 'text-primary' : ''}`}>
                  {format(date, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Habits */}
          {habits?.map(habit => (
            <Card key={habit.id} className="p-3">
              <div className="grid grid-cols-[1fr,repeat(7,40px)] md:grid-cols-[1fr,repeat(7,50px)] gap-2 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">{habit.icon || '💪'}</span>
                  <span className="font-medium truncate">{habit.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(habit)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteHabit(habit)}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                        <span className="text-destructive">Usuń</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {weekDates.map((date, idx) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isCompleted = isHabitCompleted(habit.id, dateStr);
                  return (
                    <div key={idx} className="flex justify-center">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => toggleHabitCompletion(habit.id, dateStr)}
                        className="h-6 w-6"
                        style={{ borderColor: habit.color || '#10b981', backgroundColor: isCompleted ? (habit.color || '#10b981') : undefined }}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Habit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingHabit ? 'Edytuj Nawyk' : 'Dodaj Nowy Nawyk'}</DialogTitle>
              <DialogDescription>
                {editingHabit ? 'Zaktualizuj szczegóły nawyku.' : 'Zdefiniuj nawyk do śledzenia.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nazwa Nawyku</Label>
                <Input
                  id="name"
                  placeholder="np. Medytacja 10 minut"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Ikona</Label>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                      className={`w-10 h-10 text-xl flex items-center justify-center rounded-md border-2 transition-all ${formData.icon === emoji ? 'border-primary bg-primary/10 scale-110' : 'border-transparent hover:bg-secondary'
                        }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Kolor</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Anuluj</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingHabit ? 'Zapisz' : 'Dodaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteHabit} onOpenChange={() => setDeleteHabit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć nawyk?</AlertDialogTitle>
            <AlertDialogDescription>
              To spowoduje trwałe usunięcie nawyku "{deleteHabit?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
