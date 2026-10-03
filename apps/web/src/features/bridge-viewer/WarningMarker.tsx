'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BridgeConditionType } from '@bridge/contracts';
import { AlertTriangle, AlertOctagon } from 'lucide-react';

interface WarningMarkerProps {
  position: [number, number, number];
  condition: BridgeConditionType;
}

export function WarningMarker({ position, condition }: WarningMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const isVisible = condition === 'BROKEN' || condition === 'DANGER';
  const isDanger = condition === 'DANGER';
  const pinColor = isDanger ? '#ef4444' : '#f59e0b';
  const labelText = isDanger ? 'DANGER HAZARD' : 'ROAD DAMAGE';
  const Icon = isDanger ? AlertOctagon : AlertTriangle;

  // Gentle floating animation
  useFrame((state) => {
    if (!isVisible) return;
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(t * 3) * 0.5 + 1.0;
    }
    if (ringRef.current) {
      const scale = 1 + (Math.sin(t * 4) + 1) * 0.3;
      ringRef.current.scale.set(scale, scale, scale);
    }
  });

  if (!isVisible) {
    return null;
  }

  return (
    <group position={position}>
      {/* 3D Pin Beacon */}
      <mesh ref={meshRef} position={[0, 1.0, 0]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial
          color={pinColor}
          emissive={pinColor}
          emissiveIntensity={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Pulsing Base Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshBasicMaterial color={pinColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating HTML Annotation Label */}
      <Html
        position={[0, 3.5, 0]}
        center
        distanceFactor={60}
        zIndexRange={[100, 0]}
      >
        <div
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider text-white shadow-xl pointer-events-none select-none border backdrop-blur-md ${
            isDanger
              ? 'bg-rose-600/90 border-rose-300 ring-4 ring-rose-500/20'
              : 'bg-amber-600/90 border-amber-300 ring-4 ring-amber-500/20'
          }`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{labelText}</span>
        </div>
      </Html>
    </group>
  );
}
