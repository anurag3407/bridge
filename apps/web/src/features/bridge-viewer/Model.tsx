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

    // 1. Road deck condition materials
    const roadColor =
      condition === 'DANGER'
        ? new THREE.Color('#ef4444')
        : condition === 'BROKEN'
        ? new THREE.Color('#f59e0b')
        : condition === 'NORMAL'
        ? new THREE.Color('#1e2229') // Authentic dark highway tarmac
        : new THREE.Color('#334155');

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: roadColor,
      roughness: condition === 'NORMAL' || condition === 'UNKNOWN' ? 0.84 : 0.45,
      metalness: condition === 'NORMAL' || condition === 'UNKNOWN' ? 0.12 : 0.25,
      emissive:
        condition === 'DANGER'
          ? new THREE.Color('#991b1b')
          : condition === 'BROKEN'
          ? new THREE.Color('#b45309')
          : new THREE.Color('#000000'),
      emissiveIntensity: condition === 'DANGER' ? 0.55 : condition === 'BROKEN' ? 0.4 : 0,
      envMapIntensity: 0.8,
    });

    // 2. Architectural Monumental Bridge Towers (Light architectural concrete/granite)
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d4dae2'),
      roughness: 0.62,
      metalness: 0.06,
      envMapIntensity: 0.9,
    });

    // 3. Marine Substructure / Pier Piles (Submerged weathered basalt concrete)
    const substructureMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#5c6773'),
      roughness: 0.82,
      metalness: 0.08,
      envMapIntensity: 0.5,
    });

    // 4. Industrial Structural Steel Trusses & Bracing
    const trussMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2c3542'),
      roughness: 0.35,
      metalness: 0.85,
      envMapIntensity: 1.3,
    });

    // 5. Longitudinal Structural Girders (Anthracite I-beams)
    const girderMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e2633'),
      roughness: 0.28,
      metalness: 0.88,
      envMapIntensity: 1.4,
    });

    // 6. Galvanized Safety Guardrails & Parapets
    const guardrailMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#94a3b8'),
      roughness: 0.25,
      metalness: 0.82,
      envMapIntensity: 1.5,
    });

    // 7. Paved Walkways, Curbs & Sidewalks
    const walkwayMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#88929e'),
      roughness: 0.75,
      metalness: 0.05,
      envMapIntensity: 0.7,
    });

    // 8. Vehicle Materials (High-gloss automotive clearcoat red paint)
    const carPaintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#dc2626'),
      roughness: 0.15,
      metalness: 0.40,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95,
      envMapIntensity: 1.6,
    });

    // 9. Automotive Tinted Glass / Windows
    const carGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.05,
      metalness: 0.90,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 2.0,
    });

    // 10. Machined Chrome/Alloy Wheels & Rims
    const carWheelsMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8fafc'),
      roughness: 0.16,
      metalness: 0.92,
      envMapIntensity: 1.8,
    });

    // 11. Matte Vulcanized Rubber Tires & Undercarriage
    const carTiresMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#18181b'),
      roughness: 0.92,
      metalness: 0.05,
    });

    // 12. Dark Automotive Mirror & Door Trim
    const carTrimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#220507'),
      roughness: 0.30,
      metalness: 0.30,
    });

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const nameLower = mesh.name.toLowerCase();

        // Check road deck
        const isRoad =
          nameLower.includes('road') ||
          (selectedRoadNodes && selectedRoadNodes.some((n) => mesh.name.includes(n)));

        if (isRoad) {
          mesh.material = roadMaterial;
        } else if (nameLower.includes('tower')) {
          mesh.material = towerMaterial;
        } else if (nameLower.includes('pier') || nameLower.includes('substructure') || nameLower.includes('pile')) {
          mesh.material = substructureMaterial;
        } else if (nameLower.includes('girder')) {
          mesh.material = girderMaterial;
        } else if (nameLower.includes('truss') || nameLower.includes('framing')) {
          mesh.material = trussMaterial;
        } else if (nameLower.includes('guardrail') || nameLower.includes('barrier')) {
          mesh.material = guardrailMaterial;
        } else if (nameLower.includes('walkway') || nameLower.includes('curb') || nameLower.includes('deck_element')) {
          mesh.material = walkwayMaterial;
        } else if (nameLower.includes('car_paint') || nameLower.includes('562479')) {
          mesh.material = carPaintMaterial;
        } else if (nameLower.includes('car_glass') || nameLower.includes('562497')) {
          mesh.material = carGlassMaterial;
        } else if (nameLower.includes('car_wheel') || nameLower.includes('562512')) {
          mesh.material = carWheelsMaterial;
        } else if (nameLower.includes('car_chassis') || nameLower.includes('car_tire') || nameLower.includes('562468')) {
          mesh.material = carTiresMaterial;
        } else if (nameLower.includes('car_mirror') || nameLower.includes('car_trim') || nameLower.includes('562501')) {
          mesh.material = carTrimMaterial;
        } else if (nameLower.includes('car')) {
          mesh.material = carPaintMaterial;
        } else if (!mesh.material || (Array.isArray(mesh.material) && mesh.material.length === 0)) {
          mesh.material = towerMaterial;
        }
      }
    });

    return clone;
  }, [scene, condition, selectedRoadNodes]);

  return <primitive object={clonedScene} />;
}
