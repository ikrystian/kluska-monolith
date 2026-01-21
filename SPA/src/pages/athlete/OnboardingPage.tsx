import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateDoc } from '@/hooks/useMutation';
import { useDoc } from '@/hooks/useDoc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/types';

// Simplified One-Page Onboarding for SPA to save time and complexity
export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We already fetch user profile in layout usually, but let's fetch here to check if completed
  const { data: userProfile } = useDoc<UserProfile>(user ? 'users' : null, user?.id || null);

  const { mutate: updateProfile } = useUpdateDoc<UserProfile>('users');

  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    age: '',
    height: '',
    weight: '',
    trainingLevel: 'beginner',
    goals: [] as string[]
  });

  // If already onboarded, redirect
  if (userProfile?.onboardingCompleted) {
    navigate('/athlete/dashboard');
    return null;
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (!user) return;
    setIsSubmitting(true);

    updateProfile({
      id: user.id,
      data: {
        name: formData.name,
        gender: formData.gender as any,
        age: parseInt(formData.age),
        height: parseInt(formData.height),
        weight: parseInt(formData.weight),
        trainingLevel: formData.trainingLevel as any,
        onboardingCompleted: true,
        updatedAt: new Date().toISOString()
      } as any
    }, {
      onSuccess: () => {
        toast.success('Profil skonfigurowany!');
        navigate('/athlete/dashboard');
      },
      onError: () => {
        toast.error('Wystąpił błąd', { description: 'Nie udało się zapisać profilu.' });
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-headline">
            {step === 1 && 'Witaj w Platformie!'}
            {step === 2 && 'O Tobie'}
            {step === 3 && 'Pomiary'}
            {step === 4 && 'Doświadczenie'}
          </CardTitle>
          <CardDescription className="text-center">
            Krok {step} z 4. Skonfiguruj swój profil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Jak masz na imię?</Label>
                <Input
                  id="name"
                  placeholder="Twoje imię"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Płeć</Label>
                <RadioGroup value={formData.gender} onValueChange={(val) => handleChange('gender', val)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Mężczyzna</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Kobieta</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="age">Wiek (lat)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="np. 25"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="height">Wzrost (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="np. 180"
                  value={formData.height}
                  onChange={(e) => handleChange('height', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Waga (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="np. 80"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Poziom zaawansowania</Label>
                <Select value={formData.trainingLevel} onValueChange={(val) => handleChange('trainingLevel', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz poziom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Początkujący</SelectItem>
                    <SelectItem value="intermediate">Średniozaawansowany</SelectItem>
                    <SelectItem value="advanced">Zaawansowany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Wstecz
            </Button>
          )}
          {step < 4 ? (
            <Button className="ml-auto" onClick={handleNext} disabled={!formData.name && step === 1}>
              Dalej
            </Button>
          ) : (
            <Button className="ml-auto" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zakończ
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
