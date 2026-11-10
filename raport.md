# Raport audytu — Leniwa Kluska (kluska-monolith)

Data: 2026-11-10 · Zakres: backend Next.js (`src/`), `athlete-spa`, `landing`, `scripts`, konfiguracja i repozytorium.
Metoda: przegląd kodu plik po pliku + `tsc --noEmit` (backend i SPA), build Vite (SPA + landing), uruchomienie `scripts/check-gamification.ts`.

> Legenda priorytetów: **P0** – krytyczne (bezpieczeństwo / przejęcie konta / wyciek sekretów), **P1** – wysokie (zepsuta funkcja lub realna luka), **P2** – średnie (błąd częściowy, dług techniczny), **P3** – niskie (kosmetyka, porządki).

---

## 1. Podsumowanie wykonawcze

Projekt jest rozbudowany i w większości działa, ale ma **kilka krytycznych luk bezpieczeństwa**, z których najważniejsza pozwala **zalogować się jako dowolny użytkownik bez hasła** (obejście impersonacji w NextAuth). Osobno: **sekrety produkcyjne są w repozytorium** (`env.local`) oraz **rejestracja pozwala samodzielnie założyć konto administratora**.

Najważniejsze liczby:
- `tsc` backend: **~220 błędów typów** w `src/` + `scripts/` — ukryte przez `typescript.ignoreBuildErrors: true` w `next.config.ts`, więc `next build` ich nie wyłapie.
- `tsc` athlete-spa: **71 błędów typów**.
- `npm run lint` nie działa **w żadnej** z aplikacji (Next 16 usunął `next lint`; ESLint 10 w SPA wymaga `eslint.config.*`, którego nie ma).
- Brak testów (jest tylko jeden skrypt smoke `scripts/check-gamification.ts` — przechodzi, 24/24).
- Buildy `athlete-spa` i `landing` przechodzą; landing `tsc` czysty.

Najpilniejsze do naprawy (P0): obejście logowania przez `impersonateUserId`, rola z rejestracji, `env.local` w gicie, zaszyty klucz API Serper, kilka endpointów bez autoryzacji.

---

## 2. P0 — Krytyczne (bezpieczeństwo)

### 2.1. Logowanie jako dowolny użytkownik bez hasła (obejście impersonacji)
**Plik:** [src/lib/auth.ts:65](src/lib/auth.ts) (provider `authorize`)

Provider credentials NextAuth obsługuje gałąź impersonacji **bez żadnej weryfikacji, kto wywołuje**:

```ts
if (credentials?.impersonateUserId) {
  const targetUser = await User.findById(credentials.impersonateUserId);
  if (!targetUser) throw new Error('User not found');
  return { id: ..., role: targetUser.role, ... }; // zwraca sesję docelowego usera
}
```

Endpoint [src/app/api/auth/impersonate/route.ts](src/app/api/auth/impersonate/route.ts) owszem sprawdza, że bieżący user jest adminem — **ale to nic nie daje**, bo właściwą sesję wydaje `signIn('credentials', { impersonateUserId })`, który trafia prosto do `authorize()` z pominięciem tego endpointu. Każdy (również niezalogowany) może wywołać standardowy callback NextAuth z `impersonateUserId: <dowolne _id>` i dostać ważną sesję tej osoby — w tym admina. ID użytkowników łatwo zdobyć (katalog trenerów, profile społecznościowe, wiele odpowiedzi API zwraca `id`/`_id`).

**Wpływ:** pełne przejęcie dowolnego konta i eskalacja do admina.
**Fix:** przenieść autoryzację admina **do** `authorize()` — impersonacja dozwolona tylko, gdy w żądaniu jest ważna sesja/token admina; najlepiej całkiem usunąć ścieżkę `impersonateUserId` z providera i zrobić impersonację osobnym, serwerowym mechanizmem (podpisany, krótkożyjący token wydawany tylko adminowi). Logika „restore admin” w [src/components/nav.tsx:255](src/components/nav.tsx) opiera się na tej samej dziurze.

### 2.2. Rejestracja pozwala założyć konto `admin`/`trainer`
**Pliki:** [src/app/api/auth/register/route.ts:8](src/app/api/auth/register/route.ts) (`role` z body → `new User({ role })` w linii 57), [src/app/register/page.tsx:202](src/app/register/page.tsx) (radio „Administrator”).

`role` jest brane wprost z ciała żądania i zapisywane bez walidacji. Formularz webowy wręcz oferuje wybór „Trener” i „Administrator”. Dowolna osoba rejestruje się jako admin.

**Fix:** na rejestracji publicznej wymuszać `role: 'athlete'` po stronie serwera (SPA już to robi — [athlete-spa/.../Register.tsx:103](athlete-spa/src/pages/Register.tsx) wysyła `role: 'athlete'`). Nadawanie ról trenera/admina tylko przez panel admina. Usunąć opcje ról z `register/page.tsx`.

