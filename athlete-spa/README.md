# Leniwa Kluska: panel sportowca (athlete-spa)

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=flat-square&logo=capacitor&logoColor=white)
![Android](https://img.shields.io/badge/Android-app-3DDC84?style=flat-square&logo=android&logoColor=white)

Mobilna aplikacja sportowca: dziennik treningowy, bieganie z GPS i Stravą, dieta, pomiary i kontakt z trenerem. Ten sam kod działa jako **SPA/PWA w przeglądarce** i jako **aplikacja na Androida** (Capacitor).

To klient bez własnego backendu. Całe API, bazę danych i logikę serwerową dostarcza aplikacja Next.js z katalogu głównego repozytorium ([../README.md](../README.md)). Strony i hooki zostały przeniesione z panelu `/athlete` aplikacji webowej, dlatego wywołania `fetch('/api/...')` zastąpił `apiFetch` z `src/lib/api-client.ts`.

## Funkcje

- **Trening:** szablony, aktywny trening z timerem przerw i szkicem (`useWorkoutDraft`), historia, rekordy życiowe, kalkulator talerzy, biblioteka ćwiczeń
- **Bieganie:** nagrywanie trasy GPS także przy zgaszonym ekranie, sygnały głosowe interwałów, import aktywności ze Stravy, mapy tras (Mapbox), podsumowanie AI
- **Dieta:** dziennik posiłków, skaner kodów kreskowych, własne produkty i zapisane posiłki
- **Postępy:** pomiary ciała, wykresy, cele, nawyki, kalendarz, cotygodniowy check-in
- **Społeczność:** znajomi, statusy, czat z trenerem, grywalizacja (odznaki, wyzwania, ranking), udostępnianie celów i ćwiczeń (na Androidzie także do Instagrama)
- **Trenerzy:** katalog trenerów, panel trenera dla kont z rolą `trainer`
- **Strefa wiedzy** i mapa siłowni
- **Tryb offline:** ostatnio widziane dane są dostępne bez sieci, a zmiany czekają w kolejce na połączenie
- **Natywnie na Androidzie:** widżet ekranu głównego, powiadomienia push, kamera, geolokalizacja w tle

## Stack

| Obszar | Technologie |
| --- | --- |
| UI | React 19, Tailwind CSS 4, Radix UI, lucide-react, framer-motion |
| Build | Vite 8, TypeScript, alias `@` → `src` |
| Routing | React Router 7 w trybie **HashRouter** |
| Dane | SWR z trwałym cache w `localStorage` |
| Formularze | React Hook Form + Zod |
| Wykresy i kalendarz | Recharts, FullCalendar |
| Mapy | Mapbox GL (`react-map-gl`) |
| Skaner | `html5-qrcode` |
| Natywnie | Capacitor 8 (app, browser, camera, device, geolocation, push-notifications) + `@capgo/capacitor-widget-kit` |

## Szybki start

Wymagania: Node.js (LTS), npm i działający backend (patrz [../README.md](../README.md)).

```bash
cd athlete-spa
npm install
```

Utwórz `.env` (jest w `.gitignore`):

```env
VITE_API_URL="http://localhost:3001"
VITE_MAPBOX_TOKEN="pk...."
```

```bash
npm run dev      # http://localhost:5173 (inny port: PORT=...), dostępne też w sieci LAN
```

W backendzie `CORS_ORIGIN` musi zawierać origin SPA. Domyślnie to `http://localhost:5173`; adresy `localhost`, prywatne adresy LAN i `capacitor://*` są przepuszczane zawsze.

### Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
| --- | --- | --- |
| `VITE_API_URL` | tak | Adres backendu, bez końcowego `/`. Dokleja się do niego każdą ścieżkę `/api/...` i względne adresy mediów |
| `VITE_MAPBOX_TOKEN` | dla map | Token Mapbox: mapa siłowni i trasy biegowe |
| `VITE_VAPID_PUBLIC_KEY` | dla push w przeglądarce | Publiczny klucz VAPID. Odpowiada `VAPID_PUBLIC_KEY` z backendu. Bez niego Web Push jest wyłączony |
| `VITE_SITE_URL` | nie | Publiczny adres SPA wstawiany do tagów Open Graph w `index.html` podczas buildu (domyślnie `https://spa.sandbox-ai.pl`) |

Zmienne `VITE_*` trafiają do paczki JS, więc nie umieszczaj tu żadnych sekretów.

## Skrypty

| Komenda | Opis |
| --- | --- |
| `npm run dev` | Serwer deweloperski Vite |
| `npm run build` | Build produkcyjny do `dist/` |
| `npm run preview` | Podgląd zbudowanej wersji |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.app.json` (patrz uwaga niżej) |
| `npm run lint` | `eslint .` (patrz uwaga niżej) |
| `npm run generate:icons` | Generuje ikony Androida z `assets/` (wymaga ImageMagick) |
| `npm run generate:assets` | To samo + ekrany splash |
| `npm run cap:sync` | `npx cap sync`: kopiuje `dist/` i wtyczki do projektu Androida |
| `npm run cap:open:android` | Otwiera projekt w Android Studio |
| `npm run cap:run:android` | Uruchamia na urządzeniu lub emulatorze |
| `npm run cap:distribute:android` | Build + sync + `assembleRelease` + wysyłka do Firebase App Distribution |

## Jak to działa

### Łączność z backendem

`apiFetch` (`src/lib/api-client.ts`) dokleja `VITE_API_URL` do ścieżki i dołącza `Authorization: Bearer <token>`. Token leży w `localStorage` pod kluczem `athlete-spa:token`. Odpowiedź 401 gdziekolwiek w aplikacji czyści sesję (handler rejestruje `AuthContext`). Adresy mediów backend zwraca jako względne (`/api/images/<id>`), więc przed użyciem w `<img>` przepuszczaj je przez `resolveMediaUrl`.

### Logowanie

- **E-mail i hasło:** `POST /api/auth/token`, opcja „zapamiętaj mnie” wydłuża ważność tokenu. Konto trzeba aktywować linkiem z e-maila; są też rejestracja i reset hasła.
- **Tryb gościa:** `POST /api/auth/guest` wymienia identyfikator urządzenia na token i tworzy konto per urządzenie, więc dane gościa zapisują się w bazie. Wygasły token odnawia się po cichu. Funkcje wymagające pełnego konta (czat, check-in, społeczność) pokazują gościowi zachętę do założenia konta (`RequireFullAccount`).
- **Role:** panel trenera (`/athlete/trainer-panel`) jest dostępny tylko dla roli `trainer` (`RequireRole`).

### Routing

Aplikacja używa `HashRouter` (adresy `/#/athlete/dashboard`), bo działa tak samo w przeglądarce, PWA i WebView Capacitora, bez konfiguracji serwera. Stare linki ścieżkowe (zakładki, zainstalowane PWA, powiadomienia push) `main.tsx` przepisuje na hash. Domyślna trasa to `/athlete/dashboard`, a nieznane adresy wracają na nią.

### Wydajność

Każdy ekran to osobny chunk (`React.lazy`); eager ładuje się tylko Dashboard. `vite.config.ts` przypina ciężkie biblioteki do własnych paczek (`vendor-react`, `vendor-radix`, `vendor-charts`, `vendor-mapbox`, `vendor-scanner`, `vendor-forms` i kilka mniejszych), dzięki czemu mapy, wykresy i skaner nie trafiają do pierwszego ładowania.

### Offline

- `src/lib/swr-cache.ts` zapisuje udane odpowiedzi `/api/*` w `localStorage` (limit ~1,5 MB) i przywraca je przy starcie. Cache jest czyszczony przy wylogowaniu.
- `src/lib/offline-queue.ts` kolejkuje mutacje (`POST`, `PATCH`, `DELETE`), gdy nie ma sieci, i wysyła je po jej powrocie. Obiekty utworzone offline dostają tymczasowe id z prefiksem `offline-`.
- `src/lib/network-status.ts` wykrywa brak sieci także wtedy, gdy `navigator.onLine` kłamie (np. portal przechwytujący). Stan pokazuje `offline-banner`.

### Natywne mosty (Android)

Własne wtyczki Capacitora są w `android/app/src/main/java/com/athlete/spa/` i rejestrowane w `MainActivity`:

| Wtyczka | Plik JS | Po co |
| --- | --- | --- |
| `RunTracking` | `src/lib/run-tracking.ts` | Foreground service z GPS: nagrywanie biegu przy zgaszonym ekranie, powiadomienie na ekranie blokady. `NativeRunBridge` wraca do rekordera, gdy bieg wciąż trwa |
| `CueAudio` | `src/lib/cue-audio.ts` | Sygnały dźwiękowe (koniec przerwy, interwał) słyszalne w tle, z przyciszeniem muzyki zamiast jej pauzowania |
| `InstagramShare` | `src/lib/instagram-share.ts` | Udostępnianie obrazka do Story lub posta. Tylko Android |
| widżet (`SessionWidgetProvider`) | `src/lib/live-widget.ts` | Widżet ekranu głównego: aktywny trening lub bieg, statystyki tygodnia, najbliższe treningi |

Poza Androidem te moduły mają zamienniki w przeglądarce (np. `HTMLAudioElement` zamiast `CueAudio`) albo są wyłączone.

### Powiadomienia push

- **Android:** `@capacitor/push-notifications` (FCM). Wymaga `android/app/google-services.json`; bez niego build się powiedzie, ale push nie zadziała.
- **Przeglądarka / PWA:** Web Push przez `public/sw.js` i klucz `VITE_VAPID_PUBLIC_KEY`. Service worker przepisuje ścieżki z powiadomień na adresy z hashem.

### Stan jakości kodu

- `npm run typecheck` zgłasza obecnie 86 błędów typów (m.in. w `PublicProfileDialog`, `Goals`, `Log`, `workout-form`, `Habits`). `vite build` ich nie sprawdza, więc build przechodzi mimo nich.
- `npm run lint` nie działa: ESLint 10 wymaga płaskiej konfiguracji (`eslint.config.js`), a projekt jej nie ma.
- W `package.json` zostały zależności Leaflet, które nie są już importowane (mapy działają na Mapbox).

## Budowanie na Androida

Wymagania: Android SDK i JDK (np. przez Android Studio), a do wysyłki dodatkowo [Firebase CLI](https://firebase.google.com/docs/cli) z zalogowanym kontem.

```bash
npm run build          # zbuduj web do dist/
npm run cap:sync       # przenieś dist/ do projektu Androida
npm run cap:open:android
```

`cap:sync` kopiuje zawartość `dist/`, więc po każdej zmianie w kodzie web najpierw `npm run build`.

`npm run cap:distribute:android` robi całość jednym poleceniem i wysyła APK do Firebase App Distribution. Identyfikator aplikacji Firebase i lista testerów są wpisane na stałe w skrypcie w `package.json`; zmień je tam, jeśli wydajesz build komu innemu.

Dobrze wiedzieć:
- `applicationId` Androida to `com.athlete.spa` (`android/app/build.gradle`). `appId` w `capacitor.config.ts` (`leniwakluska.com`) jest inny i to `build.gradle` decyduje o paczce w APK.
- `versionName`/`versionCode` w `build.gradle` (`1.0` / `1`) są niezależne od `version` w `package.json`.
- Klucz podpisujący wydania (`android/release-key.jks`) i `google-services.json` nie są w repozytorium. `export_cert.sh` wyciąga z keystore certyfikat do wgrania w Google Play (ścieżka do `keytool` jest wpisana na stałe).

## Wdrożenie web

`npm run build` tworzy statyczny katalog `dist/`, który można wystawić z dowolnego hostingu plików. Dzięki `HashRouter` serwer nie potrzebuje reguł przepisywania ścieżek. `public/` zawiera `manifest.webmanifest` (PWA, `start_url` = `/#/athlete/dashboard`), `sw.js`, ikony i `og-image.jpg`. Ustaw `VITE_SITE_URL` na docelowy adres, żeby poprawnie zbudowały się linki Open Graph.

## Struktura projektu

```
athlete-spa/
├── src/
│   ├── main.tsx              HashRouter + migracja starych linków
│   ├── App.tsx               SWR, motyw, AuthProvider, definicje tras
│   ├── pages/                Login, Register, ForgotPassword + pages/athlete/* (jeden plik = jeden ekran)
│   ├── components/           ui/ (prymitywy), layouts/, workout/, running/, nutrition/, social/,
│   │                         dashboard/, gamification/, native-*-bridge.tsx, ...
│   ├── contexts/             AuthContext, ActiveWorkoutContext, UserProfileContext
│   ├── hooks/                useRunTracker, useRestTimer, useWorkoutDraft, usePullToRefresh, ...
│   ├── lib/                  api-client, swr-cache, offline-queue, cache-invalidation,
│   │                         run-tracking, cue-audio, live-widget, push, mapbox, ...
│   ├── models/types/         typy współdzielone z backendem
│   └── globals.css           motyw i tokeny Tailwinda
├── public/                   manifest PWA, service worker, ikony, og-image
├── assets/                   źródła ikon i splashy Androida
├── scripts/                  generate-android-icons.sh oraz narzędzia do bazy ćwiczeń (Python)
├── android/                  projekt Capacitor + własne wtyczki Java
├── capacitor.config.ts
├── vite.config.ts
└── index.html                meta tagi Open Graph i Twitter
```

## Dobre praktyki w tym projekcie

- Nowe ekrany dodawaj jako `React.lazy` w `App.tsx` i trzymaj w `src/pages/athlete/`.
- Do komunikacji z backendem używaj `apiFetch` lub hooków z `src/lib/db-hooks.tsx`, nigdy gołego `fetch`. Inaczej pominiesz token, obsługę 401 i kolejkę offline.
- Cache SWR unieważnia się sam: każdy udany zapis (nie-GET) przez `apiFetch` odświeża widoczne klucze i wyrzuca nieużywane (`src/lib/cache-invalidation.ts`). Ręcznie niczego nie trzeba wywoływać.
- Kod specyficzny dla Androida chroń sprawdzeniem `Capacitor.isNativePlatform()` lub funkcjami `is…Available()` z odpowiednich modułów `lib/`.
- Interfejs jest w całości po polsku i domyślnie ciemny (`next-themes`, `defaultTheme="dark"`).
