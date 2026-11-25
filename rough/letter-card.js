// 편집 카드: 고른 식자(말풍선·나레이션·효과음)를 오른쪽 패널(에셋 자리) 맨 위에서 한 번에 고침.
// 에셋에서 넣은 직후 · 「문구 고치기」 · Enter가 모두 여기로 옴. 고치는 대로 캔버스에 반영, Ctrl+Z로 되돌림(docs/balloon-edit-plan.md)
(function(){
const WS=window.RoughWS;if(!WS)return;
const host=document.querySelector('.ws-assets');if(!host)return;
const card=document.createElement('section');card.className='lcard2';card.hidden=true;card.setAttribute('aria-label','고른 식자 고치기');host.insertBefore(card,host.firstChild);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const kindOf=L=>{const id=L?.dataset.letter||'';return id.startsWith('dialog-')?'dialog':id.startsWith('caption')?'caption':/^(effect-|material-)/.test(id)?'sfx':''};
const KNAME={dialog:'말풍선',caption:'나레이션',sfx:'효과음'};
const keyOf=L=>pageKey(L.closest('[data-slot-index]'));
const setOf=L=>pageSettings(false,keyOf(L))?.letters?.[L.dataset.letter]||{};
const find=(key,id)=>[...document.querySelectorAll('#reader [data-slot-index]')].find(g=>pageKey(g)===key)?.querySelector(`[data-letter="${CSS.escape(id)}"]`)||null;
let cur=null,typing=0,lastKey='';

// 바꾸고 다시 그린 뒤 같은 식자를 다시 고름(카드는 문구 칸을 건드리지 않고 나머지만 새로)
function patch(p,{rerender=true}={}){const L=selectedLetter;if(!L)return;const key=keyOf(L),id=L.dataset.letter;
  if(WS.isLocked(L.closest('[data-slot-index]'),id)){WS.flash('잠긴 식자예요');return}
  WS.withKey(key,()=>{const st=pageSettings(true);const o={...st.letters?.[id],...p};for(const k of Object.keys(p))if(p[k]===null||p[k]===undefined||p[k]==='')delete o[k];(st.letters||={})[id]=o});
  saveScenes();if(rerender){renderWebtoon();const L2=find(key,id);if(L2)selectLetter(L2)}}

function textInfo(t){const n=[...t.replace(/\s/g,'')].length,lines=t.split('\n').length;return `${n}자 · ${lines}줄`}
function swatch(k){try{return WS.swatch(k)}catch(_){return ''}}

// 다시 그리는 동안 잠깐 선택이 비었다가 같은 식자가 다시 골라지므로, 숨기기는 한 박자 늦게(문구 칸 커서 유지)
let hideT=0;
function render(full=true){const L=selectedLetter,k=kindOf(L);if(!L&&partNow()&&document.querySelector('#v-webtoon:not([hidden])')){clearTimeout(hideT);renderPart();return}
  if(!L||!k||!document.querySelector('#v-webtoon:not([hidden])')){clearTimeout(hideT);hideT=setTimeout(()=>{if(!selectedLetter||!kindOf(selectedLetter)){card.hidden=true;cur=null;lastKey=''}},0);return}
  clearTimeout(hideT);card.hidden=false;
  const key=keyOf(L),id=L.dataset.letter,lk=key+'|'+id,o=setOf(L),text=L.dataset.letterText||'';const [si,slot]=key.split(':').map(Number);
  if(!full&&lk===lastKey&&card.querySelector('[data-c=text]')){paintParts(L,k,o);return}
  lastKey=lk;cur={key,id};card.hidden=false;
  const who=L.dataset.who||'',over=typeof o.text==='string';
  const FP=Object.entries(FONT_PRESETS),fcur=o.font||PAGE_PRESET;
  const sec=(t,body,cls='')=>`<div class="lc-row ${cls}"><span class="lc-l">${t}</span><div class="lc-v">${body}</div></div>`;
  let h=`<header class="lc-h"><b>${KNAME[k]}</b><span class="lc-cut">${slot+1}컷</span>${k==='dialog'?`<button class="lc-who" data-c="who" aria-haspopup="menu" title="말하는 인물 바꾸기">${who?'@'+esc(who):'화자 없음'} ▾</button>`:k==='caption'?`<button class="lc-who" data-c="who" aria-haspopup="menu" title="종류 바꾸기">나레이션 ▾</button>`:''}<span class="grow"></span>
    ${FLOAT?'<button class="lc-ib" data-c="dock" title="오른쪽 패널에 다시 붙이기">⇲</button>':''}<button class="lc-ib" data-c="more" aria-haspopup="menu" title="더 보기">⋯</button><button class="lc-ib" data-c="close" title="선택 풀기 (Esc)">×</button></header>`;
  h+=`<div class="lc-text"><textarea data-c="text" rows="${k==='sfx'?1:2}" spellcheck="false" aria-label="${KNAME[k]} 문구" placeholder="${k==='dialog'?'대사를 입력하세요':k==='caption'?'나레이션':'효과음'}">${esc(text)}</textarea>
    <div class="lc-tm"><span data-c="info">${textInfo(text)}</span>${over?'<button class="lc-link" data-c="orig">작성 문구로</button>':''}<span data-c="split"></span></div></div>`;
  if(k!=='sfx')h+=sec('글자',`<span class="lc-seg">${FP.map(([v,f])=>`<button data-c="font" data-v="${v}" aria-pressed="${v===fcur}" title="${esc(f.name)}" style="font-family:${f.family.replace(/"/g,"'")}">가</button>`).join('')}</span>
      <span class="lc-seg">${[['bold','<b>B</b>'],['italic','<i>I</i>'],['underline','<u>U</u>']].map(([d,t])=>`<button data-c="deco" data-v="${d}" aria-pressed="${!!o[d]}">${t}</button>`).join('')}</span>
      <button class="lc-dot" data-c="color" title="글자색"><i style="background:${o.color||'#161616'}"></i>글자</button><button class="lc-dot" data-c="outline" title="테두리색"><i class="${!o.outline||o.outline==='none'?'none':''}" style="background:${o.outline&&o.outline!=='none'?o.outline:'transparent'}"></i>테두리</button>`);
  else h+=sec('색',`<button class="lc-dot" data-c="sfxcolor"><i style="background:${o.color||'#161616'}"></i>${o.color?esc(o.color):'기본'}</button>`);
  if(k==='dialog')h+=sec('형태',`<div class="lc-grid">${[['auto','자동']].concat(BALLOON_STYLES.map(s=>[s[0],s[1]])).map(([v,n])=>`<button data-c="style" data-v="${v}" aria-pressed="${(o.style||'auto')===v}" title="${esc(n)}">${v==='auto'?'<span class="lc-auto">자동</span>':swatch(v)}</button>`).join('')}</div>`);
  if(k==='caption')h+=sec('상자',`<span class="lc-seg"><button data-c="capbox" data-v="none" aria-pressed="${o.style!=='narration'}">글만</button><button data-c="capbox" data-v="narration" aria-pressed="${o.style==='narration'}">사각 상자</button></span>`);
  if(k==='sfx'&&typeof materialCatalog!=='undefined')h+=sec('타입',`<span class="lc-seg">${[['A','A'],['B','B'],['C','C'],['D','D']].map(([v,n])=>`<button data-c="variant" data-v="${v}" aria-pressed="${(o.materialVariant||'A')===v}" title="레터링 타입 ${n}">${n}</button>`).join('')}</span>`);
  h+=sec('크기',`<input type="range" data-c="scale" min="50" max="200" step="5" value="${Math.round((o.scale||1)*100)}"><output data-c="scalev">${Math.round((o.scale||1)*100)}%</output>${k!=='sfx'?`<button class="lc-btn" data-c="fit" title="늘리거나 줄인 상자를 글에 맞게">글에 맞추기</button>`:''}`);
  if(k==='dialog'){const linkable=typeof CAN_LINK!=='undefined'&&CAN_LINK.has(o.style);
    h+=sec('꼬리',`<label class="lc-tg"><input type="checkbox" data-c="tail" ${o.showTail===false?'':'checked'}>표시</label><button class="lc-btn" data-c="tailreset"${o.tail?'':' disabled'}>방향 처음대로</button>${linkable?`<label class="lc-tg"><input type="checkbox" data-c="linked" ${o.linked?'checked':''}>두 칸 연결</label>`:''}`)}
  h+=sec('배치',`<span class="lc-seg"><button data-c="align" data-v="left" title="컷 왼쪽">←</button><button data-c="align" data-v="center" title="컷 가운데">↔</button><button data-c="align" data-v="right" title="컷 오른쪽">→</button></span><span class="lc-rot">회전 <b data-c="rotv">${Math.round(o.rot||0)}°</b></span><button class="lc-btn" data-c="rot0"${o.rot?'':' disabled'}>없애기</button>`);
  if(k==='dialog')h+=`<p class="lc-foot">다른 형태로 바꾸려면 아래 말풍선 에셋을 눌러요</p>`;
  card.innerHTML=h;applyFloat();card.dataset.kind=k;card.classList.toggle('locked',WS.isLocked(L.closest('[data-slot-index]'),id));
  suggestSplit(text,k);requestAnimationFrame(fit);}
function paintParts(L,k,o){card.querySelectorAll('[data-c=style]').forEach(b=>b.setAttribute('aria-pressed',(o.style||'auto')===b.dataset.v));
  card.querySelectorAll('[data-c=font]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===(o.font||PAGE_PRESET)));
  card.querySelectorAll('[data-c=deco]').forEach(b=>b.setAttribute('aria-pressed',!!o[b.dataset.v]));
  const sv=card.querySelector('[data-c=scalev]');if(sv)sv.textContent=Math.round((o.scale||1)*100)+'%';const rv=card.querySelector('[data-c=rotv]');if(rv)rv.textContent=Math.round(o.rot||0)+'°'}
function paint(full){render(full)}
function fit(){const t=card.querySelector('[data-c=text]');if(!t)return;t.style.height='auto';t.style.height=Math.min(220,t.scrollHeight+2)+'px'}
function suggestSplit(text,k){const el=card.querySelector('[data-c=split]');if(!el)return;const n=[...text.replace(/\s/g,'')].length;
  el.innerHTML=k==='dialog'&&n>32?`<button class="lc-warn" data-c="split" title="말풍선 하나에 글이 많아요">${n}자 · 두 말풍선으로 나누기</button>`:''}

// 문구: 0.3초 묶어 반영(카드 문구 칸은 그대로 두고 캔버스만 다시)
function commitText(t){const L=selectedLetter;if(!L)return;const k=kindOf(L),v=k==='sfx'?t.trim().replace(/\s+/g,' '):t.trim();if(!v)return;
  const key=keyOf(L),id=L.dataset.letter;saveLetter(L,{text:v});renderWebtoon();const L2=find(key,id);if(L2)selectLetter(L2);if(k==='sfx'&&typeof refreshPageMaterials==='function')refreshPageMaterials()}
card.addEventListener('input',e=>{const c=e.target.dataset.c;
  if(c==='text'){fit();const t=e.target.value;card.querySelector('[data-c=info]').textContent=textInfo(t);suggestSplit(t,card.dataset.kind);clearTimeout(typing);typing=setTimeout(()=>{typing=0;commitText(t)},300);return}
  if(c==='scale'){card.querySelector('[data-c=scalev]').textContent=e.target.value+'%'}});
card.addEventListener('change',e=>{const c=e.target.dataset.c;
  if(c==='scale'){const v=+e.target.value/100;patch({scale:v===1?null:v})}
  if(c==='tail')patch({showTail:e.target.checked?null:false});
  if(c==='linked')patch({linked:e.target.checked||null})});
card.addEventListener('keydown',e=>{if(e.target.dataset.c==='text'){if(e.key==='Escape'){e.preventDefault();clearTimeout(typing);commitText(e.target.value);e.target.blur();document.querySelector('#reader')?.focus?.({preventScroll:true})}
  if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();clearTimeout(typing);commitText(e.target.value)}
  // 되돌리기: 아직 반영 안 한 타자가 있으면 글칸의 되돌리기, 아니면 작업 전체 되돌리기(카드 버튼을 누른 뒤에도 커서가 글칸에 남아 있으므로)
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!typing&&typeof edUndo==='function'){e.preventDefault();if(e.shiftKey)edRedo();else edUndo();const L=selectedLetter;if(L){lastKey='';render(true)}return}
  e.stopPropagation()}});
// 카드 버튼은 누를 때 포커스를 가져가지 않음(문구 칸을 벗어나며 카드가 다시 그려져 클릭이 사라지던 것 막기)
card.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});
card.addEventListener('focusout',e=>{if(e.target.dataset.c==='text'&&typing){clearTimeout(typing);typing=0;commitText(e.target.value)}});
card.addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(!b||b.tagName==='TEXTAREA'||b.tagName==='INPUT')return;const c=b.dataset.c,v=b.dataset.v,L=selectedLetter;if(!L)return;
  if(c==='close'){WS.clearMulti();selectLetter(null);return}
  if(c==='font'){patch({font:v===PAGE_PRESET?null:v});return}
  if(c==='deco'){patch({[v]:!setOf(L)[v]||null});return}
  if(c==='color')return WS.openColorPop(b,'color');
  if(c==='outline')return WS.openColorPop(b,'outline');
  if(c==='sfxcolor')return WS.openColorPop(b,'color',{what:'효과음 ',cur:setOf(L).color||'#161616',apply:col=>{patch({color:col==='#161616'?null:col});WS.flash('효과음 색을 바꿨어요')}});
  if(c==='style'){patch({style:v==='auto'?null:v});return}
  if(c==='capbox'){patch({style:v==='narration'?'narration':null});return}
  if(c==='variant'){const id=L.dataset.letter,text=(L.dataset.letterText||'').trim(),entry=window.RoughMaterials?.find?.(text);
    const go=()=>patch({materialVariant:v==='A'?null:v});if(entry&&typeof materialCatalog!=='undefined')materialCatalog.load(entry,v).then(go).catch(go);else go();return}
  if(c==='fit'){WS.fitLetters();return}
  if(c==='tailreset'){patch({tail:null});return}
  if(c==='rot0'){patch({rot:null});return}
  if(c==='align'){alignInCut(L,v);return}
  if(c==='orig'){patch({text:null});return}
  if(c==='more'){const r=b.getBoundingClientRect(),g=L.closest('[data-slot-index]'),locked=WS.isLocked(g,L.dataset.letter);
    WS.cmOpen([...(kindOf(L)!=='sfx'?[{label:'스타일 적용',sub:()=>WS.styleMenu()}]:[]),{label:'복제',key:'Ctrl+D',run:()=>window.RoughClip?.dup?.()},{label:locked?'잠금 풀기':'잠그기',run:()=>WS.toggleLock(keyOf(L),L.dataset.letter)},{sep:1},{label:'지우기',key:'Del',danger:1,run:()=>WS.deleteLetterEls([L])}],r.right-200,r.bottom+4);return}
  if(c==='who'){whoMenu(b);return}
  if(c==='split'){splitBalloon();return}});

// ---------- 배경 · 효과선 · 이미지 소재 카드(레이어 패널에서 그 줄을 골랐을 때) ----------
function partNow(){const lp=window.layerPart;return lp&&lp.key===pageSelection&&(lp.what==='bg'||/^(line|ov):/.test(lp.what))?lp:null}
function editPart(fn,{tree=true}={}){const lp=partNow();if(!lp)return;const g=[...document.querySelectorAll('#reader [data-slot-index]')].find(x=>pageKey(x)===lp.key);if(g&&WS.isLocked(g,'cut')){WS.flash('잠긴 컷이에요');return}
  WS.withKey(lp.key,()=>fn(pageSettings(true)));saveScenes();renderWebtoon();window.layerPart=lp;if(tree&&typeof editTree==='function')editTree();renderPart()}
function renderPart(){const lp=partNow();if(!lp){card.hidden=true;return}const [si,slot]=lp.key.split(':').map(Number),e=SCENES[si]?.pageEdits?.[slot]||{};lastKey='part|'+lp.key+'|'+lp.what;card.hidden=false;
  const sec=(t,body)=>`<div class="lc-row"><span class="lc-l">${t}</span><div class="lc-v">${body}</div></div>`;let kind,h='';
  if(lp.what.startsWith('line:')){const kd=lp.what.slice(5),L=e.materialLines?.[kd]||{};kind='line';
    h=sec('종류',`<span class="lc-seg"><button data-p="kind" data-v="focus" aria-pressed="${kd==='focus'}">집중선</button><button data-p="kind" data-v="speed" aria-pressed="${kd==='speed'}">속도선</button></span>`)+
      sec('색',`<button class="lc-dot" data-p="lcolor"><i style="background:${L.color||'#27211e'}"></i>${esc(L.color||'#27211e')}</button>`)+
      sec('밀도',`<input type="range" data-p="density" min="12" max="90" step="1" value="${L.density||50}"><output data-p="densv">${L.density||50}</output>`)+
      sec('위치',`<button class="lc-btn" data-p="replace">${kd==='speed'?'방향 다시 긋기':'중심 다시 찍기'}</button>`);
    h=`<header class="lc-h"><b>${kd==='speed'?'속도선':'집중선'}</b><span class="lc-cut">${slot+1}컷 · 효과선</span><span class="grow"></span><button class="lc-ib" data-p="del" title="지우기 (Delete)">🗑</button><button class="lc-ib" data-p="close" title="선택 풀기 (Esc)">×</button></header>`+h}
  else if(lp.what==='bg'){kind='bg';const pres=(typeof PAGE_BACKGROUNDS!=='undefined'?PAGE_BACKGROUNDS:[]).map((p,i)=>p?[i,p.name]:null).filter(Boolean);
    const thumb=i=>document.querySelector(`#wbgpresets [data-bg-preset="${i}"] svg`)?.outerHTML||'';
    const imgs=typeof IMG!=='undefined'?Object.values(IMG.bg||{}).sort((a,b)=>(a.at||0)-(b.at||0)):[];
    h=`<header class="lc-h"><b>배경</b><span class="lc-cut">${slot+1}컷 · 아래 전환</span><span class="grow"></span><button class="lc-ib" data-p="del" title="배경 모두 지우기 (Delete)">🗑</button><button class="lc-ib" data-p="close" title="선택 풀기 (Esc)">×</button></header>`+
      sec('배경색',`<button class="lc-dot" data-p="bgcolor"><i style="background:${/^#/.test(e.background||'')?e.background:'#ffffff'}"></i>${/^#/.test(e.background||'')?esc(e.background):'기본(흰색)'}</button>${e.background?'<button class="lc-btn" data-p="bgcolor0">없애기</button>':''}`)+
      sec('전환 질감',`<div class="lc-grid lc-bg"><button data-p="trans" data-v="0" aria-pressed="${!e.transition}" title="없음"><span class="lc-auto">없음</span></button>${pres.map(([i,n])=>`<button data-p="trans" data-v="${i}" aria-pressed="${+e.transition===i}" title="${esc(n)}">${thumb(i)}<small>${esc(String(n).split(' ')[0])}</small></button>`).join('')}</div>`)+
      sec('배경 이미지',imgs.length?`<div class="lc-grid lc-bg"><button data-p="bgimg" data-v="" aria-pressed="${!e.bgImage}" title="없음"><span class="lc-auto">없음</span></button>${imgs.map(r=>`<button data-p="bgimg" data-v="${esc(r.id)}" aria-pressed="${e.bgImage===r.id}" title="${esc(r.name||'')}"><img src="${r.src}" alt=""></button>`).join('')}</div>`:'<span class="lc-auto">에셋 › 배경에서 이미지를 올리면 여기서 골라요</span>')+
      (e.bgImage?sec('이미지 진하기',`<input type="range" data-p="bgop" min="10" max="100" step="5" value="${Math.round((e.bgImageOp??1)*100)}"><output data-p="bgopv">${Math.round((e.bgImageOp??1)*100)}%</output>`):'')}
  else{kind='ov';const n=+lp.what.slice(3),o=e.overlays?.[n]||{};
    h=`<header class="lc-h"><b>이미지 소재 ${n+1}</b><span class="lc-cut">${slot+1}컷</span><span class="grow"></span><button class="lc-ib" data-p="del" title="빼기 (Delete)">🗑</button><button class="lc-ib" data-p="close" title="선택 풀기 (Esc)">×</button></header>`+
      sec('자세히',`<button class="lc-btn" data-p="ovmore">속성 서랍에서 크기·위치·투명도</button>`)}
  card.innerHTML=h;card.dataset.kind=kind;card.classList.remove('locked');applyFloat?.()}
