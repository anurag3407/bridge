'use client';

import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { BridgeConditionType } from '@bridge/contracts';

interface ModelProps {
  url: string;
  condition: BridgeConditionType;
  selectedRoadNodes?: string[];
}

export function Model({ url, condition, selectedRoadNodes }: ModelProps) {
  const { scene } = useGLTF(url);

  // Clone scene so we don't mutate cached GLTF directly
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    const roadColor =
      condition === 'DANGER'
        ? new THREE.Color('#f43f5e')
        : condition === 'BROKEN'
        ? new THREE.Color('#f59e0b')
        : new THREE.Color('#38bdf8');

    const defaultConcrete = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.7,
      metalness: 0.1,
    });

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: condition === 'NORMAL' || condition === 'UNKNOWN' ? '#475569' : roadColor,
      roughness: 0.6,
      metalness: 0.2,
      emissive: condition === 'DANGER' ? '#881337' : condition === 'BROKEN' ? '#78350f' : '#000000',
      emissiveIntensity: condition === 'DANGER' || condition === 'BROKEN' ? 0.3 : 0,
    });

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Check if this node or mesh is part of the road deck
        const isRoad =
          mesh.name.toLowerCase().includes('road') ||
          (selectedRoadNodes && selectedRoadNodes.some((n) => mesh.name.includes(n)));

        if (isRoad) {
          mesh.material = roadMaterial;
        } else if (!mesh.material || (Array.isArray(mesh.material) && mesh.material.length === 0)) {
          mesh.material = defaultConcrete;
        }
      }
    });

    return clone;
  }, [scene, condition, selectedRoadNodes]);

  return <primitive object={clonedScene} />;
}
