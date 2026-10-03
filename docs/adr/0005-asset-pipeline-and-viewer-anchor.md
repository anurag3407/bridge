# ADR 0005: Asset Pipeline and 3D Warning Anchor Coordinates

## Status
Accepted

## Context
The reference model `/Users/jarvis/Downloads/bridge.glb` contains BIM-style naming, 41 nodes, 36 meshes, and heterogeneous coordinate transforms. The warning marker must accurately sit on the physical road surface rather than arbitrary mesh origins.

## Decision
- The road deck was identified by inspecting geometry bounds:
  - Node 24 ("Roads 1 Roads 1 [344015]"): Elevation Y ≈ 16.8, X ≈ 8.54, Z ≈ 63.09.
- The warning anchor coordinate is set to `[8.54, 17.5, 63.09]` in model-local coordinates, placing the floating beacon slightly above the bridge carriageway.
- When `BROKEN` or `DANGER` is reported, a pulsing 3D marker and Html badge appear directly at this road position.
- Viewer bounds and camera controls are dynamically computed from the asset's bounding box `[262.47, 188.68, 725.07]`.
