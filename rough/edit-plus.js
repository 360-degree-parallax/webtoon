// 편집 화면 조작 보강(피그마·캔바·클립스튜디오 관례): docs/edit-interaction-research.md
// · 끌기: Shift=가로·세로 고정, 여러 개 함께, 맞춤선(Ctrl·⌘ 누르면 끔), Alt+끌기 복제, Shift+클릭=고르기에 더하기
// · Ctrl+C / V / D 식자 복사·붙여넣기·복제 · Ctrl+A 식자 전체 · Enter 글자 고치기 · Tab 다음 식자
// · 겹침 순서 Ctrl+] / [ (Shift: 맨 앞·맨 뒤) · 빈 곳 끌어 사각형 고르기 · 레이어 패널 끌어 순서 바꾸기
(function(){
const SVGNS='http://www.w3.org/2000/svg';
const {MULTI,lkey,resolve,toggleMulti,clearMulti,markMulti,renderCtx,renderAlign,withKey,groupBy,openInlineText,typing,refreshText,flash,isLocked}=window.RoughWS;
const inEdit=()=>VIEW==='webtoon';
const reader=pageReader;
const isLetterKey=lk=>/^(dialog|caption|effect|material)/.test(lk||'');
const kindOf=lk=>/^dialog/.test(lk)?'dialog':/^caption/.test(lk)?'caption':/^material/.test(lk)?'material':'effect';
const topLetters=g=>[...g.querySelectorAll('[data-letter]')].filter(L=>!L.parentElement.closest('[data-letter]'));
const svgRect=(el,svg)=>{const r=el.getBoundingClientRect(),m=svg.getScreenCTM().inverse(),a=new DOMPoint(r.left,r.top).matrixTransform(m),b=new DOMPoint(r.right,r.bottom).matrixTransform(m);return {x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y}};
const frameOf=g=>{try{return JSON.parse(g.dataset.frame)}catch(_){return null}};
const keyPos=(key,L)=>withKey(key,()=>letterPosition(L));

// ---------- 맞춤선 ----------
const lines=[];
function showGuides(svg,gx,gy){hideGuides();const m=svg.getScreenCTM(),sr=svg.getBoundingClientRect();
  for(const x of gx){const d=document.createElement('div');d.className='snapln v';Object.assign(d.style,{left:(m.a*x+m.e)+'px',top:Math.max(0,sr.top)+'px',height:Math.min(innerHeight,sr.bottom)-Math.max(0,sr.top)+'px'});document.body.appendChild(d);lines.push(d)}
  for(const y of gy){const d=document.createElement('div');d.className='snapln h';Object.assign(d.style,{top:(m.d*y+m.f)+'px',left:sr.left+'px',width:sr.width+'px'});document.body.appendChild(d);lines.push(d)}}
function hideGuides(){while(lines.length)lines.pop().remove()}

// ---------- 끌기(index.html 끌기 코드가 부름) ----------
function begin(letter,e){const svg=letter.ownerSVGElement,g=letter.closest('[data-slot-index]'),key=pageKey(g);
  const others=[];const multi=[];
  if(MULTI.size>1&&MULTI.has(lkey(letter)))for(const k of MULTI){const L=resolve(k);if(!L||L===letter)continue;const kg=L.closest('[data-slot-index]');if(isLocked(kg,L.dataset.letter))continue;multi.push({letter:L,key:pageKey(kg),initial:keyPos(pageKey(kg),L)})}
  const skip=new Set([letter,...multi.map(m=>m.letter)]);
  for(const L of topLetters(g))if(!skip.has(L)&&L.style.visibility!=='hidden')others.push(svgRect(L,svg));
  const f=frameOf(g);
  return {cx:e.clientX,cy:e.clientY,moved:false,alt:e.altKey,multi,key,box0:svgRect(letter,svg),others,frame:f,snap:{}};}
function adjust(pd,dx,dy,e){
  if(e.shiftKey){if(Math.abs(dx)>=Math.abs(dy))dy=0;else dx=0}  // 가로·세로 고정
  if(e.ctrlKey||e.metaKey){hideGuides();return [dx,dy]}
  const k=pd.svg.getScreenCTM().a||1,th=5/k,b=pd.box0;
  const mx=[b.x+dx,b.x+dx+b.w/2,b.x+dx+b.w],my=[b.y+dy,b.y+dy+b.h/2,b.y+dy+b.h];
  const tx=[],ty=[];if(pd.frame){tx.push(pd.frame.x+pd.frame.w/2,pd.frame.x+24,pd.frame.x+pd.frame.w-24);ty.push(pd.frame.y+pd.frame.h/2)}
  for(const o of pd.others){tx.push(o.x,o.x+o.w/2,o.x+o.w);ty.push(o.y,o.y+o.h/2,o.y+o.h)}
  let bx=null,by=null;
  if(!e.shiftKey||dx){for(const t of tx)for(const v of mx){const d=t-v;if(Math.abs(d)<th&&(bx==null||Math.abs(d)<Math.abs(bx.d)))bx={d,t}}}
  if(!e.shiftKey||dy){for(const t of ty)for(const v of my){const d=t-v;if(Math.abs(d)<th&&(by==null||Math.abs(d)<Math.abs(by.d)))by={d,t}}}
  if(bx)dx+=bx.d;if(by)dy+=by.d;
  showGuides(pd.svg,bx?[bx.t]:[],by?[by.t]:[]);return [dx,dy]}
function end(pd){hideGuides();pd.ended=true;const letter=pd.letter;
  if(!pd.moved){const sp=window._shiftPick;window._shiftPick=null;
    if(sp&&sp.L===letter){if(sp.prev&&sp.prev!==letter&&sp.prev.isConnected&&!MULTI.size)MULTI.add(lkey(sp.prev));toggleMulti(letter)}
    return}
  window._shiftPick=null;
  const snapshot=pd.alt?copyItem(letter,pd.initial):null;
  saveLetter(letter,pd.position);
  for(const m of pd.multi){const p=m.letter.getAttribute('transform')?.match(/translate\(([-\d.]+) ([-\d.]+)\)/);if(p)withKey(m.key,()=>saveLetter(m.letter,{x:+p[1],y:+p[2]}))}
  if(snapshot){// Alt+끌기: 옮긴 것은 그대로, 원래 자리에 복제본
    const g=groupBy(pd.key);if(g){const made=cloneLetter(snapshot,g,snapshot.center);flash('Alt+끌기로 복제했어요');if(made)reselect([made])}}}
window.RoughDrag={begin,adjust,end,hideGuides};

// ---------- 복사 · 붙여넣기 · 복제 ----------
let CLIP=[];
// 식자 하나 → 복사 항목(종류·글·편집값·가운데 좌표). at을 주면 그 위치(translate)를 기준으로 가운데 계산
function copyItem(L,at){const g=L.closest('[data-slot-index]'),key=pageKey(g),lk=L.dataset.letter,svg=L.ownerSVGElement;
  const set={...(withKey(key,()=>pageSettings()?.letters?.[lk])||{})};const r=svgRect(L,svg);let cx=r.x+r.w/2,cy=r.y+r.h/2;
  if(at){const cur=keyPos(key,L);cx+=at.x-(cur.x||0);cy+=at.y-(cur.y||0)}
  const text=String(L.dataset.letterText||'').replace(/&#10;/g,'\n');
  return {kind:kindOf(lk),text,set,center:{x:cx,y:cy},key,frame:frameOf(g)}}
function selectedItems(){if(MULTI.size>1)return [...MULTI].map(resolve).filter(Boolean);return selectedLetter?[selectedLetter]:[]}
function cloneLetter(it,g,center){const key=pageKey(g),[si,slot]=key.split(':').map(Number),sc=SCENES[si];
  const count=pre=>g.querySelectorAll(`[data-letter^="${pre}"]`).length;let lk;
  const one=it.text.replace(/\s*\n\s*/g,' ').trim()||(it.kind==='dialog'?'대사':'나레이션');
  if(it.kind==='material'){const mid=crypto.randomUUID();withKey(key,()=>{const st=pageSettings(true);(st.materialSounds||=[]).push({id:mid,text:one})});lk='material-'+mid}
  else{let line;if(it.kind==='dialog'){lk='dialog-'+count('dialog-');line=`"${one.replace(/"/g,'”')}"`}
    else if(it.kind==='caption'){const c=count('caption');lk=c?'caption-'+c:'caption';line=`[${one.replace(/[\[\]]/g,'')}]`}
    else{lk='effect-'+count('effect-');line=`-${one.replace(/[-\s]/g,'').slice(0,10)||'쾅'}-`}
    sc.cuts[slot]=String(sc.cuts[slot]||'').replace(/\s+$/,'')+'\n'+line}
  const keep={...it.set};delete keep.x;delete keep.y;delete keep.z;if(!/\n/.test(it.text))delete keep.text;
  withKey(key,()=>{const st=pageSettings(true);(st.letters||={})[lk]=keep});
  if(si===SCUR)CUTS=sc.cuts;refreshText(si);
  const g2=groupBy(key),L=g2?.querySelector(`[data-letter="${CSS.escape(lk)}"]`);if(!L)return null;
  const svg=g2.ownerSVGElement,r=svgRect(L,svg),cur=keyPos(key,L);
  const pos={x:Math.round((cur.x||0)+center.x-(r.x+r.w/2)),y:Math.round((cur.y||0)+center.y-(r.y+r.h/2))};
  withKey(key,()=>{moveLetter(L,pos);saveLetter(L,pos)});return key+'|'+lk}
function reselect(keys){keys=keys.filter(Boolean);if(!keys.length)return;clearMulti();const first=resolve(keys[0]);
  if(keys.length===1){if(first){selectPageCut(first.closest('[data-slot-index]'));selectLetter(first)}return}
  for(const k of keys)MULTI.add(k);markMulti();renderCtx();renderAlign();if(first){selectPageCut(first.closest('[data-slot-index]'));selectLetter(first)}}
function paste(items,target,step){if(!items.length)return;const tg=target||groupBy(items[0].key);if(!tg){flash('붙여 넣을 컷을 고르세요');return}
  const tf=frameOf(tg),out=[];
  for(const it of items){let c={...it.center};
    if(pageKey(tg)===it.key){c.x+=step;c.y+=step}
    else if(tf&&it.frame){c.x=tf.x+(c.x-it.frame.x)*tf.w/it.frame.w;c.y=tf.y+(c.y-it.frame.y)}
    out.push(cloneLetter(it,groupBy(pageKey(tg)),c))}
  reselect(out);return out.filter(Boolean).length}
let pasteN=0;
function doCopy(){const els=selectedItems();if(!els.length)return false;CLIP=els.map(L=>copyItem(L));pasteN=0;flash(`식자 ${CLIP.length}개를 복사했어요 · Ctrl+V로 붙여넣기`);return true}
function doPaste(){if(!CLIP.length){flash('복사한 식자가 없어요');return}pasteN++;const g=pageSelection?groupBy(pageSelection):null;const n=paste(CLIP,g,20*pasteN);if(n)flash(`식자 ${n}개를 붙여 넣었어요`)}
function doDup(){const els=selectedItems();if(!els.length){flash('복제할 식자를 고르세요');return}const items=els.map(L=>copyItem(L));const n=paste(items,null,20);if(n)flash(`식자 ${n}개를 복제했어요`)}

// ---------- 겹침 순서 ----------
function setOrder(g,order){const key=pageKey(g);withKey(key,()=>{const st=pageSettings(true);st.letters||={};order.forEach((lk,i)=>{st.letters[lk]={...st.letters[lk],z:i}})});saveScenes();renderWebtoon()}
function zMove(how){const L=selectedLetter;if(!L)return;const g=L.closest('[data-slot-index]'),key=pageKey(g),lk=L.dataset.letter;
  const order=topLetters(g).map(x=>x.dataset.letter),i=order.indexOf(lk);if(i<0)return;order.splice(i,1);
  const j=how==='front'?order.length:how==='back'?0:how==='up'?Math.min(order.length,i+1):Math.max(0,i-1);order.splice(j,0,lk);
  setOrder(g,order);const L2=groupBy(key)?.querySelector(`[data-letter="${CSS.escape(lk)}"]`);if(L2)selectLetter(L2);
  flash({front:'맨 앞으로',back:'맨 뒤로',up:'한 칸 앞으로',down:'한 칸 뒤로'}[how])}
window.RoughOrder={zMove,setOrder};

// ---------- 키보드 ----------
document.addEventListener('keydown',e=>{if(!inEdit()||typing(e.target)||document.querySelector('dialog[open]')||document.querySelector('.ltedit'))return;
  const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(mod&&!e.altKey&&k==='a'){e.preventDefault();// 고른 컷(없으면 보이는 첫 씬)의 식자 전부
    const g=pageSelection?groupBy(pageSelection):null;const els=g?topLetters(g):[...reader.querySelectorAll('section')].flatMap(s=>[...s.querySelectorAll('[data-slot-index]')]).flatMap(topLetters);
    if(!els.length){flash('고를 식자가 없어요');return}clearMulti();els.forEach(L=>MULTI.add(lkey(L)));markMulti();renderCtx();renderAlign();selectLetter(els[0]);flash(`식자 ${els.length}개를 골랐어요`);return}
  if(mod&&!e.altKey&&!e.shiftKey&&k==='c'){if(doCopy())e.preventDefault();return}
  if(mod&&!e.altKey&&!e.shiftKey&&k==='v'){if(CLIP.length){e.preventDefault();doPaste()}return}
  if(mod&&!e.altKey&&!e.shiftKey&&k==='d'){e.preventDefault();doDup();return}
  if(mod&&(e.code==='BracketRight'||e.code==='BracketLeft')&&selectedLetter){e.preventDefault();zMove(e.code==='BracketRight'?(e.shiftKey?'front':'up'):(e.shiftKey?'back':'down'));return}
  if(!mod&&!e.altKey&&e.key==='Enter'&&selectedLetter&&/^(dialog|caption)/.test(selectedLetter.dataset.letter)){e.preventDefault();if(!window.RoughCard?.focus?.())openInlineText(selectedLetter);return}  // Enter = 오른쪽 편집 카드 문구 칸(없으면 인라인)
  if(!mod&&!e.altKey&&e.key==='Tab'&&(selectedLetter||pageSelection)){const g=selectedLetter?.closest('[data-slot-index]')||groupBy(pageSelection);if(!g)return;
    const all=[...reader.querySelectorAll('[data-slot-index]')].flatMap(topLetters);if(!all.length)return;e.preventDefault();
    let i=selectedLetter?all.indexOf(selectedLetter):all.findIndex(L=>L.closest('[data-slot-index]')===g)-1;i=(i+(e.shiftKey?-1:1)+all.length)%all.length;
    const L=all[i];clearMulti();selectPageCut(L.closest('[data-slot-index]'));selectLetter(L);L.scrollIntoView({block:'nearest'});return}
},true);

// ---------- 빈 곳 끌어 사각형 고르기 ----------
{const canvas=document.querySelector('#v-webtoon .edcanvas');let mq=null;
  canvas?.addEventListener('pointerdown',e=>{if(!inEdit()||e.button!==0||e.pointerType==='touch'||window.RoughWS.tool!=='select'||!pageEditing)return;  // 손가락은 끌면 화면 스크롤
    if(e.target.closest('[data-letter],[data-page-gap],[data-fh],[data-th],[data-tail-handle],input,textarea,button,select,.wtitle'))return;
    // 컷 그림 위에서도 시작(확대한 그림은 끌어 옮기기라 제외 · 그림 편집 중 제외)
    const g=e.target.closest('[data-slot-index]');if(g){const z=withKey(pageKey(g),()=>pageSettings()?.img?.s||1);if(z>1||document.querySelector('.cropping,[data-crop]'))return}
    mq={x:e.clientX,y:e.clientY,add:e.shiftKey,el:null};canvas.setPointerCapture(e.pointerId)});
  canvas?.addEventListener('pointermove',e=>{if(!mq)return;const w=Math.abs(e.clientX-mq.x),h=Math.abs(e.clientY-mq.y);if(!mq.el&&w+h<6)return;
    if(!mq.el){mq.el=document.createElement('div');mq.el.className='marquee';document.body.appendChild(mq.el)}
    Object.assign(mq.el.style,{left:Math.min(e.clientX,mq.x)+'px',top:Math.min(e.clientY,mq.y)+'px',width:w+'px',height:h+'px'})});
  canvas?.addEventListener('pointerup',e=>{if(!mq)return;const m=mq;mq=null;if(!m.el)return;const r=m.el.getBoundingClientRect();m.el.remove();
    const hit=[...reader.querySelectorAll('[data-slot-index]')].flatMap(topLetters).filter(L=>{if(L.style.visibility==='hidden')return false;const b=L.getBoundingClientRect();return b.right>r.left&&b.left<r.right&&b.bottom>r.top&&b.top<r.bottom});
    if(!m.add)clearMulti();if(!hit.length){flash('고른 식자가 없어요');return}
    hit.forEach(L=>MULTI.add(lkey(L)));markMulti();renderCtx();renderAlign();selectPageCut(hit[0].closest('[data-slot-index]'));selectLetter(hit[0]);flash(`식자 ${MULTI.size||1}개를 골랐어요`)});}

// ---------- 레이어 패널 끌어 순서 바꾸기: 컷 줄 = 컷 순서, 식자 줄 = 같은 컷 안 겹침 순서 ----------
function moveCutTo(key,to){const [si,from]=key.split(':').map(Number),sc=SCENES[si],len=sc.cuts.length;to=Math.max(0,Math.min(len-1,to));if(to===from)return;
  const g=groupBy(key);if(g&&isLocked(g,'cut')){flash('잠긴 컷이에요');return}
  remapCuts(si,()=>{const c=sc.cuts.splice(from,1)[0];sc.cuts.splice(to,0,c);while(sc.pageEdits.length<len)sc.pageEdits.push(null);const ed=sc.pageEdits.splice(from,1)[0];sc.pageEdits.splice(to,0,ed);
    return moveMap(len,x=>x===from?to:from<to?(x>from&&x<=to?x-1:x):(x>=to&&x<from?x+1:x))});
  if(si===SCUR)CUTS=sc.cuts;refreshText(si);const ng=groupBy(`${si}:${to}`);if(ng)selectPageCut(ng);flash(`${from+1}컷을 ${to+1}번째로 옮겼어요 · Ctrl+Z로 되돌리기`)}
{const toc=document.getElementById('wtoc');let drag=null;
  const mark=()=>{toc.querySelectorAll('[data-tcut],.tlrow>[data-tlayer]').forEach(b=>{b.draggable=true})};
  const _et=editTree;editTree=function(...a){const r=_et(...a);mark();return r};mark();
  const clear=()=>toc.querySelectorAll('.drop-before,.drop-after').forEach(x=>x.classList.remove('drop-before','drop-after'));
  toc.addEventListener('dragstart',e=>{const c=e.target.closest('[data-tcut]'),l=e.target.closest('.tlrow>[data-tlayer]');
    if(c)drag={type:'cut',key:c.dataset.tcut};else if(l)drag={type:'letter',id:l.dataset.tlayer};else return;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','layer')});
  const targetOf=e=>drag?.type==='cut'?e.target.closest('[data-tcut]'):e.target.closest('.tlrow>[data-tlayer]');
  toc.addEventListener('dragover',e=>{if(!drag)return;const t=targetOf(e);if(!t)return;
    if(drag.type==='cut'&&t.dataset.tcut.split(':')[0]!==drag.key.split(':')[0])return;
    if(drag.type==='letter'){const [a,b]=[t.dataset.tlayer,drag.id].map(s=>s.split('|')[0]);if(a!==b)return}
    e.preventDefault();clear();const r=t.getBoundingClientRect();t.classList.add(e.clientY<r.top+r.height/2?'drop-before':'drop-after')});
  toc.addEventListener('dragleave',e=>{if(!toc.contains(e.relatedTarget))clear()});
  toc.addEventListener('drop',e=>{if(!drag)return;const t=targetOf(e);const d=drag;drag=null;if(!t){clear();return}const after=t.classList.contains('drop-after');clear();e.preventDefault();
    if(d.type==='cut'){const from=+d.key.split(':')[1],tslot=+t.dataset.tcut.split(':')[1];let to=tslot+(after?1:0);if(from<to)to--;moveCutTo(d.key,to);return}
    const [key,lk]=d.id.split('|'),tk=t.dataset.tlayer.split('|')[1],g=groupBy(key);if(!g||lk===tk)return;
    const order=topLetters(g).map(x=>x.dataset.letter);order.splice(order.indexOf(lk),1);let j=order.indexOf(tk)+(after?1:0);order.splice(j,0,lk);setOrder(g,order);flash('겹침 순서를 바꿨어요 · 아래 줄일수록 앞')});
  toc.addEventListener('dragend',()=>{drag=null;clear()});}

// ---------- 우클릭 메뉴에 복사·복제·겹침 순서 ----------
{const _lm=window.letterMenu;}
window.RoughClip={copy:doCopy,paste:doPaste,dup:doDup,clone:cloneLetter};
})();
