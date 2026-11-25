// 러프 툴 본체 5/6 — 편집 보강: 목차 트리·속성·실행 취소·저장 표시
// 원본 조각: tools/build_app.py가 6개를 순서대로 이어 rough/app.js를 만듦(사이트는 app.js 하나를 실음 — 조각끼리 불러올 때 서로 부르는 곳이 많아 따로 싣지 않음)
// ---------- 편집 화면 보강: 목차 트리 · 속성 패널 · 실행 취소 · 자동 저장 표시 (포스타입·노션 에디터 참고) ----------
function editTree(){const el=$('#wtoc');if(!el)return;const groups=[...pageReader.querySelectorAll('[data-slot-index]')];const by={};
  groups.forEach(g=>{const sc=+g.closest('section').dataset.pageScene;(by[sc]||=[]).push(g)});
  el.innerHTML=SCENES.map((sc,i)=>{const ps=scenePanels(i),gs=by[i]||[];
    return `<a class="tsc" href="#ws-${i}" data-toc="${i}">${esc(sceneLabel(sc,i))}</a>`+gs.map(g=>{const k=pageKey(g),p=ps[+g.dataset.p]||{};const has=!!cutImg(i,+g.dataset.p,p);
      return `<button class="tcut" data-tcut="${esc(k)}" aria-current="${k===pageSelection}"><i class="${has?'on':''}" title="${has?'이미지 등록됨':'러프'}"></i>${+g.dataset.p+1}컷<small>${esc(p.shot||'')}</small></button>`}).join('')}).join('')}
