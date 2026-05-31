'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Globe() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <Sphere ref={meshRef} args={[2.2, 64, 64]}>
      <MeshDistortMaterial
        color="#1B3A6B"
        attach="material"
        distort={0.15}
        speed={1.5}
        roughness={0.4}
        metalness={0.6}
        wireframe={false}
      />
    </Sphere>
  );
}

function GlobeGrid() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <Sphere ref={ref} args={[2.25, 32, 32]}>
      <meshBasicMaterial color="#3DD6C4" wireframe opacity={0.06} transparent />
    </Sphere>
  );
}

export function GlobScene() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} color="#3DD6C4" intensity={1.5} />
      <pointLight position={[-10, -10, -10]} color="#5B8DEF" intensity={0.8} />
      <Globe />
      <GlobeGrid />
    </Canvas>
  );
}
