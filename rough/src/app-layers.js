
// ---------- 요소별 레이어: 컷 하나를 배경 · 인물마다 · 함께 나오는 장면으로 따로 뽑아 겹침 ----------
// 프롬프트는 RoughNAI.layers. 배경은 레이어 배경 자리(IMG.lybg, layerBg=같이 쓰는 키 — 한 컷 그림 IMG.cut과 따로), 인물·함께·(따로 고른)소품은 흰 배경을 지운 PNG를
// 편집 이미지 소재(pageEdits[slot].overlays, layer·key 표시)로 겹쳐 편집에서 레이어로 옮기고 PSD에서도 레이어 하나씩.
//   고정: 배경은 같은 씬·같은 장소·앵글 컷끼리, 인물·함께는 같은 자세면 씬·컷을 넘어 한 장, 따로 고른 소품은 모든 씬이 한 장
//   소품은 기본으로 녹여 넣음(든 인물 레이어 또는 배경). 컷마다 pageEdits[slot].propAttach[이름] = 'auto'|'bg'|'layer'|'char:이름'
//   함께 레이어에 그림을 넣으면 그 컷에서는 함께 그림을 쓰고 그 인물들의 개별 레이어는 뺌
// 인물·함께·소품 그림은 늘 흰색 자동 투명(배경 레이어는 그대로)
const LAYER_CUT=true;
// 레이어 기본 크기: 그림 비율과 칸 높이(컷 세로/가로 = p.h)로 폭(%)을 정함. 인물·함께는 샷별로 칸 높이의 몇 %를 차지하고 칸 아래에 붙임(클로즈업·디테일은 가운데)
const LAYER_HF={설정:.38,전경:.55,전신:.92,중경:.96,클로즈업:1,디테일:.9,SD:.7,'화면 인서트':.8,'효과 배경':.9};
function fitLayer(x,a,L){if(!a?.w||!a?.h)return{x:x.x,y:x.y,scale:x.scale};const r=L.p.h||1;
  if(x.kind==='prop'){const hf=Math.min(.9,(x.scale/100)*(a.h/a.w)/r);return{x:x.x,y:x.y,scale:Math.round(Math.min(140,hf*r*(a.w/a.h)*100))}}
  const hf=LAYER_HF[L.p.shot]??.9,mid=L.p.shot==='클로즈업'||L.p.shot==='디테일';
  return{x:x.x,y:Math.round(mid?50:100-hf*50),scale:Math.max(8,Math.round(Math.min(140,hf*r*(a.w/a.h)*100)))}}
function setLayerMode(on){LAYER_MODE=!!on;try{localStorage.setItem('rough-layer-mode',on?'1':'0')}catch(_){}if(on)SCENES.forEach((_,si)=>syncLayers(si));renderConti();
  // 편집·씬 미리보기도 바로 바꿈(켜면 레이어 배경+인물·소품 레이어, 끄면 한 컷 그림)
  try{SA_CACHE?.clear?.()}catch(_){}if(typeof rerenderCuts==='function')rerenderCuts();if(typeof render==='function')render();if(VIEW==='webtoon')renderWebtoon();window.RoughOverlayPanel?.refresh?.();
  toast(on?'요소별 레이어로 뽑아요 · 편집·씬 미리보기도 레이어 그림으로 보여요':'컷 한 장으로 뽑아요 · 편집·씬 미리보기도 한 컷 그림으로 보여요(레이어 그림은 그대로 남아 있어요)',2600)}
// 장면 하나의 컷마다 레이어 설계(지금 씬은 Claude가 다듬은 프롬프트, 다른 씬은 규칙 초안)
function layerPlan(si){const cur=si===SCUR,ps=cur?state.panels:panelsOf(si);if(!ps.length)return[];
  const L=cur?naiCuts():(()=>{const chars=naiChars(),ctx={chars,style:NAISTYLE,tags:NAITAGS,refs:{char:n=>!!IMG.char[n]},worldTags:WORLD.tags||'',sceneMood:sceneMoodOf(si,ps),propVis:propVisOf(si),loreTags:p=>loreHits(p.act||'').filter(e=>e.cat!=='item').flatMap(e=>loreTagList(e)),props:propsFor};return ps.map((p,i)=>({p,i,o:NAI.cut(p,i,ps,ctx)}))})();
  const eds=SCENES[si].pageEdits||[];
  return L.map(({p,i,o})=>{const slot=cutSlot(p,i);return{p,i,slot,...NAI.layers(o,p,{style:NAISTYLE,i,attach:nm=>(eds[slot]?.propAttach||{})[nm]||'auto'})}})}
