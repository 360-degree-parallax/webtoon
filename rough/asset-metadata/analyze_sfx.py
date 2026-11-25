"""Measure real SFX PNGs. Run from repository root; writes a separate visual catalog."""
import argparse, hashlib, json, os
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def measure(path):
    raw=path.read_bytes()
    with Image.open(path) as im:
        if im.format != "PNG": raise ValueError("not PNG")
        rgba=np.asarray(im.convert("RGBA"))
    h,w=rgba.shape[:2]
    a=rgba[:,:,3]
    m=a>=32
    ys,xs=np.nonzero(m)
    if not len(xs): raise ValueError("empty alpha mask")
    x0,x1=int(xs.min()),int(xs.max())+1
    y0,y1=int(ys.min()),int(ys.max())+1
    crop=m[y0:y1,x0:x1]
    labels,n=ndi.label(crop,structure=np.ones((3,3),dtype=int))
    sizes=np.bincount(labels.ravel())[1:]
    dist=ndi.distance_transform_edt(np.pad(crop,1))[1:-1,1:-1]
    ridge=crop & (dist==ndi.maximum_filter(dist,size=3))
    cov=np.cov(np.vstack([xs,ys]),bias=True) if len(xs)>1 else np.zeros((2,2))
    eig,vec=np.linalg.eigh(cov)
    axis=vec[:,-1]
    angle=float((np.degrees(np.arctan2(axis[1],axis[0]))+90)%180-90) if eig[-1]>0 else None
    eroded=ndi.binary_erosion(crop)
    perimeter=int((crop & ~eroded).sum())
    return dict(sha256=hashlib.sha256(raw).hexdigest(),width=w,height=h,
        aspect_ratio=round(w/h,5),alpha_bbox=[x0,y0,x1,y1],
        bbox_aspect_ratio=round((x1-x0)/(y1-y0),5),
        canvas_occupancy=round(float(m.mean()),5),bbox_occupancy=round(float(crop.mean()),5),
        alpha_mean=round(float(a.mean()/255),5),transparent_fraction=round(float((a==0).mean()),5),
        connected_components=int(n),components_ge_4px=int((sizes>=4).sum()),
        stroke_diameter_proxy_px=round(float(np.median(2*dist[ridge])),3) if ridge.any() else None,
        principal_axis_deg=round(angle,2) if angle is not None else None,
        axis_anisotropy=round(float((eig[-1]-eig[0])/eig[-1]),5) if eig[-1]>0 else 0,
        boundary_to_area=round(perimeter/int(crop.sum()),5),
        median_rgb=np.median(rgba[:,:,:3][m],axis=0).astype(int).tolist())

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",type=Path,default=Path("."))
    args=p.parse_args()
    root=args.root.resolve()
    base=root/"rough/asset-metadata"
    source=json.loads((base/"sfx.json").read_text(encoding="utf-8"))
    rows=[]; errors=[]
    for entry in source["entries"]:
        for v in entry["variants"]:
            try: rows.append({"id":v["id"],"path":v["path"],"visual_status":"measured","visual":measure(root/v["path"])})
            except Exception as e: errors.append({"id":v["id"],"path":v["path"],"error":str(e)})
    expected=source["counts"]["variants"]
    if len(rows)+len(errors)!=expected or len({r["id"] for r in rows+errors})!=expected:
        raise ValueError("catalog count or unique ID mismatch")
    result={"schema_version":1,"method":"alpha>=32; 8-connected components; stroke and orientation are geometric proxies, not handwriting labels","expected":expected,"measured":len(rows),"failed":len(errors),"entries":rows,"errors":errors}
    out=base/"sfx-visual.json"
    tmp=out.with_suffix(".tmp")
    tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    os.replace(tmp,out)
    print(f"Measured {len(rows)}/{expected}; failures {len(errors)}")
    return int(bool(errors))
if __name__=="__main__":
    raise SystemExit(main())