card.addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(!b||b.tagName==='INPUT')return;const lp=partNow();if(!lp)return;const c=b.dataset.p,v=b.dataset.v;
  if(c==='close'){if(typeof clearAllSelection==='function')clearAllSelection();card.hidden=true;return}
  if(c==='del'){WS.deletePart?.(lp.key,lp.what);card.hidden=true;return}
  if(c==='kind'){const kd=lp.what.slice(5);if(v===kd)return;editPart(st=>{const ls=st.materialLines||{};const x={...ls[kd],kind:v};delete ls[kd];ls[v]=x;st.materialLines=ls});window.layerPart={key:lp.key,what:'line:'+v};if(typeof editTree==='function')editTree();renderPart();return}
  if(c==='lcolor'){const kd=lp.what.slice(5);return WS.openColorPop(b,'color',{cur:pageSettings()?.materialLines?.[kd]?.color||'#27211e',apply:col=>{editPart(st=>{if(st.materialLines?.[kd])st.materialLines[kd].color=col},{tree:false});WS.flash('효과선 색을 바꿨어요')}})}
  if(c==='replace'){const kd=lp.what.slice(5);WS.setTool(kd);WS.flash(kd==='speed'?'컷 안에서 움직임 방향으로 끌어 주세요 · 새 방향으로 바뀌어요':'컷 안에서 새 중심을 눌러 주세요');return}
  if(c==='bgcolor'){return WS.openColorPop(b,'color',{cur:pageSettings()?.background||'#ffffff',apply:col=>{editPart(st=>{st.background=col});WS.flash('배경색을 바꿨어요')}})}
  if(c==='bgcolor0'){editPart(st=>{delete st.background});return}
  if(c==='trans'){editPart(st=>{if(+v)st.transition=+v;else delete st.transition});return}
  if(c==='bgimg'){editPart(st=>{if(v)st.bgImage=v;else{delete st.bgImage;delete st.bgImageOp}});return}
  if(c==='ovmore'){try{WS.openPanel('props')}catch(_){}return}});
