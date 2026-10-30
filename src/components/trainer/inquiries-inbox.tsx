'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, Inbox, Loader2, MessageSquare, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConversations } from '@/components/chat/hooks/useConversations';
import { useCollection, useUpdateDoc, useUser } from '@/lib/db-hooks';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useToast } from '@/hooks/use-toast';
import type { TrainerRequest } from '@/lib/types';

const STATUS_LABEL = { accepted: 'Przyjęte', rejected: 'Odrzucone' } as const;

function InquiryCard({
  request,
  busy,
  onAccept,
  onReject,
  onChat,
}: {
  request: TrainerRequest;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onChat: () => void;
}) {
  const pending = request.status === 'pending';

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 font-bold uppercase text-primary">
            {request.athleteName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">{request.athleteName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: pl })}
            </p>
          </div>
          {request.goal && <Badge variant="secondary">{request.goal}</Badge>}
          {!pending && <Badge variant={request.status === 'accepted' ? 'default' : 'outline'}>{STATUS_LABEL[request.status as 'accepted' | 'rejected']}</Badge>}
        </div>

        {request.message ? (
          <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">{request.message}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Sportowiec nie dodał wiadomości.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {pending && (
            <>
              <Button size="sm" onClick={onAccept} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Przyjmij do podopiecznych
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
                <X className="mr-2 h-4 w-4" /> Odrzuć
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={onChat} disabled={busy}>
            <MessageSquare className="mr-2 h-4 w-4" /> Napisz
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function InquiriesInbox() {
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const { toast } = useToast();
  const router = useRouter();
  const { updateDoc } = useUpdateDoc();
  const { conversations, createConversation } = useConversations();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: requests, isLoading, refetch } = useCollection<TrainerRequest>(
    user ? 'trainerRequests' : null,
    { trainerId: user?.uid },
    { sort: { createdAt: -1 } }
  );

  const pending = (requests ?? []).filter((r) => r.status === 'pending');
  const archived = (requests ?? []).filter((r) => r.status !== 'pending');

  const accept = async (request: TrainerRequest) => {
    if (!user) return;
    setBusyId(request.id);
    try {
      // Assigning is a PATCH on the athlete's user document; the server only lets a trainer claim an unassigned athlete.
      const response = await fetch(`/api/db/users/${request.athleteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId: user.uid }),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 403 || response.status === 404
            ? 'Ten sportowiec ma już innego trenera albo konto nie istnieje.'
            : 'Nie udało się przypisać sportowca.'
        );
      }
      await updateDoc('trainerRequests', request.id, { status: 'accepted' });
      toast({ title: 'Sportowiec przyjęty', description: `${request.athleteName} jest teraz na Twojej liście.` });
      refetch();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się przyjąć zapytania.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request: TrainerRequest) => {
    setBusyId(request.id);
    try {
      await updateDoc('trainerRequests', request.id, { status: 'rejected' });
      refetch();
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się odrzucić zapytania.', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const openChat = async (request: TrainerRequest) => {
    if (!user) return;
    const conversationId = [user.uid, request.athleteId].sort().join('_');
    if (!conversations?.some((c) => c.conversationId === conversationId)) {
      try {
        await createConversation({
          conversationId,
          participants: [user.uid, request.athleteId],
          trainerId: user.uid,
          athleteId: request.athleteId,
          trainerName: userProfile?.name || 'Trener',
          athleteName: request.athleteName,
          lastMessage: null,
          updatedAt: new Date(),
          unreadCount: { [user.uid]: 0, [request.athleteId]: 0 },
        });
      } catch {
        toast({ title: 'Błąd', description: 'Nie udało się otworzyć czatu.', variant: 'destructive' });
        return;
      }
    }
    router.push(`/trainer/chat?conversationId=${conversationId}`);
  };

  const renderList = (items: TrainerRequest[], empty: string) =>
    items.length === 0 ? (
      <div className="rounded-xl border-2 border-dashed px-6 py-14 text-center">
        <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-medium">{empty}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Pełna <Link href="/trainer/business-card" className="font-semibold text-primary underline-offset-4 hover:underline">wizytówka</Link> zachęca sportowców do kontaktu.
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {items.map((r) => (
          <InquiryCard
            key={r.id}
            request={r}
            busy={busyId === r.id}
            onAccept={() => accept(r)}
            onReject={() => reject(r)}
            onChat={() => openChat(r)}
          />
        ))}
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold">Zapytania o współpracę</h1>
        <p className="text-muted-foreground">Sportowcy, którzy napisali do Ciebie z Twojej wizytówki.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Oczekujące ({pending.length})</TabsTrigger>
            <TabsTrigger value="archive">Archiwum ({archived.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            {renderList(pending, 'Brak nowych zapytań')}
          </TabsContent>
          <TabsContent value="archive" className="mt-4">
            {renderList(archived, 'Archiwum jest puste')}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
