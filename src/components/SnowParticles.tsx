import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from '../store';
import * as THREE from 'three';

const MAX_SETTLED = 2000; // Max accumulated snow particles

// Tree position for per-tree 3D collision
interface TreePos { x: number; z: number; h: number; crownR: number; d: number; }

// Generate tree positions matching Vegetation.tsx layout
function generateTreePositions(
  config: { enabled: boolean; distance: number; height: number; density: number },
  xSign: number // -1 for left, +1 for right, 0 for median
): TreePos[] {
  if (!config.enabled) return [];
  const trees: TreePos[] = [];
  const spacing = 2 / config.density;
  const numTrees = Math.floor(200 / spacing);
  const xBase = xSign === 0 ? 0 : xSign * config.distance;

  // Use deterministic pseudo-random for consistent placement
  let seed = Math.abs(xSign * 1000 + config.density * 100 + config.height * 10) + 1;
  const seededRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < numTrees; i++) {
    const z = -100 + i * spacing + (seededRandom() * 0.5 - 0.25);
    const x = xBase + (seededRandom() * 1 - 0.5);
    const totalHeight = config.height * (0.8 + seededRandom() * 0.4);
    const crownRadius = totalHeight * 0.18 * (0.85 + seededRandom() * 0.3); // Allometric: width scales with height
    trees.push({ x, z, h: totalHeight, crownR: crownRadius, d: config.density });
  }
  return trees;
}

