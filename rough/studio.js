// 연출(편집) 화면 보강: 캔버스 확대·이동, 그림 편집 모드, 레이어 패널, 읽기 모드, 단축키
// 클립스튜디오(내비게이터·레이어 팔레트)와 피그마(줌·손 도구·레이어·Present)를 참고
(function(){
const canvas=document.querySelector('.edcanvas'),reader=pageReader;
const typingIn=t=>t&&t.closest&&t.closest('input,textarea,select,[contenteditable]');
const inEdit=()=>VIEW==='webtoon';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const STICKY=200;

// ---------- 캔버스 확대·축소 ----------
const CZ_MIN=.1,CZ_MAX=4,BASE=720;
let CZ=1;try{CZ=clamp(+localStorage.getItem('rough-canvas-zoom')||1,CZ_MIN,CZ_MAX)}catch(_){}
function applyZoom(){if(reader.classList.contains('artboards')){reader.style.width='max-content';reader.style.setProperty('--abw',Math.round(BASE*CZ)+'px')}else reader.style.width=Math.round(BASE*CZ)+'px';reader.style.maxWidth='none';
  $('#wczlab').textContent=Math.round(CZ*100)+'%';try{localStorage.setItem('rough-canvas-zoom',CZ)}catch(_){}}
// 화면의 (cx,cy) 지점이 확대 뒤에도 같은 자리에 있게
function zoomTo(z,cx,cy){z=clamp(z,CZ_MIN,CZ_MAX);if(Math.abs(z-CZ)<1e-4)return;
  const r=reader.getBoundingClientRect();if(cx==null){const c=canvas.getBoundingClientRect();cx=c.left+c.width/2;cy=Math.max(STICKY,innerHeight/2)}
  const fx=(cx-r.left)/r.width,fy=(cy-r.top)/r.height;CZ=z;applyZoom();
  const r2=reader.getBoundingClientRect();scrollBy(0,r2.top+fy*r2.height-cy);canvas.scrollLeft+=r2.left+fx*r2.width-cx}
const STEPS=[.1,.25,.33,.5,.67,.75,1,1.25,1.5,2,3,4];
const stepZoom=d=>{const i=d>0?STEPS.findIndex(s=>s>CZ+1e-3):STEPS.length-1-[...STEPS].reverse().findIndex(s=>s<CZ-1e-3);zoomTo(STEPS[clamp(i,0,STEPS.length-1)]??CZ)};
function fitAll(){const ab=reader.classList.contains('artboards'),h=reader.scrollHeight/CZ,w=ab?reader.scrollWidth/CZ:BASE,avail=innerHeight-STICKY-40;CZ=clamp(Math.min(avail/h,(canvas.clientWidth-48)/w),CZ_MIN,CZ_MAX);applyZoom();canvas.scrollLeft=0;
  scrollTo(0,reader.getBoundingClientRect().top+scrollY-STICKY-12)}
// 폭 맞춤(모바일 첫 화면): 캔버스 폭에 원고 폭을 맞춤
function fitWidth(){CZ=clamp((canvas.clientWidth-16)/BASE,CZ_MIN,1);applyZoom();canvas.scrollLeft=0}
function fitSelected(){const g=selGroup();if(!g){fitAll();return}const b=g.getBoundingClientRect(),h=b.height/CZ,w=b.width/CZ;
  CZ=clamp(Math.min((innerHeight-STICKY-60)*.85/h,(canvas.clientWidth-48)/w),CZ_MIN,CZ_MAX);applyZoom();g.scrollIntoView({block:'center',inline:'center'})}
canvas.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey)||e.defaultPrevented)return;e.preventDefault();
  zoomTo(CZ*Math.exp(-e.deltaY*(Math.abs(e.deltaY)<20?.01:.0015)),e.clientX,e.clientY)},{passive:false});
$('#wczin').addEventListener('click',()=>stepZoom(1));$('#wczout').addEventListener('click',()=>stepZoom(-1));
$('#wczlab').addEventListener('click',()=>zoomTo(1));

