// @ts-nocheck
'use client';
import { useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// ─── Scroll singleton ─────────────────────────────────────────────────────────
const scroll = { value: 0 };

function useScrollSync() {
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scroll.value = max > 0 ? window.scrollY / max : 0;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
}

// ─── Noise ────────────────────────────────────────────────────────────────────
function pn(x: number, y: number) {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function sn(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return pn(ix, iy)*(1-ux)*(1-uy) + pn(ix+1, iy)*ux*(1-uy)
       + pn(ix, iy+1)*(1-ux)*uy   + pn(ix+1, iy+1)*ux*uy;
}
function fbm(x: number, y: number, oct = 5) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += sn(x*f, y*f)*a; a *= 0.5; f *= 2.1; }
  return v;
}
function applyCanopyNoise(geom: THREE.PlaneGeometry, amp: number, seed: number) {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const h = (fbm(x * 0.12 + seed, y * 0.12 + seed * 1.618, 5) * 0.65
             + fbm(x * 0.03 + seed * 0.5, y * 0.03, 3) * 0.4 - 0.30) * amp;
    pos.setZ(i, Math.max(-amp * 0.3, h));
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp  = (a: number, b: number, t: number) => a + (b - a) * clamp(t);

// ─── Waypoints: space → atmosphere → blue sky → green land ───────────────────
type WP = {
  t: number; camY: number; camZ: number;
  bgC: string; fogC: string; fogD: number;
  sunY: number; sunInt: number;
};

const WAYPOINTS: WP[] = [
  { t:0.00, camY:600, camZ:  0, bgC:'#000002', fogC:'#000002', fogD:0.00005, sunY:-1.2, sunInt:0.00 },
  { t:0.18, camY:400, camZ:-16, bgC:'#00020E', fogC:'#00020E', fogD:0.00018, sunY:-0.7, sunInt:0.04 },
  { t:0.35, camY:240, camZ:-34, bgC:'#040F28', fogC:'#040F28', fogD:0.0010,  sunY:-0.1, sunInt:0.25 },
  { t:0.50, camY:140, camZ:-52, bgC:'#0E3888', fogC:'#081C44', fogD:0.0036,  sunY: 0.45,sunInt:1.50 },
  { t:0.65, camY: 80, camZ:-68, bgC:'#3480CC', fogC:'#1C4E8A', fogD:0.0068,  sunY: 0.75,sunInt:3.20 },
  { t:0.80, camY: 56, camZ:-84, bgC:'#52A0E8', fogC:'#3070B8', fogD:0.0088,  sunY: 0.85,sunInt:4.10 },
  { t:1.00, camY: 48, camZ:-100,bgC:'#68B8F4', fogC:'#1E4428', fogD:0.0075,  sunY: 0.80,sunInt:3.70 },
];

function sampleWP(t: number) {
  let a = WAYPOINTS[0]!;
  let b = WAYPOINTS[1]!;
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    if (t >= WAYPOINTS[i]!.t) {
      a = WAYPOINTS[i]!;
      b = WAYPOINTS[i + 1] ?? WAYPOINTS[i]!;
    }
  }
  const f = (b.t - a.t) > 0 ? clamp((t - a.t) / (b.t - a.t)) : 0;
  return { a, b, f };
}

// ─── Star field with scroll-controlled fade ───────────────────────────────────
function StarField() {
  const { scene, camera } = useThree();
  const ptsRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    const N = 12000;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 820 + Math.random() * 180;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xEDE8DF,
      size: 1.1,
      sizeAttenuation: false,
      transparent: true,
      opacity: 1.0,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    ptsRef.current = pts;
    return () => { scene.remove(pts); geo.dispose(); mat.dispose(); };
  }, [scene]);

  useFrame(() => {
    const pts = ptsRef.current;
    if (!pts) return;
    pts.position.copy(camera.position);
    const opacity = clamp(1 - scroll.value / 0.45);
    (pts.material as THREE.PointsMaterial).opacity = opacity;
    pts.visible = opacity > 0.004;
  });

  return null;
}

