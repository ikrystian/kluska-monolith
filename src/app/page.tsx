'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  CalendarDays,
  Dumbbell,
  Goal,
  History,
  Bot,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { placeholderImages } from '@/lib/placeholder-images';
import { useUser, useDoc } from '@/lib/db-hooks';

export default function LandingPage() {
  const heroImage = placeholderImages.find((img) => img.id === 'hero');

  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // Fetch user profile from MongoDB
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(
    user ? 'users' : null,
    user?.uid || null
  );

  const isLoading = isUserLoading || (user && isProfileLoading);

  useEffect(() => {
    if (!isLoading && user && userProfile) {
      if (userProfile.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (userProfile.role === 'trainer') {
        router.push('/trainer/dashboard');
      } else if (userProfile.role === 'athlete') {
        router.push('/athlete/dashboard');
      } else {
alert('Unknown role');
      }
    }
  }, [user, userProfile, isLoading, router]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Ładowanie...</p>
      </div>
    );
  }

  const features = [
    {
      icon: <Bot className="h-8 w-8 text-primary" />,
      title: 'Planowanie Treningów AI',
      description: 'Wykorzystaj AI do generowania spersonalizowanych planów treningowych i sugerowania modyfikacji ćwiczeń dla optymalnej wydajności.',
    },
    {
      icon: <Dumbbell className="h-8 w-8 text-primary" />,
      title: 'Biblioteka Ćwiczeń',
      description: 'Obszerna biblioteka ćwiczeń. Dodawaj własne ćwiczenia, aby dostosować swoje treningi.',
    },
    {
      icon: <CalendarDays className="h-8 w-8 text-primary" />,
      title: 'Kalendarz Treningowy',
      description: 'Planuj i wizualizuj swój plan treningowy za pomocą intuicyjnego i łatwego w użyciu kalendarza.',
    },
    {
      icon: <History className="h-8 w-8 text-primary" />,
      title: 'Historia Treningów',
      description: 'Zapisuj każdą serię i powtórzenie. Spójrz na swoje przeszłe treningi, aby zobaczyć, jak daleko zaszedłeś.',
    },
    {
      icon: <BarChart className="h-8 w-8 text-primary" />,
      title: 'Statystyki Postępów',
      description: 'Śledź swoje postępy dzięki szczegółowym statystykom i pięknym wykresom, które wizualizują Twoją podróż.',
    },
    {
      icon: <Goal className="h-8 w-8 text-primary" />,
      title: 'Ustawianie Celów',
      description: 'Ustawiaj jasne cele fitness i monitoruj swoje postępy. Pozostań zmotywowany i skoncentrowany na swoich celach.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="font-headline text-lg">GymProgress</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Zaloguj się</Link>
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90">
              <Link href="/register">Zacznij teraz</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-20 md:py-32">
          <div className="container grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div className="flex flex-col items-start gap-6">
              <h1 className="font-headline text-4xl font-bold tracking-tighter md:text-5xl lg:text-6xl">
                Uwolnij Swój Potencjał. Śledź Swój Sukces.
              </h1>
              <p className="max-w-[600px] text-lg text-muted-foreground">
                Najlepszy towarzysz Twojej podróży fitness. Planuj treningi, śledź postępy i osiągaj cele dzięki naszej platformie opartej na AI.
              </p>
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90">
                <Link href="/register">Rozpocznij swoją podróż już dziś</Link>
              </Button>
            </div>
            <div className="relative h-64 md:h-96">
             {heroImage && <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="rounded-lg object-cover shadow-2xl"
                data-ai-hint={heroImage.imageHint}
                priority
              />}
            </div>
          </div>
        </section>

        <section id="features" className="bg-secondary py-20 md:py-24">
          <div className="container">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-headline text-3xl font-bold md:text-4xl">
                Kompleksowe Śledzenie Aktywności
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Wszystko, czego potrzebujesz, aby być na bieżąco, od planowania po analizę wyników.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="bg-background">
                  <CardHeader className="flex flex-row items-center gap-4">
                    {feature.icon}
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="font-headline">GymProgress</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GymProgress. Wszelkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </div>
  );
}
