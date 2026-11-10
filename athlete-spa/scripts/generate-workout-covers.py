"""Generates the workout template cover illustrations (SVG, 400x300).

Usage: python3 scripts/generate-workout-covers.py [out_dir]
Default out_dir: src/assets/workout-covers (one file per training focus + run.svg).
"""
import colorsys
import os
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "assets", "workout-covers")
os.makedirs(OUT, exist_ok=True)

W, H = 400, 300
FLOOR = 248

METAL = "#c3c8cf"
METAL_HI = "#eef1f4"
METAL_LO = "#7d848e"
IRON = "#2b3037"
IRON_HI = "#3b414a"
IRON_LO = "#1a1d22"


def shade(hex_color, light=0.0, sat=0.0):
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    ll = max(0, min(1, ll + light))
    ss = max(0, min(1, ss + sat))
    r, g, b = colorsys.hls_to_rgb(hh, ll, ss)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def background(accent, glow_x=0.62, glow_y=0.4, accent2=None):
    a2 = accent2 or accent
    return f"""
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#1d2026"/>
      <stop offset="1" stop-color="#0b0c0e"/>
    </linearGradient>
    <radialGradient id="glow" cx="{glow_x}" cy="{glow_y}" r="0.62">
      <stop offset="0" stop-color="{accent}" stop-opacity=".42"/>
      <stop offset=".55" stop-color="{a2}" stop-opacity=".1"/>
      <stop offset="1" stop-color="{a2}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-32)">
      <rect width="2" height="9" fill="#fff" fill-opacity=".028"/>
    </pattern>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".25"/>
      <stop offset="1" stop-color="#000" stop-opacity=".6"/>
    </linearGradient>
    <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".7"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{METAL_HI}"/>
      <stop offset=".5" stop-color="{METAL}"/>
      <stop offset="1" stop-color="{METAL_LO}"/>
    </linearGradient>
    <linearGradient id="metalV" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{METAL_LO}"/>
      <stop offset=".45" stop-color="{METAL_HI}"/>
      <stop offset="1" stop-color="{METAL_LO}"/>
    </linearGradient>
    <linearGradient id="iron" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="{IRON_HI}"/>
      <stop offset="1" stop-color="{IRON_LO}"/>
    </linearGradient>
  </defs>
  <rect width="{W}" height="{H}" fill="url(#bg)"/>
  <rect width="{W}" height="{H}" fill="url(#hatch)"/>
  <rect width="{W}" height="{H}" fill="url(#glow)"/>
  <g fill="none" stroke="{accent}" stroke-opacity=".09" stroke-width="1.5">
    <circle cx="{glow_x * W:.0f}" cy="{glow_y * H:.0f}" r="96"/>
    <circle cx="{glow_x * W:.0f}" cy="{glow_y * H:.0f}" r="138"/>
    <circle cx="{glow_x * W:.0f}" cy="{glow_y * H:.0f}" r="184"/>
  </g>
  <rect y="{FLOOR}" width="{W}" height="{H - FLOOR}" fill="url(#floor)"/>
  <rect y="{FLOOR}" width="{W}" height="1" fill="#fff" fill-opacity=".09"/>"""


def shadow(cx, w, h=14, y=FLOOR):
    return f'<ellipse cx="{cx}" cy="{y + 2}" rx="{w / 2}" ry="{h / 2}" fill="url(#shadow)"/>'


def plate_edge(x, cy, w, h, color):
    """A plate seen edge-on (front view of a barbell)."""
    hi = shade(color, 0.14)
    lo = shade(color, -0.16)
    return (
        f'<rect x="{x}" y="{cy - h / 2}" width="{w}" height="{h}" rx="3" fill="{color}"/>'
        f'<rect x="{x}" y="{cy - h / 2}" width="{w * 0.32:.1f}" height="{h}" rx="2" fill="{hi}" opacity=".9"/>'
        f'<rect x="{x + w * 0.72:.1f}" y="{cy - h / 2}" width="{w * 0.28:.1f}" height="{h}" rx="2" fill="{lo}"/>'
        f'<rect x="{x + 1}" y="{cy - h / 2 + 6}" width="{max(1, w - 2)}" height="2" fill="#000" opacity=".18"/>'
        f'<rect x="{x + 1}" y="{cy + h / 2 - 8}" width="{max(1, w - 2)}" height="2" fill="#000" opacity=".18"/>'
    )


