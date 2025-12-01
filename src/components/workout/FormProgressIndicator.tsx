import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface FormProgressIndicatorProps {
    steps: {
        label: string;
        isComplete: boolean;
        isActive: boolean;
    }[];
}

export function FormProgressIndicator({ steps }: FormProgressIndicatorProps) {
    const completedCount = steps.filter(s => s.isComplete).length;
    const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

    return (
        <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
                <span>Postęp formularza</span>
                <span className="text-muted-foreground">{completedCount}/{steps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex gap-2 flex-wrap">
                {steps.map((step, i) => (
                    <Badge
                        key={i}
                        variant={step.isComplete ? "default" : step.isActive ? "secondary" : "outline"}
                        className="transition-colors"
                    >
                        {step.isComplete && <Check className="h-3 w-3 mr-1" />}
                        {step.label}
                    </Badge>
                ))}
            </div>
        </div>
    );
}
