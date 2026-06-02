// R3F v8 global JSX augmentation does not propagate through pnpm's dual
// @types/react (v18 web-local + v19 root-hoisted) workspace layout.
// GlobScene.tsx and ScrollScape3D.tsx use // @ts-nocheck as the workaround.
// Upgrade @react-three/fiber to v9 (React 19 native) to remove this note.
export {};
