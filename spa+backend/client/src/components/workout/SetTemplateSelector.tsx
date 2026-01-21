import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { SET_TEMPLATES, SetTemplate } from '@/lib/set-templates';

interface SetTemplateSelectorProps {
    onSelect: (template: SetTemplate) => void;
}

export function SetTemplateSelector({ onSelect }: SetTemplateSelectorProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Użyj szablonu
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px]">
                <DropdownMenuLabel>Szablony serii</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SET_TEMPLATES.map(template => (
                    <DropdownMenuItem
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="flex flex-col items-start py-2 cursor-pointer"
                    >
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground">{template.description}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