### 2.3. Sekrety produkcyjne w repozytorium (`env.local`)
**Plik:** `env.local` — **śledzony przez git** (`git ls-files` go pokazuje).

`.gitignore` ignoruje `.env*`, ale **`env.local` nie pasuje do wzorca** (`.env*` wymaga kropki na początku), więc plik jest w repo. Zawiera realne wartości: `MONGO_DB_URI` (Atlas), `NEXTAUTH_SECRET`, `OPEN_ROUTER_API_KEY`, `STRAVA_CLIENT_SECRET`, `FATSECRET_CLIENT_SECRET`, `SMTP_PASS`, `GEMINI_API_KEY`.

**Wpływ:** pełny dostęp do produkcyjnej bazy, podszywanie się pod backend (znany `NEXTAUTH_SECRET` → fałszowanie tokenów/sesji), koszty na kluczach AI.
**Fix (pilnie):**
1. **Zrotować wszystkie sekrety** z tego pliku (baza, NEXTAUTH_SECRET, OpenRouter, Strava, FatSecret, SMTP, Gemini).
2. Usunąć plik z historii (`git rm --cached env.local`, dodać do `.gitignore` jawnie `env.local`, rozważyć `git filter-repo` dla historii).
3. Poprawić `.gitignore` tak, by łapał też `*.local` w rootcie.

### 2.4. Zaszyty na stałe klucz API (Serper)
**Plik:** [src/app/api/admin/gyms/import/route.ts:38](src/app/api/admin/gyms/import/route.ts)

```ts
const apiKey = 'd41aa0e966935ed3098658ac368672894a7f6e17'; // Hardcoded as requested
```

Klucz w kodzie = w repo i w zbudowanym artefakcie.
**Fix:** przenieść do zmiennej środowiskowej, **zrotować** obecny klucz.

### 2.5. Endpointy bez autoryzacji

| Endpoint | Plik | Problem |
|---|---|---|
| `POST /api/generate-image` | [route.ts:9](src/app/api/generate-image/route.ts) | Brak `getRequestUser`. Każdy może generować obrazy na koszt `OPEN_ROUTER_API_KEY` (DoS kosztowy). |
| `DELETE /api/conversations/[conversationId]` | [route.ts:5](src/app/api/conversations/[conversationId]/route.ts) | **Zero autoryzacji.** Dowolne `conversationId` → kasuje konwersację i wszystkie jej wiadomości. |
| `POST /api/public/exercises` | [route.ts:46](src/app/api/public/exercises/route.ts) | Bez logowania wstawia ćwiczenia do wspólnej biblioteki (`ownerId: 'public'`) — spam/zaśmiecanie. |
| `GET /api/fatsecret/search` | [route.ts:7](src/app/api/fatsecret/search/route.ts) | Autoryzacja zakomentowana (`// TODO`). Darmowy proxy do FatSecret na Twoich limitach. |
| `GET /api/admin/achievements` i `POST` | [route.ts:31](src/app/api/admin/achievements/route.ts) | Sprawdza tylko „czy zalogowany”, **nie rolę** (`// TODO: Add admin check here`). To samo w [`[id]/route.ts`](src/app/api/admin/achievements/[id]/route.ts) (PUT/DELETE). Każdy zalogowany CRUD-uje odznaki. |

**Fix:** dodać `getRequestUser` + kontrolę roli (jak w `src/app/api/admin/settings/route.ts`, który robi to poprawnie). Dla `conversations` DELETE — sprawdzić, że wołający jest uczestnikiem (albo przenieść kasowanie do generycznego `/api/db` z politykami, które już to pilnują).

### 2.6. Token JWT w parametrze URL (`?token=`)
**Plik:** [src/lib/api-auth.ts:29](src/lib/api-auth.ts); używane m.in. w [athlete-spa/.../IntegrationsSection.tsx:20](athlete-spa/src/components/profile/IntegrationsSection.tsx) (`?token=${token}` przy łączeniu Strava/Spotify).

Token Bearer przekazywany w query stringu trafia do logów serwera/proxy, historii i nagłówka Referer. To obejście braku nagłówka przy pełnej nawigacji, ale token wędruje w URL.
**Fix:** zamiast tokenu w URL używać krótkożyjącego, jednorazowego „state” powiązanego z użytkownikiem (podpisany, ważny kilka minut), a właściwy JWT trzymać tylko w nagłówku/cookie.

### 2.7. Stored XSS — treść artykułów bez sanityzacji
**Pliki:** [athlete-spa/.../KnowledgeZoneArticle.tsx:216](athlete-spa/src/pages/athlete/KnowledgeZoneArticle.tsx), [src/app/(athlete)/athlete/knowledge-zone/[articleId]/page.tsx:55](src/app/(athlete)/athlete/knowledge-zone/[articleId]/page.tsx), [src/app/(trainer)/.../[articleId]/page.tsx:68](src/app/(trainer)/trainer/knowledge-zone/[articleId]/page.tsx), edytor [src/components/RichTextEditor.tsx:254](src/components/RichTextEditor.tsx).

