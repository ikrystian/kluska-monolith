# Kluska Athlete SPA

Single Page Application dla modułu Athlete aplikacji Leniwa Kluska.

## Wymagania

- Node.js 18+
- npm 9+
- Działający backend Next.js na porcie 3000

## Instalacja

```bash
# Zainstaluj zależności
npm install

# Utwórz plik .env na podstawie .env.example
cp .env.example .env

# Uruchom w trybie deweloperskim
npm run dev
```

## Budowanie produkcyjne

```bash
npm run build
npm run preview
```

## Struktura projektu

```
src/
├── api/           # Warstwa komunikacji z API
├── components/    # Komponenty React
│   ├── layout/    # Komponenty layoutu
│   └── ui/        # Komponenty shadcn/ui
├── config/        # Konfiguracja środowiskowa
├── contexts/      # React Contexts
├── lib/           # Utilities
├── pages/         # Strony aplikacji
│   ├── athlete/   # Strony modułu athlete
│   └── auth/      # Strony autentykacji
└── types/         # TypeScript types
```

## Dostępne endpointy

Aplikacja jest skonfigurowana do komunikacji z backendem Next.js przez proxy:
- `/api/*` -> `http://localhost:3000/api/*`

## Technologie

- React 19
- Vite
- TypeScript
- TailwindCSS 4
- React Router v7
- TanStack Query
- shadcn/ui
- Zustand (state management)
- axios (HTTP client)

## Rozwój

Szczegółowy plan dalszego rozwoju znajduje się w pliku [PLAN.md](./PLAN.md).