card.addEventListener('input',e=>{const c=e.target.dataset.p;if(c==='density')card.querySelector('[data-p=densv]').textContent=e.target.value;if(c==='bgop')card.querySelector('[data-p=bgopv]').textContent=e.target.value+'%'});
card.addEventListener('change',e=>{const c=e.target.dataset.p,lp=partNow();if(!lp)return;
  if(c==='density'){const kd=lp.what.slice(5),v=+e.target.value;editPart(st=>{if(st.materialLines?.[kd])st.materialLines[kd].density=v},{tree:false})}
  if(c==='bgop'){const v=+e.target.value/100;editPart(st=>{st.bgImageOp=v},{tree:false})}});
// 레이어 패널을 다시 그릴 때(줄을 고를 때) 카드도
{const _et=editTree;editTree=function(...a){const r=_et(...a);if(!selectedLetter)render(true);return r}}

// 컷 기준 가로 정렬(왼·가운데·오른)
function alignInCut(L,mode){const g=L.closest('[data-slot-index]'),f=JSON.parse(g.dataset.frame),svg=g.ownerSVGElement,m=svg.getScreenCTM().inverse(),r=(L.querySelector('[data-balloon]')||L).getBoundingClientRect();
  const a=new DOMPoint(r.left,0).matrixTransform(m).x,b=new DOMPoint(r.right,0).matrixTransform(m).x,w=b-a,pad=f.w*.04;
  const target=mode==='left'?f.x+pad:mode==='right'?f.x+f.w-pad-w:f.x+(f.w-w)/2,dx=Math.round(target-a);if(!dx)return;
  const p=letterPosition(L);patch({x:(p.x||0)+dx,y:p.y||0});WS.flash(mode==='left'?'컷 왼쪽에 맞췄어요':mode==='right'?'컷 오른쪽에 맞췄어요':'컷 가운데에 맞췄어요')}

