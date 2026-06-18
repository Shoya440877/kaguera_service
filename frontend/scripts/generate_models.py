"""
家具モデル(.glb / .usdz) を生成する。
- .glb : trimesh で生成 (Android Scene Viewer / model-viewer 表示用)
- .usdz: pxr (USD) で生成 (iOS Quick Look 用)
"""
import os
import sys
import trimesh
import numpy as np
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, UsdUtils

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "models")
os.makedirs(OUT, exist_ok=True)

# ---- 家具パーツ定義 ----
# kind: "box" | "cyl"
# emissive: True なら発光マテリアル
WOOD = (0.55, 0.40, 0.28)
WOOD_LIGHT = (0.71, 0.54, 0.38)
METAL = (0.20, 0.20, 0.22)
LAMP_LIGHT = (1.00, 0.88, 0.55)


def parts_chair():
    p = []
    p.append({"kind": "box", "size": (0.45, 0.05, 0.45), "pos": (0, 0.45, 0), "color": WOOD})
    p.append({"kind": "box", "size": (0.45, 0.35, 0.05), "pos": (0, 0.65, -0.20), "color": WOOD})
    for x, z in [(0.18, 0.18), (-0.18, 0.18), (0.18, -0.18), (-0.18, -0.18)]:
        p.append({"kind": "box", "size": (0.05, 0.45, 0.05), "pos": (x, 0.225, z), "color": WOOD})
    return p


def parts_desk():
    p = []
    p.append({"kind": "box", "size": (0.90, 0.04, 0.60), "pos": (0, 0.72, 0), "color": WOOD_LIGHT})
    for x, z in [(0.40, 0.25), (-0.40, 0.25), (0.40, -0.25), (-0.40, -0.25)]:
        p.append({"kind": "box", "size": (0.05, 0.72, 0.05), "pos": (x, 0.36, z), "color": WOOD_LIGHT})
    return p


def parts_lamp():
    p = []
    p.append({"kind": "cyl", "radius": 0.18, "height": 0.04, "pos": (0, 0.02, 0), "color": METAL})
    p.append({"kind": "cyl", "radius": 0.02, "height": 1.00, "pos": (0, 0.54, 0), "color": METAL})
    p.append({"kind": "cyl", "radius": 0.18, "height": 0.25, "pos": (0, 1.17, 0),
              "color": LAMP_LIGHT, "emissive": True})
    return p


# ===========================================================================
# .glb 生成 (trimesh)
# ===========================================================================
def build_trimesh_part(part):
    if part["kind"] == "box":
        m = trimesh.creation.box(extents=part["size"])
    elif part["kind"] == "cyl":
        m = trimesh.creation.cylinder(radius=part["radius"], height=part["height"], sections=32)
    else:
        raise ValueError(part["kind"])
    m.apply_translation(part["pos"])
    color = part["color"]
    rgba = np.array([int(color[0] * 255), int(color[1] * 255), int(color[2] * 255), 255], dtype=np.uint8)
    m.visual.face_colors = np.tile(rgba, (len(m.faces), 1))
    return m


def export_glb(name, parts):
    scene = trimesh.Scene()
    for i, part in enumerate(parts):
        mesh = build_trimesh_part(part)
        # PBRマテリアルを設定 (emissiveのため)
        color = part["color"]
        baseColorFactor = [color[0], color[1], color[2], 1.0]
        emissiveFactor = [color[0], color[1], color[2]] if part.get("emissive") else [0.0, 0.0, 0.0]
        mat = trimesh.visual.material.PBRMaterial(
            name=f"{name}_mat_{i}",
            baseColorFactor=baseColorFactor,
            emissiveFactor=emissiveFactor,
            roughnessFactor=0.6,
            metallicFactor=0.1,
        )
        mesh.visual = trimesh.visual.TextureVisuals(material=mat)
        scene.add_geometry(mesh, node_name=f"part_{i}")
    out = os.path.join(OUT, f"{name}.glb")
    scene.export(out)
    print(f"  glb : {out} ({os.path.getsize(out)} bytes)")


