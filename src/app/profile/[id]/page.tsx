'use client';

import { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import { format, differenceInDays, startOfWeek, eachDayOfInterval, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import {
    Instagram,
    Facebook,
    Twitter,
    Dumbbell,
    Weight,
    Calendar,
    Trophy,
    Flame,
    Star,
    MapPin,
    TrendingUp,
    Award,
    Loader2,
    Share2,
    Target,
    Zap,
    Crown,
    Clock,
    Medal,
    Activity,
    Copy,
    Check,
    Heart,
    ImageIcon,
    X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface PublicProfileData {
    user: {
        id: string;
        name: string;
        avatarUrl?: string;
        location?: string;
        bio?: string;
        nickname?: string;
        socialLinks?: {
            instagram?: string;
            facebook?: string;
            twitter?: string;
        };
        trainingLevel?: string;
        memberSince: string;
        daysInApp: number;
    };
    stats: {
        totalWorkouts: number;
        totalTonnage: number;
        currentStreak: number;
        personalRecordsCount: number;
        avgWorkoutsPerWeek: number;
        bestWorkoutTonnage: number;
        longestStreak: number;
    };
    gamification: {
        level: number;
        experiencePoints: number;
        experienceToNextLevel: number;
        achievements: string[];
        totalPointsEarned: number;
        currentFitCoins: number;
    };
    personalRecords: Array<{
        exerciseName: string;
        type: string;
        value: number;
        reps?: number;
        achievedAt: string;
    }>;
    favoriteGyms: Array<{
        id: string;
        name: string;
        address: string;
        rating?: number;
        photoUrl?: string;
    }>;
    volumeTrends: Array<{
        date: string;
        volume: number;
    }>;
    topExercises: Array<{
        name: string;
        volume: number;
    }>;
    activityCalendar: string[];
    recentWorkouts: Array<{
        name: string;
        date: string;
        duration?: number;
        exerciseCount: number;
    }>;
    socialPhotos: Array<{
        id: string;
        imageUrl: string;
        description: string;
        likesCount: number;
        createdAt: string;
    }>;
}

// Animated counter component
function AnimatedCounter({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const duration = 2000;
        const steps = 60;
        const increment = value / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(current);
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value]);

    return (
        <span>
            {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
            {suffix}
        </span>
    );
}

// Stat card component
function StatCard({
    icon: Icon,
    label,
    value,
    suffix = '',
    decimals = 0,
    delay = 0,
    gradient,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    suffix?: string;
    decimals?: number;
    delay?: number;
    gradient: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl">
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${gradient}`} />
                <CardContent className="p-4 sm:p-6 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{label}</p>
                            <p className="text-xl sm:text-3xl font-bold tracking-tight">
                                <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Social link button
function SocialLink({ url, icon: Icon, label, color }: { url: string; icon: React.ElementType; label: string; color: string }) {
    return (
        <motion.a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg transition-shadow hover:shadow-xl`}
        >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
        </motion.a>
    );
}

// Training level badge
function LevelBadge({ level }: { level: string | undefined }) {
    const levelConfig: Record<string, { label: string; color: string }> = {
        beginner: { label: 'Początkujący', color: 'from-green-500 to-emerald-600' },
        intermediate: { label: 'Średniozaawansowany', color: 'from-blue-500 to-indigo-600' },
        advanced: { label: 'Zaawansowany', color: 'from-purple-500 to-pink-600' },
    };

    const config = level ? levelConfig[level] : null;
    if (!config) return null;

    return (
        <Badge className={`bg-gradient-to-r ${config.color} border-0 text-white px-3 py-1`}>
            {config.label}
        </Badge>
    );
}

// Activity Heatmap component
function ActivityHeatmap({ dates }: { dates: string[] }) {
    const today = new Date();
    const startDate = subMonths(today, 6);
    const dateSet = new Set(dates);

    // Create weeks for the last 6 months
    const weeks: Date[][] = [];
    let currentDate = startOfWeek(startDate, { weekStartsOn: 1 });

    while (currentDate <= today) {
        const week: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + i);
            if (d <= today) {
                week.push(d);
            }
        }
        if (week.length > 0) {
            weeks.push(week);
        }
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return (
        <TooltipProvider>
            <div className="overflow-x-auto pb-2">
                <div className="flex gap-1 min-w-max">
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                            {week.map((day, dayIndex) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const hasWorkout = dateSet.has(dateStr);
                                return (
                                    <UITooltip key={dayIndex}>
                                        <TooltipTrigger>
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: weekIndex * 0.01 }}
                                                className={`w-3 h-3 rounded-sm ${hasWorkout
                                                    ? 'bg-primary shadow-sm shadow-primary/50'
                                                    : 'bg-muted/50'
                                                    }`}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{format(day, 'd MMMM yyyy', { locale: pl })}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {hasWorkout ? '✅ Trening' : 'Brak treningu'}
                                            </p>
                                        </TooltipContent>
                                    </UITooltip>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span>Dni bez treningu</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-muted/30" />
                        <div className="w-3 h-3 rounded-sm bg-primary" />
                    </div>
                    <span>Dni treningowe</span>
                </div>
            </div>
        </TooltipProvider>
    );
}

// XP Progress component
function XPProgress({
    level,
    currentXP,
    xpToNextLevel
}: {
    level: number;
    currentXP: number;
    xpToNextLevel: number;
}) {
    const progress = Math.min((currentXP / xpToNextLevel) * 100, 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500">
                        <Crown className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="font-bold">Poziom {level}</p>
                        <p className="text-xs text-muted-foreground">{currentXP} / {xpToNextLevel} XP</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30">
                    {Math.round(progress)}%
                </Badge>
            </div>
            <div className="relative">
                <Progress value={progress} className="h-3" />
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '50%' }}
                />
            </div>
        </motion.div>
    );
}

