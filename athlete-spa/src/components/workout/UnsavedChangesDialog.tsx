import React from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface UnsavedChangesDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    onSaveDraft: () => void;
}

export function UnsavedChangesDialog({
    open,
    onConfirm,
    onCancel,
    onSaveDraft,
}: UnsavedChangesDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={(val) => !val && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Niezapisane zmiany</AlertDialogTitle>
                    <AlertDialogDescription>
                        Masz niezapisane zmiany w formularzu. Co chcesz zrobić?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel onClick={onCancel}>Wróć do edycji</AlertDialogCancel>
                    <Button variant="secondary" onClick={onSaveDraft}>
                        <Save className="h-4 w-4 mr-2" />
                        Zapisz jako szkic
                    </Button>
                    <Button variant="destructive" onClick={onConfirm}>
                        Odrzuć zmiany
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