// ---------- 손 도구: Space 누른 채 끌기, 가운데 버튼 끌기 ----------
let space=false,pan=null;
document.addEventListener('keydown',e=>{if(e.code!=='Space'||!inEdit()||typingIn(e.target)||e.target.closest?.('button,[data-letter],[data-page-gap]'))return;e.preventDefault();if(!space){space=true;canvas.classList.add('panning')}});
document.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;canvas.classList.remove('panning')}});
addEventListener('blur',()=>{space=false;canvas.classList.remove('panning')});
const handTool=()=>window.RoughWS?.tool==='hand';
canvas.addEventListener('pointerdown',e=>{if(!((space||handTool())&&e.button===0)&&e.button!==1)return;e.preventDefault();e.stopPropagation();
  pan={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('panning-on')},true);
canvas.addEventListener('pointermove',e=>{if(pan?.id!==e.pointerId)return;scrollBy(0,pan.y-e.clientY);canvas.scrollLeft+=pan.x-e.clientX;pan.x=e.clientX;pan.y=e.clientY});
const endPan=e=>{if(pan?.id===e.pointerId){pan=null;canvas.classList.remove('panning-on')}};
canvas.addEventListener('pointerup',endPan);canvas.addEventListener('pointercancel',endPan);

// ---------- 그림 편집 모드 ----------
function setCrop(group){const key=group?pageKey(group):'';if(key===cropKey)return;cropKey=key;markCrop();zoomTip.dataset.mode='';
  if(key)$('#wst').textContent=`그림 편집 · ${MODK} + 휠로 확대·축소, 끌어서 이동, Esc로 끝내기`;else if(/^그림 편집/.test($('#wst').textContent))$('#wst').textContent=''}
function markCrop(){reader.querySelectorAll('[data-slot-index]').forEach(g=>g.classList.toggle('crop',!!cropKey&&pageKey(g)===cropKey))}
// 컷 더블클릭: 프레임 모양 모드 켜고 끄기(그림 편집은 상황 막대 「그림 편집」 · 레이어 「그림」 더블클릭)
// 첫 클릭에 화면이 다시 그려져 dblclick 대상이 사라지므로 누름 두 번을 직접 잰다
{let last=null;reader.addEventListener('pointerdown',e=>{if(!pageEditing||e.button!==0||e.shiftKey)return;const art=e.target.closest('[data-art]');if(!art||e.target.closest('[data-letter],[data-page-gap],[data-fh]')){last=null;return}
  const g=art.closest('[data-slot-index]'),k=pageKey(g),now=performance.now();
  if(last&&last.k===k&&now-last.t<420&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<(e.pointerType==='touch'?14:6)){last=null;if(pageSelection!==k)selectPageCut(g);if(cropKey)setCrop(null);setFrameShape(frameShapeKey===k?null:k);return}
  last={k,t:now,x:e.clientX,y:e.clientY}},true)}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&frameShapeKey&&inEdit()){setFrameShape(null)}});
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);markFrameShape();return r}}
reader.addEventListener('pointerdown',e=>{if(!cropKey)return;const g=e.target.closest('[data-slot-index]');if(!g||pageKey(g)!==cropKey||e.target.closest('[data-letter]'))setCrop(null)},true);

// ---------- 컷 이동 ----------
const groups=()=>[...reader.querySelectorAll('[data-slot-index]')];
const selGroup=()=>groups().find(g=>pageKey(g)===pageSelection);
function goCut(d){const gs=groups();if(!gs.length)return;const i=gs.findIndex(g=>pageKey(g)===pageSelection);const g=gs[clamp(i<0?0:i+d,0,gs.length-1)];
  pageCut.value=pageKey(g);pageCut.dispatchEvent(new Event('change'))}
function goScene(d){const gs=groups();const cur=selGroup();const sc=cur?+cur.closest('section').dataset.pageScene:-1;
  const g=d>0?gs.find(x=>+x.closest('section').dataset.pageScene>sc):[...gs].reverse().find(x=>+x.closest('section').dataset.pageScene<sc);
  if(g){const first=gs.find(x=>x.closest('section')===g.closest('section'));pageCut.value=pageKey(first);pageCut.dispatchEvent(new Event('change'))}}

// ---------- 레이어 패널(목차 확장) ----------
const OPEN=new Set(),SHUT=new Set(),HIDE=new Set();
const kindOf=k=>/^dialog/.test(k)?'말풍선':/^caption/.test(k)?'나레이션':/^(effect|material)/.test(k)?'효과음':'식자';
const ICON={칸:'▢',그림:'▨',말풍선:'◯',나레이션:'▭',효과음:'✶',식자:'T',효과선:'✳',이미지:'▣',배경:'◐'};
const eye=(on,key,label)=>`<button class="teye${on?'':' off'}" data-teye="${esc(key)}" aria-pressed="${!on}" aria-label="${esc(label)} ${on?'숨기기':'보이기'}" title="편집 화면에서만 숨겨요(내보내기에는 들어가요)">${on?'<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>':'<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1"/></svg>'}</button>`;
editTree=function(){const el=$('#wtoc');if(!el)return;const by={};
  groups().forEach(g=>{const sc=+g.closest('section').dataset.pageScene;(by[sc]||=[]).push(g)});
  const curLetter=selectedLetter?.dataset.letter;
  const parts=SCENES.map((sc,i)=>{const ps=scenePanels(i),gs=by[i]||[];
    return `<a class="tsc" href="#ws-${i}" data-toc="${i}">${esc(sceneLabel(sc,i))}<small>${gs.length}컷</small></a>`+gs.map(g=>{const k=pageKey(g),n=+g.dataset.p,p=ps[n]||{};
      const has=!!cutImg(i,n,p),open=OPEN.has(k)||(k===pageSelection&&!SHUT.has(k));
      const rows=open?[`<button class="tlay" data-tlayer="${esc(k)}|frame" aria-current="${LP(k,'frame')}" title="Delete: 컷 지우기"><span class="ti">${ICON.칸}</span>칸</button>`,
        `<button class="tlay" data-tlayer="${esc(k)}|art" aria-current="${LP(k,'art')}" title="더블클릭: 그림 편집 · Delete: 넣은 그림만 빼기"><span class="ti">${ICON.그림}</span>그림<small>${has?'이미지':'레퍼런스'}</small></button>`,
        ...extraRows(k,i,+g.dataset.slotIndex),
        ...[...g.querySelectorAll('[data-letter]')].map(L=>{const lk=L.dataset.letter,kind=kindOf(lk),hk=k+'|'+lk,txt=(L.dataset.letterText||'').replace(/\s+/g,' ');
          return `<div class="tlrow"><button class="tlay" data-tlayer="${esc(hk)}" title="더블클릭: 문구 고치기 · Delete: 지우기" aria-current="${k===pageSelection&&lk===curLetter}"><span class="ti">${ICON[kind]}</span><span class="tt">${esc(txt||kind)}</span></button>${eye(!HIDE.has(hk),hk,kind)}</div>`})].join(''):'';
      return `<div class="tcutrow"><button class="texp" data-texp="${esc(k)}" aria-expanded="${open}" aria-label="${n+1}컷 레이어 ${open?'접기':'펼치기'}">▸</button><button class="tcut" data-tcut="${esc(k)}" aria-current="${k===pageSelection}"><i class="${has?'on':''}" title="${has?'이미지 등록됨':'러프'}"></i>${n+1}컷<small>${esc(p.shot||'')}</small></button></div>${open?`<div class="tlayers">${rows}</div>`:''}`}).join('')});
  // 바뀐 씬만 갈아 끼움(70컷이면 패널 전체를 다시 만드는 데 10~20ms, 썸네일·잠금 단추도 다시 달아야 했음)
  const olds=[...el.querySelectorAll(':scope>.tsw')],prev=el._tparts;
  if(prev&&prev.length===parts.length&&olds.length===parts.length){parts.forEach((h,i)=>{if(h!==prev[i])olds[i].innerHTML=h})}
  else el.innerHTML=parts.map((h,i)=>`<div class="tsw" data-tsw="${i}">${h}</div>`).join('');
  el._tparts=parts};