`dangerouslySetInnerHTML={{ __html: article.content }}` renderuje HTML pisany przez trenerów, bez DOMPurify/sanitizacji (brak takiej zależności w projekcie). Trener (lub ktoś, kto założył konto trenera przez lukę 2.2) może wstrzyknąć skrypt wykonywany u każdego czytelnika.
**Fix:** sanityzować HTML przy zapisie **i** przy renderze (np. `isomorphic-dompurify`), albo trzymać treść jako kontrolowany format (np. TipTap JSON) i renderować bez surowego HTML.

### 2.8. Upload akceptuje SVG serwowane z własnej domeny
**Plik:** [src/app/api/upload/route.ts:27](src/app/api/upload/route.ts) (`'image/svg+xml': 'svg'`, prefix `image/` przechodzi) → serwowane z [src/app/upload-data/[...path]/route.ts](src/app/upload-data/[...path]/route.ts) na tym samym originie.

SVG może zawierać `<script>`. Plik avatara/zdjęcia posta/trofeum wgrany jako SVG i otwarty bezpośrednio = XSS na Twojej domenie. (Co ciekawe `lib/gym-logo.ts` **świadomie** pomija SVG dokładnie z tego powodu — upload nie.)
**Fix:** odrzucać `image/svg+xml` w uploadzie (albo serwować z `Content-Disposition: attachment` i `Content-Security-Policy: sandbox`), rozpoznawać typ po zawartości, nie po nagłówku.

### 2.9. Brak rate-limitingu i nagłówków bezpieczeństwa (globalnie)
- **Rate limiting:** brak gdziekolwiek — w szczególności `/api/auth/token`, `/api/auth/guest`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/generate-image`, endpointy AI (`nutrition/search`, `nutrition/barcode`). Podatność na brute-force haseł i nadużycia kosztowe.
- **Nagłówki:** `next.config.ts` nie definiuje `headers()` — brak `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors` (clickjacking), `Strict-Transport-Security`, `X-Content-Type-Options`.

**Fix:** dodać rate limiter (np. na poziomie reverse-proxy albo prosty licznik w Redis/Mongo dla ścieżek auth i AI) oraz `async headers()` w `next.config.ts` z CSP/HSTS/XFO.

---

## 3. P1 — Wysokie (zepsute funkcje / realne luki)

### 3.1. Trasy dynamiczne z synchronicznym `params` — zepsute w Next 16
**Pliki:**
- [src/app/api/trainer/diets/[id]/route.ts:7,28,60](src/app/api/trainer/diets/[id]/route.ts) — sygnatura `{ params }: { params: { id: string } }` i `params.id` bez `await`.
- [src/app/api/admin/diet-plans/[id]/route.ts:9,37,71](src/app/api/admin/diet-plans/[id]/route.ts) — to samo.
- Strony: [src/app/(admin)/admin/diet-plans/[id]/page.tsx:7](src/app/(admin)/admin/diet-plans/[id]/page.tsx), [src/app/(trainer)/trainer/diet/plans/[id]/edit/page.tsx:62](src/app/(trainer)/trainer/diet/plans/[id]/edit/page.tsx).

W Next 16 `params` jest `Promise`. `params.id` zwraca `undefined` → te endpointy i strony edycji/podglądu planów diety trenera i admina **nie działają** (zapytania po `_id: undefined`). Pozostałe trasy w projekcie poprawnie robią `const { id } = await params`.
**Fix:** ujednolicić do `{ params }: { params: Promise<{ id: string }> }` + `await params`.

### 3.2. Statystyki check-inów trenera zawsze puste (zły klucz)
**Plik:** [src/app/api/trainer/athletes-stats/route.ts:61-67](src/app/api/trainer/athletes-stats/route.ts)

Agregacja check-inów grupuje i filtruje po `userId`, ale model `WeeklyCheckIn` nie ma pola `userId` (ma `athleteId` i `trainerId` — [src/models/WeeklyCheckIn.ts:16-18](src/models/WeeklyCheckIn.ts)). `$match: { userId: {...} }` nie dopasuje nic → `lastCheckInDate` zawsze `null` w widoku „Moi sportowcy”.
**Fix:** grupować po `athleteId` i filtrować `athleteId: { $in: targetAthleteIds }`.

### 3.3. Trener nigdy nie dostaje powiadomienia o wypełnionym check-inie
**Plik:** [src/app/api/check-ins/[id]/route.ts:159-166](src/app/api/check-ins/[id]/route.ts)

Kod najpierw ustawia `checkIn.status = 'submitted'` i `checkIn.submittedAt = new Date()`, a dopiero potem sprawdza warunek wysyłki powiadomienia: `if (!checkIn.submittedAt || checkIn.status === 'pending')`. Po przypisaniach oba człony są fałszywe → **powiadomienie nie wysyła się nigdy**. `tsc` to zresztą zgłasza (porównanie `'submitted'` vs `'pending'` „have no overlap”).
**Fix:** policzyć warunek „to pierwsze zgłoszenie” **przed** mutacją statusu.

### 3.4. `NutritionGoal` nigdy nie powstaje — cele kaloryczne martwe
**Pliki:** model [src/models/NutritionGoal.ts](src/models/NutritionGoal.ts) istnieje; czytany w [src/app/api/athlete/nutrition/diary/route.ts:31](src/app/api/athlete/nutrition/diary/route.ts); **nigdzie nie tworzony** (brak API POST/PATCH i UI — `grep` pokazuje tylko odczyt i kasowanie w cascade-delete).

Efekt: dziennik kalorii zawsze zwraca `goal: null`, ekran „Kalorie” stale pokazuje „Brak celu żywieniowego. Poproś trenera o jego ustawienie” ([athlete-spa/.../Nutrition.tsx:167](athlete-spa/src/pages/athlete/Nutrition.tsx)) — ale **trener też nie ma jak go ustawić** (brak ekranu). Cała funkcja celów makro/kcal jest niedokończona.
**Fix:** dodać endpoint i UI (trener → podopieczny, lub kreator dla sportowca: BMR/TDEE). Dopóki tego nie ma, rozważyć domyślne cele liczone z profilu (waga/wzrost/płeć/aktywność).

### 3.5. Panel trenera w SPA to atrapa
**Plik:** [athlete-spa/.../TrainerPanel.tsx](athlete-spa/src/pages/athlete/TrainerPanel.tsx) — „Panel w budowie”, dane na sztywno (`STATS`, `ATHLETES` = przykładowe), komentarz `// Placeholder content — the trainer panel is not wired to real data yet.`

