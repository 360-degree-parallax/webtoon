
// ---------- 요소별 레이어: 컷 하나를 배경 · 인물마다 · 소품마다 따로 뽑아 겹침 ----------
// 프롬프트는 RoughNAI.layers. 배경은 컷 그림 자리(IMG.cut, layerBg=같이 쓰는 키), 인물·소품은 흰 배경을 지운 PNG를
// 편집 이미지 소재(pageEdits[slot].overlays, layer·key 표시)로 겹쳐 편집에서 레이어로 옮기고 PSD에서도 레이어 하나씩.
//   고정: 배경은 같은 씬·같은 장소·같은 앵글 컷이 한 장을 같이 씀, 소품은 한 장을 모든 씬이 같이 씀, 인물은 컷마다(자세가 달라서)
var LAYER_CUT=true;try{LAYER_CUT=localStorage.getItem('rough-layer-cutout')!=='0'}catch(_){}
function setLayerMode(on){LAYER_MODE=!!on;try{localStorage.setItem('rough-layer-mode',on?'1':'0')}catch(_){}if(on)syncLayers(SCUR);renderConti();
  toast(on?'요소별 레이어로 뽑아요 · 배경·인물·소품 프롬프트를 따로 복사해 만든 그림을 각 칸에 넣어 주세요':'컷 한 장으로 뽑아요',2600)}
// 장면 하나의 컷마다 레이어 설계(지금 씬은 Claude가 다듬은 프롬프트, 다른 씬은 규칙 초안)
function layerPlan(si){const cur=si===SCUR,ps=cur?state.panels:panelsOf(si);if(!ps.length)return[];
  const L=cur?naiCuts():(()=>{const chars=naiChars(),ctx={chars,style:NAISTYLE,tags:NAITAGS,refs:{char:n=>!!IMG.char[n]},worldTags:WORLD.tags||'',loreTags:p=>loreHits(p.act||'').filter(e=>e.cat!=='item').flatMap(e=>loreTagList(e)),props:propsFor};return ps.map((p,i)=>({p,i,o:NAI.cut(p,i,ps,ctx)}))})();
  return L.map(({p,i,o})=>({p,i,slot:cutSlot(p,i),...NAI.layers(o,p,{style:NAISTYLE,i})}))}
// 인물은 자세 키(pose)가 같으면 어느 씬·컷이든 같은 그림. 자세 키가 없던 예전 그림은 그 컷에서만
const layerAsset=(kind,key,sid,slot,pose)=>{const A=Object.values(IMG.overlay).filter(a=>a.layer&&a.layer.kind===kind&&a.layer.key===key);if(kind==='prop')return A[0];
  return A.find(a=>pose&&a.layer.pose===pose)||A.find(a=>!a.layer.pose&&a.layer.scene===sid&&a.layer.slot===slot)};
const charOf=(L,x,sid)=>layerAsset('char',x.key,sid,L.slot,x.pose);
// 이 씬에서 같은 자세 인물 그림을 같이 쓰는 컷 수
const poseShare=x=>layerPlan(SCUR).filter(L=>L.chars.some(c=>c.pose===x.pose)).length;
const layerBgOf=(si,key)=>Object.values(IMG.cut).find(r=>r.scene===SCENES[si].id&&r.layerBg===key);
// 등록한 레이어 그림을 컷에 맞춰 둠: 같은 키 배경을 빈 컷에 복사, 인물·소품 소재를 컷 소재 목록에 추가(이미 있으면 그림만 바꿈, 위치·크기는 그대로)
function syncLayers(si){const sc=SCENES[si];if(!sc)return 0;const plan=layerPlan(si);let n=0;sc.pageEdits||=[];
  for(const L of plan){const id=cutId(sc.id,L.i),cur=IMG.cut[id];
    if(L.bg.shared&&(!cur||cur.layerBg)){const src=layerBgOf(si,L.bg.key);if(src&&(!cur||cur.src!==src.src||cur.layerBg!==L.bg.key)){const o={...src,id,idx:L.i,sig:L.p.key};IMG.cut[id]=o;idb.put(o);n++}}
    const want=[...L.chars.map(x=>[x,charOf(L,x,sc.id)]),...L.props.map(x=>[x,layerAsset('prop',x.key)])].filter(([,a])=>a);
    // 이 컷 글에 더는 없는 소품·인물 레이어는 뺌(예전에 잘못 붙은 소품 포함). 직접 넣은 소재(layer 없음)는 그대로
    const ok=new Set([...L.chars.map(x=>'char:'+x.key),...L.props.map(x=>'prop:'+x.key)]),cur0=sc.pageEdits[L.slot]?.overlays;
    if(cur0?.some(v=>v.layer&&!ok.has(v.layer+':'+v.key))){sc.pageEdits[L.slot].overlays=cur0.filter(v=>!v.layer||ok.has(v.layer+':'+v.key));n++}
    if(!want.length)continue;const ed=sc.pageEdits[L.slot]||={},ov=ed.overlays||=[];
    for(const [x,a] of want){const has=ov.find(v=>v.layer===x.kind&&v.key===x.key);
      if(has){if(has.asset!==a.id){has.asset=a.id;n++}}else{ov.push({asset:a.id,layer:x.kind,key:x.key,x:x.x,y:x.y,scale:x.scale});n++}}}
  if(n)saveScenes();return n}
