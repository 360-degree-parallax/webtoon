// 연출(편집) 화면 보강: 캔버스 확대·이동, 그림 편집 모드, 레이어 패널, 미니맵, 읽기 모드, 단축키
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
  $('#wczlab').textContent=Math.round(CZ*100)+'%';try{localStorage.setItem('rough-canvas-zoom',CZ)}catch(_){}
  mini.view()}
// 화면의 (cx,cy) 지점이 확대 뒤에도 같은 자리에 있게
function zoomTo(z,cx,cy){z=clamp(z,CZ_MIN,CZ_MAX);if(Math.abs(z-CZ)<1e-4)return;
  const r=reader.getBoundingClientRect();if(cx==null){const c=canvas.getBoundingClientRect();cx=c.left+c.width/2;cy=Math.max(STICKY,innerHeight/2)}
  const fx=(cx-r.left)/r.width,fy=(cy-r.top)/r.height;CZ=z;applyZoom();
  const r2=reader.getBoundingClientRect();scrollBy(0,r2.top+fy*r2.height-cy);canvas.scrollLeft+=r2.left+fx*r2.width-cx}
const STEPS=[.1,.25,.33,.5,.67,.75,1,1.25,1.5,2,3,4];
const stepZoom=d=>{const i=d>0?STEPS.findIndex(s=>s>CZ+1e-3):STEPS.length-1-[...STEPS].reverse().findIndex(s=>s<CZ-1e-3);zoomTo(STEPS[clamp(i,0,STEPS.length-1)]??CZ)};
function fitAll(){const ab=reader.classList.contains('artboards'),h=reader.scrollHeight/CZ,w=ab?reader.scrollWidth/CZ:BASE,avail=innerHeight-STICKY-40;CZ=clamp(Math.min(avail/h,(canvas.clientWidth-48)/w),CZ_MIN,CZ_MAX);applyZoom();canvas.scrollLeft=0;
  scrollTo(0,reader.getBoundingClientRect().top+scrollY-STICKY-12)}
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
reader.addEventListener('dblclick',e=>{if(!pageEditing)return;const art=e.target.closest('[data-art]');if(!art||e.target.closest('[data-letter],[data-page-gap],[data-fh]'))return;
  const g=art.closest('[data-slot-index]');if(pageSelection!==pageKey(g))selectPageCut(g);setCrop(g)});
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
const ICON={칸:'▢',그림:'▨',말풍선:'◯',나레이션:'▭',효과음:'✶',식자:'T'};
const eye=(on,key,label)=>`<button class="teye${on?'':' off'}" data-teye="${esc(key)}" aria-pressed="${!on}" aria-label="${esc(label)} ${on?'숨기기':'보이기'}" title="편집 화면에서만 숨겨요(내보내기에는 들어가요)">${on?'<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>':'<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1"/></svg>'}</button>`;
editTree=function(){const el=$('#wtoc');if(!el)return;const by={};
  groups().forEach(g=>{const sc=+g.closest('section').dataset.pageScene;(by[sc]||=[]).push(g)});
  const curLetter=selectedLetter?.dataset.letter;
  el.innerHTML=SCENES.map((sc,i)=>{const ps=scenePanels(i),gs=by[i]||[];
    return `<a class="tsc" href="#ws-${i}" data-toc="${i}">${esc(sceneLabel(sc,i))}<small>${gs.length}컷</small></a>`+gs.map(g=>{const k=pageKey(g),n=+g.dataset.p,p=ps[n]||{};
      const has=!!cutImg(i,n,p),open=OPEN.has(k)||(k===pageSelection&&!SHUT.has(k));
      const rows=open?[`<button class="tlay" data-tlayer="${esc(k)}|frame"><span class="ti">${ICON.칸}</span>칸</button>`,
        `<button class="tlay" data-tlayer="${esc(k)}|art" title="더블클릭하면 그림 편집"><span class="ti">${ICON.그림}</span>그림<small>${has?'이미지':'레퍼런스'}</small></button>`,
        ...[...g.querySelectorAll('[data-letter]')].map(L=>{const lk=L.dataset.letter,kind=kindOf(lk),hk=k+'|'+lk,txt=(L.dataset.letterText||'').replace(/\s+/g,' ');
          return `<div class="tlrow"><button class="tlay" data-tlayer="${esc(hk)}" aria-current="${k===pageSelection&&lk===curLetter}"><span class="ti">${ICON[kind]}</span><span class="tt">${esc(txt||kind)}</span></button>${eye(!HIDE.has(hk),hk,kind)}</div>`})].join(''):'';
      return `<div class="tcutrow"><button class="texp" data-texp="${esc(k)}" aria-expanded="${open}" aria-label="${n+1}컷 레이어 ${open?'접기':'펼치기'}">▸</button><button class="tcut" data-tcut="${esc(k)}" aria-current="${k===pageSelection}"><i class="${has?'on':''}" title="${has?'이미지 등록됨':'러프'}"></i>${n+1}컷<small>${esc(p.shot||'')}</small></button></div>${open?`<div class="tlayers">${rows}</div>`:''}`}).join('')}).join('')};
