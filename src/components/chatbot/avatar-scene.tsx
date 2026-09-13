"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AvatarController } from "./avatar-controller";

const CUTOUT = "/images/chat-avatar-cutout.png";

/** Mouth region as fractions of plane size (origin = mesh center, +y up). ~42% from photo top. */
const MOUTH = { x: 0.015, y: 0.085, w: 0.12, h: 0.05 };

type Props = {
  controller: AvatarController;
  reducedMotion?: boolean;
};

function SoftShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]} receiveShadow={false}>
      <circleGeometry args={[0.55, 32]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
    </mesh>
  );
}

function bendGeometry(geo: THREE.PlaneGeometry, amount: number) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = (x * x * 0.04 + y * 0.02) * amount;
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Photo-derived “upper body on horse” card with depth parallax layers.
 * Not photogrammetry GLB — cutout PNG on bent/layered planes + procedural mouth.
 */
export function AvatarScene({ controller, reducedMotion }: Props) {
  const root = useRef<THREE.Group>(null);
  const horse = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Mesh>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const mouthInner = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, CUTOUT);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.premultiplyAlpha = true;
  }, [texture]);

  const aspect = texture.image
    ? (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height
    : 0.75;
  const h = 2.15;
  const w = h * aspect;

  const bodyGeo = useMemo(() => bendGeometry(new THREE.PlaneGeometry(w, h, 16, 20), 1), [w, h]);
  const horseGeo = useMemo(() => bendGeometry(new THREE.PlaneGeometry(w, h, 12, 16), 0.7), [w, h]);

  useFrame((_, dt) => {
    const state = controller.getState();
    const damp = reducedMotion ? 0.15 : 1;

    if (root.current) {
      const breathScale = 1 + state.breath * 0.012 * damp;
      root.current.scale.setScalar(breathScale);
      root.current.position.x = state.swayX * 2.2 * damp;
      root.current.position.y = -0.05 + state.swayY * 2.2 * damp + state.breath * 0.018 * damp;
      root.current.rotation.z = state.headTilt * damp;
      root.current.rotation.y = state.swayX * 1.4 * damp;
    }

    if (horse.current) {
      horse.current.position.z = 0.04;
      horse.current.position.y = -0.02 + Math.sin(state.breath * Math.PI) * 0.006 * damp;
    }
    if (body.current) {
      body.current.position.z = 0.08;
    }

    const open = state.mouthOpen;
    const jaw = state.blendshapes.jawOpen;
    const funnel = state.blendshapes.mouthFunnel;
    const smile = (state.blendshapes.mouthSmileLeft + state.blendshapes.mouthSmileRight) * 0.5;

    const baseMouthY = MOUTH.y * h;
    const baseMouthX = MOUTH.x * w;

    if (mouth.current) {
      const mh = MOUTH.h * h * (0.35 + jaw * 2.4);
      const mw = MOUTH.w * w * (0.85 + funnel * 0.35 + open * 0.25 + smile * 0.1);
      mouth.current.scale.set(mw / (MOUTH.w * w), mh / (MOUTH.h * h), 1);
      mouth.current.position.set(baseMouthX, baseMouthY - jaw * 0.025, 0.14);
      const mat = mouth.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.speaking || open > 0.04 ? 0.72 + open * 0.25 : 0;
    }
    if (mouthInner.current) {
      const ih = MOUTH.h * h * (0.15 + jaw * 1.1);
      const iw = MOUTH.w * w * (0.45 + open * 0.2);
      mouthInner.current.scale.set(
        iw / (MOUTH.w * w * 0.55),
        ih / (MOUTH.h * h * 0.4),
        1,
      );
      mouthInner.current.position.set(baseMouthX, baseMouthY - jaw * 0.032, 0.145);
      const mat = mouthInner.current.material as THREE.MeshBasicMaterial;
      mat.opacity = state.speaking || open > 0.06 ? 0.55 + open * 0.35 : 0;
    }

    void dt;
  });

  const sharedMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [texture],
  );

  const horseMat = useMemo(() => {
    const m = sharedMat.clone();
    m.color = new THREE.Color("#e8e4df");
    m.opacity = 0.98;
    return m;
  }, [sharedMat]);

  return (
    <group ref={root} position={[0, -0.08, 0]}>
      <SoftShadow />

      <mesh ref={horse} position={[0.02, -0.04, 0.02]} scale={[1.04, 1.03, 1]} geometry={horseGeo}>
        <primitive object={horseMat} attach="material" />
      </mesh>

      <mesh ref={body} position={[0, 0, 0.08]} geometry={bodyGeo}>
        <primitive object={sharedMat} attach="material" />
      </mesh>

      <mesh ref={mouth} position={[0, 0, 0.14]} renderOrder={2}>
        <planeGeometry args={[MOUTH.w * w, MOUTH.h * h]} />
        <meshBasicMaterial color="#2a1410" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={mouthInner} position={[0, 0, 0.145]} renderOrder={3}>
        <planeGeometry args={[MOUTH.w * w * 0.55, MOUTH.h * h * 0.4]} />
        <meshBasicMaterial color="#8b3a32" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
