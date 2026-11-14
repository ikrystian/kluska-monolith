import type { CSSProperties, ReactNode } from 'react';
import { Bell, Check, Dumbbell, House, LayoutGrid, MessageCircle, Plus, Settings, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react';

export const vars = (v: Record<string, string | number>) => v as CSSProperties;

const TABS: [string, LucideIcon][] = [
  ['Dziś', House],
  ['Trening', Dumbbell],
  ['Dieta', UtensilsCrossed],
  ['', Plus],
  ['Ekipa', Users],
  ['Menu', LayoutGrid],
];

/* The app's bottom bar, as it sits under every screen. Decorative. */
function AppTabs({ active }: { active: string }) {
  return (
    <div aria-hidden className="grid grid-cols-6 border-t border-rule bg-paper/80 px-1">
      {TABS.map(([label, Icon]) =>
        label ? (
          <span key={label} className={`relative flex flex-col items-center gap-1 pb-2.5 pt-3 ${label === active ? 'text-ink' : 'text-ink-3'}`}>
            {label === active && <span className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-volt" />}
            <Icon className="size-[18px]" strokeWidth={label === active ? 2.4 : 2} />
            <span className="text-[0.625rem] font-semibold leading-none">{label}</span>
          </span>
        ) : (
          <span key="add" className="grid place-items-center">
            <span className="grid size-10 -translate-y-2 place-items-center rounded-full bg-accent text-on-accent shadow-[0_6px_18px_-6px_var(--color-accent)]">
              <Icon className="size-5" strokeWidth={2.6} />
            </span>
          </span>
        ),
      )}
    </div>
  );
}

/* One screen of the app: its #TITLE header, the content, the tab bar. No device frame. */
export function Phone({
  title,
  tab,
  children,
  className = '',
  label,
}: {
  title: string;
  tab?: string;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div role="img" aria-label={label} className={`screen screen-phone ${className}`}>
      <div aria-hidden>
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <p className="hash font-display text-[1.375rem] font-extrabold uppercase leading-none tracking-[0.01em]">{title}</p>
          <div className="flex gap-3.5 text-ink-2">
            <Bell className="size-[17px]" />
            <MessageCircle className="size-[17px]" />
            <Settings className="size-[17px]" />
          </div>
        </div>
        <div className="space-y-2.5 px-3 pb-3">{children}</div>
        {tab && <AppTabs active={tab} />}
      </div>
    </div>
  );
}

export function Tick({ on, className = 'size-5' }: { on: boolean; className?: string }) {
  return on ? (
    <span key="on" className={`land grid shrink-0 place-items-center rounded-full bg-volt text-on-volt ${className}`}>
      <Check className="size-[62%]" strokeWidth={3.5} />
    </span>
  ) : (
    <span className={`shrink-0 rounded-full border-[1.5px] border-rule-strong ${className}`} />
  );
}

export function Bar({ value, tone = 'var(--color-volt)', className = 'h-1.5' }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full bg-paper-3 ${className}`}>
      <div className="bar-fill h-full rounded-full" style={{ background: tone, transform: `scaleX(${Math.max(0, Math.min(1, value))})` }} />
    </div>
  );
}

export function Ring({
  value,
  size = 44,
  stroke = 4,
  tone = 'var(--color-volt)',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-paper-3)" strokeWidth={stroke} />
        <circle
          className="ring-live"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - Math.max(0, Math.min(1, value)))}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

export const nf = (n: number, digits = 0) => n.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/* A real screenshot of the app in a phone. */
export function Device({ shot, alt, className = '', eager = false }: { shot: string; alt: string; className?: string; eager?: boolean }) {
  return (
    <figure className={`device ${className}`}>
      <img src={`/screens/${shot}.webp`} alt={alt} width={540} height={960} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </figure>
  );
}