def barbell_front(cy, x1, x2, plates_left, plates_right, collar_in, bar_h=6):
    """plates_* = list of (width, height, color) from the collar outward."""
    cx = (x1 + x2) / 2
    out = [
        f'<rect x="{x1}" y="{cy - bar_h / 2}" width="{x2 - x1}" height="{bar_h}" rx="2" fill="url(#metal)"/>',
    ]
    # knurling on the grip
    for i in range(-9, 10):
        if abs(i) < 2:
            continue
        out.append(f'<rect x="{cx + i * 6 - 1:.0f}" y="{cy - bar_h / 2}" width="1.2" height="{bar_h}" fill="#000" opacity=".18"/>')
    # sleeves
    sl = collar_in
    out.append(f'<rect x="{x1}" y="{cy - 5}" width="{cx - sl - x1}" height="10" rx="2" fill="url(#metal)"/>')
    out.append(f'<rect x="{cx + sl}" y="{cy - 5}" width="{x2 - cx - sl}" height="10" rx="2" fill="url(#metal)"/>')
    # collars
    for x in (cx - sl - 6, cx + sl):
        out.append(f'<rect x="{x}" y="{cy - 11}" width="6" height="22" rx="2" fill="url(#metalV)"/>')
    # plates
    x = cx - sl - 6
    for w, h, c in plates_left:
        x -= w + 1
        out.append(plate_edge(x, cy, w, h, c))
    x = cx + sl + 6
    for w, h, c in plates_right:
        out.append(plate_edge(x, cy, w, h, c))
        x += w + 1
    return "\n  ".join(out)


def plate_round(cx, cy, r, color, holes=True):
    """A plate seen face-on."""
    lo = shade(color, -0.17)
    hi = shade(color, 0.12)
    out = [
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{lo}"/>',
        f'<circle cx="{cx - 2}" cy="{cy - 2}" r="{r - 3}" fill="{color}"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r * 0.78:.1f}" fill="none" stroke="{lo}" stroke-width="3"/>',
        f'<path d="M {cx - r * 0.66:.1f} {cy - r * 0.42:.1f} A {r * 0.78:.1f} {r * 0.78:.1f} 0 0 1 {cx + r * 0.2:.1f} {cy - r * 0.76:.1f}" fill="none" stroke="{hi}" stroke-width="3" stroke-linecap="round" opacity=".8"/>',
    ]
    if holes:
        import math
        for ang in (90, 210, 330):
            a = math.radians(ang)
            hx, hy = cx + math.cos(a) * r * 0.5, cy - math.sin(a) * r * 0.5
            out.append(
                f'<rect x="{hx - r * 0.17:.1f}" y="{hy - r * 0.075:.1f}" width="{r * 0.34:.1f}" height="{r * 0.15:.1f}" rx="{r * 0.075:.1f}" '
                f'fill="{shade(color, -0.32)}" transform="rotate({-ang + 90} {hx:.1f} {hy:.1f})"/>'
            )
    out += [
        f'<circle cx="{cx}" cy="{cy}" r="{r * 0.24:.1f}" fill="{shade(color, -0.26)}"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r * 0.16:.1f}" fill="url(#metal)"/>',
        f'<circle cx="{cx}" cy="{cy}" r="{r * 0.07:.1f}" fill="{IRON_LO}"/>',
    ]
    return "\n  ".join(out)


