'use client';

import type { ReactNode } from 'react';
import hotToast, { type ToastOptions } from 'react-hot-toast';

/**
 * Compatibility shim.
 *
 * Notifications used to run through a shadcn/radix `useToast()` called as
 * `toast({ title, description, variant })`. They now go through
 * `react-hot-toast`, so every message in the app — errors included — shares one
 * renderer. New code can import `toast` from 'react-hot-toast' directly; this
 * hook stays so the existing call sites keep working unchanged.
 */

type LegacyVariant = 'default' | 'destructive' | (string & {});

export interface LegacyToastInput {
  title?: ReactNode;
  description?: ReactNode;
  variant?: LegacyVariant;
  duration?: number;
  /** Accepted for source compatibility; no longer rendered. */
  action?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const asText = (node: ReactNode): string =>
  typeof node === 'string' || typeof node === 'number' ? String(node) : '';

function body(title: ReactNode, description: ReactNode) {
  const head = asText(title);
  const sub = asText(description);
  if (head && sub) {
    return (
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold leading-snug">{head}</span>
        <span className="text-sm leading-snug opacity-90">{sub}</span>
      </span>
    );
  }
  return head || sub;
}

export function toast({ title, description, variant, duration }: LegacyToastInput) {
  const message = body(title, description);
  const options: ToastOptions = duration != null ? { duration } : {};
  const id =
    variant === 'destructive'
      ? hotToast.error(message, options)
      : hotToast(message, options);

  return {
    id,
    dismiss: () => hotToast.dismiss(id),
    update: ({ title: nextTitle, description: nextDescription }: LegacyToastInput) =>
      hotToast(body(nextTitle ?? title, nextDescription ?? description), { ...options, id }),
  };
}

export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string) => hotToast.dismiss(toastId),
    /** Legacy shape the old radix `<Toaster/>` consumed. */
    toasts: [] as never[],
  };
}
