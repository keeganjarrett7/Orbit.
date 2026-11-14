
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

type RibbonProps = {
  radius: number;
  width: number;
  phase: number;
  tilt: [number, number, number];
  startColor: string;
  endColor: string;
  opacity?: number;
};

function EnergyRibbon({
  radius,
  width,
  phase,
  tilt,
  startColor,
  endColor,
  opacity = 0.7,
}: RibbonProps) {
  const geometry = useMemo(() => {
    const segments = 240;

    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const colorA = new THREE.Color(startColor);
    const colorB = new THREE.Color(endColor);

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;

      // Curved path wrapping around the orb.
      const center = new THREE.Vector3(
        Math.cos(t) * radius,
        Math.sin(t) * radius * 0.92,
        Math.sin(t * 2 + phase) * 0.16
      );

      // Extend the ribbon outward from its orbital path.
        const side = center.clone().normalize();

      // Gentle width variation creates flowing shape.
      const variation =
        0.75 + Math.sin(t * 3 + phase) * 0.25;

      const halfWidth = width * variation * 0.5;

      const left = center
        .clone()
        .addScaledVector(side, halfWidth);

      const right = center
        .clone()
        .addScaledVector(side, -halfWidth);

      vertices.push(
        left.x,
        left.y,
        left.z,
        right.x,
        right.y,
        right.z
      );

      // Gradient between cyan, blue, and violet.
      const blend =
        (Math.sin(t * 2 + phase) + 1) * 0.5;

      const color = colorA
        .clone()
        .lerp(colorB, blend)
        .multiplyScalar(2.4);

      for (let j = 0; j < 2; j++) {
        colors.push(color.r, color.g, color.b);
      }

      if (i < segments) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;

        indices.push(a, b, c, b, d, c);
      }
    }

    const result = new THREE.BufferGeometry();

    result.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    result.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );

    result.setIndex(indices);
    result.computeVertexNormals();

    return result;
  }, [
    radius,
    width,
    phase,
    startColor,
    endColor,
  ]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <group rotation={tilt}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          side={THREE.DoubleSide}
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function ReflectiveCore() {
  return (
    <group>
      {/* Main obsidian-glass sphere */}
      <mesh>
        <sphereGeometry args={[0.98, 96, 96]} />

        <meshPhysicalMaterial
          color="#080615"
          metalness={0.55}
          roughness={0.045}
          clearcoat={1}
          clearcoatRoughness={0.025}
          envMapIntensity={0.9}
        />
      </mesh>

      {/* Very faint violet glass coating */}
      <mesh>
        <sphereGeometry args={[1.005, 64, 64]} />

        <meshPhysicalMaterial
          color="#6a44ff"
          transparent
          opacity={0.06}
          metalness={0.15}
          roughness={0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function OrbScene() {
  const groupRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);

  const reducedMotion = useMemo(
    () =>
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches,
    []
  );

  
    

useFrame((state, delta) => {
  if (reducedMotion) return;

  const group = groupRef.current;
  const rings = ringsRef.current;

  if (!group || !rings) return;

  const time = state.clock.elapsedTime;

  // 1. Very subtle floating.
  group.position.y = Math.sin(time * 0.65) * 0.025;

  // 2. Primary breathing animation.
  // Slowly expands and contracts by about 3%.
  const breath = 1 + Math.sin(time * 1.1) * 0.03;
  group.scale.setScalar(breath);

  // 3. Stronger cursor interaction.
  // Still limited to preserve the front profile.
  const targetX = -state.pointer.y * 0.11;
  const targetY = state.pointer.x * 0.15;

  group.rotation.x = THREE.MathUtils.damp(
    group.rotation.x,
    targetX,
    3.5,
    delta
  );

  group.rotation.y = THREE.MathUtils.damp(
    group.rotation.y,
    targetY,
    3.5,
    delta
  );

  // No automatic spinning.
  rings.rotation.set(0, 0, 0);
  rings.scale.setScalar(1);
});




  return (
    <group ref={groupRef}>
      <ReflectiveCore />

      <group ref={ringsRef}>
        {/* Main flowing cyan ribbon */}
        <EnergyRibbon
          radius={1.23}
          width={0.23}
          phase={0}
          tilt={[0.3, 0.15, 0.2]}
          startColor="#37dfff"
          endColor="#a64dff"
          opacity={0.75}
        />

        {/* Main violet ribbon */}
        <EnergyRibbon
          radius={1.32}
          width={0.19}
          phase={1.4}
          tilt={[0.55, -0.15, -0.2]}
          startColor="#b94aff"
          endColor="#33cfff"
          opacity={0.65}
        />

        {/* Secondary layered trails */}
        <EnergyRibbon
          radius={1.17}
          width={0.075}
          phase={2.1}
          tilt={[0.12, 0.3, 0.1]}
          startColor="#a85aff"
          endColor="#72edff"
        />

        <EnergyRibbon
          radius={1.39}
          width={0.065}
          phase={0.8}
          tilt={[-0.2, 0.2, 0.35]}
          startColor="#39bfff"
          endColor="#e258ff"
        />

        <EnergyRibbon
          radius={1.28}
          width={0.045}
          phase={3.4}
          tilt={[0.42, -0.35, 0.18]}
          startColor="#e36aff"
          endColor="#6df7ff"
        />

        <EnergyRibbon
          radius={1.35}
          width={0.035}
          phase={4.2}
          tilt={[-0.38, 0.35, -0.14]}
          startColor="#68edff"
          endColor="#765bff"
        />
      </group>
    </group>
  );
}

export default function Orb() {
  return (
    <div
      className="orbit-orb"
      aria-label="Animated Orbit brand sculpture"
      role="img"
    >
      <Canvas
        camera={{
          position: [0, 0, 5.4],
          fov: 42,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
          
        }}
        >
        <ambientLight intensity={0.75} />

        <directionalLight
          position={[-3, 4, 5]}
          intensity={2}
          color="#ffffff"
        />

        <pointLight
          position={[3, 2, 2]}
          intensity={25}
          color="#39bfff"
        />

        <pointLight
          position={[-3, -2, 2]}
          intensity={18}
          color="#c855ff"
        />

        <Environment preset="studio" />

        <OrbScene />
      </Canvas>
    </div>
  );
}



