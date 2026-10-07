import os
import json
import struct

def process_final_bridge():
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
        raw_bin = bytearray(f.read(bchunk_len))

    # PBR Material specifications for actual bridge & vehicles
    material_configs = {
        # Bridge Materials
        "Neopren pad": {
            "baseColorFactor": [0.12, 0.12, 0.13, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.88,
        },
        "Structural Columns material#7F7F7FFF": {
            "baseColorFactor": [0.24, 0.28, 0.35, 1.0],
            "metallicFactor": 0.82,
            "roughnessFactor": 0.35,
        },
        "Concrete, Cast-in-Place - C10": {
            "baseColorFactor": [0.80, 0.83, 0.87, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.68,
        },
        "Earth for Ground": {
            "baseColorFactor": [0.26, 0.24, 0.22, 1.0],
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
            "roughnessFactor": 0.60,
        },
        "Concrete, Sand/Cement Screed": {
            "baseColorFactor": [0.15, 0.16, 0.18, 1.0],
            "metallicFactor": 0.10,
            "roughnessFactor": 0.84,
        },
        "Concrete, Cast-in-Place gray": {
            "baseColorFactor": [0.45, 0.49, 0.55, 1.0],
            "metallicFactor": 0.08,
            "roughnessFactor": 0.78,
        },
        "Concrete, Cast-in-Place gray(1) for column": {
            "baseColorFactor": [0.68, 0.72, 0.76, 1.0],
            "metallicFactor": 0.06,
            "roughnessFactor": 0.65,
        },
        "Concrete, Cast-in-Place - C20": {
            "baseColorFactor": [0.62, 0.65, 0.70, 1.0],
            "metallicFactor": 0.06,
            "roughnessFactor": 0.72,
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

    # Re-encode GLB
    json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    while len(raw_bin) % 4 != 0:
        raw_bin.append(0)

    total_length = 12 + 8 + len(json_bytes) + 8 + len(raw_bin)

    header = struct.pack('<III', 0x46546C67, 2, total_length)
    json_header = struct.pack('<II', len(json_bytes), 0x4E4F534A)
    bin_header = struct.pack('<II', len(raw_bin), 0x004E4942)

    destinations = [
        'apps/web/public/models/bridge.glb',
        'apps/web/public/models/final_bridge.glb',
        'assets/processed/river-gorge-bridge/bridge.glb',
        'assets/source/final_bridge.glb'
    ]

    for dest in destinations:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
            f.write(header)
            f.write(json_header)
            f.write(json_bytes)
            f.write(bin_header)
            f.write(raw_bin)
        print(f"Wrote enhanced model to: {dest} ({total_length} bytes)")

    # Remove older bridge source files as requested
    old_files_to_remove = [
        'assets/source/bridge.glb',
        'assets/source/bridge file final glb.glb'
    ]
    for old_file in old_files_to_remove:
        if os.path.exists(old_file):
            os.remove(old_file)
            print(f"Removed older bridge source: {old_file}")

if __name__ == '__main__':
    process_final_bridge()
