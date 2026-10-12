import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveMediaUrl } from '@/lib/api-client';
import { resolveStoredImageUrl } from '@/lib/upload';
import { cn } from '@/lib/utils';
import type { SocialUserSummary } from '@/lib/friends';

export function SocialAvatar({ user, className }: { user: SocialUserSummary; className?: string }) {
  const src = user.avatarUrl ? resolveMediaUrl(resolveStoredImageUrl(user.avatarUrl)) : undefined;
  return (
    <Avatar className={cn('h-10 w-10', className)}>
      {src && <AvatarImage src={src} alt={user.displayName} className="object-cover" />}
      <AvatarFallback className="bg-secondary font-semibold text-primary">
        {user.displayName.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

/** "@nick" for users with a social profile, plain first name otherwise. */
export function socialName(user: SocialUserSummary): string {
  return user.nickname ? `@${user.nickname}` : user.displayName;
}
