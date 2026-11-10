#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Skrypt automatyzacji publikacji przepisów dietetycznych do Bazy Wiedzy Kluska.
Generuje pełnowartościowy wpis dietetyczny przy użyciu OpenRouter (Gemini),
zawierający połączenie z konkretnym posiłkiem, pełną kartę makroskładników,
dokładne gramatury składników, instrukcję przygotowania krok po kroku oraz
dane strukturalne 'recipe' umożliwiające dodanie posiłku do dzienniczka kalorii.
"""

import argparse
import json
import os
import random
import re
import sys
import requests

def load_env_file(env_path: str):
    if not os.path.isfile(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"\'')
            if k not in os.environ:
                os.environ[k] = v

# Automatyczne załadowanie .env z katalogu nadrzędnego
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
load_env_file(os.path.join(PROJECT_DIR, ".env"))

APP_URL = os.getenv("APP_URL", "http://localhost:3001").rstrip("/")
DEFAULT_API_URL = os.getenv("KLUSKA_API_URL", f"{APP_URL}/api/external/posts")
DEFAULT_OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY", "")
DEFAULT_KLUSKA_KEY = os.getenv("EXTERNAL_POSTS_API_KEY") or os.getenv("KLUSKA_API_KEY", "kluska-external-posts-secret-token")
DEFAULT_USER_ID = os.getenv("KLUSKA_USER_ID", "6a5cf516f9fe894c859bb9af")
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

CURATED_RECIPES = [
    {
        "name": "Wysokobiałkowy bowl z pieczonym łososiem, komosą ryżową i awokado",
        "mealType": "Lunch",
        "focus": "Bogate źródło kwasów Omega-3, pełny profil aminokwasowy i węglowodany złożone o niskim IG."
    },
    {
        "name": "Puszysty omlet białkowy z pieczonym indykiem, szpinakiem i suszonymi pomidorami",
        "mealType": "Breakfast",
        "focus": "Szybki wyrzut leucyny o poranku, zero spadków glikemii i wysoka sytość."
    },
    {
        "name": "Nocna owsianka Pro-Recovery z izolatem serwatki, borówkami i pastą migdałową",
        "mealType": "Breakfast",
        "focus": "Resynteza glikogenu, polifenole przyspieszające regenerację mięśni i stabilna energia."
    },
    {
        "name": "Fit burger wołowy 95% z sosem jogurtowo-czosnkowym i pieczonymi frytkami z batatów",
        "mealType": "Dinner",
        "focus": "Żelazo hemowe, naturalna kreatyna z chudej wołowiny i potas z batatów."
    },
    {
        "name": "Pełnoziarnisty makaron z polędwiczką drobiową, młodą cukinią i kremową ricottą",
        "mealType": "Lunch",
        "focus": "Łatwostrawne białko, niska zawartość tłuszczów nasyconych i optymalne ładowanie węglowodanami."
    },
    {
        "name": "Aromatyczne curry z ciecierzycą, piersią z kurczaka i lekkim mleczkiem kokosowym",
        "mealType": "Dinner",
        "focus": "Błonnik rozpuszczalny, kurkumina o działaniu przeciwzapalnym i wysoka sytość na redukcji."
    },
    {
        "name": "Wysokobiałkowe placuszki twarogowe z sosem z leśnych malin i nasionami chia",
        "mealType": "Breakfast",
        "focus": "Połączenie kazeiny i serwatki, niski ładunek glikemiczny i wysoka zawartość wapnia."
    },
    {
        "name": "Sałatka śródziemnomorska z tuńczykiem, jajkiem na miękko, oliwą i pestkami dyni",
        "mealType": "Dinner",
        "focus": "Cynk, magnez, nienasycone kwasy tłuszczowe i wsparcie wieczornej regeneracji układu nerwowego."
    },
    {
        "name": "Pieczony filet z dorsza atlantyckiego z puree z kalafiora z czosnkiem i szparagami",
        "mealType": "Dinner",
        "focus": "Maksymalna gęstość odżywcza przy minimalnej kaloryczności, jod i witaminy z grupy B."
    },
    {
        "name": "Rozgrzewający gulasz z udźca indyka z warzywami korzeniowymi i kaszą gryczaną",
        "mealType": "Lunch",
        "focus": "Rutyna z kaszy gryczanej wspierająca naczynia krwionośne i zrównoważone uwalnianie aminokwasów."
    },
    {
        "name": "Tofu scramble z kurkumą, warzywami ogrodowymi i chlebem żytnim na zakwasie",
        "mealType": "Breakfast",
        "focus": "Fitosterole, żelazo niehemowe z witaminą C i fermentowane węglowodany wspierające mikrobiom."
    },
    {
        "name": "Fit zapiekanka pasterska z mięsem z indyka, warzywami i pierzynką z batata",
        "mealType": "Lunch",
        "focus": "Idealne danie do przygotowania na 3 dni: witamina A, wysoka zawartość białka i beta-karotenu."
    },
    {
        "name": "Pełnoziarnisty wrap z grillowaną piersią z kurczaka, hummusem i chrupiącymi warzywami",
        "mealType": "Lunch",
        "focus": "Mobilny posiłek sportowca, optymalny stosunek białka do węglowodanów 1:2."
    },
    {
        "name": "Shakshuka z 3 jaj z wolnego wybiegu, papryką, kuminem i serem feta",
        "mealType": "Breakfast",
        "focus": "Cholina dla optymalnej pracy mózgu, luteina i wysoka biodostępność aminokwasów jaj."
    },
    {
        "name": "Pudding chia z izolatem białkowym, sosem mango i prażonymi migdałami",
        "mealType": "Snack",
        "focus": "Kwasy ALA, 30g białka w porcji i wsparcie perystaltyki jelit dzięki śluzom chia."
    },
    {
        "name": "Stek z polędwicy wołowej z pieczonymi młodymi ziemniakami i fasolką szparagową",
        "mealType": "Dinner",
        "focus": "Karnityna, cynk i żelazo hemowe kluczowe dla optymalizacji poziomu wolnego testosteronu."
    }
]

FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999",
    "https://images.unsplash.com/photo-1532384748853-8f54a8f476e2",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
    "https://images.unsplash.com/photo-1525351484163-7529414344d8",
    "https://images.unsplash.com/photo-1543339308-43e59d6b73a6",
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327",
    "https://images.unsplash.com/photo-1547496502-affa22d38842",
]

SYSTEM_PROMPT = """Jesteś doświadczonym dietetykiem sportowym i szefem kuchni dietetycznej piszącym dla platformy Kluska. Twoimi odbiorcami są osoby trenujące siłowo, biegacze i sportowcy, którzy oczekują precyzji, doskonałego smaku i konkretnych wartości odżywczych.