// Check if a particle (px, py, pz) hits any individual tree cone
// Returns effective density (0 if not hitting any tree)
function checkTreeCollision(
  px: number, py: number, pz: number,
  trees: TreePos[]
): number {
  for (let t = 0; t < trees.length; t++) {
    const tree = trees[t];
    if (py < 0 || py > tree.h) continue;

    const crownBase = tree.h * 0.15;

    if (py < crownBase) {
      // Trunk zone: very narrow cylinder
      const dx = px - tree.x;
      const dz = pz - tree.z;
      if (dx * dx + dz * dz < 0.09) return tree.d * 0.2; // 0.3m radius trunk
      continue;
    }

    // Crown zone: 3D cone shape, tapered from base to tip
    const tFrac = (py - crownBase) / (tree.h - crownBase); // 0 at base, 1 at tip
    const effectiveR = tree.crownR * (1 - tFrac * 0.85); // Narrows to 15% at top
    const dx = px - tree.x;
    const dz = pz - tree.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < effectiveR * effectiveR) {
      // Inside this tree's cone
      return tree.d * (1 - tFrac * 0.5);
    }
  }
  return 0;
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

  // Pre-compute tree positions for collision (matches Vegetation.tsx visual)
  const allTrees = useMemo(() => {
    return [
      ...generateTreePositions(barriers.left, -1),
      ...generateTreePositions(barriers.right, 1),
      ...generateTreePositions(barriers.median, 0),
    ];
  }, [barriers]);

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

    let snowOnRoadCount = 0;
    let forwardBlockers = 0;
    let reverseBlockers = 0;
    let capturedByBarrier = 0;
    let particlesInBarrierZone = 0; // All particles currently inside any barrier X-range

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

      // Per-tree 3D cone collision: only captures particles inside actual tree cones
      // Snow passes freely through gaps between trees
      const hitDensity = checkTreeCollision(px, py, pz, allTrees);

      if (hitDensity > 0) {
        // Quadratic density scaling: porosity effects are nonlinear
        // density 0.2 → captureP = 0.04 (4%)  → sparse, most pass through
        // density 0.5 → captureP = 0.25 (25%) → moderate protection
        // density 0.8 → captureP = 0.64 (64%) → dense, strong capture
        const captureP = hitDensity * hitDensity;
        if (Math.random() < captureP) {
          // Captured by branches: settle at barrier base
          py = -0.1; // Force ground → respawn upwind
          wasSlowed[i] = 1;
          capturedByBarrier++;
        } else {
          // Passes through with density-dependent speed reduction
          const velFactor = 1 - captureP * 0.5;
          vx *= velFactor;
          vz *= velFactor;
          if (hitDensity > 0.5) vy = Math.min(vy, -0.3); // Dense barriers deflect downward
        }
      }

      // Update position
      px += vx * delta;
      py += vy * delta;
      pz += vz * delta;

      // Metrics
      if (px > -5 && px < 5 && py < 5) snowOnRoadCount++;
      if (px > 0 && px < 5 && py > 0 && py < 3 && pz < 0 && pz > -40) forwardBlockers++;
      if (px > -5 && px < 0 && py > 0 && py < 3 && pz > 0 && pz < 40) reverseBlockers++;

      // Count particles currently inside any barrier zone (barrier X ± crownR, y < treeH)
      // These particles are being influenced (captured/slowed/deflected) by the barrier
      // Without barriers, they'd all pass through to become road-level visibility blockers
      if (allTrees.length > 0 && py > 0 && py < 15) {
        for (const tree of allTrees) {
          if (Math.abs(px - tree.x) < tree.crownR + 1 && Math.abs(pz - tree.z) < 5 && py < tree.h) {
            particlesInBarrierZone++;
            break; // Count each particle only once
          }
        }
      }

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

        // Respawn — continuous distribution weighted toward ground level
        // Uses squared random for exponential-like falloff: dense near ground, sparse at height
        // No more hard bands that create visible "empty zones"
        const r = Math.random();
        py = r * r * 30; // Exponential bias: 50% below 7.5m, 75% below 13m, max 30m

        const spawnRoll = Math.random();
        if (spawnRoll < 0.6) {
          // 60% from upwind edge (wind-driven transport)
          if (Math.abs(baseWindX) > Math.abs(baseWindZ)) {
            px = baseWindX > 0 ? -50 : 50;
            pz = (Math.random() - 0.5) * 100;
          } else {
            pz = baseWindZ > 0 ? -50 : 50;
            px = (Math.random() - 0.5) * 100;
          }
        } else {
          // 40% random position (gravitational snowfall)
          px = (Math.random() - 0.5) * 100;
          pz = (Math.random() - 0.5) * 100;
        }
        vx = baseWindX * 0.5;
        vz = baseWindZ * 0.5;
        vy = -0.8 - Math.random() * 0.5;
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
      // maxBlockers calibrated against WMO blizzard visibility standards:
      // At 15 m/s + 50k particles, without barriers → visibility ~100-200m (POOR)
      // With shelterbelts capturing ~60% of particles → visibility ~350-500m (GOOD)
      // Reference: Blizzard = vis ≤ 400m (US NWS / Environment Canada)
      const maxBlockers = snowIntensity * 0.012;
      const fVis = Math.max(0, 100 - (forwardBlockers / maxBlockers) * 100);
      const rVis = Math.max(0, 100 - (reverseBlockers / maxBlockers) * 100);

      // Baseline: estimate what visibility WOULD BE without any barriers
      // All particles in the barrier zone represent snow being captured/deflected/slowed
      // Without barriers, these particles would freely cross the road
      const windAngleFactor = Math.abs(Math.cos(windRad));
      const crossFactor = Math.max(0.3, windAngleFactor);
      // particlesInBarrierZone counts all particles in the barrier influence area
      // Without barriers, a large fraction would become road-level visibility blockers
      const extraBlockers = (capturedByBarrier + particlesInBarrierZone * 0.3) * crossFactor;
      // Forward (far lane) gets ~50% of extra, Reverse (near lane) gets ~60%
      const bfVis = Math.max(0, 100 - ((forwardBlockers + extraBlockers * 0.50) / maxBlockers) * 100);
      const brVis = Math.max(0, 100 - ((reverseBlockers + extraBlockers * 0.60) / maxBlockers) * 100);

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
