'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useDoc, useCreateDoc } from '@/lib/db-hooks';

interface SurveyQuestion {
    id: string;
    type: 'open' | 'closed';
    text: string;
    options: string[];
    required: boolean;
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    trainerId?: string;
}

export default function NewSurveyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const { createDoc, isLoading: creating } = useCreateDoc();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<SurveyQuestion[]>([
        { id: uuidv4(), type: 'open', text: '', options: [], required: true }
    ]);
    const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
    const [status, setStatus] = useState<'draft' | 'active'>('active');

    // Get current user profile
    const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || null);

    // Get trainer's athletes
    const { data: athletes, isLoading: athletesLoading } = useCollection<UserProfile>(
        user ? 'users' : null,
        { role: 'athlete', trainerId: user?.uid }
    );

    const addQuestion = () => {
        setQuestions([
            ...questions,
            { id: uuidv4(), type: 'open', text: '', options: [], required: true }
        ]);
    };

    const removeQuestion = (id: string) => {
        if (questions.length > 1) {
            setQuestions(questions.filter(q => q.id !== id));
        }
    };

    const updateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
        setQuestions(questions.map(q =>
            q.id === id ? { ...q, ...updates } : q
        ));
    };

    const addOption = (questionId: string) => {
        setQuestions(questions.map(q =>
            q.id === questionId
                ? { ...q, options: [...q.options, ''] }
                : q
        ));
    };

    const updateOption = (questionId: string, optionIndex: number, value: string) => {
        setQuestions(questions.map(q =>
            q.id === questionId
                ? {
                    ...q,
                    options: q.options.map((opt, idx) => idx === optionIndex ? value : opt)
                }
                : q
        ));
    };

    const removeOption = (questionId: string, optionIndex: number) => {
        setQuestions(questions.map(q =>
            q.id === questionId
                ? { ...q, options: q.options.filter((_, idx) => idx !== optionIndex) }
                : q
        ));
    };

    const toggleAthlete = (athleteId: string) => {
        setSelectedAthletes(prev =>
            prev.includes(athleteId)
                ? prev.filter(id => id !== athleteId)
                : [...prev, athleteId]
        );
    };

    const selectAllAthletes = () => {
        if (athletes) {
            setSelectedAthletes(athletes.map(a => a.id));
        }
    };

    const deselectAllAthletes = () => {
        setSelectedAthletes([]);
    };

    const handleSubmit = async () => {
        // Validation
        if (!title.trim()) {
            toast({ title: 'Błąd', description: 'Tytuł jest wymagany', variant: 'destructive' });
            return;
        }

        if (questions.some(q => !q.text.trim())) {
            toast({ title: 'Błąd', description: 'Wszystkie pytania muszą mieć treść', variant: 'destructive' });
            return;
        }

        if (questions.some(q => q.type === 'closed' && q.options.length < 2)) {
            toast({ title: 'Błąd', description: 'Pytania zamknięte muszą mieć co najmniej 2 opcje', variant: 'destructive' });
            return;
        }

        if (selectedAthletes.length === 0) {
            toast({ title: 'Błąd', description: 'Musisz wybrać co najmniej jednego sportowca', variant: 'destructive' });
            return;
        }

        try {
            await createDoc('surveys', {
                title,
                description,
                trainerId: user?.uid,
                trainerName: userProfile?.name || 'Trener',
                questions: questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    text: q.text,
                    options: q.type === 'closed' ? q.options.filter(o => o.trim()) : [],
                    required: q.required,
                })),
                assignedAthleteIds: selectedAthletes,
                status,
            });

            toast({ title: 'Sukces', description: 'Ankieta została utworzona' });
            router.push('/trainer/surveys');
        } catch (error) {
            console.error('Failed to create survey:', error);
            toast({ title: 'Błąd', description: 'Nie udało się utworzyć ankiety', variant: 'destructive' });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <h1 className="font-headline text-3xl font-bold">Nowa Ankieta</h1>
                <p className="text-muted-foreground">Utwórz ankietę z pytaniami otwartymi i zamkniętymi</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left column - Survey form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informacje podstawowe</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Tytuł ankiety *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="np. Ankieta samopoczucia"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Opis (opcjonalny)</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Krótki opis ankiety..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={status} onValueChange={(v: 'draft' | 'active') => setStatus(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Aktywna (widoczna dla sportowców)</SelectItem>
                                        <SelectItem value="draft">Szkic (niewidoczna)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pytania</CardTitle>
                            <CardDescription>Dodaj pytania otwarte lub zamknięte</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {questions.map((question, qIndex) => (
                                <div key={question.id} className="p-4 rounded-lg border space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    Pytanie {qIndex + 1}
                                                </span>
                                                <Select
                                                    value={question.type}
                                                    onValueChange={(v: 'open' | 'closed') => updateQuestion(question.id, {
                                                        type: v,
                                                        options: v === 'closed' && question.options.length === 0 ? ['', ''] : question.options
                                                    })}
                                                >
                                                    <SelectTrigger className="w-40">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="open">Otwarte</SelectItem>
                                                        <SelectItem value="closed">Zamknięte</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Input
                                                value={question.text}
                                                onChange={e => updateQuestion(question.id, { text: e.target.value })}
                                                placeholder="Treść pytania..."
                                            />

                                            {question.type === 'closed' && (
                                                <div className="pl-4 space-y-2">
                                                    <Label className="text-sm text-muted-foreground">Opcje odpowiedzi:</Label>
                                                    {question.options.map((option, oIndex) => (
                                                        <div key={oIndex} className="flex items-center gap-2">
                                                            <Input
                                                                value={option}
                                                                onChange={e => updateOption(question.id, oIndex, e.target.value)}
                                                                placeholder={`Opcja ${oIndex + 1}`}
                                                                className="flex-1"
                                                            />
                                                            {question.options.length > 2 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeOption(question.id, oIndex)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addOption(question.id)}
                                                    >
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Dodaj opcję
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`required-${question.id}`}
                                                    checked={question.required}
                                                    onCheckedChange={(checked) =>
                                                        updateQuestion(question.id, { required: !!checked })
                                                    }
                                                />
                                                <Label htmlFor={`required-${question.id}`} className="text-sm">
                                                    Wymagane
                                                </Label>
                                            </div>
                                        </div>

                                        {questions.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeQuestion(question.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <Button variant="outline" onClick={addQuestion} className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Dodaj pytanie
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right column - Athletes selection */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Przypisz sportowców</CardTitle>
                            <CardDescription>Wybierz kto otrzyma ankietę</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {athletesLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : athletes && athletes.length > 0 ? (
                                <>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={selectAllAthletes}>
                                            Zaznacz wszystkich
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={deselectAllAthletes}>
                                            Odznacz
                                        </Button>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {athletes.map(athlete => (
                                            <div
                                                key={athlete.id}
                                                className={`flex items-center space-x-3 p-2 rounded-lg border cursor-pointer transition-colors ${selectedAthletes.includes(athlete.id)
                                                        ? 'bg-primary/10 border-primary'
                                                        : 'hover:bg-secondary'
                                                    }`}
                                                onClick={() => toggleAthlete(athlete.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedAthletes.includes(athlete.id)}
                                                    onCheckedChange={() => toggleAthlete(athlete.id)}
                                                />
                                                <div>
                                                    <p className="font-medium text-sm">{athlete.name}</p>
                                                    <p className="text-xs text-muted-foreground">{athlete.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Wybrano: {selectedAthletes.length} z {athletes.length}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Nie masz jeszcze przypisanych sportowców
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Button
                        onClick={handleSubmit}
                        disabled={creating}
                        className="w-full"
                        size="lg"
                    >
                        {creating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Tworzenie...
                            </>
                        ) : (
                            'Utwórz Ankietę'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
