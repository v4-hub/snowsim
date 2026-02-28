import React, { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Environment } from '@react-three/drei';
import { useSimulationStore } from '../store';
import { Road } from './Road';
import { Vegetation } from './Vegetation';
import { SnowParticles } from './SnowParticles';
import * as THREE from 'three';

function CameraController() {
  const cameraView = useSimulationStore((state) => state.cameraView);
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (cameraView === 'birdseye') {
      camera.position.set(0, 40, 40);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    } else if (cameraView === 'driver') {
      camera.position.set(2.5, 1.5, 20); // Right lane, 1.5m high, looking forward
      if (controlsRef.current) {
        controlsRef.current.target.set(2.5, 1.5, -20);
        controlsRef.current.update();
      }
    } else if (cameraView === 'side') {
      camera.position.set(30, 5, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 5, 0);
        controlsRef.current.update();
      }
    }
  }, [cameraView, camera]);

  return <OrbitControls ref={controlsRef} makeDefault />;
}

export default function Simulation() {
  return (
    <div className="w-full h-full bg-slate-900">
      <Canvas shadows camera={{ position: [0, 40, 40], fov: 45 }}>
        <color attach="background" args={['#94a3b8']} />
        <fog attach="fog" args={['#94a3b8', 10, 80]} />
        
        <ambientLight intensity={0.4} />
        <directionalLight
          castShadow
          position={[50, 50, 20]}
          intensity={1.5}
          shadow-mapSize={[2048, 2048]}
        >
          <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50, 0.1, 150]} />
        </directionalLight>

        <Road />
        <Vegetation />
        <SnowParticles />
        
        <CameraController />
      </Canvas>
    </div>
  );
}
