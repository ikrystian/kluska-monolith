'use client';

import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default function AdminLayout() {
    return (
        <SidebarProvider>
            <AppSidebar variant="admin" />
            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
                    <SidebarTrigger />
                    <div className="flex-1" />
                </header>
                <main className="flex-1 p-4 lg:p-6">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
