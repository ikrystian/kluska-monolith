import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { MotionConfig, animate, motion, useReducedMotion, type Variants } from 'framer-motion';
import { Check, Clock, Flag, Flame, Footprints, Loader2, Quote, RotateCcw, Trophy, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/section';
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
import { useUser } from '@/lib/db-hooks';
import { cn } from '@/lib/utils';
import { STRAVA_COLOR } from '@/components/running/RunHistoryList';
import { SocialAvatar, socialName } from '@/components/social/SocialAvatar';
import {
  CLOSED_LABELS,
  challengeBucket,
  challengeResult,
  challengeSides,
  formatChallengeKm,
  kmPerDayNeeded,
  useChallenge,
  useChallengeActions,
  type ChallengeDetail,
  type ChallengeSides,
} from '@/lib/challenges';
import {
  ME_COLOR,
  OPPONENT_COLOR,
  RaceTrack,
  deadlineLabel,
  leadLine,
  timeLeftLabel,
} from '@/components/challenges/challenge-ui';
import { ChallengeSheet } from '@/components/challenges/ChallengeSheet';
import runnersPhoto from '@/assets/challenge-runners.webp';

/* ---------- Motion ---------- */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** The sections under the hero rise in one after another, once the duel has landed. */
const sectionsStagger: Variants = {
  animate: { transition: { staggerChildren: 0.09, delayChildren: 0.45 } },
};

const rise: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
};

// On the photo the page is always dark, so "you" use the bright lime in both
// themes (--volt turns olive in the light one and would sink into the asphalt).
const HERO_ME_COLOR = 'hsl(var(--lime))';

/** Light streaks rushing across the hero — the race is on. */
const STREAKS = [
  { top: '14%', width: '34%', duration: 2.4, delay: 0.2 },
  { top: '31%', width: '22%', duration: 1.7, delay: 1.1 },
  { top: '47%', width: '44%', duration: 2.9, delay: 0.6 },
  { top: '66%', width: '26%', duration: 1.9, delay: 1.8 },
  { top: '82%', width: '38%', duration: 2.5, delay: 0.9 },
];

