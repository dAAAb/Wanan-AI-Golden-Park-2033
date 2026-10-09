// 臺北 2033 — GTA-style immersive 3D Taipei: drive a taxi to Songshan Airport and watch it become the Taipei AI Park.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  U, flatToPts, ringsOf, flatPolys, ribbons, pointInRing, signedArea, patchBuildingMaterial, patchRoadMaterial, waterMaterial,
  buildBuildings, makeTreeGeometries, makePlane, makeTaxi, makeTaipei101, makeGrandHotel, makeFerrisWheel, mergeGeometries,
} from './city.js';
import { PHOTO, INTRO, MISSIONS, CHECKPOINTS, FINALE, STATS, TOUR } from './content.js';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const LOW = isTouch || Math.min(screen.width, screen.height) < 700 || /low=1/.test(location.search);
const QUALITY = { pixelRatio: Math.min(devicePixelRatio, LOW ? 1.25 : 1.75), shadows: !LOW, bloom: !LOW, trees: LOW ? 2600 : 5200, cars: LOW ? 120 : 260, buildings: LOW ? 26000 : 60000 };

// ---------------- renderer / scene ----------------
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
} catch (e) {
  $('loadText').textContent = '您的瀏覽器不支援 WebGL，請改用最新版 Chrome / Safari。';
  throw e;
}
renderer.setPixelRatio(QUALITY.pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = QUALITY.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1.5, 26000);
camera.position.set(0, 600, 1200);
scene.fog = new THREE.Fog(0xcfd8e3, 1500, 9000);

const sky = new Sky(); sky.scale.setScalar(40000); scene.add(sky);
const sun = new THREE.Vector3();
const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x6b5a40, 1.1); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffe2b0, 2.4); dir.castShadow = QUALITY.shadows;
dir.shadow.mapSize.set(2048, 2048); Object.assign(dir.shadow.camera, { left: -420, right: 420, top: 420, bottom: -420, near: 10, far: 3000 });
dir.shadow.bias = -0.0004; dir.shadow.normalBias = 0.6;
scene.add(dir, dir.target);
const stars = (() => {
  const g = new THREE.BufferGeometry(); const p = [];
  for (let i = 0; i < 2500; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.45 + 0.05; p.push(Math.cos(a) * Math.cos(b) * 18000, Math.sin(b) * 18000, Math.sin(a) * Math.cos(b) * 18000); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 22, sizeAttenuation: true, transparent: true, opacity: 0, fog: false }));
  scene.add(s); return s;
})();

let composer = null, bloom = null;
if (QUALITY.bloom) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.6, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

// ---------------- state ----------------
const S = {
  D: null, year: 0, yearTarget: 0, tod: 0, todTarget: 0, timeMode: 0, // 0 golden, 1 night, 2 day
  mode: 'intro', // intro | drive | drone | tour | cutscene
  mission: 0, cpIndex: 0, finished: false,
  keys: {}, joy: { x: 0, y: 0 }, up: 0, down: 0, boost: false,
  car: { x: 0, z: 0, h: 0, v: 0, steer: 0 },
  drone: { pos: new THREE.Vector3(), yaw: 0, pitch: -0.5 },
  cam: { yaw: 0, pitch: 0.28, dist: 16, drag: false, lx: 0, ly: 0, userYawT: 0 },
  money: 0, moneyTarget: 0,
};
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();

// ---------------- load ----------------
function setLoad(p, t) { $('loadBar').style.width = Math.round(p * 100) + '%'; if (t) $('loadText').textContent = t; }
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status + ' ' + url);
  const total = +res.headers.get('content-length') || 0;
  if (!res.body || !total) return res.json();
  const reader = res.body.getReader(); const chunks = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; setLoad(0.05 + 0.45 * got / total, `下載臺北地圖 ${(got / 1e6).toFixed(1)} MB`); }
  const all = new Uint8Array(got); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  return JSON.parse(new TextDecoder().decode(all));
}
const frame = () => new Promise(r => requestAnimationFrame(r));

$('introBody').innerHTML = INTRO.body;
$('introQuote').textContent = INTRO.quote;

// world containers
const world = new THREE.Group(); scene.add(world);
const airport = new THREE.Group(); world.add(airport);
const future = new THREE.Group(); world.add(future); future.visible = false;
let buildings, footprintGrid, roadGrid, waterRings = [], roadLines = [], trafficRoads = [];
let trees, treeData = [], towers, homes, towerData = [], homeData = [], aiTower, beacons = [];
let planes = [], taxi, car2026, labelsList = [], checkpointMesh, cpBeam, ferris, t101;
let minimapImgs = [null, null];
const R = {}; // runway frame

async function build() {
  setLoad(0.03, '下載臺北地圖…');
  const D = S.D = await fetchJSON('data/city.json');
  Object.assign(R, D.runway);
  const sc = D.scale;
  setLoad(0.5, '鋪設地面與河流…'); await frame();

  // ground
  const gTex = makeGroundTexture();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshLambertMaterial({ color: 0xe2ddd2, map: gTex }));
  gTex.repeat.set(600, 600);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
  addMountains();

  // green
  const greenCols = [0x86ad5c, 0x4f7f3d, 0x9cc46e, 0x7fb069];
  const gr = D.green.map(g => flatToPts(g.c, sc));
  const greenGeo = flatPolys(gr, 0.25, (c, k) => c.setHex(greenCols[D.green[k].k] || greenCols[0]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.04));
  const greenMesh = new THREE.Mesh(greenGeo, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  greenMesh.receiveShadow = true; world.add(greenMesh);
  // scattered trees on wooded / park land
  const forestTrees = [];
  D.green.forEach((g, k) => {
    const r = gr[k]; const area = Math.abs(signedArea(r));
    const n = Math.min(400, Math.floor(area / (g.k === 1 ? 260 : 900)));
    let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
    for (const p of r) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[1]); maxz = Math.max(maxz, p[1]); }
    for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
      const x = minx + Math.random() * (maxx - minx), z = minz + Math.random() * (maxz - minz);
      if (pointInRing(x, z, r)) { forestTrees.push([x, z, 5 + Math.random() * 8, g.k === 1 ? 1 : Math.random() < 0.5 ? 0 : 1]); i++; }
    }
  });

  // water
  waterRings = D.water.map(w => flatToPts(w, sc));
  const waterMesh = new THREE.Mesh(flatPolys(waterRings, 0.45, c => c.set(0xffffff)), waterMaterial());
  waterMesh.material.polygonOffset = true; waterMesh.material.polygonOffsetFactor = -2; waterMesh.material.polygonOffsetUnits = -4;
  world.add(waterMesh);

  setLoad(0.58, '畫出大街小巷…'); await frame();
  // roads
  const RW = [22, 18, 16, 13, 10, 8, 8, 8, 7, 7, 7, 5, 5, 4];
  const RC = [0x2f3237, 0x33363b, 0x36393e, 0x3c3f44, 0x45484d, 0x33363b, 0x33363b, 0x36393e, 0x3c3f44, 0x55585c, 0x55585c, 0x6a6c6f, 0x8a8478, 0x6c6e71];
  const rl = ringsOf(D.roads.c, D.roads.o, sc);
  const ground_i = [], elev_i = [];
  rl.forEach((l, i) => (D.roads.e[i] ? elev_i : ground_i).push(i));
  roadLines = rl.map((l, i) => ({ pts: l, w: RW[D.roads.k[i]], k: D.roads.k[i], e: D.roads.e[i], n: D.roads.n[i] }));
  const roadMat = patchRoadMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
  // draw minor roads first so majors win
  const order = ground_i.slice().sort((a, b) => D.roads.k[b] - D.roads.k[a]);
  const rgeo = ribbons(order.map(i => rl[i]), (k) => 0.6 + (13 - D.roads.k[order[k]]) * 0.02, (k) => RW[D.roads.k[order[k]]], (c, k) => c.setHex(RC[D.roads.k[order[k]]]));
  const roadMesh = new THREE.Mesh(rgeo, roadMat); roadMesh.receiveShadow = true; world.add(roadMesh);
  // elevated expressways with pillars
  if (elev_i.length) {
    const eg = ribbons(elev_i.map(i => rl[i]), 11, (k) => RW[D.roads.k[elev_i[k]]], (c) => c.setHex(0x3a3d42));
    const em = new THREE.Mesh(eg, patchRoadMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    em.castShadow = true; em.receiveShadow = true; world.add(em);
    const side = ribbons(elev_i.map(i => rl[i]), 10.2, (k) => RW[D.roads.k[elev_i[k]]] + 1.2, (c) => c.setHex(0x9a9c9f));
    world.add(new THREE.Mesh(side, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    const pil = []; for (const i of elev_i) { const l = rl[i]; let acc = 0; for (let j = 1; j < l.length; j++) { const d = Math.hypot(l[j][0] - l[j - 1][0], l[j][1] - l[j - 1][1]); acc += d; if (acc > 45) { acc = 0; pil.push(l[j]); } } }
    const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.4, 1.6, 10.5, 8).translate(0, 5.25, 0), new THREE.MeshLambertMaterial({ color: 0xa8a9ab }), pil.length);
    pil.forEach((p, i) => pm.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p[0], 0, p[1]))); pm.castShadow = true; world.add(pm);
  }
  // rail (elevated Wenhu line etc.)
  const railEl = D.rail.filter(r => r.e).map(r => flatToPts(r.c, sc));
  const railGr = D.rail.filter(r => !r.e).map(r => flatToPts(r.c, sc));
  if (railEl.length) {
    const g = ribbons(railEl, 9, () => 7, c => c.setHex(0xc9c6bd));
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.castShadow = true; world.add(m);
    const pil = []; for (const l of railEl) { let acc = 0; for (let j = 1; j < l.length; j++) { acc += Math.hypot(l[j][0] - l[j - 1][0], l[j][1] - l[j - 1][1]); if (acc > 30) { acc = 0; pil.push(l[j]); } } }
    const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 9, 2).translate(0, 4.5, 0), new THREE.MeshLambertMaterial({ color: 0xbab7ae }), pil.length);
    pil.forEach((p, i) => pm.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p[0], 0, p[1]))); world.add(pm);
  }
  if (railGr.length) world.add(new THREE.Mesh(ribbons(railGr, 0.7, () => 6, c => c.setHex(0x6b5d50)), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })));

  setLoad(0.66, `蓋 ${D.buildings.h.length.toLocaleString()} 棟房子…`); await frame();
  buildings = buildBuildings(D, QUALITY.buildings);
  world.add(buildings.group);
  footprintGrid = makeGrid(buildings.footprints.map(f => ({ ...f, kind: 'b' })));
  roadGrid = makeRoadGrid(roadLines.filter(r => !r.e));

  setLoad(0.78, '布置松山機場…'); await frame();
  buildAirport(D);
  setLoad(0.84, '種下 110 公頃的樹…'); await frame();
  buildFuture(D);
  buildTrees(forestTrees);
  setLoad(0.9, '放上地標與車流…'); await frame();
  buildLandmarks(D);
  buildTraffic();
  buildPlayer(D);
  buildLabels(D);
  minimapImgs = [drawMinimap(D, 0), drawMinimap(D, 1)];
  S.ready = true;
  setLoad(1, '完成！按「開始任務」上路');
  $('btnStart').disabled = false; $('btnTour').disabled = false;
}

function makeGroundTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#c4beb1'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { const v = 170 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v - 4},${v - 12},.35)`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

function addMountains() {
  // Yangmingshan to the north, Neihu hills NE, Four Beasts SE, Guanyin far NW – stylised low-poly backdrop
  const m = new THREE.MeshLambertMaterial({ color: 0x5f7d55, flatShading: true });
  const far = new THREE.MeshLambertMaterial({ color: 0x6f8aa0, flatShading: true, fog: true });
  const add = (x, z, r, h, mat = m, seg = 9) => {
    const g = new THREE.ConeGeometry(r, h, seg, 3); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { if (p.getY(i) > -h / 2 + 1 && p.getY(i) < h / 2 - 1) { p.setX(i, p.getX(i) * (0.8 + Math.random() * 0.4)); p.setZ(i, p.getZ(i) * (0.8 + Math.random() * 0.4)); p.setY(i, p.getY(i) + (Math.random() - 0.5) * h * 0.12); } }
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat); mesh.position.set(x, h / 2 - 2, z); world.add(mesh);
  };
  for (let i = 0; i < 14; i++) add(-6000 + i * 1100 + Math.random() * 500, -10500 - Math.random() * 3000, 2600 + Math.random() * 1400, 900 + Math.random() * 500, far);
  add(-2000, -12500, 4200, 1100, far, 12);   // 七星山 / 大屯山 silhouette
  [[4200, -3600, 900, 260], [5200, -3000, 700, 220], [3600, -4200, 800, 300], [6200, -2400, 900, 250], [-3200, -1600, 520, 120], [-2600, -2200, 600, 160],
   [3900, 4800, 700, 280], [4700, 4300, 650, 240], [5600, 5200, 900, 330]].forEach(([x, z, r, h]) => add(x, z, r, h));
  for (let i = 0; i < 12; i++) { const a = Math.PI * 0.15 + i * 0.13; add(Math.cos(a) * 13000 + 3000, Math.sin(a) * 9000 + 4000, 2200, 700 + Math.random() * 300, far); }
}

// ---------------- airport ----------------
function buildAirport(D) {
  const sc = D.scale;
  const ad = flatToPts(D.aerodrome, sc);
  const grass = new THREE.Mesh(flatPolys([ad], 0.3, c => c.setHex(0x8fae66)), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }));
  grass.receiveShadow = true; airport.add(grass);
  const aprons = D.aero.apron.map(a => flatToPts(a, sc));
  if (aprons.length) { const m = new THREE.Mesh(flatPolys(aprons, 0.5, c => c.setHex(0xa9aaa6)), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })); m.receiveShadow = true; airport.add(m); }
  const tw = D.aero.taxiway.map(t => flatToPts(t.line, sc));
  if (tw.length) { const m = new THREE.Mesh(ribbons(tw, 0.62, k => D.aero.taxiway[k].w, c => c.setHex(0x55575a)), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })); m.receiveShadow = true; airport.add(m); }
  // runway from the derived centre line (robust whether OSM mapped it as area or line)
  const rwLine = [[R.a[0], R.a[1]], [R.b[0], R.b[1]]];
  const rw = new THREE.Mesh(ribbons([rwLine], 0.75, () => R.w || 60, c => c.setHex(0x2c2e31)), patchRoadMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -10 }), true));
  rw.receiveShadow = true; airport.add(rw);
  // runway threshold bars & approach lights
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(30, 0.2, 2.2), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }), 24);
  let bi = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -R.ang);
  for (const end of [-1, 1]) for (let i = 0; i < 12; i++) {
    const s = end * (R.L / 2 - 30), t = -26 + i * 4.7;
    const x = R.c[0] + s * R.u[0] + t * R.n[0], z = R.c[1] + s * R.u[1] + t * R.n[1];
    m4.compose(new THREE.Vector3(x, 0.8, z), q, new THREE.Vector3(1, 1, 1)); bars.setMatrixAt(bi++, m4);
  }
  airport.add(bars);
  const lightsGeo = new THREE.SphereGeometry(0.9, 6, 4);
  const lights = new THREE.InstancedMesh(lightsGeo, new THREE.MeshBasicMaterial({ color: 0xfff1a0 }), 140);
  let li = 0;
  for (let i = 0; i < 70 && li < 140; i++) for (const side of [-1, 1]) {
    const s = -R.L / 2 + (i / 69) * R.L, t = side * ((R.w || 60) / 2 + 2);
    m4.makeTranslation(R.c[0] + s * R.u[0] + t * R.n[0], 1, R.c[1] + s * R.u[1] + t * R.n[1]); lights.setMatrixAt(li++, m4);
  }
  airport.add(lights);
  // parked planes
  let stands = D.aero.stands.filter((_, i) => i % 2 === 0).slice(0, 18);
  if (stands.length < 4 && aprons.length) {
    stands = []; const a = aprons.slice().sort((p, q) => Math.abs(signedArea(q)) - Math.abs(signedArea(p)))[0];
    let cx = 0, cz = 0; a.forEach(p => { cx += p[0]; cz += p[1]; }); cx /= a.length; cz /= a.length;
    for (let i = -3; i <= 3; i++) stands.push([cx + R.u[0] * i * 70, cz + R.u[1] * i * 70]);
  }
  const base = makePlane();
  stands.forEach(([x, z, a], i) => {
    const p = base.clone(); p.position.set(x, 3, z);
    p.rotation.y = a !== undefined ? -Math.atan2(Math.cos(a), Math.sin(a)) : -R.ang + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    p.scale.setScalar(0.95 + Math.random() * 0.15);
    airport.add(p);
  });
  // moving planes: one taking off, one landing
  for (let i = 0; i < 2; i++) { const p = base.clone(); p.userData.phase = i * 0.5; scene.add(p); planes.push(p); }
}

