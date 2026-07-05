'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, X, Loader2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useCreateDoc, useUser, useCollection } from '@/lib/db-hooks';

const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(3, 'Nickname musi mieć co najmniej 3 znaki')
    .max(20, 'Nickname może mieć maksymalnie 20 znaków')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nickname może zawierać tylko litery, cyfry i podkreślenia'),
  bio: z.string().max(160, 'Bio może mieć maksymalnie 160 znaków').optional(),
});

type NicknameFormValues = z.infer<typeof nicknameSchema>;

interface NicknameSetupProps {
  onComplete: () => void;
}

export function NicknameSetup({ onComplete }: NicknameSetupProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const { createDoc, isLoading: isCreating } = useCreateDoc();
  const [nicknameToCheck, setNicknameToCheck] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Check nickname availability
  const { data: existingProfiles, isLoading: isCheckingDb } = useCollection<any>(
    nicknameToCheck.length >= 3 ? 'socialProfiles' : null,
    nicknameToCheck.length >= 3 ? { nickname: nicknameToCheck } : undefined
  );

  useEffect(() => {
    if (nicknameToCheck.length >= 3 && !isCheckingDb && existingProfiles !== null) {
      setIsAvailable(existingProfiles.length === 0);
      setIsChecking(false);
    }
  }, [existingProfiles, isCheckingDb, nicknameToCheck]);

  const form = useForm<NicknameFormValues>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: {
      nickname: '',
      bio: '',
    },
  });

  const watchedNickname = form.watch('nickname');

  // Debounced nickname check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedNickname.length >= 3 && /^[a-zA-Z0-9_]+$/.test(watchedNickname)) {
        setIsChecking(true);
        setNicknameToCheck(watchedNickname.toLowerCase());
      } else {
        setIsAvailable(null);
        setNicknameToCheck('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedNickname]);

  const onSubmit = async (data: NicknameFormValues) => {
    if (!user || !isAvailable) return;

    try {
      await createDoc('socialProfiles', {
        userId: user.uid,
        nickname: data.nickname.toLowerCase(),
        bio: data.bio || '',
      });

      toast({
        title: 'Sukces!',
        description: 'Twój profil społecznościowy został utworzony.',
      });

      onComplete();
    } catch (error) {
      console.error('Error creating social profile:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się utworzyć profilu. Spróbuj ponownie.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Witaj w Social Wall!</CardTitle>
          <CardDescription>
            Wybierz swój unikalny nickname, aby dołączyć do społeczności fitness.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="twoj_nickname"
                          className="pl-10 pr-10"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setIsAvailable(null);
                          }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isChecking || isCheckingDb ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : isAvailable === true ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : isAvailable === false ? (
                            <X className="h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      </div>
                    </FormControl>
                    {isAvailable === true && (
                      <p className="text-sm text-green-500">Nickname jest dostępny!</p>
                    )}
                    {isAvailable === false && (
                      <p className="text-sm text-red-500">Ten nickname jest już zajęty.</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (opcjonalne)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Napisz coś o sobie..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground text-right">
                      {field.value?.length || 0}/160
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={!isAvailable || isCreating}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreating ? 'Tworzenie profilu...' : 'Kontynuuj'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}