Dostępny z menu dla roli `trainer` ([athlete-spa/.../athlete-nav.ts:84](athlete-spa/src/lib/athlete-nav.ts)). Trener w aplikacji mobilnej nie ma realnych narzędzi (pełny panel jest tylko w wersji web `/trainer/*`).
**Fix:** albo doprowadzić do działania, albo ukryć wejście do czasu implementacji.

### 3.6. Zarządzanie artykułami (Strefa wiedzy / manage) na danych mockowych
**Pliki:** [athlete-spa/.../KnowledgeZoneManage.tsx:60-110](athlete-spa/src/pages/athlete/KnowledgeZoneManage.tsx) oraz webowy [src/app/(athlete)/athlete/knowledge-zone/manage/page.tsx:60](src/app/(athlete)/athlete/knowledge-zone/manage/page.tsx).

Cała strona działa na `useState` z jednym przykładowym artykułem (`sampleArticle`, `sampleCategories`), „zapis” to `setArticles(...)` + `setTimeout`. Nic nie trafia do bazy, po odświeżeniu znika. Link do niej jest wystawiony w nawigacji sportowca ([athlete-spa/.../KnowledgeZone.tsx](athlete-spa/src/pages/athlete/KnowledgeZone.tsx) → `managePath`).
**Fix:** podłączyć do kolekcji `articles`/`articleCategories` przez `/api/db` (web ma już realny CRUD w `(trainer)/trainer/knowledge-zone/manage`).

### 3.7. Tworzenie konwersacji — niespójność `conversationId` vs `_id`
**Pliki:** [src/app/(trainer)/trainer/chat/page.tsx:68-125](src/app/(trainer)/trainer/chat/page.tsx) (ogromny blok komentarzy przyznający problem), analogicznie [athlete-spa/.../Chat.tsx:76-93](athlete-spa/src/pages/athlete/Chat.tsx), wywołanie z [src/components/trainer/inquiries-inbox.tsx:163](src/components/trainer/inquiries-inbox.tsx).

`createConversation` przekazuje `conversationId` jako **pole**, ale `createDoc` nadaje własne `_id`. Po utworzeniu kod wybiera rozmowę po `conversationId` (`uid1_uid2`), podczas gdy lista dopasowuje po `c.id` (`_id`). W efekcie zaraz po „Rozpocznij czat” rozmowa może się nie zaznaczyć / pokazać pusto do czasu odświeżenia. Działa „przypadkiem” tylko jeśli gdzieś indziej używa się pola `conversationId` zamiast `_id`.
**Fix:** ustalić jedno źródło identyfikatora (albo wymusić `_id = uid1_uid2` przy tworzeniu, albo wszędzie używać `conversationId`), usunąć martwe komentarze-dywagacje.

### 3.8. `ignoreBuildErrors: true` maskuje ~220 błędów typów
**Plik:** [next.config.ts](next.config.ts) (`typescript.ignoreBuildErrors: true`).

