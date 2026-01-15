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
  Zap,
  TrendingUp,
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
      icon: <Bot className="h-10 w-10 text-primary" />,
      title: 'Planowanie Treningów AI',
      description: 'Wykorzystaj AI do generowania spersonalizowanych planów treningowych i sugerowania modyfikacji ćwiczeń dla optymalnej wydajności.',
    },
    {
      icon: <Dumbbell className="h-10 w-10 text-primary" />,
      title: 'Biblioteka Ćwiczeń',
      description: 'Obszerna biblioteka ćwiczeń. Dodawaj własne ćwiczenia, aby dostosować swoje treningi.',
    },
    {
      icon: <CalendarDays className="h-10 w-10 text-primary" />,
      title: 'Kalendarz Treningowy',
      description: 'Planuj i wizualizuj swój plan treningowy za pomocą intuicyjnego i łatwego w użyciu kalendarza.',
    },
    {
      icon: <History className="h-10 w-10 text-primary" />,
      title: 'Historia Treningów',
      description: 'Zapisuj każdą serię i powtórzenie. Spójrz na swoje przeszłe treningi, aby zobaczyć, jak daleko zaszedłeś.',
    },
    {
      icon: <BarChart className="h-10 w-10 text-primary" />,
      title: 'Statystyki Postępów',
      description: 'Śledź swoje postępy dzięki szczegółowym statystykom i pięknym wykresom, które wizualizują Twoją podróż.',
    },
    {
      icon: <Goal className="h-10 w-10 text-primary" />,
      title: 'Ustawianie Celów',
      description: 'Ustawiaj jasne cele fitness i monitoruj swoje postępy. Pozostań zmotywowany i skoncentrowany na swoich celach.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="rounded-lg bg-primary p-2">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-headline text-xl font-extrabold">LeniwaKluska</span>
          </Link>
          <nav className="ml-auto flex items-center gap-3">
            <Button variant="ghost" asChild className="font-semibold">
              <Link href="/login">Zaloguj się</Link>
            </Button>
            <Button asChild size="lg" className="font-bold">
              <Link href="/register">Zacznij teraz</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="container relative grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div className="flex flex-col items-start gap-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Profesjonalne Śledzenie Treningów</span>
              </div>
              <h1 className="font-headline text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Uwolnij Swój <span className="text-primary">Potencjał</span>
              </h1>
              <p className="max-w-[600px] text-lg text-muted-foreground">
                Najlepszy towarzysz Twojej podróży fitness. Planuj treningi, śledź postępy i osiągaj cele dzięki naszej platformie opartej na AI.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild className="text-base font-bold">
                  <Link href="/register">
                    Rozpocznij swoją podróż
                    <TrendingUp className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base font-semibold">
                  <Link href="#features">Dowiedz się więcej</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-64 md:h-96">
              {heroImage && <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="rounded-xl object-cover shadow-2xl ring-1 ring-border/50"
                data-ai-hint={heroImage.imageHint}
                priority
              />}
            </div>
          </div>
        </section>

        <section id="features" className="bg-muted/50 py-16 md:py-24">
          <div className="container">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-headline text-3xl font-extrabold md:text-4xl">
                Kompleksowe Śledzenie Aktywności
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Wszystko, czego potrzebujesz, aby być na bieżąco, od planowania po analizę wyników.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border/50 bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
                  <CardHeader className="space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-xl font-bold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container">
            <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 text-center md:p-12">
              <h2 className="font-headline text-3xl font-extrabold md:text-4xl">
                Gotowy na zmianę?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Dołącz do tysięcy użytkowników, którzy już osiągają swoje cele fitness z GymProgress.
              </p>
              <Button size="lg" asChild className="mt-8 text-base font-bold">
                <Link href="/register">
                  Zacznij już teraz - To darmowe
                  <Zap className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <Dumbbell className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-headline font-bold">Leniwa Kluska</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Leniwa Kluska. Wszelkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </div>
  );
}
