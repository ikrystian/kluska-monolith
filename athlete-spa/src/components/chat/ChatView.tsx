import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, MoreVertical, ShieldCheck, Trash2, User } from 'lucide-react';
import type { ChatContact, Message } from '@/lib/chat/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
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
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { haptic } from '@/lib/haptics';

interface ChatViewProps {
  /** The other participant — never the signed-in user. */
  contact: ChatContact;
  messages: Message[];
  currentUserId: string;
  unreadByContact: number;
  isLoadingMessages: boolean;
  /** Rejects when the message could not be sent (the input gets its text back). */
  onSendMessage: (text: string) => Promise<void>;
  onBack: () => void;
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
  onDelete,
}: ChatViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isTrainer = contact.role === 'trainer';

  const handleBack = () => {
    haptic('tap');
    onBack();
  };

  return (
    <div data-immersive className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-1 border-b border-border/60 bg-background/95 px-2 py-2.5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full active:scale-90"
            onClick={handleBack}
            aria-label="Wróć do listy rozmów"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <TrainerAvatar trainer={contact} className="h-10 w-10 text-base ring-2 ring-background" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold leading-tight text-foreground">{contact.name}</h2>
              {isTrainer && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-volt" />}
            </div>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {isTrainer ? 'Trener personalny' : contact.role === 'admin' ? 'Zespół Leniwej Kluski' : 'Sportowiec'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          {isTrainer && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 rounded-full px-3 text-xs font-semibold text-muted-foreground active:scale-95"
            >
              <Link to={`/athlete/trainers/${contact.id}`} onClick={() => haptic('tap')}>
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Profil</span>
              </Link>
            </Button>
          )}

          {onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label="Więcej opcji">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Usuń rozmowę
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        unreadByContact={unreadByContact}
        isLoading={isLoadingMessages}
        contact={contact}
        onSendStarter={text => void onSendMessage(text).catch(() => undefined)}
      />

      <MessageInput onSendMessage={onSendMessage} />

      {onDelete && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent className="rounded-3xl p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-xl font-bold uppercase">Usunąć tę rozmowę?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground">
                Wszystkie wiadomości z <span className="font-bold text-foreground">{contact.name}</span> zostaną trwale
                usunięte — także po drugiej stronie.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-destructive-foreground"
                onClick={() => void onDelete()}
              >
                Usuń rozmowę
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
