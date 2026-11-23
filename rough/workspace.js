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
  {id:'split',name:'칸 나누기',key:'F',icon:'<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M3.5 14L20.5 9.5"/>',hint:'나눌 컷을 누르면 바로 아래에 새 칸이 생겨요 · 새 칸 글은 씬 화면에서 고쳐요'},
  {id:'crop',name:'그림 편집',key:'C',icon:'<path d="M6.5 2.5v15h15M2.5 6.5h15v15"/>',hint:'컷을 누르면 그림 확대·이동 모드 · Ctrl+휠 확대, 끌어 이동'},
  0,
  {id:'balloon',name:'말풍선',key:'B',sub:true,icon:'<path d="M12 4c5 0 9 3.1 9 7s-4 7-9 7c-1 0-2-.1-2.9-.4L4.5 19.5l1.4-3.6A6.6 6.6 0 0 1 3 11c0-3.9 4-7 9-7z"/>',hint:'컷 안을 누른 자리에 말풍선 · 형태는 막대 왼쪽에서 고르거나 아이콘을 길게 눌러요'},
  {id:'caption',name:'나레이션',key:'T',icon:'<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7 10.5h10M7 14h6"/>',hint:'컷 안을 누른 자리에 나레이션 상자(컷마다 하나)'},
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
  if(tool==='select'){
    if(e.shiftKey&&letter){e.preventDefault();e.stopPropagation();toggleMulti(letter);return}
    if(MULTI.size&&!(letter&&MULTI.has(lkey(letter))))clearMulti();
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
function focusText(){openPanel('props');setTimeout(()=>{letterMemo.focus();letterMemo.select()},30)}
// 말풍선·나레이션·효과음을 컷 글에 더하고, 누른 자리로 옮김
function addLetter(kind,group,pt,o={}){
  const key=pageKey(group),[si,slot]=key.split(':').map(Number),cuts=SCENES[si].cuts;
  const count=pre=>group.querySelectorAll(`[data-letter^="${pre}"]`).length;
  let lk,line;
  if(kind==='balloon'){lk='dialog-'+count('dialog-');line=`"${o.text||'대사를 입력하세요'}"`}
  else if(kind==='caption'){const ex=group.querySelector('[data-letter="caption"]');if(ex){selectPageCut(group);selectLetter(ex);focusText();flash('나레이션은 컷마다 하나예요 · 문구를 고쳐 주세요');return}lk='caption';line=`[${o.text||'나레이션'}]`}
  else{const w=String(o.text||opt.sfx||'쾅').replace(/[-\s]/g,'').slice(0,10)||'쾅';lk='effect-'+count('effect-');line=`-${w}-`}
  cuts[slot]=String(cuts[slot]||'').replace(/\s+$/,'')+'\n'+line;
  const style=kind==='balloon'?(o.style||opt.balloon):null;
  if(style&&style!=='auto')withKey(key,()=>{const s=pageSettings(true);(s.letters||={})[lk]={...(s.letters[lk]||{}),style}});
  refreshText(si);
  const g=groupBy(key),L=g&&g.querySelector(`[data-letter="${lk}"]`);
  if(!L){flash('넣었어요 · 위치를 찾지 못해 기본 자리에 두었어요');return}
  selectPageCut(g);
  const svg=g.ownerSVGElement,r=L.getBoundingClientRect(),c=new DOMPoint(r.left+r.width/2,r.top+r.height/2).matrixTransform(svg.getScreenCTM().inverse());
  const cur=letterPosition(L),pos={x:Math.round(cur.x+pt.x-c.x),y:Math.round(cur.y+pt.y-c.y)};
  moveLetter(L,pos);saveLetter(L,pos);selectLetter(L);focusText();
  flash(`${kind==='balloon'?'말풍선':kind==='caption'?'나레이션':'효과음'}을 넣었어요 · 문구를 입력하고 Ctrl+Enter`);
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
function markMulti(){reader.querySelectorAll('.multi-sel').forEach(x=>x.classList.remove('multi-sel'));[...MULTI].map(resolve).forEach(L=>L&&L.classList.add('multi-sel'))}
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
const histBody=mk('ws-hist','<ol class="hist" id="wshist"></ol><p class="hist-note">항목을 누르면 그때 상태로 돌아가요. 칸 나누기·말풍선 추가도 되돌릴 수 있어요.</p>');
const textBody=mk('ws-text');const alignBody=mk('ws-align');const libBody=mk('ws-lib');
$('#wtoc').hidden=false;$('#wrefs').hidden=false;
const PANELS={
  layers:{title:'레이어',el:$('#wtoc')},refs:{title:'레퍼런스',el:$('#wrefs')},props:{title:'속성',el:propsBody},
  nav:{title:'내비게이터',el:navBody},history:{title:'기록',el:histBody},library:{title:'소재',el:libBody},text:{title:'글자',el:textBody},align:{title:'정렬',el:alignBody}};
const PRESETS={
  edit:{name:'편집',L:[['layers',0],['refs',1]],R:[['props',0],['nav',0],['history',1],['library',1],['text',1],['align',1]]},
  letter:{name:'식자',L:[['layers',0],['refs',1]],R:[['props',0],['text',0],['align',0],['library',0],['history',1],['nav',1]]},
  ref:{name:'연출 참고',L:[['refs',0],['layers',1]],R:[['props',0],['nav',0],['history',1],['library',1],['text',1],['align',1]]}};
const fromPreset=id=>{const P=PRESETS[id],panels={};['L','R'].forEach(d=>P[d].forEach(([p,c],i)=>panels[p]={dock:d,order:i,collapsed:!!c}));return {preset:id,panels}};
let LAYOUT=LS('rough-ws-layout',null);if(!LAYOUT||!LAYOUT.panels||Object.keys(PANELS).some(k=>!LAYOUT.panels[k]))LAYOUT=fromPreset('edit');
const saveLayout=()=>SS('rough-ws-layout',LAYOUT);
for(const [id,P] of Object.entries(PANELS)){const s=document.createElement('section');s.className='wpanel';s.dataset.panel=id;
  s.innerHTML=`<header class="wp-h"><button class="wp-col" aria-expanded="true" aria-label="${P.title} 접기·펼치기">${ico('<path d="M5.5 8.5h13L12 16z"/>')}</button><b>${P.title}</b><span class="wp-acts"><button data-wp="move" title="반대쪽으로 옮기기" aria-label="${P.title} 패널 반대쪽으로">${ico('<path d="M15 2.5l6 5-6 5V9.2H4V5.8h11zM9 11.5v3.3h11v3.4H9v3.3l-6-5z"/>')}</button><button data-wp="float" title="떼어 띄우기 / 다시 붙이기" aria-label="${P.title} 패널 떼어 띄우기">${ico('<path fill-rule="evenodd" d="M8 8h13v13H8zm2.3 2.3v8.4h8.4v-8.4zM3 3h13v3.6h-2.3V5.3H5.3v8.4h1.3V16H3z"/>')}</button></span></header><div class="wp-body"></div>`;
  s.querySelector('.wp-body').appendChild(P.el);P.sec=s}
function renderDocks(){
  for(const d of ['L','R']){const dock=d==='L'?leftDock:rightDock;
    Object.entries(LAYOUT.panels).filter(([,v])=>v.dock===d&&!v.float).sort((a,b)=>a[1].order-b[1].order).forEach(([id])=>dock.appendChild(PANELS[id].sec))}
  for(const [id,v] of Object.entries(LAYOUT.panels)){const s=PANELS[id].sec;s.classList.toggle('collapsed',!!v.collapsed);s.querySelector('.wp-col').setAttribute('aria-expanded',!v.collapsed);
    s.classList.toggle('floating',!!v.float);s.querySelector('.wp-h').draggable=!v.float;
    if(v.float){document.body.appendChild(s);s.style.left=clamp(v.float.x,0,innerWidth-120)+'px';s.style.top=clamp(v.float.y,60,Math.max(60,innerHeight-160))+'px';s.hidden=!inEdit()}else{s.style.left=s.style.top='';s.hidden=false}}
  $('#wsws')&&($('#wsws').value=LAYOUT.preset||'custom')}
function openPanel(id){const v=LAYOUT.panels[id];if(!v)return;if(v.collapsed){v.collapsed=false;saveLayout();renderDocks();onOpen(id)}PANELS[id].sec.scrollIntoView({block:'nearest'})}
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
function onOpen(id){if(id==='nav')RoughStudio.mini.refresh();if(id==='history')renderHistory();if(id==='refs')RoughRefs.showTab('refs');if(id==='text')renderText();if(id==='align')renderAlign();if(id==='library')renderLib()}

// ---------- 상황 막대 ----------
const ctx=document.createElement('div');ctx.className='ctxbar';ctx.setAttribute('role','toolbar');ctx.setAttribute('aria-label','도구 옵션');$('#wst').after(ctx);
const WS_OPTS=Object.entries(PRESETS).map(([k,p])=>`<option value="${k}">${p.name}</option>`).join('')+'<option value="custom" disabled>내 배치</option>';
function renderCtx(){if(!ctx.isConnected)return;const t=TOOL[tool];let mid='';
  if(MULTI.size>1&&tool==='select')mid=`<b>식자 ${MULTI.size}개</b>${[['left','왼쪽'],['hcenter','가로 가운데'],['right','오른쪽'],['top','위'],['vcenter','세로 가운데'],['bottom','아래'],['vdist','세로 간격'],['hdist','가로 간격']].map(([k,n])=>`<button class="cb" data-align="${k}">${n}</button>`).join('')}`;
  else if(tool==='balloon')mid=`<label>형태 <select data-ctx="bstyle">${BSTYLES.map(([k,n])=>`<option value="${k}"${k===opt.balloon?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  else if(tool==='sfx')mid=`<label>문구 <input data-ctx="sfxword" value="${esc(opt.sfx)}" maxlength="10" size="6"></label>${['쾅','두근','툭','쿵','휘청','쨍그랑','덜컹','찰칵'].map(w=>`<button class="cb${w===opt.sfx?' on':''}" data-sfxw="${w}">${w}</button>`).join('')}`;
  else if(tool==='select'&&selectedLetter){const art=selectedLetter.querySelector('[data-balloon]'),kind=/^dialog/.test(selectedLetter.dataset.letter)?'말풍선':selectedLetter.dataset.letter==='caption'?'나레이션':'효과음';
    mid=`<b>${kind}</b><span class="cb-t">${esc((selectedLetter.dataset.letterText||'').replace(/\s+/g,' ').slice(0,24))}</span><button class="cb" data-ctx="ledit">문구 고치기</button>`+
      (art?`<label>형태 <select data-ctx="lstyle">${[...$('#wballoonstyle').options].map(o=>`<option value="${o.value}"${o.selected?' selected':''}>${esc(o.textContent)}</option>`).join('')}</select></label><label>크기 <input type="range" data-ctx="lsize" min="50" max="200" value="${$('#wballoonsize').value}"><output>${$('#wballoonsize').value}%</output></label>`:'')+
      `<button class="cb" data-ctx="llock">${isLocked(selectedLetter.closest('[data-slot-index]'),selectedLetter.dataset.letter)?'잠금 풀기':'잠그기'}</button>`}
  else if(tool==='select'&&pageSelection){const s=pageSettings(),g=selGroup();
    mid=`<b>${esc(pageCut.selectedOptions[0]?.textContent||'컷')}</b><label>아래 간격 <input type="number" data-ctx="gap" min="0" max="1600" step="4" value="${s?.gap??''}" placeholder="기본" style="width:64px">px</label>
      <label>그림 확대 <input type="range" data-ctx="zoom" min="100" max="500" step="5" value="${$('#wzoom').value}"><output>${$('#wzoom').value}%</output></label>
      <button class="cb" data-ctx="crop">그림 편집</button><button class="cb" data-ctx="frame">프레임 초기화</button><button class="cb" data-ctx="ref">레퍼런스 ${esc($('#wrefid')?.textContent||'')}</button><button class="cb" data-ctx="clock">${g&&isLocked(g,'cut')?'잠금 풀기':'잠그기'}</button>`}
  else mid=`<span class="cb-hint">${esc(t.hint)}</span>`;
  ctx.innerHTML=`<span class="cb-tool">${ico(t.icon)}<b>${t.name}</b></span><span class="cb-sep"></span><span class="cb-mid">${mid}</span><span class="cb-right"><div class="seg3 cb-ab" role="group" aria-label="씬 배치"><button data-ab="0" aria-pressed="${!AB}" title="씬을 세로로 이어 보기">세로</button><button data-ab="1" aria-pressed="${AB}" title="씬을 대지처럼 나란히 보기">나란히</button></div><label class="cb-ws">작업 공간 <select id="wsws" aria-label="작업 공간">${WS_OPTS}</select></label><button class="cb" data-ctx="wsreset" title="이 작업 공간의 기본 배치로">배치 초기화</button></span>`;
  $('#wsws').value=LAYOUT.preset||'custom'}
ctx.addEventListener('change',e=>{const c=e.target.dataset.ctx;
  if(c==='bstyle'){opt.balloon=e.target.value;SS('rough-tool-balloon',opt.balloon)}
  if(c==='lstyle'){const s=$('#wballoonstyle');s.value=e.target.value;s.dispatchEvent(new Event('change'))}
  if(c==='gap'&&pageSelection){const s=pageSettings(true),v=e.target.value;if(v==='')delete s.gap;else s.gap=clamp(Math.round(+v),0,1600);saveScenes();renderWebtoon()}
  if(c==='zoom'){const z=$('#wzoom');z.value=e.target.value;z.dispatchEvent(new Event('change'))}
  if(e.target.id==='wsws'){applyPreset(e.target.value)}});
ctx.addEventListener('input',e=>{const c=e.target.dataset.ctx;
  if(c==='sfxword'){opt.sfx=e.target.value.replace(/[-\s]/g,'')||'쾅';SS('rough-tool-sfx',opt.sfx)}
  if(c==='lsize'){const s=$('#wballoonsize');s.value=e.target.value;s.dispatchEvent(new Event('input'));e.target.nextElementSibling.textContent=e.target.value+'%'}
  if(c==='zoom'){const z=$('#wzoom');z.value=e.target.value;z.dispatchEvent(new Event('input'));e.target.nextElementSibling.textContent=e.target.value+'%'}});
ctx.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.align){alignLetters(b.dataset.align);return}
  if(b.dataset.sfxw){opt.sfx=b.dataset.sfxw;SS('rough-tool-sfx',opt.sfx);renderCtx();return}
  if(b.dataset.ab){setAB(b.dataset.ab==='1');return}
  const c=b.dataset.ctx;
  if(c==='ledit')focusText();
  if(c==='llock'&&selectedLetter){const g=selectedLetter.closest('[data-slot-index]');toggleLock(pageKey(g),selectedLetter.dataset.letter)}
  if(c==='clock'&&pageSelection)toggleLock(pageSelection,'cut');
  if(c==='crop'){const g=selGroup();if(g)RoughStudio.setCrop(g)}
  if(c==='frame')$('#wframereset').click();
  if(c==='ref')$('#wrefchange').click();
  if(c==='wsreset')applyPreset(LAYOUT.preset&&PRESETS[LAYOUT.preset]?LAYOUT.preset:'edit')});
