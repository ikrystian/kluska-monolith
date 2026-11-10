import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { Workout } from '../src/models/Workout';
import { Exercise } from '../src/models/Exercise';
import { TrainingLevel, SetType } from '../src/models/types/enums';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_DB_URI = process.env.MONGO_DB_URI;

if (!MONGO_DB_URI) {
  console.error('Brak MONGO_DB_URI w pliku .env');
  process.exit(1);
}

interface SetDef {
  number: number;
  type: string;
  reps: number;
  weight: number;
  restTimeSeconds: number;
  duration?: number;
}

interface ExerciseInSeriesDef {
  originalName: string;
  fallbackName?: string;
  tempo: string;
  tip: string;
  sets: SetDef[];
}

interface WorkoutDef {
  name: string;
  level: TrainingLevel;
  durationMinutes: number;
  imageUrl: string;
  description: string;
  exercises: ExerciseInSeriesDef[];
}

const makeSets = (count: number, reps: number, weight: number, restTimeSeconds: number, duration?: number): SetDef[] => {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    type: SetType.WorkingSet,
    reps,
    weight,
    restTimeSeconds,
    ...(duration !== undefined ? { duration } : {})
  }));
};

const WORKOUT_DEFINITIONS: WorkoutDef[] = [
  // 1. FBW - Dzień A
  {
    name: 'Full Body Workout (FBW) - Dzień A',
    level: TrainingLevel.Beginner,
    durationMinutes: 60,
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop',
    description: 'Klasyczny trening ogólnorozwojowy dla każdego stopnia zaawansowania. Bazuje na przysiadzie ze sztangą, wyciskaniu leżąc oraz wiosłowaniu.',
    exercises: [
      {
        originalName: 'barbell full squat',
        tempo: '3-0-1-0',
        tip: 'Prowadź kolana stabilnie na zewnątrz w linii stóp i trzymaj napięty brzuch.',
        sets: makeSets(4, 8, 60, 120)
      },
      {
        originalName: 'barbell bench press',
        tempo: '2-0-1-0',
        tip: 'Ściągnij i opuść łopatki, utwórz lekki mostek i kontroluj opuszczanie sztangi.',
        sets: makeSets(4, 8, 50, 120)
      },
      {
        originalName: 'barbell bent over row',
        tempo: '2-0-1-1',
        tip: 'Prowadź sztangę w stronę bioder, mocno napinając mięśnie najszersze grzbietu.',
        sets: makeSets(3, 8, 45, 90)
      },
      {
        originalName: 'dumbbell lateral raise',
        tempo: '2-0-1-1',
        tip: 'Ruch inicjuj łokciami, nie unoś barków do uszu.',
        sets: makeSets(3, 12, 8, 60)
      },
      {
        originalName: 'barbell curl',
        tempo: '3-0-1-0',
        tip: 'Trzymaj łokcie nieruchomo przy tułowiu, unikaj kołysania ciałem.',
        sets: makeSets(3, 10, 25, 60)
      },
      {
        originalName: 'cable pushdown (with rope attachment)',
        tempo: '2-0-1-1',
        tip: 'Rozchylaj sznur na dole ruchu, mocno dopinając triceps.',
        sets: makeSets(3, 12, 20, 60)
      },
      {
        originalName: 'front plank',
        tempo: 'izometria',
        tip: 'Utrzymuj ciało w jednej prostej linii, mocno napnij brzuch i pośladki.',
        sets: makeSets(3, 1, 0, 60, 45)
      }
    ]
  },

  // 2. FBW - Dzień B
  {
    name: 'Full Body Workout (FBW) - Dzień B',
    level: TrainingLevel.Beginner,
    durationMinutes: 60,
    imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format&fit=crop',
    description: 'Drugi wariant treningu FBW stanowiący uzupełnienie wariantu A. Skupia się na martwym ciągu, wyciskaniu żołnierskim i podciąganiu.',
    exercises: [
      {
        originalName: 'barbell deadlift',
        tempo: '2-1-1-0',
        tip: 'Trzymaj sztangę blisko nóg, plecy proste, napnij najszersze przed oderwaniem ciężaru.',
        sets: makeSets(4, 5, 80, 150)
      },
      {
        originalName: 'barbell standing military press',
        tempo: '2-0-1-0',
        tip: 'Zepnij pośladki i brzuch, głowa cofa się lekko podczas ruchu sztangi w górę.',
        sets: makeSets(4, 8, 35, 120)
      },
      {
        originalName: 'cable wide grip lat pulldown',
        tempo: '3-0-1-1',
        tip: 'Ściągaj drążek do mostka ruchem łokci w dół, nie odchylaj się nadmiernie.',
        sets: makeSets(4, 10, 45, 90)
      },
      {
        originalName: 'sled 45° leg press',
        tempo: '3-0-1-0',
        tip: 'Nie blokuj kolan w górnej fazie ruchu, kontroluj głębokie opuszczanie wózka.',
        sets: makeSets(3, 10, 120, 90)
      },
      {
        originalName: 'dumbbell incline bench press',
        tempo: '2-0-1-0',
        tip: 'Kąt ławki około 30 stopni. Kontroluj hantle i poczuj rozciągnięcie klatki.',
        sets: makeSets(3, 10, 20, 90)
      },
      {
        originalName: 'lever lying leg curl',
        tempo: '3-0-1-1',
        tip: 'Mocne spięcie z tyłu ud z sekundową pauzą w szczytowym momencie.',
        sets: makeSets(3, 12, 35, 60)
      },
      {
        originalName: 'hanging leg raise',
        tempo: '2-0-1-1',
        tip: 'Unoś kolana lub nogi podwijając miednicę, unikaj bujania tułowia.',
        sets: makeSets(3, 12, 0, 60)
      }
    ]
  },

  // 3. Push - Klatka, Barki, Triceps
  {
    name: 'Push - Klatka, Barki, Triceps',
    level: TrainingLevel.Intermediate,
    durationMinutes: 70,
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop',
    description: 'Trening ruchów pchających w podziale Push/Pull/Legs. Kompleksowy rozwój klatki piersiowej, przednich i bocznych aktonów barku oraz tricepsów.',
    exercises: [
      {
        originalName: 'barbell bench press',
        tempo: '3-0-1-0',
        tip: 'Solidne ustawienie stóp i łopatek, dynamiczny wycisk z klatki piersiowej.',
        sets: makeSets(4, 8, 65, 120)
      },
      {
        originalName: 'dumbbell incline bench press',
        tempo: '2-1-1-0',
        tip: 'Zapewnij pełny zakres ruchu z lekką pauzą na dole.',
        sets: makeSets(3, 10, 24, 90)
      },
      {
        originalName: 'chest dip',
        tempo: '2-0-1-0',
        tip: 'Lekkie pochylenie tułowia do przodu przenosi akcent na dolne partie klatki.',
        sets: makeSets(3, 8, 0, 90)
      },
      {
        originalName: 'dumbbell seated shoulder press',
        tempo: '2-0-1-0',
        tip: 'Opuszczaj hantle do linii uszu, wyciskaj w stabilnym łuku bez zderzania hantli.',
        sets: makeSets(3, 10, 18, 90)
      },
      {
        originalName: 'dumbbell lateral raise',
        tempo: '2-0-1-1',
        tip: 'Prowadź łokcie nieco przed linią tułowia dla optymalnej pracy bocznego aktonu.',
        sets: makeSets(4, 12, 10, 60)
      },
      {
        originalName: 'cable triceps pushdown (v-bar)',
        tempo: '2-0-1-1',
        tip: 'Łokcie zablokowane przy żebrach, pełne prostowanie przedramion.',
        sets: makeSets(3, 12, 25, 60)
      }
    ]
  },

  // 4. Pull - Plecy, Tył barku, Biceps
  {
    name: 'Pull - Plecy, Tył barku, Biceps',
    level: TrainingLevel.Intermediate,
    durationMinutes: 70,
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop',
    description: 'Trening ruchów ciągnących z podziału Push/Pull/Legs. Buduje szerokość i grubość pleców, tył barku oraz mięśnie dwugłowe ramienia.',
    exercises: [
      {
        originalName: 'pull-up',
        tempo: '3-0-1-0',
        tip: 'Zainicjuj ruch od ściągnięcia łopatek w dół, broda ponad drążek.',
        sets: makeSets(4, 6, 0, 120)
      },
      {
        originalName: 'barbell bent over row',
        tempo: '2-0-1-1',
        tip: 'Przyciągaj sztangę do dolnej części brzucha, nie prostuj tułowia z ciężarem.',
        sets: makeSets(4, 8, 60, 90)
      },
      {
        originalName: 'cable seated row',
        tempo: '2-0-1-1',
        tip: 'Mocne dopięcie łopatek na sekundę w końcowej fazie przyciągania.',
        sets: makeSets(3, 10, 50, 75)
      },
      {
        originalName: 'cable standing face pull (with rope)',
        tempo: '2-0-1-2',
        tip: 'Przyciągaj sznur do linii oczu, rozchylając dłonie i rotując barki na zewnątrz.',
        sets: makeSets(4, 15, 20, 60)
      },
      {
        originalName: 'ez barbell curl',
        tempo: '2-0-1-1',
        tip: 'Gryf łamany odciąża nadgarstki, skup się na mocnym skurczu bicepsów.',
        sets: makeSets(3, 10, 27.5, 60)
      },
      {
        originalName: 'dumbbell hammer curl',
        tempo: '2-0-1-0',
        tip: 'Chwyt młotkowy angażuje mięsień ramienny i ramienno-promieniowy.',
        sets: makeSets(3, 12, 12, 60)
      }
    ]
  },

  // 5. Legs - Nogi, Pośladki i Łydki
  {
    name: 'Legs - Nogi, Pośladki i Łydki',
    level: TrainingLevel.Intermediate,
    durationMinutes: 75,
    imageUrl: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=800&auto=format&fit=crop',
    description: 'Intensywny dzień nóg w podziale PPL. Obejmuje ćwiczenia wielostawowe i izolacje na czworogłowe, dwugłowe, pośladki oraz łydki.',
    exercises: [
      {
        originalName: 'barbell full squat',
        tempo: '3-1-1-0',
        tip: 'Głęboki przysiad z pełną kontrolą toru ruchu i równym naciskiem na całą stopę.',
        sets: makeSets(4, 8, 80, 150)
      },
      {
        originalName: 'barbell romanian deadlift',
        tempo: '3-0-1-0',
        tip: 'Cofaj biodra w tył, utrzymując lekko ugięte kolana i proste plecy.',
        sets: makeSets(4, 8, 70, 120)
      },
      {
        originalName: 'sled 45° leg press',
        tempo: '2-0-1-0',
        tip: 'Płynne wyciskanie wózka, skup się na pracy ud i pośladków.',
        sets: makeSets(3, 10, 140, 90)
      },
      {
        originalName: 'lever leg extension',
        tempo: '2-0-1-1',
        tip: 'Izolacja mięśni czworogłowych z sekundowym spięciem na szczycie.',
        sets: makeSets(3, 12, 45, 60)
      },
      {
        originalName: 'lever lying leg curl',
        tempo: '2-0-1-1',
        tip: 'Nie unoś miednicy z ławki podczas uginania nóg.',
        sets: makeSets(3, 12, 40, 60)
      },
      {
        originalName: 'standing calf raise',
        tempo: '2-1-1-2',
        tip: 'Wykonuj pełny zakres: głębokie rozciągnięcie na dole i wysokie spięcie na palcach.',
        sets: makeSets(4, 15, 50, 60)
      }
    ]
  },

  // 6. Upper Body - Góra Ciała
  {
    name: 'Upper Body - Góra Ciała',
    level: TrainingLevel.Intermediate,
    durationMinutes: 65,
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop',
    description: 'Zrównoważony trening górnej połowy ciała w systemie Góra / Dół (Upper/Lower). Łączy ruchy klatki, grzbietu, barków i ramion.',
    exercises: [
      {
        originalName: 'barbell bench press',
        tempo: '2-0-1-0',
        tip: 'Równe tempo wyciskania, sztanga prowadzona na linię dolnej części mostka.',
        sets: makeSets(4, 8, 60, 120)
      },
      {
        originalName: 'cable wide grip lat pulldown',
        tempo: '2-0-1-1',
        tip: 'Prowadź łokcie prostopadle w dół, skupiając się na mięśniu najszerszym grzbietu.',
        sets: makeSets(4, 10, 50, 90)
      },
      {
        originalName: 'dumbbell seated shoulder press',
        tempo: '2-0-1-0',
        tip: 'Stabilna pozycja siedząca, ramiona pracują w płaszczyźnie łopatki.',
        sets: makeSets(3, 10, 18, 90)
      },
      {
        originalName: 'cable seated row',
        tempo: '2-0-1-1',
        tip: 'Ściągaj łopatki bez zbędnego bujania tułowiem.',
        sets: makeSets(3, 10, 50, 75)
      },
      {
        originalName: 'dumbbell lateral raise',
        tempo: '2-0-1-1',
        tip: 'Izolowana praca bocznego aktonu barków.',
        sets: makeSets(3, 12, 9, 60)
      },
      {
        originalName: 'barbell lying triceps extension skull crusher',
        tempo: '3-0-1-0',
        tip: 'Opuszczaj sztangę za głowę dla mocniejszego rozciągnięcia długiej głowy tricepsa.',
        sets: makeSets(3, 10, 25, 60)
      },
      {
        originalName: 'dumbbell biceps curl',
        tempo: '2-0-1-1',
        tip: 'Supinuj przedramię w trakcie unoszenia hantla.',
        sets: makeSets(3, 10, 12, 60)
      }
    ]
  },

  // 7. Lower Body - Dół Ciała
  {
    name: 'Lower Body - Dół Ciała',
    level: TrainingLevel.Intermediate,
    durationMinutes: 65,
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop',
    description: 'Dzień dolnych partii ciała w systemie Góra / Dół (Upper/Lower). Nacisk na siłę nóg, pośladków i stabilność mięśni brzucha.',
    exercises: [
      {
        originalName: 'barbell full squat',
        tempo: '3-1-1-0',
        tip: 'Trzymaj klatkę uniesioną, kolana stabilne, płynny ruch z dołu do góry.',
        sets: makeSets(4, 8, 85, 150)
      },
      {
        originalName: 'barbell romanian deadlift',
        tempo: '3-0-1-0',
        tip: 'Ruch inicjuj cofnięciem bioder przy prostych plecach.',
        sets: makeSets(4, 8, 75, 120)
      },
      {
        originalName: 'dumbbell bulgarian split squat',
        tempo: '2-0-1-0',
        tip: 'Kolano nogi zakrocznej schodzi nisko w kierunku podłogi.',
        sets: makeSets(3, 10, 14, 90)
      },
      {
        originalName: 'lever seated leg curl',
        tempo: '2-0-1-1',
        tip: 'Izolacja mięśni dwugłowych uda z pauzą na dole.',
        sets: makeSets(3, 12, 40, 60)
      },
      {
        originalName: 'standing calf raise',
        tempo: '2-1-1-2',
        tip: 'Pełen zakres ruchu łydki z zatrzymaniem w skurczu.',
        sets: makeSets(4, 15, 55, 60)
      },
      {
        originalName: 'front plank',
        tempo: 'izometria',
        tip: 'Mocne spięcie całego core - brzuch, biodra, pośladki.',
        sets: makeSets(3, 1, 0, 60, 45)
      }
    ]
  },

  // 8. Booty & Legs - Pośladki i Nogi
  {
    name: 'Booty & Legs - Pośladki i Nogi',
    level: TrainingLevel.Intermediate,
    durationMinutes: 60,
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop',
    description: 'Niezwykle popularny plan modelujący pośladki i nogi. Kluczowe ćwiczenia to Hip Thrust ze sztangą, RDL oraz wykroki.',
    exercises: [
      {
        originalName: 'barbell hip thrust',
        tempo: '2-0-1-2',
        tip: 'Zatrzymaj ruch na 2 sekundy w pełnym wyproście bioder, broda przy klatce piersiowej.',
        sets: makeSets(4, 10, 70, 90)
      },
      {
        originalName: 'dumbbell romanian deadlift',
        tempo: '3-0-1-0',
        tip: 'Prowadź hantle blisko nóg, poczuj maksymalne rozciągnięcie pośladków i tyłu ud.',
        sets: makeSets(4, 10, 18, 90)
      },
      {
        originalName: 'dumbbell bulgarian split squat',
        tempo: '2-0-1-0',
        tip: 'Pochyl tułów lekko w przód, aby przenieść większą pracę na pośladek.',
        sets: makeSets(3, 10, 12, 75)
      },
      {
        originalName: 'lever seated hip abduction',
        tempo: '2-0-1-1',
        tip: 'Świetna izolacja mięśnia pośladkowego średniego.',
        sets: makeSets(3, 15, 45, 60)
      },
      {
        originalName: 'walking lunge',
        tempo: '2-0-1-0',
        tip: 'Długi, stabilny krok pozwala maksymalnie zaangażować pośladek.',
        sets: makeSets(3, 12, 10, 75)
      },
      {
        originalName: 'cable kneeling crunch',
        tempo: '2-0-1-1',
        tip: 'Zwijaj tułów pracując brzuchem, biodra trzymaj nieruchomo.',
        sets: makeSets(3, 15, 30, 60)
      }
    ]
  },

  // 9. Arms & Core - Ramiona i Brzuch
  {
    name: 'Arms & Core - Ramiona i Brzuch',
    level: TrainingLevel.Intermediate,
    durationMinutes: 55,
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop',
    description: 'Dedykowana sesja na ramiona (biceps i triceps) oraz mięśnie brzucha. Świetny plan uzupełniający dla każdego sportowca.',
    exercises: [
      {
        originalName: 'barbell curl',
        tempo: '2-0-1-0',
        tip: 'Pełen zakres ruchu bez kołysania tułowiem.',
        sets: makeSets(4, 10, 25, 75)
      },
      {
        originalName: 'barbell lying triceps extension skull crusher',
        tempo: '3-0-1-0',
        tip: 'Łokcie stabilne, opuszczaj sztangę tuż za linię czubka głowy.',
        sets: makeSets(4, 10, 25, 75)
      },
      {
        originalName: 'dumbbell hammer curl',
        tempo: '2-0-1-1',
        tip: 'Chwyt młotkowy mocno rozwija szerokość ramienia i przedramiona.',
        sets: makeSets(3, 12, 12, 60)
      },
      {
        originalName: 'cable pushdown (with rope attachment)',
        tempo: '2-0-1-1',
        tip: 'Rozchylaj linki na dole, uzyskując maksymalny skurcz tricepsa.',
        sets: makeSets(3, 12, 20, 60)
      },
      {
        originalName: 'hanging leg raise',
        tempo: '2-0-1-1',
        tip: 'Kontrolowane wznosy bez korzystania z pędu ciała.',
        sets: makeSets(3, 12, 0, 60)
      },
      {
        originalName: 'cable kneeling crunch',
        tempo: '2-0-1-1',
        tip: 'Uginaj kręgosłup siłą mięśni brzucha, przyciągając żebra do miednicy.',
        sets: makeSets(3, 15, 35, 60)
      },
      {
        originalName: 'crunch floor',
        tempo: '2-0-1-1',
        tip: 'Krótkie, intensywne spięcia brzucha z pełnym wydechem na górze.',
        sets: makeSets(3, 20, 0, 45)
      }
    ]
  },

  // 10. Chest & Triceps - Klatka i Triceps
  {
    name: 'Chest & Triceps - Klatka i Triceps',
    level: TrainingLevel.Intermediate,
    durationMinutes: 60,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop',
    description: 'Klasyczny split kulturystyczny na klatkę piersiową i tricepsy. Idealny do maksymalizacji hipertrofii i pompy mięśniowej.',
    exercises: [
      {
        originalName: 'barbell bench press',
        tempo: '2-0-1-0',
        tip: 'Podstawowe ciężkie ćwiczenie wielostawowe na masę i siłę klatki.',
        sets: makeSets(4, 8, 65, 120)
      },
      {
        originalName: 'barbell incline bench press',
        tempo: '2-0-1-0',
        tip: 'Wyciskanie na skosie dodatnim akcentuje górną część mięśni piersiowych.',
        sets: makeSets(3, 8, 50, 90)
      },
      {
        originalName: 'lever pec deck fly',
        tempo: '2-0-1-1',
        tip: 'Izolowane rozpiętki na maszynie zapewniają stałe napięcie w całym zakresie.',
        sets: makeSets(3, 12, 45, 60)
      },
      {
        originalName: 'chest dip',
        tempo: '2-0-1-0',
        tip: 'Pochyl się w przód, aby przenieść obciążenie na dolny akton klatki.',
        sets: makeSets(3, 8, 0, 90)
      },
      {
        originalName: 'barbell close-grip bench press',
        tempo: '2-0-1-0',
        tip: 'Wąski chwyt na szerokość barków przenosi obciążenie bezpośrednio na triceps.',
        sets: makeSets(3, 8, 45, 90)
      },
      {
        originalName: 'cable triceps pushdown (v-bar)',
        tempo: '2-0-1-1',
        tip: 'Płynny ruch prostowania ramion do pełnego zablokowania w łokciach.',
        sets: makeSets(3, 12, 25, 60)
      }
    ]
  }
];

