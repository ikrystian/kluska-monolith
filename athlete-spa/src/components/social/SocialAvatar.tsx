import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveMediaUrl } from '@/lib/api-client';
import { resolveStoredImageUrl } from '@/lib/upload';
import { cn } from '@/lib/utils';
import type { SocialUserSummary } from '@/lib/friends';

export function SocialAvatar({ user, className }: { user?: Partial<SocialUserSummary> | null; className?: string }) {
  if (!user) {
    return (
      <Avatar className={cn('h-10 w-10', className)}>
        <AvatarFallback className="bg-secondary font-semibold text-primary">?</AvatarFallback>
      </Avatar>
    );
  }
  const src = user.avatarUrl ? resolveMediaUrl(resolveStoredImageUrl(user.avatarUrl)) : undefined;
  const name = user.displayName || user.nickname || 'Zawodnik';
  return (
    <Avatar className={cn('h-10 w-10', className)}>
      {src && <AvatarImage src={src} alt={name} className="object-cover" />}
      <AvatarFallback className="bg-secondary font-semibold text-primary">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

/** "@nick" for users with a social profile, plain first name otherwise. */
export function socialName(user?: Partial<SocialUserSummary> | null): string {
  if (!user) return 'Zawodnik';
  return user.nickname ? `@${user.nickname}` : (user.displayName || 'Zawodnik');
}
