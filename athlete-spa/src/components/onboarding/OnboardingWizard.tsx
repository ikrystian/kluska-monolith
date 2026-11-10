import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding, type OnboardingStep } from '@/hooks/useOnboarding';
import { OnboardingShell, StepHeading } from './OnboardingShell';
import { SkipOnboardingDialog } from './SkipOnboardingDialog';
import { WelcomeStep } from './steps/WelcomeStep';
import { NameStep } from './steps/NameStep';
import { GenderStep } from './steps/GenderStep';
import { BirthDateStep } from './steps/BirthDateStep';
import { HeightStep } from './steps/HeightStep';
import { WeightStep } from './steps/WeightStep';
import { TrainingLevelStep } from './steps/TrainingLevelStep';
import { SummaryStep } from './steps/SummaryStep';

interface OnboardingWizardProps {
  initialName?: string;
}

/** Copy per question: the title asks, `why` says what we do with the answer. */
const STEP_COPY: Record<Exclude<OnboardingStep, 'welcome'>, { title: ReactNode; subtitle?: string; why?: string }> = {
  name: {
    title: 'Jak masz na imię?',
    subtitle: 'Tak będziemy się do Ciebie zwracać w aplikacji.',
  },
  gender: {
    title: 'Twoja płeć',
    subtitle: 'Wybierz opcję, która do Ciebie pasuje.',
    why: 'Płeć wpływa na wyliczenie zapotrzebowania kalorycznego i norm siłowych.',
  },
  birthDate: {
    title: 'Data urodzenia',
    subtitle: 'Wiek zmienia tętno maksymalne i strefy treningowe.',
    why: 'Data nie jest widoczna dla innych użytkowników.',
  },
  height: {
    title: 'Ile masz wzrostu?',
    subtitle: 'Ustawiliśmy typową wartość — popraw ją na swoją.',
    why: 'Wzrost razem z wagą daje BMI i dokładniejsze kalorie.',
  },
  weight: {
    title: 'Ile ważysz?',
    subtitle: 'Wystarczy z grubsza — później zapiszesz dokładne pomiary.',
    why: 'Na tej podstawie liczymy kalorie, makro i siłę względem masy ciała.',
  },
  trainingLevel: {
    title: 'Twoje doświadczenie',
    subtitle: 'Bez spiny — poziom zmienisz w każdej chwili.',
    why: 'Dobierzemy objętość treningu i tempo progresji obciążeń.',
  },
  summary: {
    title: 'Wszystko się zgadza?',
    subtitle: 'Dotknij kafelka, żeby coś poprawić.',
  },
};

export function OnboardingWizard({ initialName = '' }: OnboardingWizardProps) {
  const {
    currentStep,
    currentStepName,
    totalSteps,
    data,
    setStepData,
    nextStep,
    prevStep,
    editStep,
    isEditingFromSummary,
    skipOnboarding,
    remainingDataSteps,
    canProceed,
    submitOnboarding,
    isSubmitting,
  } = useOnboarding(initialName);

  const [skipOpen, setSkipOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Slide forward or back depending on where we came from.
  const prevStepRef = useRef(currentStep);
  const direction = currentStep >= prevStepRef.current ? 1 : -1;
  prevStepRef.current = currentStep;

  const dataStepCount = totalSteps - 2;
  const openSkip = () => setSkipOpen(true);

  const skipDialog = (
    <SkipOnboardingDialog
      open={skipOpen}
      onOpenChange={setSkipOpen}
      onConfirmSkip={skipOnboarding}
      remainingSteps={remainingDataSteps}
    />
  );

  if (currentStepName === 'welcome') {
    return (
      <>
        <WelcomeStep name={data.name} onNext={nextStep} onSkip={openSkip} totalQuestions={dataStepCount} />
        {skipDialog}
      </>
    );
  }

  const isSummary = currentStepName === 'summary';
  const copy = STEP_COPY[currentStepName];
  const goNext = () => canProceed && nextStep();

  const body = (() => {
    switch (currentStepName) {
      case 'name':
        return <NameStep value={data.name} onChange={(v) => setStepData('name', v)} onSubmit={goNext} />;
      case 'gender':
        return <GenderStep value={data.gender} onChange={(v) => setStepData('gender', v)} />;
      case 'birthDate':
        return <BirthDateStep value={data.dateOfBirth} onChange={(v) => setStepData('dateOfBirth', v)} />;
      case 'height':
        return <HeightStep value={data.height} onChange={(v) => setStepData('height', v)} />;
      case 'weight':
        return <WeightStep value={data.weight} height={data.height} onChange={(v) => setStepData('weight', v)} />;
      case 'trainingLevel':
        return <TrainingLevelStep value={data.trainingLevel} onChange={(v) => setStepData('trainingLevel', v)} />;
      case 'summary':
        return <SummaryStep data={data} onEdit={editStep} />;
    }
  })();

  const footer = isSummary ? (
    <Button onClick={submitOnboarding} disabled={isSubmitting} size="lg" className="h-14 w-full rounded-2xl text-base">
      {isSubmitting ? (
        <>
          <Loader2 className="animate-spin" />
          Zapisywanie…
        </>
      ) : (
        <>
          Zaczynamy trenować
          <ArrowRight />
        </>
      )}
    </Button>
  ) : (
    <Button onClick={goNext} disabled={!canProceed} size="lg" className="h-14 w-full rounded-2xl text-base">
      {isEditingFromSummary ? (
        <>
          <Check />
          Zapisz zmianę
        </>
      ) : (
        <>
          Dalej
          <ArrowRight />
        </>
      )}
    </Button>
  );

  const offset = reduceMotion ? 0 : 32;

  return (
    <>
      <OnboardingShell
        step={isSummary ? dataStepCount + 1 : currentStep}
        total={dataStepCount}
        onBack={prevStep}
        onSkip={isSummary || isEditingFromSummary ? undefined : openSkip}
        why={copy.why}
        footer={footer}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentStepName}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: dir * offset }),
              center: { opacity: 1, x: 0 },
              exit: (dir: number) => ({ opacity: 0, x: dir * -offset }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <StepHeading
              eyebrow={isSummary ? 'Ostatni krok' : `Pytanie ${currentStep} z ${dataStepCount}`}
              title={isSummary && data.name ? <>Gotowe, {data.name.trim().split(/\s+/)[0]}!</> : copy.title}
              subtitle={copy.subtitle}
            />
            {body}
          </motion.div>
        </AnimatePresence>
      </OnboardingShell>
      {skipDialog}
    </>
  );
}
