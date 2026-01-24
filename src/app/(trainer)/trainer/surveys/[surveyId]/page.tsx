'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeft, Users, CheckCircle, Clock, User, MessageSquare, Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useDoc, useUpdateDoc } from '@/lib/db-hooks';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SurveyQuestion {
    id: string;
    type: 'open' | 'closed';
    text: string;
    options?: string[];
    required: boolean;
}

interface Survey {
    id: string;
    title: string;
    description?: string;
    trainerId: string;
    trainerName: string;
    questions: SurveyQuestion[];
    assignedAthleteIds: string[];
    status: 'draft' | 'active' | 'closed';
    createdAt: string;
    updatedAt: string;
}

interface SurveyAnswer {
    questionId: string;
    answer: string;
}

interface SurveyResponse {
    id: string;
    surveyId: string;
    athleteId: string;
    athleteName: string;
    answers: SurveyAnswer[];
    submittedAt: string;
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Szkic', variant: 'secondary' },
    active: { label: 'Aktywna', variant: 'default' },
    closed: { label: 'Zamknięta', variant: 'outline' },
};

export default function SurveyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const { updateDoc } = useUpdateDoc();
    const surveyId = params.surveyId as string;

    // Get survey
    const { data: survey, isLoading: surveyLoading, refetch: refetchSurvey } = useDoc<Survey>(
        'surveys',
        surveyId
    );

    // Get responses for this survey
    const { data: responses, isLoading: responsesLoading } = useCollection<SurveyResponse>(
        surveyId ? 'surveyResponses' : null,
        { surveyId }
    );

    // Get assigned athletes
    const { data: athletes } = useCollection<UserProfile>(
        survey?.assignedAthleteIds?.length ? 'users' : null,
        { _id: { $in: survey?.assignedAthleteIds } }
    );

    const getAthleteResponse = (athleteId: string) => {
        return responses?.find(r => r.athleteId === athleteId);
    };

    const getAnswerForQuestion = (response: SurveyResponse, questionId: string) => {
        return response.answers.find(a => a.questionId === questionId)?.answer || '-';
    };

    const handleStatusChange = async (newStatus: 'active' | 'closed') => {
        try {
            await updateDoc('surveys', surveyId, { status: newStatus });
            refetchSurvey();
            toast({ title: 'Sukces', description: `Status zmieniony na: ${statusLabels[newStatus].label}` });
        } catch (error) {
            toast({ title: 'Błąd', description: 'Nie udało się zmienić statusu', variant: 'destructive' });
        }
    };

    if (surveyLoading) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">Nie znaleziono ankiety</p>
                        <Button asChild className="mt-4">
                            <Link href="/trainer/surveys">Wróć do listy</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const status = statusLabels[survey.status] || statusLabels.draft;
    const responseCount = responses?.length || 0;
    const assignedCount = survey.assignedAthleteIds?.length || 0;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href="/trainer/surveys">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Powrót do listy
                    </Link>
                </Button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="font-headline text-3xl font-bold">{survey.title}</h1>
                        {survey.description && (
                            <p className="text-muted-foreground mt-1">{survey.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <span className="text-sm text-muted-foreground">
                                Utworzona: {format(new Date(survey.createdAt), 'd MMMM yyyy', { locale: pl })}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {survey.status === 'active' && (
                            <Button variant="outline" onClick={() => handleStatusChange('closed')}>
                                Zamknij ankietę
                            </Button>
                        )}
                        {survey.status === 'closed' && (
                            <Button variant="outline" onClick={() => handleStatusChange('active')}>
                                Otwórz ponownie
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Pytań</CardDescription>
                        <CardTitle className="text-4xl">{survey.questions.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Przypisanych sportowców</CardDescription>
                        <CardTitle className="text-4xl flex items-center gap-2">
                            <Users className="h-6 w-6" />
                            {assignedCount}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Odpowiedzi</CardDescription>
                        <CardTitle className="text-4xl flex items-center gap-2">
                            {responseCount === assignedCount && assignedCount > 0 ? (
                                <CheckCircle className="h-6 w-6 text-green-500" />
                            ) : (
                                <Clock className="h-6 w-6 text-muted-foreground" />
                            )}
                            {responseCount}/{assignedCount}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="responses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="responses">Odpowiedzi</TabsTrigger>
                    <TabsTrigger value="questions">Pytania</TabsTrigger>
                    <TabsTrigger value="athletes">Sportowcy</TabsTrigger>
                </TabsList>

                {/* Responses Tab */}
                <TabsContent value="responses">
                    <Card>
                        <CardHeader>
                            <CardTitle>Odpowiedzi sportowców</CardTitle>
                            <CardDescription>
                                Przegląd odpowiedzi na ankietę
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {responsesLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : responses && responses.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full">
                                    {responses.map(response => (
                                        <AccordionItem key={response.id} value={response.id}>
                                            <AccordionTrigger>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>
                                                            {response.athleteName.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-left">
                                                        <p className="font-medium">{response.athleteName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(response.submittedAt), 'd MMM yyyy, HH:mm', { locale: pl })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4 pl-11">
                                                    {survey.questions.map((question, qIndex) => (
                                                        <div key={question.id} className="border-l-2 border-primary/20 pl-4">
                                                            <p className="text-sm font-medium text-muted-foreground">
                                                                {qIndex + 1}. {question.text}
                                                            </p>
                                                            <p className="mt-1">
                                                                {getAnswerForQuestion(response, question.id)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            ) : (
                                <div className="text-center py-12">
                                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">Brak odpowiedzi</p>
                                    <p className="text-sm text-muted-foreground">
                                        Sportowcy jeszcze nie wypełnili ankiety
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Questions Tab */}
                <TabsContent value="questions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pytania w ankiecie</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {survey.questions.map((question, index) => (
                                <div key={question.id} className="p-4 rounded-lg border">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    Pytanie {index + 1}
                                                </span>
                                                <Badge variant="outline">
                                                    {question.type === 'open' ? 'Otwarte' : 'Zamknięte'}
                                                </Badge>
                                                {question.required && (
                                                    <Badge variant="secondary">Wymagane</Badge>
                                                )}
                                            </div>
                                            <p className="font-medium">{question.text}</p>
                                            {question.type === 'closed' && question.options && (
                                                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                                    {question.options.map((opt, i) => (
                                                        <li key={i}>• {opt}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Athletes Tab */}
                <TabsContent value="athletes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Przypisani sportowcy</CardTitle>
                            <CardDescription>
                                Status wypełnienia ankiety przez każdego sportowca
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {survey.assignedAthleteIds.map(athleteId => {
                                    const athlete = athletes?.find(a => a.id === athleteId);
                                    const response = getAthleteResponse(athleteId);

                                    return (
                                        <div
                                            key={athleteId}
                                            className="flex items-center justify-between p-3 rounded-lg border"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback>
                                                        {athlete?.name?.charAt(0).toUpperCase() || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{athlete?.name || 'Nieznany'}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {athlete?.email || athleteId}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                {response ? (
                                                    <Badge className="bg-green-500">
                                                        <CheckCircle className="mr-1 h-3 w-3" />
                                                        Wypełniona
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        <Clock className="mr-1 h-3 w-3" />
                                                        Oczekuje
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
