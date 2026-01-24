'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PlusCircle, ClipboardList, Eye, Users, CheckCircle, Clock, Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useDoc } from '@/lib/db-hooks';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Survey {
    id: string;
    title: string;
    description?: string;
    trainerId: string;
    trainerName: string;
    questions: {
        id: string;
        type: 'open' | 'closed';
        text: string;
        options?: string[];
        required: boolean;
    }[];
    assignedAthleteIds: string[];
    status: 'draft' | 'active' | 'closed';
    createdAt: string;
    updatedAt: string;
}

interface SurveyResponse {
    id: string;
    surveyId: string;
    athleteId: string;
    athleteName: string;
    submittedAt: string;
}

interface UserProfile {
    id: string;
    name: string;
    role: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Szkic', variant: 'secondary' },
    active: { label: 'Aktywna', variant: 'default' },
    closed: { label: 'Zamknięta', variant: 'outline' },
};

export default function SurveysPage() {
    const { toast } = useToast();
    const { user } = useUser();

    // Get current user profile
    const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || null);

    // Get all surveys for this trainer
    const { data: surveys, isLoading: surveysLoading, refetch: refetchSurveys } = useCollection<Survey>(
        user ? 'surveys' : null,
        { trainerId: user?.uid },
        { sort: { createdAt: -1 } }
    );

    // Get all responses
    const { data: allResponses } = useCollection<SurveyResponse>(
        user ? 'surveyResponses' : null,
        {}
    );

    const getResponseCount = (surveyId: string) => {
        return allResponses?.filter(r => r.surveyId === surveyId).length || 0;
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Ankiety</h1>
                    <p className="text-muted-foreground">Twórz i zarządzaj ankietami dla swoich sportowców</p>
                </div>
                <Button asChild>
                    <Link href="/trainer/surveys/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nowa Ankieta
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Lista Ankiet</CardTitle>
                    <CardDescription>
                        Wszystkie Twoje ankiety i ich statystyki
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {surveysLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : surveys && surveys.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tytuł</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Pytania</TableHead>
                                    <TableHead>Przypisani</TableHead>
                                    <TableHead>Odpowiedzi</TableHead>
                                    <TableHead>Data utworzenia</TableHead>
                                    <TableHead className="text-right">Akcje</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {surveys.map((survey) => {
                                    const responseCount = getResponseCount(survey.id);
                                    const assignedCount = survey.assignedAthleteIds?.length || 0;
                                    const status = statusLabels[survey.status] || statusLabels.draft;

                                    return (
                                        <TableRow key={survey.id}>
                                            <TableCell className="font-medium">{survey.title}</TableCell>
                                            <TableCell>
                                                <Badge variant={status.variant}>{status.label}</Badge>
                                            </TableCell>
                                            <TableCell>{survey.questions?.length || 0}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    {assignedCount}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {responseCount === assignedCount && assignedCount > 0 ? (
                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    {responseCount}/{assignedCount}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(survey.createdAt), 'd MMM yyyy', { locale: pl })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/trainer/surveys/${survey.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Zobacz
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-xl font-semibold">Brak ankiet</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Nie masz jeszcze żadnych ankiet. Utwórz pierwszą ankietę, aby zacząć.
                            </p>
                            <Button className="mt-4" asChild>
                                <Link href="/trainer/surveys/new">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Utwórz Ankietę
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
