import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSimulationStore } from '../store';
import * as THREE from 'three';

export function SnowParticles() {
  const { windSpeed, windDirection, snowIntensity, barriers, terrainRoughness, turbulenceIntensity } = useSimulationStore();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Particle state
  const particles = useMemo(() => {
    const count = snowIntensity;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100; // x: -50 to 50
      positions[i * 3 + 1] = Math.random() * 30;      // y: 0 to 30
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // z: -50 to 50

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = -1 - Math.random(); // falling speed
      velocities[i * 3 + 2] = 0;
    }
    return { positions, velocities, count };
  }, [snowIntensity]); // Re-init if intensity changes

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const currentWindRef = useRef(windSpeed);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    timeRef.current += delta;

    // WE-UQ: Stochastic Wind Modeling (Mean + Fluctuating Component)
    const ti = turbulenceIntensity / 100;
    // Simulate gusting using a sum of sine waves to create a pseudo-random fluctuation
    const gustFactor = (Math.sin(timeRef.current * 2.1) + Math.sin(timeRef.current * 0.8 + 1.2)) / 2;
    const currentWind = Math.max(0, windSpeed + windSpeed * ti * gustFactor);
    currentWindRef.current = currentWind;

    // Convert wind direction to radians (0 is +X, 90 is +Z)
    const windRad = (windDirection * Math.PI) / 180;

    const { positions, velocities, count } = particles;

    // Pre-calculate barrier bounds for fast checking
    const bLeft = barriers.left.enabled ? { x: -barriers.left.distance, w: 2, h: barriers.left.height, d: barriers.left.density } : null;
    const bRight = barriers.right.enabled ? { x: barriers.right.distance, w: 2, h: barriers.right.height, d: barriers.right.density } : null;
    const bMed = barriers.median.enabled ? { x: 0, w: 2, h: barriers.median.height, d: barriers.median.density } : null;

    let snowOnRoadCount = 0;
    let forwardBlockers = 0;
    let reverseBlockers = 0;
    let barrierInterceptedDensitySum = 0; // Sum of densities affecting intercepted particles

    const zRef = 10; // 10m reference height for wind speed

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
      // U(z) = U_ref * ln(z/z0) / ln(z_ref/z0)
      const height = Math.max(py, terrainRoughness + 0.01); // Prevent log(0) or negative
      const profileFactor = Math.log(height / terrainRoughness) / Math.log(zRef / terrainRoughness);
      const localWindSpeed = currentWind * Math.max(0, profileFactor);

      const baseWindX = Math.cos(windRad) * localWindSpeed;
      const baseWindZ = Math.sin(windRad) * localWindSpeed;

      // Apply wind with local turbulence to particle
      const localTurbX = (Math.random() - 0.5) * ti * localWindSpeed;
      const localTurbZ = (Math.random() - 0.5) * ti * localWindSpeed;

      vx += (baseWindX + localTurbX - vx) * 2 * delta;
      vz += (baseWindZ + localTurbZ - vz) * 2 * delta;

      // Check barrier collision (simple AABB)
      let hitDensity = 0;
      if (bLeft && Math.abs(px - bLeft.x) < bLeft.w && py < bLeft.h) hitDensity = bLeft.d;
      else if (bRight && Math.abs(px - bRight.x) < bRight.w && py < bRight.h) hitDensity = bRight.d;
      else if (bMed && Math.abs(px - bMed.x) < bMed.w && py < bMed.h) hitDensity = bMed.d;

      if (hitDensity > 0) {
        // Track intercepted particles for baseline estimation
        barrierInterceptedDensitySum += hitDensity;
        // Reduce velocity based on density (Wind Shadow Effect)
        vx *= (1 - hitDensity);
        vz *= (1 - hitDensity);
        // If density is high, particles might get stuck or fall straight down
        vy = Math.max(vy, -0.5); // Fall slower through trees
      }

      // Update position
      px += vx * delta;
      py += vy * delta;
      pz += vz * delta;

      // Metrics calculation
      if (px > -5 && px < 5 && py < 5) {
        snowOnRoadCount++;
      }
      // Forward visibility (right lane, looking -Z)
      if (px > 0 && px < 5 && py > 0 && py < 3 && pz < 0 && pz > -40) {
        forwardBlockers++;
      }
      // Reverse visibility (left lane, looking +Z)
      if (px > -5 && px < 0 && py > 0 && py < 3 && pz > 0 && pz < 40) {
        reverseBlockers++;
      }

      // Reset if out of bounds
      if (py < 0 || px < -50 || px > 50 || pz < -50 || pz > 50) {
        // Spawn upwind or top
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

        // Reset velocity
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

    // Throttle store updates to avoid React re-render lag
    if (Math.floor(timeRef.current * 10) % 5 === 0) { // Update ~2 times per second
      // Calculate visibility percentage (0 to 100).
      // We scale this based on snowIntensity to make it relative.
      const maxBlockers = snowIntensity * 0.02;
      const fVis = Math.max(0, 100 - (forwardBlockers / maxBlockers) * 100);
      const rVis = Math.max(0, 100 - (reverseBlockers / maxBlockers) * 100);

      // Estimate baseline (no-barrier) visibility
      // Particles intercepted by barriers would have continued to the road at wind speed.
      // A fraction of those would end up in the visibility frustum.
      const windAngleFactor = Math.abs(Math.cos(windRad)); // How much wind blows toward road
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
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.count]}>
      <sphereGeometry args={[0.05, 4, 4]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
    </instancedMesh>
  );
}
