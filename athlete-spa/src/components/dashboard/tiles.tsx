import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/* ---------- Bento building blocks ---------- */

export const Tile = ({ to, className, children }: { to?: string; className?: string; children: ReactNode }) => {
  const base = 'group relative block overflow-hidden rounded-2xl bg-card p-4 transition-all duration-200';
  if (to) {
    return (
      <Link to={to} className={cn(base, 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lifted active:scale-[0.97]', className)}>
        {children}
      </Link>
    );
  }
  return <div className={cn(base, className)}>{children}</div>;
};

export const TileLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold text-muted-foreground">{children}</p>
);

export const TileValue = ({ value, unit, isLoading }: { value: string | number; unit?: string; isLoading?: boolean }) =>
  isLoading ? (
    <Skeleton className="mt-2 h-8 w-20" />
  ) : (
    <p className="mt-2 font-display text-[1.7rem] font-bold leading-none tabular-nums">
      {value}
      {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
    </p>
  );
