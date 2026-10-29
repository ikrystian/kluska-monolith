#!/usr/bin/env python3
"""Import DELTOIDES GIF pack as public exercises with required system fields."""

from __future__ import annotations

import os
from datetime import datetime, timezone

from gridfs import GridFS
from pymongo import MongoClient

MONGO_URI = (
    "mongodb+srv://fasolqa_db_user:KUdziak1991!@cluster0.lnnjm5p.mongodb.net/"
    "?appName=Cluster0"
)
SOURCE_DIR = (
    "/home/krystian/Downloads/drive-download-20260829T004705Z-1-001/"
    "GIFS_PACK/App/BIBLIOTECA 1000 GIFS/DELTOIDES (1)"
)
PACK_TAG = "gif-pack:DELTOIDES"

MG = {
    "Shoulders": {"name": "Shoulders", "imageUrl": "/images/muscles/shoulders.png"},
    "Rear Delts": {"name": "Rear Delts", "imageUrl": "/images/muscles/rear-delts.png"},
    "Traps": {"name": "Traps", "imageUrl": "/images/muscles/traps.png"},
    "Triceps": {"name": "Triceps", "imageUrl": "/images/muscles/triceps.png"},
    "Klata": {"name": "Klata", "imageUrl": "/images/muscles/klata.png"},
    "Plecy": {"name": "Plecy", "imageUrl": "/images/muscles/plecy.png"},
    "Core": {"name": "Core", "imageUrl": "/images/muscles/core.png"},
    "Przedramiona": {
        "name": "Przedramiona",
        "imageUrl": "/images/muscles/przedramiona.png",
    },
}


def mgs(*names: str) -> list[dict]:
    return [dict(MG[name]) for name in names]


