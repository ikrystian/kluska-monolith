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
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, collection, doc, setDoc } from '@/firebase';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


const editUserSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane.'),
  role: z.enum(['athlete', 'trainer', 'admin'], {
    required_error: 'Rola jest wymagana.',
  }),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

export default function AdminUsersPage() {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentUserProfileRef = useMemoFirebase(
    () => (currentUser ? doc(firestore, 'users', currentUser.uid) : null),
    [currentUser, firestore]
  );
  const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<UserProfile>(currentUserProfileRef);

  const usersCollectionRef = useMemoFirebase(
    () => (firestore && currentUserProfile?.role === 'admin' ? collection(firestore, 'users') : null),
    [firestore, currentUserProfile]
  );
  const { data: users, isLoading: usersLoading } = useCollection(usersCollectionRef);

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
    if (!selectedUser || !firestore) return;
    setIsUpdating(true);

    const userDocRef = doc(firestore, 'users', selectedUser.id);
    const updatedData = {
      ...selectedUser,
      ...data,
    };

    setDoc(userDocRef, updatedData, { merge: true })
      .then(() => {
        toast({
          title: 'Sukces!',
          description: `Dane użytkownika ${data.name} zostały zaktualizowane.`,
        });
        setEditDialogOpen(false);
        setSelectedUser(null);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'trainer':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const pageIsLoading = isCurrentUserProfileLoading || (currentUserProfile?.role === 'admin' && usersLoading);

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
              ) : users && currentUserProfile?.role === 'admin' ? (
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
                      <Badge variant={getRoleVariant(user.role)} className="capitalize">
                        {user.role}
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
                    Brak uprawnień do wyświetlania użytkowników.
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

