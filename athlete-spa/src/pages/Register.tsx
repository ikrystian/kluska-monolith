import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { PageTransition } from '@/components/motion';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleRegister = async () => {
    if (password.length < 6) {
      toast({
        title: 'Błąd rejestracji',
        description: 'Hasło musi mieć co najmniej 6 znaków.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      // Register user via API (this SPA only manages athlete accounts)
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'athlete' }),
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
      await login(email, password);
      navigate('/athlete/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'Wystąpił nieznany błąd. Spróbuj ponownie.';

      toast({
        title: 'Błąd rejestracji',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-background">
      {/* Aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-[110px]" />
        <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[hsl(var(--volt)/0.10)] blur-[120px]" />
        <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-[hsl(var(--chart-4)/0.08)] blur-[110px]" />
        <div className="texture-grain absolute inset-0" />
      </div>

      <PageTransition className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <span className="hero-ember texture-grain relative grid h-11 w-11 place-items-center rounded-2xl shadow-glow">
            <Dumbbell className="h-5 w-5 text-white" />
          </span>
          <span className="font-display text-[11px] font-bold uppercase leading-[1.3] tracking-[0.28em] text-foreground">
            Leniwa<br />Kluska
          </span>
        </div>

        {/* Statement */}
        <h1 className="font-display text-4xl font-extrabold uppercase leading-[1.05] tracking-tight md:text-5xl">
          Zacznij
          <br />
          <span className="text-gradient-ember">swoją grę</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Stwórz konto i rozpocznij podróż fitness z Leniwą Kluską.
        </p>

        {/* Form */}
        <div className="glass mt-8 space-y-5 rounded-[2rem] p-6">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imię i Nazwisko</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Jan Kowalski"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-2xl bg-background/60 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="twoj@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-2xl bg-background/60 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hasło</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-2xl bg-background/60 text-base"
            />
            <p className="text-xs text-muted-foreground">Minimum 6 znaków</p>
          </div>
          <Button
            className="h-[3.25rem] w-full rounded-2xl text-base font-bold shadow-glow"
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Masz już konto?{' '}
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Zaloguj się
          </Link>
        </p>
      </PageTransition>
    </div>
  );
}
