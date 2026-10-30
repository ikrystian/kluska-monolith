import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Mail, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api-client';
import { AuthField, AuthShell } from '@/components/auth/AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Podaj poprawny adres e-mail.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSentMessage(data.message);
    } catch (err: any) {
      toast({
        title: 'Błąd',
        description: err.message || 'Nie udało się wysłać linku. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      mode="login"
      hideTabs
      title="Nowe"
      accent="hasło"
      subtitle={sentMessage ?? 'Podaj adres e-mail konta — wyślemy Ci link do ustawienia nowego hasła.'}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Wróć do logowania
          </Link>
        </p>
      }
    >
      {sentMessage ? (
        <div className="flex items-start gap-3 rounded-2xl bg-[hsl(var(--volt)/0.12)] p-3.5 text-sm">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
          <span>Otwórz link z wiadomości, ustaw nowe hasło i wróć tutaj, aby się zalogować.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
              setError(undefined);
            }}
            disabled={isLoading}
            error={error}
          />
          <Button type="submit" className="h-[3.25rem] w-full rounded-2xl text-base font-bold shadow-glow" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wysyłanie...
              </>
            ) : (
              <>
                Wyślij link
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
