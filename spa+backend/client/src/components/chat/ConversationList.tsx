import React from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from '@/lib/chat/types';
import { placeholderImages } from '@/lib/placeholder-images';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConversationListProps {
    conversations: Conversation[];
    selectedId: string | null;
    currentUserId: string;
    userRole: 'trainer' | 'athlete';
    isLoading: boolean;
    onSelect: (id: string) => void;
    onDelete: (conversation: Conversation) => void;
    header?: React.ReactNode;
}

export function ConversationList({
    conversations,
    selectedId,
    currentUserId,
    userRole,
    isLoading,
    onSelect,
    onDelete,
    header
}: ConversationListProps) {
    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

    return (
        <aside className={cn(
            "flex flex-col border-r h-full",
            selectedId && "hidden md:flex"
        )}>
            {header && <header className="p-4 border-b">{header}</header>}
            <ScrollArea className="flex-1">
                {conversations?.map(convo => {
                    const otherParticipantName = userRole === 'trainer' ? convo.athleteName : convo.trainerName;
                    const hasUnread = (convo.unreadCount?.[currentUserId] || 0) > 0;

                    return (
                        <div key={convo.id} className="relative group">
                            <div
                                onClick={() => onSelect(convo.id)}
                                className={cn(
                                    "block p-4 border-b hover:bg-secondary/50 cursor-pointer transition-colors",
                                    selectedId === convo.id && 'bg-secondary'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {hasUnread && (
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-primary" />
                                    )}
                                    <Avatar className="ml-4">
                                        <AvatarImage src={placeholderImages.find(p => p.id === 'avatar-male')?.imageUrl} />
                                        <AvatarFallback>{getInitials(otherParticipantName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className={cn("font-semibold truncate", hasUnread && "text-primary")}>
                                                {otherParticipantName}
                                            </p>
                                            {convo.lastMessage && (
                                                <span className="text-xs text-muted-foreground">
                                                    {/* Date formatting will be handled by parent or utility */}
                                                </span>
                                            )}
                                        </div>
                                        <p className={cn("text-sm truncate", hasUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                                            {convo.lastMessage?.text || 'Brak wiadomości'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Czy na pewno chcesz usunąć ten czat?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tej operacji nie można cofnąć. Spowoduje to trwałe usunięcie całej konwersacji z <span className="font-bold">{otherParticipantName}</span>.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive hover:bg-destructive/90"
                                            onClick={() => onDelete(convo)}
                                        >
                                            Usuń
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )
                })}
                {!isLoading && conversations?.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        <Users className="mx-auto h-12 w-12 mb-4" />
                        <h3 className="font-semibold">Brak konwersacji</h3>
                        <p className="text-sm">Rozpocznij czat z jednym ze swoich kontaktów.</p>
                    </div>
                )}
            </ScrollArea>
        </aside>
    );
}
