import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, LogOut, Search, TriangleAlert, X } from 'lucide-react';
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
  type NavGroup,
  type NavLeaf,
} from '@/lib/athlete-nav';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';
import { haptic } from '@/lib/haptics';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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

function screensLabel(n: number) {
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (n === 1) return '1 ekran';
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} ekrany`;
  return `${n} ekranów`;
}

/**
 * Big section card on the menu's first level — bold uppercase title over a
 * tinted panel with an oversized watermark icon, so six sections read as six
 * distinct places instead of one wall of identical tiles.
 */
function GroupCard({ group, isCurrent, onOpen }: { group: NavGroup; isCurrent: boolean; onOpen: () => void }) {
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pressable relative flex h-[7.5rem] flex-col justify-between overflow-hidden rounded-3xl p-3.5 text-left transition-transform active:scale-[0.97]"
      style={{
        background: `linear-gradient(150deg, ${tint(group.color, 30)}, ${tint(group.color, 8)})`,
        boxShadow: `inset 0 0 0 1px ${tint(group.color, 28)}`,
      }}
    >
      <Icon aria-hidden className="absolute -bottom-4 -right-4 h-24 w-24 opacity-[0.16]" style={{ color: group.color }} strokeWidth={1.5} />
      <span className="flex items-start justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-soft" style={{ backgroundColor: group.color }}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {isCurrent && (
          <span className="rounded-full bg-background/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground">
            Tu jesteś
          </span>
        )}
      </span>
      <span className="relative">
        <span className="block font-display text-[15px] font-extrabold uppercase leading-tight tracking-tight">{group.label}</span>
        <span className="block text-[11px] font-medium text-muted-foreground">{screensLabel(group.items.length)}</span>
      </span>
    </button>
  );
}

/** One screen in an opened section: icon, name, what it is for. */
function GroupRow({ leaf, isActive, onNavigate }: { leaf: NavLeaf; isActive: boolean; onNavigate: () => void }) {
  return (
    <Link
      to={leaf.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn('flex items-center gap-3.5 px-3.5 py-3 transition-colors active:bg-secondary/70', isActive && 'bg-secondary/80')}
    >
      <LeafIcon leaf={leaf} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{leaf.label}</span>
        {leaf.description && <span className="block truncate text-xs text-muted-foreground">{leaf.description}</span>}
      </span>
      {isActive ? (
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Tu jesteś</span>
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      )}
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
 * Two levels, modelled on bold fitness-app menus: the first shows only the six
 * sections as big cards (plus search and recent screens as shortcuts), and
 * opening one lists its screens with a line on what each is for. Seeing six
 * clear places instead of ~25 identical tiles is what makes it scannable.
 */
export function MobileMoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { userProfile } = useUserProfile();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const recentRoutes = useRecentRoutes();
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // Every opening starts from the section overview, not the last search or section.
  useEffect(() => {
    if (open) {
      setQuery('');
      setOpenGroup(null);
    }
  }, [open]);

  const currentGroup = groups.find(group => group.items.some(leaf => isNavLeafActive(leaf.href, pathname, search)));
  const activeGroup = groups.find(group => group.label === openGroup) ?? null;
  const slide = (dir: 1 | -1) =>
    reduceMotion
      ? {}
      : { initial: { opacity: 0, x: 24 * dir }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 * dir }, transition: { duration: 0.18 } };

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
          className="h-[90vh] overflow-y-auto overflow-x-hidden rounded-t-[2rem] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Wszystkie sekcje aplikacji</SheetDescription>
          </SheetHeader>

          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-foreground/15" aria-hidden />

          <AnimatePresence mode="wait" initial={false}>
            {activeGroup ? (
              /* Second level: one section's screens */
              <motion.div key={activeGroup.label} {...slide(1)}>
                <div className="mb-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenGroup(null)}
                    aria-label="Wróć do sekcji"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/60 active:scale-95 active:bg-secondary"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-extrabold uppercase leading-none tracking-tight">{activeGroup.label}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{screensLabel(activeGroup.items.length)}</p>
                  </div>
                </div>
                <div className="mb-3 h-1 w-12 rounded-full" style={{ backgroundColor: activeGroup.color }} aria-hidden />
                <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
                  {activeGroup.items.map(leaf => (
                    <GroupRow
                      key={leaf.href}
                      leaf={leaf}
                      isActive={isNavLeafActive(leaf.href, pathname, search)}
                      onNavigate={close}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              /* First level: profile, search, recent, sections */
              <motion.div key="overview" {...slide(-1)}>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <h2 className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight">Menu</h2>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground transition-colors active:scale-95 active:bg-destructive/10 active:text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Wyloguj
                  </button>
                </div>

                {/* Profile */}
                <Link
                  to="/athlete/profile"
                  onClick={close}
                  className="pressable mb-4 flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-3 shadow-soft active:scale-[0.98]"
                >
                  <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                    {userProfile?.avatarUrl ? (
                      <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="" />
                    ) : avatarImage ? (
                      <AvatarImage src={avatarImage.imageUrl} alt="" />
                    ) : null}
                    <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-headline font-bold">{userProfile?.name || 'Użytkownik'}</span>
                    <span className="block text-xs text-muted-foreground">Profil i ustawienia</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                </Link>

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

                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Sekcje</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {groups.map(group => (
                        <GroupCard
                          key={group.label}
                          group={group}
                          isCurrent={group === currentGroup}
                          onOpen={() => {
                            haptic('tap');
                            setOpenGroup(group.label);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