def dumbbell(cx, cy, angle, color, scale=1.0):
    s = scale
    lo = shade(color, -0.16)
    parts = [
        f'<rect x="{-58 * s}" y="{-5 * s}" width="{116 * s}" height="{10 * s}" rx="{3 * s}" fill="url(#metal)"/>',
    ]
    for i in range(-6, 7):
        parts.append(f'<rect x="{i * 7 * s - 0.6:.1f}" y="{-5 * s}" width="1.2" height="{10 * s}" fill="#000" opacity=".2"/>')
    for sign in (-1, 1):
        x_col = 52 * s if sign > 0 else -58 * s
        parts.append(f'<rect x="{x_col}" y="{-13 * s}" width="{6 * s}" height="{26 * s}" rx="{2 * s}" fill="url(#metalV)"/>')
        x_head = 58 * s if sign > 0 else -88 * s
        parts.append(f'<rect x="{x_head}" y="{-38 * s}" width="{30 * s}" height="{76 * s}" rx="{9 * s}" fill="{color}"/>')
        parts.append(f'<rect x="{x_head + (20 * s if sign > 0 else 0)}" y="{-38 * s}" width="{10 * s}" height="{76 * s}" rx="{6 * s}" fill="{lo}"/>')
        parts.append(f'<rect x="{x_head + 4 * s}" y="{-32 * s}" width="{5 * s}" height="{64 * s}" rx="{2.5 * s}" fill="#fff" opacity=".22"/>')
        x_cap = 88 * s if sign > 0 else -96 * s
        parts.append(f'<rect x="{x_cap}" y="{-16 * s}" width="{8 * s}" height="{32 * s}" rx="{3 * s}" fill="url(#metalV)"/>')
    return f'<g transform="translate({cx} {cy}) rotate({angle})">' + "".join(parts) + "</g>"


def svg(title, body):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{title}">
  {body}
</svg>
"""


covers = {}

# --- NOGI: squat rack with a loaded bar -------------------------------------
A = "#b5e83a"
rack = []
for x in (124, 262):
    rack.append(f'<rect x="{x}" y="34" width="14" height="{FLOOR - 34}" fill="url(#iron)"/>')
    for y in range(52, FLOOR - 10, 16):
        rack.append(f'<circle cx="{x + 7}" cy="{y}" r="2.2" fill="#0d0f12"/>')
    rack.append(f'<rect x="{x - 14}" y="{FLOOR - 7}" width="42" height="7" rx="2" fill="{IRON_HI}"/>')
    # J-hook
    hx = x + 14 if x < 200 else x - 9
    rack.append(f'<rect x="{x - 4 if x < 200 else x + 4}" y="112" width="14" height="10" rx="2" fill="{IRON_HI}"/>')
rack.append(f'<rect x="118" y="30" width="164" height="12" rx="2" fill="{IRON_HI}"/>')
rack.append(f'<rect x="118" y="30" width="164" height="3" fill="#fff" opacity=".07"/>')
covers["legs"] = svg("Nogi", background(A, 0.5, 0.38) + "\n  " + shadow(200, 330, 18) + "\n  " + "\n  ".join(rack) + "\n  " + barbell_front(
    106, 36, 364,
    [(15, 118, A), (15, 118, A), (12, 84, shade(A, -0.1, -0.2))],
    [(15, 118, A), (15, 118, A), (12, 84, shade(A, -0.1, -0.2))],
    collar_in=88,
))

# --- CAŁE CIAŁO: deadlift bar on the floor, brand orange | lime ---------------
A1, A2 = "#ff6a2b", "#b5e83a"
body = background(A1, 0.32, 0.5, A2)
body += f"""
  <rect width="{W}" height="{H}" fill="url(#glow2)"/>
  <defs><radialGradient id="glow2" cx=".72" cy=".5" r=".55"><stop offset="0" stop-color="{A2}" stop-opacity=".3"/><stop offset="1" stop-color="{A2}" stop-opacity="0"/></radialGradient></defs>
  {shadow(200, 360, 20)}
  {barbell_front(FLOOR - 72, 26, 374,
      [(17, 144, A1), (17, 144, A1), (13, 104, shade(A1, -0.08))],
      [(17, 144, A2), (17, 144, A2), (13, 104, shade(A2, -0.08))],
      collar_in=106, bar_h=7)}
  <g fill="#fff" opacity=".5">
    <circle cx="178" cy="160" r="1.4"/><circle cx="190" cy="150" r="1"/><circle cx="214" cy="156" r="1.6"/>
    <circle cx="226" cy="146" r="1"/><circle cx="200" cy="142" r="1.2"/><circle cx="168" cy="148" r=".9"/>
  </g>"""
covers["fullbody"] = svg("Całe ciało", body)

# --- KLATKA: bench press station (side view) -------------------------------
A = "#ff6a2b"
bench = f"""
  {shadow(200, 300, 16)}
  <rect x="284" y="62" width="14" height="{FLOOR - 62}" fill="url(#iron)"/>
  <rect x="268" y="{FLOOR - 7}" width="48" height="7" rx="2" fill="{IRON_HI}"/>
  <path d="M 284 104 h -16 v 22 h 8 v -12 h 8 z" fill="{IRON_HI}"/>
  <rect x="96" y="194" width="176" height="9" rx="2" fill="{IRON_HI}"/>
  <rect x="98" y="194" width="11" height="{FLOOR - 194}" fill="url(#iron)"/>
  <rect x="250" y="194" width="11" height="{FLOOR - 194}" fill="url(#iron)"/>
  <rect x="84" y="{FLOOR - 7}" width="38" height="7" rx="2" fill="{IRON_HI}"/>
  <rect x="236" y="{FLOOR - 7}" width="38" height="7" rx="2" fill="{IRON_HI}"/>
  <rect x="74" y="176" width="214" height="20" rx="9" fill="#24282e"/>
  <rect x="78" y="177" width="206" height="5" rx="2.5" fill="#fff" opacity=".1"/>
  <rect x="74" y="190" width="214" height="6" rx="3" fill="{shade(A, -0.25)}"/>
  <circle cx="{276 + 9}" cy="108" r="60" fill="{shade(A, -0.3)}"/>
  {plate_round(276, 108, 60, A)}
