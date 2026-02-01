
'use client';

import { useState, useEffect } from 'react';
import { BadgeList, AchievementBadgeDoc } from './BadgeList';
import { BadgeForm, BadgeFormValues } from './BadgeForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
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

export function BadgesManager() {
    const [badges, setBadges] = useState<AchievementBadgeDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
    const [editingBadge, setEditingBadge] = useState<AchievementBadgeDoc | undefined>(undefined);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchBadges = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/gamification/admin/badges');
            if (!response.ok) throw new Error('Failed to fetch badges');
            const data = await response.json();
            setBadges(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load badges');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBadges();
    }, []);

    const handleCreate = async (data: BadgeFormValues) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/gamification/admin/badges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error('Failed to create badge');

            toast.success('Badge created successfully');
            setView('list');
            fetchBadges();
        } catch (error) {
            console.error(error);
            toast.error('Failed to create badge');
            setIsLoading(false);
        }
    };

    const handleUpdate = async (data: BadgeFormValues) => {
        if (!editingBadge) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/gamification/admin/badges/${editingBadge._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error('Failed to update badge');

            toast.success('Badge updated successfully');
            setView('list');
            setEditingBadge(undefined);
            fetchBadges();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update badge');
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            // Optimistic update or wait? Let's wait.
            const response = await fetch(`/api/gamification/admin/badges/${deleteId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete badge');

            toast.success('Badge deleted successfully');
            setBadges((prev) => prev.filter((b) => b._id !== deleteId));
            setDeleteId(null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete badge');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Achievement Badges</h2>
                    <p className="text-muted-foreground">
                        Manage badges, challenges, and milestones.
                    </p>
                </div>
                {view === 'list' && (
                    <Button onClick={() => setView('create')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Badge
                    </Button>
                )}
            </div>

            {view === 'list' ? (
                <BadgeList
                    badges={badges}
                    onEdit={(badge) => {
                        setEditingBadge(badge);
                        setView('edit');
                    }}
                    onDelete={(id) => setDeleteId(id)}
                />
            ) : (
                <BadgeForm
                    initialData={view === 'edit' ? editingBadge : undefined}
                    onSubmit={view === 'edit' ? handleUpdate : handleCreate}
                    onCancel={() => {
                        setView('list');
                        setEditingBadge(undefined);
                    }}
                    isLoading={isLoading}
                />
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the badge
                            and remove it from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
