// UX 시안 측정(docs/ux-brief-plan.md 1-3): 시안 A·B·C × 데스크톱·390px × 작화·콘티·씬
//  첫 컷까지 스크롤(px, 첫 화면 안이면 0) · 첫 화면 툴 글자/덩어리 · 작품 글자([data-work], 컷 글 칸) · 작품 비율 · 작화 과제 클릭 수
// 사용: (rough 서버 실행 뒤) node tools/ux_measure.js [URL] [--md out.md] [--shots dir]
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const args=process.argv.slice(2),URL_=args.find(a=>a.startsWith('http'))||'http://localhost:8765/rough/';
const md=args.includes('--md')?args[args.indexOf('--md')+1]:null,shots=args.includes('--shots')?args[args.indexOf('--shots')+1]:null;
const FIX=JSON.parse(fs.readFileSync(path.join(__dirname,'..','tests','fixtures','ux-6cuts.rough.json'),'utf8'));
const VP={desktop:[1280,900],m390:[390,844]},VIEWS=['nai','layout','write'];
async function load(pg,ux,view){await pg.goto(URL_+'?ux='+ux);await pg.waitForFunction(()=>typeof PATS!=='undefined'&&PATS.length>0,null,{timeout:30000});
  await pg.evaluate(async([fx,view])=>{localStorage.clear();for(const [k,v] of Object.entries(fx.local))localStorage.setItem(k,v);localStorage.setItem('rough-view',view);localStorage.setItem('rough-scene-cur','0');
    for(const r of await idb.all())await idb.del(r.id);for(const r of fx.images)await idb.put(r)},[FIX,view]);
  await pg.reload();await pg.waitForFunction(()=>typeof PATS!=='undefined'&&PATS.length>0,null,{timeout:30000});await pg.evaluate(v=>showView(v),view);await pg.waitForTimeout(900)}
function measure(pg,view){return pg.evaluate(view=>{const H=innerHeight,root=document.querySelector('#v-'+view);
  const vis=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<H&&getComputedStyle(el).visibility!=='hidden'};
  let tool=0,work=0,blocks=0;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let t;
  while(t=w.nextNode()){const p=t.parentElement;if(!p||p.closest('script,style,textarea,dialog:not([open]),[hidden]'))continue;const s=t.textContent.replace(/\s+/g,' ').trim();if(!s||!vis(p))continue;
    if(p.closest('[data-work]'))work+=s.length;else{tool+=s.length;blocks++}}
  document.querySelectorAll('textarea.cutin,#sctitle').forEach(e=>{if(vis(e))work+=(e.value||'').length});
  const firsts={nai:'#ncards .pcard .drop',layout:'#preview svg',write:null};let first=null;
  if(firsts[view]){const el=document.querySelector(firsts[view]);if(el){const top=el.getBoundingClientRect().top+scrollY;first=Math.max(0,Math.round(top+Math.min(120,el.getBoundingClientRect().height*.3)-H))}}
  return {tool,blocks,work,ratio:work+tool?+(work/(work+tool)).toFixed(2):0,first}},view)}
// 작화 과제: 3번 컷 이미지 등록 + 그 컷 프롬프트 전체 복사, 최단 경로 클릭 수
function taskClicks(pg){return pg.evaluate(()=>{const c=document.querySelectorAll('#ncards .pcard')[2];if(!c)return null;let n=1;// 이미지 등록(끌어 놓기 칸이나 버튼 한 번)
  const all=c.querySelector('[data-act="ncopyall"]');if(!all)return null;if(all.closest('[hidden]'))n+=1;// 프롬프트 펼치기
  return n+1})}
(async()=>{const b=await chromium.launch();const rows=[];
  for(const [vpn,[w,h]] of Object.entries(VP)){const pg=await b.newPage({viewport:{width:w,height:h}});
    for(const ux of ['A','B','C'])for(const v of VIEWS){await load(pg,ux,v);const m=await measure(pg,v);if(v==='nai')m.clicks=await taskClicks(pg);rows.push({vp:vpn,ux,view:v,...m});
      if(shots){fs.mkdirSync(shots,{recursive:true});await pg.screenshot({path:path.join(shots,`${vpn}-${v}-${ux}.png`)})}}
    await pg.close()}
  await b.close();
  const line=r=>`| ${r.view} | ${r.vp} | ${r.ux} | ${r.first??'—'} | ${r.tool} | ${r.blocks} | ${r.work} | ${r.ratio} | ${r.clicks??''} |`;
  const out=['| 화면 | 폭 | 안 | 첫 컷까지 스크롤 | 툴 글자 | 툴 덩어리 | 작품 글자 | 작품 비율 | 과제 클릭 |','|---|---|---|---|---|---|---|---|---|',...rows.sort((a,b)=>VIEWS.indexOf(a.view)-VIEWS.indexOf(b.view)||a.vp.localeCompare(b.vp)||a.ux.localeCompare(b.ux)).map(line)].join('\n');
  console.log(out);if(md)fs.writeFileSync(md,out+'\n')})();
