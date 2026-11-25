// 편집 작업 공간: 도구 막대 · 상황 막대 · 패널(접기·옮기기·떼어 띄우기) · 작업 공간 프리셋
// 기록 · 내비게이터 · 글자 · 정렬 · 소재 패널, 말풍선·나레이션·효과음·칸 나누기 도구, 사용자 단축키, 씬 아트보드 보기
// 포토샵(도구 막대·옵션 막대·패널), 일러스트레이터(컨트롤 막대·정렬·대지), 클립스튜디오(보조 도구·소재 팔레트·작업 공간) 참고
(function(){
const V=$('#v-webtoon'),grid=V.querySelector('.edgrid'),leftDock=V.querySelector('.edleft'),rightDock=$('#wtools'),reader=pageReader;
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}};
const SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const inEdit=()=>VIEW==='webtoon';
const typing=t=>t&&t.closest&&t.closest('input,textarea,select,[contenteditable]');
const groups=()=>[...reader.querySelectorAll('[data-slot-index]')];
const groupBy=key=>groups().find(g=>pageKey(g)===key);
const selGroup=()=>pageSelection?groupBy(pageSelection):null;
function withKey(key,fn){const prev=pageSelection;pageSelection=key;try{return fn()}finally{pageSelection=prev}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const flash=t=>{$('#wst').textContent=t};
const ico=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
document.body.classList.add('ws-panels');

// ---------- 도구 ----------
const TOOLS=[
  {id:'select',name:'선택',key:'V',icon:'<path d="M5 3l14 8-6 2-2 6z"/>',hint:'컷·식자를 눌러 고르고 끌어 옮겨요 · Shift+클릭으로 식자 여러 개'},
  {id:'hand',name:'손',key:'H',icon:'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.9-2.6L3.3 14a1.6 1.6 0 0 1 2.5-2L8 14"/>',hint:'끌어서 캔버스를 옮겨요 · Space를 누른 채 끌어도 돼요'},
  {id:'zoom',name:'돋보기',key:'Z',icon:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8M10.5 7.5v6M7.5 10.5h6"/>',hint:'누른 곳을 확대 · Alt+클릭은 축소'},
  0,
  {id:'crop',name:'그림 편집',key:'C',icon:'<path d="M6.5 2.5v15h15M2.5 6.5h15v15"/>',hint:'컷을 누르면 그림 확대·이동 모드 · Ctrl+휠 확대, 끌어 이동'},
  0,
  // 말풍선은 오른쪽 에셋 패널에서만 넣음(접근 경로 하나)
  {id:'caption',name:'나레이션',key:'T',icon:'<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7 10.5h10M7 14h6"/>',hint:'컷 안을 누른 자리에 나레이션 상자(한 컷에 여러 개)'},
  {id:'sfx',name:'효과음',key:'S',icon:'<path d="M12 2.5l1.9 5.6 5.6-1.9-3.6 4.6 4.9 2.8-5.8.9.8 5.9-3.8-4.4-3.8 4.4.8-5.9-5.8-.9 4.9-2.8L4.5 6.2l5.6 1.9z"/>',hint:'컷 안을 누른 자리에 효과음 · 문구는 막대에서 바꿔요'},
  0,
  {id:'focus',name:'집중선',key:'L',icon:'<circle cx="12" cy="12" r="2.2"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M5.3 5.3l3.5 3.5M15.2 15.2l3.5 3.5M18.7 5.3l-3.5 3.5M8.8 15.2l-3.5 3.5"/>',hint:'컷 안에서 강조할 지점을 누르세요'},
  {id:'speed',name:'속도선',key:'J',icon:'<path d="M3 7h11M7 12h14M3 17h11"/>',hint:'컷 안에서 움직임 방향으로 끌어 주세요'},
];
// 아이콘: 직접 그린 면 아이콘(24 격자, 배경 투명)
const SOLID={"select": "<path d=\"M5 2.5v17.2l4.6-4.4 2.9 6.6 3-1.3-2.9-6.5H19z\"/>", "hand": "<path d=\"M9.2 3.3a1.5 1.5 0 0 1 2.8.7V10h.7V2.9a1.5 1.5 0 0 1 3 0V10h.7V4.6a1.5 1.5 0 0 1 3 0v9.1c0 4.4-3 7.8-7.3 7.8h-1c-2.2 0-4.1-1-5.4-2.8l-2.9-4.5a1.6 1.6 0 0 1 2.6-1.9L8 14.9V4.6a1.5 1.5 0 0 1 1.2-1.3z\"/>", "zoom": "<path fill-rule=\"evenodd\" d=\"M10.5 3a7.5 7.5 0 0 1 6 12l4.8 4.8-2 2-4.8-4.8A7.5 7.5 0 1 1 10.5 3zm0 2.6a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8z\"/>", "split": "<path d=\"M3.5 3.5h17v4.8l-17 4.5zM3.5 15.3l17-4.5v9.7h-17z\"/>", "crop": "<path d=\"M5.5 2h2.6v13.9H22v2.6h-3.9V22h-2.6v-3.5h-10zM2 5.5h3.5v2.6H2zM10 5.5h8.1v8h-2.6V8.1H10z\"/>", "balloon": "<path d=\"M12 3c5.2 0 9.4 3.3 9.4 7.5S17.2 18 12 18c-.9 0-1.8-.1-2.6-.3L3.8 21l1.7-4.5a7 7 0 0 1-2.9-6C2.6 6.3 6.8 3 12 3z\"/>", "caption": "<path fill-rule=\"evenodd\" d=\"M2.5 5h19v14h-19zM6 9v1.9h12V9zm0 4.1V15h8v-1.9z\"/>", "sfx": "<path d=\"M12 1.8l2.3 5.6 5.8-2.2-2.9 5.4 5 3.1-5.9.9.9 6-4.4-4.1L8.4 21l.9-6-5.9-.9 5-3.1L5.5 5.2l5.8 2.2z\"/>", "focus": "<circle cx=\"12\" cy=\"12\" r=\"2.5\"/><path d=\"M10.9 1h2.2l-.4 6.2h-1.4zM10.9 23h2.2l-.4-6.2h-1.4zM1 10.9v2.2l6.2-.4v-1.4zM23 10.9v2.2l-6.2-.4v-1.4zM4.1 5.7l1.6-1.6 4.1 4.6-1.1 1.1zM19.9 18.3l-1.6 1.6-4.1-4.6 1.1-1.1zM18.3 4.1l1.6 1.6-4.6 4.1-1.1-1.1zM5.7 19.9l-1.6-1.6 4.6-4.1 1.1 1.1z\"/>", "speed": "<path d=\"M2 5.8h12.3l2.2 1.4-2.2 1.4H2zM6 10.6h14l2.2 1.4-2.2 1.4H6zM2 15.4h12.3l2.2 1.4-2.2 1.4H2z\"/>"};
TOOLS.filter(Boolean).forEach(t=>t.icon=SOLID[t.id]||t.icon);
const TOOL=Object.fromEntries(TOOLS.filter(Boolean).map(t=>[t.id,t]));
const RESERVED=new Set(['P','?','[',']',' ','ESCAPE']);
let KEYS={...Object.fromEntries(TOOLS.filter(Boolean).map(t=>[t.id,t.key])),...LS('rough-tool-keys',{})};
let tool='select';
const opt={balloon:LS('rough-tool-balloon','auto'),sfx:LS('rough-tool-sfx','쾅')};
const BSTYLES=[['auto','자동 · 기존 식자'],...BALLOON_STYLES.map(s=>[s[0],s[1]])];

const rail=document.createElement('nav');rail.className='toolrail';rail.setAttribute('aria-label','도구');
function renderRail(){rail.innerHTML=TOOLS.map(t=>t?`<button class="tr-btn" data-tool="${t.id}" aria-pressed="${t.id===tool}" title="${t.name} (${KEYS[t.id]})" aria-label="${t.name} 도구, 단축키 ${KEYS[t.id]}">${ico(t.icon)}${t.sub?'<i class="tr-more"></i>':''}</button>`:'<span class="tr-sep"></span>').join('')+
  `<span class="tr-grow"></span><button class="tr-btn" data-rail="keys" title="도구 단축키 바꾸기" aria-label="도구 단축키 바꾸기">${ico('<path fill-rule="evenodd" d="M2 6h20v12H2zm3 3v2.2h2.2V9zm4 0v2.2h2.2V9zm4 0v2.2h2.2V9zm4 0v2.2h2.2V9zM7 13.6v2h10v-2z"/>')}</button>`}
renderRail();grid.prepend(rail);
// ? 단축키 창에 도구 단축키도 보이게
function syncHelp(){const d=[...document.querySelectorAll('.keysdlg')].find(x=>x.getAttribute('aria-labelledby')!=='wskt');if(!d)return;d.querySelector('.ws-toolkeys')?.remove();
  d.querySelector('form')?.insertAdjacentHTML('beforebegin',`<div class="ws-toolkeys"><h4>편집 · 도구</h4><dl>${TOOLS.filter(Boolean).map(t=>`<dt><kbd>${esc(KEYS[t.id])}</kbd></dt><dd>${t.name}</dd>`).join('')}<dt><kbd>Esc</kbd></dt><dd>선택 도구로</dd></dl></div>`)}

function setTool(id){if(!TOOL[id])id='select';tool=id;reader.dataset.tool=id;rail.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===id));
  if(id==='focus'||id==='speed')armMaterialLine(id);else if(materialMode)armMaterialLine('');
  if(id!=='crop'&&cropKey&&id!=='select')RoughStudio.setCrop(null);
  hideFly();renderCtx()}
// 말풍선 형태 고르기(길게 누르기·오른쪽 클릭·작은 삼각형)
const fly=document.createElement('div');fly.className='tr-fly';fly.hidden=true;fly.setAttribute('role','menu');document.body.appendChild(fly);
function showFly(btn){const r=btn.getBoundingClientRect();
  fly.innerHTML=`<b>말풍선 형태</b>`+BSTYLES.map(([k,n])=>`<button role="menuitemradio" aria-checked="${k===opt.balloon}" data-bstyle="${k}">${k==='auto'?'<span class="sw"></span>':swatch(k)}${esc(n)}</button>`).join('');
  fly.style.left=r.right+6+'px';fly.style.top=Math.min(r.top,innerHeight-420)+'px';fly.hidden=false;fly.querySelector('[aria-checked=true]')?.focus()}
function hideFly(){fly.hidden=true}
function swatch(k){const p=BALLOON_STYLES.find(s=>s[0]===k);if(!p)return'<span class="sw"></span>';try{return `<svg class="sw" viewBox="-29 -29 58 58">${presetBalloon(p,0,0,17,17,.85,rngL(p[0]),false).body}</svg>`}catch(_){return'<span class="sw"></span>'}}
fly.addEventListener('click',e=>{const b=e.target.closest('[data-bstyle]');if(!b)return;opt.balloon=b.dataset.bstyle;SS('rough-tool-balloon',opt.balloon);setTool('balloon')});
let press=0;
rail.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-tool="balloon"]');if(!b)return;press=setTimeout(()=>{press=-1;showFly(b)},420)});
rail.addEventListener('pointerup',()=>{if(press>0)clearTimeout(press)});
rail.addEventListener('contextmenu',e=>{const b=e.target.closest('[data-tool="balloon"]');if(b){e.preventDefault();showFly(b)}});
rail.addEventListener('click',e=>{if(press===-1){press=0;return}const b=e.target.closest('[data-tool]');if(b){if(e.target.closest('.tr-more')){showFly(b);return}setTool(b.dataset.tool);return}
  if(e.target.closest('[data-rail="keys"]'))openKeys()});
document.addEventListener('pointerdown',e=>{if(!fly.hidden&&!fly.contains(e.target)&&!e.target.closest('[data-tool="balloon"]'))hideFly()});

// ---------- 캔버스에서 도구 쓰기 ----------
reader.addEventListener('pointerdown',e=>{
  if(!inEdit()||!pageEditing||e.button!==0)return;
  const letter=e.target.closest('[data-letter]'),group=e.target.closest('[data-slot-index]');
  // 넣기 도구(말풍선·나레이션·효과음)를 든 채 이미 있는 식자를 누르면 하나 더 넣지 않고 그 식자를 골라 고치기
  if(letter&&(tool==='balloon'||tool==='caption'||tool==='sfx')&&!e.altKey)setTool('select');
  if(tool==='select'){
    // Shift+클릭=고르기에 더하기(놓을 때 판단), Shift+끌기=가로·세로 고정 → 여기서는 기억만
    window._shiftPick=e.shiftKey&&letter?{L:letter,prev:selectedLetter}:null;if(e.shiftKey)e.preventDefault();  // 브라우저 글자 선택 막기
    if(!e.shiftKey&&MULTI.size&&!(letter&&MULTI.has(lkey(letter))))clearMulti();
    if(letter&&group&&isLocked(group,letter.dataset.letter)){e.preventDefault();e.stopPropagation();selectPageCut(group);selectLetter(letter);flash('잠긴 식자예요 · 레이어 패널의 자물쇠로 풀 수 있어요');return}
    const fh=e.target.closest('[data-fh]');
    if(fh){const hs=fh.closest('[data-fh-for]');const g=hs&&hs.ownerSVGElement.querySelector(`[data-slot-index="${hs.dataset.fhFor}"]`);if(g&&isLocked(g,'cut')){e.preventDefault();e.stopPropagation();flash('잠긴 컷이에요 · 레이어 패널의 자물쇠로 풀 수 있어요');return}}
    if(group&&!letter&&isLocked(group,'cut')){e.preventDefault();e.stopPropagation();selectPageCut(group);selectLetter(null);return}
    return}
  if(tool==='hand')return;
  if(tool==='focus'||tool==='speed'){if(!materialMode)armMaterialLine(tool);return}
  e.preventDefault();e.stopPropagation();
  if(tool==='zoom'){RoughStudio.zoomTo(RoughStudio.zoom*(e.altKey?1/1.5:1.5),e.clientX,e.clientY);return}
  if(!group){flash('컷 안을 눌러 주세요');return}
  if(tool==='crop'){selectPageCut(group);RoughStudio.setCrop(group);return}
  if(tool==='split'){splitCut(group);return}
  if(isLocked(group,'cut')){flash('잠긴 컷이에요');return}
  const pt=pagePoint(group.ownerSVGElement,e);
  addLetter(tool,group,{x:pt.x,y:pt.y});
},true);
reader.addEventListener('keydown',e=>{if(selectedLetter&&/^Arrow/.test(e.key)){const g=selectedLetter.closest('[data-slot-index]');if(g&&isLocked(g,selectedLetter.dataset.letter)){e.preventDefault();e.stopPropagation();flash('잠긴 식자예요')}}},true);