// 흰 배경 지우기: 테두리에서 이어진 밝고 채도 낮은 픽셀만 투명하게(인물 안의 흰 옷·눈 흰자는 테두리와 이어지지 않으면 남음), 경계는 반투명으로 부드럽게
function whiteCutout(d,w,h){const px=d.data,seen=new Uint8Array(w*h),isW=k=>{const r=px[k*4],g=px[k*4+1],b=px[k*4+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mn>=228&&mx-mn<=22};
  const st=[];for(let x=0;x<w;x++){st.push(x,(h-1)*w+x)}for(let y=0;y<h;y++){st.push(y*w,y*w+w-1)}
  while(st.length){const k=st.pop();if(seen[k]||!isW(k))continue;seen[k]=1;px[k*4+3]=0;const x=k%w,y=(k-x)/w;
    if(x>0)st.push(k-1);if(x<w-1)st.push(k+1);if(y>0)st.push(k-w);if(y<h-1)st.push(k+w)}
  for(let k=0;k<w*h;k++){if(seen[k])continue;const x=k%w,y=(k-x)/w;let e=0;
    if(x>0&&seen[k-1])e++;if(x<w-1&&seen[k+1])e++;if(y>0&&seen[k-w])e++;if(y<h-1&&seen[k+w])e++;
    if(e){const r=px[k*4],g=px[k*4+1],b=px[k*4+2],l=Math.min(r,g,b);px[k*4+3]=Math.min(px[k*4+3],l>200?Math.round(255*(1-(l-200)/55)*.9+20):255-e*25)}}
  return d}
async function layerPNG(file,label,cut){const url=URL.createObjectURL(file);try{const im=await loadImg(url);const k=Math.min(1,1536/Math.max(im.naturalWidth,im.naturalHeight));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));const g=c.getContext('2d');g.drawImage(im,0,0,c.width,c.height);
  if(cut)g.putImageData(whiteCutout(g.getImageData(0,0,c.width,c.height),c.width,c.height),0,0);
  return{id:'overlay:'+(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)),kind:'overlay',name:label,src:c.toDataURL('image/png'),w:c.width,h:c.height}}finally{URL.revokeObjectURL(url)}}
