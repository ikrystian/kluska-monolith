import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const _q = new URLSearchParams(location.search);
export const W = +(_q.get('w') || window.innerWidth);
export const H = +(_q.get('h') || window.innerHeight);

export function makeRenderer({ exposure = 1.0, bg = 0x0e0b09 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  return { renderer, scene };
}

/* deterministic random so re-renders are stable */
let seed = 1337;
export function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

/* ---------- textures ---------- */

export function rubberFloorTexture(size = 2048, flecks = ['#2a2a2a', '#3a3a3a', '#555'], base = '#141210') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.035; i++) {
    g.fillStyle = flecks[Math.floor(rand() * flecks.length)];
    const s = 0.6 + rand() * 1.3;
    g.globalAlpha = 0.25 + rand() * 0.45;
    g.beginPath();
    g.ellipse(rand() * size, rand() * size, s, s * (0.6 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // tile seams
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.lineWidth = 3;
  for (let k = 0; k <= 2; k++) {
    g.beginPath(); g.moveTo(k * size / 2, 0); g.lineTo(k * size / 2, size); g.stroke();
    g.beginPath(); g.moveTo(0, k * size / 2); g.lineTo(size, k * size / 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function knurlBumpTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  for (let i = -512; i < 1024; i += 12) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 512, 512); g.stroke();
    g.beginPath(); g.moveTo(i + 512, 0); g.lineTo(i, 512); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function faceLabelTexture(label, ink = '#f4efe9') {
  const s = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.clearRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  g.fillStyle = ink;
  g.font = '800 96px "DejaVu Sans Condensed", "Liberation Sans Narrow", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const text = label;
  const radius = s * 0.36;
  const total = text.length;
  const arc = Math.PI * 0.32;
  for (let i = 0; i < total; i++) {
    const a = -Math.PI / 2 - arc / 2 + (i + 0.5) * (arc / total);
    g.save();
    g.rotate(a + Math.PI / 2);
    g.fillText(text[i], 0, -radius);
    g.restore();
  }
  // lower arc, smaller
  g.font = '700 38px "DejaVu Sans Mono", monospace';
  const low = 'LENIWA KLUSKA · CALIBRATED';
  const arc2 = Math.PI * 0.55;
  for (let i = 0; i < low.length; i++) {
    const a = Math.PI / 2 + arc2 / 2 - (i + 0.5) * (arc2 / low.length);
    g.save();
    g.rotate(a - Math.PI / 2);
    g.fillText(low[i], 0, radius + 6);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- objects ---------- */

export const PLATE_SPECS = {
  25: { d: 0.45, t: 0.027, color: 0x8e1712 },
  20: { d: 0.45, t: 0.023, color: 0x13336e },
  15: { d: 0.40, t: 0.021, color: 0xc9a70c },
  10: { d: 0.325, t: 0.021, color: 0x1f5a2c },
  5: { d: 0.228, t: 0.020, color: 0xe8e4dc },
  2.5: { d: 0.19, t: 0.016, color: 0x1a1a1a },
};

/* Plate with its axis along +Y, centred at origin. */
export function makePlate(kg) {
  const spec = PLATE_SPECS[kg];
  const R = spec.d / 2;
  const T = spec.t;
  const hole = 0.0255;
  const hub = 0.07;
  const faceT = T * 0.62;
  const pts = [
    [hole, -T / 2 - 0.002],
    [hub, -T / 2 - 0.002],
    [hub + 0.012, -faceT / 2],
    [R - 0.03, -faceT / 2],
    [R - 0.012, -T / 2],
    [R - 0.003, -T / 2],
    [R, -T / 2 + 0.003],
    [R, T / 2 - 0.003],
    [R - 0.003, T / 2],
    [R - 0.012, T / 2],
    [R - 0.03, faceT / 2],
    [hub + 0.012, faceT / 2],
    [hub, T / 2 + 0.002],
    [hole, T / 2 + 0.002],
    [hole, -T / 2 - 0.002],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 128);
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: spec.color,
    roughness: 0.55,
    metalness: 0.0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // steel hub insert
  const hubGeo = new THREE.CylinderGeometry(hub - 0.004, hub - 0.004, T + 0.006, 64, 1, true);
  const steel = new THREE.MeshStandardMaterial({ color: 0xb9b9b9, metalness: 1, roughness: 0.32, side: THREE.DoubleSide });
  const ringGeo = new THREE.RingGeometry(hole, hub - 0.004, 64);
  for (const s of [1, -1]) {
    const ring = new THREE.Mesh(ringGeo, steel);
    ring.rotation.x = -Math.PI / 2 * s;
    ring.position.y = s * (T / 2 + 0.0031);
    group.add(ring);
  }
  group.add(new THREE.Mesh(hubGeo, steel));

  // printed label on both faces
  if (R > 0.15) {
    const ink = kg === 5 ? '#1b1b1b' : '#f4efe9';
    const tex = faceLabelTexture(`${kg} KG`, ink);
    const lblMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const lblGeo = new THREE.CircleGeometry(R * 0.98, 96);
    for (const s of [1, -1]) {
      const l = new THREE.Mesh(lblGeo, lblMat);
      l.rotation.x = -Math.PI / 2 * s;
      if (s < 0) l.rotation.z = Math.PI;
      l.position.y = s * (faceT / 2 + 0.0008);
      group.add(l);
    }
  }
  group.userData.thickness = T + 0.004;
  return group;
}

/* Olympic bar along X axis, centred. 2.2 m. */
export function makeBar() {
  const g = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd7d7d7, metalness: 1, roughness: 0.18 });
  const bump = knurlBumpTexture();
  bump.repeat.set(40, 1);
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xa9a9a9, metalness: 1, roughness: 0.38, bumpMap: bump, bumpScale: 1.2 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.31, 48), shaftMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.castShadow = true;
  g.add(shaft);
  for (const s of [1, -1]) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.03, 64), chrome);
    collar.rotation.z = Math.PI / 2;
    collar.position.x = s * (1.31 / 2 + 0.015);
    collar.castShadow = true;
    g.add(collar);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.415, 64), chrome);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.x = s * (1.31 / 2 + 0.03 + 0.415 / 2);
    sleeve.castShadow = true;
    g.add(sleeve);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.025, 48), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 1, roughness: 0.4 }));
    cap.position.x = s * (1.31 / 2 + 0.03 + 0.415 + 0.0005);
    cap.rotation.y = s * Math.PI / 2;
    g.add(cap);
  }
  return g;
}

export function makeCollarClamp() {
  const m = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.55, metalness: 0.2 });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 48), m);
  c.castShadow = true;
  return c;
}

export function finish() {
  document.title = 'done';
}
