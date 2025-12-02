'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Gender, TrainingLevelType, OnboardingData } from '@/models/types/user';

export interface OnboardingState {
  name: string;
  gender: Gender | null;
  dateOfBirth: string;
  height: number | null;
  weight: number | null;
  trainingLevel: TrainingLevelType | null;
}

const initialState: OnboardingState = {
  name: '',
  gender: null,
  dateOfBirth: '',
  height: null,
  weight: null,
  trainingLevel: null,
};

export const ONBOARDING_STEPS = [
  'welcome',
  'name',
  'gender',
  'birthDate',
  'height',
  'weight',
  'trainingLevel',
  'summary',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface UseOnboardingReturn {
  currentStep: number;
  currentStepName: OnboardingStep;
  totalSteps: number;
  data: OnboardingState;
  setStepData: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isDataStep: boolean;
  canProceed: boolean;
  submitOnboarding: () => Promise<void>;
  isSubmitting: boolean;
  progress: number;
}

export function useOnboarding(initialName: string = ''): UseOnboardingReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingState>({
    ...initialState,
    name: initialName,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const totalSteps = ONBOARDING_STEPS.length;
  const currentStepName = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isDataStep = currentStep > 0 && currentStep < totalSteps - 1;

  // Calculate progress (excluding welcome and summary)
  const dataSteps = totalSteps - 2; // Exclude welcome and summary
  const currentDataStep = Math.max(0, Math.min(currentStep - 1, dataSteps));
  const progress = isFirstStep ? 0 : isLastStep ? 100 : (currentDataStep / dataSteps) * 100;

  const setStepData = useCallback(<K extends keyof OnboardingState>(
    key: K,
    value: OnboardingState[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canProceed = useCallback(() => {
    switch (currentStepName) {
      case 'welcome':
        return true;
      case 'name':
        return data.name.trim().length >= 2;
      case 'gender':
        return data.gender !== null;
      case 'birthDate':
        if (!data.dateOfBirth) return false;
        const birthDate = new Date(data.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 13 && age <= 100;
      case 'height':
        return data.height !== null && data.height >= 100 && data.height <= 250;
      case 'weight':
        return data.weight !== null && data.weight >= 30 && data.weight <= 300;
      case 'trainingLevel':
        return data.trainingLevel !== null;
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [currentStepName, data]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const submitOnboarding = useCallback(async () => {
    if (isSubmitting) return;

    // Validate all data
    if (
      !data.name ||
      !data.gender ||
      !data.dateOfBirth ||
      !data.height ||
      !data.weight ||
      !data.trainingLevel
    ) {
      toast({
        title: 'Błąd',
        description: 'Proszę wypełnić wszystkie pola',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
          height: data.height,
          weight: data.weight,
          trainingLevel: data.trainingLevel,
        } as OnboardingData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Wystąpił błąd podczas zapisywania danych');
      }

      toast({
        title: 'Sukces!',
        description: 'Twój profil został skonfigurowany. Witaj w GymProgress!',
      });

      // Redirect to dashboard
      router.push('/athlete/dashboard');
      router.refresh();
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Wystąpił błąd podczas zapisywania danych',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isSubmitting, router, toast]);

  return {
    currentStep,
    currentStepName,
    totalSteps,
    data,
    setStepData,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    isDataStep,
    canProceed: canProceed(),
    submitOnboarding,
    isSubmitting,
    progress,
  };
}