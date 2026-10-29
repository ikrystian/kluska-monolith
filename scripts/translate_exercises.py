#!/usr/bin/env python3
"""
Skrypt do automatycznego tłumaczenia ćwiczeń w bazie danych MongoDB
za pomocą API OpenRouter (model: google/gemini-3.5-flash-lite).

Działanie:
1. Łączy się z bazą danych MongoDB (zmienne z .env).
2. Pobiera pierwszy rekord z kolekcji 'exercises', który nie ma ustawionej flagi `translated: true`.
3. Wysyła zapytanie do OpenRouter z promptem trenera / tłumacza sportowego.
4. Aktualizuje rekord w bazie o przetłumaczoną nazwę, opis oraz flagę `translated: true`.
5. Powtarza proces dla kolejnych rekordów aż do przetłumaczenia wszystkich.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests
from dotenv import find_dotenv, load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

# ---------------------------------------------------------------------------
# Konfiguracja logowania
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("exercise_translator")


# ---------------------------------------------------------------------------
# Ładowanie zmiennych środowiskowych z .env
# ---------------------------------------------------------------------------
def load_environment() -> None:
    """
    Szuka i ładuje pliki .env z bieżącego oraz nadrzędnych katalogów (np. root monolit).
    Nie nadpisuje już istniejących zmiennych (override=False).
    """
    candidates = [
        Path.cwd() / ".env",
        Path.cwd().parent / ".env",
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]
    loaded = []
    seen = set()
    for candidate in candidates:
        if candidate.is_file():
            resolved = candidate.resolve()
            if resolved not in seen:
                seen.add(resolved)
                load_dotenv(resolved, override=False)
                loaded.append(str(resolved))

    if loaded:
        logger.info(f"Załadowano konfigurację z plików .env: {', '.join(loaded)}")
    else:
        logger.warning("Nie znaleziono żadnego pliku .env.")


# ---------------------------------------------------------------------------
# Połączenie z bazą danych MongoDB
# ---------------------------------------------------------------------------
def get_mongo_collection(
    uri_override: Optional[str] = None,
    db_override: Optional[str] = None,
    collection_name: str = "exercises",
) -> Tuple[MongoClient, Collection]:
    """Tworzy połączenie z MongoDB i zwraca klienta oraz kolekcję exercises."""
    uri = (
        uri_override
        or os.getenv("MONGO_DB_URI")
        or os.getenv("DATABASE_URL")
        or os.getenv("MONGODB_URI")
    )

    if not uri or "<db_password>" in uri:
        raise ValueError(
            "Niepoprawny lub brakujący URI bazy danych MongoDB w .env "
            "(MONGO_DB_URI lub DATABASE_URL). Upewnij się, że hasło nie jest placeholderem."
        )

    client: MongoClient = MongoClient(uri, serverSelectionTimeoutMS=10000)

    # Wykrycie nazwy bazy danych
    db_name = db_override or os.getenv("MONGO_DB_NAME")
    if not db_name:
        try:
            default_db = client.get_default_database()
            if default_db is not None:
                db_name = default_db.name
        except Exception:
            pass

    if not db_name or db_name in ("admin", "local"):
        # Sprawdzamy bazę 'test' lub domyślną
        db_name = "test"

    db: Database = client[db_name]
    collection: Collection = db[collection_name]

    # Sprawdzenie połączenia (ping)
    client.admin.command("ping")
    logger.info(f"Połączono z MongoDB | Baza: '{db_name}' | Kolekcja: '{collection_name}'")

    return client, collection


# ---------------------------------------------------------------------------
# Komunikacja z OpenRouter API
# ---------------------------------------------------------------------------
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-3.5-flash-lite"


def call_openrouter_translation(
    name: str,
    description: str,
    api_key: str,
    model: str = DEFAULT_MODEL,
    max_retries: int = 3,
) -> Dict[str, str]:
    """
    Wysyła zapytanie do OpenRouter z prośbą o tłumaczenie nazwy i opisu ćwiczenia.
    Zwraca słownik: {"name": "...", "description": "..."}.
    """
    system_instruction = (
        "Jesteś profesjonalnym tłumaczem sportowym i certyfikowanym trenerem na siłowni.\n"
        "Twoim zadaniem jest przetłumaczenie nazwy oraz opisu ćwiczenia z języka angielskiego na poprawny język polski.\n"
        "Zasady:\n"
        "1. Nie tłumacz dosłownie (kalka językowa), lecz używaj naturalnego, powszechnie stosowanego w polskim środowisku fitness nazewnictwa.\n"
        "2. Nazwa musi być JEDNA. Jeżeli w języku polskim funkcjonuje kilka określeń, wybierz najbardziej popularną i standardową.\n"
        "3. Opis wykonania ćwiczenia ma być dokładny, ale zwięzły i instruktażowy.\n"
        "4. Odpowiedz WYŁĄCZNIE poprawnym obiektem JSON w formacie:\n"
        '{\n  "name": "Polska nazwa ćwiczenia",\n  "description": "Polski opis wykonania"\n}\n'
        "5. Nie dodawaj żadnych dodatkowych tekstów, komentarzy ani wyjaśnień."
    )

    user_prompt = (
        "jestes tlumaczem sportowym, trenerem na silowni. Na podstawie nazwy cwiczenia i opisu po angielsku "
        "masz zwrocic poprawna polska nazwe oraz poprawny opis wykonania. Nie tlumacz doslownie tylko poprawnie.\n\n"
        f"Nazwa: {name}\n"
        f"Opis: {description}\n\n"
        "wrocone dane w json - nazwa musi byc jedna, jezeli jest kilka wybierz ta najardziej popularna, "
        "opis cwiczenia - dokladny ale zwiezly. Bez dodatkowych tekstow, ani wyjasnien."
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kluska.app",
        "X-Title": "Kluska Exercise Translator",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.5,
    }

    for attempt in range(1, max_retries + 1):
        try:
            response = requests.post(
                OPENROUTER_URL, headers=headers, json=payload, timeout=45
            )

            # Obsługa limitów zapytań (429 Rate Limit) lub błędów serwera (5xx)
            if response.status_code == 429 or response.status_code >= 500:
                wait_time = attempt * 3
                logger.warning(
                    f"OpenRouter zwrócił status {response.status_code}. "
                    f"Próba {attempt}/{max_retries}. Czekam {wait_time}s..."
                )
                time.sleep(wait_time)
                continue

            if not response.ok:
                raise RuntimeError(
                    f"Błąd OpenRouter API [{response.status_code}]: {response.text}"
                )

            res_json = response.json()
            raw_content = (
                res_json.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )

            if not raw_content:
                raise ValueError("Model zwrócił pustą odpowiedź.")

            # Oczyszczenie z markdown fences ```json ... ``` jeśli model je dodał
            clean_content = raw_content
            if clean_content.startswith("```"):
                clean_content = re.sub(r"^```(?:json)?\s*", "", clean_content)
                clean_content = re.sub(r"\s*```$", "", clean_content)

            try:
                data = json.loads(clean_content)
            except json.JSONDecodeError:
                # Próba wyciągnięcia pierwszego bloku {...} za pomocą regex
                match = re.search(r"\{.*\}", clean_content, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                else:
                    raise

            # Obsługa zarówno kluczy angielskich jak i polskich
            translated_name = (data.get("name") or data.get("nazwa") or "").strip()
            translated_desc = (
                data.get("description") or data.get("opis") or ""
            ).strip()

            if not translated_name:
                raise ValueError("Brak pola 'name'/'nazwa' w odpowiedzi JSON.")

            return {
                "name": translated_name,
                "description": translated_desc or description,
            }

        except Exception as e:
            if attempt == max_retries:
                raise
            wait_time = attempt * 2
            logger.warning(
                f"Błąd podczas zapytania do OpenRouter ({e}). Próba {attempt}/{max_retries}. "
                f"Ponawiam za {wait_time}s..."
            )
            time.sleep(wait_time)

    raise RuntimeError("Nie udało się pobrać tłumaczenia po wyczerpaniu prób.")


# ---------------------------------------------------------------------------
# Główna pętla tłumaczenia rekordów
# ---------------------------------------------------------------------------
def run_translation_loop(
    collection: Collection,
    api_key: str,
    model: str = DEFAULT_MODEL,
    limit: Optional[int] = None,
    delay: float = 0.5,
    dry_run: bool = False,
) -> None:
    """
    Iteruje po rekordach exercises gdzie translated != True,
    tłumaczy je i aktualizuje w bazie danych.
    """
    total_untranslated = collection.count_documents({"translated": {"$ne": True}})
    logger.info(f"Liczba ćwiczeń oczekujących na tłumaczenie: {total_untranslated}")

    if total_untranslated == 0:
        logger.info("Wszystkie ćwiczenia są już przetłumaczone (translated=True)!")
        return

    processed_count = 0
    failed_ids = set()

    # Flaga obsługi przerwania (Ctrl+C)
    interrupted = False

    def sigint_handler(signum, frame):
        nonlocal interrupted
        logger.info("\nOtrzymano sygnał przerwania. Kończenie bieżącego ćwiczenia...")
        interrupted = True

    signal.signal(signal.SIGINT, sigint_handler)

    while not interrupted:
        if limit is not None and processed_count >= limit:
            logger.info(f"Osiągnięto zadany limit {limit} przetłumaczonych rekordów.")
            break

        # Pobieramy pierwszy rekord bez translated=True, pomijając ewentualne trwale uszkodzone
        query: Dict[str, Any] = {"translated": {"$ne": True}}
        if failed_ids:
            query["_id"] = {"$nin": list(failed_ids)}

        exercise = collection.find_one(query, sort=[("_id", 1)])

        if not exercise:
            logger.info("Brak kolejnych rekordów do przetłumaczenia. Zakończono!")
            break

        ex_id = exercise["_id"]
        original_name = (exercise.get("name") or "").strip()
        original_description = (
            exercise.get("description")
            or exercise.get("instructions")
            or "Brak opisu"
        ).strip()

        logger.info(
            f"\n[{processed_count + 1}] Przetwarzanie ID: {ex_id} | EN: '{original_name}'"
        )

        try:
            # Zapytanie do OpenRouter
            translation = call_openrouter_translation(
                name=original_name,
                description=original_description,
                api_key=api_key,
                model=model,
            )

            new_name = translation["name"]
            new_description = translation["description"]

            logger.info(f" -> PL Nazwa: {new_name}")
            logger.info(
                f" -> PL Opis:  {new_description[:100]}..."
                if len(new_description) > 100
                else f" -> PL Opis:  {new_description}"
            )

            if not dry_run:
                # Aktualizacja rekordu w MongoDB
                update_doc = {
                    "$set": {
                        "name": new_name,
                        "description": new_description,
                        "translated": True,
                        "translated_at": datetime.now(timezone.utc),
                    }
                }
                # Zachowaj oryginalne angielskie wartości w polach pomocniczych dla bezpieczeństwa
                if "original_name" not in exercise:
                    update_doc["$set"]["original_name"] = original_name
                if "original_description" not in exercise:
                    update_doc["$set"]["original_description"] = original_description

                collection.update_one({"_id": ex_id}, update_doc)
                logger.info(f" -> Pomyślnie zaktualizowano rekord w MongoDB.")
            else:
                logger.info(" -> [DRY-RUN] Rekord NIE został zaktualizowany w bazie.")

            processed_count += 1

            if delay > 0:
                time.sleep(delay)

        except Exception as err:
            logger.error(
                f"Błąd podczas tłumaczenia ćwiczenia ID {ex_id} ('{original_name}'): {err}"
            )
            failed_ids.add(ex_id)
            # Krótka pauza przed kolejnym
            time.sleep(2)

    logger.info(
        f"\nPodsumowanie: Przetłumaczono pomyślnie {processed_count} ćwiczeń "
        f"(błędów/pominiętych: {len(failed_ids)})."
    )


# ---------------------------------------------------------------------------
# CLI Entrypoint
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tłumaczenie bazy ćwiczeń MongoDB za pomocą OpenRouter (Gemini 3.5 Flash Lite)"
    )
    parser.add_argument(
        "--limit",
        "-n",
        type=int,
        default=None,
        help="Maksymalna liczba rekordów do przetłumaczenia (domyślnie: wszystkie)",
    )
    parser.add_argument(
        "--delay",
        "-d",
        type=float,
        default=0.5,
        help="Odstęp w sekundach między zapytaniami do API (domyślnie: 0.5s)",
    )
    parser.add_argument(
        "--model",
        "-m",
        type=str,
        default=os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL),
        help=f"Model OpenRouter (domyślnie: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Tylko test - wykonuje tłumaczenie przez API bez zapisu do bazy",
    )
    parser.add_argument(
        "--db-uri",
        type=str,
        default=None,
        help="Opcjonalny URI do bazy MongoDB (nadpisuje .env)",
    )
    parser.add_argument(
        "--db-name",
        type=str,
        default=None,
        help="Opcjonalna nazwa bazy danych (domyślnie 'test' lub z URI)",
    )

    args = parser.parse_args()

    load_environment()

    api_key = (
        os.getenv("OPEN_ROUTER_API_KEY")
        or os.getenv("OPENROUTER_API_KEY")
        or os.getenv("OPENROUTER_KEY")
    )

    if not api_key or api_key == "your-open-router-api-key":
        logger.error(
            "Brak ważnego klucza API OpenRouter! "
            "Ustaw zmienną OPEN_ROUTER_API_KEY w pliku .env."
        )
        sys.exit(1)

    try:
        client, collection = get_mongo_collection(
            uri_override=args.db_uri,
            db_override=args.db_name,
        )
    except Exception as e:
        logger.error(f"Nie udało się połączyć z bazą danych MongoDB: {e}")
        sys.exit(1)

    try:
        run_translation_loop(
            collection=collection,
            api_key=api_key,
            model=args.model,
            limit=args.limit,
            delay=args.delay,
            dry_run=args.dry_run,
        )
    finally:
        client.close()


if __name__ == "__main__":
    main()
