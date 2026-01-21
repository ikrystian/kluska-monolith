'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingProgress } from './OnboardingProgress';
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

export function OnboardingWizard({ initialName = '' }: OnboardingWizardProps) {
  const {
    currentStep,
    currentStepName,
    totalSteps,
    data,
    setStepData,
    nextStep,
    prevStep,
    goToStep,
    isDataStep,
    canProceed,
    submitOnboarding,
    isSubmitting,
    progress,
  } = useOnboarding(initialName);

  const renderStep = () => {
    switch (currentStepName) {
      case 'welcome':
        return <WelcomeStep onNext={nextStep} />;
      case 'name':
        return (
          <NameStep
            value={data.name}
            onChange={(value) => setStepData('name', value)}
            onNext={nextStep}
            onPrev={prevStep}
            canProceed={canProceed}
          />
        );
      case 'gender':
        return (
          <GenderStep
            value={data.gender}
            onChange={(value) => setStepData('gender', value)}
            onNext={nextStep}
            onPrev={prevStep}
            canProceed={canProceed}
          />
        );
      case 'birthDate':
        return (
          <BirthDateStep
            value={data.dateOfBirth}
            onChange={(value) => setStepData('dateOfBirth', value)}
            onNext={nextStep}
            onPrev={prevStep}
            canProceed={canProceed}
          />
        );
      case 'height':
        return (
          <HeightStep
            value={data.height}
            onChange={(value) => setStepData('height', value)}
            onNext={nextStep}
            onPrev={prevStep}
            canProceed={canProceed}
          />
        );
      case 'weight':
        return (
          <WeightStep
            value={data.weight}
            height={data.height}
            onChange={(value) => setStepData('weight', value)}
            onNext={nextStep}
            onPrev={prevStep}
            canProceed={canProceed}
          />
        );
      case 'trainingLevel':
        return (
          <TrainingLevelStep
            value={data.trainingLevel}
            onChange={(value) => setStepData('trainingLevel', value)}
            onNext={nextStep}
            onPrev={prevStep}
            canProceed={canProceed}
          />
        );
      case 'summary':
        return (
          <SummaryStep
            data={data}
            onSubmit={submitOnboarding}
            onPrev={prevStep}
            onEdit={goToStep}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pt-6 pb-4"
      >
        <OnboardingProgress
          progress={progress}
          currentStep={currentStep}
          totalSteps={totalSteps}
          isDataStep={isDataStep}
        />
      </motion.div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepName}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}