function refreshText(si){saveScenes();if(si===SCUR&&typeof compute==='function')compute(false);else renderWebtoon()}
// 문구 칸으로 커서: 화면이 튀지 않게 preventScroll(편집 카드가 있으면 카드로)
function focusText(){if(window.RoughCard?.focus?.())return;openPanel('props');setTimeout(()=>{letterMemo.focus({preventScroll:true});letterMemo.select()},30)}
window.focusLetterText=focusText;
// 말풍선·나레이션·효과음을 컷 글에 더하고, 누른 자리로 옮김
function addLetter(kind,group,pt,o={}){
  const key=pageKey(group),[si,slot]=key.split(':').map(Number),cuts=SCENES[si].cuts;
  const count=pre=>group.querySelectorAll(`[data-letter^="${pre}"]`).length;
  let lk,line;
  if(kind==='balloon'){lk='dialog-'+count('dialog-');line=`"${o.text||'대사를 입력하세요'}"`}
  else if(kind==='caption'){const c=count('caption');lk=c?'caption-'+c:'caption';line=`[${o.text||'나레이션'}]`}
  else{const w=String(o.text||opt.sfx||'쾅').replace(/[-\s]/g,'').slice(0,10)||'쾅';lk='effect-'+count('effect-');line=`-${w}-`}
  cuts[slot]=String(cuts[slot]||'').replace(/\s+$/,'')+'\n'+line;
  const style=kind==='balloon'?(o.style||opt.balloon):null;
  if(style&&style!=='auto')withKey(key,()=>{const s=pageSettings(true);(s.letters||={})[lk]={...(s.letters[lk]||{}),style}});
  refreshText(si);
  const g=groupBy(key),L=g&&g.querySelector(`[data-letter="${lk}"]`);
  if(!L){flash('넣었어요 · 위치를 찾지 못해 기본 자리에 두었어요');return}
  selectPageCut(g);
  const svg=g.ownerSVGElement,r=L.getBoundingClientRect(),c=new DOMPoint(r.left+r.width/2,r.top+r.height/2).matrixTransform(svg.getScreenCTM().inverse());
  // 누르기로 넣었으면(pt.auto) 실제 크기로 빈자리를 찾음
  if(pt?.auto){const m=svg.getScreenCTM().inverse(),r0=(L.querySelector('[data-balloon]')||L).getBoundingClientRect(),a=new DOMPoint(r0.left,r0.top).matrixTransform(m),b=new DOMPoint(r0.right,r0.bottom).matrixTransform(m);pt=freeSpot(g,{w:b.x-a.x,h:b.y-a.y},L)}
  const cur=letterPosition(L),pos={x:Math.round(cur.x+pt.x-c.x),y:Math.round(cur.y+pt.y-c.y)};
  moveLetter(L,pos);saveLetter(L,pos);selectLetter(L);
  // 화면 밖이면 캔버스만 부드럽게 그 자리로(오른쪽 패널·카드는 그대로)
  {const L2=groupBy(key)?.querySelector(`[data-letter="${lk}"]`),r=L2?.getBoundingClientRect();if(r&&(r.top<200||r.bottom>innerHeight-20))scrollBy({top:r.top+r.height/2-(200+(innerHeight-200)/2),behavior:'smooth'})}
  // 넣은 뒤 화면 맨 위 서랍을 열지 않음(페이지가 위로 튀고 캔버스를 가렸음) → 편집 카드가 있으면 그 문구 칸으로
  window.RoughCard?.focus?.({select:true});
  flash(`${kind==='balloon'?'말풍선':kind==='caption'?'나레이션':'효과음'}을 넣었어요 · 오른쪽 카드에서 문구를 바로 고쳐요`);
}
// 칸 나누기: 컷 바로 아래에 새 칸(글)을 끼우고, 이후 컷의 편집값·등록 이미지를 한 칸씩 민다
function splitCut(group){
  const key=pageKey(group),[si,slot]=key.split(':').map(Number),sc=SCENES[si],cuts=sc.cuts;
  const lines=String(cuts[slot]||'').split('\n').map(l=>l.trim()).filter(Boolean);
  const act=lines.find(l=>!/^(@\S+\s*)?["“]/.test(l)&&!/^\[.*\]$/.test(l))||'';
  const base=act.replace(/-[^-\s][^-]{0,10}-/g,'').replace(/^\(이어서\)\s*/,'').trim();
  // 등록 이미지는 패널 번호로 저장돼 있어 remapCuts가 뒤 컷 이미지를 새 번호로 옮김
  const len=cuts.length;
  remapCuts(si,()=>{cuts.splice(slot+1,0,'(이어서) '+(base||'이어지는 장면'));
    if(sc.pageEdits.length>slot+1)sc.pageEdits.splice(slot+1,0,null);
    const e=sc.pageEdits[slot];
    if(e?.frame){const h=Math.max(80,Math.round(e.frame.h/2));e.frame={...e.frame,h};sc.pageEdits[slot+1]={frame:{...e.frame}}}
    return moveMap(len,x=>x>slot?x+1:x)});
  refreshText(si);
  const g=groupBy(`${si}:${slot+1}`);if(g){selectPageCut(g);g.scrollIntoView({block:'center',behavior:'smooth'})}
  flash('칸을 나눴어요 · 새 칸 글은 씬 화면에서 고칠 수 있어요(Ctrl+Z로 되돌리기)');
}

// ---------- 잠금 ----------
function isLocked(group,what){const s=withKey(pageKey(group),()=>pageSettings());return what==='cut'?!!s?.lock?.cut:!!s?.lock?.letters?.[what]}
function toggleLock(key,what){withKey(key,()=>{const s=pageSettings(true);s.lock||={};if(what==='cut')s.lock.cut=!s.lock.cut;else{s.lock.letters||={};s.lock.letters[what]=!s.lock.letters[what]}});saveScenes();markLocks();editTree();renderCtx()}
function markLocks(){groups().forEach(g=>{g.classList.toggle('locked',isLocked(g,'cut'));g.querySelectorAll('[data-letter]').forEach(L=>L.classList.toggle('locked',isLocked(g,L.dataset.letter)))})}

// ---------- 여러 식자 선택 ----------
const MULTI=new Set();const lkey=L=>pageKey(L.closest('[data-slot-index]'))+'|'+L.dataset.letter;
const resolve=k=>{const [key,lk]=k.split('|');return groupBy(key)?.querySelector(`[data-letter="${CSS.escape(lk)}"]`)||null};
function toggleMulti(L){if(selectedLetter&&!MULTI.size&&selectedLetter!==L)MULTI.add(lkey(selectedLetter));const k=lkey(L);MULTI.has(k)?MULTI.delete(k):MULTI.add(k);markMulti();renderCtx();renderAlign()}
function clearMulti(){MULTI.clear();markMulti();renderCtx();renderAlign()}
function markMulti(){reader.querySelectorAll('.multi-sel').forEach(x=>x.classList.remove('multi-sel'));[...MULTI].map(resolve).forEach(L=>L&&L.classList.add('multi-sel'));window.syncTree?.()}
function alignLetters(mode){const items=[...MULTI].map(resolve).filter(Boolean);if(items.length<2)return;
  const svg=items[0].ownerSVGElement,list=items.filter(L=>L.ownerSVGElement===svg);if(list.length<items.length)flash('같은 씬 안의 식자끼리만 정렬해요');
  const sc=svg.viewBox.baseVal.width/svg.getBoundingClientRect().width,R=list.map(L=>L.getBoundingClientRect());
  const minX=Math.min(...R.map(r=>r.left)),maxX=Math.max(...R.map(r=>r.right)),minY=Math.min(...R.map(r=>r.top)),maxY=Math.max(...R.map(r=>r.bottom));
  const order=(axis)=>list.map((L,i)=>[L,R[i]]).sort((a,b)=>axis==='x'?(a[1].left+a[1].right)-(b[1].left+b[1].right):(a[1].top+a[1].bottom)-(b[1].top+b[1].bottom));
  const moves=new Map();
  list.forEach((L,i)=>{const r=R[i];let dx=0,dy=0;
    if(mode==='left')dx=minX-r.left;if(mode==='right')dx=maxX-r.right;if(mode==='hcenter')dx=(minX+maxX)/2-(r.left+r.right)/2;
    if(mode==='top')dy=minY-r.top;if(mode==='bottom')dy=maxY-r.bottom;if(mode==='vcenter')dy=(minY+maxY)/2-(r.top+r.bottom)/2;moves.set(L,[dx,dy])});
  if(mode==='vdist'||mode==='hdist'){const ax=mode==='hdist'?'x':'y',o=order(ax);if(o.length<3){flash('간격 고르게는 3개 이상 고를 때 써요');return}
    const c=([,r])=>ax==='x'?(r.left+r.right)/2:(r.top+r.bottom)/2,a=c(o[0]),b=c(o[o.length-1]),step=(b-a)/(o.length-1);
    o.forEach(([L,r],i)=>moves.set(L,ax==='x'?[a+step*i-c([L,r]),0]:[0,a+step*i-c([L,r])]))}
  let locked=0;
  moves.forEach(([dx,dy],L)=>{const g=L.closest('[data-slot-index]');if(isLocked(g,L.dataset.letter)){locked++;return}
    withKey(pageKey(g),()=>{const p=letterPosition(L),np={x:Math.round(p.x+dx*sc),y:Math.round(p.y+dy*sc)};moveLetter(L,np);saveLetter(L,np)})});
  flash(`식자 ${moves.size-locked}개를 정렬했어요${locked?` · 잠긴 ${locked}개는 그대로`:''}`)}

// ---------- 패널 ----------
const mk=(cls,html='')=>{const d=document.createElement('div');d.className=cls;d.innerHTML=html;return d};
leftDock.querySelector('.ltabs')?.remove();
const propsBody=mk('ws-props');[...rightDock.children].filter(x=>!x.classList.contains('sheet-h')).forEach(x=>propsBody.appendChild(x));
const navBody=mk('ws-nav',`<div class="nav-row"><input type="range" id="wsnavz" min="10" max="400" step="1" value="100" aria-label="캔버스 배율"><output id="wsnavzv">100%</output></div>
  <div class="nav-btns"><button class="btn sm" data-nav="all" title="Shift+1">전체</button><button class="btn sm" data-nav="100" title="Shift+0">100%</button><button class="btn sm" data-nav="sel" title="Shift+2">선택한 컷</button></div><div class="nav-map"></div><p class="nav-note" hidden>나란히 보기에서는 미니맵 대신 가로 스크롤로 이동해요.</p>`);
const histBody=mk('ws-hist','<ol class="hist" id="wshist"></ol><p class="hist-note">항목을 누르면 그때 상태로 돌아가요. 컷 추가·말풍선 추가도 되돌릴 수 있어요.</p>');
const textBody=mk('ws-text');const alignBody=mk('ws-align');const libBody=mk('ws-lib');const assetBody=mk('ws-assets');
$('#wtoc').hidden=false;$('#wrefs').hidden=false;
const PANELS={
  layers:{title:'레이어',el:$('#wtoc')},refs:{title:'레퍼런스',el:$('#wrefs')},props:{title:'속성',el:propsBody},
  nav:{title:'내비게이터',el:navBody},history:{title:'기록',el:histBody},library:{title:'소재',el:libBody},text:{title:'글자',el:textBody},align:{title:'정렬',el:alignBody},
  assets:{title:'에셋',el:assetBody}};
// 오른쪽은 에셋 전용(docs/edit-asset-panel-plan.md). 나머지 패널은 독(X)에서 빼서 속성 서랍·떠 있는 미니맵·에셋 탭으로 옮김
const OFFDOCK=['refs','props','nav','history','library','text','align'];
// 작업 공간 프리셋 = 에셋 패널의 처음 탭
const PRESETS={
  edit:{name:'편집',L:[['layers',0]],R:[['assets',0]],tab:'rec'},
  letter:{name:'식자',L:[['layers',0]],R:[['assets',0]],tab:'balloon'},
  ref:{name:'연출 참고',L:[['layers',0]],R:[['assets',0]],tab:'ref'}};
const fromPreset=id=>{const P=PRESETS[id],panels={};['L','R'].forEach(d=>P[d].forEach(([p,c],i)=>panels[p]={dock:d,order:i,collapsed:!!c}));OFFDOCK.forEach((p,i)=>panels[p]={dock:'X',order:i,collapsed:false});return {preset:id,panels}};
let LAYOUT=LS('rough-ws-layout',null);if(!LAYOUT||!LAYOUT.panels||Object.keys(PANELS).some(k=>!LAYOUT.panels[k])||OFFDOCK.some(k=>LAYOUT.panels[k].dock!=='X'))LAYOUT=fromPreset(PRESETS[LAYOUT?.preset]?LAYOUT.preset:'edit');
const saveLayout=()=>SS('rough-ws-layout',LAYOUT);
for(const [id,P] of Object.entries(PANELS)){const s=document.createElement('section');s.className='wpanel';s.dataset.panel=id;
  s.innerHTML=`<header class="wp-h"><button class="wp-col" aria-expanded="true" aria-label="${P.title} 접기·펼치기">${ico('<path d="M5.5 8.5h13L12 16z"/>')}</button><b>${P.title}</b><span class="wp-acts"><button data-wp="move" title="반대쪽으로 옮기기" aria-label="${P.title} 패널 반대쪽으로">${ico('<path d="M15 2.5l6 5-6 5V9.2H4V5.8h11zM9 11.5v3.3h11v3.4H9v3.3l-6-5z"/>')}</button><button data-wp="float" title="떼어 띄우기 / 다시 붙이기" aria-label="${P.title} 패널 떼어 띄우기">${ico('<path fill-rule="evenodd" d="M8 8h13v13H8zm2.3 2.3v8.4h8.4v-8.4zM3 3h13v3.6h-2.3V5.3H5.3v8.4h1.3V16H3z"/>')}</button></span></header><div class="wp-body"></div>`;
  s.querySelector('.wp-body').appendChild(P.el);P.sec=s}
function renderDocks(){
  for(const d of ['L','R']){const dock=d==='L'?leftDock:rightDock;
    Object.entries(LAYOUT.panels).filter(([,v])=>v.dock===d&&!v.float).sort((a,b)=>a[1].order-b[1].order).forEach(([id])=>dock.appendChild(PANELS[id].sec))}
  for(const [id,v] of Object.entries(LAYOUT.panels)){if(v.dock==='X')continue;const s=PANELS[id].sec;s.classList.toggle('collapsed',!!v.collapsed);s.querySelector('.wp-col').setAttribute('aria-expanded',!v.collapsed);
    s.classList.toggle('floating',!!v.float);s.querySelector('.wp-h').draggable=!v.float;
    if(v.float){document.body.appendChild(s);s.style.left=clamp(v.float.x,0,innerWidth-120)+'px';s.style.top=clamp(v.float.y,60,Math.max(60,innerHeight-160))+'px';s.hidden=!inEdit()}else{s.style.left=s.style.top='';s.hidden=false}}
  $('#wsws')&&($('#wsws').value=LAYOUT.preset||'custom')}
function openPanel(id){const v=LAYOUT.panels[id];if(!v)return;if(v.dock==='X'){openOff(id);return}if(v.collapsed){v.collapsed=false;saveLayout();renderDocks();onOpen(id)}PANELS[id].sec.scrollIntoView({block:'nearest'})}
function custom(){LAYOUT.preset='custom';saveLayout()}
function orderFromDom(){for(const d of ['L','R']){const dock=d==='L'?leftDock:rightDock;[...dock.querySelectorAll(':scope > .wpanel')].forEach((s,i)=>{const v=LAYOUT.panels[s.dataset.panel];v.dock=d;v.order=i})}}
document.addEventListener('click',e=>{const s=e.target.closest('.wpanel');if(!s)return;const id=s.dataset.panel,v=LAYOUT.panels[id];
  if(e.target.closest('.wp-col')){v.collapsed=!v.collapsed;custom();renderDocks();if(!v.collapsed)onOpen(id);return}
  const a=e.target.closest('[data-wp]')?.dataset.wp;
  if(a==='move'){if(v.float)v.float=null;v.dock=v.dock==='L'?'R':'L';v.order=99;custom();renderDocks();orderFromDom();saveLayout();return}
  if(a==='float'){if(v.float)v.float=null;else{const r=s.getBoundingClientRect();v.float={x:Math.min(r.left+24,innerWidth-320),y:clamp(r.top,200,Math.max(200,innerHeight-420))};v.collapsed=false}custom();renderDocks();orderFromDom();saveLayout();onOpen(id)}});
// 패널 머리를 끌어 순서·쪽 바꾸기 / 떠 있는 패널은 끌어 옮기기
let dragId=null;
document.addEventListener('dragstart',e=>{const h=e.target.closest?.('.wp-h');if(!h)return;dragId=h.closest('.wpanel').dataset.panel;e.dataTransfer.setData('application/x-rough-panel',dragId);e.dataTransfer.effectAllowed='move'});
for(const dock of [leftDock,rightDock]){
  dock.addEventListener('dragover',e=>{if(!e.dataTransfer.types.includes('application/x-rough-panel'))return;e.preventDefault();const t=e.target.closest('.wpanel');document.querySelectorAll('.drop-before').forEach(x=>x.classList.remove('drop-before'));if(t&&t.dataset.panel!==dragId)t.classList.add('drop-before')});
  dock.addEventListener('drop',e=>{if(!dragId)return;e.preventDefault();const t=e.target.closest('.wpanel'),s=PANELS[dragId].sec;document.querySelectorAll('.drop-before').forEach(x=>x.classList.remove('drop-before'));
    if(t&&t!==s)dock.insertBefore(s,t);else if(!t)dock.appendChild(s);LAYOUT.panels[dragId].float=null;orderFromDom();custom();renderDocks();dragId=null})}
document.addEventListener('dragend',()=>{dragId=null;document.querySelectorAll('.drop-before').forEach(x=>x.classList.remove('drop-before'))});
let fdrag=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest('.wpanel.floating .wp-h');if(!h||e.target.closest('button'))return;const s=h.closest('.wpanel'),r=s.getBoundingClientRect();fdrag={s,dx:e.clientX-r.left,dy:e.clientY-r.top};h.setPointerCapture(e.pointerId)});
document.addEventListener('pointermove',e=>{if(!fdrag)return;fdrag.s.style.left=clamp(e.clientX-fdrag.dx,0,innerWidth-120)+'px';fdrag.s.style.top=clamp(e.clientY-fdrag.dy,56,innerHeight-40)+'px'});
document.addEventListener('pointerup',()=>{if(!fdrag)return;const v=LAYOUT.panels[fdrag.s.dataset.panel];v.float={x:parseInt(fdrag.s.style.left),y:parseInt(fdrag.s.style.top)};custom();fdrag=null});
function onOpen(id){if(id==='assets'){renderAssets();return}if(id==='nav')RoughStudio.mini.refresh();if(id==='history')renderHistory();if(id==='refs')RoughRefs.showTab('refs');if(id==='text')renderText();if(id==='align')renderAlign();if(id==='library')renderLib()}

// ---------- 상황 막대 ----------
const ctx=document.createElement('div');ctx.className='ctxbar';ctx.setAttribute('role','toolbar');ctx.setAttribute('aria-label','도구 옵션');$('#wst').after(ctx);
const WS_OPTS=Object.entries(PRESETS).map(([k,p])=>`<option value="${k}">${p.name}</option>`).join('')+'<option value="custom" disabled>내 배치</option>';
// 빈 컷: 그림·테두리를 없애 배경 위에 글만 남김(다시 누르면 원래대로)
function toggleBlank(key){const g=groupBy(key);if(g&&isLocked(g,'cut')){flash('잠긴 컷이에요');return}let on=false;withKey(key,()=>{const st=pageSettings(true);on=!st.blank;if(on)st.blank=true;else delete st.blank});
  saveScenes();renderWebtoon();const ng=groupBy(key);if(ng)selectPageCut(ng);renderCtx();flash(on?'빈 컷으로 바꿨어요 · 그림·테두리 없이 글만 나가요':'그림·테두리를 다시 보여요')}
// 컷 여러 개 한 번에(레이어 패널 Ctrl·Shift+클릭으로 고른 컷)
function multiCut(op){const MCs=window.RoughStudio?.mcuts;if(!MCs||MCs.size<2)return;const ks=[...MCs],free=ks.filter(k=>{const g=groupBy(k);return !(g&&isLocked(g,'cut'))});
  if(op==='clear'){window.RoughStudio.clearMC();return}
  if(op==='lock'){const all=ks.every(k=>{const g=groupBy(k);return g&&isLocked(g,'cut')});ks.forEach(k=>{const g=groupBy(k);if(!!(g&&isLocked(g,'cut'))===all)toggleLock(k,'cut')});renderCtx();return}
  if(op==='gapgo'){const raw=ctx.querySelector('[data-ctx=mcgap]')?.value,v=raw===''?null:Math.max(0,Math.min(1600,Math.round(+raw)));free.forEach(k=>withKey(k,()=>{const st=pageSettings(v!=null);if(!st)return;if(v==null)delete st.gap;else st.gap=v}));saveScenes();renderWebtoon();flash(v==null?`${free.length}컷 간격을 기본으로`:`${free.length}컷 아래 간격을 ${v}px로 맞췄어요 · Ctrl+Z로 되돌리기`);return}
  if(op==='blank'){const on=!free.every(k=>withKey(k,()=>pageSettings()?.blank));free.forEach(k=>withKey(k,()=>{const st=pageSettings(true);if(on)st.blank=true;else delete st.blank}));saveScenes();renderWebtoon();flash(on?`${free.length}컷을 빈 컷으로`:`${free.length}컷 그림·테두리를 다시`);return}
  if(op==='frame'){free.forEach(k=>withKey(k,()=>{const st=pageSettings();if(st){delete st.frame;delete st.quad}}));saveScenes();renderWebtoon();flash(`${free.length}컷 프레임을 처음대로`);return}
  if(op==='del'){if(!free.length){flash('잠긴 컷이라 지울 수 없어요');return}if(!confirm(`고른 컷 ${free.length}개를 지울까요? (Ctrl+Z로 되돌릴 수 있어요)`))return;
    const order=free.map(k=>k.split(':').map(Number)).sort((a,b)=>b[0]-a[0]||b[1]-a[1]);window.RoughStudio.clearMC();let n=0;
    for(const [si,slot] of order){if(SCENES[si].cuts.length<=1)continue;deleteCut(si+':'+slot);n++}flash(`컷 ${n}개를 지웠어요 · Ctrl+Z로 되돌리기`)}}
// 컷 간격 일괄: 고른 컷의 아래 간격을 씬 전체·모든 씬에, 또는 기본(자동)으로
function setGaps(scope,v){const sc=pageSelection?.split(':')[0];let n=0;
  reader.querySelectorAll(':scope>section').forEach(sec=>{if(scope==='scene'&&sec.dataset.pageScene!==sc)return;
    sec.querySelectorAll('[data-slot-index]').forEach(g=>{if(isLocked(g,'cut'))return;const k=pageKey(g);withKey(k,()=>{const st=pageSettings(v!=null);if(!st)return;if(v==null)delete st.gap;else st.gap=v;n++})})});
  saveScenes();renderWebtoon();flash(v==null?`${n}컷 간격을 기본(자동)으로 되돌렸어요`:`${n}컷 아래 간격을 ${v}px로 맞췄어요 · Ctrl+Z로 되돌리기`)}
function gapAllMenu(){const raw=ctx.querySelector('[data-ctx=gap]')?.value,v=raw===''||raw==null?null:Math.max(0,Math.min(1600,Math.round(+raw)));
  const lab=v==null?'기본(자동)':`${v}px`;
  return [{label:`이 씬 모든 컷을 ${lab}로`,run:()=>setGaps('scene',v)},{label:`모든 씬 모든 컷을 ${lab}로`,run:()=>setGaps('all',v)},{sep:1},
    {label:'이 씬 간격 기본(자동)으로',run:()=>setGaps('scene',null)},{label:'모든 씬 간격 기본(자동)으로',run:()=>setGaps('all',null)}]}
// 스타일 한 번에 적용: 고른 식자의 모양·글꼴·꾸밈·색·크기를 다른 식자에(위치·글·늘린 상자는 그대로)
const STYLE_KEYS=['style','font','bold','italic','underline','color','outline','scale'];
function styleTargets(scope){const src=selectedLetter;if(!src)return [];const kind=src.dataset.letter.replace(/-\d+$/,''),sk=lkey(src),who=src.dataset.who||'',sc=src.closest('section').dataset.pageScene;
  const same=L=>L.dataset.letter.replace(/-\d+$/,'')===kind;
  let list=[...reader.querySelectorAll(':scope>section [data-letter]')].filter(L=>lkey(L)!==sk);
  if(scope==='multi')list=list.filter(L=>MULTI.has(lkey(L)));
  else if(scope==='who')list=list.filter(L=>same(L)&&who&&L.dataset.who===who);
  else if(scope==='scene')list=list.filter(L=>same(L)&&L.closest('section').dataset.pageScene===sc);
  else list=list.filter(same);
  return list.filter(L=>!isLocked(L.closest('[data-slot-index]'),L.dataset.letter))}
function applyStyle(scope){const src=selectedLetter;if(!src)return;const sk=lkey(src),[key,id]=sk.split('|');const from=withKey(key,()=>pageSettings()?.letters?.[id])||{};
  const list=styleTargets(scope);if(!list.length){flash('적용할 식자가 없어요');return}
  list.forEach(L=>{const [k2,id2]=lkey(L).split('|');withKey(k2,()=>{const st=pageSettings(true);const o={...st.letters?.[id2]};STYLE_KEYS.forEach(f=>{if(from[f]!==undefined)o[f]=from[f];else delete o[f]});(st.letters||={})[id2]=o})});
  saveScenes();renderWebtoon();const L=resolve(sk);if(L)selectLetter(L);flash(`${list.length}개에 같은 스타일을 적용했어요 · Ctrl+Z로 되돌리기`)}
function styleMenu(){const src=selectedLetter,who=src?.dataset.who,kind=/^dialog/.test(src?.dataset.letter||'')?'말풍선':'나레이션',n=s=>styleTargets(s).length;
  return [MULTI.size>1?{label:`고른 식자 전부 (${n('multi')})`,run:()=>applyStyle('multi')}:null,
    who?{label:`「${who}」 대사 전부 (${n('who')})`,run:()=>applyStyle('who')}:null,
    {label:`이 씬 ${kind} 전부 (${n('scene')})`,run:()=>applyStyle('scene')},{label:`모든 씬 ${kind} 전부 (${n('all')})`,run:()=>applyStyle('all')},
    {sep:1},{label:'모양·글꼴·굵게·기울임·밑줄·색·테두리·크기를 맞춰요 (위치·문구는 그대로)',disabled:true}].filter(Boolean)}
// 글에 맞추기: 고른 말풍선·나레이션(여러 개면 전부)의 늘린 가로·세로(bw·bh)를 없애 글 크기에 맞춤
function fitLetters(){const ks=MULTI.size?[...MULTI]:selectedLetter?[lkey(selectedLetter)]:[];let n=0;
  ks.forEach(k=>{const [key,id]=k.split('|');if(!/^(dialog|caption)/.test(id))return;withKey(key,()=>{const o=pageSettings(true).letters?.[id];if(o&&(o.bw||o.bh)){delete o.bw;delete o.bh;n++}})});
  if(!n){flash('이미 글에 맞춰져 있어요');return}const sel=selectedLetter&&lkey(selectedLetter);saveScenes();renderWebtoon();if(sel){const L=resolve(sel);if(L)selectLetter(L)}markMulti();flash(`${n}개를 글에 맞췄어요 · Ctrl+Z로 되돌리기`)}
