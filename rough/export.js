// 편집 결과 내보내기: 피그마용 레이어 SVG, 클립스튜디오용 레이어 PSD(ZIP), PNG
// index.html의 sceneArt·scenePanels·SCENES·LAYER_TAGS·W를 그대로 씀
(function(){
const NS='http://www.w3.org/2000/svg';
const AG_PSD='vendor/ag-psd-34.1.0.min.js'; // MIT, vendor/LICENSE-ag-psd.txt
const SCENE_GAP=120;
const cache=new Map();
const pad=n=>String(n).padStart(2,'0');
const safe=s=>String(s||'').replace(/[\\/:*?"<>|\n\r\t]/g,'_').trim();
const short=s=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>24?s.slice(0,24)+'…':s};

function toDataURL(blob){return new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(blob)})}
function img(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('이미지를 못 불러왔어요: '+String(src).slice(0,80)));im.src=src})}

// 그림을 파일 안에 넣음(피그마·SVG 이미지 로딩은 외부 주소를 못 읽음). 흑백 필터는 픽셀에 미리 굽기(피그마는 SVG 필터를 버림)
async function embed(src,gray){const key=(gray?'g:':'c:')+src;if(cache.has(key))return cache.get(key);
  const job=(async()=>{
    if(!gray)return src.startsWith('data:')?src:toDataURL(await (await fetch(src)).blob());
    const im=await img(src),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
    const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height),p=d.data;
    for(let k=0;k<p.length;k+=4){const v=p[k]*.299+p[k+1]*.587+p[k+2]*.114;p[k]=p[k+1]=p[k+2]=v}
    g.putImageData(d,0,0);return c.toDataURL('image/jpeg',.92)})();
  cache.set(key,job);return job}

const hrefOf=el=>el.getAttribute('href')||el.getAttributeNS('http://www.w3.org/1999/xlink','href')||'';

// 원본 컷 크롭용 중첩 <svg viewBox>를 이미지+사각 클립으로 풀어 둠(피그마가 중첩 svg를 제대로 못 읽음)
function flattenNested(root,pre){let n=0;
  root.querySelectorAll('[data-art] svg').forEach(s=>{const im=s.querySelector('image');if(!im){s.remove();return}
    const x=+s.getAttribute('x')||0,y=+s.getAttribute('y')||0,w=+s.getAttribute('width'),h=+s.getAttribute('height');
    const [vx,vy,vw,vh]=(s.getAttribute('viewBox')||`0 0 ${w} ${h}`).split(/[\s,]+/).map(Number);
    const k=Math.max(w/vw,h/vh),tx=x+(w-vw*k)/2-vx*k,ty=y+(h-vh*k)/2-vy*k;
    const doc=root.ownerDocument,cid=`${pre}crop${n++}`;
    const cp=doc.createElementNS(NS,'clipPath');cp.setAttribute('id',cid);
    const r=doc.createElementNS(NS,'rect');[['x',x],['y',y],['width',w],['height',h]].forEach(([a,v])=>r.setAttribute(a,v));cp.appendChild(r);
    const g=doc.createElementNS(NS,'g');g.setAttribute('clip-path',`url(#${cid})`);
    const ni=doc.createElementNS(NS,'image');
    [['href',hrefOf(im)],['x',tx.toFixed(2)],['y',ty.toFixed(2)],['width',(+im.getAttribute('width')*k).toFixed(2)],['height',(+im.getAttribute('height')*k).toFixed(2)]].forEach(([a,v])=>ni.setAttribute(a,v));
    ['opacity','filter'].forEach(a=>im.hasAttribute(a)&&ni.setAttribute(a,im.getAttribute(a)));
    g.appendChild(ni);s.replaceWith(cp,g)})}

