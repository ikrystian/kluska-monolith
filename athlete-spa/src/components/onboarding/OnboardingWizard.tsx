import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding, type OnboardingStep } from '@/hooks/useOnboarding';
import { useIsTablet } from '@/hooks/useIsTablet';
import { haptic } from '@/lib/haptics';
import { OnboardingBackdrop } from './OnboardingBackdrop';
import { OnboardingPoster } from './OnboardingPoster';
import { OnboardingShell, StepHeading } from './OnboardingShell';
import { EASE, StepDirection, stepVariants } from './motion';
import './onboarding.css';
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
const STEP_COPY: Record<Exclude<OnboardingStep, 'welcome'>, { title: string; subtitle?: string; why?: string }> = {
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
  const isTablet = useIsTablet();

  // Slide forward or back depending on where we came from.
  const prevStepRef = useRef(currentStep);
  const direction = currentStep >= prevStepRef.current ? 1 : -1;
  prevStepRef.current = currentStep;

  const dataStepCount = totalSteps - 2;
  const openSkip = () => setSkipOpen(true);
  const isWelcome = currentStepName === 'welcome';
  const isSummary = currentStepName === 'summary';

  // The finish line deserves to be felt, not only seen.
  useEffect(() => {
    if (isSummary) haptic('success');
  }, [isSummary]);

  const goNext = () => {
    if (!canProceed) return;
    haptic('tap');
    nextStep();
  };

  const body = (() => {
    switch (currentStepName) {
      case 'welcome':
        return null;
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
    <Button
      onClick={submitOnboarding}
      disabled={isSubmitting}
      variant="volt"
      size="lg"
      data-tone="lime"
      className="onb-cta h-14 w-full rounded-2xl text-base"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="animate-spin" />
          Zapisywanie…
        </>
      ) : (
        <>
          Zaczynamy trenować
          <ArrowRight className="onb-cta__arrow" />
        </>
      )}
    </Button>
  ) : (
    // A short pop the moment the answer becomes valid: "you can go on now".
    <motion.div
      initial={false}
      animate={canProceed ? { scale: [1, 1.035, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Button onClick={goNext} disabled={!canProceed} size="lg" className="onb-cta h-14 w-full rounded-2xl text-base">
        {isEditingFromSummary ? (
          <>
            <Check />
            Zapisz zmianę
          </>
        ) : (
          <>
            Dalej
            <ArrowRight className="onb-cta__arrow" />
          </>
        )}
      </Button>
    </motion.div>
  );

  const copy = isWelcome ? null : STEP_COPY[currentStepName];

  return (
    <MotionConfig reducedMotion="user">
      <div className="onb-root" data-split={isTablet || undefined}>
        <OnboardingBackdrop step={currentStep} total={totalSteps} />
        {isTablet && <OnboardingPoster data={data} step={currentStep} />}

        <div className="relative h-full min-h-0 min-w-0">
          <AnimatePresence mode="wait">
            {isWelcome ? (
              <motion.div
                key="welcome"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.4 } }}
                exit={{ opacity: 0, y: -28, scale: 0.97, transition: { duration: 0.24, ease: 'easeIn' } }}
              >
                <WelcomeStep
                  name={data.name}
                  onNext={nextStep}
                  onSkip={openSkip}
                  totalQuestions={dataStepCount}
                  compact={isTablet}
                />
              </motion.div>
            ) : (
              <motion.div
                key="steps"
                className="absolute inset-0"
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } }}
                exit={{ opacity: 0, y: 28, transition: { duration: 0.2, ease: 'easeIn' } }}
              >
                <OnboardingShell
                  step={isSummary ? dataStepCount + 1 : currentStep}
                  total={dataStepCount}
                  stepKey={currentStepName}
                  direction={direction}
                  onBack={prevStep}
                  onSkip={isSummary || isEditingFromSummary ? undefined : openSkip}
                  why={copy?.why}
                  footer={footer}
                >
                  <StepDirection value={direction}>
                    <AnimatePresence mode="wait" custom={direction}>
                      <motion.div
                        key={currentStepName}
                        custom={direction}
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                      >
                        {!isSummary && copy && (
                          <StepHeading step={currentStep} total={dataStepCount} title={copy.title} subtitle={copy.subtitle} />
                        )}
                        {body}
                      </motion.div>
                    </AnimatePresence>
                  </StepDirection>
                </OnboardingShell>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SkipOnboardingDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        onConfirmSkip={skipOnboarding}
        remainingSteps={remainingDataSteps}
      />
    </MotionConfig>
  );
}