function applyHidden(){reader.querySelectorAll('[data-letter]').forEach(L=>{const g=L.closest('[data-slot-index]');L.style.visibility=HIDE.has(pageKey(g)+'|'+L.dataset.letter)?'hidden':''})}
$('#wtoc').addEventListener('click',e=>{
  const x=e.target.closest('[data-texp]');if(x){const k=x.dataset.texp;if(x.getAttribute('aria-expanded')==='true'){OPEN.delete(k);SHUT.add(k)}else{OPEN.add(k);SHUT.delete(k)}editTree();return}
  const v=e.target.closest('[data-teye]');if(v){const k=v.dataset.teye;HIDE.has(k)?HIDE.delete(k):HIDE.add(k);applyHidden();editTree();mini.refresh();return}
  const l=e.target.closest('[data-tlayer]');if(l){const [scene,slot,what]=l.dataset.tlayer.split('|').flatMap((s,i)=>i?[s]:s.split(':'));const key=scene+':'+slot;
    const g=groups().find(x=>pageKey(x)===key);if(!g)return;if(pageSelection!==key)selectPageCut(g);
    if(what==='frame'||what==='art'){selectLetter(null);g.scrollIntoView({block:'center',behavior:'smooth'})}
    else{const L=g.querySelector(`[data-letter="${CSS.escape(what)}"]`);if(L){selectLetter(L);L.scrollIntoView({block:'center',behavior:'smooth'});L.focus({preventScroll:true})}}
    editTree()}});
$('#wtoc').addEventListener('dblclick',e=>{const l=e.target.closest('[data-tlayer$="|art"]');if(!l)return;const key=l.dataset.tlayer.split('|')[0];const g=groups().find(x=>pageKey(x)===key);if(g)setCrop(g)});

// 선택이 바뀌면 레이어 패널도 다시
{const _sc=selectPageCut;selectPageCut=function(...a){const prev=pageSelection,r=_sc(...a);if(pageSelection!==prev&&inEdit())editTree();return r}}
{const _sl=selectLetter;selectLetter=function(...a){const prev=selectedLetter,r=_sl(...a);if(selectedLetter!==prev&&inEdit())$('#wtoc').querySelectorAll('[data-tlayer]').forEach(b=>{const p=b.dataset.tlayer.split('|');b.setAttribute('aria-current',!!selectedLetter&&p[0]===pageSelection&&p[1]===selectedLetter.dataset.letter)});return r}}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);if(cropKey&&!groups().some(g=>pageKey(g)===cropKey))cropKey='';markCrop();applyHidden();applyZoom();mini.refresh();return r}}

