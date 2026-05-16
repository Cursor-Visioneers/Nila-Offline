'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLB_URL, VRM_URL } from '@/lib/avatarConfig';

type AvatarModelProps = {
  isSpeaking: boolean;
};

function applyLipSync(vrm: VRM, isSpeaking: boolean, t: number) {
  const em = vrm.expressionManager;
  if (!em) return;
  const mouth = isSpeaking ? (Math.sin(t * 13) * 0.5 + 0.5) * 0.85 : 0;
  em.setValue('aa', mouth);
  em.setValue('ih', mouth * 0.25);
  em.setValue('ou', mouth * 0.2);
  em.setValue('blink', t % 4.2 > 3.95 ? 1 : 0);
}

function GlbAvatar({ isSpeaking }: AvatarModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(GLB_URL);

  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    scene.rotation.y = Math.PI;
    scene.position.set(0, -1.55, 0);
    scene.scale.setScalar(1.05);
  }, [scene]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.25) * 0.04;
    }

    scene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;
      if (!dict || !inf) return;

      const mouth =
        dict.mouthOpen ?? dict.viseme_aa ?? dict['viseme_aa'] ?? dict.MouthOpen;
      if (mouth !== undefined) {
        inf[mouth] = isSpeaking ? (Math.sin(t * 14) * 0.5 + 0.5) * 0.7 : 0;
      }
    });
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

function VrmAvatar({ isSpeaking }: AvatarModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const vrmRef = useRef<VRM | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(VRM_URL, (gltf) => {
      const vrm = gltf.userData.vrm as VRM | undefined;
      if (!vrm || !rootRef.current) return;

      if (vrm.meta?.metaVersion === '0') {
        VRMUtils.rotateVRM0(vrm);
      }

      VRMUtils.combineSkeletons(vrm.scene);
      vrm.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).frustumCulled = false;
        }
      });

      vrm.scene.position.set(0, -0.55, 0);
      vrm.scene.scale.setScalar(1.15);

      rootRef.current.clear();
      rootRef.current.add(vrm.scene);
      vrmRef.current = vrm;
    });

    return () => {
      vrmRef.current = null;
      rootRef.current?.clear();
    };
  }, []);

  useFrame((state, delta) => {
    const vrm = vrmRef.current;
    if (!vrm) return;
    vrm.update(delta);
    applyLipSync(vrm, isSpeaking, state.clock.elapsedTime);

    if (vrm.lookAt?.target) {
      vrm.lookAt.target.position.set(0, 1.45, 1.2);
      vrm.lookAt.autoUpdate = true;
    }
  });

  return <group ref={rootRef} />;
}

export function AvatarModel({ isSpeaking }: AvatarModelProps) {
  const [useGlb, setUseGlb] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(GLB_URL, { method: 'HEAD' })
      .then((r) => setUseGlb(r.ok))
      .catch(() => setUseGlb(false));
  }, []);

  if (useGlb === null) return null;
  if (useGlb) return <GlbAvatar isSpeaking={isSpeaking} />;
  return <VrmAvatar isSpeaking={isSpeaking} />;
}

useGLTF.preload(GLB_URL);