"""
covers["chest"] = svg("Klatka", background(A, 0.66, 0.36) + bench)

# --- PLECY: pull-up beam with gymnastic rings ------------------------------
A = "#4d8dff"
rings = f"""
  <rect x="62" y="0" width="12" height="52" fill="url(#iron)"/>
  <rect x="326" y="0" width="12" height="52" fill="url(#iron)"/>
  <rect x="28" y="48" width="344" height="16" rx="4" fill="url(#metal)"/>
  <rect x="28" y="48" width="344" height="16" rx="4" fill="none" stroke="#000" stroke-opacity=".25"/>
"""
for x in (148, 252):
    rings += f"""
  <rect x="{x - 7}" y="58" width="14" height="14" rx="3" fill="{IRON_HI}"/>
  <rect x="{x - 3.5}" y="66" width="7" height="92" fill="{shade(A, -0.22)}"/>
  <rect x="{x - 3.5}" y="66" width="2" height="92" fill="#fff" opacity=".18"/>
  <rect x="{x - 8}" y="104" width="16" height="12" rx="2" fill="url(#metalV)"/>
  <circle cx="{x}" cy="186" r="31" fill="none" stroke="{shade(A, -0.2)}" stroke-width="11"/>
  <circle cx="{x - 1.5}" cy="184.5" r="31" fill="none" stroke="{A}" stroke-width="8"/>
  <path d="M {x - 24} {172} A 27 27 0 0 1 {x + 8} {157}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".45"/>
  <rect x="{x - 9}" y="150" width="18" height="10" rx="3" fill="{shade(A, -0.3)}"/>
"""
rings += shadow(200, 220, 10)
covers["back"] = svg("Plecy", background(A, 0.5, 0.52) + rings)

# --- BARKI: crossed dumbbells ----------------------------------------------
A = "#f5c04a"
covers["shoulders"] = svg("Barki", background(A, 0.5, 0.44) + f"""
  {shadow(200, 260, 16)}
  {dumbbell(200, 140, -28, shade(A, -0.06), 1.0)}
  <g opacity=".55">{dumbbell(203, 146, 28, "#000000", 1.0)}</g>
  {dumbbell(200, 140, 28, A, 1.0)}
