import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, BadgeCheck, Quote, Trophy } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Facebook, Instagram, Twitter } from '@/components/ui/social-icons';
import { tint } from '@/components/profile/profile-ui';
import { cn } from '@/lib/utils';
import type { TrainerCard, UserProfile } from '@/lib/types';

/** Fades a block in as it scrolls into view; a no-op for people who prefer reduced motion. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <Reveal>
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 font-headline text-2xl font-bold tracking-tight">{title}</h2>
        <div className="mt-4">{children}</div>
      </section>
    </Reveal>
  );
}

const SCROLLER =
  '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden';

/** Short, scannable accomplishments right under the header. */
export function Achievements({ items }: { items: string[] }) {
  return (
    <Reveal>
      <ul className={SCROLLER} aria-label="Osiągnięcia">
        {items.map(item => (
          <li
            key={item}
            className="flex shrink-0 snap-start items-center gap-2.5 rounded-2xl border border-primary/25 bg-primary/[0.07] py-2.5 pl-3 pr-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Trophy className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold">{item}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

const CLAMP_AT = 320;

export function AboutSection({ bio, specializations }: { bio?: string; specializations?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const long = !!bio && bio.length > CLAMP_AT;

  return (
    <Section eyebrow="Poznaj trenera" title="O trenerze">
      {bio && (
        <div>
          <p className={cn('whitespace-pre-line text-[15px] leading-relaxed text-foreground/90', long && !expanded && 'line-clamp-5')}>
            {bio}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="mt-2 text-sm font-bold text-primary"
              aria-expanded={expanded}
            >
              {expanded ? 'Pokaż mniej' : 'Czytaj więcej'}
            </button>
          )}
        </div>
      )}
      {!!specializations?.length && (
        <div className={cn(bio && 'mt-5')}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Specjalizacje</p>
          <ul className="flex flex-wrap gap-2">
            {specializations.map(s => (
              <li key={s} className="rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-sm font-semibold shadow-soft">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

export function ServicesSection({
  services,
  canInquire,
  onInquire,
}: {
  services: NonNullable<TrainerCard['services']>;
  canInquire: boolean;
  onInquire: (title: string) => void;
}) {
  return (
    <Section eyebrow="Współpraca" title="Oferta i pakiety">
      <div className="grid gap-3 sm:grid-cols-2">
        {services.map(s => (
          <article
            key={s.title}
            className={cn(
              'relative flex flex-col rounded-[1.5rem] border bg-card p-5 shadow-soft',
              s.highlighted ? 'border-primary/60 ring-1 ring-primary/30 shadow-glow' : 'border-border/60'
            )}
          >
            {s.highlighted && (
              <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Polecany
              </span>
            )}
            <h3 className="font-headline text-lg font-bold leading-tight">{s.title}</h3>
            {s.price && <p className="mt-1.5 font-display text-xl font-extrabold text-primary">{s.price}</p>}
            {s.description && <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>}
            {canInquire && (
              <button
                type="button"
                onClick={() => onInquire(s.title)}
                className="mt-4 inline-flex items-center gap-1 self-start text-sm font-bold text-foreground transition-colors hover:text-primary"
              >
                Zapytaj o ofertę <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

export function CertificationsSection({ items }: { items: NonNullable<TrainerCard['certifications']> }) {
  return (
    <Section eyebrow="Kwalifikacje" title="Certyfikaty i uprawnienia">
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map(c => (
          <li
            key={`${c.name}-${c.year ?? ''}`}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold leading-snug">{c.name}</span>
              {c.year && <span className="text-xs text-muted-foreground">{c.year}</span>}
            </span>
            <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function TestimonialsSection({ items }: { items: NonNullable<TrainerCard['testimonials']> }) {
  return (
    <Section eyebrow="Zaufali mi" title="Opinie podopiecznych">
      <ul className={SCROLLER}>
        {items.map(t => (
          <li
            key={`${t.author}-${t.text.slice(0, 24)}`}
            className="flex w-[17rem] shrink-0 snap-start flex-col rounded-[1.5rem] border border-border/60 bg-card p-5 shadow-soft sm:w-80"
          >
            <Quote className="h-6 w-6 text-primary/70" />
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed">{t.text}</blockquote>
            <div className="mt-4 flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-bold uppercase">
                {t.author.charAt(0)}
              </span>
              <span className="text-sm font-bold">{t.author}</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function FaqSection({ items }: { items: NonNullable<TrainerCard['faq']> }) {
  return (
    <Section eyebrow="Pytania" title="Najczęściej zadawane pytania">
      <Accordion
        type="single"
        collapsible
        className="divide-y divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card px-4 shadow-soft"
      >
        {items.map((f, i) => (
          <AccordionItem key={f.question} value={`faq-${i}`} className="border-0">
            <AccordionTrigger className="text-left text-sm font-bold hover:no-underline">{f.question}</AccordionTrigger>
            <AccordionContent className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {f.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}

const STEPS = [
  ['Wyślij zapytanie', 'Opisz cel, doświadczenie i dostępność — to zajmie minutę.'],
  ['Ustalcie szczegóły', 'Trener odpisze w czacie i zaproponuje formę współpracy.'],
  ['Trenuj z planem', 'Dostajesz program, wykonujesz treningi, a trener koryguje plan.'],
];

export function HowItWorks() {
  return (
    <Section eyebrow="Jak to działa" title="Od zapytania do pierwszego treningu">
      <ol className="space-y-2.5">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="flex items-start gap-4 rounded-[1.25rem] border border-border/60 bg-card p-4 shadow-soft">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-extrabold text-primary">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-bold">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

type SocialIcon = ComponentType<SVGProps<SVGSVGElement>>;

const SOCIALS: { key: 'instagram' | 'facebook' | 'twitter'; label: string; icon: SocialIcon; color: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, color: 'hsl(var(--foreground))' },
];

export function SocialLinks({ links }: { links: UserProfile['socialLinks'] }) {
  const available = SOCIALS.filter(s => links?.[s.key]);
  if (available.length === 0) return null;

  return (
    <Section eyebrow="W sieci" title="Śledź trenera">
      <div className="flex flex-wrap gap-2">
        {available.map(({ key, label, icon: Icon, color }) => (
          <a
            key={key}
            href={links![key]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card py-2 pl-2 pr-4 shadow-soft transition-colors hover:bg-secondary/50 active:scale-[0.98]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: tint(color, 15), color }}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </a>
        ))}
      </div>
    </Section>
  );
}