const isEffectLetter=letter=>/^(?:effect|material)-/.test(letter.dataset.letter);
const materialCatalog=window.RoughMaterials;
const materialSearch=$('#wmaterial-search'),materialQuery=$('#wmaterial-query');
const materialResult=$('#wmaterial-result'),materialVariants=$('#wmaterial-variants');
let materialMode='',materialDrag=null,materialRows=[],materialRefresh=0;
let materialFavorites;
try{materialFavorites=new Set(JSON.parse(localStorage.getItem('rough-material-favorites')||'[]'))}
catch{materialFavorites=new Set()}
const materialStatus=message=>{$('#wmaterial-status').textContent=message};
const materialLabel={A:'흰 테두리',B:'계단형',C:'가는 펜선',D:'컷 전 선행음'};
function hasLeadSounds(){
  return SCENES.some(sc=>sc.pageEdits.some(edit=>Object.values(edit?.letters||{}).some(item=>item.materialVariant==='D')));
}
async function loadPageMaterials(){
  materialRows=await materialCatalog.ready();
  const used=new Map();
  SCENES.forEach((sc,scene)=>{
    scenePanels(scene).forEach((p,i)=>{
      const edit=sc.pageEdits[cutSlot(p,i)],add=(word,key)=>{
        const entry=materialCatalog.find(edit?.letters?.[key]?.text??word);
        if(entry)used.set(entry.id+'|'+(edit?.letters?.[key]?.materialVariant||'A'),[entry,edit?.letters?.[key]?.materialVariant||'A']);
      };
      p.sfx?.forEach((word,n)=>add(word,'effect-'+n));
      edit?.materialSounds?.forEach(item=>add(item.text,'material-'+item.id));
    });
  });
  // 원고에 쓴 타입 그림만(타입 바꾸기 버튼을 열 때 나머지를 받음)
  await Promise.all([...used.values()].map(([entry,variant])=>materialCatalog.load(entry,variant).catch(()=>{})));
}
function refreshPageMaterials(){
  const ticket=++materialRefresh;
  loadPageMaterials().then(()=>{
    if(ticket!==materialRefresh||VIEW!=='webtoon')return;
    filterMaterials();
    if(!(materialDrag||frameDrag||artDrag||pageDrag||gapDrag||tailDrag)&&PATS.length)renderWebtoon();
    else refreshSelectedMaterial();
  }).catch(()=>materialStatus('소재를 불러오지 못했어요. 다시 편집 탭을 열어 주세요.'));
}
function filterMaterials(){
  const query=materialQuery.value.normalize('NFKC').trim();
  const previous=materialResult.value;
  const starred=$('#wmaterial-starred').checked;
  const choices=materialRows.filter(row=>(!starred||materialFavorites.has(row.id))&&
    (!query||row.word.normalize('NFKC').includes(query)||row.category.includes(query)));
  materialResult.replaceChildren(...choices.map(row=>new Option(row.word+' · '+row.category,row.id)));
  if(choices.some(row=>row.id===previous))materialResult.value=previous;
  refreshMaterialFavorite();
}
function refreshMaterialFavorite(){
  const id=materialResult.value,star=materialFavorites.has(id),button=$('#wmaterial-fav');
  button.setAttribute('aria-pressed',star);
  button.textContent=star?'★ 즐겨찾기':'☆ 즐겨찾기';
  button.disabled=!id;
  $('#wmaterial-add').disabled=!id;
}
$('#wmaterial-import').addEventListener('click',()=>$('#wmaterial-zip').click());
$('#wmaterial-zip').addEventListener('change',async e=>{
  const file=e.target.files[0];
  e.target.value='';
  if(!file)return;
  const button=$('#wmaterial-import');button.disabled=true;
  materialStatus('효과음 ZIP을 읽는 중이에요.');
  try{
    materialRows=await materialCatalog.install(file);
    await loadPageMaterials();
    if(VIEW==='webtoon'){filterMaterials();renderWebtoon();materialSearch.open=true}
    materialStatus(materialRows.length+'개 효과음을 불러왔어요.');
  }catch(error){materialStatus(error?.message||'효과음 ZIP을 불러오지 못했어요.')}
  finally{button.disabled=false}
});
materialQuery.addEventListener('input',filterMaterials);
$('#wmaterial-starred').addEventListener('change',filterMaterials);
materialResult.addEventListener('change',refreshMaterialFavorite);
$('#wmaterial-fav').addEventListener('click',()=>{
  const id=materialResult.value;if(!id)return;
  if(materialFavorites.has(id))materialFavorites.delete(id);else materialFavorites.add(id);
  try{localStorage.setItem('rough-material-favorites',JSON.stringify([...materialFavorites]))}catch{}
  filterMaterials();
});
$('#wmaterial-add').addEventListener('click',async()=>{
  const entry=materialCatalog.entry(materialResult.value),key=pageSelection;
  if(!entry||!key)return;
  try{await materialCatalog.load(entry)}catch{materialStatus('효과음 이미지를 불러오지 못했어요.');return}
  if(VIEW!=='webtoon'||pageSelection!==key||!pageEditing)return;
  const settings=pageSettings(true,key);
  const id=crypto.randomUUID();
  (settings.materialSounds||=[]).push({id,text:entry.word});
  saveScenes();renderWebtoon();
  const letter=pageReader.querySelector('[data-letter="material-'+id+'"]');
  if(letter)selectLetter(letter);
  materialStatus(entry.word+' 효과음을 넣었어요.');
});
async function refreshSelectedMaterial(){
  const selected=selectedLetter;
  materialVariants.hidden=true;
  $('#wmaterial-remove-sfx').hidden=!selected?.dataset.letter.startsWith('material-');
  if(!selected||!isEffectLetter(selected))return;
  try{
    if(!materialRows.length)materialRows=await materialCatalog.ready();
    if(selected!==selectedLetter)return;
    const entry=materialCatalog.find(selected.dataset.letterText);
    if(!entry)return;
    await materialCatalog.load(entry);
    if(selected!==selectedLetter)return;
    const current=letterPosition(selected).materialVariant||'A';
    materialVariants.innerHTML=materialCatalog.variants.map(v=>{
      const art=materialCatalog.image(entry,v);
      return `<button class="btn sm" type="button" data-material-variant="${v}" aria-pressed="${current===v}"><img src="${art.src}" alt=""><small>${v} · ${materialLabel[v]}</small></button>`;
    }).join('');
    materialVariants.hidden=false;
  }catch{materialStatus('시안 이미지를 불러오지 못했어요.')}
}
materialVariants.addEventListener('click',e=>{
  const variant=e.target.closest('[data-material-variant]')?.dataset.materialVariant;
  if(!variant||!selectedLetter||!isEffectLetter(selectedLetter))return;
  saveLetter(selectedLetter,{materialVariant:variant});
  renderWebtoon();
  materialStatus(variant==='D'?'효과음을 컷 앞 여백에 넣었어요.':'효과음 시안을 바꿨어요.');
});
$('#wmaterial-remove-sfx').addEventListener('click',()=>{
  const key=selectedLetter?.dataset.letter,settings=pageSelection&&pageSettings();
  if(!key?.startsWith('material-')||!settings?.materialSounds)return;
  settings.materialSounds=settings.materialSounds.filter(item=>'material-'+item.id!==key);
  if(settings.letters)delete settings.letters[key];
  selectLetter(null);saveScenes();renderWebtoon();
});
function armMaterialLine(kind){
  materialMode=kind;
  if(kind)pageReader.dataset.materialMode=kind;else delete pageReader.dataset.materialMode;
  document.querySelectorAll('[data-material-line]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.materialLine===kind)));
  materialStatus(kind==='focus'?'컷 안에서 강조할 지점을 누르세요.':kind==='speed'?'컷 안에서 움직임 방향으로 드래그하세요.':'');
  if(kind&&matchMedia('(max-width:760px)').matches){
    $('#wtools').classList.remove('open');$('#wsheet').setAttribute('aria-expanded','false');
  }
}
document.querySelectorAll('[data-material-line]').forEach(button=>button.addEventListener('click',()=>{
  const kind=button.dataset.materialLine;
  armMaterialLine(materialMode===kind?'':kind);
}));
function startMaterialLine(e){
  const group=e.target.closest('[data-slot-index]');
  if(!group)return;
  const frame=JSON.parse(group.dataset.frame),point=pagePoint(group,e);
  if(point.x<frame.x||point.x>frame.x+frame.w||point.y<frame.y||point.y>frame.y+frame.h)return;
  e.preventDefault();
  selectPageCut(group);selectLetter(null);
  materialDrag={id:e.pointerId,group,frame,point,kind:materialMode};
  pageReader.setPointerCapture(e.pointerId);
}
function finishMaterialLine(e){
  const {group,frame,point,kind}=materialDrag;
  materialDrag=null;
  const end=pagePoint(group,e),dx=end.x-point.x,dy=end.y-point.y;
  if(kind==='speed'&&Math.hypot(dx,dy)<8){materialStatus('방향을 표시할 만큼 더 길게 끌어 주세요.');return}
  const settings=pageSettings(true,pageKey(group));
  const lines=(settings.materialLines||={}),current=lines[kind];
  lines[kind]={kind,x:(point.x-frame.x)/frame.w,y:(point.y-frame.y)/frame.h,
    angle:Math.atan2(dy,dx),color:current?.color||'#27211e',density:current?.density||50};
  $('#wmaterial-line-kind').value=kind;
  saveScenes();armMaterialLine('');renderWebtoon();
  // 한 번 넣으면 선택 도구로 돌아감(도구가 남아 있어 다음 클릭마다 효과선이 또 들어가던 문제)
  window.RoughWS?.setTool?.('select');
  materialStatus(kind==='focus'?'집중선을 넣었어요.':'속도선을 넣었어요.');
}
function showMaterialLine(){
  const lines=pageSelection&&pageSettings()?.materialLines;
  const existing=Object.keys(lines||{}),select=$('#wmaterial-line-kind');
  $('#wmaterial-line-edit').hidden=!existing.length;
  if(!existing.length)return;
  [...select.options].forEach(o=>o.disabled=!existing.includes(o.value));
  if(!existing.includes(select.value))select.value=existing[0];
  $('#wmaterial-color').value=lines[select.value].color;
  $('#wmaterial-density').value=lines[select.value].density;
}
$('#wmaterial-line-kind').addEventListener('change',showMaterialLine);
for(const prop of ['color','density']){
  $('#wmaterial-'+prop).addEventListener('change',e=>{
    const kind=$('#wmaterial-line-kind').value,line=pageSelection&&pageSettings()?.materialLines?.[kind];
    if(!line)return;
    line[prop]=prop==='density'?Number(e.target.value):e.target.value;
    saveScenes();renderWebtoon();
  });
}
$('#wmaterial-delete').addEventListener('click',()=>{
  const lines=pageSelection&&pageSettings()?.materialLines;if(!lines)return;
  delete lines[$('#wmaterial-line-kind').value];saveScenes();renderWebtoon();
});
function inspector(){const L=!!selectedLetter,C=!!pageSelection;$('#wsec-letter').hidden=!L;$('#wsec-cut').hidden=!C;$('#wempty').hidden=L;
  $('#wmaterials').hidden=!pageEditing||!C;materialSearch.hidden=!C||!materialRows.length;showMaterialLine();
  $('#wsheett').textContent=L?`에셋 · ${$('#wlettertextlabel').textContent.replace(' 문구','')}`:C?`에셋 · ${pageCut.selectedOptions[0]?.textContent||'컷'}`:'에셋';if(L&&matchMedia('(max-width:760px)').matches){$('#wtools').classList.add('open');$('#wsheet').setAttribute('aria-expanded','true')}
  document.querySelectorAll('#wtoc .tcut').forEach(b=>b.setAttribute('aria-current',b.dataset.tcut===pageSelection))}
{const _sl=selectLetter;selectLetter=function(...a){const r=_sl(...a);inspector();refreshSelectedMaterial();return r}}
{const _sc=selectPageCut;selectPageCut=function(...a){const r=_sc(...a);inspector();return r}}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);editTree();inspector();return r}}
$('#wlayers').addEventListener('click',()=>{const o=$('#v-webtoon').classList.toggle('showlayers');$('#wlayers').setAttribute('aria-expanded',o)});
$('#wtoc').addEventListener('click',e=>{if(e.target.closest('[data-tcut]')&&matchMedia('(max-width:760px)').matches){$('#v-webtoon').classList.remove('showlayers');$('#wlayers').setAttribute('aria-expanded',false)}},true);
$('#wsheet').addEventListener('click',()=>{const o=$('#wtools').classList.toggle('open');$('#wsheet').setAttribute('aria-expanded',o)});
$('#wtoc').addEventListener('click',e=>{const b=e.target.closest('[data-tcut]');if(!b)return;e.preventDefault();pageCut.value=b.dataset.tcut;pageCut.dispatchEvent(new Event('change'))});
// 실행 취소: 편집 화면에서 저장될 때마다 이전 상태(씬별 pageEdits)를 쌓음. 연속 드래그는 0.6초 단위로 묶음
const UNDO=[],REDO=[];let edSnap=null,edLast=0,edRestoring=false,edSavedAt=0;
// 등록 이미지 위치도 기록(m: [패널 번호, 이미지 uid, sig]). 그림 자체는 IMG_POOL에 두고 uid로만 가리킴 → 컷 순서를 되돌리면 이미지도 제자리로
const IMG_POOL=new Map();let imgUid=0;
function imgPlace(sc){return Object.values(IMG.cut).filter(r=>r.scene===sc.id).map(r=>{if(!r.uid)r.uid='u'+Date.now().toString(36)+'-'+(imgUid++);IMG_POOL.set(r.uid,r);return[r.idx,r.uid,r.sig]}).sort((a,b)=>a[0]-b[0])}
function imgRestore(sc,m){const cur=imgPlace(sc);if(JSON.stringify(cur)===JSON.stringify(m))return false;
  Object.values(IMG.cut).filter(r=>r.scene===sc.id).forEach(r=>{delete IMG.cut[r.id];idb.del(r.id)});
  for(const [n,uid,sig] of m){const r=IMG_POOL.get(uid);if(!r)continue;const o={...r,id:cutId(sc.id,n),idx:n,sig};IMG.cut[o.id]=o;idb.put(o)}
  return true}
