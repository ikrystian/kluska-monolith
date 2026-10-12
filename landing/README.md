# Leniwa Kluska – Landing Page

Responsywny landing page aplikacji **Leniwa Kluska (Athlete SPA)** — ciemny, powściągliwy styl (modern-minimal) z pomarańczowym akcentem marki.

---

## Design system

- **Tokeny** w `src/index.css` (`@theme`, Tailwind v4): kolory w OKLCH — jasne tło (`paper`, `card`), ciemna „scena” na UI aplikacji (`night*`), akcent marki `accent` (ember) i `volt` (tylko na ciemnych powierzchniach). Używaj wyłącznie nazwanych tokenów.
- **Typografia**: Space Grotesk (nagłówki, liczby `.num`) + Inter (tekst) — te same kroje co w aplikacji.
- **Przyciski**: pigułki `.btn` + `.btn-primary` / `.btn-dark` / `.btn-ghost`, rozmiary `.btn-sm` / `.btn-lg`.
- **Powierzchnie**: `.card` (jasny kafel), `.stage` (ciemny panel), `.ui` (ekran aplikacji na ciemnym panelu) — prawdziwe UI, bez rysowanych ramek telefonu.

## Sekcje

1. **Hero** — hasło, CTA, obietnice (za darmo, offline, Strava, Android/iPhone), podgląd trwającego treningu.
2. **Cztery aplikacje → jedna** (`ReplaceStrip`).
3. **Korzyści** (`Benefits`) — bento: offline, bieg z GPS/Strava, progresja, skaner kodów, seria dni, widżet na ekranie blokady, muzyka + Ronnie, nawyki, atlas, trener.
4. **Zajrzyj do środka** (`FeatureSimulator`) — zakładki trening / bieganie / dieta / trener z działającym stoperem.
5. **Kalkulator talerzy** (`PlateCalcInteractive`).
6. **Dla trenerów** (`CoachSection`).
7. **Cennik + jak zacząć** (`Pricing`) — 0 zł i trzy kroki.
8. **FAQ**, **CTA**, **stopka**.

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
