import { useId, type ReactNode } from 'react';
import './pet.css';

/**
 * Otoczenie zwierzaka (viewBox 320×220, horyzont podłogi na y≈150, zwierzak
 * stoi na y≈196). Każde tło ma własne sloty na meble ścienne, żeby półka
 * i plakat nie wchodziły na okno czy lustro; w plenerze stają na palikach.
 */

interface RoomSpec {
  outdoor: boolean;
  shelf: [number, number];
  poster: [number, number];
}

const ROOMS: Record<string, RoomSpec> = {
  bg_room: { outdoor: false, shelf: [16, 54], poster: [122, 26] },
  bg_gym: { outdoor: false, shelf: [226, 46], poster: [130, 24] },
  bg_forest: { outdoor: true, shelf: [14, 78], poster: [226, 84] },
  bg_beach: { outdoor: true, shelf: [96, 84], poster: [196, 80] },
};

const spec = (id: string) => ROOMS[id] ?? ROOMS.bg_room;
const at = (x: number, y: number) => ({ transformOrigin: `${x}px ${y}px` });

function Cloud({ x, y, s = 1, className }: { x: number; y: number; s?: number; className?: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff">
        <ellipse cx={0} cy={0} rx={18} ry={7} />
        <ellipse cx={-8} cy={-5} rx={9} ry={7} />
        <ellipse cx={5} cy={-7} rx={11} ry={9} />
        <ellipse cx={15} cy={-2} rx={8} ry={6} />
      </g>
    </g>
  );
}

/* ---------- Przytulny pokój ---------- */

function CozyRoom({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBEEDD" />
          <stop offset="1" stopColor="#F1DABD" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9A974" />
          <stop offset="1" stopColor="#B98253" />
        </linearGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9FD8F6" />
          <stop offset="1" stopColor="#E3F5FC" />
        </linearGradient>
        <clipPath id={`${id}-glass`}>
          <rect x={214} y={34} width={66} height={62} rx={3} />
        </clipPath>
      </defs>

      <rect width={320} height={152} fill={`url(#${id}-wall)`} />
      {Array.from({ length: 11 }, (_, i) => (
        <rect key={i} x={i * 32 + 8} y={0} width={10} height={152} fill="#fff" opacity={0.2} />
      ))}

      {/* Chorągiewki pod sufitem */}
      <path d="M0 6 Q80 26 160 12 T320 8" fill="none" stroke="#B98253" strokeWidth={1.4} />
      {[
        [22, 11, '#FF6B2C'],
        [56, 17, '#FFC53D'],
        [90, 19, '#3D7FF0'],
        [124, 16, '#FF4D6D'],
        [160, 12, '#7CE0A3'],
        [196, 11, '#FF6B2C'],
      ].map(([x, y, color]) => (
        <g key={x as number} className="room-flag" style={at(x as number, y as number)}>
          <path d={`M${(x as number) - 7} ${y} H${(x as number) + 7} L${x} ${(y as number) + 14} Z`} fill={color as string} />
        </g>
      ))}

      {/* Okno */}
      <rect x={206} y={26} width={82} height={78} rx={7} fill="#fff" />
      <rect x={214} y={34} width={66} height={62} rx={3} fill={`url(#${id}-sky)`} />
      <g clipPath={`url(#${id}-glass)`}>
        <circle cx={264} cy={50} r={9} fill="#FFE27A" />
        <circle className="room-sun" cx={264} cy={50} r={15} fill="#FFE27A" opacity={0.35} style={at(264, 50)} />
        <g className="room-window-cloud">
          <Cloud x={214} y={62} s={0.7} />
        </g>
        <path d="M214 96 V84 Q232 72 250 82 T280 78 V96 Z" fill="#9BD49A" />
        <path d="M214 96 V90 Q240 80 280 90 V96 Z" fill="#7CC27C" />
      </g>
      <path d="M247 34 V96 M214 65 H280" stroke="#fff" strokeWidth={5} />
      <rect x={200} y={100} width={94} height={8} rx={3} fill="#fff" />
      <rect x={200} y={106} width={94} height={3} rx={1.5} fill="#E2CDB4" />
      {/* Zasłony */}
      <path d="M200 20 H218 C220 50 214 80 204 106 H198 Z" fill="#F4A28C" />
      <path d="M294 20 H276 C274 50 280 80 290 106 H296 Z" fill="#F4A28C" />
      <path d="M206 22 C208 50 204 80 200 104 M288 22 C286 50 290 80 294 104" fill="none" stroke="#E0806A" strokeWidth={1.6} />
      <rect x={194} y={16} width={106} height={5} rx={2.5} fill="#8A5A32" />

      {/* Listwa i podłoga */}
      <rect y={146} width={320} height={8} fill="#FBF4EA" />
      <rect y={152} width={320} height={2.6} fill="#D9C2A2" />
      <rect y={154} width={320} height={66} fill={`url(#${id}-floor)`} />
      <path d="M0 170 H320 M0 192 H320" stroke="#A8743F" strokeWidth={1.2} opacity={0.6} />
      <path d="M40 154 L28 170 M120 154 L114 170 M200 154 L206 170 M280 154 L292 170 M74 170 L56 192 M160 170 L160 192 M246 170 L264 192 M20 192 L0 214 M110 192 L96 220 M210 192 L224 220 M300 192 L320 214" stroke="#A8743F" strokeWidth={1.2} opacity={0.5} />

      {/* Światło z okna */}
      <path className="room-beam" d="M214 96 H280 L254 220 H112 Z" fill="#FFF4C2" opacity={0.16} />
      <g fill="#fff">
        {[
          [232, 124],
          [214, 150],
          [246, 168],
          [200, 180],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} className="room-mote" cx={x} cy={y} r={1.3} />
        ))}
      </g>

      {/* Dywan */}
      <ellipse cx={160} cy={199} rx={98} ry={17} fill="#D9573F" />
      <ellipse cx={160} cy={197.6} rx={98} ry={17} fill="#EE7458" />
      <ellipse cx={160} cy={197.6} rx={82} ry={12.6} fill="none" stroke="#FBD9A5" strokeWidth={2} strokeDasharray="6 5" />
      <ellipse cx={160} cy={197.6} rx={62} ry={8.6} fill="#F38A6E" />
    </>
  );
}