// 인물은 자세 키(pose)가 같으면 어느 씬·컷이든 같은 그림. 자세 키가 없던 예전 그림은 그 컷에서만
const layerAsset=(kind,key,sid,slot,pose)=>{const A=Object.values(IMG.overlay).filter(a=>a.layer&&a.layer.kind===kind&&a.layer.key===key);if(kind==='prop')return A[0];
  return A.find(a=>pose&&a.layer.pose===pose)||A.find(a=>!a.layer.pose&&a.layer.scene===sid&&a.layer.slot===slot)};
const charOf=(L,x,sid)=>layerAsset(x.kind,x.key,sid,L.slot,x.pose);
const layerItem=(L,kind,key)=>kind==='group'?(L.group&&L.group.key===key?L.group:null):(kind==='char'?L.chars:L.props).find(v=>v.key===key);
// 이 씬에서 같은 자세 인물 그림을 같이 쓰는 컷 수
const poseShare=x=>layerPlan(SCUR).filter(L=>x.kind==='group'?L.group?.pose===x.pose:L.chars.some(c=>c.pose===x.pose)).length;
const layerBgOf=(si,key)=>Object.values(IMG.lybg).find(r=>r.scene===SCENES[si].id&&r.layerBg===key);
// 등록한 레이어 그림을 컷에 맞춰 둠: 같은 키 배경을 빈 컷에 복사, 인물·소품 소재를 컷 소재 목록에 추가(이미 있으면 그림만 바꿈, 위치·크기는 그대로)
function syncLayers(si){const sc=SCENES[si];if(!sc)return 0;const plan=layerPlan(si);let n=0;sc.pageEdits||=[];
  for(const L of plan){const id=lybId(sc.id,L.i),cur=IMG.lybg[id];
    if(L.bg.shared&&(!cur||cur.layerBg)){const src=layerBgOf(si,L.bg.key);if(src&&(!cur||cur.src!==src.src||cur.layerBg!==L.bg.key)){const o={...src,id,idx:L.i,sig:L.p.key};IMG.lybg[id]=o;idb.put(o);n++}}
    const ga=L.group&&charOf(L,L.group,sc.id),covered=new Set(ga?L.group.names:[]),chars=L.chars.filter(x=>!covered.has(x.key)),seps=L.props.filter(x=>x.sep);
    const want=[...(ga?[[L.group,ga]]:[]),...chars.map(x=>[x,charOf(L,x,sc.id)]),...seps.map(x=>[x,layerAsset('prop',x.key)])].filter(([,a])=>a);
    // 이 컷에 맞지 않는 레이어는 뺌(글에서 사라진 인물·소품, 녹여 넣기로 바꾼 소품, 함께 그림이 대신하는 개별 인물). 직접 넣은 소재(layer 없음)는 그대로
    const ok=new Set([...(ga?['group:'+L.group.key]:[]),...chars.map(x=>'char:'+x.key),...seps.map(x=>'prop:'+x.key)]),cur0=sc.pageEdits[L.slot]?.overlays;
    if(cur0?.some(v=>v.layer&&!ok.has(v.layer+':'+v.key))){sc.pageEdits[L.slot].overlays=cur0.filter(v=>!v.layer||ok.has(v.layer+':'+v.key));n++}
    if(!want.length)continue;const ed=sc.pageEdits[L.slot]||={},ov=ed.overlays||=[];
    for(const [x,a] of want){const has=ov.find(v=>v.layer===x.kind&&v.key===x.key);
      // 새로 놓을 때·자동 크기 그대로인데 그림이 바뀌면 그림 비율에 맞춰 크기·위치를 다시. 편집에서 옮기거나 키운 레이어(auto 없음)는 그대로
      if(has){if(has.asset!==a.id){has.asset=a.id;if(has.auto)Object.assign(has,fitLayer(x,a,L));n++}}else{ov.push({asset:a.id,layer:x.kind,key:x.key,...fitLayer(x,a,L),auto:1});n++}}}
  if(n)saveScenes();return n}
