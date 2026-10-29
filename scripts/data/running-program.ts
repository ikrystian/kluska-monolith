/**
 * Zestawy treningowe przygotowujące do biegów na 5 km, 10 km, półmaraton i maraton.
 *
 * Dane są współdzielone przez pełny seed (scripts/seed.ts, który czyści bazę)
 * oraz przez skrypt dosiewający (scripts/seed-running.ts), który dokłada te
 * treningi do istniejącej bazy bez usuwania czegokolwiek.
 */
import { MuscleGroupName, SetType, TrainingLevel } from '../../src/models/types/enums';

type MuscleGroupRef = { name: string; imageUrl?: string };
type GetMuscleGroup = (name: MuscleGroupName) => MuscleGroupRef;

const min = (minutes: number) => minutes * 60;

/**
 * Ćwiczenia biegowe i uzupełniające, których wymagają zestawy startowe.
 * Ćwiczenia siłowe użyte w zestawach (przysiad bułgarski, plank itd.)
 * pochodzą z podstawowej bazy ćwiczeń.
 */
export const buildRunningExercises = (getMg: GetMuscleGroup) => [
  {
    name: 'Rozgrzewka dynamiczna biegacza (Dynamic Warm-up)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Hips), getMg(MuscleGroupName.Glutes), getMg(MuscleGroupName.Core)],
    setup: [
      { group: 'Miejsce', value: 'Płaski odcinek 20-30 m' },
      { group: 'Sprzęt', value: 'Brak' },
    ],
    instructions: '1. Wykonaj krążenia bioder, ramion i kostek (po 10 w każdą stronę).\n2. Przejdź do wymachów nogi w przód-tył i na boki (po 12 na nogę).\n3. Dodaj 20 m marszu na palcach, 20 m marszu na piętach i 20 m wykroków.\n4. Zakończ 2 x 20 m truchtu z narastającą prędkością.',
    description: 'Krótka mobilizacja przed każdą jednostką biegową. Podnosi temperaturę mięśni i zakres ruchu w biodrach, co obniża ryzyko kontuzji.',
    type: 'duration' as const,
  },
  {
    name: 'Trucht rozgrzewkowo-regeneracyjny (Easy Jog)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Hamstrings)],
    setup: [
      { group: 'Intensywność', value: 'Strefa 1-2, ok. 60-70% HR max' },
      { group: 'Tempo', value: 'Ok. 60-90 s/km wolniej niż rozbieganie' },
    ],
    instructions: '1. Ruszaj bardzo wolno, oddychaj wyłącznie nosem, jeśli potrafisz.\n2. Skróć krok i utrzymuj wysoką kadencję (ok. 170-180 kroków/min).\n3. Nie zwracaj uwagi na tempo na zegarku - liczy się niski koszt energetyczny.',
    description: 'Trucht otwierający i zamykający jednostkę treningową. Przygotowuje organizm do akcentu i przyspiesza usuwanie metabolitów po wysiłku.',
    type: 'duration' as const,
  },
  {
    name: 'Bieg spokojny - rozbieganie (Easy Run)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves)],
    setup: [
      { group: 'Intensywność', value: 'Strefa 2, ok. 70-75% HR max' },
      { group: 'Test', value: 'Tempo konwersacyjne - potrafisz mówić pełnymi zdaniami' },
    ],
    instructions: '1. Utrzymuj równe, komfortowe tempo przez cały bieg.\n2. Kontroluj oddech - jeśli nie możesz swobodnie rozmawiać, zwolnij.\n3. Trzymaj sylwetkę wyprostowaną, ramiona rozluźnione, łokcie blisko tułowia.',
    description: 'Fundament każdego planu biegowego. Buduje bazę tlenową, gęstość naczyń włosowatych i wytrzymałość stawów. Powinien stanowić ok. 80% objętości tygodnia.',
    type: 'duration' as const,
  },
  {
    name: 'Długie wybieganie (Long Run)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Glutes), getMg(MuscleGroupName.Calves)],
    setup: [
      { group: 'Intensywność', value: 'Strefa 2, ok. 65-75% HR max' },
      { group: 'Nawodnienie', value: 'Płyny co 20-25 min, węglowodany powyżej 75 min biegu' },
    ],
    instructions: '1. Startuj wolniej, niż ci się chce - pierwsze 15 minut ma być najwolniejsze.\n2. Utrzymuj stałe tempo konwersacyjne przez większość dystansu.\n3. Przy biegach powyżej 75 minut przyjmuj 30-60 g węglowodanów na godzinę.\n4. Ostatnie 10 minut możesz przebiec nieco żwawiej, jeśli czujesz się dobrze.',
    description: 'Najważniejsza jednostka tygodnia w przygotowaniach do półmaratonu i maratonu. Zwiększa zapasy glikogenu, uczy organizm spalać tłuszcze i hartuje psychikę.',
    type: 'duration' as const,
  },
  {
    name: 'Bieg tempowy - próg mleczanowy (Tempo Run)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves)],
    setup: [
      { group: 'Intensywność', value: 'Strefa 4, ok. 85-88% HR max' },
      { group: 'Tempo', value: 'Ok. 10-20 s/km wolniej niż tempo na 10 km' },
    ],
    instructions: '1. Po rozgrzewce wejdź płynnie w tempo progowe - bez zrywu.\n2. Utrzymuj wysiłek "komfortowo ciężki": możesz wypowiedzieć 3-4 słowa naraz.\n3. Trzymaj równe tempo - ostatni kilometr nie powinien być wolniejszy niż pierwszy.\n4. Zakończ truchtem, nie zatrzymuj się nagle.',
    description: 'Podnosi próg mleczanowy, czyli tempo, przy którym organizm nadąża z usuwaniem mleczanu. Bezpośrednio przekłada się na wyniki od 5 km po maraton.',
    type: 'duration' as const,
  },
  {
    name: 'Interwały progowe (Cruise Intervals)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves)],
    setup: [
      { group: 'Intensywność', value: 'Strefa 4, tempo progowe' },
      { group: 'Przerwa', value: 'Trucht 60-90 s, bez pełnego wypoczęcia' },
    ],
    instructions: '1. Każdy odcinek biegnij w tempie progowym, równo od pierwszego do ostatniego metra.\n2. Przerwy rób w truchcie - nie zatrzymuj się i nie schodź do marszu.\n3. Jeśli tempo spada o więcej niż 5 s/km, zakończ trening wcześniej.',
    description: 'Rozbicie biegu tempowego na odcinki z krótką przerwą. Pozwala zebrać więcej minut przy progu niż ciągły tempowy, przy niższym koszcie regeneracyjnym.',
    type: 'duration' as const,
  },
  {
    name: 'Interwały VO2max (Track Intervals)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves)],
    setup: [
      { group: 'Intensywność', value: 'Strefa 5, ok. 95-100% HR max' },
      { group: 'Tempo', value: 'Tempo startowe na 3-5 km' },
      { group: 'Nawierzchnia', value: 'Bieżnia stadionowa lub równy, płaski odcinek' },
    ],
    instructions: '1. Rozbieg się minimum 15 minut i zrób 3-4 przebieżki przed pierwszym odcinkiem.\n2. Pierwszy odcinek przebiegnij najwolniej z całej serii - to zapas na końcówkę.\n3. W przerwie trucht, nie marsz - utrzymuje tętno w odpowiednim zakresie.\n4. Przerwij serię, gdy nie utrzymujesz założonego tempa - lepszy krótszy dobry trening niż długi zły.',
    description: 'Najsilniejszy bodziec podnoszący pułap tlenowy i ekonomię biegu. Kluczowy w przygotowaniu do 5 i 10 km, w planach maratońskich stosowany oszczędnie.',
    type: 'duration' as const,
  },
  {
    name: 'Bieg w tempie startowym (Race Pace Run)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Glutes)],
    setup: [
      { group: 'Intensywność', value: 'Docelowe tempo zawodów' },
      { group: 'Sprzęt', value: 'Buty i odżywianie planowane na start' },
    ],
    instructions: '1. Wejdź w docelowe tempo startowe i utrzymuj je z dokładnością do 5 s/km.\n2. Ćwicz rytm oddechu i kadencję, które chcesz mieć na zawodach.\n3. Przetestuj żele i napoje w tej samej kolejności co planujesz na starcie.',
    description: 'Trening specyficzny - uczy nogi i głowę dokładnie tego tempa, w którym pobiegniesz zawody. Sprawdza też sprzęt i strategię żywieniową.',
    type: 'duration' as const,
  },
  {
    name: 'Podbiegi (Hill Repeats)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Glutes), getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Calves)],
    setup: [
      { group: 'Podbieg', value: 'Nachylenie 5-8%, odcinek 200-400 m' },
      { group: 'Przerwa', value: 'Zbieg truchtem, spokojnie, bez hamowania piętami' },
    ],
    instructions: '1. Wbiegaj mocno, ale kontrolowanie - wysiłek jak na 3 km, nie sprint.\n2. Pracuj ramionami, utrzymuj wysokie biodra i krótki, częsty krok.\n3. Patrz kilka metrów przed siebie, nie pod nogi.\n4. Zbiegaj bardzo spokojnie - to część przerwy, nie kolejny akcent.',
    description: 'Siła biegowa bez sztangi. Wzmacnia pośladki i łydki, poprawia moc odbicia i technikę, a przy tym mocno obciąża układ krążenia przy niższym ryzyku urazu niż płaskie interwały.',
    type: 'duration' as const,
  },
  {
    name: 'Przebieżki - rytmy (Strides)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hips)],
    setup: [
      { group: 'Odcinek', value: '80-120 m po płaskim' },
      { group: 'Przerwa', value: 'Marsz lub trucht do pełnego wypoczęcia' },
    ],
    instructions: '1. Rozpędzaj się przez pierwsze 20-30 m, nie startuj z miejsca na maksa.\n2. Środkową część odcinka biegnij szybko, ale rozluźniony - twarz i barki luźne.\n3. Ostatnie metry wybiegaj płynnie, bez gwałtownego hamowania.\n4. Wypocznij w pełni przed kolejną przebieżką.',
    description: 'Krótkie przyspieszenia poprawiające technikę, kadencję i sprężystość. Nie generują zmęczenia, więc można je dokładać do spokojnych biegów.',
    type: 'duration' as const,
  },
  {
    name: 'Fartlek - zabawa biegowa',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves)],
    setup: [
      { group: 'Intensywność', value: 'Zmienna: od tempa progowego do tempa 5 km' },
      { group: 'Teren', value: 'Dowolny - park, las, ulica' },
    ],
    instructions: '1. Po rozgrzewce przyspieszaj na wyznaczony czas, potem truchtaj tyle samo lub krócej.\n2. Nie patrz na zegarek podczas odcinka - biegnij "na czucie".\n3. Utrzymuj podobną intensywność we wszystkich przyspieszeniach.',
    description: 'Trening zmienny bez sztywnego reżimu odcinków. Świetny na urozmaicenie i wejście w szybsze tempa dla osób, które nie lubią stadionu.',
    type: 'duration' as const,
  },
  {
    name: 'Marszobieg (Run-Walk)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Hamstrings)],
    setup: [
      { group: 'Intensywność', value: 'Bieg w strefie 2, marsz energiczny' },
      { group: 'Progresja', value: 'Co tydzień wydłużaj odcinek biegu o 30-60 s' },
    ],
    instructions: '1. Biegnij zaplanowany odcinek w spokojnym, konwersacyjnym tempie.\n2. Przejdź na energiczny marsz na czas przerwy - nie zatrzymuj się całkowicie.\n3. Powtórz cykl zaplanowaną liczbę razy.\n4. Jeśli kończysz trening bez zadyszki, w kolejnym tygodniu wydłuż odcinek biegu.',
    description: 'Metoda wejścia w bieganie od zera. Naprzemienny bieg i marsz pozwala zebrać objętość bez przeciążenia ścięgien i stawów.',
    type: 'duration' as const,
  },
  {
    name: 'Skip A - wysokie kolana (A-Skip)',
    mainMuscleGroups: [getMg(MuscleGroupName.Hips)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Core)],
    setup: [
      { group: 'Odcinek', value: '20-30 m' },
      { group: 'Postawa', value: 'Tułów wyprostowany, biodra wysoko' },
    ],
    instructions: '1. Unieś kolano do wysokości bioder, stopa zadarta do góry.\n2. Aktywnie sprowadź stopę pod biodro, lądując na śródstopiu.\n3. Utrzymuj krótki kontakt z podłożem i rytmiczną pracę ramion.',
    description: 'Podstawowe ćwiczenie techniki biegu. Uczy aktywnego lądowania pod biodrem i poprawia kadencję.',
    type: 'duration' as const,
  },
  {
    name: 'Skip C - uderzenia piętami o pośladki (C-Skip)',
    mainMuscleGroups: [getMg(MuscleGroupName.Hamstrings)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Core)],
    setup: [
      { group: 'Odcinek', value: '20-30 m' },
      { group: 'Postawa', value: 'Lekkie pochylenie z kostek, biodra do przodu' },
    ],
    instructions: '1. Podbijaj piętę do pośladka, utrzymując kolano pod biodrem.\n2. Nie odchylaj tułowia do tyłu.\n3. Pracuj szybko i lekko - to ćwiczenie techniczne, nie siłowe.',
    description: 'Ćwiczenie techniczne poprawiające fazę zamachową kroku biegowego i rozluźniające dwugłowe uda.',
    type: 'duration' as const,
  },
  {
    name: 'Wieloskoki (Bounding)',
    mainMuscleGroups: [getMg(MuscleGroupName.Glutes)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Hamstrings)],
    setup: [
      { group: 'Nawierzchnia', value: 'Trawa, tartan lub miękka ścieżka' },
      { group: 'Odcinek', value: '20-30 m, 8-12 odbić' },
    ],
    instructions: '1. Odbijaj się z jednej nogi na drugą, maksymalizując długość i wysokość lotu.\n2. Ląduj na całej stopie z lekko ugiętym kolanem.\n3. Pomagaj sobie zamachem przeciwnego ramienia.\n4. Nie wykonuj na twardym asfalcie ani przy bólu ścięgna Achillesa.',
    description: 'Plyometria rozwijająca moc odbicia i sprężystość ścięgien. Poprawia ekonomię biegu, czyli koszt tlenowy utrzymania danego tempa.',
    type: 'reps' as const,
  },
  {
    name: 'Wspięcia na palce jednonóż (Single-Leg Calf Raise)',
    mainMuscleGroups: [getMg(MuscleGroupName.Calves)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.AnteriorTibialis), getMg(MuscleGroupName.Core)],
    setup: [
      { group: 'Pozycja', value: 'Stopa na krawędzi stopnia, pięta swobodnie opuszczona' },
      { group: 'Podparcie', value: 'Palce jednej ręki na ścianie dla równowagi' },
    ],
    instructions: '1. Stań na jednej nodze na krawędzi stopnia.\n2. Opuść piętę maksymalnie w dół, czując rozciąganie łydki.\n3. Wznieś się powoli najwyżej jak potrafisz (2 s w górę, 3 s w dół).\n4. Nie odbijaj się i nie pomagaj sobie ręką.',
    description: 'Najlepsza profilaktyka urazów ścięgna Achillesa i łydki u biegaczy. Buduje wytrzymałość tkanek na powtarzalne obciążenie kroku biegowego.',
    type: 'reps' as const,
  },
  {
    name: 'Mostek biodrowy jednonóż (Single-Leg Glute Bridge)',
    mainMuscleGroups: [getMg(MuscleGroupName.Glutes)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Core), getMg(MuscleGroupName.LowerBack)],
    setup: [
      { group: 'Pozycja', value: 'Leżenie tyłem, jedna stopa na podłodze, druga noga uniesiona' },
      { group: 'Sprzęt', value: 'Mata' },
    ],
    instructions: '1. Ugnij jedną nogę, drugą wyprostuj lub przyciągnij kolano do klatki.\n2. Wypchnij biodra w górę pracą pośladka nogi podpierającej.\n3. Zatrzymaj na sekundę w górze, nie przeprostowując lędźwi.\n4. Opuść biodra kontrolowanie, nie kładąc ich całkiem na podłodze.',
    description: 'Wzmacnia pośladek wielki po jednej stronie - kluczowe dla stabilizacji miednicy w fazie podporu i profilaktyki bólu kolan.',
    type: 'reps' as const,
  },
  {
    name: 'Deska bokiem (Side Plank)',
    mainMuscleGroups: [getMg(MuscleGroupName.Core)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Abductors), getMg(MuscleGroupName.Hips), getMg(MuscleGroupName.Shoulders)],
    setup: [
      { group: 'Pozycja', value: 'Podpór bokiem na przedramieniu, łokieć pod barkiem' },
      { group: 'Sprzęt', value: 'Mata' },
    ],
    instructions: '1. Ustaw łokieć dokładnie pod barkiem, stopy jedna na drugiej.\n2. Unieś biodra tak, by ciało tworzyło linię prostą.\n3. Nie pozwól opaść biodru w dół ani obrócić się do przodu.\n4. Wykonaj zaplanowany czas na obie strony.',
    description: 'Stabilizacja boczna tułowia i mięśni odwodzących. Ogranicza opadanie miednicy przy każdym kroku, co jest częstą przyczyną kontuzji pasma biodrowo-piszczelowego.',
    type: 'duration' as const,
  },
  {
    name: 'Martwy robak (Dead Bug)',
    mainMuscleGroups: [getMg(MuscleGroupName.Core)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Hips), getMg(MuscleGroupName.LowerBack)],
    setup: [
      { group: 'Pozycja', value: 'Leżenie tyłem, biodra i kolana zgięte pod kątem 90°' },
      { group: 'Sprzęt', value: 'Mata' },
    ],
    instructions: '1. Dociśnij odcinek lędźwiowy do maty i utrzymaj docisk przez cały ruch.\n2. Opuszczaj jednocześnie przeciwne ramię i nogę nisko nad podłogę.\n3. Wróć do pozycji wyjściowej i zmień stronę.\n4. Jeśli lędźwie odrywają się od maty, zmniejsz zakres ruchu.',
    description: 'Uczy utrzymania neutralnej pozycji kręgosłupa przy ruchu kończyn - dokładnie tego, co robi tułów podczas biegu.',
    type: 'reps' as const,
  },
  {
    name: 'Rolowanie i rozciąganie po biegu (Cool-down & Mobility)',
    mainMuscleGroups: [getMg(MuscleGroupName.FullBody)],
    secondaryMuscleGroups: [getMg(MuscleGroupName.Quads), getMg(MuscleGroupName.Hamstrings), getMg(MuscleGroupName.Calves), getMg(MuscleGroupName.Glutes)],
    setup: [
      { group: 'Sprzęt', value: 'Wałek do rolowania, mata' },
      { group: 'Czas', value: '60-90 s na grupę mięśniową' },
    ],
    instructions: '1. Roluj kolejno łydki, przednią i tylną część uda oraz pośladki.\n2. Zatrzymuj się na 20-30 s w bolesnych punktach, oddychając spokojnie.\n3. Zakończ statycznym rozciąganiem zginaczy bioder i łydek (po 30 s na stronę).',
    description: 'Zamknięcie jednostki biegowej. Przyspiesza powrót tętna do spoczynku i utrzymuje zakres ruchu w biodrach oraz stawie skokowym.',
    type: 'duration' as const,
  },
];