// ---------- 4단계: 화자 바꾸기 · 나누기 제안 ----------
// 컷 글에서 이 식자의 줄을 찾아 바꿈(대사 n번째 · 나레이션 n번째)
function lineIndex(L){const key=keyOf(L),[si,slot]=key.split(':').map(Number),lines=String(SCENES[si].cuts[slot]||'').split('\n'),id=L.dataset.letter;
  const isD=l=>/^\s*(?:@\S+\s*)?(?:\([^)]*\)\s*)?["“]/.test(l),isC=l=>/^\s*\[.*\]\s*$/.test(l);
  const want=id.startsWith('dialog-')?['d',+id.split('-')[1]]:id.startsWith('caption')?['c',+(id.split('-')[1]||0)]:null;if(!want)return null;
  let n=-1;for(let i=0;i<lines.length;i++){if(want[0]==='d'?isD(lines[i]):isC(lines[i])){n++;if(n===want[1])return {si,slot,lines,i}}}return null}
function rewrite(L,fn,msg){const x=lineIndex(L);if(!x){WS.flash('컷 글에서 이 줄을 찾지 못했어요 · 씬 화면에서 고쳐 주세요');return}
  const out=fn(x.lines[x.i]);if(out==null)return;x.lines.splice(x.i,1,...[].concat(out));const sc=SCENES[x.si];sc.cuts[x.slot]=x.lines.join('\n');if(x.si===SCUR)CUTS=sc.cuts;
  const key=keyOf(L);WS.withKey(key,()=>{const st=pageSettings();if(st?.letters?.[L.dataset.letter]?.text)delete st.letters[L.dataset.letter].text});
  saveScenes();if(x.si===SCUR&&typeof compute==='function')compute(false);renderWebtoon();WS.flash(msg+' · Ctrl+Z로 되돌리기')}
