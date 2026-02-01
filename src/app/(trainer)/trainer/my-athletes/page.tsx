'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Search, User as UserIcon, AlertTriangle, Trash2, Loader2, Calendar, Activity, Dumbbell, Ruler, Weight, Users, TrendingUp, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useDoc } from '@/lib/db-hooks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Utensils } from 'lucide-react';

type Gender = 'male' | 'female' | 'other';
type TrainingLevelType = 'beginner' | 'intermediate' | 'advanced';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'trainer' | 'admin';
  trainerId?: string;
  assignedDietPlanId?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  height?: number;
  weight?: number;
  trainingLevel?: TrainingLevelType;
  onboardingCompleted?: boolean;
  createdAt?: Date;
  avatarUrl?: string;
}

interface AthleteStats {
  totalWorkouts: number;
  lastWorkoutDate: string | null;
  lastCheckInDate: string | null;
}


const searchSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail.'),
});

type SearchFormValues = z.infer<typeof searchSchema>;

type FoundUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

interface DietPlan {
  _id: string;
  name: string;
}

import { useChat } from '@/components/chat/hooks/useChat';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MyAthletesPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { conversations, createConversation } = useChat();

  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [diets, setDiets] = useState<DietPlan[]>([]);
  const [selectedDietId, setSelectedDietId] = useState<string>('');
  const [assigningDietId, setAssigningDietId] = useState<string | null>(null);
  const [isDietDialogOpen, setIsDietDialogOpen] = useState(false);
  const [currentAthleteId, setCurrentAthleteId] = useState<string | null>(null);
  const [athleteStats, setAthleteStats] = useState<Record<string, AthleteStats>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  const avatarImage = placeholderImages.find((img) => img.id === 'avatar-male');

  // Get current user profile
  const { data: userProfile, isLoading: userProfileLoading } = useDoc<UserProfile>('users', user?.uid || null);

  // Determine if we should fetch athletes
  // Only fetch when userProfile is loaded and user is a trainer
  const shouldFetchAthletes = !userProfileLoading && user?.uid && userProfile?.role === 'trainer';

  // Get all users with role 'athlete' and trainerId matching current user
  // Pass null as collection to skip fetching when conditions aren't met
  const { data: athletes, isLoading: athletesLoading, refetch: refetchAthletes } = useCollection<UserProfile>(
    shouldFetchAthletes ? 'users' : null,
    { role: 'athlete', trainerId: user?.uid }
  );

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    fetchDiets();
  }, []);

  useEffect(() => {
    if (athletes && athletes.length > 0) {
      fetchAthleteStats();
    }
  }, [athletes]);

  const fetchDiets = async () => {
    try {
      const res = await fetch('/api/trainer/diets');
      const data = await res.json();
      if (data.diets) {
        setDiets(data.diets);
      }
    } catch (error) {
      console.error('Error fetching diets:', error);
    }
  };

  const fetchAthleteStats = async () => {
    if (!athletes || athletes.length === 0) return;

    setStatsLoading(true);
    try {
      const athleteIds = athletes.map(a => a.id).join(',');
      const res = await fetch(`/api/trainer/athletes-stats?athleteIds=${athleteIds}`);
      const data = await res.json();
      if (data.stats) {
        setAthleteStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching athlete stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const openDietDialog = (athleteId: string) => {
    const athlete = athletes?.find(a => a.id === athleteId);
    setSelectedDietId(athlete?.assignedDietPlanId || 'unassign');
    setCurrentAthleteId(athleteId);
    setIsDietDialogOpen(true);
  };

  const handleAssignDiet = async () => {
    if (!currentAthleteId) return;
    setAssigningDietId(currentAthleteId);
    try {
      const res = await fetch('/api/trainer/assign-diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId: currentAthleteId,
          dietPlanId: selectedDietId === 'unassign' ? null : (selectedDietId || null), // Allow unassigning
        }),
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Diet assigned successfully' });
        setIsDietDialogOpen(false);
        refetchAthletes();
      } else {
        toast({ title: 'Error', description: 'Failed to assign diet', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Assign diet error:', error);
      toast({ title: 'Error', description: 'Failed to assign diet', variant: 'destructive' });
    } finally {
      setAssigningDietId(null);
    }
  };

  const handleChat = async (athlete: UserProfile) => {
    if (!user) return;

    const conversationId = [user.uid, athlete.id].sort().join('_');
    const existingConversation = conversations?.find(c => c.conversationId === conversationId);

    if (!existingConversation) {
      // Create if not exists
      try {
        await createConversation({
          conversationId: conversationId,
          participants: [user.uid, athlete.id],
          trainerId: user.uid,
          athleteId: athlete.id,
          trainerName: userProfile?.name || 'Trener',
          athleteName: athlete.name,
          lastMessage: null,
          updatedAt: new Date(),
          unreadCount: {
            [user.uid]: 0,
            [athlete.id]: 0,
          }
        });
      } catch (e) {
        console.error("Failed to create conversation", e);
        toast({
          title: "Błąd",
          description: "Nie udało się otworzyć czatu.",
          variant: "destructive"
        });
        return;
      }
    }

    router.push(`/trainer/chat?conversationId=${conversationId}`);
  };

  const getUnreadCount = (athleteId: string) => {
    if (!user || !conversations) return 0;
    const conversationId = [user.uid, athleteId].sort().join('_');
    const conversation = conversations.find(c => c.conversationId === conversationId);
    return conversation?.unreadCount?.[user.uid] || 0;
  };



  const handleSearch = async ({ email }: SearchFormValues) => {
    // Trenerzy mogą wyszukiwać sportowców
    if (userProfile?.role !== 'trainer') {
      setSearchError('Tylko trenerzy mogą wyszukiwać sportowców.');
      return;
    }

    setSearchLoading(true);
    setFoundUser(null);
    setSearchError(null);

    try {
      // Search for user by email and role
      const query = JSON.stringify({ email, role: 'athlete' });
      const response = await fetch(`/api/db/users?query=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error('Błąd wyszukiwania');
      }

      const result = await response.json();

      if (!result.data || result.data.length === 0) {
        setSearchError('Nie znaleziono sportowca z tym adresem e-mail.');
      } else {
        setFoundUser(result.data[0]);
      }
    } catch (error) {
      console.error('Błąd wyszukiwania użytkownika:', error);
      setSearchError('Wystąpił błąd podczas wyszukiwania. Spróbuj ponownie.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddAthlete = async () => {
    if (!foundUser || !user) return;

    if (athletes?.some(athlete => athlete.id === foundUser.id)) {
      toast({
        title: 'Sportowiec jest już przypisany',
        description: `${foundUser.name} jest już na Twojej liście.`,
        variant: 'destructive',
      });
      return;
    }

    setAddLoading(true);
    try {
      // Update user's trainerId field to assign them to this trainer
      const response = await fetch(`/api/db/users/${foundUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId: user.uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to add athlete');
      }

      toast({
        title: 'Sportowiec Dodany!',
        description: `${foundUser.name} został dodany do Twojej listy.`,
      });

      setFoundUser(null);
      form.reset();
      refetchAthletes(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać sportowca.',
        variant: 'destructive',
      });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveAthlete = async (athleteId: string) => {
    if (!user) return;

    try {
      // Remove trainerId from user to unassign them from this trainer
      const response = await fetch(`/api/db/users/${athleteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove athlete');
      }

      toast({
        title: 'Sportowiec Usunięty!',
        description: `Sportowiec został usunięty z Twojej listy.`,
        variant: 'destructive'
      });
      refetchAthletes(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć sportowca.',
        variant: 'destructive',
      });
    }
  };

  // Utility functions
  const calculateAge = (dateOfBirth?: Date): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (date: string | null): string => {
    if (!date) return 'Brak';
    const d = new Date(date);
    return d.toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getTrainingLevelLabel = (level?: TrainingLevelType): string => {
    if (!level) return 'Nieokreślony';
    const labels: Record<TrainingLevelType, string> = {
      beginner: 'Początkujący',
      intermediate: 'Średniozaawansowany',
      advanced: 'Zaawansowany'
    };
    return labels[level];
  };

  const getTrainingLevelVariant = (level?: TrainingLevelType): 'default' | 'secondary' | 'outline' => {
    if (!level) return 'outline';
    const variants: Record<TrainingLevelType, 'default' | 'secondary' | 'outline'> = {
      beginner: 'secondary',
      intermediate: 'default',
      advanced: 'default'
    };
    return variants[level];
  };

  const getGenderLabel = (gender?: Gender): string => {
    if (!gender) return 'Nieokreślona';
    const labels: Record<Gender, string> = {
      male: 'Mężczyzna',
      female: 'Kobieta',
      other: 'Inna'
    };
    return labels[gender];
  };


  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold">Moi Sportowcy</h1>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant="outline"
          className="flex items-center gap-2"
        >
          {showAddForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showAddForm ? 'Ukryj formularz' : 'Dodaj sportowca'}
        </Button>
      </div>

      {/* Add Athlete Card - Collapsible */}
      {showAddForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-headline">Dodaj Nowego Sportowca</CardTitle>
            <CardDescription>
              Wyszukaj sportowca po adresie e-mail, aby dodać go do swojej listy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSearch)} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel className="sr-only">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@sportowca.pl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={searchLoading}>
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className='hidden sm:inline ml-2'>{searchLoading ? 'Szukanie...' : 'Szukaj'}</span>
                </Button>
              </form>
            </Form>

            {searchError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Błąd</AlertTitle>
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}

            {foundUser && (
              <Card className="mt-4 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={foundUser.avatarUrl || avatarImage?.imageUrl} alt={foundUser.name} />
                      <AvatarFallback>
                        {foundUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{foundUser.name}</p>
                      <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                    </div>
                  </div>
                  <Button onClick={handleAddAthlete} disabled={addLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {addLoading ? 'Dodawanie...' : 'Dodaj'}
                  </Button>
                </div>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Athletes List - Full Width */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Przypisani Sportowcy ({athletes?.length || 0})</h2>
        </div>

        {athletesLoading ? (
          <Card className="p-8">
            <p className="text-center text-muted-foreground">Ładowanie listy sportowców...</p>
          </Card>
        ) : athletes && athletes.length > 0 ? (
          <div className="space-y-4">
            {athletes.map((athlete: UserProfile) => {
              const unreadCount = getUnreadCount(athlete.id);
              const stats = athleteStats[athlete.id];
              const age = calculateAge(athlete.dateOfBirth);

              return (
                <Card key={athlete.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={athlete.avatarUrl || avatarImage?.imageUrl} alt={athlete.name} />
                          <AvatarFallback className="text-lg">{athlete.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{athlete.name}</h3>
                            {athlete.onboardingCompleted ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Onboarding
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Brak onboardingu
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{athlete.email}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleChat(athlete)} className="relative">
                          <MessageSquare className="h-4 w-4" />
                          {unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center rounded-full bg-red-500 text-[10px]">
                              {unreadCount}
                            </Badge>
                          )}
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/profile/${athlete.id}`}>Profil publiczny</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/trainer/my-athletes/${athlete.id}`}>Zobacz Profil</Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openDietDialog(athlete.id)}>
                          <Utensils className="w-4 h-4 mr-2" />
                          {athlete.assignedDietPlanId ? 'Zmień' : 'Przypisz'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className='h-9 w-9'>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Czy na pewno chcesz usunąć sportowca?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tej operacji nie można cofnąć. Spowoduje to usunięcie sportowca <span className='font-bold'>{athlete.name}</span> z Twojej listy. Nie usunie to jego konta.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anuluj</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveAthlete(athlete.id)} className="bg-destructive hover:bg-destructive/90">
                                Usuń
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t">
                      {/* Personal Info */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Users className="h-3 w-3" />
                          <span>Wiek</span>
                        </div>
                        <p className="font-medium">{age ? `${age} lat` : 'N/A'}</p>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <UserIcon className="h-3 w-3" />
                          <span>Płeć</span>
                        </div>
                        <p className="font-medium text-sm">{getGenderLabel(athlete.gender)}</p>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>Poziom</span>
                        </div>
                        <Badge variant={getTrainingLevelVariant(athlete.trainingLevel)} className="w-fit text-xs">
                          {getTrainingLevelLabel(athlete.trainingLevel)}
                        </Badge>
                      </div>

                      {/* Physical Stats */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Ruler className="h-3 w-3" />
                          <span>Wzrost</span>
                        </div>
                        <p className="font-medium">{athlete.height ? `${athlete.height} cm` : 'N/A'}</p>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Weight className="h-3 w-3" />
                          <span>Waga</span>
                        </div>
                        <p className="font-medium">{athlete.weight ? `${athlete.weight} kg` : 'N/A'}</p>
                      </div>

                      {/* Activity Stats */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Dumbbell className="h-3 w-3" />
                          <span>Treningi</span>
                        </div>
                        <p className="font-medium">
                          {statsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            stats?.totalWorkouts || 0
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Additional Activity Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ostatni trening:</span>
                        <span className="font-medium">
                          {statsLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin inline" />
                          ) : (
                            formatDate(stats?.lastWorkoutDate || null)
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ostatni check-in:</span>
                        <span className="font-medium">
                          {statsLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin inline" />
                          ) : (
                            formatDate(stats?.lastCheckInDate || null)
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
              <UserIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold">Brak sportowców</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Nie masz jeszcze przypisanych żadnych sportowców. Użyj formularza, aby ich dodać.
              </p>
              <Button onClick={() => setShowAddForm(true)} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                Dodaj pierwszego sportowca
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDietDialogOpen} onOpenChange={setIsDietDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przypisz Dietę</DialogTitle>
            <DialogDescription>
              Wybierz plan dietetyczny dla tego sportowca.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="diet" className="text-right">
                Dieta
              </Label>
              <Select onValueChange={setSelectedDietId} value={selectedDietId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Wybierz dietę" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">Brak (Usuń przypisanie)</SelectItem>
                  {diets.map((diet) => (
                    <SelectItem key={diet._id} value={diet._id}>
                      {diet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAssignDiet} disabled={assigningDietId === currentAthleteId}>
              {assigningDietId === currentAthleteId ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
