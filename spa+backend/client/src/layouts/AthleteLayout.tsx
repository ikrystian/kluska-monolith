'use client';

import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ActiveWorkoutWidget } from '@/components/workout/ActiveWorkoutWidget';
import { BottomNav } from '@/components/bottom-nav';

export default function AthleteLayout() {
    return (
        <SidebarProvider>
            <AppSidebar variant="athlete" />
            <SidebarInset className="min-h-[100dvh] bg-background">
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6 pt-[env(safe-area-inset-top)]">
                    <SidebarTrigger />
                    <div className="flex-1" />
                </header>
                <main className="flex-1 p-4 lg:p-6 pb-24 md:pb-6">
                    <Outlet />
                </main>
            </SidebarInset>
            <BottomNav />
            <ActiveWorkoutWidget />
        </SidebarProvider>
    );
}