// 레이어 그림 넣기: kind bg|char|prop, i=지금 씬 컷 번호
async function layerPut(file,i,kind,key){if(!file||!file.type.startsWith('image/'))return;const L=layerPlan(SCUR)[i];if(!L)return;const sid=SCENES[SCUR].id;
  if(kind==='bg'){const im=await shrink(file,1380);const o={id:cutId(sid,i),kind:'cutimg',scene:sid,idx:i,sig:L.p.key,src:im.src,w:im.w,h:im.h,layerBg:L.bg.shared?L.bg.key:''};IMG.cut[o.id]=o;await idb.put(o);
    // 같은 키(같은 장소·앵글)로 이미 배경을 같이 쓰던 컷도 새 배경으로
    if(L.bg.shared)for(const r of Object.values(IMG.cut))if(r.scene===sid&&r.layerBg===L.bg.key&&r.id!==o.id){r.src=o.src;r.w=o.w;r.h=o.h;idb.put(r)}}
  else{const x=(kind==='char'?L.chars:L.props).find(v=>v.key===key);if(!x)return;const old=kind==='char'?charOf(L,x,sid):layerAsset(kind,key);
    const a=await layerPNG(file,x.label,LAYER_CUT);a.layer=kind==='prop'?{kind,key}:{kind,key,pose:x.pose,scene:sid,slot:L.slot};
    IMG.overlay[a.id]=a;await idb.put(a);if(old){delete IMG.overlay[old.id];idb.del(old.id)}}
  const n=syncLayers(SCUR);if(kind!=='bg')SCENES.forEach((_,si)=>{if(si!==SCUR)syncLayers(si)});
  renderConti();if(typeof rerenderCuts==='function')rerenderCuts();
  toast(kind==='bg'?`배경을 넣었어요${L.bg.shared?` · 같은 장소 컷 ${layerPlan(SCUR).filter(x=>x.bg.shared&&x.bg.key===L.bg.key).length}개가 같이 써요`:''}`:kind==='prop'?`소품 「${key}」 그림을 넣었어요 · 이 소품이 나오는 모든 컷에 같은 그림이 들어가요`:`${i+1}번 컷 인물 「${key}」 레이어를 넣었어요${(()=>{const x=L.chars.find(v=>v.key===key),k=x?poseShare(x):1;return k>1?` · 같은 자세 ${k}컷이 같이 써요`:''})()}${LAYER_CUT?' · 흰 배경을 지웠어요':''}`,2600)}
function layerDel(i,kind,key){const L=layerPlan(SCUR)[i];if(!L)return;const sid=SCENES[SCUR].id;
  if(kind==='bg'){const r=IMG.cut[cutId(sid,i)];if(r)for(const x of Object.values(IMG.cut))if(x.id===r.id||(r.layerBg&&x.scene===sid&&x.layerBg===r.layerBg)){delete IMG.cut[x.id];idb.del(x.id)}}
  else{const x=L.chars.find(v=>v.key===key),a=kind==='char'?(x&&charOf(L,x,sid)):layerAsset(kind,key);if(a){delete IMG.overlay[a.id];idb.del(a.id)}
    SCENES.forEach(sc=>(sc.pageEdits||[]).forEach(ed=>{if(ed?.overlays)ed.overlays=ed.overlays.filter(v=>!(v.layer===kind&&v.key===key&&(!a||v.asset===a.id)))}));saveScenes()}
  renderConti();if(typeof rerenderCuts==='function')rerenderCuts()}
// 콘티 카드: 겹친 미리보기 + 레이어 줄(그림 칸 · 프롬프트 복사)
function layerPreview(L,o){const sid=SCENES[SCUR].id,bg=IMG.cut[cutId(sid,L.i)],ed=(SCENES[SCUR].pageEdits||[])[L.slot],ov=(ed?.overlays||[]).filter(v=>IMG.overlay[v.asset]);
  return `<div class="ly-prev" style="aspect-ratio:${o.size.w}/${o.size.h}">${bg?`<img class="ly-bg" src="${bg.src}" alt="">`:'<span class="ly-empty">배경 없음</span>'}${ov.map(v=>`<img class="ly-ov" src="${IMG.overlay[v.asset].src}" alt="" style="left:${v.x??50}%;top:${v.y??50}%;width:${v.scale??100}%">`).join('')}</div>`}