// 흰 배경 지우기(인물·함께·소품 레이어, 배경 레이어는 그대로)
//   1) 테두리에서 이어진 밝고 채도 낮은 픽셀(거의 흰색) → 투명
//   2) 완전 흰색(#fafafa 이상·무채색) 덩어리는 테두리와 떨어져 있어도 투명(팔과 몸 사이·두 인물 사이 빈틈 등).
//      단 아주 작은 덩어리(눈 하이라이트·작은 반사광, 그림 넓이의 0.05% 또는 60픽셀 미만)는 남김
//   3) 지운 곳과 맞닿은 경계는 밝기에 따라 반투명으로 부드럽게
function whiteCutout(d,w,h){const px=d.data,N=w*h,seen=new Uint8Array(N),near=k=>{const r=px[k*4],g=px[k*4+1],b=px[k*4+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mn>=228&&mx-mn<=22},
    pure=k=>{const r=px[k*4],g=px[k*4+1],b=px[k*4+2];return Math.min(r,g,b)>=250&&Math.max(r,g,b)-Math.min(r,g,b)<=6};
  const st=[];for(let x=0;x<w;x++){st.push(x,(h-1)*w+x)}for(let y=0;y<h;y++){st.push(y*w,y*w+w-1)}
  while(st.length){const k=st.pop();if(seen[k]||!near(k))continue;seen[k]=1;const x=k%w;
    if(x>0)st.push(k-1);if(x<w-1)st.push(k+1);if(k>=w)st.push(k-w);if(k<N-w)st.push(k+w)}
  const minA=Math.max(60,Math.round(N*.0005)),mark=new Uint8Array(N);
  for(let s0=0;s0<N;s0++){if(seen[s0]||mark[s0]||!pure(s0))continue;const reg=[];const q=[s0];mark[s0]=1;
    while(q.length){const k=q.pop();reg.push(k);const x=k%w;for(const j of [x>0?k-1:-1,x<w-1?k+1:-1,k>=w?k-w:-1,k<N-w?k+w:-1])if(j>=0&&!mark[j]&&!seen[j]&&pure(j)){mark[j]=1;q.push(j)}}
    if(reg.length>=minA)for(const k of reg)seen[k]=1}
  for(let k=0;k<N;k++)if(seen[k])px[k*4+3]=0;
  for(let k=0;k<N;k++){if(seen[k])continue;const x=k%w;let e=0;
    if(x>0&&seen[k-1])e++;if(x<w-1&&seen[k+1])e++;if(k>=w&&seen[k-w])e++;if(k<N-w&&seen[k+w])e++;
    if(e){const l=Math.min(px[k*4],px[k*4+1],px[k*4+2]);px[k*4+3]=Math.min(px[k*4+3],l>200?Math.round(255*(1-(l-200)/55)*.9+20):255-e*25)}}
  return d}
async function layerPNG(file,label,cut){const url=URL.createObjectURL(file);try{const im=await loadImg(url);const k=Math.min(1,1536/Math.max(im.naturalWidth,im.naturalHeight));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));const g=c.getContext('2d');g.drawImage(im,0,0,c.width,c.height);
  if(cut)g.putImageData(whiteCutout(g.getImageData(0,0,c.width,c.height),c.width,c.height),0,0);
  return{id:'overlay:'+(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)),kind:'overlay',name:label,src:c.toDataURL('image/png'),w:c.width,h:c.height}}finally{URL.revokeObjectURL(url)}}
