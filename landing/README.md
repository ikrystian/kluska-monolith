# Leniwa Kluska – Landing Page

Responsywny landing page aplikacji **Leniwa Kluska (Athlete SPA)** — ciemny, powściągliwy styl (modern-minimal) z pomarańczowym akcentem marki.

---

## Design system

- **Tokeny** w `src/index.css` (`@theme`, Tailwind v4): kolory w OKLCH (`paper`, `ink`, `muted`, `rule`, `accent`, `signal`, kolory talerzy), domyślna paleta Tailwinda jest wyłączona — używaj wyłącznie nazwanych tokenów (`bg-paper-2`, `text-muted`, `border-rule`…).
- **Typografia**: Geist (nagłówki i tekst) + Geist Mono (liczby i dane, zawsze z `tnum`).
- **Przyciski**: `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost`, rozmiary `.btn-sm` / `.btn-lg`.
- **Panele UI**: `.panel` — podglądy ekranów aplikacji budowane jako prawdziwe UI, bez rysowanych ramek telefonu.

## Sekcje

1. **Hero** — hasło, CTA rejestracji, podgląd trwającego treningu, przycisk audio Ronniego Colemana.
2. **Pasek cech** — offline, Strava, Android/PWA, skaner kodów.
3. **Funkcje** (`FeatureSimulator`) — przyklejony opis po lewej + przewijane panele: dziennik z działającym stoperem przerwy, bieg z GPS, dieta i makro, check-in z trenerem. Na mobile sekcje układają się jedna pod drugą.
4. **Kalkulator talerzy** — wpisywanie ciężaru, presety, gryf 20/15 kg, informacja gdy ciężaru nie da się złożyć dokładnie.
5. **Pozostałe funkcje** (`MoreFeatures`) — grywalizacja, wyzwania, nawyki, atlas, postępy, kalendarz, społeczność, mapa siłowni, strefa wiedzy, hype audio.
6. **Dla trenerów** (`CoachSection`) — podgląd listy podopiecznych i link do panelu trenera.
7. **Cennik** — przełącznik miesięcznie/rocznie, trzy plany.
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
