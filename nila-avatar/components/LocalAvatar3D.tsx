'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { AvatarModel } from '@/components/avatar/AvatarModel';
import { BUST_CAMERA } from '@/lib/avatarConfig';

type LocalAvatar3DProps = {
  isSpeaking?: boolean;
};

function Scene({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <>
      <color attach="background" args={['#0f2744']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} castShadow />
      <directionalLight position={[-2, 2, 1]} intensity={0.35} color="#93c5fd" />
      <spotLight position={[0, 3, 2]} angle={0.4} penumbra={0.5} intensity={0.6} />
      <Environment preset="studio" />
      <AvatarModel isSpeaking={isSpeaking} />
      <ContactShadows position={[0, 0.85, 0]} opacity={0.35} scale={2.5} blur={2} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.08}
        target={BUST_CAMERA.target}
      />
    </>
  );
}

function LocalAvatar3DInner({ isSpeaking = false }: LocalAvatar3DProps) {
  return (
    <div className="relative h-full w-full bg-gradient-to-b from-[#0f2744] via-[#1a3a5c] to-[#0f2744]">
      <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[10px] font-semibold text-white">
        Nila · professional (offline)
      </span>
      <Canvas
        camera={{
          position: BUST_CAMERA.position,
          fov: BUST_CAMERA.fov,
        }}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene isSpeaking={isSpeaking} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export const LocalAvatar3D = dynamic(
  () => Promise.resolve(LocalAvatar3DInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0f2744] text-sm text-blue-200">
        Loading Nila…
      </div>
    ),
  }
);
