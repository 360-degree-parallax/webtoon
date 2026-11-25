// 러프 툴 본체 4/6 — 편집: 씬 그림·프레임·그림 확대·작업 파일·대사 교정·분할 내보내기
// 원본 조각: tools/build_app.py가 6개를 순서대로 이어 rough/app.js를 만듦(사이트는 app.js 하나를 실음 — 조각끼리 불러올 때 서로 부르는 곳이 많아 따로 싣지 않음)
// ---------- 씬 · 편집 ----------
$('#sctitle').value=SCENES[SCUR].title||'';
$('#sctitle').addEventListener('input',e=>{SCENES[SCUR].title=e.target.value;saveScenes();renderSceneList()});
document.addEventListener('click',e=>{const t=e.target;
  const remove=t.closest('[data-scene-delete]');if(remove){deleteScene(Number(remove.dataset.sceneDelete));return}
  const sb=t.closest('[data-scene]');if(sb){switchScene(+sb.dataset.scene);return}
  const mv=t.closest('[data-scmove]');if(mv){switchScene(SCUR+(+mv.dataset.scmove));return}
  const a=t.closest('[data-act]')?.dataset.act;
  if(a==='addscene'){saveScenes();SCENES.push({id:'s'+Date.now(),title:'',cuts:[''],pageEdits:[]});switchScene(SCENES.length-1);$('#sctitle').focus()}
  if(a==='adddemo'){saveScenes();const first=SCENES.length;SCENES.push(...DEFAULT_SCENES.map((d,k)=>({id:'s'+Date.now()+k,title:d.title,cuts:d.cuts.slice(),pageEdits:[]})));switchScene(first);toast('예시 씬 2개를 추가했어요')}
  if(a==='pjsave'){closeXMenu();saveProject()}
  if(a==='pjload'){closeXMenu();loadProjectPick()}
  if(a==='pjhist'){closeXMenu();openHistory()}
  if(a==='wslice'){closeXMenu();confirmArtCheck().then(ok=>{if(ok)openSliceDialog()})}
  if(a==='wsave'||a==='wsvg'||a==='wpsd'){closeXMenu();const st=t=>$('#wst').textContent=t;
    confirmArtCheck().then(ok=>{if(!ok)return;const run=a==='wsave'?saveWebtoon():a==='wsvg'?RoughExport.exportSVG(st):RoughExport.exportPSD(st);
    Promise.resolve(run).then(()=>{if(VIEW!=='webtoon')toast($('#wst').textContent)}).catch(err=>{console.error(err);if(VIEW!=='webtoon')toast('내보내기 실패: '+(err.message||err));st(a==='wsave'?'소재 또는 이미지를 불러오지 못했어요. 다시 저장해 주세요.':'내보내기 실패: '+(err.message||err))})})}
  if(t.closest('#wexport')){const m=$('#wxmenu'),open=m.hidden;m.hidden=!open;$('#wexport').setAttribute('aria-expanded',open);if(open)m.querySelector('button').focus()}
  else if(!t.closest('#wxmenu'))closeXMenu()});
