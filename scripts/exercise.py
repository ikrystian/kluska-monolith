import os
import base64
import json
import requests
import sys
import shutil
import glob
import time

# Constants
API_KEY = "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"
API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-4.1-mini"

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCREENS_DIR = os.path.join(SCRIPT_DIR, "screens")
OLD_DIR = os.path.join(SCRIPT_DIR, "old")

# Muscle Group Mapping: Polish -> English (MuscleGroupName enum)
MUSCLE_GROUP_MAPPING = {
    "Back" : "Plecy",
    "Biceps" : "Biceps",
    "Calves" : "Łydki",
    "Chest" : "Klatka piersiowa",
    "Chest" : "Klatka",
    "Core" : "Core",
    "Forearms" : "Przedramiona",
    "Full Body" : "Całe ciało",
    "Glutes" : "Pośladki",
    "Hamstrings" : "Uda tylne",
    "Lower Back" : "Dolna część pleców",
    "Quads" : "Uda przednie",
    "Quads" : "Czwórogłowy uda",
    "Rear Delts" : "Tylne barki",
    "Shoulders" : "Barki",
    "Anterior Tibialis" : "Mięsień piszczelowy przedni",
    "Traps" : "Kaptur",
    "Triceps" : "Triceps",
    "Adductors" : "Przywodziciele",
    "Hips" : "Biodra",
    "Abductors" : "Odwodziciele"
}

def get_images():
    """Gets the first two images alphabetically from the screens directory."""
    if not os.path.exists(SCREENS_DIR):
        print(f"Directory not found: {SCREENS_DIR}")
        return []

    # Get all files
    files = os.listdir(SCREENS_DIR)
    # Filter for images
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    images = [f for f in files if os.path.splitext(f)[1].lower() in image_extensions]
    
    # Sort alphabetically
    images.sort()
    
    # Return full paths of the first 2
    return [os.path.join(SCREENS_DIR, img) for img in images[:2]]

def move_images_to_old(image_paths):
    """Moves processed images to the old directory."""
    if not os.path.exists(OLD_DIR):
        os.makedirs(OLD_DIR)
        
    for path in image_paths:
        try:
            filename = os.path.basename(path)
            dest_path = os.path.join(OLD_DIR, filename)
            shutil.move(path, dest_path)
            print(f"Moved {filename} to {OLD_DIR}")
        except Exception as e:
            print(f"Error moving {path}: {e}")

def encode_image(image_path):
    """Encodes an image to a base64 string."""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except FileNotFoundError:
        print(f"Error: Image not found at {image_path}")
        return None

def map_muscle_groups(muscle_groups):
    """Maps muscle groups from Polish to English using MUSCLE_GROUP_MAPPING."""
    if not muscle_groups:
        return []
    
    mapped_groups = []
    for mg in muscle_groups:
        polish_name = mg.get('name', '').strip()
        english_name = MUSCLE_GROUP_MAPPING.get(polish_name, polish_name)
        
        if english_name != polish_name:
            print(f"  Mapped: '{polish_name}' -> '{english_name}'")
        else:
            print(f"  Warning: No mapping found for '{polish_name}', using as-is")
        
        mapped_groups.append({
            'name': english_name,
            'imageUrl': mg.get('imageUrl')
        })
    
    return mapped_groups