export default function ChallengeDetailPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { user } = useUser();
  const { data: challenge, isLoading, error, mutate } = useChallenge(challengeId);
  const { respond, isPending } = useChallengeActions();
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [rematchOpen, setRematchOpen] = useState(false);

  if (isLoading && !challenge) {
    return (
      <div className="page space-y-4">
        <Skeleton className="-mx-4 -mt-2 h-[25rem] w-auto rounded-b-[2rem] rounded-t-none" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (!challenge || !user) {
    return (
      <div className="page">
        <EmptyState
          icon={Footprints}
          title={error ? 'Nie udało się wczytać wyzwania' : 'Nie ma takiego wyzwania'}
          action={
            <div className="flex justify-center gap-2">
              {error && (
                <Button size="sm" variant="outline" onClick={() => mutate()}>
                  Spróbuj ponownie
                </Button>
              )}
              <Button asChild size="sm" variant="secondary">
                <Link to="/athlete/challenges">Wszystkie wyzwania</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const myId = user.uid;
  const sides = challengeSides(challenge, myId);
  const bucket = challengeBucket(challenge, myId);
  const result = challengeResult(challenge, myId);
  const busy = isPending(challenge.id);
  const opponentName = socialName(sides.opponent.user);
  const target = formatChallengeKm(challenge.targetKm);
  const hasRace = bucket === 'active' || bucket === 'finished';

  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="page space-y-4" variants={sectionsStagger} initial="initial" animate="animate">
      <Hero
        challenge={challenge}
        sides={sides}
        bucket={bucket}
        result={result}
        myId={myId}
        opponentName={opponentName}
        target={target}
        hasRace={hasRace}
      />

      {/* Status */}
      {bucket === 'invite' && (
        <motion.section variants={rise} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-[15px] font-semibold">{opponentName} rzuca Ci wyzwanie</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kto pierwszy przebiegnie {target} km? Po przyjęciu liczą się biegi od tej chwili — zostało{' '}
            {timeLeftLabel(challenge.endDate)}.
          </p>
          <div className="mt-4 flex gap-2">
            <motion.div
              className="relative flex-1"
              animate={busy ? undefined : { scale: [1, 1.03, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {!busy && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-primary"
                  animate={{ scale: [1, 1.14], opacity: [0.45, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <Button className="relative w-full" disabled={busy} onClick={() => respond(challenge.id, 'accept')}>
                {isPending(challenge.id, 'accept') ? <Loader2 className="animate-spin" /> : <Check />}
                Przyjmuję
              </Button>
            </motion.div>
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => respond(challenge.id, 'decline')}>
              {isPending(challenge.id, 'decline') ? <Loader2 className="animate-spin" /> : <X />}
              Odrzuć
            </Button>
          </div>
        </motion.section>
      )}

      {bucket === 'sent' && (
        <motion.section variants={rise} className="rounded-2xl bg-card p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <motion.span
              className="grid"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
            </motion.span>
            Czekamy na odpowiedź {opponentName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Wyścig wystartuje, gdy przyjmie wyzwanie. Bez odpowiedzi wygaśnie {deadlineLabel(challenge.endDate)}.
          </p>
          <Button
            variant="ghost"
            className="mt-2 w-full text-muted-foreground"
            disabled={busy}
            onClick={() => respond(challenge.id, 'cancel')}
          >
            {busy ? <Loader2 className="animate-spin" /> : <X />}
            Wycofaj wyzwanie
          </Button>
        </motion.section>
      )}

      {bucket === 'closed' && (
        <motion.div variants={rise}>
        <EmptyState
          title={CLOSED_LABELS[challenge.status] ?? 'Zamknięte'}
          description={
            challenge.status === 'declined'
              ? `${socialName(challenge.challenged)} nie podjął(-ęła) wyzwania.`
              : challenge.status === 'cancelled'
                ? 'Wyzwanie wycofano przed startem.'
                : 'Nikt nie odpowiedział przed terminem.'
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => setRematchOpen(true)}>
              <RotateCcw />
              Wyzwij ponownie
            </Button>
          }
        />
        </motion.div>
      )}

      {bucket === 'finished' && result && <ResultCard challenge={challenge} sides={sides} result={result} onRematch={() => setRematchOpen(true)} />}

      {bucket === 'active' && <LiveCard challenge={challenge} sides={sides} />}

      {hasRace && (
        <motion.section variants={rise} className="rounded-2xl bg-card p-5">
          <h2 className="mb-4 flex items-baseline justify-between text-[15px] font-semibold">
            Wyścig
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.round(Math.min(100, (sides.me.km / challenge.targetKm) * 100))}% trasy za Tobą
            </span>
          </h2>
          <RaceTrack sides={sides} targetKm={challenge.targetKm} live={bucket === 'active'} />
        </motion.section>
      )}

      {hasRace && <RunsList challenge={challenge} sides={sides} />}

      {bucket === 'active' && (
        <motion.div variants={rise}>
          <Button variant="ghost" className="w-full text-muted-foreground" disabled={busy} onClick={() => setConfirmForfeit(true)}>
            <Flag />
            Poddaj wyzwanie
          </Button>
        </motion.div>
      )}

      <AlertDialog open={confirmForfeit} onOpenChange={setConfirmForfeit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poddać wyzwanie?</AlertDialogTitle>
            <AlertDialogDescription>
              {opponentName} wygra walkowerem (bez FitCoinów dla nikogo). Tego nie da się cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Walczę dalej</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void respond(challenge.id, 'forfeit')}
            >
              Poddaję się
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChallengeSheet
        open={rematchOpen}
        onOpenChange={setRematchOpen}
        friendId={sides.opponent.user.userId}
        targetKm={challenge.targetKm}
      />
      </motion.div>
    </MotionConfig>
  );
}

/* ---------- Pieces ---------- */

/** A kilometre figure that counts up from zero when it first shows. */
function KmCount({ value, delay = 0 }: { value: number; delay?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const shownRef = useRef(shown);

  useEffect(() => {
    if (reduce) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    const controls = animate(shownRef.current, value, {
      duration: 1.2,
      delay,
      ease: EASE_OUT,
      onUpdate: latest => {
        shownRef.current = latest;
        setShown(latest);
      },
    });
    return () => controls.stop();
  }, [value, delay, reduce]);

  if (shown === value) return <>{formatChallengeKm(value)}</>;
  // While counting, keep the final number's precision so the width doesn't jitter.
  const digits = Number.isInteger(value) || value >= 100 ? 0 : 1;
  return <>{shown.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits })}</>;
}

/** The photo-backed top of the screen: what the race is about and who faces whom. */
function Hero({
  challenge,
  sides,
  bucket,
  result,
  myId,
  opponentName,
  target,
  hasRace,
}: {
  challenge: ChallengeDetail;
  sides: ChallengeSides;
  bucket: ReturnType<typeof challengeBucket>;
  result: ReturnType<typeof challengeResult>;
  myId: string;
  opponentName: string;
  target: string;
  hasRace: boolean;
}) {
  const live = bucket === 'active';
  // The streaks only run while there is still something to race for.
  const inMotion = live || bucket === 'invite' || bucket === 'sent';
  const lead = leadLine(sides);
  const diff = sides.me.km - sides.opponent.km;

  const status =
    bucket === 'active'
      ? 'Na żywo'
      : bucket === 'invite'
        ? 'Zaproszenie'
        : bucket === 'sent'
          ? 'Czeka na odpowiedź'
          : bucket === 'finished'
            ? result === 'win'
              ? 'Wygrana'
              : result === 'draw'
                ? 'Remis'
                : 'Przegrana'
            : (CLOSED_LABELS[challenge.status] ?? 'Zamknięte');

  return (
    <header className="relative isolate -mx-4 -mt-2 overflow-hidden rounded-b-[2rem] bg-[#050914] text-white">
      {/* Photo, drifting slowly so the scene never sits still */}
      <motion.img
        src={runnersPhoto}
        alt=""
        aria-hidden
        className={cn(
          'absolute inset-0 -z-10 h-full w-full object-cover object-[42%_center]',
          bucket === 'closed' && 'grayscale'
        )}
        initial={{ scale: 1.25, opacity: 0 }}
        animate={{ scale: [1.25, 1.08, 1.14], x: ['0%', '0%', '-2%'], opacity: 1 }}
        transition={{
          scale: { duration: 16, times: [0, 0.12, 1], ease: 'easeOut', repeat: Infinity, repeatType: 'mirror' },
          x: { duration: 16, times: [0, 0.12, 1], ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' },
          opacity: { duration: 0.5 },
        }}
      />
      {/* Darker towards the bottom, where the duel sits */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/20 via-40% to-black/90"
      />

      {inMotion && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 -skew-y-6 overflow-hidden">
          {STREAKS.map(streak => (
            <motion.span
              key={streak.top}
              className="absolute left-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
              style={{ top: streak.top, width: streak.width }}
              initial={{ x: '-110%' }}
              animate={{ x: '420%' }}
              transition={{
                duration: streak.duration,
                delay: streak.delay,
                repeat: Infinity,
                repeatDelay: 1.2,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      )}

      <div className="px-5 pb-6 pt-4">
        {/* Status + time */}
        <motion.div
          className="flex items-center justify-between gap-2"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide backdrop-blur-md',
              live ? 'bg-lime text-lime-foreground' : 'bg-white/15'
            )}
          >
            {live && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-foreground/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-foreground" />
              </span>
            )}
            {bucket === 'finished' && result === 'win' && <Trophy className="h-3.5 w-3.5" />}
            {status}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
            <Clock className="h-3.5 w-3.5" />
            {live ? `Zostało ${timeLeftLabel(challenge.endDate)}` : `do ${deadlineLabel(challenge.endDate)}`}
          </span>
        </motion.div>

        {/* The stake */}
        <div className="mt-7">
          <motion.p
            className="text-xs font-bold uppercase tracking-[0.22em] text-white/75"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: EASE_OUT }}
          >
            Wyścig biegowy do
          </motion.p>
          <div className="overflow-hidden pb-1">
            <motion.p
              className="font-display text-[6.5rem] font-bold uppercase italic leading-[0.82] tracking-tight"
              initial={{ y: '105%', skewX: -8 }}
              animate={{ y: 0, skewX: 0 }}
              transition={{ duration: 0.7, delay: 0.12, ease: EASE_OUT }}
            >
              {target}
              <span className="ml-2 text-[2.75rem] not-italic" style={{ color: HERO_ME_COLOR }}>
                km
              </span>
            </motion.p>
          </div>
          <motion.p
            className="mt-1 text-sm text-white/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            Kto pierwszy na mecie, ten wygrywa · do {deadlineLabel(challenge.endDate, 'd MMMM yyyy')}
          </motion.p>
        </div>

        {/* Head to head */}
        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <HeroRunner
            side={sides.me}
            label="Ty"
            color={HERO_ME_COLOR}
            from="left"
            showKm={hasRace}
            leading={live && diff > 0.01}
            winner={challenge.winnerId === myId}
          />
          <div className="relative mt-3 grid h-14 w-12 place-items-center">
            <motion.span
              aria-hidden
              className="absolute h-12 w-12 rounded-full border-2 border-white/80"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 2.8], opacity: [0.9, 0] }}
              transition={{ duration: 0.75, delay: 0.55, ease: 'easeOut' }}
            />
            <motion.span
              className="block"
              initial={{ scale: 3.2, opacity: 0, rotate: -24 }}
              animate={{ scale: 1, opacity: 1, rotate: -6 }}
              transition={{ type: 'spring', stiffness: 520, damping: 15, delay: 0.5 }}
            >
              <motion.span
                className="block font-display text-4xl font-bold italic leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
                animate={live ? { scale: [1, 1.12, 1] } : undefined}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
              >
                VS
              </motion.span>
            </motion.span>
          </div>
          <HeroRunner
            side={sides.opponent}
            label={opponentName}
            color={OPPONENT_COLOR}
            from="right"
            showKm={hasRace}
            leading={live && diff < -0.01}
            winner={!!challenge.winnerId && challenge.winnerId !== myId}
          />
        </div>

        {live && (
          <motion.p
            className={cn(
              'mx-auto mt-5 flex w-fit items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold',
              lead.tone === 'ahead'
                ? 'bg-lime text-lime-foreground'
                : lead.tone === 'behind'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/15 backdrop-blur-md'
            )}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 1 }}
          >
            {lead.tone === 'ahead' && <Zap className="h-4 w-4 fill-current" />}
            {lead.tone === 'behind' && <Flame className="h-4 w-4" />}
            {lead.text}
            {lead.tone === 'behind' && ' — goń!'}
          </motion.p>
        )}

        {challenge.message && (
          <motion.p
            className="mt-5 flex gap-2 rounded-2xl bg-white/10 px-3.5 py-3 text-sm backdrop-blur-md"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85, ease: EASE_OUT }}
          >
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/60" />
            <span className="min-w-0 break-words">
              {challenge.message}
              <span className="mt-0.5 block text-xs text-white/60">— {socialName(challenge.challenger)}</span>
            </span>
          </motion.p>
        )}
      </div>
    </header>
  );
}

function HeroRunner({
  side,
  label,
  color,
  from,
  showKm,
  leading,
  winner,
}: {
  side: ChallengeSides['me'];
  label: string;
  color: string;
  from: 'left' | 'right';
  showKm: boolean;
  leading: boolean;
  winner: boolean;
}) {
  return (
    <motion.div
      className="flex min-w-0 flex-col items-center text-center"
      initial={{ opacity: 0, x: from === 'left' ? -90 : 90, scale: 0.7 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 17, delay: 0.25 }}
    >
      <span className="relative">
        {/* Whoever leads keeps sending out a pulse */}
        {leading && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: color }}
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 1 }}
          />
        )}
        <span
          className="relative block rounded-full p-[3px]"
          style={{ backgroundColor: color, boxShadow: `0 0 32px -2px ${color}` }}
        >
          <SocialAvatar user={side.user} className="h-[4.5rem] w-[4.5rem] border-[3px] border-[#050914]" />
        </span>
        {winner && (
          <motion.span
            className="absolute -right-1.5 -top-1.5 grid h-8 w-8 place-items-center rounded-full bg-food text-background ring-2 ring-[#050914]"
            initial={{ scale: 0, rotate: -60 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 480, damping: 14, delay: 0.9 }}
          >
            <Trophy className="h-4 w-4" />
          </motion.span>
        )}
      </span>
      <p className="mt-2.5 w-full truncate text-sm font-semibold text-white/90">{label}</p>
      {showKm && (
        <p className="font-display text-5xl font-bold leading-none tabular-nums">
          <KmCount value={side.km} delay={0.55} />
          <span className="ml-1 font-body text-xs font-semibold text-white/65">km</span>
        </p>
      )}
    </motion.div>
  );
}