function closeXMenu(){const m=$('#wxmenu');if(m&&!m.hidden){m.hidden=true;$('#wexport').setAttribute('aria-expanded','false')}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#wxmenu').hidden){closeXMenu();$('#wexport').focus()}});
document.addEventListener('change',e=>{if(e.target.matches('[data-scsel]'))switchScene(+e.target.value)});
const WMODE='final';  // 편집 화면은 늘 완성본(등록 그림, 없으면 레퍼런스). 완성본/러프 전환은 뺌
try{$('#wtitle').value=localStorage.getItem('rough-work-title')||'녹빛자정의 연인 · 예시'}catch(_){$('#wtitle').value='제목 없는 작품'}
$('#wtitle').addEventListener('input',e=>{try{localStorage.setItem('rough-work-title',e.target.value)}catch(_){}});
// 다른 씬의 컷 계산은 글·고른 레퍼런스·고정값이 같으면 다시 돌리지 않음(레이어 패널·씬 경계 색이 컷마다 불러 무거웠음)
var SP_CACHE=new Map(),SP_FRESH=null;  // SP_FRESH: 이번 작업 안에서 이미 확인한 씬(같은 작업 안에서 수백 번 불려 확인 비용도 컸음)
function spStale(){SP_FRESH=null}
function scenePanels(i){if(i===SCUR)return state.panels;const sc=SCENES[i];if(!sc)return [];
  if(SP_FRESH?.has(i)&&SP_CACHE.has(i))return SP_CACHE.get(i).v;if(!SP_FRESH){SP_FRESH=new Set();queueMicrotask(spStale)}SP_FRESH.add(i);
  const refs=Array.from(sc.pageEdits||[],e=>e?.ref||0);while(refs.length&&!refs.at(-1))refs.pop();  // 빈 칸이 늘기만 해도 다시 계산하던 것 막기
  const ck=JSON.stringify([sc.cuts,refs,locks,engineChars(),REFS.length,PATS.length]),hit=SP_CACHE.get(i);if(hit&&hit.k===ck)return hit.v;
  const out=_scenePanels(i);SP_CACHE.set(i,{k:ck,v:out});return out}
// 처음 편집 화면을 열 때 기다리지 않게: 쉬는 틈에 다른 씬 컷 계산을 미리 해 둠
(function warmScenes(i=0){if(typeof PATS==='undefined'||!PATS.length||typeof SCENES==='undefined')return setTimeout(warmScenes,600,i);if(i>=SCENES.length)return;
  (window.requestIdleCallback||(f=>setTimeout(f,50)))(()=>{try{scenePanels(i)}catch(_){}warmScenes(i+1)},{timeout:3000})})();
function _scenePanels(i){const an=RE.analyzeCuts(SCENES[i].cuts,engineChars());const out=[];
  an.forEach((a,ci)=>{const r=RE.rank(a,PATS,1)[0];if(!r)return;RE.layout(a,r.p).forEach(c=>{const L=locks[c.key]||{};Object.assign(c,L);c.lock=L;c.chunk=ci;c.ref=pickRef(c,SCENES[i].pageEdits,out.length);out.push(c)})});out.forEach((c,k)=>c.side=k%2?'left':'right');return out}
// 씬 끝 색(sc.endTo): 'next'(기본) 다음 씬 첫 컷 배경으로 이어감 · 'white' 흰색으로 · 'hold' 마지막 컷 색 유지. 마지막 씬은 기본이 흰색
function sceneEndColor(i,ps){const sc=SCENES[i],mode=sc.endTo||ps.map(p=>RoughGrammar.fromText(p)?.endTo).filter(Boolean).at(-1)||'next';
  if(mode==='hold'){const last=ps.at(-1);return last?pageBackground(RoughGrammar.merge(sc.pageEdits?.[cutSlot(last,ps.length-1)],last)):PAGE_WHITE}
  if(mode==='white'||i>=SCENES.length-1)return PAGE_WHITE;
  for(let k=i+1;k<SCENES.length;k++){const nps=scenePanels(k);if(nps.length)return pageBackground(RoughGrammar.merge(SCENES[k].pageEdits?.[cutSlot(nps[0],0)],nps[0]))}
  return PAGE_WHITE}
// 완성본: 등록한 컷 이미지를 쓰고, 없는 컷은 러프
// 씬 그림 캐시: 씬 글·편집값·컷 결과·그림 목록·전역 설정이 그대로면 지난 SVG를 다시 씀
// (편집 한 번에 모든 씬 SVG를 새로 만들던 비용 — 70컷 기준 ~80ms). ?sacheck 로 열면 매번 새로 그려 견줘 봄
const SA_CACHE=new Map();let SA_G='',SA_ON=false;
function imgSig(){const out=[];const rec=v=>v?(typeof v==='string'?v.length+v.slice(-16):(v.id||'')+':'+(v.src?v.src.length+v.src.slice(-16):'')+':'+(v.op??'')+(v.at||'')):'';
  for(const [k,b] of Object.entries(IMG)){if(!b)continue;if(Array.isArray(b))out.push(k+b.map(rec).join(','));else if(b.src)out.push(k+rec(b));else out.push(k+Object.entries(b).map(([n,v])=>n+'='+rec(v)).join(','))}return out.join('|')}
function saGlobal(){try{return JSON.stringify([typeof PAGE_FONT!=='undefined'?PAGE_FONT:'',typeof PAGE_PRESET!=='undefined'?PAGE_PRESET:'',typeof showUnder!=='undefined'?showUnder:'',CHARS,typeof LORE!=='undefined'?LORE:'',imgSig(),window.RoughMaterials?.artVer,typeof SFX_TYPE!=='undefined'?SFX_TYPE:''])}catch(_){return Math.random()+''}}
const SA_CHECK=/[?&]sacheck/.test(location.search);
function sceneArt(i,ps,pre,interactive=false){
  const sc=SCENES[i],end=sceneEndColor(i,ps);let k;
  try{k=JSON.stringify([SA_G,ps,sc.pageEdits,pre,interactive,end,WMODE==='final'?ps.map((p,n)=>{const im=cutImg(i,n,p);return im?[im.src?.length,im.src?.slice(-16),im.stale,im.crop,im.x,im.y,im.s]:0}):0])}catch(_){k=null}
  if(!SA_ON)return _sceneArt(i,ps,pre,interactive);  // 편집 화면 그리기에서만 캐시(내보내기·버전 비교 등은 늘 새로)
  const hit=k&&SA_CACHE.get(i);if(hit&&hit.k===k&&!SA_CHECK)return hit.v;
  const v=_sceneArt(i,ps,pre,interactive);
  if(SA_CHECK&&hit&&hit.k===k&&hit.v.svg!==v.svg){let d=0;while(hit.v.svg[d]===v.svg[d])d++;console.warn('sceneArt cache mismatch',i,hit.v.svg.slice(Math.max(0,d-160),d+80),' ||| ',v.svg.slice(Math.max(0,d-160),d+80))}
  if(k)SA_CACHE.set(i,{k,v});return v}
function _sceneArt(i,ps,pre,interactive=false){
  const imgs=WMODE==='final'?ps.map((p,k)=>cutImg(i,k,p)||null):null;
  const n=imgs?.filter(Boolean).length||0;
  return {kind:n?(n===ps.length?'img':'mix'):'rough',n,
    svg:renderSVG(ps,-1,pre,false,imgs,false,{edits:SCENES[i].pageEdits,interactive,sceneEnd:sceneEndColor(i,ps)})};
}
let pageEditing=true,pageSelection='',pageDrag=null;
// 그림 편집 모드(피그마 이미지 크롭처럼): 그림을 더블클릭하면 그 컷에서만 Ctrl+휠이 그림 확대로 동작
let cropKey='';
const ART_LABEL={img:'',mix:'일부 러프',rough:'러프'};
// 완성본 점검: 이미지를 한 장이라도 올린 원고에서, 이미지가 없는 컷(러프로 나감)과 이미지 등록 뒤 글이 바뀐 컷을 모음
function artCheck(){const miss=[],stale=[];let imgs=0;
  SCENES.forEach((sc,si)=>scenePanels(si).forEach((p,n)=>{const im=cutImg(si,n,p),it={si,n,key:`${si}:${cutSlot(p,n)}`};if(SCENES[si].pageEdits?.[cutSlot(p,n)]?.blank)return;if(!im)miss.push(it);else{imgs++;if(im.stale)stale.push(it)}}));
  return{miss,stale,imgs,list:[...stale,...miss].sort((a,b)=>a.si-b.si||a.n-b.n)}}
let ACHK=0;
function renderArtCheck(){const el=$('#artcheck');if(!el)return;const c=artCheck();
  if(WMODE!=='final'||!c.imgs||!c.list.length){el.hidden=true;return}
  el.hidden=false;el.innerHTML=`<span>완성본 점검</span>${c.miss.length?`<b>이미지 없음 ${c.miss.length}컷</b><span>(러프로 나가요)</span>`:''}${c.stale.length?`<b>글이 바뀜 ${c.stale.length}컷</b><span>(그림이 예전 글 기준)</span>`:''}<button class="btn" data-achk="1">다음 확인 ›</button>`}
function jumpArtCheck(){const c=artCheck();if(!c.list.length)return;const it=c.list[ACHK++%c.list.length];
  const g=[...pageReader.querySelectorAll('[data-slot-index]')].find(x=>pageKey(x)===it.key);if(g){selectPageCut(g);g.scrollIntoView({block:'center',behavior:'smooth'})}
  toast(`씬 ${it.si+1} · ${it.n+1}번째 컷 — ${c.stale.includes(it)?'글이 바뀐 뒤 그림이 그대로예요':'이미지가 없어 러프로 나가요'}`,2600)}
document.addEventListener('click',e=>{if(e.target.closest('[data-achk]'))jumpArtCheck()});
// 내보내기 전에 한 번 묻기(이미지를 올린 원고만). 돌려주는 값: true면 그대로 진행
function confirmArtCheck(){const c=artCheck();if(!c.imgs||!c.list.length)return Promise.resolve(true);
  return new Promise(res=>{let d=$('#achkdlg');if(!d){d=document.createElement('dialog');d.id='achkdlg';d.className='keydlg';document.body.appendChild(d)}
    d.innerHTML=`<h3>내보내기 전에 확인해 주세요</h3><p>${c.miss.length?`이미지가 없는 컷 <b>${c.miss.length}개</b>는 러프 그림으로 들어가요.<br>`:''}${c.stale.length?`이미지를 올린 뒤 글이 바뀐 컷 <b>${c.stale.length}개</b>는 예전 그림이 그대로 들어가요.`:''}</p><div class="acts"><button class="btn" data-r="check">먼저 확인하기</button><button class="btn dark" data-r="go">그대로 내보내기</button></div>`;
    d.onclick=e=>{const r=e.target.closest('[data-r]')?.dataset.r;if(!r)return;d.close();if(r==='go')res(true);else{res(false);if(VIEW!=='webtoon')showView('webtoon');ACHK=0;setTimeout(jumpArtCheck,150)}};
    d.oncancel=()=>res(false);d.showModal();d.querySelector('[data-r="go"]').focus()})}
// 씬 안에서도 바뀐 부분만: 새 씬을 만들어 두고 SVG 바로 아래 요소(컷 묶음·배경·간격)를 하나씩 견줘 다른 것만 바꿔 끼움.
// 그대로인 컷은 그림을 다시 읽지 않아 빠름. 구조(요소 수·종류)가 다르면 씬 통째로
function patchSection(os,html){const t=document.createElement('template');t.innerHTML=html;const ns=t.content.firstElementChild;if(!ns){os.replaceWith(t.content);return}
  const oc=[...os.children],nc=[...ns.children];if(oc.length!==nc.length||oc.some((c,k)=>c.tagName!==nc[k].tagName)){os.replaceWith(ns);return}
  for(const a of ns.attributes)if(os.getAttribute(a.name)!==a.value)os.setAttribute(a.name,a.value);
  oc.forEach((o,k)=>{const n=nc[k];if(o.tagName.toLowerCase()!=='svg'){if(o.outerHTML!==n.outerHTML)o.replaceWith(n);return}
    const ok=[...o.children],nk=[...n.children];if(ok.length!==nk.length||ok.some((c,j)=>c.tagName!==nk[j].tagName)){o.replaceWith(n);return}
    for(const a of [...o.attributes])if(!n.hasAttribute(a.name))o.removeAttribute(a.name);for(const a of n.attributes)if(o.getAttribute(a.name)!==a.value)o.setAttribute(a.name,a.value);
    ok.forEach((x,j)=>{if(x.outerHTML!==nk[j].outerHTML)x.replaceWith(nk[j])})})}
function renderWebtoon(){SP_FRESH=null;SA_G=saGlobal();SA_ON=true;try{return _renderWebtoon()}finally{SA_ON=false}}
function _renderWebtoon(){if(!PATS.length){refreshPageTools();$('#reader').innerHTML='<p class="empty">패턴을 불러오는 중이에요</p>';return}
  let cuts=0,imgd=0;const parts=SCENES.map((sc,i)=>{const ps=scenePanels(i);cuts+=ps.length;imgd+=cutCount(i,ps);const art=ps.length?sceneArt(i,ps,`w${i}_`,pageEditing):null;
    const body=!ps.length?'<p class="empty">아직 컷이 없어요</p>':art.svg;
    const lab=art&&WMODE==='final'?(art.kind==='mix'?`이미지 ${art.n}/${ps.length}컷 · 나머지 러프`:ART_LABEL[art.kind]):'';
    return `<section id="ws-${i}" data-page-scene="${i}" style="scroll-margin-top:200px"><div class="scn"><span>${esc(sceneLabel(sc,i))}${lab?' · '+lab:''}</span></div>${body}</section>`});
  // 바뀐 씬만 갈아 끼움(작업 중인 씬은 끌기 미리보기가 남지 않게 늘 새로). 70컷이면 화면 전체를 다시 만드는 데 0.1초 넘게 걸렸음
  const R=$('#reader'),olds=[...R.querySelectorAll(':scope>section')],prev=R._parts,act=pageSelection?+pageSelection.split(':')[0]:-1;
  if(prev&&prev.length===parts.length&&olds.length===parts.length&&olds.every((el,i)=>el.id==='ws-'+i)){
    parts.forEach((h,i)=>{if(h===prev[i]&&i!==act)return;patchSection(olds[i],h)})}
  else R.innerHTML=parts.join('');
  R._parts=parts;
  refreshPageTools();
  $('#wstat').textContent=`씬 ${SCENES.length}개 · 컷 ${cuts}개${imgd?` · 이미지 ${imgd}컷 등록`:''}`;renderArtCheck();
  // 레이어 패널은 바로 뒤 editTree가 씬별로 바뀐 것만 고쳐 그림(여기서 통째로 덮으면 매번 처음부터 다시 그려야 했음)
}
$('#wtoc').addEventListener('click',e=>{const a=e.target.closest('[data-toc]');if(!a)return;e.preventDefault();document.getElementById('ws-'+a.dataset.toc)?.scrollIntoView({behavior:'smooth'})});
const pageReader=$('#reader'),pageCut=$('#wcut');
let gapDrag=null,tailDrag=null,selectedLetter=null;
function pageKey(group){return group.closest('section').dataset.pageScene+':'+group.dataset.slotIndex}
function pageSettings(create=false,key=pageSelection){
  const [scene,slot]=key.split(':').map(Number);
  const edits=SCENES[scene].pageEdits;
  if(create&&!edits[slot])edits[slot]={};
  return edits[slot];
}
function refreshPageTools(){
  const previous=selectedLetter&&{key:pageKey(selectedLetter.closest('[data-slot-index]')),letter:selectedLetter.dataset.letter};
  selectLetter(null);
  $('#wtools').hidden=!pageEditing;
  if(!pageEditing)return;
  const groups=[...pageReader.querySelectorAll('[data-slot-index]')];
  pageCut.replaceChildren(...groups.map(group=>new Option(
    `씬 ${Number(group.closest('section').dataset.pageScene)+1} · ${Number(group.dataset.p)+1}컷`,pageKey(group))));
  const group=groups.find(group=>pageKey(group)===pageSelection)||groups[0];
  selectPageCut(group);
  if(group&&previous?.key===pageKey(group))selectLetter(group.querySelector(`[data-letter="${previous.letter}"]`));
}
function selectPageCut(group){
  if(selectedLetter?.closest('[data-slot-index]')!==group)selectLetter(null);
  const buttons=[pageCut,$('#wletterreset')];
  buttons.forEach(el=>el.disabled=!group);
  $('#wbackground').hidden=!group;
  if(!group){pageSelection='';return}
  pageSelection=pageKey(group);
  pageCut.value=pageSelection;
  refreshBackgroundTools();
  pageReader.querySelector('.cut-selected')?.classList.remove('cut-selected');
  pageReader.querySelectorAll('.frame-handles.sel').forEach(h=>h.classList.remove('sel'));
  pageReader.querySelector('[data-slot-index].sel')?.classList.remove('sel');group.classList.add('sel');
  group.querySelector('.page-frame').classList.add('cut-selected');handlesOf(group)?.classList.add('sel');showZoom(pageSettings()?.img?.s||1);
}
const backgroundColor=$('#wbgcolor'),backgroundPresets=$('#wbgpresets');
const BG_THUMB=[];window.bgThumbSVG=i=>BG_THUMB[i]||'';
backgroundPresets.innerHTML=PAGE_BACKGROUNDS.map((preset,i)=>{
  const name=preset?`${i}. ${preset.name}`:'기본 그라디언트';
  const raw=preset?transitionSVG(preset.start,PAGE_WHITE,i,`bg-thumb-${i}`,0,240):'';BG_THUMB[i]=raw;
  // 그림 한 장(img)으로: 썸네일 SVG 요소 수백 개가 화면에 늘 올라가 있던 것(약 1,100개)을 버튼마다 1개로
  const thumb=raw?`<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw.includes('xmlns=')?raw:raw.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'))}">`:'';
  return `<button type="button" data-bg-preset="${i}" aria-label="${name}" title="${name}" aria-pressed="false">${thumb}<span>${i||'기본'}</span></button>`;
}).join('');
function refreshBackgroundTools(){
  const edit=pageSettings();
  backgroundColor.value=pageBackground(edit);
  backgroundPresets.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.bgPreset)===(edit?.transition||0)));
  refreshTransTools();
  // 씬의 마지막 컷을 고르면 '씬 끝 색'을 보여 줌
  const row=$('#wsceneendrow'),[si,slot]=(pageSelection||'').split(':').map(Number),ps=pageSelection?scenePanels(si):[];
  const isLast=ps.length&&cutSlot(ps.at(-1),ps.length-1)===slot;row.hidden=!isLast;
  if(isLast){const sel=$('#wsceneend');sel.value=SCENES[si].endTo||'next';sel.options[0].textContent=si<SCENES.length-1?'다음 씬 첫 컷 색으로 이어감':'흰색으로 (마지막 씬)'}
}
// 전환 중간색·위치
function refreshTransTools(){const e=pageSettings(),st=PAGE_BACKGROUNDS[e?.transition];const on=e?.transMid?e.transMid!=='none':!!st;
  $('#wtmidon').checked=on;$('#wtmid').value=/^#/.test(e?.transMid||'')?e.transMid:(st?.mid||'#808080');$('#wtmid').disabled=!on;
  const sv=e?.transStop??st?.stop??50;$('#wtstop').value=sv;$('#wtstopv').textContent=sv+'%';$('#wtstop').disabled=!on;
  $('#wbgimgs').innerHTML=Object.values(IMG.bg).sort((a,b)=>a.at-b.at).map(r=>`<button type="button" data-bgimg="${r.id}" aria-pressed="${e?.bgImage===r.id}" title="${esc(r.name||'배경 이미지')}"><img src="${r.src}" alt=""><span data-bgimg-del="${r.id}" title="목록에서 지우기">×</span></button>`).join('')+`<button type="button" class="add" data-bgimg-add title="PNG·JPG를 배경 소재로 추가">+ 이미지</button>`+(e?.bgImage?`<button type="button" class="add" data-bgimg-off>빼기</button>`:'');
  $('#wbgoprow').hidden=!e?.bgImage;$('#wbgop').value=Math.round((e?.bgImageOp??1)*100)}
