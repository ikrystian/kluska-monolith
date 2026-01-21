'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Athlete {
    id: string;
    name: string;
    email: string;
}

interface CreateSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    athletes: Athlete[];
    onSuccess: () => void;
    defaultDate?: Date;
}

const sessionSchema = z.object({
    athleteId: z.string().min(1, 'Wybierz sportowca'),
    title: z.string().min(1, 'Tytuł jest wymagany'),
    description: z.string().optional(),
    date: z.date({ message: 'Wybierz datę' }),
    time: z.string().min(1, 'Wybierz godzinę'),
    duration: z.number().min(15, 'Minimalny czas to 15 minut').max(480, 'Maksymalny czas to 8 godzin'),
    location: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

export function CreateSessionDialog({
    open,
    onOpenChange,
    athletes,
    onSuccess,
    defaultDate,
}: CreateSessionDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SessionFormValues>({
        resolver: zodResolver(sessionSchema),
        defaultValues: {
            athleteId: '',
            title: 'Trening personalny',
            description: '',
            date: defaultDate || new Date(),
            time: '10:00',
            duration: 60,
            location: '',
        },
    });

    const handleSubmit = async (values: SessionFormValues) => {
        setIsSubmitting(true);

        try {
            // Połącz datę i czas
            const [hours, minutes] = values.time.split(':').map(Number);
            const sessionDate = new Date(values.date);
            sessionDate.setHours(hours, minutes, 0, 0);

            const response = await fetch('/api/trainer/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    athleteId: values.athleteId,
                    title: values.title,
                    description: values.description,
                    date: sessionDate.toISOString(),
                    duration: values.duration,
                    location: values.location,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Nie udało się utworzyć sesji');
            }

            toast({
                title: 'Sukces!',
                description: 'Sesja treningowa została zaplanowana.',
            });

            form.reset();
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            toast({
                title: 'Błąd',
                description: error instanceof Error ? error.message : 'Nie udało się utworzyć sesji',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const timeSlots: string[] = [];
    for (let h = 6; h <= 22; h++) {
        for (let m = 0; m < 60; m += 30) {
            timeSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

    const durationOptions = [
        { value: 30, label: '30 minut' },
        { value: 45, label: '45 minut' },
        { value: 60, label: '1 godzina' },
        { value: 90, label: '1.5 godziny' },
        { value: 120, label: '2 godziny' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Zaplanuj sesję treningową</DialogTitle>
                    <DialogDescription>
                        Utwórz nową sesję treningową ze sportowcem.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="athleteId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sportowiec</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Wybierz sportowca" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {athletes.map((athlete) => (
                                                <SelectItem key={athlete.id} value={athlete.id}>
                                                    {athlete.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tytuł sesji</FormLabel>
                                    <FormControl>
                                        <Input placeholder="np. Trening siłowy" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Data</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            'w-full pl-3 text-left font-normal',
                                                            !field.value && 'text-muted-foreground'
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, 'PPP', { locale: pl })
                                                        ) : (
                                                            <span>Wybierz datę</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    locale={pl}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Godzina</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <Clock className="mr-2 h-4 w-4" />
                                                    <SelectValue placeholder="Wybierz godzinę" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="max-h-60">
                                                {timeSlots.map((time) => (
                                                    <SelectItem key={time} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Czas trwania</FormLabel>
                                        <Select
                                            onValueChange={(v) => field.onChange(Number(v))}
                                            value={field.value.toString()}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Czas trwania" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {durationOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value.toString()}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lokalizacja (opcjonalnie)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input className="pl-9" placeholder="np. Siłownia XYZ" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Opis (opcjonalnie)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Dodatkowe informacje o sesji..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Anuluj
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Zaplanuj sesję
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