/* ---------- Siłownia ---------- */

function GymRoom({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#353B50" />
          <stop offset="1" stopColor="#262B3A" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#232733" />
          <stop offset="1" stopColor="#161920" />
        </linearGradient>
        <linearGradient id={`${id}-mirror`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7C8BA8" />
          <stop offset="1" stopColor="#465068" />
        </linearGradient>
        <clipPath id={`${id}-glass`}>
          <rect x={20} y={28} width={96} height={108} rx={3} />
        </clipPath>
      </defs>

      <rect width={320} height={152} fill={`url(#${id}-wall)`} />
      <path d="M96 0 L60 152 H132 L156 0 Z M214 0 L196 152 H262 L262 0 Z" fill="#fff" opacity={0.035} />
      <rect y={112} width={320} height={10} fill="#FF5A1F" />
      <rect y={122} width={320} height={2.4} fill="#fff" opacity={0.25} />

      {/* Lustro */}
      <rect x={14} y={22} width={108} height={120} rx={6} fill="#98A3B8" />
      <rect x={20} y={28} width={96} height={108} rx={3} fill={`url(#${id}-mirror)`} />
      <g clipPath={`url(#${id}-glass)`}>
        <rect x={20} y={116} width={96} height={20} fill="#2B303B" opacity={0.55} />
        <rect x={20} y={104} width={96} height={5} fill="#FF5A1F" opacity={0.4} />
        <path d="M30 136 L66 28 H82 L46 136 Z M62 136 L98 28 H104 L68 136 Z" fill="#fff" opacity={0.13} />
        <path className="room-glint" d="M10 136 L46 28 H58 L22 136 Z" fill="#fff" />
      </g>

      {/* Neon */}
      <g className="room-neon">
        <path d="M204 30 L188 58 H200 L192 82 L216 50 H203 Z" fill="none" stroke="#C8FF3D" strokeOpacity={0.3} strokeWidth={9} strokeLinejoin="round" />
        <path d="M204 30 L188 58 H200 L192 82 L216 50 H203 Z" fill="none" stroke="#C8FF3D" strokeWidth={3} strokeLinejoin="round" />
        <path d="M204 30 L188 58 H200 L192 82 L216 50 H203 Z" fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={1} strokeLinejoin="round" />
      </g>

      {/* Stojak z hantlami */}
      <rect x={220} y={106} width={5} height={48} fill="#7C879A" />
      <rect x={298} y={106} width={5} height={48} fill="#7C879A" />
      {[112, 134].map((y, row) => (
        <g key={y}>
          <rect x={214} y={y + 10} width={96} height={5} rx={2} fill="#98A3B8" />
          <rect x={214} y={y + 13} width={96} height={2} fill="#5B6577" />
          {[226, 256, 286].map((x, i) => {
            const color = ['#FF6B2C', '#FFC53D', '#3D7FF0'][(i + row) % 3];
            return (
              <g key={x}>
                <rect x={x - 8} y={y + 2} width={16} height={4} rx={2} fill="#C4CBD6" />
                <rect x={x - 12} y={y - 3} width={6} height={13} rx={2.4} fill={color} />
                <rect x={x + 6} y={y - 3} width={6} height={13} rx={2.4} fill={color} />
                <rect x={x - 12} y={y - 3} width={6} height={4} rx={2} fill="#fff" opacity={0.3} />
                <rect x={x + 6} y={y - 3} width={6} height={4} rx={2} fill="#fff" opacity={0.3} />
              </g>
            );
          })}
        </g>
      ))}

      {/* Guma na podłodze */}
      <rect y={152} width={320} height={68} fill={`url(#${id}-floor)`} />
      <rect y={152} width={320} height={3} fill="#3B4252" />
      <path d="M0 172 H320 M0 196 H320 M54 155 L24 220 M124 155 L108 220 M196 155 L212 220 M266 155 L296 220" stroke="#fff" strokeWidth={1} opacity={0.07} />
      <g fill="#fff" opacity={0.14}>
        {[
          [30, 164],
          [88, 184],
          [146, 162],
          [240, 178],
          [290, 206],
          [64, 208],
          [176, 212],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1} />
        ))}
      </g>

      {/* Mata */}
      <path d="M88 186 H232 L250 213 H70 Z" fill="#1E4FB3" />
      <path d="M88 184 H232 L250 211 H70 Z" fill="#3D7FF0" />
      <path d="M94 188 H226 L238 206 H82 Z" fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={1.4} />

      {/* Kettlebell */}
      <ellipse cx={40} cy={205} rx={15} ry={3} fill="#000" opacity={0.35} />
      <path d="M32 186 C30 174 50 174 48 186" fill="none" stroke="#4A5262" strokeWidth={5} strokeLinecap="round" />
      <circle cx={40} cy={193} r={12.5} fill="#2B303B" />
      <path d="M31 188 a10 10 0 0 1 8 -6" fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M29 196 H51" stroke="#FF5A1F" strokeWidth={4} />
    </>
  );
}

