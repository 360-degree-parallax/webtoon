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
  const tag=(f,on)=>on?'':/^내 취향/.test(c?.why?.[f]?.[0]||'')?' · 내 취향':' · 자동';
  if(c){o.push(`<span class="svc${D.shot?'':' auto'}" title="${esc(c.why.shot[0]||'')}">${ICON.shot}${esc(c.shot)}${tag('shot',D.shot)}</span>`);o.push(`<span class="svc${D.ang?'':' auto'}" title="${esc(c.why.ang[0]||'')}">${ICON.ang}${esc(c.ang)}${tag('ang',D.ang)}</span>`)}
  if(D.h)o.push(`<span class="svc">▮ 길이 ${esc(lenWord(D.h))}</span>`);
  if(D.gap)o.push(`<span class="svc">⇣ ${esc(D.gap)}</span>`);
  if(gd.img)o.push(`<span class="svc fx">⤢ 확대 ${Math.round(gd.img.s*100)}%</span>`);
  for(const [k,v] of Object.entries(gd.materialLines||{}))o.push(`<span class="svc fx">${k==='focus'?'✳ 집중선':'≡ 속도선'}${v.density>=70?' 진하게':v.density<=30?' 연하게':''}</span>`);
  const bg=gd.background||(gd.transition&&PAGE_BACKGROUNDS[gd.transition]?.start);
  if(bg)o.push(`<span class="svc bg" style="--sw:${bg}"><i></i>배경 ${esc(gd.transition?PAGE_BACKGROUNDS[gd.transition].name:(D.fx||[]).find(t=>/^배경/.test(t))?.replace(/^배경색?\s*/,'')||bg)}</span>`);
  if(gd.gap!=null)o.push(`<span class="svc">↕ 간격 ${gd.gap}px</span>`);
  if(gd.endTo)o.push(`<span class="svc">씬 끝 ${{white:'흰색',hold:'유지',next:'이어서'}[gd.endTo]}</span>`);
  const ls=Object.entries(gd.letters||{}).filter(([k,v])=>/^dialog/.test(k)&&v.style),bs=[...new Set(ls.map(([,v])=>balloonPreset(v.style)?.[1].split(' · ')[0]).filter(Boolean))],auto=ls.length&&ls.every(([,v])=>v.auto);
  if(bs.length)o.push(`<span class="svc fx${auto?' auto':''}" ${auto?'title="감정·강도로 자동으로 골랐어요. 대사 줄에 {…}나 (메모)를 적으면 그게 우선"':''}>◌ 말풍선 ${esc(bs.join('·'))}${auto?' · 자동':''}</span>`);
  for(const w of g.unknown){const s=suggest(w);o.push(`<button type="button" class="svc warn" ${s?`data-fix="${esc(w)}" data-to="${esc(s)}" title="눌러서 고치기"`:'title="연출로 읽지 못했어요"'}>${esc(w)}${s?` → ${esc(s)}?`:' ?'}</button>`)}
  return o.join('')}

