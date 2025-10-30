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
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Dumbbell className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="font-headline text-2xl">Stwórz Konto</CardTitle>
          <CardDescription>Dołącz do GymProgress i zacznij śledzić swoje postępy.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Imię i Nazwisko</Label>
            <Input
              id="name"
              placeholder="Jan Kowalski"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label>Rola</Label>
            <RadioGroup
              defaultValue="athlete"
              className="flex gap-4"
              onValueChange={(value: 'athlete' | 'trainer' | 'admin') => setRole(value)}
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="athlete" id="r-athlete" />
                <Label htmlFor="r-athlete">Sportowiec</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="trainer" id="r-trainer" />
                <Label htmlFor="r-trainer">Trener</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="r-admin" />
                <Label htmlFor="r-admin">Administrator</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleRegister} disabled={isLoading}>
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
