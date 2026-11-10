#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Skrypt automatyzacji publikacji merytorycznych wpisów do Bazy Wiedzy Kluska.
Generuje wpis przy użyciu OpenRouter (Gemini), waliduje treść wg zasad anty-AI
oraz wysyła go do endpointu API Kluska.
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

CURATED_TOPICS = [
    "Przerwy między seriami a hipertrofia i napięcie mechaniczne",
    "Rzeczywisty wpływ rozciągania statycznego na regenerację i siłę maksymalną",
    "Optymalna gęstość odżywcza i podaż leucyny w posiłku potreningowym",
    "Kinetyka resyntezy glikogenu mięśniowego po intensywnym treningu biegowym",
    "Zakres ruchu (ROM) a uszkodzenia mięśniowe i hipertrofia w długich długościach sarkomerów",
    "Wpływ jakości snu (faza N3 i REM) na wyrzut hormonu wzrostu i resyntezę białek",
    "Tempo powtórzeń a napięcie mechaniczne i rekrutacja jednostek motorycznych",
    "Nawodnienie, równowaga elektrolitowa i spadek siły izometrycznej przy 2% odwodnieniu",
    "Periodyzacja falowa vs liniowa u osób średniozaawansowanych",
    "Zimne kąpiele (ice baths) po treningu siłowym a tłumienie kinazy mTORC1",
    "Wpływ kofeiny bezwodnej na próg zmęczenia mięśniowego i odczuwanie wysiłku (RPE)",
    "Mikrocykle roztrenowania (deload) - wskaźniki somatyczne i obniżenie objętości",
    "Trening do załamania mięśniowego (RIR 0) a akumulacja zmęczenia centralnego (CNS)",
    "Pora przyjmowania kreatyny i nasycenie fosfokreatyną w komórkach mięśniowych",
    "Współczynnik kadencji i długość kroku w ekonomii biegu długodystansowego",
    "Progression overload bez zwiększania ciężaru: manipulacja gęstością i czasem pod napięciem (TUT)",
    "Białko przed snem: czy kazeina micelarna realnie ogranicza nocny katabolizm?",
    "Wpływ alkoholu na powysiłkową syntezę białek mięśniowych (MPS)",
    "Rola intra-workout carbs w długich jednostkach biegowych powyżej 90 minut",
    "Rozgrzewka dynamiczna vs trucht: podniesienie temperatury tkanki i aktywacja układu nerwowego"
]

FALLBACK_IMAGES = {
    "Trening": [
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48",
        "https://images.unsplash.com/photo-1518611012118-696072aa579a"
    ],
    "Dieta i Suplementacja": [
        "https://images.unsplash.com/photo-1490645935967-10de6ba17061",
        "https://images.unsplash.com/photo-1532384748853-8f54a8f476e2",
        "https://images.unsplash.com/photo-1540420773420-3366772f4999"
    ],
    "Regeneracja": [
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773",
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd"
    ],
    "Motywacja": [
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211",
        "https://images.unsplash.com/photo-1483721074574-e399043773bf",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b"
    ]
}