const bodyOf=l=>{const m=l.match(/["“](.*)["”]/);return m?m[1]:l.replace(/^\s*\[|\]\s*$/g,'').trim()};
function whoMenu(b){const L=selectedLetter,k=kindOf(L),r=b.getBoundingClientRect(),names=(CHARS||[]).map(c=>c.name.trim()).filter(Boolean);
  const items=k==='dialog'?[...names.map(n=>({label:'@'+n,check:L.dataset.who===n,run:()=>rewrite(L,l=>`@${n} "${bodyOf(l)}"`,`화자를 ${n}(으)로 바꿨어요`)})),{label:'화자 없이',run:()=>rewrite(L,l=>`"${bodyOf(l)}"`,'화자를 비웠어요')},{sep:1},
      {label:'나레이션으로 바꾸기',run:()=>rewrite(L,l=>`[${bodyOf(l)}]`,'나레이션으로 바꿨어요')},{label:'속마음(점선 말풍선)으로',run:()=>{patch({style:'whisper'},{rerender:true});WS.flash('속마음 말풍선으로 바꿨어요')}}]
    :[...names.map(n=>({label:`@${n}의 대사로 바꾸기`,run:()=>rewrite(L,l=>`@${n} "${bodyOf(l)}"`,`${n}의 대사로 바꿨어요`)})),{label:'대사(화자 없이)로 바꾸기',run:()=>rewrite(L,l=>`"${bodyOf(l)}"`,'대사로 바꿨어요')}];
  WS.cmOpen(items,r.left,r.bottom+4)}