Produkcyjny build nie wychwyci regresji typów. Część z 220 błędów to „szum” (patrz §6), ale są wśród nich realne (np. 3.2/3.3 wyłapane przez `tsc`, `onboarding/complete` używa `error.errors` zamiast `error.issues` — [route.ts:40](src/app/api/onboarding/complete/route.ts)).
**Fix:** docelowo wyłączyć flagę; najpierw posprzątać błędy modeli (jeden wzorzec `toJSON`, patrz §6.1) i resolverów RHF.

### 3.9. Lint nie działa w żadnej aplikacji
- Root: `"lint": "next lint"` — Next 16 usunął `next lint` (README to odnotowuje).
- SPA: `eslint .` z ESLint 10 → „ESLint couldn't find an eslint.config.* file” (jest stary format `.eslintrc`).

Brak lintingu = brak wychwytywania martwych zmiennych, braków w deps hooków itd.
**Fix:** migracja do ESLint flat config (`eslint.config.js`) w obu; w rootcie przejść na `eslint` CLI.

---

## 4. P2 — Średnie (błędy częściowe, dług techniczny)

### 4.1. `markAllAsRead` powiadomień — pusty stub
[src/lib/hooks/useNotifications.ts:62](src/lib/hooks/useNotifications.ts) i [athlete-spa/.../useNotifications.ts:61](athlete-spa/src/lib/hooks/useNotifications.ts) — `// TODO: Implement endpoint for bulk update`, funkcja nic nie robi. Jeśli UI oferuje „oznacz wszystkie jako przeczytane”, nie zadziała. Brak też endpointu zbiorczego (trzeba by iterować po `PATCH /api/notifications/[id]`).

### 4.2. Auto-save treningu zależny od `form.watch()`
[athlete-spa/.../Log.tsx:740](athlete-spa/src/pages/athlete/Log.tsx) — `useEffect(..., [form.watch(), ...])`. `form.watch()` zwraca nowy obiekt przy każdym renderze → efekt i jego `setTimeout(2000)` są tworzone/czyszczone w kółko. Działa, ale krucho i marnotrawnie; przy szybkich zmianach debounce może się nie ustabilizować.
**Fix:** `watch` z callbackiem/subskrypcją albo `useWatch`, a zapis debounce'ować poza zależnościami efektu.

### 4.3. `GET /api/challenges` mutuje bazę przy odczycie
[src/app/api/challenges/route.ts](src/app/api/challenges/route.ts) i [[id]/route.ts](src/app/api/challenges/[id]/route.ts) — każdy odczyt przelicza i **zapisuje** postęp + status/zwycięzcę. SPA odpytuje listę cyklicznie → zapisy przy każdym pollingu, wyścigi, koszt. Logika kończenia wyzwań i tak powinna żyć w zadaniu w tle, nie w GET.
**Fix:** rozdzielić odczyt od przeliczania; przeliczać zdarzeniowo (po zapisaniu biegu) lub cronem.

### 4.4. Brak maksymalnego `limit` w generycznym `/api/db`
[src/app/api/db/[collection]/route.ts:124](src/app/api/db/[collection]/route.ts) — `query.limit(parseInt(limitParam))` bez górnego ograniczenia; `query` JSON brany od klienta. Klient może poprosić o ogromny `limit`. (Warstwa dostępu `db-access.ts` filtruje **co** widać — nie **ile**.)
**Fix:** twardy cap (np. 200) i walidacja `limit/skip`.

### 4.5. `/api/images/[fileId]` zawsze `Content-Type: image/jpeg`
[src/app/api/images/[fileId]/route.ts](src/app/api/images/[fileId]/route.ts) — komentarz przyznaje, że typ powinien być dynamiczny; PNG/WebP z GridFS serwowane jako jpeg (część przeglądarek i tak zgadnie, ale to błąd).
**Fix:** zapisywać i zwracać `contentType` z metadanych GridFS.

### 4.6. Dostępy prywatności w niezautoryzowanych GET-ach
- [src/app/api/gyms/[id]/favorites/route.ts](src/app/api/gyms/[id]/favorites/route.ts) — bez logowania zwraca `name` + `avatarUrl` wszystkich, którzy polubili siłownię.
- [src/app/api/social/profile/[userId]/route.ts](src/app/api/social/profile/[userId]/route.ts), [src/app/api/public/profile/[id]/route.ts](src/app/api/public/profile/[id]/route.ts) — bez logowania zwracają profil + statystyki + rekordy + posty. Jeśli „publiczne” jest zamierzone, OK; jeśli nie — wymagać sesji. `public/profile/[id]` zwraca sporo (lokalizacja, linki społ., historia). Warto świadomie zdecydować, co jest publiczne.

### 4.7. Enumeracja istnienia konta przy logowaniu (SPA/web)
`verifyCredentials` ([src/lib/auth.ts:26-35](src/lib/auth.ts)) rzuca „No user found with this email” vs „Invalid password” — różne komunikaty pozwalają sprawdzać, które e-maile istnieją. (Reset hasła i resend są już poprawnie „generyczne”.)
**Fix:** jeden komunikat „nieprawidłowy e-mail lub hasło” dla obu przypadków.

