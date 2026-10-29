import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MapPin } from 'lucide-react';
import { Facebook, Instagram, Twitter } from '@/components/ui/social-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUser, useUpdateDoc } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

const optionalUrl = z.string().trim().url('Podaj pełny adres, np. https://…').or(z.literal(''));

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Imię jest wymagane.'),
  email: z.string().trim().email('Nieprawidłowy adres email.'),
  location: z.string().trim().max(80, 'Maksymalnie 80 znaków.'),
  socialLinks: z.object({
    instagram: optionalUrl,
    facebook: optionalUrl,
    twitter: optionalUrl,
  }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const SOCIAL_FIELDS = [
  { name: 'socialLinks.instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/twojprofil' },
  { name: 'socialLinks.facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/twojprofil' },
  { name: 'socialLinks.twitter', label: 'Twitter / X', icon: Twitter, placeholder: 'https://x.com/twojprofil' },
] as const;

interface ProfileEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
  onSaved: () => void;
}

export function ProfileEditSheet({ open, onOpenChange, userProfile, onSaved }: ProfileEditSheetProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: userProfile.name || '',
      email: userProfile.email || '',
      location: userProfile.location || '',
      socialLinks: {
        instagram: userProfile.socialLinks?.instagram || '',
        facebook: userProfile.socialLinks?.facebook || '',
        twitter: userProfile.socialLinks?.twitter || '',
      },
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    try {
      await updateDoc('users', user.uid, { ...userProfile, ...data });
      toast({ title: 'Zapisano', description: 'Twój profil został zaktualizowany.' });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: 'Błąd!', description: 'Nie udało się zaktualizować profilu.', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="font-headline text-xl">Edytuj profil</SheetTitle>
          <SheetDescription>Te dane widzą Twoi znajomi i trener.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię i nazwisko</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Miasto
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="np. Kraków" autoComplete="address-level2" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Pomaga znaleźć Cię sportowcom z okolicy.</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 border-t border-border/60 pt-4">
              <p className="text-sm font-semibold">Media społecznościowe</p>
              {SOCIAL_FIELDS.map(({ name, label, icon: Icon, placeholder }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </FormLabel>
                      <FormControl>
                        <Input type="url" inputMode="url" placeholder={placeholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-full font-semibold"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz zmiany
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