function layerRows(L,o,dim){const sid=SCENES[SCUR].id,bg=IMG.cut[cutId(sid,L.i)],share=L.bg.shared?layerPlan(SCUR).filter(x=>x.bg.shared&&x.bg.key===L.bg.key).length:1;
  const row=(kind,x,im,meta,extra='')=>`<div class="ly-row" data-ly="${kind}" data-key="${esc(x.key)}"><div class="drop ly-slot${im?' has':''}" tabindex="0" role="button" data-lyslot="${L.i}" aria-label="${esc(x.label)} 그림 ${im?'바꾸기':'넣기'}">${im?`<img src="${im.src}" alt=""><button class="x" data-lydel="${L.i}" aria-label="${esc(x.label)} 그림 빼기">×</button>`:'<span>+</span>'}</div>
    <div class="ly-main">${ctBlk(`${esc(x.label)} <small>${x.size.w}×${x.size.h}${meta?' · '+meta:''}</small>`,x.prompt,dim)}${extra}</div></div>`;
  return `<div class="ct-layers"><div class="ct-ph"><span>요소별 레이어</span><small>위에서부터 아래 레이어 · 편집에서 위치·크기를 옮겨요</small></div>
    ${L.props.map(x=>row('prop',x,layerAsset('prop',x.key),`모든 컷에 같은 그림${x.needsTags?' · 태그는 컷 프롬프트 생성 때 정해져요':''}`)).join('')}
    ${L.chars.map(x=>{const k=poseShare(x),other=Object.values(IMG.overlay).filter(a=>a.layer?.kind==='char'&&a.layer.key===x.key&&a.layer.pose!==x.pose);
      return row('char',x,charOf(L,x,sid),`${k>1?`같은 자세 ${k}컷이 같이 씀 · `:''}위치 ${x.x}·${x.y} · 폭 ${x.scale}%`,other.length?`<select class="ly-pick" data-lypick="${L.i}" aria-label="${esc(x.name)}의 다른 컷 그림 쓰기"><option value="">다른 컷 그림 쓰기…</option>${other.map((a,n)=>`<option value="${esc(a.id)}">${esc(x.name)} 그림 ${n+1}${a.layer.slot!=null?` (${a.layer.scene===sid?'이 씬 ':''}${a.layer.slot+1}번 컷)`:''}</option>`).join('')}</select>`:'')}).join('')}
    ${row('bg',L.bg,bg,L.bg.shared?`같은 장소 ${share}컷이 같이 씀`:'이 컷만')}</div>`}
{const el=$('#conti');let pick=null;const fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.hidden=true;document.body.appendChild(fi);
  const who=e=>{const r=e.target.closest('.ly-row');return r?[+r.querySelector('[data-lyslot]').dataset.lyslot,r.dataset.ly,r.dataset.key]:null};
  el.addEventListener('click',e=>{if(e.target.closest('[data-layermode]')||e.target.closest('[data-layercut]'))return;
    const d=e.target.closest('[data-lydel]');if(d){e.stopPropagation();const w=who(e);if(w)layerDel(...w);return}
    const s=e.target.closest('[data-lyslot]');if(s){e.stopPropagation();pick=who(e);fi.click()}});
  el.addEventListener('keydown',e=>{const s=e.target.closest?.('[data-lyslot]');if(s&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pick=who(e);fi.click()}});
  fi.addEventListener('change',()=>{const f=fi.files[0];fi.value='';if(f&&pick)layerPut(f,...pick)});
  el.addEventListener('dragover',e=>{if(e.target.closest('[data-lyslot]'))e.preventDefault()});
  el.addEventListener('drop',e=>{const s=e.target.closest('[data-lyslot]');if(!s)return;e.preventDefault();e.stopPropagation();const f=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));const w=who(e);if(f&&w)layerPut(f,...w)},true);
  // 다른 컷 그림 쓰기: 그 그림을 이 컷 자세 키로도 등록(같은 자세 컷도 함께)
  el.addEventListener('change',e=>{const s=e.target.closest('[data-lypick]');if(!s||!s.value)return;const w=who(e),src=IMG.overlay[s.value];if(!w||!src)return;layerReuse(w[0],w[2],src)});
  el.addEventListener('change',e=>{if(e.target.matches('[data-layermode]'))setLayerMode(e.target.checked);
    if(e.target.matches('[data-layercut]')){LAYER_CUT=e.target.checked;try{localStorage.setItem('rough-layer-cutout',LAYER_CUT?'1':'0')}catch(_){}toast(LAYER_CUT?'인물·소품 그림의 흰 배경을 지워서 넣어요':'인물·소품 그림을 그대로 넣어요 · 투명 PNG를 쓸 때')}})}

async function layerReuse(i,key,src){const L=layerPlan(SCUR)[i],x=L?.chars.find(v=>v.key===key);if(!x)return;const sid=SCENES[SCUR].id,old=charOf(L,x,sid);
  const a={...src,id:'overlay:'+(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)),layer:{kind:'char',key,pose:x.pose,scene:sid,slot:L.slot}};
  IMG.overlay[a.id]=a;await idb.put(a);if(old){delete IMG.overlay[old.id];idb.del(old.id)}SCENES.forEach((_,si)=>syncLayers(si));renderConti();if(typeof rerenderCuts==='function')rerenderCuts();
  toast(`${i+1}번 컷 「${key}」에 고른 그림을 썼어요${poseShare(x)>1?` · 같은 자세 ${poseShare(x)}컷도 함께`:''}`,2400)}
