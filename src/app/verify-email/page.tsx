'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/components/auth/AuthCard';
import { ResendVerification } from '@/components/auth/ResendVerification';

type Status = 'loading' | 'success' | 'error';

function VerifyEmail() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Brak tokenu aktywacyjnego w linku.');
  // React strict mode runs effects twice in dev; the token is single-use.
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        setStatus(response.ok ? 'success' : 'error');
        setMessage(response.ok ? data.message : data.error);
      })
      .catch(() => {
        setStatus('error');
        setMessage('Nie udało się połączyć z serwerem. Spróbuj ponownie.');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <AuthCard title="Aktywacja konta" description="Trwa potwierdzanie adresu e-mail...">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </AuthCard>
    );
  }

  if (status === 'success') {
    return (
      <AuthCard
        title="Konto aktywowane!"
        description="Twój adres e-mail został potwierdzony. Możesz się teraz zalogować — w przeglądarce lub w aplikacji mobilnej."
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
      title="Nie udało się aktywować konta"
      description={message}
      footer={
        <Link href="/login" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Wróć do logowania
        </Link>
      }
    >
      <XCircle className="mx-auto h-12 w-12 text-destructive" />
      <p className="text-center text-sm text-muted-foreground">
        Jeśli Twoje konto nie jest jeszcze aktywne, wyślij nowy link aktywacyjny.
      </p>
      <ResendVerification />
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
