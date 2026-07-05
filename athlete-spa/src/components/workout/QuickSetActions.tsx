import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Flame, Copy, Trash2 } from 'lucide-react';
import { SetType } from '@/lib/types';

interface QuickSetActionsProps {
    onAddSet: (type: SetType) => void;
    onDuplicateLast: () => void;
    onClearAll: () => void;
    setsCount: number;
}

export function QuickSetActions({
    onAddSet,
    onDuplicateLast,
    onClearAll,
    setsCount
}: QuickSetActionsProps) {
    return (
        <div className="flex gap-2 flex-wrap">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAddSet(SetType.WorkingSet)}
                            type="button"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dodaj serię roboczą</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAddSet(SetType.WarmUpSet)}
                            type="button"
                        >
                            <Flame className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dodaj rozgrzewkę</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDuplicateLast}
                            disabled={setsCount === 0}
                            type="button"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Duplikuj ostatnią serię</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClearAll}
                            disabled={setsCount === 0}
                            className="text-destructive hover:text-destructive"
                            type="button"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Usuń wszystkie serie</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
