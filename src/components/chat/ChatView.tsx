import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MoreVertical, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { chatRoleLabel, type ChatContact, type Message } from '@/lib/chat/types';
import { ChatAvatar } from './ChatAvatar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatViewProps {
    /** The other participant — never the signed-in user. */
    contact: ChatContact;
    messages: Message[];
    currentUserId: string;
    unreadByContact: number;
    isLoadingMessages: boolean;
    onSendMessage: (text: string) => Promise<void>;
    onBack: () => void;
    /** Link to the contact's profile, when there is one to show. */
    profileHref?: string;
    /** Omitted for a draft that does not exist on the server yet. */
    onDelete?: () => Promise<void>;
}

export function ChatView({
    contact,
    messages,
    currentUserId,
    unreadByContact,
    isLoadingMessages,
    onSendMessage,
    onBack,
    profileHref,
    onDelete,
}: ChatViewProps) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="flex items-center gap-3 border-b bg-background p-4">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Wróć do listy rozmów">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <ChatAvatar contact={contact} />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold">{contact.name}</h2>
                    <p className="text-sm text-muted-foreground">{chatRoleLabel(contact.role)}</p>
                </div>
                {profileHref && (
                    <Button asChild variant="ghost" size="sm">
                        <Link href={profileHref}>
                            <User className="mr-1.5 h-4 w-4" /> Profil
                        </Link>
                    </Button>
                )}
                {onDelete && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Więcej opcji">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setConfirmDelete(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Usuń rozmowę
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </header>

            <MessageList
                messages={messages}
                currentUserId={currentUserId}
                unreadByContact={unreadByContact}
                isLoading={isLoadingMessages}
                contact={contact}
            />

            <MessageInput onSendMessage={onSendMessage} />

            {onDelete && (
                <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Czy na pewno chcesz usunąć ten czat?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tej operacji nie można cofnąć. Cała konwersacja z{' '}
                                <span className="font-bold">{contact.name}</span> zostanie usunięta — także po drugiej stronie.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => void onDelete()}>
                                Usuń
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}
