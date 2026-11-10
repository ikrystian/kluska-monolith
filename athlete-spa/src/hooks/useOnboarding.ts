'use client';

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Gender, TrainingLevelType, OnboardingData } from '@/models/types/user';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ONBOARDING_PENDING_KEY, ONBOARDING_SKIPPED_KEY } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api-client';

export interface OnboardingState {
  name: string;
  gender: Gender | null;
  dateOfBirth: string;
  height: number | null;
  weight: number | null;
  trainingLevel: TrainingLevelType | null;
}

// Smart defaults: pola, których typową wartość znamy, są wstępnie wypełnione —
// użytkownik skanuje i poprawia zamiast decydować od zera. Dane tożsamościowe
// (imię, płeć, data urodzenia) celowo pozostają puste.
const initialState: OnboardingState = {
  name: '',
  gender: null,
  dateOfBirth: '',
  height: 175,
  weight: 75,
  trainingLevel: 'beginner',
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
  /** Jump to a data step from the summary; "Dalej" then returns to the summary. */
  editStep: (step: number) => void;
  /** True while editing a single answer opened from the summary. */
  isEditingFromSummary: boolean;
  /** Leave the wizard without saving; the dashboard keeps a reminder card. */
  skipOnboarding: () => void;
  /** Data steps still ahead of the current one (welcome counts all of them). */
  remainingDataSteps: number;
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
  const [returnToSummary, setReturnToSummary] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetch: refetchUserProfile } = useUserProfile();

  const totalSteps = ONBOARDING_STEPS.length;
  const currentStepName = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isDataStep = currentStep > 0 && currentStep < totalSteps - 1;

  // Calculate progress (excluding welcome and summary)
  const dataSteps = totalSteps - 2; // Exclude welcome and summary
  const currentDataStep = Math.max(0, Math.min(currentStep - 1, dataSteps));
  // Goal gradient: pasek nigdy nie startuje od 0% — ekran powitalny liczy się
  // jako ukończony pierwszy krok, więc na starcie danych użytkownik widzi postęp.
  const progress = isFirstStep ? 0 : isLastStep ? 100 : ((currentDataStep + 1) / (dataSteps + 1)) * 100;

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
    if (returnToSummary) {
      setReturnToSummary(false);
      setCurrentStep(totalSteps - 1);
      return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps, returnToSummary]);

  const prevStep = useCallback(() => {
    if (returnToSummary) {
      setReturnToSummary(false);
      setCurrentStep(totalSteps - 1);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, totalSteps, returnToSummary]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const editStep = useCallback((step: number) => {
    if (step > 0 && step < totalSteps - 1) {
      setReturnToSummary(true);
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const skipOnboarding = useCallback(() => {
    // Nothing is saved: the profile stays incomplete and the dashboard shows a
    // reminder card that brings the athlete back here.
    localStorage.removeItem(ONBOARDING_PENDING_KEY);
    localStorage.setItem(ONBOARDING_SKIPPED_KEY, '1');
    navigate('/athlete/dashboard', { replace: true });
  }, [navigate]);

  const remainingDataSteps = Math.max(0, dataSteps - Math.max(0, currentStep - 1));

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
      const response = await apiFetch('/api/onboarding/complete', {
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
        description: 'Twój profil został skonfigurowany. Witaj w #leniwakluska!',
      });

      // Wizard is done — clear the marker so relaunches skip it.
      localStorage.removeItem(ONBOARDING_PENDING_KEY);
      localStorage.removeItem(ONBOARDING_SKIPPED_KEY);

      // Refetch user profile to update the cached data
      if (refetchUserProfile) {
        await refetchUserProfile();
      }

      // Redirect to dashboard
      navigate('/athlete/dashboard');
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Wystąpił błąd podczas zapisywania danych',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isSubmitting, navigate, toast, refetchUserProfile]);

  return {
    currentStep,
    currentStepName,
    totalSteps,
    data,
    setStepData,
    nextStep,
    prevStep,
    goToStep,
    editStep,
    isEditingFromSummary: returnToSummary,
    skipOnboarding,
    remainingDataSteps,
    isFirstStep,
    isLastStep,
    isDataStep,
    canProceed: canProceed(),
    submitOnboarding,
    isSubmitting,
    progress,
  };
}
