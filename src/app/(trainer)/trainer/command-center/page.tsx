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
    Users,
    AlertTriangle,
    Trophy,
    ClipboardCheck,
    Send,
    Loader2,
    CheckCircle,
    Clock,
    User as UserIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
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
    DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CommandCenterData {
    athletes: {
        id: string;
        name: string;
        email: string;
        hasWorkedOutThisWeek: boolean;
    }[];
    missedWorkouts: {
        id: string;
        name: string;
        email: string;
    }[];
    recentRecords: {
        id: string;
        athleteId: string;
        athleteName: string;
        exerciseName: string;
        type: string;
        value: number;
        reps?: number;
        achievedAt: string;
    }[];
    pendingCheckInAthletes: {
        checkInId: string;
        athleteId: string;
        athleteName: string;
        weekStartDate: string;
    }[];
    checkInStats: {
        pending: number;
        submitted: number;
        total: number;
    };
    summary: {
        totalAthletes: number;
        activeThisWeek: number;
        pendingCheckIns: number;
        newRecords: number;
    };
}

interface CheckIn {
    id: string;
    athleteId: string;
    athleteName: string;
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

function SendCheckInDialog({ athletes, onSuccess }: { athletes: CommandCenterData['athletes']; onSuccess: () => void }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);

    const handleToggle = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === athletes.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(athletes.map((a) => a.id));
        }
    };

    const handleSend = async () => {
        if (selectedIds.length === 0) {
            toast({
                title: 'Błąd',
                description: 'Wybierz co najmniej jednego sportowca.',
                variant: 'destructive',
            });
            return;
        }

        setIsSending(true);
        try {
            const res = await fetch('/api/check-ins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ athleteIds: selectedIds }),
            });

            if (res.ok) {
                toast({
                    title: 'Sukces',
                    description: `Wysłano check-in do ${selectedIds.length} sportowców.`,
                });
                setOpen(false);
                setSelectedIds([]);
                onSuccess();
            } else {
                throw new Error('Failed to send');
            }
        } catch (error) {
            toast({
                title: 'Błąd',
                description: 'Nie udało się wysłać check-inów.',
                variant: 'destructive',
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Send className="mr-2 h-4 w-4" />
                    Wyślij Check-in
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Wyślij tygodniowy check-in</DialogTitle>
                    <DialogDescription>
                        Wybierz sportowców, do których chcesz wysłać check-in na ten tydzień.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="mb-4 flex items-center justify-between">
                        <Label className="text-sm text-muted-foreground">
                            Wybrano: {selectedIds.length} / {athletes.length}
                        </Label>
                        <Button variant="link" size="sm" onClick={handleSelectAll}>
                            {selectedIds.length === athletes.length ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
                        </Button>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                        {athletes.map((athlete) => (
                            <div
                                key={athlete.id}
                                className="flex items-center space-x-3 rounded-md border p-3"
                            >
                                <Checkbox
                                    id={`athlete-${athlete.id}`}
                                    checked={selectedIds.includes(athlete.id)}
                                    onCheckedChange={() => handleToggle(athlete.id)}
                                />
                                <Label
                                    htmlFor={`athlete-${athlete.id}`}
                                    className="flex-1 cursor-pointer"
                                >
                                    {athlete.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
                        Anuluj
                    </Button>
                    <Button onClick={handleSend} disabled={isSending}>
                        {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Wyślij
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CheckInReviewCard({ checkIn, onUpdate }: { checkIn: CheckIn; onUpdate: () => void }) {
    const { toast } = useToast();
    const [trainerNotes, setTrainerNotes] = useState(checkIn.trainerNotes || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveNotes = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/check-ins/${checkIn.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trainerNotes, markAsReviewed: true }),
            });

            if (res.ok) {
                toast({ title: 'Sukces', description: 'Notatki zapisane.' });
                onUpdate();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast({
                title: 'Błąd',
                description: 'Nie udało się zapisać notatek.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 8) return 'text-green-500';
        if (rating >= 5) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="space-y-4">
            {checkIn.responses ? (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Trening</p>
                            <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.trainingRating)}`}>
                                {checkIn.responses.trainingRating}/10
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Samopoczucie</p>
                            <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.physicalFeeling)}`}>
                                {checkIn.responses.physicalFeeling}/10
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Dieta</p>
                            <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.dietRating)}`}>
                                {checkIn.responses.dietRating}/10
                            </p>
                        </div>
                    </div>

                    {checkIn.responses.hadIssues && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3">
                            <p className="text-sm font-medium text-red-800">⚠️ Zgłoszono problemy:</p>
                            <p className="text-sm text-red-700">
                                {checkIn.responses.issuesDescription || 'Brak opisu'}
                            </p>
                        </div>
                    )}

                    {checkIn.responses.additionalNotes && (
                        <div className="rounded-md border bg-muted p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Dodatkowe uwagi:</p>
                            <p className="text-sm">{checkIn.responses.additionalNotes}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="trainerNotes">Notatki trenera:</Label>
                        <Textarea
                            id="trainerNotes"
                            value={trainerNotes}
                            onChange={(e) => setTrainerNotes(e.target.value)}
                            placeholder="Dodaj swoje notatki..."
                            rows={3}
                        />
                        <Button onClick={handleSaveNotes} disabled={isSaving} size="sm">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {checkIn.status === 'reviewed' ? 'Aktualizuj' : 'Zapisz i oznacz jako przejrzane'}
                        </Button>
                    </div>
                </>
            ) : (
                <p className="text-center text-muted-foreground py-4">
                    Oczekuje na wypełnienie przez sportowca
                </p>
            )}
        </div>
    );
}

export default function CommandCenterPage() {
    const { data, error, isLoading } = useSWR<CommandCenterData>(
        '/api/trainer/command-center',
        fetcher
    );

    const { data: checkInsData, isLoading: checkInsLoading } = useSWR<{ checkIns: CheckIn[] }>(
        '/api/check-ins?limit=20',
        fetcher
    );

    const handleRefresh = () => {
        mutate('/api/trainer/command-center');
        mutate('/api/check-ins?limit=20');
    };

    if (error) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <Card className="border-destructive">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                        <p className="text-destructive">Nie udało się załadować danych.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Centrum Dowodzenia</h1>
                    <p className="text-muted-foreground">Przegląd statusów wszystkich podopiecznych</p>
                </div>
                {data && data.athletes.length > 0 && (
                    <SendCheckInDialog athletes={data.athletes} onSuccess={handleRefresh} />
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sportowcy</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{data?.summary.totalAthletes || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    {data?.summary.activeThisWeek || 0} aktywnych w tym tygodniu
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pominięte treningi</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{data?.missedWorkouts.length || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    sportowców bez treningu (7 dni)
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nowe rekordy</CardTitle>
                        <Trophy className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{data?.summary.newRecords || 0}</div>
                                <p className="text-xs text-muted-foreground">w ostatnich 7 dniach</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Check-iny</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {data?.checkInStats.submitted || 0}/{data?.checkInStats.total || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    wypełnionych (ten tydzień)
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="alerts" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="alerts">
                        Alerty
                        {(data?.missedWorkouts.length || 0) > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {data?.missedWorkouts.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="records">
                        Rekordy
                        {(data?.summary.newRecords || 0) > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {data?.summary.newRecords}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="checkins">
                        Check-iny
                        {(data?.checkInStats.pending || 0) > 0 && (
                            <Badge className="ml-2 bg-blue-500">{data?.checkInStats.pending}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Alerts Tab */}
                <TabsContent value="alerts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sportowcy wymagający uwagi</CardTitle>
                            <CardDescription>
                                Osoby które nie trenowały w ostatnim tygodniu
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : data?.missedWorkouts && data.missedWorkouts.length > 0 ? (
                                <div className="space-y-3">
                                    {data.missedWorkouts.map((athlete) => (
                                        <div
                                            key={athlete.id}
                                            className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback>{athlete.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{athlete.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Brak treningu w ostatnim tygodniu
                                                    </p>
                                                </div>
                                            </div>
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/trainer/my-athletes/${athlete.id}`}>Zobacz profil</Link>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                                    <p className="text-muted-foreground">
                                        Wszyscy sportowcy trenowali w tym tygodniu!
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Records Tab */}
                <TabsContent value="records">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ostatnie rekordy osobiste</CardTitle>
                            <CardDescription>Pobite rekordy w ostatnich 7 dniach</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : data?.recentRecords && data.recentRecords.length > 0 ? (
                                <div className="space-y-3">
                                    {data.recentRecords.map((record) => (
                                        <div
                                            key={record.id}
                                            className="flex items-center justify-between rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                                                    <Trophy className="h-5 w-5 text-yellow-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{record.athleteName}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {record.exerciseName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">
                                                    {record.type === 'max_weight'
                                                        ? `${record.value} kg`
                                                        : record.type === 'max_reps'
                                                            ? `${record.value} powt.`
                                                            : `${record.value} sek.`}
                                                    {record.reps && record.type === 'max_weight' && (
                                                        <span className="text-sm font-normal text-muted-foreground">
                                                            {' '}
                                                            x {record.reps}
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(record.achievedAt), 'd MMM', { locale: pl })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        Brak nowych rekordów w tym tygodniu
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Check-ins Tab */}
                <TabsContent value="checkins">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tygodniowe check-iny</CardTitle>
                            <CardDescription>
                                Przegląd wypełnionych raportów tygodniowych
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {checkInsLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : checkInsData?.checkIns && checkInsData.checkIns.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full">
                                    {checkInsData.checkIns.map((checkIn) => (
                                        <AccordionItem key={checkIn.id} value={checkIn.id}>
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback>
                                                                {checkIn.athleteName.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="text-left">
                                                            <p className="font-medium">{checkIn.athleteName}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Tydzień od{' '}
                                                                {format(new Date(checkIn.weekStartDate), 'd MMM', {
                                                                    locale: pl,
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge
                                                        variant={
                                                            checkIn.status === 'submitted'
                                                                ? 'default'
                                                                : checkIn.status === 'reviewed'
                                                                    ? 'secondary'
                                                                    : 'outline'
                                                        }
                                                        className={
                                                            checkIn.status === 'submitted'
                                                                ? 'bg-blue-500'
                                                                : checkIn.status === 'reviewed'
                                                                    ? 'bg-green-500 text-white'
                                                                    : ''
                                                        }
                                                    >
                                                        {checkIn.status === 'pending' && (
                                                            <>
                                                                <Clock className="mr-1 h-3 w-3" />
                                                                Oczekuje
                                                            </>
                                                        )}
                                                        {checkIn.status === 'submitted' && (
                                                            <>
                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                                Wypełniony
                                                            </>
                                                        )}
                                                        {checkIn.status === 'reviewed' && (
                                                            <>
                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                                Przejrzany
                                                            </>
                                                        )}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-4">
                                                <CheckInReviewCard checkIn={checkIn} onUpdate={handleRefresh} />
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <div className="text-center py-8">
                                    <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground mb-4">
                                        Brak check-inów. Wyślij pierwszy check-in do swoich sportowców.
                                    </p>
                                    {data && data.athletes.length > 0 && (
                                        <SendCheckInDialog athletes={data.athletes} onSuccess={handleRefresh} />
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