const setEdit=(f)=>{if(!pageSelection)return;f(pageSettings(true));saveScenes();renderWebtoon();refreshTransTools()};
$('#wtmidon').addEventListener('change',e=>setEdit(x=>{if(e.target.checked)x.transMid=$('#wtmid').value;else x.transMid='none'}));
$('#wtmid').addEventListener('change',e=>setEdit(x=>x.transMid=e.target.value));
$('#wtstop').addEventListener('input',e=>{$('#wtstopv').textContent=e.target.value+'%'});
$('#wtstop').addEventListener('change',e=>setEdit(x=>x.transStop=+e.target.value));
$('#wbgop').addEventListener('change',e=>setEdit(x=>x.bgImageOp=+e.target.value/100));
$('#wbgimgs').addEventListener('click',async e=>{
  const del=e.target.closest('[data-bgimg-del]');if(del){e.stopPropagation();const id=del.dataset.bgimgDel;if(!confirm('이 배경 이미지를 목록에서 지울까요? 쓰고 있는 컷에서는 빠져요.'))return;delete IMG.bg[id];idb.del(id);SCENES.forEach(sc=>(sc.pageEdits||[]).forEach(x=>{if(x?.bgImage===id)delete x.bgImage}));saveScenes();renderWebtoon();refreshTransTools();return}
  if(e.target.closest('[data-bgimg-off]')){setEdit(x=>{delete x.bgImage;delete x.bgImageOp});return}
  if(e.target.closest('[data-bgimg-add]')){const f=document.createElement('input');f.type='file';f.accept='image/*';f.multiple=true;f.onchange=async()=>{let last=null;
    for(const file of f.files){const im=await shrink(file,1380);const o={id:'bg:'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:'bgimg',name:file.name,src:im.src,w:im.w,h:im.h,at:Date.now()};IMG.bg[o.id]=o;await idb.put(o);last=o.id}
    if(last&&pageSelection)setEdit(x=>x.bgImage=last);else refreshTransTools()};f.click();return}
  const b=e.target.closest('[data-bgimg]');if(b)setEdit(x=>x.bgImage=b.dataset.bgimg)});