// 칸에 붙는 에셋(배경 · 효과선 · 이미지 소재)도 레이어 줄로 — 누르면 고르고 Delete로 지움
function extraRows(k,si,slot){const e=SCENES[si]?.pageEdits?.[slot]||{},rows=[];const row=(what,icon,label,sub,title)=>`<button class="tlay" data-tlayer="${esc(k)}|${what}" aria-current="${LP(k,what)}" title="${title}"><span class="ti">${icon}</span>${label}${sub?`<small>${esc(sub)}</small>`:''}</button>`;
  const bg=[e.transition?'전환 질감':'',/^#/.test(e.background||'')?'배경색':'',e.bgImage?'배경 이미지':''].filter(Boolean);
  if(bg.length)rows.push(row('bg',ICON.배경,'배경',bg.join(' · '),'Delete: 이 컷 배경(전환·색·이미지) 지우기'));
  Object.keys(e.materialLines||{}).forEach(kd=>rows.push(row('line:'+kd,ICON.효과선,kd==='speed'?'속도선':'집중선','효과선','Delete: 효과선 지우기 · 색은 상황 막대')));
  (e.overlays||[]).forEach((o,n)=>rows.push(row('ov:'+n,ICON.이미지,'이미지 소재 '+(n+1),IMG.overlay?.[o.id]?.name||'','Delete: 이미지 소재 빼기')));
  return rows}
function applyHidden(){reader.querySelectorAll('[data-letter]').forEach(L=>{const g=L.closest('[data-slot-index]');L.style.visibility=HIDE.has(pageKey(g)+'|'+L.dataset.letter)?'hidden':''})}
// 레이어 패널에서 고른 것을 화면 가운데로: 다른 스크롤(컷 고르기)이 끝난 뒤 한 번 더 맞춤. 위쪽 고정 막대 높이를 빼고 가운데
function reveal(get){const go=smooth=>{const el=get();if(!el)return;const r=el.getBoundingClientRect(),top=STICKY,mid=top+(innerHeight-top)/2;
    const dy=r.top+r.height/2-mid;if(Math.abs(dy)>4)scrollTo({top:scrollY+dy,behavior:smooth?'smooth':'auto'});
    const c=canvas.getBoundingClientRect(),dx=r.left+r.width/2-(c.left+c.width/2);if(Math.abs(dx)>4&&canvas.scrollWidth>canvas.clientWidth)canvas.scrollLeft+=dx};
  requestAnimationFrame(()=>go(true));setTimeout(()=>go(false),450)}
$('#wtoc').addEventListener('click',e=>{
  const x=e.target.closest('[data-texp]');if(x){const k=x.dataset.texp;if(x.getAttribute('aria-expanded')==='true'){OPEN.delete(k);SHUT.add(k)}else{OPEN.add(k);SHUT.delete(k)}editTree();return}
  const v=e.target.closest('[data-teye]');if(v){const k=v.dataset.teye;HIDE.has(k)?HIDE.delete(k):HIDE.add(k);applyHidden();editTree();return}
  const l=e.target.closest('[data-tlayer]');if(l){const [scene,slot,what]=l.dataset.tlayer.split('|').flatMap((s,i)=>i?[s]:s.split(':'));const key=scene+':'+slot;
    const g=groups().find(x=>pageKey(x)===key);if(!g)return;if(pageSelection!==key)selectPageCut(g);
    if(what==='frame'||what==='art'||what==='bg'||/^(line|ov):/.test(what)){selectLetter(null);window.layerPart={key,what};reveal(()=>groups().find(x=>pageKey(x)===key))}
    else{window.layerPart=null;const L=g.querySelector(`[data-letter="${CSS.escape(what)}"]`);if(L){selectLetter(L);reveal(()=>groups().find(x=>pageKey(x)===key)?.querySelector(`[data-letter="${CSS.escape(what)}"]`));L.focus({preventScroll:true});if(e.detail===2)window.focusLetterText?.()}}
    if(what==='art'&&e.detail===2)setCrop(g);  // 클릭마다 패널을 다시 그려 dblclick이 안 오는 경우가 있어 detail로 판별
    editTree()}});

// 레이어 패널에서 칸·그림 줄을 고른 상태(Delete가 무엇을 지울지 정함). 다른 컷·식자·캔버스를 누르면 풀림
window.layerPart=null;
function LP(k,w){return !!window.layerPart&&window.layerPart.key===k&&window.layerPart.what===w&&!selectedLetter}
// 캔버스에서 컷을 누르면 레이어 패널의 「칸」 줄(컷 자체)을 고른 것으로 — 모퉁이는 컷 확대·축소. 그림 확대는 「그림」 줄(패널과 캔버스가 같은 것을 가리키게). 식자·간격·빈 곳은 풀림
reader.addEventListener('pointerdown',e=>{if(!inEdit())return;const g=e.target.closest('[data-slot-index]');
  const onArt=g&&!e.target.closest('[data-letter],[data-page-gap],[data-fh],[data-th]');const next=onArt?{key:pageKey(g),what:'frame'}:null;
  if(JSON.stringify(next)!==JSON.stringify(window.layerPart)){window.layerPart=next;setTimeout(editTree,0)}},true);
// 선택이 바뀌면 레이어 패널도 다시
{const _sc=selectPageCut;selectPageCut=function(...a){const prev=pageSelection,r=_sc(...a);if(pageSelection!==prev){if(window.layerPart?.key!==pageSelection)window.layerPart=null;if(frameShapeKey&&frameShapeKey!==pageSelection)setFrameShape(null);if(inEdit())editTree()}return r}}
// 캔버스 ↔ 레이어 패널: 여러 개 고른 식자도 표시, 접어 둔 컷의 식자를 고르면 펼치고, 고른 줄이 패널 밖이면 패널을 굴려 보이게
window.syncTree=function syncTree(){const el=$('#wtoc');if(!el||!inEdit())return;const M=window.RoughWS?.MULTI;
  const sl=selectedLetter&&pageSelection+'|'+selectedLetter.dataset.letter;el.querySelectorAll('.tlrow [data-tlayer]').forEach(b=>b.setAttribute('aria-current',b.dataset.tlayer===sl||!!M?.has(b.dataset.tlayer)));
  const cur=el.querySelector('.tlrow [aria-current="true"],.tlay[aria-current="true"]')||el.querySelector('[data-tcut][aria-current="true"]');if(!cur){syncTree.last='';return}
  // 고른 것이 바뀌었을 때만, 화면을 그린 다음에 위치를 잼(바로 재면 큰 화면을 다시 계산해 느림)
  const id=cur.dataset.tcut||cur.dataset.tlayer;if(id===syncTree.last)return;syncTree.last=id;
  requestAnimationFrame(()=>{const cur=el.querySelector(`[data-tlayer="${CSS.escape(id)}"],[data-tcut="${CSS.escape(id)}"]`);if(!cur)return;
  let sc=el.parentElement;while(sc&&!(sc.scrollHeight>sc.clientHeight&&/(auto|scroll)/.test(getComputedStyle(sc).overflowY)))sc=sc.parentElement;if(!sc||sc===document.body||sc===document.documentElement)return;
  const r=cur.getBoundingClientRect(),c=sc.getBoundingClientRect(),pad=48;if(r.top<c.top+8)sc.scrollTop-=c.top-r.top+pad;else if(r.bottom>c.bottom-8)sc.scrollTop+=r.bottom-c.bottom+pad})};
{const _et=editTree;editTree=function(...a){const r=_et(...a);window.syncTree();return r}}
{const _sl=selectLetter;selectLetter=function(...a){const prev=selectedLetter,r=_sl(...a);if(selectedLetter)window.layerPart=null;
  if(selectedLetter&&selectedLetter!==prev&&inEdit()&&SHUT.has(pageSelection)){SHUT.delete(pageSelection);editTree();return r}if(selectedLetter!==prev&&inEdit())$('#wtoc').querySelectorAll('[data-tlayer]').forEach(b=>{const p=b.dataset.tlayer.split('|');b.setAttribute('aria-current',!!selectedLetter&&p[0]===pageSelection&&p[1]===selectedLetter.dataset.letter)});if(selectedLetter!==prev)window.syncTree();return r}}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);if(cropKey&&!groups().some(g=>pageKey(g)===cropKey))cropKey='';markCrop();applyHidden();applyZoom();return r}}

