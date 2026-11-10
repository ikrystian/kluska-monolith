import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';

const MAX_LENGTH = 4000;

interface MessageInputProps {
  /** Rejects when sending failed; the text is then put back into the field. */
  onSendMessage: (text: string) => Promise<void>;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = message.trim();
    if (!clean) return;
    haptic('tap');
    setMessage('');
    inputRef.current?.focus();
    onSendMessage(clean).catch(error => {
      setMessage(current => current || clean);
      toast.error(error instanceof Error ? error.message : 'Nie udało się wysłać wiadomości.', { id: 'chat-send' });
    });
  };

  return (
    <footer className="shrink-0 border-t border-border/60 bg-background/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Napisz wiadomość…"
          autoComplete="off"
          enterKeyHint="send"
          maxLength={MAX_LENGTH}
          className="h-11 flex-1 rounded-2xl border border-border/70 bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim()}
          aria-label="Wyślij wiadomość"
          className="h-11 w-11 shrink-0 rounded-2xl transition-transform active:scale-90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </footer>
  );
}
