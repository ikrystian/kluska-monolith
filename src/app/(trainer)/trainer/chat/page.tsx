'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useCollection, useDoc, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
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

interface Conversation {
  id: string;
  conversationId: string;
  participants: string[];
  trainerId: string;
  athleteId: string;
  trainerName: string;
  athleteName: string;
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: Date;
  } | null;
  updatedAt: Date;
  unreadCount?: {
    [userId: string]: number;
  };
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'trainer' | 'admin';
  photoURL?: string;
  trainerId?: string;
}

function NewConversationDialog({ existingConversationIds, onConversationCreated }: { existingConversationIds: string[], onConversationCreated: () => void }) {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { createDoc } = useCreateDoc();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>('users', user?.uid || '');

  // Fetch athletes assigned to this trainer
  const { data: athletes, isLoading: athletesLoading } = useCollection<UserProfile>(
    'users',
    userProfile?.role === 'trainer' ? { role: 'athlete', trainerId: user?.uid } : undefined
  );

  // Fetch trainer profile if user is athlete
  const { data: trainerProfile, isLoading: trainerLoading } = useDoc<UserProfile>(
    'users',
    userProfile?.role === 'athlete' && userProfile.trainerId ? userProfile.trainerId : ''
  );

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

    const newConversation = {
      conversationId: conversationId,
      participants: [user.uid, selectedUserId],
      trainerId: userProfile.role === 'trainer' ? user.uid : selectedUserId,
      athleteId: userProfile.role === 'athlete' ? user.uid : selectedUserId,
      trainerName: userProfile.role === 'trainer' ? userProfile.name : otherUser.name,
      athleteName: userProfile.role === 'athlete' ? userProfile.name : otherUser.name,
      lastMessage: null,
      updatedAt: new Date(),
      unreadCount: {
        [user.uid]: 0,
        [selectedUserId]: 0,
      }
    };

    try {
      await createDoc('conversations', newConversation);
      onConversationCreated();
      setOpen(false);
      setSelectedUserId(null);
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
                 {contact.photoURL ? (
                   <AvatarImage src={contact.photoURL} />
                 ) : (
                   <AvatarImage src={placeholderImages.find(p => p.id === 'avatar-male')?.imageUrl} />
                 )}
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
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  const { createDoc } = useCreateDoc();
  const { updateDoc } = useUpdateDoc();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, refetch } = useCollection<Message>(
    'messages',
    { conversationId: conversation.id },
    { sort: { createdAt: 1 } }
  );

  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || '');

  const otherParticipantId = userProfile?.role === 'trainer' ? conversation.athleteId : conversation.trainerId;

  const { data: otherParticipant } = useDoc<UserProfile>('users', otherParticipantId || '');

  // Mark messages as read
  useEffect(() => {
    if (user && conversation.unreadCount?.[user.uid] > 0) {
      updateDoc('conversations', conversation.id, {
        [`unreadCount.${user.uid}`]: 0
      }).catch(e => console.error("Could not mark messages as read", e));
    }
  }, [conversation, user, updateDoc]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    const lastMessageData = {
      text: messageText,
      senderId: user.uid,
      createdAt: new Date(),
    };

    try {
      // Create new message
      await createDoc('messages', {
        conversationId: conversation.id,
        senderId: user.uid,
        text: messageText,
        createdAt: new Date(),
      });

      // Update conversation metadata
      await updateDoc('conversations', conversation.id, {
        lastMessage: lastMessageData,
        updatedAt: new Date(),
        [`unreadCount.${otherParticipantId}`]: (conversation.unreadCount?.[otherParticipantId] || 0) + 1
      });

      refetch();
    } catch (e) {
      console.error(e);
      toast({
        title: "Błąd",
        description: "Nie udało się wysłać wiadomości.",
        variant: 'destructive'
      });
      setNewMessage(messageText); // Restore message on failure
    }
  };

  if (!otherParticipant) {
    return <div className="flex flex-col items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Avatar>
          {otherParticipant?.photoURL ? (
            <AvatarImage src={otherParticipant.photoURL} />
          ) : (
            <AvatarImage src={placeholderImages.find(p => p.id === 'avatar-male')?.imageUrl} />
          )}
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
                    {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: pl }) : 'teraz'}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { deleteDoc } = useDeleteDoc();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { data: conversations, isLoading, refetch } = useCollection<Conversation>(
    'conversations',
    user?.uid ? { participants: user.uid } : undefined,
    { sort: { updatedAt: -1 } }
  );

  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || '');

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
    if (!user) return;

    try {
      // Delete all messages in this conversation
      const { data: messages } = await fetch(`/api/db/messages?query=${encodeURIComponent(JSON.stringify({ conversationId: conversation.id }))}`).then(r => r.json());

      if (messages) {
        await Promise.all(messages.map((message: Message) =>
          deleteDoc('messages', message.id)
        ));
      }

      // Delete the conversation
      await deleteDoc('conversations', conversation.id);

      toast({
        title: "Konwersacja Usunięta",
        description: "Cała historia czatu została usunięta.",
        variant: 'destructive',
      });

      if (selectedConversationId === conversation.id) {
        handleBackToList();
      }

      refetch();
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
  const existingConversationIds = useMemo(() => conversations?.map(c => c.conversationId) || [], [conversations]);

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
              <NewConversationDialog existingConversationIds={existingConversationIds} onConversationCreated={refetch} />
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
