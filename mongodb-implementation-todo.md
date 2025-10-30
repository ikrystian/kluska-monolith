# TODO: Implementacja MongoDB dla GymProgress

## 📋 Lista zadań do implementacji systemu opartego na MongoDB

---

## 🛠️ 1. KONFIGURACJA PODSTAWOWA

### 1.1 Środowisko i zależności
- [x] Skonfigurować zmienne środowiskowe w `.env.local`:
  ```env
  MONGODB_URI=mongodb://localhost:27017/gymprogressnext
  MONGODB_DB=gymprogressnext
  NEXTAUTH_URL=http://localhost:9002
  NEXTAUTH_SECRET=your-secret-key
  GOOGLE_GENAI_API_KEY=your-genai-key
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
  UPLOAD_DIR=./uploads
  MAX_FILE_SIZE=10485760
  ```

### 1.2 Konfiguracja NextAuth.js
- [x] Utworzyć plik `src/app/api/auth/[...nextauth]/route.ts`
- [x] Skonfigurować Credentials Provider z MongoDB
- [x] Dodać MongoDB Adapter do NextAuth
- [x] Ustawić session strategy na JWT
- [x] Skonfigurować callbacks (jwt, session)

### 1.3 Połączenie z MongoDB
- [x] Utworzyć `src/lib/mongodb.ts` - connection helper
- [x] Dodać funkcję `connectToDatabase()`
- [x] Skonfigurować connection pooling
- [x] Dodać error handling dla połączeń

---

## 🗄️ 2. MODELE DANYCH (MONGOOSE SCHEMAS)

### 2.1 Model User
- [x] Utworzyć `src/models/User.ts`
- [x] Zdefiniować schema z polami: name, email, password, role, location, socialLinks, trainerId, favoriteGymIds
- [x] Dodać indexes (email unique)
- [x] Dodać pre-save middleware dla hashowania hasła
- [x] Dodać metody instancji (comparePassword)

### 2.2 Model Exercise
- [x] Utworzyć `src/models/Exercise.ts`
- [x] Schema: name, muscleGroup, description, image, imageHint, ownerId, type
- [x] Index po muscleGroup i ownerId
- [x] Walidacja typu ćwiczenia

### 2.3 Model WorkoutLog
- [x] Utworzyć `src/models/WorkoutLog.ts`
- [x] Schema: endTime, workoutName, duration, exercises, photoURL, athleteId, status, startTime, feedback
- [x] Index po athleteId i endTime (descending)
- [x] Walidacja struktury exercises

### 2.4 Model WorkoutPlan
- [x] Utworzyć `src/models/WorkoutPlan.ts`
- [x] Schema: name, description, trainerId, assignedAthleteIds, workoutDays
- [x] Index po trainerId
- [x] Walidacja workoutDays structure

### 2.5 Model Article
- [x] Utworzyć `src/models/Article.ts`
- [x] Schema: title, content, authorId, authorName, category, createdAt, updatedAt, status, coverImageUrl, imageHint
- [x] Index po authorId, category, status
- [x] Walidacja statusu (published/draft)

### 2.6 Model Conversation & Message
- [x] Utworzyć `src/models/Conversation.ts`
- [x] Schema: participants, trainerId, athleteId, trainerName, athleteName, lastMessage, updatedAt, unreadCount
- [x] Utworzyć `src/models/Message.ts`
- [x] Schema: conversationId, senderId, text, createdAt
- [x] Indexes dla efektywnych queries

### 2.7 Model BodyMeasurement
- [x] Utworzyć `src/models/BodyMeasurement.ts`
- [x] Schema: ownerId, date, weight, circumferences, photoURLs, sharedWithTrainer
- [x] Index po ownerId i date

### 2.8 Model RunningSession
- [x] Utworzyć `src/models/RunningSession.ts`
- [x] Schema: date, distance, duration, avgPace, notes, ownerId
- [x] Index po ownerId i date

### 2.9 Model Goal
- [x] Utworzyć `src/models/Goal.ts`
- [x] Schema: title, target, current, unit, deadline, ownerId
- [x] Index po ownerId