function applyPreset(id){if(!PRESETS[id])return;LAYOUT=fromPreset(id);saveLayout();renderDocks();Object.keys(PANELS).forEach(k=>!LAYOUT.panels[k].collapsed&&onOpen(k));flash(`작업 공간: ${PRESETS[id].name}`)}

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
const FONTS=[['Pretendard,system-ui,sans-serif','프리텐다드 (기본)'],['"Noto Serif KR","Nanum Myeongjo",AppleMyungjo,Batang,serif','명조'],['"NanumSquareRound","Nanum Gothic","Apple SD Gothic Neo",sans-serif','둥근 고딕'],['"Nanum Pen Script","Gaegu",cursive','손글씨']];
function renderText(){textBody.innerHTML=`<label class="wsf"><span>글꼴</span><select id="wsfont">${FONTS.map(([v,n])=>`<option value='${v}'${v===PAGE_FONT?' selected':''}>${n}</option>`).join('')}</select></label>
  <p class="wsn">이 기기에 설치된 글꼴로 보이고, 내보내기 파일에도 같은 글꼴 이름이 들어가요.</p>
  <label class="wsf"><span>범위</span><select id="wsscope"><option value="scene">선택한 씬</option><option value="all">모든 씬</option></select></label>
  <label class="wsf"><span>말풍선 크기</span><input type="range" id="wsbsize" min="50" max="200" value="100"><output id="wsbsizev">100%</output></label>
  <label class="wsf"><span>말풍선 형태</span><select id="wsbstyle">${BSTYLES.map(([k,n])=>`<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
  <div class="wsb"><button class="btn sm" data-text="size">크기 적용</button><button class="btn sm" data-text="style">형태 적용</button><button class="btn sm" data-text="copy" title="고른 말풍선의 형태·크기를 범위의 모든 말풍선에">고른 말풍선 서식 복사</button></div>`}
function applyAll(edit){const scope=$('#wsscope')?.value||'scene',sc=pageSelection?pageSelection.split(':')[0]:String(SCUR);
  const list=[...reader.querySelectorAll('[data-letter^="dialog-"]')].filter(L=>scope==='all'||L.closest('section').dataset.pageScene===sc);
  let n=0;list.forEach(L=>{const g=L.closest('[data-slot-index]');if(isLocked(g,L.dataset.letter))return;withKey(pageKey(g),()=>saveLetter(L,edit));n++});
  renderWebtoon();flash(`말풍선 ${n}개에 적용했어요`)}
textBody.addEventListener('change',e=>{if(e.target.id==='wsfont'){PAGE_FONT=e.target.value;try{localStorage.setItem('rough-page-font',PAGE_FONT)}catch(_){}renderWebtoon();flash('글꼴을 바꿨어요')}});
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
  <h5>말풍선</h5><div class="libgrid">${BALLOON_STYLES.map(s=>`<button class="lib" draggable="true" data-mat="balloon" data-v="${s[0]}" title="${esc(s[1])}">${swatch(s[0])}<span>${esc(s[1].split(' · ')[0])}</span></button>`).join('')}</div>
  <h5>효과음</h5><div class="libgrid words">${SFXW.map(w=>`<button class="lib" draggable="true" data-mat="sfx" data-v="${w}">${w}</button>`).join('')}</div>
  <h5>배경 전환</h5><div class="libgrid">${PAGE_BACKGROUNDS.map((p,i)=>p?`<button class="lib" draggable="true" data-mat="bg" data-v="${i}" title="${esc(p.name)}">${$(`#wbgpresets [data-bg-preset="${i}"]`)?.querySelector('svg')?.outerHTML||''}<span>${esc(p.name)}</span></button>`:'').join('')}</div>
  <h5>효과선</h5><div class="libgrid words"><button class="lib" draggable="true" data-mat="line" data-v="focus">집중선</button><button class="lib" draggable="true" data-mat="line" data-v="speed">속도선</button></div>`}
