'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AuthCard } from '@/components/auth/AuthCard';

const MIN_PASSWORD = 6;

function ResetPassword() {
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (password.length < MIN_PASSWORD) {
      toast({ title: 'Błąd', description: `Hasło musi mieć co najmniej ${MIN_PASSWORD} znaków.`, variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Błąd', description: 'Hasła nie są takie same.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDone(true);
    } catch (error: any) {
      toast({
        title: 'Nie udało się zmienić hasła',
        description: error.message || 'Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard
        title="Nieprawidłowy link"
        description="Link do resetu hasła jest niekompletny. Poproś o nowy."
        footer={
          <Button asChild className="w-full h-11 font-bold text-base">
            <Link href="/forgot-password">Wyślij nowy link</Link>
          </Button>
        }
      />
    );
  }

  if (done) {
    return (
      <AuthCard
        title="Hasło zmienione"
        description="Możesz się teraz zalogować nowym hasłem — w przeglądarce lub w aplikacji mobilnej."
        footer={
          <Button asChild className="w-full h-11 font-bold text-base">
            <Link href="/login">Zaloguj się</Link>
          </Button>
        }
      >
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Ustaw nowe hasło"
      description="Wpisz nowe hasło do swojego konta."
      footer={
        <>
          <Button className="w-full h-11 font-bold text-base" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Zapisywanie...' : 'Zmień hasło'}
          </Button>
          <Link href="/forgot-password" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Link wygasł? Wyślij nowy
          </Link>
        </>
      }
    >
      <div className="grid gap-2">
        <Label htmlFor="password" className="font-semibold">Nowe hasło</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Minimum {MIN_PASSWORD} znaków</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm" className="font-semibold">Powtórz hasło</Label>
        <Input
          id="confirm"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={isLoading}
          className="h-11"
        />
      </div>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}
