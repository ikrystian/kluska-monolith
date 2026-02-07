'use client';

import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Loader2, Footprints, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChallengeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    challengedUserId: string;
    challengedUserName: string;
}

export function ChallengeDialog({
    open,
    onOpenChange,
    challengedUserId,
    challengedUserName,
}: ChallengeDialogProps) {
    const { toast } = useToast();
    const [targetKm, setTargetKm] = useState('50');
    const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 30));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!endDate) {
            toast({
                title: 'Błąd',
                description: 'Wybierz datę końcową wyzwania',
                variant: 'destructive',
            });
            return;
        }

        const km = parseFloat(targetKm);
        if (isNaN(km) || km <= 0) {
            toast({
                title: 'Błąd',
                description: 'Podaj prawidłową liczbę kilometrów',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengedId: challengedUserId,
                    targetKm: km,
                    endDate: endDate.toISOString(),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create challenge');
            }

            toast({
                title: 'Wyzwanie wysłane! 🏃',
                description: `Zaprosiłeś ${challengedUserName} do wyzwania biegowego`,
            });

            onOpenChange(false);
            setTargetKm('50');
            setEndDate(addDays(new Date(), 30));
        } catch (error) {
            toast({
                title: 'Błąd',
                description: error instanceof Error ? error.message : 'Nie udało się wysłać wyzwania',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Footprints className="h-5 w-5 text-primary" />
                        Wyzwij do biegu
                    </DialogTitle>
                    <DialogDescription>
                        Rzuć wyzwanie <span className="font-semibold">{challengedUserName}</span> i sprawdź,
                        kto przebiegnie więcej kilometrów do wyznaczonej daty!
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="targetKm" className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Cel (kilometry)
                        </Label>
                        <Input
                            id="targetKm"
                            type="number"
                            min="1"
                            step="1"
                            value={targetKm}
                            onChange={(e) => setTargetKm(e.target.value)}
                            placeholder="50"
                        />
                        <p className="text-xs text-muted-foreground">
                            Ile kilometrów trzeba przebiec, żeby wygrać wyzwanie
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Data końcowa
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !endDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, 'PPP', { locale: pl }) : 'Wybierz datę'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                    locale={pl}
                                />
                            </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                            Wyzwanie kończy się o północy wybranego dnia
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Anuluj
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Wyślij wyzwanie
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