SYSTEM_PROMPT = """Jesteś doświadczonym trenerem przygotowania motorycznego, dietetykiem sportowym i autorem z wieloletnim stażem na sali treningowej. Piszesz dla sportowców i osób trenujących na co dzień z aplikacją Kluska.

Twoim celem jest przygotowanie merytorycznego, konkretnego wpisu do Bazy Wiedzy na zadany temat, popartego badaniami naukowymi (fizjologia, biochemia wysiłku, biomechanika) oraz realną praktyką trenerską.

ZASADY ANTY-AI (KRYTYCZNIE WAŻNE):
1. ZAKAZ banałów wstępnych: NIGDY nie zaczynaj od zdań typu: "W dzisiejszym zabieganym świecie...", "Wielu z nas zastanawia się...", "Trening to nie tylko pot, ale i...", "Zanurzmy się w świat...". Zacznij od razu od problemu, mechanizmu fizjologicznego lub mocnej tezy.
2. ZAKAZ pustosłowia i słów-wytrychów: Nie używaj słów: "kluczowy", "fundamentalny", "holistyczny", "game-changer", "warto pamiętać", "podsumowując", "rekapitulując", "w pigułce", "nieodłączny element".
3. Styl i rytm:
   - Pisz jak człowiek do człowieka: prosto, ale z użyciem precyzyjnej terminologii (np. "resynteza fosfokreatyny", "przekrój poprzeczny włókna (CSA)", "napięcie mechaniczne w fazie ekscentrycznej").
   - Mieszaj krótkie, dosadne zdania z bardziej złożonymi.
   - Pisz w pierwszej osobie liczby pojedynczej lub mnogiej praktyka (np. "Na siłowni najczęściej widzę...", "W praktyce sprawdza się...", "Zamiast dokładać kolejną serię...").
4. Konkrety zamiast ogólników:
   - Podawaj liczby, widełki i zakresy (np. "1.6–2.2 g białka na kg masy ciała", "RPE 7-8", "2-3 minuty przerwy między seriami roboczymi"), a nie "jedz odpowiednią ilość białka" czy "odpoczywaj wystarczająco długo".
   - Podawaj mechanizmy: dlaczego dane rozwiązanie działa, a co jest powszechnym mitem.
5. Formatowanie treści (HTML):
   - Treść wpisu w polu "content" MUSI być poprawnym kodem HTML (tagi: <h3>, <p>, <ul>, <li>, <strong>, <blockquote>).
   - Nie używaj tagu <h1> ani <h2> wewnątrz content (tytuł wpisu wyświetla aplikacja).
   - Dziel tekst na zwięzłe akapity (2-4 zdania).

FORMAT ODPOWIEDZI:
Zwróć WYŁĄCZNIE poprawny, surowy obiekt JSON (bez znaczników ```json i bez żadnego komentarza przed ani po).
Format JSON:
{
  "userId": "{{USER_ID}}",
  "title": "Konkretny, intrygujący, specjalistyczny tytuł bez taniego clickbaitu",
  "category": "Trening | Dieta i Suplementacja | Regeneracja | Motywacja",
  "coverImageUrl": "URL do zdjęcia na Unsplash pasującego tematycznie",
  "status": "published",
  "content": "<p>Treść wpisu w formacie HTML...</p>"
}"""

USER_PROMPT_TEMPLATE = """Przygotuj wpis do Bazy Wiedzy na poniższy temat:

TEMAT: {topic}
GRUPA DOCELOWA: Osoby trenujące siłowo / biegacze szukający realnych wskazówek, a nie teorii z marketingu suplementów.
ID AUTORA: {user_id}

Wymagania dla tego wpisu:
1. Rozpraw się z co najmniej jednym powszechnym mitem na ten temat.
2. Wyjaśnij mechanizm działania (fizjologia/biomechanika).
3. Podaj 3 konkretne, możliwe do wdrożenia od zaraz zalecenia z dokładnymi liczbami/parametrami.
4. Dobierz pasującą kategorię (wybierz jedną: "Trening", "Dieta i Suplementacja", "Regeneracja", "Motywacja").
5. Podaj tematyczny URL do zdjęcia z Unsplash (np. https://images.unsplash.com/photo-...)."""