function LiveCard({ challenge, sides }: { challenge: ChallengeDetail; sides: ChallengeSides }) {
  const remaining = Math.max(0, challenge.targetKm - sides.me.km);
  const perDay = kmPerDayNeeded(remaining, challenge.endDate);
  const opponentRemaining = Math.max(0, challenge.targetKm - sides.opponent.km);

  return (
    <motion.section variants={rise} className="grid grid-cols-2 gap-3">
      <div className="relative overflow-hidden rounded-2xl bg-card p-4">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: ME_COLOR }} />
        <p className="text-xs font-semibold text-muted-foreground">Do mety</p>
        <p className="mt-1 font-display text-4xl font-bold leading-none tabular-nums">
          <KmCount value={remaining} delay={0.6} />
          <span className="ml-1 font-body text-sm font-semibold text-muted-foreground">km</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Rywal: <span className="font-semibold text-foreground">{formatChallengeKm(opponentRemaining)} km</span>
        </p>
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-card p-4">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-run" />
        <p className="text-xs font-semibold text-muted-foreground">Twoje tempo na metę</p>
        {perDay !== null ? (
          <>
            <p className="mt-1 font-display text-4xl font-bold leading-none tabular-nums">
              <KmCount value={Math.round(perDay * 10) / 10} delay={0.7} />
              <span className="ml-1 font-body text-sm font-semibold text-muted-foreground">km/dzień</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              przez <span className="font-semibold text-foreground">{timeLeftLabel(challenge.endDate)}</span>
            </p>
          </>
        ) : (
          <p className="mt-1 font-display text-3xl font-bold uppercase leading-none">Ostatnia prosta!</p>
        )}
      </div>
    </motion.section>
  );
}