// 씬 목록 자체(추가·삭제·순서)도 되돌릴 수 있게 씬 id·나머지 속성(r)도 기록
const edState=()=>JSON.stringify(SCENES.map(sc=>{const {cuts,pageEdits,endTo,...r}=sc;return {c:sc.cuts,e:sc.pageEdits||[],m:imgPlace(sc),t:sc.endTo||'',id:sc.id,r}}));
function edButtons(){$('#wundo').disabled=$('#gundo-b').disabled=!UNDO.length;$('#wredo').disabled=$('#gredo-b').disabled=!REDO.length}
function edRestore(json){edRestoring=true;const arr=JSON.parse(json);let text=false;
  // 씬 목록이 달라졌으면(지운 씬 되살리기 등) 목록부터 맞춤
  if(arr.every(v=>v&&v.id)&&(arr.length!==SCENES.length||arr.some((v,i)=>SCENES[i]?.id!==v.id))){const byId=new Map(SCENES.map(sc=>[sc.id,sc]));const cur=SCENES[SCUR]?.id;
    SCENES.splice(0,SCENES.length,...arr.map(v=>byId.get(v.id)||{...v.r,cuts:v.c.slice(),pageEdits:v.e}));const k=SCENES.findIndex(sc=>sc.id===cur);SCUR=k>=0?k:Math.min(SCUR,SCENES.length-1);CUTS=SCENES[SCUR].cuts;text=true;
    if(typeof renderSceneList==='function')renderSceneList()}
  SCENES.forEach((sc,i)=>{const v=arr[i];if(!v){sc.pageEdits=[];return}if(Array.isArray(v)){sc.pageEdits=v;return}
  if(JSON.stringify(sc.cuts)!==JSON.stringify(v.c)){sc.cuts.splice(0,sc.cuts.length,...v.c);text=true}sc.pageEdits=v.e||[];if(v.m)imgRestore(sc,v.m);if('t' in v){if(v.t)sc.endTo=v.t;else delete sc.endTo}});saveScenes();edRestoring=false;edSnap=json;if(text&&typeof compute==='function')compute(false);renderWebtoon();edButtons()}