// 미니맵은 없앰(화면 전체 복제가 편집마다 ~90ms) — 예전 호출 자리용 빈 객체
const mini={refresh(){},view(){},hide(){},box:null};
{const _sv=showView;showView=function(v){const r=_sv(v);if(v!=='webtoon'){closeRead();setCrop(null)}return r}}
const preview=()=>$('#v-webtoon').classList.contains('preview');

// ---------- 읽기 모드(피그마 Present · 클립스튜디오 웹툰 미리보기) ----------
const rd=document.createElement('div');rd.className='readmode';rd.hidden=true;rd.setAttribute('role','dialog');rd.setAttribute('aria-modal','true');rd.setAttribute('aria-label','읽기 모드');
rd.innerHTML=`<div class="rd-bar"><b id="rdtitle"></b><div class="seg3" id="rdw" role="group" aria-label="화면 폭"><button data-w="360" aria-pressed="false">360</button><button data-w="390" aria-pressed="true">390</button><button data-w="430" aria-pressed="false">430</button></div><button class="btn" id="rdclose">닫기 <kbd>Esc</kbd></button></div><div class="rd-phone"><div class="rd-scroll" id="rdscroll" tabindex="0"></div></div>`;
document.body.appendChild(rd);let lastFocus=null;
function openRead(){if(!inEdit())return;lastFocus=document.activeElement;
  const parts=SCENES.map((sc,i)=>{const ps=scenePanels(i);return ps.length?sceneArt(i,ps,`r${i}_`,false).svg:''}).filter(Boolean);
  $('#rdscroll').innerHTML=`<div class="rd-head">${esc($('#wtitle').value||'제목 없음')}</div>${parts.join('')}<div class="rd-end">끝 · 씬 ${parts.length}개</div>`;
  $('#rdtitle').textContent=($('#wtitle')?.value||'').trim()||'읽기 모드';rd.hidden=false;document.body.style.overflow='hidden';$('#rdscroll').scrollTop=0;$('#rdscroll').focus()}
