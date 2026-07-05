import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

// Direct model imports to avoid star-export conflicts in src/models/index.ts
import { User } from '../src/models/User';
import { MuscleGroup } from '../src/models/MuscleGroup';
import { Exercise } from '../src/models/Exercise';
import { Gym } from '../src/models/Gym';
import { Habit } from '../src/models/Habit';
import { ArticleCategory } from '../src/models/ArticleCategory';
import { Article } from '../src/models/Article';
import { Challenge } from '../src/models/Challenge';
import { Reward } from '../src/models/Reward';
import { AchievementBadge } from '../src/models/AchievementBadge';
import { GamificationProfile } from '../src/models/GamificationProfile';
import { MuscleGroupName, TrainingLevel } from '../src/models/types/enums';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let MONGO_DB_URI = process.env.MONGO_DB_URI;

if (!MONGO_DB_URI) {
  console.log('⚠️ MONGO_DB_URI nie zostało zdefiniowane w pliku .env.');
  console.log('🔄 Używam domyślnej lokalnej bazy danych: mongodb://localhost:27017/kluska-monolith');
  MONGO_DB_URI = 'mongodb://localhost:27017/kluska-monolith';
} else if (MONGO_DB_URI.includes('<db_password>')) {
  console.log('⚠️ Wykryto domyślny placeholder <db_password> w pliku .env.');
  console.log('🔄 Używam domyślnej lokalnej bazy danych: mongodb://localhost:27017/kluska-monolith');
  console.log('💡 Aby użyć MongoDB Atlas, zastąp <db_password> rzeczywistym hasłem w pliku .env.');
  MONGO_DB_URI = 'mongodb://localhost:27017/kluska-monolith';
}