def main():
    if not API_KEY:
        print("Error: OPENROUTER_API_KEY environment variable not set.")
        return

    while True:
        # Get images dynamically
        image_paths = get_images()
        
        if not image_paths:
            print("No more images found in ./screens/. Exiting.")
            break
            
        print(f"Processing images: {image_paths}")

        # Encode images
        encoded_images = []
        for path in image_paths:
            encoded_img = encode_image(path)
            if encoded_img:
                encoded_images.append(encoded_img)
            else:
                print(f"Skipping invalid image: {path}")

        if not encoded_images:
            print("No valid images to process in this batch.")
            # Move them anyway to avoid infinite loop or just break? 
            # Better to try moving them to old to clear the queue
            print("Moving invalid images to old to prevent infinite loop...")
            move_images_to_old(image_paths)
            continue

        # Construct the prompt
        prompt_text = """
             ZASADY NADRZĘDNE:
                1. ZWRÓĆ WSZYSTKIE WARTOŚCI Z OBRAZKÓW - NIE POMIJAJ ŻADNYCH INFORMACJI W JEZYKU POLSKIM.
                2. NIE ZMIENIAJ, NIE INTERPRETUJ, NIE DODAWAJ NIC OD SIEBIE W JEZYKU POLSKIM.
                3. PRZEPISZ DOKŁADNIE TO, CO WIDZISZ NA OBRAZKACH
                4. ZWRÓĆ DANE W JĘZYKU POLSKIM
                5. ZACHOWAJ STRUKTURĘ JSON DOKŁADNIE JAK W PRZYKŁADZIE 

                ZADANIE:
                Przeanalizuj wszystkie dostarczone zdjęcia i wyekstrahuj z nich kompletne informacje o ćwiczeniu.
                Zwróć odpowiedź w formacie JSON zgodnie z poniższym szablonem.

                WYMAGANA STRUKTURA JSON:
                {
                "name": "Nazwa ćwiczenia (w języku polskim)",
                "mainMuscleGroups": [
                    { "name": "Nazwa mięśnia głównego 1", "imageUrl": "url-jeśli-dostępny" },
                    { "name": "Nazwa mięśnia głównego 2", "imageUrl": "url-jeśli-dostępny" }
                ],
                "secondaryMuscleGroups": [
                    { "name": "Nazwa mięśnia pomocniczego 1" },
                    { "name": "Nazwa mięśnia pomocniczego 2" }
                ],
                "setup": [
                    { "group": "Chwyt", "value": "rodzaj chwytu (w języku polskim)" },
                    { "group": "Pozycja", "value": "opis pozycji (w języku polskim)" },
                    { "group": "Sprzęt", "value": "rodzaj sprzętu (w języku polskim)" },
                    { "group": "Ustawienie", "value": "szczegóły ustawienia (w języku polskim)" }
                ],
                "ownerId": "public",
                "instructions": "Krok po kroku instrukcje wykonania ćwiczenia (wszystkie kroki z obrazka) (w języku polskim)",
                "description": "Szczegóły dotyczące sprzętu, typu chwytu, pozycji ciała itp. (wszystkie informacje z obrazka) (w języku polskim)",
                "type": "weight"
                }

                WAŻNE UWAGI:
                - W "setup" pogrupuj WSZYSTKIE dane konfiguracyjne z obrazka (chwyt, pozycja, sprzęt, ustawienia, itp.)
                - W "instructions" umieść WSZYSTKIE kroki wykonania ćwiczenia
                - W "mainMuscleGroups" i "secondaryMuscleGroups" wymień WSZYSTKIE widoczne mięśnie
                - W "description" umieść WSZYSTKIE dodatkowe informacje opisowe
                - "type" może być: "weight" | "duration" | "reps" (wybierz odpowiedni na podstawie obrazka)
                - Jeśli jakaś sekcja jest pusta na obrazku, zwróć pustą tablicę [] lub pusty string ""

                PRZYPOMNIENIE:
                ZWRÓĆ WSZYSTKIE WARTOŚCI Z OBRAZKÓW - KAŻDY PUNKT, KAŻDĄ INFORMACJĘ! W JEZYKU POLSKIM.
                NIE POMIJAJ ŻADNYCH SZCZEGÓŁÓW!
"""

        # Prepare message content
        content = [{"type": "text", "text": prompt_text}]
        for img_b64 in encoded_images:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{img_b64}"
                }
            })

        payload = {
            "model": MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ]
        }

        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000", # Optional, for OpenRouter rankings
            "X-Title": "Exercise Analysis Script" # Optional
        }

        try:
            print("Sending request to OpenRouter...")
            response = requests.post(API_URL, headers=headers, data=json.dumps(payload))
            response.raise_for_status()
            
            result = response.json()
            
            # Extract and print the content
            if 'choices' in result and len(result['choices']) > 0:
                content = result['choices'][0]['message']['content']
                print("\nResponse from AI:\n")
                print(content)

                # Send to Webhook
                webhook_url = "http://localhost:5678/webhook/e95230af-88db-49e0-bebd-ad5fd19fde45"
                try:
                    # Cleaner JSON extraction if the model wraps it in markdown code blocks
                    json_content = content
                    if "```json" in content:
                        json_content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        json_content = content.split("```")[1].split("```")[0].strip()
                    
                    # Parse to ensure valid JSON before sending (optional but good practice)
                    parsed_json = json.loads(json_content)
                    
                    # Map muscle groups from Polish to English
                    print("\nMapping muscle groups to English...")
                    if 'mainMuscleGroups' in parsed_json:
                        print("Main muscle groups:")
                        parsed_json['mainMuscleGroups'] = map_muscle_groups(parsed_json['mainMuscleGroups'])
                    
                    if 'secondaryMuscleGroups' in parsed_json:
                        print("Secondary muscle groups:")
                        parsed_json['secondaryMuscleGroups'] = map_muscle_groups(parsed_json['secondaryMuscleGroups'])
                    
                    print(f"\nSending data to webhook: {webhook_url}")
                    print(f"Transformed data: {json.dumps(parsed_json, indent=2, ensure_ascii=False)}")
                    webhook_response = requests.post(webhook_url, json=parsed_json)
                    webhook_response.raise_for_status()
                    print("Webhook sent successfully!")
                    
                except json.JSONDecodeError:
                    print("Error: content is not valid JSON, sending raw content to webhook...")
                    requests.post(webhook_url, json={"raw_content": content})
                except requests.exceptions.RequestException as e:
                    print(f"Webhook request failed: {e}")
                
                # Move images to old folder only after successful API call (or attempt)
                print("\nMoving processed images to ./old/ ...")
                move_images_to_old(image_paths)

            else:
                print("Unexpected response format:")
                print(json.dumps(result, indent=2))

        except requests.exceptions.RequestException as e:
            print(f"API Request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(e.response.text)
            # wait a bit before retrying or continue
            time.sleep(5)

        # Brief pause between iterations
        time.sleep(30)

if __name__ == "__main__":
    main()