function closeRead(){if(rd.hidden)return;rd.hidden=true;document.body.style.overflow='';$('#rdscroll').innerHTML='';lastFocus?.focus?.()}
$('#wread').addEventListener('click',openRead);$('#rdclose').addEventListener('click',closeRead);
rd.addEventListener('click',e=>{if(e.target===rd)closeRead();const b=e.target.closest('[data-w]');if(b){rd.style.setProperty('--rdw',b.dataset.w+'px');rd.querySelectorAll('[data-w]').forEach(x=>x.setAttribute('aria-pressed',x===b))}});

// ---------- 단축키 ----------
const KEYS=[...([['씬 쓰기',[['[그날 밤]','식자(나레이션)'],['@준 "(놀라서)에드가?"','대사 · 괄호 안은 연기'],['-툭-','효과음'],['그 밖의 글','행동·장면 묘사'],['@','인물 목록 열기'],['Ctrl + Enter','아래에 새 컷']]]]),['어디서나',[['?','단축키 보기'],['Esc','닫기 · 선택 해제']]],
  ['편집 · 캔버스',[[`${MODK} + 휠 / 핀치`,'캔버스 확대·축소'],[`${MODK} + = / −`,'한 단계 확대·축소'],['Shift + 0','100%'],['Shift + 1','전체 보기'],['Shift + 2','선택한 컷 보기'],['Shift + G','휴대폰 한 화면 선 켜기·끄기'],['Space + 끌기','캔버스 이동(가운데 버튼 끌기도)']]],
  ['편집 · 선택',[['[ / ]','이전 · 다음 컷'],['Shift + [ / ]','이전 · 다음 씬'],['그림 더블클릭',`그림 편집: ${MODK} + 휠 확대, 끌어 이동`],['방향키','식자 1px 이동 (Shift 10px)'],['Shift + 클릭 · 빈 곳 끌기','식자 여러 개 고르기'],['Shift + 끌기','가로·세로로만 옮기기'],['끌 때 Ctrl','맞춤선 끄기'],['Alt + 끌기','복제하며 옮기기'],[`${MODK} + C / V / D`,'식자 복사 · 붙여넣기 · 복제'],[`${MODK} + A`,'고른 컷의 식자 전부'],[`${MODK} + ] / [`,'겹침 순서 앞·뒤 (Shift: 맨 앞·맨 뒤)'],['Enter','글자 고치기'],['Tab / Shift + Tab','다음 · 이전 식자'],['위 동그란 손잡이','돌리기 (Shift 15°)'],['레이어 줄 끌기','컷 순서 · 식자 겹침 순서'],['Delete / Backspace','고른 식자·컷 지우기 (Ctrl+Z로 되돌리기)'],['우클릭 · Shift+F10','고른 것에 맞는 메뉴'],['식자 모서리 끌기','크기 (Shift: 5% 단위)'],['컷 그림 모서리 끌기 · Alt+휠','그림 확대 (확대한 그림은 바로 끌어 옮김)'],[`${MODK} + Z`,'실행 취소 (Shift 다시 실행)'],['P','읽기 모드']]]];
