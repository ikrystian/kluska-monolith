import React, { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
    /** Rejects when sending failed; the text is then put back into the field. */
    onSendMessage: (text: string) => Promise<void>;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
    const [message, setMessage] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = message.trim();
        if (!clean) return;
        setMessage('');
        inputRef.current?.focus();
        onSendMessage(clean).catch(error => {
            setMessage(current => current || clean);
            toast({
                title: 'Nie wysłano wiadomości',
                description: error instanceof Error ? error.message : 'Spróbuj ponownie.',
                variant: 'destructive',
            });
        });
    };

    return (
        <footer className="border-t bg-background p-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                    ref={inputRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    autoComplete="off"
                    maxLength={4000}
                />
                <Button type="submit" size="icon" disabled={!message.trim()} aria-label="Wyślij wiadomość">
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </footer>
    );
}
