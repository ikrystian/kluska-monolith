'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AuthCard } from '@/components/auth/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSentMessage(data.message);
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wysłać linku. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const backToLogin = (
    <Link href="/login" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
      Wróć do logowania
    </Link>
  );

  if (sentMessage) {
    return (
      <AuthCard title="Sprawdź skrzynkę" description={sentMessage} footer={backToLogin}>
        <MailCheck className="mx-auto h-12 w-12 text-primary" />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Nie pamiętasz hasła?"
      description="Podaj adres e-mail konta — wyślemy Ci link do ustawienia nowego hasła."
      footer={
        <>
          <Button className="w-full h-11 font-bold text-base" onClick={handleSubmit} disabled={isLoading || !email.trim()}>
            {isLoading ? 'Wysyłanie...' : 'Wyślij link'}
          </Button>
          {backToLogin}
        </>
      }
    >
      <div className="grid gap-2">
        <Label htmlFor="email" className="font-semibold">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="twoj@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={isLoading}
          className="h-11"
        />
      </div>
    </AuthCard>
  );
}
