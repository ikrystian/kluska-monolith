import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Section heading used across screens: quiet title, optional way into the full screen. */
export function SectionHeader({ title, href, linkLabel = 'Wszystko', action }: { title: string; href?: string; linkLabel?: string; action?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-6 items-center justify-between gap-3 px-1">
      <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
      {action}
      {href && !action && (
        <Link to={href} className="-my-2 flex shrink-0 items-center gap-0.5 py-2 text-sm font-medium text-muted-foreground active:text-foreground">
          {linkLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/** What a screen says when there is nothing to show yet, and the one next step. */
export function EmptyState({ icon: Icon, title, description, action, className }: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-card p-6 text-center', className)}>
      {Icon && (
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-[17rem] text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Tall condensed value with a small unit. */
export function BigNumber({ value, unit, className }: { value: ReactNode; unit?: string; className?: string }) {
  return (
    <span className={cn('font-display font-bold leading-none tabular-nums', className)}>
      {value}
      {unit && <span className="ml-1 font-body text-[0.45em] font-semibold text-muted-foreground">{unit}</span>}
    </span>
  );
}
