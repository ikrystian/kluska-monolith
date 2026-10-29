import { useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, Loader2, MapPin, MoreHorizontal, Search, User, UserMinus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  useAthletes,
  useFriendActions,
  useFriends,
  type AthleteListItem,
  type FriendEntry,
  type SocialUserSummary,
} from '@/lib/friends';
import { FriendButton } from './FriendButton';
import { SocialAvatar, socialName } from './SocialAvatar';
import { timeAgo } from './social-format';

const OTHERS_PREVIEW = 8;

interface PeopleTabProps {
  onProfileClick: (userId: string) => void;
}

export function PeopleTab({ onProfileClick }: PeopleTabProps) {
  const { data: friendsData, isLoading: friendsLoading } = useFriends();
  const { data: athletes, isLoading: athletesLoading, error: athletesError, mutate: refetchAthletes } = useAthletes();
  const { accept, remove, pendingKey } = useFriendActions();
  const [search, setSearch] = useState('');
  const [showAllOthers, setShowAllOthers] = useState(false);
  const [removing, setRemoving] = useState<FriendEntry | null>(null);

  const friends = friendsData?.friends ?? [];
  const incoming = friendsData?.incoming ?? [];
  const outgoing = friendsData?.outgoing ?? [];

  const term = search.trim().toLocaleLowerCase('pl');
  const { results, suggestions, others } = useMemo(() => {
    const list = athletes ?? [];
    const strangers = list.filter(a => a.relation === 'none');
    return {
      results: term
        ? list.filter(a => [a.displayName, a.nickname, a.location].some(v => v?.toLocaleLowerCase('pl').includes(term)))
        : [],
      suggestions: strangers.filter(a => a.sameArea),
      others: strangers.filter(a => !a.sameArea),
    };
  }, [athletes, term]);

  const isLoading = (friendsLoading && !friendsData) || (athletesLoading && !athletes);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj sportowców po nicku lub mieście"
          aria-label="Szukaj sportowców"
          className="h-11 rounded-full border-border/60 bg-card pl-10 shadow-soft"
        />
      </div>

      {athletesError ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Nie udało się wczytać listy sportowców.</p>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => refetchAthletes()}>
            Spróbuj ponownie
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.5rem] w-full rounded-[1.5rem]" />
          ))}
        </div>
      ) : term ? (
        <Section title="Wyniki wyszukiwania" count={results.length}>
          {results.length === 0 ? (
            <p className="rounded-[1.5rem] bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Nikt nie pasuje do „{search.trim()}”.
            </p>
          ) : (
            <PersonList>
              {results.map(a => (
                <PersonRow key={a.userId} user={a} onProfileClick={onProfileClick} meta={<Location athlete={a} />}>
                  <FriendButton athlete={a} />
                </PersonRow>
              ))}
            </PersonList>
          )}
        </Section>
      ) : (
        <>
          {incoming.length > 0 && (
            <Section title="Zaproszenia" count={incoming.length} accent>
              <PersonList>
                {incoming.map(invite => {
                  const busy = pendingKey === invite.friendshipId;
                  return (
                    <PersonRow
                      key={invite.friendshipId}
                      user={invite.user}
                      onProfileClick={onProfileClick}
                      meta={timeAgo(invite.since)}
                    >
                      <Button
                        size="sm"
                        className="h-9 gap-1.5 rounded-full"
                        disabled={busy}
                        onClick={() => accept(invite.friendshipId)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Akceptuj
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-full"
                        disabled={busy}
                        aria-label={`Odrzuć zaproszenie od ${socialName(invite.user)}`}
                        onClick={() => remove(invite.friendshipId, 'Zaproszenie odrzucone')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </PersonRow>
                  );
                })}
              </PersonList>
            </Section>
          )}

          {suggestions.length > 0 && (
            <Section title="Blisko Ciebie" subtitle="Sportowcy z Twojej okolicy">
              <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
                {suggestions.map(a => (
                  <li
                    key={a.userId}
                    className="flex w-40 shrink-0 snap-start flex-col items-center rounded-[1.5rem] border border-border/60 bg-card p-4 text-center shadow-soft"
                  >
                    <button
                      type="button"
                      disabled={!a.nickname}
                      onClick={() => onProfileClick(a.userId)}
                      className="flex w-full min-w-0 flex-col items-center transition-opacity enabled:hover:opacity-80"
                    >
                      <SocialAvatar user={a} className="h-16 w-16" />
                      <p className="mt-2.5 w-full truncate text-sm font-semibold">{socialName(a)}</p>
                      <p className="flex w-full items-center justify-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{a.location || 'W pobliżu'}</span>
                      </p>
                    </button>
                    <div className="mt-3">
                      <FriendButton athlete={a} />
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Twoi znajomi" count={friends.length}>
            {friends.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-6 text-center">
                <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
                  <Users className="h-6 w-6" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Nie masz jeszcze znajomych. Zaproś kogoś z listy poniżej albo wyszukaj po nicku.
                </p>
              </div>
            ) : (
              <PersonList>
                {friends.map(friend => (
                  <PersonRow
                    key={friend.friendshipId}
                    user={friend.user}
                    onProfileClick={onProfileClick}
                    meta={`Znajomi od ${format(new Date(friend.since), 'd MMMM yyyy', { locale: pl })}`}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-full text-muted-foreground"
                          aria-label={`Opcje dla ${socialName(friend.user)}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                  </PersonRow>
                ))}
              </PersonList>
            )}
          </Section>

          {outgoing.length > 0 && (
            <Section title="Wysłane zaproszenia" count={outgoing.length}>
              <PersonList>
                {outgoing.map(invite => (
                  <PersonRow
                    key={invite.friendshipId}
                    user={invite.user}
                    onProfileClick={onProfileClick}
                    meta={`Wysłano ${timeAgo(invite.since)}`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full"
                      disabled={pendingKey === invite.friendshipId}
                      onClick={() => remove(invite.friendshipId, 'Zaproszenie anulowane')}
                    >
                      {pendingKey === invite.friendshipId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Anuluj'}
                    </Button>
                  </PersonRow>
                ))}
              </PersonList>
            </Section>
          )}

          {others.length > 0 && (
            <Section title="Inni sportowcy" count={others.length}>
              <PersonList>
                {(showAllOthers ? others : others.slice(0, OTHERS_PREVIEW)).map(a => (
                  <PersonRow key={a.userId} user={a} onProfileClick={onProfileClick} meta={<Location athlete={a} />}>
                    <FriendButton athlete={a} />
                  </PersonRow>
                ))}
              </PersonList>
              {!showAllOthers && others.length > OTHERS_PREVIEW && (
                <Button variant="ghost" className="mt-2 w-full rounded-full" onClick={() => setShowAllOthers(true)}>
                  Pokaż wszystkich ({others.length})
                </Button>
              )}
            </Section>
          )}
        </>
      )}

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

/* ---------- Pieces ---------- */

function Section({
  title,
  subtitle,
  count,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline gap-2 px-1">
        <h3 className={accent ? 'text-sm font-bold text-primary' : 'text-sm font-bold'}>{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{count}</span>
        )}
        {subtitle && <span className="ml-auto text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function PersonList({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card shadow-soft">
      {children}
    </ul>
  );
}

function PersonRow({
  user,
  meta,
  onProfileClick,
  children,
}: {
  user: SocialUserSummary;
  meta?: ReactNode;
  onProfileClick: (userId: string) => void;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <button
        type="button"
        disabled={!user.nickname}
        onClick={() => onProfileClick(user.userId)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity enabled:hover:opacity-80"
        aria-label={user.nickname ? `Zobacz profil ${socialName(user)}` : undefined}
      >
        <SocialAvatar user={user} className="h-11 w-11" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{socialName(user)}</p>
          {meta && <div className="truncate text-xs text-muted-foreground">{meta}</div>}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
  );
}

function Location({ athlete }: { athlete: AthleteListItem }) {
  if (!athlete.location && !athlete.sameArea) return null;
  return (
    <span className="flex min-w-0 items-center gap-1">
      <MapPin className="h-3 w-3 shrink-0" />
      <span className="truncate">{athlete.location}</span>
      {athlete.sameArea && <span className="shrink-0 font-semibold text-volt">· blisko</span>}
    </span>
  );
}