// ---------------- 2033 future content ----------------
function buildFuture(D) {
  const F = D.future, sc = D.scale;
  const park = flatToPts(F.park, sc), ai = flatToPts(F.ai, sc), live = flatToPts(F.live, sc);
  const extra = (F.aiExtra || []).map(a => flatToPts(a, sc));
  const zoneGeo = flatPolys([park, ai, live, ...extra], 0.9, (c, k) => c.setHex([0x5da34f, 0xcfd4d6, 0xd9cdb6][k] ?? 0xcfd4d6));
  const zoneMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12, transparent: true, opacity: 0 });
  const zones = new THREE.Mesh(zoneGeo, zoneMat); zones.receiveShadow = true; future.add(zones);
  future.userData.fadeMats = [zoneMat];
  // meadow texture variation via a second translucent layer
  const lakes = F.lakes.map(l => flatToPts(l, sc));
  const lakeMat = waterMaterial(); lakeMat.opacity = 0; lakeMat.polygonOffset = true; lakeMat.polygonOffsetFactor = -8; lakeMat.polygonOffsetUnits = -16;
  future.add(new THREE.Mesh(flatPolys(lakes, 1.1, c => c.set(0xffffff)), lakeMat)); future.userData.fadeMats.push(lakeMat);
  // promenade on the old runway + paths
  const spine = flatToPts(F.spine, sc);
  const promMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -18 });
  future.add(new THREE.Mesh(ribbons([spine], 1.2, () => 22, c => c.setHex(0xe8d7b5)), promMat));
  const paths = F.paths.map(p => flatToPts(p, sc));
  future.add(new THREE.Mesh(ribbons(paths, 1.2, () => 5, c => c.setHex(0xe9dfc8)), promMat));
  future.userData.fadeMats.push(promMat);
  // promenade lamps (glow at night)
  const lampPts = []; for (let i = 1; i < spine.length; i++) { const a = spine[i - 1], b = spine[i]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s < d; s += 40) lampPts.push([a[0] + (b[0] - a[0]) * s / d, a[1] + (b[1] - a[1]) * s / d]); }
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffd27a, emissiveIntensity: 0.2 });
  const lamps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.3, 6, 6).translate(0, 3, 0), lampMat, lampPts.length * 2);
  let li = 0; for (const p of lampPts) for (const s of [-1, 1]) lamps.setMatrixAt(li++, new THREE.Matrix4().makeTranslation(p[0] + R.n[0] * s * 13, 0, p[1] + R.n[1] * s * 13));
  future.add(lamps); future.userData.lampMat = lampMat;

  // AI towers (instanced boxes with glass windows) and living cluster (warmer, green roofs)
  towerData = F.towers; homeData = F.homes;
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const mkInst = (data, colors, glass) => {
    const mat = patchBuildingMaterial(glass ? new THREE.MeshStandardMaterial({ roughness: 0.18, metalness: 0.35 }) : new THREE.MeshLambertMaterial(), { instanced: true, glass });
    const geo = box.clone(); const aI = new Float32Array(data.length * 3);
    data.forEach((d, i) => { aI[i * 3] = Math.random(); aI[i * 3 + 1] = Math.random() * 10; });
    geo.setAttribute('aI', new THREE.InstancedBufferAttribute(aI, 3));
    const mesh = new THREE.InstancedMesh(geo, mat, data.length);
    const c = new THREE.Color();
    data.forEach((d, i) => { c.setHex(colors[d[5] % colors.length]); mesh.setColorAt(i, c); });
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    future.add(mesh); return mesh;
  };
  towers = mkInst(towerData, [0xb8d4e6, 0x9cc0d8, 0xcfe0ea, 0x8fb0c8], true);
  homes = mkInst(homeData, [0xf0e6d2, 0xe5d3b8, 0xdfe6dc, 0xf3efe6], false);
  // roof gardens on homes
  const roofG = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.6, 1).translate(0, 0.3, 0), new THREE.MeshLambertMaterial({ color: 0x5fae55 }), homeData.length);
  roofG.frustumCulled = false; future.add(roofG); future.userData.roofG = roofG;
  // golden crowns on towers
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb300, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 });
  const crowns = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), crownMat, towerData.length);
  crowns.frustumCulled = false; future.add(crowns); future.userData.crowns = crowns; future.userData.crownMat = crownMat;

  // landmark AI tower: twisted stack + gold ring + light beam
  aiTower = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0xa9cbe0, roughness: 0.12, metalness: 0.55, emissive: 0x0a2440, emissiveIntensity: 0.25 });
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(46 - i * 0.9, 11.2, 46 - i * 0.9), glass); s.position.y = i * 11.5 + 5.6; s.rotation.y = i * 0.06; s.castShadow = true; aiTower.add(s);
  }
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffc000, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.2 });
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(34 - i * 6, 1.4, 8, 60), ringMat); r.rotation.x = Math.PI / 2; r.position.y = 300 + i * 18; aiTower.add(r); }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.5, 80, 8), ringMat); spire.position.y = 340; aiTower.add(spire);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(6, 18, 1400, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 1080; aiTower.add(beam); aiTower.userData.beam = beam; aiTower.userData.rings = aiTower.children.filter(c => c.geometry && c.geometry.type === 'TorusGeometry');
  aiTower.position.set(F.landmark[0], 0, F.landmark[1]); aiTower.rotation.y = -R.ang;
  future.add(aiTower);

  // metro XY lines (glowing ribbons) and stations
  const metroMat = (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false });
  const mx = metroMat(0x58d8ff), my = metroMat(0xff5aa5);
  future.add(new THREE.Mesh(ribbons([flatToPts(F.metroX.map(v => v * sc), sc)], 2.0, () => 9, c => c.set(0xffffff)), mx));
  future.add(new THREE.Mesh(ribbons([flatToPts(F.metroY.map(v => v * sc), sc)], 2.1, () => 9, c => c.set(0xffffff)), my));
  future.userData.metroMats = [mx, my];
  const stMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x58d8ff, emissiveIntensity: 0.6 });
  F.stations.forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 9, 24), stMat); s.position.set(x, 4.5, z); future.add(s); });
  // new cross-river corridors & 民族東路 extension
  const corr = F.corridors.map(c => flatToPts(c.c.map(v => v * sc), sc)).concat([flatToPts(F.minzu.map(v => v * sc), sc)]);
  const corrMat = patchRoadMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0 }));
  const corrMesh = new THREE.Mesh(ribbons(corr, 2.6, () => 24, c => c.setHex(0x3a3d42)), corrMat); future.add(corrMesh);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffc83d, transparent: true, opacity: 0 });
  future.add(new THREE.Mesh(ribbons(corr, 2.5, () => 27, c => c.set(0xffffff)), edgeMat));
  future.userData.fadeMats.push(corrMat, edgeMat);
  future.userData.corridors = corr;

  // park visitors and drones
  const ppl = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.35, 1.1, 3, 6).translate(0, 0.9, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), 360);
  ppl.userData.data = []; const pc = new THREE.Color();
  for (let i = 0; i < 360; i++) {
    const path = paths.length ? paths[i % paths.length] : spine;
    ppl.userData.data.push({ path, s: Math.random(), v: (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.8) / 1000, off: (Math.random() - 0.5) * 4 });
    ppl.setColorAt(i, pc.setHSL(Math.random(), 0.6, 0.55));
  }
  ppl.frustumCulled = false; future.add(ppl); future.userData.people = ppl;
  const drones = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.5, 2.4), new THREE.MeshStandardMaterial({ color: 0x222831, emissive: 0x58d8ff, emissiveIntensity: 0.8 }), 40);
  drones.frustumCulled = false; future.add(drones); future.userData.drones = drones;

  // collisions for new buildings
  future.userData.footprints = towerData.concat(homeData).map(d => rectFootprint(d));
}
function rectFootprint([x, z, w, d]) {
  const ca = Math.cos(R.ang), sa = Math.sin(R.ang);
  const r = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => [x + a * ca - b * sa, z + a * sa + b * ca]);
  return { r, kind: 'f', minx: Math.min(...r.map(p => p[0])), maxx: Math.max(...r.map(p => p[0])), minz: Math.min(...r.map(p => p[1])), maxz: Math.max(...r.map(p => p[1])) };
}

function buildTrees(forest) {
  const F = S.D.future;
  const all = F.trees.slice(0, QUALITY.trees).map(t => [...t, 1]).concat(forest.slice(0, LOW ? 2500 : 6000).map(t => [...t, 0]));
  treeData = all;
  const { trunk, crownA, crownB } = makeTreeGeometries();
  const tM = new THREE.MeshLambertMaterial({ color: 0x6b4a2e });
  const cM = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const nA = all.filter(t => t[3] !== 1).length, nB = all.length - nA;
  trees = {
    trunk: new THREE.InstancedMesh(trunk, tM, all.length),
    a: new THREE.InstancedMesh(crownA, cM, Math.max(1, nA)),
    b: new THREE.InstancedMesh(crownB, cM.clone(), Math.max(1, nB)),
  };
  const c = new THREE.Color();
  let ia = 0, ib = 0;
  all.forEach((t, i) => {
    t.slot = t[3] === 1 ? ['b', ib++] : ['a', ia++];
    trees[t.slot[0]].setColorAt(t.slot[1], c.setHSL(0.26 + Math.random() * 0.08, 0.45 + Math.random() * 0.2, 0.28 + Math.random() * 0.12));
  });
  for (const k of ['trunk', 'a', 'b']) { trees[k].castShadow = true; trees[k].frustumCulled = false; world.add(trees[k]); }
  updateTrees(0);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function updateTrees(t) {
  treeData.forEach((d, i) => {
    const fut = d[4] === 1;
    const k = fut ? THREE.MathUtils.smoothstep(t, 0.25 + (i % 97) / 97 * 0.5, 0.5 + (i % 97) / 97 * 0.5) : 1;
    const sc = d[2] / 8 * Math.max(0.0001, k);
    _p.set(d[0], fut ? 1 : 0.3, d[1]); _q.setFromAxisAngle(_s.set(0, 1, 0), i); _s.set(sc, sc, sc);
    _m.compose(_p, _q, _s);
    trees.trunk.setMatrixAt(i, _m); trees[d.slot[0]].setMatrixAt(d.slot[1], _m);
  });
  trees.trunk.instanceMatrix.needsUpdate = trees.a.instanceMatrix.needsUpdate = trees.b.instanceMatrix.needsUpdate = true;
}
function updateFutureBuildings(t) {
  const ca = -R.ang;
  _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ca);
  const g = (i, n) => THREE.MathUtils.smoothstep(t, 0.3 + (i / n) * 0.35, 0.65 + (i / n) * 0.35);
  towerData.forEach((d, i) => {
    const k = g(i, towerData.length); const h = Math.max(0.01, d[4] * k);
    _m.compose(_p.set(d[0], 0, d[1]), _q, _s.set(d[2], h, d[3])); towers.setMatrixAt(i, _m);
    _m.compose(_p.set(d[0], h, d[1]), _q, _s.set(d[2] * 0.82, 2.2 * k + 0.01, d[3] * 0.82)); future.userData.crowns.setMatrixAt(i, _m);
  });
  homeData.forEach((d, i) => {
    const k = g(i, homeData.length); const h = Math.max(0.01, d[4] * k);
    _m.compose(_p.set(d[0], 0, d[1]), _q, _s.set(d[2], h, d[3])); homes.setMatrixAt(i, _m);
    _m.compose(_p.set(d[0], h, d[1]), _q, _s.set(d[2] * 0.92, k, d[3] * 0.92)); future.userData.roofG.setMatrixAt(i, _m);
  });
  towers.instanceMatrix.needsUpdate = homes.instanceMatrix.needsUpdate = future.userData.crowns.instanceMatrix.needsUpdate = future.userData.roofG.instanceMatrix.needsUpdate = true;
  const tk = THREE.MathUtils.smoothstep(t, 0.4, 1);
  aiTower.scale.set(1, Math.max(0.001, tk), 1);
}

