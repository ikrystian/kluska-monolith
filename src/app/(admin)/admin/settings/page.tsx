'use client';

import { useEffect, useState } from 'react';
import { Ghost, Settings } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface AppSettings {
  halloweenEnabled: boolean;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) throw new Error('Failed to load settings');
        setSettings(await response.json());
      } catch {
        toast({
          title: 'Błąd',
          description: 'Nie udało się pobrać ustawień.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHalloweenToggle = async (checked: boolean) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ halloweenEnabled: checked }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save');
      setSettings(data);
      toast({
        title: 'Zapisano',
        description: checked ? 'Motyw Halloween został włączony.' : 'Motyw Halloween został wyłączony.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zapisać ustawień.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight md:text-3xl">Ustawienia</h1>
          <p className="text-sm text-muted-foreground">Globalne ustawienia aplikacji obowiązujące wszystkich użytkowników.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Motywy sezonowe</CardTitle>
          <CardDescription>Dekoracje, które pojawiają się w aplikacji tylko w określonym czasie roku.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !settings ? (
            <Skeleton className="h-14 w-full" />
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Ghost className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <Label htmlFor="halloween-enabled" className="block cursor-pointer text-sm font-semibold leading-snug">
                  Halloween
                </Label>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Nakładka z nietoperzami, duchami i dyniami w aplikacji sportowca. Wyświetla się wyłącznie w dniach
                  20.10 – 1.11 każdego roku — poza tym okresem jest ukryta, niezależnie od tego ustawienia.
                </p>
              </div>
              <Switch
                id="halloween-enabled"
                checked={settings.halloweenEnabled}
                disabled={isSaving}
                onCheckedChange={handleHalloweenToggle}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
