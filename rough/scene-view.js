// 씬 화면 시각화(시안 B)
// · 모든 컷(시안 B로 통일): 입력칸 글자는 투명하게 두고 뒤층이 같은 자리에 꾸민 글자를 그림(기호 흐리게, 인물 색, 나레이션 기울임)
// · 컷 둘레: 칸 길이 막대, 하이라이트, 배경색 띠, 다음 컷까지 간격을 실제 여백으로, 씬 머리 통계, { 자동완성, 연출 오타 제안
(function(){
const list=$('#cutlist');if(!list)return;
const nameColor=n=>`hsl(${hueOf(n)} 42% 40%)`;
const face=(n,cls='')=>{const im=IMG.char[n];return `<span class="sv-face${cls}" style="--c:${avBg(n)}">${im?`<img src="${im.src}" alt="">`:`<b>${esc(n.slice(0,1))}</b>`}</span>`};
const DIR_TOK=/\{[^{}\n]*\}/g,SFX_ONE=/(^|\s)(-{1,3})([^\s-][^-\n]{0,10}?)\2(?=\s|$|[.,!?])/g;
const isDlg=bare=>/^(?:@[^\s"“]+\s*)?["“].*["”]\s*[.!?…]*$/.test(bare),isCap=bare=>/^\[.*\]$/.test(bare);
const bareOf=line=>line.replace(DIR_TOK,'').replace(SFX_ONE,'$1').trim();

// ---------- 고른 컷: 입력칸 뒤 글자층(글자 폭은 그대로, 색·흐림·기울임만) ----------
const OV=/(\{[^{}\n]*\})|((?:^|(?<=\s))(-{1,3})([^\s-][^-\n]{0,10}?)\3(?=\s|$|[.,!?]))|(@)([^\s"“”.,!?{}()]+)|(["“”])|(\([^()\n]*\))|(^\s*\[|\]\s*(?=\{|$))/g;
cutHL=function(text){return String(text??'').split('\n').map(line=>{const bare=bareOf(line);
    const kind=!bare?'empty':isDlg(bare)?'dlg':isCap(bare)?'cap':/["“][^"”]+["”]/.test(bare)?'mix':'act';
    const who=kind==='dlg'?(bare.match(/^@([^\s"“]+)/)||[])[1]:'';
    let o='',last=0;line.replace(OV,(m,d,sfx,dash,w,at,nm,q,memo,br,off)=>{o+=esc(line.slice(last,off));last=off+m.length;
      if(d)o+=dirHL(d);else if(sfx){const lead=m.match(/^\s*/)[0];o+=`${lead}<i class="sy">${dash}</i><i class="h-sfx">${esc(w)}</i><i class="sy">${dash}</i>`}
      else if(at)o+=`<i class="sy">@</i><i class="nm" style="color:${nameColor(nm)}">${esc(nm)}</i>`;
      else if(q||br)o+=`<i class="sy">${esc(m)}</i>`;
      else if(memo)o+=kind==='dlg'?`<i class="memo">${esc(m)}</i>`:esc(m);
      else o+=esc(m);return m});
    o+=esc(line.slice(last));
    return `<div class="hl-${kind}">${who?`<span class="gface">${face(who)}</span>`:''}${o||'<br>'}</div>`}).join('')};
document.querySelectorAll('.cutin').forEach(t=>syncHL(t));

// ---------- 오른쪽 연출 칩 ----------
const VOCAB=()=>[...new Set([...RE.SHOTS,...RE.ANGLES,...DIR_MENU.flatMap(([,xs])=>xs),'집중선','속도선','확대','배경','하이라이트','붙임','쉼','큰 쉼','짧게','길게','아주 길게','속삭임','외침','생각','전화','분노','숨','떨림','의미심장'])];
function lev(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
const suggest=w=>{let best=null,bd=9;for(const v of VOCAB()){const x=lev(w,v);if(x<bd){bd=x;best=v}}return w.length>=2&&bd<=Math.max(1,Math.floor(w.length/3))?best:null};
const ICON={shot:'<svg viewBox="0 0 16 16"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor"/><circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor"/></svg>',
  ang:'<svg viewBox="0 0 16 16"><path d="M3 12l5-8 5 8" fill="none" stroke="currentColor"/></svg>'};
function sideHTML(b,c,g){const D=b.dir||{},o=[],gd=g.edit||{};
  if(D.hl||c?.vng==='P')o.push(`<span class="svc hlc">★ 하이라이트${D.hl?'':' · 자동'}</span>`);
  if(c){o.push(`<span class="svc${D.shot?'':' auto'}">${ICON.shot}${esc(c.shot)}${D.shot?'':' · 자동'}</span>`);o.push(`<span class="svc${D.ang?'':' auto'}">${ICON.ang}${esc(c.ang)}${D.ang?'':' · 자동'}</span>`)}
  if(D.h)o.push(`<span class="svc">▮ 길이 ${esc(lenWord(D.h))}</span>`);
  if(D.gap)o.push(`<span class="svc">⇣ ${esc(D.gap)}</span>`);
  if(gd.img)o.push(`<span class="svc fx">⤢ 확대 ${Math.round(gd.img.s*100)}%</span>`);
  for(const [k,v] of Object.entries(gd.materialLines||{}))o.push(`<span class="svc fx">${k==='focus'?'✳ 집중선':'≡ 속도선'}${v.density>=70?' 진하게':v.density<=30?' 연하게':''}</span>`);
  const bg=gd.background||(gd.transition&&PAGE_BACKGROUNDS[gd.transition]?.start);
  if(bg)o.push(`<span class="svc bg" style="--sw:${bg}"><i></i>배경 ${esc(gd.transition?PAGE_BACKGROUNDS[gd.transition].name:(D.fx||[]).find(t=>/^배경/.test(t))?.replace(/^배경색?\s*/,'')||bg)}</span>`);
  if(gd.gap!=null)o.push(`<span class="svc">↕ 간격 ${gd.gap}px</span>`);
  if(gd.endTo)o.push(`<span class="svc">씬 끝 ${{white:'흰색',hold:'유지',next:'이어서'}[gd.endTo]}</span>`);
  const bs=[...new Set(Object.entries(gd.letters||{}).filter(([k,v])=>/^dialog/.test(k)&&v.style).map(([,v])=>balloonPreset(v.style)?.[1].split(' · ')[0]).filter(Boolean))];
  if(bs.length)o.push(`<span class="svc fx">◌ 말풍선 ${esc(bs.join('·'))}</span>`);
  for(const w of g.unknown){const s=suggest(w);o.push(`<button type="button" class="svc warn" ${s?`data-fix="${esc(w)}" data-to="${esc(s)}" title="눌러서 고치기"`:'title="연출로 읽지 못했어요"'}>${esc(w)}${s?` → ${esc(s)}?`:' ?'}</button>`)}
  return o.join('')}

// ---------- 컷 줄 꾸미기 ----------
const GAPPX={붙임:4,보통:14,쉼:34,'큰 쉼':72};
function decorate(){const bs=RE.parseCuts(CUTS,engineChars()),by={};bs.forEach(b=>{const m=/^#(\d+):/.exec(b.key||'');if(m)by[+m[1]]=b});
  const P=state.panels||[];
  list.querySelectorAll('li[data-i]').forEach(li=>{const i=+li.dataset.i,b=by[i],box=li.querySelector('.cutbox');if(!box)return;
    let sd=li.querySelector('.cutside');if(!sd){sd=document.createElement('div');sd.className='cutside';li.insertBefore(sd,li.querySelector('.tools'))}
    let lb=li.querySelector('.lenbar');if(!lb){lb=document.createElement('i');lb.className='lenbar';li.querySelector('.cn')?.after(lb)}
    const has=!!String(CUTS[i]||'').trim();box.classList.toggle('has',has);
    if(!b||!has){sd.innerHTML='';li.style.removeProperty('--gap');li.removeAttribute('data-gap');li.classList.remove('hl');li.style.removeProperty('--band');lb.style.height='0';return}
    const c=P.find(x=>x.key===b.key),g=RoughGrammar.derive(b),gd=g.edit||{};
    sd.innerHTML=sideHTML(b,c,g);
    const lw=c?lenWord(c.h):'보통';lb.style.height={짧게:14,보통:26,길게:42,'아주 길게':62}[lw]+'px';lb.classList.toggle('dir',!!b.dir?.h);lb.title=`칸 길이 · ${lw}`;
    li.classList.toggle('hl',!!(b.dir?.hl||c?.vng==='P'));
    const bg=gd.background||(gd.transition&&PAGE_BACKGROUNDS[gd.transition]?.start);if(bg)li.style.setProperty('--band',bg);else li.style.removeProperty('--band');
    const gw=b.dir?.gap||(c?gapWord(c.gap):'보통');li.style.setProperty('--gap',GAPPX[gw]+'px');if(gw==='큰 쉼'||(gw==='쉼'&&b.dir?.gap))li.dataset.gap=gw;else li.removeAttribute('data-gap')});
  stats(bs,P)}
function stats(bs,P){const el=document.querySelector('.scmeta');if(!el)return;let st=el.querySelector('#scstat');if(!st){st=document.createElement('div');st.id='scstat';el.appendChild(st)}
  const nd=bs.reduce((n,b)=>n+(b.dialogs||[]).filter(d=>d.text).length,0),nc=bs.reduce((n,b)=>n+(b.captions||[]).length,0),ns=bs.reduce((n,b)=>n+(b.sfx||[]).length,0);
  const tall=P.reduce((h,p)=>h+p.h*(W-60)+defaultPageGap(p),0),screens=Math.max(1,Math.round(tall*390/690/740));
  const hl=P.map((p,k)=>p.vng==='P'?k+1:0).filter(Boolean);const cast={};bs.forEach(b=>(b.dialogs||[]).forEach(d=>{if(d.who&&d.text)cast[d.who]=(cast[d.who]||0)+1}));
  st.innerHTML=`<div class="ss-row"><span><b>${bs.length}</b>컷</span><span>대사 <b>${nd}</b></span><span>나레이션 <b>${nc}</b></span><span>효과음 <b>${ns}</b></span>${P.length?`<span>세로 약 <b>${Math.round(tall).toLocaleString()}px</b> · 휴대폰 ${screens}화면</span>`:''}${hl.length?`<span class="ss-hl">★ 하이라이트 ${hl.join('·')}컷</span>`:''}</div>${Object.keys(cast).length?`<div class="ss-cast">${Object.entries(cast).map(([n,k])=>`<span>${face(n,' sm')}${esc(n)} · 대사 ${k}</span>`).join('')}</div>`:''}`}
{const _rp=renderParse;renderParse=function(...a){const r=_rp(...a);decorate();return r}}
{const _c=compute;compute=function(...a){const r=_c(...a);if(VIEW==='write')decorate();return r}}
decorate();

// 오타 제안 누르면 고침
list.addEventListener('click',e=>{const f=e.target.closest('[data-fix]');if(!f)return;const li=f.closest('li'),i=+li.dataset.i,t=li.querySelector('.cutin');
  const from=f.dataset.fix,to=f.dataset.to;t.value=t.value.replace(/\{[^{}\n]*\}/g,m=>m.replace(new RegExp('(^\\{|[,，·/]\\s*)'+from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=\\s*([,，·/]|\\}))'),'$1'+to));
  CUTS[i]=t.value;syncHL(t);cutChanged();toast(`'${from}'을 '${to}'로 고쳤어요`)});

// ---------- { 자동완성 ----------
const ac=document.createElement('div');ac.className='menu dirac';ac.setAttribute('role','listbox');ac.hidden=true;document.body.appendChild(ac);let acL=[],acS=0,acQ=null;
const ALL=()=>DIR_MENU.flatMap(([h,xs])=>xs.map(x=>[x,h]));
function acQuery(t){if(t.selectionStart!==t.selectionEnd)return null;const pos=t.selectionStart,before=t.value.slice(0,pos),o=before.lastIndexOf('{');if(o<0||before.lastIndexOf('}')>o||before.slice(o).includes('\n'))return null;
  const part=before.slice(o+1).split(/[,，·/]/).pop(),q=part.trimStart();return{q,start:pos-q.length,pos}}
function acShow(t){acQ=acQuery(t);if(!acQ){ac.hidden=true;return}const q=acQ.q.trim();
  acL=ALL().filter(([x])=>!q||x.startsWith(q)||x.includes(q)).slice(0,8);if(!acL.length||(acL.length===1&&acL[0][0]===q)){ac.hidden=true;return}acS=Math.min(acS,acL.length-1);
  ac.innerHTML=`<p>연출 넣기 · ↑↓ Enter</p>`+acL.map(([x,h],k)=>`<button type="button" role="option" data-ai="${k}" aria-checked="${k===acS}">${esc(x)}<small>${esc(h)}</small></button>`).join('');
  ac.hidden=false;const [x,y]=caretXY(t,acQ.pos);ac.style.left=Math.min(innerWidth-ac.offsetWidth-8,x+scrollX)+'px';ac.style.top=(y+scrollY+4)+'px'}
function acPick(t,k){const it=acL[k];if(!it||!acQ)return;const after=t.value.slice(acQ.pos),close=/^\s*[^{}\n]*\}/.test(after)?'':'}';
  t.value=t.value.slice(0,acQ.start)+it[0]+close+after;const c=acQ.start+it[0].length+(close?1:0);t.setSelectionRange(c,c);ac.hidden=true;t.dispatchEvent(new Event('input',{bubbles:true}))}
list.addEventListener('input',e=>{const t=e.target.closest('.cutin');if(t)acShow(t)});
list.addEventListener('keydown',e=>{const t=e.target.closest('.cutin');if(!t||ac.hidden)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopImmediatePropagation();acS=(acS+(e.key==='ArrowDown'?1:-1)+acL.length)%acL.length;acShow(t)}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();acPick(t,acS)}else if(e.key==='Escape'){e.stopImmediatePropagation();ac.hidden=true}},true);
ac.addEventListener('mousedown',e=>{const b=e.target.closest('[data-ai]');if(b&&TA){e.preventDefault();acPick(TA,+b.dataset.ai)}});
list.addEventListener('focusout',()=>setTimeout(()=>{if(!list.contains(document.activeElement))ac.hidden=true},150));

// ---------- 오른쪽 실시간 미리보기: 편집 화면과 같은 그리기(연출 지시·직접 고친 배치·등록 그림 모두 반영) ----------
{const side=document.querySelector('.scside');if(side){
  const tabs=document.createElement('div');tabs.className='sstabs';tabs.setAttribute('role','tablist');
  tabs.innerHTML='<button type="button" role="tab" data-st="pv" aria-selected="true">미리보기</button><button type="button" role="tab" data-st="info" aria-selected="false">인물·세계관</button>';
  const pv=document.createElement('section');pv.className='wpv';
  pv.innerHTML='<div class="wpv-h"><span id="wpvlab"></span><span class="grow"></span><div class="seg3" id="wpvmode"><button type="button" data-m="final">완성본</button><button type="button" data-m="rough">러프</button></div><button type="button" class="link" data-view="webtoon">편집에서 열기</button></div><div class="wpvbox" id="wpvbox"></div>';
  side.prepend(pv);side.prepend(tabs);
  let tab='pv',mode='final',sel=-1,raf=0;try{tab=localStorage.getItem('rough-scside')||'pv';mode=localStorage.getItem('rough-wpvmode')||'final'}catch(_){}
  const others=()=>[...side.querySelectorAll(':scope>section.insp')];
  function setTab(t){tab=t;tabs.querySelectorAll('[data-st]').forEach(b=>b.setAttribute('aria-selected',b.dataset.st===t));pv.hidden=t!=='pv';others().forEach(x=>x.hidden=t==='pv');side.classList.toggle('pvmode',t==='pv');try{localStorage.setItem('rough-scside',t)}catch(_){}if(t==='pv')draw()}
  tabs.addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(b)setTab(b.dataset.st)});
  pv.querySelector('#wpvmode').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;mode=b.dataset.m;try{localStorage.setItem('rough-wpvmode',mode)}catch(_){}draw()});
  const slotOf=p=>+(/^#(\d+):/.exec(p?.key||'')||[])[1];
  function render(){raf=0;if(VIEW!=='write'||tab!=='pv'||!side.offsetParent)return;const box=pv.querySelector('#wpvbox'),ps=state.panels||[];
    pv.querySelectorAll('#wpvmode [data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===mode));
    if(!ps.length){box.innerHTML='<p class="empty">컷을 쓰면 여기에 바로 그려져요</p>';pv.querySelector('#wpvlab').textContent='';return}
    const imgs=mode==='final'?ps.map((p,k)=>cutImg(SCUR,k,p)||null):null,n=imgs?imgs.filter(Boolean).length:0;
    const keep=box.scrollTop;
    box.innerHTML=renderSVG(ps,sel,'sp_',true,imgs,false,{edits:SCENES[SCUR].pageEdits,interactive:false,rough:mode==='rough',sceneEnd:sceneEndColor(SCUR,ps)});
    box.scrollTop=keep;pv.querySelector('#wpvlab').textContent=mode==='final'?(n?`그림 ${n}/${ps.length}컷 · 나머지 레퍼런스`:'레퍼런스로 미리보기'):'러프(글자 빼고)';
    if(sel>=0)reveal(sel)}
  function draw(){if(!raf)raf=requestAnimationFrame(render)}
  function reveal(i){const box=pv.querySelector('#wpvbox'),g=box.querySelector(`[data-p="${i}"]`);if(!g)return;const gr=g.getBoundingClientRect(),br=box.getBoundingClientRect();
    if(gr.top<br.top||gr.bottom>br.bottom)box.scrollTo({top:box.scrollTop+gr.top-br.top-Math.max(16,(br.height-gr.height)/2),behavior:'smooth'})}
  // 글 고치면(계산 뒤) 다시 그림 · 고른 컷 따라가기 · 미리보기 컷 누르면 그 컷 글로
  {const _c=compute;compute=function(...a){const r=_c(...a);if(VIEW==='write')draw();return r}}
  {const _r=renderSlots;renderSlots=function(...a){const r=_r(...a);if(VIEW==='write')draw();return r}}
  {const _s=showView;showView=function(...a){const r=_s(...a);if(VIEW==='write')draw();return r}}
  list.addEventListener('focusin',e=>{const li=e.target.closest('li[data-i]');if(!li)return;const i=(state.panels||[]).findIndex(p=>slotOf(p)===+li.dataset.i);if(i!==sel){sel=i;draw()}});
  pv.querySelector('#wpvbox').addEventListener('click',e=>{const g=e.target.closest('[data-p]');if(!g)return;const p=state.panels[+g.dataset.p],li=list.querySelector(`li[data-i="${slotOf(p)}"]`);if(!li)return;
    li.scrollIntoView({block:'center',behavior:'smooth'});const t=li.querySelector('.cutin');t?.focus({preventScroll:true});if(t){const n=t.value.length;t.setSelectionRange(n,n)}});
  setTab(tab)}}
})();