""")

# --- RAMIONA: EZ curl bar ---------------------------------------------------
A = "#a88bff"
cy = 132
ez_pts = [(40, cy), (136, cy), (152, cy - 11), (174, cy + 11), (200, cy), (226, cy + 11), (248, cy - 11), (264, cy), (360, cy)]
pts = " ".join(f"{x},{y}" for x, y in ez_pts)
ez = f"""
  {shadow(200, 300, 16)}
  <polyline points="{pts}" fill="none" stroke="{METAL_LO}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
  <polyline points="{pts}" fill="none" stroke="{METAL}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" transform="translate(0 -1)"/>
  <polyline points="{pts}" fill="none" stroke="{METAL_HI}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" transform="translate(0 -2.5)" opacity=".8"/>
"""
for x1, x2, inward in ((40, 108, 1), (292, 360, -1)):
    ez += f'<rect x="{x1}" y="{cy - 5}" width="{x2 - x1}" height="10" rx="2" fill="url(#metal)"/>'
collar_l, collar_r = 108, 286
ez += f'<rect x="{collar_l}" y="{cy - 11}" width="6" height="22" rx="2" fill="url(#metalV)"/>'
ez += f'<rect x="{collar_r}" y="{cy - 11}" width="6" height="22" rx="2" fill="url(#metalV)"/>'
x = collar_l
for w, h, c in ((14, 100, A), (12, 74, shade(A, -0.1, -0.15))):
    x -= w + 1
    ez += plate_edge(x, cy, w, h, c)
x = collar_r + 6
for w, h, c in ((14, 100, A), (12, 74, shade(A, -0.1, -0.15))):
    x += 1
    ez += plate_edge(x, cy, w, h, c)
    x += w
ez += f"""
  {shadow(292, 120, 8)}
  {dumbbell(292, 226, 0, shade(A, -0.12), 0.42)}
"""
covers["arms"] = svg("Ramiona", background(A, 0.5, 0.4) + ez)

# --- BRZUCH: ab wheel + kettlebell -----------------------------------------
A = "#2dd4bf"
kb_cx, kb_cy, kb_r = 292, 202, 46
core = f"""
  {shadow(170, 200, 12)}
  {shadow(kb_cx, 110, 10)}
  <rect x="78" y="183" width="184" height="9" rx="4" fill="url(#metal)"/>
  <rect x="74" y="176" width="46" height="23" rx="10" fill="#22262c"/>
  <rect x="78" y="178" width="38" height="5" rx="2.5" fill="#fff" opacity=".1"/>
  <rect x="220" y="176" width="46" height="23" rx="10" fill="#22262c"/>
  <rect x="224" y="178" width="38" height="5" rx="2.5" fill="#fff" opacity=".1"/>
  <rect x="146" y="{FLOOR - 120}" width="48" height="120" rx="22" fill="#1f2328"/>
  <rect x="152" y="{FLOOR - 116}" width="36" height="112" rx="17" fill="{shade(A, -0.22)}"/>
  <rect x="157" y="{FLOOR - 112}" width="26" height="104" rx="13" fill="{A}"/>
  <rect x="160" y="{FLOOR - 104}" width="6" height="88" rx="3" fill="#fff" opacity=".28"/>
  <rect x="156" y="182" width="28" height="11" rx="3" fill="url(#metalV)"/>
  <path d="M {kb_cx - 30} {kb_cy - 26} C {kb_cx - 34} {kb_cy - 86}, {kb_cx + 34} {kb_cy - 86}, {kb_cx + 30} {kb_cy - 26}"
        fill="none" stroke="{shade(A, -0.28)}" stroke-width="15" stroke-linecap="round"/>
  <path d="M {kb_cx - 30} {kb_cy - 27} C {kb_cx - 33} {kb_cy - 84}, {kb_cx + 33} {kb_cy - 84}, {kb_cx + 30} {kb_cy - 27}"
        fill="none" stroke="{shade(A, -0.12)}" stroke-width="10" stroke-linecap="round"/>
  <path d="M {kb_cx - 22} {kb_cy - 56} C {kb_cx - 12} {kb_cy - 74}, {kb_cx + 8} {kb_cy - 76}, {kb_cx + 18} {kb_cy - 66}"
        fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".35"/>
  <clipPath id="kbclip"><rect x="0" y="0" width="{W}" height="{FLOOR}"/></clipPath>
  <g clip-path="url(#kbclip)">
    <circle cx="{kb_cx}" cy="{kb_cy}" r="{kb_r}" fill="{shade(A, -0.2)}"/>
    <circle cx="{kb_cx - 3}" cy="{kb_cy - 3}" r="{kb_r - 3}" fill="{A}"/>
    <path d="M {kb_cx - 32} {kb_cy - 14} A 36 36 0 0 1 {kb_cx - 6} {kb_cy - 38}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".35"/>
    <rect x="{kb_cx - 30}" y="{FLOOR - 8}" width="60" height="8" fill="{shade(A, -0.3)}"/>
  </g>
