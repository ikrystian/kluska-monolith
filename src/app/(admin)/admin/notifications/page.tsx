'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Send, Smartphone } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface EligibleUser {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'trainer' | 'admin';
  deviceCount: number;
  lastSubscribedAt: string;
}

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<EligibleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('Testowe powiadomienie');
  const [body, setBody] = useState('To jest testowa wiadomość push z panelu administratora.');
  const [isSending, setIsSending] = useState(false);

  const fetchEligibleUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/push/eligible-users');
      if (!response.ok) throw new Error('Failed to load users');
      const { data } = await response.json();
      setUsers(data);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać listy użytkowników z aktywnymi powiadomieniami.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleUser = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(users.map((u) => u.id)) : new Set());
  };

  const handleSendTest = async () => {
    if (selectedIds.size === 0 || !title.trim() || !body.trim()) return;
    setIsSending(true);
    try {
      const response = await fetch('/api/push/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          title: title.trim(),
          body: body.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send');

      toast({
        title: 'Wysłano',
        description: `Dostarczono do ${data.sentCount}/${data.targetedDevices} urządzeń${data.failedCount > 0 ? ` (${data.failedCount} nieudanych)` : ''}.`,
      });

      // Stale subscriptions get dropped server-side — refresh counts to match.
      fetchEligibleUsers();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się wysłać powiadomienia.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const allSelected = users.length > 0 && selectedIds.size === users.length;

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight md:text-3xl">Powiadomienia</h1>
          <p className="text-sm text-muted-foreground">Wyślij testowe powiadomienie push do użytkowników, którzy włączyli je w ustawieniach.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Użytkownicy z aktywną zgodą</CardTitle>
            <CardDescription>
              Tylko użytkownicy, którzy włączyli powiadomienia push i pomyślnie zasubskrybowali urządzenie, pojawiają się na tej liście.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Żaden użytkownik nie ma jeszcze aktywnej subskrypcji powiadomień push.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={(checked) => toggleAll(!!checked)} />
                    </TableHead>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead>Rola</TableHead>
                    <TableHead className="text-right">Urządzenia</TableHead>
                    <TableHead className="text-right">Ostatnia subskrypcja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="cursor-pointer" onClick={() => toggleUser(u.id, !selectedIds.has(u.id))}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(u.id)}
                          onCheckedChange={(checked) => toggleUser(u.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1">
                          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                          {u.deviceCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(u.lastSubscribedAt), 'd MMM yyyy, HH:mm', { locale: pl })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wyślij testowe powiadomienie</CardTitle>
            <CardDescription>{selectedIds.size} z {users.length} wybranych</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Tytuł</Label>
              <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-body">Treść</Label>
              <Textarea id="notif-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={300} />
            </div>
            <Button
              className="w-full"
              onClick={handleSendTest}
              disabled={isSending || selectedIds.size === 0 || !title.trim() || !body.trim()}
            >
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Wyślij testowe powiadomienie
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
