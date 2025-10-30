'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, collection, query, where, doc, setDoc, addDoc, serverTimestamp, orderBy, getDoc, Timestamp, deleteDoc, getDocs, writeBatch, increment } from '@/firebase';
import type { Conversation, Message, UserProfile, WorkoutPlan, AthleteProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare, Loader2, Users, PlusCircle, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { placeholderImages } from '@/lib/placeholder-images';
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


function NewConversationDialog({ existingConversationIds }: { existingConversationIds: string[] }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const athletesRef = useMemoFirebase(() => {
        if (!user || userProfile?.role !== 'trainer') return null;
        return collection(firestore, `trainers/${user.uid}/athletes`);
    }, [user, userProfile, firestore]);
    const { data: athletes, isLoading: athletesLoading } = useCollection<UserProfile>(athletesRef);

    const trainerProfileRef = useMemoFirebase(() => {
        if (!user || userProfile?.role !== 'athlete' || !(userProfile as AthleteProfile).trainerId) return null;
        return doc(firestore, 'users', (userProfile as AthleteProfile).trainerId);
    }, [user, userProfile, firestore]);
    const { data: trainerProfile, isLoading: trainerLoading } = useDoc<UserProfile>(trainerProfileRef);

    const potentialContacts = useMemo(() => {
        let contacts: UserProfile[] = [];
        if (userProfile?.role === 'trainer' && athletes) {
            contacts = athletes as UserProfile[];
        } else if (userProfile?.role === 'athlete' && trainerProfile) {
            contacts = [trainerProfile];
        }

        return contacts.filter(contact => {
            if (!user || !contact) return false;
            const conversationId = [user.uid, contact.id].sort().join('_');
            return !existingConversationIds.includes(conversationId);
        });
    }, [user, userProfile, athletes, trainerProfile, existingConversationIds]);

    const isLoading = isProfileLoading || athletesLoading || trainerLoading;

    const handleStartConversation = async () => {
        if (!user || !userProfile || !selectedUserId) return;

        const otherUser = potentialContacts.find(c => c.id === selectedUserId);
        if (!otherUser) return;

        setIsCreating(true);

        const conversationId = [user.uid, selectedUserId].sort().join('_');

        const batch = writeBatch(firestore);

        const mainConversationRef = doc(firestore, 'conversations', conversationId);
        const userConversationRef = doc(firestore, `users/${user.uid}/conversations`, conversationId);
        const otherUserConversationRef = doc(firestore, `users/${selectedUserId}/conversations`, conversationId);

        const newConversation: Conversation = {
            id: conversationId,
            participants: [user.uid, selectedUserId],
            trainerId: userProfile.role === 'trainer' ? user.uid : selectedUserId,
            athleteId: userProfile.role === 'athlete' ? user.uid : selectedUserId,
            trainerName: userProfile.role === 'trainer' ? userProfile.name : otherUser.name,
            athleteName: userProfile.role === 'athlete' ? userProfile.name : otherUser.name,
            lastMessage: null,
            updatedAt: Timestamp.now(),
            unreadCount: {
                [user.uid]: 0,
                [selectedUserId]: 0,
            }
        };

        batch.set(mainConversationRef, newConversation);
        batch.set(userConversationRef, newConversation);
        batch.set(otherUserConversationRef, newConversation);

        try {
            await batch.commit();
            setOpen(false);
            router.push(`/trainer/chat?conversationId=${conversationId}`);
        } catch (e) {
            console.error(e);
            toast({
                title: "Błąd",
                description: "Nie udało się rozpocząć konwersacji.",
                variant: "destructive"
            });
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
                    {isLoading ? <Loader2 className="mx-auto h-6 w-6 animate-spin"/> :
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
                    <Button onClick={handleStartConversation} disabled={!selectedUserId || isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Rozpocznij Czat
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ChatView({ conversation, onBack }: { conversation: Conversation, onBack: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [newMessage, setNewMessage] = useState('');
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `conversations/${conversation.id}/messages`), orderBy('createdAt', 'asc')) : null,
        [firestore, conversation.id]
    );

    const { data: messages, isLoading } = useCollection<Message>(messagesQuery);

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
      }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const otherParticipantId = userProfile?.role === 'trainer' ? conversation.athleteId : conversation.trainerId;

    const otherParticipantProfileRef = useMemoFirebase(() => {
        if (!otherParticipantId) return null;
        return doc(firestore, 'users', otherParticipantId);
      }, [otherParticipantId, firestore]);

    const { data: otherParticipant } = useDoc<UserProfile>(otherParticipantProfileRef);

    // Effect to mark messages as read
    useEffect(() => {
        if (user && firestore && conversation.unreadCount?.[user.uid] > 0) {
            const batch = writeBatch(firestore);
            const mainConvRef = doc(firestore, 'conversations', conversation.id);
            const userConvRef = doc(firestore, `users/${user.uid}/conversations`, conversation.id);

            const updateField = `unreadCount.${user.uid}`;

            batch.update(mainConvRef, { [updateField]: 0 });
            batch.update(userConvRef, { [updateField]: 0 });

            batch.commit().catch(e => console.error("Could not mark messages as read", e));
        }
    }, [conversation, user, firestore]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newMessage.trim() || !firestore) return;

        const messageText = newMessage.trim();
        setNewMessage('');

        const messagesRef = collection(firestore, `conversations/${conversation.id}/messages`);

        const lastMessageData = {
            text: messageText,
            senderId: user.uid,
            createdAt: Timestamp.now(),
        };

        const updateData = {
            lastMessage: lastMessageData,
            updatedAt: Timestamp.now(),
            [`unreadCount.${otherParticipantId}`]: increment(1)
        };

        const batch = writeBatch(firestore);

        // Create new message
        batch.set(doc(messagesRef), {
            text: messageText,
            senderId: user.uid,
            createdAt: Timestamp.now(),
            conversationId: conversation.id,
        });

        // Update metadata on all conversation docs
        batch.update(doc(firestore, 'conversations', conversation.id), updateData);
        batch.update(doc(firestore, `users/${user.uid}/conversations`, conversation.id), updateData);
        batch.update(doc(firestore, `users/${otherParticipantId}/conversations`, conversation.id), updateData);

        try {
            await batch.commit();
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: messagesRef.path,
                operation: 'create',
                requestResourceData: { text: messageText }
            }));
            toast({ title: "Błąd", description: "Nie udało się wysłać wiadomości.", variant: 'destructive' });
            setNewMessage(messageText); // Restore message on failure
        }
    };

    if(!otherParticipant) {
        return <div className="flex flex-col items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-4 p-4 border-b">
                 <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <Avatar>
                    <AvatarImage src={placeholderImages.find(p => p.id === 'avatar-male')?.imageUrl} />
                    <AvatarFallback>{otherParticipant?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="font-semibold text-lg">{otherParticipant?.name}</h2>
                    <p className="text-sm text-muted-foreground capitalize">{otherParticipant?.role}</p>
                </div>
            </header>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {isLoading && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/>}
                    {messages?.map(message => {
                        const isMe = message.senderId === user?.uid;
                        return (
                            <div key={message.id} className={cn("flex", isMe ? 'justify-end' : 'justify-start')}>
                                <div className={cn("max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg",
                                    isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                )}>
                                    <p>{message.text}</p>
                                    <p className={cn("text-xs mt-1", isMe ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                        {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true, locale: pl }) : 'teraz'}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                     <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            <footer className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Napisz wiadomość..."
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4"/>
                    </Button>
                </form>
            </footer>
        </div>
    );
}

export default function ChatPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

    const conversationsQuery = useMemoFirebase(
        () => user ? query(collection(firestore, `users/${user.uid}/conversations`), orderBy('updatedAt', 'desc')) : null,
        [user, firestore]
    );

    const { data: conversations, isLoading } = useCollection<Conversation>(conversationsQuery);

    const { data: userProfile } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );

    useEffect(() => {
        const conversationIdFromUrl = searchParams.get('conversationId');
        if (conversationIdFromUrl) {
            setSelectedConversationId(conversationIdFromUrl);
        } else {
            setSelectedConversationId(null);
        }
    }, [searchParams]);

    const handleBackToList = () => {
        setSelectedConversationId(null);
        router.replace('/trainer/chat', { scroll: false });
    };

    const handleDeleteConversation = async (conversation: Conversation) => {
        if (!user || !firestore) return;

        const otherParticipantId = conversation.participants.find(p => p !== user.uid);
        if (!otherParticipantId) return;

        const batch = writeBatch(firestore);

        // 1. Delete user's copy
        const userConvRef = doc(firestore, `users/${user.uid}/conversations`, conversation.id);
        batch.delete(userConvRef);

        // 2. Delete other participant's copy
        const otherUserConvRef = doc(firestore, `users/${otherParticipantId}/conversations`, conversation.id);
        batch.delete(otherUserConvRef);

        // 3. Delete messages subcollection (requires fetching all docs)
        const messagesRef = collection(firestore, `conversations/${conversation.id}/messages`);
        const messagesSnapshot = await getDocs(messagesRef);
        messagesSnapshot.forEach(messageDoc => {
            batch.delete(messageDoc.ref);
        });

        // 4. Delete the main conversation document
        const mainConvRef = doc(firestore, 'conversations', conversation.id);
        batch.delete(mainConvRef);

        try {
            await batch.commit();
            toast({
                title: "Konwersacja Usunięta",
                description: "Cała historia czatu została usunięta.",
                variant: 'destructive',
            });
            if (selectedConversationId === conversation.id) {
                handleBackToList();
            }
        } catch (e) {
            console.error("Error deleting conversation: ", e);
            toast({
                title: "Błąd",
                description: "Nie udało się usunąć konwersacji.",
                variant: "destructive"
            });
        }
    };


    const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

    const existingConversationIds = useMemo(() => conversations?.map(c => c.id) || [], [conversations]);

    const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

    return (
        <AlertDialog>
            <div className="container mx-auto p-0 md:p-8 h-[calc(100vh-theme(spacing.14))] md:h-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 border rounded-lg h-full overflow-hidden">
                    <aside className={cn(
                        "flex flex-col border-r",
                        selectedConversationId && "hidden md:flex"
                    )}>
                        <header className="p-4 border-b flex items-center justify-between">
                            <h1 className="font-headline text-2xl font-bold">Czat</h1>
                             <NewConversationDialog existingConversationIds={existingConversationIds} />
                        </header>
                        <ScrollArea className="flex-1">
                            {isLoading && <div className="p-4 text-center text-muted-foreground">Ładowanie...</div>}
                            {conversations?.map(convo => {
                                const otherParticipantName = userProfile?.role === 'trainer' ? convo.athleteName : convo.trainerName;
                                const hasUnread = convo.unreadCount?.[user?.uid ?? ''] > 0;
                                return (
                                    <div key={convo.id} className="relative group">
                                         <Link
                                            href={`/trainer/chat?conversationId=${convo.id}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setSelectedConversationId(convo.id);
                                                router.replace(`/trainer/chat?conversationId=${convo.id}`, { scroll: false });
                                            }}
                                            className={cn(
                                                "block p-4 border-b hover:bg-secondary/50",
                                                selectedConversationId === convo.id && 'bg-secondary'
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
                                                    <p className={cn("font-semibold truncate", hasUnread && "text-primary")}>{otherParticipantName}</p>
                                                    <p className="text-sm text-muted-foreground truncate">{convo.lastMessage?.text || 'Brak wiadomości'}</p>
                                                </div>
                                            </div>
                                        </Link>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100"
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
                                                    onClick={() => handleDeleteConversation(convo)}
                                                >
                                                    Usuń
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </div>
                                )
                            })}
                             {!isLoading && conversations?.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Users className="mx-auto h-12 w-12 mb-4"/>
                                    <h3 className="font-semibold">Brak konwersacji</h3>
                                    <p className="text-sm">Rozpocznij czat z jednym ze swoich sportowców lub trenerem.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </aside>

                    <main className={cn(
                        "md:col-span-2 xl:col-span-3",
                        !selectedConversationId && "hidden md:block"
                    )}>
                        {selectedConversation ? (
                            <ChatView conversation={selectedConversation} onBack={handleBackToList} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                               <MessageSquare className="h-16 w-16 mb-4"/>
                               <h2 className="text-xl font-semibold">Wybierz konwersację</h2>
                               <p>Wybierz rozmowę z listy, aby wyświetlić wiadomości.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </AlertDialog>
    );
}