Twoim celem jest przygotowanie profesjonalnego, praktycznego wpisu z PRZEPISEM DIETETYCZNYM. 

KRYTYCZNY ELEMENT POSTA – POŁĄCZENIE Z POSIŁKIEM I KARTA MAKRO:
Wpis MUSI zawierać:
1. Obiekt strukturalny "recipe" w formacie JSON (pozwala użytkownikowi jednym kliknięciem dodać posiłek do Dzienniczka Kalorii w aplikacji).
   - "dishName": nazwa potrawy (krótka, do 80 znaków)
   - "servings": liczba porcji (zwykle 1)
   - "prepMinutes": czas przygotowania w minutach (np. 20)
   - "mealType": dokładnie jedna z wartości: "Breakfast", "Lunch", "Dinner", "Snack"
   - "calories": całkowita liczba kalorii na 1 porcję (np. 550)
   - "protein": białko w gramach na 1 porcję (np. 45)
   - "carbs": węglowodany w gramach na 1 porcję (np. 50)
   - "fat": tłuszcze w gramach na 1 porcję (np. 16)
2. W treści HTML (pole "content"):
   - Merytoryczny wstęp dietetyczny wyjaśniający fizjologiczne zalety posiłku.
   - Wyraźną Kartę Posiłku (nagłówek <h3>) z tabelą makroskładników.
   - Listę składników z DOKŁADNYMI GRAMATURAMI w gramach (<ul>).
   - Instrukcję przygotowania krok po kroku (<ol>).
   - Wskazówki dietetyka (<blockquote>): timing, biodostępność, zamienniki.

ZASADY ANTY-AI (KRYTYCZNIE WAŻNE):
1. ZAKAZ banałów wstępnych: NIGDY nie zaczynaj od zdań: "W dzisiejszym zabieganym świecie...", "Zdrowa dieta to klucz...", "Wielu z nas szuka pomysłu na...". Zacznij od razu od konkretu dietetycznego.
2. ZAKAZ pustosłowia: Żadnych "game-changer", "kluczowy element", "w pigułce", "holistyczny".
3. Precyzyjne liczby i gramatury.
4. Formatowanie HTML: Treść w "content" MUSI być poprawnym kodem HTML (<h3>, <p>, <ul>, <ol>, <li>, <strong>, <blockquote>, <table>, <tr>, <th>, <td>). Nie używaj tagów <h1> ani <h2>.