// ---------- 처음 쓰는 사람 안내: 처음 한 번씩만 그 자리 옆에 짧게 ----------
const COACH_KEY='rough-coach';let coachSeen={};try{coachSeen=JSON.parse(localStorage.getItem(COACH_KEY)||'{}')}catch(_){}
const coachEl=document.createElement('div');coachEl.className='coach';coachEl.hidden=true;coachEl.setAttribute('role','status');document.body.appendChild(coachEl);
function coachDone(k){coachSeen[k]=1;try{localStorage.setItem(COACH_KEY,JSON.stringify(coachSeen))}catch(_){}}
function coach(k,anchor,html){if(coachSeen[k]||!anchor||!anchor.isConnected)return;const r=anchor.getBoundingClientRect();if(!r.width)return;
  coachEl.innerHTML=`<div>${html}</div><button class="btn sm" data-coach-ok>알겠어요</button>`;coachEl.hidden=false;coachEl.dataset.k=k;
  // 고른 것의 옆(오른쪽 → 왼쪽)에 띄워 손잡이를 가리지 않게. 자리가 없으면 아래·위
  const w=coachEl.offsetWidth,h=coachEl.offsetHeight,side=anchor!==rail&&!anchor.closest?.('.ctxbar');let x,y;
  if(side&&r.right+64+w<innerWidth-12){x=r.right+64;y=Math.min(innerHeight-h-12,Math.max(210,r.top))}
  else if(side&&r.left-64-w>12){x=r.left-64-w;y=Math.min(innerHeight-h-12,Math.max(210,r.top))}
  else{x=Math.min(innerWidth-w-12,Math.max(12,r.left+r.width/2-w/2));y=r.bottom+10;if(y+h>innerHeight-12)y=Math.max(12,r.top-h-10)}
  coachEl.style.left=x+'px';coachEl.style.top=y+'px';coachEl.classList.toggle('up',y<r.top);coachDone(k)}
coachEl.addEventListener('click',e=>{if(e.target.closest('[data-coach-ok]'))coachEl.hidden=true});
document.addEventListener('pointerdown',e=>{if(!coachEl.hidden&&!coachEl.contains(e.target))coachEl.hidden=true},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!coachEl.hidden)coachEl.hidden=true});
addEventListener('scroll',()=>{if(!coachEl.hidden)coachEl.hidden=true},{passive:true});
function coachReset(){coachSeen={};try{localStorage.removeItem(COACH_KEY)}catch(_){}flash('안내를 다시 보여 드릴게요');coachSoon()}
function coachSoon(){setTimeout(()=>{if(!inEdit()||!coachEl.hidden)return;
  if(!coachSeen.start)coach('start',rail,'<b>편집 화면</b> 컷이나 말풍선을 눌러 골라요 · 말풍선은 오른쪽 에셋 · 나레이션·효과음·효과선은 왼쪽 도구 · <kbd>?</kbd> 단축키 모음');
  else if(selectedLetter)coach('letter',selectedLetter,'<b>식자 고르기</b> 더블클릭이나 Enter로 글 고치기 · 모서리로 크기 · 파란 회전 손잡이(↻)로 돌리기 · Shift+클릭으로 여러 개');
  else if(pageSelection&&reader.querySelector('[data-slot-index].sel'))coach('cut',ctx.querySelector('[data-ctx=fshape]')||reader.querySelector('[data-slot-index].sel'),'<b>컷 고르기</b> 모퉁이를 끌면 컷 크기 · 컷을 더블클릭하거나 「프레임 모양」을 누르면 사선 칸 · 그림 확대·이동은 「그림 편집」');
  else coach('start',rail,'<b>편집 화면</b> 컷이나 말풍선을 눌러 골라요 · 말풍선은 오른쪽 에셋 · 나레이션·효과음·효과선은 왼쪽 도구 · <kbd>?</kbd> 단축키 모음')},350)}
{const _sc=selectPageCut;selectPageCut=function(...a){const r=_sc(...a);coachSoon();return r}}
{const _sl=selectLetter;selectLetter=function(...a){const r=_sl(...a);if(selectedLetter)coachSoon();return r}}
const FPRESETS=[['네모',0,0],['위 사선',-8,0],['아래 사선',0,8],['평행 사선',-8,-8],['쐐기',-8,8]];
function shapeTools(g){const a=frameAngles(g);return `<span class="cb-grp" role="group" aria-label="프레임 기울기"><label>위 <input type="number" data-ctx="fatop" min="-30" max="30" step="1" value="${a.top}" style="width:52px">°</label><label>아래 <input type="number" data-ctx="fabot" min="-30" max="30" step="1" value="${a.bot}" style="width:52px">°</label>${FPRESETS.map(([n,t,b])=>`<button class="cb${a.top===t&&a.bot===b?' on':''}" data-fpre="${t},${b}">${n}</button>`).join('')}</span>`}
function renderCtx(){try{_renderCtx()}catch(e){console.warn('상황 막대',e)}}  // 처음 불러올 때 아직 없는 칸이 있어도 편집기 전체가 멈추지 않게
function _renderCtx(){if(!ctx.isConnected)return;const t=TOOL[tool];let mid='';
  const SS_=window.RoughStudio?.selScene;if(SS_!=null&&SCENES[SS_]&&tool==='select'){const sc=SCENES[SS_];
    mid=`<b>${esc(sceneLabel(sc,SS_))}</b><span class="cb-t">${sc.cuts.filter(c=>String(c).trim()).length}컷</span><button class="cb" data-ctx="scdel"${SCENES.length<=1?' disabled title="씬이 하나뿐이에요"':''}>씬 지우기</button><span class="cb-hint">Delete 키로도 지워요 · Esc 선택 풀기</span>`;
    ctx.innerHTML=`<span class="cb-tool">${ico(t.icon)}<b>${t.name}</b></span><span class="cb-sep"></span><span class="cb-mid">${mid}</span><span class="cb-right"></span>`;return}
  const MCs=window.RoughStudio?.mcuts;if(MCs&&MCs.size>1&&tool==='select'){const ks=[...MCs],allBlank=ks.every(k=>withKey(k,()=>pageSettings()?.blank)),allLock=ks.every(k=>{const g=groupBy(k);return g&&isLocked(g,'cut')});
    mid=`<b>컷 ${ks.length}개</b><label>아래 간격 <input type="number" data-ctx="mcgap" min="0" max="1600" step="4" placeholder="기본" style="width:64px">px</label><button class="cb" data-ctx="mcgapgo">간격 적용</button>`+
      `<button class="cb${allBlank?' on':''}" data-ctx="mcblank" aria-pressed="${allBlank}">빈 컷</button><button class="cb" data-ctx="mcframe">프레임 초기화</button><button class="cb" data-ctx="mclock">${allLock?'잠금 풀기':'잠그기'}</button><button class="cb" data-ctx="mcdel">컷 지우기</button><button class="cb" data-ctx="mcclear">선택 풀기</button>`;
    ctx.innerHTML=`<span class="cb-tool">${ico(t.icon)}<b>${t.name}</b></span><span class="cb-sep"></span><span class="cb-mid">${mid}</span><span class="cb-right"></span>`;return}
  if(MULTI.size>1&&tool==='select')mid=`<b>식자 ${MULTI.size}개</b><button class="cb" data-ctx="lfit">글에 맞추기</button>${[['left','왼쪽'],['hcenter','가로 가운데'],['right','오른쪽'],['top','위'],['vcenter','세로 가운데'],['bottom','아래'],['vdist','세로 간격'],['hdist','가로 간격']].map(([k,n])=>`<button class="cb" data-align="${k}">${n}</button>`).join('')}`;
  else if(tool==='balloon')mid=`<label>형태 <select data-ctx="bstyle">${BSTYLES.map(([k,n])=>`<option value="${k}"${k===opt.balloon?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  else if(tool==='sfx')mid=`<label>문구 <input data-ctx="sfxword" value="${esc(opt.sfx)}" maxlength="10" size="6"></label>${['쾅','두근','툭','쿵','휘청','쨍그랑','덜컹','찰칵'].map(w=>`<button class="cb${w===opt.sfx?' on':''}" data-sfxw="${w}">${w}</button>`).join('')}`;
  else if(tool==='select'&&selectedLetter){const art=selectedLetter.querySelector('[data-balloon]'),kind=/^dialog/.test(selectedLetter.dataset.letter)?'말풍선':/^caption/.test(selectedLetter.dataset.letter)?'나레이션':'효과음';
    // 자세한 고치기는 오른쪽 편집 카드(letter-card.js)로 — 상황 막대는 핵심만
    mid=`<b>${kind}</b><span class="cb-t">${esc((selectedLetter.dataset.letterText||'').replace(/\s+/g,' ').slice(0,24))}</span><button class="cb" data-ctx="ledit" title="오른쪽 카드에서 문구·글자·형태를 고쳐요 (Enter)">문구 고치기</button>`+(/^(dialog|caption)/.test(selectedLetter.dataset.letter)?'<button class="cb" data-ctx="lstyleall" aria-haspopup="menu" title="이 식자의 모양·글꼴·색을 다른 식자에도">스타일 적용 ▾</button>':'')+
      `<button class="cb" data-ctx="llock">${isLocked(selectedLetter.closest('[data-slot-index]'),selectedLetter.dataset.letter)?'잠금 풀기':'잠그기'}</button>`}
  else if(tool==='select'&&pageSelection){const s=pageSettings(),g=selGroup();
    mid=`<b>${esc(pageCut.selectedOptions[0]?.textContent||'컷')}</b><label>아래 간격 <input type="number" data-ctx="gap" min="0" max="1600" step="4" value="${s?.gap??''}" placeholder="기본" style="width:64px">px</label><button class="cb" data-ctx="gapall" aria-haspopup="menu" title="이 간격을 씬의 모든 컷에">간격 일괄 ▾</button>
      <label>그림 확대 <input type="range" data-ctx="zoom" min="100" max="500" step="5" value="${($('#wzoom')?.value??100)}"><output>${($('#wzoom')?.value??100)}%</output></label>
      <button class="cb${frameShapeKey===pageSelection?' on':''}" data-ctx="fshape" aria-pressed="${frameShapeKey===pageSelection}" title="모퉁이를 하나씩 끌어 사선 칸 (컷 더블클릭과 같음)">프레임 모양</button>${frameShapeKey===pageSelection&&g?shapeTools(g):''}<button class="cb${s?.blank?' on':''}" data-ctx="blank" aria-pressed="${!!s?.blank}" title="그림·테두리 없이 글만 남는 컷(쉼·나레이션 컷)">빈 컷</button>${(()=>{const ls=s?.materialLines,ks=ls?Object.keys(ls):[];return ks.length?`<button class="cb ccol" data-ctx="linecolor" title="이 컷 효과선 색"><i style="background:${ls[ks[0]].color||'#27211e'}"></i>효과선 색</button>`:''})()}<button class="cb" data-ctx="crop">그림 편집</button><button class="cb" data-ctx="frame">프레임 초기화</button><button class="cb" data-ctx="ref">레퍼런스 ${esc($('#wrefid')?.textContent||'')}</button><button class="cb" data-ctx="clock">${g&&isLocked(g,'cut')?'잠금 풀기':'잠그기'}</button>`}
  else mid=`<span class="cb-hint">${esc(t.hint)}</span>`;
  ctx.innerHTML=`<span class="cb-tool">${ico(t.icon)}<b>${t.name}</b></span><span class="cb-sep"></span><span class="cb-mid">${mid}</span><span class="cb-right"></span>`;}
ctx.addEventListener('change',e=>{const c=e.target.dataset.ctx;
  if(c==='bstyle'){opt.balloon=e.target.value;SS('rough-tool-balloon',opt.balloon)}
  if(c==='lfont'&&selectedLetter){const L=selectedLetter,key=pageKey(L.closest('[data-slot-index]')),id=L.dataset.letter,v=e.target.value;withKey(key,()=>{const st=pageSettings(true);const o={...st.letters?.[id]};if(v)o.font=v;else delete o.font;(st.letters||={})[id]=o});saveScenes();renderWebtoon();const L2=groupBy(key)?.querySelector(`[data-letter="${CSS.escape(id)}"]`);if(L2)selectLetter(L2);flash(v?`글꼴: ${FONT_PRESETS[v].name}`:'글꼴: 작품 기본')}
  if(c==='lstyle'){const s=$('#wballoonstyle');s.value=e.target.value;s.dispatchEvent(new Event('change'))}
  if(c==='gap'&&pageSelection){const s=pageSettings(true),v=e.target.value;if(v==='')delete s.gap;else s.gap=clamp(Math.round(+v),0,1600);saveScenes();renderWebtoon()}
  if(c==='zoom'){const z=$('#wzoom');z.value=e.target.value;z.dispatchEvent(new Event('change'))}
  if(c==='fatop'||c==='fabot'){setFrameAngles(ctx.querySelector('[data-ctx=fatop]').value,ctx.querySelector('[data-ctx=fabot]').value);renderCtx()}
});
ctx.addEventListener('input',e=>{const c=e.target.dataset.ctx;
  if(c==='sfxword'){opt.sfx=e.target.value.replace(/[-\s]/g,'')||'쾅';SS('rough-tool-sfx',opt.sfx)}
  if(c==='lsize'){const s=$('#wballoonsize');s.value=e.target.value;s.dispatchEvent(new Event('input'));e.target.nextElementSibling.textContent=e.target.value+'%'}
  if(c==='zoom'){const z=$('#wzoom');z.value=e.target.value;z.dispatchEvent(new Event('input'));e.target.nextElementSibling.textContent=e.target.value+'%'}});
// 입력칸에 쓰다 메뉴 버튼을 누르면 입력칸의 change(다시 그리기)가 먼저 일어나 버튼이 바뀌어 클릭이 사라졌음 → 메뉴 버튼은 누를 때 포커스를 옮기지 않음
ctx.addEventListener('mousedown',e=>{if(e.target.closest('[data-ctx=gapall],[data-ctx=lstyleall]'))e.preventDefault()});
ctx.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.align){alignLetters(b.dataset.align);return}
  if(b.dataset.fpre){const [t,bt]=b.dataset.fpre.split(',');setFrameAngles(t,bt);renderCtx();return}
  if(b.dataset.sfxw){opt.sfx=b.dataset.sfxw;SS('rough-tool-sfx',opt.sfx);renderCtx();return}
  if(b.dataset.ab){setAB(b.dataset.ab==='1');return}
  const c=b.dataset.ctx;
  if(c==='ledit')focusText();
  if(c==='lfit')fitLetters();
  if(c==='sfxcolor'&&selectedLetter)openColorPop(b,'color',{what:'효과음 ',cur:pageSettings()?.letters?.[selectedLetter.dataset.letter]?.color||'#161616',apply:col=>{setLetterStyle({color:col==='#161616'?null:col});flash(col==='#161616'?'효과음 색을 처음대로':'효과음 색을 바꿨어요')}});
  if(c==='linecolor'&&pageSelection){const ls=pageSettings()?.materialLines||{},k0=Object.keys(ls)[0];openColorPop(b,'color',{cur:ls[k0]?.color||'#27211e',apply:col=>{const st=pageSettings(true);Object.values(st.materialLines||{}).forEach(l=>l.color=col);saveScenes();renderWebtoon();renderCtx();flash('효과선 색을 바꿨어요')}})}
  if(c==='scdel')window.RoughStudio?.deleteSelScene();
  if(c&&c.startsWith('mc'))multiCut(c.slice(2));
  if(c==='blank'&&pageSelection)toggleBlank(pageSelection);
  if(c==='gapall'){const r=b.getBoundingClientRect();cmOpen(gapAllMenu(),r.left,r.bottom+4)}
  if(c==='lstyleall'){const r=b.getBoundingClientRect();cmOpen(styleMenu(),r.left,r.bottom+4)}
  if(c==='llock'&&selectedLetter){const g=selectedLetter.closest('[data-slot-index]');toggleLock(pageKey(g),selectedLetter.dataset.letter)}
  if(c==='clock'&&pageSelection)toggleLock(pageSelection,'cut');
  if(c==='crop'){const g=selGroup();if(g)RoughStudio.setCrop(g)}
  if(c==='fshape'&&pageSelection){setFrameShape(frameShapeKey===pageSelection?null:pageSelection)}
  if(c==='frame')$('#wframereset').click();
  if(c==='ref')$('#wrefchange').click();
  if(c==='wsreset')applyPreset(LAYOUT.preset&&PRESETS[LAYOUT.preset]?LAYOUT.preset:'edit')});
function applyPreset(id){if(!PRESETS[id])return;LAYOUT=fromPreset(id);saveLayout();renderDocks();ASSET.auto=true;assetTab(PRESETS[id].tab);flash(`작업 공간: ${PRESETS[id].name}`)}

// ---------- 내비게이터 ----------
const mini=RoughStudio.mini;mini.box.classList.add('docked');navBody.querySelector('.nav-map').appendChild(mini.box);
const navZ=navBody.querySelector('#wsnavz'),navV=navBody.querySelector('#wsnavzv');
const syncNav=()=>{const z=Math.round(RoughStudio.zoom*100);navZ.value=z;navV.textContent=z+'%'};
new MutationObserver(syncNav).observe($('#wczlab'),{childList:true,characterData:true,subtree:true});
navZ.addEventListener('input',()=>{RoughStudio.zoomTo(+navZ.value/100);navV.textContent=navZ.value+'%'});
navBody.addEventListener('click',e=>{const n=e.target.closest('[data-nav]')?.dataset.nav;if(n==='all')RoughStudio.fitAll();if(n==='100')RoughStudio.zoomTo(1);if(n==='sel')RoughStudio.fitSelected()});

// ---------- 기록 ----------
const NAMES={frame:'프레임',quad:'칸 모양',img:'그림 확대',gap:'간격',letters:'식자',ref:'레퍼런스',background:'배경색',transition:'배경 전환',materialLines:'효과선',lock:'잠금'};
function diff(a,b){try{const A=JSON.parse(a),B=JSON.parse(b);const out=[];
  B.forEach((sb,i)=>{const sa=A[i]||{c:[],e:[]};const ac=sa.c||[],bc=sb.c||[];
    if(bc.length!==ac.length)out.push(`씬 ${i+1} 칸 ${bc.length>ac.length?'추가':'삭제'}`);
    else{const k=bc.findIndex((t,j)=>t!==ac[j]);if(k>=0)out.push(`씬 ${i+1} · ${k+1}컷 글`)}
    if(bc.length===ac.length){const ae=sa.e||[],be=sb.e||[];for(let j=0;j<Math.max(ae.length,be.length);j++){const x=ae[j]||{},y=be[j]||{};
      const ks=[...new Set([...Object.keys(x),...Object.keys(y)])].filter(k=>JSON.stringify(x[k])!==JSON.stringify(y[k]));
      if(ks.length){out.push(`씬 ${i+1} · ${j+1}컷 ${[...new Set(ks.map(k=>NAMES[k]||k))].join('·')}`);break}}}});
  return out[0]||'변경'}catch(_){return '변경'}}
function renderHistory(){const el=$('#wshist');if(!el||LAYOUT.panels.history.collapsed&&!LAYOUT.panels.history.float)return;
  const states=[...UNDO,edState()],redo=[...REDO].reverse(),start=Math.max(0,states.length-40);
  let h='';for(let i=start;i<states.length;i++){const cur=i===states.length-1;h+=`<li><button data-hist="${i}" aria-current="${cur}"${cur?' disabled':''}>${i===0?'편집 시작':esc(diff(states[i-1],states[i]))}${cur?' <small>지금</small>':''}</button></li>`}
  let prev=states[states.length-1];redo.forEach((s,j)=>{h+=`<li class="redo"><button data-redo="${j}">${esc(diff(prev,s))} <small>다시 실행</small></button></li>`;prev=s});
  el.innerHTML=h;el.lastElementChild?.scrollIntoView?.({block:'nearest'})}
histBody.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.hist!=null){const n=UNDO.length-+b.dataset.hist;for(let k=0;k<n;k++)$('#wundo').click()}
  if(b.dataset.redo!=null){for(let k=0;k<=+b.dataset.redo;k++)$('#wredo').click()}});
{const _eb=edButtons;edButtons=function(...a){const r=_eb(...a);renderHistory();return r}}

