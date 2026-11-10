# Leniwa Kluska – Landing Page

Responsywny landing page aplikacji **Leniwa Kluska (Athlete SPA)** — w tym samym systemie wizualnym co aplikacja („Sztanga”): grafit i kreda, jeden akcent (ember), wąskie wersaliki w nagłówkach i kolory talerzy olimpijskich dla dziedzin.

---

## Design system

- **Tokeny** w `src/index.css` (`@theme`, Tailwind v4) odwzorowują ciemny motyw z `athlete-spa/src/globals.css`, przeliczony z HSL na OKLCH: `paper*` (tło / karta / secondary), `ink*` (kreda), `accent` (ember), `run` (niebieski), `food` (żółty), `volt` (zielony, „zrobione”), `social` (fiolet). Zmiana palety w aplikacji = zmiana tych wartości tutaj. Używaj wyłącznie nazwanych tokenów.
- **Typografia** jak w aplikacji: Barlow Condensed (nagłówki wersalikami — `.display`, `.h-section`, `.h-sub`; duże liczby — `.big`) + Figtree (tekst). `.num` to tylko cyfry o stałej szerokości.
- **Przyciski**: `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-light`, rozmiary `.btn-sm` / `.btn-lg` — zaokrąglony blok jak w aplikacji, nie pigułka.
- **Powierzchnie**: `.screen` (ekran aplikacji — prawdziwe UI, bez rysowanych ramek telefonu), `.stage-proof` (panel z ekranami etapu, podświetlony kolorem `--tone`), `.sheet` (jasna karta cennika), `.surface`.
- **Kolor etapu**: sekcja ustawia `--tone` (kolor swojego talerza); korzystają z niego `.plate`, `.bloom` i `.stage-proof`.

## Układ

Strona opowiada aplikację jako ładowanie sztangi: cztery etapy to cztery talerze (`src/lib/stages.ts`), a suma kilogramów rośnie od 20 do 160.

1. **Nawigacja** (`Navbar`) — nad hero zwykły wiersz, po przewinięciu pływający pasek z licznikiem kg; talerzyki przy linkach zapalają się po minięciu etapu.
2. **Hero** (`Hero` + `LoadBar`) — nagłówek, CTA i sztanga w SVG, którą odwiedzający sam ładuje (dwa talerze wchodzą same). Pod spodem trzy fakty i ticker „Zapisz. Pobij. Powtórz.”.
3. **Etapy** (`Stages`): **Trening** (25 kg), **Bieganie** (20 kg), **Jedzenie** (15 kg), **Nawyki** (10 kg) — każdy zaczyna się linią sztangi z dotychczasowymi talerzami i sumą, potem nagłówek, lista funkcji i panel z ekranami aplikacji (`AppScreens`). Po Treningu siedzi **Kalkulator talerzy** (`PlateCalcInteractive`).
4. **Trener** (`CoachStage`) — osobne pasmo bez talerza, w kolorze `social`.
5. **Wszystko, czego potrzebuje Twój tydzień** (`KeyFeatures`) — lista-specyfikacja zamiast siatki kart.
6. **Cennik** (`Pricing`) — jeden plan (0 zł) na jasnej karcie i trzy kroki na start.
7. **FAQ**, **CTA**, **stopka** (kolofon z linkami w jednym akapicie).

Wszystkie liczby wewnątrz ekranów aplikacji (ciężary, tempo, makro) to dane przykładowe.

## Zdjęcia

Kadry w `public/images/` to prawdziwe fotografie z [Unsplash](https://unsplash.com/license) (licencja pozwala na użycie komercyjne bez atrybucji), zapisane jako WebP: `hero-press` (hero), `grip-chalk` (Trening), `plates-floor` (kalkulator), `runners-dusk` (Bieganie), `meal-plate` (Dieta), `stairs-steps` (Nawyki), `coach-floor` (Trener), `deadlift-dark` (CTA), `gym-hall` (zapas dla nieużywanych sekcji). Nie dokładaj grafik generowanych — strona ma wyglądać jak siłownia, nie jak render. Sztanga jest motywem strony — w aplikacji dzień pokazuje lista „Cele dnia” (jej replika jest w etapie Nawyki).

Starsze komponenty (`StickyFeatures`, `Chapters`, `CardRail`, `Facts`, `CalcTeaser` i inne) zostały w `src/components`, ale nie są już podpięte w `App.tsx`.

---

## 🚀 Uruchomienie

### Z katalogu głównego projektu:
```bash
# Uruchomienie serwera developerskiego (port 5174)
npm run landing:dev

# Zbudowanie wersji produkcyjnej
npm run landing:build
```

### Z folderu `landing/`:
```bash
cd landing

# Uruchomienie deweloperskie
npm run dev

# Budowanie produkcyjne
npm run build

# Podgląd zbudowanej wersji
npm run preview
```

Serwer domyślnie startuje pod adresem: [http://localhost:5174](http://localhost:5174).
