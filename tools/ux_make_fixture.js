// UX 비교용 고정 원고 만들기: 기본 예시 「창밖의 장미」 6컷 + 작화 카드 세 상태
//  1·2컷 이미지 등록, 4컷 이미지 등록 뒤 원고 한 줄 수정(원고 변경 후), 3·5·6컷 등록 전
// 사용: (rough 폴더를 서버로 띄운 뒤) node tools/ux_make_fixture.js [http://localhost:8765/rough/]
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const URL_=process.argv[2]||'http://localhost:8765/rough/',OUT=path.join(__dirname,'..','tests','fixtures','ux-6cuts.rough.json');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({acceptDownloads:true});const pg=await ctx.newPage();
  await pg.goto(URL_);await pg.waitForFunction(()=>typeof PATS!=='undefined'&&PATS.length>0&&Object.keys(REF_PICK||{}).length>0,null,{timeout:30000});
  await pg.evaluate(async()=>{localStorage.clear();for(const r of await idb.all())await idb.del(r.id)});
  await pg.reload();await pg.waitForFunction(()=>typeof PATS!=='undefined'&&PATS.length>0,null,{timeout:30000});
  await pg.evaluate(async()=>{switchScene(0);compute(true);const sid=SCENES[0].id;
    const toData=async src=>{const im=await loadImg(src);const k=Math.min(1,690/im.width),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return{src:c.toDataURL('image/jpeg',.8),w:c.width,h:c.height}};
    for(const n of [0,1,3]){const p=state.panels[n];if(!p?.ref)continue;const im=await toData(p.ref.src);const o={id:cutId(sid,n),kind:'cutimg',scene:sid,idx:n,sig:p.key,...im};IMG.cut[o.id]=o;await idb.put(o)}
    const slot=cutSlot(state.panels[3],3);CUTS[slot]=String(CUTS[slot]).replace(/\s*$/,'')+'\n창밖에서 빗소리가 커진다.';saveScenes();compute(true)});
  const dl=pg.waitForEvent('download');await pg.evaluate(()=>saveProject());const d=await dl;await d.saveAs(OUT);
  const j=JSON.parse(fs.readFileSync(OUT,'utf8'));console.log('저장',path.relative(process.cwd(),OUT),'이미지',j.images.length,'장',(fs.statSync(OUT).size/1024).toFixed(0)+'KB');await b.close()})();
