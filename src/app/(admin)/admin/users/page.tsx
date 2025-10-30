'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useUser, useDoc, useUpdateDoc } from '@/lib/db-hooks';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Edit, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'trainer' | 'admin';
  location?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  trainerId?: string;
  favoriteGymIds?: string[];
}


const editUserSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane.'),
  role: z.enum(['athlete', 'trainer', 'admin'], {
    required_error: 'Rola jest wymagana.',
  }),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

export default function AdminUsersPage() {
  const { user: currentUser, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Fetch current user profile
  const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<UserProfile>(
    'users',
    currentUser?.uid || null
  );

  // Fetch all users if current user is admin
  const { data: users, isLoading: usersLoading, refetch } = useCollection<UserProfile>(
    currentUserProfile?.role === 'admin' ? 'users' : null
  );

  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();

  const avatarImage = placeholderImages.find((img) => img.id === 'avatar-male');

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  const handleEditClick = (user: UserProfile) => {
    setSelectedUser(user);
    form.reset({
      name: user.name,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async (data: EditUserFormValues) => {
    if (!selectedUser) return;

    try {
      await updateDoc('users', selectedUser.id, data);
      toast({
        title: 'Sukces!',
        description: `Dane użytkownika ${data.name} zostały zaktualizowane.`,
      });
      setEditDialogOpen(false);
      setSelectedUser(null);
      refetch(); // Refresh the users list
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować użytkownika.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleVariant = (role: string): 'destructive' | 'secondary' | 'default' => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'trainer':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'trainer':
        return 'Trener';
      case 'athlete':
        return 'Sportowiec';
      default:
        return role;
    }
  };

  const pageIsLoading = isUserLoading || isCurrentUserProfileLoading || (currentUserProfile?.role === 'admin' && usersLoading);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Zarządzanie Użytkownikami</h1>
      <Card>
        <CardHeader>
          <CardTitle>Wszyscy Użytkownicy</CardTitle>
          <CardDescription>
            Lista wszystkich użytkowników zarejestrowanych w systemie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Użytkownik</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageIsLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                    </TableRow>
                 ))
              ) : users && users.length > 0 && currentUserProfile?.role === 'admin' ? (
                users.map((user: UserProfile) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt={user.name} />}
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>
                        <Edit className="mr-2 h-3 w-3" />
                        Edytuj
                      </Button>
                    </TableCell>
                  </TableRow>
              ))) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    {currentUserProfile?.role !== 'admin'
                      ? 'Brak uprawnień do wyświetlania użytkowników.'
                      : 'Brak użytkowników w systemie.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj Użytkownika</DialogTitle>
            <DialogDescription>
              Zaktualizuj dane dla {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię i Nazwisko</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rola</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz rolę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="athlete">Sportowiec</SelectItem>
                        <SelectItem value="trainer">Trener</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isUpdating}>
                    Anuluj
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz Zmiany
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

