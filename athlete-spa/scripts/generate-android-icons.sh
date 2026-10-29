#!/usr/bin/env bash
set -euo pipefail

# Determine script and project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ASSETS_DIR="${PROJECT_DIR}/assets"
RES_DIR="${PROJECT_DIR}/android/app/src/main/res"

if [ ! -d "${ASSETS_DIR}" ]; then
  echo "Error: assets directory not found at ${ASSETS_DIR}" >&2
  exit 1
fi

if [ ! -d "${RES_DIR}" ]; then
  echo "Error: Android res directory not found at ${RES_DIR}" >&2
  exit 1
fi

# Tool check
if command -v magick &>/dev/null; then
  IM_CMD="magick"
elif command -v convert &>/dev/null; then
  IM_CMD="convert"
else
  echo "Error: ImageMagick (magick or convert) is required." >&2
  exit 1
fi

SRC_FOREGROUND="${ASSETS_DIR}/icon-foreground.png"
SRC_ICON_ONLY="${ASSETS_DIR}/icon-only.png"
SRC_BACKGROUND="${ASSETS_DIR}/icon-background.png"

if [ ! -f "${SRC_FOREGROUND}" ]; then
  echo "Error: ${SRC_FOREGROUND} not found" >&2
  exit 1
fi
if [ ! -f "${SRC_ICON_ONLY}" ]; then
  echo "Error: ${SRC_ICON_ONLY} not found" >&2
  exit 1
fi

echo "============================================="
echo "Generating Android Launcher Icons"
echo "============================================="
echo "Source Foreground: ${SRC_FOREGROUND}"
echo "Source Icon:       ${SRC_ICON_ONLY}"
echo "Output Res Dir:    ${RES_DIR}"
echo ""

# Density specifications: name, legacy_size (square & round), foreground_size
DENSITIES=(
  "mipmap-mdpi:48:108"
  "mipmap-hdpi:72:162"
  "mipmap-xhdpi:96:216"
  "mipmap-xxhdpi:144:324"
  "mipmap-xxxhdpi:192:432"
)

# 1. Generate PNGs for each density
for entry in "${DENSITIES[@]}"; do
  IFS=":" read -r folder legacy_size fg_size <<< "${entry}"
  TARGET_DIR="${RES_DIR}/${folder}"
  mkdir -p "${TARGET_DIR}"

  echo "-> Processing ${folder}..."

  # A. ic_launcher_foreground.png (Adaptive icon foreground layer, transparent background)
  "${IM_CMD}" "${SRC_FOREGROUND}" \
    -filter Lanczos \
    -resize "${fg_size}x${fg_size}" \
    "${TARGET_DIR}/ic_launcher_foreground.png"
  echo "   - ic_launcher_foreground.png (${fg_size}x${fg_size})"

  # B. ic_launcher.png (Legacy square icon)
  "${IM_CMD}" "${SRC_ICON_ONLY}" \
    -filter Lanczos \
    -resize "${legacy_size}x${legacy_size}" \
    "${TARGET_DIR}/ic_launcher.png"
  echo "   - ic_launcher.png (${legacy_size}x${legacy_size})"

  # C. ic_launcher_round.png (Legacy round icon with transparent circular mask)
  "${IM_CMD}" "${SRC_ICON_ONLY}" \
    \( -size 1024x1024 xc:black -fill white -draw "circle 512,512 512,0" \) \
    -alpha off -compose copy_opacity -composite \
    -filter Lanczos \
    -resize "${legacy_size}x${legacy_size}" \
    "${TARGET_DIR}/ic_launcher_round.png"
  echo "   - ic_launcher_round.png (${legacy_size}x${legacy_size})"
done

