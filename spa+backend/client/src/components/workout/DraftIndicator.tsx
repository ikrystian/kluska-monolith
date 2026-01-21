import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface DraftIndicatorProps {
    lastSaved?: Date | null;
    isSaving?: boolean;
    onSaveDraft: () => void;
    onDiscardDraft: () => void;
    hasDraft: boolean;
}

export function DraftIndicator({
    lastSaved,
    isSaving,
    onSaveDraft,
    onDiscardDraft,
    hasDraft
}: DraftIndicatorProps) {
    if (!hasDraft && !lastSaved) return null;

    return (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border border-dashed mb-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
                {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <Save className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                    {isSaving
                        ? 'Zapisywanie...'
                        : lastSaved
                            ? `Ostatni zapis: ${formatDistanceToNow(lastSaved, { addSuffix: true, locale: pl })}`
                            : 'Niezapisany szkic'
                    }
                </span>
            </div>
            <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-1" />
                    Zapisz jako szkic
                </Button>
                <Button variant="ghost" size="sm" onClick={onDiscardDraft} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Odrzuć
                </Button>
            </div>
        </div>
    );
}
