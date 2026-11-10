'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Loader2, ArrowLeft, ChefHat } from 'lucide-react';
import Link from 'next/link';
import { isRecipeCategory, parseRecipe, type ArticleRecipe } from '@/lib/article-recipe';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'published' | 'draft';
  coverImageUrl?: string;
  imageHint?: string;
  recipe?: ArticleRecipe | null;
}

interface ArticleCategory {
  id: string;
  name: string;
}

interface ArticleFormProps {
  article?: Article;
  categories: ArticleCategory[];
  onSubmit: (data: ArticleFormValues) => Promise<void>;
  isLoading?: boolean;
}

const articleSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  content: z.string().min(10, 'Treść musi zawierać przynajmniej 10 znaków.'),
  category: z.string().min(1, 'Kategoria jest wymagana.'),
  status: z.enum(['draft', 'published']),
  coverImageUrl: z.string().url('Nieprawidłowy URL obrazu').optional().or(z.literal('')),
  imageHint: z.string().optional(),
  // Recipe block (category "Przepisy"), kept as strings for the inputs.
  recipeDishName: z.string().optional(),
  recipeServings: z.string().optional(),
  recipePrepMinutes: z.string().optional(),
  recipeMealType: z.string().optional(),
  recipeCalories: z.string().optional(),
  recipeProtein: z.string().optional(),
  recipeCarbs: z.string().optional(),
  recipeFat: z.string().optional(),
});

export type ArticleFormValues = z.infer<typeof articleSchema>;

/** Recipe block to save with the article, or null when it is not a recipe / has no kcal. */
export function recipeFromForm(data: ArticleFormValues): ArticleRecipe | null {
  if (!isRecipeCategory(data.category)) return null;
  return parseRecipe({
    dishName: data.recipeDishName,
    servings: data.recipeServings || 1,
    prepMinutes: data.recipePrepMinutes,
    mealType: data.recipeMealType || undefined,
    calories: data.recipeCalories,
    protein: data.recipeProtein || 0,
    carbs: data.recipeCarbs || 0,
    fat: data.recipeFat || 0,
  });
}

const MEAL_TYPE_OPTIONS = [
  { value: 'Breakfast', label: 'Śniadanie' },
  { value: 'Lunch', label: 'Obiad' },
  { value: 'Dinner', label: 'Kolacja' },
  { value: 'Snack', label: 'Przekąska' },
];

const RECIPE_NUMBER_FIELDS = [
  { name: 'recipeCalories', label: 'Kalorie (kcal)', placeholder: 'np. 520' },
  { name: 'recipeProtein', label: 'Białko (g)', placeholder: 'np. 35' },
  { name: 'recipeCarbs', label: 'Węglowodany (g)', placeholder: 'np. 60' },
  { name: 'recipeFat', label: 'Tłuszcz (g)', placeholder: 'np. 14' },
] as const;

const asText = (value: number | undefined) => (value === undefined || value === null ? '' : String(value));

export function ArticleForm({ article, categories, onSubmit, isLoading }: ArticleFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title || '',
      content: article?.content || '',
      category: article?.category || '',
      status: article?.status || 'draft',
      coverImageUrl: article?.coverImageUrl || '',
      imageHint: article?.imageHint || '',
      recipeDishName: article?.recipe?.dishName || '',
      recipeServings: asText(article?.recipe?.servings),
      recipePrepMinutes: asText(article?.recipe?.prepMinutes),
      recipeMealType: article?.recipe?.mealType || '',
      recipeCalories: asText(article?.recipe?.calories),
      recipeProtein: asText(article?.recipe?.protein),
      recipeCarbs: asText(article?.recipe?.carbs),
      recipeFat: asText(article?.recipe?.fat),
    },
  });
  const isRecipe = isRecipeCategory(form.watch('category'));

  const handleSubmit = async (data: ArticleFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: 'Błąd',
        description: 'Wystąpił błąd podczas zapisywania artykułu.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.push('/trainer/knowledge-zone/manage');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/trainer/knowledge-zone/manage">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do listy artykułów
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            {article ? 'Edytuj Artykuł' : 'Napisz Nowy Artykuł'}
          </CardTitle>
          <CardDescription>
            {article
              ? 'Zaktualizuj informacje o swoim artykule.'
              : 'Podziel się swoją wiedzą ze społecznością.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tytuł artykułu</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Wprowadź tytuł artykułu..."
                        className="text-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz kategorię" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status publikacji</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Szkic</SelectItem>
                          <SelectItem value="published">Opublikowany</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Szkice są widoczne tylko dla Ciebie
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {isRecipe && (
                <div className="space-y-4 rounded-xl border border-dashed p-4">
                  <div className="flex items-start gap-3">
                    <ChefHat className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">Dane przepisu</p>
                      <p className="text-sm text-muted-foreground">
                        Wartości na 1 porcję. Z kaloriami podopieczni dodadzą danie do dzienniczka jednym kliknięciem.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="recipeDishName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nazwa dania (opcjonalnie)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Domyślnie tytuł artykułu" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recipeMealType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Najlepiej pasuje na</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Dowolny posiłek" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MEAL_TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recipeServings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Liczba porcji</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={1} max={50} inputMode="numeric" placeholder="1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recipePrepMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Czas przygotowania (min)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={0} inputMode="numeric" placeholder="np. 25" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {RECIPE_NUMBER_FIELDS.map((item) => (
                      <FormField
                        key={item.name}
                        control={form.control}
                        name={item.name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{item.label}</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min={0} step="0.1" inputMode="decimal" placeholder={item.placeholder} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL obrazu okładki (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://example.com/image.jpg"
                        type="url"
                      />
                    </FormControl>
                    <FormDescription>
                      Pozostaw puste, aby wygenerować obraz automatycznie
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Podpowiedź dla obrazu AI (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="np. trening siłowy, odżywianie sportowe..."
                      />
                    </FormControl>
                    <FormDescription>
                      Słowa kluczowe pomagające AI wygenerować odpowiedni obraz
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Treść artykułu</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Zacznij pisać swój artykuł..."
                      />
                    </FormControl>
                    <FormDescription>
                      Możesz użyć edytora wizualnego lub przełączyć się na zakładkę &quot;Kod HTML&quot;, aby bezpośrednio wpisywać znaczniki HTML. Przełącz się na podgląd, aby zobaczyć efekt.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={form.formState.isSubmitting}
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || isLoading}
                >
                  {(form.formState.isSubmitting || isLoading) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {article ? 'Zapisz zmiany' : 'Opublikuj artykuł'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
