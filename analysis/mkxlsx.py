import json,sys,openpyxl
import os
P=os.environ.get('WORK_CODE','GM').lower()
ep=int(sys.argv[1]);W=json.load(open(f'{P}{ep}_write.json'))
wb=openpyxl.Workbook();wb.remove(wb.active)
for name,key in [('t컷','cut'),('t리듬','rhythm'),('t장면','scenes'),('t띠','band')]:
    ws=wb.create_sheet(name)
    for r in W[key]: ws.append([v for v in r])
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value,str): c.data_type='s'
wb.save(f'{P}{ep}_imp.xlsx');print({k:(len(W[k]),len(W[k][0])) for k in W})
