import React from 'react';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export function ChatLayout({ children, className }: ChatLayoutProps) {
    return (
        <div className={cn("container mx-auto p-0 md:p-8 h-[calc(100vh-theme(spacing.30))] md:h-auto", className)}>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 border rounded-lg h-full overflow-hidden bg-background shadow-sm">
                {children}
            </div>
        </div>
    );
}
