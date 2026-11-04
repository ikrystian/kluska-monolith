import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, House, Plus, Users, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QuickAddSheet } from '@/components/quick-add-sheet';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { resolveMediaUrl } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

function TabLink({ href, label, icon: Icon, isActive, children }: { href: string; label: string; icon?: LucideIcon; isActive: boolean; children?: React.ReactNode }) {
  return (
    <Link
      to={href}
      onClick={() => haptic('tap')}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex h-full flex-col items-center justify-center gap-1 transition-colors active:opacity-70',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {isActive && (
        <motion.span
          layoutId="tab-indicator"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-primary"
        />
      )}
      {Icon ? <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} /> : children}
      <span className={cn('text-[11px] leading-none', isActive ? 'font-semibold' : 'font-medium')}>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const { pathname, search } = useLocation();
  const { userProfile } = useUserProfile();
  const [addOpen, setAddOpen] = useState(false);

  // During an active workout session (/athlete/log?logId=...) the nav is
  // hidden so it doesn't cover the workout controls.
  const isActiveWorkoutSession = pathname === '/athlete/log' && new URLSearchParams(search).has('logId');
  if (isActiveWorkoutSession) {
    return null;
  }

  const youActive = pathname === '/athlete/you' || pathname === '/athlete/profile';

  return (
    <>
      <nav
        id="bottom-nav"
        className="app-column fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <div className="grid h-[var(--tabbar-h)] grid-cols-5">
          <TabLink href="/athlete/dashboard" label="Dziś" icon={House} isActive={pathname === '/athlete/dashboard'} />
          <TabLink href="/athlete/log" label="Trening" icon={Dumbbell} isActive={pathname.startsWith('/athlete/log')} />

          {/* Quick add sits on the bar like a plate on the sleeve. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                haptic('impact');
                setAddOpen(true);
              }}
              aria-label="Dodaj"
              aria-expanded={addOpen}
              className="absolute left-1/2 top-0 grid h-[3.25rem] w-[3.25rem] -translate-x-1/2 -translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-background transition-transform active:scale-90"
            >
              <span aria-hidden className="absolute inset-[5px] rounded-full border border-black/15 dark:border-black/20" />
              <Plus className={cn('h-6 w-6 transition-transform duration-200', addOpen && 'rotate-45')} strokeWidth={2.6} />
            </button>
          </div>

          <TabLink href="/athlete/social" label="Ekipa" icon={Users} isActive={pathname.startsWith('/athlete/social')} />
          <TabLink href="/athlete/you" label="Ty" isActive={youActive}>
            <Avatar className={cn('h-[22px] w-[22px]', youActive && 'ring-2 ring-foreground ring-offset-1 ring-offset-background')}>
              {userProfile?.avatarUrl && <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="" />}
              <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                {userProfile?.name?.[0]?.toUpperCase() ?? 'T'}
              </AvatarFallback>
            </Avatar>
          </TabLink>
        </div>
      </nav>

      <QuickAddSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