// ---------- 미니맵(클립스튜디오 내비게이터) ----------
const mini=(()=>{const box=document.createElement('div');box.className='minimap';box.hidden=true;box.setAttribute('aria-label','미니맵: 눌러서 이동');
  box.innerHTML='<div class="mm-in"></div><div class="mm-view"></div>';document.body.appendChild(box);
  const inner=box.querySelector('.mm-in'),vp=box.querySelector('.mm-view');let k=.12,timer=0,drag=false;
  function refresh(){clearTimeout(timer);timer=setTimeout(build,250)}
  function build(){if(!inEdit()||!reader.querySelector('svg')){box.hidden=true;return}
    inner.innerHTML=reader.innerHTML;inner.style.width=BASE+'px';
    const docked=box.classList.contains('docked'),h=reader.scrollHeight/CZ,maxH=docked?Math.max(200,innerHeight*.45):Math.max(160,innerHeight*.55);k=Math.min((docked?Math.max(60,box.parentElement.clientWidth-4):96)/BASE,maxH/h);
    inner.style.transform=`scale(${k})`;box.style.width=Math.round(BASE*k)+'px';box.style.height=Math.round(h*k)+'px';box.hidden=(!docked&&matchMedia('(max-width:1100px)').matches)||reader.classList.contains('artboards');view()}
  function view(){if(box.hidden)return;const r=reader.getBoundingClientRect(),s=k/CZ;
    const top=(STICKY-r.top)*s,h=(innerHeight-STICKY)*s,left=(canvas.getBoundingClientRect().left-r.left)*s,w=canvas.clientWidth*s;
    vp.style.transform=`translate(${Math.max(0,left)}px,${Math.max(0,top)}px)`;vp.style.width=Math.min(BASE*k,w)+'px';vp.style.height=Math.max(8,h)+'px'}
  function jump(e){const b=box.getBoundingClientRect(),r=reader.getBoundingClientRect(),y=(e.clientY-b.top)/k*CZ;
    scrollTo(0,r.top+scrollY+y-(innerHeight+STICKY)/2)}
  box.addEventListener('pointerdown',e=>{drag=true;box.setPointerCapture(e.pointerId);jump(e)});
  box.addEventListener('pointermove',e=>{if(drag)jump(e)});box.addEventListener('pointerup',()=>drag=false);
  addEventListener('scroll',()=>requestAnimationFrame(view),{passive:true});canvas.addEventListener('scroll',view,{passive:true});addEventListener('resize',refresh);
  reader.addEventListener('pointerup',refresh);
  return {refresh,view,hide:()=>box.hidden=true,box}})();
{const _sv=showView;showView=function(v){const r=_sv(v);if(v!=='webtoon'){mini.hide();closeRead();setCrop(null)}return r}}
document.body.classList.add('has-minimap');
const preview=()=>$('#v-webtoon').classList.contains('preview');
new MutationObserver(()=>mini.box.classList.toggle('wide',preview())).observe($('#v-webtoon'),{attributes:true,attributeFilter:['class']});

// ---------- 읽기 모드(피그마 Present · 클립스튜디오 웹툰 미리보기) ----------
const rd=document.createElement('div');rd.className='readmode';rd.hidden=true;rd.setAttribute('role','dialog');rd.setAttribute('aria-modal','true');rd.setAttribute('aria-label','읽기 모드');
rd.innerHTML=`<div class="rd-bar"><b id="rdtitle"></b><div class="seg3" id="rdw" role="group" aria-label="화면 폭"><button data-w="360" aria-pressed="false">360</button><button data-w="390" aria-pressed="true">390</button><button data-w="430" aria-pressed="false">430</button></div><button class="btn" id="rdclose">닫기 <kbd>Esc</kbd></button></div><div class="rd-phone"><div class="rd-scroll" id="rdscroll" tabindex="0"></div></div>`;
document.body.appendChild(rd);let lastFocus=null;
function openRead(){if(!inEdit())return;lastFocus=document.activeElement;
  const parts=SCENES.map((sc,i)=>{const ps=scenePanels(i);return ps.length?sceneArt(i,ps,`r${i}_`,false).svg:''}).filter(Boolean);
  $('#rdscroll').innerHTML=`<div class="rd-head">${esc($('#wtitle').value||'제목 없음')}</div>${parts.join('')}<div class="rd-end">끝 · 씬 ${parts.length}개</div>`;
  $('#rdtitle').textContent='읽기 모드';rd.hidden=false;document.body.style.overflow='hidden';$('#rdscroll').scrollTop=0;$('#rdscroll').focus()}
