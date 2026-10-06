'use client';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Model } from './Model';
import { WarningMarker } from './WarningMarker';
import { ViewerConfig, BridgeConditionType } from '@bridge/contracts';
import { RotateCcw, Maximize2, AlertCircle, Loader2 } from 'lucide-react';

interface ViewerProps {
  modelUrl: string;
  condition: BridgeConditionType;
  viewerConfig: ViewerConfig;
  className?: string;
}

export function Viewer({ modelUrl, condition, viewerConfig, className = '' }: ViewerProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic camera framing tailored to the bridge model
  const isLegacyConfig =
    !viewerConfig?.camera?.defaultPosition ||
    viewerConfig.camera.defaultPosition[0] > 90 ||
    viewerConfig.camera.target[2] < -20;

  const defaultBridgeCam: [number, number, number] = [48, 28, 65];
  const defaultBridgeTarget: [number, number, number] = [0, 5, 11];
  const defaultBridgeWarning: [number, number, number] = [0.0, 9.2, 18.0];

  const cameraPos = isLegacyConfig ? defaultBridgeCam : viewerConfig.camera.defaultPosition;
  const cameraTarget = isLegacyConfig ? defaultBridgeTarget : viewerConfig.camera.target;
  const warningAnchor = isLegacyConfig ? defaultBridgeWarning : viewerConfig.warningAnchor;

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
      }
    } catch {
      setHasWebGL(false);
    }
  }, []);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!hasWebGL) {
    return (
      <div className={`relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col items-center justify-center p-8 text-center min-h-[450px] ${className}`}>
        <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
        <h3 className="text-lg font-semibold text-slate-200">WebGL Acceleration Unavailable</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          Your browser or device does not currently have WebGL enabled. The 3D model cannot be rendered, but road condition reports and operational notices remain active above.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[520px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl select-none ${className}`}
      role="region"
      aria-label="Interactive 3D Bridge Model Inspector"
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [cameraPos[0], cameraPos[1], cameraPos[2]],
          fov: 45,
          near: 0.5,
          far: 2000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        shadows
      >
        <color attach="background" args={['#080f1d']} />
        <fog attach="fog" args={['#080f1d', 90, 420]} />

        {/* Environmental IBL Reflections */}
        <Environment preset="city" />

        {/* Realistic Natural Sun & Sky Lighting */}
        <ambientLight intensity={0.45} color="#e0f2fe" />
        <directionalLight
          position={[70, 110, 50]}
          intensity={2.2}
          color="#fffbeb"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-75}
          shadow-camera-right={75}
          shadow-camera-top={75}
          shadow-camera-bottom={-75}
          shadow-camera-near={10}
          shadow-camera-far={260}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-60, 45, -50]} intensity={0.7} color="#7dd3fc" />
        <hemisphereLight intensity={0.45} color="#e2e8f0" groundColor="#081829" />

        {/* River Water Surface Under Bridge */}
        <mesh position={[0, -11.6, 11]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[800, 800]} />
          <meshStandardMaterial
            color="#091b2c"
            roughness={0.12}
            metalness={0.88}
            envMapIntensity={1.5}
          />
        </mesh>

        <Suspense fallback={null}>
          <Model
            url={modelUrl}
            condition={condition}
            selectedRoadNodes={viewerConfig.selectedRoadNodePaths}
          />
          <WarningMarker
            position={[warningAnchor[0], warningAnchor[1], warningAnchor[2]]}
            condition={condition}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          target={[cameraTarget[0], cameraTarget[1], cameraTarget[2]]}
          minDistance={viewerConfig?.camera?.minDistance || 5}
          maxDistance={viewerConfig?.camera?.maxDistance || 400}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.02} // Stop camera at water horizon
        />
      </Canvas>

      {/* Floating View Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
        <button
          onClick={handleResetCamera}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur text-xs font-medium shadow-md transition"
          title="Reset Camera View"
          aria-label="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset View</span>
        </button>

        <button
          onClick={handleToggleFullscreen}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur shadow-md transition"
          title="Toggle Fullscreen"
          aria-label="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Touch/Mouse Help Legend */}
      <div className="absolute bottom-3 left-4 text-[11px] text-slate-400 bg-slate-900/70 border border-slate-800 backdrop-blur px-2.5 py-1 rounded-md pointer-events-none hidden sm:block">
        Left-click + drag to rotate • Right-click to pan • Scroll to zoom
      </div>
    </div>
  );
}
