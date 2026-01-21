import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/lib/chat/types';
import { placeholderImages } from '@/lib/placeholder-images';

interface NewConversationDialogProps {
    potentialContacts: UserProfile[];
    isLoading: boolean;
    onStartConversation: (userId: string) => Promise<void>;
}

export function NewConversationDialog({
    potentialContacts,
    isLoading,
    onStartConversation
}: NewConversationDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleStart = async () => {
        if (!selectedUserId) return;
        setIsCreating(true);
        try {
            await onStartConversation(selectedUserId);
            setOpen(false);
            setSelectedUserId(null);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nowa Wiadomość
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rozpocznij nową konwersację</DialogTitle>
                    <DialogDescription>Wybierz osobę, z którą chcesz porozmawiać.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3 max-h-64 overflow-y-auto">
                    {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> :
                        potentialContacts.length > 0 ? potentialContacts.map(contact => (
                            <div
                                key={contact.id}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-secondary",
                                    selectedUserId === contact.id && "bg-secondary border-primary"
                                )}
                                onClick={() => setSelectedUserId(contact.id)}
                            >
                                <Avatar>
                                    <AvatarImage src={placeholderImages.find(p => p.id === 'avatar-male')?.imageUrl} />
                                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{contact.name}</p>
                                    <p className="text-sm text-muted-foreground capitalize">{contact.role}</p>
                                </div>
                            </div>
                        )) : <p className="text-center text-muted-foreground">Brak nowych osób do rozpoczęcia rozmowy.</p>
                    }
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary" disabled={isCreating}>Anuluj</Button></DialogClose>
                    <Button onClick={handleStart} disabled={!selectedUserId || isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Rozpocznij Czat
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