def check_image_url(url: str) -> bool:
    if not url or not url.startswith("https://images.unsplash.com/"):
        return False
    try:
        r = requests.head(url, timeout=5, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


def get_fallback_image(category: str) -> str:
    cat_images = FALLBACK_IMAGES.get(category, FALLBACK_IMAGES["Trening"])
    return random.choice(cat_images)


def clean_html_content(content: str) -> str:
    content = re.sub(r"<\s*h1[^>]*>.*?<\s*/\s*h1\s*>", "", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r"<\s*h2[^>]*>(.*?)<\s*/\s*h2\s*>", r"<h3>\1</h3>", content, flags=re.IGNORECASE | re.DOTALL)
    return content.strip()


def generate_article(topic: str, user_id: str, openrouter_key: str, model: str) -> dict:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
    }
    user_prompt = USER_PROMPT_TEMPLATE.format(topic=topic, user_id=user_id)
    
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
            print(f"[*] Wysyłanie zapytania do OpenRouter ({candidate_model}, próba {attempt}) dla tematu: '{topic}'...")
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
    clean_text = raw_text
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    elif clean_text.startswith("```"):
        clean_text = clean_text[3:]
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]
    clean_text = clean_text.strip()

    post_data = None
    try:
        post_data = json.loads(clean_text, strict=False)
    except Exception:
        match = re.search(r"(\{.*\})", clean_text, re.DOTALL)
        if match:
            try:
                post_data = json.loads(match.group(1), strict=False)
            except Exception:
                pass

    if not post_data:
        raise RuntimeError(f"Brak poprawnego JSON-a w odpowiedzi: {raw_text[:300]}")

    title = str(post_data.get("title", "")).strip()
    content = clean_html_content(str(post_data.get("content", "")))
    cat = str(post_data.get("category", "Trening")).strip()

    valid_categories = ["Trening", "Dieta i Suplementacja", "Regeneracja", "Motywacja"]
    category = next((c for c in valid_categories if c.lower() == cat.lower()), "Trening")

    cover_image = post_data.get("coverImageUrl", "")
    if not check_image_url(cover_image):
        cover_image = get_fallback_image(category)

    return {
        "userId": user_id,
        "title": title,
        "category": category,
        "coverImageUrl": cover_image,
        "status": "published",
        "content": content,
    }


def publish_to_kluska(post_payload: dict, api_url: str, kluska_key: str):
    headers = {
        "Content-Type": "application/json",
        "x-api-key": kluska_key,
    }
    print(f"[*] Publikowanie wpisu na {api_url}...")
    r = requests.post(api_url, headers=headers, json=post_payload, timeout=30)
    print(f"[*] Status HTTP: {r.status_code}")
    print(f"[*] Odpowiedź: {r.text}")
    return r.status_code, r.text


def main():
    parser = argparse.ArgumentParser(description="Publikacja merytorycznego artykułu w Bazie Wiedzy Kluska")
    parser.add_argument("--topic", "-t", type=str, default="", help="Temat artykułu")
    parser.add_argument("--user-id", "-u", type=str, default=os.getenv("KLUSKA_USER_ID", DEFAULT_USER_ID))
    parser.add_argument("--api-url", type=str, default=os.getenv("KLUSKA_API_URL", DEFAULT_API_URL))
    parser.add_argument("--kluska-key", type=str, default=os.getenv("KLUSKA_API_KEY", DEFAULT_KLUSKA_KEY))
    parser.add_argument("--openrouter-key", type=str, default=os.getenv("OPENROUTER_API_KEY", DEFAULT_OPENROUTER_KEY))
    parser.add_argument("--model", "-m", type=str, default=os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL))
    parser.add_argument("--dry-run", action="store_true", help="Wygeneruj artykuł bez publikacji")

    args = parser.parse_args()

    if not args.openrouter_key:
        print("[-] Błąd: Wymagany klucz API OpenRouter. Podaj parametr --openrouter-key lub ustaw zmienną środowiskową OPENROUTER_API_KEY.", file=sys.stderr)
        sys.exit(1)

    topic = args.topic.strip()
    if not topic:
        topic = random.choice(CURATED_TOPICS)
        print(f"[*] Wylosowano temat dnia: {topic}")

    article = generate_article(
        topic=topic,
        user_id=args.user_id,
        openrouter_key=args.openrouter_key,
        model=args.model,
    )

    print("\n" + "=" * 60)
    print(f"TYTUŁ: {article['title']}")
    print(f"KATEGORIA: {article['category']}")
    print(f"AUTOR: {article['userId']}")
    print(f"ZDJĘCIE: {article['coverImageUrl']}")
    print(f"DŁUGOŚĆ HTML: {len(article['content'])} znaków")
    print("=" * 60 + "\n")

    if args.dry_run:
        print("[*] Tryb --dry-run: wpis NIE został wysłany do API.")
        print(json.dumps(article, indent=2, ensure_ascii=False))
        return

    status_code, resp_text = publish_to_kluska(article, args.api_url, args.kluska_key)
    if status_code in (200, 201):
        print("[+] Wpis został pomyślnie opublikowany!")
    else:
        print(f"[-] Ostrzeżenie: Serwer zwrócił HTTP {status_code}.")


if __name__ == "__main__":
    main()