// ---------- 글자 ----------
const FONTS=Object.entries(FONT_PRESETS);  // [id,{name,note,...}]
function renderText(){textBody.innerHTML=`<label class="wsf"><span>작품 기본 글꼴</span><select id="wsfont">${FONTS.map(([v,f])=>`<option value='${v}'${v===PAGE_PRESET?' selected':''}>${f.name} · ${f.note}</option>`).join('')}</select></label>
  <p class="wsn">이 기기에 설치된 글꼴로 보이고, 내보내기 파일에도 같은 글꼴 이름이 들어가요.</p>
  <label class="wsf"><span>범위</span><select id="wsscope"><option value="scene">선택한 씬</option><option value="all">모든 씬</option></select></label>
  <label class="wsf"><span>말풍선 크기</span><input type="range" id="wsbsize" min="50" max="200" value="100"><output id="wsbsizev">100%</output></label>
  <label class="wsf"><span>말풍선 형태</span><select id="wsbstyle">${BSTYLES.map(([k,n])=>`<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
  <div class="wsb"><button class="btn sm" data-text="size">크기 적용</button><button class="btn sm" data-text="style">형태 적용</button><button class="btn sm" data-text="copy" title="고른 말풍선의 형태·크기를 범위의 모든 말풍선에">고른 말풍선 서식 복사</button></div>`}
function applyAll(edit){const scope=$('#wsscope')?.value||'scene',sc=pageSelection?pageSelection.split(':')[0]:String(SCUR);
  const list=[...reader.querySelectorAll('[data-letter^="dialog-"]')].filter(L=>scope==='all'||L.closest('section').dataset.pageScene===sc);
  let n=0;list.forEach(L=>{const g=L.closest('[data-slot-index]');if(isLocked(g,L.dataset.letter))return;withKey(pageKey(g),()=>saveLetter(L,edit));n++});
  renderWebtoon();flash(`말풍선 ${n}개에 적용했어요`)}
textBody.addEventListener('change',e=>{if(e.target.id==='wsfont'){PAGE_PRESET=e.target.value;try{localStorage.setItem('rough-page-preset',PAGE_PRESET)}catch(_){}renderWebtoon();flash(`작품 기본 글꼴: ${FONT_PRESETS[PAGE_PRESET].name}`)}});
textBody.addEventListener('input',e=>{if(e.target.id==='wsbsize')$('#wsbsizev').textContent=e.target.value+'%'});
textBody.addEventListener('click',e=>{const a=e.target.closest('[data-text]')?.dataset.text;
  if(a==='size')applyAll({scale:+$('#wsbsize').value/100});
  if(a==='style')applyAll({style:$('#wsbstyle').value});
  if(a==='copy'){if(!selectedLetter?.querySelector('[data-balloon]')){flash('먼저 말풍선 하나를 고르세요');return}const p=letterPosition(selectedLetter);applyAll({style:p.style||'auto',scale:p.scale||1})}});

// ---------- 정렬 ----------
function renderAlign(){const n=MULTI.size;alignBody.innerHTML=`<p class="wsn">${n>1?`식자 ${n}개를 골랐어요.`:'Shift+클릭으로 식자를 2개 이상 고르세요.'}</p><div class="algrid">${[
  ['left','왼쪽','<path d="M3 2h2.2v20H3zM7.2 5H18v5H7.2zM7.2 14H14v5H7.2z"/>'],['hcenter','가로 가운데','<path d="M10.9 2h2.2v20h-2.2zM5 5h14v5H5zM7.5 14h9v5h-9z"/>'],['right','오른쪽','<path d="M18.8 2H21v20h-2.2zM6 5h10.8v5H6zM10 14h6.8v5H10z"/>'],
  ['top','위','<path d="M2 3h20v2.2H2zM5 7.2h5V18H5zM14 7.2h5V14h-5z"/>'],['vcenter','세로 가운데','<path d="M2 10.9h20v2.2H2zM5 5h5v14H5zM14 7.5h5v9h-5z"/>'],['bottom','아래','<path d="M2 18.8h20V21H2zM5 6h5v10.8H5zM14 10h5v6.8h-5z"/>'],
  ['vdist','세로 간격 고르게','<path d="M2 2h20v2.2H2zM2 19.8h20V22H2zM6 7.6h12v3.2H6zM6 13.2h12v3.2H6z"/>'],['hdist','가로 간격 고르게','<path d="M2 2h2.2v20H2zM19.8 2H22v20h-2.2zM7.6 6h3.2v12H7.6zM13.2 6h3.2v12h-3.2z"/>']].map(([k,n2,d])=>`<button class="al" data-align="${k}" title="${n2}" aria-label="${n2}"${n<2||(k.endsWith('dist')&&n<3)?' disabled':''}>${ico(d)}</button>`).join('')}</div>
  ${n?'<button class="btn sm" data-align="clear">선택 해제</button>':''}`}
alignBody.addEventListener('click',e=>{const k=e.target.closest('[data-align]')?.dataset.align;if(k==='clear')clearMulti();else if(k)alignLetters(k)});

// ---------- 소재 ----------
const SFXW=['쾅','두근','툭','쿵','휘청','쨍그랑','덜컹','찰칵','펑','슥','후다닥','부르르'];
function renderLib(){libBody.innerHTML=`<p class="wsn">눌러서 도구로 쓰거나 캔버스의 컷으로 끌어다 놓아요.</p>
  <h5>효과음</h5><div class="libgrid words">${SFXW.map(w=>`<button class="lib" draggable="true" data-mat="sfx" data-v="${w}">${w}</button>`).join('')}</div>
  <h5>배경 전환</h5><div class="libgrid">${PAGE_BACKGROUNDS.map((p,i)=>p?`<button class="lib" draggable="true" data-mat="bg" data-v="${i}" title="${esc(p.name)}">${$(`#wbgpresets [data-bg-preset="${i}"]`)?.querySelector('svg')?.outerHTML||''}<span>${esc(p.name)}</span></button>`:'').join('')}</div>
`}
function useMat(kind,v,group,pt,target){
  if(kind==='balloon'){if(!group){opt.balloon=v;SS('rough-tool-balloon',v);setTool('balloon');return}
    const L=target?.closest?.('[data-letter^="dialog-"]');if(L){withKey(pageKey(group),()=>saveLetter(L,{style:v}));renderWebtoon();flash('말풍선 형태를 바꿨어요');return}
    addLetter('balloon',group,pt,{style:v});return}
  if(kind==='sfx'){const L=selSfx();if(L&&!target?.closest?.('[data-slot-index]:not(.sel)')){swapSfx(L,v,null);return}if(!group){opt.sfx=v;SS('rough-tool-sfx',v);setTool('sfx');return}addLetter('sfx',group,pt,{text:v});return}
  if(kind==='bg'){if(group)selectPageCut(group);if(!pageSelection){flash('배경을 넣을 컷을 먼저 고르세요');return}$(`#wbgpresets [data-bg-preset="${v}"]`)?.click();flash('배경 전환을 넣었어요');return}
  if(kind==='line'){if(group)selectPageCut(group);const st=pageSelection&&pageSettings(),ls=st?.materialLines,ks=ls?Object.keys(ls):[];
    // 컷에 다른 종류 효과선이 하나 있으면 새로 그리지 않고 종류만 바꿈
    if(ks.length===1&&ks[0]!==v){const e={...ls[ks[0]],kind:v};delete ls[ks[0]];ls[v]=e;saveScenes();renderWebtoon();flash(`효과선을 ${v==='speed'?'속도선':'집중선'}으로 바꿨어요 · Ctrl+Z로 되돌리기`);return}
    setTool(v)}}
libBody.addEventListener('click',e=>{const b=e.target.closest('[data-mat]');if(b)useMat(b.dataset.mat,b.dataset.v)});
libBody.addEventListener('dragstart',e=>{const b=e.target.closest('[data-mat]');if(!b)return;e.dataTransfer.setData('application/x-rough-mat',JSON.stringify({k:b.dataset.mat,v:b.dataset.v}));e.dataTransfer.effectAllowed='copy'});
let over=null;const mark=g=>{if(over===g)return;over?.classList.remove('drop-target');over=g;g?.classList.add('drop-target')};
reader.addEventListener('dragover',e=>{if(!e.dataTransfer.types.includes('application/x-rough-mat'))return;const g=e.target.closest('[data-slot-index]');mark(g);if(g){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
reader.addEventListener('dragleave',e=>{if(!reader.contains(e.relatedTarget))mark(null)});
reader.addEventListener('drop',e=>{const raw=e.dataTransfer.getData('application/x-rough-mat');if(!raw)return;const g=e.target.closest('[data-slot-index]');mark(null);if(!g)return;e.preventDefault();
  const {k,v}=JSON.parse(raw),pt=pagePoint(g.ownerSVGElement,e);useMat(k,v,g,{x:pt.x,y:pt.y},e.target)});

// ---------- 레이어: 썸네일·잠금 ----------
const LOCK='<path fill-rule="evenodd" d="M7 10V7.5a5 5 0 0 1 10 0V10h1.5v11h-13V10zm2.5 0h5V7.5a2.5 2.5 0 0 0-5 0z"/>',UNLOCK='<path d="M7 10V7.5a5 5 0 0 1 9.7-1.8l-2.3 1A2.5 2.5 0 0 0 9.5 7.5V10h9v11h-13V10z"/>';
{const _et=editTree;editTree=function(...a){const r=_et(...a);decorateTree();return r}}
function decorateTree(){const el=PANELS.layers.el;if(!el)return;
  el.querySelectorAll('.tcutrow').forEach(row=>{const b=row.querySelector('[data-tcut]');if(!b||row.querySelector('.tthumb'))return;const key=b.dataset.tcut,g=groupBy(key);if(!g)return;
    const [si]=key.split(':').map(Number),n=+g.dataset.p,p=scenePanels(si)[n]||{},im=cutImg(si,n,p),src=im?im.src:p.ref?(p.ref.fixed?p.ref.src:(p.ref.thumb||cutThumb(p.ref.source_cut)||p.ref.src)):'';
    b.insertAdjacentHTML('afterbegin',src?`<img class="tthumb" src="${src}" alt="" loading="lazy">`:'<span class="tthumb"></span>');
    const on=isLocked(g,'cut');row.insertAdjacentHTML('beforeend',`<button class="tlock${on?' on':''}" data-tlock="${esc(key)}|cut" aria-pressed="${on}" title="${on?'컷 잠금 풀기':'컷 잠그기(프레임·그림·간격 고정)'}" aria-label="${n+1}컷 ${on?'잠금 풀기':'잠그기'}">${ico(on?LOCK:UNLOCK)}</button>`)});
  el.querySelectorAll('.tlrow').forEach(row=>{const b=row.querySelector('[data-tlayer]');if(!b||row.querySelector('.tlock'))return;const [key,lk]=b.dataset.tlayer.split('|'),g=groupBy(key);if(!g)return;
    const on=isLocked(g,lk);row.insertAdjacentHTML('beforeend',`<button class="tlock${on?' on':''}" data-tlock="${esc(key)}|${esc(lk)}" aria-pressed="${on}" title="${on?'잠금 풀기':'잠그기'}" aria-label="${on?'잠금 풀기':'잠그기'}">${ico(on?LOCK:UNLOCK)}</button>`)})}
PANELS.layers.el.addEventListener('click',e=>{const b=e.target.closest('[data-tlock]');if(!b)return;e.stopPropagation();const [key,what]=b.dataset.tlock.split('|');toggleLock(key,what)},true);

// ---------- 씬 아트보드(나란히) ----------
let AB=LS('rough-artboards',false);
function setAB(on){AB=!!on;SS('rough-artboards',AB);reader.classList.toggle('artboards',AB);RoughStudio.applyZoom();RoughStudio.mini.refresh();navBody.querySelector('.nav-note').hidden=!AB;renderCtx();flash(AB?'씬을 나란히 놓았어요 · Shift+1로 전체 보기':'씬을 세로로 이어 놓았어요')}

// ---------- 단축키 ----------
const kd=document.createElement('dialog');kd.className='keysdlg';kd.setAttribute('aria-labelledby','wskt');document.body.appendChild(kd);
let rebind=null;
function openKeys(){renderKeys();kd.showModal()}
function renderKeys(){requestAnimationFrame(()=>kd.querySelector('.keyb.wait')?.focus());kd.innerHTML=`<h3 id="wskt">도구 단축키</h3><p class="wsn">키를 누른 뒤 바꿀 글자를 누르세요. P·[·]·?·Space는 다른 기능이 써요.</p><dl>${TOOLS.filter(Boolean).map(t=>`<dt>${t.name}</dt><dd><button class="btn sm keyb${rebind===t.id?' wait':''}" data-rebind="${t.id}">${rebind===t.id?'키를 누르세요':esc(KEYS[t.id])}</button></dd>`).join('')}</dl><form method="dialog" class="kfoot"><button class="btn sm" type="button" data-keys="reset">기본값으로</button><button class="btn dark">닫기</button></form>`}
kd.addEventListener('click',e=>{const b=e.target.closest('[data-rebind]');if(b){rebind=b.dataset.rebind;renderKeys();return}if(e.target.closest('[data-keys="reset"]')){KEYS=Object.fromEntries(TOOLS.filter(Boolean).map(t=>[t.id,t.key]));SS('rough-tool-keys',{});rebind=null;renderKeys();renderRail()}});
document.addEventListener('keydown',e=>{if(!rebind||!kd.open)return;if(e.key==='Escape'){rebind=null;renderKeys();e.preventDefault();return}
  const k=e.key.length===1?e.key.toUpperCase():null;e.preventDefault();e.stopPropagation();
  if(!k||!/^[A-Z0-9]$/.test(k)||RESERVED.has(k)){kd.querySelector('.wsn').textContent='영문자나 숫자 한 개를 눌러 주세요(P는 읽기 모드).';return}
  const other=Object.keys(KEYS).find(id=>KEYS[id]===k&&id!==rebind);if(other)KEYS[other]=KEYS[rebind];KEYS[rebind]=k;
  const def=Object.fromEntries(TOOLS.filter(Boolean).map(t=>[t.id,t.key]));SS('rough-tool-keys',Object.fromEntries(Object.entries(KEYS).filter(([id,v])=>def[id]!==v)));
  rebind=null;renderKeys();renderRail();syncHelp()},true);
document.addEventListener('keydown',e=>{if(!inEdit()||typing(e.target)||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;
  if(e.key==='Escape'){if(MULTI.size)clearMulti();if(tool!=='select'){setTool('select');e.preventDefault()}hideFly();return}
  if(e.shiftKey||e.key.length!==1)return;const k=e.key.toUpperCase(),id=Object.keys(KEYS).find(t=>KEYS[t]===k);
  if(id){e.preventDefault();setTool(id)}});

// ---------- 오른쪽 밖으로 옮긴 패널: 속성 서랍 · 떠 있는 미니맵 ----------
const drawer=mk('wsdrawer');drawer.hidden=true;ctx.after(drawer);
const DTABS=[['props','속성'],['text','글자'],['align','정렬'],['history','기록']];
drawer.innerHTML=`<div class="wsd-tabs" role="tablist">${DTABS.map(([k,n])=>`<button role="tab" data-dt="${k}">${n}</button>`).join('')}<span class="grow"></span><button class="cb" data-dt="close" aria-label="속성 서랍 닫기">닫기 ✕</button></div><div class="wsd-body"></div>`;
const miniWrap=mk('wsmini');miniWrap.hidden=true;miniWrap.innerHTML='<div class="wsmini-h"><b>미니맵</b><button class="cb" data-mini="close" aria-label="미니맵 닫기">✕</button></div>';V.querySelector('.edgrid').appendChild(miniWrap);
let DT=LS('rough-ws-drawer-tab','props');
function mountOff(){const b=drawer.querySelector('.wsd-body');DTABS.forEach(([k])=>{const el=PANELS[k].el;el.dataset.dt=k;b.appendChild(el)});miniWrap.appendChild(navBody);libBody.remove()}
// ---------- 글자 꾸밈 도구: 글꼴(가 가 가) · 굵게 · 기울임 · 밑줄 · 글자색 ----------
const TCOLORS=['#161616','#ffffff','#6b7280','#2f5a3a','#2f6db5','#7a4fb0','#b42318','#c2410c','#8a5a2a','#d6336c'];  // DB 컷에서 본 글자색(검정·흰색·회색·초록(GM)·파랑·보라·빨강·주황·갈색·분홍)
const ICO={b:'<svg viewBox="0 0 24 24"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg>',i:'<svg viewBox="0 0 24 24"><path d="M14 5h-4M14 19h-4M14.5 5l-5 14"/></svg>',u:'<svg viewBox="0 0 24 24"><path d="M7 5v6a5 5 0 0 0 10 0V5M5 20h14"/></svg>'};
function textTools(o){const cur=o.font||PAGE_PRESET,col=o.color||'#161616';
  return `<span class="tfonts" role="group" aria-label="글꼴">${Object.entries(FONT_PRESETS).map(([v,f])=>`<button type="button" data-tf="${v}" aria-pressed="${v===cur}" title="${f.name} · ${f.note}" style="font-family:${f.family.replace(/"/g,"'")};font-weight:${f.weight}">가</button>`).join('')}</span>`+
    `<span class="tdeco" role="group" aria-label="글자 꾸밈"><button type="button" data-td="bold" aria-pressed="${!!o.bold}" title="굵게 (Ctrl+B)">${ICO.b}</button><button type="button" data-td="italic" aria-pressed="${!!o.italic}" title="기울임 (Ctrl+I)">${ICO.i}</button><button type="button" data-td="underline" aria-pressed="${!!o.underline}" title="밑줄 (Ctrl+U)">${ICO.u}</button><button type="button" class="tc" data-tcolor="color" title="글자색"><span><b>A</b><i style="background:${col}"></i></span></button><button type="button" class="tc to" data-tcolor="outline" title="글자 테두리색"><span><b>A</b><i style="background:${o.outline==='none'?'transparent;border:1px dashed var(--t3)':o.outline||(/^caption/.test(selectedLetter.dataset.letter)?'#ffffff;border:1px solid var(--line2)':'transparent;border:1px dashed var(--t3)')}"></i></span></button></span>`}
function setLetterStyle(patch){const L=selectedLetter;if(!L)return;const key=pageKey(L.closest('[data-slot-index]')),id=L.dataset.letter;
  if(isLocked(L.closest('[data-slot-index]'),id)){flash('잠긴 식자예요');return}
  withKey(key,()=>{const st=pageSettings(true);const o={...st.letters?.[id],...patch};for(const k of Object.keys(patch))if(patch[k]===null||patch[k]===false||patch[k]==='')delete o[k];(st.letters||={})[id]=o});
  saveScenes();renderWebtoon();const L2=groupBy(key)?.querySelector(`[data-letter="${CSS.escape(id)}"]`);if(L2)selectLetter(L2)}
const curStyle=()=>selectedLetter?(pageSettings()?.letters?.[selectedLetter.dataset.letter]||{}):{};
ctx.addEventListener('click',e=>{const f=e.target.closest('[data-tf]');if(f){setLetterStyle({font:f.dataset.tf===PAGE_PRESET?null:f.dataset.tf});flash(`글꼴: ${FONT_PRESETS[f.dataset.tf].name}`);return}
  const d=e.target.closest('[data-td]');if(d){const k=d.dataset.td;setLetterStyle({[k]:!curStyle()[k]});return}
  const c=e.target.closest('[data-tcolor]');if(c){openColorPop(c,c.dataset.tcolor);return}});
// 색 고르기 창: field = 'color'(글자색) | 'outline'(테두리색 · 「없음」 있음)
function openColorPop(anchor,field='color',opts={}){document.querySelector('.tcpop')?.remove();const out=field==='outline',cur=opts.cur||curStyle()[field]||(out?'':'#161616'),pop=document.createElement('div');pop.className='tcpop';
  pop.innerHTML=(out?`<button type="button" class="none" data-c="none" aria-pressed="${cur==='none'}" aria-label="테두리 없음" title="테두리 없음"></button>`:'')+TCOLORS.slice(0,out?9:10).map(c=>`<button type="button" data-c="${c}" style="background:${c}" aria-pressed="${c===cur}" aria-label="${out?'테두리':'글자'}색 ${c}"></button>`).join('')+
    `<label>직접 고르기 <input type="color" value="${/^#/.test(cur)?cur:'#ffffff'}"></label>`+(out?'<label style="color:var(--t3)">비우면 나레이션은 자동(글자와 반대 톤), 말풍선은 없음</label>':'');
  const r=anchor.getBoundingClientRect();Object.assign(pop.style,{left:Math.min(r.left,innerWidth-190)+'px',top:(r.bottom+6)+'px'});document.body.appendChild(pop);
  const done=c=>{pop.remove();if(opts.apply){opts.apply(c);return}setLetterStyle({[field]:!out&&c==='#161616'?null:c});flash(out?(c==='none'?'글자 테두리를 없앴어요':'글자 테두리색을 바꿨어요'):(opts.what||'글자')+'색을 바꿨어요')};
  pop.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b)done(b.dataset.c)});pop.querySelector('input').addEventListener('change',e=>done(e.target.value));
  setTimeout(()=>document.addEventListener('pointerdown',function off(e){if(!pop.contains(e.target)){pop.remove();document.removeEventListener('pointerdown',off,true)}},true),0)}
document.addEventListener('keydown',e=>{if(!inEdit()||!selectedLetter||typing(e.target)||!(e.ctrlKey||e.metaKey)||e.altKey||e.shiftKey)return;if(!/^(dialog|caption)/.test(selectedLetter.dataset.letter))return;
  const k={b:'bold',i:'italic',u:'underline'}[e.key.toLowerCase()];if(!k)return;e.preventDefault();setLetterStyle({[k]:!curStyle()[k]})});
function drawerTab(k){DT=k;SS('rough-ws-drawer-tab',k);drawer.querySelectorAll('[data-dt]').forEach(b=>b.setAttribute('aria-selected',b.dataset.dt===k));DTABS.forEach(([t])=>PANELS[t].el.hidden=t!==k);onOpen(k)}
function setDrawer(on,k){drawer.hidden=!on;SS('rough-ws-drawer',!!on);if(on)drawerTab(k||DT);renderCtx()}
function openOff(id){if(id==='refs'){assetTab('ref');return}if(id==='library'){assetTab('rec');return}if(id==='nav'){miniWrap.hidden=false;RoughStudio.mini.refresh();return}setDrawer(true,id)}
drawer.addEventListener('click',e=>{const k=e.target.closest('[data-dt]')?.dataset.dt;if(!k)return;if(k==='close')setDrawer(false);else drawerTab(k)});
miniWrap.addEventListener('click',e=>{if(e.target.closest('[data-mini="close"]')){miniWrap.hidden=true;SS('rough-ws-mini',false);renderCtx()}});
{const _rc=renderCtx;renderCtx=function(...a){_rc(...a);const r=ctx.querySelector('.cb-right');if(!r||r.querySelector('[data-off]'))return;
  r.insertAdjacentHTML('afterbegin',`<button class="cb${drawer.hidden?'':' on'}" data-off="drawer" aria-expanded="${!drawer.hidden}" title="속성·글자·정렬·기록">속성 ${drawer.hidden?'▾':'▴'}</button>`)}}
ctx.addEventListener('click',e=>{const o=e.target.closest('[data-off]')?.dataset.off;if(!o)return;if(o==='drawer')setDrawer(drawer.hidden);if(o==='mini'){miniWrap.hidden=!miniWrap.hidden;SS('rough-ws-mini',!miniWrap.hidden);if(!miniWrap.hidden)RoughStudio.mini.refresh();renderCtx()}});

// ---------- 에셋 패널(오른쪽 전용) ----------
// 미리캔버스·망고보드처럼 에셋을 한 서랍에: 검색 · 적용 대상 · 탭. 클릭하면 고른 대상에, 끌어 놓으면 놓은 자리에
const ATABS=[['rec','추천'],['balloon','말풍선'],['sfx','효과음'],['bg','배경'],['ref','컷 참고'],['seq','시퀀스'],['up','업로드'],['star','★']];
const ASSET={tab:'rec',auto:true,q:''};
const RECENT=()=>LS('rough-asset-recent',[]);
function remember(k,v,label){const r=RECENT().filter(x=>!(x.k===k&&x.v===v));r.unshift({k,v,label});SS('rough-asset-recent',r.slice(0,24))}
assetBody.innerHTML=`<div class="as-top"><input type="search" id="asq" placeholder="에셋 검색 (말풍선·효과음·질감·컷 내용…)" aria-label="에셋 검색"><div class="as-target" id="astarget"></div>
  <div class="as-tabs" role="tablist">${ATABS.map(([k,n])=>`<button role="tab" data-at="${k}">${n}</button>`).join('')}</div></div><div class="as-body" id="asbody"></div><div class="as-refs" id="asrefs" hidden></div>`;
const asBody=assetBody.querySelector('#asbody'),asRefs=assetBody.querySelector('#asrefs');asRefs.appendChild(PANELS.refs.el);
function selPanel(){if(!pageSelection)return null;const [si,slot]=pageSelection.split(':').map(Number),ps=scenePanels(si);return ps.find((p,i)=>cutSlot(p,i)===slot)||null}
function targetText(){if(selectedLetter){const k=selectedLetter.dataset.letter;return `${/^dialog/.test(k)?'말풍선':/^caption/.test(k)?'나레이션':'효과음'} · ${(selectedLetter.dataset.letterText||'').slice(0,14)}`}
  if(pageSelection)return `${pageCut.selectedOptions[0]?.textContent||'컷'}`;return ''}
function renderTarget(){const t=targetText();assetBody.querySelector('#astarget').innerHTML=t?`<span>적용 대상</span><b>${esc(t)}</b>`:'<span>컷을 고르면 클릭으로 넣고, 아니면 캔버스로 끌어다 놓아요</span>'}
function assetTab(k,user){if(!ATABS.some(t=>t[0]===k))k='rec';ASSET.tab=k;if(user)ASSET.auto=false;assetBody.querySelectorAll('[data-at]').forEach(b=>b.setAttribute('aria-selected',b.dataset.at===k));
  const refs=k==='ref';asRefs.hidden=!refs;asBody.hidden=refs;if(refs){if(!assetTab.busy){assetTab.busy=true;try{RoughRefs.showTab('refs')}finally{assetTab.busy=false}}const q=$('#rfq');if(q&&ASSET.q&&q.value!==ASSET.q){q.value=ASSET.q;q.dispatchEvent(new Event('input',{bubbles:true}))}}else renderAssets();renderTarget()}
// ---------- 즐겨찾기: 모든 에셋(말풍선·효과음·효과선·배경·색·이미지·시퀀스)을 ★로 모아 봄 ----------
const FAVS=LS('rough-asset-favs',[]);
const favKey=(k,v)=>k+'|'+v;
function isFav(k,v){return FAVS.some(f=>favKey(f.k,f.v)===favKey(k,String(v)))||(k==='pack'&&typeof materialFavorites!=='undefined'&&materialFavorites.has(String(v)))}
function toggleFav(k,v,label){v=String(v);const on=isFav(k,v),i=FAVS.findIndex(f=>favKey(f.k,f.v)===favKey(k,v));if(i>=0)FAVS.splice(i,1);if(!on)FAVS.unshift({k,v,label});
  if(k==='pack'&&typeof materialFavorites!=='undefined'){on?materialFavorites.delete(v):materialFavorites.add(v);try{localStorage.setItem('rough-material-favorites',JSON.stringify([...materialFavorites]))}catch(_){}}
  SS('rough-asset-favs',FAVS.slice(0,400));return !on}
const item=(k,v,label,inner,extra='')=>`<button class="asi" draggable="true" data-mat="${k}" data-v="${esc(String(v))}" data-label="${esc(label)}" title="${esc(label)}"${extra}>${inner}<span>${esc(label)}</span><span class="fav${isFav(k,v)?' on':''}" data-fav role="button" tabindex="-1" aria-label="즐겨찾기" title="즐겨찾기">★</span></button>`;
// ---------- 효과음: 소재 묶음 타입(A~D)·검색 ----------
const SFX_TYPES=[['A','흰 테두리'],['B','계단형'],['C','가는 펜선'],['D','컷 전 선행음']];
let SFX_TYPE=LS('rough-sfx-type','A');if(!SFX_TYPES.some(t=>t[0]===SFX_TYPE))SFX_TYPE='A';
const SFXQ={q:'',cat:''};
const packOf=w=>typeof materialCatalog!=='undefined'?materialCatalog.find(w):null;
function packTile(id){const e=materialCatalog.entry(id),art=e&&materialCatalog.image(e,SFX_TYPE);return art?`<img class="apv sfxi" src="${art.src}" alt="" loading="lazy">`:sfxTile(e?.word||'')}
// 자주 쓰는 낱말: 묶음에 있으면 그 소재(고른 타입)로, 없으면 기본 레터링
const quickItem=w=>{const e=packOf(w);return e?item('pack',e.id,w,packTile(e.id),` data-cat="${esc(e.category)}"`):item('sfx',w,w,sfxTile(w))};
function sfxMatches(){const q=SFXQ.q.normalize('NFKC').toLowerCase();return (materialRows||[]).filter(r=>(!SFXQ.cat||r.category===SFXQ.cat)&&(!q||r.word.normalize('NFKC').toLowerCase().includes(q)||r.category.toLowerCase().includes(q)))}
// 효과음 소재는 60개씩: 맨 아래(더 보기 자리)가 보이면 다음 60개 그림을 풀어 붙임
const SFX_PAGE=60;let sfxShown=0,sfxList=[],sfxIO=null;
const sfxLoad=rows=>Promise.all(rows.map(e=>materialCatalog.load(e,SFX_TYPE).catch(()=>{})));  // 고른 타입 그림만
const packItem=r=>item('pack',r.id,r.word,packTile(r.id),` data-cat="${esc(r.category)}"`);
function renderSfxGrid(){const el=asBody.querySelector('#sfxgrid');if(!el)return;sfxList=sfxMatches();sfxShown=0;
  el.innerHTML=(SFXQ.q||SFXQ.cat?'':`<h5>자주 쓰는 효과음</h5><div class="asgrid sfxs">${SFXW.map(quickItem).join('')}</div>`)+
    (materialRows?.length?`<h5>효과음 소재 · ${SFX_TYPES.find(t=>t[0]===SFX_TYPE)[1]} (${sfxList.length})</h5>`+(sfxList.length?'<div class="asgrid sfxs" id="sfxpack"></div><div class="sfxmore" id="sfxmore" hidden>더 불러오는 중…</div>':'<p class="as-empty">찾는 효과음이 없어요.</p>'):
      `<p class="as-note">효과음 소재 묶음(ZIP, 615종 × 타입 4)을 한 번 불러오면 이 브라우저에 남아 다음부터 바로 써요. <button class="btn sm" data-as="zip">효과음 ZIP 불러오기</button></p>`);
  // 자주 쓰는 낱말 그림이 아직 안 풀렸으면 풀고 그 칸만 다시
  const quick=SFXW.map(packOf).filter(e=>e&&!materialCatalog.image(e,SFX_TYPE));if(quick.length)sfxLoad(quick).then(()=>{const q=el.querySelector('.asgrid.sfxs');if(q&&!SFXQ.q&&!SFXQ.cat)q.innerHTML=SFXW.map(quickItem).join('')});
  sfxMore()}
function sfxMore(){const grid=asBody.querySelector('#sfxpack'),more=asBody.querySelector('#sfxmore');if(!grid||sfxMore.busy)return;
  const page=sfxList.slice(sfxShown,sfxShown+SFX_PAGE);if(!page.length){if(more)more.hidden=true;return}
  sfxMore.busy=true;const list=sfxList;sfxLoad(page).then(()=>{sfxMore.busy=false;if(list!==sfxList||!grid.isConnected)return;
    grid.insertAdjacentHTML('beforeend',page.map(packItem).join(''));sfxShown+=page.length;
    if(more){more.hidden=sfxShown>=sfxList.length;if(!more.hidden){sfxIO?.disconnect();sfxIO=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting))sfxMore()},{rootMargin:'300px'});sfxIO.observe(more)}}})}
