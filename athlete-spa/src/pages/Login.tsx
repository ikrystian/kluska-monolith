import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Lock, Mail, UserRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AuthError, useAuth } from '@/contexts/AuthContext';
import { ResendVerification } from '@/components/auth/ResendVerification';
import { AuthField, AuthShell, PasswordToggle } from '@/components/auth/AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, loginAsGuest } = useAuth();
  const isBusy = isLoading || isGuestLoading;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = 'Podaj poprawny adres e-mail.';
    if (!password) nextErrors.password = 'Wpisz hasło.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsLoading(true);
    setUnverifiedEmail(null);
    try {
      const user = await login(email.trim(), password);

      if (user.role === 'admin') {
        toast({
          title: 'Brak dostępu',
          description: 'Ten panel jest przeznaczony dla kont sportowców i trenerów.',
          variant: 'destructive',
        });
        return;
      }

      navigate('/athlete/dashboard');
    } catch (error: any) {
      if (error instanceof AuthError && error.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(email.trim());
        return;
      }
      toast({
        title: 'Błąd logowania',
        description: error.message || 'Nieprawidłowy adres e-mail lub hasło.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      await loginAsGuest();
      navigate('/athlete/dashboard');
    } catch (error: any) {
      toast({
        title: 'Błąd trybu gościa',
        description: error.message || 'Nie udało się uruchomić trybu gościa. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        mode="login"
        title="Witaj"
        accent="z powrotem"
        subtitle=""
        footer={
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              lub
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isBusy}
              className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-dashed border-border bg-card/60 p-4 text-left transition-colors hover:border-primary/50 hover:bg-card active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted text-foreground">
                {isGuestLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserRound className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">
                  {isGuestLoading ? 'Uruchamianie...' : 'Kontynuuj bez konta'}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Dane zostaną na tym urządzeniu — konto założysz później.
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>

            <p className="relative text-xs text-white/60 mt-5 text-center">#leniwakluska 2026 Lightweight, baby! 🏋️</p>
          </div>
        }
      >
        <form onSubmit={handleLogin} noValidate className="space-y-4">
          <AuthField
            id="email"
            label="Email"
            icon={Mail}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="twoj@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={isBusy}
            error={errors.email}
          />
          <AuthField
            id="password"
            label="Hasło"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            disabled={isBusy}
            error={errors.password}
            trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />}
          />
          <div className="-mt-1 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Nie pamiętasz hasła?
            </Link>
          </div>

          {unverifiedEmail && (
            <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm" role="alert">
              <p>
                Konto <strong>{unverifiedEmail}</strong> nie zostało jeszcze aktywowane. Kliknij link aktywacyjny z
                wiadomości e-mail (sprawdź też spam).
              </p>
              <ResendVerification key={unverifiedEmail} email={unverifiedEmail} />
            </div>
          )}

          <Button type="submit" className="h-[3.25rem] w-full rounded-2xl text-base font-bold shadow-glow" disabled={isBusy}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logowanie...
              </>
            ) : (
              <>
                Zaloguj się
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </AuthShell>
    </>
  );
}