// 레이어 그림 넣기: kind bg|char|prop, i=지금 씬 컷 번호
async function layerPut(file,i,kind,key){if(!file||!file.type.startsWith('image/'))return;const L=layerPlan(SCUR)[i];if(!L)return;const sid=SCENES[SCUR].id;
  if(kind==='bg'){const im=await shrink(file,1380);const o={id:lybId(sid,i),kind:'layerbg',scene:sid,idx:i,sig:L.p.key,src:im.src,w:im.w,h:im.h,layerBg:L.bg.shared?L.bg.key:''};IMG.lybg[o.id]=o;await idb.put(o);
    // 같은 키(같은 장소·앵글)로 이미 배경을 같이 쓰던 컷도 새 배경으로
    if(L.bg.shared)for(const r of Object.values(IMG.lybg))if(r.scene===sid&&r.layerBg===L.bg.key&&r.id!==o.id){r.src=o.src;r.w=o.w;r.h=o.h;idb.put(r)}}
  else{const x=layerItem(L,kind,key);if(!x)return;const old=kind==='prop'?layerAsset(kind,key):charOf(L,x,sid);
    const a=await layerPNG(file,x.label,LAYER_CUT);a.layer=kind==='prop'?{kind,key}:{kind,key,pose:x.pose,scene:sid,slot:L.slot};
    IMG.overlay[a.id]=a;await idb.put(a);if(old){delete IMG.overlay[old.id];idb.del(old.id)}}
  const n=syncLayers(SCUR);if(kind!=='bg')SCENES.forEach((_,si)=>{if(si!==SCUR)syncLayers(si)});
  renderConti();if(typeof rerenderCuts==='function')rerenderCuts();
  toast(kind==='bg'?`배경을 넣었어요${L.bg.shared?` · 같은 장소 컷 ${layerPlan(SCUR).filter(x=>x.bg.shared&&x.bg.key===L.bg.key).length}개가 같이 써요`:''}`:kind==='prop'?`소품 「${key}」 그림을 넣었어요 · 이 소품이 나오는 모든 컷에 같은 그림이 들어가요`:`${i+1}번 컷 ${kind==='group'?'함께':'인물'} 「${kind==='group'?L.group.names.join('·'):key}」 레이어를 넣었어요${(()=>{const x=layerItem(L,kind,key),k=x?poseShare(x):1;return k>1?` · 같은 자세 ${k}컷이 같이 써요`:''})()}${kind==='group'?' · 이 컷은 개별 인물 대신 함께 그림을 써요':''}${LAYER_CUT?' · 흰 배경을 지웠어요':''}`,2600)}
function layerDel(i,kind,key){const L=layerPlan(SCUR)[i];if(!L)return;const sid=SCENES[SCUR].id;
  if(kind==='bg'){const r=IMG.lybg[lybId(sid,i)];if(r)for(const x of Object.values(IMG.lybg))if(x.id===r.id||(r.layerBg&&x.scene===sid&&x.layerBg===r.layerBg)){delete IMG.lybg[x.id];idb.del(x.id)}}
  else{const x=layerItem(L,kind,key),a=kind==='prop'?layerAsset(kind,key):(x&&charOf(L,x,sid));if(a){delete IMG.overlay[a.id];idb.del(a.id)}
    SCENES.forEach(sc=>(sc.pageEdits||[]).forEach(ed=>{if(ed?.overlays)ed.overlays=ed.overlays.filter(v=>!(v.layer===kind&&v.key===key&&(!a||v.asset===a.id)))}));saveScenes()}
  SCENES.forEach((_,si)=>syncLayers(si));renderConti();if(typeof rerenderCuts==='function')rerenderCuts()}
// 소품 넣는 곳 바꾸기(컷마다)
function setPropAttach(i,name,v){const L=layerPlan(SCUR)[i];if(!L)return;const E=SCENES[SCUR].pageEdits||=[],ed=E[L.slot]||=({});
  const m=ed.propAttach||={};if(!v||v==='auto')delete m[name];else m[name]=v;if(!Object.keys(m).length)delete ed.propAttach;saveScenes();syncLayers(SCUR);renderConti();
  toast(`${i+1}번 컷 소품 「${name}」: ${v==='layer'?'따로 레이어로 뽑아요':v==='hide'?'화면 밖 — 소품은 빼고 나온 효과만':v==='bg'?'배경 프롬프트에 넣어요':v?.startsWith('char:')?v.slice(5)+' 레이어에 넣어요':'자동으로 정해요(들고 있으면 인물, 아니면 배경)'}`,2400)}
