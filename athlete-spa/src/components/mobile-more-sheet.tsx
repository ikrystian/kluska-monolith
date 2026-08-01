import { Link, useNavigate } from 'react-router-dom';
import { Clock, LogOut, Settings2, TriangleAlert } from 'lucide-react';
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
import { athleteNavItems, athleteNavLeaves, isNavGroup, type NavLeaf } from '@/lib/athlete-nav';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';
import { haptic } from '@/lib/haptics';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function getInitials(name: string | null | undefined) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

/** Reachable from the bottom bar already — listing it again is noise. */
const BOTTOM_NAV_HREFS = new Set(['/athlete/dashboard']);

/**
 * Named groups keep their heading; the loose top-level links (Check-in, Strefa
 * Wiedzy, Mapa) collapse into a single trailing section rather than one
 * heading each.
 */
const sections: { label: string; items: NavLeaf[] }[] = [
  ...athleteNavItems.filter(isNavGroup).map(group => ({ label: group.label, items: group.items })),
  {
    label: 'Inne',
    items: athleteNavItems
      .filter((entry): entry is NavLeaf => !isNavGroup(entry))
      .filter(leaf => !BOTTOM_NAV_HREFS.has(leaf.href)),
  },
].filter(section => section.items.length > 0);

/** Square tap target — icon over label, sized for a thumb rather than a cursor. */
function NavTile({ leaf, onNavigate }: { leaf: NavLeaf; onNavigate: () => void }) {
  const Icon = leaf.icon;
  return (
    <Link
      to={leaf.href}
      onClick={onNavigate}
      className="pressable flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 text-center shadow-soft transition-all active:scale-[0.96]"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-semibold leading-tight">{leaf.label}</span>
    </Link>
  );
}

/**
 * Mobile replacement for the desktop sidebar.
 *
 * The sidebar is a cursor-oriented tree of collapsible groups: on a phone it
 * buried every screen outside the bottom bar behind two or three taps. This
 * presents the same destinations as a flat grid of thumb-sized tiles, grouped
 * by section, with the athlete's most recent screens pinned on top.
 */
export function MobileMoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { userProfile } = useUserProfile();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const recentRoutes = useRecentRoutes();
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);

  const avatarImage = placeholderImages.find(img => img.id === 'avatar-male');
  const close = () => onOpenChange(false);

  const recentLeaves = recentRoutes
    .map(href => athleteNavLeaves.find(leaf => leaf.href === href))
    .filter((leaf): leaf is NavLeaf => Boolean(leaf));

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
          <div className="mb-5 flex items-center gap-3">
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

          {recentLeaves.length > 0 && (
            <section className="mb-5">
              <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <Clock className="h-3 w-3" /> Ostatnio używane
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {recentLeaves.map(leaf => (
                  <NavTile key={leaf.href} leaf={leaf} onNavigate={close} />
                ))}
              </div>
            </section>
          )}

          {sections.map((section, index) => (
            <section key={section.label} className={cn(index > 0 && 'mt-5')}>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {section.label}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {section.items.map(leaf => (
                  <NavTile key={leaf.href} leaf={leaf} onNavigate={close} />
                ))}
              </div>
            </section>
          ))}
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