// 처음에는 첫 60개(+자주 쓰는 낱말)만 미리 풀어 둠. 나머지는 스크롤할 때
const sfxPreload=(()=>{let started=false;return ()=>{if(started||typeof materialCatalog==='undefined')return;started=true;
  materialCatalog.ready().then(rows=>{if(!rows.length){started=false;return}materialRows=rows;
    sfxLoad([...rows.slice(0,SFX_PAGE),...SFXW.map(packOf).filter(Boolean)]).then(()=>{if(ASSET.tab==='sfx')renderSfxGrid()})})}})();
if(document.readyState==='complete')setTimeout(sfxPreload,300);else addEventListener('load',()=>setTimeout(sfxPreload,300),{once:true});

const match=s=>!ASSET.q||String(s).toLowerCase().includes(ASSET.q.toLowerCase());
const EMO_BG={'설렘':3,'기쁨':3,'다정':3,'긴장':2,'분노':2,'결의':2,'쓸쓸':4,'회상':4,'놀람':5,'당황':5,'냉담':6,'평온':1,'의아':1,'개그':1};
const EMO_SFX={'설렘':['두근'],'놀람':['쾅','휘청'],'분노':['쾅','쿵'],'긴장':['두근','툭'],'당황':['휘청'],'개그':['펑']};
const bgThumb=i=>$(`#wbgpresets [data-bg-preset="${i}"]`)?.querySelector('svg')?.outerHTML||'';
function seqList(){try{return JSON.parse(localStorage.getItem('rough-seq-templates')||'[]')}catch(_){return[]}}
// ---------- 에셋 미리보기: 타일에 실제 결과(말풍선 모양+대사, 효과음 레터링, 컷 위 효과선, 컷→질감→컷 띠) ----------
function cutSrc(si,n){const p=scenePanels(si)[n];if(!p)return '';const im=cutImg(si,n,p);return im?im.src:p.ref?(p.ref.fixed?p.ref.src:(p.ref.thumb||cutThumb(p.ref.source_cut)||p.ref.src)):''}
function selSrcs(){if(!pageSelection)return ['',''];const [si]=pageSelection.split(':').map(Number),g=selGroup();const n=g?+g.dataset.p:0;return [cutSrc(si,n),cutSrc(si,n+1)]}
const cutBg=src=>src?` style="background-image:url('${src.replace(/'/g,'%27')}')"`:'';
function sampleLine(){const L=selectedLetter&&/^dialog/.test(selectedLetter.dataset.letter)?selectedLetter.dataset.letterText:null;
  const p=selPanel(),t=L||(p&&((p.dialogs||[]).find(d=>d.text)?.text||p.said))||'대사';const a=Array.from(String(t).replace(/\s+/g,' ').trim());return a.length>7?a.slice(0,6).join('')+'…':a.join('')}
function balloonTile(k,text){const st=BALLOON_STYLES.find(s=>s[0]===k);let body='';try{body=presetBalloon(st,0,0,64,30,1,rngL(k),false).body}catch(_){return swatch(k)}
  const fs=Array.from(text).length>5?13:15;
  return `<svg class="apv bal" viewBox="-80 -42 160 84" aria-hidden="true">${body}<text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="600" fill="#161616" font-family="Pretendard, sans-serif">${esc(text)}</text></svg>`}
function sfxTile(w){let g='';try{g=soundEffectSVG(w,{x:0,y:0,w:630,h:400,before:0},'left',1,null)}catch(_){}
  return g?`<svg class="apv sfxp fit" viewBox="0 0 630 400" aria-hidden="true">${g}</svg>`:`<b class="apv">${esc(w)}</b>`}
function lineTile(kind,src){const eff={kind,x:.5,y:.5,angle:0,color:'#27211e',density:kind==='focus'?50:44};
  // 원고 폭(630) 기준으로 그려 줄여야 선 굵기가 실제와 같은 비율
  return `<span class="apv cut"${cutBg(src)}><svg viewBox="0 0 630 394" preserveAspectRatio="none" aria-hidden="true">${window.RoughMaterials?.lineEffect(eff,{x:0,y:0,w:630,h:394},rngL('pv'+kind))||''}</svg></span>`}
// 실제 전환처럼: 위 컷 바탕(흰색) → 중간색(멈춤 %) → 질감 시작색, 그 위에 질감 무늬
function bgTile(i,[a,b]=['','']){const P=i?PAGE_BACKGROUNDS[i]:null,tex=P?bgThumb(i):'<i class="bg0"></i>';
  const grad=P?` style="background:linear-gradient(#fff,${P.mid} ${P.stop}%,${P.start})"`:'';
  return `<span class="apv strip"><i class="c"${cutBg(a)}></i><span class="tx"${grad}>${tex}</span><i class="c"${cutBg(b)}${P?` data-on="${P.start}"`:''}></i></span>`}
const COLOR_NAMES={'#ffffff':'흰색','#111111':'검정','#1d2433':'밤','#5a2a22':'적갈색','#86c99c':'초록','#f3d9e0':'분홍','#101621':'밤','#0b0d12':'어둠','#7a1c1c':'빨강','#1c2c5a':'파랑','#a9cdf0':'하늘','#d9825b':'노을','#efe4d0':'베이지'};
const colorName=c=>COLOR_NAMES[String(c).toLowerCase()]||c;
function colorTile(c,src){return `<span class="apv onbg" style="background:${c}"><i class="c"${cutBg(src)}></i></span>`}
function overTile(src,inner,vb='0 0 160 100'){return `<span class="apv cut"${cutBg(src)}><svg viewBox="${vb}" aria-hidden="true">${inner}</svg></span>`}
// 타일 종류별 미리보기(최근 쓴 것 등에서도 같은 그림)
function tileFor(k,v){const s=selSrcs();if(k==='balloon')return balloonTile(v,sampleLine());if(k==='sfx')return sfxTile(v);if(k==='line')return lineTile(v,s[0]);if(k==='bg')return bgTile(+v,s);
  if(k==='color')return colorTile(v,s[0]);if(k==='bgimg'&&IMG.bg?.[v])return `<img src="${IMG.bg[v].src}" alt="">`;if(k==='seq')return '<i class="seqi"></i>';return ''}
