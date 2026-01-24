'use client';

import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ClipboardCheck,
    CheckCircle,
    Clock,
    Loader2,
    Star,
    AlertTriangle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import useSWR, { mutate } from 'swr';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CheckIn {
    id: string;
    trainerId: string;
    weekStartDate: string;
    status: 'pending' | 'submitted' | 'reviewed';
    submittedAt?: string;
    responses?: {
        trainingRating: number;
        physicalFeeling: number;
        dietRating: number;
        hadIssues: boolean;
        issuesDescription?: string;
        additionalNotes?: string;
    };
    trainerNotes?: string;
}

function CheckInForm({
    checkIn,
    open,
    onClose,
    onSuccess,
}: {
    checkIn: CheckIn;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [trainingRating, setTrainingRating] = useState(7);
    const [physicalFeeling, setPhysicalFeeling] = useState(7);
    const [dietRating, setDietRating] = useState(7);
    const [hadIssues, setHadIssues] = useState(false);
    const [issuesDescription, setIssuesDescription] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/check-ins/${checkIn.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    responses: {
                        trainingRating,
                        physicalFeeling,
                        dietRating,
                        hadIssues,
                        issuesDescription: hadIssues ? issuesDescription : undefined,
                        additionalNotes: additionalNotes || undefined,
                    },
                }),
            });

            if (res.ok) {
                toast({
                    title: 'Sukces',
                    description: 'Check-in został wysłany do trenera.',
                });
                onSuccess();
                onClose();
            } else {
                throw new Error('Failed to submit');
            }
        } catch (error) {
            toast({
                title: 'Błąd',
                description: 'Nie udało się wysłać check-inu.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRatingEmoji = (value: number) => {
        if (value >= 9) return '🔥';
        if (value >= 7) return '😊';
        if (value >= 5) return '😐';
        if (value >= 3) return '😔';
        return '😢';
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tygodniowy Check-in</DialogTitle>
                    <DialogDescription>
                        Tydzień od {format(new Date(checkIn.weekStartDate), 'd MMMM yyyy', { locale: pl })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Training Rating */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Jak oceniasz swój tydzień treningowy?</Label>
                            <span className="text-2xl">{getRatingEmoji(trainingRating)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Slider
                                value={[trainingRating]}
                                onValueChange={([v]) => setTrainingRating(v)}
                                min={1}
                                max={10}
                                step={1}
                                className="flex-1"
                            />
                            <span className="w-12 text-center text-xl font-bold">{trainingRating}</span>
                        </div>
                    </div>

                    {/* Physical Feeling */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Jak się czujesz fizycznie?</Label>
                            <span className="text-2xl">{getRatingEmoji(physicalFeeling)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Slider
                                value={[physicalFeeling]}
                                onValueChange={([v]) => setPhysicalFeeling(v)}
                                min={1}
                                max={10}
                                step={1}
                                className="flex-1"
                            />
                            <span className="w-12 text-center text-xl font-bold">{physicalFeeling}</span>
                        </div>
                    </div>

                    {/* Diet Rating */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Jak oceniasz swoją dietę?</Label>
                            <span className="text-2xl">{getRatingEmoji(dietRating)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Slider
                                value={[dietRating]}
                                onValueChange={([v]) => setDietRating(v)}
                                min={1}
                                max={10}
                                step={1}
                                className="flex-1"
                            />
                            <span className="w-12 text-center text-xl font-bold">{dietRating}</span>
                        </div>
                    </div>

                    {/* Issues Toggle */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="hadIssues">Czy miałeś jakieś problemy/kontuzje?</Label>
                            <Switch
                                id="hadIssues"
                                checked={hadIssues}
                                onCheckedChange={setHadIssues}
                            />
                        </div>
                        {hadIssues && (
                            <Textarea
                                placeholder="Opisz problemy..."
                                value={issuesDescription}
                                onChange={(e) => setIssuesDescription(e.target.value)}
                                rows={3}
                            />
                        )}
                    </div>

                    {/* Additional Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Dodatkowe uwagi (opcjonalne)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Cokolwiek chcesz przekazać trenerowi..."
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Anuluj
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Wyślij Check-in
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CompletedCheckInCard({ checkIn }: { checkIn: CheckIn }) {
    const getRatingColor = (rating: number) => {
        if (rating >= 8) return 'text-green-500';
        if (rating >= 5) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="space-y-4">
            {checkIn.responses && (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-secondary">
                            <p className="text-xs text-muted-foreground mb-1">Trening</p>
                            <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.trainingRating)}`}>
                                {checkIn.responses.trainingRating}/10
                            </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-secondary">
                            <p className="text-xs text-muted-foreground mb-1">Samopoczucie</p>
                            <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.physicalFeeling)}`}>
                                {checkIn.responses.physicalFeeling}/10
                            </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-secondary">
                            <p className="text-xs text-muted-foreground mb-1">Dieta</p>
                            <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.dietRating)}`}>
                                {checkIn.responses.dietRating}/10
                            </p>
                        </div>
                    </div>

                    {checkIn.responses.hadIssues && (
                        <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <p className="text-sm font-medium text-orange-800">Zgłoszone problemy:</p>
                            </div>
                            <p className="text-sm text-orange-700">
                                {checkIn.responses.issuesDescription || 'Brak opisu'}
                            </p>
                        </div>
                    )}

                    {checkIn.responses.additionalNotes && (
                        <div className="rounded-md border bg-muted p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Twoje uwagi:</p>
                            <p className="text-sm">{checkIn.responses.additionalNotes}</p>
                        </div>
                    )}
                </>
            )}

            {checkIn.trainerNotes && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-medium text-blue-800">Komentarz trenera:</p>
                    </div>
                    <p className="text-sm text-blue-700">{checkIn.trainerNotes}</p>
                </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
                Wypełniono: {checkIn.submittedAt
                    ? format(new Date(checkIn.submittedAt), 'd MMMM yyyy, HH:mm', { locale: pl })
                    : '-'}
            </p>
        </div>
    );
}

export default function AthleteCheckInPage() {
    const { data, error, isLoading } = useSWR<{ checkIns: CheckIn[] }>(
        '/api/check-ins',
        fetcher
    );

    const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);

    const handleRefresh = () => {
        mutate('/api/check-ins');
    };

    const pendingCheckIns = data?.checkIns?.filter((c) => c.status === 'pending') || [];
    const completedCheckIns = data?.checkIns?.filter((c) => c.status !== 'pending') || [];

    if (error) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <Card className="border-destructive">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                        <p className="text-destructive">Nie udało się załadować check-inów.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <h1 className="font-headline text-3xl font-bold">Tygodniowe Check-iny</h1>
                <p className="text-muted-foreground">
                    Wypełniaj tygodniowe raporty dla swojego trenera
                </p>
            </div>

            {/* Pending Check-ins */}
            {pendingCheckIns.length > 0 && (
                <Card className="mb-6 border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Do wypełnienia
                        </CardTitle>
                        <CardDescription>
                            Masz {pendingCheckIns.length} check-in{pendingCheckIns.length > 1 ? 'ów' : ''} do wypełnienia
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pendingCheckIns.map((checkIn) => (
                                <div
                                    key={checkIn.id}
                                    className="flex items-center justify-between rounded-lg border bg-white p-4"
                                >
                                    <div>
                                        <p className="font-medium">
                                            Tydzień od {format(new Date(checkIn.weekStartDate), 'd MMMM', { locale: pl })}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Oczekuje na wypełnienie
                                        </p>
                                    </div>
                                    <Button onClick={() => setSelectedCheckIn(checkIn)}>
                                        Wypełnij
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Completed Check-ins */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-green-500" />
                        Historia Check-inów
                    </CardTitle>
                    <CardDescription>
                        Twoje poprzednie raporty tygodniowe
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                            ))}
                        </div>
                    ) : completedCheckIns.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {completedCheckIns.map((checkIn) => (
                                <AccordionItem key={checkIn.id} value={checkIn.id}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${checkIn.status === 'reviewed'
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    <CheckCircle className="h-4 w-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium">
                                                        Tydzień od {format(new Date(checkIn.weekStartDate), 'd MMMM', { locale: pl })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {checkIn.submittedAt
                                                            ? `Wysłano ${format(new Date(checkIn.submittedAt), 'd MMM', { locale: pl })}`
                                                            : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    checkIn.status === 'reviewed'
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-blue-500 text-white'
                                                }
                                            >
                                                {checkIn.status === 'reviewed' ? 'Przejrzany' : 'Wysłany'}
                                            </Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4">
                                        <CompletedCheckInCard checkIn={checkIn} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-12">
                            <ClipboardCheck className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                Nie masz jeszcze żadnych check-inów.
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Twój trener wyśle Ci pierwszy check-in wkrótce.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Check-in Form Dialog */}
            {selectedCheckIn && (
                <CheckInForm
                    checkIn={selectedCheckIn}
                    open={!!selectedCheckIn}
                    onClose={() => setSelectedCheckIn(null)}
                    onSuccess={handleRefresh}
                />
            )}
        </div>
    );
}