/** Serie czasowe (ćwiczenia typu duration) - reps i weight są w schemacie wymagane. */
const timeSets = (count: number, duration: number, restTimeSeconds: number, type: SetType = SetType.WorkingSet) =>
  Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    type,
    reps: 1,
    weight: 0,
    duration,
    restTimeSeconds,
  }));

/** Serie na powtórzenia (ćwiczenia typu reps / weight). */
const repSets = (count: number, reps: number, restTimeSeconds: number, weight = 0) =>
  Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    type: SetType.WorkingSet,
    reps,
    weight,
    restTimeSeconds,
  }));

const WARM_UP = 'Rozgrzewka dynamiczna biegacza (Dynamic Warm-up)';
const JOG = 'Trucht rozgrzewkowo-regeneracyjny (Easy Jog)';
const COOL_DOWN = 'Rolowanie i rozciąganie po biegu (Cool-down & Mobility)';

/**
 * Szablony treningów pogrupowane w cztery zestawy startowe.
 * getEx zwraca ćwiczenie po nazwie - z bazy albo ze świeżo zaseedowanej listy.
 */
export const buildRunningWorkouts = <TExercise>(getEx: (name: string) => TExercise) => {
  const warmUp = (minutes: number, tip: string) => ({
    exercise: getEx(WARM_UP),
    tempo: 'rozgrzewka',
    tip,
    sets: timeSets(1, min(minutes), 60, SetType.WarmUpSet),
  });

  const jog = (minutes: number, tip: string, rest = 60) => ({
    exercise: getEx(JOG),
    tempo: 'strefa 1-2',
    tip,
    sets: timeSets(1, min(minutes), rest, SetType.WarmUpSet),
  });

  const coolDown = (minutes: number, tip: string) => ({
    exercise: getEx(COOL_DOWN),
    tempo: 'regeneracja',
    tip,
    sets: timeSets(1, min(minutes), 0, SetType.BackOffSet),
  });

  return [
    // ============================================================
    // ZESTAW: BIEG NA 5 KM
    // ============================================================
    {
      name: '5 km - Marszobieg dla początkujących',
      level: TrainingLevel.Beginner,
      durationMinutes: 45,
      imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5',
      description: 'Pierwszy krok w stronę 5 km dla osób zaczynających od zera. Osiem cykli 3 minut biegu i 90 sekund marszu. Wykonuj 3 razy w tygodniu i co tydzień wydłużaj odcinek biegu o 30 sekund - po 8 tygodniach przebiegniesz 5 km bez przerwy.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Nie pomijaj rozgrzewki - to ona chroni ścięgna przy pierwszych tygodniach biegania.'),
        {
          exercise: getEx('Marszobieg (Run-Walk)'),
          tempo: 'konwersacyjne',
          tip: 'Bieg ma być tak wolny, żebyś mógł swobodnie rozmawiać. Jeśli łapiesz zadyszkę - zwolnij, nie skracaj odcinka.',
          sets: timeSets(8, 180, 90),
        },
        coolDown(6, 'Zroluj łydki i przód ud - to miejsca, które najbardziej bolą w pierwszych tygodniach.'),
      ],
    },
    {
      name: '5 km - Rozbieganie z rytmami',
      level: TrainingLevel.Beginner,
      durationMinutes: 50,
      imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8',
      description: 'Spokojny bieg budujący bazę tlenową, zakończony sześcioma przebieżkami. Podstawowa jednostka tygodnia - powinna stanowić ok. 80% twojej objętości biegowej. Rytmy na końcu poprawiają technikę bez dokładania zmęczenia.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Skup się na wymachach nóg i krążeniach bioder.'),
        {
          exercise: getEx('Bieg spokojny - rozbieganie (Easy Run)'),
          tempo: 'strefa 2',
          tip: 'Test rozmowy: jeśli nie potrafisz wypowiedzieć pełnego zdania, biegniesz za szybko.',
          sets: timeSets(1, min(35), 120),
        },
        {
          exercise: getEx('Przebieżki - rytmy (Strides)'),
          tempo: 'szybko, luźno',
          tip: 'Rozpędzaj się stopniowo. To nie sprint - twarz i barki mają zostać rozluźnione.',
          sets: timeSets(6, 20, 60),
        },
        coolDown(5, 'Rozciągnij zginacze bioder - przy siedzącej pracy to one ograniczają krok biegowy.'),
      ],
    },
    {
      name: '5 km - Interwały 5 x 1000 m (VO2max)',
      level: TrainingLevel.Intermediate,
      durationMinutes: 70,
      imageUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571',
      description: 'Kluczowy akcent w przygotowaniu do 5 km. Pięć kilometrowych odcinków w tempie startowym na 3-5 km z trzyminutowym truchtem przerwy. Wykonuj raz w tygodniu, nie częściej - to najbardziej obciążająca jednostka w planie.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Przy interwałach rozgrzewka jest obowiązkowa - zimne mięśnie na pełnej prędkości to prosta droga do naderwania.'),
        jog(15, 'Bardzo spokojnie. To ma podnieść tętno, a nie zmęczyć przed akcentem.'),
        {
          exercise: getEx('Przebieżki - rytmy (Strides)'),
          tempo: 'przyspieszenia',
          tip: 'Cztery rytmy otwierają nogi przed pierwszym odcinkiem.',
          sets: timeSets(4, 20, 60),
        },
        {
          exercise: getEx('Interwały VO2max (Track Intervals)'),
          tempo: 'tempo 3-5 km',
          tip: 'Pierwszy odcinek najwolniejszy z całej serii. Jeśli tempo na 4. odcinku spada o ponad 5 s/km, zakończ trening po czwartym.',
          sets: timeSets(5, 270, 180),
        },
        jog(10, 'Schłodzenie truchtem przyspiesza usuwanie mleczanu.'),
        coolDown(5, 'Po mocnym akcencie rolowanie tylko delikatne, bez wchodzenia w ból.'),
      ],
    },
    {
      name: '5 km - Bieg tempowy 3 x 8 minut',
      level: TrainingLevel.Intermediate,
      durationMinutes: 60,
      imageUrl: 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf',
      description: 'Trzy ośmiominutowe odcinki w tempie progowym z dwuminutowym truchtem przerwy. Podnosi próg mleczanowy, dzięki czemu utrzymasz szybsze tempo bez zakwaszenia. Drugi po interwałach akcent tygodnia dla biegacza na 5 km.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Dodaj 2-3 przebieżki na koniec rozgrzewki.'),
        jog(15, 'Spokojne wprowadzenie - tętno ma rosnąć stopniowo.'),
        {
          exercise: getEx('Interwały progowe (Cruise Intervals)'),
          tempo: 'próg mleczanowy',
          tip: 'Wysiłek "komfortowo ciężki" - powinieneś być w stanie wypowiedzieć 3-4 słowa naraz.',
          sets: timeSets(3, min(8), 120),
        },
        jog(10, 'Nie kończ treningu nagłym zatrzymaniem.'),
        coolDown(5, 'Zroluj łydki i pasmo biodrowo-piszczelowe.'),
      ],
    },
    {
      name: '5 km - Siła biegacza',
      level: TrainingLevel.Beginner,
      durationMinutes: 40,
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b',
      description: 'Trening uzupełniający wykonywany 2 razy w tygodniu w dni bez akcentu biegowego. Wzmacnia pośladki, łydki i stabilizację tułowia - trzy najczęstsze słabe ogniwa u biegaczy amatorów. Ćwiczenia jednonóż celowo, bo bieg to seria podporów na jednej nodze.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        {
          exercise: getEx('Skip A - wysokie kolana (A-Skip)'),
          tempo: 'rytmicznie',
          tip: 'Traktuj skipy jako rozgrzewkę i naukę techniki jednocześnie.',
          sets: timeSets(3, 30, 45, SetType.WarmUpSet),
        },
        {
          exercise: getEx('Przysiad bułgarski z hantlami (Bulgarian Split Squat)'),
          tempo: '3-0-1-0',
          tip: 'Kolano nogi zakrocznej prowadź nad linią stopy. Zacznij bez obciążenia, dokładaj hantle dopiero gdy utrzymasz równowagę.',
          sets: repSets(3, 10, 90, 10),
        },
        {
          exercise: getEx('Mostek biodrowy jednonóż (Single-Leg Glute Bridge)'),
          tempo: '2-1-1-0',
          tip: 'Wypychaj biodra pośladkiem, nie dwugłowym uda. Jeśli łapie cię skurcz w tyle uda, skróć zakres.',
          sets: repSets(3, 12, 60),
        },
        {
          exercise: getEx('Wspięcia na palce jednonóż (Single-Leg Calf Raise)'),
          tempo: '2-0-3-0',
          tip: 'Powoli w dół. To faza ekscentryczna buduje odporność ścięgna Achillesa.',
          sets: repSets(3, 15, 60),
        },
        {
          exercise: getEx('Plank (Deska izometryczna)'),
          tempo: 'izometria',
          tip: 'Napnij brzuch i pośladki. Lepsze 30 s w idealnej pozycji niż 90 s z opadniętymi biodrami.',
          sets: timeSets(3, 45, 45),
        },
        {
          exercise: getEx('Deska bokiem (Side Plank)'),
          tempo: 'izometria',
          tip: 'Wykonaj zaplanowany czas na każdą stronę - łącznie 6 serii.',
          sets: timeSets(3, 30, 45),
        },
      ],
    },

    // ============================================================
    // ZESTAW: BIEG NA 10 KM
    // ============================================================
    {
      name: '10 km - Rozbieganie 60 minut',
      level: TrainingLevel.Intermediate,
      durationMinutes: 75,
      imageUrl: 'https://images.unsplash.com/photo-1483721310020-03333e577078',
      description: 'Godzinny bieg w strefie 2 - trzon objętości tygodniowej w przygotowaniu do 10 km. Buduje bazę tlenową i wytrzymałość tkanek. Powinieneś kończyć go z uczuciem, że mógłbyś biec dalej.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Nawet przed spokojnym biegiem poświęć 5 minut na mobilizację bioder.'),
        {
          exercise: getEx('Bieg spokojny - rozbieganie (Easy Run)'),
          tempo: 'strefa 2',
          tip: 'Ok. 60-75 s/km wolniej niż twoje tempo docelowe na 10 km. Kadencja 170-180 kroków/min.',
          sets: timeSets(1, min(60), 120),
        },
        {
          exercise: getEx('Przebieżki - rytmy (Strides)'),
          tempo: 'szybko, luźno',
          tip: 'Cztery rytmy na koniec przypominają nogom, jak wygląda szybki krok.',
          sets: timeSets(4, 20, 60),
        },
        coolDown(6, 'Po godzinnym biegu poświęć więcej czasu na łydki i pośladki.'),
      ],
    },
    {
      name: '10 km - Interwały progowe 5 x 1000 m',
      level: TrainingLevel.Intermediate,
      durationMinutes: 60,
      imageUrl: 'https://images.unsplash.com/photo-1486218119243-13883505764c',
      description: 'Pięć kilometrowych odcinków w tempie zbliżonym do startowego na 10 km, z minutą truchtu przerwy. Krótka przerwa sprawia, że trening pracuje na progu mleczanowym, a nie na VO2max - dokładnie tego wymaga dziesiątka.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Zakończ rozgrzewkę trzema przebieżkami.'),
        jog(15, 'Płynne wprowadzenie w wysiłek.'),
        {
          exercise: getEx('Interwały progowe (Cruise Intervals)'),
          tempo: 'tempo 10 km',
          tip: 'Przerwa tylko 60 s truchtu - masz nie wypocząć w pełni. Trzymaj równe tempo na wszystkich pięciu odcinkach.',
          sets: timeSets(5, 240, 60),
        },
        jog(10, 'Schłodzenie w bardzo spokojnym truchcie.'),
        coolDown(5, 'Delikatne rolowanie i rozciąganie łydek.'),
      ],
    },
    {
      name: '10 km - Bieg tempowy 25 minut',
      level: TrainingLevel.Intermediate,
      durationMinutes: 60,
      imageUrl: 'https://images.unsplash.com/photo-1502904550040-7534597429ae',
      description: 'Ciągły 25-minutowy odcinek w tempie progowym. Najbardziej specyficzny akcent dla biegacza na 10 km - uczy utrzymania mocnego, równego wysiłku przez długi czas. Tempo ok. 10-20 s/km wolniejsze niż docelowe na dziesiątkę.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Mobilizacja bioder i kostek przed mocnym akcentem.'),
        jog(15, 'Wejdź w tempowy z rozgrzanym organizmem, nie od pierwszej minuty treningu.'),
        {
          exercise: getEx('Bieg tempowy - próg mleczanowy (Tempo Run)'),
          tempo: 'próg mleczanowy',
          tip: 'Równo od początku do końca. Ostatnie 5 minut nie może być wolniejsze niż pierwsze - jeśli jest, następnym razem zacznij spokojniej.',
          sets: timeSets(1, min(25), 180),
        },
        jog(10, 'Truchtem, aż tętno spadnie poniżej 130.'),
        coolDown(5, 'Zroluj łydki i przód ud.'),
      ],
    },
    {
      name: '10 km - Podbiegi 10 x 60 s',
      level: TrainingLevel.Intermediate,
      durationMinutes: 65,
      imageUrl: 'https://images.unsplash.com/photo-1530143311094-34d807799e8f',
      description: 'Dziesięć minutowych wbiegów na wzniesienie o nachyleniu 5-8%, ze zbieganiem truchtem jako przerwą. Buduje siłę biegową i moc odbicia przy mniejszym ryzyku urazu niż płaskie interwały. Świetny akcent na okres budowania bazy.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Poświęć dodatkową chwilę na kostki - podbiegi mocno je obciążają.'),
        jog(15, 'Dobiegnij truchtem do wzniesienia.'),
        {
          exercise: getEx('Podbiegi (Hill Repeats)'),
          tempo: 'wysiłek jak na 3 km',
          tip: 'Wbiegaj mocno, ale nie sprintem. Zbiegaj bardzo spokojnie - zbieg jest przerwą, nie kolejnym akcentem.',
          sets: timeSets(10, 60, 120),
        },
        jog(10, 'Po podbiegach zawsze schłodzenie po płaskim.'),
        coolDown(6, 'Łydki i ścięgna Achillesa dostały dziś najwięcej - poświęć im najwięcej czasu.'),
      ],
    },
    {
      name: '10 km - Fartlek 45 minut',
      level: TrainingLevel.Intermediate,
      durationMinutes: 60,
      imageUrl: 'https://images.unsplash.com/photo-1595231776515-ddffb1f4eb73',
      description: 'Zabawa biegowa: osiem przyspieszeń po 2 minuty z 2 minutami truchtu, wplecionych w 45-minutowy bieg w terenie. Bez stadionu i bez patrzenia na zegarek - biegniesz na czucie. Dobry sposób na wejście w szybsze tempa dla osób, które nie znoszą interwałów.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(5, 'Fartlek w terenie - rozgrzej też kostki pod nierówne podłoże.'),
        jog(10, 'Rozbiegaj się spokojnie po ścieżce.'),
        {
          exercise: getEx('Fartlek - zabawa biegowa'),
          tempo: 'zmienne',
          tip: 'Nie patrz na zegarek w trakcie odcinka. Wszystkie przyspieszenia mają być podobnie mocne - nie zaczynaj za ostro.',
          sets: timeSets(8, 120, 120),
        },
        jog(9, 'Zakończ spokojnym truchtem do pełnych 45 minut biegu.'),
        coolDown(5, 'Rozciągnij pośladki i zginacze bioder.'),
      ],
    },

    // ============================================================
    // ZESTAW: PÓŁMARATON (21,1 KM)
    // ============================================================
    {
      name: 'Półmaraton - Długie wybieganie 100 minut',
      level: TrainingLevel.Intermediate,
      durationMinutes: 115,
      imageUrl: 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73',
      description: 'Najważniejsza jednostka tygodnia w przygotowaniu do półmaratonu. Sto minut w strefie 2 - ok. 18-20 km. Wydłużaj długie wybieganie o maksymalnie 10 minut tygodniowo i co czwarty tydzień rób tydzień odciążający.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(6, 'Przy długim biegu rozgrzewka może być krótsza - pierwsze kilometry biegu ją zastąpią.'),
        {
          exercise: getEx('Długie wybieganie (Long Run)'),
          tempo: 'strefa 2',
          tip: 'Pierwsze 15 minut najwolniejsze. Powyżej 75 minut przyjmuj 30-60 g węglowodanów na godzinę - przetestuj to teraz, nie na zawodach.',
          sets: timeSets(1, min(100), 180),
        },
        coolDown(8, 'Po długim biegu rolowanie jest obowiązkowe. Uzupełnij węglowodany i białko w ciągu 30 minut.'),
      ],
    },
    {
      name: 'Półmaraton - Interwały progowe 4 x 2000 m',
      level: TrainingLevel.Advanced,
      durationMinutes: 75,
      imageUrl: 'https://images.unsplash.com/photo-1487956382158-bb926046304a',
      description: 'Cztery dwukilometrowe odcinki w tempie progowym z 90-sekundowym truchtem przerwy. Pozwala zebrać 32 minuty przy progu - więcej, niż wytrzymałbyś w jednym ciągłym odcinku. Główny akcent jakościowy w drugiej połowie cyklu półmaratońskiego.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(6, 'Przed odcinkami po 8 minut rozgrzewka musi być kompletna.'),
        jog(15, 'Zakończ trzema przebieżkami.'),
        {
          exercise: getEx('Interwały progowe (Cruise Intervals)'),
          tempo: 'próg mleczanowy',
          tip: 'Tempo ok. 10-15 s/km szybsze niż docelowe na półmaraton. Przerwa 90 s truchtu - nie zatrzymuj się.',
          sets: timeSets(4, min(8), 90),
        },
        jog(12, 'Dłuższe schłodzenie po dużej objętości przy progu.'),
        coolDown(6, 'Zroluj łydki, pasmo biodrowo-piszczelowe i pośladki.'),
      ],
    },
    {
      name: 'Półmaraton - Tempo startowe 2 x 20 minut',
      level: TrainingLevel.Intermediate,
      durationMinutes: 85,
      imageUrl: 'https://images.unsplash.com/photo-1552508744-1696d4464960',
      description: 'Dwa dwudziestominutowe odcinki dokładnie w docelowym tempie półmaratońskim, z 5 minutami truchtu między nimi. Trening specyficzny - uczy nogi rytmu, w którym pobiegniesz zawody, i pozwala przetestować sprzęt oraz odżywianie startowe.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(6, 'Ubierz się i obuj tak, jak planujesz na zawody - to również test sprzętu.'),
        jog(15, 'Spokojnie, bez wchodzenia w docelowe tempo przed czasem.'),
        {
          exercise: getEx('Bieg w tempie startowym (Race Pace Run)'),
          tempo: 'tempo półmaratonu',
          tip: 'Trzymaj tempo z dokładnością do 5 s/km. Weź żel po pierwszym odcinku - sprawdź, jak reaguje żołądek.',
          sets: timeSets(2, min(20), min(5)),
        },
        jog(12, 'Schłodzenie w tempie o minutę wolniejszym niż rozbieganie.'),
        coolDown(6, 'Zwróć uwagę na miejsca, które dawały o sobie znać - to sygnał, co poprawić przed startem.'),
      ],
    },
    {
      name: 'Półmaraton - Siła i stabilizacja biegacza',
      level: TrainingLevel.Intermediate,
      durationMinutes: 45,
      imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
      description: 'Trening uzupełniający 2 razy w tygodniu. Przy objętości półmaratońskiej to on decyduje, czy dobiegniesz do startu bez kontuzji. Nacisk na jednostronną siłę nóg, mięśnie odwodzące i stabilizację tułowia w zmęczeniu.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        {
          exercise: getEx('Skip A - wysokie kolana (A-Skip)'),
          tempo: 'rytmicznie',
          tip: 'Rozgrzewka i technika w jednym.',
          sets: timeSets(3, 30, 45, SetType.WarmUpSet),
        },
        {
          exercise: getEx('Skip C - uderzenia piętami o pośladki (C-Skip)'),
          tempo: 'rytmicznie',
          tip: 'Kolano zostaje pod biodrem - nie wyrzucaj go do przodu.',
          sets: timeSets(3, 30, 45, SetType.WarmUpSet),
        },
        {
          exercise: getEx('Rumuński Martwy Ciąg (Romanian Deadlift - RDL)'),
          tempo: '3-1-1-0',
          tip: 'Dwugłowe uda to najczęściej kontuzjowana grupa u biegaczy. Zejdź tylko tak nisko, jak pozwalają proste plecy.',
          sets: repSets(3, 10, 90, 40),
        },
        {
          exercise: getEx('Wykroki chodzone z hantlami (Walking Lunges)'),
          tempo: '2-0-1-0',
          tip: 'Utrzymuj tułów pionowo, kolano nad stopą.',
          sets: repSets(3, 12, 90, 10),
        },
        {
          exercise: getEx('Wspięcia na palce jednonóż (Single-Leg Calf Raise)'),
          tempo: '2-0-3-0',
          tip: 'Trzy sekundy w dół. Przy objętości półmaratońskiej to twoja polisa na ścięgno Achillesa.',
          sets: repSets(3, 20, 60),
        },
        {
          exercise: getEx('Deska bokiem (Side Plank)'),
          tempo: 'izometria',
          tip: 'Na każdą stronę. Silne mięśnie odwodzące zapobiegają opadaniu miednicy w końcówce długiego biegu.',
          sets: timeSets(3, 45, 45),
        },
        {
          exercise: getEx('Martwy robak (Dead Bug)'),
          tempo: '2-1-2-0',
          tip: 'Lędźwie przyklejone do maty przez cały ruch. Jeśli się odrywają - zmniejsz zakres.',
          sets: repSets(3, 12, 45),
        },
      ],
    },

    // ============================================================
    // ZESTAW: MARATON (42,2 KM)
    // ============================================================
    {
      name: 'Maraton - Długie wybieganie 150 minut',
      level: TrainingLevel.Advanced,
      durationMinutes: 165,
      imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
      description: 'Dwie i pół godziny w strefie 2 - ok. 28-32 km. Szczytowe długie wybieganie cyklu maratońskiego, wykonywane 3-4 razy w ostatnich 8 tygodniach przed startem, nie częściej. Ostatnie takie wybieganie zaplanuj minimum 3 tygodnie przed zawodami.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(6, 'Krótka mobilizacja - resztę zrobią pierwsze kilometry.'),
        {
          exercise: getEx('Długie wybieganie (Long Run)'),
          tempo: 'strefa 2',
          tip: 'Bez wyjątku wolno: 60-90 s/km wolniej niż tempo maratońskie. 60-90 g węglowodanów na godzinę i płyny co 20 minut - trening żołądka jest równie ważny jak trening nóg.',
          sets: timeSets(1, min(150), 300),
        },
        coolDown(10, 'Po 150 minutach nie kończ na siedząco. Marsz, rolowanie, posiłek z węglowodanami i białkiem w ciągu 30 minut.'),
      ],
    },
    {
      name: 'Maraton - Długie z akcentem maratońskim',
      level: TrainingLevel.Advanced,
      durationMinutes: 135,
      imageUrl: 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73',
      description: 'Osiemdziesiąt minut spokojnego biegu, a następnie trzydzieści minut w docelowym tempie maratońskim. Najbardziej specyficzna jednostka całego cyklu: uczy biec w tempie startowym na zmęczonych nogach i przy uszczuplonym glikogenie - dokładnie tak, jak wygląda 30. kilometr zawodów.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(6, 'Rozgrzej biodra - przed tobą ponad 2 godziny biegu.'),
        {
          exercise: getEx('Długie wybieganie (Long Run)'),
          tempo: 'strefa 2',
          tip: 'Trzymaj się spokojnego tempa. Kuszenie, żeby przyspieszyć wcześniej, zepsuje główną część treningu.',
          sets: timeSets(1, min(80), 60),
        },
        {
          exercise: getEx('Bieg w tempie startowym (Race Pace Run)'),
          tempo: 'tempo maratonu',
          tip: 'Płynne wejście w tempo, bez zrywu. Te 30 minut ma być równe - to symulacja końcówki maratonu.',
          sets: timeSets(1, min(30), 180),
        },
        jog(10, 'Nie zatrzymuj się gwałtownie po akcencie.'),
        coolDown(8, 'Najcięższy trening cyklu - zaplanuj po nim dzień wolny lub bardzo lekki trucht.'),
      ],
    },
    {
      name: 'Maraton - Bieg tempowy 40 minut',
      level: TrainingLevel.Advanced,
      durationMinutes: 80,
      imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8',
      description: 'Czterdziestominutowy odcinek w tempie progowym w środku 85-minutowej jednostki. Podnosi próg mleczanowy, dzięki czemu tempo maratońskie staje się dla organizmu relatywnie łatwiejsze. Jeden taki akcent w tygodniu wystarczy - reszta objętości ma być spokojna.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        warmUp(6, 'Pełna mobilizacja przed 40 minutami przy progu.'),
        jog(15, 'Stopniowe podnoszenie tętna.'),
        {
          exercise: getEx('Bieg tempowy - próg mleczanowy (Tempo Run)'),
          tempo: 'próg mleczanowy',
          tip: 'Ok. 15-20 s/km szybciej niż tempo maratońskie. Jeśli po 25 minutach tempo zaczyna spadać, skróć odcinek - to sygnał, że nie zregenerowałeś się po długim wybieganiu.',
          sets: timeSets(1, min(40), 180),
        },
        jog(12, 'Długie schłodzenie po dużym akcencie.'),
        coolDown(6, 'Rolowanie łydek i przodu ud.'),
      ],
    },
    {
      name: 'Maraton - Siła wytrzymałościowa i prehab',
      level: TrainingLevel.Advanced,
      durationMinutes: 50,
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b',
      description: 'Trening uzupełniający na wysokie zakresy powtórzeń, wykonywany 2 razy w tygodniu przez cały cykl maratoński. Przy 60-100 km tygodniowo to siłownia decyduje, czy staniesz na starcie zdrowy. Wieloskoki poprawiają ekonomię biegu, reszta to czysta profilaktyka urazów.',
      ownerId: 'public',
      status: 'published' as const,
      exerciseSeries: [
        {
          exercise: getEx('Rozgrzewka dynamiczna biegacza (Dynamic Warm-up)'),
          tempo: 'rozgrzewka',
          tip: 'Pełna mobilizacja przed plyometrią.',
          sets: timeSets(1, min(6), 60, SetType.WarmUpSet),
        },
        {
          exercise: getEx('Wieloskoki (Bounding)'),
          tempo: 'dynamicznie',
          tip: 'Tylko na miękkim podłożu i tylko gdy ścięgno Achillesa jest bezbolesne. Przy jakimkolwiek dyskomforcie pomiń to ćwiczenie.',
          sets: repSets(3, 10, 120),
        },
        {
          exercise: getEx('Przysiad bułgarski z hantlami (Bulgarian Split Squat)'),
          tempo: '3-0-1-0',
          tip: 'Wysokie powtórzenia z umiarkowanym ciężarem - budujemy wytrzymałość siłową, nie maksymalną siłę.',
          sets: repSets(3, 15, 90, 12),
        },
        {
          exercise: getEx('Rumuński Martwy Ciąg (Romanian Deadlift - RDL)'),
          tempo: '3-1-1-0',
          tip: 'Kontrolowane opuszczanie, plecy proste przez cały ruch.',
          sets: repSets(3, 12, 90, 45),
        },
        {
          exercise: getEx('Mostek biodrowy jednonóż (Single-Leg Glute Bridge)'),
          tempo: '2-1-1-0',
          tip: 'Na każdą nogę. Silny pośladek to mniejsze obciążenie kolana na 35. kilometrze.',
          sets: repSets(3, 15, 60),
        },
        {
          exercise: getEx('Wspięcia na palce jednonóż (Single-Leg Calf Raise)'),
          tempo: '2-0-3-0',
          tip: 'Do 25 powtórzeń na nogę. Łydka wykonuje w maratonie ok. 40 000 skurczów - musi być na to przygotowana.',
          sets: repSets(3, 25, 60),
        },
        {
          exercise: getEx('Deska bokiem (Side Plank)'),
          tempo: 'izometria',
          tip: 'Minuta na stronę. Utrzymaj biodra wysoko do ostatniej sekundy.',
          sets: timeSets(3, 60, 45),
        },
        {
          exercise: getEx('Martwy robak (Dead Bug)'),
          tempo: '2-1-2-0',
          tip: 'Powoli i kontrolowanie - to ćwiczenie kontroli, nie wytrzymałości.',
          sets: repSets(3, 14, 45),
        },
      ],
    },
  ];
};