FORMAT ODPOWIEDZI:
Zwróć WYŁĄCZNIE poprawny, surowy obiekt JSON:
{
  "userId": "{{USER_ID}}",
  "title": "Chwytliwy, profesjonalny tytuł przepisu z podsumowaniem makro",
  "category": "Przepisy",
  "coverImageUrl": "https://images.unsplash.com/photo-...",
  "status": "published",
  "recipe": {
    "dishName": "Wysokobiałkowy bowl z pieczonym łososiem",
    "servings": 1,
    "prepMinutes": 25,
    "mealType": "Lunch",
    "calories": 610,
    "protein": 45,
    "carbs": 50,
    "fat": 24
  },
  "content": "<p>Wstęp...</p><h3>🍲 Karta Posiłku: Nazwa</h3><table><tr><th>Makroskładnik</th><th>Wartość</th></tr>...</table><h4>Składniki:</h4><ul><li>...</li></ul><h4>Przygotowanie:</h4><ol><li>...</li></ol><blockquote>Wskazówka dietetyka...</blockquote>"
}"""

USER_PROMPT_TEMPLATE = """Przygotuj kompletny artykuł z przepisem dietetycznym na platformę Kluska:

DANIE / TEMAT: {topic}
TYP POSIŁKU (mealType): {meal_type}
CEL / AKCENT ODŻYWCZY: {focus}
ID AUTORA: {user_id}

