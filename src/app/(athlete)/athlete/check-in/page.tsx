'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
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
    Upload,
    Trash2,
    Camera,
    Weight,
    Ruler,
    Pencil,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUploadThing } from '@/lib/uploadthing';

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
    measurements?: {
        weight?: number;
        circumferences?: {
            biceps?: number;
            chest?: number;
            waist?: number;
            hips?: number;
            thigh?: number;
        };
        photoURLs?: string[];
    };
    trainerNotes?: string;
}

function CheckInForm({
    checkIn,
    open,
    onClose,
    onSuccess,
    mode = 'create',
}: {
    checkIn: CheckIn;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode?: 'create' | 'edit';
}) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [trainingRating, setTrainingRating] = useState(7);
    const [physicalFeeling, setPhysicalFeeling] = useState(7);
    const [dietRating, setDietRating] = useState(7);
    const [hadIssues, setHadIssues] = useState(false);
    const [issuesDescription, setIssuesDescription] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');

    // Measurements state
    const [weight, setWeight] = useState<number | undefined>(undefined);
    const [biceps, setBiceps] = useState<number | undefined>(undefined);
    const [chest, setChest] = useState<number | undefined>(undefined);
    const [waist, setWaist] = useState<number | undefined>(undefined);
    const [hips, setHips] = useState<number | undefined>(undefined);
    const [thigh, setThigh] = useState<number | undefined>(undefined);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [photosToUpload, setPhotosToUpload] = useState<File[]>([]);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const { startUpload, isUploading } = useUploadThing("imageUploader", {
        onClientUploadComplete: (res) => {
            console.log("Files: ", res);
        },
        onUploadError: (error: Error) => {
            toast({
                title: "Błąd przesyłania",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Load initial data when editing
    useEffect(() => {
        if (mode === 'edit' && checkIn.responses) {
            setTrainingRating(checkIn.responses.trainingRating);
            setPhysicalFeeling(checkIn.responses.physicalFeeling);
            setDietRating(checkIn.responses.dietRating);
            setHadIssues(checkIn.responses.hadIssues || false);
            setIssuesDescription(checkIn.responses.issuesDescription || '');
            setAdditionalNotes(checkIn.responses.additionalNotes || '');
        }

        if (mode === 'edit' && checkIn.measurements) {
            setWeight(checkIn.measurements.weight);
            setBiceps(checkIn.measurements.circumferences?.biceps);
            setChest(checkIn.measurements.circumferences?.chest);
            setWaist(checkIn.measurements.circumferences?.waist);
            setHips(checkIn.measurements.circumferences?.hips);
            setThigh(checkIn.measurements.circumferences?.thigh);
            // Note: We can't reload photoURLs as File objects, so photos need to be re-uploaded if changed
        }
    }, [mode, checkIn]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPhotoPreviews(prev => [...prev, ...newPreviews]);
            setPhotosToUpload(prev => [...prev, ...files]);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            let photoURLs: string[] = [];
            if (photosToUpload.length > 0) {
                try {
                    const uploadResult = await startUpload(photosToUpload);
                    if (uploadResult) {
                        photoURLs = uploadResult.map(res => res.url);
                    }
                } catch (error) {
                    console.error("Error uploading photos: ", error);
                    toast({
                        title: "Błąd",
                        description: "Nie udało się przesłać zdjęć.",
                        variant: "destructive",
                    });
                    setIsSubmitting(false);
                    return;
                }
            }

            const measurements = weight ? {
                weight,
                circumferences: {
                    biceps,
                    chest,
                    waist,
                    hips,
                    thigh,
                },
                photoURLs,
            } : undefined;

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
                    measurements,
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'edit' ? 'Edytuj Check-in' : 'Tygodniowy Check-in'}
                    </DialogTitle>
                    <DialogDescription>
                        Tydzień od {format(new Date(checkIn.weekStartDate), 'd MMMM yyyy', { locale: pl })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Section 1: Ratings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Oceny</h3>

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
                    </div>

                    {/* Section 2: Measurements */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <Weight className="h-4 w-4" />
                            Pomiary Ciała (opcjonalne)
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="weight">Waga (kg)</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.1"
                                    placeholder="np. 75.5"
                                    value={weight ?? ''}
                                    onChange={(e) => setWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="biceps">Biceps (cm)</Label>
                                    <Input
                                        id="biceps"
                                        type="number"
                                        step="0.1"
                                        placeholder="np. 38"
                                        value={biceps ?? ''}
                                        onChange={(e) => setBiceps(e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="chest">Klatka (cm)</Label>
                                    <Input
                                        id="chest"
                                        type="number"
                                        step="0.1"
                                        placeholder="np. 100"
                                        value={chest ?? ''}
                                        onChange={(e) => setChest(e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="waist">Talia (cm)</Label>
                                    <Input
                                        id="waist"
                                        type="number"
                                        step="0.1"
                                        placeholder="np. 80"
                                        value={waist ?? ''}
                                        onChange={(e) => setWaist(e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="hips">Biodra (cm)</Label>
                                    <Input
                                        id="hips"
                                        type="number"
                                        step="0.1"
                                        placeholder="np. 95"
                                        value={hips ?? ''}
                                        onChange={(e) => setHips(e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label htmlFor="thigh">Udo (cm)</Label>
                                    <Input
                                        id="thigh"
                                        type="number"
                                        step="0.1"
                                        placeholder="np. 60"
                                        value={thigh ?? ''}
                                        onChange={(e) => setThigh(e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Zdjęcia sylwetki (opcjonalne)</Label>
                                {photoPreviews.length > 0 && (
                                    <Carousel className="w-full max-w-xs mx-auto">
                                        <CarouselContent>
                                            {photoPreviews.map((src, index) => (
                                                <CarouselItem key={index}>
                                                    <div className="p-1">
                                                        <div className="relative aspect-video w-full">
                                                            <Image src={src} alt={`Podgląd ${index + 1}`} fill className="rounded-md object-cover" />
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="icon"
                                                                className="absolute top-2 right-2 h-6 w-6"
                                                                onClick={() => {
                                                                    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
                                                                    setPhotosToUpload(prev => prev.filter((_, i) => i !== index));
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        <CarouselPrevious />
                                        <CarouselNext />
                                    </Carousel>
                                )}
                                <Button type="button" variant="outline" className="w-full" onClick={() => photoInputRef.current?.click()}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {photoPreviews.length > 0 ? 'Dodaj więcej zdjęć' : 'Dodaj zdjęcia'}
                                </Button>
                                <Input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" multiple />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Issues and Notes */}
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dodatkowe informacje</h3>

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
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting || isUploading}>
                        Anuluj
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
                        {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === 'edit' ? 'Zapisz zmiany' : 'Wyślij Check-in'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CompletedCheckInCard({
    checkIn,
    onEdit,
    onDelete,
}: {
    checkIn: CheckIn;
    onEdit?: (checkIn: CheckIn) => void;
    onDelete?: (checkIn: CheckIn) => void;
}) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const getRatingColor = (rating: number) => {
        if (rating >= 8) return 'text-green-600 dark:text-green-400';
        if (rating >= 5) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/check-ins/${checkIn.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete');
            }

            toast({
                title: 'Check-in usunięty',
                description: 'Pomyślnie usunięto check-in',
            });

            setShowDeleteDialog(false);
            onDelete?.(checkIn);
        } catch (error: any) {
            toast({
                title: 'Błąd',
                description: error.message || 'Nie udało się usunąć check-inu',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const canEdit = checkIn.status !== 'reviewed';
    const canDelete = checkIn.status !== 'reviewed';


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
                        <div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:bg-orange-950/20 dark:border-orange-900">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Zgłoszone problemy:</p>
                            </div>
                            <p className="text-sm text-orange-700 dark:text-orange-200">
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

            {/* Display Measurements */}
            {checkIn.measurements && (
                <div className="rounded-md border border-purple-200 bg-purple-50 p-3 dark:bg-purple-950/20 dark:border-purple-900">
                    <div className="flex items-center gap-2 mb-3">
                        <Weight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-300">Pomiary ciała:</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {checkIn.measurements.weight && (
                            <div className="text-center p-2 rounded-lg bg-background">
                                <p className="text-xs text-muted-foreground mb-1">Waga</p>
                                <p className="text-lg font-bold">{checkIn.measurements.weight.toFixed(1)} kg</p>
                            </div>
                        )}
                        {checkIn.measurements.circumferences?.biceps && (
                            <div className="text-center p-2 rounded-lg bg-background">
                                <p className="text-xs text-muted-foreground mb-1">Biceps</p>
                                <p className="text-lg font-bold">{checkIn.measurements.circumferences.biceps.toFixed(1)} cm</p>
                            </div>
                        )}
                        {checkIn.measurements.circumferences?.chest && (
                            <div className="text-center p-2 rounded-lg bg-background">
                                <p className="text-xs text-muted-foreground mb-1">Klatka</p>
                                <p className="text-lg font-bold">{checkIn.measurements.circumferences.chest.toFixed(1)} cm</p>
                            </div>
                        )}
                        {checkIn.measurements.circumferences?.waist && (
                            <div className="text-center p-2 rounded-lg bg-background">
                                <p className="text-xs text-muted-foreground mb-1">Talia</p>
                                <p className="text-lg font-bold">{checkIn.measurements.circumferences.waist.toFixed(1)} cm</p>
                            </div>
                        )}
                        {checkIn.measurements.circumferences?.hips && (
                            <div className="text-center p-2 rounded-lg bg-background">
                                <p className="text-xs text-muted-foreground mb-1">Biodra</p>
                                <p className="text-lg font-bold">{checkIn.measurements.circumferences.hips.toFixed(1)} cm</p>
                            </div>
                        )}
                        {checkIn.measurements.circumferences?.thigh && (
                            <div className="text-center p-2 rounded-lg bg-background">
                                <p className="text-xs text-muted-foreground mb-1">Udo</p>
                                <p className="text-lg font-bold">{checkIn.measurements.circumferences.thigh.toFixed(1)} cm</p>
                            </div>
                        )}
                    </div>

                    {/* Display Photos */}
                    {checkIn.measurements.photoURLs && checkIn.measurements.photoURLs.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                Zdjęcia sylwetki
                            </p>
                            <Carousel className="w-full max-w-xs mx-auto">
                                <CarouselContent>
                                    {checkIn.measurements.photoURLs.map((url, index) => (
                                        <CarouselItem key={index}>
                                            <div className="relative aspect-video w-full">
                                                <Image src={url} alt={`Zdjęcie ${index + 1}`} fill className="rounded-md object-cover" />
                                            </div>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious />
                                <CarouselNext />
                            </Carousel>
                        </div>
                    )}
                </div>
            )}

            {checkIn.trainerNotes && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:bg-blue-950/20 dark:border-blue-900">
                    <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Komentarz trenera:</p>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-200">{checkIn.trainerNotes}</p>
                </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
                Wypełniono: {checkIn.submittedAt
                    ? format(new Date(checkIn.submittedAt), 'd MMMM yyyy, HH:mm', { locale: pl })
                    : '-'}
            </p>

            {/* Action Buttons */}
            {(canEdit || canDelete) && (
                <div className="flex gap-2 justify-end pt-2 border-t">
                    {canEdit && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit?.(checkIn)}
                        >
                            <Pencil className="h-4 w-4 mr-1" />
                            Edytuj
                        </Button>
                    )}
                    {canDelete && (
                        <>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Usuń
                            </Button>

                            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Ta akcja nie może być cofnięta. Check-in zostanie trwale usunięty.
                                            {checkIn.measurements && (
                                                <span className="block mt-2 text-muted-foreground">
                                                    Uwaga: Pomiary ciała pozostaną w systemie.
                                                </span>
                                            )}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Usuń
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AthleteCheckInPage() {
    const { data, error, isLoading } = useSWR<{ checkIns: CheckIn[] }>(
        '/api/check-ins',
        fetcher
    );

    const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);
    const [editCheckIn, setEditCheckIn] = useState<CheckIn | null>(null);

    const handleRefresh = () => {
        mutate('/api/check-ins');
    };

    const handleEdit = (checkIn: CheckIn) => {
        setEditCheckIn(checkIn);
    };

    const handleDelete = () => {
        handleRefresh();
    };

    const handleCloseEdit = () => {
        setEditCheckIn(null);
    };

    const handleEditSuccess = () => {
        setEditCheckIn(null);
        handleRefresh();
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
                <Card className="mb-6 border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />
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
                                    className="flex items-center justify-between rounded-lg border bg-background p-4 dark:bg-card"
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
                        <ClipboardCheck className="h-5 w-5 text-green-500 dark:text-green-400" />
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
                                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
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
                                        <CompletedCheckInCard
                                            checkIn={checkIn}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
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

            {/* Check-in Form Dialog - Create Mode */}
            {selectedCheckIn && (
                <CheckInForm
                    checkIn={selectedCheckIn}
                    open={!!selectedCheckIn}
                    onClose={() => setSelectedCheckIn(null)}
                    onSuccess={handleRefresh}
                    mode="create"
                />
            )}

            {/* Check-in Form Dialog - Edit Mode */}
            {editCheckIn && (
                <CheckInForm
                    checkIn={editCheckIn}
                    open={!!editCheckIn}
                    onClose={handleCloseEdit}
                    onSuccess={handleEditSuccess}
                    mode="edit"
                />
            )}
        </div>
    );
}