// 효과음 타일 등: 그린 뒤 실제 그림 크기에 맞춰 보이는 범위를 좁힘
function fitTiles(root){root.querySelectorAll('svg.fit').forEach(svg=>{try{const b=svg.getBBox();if(b.width&&b.height){const m=Math.max(b.width,b.height)*.12;svg.setAttribute('viewBox',`${b.x-m} ${b.y-m} ${b.width+2*m} ${b.height+2*m}`)}}catch(_){}})}
function renderAssets(){if(!asBody.isConnected)return;renderTarget();const k=ASSET.tab;let h='';
  const grid=(t,items,cls='')=>items.length?`<h5>${t}</h5><div class="asgrid ${cls}">${items.join('')}</div>`:'';
  const sample=sampleLine(),srcs=selSrcs();
  const balloons=BALLOON_STYLES.filter(s=>match(s[1])).map(s=>item('balloon',s[0],s[1].split(' · ')[0],balloonTile(s[0],sample)));
  const words=[...new Set([...SFXW,...(typeof materialRows!=='undefined'?materialRows.map(r=>r.word):[])])];
  const sfxQuick=SFXW.filter(match).map(w=>item('sfx',w,w,sfxTile(w)));
  const bgs=PAGE_BACKGROUNDS.map((p,i)=>p&&match(p.name)?item('bg',i,p.name,bgTile(i,srcs)):'').filter(Boolean);
  const bimgs=Object.values(IMG.bg||{}).filter(r=>match(r.name||'배경 이미지')).map(r=>item('bgimg',r.id,r.name||'배경 이미지',`<img src="${r.src}" alt="">`));
  const lines=[];  // 효과선은 왼쪽 도구에서만
  if(k==='rec'){const p=selPanel();
    if(!p)h='<p class="as-empty">컷을 고르면 그 컷의 감정·샷·연출에 맞는 에셋을 골라 보여 줘요.</p>'+grid('최근 쓴 것',RECENT().filter(x=>match(x.label)).slice(0,8).map(x=>item(x.k,x.v,x.label,x.k==='pack'?packTile(x.v):tileFor(x.k,x.v))),'big');
    else{const emo=p.emo||'',hot=(p.i||0)>=2,act=String(p.act||''),lv=`${emo||'기본'}${p.i?` ${p.i}`:''}`;
      const ds=(p.dialogs||[]).map(d=>d.text).join('');
      const bgI=EMO_BG[emo]||1,bal=/!|！/.test(ds)?(hot?'torn':'charcoal'):/…|\.\.\./.test(p.said||'')?'hazy':'round-box';
      const balWhy=/!|！/.test(ds)?`대사에 느낌표 · ${hot?'센 강도':'보통 강도'}`:/…|\.\.\./.test(p.said||'')?'말줄임표 대사':'기본 대사';
      // 카드 = 고른 컷에 넣은 모습 + 왜 골랐는지
      const card=(k,v,label,pv,why)=>`<button class="asi rec" draggable="true" data-mat="${k}" data-v="${esc(String(v))}" data-label="${esc(label)}" title="${esc(label)}">${pv}<span>${esc(label)}</span><em class="why">${esc(why)} · 자동</em></button>`;
      const balPv=(()=>{const st=BALLOON_STYLES.find(x=>x[0]===bal);let body='';try{body=presetBalloon(st,0,0,46,22,1,rngL(bal),false).body}catch(_){}
        return overTile(srcs[0],`<g transform="translate(96 36)">${body}<text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="600" fill="#161616" font-family="Pretendard, sans-serif">${esc(sample)}</text></g>`)})();
      const recs=[card('bg',bgI,PAGE_BACKGROUNDS[bgI].name,bgTile(bgI,srcs),`${lv}에 어울리는 전환`)];
      recs.push(card('balloon',bal,(BALLOON_STYLES.find(s=>s[0]===bal)||['',''])[1].split(' · ')[0]+' 말풍선',balPv,balWhy));
      [...new Set([...(p.sfx||[]),...(EMO_SFX[emo]||[])])].slice(0,4).forEach(w=>{let g='';try{g=soundEffectSVG(w,{x:0,y:0,w:630,h:394,before:0},'left',1,null)}catch(_){}
        recs.push(card('sfx',w,w,`<span class="apv cut"${cutBg(srcs[0])}><svg viewBox="0 0 630 394" aria-hidden="true">${g}</svg></span>`,(p.sfx||[]).includes(w)?'글에 쓴 효과음':`${emo} 감정에 자주 씀`))});
      const refs=Object.values(typeof REF_PICK!=='undefined'?REF_PICK:{}).filter(r=>r.shot===p.shot&&(r.emotion===p.emo||r.angle===p.ang)).slice(0,6);
      h=`<p class="as-why">${esc([p.shot,p.ang,emo&&`${emo} ${p.i||0}`,p.vng==='P'&&'하이라이트'].filter(Boolean).join(' · '))} 기준 추천</p>`+grid('이 컷에 넣으면',recs,'recs')+
        grid('비슷한 컷 참고',refs.map(r=>`<button class="asi ref" draggable="true" data-ref-id="${esc(r.source_cut)}" title="${esc(r.label||r.source_cut)}"><img src="${r.thumb||cutThumb(r.source_cut)||r.src}" alt="" loading="lazy"><span>${esc(r.source_cut)}</span></button>`),'refs')+
        grid('저장한 시퀀스',seqList().map((t,i)=>item('seq',i,`${t.name} · ${t.cuts.length}컷`,'<i class="seqi"></i>')))}}
  else if(k==='balloon')h=grid('말풍선 형태',balloons,'big')+'<p class="as-note">말풍선을 고른 상태에서 누르면 형태가 바뀌고, 컷을 고른 상태면 새로 넣어요. 컷 위로 끌어 놓으면 그 자리에.</p>';
  else if(k==='sfx'){const cats=[...new Set((materialRows||[]).map(r=>r.category))];
    h=`<div class="sfxbar"><input id="sfxq" type="search" placeholder="효과음 검색 (글자·분류)" value="${esc(SFXQ.q)}" aria-label="효과음 검색">`+
      (cats.length?`<select id="sfxcat" aria-label="분류"><option value="">모든 분류</option>${cats.map(c=>`<option${c===SFXQ.cat?' selected':''}>${esc(c)}</option>`).join('')}</select>`:'')+`</div>`+
      `<div class="sfxtype" role="radiogroup" aria-label="레터링 타입">${SFX_TYPES.map(([t,n])=>`<button role="radio" data-sfxtype="${t}" aria-checked="${t===SFX_TYPE}"><b>${t}</b>${n}</button>`).join('')}</div><div id="sfxgrid"></div>`}
  else if(k==='line')h=grid('효과선',lines,'big')+'<p class="as-note">누르면 고른 컷에 효과선을 넣을 준비가 돼요. 컷 안 중심이 될 곳을 눌러 주세요. 세부(색·밀도)는 속성 서랍에서.</p>';
  else if(k==='bg'){const colors=[...new Set(SCENES.flatMap(sc=>(sc.pageEdits||[]).map(e=>e?.background).filter(c=>/^#/.test(c||''))))].slice(0,10).concat(['#ffffff','#111111','#1d2433','#5a2a22','#86c99c','#f3d9e0']);
    h=grid('컷 아래 전환 질감 · 위 컷 → 질감 → 아래 컷',[item('bg',0,'기본 · 질감 없음',bgTile(0,srcs)),...bgs],'strips')+grid('배경색 (컷 바탕)',[...new Set(colors)].filter(c=>match(c)||match(colorName(c))).map(c=>item('color',c,colorName(c),colorTile(c,srcs[0]))),'tints')+
      grid('배경 이미지',bimgs)+'<p class="as-note">컷을 고른 상태에서 누르면 그 컷 아래 전환에, 컷 사이 간격으로 끌어 놓으면 그 자리에 들어가요. 중간색·위치·씬 끝 색은 속성 서랍에서.</p><div class="as-acts"><button class="btn sm" data-as="bgup">+ 배경 이미지 올리기</button></div>'}
  else if(k==='seq'){const L=seqList().filter(t=>match(t.name));h=L.length?grid('저장한 시퀀스',L.map(t=>item('seq',seqList().indexOf(t),`${t.name} · ${t.cuts.length}컷`,'<i class="seqi"></i>'))):'<p class="as-empty">저장한 시퀀스가 없어요.</p>';
    h+='<p class="as-note">컷을 고르고 누르면 그 컷부터 적용해요. 저장은 시작할 컷을 고른 뒤 속성 서랍 › 시퀀스 템플릿 › 이 컷부터 저장.</p><div class="as-acts"><button class="btn sm" data-as="seqsave">고른 컷부터 저장…</button></div>'}
  else if(k==='up')h=grid('올린 배경 이미지',bimgs)+`<div class="as-acts"><button class="btn sm" data-as="bgup">+ 배경 이미지</button><button class="btn sm" data-as="zip">효과음 ZIP 불러오기</button><button class="btn sm" data-as="cutup">컷 그림 등록 (콘티)</button></div><p class="as-note">올린 파일은 이 브라우저에 남고 작업 파일(.rough.json)에도 들어가요.</p>`;
  else if(k==='star'){const packFav=typeof materialFavorites!=='undefined'?[...materialFavorites].filter(id=>!FAVS.some(f=>f.k==='pack'&&f.v===id)).map(id=>({k:'pack',v:id,label:materialCatalog.entry(id)?.word||id})):[];
    const all=[...FAVS,...packFav].filter(x=>match(x.label)),of=ks=>all.filter(x=>ks.includes(x.k));
    const tile=x=>item(x.k,x.v,x.label,x.k==='pack'?packTile(x.v):tileFor(x.k,x.v));
    h=all.length?grid('말풍선',of(['balloon']).map(tile),'big')+grid('효과음',of(['sfx','pack']).map(tile),'sfxs')+
      grid('배경',of(['bg']).map(tile),'strips')+grid('배경색',of(['color']).map(tile),'tints')+grid('배경 이미지·시퀀스',of(['bgimg','seq']).map(tile)):
      '<p class="as-empty">타일 오른쪽 위 ★를 누르면 여기 모여요.</p>';
    h+=grid('최근 쓴 것',RECENT().filter(x=>match(x.label)).map(x=>item(x.k,x.v,x.label,x.k==='pack'?packTile(x.v):tileFor(x.k,x.v))),'big')}
  asBody.innerHTML=h||'<p class="as-empty">찾는 에셋이 없어요.</p>';if(k==='sfx')renderSfxGrid();fitTiles(asBody);
  // ★·추천에 있는 소재 효과음 그림이 아직 안 풀렸으면 그것만 풀고 다시
  if(k!=='sfx'&&typeof materialCatalog!=='undefined'){const miss=[...asBody.querySelectorAll('[data-mat="pack"]')].map(b=>materialCatalog.entry(b.dataset.v)).filter(e=>e&&!materialCatalog.image(e,SFX_TYPE));
    if(miss.length)sfxLoad(miss).then(()=>{if(ASSET.tab===k)renderAssets()})}}
// 적용: 클릭은 고른 대상에, 끌어 놓기는 놓은 자리에
function cutCenter(g){try{const f=JSON.parse(g.dataset.frame);return {x:f.x+f.w/2,y:f.y+f.h*.35}}catch(_){return {x:345,y:200}}}
// 빈자리: 컷 안 후보 자리(3×4) 중 이미 있는 식자와 가장 덜 겹치는 곳(같으면 위·가운데 우선). 새 식자 크기는 컷 폭 38% × 높이 20%로 어림
function freeSpot(g,size,skip){let f;try{f=JSON.parse(g.dataset.frame)}catch(_){return cutCenter(g)}const svg=g.ownerSVGElement,m=svg.getScreenCTM().inverse();
  const boxes=[...g.querySelectorAll('[data-letter]')].filter(L=>L!==skip).map(L=>{const r=(L.querySelector('[data-balloon]')||L).getBoundingClientRect(),a=new DOMPoint(r.left,r.top).matrixTransform(m),b=new DOMPoint(r.right,r.bottom).matrixTransform(m);return [a.x,a.y,b.x,b.y]});
  const w=size?.w||f.w*.38,h=size?.h||Math.max(60,f.h*.2),cands=[];for(const fy of [.2,.4,.6,.8])for(const fx of [.3,.5,.7])cands.push({x:f.x+f.w*fx,y:f.y+f.h*fy,pri:Math.abs(fx-.5)+fy*.6});
  const ov=c=>boxes.reduce((s,[x1,y1,x2,y2])=>s+Math.max(0,Math.min(x2,c.x+w/2)-Math.max(x1,c.x-w/2))*Math.max(0,Math.min(y2,c.y+h/2)-Math.max(y1,c.y-h/2)),0);
  // 화면에 보이는 부분 우선(겹침이 같을 때) — 넣자마자 보이게
  const M=svg.getScreenCTM(),vis=c=>{const y=new DOMPoint(c.x,c.y).matrixTransform(M).y;return y>210&&y<innerHeight-40?0:1};
  cands.sort((a,b)=>ov(a)-ov(b)||vis(a)-vis(b)||a.pri-b.pri);return {x:cands[0].x,y:cands[0].y}}
// 컷을 고르지 않았으면 지금 화면 가운데에 보이는 컷
function visibleCut(){const c=document.querySelector('.edcanvas')?.getBoundingClientRect();if(!c)return null;const y=Math.max(c.top,200)+(Math.min(c.bottom,innerHeight)-Math.max(c.top,200))/2;
  let best=null,bd=1e9;reader.querySelectorAll(':scope>section [data-slot-index]').forEach(g=>{const r=g.getBoundingClientRect(),d=y<r.top?r.top-y:y>r.bottom?y-r.bottom:0;if(d<bd){bd=d;best=g}});return best}
// 소재 효과음을 고른 타입(A~D)으로 넣기
// 고른 효과음이 있으면 새로 넣지 않고 그 자리에서 바꿈(위치·크기·회전 그대로). 글에서 온 효과음(-쾅-)은 컷 글의 그 낱말을, 소재 효과음은 소재 목록을 바꿈
function selSfx(){const L=selectedLetter;return L&&/^(effect-|material-)/.test(L.dataset.letter)?L:null}
function swapSfx(L,word,variant){const g=L.closest('[data-slot-index]'),key=pageKey(g),id=L.dataset.letter,old=(L.dataset.letterText||'').trim();
  if(isLocked(g,id)){flash('잠긴 효과음이에요');return false}
  if(id.startsWith('material-')){const set=pageSettings(true,key),it=(set.materialSounds||[]).find(x=>'material-'+x.id===id);if(!it)return false;it.text=word}
  else{const n=+id.split('-')[1],[si,slot]=key.split(':').map(Number),sc=SCENES[si];let k=-1,done=false;
    sc.cuts[slot]=String(sc.cuts[slot]||'').replace(/(-{1,3})([^\-\n]+?)(-{1,3})/g,(m,a,w,b)=>{k++;if(!done&&k===n&&w.trim()===old){done=true;return a+word+b}return m});
    if(!done){flash('이 효과음은 글에서 바꿀 수 없어요');return false}if(si===SCUR)CUTS=sc.cuts}
  withKey(key,()=>{const st=pageSettings(true);const o={...st.letters?.[id]};if(variant&&variant!=='A')o.materialVariant=variant;else delete o.materialVariant;(st.letters||={})[id]=o});
  saveScenes();refreshText(+key.split(':')[0]);const L2=groupBy(key)?.querySelector(`[data-letter="${CSS.escape(id)}"]`);if(L2)selectLetter(L2);flash(`효과음을 「${word}」(으)로 바꿨어요 · Ctrl+Z로 되돌리기`);return true}
async function addPack(id,g){const entry=materialCatalog.entry(id),key=pageKey(g);if(!entry)return;
  try{await materialCatalog.load(entry,SFX_TYPE)}catch(_){flash('효과음 이미지를 불러오지 못했어요');return}
  const set=pageSettings(true,key),mid=crypto.randomUUID();(set.materialSounds||=[]).push({id:mid,text:entry.word});
  if(SFX_TYPE!=='A')(set.letters||={})['material-'+mid]={...(set.letters?.['material-'+mid]||{}),materialVariant:SFX_TYPE};
  saveScenes();renderWebtoon();let L=reader.querySelector(`[data-letter="material-${mid}"]`);
  if(L){const gg=L.closest('[data-slot-index]'),sp=freeSpot(gg),svg=gg.ownerSVGElement,r=L.getBoundingClientRect(),c=new DOMPoint(r.left+r.width/2,r.top+r.height/2).matrixTransform(svg.getScreenCTM().inverse()),cur=letterPosition(L),pos={x:Math.round((cur.x||0)+sp.x-c.x),y:Math.round((cur.y||0)+sp.y-c.y)};moveLetter(L,pos);saveLetter(L,pos);L=reader.querySelector(`[data-letter="material-${mid}"]`)}
  if(L)selectLetter(L);
  flash(`${entry.word} · ${SFX_TYPES.find(t=>t[0]===SFX_TYPE)[1]} 효과음을 넣었어요`)}
function applyAsset(k,v,g,pt,target){const label=asBody.querySelector(`[data-mat="${k}"][data-v="${CSS.escape(String(v))}"]`)?.dataset.label||String(v);
  g=g||(pageSelection?selGroup():null);
  // 고른 식자가 없고 컷도 안 골랐으면 화면 가운데 컷에 · 누르기로 넣을 땐 빈자리에(끌어 놓으면 놓은 자리)
  const swapping=(k==='balloon'&&selectedLetter?.dataset.letter?.startsWith('dialog-'))||((k==='sfx'||k==='pack')&&selSfx());
  if(!g&&!swapping&&(k==='balloon'||k==='sfx'||k==='pack')){g=visibleCut();if(g)selectPageCut(g)}
  if(g&&!pt&&!swapping&&(k==='balloon'||k==='sfx'))pt={auto:true,...cutCenter(g)};
  if(k==='balloon'||k==='sfx'||k==='line'){if(k==='balloon'&&!g&&selectedLetter){const sg=selectedLetter.closest('[data-slot-index]');useMat('balloon',v,sg,cutCenter(sg),selectedLetter)}else useMat(k,v,g,pt||(g?cutCenter(g):null),target||(k==='balloon'?selectedLetter:null));remember(k,v,label);return}
  if(!g&&k==='pack'&&selSfx())g=selSfx().closest('[data-slot-index]');
  if(!g){flash('먼저 컷을 고르거나, 캔버스의 컷으로 끌어다 놓아요');return}
  if(g&&pageKey(g)!==pageSelection)selectPageCut(g);
  if(k==='bg'){const e=pageSettings(true);if(+v)e.transition=+v;else delete e.transition;saveScenes();renderWebtoon();flash('전환 질감을 넣었어요')}
  else if(k==='color'){pageSettings(true).background=v;saveScenes();renderWebtoon();flash('배경색을 바꿨어요')}
  else if(k==='bgimg'){const e=pageSettings(true);e.bgImage=v;saveScenes();renderWebtoon();flash('배경 이미지를 넣었어요')}
  else if(k==='pack'){const L=selSfx(),entry=materialCatalog.entry(v);if(L&&entry){materialCatalog.load(entry,SFX_TYPE).then(()=>swapSfx(L,entry.word,SFX_TYPE)).catch(()=>flash('효과음 이미지를 불러오지 못했어요'))}else addPack(v,g);remember(k,v,label);return}
  else if(k==='seq'){$('#wtplsel').value=v;$('#wtplapply').click()}
  remember(k,v,label);if(typeof refreshBackgroundTools==='function'&&pageSelection)refreshBackgroundTools()}
assetBody.addEventListener('click',e=>{const t=e.target;
  const fv=t.closest('[data-fav]');if(fv){e.preventDefault();e.stopPropagation();const b=fv.closest('[data-mat]');if(!b)return;const on=toggleFav(b.dataset.mat,b.dataset.v,b.dataset.label);
    asBody.querySelectorAll(`[data-mat="${b.dataset.mat}"][data-v="${CSS.escape(b.dataset.v)}"] [data-fav]`).forEach(x=>x.classList.toggle('on',on));flash(on?'즐겨찾기에 넣었어요 · ★ 탭에서 모아 봐요':'즐겨찾기에서 뺐어요');if(ASSET.tab==='star')renderAssets();return}
  const ty=t.closest('[data-sfxtype]');if(ty){SFX_TYPE=ty.dataset.sfxtype;SS('rough-sfx-type',SFX_TYPE);asBody.querySelectorAll('[data-sfxtype]').forEach(x=>x.setAttribute('aria-checked',x===ty));renderSfxGrid();return}
  const tb=t.closest('[data-at]');if(tb){assetTab(tb.dataset.at,true);return}
  const r=t.closest('[data-ref-id]');if(r&&asBody.contains(r)){if(pageSelection)RoughRefs.apply(r.dataset.refId);else flash('레퍼런스를 바꿀 컷을 먼저 고르세요');return}
  const a=t.closest('[data-as]')?.dataset.as;
  if(a==='zip')$('#wmaterial-import').click();
  if(a==='cutup')showView('layout');
  if(a==='seqsave'){if(!pageSelection){flash('시작할 컷을 먼저 고르세요');return}$('#wtplsave').click();setTimeout(renderAssets,300)}
  if(a==='bgup'){const f=document.createElement('input');f.type='file';f.accept='image/*';f.multiple=true;f.onchange=async()=>{for(const file of f.files){const im=await shrink(file,1380);const o={id:'bg:'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:'bgimg',name:file.name,src:im.src,w:im.w,h:im.h,at:Date.now()};IMG.bg[o.id]=o;await idb.put(o)}renderAssets();flash('배경 이미지를 올렸어요')};f.click()}
  const b=t.closest('[data-mat]');if(b&&asBody.contains(b))applyAsset(b.dataset.mat,b.dataset.v)});
assetBody.addEventListener('input',e=>{if(e.target.id==='sfxq'){SFXQ.q=e.target.value.trim();clearTimeout(renderSfxGrid.t);renderSfxGrid.t=setTimeout(renderSfxGrid,120);return}if(e.target.id!=='asq')return;ASSET.q=e.target.value.trim();if(ASSET.tab==='ref'){const q=$('#rfq');if(q){q.value=ASSET.q;q.dispatchEvent(new Event('input',{bubbles:true}))}}else{clearTimeout(renderAssets.t);renderAssets.t=setTimeout(renderAssets,150)}});
assetBody.addEventListener('change',e=>{if(e.target.id==='sfxcat'){SFXQ.cat=e.target.value;renderSfxGrid()}});
assetBody.addEventListener('dragstart',e=>{const b=e.target.closest('[data-mat]');if(!b||!asBody.contains(b))return;e.dataTransfer.setData('application/x-rough-mat',JSON.stringify({k:b.dataset.mat,v:b.dataset.v}));e.dataTransfer.effectAllowed='copy'});
// 컷 사이 간격으로 끌어 놓기 → 그 위 컷의 아래 전환
reader.addEventListener('dragover',e=>{if(!e.dataTransfer.types.includes('application/x-rough-mat'))return;const gap=e.target.closest('[data-page-gap]');if(gap){e.preventDefault();e.dataTransfer.dropEffect='copy';reader.querySelectorAll('.gap-drop').forEach(x=>x!==gap&&x.classList.remove('gap-drop'));gap.classList.add('gap-drop')}},true);
reader.addEventListener('drop',e=>{reader.querySelectorAll('.gap-drop').forEach(x=>x.classList.remove('gap-drop'));const raw=e.dataTransfer.getData('application/x-rough-mat');if(!raw)return;const {k,v}=JSON.parse(raw);
  const gap=e.target.closest('[data-page-gap]'),g0=e.target.closest('[data-slot-index]');
  if(gap){e.preventDefault();e.stopPropagation();const si=gap.closest('section').dataset.pageScene,g=groups().find(x=>pageKey(x)===`${si}:${gap.dataset.slot}`);if(g)applyAsset(k,v,g);return}
  if(g0&&['bg','color','bgimg','pack','seq'].includes(k)){e.preventDefault();e.stopPropagation();applyAsset(k,v,g0)}},true);
// 고른 대상에 따라 탭 바꾸기(사용자가 탭을 직접 고르기 전까지)
function autoTab(){renderTarget();if(!ASSET.auto)return;const want=selectedLetter&&/^(dialog|caption)/.test(selectedLetter.dataset.letter)?'balloon':selectedLetter?'sfx':'rec';if(want!==ASSET.tab)assetTab(want);else if(want==='rec')renderAssets()}
// 고르기는 바로 보이게, 에셋 패널은 화면을 한 번 그린 뒤에(한 번 클릭에 여러 번 불려도 한 번만)
let atPend=false;function autoTabSoon(){if(atPend)return;atPend=true;requestAnimationFrame(()=>setTimeout(()=>{atPend=false;autoTab()},0))}
{const _sc=selectPageCut;selectPageCut=function(...a){const r=_sc(...a);autoTabSoon();return r}}
{const _sl=selectLetter;selectLetter=function(...a){const r=_sl(...a);autoTabSoon();return r}}
if(LS('rough-ws-drawer',false))setTimeout(()=>setDrawer(true),0);if(LS('rough-ws-mini',false))miniWrap.hidden=false;

// ---------- Delete·Backspace로 지우기 ----------
// 말풍선·나레이션·효과음은 원고(컷 글)의 해당 줄을 지우고, 뒤쪽 식자의 배치값 번호를 한 칸씩 당김. 컷을 고른 상태면 컷을 지움. 모두 Ctrl+Z로 되돌림
const SFX_RE=/(^|\s)(-{1,3})([^\s-][^-\n]{0,10}?)\2(?=\s|$|[.,!?])/g;  // 엔진과 같은 규칙(--크게--)
const DIRS_RE=/\{[^{}\n]{1,80}\}/g;
const DLG_RE=/^(?:@([^\s"“]+)\s*)?["“](.*)["”]\s*[.!?…]*$/;
function dropFromText(text,kind,n){const lines=String(text||'').split('\n');let c=-1,done=false;
  if(kind==='effect'){for(let i=0;i<lines.length&&!done;i++)lines[i]=lines[i].replace(SFX_RE,(m,a)=>{if(done)return m;c++;if(c===n){done=true;return a}return m});
    return done?lines.map(l=>l.replace(/\s{2,}/g,' ').replace(/\s+$/,'')).filter((l,i)=>l.trim()||!lines[i].trim()).join('\n'):null}
  for(let i=0;i<lines.length;i++){const bare=lines[i].replace(DIRS_RE,' ').replace(SFX_RE,'$1').replace(/\s{2,}/g,' ').trim();if(!bare)continue;
    const hit=kind==='caption'?/^\[(.+)\]$/.test(bare):kind==='dialog'?DLG_RE.test(bare):false;if(!hit)continue;c++;
    if(c===n){const keep=[...[...lines[i].matchAll(SFX_RE)].map(m=>m[2]+m[3]+m[2]),...(lines[i].match(DIRS_RE)||[]).map(d=>kind!=='dialog'?d:(x=>x.length?`{${x.join(', ')}}`:'')(d.slice(1,-1).split(/[,，·\/]/).map(t=>t.trim()).filter(t=>t&&!RoughGrammar.styleOf(t)))).filter(Boolean)].join(' ');if(keep)lines[i]=keep;else lines.splice(i,1);return lines.join('\n')}}
  return null}
const kindOfKey=k=>{let m;if(k==='caption')return['caption',0];if(m=k.match(/^(dialog|caption|effect)-(\d+)$/))return[m[1],+m[2]];return null};
function shiftLetters(settings,kind,n){const L=settings?.letters;if(!L)return;const name=i=>kind==='caption'&&i===0?'caption':`${kind}-${i}`;
  delete L[name(n)];for(let i=n+1;i<60;i++){if(L[name(i)]!==undefined){L[name(i-1)]=L[name(i)];delete L[name(i)]}}
  const lk=settings.lock?.letters;if(lk){delete lk[name(n)];for(let i=n+1;i<60;i++)if(lk[name(i)]!==undefined){lk[name(i-1)]=lk[name(i)];delete lk[name(i)]}}}
function deleteLetterEls(els){const jobs=[];let locked=0;
  for(const L of els){const g=L.closest('[data-slot-index]');if(!g)continue;const lk=L.dataset.letter;if(isLocked(g,lk)){locked++;continue}jobs.push({key:pageKey(g),lk})}
  // 같은 컷·같은 종류는 뒤 번호부터 지워야 앞 번호가 안 밀림
  jobs.sort((a,b)=>a.key.localeCompare(b.key)||((kindOfKey(b.lk)||[,0])[1]-(kindOfKey(a.lk)||[,0])[1]));let n=0;const touched=new Set();
  for(const j of jobs){const [si,slot]=j.key.split(':').map(Number),sc=SCENES[si];const settings=withKey(j.key,()=>pageSettings(true));
    if(j.lk.startsWith('material-')){const id=j.lk.slice(9);settings.materialSounds=(settings.materialSounds||[]).filter(x=>x.id!==id);if(settings.letters)delete settings.letters[j.lk];n++;touched.add(si);continue}
    const kk=kindOfKey(j.lk);if(!kk)continue;const t=dropFromText(sc.cuts[slot],kk[0],kk[1]);if(t===null)continue;
    sc.cuts[slot]=t;shiftLetters(settings,kk[0],kk[1]);n++;touched.add(si)}
  if(!n){flash(locked?'잠긴 식자라 지우지 않았어요':'지울 수 있는 식자가 아니에요');return}
  MULTI.clear();selectLetter(null);touched.forEach(si=>{if(si===SCUR)CUTS=SCENES[si].cuts;refreshText(si)});
  flash(`식자 ${n}개를 지웠어요${locked?` · 잠긴 ${locked}개는 그대로`:''} · Ctrl+Z로 되돌리기`)}
function deleteCut(key){const [si,slot]=key.split(':').map(Number),sc=SCENES[si],g=groupBy(key);if(g&&isLocked(g,'cut')){flash('잠긴 컷이에요');return}
  const len=sc.cuts.length;if(len<=1){flash('씬의 마지막 컷은 지울 수 없어요');return}
  const label=pageCut.selectedOptions[0]?.textContent||'컷';
  remapCuts(si,()=>{sc.cuts.splice(slot,1);if(sc.pageEdits.length>slot)sc.pageEdits.splice(slot,1);return moveMap(len,x=>x===slot?-1:x>slot?x-1:x)});
  if(si===SCUR)CUTS=sc.cuts;pageSelection=null;refreshText(si);flash(`${label}을 지웠어요 · Ctrl+Z로 되돌리기`)}
document.addEventListener('keydown',e=>{if(!inEdit()||(e.key!=='Delete'&&e.key!=='Backspace'))return;if(typing(e.target)||document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey)return;
  if(MULTI.size>1){e.preventDefault();deleteLetterEls([...MULTI].map(k=>{const [key,lk]=k.split('|');return groupBy(key)?.querySelector(`[data-letter="${CSS.escape(lk)}"]`)}).filter(Boolean));return}
  if(selectedLetter){e.preventDefault();deleteLetterEls([selectedLetter]);return}
  const lp=window.layerPart;if(pageSelection&&lp&&lp.key===pageSelection&&lp.what==='art'){e.preventDefault();deleteArt(pageSelection);return}
  if(pageSelection){e.preventDefault();deleteCut(pageSelection)}});
// 레이어 패널의 '그림' 줄을 고르고 Delete: 컷은 두고 넣은 그림만 뺌(Ctrl+Z로 되돌림). 레퍼런스만 있으면 지울 것이 없음
function deleteArt(key){const [si,slot]=key.split(':').map(Number),g=groupBy(key);if(g&&isLocked(g,'cut')){flash('잠긴 컷이에요');return}
  const id=cutId(SCENES[si].id,slot);if(!IMG.cut[id]){flash('이 컷은 레퍼런스만 보여 줘서 뺄 그림이 없어요 · 컷을 지우려면 \'칸\'을 고르고 Delete');return}
  edSnap=edState();edLast=0;  // 그림 넣기는 기록을 안 남기므로 지금 상태를 기준으로 잡아야 Ctrl+Z가 그림을 되살림
  delete IMG.cut[id];idb.del(id);saveScenes();renderWebtoon();const ng=groupBy(key);if(ng)selectPageCut(ng);window.layerPart={key,what:'art'};flash('넣은 그림을 뺐어요 · Ctrl+Z로 되돌리기')}

// ---------- 오른쪽 클릭 메뉴(클립스튜디오·포토샵·피그마 방식) ----------
// 누른 대상(식자 · 여러 식자 · 컷 · 컷 사이 · 빈 곳)을 먼저 고르고, 그 대상에 맞는 메뉴를 그 자리에. 하위 메뉴 ▸, 단축키 표시, 방향키·Enter·Esc
const cm=mk('cmenu');cm.setAttribute('role','menu');cm.hidden=true;document.body.appendChild(cm);let cmStack=[];
const SEP={sep:1};
function cmBuild(items){const box=mk('cmenu-box');box.setAttribute('role','menu');
  box.innerHTML=items.filter(Boolean).map((it,i)=>it.sep?'<div class="cm-sep" role="separator"></div>':
    `<button role="menuitem" data-ci="${i}"${it.disabled?' disabled':''}${it.sub?' aria-haspopup="true"':''}${it.danger?' class="danger"':''}><span class="cm-l">${it.check!==undefined?`<i class="cm-c">${it.check?'✓':''}</i>`:''}${it.thumb!==undefined?(it.thumb?`<img class="cm-th" src="${esc(it.thumb)}" alt="">`:'<span class="cm-th"></span>'):''}${esc(it.label)}${it.note?`<small class="cm-n">${esc(it.note)}</small>`:''}</span>${it.key?`<kbd>${esc(it.key)}</kbd>`:''}${it.sub?'<i class="cm-a">▸</i>':''}</button>`).join('');
  box._items=items.filter(Boolean);return box}
function cmOpen(items,x,y,level=0){cmStack.slice(level).forEach(b=>b.remove());cmStack=cmStack.slice(0,level);
  const box=cmBuild(items);cm.appendChild(box);cm.hidden=false;cmStack.push(box);
  const r=box.getBoundingClientRect(),W=innerWidth,H=innerHeight;let L=x,T=y;
  if(L+r.width>W-6)L=level?Math.max(6,x-r.width-(cmStack[level-1]?.getBoundingClientRect().width||0)):W-r.width-6;if(T+r.height>H-6)T=Math.max(6,H-r.height-6);
  box.style.left=L+'px';box.style.top=T+'px';(box.querySelector('button:not([disabled])'))?.focus();return box}
function cmClose(){cm.hidden=true;cm.innerHTML='';cmStack=[]}
cm.addEventListener('click',e=>{const b=e.target.closest('button[data-ci]');if(!b)return;const box=b.closest('.cmenu-box'),it=box._items[+b.dataset.ci];
  if(it.sub){const r=b.getBoundingClientRect();cmOpen(it.sub(),r.right-2,r.top-4,cmStack.indexOf(box)+1);return}cmClose();it.run?.()});
cm.addEventListener('pointerover',e=>{const b=e.target.closest('button[data-ci]');if(!b)return;const box=b.closest('.cmenu-box'),lv=cmStack.indexOf(box),it=box._items[+b.dataset.ci];
  clearTimeout(cm._t);cm._t=setTimeout(()=>{if(it.sub){const r=b.getBoundingClientRect();cmOpen(it.sub(),r.right-2,r.top-4,lv+1);b.focus()}else{cmStack.slice(lv+1).forEach(x=>x.remove());cmStack=cmStack.slice(0,lv+1)}},140)});
cm.addEventListener('keydown',e=>{const box=e.target.closest('.cmenu-box');if(!box)return;const bs=[...box.querySelectorAll('button:not([disabled])')],i=bs.indexOf(document.activeElement),lv=cmStack.indexOf(box);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]?.focus()}
  else if(e.key==='ArrowRight'){const it=box._items[+document.activeElement?.dataset.ci];if(it?.sub){e.preventDefault();document.activeElement.click()}}
  else if(e.key==='ArrowLeft'&&lv>0){e.preventDefault();const parent=cmStack[lv-1];box.remove();cmStack=cmStack.slice(0,lv);parent.querySelector('[aria-haspopup]:focus,[aria-haspopup]')?.focus()}
  else if(e.key==='Escape'){e.preventDefault();cmClose()}
  else if(e.key==='Tab'){e.preventDefault()}});
document.addEventListener('pointerdown',e=>{if(!cm.hidden&&!cm.contains(e.target))cmClose()},true);
addEventListener('blur',cmClose);addEventListener('resize',cmClose);document.addEventListener('scroll',()=>{if(!cm.hidden)cmClose()},true);
const K=id=>KEYS[id]||'';
// 컷 넣기·복제·옮기기(이미지·편집값이 함께 움직이게 remapCuts 사용)
function insertCut(key,after,copy,text){const [si,slot]=key.split(':').map(Number),sc=SCENES[si],len=sc.cuts.length,at=slot+(after?1:0);
  remapCuts(si,()=>{sc.cuts.splice(at,0,copy?sc.cuts[slot]:(text||'(새 컷) 장면을 적어 주세요'));if(sc.pageEdits.length>at||copy)sc.pageEdits.splice(at,0,copy&&sc.pageEdits[slot]?structuredClone(sc.pageEdits[slot]):null);return moveMap(len,x=>x>=at?x+1:x)});
  if(si===SCUR)CUTS=sc.cuts;refreshText(si);const g=groupBy(`${si}:${at}`);if(g){selectPageCut(g);g.scrollIntoView({block:'center',behavior:'smooth'})}
  flash(copy?'컷을 복제했어요 · 그림은 복제되지 않아요':'새 컷을 넣었어요 · Ctrl+Z로 되돌리기')}
function moveCutBy(key,d){const [si,slot]=key.split(':').map(Number),sc=SCENES[si],j=slot+d,len=sc.cuts.length;if(j<0||j>=len)return;
  remapCuts(si,()=>{[sc.cuts[slot],sc.cuts[j]]=[sc.cuts[j],sc.cuts[slot]];while(sc.pageEdits.length<=Math.max(slot,j))sc.pageEdits.push(null);[sc.pageEdits[slot],sc.pageEdits[j]]=[sc.pageEdits[j],sc.pageEdits[slot]];return moveMap(len,x=>x===slot?j:x===j?slot:x)});
  if(si===SCUR)CUTS=sc.cuts;refreshText(si);const g=groupBy(`${si}:${j}`);if(g)selectPageCut(g)}
const setGap=(key,v)=>{const s=withKey(key,()=>pageSettings(true));if(v==null)delete s.gap;else s.gap=v;saveScenes();renderWebtoon()};
const bgSub=g=>()=>[{label:'기본(질감 없음)',run:()=>applyAsset('bg',0,g)},...PAGE_BACKGROUNDS.map((p,i)=>p&&{label:p.name,run:()=>applyAsset('bg',i,g)}).filter(Boolean)];
function letterMenu(L,g,pt){const lk=L.dataset.letter,key=pageKey(g),isD=/^dialog/.test(lk),isC=/^caption/.test(lk),locked=isLocked(g,lk);
  const tailOn=!!L.querySelector('[data-tail-handle]');
  const sel=()=>{selectPageCut(g);selectLetter(L)};
  return [{label:'문구 고치기',key:'Enter · 더블클릭',run:()=>{sel();openInlineText(L)}},
    {label:'복사',key:'Ctrl+C',run:()=>{sel();RoughClip.copy()}},{label:'복제',key:'Ctrl+D',run:()=>{sel();RoughClip.dup()}},
    {label:'겹침 순서',sub:()=>[{label:'맨 앞으로',key:'Ctrl+Shift+]',run:()=>{sel();RoughOrder.zMove('front')}},{label:'앞으로',key:'Ctrl+]',run:()=>{sel();RoughOrder.zMove('up')}},{label:'뒤로',key:'Ctrl+[',run:()=>{sel();RoughOrder.zMove('down')}},{label:'맨 뒤로',key:'Ctrl+Shift+[',run:()=>{sel();RoughOrder.zMove('back')}}]},
    {label:'회전 없애기',disabled:!withKey(key,()=>pageSettings()?.letters?.[lk]?.rot),run:()=>{withKey(key,()=>{const s=pageSettings(true);const o={...s.letters?.[lk]};delete o.rot;s.letters[lk]=o});saveScenes();renderWebtoon()}},SEP,
    isD&&{label:'형태',sub:()=>BALLOON_STYLES.map(s=>({label:s[1],run:()=>useMat('balloon',s[0],g,pt,L)}))},
    isD&&{label:'꼬리 보이기',check:tailOn,run:()=>{withKey(key,()=>{const s=pageSettings(true);(s.letters||={})[lk]={...(s.letters[lk]||{}),showTail:!tailOn}});saveScenes();renderWebtoon()}},
    {label:'위치·크기 처음대로',run:()=>{withKey(key,()=>{const s=pageSettings(true),e=s.letters?.[lk];if(e){const t=e.text;s.letters[lk]=t!==undefined?{text:t}:{}}});saveScenes();renderWebtoon();flash('식자 배치를 처음대로 돌렸어요')}},
    SEP,{label:locked?'잠금 풀기':'잠그기',run:()=>toggleLock(key,lk)},
    SEP,{label:`${isD?'말풍선':isC?'나레이션':'효과음'} 지우기`,key:'Del',danger:1,disabled:locked,run:()=>deleteLetterEls([L])}]}
function multiMenu(){const els=[...MULTI].map(k=>{const [key,lk]=k.split('|');return groupBy(key)?.querySelector(`[data-letter="${CSS.escape(lk)}"]`)}).filter(Boolean);
  return [{label:`식자 ${els.length}개 정렬`,sub:()=>[['left','왼쪽'],['hcenter','가로 가운데'],['right','오른쪽'],['top','위'],['vcenter','세로 가운데'],['bottom','아래'],['vdist','세로 간격 고르게'],['hdist','가로 간격 고르게']].map(([k,n])=>({label:n,run:()=>alignLetters(k)}))},
    {label:'선택 풀기',key:'Esc',run:clearMulti},SEP,{label:`식자 ${els.length}개 지우기`,key:'Del',danger:1,run:()=>deleteLetterEls(els)}]}
function cutMenu(g,pt){const key=pageKey(g),[si,slot]=key.split(':').map(Number),locked=isLocked(g,'cut'),len=SCENES[si].cuts.length;
  return [{label:'여기에 나레이션',key:K('caption'),disabled:locked,run:()=>addLetter('caption',g,pt)},
    {label:'여기에 효과음',sub:()=>[...SFXW.map(w=>({label:w,run:()=>addLetter('sfx',g,pt,{text:w})})),{label:'효과음 소재 더 보기…',run:()=>{selectPageCut(g);assetTab('sfx',true)}}]},
    SEP,
    {label:'그림 편집(확대·이동)',key:'더블클릭',run:()=>{selectPageCut(g);RoughStudio.setCrop(g)}},
    {label:'레퍼런스 바꾸기…',run:()=>{selectPageCut(g);assetTab('ref',true)}},
    {label:'이 컷에 맞는 에셋 추천',run:()=>{selectPageCut(g);assetTab('rec',true)}},
    si===SCUR&&{label:'컷 그림 등록·교체…',run:()=>{target={kind:'cut',key:String(g.dataset.p)};$('#filem').click()}},SEP,
    {label:'위에 새 컷…',run:()=>askCut(key,false)},{label:'아래에 새 컷…',run:()=>askCut(key,true)},{label:'컷 복제',run:()=>insertCut(key,true,true)},
    {label:'위로 옮기기',disabled:slot===0,run:()=>moveCutBy(key,-1)},{label:'아래로 옮기기',disabled:slot>=len-1,run:()=>moveCutBy(key,1)},SEP,
    {label:'아래 전환 질감',sub:bgSub(g)},{label:withKey(key,()=>pageSettings()?.blank)?'빈 컷 해제 (그림·테두리 다시)':'빈 컷으로 (그림·테두리 없이 글만)',disabled:locked,run:()=>toggleBlank(key)},{label:'프레임 처음대로',disabled:locked,run:()=>{selectPageCut(g);$('#wframereset').click()}},
    {label:'여기부터 시퀀스로 저장…',run:()=>{selectPageCut(g);$('#wtplsave').click()}},{label:locked?'컷 잠금 풀기':'컷 잠그기',run:()=>toggleLock(key,'cut')},SEP,
    {label:'컷 지우기',key:'Del',danger:1,disabled:locked||len<=1,run:()=>deleteCut(key)}]}
function gapMenu(gap){const si=gap.closest('section').dataset.pageScene,key=`${si}:${gap.dataset.slot}`,g=groupBy(key);if(!g)return null;
  return [{label:'간격',sub:()=>[{label:'붙임 · 0px',run:()=>setGap(key,0)},{label:'기본',run:()=>setGap(key,null)},{label:'쉼 · 300px',run:()=>setGap(key,300)},{label:'큰 쉼 · 600px',run:()=>setGap(key,600)},{label:'아주 길게 · 1200px',run:()=>setGap(key,1200)}]},
    {label:'전환 질감',sub:bgSub(g)},{label:'배경 이미지',sub:()=>[...Object.values(IMG.bg||{}).map(r=>({label:r.name||'배경 이미지',run:()=>applyAsset('bgimg',r.id,g)})),{label:'이미지 올리기…',run:()=>{selectPageCut(g);assetTab('bg',true);assetBody.querySelector('[data-as="bgup"]')?.click()}}]},
    {label:'배경 세부(중간색·씬 끝 색)…',run:()=>{selectPageCut(g);setDrawer(true,'props')}},SEP,{label:'여기에 새 컷…',run:()=>askCut(key,true,gap)}]}
// 보기 메뉴(위 막대): 화면 배치 설정을 한곳에 — 상황 막대에는 선택한 것만
function viewMenu(){return [{label:'미니맵',check:!miniWrap.hidden,run:()=>{miniWrap.hidden=!miniWrap.hidden;SS('rough-ws-mini',!miniWrap.hidden);if(!miniWrap.hidden)RoughStudio.mini.refresh();renderCtx()}},
  {label:'속성 서랍',check:!drawer.hidden,run:()=>setDrawer(drawer.hidden)},{label:'휴대폰 한 화면 선',key:'Shift+G',check:RoughStudio.phoneGuide,run:()=>RoughStudio.setGuide(!RoughStudio.phoneGuide)},{label:'이전 버전 · 비교',run:()=>window.RoughVersions?.openHistory()},{label:'말풍선 읽는 순서',check:RoughStudio.readOrder,run:()=>RoughStudio.setOrder(!RoughStudio.readOrder)},SEP,
  {label:'씬 세로로 이어 보기',check:!AB,run:()=>setAB(false)},{label:'씬 나란히(대지)',check:AB,run:()=>setAB(true)},SEP,
  {label:'작업 공간',sub:()=>Object.entries(PRESETS).map(([k,p])=>({label:p.name,check:LAYOUT.preset===k,run:()=>applyPreset(k)}))},
  {label:'처음 안내 다시 보기',run:()=>coachReset()},{label:'배치 초기화',run:()=>applyPreset(LAYOUT.preset&&PRESETS[LAYOUT.preset]?LAYOUT.preset:'edit')},SEP,
  {label:'전체 보기',key:'Shift+1',run:()=>RoughStudio.fitAll()},{label:'100%',key:'Shift+0',run:()=>RoughStudio.zoomTo(1)}]}
{const vb=document.createElement('button');vb.className='btn';vb.id='wviewmenu';vb.setAttribute('aria-haspopup','menu');vb.title='미니맵 · 씬 배치 · 작업 공간';vb.textContent='보기';
  const z=V.querySelector('.edtop-r .czoom');z?z.after(vb):V.querySelector('.edtop-r')?.prepend(vb);
  vb.addEventListener('click',e=>{e.stopPropagation();const r=vb.getBoundingClientRect();cmOpen(viewMenu(),r.left,r.bottom+4)})}
function emptyMenu(){return [{label:'전체 보기',key:'Shift+1',run:()=>RoughStudio.fitAll()},{label:'100%',key:'Shift+0',run:()=>RoughStudio.zoomTo(1)},pageSelection&&{label:'선택한 컷 보기',key:'Shift+2',run:()=>RoughStudio.fitSelected()},SEP,
  {label:'미니맵',check:!miniWrap.hidden,run:()=>viewMenu()[0].run()},{label:'속성 서랍',check:!drawer.hidden,run:()=>setDrawer(drawer.hidden)},{label:'읽기 모드',key:'P',run:()=>$('#wread').click()},
  SEP,{label:'대사 교정…',run:()=>$('#wproof').click()},{label:'완성본 점검(다음 문제 컷)',run:()=>typeof jumpArtCheck==='function'&&jumpArtCheck()}]}
reader.addEventListener('contextmenu',e=>{if(!inEdit()||!pageEditing)return;e.preventDefault();e.stopPropagation();hideFly();
  const L=e.target.closest('[data-letter]'),g=e.target.closest('[data-slot-index]'),gap=e.target.closest('[data-page-gap]');let items=null;
  if(L&&g&&MULTI.size>1&&MULTI.has(lkey(L)))items=multiMenu();
  else if(L&&g){if(MULTI.size)clearMulti();selectPageCut(g);selectLetter(L);items=letterMenu(L,g,pagePoint(g.ownerSVGElement,e))}
  else if(gap)items=gapMenu(gap);
  else if(g){if(MULTI.size)clearMulti();selectLetter(null);selectPageCut(g);const pt=pagePoint(g.ownerSVGElement,e);items=cutMenu(g,{x:pt.x,y:pt.y})}
  else items=emptyMenu();
  if(items)cmOpen(items,e.clientX,e.clientY)},true);
// 키보드로도 열기: 고른 대상에서 Shift+F10 · 메뉴 키
document.addEventListener('keydown',e=>{if(!inEdit()||typing(e.target)||!(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')))return;e.preventDefault();
  const el=selectedLetter||selGroup();if(!el)return;const r=el.getBoundingClientRect();el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+Math.min(40,r.width/2),clientY:r.top+Math.min(40,r.height/2)}))});

// ---------- 변형 손잡이: 식자는 누르면 바로 끌어 옮기고(기존) 모서리로 크기, 컷 그림은 바로 끌고 모서리로 확대 ----------
const tbox=mk('tbox');tbox.hidden=true;tbox.innerHTML=['nw','ne','se','sw'].map(c=>`<i class="th" data-th="${c}" title="모서리: 끌어서 전체 크기 (Shift: 5% 단위)"></i>`).join('')+'<i class="th" data-th="rot" title="끌어서 돌리기 (Shift: 15° 단위)"></i>'+'<output class="tb-v"></output>';document.body.appendChild(tbox);
let tdrag=null,tmode=null; // tmode: 'letter' | 'art'
const letterScale=L=>{const g=L.closest('[data-slot-index]');const s=withKey(pageKey(g),()=>pageSettings()?.letters?.[L.dataset.letter]?.scale);return +s||1};
function tTarget(){if(!inEdit()||tool!=='select'||cropKey)return null;
  if(selectedLetter){const art=selectedLetter.querySelector('[data-balloon]');return {mode:'letter',el:art||selectedLetter,box:(art||selectedLetter)}}
  const g=selGroup();if(window.layerPart?.what==='frame'&&window.layerPart.key===pageSelection)return null;  // 칸을 고르면 그림 손잡이 대신 칸 테두리 손잡이만
  if(g&&!isLocked(g,'cut')){const art=g.querySelector('[data-art]');if(art)return {mode:'art',el:art,g,box:{getBoundingClientRect:()=>frameRect(g)}}}
  return null}
function frameRect(g){const f=JSON.parse(g.dataset.frame),m=g.ownerSVGElement.getScreenCTM(),a=new DOMPoint(f.x,f.y).matrixTransform(m),b=new DOMPoint(f.x+f.w,f.y+f.h).matrixTransform(m);return {left:a.x,top:a.y,width:b.x-a.x,height:b.y-a.y}}
function setTbox(r,pad){Object.assign(tbox.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+pad*2+'px',height:r.height+pad*2+'px'})}
function placeTbox(){const t=tTarget();if(!t){tbox.hidden=true;return}const r=t.box.getBoundingClientRect();if(!r.width){tbox.hidden=true;return}
  tbox.hidden=false;tbox.classList.toggle('art',t.mode==='art');tbox.classList.toggle('rotok',t.mode==='letter');tbox.classList.toggle('sides',t.mode==='letter'&&/^(dialog|caption)/.test(selectedLetter?.dataset.letter||''));setTbox(r,t.mode==='art'?-30:4);
  // 회전 손잡이가 컷 위쪽 테두리·간격 손잡이나 위 고정 막대에 겹치면 상자 아래로
  let below=false;if(t.mode==='letter'){const g=selectedLetter.closest('[data-slot-index]'),fr=g&&frameRect(g);below=r.top-56<(fr?fr.top+6:0)||r.top-56<200}tbox.classList.toggle('rotbelow',below)}
(function loop(){if(!tdrag)placeTbox();requestAnimationFrame(loop)})();
tbox.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-th]'),t=tTarget();if(!h||!t)return;e.preventDefault();e.stopPropagation();
  if(h.dataset.th==='rot'&&t.mode==='letter'){const L=selectedLetter,g=L.closest('[data-slot-index]');if(isLocked(g,L.dataset.letter)){flash('잠긴 식자예요');return}
    const key=pageKey(g),cur=withKey(key,()=>letterPosition(L)),r=(L.querySelector('[data-balloon]')||L).getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let wrap=L.querySelector(':scope > .lrot');if(!wrap){wrap=document.createElementNS('http://www.w3.org/2000/svg','g');wrap.setAttribute('class','lrot');wrap.setAttribute('style','transform-box:fill-box;transform-origin:center');while(L.firstChild)wrap.appendChild(L.firstChild);L.appendChild(wrap)}
    tdrag={mode:'rot',L,wrap,key,id:L.dataset.letter,cx,cy,a0:Math.atan2(e.clientY-cy,e.clientX-cx),r0:+cur.rot||0,rot:+cur.rot||0};h.setPointerCapture(e.pointerId);return}
  if(/^[nesw]$/.test(h.dataset.th)&&t.mode==='letter'){const L=selectedLetter,g=L.closest('[data-slot-index]');if(isLocked(g,L.dataset.letter)){flash('잠긴 식자예요');return}
    const key=pageKey(g),cur=withKey(key,()=>letterPosition(L)),k=L.ownerSVGElement.getScreenCTM().a||1;
    tdrag={mode:'side',dir:h.dataset.th,id:L.dataset.letter,key,cap:/^caption/.test(L.dataset.letter),x0:e.clientX,y0:e.clientY,k,bw0:cur.bw||0,bh0:cur.bh||0,px0:cur.x||0,py0:cur.y||0};
    h.setPointerCapture(e.pointerId);return}
  const r=t.box.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d0=Math.hypot(e.clientX-cx,e.clientY-cy)||1;
  if(t.mode==='letter'){const L=selectedLetter;if(isLocked(L.closest('[data-slot-index]'),L.dataset.letter)){flash('잠긴 식자예요');return}
    const art=L.querySelector('[data-balloon]');let wrap=null;
    if(!art){wrap=L.querySelector(':scope > .lsc');if(!wrap){wrap=document.createElementNS('http://www.w3.org/2000/svg','g');wrap.setAttribute('class','lsc');wrap.setAttribute('style','transform-box:fill-box;transform-origin:center');while(L.firstChild)wrap.appendChild(L.firstChild);L.appendChild(wrap)}}
    tdrag={mode:'letter',L,art,wrap,meta:art?JSON.parse(art.dataset.balloon):null,cx,cy,d0,s0:art?(Number($('#wballoonsize').value)/100||1):letterScale(L)}}
  else{const z=(pageSettings()?.img)||{s:1,dx:0,dy:0};tdrag={mode:'art',g:t.g,cx,cy,d0,s0:z.s||1,z}}
  tdrag.s=tdrag.s0;h.setPointerCapture(e.pointerId)});
