'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface DeleteButtonProps {
    id: string;
    resource: 'meals' | 'diets'; // API path segment
    resourceName: string; // For display
}

export default function DeleteButton({ id, resource, resourceName }: DeleteButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/trainer/${resource}/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast({ title: 'Sukces', description: `${resourceName} został usunięty.` });
                router.refresh();
            } else {
                toast({ title: 'Błąd', description: `Nie udało się usunąć ${resourceName}.`, variant: 'destructive' });
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast({ title: 'Błąd', description: 'Wystąpił błąd podczas usuwania.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tej operacji nie można cofnąć. {resourceName} zostanie trwale usunięty z Twojej bazy.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                        {isDeleting ? 'Usuwanie...' : 'Usuń'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