Pamiętaj o sekcji "recipe" z makroskładnikami na 1 porcję oraz dopasowanym zdjęciu z Unsplash."""


def check_image_url(url: str) -> bool:
    if not url or not url.startswith("https://images.unsplash.com/"):
        return False
    try:
        r = requests.head(url, timeout=5, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


def get_fallback_image() -> str:
    return random.choice(FALLBACK_IMAGES)


def clean_html_content(content: str) -> str:
    content = re.sub(r"<\s*h1[^>]*>.*?<\s*/\s*h1\s*>", "", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"<\s*h2[^>]*>(.*?)<\s*/\s*h2\s*>", r"<h3>\1</h3>", content, flags=re.IGNORECASE | re.DOTALL)
    return content.strip()


def generate_recipe_post(recipe_info: dict, user_id: str, openrouter_key: str, model: str) -> dict:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
    }
    user_prompt = USER_PROMPT_TEMPLATE.format(
        topic=recipe_info.get("name", "Pełnowartościowy posiłek sportowca"),
        meal_type=recipe_info.get("mealType", "Lunch"),
        focus=recipe_info.get("focus", "Optymalny bilans makroskładników i wysoka gęstość odżywcza."),
        user_id=user_id,
    )
    
    # Lista modeli z fallbackiem na wypadek chwilowego przeciążenia 429
    models_to_try = [model]
    for m in ["google/gemini-2.5-flash", "google/gemini-flash-1.5", "meta-llama/llama-3.3-70b-instruct"]:
        if m not in models_to_try:
            models_to_try.append(m)

    resp_json = None
    last_error = None

    for candidate_model in models_to_try:
        payload = {
            "model": candidate_model,
            "temperature": 0.7,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT.replace("{{USER_ID}}", user_id)},
                {"role": "user", "content": user_prompt},
            ],
        }

        for attempt in range(1, 3):
            print(f"[*] Generowanie przepisu przez OpenRouter ({candidate_model}, próba {attempt}) dla: '{recipe_info.get('name')}'...")
            try:
                r = requests.post(url, headers=headers, json=payload, timeout=90)
                if r.status_code == 200:
                    resp_json = r.json()
                    break
                elif r.status_code == 429:
                    print(f"[-] Model {candidate_model} jest chwilowo przeciążony (429). Czekam 3s przed ponowieniem/fallbackiem...")
                    import time
                    time.sleep(3)
                    last_error = f"HTTP 429: {r.text}"
                else:
                    last_error = f"HTTP {r.status_code}: {r.text}"
                    break
            except Exception as e:
                last_error = str(e)
                break
        if resp_json:
            break

    if not resp_json:
        raise RuntimeError(f"OpenRouter zwrócił błąd: {last_error}")

    choices = resp_json.get("choices")
    if not choices or not choices[0].get("message"):
        raise RuntimeError(f"Brak odpowiedzi od OpenRouter: {resp_json}")

    raw_text = choices[0]["message"].get("content", "").strip()
    match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
    if not match:
        raise RuntimeError(f"Brak poprawnego JSON-a w odpowiedzi modelu: {raw_text[:300]}")

    post_data = json.loads(match.group(1))

    title = str(post_data.get("title", recipe_info.get("name", "Przepis dietetyczny"))).strip()
    content = clean_html_content(str(post_data.get("content", "")))
    cover_image = post_data.get("coverImageUrl", "")
    raw_recipe = post_data.get("recipe", {})

    if not check_image_url(cover_image):
        cover_image = get_fallback_image()

    meal_type = raw_recipe.get("mealType") or recipe_info.get("mealType", "Lunch")
    if meal_type not in ["Breakfast", "Lunch", "Dinner", "Snack"]:
        meal_type = "Lunch"

    recipe_block = {
        "dishName": str(raw_recipe.get("dishName") or title)[:100],
        "servings": max(1, int(raw_recipe.get("servings", 1))),
        "prepMinutes": max(5, int(raw_recipe.get("prepMinutes", 20))),
        "mealType": meal_type,
        "calories": max(1, int(raw_recipe.get("calories", 500))),
        "protein": round(float(raw_recipe.get("protein", 30)), 1),
        "carbs": round(float(raw_recipe.get("carbs", 40)), 1),
        "fat": round(float(raw_recipe.get("fat", 15)), 1),
    }

    return {
        "userId": user_id,
        "title": title,
        "category": "Przepisy",
        "coverImageUrl": cover_image,
        "status": "published",
        "content": content,
        "recipe": recipe_block,
    }


def publish_to_kluska(post_payload: dict, api_url: str, kluska_key: str):
    headers = {
        "Content-Type": "application/json",
        "x-api-key": kluska_key,
    }
    print(f"[*] Publikowanie przepisu na endpoint {api_url}...")
    r = requests.post(api_url, headers=headers, json=post_payload, timeout=30)
    print(f"[*] Status HTTP: {r.status_code}")
    print(f"[*] Odpowiedź serwera: {r.text}")
    return r.status_code, r.text


def main():
    parser = argparse.ArgumentParser(description="Publikacja przepisu dietetycznego z makroskładnikami do Bazy Wiedzy Kluska")
    parser.add_argument("--topic", "-t", type=str, default="", help="Konkretna nazwa lub temat dania")
    parser.add_argument("--meal-type", type=str, default="Lunch", choices=["Breakfast", "Lunch", "Dinner", "Snack"])
    parser.add_argument("--user-id", "-u", type=str, default=DEFAULT_USER_ID)
    parser.add_argument("--api-url", type=str, default=DEFAULT_API_URL)
    parser.add_argument("--kluska-key", type=str, default=DEFAULT_KLUSKA_KEY)
    parser.add_argument("--openrouter-key", type=str, default=DEFAULT_OPENROUTER_KEY)
    parser.add_argument("--model", "-m", type=str, default=DEFAULT_MODEL)
    parser.add_argument("--dry-run", action="store_true", help="Wygeneruj artykuł i dane posiłku bez wysyłania do API")

    args = parser.parse_args()

    if not args.openrouter_key:
        print("[-] Błąd: Brak klucza API OpenRouter. Podaj parametr --openrouter-key lub ustaw zmienną OPENROUTER_API_KEY w .env.", file=sys.stderr)
        sys.exit(1)

    if args.topic.strip():
        recipe_info = {
            "name": args.topic.strip(),
            "mealType": args.meal_type,
            "focus": "Pełnowartościowy bilans makro, wysoka biodostępność składników odżywczych."
        }
    else:
        recipe_info = random.choice(CURATED_RECIPES)
        print(f"[*] Wylosowano przepis: {recipe_info['name']} ({recipe_info['mealType']})")

    post = generate_recipe_post(
        recipe_info=recipe_info,
        user_id=args.user_id,
        openrouter_key=args.openrouter_key,
        model=args.model,
    )

    rec = post.get("recipe", {})
    print("\n" + "=" * 60)
    print(f"TYTUŁ: {post['title']}")
    print(f"KATEGORIA: {post['category']}")
    print(f"AUTOR ID: {post['userId']}")
    print(f"ZDJĘCIE: {post['coverImageUrl']}")
    print(f"POŁĄCZONY POSIŁEK: {rec.get('dishName')}")
    print(f"MAKRO: {rec.get('calories')} kcal | B: {rec.get('protein')}g | W: {rec.get('carbs')}g | T: {rec.get('fat')}g | Pora: {rec.get('mealType')}")
    print(f"CZAS: {rec.get('prepMinutes')} min | PORCJE: {rec.get('servings')}")
    print(f"DŁUGOŚĆ HTML: {len(post['content'])} znaków")
    print("=" * 60 + "\n")

    if args.dry_run:
        print("[*] Tryb --dry-run: wpis NIE został wysłany do API.")
        print(json.dumps(post, indent=2, ensure_ascii=False))
        return

    status_code, resp_text = publish_to_kluska(post, args.api_url, args.kluska_key)
    if status_code in (200, 201):
        print("[+] Przepis dietetyczny został pomyślnie opublikowany w Bazie Wiedzy!")
    else:
        print(f"[-] Błąd publikacji: Serwer zwrócił HTTP {status_code}.")
        sys.exit(1)


if __name__ == "__main__":
    main()
