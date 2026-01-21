'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth, useSession } from '@/lib/next-auth-react';
import { useEffect } from 'react';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'athlete' | 'trainer'>('athlete');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { data: session, status } = useSession();
    const auth = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            const userRole = session.user.role;
            if (userRole === 'admin') navigate('/admin/dashboard');
            else if (userRole === 'trainer') navigate('/trainer/dashboard');
            else navigate('/athlete/dashboard');
        }
    }, [session, status, navigate]);

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            setError('Hasła nie są identyczne.');
            return;
        }

        if (password.length < 6) {
            setError('Hasło musi mieć co najmniej 6 znaków.');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await auth.register({ name, email, password, role });

        if (!result.ok) {
            setError(result.error || 'Rejestracja nie powiodła się.');
        }
        setIsLoading(false);
    };

    if (status === 'loading' || status === 'authenticated') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Ładowanie...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md border-border/50">
                <CardHeader className="space-y-3 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
                        <Dumbbell className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-extrabold">Utwórz konto</CardTitle>
                    <CardDescription className="text-base">Dołącz do GymProgress i śledź swoje postępy</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="font-semibold">Imię</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="Jan Kowalski"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            className="h-11"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="font-semibold">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="twoj@email.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="h-11"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role" className="font-semibold">Rola</Label>
                        <Select value={role} onValueChange={(v) => setRole(v as 'athlete' | 'trainer')} disabled={isLoading}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Wybierz rolę" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="athlete">Sportowiec</SelectItem>
                                <SelectItem value="trainer">Trener</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password" className="font-semibold">Hasło</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="h-11"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmPassword" className="font-semibold">Potwierdź hasło</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                            className="h-11"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full h-11 font-bold text-base" onClick={handleRegister} disabled={isLoading}>
                        {isLoading ? 'Rejestracja...' : 'Zarejestruj się'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        Masz już konto?{' '}
                        <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                            Zaloguj się
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
