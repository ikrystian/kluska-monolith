import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { useCreateDoc, useUpdateDoc } from '@/hooks/useMutation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  MessageSquare,
  Search,
  Send,
  PlusCircle,
  ArrowLeft,
  Phone,
  Video,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

// Simplified interfaces for Chat
interface Conversation {
  id: string;
  participants: string[];
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: any;
  } | null;
  updatedAt: any;
  trainerId?: string;
  athleteId?: string;
  athleteName?: string;
  trainerName?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: any;
  readBy?: string[];
}

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('conversationId');

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationIdParam);
  const [messageText, setMessageText] = useState('');

  // Fetch conversations
  const { data: conversations, isLoading: conversationsLoading } = useCollection<Conversation>(
    'conversations',
    {
      query: { participants: { $arrayContains: user?.id } },
      sort: { updatedAt: -1 }
    }
  );

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useCollection<Message>(
    selectedConversationId ? `conversations/${selectedConversationId}/messages` : null,
    { sort: { createdAt: 1 } }
  );

  const { mutate: sendMessage } = useCreateDoc<Message>(selectedConversationId ? `conversations/${selectedConversationId}/messages` : '');
  const { mutate: updateConversation } = useUpdateDoc<Conversation>('conversations');

  useEffect(() => {
    if (conversationIdParam) {
      setSelectedConversationId(conversationIdParam);
    }
  }, [conversationIdParam]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setSearchParams({ conversationId: id });
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !user?.id || !selectedConversationId) return;

    const text = messageText.trim();
    setMessageText('');

    const newMessage = {
      conversationId: selectedConversationId,
      senderId: user.id,
      text: text,
      createdAt: new Date().toISOString(),
      readBy: [user.id],
    };

    sendMessage(newMessage as Message, {
      onError: () => {
        toast.error('Nie udało się wysłać wiadomości');
        setMessageText(text); // Restore text on error
      }
    });

    // Update conversation last message
    updateConversation({
      id: selectedConversationId,
      data: {
        lastMessage: {
          text: text,
          senderId: user.id,
          createdAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      } as any
    });
  };

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  // Determine the name of the other participant
  const getConversationName = (conv: Conversation) => {
    if (user?.role === 'trainer') {
      return conv.athleteName || 'Sportowiec';
    } else {
      return conv.trainerName || 'Trener';
    }
  };

  return (
    <div className="container mx-auto p-0 md:p-4 h-[calc(100vh-theme(spacing.16))] md:h-[calc(100vh-theme(spacing.20))]">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 h-full border rounded-lg overflow-hidden bg-background shadow-sm">

        {/* Conversation List Sidebar */}
        <div className={`flex flex-col border-r bg-muted/10 ${selectedConversationId ? 'hidden md:flex' : 'flex'} h-full`}>
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="font-headline text-2xl font-bold">Czat</h1>
              {/* New Conversation Dialog would go here */}
              <Button variant="ghost" size="icon">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Szukaj..."
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversationsLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="flex flex-col">
                {conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`flex items-start gap-4 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${selectedConversationId === conv.id ? 'bg-muted' : ''}`}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {getConversationName(conv).charAt(0)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate">{getConversationName(conv)}</span>
                        {conv.lastMessage?.createdAt && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {format(new Date(conv.lastMessage.createdAt), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage?.senderId === user?.id && 'Ty: '}
                        {conv.lastMessage?.text || 'Rozpocznij konwersację'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Brak konwersacji</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat View */}
        <div className={`col-span-1 md:col-span-2 lg:col-span-3 flex flex-col h-full bg-background ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversationId ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b h-16">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversationId(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  {selectedConversation && (
                    <>
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {getConversationName(selectedConversation).charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{getConversationName(selectedConversation)}</h3>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className={`h-16 w-2/3 rounded-lg ${i % 2 === 0 ? 'ml-auto' : ''}`} />
                    ))}
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {messages.map((message) => {
                      const isMe = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMe
                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                : 'bg-muted rounded-bl-none'
                              }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                            <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {format(new Date(message.createdAt), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {/* Invisible element to scroll to bottom */}
                    <div id="messages-end" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[300px]">
                    <p>Rozpocznij konwersację wysyłając wiadomość.</p>
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t bg-background">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <Button type="button" variant="ghost" size="icon" className="shrink-0">
                    <PlusCircle className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!messageText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <MessageSquare className="h-10 w-10 opacity-20" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Twoje Wiadomości</h2>
              <p className="max-w-md text-center">
                Wybierz konwersację z listy po lewej stronie, aby wyświetlić historię czatu lub rozpocząć nową rozmowę.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