async function run() {
  console.log('🔄 Łączenie z bazą danych MongoDB...');
  await mongoose.connect(MONGO_DB_URI!);
  console.log('✅ Połączono z bazą danych.');

  // 1. Usunięcie obecnych treningów
  console.log('🧹 Usuwanie obecnych treningów z kolekcji "workouts"...');
  const deleteResult = await Workout.deleteMany({});
  console.log(`✅ Usunięto ${deleteResult.deletedCount} starych treningów.`);

  // 2. Pobranie ćwiczeń z bazy danych
  console.log('🔍 Pobieranie ćwiczeń z bazy danych...');
  const exercisesColl = mongoose.connection.collection('exercises');
  const allDbExercises = await exercisesColl.find({}).toArray();
  console.log(`ℹ️ Znaleziono ${allDbExercises.length} ćwiczeń w bazie danych.`);

  const exerciseByOriginalName = new Map<string, any>();
  const exerciseByName = new Map<string, any>();

  for (const ex of allDbExercises) {
    if (ex.original_name) {
      exerciseByOriginalName.set(ex.original_name.toLowerCase().trim(), ex);
    }
    if (ex.name) {
      exerciseByName.set(ex.name.toLowerCase().trim(), ex);
    }
  }

  const findExercise = (originalName: string, fallbackName?: string) => {
    let found = exerciseByOriginalName.get(originalName.toLowerCase().trim());
    if (!found && fallbackName) {
      found = exerciseByName.get(fallbackName.toLowerCase().trim());
    }
    if (!found) {
      // Try fuzzy match
      found = allDbExercises.find(e =>
        (e.original_name && e.original_name.toLowerCase().includes(originalName.toLowerCase())) ||
        (e.name && e.name.toLowerCase().includes(originalName.toLowerCase()))
      );
    }
    if (!found) {
      throw new Error(`Nie znaleziono ćwiczenia: ${originalName} (${fallbackName})`);
    }

    // Return clean exercise object compatible with app expectations
    return {
      _id: found._id,
      id: found._id.toString(),
      name: found.name,
      mainMuscleGroups: found.mainMuscleGroups || [],
      secondaryMuscleGroups: found.secondaryMuscleGroups || [],
      setup: found.setup || [],
      instructions: found.instructions || '',
      mediaUrl: found.mediaUrl || found.image || '',
      image: found.image || found.mediaUrl || '',
      imageHint: found.imageHint || '',
      muscleGroup: found.muscleGroup || (found.mainMuscleGroups?.[0]?.name ?? ''),
      description: found.description || '',
      type: found.type || 'weight',
      ownerId: found.ownerId || 'public',
      popularity: found.popularity || 80
    };
  };

  // 3. Budowanie i wstawianie nowych szablonów treningowych
  console.log('🌱 Przygotowywanie 10 popularnych szablonów treningowych...');
  const newWorkoutsData = WORKOUT_DEFINITIONS.map(def => {
    const exerciseSeries = def.exercises.map(exDef => {
      const exDoc = findExercise(exDef.originalName, exDef.fallbackName);
      return {
        exercise: exDoc,
        tempo: exDef.tempo,
        tip: exDef.tip,
        sets: exDef.sets
      };
    });

    return {
      name: def.name,
      level: def.level,
      durationMinutes: def.durationMinutes,
      imageUrl: def.imageUrl,
      description: def.description,
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries
    };
  });

  console.log('💾 Zapisywanie szablonów do bazy...');
  const insertedWorkouts = await Workout.insertMany(newWorkoutsData);
  console.log(`✅ Pomyślnie dodano ${insertedWorkouts.length} szablonów treningowych!`);

  console.log('\nLista dodanych szablonów:');
  insertedWorkouts.forEach((w, i) => {
    console.log(`${i + 1}. [${w._id}] "${w.name}" (${w.level}, ${w.durationMinutes} min, ${w.exerciseSeries.length} ćwiczeń)`);
  });

  await mongoose.disconnect();
  console.log('👋 Zakończono proces.');
}

run().catch(async err => {
  console.error('❌ Błąd podczas wykonywania skryptu:', err);
  await mongoose.disconnect();
  process.exit(1);
});
