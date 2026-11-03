# Leniwa Kluska

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=flat-square&logo=mongodb&logoColor=white)

Platforma treningowa dla sportowców, trenerów i administratorów: dziennik treningowy z progresją, bieganie z GPS i Stravą, dieta i makro, kontakt z trenerem, grywalizacja i społeczność.

To repozytorium zawiera **backend + aplikację webową** (Next.js) oraz dwie dołączone aplikacje klienckie: mobilny panel sportowca ([`athlete-spa`](athlete-spa)) i stronę produktową ([`landing`](landing)).

## Co jest w repozytorium

| Katalog | Co to jest | Stack | Dokumentacja |
| --- | --- | --- | --- |
| `/` (`src`) | Aplikacja webowa i **API** dla wszystkich klientów. Panele: sportowiec, trener, admin | Next.js 16 (App Router), Mongoose, NextAuth | ten plik |
| [`athlete-spa`](athlete-spa) | Panel sportowca jako SPA i aplikacja na Androida | Vite, React Router, Capacitor | [athlete-spa/README.md](athlete-spa/README.md) |
| [`landing`](landing) | Strona produktowa | Vite, Tailwind v4 | [landing/README.md](landing/README.md) |
| `scripts` | Seedy bazy i narzędzia do bazy ćwiczeń (TS + Python) | tsx, Python 3 | [niżej](#skrypty-bazy-i-ćwiczeń) |

### Architektura

```
 przeglądarka (panel web)          athlete-spa (PWA / Android)
          │  sesja NextAuth (cookie)         │  Bearer JWT + CORS
          ▼                                  ▼
 ┌───────────────────────────────────────────────────────────┐
 │  Next.js  ·  src/app/api/*  ·  src/middleware.ts (CORS)   │
 └───────────────┬───────────────────────────┬───────────────┘
                 ▼                           ▼
          MongoDB (Mongoose)      zewnętrzne usługi: Strava, Spotify,
                                  FatSecret, OpenRouter, Gemini, SMTP,
                                  Web Push / FCM
```

Aplikacja webowa woła API tą samą domeną i korzysta z ciasteczka sesji NextAuth. `athlete-spa` działa na innym origin, więc loguje się przez `POST /api/auth/token` (lub `POST /api/auth/guest`) i dołącza nagłówek `Authorization: Bearer <JWT>`. Middleware `src/middleware.ts` dokłada nagłówki CORS tylko dla `/api/*`.

## Funkcje

**Sportowiec** (`/athlete/*`)
- Dziennik treningowy: szablony, serie z progresją, rekordy życiowe, historia, kalendarz zaplanowanych treningów
- Biblioteka ćwiczeń (PL) z animacjami, instrukcjami i grupami mięśniowymi
- Bieganie: nagrywanie trasy GPS, programy na 5 km / 10 km / półmaraton / maraton, import ze Stravy, podsumowanie sesji generowane przez AI
- Dieta i makro: dziennik posiłków, baza produktów (FatSecret, Open Food Facts), własne produkty, zapisane posiłki
- Pomiary ciała, cele, nawyki, cotygodniowe check-iny
- Grywalizacja: poziomy, odznaki, wyzwania, nagrody, ranking
- Społeczność: znajomi, statusy, feed celów, czat
- Strefa wiedzy (artykuły) i mapa siłowni

**Trener** (`/trainer/*`): podopieczni i ich statystyki, plany treningowe i diety, ankiety, zapytania od sportowców, wizytówka, czat, harmonogram.

**Administrator** (`/admin/*`): użytkownicy, ćwiczenia, siłownie, plany, artykuły i kategorie, odznaki, programy biegowe, powiadomienia, ustawienia globalne, podgląd logów treningowych.

## Stack

- **Framework:** [Next.js](https://nextjs.org/) 16 (App Router, Turbopack), React 19
- **Język:** TypeScript 5.9
- **UI:** Tailwind CSS 4, Radix UI, lucide-react, framer-motion, Recharts, FullCalendar, Leaflet
- **Dane:** MongoDB + Mongoose 9 (modele w `src/models`)
- **Auth:** NextAuth 4 (credentials) + własne JWT dla klientów mobilnych (`src/lib/jwt.ts`)
- **Formularze:** React Hook Form + Zod
- **AI:** Google Genkit (Gemini) i OpenRouter (podsumowania biegów, rozpoznawanie posiłków, tłumaczenia)
- **Powiadomienia:** Web Push (VAPID), Firebase Admin (FCM), Nodemailer (e-mail)
- **PWA:** `@ducanh2912/next-pwa`

## Szybki start

### Wymagania

- [Node.js](https://nodejs.org/) (LTS) i npm
- MongoDB: lokalna instancja lub Atlas
- Opcjonalnie Docker, do lokalnego serwera SMTP (Mailpit)

### Instalacja

```bash
git clone https://github.com/ikrystian/kluska-monolith.git
cd kluska-monolith
npm install
```

### Konfiguracja

Utwórz plik `.env` w katalogu głównym (jest w `.gitignore`; `.env.example` nie istnieje). Minimum do uruchomienia:

```env
MONGO_DB_URI="mongodb://localhost:27017/kluska-monolith"
NEXTAUTH_SECRET="dowolny-dlugi-losowy-ciag"
NEXTAUTH_URL="http://localhost:3001"
CORS_ORIGIN="http://localhost:5173"
```

Aplikacja waliduje środowisko przy starcie (`src/lib/env.ts`): `MONGO_DB_URI` musi być poprawnym URL-em, a `NEXTAUTH_SECRET` niepusty.

### Uruchomienie

```bash
npm run dev          # http://localhost:3001 (nasłuchuje na 0.0.0.0)
```

Opcjonalnie, żeby działały e-maile aktywacyjne i resetu hasła bez prawdziwego SMTP:

```bash
docker compose up -d   # Mailpit: SMTP :1025, podgląd wiadomości http://localhost:8025
```

i w `.env`: `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SECURE=false`, `SMTP_FROM=...`.

### Dane startowe

```bash
npm run db:seed          # UWAGA: najpierw CZYŚCI kolekcje (users, exercises, workouts, gyms, ...)
npm run db:seed:running  # bezpieczny: tylko dokłada/aktualizuje ćwiczenia i szablony biegowe
npm run db:seed:running -- --dry-run   # podgląd zmian bez zapisu
```

`db:seed` wywołuje `deleteMany({})` na kolekcjach bazy wskazanej w `MONGO_DB_URI` (a gdy zmienna nie jest ustawiona, łączy się z `mongodb://localhost:27017/kluska-monolith`). Nie uruchamiaj go na bazie z prawdziwymi danymi.

## Zmienne środowiskowe

| Zmienna | Wymagana | Do czego |
| --- | --- | --- |
| `MONGO_DB_URI` | tak | Połączenie z MongoDB (`DATABASE_URL` jest akceptowane jako zapasowe w `prisma.config.ts`) |
| `NEXTAUTH_SECRET` | tak | Sekret NextAuth |
| `NEXTAUTH_URL` | zalecana | Publiczny adres aplikacji (linki w e-mailach, callbacki OAuth) |
| `APP_URL`, `NEXT_PUBLIC_SITE_URL` | nie | Adres używany w e-mailach i metadanych Open Graph |
| `CORS_ORIGIN` | nie | Lista origin oddzielona przecinkami, z których `athlete-spa` może wołać API (domyślnie `http://localhost:5173`). Zawsze przepuszczane: `localhost`, adresy prywatnych sieci LAN i `capacitor://*` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | nie | Wysyłka e-maili (aktywacja konta, reset hasła) |
| `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | nie | Integracja ze Stravą |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | nie | Integracja ze Spotify |
| `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET` | nie | Wyszukiwarka produktów FatSecret |
| `OPEN_ROUTER_API_KEY` | nie | AI przez OpenRouter (podsumowania biegów, posiłki) |
| `GEMINI_API_KEY` | nie | Genkit / Gemini |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | nie | Web Push dla PWA (publiczny klucz trafia też do `athlete-spa` jako `VITE_VAPID_PUBLIC_KEY`) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` / `GOOGLE_APPLICATION_CREDENTIALS` | nie | Firebase Admin (powiadomienia push FCM na Androida) |
| `NEXT_PUBLIC_PLAY_STORE_URL`, `NEXT_PUBLIC_APP_STORE_URL` | nie | Linki do sklepów w interfejsie |
| `OPENGYM_EXERCISES_JSON_PATH` | nie | Ścieżka do pliku z bazą ćwiczeń przy imporcie OpenGym |

Funkcje zależne od brakującej integracji po prostu nie będą działać; reszta aplikacji startuje normalnie.

## Skrypty

| Komenda | Opis |
| --- | --- |
| `npm run dev` | Serwer deweloperski (Turbopack, port 3001) |
| `npm run build` | Build produkcyjny |
| `npm start` | Serwer produkcyjny |
| `npm run lint` | `next lint` (obecnie nie działa, patrz uwaga niżej) |
| `npm run typecheck` | `tsc --noEmit` (patrz uwaga niżej) |
| `npm run db:seed` | Seed bazy, **czyści dane** (patrz wyżej) |
| `npm run db:seed:running` | Dokłada programy i ćwiczenia biegowe |
| `npm run landing:dev` / `landing:build` | Strona produktowa (`landing`) |

**Stan jakości kodu**
- `next.config.ts` ma `typescript.ignoreBuildErrors: true`, więc `npm run build` **nie wyłapie** błędów typów.
- `npm run typecheck` zgłasza dziś ok. 217 błędów w `src/`. Dodatkowo `tsconfig.json` obejmuje `**/*.ts(x)`, czyli także `athlete-spa/` (z aliasem `@` wskazującym na `src/` roota), co dokłada kilkaset fałszywych błędów. Błędy z `athlete-spa` sprawdzaj w jego własnym katalogu (`npm run typecheck` tam).
- `npm run lint` nie działa: Next.js 16 usunął `next lint`, a skrypt traktuje „lint” jak katalog projektu. Do naprawy przejściem na ESLint CLI.

## Struktura projektu

```
src/
├── app/
│   ├── (athlete)/athlete/   panel sportowca (web)
│   ├── (trainer)/trainer/   panel trenera
│   ├── (admin)/admin/       panel administratora
│   ├── api/                 API: auth, athlete, trainer, admin, social, gamification,
│   │                        strava, spotify, fatsecret, push, upload, db/[collection], ...
│   └── login, register, verify-email, reset-password, regulamin, ...
├── components/              komponenty UI (admin, trainer, workout, running, social, ui/ ...)
├── models/                  modele Mongoose (User, Workout, WorkoutLog, RunningSession, ...)
├── lib/                     auth, jwt, mongodb, e-mail, web-push, integracje, gamifikacja
├── ai/                      konfiguracja Genkit
├── contexts/  hooks/  types/
└── middleware.ts            CORS dla /api/*
athlete-spa/                 panel sportowca: SPA + Android (osobny package.json)
landing/                     strona produktowa (osobny package.json)
scripts/                     seedy i narzędzia do bazy ćwiczeń
upload-data/                 lokalne pliki wgrywane przez /api/upload (poza gitem)
docker-compose.yml           Mailpit do testowania e-maili
```

Każda aplikacja (`/`, `athlete-spa`, `landing`) ma własny `package.json` i własne `node_modules`; zależności instaluje się osobno w każdym katalogu.

## Uwierzytelnianie

- **Web:** NextAuth (provider credentials), sesja w ciasteczku. Rejestracja wymaga potwierdzenia adresu e-mail (`/api/auth/verify-email`), jest też reset hasła.
- **Klienci mobilni / SPA:** `POST /api/auth/token` zwraca JWT (z opcją `rememberMe`), a `POST /api/auth/guest` tworzy lub wznawia konto gościa powiązane z identyfikatorem urządzenia. Obie ścieżki używają tej samej weryfikacji danych co NextAuth (`src/lib/auth.ts`).
- **Role:** `athlete`, `trainer`, `admin` (pole `role` w modelu `User`); każda rola ma własną route group i layout.

## Skrypty bazy i ćwiczeń

Katalog `scripts/`:

- `seed.ts`, `seed-running.ts`: seedy opisane wyżej; dane w `scripts/data` (programy biegowe, `opengym-exercises-pl.json`).
- `translate_exercises.py` (+ `run_translation.sh`): tłumaczy ćwiczenia w kolekcji `exercises` na polski przez OpenRouter, rekord po rekordzie, oznaczając je `translated: true`. Wymaga `OPEN_ROUTER_API_KEY` i `MONGO_DB_URI` w `.env`.
- `exercise.py`: wyciąga ćwiczenia ze zrzutów ekranu (`scripts/screens`, przetworzone trafiają do `scripts/old`) modelem wizyjnym przez OpenRouter.
- `import-deltoides-gifs.py`: jednorazowy import paczki GIF-ów jako publicznych ćwiczeń (pliki trafiają do GridFS).

```bash
python3 -m venv .venv && .venv/bin/pip install -r scripts/requirements.txt
./scripts/run_translation.sh
```

## CI/CD

`.github/workflows/deploy.yml` przy każdym pushu na `main` wysyła do zewnętrznego webhooka listę URL-i commitów (`projectId`, repozytorium, gałąź, autor). Workflow niczego nie buduje ani nie testuje; wdrożeniem zajmuje się odbiorca webhooka.

## Konwencje

- Commity w stylu Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`
- Interfejs i komunikaty użytkownika po polsku
- Nowe zmienne środowiskowe dopisuj do tabeli powyżej

## Licencja

Repozytorium jest prywatne (`"private": true`) i nie zawiera pliku licencji.
