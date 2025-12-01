import React from 'react';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldWithValidationProps {
    label: string;
    error?: string;
    touched?: boolean;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}

export function FormFieldWithValidation({
    label,
    error,
    touched,
    required,
    hint,
    children,
    className
}: FormFieldWithValidationProps) {
    // If touched is undefined, we assume it's touched or we just show error if present (depending on preference).
    // Usually libraries like react-hook-form handle 'touched' state.
    // For simplicity, if error is present, we show it.
    const showError = !!error;

    return (
        <div className={cn("space-y-1.5", className)}>
            <Label className={cn(showError && "text-destructive")}>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {children}
            {hint && !showError && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            {showError && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                </p>
            )}
        </div>
    );
}
