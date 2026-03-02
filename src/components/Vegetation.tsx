import React, { useMemo, useRef } from 'react';
import { useSimulationStore } from '../store';
import * as THREE from 'three';

export function Vegetation() {
  const barriers = useSimulationStore((state) => state.barriers);

  // Generate tree instances based on config
  const { leftTrees, rightTrees, medianTrees } = useMemo(() => {
    const generateRow = (side: 'left' | 'right' | 'median', config: any, xPos: number) => {
      if (!config.enabled) return [];
      const trees = [];
      const spacing = 2 / config.density; // Density 1 = 2m apart, 0.5 = 4m apart
      const numTrees = Math.floor(200 / spacing);

      for (let i = 0; i < numTrees; i++) {
        const z = -100 + i * spacing + (Math.random() * 0.5 - 0.25);
        const x = xPos + (Math.random() * 1 - 0.5);
        const height = config.height * (0.8 + Math.random() * 0.4);
        const radius = 1.2 + Math.random() * 0.3; // Fixed width, independent of height
        trees.push({ position: [x, height / 2, z], scale: [radius, height, radius] });
      }
      return trees;
    };

    return {
      leftTrees: generateRow('left', barriers.left, -barriers.left.distance),
      rightTrees: generateRow('right', barriers.right, barriers.right.distance),
      medianTrees: generateRow('median', barriers.median, 0),
    };
  }, [barriers]);

  const allTrees = [...leftTrees, ...rightTrees, ...medianTrees];

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  React.useLayoutEffect(() => {
    if (meshRef.current) {
      allTrees.forEach((tree, i) => {
        dummy.position.set(tree.position[0], tree.position[1], tree.position[2]);
        dummy.scale.set(tree.scale[0], tree.scale[1], tree.scale[2]);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [allTrees, dummy]);

  if (allTrees.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, allTrees.length]} castShadow receiveShadow>
      <coneGeometry args={[1, 1, 8]} />
      <meshStandardMaterial color="#064e3b" roughness={0.8} />
    </instancedMesh>
  );
}
