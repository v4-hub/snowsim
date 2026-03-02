import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from '../store';
import * as THREE from 'three';

const MAX_SETTLED = 2000; // Max accumulated snow particles

// Check if particle is inside a cone-shaped barrier zone
// Returns effective density (0 if outside)
function checkConeBarrier(
  px: number, py: number,
  barrier: { x: number; w: number; h: number; d: number } | null
): number {
  if (!barrier) return 0;

  const crownBase = barrier.h * 0.15; // Crown starts at 15% height

  if (py < 0 || py > barrier.h) return 0;

  if (py < crownBase) {
    // Trunk zone: very narrow gap, minimal effect
    if (Math.abs(px - barrier.x) < 0.3) return barrier.d * 0.2;
    return 0;
  }

  // Crown zone: tapered width (wider at base, narrower at top)
  const t = (py - crownBase) / (barrier.h - crownBase); // 0 at crown base, 1 at top
  const effectiveWidth = barrier.w * (1 - t * 0.85); // Narrows to 15% at top
  if (Math.abs(px - barrier.x) > effectiveWidth) return 0;

  // Density decreases toward top (crown is sparser near tip)
  return barrier.d * (1 - t * 0.5);
}

export function SnowParticles() {
  const { windSpeed, windDirection, snowIntensity, barriers, terrainRoughness, turbulenceIntensity } = useSimulationStore();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const settledRef = useRef<THREE.Points>(null);

  // Active particle state
  const particles = useMemo(() => {
    const count = snowIntensity;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = -1 - Math.random();
      velocities[i * 3 + 2] = 0;
    }
    return { positions, velocities, count };
  }, [snowIntensity]);

  // Settled snow state (ring buffer)
  const settled = useMemo(() => {
    const positions = new Float32Array(MAX_SETTLED * 3);
    return { positions, writeIndex: 0, count: 0 };
  }, []);
  const settledState = useRef(settled);
  settledState.current = settled;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const currentWindRef = useRef(windSpeed);
  // Track which particles were slowed by a barrier (for accumulation)
  const wasSlowed = useMemo(() => new Uint8Array(snowIntensity), [snowIntensity]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    timeRef.current += delta;

    // WE-UQ: Stochastic Wind Modeling
    const ti = turbulenceIntensity / 100;
    const gustFactor = (Math.sin(timeRef.current * 2.1) + Math.sin(timeRef.current * 0.8 + 1.2)) / 2;
    const currentWind = Math.max(0, windSpeed + windSpeed * ti * gustFactor);
    currentWindRef.current = currentWind;

    const windRad = (windDirection * Math.PI) / 180;
    const { positions, velocities, count } = particles;
    const sState = settledState.current;

    // Pre-calculate barrier bounds
    const bLeft = barriers.left.enabled ? { x: -barriers.left.distance, w: 1.4, h: barriers.left.height, d: barriers.left.density } : null;
    const bRight = barriers.right.enabled ? { x: barriers.right.distance, w: 1.4, h: barriers.right.height, d: barriers.right.density } : null;
    const bMed = barriers.median.enabled ? { x: 0, w: 1.4, h: barriers.median.height, d: barriers.median.density } : null;

    let snowOnRoadCount = 0;
    let forwardBlockers = 0;
    let reverseBlockers = 0;
    let barrierInterceptedDensitySum = 0;

    const zRef = 10;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      let px = positions[ix];
      let py = positions[iy];
      let pz = positions[iz];
      let vx = velocities[ix];
      let vy = velocities[iy];
      let vz = velocities[iz];

      // WE-UQ: Logarithmic Wind Profile
      const height = Math.max(py, terrainRoughness + 0.01);
      const profileFactor = Math.log(height / terrainRoughness) / Math.log(zRef / terrainRoughness);
      const localWindSpeed = currentWind * Math.max(0, profileFactor);

      const baseWindX = Math.cos(windRad) * localWindSpeed;
      const baseWindZ = Math.sin(windRad) * localWindSpeed;

      // Apply wind with turbulence
      const localTurbX = (Math.random() - 0.5) * ti * localWindSpeed;
      const localTurbZ = (Math.random() - 0.5) * ti * localWindSpeed;
      vx += (baseWindX + localTurbX - vx) * 2 * delta;
      vz += (baseWindZ + localTurbZ - vz) * 2 * delta;

      // Cone-shaped barrier collision
      let hitDensity = checkConeBarrier(px, py, bLeft);
      if (hitDensity === 0) hitDensity = checkConeBarrier(px, py, bRight);
      if (hitDensity === 0) hitDensity = checkConeBarrier(px, py, bMed);

      if (hitDensity > 0) {
        barrierInterceptedDensitySum += hitDensity;
        vx *= (1 - hitDensity);
        vz *= (1 - hitDensity);
        vy = Math.max(vy, -0.5);
        wasSlowed[i] = 1;
      }

      // Update position
      px += vx * delta;
      py += vy * delta;
      pz += vz * delta;

      // Metrics
      if (px > -5 && px < 5 && py < 5) snowOnRoadCount++;
      if (px > 0 && px < 5 && py > 0 && py < 3 && pz < 0 && pz > -40) forwardBlockers++;
      if (px > -5 && px < 0 && py > 0 && py < 3 && pz > 0 && pz < 40) reverseBlockers++;

      // Check if particle hit ground or out of bounds
      if (py < 0 || px < -50 || px > 50 || pz < -50 || pz > 50) {
        // If particle was slowed by barrier and landed near barrier, accumulate it
        if (py < 0 && wasSlowed[i] === 1 && sState.count < MAX_SETTLED) {
          const si = sState.writeIndex * 3;
          sState.positions[si] = px;
          sState.positions[si + 1] = 0.02 + Math.random() * 0.15; // Slight elevation
          sState.positions[si + 2] = pz;
          sState.writeIndex = (sState.writeIndex + 1) % MAX_SETTLED;
          if (sState.count < MAX_SETTLED) sState.count++;
        }
        wasSlowed[i] = 0;

        // Respawn
        const spawnTop = Math.random() > 0.5;
        if (spawnTop) {
          py = 30;
          px = (Math.random() - 0.5) * 100;
          pz = (Math.random() - 0.5) * 100;
        } else {
          py = Math.random() * 30;
          if (Math.abs(baseWindX) > Math.abs(baseWindZ)) {
            px = baseWindX > 0 ? -50 : 50;
            pz = (Math.random() - 0.5) * 100;
          } else {
            pz = baseWindZ > 0 ? -50 : 50;
            px = (Math.random() - 0.5) * 100;
          }
        }
        vx = baseWindX * 0.5;
        vz = baseWindZ * 0.5;
        vy = -1 - Math.random();
      }

      positions[ix] = px;
      positions[iy] = py;
      positions[iz] = pz;
      velocities[ix] = vx;
      velocities[iy] = vy;
      velocities[iz] = vz;

      dummy.position.set(px, py, pz);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Update settled snow geometry
    if (settledRef.current && sState.count > 0) {
      const geom = settledRef.current.geometry;
      geom.setAttribute('position', new THREE.BufferAttribute(sState.positions.slice(0, sState.count * 3), 3));
      geom.attributes.position.needsUpdate = true;
      geom.setDrawRange(0, sState.count);
    }

    // Throttle store updates
    if (Math.floor(timeRef.current * 10) % 5 === 0) {
      const maxBlockers = snowIntensity * 0.02;
      const fVis = Math.max(0, 100 - (forwardBlockers / maxBlockers) * 100);
      const rVis = Math.max(0, 100 - (reverseBlockers / maxBlockers) * 100);

      const windAngleFactor = Math.abs(Math.cos(windRad));
      const extraBlockers = barrierInterceptedDensitySum * 0.35 * Math.max(0.2, windAngleFactor);
      const bfVis = Math.max(0, 100 - ((forwardBlockers + extraBlockers * 0.55) / maxBlockers) * 100);
      const brVis = Math.max(0, 100 - ((reverseBlockers + extraBlockers * 0.45) / maxBlockers) * 100);

      useSimulationStore.getState().setMetrics({
        snowOnRoad: snowOnRoadCount,
        forwardVisibility: Math.round(fVis),
        reverseVisibility: Math.round(rVis),
        baselineForwardVisibility: Math.round(bfVis),
        baselineReverseVisibility: Math.round(brVis),
        currentWindSpeed: Number(currentWindRef.current.toFixed(1)),
      });
    }
  });

  return (
    <group>
      {/* Active falling snow */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, particles.count]}>
        <sphereGeometry args={[0.05, 4, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </instancedMesh>

      {/* Accumulated snow on ground */}
      <points ref={settledRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={0}
            array={settled.positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#e8f0ff" size={0.15} transparent opacity={0.85} sizeAttenuation />
      </points>
    </group>
  );
}