// 긴 대사 나누기: 문장 끝(.?!…)이나 쉼표에서 가운데에 가까운 곳으로 둘로
function splitBalloon(){const L=selectedLetter;if(!L)return;const t=(L.dataset.letterText||'').trim(),chars=[...t];if(chars.length<8)return;
  const mid=t.length/2;let best=-1,bd=1e9;t.replace(/[.?!…~,]+\s*/g,(m,i)=>{const at=i+m.length;const d=Math.abs(at-mid);if(at<t.length-1&&d<bd){bd=d;best=at}return m});
  if(best<0){const sp=[...t.matchAll(/\s/g)].map(m=>m.index);best=sp.sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid))[0]??Math.round(mid)}
  const a=t.slice(0,best).trim(),b=t.slice(best).trim();if(!a||!b)return;
  rewrite(L,l=>{const m=l.match(/^(\s*(?:@\S+\s*)?(?:\([^)]*\)\s*)?)["“]/);const pre=m?m[1]:'';return [`${pre}"${a}"`,`${pre}"${b}"`]},'말풍선 둘로 나눴어요')}

// 고르기·다시 그리기와 연결
// 같은 식자를 다시 고른 것(다시 그린 뒤)이면 문구 칸은 두고 나머지만 → 타자 중 커서가 튀지 않음
{const _sl=selectLetter;selectLetter=function(...a){const prev=selectedLetter,r=_sl(...a);if(selectedLetter!==prev){const L=selectedLetter,same=L&&lastKey===keyOf(L)+'|'+L.dataset.letter,typingNow=document.activeElement?.dataset?.c==='text'&&card.contains(document.activeElement);render(!(same&&typingNow))}return r}}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);if(!card.hidden&&!selectedLetter)render(true);return r}}
{const _sv=showView;showView=function(...a){const r=_sv(...a);render(true);return r}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!card.hidden&&card.contains(document.activeElement))return});
// 문구 칸으로 커서(스크롤 없이) — 에셋 넣기 직후 · 문구 고치기 · Enter
function focus(o={}){if(card.hidden)render(true);const t=card.querySelector('[data-c=text]');if(!t)return false;
  // 오른쪽 패널이 접혀 있으면 펼침
  try{WS.openPanel?.('assets')}catch(_){}
  t.focus({preventScroll:true});
  if(o.select||true)t.select();return true}