// 씬 팔레트: 이 씬에서 쓰는 배경색을 모아 한 번에 바꿈(배경색·전환 중간색, 식자에 색 값이 있으면 그것도)
$('#wpalette').addEventListener('click',()=>{if(!pageSelection)return;const si=+pageSelection.split(':')[0],sc=SCENES[si],ps=scenePanels(si);
  const used=new Map(),add=(c,w)=>{if(!/^#[\da-f]{6}$/i.test(c||''))return;c=c.toLowerCase();used.set(c,(used.get(c)||[]).concat(w))};
  ps.forEach((p,n)=>{const e=sc.pageEdits?.[cutSlot(p,n)];add(pageBackground(e),'배경');if(/^#/.test(e?.transMid||''))add(e.transMid,'중간색');Object.values(e?.letters||{}).forEach(l=>{add(l?.color,'식자');add(l?.fill,'말풍선')})});
  let d=$('#paldlg');if(!d){d=document.createElement('dialog');d.id='paldlg';d.className='keydlg';document.body.appendChild(d)}
  d.innerHTML=`<h3>씬 색 한 번에 바꾸기 · ${esc(sceneLabel(sc,si))}</h3><p class="hint">이 씬에서 쓰는 색이에요. 오른쪽 색을 바꾸면 같은 색을 쓰는 컷 배경과 전환 중간색이 함께 바뀌어요.</p><ul class="pall">${[...used].map(([c,w])=>`<li><span class="sw" style="background:${c}"></span><code>${c}</code><small>${[...new Set(w)].join('·')} ${w.length}곳</small><span>→</span><input type="color" value="${c}" data-from="${c}"></li>`).join('')||'<li>바꿀 색이 없어요</li>'}</ul><div class="acts"><button class="btn" data-r="x">닫기</button><button class="btn dark" data-r="go">바꾸기</button></div>`;
  d.onclick=e=>{const r=e.target.closest('[data-r]')?.dataset.r;if(!r)return;if(r==='go'){const map=Object.fromEntries([...d.querySelectorAll('[data-from]')].filter(i=>i.value.toLowerCase()!==i.dataset.from).map(i=>[i.dataset.from,i.value]));
      const sw=c=>map[(c||'').toLowerCase()];let n=0;
      ps.forEach((p,k)=>{const slot=cutSlot(p,k),e=sc.pageEdits[slot]||(sc.pageEdits[slot]={});const bg=pageBackground(e);if(sw(bg)){e.background=sw(bg);n++}if(sw(e.transMid)){e.transMid=sw(e.transMid);n++}
        Object.values(e.letters||{}).forEach(l=>{if(!l)return;if(sw(l.color)){l.color=sw(l.color);n++}if(sw(l.fill)){l.fill=sw(l.fill);n++}})});
      if(n){saveScenes();renderWebtoon();refreshBackgroundTools()}toast(n?`${n}곳의 색을 바꿨어요 (Ctrl+Z로 되돌리기)`:'바뀐 색이 없어요')}d.close()};
  d.showModal()});
$('#wsceneend').addEventListener('change',e=>{if(!pageSelection)return;const si=+pageSelection.split(':')[0];SCENES[si].endTo=e.target.value;saveScenes();renderWebtoon()});
backgroundColor.addEventListener('change',()=>{
  if(!pageSelection)return;
  pageSettings(true).background=backgroundColor.value;
  saveScenes();renderWebtoon();
});
backgroundPresets.addEventListener('click',e=>{
  const preset=e.target.closest('[data-bg-preset]');
  if(!pageSelection||!preset)return;
  pageSettings(true).transition=Number(preset.dataset.bgPreset);
  saveScenes();renderWebtoon();
});
$('#wbgreset').addEventListener('click',()=>{
  if(!pageSelection)return;
  const edit=pageSettings();
  if(edit){delete edit.background;delete edit.transition;delete edit.transMid;delete edit.transStop;delete edit.bgImage;delete edit.bgImageOp}
  saveScenes();renderWebtoon();
});
$('#wedit').addEventListener('click',e=>{
  pageEditing=!pageEditing;
  if(!pageEditing)armMaterialLine('');
  e.currentTarget.setAttribute('aria-pressed',!pageEditing);
  e.currentTarget.textContent=pageEditing?'미리보기':'편집으로';
  $('#v-webtoon').classList.toggle('preview',!pageEditing);
  renderWebtoon();
});
pageCut.addEventListener('change',()=>{
  const group=[...pageReader.querySelectorAll('[data-slot-index]')].find(g=>pageKey(g)===pageCut.value);
  selectPageCut(group);
  group?.scrollIntoView({block:'center'});
});
$('#wletterreset').addEventListener('click',()=>{
  if(!pageSelection)return;
  const settings=pageSettings();
  if(settings?.letters){
    settings.letters=Object.fromEntries(Object.entries(settings.letters)
      .filter(([,entry])=>typeof entry?.text==='string')
      .map(([key,{text}])=>[key,{text}]));
  }
  saveScenes();renderWebtoon();
});
function letterPosition(letter){return {x:0,y:0,...pageSettings()?.letters?.[letter.dataset.letter]}}
function moveLetter(letter,position){letter.setAttribute('transform',`translate(${position.x} ${position.y})`)}
function saveLetter(letter,position){
  const settings=pageSettings(true);
  (settings.letters||={})[letter.dataset.letter]={...settings.letters?.[letter.dataset.letter],...position};
  saveScenes();
}
function pagePoint(svg,e){return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse())}
const balloonSize=$('#wballoonsize'),balloonValue=$('#wballoonvalue');
const letterTextForm=$('#wlettertextform'),letterMemo=$('#wlettermemo'),letterOriginal=$('#wletteroriginal');
function selectLetter(letter){
  if(selectedLetter===letter)return;
  selectedLetter?.classList.remove('balloon-selected','letter-selected');
  selectedLetter=letter||null;
  const art=letter?.querySelector('[data-balloon]');
  const caption=/^caption/.test(letter?.dataset.letter||'');
  $('#wballoon').hidden=!art;
  $('#wballoonstyletools').hidden=!art&&!caption;
  letterTextForm.hidden=!letter;
  if(!letter)return;
  letter.classList.add(art?'balloon-selected':'letter-selected');
  const edit=letterPosition(letter);
  const effect=isEffectLetter(letter);
  $('#wlettertextlabel').textContent=caption?'나레이션 문구':effect?'효과음 문구':'말풍선 문구';
  letterMemo.value=letter.dataset.letterText||'';
  letterMemo.setCustomValidity('');
  letterOriginal.disabled=typeof edit.text!=='string';
  if(art||caption)showBalloonStyle(edit,caption,art);
  if(art)showBalloonSize(edit.scale||1);
}
letterTextForm.addEventListener('submit',e=>{
  e.preventDefault();
  if(!selectedLetter)return;
  const effect=isEffectLetter(selectedLetter);
  const text=effect?letterMemo.value.trim().replace(/\s+/g,' '):letterMemo.value.trim();
  if(!text){
    letterMemo.setCustomValidity('문구를 입력해 주세요.');
    letterMemo.reportValidity();
    return;
  }
  saveLetter(selectedLetter,{text});
  renderWebtoon();
  if(effect)refreshPageMaterials();
});
letterMemo.addEventListener('input',()=>letterMemo.setCustomValidity(''));
letterMemo.addEventListener('keydown',e=>{
  if(!e.isComposing&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();letterTextForm.requestSubmit()}
});
letterOriginal.addEventListener('click',()=>{
  const edit=selectedLetter&&pageSettings()?.letters?.[selectedLetter.dataset.letter];
  if(typeof edit?.text!=='string')return;
  const effect=isEffectLetter(selectedLetter);
  delete edit.text;
  saveScenes();renderWebtoon();
  if(effect)refreshPageMaterials();
});
const balloonStyle=$('#wballoonstyle'),balloonLinked=$('#wballoonlinked'),balloonTailToggle=$('#wballoontail');
const styleOptions=styles=>styles.map(([key,label],i)=>`<option value="${key}">${i+1}. ${label}</option>`).join('');
function showBalloonStyle(edit,caption,art){
  balloonStyle.innerHTML='<option value="auto">자동 · 기존 식자</option>'+
    (caption?'<option value="narration">나레이션 · 사각</option>':
      `<optgroup label="용도별 · 자료 1">${styleOptions(BALLOON_STYLES.slice(0,9))}</optgroup><optgroup label="외곽선별 · 자료 2">${styleOptions(BALLOON_STYLES.slice(9))}</optgroup>`);
  const preset=balloonPreset(edit.style);
  balloonStyle.value=preset?.[0]||'auto';
  const linked=!caption&&CAN_LINK.has(balloonStyle.value);
  $('#wballoonlinklabel').hidden=!linked;
  balloonLinked.checked=linked&&!!edit.linked;
  $('#wballoontaillabel').hidden=caption;
  balloonTailToggle.checked=caption?false:JSON.parse(art.dataset.balloon).showTail!==false;
  const extent=balloonLinked.checked?12:17;
  $('#wballoonswatch').innerHTML=preset?`<svg viewBox="-29 -29 58 58">${presetBalloon(preset,0,0,extent,extent,.85,rngL(preset[0]),balloonLinked.checked).body}</svg>`:'';
}
function updateBalloonStyle(edit){
  if(!selectedLetter)return;
  saveLetter(selectedLetter,edit);
  renderWebtoon();
  const input=edit.style?balloonStyle:'linked' in edit?balloonLinked:balloonTailToggle;
  input.focus({preventScroll:true});
}
balloonStyle.addEventListener('change',()=>updateBalloonStyle({style:balloonStyle.value}));
balloonLinked.addEventListener('change',()=>updateBalloonStyle({linked:balloonLinked.checked}));
balloonTailToggle.addEventListener('change',()=>updateBalloonStyle({showTail:balloonTailToggle.checked}));
function showBalloonSize(scale){
  balloonSize.value=Math.round(scale*100);
  balloonValue.textContent=`${balloonSize.value}%`;
}
function showTail(art,meta,offset){
  const tail=balloonTail(meta,balloonTip(meta,offset));
  art.querySelector('[data-tail-art]').innerHTML=tail.svg;
  art.querySelector('[data-tail-handle]')?.setAttribute('transform',tailTransform(tail.end));
}
balloonSize.addEventListener('input',()=>{
  if(!selectedLetter?.querySelector('[data-balloon]'))return;
  const scale=Number(balloonSize.value)/100;
  const art=selectedLetter.querySelector('[data-balloon]');
  art.setAttribute('transform',balloonTransform(JSON.parse(art.dataset.balloon),scale));
  showBalloonSize(scale);
  saveLetter(selectedLetter,{scale});
});
$('#wballoonreset').addEventListener('click',()=>{
  if(!selectedLetter)return;
  const art=selectedLetter.querySelector('[data-balloon]'),meta=JSON.parse(art.dataset.balloon);
  art.setAttribute('transform',balloonTransform(meta,1));
  showTail(art,meta,null);
  showBalloonSize(1);
  saveLetter(selectedLetter,{scale:1,tail:null});
});
function startTailDrag(letter,art,e){
  const meta=JSON.parse(art.dataset.balloon),initial=letterPosition(letter).tail;
  tailDrag={letter,art,meta,initial,id:e.pointerId,start:pagePoint(art,e),end:balloonTail(meta,balloonTip(meta,initial)).end};
  pageReader.setPointerCapture(e.pointerId);
}
pageReader.addEventListener('focusin',e=>{
  const letter=e.target.closest('[data-letter]');
  if(!pageEditing||!letter)return;
  selectPageCut(letter.closest('[data-slot-index]'));
  selectLetter(letter);
});
function gapLayout(gap){
  const svg=gap.ownerSVGElement,index=Number(gap.dataset.pageGap);
  const following=[...svg.querySelectorAll('[data-slot-index],[data-page-gap],[data-bg-panel],[data-fh-for]')]
    .filter(el=>Number(el.dataset.p??el.dataset.pageGap??el.dataset.bgPanel)>index)
    .map(el=>[el,Number(el.dataset.shift||0)]);
  const transition=svg.querySelector(`[data-bg-panel="${index}"] > [data-page-transition]`);
  const cut=svg.querySelector(`[data-p="${index}"][data-slot-index]`);
  const clip=cut?.querySelector('clipPath');
  const overflow=clip?[...svg.querySelectorAll(`[data-overlay-overflow="${CSS.escape(clip.id)}"] > rect`)]:[];
  return {gap,svg,following,transition,overflow,frameHeight:cut?JSON.parse(cut.dataset.frame).h:0,size:Number(gap.dataset.gapSize),height:svg.viewBox.baseVal.height,
    y:Number(gap.dataset.gapY),key:gap.closest('section').dataset.pageScene+':'+gap.dataset.slot};
}
function resizeGap(layout,size){
  const {gap,svg,following,transition,y}=layout,delta=size-layout.size,height=layout.height+delta;
  gap.dataset.gapSize=String(size);
  gap.setAttribute('aria-valuenow',size);
  gap.querySelector('.gap-area').setAttribute('height',size);
  transition?.setAttribute('height',size);
  layout.overflow.forEach(rect=>rect.setAttribute('height',layout.frameHeight+size));
  gap.querySelector('.gap-grip').setAttribute('transform',`translate(${W/2} ${y+size/2})`);
  gap.querySelector('text').textContent=`${size} px`;
  following.forEach(([el,offset])=>{
    el.dataset.shift=String(offset+delta);
    el.setAttribute('transform',`translate(0 ${offset+delta})`);
  });
  svg.setAttribute('height',height);
  svg.setAttribute('viewBox',`0 0 ${W} ${height}`);
}
function saveGap(layout,reset=false){
  const settings=pageSettings(!reset,layout.key);
  if(reset){if(settings)delete settings.gap}
  else settings.gap=Number(layout.gap.dataset.gapSize);
  saveScenes();
}
function clampGap(size){return Math.max(0,Math.min(MAX_PAGE_GAP,Math.round(size)))}
// 고른 것 전부 풀기(식자·여러 식자·컷·여러 컷·씬·그림 편집·프레임 모양) — 컷 사이 여백을 끌 때 손잡이·상황 막대가 가리지 않게
function clearAllSelection(){window.RoughWS?.clearMulti?.();window.RoughStudio?.clearMC?.();if(window.RoughStudio?.selScene!=null)window.RoughStudio.selectScene(null);
  if(typeof cropKey!=='undefined'&&cropKey)window.RoughStudio?.setCrop?.(null);if(typeof frameShapeKey!=='undefined'&&frameShapeKey)setFrameShape(null);
  selectLetter(null);window.layerPart=null;selectPageCut(null);
  pageReader.querySelector('.cut-selected')?.classList.remove('cut-selected');pageReader.querySelectorAll('.frame-handles.sel').forEach(h=>h.classList.remove('sel'));pageReader.querySelectorAll('[data-slot-index].sel').forEach(g=>g.classList.remove('sel'));
  if(typeof editTree==='function')editTree();window.RoughWS?.renderCtx?.()}
function startGapDrag(gap,e){
  clearAllSelection();
  const layout=gapLayout(gap);
  e.preventDefault();
  gap.focus({preventScroll:true});
  gapDrag={...layout,id:e.pointerId,clientY:e.clientY,scale:W/layout.svg.getBoundingClientRect().width};
  gap.setPointerCapture(e.pointerId);
}
pageReader.addEventListener('dblclick',e=>{
  const gap=e.target.closest('[data-page-gap]');
  if(!pageEditing||!gap||gapDrag)return;
  const layout=gapLayout(gap);
  resizeGap(layout,Number(gap.dataset.gapBase));
  saveGap(layout,true);
  if(hasLeadSounds())renderWebtoon();
});
pageReader.addEventListener('pointerdown',e=>{
  if(!pageEditing||e.button!==0||pageDrag||gapDrag||tailDrag||frameDrag||artDrag||materialDrag)return;
  if(materialMode){startMaterialLine(e);return}
  const gap=e.target.closest('[data-page-gap]');
  if(gap){
    if(e.pointerType!=='touch'||e.target.closest('.gap-grip'))startGapDrag(gap,e);
    return;
  }
  const fh=e.target.closest('[data-fh]');
  if(fh){const hs=fh.closest('[data-fh-for]');startFrameDrag(hs.ownerSVGElement.querySelector(`[data-slot-index="${hs.dataset.fhFor}"]`),fh,e);return}
  const group=e.target.closest('[data-slot-index]');
  if(!group)return;
  const was=pageSelection===pageKey(group);
  selectPageCut(group);
  const letter=e.target.closest('[data-letter]');
  selectLetter(letter);
  if(!letter){if((pageSettings()?.img?.s||1)>1&&e.target.closest('[data-art]'))startArtDrag(group,e);return}  // 확대한 그림은 처음 누를 때부터 바로 끌기
  e.preventDefault();
  const handle=e.target.closest('[data-tail-handle]');
  if(handle){
    handle.focus({preventScroll:true});
    startTailDrag(letter,handle.closest('[data-balloon]'),e);
    return;
  }
  letter.focus({preventScroll:true});
  const svg=letter.ownerSVGElement;
  pageDrag={letter,svg,id:e.pointerId,start:pagePoint(svg,e),initial:letterPosition(letter),...(window.RoughDrag?.begin(letter,e)||{})};
  pageReader.setPointerCapture(e.pointerId);
});
pageReader.addEventListener('pointermove',e=>{
  if(frameDrag?.id===e.pointerId){moveFrame(e);return}
  if(artDrag?.id===e.pointerId){const pt=pagePoint(artDrag.svg,e);setZoom(artDrag.group,{...artDrag.z0,dx:artDrag.z0.dx+pt.x-artDrag.start.x,dy:artDrag.z0.dy+pt.y-artDrag.start.y});return}
  if(tailDrag?.id===e.pointerId){
    const {art,meta,start,end}=tailDrag,point=pagePoint(art,e);
    tailDrag.offset={x:Math.round(end.x+point.x-start.x-meta.cx),y:Math.round(end.y+point.y-start.y-meta.cy)};
    showTail(art,meta,tailDrag.offset);
    return;
  }
  if(gapDrag?.id===e.pointerId){
    const next=clampGap(gapDrag.size+(e.clientY-gapDrag.clientY)*gapDrag.scale*2);
    resizeGap(gapDrag,next);
    return;
  }
  if(pageDrag?.id!==e.pointerId)return;
  const {svg,letter,start,initial}=pageDrag;
  const point=pagePoint(svg,e);
  let dx=point.x-start.x,dy=point.y-start.y;
  if(!pageDrag.moved&&Math.hypot(e.clientX-(pageDrag.cx??e.clientX),e.clientY-(pageDrag.cy??e.clientY))<3)return;  // 3px 안은 클릭
  pageDrag.moved=true;
  if(window.RoughDrag)[dx,dy]=window.RoughDrag.adjust(pageDrag,dx,dy,e);  // Shift: 가로·세로 고정, 맞춤선 붙기
  pageDrag.position={x:Math.round(initial.x+dx),y:Math.round(initial.y+dy)};
  moveLetter(letter,pageDrag.position);
  (pageDrag.multi||[]).forEach(m=>moveLetter(m.letter,{x:Math.round(m.initial.x+dx),y:Math.round(m.initial.y+dy)}));
});
pageReader.addEventListener('pointerup',e=>{
  if(materialDrag?.id===e.pointerId){finishMaterialLine(e);return}
  if(frameDrag?.id===e.pointerId){saveFrame();return}
  if(artDrag?.id===e.pointerId){const g=artDrag.group;artDrag=null;saveZoom(g);return}
  if(tailDrag?.id===e.pointerId){
    if(tailDrag.offset)saveLetter(tailDrag.letter,{tail:tailDrag.offset});
    tailDrag=null;
    return;
  }
  if(gapDrag?.id===e.pointerId){
    const changed=Number(gapDrag.gap.dataset.gapSize)!==gapDrag.size;
    if(changed)saveGap(gapDrag);
    gapDrag=null;
    if(changed&&hasLeadSounds())renderWebtoon();
    return;
  }
  if(pageDrag?.id!==e.pointerId)return;
  const pd=pageDrag;pageDrag=null;
  if(window.RoughDrag){window.RoughDrag.end(pd);return}
  if(pd.position)saveLetter(pd.letter,pd.position);
});
pageReader.addEventListener('lostpointercapture',e=>{
  if(materialDrag?.id===e.pointerId){materialDrag=null;return}
  if(frameDrag?.id===e.pointerId){showFrame(frameDrag.group,frameDrag.f0);frameDrag=null;return}
  if(artDrag?.id===e.pointerId){setZoom(artDrag.group,artDrag.z0);artDrag=null;return}
  if(tailDrag?.id===e.pointerId){
    showTail(tailDrag.art,tailDrag.meta,tailDrag.initial);
    tailDrag=null;
    return;
  }
  if(gapDrag?.id===e.pointerId){
    resizeGap(gapDrag,gapDrag.size);
    gapDrag=null;
    return;
  }
  if(pageDrag?.id!==e.pointerId)return;
  if(pageDrag.ended)return;
  moveLetter(pageDrag.letter,pageDrag.initial);(pageDrag.multi||[]).forEach(m=>moveLetter(m.letter,m.initial));window.RoughDrag?.hideGuides();
  pageDrag=null;
});
pageReader.addEventListener('keydown',e=>{
  const gap=e.target.closest('[data-page-gap]');
  if(pageEditing&&gap&&!gapDrag&&!pageDrag&&!tailDrag){
    const layout=gapLayout(gap),n=e.shiftKey?16:4;
    const value={ArrowUp:layout.size+n,ArrowDown:layout.size-n,Home:0,End:MAX_PAGE_GAP,Escape:Number(gap.dataset.gapBase)}[e.key];
    if(value!==undefined){
      e.preventDefault();
      resizeGap(layout,clampGap(value));
      saveGap(layout,e.key==='Escape');
      if(hasLeadSounds()){renderWebtoon();document.querySelector('#ws-'+layout.key.split(':')[0]+' [data-page-gap="'+gap.dataset.pageGap+'"]')?.focus({preventScroll:true})}
    }
    return;
  }
  const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  const letter=e.target.closest('[data-letter]');
  if(!pageEditing||!letter||!step||pageDrag||gapDrag||tailDrag)return;
  e.preventDefault();
  selectPageCut(letter.closest('[data-slot-index]'));
  const pos=letterPosition(letter),n=e.shiftKey?16:4;
  const handle=e.target.closest('[data-tail-handle]');
  if(handle){
    const art=handle.closest('[data-balloon]'),meta=JSON.parse(art.dataset.balloon);
    const {end}=balloonTail(meta,balloonTip(meta,pos.tail));
    const offset={x:end.x-meta.cx+n*step[0],y:end.y-meta.cy+n*step[1]};
    showTail(art,meta,offset);saveLetter(letter,{tail:offset});
    return;
  }
  const next={x:pos.x+n*step[0],y:pos.y+n*step[1]};
  moveLetter(letter,next);saveLetter(letter,next);
});
// ---------- 칸 프레임 끌기: 변 = 크기, 꼭짓점 = 모양 ----------
let frameDrag=null;
const framePts=f=>[[f.x,f.y],[f.x+f.w,f.y],[f.x+f.w,f.y+f.h],[f.x,f.y+f.h]].map((c,k)=>[c[0]+f.q[k][0],c[1]+f.q[k][1]]);
function showFrame(group,f){const pts=framePts(f),str=pts.map(q=>q.map(v=>v.toFixed(1)).join(',')).join(' ');
  group.querySelector('.page-frame')?.setAttribute('points',str);group.querySelector('clipPath polygon')?.setAttribute('points',str);
  const old=handlesOf(group);if(old){const sh=old.getAttribute('transform');old.outerHTML=frameHandles(pts,group.dataset.slotIndex,group.dataset.p);const nw=handlesOf(group);nw.classList.add('sel');if(sh)nw.setAttribute('transform',sh)}}
function handlesOf(group){return group.ownerSVGElement.querySelector(`[data-fh-for="${group.dataset.slotIndex}"]`)}
// 프레임 모양 모드: 컷을 더블클릭하면 켜짐(모퉁이를 하나씩 끌어 사선 칸). 꺼져 있으면 모퉁이 = 컷 확대·축소
let frameShapeKey=null;
function setFrameShape(key){frameShapeKey=key||null;markFrameShape();window.RoughWS?.renderCtx?.();if(key)window.RoughWS?.flash?.('프레임 모양 바꾸기 · 모퉁이를 하나씩 끌어요 · Esc 끝내기')}
// 프레임 기울기(°) — 양수 = 오른쪽이 내려감. 모퉁이를 안쪽으로만 옮겨 칸이 위아래 칸을 침범하지 않게
function frameAngles(g){const f=JSON.parse(g.dataset.frame),q=f.q||[[0,0],[0,0],[0,0],[0,0]],a=v=>Math.round(Math.atan(v/f.w)*180/Math.PI);
  return {top:q[1][1]>0?a(q[1][1]):q[0][1]>0?-a(q[0][1]):0,bot:q[3][1]<0?a(-q[3][1]):q[2][1]<0?-a(-q[2][1]):0}}
function setFrameAngles(top,bot){const g=pageReader.querySelector('[data-slot-index].sel');if(!g)return;const f=JSON.parse(g.dataset.frame);
  const d=x=>Math.min(f.h*.35,Math.abs(Math.tan(x*Math.PI/180)*f.w));const q=[[0,0],[0,0],[0,0],[0,0]];
  top=Math.max(-30,Math.min(30,Math.round(+top||0)));bot=Math.max(-30,Math.min(30,Math.round(+bot||0)));
  if(top>0)q[1][1]=Math.round(d(top));else if(top<0)q[0][1]=Math.round(d(top));
  if(bot>0)q[3][1]=-Math.round(d(bot));else if(bot<0)q[2][1]=-Math.round(d(bot));
  const set=pageSettings(true);if(!top&&!bot)delete set.quad;else set.quad=q;saveScenes();renderWebtoon();markFrameShape()}
function markFrameShape(){pageReader.querySelectorAll('.frame-handles').forEach(h=>{const g=h.ownerSVGElement?.querySelector(`[data-slot-index="${h.dataset.fhFor}"]`);h.classList.toggle('shape',!!g&&!!frameShapeKey&&pageKey(g)===frameShapeKey)})}
function startFrameDrag(group,fh,e){e.preventDefault();e.stopPropagation();selectPageCut(group);selectLetter(null);
  const f0=JSON.parse(group.dataset.frame);
  frameDrag={group,k:fh.dataset.fh,f0,f:structuredClone(f0),id:e.pointerId,start:pagePoint(group.ownerSVGElement,e),moved:false,shape:frameShapeKey===pageKey(group)};
  pageReader.setPointerCapture(e.pointerId)}
function moveFrame(e){const d=frameDrag,pt=pagePoint(d.group.ownerSVGElement,e),dx=pt.x-d.start.x,dy=pt.y-d.start.y,f0=d.f0,f=structuredClone(f0),MINW=80,MINH=60;
  if(d.k==='l'){f.x=Math.max(0,Math.min(f0.x+f0.w-MINW,f0.x+dx));f.w=f0.x+f0.w-f.x}
  else if(d.k==='r')f.w=Math.max(MINW,Math.min(W-f0.x,f0.w+dx));
  else if(d.k==='b')f.h=Math.max(MINH,f0.h+dy);
  else if(d.k==='t'){const lim=d.group.dataset.prev?-Number(d.group.dataset.prev.split(':')[1]):-f0.h;const ddy=Math.max(lim,Math.min(f0.h-MINH,dy));f.y=f0.y+ddy;f.h=f0.h-ddy}
  else if(!d.shape){// 모퉁이: 컷 전체를 비율대로 확대·축소(맞은편 모퉁이 고정)
    const r=d.k.includes('r'),b=d.k.includes('b'),sx=(f0.w+(r?dx:-dx))/f0.w,sy=(f0.h+(b?dy:-dy))/f0.h;
    let sc=Math.max(MINW/f0.w,MINH/f0.h,(sx+sy)/2);if(r)sc=Math.min(sc,(W-f0.x)/f0.w);else sc=Math.min(sc,(f0.x+f0.w)/f0.w);
    if(!b&&d.group.dataset.prev){const lim=-Number(d.group.dataset.prev.split(':')[1]);sc=Math.min(sc,(f0.h-lim)/f0.h)}
    f.w=Math.round(f0.w*sc);f.h=Math.round(f0.h*sc);if(!r)f.x=f0.x+f0.w-f.w;if(!b)f.y=f0.y+f0.h-f.h;
    f.q=f0.q.map(q=>q.map(v=>Math.round(v*sc)))}
  else{const n=['tl','tr','br','bl'].indexOf(d.k),c=[[f0.x,f0.y],[f0.x+f0.w,f0.y],[f0.x+f0.w,f0.y+f0.h],[f0.x,f0.y+f0.h]][n];
    const ax=Math.max(0,Math.min(W,c[0]+f0.q[n][0]+dx)),ay=c[1]+f0.q[n][1]+dy;f.q[n]=[Math.round(ax-c[0]),Math.round(ay-c[1])]}
  d.f=f;d.moved=Math.abs(dx)+Math.abs(dy)>1;showFrame(d.group,f)}
function saveFrame(){const d=frameDrag;frameDrag=null;if(!d.moved)return;const {f,f0,k,group}=d;
  const key=pageKey(group),scene=group.closest('section').dataset.pageScene,set=pageSettings(true,key);
  set.frame={x:Math.round(f.x),w:Math.round(f.w),h:Math.round(f.h)};
  if((k.length===2&&d.shape)||Array.isArray(set.quad))set.quad=f.q.map(q=>q.map(Math.round));
  // 윗변(또는 위쪽 모퉁이로 확대)을 끌면 바로 위 칸과의 간격을 그만큼 줄이거나 늘려 아랫변은 그대로
  if((k==='t'||(!d.shape&&(k==='tl'||k==='tr')))&&group.dataset.prev){const [ps,size]=group.dataset.prev.split(':').map(Number);pageSettings(true,scene+':'+ps).gap=clampGap(size+(f.y-f0.y))}
  saveScenes();renderWebtoon();markFrameShape()}
// ---------- 칸 안 그림 확대·이동 ----------
let artDrag=null,zoomTimer=0;const ZMAX=5;
function zoomOf(group){const z=pageSettings(false,pageKey(group))?.img;return {s:1,dx:0,dy:0,...z}}
function clampZoom(group,z){const f=JSON.parse(group.dataset.frame),s=Math.max(1,Math.min(ZMAX,z.s)),mx=f.w*(s-1)/2,my=f.h*(s-1)/2;
  return {s,dx:Math.max(-mx,Math.min(mx,z.dx)),dy:Math.max(-my,Math.min(my,z.dy))}}
function setZoom(group,z){z=clampZoom(group,z);const f=JSON.parse(group.dataset.frame),el=group.querySelector('[data-art]');
  const tf=zoomTf(z,f.x,f.y,f.w,f.h);if(tf)el.setAttribute('transform',tf.slice(12,-1));else el.removeAttribute('transform');
  group._z=z;if(pageSelection===pageKey(group))showZoom(z.s);return z}
function saveZoom(group){const z=group._z;if(!z)return;const set=pageSettings(true,pageKey(group));
  if(z.s<=1.001)delete set.img;else set.img={s:+z.s.toFixed(3),dx:Math.round(z.dx),dy:Math.round(z.dy)};saveScenes()}
function startArtDrag(group,e){e.preventDefault();artDrag={group,svg:group.ownerSVGElement,z0:zoomOf(group),start:pagePoint(group.ownerSVGElement,e),id:e.pointerId};pageReader.setPointerCapture(e.pointerId)}
// 커서 아래 점이 그대로 있도록 확대
function zoomAt(group,s2,pt){const z=group._z||zoomOf(group),f=JSON.parse(group.dataset.frame),cx=f.x+f.w/2,cy=f.y+f.h/2;
  const c=pt||{x:cx+z.dx,y:cy+z.dy},k=s2/z.s;
  return setZoom(group,{s:s2,dx:c.x-cx-k*(c.x-cx-z.dx),dy:c.y-cy-k*(c.y-cy-z.dy)})}
pageReader.addEventListener('wheel',e=>{if(!pageEditing||!(e.ctrlKey||e.metaKey))return;const group=e.target.closest('[data-slot-index]');if(!group||cropKey!==pageKey(group))return;
  e.preventDefault();if(pageSelection!==pageKey(group))selectPageCut(group);
  const z=group._z||zoomOf(group);zoomAt(group,Math.max(1,Math.min(ZMAX,z.s*Math.exp(-e.deltaY*(Math.abs(e.deltaY)<20?.012:.002)))),pagePoint(group.ownerSVGElement,e));
  clearTimeout(zoomTimer);zoomTimer=setTimeout(()=>saveZoom(group),300)},{passive:false});
// 확대할 수 있는 순간(고른 컷의 그림 위에 마우스가 있을 때) 커서 옆에 안내 말풍선
const zoomTip=document.createElement('div');zoomTip.className='zoomtip';zoomTip.setAttribute('role','tooltip');zoomTip.hidden=true;
const MODK=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent)?'⌘':'Ctrl';
zoomTip.innerHTML=`<kbd>${MODK}</kbd> + 휠로 이미지를 확대하거나 축소할 수 있어요`;document.body.appendChild(zoomTip);
let tipQuiet=false;
function hideTip(){zoomTip.hidden=true}
pageReader.addEventListener('pointermove',e=>{
  const art=e.pointerType==='mouse'&&pageEditing&&!tipQuiet&&!(artDrag||frameDrag||pageDrag||gapDrag||tailDrag)&&!e.target.closest('[data-letter]')&&e.target.closest('[data-slot-index].sel [data-art]');
  if(!art){hideTip();return}
  const gk=pageKey(art.closest('[data-slot-index]')),crop=cropKey===gk,shape=frameShapeKey===gk,tipMode=crop?'crop':shape?'shape':'enter';
  if(zoomTip.dataset.mode!==tipMode){zoomTip.dataset.mode=tipMode;zoomTip.innerHTML=crop?`<kbd>${MODK}</kbd> + 휠로 확대·축소 · 끌어서 이동 · <kbd>Esc</kbd> 끝내기`:shape?'모퉁이를 하나씩 끌어 프레임 모양을 바꿔요 · <kbd>Esc</kbd> 끝내기':'더블클릭하면 프레임 모양을 바꿀 수 있어요'}
  zoomTip.hidden=false;
  const x=Math.min(e.clientX+10,innerWidth-zoomTip.offsetWidth-8),y=Math.min(e.clientY+24,innerHeight-zoomTip.offsetHeight-8);
  zoomTip.style.transform=`translate(${x}px,${y}px)`});
pageReader.addEventListener('pointerleave',()=>{hideTip();tipQuiet=false});
pageReader.addEventListener('pointerdown',hideTip,true);
// 한 번 확대하면 그 컷에서 마우스를 뗄 때까지 다시 띄우지 않음
pageReader.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){hideTip();tipQuiet=true}},{passive:true});
pageReader.addEventListener('pointerout',e=>{if(!e.relatedTarget?.closest?.('[data-slot-index].sel'))tipQuiet=false});
const zoomRange=$('#wzoom');
function showZoom(s){zoomRange.value=Math.round(s*100);$('#wzoomvalue').textContent=zoomRange.value+'%'}
const selGroup=()=>[...pageReader.querySelectorAll('[data-slot-index]')].find(g=>pageKey(g)===pageSelection);
zoomRange.addEventListener('input',()=>{const g=selGroup();if(g)zoomAt(g,zoomRange.value/100)});
zoomRange.addEventListener('change',()=>{const g=selGroup();if(g)saveZoom(g)});
$('#wzoomreset').addEventListener('click',()=>{const g=selGroup();if(!g)return;setZoom(g,{s:1,dx:0,dy:0});saveZoom(g)});
// 씬 전체 맞춤(#6): 고른 컷의 폭·좌우 위치 또는 아래 간격을 같은 씬의 다른 컷에 한 번에
function sceneGroups(si){return [...pageReader.querySelectorAll(`section[data-page-scene="${si}"] [data-slot-index]`)]}
$('#wfitw').addEventListener('click',()=>{if(!pageSelection)return;const si=pageSelection.split(':')[0],cur=sceneGroups(si).find(g=>pageKey(g)===pageSelection);if(!cur)return;const f0=JSON.parse(cur.dataset.frame);let n=0;
  for(const g of sceneGroups(si)){if(g===cur)continue;const f=JSON.parse(g.dataset.frame),set=pageSettings(true,pageKey(g));set.frame={x:Math.round(f0.x),w:Math.round(f0.w),h:Math.round(f.h)};delete set.quad;n++}
  saveScenes();renderWebtoon();toast(`${n}컷의 폭·좌우 위치를 맞췄어요 (Ctrl+Z로 되돌리기)`)});
