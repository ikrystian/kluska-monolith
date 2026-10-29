import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, ONBOARDING_PENDING_KEY } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api-client';
import { getDeviceId } from '@/lib/device-id';
import { AuthField, AuthShell, PasswordToggle } from '@/components/auth/AuthShell';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

type FieldErrors = { name?: string; email?: string; password?: string };

/** 0–4 score: length ≥ min, length ≥ 10, mixed case, digit or symbol. */
function passwordScore(password: string) {
  if (!password) return 0;
  let score = password.length >= MIN_PASSWORD ? 1 : 0;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[\d\W_]/.test(password)) score++;
  return score;
}

const STRENGTH = [
  { label: 'Za krótkie', color: 'bg-destructive' },
  { label: 'Słabe', color: 'bg-destructive' },
  { label: 'Może być', color: 'bg-chart-5' },
  { label: 'Dobre', color: 'bg-volt' },
  { label: 'Mocne', color: 'bg-volt' },
];

function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  const { label, color } = STRENGTH[score];

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn('h-1.5 flex-1 rounded-full transition-colors duration-300', score >= step ? color : 'bg-muted')}
          />
        ))}
      </div>
      <span className="w-20 text-right font-medium" aria-live="polite">
        {password ? label : `Min. ${MIN_PASSWORD} znaków`}
      </span>
    </div>
  );
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, user } = useAuth();
  const isGuestUpgrade = Boolean(user?.isGuest);

  // Smart default: gość podał już imię podczas onboardingu — nie każemy wpisywać go drugi raz
  useEffect(() => {
    if (isGuestUpgrade && user?.name && !name) {
      setName(user.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuestUpgrade, user?.name]);

  const clearError = (field: keyof FieldErrors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = 'Podaj swoje imię.';
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = 'Podaj poprawny adres e-mail.';
    if (password.length < MIN_PASSWORD) nextErrors.password = `Hasło musi mieć co najmniej ${MIN_PASSWORD} znaków.`;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsLoading(true);
    try {
      // Register user via API (this SPA only manages athlete accounts).
      // A guest sends the device id so the backend upgrades the existing
      // per-device account in place instead of creating a fresh one.
      const guestDeviceId = isGuestUpgrade ? await getDeviceId() : undefined;
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role: 'athlete', guestDeviceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // A brand-new account's first login goes through the intro wizard. A
      // guest upgrading keeps whatever onboarding state it already has.
      if (!isGuestUpgrade) {
        localStorage.setItem(ONBOARDING_PENDING_KEY, '1');
      }

      toast({
        title: 'Rejestracja udana!',
        description: 'Witaj w #leniwakluska! Logowanie...',
      });

      // Auto-login after registration
      await login(email.trim(), password);
      navigate(isGuestUpgrade ? '/athlete/dashboard' : '/athlete/onboarding');
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
    <AuthShell
      mode="register"
      hideTabs={isGuestUpgrade}
      title={isGuestUpgrade ? 'Zachowaj' : 'Zacznij'}
      accent={isGuestUpgrade ? 'swoje postępy' : 'swoją grę'}
      subtitle={
        isGuestUpgrade
          ? 'Treningi, pomiary i nawyki z trybu gościa zostają z Tobą. Konto tylko je zabezpiecza i daje dostęp z każdego urządzenia.'
          : 'Załóż konto w kilka sekund i rozpocznij podróż fitness z Leniwą Kluską.'
      }
      footer={
        isGuestUpgrade ? (
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/athlete/dashboard" className="font-semibold text-primary underline-offset-4 hover:underline">
              Wróć do aplikacji
            </Link>
          </p>
        ) : undefined
      }
    >
      {isGuestUpgrade && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-[hsl(var(--volt)/0.12)] p-3.5 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
          <span>Nic nie stracisz — przeniesiemy wszystkie dane z tego urządzenia na Twoje konto.</span>
        </div>
      )}

      <form onSubmit={handleRegister} noValidate className="space-y-4">
        <AuthField
          id="name"
          label="Imię i nazwisko"
          icon={User}
          autoComplete="name"
          placeholder="Jan Kowalski"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError('name');
          }}
          disabled={isLoading}
          error={errors.name}
        />
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
            clearError('email');
          }}
          disabled={isLoading}
          error={errors.email}
        />
        <AuthField
          id="password"
          label="Hasło"
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError('password');
          }}
          disabled={isLoading}
          error={errors.password}
          hint={<PasswordStrength password={password} />}
          trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />}
        />

        <Button type="submit" className="h-[3.25rem] w-full rounded-2xl text-base font-bold shadow-glow" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            <>
              {isGuestUpgrade ? 'Zabezpiecz konto' : 'Załóż konto'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