### 4.8. Build maskuje też rozmiar bundla mapbox
Build SPA: `vendor-mapbox` ~1,88 MB (gzip ~525 kB). Jest ładowany leniwie (tylko mapa siłowni), więc nie wchodzi do wejścia — ale to nadal ciężki ekran na telefonie. Rozważyć lżejszą mapę (mapa siłowni mogłaby używać Leaflet, który już jest w projekcie do tras biegowych) lub `maplibre-gl` zamiast `mapbox-gl`.

### 4.9. `allowBackup=true` i brak minifikacji (Android)
[athlete-spa/android/app/src/main/AndroidManifest.xml:5](athlete-spa/android/app/src/main/AndroidManifest.xml) — `android:allowBackup="true"` pozwala wyciągnąć dane aplikacji (w tym token w localStorage WebView) przez adb backup. [android/app/build.gradle:21](athlete-spa/android/app/build.gradle) — `minifyEnabled false` (brak R8/proguard).
**Fix:** `allowBackup="false"` (lub reguły backupu wykluczające dane wrażliwe), włączyć `minifyEnabled true` dla release.

### 4.10. Wersjonowanie Androida nie aktualizowane
[android/app/build.gradle:10-11](athlete-spa/android/app/build.gradle) — `versionCode 1`, `versionName "1.0"`, mimo że `package.json` SPA to `0.9.3`. Każdy build release = ten sam versionCode → nie da się wgrać aktualizacji do dystrybucji.
**Fix:** podbijać `versionCode`/`versionName` (najlepiej automatycznie z wersji npm / CI).

---

## 5. P3 — Niskie (porządki, repo, build)

### 5.1. Śmieci i duplikaty w repozytorium
- `.idea/workspace.xml`, `athlete-spa/.idea/*` — ustawienia IDE w gicie.
- `response.json` (2,2 MB), `data.ts`, `workflow.json` (eksport n8n) w rootcie — wyglądają na pozostałości robocze.
- **Dwie kopie** `opengym-exercises-pl.json` po 12 MB (`athlete-spa/` i `scripts/data/`) + `athlete-spa/opengym-exercises.json` 4 MB. Łącznie ~28 MB danych ćwiczeń w repo.
- `athlete-spa/.venv` → symlink do `/home/krystian/projects/...` (inna wielkość liter niż `Projects`) — zepsuty/kruchy, zależny od maszyny.
- PWA artefakty w `public/` (`sw.js`, `workbox-*.js`) są śledzone — zwykle generowane przy buildzie.

**Fix:** dodać do `.gitignore` (`.idea/`, `*.local`, artefakty PWA), usunąć `response.json`/`workflow.json`/zbędne kopie JSON, trzymać dużą bazę ćwiczeń poza repo (release asset / storage) albo w jednym miejscu.

### 5.2. CI nic nie weryfikuje
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) — na push do `main` tylko wysyła webhook z listą commitów. Brak `build`, `typecheck`, `test`, lint. Nic nie blokuje wdrożenia zepsutego kodu.
**Fix:** dodać joby `typecheck` (po posprzątaniu błędów), build obu frontów, uruchomienie `check-gamification.ts`.

### 5.3. `tsconfig.json` rootu obejmuje `athlete-spa`
README to odnotowuje: root `tsconfig` ma `**/*.ts(x)` i alias `@`→`src/`, więc `tsc` w rootcie „widzi” też `athlete-spa` (inny alias) i generuje setki fałszywych błędów. SPA trzeba sprawdzać we własnym katalogu.
**Fix:** w root `tsconfig` dodać `exclude: ["athlete-spa", "landing"]`.

### 5.4. Pozostałości po migracjach
- UploadThing: [src/lib/upload.ts:resolveStoredImageUrl](src/lib/upload.ts) i jego odpowiednik w SPA nadal fallbackują do `https://utfs.io/f/...` dla starych rekordów — OK jako kompatybilność, ale warto zaplanować migrację danych i usunięcie.
- `prisma.config.ts` + zależność `prisma` w `package.json`, choć projekt używa Mongoose i **nie ma** katalogu `prisma/` (`seed` w configu wskazuje nieistniejący `prisma/seed.ts`). Martwa konfiguracja.
- `src/lib/db.ts` to tylko re-export `connectToDatabase` — zbędna warstwa (część tras importuje `dbConnect`, część `connectToDatabase`; niespójność).

### 5.5. Landing — martwe linki prawne
[landing/src/components/Footer.tsx:8-9](landing/src/components/Footer.tsx) — „Prywatność” i „Regulamin” mają `href="#"` (donikąd), choć backend ma strony `/polityka-prywatnosci` i `/regulamin`. Dla strony produktowej zbierającej ruch warto podlinkować realne dokumenty.