// Personal Record Card
function PersonalRecordCard({
    record,
    index
}: {
    record: PublicProfileData['personalRecords'][0];
    index: number;
}) {
    const typeLabels: Record<string, string> = {
        max_weight: 'Maks. ciężar',
        max_reps: 'Maks. powtórzeń',
        max_duration: 'Maks. czas',
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ y: -4 }}
        >
            <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden h-full">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <Medal className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                            {typeLabels[record.type] || record.type}
                        </Badge>
                    </div>
                    <h4 className="font-bold text-sm truncate mb-1">{record.exerciseName}</h4>
                    <p className="text-2xl font-bold text-primary">
                        {record.value}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                            {record.type === 'max_weight' ? 'kg' : record.type === 'max_reps' ? 'reps' : 'sek'}
                        </span>
                    </p>
                    {record.reps && record.type === 'max_weight' && (
                        <p className="text-xs text-muted-foreground">przy {record.reps} powtórzeniach</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(record.achievedAt), 'd MMM yyyy', { locale: pl })}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [data, setData] = useState<PublicProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<PublicProfileData['socialPhotos'][0] | null>(null);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const response = await fetch(`/api/public/profile/${id}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Profil nie został znaleziony');
                    } else {
                        setError('Błąd podczas ładowania profilu');
                    }
                    return;
                }
                const profileData = await response.json();
                setData(profileData);
            } catch (err) {
                setError('Błąd podczas ładowania profilu');
            } finally {
                setIsLoading(false);
            }
        }

        fetchProfile();
    }, [id]);

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Profil ${data?.user.name} - GymProgress`,
                    url,
                });
            } catch (err) {
                // User cancelled
            }
        } else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
                <Card className="p-8 text-center">
                    <h1 className="text-2xl font-bold mb-2">😔 {error || 'Profil nie został znaleziony'}</h1>
                    <p className="text-muted-foreground">Sprawdź czy link jest poprawny</p>
                </Card>
            </div>
        );
    }

    const { user, stats, gamification, favoriteGyms, volumeTrends, topExercises, personalRecords, activityCalendar, recentWorkouts, socialPhotos } = data;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const formattedVolumeTrends = volumeTrends.map((v) => ({
        ...v,
        formattedDate: format(new Date(v.date), 'd MMM', { locale: pl }),
    }));

    // Helper to construct proper image URL from UploadThing file ID
    const getImageUrl = (imageUrl: string) => {
        if (imageUrl.startsWith('http')) return imageUrl;
        return `https://utfs.io/f/${imageUrl}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-x-hidden">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute top-1/2 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute -bottom-20 right-1/3 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.3, 0.2],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </div>

            {/* Hero Section */}
            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="relative pt-8 sm:pt-12 pb-8 px-4"
            >
                <div className="max-w-5xl mx-auto">
                    {/* Share button */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end mb-4"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShare}
                            className="bg-card/50 backdrop-blur-sm"
                        >
                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                            {copied ? 'Skopiowano!' : 'Udostępnij'}
                        </Button>
                    </motion.div>

                    {/* Profile Card */}
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <Card className="border-0 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-2xl shadow-2xl overflow-hidden">
                            {/* Decorative gradient header */}
                            <div className="h-32 sm:h-40 bg-gradient-to-r from-primary via-accent to-purple-600 relative overflow-hidden">
                                <motion.div
                                    className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"
                                    animate={{ backgroundPosition: ['0px 0px', '60px 60px'] }}
                                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                />
                            </div>

                            <CardContent className="relative px-4 sm:px-8 pb-8">
                                {/* Avatar and info */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-14">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                                    >
                                        <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                                            <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-primary to-accent text-white">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </motion.div>

                                    <div className="flex-1 text-center sm:text-left pb-2">
                                        <motion.h1
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.5, delay: 0.4 }}
                                            className="text-2xl sm:text-4xl font-bold tracking-tight"
                                        >
                                            {user.name}
                                        </motion.h1>
                                        {user.nickname && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.45 }}
                                                className="text-muted-foreground"
                                            >
                                                @{user.nickname}
                                            </motion.p>
                                        )}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3"
                                        >
                                            <Badge variant="outline" className="bg-primary/10 border-primary/30">
                                                <Star className="h-3 w-3 mr-1" />
                                                Poziom {gamification.level}
                                            </Badge>
                                            <LevelBadge level={user.trainingLevel} />
                                            {user.location && (
                                                <Badge variant="outline" className="bg-muted/50">
                                                    <MapPin className="h-3 w-3 mr-1" />
                                                    {user.location}
                                                </Badge>
                                            )}
                                        </motion.div>
                                    </div>

                                    {/* Social links */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                        className="flex gap-3"
                                    >
                                        {user.socialLinks?.instagram && (
                                            <SocialLink
                                                url={user.socialLinks.instagram}
                                                icon={Instagram}
                                                label="Instagram"
                                                color="from-pink-500 to-purple-600"
                                            />
                                        )}
                                        {user.socialLinks?.facebook && (
                                            <SocialLink
                                                url={user.socialLinks.facebook}
                                                icon={Facebook}
                                                label="Facebook"
                                                color="from-blue-500 to-blue-700"
                                            />
                                        )}
                                        {user.socialLinks?.twitter && (
                                            <SocialLink
                                                url={user.socialLinks.twitter}
                                                icon={Twitter}
                                                label="Twitter"
                                                color="from-sky-400 to-blue-500"
                                            />
                                        )}
                                    </motion.div>
                                </div>

                                {/* Bio */}
                                {user.bio && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.65 }}
                                        className="text-center sm:text-left mt-4 text-muted-foreground max-w-2xl"
                                    >
                                        {user.bio}
                                    </motion.p>
                                )}

                                {/* Member since + XP Progress */}
                                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.7 }}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                                    >
                                        <Calendar className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Członek od</p>
                                            <p className="font-medium">{format(new Date(user.memberSince), 'd MMMM yyyy', { locale: pl })}</p>
                                        </div>
                                    </motion.div>
                                    <XPProgress
                                        level={gamification.level}
                                        currentXP={gamification.experiencePoints}
                                        xpToNextLevel={gamification.experienceToNextLevel}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </motion.section>

            {/* Stats Section */}
            <section className="px-4 pb-8 relative z-10">
                <div className="max-w-5xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-xl sm:text-2xl font-bold mb-6 text-center"
                    >
                        📊 Statystyki
                    </motion.h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard
                            icon={Dumbbell}
                            label="Treningów"
                            value={stats.totalWorkouts}
                            delay={0.6}
                            gradient="from-blue-500 to-indigo-600"
                        />
                        <StatCard
                            icon={Weight}
                            label="Podniesionych ton"
                            value={stats.totalTonnage / 1000}
                            suffix=" t"
                            decimals={1}
                            delay={0.7}
                            gradient="from-orange-500 to-red-600"
                        />
                        <StatCard
                            icon={Calendar}
                            label="Dni w aplikacji"
                            value={user.daysInApp}
                            delay={0.8}
                            gradient="from-green-500 to-emerald-600"
                        />
                        <StatCard
                            icon={Flame}
                            label="Aktualna seria"
                            value={stats.currentStreak}
                            suffix=" dni"
                            delay={0.9}
                            gradient="from-purple-500 to-pink-600"
                        />
                        <StatCard
                            icon={Target}
                            label="Treningów/tydzień"
                            value={stats.avgWorkoutsPerWeek}
                            decimals={1}
                            delay={1.0}
                            gradient="from-cyan-500 to-blue-600"
                        />
                        <StatCard
                            icon={Zap}
                            label="Najlepszy trening"
                            value={stats.bestWorkoutTonnage / 1000}
                            suffix=" t"
                            decimals={2}
                            delay={1.1}
                            gradient="from-yellow-500 to-orange-600"
                        />
                        <StatCard
                            icon={Trophy}
                            label="Najdłuższa seria"
                            value={stats.longestStreak}
                            suffix=" dni"
                            delay={1.2}
                            gradient="from-rose-500 to-pink-600"
                        />
                        <StatCard
                            icon={Medal}
                            label="Rekordy życiowe"
                            value={stats.personalRecordsCount}
                            delay={1.3}
                            gradient="from-amber-500 to-yellow-600"
                        />
                    </div>
                </div>
            </section>

            {/* Activity Heatmap */}
            {activityCalendar.length > 0 && (
                <section className="px-4 pb-8 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.4 }}
                        >
                            <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                                            <Activity className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">Aktywność treningowa</h3>
                                            <p className="text-sm text-muted-foreground">Ostatnie 6 miesięcy</p>
                                        </div>
                                    </div>
                                    <ActivityHeatmap dates={activityCalendar} />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Personal Records */}
            {personalRecords.length > 0 && (
                <section className="px-4 pb-8 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.5 }}
                        >
                            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">🏆 Rekordy Życiowe</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                {personalRecords.map((record, index) => (
                                    <PersonalRecordCard key={index} record={record} index={index} />
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Volume Chart Section */}
            {formattedVolumeTrends.length > 1 && (
                <section className="px-4 pb-8 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.6 }}
                        >
                            <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                                            <TrendingUp className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold">Objętość treningowa</h3>
                                            <p className="text-sm text-muted-foreground">Ostatnie 90 dni</p>
                                        </div>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={formattedVolumeTrends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                                                <XAxis
                                                    dataKey="formattedDate"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                                />
                                                <YAxis
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'hsl(var(--card))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: '12px',
                                                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                                                    }}
                                                    formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Objętość']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="volume"
                                                    stroke="hsl(var(--primary))"
                                                    strokeWidth={3}
                                                    fill="url(#volumeGradient)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Recent Workouts */}
            {recentWorkouts.length > 0 && (
                <section className="px-4 pb-8 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.7 }}
                        >
                            <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                                            <Clock className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold">Ostatnie treningi</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {recentWorkouts.map((workout, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 1.8 + index * 0.1 }}
                                                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 rounded-lg bg-primary/10">
                                                        <Dumbbell className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{workout.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {workout.exerciseCount} ćwiczeń
                                                            {workout.duration && ` • ${workout.duration} min`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="flex-shrink-0">
                                                    {format(new Date(workout.date), 'd MMM', { locale: pl })}
                                                </Badge>
                                            </motion.div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Top Exercises */}
            {topExercises.length > 0 && (
                <section className="px-4 pb-8 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.9 }}
                        >
                            <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
                                            <Trophy className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold">Top {topExercises.length} Ćwiczeń</h3>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {topExercises.map((exercise, index) => (
                                            <motion.div
                                                key={exercise.name}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 2.0 + index * 0.05 }}
                                                className="flex items-center gap-3"
                                            >
                                                <div
                                                    className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white text-sm
                                                    ${index === 0
                                                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                                                            : index === 1
                                                                ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                                                                : index === 2
                                                                    ? 'bg-gradient-to-br from-amber-600 to-amber-700'
                                                                    : 'bg-gradient-to-br from-muted to-muted/80 text-muted-foreground'
                                                        }`}
                                                >
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{exercise.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(exercise.volume / 1000).toFixed(1)} ton
                                                    </p>
                                                </div>
                                                <div className="w-16 h-2 bg-muted/50 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{
                                                            width: `${(exercise.volume / topExercises[0].volume) * 100}%`,
                                                        }}
                                                        transition={{ duration: 0.8, delay: 2.1 + index * 0.05 }}
                                                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                                    />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Achievements */}
            {gamification.achievements.length > 0 && (
                <section className="px-4 pb-8 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 2.1 }}
                        >
                            <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500">
                                            <Award className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold">Osiągnięcia ({gamification.achievements.length})</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {gamification.achievements.map((achievement, index) => (
                                            <motion.div
                                                key={achievement}
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 200,
                                                    delay: 2.2 + index * 0.03,
                                                }}
                                            >
                                                <Badge
                                                    variant="outline"
                                                    className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 text-foreground px-3 py-1"
                                                >
                                                    🏆 {achievement}
                                                </Badge>
                                            </motion.div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Social Photos Gallery */}
            {socialPhotos && socialPhotos.length > 0 && (
                <section className="px-4 pb-8 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 2.15 }}
                        >
                            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">📸 Galeria zdjęć</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {socialPhotos.map((photo, index) => (
                                    <motion.div
                                        key={photo.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 2.2 + index * 0.05 }}
                                        whileHover={{ scale: 1.03 }}
                                        className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                                        onClick={() => setSelectedPhoto(photo)}
                                    >
                                        <img
                                            src={getImageUrl(photo.imageUrl)}
                                            alt={photo.description || 'Zdjęcie'}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="absolute bottom-2 left-2 right-2">
                                                <div className="flex items-center gap-2 text-white text-sm">
                                                    <Heart className="h-4 w-4 fill-current" />
                                                    <span>{photo.likesCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Photo Lightbox */}
            {selectedPhoto && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="relative max-w-4xl max-h-[90vh] w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <img
                            src={getImageUrl(selectedPhoto.imageUrl)}
                            alt={selectedPhoto.description || 'Zdjęcie'}
                            className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
                        />
                        <div className="mt-4 text-white">
                            {selectedPhoto.description && (
                                <p className="text-lg mb-2">{selectedPhoto.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-white/70">
                                <span className="flex items-center gap-1">
                                    <Heart className="h-4 w-4" />
                                    {selectedPhoto.likesCount} polubień
                                </span>
                                <span>
                                    {format(new Date(selectedPhoto.createdAt), 'd MMMM yyyy', { locale: pl })}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Favorite Gyms */}
            {favoriteGyms.length > 0 && (
                <section className="px-4 pb-8 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 2.3 }}
                        >
                            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">🏋️ Ulubione Siłownie</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {favoriteGyms.map((gym, index) => (
                                    <motion.div
                                        key={gym.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 2.4 + index * 0.1 }}
                                        whileHover={{ y: -4 }}
                                    >
                                        <Card className="border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl overflow-hidden group cursor-pointer h-full">
                                            {gym.photoUrl && (
                                                <div className="h-32 overflow-hidden">
                                                    <img
                                                        src={gym.photoUrl}
                                                        alt={gym.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                </div>
                                            )}
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold truncate">{gym.name}</h4>
                                                        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                                            {gym.address}
                                                        </p>
                                                    </div>
                                                    {gym.rating && (
                                                        <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30 flex-shrink-0">
                                                            ⭐ {gym.rating.toFixed(1)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/50">
                <div className="flex items-center justify-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    <p>Profil utworzony przy użyciu GymProgress</p>
                </div>
                {gamification.currentFitCoins > 0 && (
                    <p className="mt-2">
                        💰 {gamification.currentFitCoins} FitCoins • {gamification.totalPointsEarned} punktów zdobytych
                    </p>
                )}
            </footer>
        </div>
    );
}
