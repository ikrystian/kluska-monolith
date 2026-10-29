import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Facebook,
  Instagram,
  Layers,
  MapPin,
  MessageSquare,
  Twitter,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useDoc, useUser } from '@/lib/db-hooks';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tint } from '@/components/profile/profile-ui';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';

const SOCIALS: { key: 'instagram' | 'facebook' | 'twitter'; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'hsl(var(--foreground))' },
];

const STEPS = [
  ['Napisz do trenera', 'Opisz cel, doświadczenie i dostępność w czacie.'],
  ['Dostaniesz plan', 'Trener przygotuje program dopasowany do Ciebie.'],
  ['Trenuj i raportuj', 'Wykonuj treningi, a trener koryguje plan na bieżąco.'],
];

const SHELL = 'mx-auto w-full max-w-3xl space-y-6 px-4 pb-4 pt-20 md:px-6 md:pt-8';

export default function AthleteTrainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: me } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);
  const { data: trainer, isLoading } = useDoc<UserProfile>('users', id ?? null);

  if (isLoading) {
    return (
      <div className={SHELL}>
        <Skeleton className="h-72 rounded-[1.75rem]" />
        <Skeleton className="h-14 rounded-full" />
        <Skeleton className="h-40 rounded-[1.5rem]" />
      </div>
    );
  }

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

  const isMine = me?.trainerId === trainer.id;
  const socials = SOCIALS.filter(s => trainer.socialLinks?.[s.key]);

  return (
    <div className={SHELL}>
      {/* Hero */}
      <section className="hero-ember texture-grain relative overflow-hidden rounded-[1.75rem] px-5 pb-7 pt-5 text-white shadow-glow">
        <div aria-hidden className="pointer-events-none absolute -right-14 -top-20 h-60 w-60 rounded-full border-[1.4rem] border-white/10" />
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Wróć"
          className="relative grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur-md transition-transform active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="relative mt-2 flex flex-col items-center text-center">
          <TrainerAvatar trainer={trainer} className="h-28 w-28 text-4xl ring-4 ring-white/40" />
          <h1 className="mt-4 font-display text-3xl font-extrabold uppercase leading-[1.05]">{trainer.name}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
              Trener osobisty
            </span>
            {isMine && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <UserCheck className="h-3 w-3" /> Twój trener
              </span>
            )}
          </div>
          {trainer.location && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="h-4 w-4" /> {trainer.location}
            </p>
          )}
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-2.5">
        <Button asChild className="h-12 w-full rounded-full text-base">
          <Link to={`/athlete/chat?userId=${trainer.id}`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            {isMine ? 'Napisz do trenera' : 'Nawiąż współpracę'}
          </Link>
        </Button>
        {isMine && (
          <Button asChild variant="outline" className="h-11 w-full rounded-full">
            <Link to="/athlete/workout-plans">
              <Layers className="mr-2 h-4 w-4" /> Mój program
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          </Button>
        )}
      </section>

      {/* Facts */}
      <section>
        <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Informacje</h2>
        <dl className="divide-y divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card text-sm shadow-soft">
          {[
            ['Lokalizacja', trainer.location || 'Nie podano'],
            ['Forma współpracy', 'Siłownia i online'],
            ['Kontakt', 'Czat w aplikacji'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {socials.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Social media</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {socials.map(({ key, label, icon: Icon, color }) => (
              <a
                key={key}
                href={trainer.socialLinks![key]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[1.25rem] border border-border/60 bg-card p-3 shadow-soft transition-colors hover:bg-secondary/50 active:scale-[0.98]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: tint(color, 15), color }}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {!isMine && (
        <section>
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Jak to działa</h2>
          <ol className="space-y-2">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex items-start gap-3 rounded-[1.25rem] border border-border/60 bg-card p-4 shadow-soft">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-extrabold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
