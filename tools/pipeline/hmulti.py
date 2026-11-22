import os;P=os.environ.get('P','hc')
# 사용: python3 hmulti.py 2 3 ... → 여러 화를 한 엑셀로 (각 시트는 화 순서대로 이어 붙임)
import json,sys,openpyxl
eps=[int(x) for x in sys.argv[1:]];W={k:[] for k in ('cut','rhythm','scenes','band')}
for e in eps:
    d=json.load(open(f'{P}{e}_write.json'))
    for k in W:W[k]+=d[k]
n=max(len(b) for b in W['band']);W['band']=[b+[None]*(n-len(b)) for b in W['band']]
wb=openpyxl.Workbook();wb.remove(wb.active)
for name,key in [('t컷','cut'),('t리듬','rhythm'),('t장면','scenes'),('t띠','band')]:
    ws=wb.create_sheet(name)
    for r in W[key]: ws.append(r)
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value,str): c.data_type='s'
out=f"{P}{'_'.join(map(str,eps))}_imp.xlsx";wb.save(out);print(out,{k:(len(v),len(v[0])) for k,v in W.items()})