# Each entry is derived from the demonstration GIF (equipment, position, highlighted muscles).
EXERCISES = [
    {
        "file": "Abdução máquina (1).gif",
        "name": "Wznosy bokiem na maszynie (Machine Lateral Raise)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Sprzęt", "value": "Maszyna do odwodzenia ramion (lateral raise)"},
            {"group": "Pozycja", "value": "Siedząc, plecy oparte, ramiona wzdłuż tułowia"},
            {"group": "Chwyt", "value": "Dłonie na poduszkach/uchwytach maszyny"},
        ],
        "instructions": (
            "1. Usiądź na maszynie, plecy przylegają do oparcia, stopy płasko na podłożu.\n"
            "2. Ustaw poduszki na wysokości ramion i chwyć uchwyty luźno.\n"
            "3. Unieś ramiona na boki do wysokości barków, prowadząc łokcie lekko wyżej niż nadgarstki.\n"
            "4. Zatrzymaj napięcie na szczycie ruchu na 1 sekundę.\n"
            "5. Kontrolowanie opuść ramiona do pozycji startowej, nie zrzucając ciężaru."
        ),
        "description": (
            "Izolowane ćwiczenie na boczny akton mięśnia naramiennego. "
            "Maszyna prowadzi tor ruchu i ogranicza bujanie tułowiem."
        ),
    },
    {
        "file": "Arnol press femino (1).gif",
        "name": "Wyciskanie Arnolda siedząc — kobieta (Seated Arnold Press)",
        "main": ["Shoulders"],
        "secondary": ["Triceps", "Klata"],
        "setup": [
            {"group": "Ławka", "value": "Siedzisko z pionowym oparciem (ok. 85–90°)"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Start podchwytem (dłonie do twarzy), rotacja do nachwytu"},
        ],
        "instructions": (
            "1. Usiądź z oparciem, hantle na wysokości barków, dłonie skierowane do twarzy.\n"
            "2. Wyciskaj hantle nad głowę, jednocześnie rotując nadgarstki na zewnątrz.\n"
            "3. W górze dłonie skierowane do przodu, ramiona niemal wyprostowane (bez blokady łokci).\n"
            "4. Opuszczaj po tym samym torze, wracając do chwytu supinowanego przy barkach."
        ),
        "description": (
            "Wariant wyciskania Arnolda z pełną rotacją — mocniej angażuje przedni i boczny akton barku."
        ),
    },
    {
        "file": "Arnolda press (1).gif",
        "name": "Wyciskanie Arnolda siedząc (Arnold Press)",
        "main": ["Shoulders"],
        "secondary": ["Triceps", "Klata"],
        "setup": [
            {"group": "Ławka", "value": "Siedzisko z pionowym oparciem"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Start podchwytem, rotacja do nachwytu w wyciskaniu"},
        ],
        "instructions": (
            "1. Usiądź, plecy oparte, hantle przy barkach, dłonie skierowane do siebie/twarzy.\n"
            "2. Wypchnij hantle w górę i jednocześnie obróć dłonie na zewnątrz.\n"
            "3. Zakończ ruch nad głową z dłońmi skierowanymi do przodu.\n"
            "4. Wróć kontrolowanie, odwracając rotację aż hantle znajdą się znów przy barkach."
        ),
        "description": (
            "Klasyczne wyciskanie Arnolda — łączy wyciskanie nad głowę z rotacją, "
            "pracując na przednim i bocznym aktonie naramiennego."
        ),
    },
    {
        "file": "Crucifixo invertido cabo (1).gif",
        "name": "Odwrotne rozpiętki na wyciągu (Cable Reverse Fly)",
        "main": ["Rear Delts"],
        "secondary": ["Traps", "Plecy"],
        "setup": [
            {"group": "Sprzęt", "value": "Brama / wyciąg, uchwyty pojedyncze"},
            {"group": "Wyciąg", "value": "Bloczki na wysokości klatki/barków"},
            {"group": "Pozycja", "value": "Stojąca, ramiona wyciągnięte przed siebie"},
            {"group": "Chwyt", "value": "Neutralny, linki skrzyżowane lub proste przed klatką"},
        ],
        "instructions": (
            "1. Stań w lekkim rozkroku, chwyć uchwyty przed klatką z lekko ugiętymi łokciami.\n"
            "2. Rozwiedź ramiona na boki i w tył na wysokości barków, zepnij łopatki.\n"
            "3. Skup się na tylnych aktonach barków, nie szarp barkami do uszu.\n"
            "4. Powoli wróć, utrzymując napięcie — nie pozwalaj linkom ciągnąć Cię do przodu."
        ),
        "description": (
            "Izolacja tylnego aktonu naramiennego ze stałym napięciem z wyciągu. "
            "Wspomaga też środkowy trap i retrakcję łopatek."
        ),
    },
    {
        "file": "Crucifixo invertido com halteres 1 (1).gif",
        "name": "Odwrotne rozpiętki siedząc z hantlami (Seated Dumbbell Reverse Fly)",
        "main": ["Rear Delts"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Pozycja", "value": "Siedząc na końcu ławki, tułów pochylony do ud"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Neutralny, ramiona zwisają wzdłuż łydek"},
        ],
        "instructions": (
            "1. Usiądź, pochyl tułów do ud z prostymi plecami, hantle zwisają pod barkami.\n"
            "2. Z lekko ugiętymi łokciami unieś hantle na boki do wysokości barków.\n"
            "3. Zepnij tylne aktony i łopatki na szczycie.\n"
            "4. Opuść hantle wolniej niż unosisz, bez kołysania tułowiem."
        ),
        "description": (
            "Siedzący wariant reverse fly — tułów oparty o uda ogranicza oszustwo ruchem korpusu."
        ),
    },
    {
        "file": "Crucifixo invertido na máqina (1).gif",
        "update_name": "Odwrotne rozpiętki na maszynie (Reverse Pec Deck)",
        "name": "Odwrotne rozpiętki na maszynie (Reverse Pec Deck)",
        "main": ["Rear Delts"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Maszyna", "value": "Pec-deck odwrotny, siedzisko przodem do oparcia"},
            {"group": "Ustawienie", "value": "Klatka oparta o pad, ramiona na wysokości barków"},
            {"group": "Chwyt", "value": "Uchwyty pionowe lub poziome, chwyt neutralny"},
        ],
        "instructions": (
            "1. Usiądź przodem do oparcia, klatka przylega do pada, stopy na podłodze.\n"
            "2. Chwyć rączki na wysokości barków z lekko ugiętymi łokciami.\n"
            "3. Rozwiedź ramiona w tył, zepnij tylne barki i łopatki.\n"
            "4. Wróć powoli, nie pozwalając obciążeniu szarpać ramion do przodu."
        ),
        "description": "Izoluje tylny akton mięśnia naramiennego na prowadzonym torze pec-deck.",
    },
    {
        "file": "Crucifixo inverto com halteres 01 (1).gif",
        "name": "Odwrotne rozpiętki w opadzie tułowia z hantlami (Bent-Over Dumbbell Reverse Fly)",
        "main": ["Rear Delts"],
        "secondary": ["Traps", "Plecy"],
        "setup": [
            {"group": "Pozycja", "value": "Stanie w opadzie tułowia, plecy proste, kolana miękkie"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Neutralny, ramiona zwisają pod barkami"},
        ],
        "instructions": (
            "1. Pochyl tułów niemal równolegle do podłogi, zachowując naturalne wygięcie lędźwi.\n"
            "2. Unieś hantle na boki szerokim łukiem, łokcie lekko ugięte.\n"
            "3. Na górze zepnij tylne barki — unikaj szrugu barkami do uszu.\n"
            "4. Opuść hantle pod kontrolą do zwisu."
        ),
        "description": (
            "Wolnociężarowy reverse fly w opadzie. Wymaga stabilnego korpusu i pracy tylnego aktonu."
        ),
    },
    {
        "file": "Desenvolvimento (1).gif",
        "name": "Wyciskanie hantli nad głowę stojąc (Standing Dumbbell Shoulder Press)",
        "main": ["Shoulders"],
        "secondary": ["Triceps", "Traps", "Core"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, stopy na szerokość bioder, tułów spięty"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Nachwyt, hantle na wysokości uszu, łokcie pod gryfem hantla"},
        ],
        "instructions": (
            "1. Stań stabilnie, napnij brzuch i pośladki, hantle przy barkach.\n"
            "2. Wyciśnij hantle pionowo nad głowę do niemal pełnego wyprostu.\n"
            "3. Nie wyginaj lędźwi — żebra w dół, głowa w linii kręgosłupa.\n"
            "4. Opuść hantle do poziomu uszu i powtórz."
        ),
        "description": (
            "Wielostawowe wyciskanie stojąc z hantlami. Buduje przedni i boczny akton barku oraz stabilizację tułowia."
        ),
    },
    {
        "file": "Desenvolvimento com halteres (1).gif",
        "update_name": "Wyciskanie hantli siedząc (Seated Dumbbell Shoulder Press)",
        "name": "Wyciskanie hantli siedząc (Seated Dumbbell Shoulder Press)",
        "main": ["Shoulders"],
        "secondary": ["Triceps"],
        "setup": [
            {"group": "Ławka", "value": "Oparcie pionowe (85–90°)"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Nachwyt, hantle na wysokości uszu/barków"},
        ],
        "instructions": (
            "1. Usiądź z oparciem, stopy mocno na podłodze, hantle przy uszach.\n"
            "2. Wyciśnij hantle nad głowę, nie zderzając ich na górze.\n"
            "3. Łokcie prowadź lekko przed linią tułowia, nie rozjeżdżaj ich na boki.\n"
            "4. Opuść hantle kontrolowanie do poziomu uszu."
        ),
        "description": "Pozwala na duży zakres ruchu i niezależną pracę obu barków bez bujania nogami.",
    },
    {
        "file": "Desenvolvimento máquina (1).gif",
        "name": "Wyciskanie barków na maszynie (Machine Shoulder Press)",
        "main": ["Shoulders"],
        "secondary": ["Triceps"],
        "setup": [
            {"group": "Sprzęt", "value": "Maszyna do wyciskania barków (shoulder press)"},
            {"group": "Pozycja", "value": "Siedząc, plecy i pośladki dociśnięte do siedziska"},
            {"group": "Chwyt", "value": "Uchwyty na wysokości barków, nachwyt"},
        ],
        "instructions": (
            "1. Ustaw siedzisko tak, by uchwyty startowały na wysokości barków.\n"
            "2. Dociśnij plecy do oparcia i wyciśnij uchwyty nad głowę.\n"
            "3. Nie odrywaj pośladków ani lędźwi od siedziska.\n"
            "4. Opuść obciążenie do kąta ok. 90° w łokciach i powtórz."
        ),
        "description": (
            "Prowadzony wycisk nad głowę — bezpieczny wariant na masę barków, mniejszy wymóg stabilizacji."
        ),
    },
    {
        "file": "Desenvolvimento no smith (1).gif",
        "name": "Wyciskanie na maszynie Smith stojąc (Standing Smith Machine Shoulder Press)",
        "main": ["Shoulders"],
        "secondary": ["Triceps", "Traps", "Core"],
        "setup": [
            {"group": "Sprzęt", "value": "Maszyna Smith, sztanga na wysokości górnej klatki"},
            {"group": "Pozycja", "value": "Stojąca pod gryfem, stopy na szerokość bioder"},
            {"group": "Chwyt", "value": "Nachwyt, nieco szerszy niż barki"},
        ],
        "instructions": (
            "1. Stań pod gryfem Smitha, odblokuj sztangę z haków.\n"
            "2. Gryf na górze klatki/obojczykach, łokcie pod sztangą.\n"
            "3. Wyciśnij pionowo nad głowę, głowa lekko do tyłu w starcie, potem pod gryf.\n"
            "4. Opuść do obojczyków, zachowując napięty tułów."
        ),
        "description": "Wyciskanie żołnierskie na prowadnicy Smitha — stały tor, łatwiejsze dociążenie.",
    },
    {
        "file": "Desenvolvimento nuca (1).gif",
        "name": "Wyciskanie na maszynie Smith siedząc (Seated Smith Machine Shoulder Press)",
        "main": ["Shoulders"],
        "secondary": ["Triceps"],
        "setup": [
            {"group": "Sprzęt", "value": "Maszyna Smith + ławka z oparciem wstawiona pod gryf"},
            {"group": "Pozycja", "value": "Siedząc, plecy oparte, gryf przed twarzą na wysokości barków"},
            {"group": "Chwyt", "value": "Nachwyt, nieco szerszy niż barki"},
        ],
        "instructions": (
            "1. Ustaw ławkę pod Smitha tak, by gryf opadał przed twarz, nie na kark.\n"
            "2. Odblokuj sztangę i wyciśnij nad głowę do niemal pełnego wyprostu.\n"
            "3. Opuść gryf do wysokości brody/obojczyków, łokcie pod sztangą.\n"
            "4. Nie wyginaj nadmiernie lędźwi — brzuch spięty przez cały ruch."
        ),
        "description": "Siedzące wyciskanie na Smithie z oparciem. Stabilny wariant na przedni i boczny akton.",
    },
    {
        "file": "Desenvolvimento unilateral (1).gif",
        "name": "Wyciskanie hantla jednorącz stojąc (Standing Single-Arm Dumbbell Press)",
        "main": ["Shoulders"],
        "secondary": ["Triceps", "Core"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, druga ręka na biodrze, tułów spięty"},
            {"group": "Sprzęt", "value": "Jeden hantel"},
            {"group": "Chwyt", "value": "Nachwyt, hantel na wysokości ucha"},
        ],
        "instructions": (
            "1. Unieś hantel do pozycji startowej przy uchu, drugi bok tułowia ustabilizuj.\n"
            "2. Wyciśnij hantel pionowo, nie pochylając się na stronę przeciwną.\n"
            "3. Opuść do ucha i wykonaj serię, potem zmień stronę.\n"
            "4. Utrzymuj żebra w dół — anti-lateral-flexion korpusu."
        ),
        "description": (
            "Jednorącz wymusza silną stabilizację tułowia i wyrównuje dysproporcje między barkami."
        ),
    },
    {
        "file": "Elevação frontal com halteres (1).gif",
        "name": "Wznosy ramion w przód z hantlami (Dumbbell Front Raise)",
        "main": ["Shoulders"],
        "secondary": ["Klata", "Core"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, hantle wzdłuż ud"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Nachwyt, ramiona niemal wyprostowane"},
        ],
        "instructions": (
            "1. Stań prosto, hantle przed udami, barki opuszczone.\n"
            "2. Unieś ramiona w przód do wysokości barków, bez bujania tułowiem.\n"
            "3. Łokcie lekko ugięte, nadgarstki neutralne.\n"
            "4. Opuść wolniej niż unosisz, nie uderzaj hantlami o uda."
        ),
        "description": "Izolacja przedniego aktonu naramiennego. Unikaj rozpędu z bioder.",
    },
    {
        "file": "Elevação frontal Inclinado (1).gif",
        "name": "Wznosy tyłem na ławce skośnej (Incline Chest-Supported Rear Delt Raise)",
        "main": ["Rear Delts"],
        "secondary": ["Traps", "Shoulders"],
        "setup": [
            {"group": "Ławka", "value": "Skośna dodatnia, klatka oparta o oparcie"},
            {"group": "Pozycja", "value": "Leżenie przodem, stopy na podłodze, ramiona zwisają"},
            {"group": "Sprzęt", "value": "Para hantli, chwyt neutralny"},
        ],
        "instructions": (
            "1. Połóż klatkę na ławce skośnej, głowa poza oparciem, hantle zwisają.\n"
            "2. Unieś ramiona w tył/na boki, zginając lekko łokcie.\n"
            "3. Zepnij tylne aktony na górze, bez szrugu barkami.\n"
            "4. Opuść hantle do pełnego rozciągnięcia."
        ),
        "description": (
            "Wariant z podpartą klatką — odcina zamach tułowiem i celuje w tylny akton barku."
        ),
    },
    {
        "file": "Elevação frontal mão juntas (1).gif",
        "name": "Wznosy w przód z hantlami razem (Two-Hand Dumbbell Front Raise)",
        "main": ["Shoulders"],
        "secondary": ["Klata", "Core"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, hantle trzymane razem przed udami"},
            {"group": "Sprzęt", "value": "Jeden lub dwa hantle złączone"},
            {"group": "Chwyt", "value": "Obie dłonie obejmują hantel/hantle (chwyt młotkowy)"},
        ],
        "instructions": (
            "1. Chwyć hantel oburącz przed biodrami.\n"
            "2. Unieś go w przód do wysokości barków, ramiona lekko ugięte.\n"
            "3. Nie wychylaj tułowia do tyłu.\n"
            "4. Opuść po tym samym torze pod kontrolą."
        ),
        "description": "Front raise z hantlami złączonymi — równomierne obciążenie obu przednich aktonów.",
    },
    {
        "file": "Elevação frontal no cabo (1).gif",
        "name": "Wznosy w przód na wyciągu z drążkiem (Cable Front Raise)",
        "main": ["Shoulders"],
        "secondary": ["Klata"],
        "setup": [
            {"group": "Wyciąg", "value": "Bloczek dolny, prosty krótki drążek"},
            {"group": "Pozycja", "value": "Stojąca tyłem lub przodem do wyciągu, drążek przy udach"},
            {"group": "Chwyt", "value": "Nachwyt na szerokość barków"},
        ],
        "instructions": (
            "1. Chwyć drążek dolnego wyciągu, stań prosto, barki opuszczone.\n"
            "2. Unieś drążek w przód do wysokości barków.\n"
            "3. Utrzymaj lekkie ugięcie łokci i napięty brzuch.\n"
            "4. Opuść wolno, nie kładąc obciążenia na stosie między powtórzeniami."
        ),
        "description": "Front raise ze stałym napięciem linki — dobrze czuć przedni akton w pełnym zakresie.",
    },
    {
        "file": "Elevação frontal sentado (1).gif",
        "name": "Wznosy w przód siedząc z hantlami (Seated Dumbbell Front Raise)",
        "main": ["Shoulders"],
        "secondary": ["Klata"],
        "setup": [
            {"group": "Ławka", "value": "Siedzisko z pionowym oparciem"},
            {"group": "Sprzęt", "value": "Para hantli wzdłuż tułowia"},
            {"group": "Chwyt", "value": "Nachwyt lub młotkowy"},
        ],
        "instructions": (
            "1. Usiądź z oparciem, hantle wzdłuż ud, łopatki przy oparciu.\n"
            "2. Unieś ramiona w przód do wysokości barków.\n"
            "3. Oparcie odcina zamach — nie odrywaj pleców.\n"
            "4. Opuść hantle kontrolowanie."
        ),
        "description": "Siedzący front raise. Oparcie zmniejsza oszustwo ruchem tułowia.",
    },
    {
        "file": "Elevação frontal unilateral (1).gif",
        "name": "Wznosy w przód jednorącz na wyciągu (Single-Arm Cable Front Raise)",
        "main": ["Shoulders"],
        "secondary": ["Klata", "Core"],
        "setup": [
            {"group": "Wyciąg", "value": "Bloczek dolny, uchwyt pojedynczy (D-handle)"},
            {"group": "Pozycja", "value": "Stojąca, ramię wzdłuż ciała, linka od dołu"},
            {"group": "Chwyt", "value": "Neutralny / nachwyt"},
        ],
        "instructions": (
            "1. Chwyć uchwyt dolnego wyciągu, stań bokiem lub przodem do stosu.\n"
            "2. Unieś ramię w przód do wysokości barku, łokieć lekko ugięty.\n"
            "3. Nie rotuj tułowia w stronę pracującego ramienia.\n"
            "4. Opuść wolno i zmień stronę po serii."
        ),
        "description": "Jednorącz na wyciągu pozwala skupić się na jednym przednim aktonie i wyrównać strony.",
    },
    {
        "file": "Elevação frontal unilateral 3 (1).gif",
        "name": "Wznosy w przód jednorącz z hantlem (Single-Arm Dumbbell Front Raise)",
        "main": ["Shoulders"],
        "secondary": ["Klata", "Core"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, drugi hantel spoczywa wzdłuż uda"},
            {"group": "Sprzęt", "value": "Para hantli (pracuje jedna strona)"},
            {"group": "Chwyt", "value": "Nachwyt"},
        ],
        "instructions": (
            "1. Unieś jeden hantel w przód do wysokości barku, drugi pozostaje przy udzie.\n"
            "2. Tułów nieruchomy, bark pracującego ramienia opuszczony.\n"
            "3. Opuść i kontynuuj naprzemiennie albo seriami na stronę."
        ),
        "description": "Naprzemienny front raise z hantlami — łatwiej utrzymać kontrolę i zakres ruchu.",
    },
    {
        "file": "Elevação lateral + descida frontal (1).gif",
        "name": "Wznosy bokiem z opuszczaniem z przodu (Lateral Raise with Front Lower)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, hantle wzdłuż ud"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Neutralny / nachwyt"},
        ],
        "instructions": (
            "1. Unieś hantle klasycznym wznosem bokiem do wysokości barków.\n"
            "2. Z górnej pozycji przenieś hantle lekko w przód i opuszczaj je w płaszczyźnie czołowej/przodniej.\n"
            "3. Nie szarp i nie używaj rozpędu bioder.\n"
            "4. Wróć do zwisu przy udach i powtórz cykl."
        ),
        "description": (
            "Kombinacja: wznos bokiem (akton boczny) i opuszczanie z przodu (praca przedniego aktonu ekscentrycznie)."
        ),
    },
    {
        "file": "Elevação lateral 01 (1).gif",
        "update_name": "Wznosy ramion bokiem z hantlami (Dumbbell Lateral Raises)",
        "name": "Wznosy ramion bokiem z hantlami (Dumbbell Lateral Raises)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, lekki opad tułowia, hantle przy udach"},
            {"group": "Sprzęt", "value": "Para hantli"},
            {"group": "Chwyt", "value": "Neutralny"},
        ],
        "instructions": (
            "1. Unieś hantle bokiem do poziomu barków, łokcie nieco wyżej niż nadgarstki.\n"
            "2. Mały „wylewający się dzbanek” w nadgarstku, bez wzruszenia barkami.\n"
            "3. Opuść wolniej niż unosisz, nie uderzaj hantlami o uda."
        ),
        "description": "Kluczowe ćwiczenie budujące szerokość barków (akton boczny).",
    },
    {
        "file": "Elevação lateral 4 (1).gif",
        "name": "Wznosy bokiem siedząc z hantlami (Seated Dumbbell Lateral Raise)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Pozycja", "value": "Siedząc na końcu ławki, tułów lekko pochylony w przód"},
            {"group": "Sprzęt", "value": "Para hantli między łydkami w starcie"},
            {"group": "Chwyt", "value": "Neutralny"},
        ],
        "instructions": (
            "1. Usiądź, pochyl się lekko, hantle startują przy łydkach.\n"
            "2. Unieś ramiona na boki do wysokości barków.\n"
            "3. Siedzenie odcina zamach nogami — nie kołysz tułowiem.\n"
            "4. Opuść hantle pod kontrolą."
        ),
        "description": "Siedzący lateral raise. Utrudnia oszustwo i wydłuża napięcie bocznego aktonu.",
    },
    {
        "file": "Elevação lateral com inclinação (1).gif",
        "name": "Wznosy bokiem w podporze o ramę (Leaning Dumbbell Lateral Raise)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Sprzęt", "value": "Hantel + podpora (rama Smitha / stojak)"},
            {"group": "Pozycja", "value": "Jednorącz, tułów odchylony od podpory, wolna ręka trzyma ramę"},
            {"group": "Chwyt", "value": "Neutralny, hantel w wolnej ręce wzdłuż biodra"},
        ],
        "instructions": (
            "1. Chwyć ramę wolną ręką i odchyl ciało, aż pracujące ramię swobodnie zwisa.\n"
            "2. Unieś hantel w płaszczyźnie odwiedzenia powyżej linii barku (większy zakres).\n"
            "3. Nie rotuj tułowia; ruch tylko w stawie ramiennym.\n"
            "4. Opuść do pełnego zwisu i zmień stronę."
        ),
        "description": (
            "Leaning lateral raise — nachylenie wydłuża zakres i mocniej rozciąga boczny akton na dole ruchu."
        ),
    },
    {
        "file": "Elevação lateral inclinado apoio banco (1).gif",
        "name": "Wznosy bokiem leżąc bokiem na ławce (Side-Lying Lateral Raise)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Ławka", "value": "Skośna, leżenie na boku, tułów oparty o oparcie"},
            {"group": "Sprzęt", "value": "Jeden hantel w górnej ręce"},
            {"group": "Pozycja", "value": "Głowa, tułów i biodra w linii, stopy na podłodze lub na ławce"},
        ],
        "instructions": (
            "1. Połóż się na boku na ławce skośnej, hantel w górnej ręce wzdłuż biodra.\n"
            "2. Unieś ramię w odwiedzeniu, nie wyżej niż linia barku/głowy.\n"
            "3. Dolny bark nie zapada się — tułów stabilny na oparciu.\n"
            "4. Opuść hantel powoli i wykonaj drugą stronę."
        ),
        "description": (
            "Leżenie bokiem zmienia krzywą oporu: najtrudniej na górze, idealne na boczny akton bez zamachu."
        ),
    },
    {
        "file": "Elevação lateral inclinado no cabo 2 (1).gif",
        "name": "Wznosy bokiem na wyciągu w nachyleniu (Leaning Cable Lateral Raise)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Sprzęt", "value": "Wyciąg / brama, bloczek dolny, uchwyt D"},
            {"group": "Pozycja", "value": "Jedną ręką trzymasz słupek, ciało odchylone, druga ręka ciągnie linkę"},
            {"group": "Chwyt", "value": "Neutralny, linka od dołu po skosie"},
        ],
        "instructions": (
            "1. Chwyć słupek wolną ręką, odchyl ciało, uchwyt w drugiej dłoni przy udzie.\n"
            "2. Unieś ramię w odwiedzeniu do wysokości barku lub nieco wyżej.\n"
            "3. Łokieć prowadzi ruch, nadgarstek luźny.\n"
            "4. Opuść do pełnego rozciągnięcia przy udzie."
        ),
        "description": "Cable leaning lateral raise — stałe napięcie linki plus wydłużony zakres z nachylenia.",
    },
    {
        "file": "Elevação lateral no cabo (1).gif",
        "name": "Wznosy bokiem na wyciągu (Cable Lateral Raise)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Wyciąg", "value": "Bloczek dolny, uchwyt pojedynczy"},
            {"group": "Pozycja", "value": "Stojąca bokiem do wyciągu, ramię wzdłuż ciała"},
            {"group": "Chwyt", "value": "Neutralny"},
        ],
        "instructions": (
            "1. Stań bokiem do dolnego wyciągu, uchwyt w dalszej ręce.\n"
            "2. Unieś ramię na bok do wysokości barku.\n"
            "3. Nie pochylaj tułowia w stronę przeciwną.\n"
            "4. Opuść wolno, utrzymując napięcie linki."
        ),
        "description": "Klasyczny cable lateral raise. Stały opór w całym zakresie bocznego aktonu.",
    },
    {
        "file": "Elevação lateral no cross cruzado (1).gif",
        "name": "Wznosy bokiem na bramie skrzyżowanie (Cross-Body Cable Lateral Raise)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Sprzęt", "value": "Brama (cable crossover), oba bloczki dolne"},
            {"group": "Pozycja", "value": "Stojąc na środku bramy, linki skrzyżowane przed ciałem"},
            {"group": "Chwyt", "value": "Każda dłoń trzyma przeciwną linkę"},
        ],
        "instructions": (
            "1. Chwyć lewą linkę prawą ręką i odwrotnie, linki krzyżują się przed biodrami.\n"
            "2. Unieś oba ramiona na boki do wysokości barków.\n"
            "3. Skrzyżowanie daje ciągłe napięcie już od startu przy udach.\n"
            "4. Opuść, nie pozwalając linkom szarpać ramion do środka."
        ),
        "description": (
            "Obustronny lateral raise na bramie ze skrzyżowanymi linkami — napięcie od samego dołu ruchu."
        ),
    },
    {
        "file": "Elevação lateral tronco apoiado (1).gif",
        "name": "Wznosy w oparciu klatką o ławkę skośną (Chest-Supported Incline Raise)",
        "main": ["Rear Delts"],
        "secondary": ["Shoulders", "Traps"],
        "setup": [
            {"group": "Ławka", "value": "Skośna dodatnia, klatka dociśnięta do oparcia"},
            {"group": "Pozycja", "value": "Przodem do ławki, ramiona zwisają z hantlami"},
            {"group": "Chwyt", "value": "Neutralny"},
        ],
        "instructions": (
            "1. Oprzyj klatkę o ławkę skośną, głowa ponad oparciem.\n"
            "2. Unieś hantle na boki, prowadząc łokcie w linii barków.\n"
            "3. Zepnij tylne i boczne aktony, bez szrugu.\n"
            "4. Opuść do pełnego zwisu."
        ),
        "description": (
            "Wznosy z podpartym tułowiem. Oparcie klatki eliminuje zamach i celuje w tylny/boczny akton."
        ),
    },
    {
        "file": "Elevação lateral uni no cabo (1).gif",
        "name": "Wznosy bokiem jednorącz na wyciągu (Single-Arm Cable Lateral Raise)",
        "main": ["Shoulders"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Wyciąg", "value": "Bloczek dolny, uchwyt D"},
            {"group": "Pozycja", "value": "Stojąca, wolna ręka na biodrze"},
            {"group": "Chwyt", "value": "Neutralny, linka przy udzie"},
        ],
        "instructions": (
            "1. Chwyć uchwyt, wolną dłoń oprzyj na biodrze dla stabilizacji.\n"
            "2. Unieś ramię bokiem do wysokości barku, łokieć prowadzi.\n"
            "3. Nie unos barku do ucha.\n"
            "4. Opuść pod kontrolą i zmień stronę."
        ),
        "description": "Jednorącz na wyciągu — łatwiej wyczuć boczny akton i wyrównać lewą/prawą stronę.",
    },
    {
        "file": "Frontal, lateral, invertido (1).gif",
        "name": "Wznosy kombinowane: przód, bok i tył (Front, Lateral & Reverse Raise Combo)",
        "main": ["Shoulders", "Rear Delts"],
        "secondary": ["Traps"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, para hantli wzdłuż ud"},
            {"group": "Sprzęt", "value": "Lekkie hantle (ruch wielopłaszczyznowy)"},
            {"group": "Chwyt", "value": "Neutralny / nachwyt w zależności od fazy"},
        ],
        "instructions": (
            "1. Wykonaj wznos w przód do wysokości barków i opuść.\n"
            "2. Następnie wznos bokiem do wysokości barków i opuść.\n"
            "3. Pochyl tułów i wykonaj odwrotne rozpiętki (tylny akton).\n"
            "4. To stanowi jedno powtórzenie kompleksu — dobierz lekki ciężar."
        ),
        "description": (
            "Kompleks na wszystkie trzy aktony naramiennego: przedni, boczny i tylny w jednym cyklu."
        ),
    },
    {
        "file": "landmine-press (1).gif",
        "name": "Wyciskanie landmine klęcząc (Kneeling Landmine Press)",
        "main": ["Shoulders"],
        "secondary": ["Klata", "Triceps", "Core"],
        "setup": [
            {"group": "Sprzęt", "value": "Sztanga w landmine / trójnogu, talerz na wolnym końcu"},
            {"group": "Pozycja", "value": "Klęczenie, tułów wyprostowany, gryf przy barku"},
            {"group": "Chwyt", "value": "Oburącz na końcu gryfu, łokcie pod sztangą"},
        ],
        "instructions": (
            "1. Klęknij przed landmine, gryf przy górze klatki/barku.\n"
            "2. Wyciśnij sztangę po skosie w górę i do przodu, prostując ramiona.\n"
            "3. Nie zapadaj się w lędźwiach — brzuch i pośladki spięte.\n"
            "4. Opuść gryf do barku i powtórz."
        ),
        "description": (
            "Wyciskanie pod kątem z landmine. Przyjazne dla barku, mocno angażuje przedni akton, klatkę i core."
        ),
    },
    {
        "file": "military-press (1).gif",
        "update_name": "Wyciskanie żołnierskie (Overhead Press / OHP)",
        "name": "Wyciskanie żołnierskie (Overhead Press / OHP)",
        "main": ["Shoulders"],
        "secondary": ["Triceps", "Traps", "Core"],
        "setup": [
            {"group": "Pozycja", "value": "Stojąca, stopy na szerokość bioder"},
            {"group": "Chwyt", "value": "Sztanga na obojczykach, nachwyt ciut szerszy niż barki"},
            {"group": "Sprzęt", "value": "Sztanga wolna"},
        ],
        "instructions": (
            "1. Napnij pośladki i brzuch, sztanga na obojczykach.\n"
            "2. Wyciśnij sztangę pionowo nad głowę.\n"
            "3. Przepchnij głowę lekko do przodu po minięciu sztangi.\n"
            "4. Opuść kontrolowanie na obojczyki."
        ),
        "description": "Klasyczne ćwiczenie siłowe rozwijające przednie i boczne aktony barków.",
    },
    {
        "file": "Rotação interna (1).gif",
        "name": "Rotacja wewnętrzna ramienia na wyciągu (Cable Internal Rotation)",
        "main": ["Shoulders"],
        "secondary": ["Przedramiona"],
        "setup": [
            {"group": "Wyciąg", "value": "Bloczek na wysokości łokcia, uchwyt pojedynczy"},
            {"group": "Pozycja", "value": "Stojąca bokiem do wyciągu, łokieć przy tułowiu zgięty 90°"},
            {"group": "Chwyt", "value": "Neutralny, przedramię równoległe do podłogi"},
        ],
        "instructions": (
            "1. Stań bokiem, łokieć dociśnięty do tułowia, przedramię skierowane na zewnątrz (w stronę wyciągu).\n"
            "2. Rotuj ramię do wewnątrz, prowadząc dłoń przed brzuch, łokieć nieruchomy.\n"
            "3. Nie odwodź łokcia i nie kręć tułowiem.\n"
            "4. Wróć powoli do pozycji startowej — to praca stożka rotatorów, nie barku na masę."
        ),
        "description": (
            "Izolowana rotacja wewnętrzna (m.in. mięsień podłopatkowy). Ćwiczenie na zdrowie stawu ramiennego, lekkie obciążenie."
        ),
    },
]


