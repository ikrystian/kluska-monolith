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
      // --- KLATKA PIERSIOWA ---
      {
        name: 'Wyciskanie sztangi na ławce poziomej (Bench Press)',
        mainMuscleGroups: [getMg(MuscleGroupName.Chest)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Triceps), getMg(MuscleGroupName.Shoulders)],
        setup: [
          { group: 'Ławka', value: 'Pozioma (0°)' },
          { group: 'Gryf', value: 'Chwyt nachwytem, nieco szerszy niż rozstaw barków' },
          { group: 'Stopy', value: 'Płasko na ziemi, stabilna pozycja' }
        ],
        instructions: '1. Połóż się na ławce ze wzrokiem pod sztangą.\n2. Ściągnij i opuść łopatki, utwórz lekki mostek.\n3. Zdejmij sztangę ze stojaków.\n4. Kontrolowanym ruchem opuść sztangę do środkowej części klatki piersiowej.\n5. Dynamicznie wypchnij ciężar w górę do pełnego wyprostu ramion (bez blokowania łokci).',
        description: 'Podstawowe ćwiczenie wielostawowe budujące masę i siłę klatki piersiowej, przednich aktonów barków oraz tricepsów.',
        type: 'weight' as const,
      },
      {
        name: 'Wyciskanie hantli na ławce skośnej dodatniej (Incline Dumbbell Press)',
        mainMuscleGroups: [getMg(MuscleGroupName.Chest)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Shoulders), getMg(MuscleGroupName.Triceps)],
        setup: [
          { group: 'Ławka', value: 'Kąt 30-45°' },
          { group: 'Sprzęt', value: 'Hantle' },
          { group: 'Pozycja', value: 'Łopatki ściągnięte, stopy mocno na podłożu' }
        ],
        instructions: '1. Usiądź na ławce skośnej, trzymając hantle na udach.\n2. Pchnij hantle kolanami do góry i ułóż na wysokości klatki piersiowej.\n3. Wyciśnij hantle w górę łącząc je lekko nad klatką.\n4. Opuszczaj powoli do odczucia rozciągnięcia klatki piersiowej.',
        description: 'Świetne ćwiczenie ukierunkowane na górną część klatki piersiowej (część obojczykową).',
        type: 'weight' as const,
      },
      {
        name: 'Pompki na poręczach (Dips - Klatka piersiowa)',
        mainMuscleGroups: [getMg(MuscleGroupName.Chest)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Triceps), getMg(MuscleGroupName.Shoulders)],
        setup: [
          { group: 'Poręcze', value: 'Chwyt nachwytem / neutralny' },
          { group: 'Tułów', value: 'Pochylenie do przodu ok. 30°' }
        ],
        instructions: '1. Zwiśnij na poręczach z lekko ugiętymi kolanami.\n2. Pochyl tułów delikatnie do przodu.\n3. Opuść ciało uginając ramiona w łokciach do kąta 90 stopni.\n4. Wypchnij ciało w górę prostując ramiona.',
        description: 'Ciężkie ćwiczenie wielostawowe stymulujące dolną i środkową część klatki piersiowej oraz tricepsy.',
        type: 'weight' as const,
      },
      {
        name: 'Rozpiętki z hantlami na ławce poziomej (Dumbbell Flyes)',
        mainMuscleGroups: [getMg(MuscleGroupName.Chest)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Shoulders)],
        setup: [
          { group: 'Ławka', value: 'Pozioma' },
          { group: 'Chwyt', value: 'Neutralny (dłonie skierowane do siebie)' }
        ],
        instructions: '1. Leżąc na ławce, trzymaj hantle nad klatką z lekko ugiętymi łokciami.\n2. Rozwiedź ramiona na boki zataczając szeroki łuk, aż poczujesz rozciągnięcie.\n3. Wróć do pozycji początkowej napinając klatkę piersiową.',
        description: 'Ćwiczenie izolowane doskonale rozciągające mięśnie klatki piersiowej.',
        type: 'weight' as const,
      },
      {
        name: 'Rozpiętki na wyciągu bramy (Cable Crossover)',
        mainMuscleGroups: [getMg(MuscleGroupName.Chest)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Shoulders)],
        setup: [
          { group: 'Wyciąg', value: 'Bloczki górne lub środkowe' },
          { group: 'Chwyt', value: 'Uchwyty pojedyncze' }
        ],
        instructions: '1. Stań na środku bramy, zrób krok do przodu.\n2. Z ugiętymi łokciami przyciągnij dłonie do siebie przed klatką piersiową.\n3. Przytrzymaj napięcie szczytowe na 1 sekundę i powoli wróć.',
        description: 'Zapewnia stałe napięcie mięśniowe w pełnym zakresie ruchu.',
        type: 'weight' as const,
      },
      {
        name: 'Pompki klasyczne (Push-ups)',
        mainMuscleGroups: [getMg(MuscleGroupName.Chest)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Triceps), getMg(MuscleGroupName.Shoulders), getMg(MuscleGroupName.Core)],
        setup: [
          { group: 'Pozycja', value: 'Podparty przodem, dłonie lekko szersze niż barki' }
        ],
        instructions: '1. Utrzymuj ciało w jednej linii od głowy do pięt.\n2. Opuść klatkę do ziemi zginając łokcie pod kątem 45 stopni do tułowia.\n3. Wypchnij ciało w górę.',
        description: 'Podstawowe ćwiczenie kalisteniczne na klatkę piersiową i mięśnie stabilizujące.',
        type: 'reps' as const,
      },

      // --- PLECY & KAPTURY & DOLNE PLECY ---
      {
        name: 'Martwy ciąg klasyczny (Conventional Deadlift)',
        mainMuscleGroups: [getMg(MuscleGroupName.LowerBack), getMg(MuscleGroupName.Back)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Glutes), getMg(MuscleGroupName.Forearms), getMg(MuscleGroupName.Traps)],
        setup: [
          { group: 'Sztanga', value: 'Nad środkiem stopy' },
          { group: 'Stopy', value: 'Na szerokość bioder' },
          { group: 'Chwyt', value: 'Nachwyt na szerokość barków' }
        ],
        instructions: '1. Zegnij biodra i kolana, uchwyć sztangę.\n2. Wyprostuj plecy, napnij mięśnie najszersze i zepnij brzuch.\n3. Unieś sztangę prowadząc ją blisko nóg, prostując biodra i kolana jednocześnie.\n4. Zablokuj pozycję w pionie.',
        description: 'Król ćwiczeń siłowych angażujący całą taśmę tylną ciała.',
        type: 'weight' as const,
      },
      {
        name: 'Podciąganie na drążku nachwytem (Pull-ups)',
        mainMuscleGroups: [getMg(MuscleGroupName.Back)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Biceps), getMg(MuscleGroupName.Forearms), getMg(MuscleGroupName.RearDelts)],
        setup: [
          { group: 'Drążek', value: 'Chwyt nachwytem szerszy niż szerokość barków' }
        ],
        instructions: '1. Zwiśnij w pełnym wyproście ramion.\n2. Zainicjuj ruch ściągnięciem łopatek w dół i do siebie.\n3. Pociągnij ciało w górę, aż broda znajdzie się nad drążkiem.\n4. Opuść się z pełną kontrolą.',
        description: 'Jedno z najlepszych ćwiczeń na szerokość pleców (mięsień najszerszy grzbietu).',
        type: 'reps' as const,
      },
      {
        name: 'Wiosłowanie sztangą w opadzie tułowia (Barbell Row)',
        mainMuscleGroups: [getMg(MuscleGroupName.Back)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.RearDelts), getMg(MuscleGroupName.Biceps), getMg(MuscleGroupName.LowerBack)],
        setup: [
          { group: 'Pozycja', value: 'Opad tułowia 45-60°, kolana lekko ugięte' },
          { group: 'Chwyt', value: 'Nachwyt lub podchwyt na szerokość barków' }
        ],
        instructions: '1. Pochyl tułów zachowując naturalną krzywiznę kręgosłupa.\n2. Przyciągnij sztangę do dolnej części brzucha/bioder.\n3. Mocno zepnij łopatki w górnej fazie ruchu.\n4. Opuść sztangę kontrolowanym ruchem.',
        description: 'Buduje grubość i gęstość mięśni grzbietu.',
        type: 'weight' as const,
      },
      {
        name: 'Wiosłowanie hantlem jednorącz w oparciu o ławkę (Single-Arm Dumbbell Row)',
        mainMuscleGroups: [getMg(MuscleGroupName.Back)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Biceps), getMg(MuscleGroupName.RearDelts)],
        setup: [
          { group: 'Ławka', value: 'Podparcie kolanem i dłonią tej samej strony' },
          { group: 'Hantel', value: 'Trzymany wolną dłonią' }
        ],
        instructions: '1. Utrzymuj płaskie plecy równolegle do podłoża.\n2. Przyciągnij hantel w kierunku biodra, prowadząc łokieć blisko tułowia.\n3. Powoli opuść hantel do pełnego rozciągnięcia.',
        description: 'Ćwiczenie jednorącz pozwalające na głęboki skurcz i korekcję asymetrii pleców.',
        type: 'weight' as const,
      },
      {
        name: 'Ściąganie drążka wyciągu górnego do klatki (Lat Pulldown)',
        mainMuscleGroups: [getMg(MuscleGroupName.Back)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Biceps), getMg(MuscleGroupName.RearDelts)],
        setup: [
          { group: 'Siedzisko', value: 'Wałki ułożone stabilnie na udach' },
          { group: 'Chwyt', value: 'Szeroki nachwyt' }
        ],
        instructions: '1. Złap drążek i usiądź stabilnie.\n2. Ściągnij drążek do górnej części klatki piersiowej, odchylając tułów minimalnie do tyłu.\n3. Kontroluj powrót drążka do góry.',
        description: 'Świetna alternatywa lub uzupełnienie podciągania na drążku.',
        type: 'weight' as const,
      },
      {
        name: 'Wiosłowanie na wyciągu dolnym siedząc (Seated Cable Row)',
        mainMuscleGroups: [getMg(MuscleGroupName.Back)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Biceps), getMg(MuscleGroupName.RearDelts)],
        setup: [
          { group: 'Maszyna', value: 'Stopy na podnóżkach, kolana lekko ugięte' },
          { group: 'Uchwyt', value: 'Wąski neutralny (V-bar)' }
        ],
        instructions: '1. Usiądź prosto z wyprostowanymi plecami.\n2. Przyciągnij uchwyt do brzucha ściągając łopatki.\n3. Wróć powoli bez wyginania pleców w łuk.',
        description: 'Koncentruje się na środkowej części pleców i mięśniach czworobocznych.',
        type: 'weight' as const,
      },
      {
        name: 'Wznosy tułowia na ławce rzymskiej (Hyperextensions)',
        mainMuscleGroups: [getMg(MuscleGroupName.LowerBack)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Glutes), getMg(MuscleGroupName.Hamstrings)],
        setup: [
          { group: 'Ławka', value: 'Krawędź poduszek tuż poniżej kolców biodrowych' }
        ],
        instructions: '1. Zegnij tułów w dół.\n2. Unieś tułów do linii prostej z nogami napinając prostowniki grzbietu i pośladki.\n3. Nie przepływaj kręgosłupa w odcinku lędźwiowym.',
        description: 'Wzmacnia mięśnie prostowniki grzbietu oraz pośladki.',
        type: 'reps' as const,
      },
      {
        name: 'Szrugsy ze sztangą lub hantlami (Shrugs)',
        mainMuscleGroups: [getMg(MuscleGroupName.Traps)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Pozycja', value: 'Stojąca, sztanga lub hantle trzymane przy tułowiu' }
        ],
        instructions: '1. Unieś barki pionowo w górę w kierunku uszu.\n2. Przytrzymaj spięcie na 1 sekundę.\n3. Opuść barki w dół.',
        description: 'Izolowane ćwiczenie na górną część mięśnia czworobocznego (kaptury).',
        type: 'weight' as const,
      },

      // --- BARKI & TYLNE AKTONY ---
      {
        name: 'Wyciskanie żołnierskie (Overhead Press / OHP)',
        mainMuscleGroups: [getMg(MuscleGroupName.Shoulders)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Triceps), getMg(MuscleGroupName.Traps), getMg(MuscleGroupName.Core)],
        setup: [
          { group: 'Pozycja', value: 'Stojąca, stopy na szerokość bioder' },
          { group: 'Chwyt', value: 'Sztanga na obojczykach, chwyt ciut szerszy niż barki' }
        ],
        instructions: '1. Napnij pośladki i brzuch.\n2. Wyciśnij sztangę pionowo nad głowę.\n3. Przepchnij głowę lekko do przodu po minięciu sztangi.',
        description: 'Klasyczne ćwiczenie siłowe rozwijające przednie i boczne aktony barków.',
        type: 'weight' as const,
      },
      {
        name: 'Wyciskanie hantli siedząc (Seated Dumbbell Shoulder Press)',
        mainMuscleGroups: [getMg(MuscleGroupName.Shoulders)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Triceps)],
        setup: [
          { group: 'Ławka', value: 'Oparcie pionowe (85-90°)' },
          { group: 'Hantle', value: 'Na wysokości uszu/barków' }
        ],
        instructions: '1. Wyciśnij hantle nad głowę do niemal pełnego wyprostu ramion.\n2. Powoli opuść hantle do poziomu uszu.',
        description: 'Pozwala na duży zakres ruchu i niezależną pracę obu barków.',
        type: 'weight' as const,
      },
      {
        name: 'Wznosy ramion bokiem z hantlami (Dumbbell Lateral Raises)',
        mainMuscleGroups: [getMg(MuscleGroupName.Shoulders)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Traps)],
        setup: [
          { group: 'Pozycja', value: 'Stojąca lub siedząca, lekki opad tułowia' }
        ],
        instructions: '1. Unieś hantle bokiem w górę do poziomu barków, prowadząc łokcie lekko wyżej niż nadgarstki.\n2. Powoli opuść hantle.',
        description: 'Kluczowe ćwiczenie budujące szerokość barków (akton boczny).',
        type: 'weight' as const,
      },
      {
        name: 'Face Pulls z linką wyciągu górnego (Face Pulls)',
        mainMuscleGroups: [getMg(MuscleGroupName.RearDelts)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Traps), getMg(MuscleGroupName.Shoulders)],
        setup: [
          { group: 'Wyciąg', value: 'Wysokość twarzy, uchwyt sznurkowy' }
        ],
        instructions: '1. Przyciągnij linkę w kierunku twarzy/nosa, rozciągając dłonie na boki i rotując barki na zewnątrz.\n2. Mocno zepnij tylne aktony barków i łopatki.',
        description: 'Niezastąpione ćwiczenie na tylny akton barku oraz zdrowie stożka rotatorów.',
        type: 'weight' as const,
      },
      {
        name: 'Odwrotne rozpiętki na maszynie (Reverse Pec Deck)',
        mainMuscleGroups: [getMg(MuscleGroupName.RearDelts)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Traps)],
        setup: [
          { group: 'Maszyna', value: 'Siedzisko przodem do oparcia' }
        ],
        instructions: '1. Chwyć rączki i rozwiedź ramiona w tył na wysokości barków.\n2. Zepnij tylne części barków.\n3. Wróć powoli.',
        description: 'Izoluje tylny akton mięśnia naramiennego.',
        type: 'weight' as const,
      },

      // --- RAMIONA (BICEPS, TRICEPS, PRZEDRAMIONA) ---
      {
        name: 'Uginanie przedramion ze sztangą prostą lub łamaną (Barbell Curl)',
        mainMuscleGroups: [getMg(MuscleGroupName.Biceps)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Pozycja', value: 'Stojąca, sztanga trzymana podchwytem' }
        ],
        instructions: '1. Trzymając łokcie blisko tułowia, ugnij przedramiona unosząc sztangę.\n2. Zepnij biceps na górze i powoli opuść ciężar.',
        description: 'Podstawowe ćwiczenie budujące masę bicepsów.',
        type: 'weight' as const,
      },
      {
        name: 'Uginanie przedramion z hantlami z supinacją (Dumbbell Supinating Curl)',
        mainMuscleGroups: [getMg(MuscleGroupName.Biceps)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Pozycja', value: 'Stojąca lub siedząca' }
        ],
        instructions: '1. Unieś hantle rotując dłoń z pozycji neutralnej na zewnątrz (supinacja).\n2. Ściśnij biceps w najwyższym punkcie i opuść.',
        description: 'Wykorzystuje pełną funkcję anatomiczną bicepsa (zginanie + supinacja).',
        type: 'weight' as const,
      },
      {
        name: 'Uginanie młotkowe z hantlami (Hammer Curls)',
        mainMuscleGroups: [getMg(MuscleGroupName.Biceps)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Chwyt', value: 'Neutralny (kciuki skierowane do góry)' }
        ],
        instructions: '1. Ugnij przedramiona trzymając hantle chwytem neutralnym.\n2. Opuść powoli do pełnego wyprostu.',
        description: 'Angażuje mięsień ramienny (brachialis) oraz ramienno-promieniowy przedramienia.',
        type: 'weight' as const,
      },
      {
        name: 'Wyciskanie francuskie ze sztangą łamaną leżąc (Skullcrushers)',
        mainMuscleGroups: [getMg(MuscleGroupName.Triceps)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Ławka', value: 'Pozioma, sztanga łamana w dłoniach' }
        ],
        instructions: '1. Leżąc na ławce unieś sztangę nad klatkę.\n2. Ugnij łokcie opuszczając sztangę w okolice czoła lub za głowę.\n3. Wyprostuj ramiona napinając triceps.',
        description: 'Silnie stymuluje głowę długą i boczną tricepsa.',
        type: 'weight' as const,
      },
      {
        name: 'Prostowanie ramion na wyciągu górnym ze sznurem (Triceps Pushdown)',
        mainMuscleGroups: [getMg(MuscleGroupName.Triceps)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Wyciąg', value: 'Górny, uchwyt sznurkowy' }
        ],
        instructions: '1. Trzymając łokcie nieruchomo przy tułowiu, wyprostuj ramiona w dół rozchylając sznur na boki u dołu.\n2. Wróć do ugięcia pod kątem 90 stopni.',
        description: 'Izolowane ćwiczenie wykończeniowe na triceps.',
        type: 'weight' as const,
      },
      {
        name: 'Wyciskanie sztangi w wąskim chwycie (Close-Grip Bench Press)',
        mainMuscleGroups: [getMg(MuscleGroupName.Triceps)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Chest), getMg(MuscleGroupName.Shoulders)],
        setup: [
          { group: 'Chwyt', value: 'Nachwyt na szerokość barków (ok. 20-30 cm)' }
        ],
        instructions: '1. Opuść sztangę do dolnej części klatki piersiowej prowadząc łokcie blisko tułowia.\n2. Dynamicznie wyciśnij ciężar w górę.',
        description: 'Wielostawowe ćwiczenie budujące masę i siłę tricepsów.',
        type: 'weight' as const,
      },

      // --- NOGI & POŚLADKI ---
      {
        name: 'Przysiad ze sztangą na plecach (Back Squat)',
        mainMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.LowerBack), getMg(MuscleGroupName.Core)],
        setup: [
          { group: 'Sztanga', value: 'Na mięśniach czworobocznych (High bar) lub wyżej łopatek (Low bar)' },
          { group: 'Stopy', value: 'Szerokość barków, palce lekko zewnątrz' }
        ],
        instructions: '1. Zrób wdech, napnij brzuch.\n2. Zegnij biodra i kolana wykonując przysiad poniżej kąta prostego.\n3. Wstań prowadząc kolana stabilnie na zewnątrz.',
        description: 'Król ćwiczeń dolnej części ciała.',
        type: 'weight' as const,
      },
      {
        name: 'Przysiad przedni ze sztangą (Front Squat)',
        mainMuscleGroups: [getMg(MuscleGroupName.Quads)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Glutes), getMg(MuscleGroupName.Core)],
        setup: [
          { group: 'Sztanga', value: 'Przednie aktony barków i obojczyki' }
        ],
        instructions: '1. Trzymaj klatkę uniesioną, a łokcie wysoko.\n2. Wykonaj głęboki przysiad z pionowym tułowiem.\n3. Dynamicznie wyprostuj nogi.',
        description: 'Kładzie większy nacisk na czworogłowe uda i wyprostowaną postawę.',
        type: 'weight' as const,
      },
      {
        name: 'Wypychanie ciężaru na suwnicy (Leg Press)',
        mainMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings)],
        setup: [
          { group: 'Suwnica', value: 'Kąt 45°' },
          { group: 'Stopy', value: 'Na platformie na szerokość bioder' }
        ],
        instructions: '1. Odbezpiecz suwnicę i opuść platformę uginając kolana.\n2. Wypchnij platformę z pięt nie blokując kolan w stawach.',
        description: 'Pozwala na bezpieczne przetestowanie dużych ciężarów bez obciążania kręgosłupa.',
        type: 'weight' as const,
      },
      {
        name: 'Przysiad bułgarski z hantlami (Bulgarian Split Squat)',
        mainMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings)],
        setup: [
          { group: 'Ławka', value: 'Tylna stopa oparta na ławce za Tobą' },
          { group: 'Przednia stopa', value: 'Wykrok do przodu' }
        ],
        instructions: '1. Trzymając hantle w dłoniach opuść biodra pionowo w dół.\n2. Wypchnij tułów w górę z przedniej stopy.',
        description: 'Najlepsze ćwiczenie jednonóż na pośladki i uda.',
        type: 'weight' as const,
      },
      {
        name: 'Wykroki chodzone z hantlami (Walking Lunges)',
        mainMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves)],
        setup: [
          { group: 'Pozycja', value: 'Stojąca, hantle w dłoniach' }
        ],
        instructions: '1. Zrób krok do przodu i opuść kolano tylnej nogi tuż nad podłogę.\n2. Przejdź do kolejnego kroku.',
        description: 'Buduje dynamikę, równowagę oraz masę ud i pośladków.',
        type: 'weight' as const,
      },
      {
        name: 'Rumuński Martwy Ciąg (Romanian Deadlift - RDL)',
        mainMuscleGroups: [getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.LowerBack), getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Sztanga', value: 'Trzymana nachwytem' },
          { group: 'Kolana', value: 'Lekko ugięte, zablokowane w stałym kącie' }
        ],
        instructions: '1. Cofaj biodra w tył opuszczając sztangę wzdłuż ud do poziomu piszczeli.\n2. Poczuj mocne rozciągnięcie tyłu ud.\n3. Wróć napinając pośladki.',
        description: 'Główne ćwiczenie na rozbudowę mięśni dwugłowych ud i pośladków.',
        type: 'weight' as const,
      },
      {
        name: 'Uginanie nóg na maszynie leżąc (Lying Leg Curl)',
        mainMuscleGroups: [getMg(MuscleGroupName.Hamstrings)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Calves)],
        setup: [
          { group: 'Maszyna', value: 'Wałek ułożony tuż nad piętami' }
        ],
        instructions: '1. Leżąc na brzuchu, ugnij kolana przyciągając wałek do pośladków.\n2. Powoli opuść nogi.',
        description: 'Izoluje mięśnie dwugłowe uda.',
        type: 'weight' as const,
      },
      {
        name: 'Wznosy bioder ze sztangą (Hip Thrust)',
        mainMuscleGroups: [getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Quads)],
        setup: [
          { group: 'Ławka', value: 'Oparcie pod łopatkami' },
          { group: 'Sztanga', value: 'Na biodrach (z otuliną piankową)' }
        ],
        instructions: '1. Ugnij kolana pod kątem 90 stopni, stopy na ziemi.\n2. Unieś biodra w górę do pełnego wyprostu i zepnij mocno pośladki.\n3. Powoli opuść biodra.',
        description: 'Najefektywniejsze ćwiczenie na rozbudowę i siłę mięśni pośladkowych.',
        type: 'weight' as const,
      },
      {
        name: 'Odwodzenie nóg na maszynie (Abductor Machine)',
        mainMuscleGroups: [getMg(MuscleGroupName.Abductors), getMg(MuscleGroupName.Glutes)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hips)],
        setup: [
          { group: 'Maszyna', value: 'Poduszki po zewnętrznej stronie kolan' }
        ],
        instructions: '1. Rozepchnij nogi na boki pokonując opór.\n2. Przytrzymaj spięcie i powoli złącz nogi.',
        description: 'Wzmacnia mięśnie pośladkowe średnie i odwodziciele.',
        type: 'weight' as const,
      },
      {
        name: 'Przywodzenie nóg na maszynie (Adductor Machine)',
        mainMuscleGroups: [getMg(MuscleGroupName.Adductors)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hips)],
        setup: [
          { group: 'Maszyna', value: 'Poduszki po wewnętrznej stronie kolan' }
        ],
        instructions: '1. Złącz nogi do środka ściskając poduszki.\n2. Powoli wróć do rozszerzenia.',
        description: 'Wzmacnia pachwiny i wewnętrzną stronę ud.',
        type: 'weight' as const,
      },
      {
        name: 'Wspięcia na palce stojąc (Standing Calf Raise)',
        mainMuscleGroups: [getMg(MuscleGroupName.Calves)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.AnteriorTibialis)],
        setup: [
          { group: 'Podest', value: 'Przednia część stóp na krawędzi podestu' }
        ],
        instructions: '1. Opuść pięty w dół do pełnego rozciągnięcia łydki.\n2. Unieś się wysoko na palce i zepnij łydkę.',
        description: 'Buduje mięsień brzuchaty łydki.',
        type: 'weight' as const,
      },
      {
        name: 'Wspięcia na palce siedząc (Seated Calf Raise)',
        mainMuscleGroups: [getMg(MuscleGroupName.Calves)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.AnteriorTibialis)],
        setup: [
          { group: 'Maszyna', value: 'Wałek ułożony na udach' }
        ],
        instructions: '1. Unieś pięty wysoko w górę.\n2. Opuść powoli w dół.',
        description: 'Targetuje mięsień płaszczkowaty łydki.',
        type: 'weight' as const,
      },

      // --- CORE & BRZUCH ---
      {
        name: 'Plank (Deska izometryczna)',
        mainMuscleGroups: [getMg(MuscleGroupName.Core)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Shoulders), getMg(MuscleGroupName.Glutes)],
        setup: [
          { group: 'Pozycja', value: 'Podparcie na przedramionach i palcach stóp' }
        ],
        instructions: '1. Napnij brzuch, pośladki i uda.\n2. Utrzymuj ciało w prostej linii od głowy po pięty bez opadania bioder.',
        description: 'Podstawowe ćwiczenie izometryczne na stabilizację centralną (core).',
        type: 'duration' as const,
      },
      {
        name: 'Allahy - Skłony tułowia na klęczka na wyciągu (Cable Crunch)',
        mainMuscleGroups: [getMg(MuscleGroupName.Core)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms)],
        setup: [
          { group: 'Wyciąg', value: 'Górny ze sznurem, pozycja klęcząca' }
        ],
        instructions: '1. Trzymając sznur przy głowie, wykonaj skłon tułowia przyciągając łokcie do ud pracą brzucha.\n2. Powoli wróć do wyprostu.',
        description: 'Pozwala na stopniowanie obciążenia w treningu mięśni prostych brzucha.',
        type: 'weight' as const,
      },
      {
        name: 'Wznosy nóg w zwisie na drążku (Hanging Leg Raise)',
        mainMuscleGroups: [getMg(MuscleGroupName.Core)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Forearms), getMg(MuscleGroupName.Hips)],
        setup: [
          { group: 'Drążek', value: 'Swobodny zwis' }
        ],
        instructions: '1. Bez kołysania tułowia unieś proste lub ugięte nogi do poziomu bioder lub klatki.\n2. Powoli opuść nogi.',
        description: 'Świetne ćwiczenie na dolną część mięśnia prostego brzucha.',
        type: 'reps' as const,
      },
      {
        name: 'Russian Twists z ciężarem (Skręty tułowia)',
        mainMuscleGroups: [getMg(MuscleGroupName.Core)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Hips)],
        setup: [
          { group: 'Pozycja', value: 'Siedząca na ziemi, nogi uniesione lekko w powietrzu' }
        ],
        instructions: '1. Trzymając talerz lub hantel przed klatką, wykonuj dynamiczne skręty tułowia z prawej na lewą stronę.',
        description: 'Wzmacnia mięśnie skośne brzucha.',
        type: 'reps' as const,
      },

      // --- KARDIO & FUNKCJONALNE ---
      {
        name: 'Bieg ciągły na bieżni (Treadmill Running)',
        mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves)],
        setup: [
          { group: 'Bieżnia', value: 'Ustawienie prędkości i kąta nachylenia (1-2%)' }
        ],
        instructions: '1. Zacznij od 5-minutowego marszu rozgrzewkowego.\n2. Przejdź do biegu w stałym tempie konwersacyjnym.\n3. Schłodź organizm na koniec.',
        description: 'Klasyczny trening aerobowy poprawiający wydolność krążeniowo-oddechową.',
        type: 'duration' as const,
      },
      {
        name: 'Wiosłowanie na ergometrze wioślarskim (Rowing Ergometer)',
        mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Back), getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Core), getMg(MuscleGroupName.Biceps)],
        setup: [
          { group: 'Ergometr', value: 'Stopy przypięte paskami, opór 4-6' }
        ],
        instructions: '1. Odepchnij się nogami, po czym pociągnij drążek do brzucha.\n2. Wypuść najpierw ramiona, pochyl tułów i ugnij nogi wracając do pozycji wyjściowej.',
        description: 'Ogólnorozwojowe ćwiczenie kardio angażujące 85% mięśni ciała.',
        type: 'duration' as const,
      },
      {
        name: 'Jazda na rowerze stacjonarnym (Stationary Bike)',
        mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Hamstrings)],
        setup: [
          { group: 'Rower', value: 'Wysokość siodełka dopasowana do biodra' }
        ],
        instructions: '1. Pedałuj ze stałą kadencją (80-90 RPM).\n2. Utrzymuj stabilną postawę.',
        description: 'Niskooporowy trening kardio bezpieczny dla stawów kolanowych.',
        type: 'duration' as const,
      },
      {
        name: 'Burpees (Krokodylki)',
        mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
        secondaryMuscleGroups: [getMg(MuscleGroupName.Chest), getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Shoulders), getMg(MuscleGroupName.Core)],
        setup: [
          { group: 'Pozycja', value: 'Stojąca' }
        ],
        instructions: '1. Zrób przysiad i połóż dłonie na ziemi.\n2. Wyrzuć nogi do tyłu do pozycji pompki i opuść klatkę do podłogi.\n3. Wskocz nogami z powrotem i wykonaj wyskok w górę z klśnięciem nad głową.',
        description: 'Intensywne ćwiczenie ogólnorozwojowe i kondycyjne.',
        type: 'reps' as const,
      }
    ];

    const seededExercises = await Exercise.insertMany(
      exercisesData.map(ex => ({
        ...ex,
        ownerId: 'public',
        muscleGroup: ex.mainMuscleGroups[0]?.name,
        imageHint: ex.name.toLowerCase()
      }))
    );
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
