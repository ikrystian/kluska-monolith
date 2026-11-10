# Leniwa Kluska – Landing Page

Responsywny landing page aplikacji **Leniwa Kluska (Athlete SPA)**. Strona jest plakatem z jedną tezą — **„Nie czekaj do stycznia”** — złożonym z pełnych pól koloru (grafit, ember, kreda), ciężkich wąskich wersalików i prawdziwych zdjęć.

---

## Kampania noworoczna (przełącza się sama)

Logika siedzi w `src/lib/season.ts`:

- **październik–grudzień**: pasek nad nawigacją, odliczanie do 1 stycznia w hero, nagłówek „Nie czekaj do stycznia.”, a planer pokazuje przyszły rok plus „przewagę” — dni, które zostały do sylwestra.
- **styczeń–wrzesień**: bez paska, hero pokazuje dzień roku (np. 41/365), nagłówek zmienia się na „Nie czekaj do poniedziałku.”, a planer liczy to, co zostało z bieżącego roku.

Nic nie trzeba wyłączać po Nowym Roku.

## Design system

- **Tokeny** w `src/index.css` (`@theme`, Tailwind v4) — te same wartości co ciemny motyw aplikacji (`paper*`, `ink*`, `accent`, kolory dziedzin `run` / `food` / `volt` / `social`) oraz jasne pole `sheet*`. Używaj wyłącznie nazwanych tokenów.
- **Typografia**: Barlow Condensed 800 wersalikami (`.display`, `.h-section`, `.h-sub`, liczby `.big`) + Figtree (tekst).
- **Przyciski**: `.btn` z etykietą wersalikami + `.btn-primary` (ember) / `.btn-ghost` (obrys, na zdjęcia i grafit) / `.btn-ink` (grafit, na ember i kredę) / `.btn-on-ember`; rozmiary `.btn-sm` / `.btn-lg`.
- **Pola koloru**: `.on-ember` (pełny ember, ciemny tekst), `.sheet` (kreda), oba z `.grain` (ziarno druku). Ekrany aplikacji (`.screen`) zostają zaokrąglone jak w apce — kontrastują z ostrą siatką strony.

## Animacje

Celowo jest ich kilka, każda coś znaczy — **nie dodawaj fade-up do każdej sekcji**:

1. **Hero** — zdjęcie „siada”, wiersze nagłówka wyjeżdżają z maski, odliczanie tyka (CSS, bez JS).
2. **Manifest** (`Manifesto`) — czytany scrollem: słowa dochodzą do pełnej czerni w miarę przewijania (`useReadProgress`).
3. **Planer roku** (`YearPlan`) — fala wypełniająca kratki i licznik treningów; reaguje na przełączniki.
4. **Zdjęcia** — odsłaniane kurtyną raz, przy wejściu w kadr (`reveal(0, 'curtain')`).
5. **Ekrany aplikacji** — paski, pierścienie i ptaszki wypełniają się po wejściu w kadr (`reveal(0, 'live')` + klasy `.fill`, `.ring-arc`, `.pop`).

Wszystko respektuje `prefers-reduced-motion` (treść jest wtedy od razu w stanie końcowym).

## Układ

1. **Pasek kampanii + nawigacja** (`Navbar`) — pasek odjeżdża ze stroną, belka zostaje i po przewinięciu dostaje tło.
2. **Hero** (`Hero` + `Countdown`) — jedno zdjęcie, jedno zdanie, jeden zegar.
3. **Manifest** (`Manifesto`) — pole ember.
4. **Planer roku** (`YearPlan`, `#rok`) — pole kredy: ile razy w tygodniu, start dziś czy 1 stycznia, kalendarz roku w kratkach. Liczby to zwykła arytmetyka kalendarza danego roku.
5. **Trening** (pas zdjęcia z hasłem), **Kalkulator talerzy**, **Bieganie** (zdjęcie jako tło całej sekcji), **Jedzenie** (zdjęcie ze skanerem na rogu), **Nawyki** (tryptyk), **Trener** (split) — każda sekcja ma inną kompozycję (`Stages`).
6. **Indeks reszty funkcji** (`KeyFeatures`), **Cennik** (pole kredy, „0 zł”), **FAQ**, **CTA** (pole ember ze zdjęciem w duotonie), **stopka** w jednym wierszu.

Wszystkie liczby wewnątrz ekranów aplikacji (ciężary, tempo, makro) to dane przykładowe.

## Zdjęcia

Kadry w `public/images/` to prawdziwe fotografie z [Unsplash](https://unsplash.com/license) (licencja pozwala na użycie komercyjne bez atrybucji), zapisane jako WebP: `hero-press` (hero), `grip-chalk` (Trening), `plates-floor` (kalkulator), `runners-dusk` (Bieganie), `meal-plate` (Dieta), `stairs-steps` (Nawyki), `coach-floor` (Trener), `deadlift-dark` (CTA), `gym-hall` (zapas dla nieużywanych sekcji). Nie dokładaj grafik generowanych — strona ma wyglądać jak siłownia, nie jak render. W aplikacji dzień pokazuje lista „Cele dnia” (jej replika jest w sekcji Nawyki).

Starsze komponenty (`LoadBar`, `StickyFeatures`, `Chapters`, `CardRail`, `Facts`, `CalcTeaser` i inne) zostały w `src/components`, ale nie są już podpięte w `App.tsx`.

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
