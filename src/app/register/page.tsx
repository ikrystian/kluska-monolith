'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser, useDoc } from '@/lib/db-hooks';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'athlete' | 'trainer' | 'admin'>('athlete');
  const [uiLoading, setUiLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const { user, isUserLoading } = useUser();
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(
    user ? 'users' : null,
    user?.uid || null
  );

  const isLoading = isUserLoading || uiLoading || (user && isProfileLoading);

  useEffect(() => {
    if (!isUserLoading && user && userProfile) {
      if (userProfile.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (userProfile.role === 'trainer') {
        router.push('/trainer/dashboard');
      } else if (userProfile.role === 'athlete') {
        router.push('/athlete/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, userProfile, isUserLoading, router]);

  const handleRegister = async () => {
    if (password.length < 6) {
      toast({
        title: 'Błąd rejestracji',
        description: 'Hasło musi mieć co najmniej 6 znaków.',
        variant: 'destructive',
      });
      return;
    }
    setUiLoading(true);
    try {
      // Register user via API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast({
        title: 'Rejestracja udana!',
        description: 'Witaj w GymProgress! Logowanie...',
      });

      // Auto-login after registration
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      // The useEffect will handle the redirect

    } catch (error: any) {
      let errorMessage = error.message || 'Wystąpił nieznany błąd. Spróbuj ponownie.';

      toast({
        title: 'Błąd rejestracji',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUiLoading(false);
    }
  };

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Dumbbell className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-headline text-2xl font-extrabold">Stwórz Konto</CardTitle>
          <CardDescription className="text-base">Rozpocznij swoją podróż fitness z GymProgress</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="name" className="font-semibold">Imię i Nazwisko</Label>
            <Input
              id="name"
              placeholder="Jan Kowalski"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="font-semibold">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="font-semibold">Hasło</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">Minimum 6 znaków</p>
          </div>
          <div className="grid gap-3">
            <Label className="font-semibold">Wybierz typ konta</Label>
            <RadioGroup
              defaultValue="athlete"
              className="grid grid-cols-2 gap-3"
              onValueChange={(value: 'athlete' | 'trainer' | 'admin') => setRole(value)}
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2 rounded-lg border border-input p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="athlete" id="r-athlete" />
                <Label htmlFor="r-athlete" className="cursor-pointer font-normal">Sportowiec</Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border border-input p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="trainer" id="r-trainer" />
                <Label htmlFor="r-trainer" className="cursor-pointer font-normal">Trener</Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border border-input p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5 col-span-2">
                <RadioGroupItem value="admin" id="r-admin" />
                <Label htmlFor="r-admin" className="cursor-pointer font-normal">Administrator</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full h-11 font-bold text-base" onClick={handleRegister} disabled={isLoading}>
            {isLoading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Masz już konto?{' '}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Zaloguj się
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