### 5.6. Drobne niespójności funkcji grywalizacji (nieużywane eksporty)
W `src/lib/gamification` kilka funkcji nie ma żadnego wywołania (`updateUserRanks`, `checkAndResetStreaks`, `getPointHistory`, `seedDefaultAchievements`, `awardWorkoutCompletionPoints`). To nie błędy, ale martwy/rezerwowy kod — albo podłączyć (np. `updateUserRanks` do rankingu, `seedDefaultAchievements` do seeda), albo usunąć. (Rdzeń logiki jest przetestowany skryptem i wygląda solidnie — atomowe `$inc`, idempotencja nagród, strefa czasowa `Europe/Warsaw`.)

### 5.7. iOS „wkrótce”
[src/app/exercises/[id]/OpenInApp.tsx:96](src/app/exercises/[id]/OpenInApp.tsx) — „App Store - wkrótce”. Aplikacja iOS nieopublikowana; `capacitor.config.ts` i dystrybucja są tylko pod Androida. Spójne z notatką, że to apka mobilna — do odnotowania w roadmapie.

---

## 6. Jakość kodu / typy (szczegóły do §3.8)

### 6.1. Jeden wzorzec psuje ~połowę błędów modeli
Prawie każdy model ma w `toJSON.transform` `ret.id = ret._id.toString()` i `delete ret.__v`, co przy typie zwracanym przez Mongoose 9 daje `TS2339: Property 'id' does not exist...` i `TS2790: operand of delete must be optional` — powtórzone w ~30 modelach ([src/models/Achievement.ts:24](src/models/Achievement.ts), `Article.ts`, `Gym.ts`, `BodyMeasurement.ts`, itd.). Dodatkowo kilka interfejsów `extends Document` z własnym `_id: string` koliduje z `Document<ObjectId>` (`TS2430` w `Gym`, `BodyMeasurement`).
**Fix:** wspólny, poprawnie otypowany helper transformacji `toJSON` (jeden `transform(doc, ret: Record<string, any>)`), ujednolicić typ `_id`. Zbije to kilkadziesiąt błędów naraz.

### 6.2. react-hook-form + Zod v4 — niezgodność resolverów
Druga duża grupa (w SPA i web): formularze z `zodResolver` dają `TS2322`/`TS2345` na `Resolver`/`Control`/`SubmitHandler` (np. [athlete-spa/.../workout-form.tsx](athlete-spa/src/components/admin/workout-form.tsx), [Habits.tsx](athlete-spa/src/pages/athlete/Habits.tsx), [Log.tsx](athlete-spa/src/pages/athlete/Log.tsx), web `admin/running-programs`, `athlete/goals`, `measurements`). Przyczyna: `z.number({ required_error })` (API Zod v3) nie istnieje w Zod v4 (`TS2353: 'required_error' does not exist`) + rozjazd wersji `@hookform/resolvers`.
**Fix:** zaktualizować składnię schematów do Zod v4 (`z.number({ error })`), dopasować wersje `react-hook-form`/`@hookform/resolvers` i przegenerować typy.

### 6.3. Pojedyncze, warte poprawy
- `PublicProfileDialog.tsx` (SPA) — 17 błędów `TS2339` (`profile`/`stats`/`records`/`recentPosts` nie istnieją na typie) → komponent prawdopodobnie czyta **inny** kształt niż zwraca API `social/profile/[userId]` (API zwraca `profile`, `stats`, `records`, `recentPosts`, więc to raczej zły typ `PublicProfileData`). Warto sprawdzić, czy dialog w ogóle renderuje dane. [athlete-spa/.../PublicProfileDialog.tsx:113](athlete-spa/src/components/social/PublicProfileDialog.tsx)
- `PostCard.tsx` (SPA) — `Timestamp` vs `Date` (`TS2740`), relikt Firestore'owego typu czasu.
- Brakujące deklaracje typów: `uuid` ([trainer/surveys/new](src/app/(trainer)/trainer/surveys/new/page.tsx)), `polyline-encoded` ([running/RouteMap.tsx](src/components/running/RouteMap.tsx)), `next-themes/dist/types` ([theme-provider.tsx](src/components/theme-provider.tsx)) — dodać `@types/*` lub deklaracje ambient.
- `FullCalendarWrapper.tsx` (SPA) — niezgodność wersji `@fullcalendar/*` (`core` 7 vs wtyczki 6; „File ... is not a module”). Ujednolicić wersje FullCalendar.
- `models/index.ts` — `IMuscleGroup` eksportowany dwukrotnie (z `Exercise` i `MuscleGroup`) → `TS2308`.

---

## 7. Co działa dobrze (żeby nie wylać dziecka z kąpielą)