const kd=document.createElement('dialog');kd.className='keysdlg';kd.setAttribute('aria-labelledby','kdt');
kd.innerHTML=`<h3 id="kdt">도움말</h3>${KEYS.map(([h,rows])=>`<h4>${h}</h4><dl>${rows.map(([k,d])=>`<dt>${k.split(' / ').map(x=>`<kbd>${esc(x)}</kbd>`).join(' / ')}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`).join('')}<form method="dialog"><button class="btn dark">닫기</button></form>`;
document.body.appendChild(kd);$('#gkeys').addEventListener('click',()=>kd.showModal());
document.addEventListener('keydown',e=>{if(typingIn(e.target))return;
  if(e.key==='?'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();kd.open?kd.close():kd.showModal();return}
  if(!rd.hidden){if(e.key==='Escape'){e.preventDefault();closeRead()}return}
  if(!inEdit()||kd.open)return;
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&(e.key==='='||e.key==='+')){e.preventDefault();stepZoom(1);return}
  if(mod&&(e.key==='-'||e.key==='_')){e.preventDefault();stepZoom(-1);return}
  if(mod&&e.key==='0'){e.preventDefault();zoomTo(1);return}
  if(mod||e.altKey)return;
  if(e.shiftKey&&e.code==='Digit0'){e.preventDefault();zoomTo(1);return}
  if(e.shiftKey&&e.code==='Digit1'){e.preventDefault();fitAll();return}
  if(e.shiftKey&&e.code==='Digit2'){e.preventDefault();fitSelected();return}
  if(e.shiftKey&&e.code==='KeyG'&&!typingIn(e.target)){e.preventDefault();setGuide(!PG);return}
  if(e.code==='BracketLeft'||e.code==='BracketRight'){e.preventDefault();const d=e.code==='BracketRight'?1:-1;e.shiftKey?goScene(d):goCut(d);return}
  if((e.key==='p'||e.key==='P')&&!e.shiftKey){e.preventDefault();openRead();return}
  if(e.key==='Escape'&&cropKey){e.preventDefault();setCrop(null)}},true);

// 상단 씬 선택: 편집 화면에서는 그 씬으로 스크롤
{const _sw=switchScene;switchScene=function(i){const r=_sw(i);if(inEdit())document.getElementById('ws-'+i)?.scrollIntoView({behavior:'smooth'});return r}}

applyZoom();
// ---------- 터치(태블릿·펜): 두 손가락 벌리기 = 캔버스 확대, 길게 누르기 = 우클릭 메뉴 ----------
{const T=new Map();let pinch=null,lp=null;
  const dist=()=>{const [a,b]=[...T.values()];return Math.hypot(a.x-b.x,a.y-b.y)},mid=()=>{const [a,b]=[...T.values()];return [(a.x+b.x)/2,(a.y+b.y)/2]};
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!inEdit())return;T.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(T.size===2){clearTimeout(lp?.t);lp=null;pinch={d:dist(),z:CZ};e.preventDefault()}
    else if(T.size===1){const tgt=e.target,x=e.clientX,y=e.clientY;lp={x,y,t:setTimeout(()=>{lp=null;if(T.size!==1)return;
      tgt.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y}));navigator.vibrate?.(15)},550)}}},true);
  canvas.addEventListener('pointermove',e=>{const p=T.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
    if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10){clearTimeout(lp.t);lp=null}
    if(pinch&&T.size===2){const [mx,my]=mid();zoomTo(pinch.z*dist()/pinch.d,mx,my)}},true);
  const up=e=>{if(!T.delete(e.pointerId))return;if(lp){clearTimeout(lp.t);lp=null}if(T.size<2)pinch=null};
  canvas.addEventListener('pointerup',up,true);canvas.addEventListener('pointercancel',up,true)}
// SVG 안쪽 요소는 touch-action을 따르지 않아, 식자·손잡이를 손가락으로 끌면 브라우저가 스크롤로 가져가 끌기가 끊겼음 → 끌 수 있는 것 위에서 시작한 한 손가락 터치는 스크롤 막기
canvas.addEventListener('touchstart',e=>{if(!inEdit()||e.touches.length!==1)return;
  if(e.target.closest?.('[data-letter],[data-fh],[data-page-gap] .gap-grip,.gap-grip,.tail-handle,[data-tail-handle],[data-slot-index].crop [data-art]'))e.preventDefault()},{passive:false});
// ---------- 휴대폰 한 화면 기준선: 웹툰은 폭을 화면 폭에 맞춰 보므로 한 화면 높이 = 원고 폭 × 1.9(390×740 보이는 영역) ----------
const PHONE=1.9;let PG=false;try{PG=localStorage.getItem('rough-phone-guide')==='1'}catch(_){}
function drawGuide(){reader.querySelectorAll('.phoneguide').forEach(x=>x.remove());if(!PG||!inEdit()||reader.classList.contains('artboards'))return;
  const R=reader.getBoundingClientRect(),segs=[...reader.querySelectorAll(':scope>section>svg')].map(v=>{const r=v.getBoundingClientRect();return {top:r.top-R.top,h:r.height,w:r.width}}).filter(x=>x.h>0);if(!segs.length)return;
  const S=segs[0].w*PHONE,total=segs.reduce((a,x)=>a+x.h,0),box=document.createElement('div');box.className='phoneguide';box.setAttribute('aria-hidden','true');let html='';
  for(let n=1,y=S;y<total;n++,y+=S){let rem=y,top=null;for(const g of segs){if(rem<=g.h){top=g.top+rem;break}rem-=g.h}if(top==null)break;html+=`<div style="top:${top.toFixed(1)}px"><span>${n}화면</span></div>`}
  box.innerHTML=html;reader.appendChild(box)}
function setGuide(on){PG=!!on;try{localStorage.setItem('rough-phone-guide',PG?'1':'0')}catch(_){}drawGuide()}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);drawGuide();return r}}
// C-10 화면 밖 씬 건너뛰기: 씬마다 자리 크기(SVG 비율 × 지금 폭)를 미리 알려 줘서 스크롤 막대가 튀지 않게. ?novirt 또는 rough-virt=0이면 끔
const VIRT=!/[?&]novirt/.test(location.search)&&(()=>{try{return localStorage.getItem('rough-virt')!=='0'}catch(_){return true}})();
// 씬 제목 줄·씬 추가 단추 높이(EXTRA)는 처음 한 번 실제로 재어 둠. 크기는 늘 계산값을 씀('auto'로 예전 크기를 기억하면 확대 뒤 높이가 어긋남)
let EXTRA=0;
function sizeSections(){if(!VIRT){reader.classList.remove('virt');return}const secs=[...reader.querySelectorAll(':scope>section')];if(!secs.length)return;
  // 제목 줄·씬 추가 단추 높이: 지금 화면에 보이는(그려진) 씬에서 잼 — 다른 화면 보강 코드가 단추를 붙인 뒤라 다음 프레임에
  reader.classList.add('virt');cancelAnimationFrame(sizeSections.raf);sizeSections.raf=requestAnimationFrame(()=>{const vis=secs.find(sc=>{const r=sc.getBoundingClientRect();return sc.isConnected&&r.bottom>0&&r.top<innerHeight});
    const v=vis?.querySelector(':scope>svg');if(v){const ex=Math.round(vis.offsetHeight-v.getBoundingClientRect().height);if(ex>0&&ex<400&&ex!==EXTRA){EXTRA=ex;sizeSections()}}});const ab=reader.classList.contains('artboards'),w=ab?BASE*CZ:(reader.clientWidth||BASE*CZ);
  secs.forEach(sec=>{const svg=sec.querySelector(':scope>svg');const vb=svg?.viewBox?.baseVal;if(!vb||!vb.width){sec.style.containIntrinsicSize='';return}
    const h=Math.round(vb.height*w/vb.width+(EXTRA||48));const v=`${Math.round(w)}px ${h}px`;if(sec.style.containIntrinsicSize!==v)sec.style.containIntrinsicSize=v})}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);sizeSections();return r}}
{const _az=applyZoom;applyZoom=function(...a){const r=_az(...a);sizeSections();return r}}
{const _az=applyZoom;applyZoom=function(...a){const r=_az(...a);drawGuide();return r}}
addEventListener('resize',()=>drawGuide());
// ---------- 말풍선 읽는 순서(대사만 · 나레이션은 기본 자리가 컷 아래라 빼고): 글에 쓴 순서대로 번호, 화면 위치(위→아래, 같은 높이면 왼→오)로 읽히는 순서와 다르면 빨간 표시 ----------
let RO=false;try{RO=localStorage.getItem('rough-read-order')==='1'}catch(_){}
function readOrder(g){const Ls=[...g.querySelectorAll('[data-letter^="dialog-"]')];if(Ls.length<2)return [];
  const si=+g.closest('section').dataset.pageScene,slot=+g.dataset.slotIndex,txt=(SCENES[si]?.cuts?.[slot]||'');
  const items=Ls.map(L=>{const b=(L.querySelector('[data-balloon] > path, [data-balloon] path')||L.querySelector('[data-balloon]')||L).getBoundingClientRect(),t=(L.dataset.letterText||'').trim(),at=t?txt.indexOf(t.split('\n')[0].slice(0,12)):-1;
    return {L,b,id:L.dataset.letter,at}});
  // 글 순서: 문구가 글에 나오는 자리, 못 찾으면 나레이션 먼저·번호순
  const key=x=>x.at>=0?x.at:(x.id.startsWith('caption')?-1:1e6)+(parseInt(x.id.split('-')[1])||0);
  const want=[...items].sort((a,b)=>key(a)-key(b));
  const seen=[...items].sort((a,b)=>{const dy=(a.b.top+a.b.height/2)-(b.b.top+b.b.height/2),h=Math.min(a.b.height,b.b.height)*.35;return Math.abs(dy)<h?(a.b.left-b.b.left):dy});
  return want.map((x,i)=>({...x,n:i+1,pos:seen.indexOf(x)+1}))}
function drawOrder(){reader.querySelectorAll('.readorder').forEach(x=>x.remove());if(!RO||!inEdit()||reader.classList.contains('artboards'))return 0;
  const R=reader.getBoundingClientRect(),box=document.createElement('div');box.className='readorder';box.setAttribute('aria-hidden','true');let bad=0,html='';
  reader.querySelectorAll(':scope>section [data-slot-index]').forEach(g=>{readOrder(g).forEach(x=>{const ok=x.n===x.pos;if(!ok)bad++;
    html+=`<span class="${ok?'':'bad'}" style="left:${(x.b.left-R.left-6).toFixed(1)}px;top:${(x.b.top-R.top-6).toFixed(1)}px" title="${ok?`${x.n}번째로 읽혀요`:`글에선 ${x.n}번째인데 위치상 ${x.pos}번째로 읽혀요`}">${x.n}${ok?'':` <small>→${x.pos}</small>`}</span>`})});
  box.innerHTML=html;reader.appendChild(box);return bad}
function setOrder(on){RO=!!on;try{localStorage.setItem('rough-read-order',RO?'1':'0')}catch(_){}const bad=drawOrder();
  if(RO)window.RoughWS?.flash?.(bad?`읽는 순서가 글과 다른 말풍선 ${bad}개 · 빨간 번호를 확인해요`:'모든 말풍선이 글 순서대로 읽혀요')}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);drawOrder();return r}}
{const _az=applyZoom;applyZoom=function(...a){const r=_az(...a);drawOrder();return r}}
addEventListener('resize',()=>drawOrder());
// ---------- 레이어 패널 여러 개 고르기: Ctrl(⌘)+클릭 = 하나씩 더하기·빼기, Shift+클릭 = 범위 ----------
// 한 컷 안의 식자끼리면 식자 여러 개, 두 컷 이상에 걸치면 컷 여러 개(요소가 아니라 컷 단위로)
const MC=new Set();let mcAnchor=null;
const tocCuts=()=>[...$('#wtoc').querySelectorAll('[data-tcut]')].map(b=>b.dataset.tcut);
function markMC(){reader.querySelectorAll('[data-slot-index]').forEach(g=>g.classList.toggle('mcut',MC.size>1&&MC.has(pageKey(g))));
  if(MC.size>1)$('#wtoc').querySelectorAll('[data-tcut]').forEach(b=>b.setAttribute('aria-current',String(MC.has(b.dataset.tcut))));window.RoughWS?.renderCtx?.()}
function setMC(keys){MC.clear();keys.forEach(k=>k&&MC.add(k));if(MC.size>1){window.RoughWS?.clearMulti?.();selectLetter(null);window.layerPart=null}markMC();
  if(MC.size>1)window.RoughWS?.flash?.(`컷 ${MC.size}개를 골랐어요 · 위 막대에서 간격·빈 컷·잠금·지우기를 한 번에`)}
function clearMC(){if(!MC.size)return;MC.clear();markMC()}
$('#wtoc').addEventListener('click',e=>{if(!inEdit())return;const mod=e.shiftKey||e.ctrlKey||e.metaKey;
  const c=e.target.closest('[data-tcut]'),l=e.target.closest('[data-tlayer]');if(!c&&!l)return;
  if(!mod){if(MC.size)clearMC();return}
  const parts=(c?c.dataset.tcut:l.dataset.tlayer).split('|'),key=parts[0],what=parts[1];
  const MULTI=window.RoughWS?.MULTI,baseCut=selectedLetter?pageKey(selectedLetter.closest('[data-slot-index]')):pageSelection;
  // 같은 컷 안 식자끼리: 식자 여러 개
  if(l&&!c&&what&&what!=='frame'&&what!=='art'&&MC.size<2&&key===baseCut&&[...(MULTI||[])].every(k=>k.startsWith(key+'|'))){
    const g=groups().find(x=>pageKey(x)===key),L=g?.querySelector(`[data-letter="${CSS.escape(what)}"]`);if(!L)return;
    e.preventDefault();e.stopImmediatePropagation();if(!selectedLetter)selectLetter(L);else window.RoughWS.toggleMulti(L);mcAnchor=key;return}
  // 그 밖: 컷 여러 개
  e.preventDefault();e.stopImmediatePropagation();
  const seed=MC.size?[...MC]:[baseCut,...[...(MULTI||[])].map(k=>k.split('|')[0])].filter(Boolean);const set=new Set(seed);
  if(e.shiftKey&&(mcAnchor||baseCut)){const all=tocCuts(),a=all.indexOf(mcAnchor||baseCut),b=all.indexOf(key);if(a>=0&&b>=0){const [lo,hi]=a<b?[a,b]:[b,a];all.slice(lo,hi+1).forEach(k=>set.add(k))}else set.add(key)}
  else set.has(key)&&set.size>1?set.delete(key):set.add(key);
  mcAnchor=key;setMC([...set])},true);
reader.addEventListener('pointerdown',e=>{if(MC.size&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey)clearMC()},true);
document.addEventListener('keydown',e=>{if(!inEdit()||MC.size<2||typingIn(e.target))return;
  if(e.key==='Escape'){clearMC();return}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopImmediatePropagation();window.RoughWS?.multiCut?.('del')}},true);
{const _et=editTree;editTree=function(...a){const r=_et(...a);if(MC.size>1)markMC();return r}}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);if(MC.size){[...MC].forEach(k=>{if(!groups().some(g=>pageKey(g)===k))MC.delete(k)});markMC()}return r}}
// ---------- 씬 고르기: 레이어 패널의 씬 제목 줄을 누르면 씬을 고름 → Delete(또는 위 막대 「씬 지우기」)로 씬 지우기 ----------
let SCSEL=null;
function markScene(){$('#wtoc').querySelectorAll('.tsc[data-toc]').forEach(a=>{const on=SCSEL!=null&&+a.dataset.toc===SCSEL;a.classList.toggle('on',on);a.setAttribute('aria-current',String(on))});
  reader.querySelectorAll(':scope>section').forEach(sec=>sec.classList.toggle('scsel',SCSEL!=null&&+sec.dataset.pageScene===SCSEL));window.RoughWS?.renderCtx?.()}
function selectScene(i){SCSEL=i;if(i!=null){clearMC();window.RoughWS?.clearMulti?.();selectLetter(null);window.layerPart=null}markScene()}
function deleteSelScene(){if(SCSEL==null)return;if(SCENES.length<=1){window.RoughWS?.flash?.('씬이 하나뿐이라 지울 수 없어요');return}const i=SCSEL;const before=SCENES.length;deleteScene(i);
  if(SCENES.length<before){SCSEL=null;if(inEdit()){renderWebtoon();editTree()}markScene()}}
$('#wtoc').addEventListener('click',e=>{if(!inEdit())return;const a=e.target.closest('.tsc[data-toc]');if(a){selectScene(+a.dataset.toc);return}
  if(SCSEL!=null&&e.target.closest('[data-tcut],[data-tlayer]'))selectScene(null)},true);
reader.addEventListener('pointerdown',()=>{if(SCSEL!=null)selectScene(null)},true);
document.addEventListener('keydown',e=>{if(!inEdit()||SCSEL==null||typingIn(e.target))return;
  if(e.key==='Escape'){selectScene(null);return}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopImmediatePropagation();deleteSelScene()}},true);
{const _et=editTree;editTree=function(...a){const r=_et(...a);if(SCSEL!=null)markScene();return r}}
{const _sc=selectPageCut;selectPageCut=function(...a){const r=_sc(...a);if(SCSEL!=null&&pageSelection)selectScene(null);return r}}
window.RoughStudio={get selScene(){return SCSEL},selectScene,deleteSelScene,get mcuts(){return MC},clearMC,setMC,get readOrder(){return RO},setOrder,drawOrder,get phoneGuide(){return PG},setGuide,drawGuide,zoomTo,fitAll,fitWidth,fitSelected,setCrop,openRead,closeRead,applyZoom,mini,stepZoom,get zoom(){return CZ}};
})();