### 2.10 Model MuscleGroup & Gym
- [x] Utworzyć `src/models/MuscleGroup.ts`
- [x] Utworzyć `src/models/Gym.ts`
- [x] Podstawowe schemas z odpowiednimi polami

---

## 🔌 3. API ROUTES

### 3.1 Generic Database API
- [x] Utworzyć `src/app/api/db/[collection]/route.ts`
- [x] Implementować GET (lista), POST (create)
- [x] Dodać filtrowanie query parameters (owner, trainerId, athleteId, category, status)
- [x] Dodać paginację (limit, skip)
- [x] Autoryzacja na poziomie kolekcji

### 3.2 Single Document API
- [x] Utworzyć `src/app/api/db/[collection]/[id]/route.ts`
- [x] Implementować GET, PUT, DELETE
- [x] Walidacja ownership i uprawnień
- [x] Error handling i status codes

### 3.3 Authentication API
- [x] Zweryfikować `src/app/api/auth/register/route.ts`
- [x] Dodać walidację danych wejściowych (Zod schema)
- [x] Hash hasła przed zapisem
- [x] Sprawdzenie duplikatów email

---

## 🎣 4. CUSTOM HOOKS I UTILITIES

### 4.1 Database Hooks
- [x] Utworzyć `src/lib/db-hooks.tsx`
- [x] Implementować `useUser()` - session + MongoDB profile
- [x] Implementować `useDoc(collection, id)` - single document
- [x] Implementować `useCollection(collection, filters?)` - lista dokumentów
- [x] Implementować `useMutation()` - CRUD operations (useCreateDoc, useUpdateDoc, useDeleteDoc)
- [x] Dodać loading states i error handling

### 4.2 MongoDB Provider
- [x] Utworzyć `src/lib/mongodb-provider.tsx`
- [x] Context dla connection state (SessionProvider)
- [x] Error boundary dla MongoDB errors
- [x] Retry logic dla failed connections

---


## 👨‍🏫 6. WIDOKI TRENERA

### 6.1 Trainer Dashboard
- [ ] `src/app/(trainer)/trainer/dashboard/page.tsx`
- [ ] Statystyki sportowców trenera
- [ ] Ostatnie aktywności sportowców
- [ ] Nadchodzące treningi
- [ ] Nieprzeczytane wiadomości

### 6.2 Moi sportowcy
- [ ] `src/app/(trainer)/trainer/my-athletes/page.tsx`
- [ ] Lista przypisanych sportowców
- [ ] Przegląd postępów każdego sportowca
- [ ] Szybki dostęp do czatu
- [ ] `src/app/(trainer)/trainer/my-athletes/[athleteId]/page.tsx`
- [ ] Szczegółowy profil sportowca
- [ ] Historia treningów
- [ ] Pomiary ciała (jeśli udostępnione)

### 6.3 System czatu
- [ ] `src/app/(trainer)/trainer/chat/page.tsx`
- [ ] Lista konwersacji z sportowcami
- [ ] Real-time messaging (polling lub WebSockets)
- [ ] Historia wiadomości
- [ ] Oznaczanie jako przeczytane

### 6.4 Plany treningowe
- [ ] `src/app/(trainer)/trainer/templates/page.tsx`
- [ ] Lista własnych planów trenera
- [ ] Kreator nowych planów
- [ ] AI-assisted plan generation
- [ ] Przypisywanie planów do sportowców

### 6.5 Biblioteka ćwiczeń
- [ ] `src/app/(trainer)/trainer/exercises/page.tsx`
- [ ] Systemowe + własne ćwiczenia trenera
- [ ] Dodawanie nowych ćwiczeń
- [ ] Upload instrukcji video/zdjęć

### 6.6 Strefa wiedzy
- [ ] `src/app/(trainer)/trainer/knowledge-zone/page.tsx`
- [ ] Lista artykułów (own + system)
- [ ] `src/app/(trainer)/trainer/knowledge-zone/manage/page.tsx`
- [ ] Tworzenie/edycja artykułów
- [ ] Rich text editor
- [ ] `src/app/(trainer)/trainer/knowledge-zone/[articleId]/page.tsx`
- [ ] Podgląd artykułu