// ---------- 컷 줄 꾸미기 ----------
const GAPPX={붙임:8,보통:18,쉼:36,'큰 쉼':72};
function decorate(){const bs=RE.parseCuts(CUTS,engineChars()),by={};bs.forEach(b=>{const m=/^#(\d+):/.exec(b.key||'');if(m)by[+m[1]]=b});
  const P=state.panels||[];
  list.querySelectorAll('li[data-i]').forEach(li=>{const i=+li.dataset.i,b=by[i],box=li.querySelector('.cutbox');if(!box)return;
    let sd=li.querySelector('.cutside');if(!sd){sd=document.createElement('div');sd.className='cutside';li.insertBefore(sd,li.querySelector('.tools'))}
    if(!li.querySelector('.cutadd')){const ad=document.createElement('button');ad.type='button';ad.className='cutadd';ad.textContent='+';ad.title='이 컷 아래에 새 컷';ad.setAttribute('aria-label',`${i+1}번 컷 아래에 새 컷`);li.appendChild(ad)}
    let lb=li.querySelector('.lenbar');if(!lb){lb=document.createElement('i');lb.className='lenbar';li.querySelector('.cn')?.after(lb)}
    const has=!!String(CUTS[i]||'').trim();box.classList.toggle('has',has);
    if(!b||!has){sd.innerHTML='';li.style.removeProperty('--gap');li.removeAttribute('data-gap');li.classList.remove('hl');li.style.removeProperty('--band');lb.style.height='0';return}
    const c=P.find(x=>x.key===b.key),g=RoughGrammar.derive(c?{...b,emo:c.emo,i:c.i}:b),gd=g.edit||{};
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
  st.innerHTML=`<div class="ss-row"><span><b>${bs.length}</b>컷</span><span>대사 <b>${nd}</b></span><span>나레이션 <b>${nc}</b></span><span>효과음 <b>${ns}</b></span>${P.length?`<span>세로 약 <b>${Math.round(tall).toLocaleString()}px</b> · 휴대폰 ${screens}화면</span>`:''}${hl.length?`<span class="ss-hl">★ 하이라이트 ${hl.join('·')}컷</span>`:''}${RE.PREFS?`<span class="ss-pref" title="글 {…}로 엔진 값을 같은 방향으로 3번 이상 고친 것을 다음부터 반영해요">내 취향 반영 중 · <button type="button" class="link" onclick="resetPrefs()">초기화</button></span>`:''}</div>${Object.keys(cast).length?`<div class="ss-cast">${Object.entries(cast).map(([n,k])=>`<span>${face(n,' sm')}${esc(n)} · 대사 ${k}</span>`).join('')}</div>`:''}`}
// ---------- 작가 취향 학습: 글 {…}로 엔진 값을 고친 기록 → 엔진이 다음부터 그쪽으로(엔진 setPrefs) ----------
// 기록 키 = 씬 id:컷 자리:항목(마지막 값만). 엔진 원래 값(pre)과 글에 적은 값이 같아도 기록(동의도 근거)
const PREF_KEY='rough-prefs-log';let PLOG={};try{PLOG=JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}catch(_){}
const gtag=g=>g<0.13?'붙임':g<0.33?'보통':g<0.65?'쉼':'큰 쉼';
function recordPrefs(){const sc=SCENES[SCUR];if(!sc)return;let ch=false;
  for(const c of state.panels||[]){const D=c.dir,pre=c.pre;if(!D||!pre)continue;const slot=+(/^#(\d+):/.exec(c.key||'')||[])[1];
    const put=(f,auto,chosen)=>{const k=`${sc.id}:${slot}:${f}`,o=PLOG[k];if(!o||o.auto!==auto||o.chosen!==chosen){PLOG[k]={f,auto,chosen,at:Date.now()};ch=true}};  // 값이 바뀌면 새 기록(초기화로 꺼 둔 것도 다시 셈)
    if(D.shot)put('shot',pre.shot,D.shot);if(D.ang)put('ang',pre.ang,D.ang);if(D.h)put('h',pre.h,D.h);if(D.gap)put('gap',gtag(pre.gap),D.gap)}
  // 글에서 지시를 지운 컷은 기록도 지움
  const live=new Set();for(const c of state.panels||[]){const slot=+(/^#(\d+):/.exec(c.key||'')||[])[1],D=c.dir||{};['shot','ang','h','gap'].forEach(f=>{if(D[f])live.add(`${sc.id}:${slot}:${f}`)})}
  for(const k of Object.keys(PLOG))if(k.startsWith(sc.id+':')&&!live.has(k)){delete PLOG[k];ch=true}
  if(ch){try{localStorage.setItem(PREF_KEY,JSON.stringify(PLOG))}catch(_){}const before=JSON.stringify(RE.PREFS);RE.setPrefs(PLOG);if(JSON.stringify(RE.PREFS)!==before)setTimeout(()=>compute(false),0)}}
RE.setPrefs(PLOG);
// 초기화: 지금까지 기록은 꺼 둠(muted). 글에 남아 있는 지시로 바로 다시 배우지 않고, 이후 새로 고친 것만 셈
window.resetPrefs=()=>{for(const o of Object.values(PLOG))o.muted=true;try{localStorage.setItem(PREF_KEY,JSON.stringify(PLOG))}catch(_){}RE.setPrefs(PLOG);compute(false);toast('내 취향 학습을 초기화했어요 · 앞으로 고치는 것부터 다시 배워요')};
{const _rp=renderParse;renderParse=function(...a){const r=_rp(...a);decorate();return r}}
{const _c=compute;compute=function(...a){const r=_c(...a);recordPrefs();if(VIEW==='write')decorate();return r}}
decorate();

// 컷 사이 + : 이 컷 바로 아래에 빈 컷(이미지·편집값도 한 칸씩 밀림)
list.addEventListener('click',e=>{const ad=e.target.closest('.cutadd');if(!ad)return;const i=+ad.closest('li').dataset.i,n=CUTS.length;
  remapCuts(SCUR,()=>{cutEdits().splice(i+1,0,null);CUTS.splice(i+1,0,'');return moveMap(n,x=>x>i?x+1:x)});renderCuts();cutChanged();document.querySelectorAll('.cutin')[i+1]?.focus()});
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

// ---------- 오른쪽 실시간 미리보기: 보기 전용(스크롤만). 바꾸는 건 왼쪽 글(문법)로만 ----------
// 편집 화면과 같은 그리기라 연출 지시·직접 고친 배치·등록 그림이 그대로 보임. 고른 컷은 파랗게 표시하고 따라감
{const side=document.querySelector('.scside');if(side){
  side.querySelectorAll(':scope>section.insp').forEach(x=>x.hidden=true);  // 인물·세계관 요약은 이 화면에서 뺌(요소는 다른 코드가 써서 남겨 둠)
  const box=document.createElement('div');box.className='wpvbox';box.id='wpvbox';box.setAttribute('aria-label','연출 미리보기(보기 전용)');side.prepend(box);side.classList.add('pvmode');
  let sel=-1,raf=0;const slotOf=p=>+(/^#(\d+):/.exec(p?.key||'')||[])[1];
  function render(){raf=0;if(VIEW!=='write'||!side.offsetParent)return;const ps=state.panels||[];
    if(!ps.length){box.innerHTML='<p class="empty">컷을 쓰면 여기에 바로 그려져요</p>';return}
    const imgs=ps.map((p,k)=>cutImg(SCUR,k,p)||null),keep=box.scrollTop;
    box.innerHTML=renderSVG(ps,sel,'sp_',true,imgs,false,{edits:SCENES[SCUR].pageEdits,interactive:false,sceneEnd:sceneEndColor(SCUR,ps)});
    box.scrollTop=keep;if(sel>=0)reveal(sel)}
  function draw(){if(!raf)raf=requestAnimationFrame(render)}
  function reveal(i){const g=box.querySelector(`[data-p="${i}"]`);if(!g)return;const gr=g.getBoundingClientRect(),br=box.getBoundingClientRect();
    if(gr.top<br.top||gr.bottom>br.bottom)box.scrollTo({top:box.scrollTop+gr.top-br.top-Math.max(16,(br.height-gr.height)/2),behavior:'smooth'})}
  {const _c=compute;compute=function(...a){const r=_c(...a);if(VIEW==='write')draw();return r}}
  {const _r=renderSlots;renderSlots=function(...a){const r=_r(...a);if(VIEW==='write')draw();return r}}
  {const _s=showView;showView=function(...a){const r=_s(...a);if(VIEW==='write')draw();return r}}
  list.addEventListener('focusin',e=>{const li=e.target.closest('li[data-i]');if(!li)return;const i=(state.panels||[]).findIndex(p=>slotOf(p)===+li.dataset.i);if(i!==sel){sel=i;draw()}});
  draw()}}
})();
