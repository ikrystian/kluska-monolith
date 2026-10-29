import type { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Round avatar with an initial on the ember gradient when there is no photo. */
export function TrainerAvatar({ trainer, className }: { trainer: Pick<UserProfile, 'name' | 'avatarUrl'>; className?: string }) {
  return (
    <span className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary', className)}>
      {trainer.avatarUrl ? (
        <img src={trainer.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="hero-ember absolute inset-0 grid place-items-center font-display text-[1.6em] font-extrabold uppercase text-white">
          {trainer.name?.charAt(0) ?? '?'}
        </span>
      )}
    </span>
  );
}