// ---------------- landmarks ----------------
function buildLandmarks(D) {
  const L = D.landmarks;
  t101 = makeTaipei101(); t101.position.set(L.taipei101[0], 0, L.taipei101[1]); world.add(t101);
  const gh = makeGrandHotel(); gh.position.set(L.grandHotel[0], 40, L.grandHotel[1]); gh.rotation.y = 0.15; world.add(gh);
  const hill = new THREE.Mesh(new THREE.ConeGeometry(260, 60, 10), new THREE.MeshLambertMaterial({ color: 0x55803f, flatShading: true })); hill.position.set(L.grandHotel[0], 10, L.grandHotel[1] + 30); world.add(hill);
  ferris = makeFerrisWheel(); ferris.position.set(L.miramar[0], 30, L.miramar[1]); ferris.rotation.y = 0.4; world.add(ferris);
  // billboards with the mayor's photo along the drive to the airport
  const tex = new THREE.TextureLoader().load(PHOTO.portrait, (t) => { t.colorSpace = THREE.SRGBColorSpace; drawBillboards(t.image); });
  function drawBillboards(img) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 1024, 512); grd.addColorStop(0, '#0d1a33'); grd.addColorStop(1, '#3a2600'); g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
    const s = Math.max(400 / img.width, 512 / img.height); g.drawImage(img, 0, 0, img.width, img.height * 0.8, 0, 0, 400, 512 * 0.98);
    g.fillStyle = '#ffc83d'; g.font = '900 78px "Noto Sans TC", sans-serif'; g.fillText('AI黃金世紀', 430, 150);
    g.fillStyle = '#fff'; g.font = '900 64px "Noto Sans TC", sans-serif'; g.fillText('從臺北開始', 430, 240);
    g.font = '700 40px "Noto Sans TC", sans-serif'; g.fillStyle = '#ffe9a6'; g.fillText('臺北AI園區 300 公頃', 430, 330); g.fillText('中央公園 110 公頃', 430, 390);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '500 24px "Noto Sans TC", sans-serif'; g.fillText('非官方粉絲看板・照片 Wikimedia Commons', 430, 470);
    const t2 = new THREE.CanvasTexture(c); t2.colorSpace = THREE.SRGBColorSpace; t2.anisotropy = 4;
    billboardSpots().forEach(([x, z, yaw]) => {
      const b = new THREE.Group();
      const face = new THREE.Mesh(new THREE.PlaneGeometry(32, 16), new THREE.MeshBasicMaterial({ map: t2, side: THREE.DoubleSide, toneMapped: false }));
      face.position.y = 22; b.add(face);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 22, 8).translate(0, 7, 0), new THREE.MeshLambertMaterial({ color: 0x777b80 })); b.add(pole);
      b.position.set(x, 0, z); b.rotation.y = yaw; world.add(b);
    });
  }
}
function billboardSpots() {
  // along the start road towards the terminal, plus one in the future park
  const out = [];
  const st = S.startPath || [];
  for (const f of [0.25, 0.6, 0.85]) {
    if (st.length < 2) break;
    const i = Math.floor(f * (st.length - 1)); const a = st[i], b = st[Math.min(st.length - 1, i + 1)];
    const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
    out.push([a[0] + Math.cos(yaw) * 22, a[1] - Math.sin(yaw) * 22, yaw + Math.PI]);
  }
  return out;
}

// ---------------- traffic ----------------
let carsMesh, cabsMesh, carState = [];
function buildTraffic() {
  trafficRoads = roadLines.filter(r => r.k <= 4 && !r.e && r.pts.length >= 2).map(r => {
    const cum = [0]; for (let i = 1; i < r.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
    return { ...r, cum, len: cum[cum.length - 1] };
  }).filter(r => r.len > 120);
  const n = QUALITY.cars;
  carsMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 1.1, 4.4).translate(0, 0.85, 0), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }), n);
  cabsMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.6, 2.3).translate(0, 1.7, -0.2), new THREE.MeshStandardMaterial({ color: 0x1b2633, roughness: 0.1, metalness: 0.6 }), n);
  const c = new THREE.Color(); const palette = [0xffc400, 0xffc400, 0xffc400, 0xf4f4f4, 0x222222, 0x9aa3ad, 0xb3261e, 0x1f4e8c, 0xf4f4f4, 0x555c66];
  for (let i = 0; i < n; i++) {
    const road = trafficRoads[Math.floor(Math.random() * trafficRoads.length)];
    carState.push({ road, s: Math.random() * road.len, dirn: Math.random() < 0.5 ? 1 : -1, v: 9 + Math.random() * 7, lane: 0.25 + Math.random() * 0.2 });
    carsMesh.setColorAt(i, c.setHex(palette[i % palette.length]));
  }
  carsMesh.castShadow = true; carsMesh.frustumCulled = cabsMesh.frustumCulled = false;
  world.add(carsMesh, cabsMesh);
}
function roadPoint(r, s, out) {
  s = Math.max(0, Math.min(r.len - 0.01, s));
  let i = 1; while (i < r.cum.length - 1 && r.cum[i] < s) i++;
  const a = r.pts[i - 1], b = r.pts[i], f = (s - r.cum[i - 1]) / Math.max(0.01, r.cum[i] - r.cum[i - 1]);
  out.x = a[0] + (b[0] - a[0]) * f; out.z = a[1] + (b[1] - a[1]) * f; out.dx = b[0] - a[0]; out.dz = b[1] - a[1];
  const l = Math.hypot(out.dx, out.dz) || 1; out.dx /= l; out.dz /= l; return out;
}
const _rp = {};
function updateTraffic(dt) {
  const fut = S.year > 0.5;
  for (let i = 0; i < carState.length; i++) {
    const c = carState[i];
    c.s += c.v * c.dirn * dt;
    if (c.s > c.road.len || c.s < 0) { c.road = trafficRoads[Math.floor(Math.random() * trafficRoads.length)]; c.dirn = Math.random() < 0.5 ? 1 : -1; c.s = c.dirn > 0 ? 0 : c.road.len; }
    roadPoint(c.road, c.s, _rp);
    const dx = _rp.dx * c.dirn, dz = _rp.dz * c.dirn;
    const off = c.road.w * c.lane;
    const x = _rp.x - dz * off, z = _rp.z + dx * off;
    const yaw = Math.atan2(dx, dz);
    _q.setFromAxisAngle(_s.set(0, 1, 0), yaw);
    _m.compose(_p.set(x, 0.1, z), _q, _s.set(1, 1, 1));
    carsMesh.setMatrixAt(i, _m); cabsMesh.setMatrixAt(i, _m);
  }
  carsMesh.instanceMatrix.needsUpdate = cabsMesh.instanceMatrix.needsUpdate = true;
}

// ---------------- player ----------------
function buildPlayer(D) {
  taxi = makeTaxi(); scene.add(taxi);
  // start on 敦化北路 heading north to the terminal, else south of the airport
  const idx = D.roadNames.indexOf('敦化北路');
  let start = null, path = [];
  if (idx >= 0) {
    const segs = roadLines.filter(r => r.n === idx);
    const pts = segs.flatMap(r => r.pts);
    if (pts.length) {
      pts.sort((a, b) => b[1] - a[1]);           // southernmost first (z grows to the south)
      const southMost = pts[0]; const north = pts[pts.length - 1];
      const target = [southMost[0] + (north[0] - southMost[0]) * 0.15, southMost[1] + (north[1] - southMost[1]) * 0.15];
      start = target; path = pts.filter((p, i) => i % 3 === 0);
    }
  }
  if (!start) { const s = 0, t = 900; start = [R.c[0] + s * R.u[0] + t * R.n[0], R.c[1] + s * R.u[1] + t * R.n[1]]; }
  S.startPath = path;
  S.car.x = start[0]; S.car.z = start[1]; S.car.h = Math.PI; // facing north (-z)
  S.start = start.slice();
  // terminal target: closest aerodrome-ish point near the end of 敦化北路, fallback south edge centre
  const ad = flatToPts(D.aerodrome, D.scale);
  let best = null, bd = Infinity;
  const ref = path.length ? path[path.length - 1] : [R.c[0] + R.n[0] * 300, R.c[1] + R.n[1] * 300];
  for (const p of ad) { const d = Math.hypot(p[0] - ref[0], p[1] - ref[1]); if (d < bd) { bd = d; best = p; } }
  S.terminal = path.length ? path[path.length - 1] : (best || ref);
  // checkpoint marker
  const cpMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  checkpointMesh = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 6, 40, 1, true), cpMat); checkpointMesh.position.y = 3;
  cpBeam = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 400, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
  cpBeam.position.y = 200; checkpointMesh.add(cpBeam);
  scene.add(checkpointMesh); checkpointMesh.visible = false;
}