function useMat(kind,v,group,pt,target){
  if(kind==='balloon'){if(!group){opt.balloon=v;SS('rough-tool-balloon',v);setTool('balloon');return}
    const L=target?.closest?.('[data-letter^="dialog-"]');if(L){withKey(pageKey(group),()=>saveLetter(L,{style:v}));renderWebtoon();flash('말풍선 형태를 바꿨어요');return}
    addLetter('balloon',group,pt,{style:v});return}
  if(kind==='sfx'){if(!group){opt.sfx=v;SS('rough-tool-sfx',v);setTool('sfx');return}addLetter('sfx',group,pt,{text:v});return}
  if(kind==='bg'){if(group)selectPageCut(group);if(!pageSelection){flash('배경을 넣을 컷을 먼저 고르세요');return}$(`#wbgpresets [data-bg-preset="${v}"]`)?.click();flash('배경 전환을 넣었어요');return}
  if(kind==='line'){if(group)selectPageCut(group);setTool(v)}}
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

// ---------- 연결 ----------
{const _sc=selectPageCut;selectPageCut=function(...a){const r=_sc(...a);renderCtx();return r}}
{const _sl=selectLetter;selectLetter=function(...a){const r=_sl(...a);renderCtx();return r}}
{const _rw=renderWebtoon;renderWebtoon=function(...a){reader.classList.toggle('artboards',AB);const r=_rw(...a);markLocks();markMulti();renderCtx();renderHistory();return r}}
{const _sv=showView;showView=function(v){const r=_sv(v);Object.entries(LAYOUT.panels).forEach(([id,p])=>{if(p.float)PANELS[id].sec.hidden=v!=='webtoon'});if(v!=='webtoon'){hideFly();if(tool!=='select')setTool('select')}return r}}
propsBody.querySelector('#wballoonsize').addEventListener('input',()=>{const r=ctx.querySelector('[data-ctx="lsize"]');if(r&&document.activeElement!==r){r.value=$('#wballoonsize').value;r.nextElementSibling.textContent=r.value+'%'}});
renderDocks();renderCtx();renderAlign();syncHelp();
Object.keys(PANELS).forEach(k=>{if(!LAYOUT.panels[k].collapsed)onOpen(k)});
reader.classList.toggle('artboards',AB);if(AB)RoughStudio.applyZoom();
window.RoughWS={get tool(){return tool},setTool,openPanel,applyPreset,addLetter,splitCut,toggleLock,isLocked,alignLetters,setAB,get layout(){return LAYOUT},MULTI};
})();
