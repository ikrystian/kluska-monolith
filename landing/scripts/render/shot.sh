#!/bin/bash
# usage: shot.sh <page> <w> <h> <out.png> [extra query]
chromium --headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist \
  --hide-scrollbars --window-size=$2,$(( $3 + 300 )) --virtual-time-budget=90000 --run-all-compositor-stages-before-draw \
  --screenshot="$4.raw.png" "http://localhost:8765/$1?w=$2&h=$3&$5" 2>/dev/null
magick "$4.raw.png" -crop ${2}x${3}+0+0 +repage "$4" && rm "$4.raw.png"
