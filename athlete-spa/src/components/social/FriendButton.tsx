import { Check, Clock, Loader2, UserCheck, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFriendActions, type AthleteListItem } from '@/lib/friends';

/** Relation-aware action for an athlete row: invite, cancel, accept or (already) friends. */
export function FriendButton({ athlete }: { athlete: AthleteListItem }) {
  const { invite, accept, remove, pendingKey } = useFriendActions();
  const isPending = pendingKey === athlete.userId || (!!athlete.friendshipId && pendingKey === athlete.friendshipId);

  if (isPending) {
    return (
      <Button size="sm" variant="outline" disabled className="shrink-0">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  switch (athlete.relation) {
    case 'friends':
      return (
        <Button size="sm" variant="secondary" disabled className="shrink-0 gap-1.5 disabled:opacity-100">
          <UserCheck className="h-4 w-4 text-volt" />
          Znajomi
        </Button>
      );
    case 'outgoing':
      return (
        <div className="flex shrink-0 items-center gap-1">
          <span className="flex h-9 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Wysłano
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            aria-label={`Anuluj zaproszenie dla ${athlete.displayName}`}
            onClick={() => athlete.friendshipId && remove(athlete.friendshipId, 'Zaproszenie anulowane')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    case 'incoming':
      return (
        <Button
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => athlete.friendshipId && accept(athlete.friendshipId)}
        >
          <Check className="h-4 w-4" />
          Akceptuj
        </Button>
      );
    default:
      return (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          aria-label={`Dodaj ${athlete.displayName} do znajomych`}
          onClick={() => invite(athlete.userId)}
        >
          <UserPlus className="h-4 w-4" />
          Dodaj
        </Button>
      );
  }
}
