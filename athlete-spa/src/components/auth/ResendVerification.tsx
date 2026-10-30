import { useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api-client';

export function ResendVerification({ email }: { email: string }) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const resend = async () => {
    setIsSending(true);
    try {
      const response = await apiFetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
    <Button type="button" variant="outline" className="h-12 w-full rounded-2xl" onClick={resend} disabled={isSending}>
      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
      Wyślij link aktywacyjny ponownie
    </Button>
  );
}
