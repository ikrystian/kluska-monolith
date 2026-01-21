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
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Twój Profil</h1>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Avatar Card */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar className="mb-4 h-24 w-24 border-2 border-primary">
                {userProfile?.photoURL ? (
                  <AvatarImage src={userProfile.photoURL} alt="Awatar użytkownika" />
                ) : null}
                <AvatarFallback className="text-xl">
                  {isLoading ? <Skeleton className="h-full w-full" /> : getInitials(userProfile?.name || userProfile?.displayName)}
                </AvatarFallback>
              </Avatar>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="mt-2 h-5 w-1/2" />
                </>
              ) : (
                <>
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
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
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
        </div>
      </div>
    </div>
  );
}
