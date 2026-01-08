'use client';

import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import { UserProfile, TrainingPlan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dumbbell, MessageSquare, User, CheckCircle2, Star, Calendar, Clock, Layers } from 'lucide-react';
import Link from 'next/link';
import { placeholderImages } from '@/lib/placeholder-images';

// Component: Trainer Info Card
function TrainerInfoCard({ trainer }: { trainer: UserProfile }) {
  const avatarImage = placeholderImages.find((img) => img.id === 'avatar-male');

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
          <Avatar className="h-24 w-24 border-4 border-background relative">
            {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt={trainer.name} />}
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {trainer.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">{trainer.name}</CardTitle>
        <CardDescription className="flex items-center justify-center gap-1">
          <User className="h-3 w-3" /> Twój Trener Personalny
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {trainer.location && (
            <Badge variant="secondary" className="text-xs">
              {trainer.location}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Siłownia i Online
          </Badge>
        </div>
        <Button className="w-full rounded-full" asChild>
          <Link href={`/athlete/chat`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Napisz Wiadomość
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Component: Workout Plan Card with Details
function WorkoutPlanCard({ plan }: { plan: TrainingPlan }) {
  const totalWeeks = plan.stages.reduce((acc, stage) => acc + stage.weeks.length, 0);
  const totalWorkouts = plan.stages.reduce((acc, stage) =>
    acc + stage.weeks.reduce((weekAcc, week) =>
      weekAcc + week.days.filter(day => day !== 'Rest Day' && day !== null).length, 0
    ), 0
  );

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-primary/10">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription className="mt-1">{plan.description || 'Plan treningowy od trenera'}</CardDescription>
          </div>
          <Badge variant="outline">{plan.level}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-bold">{plan.stages.length}</p>
            <p className="text-xs text-muted-foreground">Etapów</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-bold">{totalWeeks}</p>
            <p className="text-xs text-muted-foreground">Tygodni</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-bold">{totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">Treningów</p>
          </div>
        </div>

        {/* Stages Accordion */}
        <Accordion type="single" collapsible className="w-full">
          {plan.stages.map((stage, stageIndex) => (
            <AccordionItem value={`stage-${stageIndex}`} key={stageIndex}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="mr-2">{stageIndex + 1}</Badge>
                  <span>{stage.name}</span>
                  <span className="text-muted-foreground text-sm ml-2">({stage.weeks.length} tyg.)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pl-4">
                  {stage.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="p-3 rounded-md bg-secondary/30">
                      <p className="font-medium text-sm mb-2">Tydzień {weekIndex + 1}</p>
                      <div className="flex flex-wrap gap-1">
                        {week.days.map((day, dayIndex) => {
                          const isRestDay = day === 'Rest Day' || day === null;
                          const workoutName = typeof day === 'object' && day !== null ? (day as any).name : null;

                          return (
                            <Badge
                              key={dayIndex}
                              variant={isRestDay ? "outline" : "default"}
                              className="text-xs"
                            >
                              D{dayIndex + 1}: {isRestDay ? 'Odpoczynek' : (workoutName || 'Trening')}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// View: Athlete with Trainer but no plans
function NoPlansYetView({ trainer }: { trainer: UserProfile }) {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative z-10 grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="px-4 py-1 text-sm font-medium rounded-full">
              Współpraca z Trenerem
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline">
              Twój Trener <br />
              <span className="text-primary">Pracuje nad Planem</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Trener <strong>{trainer.name}</strong> jeszcze nie przypisał Ci planu treningowego.
              Kiedy to zrobi, zobaczysz tutaj szczegóły Twojego spersonalizowanego programu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="rounded-full" asChild>
                <Link href="/athlete/chat">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Napisz do Trenera
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <TrainerInfoCard trainer={trainer} />
          </div>
        </div>
      </section>

      <section className="text-center py-8">
        <div className="max-w-md mx-auto">
          <Clock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Oczekiwanie na plan</h2>
          <p className="text-muted-foreground">
            Gdy trener przypisze Ci plan treningowy, pojawi się on tutaj wraz ze wszystkimi szczegółami - etapami, tygodniami i poszczególnymi treningami.
          </p>
        </div>
      </section>
    </div>
  );
}

// View: Athlete with assigned plans
function AssignedPlansView({ trainer, plans }: { trainer: UserProfile; plans: TrainingPlan[] }) {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-8">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Badge variant="secondary" className="px-4 py-1 text-sm font-medium rounded-full mb-4">
              Plany od {trainer.name}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">
              Twoje Plany Treningowe
            </h1>
            <p className="text-muted-foreground mt-2">
              Masz przypisane <strong>{plans.length}</strong> {plans.length === 1 ? 'plan treningowy' : 'plany treningowe'} od trenera.
            </p>
          </div>
          <Button className="rounded-full" asChild>
            <Link href="/athlete/chat">
              <MessageSquare className="mr-2 h-4 w-4" />
              Napisz do Trenera
            </Link>
          </Button>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <WorkoutPlanCard key={plan.id} plan={plan} />
        ))}
      </section>
    </div>
  );
}

// View: Find a Trainer (original view for athletes without trainer)
function FindTrainerView() {
  const { data: trainers, isLoading } = useCollection<UserProfile>('users', { role: 'trainer' });
  const avatarImage = placeholderImages.find((img) => img.id === 'avatar-male');

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-8 md:p-12 text-center md:text-left">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative z-10 grid gap-8 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="px-4 py-1 text-sm font-medium rounded-full">
              Profesjonalne Wsparcie
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline">
              Plany Treningowe <br />
              <span className="text-primary">Szyte na Miarę</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              W naszym systemie plany treningowe są przygotowywane wyłącznie przez certyfikowanych trenerów personalnych.
              Zyskaj pewność, że Twój trening jest bezpieczny, efektywny i dopasowany do Twoich celów.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button size="lg" className="rounded-full" asChild>
                <Link href="#trainers">
                  Znajdź Trenera
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full" asChild>
                <Link href="/athlete/chat">
                  Napisz Wiadomość
                </Link>
              </Button>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-2 gap-4 opacity-90">
            <Card className="bg-background/60 backdrop-blur-sm border-primary/10 transform translate-y-8">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Indywidualne Podejście</h3>
                <p className="text-sm text-muted-foreground">Plan dopasowany do Twoich możliwości i celów.</p>
              </CardContent>
            </Card>
            <Card className="bg-background/60 backdrop-blur-sm border-primary/10">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Star className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Ekspercka Wiedza</h3>
                <p className="text-sm text-muted-foreground">Wsparcie doświadczonych profesjonalistów.</p>
              </CardContent>
            </Card>
            <Card className="bg-background/60 backdrop-blur-sm border-primary/10 transform translate-y-8">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Efektywność</h3>
                <p className="text-sm text-muted-foreground">Szybsze rezultaty dzięki sprawdzonym metodom.</p>
              </CardContent>
            </Card>
            <Card className="bg-background/60 backdrop-blur-sm border-primary/10">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">Stały Kontakt</h3>
                <p className="text-sm text-muted-foreground">Możliwość konsultacji i korekty planu.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trainers Carousel Section */}
      <section id="trainers" className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold font-headline">Nasi Trenerzy</h2>
            <p className="text-muted-foreground mt-2">
              Wybierz trenera, z którym chcesz współpracować i osiągnąć swoje cele.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-[300px] animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : trainers && trainers.length > 0 ? (
          <div className="px-12">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {trainers.map((trainer) => (
                  <CarouselItem key={trainer.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="h-full hover:shadow-lg transition-all duration-300 border-primary/10 group">
                      <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 relative">
                          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl group-hover:bg-primary/30 transition-colors" />
                          <Avatar className="h-24 w-24 border-4 border-background relative">
                            {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt={trainer.name} />}
                            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                              {trainer.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <CardTitle className="text-xl">{trainer.name}</CardTitle>
                        <CardDescription className="flex items-center justify-center gap-1">
                          <User className="h-3 w-3" /> Trener Personalny
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-center space-y-4">
                        <div className="flex flex-wrap justify-center gap-2">
                          {trainer.location && (
                            <Badge variant="secondary" className="text-xs">
                              {trainer.location}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Siłownia i Online
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-3 px-4">
                          Specjalista w budowaniu sylwetki i poprawie kondycji. Pomogę Ci osiągnąć wymarzoną formę w bezpieczny sposób.
                        </p>

                        <div className="pt-4">
                          <Button className="w-full rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" asChild>
                            <Link href={`/athlete/chat?userId=${trainer.id}`}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Nawiąż Współpracę
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-12 h-12 w-12 border-primary/20 hover:bg-primary/10 hover:text-primary" />
              <CarouselNext className="-right-12 h-12 w-12 border-primary/20 hover:bg-primary/10 hover:text-primary" />
            </Carousel>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/30">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Brak dostępnych trenerów</h3>
            <p className="text-muted-foreground">
              Obecnie nie ma zarejestrowanych trenerów w systemie.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// Loading View
function LoadingView() {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div className="rounded-3xl border p-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full max-w-md" />
            <Skeleton className="h-20 w-full max-w-lg" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-64 w-64 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function AthleteWorkoutPlansPage() {
  const { user } = useUser();

  // Fetch current user profile
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(
    user ? 'users' : null,
    user?.uid || null
  );

  // Fetch trainer profile if assigned
  const { data: trainerProfile, isLoading: trainerLoading } = useDoc<UserProfile>(
    userProfile?.trainerId ? 'users' : null,
    userProfile?.trainerId || null
  );

  // Fetch assigned workout plans
  const { data: assignedPlans, isLoading: plansLoading } = useCollection<TrainingPlan>(
    user?.uid ? 'workoutPlans' : null,
    { assignedAthleteIds: { $in: [user?.uid] } }
  );

  const isLoading = profileLoading || (userProfile?.trainerId && trainerLoading) || plansLoading;

  if (isLoading) {
    return <LoadingView />;
  }

  // Case 1: No trainer assigned - show "Find a Trainer" view
  if (!userProfile?.trainerId || !trainerProfile) {
    return <FindTrainerView />;
  }

  // Case 2: Trainer assigned but no plans - show waiting view
  if (!assignedPlans || assignedPlans.length === 0) {
    return <NoPlansYetView trainer={trainerProfile} />;
  }

  // Case 3: Trainer assigned with plans - show plans
  return <AssignedPlansView trainer={trainerProfile} plans={assignedPlans} />;
}