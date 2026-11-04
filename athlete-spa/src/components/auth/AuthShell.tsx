import { forwardRef, useId, type ComponentProps, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageTransition } from '@/components/motion';
import { cn } from '@/lib/utils';
import gymPhoto from '@/assets/auth-gym.jpg';
import logoMark from '@/assets/logo-mark.png';

/** Gym photo under a dark scrim that fades into the page, so white text stays legible. */
function GymBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      <img src={gymPhoto} alt="" className="h-full w-full object-cover" decoding="async" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
    </div>
  );
}

function Brand({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary">#leniwakluska</p>
        <h2 className="mt-0.5 font-display text-[3.5rem] font-bold uppercase leading-[0.92] text-white">
          {title}
          <br />
          {accent}
        </h2>
      </div>
      {/* Same dark tile as the launcher icon (assets/logo.png), so the mark
          reads as the app's icon rather than a loose illustration. */}
      <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[#191814] p-1 ring-1 ring-white/15">
        <img src={logoMark} alt="" className="h-full w-full object-contain" decoding="async" />
      </span>
    </div>
  );
}

/** Segmented switch between the two auth routes. */
function AuthTabs({ active }: { active: 'login' | 'register' }) {
  const tab = (to: string, key: 'login' | 'register', label: string) => (
    <Link
      to={to}
      replace
      aria-current={active === key ? 'page' : undefined}
      className={cn(
        'flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors',
        active === key ? 'bg-background text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex rounded-xl bg-secondary p-1" aria-label="Logowanie lub rejestracja">
      {tab('/login', 'login', 'Logowanie')}
      {tab('/register', 'register', 'Rejestracja')}
    </nav>
  );
}

interface AuthShellProps {
  mode: 'login' | 'register';
  /** Two-line poster headline over the gym photo. */
  title: string;
  accent: string;
  subtitle: string;
  /** Hide the login/register switch (e.g. guest upgrading their account). */
  hideTabs?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ mode, title, accent, subtitle, hideTabs, children, footer }: AuthShellProps) {
  return (
    <main className="relative flex min-h-[100svh] flex-col bg-background">
      <div className="relative px-4 pb-6 pt-[calc(4.5rem+env(safe-area-inset-top))]">
        <GymBackdrop />
        <div className="app-column relative">
          <Brand title={title} accent={accent} />
        </div>
      </div>

      <PageTransition className="app-column relative flex flex-1 flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="stagger-rise">
          {!hideTabs && <AuthTabs active={mode} />}
          {subtitle && <p className={cn('text-sm leading-relaxed text-muted-foreground', !hideTabs && 'mt-4')}>{subtitle}</p>}
          <div className="mt-4">{children}</div>
        </div>

        {footer && <div className="mt-4">{footer}</div>}
      </PageTransition>
    </main>
  );
}

interface AuthFieldProps extends ComponentProps<'input'> {
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: ReactNode;
  /** Element rendered inside the input on the right (e.g. visibility toggle). */
  trailing?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon: Icon, error, hint, trailing, id, className, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const messageId = `${inputId}-msg`;

    return (
      <div className="grid gap-2">
        <Label htmlFor={inputId} className="sr-only">
          {label}
        </Label>
        <div className="group relative">
          <Icon
            aria-hidden
            className={cn(
              'pointer-events-none absolute left-4 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 transition-colors',
              error ? 'text-destructive' : 'text-muted-foreground group-focus-within:text-primary',
            )}
          />
          <Input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error || hint ? messageId : undefined}
            className={cn(
              'h-[3.25rem] pl-11 text-base',
              trailing && 'pr-12',
              error && 'border-destructive focus-visible:border-destructive',
              className,
            )}
            {...props}
          />
          {trailing && <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div>}
        </div>
        {(error || hint) && (
          <div id={messageId} className={cn('text-xs', error ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {error ?? hint}
          </div>
        )}
      </div>
    );
  },
);
AuthField.displayName = 'AuthField';

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
      aria-pressed={visible}
      className="grid h-full w-12 place-items-center rounded-r-xl text-muted-foreground transition-transform active:scale-90"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