tbox.addEventListener('pointermove',e=>{if(!tdrag)return;
  if(tdrag.mode==='rot'){const t=tdrag;let a=t.r0+(Math.atan2(e.clientY-t.cy,e.clientX-t.cx)-t.a0)*180/Math.PI;a=((a+180)%360+360)%360-180;if(e.shiftKey)a=Math.round(a/15)*15;else a=Math.round(a);if(Math.abs(a)<2)a=0;
    t.rot=a;t.wrap.style.transform=`rotate(${a}deg)`;tbox.querySelector('.tb-v').textContent=`${a}°`;return}
  if(tdrag.mode==='side'){const t=tdrag,dx=(e.clientX-t.x0)/t.k,dy=(e.clientY-t.y0)/t.k;let bw=t.bw0,bh=t.bh0,px=t.px0,py=t.py0;
    // 끄는 쪽 변만 움직이게: 상자는 가운데 기준으로 커지니 위치를 반만큼 옮김(나레이션은 아래 기준)
    if(t.dir==='e'){bw=t.bw0+dx;px=t.px0+dx/2}if(t.dir==='w'){bw=t.bw0-dx;px=t.px0+dx/2}
    if(t.dir==='s'){bh=t.bh0+dy;py=t.py0+(t.cap?dy:dy/2)}if(t.dir==='n'){bh=t.bh0-dy;py=t.py0+(t.cap?0:dy/2)}
    bw=Math.round(Math.max(-40,Math.min(600,bw)));bh=Math.round(Math.max(-30,Math.min(600,bh)));
    withKey(t.key,()=>{const st=pageSettings(true);(st.letters||={})[t.id]={...st.letters?.[t.id],bw,bh,x:Math.round(px),y:Math.round(py)}});
    tbox.querySelector('.tb-v').textContent=t.dir==='e'||t.dir==='w'?`가로 ${bw>=0?'+':''}${bw}`:`세로 ${bh>=0?'+':''}${bh}`;
    if(!t.raf)t.raf=requestAnimationFrame(()=>{t.raf=0;renderWebtoon();const g=groupBy(t.key),L=g?.querySelector(`[data-letter="${CSS.escape(t.id)}"]`);if(L){selectLetter(L);setTbox((L.querySelector('[data-balloon]')||L).getBoundingClientRect(),4)}});return}const d=Math.hypot(e.clientX-tdrag.cx,e.clientY-tdrag.cy),q=e.shiftKey?20:100;let s=Math.round(tdrag.s0*d/tdrag.d0*q)/q;
  if(tdrag.mode==='letter'){s=Math.max(.5,Math.min(tdrag.art?2:3,s));tdrag.s=s;if(tdrag.art)tdrag.art.setAttribute('transform',balloonTransform(tdrag.meta,s));else tdrag.wrap.style.transform=`scale(${s})`;
    const el=tdrag.art||tdrag.L;setTbox(el.getBoundingClientRect(),4)}
  else{s=Math.max(1,Math.min(5,s));tdrag.s=s;setZoom(tdrag.g,{...tdrag.z,s})}
  tbox.querySelector('.tb-v').textContent=Math.round(s*100)+'%'});
