import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ChatContact } from '@/lib/chat/types';
import { cn } from '@/lib/utils';

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || '?';
}

/** The contact's photo, or their initials — never a stock placeholder. */
export function ChatAvatar({ contact, className }: { contact: Pick<ChatContact, 'name' | 'avatarUrl'>; className?: string }) {
    return (
        <Avatar className={cn('shrink-0', className)}>
            {contact.avatarUrl && <AvatarImage src={contact.avatarUrl} alt="" className="object-cover" />}
            <AvatarFallback>{initials(contact.name)}</AvatarFallback>
        </Avatar>
    );
}