# ===========================================================================
# .usdz 生成 (pxr)
# ===========================================================================
def make_emissive_material(stage, mat_path, color):
    material = UsdShade.Material.Define(stage, mat_path)
    shader = UsdShade.Shader.Define(stage, mat_path + "/Shader")
    shader.CreateIdAttr("UsdPreviewSurface")
    shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(color))
    shader.CreateInput("emissiveColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(color))
    shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.4)
    shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
    material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
    return material


def make_diffuse_material(stage, mat_path, color):
    material = UsdShade.Material.Define(stage, mat_path)
    shader = UsdShade.Shader.Define(stage, mat_path + "/Shader")
    shader.CreateIdAttr("UsdPreviewSurface")
    shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(color))
    shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.6)
    shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.1)
    material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
    return material


def add_box_mesh(stage, prim_path, pos, size, material):
    mesh = UsdGeom.Mesh.Define(stage, prim_path)
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    px, py, pz = pos
    pts = [
        (px - sx, py - sy, pz - sz),
        (px + sx, py - sy, pz - sz),
        (px + sx, py + sy, pz - sz),
        (px - sx, py + sy, pz - sz),
        (px - sx, py - sy, pz + sz),
        (px + sx, py - sy, pz + sz),
        (px + sx, py + sy, pz + sz),
        (px - sx, py + sy, pz + sz),
    ]
    mesh.GetPointsAttr().Set([Gf.Vec3f(p) for p in pts])
    mesh.GetFaceVertexCountsAttr().Set([4] * 6)
    mesh.GetFaceVertexIndicesAttr().Set([
        0, 1, 2, 3,
        4, 7, 6, 5,
        0, 4, 5, 1,
        3, 2, 6, 7,
        0, 3, 7, 4,
        1, 5, 6, 2,
    ])
    mesh.CreateSubdivisionSchemeAttr().Set("none")
    UsdShade.MaterialBindingAPI(mesh).Bind(material)


def add_cylinder(stage, prim_path, pos, radius, height, material):
    cyl = UsdGeom.Cylinder.Define(stage, prim_path)
    cyl.CreateRadiusAttr(radius)
    cyl.CreateHeightAttr(height)
    cyl.CreateAxisAttr("Y")
    cyl.CreateExtentAttr([(-radius, -height / 2, -radius), (radius, height / 2, radius)])
    UsdGeom.Xformable(cyl).AddTranslateOp().Set(Gf.Vec3d(pos))
    UsdShade.MaterialBindingAPI(cyl).Bind(material)


def export_usdz(name, parts):
    usda_path = os.path.join(OUT, f"{name}.usda")
    stage = Usd.Stage.CreateNew(usda_path)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    root = UsdGeom.Xform.Define(stage, "/Root")
    stage.SetDefaultPrim(root.GetPrim())

    for i, part in enumerate(parts):
        prim_path = f"/Root/part_{i}"
        mat_path = f"/Root/mat_{i}"
        if part.get("emissive"):
            mat = make_emissive_material(stage, mat_path, part["color"])
        else:
            mat = make_diffuse_material(stage, mat_path, part["color"])
        if part["kind"] == "box":
            add_box_mesh(stage, prim_path, part["pos"], part["size"], mat)
        elif part["kind"] == "cyl":
            add_cylinder(stage, prim_path, part["pos"], part["radius"], part["height"], mat)

    stage.GetRootLayer().Save()
    usdz_path = os.path.join(OUT, f"{name}.usdz")
    if os.path.exists(usdz_path):
        os.remove(usdz_path)
    UsdUtils.CreateNewUsdzPackage(usda_path, usdz_path)
    os.remove(usda_path)
    print(f"  usdz: {usdz_path} ({os.path.getsize(usdz_path)} bytes)")


def main():
    for name, fn in [("chair", parts_chair), ("desk", parts_desk), ("lamp", parts_lamp)]:
        print(f"[{name}]")
        parts = fn()
        export_glb(name, parts)
        export_usdz(name, parts)


if __name__ == "__main__":
    main()