/* ---------- Leśna polana ---------- */

function Pine({ x, base, h, tone }: { x: number; base: number; h: number; tone: [string, string, string] }) {
  const w = h * 0.42;
  return (
    <g className="room-sway-slow" style={at(x, base)}>
      <rect x={x - h * 0.045} y={base - h * 0.2} width={h * 0.09} height={h * 0.2} fill="#7A5236" />
      <path d={`M${x} ${base - h} L${x + w * 0.62} ${base - h * 0.52} H${x - w * 0.62} Z`} fill={tone[2]} />
      <path d={`M${x} ${base - h * 0.76} L${x + w * 0.84} ${base - h * 0.3} H${x - w * 0.84} Z`} fill={tone[1]} />
      <path d={`M${x} ${base - h * 0.52} L${x + w} ${base - h * 0.14} H${x - w} Z`} fill={tone[0]} />
      <path d={`M${x} ${base - h} L${x + w * 0.62} ${base - h * 0.52} H${x} Z M${x} ${base - h * 0.76} L${x + w * 0.84} ${base - h * 0.3} H${x} Z M${x} ${base - h * 0.52} L${x + w} ${base - h * 0.14} H${x} Z`} fill="#0E3B25" opacity={0.18} />
    </g>
  );
}

function Butterfly({ x, y, color, className }: { x: number; y: number; color: string; className: string }) {
  return (
    <g className={className}>
      <g className="room-wing" style={at(x, y)}>
        <path d={`M${x} ${y} C${x - 7} ${y - 8} ${x - 9} ${y + 1} ${x} ${y + 1} C${x + 9} ${y + 1} ${x + 7} ${y - 8} ${x} ${y} Z`} fill={color} />
        <path d={`M${x} ${y + 1} C${x - 5} ${y + 6} ${x - 5} ${y + 1} ${x} ${y + 1} C${x + 5} ${y + 1} ${x + 5} ${y + 6} ${x} ${y + 1} Z`} fill={color} opacity={0.75} />
      </g>
      <path d={`M${x} ${y - 2} V${y + 4}`} stroke="#3A2E2A" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

function ForestRoom({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9DDF6" />
          <stop offset="1" stopColor="#EAF8E8" />
        </linearGradient>
        <linearGradient id={`${id}-grass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ACB78" />
          <stop offset="1" stopColor="#5FA85A" />
        </linearGradient>
      </defs>

      <rect width={320} height={160} fill={`url(#${id}-sky)`} />
      <circle className="room-sun" cx={258} cy={34} r={30} fill="#FFE58A" opacity={0.4} style={at(258, 34)} />
      <circle cx={258} cy={34} r={17} fill="#FFE58A" />
      <path className="room-beam" d="M258 34 L120 160 H170 Z M258 34 L196 160 H232 Z" fill="#FFF4C2" opacity={0.16} />
      <Cloud x={0} y={40} className="room-cloud" />
      <Cloud x={0} y={66} s={0.7} className="room-cloud-slow" />

      <path d="M0 128 Q50 96 110 116 T230 104 T320 112 V160 H0 Z" fill="#B6DDAB" />
      <path d="M0 140 Q70 116 150 132 T320 124 V160 H0 Z" fill="#9AD093" />
      {[
        [70, 132, 26],
        [96, 136, 20],
        [150, 134, 24],
        [206, 130, 22],
        [232, 132, 28],
      ].map(([x, base, h]) => (
        <path key={x} d={`M${x} ${base - h} L${x + h * 0.36} ${base} H${x - h * 0.36} Z`} fill="#6FB583" />
      ))}

      <rect y={148} width={320} height={72} fill={`url(#${id}-grass)`} />
      <path d="M0 150 Q80 142 160 150 T320 148 V156 H0 Z" fill="#9AD68A" />

      {/* Ścieżka */}
      <path d="M96 220 C118 196 176 186 170 168 C166 158 174 152 182 150 H196 C190 154 186 160 192 170 C204 188 228 200 240 220 Z" fill="#E6CE9A" />
      <path d="M96 220 C118 196 176 186 170 168 C166 158 174 152 182 150" fill="none" stroke="#CDB37C" strokeWidth={2} />

      <Pine x={34} base={198} h={150} tone={['#2F8656', '#3A9963', '#4BB077']} />
      <Pine x={292} base={186} h={112} tone={['#2A7A4E', '#35905C', '#45A66E']} />
      <Pine x={76} base={166} h={66} tone={['#3A9963', '#4BB077', '#5FBF88']} />

      {/* Krzaki i kwiaty */}
      <g>
        <ellipse cx={266} cy={196} rx={26} ry={13} fill="#3F9A5E" />
        <ellipse cx={250} cy={199} rx={16} ry={10} fill="#4BB077" />
        <ellipse cx={284} cy={200} rx={18} ry={10} fill="#358A52" />
        {[
          [254, 194, '#FF4D6D'],
          [270, 190, '#FFC53D'],
          [284, 197, '#FF4D6D'],
        ].map(([x, y, color]) => (
          <circle key={x as number} cx={x as number} cy={y as number} r={2.2} fill={color as string} />
        ))}
      </g>
      {[
        [18, 208, '#fff'],
        [60, 214, '#FFC53D'],
        [128, 206, '#fff'],
        [214, 210, '#FF93B0'],
        [306, 212, '#fff'],
      ].map(([x, y, color]) => (
        <g key={x as number}>
          <path d={`M${x} ${y} v6`} stroke="#3F9A5E" strokeWidth={1.2} />
          <circle cx={x as number} cy={y as number} r={2.6} fill={color as string} />
          <circle cx={x as number} cy={y as number} r={1} fill="#FFB020" />
        </g>
      ))}
      <path d="M8 196 l2 -8 l2 8 M46 204 l2 -7 l2 7 M186 214 l2 -8 l2 8 M236 208 l2 -7 l2 7" fill="none" stroke="#3F9A5E" strokeWidth={1.6} strokeLinecap="round" />

      <Butterfly x={116} y={112} color="#FF93B0" className="room-butterfly" />
      <Butterfly x={240} y={136} color="#FFC53D" className="room-butterfly-b" />
    </>
  );
}

/* ---------- Tropikalna plaża ---------- */

function BeachRoom({ id }: { id: string }) {
  const waves = 'M-40 0 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0';
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#63C3F1" />
          <stop offset="1" stopColor="#D5F2FC" />
        </linearGradient>
        <linearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B93C8" />
          <stop offset="1" stopColor="#4CC4E6" />
        </linearGradient>
        <linearGradient id={`${id}-sand`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8E4B0" />
          <stop offset="1" stopColor="#E9C883" />
        </linearGradient>
      </defs>

      <rect width={320} height={108} fill={`url(#${id}-sky)`} />
      <circle className="room-sun" cx={62} cy={38} r={34} fill="#FFE58A" opacity={0.4} style={at(62, 38)} />
      <circle cx={62} cy={38} r={19} fill="#FFE58A" />
      <Cloud x={0} y={30} className="room-cloud" />
      <Cloud x={0} y={58} s={0.7} className="room-cloud-slow" />

      {/* Wyspa na horyzoncie */}
      <path d="M186 106 Q204 92 226 106 Z" fill="#5FB583" opacity={0.7} />

      {/* Morze */}
      <rect y={104} width={320} height={54} fill={`url(#${id}-sea)`} />
      <g fill="none" stroke="#fff" strokeLinecap="round">
        <path className="room-wave-back" d={waves} transform="translate(0 116)" strokeWidth={1.6} strokeOpacity={0.4} />
        <path className="room-wave" d={waves} transform="translate(0 130)" strokeWidth={2} strokeOpacity={0.55} />
        <path className="room-wave-back" d={waves} transform="translate(0 144)" strokeWidth={2.4} strokeOpacity={0.7} />
      </g>
      <g fill="#fff">
        {[
          [40, 110],
          [112, 122],
          [170, 112],
          [250, 124],
          [296, 110],
          [80, 138],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} className="room-twinkle" cx={x} cy={y} r={1.4} />
        ))}
      </g>

      {/* Piasek i piana */}
      <path d="M0 156 Q80 146 160 156 T320 154 V220 H0 Z" fill="#E2C17E" />
      <g className="room-foam">
        <path d="M0 152 Q40 144 80 152 T160 152 T240 152 T320 150 V158 Q280 164 240 158 T160 160 T80 158 T0 160 Z" fill="#fff" opacity={0.9} />
      </g>
      <path d="M0 164 Q80 154 160 164 T320 162 V220 H0 Z" fill={`url(#${id}-sand)`} />
      <path d="M0 188 Q90 178 180 190 T320 184" fill="none" stroke="#DDB870" strokeWidth={2} opacity={0.6} />
      <g fill="#D9B46C" opacity={0.7}>
        {[
          [26, 180],
          [70, 200],
          [120, 176],
          [214, 204],
          [246, 180],
          [300, 198],
          [150, 212],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.3} />
        ))}
      </g>

      {/* Rozgwiazda i muszla */}
      <path d="M40 196 l2.6 6 l6.4 0.6 l-4.8 4.2 l1.4 6.2 l-5.6 -3.2 l-5.6 3.2 l1.4 -6.2 l-4.8 -4.2 l6.4 -0.6 Z" fill="#FF7A59" />
      <circle cx={40} cy={204.6} r={1.6} fill="#FFC2AE" />
      <path d="M226 212 C226 204 238 204 238 212 Z" fill="#FBE3EC" />
      <path d="M229 212 L231 206.6 M232 212 V206 M235 212 L233 206.6" stroke="#E7A9BF" strokeWidth={1} />

      {/* Palma */}
      <path d="M282 196 C280 160 270 116 252 76" fill="none" stroke="#8A5A32" strokeWidth={11} strokeLinecap="round" />
      <path d="M282 196 C280 160 270 116 252 76" fill="none" stroke="#A8743F" strokeWidth={5} strokeLinecap="round" />
      <path d="M277 172 h9 M275 148 h9 M271 124 h9 M265 100 h8" stroke="#6F4526" strokeWidth={1.8} strokeLinecap="round" />
      <g className="room-sway" style={at(252, 76)}>
        {[
          [-150, '#2F9E62'],
          [-110, '#3DB273'],
          [-64, '#2F9E62'],
          [-18, '#3DB273'],
          [24, '#2A8E57'],
          [62, '#3DB273'],
        ].map(([angle, color]) => (
          <path key={angle as number} d="M252 76 Q282 50 318 70 Q284 66 252 76 Z M252 76 Q286 60 318 70" fill={color as string} stroke={color as string} strokeWidth={3} strokeLinejoin="round" transform={`rotate(${angle} 252 76)`} />
        ))}
        <circle cx={256} cy={82} r={5} fill="#7A4A26" />
        <circle cx={247} cy={84} r={4.4} fill="#8A5A32" />
      </g>

      {/* Parasol */}
      <path d="M44 172 L52 108" stroke="#F4F1EC" strokeWidth={3} strokeLinecap="round" />
      <path d="M16 116 C24 94 80 92 90 112 Z" fill="#FF4D6D" />
      <path d="M34 103 C38 98 46 96 53 96 L52 113 L30 115 Z M70 99 C78 102 86 106 90 112 L70 112 Z" fill="#fff" />
      <circle cx={53} cy={95} r={2.4} fill="#F4F1EC" />
    </>
  );
}

