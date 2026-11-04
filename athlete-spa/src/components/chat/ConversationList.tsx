import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from '@/lib/chat/types';
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
        <aside className={cn("flex h-full flex-col", selectedId && "hidden")}>
            {header && <header className="px-4 pb-2 pt-1">{header}</header>}
            <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1 px-2">
                    {conversations?.map(convo => {
                        const otherParticipantName = userRole === 'trainer' ? convo.athleteName : convo.trainerName;
                        const hasUnread = (convo.unreadCount?.[currentUserId] || 0) > 0;

                        return (
                            <div key={convo.id} className="relative group">
                                <div
                                    onClick={() => onSelect(convo.id)}
                                    className={cn(
                                        "block rounded-xl p-3 hover:bg-secondary/60 cursor-pointer transition-colors active:scale-[0.99]",
                                        selectedId === convo.id && 'bg-secondary'
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            <Avatar className="h-11 w-11">
                                                <AvatarFallback>{getInitials(otherParticipantName)}</AvatarFallback>
                                            </Avatar>
                                            {hasUnread && (
                                                <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-card" />
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <p className="truncate font-semibold">
                                                    {otherParticipantName}
                                                </p>
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
                                            aria-label="Usuń rozmowę"
                                            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Trash2 className="h-4 w-4" />
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
                                                className="bg-destructive text-destructive-foreground"
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
                            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Users className="h-7 w-7" />
                            </span>
                            <h3 className="font-semibold text-foreground">Brak konwersacji</h3>
                            <p className="text-sm">Rozpocznij czat z jednym ze swoich kontaktów.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}