// ─── Terrain (PolyHaven CC0) ──────────────────────────────────────────────────
const PH = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k';

function AmazonCanopy() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  const [d, n, r] = useTexture([
    `${PH}/forest_leaves_02/forest_leaves_02_diffuse_1k.jpg`,
    `${PH}/forest_leaves_02/forest_leaves_02_nor_gl_1k.jpg`,
    `${PH}/forest_leaves_02/forest_leaves_02_rough_1k.jpg`,
  ]);
  useMemo(() => {
    for (const tx of [d, n, r]) { tx!.wrapS = tx!.wrapT = THREE.RepeatWrapping; tx!.repeat.set(10, 10); }
  }, [d, n, r]);

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(1400, 1400, 96, 96);
    applyCanopyNoise(g, 20, 11);
    return g;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const fade = clamp((340 - camera.position.y) / 160);
    mat.opacity    = fade;
    mat.transparent = fade < 1;
    mat.depthWrite  = fade >= 1;
  });

  return (
    <mesh ref={meshRef} geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -90]}>
      <meshStandardMaterial
        map={d} normalMap={n} roughnessMap={r}
        normalScale={new THREE.Vector2(2.0, 2.0)}
        color="#1D5015" roughness={0.88} metalness={0}
        transparent opacity={0} depthWrite={false}
      />
    </mesh>
  );
}

function ForestFloor() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  const [d, n, r] = useTexture([
    `${PH}/leaves_forest_ground/leaves_forest_ground_diff_1k.jpg`,
    `${PH}/leaves_forest_ground/leaves_forest_ground_nor_gl_1k.jpg`,
    `${PH}/leaves_forest_ground/leaves_forest_ground_rough_1k.jpg`,
  ]);
  useMemo(() => {
    for (const tx of [d, n, r]) { tx!.wrapS = tx!.wrapT = THREE.RepeatWrapping; tx!.repeat.set(8, 8); }
  }, [d, n, r]);

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(1200, 1200, 64, 64);
    applyCanopyNoise(g, 12, 29);
    return g;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const fade = clamp((280 - camera.position.y) / 120);
    mat.opacity    = fade;
    mat.transparent = fade < 1;
    mat.depthWrite  = fade >= 1;
  });

  return (
    <mesh ref={meshRef} geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -125]}>
      <meshStandardMaterial
        map={d} normalMap={n} roughnessMap={r}
        normalScale={new THREE.Vector2(1.8, 1.8)}
        color="#244010" roughness={0.95} metalness={0}
        transparent opacity={0} depthWrite={false}
      />
    </mesh>
  );
}

function FallbackTerrain() {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(1400, 1400, 32, 32);
    applyCanopyNoise(g, 18, 11);
    return g;
  }, []);
  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -90]}>
      <meshStandardMaterial color="#1A3C0E" roughness={1} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// ─── Amazon River ─────────────────────────────────────────────────────────────