---

## 🏃‍♂️ 7. WIDOKI SPORTOWCA

### 7.1 Athlete Dashboard
- [ ] `src/app/(athlete)/athlete/dashboard/page.tsx`
- [ ] Osobiste statystyki
- [ ] Ostatnie treningi
- [ ] Postęp w celach
- [ ] Kalendarz z nadchodzącymi treningami

### 7.2 Logowanie treningu
- [ ] `src/app/(athlete)/athlete/log/page.tsx`
- [ ] Wybór planu treningowego lub custom workout
- [ ] Timer dla treningu
- [ ] Logowanie sets/reps/weight
- [ ] Dodawanie zdjęć
- [ ] Notatki i feedback

### 7.3 Kalendarz treningowy
- [ ] `src/app/(athlete)/athlete/calendar/page.tsx`
- [ ] React-calendar integration
- [ ] Widok miesięczny/tygodniowy
- [ ] Planowane vs wykonane treningi
- [ ] Drag & drop dla przeplanowywania

### 7.4 System czatu
- [ ] `src/app/(athlete)/athlete/chat/page.tsx`
- [ ] Konwersacja z trenerem
- [ ] Wysyłanie zdjęć postępów
- [ ] Historia wiadomości

### 7.5 Plany treningowe
- [ ] `src/app/(athlete)/athlete/templates/page.tsx`
- [ ] Przypisane plany od trenera
- [ ] Podgląd szczegółów planu
- [ ] Oznaczanie ukończonych dni

### 7.6 Biblioteka ćwiczeń
- [ ] `src/app/(athlete)/athlete/exercises/page.tsx`
- [ ] Przeglądanie dostępnych ćwiczeń
- [ ] Filtrowanie po grupach mięśniowych
- [ ] Historia wykonywania

### 7.7 Śledzenie biegania
- [ ] `src/app/(athlete)/athlete/running/page.tsx`
- [ ] Logowanie sesji biegowych
- [ ] GPS tracking (jeśli możliwe)
- [ ] Statystyki pace/dystans
- [ ] Historia biegów

### 7.8 Zarządzanie dietą
- [ ] `src/app/(athlete)/athlete/diet/page.tsx`
- [ ] Dziennik posiłków
- [ ] FatSecret API integration
- [ ] Kalkulator kalorii
- [ ] Cele żywieniowe

### 7.9 Pomiary ciała
- [ ] `src/app/(athlete)/athlete/measurements/page.tsx`
- [ ] Dodawanie pomiarów (waga, obwody)
- [ ] Upload zdjęć progress
- [ ] Wykresy zmian w czasie
- [ ] Udostępnianie trenerowi

### 7.10 Historia treningów
- [ ] `src/app/(athlete)/athlete/history/page.tsx`
- [ ] Lista wszystkich treningów
- [ ] Filtrowanie i wyszukiwanie
- [ ] `src/app/(athlete)/athlete/history/[sessionId]/page.tsx`
- [ ] Szczegóły konkretnego treningu
- [ ] Porównanie z poprzednimi

### 7.11 Cele i trofea
- [ ] `src/app/(athlete)/athlete/goals/page.tsx`
- [ ] Lista aktywnych celów
- [ ] Tworzenie nowych celów
- [ ] System trofeów/osiągnięć
- [ ] Progress bars

### 7.12 Strefa wiedzy
- [ ] `src/app/(athlete)/athlete/knowledge-zone/page.tsx`
- [ ] Lista dostępnych artykułów
- [ ] Kategoryzacja tematyczna
- [ ] `src/app/(athlete)/athlete/knowledge-zone/[articleId]/page.tsx`
- [ ] Podgląd artykułu

### 7.13 Mapa siłowni
- [ ] `src/app/(athlete)/athlete/map/page.tsx`
- [ ] Google Maps integration
- [ ] Wyszukiwanie siłowni w okolicy
- [ ] Dodawanie do ulubionych
- [ ] Oceny i komentarze

