import { forwardRef, useId, type ComponentProps, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Dumbbell, Eye, EyeOff, Salad, Users, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageTransition } from '@/components/motion';
import { cn } from '@/lib/utils';
import gymPhoto from '@/assets/auth-gym.jpg';
import logoMark from '@/assets/logo-mark.png';

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Dumbbell, title: 'Treningi', text: 'Plany, serie i progres w jednym miejscu' },
  { icon: Activity, title: 'Bieganie', text: 'Śledzenie tras GPS i tempa na żywo' },
  { icon: Salad, title: 'Dieta', text: 'Makro i nawyki bez liczenia w głowie' },
  { icon: Users, title: 'Społeczność', text: 'Znajomi, rywalizacja i motywacja' },
];

/** Gym photo with a dark scrim + ember tint so white text stays legible. */
function GymBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      <img src={gymPhoto} alt="" className="h-full w-full object-cover" decoding="async" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/45 via-transparent to-transparent mix-blend-multiply" />
    </div>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="grid place-items-center gap-3">
      {/* Same dark tile as the launcher icon (assets/logo.png), so the mark
          reads as the app's icon rather than a loose illustration. */}
      <span
        className={cn(
          'grid h-36 w-36 shrink-0 place-items-center rounded-2xl bg-[#191814] p-1.5',
          light ? 'ring-1 ring-white/20' : 'shadow-soft',
        )}
      >
        <img src={logoMark} alt="" className="h-full w-full object-contain" decoding="async" />
      </span>
      <div>
        <h2 className="font-display text-xl text-center font-extrabold uppercase leading-[1.02] tracking-tight text-white">
          #leniwakluska
          <span className="block text-gradient-ember">Wracaj częściej.</span>
        </h2>
      </div>
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
        'flex-1 rounded-full py-2.5 text-center text-sm font-bold transition-colors',
        active === key
          ? 'bg-background text-foreground shadow-soft'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex rounded-full bg-muted p-1" aria-label="Logowanie lub rejestracja">
      {tab('/login', 'login', 'Logowanie')}
      {tab('/register', 'register', 'Rejestracja')}
    </nav>
  );
}

interface AuthShellProps {
  mode: 'login' | 'register';
  /** Big display headline; the `accent` part renders with the ember gradient. */
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
    <div className="relative min-h-[100svh] bg-background lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Desktop hero panel */}
      <aside className="relative hidden overflow-hidden bg-black lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <GymBackdrop />

        <div className="relative">
          <Brand light />
        </div>

        <div className="relative max-w-lg">

          <ul className="mt-10 grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, title: featureTitle, text }) => (
              <li key={featureTitle} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-white" />
                <p className="mt-3 text-sm font-bold text-white">{featureTitle}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/75">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">Lightweight, baby! 🏋️</p>
      </aside>

      {/* Form column */}
      <main className="relative flex min-h-[100svh] flex-col overflow-hidden">
        {/* Mobile ember header */}
        <div className="relative overflow-hidden rounded-b-[2.5rem] bg-black px-5 pb-20 pt-[calc(1.75rem+env(safe-area-inset-top))] lg:hidden">
          <GymBackdrop />
          <div className="relative mx-auto max-w-md">
            <Brand light />

          </div>
        </div>

        {/* Desktop aurora */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
          <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-[110px]" />
          <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[hsl(var(--volt)/0.08)] blur-[120px]" />
        </div>

        <PageTransition className="relative mx-auto -mt-12 flex w-full max-w-md flex-1 flex-col px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:mt-0 lg:justify-center lg:px-8 lg:py-12">
          <div className="stagger-rise rounded-[2rem] border border-border/70 bg-card p-5 shadow-lifted sm:p-7 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            {!hideTabs && <AuthTabs active={mode} />}

            <div className={cn(!hideTabs && 'mt-6')}>
              <h1 className="hidden font-display text-4xl font-extrabold uppercase leading-[1.05] tracking-tight lg:block">
                {title}
                <br />
                <span className="text-gradient-ember">{accent}</span>
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground lg:mt-3">{subtitle}</p>
            </div>

            <div className="mt-6">{children}</div>
          </div>

          {footer && <div className="mt-6">{footer}</div>}
        </PageTransition>
      </main>
    </div>
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
        <Label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
              'h-[3.25rem] rounded-2xl bg-background pl-11 text-base',
              trailing && 'pr-12',
              error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25',
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
      className="grid h-full w-12 place-items-center rounded-r-2xl text-muted-foreground transition-colors hover:text-foreground active:scale-90"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
