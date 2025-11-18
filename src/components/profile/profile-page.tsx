'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Instagram, Facebook, Twitter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useDoc, useUser, useCollection, useUpdateDoc } from '@/lib/db-hooks';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeToggle } from '@/components/theme-toggle';
import { Switch } from '@/components/ui/switch';
import { AvatarUpload } from '@/components/avatar-upload';

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

export function ProfilePage() {
  const { toast } = useToast();
  const { user } = useUser();

  const { data: userProfile, isLoading: profileLoading, refetch } = useDoc<UserProfile>('users', user?.uid || null);

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
  const { updateDoc } = useUpdateDoc();

  const onSubmit = async (data: ProfileFormValues) => {
    if (!userProfile || !user) return;

    const updatedData: UserProfile = {
        ...userProfile,
        ...data
    };

    try {
      await updateDoc('users', user.uid, updatedData);
      toast({
        title: 'Sukces!',
        description: 'Twój profil został zaktualizowany.',
      });
    } catch (error) {
      toast({
        title: 'Błąd!',
        description: 'Nie udało się zaktualizować profilu.',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarUploadSuccess = (photoURL: string) => {
    // Refetch user profile to get updated photoURL
    refetch();
  };

  const handleAvatarDeleteSuccess = () => {
    // Refetch user profile to remove photoURL
    refetch();
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Twój Profil</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              {isLoading ? (
                <>
                  <Skeleton className="mb-4 h-24 w-24 rounded-full" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="mt-2 h-5 w-1/2" />
                  <Skeleton className="mt-4 h-9 w-32" />
                </>
              ) : (
                <>
                  <AvatarUpload
                    currentPhotoURL={userProfile?.photoURL}
                    userName={userProfile?.name}
                    onUploadSuccess={handleAvatarUploadSuccess}
                    onDeleteSuccess={handleAvatarDeleteSuccess}
                  />
                  <h2 className="mt-4 font-headline text-2xl font-semibold">{userProfile?.name}</h2>
                  <p className="text-muted-foreground capitalize">{userProfile?.role}</p>
                </>
              )}
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
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
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
                      <Switch id="workout-reminders" defaultChecked/>
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
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Zapisz Zmiany
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