// 콘티 카드: 겹친 미리보기 + 레이어 줄(그림 칸 · 프롬프트 복사)
function layerPreview(L,o){const sid=SCENES[SCUR].id,bg=IMG.lybg[lybId(sid,L.i)],ed=(SCENES[SCUR].pageEdits||[])[L.slot],ov=(ed?.overlays||[]).filter(v=>IMG.overlay[v.asset]);
  return `<div class="ly-prev" style="aspect-ratio:${o.size.w}/${o.size.h}">${bg?`<img class="ly-bg" src="${bg.src}" alt="">`:'<span class="ly-empty">배경 없음</span>'}${ov.map(v=>`<img class="ly-ov" src="${IMG.overlay[v.asset].src}" alt="" style="left:${v.x??50}%;top:${v.y??50}%;width:${v.scale??100}%">`).join('')}</div>`}
function layerRows(L,o,dim){const sid=SCENES[SCUR].id,bg=IMG.lybg[lybId(sid,L.i)],share=L.bg.shared?layerPlan(SCUR).filter(x=>x.bg.shared&&x.bg.key===L.bg.key).length:1;
  const slotB=(x,im)=>`<div class="drop ly-slot${im?' has':''}" tabindex="0" role="button" data-lyslot="${L.i}" aria-label="${esc(x.label)} 그림 ${im?'바꾸기':'넣기'}">${im?`<img src="${im.src}" alt=""><button class="x" data-lydel="${L.i}" aria-label="${esc(x.label)} 그림 빼기">×</button>`:'<span>+</span>'}</div>`;
  const head=(x,meta)=>`${esc(x.label)} <small>${x.size.w}×${x.size.h}${meta?' · '+meta:''}</small>`;
  const row=(kind,x,im,meta,extra='')=>`<div class="ly-row" data-ly="${kind}" data-key="${esc(x.key)}">${slotB(x,im)}
    <div class="ly-main">${x.blocks?`<div class="ly-gh">${head(x,meta)}</div>${x.blocks.map(b=>ctBlk(b.title,b.text,dim)).join('')}`:ctBlk(head(x,meta),x.prompt,dim)}${extra}</div></div>`;
  const pickOther=x=>{const other=Object.values(IMG.overlay).filter(a=>a.layer?.kind===x.kind&&a.layer.key===x.key&&a.layer.pose!==x.pose);
    return other.length?`<select class="ly-pick" data-lypick="${L.i}" aria-label="${esc(x.label)}의 다른 컷 그림 쓰기"><option value="">다른 컷 그림 쓰기…</option>${other.map((a,n)=>`<option value="${esc(a.id)}">${esc(x.kind==='group'?x.names.join('·'):x.name)} 그림 ${n+1}${a.layer.slot!=null?` (${a.layer.scene===sid?'이 씬 ':''}${a.layer.slot+1}번 컷)`:''}</option>`).join('')}</select>`:''};
  const att=x=>{const v=((SCENES[SCUR].pageEdits||[])[L.slot]?.propAttach||{})[x.name]||'auto',now=x.at.to==='char'?`${x.at.name} 레이어에 녹여 넣어요`:x.at.to==='bg'?'배경에 녹여 넣어요':'따로 레이어';
    return `<div class="ly-row ly-prop" data-ly="prop" data-key="${esc(x.key)}">${x.sep?slotB(x,layerAsset('prop',x.key)):`<div class="ly-slot ly-melt" aria-hidden="true">◆</div>`}<div class="ly-main"><div class="ly-gh">${esc(x.label)} <small>${esc(now)}${x.needsTags?' · 태그는 컷 프롬프트 생성 때 정해져요':''}</small>
      <select class="ly-att" data-lyatt="${L.i}" aria-label="소품 ${esc(x.name)} 넣는 곳"><option value="auto"${v==='auto'?' selected':''}>자동</option>${L.chars.map(c=>`<option value="char:${esc(c.name)}"${v==='char:'+c.name?' selected':''}>${esc(c.name)}에게</option>`).join('')}<option value="bg"${v==='bg'?' selected':''}>배경에</option><option value="layer"${v==='layer'?' selected':''}>따로 레이어</option><option value="hide">화면 밖(효과만)</option></select></div>${x.sep?ctBlk(head(x,'모든 컷에 같은 그림'),x.prompt,dim):''}</div></div>`};
  const ga=L.group&&charOf(L,L.group,sid);
  return `<div class="ct-layers"><div class="ct-ph"><span>요소별 레이어</span><small>위에서부터 아래 레이어 · 편집에서 위치·크기를 옮겨요</small></div>
    ${L.props.map(att).join('')}${(L.propsOff||[]).map(x=>`<div class="ly-row ly-prop" data-ly="prop" data-key="${esc(x.name)}"><div class="ly-slot ly-melt off" aria-hidden="true">◇</div><div class="ly-main"><div class="ly-gh">소품 ${esc(x.name)} <small>화면 밖${x.emit.length?' · '+esc(x.emit.join(', '))+'만':''}</small><button type="button" class="link" data-propvis="${L.i}" data-name="${esc(x.name)}">화면에 보이게</button></div></div></div>`).join('')}
    ${L.group?row('group',L.group,ga,`${L.group.interact.length?esc(L.group.interact.join(', '))+' · ':''}${poseShare(L.group)>1?`같은 자세 ${poseShare(L.group)}컷이 같이 씀 · `:''}넣으면 이 컷은 개별 인물 대신 이 그림`,pickOther(L.group)):''}
    ${L.chars.map(x=>{const k=poseShare(x);return row('char',x,charOf(L,x,sid),`${ga&&L.group.names.includes(x.key)?'함께 그림을 쓰는 중 · ':''}${x.holds.length?'◆'+esc(x.holds.join('·'))+' 듦 · ':''}${k>1?`같은 자세 ${k}컷이 같이 씀 · `:''}위치 ${x.x}·${x.y} · 폭 ${x.scale}%`,pickOther(x))}).join('')}
    ${row('bg',L.bg,bg,L.bg.shared?`같은 장소 ${share}컷이 같이 씀`:'이 컷만')}</div>`}
{const el=$('#conti');let pick=null;const fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.hidden=true;document.body.appendChild(fi);
  const who=e=>{const r=e.target.closest('.ly-row'),k=r?.querySelector('[data-lyslot],[data-lyatt],[data-lypick]');return r&&k?[+(k.dataset.lyslot??k.dataset.lyatt??k.dataset.lypick),r.dataset.ly,r.dataset.key]:null};
  el.addEventListener('click',e=>{if(e.target.closest('[data-layermode]')||e.target.closest('[data-layercut]'))return;
    const d=e.target.closest('[data-lydel]');if(d){e.stopPropagation();const w=who(e);if(w)layerDel(...w);return}
    const s=e.target.closest('[data-lyslot]');if(s){e.stopPropagation();pick=who(e);fi.click()}});
  el.addEventListener('keydown',e=>{const s=e.target.closest?.('[data-lyslot]');if(s&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pick=who(e);fi.click()}});
  fi.addEventListener('change',()=>{const f=fi.files[0];fi.value='';if(f&&pick)layerPut(f,...pick)});
  el.addEventListener('dragover',e=>{if(e.target.closest('[data-lyslot]'))e.preventDefault()});
  el.addEventListener('drop',e=>{const s=e.target.closest('[data-lyslot]');if(!s)return;e.preventDefault();e.stopPropagation();const f=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));const w=who(e);if(f&&w)layerPut(f,...w)},true);
  // 다른 컷 그림 쓰기: 그 그림을 이 컷 자세 키로도 등록(같은 자세 컷도 함께)
  el.addEventListener('change',e=>{const s=e.target.closest('[data-lypick]');if(!s||!s.value)return;const w=who(e),src=IMG.overlay[s.value];if(!w||!src)return;layerReuse(w[0],w[1],w[2],src)});
  el.addEventListener('change',e=>{const s=e.target.closest('[data-lyatt]');if(!s)return;const r=s.closest('.ly-row');setPropAttach(+s.dataset.lyatt,r.dataset.key,s.value)});
  el.addEventListener('change',e=>{if(e.target.matches('[data-layermode]'))setLayerMode(e.target.checked);
  })}