// 원고(쓰기)·콘티·편집 화면 모두 같은 기록을 씀. 쓰기 화면은 타자 묶음을 길게(1.5초)
const UNDO_VIEWS=['webtoon','layout','write'];
function edRecord(){if(typeof VIEW==='undefined'||!UNDO_VIEWS.includes(VIEW)||edRestoring)return;const cur=edState();
  if(edSnap!==null&&cur!==edSnap){const now=Date.now();if(now-edLast>(VIEW==='write'?1500:600)||!UNDO.length)UNDO.push(edSnap);if(UNDO.length>100)UNDO.shift();REDO.length=0;edLast=now;edSavedAt=now;edSaveLabel()}
  edSnap=cur;edButtons()}
{const _ss=saveScenes;saveScenes=function(...a){edRecord();return _ss(...a)}}
// 되돌린 뒤 지금 화면 다시 그리기
function edRefresh(){if(VIEW==='write'){renderCuts();compute(false)}else if(VIEW==='layout'){compute(false);rerenderCuts()}}
function edSaveLabel(){const el=$('#edsave');if(!el)return;if(SAVE_FAIL){saveFailLabel();return}if(!edSavedAt){el.textContent='자동 저장';el.classList.remove('on');return}
  const s=Math.round((Date.now()-edSavedAt)/1000);el.textContent=s<5?'저장됨 · 방금':s<60?`저장됨 · ${s}초 전`:`저장됨 · ${Math.round(s/60)}분 전`;el.classList.add('on')}
