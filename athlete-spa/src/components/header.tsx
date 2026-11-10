import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings } from 'lucide-react';
import { NotificationBell } from './notifications/NotificationBell';
import { QuickChatWidget } from './chat/QuickChatWidget';
import { useHeaderTitle } from '@/contexts/HeaderTitleContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getScreenTitle, isRootPath, keepsChromeVisible } from '@/lib/athlete-nav';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const { pathname, search, state } = useLocation();
  const navigate = useNavigate();
  const { customTitle } = useHeaderTitle();
  const { userProfile } = useUserProfile();

  const isSettingsTab = pathname === '/athlete/you' && new URLSearchParams(search).get('tab') === 'settings';
  // Root screens are reachable from the bottom bar, so they get a big title.
  // Everywhere else the header has to say where you are and offer a way up.
  const isRoot = isRootPath(pathname) && !isSettingsTab;
  const stateTitle = (state as { title?: string } | null)?.title;
  const screenTitle = customTitle ?? stateTitle ?? getScreenTitle(pathname, search, userProfile?.name);
  const isToday = pathname === '/athlete/dashboard';

  // On the exercise library, keep the header pinned while scrolling (infinite
  // list) — other screens tuck it away to reclaim reading space.
  const keepHeaderVisible = keepsChromeVisible(pathname);

  const goBack = () => {
    haptic('tap');
    // A deep link (notification, shared URL) can land here with no history to
    // pop, which would otherwise leave the button dead.
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else if (isSettingsTab) {
      navigate('/athlete/you');
    } else {
      navigate('/athlete/dashboard');
    }
  };

  // One header for every athlete screen: same height, title style and right-hand
  // actions. Only the leading slot changes — a back button on subpages, nothing
  // on the root screens the bottom bar reaches.
  return (
    <header
      className={cn(
        'app-column fixed inset-x-0 top-0 z-30 h-[var(--app-top)] bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-transform duration-300 ease-out',
        !keepHeaderVisible && 'group-data-[chrome=hidden]/chrome:-translate-y-full'
      )}
    >
      <div className="flex h-[var(--header-h)] items-center gap-1 pl-2 pr-2">
        {!isRoot && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Wstecz"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-foreground transition-transform active:scale-90 active:bg-secondary"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <h1 className={cn('flex min-w-0 flex-1 items-baseline gap-2', isRoot && 'pl-2')}>
          {screenTitle && (
            <span className="truncate font-display text-[1.75rem] font-bold uppercase leading-none">
              <span><span className="text-volt">#</span>{screenTitle}</span>
            </span>
          )}
        </h1>

        <div data-tour="header-actions" className="flex shrink-0 items-center">
          <NotificationBell />
          <QuickChatWidget />
          <Link
            to={isSettingsTab ? '/athlete/you' : '/athlete/you?tab=settings'}
            onClick={() => haptic('tap')}
            aria-label={isSettingsTab ? 'Wróć do profilu' : 'Ustawienia'}
            className={cn(
              'relative grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90 active:bg-secondary',
              isSettingsTab ? 'text-primary bg-secondary' : 'text-foreground'
            )}
          >
            <Settings className="h-[22px] w-[22px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