// 편집 화면: 레이어(이미지 소재)를 눌러 고르고 끌어서 옮김. 고르면 오른쪽 이미지 패널도 그 레이어(크기·회전·투명도)
{let drag=null;
  pageReader.addEventListener('pointerdown',e=>{if(!pageEditing||e.button!==0||materialMode)return;const ov=e.target.closest('[data-overlay]');if(!ov)return;
    const group=ov.closest('[data-slot-index]');if(!group)return;e.preventDefault();e.stopPropagation();
    selectPageCut(group);selectLetter(null);const i=+ov.dataset.overlay;window.RoughOverlayPanel?.select(i);
    pageReader.querySelectorAll('.ov-pick.on').forEach(x=>x.classList.remove('on'));ov.classList.add('on');
    const [,,,,bw,bh]=(ov.dataset.ovBox||'').split(',').map(Number),svg=ov.ownerSVGElement,st=pageSettings(true,pageKey(group)),L=st.overlays?.[i];if(!L||!bw||!bh)return;
    drag={id:e.pointerId,ov,svg,key:pageKey(group),i,start:pagePoint(svg,e),x0:L.x??50,y0:L.y??50,bw,bh,inner:ov.firstElementChild,tf:ov.firstElementChild.getAttribute('transform')||'',moved:false};
    pageReader.setPointerCapture(e.pointerId)},true);
  pageReader.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const pt=pagePoint(drag.svg,e),dx=pt.x-drag.start.x,dy=pt.y-drag.start.y;
    if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;drag.inner.setAttribute('transform',`translate(${dx} ${dy}) ${drag.tf}`);drag.dx=dx;drag.dy=dy},true);
  const end=e=>{if(drag?.id!==e.pointerId)return;const d=drag;drag=null;try{pageReader.releasePointerCapture(e.pointerId)}catch(_){}
    if(!d.moved){window.RoughOverlayPanel?.refresh();return}
    const st=pageSettings(true,d.key),L=st.overlays?.[d.i];if(!L)return;
    L.x=Math.round((d.x0+d.dx/d.bw*100)*10)/10;L.y=Math.round((d.y0+d.dy/d.bh*100)*10)/10;delete L.auto;saveScenes();renderWebtoon();
    const g=pageReader.querySelector(`section[data-page-scene="${d.key.split(':')[0]}"] [data-slot-index="${d.key.split(':')[1]}"] [data-overlay="${d.i}"]`);g?.classList.add('on');window.RoughOverlayPanel?.select(d.i)};
  pageReader.addEventListener('pointerup',end,true);pageReader.addEventListener('pointercancel',end,true);
  // 고른 레이어 크기: Alt+휠
  pageReader.addEventListener('wheel',e=>{if(!pageEditing||!e.altKey)return;const ov=e.target.closest('[data-overlay]');if(!ov)return;const group=ov.closest('[data-slot-index]');if(!group)return;e.preventDefault();
    const st=pageSettings(true,pageKey(group)),L=st.overlays?.[+ov.dataset.overlay];if(!L)return;L.scale=Math.max(5,Math.min(300,Math.round((L.scale??100)*(e.deltaY<0?1.05:1/1.05))));delete L.auto;saveScenes();renderWebtoon();
    selectPageCut(pageReader.querySelector(`section[data-page-scene="${pageKey(group).split(':')[0]}"] [data-slot-index="${pageKey(group).split(':')[1]}"]`)||group);window.RoughOverlayPanel?.select(+ov.dataset.overlay)},{passive:false})}

async function layerReuse(i,kind,key,src){const L=layerPlan(SCUR)[i],x=L&&layerItem(L,kind,key);if(!x)return;const sid=SCENES[SCUR].id,old=charOf(L,x,sid);
  const a={...src,id:'overlay:'+(crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)),layer:{kind,key,pose:x.pose,scene:sid,slot:L.slot}};
  IMG.overlay[a.id]=a;await idb.put(a);if(old){delete IMG.overlay[old.id];idb.del(old.id)}SCENES.forEach((_,si)=>syncLayers(si));renderConti();if(typeof rerenderCuts==='function')rerenderCuts();
  toast(`${i+1}번 컷 「${key}」에 고른 그림을 썼어요${poseShare(x)>1?` · 같은 자세 ${poseShare(x)}컷도 함께`:''}`,2400)}
