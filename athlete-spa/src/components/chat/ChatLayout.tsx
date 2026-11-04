import React from 'react';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export function ChatLayout({ children, className }: ChatLayoutProps) {
    return (
        <div className={cn("container mx-auto p-0 h-[calc(100vh-theme(spacing.30))]", className)}>
            <div className="grid grid-cols-1 border border-border/60 h-full overflow-hidden bg-card shadow-none">
                {children}
            </div>
        </div>
    );
}
