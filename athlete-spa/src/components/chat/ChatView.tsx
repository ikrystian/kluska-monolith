import { Link } from 'react-router-dom';
import { Conversation, Message, UserProfile } from '@/lib/chat/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, ShieldCheck, User } from 'lucide-react';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { haptic } from '@/lib/haptics';

interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  otherParticipant: UserProfile | null;
  isLoadingMessages: boolean;
  onSendMessage: (text: string) => void;
  onBack: () => void;
}

export function ChatView({
  conversation,
  messages,
  currentUserId,
  otherParticipant,
  isLoadingMessages,
  onSendMessage,
  onBack,
}: ChatViewProps) {
  if (!otherParticipant) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-xs text-muted-foreground">Wczytywanie rozmowy…</p>
      </div>
    );
  }

  const isTrainer = otherParticipant.role === 'trainer';

  const handleBack = () => {
    haptic('tap');
    onBack();
  };

  return (
    <div data-immersive className="flex h-full flex-col bg-background">
      {/* Immersive Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-2 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full active:scale-90"
            onClick={handleBack}
            aria-label="Wróć do listy rozmów"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="relative shrink-0">
            <TrainerAvatar trainer={otherParticipant} className="h-10 w-10 text-base ring-2 ring-background" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-volt ring-2 ring-background" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold leading-tight text-foreground">
                {otherParticipant.name}
              </h2>
              {isTrainer && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-volt" />}
            </div>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {isTrainer ? 'Trener personalny • Aktywny' : 'Sportowiec'}
            </p>
          </div>
        </div>

        {/* Right Action: Link to Trainer Profile */}
        {isTrainer && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95 shrink-0"
          >
            <Link to={`/athlete/trainers/${otherParticipant.id}`} onClick={() => haptic('tap')}>
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Profil</span>
            </Link>
          </Button>
        )}
      </header>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoadingMessages}
        otherParticipant={otherParticipant}
        onSendStarter={onSendMessage}
      />

      {/* Bottom Message Input */}
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  );
}
