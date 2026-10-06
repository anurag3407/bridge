import os
import json
import struct
from collections import defaultdict, deque

def build_enhanced_bridge_glb():
    source_path = 'assets/source/bridge file final glb.glb'
    dest_path = 'apps/web/public/models/bridge.glb'
    dest_path_assets = 'assets/processed/river-gorge-bridge/bridge.glb'

    print(f"Reading source GLB: {source_path}")
    with open(source_path, 'rb') as f:
        magic = f.read(4)
        if magic != b'glTF':
            raise ValueError("Not a valid glTF file")
        v, l = struct.unpack('<II', f.read(8))
        chunk_len, chunk_type = struct.unpack('<II', f.read(8))
        gltf = json.loads(f.read(chunk_len).decode('utf-8'))
        f.seek(12 + 8 + chunk_len)
        bchunk_len, bchunk_type = struct.unpack('<II', f.read(8))
        raw_bin = bytearray(f.read(bchunk_len))

    # Accessors for Mesh 5
    m5 = gltf['meshes'][5]
    p5 = m5['primitives'][0]
    idx_acc_5 = gltf['accessors'][p5['indices']]
    pos_acc_idx = p5['attributes']['POSITION']
    norm_acc_idx = p5['attributes']['NORMAL']
    uv_acc_idx = p5['attributes']['TEXCOORD_0']

    idx_bv_5 = gltf['bufferViews'][idx_acc_5['bufferView']]
    pos_bv_5 = gltf['bufferViews'][gltf['accessors'][pos_acc_idx]['bufferView']]

    idx_offset_5 = idx_bv_5.get('byteOffset', 0) + idx_acc_5.get('byteOffset', 0)
    pos_offset_5 = pos_bv_5.get('byteOffset', 0) + gltf['accessors'][pos_acc_idx].get('byteOffset', 0)

    # Read vertices of Mesh 5
    pos_count = gltf['accessors'][pos_acc_idx]['count']
    vertices = []
    for i in range(pos_count):
        off = pos_offset_5 + i * 12
        x, y, z = struct.unpack('<fff', raw_bin[off:off+12])
        vertices.append((x * 0.3048, y * 0.3048, z * 0.3048))

    # Read triangles of Mesh 5
    tri_count = idx_acc_5['count'] // 3
    triangles = []
    v_to_tri = defaultdict(list)
    for i in range(tri_count):
        off = idx_offset_5 + i * 6
        i0, i1, i2 = struct.unpack('<HHH', raw_bin[off:off+6])
        triangles.append((i0, i1, i2))
        v_to_tri[i0].append(i)
        v_to_tri[i1].append(i)
        v_to_tri[i2].append(i)

    # Connected components
    visited = [False] * len(triangles)
    components = []
    for t_idx in range(len(triangles)):
        if visited[t_idx]:
            continue
        comp_tris = []
        q = deque([t_idx])
        visited[t_idx] = True
        while q:
            curr = q.popleft()
            comp_tris.append(curr)
            for v in triangles[curr]:
                for neighbor_t in v_to_tri[v]:
                    if not visited[neighbor_t]:
                        visited[neighbor_t] = True
                        q.append(neighbor_t)
        components.append(comp_tris)

    cat_order = [
        'Bridge_Road_Deck',
        'Bridge_Towers',
        'Bridge_Piers_Substructure',
        'Bridge_Steel_Trusses',
        'Bridge_Steel_Girders',
        'Bridge_Guardrails',
        'Bridge_Deck_Walkways'
    ]

    cat_triangles = {k: [] for k in cat_order}
    for c_idx, c in enumerate(components):
        c_v_indices = set()
        for t in c:
            c_v_indices.update(triangles[t])
        c_xs = [vertices[vi][0] for vi in c_v_indices]
        c_ys = [vertices[vi][1] for vi in c_v_indices]
        c_zs = [vertices[vi][2] for vi in c_v_indices]

        min_x, max_x = min(c_xs), max(c_xs)
        min_y, max_y = min(c_ys), max(c_ys)
        min_z, max_z = min(c_zs), max(c_zs)
        z_span = max_z - min_z
        x_span = max_x - min_x

        if len(c) > 5000:
            cat = 'Bridge_Towers'
        elif max_y <= 2.5:
            cat = 'Bridge_Piers_Substructure'
        elif min_y >= 7.8 and max_y <= 8.35 and x_span > 4.0:
            cat = 'Bridge_Road_Deck'
        elif min_y >= 7.8 and (max_x < -3.5 or min_x > 3.2):
            cat = 'Bridge_Guardrails'
        elif z_span > 8.0 and min_y >= 5.5 and max_y <= 8.2:
            cat = 'Bridge_Steel_Girders'
        elif max_y <= 8.0:
            cat = 'Bridge_Steel_Trusses'
        else:
            cat = 'Bridge_Deck_Walkways'

        for t in c:
            cat_triangles[cat].append(triangles[t])

    # Now define materials
    materials = [
        # 0: Bridge Road Deck (Dark highway asphalt)
        {
            "name": "Mat_Bridge_Road_Deck",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.15, 0.16, 0.18, 1.0],
                "metallicFactor": 0.08,
                "roughnessFactor": 0.85
            }
        },
        # 1: Bridge Towers (Monumental stone/concrete white-grey)
        {
            "name": "Mat_Bridge_Towers",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.82, 0.84, 0.87, 1.0],
                "metallicFactor": 0.05,
                "roughnessFactor": 0.62
            }
        },
        # 2: Bridge Piers Substructure (Marine weathered concrete)
        {
            "name": "Mat_Bridge_Piers_Substructure",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.42, 0.46, 0.52, 1.0],
                "metallicFactor": 0.08,
                "roughnessFactor": 0.80
            }
        },
        # 3: Bridge Steel Trusses (Deep charcoal structural steel)
        {
            "name": "Mat_Bridge_Steel_Trusses",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.22, 0.26, 0.32, 1.0],
                "metallicFactor": 0.82,
                "roughnessFactor": 0.35
            }
        },
        # 4: Bridge Steel Girders (Dark anthracite steel)
        {
            "name": "Mat_Bridge_Steel_Girders",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.16, 0.19, 0.24, 1.0],
                "metallicFactor": 0.85,
                "roughnessFactor": 0.30
            }
        },
        # 5: Bridge Guardrails (Galvanized zinc steel)
        {
            "name": "Mat_Bridge_Guardrails",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.70, 0.75, 0.80, 1.0],
                "metallicFactor": 0.80,
                "roughnessFactor": 0.28
            }
        },
        # 6: Bridge Deck Walkways (Paved pedestrian curbs)
        {
            "name": "Mat_Bridge_Deck_Walkways",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.65, 0.68, 0.72, 1.0],
                "metallicFactor": 0.05,
                "roughnessFactor": 0.75
            }
        },
        # 7: Car Paint Body (Vibrant glossy red)
        {
            "name": "Mat_Car_Paint_Body",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.88, 0.12, 0.15, 1.0],
                "metallicFactor": 0.40,
                "roughnessFactor": 0.15
            }
        },
        # 8: Car Glass Windows (Dark tinted automotive glass)
        {
            "name": "Mat_Car_Glass_Windows",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.08, 0.11, 0.16, 0.90],
                "metallicFactor": 0.90,
                "roughnessFactor": 0.05
            }
        },
        # 9: Car Wheels Rims (Brushed alloy chrome)
        {
            "name": "Mat_Car_Wheels_Rims",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.88, 0.90, 0.94, 1.0],
                "metallicFactor": 0.92,
                "roughnessFactor": 0.18
            }
        },
        # 10: Car Chassis Tires (Matte black rubber)
        {
            "name": "Mat_Car_Chassis_Tires",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.10, 0.10, 0.11, 1.0],
                "metallicFactor": 0.05,
                "roughnessFactor": 0.88
            }
        },
        # 11: Car Mirrors Trim (Dark gloss trim)
        {
            "name": "Mat_Car_Mirrors_Trim",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.18, 0.04, 0.05, 1.0],
                "metallicFactor": 0.30,
                "roughnessFactor": 0.30
            }
        }
    ]
    gltf['materials'] = materials

    # Assign materials to car meshes 0..4
    # Mesh 0: Chassis/Tires -> Mat 10
    gltf['meshes'][0]['name'] = 'Car_Chassis_Tires'
    gltf['meshes'][0]['primitives'][0]['material'] = 10

    # Mesh 1: Body Paint -> Mat 7
    gltf['meshes'][1]['name'] = 'Car_Paint_Body'
    gltf['meshes'][1]['primitives'][0]['material'] = 7

    # Mesh 2: Glass Windows -> Mat 8
    gltf['meshes'][2]['name'] = 'Car_Glass_Windows'
    gltf['meshes'][2]['primitives'][0]['material'] = 8

    # Mesh 3: Mirrors Trim -> Mat 11
    gltf['meshes'][3]['name'] = 'Car_Mirrors_Trim'
    gltf['meshes'][3]['primitives'][0]['material'] = 11

    # Mesh 4: Wheels Rims -> Mat 9
    gltf['meshes'][4]['name'] = 'Car_Wheels_Rims'
    gltf['meshes'][4]['primitives'][0]['material'] = 9

    # Truncate old Mesh 5 indices from raw_bin to avoid duplication,
    # or keep existing bufferViews 0..22 and append new index bufferViews for each category.
    # Buffer views 0..22 occupy up to idx_bv_5's offset.
    # Let's check idx_bv_5:
    mesh5_idx_bv_idx = idx_acc_5['bufferView']
    # Let's remove mesh 5 from gltf['meshes'], and append the 7 new bridge meshes
    gltf['meshes'] = gltf['meshes'][:5]

    # Clean bufferViews and bin_data:
    # We can keep raw_bin up to the start of mesh 5's index buffer, or keep all and append.
    # Appending is safest and guarantees no existing offset is broken!
    out_bin = raw_bin

    # For each category, pack indices and append to out_bin
    new_mesh_nodes = []
    for cat_idx, cat in enumerate(cat_order):
        mat_idx = cat_idx # 0 to 6
        cat_tris = cat_triangles[cat]
        cat_indices_bytes = bytearray()
        min_idx = 65535
        max_idx = 0
        for tri in cat_tris:
            cat_indices_bytes.extend(struct.pack('<HHH', tri[0], tri[1], tri[2]))
            min_idx = min(min_idx, tri[0], tri[1], tri[2])
            max_idx = max(max_idx, tri[0], tri[1], tri[2])

        # Align out_bin to 4 bytes
        while len(out_bin) % 4 != 0:
            out_bin.append(0)

        bv_offset = len(out_bin)
        out_bin.extend(cat_indices_bytes)

        bv_idx = len(gltf['bufferViews'])
        gltf['bufferViews'].append({
            "buffer": 0,
            "byteOffset": bv_offset,
            "byteLength": len(cat_indices_bytes),
            "target": 34963 # ELEMENT_ARRAY_BUFFER
        })

        acc_idx = len(gltf['accessors'])
        gltf['accessors'].append({
            "bufferView": bv_idx,
            "byteOffset": 0,
            "componentType": 5123, # UNSIGNED_SHORT
            "count": len(cat_tris) * 3,
            "type": "SCALAR",
            "min": [min_idx if cat_tris else 0],
            "max": [max_idx if cat_tris else 0]
        })

        new_mesh_idx = len(gltf['meshes'])
        gltf['meshes'].append({
            "name": cat,
            "primitives": [{
                "attributes": {
                    "POSITION": pos_acc_idx,
                    "NORMAL": norm_acc_idx,
                    "TEXCOORD_0": uv_acc_idx
                },
                "indices": acc_idx,
                "material": mat_idx
            }]
        })

        node_idx = len(gltf['nodes'])
        gltf['nodes'].append({
            "name": cat,
            "mesh": new_mesh_idx
        })
        new_mesh_nodes.append(node_idx)

    # Update Node 40: Bridge_Structure parent node
    gltf['nodes'][40] = {
        "name": "Bridge_Structure",
        "children": new_mesh_nodes,
        "scale": [0.3048, 0.3048, 0.3048]
    }

    # Update buffer 0 byteLength
    while len(out_bin) % 4 != 0:
        out_bin.append(0)
    gltf['buffers'][0]['byteLength'] = len(out_bin)

    # Encode JSON chunk
    json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_length = 12 + 8 + len(json_bytes) + 8 + len(out_bin)

    header = struct.pack('<III', 0x46546C67, 2, total_length)
    json_header = struct.pack('<II', len(json_bytes), 0x4E4F534A)
    bin_header = struct.pack('<II', len(out_bin), 0x004E4942)

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with open(dest_path, 'wb') as f:
        f.write(header)
        f.write(json_header)
        f.write(json_bytes)
        f.write(bin_header)
        f.write(out_bin)

    os.makedirs(os.path.dirname(dest_path_assets), exist_ok=True)
    with open(dest_path_assets, 'wb') as f:
        f.write(header)
        f.write(json_header)
        f.write(json_bytes)
        f.write(bin_header)
        f.write(out_bin)

    print(f"Successfully generated enhanced GLB at:\n  {dest_path} ({len(out_bin)} bytes bin)\n  {dest_path_assets}")

if __name__ == '__main__':
    build_enhanced_bridge_glb()
