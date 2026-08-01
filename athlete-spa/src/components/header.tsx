import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import { NotificationBell } from './notifications/NotificationBell';
import { QuickChatWidget } from './chat/QuickChatWidget';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { placeholderImages } from '@/lib/placeholder-images';
import { resolveMediaUrl } from '@/lib/api-client';
import { getScreenTitle, isRootPath } from '@/lib/athlete-nav';
import { haptic } from '@/lib/haptics';

function getInitials(name: string | null | undefined) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function AppHeader() {
  const { userProfile } = useUserProfile();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const avatarImage = placeholderImages.find(img => img.id === 'avatar-male');

  // Root screens are reachable from the bottom bar, so they get the identity
  // header. Everywhere else the header has to say where you are and offer a
  // way up — the hardware/gesture back was previously the only exit.
  const isRoot = isRootPath(pathname);
  const screenTitle = getScreenTitle(pathname);

  const goBack = () => {
    haptic('tap');
    // A deep link (notification, shared URL) can land here with no history to
    // pop, which would otherwise leave the button dead.
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/athlete/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/50 bg-background/70 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-2xl md:h-14 md:px-6">
      {/* Mobile: identity on root screens, back + title everywhere else */}
      {isRoot ? (
        <Link
          to="/athlete/profile"
          aria-label="Przejdź do profilu"
          className="pressable flex min-w-0 items-center gap-3 text-left transition-opacity active:opacity-70 md:hidden"
        >
          <span className="relative shrink-0">
            <Avatar className="h-10 w-10 ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
              {userProfile?.avatarUrl ? (
                <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="Awatar użytkownika" />
              ) : avatarImage ? (
                <AvatarImage src={avatarImage.imageUrl} alt="Awatar użytkownika" />
              ) : null}
              <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-volt ring-2 ring-background" />
          </span>
          <span className="flex min-w-0 flex-col">
            #leniwakluska
          </span>
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={goBack}
            aria-label="Wstecz"
            className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground transition-colors active:scale-90 active:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {screenTitle && (
            <h1 className="min-w-0 truncate font-headline text-lg font-bold tracking-tight">
              {screenTitle}
            </h1>
          )}
        </div>
      )}

      {/* Desktop: classic sidebar trigger */}
      <SidebarTrigger className="hidden text-muted-foreground hover:text-foreground md:flex" />

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <QuickChatWidget />
      </div>
    </header>
  );
}
