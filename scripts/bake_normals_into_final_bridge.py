import os
import json
import struct
import math

def bake_normals_and_pbr():
    src_path = '/Users/jarvis/Downloads/final_bridge.glb'
    print(f"Reading source GLB: {src_path}")

    with open(src_path, 'rb') as f:
        magic = f.read(4)
        if magic != b'glTF':
            raise ValueError("Not a valid glTF file")
        v, l = struct.unpack('<II', f.read(8))
        chunk_len, chunk_type = struct.unpack('<II', f.read(8))
        gltf = json.loads(f.read(chunk_len).decode('utf-8'))
        f.seek(12 + 8 + chunk_len)
        bchunk_len, bchunk_type = struct.unpack('<II', f.read(8))
        bin_data = bytearray(f.read(bchunk_len))

    # PBR Material specifications for actual bridge & vehicles
    material_configs = {
        # Bridge Materials
        "Neopren pad": {
            "baseColorFactor": [0.12, 0.12, 0.13, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.88,
        },
        "Structural Columns material#7F7F7FFF": {
            "baseColorFactor": [0.26, 0.32, 0.40, 1.0],
            "metallicFactor": 0.80,
            "roughnessFactor": 0.35,
        },
        "Concrete, Cast-in-Place - C10": {
            "baseColorFactor": [0.85, 0.88, 0.92, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.60,
        },
        "Earth for Ground": {
            "baseColorFactor": [0.35, 0.30, 0.25, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.88,
        },
        "PCC new": {
            "baseColorFactor": [0.55, 0.58, 0.62, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.80,
        },
        "Concrete - Cast-in-Place Concrete": {
            "baseColorFactor": [0.82, 0.85, 0.88, 1.0],
            "metallicFactor": 0.06,
            "roughnessFactor": 0.58,
        },
        "Concrete, Sand/Cement Screed": {
            "baseColorFactor": [0.20, 0.22, 0.25, 1.0],
            "metallicFactor": 0.12,
            "roughnessFactor": 0.78,
        },
        "Concrete, Cast-in-Place gray": {
            "baseColorFactor": [0.48, 0.52, 0.58, 1.0],
            "metallicFactor": 0.08,
            "roughnessFactor": 0.75,
        },
        "Concrete, Cast-in-Place gray(1) for column": {
            "baseColorFactor": [0.70, 0.74, 0.78, 1.0],
            "metallicFactor": 0.06,
            "roughnessFactor": 0.62,
        },
        "Concrete, Cast-in-Place - C20": {
            "baseColorFactor": [0.65, 0.68, 0.72, 1.0],
            "metallicFactor": 0.06,
            "roughnessFactor": 0.70,
        },
        # Vehicle Materials (Renault Clio)
        "Renault Clio 12": {
            "baseColorFactor": [0.85, 0.10, 0.12, 1.0],
            "metallicFactor": 0.40,
            "roughnessFactor": 0.15,
        },
        "Renault Clio 11": {
            "baseColorFactor": [0.85, 0.10, 0.12, 1.0],
            "metallicFactor": 0.40,
            "roughnessFactor": 0.15,
        },
        "Renault Clio 10": {
            "baseColorFactor": [0.85, 0.10, 0.12, 1.0],
            "metallicFactor": 0.40,
            "roughnessFactor": 0.15,
        },
        "Renault Clio 3": {
            "baseColorFactor": [0.35, 0.04, 0.06, 1.0],
            "metallicFactor": 0.35,
            "roughnessFactor": 0.25,
        },
        "Renault Clio 2": {
            "baseColorFactor": [0.18, 0.20, 0.24, 1.0],
            "metallicFactor": 0.30,
            "roughnessFactor": 0.40,
        },
        "Renault Clio 8": {
            "baseColorFactor": [0.90, 0.92, 0.96, 1.0],
            "metallicFactor": 0.92,
            "roughnessFactor": 0.15,
        },
        "Renault Clio 9": {
            "baseColorFactor": [0.08, 0.08, 0.09, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.92,
        },
        "Renault Clio 4": {
            "baseColorFactor": [0.06, 0.08, 0.12, 0.88],
            "metallicFactor": 0.90,
            "roughnessFactor": 0.05,
        },
        "Renault Clio 5": {
            "baseColorFactor": [0.35, 0.35, 0.36, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.80,
        },
        "Renault Clio 6": {
            "baseColorFactor": [0.85, 0.88, 0.92, 1.0],
            "metallicFactor": 0.92,
            "roughnessFactor": 0.18,
        },
        "Renault Clio 7": {
            "baseColorFactor": [0.95, 0.95, 0.98, 0.90],
            "metallicFactor": 0.85,
            "roughnessFactor": 0.10,
        },
        "Renault Clio 1": {
            "baseColorFactor": [0.04, 0.04, 0.05, 1.0],
            "metallicFactor": 0.10,
            "roughnessFactor": 0.60,
        },
    }

    # Update materials
    for mat in gltf.get('materials', []):
        mat_name = mat.get('name', '')
        if mat_name in material_configs:
            cfg = material_configs[mat_name]
            pbr = mat.get('pbrMetallicRoughness', {})
            pbr['baseColorFactor'] = cfg['baseColorFactor']
            pbr['metallicFactor'] = cfg['metallicFactor']
            pbr['roughnessFactor'] = cfg['roughnessFactor']
            mat['pbrMetallicRoughness'] = pbr

    # Enhance node names
    if len(gltf.get('nodes', [])) >= 6:
        gltf['nodes'][0]['name'] = 'Bridge_Structure'
        gltf['nodes'][1]['name'] = 'Traffic_Car_1'
        gltf['nodes'][2]['name'] = 'Traffic_Car_2'
        gltf['nodes'][3]['name'] = 'Traffic_Car_3'
        gltf['nodes'][4]['name'] = 'Traffic_Car_4'
        gltf['nodes'][5]['name'] = 'Traffic_Car_5'

    # Compute and bake NORMAL vectors for all primitives that lack them
    computed_count = 0
    for mesh_idx, mesh in enumerate(gltf.get('meshes', [])):
        for prim_idx, prim in enumerate(mesh.get('primitives', [])):
            if 'NORMAL' in prim['attributes']:
                continue

            pos_acc_idx = prim['attributes']['POSITION']
            pos_acc = gltf['accessors'][pos_acc_idx]
            pos_bv = gltf['bufferViews'][pos_acc['bufferView']]
            pos_off = pos_bv.get('byteOffset', 0) + pos_acc.get('byteOffset', 0)
            n_verts = pos_acc['count']

            # Read vertex positions
            verts = []
            for vi in range(n_verts):
                x, y, z = struct.unpack('<fff', bin_data[pos_off + vi*12 : pos_off + vi*12 + 12])
                verts.append((x, y, z))

            # Initialize normals
            normals = [[0.0, 0.0, 0.0] for _ in range(n_verts)]

            # Check if indexed
            if 'indices' in prim:
                idx_acc_idx = prim['indices']
                idx_acc = gltf['accessors'][idx_acc_idx]
                idx_bv = gltf['bufferViews'][idx_acc['bufferView']]
                idx_off = idx_bv.get('byteOffset', 0) + idx_acc.get('byteOffset', 0)
                n_indices = idx_acc['count']
                comp_type = idx_acc['componentType']

                for tri in range(n_indices // 3):
                    if comp_type == 5121:
                        o = idx_off + tri * 3
                        i0, i1, i2 = struct.unpack('<BBB', bin_data[o:o+3])
                    elif comp_type == 5123:
                        o = idx_off + tri * 6
                        i0, i1, i2 = struct.unpack('<HHH', bin_data[o:o+6])
                    elif comp_type == 5125:
                        o = idx_off + tri * 12
                        i0, i1, i2 = struct.unpack('<III', bin_data[o:o+12])
                    else:
                        raise ValueError(f"Unsupported component type: {comp_type}")

                    p0, p1, p2 = verts[i0], verts[i1], verts[i2]
                    ax, ay, az = p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]
                    bx, by, bz = p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]
                    nx = ay*bz - az*by
                    ny = az*bx - ax*bz
                    nz = ax*by - ay*bx
                    for v_idx in (i0, i1, i2):
                        normals[v_idx][0] += nx
                        normals[v_idx][1] += ny
                        normals[v_idx][2] += nz
            else:
                for tri in range(n_verts // 3):
                    i0, i1, i2 = tri * 3, tri * 3 + 1, tri * 3 + 2
                    p0, p1, p2 = verts[i0], verts[i1], verts[i2]
                    ax, ay, az = p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]
                    bx, by, bz = p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]
                    nx = ay*bz - az*by
                    ny = az*bx - ax*bz
                    nz = ax*by - ay*bx
                    for v_idx in (i0, i1, i2):
                        normals[v_idx][0] += nx
                        normals[v_idx][1] += ny
                        normals[v_idx][2] += nz

            # Normalize and pack into bytes
            norm_bytes = bytearray()
            min_norm = [float('inf')]*3
            max_norm = [-float('inf')]*3
            for vi in range(n_verts):
                nx, ny, nz = normals[vi]
                length = math.sqrt(nx*nx + ny*ny + nz*nz)
                if length > 1e-6:
                    unx, uny, unz = nx/length, ny/length, nz/length
                else:
                    unx, uny, unz = 0.0, 1.0, 0.0
                norm_bytes.extend(struct.pack('<fff', unx, uny, unz))
                for dim, val in enumerate((unx, uny, unz)):
                    min_norm[dim] = min(min_norm[dim], val)
                    max_norm[dim] = max(max_norm[dim], val)

            # Pad bin_data to 4 bytes alignment
            while len(bin_data) % 4 != 0:
                bin_data.append(0)

            bv_offset = len(bin_data)
            bin_data.extend(norm_bytes)

            norm_bv_idx = len(gltf['bufferViews'])
            gltf['bufferViews'].append({
                "buffer": 0,
                "byteOffset": bv_offset,
                "byteLength": len(norm_bytes),
                "target": 34962 # ARRAY_BUFFER
            })

            norm_acc_idx = len(gltf['accessors'])
            gltf['accessors'].append({
                "bufferView": norm_bv_idx,
                "byteOffset": 0,
                "componentType": 5126, # FLOAT
                "count": n_verts,
                "type": "VEC3",
                "min": min_norm,
                "max": max_norm
            })

            prim['attributes']['NORMAL'] = norm_acc_idx
            computed_count += 1

    print(f"Computed and baked vertex normals for {computed_count} primitives!")

    # Align bin_data to 4 bytes
    while len(bin_data) % 4 != 0:
        bin_data.append(0)
    gltf['buffers'][0]['byteLength'] = len(bin_data)

    # Encode JSON chunk
    json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_data)

    header = struct.pack('<III', 0x46546C67, 2, total_length)
    json_header = struct.pack('<II', len(json_bytes), 0x4E4F534A)
    bin_header = struct.pack('<II', len(bin_data), 0x004E4942)

    destinations = [
        'apps/web/public/models/bridge.glb',
        'apps/web/public/models/final_bridge.glb',
        'assets/processed/river-gorge-bridge/bridge.glb',
        'assets/source/final_bridge.glb',
        'apps/web/out/models/bridge.glb',
        'apps/web/out/models/final_bridge.glb',
    ]

    for dest in destinations:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
            f.write(header)
            f.write(json_header)
            f.write(json_bytes)
            f.write(bin_header)
            f.write(bin_data)
        print(f"Saved enhanced model with normals to: {dest} ({total_length} bytes)")

if __name__ == '__main__':
    bake_normals_and_pbr()