// ---------- 카드 옮기기: 머리줄을 끌면 떼어져 화면 아무 데나 둘 수 있음(자리 기억) · ⇲ 또는 머리줄 더블클릭으로 다시 붙이기 ----------
const POSK='rough-card-float';let FLOAT=null;try{FLOAT=JSON.parse(localStorage.getItem(POSK)||'null')}catch(_){}
function saveFloat(){try{FLOAT?localStorage.setItem(POSK,JSON.stringify(FLOAT)):localStorage.removeItem(POSK)}catch(_){}}
function clampPos(x,y,w,h){return [Math.max(8,Math.min(innerWidth-w-8,x)),Math.max(110,Math.min(innerHeight-60,y))]}
function applyFloat(){card.classList.toggle('float',!!FLOAT);if(FLOAT){const [x,y]=clampPos(FLOAT.x,FLOAT.y,card.offsetWidth||280,card.offsetHeight||300);Object.assign(card.style,{left:x+'px',top:y+'px',width:(FLOAT.w||280)+'px'})}else{card.style.left=card.style.top=card.style.width=''}}
card.addEventListener('pointerdown',e=>{const h=e.target.closest('.lc-h');if(!h||e.target.closest('button')||e.button!==0)return;e.preventDefault();
  const r=card.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top,w=r.width;let moved=false;
  const mv=ev=>{if(!moved&&Math.hypot(ev.clientX-e.clientX,ev.clientY-e.clientY)<4)return;if(!moved){moved=true;FLOAT={x:r.left,y:r.top,w};applyFloat();card.classList.add('dragging');if(!card.querySelector('[data-c=dock]'))render(true)}
    const [x,y]=clampPos(ev.clientX-ox,ev.clientY-oy,w,card.offsetHeight);FLOAT.x=x;FLOAT.y=y;card.style.left=x+'px';card.style.top=y+'px'};
  const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);card.classList.remove('dragging');if(moved){saveFloat();WS.flash('편집 카드를 옮겼어요 · ⇲나 머리줄 더블클릭으로 다시 붙여요')}};
  addEventListener('pointermove',mv);addEventListener('pointerup',up)});
function dock(){FLOAT=null;saveFloat();applyFloat();render(true);WS.flash('편집 카드를 오른쪽 패널에 다시 붙였어요')}
card.addEventListener('dblclick',e=>{if(e.target.closest('.lc-h')&&!e.target.closest('button')&&FLOAT)dock()});
card.addEventListener('click',e=>{if(e.target.closest('[data-c=dock]')){e.stopPropagation();dock()}},true);
addEventListener('resize',()=>{if(FLOAT)applyFloat()});
window.RoughCard={render,focus,get el(){return card}};
})();