// ---------------- labels ----------------
function addLabel(text, x, y, z, cls = '', opts = {}) {
  const el = document.createElement('div'); el.className = 'lbl ' + cls; el.textContent = text; $('labels').appendChild(el);
  const L = { el, pos: new THREE.Vector3(x, y, z), max: opts.max ?? 5000, min: opts.min ?? 0, when: opts.when ?? 'both', vis: true };
  labelsList.push(L); return L;
}
function buildLabels(D) {
  const F = D.future, sc = D.scale;
  const cen = (flat) => { const p = flatToPts(flat, sc); let x = 0, z = 0; p.forEach(q => { x += q[0]; z += q[1]; }); return [x / p.length, z / p.length]; };
  const pc = cen(F.park), ac = cen(F.ai), lc = cen(F.live);
  S.zoneCentres = { park: pc, ai: [F.landmark[0], F.landmark[1]], live: lc, metro: F.stations[0], river: null, renewal: null };
  const pl = [R.c[0] - R.u[0] * R.L * 0.3 + R.n[0] * (R.tPark - 300), R.c[1] - R.u[1] * R.L * 0.3 + R.n[1] * (R.tPark - 300)];
  addLabel('🌳 110公頃 中央公園', pl[0], 50, pl[1], 'zone', { when: 'future', max: 9000 });
  addLabel('🤖 100公頃 AI產業聚落', F.landmark[0], 420, F.landmark[1], 'zone', { when: 'future', max: 12000 });
  addLabel('🏡 90公頃 國際永續生活聚落', lc[0], 110, lc[1], 'zone', { when: 'future', max: 9000 });
  addLabel('✈️ 松山機場（2026）', R.c[0], 80, R.c[1], 'zone', { when: 'past', max: 12000 });
  F.stations.forEach(([x, z], i) => addLabel(i === 0 ? 'Ⓜ XY軸捷運 松機站' : 'Ⓜ XY軸捷運', x, 30, z, 'metro', { when: 'future', max: 4000 }));
  F.corridors.forEach(c => addLabel(c.n, c.c[0] * 0.5 / sc * sc + c.c[2] * 0.5, 20, c.c[1] * 0.5 + c.c[3] * 0.5, 'small', { when: 'future', max: 3500 }));
  const L = D.landmarks;
  addLabel('台北101', L.taipei101[0], 560, L.taipei101[1], '', { max: 20000 });
  addLabel('圓山大飯店', L.grandHotel[0], 130, L.grandHotel[1], 'small', { max: 6000 });
  addLabel('美麗華摩天輪', L.miramar[0], 150, L.miramar[1], 'small', { max: 6000 });
  // direction beacons to the other tech parks (outside the map)
  const P = (lat, lon) => [(lon - D.origin[1]) * 111320 * Math.cos(D.origin[0] * Math.PI / 180), (D.origin[0] - lat) * 110574];
  [['⬆ 北士科・輝達', P(25.098, 121.523)], ['➡ 內湖科技園區', P(25.0805, 121.5745)], ['➡ 南港軟體園區', P(25.058, 121.600)]].forEach(([n, p]) => addLabel(n, p[0], 90, p[1], 'small', { max: 9000 }));
  // stations & neighbourhoods from OSM
  D.labels.filter(l => l.k === 'station').slice(0, 40).forEach(l => addLabel('Ⓜ ' + l.n.replace(/站$/, '') + '站', l.x, 22, l.z, 'small', { max: 1600 }));
  D.labels.filter(l => ['suburb', 'quarter'].includes(l.k)).slice(0, 20).forEach(l => addLabel(l.n, l.x, 60, l.z, 'small', { min: 600, max: 7000 }));
  // river point (north bank near 大直) and renewal point (west approach)
  const river = waterRings.length ? nearestWaterPoint(pc) : [pc[0], pc[1] - 400];
  S.zoneCentres.river = river;
  S.zoneCentres.renewal = [R.c[0] - R.u[0] * (R.L / 2 + 700), R.c[1] - R.u[1] * (R.L / 2 + 700)];
  S.cpLabel = addLabel('★ 檢查點', 0, 40, 0, 'cp', { max: 99999 }); S.cpLabel.el.style.display = 'none'; S.cpLabel.hidden = true;
}
function nearestWaterPoint(p) {
  let best = null, bd = Infinity;
  for (const r of waterRings) for (const q of r) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } }
  if (!best) return [p[0], p[1] - 400];
  // step back onto land towards the park
  const dx = p[0] - best[0], dz = p[1] - best[1], l = Math.hypot(dx, dz) || 1;
  return [best[0] + dx / l * 40, best[1] + dz / l * 40];
}
function updateLabels() {
  const w = innerWidth, h = innerHeight, fut = S.year > 0.5;
  for (const L of labelsList) {
    if (L.hidden) continue;
    const okWhen = L.when === 'both' || (L.when === 'future') === fut;
    const d = camera.position.distanceTo(L.pos);
    let show = okWhen && d < L.max && d > L.min;
    if (show) {
      tmpV.copy(L.pos).project(camera);
      show = tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
      if (show) {
        const x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h;
        const s = THREE.MathUtils.clamp(1400 / d, 0.6, 1.15);
        L.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%) scale(${s.toFixed(3)})`;
      }
    }
    if (show !== L.vis) { L.el.style.display = show ? '' : 'none'; L.vis = show; }
  }
}

// ---------------- collisions ----------------
function makeGrid(items, cell = 60) {
  const g = new Map();
  items.forEach((f, i) => {
    for (let x = Math.floor(f.minx / cell); x <= Math.floor(f.maxx / cell); x++)
      for (let z = Math.floor(f.minz / cell); z <= Math.floor(f.maxz / cell); z++) {
        const k = x + ',' + z; if (!g.has(k)) g.set(k, []); g.get(k).push(f);
      }
  });
  return { g, cell };
}
function makeRoadGrid(lines, cell = 60) {
  const g = new Map();
  lines.forEach(r => { for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1], b = r.pts[i];
    const seg = { a, b, w: r.w };
    for (let x = Math.floor(Math.min(a[0], b[0]) / cell); x <= Math.floor(Math.max(a[0], b[0]) / cell); x++)
      for (let z = Math.floor(Math.min(a[1], b[1]) / cell); z <= Math.floor(Math.max(a[1], b[1]) / cell); z++) {
        const k = x + ',' + z; if (!g.has(k)) g.set(k, []); g.get(k).push(seg);
      }
  } });
  return { g, cell };
}
function onRoad(x, z) {
  const k = Math.floor(x / roadGrid.cell) + ',' + Math.floor(z / roadGrid.cell);
  const list = roadGrid.g.get(k) || [];
  const fut = S.year > 0.5;
  const segs = fut && future.userData.corridors ? list.concat(corridorSegs()) : list;
  for (const s of segs) {
    const [ax, az] = s.a, [bx, bz] = s.b; const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    if (Math.hypot(x - ax - dx * t, z - az - dz * t) < s.w / 2 + 2) return true;
  }
  return false;
}
let _corrSegs = null;
function corridorSegs() { if (!_corrSegs) { _corrSegs = []; future.userData.corridors.forEach(l => { for (let i = 1; i < l.length; i++) _corrSegs.push({ a: l[i - 1], b: l[i], w: 24 }); }); } return _corrSegs; }
function blocked(x, z) {
  const fut = S.year > 0.5;
  const k = Math.floor(x / footprintGrid.cell) + ',' + Math.floor(z / footprintGrid.cell);
  for (const f of footprintGrid.g.get(k) || []) {
    if (fut && f.f === 1) continue;           // airport buildings are gone in 2033
    if (x < f.minx - 1 || x > f.maxx + 1 || z < f.minz - 1 || z > f.maxz + 1) continue;
    if (pointInRing(x, z, f.r)) return true;
  }
  if (fut) for (const f of future.userData.footprints) { if (x > f.minx && x < f.maxx && z > f.minz && z < f.maxz && pointInRing(x, z, f.r)) return true; }
  for (const r of waterRings) { if (pointInRing(x, z, r)) return !onRoad(x, z); }
  return false;
}

// ---------------- input ----------------
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  S.keys[e.code] = true;
  if (S.mode === 'intro') return;
  if (e.code === 'KeyY') toggleYear();
  if (e.code === 'KeyF') toggleMode();
  if (e.code === 'KeyN') cycleTime();
  if (e.code === 'KeyT') startTour();
  if (e.code === 'KeyH') showHelp();
  if (e.code === 'KeyR') resetCar();
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { S.keys[e.code] = false; });
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && e.target !== canvas) return; S.cam.drag = true; S.cam.lx = e.clientX; S.cam.ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!S.cam.drag) return;
  const dx = e.clientX - S.cam.lx, dy = e.clientY - S.cam.ly; S.cam.lx = e.clientX; S.cam.ly = e.clientY;
  if (S.mode === 'drone') { S.drone.yaw -= dx * 0.004; S.drone.pitch = THREE.MathUtils.clamp(S.drone.pitch - dy * 0.004, -1.45, 0.4); }
  else { S.cam.yaw -= dx * 0.006; S.cam.pitch = THREE.MathUtils.clamp(S.cam.pitch + dy * 0.004, 0.05, 1.3); S.cam.userYawT = 2.5; }
});
canvas.addEventListener('pointerup', () => { S.cam.drag = false; });
canvas.addEventListener('wheel', (e) => { S.cam.dist = THREE.MathUtils.clamp(S.cam.dist * (1 + Math.sign(e.deltaY) * 0.1), 7, 90); if (S.mode === 'drone') S.drone.pos.y = THREE.MathUtils.clamp(S.drone.pos.y * (1 + Math.sign(e.deltaY) * 0.1), 8, 3000); }, { passive: true });
// joystick
(() => {
  const stick = $('stick'), knob = $('knob'); let id = null, cx = 0, cy = 0;
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = () => { id = null; S.joy.x = S.joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  function move(e) { let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), m = 55; if (l > m) { dx *= m / l; dy *= m / l; } S.joy.x = dx / m; S.joy.y = -dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; }
  const hold = (el, key) => { el.addEventListener('pointerdown', () => S[key] = 1); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => S[key] = 0); };
  hold($('tUp'), 'up'); hold($('tDown'), 'down'); hold($('tBoost'), 'boost');
})();

// ---------------- UI wiring ----------------
$('btnStart').onclick = () => startGame(false);
$('btnTour').onclick = () => startGame(true);
$('tbYear').onclick = () => toggleYear();
$('tbMode').onclick = () => toggleMode();
$('tbTime').onclick = () => cycleTime();
$('tbTour').onclick = () => startTour();
$('tbHelp').onclick = () => showHelp();
$('helpOk').onclick = () => { $('help').hidden = true; };
$('cardOk').onclick = () => closeCard();
$('fFree').onclick = () => { $('finale').hidden = true; setMission(2); };
function showHelp() { $('help').hidden = false; }

function startGame(tour) {
  $('intro').hidden = true; $('hud').hidden = false; if (isTouch) $('touch').hidden = false;
  S.mode = 'drive';
  const c = S.car; camera.position.set(c.x - Math.sin(c.h) * 60, 40, c.z - Math.cos(c.h) * 60); // swoop in from above
  setMission(0);
  setTime(0);
  if (tour) startTour(); else toast('W A S D / 方向鍵開車，滑鼠拖曳轉視角 🚕');
}
function toast(t, ms = 3500) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, ms); }
function banner(a, b, ms = 3200) { const el = $('banner'); $('b1').textContent = a; $('b2').textContent = b || ''; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, ms); }

function setMission(i) {
  S.mission = i; const M = MISSIONS[i];
  $('mTitle').textContent = M.title; $('mHint').textContent = M.hint;
  const prog = $('mProg'); prog.innerHTML = '';
  if (i === 1) for (let k = 0; k < CHECKPOINTS.length; k++) { const d = document.createElement('i'); if (k < S.cpIndex) d.className = 'on'; prog.appendChild(d); }
  updateCheckpoint();
}
function currentTarget() {
  if (S.mission === 0) return { x: S.terminal[0], z: S.terminal[1], label: '松山機場航廈' };
  if (S.mission === 1 && S.cpIndex < CHECKPOINTS.length) { const cp = CHECKPOINTS[S.cpIndex]; const p = S.zoneCentres[cp.key]; return { x: p[0], z: p[1], label: cp.label }; }
  return null;
}
function updateCheckpoint() {
  const t = currentTarget();
  checkpointMesh.visible = !!t;
  if (S.cpLabel) { S.cpLabel.hidden = !t; S.cpLabel.el.style.display = t ? '' : 'none'; S.cpLabel.vis = !!t; }
  if (!t) return;
  checkpointMesh.position.set(t.x, 3, t.z);
  S.cpLabel.pos.set(t.x, 30, t.z); S.cpLabel.el.textContent = '★ ' + t.label;
}
function checkMission() {
  const t = currentTarget(); if (!t) return;
  const px = S.mode === 'drone' ? S.drone.pos.x : S.car.x, pz = S.mode === 'drone' ? S.drone.pos.z : S.car.z;
  const r = S.mode === 'drone' ? 90 : 30;
  if (Math.hypot(px - t.x, pz - t.z) > r) return;
  if (S.mission === 0) { checkpointMesh.visible = false; transformCutscene(); }
  else if (S.mission === 1) {
    const cp = CHECKPOINTS[S.cpIndex];
    S.cpIndex++;
    S.moneyTarget = Math.min(12e12, S.moneyTarget + 2e12);
    openCard(cp);
  }
}
function openCard(cp) {
  S.paused = true;
  $('cardKicker').textContent = `檢查點 ${S.cpIndex} / ${CHECKPOINTS.length}`;
  $('cardBig').textContent = cp.big; $('cardTitle').textContent = cp.title; $('cardText').innerHTML = cp.body;
  const wrap = $('cardPhotoWrap'), card = $('card').querySelector('.card');
  if (cp.photo) { $('cardPhoto').src = PHOTO[cp.photo]; $('cardPhoto').alt = '臺北市長蔣萬安'; wrap.classList.remove('none'); card.classList.remove('nophoto'); }
  else { wrap.classList.add('none'); card.classList.add('nophoto'); }
  $('card').hidden = false;
}
function closeCard() {
  $('card').hidden = true; S.paused = false;
  if (S.mission === 1) {
    if (S.cpIndex >= CHECKPOINTS.length) { finale(); return; }
    setMission(1); banner('通過！', `下一站：${CHECKPOINTS[S.cpIndex].label}`, 2200);
  }
}
function finale() {
  S.finished = true; S.moneyTarget = 12e12;
  banner('任務完成！', 'AI黃金世紀，從臺北開始', 3000);
  setTimeout(() => {
    $('fTitle').textContent = FINALE.title; $('fSub').textContent = FINALE.sub; $('fBody').textContent = FINALE.body; $('fNote').textContent = FINALE.note;
    $('finale').hidden = false;
  }, 2600);
  setMission(2);
}

// year / time / mode
function toggleYear() { setYear(S.yearTarget > 0.5 ? 0 : 1); }
function setYear(y) {
  S.yearTarget = y; future.visible = true;
  banner(y ? '2033' : '2026', y ? '松山機場 → 臺北AI園區' : '回到現在：松山機場', 2200);
  if (y) S.moneyTarget = Math.max(S.moneyTarget, 12e12 * (S.mission === 1 ? S.cpIndex / CHECKPOINTS.length : 1));
}
function cycleTime() { setTime((S.timeMode + 1) % 3); }
function setTime(m) {
  S.timeMode = m; S.todTarget = m === 1 ? 1 : 0;
  const names = ['🌙 <b>夜晚</b>', '☀️ <b>白天</b>', '🌅 <b>黃昏</b>'];
  $('tbTime').innerHTML = names[m];
}
function toggleMode() {
  if (S.mode === 'tour') endTour();
  if (S.mode === 'drive') {
    S.mode = 'drone'; S.drone.pos.set(S.car.x, 160, S.car.z + 60); S.drone.yaw = S.car.h; S.drone.pitch = -0.55;
    $('tbMode').innerHTML = '🚕 <b>開車</b>'; toast('空拍模式：WASD 移動、E/Q 升降、拖曳轉視角');
  } else {
    S.mode = 'drive'; $('tbMode').innerHTML = '🚁 <b>空拍</b>';
    if (blocked(S.car.x, S.car.z)) resetCar();
  }
}
function resetCar() {
  // put the car on the nearest major road point
  let best = null, bd = Infinity;
  for (const r of trafficRoads) for (const p of r.pts) { const d = Math.hypot(p[0] - S.car.x, p[1] - S.car.z); if (d < bd) { bd = d; best = p; } }
  if (best) { S.car.x = best[0]; S.car.z = best[1]; S.car.v = 0; }
}

// ---------------- cutscene: 2026 -> 2033 ----------------
function transformCutscene() {
  S.mode = 'cutscene'; S.cs = { t: 0 };
  $('mTitle').textContent = '時光機啟動'; $('mHint').textContent = '2026 → 2033：松山機場遷移，臺北AI園區誕生';
  banner('如果松山機場遷移……', '', 2600);
}
function updateCutscene(dt) {
  const cs = S.cs; cs.t += dt;
  const ang = cs.t * 0.12 + 0.6;
  const rad = 2600 - Math.min(cs.t, 10) * 60, hgt = 1300 - Math.min(cs.t, 10) * 40;
  camera.position.set(R.c[0] + Math.cos(ang) * rad, hgt, R.c[1] + Math.sin(ang) * rad);
  camera.lookAt(R.c[0], 0, R.c[1]);
  if (cs.t > 2.5 && S.yearTarget < 1) { S.yearTarget = 1; future.visible = true; banner('2033', '300 公頃 臺北AI園區', 3000); S.moneyTarget = 1e12; }
  if (cs.t > 13) {
    S.mode = 'drive'; S.cpIndex = 0; setMission(1);
    banner('任務完成！', '2033 已解鎖：開始探索', 2600);
    // move the car next to the park
    const p = S.zoneCentres.live; S.car.x = p[0]; S.car.z = p[1] + 120; if (blocked(S.car.x, S.car.z)) resetCar();
  }
}

// ---------------- tour ----------------
function startTour() {
  if (!S.D) return;
  if (S.mode !== 'tour') { S.prevMode = S.mode; S.prevYear = S.yearTarget; }
  S.mode = 'tour'; S.tour = { t: 0 };
  S.yearTarget = 0; $('caption').hidden = false; toast('導覽中：按任一工具列按鈕可離開', 2500);
}
function endTour() {
  S.mode = S.prevMode && S.prevMode !== 'tour' && S.prevMode !== 'cutscene' && S.prevMode !== 'intro' ? S.prevMode : 'drive';
  if (S.mission === 0 && S.prevYear !== undefined) S.yearTarget = S.prevYear;
  $('caption').hidden = true;
}
function updateTour(dt) {
  const T = S.tour; T.t += dt;
  const t = T.t;
  let cap = TOUR[0].cap; for (const k of TOUR) if (t >= k.t) cap = k.cap; $('caption').textContent = cap;
  if (t > 9 && S.yearTarget < 1) { S.yearTarget = 1; future.visible = true; S.moneyTarget = 12e12; }
  const zc = S.zoneCentres;
  const keys = [
    [0, [R.c[0] - 2600, 1500, R.c[1] + 1900], [R.c[0], 0, R.c[1]]],
    [9, [R.c[0] + 1800, 1100, R.c[1] + 2200], [R.c[0], 0, R.c[1]]],
    [16, [zc.park[0] - 900, 380, zc.park[1] + 300], [zc.park[0], 0, zc.park[1]]],
    [24, [zc.ai[0] + 500, 260, zc.ai[1] + 520], [zc.ai[0], 150, zc.ai[1]]],
    [32, [zc.live[0] + 600, 220, zc.live[1] + 450], [zc.live[0], 30, zc.live[1]]],
    [40, [R.c[0], 2600, R.c[1] + 2400], [R.c[0], 0, R.c[1] - 600]],
    [48, [R.c[0] - 1600, 900, R.c[1] + 1400], [zc.ai[0], 200, zc.ai[1]]],
    [58, [R.c[0] - 1600, 900, R.c[1] + 1400], [zc.ai[0], 200, zc.ai[1]]],
  ];
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1]; const f = THREE.MathUtils.smootherstep(t, a[0], b[0]);
  camera.position.set(...a[1].map((v, k) => v + (b[1][k] - v) * f));
  tmpV.set(...a[2].map((v, k) => v + (b[2][k] - v) * f)); camera.lookAt(tmpV);
  if (t > 60) { endTour(); banner('導覽結束', '換你親自開車探索吧！', 2500); }
}

// ---------------- per-frame updates ----------------
function updateCar(dt) {
  const k = S.keys, c = S.car;
  let thr = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + S.joy.y;
  let st = (k.KeyA || k.ArrowLeft ? 1 : 0) - (k.KeyD || k.ArrowRight ? 1 : 0) - S.joy.x;
  thr = THREE.MathUtils.clamp(thr, -1, 1); st = THREE.MathUtils.clamp(st, -1, 1);
  const boost = k.ShiftLeft || k.ShiftRight || S.boost;
  const max = boost ? 52 : 30;
  if (thr > 0) c.v += thr * (boost ? 20 : 12) * dt; else if (thr < 0) c.v += thr * (c.v > 0 ? 26 : 9) * dt;
  if (k.Space) c.v *= Math.pow(0.08, dt);
  c.v *= Math.pow(thr === 0 ? 0.55 : 0.985, dt);
  c.v = THREE.MathUtils.clamp(c.v, -12, max);
  c.steer += (st - c.steer) * Math.min(1, dt * 8);
  c.h += c.steer * dt * 1.9 * THREE.MathUtils.clamp(c.v / 9, -1, 1);
  const nx = c.x + Math.sin(c.h) * c.v * dt, nz = c.z + Math.cos(c.h) * c.v * dt;
  if (blocked(nx, nz)) {
    if (Math.abs(c.v) > 12) toast('碰！小心駕駛 🚧', 1200);
    c.v *= -0.25;
    if (!blocked(nx, c.z)) c.x = nx; else if (!blocked(c.x, nz)) c.z = nz;
  } else { c.x = nx; c.z = nz; }
  taxi.position.set(c.x, 0.05, c.z); taxi.rotation.y = c.h;
  taxi.rotation.z = -c.steer * Math.min(1, Math.abs(c.v) / 30) * 0.05;
  for (const w of taxi.userData.wheels) w.rotation.x += c.v * dt / 0.36;
  $('spd').textContent = Math.round(Math.abs(c.v) * 3.6);
  // chase camera
  if (S.cam.userYawT > 0) S.cam.userYawT -= dt; else S.cam.yaw += (0 - S.cam.yaw) * Math.min(1, dt * 1.5);
  const yaw = c.h + Math.PI + S.cam.yaw, dist = S.cam.dist + Math.abs(c.v) * 0.12;
  tmpV.set(c.x + Math.sin(yaw) * dist * Math.cos(S.cam.pitch), 2 + dist * Math.sin(S.cam.pitch), c.z + Math.cos(yaw) * dist * Math.cos(S.cam.pitch));
  camera.position.lerp(tmpV, 1 - Math.pow(0.0005, dt));
  camera.lookAt(c.x, 2.2, c.z);
}
function updateDrone(dt) {
  const k = S.keys, d = S.drone;
  const sp = (k.ShiftLeft || S.boost ? 3 : 1) * Math.max(40, d.pos.y * 0.9);
  const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + S.joy.y;
  const r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + S.joy.x * (isTouch ? 0 : 1);
  if (isTouch) d.yaw -= S.joy.x * dt * 1.4;
  const u = (k.KeyE || k.PageUp ? 1 : 0) - (k.KeyQ || k.PageDown ? 1 : 0) + S.up - S.down;
  d.pos.x += (-Math.sin(d.yaw) * f + Math.cos(d.yaw) * r) * sp * dt;
  d.pos.z += (-Math.cos(d.yaw) * f - Math.sin(d.yaw) * r) * sp * dt;
  d.pos.y = THREE.MathUtils.clamp(d.pos.y + u * sp * dt, 6, 3500);
  camera.position.copy(d.pos);
  camera.rotation.set(d.pitch, d.yaw, 0, 'YXZ');
  $('spd').textContent = Math.round(sp * Math.min(1, Math.hypot(f, r)) * 3.6);
}
function updatePlanes(t) {
  const fut = S.year > 0.5;
  planes.forEach((p, i) => {
    p.visible = !fut;
    if (fut) return;
    const ph = ((t / 46) + p.userData.phase) % 1;
    const dirn = i === 0 ? 1 : -1;
    // takeoff roll along runway then climb; landing mirrored
    const s = -R.L / 2 + ph * R.L * 3.2;
    let y = 3; if (s > R.L * 0.1) y = 3 + Math.pow((s - R.L * 0.1) / 30, 1.35);
    const ss = dirn > 0 ? s : -s;
    const tt = dirn > 0 ? 0 : 0;
    p.position.set(R.c[0] + ss * R.u[0] + tt * R.n[0], Math.min(y, 1600), R.c[1] + ss * R.u[1] + tt * R.n[1]);
    p.rotation.set(0, -R.ang + (dirn > 0 ? 0 : Math.PI), 0);
    p.rotateZ(y > 4 ? Math.min(0.22, (y - 3) / 300) : 0);
    if (i === 1) { // landing: run the same path backwards in time
      const ph2 = 1 - ph; const s2 = -R.L / 2 + ph2 * R.L * 3.2; let y2 = 3; if (s2 > R.L * 0.1) y2 = 3 + Math.pow((s2 - R.L * 0.1) / 30, 1.35);
      p.position.set(R.c[0] - s2 * R.u[0], Math.min(y2, 1600), R.c[1] - s2 * R.u[1]);
      p.rotation.set(0, -R.ang + Math.PI, 0); p.rotateZ(-Math.min(0.08, (y2 - 3) / 600));
    }
  });
}
function updateFutureLife(dt, t) {
  const ppl = future.userData.people;
  if (ppl && S.year > 0.05) {
    ppl.userData.data.forEach((d, i) => {
      d.s = (d.s + d.v * dt * 60 + 1) % 1;
      const P = d.path; const idx = d.s * (P.length - 1); const a = P[Math.floor(idx)], b = P[Math.min(P.length - 1, Math.floor(idx) + 1)]; const f = idx % 1;
      const x = a[0] + (b[0] - a[0]) * f + R.n[0] * d.off, z = a[1] + (b[1] - a[1]) * f + R.n[1] * d.off;
      const k = Math.max(0.001, THREE.MathUtils.smoothstep(S.year, 0.8, 1));
      _m.compose(_p.set(x, 1.2, z), _q.identity(), _s.set(k, k, k)); ppl.setMatrixAt(i, _m);
    });
    ppl.instanceMatrix.needsUpdate = true;
  }
  const dr = future.userData.drones;
  if (dr && S.year > 0.05) {
    const [ax, az] = S.zoneCentres.ai;
    for (let i = 0; i < 40; i++) {
      const a = t * (0.15 + (i % 5) * 0.03) + i * 1.7, r = 120 + (i % 7) * 60;
      _m.compose(_p.set(ax + Math.cos(a) * r, 90 + (i % 9) * 22 + Math.sin(t + i) * 6, az + Math.sin(a) * r), _q.identity(), _s.setScalar(S.year)); dr.setMatrixAt(i, _m);
    }
    dr.instanceMatrix.needsUpdate = true;
  }
  if (aiTower) {
    aiTower.userData.rings.forEach((r, i) => r.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1));
    aiTower.userData.beam.material.opacity = 0.05 + S.tod * 0.22 * S.year;
  }
}

function updateEnvironment(dt) {
  // smooth year/time transitions
  const yr = S.year;
  S.year += (S.yearTarget - S.year) * Math.min(1, dt * (S.mode === 'cutscene' ? 0.35 : 0.9));
  if (Math.abs(S.yearTarget - S.year) < 0.002) S.year = S.yearTarget;
  U.uT.value = S.year;
  if (yr !== S.year || !S._futInit) {
    S._futInit = true;
    updateFutureBuildings(S.year); updateTrees(S.year);
    const fo = THREE.MathUtils.smoothstep(S.year, 0.05, 0.45);
    future.userData.fadeMats.forEach(m => m.opacity = fo);
    future.userData.metroMats.forEach(m => m.opacity = fo * 0.75);
    airport.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = 1 - fo; } });
    airport.visible = S.year < 0.98; future.visible = S.year > 0.01;
    const y = $('yearNum'); const yy = Math.round(2026 + S.year * 7); y.textContent = yy; y.parentElement.classList.toggle('future', S.year > 0.5);
  }
  S.tod += (S.todTarget - S.tod) * Math.min(1, dt * 1.2);
  const n = S.tod; U.uNight.value = n;
  // sun: golden hour (mode 0), day (mode 2), night (mode 1)
  const elev = S.timeMode === 2 ? 58 : 16, az = 320;
  const phi = THREE.MathUtils.degToRad(90 - THREE.MathUtils.lerp(elev, -8, n)), th = THREE.MathUtils.degToRad(az);
  sun.setFromSphericalCoords(1, phi, th);
  const su = sky.material.uniforms; su.sunPosition.value.copy(sun); su.turbidity.value = 6; su.rayleigh.value = S.timeMode === 2 ? 1.2 : 2.2; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.85;
  const golden = S.timeMode === 0 ? 1 : 0;
  dir.color.setHSL(0.09, golden ? 0.85 : 0.25, THREE.MathUtils.lerp(golden ? 0.72 : 0.92, 0.75, n));
  dir.intensity = THREE.MathUtils.lerp(golden ? 2.6 : 2.9, 0.35, n);
  hemi.intensity = THREE.MathUtils.lerp(1.05, 0.28, n);
  hemi.color.setHSL(0.6, 0.5, THREE.MathUtils.lerp(0.85, 0.35, n));
  renderer.toneMappingExposure = THREE.MathUtils.lerp(0.95, 0.75, n);
  scene.fog.color.setHSL(THREE.MathUtils.lerp(golden ? 0.08 : 0.58, 0.63, n), THREE.MathUtils.lerp(golden ? 0.45 : 0.3, 0.5, n), THREE.MathUtils.lerp(golden ? 0.78 : 0.84, 0.07, n));
  scene.fog.near = THREE.MathUtils.lerp(2600, 900, n); scene.fog.far = THREE.MathUtils.lerp(16000, 8000, n);
  sky.visible = n < 0.97;
  scene.background = n > 0.5 ? new THREE.Color().setHSL(0.63, 0.55, 0.035) : null;
  stars.material.opacity = THREE.MathUtils.smoothstep(n, 0.5, 1);
  if (bloom) { bloom.strength = THREE.MathUtils.lerp(0.22, 0.95, n); bloom.threshold = THREE.MathUtils.lerp(0.9, 0.55, n); }
  taxi.userData.headMat.emissiveIntensity = 0.3 + n * 3; taxi.userData.signMat.emissiveIntensity = 0.6 + n * 2.5;
  if (future.userData.lampMat) future.userData.lampMat.emissiveIntensity = 0.2 + n * 2.5;
  if (future.userData.crownMat) future.userData.crownMat.emissiveIntensity = 0.6 + n * 2.2;
  // shadow camera follows the view focus
  const fx = S.mode === 'drive' ? S.car.x : camera.position.x, fz = S.mode === 'drive' ? S.car.z : camera.position.z;
  dir.position.set(fx + sun.x * 1500, Math.max(200, sun.y * 1500), fz + sun.z * 1500); dir.target.position.set(fx, 0, fz);
  // money counter
  S.money += (S.moneyTarget - S.money) * Math.min(1, dt * 2);
  $('money').textContent = S.money > 1e8 ? `產值 NT$ ${(S.money / 1e12).toFixed(2)} 兆` : '產值 NT$ —';
}

function drawMinimap(D, fut) {
  const size = 1400, b = D.bounds; const W = b[2] - b[0], H = b[3] - b[1]; const sc = size / Math.max(W, H);
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const X = (x) => (x - b[0]) * sc, Z = (z) => (z - b[1]) * sc;
  g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, size, size);
  const poly = (pts, fill) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.closePath(); g.fillStyle = fill; g.fill(); };
  D.green.forEach(gr => poly(flatToPts(gr.c, D.scale), gr.k === 1 ? '#6f9a55' : '#9bc278'));
  waterRings.forEach(r => poly(r, '#5aa3c9'));
  g.fillStyle = '#a19d94';
  buildings.footprints.forEach(f => { if (fut && f.f === 1) return; poly(f.r, f.h > 45 ? '#8b95a0' : '#aaa59b'); });
  if (!fut) { poly(flatToPts(D.aerodrome, D.scale), '#a9c27e'); g.strokeStyle = '#2c2e31'; g.lineWidth = (R.w || 60) * sc; g.beginPath(); g.moveTo(X(R.a[0]), Z(R.a[1])); g.lineTo(X(R.b[0]), Z(R.b[1])); g.stroke(); }
  else {
    poly(flatToPts(D.future.park, D.scale), '#4f9e4a'); poly(flatToPts(D.future.ai, D.scale), '#e0c46a'); poly(flatToPts(D.future.live, D.scale), '#e9c9a0');
    (D.future.aiExtra || []).forEach(a => poly(flatToPts(a, D.scale), '#e0c46a'));
    D.future.lakes.forEach(l => poly(flatToPts(l, D.scale), '#5aa3c9'));
  }
  g.lineCap = 'round';
  roadLines.forEach(r => { if (r.k > 10) return; g.strokeStyle = r.k <= 2 ? '#fff6d6' : '#ffffff'; g.lineWidth = Math.max(1.4, r.w * sc * 1.2); g.beginPath(); r.pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.stroke(); });
  if (fut) {
    const line = (arr, col) => { const p = flatToPts(arr.map(v => v * D.scale), D.scale); g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); p.forEach((q, i) => i ? g.lineTo(X(q[0]), Z(q[1])) : g.moveTo(X(q[0]), Z(q[1]))); g.stroke(); };
    line(D.future.metroX, '#2bb8ff'); line(D.future.metroY, '#ff3d96');
    D.future.corridors.forEach(cc => line(cc.c, '#ffb000')); line(D.future.minzu, '#ffb000');
  }
  return { c, sc, b };
}
const radar = $('radarC').getContext('2d');
function updateRadar() {
  const mm = minimapImgs[S.year > 0.5 ? 1 : 0]; if (!mm) return;
  const W = 260, px = S.mode === 'drive' ? S.car.x : camera.position.x, pz = S.mode === 'drive' ? S.car.z : camera.position.z;
  const heading = S.mode === 'drive' ? S.car.h : S.drone.yaw + Math.PI;
  const range = S.mode === 'drive' ? 420 + Math.abs(S.car.v) * 8 : Math.max(500, camera.position.y * 2);
  const k = (W / 2) / range * (1 / mm.sc);
  radar.save(); radar.fillStyle = '#1c2532'; radar.fillRect(0, 0, W, W);
  radar.translate(W / 2, W / 2); radar.rotate(heading + Math.PI);
  radar.scale(k * mm.sc, k * mm.sc);
  radar.drawImage(mm.c, -(px - mm.b[0]) * mm.sc, -(pz - mm.b[1]) * mm.sc);
  radar.restore();
  // target blip
  const t = currentTarget();
  const toScreen = (x, z) => { const dx = x - px, dz = z - pz; const a = -(heading + Math.PI); const rx = dx * Math.cos(a) - dz * Math.sin(a), rz = dx * Math.sin(a) + dz * Math.cos(a); return [rx * (W / 2) / range, rz * (W / 2) / range]; };
  if (t) {
    let [sx, sz] = toScreen(t.x, t.z); const l = Math.hypot(sx, sz), m = W / 2 - 14; if (l > m) { sx *= m / l; sz *= m / l; }
    radar.fillStyle = '#ffcc00'; radar.strokeStyle = '#000'; radar.lineWidth = 3; radar.beginPath(); radar.arc(W / 2 + sx, W / 2 + sz, 10, 0, Math.PI * 2); radar.fill(); radar.stroke();
  }
  // player arrow
  radar.fillStyle = '#ffffff'; radar.strokeStyle = '#000'; radar.lineWidth = 2;
  radar.beginPath(); radar.moveTo(W / 2, W / 2 - 13); radar.lineTo(W / 2 + 9, W / 2 + 10); radar.lineTo(W / 2, W / 2 + 5); radar.lineTo(W / 2 - 9, W / 2 + 10); radar.closePath(); radar.fill(); radar.stroke();
  // north marker rotation
  const n = document.querySelector('#radar .n'); const a = -(heading + Math.PI); const r = 96;
  n.style.left = `calc(50% + ${Math.sin(-a) * r * (n.parentElement.clientWidth / 220)}px)`; n.style.top = `calc(50% - ${Math.cos(-a) * r * (n.parentElement.clientWidth / 220)}px - 12px)`;
}

// ---------------- main loop ----------------
const clock = new THREE.Clock();
let lastLabel = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  U.uTime.value = t;
  if (S.ready) {
    if (!S.paused) {
      if (S.mode === 'drive') updateCar(dt);
      else if (S.mode === 'drone') updateDrone(dt);
      else if (S.mode === 'tour') updateTour(dt);
      else if (S.mode === 'cutscene') updateCutscene(dt);
      else if (S.mode === 'intro') { const a = t * 0.05; camera.position.set(R.c[0] + Math.cos(a) * 2400, 900, R.c[1] + Math.sin(a) * 2400); camera.lookAt(R.c[0], 0, R.c[1]); }
      if (S.mode === 'drive' || S.mode === 'drone') checkMission();
    }
    updateEnvironment(dt);
    updateTraffic(dt);
    updatePlanes(t);
    updateFutureLife(dt, t);
    if (ferris) ferris.userData.wheel.rotation.z = t * 0.05;
    if (checkpointMesh.visible) { checkpointMesh.rotation.y = t; checkpointMesh.scale.setScalar(1 + Math.sin(t * 4) * 0.05); }
    taxi.visible = S.mode !== 'drone' && S.mode !== 'tour' && S.mode !== 'cutscene' || S.mode === 'intro';
    if (t - lastLabel > 0.033) { updateLabels(); lastLabel = t; }
    if (S.mode !== 'intro') updateRadar();
  }
  if (composer) composer.render(); else renderer.render(scene, camera);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); if (composer) composer.setSize(innerWidth, innerHeight);
});

loop();
build().catch(err => { console.error(err); $('loadText').textContent = '載入失敗：' + err.message + '（請重新整理）'; });
window.__S = S; // debug handle
// scripted camera for screenshots / renders (used by tools/build/render.mjs)
window.__api = {
  year(y) { S.yearTarget = S.year = y; future.visible = y > 0; S._futInit = false; },
  time(m) { setTime(m); S.tod = S.todTarget; },
  drone(x, y, z, yaw, pitch) { S.mode = 'drone'; S.drone.pos.set(x, y, z); S.drone.yaw = yaw; S.drone.pitch = pitch; },
  look(x, y, z, tx, ty, tz) { S.mode = 'still'; camera.position.set(x, y, z); camera.lookAt(tx, ty, tz); },
  hud(on) { $('hud').style.display = on ? '' : 'none'; $('intro').hidden = true; },
  R, zones: () => S.zoneCentres,
  mission(i, cp = 0) { S.cpIndex = cp; setMission(i); },
  target: () => currentTarget(),
};