function AmazonRiver() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  const geom = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3( 80, -2.5, -72), new THREE.Vector3( 50, -2.5, -88),
      new THREE.Vector3( 16, -2.5,-100), new THREE.Vector3(-14, -2.5,-112),
      new THREE.Vector3(  6, -2.5,-126), new THREE.Vector3( 38, -2.5,-140),
      new THREE.Vector3( 60, -2.5,-154), new THREE.Vector3( 42, -2.5,-168),
      new THREE.Vector3(  8, -2.5,-184),
    ]);
    const pts = curve.getPoints(160);
    const W = 11;
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p    = pts[i]!;
      const next = pts[Math.min(i+1, pts.length-1)]!;
      const prev = pts[Math.max(i-1, 0)]!;
      const tang  = new THREE.Vector3().subVectors(next, prev).normalize();
      const right = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      pos.push(p.x+right.x*W, p.y, p.z+right.z*W,  p.x-right.x*W, p.y, p.z-right.z*W);
      nor.push(0,1,0, 0,1,0);
      const u = i / (pts.length - 1);
      uv.push(u,0, u,1);
      if (i < pts.length-1) { const b = i*2; idx.push(b,b+1,b+2, b+1,b+3,b+2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv',       new THREE.Float32BufferAttribute(uv,  2));
    g.setIndex(idx);
    return g;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const fade = clamp((260 - camera.position.y) / 100);
    mat.opacity    = fade;
    mat.transparent = fade < 1;
    mat.depthWrite  = fade >= 1;
  });

  return (
    <mesh ref={meshRef} geometry={geom}>
      <meshStandardMaterial color="#1A5060" roughness={0.07} metalness={0.28} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// ─── Scene driver ─────────────────────────────────────────────────────────────
const _fogLerp = new THREE.Color();
const _bgA     = new THREE.Color();
const _bgB     = new THREE.Color();

function SceneDriver() {
  const { scene, camera } = useThree();
  const fog     = useMemo(() => new THREE.FogExp2(0x000002, 0.00005), []);
  const bgColor = useMemo(() => new THREE.Color('#000002'), []);
  const dirRef  = useRef<THREE.DirectionalLight>(null!);
  const hemiRef = useRef<THREE.HemisphereLight>(null!);

  useEffect(() => {
    scene.fog        = fog;
    scene.background = bgColor;
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = 62; cam.near = 1; cam.far = 2500;
    cam.updateProjectionMatrix();
    camera.position.set(0, 600, 0);
    return () => { scene.fog = null; scene.background = null; };
  }, [scene, fog, camera, bgColor]);

  useFrame(() => {
    const { a, b, f } = sampleWP(scroll.value);

    camera.position.y += (lerp(a.camY, b.camY, f) - camera.position.y) * 0.048;
    camera.position.z += (lerp(a.camZ, b.camZ, f) - camera.position.z) * 0.048;

    const tilt    = clamp(scroll.value / 0.22);
    const lookAtY = lerp(camera.position.y - 14, 0, tilt);
    camera.lookAt(0, lookAtY, camera.position.z - 42);

    bgColor.lerpColors(_bgA.set(a.bgC), _bgB.set(b.bgC), f);

    _fogLerp.set(a.fogC).lerp(new THREE.Color(b.fogC), f);
    fog.color.copy(_fogLerp);
    fog.density = lerp(a.fogD, b.fogD, f);

    if (dirRef.current) {
      const sy = lerp(a.sunY, b.sunY, f);
      const si = lerp(a.sunInt, b.sunInt, f);
      dirRef.current.position.set(70, Math.max(40, sy * 220 + 40), 100);
      const warmth = clamp(1 - sy / 0.8);
      dirRef.current.color.lerpColors(
        new THREE.Color('#FFE8C0'),
        new THREE.Color('#DCEEFF'),
        1 - warmth,
      );
      dirRef.current.intensity = si;
    }

    if (hemiRef.current) {
      const forestBlend = clamp(1 - (camera.position.y - 40) / 90);
      hemiRef.current.color.lerpColors(
        new THREE.Color('#020408'),
        new THREE.Color('#061204'),
        forestBlend,
      );
      hemiRef.current.groundColor.lerpColors(
        new THREE.Color('#010305'),
        new THREE.Color('#040A02'),
        forestBlend,
      );
      hemiRef.current.intensity = lerp(0.10, 0.45, forestBlend);
    }
  });

  return (
    <>
      <ambientLight intensity={0.10} color="#c4b9ac" />
      <directionalLight ref={dirRef as any} position={[70, 200, 100]} intensity={0} color="#FFE8C0" />
      <hemisphereLight ref={hemiRef as any} args={['#020408', '#010305', 0.10]} />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function ScrollScape3D(): React.JSX.Element {
  useScrollSync();
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 600, 0], fov: 62, near: 1, far: 2500 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <SceneDriver />
        <StarField />
        <Suspense fallback={<FallbackTerrain />}>
          <AmazonCanopy />
        </Suspense>
        <Suspense fallback={null}>
          <ForestFloor />
        </Suspense>
        <AmazonRiver />
      </Canvas>
    </div>
  );
}
