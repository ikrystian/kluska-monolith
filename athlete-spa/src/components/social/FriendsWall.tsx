import { useState, type FormEvent } from 'react';
import { useSWRConfig } from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, Loader2, MessageSquareText, Send, Trash2, User, UserMinus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiFetch } from '@/lib/api-client';
import { useUser } from '@/lib/db-hooks';
import { toast } from '@/hooks/use-toast';
import {
  SOCIAL_KEYS,
  useFriendActions,
  useFriends,
  useFriendStatuses,
  type FriendEntry,
  type FriendStatusPost,
} from '@/lib/friends';
import { SocialAvatar, socialName } from './SocialAvatar';

const MAX_STATUS_LENGTH = 280;

function timeAgo(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
  } catch {
    return 'niedawno';
  }
}

interface FriendsWallProps {
  onProfileClick: (userId: string) => void;
  onFindFriends: () => void;
}

export function FriendsWall({ onProfileClick, onFindFriends }: FriendsWallProps) {
  const { data: friendsData, isLoading: friendsLoading } = useFriends();
  const { data: statuses, isLoading: statusesLoading, error: statusesError, mutate: refetchStatuses } =
    useFriendStatuses();
  const { accept, remove, pendingKey } = useFriendActions();
  const [removing, setRemoving] = useState<FriendEntry | null>(null);

  const friends = friendsData?.friends ?? [];
  const incoming = friendsData?.incoming ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-xl font-bold tracking-tight">Friends wall</h2>
        <p className="text-sm text-muted-foreground">Statusy Twoje i Twoich znajomych.</p>
      </div>

      {/* Incoming invitations */}
      {incoming.length > 0 && (
        <section aria-labelledby="friend-invites-heading" className="rounded-[1.75rem] border border-primary/25 bg-card p-4 shadow-soft">
          <h3 id="friend-invites-heading" className="mb-3 text-sm font-bold">
            Zaproszenia do znajomych ({incoming.length})
          </h3>
          <ul className="space-y-2.5">
            {incoming.map(invite => {
              const busy = pendingKey === invite.friendshipId;
              return (
                <li key={invite.friendshipId} className="flex items-center gap-3">
                  <SocialAvatar user={invite.user} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{socialName(invite.user)}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(invite.since)}</p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={busy}
                    onClick={() => accept(invite.friendshipId)}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Akceptuj
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0"
                    disabled={busy}
                    aria-label={`Odrzuć zaproszenie od ${socialName(invite.user)}`}
                    onClick={() => remove(invite.friendshipId, 'Zaproszenie odrzucone')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Friends strip */}
      <section aria-labelledby="friends-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id="friends-heading" className="text-sm font-bold">
            Znajomi {friends.length > 0 && <span className="text-muted-foreground">({friends.length})</span>}
          </h3>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={onFindFriends}>
            Znajdź znajomych
          </Button>
        </div>
        {friendsLoading && !friendsData ? (
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-2xl" />
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-6 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
              <Users className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze znajomych. Zaproś sportowców z Twojej okolicy, aby widzieć ich statusy.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={onFindFriends}>
              Znajdź znajomych
            </Button>
          </div>
        ) : (
          <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {friends.map(friend => (
              <li key={friend.friendshipId} className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex w-16 flex-col items-center gap-1 rounded-2xl p-1 transition-opacity hover:opacity-80"
                      aria-label={`Opcje dla ${socialName(friend.user)}`}
                    >
                      <SocialAvatar user={friend.user} className="h-12 w-12" />
                      <span className="w-full truncate text-center text-[11px] font-medium">
                        {friend.user.displayName}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel className="max-w-[14rem] truncate">{socialName(friend.user)}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {friend.user.nickname && (
                      <DropdownMenuItem onClick={() => onProfileClick(friend.user.userId)}>
                        <User className="mr-2 h-4 w-4" />
                        Zobacz profil
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setRemoving(friend)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Usuń ze znajomych
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StatusComposer />

      {/* Statuses */}
      <section aria-label="Statusy znajomych" className="space-y-2.5">
        {statusesError ? (
          <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="mb-3 text-sm text-muted-foreground">Nie udało się wczytać statusów.</p>
            <Button size="sm" variant="outline" onClick={() => refetchStatuses()}>
              Spróbuj ponownie
            </Button>
          </div>
        ) : statusesLoading && !statuses ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
        ) : statuses && statuses.length > 0 ? (
          <ul className="space-y-2.5">
            {statuses.map(status => (
              <StatusCard key={status.id} status={status} onProfileClick={onProfileClick} />
            ))}
          </ul>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-6 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
              <MessageSquareText className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">Brak statusów. Napisz pierwszy!</p>
          </div>
        )}
      </section>

      <AlertDialog open={!!removing} onOpenChange={open => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć {removing ? socialName(removing.user) : ''} ze znajomych?</AlertDialogTitle>
            <AlertDialogDescription>
              Przestaniecie widzieć nawzajem swoje statusy i aktywność. Możesz zaprosić tę osobę ponownie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removing) void remove(removing.friendshipId, 'Usunięto ze znajomych');
                setRemoving(null);
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusComposer() {
  const { mutate } = useSWRConfig();
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const trimmed = text.trim();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || trimmed.length > MAX_STATUS_LENGTH) return;

    setIsPosting(true);
    try {
      const response = await apiFetch(SOCIAL_KEYS.statuses, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setText('');
      await mutate(SOCIAL_KEYS.statuses);
    } catch (error) {
      console.error('Failed to post status:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się opublikować statusu. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-border/60 bg-card p-3 shadow-soft">
      <label htmlFor="friends-status" className="sr-only">
        Twój status
      </label>
      <Textarea
        id="friends-status"
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={MAX_STATUS_LENGTH}
        rows={2}
        placeholder="Co słychać? Podziel się statusem ze znajomymi…"
        className="min-h-[64px] resize-none border-0 bg-transparent px-1 focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {text.length}/{MAX_STATUS_LENGTH}
        </span>
        <Button type="submit" size="sm" disabled={!trimmed || isPosting} className="gap-1.5">
          {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Opublikuj
        </Button>
      </div>
    </form>
  );
}

function StatusCard({
  status,
  onProfileClick,
}: {
  status: FriendStatusPost;
  onProfileClick: (userId: string) => void;
}) {
  const { user } = useUser();
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = user?.uid === status.authorId || user?.role === 'admin';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await apiFetch(`${SOCIAL_KEYS.statuses}/${status.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      await Promise.all([mutate(SOCIAL_KEYS.statuses), mutate(SOCIAL_KEYS.activity)]);
    } catch (error) {
      console.error('Failed to delete status:', error);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć statusu.', variant: 'destructive' });
      setIsDeleting(false);
    }
  };

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!status.author.nickname}
          onClick={() => onProfileClick(status.authorId)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity enabled:hover:opacity-80"
        >
          <SocialAvatar user={status.author} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {socialName(status.author)}
              {user?.uid === status.authorId && <span className="ml-1.5 font-normal text-muted-foreground">(Ty)</span>}
            </p>
            <p className="text-xs text-muted-foreground">{timeAgo(status.createdAt)}</p>
          </div>
        </button>
        {canDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            disabled={isDeleting}
            aria-label="Usuń status"
            onClick={handleDelete}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        )}
      </div>
      <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{status.text}</p>
    </li>
  );
}
