#!/usr/bin/env bash
# 외부 학습 데이터 원본 받기(개인용·비상업). 저장소 밖 ~/rough-ext/raw 에만 저장
# 이어서: python3 tools/ml/ext/build_ext.py
set -e
R=${ROUGH_EXT:-/home/user/rough-ext}/raw; mkdir -p "$R/whatashot" "$R/shotbench"
HF=https://huggingface.co/datasets
curl -sL -o "$R/whatashot/test.parquet" "$HF/szymonrucinski/types-of-film-shots/resolve/main/data/test-00000-of-00001.parquet"
curl -sL -o "$R/shotbench/test.tsv" "$HF/Vchitect/ShotBench/resolve/main/test.tsv"
python3 - "$R" <<'PY'
import sys,ast,csv,pandas as pd,os
R=sys.argv[1];d=pd.read_parquet(f'{R}/whatashot/test.parquet');L=['ambiguous','closeUp','detail','extremeLongShot','fullShot','longShot','mediumCloseUp','mediumShot']
os.makedirs(f'{R}/whatashot/img',exist_ok=True);rows=[]
for k,r in d.iterrows():
    fn=f'was_{k:04d}.jpg';open(f'{R}/whatashot/img/{fn}','wb').write(r['image']['bytes']);rows.append((fn,L[r['label']]))
pd.DataFrame(rows,columns=['file','label']).to_csv(f'{R}/whatashot/labels.csv',index=False)
t=pd.read_csv(f'{R}/shotbench/test.tsv',sep='\t');k=t[t.category.isin(['shot size','camera angle','composition','shot framing'])&(t.type=='["image"]')]
open(f'{R}/shotbench/need.txt','w').write('\n'.join(sorted({p for x in k.path for p in ast.literal_eval(x)})))
PY
curl -sL "$HF/Vchitect/ShotBench/resolve/main/images.tar" | (cd "$R/shotbench" && tar -x -T need.txt)
echo "받음: $(ls $R/whatashot/img | wc -l) + $(find $R/shotbench -name '*.jpg' | wc -l)"
