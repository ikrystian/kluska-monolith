import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface MessageInputProps {
    onSendMessage: (text: string) => void;
    isLoading?: boolean;
}

export function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <footer className="shrink-0 border-t border-border/60 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    autoComplete="off"
                    disabled={isLoading}
                    className="h-11"
                />
                <Button
                    type="submit"
                    size="icon"
                    className="shrink-0"
                    disabled={!message.trim() || isLoading}
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </footer>
    );
}
