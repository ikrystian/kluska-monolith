<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useUpdateDoc } from '@/hooks/useMutation';
import { UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, User, Mail, Ruler, Weight, Target } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { userProfile, isLoading, refetch } = useUserProfile();
  const { mutate: updateDoc, isPending: isSaving } = useUpdateDoc<UserProfile>('users');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    height: '',
    weight: '',
    age: '',
  });

  // Sync form with profile data
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || userProfile.displayName || '',
        email: userProfile.email || '',
        height: userProfile.height?.toString() || '',
        weight: userProfile.weight?.toString() || '',
        age: userProfile.age?.toString() || '',
      });
    }
  }, [userProfile]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !userProfile) return;

    const updatedProfile: Partial<UserProfile> = {
      name: formData.name,
      email: formData.email,
      height: formData.height ? parseInt(formData.height) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      age: formData.age ? parseInt(formData.age) : undefined,
    };

    updateDoc(
      { id: user.id, data: updatedProfile },
      {
        onSuccess: () => {
          toast.success('Profil został zaktualizowany.');
          refetch();
        },
        onError: () => {
          toast.error('Nie udało się zaktualizować profilu.');
        }
      }
    );
=======
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Instagram, Facebook, Twitter, Loader2, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDoc, useCollection, useUpdateDoc } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import type { UserProfile, Gym } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeToggle } from '@/components/theme-toggle';
import { Switch } from '@/components/ui/switch';
import { useUserProfile } from '@/contexts/UserProfileContext';

const profileSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane.'),
  email: z.string().email('Nieprawidłowy adres email.'),
  socialLinks: z.object({
    instagram: z.string().url().or(z.literal('')),
    facebook: z.string().url().or(z.literal('')),
    twitter: z.string().url().or(z.literal('')),
  }).optional(),
  favoriteGymIds: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const userId = user?.id;
  // TODO: Use this when AvatarUploadDialog is implemented
  const [_isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  void _isAvatarDialogOpen; // Suppress unused warning

  const { data: userProfile, isLoading: profileLoading, refetch } = useDoc<UserProfile>('users', userId || null);
  const { refetch: refetchProfileContext } = useUserProfile();

  const { data: allGyms, isLoading: gymsLoading } = useCollection<Gym>('gyms');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: userProfile?.name || '',
      email: userProfile?.email || '',
      socialLinks: {
        instagram: userProfile?.socialLinks?.instagram || '',
        facebook: userProfile?.socialLinks?.facebook || '',
        twitter: userProfile?.socialLinks?.twitter || '',
      },
      favoriteGymIds: userProfile?.favoriteGymIds || [],
    }
  });

  const isLoading = profileLoading || gymsLoading;
  const { mutateAsync: updateDoc } = useUpdateDoc<UserProfile>('users');

  // TODO: Use this when AvatarUploadDialog is implemented
  const _handleAvatarUpload = async (url: string) => {
    if (!userId || !userProfile) return;
    try {
      await updateDoc({ id: userId, data: { ...userProfile, avatarUrl: url } });
      refetch();
      refetchProfileContext();
    } catch {
      toast.error('Nie udało się zapisać avatara.');
    }
  };
  void _handleAvatarUpload; // Suppress unused warning

  const onSubmit = async (data: ProfileFormValues) => {
    if (!userProfile || !userId) return;

    const updatedData: Partial<UserProfile> = {
      ...userProfile,
      ...data
    };

    try {
      await updateDoc({ id: userId, data: updatedData });
      toast.success('Twój profil został zaktualizowany.');
    } catch {
      toast.error('Nie udało się zaktualizować profilu.');
    }
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
<<<<<<< HEAD
      .toUpperCase()
      .slice(0, 2);
=======
      .toUpperCase();
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Twój Profil</h1>
<<<<<<< HEAD

      <div className="grid gap-8 md:grid-cols-3">
        {/* Avatar Card */}
=======
      <div className="grid gap-8 md:grid-cols-3">
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
        <div className="md:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar className="mb-4 h-24 w-24 border-2 border-primary">
<<<<<<< HEAD
                {userProfile?.photoURL ? (
                  <AvatarImage src={userProfile.photoURL} alt="Awatar użytkownika" />
                ) : null}
                <AvatarFallback className="text-xl">
                  {isLoading ? <Skeleton className="h-full w-full" /> : getInitials(userProfile?.name || userProfile?.displayName)}
=======
                {userProfile?.avatarUrl ? (
                  <AvatarImage src={userProfile.avatarUrl} alt="Awatar użytkownika" />
                ) : null}
                <AvatarFallback>
                  {isLoading ? <Skeleton className="h-full w-full" /> : getInitials(userProfile?.name)}
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
                </AvatarFallback>
              </Avatar>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="mt-2 h-5 w-1/2" />
                </>
              ) : (
                <>
<<<<<<< HEAD
                  <h2 className="font-headline text-2xl font-semibold">{userProfile?.name || userProfile?.displayName || 'Użytkownik'}</h2>
                  <Badge variant="secondary" className="mt-2 capitalize">{userProfile?.role}</Badge>
                </>
              )}
            </CardContent>
          </Card>

          {/* Physical Stats Card */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dane Fizyczne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Ruler className="h-4 w-4" /> Wzrost
                    </span>
                    <span className="font-semibold">{userProfile?.height ?? '-'} cm</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Weight className="h-4 w-4" /> Waga
                    </span>
                    <span className="font-semibold">{userProfile?.weight ?? '-'} kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" /> Poziom
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {userProfile?.trainingLevel === 'beginner' ? 'Początkujący' :
                        userProfile?.trainingLevel === 'intermediate' ? 'Średniozaawansowany' :
                          userProfile?.trainingLevel === 'advanced' ? 'Zaawansowany' : '-'}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Informacje o Koncie</CardTitle>
                <CardDescription>
                  Zaktualizuj swoje dane osobowe i parametry treningowe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Imię i Nazwisko
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Adres Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Parametry Fizyczne</h3>
                  {isLoading ? (
                    <div className="grid grid-cols-3 gap-4">
                      <Skeleton className="h-10 w-full" />
=======
                  <h2 className="font-headline text-2xl font-semibold">{userProfile?.name}</h2>
                  <p className="text-muted-foreground capitalize">{userProfile?.role}</p>
                </>
              )}
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsAvatarDialogOpen(true)}>
                <Camera className="mr-2 h-4 w-4" />
                Zmień zdjęcie
              </Button>
              {/* TODO: Add AvatarUploadDialog when implemented */}
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Informacje o Koncie</CardTitle>
                  <CardDescription>
                    Zaktualizuj swoje dane osobowe i ustawienia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="space-y-6">
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
<<<<<<< HEAD
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">Wiek</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder="np. 25"
                          value={formData.age}
                          onChange={(e) => handleChange('age', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="height">Wzrost (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          placeholder="np. 180"
                          value={formData.height}
                          onChange={(e) => handleChange('height', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weight">Waga (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          placeholder="np. 75.5"
                          value={formData.weight}
                          onChange={(e) => handleChange('weight', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isSaving || isLoading}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Zapisz Zmiany
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
=======
                    <>
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Imię i Nazwisko</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adres Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="space-y-4 pt-4">
                    <h3 className="font-semibold">Media Społecznościowe</h3>
                    {isLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <>
                        <FormField
                          control={form.control}
                          name="socialLinks.instagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Instagram className="h-4 w-4" /> Instagram
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="https://instagram.com/twojprofil" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="socialLinks.facebook"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Facebook className="h-4 w-4" /> Facebook
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="https://facebook.com/twojprofil" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="socialLinks.twitter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Twitter className="h-4 w-4" /> Twitter / X
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="https://x.com/twojprofil" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="font-semibold">Ulubione Siłownie</h3>
                    <FormField
                      control={form.control}
                      name="favoriteGymIds"
                      render={() => (
                        <FormItem>
                          <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-4">
                            {isLoading && <p>Ładowanie siłowni...</p>}
                            {allGyms?.map((gym) => (
                              <FormField
                                key={gym.id}
                                control={form.control}
                                name="favoriteGymIds"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={gym.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(gym.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), gym.id])
                                              : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== gym.id
                                                )
                                              )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {gym.name}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                            {!isLoading && allGyms?.length === 0 && <p className="text-sm text-muted-foreground">Brak siłowni do wyboru.</p>}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Motyw</FormLabel>
                    <ThemeToggle />
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="font-medium">Ustawienia Powiadomień</h3>
                    <div className="flex items-center justify-between rounded-md border p-4">
                      <div>
                        <FormLabel htmlFor="workout-reminders">Przypomnienia o treningu</FormLabel>
                        <p className="text-sm text-muted-foreground">Otrzymuj powiadomienia przed zaplanowanymi treningami.</p>
                      </div>
                      <Switch id="workout-reminders" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-4">
                      <div>
                        <FormLabel htmlFor="weekly-summary">Tygodniowe podsumowanie</FormLabel>
                        <p className="text-sm text-muted-foreground">Otrzymuj podsumowanie swoich postępów co tydzień.</p>
                      </div>
                      <Switch id="weekly-summary" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Zapisz Zmiany
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
        </div>
      </div>
    </div>
  );
}