const CONFETTI_COLORS = ['hsl(var(--food))', 'hsl(var(--lime))', 'hsl(var(--primary))', 'hsl(var(--run))'];

/** The trophy lands and throws confetti — once, when the win card shows. */
function WinBurst() {
  return (
    <div className="relative mx-auto mb-3 grid h-14 w-14 place-items-center">
      <motion.span
        aria-hidden
        className="absolute -inset-10 rounded-full bg-[conic-gradient(from_0deg,transparent_0_20deg,hsl(var(--food)/0.25)_20deg_40deg,transparent_40deg_60deg,hsl(var(--food)/0.25)_60deg_80deg,transparent_80deg_100deg,hsl(var(--food)/0.25)_100deg_120deg,transparent_120deg_140deg,hsl(var(--food)/0.25)_140deg_160deg,transparent_160deg_180deg,hsl(var(--food)/0.25)_180deg_200deg,transparent_200deg_220deg,hsl(var(--food)/0.25)_220deg_240deg,transparent_240deg_260deg,hsl(var(--food)/0.25)_260deg_280deg,transparent_280deg_300deg,hsl(var(--food)/0.25)_300deg_320deg,transparent_320deg_340deg,hsl(var(--food)/0.25)_340deg_360deg)] [mask-image:radial-gradient(circle,black_20%,transparent_68%)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
      {Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const distance = 70 + (i % 3) * 22;
        return (
          <motion.span
            key={i}
            aria-hidden
            className="absolute h-2 w-1.5 rounded-[1px]"
            style={{ backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + 24,
              scale: [0, 1, 1],
              opacity: [1, 1, 0],
              rotate: 240 + i * 30,
            }}
            transition={{ duration: 1.3, delay: 0.95 + (i % 4) * 0.03, ease: EASE_OUT }}
          />
        );
      })}
      <motion.span
        className="relative block"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 12, delay: 0.85 }}
      >
        <Trophy className="h-10 w-10 text-food" />
      </motion.span>
    </div>
  );
}