async function seed() {
  console.log('🔄 Rozpoczynanie procesu seedowania bazy danych...');

  try {
    await mongoose.connect(MONGO_DB_URI!);
    console.log('✅ Połączono z bazą danych MongoDB.');

    // 1. Czyszczenie starych danych
    console.log('🧹 Czyszczenie istniejących danych z kolekcji...');
    await Promise.all([
      User.deleteMany({}),
      MuscleGroup.deleteMany({}),
      Exercise.deleteMany({}),
      Gym.deleteMany({}),
      Habit.deleteMany({}),
      ArticleCategory.deleteMany({}),
      Article.deleteMany({}),
      Challenge.deleteMany({}),
      Reward.deleteMany({}),
      AchievementBadge.deleteMany({}),
      GamificationProfile.deleteMany({}),
    ]);
    console.log('✅ Kolekcje wyczyszczone pomyślnie.');

    // 2. Muscle Groups (Grupy mięśniowe)
    console.log('🌱 Seedowanie grup mięśniowych...');
    const muscleGroupsData = Object.values(MuscleGroupName).map((name) => ({
      name,
      description: `Opis dla grupy mięśniowej: ${name}`,
      imageUrl: `/images/muscles/${name.toLowerCase().replace(/\s+/g, '-')}.png`,
      imageHint: `Pozycja pokazująca ${name}`,
    }));
    const seededMuscleGroups = await MuscleGroup.insertMany(muscleGroupsData);
    console.log(`✅ Dodano ${seededMuscleGroups.length} grup mięśniowych.`);

    // Helper to get muscle group object by name
    const getMg = (name: MuscleGroupName) => {
      const found = seededMuscleGroups.find(mg => mg.name === name);
      return found ? { name: found.name, imageUrl: found.imageUrl } : { name };
    };

    // 3. Exercises (Ćwiczenia)
    console.log('🌱 Seedowanie ćwiczeń...');
    const exercisesData = [
      {
        name: 'Wyciskanie sztangi na ławce poziomej',
        mainMuscleGroups: [getMg(MuscleGroupName.Chest)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Triceps), getMg(MuscleGroupName.Shoulders)],
        setup: [
          { group: 'Ławka', value: 'Ustawienie poziome' },
          { group: 'Gryf', value: 'Chwyt nieco szerszy niż rozstaw barków' }
        ],
        instructions: 'Połóż się na ławce. Zdejmij sztangę ze stojaków. Kontrolowanym ruchem opuść ją do klatki piersiowej, a następnie dynamicznie wyciśnij w górę.',
        type: 'weight' as const,
      },
      {
        name: 'Przysiad ze sztangą na plecach',
        mainMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.LowerBack)],
        setup: [
          { group: 'Stojak', value: 'Sztanga na wysokości obojczyków' },
          { group: 'Stopy', value: 'Rozstaw na szerokość bioder lub barków' }
        ],
        instructions: 'Zdejmij sztangę na mięśnie czworoboczne pleców. Zrób wdech, zepnij brzuch, cofnij biodra i wykonaj przysiad do kąta poniżej 90 stopni, po czym wstań.',
        type: 'weight' as const,
      },
      {
        name: 'Martwy ciąg klasyczny',
        mainMuscleGroups: [getMg(MuscleGroupName.LowerBack), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Back), getMg(MuscleGroupName.Forearms), getMg(MuscleGroupName.Traps)],
        setup: [
          { group: 'Pozycja', value: 'Sztanga nad środkiem stóp' },
          { group: 'Chwyt', value: 'Na szerokość barków' }
        ],
        instructions: 'Zegnij się w biodrach i kolanach, złap sztangę. Wyprostuj plecy, zepnij łopatki. Pociągnij sztangę w górę wzdłuż piszczeli prostując biodra i kolana.',
        type: 'weight' as const,
      },
      {
        name: 'Podciąganie na drążku nachwytem',
        mainMuscleGroups: [getMg(MuscleGroupName.Back)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Biceps), getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Drążek', value: 'Chwyt nachwytem, szeroko' }
        ],
        instructions: 'Zwiśnij na drążku. Zainicjuj ruch ściągnięciem łopatek, a następnie pociągnij ciało w górę, aż broda znajdzie się nad drążkiem. Opuść się powoli.',
        type: 'reps' as const,
      },
      {
        name: 'Wyciskanie żołnierskie (Overhead Press)',
        mainMuscleGroups: [getMg(MuscleGroupName.Shoulders)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Triceps), getMg(MuscleGroupName.Traps), getMg(MuscleGroupName.Core)],
        setup: [
          { group: 'Chwyt', value: 'Na szerokość barków, przedramiona pionowo' }
        ],
        instructions: 'Trzymając sztangę na wysokości obojczyków, napnij brzuch i pośladki, a następnie wyciśnij sztangę pionowo nad głowę.',
        type: 'weight' as const,
      },
      {
        name: 'Plank (Deska)',
        mainMuscleGroups: [getMg(MuscleGroupName.Core)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Shoulders), getMg(MuscleGroupName.Glutes)],
        setup: [
          { group: 'Pozycja', value: 'Podparcie na przedramionach i palcach stóp' }
        ],
        instructions: 'Utrzymuj ciało w jednej linii. Napnij brzuch, pośladki i uda. Nie pozwól biodrom opadać. Oddychaj miarowo.',
        type: 'duration' as const,
      },
      {
        name: 'Uginanie przedramion z hantlami z supinacją',
        mainMuscleGroups: [getMg(MuscleGroupName.Biceps)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Pozycja', value: 'Stojąca, hantle w dłoniach wzdłuż tułowia' }
        ],
        instructions: 'Zegnij ramię w łokciu, w trakcie ruchu rotując dłoń na zewnątrz (supinacja). Powoli opuść hantle.',
        type: 'weight' as const,
      },
      {
        name: 'Bieg ciągły na bieżni',
        mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Quads)],
        setup: [
          { group: 'Bieżnia', value: 'Ustawienie nachylenia na 1%' }
        ],
        instructions: 'Rozpocznij od marszu biegowego jako rozgrzewki, a następnie przejdź do biegu w tempie konwersacyjnym.',
        type: 'duration' as const,
      }
    ];

    const seededExercises = await Exercise.insertMany(exercisesData);
    console.log(`✅ Dodano ${seededExercises.length} ćwiczeń.`);

    // 4. Users (Użytkownicy)
    console.log('🌱 Seedowanie użytkowników...');
    // Seed standard users
    const usersData = [
      {
        name: 'Admin Kluska',
        email: 'admin@kluska.pl',
        password: 'admin123', // Will be hashed by pre-save
        role: 'admin' as const,
        onboardingCompleted: true,
      },
      {
        name: 'Jan Kowalski (Trener)',
        email: 'trener@kluska.pl',
        password: 'trener123',
        role: 'trainer' as const,
        location: 'Warszawa',
        onboardingCompleted: true,
      },
      {
        name: 'Krystian Nowak (Athlete)',
        email: 'athlete@kluska.pl',
        password: 'athlete123',
        role: 'athlete' as const,
        location: 'Kraków',
        onboardingCompleted: true,
        gender: 'male' as const,
        height: 180,
        weight: 78,
        trainingLevel: TrainingLevel.Intermediate,
        dateOfBirth: new Date('1998-05-15'),
      },
      {
        name: 'Michał Zieliński (Athlete 2)',
        email: 'athlete2@kluska.pl',
        password: 'athlete123',
        role: 'athlete' as const,
        location: 'Wrocław',
        onboardingCompleted: true,
        gender: 'male' as const,
        height: 175,
        weight: 85,
        trainingLevel: TrainingLevel.Beginner,
        dateOfBirth: new Date('2000-11-20'),
      }
    ];

    const seededUsers = [];
    for (const u of usersData) {
      const userDoc = new User(u);
      await userDoc.save();
      seededUsers.push(userDoc);
    }
    console.log(`✅ Dodano ${seededUsers.length} użytkowników.`);

    const trainerUser = seededUsers.find(u => u.role === 'trainer')!;
    const athleteUser = seededUsers.find(u => u.email === 'athlete@kluska.pl')!;
    const athlete2User = seededUsers.find(u => u.email === 'athlete2@kluska.pl')!;

    // Link athlete to trainer
    athleteUser.trainerId = trainerUser._id.toString();
    await athleteUser.save();
    athlete2User.trainerId = trainerUser._id.toString();
    await athlete2User.save();

    // 5. Gyms (Siłownie)
    console.log('🌱 Seedowanie siłowni...');
    const gymsData = [
      {
        name: 'CityFit Rondo ONZ',
        address: 'Rondo ONZ 1, 00-124 Warszawa',
        location: { lat: 52.2322, lng: 21.0003 },
        description: 'Nowoczesna siłownia całodobowa w samym centrum Warszawy.',
        amenities: ['24/7', 'Klimatyzacja', 'Strefa Wolnych Ciężarów', 'Sauna'],
        rating: 4.8,
        ratingCount: 1500,
        phoneNumber: '+48 22 123 45 67',
        website: 'https://cityfit.pl/kluby/warszawa-rondo-onz/',
        cid: '1234567890123456789',
      },
      {
        name: 'McFIT Świętokrzyska',
        address: 'ul. Świętokrzyska 3, 00-049 Warszawa',
        location: { lat: 52.2355, lng: 21.0118 },
        description: 'Popularna siłownia z bogatą strefą kardio i zajęciami grupowymi.',
        amenities: ['Klimatyzacja', 'Strefa Cardio', 'Zajęcia Grupowe'],
        rating: 4.3,
        ratingCount: 850,
        phoneNumber: '+48 22 987 65 43',
        website: 'https://www.mcfit.com.pl/pl/studia/warszawa-swietokrzyska.html',
        cid: '9876543210987654321',
      },
      {
        name: 'Zdrofit Ochota - Blue City',
        address: 'Al. Jerozolimskie 179, 02-222 Warszawa',
        location: { lat: 52.2155, lng: 20.9575 },
        description: 'Przestronny klub w centrum handlowym Blue City z basenem i sauną.',
        amenities: ['Basen', 'Sauna', 'Darmowy Parking', 'Klimatyzacja'],
        rating: 4.6,
        ratingCount: 420,
        phoneNumber: '+48 22 444 55 66',
        website: 'https://zdrofit.pl/kluby/zdrofit-ochota-blue-city/',
        cid: '112233445566778899',
      }
    ];

    const seededGyms = await Gym.insertMany(gymsData);
    console.log(`✅ Dodano ${seededGyms.length} siłowni.`);

    // 6. Habits (Nawyki)
    console.log('🌱 Seedowanie nawyków...');
    const habitsData = [
      {
        ownerId: athleteUser._id.toString(),
        name: 'Picie wody',
        description: 'Wypicie minimum 2.5 litra czystej wody dziennie.',
        icon: '💧',
        color: '#3b82f6',
        frequency: { type: 'daily' },
        isActive: true,
      },
      {
        ownerId: athleteUser._id.toString(),
        name: 'Kroki codzienne',
        description: 'Przejście minimum 10 000 kroków każdego dnia.',
        icon: '🚶‍♂️',
        color: '#10b981',
        frequency: { type: 'daily' },
        isActive: true,
      },
      {
        ownerId: athleteUser._id.toString(),
        name: 'Sen regeneracyjny',
        description: 'Minimum 8 godzin nieprzerwanego snu.',
        icon: '😴',
        color: '#8b5cf6',
        frequency: { type: 'daily' },
        isActive: true,
      },
      {
        ownerId: athlete2User._id.toString(),
        name: 'Rozciąganie',
        description: '15 minut rozciągania po każdym treningu.',
        icon: '🧘‍♂️',
        color: '#f59e0b',
        frequency: { type: 'daily' },
        isActive: true,
      }
    ];

    const seededHabits = await Habit.insertMany(habitsData);
    console.log(`✅ Dodano ${seededHabits.length} nawyków.`);

    // 7. Article Categories & Articles (Artykuły)
    console.log('🌱 Seedowanie bazy wiedzy...');
    const categoriesData = [
      { name: 'Trening' },
      { name: 'Dieta i Suplementacja' },
      { name: 'Regeneracja' },
      { name: 'Motywacja' }
    ];

    const seededCategories = await ArticleCategory.insertMany(categoriesData);
    console.log(`✅ Dodano ${seededCategories.length} kategorii artykułów.`);

    const articlesData = [
      {
        title: 'Zasady hipertrofii mięśniowej dla początkujących',
        content: 'Hipertrofia mięśniowa to proces zwiększania masy mięśniowej poprzez odpowiedni trening oporowy. Aby wywołać ten proces, należy skupić się na trzech głównych czynnikach: 1. Napięcie mechaniczne - podnoszenie odpowiednio ciężkich ciężarów. 2. Stres metaboliczny - doprowadzenie do uczucia "pompy mięśniowej". 3. Uszkodzenia mięśni - mikrourazy wywołane obciążeniem. Dla początkujących zaleca się treningi typu FBW (Full Body Workout) 3 razy w tygodniu, opierające się na ćwiczeniach wielostawowych.',
        authorId: trainerUser._id.toString(),
        authorName: trainerUser.name,
        category: 'Trening',
        status: 'published' as const,
        coverImageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd',
      },
      {
        title: 'Rola białka w diecie sportowca',
        content: 'Białko to podstawowy budulec mięśni. Osoby trenujące siłowo powinny dostarczać od 1.6g do 2.2g białka na każdy kilogram masy ciała. Dobrym źródłem białka są piersi z kurczaka, chuda wołowina, ryby, jaja, twaróg oraz odżywki białkowe (WPC/WPI). Pamiętaj o równomiernym rozłożeniu białka w ciągu dnia (np. 30-40g na posiłek), co pozwala na utrzymanie stałej syntezy białek mięśniowych.',
        authorId: trainerUser._id.toString(),
        authorName: trainerUser.name,
        category: 'Dieta i Suplementacja',
        status: 'published' as const,
        coverImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
      },
      {
        title: 'Dlaczego regeneracja jest ważniejsza niż sam trening?',
        content: 'Mięśnie nie rosną podczas treningu – rosną w trakcie odpoczynku. Trening siłowy niszczy włókna mięśniowe, a procesy ich odbudowy zachodzą głównie podczas snu. Brak odpowiedniej regeneracji prowadzi do przetrenowania, spadku siły, a w konsekwencji do kontuzji. Zadbaj o 7-8 godzin snu, odpowiednie nawodnienie i dni wolne od ciężkich ćwiczeń fizycznych.',
        authorId: trainerUser._id.toString(),
        authorName: trainerUser.name,
        category: 'Regeneracja',
        status: 'published' as const,
        coverImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      }
    ];

    const seededArticles = await Article.insertMany(articlesData);
    console.log(`✅ Dodano ${seededArticles.length} artykułów.`);

    // 8. Challenges (Wyzwania biegowe)
    console.log('🌱 Seedowanie wyzwań biegowych...');
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const challengesData = [
      {
        challengerId: athleteUser._id.toString(),
        challengedId: athlete2User._id.toString(),
        challengerName: athleteUser.name,
        challengedName: athlete2User.name,
        targetKm: 15,
        startDate: now,
        endDate: nextWeek,
        status: 'accepted' as const,
        challengerProgress: 8.5,
        challengedProgress: 5.2,
      },
      {
        challengerId: athlete2User._id.toString(),
        challengedId: athleteUser._id.toString(),
        challengerName: athlete2User.name,
        challengedName: athleteUser.name,
        targetKm: 5,
        endDate: nextWeek,
        status: 'pending' as const,
        challengerProgress: 0,
        challengedProgress: 0,
      }
    ];

    const seededChallenges = await Challenge.insertMany(challengesData);
    console.log(`✅ Dodano ${seededChallenges.length} wyzwań.`);

    // 9. Achievement Badges (Odznaki grywalizacji)
    console.log('🌱 Seedowanie odznak grywalizacji...');
    const badgesData = [
      {
        name: 'Pierwszy krok',
        description: 'Zaloguj swój pierwszy trening w systemie.',
        category: 'consistency' as const,
        requirement: { type: 'workout_count', value: 1, comparison: 'gte' },
        pointsReward: 100,
        rarity: 'common' as const,
        isActive: true,
      },
      {
        name: 'Niezłomny Wojownik',
        description: 'Utrzymaj passę treningową (streak) przez 7 dni z rzędu.',
        category: 'consistency' as const,
        requirement: { type: 'streak', value: 7, comparison: 'gte' },
        pointsReward: 250,
        rarity: 'rare' as const,
        isActive: true,
      },
      {
        name: 'Kolekcjoner Celów',
        description: 'Ukończ pomyślnie 5 celów treningowych lub żywieniowych.',
        category: 'milestone' as const,
        requirement: { type: 'goal_count', value: 5, comparison: 'gte' },
        pointsReward: 400,
        rarity: 'epic' as const,
        isActive: true,
      },
      {
        name: 'Dominator Punktowy',
        description: 'Zdobądź łącznie 2000 punktów grywalizacyjnych.',
        category: 'performance' as const,
        requirement: { type: 'points_earned', value: 2000, comparison: 'gte' },
        pointsReward: 1000,
        rarity: 'legendary' as const,
        isActive: true,
      }
    ];

    const seededBadges = await AchievementBadge.insertMany(badgesData);
    console.log(`✅ Dodano ${seededBadges.length} odznak grywalizacji.`);

    // 10. Rewards (Nagrody za punkty)
    console.log('🌱 Seedowanie nagród w sklepie...');
    const rewardsData = [
      {
        title: 'Darmowy Szejk Białkowy',
        description: 'Kod rabatowy na dowolny szejk proteinowy w recepcji partnerskiego klubu.',
        category: 'physical' as const,
        fitCoinCost: 150,
        tier: 'bronze' as const,
        availability: 'always' as const,
        isActive: true,
        createdBy: adminUser()._id.toString(),
      },
      {
        title: '30-minutowa Konsultacja z Trenerem',
        description: 'Indywidualna konsultacja online lub stacjonarna dotycząca techniki ćwiczeń lub diety.',
        category: 'experience' as const,
        fitCoinCost: 500,
        tier: 'silver' as const,
        availability: 'always' as const,
        isActive: true,
        createdBy: adminUser()._id.toString(),
      },
      {
        title: 'Treningowy E-book Premium',
        description: 'Książka PDF z kompleksowymi protokołami zwiększania siły i hipertrofii.',
        category: 'digital' as const,
        fitCoinCost: 800,
        tier: 'gold' as const,
        availability: 'always' as const,
        isActive: true,
        createdBy: adminUser()._id.toString(),
      },
      {
        title: 'Koszulka Techniczna Kluska Team',
        description: 'Wysokiej jakości oddychająca koszulka treningowa z logo Kluska.',
        category: 'physical' as const,
        fitCoinCost: 1500,
        tier: 'platinum' as const,
        availability: 'limited' as const,
        maxRedemptions: 50,
        isActive: true,
        createdBy: adminUser()._id.toString(),
      }
    ];

    // Helper to get admin user
    function adminUser() {
      return seededUsers.find(u => u.role === 'admin')!;
    }

    const seededRewards = await Reward.insertMany(rewardsData);
    console.log(`✅ Dodano ${seededRewards.length} nagród do sklepu.`);

    // 11. Gamification Profiles (Profile grywalizacji użytkowników)
    console.log('🌱 Seedowanie profili grywalizacji...');
    const gamificationProfilesData = [
      {
        userId: athleteUser._id.toString(),
        totalPointsEarned: 850,
        currentFitCoins: 700,
        level: 2,
        experiencePoints: 350,
        streaks: {
          workout: 3,
          goals: 2,
          checkins: 4,
          lastWorkoutDate: now,
          lastGoalDate: now,
          lastCheckinDate: now,
        },
        achievements: [seededBadges[0].name],
        redeemedRewards: [
          {
            rewardId: seededRewards[0]._id.toString(),
            redeemedAt: new Date(now.getTime() - 86400000),
            fitCoinsCost: 150
          }
        ],
        pointTransactions: [
          {
            amount: 100,
            type: 'earned' as const,
            source: 'achievement' as const,
            sourceId: seededBadges[0]._id.toString(),
            description: `Odznaka: ${seededBadges[0].name}`,
            createdAt: new Date(now.getTime() - 86400000 * 2),
          },
          {
            amount: 750,
            type: 'earned' as const,
            source: 'workout_completion' as const,
            description: 'Ukończenie serii treningowych w tym tygodniu',
            createdAt: new Date(now.getTime() - 86400000),
          },
          {
            amount: 150,
            type: 'spent' as const,
            source: 'reward_redemption' as const,
            sourceId: seededRewards[0]._id.toString(),
            description: `Wykupiono nagrodę: ${seededRewards[0].title}`,
            createdAt: new Date(now.getTime() - 86400000),
          }
        ]
      },
      {
        userId: athlete2User._id.toString(),
        totalPointsEarned: 150,
        currentFitCoins: 150,
        level: 1,
        experiencePoints: 150,
        streaks: {
          workout: 1,
          goals: 0,
          checkins: 1,
          lastWorkoutDate: now,
          lastCheckinDate: now,
        },
        achievements: [],
        redeemedRewards: [],
        pointTransactions: [
          {
            amount: 150,
            type: 'earned' as const,
            source: 'workout_completion' as const,
            description: 'Ukończenie pierwszego treningu',
            createdAt: now,
          }
        ]
      }
    ];

    const seededGamificationProfiles = await GamificationProfile.insertMany(gamificationProfilesData);
    console.log(`✅ Dodano ${seededGamificationProfiles.length} profili grywalizacji.`);

    console.log('🎉 Baza danych została pomyślnie zasilona przykładowymi danymi!');
  } catch (error) {
    console.error('❌ Błąd podczas seedowania bazy danych:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych.');
  }
}

seed();
