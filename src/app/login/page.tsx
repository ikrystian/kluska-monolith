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
import { Checkbox } from '@/components/ui/checkbox';
import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc } from '@/lib/db-hooks';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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

  const handleLogin = async () => {
    setUiLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        rememberMe: rememberMe.toString(),
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: 'Błąd logowania',
          description: 'Nieprawidłowy adres e-mail lub hasło.',
          variant: 'destructive',
        });
      }
      // The useEffect will handle the redirect
    } catch (error: any) {
      toast({
        title: 'Błąd logowania',
        description: 'Wystąpił nieznany błąd logowania.',
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
          <CardTitle className="font-headline text-2xl font-extrabold">Witaj z powrotem</CardTitle>
          <CardDescription className="text-base">Zaloguj się do swojego konta GymProgress</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
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
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="h-11"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="rememberMe" className="cursor-pointer font-normal text-sm">
              Zapamiętaj mnie
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full h-11 font-bold text-base" onClick={handleLogin} disabled={isLoading}>
            {isLoading ? 'Logowanie...' : 'Zaloguj się'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Nie masz konta?{' '}
            <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
              Zarejestruj się
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
