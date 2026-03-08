import React, { useMemo, useRef } from 'react';
import { useSimulationStore } from '../store';
import * as THREE from 'three';

interface TreeInstance {
  position: [number, number, number];
  trunkScale: [number, number, number];
  crownPosition: [number, number, number];
  crownScale: [number, number, number];
}

export function Vegetation() {
  const barriers = useSimulationStore((state) => state.barriers);

  // Generate tree instances — Black Spruce (Picea mariana) shape
  const trees = useMemo(() => {
    const allTrees: TreeInstance[] = [];

    const generateRow = (config: typeof barriers.left, xPos: number) => {
      if (!config.enabled) return;
      const spacing = 2 / config.density; // Density 1 = 2m apart, 0.5 = 4m apart
      const numTrees = Math.floor(200 / spacing);

      for (let i = 0; i < numTrees; i++) {
        const z = -100 + i * spacing + (Math.random() * 0.5 - 0.25);
        const x = xPos + (Math.random() * 1 - 0.5);
        const totalHeight = config.height * (0.8 + Math.random() * 0.4);

        // Black Spruce proportions:
        // Trunk: ~20% of total height, narrow
        const trunkHeight = totalHeight * 0.25;
        const trunkRadius = 0.12 + Math.random() * 0.04; // 12-16cm

        // Crown: ~85% of total height, starts at ~15% up (overlaps trunk top)
        const crownStart = totalHeight * 0.15;
        const crownHeight = totalHeight * 0.85;
        const crownRadius = totalHeight * 0.18 * (0.85 + Math.random() * 0.3); // Allometric: width scales with height

        allTrees.push({
          position: [x, 0, z],
          trunkScale: [trunkRadius, trunkHeight, trunkRadius],
          crownPosition: [x, crownStart + crownHeight / 2, z],
          crownScale: [crownRadius, crownHeight, crownRadius],
        });
      }
    };

    generateRow(barriers.left, -barriers.left.distance);
    generateRow(barriers.right, barriers.right.distance);
    generateRow(barriers.median, 0);

    return allTrees;
  }, [barriers]);

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  React.useLayoutEffect(() => {
    if (!trunkRef.current || !crownRef.current) return;

    trees.forEach((tree, i) => {
      // Trunk — positioned so bottom touches ground
      dummy.position.set(tree.position[0], tree.trunkScale[1] / 2, tree.position[2]);
      dummy.scale.set(tree.trunkScale[0], tree.trunkScale[1], tree.trunkScale[2]);
      dummy.updateMatrix();
      trunkRef.current!.setMatrixAt(i, dummy.matrix);

      // Crown — positioned above trunk
      dummy.position.set(tree.crownPosition[0], tree.crownPosition[1], tree.crownPosition[2]);
      dummy.scale.set(tree.crownScale[0], tree.crownScale[1], tree.crownScale[2]);
      dummy.updateMatrix();
      crownRef.current!.setMatrixAt(i, dummy.matrix);
    });

    trunkRef.current.instanceMatrix.needsUpdate = true;
    crownRef.current.instanceMatrix.needsUpdate = true;
  }, [trees, dummy]);

  if (trees.length === 0) return null;

  return (
    <group>
      {/* Trunks — brown cylinders */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#5c3d1e" roughness={0.9} />
      </instancedMesh>

      {/* Crowns — dark green cones (spruce shape) */}
      <instancedMesh ref={crownRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#064e3b" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
