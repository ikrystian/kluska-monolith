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
import { Checkbox } from '@/components/ui/checkbox';
import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth, useSession } from '@/lib/next-auth-react';
import { useEffect } from 'react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { data: session, status } = useSession();
    const auth = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            const role = session.user.role;
            if (role === 'admin') navigate('/admin/dashboard');
            else if (role === 'trainer') navigate('/trainer/dashboard');
            else navigate('/athlete/dashboard');
        }
    }, [session, status, navigate]);

    const handleLogin = async () => {
        setIsLoading(true);
        setError('');

        const result = await auth.signIn(email, password);

        if (!result.ok) {
            setError(result.error || 'Nieprawidłowy adres e-mail lub hasło.');
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
                    <CardTitle className="text-2xl font-extrabold">Witaj z powrotem</CardTitle>
                    <CardDescription className="text-base">Zaloguj się do swojego konta GymProgress</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
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
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            className="h-11"
                        />
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
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            className="h-11"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="rememberMe"
                            checked={rememberMe}
                            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                            disabled={isLoading}
                        />
                        <Label htmlFor="rememberMe" className="cursor-pointer font-normal text-sm">
                            Zapamiętaj mnie
                        </Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full h-11 font-bold text-base" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? 'Logowanie...' : 'Zaloguj się'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        Nie masz konta?{' '}
                        <Link to="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                            Zarejestruj się
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
