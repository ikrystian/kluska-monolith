# Landing renders

Source scenes for the images in `public/images/` (three.js, rendered in headless Chromium).

```bash
cd scripts/render
npm i --no-save three@0.170.0
python3 -m http.server 8765 &
./shot.sh barbell.html 2400 1100 out-barbell.png "v=hero"
./shot.sh stack.html 1600 2000 out-stack.png
./shot.sh kettlebell.html 2000 1400 out-kettle.png
./shot.sh terrain.html 2400 1300 out-terrain.png
```

Grade + export (ImageMagick): saturation 88 %, soft radial vignette (white→gray55), Gaussian grain 0.12, WebP q84.
