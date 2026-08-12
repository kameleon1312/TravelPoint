// @ts-nocheck
'use client';
import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Colors } from '@travelpoint/theme';

function CameraResponsive() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // Container is now a fixed-px square (max 700px), so use size.width directly
    if (size.width < 300) {
      cam.position.z = 10;
    } else if (size.width < 500) {
      cam.position.z = 8;
    } else {
      cam.position.z = 6;
    }
    cam.updateProjectionMatrix();
  }, [camera, size.width]);
  return null;
}

function EarthGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const earthMap = useTexture('/earth.jpg');

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <Sphere ref={meshRef} args={[2.2, 64, 64]}>
      <meshStandardMaterial
        map={earthMap}
        roughness={0.75}
        metalness={0.05}
      />
    </Sphere>
  );
}

export function GlobScene(): React.JSX.Element {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        // R3F v9 does not auto-clear to transparent — must be set explicitly.
        gl.setClearColor(0, 0, 0, 0);
        scene.background = null;
      }}
      resize={{ debounce: 0, scroll: false }}
      style={{ background: 'transparent', width: '100%', height: '100%', display: 'block' }}
    >
      <CameraResponsive />
      <ambientLight intensity={0.15} color={Colors.star} />
      <directionalLight position={[5, 3, 5]} intensity={2.4} color="#fff8f0" />
      <directionalLight position={[-4, -2, -5]} intensity={0.2} color="#8ab0d0" />
      <Suspense fallback={null}>
        <EarthGlobe />
      </Suspense>
    </Canvas>
  );
}
