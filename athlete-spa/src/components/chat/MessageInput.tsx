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
        <footer className="border-t border-border/60 bg-card/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    autoComplete="off"
                    disabled={isLoading}
                    className="h-11 rounded-full bg-background px-4"
                />
                <Button
                    type="submit"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full shadow-glow"
                    disabled={!message.trim() || isLoading}
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </footer>
    );
}