setInterval(edSaveLabel,5000);
function edUndo(){if(!UNDO.length)return;REDO.push(edState());edRestore(UNDO.pop());edRefresh();edButtons()}
function edRedo(){if(!REDO.length)return;UNDO.push(edState());edRestore(REDO.pop());edRefresh();edButtons()}
$('#wundo').addEventListener('click',edUndo);$('#wredo').addEventListener('click',edRedo);
$('#gundo-b').addEventListener('click',edUndo);$('#gredo-b').addEventListener('click',edRedo);
document.addEventListener('keydown',e=>{if(typeof VIEW==='undefined'||!UNDO_VIEWS.includes(VIEW))return;const typing=e.target.closest('input,textarea,select,[contenteditable]');
  // 글 칸 안에서는 브라우저 자체 실행 취소(타자 단위)를 그대로 씀
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='z'&&!typing){e.preventDefault();e.shiftKey?edRedo():edUndo();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'&&!typing){e.preventDefault();edRedo();return}
  if(VIEW!=='webtoon')return;
  if(e.key==='Escape'&&materialMode){armMaterialLine('');return}
  if(e.key==='Escape'&&!typing&&selectedLetter){selectLetter(null);document.activeElement?.blur?.()}});
// Esc = 고른 것 모두 풀기(식자·여러 식자·컷·여러 컷·씬·그림 편집·프레임 모양). 메뉴·창이 열려 있으면 그걸 먼저 닫고,
// 글칸에 커서가 있으면 먼저 글칸에서 나오고(한 번 더 누르면 풀림), 넣기 도구를 들고 있으면 먼저 선택 도구로
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||typeof VIEW==='undefined'||VIEW!=='webtoon')return;
  const t=e.target,typing=t&&t.closest&&t.closest('input,textarea,select,[contenteditable]'),cm=document.querySelector('.cmenu');
  const busy=typing||(cm&&!cm.hidden)||document.querySelector('dialog[open]')||(document.querySelector('.readmode')&&!document.querySelector('.readmode').hidden)||gapDrag||document.querySelector('.tcpop')||(window.RoughWS&&RoughWS.tool!=='select');
  if(busy)return;setTimeout(()=>clearAllSelection(),0)},true);