- **Warstwa dostępu `src/lib/db-access.ts`** — przemyślana: filtry per-kolekcja, AND-owanie zapytań klienta ze scope, `protectedFields`, blokada operatorów `$where/$function`, osobna ścieżka przypisywania podopiecznego przez trenera. Generyczne `/api/db` nie jest „gołą” bazą.
- **Grywalizacja** — atomowe przyznawanie punktów (`$inc`, bez read-modify-save), idempotencja nagród (`rewardedAt`/`pointsAwarded` zajmowane warunkowo), strefa `Europe/Warsaw`, logika serii/tygodni pokryta skryptem (24/24).
- **Offline w SPA** — kolejka mutacji z remapowaniem tymczasowych ID, trwały cache SWR zrzucany na `visibilitychange`, licznik trasy biegu odporny na throttling WebView (kotwica do zegara ściennego), natywne harmonogramowanie dźwięku/wibracji przerwy.
- **Reset hasła / weryfikacja e-mail** — tokeny hashowane (SHA-256), TTL, cooldown, generyczne odpowiedzi (brak enumeracji), weryfikacja przez POST (odporność na prefetch skanerów).
- **`lib/gym-logo.ts`** — porządna ochrona przed SSRF (blokada prywatnych IP również po przekierowaniach, limity czasu/rozmiaru, rozpoznawanie typu po zawartości, pomijanie SVG). Ten wzorzec warto przenieść do uploadu (§2.8).
- **Kaskadowe usuwanie użytkownika** [src/lib/user-cascade-delete.ts](src/lib/user-cascade-delete.ts) — kompletne i uruchamiane przed usunięciem konta.

---

## 8. Zbiorcza lista priorytetów

| # | Priorytet | Problem | Plik |
|---|---|---|---|
| 2.1 | **P0** | Logowanie jako dowolny user przez `impersonateUserId` | `src/lib/auth.ts:65` |
| 2.2 | **P0** | Rejestracja z dowolną rolą (admin) | `src/app/api/auth/register/route.ts:8,57` |
| 2.3 | **P0** | `env.local` z sekretami w gicie | `env.local`, `.gitignore` |
| 2.4 | **P0** | Zaszyty klucz Serper | `src/app/api/admin/gyms/import/route.ts:38` |
| 2.5 | **P0** | Endpointy bez autoryzacji (generate-image, conversations DELETE, public/exercises, fatsecret, admin/achievements) | wiele |
| 2.6 | **P0/P1** | JWT w `?token=` | `src/lib/api-auth.ts:29` |
| 2.7 | **P0/P1** | Stored XSS w artykułach (brak sanityzacji) | `*/knowledge-zone/*`, `RichTextEditor.tsx` |
| 2.8 | **P1** | Upload SVG z własnego originu | `src/app/api/upload/route.ts:27` |
| 2.9 | **P1** | Brak rate-limit i nagłówków bezpieczeństwa | `next.config.ts` |
| 3.1 | **P1** | Synchroniczne `params` → zepsute trasy diet | `trainer/diets/[id]`, `admin/diet-plans/[id]` |
| 3.2 | **P1** | Statystyki check-inów trenera zawsze puste | `trainer/athletes-stats/route.ts:61` |
| 3.3 | **P1** | Trener nie dostaje powiadomienia o check-inie | `check-ins/[id]/route.ts:159` |
| 3.4 | **P1** | Cele żywieniowe nigdy nie tworzone | `NutritionGoal` (brak API/UI) |
| 3.5 | **P1** | Panel trenera w SPA = atrapa | `athlete-spa/.../TrainerPanel.tsx` |
| 3.6 | **P1** | Zarządzanie artykułami na mocku | `*/knowledge-zone/manage` |
| 3.7 | **P1** | Niespójność ID konwersacji | `*/chat`, `inquiries-inbox.tsx` |
| 3.8 | **P1** | `ignoreBuildErrors` ukrywa ~220 błędów | `next.config.ts` |
| 3.9 | **P1** | Lint nie działa (root + SPA) | `package.json`, ESLint config |
| 4.x | **P2** | markAllAsRead stub, auto-save na watch(), GET mutujący wyzwania, brak cap limit, Content-Type obrazów, prywatność GET-ów, enumeracja konta, bundle mapbox, allowBackup, versionCode | — |
| 5.x | **P3** | Śmieci w repo (env/idea/duplikaty JSON), CI bez weryfikacji, tsconfig obejmuje SPA, resztki Prisma/UploadThing, martwe linki landing | — |
| 6.x | **P2** | Błędy typów: `toJSON` modeli, Zod v4 + RHF, brakujące @types, FullCalendar, duplikat `IMuscleGroup` | — |

---

## 9. Sugerowana kolejność prac

1. **Dziś:** 2.3 (rotacja sekretów + usunięcie `env.local`), 2.1, 2.2, 2.4 — to są otwarte drzwi.
2. **Ten tydzień:** 2.5–2.9 (autoryzacje, XSS, SVG, rate-limit/nagłówki), 3.1–3.3 (szybkie, konkretne bugi).
3. **Następnie:** 3.4–3.7 (niedokończone funkcje), 3.8–3.9 + §6 (odblokowanie `tsc`/lint, potem wyłączenie `ignoreBuildErrors`), CI (5.2).
4. **Porządki:** reszta P2/P3.