function ResultCard({
  challenge,
  sides,
  result,
  onRematch,
}: {
  challenge: ChallengeDetail;
  sides: ChallengeSides;
  result: 'win' | 'loss' | 'draw';
  onRematch: () => void;
}) {
  const opponentName = socialName(sides.opponent.user);
  const target = formatChallengeKm(challenge.targetKm);

  const title = result === 'win' ? 'Wygrywasz! 🏆' : result === 'draw' ? 'Remis' : `Wygrywa ${opponentName}`;
  const reason =
    challenge.outcome === 'forfeit'
      ? result === 'win'
        ? `${opponentName} poddał(a) wyzwanie.`
        : 'Wyzwanie zostało poddane.'
      : challenge.outcome === 'target'
        ? result === 'win'
          ? `Pierwsza meta na ${target} km — ${format(new Date(sides.me.reachedAt ?? challenge.completedAt ?? challenge.endDate), 'd MMMM, HH:mm', { locale: pl })}.`
          : `${opponentName} dobiegł(a) do ${target} km jako pierwszy(-a).`
        : result === 'draw'
          ? 'Do terminu nikt nie dobiegł do celu, a wynik jest równy.'
          : `Do terminu nikt nie dobiegł do celu — ${result === 'win' ? 'masz' : `${opponentName} ma`} więcej kilometrów.`;

  return (
    <motion.section
      variants={rise}
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 text-center',
        result === 'win' ? 'bg-food/10 ring-1 ring-food/30' : 'bg-card'
      )}
    >
      {result === 'win' && <WinBurst />}
      <p className="relative font-display text-3xl font-bold uppercase leading-none">{title}</p>
      <p className="relative mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{reason}</p>
      {result === 'win' && challenge.rewardPoints ? (
        <p className="mt-3 inline-flex rounded-full bg-food/15 px-3 py-1 text-sm font-bold text-food">
          +{challenge.rewardPoints} FitCoinów
        </p>
      ) : null}
      <Button variant="secondary" className="relative mt-4 w-full" onClick={onRematch}>
        <RotateCcw />
        {result === 'loss' ? 'Rewanż' : 'Jeszcze raz'}
      </Button>
    </motion.section>
  );
}

