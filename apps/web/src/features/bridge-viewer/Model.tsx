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

    // 8. Natural River Gorge Earth & Terrain
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#38332d'),
      roughness: 0.88,
      metalness: 0.05,
      envMapIntensity: 0.4,
    });

    // 9. Road Deck Curbs & Barrier Edges
    const curbMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#cbd5e1'),
      roughness: 0.68,
      metalness: 0.05,
      envMapIntensity: 0.7,
    });

    // 10. Neoprene Bearing Pads / Expansion Joints
    const neopreneMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#141416'),
      roughness: 0.90,
      metalness: 0.05,
    });

    // 11. Vehicle Materials (High-gloss automotive clearcoat red paint)
    const carPaintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#dc2626'),
      roughness: 0.15,
      metalness: 0.40,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95,
      envMapIntensity: 1.6,
    });

    // 12. Automotive Tinted Glass / Windows
    const carGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.05,
      metalness: 0.90,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 2.0,
    });

    // 13. Machined Chrome/Alloy Wheels & Rims
    const carWheelsMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8fafc'),
      roughness: 0.16,
      metalness: 0.92,
      envMapIntensity: 1.8,
    });

    // 14. Matte Vulcanized Rubber Tires & Undercarriage
    const carTiresMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#18181b'),
      roughness: 0.92,
      metalness: 0.05,
    });

    // 15. Dark Automotive Mirror & Door Trim
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
        const matName = (((mesh.material as THREE.Material)?.name) || '').toLowerCase();
        const check = (pattern: string) => nameLower.includes(pattern) || matName.includes(pattern);

        // Check road deck (carriageway asphalt)
        const isRoad =
          check('road') ||
          check('screed') ||
          (selectedRoadNodes && selectedRoadNodes.some((n) => mesh.name.includes(n)));

        if (isRoad) {
          mesh.material = roadMaterial;
        } else if (check('earth') || check('ground') || check('terrain')) {
          mesh.material = terrainMaterial;
        } else if (check('curb') || check('c10') || check('walkway') || check('deck_element')) {
          mesh.material = curbMaterial;
        } else if (check('neopren') || check('bearing')) {
          mesh.material = neopreneMaterial;
        } else if (check('tower') || (check('concrete') && check('cast-in-place concrete'))) {
          mesh.material = towerMaterial;
        } else if (check('pier') || check('substructure') || check('pile') || check('gray') || check('pcc')) {
          mesh.material = substructureMaterial;
        } else if (check('girder')) {
          mesh.material = girderMaterial;
        } else if (check('truss') || check('framing') || check('structural columns') || check('column')) {
          mesh.material = trussMaterial;
        } else if (check('guardrail') || check('barrier')) {
          mesh.material = guardrailMaterial;
        } else if (check('car_paint') || check('562479') || check('clio 12') || check('clio 11') || check('clio 10')) {
          mesh.material = carPaintMaterial;
        } else if (check('car_glass') || check('562497') || check('clio 4')) {
          mesh.material = carGlassMaterial;
        } else if (check('car_wheel') || check('562512') || check('clio 8') || check('clio 6')) {
          mesh.material = carWheelsMaterial;
        } else if (check('car_chassis') || check('car_tire') || check('562468') || check('clio 9')) {
          mesh.material = carTiresMaterial;
        } else if (check('car_mirror') || check('car_trim') || check('562501') || check('clio 1') || check('clio 2') || check('clio 3') || check('clio 5') || check('clio 7')) {
          mesh.material = carTrimMaterial;
        } else if (check('car')) {
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
