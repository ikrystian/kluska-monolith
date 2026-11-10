import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
}

export function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = message.trim();
    if (clean && !isLoading) {
      haptic('tap');
      onSendMessage(clean);
      setMessage('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <footer className="shrink-0 border-t border-border/60 bg-background/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-3xl mx-auto">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Napisz wiadomość…"
          autoComplete="off"
          disabled={isLoading}
          className="h-11 flex-1 rounded-2xl border border-border/70 bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || isLoading}
          aria-label="Wyślij wiadomość"
          className="h-11 w-11 shrink-0 rounded-2xl transition-transform active:scale-90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </footer>
  );
}
