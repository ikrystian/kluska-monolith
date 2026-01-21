'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Clock, MapPin, Loader2, Calendar, User, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export interface TrainingSessionData {
    id: string;
    trainerId: string;
    trainerName: string;
    athleteId: string;
    athleteName: string;
    title: string;
    description?: string;
    date: string;
    duration: number;
    location?: string;
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
}

interface SessionDetailsDialogProps {
    session: TrainingSessionData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
    isTrainer: boolean;
}

const statusConfig = {
    scheduled: { label: 'Zaplanowana', variant: 'secondary' as const, icon: Calendar },
    confirmed: { label: 'Potwierdzona', variant: 'default' as const, icon: CheckCircle },
    completed: { label: 'Ukończona', variant: 'outline' as const, icon: CheckCircle },
    cancelled: { label: 'Anulowana', variant: 'destructive' as const, icon: XCircle },
};

export function SessionDetailsDialog({
    session,
    open,
    onOpenChange,
    onUpdate,
    isTrainer,
}: SessionDetailsDialogProps) {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editedSession, setEditedSession] = useState<Partial<TrainingSessionData>>({});

    if (!session) return null;

    const sessionDate = new Date(session.date);
    const statusInfo = statusConfig[session.status];

    const handleStartEdit = () => {
        setEditedSession({
            title: session.title,
            description: session.description,
            location: session.location,
            notes: session.notes,
            status: session.status,
        });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditedSession({});
        setIsEditing(false);
    };

    const handleSaveEdit = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/trainer/sessions/${session.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editedSession),
            });

            if (!response.ok) {
                throw new Error('Nie udało się zaktualizować sesji');
            }

            toast({
                title: 'Sukces!',
                description: 'Sesja została zaktualizowana.',
            });

            setIsEditing(false);
            onUpdate();
        } catch (error) {
            toast({
                title: 'Błąd',
                description: error instanceof Error ? error.message : 'Nie udało się zaktualizować sesji',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/trainer/sessions/${session.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'confirmed' }),
            });

            if (!response.ok) {
                throw new Error('Nie udało się potwierdzić sesji');
            }

            toast({
                title: 'Sukces!',
                description: 'Potwierdziłeś udział w sesji.',
            });

            onUpdate();
        } catch (error) {
            toast({
                title: 'Błąd',
                description: error instanceof Error ? error.message : 'Nie udało się potwierdzić sesji',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/trainer/sessions/${session.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Nie udało się usunąć sesji');
            }

            toast({
                title: 'Sukces!',
                description: 'Sesja została usunięta.',
            });

            onOpenChange(false);
            onUpdate();
        } catch (error) {
            toast({
                title: 'Błąd',
                description: error instanceof Error ? error.message : 'Nie udało się usunąć sesji',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle>{isEditing ? 'Edytuj sesję' : session.title}</DialogTitle>
                        <Badge variant={statusInfo.variant}>
                            <statusInfo.icon className="mr-1 h-3 w-3" />
                            {statusInfo.label}
                        </Badge>
                    </div>
                    <DialogDescription>
                        {isEditing ? 'Edytuj szczegóły sesji treningowej.' : 'Szczegóły sesji treningowej.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {isEditing ? (
                        <>
                            <div className="space-y-2">
                                <Label>Tytuł</Label>
                                <Input
                                    value={editedSession.title || ''}
                                    onChange={(e) => setEditedSession({ ...editedSession, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Opis</Label>
                                <Textarea
                                    value={editedSession.description || ''}
                                    onChange={(e) => setEditedSession({ ...editedSession, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Lokalizacja</Label>
                                <Input
                                    value={editedSession.location || ''}
                                    onChange={(e) => setEditedSession({ ...editedSession, location: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={editedSession.status}
                                    onValueChange={(v) => setEditedSession({ ...editedSession, status: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="scheduled">Zaplanowana</SelectItem>
                                        <SelectItem value="confirmed">Potwierdzona</SelectItem>
                                        <SelectItem value="completed">Ukończona</SelectItem>
                                        <SelectItem value="cancelled">Anulowana</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Notatki trenera</Label>
                                <Textarea
                                    value={editedSession.notes || ''}
                                    onChange={(e) => setEditedSession({ ...editedSession, notes: e.target.value })}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                    {isTrainer ? 'Sportowiec:' : 'Trener:'}
                                </span>
                                <span className="font-medium">
                                    {isTrainer ? session.athleteName : session.trainerName}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Data:</span>
                                <span className="font-medium">
                                    {format(sessionDate, 'EEEE, d MMMM yyyy', { locale: pl })}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Godzina:</span>
                                <span className="font-medium">
                                    {format(sessionDate, 'HH:mm')} ({session.duration} min)
                                </span>
                            </div>

                            {session.location && (
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Miejsce:</span>
                                    <span className="font-medium">{session.location}</span>
                                </div>
                            )}

                            {session.description && (
                                <div className="border-t pt-4">
                                    <p className="text-sm text-muted-foreground mb-1">Opis:</p>
                                    <p className="text-sm">{session.description}</p>
                                </div>
                            )}

                            {session.notes && isTrainer && (
                                <div className="border-t pt-4">
                                    <p className="text-sm text-muted-foreground mb-1">Notatki:</p>
                                    <p className="text-sm">{session.notes}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
                                Anuluj
                            </Button>
                            <Button onClick={handleSaveEdit} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Zapisz
                            </Button>
                        </>
                    ) : (
                        <>
                            {isTrainer ? (
                                <>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" disabled={isLoading}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Usuń
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Czy na pewno chcesz usunąć sesję?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Ta operacja jest nieodwracalna. Sesja zostanie trwale usunięta.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                                    Usuń
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button variant="outline" size="sm" onClick={handleStartEdit} disabled={isLoading}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edytuj
                                    </Button>
                                </>
                            ) : (
                                session.status === 'scheduled' && (
                                    <Button onClick={handleConfirm} disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Potwierdź udział
                                    </Button>
                                )
                            )}
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Zamknij
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