tbox.addEventListener('pointerup',()=>{if(!tdrag)return;const t=tdrag;tdrag=null;tbox.querySelector('.tb-v').textContent='';
  if(t.mode==='rot'){withKey(t.key,()=>{const st=pageSettings(true);const o={...st.letters?.[t.id]};if(t.rot)o.rot=t.rot;else delete o.rot;(st.letters||={})[t.id]=o});saveScenes();renderWebtoon();const L=groupBy(t.key)?.querySelector(`[data-letter="${CSS.escape(t.id)}"]`);if(L)selectLetter(L);flash(t.rot?`${t.rot}° 돌렸어요`:'회전을 없앴어요');return}
  if(t.mode==='side'){cancelAnimationFrame(t.raf);saveScenes();renderWebtoon();const g=groupBy(t.key),L=g?.querySelector(`[data-letter="${CSS.escape(t.id)}"]`);if(L)selectLetter(L);flash('상자 크기를 바꿨어요 · 모서리는 전체 크기');return}
  if(t.mode==='letter'){if(t.art){const b=$('#wballoonsize');b.value=Math.round(t.s*100);b.dispatchEvent(new Event('input'))}else{saveLetter(t.L,{scale:t.s});renderWebtoon()}flash(`크기 ${Math.round(t.s*100)}%`)}
  else{saveZoom(t.g);flash(`그림 확대 ${Math.round(t.s*100)}% · 그림을 끌어 위치를 옮겨요`)}});

// ---------- 말풍선·나레이션 더블클릭: 그 자리에서 바로 글자 고치기 ----------
// Enter 줄바꿈 · Ctrl+Enter 또는 바깥 클릭으로 저장 · Esc 취소
let ltEdit=null;
function openInlineText(L){closeInlineText(true);const g=L.closest('[data-slot-index]');if(!g)return;if(isLocked(g,L.dataset.letter)){flash('잠긴 식자예요');return}
  const key=pageKey(g),id=L.dataset.letter,el=L.querySelector('[data-balloon]')||L,r=el.getBoundingClientRect();
  const t0=L.querySelector('text'),k=L.ownerSVGElement.getScreenCTM().a||1,fs=Math.max(13,Math.min(28,(+t0?.getAttribute('font-size')||20)*k));
  const ta=document.createElement('textarea');ta.className='ltedit';ta.value=(L.dataset.letterText||'').replace(/&#10;/g,'\n');ta.setAttribute('aria-label','문구 고치기');
  const w=Math.max(r.width,160),h=Math.max(r.height,fs*2.6);Object.assign(ta.style,{left:(r.left+r.width/2-w/2)+'px',top:(r.top+r.height/2-h/2)+'px',width:w+'px',height:h+'px',fontSize:fs+'px'});
  const lines=Math.max(1,ta.value.split('\n').length,Math.ceil(ta.value.length*fs*.95/(w-16)));ta.style.paddingTop=Math.max(6,(h-lines*fs*1.4)/2)+'px';
  document.body.appendChild(ta);ta.focus();ta.select();ltEdit={ta,key,id};
  ta.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeInlineText(false)}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();closeInlineText(true)}});
  ta.addEventListener('blur',()=>setTimeout(()=>{if(ltEdit?.ta===ta)closeInlineText(true)},0))}
function closeInlineText(save){const s=ltEdit;if(!s)return;ltEdit=null;const v=s.ta.value.replace(/\s+$/,'');s.ta.remove();
  if(!save)return;const g=groupBy(s.key),L=g?.querySelector(`[data-letter="${CSS.escape(s.id)}"]`);if(!L||!v.trim()||v===(L.dataset.letterText||''))return;
  withKey(s.key,()=>saveLetter(L,{text:v}));renderWebtoon();const L2=groupBy(s.key)?.querySelector(`[data-letter="${CSS.escape(s.id)}"]`);if(L2)selectLetter(L2);flash('문구를 고쳤어요 · Ctrl+Z로 되돌리기')}
// 더블클릭 판별: 누를 때 대상이 식자(놓을 때는 끌기 겹 DIV가 대상이 됨). 같은 식자를 0.4초 안에 두 번 누르면 놓을 때 편집 열기
{let last={id:null,t:0},pending=null;
  const idOf=L=>pageKey(L.closest('[data-slot-index]'))+'|'+L.dataset.letter;
  reader.addEventListener('pointerdown',e=>{if(!pageEditing||e.button!==0||ltEdit)return;const L=e.target.closest('[data-letter^="dialog"],[data-letter^="caption"]');if(!L){last={id:null,t:0};return}
    const id=idOf(L),now=Date.now();if(last.id===id&&now-last.t<400){pending=id;last={id:null,t:0}}else last={id,t:now}},true);
  document.addEventListener('pointerup',()=>{if(!pending)return;const [key,lid]=pending.split('|');pending=null;
    setTimeout(()=>{const L=groupBy(key)?.querySelector(`[data-letter="${CSS.escape(lid)}"]`);if(L)openInlineText(L)},30)},true)}
// 고른 컷의 그림 위에서 Alt+휠로도 확대·축소
reader.addEventListener('wheel',e=>{if(!e.altKey||!inEdit())return;const g=e.target.closest('[data-slot-index]');if(!g||pageKey(g)!==pageSelection||isLocked(g,'cut'))return;e.preventDefault();
  const z=(pageSettings()?.img)||{s:1,dx:0,dy:0},s=Math.max(1,Math.min(5,(z.s||1)*(e.deltaY<0?1.1:1/1.1)));setZoom(g,{...z,s});clearTimeout(reader._zt);reader._zt=setTimeout(()=>saveZoom(g),250)},{passive:false});

// ---------- 컷 추가: 컷 사이에 마우스를 올리면 +, 씬 끝에는 '+ 컷 추가'. 누르면 새 컷 장면 글을 바로 적음 ----------
const plus=mk('gapplus');plus.hidden=true;plus.innerHTML='<button type="button" title="여기에 새 컷 넣기" aria-label="여기에 새 컷 넣기">+</button>';document.body.appendChild(plus);
const ask=mk('cutask');ask.hidden=true;ask.innerHTML=`<label for="cutasktext">새 컷 장면</label><textarea id="cutasktext" rows="2" placeholder="예: @준 창가로 다가간다. &quot;누구세요?&quot;"></textarea><div class="ca-acts"><span>Enter 넣기 · Shift+Enter 줄바꿈 · Esc 취소</span><button class="btn sm" data-ca="x">취소</button><button class="btn sm dark" data-ca="go">넣기</button></div>`;document.body.appendChild(ask);
let plusKey=null,plusHide=0;
function gapKey(gap){return `${gap.closest('section').dataset.pageScene}:${gap.dataset.slot}`}
reader.addEventListener('pointermove',e=>{if(!inEdit()||tool!=='select'||!pageEditing||e.buttons||!ask.hidden)return;const gap=e.target.closest('[data-page-gap]');
  if(!gap){clearTimeout(plusHide);plusHide=setTimeout(()=>{if(!plus.matches(':hover'))plus.hidden=true},250);return}
  clearTimeout(plusHide);const r=gap.getBoundingClientRect();plusKey=gapKey(gap);plus.hidden=false;
  Object.assign(plus.style,{left:Math.min(r.right-40,Math.max(r.left+8,e.clientX+28))+'px',top:r.top+r.height/2+'px'})});
plus.addEventListener('pointerleave',()=>{plusHide=setTimeout(()=>plus.hidden=true,200)});
plus.addEventListener('click',()=>{if(plusKey){const r=plus.getBoundingClientRect();plus.hidden=true;askCut(plusKey,true,null,r)}});
function askCut(key,after,anchorEl,rect){const g=groupBy(key);if(!g)return;const r=rect||(anchorEl||g).getBoundingClientRect();ask.hidden=false;ask._k={key,after};
  const W=Math.min(380,innerWidth-24);Object.assign(ask.style,{width:W+'px',left:Math.max(12,Math.min(innerWidth-W-12,r.left+r.width/2-W/2))+'px',top:Math.max(60,Math.min(innerHeight-170,(rect?r.top:after?r.bottom:r.top)-20))+'px'});
  const t=ask.querySelector('textarea');t.value='';t.focus()}
function askDone(go){const k=ask._k;ask.hidden=true;if(!go||!k)return;const v=ask.querySelector('textarea').value.trim();insertCut(k.key,k.after,false,v||undefined)}
ask.addEventListener('click',e=>{const a=e.target.closest('[data-ca]')?.dataset.ca;if(a)askDone(a==='go')});
ask.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();askDone(false)}else if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();askDone(true)}});
document.addEventListener('pointerdown',e=>{if(!ask.hidden&&!ask.contains(e.target))askDone(false)},true);
// 씬 끝 '+ 컷 추가'
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);if(pageEditing)reader.querySelectorAll('section[data-page-scene]').forEach(sec=>{if(sec.querySelector(':scope > .scene-add'))return;const si=+sec.dataset.pageScene,n=SCENES[si]?.cuts.length;if(!n)return;
  sec.insertAdjacentHTML('beforeend',`<button type="button" class="scene-add" data-scene-add="${si}">+ 컷 추가</button>`)});return r}}
reader.addEventListener('click',e=>{const b=e.target.closest('[data-scene-add]');if(!b)return;const si=+b.dataset.sceneAdd,gs=groups().filter(g=>g.closest('section').dataset.pageScene==String(si)),last=gs[gs.length-1];
  if(!last){const sc=SCENES[si];sc.cuts.push('(새 컷) 장면을 적어 주세요');refreshText(si);return}askCut(pageKey(last),true,b)});

// ---------- 연결 ----------
{const _sc=selectPageCut;selectPageCut=function(...a){const r=_sc(...a);if(cropKey&&cropKey!==pageSelection)RoughStudio.setCrop(null);renderCtx();return r}}  // 그림 편집 중 다른 컷을 고르면 그림 편집을 풀어 새 컷이 바로 잡히게
{const _sl=selectLetter;selectLetter=function(...a){const r=_sl(...a);renderCtx();return r}}
{const _rw=renderWebtoon;renderWebtoon=function(...a){reader.classList.toggle('artboards',AB);const r=_rw(...a);markLocks();markMulti();renderCtx();renderHistory();return r}}
{const _sv=showView;showView=function(v){const r=_sv(v);Object.entries(LAYOUT.panels).forEach(([id,p])=>{if(p.float)PANELS[id].sec.hidden=v!=='webtoon'});if(v!=='webtoon'){hideFly();if(tool!=='select')setTool('select')}return r}}
propsBody.querySelector('#wballoonsize').addEventListener('input',()=>{const r=ctx.querySelector('[data-ctx="lsize"]');if(r&&document.activeElement!==r){r.value=$('#wballoonsize').value;r.nextElementSibling.textContent=r.value+'%'}});
renderDocks();renderCtx();renderAlign();syncHelp();
Object.keys(PANELS).forEach(k=>{if(!LAYOUT.panels[k].collapsed&&LAYOUT.panels[k].dock!=='X')onOpen(k)});mountOff();assetTab(PRESETS[LAYOUT.preset]?.tab||'rec');
reader.classList.toggle('artboards',AB);if(AB)RoughStudio.applyZoom();
window.RoughWS={cmOpen,multiCut,swatch,openColorPop,fitLetters,styleMenu,deleteLetterEls,get tool(){return tool},setTool,openPanel,applyPreset,addLetter,splitCut,toggleLock,isLocked,alignLetters,setAB,get layout(){return LAYOUT},MULTI,lkey,resolve,toggleMulti,clearMulti,markMulti,renderCtx,renderAlign,withKey,groupBy,openInlineText,typing,refreshText,flash};
})();
