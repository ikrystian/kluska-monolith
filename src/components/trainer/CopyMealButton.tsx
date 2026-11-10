'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

/** Copies a public catalogue meal into the trainer's own meals and opens it for editing. */
export default function CopyMealButton({ id, name }: { id: string; name: string }) {
    const router = useRouter();
    const [isCopying, setIsCopying] = useState(false);

    const handleCopy = async () => {
        setIsCopying(true);
        try {
            const res = await fetch(`/api/trainer/meals/${id}/copy`, { method: 'POST' });
            if (!res.ok) throw new Error();
            const data = await res.json();
            toast({ title: 'Skopiowano', description: `„${name}” jest teraz w Twoich posiłkach.` });
            router.push(`/trainer/diet/meals/${data.meal._id}/edit`);
        } catch {
            toast({ title: 'Błąd', description: 'Nie udało się skopiować posiłku', variant: 'destructive' });
            setIsCopying(false);
        }
    };

    return (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy} disabled={isCopying}>
            {isCopying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            Kopiuj do moich
        </Button>
    );
}
