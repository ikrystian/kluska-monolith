import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** iOS-style grouped list: small caps heading above a rounded card of rows. */
export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card shadow-soft">
        {children}
      </div>
      {footer && <p className="mt-2 px-4 text-xs leading-relaxed text-muted-foreground">{footer}</p>}
    </section>
  );
}

function RowIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
      style={{ backgroundColor: tint(color, 15), color }}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

interface RowBaseProps {
  icon: LucideIcon;
  color: string;
  title: string;
  description?: ReactNode;
}

/** Row with a trailing control (switch, button, status). */
export function SettingsRow({
  icon,
  color,
  title,
  description,
  htmlFor,
  control,
  disabled,
}: RowBaseProps & { htmlFor?: string; control: ReactNode; disabled?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3.5', disabled && 'opacity-60')}>
      <RowIcon icon={icon} color={color} />
      <div className="min-w-0 flex-1">
        <Label htmlFor={htmlFor} className="block cursor-pointer text-sm font-semibold leading-snug">
          {title}
        </Label>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** Tappable row that navigates (`to`) or opens something (`onClick`). */
export function SettingsLinkRow({
  icon,
  color,
  title,
  description,
  value,
  to,
  onClick,
}: RowBaseProps & { value?: ReactNode; to?: string; onClick?: () => void }) {
  const content = (
    <>
      <RowIcon icon={icon} color={color} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>}
      </div>
      {value !== undefined && <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{value}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
    </>
  );
  const className =
    'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:bg-secondary';

  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
