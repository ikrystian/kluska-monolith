import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { ArrowLeft, Languages, MapPin, MessageSquare, UserCheck, Users, Wifi } from 'lucide-react';
import { useCollection, useDoc, useUser, jsonFetcher } from '@/lib/db-hooks';
import { resolveMediaUrl } from '@/lib/api-client';
import type { TrainerPublicStats, TrainerRequest, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { TrainerGallery } from '@/components/trainers/TrainerGallery';
import { TrainerInquirySheet } from '@/components/trainers/TrainerInquirySheet';
import { ContactActions, ContactCard } from '@/components/trainers/TrainerContact';
import {
  AboutSection,
  Achievements,
  CertificationsSection,
  FaqSection,
  HowItWorks,
  Reveal,
  Section,
  ServicesSection,
  SocialLinks,
  TestimonialsSection,
} from '@/components/trainers/TrainerProfileSections';
import { AVAILABILITY, MODE_LABEL, RESPONSE_LABEL, plural, publishedCard } from '@/components/trainers/trainer-meta';

const SHELL = 'mx-auto w-full max-w-5xl px-4 pb-32 pt-18 md:px-6 md:pb-10 md:pt-8';

interface Fact {
  value: string;
  label: string;
}

function FactsStrip({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] divide-x divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card py-3 shadow-soft">
      {facts.map(f => (
        <div key={f.label} className="flex flex-col-reverse px-2 text-center">
          <dt className="mt-0.5 text-[10px] font-bold uppercase leading-tight tracking-wider text-muted-foreground">{f.label}</dt>
          <dd className="font-headline text-lg font-bold leading-tight sm:text-xl">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailSkeleton() {
  return (
    <div className={SHELL}>
      <Skeleton className="h-56 rounded-[2rem]" />
      <div className="px-5">
        <Skeleton className="-mt-14 h-28 w-28 rounded-full ring-4 ring-background" />
        <Skeleton className="mt-4 h-9 w-2/3" />
        <Skeleton className="mt-2 h-5 w-1/2" />
      </div>
      <Skeleton className="mt-6 h-20 rounded-[1.5rem]" />
      <Skeleton className="mt-6 h-40 rounded-[1.5rem]" />
    </div>
  );
}

export default function AthleteTrainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: me } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);
  const { data: trainer, isLoading } = useDoc<UserProfile>('users', id ?? null);
  const { data: stats } = useSWR<TrainerPublicStats>(id ? `/api/trainers/${id}/stats` : null, jsonFetcher);
  const { data: requests } = useCollection<TrainerRequest>(user && id ? 'trainerRequests' : null, {
    athleteId: user?.uid,
    trainerId: id,
  });

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [topic, setTopic] = useState<string>();
  const [showStickyCta, setShowStickyCta] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  // The floating bar only appears once the inline buttons have scrolled away.
  const ready = !!trainer;
  useEffect(() => {
    const el = ctaRef.current;
    if (!ready || !el) return;
    const observer = new IntersectionObserver(([entry]) => setShowStickyCta(!entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  if (isLoading) return <DetailSkeleton />;

  if (!trainer || trainer.role !== 'trainer') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
          <Users className="h-6 w-6 text-muted-foreground" />
        </span>
        <h2 className="mt-4 font-headline text-2xl font-bold">Nie znaleziono trenera</h2>
        <p className="mb-6 mt-1 text-muted-foreground">Ten profil nie istnieje lub nie jest profilem trenera.</p>
        <Button className="rounded-full" onClick={() => navigate('/athlete/trainers')}>
          Wszyscy trenerzy
        </Button>
      </div>
    );
  }

  const card = publishedCard(trainer);
  const isMine = me?.trainerId === trainer.id;
  const pending = !isMine && !!requests?.some(r => r.status === 'pending');
  const cover = resolveMediaUrl(card?.coverImageUrl);
  const availability = card?.availability ? AVAILABILITY[card.availability] : undefined;
  const mode = MODE_LABEL[card?.cooperationMode ?? 'both'];

  const openInquiry = (offer?: string) => {
    setTopic(offer);
    setInquiryOpen(true);
  };

  const contact = { trainerId: trainer.id, isMine, pending, card, onInquire: () => openInquiry() };

  const facts: Fact[] = [];
  if (stats && stats.athletesCount > 0) {
    facts.push({ value: String(stats.athletesCount), label: plural(stats.athletesCount, 'podopieczny', 'podopieczni', 'podopiecznych') });
  }
  if (card?.experienceYears) {
    facts.push({ value: String(card.experienceYears), label: plural(card.experienceYears, 'rok doświadczenia', 'lata doświadczenia', 'lat doświadczenia') });
  }
  if (stats && stats.plansCount > 0) {
    facts.push({ value: String(stats.plansCount), label: plural(stats.plansCount, 'plan treningowy', 'plany treningowe', 'planów treningowych') });
  }
  if (card?.responseTime) {
    facts.push({ value: RESPONSE_LABEL[card.responseTime], label: 'czas odpowiedzi' });
  }

  const chips = [
    { icon: MapPin, text: trainer.location },
    { icon: Wifi, text: mode },
    { icon: Languages, text: card?.languages?.length ? card.languages.join(', ') : undefined },
  ].filter(c => c.text);

  return (
    <div className={SHELL}>
      {/* Banner */}
      <header>
        <div className="hero-ember texture-grain relative h-52 overflow-hidden rounded-[2rem] shadow-glow sm:h-64 md:h-72">
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[1.6rem] border-white/10" />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />

          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Wróć"
            className="absolute left-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md transition-transform active:scale-90"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {availability && (
            <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                {availability.ping && (
                  <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', availability.dot)} />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', availability.dot)} />
              </span>
              {availability.short}
            </span>
          )}
        </div>

        {/* Identity */}
        <div className="relative -mt-14 px-3 sm:px-6">
          <TrainerAvatar trainer={trainer} className="h-28 w-28 text-4xl shadow-lifted ring-4 ring-background sm:h-32 sm:w-32" />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              Trener osobisty
            </span>
            {isMine && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <UserCheck className="h-3 w-3" /> Twój trener
              </span>
            )}
          </div>

          <h1 className="mt-2 font-headline text-3xl font-bold leading-tight tracking-tight md:text-4xl">{trainer.name}</h1>
          {card?.headline && <p className="mt-1.5 max-w-2xl text-base text-muted-foreground md:text-lg">{card.headline}</p>}

          {chips.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {chips.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 shrink-0" /> {text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="mt-6 space-y-3">
        <FactsStrip facts={facts} />
        <div ref={ctaRef} className="lg:hidden">
          <ContactActions {...contact} />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="min-w-0 space-y-10">
          {!!card?.achievements?.length && <Achievements items={card.achievements} />}

          {card && (card.bio || !!card.specializations?.length) && (
            <AboutSection bio={card.bio} specializations={card.specializations} />
          )}

          {!!card?.services?.length && (
            <ServicesSection services={card.services} canInquire={!isMine && !pending} onInquire={openInquiry} />
          )}

          {!!card?.certifications?.length && <CertificationsSection items={card.certifications} />}

          {!!card?.gallery?.length && (
            <Section eyebrow="Z treningów" title="Galeria">
              <TrainerGallery images={card.gallery} trainerName={trainer.name} />
            </Section>
          )}

          {!!card?.testimonials?.length && <TestimonialsSection items={card.testimonials} />}

          {!!card?.faq?.length && <FaqSection items={card.faq} />}

          {!card && (
            <Reveal>
              <div className="rounded-[1.5rem] border border-dashed border-border/80 p-6 text-center">
                <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 font-headline text-lg font-bold">Profil w trakcie uzupełniania</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Ten trener nie dodał jeszcze szczegółów. Napisz do niego, aby dowiedzieć się, jak wygląda współpraca.
                </p>
              </div>
            </Reveal>
          )}

          {!isMine && <HowItWorks />}

          <SocialLinks links={trainer.socialLinks} />

          {/* Closing call to action for small screens, where the sidebar is hidden. */}
          {!isMine && (
            <Reveal className="lg:hidden">
              <div className="hero-ember texture-grain relative overflow-hidden rounded-[1.75rem] p-6 text-center text-white shadow-glow">
                <p className="font-display text-xl font-extrabold uppercase leading-tight">Gotowy na zmianę?</p>
                <p className="mx-auto mt-2 max-w-xs text-sm text-white/85">
                  Napisz do trenera — odpowie i dobierze plan do Twoich celów.
                </p>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => openInquiry()}
                  className="relative z-10 mt-4 h-12 rounded-full px-7 text-base"
                >
                  {pending ? 'Zapytanie wysłane' : card?.ctaText || 'Wyślij zapytanie'}
                </Button>
              </div>
            </Reveal>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-6 lg:block">
          <ContactCard {...contact} />
        </aside>
      </div>

      {/* Floating call to action (mobile) */}
      <div
        className={cn(
          'fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md transition-all duration-300 group-data-[chrome=hidden]/chrome:bottom-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden',
          showStickyCta ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        )}
        inert={!showStickyCta}
      >
        <div className="rounded-full bg-background/80 p-1.5 shadow-lifted backdrop-blur-xl">
          <ContactActions {...contact} compact />
        </div>
      </div>

      <TrainerInquirySheet trainer={trainer} open={inquiryOpen} onOpenChange={setInquiryOpen} topic={topic} />
    </div>
  );
}
