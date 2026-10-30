'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export function ResendVerification({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const resend = async () => {
    if (!email.trim()) return;
    setIsSending(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast({ title: 'Wysłano', description: data.message });
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wysłać linku. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Input
        type="email"
        placeholder="twoj@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isSending}
        className="h-11"
      />
      <Button variant="outline" className="h-11" onClick={resend} disabled={isSending || !email.trim()}>
        {isSending ? 'Wysyłanie...' : 'Wyślij link aktywacyjny ponownie'}
      </Button>
    </div>
  );
}