function Background({ bg, id }: { bg: string; id: string }) {
  switch (bg) {
    case 'bg_gym':
      return <GymRoom id={id} />;
    case 'bg_forest':
      return <ForestRoom id={id} />;
    case 'bg_beach':
      return <BeachRoom id={id} />;
    default:
      return <CozyRoom id={id} />;
  }
}

/* ---------- Meble (rysowane od własnego punktu 0,0) ---------- */

const FURNITURE_BOX: Record<string, [number, number]> = {
  decor_plant: [54, 90],
  decor_bed: [86, 44],
  decor_trophy: [86, 48],
  decor_poster: [54, 70],
};

function FurnitureArt({ id }: { id: string }) {
  switch (id) {
    case 'decor_plant':
      return (
        <g>
          <ellipse cx={27} cy={87} rx={20} ry={3} fill="#000" opacity={0.18} />
          <g className="room-sway-slow" style={at(27, 62)}>
            <path d="M27 62 C8 54 2 30 10 12 C24 24 30 44 27 62 Z" fill="#2F8656" />
            <path d="M27 62 C46 52 52 26 42 6 C30 20 24 42 27 62 Z" fill="#3DA667" />
            <path d="M27 62 C22 40 24 18 27 2 C34 20 34 42 27 62 Z" fill="#59BF7E" />
            <path d="M27 62 C6 62 -2 50 0 38 C14 40 24 50 27 62 Z" fill="#3DA667" />
            <path d="M27 62 C48 62 56 50 54 40 C40 42 30 50 27 62 Z" fill="#2F8656" />
            <path d="M27 60 C20 44 14 28 11 16 M27 60 C34 42 38 26 41 10 M27 58 V8" fill="none" stroke="#1F6B42" strokeWidth={1} opacity={0.5} />
          </g>
          <path d="M11 60 H43 L39 84 C38.6 86 37 87 35 87 H19 C17 87 15.4 86 15 84 Z" fill="#C8643B" />
          <path d="M33 60 H43 L39 84 C38.6 86 37 87 35 87 H31 Z" fill="#A84E2A" />
          <rect x={9} y={56} width={36} height={7} rx={3} fill="#DD7A50" />
          <path d="M16 68 L18 82" stroke="#fff" strokeOpacity={0.3} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case 'decor_bed':
      return (
        <g>
          <ellipse cx={43} cy={40} rx={42} ry={4} fill="#000" opacity={0.18} />
          <path d="M2 24 C2 12 16 6 43 6 C70 6 84 12 84 24 V30 C84 38 70 42 43 42 C16 42 2 38 2 30 Z" fill="#5B4BD6" />
          <path d="M2 24 C2 12 16 6 43 6 C70 6 84 12 84 24 C84 32 70 36 43 36 C16 36 2 32 2 24 Z" fill="#7A6BEA" />
          <ellipse cx={43} cy={24} rx={32} ry={9} fill="#3F33A6" />
          <ellipse cx={43} cy={22.6} rx={30} ry={8} fill="#B9B0FF" />
          <ellipse cx={34} cy={20} rx={12} ry={3} fill="#fff" opacity={0.35} />
          <path d="M10 15 C18 10 28 8 40 8" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2.4} strokeLinecap="round" />
          <g fill="#fff" opacity={0.7} transform="translate(60 31) scale(0.34) rotate(-12)">
            <rect x={-10} y={-3} width={20} height={6} rx={3} />
            <circle cx={-11} cy={-4} r={4.4} />
            <circle cx={-11} cy={4} r={4.4} />
            <circle cx={11} cy={-4} r={4.4} />
            <circle cx={11} cy={4} r={4.4} />
          </g>
        </g>
      );
    case 'decor_trophy':
      return (
        <g>
          <rect x={2} y={36} width={82} height={7} rx={2.5} fill="#A8743F" />
          <rect x={2} y={41} width={82} height={2.4} fill="#7A5236" />
          <path d="M12 43 V48 L20 43 Z M74 43 V48 L66 43 Z" fill="#7A5236" />
          {[
            [18, 0.8, '#C9CED8', '#8D97A8'],
            [43, 1, '#FFC53D', '#C98A00'],
            [68, 0.72, '#E09A5B', '#A8652C'],
          ].map(([x, s, light, dark]) => (
            <g key={x as number} transform={`translate(${x} 36) scale(${s})`}>
              <rect x={-8} y={-4} width={16} height={4} rx={1.4} fill={dark as string} />
              <rect x={-2.6} y={-11} width={5.2} height={8} fill={dark as string} />
              <path d="M-11 -32 H11 V-24 C11 -16 6 -11 0 -11 C-6 -11 -11 -16 -11 -24 Z" fill={light as string} />
              <path d="M2 -32 H11 V-24 C11 -16 6 -11 0 -11 C5 -16 5 -24 2 -32 Z" fill={dark as string} opacity={0.5} />
              <path d="M-11 -29 C-18 -29 -18 -18 -9 -18 M11 -29 C18 -29 18 -18 9 -18" fill="none" stroke={light as string} strokeWidth={2.6} />
              <path d="M-7 -29 V-21" stroke="#fff" strokeOpacity={0.6} strokeWidth={2} strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    case 'decor_poster':
      return (
        <g>
          <rect x={2} y={4} width={50} height={64} rx={3} fill="#000" opacity={0.14} />
          <rect x={0} y={2} width={50} height={64} rx={3} fill="#FFF8EC" />
          <rect x={4} y={6} width={42} height={56} rx={2} fill="#FF5A1F" />
          <circle cx={36} cy={18} r={6} fill="#FFD166" />
          <path d="M4 50 L18 28 L26 40 L32 32 L46 52 V62 H4 Z" fill="#B93C1A" />
          <path d="M18 28 L22 34 L18 36 L14 34 Z M32 32 L35.4 37 L32 39 L29 36.6 Z" fill="#fff" opacity={0.9} />
          <path d="M9 56 H41" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
          <rect x={20} y={-1} width={10} height={5} rx={1.4} fill="#E2CDB4" />
        </g>
      );
    default:
      return null;
  }
}

/** Paliki pod meblami ściennymi, gdy „ściany” nie ma. */
function Posts({ x, y, width, bottom }: { x: number; y: number; width: number; bottom: number }) {
  return (
    <g>
      {[x + 8, x + width - 8].map(px => (
        <g key={px}>
          <rect x={px - 3} y={y} width={6} height={bottom - y} rx={2} fill="#8A5A32" />
          <rect x={px - 3} y={y} width={2.2} height={bottom - y} rx={1} fill="#A8743F" />
        </g>
      ))}
    </g>
  );
}

function Furniture({ item, bg }: { item: string; bg: string }) {
  const room = spec(bg);
  const place = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`}>
      <FurnitureArt id={item} />
    </g>
  );
  switch (item) {
    case 'decor_plant':
      return place(bg === 'bg_gym' ? 60 : spec(bg).outdoor ? 0 : 20, bg === 'bg_gym' ? 110 : spec(bg).outdoor ? 128 : 116);
    case 'decor_bed':
      return place(230, 174);
    case 'decor_trophy':
      return (
        <>
          {room.outdoor && <Posts x={room.shelf[0]} y={room.shelf[1] + 40} width={86} bottom={186} />}
          {place(...room.shelf)}
        </>
      );
    case 'decor_poster':
      return (
        <>
          {room.outdoor && <Posts x={room.poster[0] + 8} y={room.poster[1] + 60} width={36} bottom={182} />}
          {place(...room.poster)}
        </>
      );
    default:
      return null;
  }
}

/* ---------- Eksport ---------- */

/** Miniatura tła do wyboru w szafie i w sklepie. */
export function RoomThumb({ id, className }: { id: string; className?: string }) {
  const uid = `room${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 320 220" className={className ? `pet-room ${className}` : 'pet-room'} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <Background bg={id} id={uid} />
    </svg>
  );
}

export function FurnitureThumb({ id, className }: { id: string; className?: string }) {
  const [w, h] = FURNITURE_BOX[id] ?? [54, 54];
  return (
    <svg viewBox={`-2 -2 ${w + 4} ${h + 4}`} className={className} aria-hidden>
      <FurnitureArt id={id} />
    </svg>
  );
}

/**
 * Scena: tło, meble i — w tym samym układzie współrzędnych — zwierzak
 * przekazany jako `children` (osadzony <svg> z x/y). Nakładki HTML (saldo,
 * dymek) idą przez `overlay`.
 */
export function PetRoom({
  background,
  furniture,
  children,
  overlay,
}: {
  background: string;
  furniture: string[];
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const uid = `room${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const behind = furniture.filter(item => item !== 'decor_bed');
  return (
    <div className="relative overflow-hidden rounded-3xl bg-card" style={{ aspectRatio: '320 / 220' }}>
      <svg viewBox="0 0 320 220" className="pet-room absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <Background bg={background} id={uid} />
        {behind.map(item => (
          <Furniture key={item} item={item} bg={background} />
        ))}
        {furniture.includes('decor_bed') && <Furniture item="decor_bed" bg={background} />}
        {children}
      </svg>
      {overlay}
    </div>
  );
}

/** Gdzie w scenie stoi zwierzak: osadzony awatar 150×150 ze stopami na y≈196. */
export const PET_IN_ROOM = { x: 85, y: 55, size: 150 } as const;
