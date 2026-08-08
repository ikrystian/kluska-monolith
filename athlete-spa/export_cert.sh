#!/bin/bash
echo -n "Wpisz hasło do klucza (znaki nie beda widoczne) i wcisnij ENTER: "
read -s password
echo ""

# Pobieramy alias używając prawidłowego hasła
alias_name=$(/opt/android-studio-beta/jbr/bin/keytool -list -v -keystore android/release-key.jks -storepass "$password" | grep "Alias name:" | awk '{print $3}')

if [ -z "$alias_name" ]; then
    echo "Nie udalo sie znalezc aliasu (moze haslo bylo jednak niepoprawne?)."
    exit 1
fi

echo "Znaleziony alias: $alias_name"

# Eksportujemy certyfikat uzywajac znalezionego aliasu
/opt/android-studio-beta/jbr/bin/keytool -exportcert -rfc -keystore android/release-key.jks -alias "$alias_name" -file upload_certificate.pem -storepass "$password"

if [ $? -eq 0 ]; then
    echo "SUKCES! Plik upload_certificate.pem zostal wygenerowany!"
else
    echo "BLAD! Cos poszlo nie tak przy generowaniu."
fi
