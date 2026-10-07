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
        ? new THREE.Color('#2d333b') // Realistic rich asphalt highway tarmac
        : new THREE.Color('#3b4252');

    const roadMaterial = new THREE.MeshStandardMaterial({
      color: roadColor,
      roughness: condition === 'NORMAL' || condition === 'UNKNOWN' ? 0.78 : 0.40,
      metalness: condition === 'NORMAL' || condition === 'UNKNOWN' ? 0.15 : 0.25,
      emissive:
        condition === 'DANGER'
          ? new THREE.Color('#991b1b')
          : condition === 'BROKEN'
          ? new THREE.Color('#b45309')
          : new THREE.Color('#000000'),
      emissiveIntensity: condition === 'DANGER' ? 0.55 : condition === 'BROKEN' ? 0.4 : 0,
      envMapIntensity: 0.9,
      side: THREE.DoubleSide,
    });

    // 2. Architectural Monumental Bridge Towers (Clean light architectural concrete)
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#dce3eb'),
      roughness: 0.60,
      metalness: 0.08,
      envMapIntensity: 1.0,
      side: THREE.DoubleSide,
    });

    // 3. Marine Substructure / Pier Piles (Weathered foundation concrete)
    const substructureMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#64748b'),
      roughness: 0.75,
      metalness: 0.08,
      envMapIntensity: 0.7,
      side: THREE.DoubleSide,
    });

    // 4. Industrial Structural Steel Trusses & Framing Columns
    const trussMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#384556'),
      roughness: 0.35,
      metalness: 0.82,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    });

    // 5. Longitudinal Structural Girders & Deck Slabs (Medium-dark structural steel/concrete)
    const girderMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2b3544'),
      roughness: 0.32,
      metalness: 0.85,
      envMapIntensity: 1.3,
      side: THREE.DoubleSide,
    });

    // 6. Galvanized Safety Guardrails & Parapets
    const guardrailMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#94a3b8'),
      roughness: 0.22,
      metalness: 0.85,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    });

    // 7. Paved Walkways, Curbs & Sidewalks (C10 light concrete)
    const curbMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#cbd5e1'),
      roughness: 0.65,
      metalness: 0.06,
      envMapIntensity: 0.8,
      side: THREE.DoubleSide,
    });

    // 8. Natural River Gorge Earth & Terrain (Rich geological rock & soil)
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4d3f35'),
      roughness: 0.92,
      metalness: 0.02,
      envMapIntensity: 0.5,
      side: THREE.DoubleSide,
    });

    // 9. Neoprene Bearing Pads / Expansion Joints
    const neopreneMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1f242d'),
      roughness: 0.90,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // 10. Vehicle Body (Vibrant high-gloss automotive clearcoat red paint)
    const carPaintMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ef4444'),
      roughness: 0.12,
      metalness: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      reflectivity: 0.95,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
    });

    // 11. Automotive Tinted Glass / Windows
    const carGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.05,
      metalness: 0.90,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 2.0,
      side: THREE.DoubleSide,
    });

    // 12. Machined Chrome/Alloy Wheels & Headlights
    const carWheelsMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8fafc'),
      roughness: 0.14,
      metalness: 0.95,
      envMapIntensity: 1.9,
      side: THREE.DoubleSide,
    });

    // 13. Matte Vulcanized Rubber Tires & Undercarriage
    const carTiresMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#18181b'),
      roughness: 0.94,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // 14. Dark Automotive Mirror, Tail Lights & Door Trim
    const carTrimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#311014'),
      roughness: 0.35,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          if (!mesh.geometry.attributes.normal) {
            mesh.geometry.computeVertexNormals();
          }
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const nameLower = mesh.name.toLowerCase();
        let matName = '';
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            matName = mesh.material.map((m) => m.name || '').join(' ').toLowerCase();
          } else {
            matName = (mesh.material.name || '').toLowerCase();
          }
        }
        const check = (pattern: string) => nameLower.includes(pattern) || matName.includes(pattern);

        // Check road deck (carriageway asphalt)
        const isRoad =
          check('screed') ||
          check('road') ||
          (selectedRoadNodes && selectedRoadNodes.some((n) => mesh.name.includes(n)));

        if (isRoad) {
          mesh.material = roadMaterial;
        } else if (check('earth') || check('ground') || check('terrain')) {
          mesh.material = terrainMaterial;
        } else if (check('curb') || check('c10') || check('walkway') || check('deck_element')) {
          mesh.material = curbMaterial;
        } else if (check('neopren') || check('bearing')) {
          mesh.material = neopreneMaterial;
        } else if (check('c20') || check('slab') || check('girder')) {
          mesh.material = girderMaterial;
        } else if (check('column') || check('truss') || check('framing')) {
          mesh.material = trussMaterial;
        } else if (check('tower') || check('cast-in-place concrete') || check('concrete')) {
          mesh.material = towerMaterial;
        } else if (check('pier') || check('substructure') || check('pile') || check('gray') || check('pcc')) {
          mesh.material = substructureMaterial;
        } else if (check('guardrail') || check('barrier')) {
          mesh.material = guardrailMaterial;
        } else if (check('clio 12') || check('clio 11') || check('clio 10') || check('car_paint') || check('562479')) {
          mesh.material = carPaintMaterial;
        } else if (check('clio 4') || check('car_glass') || check('562497')) {
          mesh.material = carGlassMaterial;
        } else if (check('clio 8') || check('clio 6') || check('car_wheel') || check('562512')) {
          mesh.material = carWheelsMaterial;
        } else if (check('clio 9') || check('car_chassis') || check('car_tire') || check('562468')) {
          mesh.material = carTiresMaterial;
        } else if (check('clio 1') || check('clio 2') || check('clio 3') || check('clio 5') || check('clio 7') || check('car_trim')) {
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