$('#wfitgap').addEventListener('click',()=>{if(!pageSelection)return;const si=pageSelection.split(':')[0],gs=sceneGroups(si),cur=gs.find(g=>pageKey(g)===pageSelection);if(!cur)return;
  const size=pageSettings()?.gap??Number(pageReader.querySelector(`section[data-page-scene="${si}"] [data-page-gap][data-slot="${pageSelection.split(':')[1]}"]`)?.dataset.gapSize);
  if(!Number.isFinite(size)){toast('이 컷은 아래 간격이 없어요(씬 마지막 컷)');return}let n=0;
  gs.slice(0,-1).forEach(g=>{if(g===cur)return;pageSettings(true,pageKey(g)).gap=size;n++});
  saveScenes();renderWebtoon();toast(`${n}곳의 간격을 ${size}px로 맞췄어요 (Ctrl+Z로 되돌리기)`)});
// 시퀀스 템플릿(#31): 연속한 컷의 레이아웃 값(글·레퍼런스·식자 제외)을 저장해 다른 자리에 붙임
const TPL_KEYS=['frame','quad','gap','background','transition','transMid','transStop','bgImage','bgImageOp','materialLines','artMask','overlays'];
const tplLoad=()=>{try{return JSON.parse(localStorage.getItem('rough-seq-templates')||'[]')}catch(_){return[]}};
const tplSave=t=>{try{localStorage.setItem('rough-seq-templates',JSON.stringify(t))}catch(e){saveFail(e,'템플릿')}};
function refreshTpl(){const t=tplLoad();$('#wtplsel').innerHTML=t.length?t.map((x,i)=>`<option value="${i}">${esc(x.name)} · ${x.cuts.length}컷</option>`).join(''):'<option value="">저장한 템플릿 없음</option>';$('#wtplapply').disabled=!t.length}
refreshTpl();
$('#wtplsave').addEventListener('click',()=>{if(!pageSelection)return;const [si,slot]=pageSelection.split(':').map(Number),gs=sceneGroups(si),k0=gs.findIndex(g=>pageKey(g)===pageSelection);if(k0<0)return;
  const max=gs.length-k0,n=Math.round(+prompt(`이 컷부터 몇 컷을 저장할까요? (1~${max})`,Math.min(5,max)));if(!(n>=1))return;
  const name=prompt('템플릿 이름',`${sceneLabel(SCENES[si],si)} ${k0+1}~${k0+Math.min(n,max)}컷`);if(!name)return;
  const cuts=gs.slice(k0,k0+n).map(g=>{const e=pageSettings(false,pageKey(g))||{},f=JSON.parse(g.dataset.frame);const o={};TPL_KEYS.forEach(k=>{if(e[k]!=null)o[k]=structuredClone(e[k])});o.frame??={x:Math.round(f.x),w:Math.round(f.w),h:Math.round(f.h)};return o});
  const t=tplLoad();t.push({name,cuts,at:Date.now()});tplSave(t);refreshTpl();$('#wtplsel').value=t.length-1;toast(`템플릿 「${name}」을 저장했어요 · ${cuts.length}컷`)});