"""
covers["core"] = svg("Brzuch", background(A, 0.55, 0.5) + core)

# --- BIEG: route on a dark map ----------------------------------------------
A = "#4d8dff"
run = f"""
  <defs>
    <linearGradient id="bgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16202e"/><stop offset="1" stop-color="#0a0d12"/></linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="{W}" height="{H}" fill="url(#bgr)"/>
  <path d="M 230 0 C 250 60, 330 70, 400 60 L 400 0 Z" fill="#1d3a2a" opacity=".55"/>
  <path d="M 0 210 C 60 190, 110 230, 150 300 L 0 300 Z" fill="#1d3a2a" opacity=".45"/>
  <path d="M -10 120 C 80 140, 160 90, 240 120 S 360 170, 410 150" fill="none" stroke="#1f3b5c" stroke-width="16" opacity=".8"/>
  <g stroke="#fff" stroke-opacity=".07" stroke-width="5" fill="none">
    <path d="M 0 40 L 400 90"/><path d="M 0 250 L 400 200"/><path d="M 60 0 L 110 300"/>
    <path d="M 180 0 L 200 300"/><path d="M 300 0 L 280 300"/><path d="M 0 170 L 400 260"/>
  </g>
  <g stroke="#fff" stroke-opacity=".035" stroke-width="2" fill="none">
    <path d="M 0 80 L 400 130"/><path d="M 0 300 L 400 30"/><path d="M 130 0 L 160 300"/><path d="M 350 0 L 330 300"/>
  </g>
  <path id="route" d="M 82 232 C 70 180, 120 170, 150 150 S 170 90, 214 84 S 300 120, 312 92 S 300 40, 338 46"
        fill="none" stroke="{A}" stroke-width="12" stroke-linecap="round" filter="url(#soft)" opacity=".7"/>
  <path d="M 82 232 C 70 180, 120 170, 150 150 S 170 90, 214 84 S 300 120, 312 92 S 300 40, 338 46"
        fill="none" stroke="{A}" stroke-width="6" stroke-linecap="round"/>
  <path d="M 82 232 C 70 180, 120 170, 150 150 S 170 90, 214 84 S 300 120, 312 92 S 300 40, 338 46"
        fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1 9" opacity=".7"/>
  <circle cx="82" cy="232" r="9" fill="#0a0d12" stroke="#fff" stroke-width="4"/>
  <circle cx="338" cy="46" r="13" fill="{A}" opacity=".35"/>
  <circle cx="338" cy="46" r="7" fill="{A}" stroke="#fff" stroke-width="3"/>
"""
covers["run"] = svg("Bieg", run)

for name, content in covers.items():
    with open(os.path.join(OUT, f"{name}.svg"), "w") as f:
        f.write(content)
    print(name, len(content))