function closeRead(){if(rd.hidden)return;rd.hidden=true;document.body.style.overflow='';$('#rdscroll').innerHTML='';lastFocus?.focus?.()}
$('#wread').addEventListener('click',openRead);$('#rdclose').addEventListener('click',closeRead);
rd.addEventListener('click',e=>{if(e.target===rd)closeRead();const b=e.target.closest('[data-w]');if(b){rd.style.setProperty('--rdw',b.dataset.w+'px');rd.querySelectorAll('[data-w]').forEach(x=>x.setAttribute('aria-pressed',x===b))}});

// ---------- 단축키 ----------
const KEYS=[...(UX!=='A'?[['씬 쓰기',[['[그날 밤]','식자(나레이션)'],['@준 "(놀라서)에드가?"','대사 · 괄호 안은 연기'],['-툭-','효과음'],['그 밖의 글','행동·장면 묘사'],['@','인물 목록 열기'],['Ctrl + Enter','아래에 새 컷']]]]:[]),['어디서나',[['?','단축키 보기'],['Esc','닫기 · 선택 해제']]],
  ['편집 · 캔버스',[[`${MODK} + 휠 / 핀치`,'캔버스 확대·축소'],[`${MODK} + = / −`,'한 단계 확대·축소'],['Shift + 0','100%'],['Shift + 1','전체 보기'],['Shift + 2','선택한 컷 보기'],['Space + 끌기','캔버스 이동(가운데 버튼 끌기도)']]],
  ['편집 · 선택',[['[ / ]','이전 · 다음 컷'],['Shift + [ / ]','이전 · 다음 씬'],['그림 더블클릭',`그림 편집: ${MODK} + 휠 확대, 끌어 이동`],['방향키','식자 1px 이동 (Shift 10px)'],['Delete / Backspace','고른 식자·컷 지우기 (Ctrl+Z로 되돌리기)'],[`${MODK} + Z`,'실행 취소 (Shift 다시 실행)'],['P','읽기 모드']]]];
const kd=document.createElement('dialog');kd.className='keysdlg';kd.setAttribute('aria-labelledby','kdt');
kd.innerHTML=`<h3 id="kdt">${UX==='A'?'단축키':'도움말'}</h3>${KEYS.map(([h,rows])=>`<h4>${h}</h4><dl>${rows.map(([k,d])=>`<dt>${k.split(' / ').map(x=>`<kbd>${esc(x)}</kbd>`).join(' / ')}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`).join('')}<form method="dialog"><button class="btn dark">닫기</button></form>`;
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
  if(e.code==='BracketLeft'||e.code==='BracketRight'){e.preventDefault();const d=e.code==='BracketRight'?1:-1;e.shiftKey?goScene(d):goCut(d);return}
  if((e.key==='p'||e.key==='P')&&!e.shiftKey){e.preventDefault();openRead();return}
  if(e.key==='Escape'&&cropKey){e.preventDefault();setCrop(null)}},true);

// 상단 씬 선택: 편집 화면에서는 그 씬으로 스크롤
{const _sw=switchScene;switchScene=function(i){const r=_sw(i);if(inEdit())document.getElementById('ws-'+i)?.scrollIntoView({behavior:'smooth'});return r}}

applyZoom();
window.RoughStudio={zoomTo,fitAll,fitSelected,setCrop,openRead,closeRead,applyZoom,mini,stepZoom,get zoom(){return CZ}};
})();
