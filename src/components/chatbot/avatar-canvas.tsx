"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import type { AvatarController } from "./avatar-controller";
import { AvatarScene } from "./avatar-scene";

type Props = {
  controller: AvatarController;
  className?: string;
};

function IdleTicker({ controller }: { controller: AvatarController }) {
  useFrame((_, dt) => {
    controller.tick(dt);
  });
  return null;
}

export default function AvatarCanvas({ controller, className }: Props) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className={className} aria-hidden>
      <Canvas
        className="h-full w-full"
        style={{ background: "transparent", touchAction: "none" }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          premultipliedAlpha: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        camera={{ position: [0, 0.05, 2.55], fov: 32, near: 0.1, far: 20 }}
        dpr={[1, 1.75]}
      >
        <Suspense fallback={null}>
          <IdleTicker controller={controller} />
          <ambientLight intensity={0.95} />
          <directionalLight position={[2, 3, 4]} intensity={0.35} />
          <AvatarScene controller={controller} reducedMotion={reducedMotion} />
        </Suspense>
      </Canvas>
    </div>
  );
}