function RunsList({ challenge, sides }: { challenge: ChallengeDetail; sides: ChallengeSides }) {
  const myId = sides.me.user.userId;

  return (
    <motion.section variants={rise}>
      <h2 className="mb-2 px-1 text-[15px] font-semibold">Biegi w wyzwaniu</h2>
      {challenge.runs.length === 0 ? (
        <EmptyState
          icon={Footprints}
          title="Jeszcze nikt nie pobiegł"
          description="Nagraj bieg w aplikacji albo zsynchronizuj Stravę — kilometry doliczą się same."
          action={
            <Button asChild size="sm">
              <Link to="/athlete/running">Biegnij</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card">
          {challenge.runs.map((run, index) => {
            const isMine = run.userId === myId;
            const side = isMine ? sides.me : sides.opponent;
            return (
              <motion.li
                key={`${run.source}-${run.id}`}
                className="flex items-center gap-3 px-3.5 py-3"
                initial={{ opacity: 0, x: isMine ? -28 : 28 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.1 + Math.min(index, 6) * 0.06 }}
              >
                <span className="rounded-full p-[2px]" style={{ backgroundColor: isMine ? ME_COLOR : OPPONENT_COLOR }}>
                  <SocialAvatar user={side.user} className="h-9 w-9 border-2 border-card" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {isMine ? 'Ty' : socialName(side.user)}
                    {run.title && <span className="font-normal text-muted-foreground"> · {run.title}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <span className="inline-block first-letter:uppercase">
                      {format(new Date(run.date), 'EEEE, d MMM · HH:mm', { locale: pl })}
                    </span>
                    {run.source === 'strava' && (
                      <span className="font-semibold" style={{ color: STRAVA_COLOR }}>
                        {' '}
                        · Strava
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 font-display text-2xl font-bold tabular-nums">
                  +{formatChallengeKm(run.distanceKm)}
                  <span className="ml-0.5 font-body text-xs font-semibold text-muted-foreground">km</span>
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