---

## 🤖 8. FUNKCJONALNOŚCI AI

### 8.1 AI Workout Planning
- [ ] `src/ai/flows/workout-flow.ts`
- [ ] Google Genkit configuration
- [ ] Input schemas (goals, experience, equipment)
- [ ] Output parsing i validacja
- [ ] Integration z workout plans

### 8.2 FatSecret API Integration
- [ ] `src/ai/flows/fatsecret-flow.ts`
- [ ] API authentication
- [ ] Food search functionality
- [ ] Nutritional data parsing
- [ ] Caching mechanism

---

## 📱 9. KOMPONENTY I FUNKCJE WSPÓLNE

### 9.1 Navigation Component
- [ ] Aktualizacja `src/components/nav.tsx`
- [ ] Integration z MongoDB hooks
- [ ] Role-based navigation items
- [ ] Unread messages counter

### 9.2 Layout Components
- [ ] Aktualizacja layout'ów dla każdej roli
- [ ] Session management
- [ ] Loading states
- [ ] Error boundaries

### 9.3 Form Components
- [ ] Reusable form components z React Hook Form
- [ ] Zod validation schemas
- [ ] Error handling
- [ ] Success feedback

---

## 🔐 10. BEZPIECZEŃSTWO I AUTORYZACJA

### 10.1 Middleware
- [ ] Route protection middleware
- [ ] Role-based access control
- [ ] API authorization
- [ ] Rate limiting

### 10.2 Data Validation
- [ ] Zod schemas dla wszystkich API endpoints
- [ ] Input sanitization
- [ ] XSS protection
- [ ] CSRF tokens

---

## 🧪 11. TESTOWANIE

### 11.1 Unit Tests
- [ ] Tests dla MongoDB hooks
- [ ] Tests dla API routes
- [ ] Component testing
- [ ] Model validation tests

### 11.2 Integration Tests
- [ ] Database operations
- [ ] Authentication flow
- [ ] API endpoints
- [ ] User workflows

### 11.3 E2E Tests
- [ ] Complete user journeys
- [ ] Cross-role interactions
- [ ] Critical paths testing

---

## 📊 12. MONITORING I ANALITYKA

### 12.1 Application Monitoring
- [ ] Error tracking setup
- [ ] Performance monitoring
- [ ] Database query optimization
- [ ] User analytics (privacy-focused)

### 12.2 Database Monitoring
- [ ] MongoDB Atlas monitoring
- [ ] Query performance
- [ ] Index optimization
- [ ] Backup strategy

---

## 🚀 13. DEPLOYMENT I PRODUKCJA

### 13.1 Environment Setup
- [ ] Production MongoDB cluster
- [ ] Environment variables configuration
- [ ] SSL certificates
- [ ] Domain setup

### 13.2 CI/CD Pipeline
- [ ] GitHub Actions workflow
- [ ] Automated testing
- [ ] Database migrations
- [ ] Deployment automation

---

## 📝 NOTATKI IMPLEMENTACYJNE

### Priorytet implementacji:
1. **Krytyczne** (System nie działa bez tego)
   - Konfiguracja MongoDB
   - NextAuth setup
   - Podstawowe modele (User, Exercise, WorkoutLog)
   - Generic API routes
   - Database hooks

2. **Wysokie** (Główne funkcjonalności)
   - Wszystkie widoki dashboard
   - System czatu
   - Logowanie treningów
   - Zarządzanie planami

3. **Średnie** (Dodatkowe funkcjonalności)
   - AI integration
   - Mapa siłowni
   - Pomiary ciała
   - System celów

4. **Niskie** (Nice to have)
   - Advanced analytics
   - Social features
   - Mobile optimizations

### Szacowany czas realizacji:
- **Faza 1** (Konfiguracja + Core): 2-3 tygodnie
- **Faza 2** (Główne funkcjonalności): 4-6 tygodni
- **Faza 3** (Dodatkowe features): 3-4 tygodnie
- **Faza 4** (Testy + Deployment): 1-2 tygodnie

**ŁĄCZNY CZAS: 10-15 tygodni**