async function embedAll(root){
  await Promise.all([...root.querySelectorAll('image')].map(async im=>{const src=hrefOf(im);if(!src)return;
    const gray=/url\(#gs\)/.test(im.getAttribute('filter')||'');
    const data=await embed(src,gray);im.removeAttribute('filter');im.removeAttributeNS('http://www.w3.org/1999/xlink','href');im.setAttribute('href',data)}))}

// 씬 하나를 레이어 표시가 붙은 SVG DOM으로
async function sceneModel(i){const ps=scenePanels(i);if(!ps.length)return null;
  LAYER_TAGS=true;let art;try{art=sceneArt(i,ps,`x${i}_`,false)}finally{LAYER_TAGS=false}
  const root=new DOMParser().parseFromString(art.svg,'image/svg+xml').documentElement;
  flattenNested(root,`x${i}_`);await embedAll(root);
  const H=+root.getAttribute('height');
  const cuts=[...root.querySelectorAll(':scope > g[data-p]')].map((g,k)=>{const kids=[...g.children];
    const frame=kids.find(e=>e.matches('polygon,rect'));
    return {g,n:k+1,frame,clip:kids.find(e=>e.matches('clipPath')),
      art:kids.find(e=>e.matches('[data-cut-art]')),overlays:kids.filter(e=>e.matches('[data-overlay]')),
      other:kids.filter(e=>e!==frame&&!e.matches('clipPath,[data-layer],[data-cut-art],[data-overlay]')),
      letters:kids.filter(e=>e.matches('g[data-layer]')).map(e=>({el:e,kind:e.getAttribute('data-layer'),text:e.getAttribute('data-text')||''}))}});
  return {i,title:sceneLabel(SCENES[i],i),root,W:+root.getAttribute('width'),H,
    bgs:[...root.querySelectorAll(':scope > [data-bg-panel],:scope > [data-scene-end]')],defs:root.querySelector(':scope > defs'),cuts}}

async function models(st){if(typeof loadPageMaterials==='function')await loadPageMaterials();const out=[];for(let i=0;i<SCENES.length;i++){st&&st(`씬 ${i+1}/${SCENES.length} 준비 중`);const m=await sceneModel(i);if(m)out.push(m)}return out}

// ---------- SVG (피그마) ----------
// 피그마는 id를 레이어 이름으로 씀. 씬 = 그룹, 컷 = 그룹, 그 안에 칸·그림·식자 레이어
function setId(el,id,used){const b=id.replace(/[^\p{L}\p{N}_.-]+/gu,'_').replace(/^(?=[\d.-])/,'_');let v=b,k=2;while(used.has(v))v=b+'_'+k++;used.add(v);el.setAttribute('id',v)}
function letterName(L,n){return `${L.kind}${n}_${short(L.text).replace(/\s/g,'_')}`}
async function buildSVG(st){const ms=await models(st);if(!ms.length)return null;
  const doc=document.implementation.createDocument(NS,'svg',null),svg=doc.documentElement,used=new Set();
  const W=ms[0].W;let y=0;const defs=doc.createElementNS(NS,'defs');svg.appendChild(defs);
  for(const m of ms){const sc=doc.createElementNS(NS,'g');setId(sc,`씬${pad(m.i+1)}_${short(SCENES[m.i].title||'')}`,used);sc.setAttribute('transform',`translate(0 ${y})`);
    const bg=doc.createElementNS(NS,'g');setId(bg,`씬${pad(m.i+1)}_배경`,used);
    const base=doc.createElementNS(NS,'rect');base.setAttribute('width',W);base.setAttribute('height',m.H);base.setAttribute('fill','#ffffff');bg.appendChild(base);
    m.bgs.forEach(b=>bg.appendChild(doc.importNode(b,true)));sc.appendChild(bg);
    m.cuts.forEach(c=>{const g=doc.importNode(c.g,true);g.removeAttribute('data-p');setId(g,`씬${pad(m.i+1)}_컷${pad(c.n)}`,used);
      const kids=[...g.children];let ln=0;
      kids.forEach(e=>{if(e.matches('clipPath')){defs.appendChild(e);return}
        if(e.matches('polygon,rect'))setId(e,`컷${pad(c.n)}_칸`,used);
        else if(e.matches('[data-cut-art]'))setId(e,`컷${pad(c.n)}_그림`,used);
        else if(e.matches('[data-overlay]'))setId(e,`컷${pad(c.n)}_소재${Number(e.dataset.overlay)+1}`,used);
        else if(!e.matches('g[data-layer]'))setId(e,`컷${pad(c.n)}_효과`,used);
        if(e.matches('g[data-layer]')){setId(e,`컷${pad(c.n)}_`+letterName({kind:e.getAttribute('data-layer'),text:e.getAttribute('data-text')},++ln),used);e.removeAttribute('data-layer');e.removeAttribute('data-text')}});
      g.querySelectorAll('clipPath').forEach(cp=>defs.appendChild(cp));
      g.querySelectorAll('[data-art]').forEach(e=>e.removeAttribute('data-art'));
      sc.appendChild(g)});
    if(m.defs)[...m.defs.children].forEach(d=>{if(d.id!=='gs'&&!defs.querySelector('#'+CSS.escape(d.id)))defs.appendChild(doc.importNode(d,true))});
    svg.appendChild(sc);y+=m.H+SCENE_GAP}
  y-=SCENE_GAP;
  [['width',W],['height',y],['viewBox',`0 0 ${W} ${y}`],['font-family',typeof PAGE_FONT==='string'?PAGE_FONT:'Pretendard,system-ui,sans-serif']].forEach(([a,v])=>svg.setAttribute(a,v));
  return {svg:'<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(svg),count:ms.length,models:ms}}

// ---------- 레이어 그리기(PSD·PNG 공용) ----------
function wrap(m,inner){return `<svg xmlns="${NS}" width="${m.W}" height="${m.H}" viewBox="0 0 ${m.W} ${m.H}" font-family="${typeof PAGE_FONT==='string'?PAGE_FONT:'Pretendard,system-ui,sans-serif'}"><defs>${m.cuts.map(c=>c.clip?c.clip.outerHTML:'').join('')}${m.defs?m.defs.innerHTML:''}</defs>${inner}</svg>`}
async function raster(m,inner,{trim=true,bg=null}={}){const im=await img('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(wrap(m,inner)));
  const c=document.createElement('canvas');c.width=m.W;c.height=m.H;const g=c.getContext('2d');if(bg){g.fillStyle=bg;g.fillRect(0,0,c.width,c.height)}g.drawImage(im,0,0,m.W,m.H);
  if(!trim)return {canvas:c,left:0,top:0};
  const d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=-1,y1=-1;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return null;const o=document.createElement('canvas');o.width=x1-x0+1;o.height=y1-y0+1;o.getContext('2d').drawImage(c,-x0,-y0);
  return {canvas:o,left:x0,top:y0}}

function loadAgPsd(){if(window.agPsd)return Promise.resolve(window.agPsd);
  return new Promise((res,rej)=>{const s=document.createElement('script');s.src=AG_PSD;s.onload=()=>window.agPsd?res(window.agPsd):rej(new Error('PSD 모듈 없음'));s.onerror=()=>rej(new Error('PSD 모듈을 못 불러왔어요'));document.head.appendChild(s)})}

// ---------- PSD (클립스튜디오) ----------
async function imageLayer(m,name,element,subject,bounds){
  const mask=subject.getAttribute('mask'),clip=element.getAttribute('clip-path');
  const free=element.cloneNode(true);
  free.removeAttribute('clip-path');
  (subject===element?free:free.firstElementChild).removeAttribute('mask');
  const art=await raster(m,free.outerHTML);
  if(!art)return null;
  const layer={name,canvas:art.canvas,left:art.left,top:art.top};
  if(!clip&&!mask)return layer;

  const transform=subject.getAttribute('transform');
  const white=`<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.w}" height="${bounds.h}" fill="#fff"/>`;
  const coverage=`<g${clip?` clip-path="${clip}"`:''}><g${mask?` mask="${mask}"`:''}${transform?` transform="${transform}"`:''}>${white}</g></g>`;
  const mk=await raster(m,coverage,{trim:false,bg:'#000'});
  return {...layer,mask:{canvas:mk.canvas,left:0,top:0,right:m.W,bottom:m.H,defaultColor:0}};
}

// 씬마다 PSD 한 장. 레이어: 배경 / 컷 폴더(칸 · 그림[칸 모양 마스크] · 식자 하나씩)
async function scenePSD(m,ag){const layer=(name,r,extra={})=>r?{name,canvas:r.canvas,left:r.left,top:r.top,...extra}:null;
  const children=[];
  children.push(layer('배경',await raster(m,`<rect width="${m.W}" height="${m.H}" fill="#fff"/>`+m.bgs.map(b=>b.outerHTML).join(''),{trim:false})));
  for(const c of m.cuts){const kids=[];
    if(c.frame)kids.push(layer('칸',await raster(m,c.frame.outerHTML)));
    if(c.art)kids.push(await imageLayer(m,'그림',c.art,c.art,{x:0,y:0,w:m.W,h:m.H}));
    for(const [i,overlay] of c.overlays.entries()){
      const subject=overlay.firstElementChild, img=subject.querySelector('image');
      const bounds={x:+img.getAttribute('x'),y:+img.getAttribute('y'),w:+img.getAttribute('width'),h:+img.getAttribute('height')};
      kids.push(await imageLayer(m,`이미지 소재 ${i+1}`,overlay,subject,bounds));
    }
    if(c.other.length)kids.push(layer('효과·기타',await raster(m,c.other.map(e=>e.outerHTML).join(''))));
    let n=0;for(const L of c.letters){const name=`${L.kind}${++n} ${short(L.text)}`,texts=[...L.el.querySelectorAll('text')];
      if(!texts.length){kids.push(layer(name,await raster(m,L.el.outerHTML)));continue}
      // 말풍선·나레이션: 모양은 그림 레이어, 글자는 편집 가능한 텍스트 레이어(미리보기 픽셀도 함께 넣어 텍스트를 못 읽는 앱에서도 보이게)
      const shape=L.el.cloneNode(true);shape.querySelectorAll('text').forEach(t=>t.remove());
      const sh=await raster(m,shape.outerHTML),tx=await raster(m,texts.map(t=>t.outerHTML).join(''));
      const sub=[layer('모양',sh),textLayer('글자',tx,texts)].filter(Boolean);
      kids.push({name,opened:false,children:sub})}
    children.push({name:`컷 ${pad(c.n)}`,opened:true,children:kids.filter(Boolean)})}
  const flat=await raster(m,m.root.innerHTML,{trim:false,bg:'#fff'});
  return ag.writePsdUint8Array({width:m.W,height:m.H,canvas:flat.canvas,children:children.filter(Boolean)},{generateThumbnail:false,invalidateTextLayers:true})}

// SVG <text> 줄들 → ag-psd 텍스트 레이어. 기준점은 첫 줄 기준선, 가운데 정렬이면 x가 가운데
function textLayer(name,r,texts){if(!r)return null;const t0=texts[0],num=(e,k,d=0)=>parseFloat(e.getAttribute(k))||d;
  const fs=num(t0,'font-size',20),x=num(t0,'x'),y=num(t0,'y'),lead=texts.length>1?num(texts[1],'y')-y:fs*1.3;
  const hex=(t0.getAttribute('fill')||'#000000').replace('#',''),rgb={r:parseInt(hex.slice(0,2),16)||0,g:parseInt(hex.slice(2,4),16)||0,b:parseInt(hex.slice(4,6),16)||0};
  const anchor=t0.getAttribute('text-anchor'),just=anchor==='middle'?'center':anchor==='end'?'right':'left',w=+t0.getAttribute('font-weight')||400;
  const font=(PAGE_FONT||'Pretendard').split(',')[0].replace(/["']/g,'').trim();
  return {name,canvas:r.canvas,left:r.left,top:r.top,text:{text:texts.map(t=>t.textContent).join('\r'),transform:[1,0,0,1,x,y],
    style:{font:{name:font+(w>=600?'-SemiBold':w>=500?'-Medium':'-Regular')},fontSize:fs,leading:lead,autoLeading:false,tracking:Math.round((num(t0,'letter-spacing')/fs)*1000),fillColor:rgb},
    paragraphStyle:{justification:just}}}}

function scriptText(ms,title){const L=[`${title}`,'',`클립스튜디오에서 텍스트 도구로 다시 입력할 때 쓰는 대사 목록이에요. PSD의 말풍선·나레이션 글자는 텍스트 레이어로 들어 있어요(앱에 따라 그림으로 열릴 수 있어요). 효과음은 그림이에요.`,''];
  ms.forEach(m=>{L.push(`[${m.title}]`);m.cuts.forEach(c=>{if(!c.letters.length)return;L.push(`컷 ${pad(c.n)}`);c.letters.forEach(x=>L.push(`  ${x.kind}: ${x.text.replace(/\n/g,' / ')}`))});L.push('')});
  return L.join('\r\n')}

// ---------- ZIP (압축 없이 묶기, 파일 이름 UTF-8) ----------
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
// 브라우저가 지원하면 deflate로 줄임(PSD는 보통 1/3~1/5)
async function deflate(u8){if(typeof CompressionStream!=='function')return null;
  try{const cs=new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'));return new Uint8Array(await new Response(cs).arrayBuffer())}catch(_){return null}}
async function zip(files){const enc=new TextEncoder(),parts=[],central=[];let off=0;
  const d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  for(const f of files){const name=enc.encode(f.name),raw=typeof f.data==='string'?enc.encode(f.data):f.data,crc=crc32(raw);
    const z=await deflate(raw),method=z&&z.length<raw.length?8:0,data=method?z:raw;
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,method,true);h.setUint16(10,dt,true);h.setUint16(12,dd,true);
    h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,raw.length,true);h.setUint16(26,name.length,true);
    parts.push(new Uint8Array(h.buffer),name,data);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,method,true);c.setUint16(12,dt,true);c.setUint16(14,dd,true);
    c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,raw.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),name);off+=30+name.length+data.length}
  const size=central.reduce((a,b)=>a+b.length,0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/zip'})}

const titleBase=()=>safe($('#wtitle').value)||'webtoon';
async function exportSVG(st){st('SVG 만드는 중');const r=await buildSVG(st);if(!r){st('저장할 컷이 없어요');return}
  download(`${titleBase()}-figma.svg`,URL.createObjectURL(new Blob([r.svg],{type:'image/svg+xml'})));
  st(`SVG로 저장했어요 · 씬 ${r.count}개 · 피그마 캔버스에 끌어다 놓으면 레이어로 열려요`)}
async function exportPSD(st){st('PSD 모듈 불러오는 중');const ag=await loadAgPsd();const ms=await models(st);if(!ms.length){st('저장할 컷이 없어요');return}
  const files=[];for(const m of ms){st(`PSD 만드는 중 · ${m.title}`);files.push({name:`${pad(m.i+1)}_${safe(m.title)}.psd`,data:await scenePSD(m,ag)})}
  files.push({name:'대사 목록.txt',data:'﻿'+scriptText(ms,$('#wtitle').value||'제목 없음')});
  download(`${titleBase()}-clipstudio.zip`,URL.createObjectURL(await zip(files)));
  st(`PSD ${ms.length}장을 ZIP으로 저장했어요 · 클립스튜디오에서 파일 › 열기로 PSD를 열어요`)}

// PNG 저장도 그림을 파일 안에 넣은 SVG로 그려야 원본 컷 레퍼런스가 빠지지 않음
async function inlineSceneSVG(i){const m=await sceneModel(i);return m&&{svg:new XMLSerializer().serializeToString(m.root)}}

window.RoughExport={exportSVG,exportPSD,buildSVG,inlineSceneSVG,_zip:zip,_models:models};
})();
