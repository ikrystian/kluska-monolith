import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, LogOut, Search, Settings2, TriangleAlert, X } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl } from '@/lib/api-client';
import { placeholderImages } from '@/lib/placeholder-images';
import {
  athleteNavItems,
  athleteNavLeaves,
  findNavGroup,
  isNavGroup,
  isNavLeafActive,
  searchNavLeaves,
  type NavLeaf,
} from '@/lib/athlete-nav';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';
import { haptic } from '@/lib/haptics';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function getInitials(name: string | null | undefined) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

const groups = athleteNavItems.filter(isNavGroup);

const NEUTRAL = 'hsl(var(--muted-foreground))';
const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Icon chip tinted with the colour of the group the destination belongs to. */
function LeafIcon({ leaf, size = 'md' }: { leaf: NavLeaf; size?: 'sm' | 'md' }) {
  const Icon = leaf.icon;
  const color = findNavGroup(leaf.href)?.color ?? NEUTRAL;
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-xl', size === 'md' ? 'h-10 w-10' : 'h-8 w-8 rounded-lg')}
      style={{ backgroundColor: tint(color, 16), color }}
    >
      <Icon className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} />
    </span>
  );
}

/** Two-up tile inside a group card: icon chip + label, the current screen outlined. */
function NavTile({ leaf, isActive, onNavigate }: { leaf: NavLeaf; isActive: boolean; onNavigate: () => void }) {
  const color = findNavGroup(leaf.href)?.color ?? NEUTRAL;
  return (
    <Link
      to={leaf.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'pressable flex min-w-0 items-center gap-2.5 rounded-2xl p-2 transition-all active:scale-[0.97]',
        isActive ? 'bg-secondary' : 'active:bg-secondary/70'
      )}
      style={isActive ? { boxShadow: `inset 0 0 0 2px ${tint(color, 55)}` } : undefined}
    >
      <LeafIcon leaf={leaf} />
      <span className="min-w-0 text-[13px] font-semibold leading-tight">{leaf.label}</span>
    </Link>
  );
}

/** Full-width search hit: icon, label, description and the group it lives in. */
function SearchResult({ leaf, onNavigate }: { leaf: NavLeaf; onNavigate: () => void }) {
  const group = findNavGroup(leaf.href);
  return (
    <Link
      to={leaf.href}
      onClick={onNavigate}
      className="pressable flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-2.5 shadow-soft active:scale-[0.98]"
    >
      <LeafIcon leaf={leaf} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{leaf.label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {group ? `${group.label} · ` : ''}
          {leaf.description}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/**
 * Mobile replacement for the desktop sidebar.
 *
 * Every destination is one tap away, organised as colour-coded group cards so
 * sections read apart at a glance. A search field on top finds a screen by
 * name, purpose or synonym, and the athlete's recent screens sit above the
 * groups as quick shortcuts.
 */
export function MobileMoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { userProfile } = useUserProfile();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const recentRoutes = useRecentRoutes();
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Every opening starts from the full menu, not the last search.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const avatarImage = placeholderImages.find(img => img.id === 'avatar-male');
  const close = () => onOpenChange(false);

  const recentLeaves = recentRoutes
    .map(href => athleteNavLeaves.find(leaf => leaf.href === href))
    .filter((leaf): leaf is NavLeaf => Boolean(leaf));

  const results = query.trim() ? searchNavLeaves(query) : null;

  const handleLogout = () => {
    haptic('impact');
    if (user?.isGuest) {
      setGuestLogoutOpen(true);
      return;
    }
    close();
    logout();
    navigate('/login');
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-[2rem] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Wszystkie sekcje aplikacji</SheetDescription>
          </SheetHeader>

          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-foreground/15" aria-hidden />

          {/* Identity + settings */}
          <div className="mb-4 flex items-center gap-3">
            <Link to="/athlete/profile" onClick={close} className="pressable flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                {userProfile?.avatarUrl ? (
                  <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="" />
                ) : avatarImage ? (
                  <AvatarImage src={avatarImage.imageUrl} alt="" />
                ) : null}
                <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-headline font-bold">{userProfile?.name || 'Użytkownik'}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Settings2 className="h-3 w-3" /> Profil i ustawienia
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Wyloguj"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border/60 text-muted-foreground transition-colors active:scale-95 active:bg-destructive/10 active:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Szukaj, np. waga, strava, posiłki…"
              aria-label="Szukaj w menu"
              enterKeyHint="go"
              onKeyDown={e => {
                if (e.key === 'Enter' && results?.[0]) {
                  close();
                  navigate(results[0].href);
                }
              }}
              className="h-11 w-full rounded-2xl border border-border/60 bg-secondary/60 pl-10 pr-10 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Wyczyść wyszukiwanie"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground active:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {results ? (
            /* Search results */
            <section aria-live="polite">
              {results.length > 0 ? (
                <div className="space-y-2">
                  {results.map(leaf => (
                    <SearchResult key={leaf.href} leaf={leaf} onNavigate={close} />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nic nie znaleziono dla „{query.trim()}”.
                </p>
              )}
            </section>
          ) : (
            <>
              {recentLeaves.length > 0 && (
                <section className="mb-5">
                  <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    <Clock className="h-3 w-3" /> Ostatnio używane
                  </h3>
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                    {recentLeaves.map(leaf => (
                      <Link
                        key={leaf.href}
                        to={leaf.href}
                        onClick={close}
                        className="pressable flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card py-1 pl-1 pr-3.5 shadow-soft active:scale-[0.96]"
                      >
                        <LeafIcon leaf={leaf} size="sm" />
                        <span className="text-[13px] font-semibold">{leaf.label}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div className="space-y-3">
                {groups.map(group => {
                  const GroupIcon = group.icon;
                  return (
                    <section
                      key={group.label}
                      aria-labelledby={`menu-group-${group.label}`}
                      className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft"
                    >
                      <h3
                        id={`menu-group-${group.label}`}
                        className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5"
                        style={{ backgroundColor: tint(group.color, 8) }}
                      >
                        <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
                        <span className="font-headline text-sm font-bold tracking-tight">{group.label}</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-1 p-2">
                        {group.items.map(leaf => (
                          <NavTile
                            key={leaf.href}
                            leaf={leaf}
                            isActive={isNavLeafActive(leaf.href, pathname, search)}
                            onNavigate={close}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={guestLogoutOpen} onOpenChange={setGuestLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-destructive" />
              Utrata danych lokalnych
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-1">
              <span className="block">
                Korzystasz z aplikacji jako <strong>gość</strong> — Twoje dane są przechowywane
                wyłącznie lokalnie na tym urządzeniu.
              </span>
              <span className="block">
                Po wylogowaniu <strong>wszystkie Twoje dane zostaną trwale usunięte</strong> i nie
                będzie możliwości ich przywrócenia.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                close();
                logout();
                navigate('/login');
              }}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Rozumiem, wyloguj mnie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
