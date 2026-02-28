import React from 'react';
import { Plane } from '@react-three/drei';

export function Road() {
  return (
    <group>
      {/* Ground */}
      <Plane args={[200, 200]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
      </Plane>

      {/* Road Surface */}
      <Plane args={[10, 200]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </Plane>

      {/* Center Line */}
      <Plane args={[0.2, 200]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <meshBasicMaterial color="#fbbf24" />
      </Plane>

      {/* Side Lines */}
      <Plane args={[0.2, 200]} rotation={[-Math.PI / 2, 0, 0]} position={[-4.8, 0.01, 0]}>
        <meshBasicMaterial color="#f8fafc" />
      </Plane>
      <Plane args={[0.2, 200]} rotation={[-Math.PI / 2, 0, 0]} position={[4.8, 0.01, 0]}>
        <meshBasicMaterial color="#f8fafc" />
      </Plane>
    </group>
  );
}