def upload_gif(fs: GridFS, path: str, filename: str) -> str:
    with open(path, "rb") as handle:
        file_id = fs.put(
            handle,
            filename=filename,
            contentType="image/gif",
            metadata={
                "contentType": "image/gif",
                "source": PACK_TAG,
                "originalName": filename,
            },
        )
    return f"/api/images/{file_id}"


def build_doc(entry: dict, media_url: str, now: datetime) -> dict:
    main = mgs(*entry["main"])
    secondary = mgs(*entry["secondary"])
    return {
        "name": entry["name"],
        "mainMuscleGroups": main,
        "secondaryMuscleGroups": secondary,
        "setup": [{"group": s["group"], "value": s["value"]} for s in entry["setup"]],
        "instructions": entry["instructions"],
        "description": entry["description"],
        "mediaUrl": media_url,
        "image": media_url,
        "imageHint": f"{PACK_TAG}:{entry['file']}",
        "type": "weight",
        "ownerId": "public",
        "muscleGroup": main[0]["name"],
        "createdAt": now,
        "updatedAt": now,
        "__v": 0,
    }


def main() -> None:
    if not os.path.isdir(SOURCE_DIR):
        raise SystemExit(f"Brak katalogu GIF-ów: {SOURCE_DIR}")

    client = MongoClient(MONGO_URI)
    db = client["test"]
    fs = GridFS(db, collection="images")
    now = datetime.now(timezone.utc)
    inserted = 0
    updated = 0
    skipped = 0

    for entry in EXERCISES:
        filename = entry["file"]
        path = os.path.join(SOURCE_DIR, filename)
        if not os.path.isfile(path):
            raise SystemExit(f"Brak pliku: {path}")

        hint = f"{PACK_TAG}:{filename}"
        existing = db.exercises.find_one({"imageHint": hint})
        if existing:
            print(f"SKIP (już zaimportowane): {entry['name']}")
            skipped += 1
            continue

        media_url = upload_gif(fs, path, filename)
        doc = build_doc(entry, media_url, now)
        update_name = entry.get("update_name")
        target = db.exercises.find_one({"name": update_name}) if update_name else None

        if target:
            db.exercises.update_one(
                {"_id": target["_id"]},
                {
                    "$set": {
                        "mediaUrl": media_url,
                        "image": media_url,
                        "imageHint": hint,
                        "instructions": doc["instructions"],
                        "description": doc["description"],
                        "setup": doc["setup"],
                        "mainMuscleGroups": doc["mainMuscleGroups"],
                        "secondaryMuscleGroups": doc["secondaryMuscleGroups"],
                        "updatedAt": now,
                    }
                },
            )
            print(f"UPDATE + GIF: {update_name} -> {media_url}")
            updated += 1
        else:
            db.exercises.insert_one(doc)
            print(f"INSERT: {entry['name']} -> {media_url}")
            inserted += 1

    print(
        f"\nGotowe. insert={inserted} update={updated} skip={skipped} "
        f"razem={inserted + updated + skipped}/{len(EXERCISES)}"
    )
    print("Ćwiczenia barków (Shoulders / Rear Delts):")
    for ex in db.exercises.find(
        {"mainMuscleGroups.name": {"$in": ["Shoulders", "Rear Delts"]}},
        {"name": 1, "mediaUrl": 1},
    ).sort("name", 1):
        print(f"  - {ex['name']} | {ex.get('mediaUrl')}")


if __name__ == "__main__":
    main()
