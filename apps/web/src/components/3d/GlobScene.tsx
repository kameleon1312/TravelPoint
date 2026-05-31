'use client';
import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Colors } from '@travelpoint/theme';

function CameraResponsive() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (size.width < 480) {
      cam.position.z = 11;
    } else if (size.width < 768) {
      cam.position.z = 9;
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

// Thin atmosphere glow around the globe
function Atmosphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <Sphere ref={meshRef} args={[2.28, 48, 48]}>
      <meshBasicMaterial
        color={Colors.aurora}
        transparent
        opacity={0.06}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </Sphere>
  );
}

// Outer halo — signal blue ring
function Halo() {
  return (
    <Sphere args={[2.38, 32, 32]}>
      <meshBasicMaterial
        color={Colors.signal}
        transparent
        opacity={0.035}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </Sphere>
  );
}

export function GlobScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <CameraResponsive />

      {/* Soft ambient — keeps night side visible */}
      <ambientLight intensity={0.18} color={Colors.star} />

      {/* Main sun light — warm white from upper-right */}
      <directionalLight position={[5, 3, 5]} intensity={2.2} color="#fff8f0" />

      {/* Aurora rim light from left */}
      <pointLight position={[-6, 2, 3]} color={Colors.aurora} intensity={0.6} />

      {/* Deep space fill from behind */}
      <pointLight position={[0, -4, -6]} color={Colors.cosmicBlue} intensity={0.4} />

      <EarthGlobe />
      <Atmosphere />
      <Halo />
    </Canvas>
  );
}