# 2. Update background color in values/ic_launcher_background.xml
# Background color extracted from assets/icon-background.png is #191814
BG_COLOR="#191814"
VALUES_DIR="${RES_DIR}/values"
mkdir -p "${VALUES_DIR}"
cat <<EOF > "${VALUES_DIR}/ic_launcher_background.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_COLOR}</color>
</resources>
EOF
echo ""
echo "-> Updated ${VALUES_DIR}/ic_launcher_background.xml (${BG_COLOR})"

# 3. Update drawable/ic_launcher_background.xml if present
DRAWABLE_DIR="${RES_DIR}/drawable"
mkdir -p "${DRAWABLE_DIR}"
cat <<EOF > "${DRAWABLE_DIR}/ic_launcher_background.xml"
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="${BG_COLOR}"
        android:pathData="M0,0h108v108h-108z" />
</vector>
EOF
echo "-> Updated ${DRAWABLE_DIR}/ic_launcher_background.xml (${BG_COLOR})"

# 4. Remove obsolete Android Studio default vector head in drawable-v24 if present
if [ -f "${RES_DIR}/drawable-v24/ic_launcher_foreground.xml" ]; then
  rm -f "${RES_DIR}/drawable-v24/ic_launcher_foreground.xml"
  echo "-> Removed obsolete ${RES_DIR}/drawable-v24/ic_launcher_foreground.xml"
fi

# 5. Ensure mipmap-anydpi-v26 XML files are intact and properly reference the layers
ANYDPI_DIR="${RES_DIR}/mipmap-anydpi-v26"
mkdir -p "${ANYDPI_DIR}"

cat <<EOF > "${ANYDPI_DIR}/ic_launcher.xml"
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
EOF

cat <<EOF > "${ANYDPI_DIR}/ic_launcher_round.xml"
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
EOF
echo "-> Verified ${ANYDPI_DIR}/ic_launcher.xml & ic_launcher_round.xml"

# Optional: Splash screens if --with-splash flag is passed
if [[ "${1:-}" == "--with-splash" ]]; then
  SRC_SPLASH="${ASSETS_DIR}/splash.png"
  if [ -f "${SRC_SPLASH}" ]; then
    echo ""
    echo "============================================="
    echo "Generating Splash Screens (--with-splash)"
    echo "============================================="
    SPLASH_PORT=(
      "drawable-port-mdpi:320x480"
      "drawable-port-hdpi:480x800"
      "drawable-port-xhdpi:720x1280"
      "drawable-port-xxhdpi:960x1600"
      "drawable-port-xxxhdpi:1280x1920"
    )
    SPLASH_LAND=(
      "drawable-land-mdpi:480x320"
      "drawable-land-hdpi:800x480"
      "drawable-land-xhdpi:1280x720"
      "drawable-land-xxhdpi:1600x960"
      "drawable-land-xxxhdpi:1920x1280"
    )

    for entry in "${SPLASH_PORT[@]}"; do
      IFS=":" read -r folder dims <<< "${entry}"
      mkdir -p "${RES_DIR}/${folder}"
      "${IM_CMD}" "${SRC_SPLASH}" -filter Lanczos -resize "${dims}^" -gravity center -extent "${dims}" "${RES_DIR}/${folder}/splash.png"
      echo "   - ${folder}/splash.png (${dims})"
    done

    for entry in "${SPLASH_LAND[@]}"; do
      IFS=":" read -r folder dims <<< "${entry}"
      mkdir -p "${RES_DIR}/${folder}"
      "${IM_CMD}" "${SRC_SPLASH}" -filter Lanczos -resize "${dims}^" -gravity center -extent "${dims}" "${RES_DIR}/${folder}/splash.png"
      echo "   - ${folder}/splash.png (${dims})"
    done

    # Default drawable/splash.png
    "${IM_CMD}" "${SRC_SPLASH}" -filter Lanczos -resize "480x320^" -gravity center -extent "480x320" "${RES_DIR}/drawable/splash.png"
    echo "   - drawable/splash.png (480x320)"
  fi
fi

echo ""
echo "✅ All Android icons generated successfully!"