$('#wtplapply').addEventListener('click',()=>{if(!pageSelection)return;const tp=tplLoad()[+$('#wtplsel').value];if(!tp)return;const [si]=pageSelection.split(':').map(Number),gs=sceneGroups(si),k0=gs.findIndex(g=>pageKey(g)===pageSelection);if(k0<0)return;
  const tg=gs.slice(k0,k0+tp.cuts.length);tg.forEach((g,k)=>{const e=pageSettings(true,pageKey(g));TPL_KEYS.forEach(key=>delete e[key]);Object.assign(e,structuredClone(tp.cuts[k]))});
  saveScenes();renderWebtoon();toast(`「${tp.name}」을 ${tg.length}컷에 적용했어요${tg.length<tp.cuts.length?` (씬에 남은 컷이 ${tg.length}개라 나머지는 건너뜀)`:''} · Ctrl+Z로 되돌리기`,3000)});
$('#wframereset').addEventListener('click',()=>{if(!pageSelection)return;const set=pageSettings();if(set){delete set.frame;delete set.quad}saveScenes();renderWebtoon()});
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src})}
async function saveWebtoon(){const st=t=>$('#wst').textContent=t;st('이미지 만드는 중');
  await loadPageMaterials();
  const items=[];for(let i=0;i<SCENES.length;i++){const ps=scenePanels(i);if(!ps.length)continue;const art=await RoughExport.inlineSceneSVG(i);
    items.push({i,im:await loadImg('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art.svg))})}
  if(!items.length){st('저장할 컷이 없어요');return}
  const LABEL=56,total=items.reduce((a,x)=>a+LABEL+x.im.height*W/x.im.width,0);
  const draw=(list,name)=>{const H=Math.round(list.reduce((a,x)=>a+LABEL+x.im.height*W/x.im.width,0));const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);let y=0;
    for(const x of list){g.fillStyle='#8a8f98';g.font='600 15px Pretendard, sans-serif';g.textAlign='center';g.fillText(sceneLabel(SCENES[x.i],x.i),W/2,y+34);y+=LABEL;const h=x.im.height*W/x.im.width;g.drawImage(x.im,0,y,W,h);y+=h}
    return new Promise(res=>c.toBlob(bl=>{download(name,URL.createObjectURL(bl));res()},'image/png'))};
  const base=($('#wtitle').value||'webtoon').replace(/[\\/:*?"<>|]/g,'_');
  if(total<=30000){await draw(items,`${base}.png`);st('이미지로 저장했어요')}else{for(const x of items)await draw([x],`${base}-씬${x.i+1}.png`);st(`길어서 씬별 ${items.length}장으로 저장했어요`)}}

// ---------- 작업 파일: localStorage의 rough-* 설정(AI 키 제외) + IndexedDB 이미지(rough-refs)를 한 JSON으로 ----------
const PJ_SKIP=new Set(['rough-ai-key']);
async function saveProject(){const local={};for(let k=0;k<localStorage.length;k++){const key=localStorage.key(k);if(key.startsWith('rough-')&&!PJ_SKIP.has(key))local[key]=localStorage.getItem(key)}
  flushScenes();local['rough-scenes']=JSON.stringify(SCENES);local['rough-scene-cur']=String(SCUR);  // 기본 저장 공간이 차서 IndexedDB에만 있어도 빠지지 않게
  for(const r of (await idb.allDocs()))if(r.json&&r.id.startsWith('doc:rough-ep:')&&local[r.id.slice(4)]==null)local[r.id.slice(4)]=r.json;
  const images=(await idb.all()).filter(r=>!String(r.id).startsWith('snap:'));
  const data={format:'rough-project',version:1,savedAt:new Date().toISOString(),title:$('#wtitle')?.value||'',scenes:SCENES.length,local,images};
  const base=($('#wtitle')?.value||'webtoon').replace(/[\\/:*?"<>|]/g,'_'),blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  download(`${base}-${new Date().toISOString().slice(0,10)}.rough.json`,URL.createObjectURL(blob));
  toast(`작업 파일을 저장했어요 · 씬 ${SCENES.length}개 · 이미지 ${images.length}장 · ${(blob.size/1048576).toFixed(1)}MB`,3500)}
function loadProjectPick(){const f=document.createElement('input');f.type='file';f.accept='.json,application/json';f.onchange=()=>f.files[0]&&loadProject(f.files[0]);f.click()}
async function loadProject(file){let d;try{d=JSON.parse(await file.text())}catch(_){toast('작업 파일을 읽지 못했어요');return}
  if(d?.format!=='rough-project'||!d.local){toast('러프 툴 작업 파일이 아니에요');return}
  if(!confirm(`「${d.title||'제목 없음'}」(${(d.savedAt||'').slice(0,16).replace('T',' ')} 저장 · 씬 ${d.scenes||'?'}개 · 이미지 ${(d.images||[]).length}장)으로 지금 작업을 바꿀까요?\n지금 작업은 사라지니 필요하면 먼저 '작업 파일 저장'을 해 두세요.`))return;
  window.ROUGH_NOSAVE=true;for(const r of await idb.allDocs())await idb.del(r.id);  // 불러온 원고가 다시 덮이지 않게
  try{const keep=localStorage.getItem('rough-ai-key');const old=[];for(let k=0;k<localStorage.length;k++){const key=localStorage.key(k);if(key.startsWith('rough-')&&!PJ_SKIP.has(key))old.push(key)}
    old.forEach(k=>localStorage.removeItem(k));for(const [k,v] of Object.entries(d.local))if(k.startsWith('rough-')&&!PJ_SKIP.has(k))localStorage.setItem(k,v);if(keep)localStorage.setItem('rough-ai-key',keep)}
  catch(e){saveFail(e,'작업 파일');return}
  for(const r of await idb.all())if(!String(r.id).startsWith('snap:'))await idb.del(r.id);
  for(const r of d.images||[])if(r&&r.id)await idb.put(r);
  toast('불러왔어요. 화면을 다시 열어요');setTimeout(()=>location.reload(),600)}
// 이전 버전: 원고(씬·편집값)를 10분에 한 번 IndexedDB에 남김(회차마다 최근 30개). 이미지는 그대로 두고 원고만 되돌림
// 비교: 고른 버전과 지금을 나란히 그리고, 글이 바뀐 컷을 목록으로
let snapAt=0;
const epId=()=>window.RoughEpisodes?.cur?.id||'';
function autoSnapshot(force,label){const now=Date.now();if(!force&&now-snapAt<600000)return Promise.resolve();snapAt=now;
  const o={id:'snap:'+now,kind:'snap',at:now,ep:epId(),label:label||'',title:$('#wtitle')?.value||'',scenes:JSON.stringify(SCENES)};
  return idb.put(o).then(async()=>{const snaps=(await idb.all()).filter(r=>r.kind==='snap'&&(r.ep||'')===o.ep).sort((a,b)=>b.at-a.at);for(const r of snaps.slice(30))idb.del(r.id)})}
const snapSum=j=>{try{const a=JSON.parse(j);return `씬 ${a.length}개 · 컷 ${a.reduce((n,sc)=>n+sc.cuts.filter(c=>c.trim()).length,0)}개`}catch(_){return''}};
// 다른 원고를 잠깐 그려 보기: 지금 원고를 건드리지 않게 씬 목록을 바꿔 끼웠다가 되돌림
function renderScenesOf(arr){const keep=SCENES.slice(),keepCur=SCUR,keepCache=new Map(SP_CACHE);const out=[];
  try{SCENES.splice(0,SCENES.length,...arr);SCUR=-1;SP_CACHE.clear();SP_FRESH=null;
    arr.forEach((sc,i)=>{const ps=scenePanels(i);out.push(ps.length?sceneArt(i,ps,`v${i}_${Math.random().toString(36).slice(2,6)}_`,false).svg:'<p class="empty">컷 없음</p>')})}
  finally{SCENES.splice(0,SCENES.length,...keep);SCUR=keepCur;SP_CACHE.clear();keepCache.forEach((v,k)=>SP_CACHE.set(k,v));SP_FRESH=null}
  return out}
function diffScenes(oldArr,newArr){const rows=[],n=Math.max(oldArr.length,newArr.length);
  for(let i=0;i<n;i++){const A=oldArr[i]?.cuts||[],B=newArr[i]?.cuts||[],m=Math.max(A.length,B.length);
    for(let k=0;k<m;k++){const x=String(A[k]??'').trim(),y=String(B[k]??'').trim();if(x!==y)rows.push({i,k,kind:!x?'추가':!y?'삭제':'수정',x,y})}
    const ea=JSON.stringify(oldArr[i]?.pageEdits||[]),eb=JSON.stringify(newArr[i]?.pageEdits||[]);if(ea!==eb&&!rows.some(r=>r.i===i))rows.push({i,k:-1,kind:'편집',x:'',y:''})}
  return rows}
async function openCompare(r){let d=$('#cmpdlg');if(!d){d=document.createElement('dialog');d.id='cmpdlg';d.className='cmpdlg';document.body.appendChild(d)}
  const old=JSON.parse(r.scenes),A=renderScenesOf(old),B=SCENES.map((sc,i)=>{const ps=scenePanels(i);return ps.length?sceneArt(i,ps,`c${i}_`,false).svg:'<p class="empty">컷 없음</p>'});
  const rows=diffScenes(old,SCENES),cut=s=>esc(s.replace(/\s+/g,' ').slice(0,60));
  d.innerHTML=`<header><h3>버전 비교</h3><span class="hint">${new Date(r.at).toLocaleString()}${r.label?' · '+esc(r.label):''} ↔ 지금</span><button class="btn" data-cmp="restore">이 버전으로 되돌리기</button><button class="btn" data-cmp="x">닫기</button></header>
    <div class="cmpdiff">${rows.length?`<b>바뀐 곳 ${rows.length}</b><ul>${rows.slice(0,60).map(x=>`<li><i class="k-${x.kind}">${x.kind}</i>씬 ${x.i+1}${x.k>=0?` · ${x.k+1}컷`:' · 배치·식자'}${x.k>=0?`<span><s>${cut(x.x)}</s> → ${cut(x.y)}</span>`:''}</li>`).join('')}</ul>`:'<b>글은 같아요</b> · 배치·식자만 달라졌을 수 있어요'}</div>
    <div class="cmpcols"><div class="cmpcol" data-side="a"><h4>그때</h4>${A.map((svg,i)=>`<section><div class="scn">${esc(sceneLabel(old[i],i))}</div>${svg}</section>`).join('')}</div>
    <div class="cmpcol" data-side="b"><h4>지금</h4>${B.map((svg,i)=>`<section><div class="scn">${esc(sceneLabel(SCENES[i],i))}</div>${svg}</section>`).join('')}</div></div>`;
  const [ca,cb]=d.querySelectorAll('.cmpcol');let lock=false;const sync=(x,y)=>x.addEventListener('scroll',()=>{if(lock)return;lock=true;y.scrollTop=x.scrollTop/(x.scrollHeight-x.clientHeight||1)*(y.scrollHeight-y.clientHeight);requestAnimationFrame(()=>lock=false)});sync(ca,cb);sync(cb,ca);
  d.onclick=e=>{const b=e.target.closest('[data-cmp]');if(!b)return;if(b.dataset.cmp==='x'){d.close();return}if(b.dataset.cmp==='restore'){d.close();restoreSnap(r)}};
  d.showModal()}
async function restoreSnap(r){if(!confirm(`${new Date(r.at).toLocaleString()} 원고로 되돌릴까요? 지금 상태는 기록에 남겨 둬요.`))return;await autoSnapshot(true,'되돌리기 전');
  const arr=JSON.parse(r.scenes);SCENES.splice(0,SCENES.length,...arr);SCUR=Math.min(SCUR,SCENES.length-1);CUTS=SCENES[SCUR].cuts;saveScenes();renderSceneList();renderCuts();compute(true);if(VIEW==='webtoon')renderWebtoon();$('#histdlg')?.close();toast('이전 버전으로 되돌렸어요')}
async function openHistory(){const ep=epId(),snaps=(await idb.all()).filter(r=>r.kind==='snap'&&(!r.ep||r.ep===ep)).sort((a,b)=>b.at-a.at);
  let d=$('#histdlg');if(!d){d=document.createElement('dialog');d.id='histdlg';d.className='keydlg';document.body.appendChild(d)}
  d.innerHTML=`<h3>이전 버전${window.RoughEpisodes?` · ${esc(RoughEpisodes.cur.title)}`:''}</h3><p class="hint">원고(씬·컷 글·편집값)를 10분에 한 번 이 브라우저에 남겨요(회차마다 최근 30개). 「비교」로 지금과 나란히 보고, 되돌리기 전에 지금 상태도 남겨 둬요. 컷 이미지는 바뀌지 않아요.</p>
    <div class="snapnow"><input id="snaplabel" placeholder="이름 (예: 1차 수정 전)" maxlength="30"><button class="btn" data-snapnow>지금 버전 남기기</button></div>
    ${snaps.length?`<ul class="histl">${snaps.map(r=>`<li><span>${new Date(r.at).toLocaleString()}${r.label?` · <b>${esc(r.label)}</b>`:''}<small>${esc(snapSum(r.scenes))}</small></span><button class="btn" data-cmpsnap="${r.id}">비교</button><button class="btn" data-snap="${r.id}">이 버전으로</button></li>`).join('')}</ul>`:'<p class="empty">아직 남은 기록이 없어요. 편집하면 10분마다 생겨요.</p>'}<div class="acts"><button class="btn" data-r="x">닫기</button></div>`;
  d.onclick=async e=>{if(e.target.closest('[data-r]')){d.close();return}
    if(e.target.closest('[data-snapnow]')){await autoSnapshot(true,$('#snaplabel').value.trim());toast('지금 버전을 남겼어요');openHistory();return}
    const c=e.target.closest('[data-cmpsnap]');if(c){const r=snaps.find(x=>x.id===c.dataset.cmpsnap);if(r)openCompare(r);return}
    const b=e.target.closest('[data-snap]');if(!b)return;const r=snaps.find(x=>x.id===b.dataset.snap);if(r)restoreSnap(r)};
  if(!d.open)d.showModal()}
window.RoughVersions={openHistory,openCompare,snapshot:autoSnapshot};

// ---------- 대사 교정(#19): 모든 씬의 대사·나레이션·효과음 줄을 한 화면에서 고치고, 찾아 바꾸기 ----------
// 줄 끝의 연출 지시 {…}는 post에 남겨 고쳐도 그대로
const PROOF_RE=[[/^(\s*(?:@\S+\s*)?(?:\([^)]*\)\s*)?["“])(.*?)(["”]\s*(?:\{[^{}\n]*\}\s*)*)$/,'대사'],[/^(\s*\[)(.*?)(\]\s*(?:\{[^{}\n]*\}\s*)*)$/,'나레이션'],[/^(\s*-{1,3})([^-].*?)(-{1,3}\s*(?:\{[^{}\n]*\}\s*)*)$/,'효과음']];
function proofLines(){const out=[];SCENES.forEach((sc,si)=>sc.cuts.forEach((c,ci)=>String(c).split('\n').forEach((l,li)=>{for(const [re,kind] of PROOF_RE){const m=l.match(re);if(m){out.push({si,ci,li,kind,pre:m[1],text:m[2],post:m[3],who:(l.match(/@(\S+)/)||[])[1]||''});break}}})));return out}
function openProof(){let d=$('#proofdlg');if(!d){d=document.createElement('dialog');d.id='proofdlg';d.className='proofdlg';document.body.appendChild(d)}
  const draw=()=>{const L=proofLines(),q=d.querySelector('#pfq')?.value||'';const over=SCENES.map(sc=>(sc.pageEdits||[]).reduce((n,e)=>n+Object.values(e?.letters||{}).filter(x=>typeof x?.text==='string').length,0));
    let last=-1;d.querySelector('.pfl').innerHTML=L.map((x,k)=>{const head=x.si!==last?`<li class="pfh">${esc(sceneLabel(SCENES[x.si],x.si))}${over[x.si]?` <small>· 편집 화면에서 직접 고친 문구 ${over[x.si]}개는 그 화면에서 우선해 보여요</small>`:''}</li>`:'';last=x.si;
      const hit=q&&x.text.includes(q);return head+`<li${hit?' class="hit"':''}><span class="pfk">${x.ci+1}컷 · ${x.kind}${x.who?' · '+esc(x.who):''}</span><input data-pf="${k}" value="${esc(x.text)}" spellcheck="true" lang="ko"></li>`}).join('')||'<li class="empty">대사·나레이션·효과음 줄이 없어요</li>';
    d.querySelector('#pfn').textContent=`${L.length}줄${q?` · "${q}" ${L.filter(x=>x.text.includes(q)).length}줄`:''}`;d._L=L};
  d.innerHTML=`<h3>대사 교정 <small id="pfn"></small></h3><div class="pfbar"><input id="pfq" placeholder="찾기"><input id="pfr" placeholder="바꿀 말"><button class="btn" data-pfall>모두 바꾸기</button></div><ul class="pfl"></ul><div class="acts"><span class="hint">칸을 고치면 바로 원고에 반영돼요 · Ctrl+Z로 되돌리기(편집 화면)</span><button class="btn dark" data-r="x">닫기</button></div>`;
  draw();
  d.addEventListener('change',e=>{const i=e.target.closest('[data-pf]');if(!i)return;const x=d._L[+i.dataset.pf],sc=SCENES[x.si],lines=String(sc.cuts[x.ci]).split('\n');lines[x.li]=x.pre+i.value.replace(/\n/g,' ')+x.post;sc.cuts[x.ci]=lines.join('\n');if(x.si===SCUR)CUTS=sc.cuts;saveScenes();d._dirty=true;draw()});
  d.querySelector('#pfq').addEventListener('input',draw);
  d.addEventListener('click',e=>{if(e.target.closest('[data-r]')){d.close();return}if(!e.target.closest('[data-pfall]'))return;const q=$('#pfq').value,r=$('#pfr').value;if(!q)return;let n=0;
    for(const x of d._L){if(!x.text.includes(q))continue;const sc=SCENES[x.si],lines=String(sc.cuts[x.ci]).split('\n');lines[x.li]=x.pre+x.text.split(q).join(r)+x.post;sc.cuts[x.ci]=lines.join('\n');n++}
    if(n){CUTS=SCENES[SCUR].cuts;saveScenes();d._dirty=true}toast(`${n}줄을 바꿨어요`);draw()});
  d.onclose=()=>{if(d._dirty){d._dirty=false;renderCuts();compute(false);if(VIEW==='webtoon')renderWebtoon()}};
  d.showModal();d.querySelector('#pfq').focus()}
$('#wproof').addEventListener('click',openProof);

// ---------- 연재용 분할 내보내기: 폭·한 장 최대 높이·형식을 정해 여러 장(ZIP)으로. 씬 제목 없이 이어 붙이고, 컷 사이 여백(한 줄이 모두 같은 색)에서 자름 ----------
const SLICE_DEF={w:690,h:1280,fmt:'jpg',q:92,gap:0,title:false,smart:true};
function sliceOpts(){try{return{...SLICE_DEF,...JSON.parse(localStorage.getItem('rough-slice')||'{}')}}catch(_){return{...SLICE_DEF}}}
function openSliceDialog(){const o=sliceOpts();let d=$('#slicedlg');if(!d){d=document.createElement('dialog');d.id='slicedlg';d.className='keydlg';document.body.appendChild(d)}
  d.innerHTML=`<h3>연재용 분할 내보내기</h3><p class="hint">연재처 규격(폭·한 장 최대 높이)에 맞춰 넣어 주세요. 결과는 순서대로 이름 붙은 이미지 ZIP이에요.</p>
  <div class="slicef"><label>폭(px)<input type="number" name="w" min="300" max="2000" step="10" value="${o.w}"></label>
  <label>한 장 최대 높이(px)<input type="number" name="h" min="300" max="20000" step="10" value="${o.h}"></label>
  <label>형식<select name="fmt"><option value="jpg"${o.fmt==='jpg'?' selected':''}>JPG</option><option value="png"${o.fmt==='png'?' selected':''}>PNG</option></select></label>
  <label>JPG 품질<input type="number" name="q" min="50" max="100" value="${o.q}"></label>
  <label>씬 사이 간격(px)<input type="number" name="gap" min="0" max="3000" step="10" value="${o.gap}"></label>
  <label class="chk"><input type="checkbox" name="smart"${o.smart?' checked':''}> 컷 사이 여백에서 자르기(그림·말풍선을 가르지 않게)</label>
  <label class="chk"><input type="checkbox" name="title"${o.title?' checked':''}> 씬 제목 넣기(검수본용)</label></div>
  <p class="hint" id="slicest"></p><div class="acts"><button class="btn" data-r="x">닫기</button><button class="btn dark" data-r="go">내보내기</button></div>`;
  d.onclick=async e=>{const r=e.target.closest('[data-r]')?.dataset.r;if(!r)return;if(r==='x'){d.close();return}
    const f=k=>d.querySelector(`[name=${k}]`),num=(k,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(+f(k).value||SLICE_DEF[k])));
    const opt={w:num('w',300,2000),h:num('h',300,20000),fmt:f('fmt').value,q:num('q',50,100),gap:num('gap',0,3000),smart:f('smart').checked,title:f('title').checked};
    try{localStorage.setItem('rough-slice',JSON.stringify(opt))}catch(_){}
    const st=t=>{$('#slicest').textContent=t;$('#wst').textContent=t};e.target.disabled=true;
    try{await exportSlices(opt,st)}catch(err){console.error(err);st('내보내기 실패: '+(err.message||err))}finally{e.target.disabled=false}};
  d.showModal()}
// 한 줄이 모두 같은 색(±6)인지
function rowFlat(data,w,y){const i0=y*w*4,r=data[i0],g=data[i0+1],b=data[i0+2];for(let x=1;x<w;x++){const i=i0+x*4;if(Math.abs(data[i]-r)>6||Math.abs(data[i+1]-g)>6||Math.abs(data[i+2]-b)>6)return false}return true}
async function exportSlices(o,st){st('이미지 만드는 중');await loadPageMaterials();
  const items=[];for(let i=0;i<SCENES.length;i++){if(!scenePanels(i).length)continue;st(`씬 ${i+1}/${SCENES.length} 그리는 중`);const art=await RoughExport.inlineSceneSVG(i);
    items.push({i,im:await loadImg('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art.svg))})}
  if(!items.length){st('저장할 컷이 없어요');return}
  // 전체 세로 배치(출력 좌표)
  const LABEL=o.title?Math.round(56*o.w/W):0;let y=0;const lay=items.map((x,k)=>{if(k)y+=o.gap;const t=y;y+=LABEL;const h=Math.round(x.im.height*o.w/x.im.width),it={...x,t,y,h};y+=h;return it});const total=y;
  const paint=(g,y0,hh)=>{g.fillStyle='#fff';g.fillRect(0,0,o.w,hh);
    for(const x of lay){if(x.y+x.h<y0&&x.t+LABEL<y0)continue;if(x.t>y0+hh)break;
      if(LABEL){g.fillStyle='#8a8f98';g.font=`600 ${Math.round(15*o.w/W)}px Pretendard, sans-serif`;g.textAlign='center';g.fillText(sceneLabel(SCENES[x.i],x.i),o.w/2,x.t-y0+LABEL*0.6)}
      g.drawImage(x.im,0,x.y-y0,o.w,x.h)}};
  const files=[],ext=o.fmt==='png'?'png':'jpg',type=o.fmt==='png'?'image/png':'image/jpeg',base=($('#wtitle').value||'webtoon').replace(/[\\/:*?"<>|]/g,'_');
  let y0=0,n=0,hard=0;
  while(y0<total){let hh=Math.min(o.h,total-y0);const c=document.createElement('canvas');c.width=o.w;c.height=hh;const g=c.getContext('2d');paint(g,y0,hh);
    if(o.smart&&y0+hh<total){const data=g.getImageData(0,0,o.w,hh).data,lo=Math.floor(hh*0.4);let cut=-1;
      for(let yy=hh-1;yy>=lo;yy--)if(rowFlat(data,o.w,yy)){cut=yy+1;break}
      // 아래쪽 60% 안에 여백이 없으면(키 큰 컷) 더 위의 여백까지 봄: 장이 짧아져도 그림을 가르지 않는 쪽이 우선
      if(cut<0)for(let yy=lo-1;yy>=Math.floor(hh*0.05);yy--)if(rowFlat(data,o.w,yy)){cut=yy+1;break}
      if(cut>0&&cut<hh){const c2=document.createElement('canvas');c2.width=o.w;c2.height=cut;c2.getContext('2d').drawImage(c,0,0);hh=cut;c.width=0;
        files.push({name:`${base}_${String(++n).padStart(3,'0')}.${ext}`,data:new Uint8Array(await (await new Promise(r=>c2.toBlob(r,type,o.q/100))).arrayBuffer())});y0+=hh;st(`${n}장째 · ${Math.round(y0/total*100)}%`);continue}
      if(cut!==hh)hard++}
    files.push({name:`${base}_${String(++n).padStart(3,'0')}.${ext}`,data:new Uint8Array(await (await new Promise(r=>c.toBlob(r,type,o.q/100))).arrayBuffer())});y0+=hh;st(`${n}장째 · ${Math.round(y0/total*100)}%`)}
  const z=await RoughExport._zip(files);download(`${base}-연재용-${o.w}x${o.h}.zip`,URL.createObjectURL(z));
  st(`${n}장으로 나눠 저장했어요 · 전체 ${o.w}×${total}px${hard?` · 한 장 높이보다 긴 컷이라 그림 위에서 자른 곳 ${hard}군데`:''}`);return{n,total,hard,names:files.map(f=>f.name)}}
