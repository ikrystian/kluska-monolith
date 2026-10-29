# Leniwa Kluska – Landing Page

Responsywny landing page aplikacji **Leniwa Kluska (Athlete SPA)** — ciemny, powściągliwy styl (modern-minimal) z pomarańczowym akcentem marki.

---

## Design system

- **Tokeny** w `src/index.css` (`@theme`, Tailwind v4): kolory w OKLCH — grafitowa strona (`paper`, `paper-2`, `paper-3`), ciemne ekrany aplikacji (`screen`, `screen-2`), jasne karty list (`sheet*`), akcent marki `accent` (ember) i `volt` (tylko sygnał „zrobione / rekord”). Używaj wyłącznie nazwanych tokenów.
- **Typografia**: Space Grotesk (nagłówki, liczby `.num`) + Geist (tekst).
- **Przyciski**: pigułki `.btn` + `.btn-primary` / `.btn-light` / `.btn-ghost`, rozmiary `.btn-sm` / `.btn-lg`.
- **Powierzchnie**: `.sheet` (jasna karta na ciemnej stronie), `.screen` (ekran aplikacji — prawdziwe UI, bez rysowanych ramek telefonu), `.surface`, `.receipt` (paragon w cenniku).
- **Poziome listy**: `CardRail` + `RailCard` (`.rail` w CSS) — przewijane ze snapem, wyrównane do lewej krawędzi kontenera.

## Układ

Struktura strony wzorowana na evolvetrainingapp.com (układ i sposób prezentacji treści; kolory, kroje i teksty są Kluski).

1. **Nawigacja** (`Navbar`) — wyśrodkowany znak, pod nim linki; na telefonie zwykły pasek z menu.
2. **Hero** (`Hero`) — lewostronny nagłówek w wyśrodkowanej kolumnie, wokół rozsypane fragmenty aplikacji (od `xl`; niżej zawijany rząd).
3. **Zajrzyj do środka** (`StickyFeatures`) — przypięty ekran w środku i sześć opisów po bokach, podświetlanych podczas przewijania (od `lg`); na mniejszych ekranach ta sama treść jako przewijana lista kart.
4. **Teaser kalkulatora** (`CalcTeaser`) i **Fakty** (`Facts`) — trzy liczby, które produkt sam o sobie podaje (bez liczników użytkowników).
5. **Rozdziały** (`Chapter` + `Chapters`): **Trening**, **Bieganie**, **Dieta**, **Trener** — duży nagłówek (ze zdjęciem lub bez) i lista kart z funkcjami. Między Treningiem a Bieganiem siedzi **Kalkulator talerzy** (`PlateCalcInteractive`).
6. **Wszystko, czego potrzebuje Twój tydzień** (`KeyFeatures`) — siatka ikon z krótkimi opisami.
7. **Cennik** (`Pricing`) — jeden plan (0 zł) jako paragon i trzy kroki na start.
8. **FAQ**, **CTA**, **stopka** (hasło + trzy grupy linków).

Wszystkie liczby wewnątrz ekranów aplikacji (ciężary, tempo, makro) to dane przykładowe.

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
