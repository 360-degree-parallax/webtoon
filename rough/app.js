// 자동 생성: tools/build_app.py — 고치지 말고 rough/src/의 조각을 고친 뒤 다시 만드세요
// src/app-core.js → src/app-setbook.js → src/app-scene.js → src/app-edit.js → src/app-edit2.js → src/app-views.js
// 러프 툴 본체 1/6 — 공통: 계산·읽기·표·메뉴·그리기·식자·참고 이미지·프롬프트 내보내기
// 원본 조각: tools/build_app.py가 6개를 순서대로 이어 rough/app.js를 만듦(사이트는 app.js 하나를 실음 — 조각끼리 불러올 때 서로 부르는 곳이 많아 따로 싣지 않음)
// UX 시안(docs/ux-brief-plan.md): 기본은 채택안 C(컷 우선). ?ux=A(예전 화면) · B(문구 정리)는 사람 확인이 끝날 때까지 비교용으로 남김
const UX='C';document.documentElement.dataset.ux=UX;  // 화면 비교안(?ux=A/B/C)은 정리됨. 남은 코드 호환용 상수
const W=690;
// 식자 글꼴 5종: 연출 DB 컷(DN·GM·HC·HN·MD 말풍선 80장)을 보고 고름. 모두 OFL 웹 글꼴(jsDelivr, 쓰는 글자 조각만 받음)
const FONT_PRESETS={
  narrow:{name:'좁은 고딕',note:'GM·HC 대사',family:'"Pretendard Variable",Pretendard,sans-serif',weight:600,bold:800,ls:-1.6},
  batang:{name:'바탕',note:'HN 대사 · 기본',family:'"Gowun Batang","Noto Serif KR",serif',weight:400,bold:700,ls:-0.4},
  pen:{name:'손글씨',note:'혼잣말 · 메모',family:'"Nanum Pen Script",cursive',weight:400,bold:400,ls:0,size:1.4}};
// 글자 꾸밈(말풍선·나레이션 공통): 색 · 굵게 · 기울임 · 밑줄 → <text> 속성
// 글자 테두리: outline이 색이면 그 색, 'none'이면 없음, 비어 있으면 def(나레이션은 자동 대비색, 말풍선은 없음)
const textDeco=(edit,FP,baseW,k=1,def='')=>{const w=edit?.bold?(FP?.bold||800):edit?.bold===false?(FP?.weight||400):baseW;
  const o=edit?.outline==='none'?'':/^#[0-9a-f]{6}$/i.test(edit?.outline||'')?edit.outline:def;
  return ` font-weight="${w}"${edit?.italic?' font-style="italic"':''}${edit?.underline?' text-decoration="underline"':''}${o?` stroke="${o}" stroke-width="${(3.2*k).toFixed(1)}" stroke-linejoin="round" paint-order="stroke"`:''}`};
const fontPreset=id=>FONT_PRESETS[id]||null;
let PAGE_FONT='Pretendard,system-ui,sans-serif';let PAGE_PRESET='batang';try{const v=localStorage.getItem('rough-page-preset');if(v&&FONT_PRESETS[v])PAGE_PRESET=v}catch(_){}/* 모든 글씨 기본은 바탕 */try{PAGE_FONT=localStorage.getItem('rough-page-font')||PAGE_FONT}catch(_){}const $=s=>document.querySelector(s);const RE=window.RoughEngine;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CUT_BASE='cuts/',FIX_BASE='cuts-fixed/'; // 원본 / 피그마에서 말풍선 정리한 수정본(같은 경로·같은 이름)
const LEN=[['짧게',.6],['보통',1],['길게',1.5],['아주 길게',2.2]];
const lenWord=h=>h<.7?'짧게':h<1.2?'보통':h<2?'길게':'아주 길게';
// 서사 형태 코드(DB·엔진 값 '끝 정점' 등)는 그대로 두고 화면에는 '하이라이트'로
const NARR_LABEL={'끝 정점':'끝 하이라이트','중간 정점':'중간 하이라이트','정점 선행':'하이라이트 먼저','정점 연속':'하이라이트 연속','무정점':'하이라이트 없음'};const narrLabel=s=>NARR_LABEL[s]||s;
const NARR={'끝 정점':'마지막 컷에서 터지는 장면','중간 정점':'가운데서 터지고 가라앉는 장면','정점 선행':'처음부터 터지고 수습하는 장면','정점 연속':'계속 몰아치는 장면','무정점':'큰 고비 없이 흐르는 장면'};
const CURVE={'상승':'감정이 점점 올라가요','하강':'감정이 점점 가라앉아요','산형':'감정이 올랐다 내려와요','골형':'가라앉았다 다시 올라요','평탄':'감정이 고르게 이어져요'};
const PART={narr:'서사 형태',curve:'감정 곡선',goal:'연출 목적',vng:'VNG 순서',count:'컷 수',trans:'컷 전환',tempo:'템포',dist:'거리 흐름',emo:'감정'};
let PATS=[],REFS=[],REF_ALL=0,CUTMETA={};
// 편집 화면에서 직접 고른 레퍼런스(pageEdits[컷].ref = 원본 컷 ID). 말풍선 많은 컷도 직접 고르면 씀
let REF_PICK={};
// 컷 경로는 ID에서 계산(DN-01-001 → DN/01/DN-01-001.jpg). 목록에는 WebP 썸네일
const cutFile=id=>/^[A-Z]{2}-\d{2}-\d{3}$/.test(id||'')?`${id.slice(0,2)}/${id.slice(3,5)}/${id}.jpg`:null;
const cutThumb=id=>{const f=cutFile(id);return f?'cuts/thumbs/'+f.replace(/\.jpg$/,'.webp'):null};
// 처음 열 때 받는 컷 목록: index.min.json(열 단위·필요한 필드만) → 객체로 펼침. 없으면 index.json
async function loadCutIndex(){
  try{const r=await fetch(CUT_BASE+'index.min.json');if(r.ok){const m=await r.json();
    return {note:m.note,items:m.rows.map(row=>{const o={};m.cols.forEach((k,i)=>{if(row[i]!==undefined&&row[i]!==null)o[k]=row[i]});
      o.source_cut=o.id;o.file=cutFile(o.id);o.work=m.works[o.id.slice(0,2)];o.thumb=cutThumb(o.id);delete o.id;return o})}}}catch(_){}
  try{const r=await fetch(CUT_BASE+'index.json');if(r.ok)return r.json()}catch(_){}
  return {items:[]}}
function pickRef(c,edits,i){const id=edits?.[cutSlot(c,i)]?.ref;return (id&&REF_PICK[id])||RE.suggestRef(c,REFS)}
const locks={};              // 문장(key) → {shot, ang, h}
const state={an:[],ranks:[],pick:[],panels:[],sel:-1,svg:''};

// ---------- compute ----------
function compute(resetPick){
  state.an=RE.analyzeCuts(CUTS,engineChars());
  if(resetPick||state.pick.length!==state.an.length)state.pick=state.an.map(()=>0);
  state.ranks=state.an.map(a=>RE.rank(a,PATS,12));
  state.panels=[];
  state.an.forEach((a,ci)=>{const r=state.ranks[ci][state.pick[ci]];if(!r)return;
    RE.layout(a,r.p).forEach(c=>{const L=locks[c.key]||{};c.auto={shot:c.shot,ang:c.ang,h:c.h};Object.assign(c,L);c.lock=L;c.chunk=ci;c.ref=pickRef(c,SCENES[SCUR]?.pageEdits,state.panels.length);state.panels.push(c)})});
  state.panels.forEach((c,i)=>c.side=i%2?'left':'right');
  if(state.sel>=state.panels.length)state.sel=-1;
  const n=state.panels.length;$('#count').textContent=n?`${n}컷`:'';$('#count').title=n?`${state.an.length}묶음 · ${$('#scmeta2')?.textContent||''}`:'';$('#pvsize').textContent=n?`${n}컷`:'';
  renderReading();renderTable();render();
  $('#pname').textContent=state.ranks.length?state.ranks.map((r,i)=>`${state.pick[i]+1}/${r.length}`).join(' · ')+'안':'—'}

// ---------- reading ----------
function renderReading(){
  if(!state.an.length){$('#reading').innerHTML='<p class="empty">장면을 적으면 여기서 판정 결과를 보여줘요.</p>';return}
  const blocks=state.an.map((a,ci)=>{const r=state.ranks[ci][state.pick[ci]];const p=r?.p;
    const top=r?Object.entries(r.parts).filter(([k,v])=>v>=.99).map(([k])=>PART[k]).slice(0,4).join('·'):'';
    return `<div class="read">${state.an.length>1?`<div class="chunkno">${ci+1}묶음 · ${a.beats.length}컷</div>`:''}
    <div class="sum">${esc(NARR[a.narr])}이에요. ${esc(CURVE[a.curve])}. ${p?`${esc(a.goal)}을 노려 <button class="dictlink" data-dict-open="${esc(p.name)}" title="연출 사전에서 보기">${esc(p.name)}</button>로 짰어요.`:''}</div>
    <dl class="kv">
      <div><dt>서사 형태</dt><dd>${esc(narrLabel(a.narr))}<small>${esc(a.narrWhy)}</small></dd></div>
      <div><dt>연출 목적</dt><dd>${esc(a.goal)}<small>${esc(a.goalWhy)}</small></dd></div>
      <div><dt>감정 곡선</dt><dd>${esc(a.curve)}<small>${a.beats.map(b=>b.i).join(' → ')}</small></dd></div>
      <div><dt>템포</dt><dd>${esc(a.tempo)}<small>목표 거리 ${esc(a.dist)}</small></dd></div>
      <div><dt>주된 전환</dt><dd>${esc(a.trans)}<small>VNG ${esc(a.vng)}</small></dd></div>
    </dl>
    ${p?`<div class="match"><span class="meter"><i style="width:${r.pct}%"></i></span><b>${r.pct}%</b> 참고 패턴 ${esc(p.src)}-${esc(p.id)} · ${esc(p.dist)} · ${esc(p.tempo)}<span class="why">${top?`${esc(top)} 일치`:''}</span></div>`:''}${altList(ci)}</div>`});
  // B·C: 씬 제목 + 컷 수·한 줄 요약 + [컷 순서 편집] [연출 근거]. 판정 카드는 연출 근거 안에
  const sc=SCENES[SCUR],n=state.panels.length,lines=state.an.map(a=>oneLine(a));
  $('#reading').innerHTML=`<div class="rhead"><h2 data-work>${esc(sc.title||'제목 없는 씬')}</h2><p>${n}컷 · ${state.an.length>1?lines.map((l,k)=>`${k+1}묶음 ${esc(l)}`).join(' / '):esc(lines[0])}</p><div class="btnrow"><button class="btn" data-view="write">컷 순서 편집</button><button class="btn" data-act="whytoggle" aria-expanded="${WHY_OPEN}">연출 근거</button><span class="btnsep" aria-hidden="true"></span><span class="chip" id="naistat2">이미지 ${cutCount(SCUR,state.panels)}/${n}</span><button class="btn" data-act="naiset" aria-expanded="false">작화 설정</button><button class="btn" data-act="nairefine">Claude로 다듬기</button><button class="btn" data-act="naimulti" title="파일 이름 순으로 빈 컷부터 채워요">그림 여러 장</button></div></div><div class="whybox"${WHY_OPEN?'':' hidden'}><p class="hint">컷 글에서 감정·하이라이트·연출 목적을 계산하고, 연출 DB ${PATS.length}묶음 중 가장 닮은 패턴으로 짰어요.</p>${blocks.join('')}</div>`}
// 서사 형태 코드 → 장면 한 줄(엔진 값은 그대로)
function oneLine(a){const k=(a.peaks?.[0]??-1)+1;return {'끝 정점':'마지막 컷에서 터뜨려요','중간 정점':`${k}번 컷에서 가장 세게 가요`,'정점 선행':'첫 컷부터 세게 열어요','정점 연속':'세게 몰아붙여요','무정점':'고르게 흘러가요'}[a.narr]||narrLabel(a.narr)}
let WHY_OPEN=false;
// 다른 후보: 같은 묶음의 2~4위 패턴, 누르면 그 패턴으로
function altList(ci){const rs=state.ranks[ci]||[],cur=state.pick[ci];const alt=rs.map((r,k)=>({r,k})).filter(x=>x.k!==cur).slice(0,3);
  return alt.length?`<div class="alts"><span>다른 후보</span>${alt.map(({r,k})=>`<button class="btn sm" data-act="pickalt" data-ci="${ci}" data-k="${k}">${esc(r.p.name||r.p.id)} <small>${esc(r.p.src)}-${esc(r.p.id)}</small> · ${r.pct}%</button>`).join('')}</div>`:''}

// ---------- table ----------
const gapWord=g=>g<0.13?'붙임':g<0.33?'보통':g<0.65?'쉼':'큰 쉼';
function renderTable(){
  if(!state.panels.length){$('#tbl').innerHTML='';return}
  const head=`<div class="tr head"><span></span><span>컷</span><span>구조</span><span>감정·강도</span><span>샷</span><span>앵글</span><span>길이</span><span class="ref">그림</span></div>`;const NC=OPENP.size?naiCuts():null;
  $('#tbl').innerHTML=head+state.panels.map((c,i)=>{const P=c.vng==='P';
    const v=(f,label,why)=>`<div><button class="val${c.lock[f]!==undefined?' lock':''}" data-f="${f}" data-i="${i}" title="${esc(why)}">${esc(label)}</button><div class="why">${esc(why)}</div></div>`;
    return `<div class="tr${i===state.sel?' on':''}" data-i="${i}">
      <button class="n" data-sel="${i}" aria-label="${i+1}번 컷 선택">${i+1}</button>
      <div class="beat" data-sel="${i}" data-work><b>${esc(c.act.replace(/["“][^"”]*["”]/,'').trim()||c.act)}</b><small>${esc([c.who,c.said&&`“${c.said}”`].filter(Boolean).join(' · '))}</small>${c.caption?`<span class="cap">${esc(c.caption)}</span>`:''}${(c.sfx||[]).map(x=>`<span class="cap sfx">-${esc(x)}-</span>`).join(' ')}<div class="rowacts"><button class="link" data-act="lprompt" data-i="${i}" aria-expanded="${OPENP.has(i)}">${OPENP.has(i)?'프롬프트 접기':'프롬프트'}</button>${c.ref?`<button class="link" data-ref="${i}" title="${esc(c.ref.label)}의 샷·앵글·길이를 이 컷에">레퍼런스 구도 입히기</button>`:''}</div></div>
      <div><span class="vng"><em class="${c.vng}">${c.vng}</em>${esc(c.role)}</span><div class="why">${esc(state.an[c.chunk].beats.find(b=>b.key===c.key)?.roleWhy||'')}</div></div>
      <div><span style="font-size:14px;font-weight:600">${esc(c.emo)}</span><div class="dots${P?' P':''}">${[1,2,3].map(k=>`<i class="${c.i>=k?'on':''}"></i>`).join('')}</div><div class="why">${esc(state.an[c.chunk].beats.find(b=>b.key===c.key)?.emoWhy||'')}</div></div>
      ${v('shot',c.shot,c.lock.shot!==undefined?'직접 고름':c.why.shot.slice(1).join(' · ')||c.why.shot[0])}
      ${v('ang',c.ang,c.lock.ang!==undefined?'직접 고름':c.why.ang.join(' · '))}
      <div>${v('h',lenWord(c.h),c.lock.h!==undefined?'직접 고름':c.why.h.slice(1).join(' · ')||c.why.h[0])}<div class="gapw" title="${esc(c.why.gap.join(' · '))}">↓ <b>${gapWord(c.gap)}</b> <span class="gwhy">${esc(c.why.gap.slice(1).join(' · '))}</span></div></div>
      ${artCell(c,i)}
    </div>${OPENP.has(i)&&NC?.[i]?`<div class="trnp" data-i="${i}">${naiPromptHTML(c,i,NC[i].o)}</div>`:''}`}).join('')}
// 콘티 줄의 그림 칸: 넣은 그림, 없으면 레퍼런스를 흐리게 + 누르거나 끌어다 놓아 등록
const OPENP=new Set();
function artCell(c,i){const im=cutImg(SCUR,i,c),lab=`${i+1}번 컷 그림 ${im?'바꾸기':'등록'}`;
  return `<div class="ref art"><div class="drop artd${im?' has':''}${im?.stale?' stale':''}" tabindex="0" role="button" data-cutslot="${i}" aria-label="${lab}" title="${im?'눌러서 바꾸기 · 파일을 끌어다 놓아도 돼요':'눌러서 그림 등록 · 파일을 끌어다 놓아도 돼요'}">${im?`<img src="${im.src}" alt="${i+1}번 컷"><button class="x" data-delcut="${i}" aria-label="${i+1}번 컷 그림 빼기">×</button>`:`${c.ref?`<img class="refimg" src="${c.ref.src}" alt="" loading="lazy">`:''}<span class="plus" aria-hidden="true">+</span>`}</div>${im?.stale?`<button class="link warn" data-act="nstale" data-i="${i}" title="그림을 넣은 뒤 원고가 바뀌었어요">변경 확인</button>`:''}</div>`}
const nblk=(t,sub,txt)=>`<div class="nf"><header><h4>${t}</h4><button class="btn" data-act="ncopy">복사</button></header><pre>${esc(txt)}</pre></div>`;
function naiPromptHTML(p,i,o){const S=o.settings;
  return `<div class="cmeta">${esc([p.who,p.shot,p.ang,p.emo].filter(Boolean).join(' · '))} · ${o.size.w} × ${o.size.h}${o.size.exact?'':' → 생성 후 '+esc(o.size.crop)}${o.ai?' · <span class="tag">Claude</span>':''}<button class="btn sm" data-act="ncopyall" data-i="${i}">전체 복사</button></div>
    ${nblk('기본 프롬프트','',o.base)}${o.dbNote?`<p class="dbnote">${esc(o.dbNote)}</p>`:''}
    ${o.chars.map((c,n)=>nblk(`캐릭터 ${n+1} · ${esc(c.name)}`,`위치 ${c.pos.cell}`,c.prompt)).join('')}
    <div class="nset"><div><b>해상도</b>${o.size.w} × ${o.size.h}</div><div><b>Steps · Guidance</b>${S.steps} · ${S.guidance}</div><div><b>Sampler</b>${S.sampler} · ${S.noise}</div><div><b>img2img</b>Strength ${S.strength} · Noise ${S.noiseImg}</div><div><b>캐릭터 위치</b>${o.chars.map(c=>`${esc(c.name)} ${c.pos.cell}`).join(' · ')||'인물 없음'}</div><div><b>레퍼런스</b>${o.charRef?`Character Reference: ${esc(o.charRef)}`:o.vibe?'Vibe Transfer: 장면 이미지':'없음'}</div></div>
    <div class="nbtns"><button class="btn" data-act="naibase" data-i="${i}">바탕 PNG (${o.size.w}×${o.size.h})</button>${o.charRef?`<button class="btn" data-act="nairef" data-n="${esc(o.charRef)}">캐릭터 레퍼런스 이미지</button>`:o.vibe?'<button class="btn" data-act="naivibe">장면 이미지</button>':''}</div>`}

// ---------- menu (override) ----------
let menuFor=null;
function openMenu(btn){const i=+btn.dataset.i,f=btn.dataset.f,c=state.panels[i];menuFor={i,f};
  const opts=f==='shot'?RE.SHOTS.map(s=>[s,s]):f==='ang'?RE.ANGLES.map(s=>[s,s]):LEN.map(([w,h])=>[w,h]);
  const cur=f==='h'?lenWord(c.h):c[f],auto=f==='h'?lenWord(c.auto.h):c.auto[f];
  $('#menu').innerHTML=opts.map(([l,v])=>`<button role="menuitemradio" aria-checked="${l===cur}" data-v="${v}">${esc(l)}${l===auto?'<small>자동</small>':''}</button>`).join('')+(c.lock[f]!==undefined?`<hr><button data-v="__auto">자동으로 되돌리기</button>`:'');
  const r=btn.getBoundingClientRect();const m=$('#menu');m.hidden=false;m.style.left=Math.min(innerWidth-m.offsetWidth-8,r.left+scrollX)+'px';m.style.top=(r.bottom+scrollY+4)+'px'}
function closeMenu(){$('#menu').hidden=true;menuFor=null}
$('#menu').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!menuFor)return;const mi=menuFor.i,c=state.panels[mi],f=menuFor.f;const L=locks[c.key]||(locks[c.key]={});
  if(b.dataset.v==='__auto')delete L[f];else L[f]=f==='h'?+b.dataset.v:b.dataset.v;closeMenu();state.sel=mi;compute(false)});
document.addEventListener('click',e=>{if(!e.target.closest('#menu')&&!e.target.closest('.val'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});

$('#tbl').addEventListener('click',e=>{const v=e.target.closest('.val');if(v){e.stopPropagation();state.sel=+v.dataset.i;markSel();openMenu(v);return}
  const t=e.target.closest('[data-ref]');if(t){const c=state.panels[+t.dataset.ref];const L=locks[c.key]||(locks[c.key]={});Object.assign(L,{shot:c.ref.shot,ang:c.ref.angle,h:c.ref.h_ratio});state.sel=+t.dataset.ref;compute(false);toast(`${state.sel+1}번 컷에 ${c.ref.label} 구도를 입혔어요`);return}
  const s=e.target.closest('[data-sel]');if(s){state.sel=+s.dataset.sel;markSel();reveal()}});
function markSel(){document.querySelectorAll('.tr[data-i]').forEach(r=>r.classList.toggle('on',+r.dataset.i===state.sel));render()}
$('#preview').addEventListener('click',e=>{const g=e.target.closest('[data-p]');if(!g)return;state.sel=+g.dataset.p;markSel();document.querySelector(`.tr[data-i="${state.sel}"]`)?.scrollIntoView({block:'center',behavior:'smooth'})});
function reveal(){const g=$(`#preview [data-p="${state.sel}"]`),c=$('#canvas');if(!g)return;const gr=g.getBoundingClientRect(),cr=c.getBoundingClientRect();if(gr.top<cr.top||gr.bottom>cr.bottom-90)c.scrollBy({top:gr.top-cr.top-20,behavior:'smooth'})}

// ---------- actions ----------
let tmr;
function toast(m,ms=1800){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),ms)}
function download(name,href){const a=document.createElement("a");a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove()}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(a==='clear'){CUTS=[''];SCENES[SCUR].pageEdits=[];saveCuts();renderCuts();compute(true);document.querySelector('.cutin')?.focus()}
  else if(a==='whytoggle'){WHY_OPEN=!WHY_OPEN;renderReading()}
  else if(a==='pickalt'){state.pick[+el.dataset.ci]=+el.dataset.k;compute(false);toast(`「${state.ranks[+el.dataset.ci][+el.dataset.k].p.name}」 패턴으로 바꿨어요`)}
  else if(a==='next'||a==='prev'){state.pick=state.pick.map((v,i)=>{const n=state.ranks[i].length;return (v+(a==='next'?1:-1)+n)%n});compute(false);toast(`${state.pick[0]+1}번째로 닮은 패턴으로 바꿨어요`)}
  else if(a==='svg'&&state.svg){download('rough.svg',URL.createObjectURL(new Blob([state.svg],{type:'image/svg+xml'})));toast('SVG로 저장했어요')}
  else if(a==='png'&&state.svg){const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=img.width*2;c.height=img.height*2;const g=c.getContext('2d');g.scale(2,2);g.fillStyle='#fff';g.fillRect(0,0,img.width,img.height);g.drawImage(img,0,0);download('rough.png',c.toDataURL('image/png'))};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(state.svg);toast('PNG로 저장했어요')}});
const THEMES=['','light','dark'];
try{const t=localStorage.getItem('rough-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
$('#theme').onclick=()=>{const cur=document.documentElement.dataset.theme||'';const nx=THEMES[(THEMES.indexOf(cur)+1)%3];if(nx)document.documentElement.dataset.theme=nx;else delete document.documentElement.dataset.theme;try{localStorage.setItem('rough-theme',nx)}catch(_){}toast(nx===''?'시스템 테마':nx==='light'?'라이트 테마':'다크 테마')};

// ---------- drawing ----------
function rng(seed){let a=0;for(const c of seed)a=Math.imul(a^c.charCodeAt(0),16777619)>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function drawPanel(p,x,y,w,h,idx){const R=rng(p.act+idx),j=a=>(R()-.5)*a,st='#333';let o='';
  const L=(x1,y1,x2,y2,sw=2)=>`<path d="M${x1+j(2)} ${y1+j(2)}Q${(x1+x2)/2+j(4)} ${(y1+y2)/2+j(4)} ${x2+j(2)} ${y2+j(2)}" stroke="${st}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  const C=(cx,cy,r,sw=2)=>`<ellipse cx="${cx}" cy="${cy}" rx="${r*(1+j(.08))}" ry="${r*(1+j(.08))}" stroke="${st}" stroke-width="${sw}" fill="#fff"/>`;
  const dir=R()<.5?-1:1;
  const fig=(fx,g,s,full)=>{const hr=s*.11,hy=g-s+hr,ty=hy+hr+s*.15;let f=C(fx,hy,hr,2.4)+`<circle cx="${fx+dir*hr*.45}" cy="${hy}" r="${Math.max(1.5,hr*.12)}" fill="${st}"/>`;
    f+=L(fx,hy+hr,fx,ty+s*.25,2.4)+L(fx,ty,fx-s*.17,ty+s*.2)+L(fx,ty,fx+dir*s*.2,ty+s*.08);if(full)f+=L(fx,ty+s*.25,fx-s*.1,g)+L(fx,ty+s*.25,fx+s*.1,g);return f};
  const head=(cx,cy,r)=>C(cx,cy,r,3)+`<ellipse cx="${cx+dir*r*.4}" cy="${cy}" rx="${r*.08}" ry="${r*.12}" fill="${st}"/>`+L(cx-r*.6,cy+r*.95,cx-r*.9,cy+r*1.8,3)+L(cx+r*.6,cy+r*.95,cx+r*.9,cy+r*1.8,3);
  const n=(p.act.match(/,|와 |과 |둘|두 사람/g)||[]).length?2:1;
  if(p.ang==='하이앵글'||p.ang==='탑뷰')o+=`<path d="M${x} ${y+h} L${x+w/2} ${y+h*.35} L${x+w} ${y+h}" stroke="#bbb" stroke-dasharray="4 6" fill="none"/>`;
  if(p.ang==='로우앵글')o+=`<path d="M${x} ${y} L${x+w/2} ${y+h*.7} L${x+w} ${y}" stroke="#bbb" stroke-dasharray="4 6" fill="none"/>`;
  const gy=y+h*.88;
  if(p.shot==='설정'){const hz=y+h*.65;o+=L(x,hz,x+w,hz);for(let i=0;i<3;i++){const bw=w*(.15+R()*.1),bx=x+w*(.1+i*.3),bh=h*(.2+R()*.25);o+=`<rect x="${bx}" y="${hz-bh}" width="${bw}" height="${bh}" stroke="${st}" stroke-width="2" fill="none"/>`}}
  else if(p.shot==='전경'){const hz=y+h*.6;o+=L(x,hz,x+w,hz,1.5);const s=h*.35;for(let i=0;i<n;i++)o+=fig(x+w*(.4+i*.15),hz+h*.2,s,true)}
  else if(p.shot==='전신'){const s=h*.75;for(let i=0;i<n;i++)o+=fig(x+w*(n===1?.5:.38+i*.24),gy,s,true)}
  else if(p.shot==='중경'){const s=h*1.15;for(let i=0;i<n;i++)o+=fig(x+w*(n===1?.5:.32+i*.36),y+h+s*.3,s,false)}
  else if(p.shot==='클로즈업'){const r=Math.min(w,h)*.4;o+=head(x+w*.5+j(w*.15),y+h*.55,r)}
  else if(p.shot==='디테일'){const r=Math.min(w,h)*.35;o+=`<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${r*1.3}" ry="${r*.8}" stroke="${st}" stroke-width="3" fill="none"/>`+C(x+w/2,y+h/2,r*.35,3)}
  else{for(let i=0;i<20;i++){const a=i/20*Math.PI*2;o+=L(x+w/2+Math.cos(a)*w*.15,y+h/2+Math.sin(a)*h*.15,x+w/2+Math.cos(a)*w,y+h/2+Math.sin(a)*h,1)}o+=head(x+w/2,y+h/2,Math.min(w,h)*.2)}
  if(p.said){const bw=Math.min(w*.6,48+p.said.length*16),bh=64,bx=x+w-bw-16,by=y+16;o+=`<ellipse cx="${bx+bw/2}" cy="${by+bh/2}" rx="${bw/2}" ry="${bh/2}" fill="#fff" stroke="#333" stroke-width="2"/><text x="${bx+bw/2}" y="${by+bh/2+6}" font-size="18" text-anchor="middle" fill="#222">${esc(p.said.slice(0,16))}</text>`}
  return o}
// ---------- 식자·말풍선 (녹빛 레퍼런스 54장 분석 기준) ----------
// 말풍선: 크림색 바탕 + 손그림 느낌 잉크선, 패널 위쪽, 테두리를 걸치기도 함. 꼬리는 가늘고 길게 화자 쪽.
// 종류: 보통(타원) / 떨림(울퉁불퉁) / 외침(뾰족) / 생각(구름 + 작은 원) / 작게(작은 타원, 작은 글자)
// 식자: 장면 첫머리·시간 표시는 장식 상자(초록 계열 + 모서리 잎), 일반은 반투명 사각 상자, 여운 컷은 글자만. 아래 가운데.
// 기본 말풍선: 연출 DB 컷에서 가장 많이 쓰인 모양 — 흰 바탕 · 검은 실선 · 매끈한 타원 · 가는 꼬리
const LT={ink:'#161616',paper:'#ffffff',text:'#161616'};
const rngL=seed=>{let h=2166136261;for(const ch of String(seed))h=Math.imul(h^ch.charCodeAt(0),16777619);return()=>((h=Math.imul(h^(h>>>15),2246822507)^Math.imul(h^(h>>>13),3266489909))>>>0)/4294967296};
function wrapKo(t,max){const words=String(t).trim().split(/\s+/);const out=[];let cur='';for(const w of words){if(!cur)cur=w;else if((cur+' '+w).length<=max)cur+=' '+w;else{out.push(cur);cur=w}}if(cur)out.push(cur);
  return out.flatMap(l=>l.length>max+3?l.match(new RegExp(`.{1,${max}}`,'g')):[l])}
function wrapLetter(text,width,edited){
  return edited?text.split(/\r?\n/).flatMap(line=>line.trim()?wrapKo(line,width):['']):wrapKo(text,width);
}
function balloonKind(d,p){const n=d.note||'',t=d.text||'';
  if(/속으로|생각|독백|마음속/.test(n))return'thought';
  if(/작게|속삭|조용히|혼잣말|중얼/.test(n)||/^[.…·\s]+$/.test(t))return'small';
  if(/외치|소리치|버럭|화나|고함|비명/.test(n)||(/!/.test(t)&&(p.i>=2||/분노|놀람/.test(p.emo))))return'shout';
  if(/떨|당황|머뭇|더듬|놀라|울먹|당황해/.test(n)||/^…|^\.\.\./.test(t)||/당황|긴장/.test(p.emo))return'shaky';
  return'normal'}
function shapePath(cx,cy,rx,ry,kind,R){const pts=[];
  if(kind==='shout'){const n=16;for(let k=0;k<n*2;k++){const a=k/(n*2)*Math.PI*2,r=k%2?1:1.22+R()*.08;pts.push([cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r])}return'M'+pts.map(q=>q.map(v=>v.toFixed(1)).join(' ')).join(' L')+'Z'}
  if(kind==='thought'||kind==='shaky'){const n=kind==='thought'?9:14,amp=kind==='thought'?.16:.06;let d='';for(let k=0;k<=n;k++){const a=k/n*Math.PI*2,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;
      if(!k){d=`M${x.toFixed(1)} ${y.toFixed(1)}`;continue}const am=(a+(k-1)/n*Math.PI*2)/2,o=1+amp*2+R()*amp;d+=` Q${(cx+Math.cos(am)*rx*o).toFixed(1)} ${(cy+Math.sin(am)*ry*o).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`}return d+'Z'}
  return `M${(cx-rx).toFixed(1)} ${cy.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx+rx).toFixed(1)} ${cy.toFixed(1)} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(cx-rx).toFixed(1)} ${cy.toFixed(1)}Z`}
const BALLOON_STYLES=[
  ['round-box','둥근 네모','M -1 0 C -1 -.69 -.74 -1 0 -1 C .77 -1 1 -.64 1 0 C 1 .72 .70 1 0 1 C -.72 1 -1 .72 -1 0Z',1.7],
  ['breath','거친 호흡','M -.07 -1 Q .02 -1.04 .1 -.96 L .91 -.57 Q 1 -.54 .97 -.37 L 1 .4 L .91 .68 L .04 .99 Q -.04 1.03 -.16 .98 L -.78 .84 L -.94 .44 Q -1.04 .13 -1 -.13 L -.94 -.42 Q -1 -.55 -.88 -.58Z',2.1],
  ['torn','찢어진 외침','M -.83 -.87 Q -.67 -.73 -.13 -.84 Q .33 -.87 .53 -1.12 Q .46 -.82 .65 -.94 Q .62 -.75 .81 -.96 Q .75 -.62 .84 -.14 Q .85 .07 .99 -.10 Q .88 .33 1 .76 Q .85 .62 .76 .70 Q .40 .84 .17 1.06 Q -.2 .87 -.48 .91 Q -.50 .71 -.60 .76 Q -.63 .62 -.85 .65 Q -.81 .36 -.86 .18 L -.97 -.44 Q -.85 -.29 -.83 -.87Z',2],
  ['phone','전화 · 겹선 육각','M 0 -1 L .92 -.5 L .92 .5 L 0 1 L -.92 .5 L -.92 -.5Z',1.4],
  ['hazy','아련한 생각 · 입자','M -1 0 A 1 1 0 1 0 1 0 A 1 1 0 1 0 -1 0Z',.8],
  ['radial','의미심장 · 집중선','M -1 0 A 1 1 0 1 0 1 0 A 1 1 0 1 0 -1 0Z',0],
  ['charcoal','분노 · 거친 원','M -.99 .03 C -1 -.54 -.57 -.99 -.02 -1 C .56 -.98 .99 -.54 .99 -.01 C 1 .58 .56 1 -.04 1 C -.61 .98 -.98 .54 -.99 .03Z',3.3],
  ['narration','나레이션 · 사각','M -1 -1 H 1 V 1 H -1Z',1.8],
  ['tight-wave','잘게 떨리는 원','',1.9],
  ['even','반듯한 각진 원','M -1 -.02 C -1 -.55 -.72 -.89 -.31 -.96 C .17 -1.07 .59 -1 .84 -.64 C 1 -.43 1.02 -.10 .99 .22 C .92 .73 .66 1 .05 1 C -.49 1 -.98 .83 -1 -.02Z',1.5],
  ['pressure','강한 필압 원','M -.99 -.09 C -.97 -.61 -.65 -1.02 -.08 -.99 C .44 -1.03 .91 -.60 .99 -.10 C 1.06 .49 .67 1.01 .09 1 C -.55 1.04 -1.01 .70 -.99 -.09Z',2.8],
  ['soft-wave','잔잔한 울퉁불퉁 원','M -.97 -.25 C -.86 -.56 -.55 -.99 -.21 -1 C .19 -1.04 .64 -.78 .84 -.50 C 1.05 -.28 1.03 .22 .87 .44 C .70 .67 .43 .96 .11 1 C -.22 1.04 -.51 .86 -.78 .65 C -1 .47 -1.06 .02 -.97 -.25Z',1.55],
  ['angular','각진 필압 원','M -.97 -.12 Q -.97 -.41 -.70 -.70 Q -.44 -1 -.29 -1 Q .21 -.99 .62 -.74 Q .94 -.52 .99 -.19 Q 1 .19 .89 .53 Q .84 .73 .54 .84 Q .13 1 -.22 .98 Q -.40 .94 -.58 .79 Q -.91 .51 -.97 -.12Z',2],
  ['whisper','속삭임 · 점선','M -1 0 C -1 -.55 -.75 -1 -.04 -1 C .62 -1 1 -.69 1 -.02 C 1 .60 .72 1 -.04 1 C -.67 1 -1 .63 -1 0Z',1.9],
  ['heavy-wave','크게 울퉁불퉁한 원','',2.5]
];
const balloonPreset=key=>BALLOON_STYLES.find(style=>style[0]===key);
const CAN_LINK=new Set(BALLOON_STYLES.slice(9).map(style=>style[0]));
const DRAW_RAYS=240;
function presetContour(style,R,linked){
  const [key,,path]=style;
  const polar=(a,r)=>[(Math.cos(a)*r).toFixed(3),(Math.sin(a)*r).toFixed(3)].join(' ');
  if(linked){
    const outline='M -.27 -1.70 C -.17 -1.69 -2.04 -2.06 -1.87 -.63 C -1.82 .12 -1.12 .49 -.38 .23 C -.62 1.03 -.29 1.70 .49 1.87 C 1.30 2.07 1.88 1.49 1.86 .75 C 1.85 .02 1.27 -.44 .32 -.20 C .54 -.85 .32 -1.51 -.27 -1.70Z';
    if(key==='even'||key==='pressure'||key==='whisper')return outline;
    if(key==='angular')return 'M -.3 -1.74 Q -1.29 -1.9 -1.84 -1 Q -2.01 -.36 -1.59 -.03 Q -1.12 .51 -.4 .21 Q -.5 .76 -.39 1.35 Q .02 1.8 .51 1.92 Q 1.41 2.02 1.84 1.29 Q 2.05 .62 1.57 .13 Q 1.12 -.35 .34 -.19 Q .49 -.88 -.3 -1.74Z';
    if(key==='heavy-wave')return 'M -.35 -1.77 Q -.53 -1.85 -.70 -1.76 Q -.89 -1.84 -1.01 -1.68 Q -1.25 -1.69 -1.33 -1.49 Q -1.59 -1.44 -1.62 -1.18 Q -1.88 -1.04 -1.82 -.87 Q -1.99 -.64 -1.81 -.45 Q -1.87 -.18 -1.61 -.04 Q -1.51 .23 -1.24 .23 Q -.97 .44 -.77 .31 Q -.55 .35 -.34 .20 Q -.59 .52 -.43 .67 Q -.56 .94 -.37 1.10 Q -.38 1.34 -.12 1.42 Q -.04 1.62 .23 1.67 Q .46 1.92 .68 1.80 Q .95 1.95 1.07 1.77 Q 1.39 1.82 1.47 1.55 Q 1.74 1.51 1.75 1.24 Q 1.97 1.12 1.82 .87 Q 1.99 .64 1.77 .47 Q 1.83 .21 1.58 .08 Q 1.50 -.15 1.22 -.17 Q .96 -.35 .72 -.21 Q .55 -.28 .36 -.19 Q .47 -.38 .36 -.51 Q .47 -.78 .32 -.88 Q .38 -1.23 .14 -1.35 Q .05 -1.62 -.17 -1.61Z';
    const wave=.12;
    return outline.replace(/-?(?:[0-9]*\.)?[0-9]+/g,n=>(Number(n)+(R()-.5)*wave).toFixed(3));
  }
  if(path)return path;
  const count=key==='tight-wave'?28:15;
  let d='M 1 0';
  for(let i=1;i<=count;i++){
    const a=i*Math.PI*2/count,r=key==='tight-wave'?(.958+R()*.088):(i%3?.92:1.07);
    d+=' Q '+polar(a-Math.PI/count,1+(R()-.5)*.22)+' '+(i===count?'1 0':polar(a,r));
  }
  return d+'Z';
}
function presetBalloon(style,cx,cy,rx,ry,k,R,linked){
  const [key,,,width]=style,path=presetContour(style,R,linked),weight=width*k;
  const polar=(a,r)=>`${(Math.cos(a)*r).toFixed(3)} ${(Math.sin(a)*r).toFixed(3)}`;
  const draw=(w,fill,extra='')=>`<path d="${path}" fill="${fill}" stroke="#161616" stroke-width="${w}" vector-effect="non-scaling-stroke" stroke-linejoin="round" ${extra}/>`;
  let outline=draw(weight,'#fff',key==='whisper'?'stroke-dasharray="4 3.5"':''),trim='';
  if(key==='phone'){
    outline=draw(0,'#fff');
    const verts=[[0,-1],[.92,-.5],[.92,.5],[0,1],[-.92,.5],[-.92,-.5]];
    for(let i=0;i<6;i++){
      const [x,y]=verts[i],[x2,y2]=verts[(i+1)%6],dx=x2-x,dy=y2-y;
      for(const inset of [-.033,0,.033]){
        const extend=.075,xx=-dy*inset,yy=dx*inset;
        const coords=[x-dx*extend+xx,y-dy*extend+yy,x2+dx*extend+xx,y2+dy*extend+yy].map(v=>v.toFixed(3));
        trim+='<path d="M '+coords.slice(0,2).join(' ')+' L '+coords.slice(2).join(' ')+'" stroke="#232323" stroke-width="'+(inset?weight*.55:weight*.8)+'" vector-effect="non-scaling-stroke"/>';
      }
    }
  }
  if(key==='radial'){
    for(let i=0;i<DRAW_RAYS;i++){
      const a=i*Math.PI*2/DRAW_RAYS+(R()-.5)*.013,r=1.18+R()*.37;
      trim+=`<path d="M ${polar(a-.007,.95)} L ${polar(a,r)} L ${polar(a+.007,.95)}Z" fill="#171717" opacity="${(.66+R()*.34).toFixed(2)}"/>`;
    }
    outline=trim+outline;trim='';
  }
  if(key==='hazy'||key==='charcoal'){
    const haze=key==='hazy';
    outline=draw(weight,'#fff',haze?'stroke-opacity=".18"':'stroke-opacity=".86"');
    for(let i=0;i<(haze?620:390);i++){
      const a=R()*Math.PI*2,r=1+(R()+R()-1)*(haze?.09:.04);
      const [x,y]=polar(a,r).split(' ');
      trim+=`<circle cx="${x}" cy="${y}" r="${(.003+R()*.011).toFixed(3)}" fill="#121212" opacity="${(R()*(haze?.27:.66)).toFixed(2)}"/>`;
    }
  }
  if(key==='pressure'||key==='angular')outline+=draw(weight*.68,'none','opacity=".54" stroke-dasharray="17 10 29 36 8 18" transform="translate(-.01 .009)"');
  const transform=`translate(${cx} ${cy}) scale(${rx} ${ry})`;
  return {body:`<g transform="${transform}">${outline+trim}</g>`,cover:`<path d="${path}" fill="#fff" transform="${transform}"/>`};
}
function balloonTail(meta,tip){
  const {rx,ry,k,kind,bx,by,ex,ey,tx,ty}=meta;
  const cx=meta.anchorX??meta.cx,cy=meta.anchorY??meta.cy;
  if(meta.showTail===false)return {svg:'',end:{x:ex,y:ey}};
  if(kind==='thought'){
    const end=tip||{x:cx+(tx-cx)*.45,y:cy+ry+(ty-cy-ry)*.45};
    const angle=Math.atan2(end.y-cy,end.x-cx);
    const start=tip?{x:cx+Math.cos(angle)*rx*.88,y:cy+Math.sin(angle)*ry*.88}:{x:cx,y:cy+ry};
    const svg=[1,2,3].map(n=>{
      const x=start.x+(end.x-start.x)*n/3,y=start.y+(end.y-start.y)*n/3;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(7.5-n*1.5)*k}" fill="${LT.paper}" stroke="${LT.ink}" stroke-width="${1.8*k}"/>`;
    }).join('');
    return {svg,end};
  }
  const end=tip||{x:ex,y:ey};
  const angle=Math.atan2(end.y-cy,end.x-cx);
  const x=tip?cx+Math.cos(angle)*rx*.84:bx,y=tip?cy+Math.sin(angle)*ry*.84:by;
  const w=(kind==='small'?6:10)*k,wx=tip?Math.sin(angle)*w:w,wy=tip?-Math.cos(angle)*w:0;
  const mx=(x+end.x)/2,my=(y+end.y)/2;
  const pair=(px,py)=>`${px.toFixed(1)} ${py.toFixed(1)}`;
  const path=`M${pair(x-wx,y-wy)} Q${pair(mx-wx*.4,my-wy*.4)} ${pair(end.x,end.y)} Q${pair(mx+wx*.6,my+wy*.6)} ${pair(x+wx,y+wy)}Z`;
  // 몸통 테두리는 안쪽 절반이 덮개(cover)에 가려 바깥 절반만 보임 → 꼬리도 같은 굵기로 긋고 그 위에 꼬리 면을 덮어 바깥 절반만 보이게(이전엔 꼬리만 두 배 굵어 보였음)
  const fill=meta.preset?'#fff':LT.paper;
  return {end,svg:`<path d="${path}" fill="${fill}" stroke="${meta.preset?'#161616':LT.ink}" stroke-width="${(meta.sw||2*k).toFixed(2)}" stroke-linejoin="round"${meta.preset==='whisper'?' stroke-dasharray="4 3.5"':''}/><path d="${path}" fill="${fill}" stroke="none"/>`};
}
function balloonTransform(meta,scale){
  return `translate(${meta.cx} ${meta.cy}) scale(${scale}) translate(${-meta.cx} ${-meta.cy})`;
}
function balloonTip(meta,offset){
  if(!Number.isFinite(offset?.x)||!Number.isFinite(offset?.y))return;
  return {x:meta.cx+offset.x,y:meta.cy+offset.y};
}
function tailTransform(end){return `translate(${end.x} ${end.y})`}
function balloonSVG(d,p,box,slot,R,edit,interactive){const preset=balloonPreset(edit?.style);
  const kind=preset?'normal':balloonKind(d,p),small=kind==='small',k=box.w/630;
  const punch=(d.text||'').length<=6&&p.i>=2&&kind!=='small';
  const linked=!!(preset&&CAN_LINK.has(preset[0])&&edit?.linked&&Array.from(d.text.trim()).length>1);
  const showTail=edit?.showTail??(!preset||linked);
  const edited=typeof edit?.text==='string';
  const lines=wrapLetter(d.text||'',small?10:9,edited);
  const midpoint=Math.ceil(lines.length/2);
  const groups=!linked?[preset||edited?lines:lines.slice(0,5)]:lines.length>1?
    [lines.slice(0,midpoint),lines.slice(midpoint)]:[lines[0].slice(0,Math.ceil(lines[0].length/2)),lines[0].slice(Math.ceil(lines[0].length/2))].map(line=>[line]);
  const rows=Math.max(...groups.map(group=>group.length));
  const nominal=(small?16:punch?26:21)*k;
  const FP=fontPreset(edit?.font)||fontPreset(PAGE_PRESET);
  const fs=(edited?Math.min(nominal,box.h*.5/(rows*1.4+2.6)):nominal)*(FP?.size||1),lh=fs*1.4;
  const tw=Math.max(...groups.flat().map(l=>l.length))*fs*.98,th=rows*lh;
  // bw·bh: 편집 화면 옆 손잡이로 늘린 가로·세로(px). 글자 크기는 그대로, 상자만
  // 상자를 줄여도 글이 밖으로 넘치지 않게 글 크기 + 여백을 최소로
  const rx=Math.max(tw/2+fs*.95,Math.max(tw/2+fs*1.5,fs*3.2)+(edit?.bw||0)/2);
  const aspect=preset?.[0]==='narration'?1.32:1.13;
  const ry=Math.max(th/2+fs*.8,Math.max(th/2+fs*1.3,fs*2.2,preset?rx/aspect:0)+(edit?.bh||0)/2);
  const ext=rx*(linked?1.9:preset?.[0]==='radial'?1.55:1);
  const side=d.who&&p.who&&d.who!==p.who?(p.side==='left'?'right':'left'):(p.side||'right');
  const cx=Math.min(Math.max(box.x+box.w*(slot%2?(side==='left'?.7:.3):(side==='left'?.3:.7)),box.x+ext+6),box.x+box.w-ext-6);
  const breakTop=box.frame&&slot===0&&box.y>60&&ry*2<box.h*.5;const cy=(breakTop?box.y+ry*.25:box.y+ry+14+slot*ry*1.55)+(linked?ry*.69:0);
  const tx=box.x+box.w*(side==='left'?.3:.7),ty=Math.min(box.y+box.h*.55,cy+ry+Math.max(40,box.h*.18));
  const anchorX=cx+(linked?.84*rx:0),anchorY=cy+(linked?.82*ry:0);
  const bx=linked?anchorX+.48*rx:cx+(tx-cx)*.2,by=anchorY+ry*.86,len=Math.hypot(tx-bx,ty-by)||1;
  const r=Math.min(1,(kind==='shout'?60:80)*k/len);
  const meta={cx,cy,anchorX,anchorY,rx,ry,k,kind,bx,by,tx,ty,showTail,preset:preset?.[0],sw:preset?(+preset[3]||2)*k:(small?1.8:2.2)*k,
    ex:linked?bx+.58*rx:bx+(tx-bx)*r,ey:linked?by+.38*ry:by+(ty-by)*r};
  const tail=balloonTail(meta,balloonTip(meta,edit?.tail));
  const path=preset?null:shapePath(cx,cy,rx,ry,kind,R),sw=(small?1.8:2.2)*k;
  const styled=preset?presetBalloon(preset,cx,cy,rx,ry,k,rngL((p.key||p.act)+slot),linked):null;
  const body=styled?.body||`<path d="${path}" fill="${LT.paper}" stroke="${LT.ink}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  // 꼬리 위에 몸통을 다시 덮어 이음새를 지움
  const cover=!showTail||kind==='thought'?'':styled?.cover||`<path d="${path}" fill="${LT.paper}" stroke="none"/>`;
  const serif=FP?` font-family='${FP.family}'`:preset?.[0]==='narration'?` font-family="${esc(PAGE_FONT)}"`:'';
  const autoW=['pressure','torn'].includes(preset?.[0])||punch?800:preset?.[0]==='whisper'?400:500;
  const weight=edit?.font&&FP?FP.weight:FP&&autoW===500?FP.weight:autoW;  // 직접 고른 글꼴이 우선, 아니면 모양·강도에 따른 굵기
  const text=groups.map((group,j)=>{
    const x=cx+(linked?(j?.85:-.76)*rx:0),y=cy+(linked?(j?.81:-.73)*ry:0);
    return group.map((l,n)=>`<text x="${x.toFixed(1)}" y="${(y-group.length*lh/2+lh*(n+.72)).toFixed(1)}" font-size="${fs.toFixed(1)}"${textDeco(edit,FP,weight,k)} text-anchor="middle" fill="${/^#[0-9a-f]{6}$/i.test(edit?.color||'')?edit.color:LT.text}"${serif} letter-spacing="${FP?FP.ls*k:-0.3}">${esc(l)}</text>`).join('');
  }).join('');
  const scale=edit?.scale||1;
  if(!interactive&&scale===1)return body+tail.svg+cover+text;
  const data=interactive?` class="balloon-art" data-balloon="${esc(JSON.stringify(meta))}"`:'';
  const suffix=interactive&&showTail?`<g class="tail-handle" data-tail-handle="" tabindex="0" role="button" aria-label="꼬리 끝점 · 방향키로 이동" transform="${tailTransform(tail.end)}"><circle r="8" fill="transparent" stroke="transparent" stroke-width="28" vector-effect="non-scaling-stroke"/><circle r="8" fill="#fff" stroke="#2d71f7" stroke-width="2" vector-effect="non-scaling-stroke"/><circle r="2.5" fill="#2d71f7"/></g>`:'';
  const tailArt=interactive?`<g data-tail-art="">${tail.svg}</g>`:tail.svg;
  return `<g${data} transform="${balloonTransform(meta,scale)}">${body+tailArt+cover+text+suffix}</g>`;
}
// 나레이션 기본: 연출 DB 나레이션 컷 471개에서 가장 많은 형태 — 상자 없이 글자만, 가운데 정렬(HN·MD·DN 대부분)
// 그림 위에서도 읽히게 흰 테두리를 얇게. 형태 「나레이션 · 사각」을 고르면 흰 사각 상자
function captionSVG(t,p,box,first,edit,n=0){
  const k=box.w/630,edited=typeof edit?.text==='string';
  const wrapped=wrapLetter(t,16,edited),lines=edited?wrapped:wrapped.slice(0,3);
  const FP=fontPreset(edit?.font)||fontPreset(PAGE_PRESET);
  const fs=(edited?Math.min(19*k,box.h*.48/(lines.length*1.5+1.6)):19*k)*(FP?.size||1),lh=fs*1.5;
  const tw=Math.max(...lines.map(l=>l.length))*fs,th=lines.length*lh;
  const bw=edit?.bw||0,bh=edit?.bh||0,w=Math.max(tw+fs*.8,tw+fs*2.6+bw),h=Math.max(th+fs*.6,th+fs*1.6+bh),x=box.x+(box.w-w)/2,y=box.y+box.h-h-Math.max(16,box.h*.06)-n*(h+10*k);  // 두 번째부터는 위로 쌓음
  const color=/^#[0-9a-f]{6}$/i.test(edit?.color||'')?edit.color:'#161616';
  const lum=parseInt(color.slice(1,3),16)*.299+parseInt(color.slice(3,5),16)*.587+parseInt(color.slice(5,7),16)*.114,halo=lum<140?'#ffffff':'#161616';
  const fam=FP?` font-family='${FP.family}' letter-spacing="${FP.ls*k}"`:` font-family="${esc(PAGE_FONT)}"`;
  const txt=def=>lines.map((l,i)=>`<text x="${(x+w/2).toFixed(1)}" y="${(y+(h-th-fs*1.6)/2+fs*.8+lh*(i+.75)).toFixed(1)}" font-size="${fs.toFixed(1)}"${textDeco(edit,FP,FP?FP.weight:600,k,def)} text-anchor="middle" fill="${color}"${fam}>${esc(l)}</text>`).join('');
  // 고르기·옮기기용 투명 상자(손잡이가 잡을 자리)
  const hit=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="transparent"/>`;
  if(edit?.style==='narration')return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#161616" stroke-width="${1.8*k}"/>`+txt('');
  return hit+txt(halo)}
function soundEffectSVG(text,box,side,index,position){
  const variant=position?.materialVariant||'A';
  const art=window.RoughMaterials.image(window.RoughMaterials.find(text),variant)||window.RoughSoundEffects?.match(text);
  const x=box.x+box.w*(variant==='D'||index%2?.5:side==='left'?.67:.33);
  const gap=box.before??0;
  const y=variant==='D'?box.y-gap/2+(gap<15?12:0):Math.min(box.y+box.h*.83,box.y+box.h*(.61+index*.12));
  if(art){
    const ratio=variant==='D'?Math.min(box.w*.15/art.width,Math.max(18,gap*.48)/art.height,49/art.height):
      Math.min(box.w*.27/art.width,box.h*.29/art.height,160/art.height);
    const w=(art.width*ratio).toFixed(2),h=(art.height*ratio).toFixed(2);
    // 색: 어두운 획은 고른 색, 흰 테두리는 흰색 그대로(밝기에 따라 섞음)
    const tint=/^#[0-9a-f]{6}$/i.test(position?.color||'')?position.color:'';let fdef='',fat='';
    if(tint){const c=[1,3,5].map(i=>parseInt(tint.slice(i,i+2),16)/255),row=v=>`${((1-v)*.2126).toFixed(4)} ${((1-v)*.7152).toFixed(4)} ${((1-v)*.0722).toFixed(4)} 0 ${v.toFixed(4)}`,fid='sfxc'+tint.slice(1);
      fdef=`<filter id="${fid}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${row(c[0])} ${row(c[1])} ${row(c[2])} 0 0 0 1 0"/></filter>`;fat=` filter="url(#${fid})"`}
    return `${fdef}<image x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" href="${art.src}"${fat}/>`;
  }
  const glyphs=Array.from(text.trim());
  if(!glyphs.length)return '';
  const size=Math.min(54*box.w/630,box.h*.18,box.w*.40/(glyphs.length*.79+.4));
  const step=size*.78;
  const glyphInk=/^#[0-9a-f]{6}$/i.test(position?.color||'')?position.color:'#171717';
  const letters=glyphs.map((char,i)=>{
    const dx=(i-(glyphs.length-1)/2)*step,dy=((i%3)-1)*size*.08,angle=[-4,2,-1][i%3];
    const transform=`translate(${dx} ${dy}) rotate(${angle}) skewX(-7)`;
    const base=`x="0" y="0" transform="${transform}"`;
    return `<text ${base} fill="none" stroke="${glyphInk}" stroke-width="${size*.15}" stroke-linejoin="round">${esc(char)}</text><text ${base} fill="${glyphInk}" stroke="#fff" stroke-width="${size*.09}" paint-order="stroke" stroke-linejoin="round">${esc(char)}</text>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) rotate(-12)" font-family="Pretendard, Noto Sans KR, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" dominant-baseline="central">${letters}</g>`;
}
// 내보내기 때만 켬: 식자마다 그룹으로 감싸 레이어로 나눌 수 있게
let LAYER_TAGS=false;
function letterSVG(p,box,idx,positions,interactive,extras=[]){const R=rngL(p.key||p.act);const parts=[];let addWho='';
  const add=(key,label,source,draw)=>{
    const pos=positions?.[key],text=pos?.text??source;
    const move=Number.isFinite(pos?.x)&&Number.isFinite(pos?.y)?` transform="translate(${pos.x} ${pos.y})"`:'';
    const attrText=esc(text).replace(/\n/g,'&#10;');
    const who=key.startsWith('dialog-')?addWho:'';
    const access=interactive?` data-letter="${key}" data-letter-text="${attrText}"${who?` data-who="${esc(who)}"`:''} tabindex="0" aria-label="${label} ${attrText}"`:'';
    let svg=draw(text,pos);
    // 나레이션·효과음 크기(scale): 제 자리 가운데를 기준으로 키움. 말풍선은 balloonTransform이 따로 처리
    const lsc=+pos?.scale||1;if(!/^dialog/.test(key)&&lsc!==1)svg=`<g class="lsc" style="transform-box:fill-box;transform-origin:center;transform:scale(${lsc})">${svg}</g>`;
    // 회전(rot, 도): 제 자리 가운데 기준
    const rot=+pos?.rot||0;if(rot)svg=`<g class="lrot" style="transform-box:fill-box;transform-origin:center;transform:rotate(${rot}deg)">${svg}</g>`;
    // 겹침 순서(z): 값이 있으면 그 순서, 없으면 그린 순서
    const z=Number.isFinite(pos?.z)?pos.z:parts.length;
    let o='';o+=LAYER_TAGS?`<g data-layer="${label}" data-text="${attrText}"${move}>${svg}</g>`:move||access?`<g${move}${access}>${svg}</g>`:svg;
    parts.push({z,o});
  };
  (p.sfx||[]).forEach((text,n)=>add('effect-'+n,'효과음',text,(value,pos)=>soundEffectSVG(value,box,p.side,n,pos)));
  extras.forEach((item,n)=>add('material-'+item.id,'효과음',item.text,(value,pos)=>soundEffectSVG(value,box,p.side,n+(p.sfx?.length||0),pos)));
  // 나레이션은 컷마다 여러 개: 첫째 'caption', 둘째부터 'caption-1'…(예전 저장 위치와 호환)
  (p.captions||(p.caption?[p.caption]:[])).forEach((c,n)=>add(n?'caption-'+n:'caption','나레이션',c,(value,pos)=>captionSVG(value,p,box,idx===0&&!n,pos,n)));
  const ds=(p.dialogs||[]).filter(d=>d.text);if(!ds.length&&p.said)ds.push({who:p.who,text:p.said});
  ds.forEach((d,n)=>{
    addWho=d.who||'';add('dialog-'+n,'말풍선',d.text,(value,pos)=>balloonSVG({...d,text:value},p,box,n,R,pos,interactive));
  });
  return parts.map((x,i)=>({...x,i})).sort((a,b)=>a.z-b.z||a.i-b.i).map(x=>x.o).join('');
}
function cutSlot(p,i){const slot=/^#(\d+):/.exec(p.key||'');return slot?Number(slot[1]):i}
function defaultPageGap(p){return Math.round(p.gap*(W-60)*.45)+24}
const MAX_PAGE_GAP=1600;
const PAGE_BACKGROUNDS=[
  null,
  {name:'별빛',start:'#101621',mid:'#516b8b',stop:51,ink:'#b4dbff',marks:130},
  {name:'불씨',start:'#080708',mid:'#593029',stop:73,ink:'#ff635d',marks:112},
  {name:'장밋빛 파편',start:'#9e787d',mid:'#20151b',stop:55,ink:'#f8d3d7',marks:104},
  {name:'번진 잉크',start:'#0a0709',mid:'#50363c',stop:46,ink:'#c3a5a8',marks:115},
  {name:'흑백 입자',start:'#131313',mid:'#777777',stop:46,ink:'#ffffff',marks:350},
  {name:'수평 노이즈',start:'#08090c',mid:'#525252',stop:47,ink:'#ffffff',marks:290}
];
const PAGE_WHITE='#ffffff';
function pageBackground(edit){
  return /^#[\da-f]{6}$/i.test(edit?.background||'')?edit.background:PAGE_BACKGROUNDS[edit?.transition]?.start||PAGE_WHITE;
}
function transitionTexture(preset,id){
  const {ink,marks}=PAGE_BACKGROUNDS[preset],rand=rngL(id.split('-').at(-1)+':'+preset);
  let art='';
  if(preset===4||preset===5){
    art+=`<filter id="${id}-grain" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${preset===4?'.11 .36':'.68 .94'}" numOctaves="3" seed="${preset}"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 .95 0 0 0 0 .95 5 0 0 0 -2.6"/></filter><rect width="690" height="240" opacity="${preset===4?.44:.67}" filter="url(#${id}-grain)"/>`;
  }
  if(preset<=3){
    art+=`<radialGradient id="${id}-halo"><stop stop-color="${ink}" stop-opacity=".72"/><stop offset="1" stop-color="${ink}" stop-opacity="0"/></radialGradient>`;
  }
  for(let i=0;i<marks;i++){
    const x=Math.round(rand()*690),t=rand(),scale=rand(),y=Math.round(240*(preset===2?Math.sqrt(t):t)),dim=(.13+rand()*.73).toFixed(2);
    if(preset===6){
      const dark=rand()<y/240;
      art+=`<rect x="${x}" y="${y}" width="${Math.round(2+scale*scale*39)}" height="${scale>.93?2:1}" fill="${dark?'#111111':ink}" opacity="${dim}"/>`;
    }else if(preset===2||preset===3){
      const r=(1+scale**3*(preset===2?8:12)).toFixed(1);
      if(scale>.94)art+=`<ellipse cx="${x}" cy="${y}" rx="${r*4}" ry="${r*2.3}" fill="url(#${id}-halo)" opacity=".6"/>`;
      art+=`<path d="M0 -1 L${r} -2 L2 ${r}Z" transform="translate(${x} ${y}) rotate(${Math.round(rand()*360)})" fill="${ink}" opacity="${dim}"/>`;
    }else{
      const r=(.55+scale**4*(preset===4?18:preset===5?1.25:2.8)).toFixed(1);
      if(preset===1&&scale>.94)art+=`<ellipse cx="${x}" cy="${y}" rx="${r*6}" ry="${r*3.6}" fill="url(#${id}-halo)"/>`;
      art+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${ink}" opacity="${dim}"/>`;
    }
  }
  return `<mask id="${id}-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="690" height="240"><linearGradient id="${id}-alpha" x2="0" y2="1"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".23" stop-color="#fff" stop-opacity=".85"/><stop offset=".63" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><rect width="690" height="240" fill="url(#${id}-alpha)"/></mask><g mask="url(#${id}-fade)">${art}</g>`;
}
// opt: {mid:'#rrggbb'|'none', stop:0~100, img:배경 이미지 id, imgOp:0~1} — 컷마다 전환의 중간색·위치와 배경 이미지를 덮어씀
function transitionSVG(from,to,preset,id,y,height,opt={}){
  const style=PAGE_BACKGROUNDS[preset],midC=opt.mid==='none'?null:(opt.mid||style?.mid),stop=opt.stop??style?.stop??50;
  const mid=midC?`<stop offset="${stop}%" stop-color="${midC}"/>`:'';
  const bgi=opt.img&&IMG.bg[opt.img];
  const fill=!mid&&!style&&from===to?from:`url(#${id})`;
  const gradient=fill===from?'':`<linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${from}"/>${mid}<stop offset="1" stop-color="${to}"/></linearGradient>`;
  const pic=bgi?`<image data-bg-image="${esc(opt.img)}" href="${bgi.src}" width="690" height="240" preserveAspectRatio="xMidYMid slice" opacity="${opt.imgOp??1}" mask="url(#${id}-pfade)"/><mask id="${id}-pfade" maskUnits="userSpaceOnUse" x="0" y="0" width="690" height="240"><linearGradient id="${id}-pa" x2="0" y2="1"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff"/><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><rect width="690" height="240" fill="url(#${id}-pa)"/></mask>`:'';
  return `<svg data-page-transition="1" y="${y}" width="${W}" height="${height}" viewBox="0 0 690 240" preserveAspectRatio="none" overflow="hidden">${gradient}<rect width="690" height="240" fill="${fill}"/>${style?transitionTexture(preset,id):''}${pic}</svg>`;
}
function gapMarkup(y,size,base,slot,i){
  return `<g data-page-gap="${i}" data-slot="${slot}" data-gap-size="${size}" data-gap-base="${base}" data-gap-y="${y}" role="slider" tabindex="0" aria-label="${i+1}컷과 ${i+2}컷 사이 간격" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="${MAX_PAGE_GAP}" aria-valuenow="${size}">
    <rect class="gap-area" width="${W}" y="${y}" height="${size}"/>
    <g class="gap-grip" transform="translate(${W/2} ${y+size/2})">
      <rect x="-64" y="-40" width="128" height="80" fill="transparent"/>
      <g class="gap-track">
        <path d="M-78 0H78" stroke="#2d71f7" stroke-width="2" stroke-dasharray="4 4"/>
        <rect x="-52" y="-17" width="104" height="34" rx="17" fill="#fff" stroke="#2d71f7"/>
        <path d="M-42 -3l4 -4 4 4M-42 3l4 4 4 -4" fill="none" stroke="#2d71f7" stroke-width="1.5"/>
        <text y="5" text-anchor="middle" fill="#234eab" font-size="15" font-weight="700">${size} px</text>
      </g>
    </g>
  </g>`;
}
// 패널 배치: 여러 컷을 이어 그릴 때 설정·효과 배경 컷은 좌우 끝까지(테두리 없음), 디테일 인서트는 좁게 번갈아
function panelBox(p,i,multi){const ws=W-60;if(!multi)return{x:30,w:ws,frame:true};
  if(p.shot==='설정'||p.shot==='효과 배경')return{x:0,w:W,frame:false};
  if(p.shot==='디테일'){const w=Math.round(ws*.72);return{x:p.side==='left'?30:30+ws-w,w,frame:true}}
  return{x:30,w:ws,frame:true}}
function renderSVG(panels,sel=-1,pre='c',nums=true,imgs=null,clean=false,{edits,interactive=false,rough=false,sceneEnd=null}={}){let y=40,o='',gaps='',backgrounds='',defs='',lastEnd=null;const multi=panels.length>1;
  let prev=null,handles='',tightGaps='';
  panels.forEach((p,i)=>{const slot=cutSlot(p,i),edit=RoughGrammar.merge(edits?.[slot],p);const im=imgs&&imgs[i];const B=panelBox(p,i,multi);let bx=B.x,bw=B.w;let h=Math.round(im&&im.w?bw*im.h/im.w:p.h*bw);
    // 편집 화면에서 끌어 바꾼 칸 크기(x·폭·높이)
    if(edit?.frame){bx=edit.frame.x;bw=edit.frame.w;h=edit.frame.h}const on=i===sel;const blank=!!edit?.blank;const u=im||blank?null:underlay(p);
    // 코드로 그린 러프 그림은 쓰지 않음: 등록 이미지 → 원본 컷 레퍼런스(그림 영역만 잘라) → 빈 칸에 샷·앵글 표시
    let art=im?`<image href="${im.src}" x="${bx}" y="${y}" width="${bw}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`:'';
    if(u){const c=u.crop&&u.w?u.crop:null;const vb=c?`${(c[0]*u.w).toFixed(0)} ${(c[1]*u.h).toFixed(0)} ${((c[2]-c[0])*u.w).toFixed(0)} ${((c[3]-c[1])*u.h).toFixed(0)}`:null;
      art=c?`<svg x="${bx}" y="${y}" width="${bw}" height="${h}" viewBox="${vb}" preserveAspectRatio="xMidYMid slice"><image href="${u.src}" width="${u.w}" height="${u.h}" opacity="${u.op}"${u.color?'':' filter="url(#gs)"'}/></svg>`:`<image href="${u.src}" x="${bx}" y="${y}" width="${bw}" height="${h}" preserveAspectRatio="xMidYMid slice" opacity="${u.op}"${u.color?'':' filter="url(#gs)"'}/>`}
    else if(!im&&!blank)art=`<text x="${bx+bw/2}" y="${y+h/2+6}" font-size="16" font-weight="600" text-anchor="middle" fill="#b6bac2">${esc(p.shot||'')} · ${esc(p.ang||'')}</text>`;
    // 빈 컷: 그림·테두리 없이 배경 위에 글만(나레이션·대사만 있는 쉼 컷). 편집 화면에서만 점선 자리 표시
    if(blank)art=interactive?`<rect x="${bx+1}" y="${y+1}" width="${bw-2}" height="${h-2}" fill="none" stroke="#9aa3b2" stroke-width="1.5" stroke-dasharray="6 6" data-blank-guide=""/><text x="${bx+bw-10}" y="${y+22}" font-size="13" font-weight="600" text-anchor="end" fill="#9aa3b2" data-blank-guide="">빈 컷</text>`:'';
    // (지금은 자동 칸이 늘 네모라 u.quad가 비어 있음 — 아래 편집 꼭짓점만 칸 모양을 바꿈)
    const box=[[bx,y],[bx+bw,y],[bx+bw,y+h],[bx,y+h]];
    let pts=u&&u.quad&&u.crop?u.quad.map(([qx,qy])=>[bx+(qx-u.crop[0])/(u.crop[2]-u.crop[0])*bw,y+(qy-u.crop[1])/(u.crop[3]-u.crop[1])*h]):null;
    // 편집 화면에서 꼭짓점을 끌어 바꾼 칸 모양(상자 모서리 기준 오프셋)
    if(Array.isArray(edit?.quad)&&edit.quad.length===4)pts=box.map(([cx,cy],k)=>[cx+edit.quad[k][0],cy+edit.quad[k][1]]);
    const fp=pts||(interactive?box:null),poly=fp?fp.map(q=>q.map(v=>v.toFixed(1)).join(',')).join(' '):null;
    const fdata=interactive?` data-frame='${JSON.stringify({x:bx,y,w:bw,h,q:(pts||box).map((q,k)=>[Math.round(q[0]-box[k][0]),Math.round(q[1]-box[k][1])])})}'${prev?` data-prev="${prev[0]}:${prev[1]}"`:''}`:'';
    const c=!clean&&!im&&!blank&&p.who&&charRef(p.who);const stroke=on?`stroke="#2d71f7" stroke-width="6"`:B.frame&&!blank?`stroke="#222" stroke-width="3"`:'stroke="none"';
    const bounds={x:bx,y,w:bw,h};
    const base=defaultPageGap(p),size=edit?.gap??base;
    const maskId=`${pre}${i}-art-mask`,mask=RoughImageMaterials.maskSVG(edit?.artMask,maskId,bounds);
    const overlay=clean?{defs:'',art:''}:RoughImageMaterials.overlaysSVG(edit?.overlays,IMG.overlay,`${pre}${i}`,bounds,size,W);
    defs+=mask+overlay.defs;
    const frameFill=mask||blank?'fill="none" pointer-events="all"':'fill="#fff"';
    o+=`<g data-p="${i}"${interactive?` data-slot-index="${slot}"`: ''}${fdata}>${poly?`<polygon${interactive?' class="page-frame"':''} points="${poly}" ${frameFill} ${stroke}/><clipPath id="${pre}${i}"><polygon points="${poly}"/></clipPath>`:`<rect${interactive?' class="page-frame"':''} x="${bx}" y="${y}" width="${bw}" height="${h}" ${frameFill} ${stroke}/><clipPath id="${pre}${i}"><rect x="${bx}" y="${y}" width="${bw}" height="${h}"/></clipPath>`}<g data-cut-art="" clip-path="url(#${pre}${i})"${mask?` mask="url(#${maskId})"`: ''}><g data-art=""${zoomTf(edit?.img,bx,y,bw,h)}>${art}</g></g>${overlay.art}`+
      (nums?`<circle cx="${bx+22}" cy="${y+22}" r="16" fill="${on?'#2d71f7':'#222'}"/><text x="${bx+22}" y="${y+28}" font-size="17" font-weight="700" text-anchor="middle" fill="#fff">${i+1}</text>`:'')+
      (c?`<rect x="${bx+12}" y="${y+h-50}" width="${40+p.who.length*24}" height="36" rx="18" fill="#fff" stroke="${c.color}" stroke-width="3"/><circle cx="${bx+32}" cy="${y+h-32}" r="7" fill="${c.color}"/><text x="${bx+46}" y="${y+h-24}" font-size="22" font-weight="700" fill="#222">${esc(p.who)}</text>`:'')+
      (!clean&&edit?.materialLines?`<g clip-path="url(#${pre}${i})" pointer-events="none">${Object.values(edit.materialLines).map(effect=>window.RoughMaterials.lineEffect(effect,{x:bx,y,w:bw,h},rngL((p.key||p.act)+effect.kind))).join('')}</g>`:'')+
      (clean?'':letterSVG(rough?{...p,dialogs:[],said:'',sfx:[]}:p,{x:bx,y,w:bw,h,frame:B.frame,before:prev?.[1]??40},i,edit?.letters,interactive,edit?.materialSounds))+`</g>`;
    if(interactive)handles+=frameHandles(pts||box,slot,i);
    y+=h;
    if(edits){
      const background=pageBackground(edit),next=panels[i+1];
      const end=next?pageBackground(RoughGrammar.merge(edits[cutSlot(next,i+1)],next)):(sceneEnd||PAGE_WHITE);if(!next)lastEnd=end;
      backgrounds+=`<g data-bg-panel="${i}"><rect y="${i?y-h:0}" width="${W}" height="${h+(i?0:40)}" fill="${background}"/>${transitionSVG(background,end,edit?.transition,`${pre}bg-${i}`,y,size,{mid:edit?.transMid,stop:edit?.transStop,img:edit?.bgImage,imgOp:edit?.bgImageOp})}</g>`;
    }
    if(interactive&&i<panels.length-1){
      const gap=gapMarkup(y,size,base,slot,i);
      if(size<20)tightGaps+=gap;else gaps+=gap;
    }
    prev=[slot,size];y+=size;
  });
  if(lastEnd&&lastEnd!==PAGE_WHITE)backgrounds+=`<rect data-scene-end="1" y="${y}" width="${W}" height="24" fill="${lastEnd}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y+24}" viewBox="0 0 ${W} ${y+24}" font-family="${esc(PAGE_FONT)}"><defs><filter id="gs"><feColorMatrix type="saturate" values="0"/></filter>${defs}</defs>${backgrounds}${gaps}${o}${tightGaps}${handles}</svg>`;
}
// 칸 안 그림 확대·이동(피그마 이미지 크롭처럼): 칸 가운데 기준 배율 s, 이동 dx·dy
function zoomTf(z,bx,y,bw,h){if(!z||!(z.s>1))return'';const cx=bx+bw/2,cy=y+h/2;
  return ` transform="translate(${(cx+(z.dx||0)).toFixed(1)} ${(cy+(z.dy||0)).toFixed(1)}) scale(${z.s.toFixed(3)}) translate(${(-cx).toFixed(1)} ${(-cy).toFixed(1)})"`}
// 칸 프레임 손잡이: 네 변(크기) + 네 꼭짓점(모양). 선택한 컷에만 보임
// 손잡이 안내 문구는 마우스를 올릴 때 붙임(컷마다 8개씩 늘 올려 두던 <title> 수백 개를 줄임)
document.addEventListener('pointerover',e=>{const h=e.target.closest?.('[data-fh]');if(!h||h.querySelector('title'))return;const k=h.dataset.fh;
  const t=document.createElementNS('http://www.w3.org/2000/svg','title');t.textContent=k.length===2?'끌어서 컷 확대·축소 · 더블클릭하면 모퉁이를 하나씩(프레임 모양)':(k==='t'||k==='b'?'위아래로 끌어 높이 조절':'좌우로 끌어 폭 조절');h.appendChild(t)});
function frameHandles(pts,slot,i){const E=[['t',0,1],['r',1,2],['b',2,3],['l',3,0]];
  return `<g class="frame-handles" data-fh-for="${slot}" data-p="${i}">`+E.map(([k,a,b])=>{const x=(pts[a][0]+pts[b][0])/2,y=(pts[a][1]+pts[b][1])/2,hz=k==='t'||k==='b';
    return `<rect data-fh="${k}" x="${(x-(hz?22:7)).toFixed(1)}" y="${(y-(hz?7:22)).toFixed(1)}" width="${hz?44:14}" height="${hz?14:44}" rx="7"/>`}).join('')+
    ['tl','tr','br','bl'].map((k,n)=>`<circle data-fh="${k}" cx="${pts[n][0].toFixed(1)}" cy="${pts[n][1].toFixed(1)}" r="10"/>`).join('')+`</g>`}
function render(){state.svg=renderSVG(state.panels,state.sel,'c',true,null,false,{rough:true});$('#preview').innerHTML=state.svg}


// ---------- reference images (캐릭터·장면) ----------
const IMG={char:{},scene:[],cut:{},lib:{},lore:{},world:null,wlib:{},bg:{},overlay:{}};let target=null,showUnder=true;
const idb=(()=>{let dbp=null;const open=()=>dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('rough-refs',1);r.onupgradeneeded=()=>r.result.createObjectStore('refs',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('refs',mode);const st=t.objectStore('refs');const out=fn(st);t.oncomplete=()=>res(out&&out.result);t.onerror=()=>rej(t.error)}));
  return{getDoc:id=>tx('readonly',st=>st.get(id)).catch(()=>null),putDoc:o=>tx('readwrite',st=>st.put(o)).catch(()=>{}),all:()=>tx('readonly',st=>st.getAll()).then(r=>r.filter(x=>x.kind!=='doc')).catch(()=>[]),allDocs:()=>tx('readonly',st=>st.getAll()).then(r=>r.filter(x=>x.kind==='doc')).catch(()=>[]),put:o=>tx('readwrite',st=>st.put(o)).then(r=>{saveOk();return r}).catch(e=>{saveFail(e,'이미지')}),del:id=>tx('readwrite',st=>st.delete(id)).catch(()=>{})}})();
function shrink(file,max=768){return new Promise((res,rej)=>{const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);res({src:c.toDataURL('image/jpeg',.85),w:c.width,h:c.height,palette:palette(c)})};im.onerror=rej;im.src=url})}
// 팔레트: 48px로 줄여 색을 4비트로 묶고 많이 쓰인 순서, 서로 비슷한 색은 건너뜀
function palette(cv){const c=document.createElement('canvas');c.width=c.height=48;const g=c.getContext('2d');g.drawImage(cv,0,0,48,48);const d=g.getImageData(0,0,48,48).data;const cnt={};
  for(let k=0;k<d.length;k+=4){const key=(d[k]>>4)<<8|(d[k+1]>>4)<<4|(d[k+2]>>4);cnt[key]=(cnt[key]||0)+1}
  const cols=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k])=>{k=+k;return[((k>>8)&15)*17,((k>>4)&15)*17,(k&15)*17]});const out=[];
  for(const c1 of cols){if(out.every(c2=>Math.abs(c1[0]-c2[0])+Math.abs(c1[1]-c2[1])+Math.abs(c1[2]-c2[2])>90))out.push(c1);if(out.length===5)break}
  return out.map(([r,g2,b])=>'#'+[r,g2,b].map(v=>v.toString(16).padStart(2,'0')).join(''))}
function accent(pal){let best=pal[0]||'#2d71f7',bs=-1;for(const h of pal){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);const sat=mx?(mx-mn)/mx:0;const v=mx/255;const sc=sat*(v>.2&&v<.95?1:.3);if(sc>bs){bs=sc;best=h}}return best}
// 기본 예시(녹빛자정의 연인 · 공개 허락 받은 작품 컷에서 자름)에 어울리는 기본 사진: 처음 한 번만, 예시 인물·설정이 그대로이고 사진이 비어 있을 때.
// 지우면 다시 넣지 않음(rough-default-imgs). 데이터 URL로 저장해 작업 파일·내보내기에도 그대로 들어감
const DEFAULT_IMGS={char:{'에드가':'defaults/char-edgar.jpg','준':'defaults/char-jun.jpg'},lore:{'저택':'defaults/lore-mansion.jpg'},world:{'녹빛자정':'defaults/world-cover.jpg'}};
async function seedDefaultImages(){try{if(localStorage.getItem('rough-default-imgs'))return;localStorage.setItem('rough-default-imgs','1')}catch(_){return}
  const load=async url=>{const b=await (await fetch(url)).blob();return shrink(new File([b],url.split('/').pop(),{type:b.type||'image/jpeg'}))};let n=0;
  try{for(const [name,url] of Object.entries(DEFAULT_IMGS.char)){if(!CHARS.some(c=>c.name.trim()===name)||IMG.char[name])continue;const im=await load(url);const o={id:'char:'+name,kind:'char',name,...im};IMG.char[name]=o;await idb.put(o);n++}
    for(const e of LORE){const url=DEFAULT_IMGS.lore[e.name];if(!url||IMG.lore[e.id])continue;const im=await load(url);const o={id:'lore:'+e.id,kind:'loreimg',loreId:e.id,...im};IMG.lore[e.id]=o;await idb.put(o);n++}
    const wu=DEFAULT_IMGS.world[WORLD?.name];if(wu&&!IMG.world){const im=await load(wu);const o={id:'world:cover',kind:'worldimg',...im};IMG.world=o;await idb.put(o);n++}}catch(e){console.warn('기본 사진',e)}
  if(n){renderSlots();render();if(VIEW==='webtoon')renderWebtoon()}}
function charRef(name){const c=IMG.char[name];return c?{...c,color:accent(c.palette)}:null}
function sceneFor(p){const a=state.an[p.chunk];const text=a?a.beats.map(b=>b.act).join(' '):'';
  const lp=typeof loreHits==='function'&&loreHits(text).find(e=>e.cat==='place'&&IMG.lore[e.id]);if(lp)return{...IMG.lore[lp.id],id:'lore:'+lp.id,name:lp.name};
  if(!IMG.scene.length)return null;return IMG.scene.find(s=>s.name&&text.includes(s.name))||IMG.scene[p.chunk%IMG.scene.length]}
function underlay(p){if(!showUnder)return null;
  if(p.shot==='클로즈업'){const c=p.who&&IMG.char[p.who];if(c)return{src:c.src,op:.32}}
  if(['설정','전경','전신','중경','효과 배경'].includes(p.shot)){const sc=sceneFor(p);if(sc)return{src:sc.src,op:p.shot==='설정'||p.shot==='전경'?.38:.22}}
  // 직접 넣은 참고 이미지가 없으면 엔진이 고른 구도 레퍼런스를 컬러로 깔기
  // 자동 칸은 늘 네모: 레퍼런스가 사선 칸이어도 꼭짓점은 따라가지 않음(칸 모양은 편집 화면 꼭짓점 끌기로만)
  if(p.ref)return{src:p.ref.src,op:1,color:true,crop:p.ref.art,w:p.ref.w,h:p.ref.h,quad:null};
  return null}
function names(){return [...new Set([...CHARS.map(c=>c.name).filter(Boolean),...RE.parseCuts(CUTS,engineChars()).map(b=>b.who).filter(Boolean)])]}
function slotHTML(kind,key,ref,label,off){return `<div class="slot${off?' off':''}"><div class="drop${ref?' has':''}" tabindex="0" role="button" data-slot="${kind}" data-key="${esc(key)}" aria-label="${esc(label)} 이미지 ${ref?'바꾸기':'첨부'}">${ref?`<img src="${ref.src}" alt=""><button class="x" data-del="${kind}" data-key="${esc(key)}" aria-label="삭제">×</button>`:'+ 이미지'}</div>
  <div class="nm">${kind==='scene'&&ref?`<input value="${esc(ref.name)}" data-rename="${esc(key)}" aria-label="장면 이름">`:esc(label)}</div>${ref?`<div class="pal">${ref.palette.map(c=>`<i style="background:${c}" title="${c}"></i>`).join('')}</div>`:''}</div>`}
function renderBgs(){if(!$('#bgs'))return;$('#bgs').innerHTML=IMG.scene.map(r=>slotHTML('scene',r.id,r,r.name,false)).join('')+slotHTML('scene','__new',null,'배경 추가',false)}
function renderRefSum(){const ns=CHARS.map(c=>c.name.trim()).filter(Boolean);const el=$('#refsum');if(!el)return;
  el.innerHTML=ns.map(n=>`<span class="av" title="${esc(n)}${IMG.char[n]?'':' · 이미지 없음'}" style="${IMG.char[n]?'':`background:${avBg(n)}`}">${IMG.char[n]?`<img src="${IMG.char[n].src}" alt="${esc(n)}">`:esc(n.slice(0,1))}</span>`).join('')+
    `<span>인물 이미지 ${ns.filter(n=>IMG.char[n]).length}/${ns.length} · 배경 ${IMG.scene.length}장</span><button class="btn" data-view="write">씬에서 편집</button>`}
function renderSlotsLite(){renderBgs();renderRefSum();renderCastSum();if(typeof renderWorldSum==='function')renderWorldSum();if(!$('#v-world').hidden)renderWorld();$('#under').hidden=false}
function renderSlots(){renderChars();renderSlotsLite()}
async function attach(file,slot){if(!file||!file.type.startsWith('image/'))return;const im=await shrink(file);
  if(slot.kind==='lore'){const o={id:'lore:'+slot.key,kind:'loreimg',loreId:slot.key,...im};IMG.lore[slot.key]=o;idb.put(o);toast('설정 항목 이미지를 넣었어요');renderSlots();render();return}
  if(slot.kind==='world'){const o={id:'world:cover',kind:'worldimg',...im};IMG.world=o;idb.put(o);toast('세계관 대표 이미지를 넣었어요');renderSlots();render();return}
  if(slot.kind==='char'){const o={id:'char:'+slot.key,kind:'char',name:slot.key,...im};IMG.char[slot.key]=o;idb.put(o);toast(`${slot.key} 캐릭터 이미지를 연결했어요`)}
  else{const id=slot.key==='__new'?'scene:'+Date.now():slot.key;const old=IMG.scene.find(r=>r.id===id);const o={id,kind:'scene',name:old?.name||file.name.replace(/\.[^.]+$/,'').slice(0,20)||`장면 ${IMG.scene.length+1}`,...im};
    if(old)Object.assign(old,o);else IMG.scene.push(o);idb.put(o);toast('장면 이미지를 넣었어요')}
  renderSlots();render()}
$('#file').addEventListener('change',e=>{if(target)attach(e.target.files[0],target);e.target.value=''});
const slotsEl=[$('#bgs')].filter(Boolean);
slotsEl.forEach(el=>{
  el.addEventListener('click',e=>{const d=e.target.closest('[data-del]');if(d){e.stopPropagation();if(d.dataset.del==='char'){delete IMG.char[d.dataset.key];idb.del('char:'+d.dataset.key)}else{IMG.scene=IMG.scene.filter(r=>r.id!==d.dataset.key);idb.del(d.dataset.key)}renderSlots();render();return}
    const s=e.target.closest('[data-slot]');if(s){target={kind:s.dataset.slot,key:s.dataset.key};$('#file').click()}});
  el.addEventListener('keydown',e=>{const s=e.target.closest('[data-slot]');if(s&&(e.key==='Enter'||e.key===' ')){e.preventDefault();s.click()}});
  el.addEventListener('focusin',e=>{const s=e.target.closest('[data-slot]');if(s)target={kind:s.dataset.slot,key:s.dataset.key}});
  el.addEventListener('dragover',e=>{const s=e.target.closest('[data-slot]');if(s){e.preventDefault();s.classList.add('over')}});
  el.addEventListener('dragleave',e=>{e.target.closest('[data-slot]')?.classList.remove('over')});
  el.addEventListener('drop',e=>{const s=e.target.closest('[data-slot]');if(!s)return;e.preventDefault();s.classList.remove('over');const files=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/'));
    if(s.dataset.slot==='scene'&&s.dataset.key==='__new')files.forEach((f,k)=>setTimeout(()=>attach(f,{kind:'scene',key:'__new'}),k*30));else attach(files[0],{kind:s.dataset.slot,key:s.dataset.key})});
  el.addEventListener('change',e=>{const r=e.target.closest('[data-rename]');if(!r)return;const o=IMG.scene.find(x=>x.id===r.dataset.rename);if(o){o.name=r.value.trim()||o.name;idb.put(o);render()}});
});
document.addEventListener('paste',e=>{const f=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));if(!f)return;e.preventDefault();if(VIEW==='layout'&&!(target&&target.kind==='cut')&&CT_CUR>=0)target={kind:'cut',key:String(CT_CUR)};if(VIEW==='layout'&&!(target&&target.kind==='cut')){toast('그림을 넣을 컷의 \'전체 복사\'를 먼저 누르거나 컷을 골라 주세요');return}if(target&&target.kind==='cut'){attachCuts([f],+target.key);return}attach(f,target||{kind:'scene',key:'__new'})});
try{showUnder=localStorage.getItem('rough-under')!=='0'}catch(_){}$('#under').setAttribute('aria-pressed',showUnder);
$('#under').onclick=()=>{showUnder=!showUnder;$('#under').setAttribute('aria-pressed',showUnder);try{localStorage.setItem('rough-under',showUnder?'1':'0')}catch(_){}render()};
idb.all().then(rows=>{for(const r of rows){if(r.kind==='char')IMG.char[r.name]=r;else if(r.kind==='cutimg')IMG.cut[r.id]=r;else if(r.kind==='libimg')IMG.lib[r.libId]=r;else if(r.kind==='loreimg')IMG.lore[r.loreId]=r;else if(r.kind==='worldimg')IMG.world=r;else if(r.kind==='wlibimg')IMG.wlib[r.libId]=r;else if(r.kind==='bgimg')IMG.bg[r.id]=r;else if(r.kind==='overlay')IMG.overlay[r.id]=r;else if(r.kind==='scene'||!r.kind)IMG.scene.push(r)}IMG.scene.sort((a,b)=>a.id.localeCompare(b.id));renderSlots();render();if(VIEW==='webtoon')renderWebtoon();seedDefaultImages()});

// ---------- prompt export ----------
const RP=window.RoughPrompt;
function sigOf(o){const t=JSON.stringify(o);let h=0;for(let k=0;k<t.length;k++)h=(h*31+t.charCodeAt(k))|0;return h.toString(36)}
let AIKEY='';
try{AIKEY=localStorage.getItem('rough-ai-key')||sessionStorage.getItem('rough-ai-key')||''}catch(_){}
// API 키 보안 입력창: Claude 키 형식만 받고, 저장 전에 Anthropic에 확인
const maskKey=k=>k?`${k.slice(0,7)}…${k.slice(-4)}`:'';
function setKey(k,keep){AIKEY=k;try{localStorage.removeItem('rough-ai-key');sessionStorage.removeItem('rough-ai-key');if(k)(keep==='session'?sessionStorage:localStorage).setItem('rough-ai-key',k)}catch(_){}renderKey()}
function renderKey(){const on=!!AIKEY;document.querySelectorAll('.pkey').forEach(e=>e.classList.toggle('ok',on));document.querySelectorAll('[data-keyst]').forEach(e=>{e.textContent=on?maskKey(AIKEY):'API 키 없음';e.classList.toggle('on',on)});document.querySelectorAll('[data-keybtn]').forEach(e=>e.textContent=on?'키 변경':'API 키 입력');$('#keydel').hidden=!on}
let keyThen=null;
function openKey(then=null,msg=''){keyThen=then;const i=$('#kin');i.value='';i.type='password';i.removeAttribute('aria-invalid');document.querySelector('[data-act=keyshow]').textContent='보기';$('#kerr').textContent=msg;$('#keyok').disabled=false;$('#keyok').textContent='확인하고 저장';
  let keep='local';try{if(sessionStorage.getItem('rough-ai-key'))keep='session'}catch(_){}document.querySelector(`#keyform [name=keep][value=${keep}]`).checked=true;$('#keydlg').showModal();setTimeout(()=>i.focus(),30)}
function closeKey(){$('#kin').value='';$('#keydlg').close()}
$('#keydlg').addEventListener('close',()=>{$('#kin').value=''});
$('#keyform').addEventListener('submit',async e=>{e.preventDefault();const i=$('#kin'),k=i.value.trim().replace(/\s+/g,''),err=t=>{$('#kerr').textContent=t;i.setAttribute('aria-invalid','true');i.focus()};
  if(!k)return err('키를 입력해 주세요');
  if(!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(k))return err(k.startsWith('sk-ant-admin')?'관리자 키는 쓸 수 없어요. 일반 API 키를 넣어주세요':'Claude API 키 형식이 아니에요 (sk-ant-로 시작)');
  if(k.startsWith('sk-ant-admin'))return err('관리자 키는 쓸 수 없어요. 일반 API 키를 넣어주세요');
  i.removeAttribute('aria-invalid');$('#kerr').textContent='';$('#keyok').disabled=true;$('#keyok').textContent='확인 중…';
  let mod;try{mod=await import('./claude.js');await mod.check(k)}catch(ex){$('#keyok').disabled=false;$('#keyok').textContent='확인하고 저장';return err(mod?mod.explain(ex):'Claude 모듈을 불러오지 못했어요')}
  const keep=document.querySelector('#keyform [name=keep]:checked').value;setKey(k,keep);closeKey();toast(keep==='session'?'키를 연결했어요 (탭을 닫으면 지워져요)':'키를 연결했어요');if(keyThen){const f=keyThen;keyThen=null;f()}});
function cutHead(p,i){return `${i+1}. ${p.who?p.who+' · ':''}${p.shot}·${p.ang}·${p.emo} ${p.i}${p.vng==='P'?' · 하이라이트':''}`}
// 컷 이미지: 씬 id + 컷 순서로 저장, 글이 바뀌면 sig로 표시
const cutId=(sid,i)=>`cut:${sid}:${i}`;
function cutImg(si,i,p){const r=IMG.cut[cutId(SCENES[si].id,i)];if(!r)return null;return{...r,stale:!!(p&&r.sig!==p.key)}}
// 컷 이미지는 패널 번호로, 컷 글·편집값은 컷 순번으로 저장돼 있음.
// 컷을 옮기거나 끼우거나 지우는 작업(mutate)은 {옛 순번: 새 순번(지우면 -1)} 표를 돌려주고,
// 여기서 등록 이미지를 같은 컷의 새 패널 번호로 옮김. 글이 그대로면 '글이 바뀜'도 안 붙음
function panelsOf(si){const out=[];RE.analyzeCuts(SCENES[si].cuts,engineChars()).forEach(a=>{const r=RE.rank(a,PATS,1)[0];if(r)RE.layout(a,r.p).forEach(c=>out.push(c))});return out}
function remapCuts(si,mutate){const sc=SCENES[si];
  const before=si===SCUR&&state.panels.length?state.panels:panelsOf(si),recs=[],seen={};
  before.forEach((p,n)=>{const s=cutSlot(p,n),o=(seen[s]=(seen[s]||0)+1)-1,r=IMG.cut[cutId(sc.id,n)];if(r)recs.push({r,s,o,fresh:r.sig===p.key})});
  const map=mutate();if(!map||!recs.length)return;
  const after=panelsOf(si),bySlot={};after.forEach((p,n)=>(bySlot[cutSlot(p,n)]??=[]).push(n));
  const moved=[],used=new Set();let lost=0;
  for(const x of recs){const ns=map[x.s]??x.s;if(ns<0)continue;const l=bySlot[ns]||[];const t=[l[x.o],...l].find(v=>v!=null&&!used.has(v));
    if(t==null){lost++;continue}used.add(t);moved.push({...x.r,id:cutId(sc.id,t),idx:t,sig:x.fresh?after[t].key:x.r.sig})}
  for(const x of recs){delete IMG.cut[x.r.id];idb.del(x.r.id)}
  for(const o of moved){IMG.cut[o.id]=o;idb.put(o)}
  if(lost)toast(`이미지 ${lost}장은 이어 붙일 컷이 없어 뺐어요`,3000)}
const moveMap=(n,f)=>Object.fromEntries([...Array(n).keys()].map(k=>[k,f(k)]));
function cutCount(si,ps){return ps.filter((p,i)=>cutImg(si,i,p)).length}
async function attachCut(file,i){if(!file||!file.type.startsWith('image/'))return;const p=state.panels[+i];if(!p)return;const im=await shrink(file,1380);
  const o={id:cutId(SCENES[SCUR].id,+i),kind:'cutimg',scene:SCENES[SCUR].id,idx:+i,sig:p.key,src:im.src,w:im.w,h:im.h};IMG.cut[o.id]=o;await idb.put(o)}
async function attachCuts(files,from){files=[...files].filter(f=>f.type.startsWith('image/')).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  // 칸을 지정하면 그 컷부터 차례로 덮어쓰고, 지정하지 않으면 빈 컷만 앞에서부터 채운다
  const slots=from!=null?state.panels.map((_,k)=>k).filter(k=>k>=from):state.panels.map((p,k)=>cutImg(SCUR,k,p)?-1:k).filter(k=>k>=0);
  let n=0;for(const f of files){if(n>=slots.length)break;await attachCut(f,slots[n]);n++}
  rerenderCuts();if(n)toast(`컷 이미지 ${n}장을 등록했어요`);if(files.length>n)setTimeout(()=>toast(`남은 컷보다 이미지가 많아 ${files.length-n}장은 건너뛰었어요`),1600)}


// ---------- data ----------
// 러프 툴 본체 2/6 — 설정집: 인물·캐릭터 보관함·세계관
// 원본 조각: tools/build_app.py가 6개를 순서대로 이어 rough/app.js를 만듦(사이트는 app.js 하나를 실음 — 조각끼리 불러올 때 서로 부르는 곳이 많아 따로 싣지 않음)
// ---------- 인물 설정 ----------
const NOTP=/하늘|거리|배경|풍경|장소|정원|복도|방$|집$|도시|건물|골목|숲|바다|교실/;
let CHARS=[];
const DEFAULT_CHARS=[{name:'에드가',aliases:'',body:'male',look:'검은 머리를 넘긴 짧은 머리, 초록 눈, 검은 연미복과 흰 나비넥타이 차림의 하인'},{name:'준',aliases:'',body:'female',look:'밤색 머리를 하나로 묶은 하녀, 갈색 눈, 앞치마 차림'}];
try{const v=localStorage.getItem('rough-chars');CHARS=v?JSON.parse(v):DEFAULT_CHARS.map(c=>({...c}))}catch(_){CHARS=DEFAULT_CHARS.map(c=>({...c}))}
// 예전 기본 외형(금발)은 기본 사진(검은 머리)과 달라서, 손대지 않은 기본 문구만 새 문구로
CHARS.forEach(c=>{if(c.name==='에드가'&&c.look==='금발 짧은 머리, 초록 눈, 검은 연미복과 흰 장갑을 낀 하인')c.look=DEFAULT_CHARS[0].look});
function saveChars(){try{localStorage.setItem('rough-chars',JSON.stringify(CHARS))}catch(_){}}
function engineChars(){return CHARS.filter(c=>c.name.trim()).map(c=>({name:c.name.trim(),aliases:String(c.aliases||'').split(/[,·]/).map(x=>x.trim()).filter(Boolean)}))}
// 등장인물 카드 (캐릭터챗 프로필 카드 형태) + 프로필 편집 창
var NAITAGS;try{NAITAGS=JSON.parse(localStorage.getItem('rough-nai-tags')||'{}')}catch(_){NAITAGS={}}
const saveNaiTags=()=>{try{localStorage.setItem('rough-nai-tags',JSON.stringify(NAITAGS))}catch(_){}};
const hueOf=n=>{let h=0;for(const ch of String(n))h=(h*31+ch.charCodeAt(0))%360;return h};
const avBg=n=>`hsl(${hueOf(n)} 32% 52%)`;
function charTags(c){return (NAITAGS[c.name]??window.RoughNAI.lookTags(c.look).join(', ')).split(',').map(t=>t.trim()).filter(Boolean)}
function charStat(name){const bs=RE.parseCuts(CUTS,engineChars());return{cuts:bs.filter(b=>b.who===name||(b.act||'').includes(name)).length,lines:bs.reduce((a,b)=>a+(b.dialogs||[]).filter(d=>d.who===name).length,0)}}
function charCard(c,i){const n=c.name.trim(),im=n&&IMG.char[n],st=n?charStat(n):{cuts:0,lines:0};
  return `<article class="cedit" data-ci="${i}" data-old="${esc(n)}">
    <div class="ce-side"><div class="drop ce-img${im?' has':''}" data-cimg tabindex="0" role="button" aria-label="${esc(n||'캐릭터')} 대표 이미지" style="${im?'':`background:${avBg(n||'?')}`}">${im?`<img src="${im.src}" alt=""><button class="x" data-cimgdel aria-label="이미지 지우기">×</button>`:`<span class="ini">${esc((n||'?').slice(0,1))}</span><small>+ 대표 이미지</small>`}</div>
      ${im?`<div class="pal">${im.palette.map(h=>`<i style="background:${h}" title="${h}"></i>`).join('')}</div>`:''}</div>
    <div class="ce-f">
      <div class="ce-top"><input class="ce-name" data-ck="name" value="${esc(c.name)}" maxlength="20" placeholder="이름" aria-label="이름" spellcheck="false"><div class="seg3">${[['female','여자'],['male','남자']].map(([v,l])=>`<button type="button" data-cbody="${v}" aria-pressed="${c.body===v}">${l}</button>`).join('')}</div><span class="cbadge" data-badge></span></div>
      <label class="cf"><span>다른 호칭 <small>쉼표로 구분 · 줄글에서 같은 인물로 찾아요</small></span><input data-ck="aliases" value="${esc(c.aliases||'')}" placeholder="예: 도련님, 에드" spellcheck="false"></label>
      <label class="cf"><span>외형 <small data-cnt>${(c.look||'').length}/1000</small></span><textarea data-ck="look" rows="4" maxlength="1000" placeholder="머리 모양·색, 눈, 체격, 옷차림, 특징">${esc(c.look||'')}</textarea></label>
      <label class="cf"><span>NovelAI 태그 <small>비우면 외형에서 자동으로 만들어요</small></span><input data-ck="tags" value="${esc(NAITAGS[n]??'')}" placeholder="${esc(window.RoughNAI.lookTags(c.look).join(', ')||'blonde hair, short hair, green eyes')}" spellcheck="false"></label>
      <div class="ce-foot"><span class="cstat">이 씬 ${st.cuts}컷 · 대사 ${st.lines}</span><span class="grow"></span><button type="button" class="btn" data-act="librevert" hidden>보관함 버전으로</button><button type="button" class="btn" data-act="libsave">보관함에 저장</button><button type="button" class="btn" data-act="chdel">작품에서 빼기</button></div>
    </div></article>`}
function updateCard(i){const el=document.querySelector(`#chars .cedit[data-ci="${i}"]`),c=CHARS[i];if(!el||!c)return;const st=libState(c);
  const bd=el.querySelector('[data-badge]');bd.textContent=st==='same'?'보관함과 같음':st==='diff'?'보관함과 다름':'';bd.className='cbadge'+(st==='diff'?' diff':'');bd.hidden=!st;
  const sv=el.querySelector('[data-act=libsave]');sv.textContent=st?'보관함 갱신':'보관함에 저장';sv.disabled=st==='same';el.querySelector('[data-act=librevert]').hidden=st!=='diff';
  el.querySelector('[data-cnt]').textContent=`${(c.look||'').length}/1000`;el.querySelector('[data-ck=tags]').placeholder=window.RoughNAI.lookTags(c.look).join(', ')||'blonde hair, short hair, green eyes';
  const n=c.name.trim();if(!IMG.char[n]){const d=el.querySelector('[data-cimg]');d.style.background=avBg(n||'?');const ini=d.querySelector('.ini');if(ini)ini.textContent=(n||'?').slice(0,1)}}
function updateCastStat(){const k=CHARS.filter(c=>libState(c)==='same').length,d=CHARS.filter(c=>libState(c)==='diff').length;$('#castst').textContent=`${CHARS.length}명 · 보관함 저장 ${k}${d?` · 보관함과 다름 ${d}`:''}`}
function renderChars(){
  $('#chars').innerHTML=CHARS.map(charCard).join('')+`<button class="ccadd" data-act="addchar">+ 새 캐릭터</button>`;
  CHARS.forEach((_,i)=>updateCard(i));updateCastStat();renderSugg();renderCastSum();if(!$('#v-chars').hidden)renderLib()}
// 설정집에 없는 인물: 말하는 사람 + 글 속 @이름(조사 뗌). 다른 호칭으로 등록된 이름은 같은 인물로 침
const JOSA_RE=/(이|가|은|는|을|를|의|에게|께|와|과|도|만|랑|이랑|한테|에게서|이가|님)$/;
function knownNames(){const s=new Set();engineChars().forEach(c=>{s.add(c.name);c.aliases.forEach(a=>s.add(a))});return s}
function mentionNames(text){return [...String(text||'').matchAll(/@([가-힣A-Za-z0-9_]{1,12})/g)].map(m=>{let n=m[1];const k=knownNames();if(k.has(n))return n;const b=n.replace(JOSA_RE,'');return b&&k.has(b)?b:(b.length>=1?b:n)})}
function unknownNames(texts){const k=knownNames();return [...new Set([...RE.parseCuts(texts,engineChars()).map(b=>b.who),...texts.flatMap(t=>mentionNames(t))])].filter(n=>n&&!k.has(n)&&!NOTP.test(n))}
function renderSugg(){const found=unknownNames(CUTS);
  $('#sugg').innerHTML=found.length?`글에서 찾은 인물 ${found.map(n=>`<button data-sug="${esc(n)}">+ ${esc(n)}</button>`).join('')}`:''}
function renderCastSum(){const el=$('#castsum');if(!el)return;const cs=CHARS.filter(c=>c.name.trim());
  el.innerHTML=cs.length?cs.map(c=>{const n=c.name.trim(),im=IMG.char[n],st=charStat(n);return `<div class="castbox${st.cuts?'':' off'}" title="${esc(c.look||n)}"><span class="av" style="${im?'':`background:${avBg(n)}`}">${im?`<img src="${im.src}" alt="">`:esc(n.slice(0,1))}</span><span class="cb"><b>${esc(n)}</b><small>${st.cuts?`${st.cuts}컷 · 대사 ${st.lines}`:'이 씬에 없음'}</small></span></div>`}).join(''):'<p class="insp-note">아직 인물이 없어요</p>'}
// ---------- 캐릭터 보관함: 작품과 상관없이 이 브라우저에 남는 캐릭터 목록 ----------
// 작품의 인물은 보관함 항목의 복사본이고 c.lib로 연결된다. 고쳐도 보관함은 그대로이고, '보관함에 저장'을 눌러야 갱신된다.
let LIB=[];try{LIB=JSON.parse(localStorage.getItem('rough-lib')||'[]')}catch(_){LIB=[]}
let LIBQ='',LIBG='';
const saveLib=()=>{try{localStorage.setItem('rough-lib',JSON.stringify(LIB))}catch(_){toast('저장 공간이 부족해요')}};
const libOf=c=>c&&c.lib&&LIB.find(x=>x.id===c.lib);
const castTags=c=>(NAITAGS[c.name.trim()]??'').trim();
function libState(c){const L=libOf(c);if(!L)return'';const n=c.name.trim();const imC=IMG.char[n]?.src||'',imL=IMG.lib[L.id]?.src||'';
  return L.name===n&&(L.aliases||'')===(c.aliases||'')&&L.body===c.body&&(L.look||'')===(c.look||'')&&(L.tags||'')===castTags(c)&&imC===imL?'same':'diff'}
function libSave(i,quiet){const c=CHARS[i],n=c.name.trim();if(!n){toast('이름을 먼저 정해 주세요');return}
  let L=libOf(c);if(!L){L={id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)};LIB.unshift(L);c.lib=L.id}
  Object.assign(L,{name:n,aliases:c.aliases||'',body:c.body,look:c.look||'',tags:castTags(c),at:Date.now()});
  const im=IMG.char[n];if(im){const o={...im,id:'lib:'+L.id,kind:'libimg',libId:L.id,name:n};IMG.lib[L.id]=o;idb.put(o)}else if(IMG.lib[L.id]){delete IMG.lib[L.id];idb.del('lib:'+L.id)}
  saveLib();saveChars();if(!quiet)toast(`${n}을(를) 보관함에 저장했어요`);renderChars()}
function libApply(L,c){const old=c.name.trim();Object.assign(c,{name:L.name,aliases:L.aliases||'',body:L.body,look:L.look||'',lib:L.id});
  if(old&&old!==L.name){delete NAITAGS[old];if(IMG.char[old]){delete IMG.char[old];idb.del('char:'+old)}}
  if(L.tags)NAITAGS[L.name]=L.tags;else delete NAITAGS[L.name];saveNaiTags();
  const im=IMG.lib[L.id];if(im){const o={...im,id:'char:'+L.name,kind:'char',name:L.name};delete o.libId;IMG.char[L.name]=o;idb.put(o)}else if(IMG.char[L.name]){delete IMG.char[L.name];idb.del('char:'+L.name)}}
function libUse(id){const L=LIB.find(x=>x.id===id);if(!L)return;
  if(CHARS.some(c=>c.lib===id)){toast('이미 이 작품에 있어요');return}
  const same=CHARS.findIndex(c=>c.name.trim()===L.name);
  if(same>=0&&!confirm(`이 작품에 이미 '${L.name}'이(가) 있어요. 보관함 버전으로 바꿀까요?`))return;
  const c=same>=0?CHARS[same]:{name:'',aliases:'',body:'female',look:''};if(same<0)CHARS.push(c);libApply(L,c);
  saveChars();compute(false);renderSlots();toast(`${L.name}을(를) 작품에 넣었어요`)}
function renderLib(){const el=$('#libgrid');if(!el)return;const q=LIBQ.trim().toLowerCase();
  const list=LIB.filter(L=>(!LIBG||L.body===LIBG)&&(!q||[L.name,L.aliases,L.look,L.tags].join(' ').toLowerCase().includes(q)));
  document.querySelectorAll('#libg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.g===LIBG));
  el.innerHTML=list.length?list.map(L=>{const im=IMG.lib[L.id],inCast=CHARS.some(c=>c.lib===L.id);
    return `<div class="lcard${inCast?' in':''}"><span class="av" style="${im?'':`background:${avBg(L.name)}`}">${im?`<img src="${im.src}" alt="">`:esc(L.name.slice(0,1))}</span>
      <div style="min-width:0"><b>${esc(L.name)}</b><small>${L.body==='male'?'남자':'여자'}${L.aliases?` · ${esc(L.aliases)}`:''}</small><div class="ll">${esc(L.look||L.tags||'외형 없음')}</div></div>
      <div class="la"><button class="lx" data-libdel="${L.id}">삭제</button><small>${new Date(L.at).toLocaleDateString('ko-KR')} 저장</small>${inCast?'<span class="status">이 작품에서 사용 중</span>':`<button class="btn dark" data-libuse="${L.id}">작품에 넣기</button>`}</div></div>`}).join(''):
    `<p class="empty" style="padding:8px 0">${LIB.length?'검색 결과가 없어요':'아직 보관함이 비어 있어요. 위 캐릭터 카드에서 \'보관함에 저장\'을 누르면 여기 쌓여요.'}</p>`}
function libExport(){if(!LIB.length){toast('보관함이 비어 있어요');return}
  const data={type:'rough-characters',version:1,exported:new Date().toISOString(),characters:LIB.map(L=>({...L,image:IMG.lib[L.id]?{src:IMG.lib[L.id].src,w:IMG.lib[L.id].w,h:IMG.lib[L.id].h,palette:IMG.lib[L.id].palette}:null}))};
  download('rough-characters.json',URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})));toast(`캐릭터 ${LIB.length}명을 파일로 내보냈어요`)}
async function libImport(file){try{const d=JSON.parse(await file.text());if(d.type!=='rough-characters'||!Array.isArray(d.characters))throw new Error('캐릭터 파일이 아니에요');let n=0;
  for(const x of d.characters){if(!x||!x.name)continue;const L={id:String(x.id||('c'+Date.now().toString(36)+n)),name:String(x.name).slice(0,20),aliases:String(x.aliases||''),body:x.body==='male'?'male':'female',look:String(x.look||'').slice(0,1000),tags:String(x.tags||''),at:+x.at||Date.now()};
    const i=LIB.findIndex(y=>y.id===L.id);if(i>=0)LIB[i]=L;else LIB.push(L);
    if(x.image&&typeof x.image.src==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(x.image.src)){const o={id:'lib:'+L.id,kind:'libimg',libId:L.id,name:L.name,src:x.image.src,w:+x.image.w||0,h:+x.image.h||0,palette:Array.isArray(x.image.palette)?x.image.palette.filter(h=>/^#[0-9a-f]{6}$/i.test(h)).slice(0,5):[]};IMG.lib[L.id]=o;idb.put(o)}n++}
  saveLib();renderLib();renderChars();toast(`캐릭터 ${n}명을 가져왔어요`)}catch(e){toast('가져오지 못했어요: '+e.message)}}
$('#libq').addEventListener('input',e=>{LIBQ=e.target.value;renderLib()});
$('#libg').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;LIBG=b.dataset.g;renderLib()});
$('#libgrid').addEventListener('click',e=>{const u=e.target.closest('[data-libuse]');if(u){libUse(u.dataset.libuse);return}
  const d=e.target.closest('[data-libdel]');if(d){const L=LIB.find(x=>x.id===d.dataset.libdel);if(!L||!confirm(`보관함에서 '${L.name}'을(를) 지울까요? 작품에 넣은 인물은 그대로 남아요.`))return;
    LIB=LIB.filter(x=>x.id!==L.id);if(IMG.lib[L.id]){delete IMG.lib[L.id];idb.del('lib:'+L.id)}CHARS.forEach(c=>{if(c.lib===L.id)delete c.lib});saveLib();saveChars();renderChars();toast('보관함에서 지웠어요')}});
$('#libfile').addEventListener('change',e=>{const f=e.target.files[0];if(f)libImport(f);e.target.value=''});
function renameChar(oldN,newN){if(!oldN||oldN===newN)return;
  if(IMG.char[oldN]&&!IMG.char[newN]){const o={...IMG.char[oldN],id:'char:'+newN,name:newN};delete IMG.char[oldN];idb.del('char:'+oldN);IMG.char[newN]=o;idb.put(o)}
  if(NAITAGS[oldN]!=null&&NAITAGS[newN]==null){NAITAGS[newN]=NAITAGS[oldN];delete NAITAGS[oldN];saveNaiTags()}}
// 캐릭터 카드에서 바로 고침: 글자 입력 중에는 카드 전체를 다시 그리지 않고 표시만 갱신
let ctmr;const cardOf=e=>{const el=e.target.closest('.cedit');return el?+el.dataset.ci:-1};
$('#chars').addEventListener('input',e=>{const k=e.target.dataset.ck,i=cardOf(e);if(!k||i<0)return;const c=CHARS[i];
  if(k==='tags'){const v=e.target.value.trim(),n=c.name.trim();if(v)NAITAGS[n]=v;else delete NAITAGS[n];saveNaiTags()}else c[k]=e.target.value;
  saveChars();updateCard(i);updateCastStat();clearTimeout(ctmr);ctmr=setTimeout(()=>{compute(false);renderSugg();renderCastSum();renderSlotsLite()},400)});
$('#chars').addEventListener('change',e=>{if(e.target.dataset.ck!=='name')return;const el=e.target.closest('.cedit'),i=+el.dataset.ci,n=CHARS[i].name.trim();renameChar(el.dataset.old,n);el.dataset.old=n;compute(false);renderSlots()});
$('#chars').addEventListener('focusin',e=>{const i=cardOf(e);if(i>=0&&CHARS[i].name.trim())target={kind:'char',key:CHARS[i].name.trim()}});
$('#chars').addEventListener('click',e=>{const i=cardOf(e);if(i<0)return;const c=CHARS[i],n=c.name.trim();
  const b=e.target.closest('[data-cbody]');if(b){c.body=b.dataset.cbody;saveChars();b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));updateCard(i);updateCastStat();compute(false);return}
  if(e.target.closest('[data-cimgdel]')){e.stopPropagation();if(IMG.char[n]){delete IMG.char[n];idb.del('char:'+n);renderSlots();render()}return}
  if(e.target.closest('[data-cimg]')){if(!n){toast('이름을 먼저 정해 주세요');e.target.closest('.cedit').querySelector('[data-ck=name]').focus();return}target={kind:'char',key:n};$('#file').click();return}
  const a=e.target.closest('[data-act]');if(!a)return;const k=a.dataset.act;
  if(k==='libsave')libSave(i);
  else if(k==='librevert'){const L=libOf(c);if(L){libApply(L,c);saveChars();compute(false);renderSlots();toast('보관함 버전으로 되돌렸어요')}}
  else if(k==='chdel'){if(!confirm(`${n||'이 캐릭터'}을(를) 이 작품에서 뺄까요?${c.lib?' 보관함에는 남아 있어요.':' 보관함에 저장하지 않았다면 다시 불러올 수 없어요.'}`))return;if(IMG.char[n]){delete IMG.char[n];idb.del('char:'+n)}CHARS.splice(i,1);saveChars();compute(false);renderSlots();toast('작품에서 뺐어요')}});
$('#chars').addEventListener('keydown',e=>{if(e.target.matches('[data-cimg]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click()}});
for(const ev of ['dragover','dragleave','drop'])$('#chars').addEventListener(ev,e=>{const d=e.target.closest('[data-cimg]');if(!d)return;e.preventDefault();d.classList.toggle('over',ev==='dragover');
  if(ev==='drop'){const i=cardOf(e),n=i>=0&&CHARS[i].name.trim();const f=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));if(!n){toast('이름을 먼저 정해 주세요');return}if(f)attach(f,{kind:'char',key:n})}});
const focusCard=i=>setTimeout(()=>{const el=document.querySelector(`#chars .cedit[data-ci="${i}"]`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.querySelector(CHARS[i].name.trim()?'[data-ck=look]':'[data-ck=name]').focus({preventScroll:true})}},30);
function addCharFromSugg(name){CHARS.push({name,aliases:'',body:CHARS.filter(c=>c.body==='female').length>CHARS.filter(c=>c.body==='male').length?'male':'female',look:''});saveChars();renderSugg();renderCastSum?.();renderParse?.();toast(`설정집에 「${name}」을 추가했어요 · 외형은 설정집에서 채워 주세요`)}
$('#cutlist').addEventListener('click',e=>{const b=e.target.closest('.newchar [data-sug]');if(b){e.preventDefault();addCharFromSugg(b.dataset.sug)}});
$('#sugg').addEventListener('click',e=>{const b=e.target.closest('[data-sug]');if(!b)return;CHARS.push({name:b.dataset.sug,aliases:'',body:CHARS.filter(c=>c.body==='female').length>CHARS.filter(c=>c.body==='male').length?'male':'female',look:''});saveChars();compute(false);renderSlots();showView('chars');focusCard(CHARS.length-1)});
document.addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(!a||a.closest('#chars .cedit'))return;const k=a.dataset.act;
  if(k==='addchar'){CHARS.push({name:'',aliases:'',body:'female',look:''});saveChars();renderChars();focusCard(CHARS.length-1)}
  else if(k==='libsaveall'){let n=0;CHARS.forEach((c,i)=>{if(c.name.trim()&&libState(c)!=='same'){libSave(i,true);n++}});toast(n?`${n}명을 보관함에 저장했어요`:'모두 보관함과 같아요')}
  else if(k==='libexport')libExport();
  else if(k==='libimport')$('#libfile').click()});

// ---------- 세계관: 개요 + 설정 항목(로어북) + 보관함 ----------
// 캐릭터챗 사이트의 세계관·로어북 구성을 따름: 개요(이름·장르·시대·분위기·한줄 소개·상세 설정)와
// 키워드로 불려 나오는 항목(장소·세력·물건·용어·역사·규칙). 컷 글에 이름이나 키워드가 나오면 그 컷에 적용.
const LORE_CAT={place:['장소','#5b8def'],faction:['세력·조직','#c2410c'],item:['물건','#a16207'],term:['용어·개념','#7c3aed'],history:['역사·사건','#0f766e'],rule:['규칙·체계','#be185d']};
var WORLD,LORE,WLIB;
try{WORLD=JSON.parse(localStorage.getItem('rough-world')||'null')}catch(_){}
if(!WORLD)WORLD={name:'녹빛자정',genre:'로맨스 판타지, 빅토리아풍',era:'19세기 말을 닮은 가상의 왕국',tone:'잔잔하고 서정적, 은근한 긴장',summary:'오래된 저택의 하인들 사이에서 벌어지는 비밀과 연정',detail:'',tags:'victorian, 19th century'};
try{LORE=JSON.parse(localStorage.getItem('rough-lore')||'null')}catch(_){}
if(!Array.isArray(LORE))LORE=[{id:'l1',name:'저택',cat:'place',keys:'복도, 대저택, 저택 안',desc:'왕도 외곽의 오래된 대저택. 긴 복도와 샹들리에, 밤이면 촛불만 켠다.',tags:'mansion, long hallway, candlelight, wooden floor'}];
try{WLIB=JSON.parse(localStorage.getItem('rough-wlib')||'[]')}catch(_){WLIB=[]}
let LORECAT='',WLIBQ='',WLIBC='';
const saveWorld=()=>{try{localStorage.setItem('rough-world',JSON.stringify(WORLD));localStorage.setItem('rough-lore',JSON.stringify(LORE))}catch(_){}};
const saveWlib=()=>{try{localStorage.setItem('rough-wlib',JSON.stringify(WLIB))}catch(_){toast('저장 공간이 부족해요')}};
const loreKeys=e=>[e.name,...String(e.keys||'').split(/[,·]/)].map(x=>x.trim()).filter(x=>x.length>=1);
function loreHits(text){text=String(text||'');return LORE.filter(e=>e.name&&loreKeys(e).some(k=>text.includes(k)))}
function loreTagList(e){return String(e.tags||'').split(',').map(t=>t.trim()).filter(Boolean)}
function worldBrief(){const w=WORLD;return{name:w.name||'',genre:w.genre||'',era:w.era||'',tone:w.tone||'',summary:w.summary||'',detail:(w.detail||'').slice(0,1500),tags:w.tags||''}}
const WF=['name','genre','era','tone','summary','detail','tags'],LF=['name','cat','keys','desc','tags'];
const wlibOf=x=>x&&x.lib&&WLIB.find(y=>y.id===x.lib);
function wState(x,kind){const L=wlibOf(x);if(!L)return'';const F=kind==='world'?WF:LF;const imX=(kind==='world'?IMG.world:IMG.lore[x.id])?.src||'',imL=IMG.wlib[L.id]?.src||'';
  return F.every(f=>(L[f]||'')===(x[f]||''))&&imX===imL?'same':'diff'}
function loreStat(e){const bs=RE.parseCuts(CUTS,engineChars());return bs.filter(b=>loreKeys(e).some(k=>[b.act,b.caption,...(b.dialogs||[]).map(d=>d.text)].join(' ').includes(k))).length}
const imgBox=(im,label,attr,cls='')=>`<div class="drop ce-img${cls}${im?' has':''}" ${attr} tabindex="0" role="button" aria-label="${esc(label)}" style="${im?'':`background:${avBg(label)}`}">${im?`<img src="${im.src}" alt=""><button class="x" data-wimgdel aria-label="이미지 지우기">×</button>`:`<span class="ini">${esc((label||'?').slice(0,1))}</span><small>+ 이미지</small>`}</div>${im?`<div class="pal">${im.palette.map(h=>`<i style="background:${h}" title="${h}"></i>`).join('')}</div>`:''}`;
const libBtns=()=>`<span class="grow"></span><button type="button" class="btn" data-act="wrevert" hidden>보관함 버전으로</button><button type="button" class="btn" data-act="wsave">보관함에 저장</button>`;
function worldRow(){const w=WORLD;
  // 세계관을 뺀 상태(0개): 빈 자리 + 새로 만들기 · 보관함에서 고르기
  if(w.off)return `<div class="wnone"><b>세계관이 없어요</b><span>세계관 없이도 씬·콘티를 만들 수 있어요. 필요하면 새로 만들거나 아래 보관함에서 골라 넣어요.</span><button type="button" class="btn dark" data-act="wnew">+ 새 세계관</button></div>`;
  return `<article class="cedit" data-wk="world"><div class="ce-side">${imgBox(IMG.world,w.name||'세계관','data-wimg="world"',' cover')}</div>
  <div class="ce-f"><div class="ce-top"><input class="ce-name" data-wf="name" value="${esc(w.name||'')}" maxlength="30" placeholder="세계관 이름" aria-label="세계관 이름" spellcheck="false"><span class="cbadge" data-badge hidden></span></div>
    <div class="ce-grid2"><label class="cf"><span>장르 <small>쉼표로 구분</small></span><input data-wf="genre" value="${esc(w.genre||'')}" placeholder="예: 로맨스 판타지, 미스터리"></label>
      <label class="cf"><span>시대·배경</span><input data-wf="era" value="${esc(w.era||'')}" placeholder="예: 19세기 말 가상의 왕국"></label>
      <label class="cf"><span>분위기·톤</span><input data-wf="tone" value="${esc(w.tone||'')}" placeholder="예: 잔잔하고 서정적"></label>
      <label class="cf"><span>한줄 소개 <small data-cnt="summary">${(w.summary||'').length}/80</small></span><input data-wf="summary" maxlength="80" value="${esc(w.summary||'')}" placeholder="이 세계를 한 문장으로"></label></div>
    <label class="cf"><span>상세 설정 <small data-cnt="detail">${(w.detail||'').length}/3000</small></span><textarea data-wf="detail" rows="5" maxlength="3000" placeholder="역사, 사회 구조, 계급, 기술·마법 수준, 금기, 일상 풍경 등">${esc(w.detail||'')}</textarea></label>
    <label class="cf"><span>NovelAI 태그 <small>모든 컷의 기본 프롬프트에 붙어요</small></span><input data-wf="tags" value="${esc(w.tags||'')}" placeholder="victorian, 19th century" spellcheck="false"></label>
    <div class="ce-foot"><span class="cstat">설정 항목 ${LORE.length}개</span>${libBtns()}<button type="button" class="btn" data-act="wdel">작품에서 빼기</button></div></div></article>`}
function loreRow(e,i){const c=LORE_CAT[e.cat]||LORE_CAT.place,n=loreStat(e);return `<article class="cedit" data-li="${i}"><div class="ce-side">${imgBox(IMG.lore[e.id],e.name||c[0],`data-wimg="lore"`)}</div>
  <div class="ce-f"><div class="ce-top"><input class="ce-name" data-lf="name" value="${esc(e.name||'')}" maxlength="30" placeholder="항목 이름" aria-label="항목 이름" spellcheck="false"><select class="ce-sel" data-lf="cat" aria-label="분류">${Object.entries(LORE_CAT).map(([k,v])=>`<option value="${k}"${e.cat===k?' selected':''}>${v[0]}</option>`).join('')}</select><span class="cbadge" data-badge hidden></span></div>
    <label class="cf"><span>키워드 <small>쉼표로 구분 · 이름이나 이 단어가 컷 글에 나오면 적용</small></span><input data-lf="keys" value="${esc(e.keys||'')}" placeholder="예: 복도, 대저택" spellcheck="false"></label>
    <label class="cf"><span>설명 <small data-cnt="desc">${(e.desc||'').length}/1000</small></span><textarea data-lf="desc" rows="3" maxlength="1000" placeholder="생김새, 역할, 얽힌 사연, 규칙">${esc(e.desc||'')}</textarea></label>
    <label class="cf"><span>NovelAI 태그 <small>이 항목이 나오는 컷의 기본 프롬프트에 붙어요</small></span><input data-lf="tags" value="${esc(e.tags||'')}" placeholder="mansion, long hallway" spellcheck="false"></label>
    <div class="ce-foot"><span class="cstat"><i class="catdot" style="background:${c[1]}"></i>${c[0]} · 이 씬 ${n}컷에 등장</span>${libBtns()}<button type="button" class="btn" data-act="ldel">작품에서 빼기</button></div></div></article>`}
function updateWRow(el){const isW=el.dataset.wk==='world',x=isW?WORLD:LORE[+el.dataset.li];if(!x)return;const st=wState(x,isW?'world':'lore');
  const bd=el.querySelector('[data-badge]');bd.textContent=st==='same'?'보관함과 같음':st==='diff'?'보관함과 다름':'';bd.className='cbadge'+(st==='diff'?' diff':'');bd.hidden=!st;
  const sv=el.querySelector('[data-act=wsave]');sv.textContent=st?'보관함 갱신':'보관함에 저장';sv.disabled=st==='same';el.querySelector('[data-act=wrevert]').hidden=st!=='diff';
  el.querySelectorAll('[data-cnt]').forEach(c=>{const f=c.dataset.cnt;c.textContent=`${(x[f]||'').length}/${f==='summary'?80:f==='detail'?3000:1000}`})}
function renderWorld(){if(!$('#worldov'))return;$('#worldov').innerHTML=worldRow();
  $('#lorecat').innerHTML=[['','전체'],...Object.entries(LORE_CAT).map(([k,v])=>[k,v[0]])].map(([k,l])=>`<button data-lc="${k}" aria-pressed="${LORECAT===k}">${l}${k?` ${LORE.filter(e=>e.cat===k).length}`:` ${LORE.length}`}</button>`).join('');
  const rows=LORE.map((e,i)=>[e,i]).filter(([e])=>!LORECAT||e.cat===LORECAT);
  $('#lore').innerHTML=rows.map(([e,i])=>loreRow(e,i)).join('')+`<button class="ccadd" data-act="loreadd">+ 새 설정 항목${LORECAT?` (${LORE_CAT[LORECAT][0]})`:''}</button>`;
  document.querySelectorAll('#worldov .cedit,#lore .cedit').forEach(updateWRow);
  const k=LORE.filter(e=>wState(e,'lore')==='same').length;$('#lorest').textContent=`항목 ${LORE.length}개 · 보관함 저장 ${k}`;renderWlib();renderWorldSum()}
function renderWorldSum(){const el=$('#worldsum');if(!el)return;if(WORLD.off&&!LORE.length){el.innerHTML='<span class="wl">세계관 없음</span>';return}const w=WORLD,bits=[w.genre,w.era].filter(Boolean).join(' · ');
  el.innerHTML=`<span class="av" style="${IMG.world?'':`background:${avBg(w.name||'?')}`}">${IMG.world?`<img src="${IMG.world.src}" alt="">`:esc((w.name||'?').slice(0,1))}</span><span class="wl" title="${esc([w.name,bits,w.summary].filter(Boolean).join(' · '))}"><b>${esc(w.name||'이름 없음')}</b>${bits?` · ${esc(bits)}`:''} · 설정 ${LORE.length}개${LORE.length?` (${LORE.map(e=>esc(e.name)).join(', ')})`:''}</span><button class="btn" data-view="world">세계관 페이지에서 편집</button>`}
// 보관함: 개요(kind world)와 항목(kind lore)을 함께 보관
function wlibSave(x,kind,quiet){const nm=(x.name||'').trim();if(!nm){toast('이름을 먼저 정해 주세요');return}
  let L=wlibOf(x);if(!L){L={id:'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind};WLIB.unshift(L);x.lib=L.id}
  for(const f of kind==='world'?WF:LF)L[f]=x[f]||'';L.kind=kind;L.at=Date.now();
  const im=kind==='world'?IMG.world:IMG.lore[x.id];if(im){const o={...im,id:'wlib:'+L.id,kind:'wlibimg',libId:L.id};delete o.loreId;IMG.wlib[L.id]=o;idb.put(o)}else if(IMG.wlib[L.id]){delete IMG.wlib[L.id];idb.del('wlib:'+L.id)}
  saveWlib();saveWorld();if(!quiet)toast(`${nm}을(를) 보관함에 저장했어요`)}
function wlibApply(L,x,kind){delete x.off;for(const f of kind==='world'?WF:LF)x[f]=L[f]||'';x.lib=L.id;const im=IMG.wlib[L.id];
  if(kind==='world'){if(im){const o={...im,id:'world:cover',kind:'worldimg'};delete o.libId;IMG.world=o;idb.put(o)}else if(IMG.world){IMG.world=null;idb.del('world:cover')}}
  else{if(im){const o={...im,id:'lore:'+x.id,kind:'loreimg',loreId:x.id};delete o.libId;IMG.lore[x.id]=o;idb.put(o)}else if(IMG.lore[x.id]){delete IMG.lore[x.id];idb.del('lore:'+x.id)}}}
function wlibUse(id){const L=WLIB.find(x=>x.id===id);if(!L)return;
  if(L.kind==='world'){if(WORLD.lib===id){toast('이미 이 작품의 세계관이에요');return}if((WORLD.name||WORLD.detail)&&!confirm(`지금 세계관 개요를 '${L.name}'(으)로 바꿀까요? 설정 항목은 그대로예요.`))return;wlibApply(L,WORLD,'world')}
  else{if(LORE.some(e=>e.lib===id)){toast('이미 이 작품에 있어요');return}const e={id:'l'+Date.now().toString(36)};LORE.push(e);wlibApply(L,e,'lore')}
  saveWorld();renderWorld();compute(false);renderSlotsLite();toast(`${L.name}을(를) 작품에 넣었어요`)}
function renderWlib(){const el=$('#wlibgrid');if(!el)return;const q=WLIBQ.trim().toLowerCase();
  $('#wlibc').innerHTML=[['','전체'],['world','세계관'],...Object.entries(LORE_CAT).map(([k,v])=>[k,v[0]])].map(([k,l])=>`<button data-wc="${k}" aria-pressed="${WLIBC===k}">${l}</button>`).join('');
  const list=WLIB.filter(L=>(!WLIBC||(WLIBC==='world'?L.kind==='world':L.kind==='lore'&&L.cat===WLIBC))&&(!q||[L.name,L.keys,L.desc,L.genre,L.summary,L.detail,L.tags].join(' ').toLowerCase().includes(q)));
  el.innerHTML=list.length?list.map(L=>{const im=IMG.wlib[L.id],used=L.kind==='world'?WORLD.lib===L.id:LORE.some(e=>e.lib===L.id),c=L.kind==='world'?['세계관','#334155']:(LORE_CAT[L.cat]||LORE_CAT.place);
    return `<div class="lcard${used?' in':''}"><span class="av sq" style="${im?'':`background:${avBg(L.name)}`}">${im?`<img src="${im.src}" alt="">`:esc((L.name||'?').slice(0,1))}</span>
      <div style="min-width:0"><b>${esc(L.name)}</b><small><i class="catdot" style="background:${c[1]}"></i>${c[0]}${L.kind==='world'&&L.genre?` · ${esc(L.genre)}`:L.keys?` · ${esc(L.keys)}`:''}</small><div class="ll">${esc((L.kind==='world'?L.summary||L.detail:L.desc)||L.tags||'설명 없음')}</div></div>
      <div class="la"><button class="lx" data-wlibdel="${L.id}">삭제</button><small>${new Date(L.at).toLocaleDateString('ko-KR')} 저장</small>${used?'<span class="status">이 작품에서 사용 중</span>':`<button class="btn dark" data-wlibuse="${L.id}">작품에 넣기</button>`}</div></div>`}).join(''):
    `<p class="empty" style="padding:8px 0">${WLIB.length?'검색 결과가 없어요':'아직 비어 있어요. 위 개요나 항목에서 \'보관함에 저장\'을 누르면 여기 쌓여요.'}</p>`}
function wlibExport(){if(!WLIB.length){toast('보관함이 비어 있어요');return}
  const data={type:'rough-world',version:1,exported:new Date().toISOString(),items:WLIB.map(L=>({...L,image:IMG.wlib[L.id]?{src:IMG.wlib[L.id].src,w:IMG.wlib[L.id].w,h:IMG.wlib[L.id].h,palette:IMG.wlib[L.id].palette}:null}))};
  download('rough-world.json',URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})));toast(`세계관 보관함 ${WLIB.length}개를 파일로 내보냈어요`)}
async function wlibImport(file){try{const d=JSON.parse(await file.text());if(d.type!=='rough-world'||!Array.isArray(d.items))throw new Error('세계관 파일이 아니에요');let n=0;
  for(const x of d.items){if(!x||!x.name)continue;const kind=x.kind==='world'?'world':'lore';const L={id:String(x.id||('w'+Date.now().toString(36)+n)),kind,at:+x.at||Date.now()};
    for(const f of kind==='world'?WF:LF)L[f]=String(x[f]||'').slice(0,f==='detail'?3000:1000);if(kind==='lore'&&!LORE_CAT[L.cat])L.cat='place';
    const i=WLIB.findIndex(y=>y.id===L.id);if(i>=0)WLIB[i]=L;else WLIB.push(L);
    if(x.image&&typeof x.image.src==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(x.image.src)){const o={id:'wlib:'+L.id,kind:'wlibimg',libId:L.id,src:x.image.src,w:+x.image.w||0,h:+x.image.h||0,palette:Array.isArray(x.image.palette)?x.image.palette.filter(h=>/^#[0-9a-f]{6}$/i.test(h)).slice(0,5):[]};IMG.wlib[L.id]=o;idb.put(o)}n++}
  saveWlib();renderWorld();toast(`${n}개를 가져왔어요`)}catch(e){toast('가져오지 못했어요: '+e.message)}}
// 바로 고치기 이벤트
{const root=$('#v-world');let wt;
  const rowOf=e=>e.target.closest('#worldov .cedit,#lore .cedit');
  const itemOf=el=>el.dataset.wk==='world'?[WORLD,'world']:[LORE[+el.dataset.li],'lore'];
  root.addEventListener('input',e=>{const el=rowOf(e);if(!el)return;const f=e.target.dataset.wf||e.target.dataset.lf;if(!f)return;const [x]=itemOf(el);x[f]=e.target.value;saveWorld();updateWRow(el);
    clearTimeout(wt);wt=setTimeout(()=>{compute(false);renderWorldSum()},400)});
  root.addEventListener('change',e=>{const el=rowOf(e);if(!el)return;if(e.target.dataset.lf==='cat'||e.target.dataset.lf==='name'||e.target.dataset.lf==='keys')renderWorld()});
  root.addEventListener('focusin',e=>{const el=rowOf(e);if(!el)return;target=el.dataset.wk==='world'?{kind:'world',key:'cover'}:{kind:'lore',key:LORE[+el.dataset.li].id}});
  root.addEventListener('click',e=>{const lc=e.target.closest('[data-lc]');if(lc){LORECAT=lc.dataset.lc;renderWorld();return}
    const wc=e.target.closest('[data-wc]');if(wc){WLIBC=wc.dataset.wc;renderWlib();return}
    const u=e.target.closest('[data-wlibuse]');if(u){wlibUse(u.dataset.wlibuse);return}
    const dl=e.target.closest('[data-wlibdel]');if(dl){const L=WLIB.find(x=>x.id===dl.dataset.wlibdel);if(!L||!confirm(`보관함에서 '${L.name}'을(를) 지울까요? 작품에 넣은 내용은 그대로 남아요.`))return;
      WLIB=WLIB.filter(x=>x.id!==L.id);if(IMG.wlib[L.id]){delete IMG.wlib[L.id];idb.del('wlib:'+L.id)}if(WORLD.lib===L.id)delete WORLD.lib;LORE.forEach(x=>{if(x.lib===L.id)delete x.lib});saveWlib();saveWorld();renderWorld();toast('보관함에서 지웠어요');return}
    const a=e.target.closest('[data-act]'),k=a&&a.dataset.act;
    if(k==='wnew'){WORLD={name:'',genre:'',era:'',tone:'',summary:'',detail:'',tags:''};saveWorld();renderWorld();setTimeout(()=>document.querySelector('#worldov [data-wf=name]')?.focus(),30);return}
    if(k==='wdel'){if(!confirm(`세계관 「${WORLD.name||'이름 없음'}」을(를) 이 작품에서 뺄까요?${WORLD.lib?' 보관함에는 남아 있어요.':' 보관함에 저장하지 않았다면 다시 불러올 수 없어요.'} 설정 항목은 그대로예요.`))return;
      if(IMG.world){IMG.world=null;idb.del('world:cover')}WORLD={off:true};saveWorld();renderWorld();render?.();compute(false);toast('세계관을 작품에서 뺐어요');return}
    if(k==='loreadd'){const it={id:'l'+Date.now().toString(36),name:'',cat:LORECAT||'place',keys:'',desc:'',tags:''};LORE.push(it);saveWorld();renderWorld();setTimeout(()=>{const r=document.querySelector(`#lore .cedit[data-li="${LORE.length-1}"]`);if(r){r.scrollIntoView({behavior:'smooth',block:'center'});r.querySelector('[data-lf=name]').focus({preventScroll:true})}},30);return}
    if(k==='wlibsaveall'){let n=0;if((WORLD.name||'').trim()&&wState(WORLD,'world')!=='same'){wlibSave(WORLD,'world',true);n++}LORE.forEach(x=>{if((x.name||'').trim()&&wState(x,'lore')!=='same'){wlibSave(x,'lore',true);n++}});renderWorld();toast(n?`${n}개를 보관함에 저장했어요`:'모두 보관함과 같아요');return}
    if(k==='wlibexport'){wlibExport();return}if(k==='wlibimport'){$('#wlibfile').click();return}
    const el=rowOf(e);if(!el)return;const [x,kind]=itemOf(el);
    if(e.target.closest('[data-wimgdel]')){e.stopPropagation();if(kind==='world'){if(IMG.world){IMG.world=null;idb.del('world:cover')}}else if(IMG.lore[x.id]){delete IMG.lore[x.id];idb.del('lore:'+x.id)}renderWorld();render();return}
    if(e.target.closest('[data-wimg]')){target=kind==='world'?{kind:'world',key:'cover'}:{kind:'lore',key:x.id};$('#file').click();return}
    if(k==='wsave'){wlibSave(x,kind);renderWorld()}
    else if(k==='wrevert'){const L=wlibOf(x);if(L){wlibApply(L,x,kind);saveWorld();renderWorld();compute(false);toast('보관함 버전으로 되돌렸어요')}}
    else if(k==='ldel'){if(!confirm(`${x.name||'이 항목'}을(를) 이 작품에서 뺄까요?${x.lib?' 보관함에는 남아 있어요.':''}`))return;if(IMG.lore[x.id]){delete IMG.lore[x.id];idb.del('lore:'+x.id)}LORE.splice(+el.dataset.li,1);saveWorld();renderWorld();compute(false);toast('작품에서 뺐어요')}});
  root.addEventListener('keydown',e=>{if(e.target.matches('[data-wimg]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click()}});
  for(const ev of ['dragover','dragleave','drop'])root.addEventListener(ev,e=>{const d=e.target.closest('[data-wimg]');if(!d)return;e.preventDefault();d.classList.toggle('over',ev==='dragover');
    if(ev==='drop'){const el=rowOf(e);const f=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));if(!f||!el)return;attach(f,el.dataset.wk==='world'?{kind:'world',key:'cover'}:{kind:'lore',key:LORE[+el.dataset.li].id})}});
  $('#wlibq').addEventListener('input',e=>{WLIBQ=e.target.value;renderWlib()});
  $('#wlibfile').addEventListener('change',e=>{const f=e.target.files[0];if(f)wlibImport(f);e.target.value=''});}
// 러프 툴 본체 3/6 — 씬: @ 자동완성·씬 목록·컷 입력·해석 줄·효과음 추천
// 원본 조각: tools/build_app.py가 6개를 순서대로 이어 rough/app.js를 만듦(사이트는 app.js 하나를 실음 — 조각끼리 불러올 때 서로 부르는 곳이 많아 따로 싣지 않음)
// ---------- @ 자동완성 ----------
const mbox=document.createElement('div');mbox.className='menu';mbox.id='mbox';mbox.setAttribute('role','listbox');mbox.hidden=true;document.body.appendChild(mbox);
let mSel=0,mList=[],mStart=-1;
function caretXY(ta,pos){const cs=getComputedStyle(ta),d=document.createElement('div');
  for(const k of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','paddingTop','paddingLeft','paddingRight','borderTopWidth','borderLeftWidth','boxSizing'])d.style[k]=cs[k];
  Object.assign(d.style,{position:'absolute',visibility:'hidden',whiteSpace:'pre-wrap',wordWrap:'break-word',width:ta.clientWidth+'px',left:'-9999px',top:'0'});
  d.textContent=ta.value.slice(0,pos);const sp=document.createElement('span');sp.textContent='​';d.appendChild(sp);document.body.appendChild(d);
  const r=ta.getBoundingClientRect(),x=r.left+sp.offsetLeft,y=r.top+sp.offsetTop-ta.scrollTop+parseFloat(cs.lineHeight||20);d.remove();return [x,y]}
let TA=null;
function mentionQuery(){const ta=TA;if(!ta)return null;if(ta.selectionStart!==ta.selectionEnd)return null;const pos=ta.selectionStart;const m=ta.value.slice(0,pos).match(/(^|[^가-힣A-Za-z0-9_])@([가-힣A-Za-z0-9_]*)$/);return m?{q:m[2],start:pos-m[2].length-1,pos}:null}
function showMbox(){const mq=mentionQuery();const cs=CHARS.filter(c=>c.name.trim());
  mList=mq?cs.filter(c=>{const n=c.name.trim();if(n===mq.q)return false;return n.startsWith(mq.q)||String(c.aliases||'').split(/[,·]/).some(a=>a.trim()&&a.trim().startsWith(mq.q)&&mq.q)}).map(c=>c.name.trim()):[];if(!mList.length){mbox.hidden=true;return}
  mStart=mq.start;mSel=Math.min(mSel,mList.length-1);
  mbox.innerHTML=mList.map((n,i)=>{const c=CHARS.find(c=>c.name.trim()===n)||{},im=IMG.char[n];return `<button role="option" data-mi="${i}" aria-checked="${i===mSel}" class="mopt"><i class="av" style="${im?'':`background:${avBg(n)}`}">${im?`<img src="${im.src}" alt="">`:esc(n.slice(0,1))}</i><span><b>@${esc(n)}</b><small>${esc([c.body==='male'?'남자':'여자',c.aliases?`다른 호칭 ${c.aliases}`:'',(c.look||'').slice(0,24)].filter(Boolean).join(' · '))}</small></span></button>`}).join('');
  mbox.hidden=false;const [x,y]=caretXY(TA,mq.pos);mbox.style.left=Math.min(innerWidth-mbox.offsetWidth-8,x+scrollX)+'px';mbox.style.top=(y+scrollY+4)+'px'}
function pickMention(i){const ta=TA;const name=mList[i];if(!name)return;const pos=ta.selectionStart;
  ta.value=ta.value.slice(0,mStart)+'@'+name+ta.value.slice(pos);const c=mStart+name.length+1;ta.setSelectionRange(c,c);ta.focus();mbox.hidden=true;ta.dispatchEvent(new Event('input',{bubbles:true}))}
// 컷 칸 (컷별 입력)
// 초기 예시: 연출 DB 742묶음에서 가장 많이 쓰인 두 연출 — Delayed Reveal(123묶음, HN-05-G07 79%)과
// Reaction Framing(110묶음, GM-02-G02 71%)이 엔진 1순위로 잡히고, 레퍼런스가 말풍선 적은 원본 컷으로 나오는 두 씬(2026-11-22 기준)
const DEFAULT_SCENES=[{"title": "창밖의 장미", "cuts": ["밤, 하녀 방. 창문을 두드리는 소리.\n-똑똑-\n[그날 밤]", "이 시간에 누구지? @준 고개를 갸우뚱한다.", "@준 촛불을 들고 창가로 다가간다.", "@준 천천히 커튼을 걷는다.", "창밖에 서 있는 @에드가. 장미 한 송이를 들고 있다.\n@에드가 \"떠나기 전에 꼭 할 말이 있었어.\"", "@준 귀가 빨개져 시선을 피한다.\n[두근]"]}, {"title": "마차 소리", "cuts": ["새벽, 안개 낀 저택 앞마당. 마차가 서 있다.\n[다음 날 새벽]", "하녀1 \"에드가 님, 정말 가시는 거예요?\"", "@에드가 대답 없이 가방을 싣는다.", "@준 계단 위에서 그 모습을 내려다본다.", "@준 화들짝 놀라 계단을 뛰어 내려간다.\n@준 \"에드가!\"", "@에드가 천천히 돌아본다.\n-덜컹-"]}];
const DEFAULT_CUTS=DEFAULT_SCENES[0].cuts;
// 작품 = 씬 목록. 씬 = {id,title,cuts,pageEdits}
let SCENES,SCUR=0;
let LS_SCENES_MISSING=false;try{const raw=localStorage.getItem('rough-scenes');LS_SCENES_MISSING=!raw;SCENES=JSON.parse(raw||'null')}catch(_){}
if(!Array.isArray(SCENES)||!SCENES.length){let old=null;try{old=JSON.parse(localStorage.getItem('rough-cuts')||'null')}catch(_){}
  SCENES=old?[{id:'s'+Date.now(),title:'씬 1',cuts:old,pageEdits:[]}]:DEFAULT_SCENES.map((d,k)=>({id:'s'+Date.now()+k,title:d.title,cuts:d.cuts.slice(),pageEdits:[]}));try{localStorage.setItem('rough-scenes',JSON.stringify(SCENES))}catch(_){}}
SCENES.forEach(sc=>{if(!Array.isArray(sc.pageEdits))sc.pageEdits=[]});
try{SCUR=Math.min(SCENES.length-1,Math.max(0,+localStorage.getItem('rough-scene-cur')||0))}catch(_){}
let CUTS=SCENES[SCUR].cuts;
// 저장은 모아서: 편집 한 번마다 원고 전체를 문자열로 바꿔 쓰던 것을 0.4초 동안 모아 한 번만(끌기·입력 중 버벅임 줄임)
// 원고는 IndexedDB(큰 저장소)에도 같이 씀. 브라우저 기본 저장 공간(5MB 안팎)이 차면 기본 저장 칸을 비우고 IndexedDB만 씀 → 다음에 열 때 거기서 불러옴
let SAVE_T=0,SAVE_DIRTY=false,LS_FULL_TOLD=false;
function saveScenes(){SP_FRESH=null;SCENES[SCUR].cuts=CUTS;SAVE_DIRTY=true;clearTimeout(SAVE_T);SAVE_T=setTimeout(flushScenes,400);return true}
function docEp(){try{return (JSON.parse(localStorage.getItem('rough-episodes')||'null')||{}).cur||''}catch(_){return ''}}
function flushScenes(){clearTimeout(SAVE_T);SAVE_T=0;if(!SAVE_DIRTY||window.ROUGH_NOSAVE)return true;SAVE_DIRTY=false;const json=JSON.stringify(SCENES),at=Date.now();
  idb.putDoc({id:'doc:rough-scenes',kind:'doc',ep:docEp(),at,cur:SCUR,json});
  try{localStorage.setItem('rough-scenes',json);localStorage.setItem('rough-scene-cur',SCUR);saveOk();if(typeof autoSnapshot==='function')autoSnapshot();return true}
  catch(e){if(/quota/i.test(e?.name+e?.message)){try{localStorage.removeItem('rough-scenes');localStorage.setItem('rough-scene-cur',SCUR)}catch(_){}
      if(!LS_FULL_TOLD){LS_FULL_TOLD=true;toast('브라우저 기본 저장 공간이 가득 차서 원고를 큰 저장소(IndexedDB)에 저장해요',3200)}if(typeof autoSnapshot==='function')autoSnapshot();return true}
    saveFail(e,'원고');return false}}
addEventListener('pagehide',flushScenes);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushScenes()});
// 기본 저장 칸에 원고가 없고 IndexedDB에 같은 회차 원고가 있으면 그것으로(가득 차서 옮겨 둔 경우)
if(LS_SCENES_MISSING)idb.getDoc('doc:rough-scenes').then(d=>{if(!d||!d.json||(d.ep||'')!==docEp())return;let arr;try{arr=JSON.parse(d.json)}catch(_){return}if(!Array.isArray(arr)||!arr.length)return;
  arr.forEach(sc=>{if(!Array.isArray(sc.pageEdits))sc.pageEdits=[]});SCENES.splice(0,SCENES.length,...arr);SCUR=Math.min(arr.length-1,Math.max(0,d.cur||0));CUTS=SCENES[SCUR].cuts;SP_CACHE?.clear?.();
  try{switchScene(SCUR);if(typeof VIEW!=='undefined'&&VIEW==='webtoon')renderWebtoon()}catch(e){console.warn(e)}toast('큰 저장소(IndexedDB)에서 원고를 불러왔어요')});
// 저장 실패: '저장됨' 대신 실패를 계속 보여 주고, 처음 한 번 알림. 다음 저장이 성공하면 풀림
let SAVE_FAIL=null;
function saveFail(e,what){const first=!SAVE_FAIL;SAVE_FAIL={at:Date.now(),what};saveFailLabel();
  if(first)toast(`${what}를 저장하지 못했어요. 브라우저 저장 공간이 꽉 찼거나 막혀 있어요. 지금 편집 중인 내용은 이 탭을 닫으면 사라질 수 있어요.`,6000)}
function saveOk(){if(!SAVE_FAIL)return;SAVE_FAIL=null;document.querySelectorAll('.edsave').forEach(el=>el.classList.remove('fail'));if(typeof scSaveLabel==='function')scSaveLabel();if(typeof edSaveLabel==='function')edSaveLabel();toast('다시 저장됐어요')}
function saveFailLabel(){document.querySelectorAll('.edsave').forEach(el=>{el.textContent=`저장 안 됨 · ${SAVE_FAIL.what}`;el.title='브라우저 저장 공간이 부족하거나 막혀 있어요';el.classList.add('fail','on')})}
function cutEdits(){const edits=SCENES[SCUR].pageEdits;edits.length=CUTS.length;return edits}
function saveCuts(){saveScenes();renderSceneList()}
function sceneLabel(sc,i){return `씬 ${i+1} · ${sc.title||'제목 없는 씬'}`}
function renderSceneList(){
  const canDelete=SCENES.length>1;
  $('#scenelist').innerHTML=SCENES.map((sc,i)=>`<li><button data-scene="${i}" aria-current="${i===SCUR}"><span class="sn">${i+1}</span><span style="min-width:0"><span class="st">${esc(sc.title||'제목 없는 씬')}</span><br><small>${sc.cuts.filter(c=>c.trim()).length}컷</small></span></button>${canDelete?`<button class="scene-delete" type="button" data-scene-delete="${i}" aria-label="${esc(sceneLabel(sc,i))} 삭제" title="씬 삭제"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>`:''}</li>`).join('');
  $('#scount').textContent=`${SCENES.length}개`;
  document.querySelectorAll('[data-scbar]').forEach(el=>el.innerHTML=`<button class="ib" data-scmove="-1" aria-label="이전 씬"${SCUR?'':' disabled'}>‹</button><select data-scsel aria-label="씬 고르기">${SCENES.map((sc,i)=>`<option value="${i}"${i===SCUR?' selected':''}>${esc(sceneLabel(sc,i))}</option>`).join('')}</select><button class="ib" data-scmove="1" aria-label="다음 씬"${SCUR<SCENES.length-1?'':' disabled'}>›</button><span>${SCENES[SCUR].cuts.filter(c=>c.trim()).length}컷</span>`);
}
function switchScene(i){if(i<0||i>=SCENES.length)return;saveScenes();SCUR=i;CUTS=SCENES[i].cuts;saveScenes();
  $('#sctitle').value=SCENES[i].title||'';renderCuts();renderSceneList();state.sel=-1;compute(true);renderSlots();renderSugg();
}
function deleteScene(index){
  const scene=SCENES[index];
  if(SCENES.length<=1||!scene)return;
  if(!confirm(`${sceneLabel(scene,index)}을(를) 삭제할까요?`))return;
  saveScenes();
  const active=SCENES[SCUR];
  SCENES.splice(index,1);
  const remainingIndex=SCENES.indexOf(active);
  SCUR=remainingIndex>=0?remainingIndex:Math.min(index,SCENES.length-1);
  CUTS=SCENES[SCUR].cuts;
  switchScene(SCUR);
  document.querySelector(`#scenelist [data-scene="${SCUR}"]`)?.focus({preventScroll:true});
  toast('씬을 삭제했어요');
}
function grow(t){t.style.height='auto';t.style.height=(t.scrollHeight+2)+'px';const h=t.previousElementSibling;
  if(h?.classList.contains('cuthl')&&!h._m&&t.offsetWidth){const cs=getComputedStyle(t);for(const k of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','wordSpacing','wordBreak','lineBreak','textIndent','tabSize','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','fontKerning','textRendering'])h.style[k]=cs[k];h.style.borderStyle='solid';h.style.borderColor='transparent';h.style.boxSizing=cs.boxSizing;h._m=1}}
function renderCuts(){if(!CUTS.length)CUTS=[''];
  const firstEmpty=CUTS.findIndex(c=>!String(c).trim());
  $('#cutlist').innerHTML=CUTS.map((c,i)=>`<li data-i="${i}"><span class="cn" title="끌어서 순서 바꾸기">${i+1}</span><div class="cutbox"><div class="cuthl" aria-hidden="true">${cutHL(c)}</div><textarea class="cutin" rows="1" spellcheck="false" aria-label="${i+1}번 컷" placeholder="${(i===firstEmpty?'@준 창가로 다가간다. {클로즈업}&#10;@준 &quot;누구세요?&quot;':'')}">${esc(c)}</textarea></div><span class="tools"><button data-cut="up" aria-label="위로" title="위로">↑</button><button data-cut="down" aria-label="아래로" title="아래로">↓</button><button data-cut="del" aria-label="삭제" title="삭제">×</button></span><div class="cutparse" data-parse></div></li>`).join('');
  document.querySelectorAll('.cutin').forEach(grow);renderParse()}
// 글 위 강조: 문법을 입력칸 글자 뒤에 바로 칠함(배경만 칠해 글자 위치는 입력칸 그대로). 대사 줄·나레이션 줄은 줄 전체, 효과음·연출·@인물은 그 부분만
const HL_TOK=/(\{[^{}\n]*\})|((?:^|(?<=\s))(-{1,3})[^\s-][^-\n]{0,10}?\3(?=\s|$|[.,!?]))|(@[^\s"“”.,!?{}()]+)/g;
const HL_DLG=/^(?:@[^\s"“]+\s*)?["“].*["”]\s*[.!?…]*$/,HL_MIX=/["“][^"”]+["”]/;
const dirBad=t=>!!t.trim()&&RoughGrammar.derive({dir:RE.readDirs([t])}).unknown.length>0;
// {…} 안을 항목별로: 못 읽은 항목만 빨갛게
const dirHL=tok=>`<i class="h-dir">{${tok.slice(1,-1).split(/([,，·\/])/).map((x,k)=>k%2?esc(x):dirBad(x)?`<i class="bad">${esc(x)}</i>`:esc(x)).join('')}}</i>`;
function cutHL(text){return String(text??'').split('\n').map(line=>{const bare=line.replace(/\{[^{}\n]*\}/g,'').replace(/(^|\s)-{1,3}[^\s-][^-\n]{0,10}?-{1,3}(?=\s|$|[.,!?])/g,'$1').trim();
    const kind=!bare?'':HL_DLG.test(bare)?'dlg':/^\[.*\]$/.test(bare)?'cap':HL_MIX.test(bare)?'mix':'act';
    let o='',last=0;line.replace(HL_TOK,(m,d,sfx,_dash,at,off)=>{o+=esc(line.slice(last,off));last=off+m.length;
      o+=d?dirHL(d):sfx?`<i class="h-sfx">${esc(m)}</i>`:`<i class="h-who">${esc(m)}</i>`;return m});
    o+=esc(line.slice(last));return `<div class="hl-${kind||'empty'}">${o||'<br>'}</div>`}).join('')}
function syncHL(t){const h=t.previousElementSibling;if(h?.classList.contains('cuthl'))h.innerHTML=cutHL(t.value)}
// 대사와 줄글 나누기: 한 줄에 묘사와 "대사"가 섞여 있으면 입력칸을 벗어날 때 대사를 @인물 "대사" 줄로 떼어 냄
function splitMixed(text){let n=0;const out=String(text||'').split('\n').flatMap(line=>{const dirs=line.match(/\{[^{}\n]*\}/g)||[],bare=line.replace(/\{[^{}\n]*\}/g,'').trim();
    if(!HL_MIX.test(bare)||HL_DLG.test(bare)||/^\[.*\]$/.test(bare))return[line];
    const who=(bare.match(/@([^\s"“”.,!?{}()]+)/)||[])[1]||'',qs=[...bare.matchAll(/["“]([^"”]+)["”]/g)].map(m=>m[1].trim()).filter(Boolean);
    let prose=bare.replace(/["“][^"”]*["”]\s*(하고|라고|하며|라며|며)?/g,' ').replace(/\s+/g,' ').trim();
    if(new RegExp('^@'+who.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[.,]?$').test(prose))prose='';n++;
    return[...(prose||dirs.length?[[prose,...dirs].filter(Boolean).join(' ')]:[]),...qs.map(q=>`${who?'@'+who+' ':''}"${q}"`)]});
  return{text:out.join('\n'),n}}
// 컷 아래 해석 줄: 글에 칠해지지 않는 것만(읽은 주인공 · 말풍선 자동 모양 · 세계관 항목)
function renderParse(){const bs=RE.parseCuts(CUTS,engineChars());const by={};bs.forEach(b=>{const m=/^#(\d+):/.exec(b.key||'');if(m)by[+m[1]]=b});let nd=0,nc=0,ns=0;
  document.querySelectorAll('#cutlist li').forEach(li=>{const i=+li.dataset.i,b=by[i],el=li.querySelector('[data-parse]');if(!el)return;if(!b||!CUTS[i].trim()){el.innerHTML='';return}
    const av=n=>{const im=IMG.char[n];return `<i class="av" style="${im?'':`background:${avBg(n)}`}">${im?`<img src="${im.src}" alt="">`:esc(n.slice(0,1))}</i>`};const out=[];

    nd+=(b.dialogs||[]).filter(d=>d.text).length;nc+=(b.captions||[]).length;ns+=(b.sfx||[]).length;
    {const D=b.dir||{},g=RoughGrammar.derive(b);
      const st=g.edit?.letters&&Object.entries(g.edit.letters).filter(([key,v])=>v.style&&/^dialog/.test(key)).map(([,v])=>balloonPreset(v.style)?.[1].split(' · ')[0]).filter(Boolean);
}
    if(typeof loreHits==='function')loreHits(CUTS[i]).forEach(e=>out.push(`<span>◆ ${esc(e.name)}</span>`));
    {const un=unknownNames([CUTS[i]]);if(un.length)out.push(`<span class="newchar"><small>설정집에 없음</small>${un.map(n=>`<button type="button" data-sug="${esc(n)}" title="설정집 캐릭터에 「${esc(n)}」 추가">+ ${esc(n)}</button>`).join('')}</span>`)}
    // 효과음 추천: 효과음이 없는 컷에만, 눌러서 바로 넣기(sfx-rec.js)
    if(window.RoughSfxRec&&!(b.sfx||[]).length){const emo=(state.panels||[]).find(p=>String(p.key||'').startsWith('#'+i+':'))?.emo;
      const rs=RoughSfxRec.recommend(CUTS[i],emo,3);if(rs.length)out.push(`<span class="sfxrec"><small>효과음</small>${rs.map(r=>`<button type="button" data-sfxadd="${esc(r.word)}" data-i="${i}" title="${esc(r.why)} 때문에 추천 · ${esc(r.cat)}">+ ${esc(r.word)}</button>`).join('')}</span>`)}
    el.innerHTML=out.join('')});
  const m=$('#scmeta2');if(m)m.textContent=`대사 ${nd} · 식자 ${nc} · 효과음 ${ns}`}
const cutChanged=()=>{saveCuts();scSaved();clearTimeout(tmr);tmr=setTimeout(()=>{compute(true);renderSlots();renderSugg();renderParse()},350)};
let scSavedAt=0;function scSaved(){scSavedAt=Date.now();scSaveLabel()}
function scSaveLabel(){const el=$('#scsave');if(!el)return;if(SAVE_FAIL){saveFailLabel();return}if(!scSavedAt)return;const s=Math.round((Date.now()-scSavedAt)/1000);el.textContent=s<5?'저장됨 · 방금':s<60?`저장됨 · ${s}초 전`:`저장됨 · ${Math.round(s/60)}분 전`;el.classList.add('on')}
setInterval(scSaveLabel,5000);
$('#cutlist').addEventListener('input',e=>{const t=e.target.closest('.cutin');if(!t)return;CUTS[+t.closest('li').dataset.i]=t.value;grow(t);syncHL(t);cutChanged();mSel=0;showMbox()});
$('#cutlist').addEventListener('focusin',e=>{const t=e.target.closest('.cutin');if(t)TA=t});
$('#cutlist').addEventListener('focusout',e=>{const t=e.target.closest('.cutin');if(!t)return;const r=splitMixed(t.value);if(!r.n||r.text===t.value)return;
  if(typeof edRecord==='function'){edRecord();edLast=0}  // 나누기 전 글을 따로 한 단계로
  t.value=r.text;CUTS[+t.closest('li').dataset.i]=t.value;grow(t);syncHL(t);cutChanged();toast(`대사를 따로 줄로 나눴어요 (${r.n}줄) · 묘사와 대사는 줄을 나눠 써요 · Ctrl+Z로 되돌리기`,2400)});
$('#cutlist').addEventListener('click',e=>{const b=e.target.closest('[data-cut]');if(e.target.closest('.cutin'))showMbox();if(!b)return;cutAct(+b.closest('li').dataset.i,b.dataset.cut)});
// 컷 위·아래·지우기(버튼과 Ctrl+Shift+↑/↓ 공용, 포스타입 블록 이동과 같은 키)
function cutAct(i,k){
  const edits=cutEdits();
  const n=CUTS.length,j=k==='up'?i-1:i+1;if(k!=='del'&&(j<0||j>=n))return;
  remapCuts(SCUR,()=>{if(k==='del'){CUTS.splice(i,1);edits.splice(i,1);return moveMap(n,x=>x===i?-1:x>i?x-1:x)}
    [CUTS[i],CUTS[j]]=[CUTS[j],CUTS[i]];[edits[i],edits[j]]=[edits[j],edits[i]];return moveMap(n,x=>x===i?j:x===j?i:x)});
  renderCuts();cutChanged();return k==='del'?null:j}
$('#cutlist').addEventListener('keydown',e=>{const t=e.target.closest('.cutin');if(!t||!(e.ctrlKey||e.metaKey)||!e.shiftKey||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;
  e.preventDefault();const pos=t.selectionStart,j=cutAct(+t.closest('li').dataset.i,e.key==='ArrowUp'?'up':'down');if(j==null)return;
  const nt=document.querySelector(`#cutlist li[data-i="${j}"] .cutin`);if(nt){nt.focus();try{nt.setSelectionRange(pos,pos)}catch(_){}}});
// Ctrl+S: 자동 저장이지만 손버릇대로 눌러도 "저장됨"을 보여 줌
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.shiftKey||e.altKey||e.key.toLowerCase()!=='s')return;e.preventDefault();
  try{saveScenes()}catch(_){}const el=VIEW==='webtoon'?$('#edsave'):$('#scsave');if(el){el.textContent='저장됨 · 방금';el.classList.add('on')}toast('저장했어요 · 따로 누르지 않아도 자동으로 저장돼요',1600)});
$('#cutlist').addEventListener('keydown',e=>{const t=e.target.closest('.cutin');if(!t)return;
  if(!mbox.hidden){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();mSel=(mSel+(e.key==='ArrowDown'?1:-1)+mList.length)%mList.length;showMbox()}
    else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();pickMention(mSel)}else if(e.key==='Escape'){mbox.hidden=true}return}
  if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();const i=+t.closest('li').dataset.i,n=CUTS.length;remapCuts(SCUR,()=>{cutEdits().splice(i+1,0,null);CUTS.splice(i+1,0,'');return moveMap(n,x=>x>i?x+1:x)});renderCuts();cutChanged();document.querySelectorAll('.cutin')[i+1]?.focus()}});
$('#cutlist').addEventListener('focusout',()=>setTimeout(()=>{mbox.hidden=true},150));
document.addEventListener('click',e=>{const a=e.target.closest('[data-act]')?.dataset.act;if(!a)return;
  if(a==='addcut'){CUTS.push('');renderCuts();saveCuts();const l=document.querySelectorAll('.cutin');l[l.length-1]?.focus()}
  if(a==='prose'){$('#prosein').value='';$('#pdlg2').showModal()}
  if(a==='prosecancel')$('#pdlg2').close();
  if(a==='prosego'){const c=RE.proseToCuts($('#prosein').value,engineChars()).filter(x=>x.trim());if(c.length){CUTS=c;SCENES[SCUR].pageEdits=[];renderCuts();cutChanged();toast(`${c.length}컷으로 나눴어요`)}$('#pdlg2').close()}});
// 넣기 도구막대: 마지막으로 쓰던 컷 칸의 커서 자리에 형식을 넣음
// 효과음 넣기: 그 컷 글 끝 새 줄에 -단어-
function addSfx(i,w){const ta=document.querySelector(`#cutlist li[data-i="${i}"] .cutin`);if(!ta)return;ta.value=ta.value.replace(/\s*$/,'')+`\n-${w}-`;ta.dispatchEvent(new Event('input',{bubbles:true}));toast(`효과음 「${w}」을 넣었어요`)}
$('#cutlist').addEventListener('mousedown',e=>{if(e.target.closest('[data-sfxadd]'))e.preventDefault()});
$('#cutlist').addEventListener('click',e=>{const b=e.target.closest('[data-sfxadd]');if(!b)return;addSfx(+b.dataset.i,b.dataset.sfxadd)});
// 효과음 고르기 창: 이 컷 추천 + 분류별 전체(615개) + 빈 효과음
function sfxPicker(btn,ta){let pop=$('#sfxpick');if(!pop){pop=document.createElement('div');pop.id='sfxpick';pop.className='sfxpick';document.body.appendChild(pop);
    document.addEventListener('mousedown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&!e.target.closest('[data-ins="sfx"]'))pop.hidden=true});
    pop.addEventListener('mousedown',e=>{if(e.target.closest('button'))e.preventDefault()});
    pop.addEventListener('input',e=>{if(e.target.id==='sfxq'){const q=e.target.value.trim();pop.querySelectorAll('.sp-cat').forEach(c=>{let n=0;c.querySelectorAll('[data-sfxw]').forEach(b=>{const ok=!q||b.dataset.sfxw.includes(q)||c.dataset.cat.includes(q);b.hidden=!ok;n+=ok});c.hidden=!n})}});
    pop.addEventListener('click',e=>{const b=e.target.closest('[data-sfxw],[data-sfxblank]');if(!b)return;const t=pop._ta;if(!t)return;
      if(b.dataset.sfxblank!=null){const a=t.selectionStart;t.value=t.value.slice(0,a)+' --'+t.value.slice(a);t.setSelectionRange(a+2,a+2);t.focus()}
      else{const i=+t.closest('li').dataset.i;addSfx(i,b.dataset.sfxw)}
      pop.hidden=true;t.dispatchEvent(new Event('input',{bubbles:true}))})}
  pop._ta=ta;const i=+ta.closest('li').dataset.i,emo=(state.panels||[]).find(p=>String(p.key||'').startsWith('#'+i+':'))?.emo,rec=RoughSfxRec.recommend(ta.value,emo,6);
  pop.innerHTML=`<div class="sp-top"><input id="sfxq" placeholder="효과음·분류 찾기 (예: 문, 두근, 비)" autocomplete="off"><button type="button" class="btn sm" data-sfxblank>빈 효과음</button></div>`+
    (rec.length?`<div class="sp-rec"><b>${i+1}컷 추천</b>${rec.map(r=>`<button type="button" data-sfxw="${esc(r.word)}" title="${esc(r.why)} 때문에">${esc(r.word)}<small>${esc(r.why)}</small></button>`).join('')}</div>`:'')+
    `<div class="sp-all">${RoughSfxRec.categories().map(([c,ws])=>`<div class="sp-cat" data-cat="${esc(c)}"><h6>${esc(c)}</h6>${ws.map(w=>`<button type="button" data-sfxw="${esc(w)}">${esc(w)}</button>`).join('')}</div>`).join('')}</div>`;
  pop.hidden=false;const r=btn.getBoundingClientRect();pop.style.left=Math.max(8,Math.min(innerWidth-428,r.left))+'px';pop.style.top=(r.bottom+6)+'px';setTimeout(()=>pop.querySelector('#sfxq')?.focus(),0)}
document.querySelector('.scins').addEventListener('mousedown',e=>{if(e.target.closest('[data-ins]'))e.preventDefault()});
document.querySelector('.scins').addEventListener('click',e=>{const b=e.target.closest('[data-ins]');if(!b)return;
  let t=TA&&document.body.contains(TA)?TA:null;if(!t){const l=document.querySelectorAll('.cutin');t=l[l.length-1]}if(!t)return;t.focus();
  if(b.dataset.ins==='sfx'&&window.RoughSfxRec&&t.selectionStart===t.selectionEnd){RoughSfxRec.ready().then(()=>sfxPicker(b,t));return}
  const a=t.selectionStart,z=t.selectionEnd,sel=t.value.slice(a,z),k=b.dataset.ins;const nl=a>0&&t.value[a-1]!=='\n'?'\n':'';
  const [pre,post]=k==='caption'?[nl+'[',']']:k==='sfx'?[' -','- ']:[nl+'@',''];
  t.value=t.value.slice(0,a)+pre+sel+post+t.value.slice(z);const c=a+pre.length+sel.length;t.setSelectionRange(c,c);TA=t;
  t.dispatchEvent(new Event('input',{bubbles:true}))});
// 연출 넣기 메뉴: 누르면 지금 줄 끝에 {…}. 같은 줄에 이미 {…}가 있으면 그 안에 쉼표로 이어 붙임
const DIR_MENU=[['샷',['설정','전경','전신','중경','클로즈업','디테일','효과 배경']],['앵글',['아이레벨','하이앵글','로우앵글','탑뷰']],
  ['NovelAI 초점',Object.keys(window.RoughNAI.FOCUS)],
  ['칸 길이·간격',['짧게','길게','아주 길게','붙임','쉼','큰 쉼','하이라이트']],['그림',['확대 1.5','확대 2','집중선','집중선 진하게','속도선 가로','속도선 위로']],
  ['배경',['배경 검정','배경 흰색','배경 노을',...PAGE_BACKGROUNDS.filter(Boolean).map(b=>'배경 '+b.name),'씬 끝 흰색','씬 끝 유지']],['말풍선',['속삭임','외침','생각','전화','분노','숨','떨림','의미심장']]];
{const btn=document.querySelector('[data-dirmenu]'),pop=document.createElement('div');pop.className='dirpop';pop.hidden=true;pop.setAttribute('role','menu');
  pop.innerHTML=DIR_MENU.map(([h,xs])=>`<div class="dirg"><b>${h}</b><div>${xs.map(x=>`<button type="button" role="menuitem" data-dir="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`).join('')+'<p class="hint">말풍선 모양은 대사 줄에 넣으면 그 대사만, 다른 줄에 넣으면 컷의 모든 대사에. 대사 메모 (속삭이며)도 알아들어요.</p><div class="dirfoot"><button type="button" class="btn sm" data-dirguide>문법 전체 보기</button><button type="button" class="btn sm" data-dircopy title="ChatGPT·Claude 등에 붙여 넣으면 이 문법으로 씬을 써 줘요">AI용 문법 설명 복사</button></div>';
  document.body.appendChild(pop);const close=()=>{pop.hidden=true;btn.setAttribute('aria-expanded','false')};
  btn.addEventListener('mousedown',e=>e.preventDefault());
  btn.addEventListener('click',()=>{if(!pop.hidden){close();return}const r=btn.getBoundingClientRect();pop.hidden=false;pop.style.top=r.bottom+6+'px';pop.style.left=Math.max(8,Math.min(innerWidth-pop.offsetWidth-8,r.left))+'px';btn.setAttribute('aria-expanded','true')});
  pop.addEventListener('mousedown',e=>e.preventDefault());
  pop.addEventListener('click',e=>{if(e.target.closest('[data-dircopy]')){copyText(RoughGrammar.GUIDE+'\n\n위 문법으로 웹툰 씬을 컷 단위로 써 줘. 컷마다 행동 묘사 한 줄 + 필요하면 대사·나레이션·효과음 줄, 연출 지시 {…}는 의도가 분명한 곳에만.');close();return}
    if(e.target.closest('[data-dirguide]')){close();openGrammarGuide();return}
    const b=e.target.closest('[data-dir]');if(!b)return;let t=TA&&document.body.contains(TA)?TA:null;if(!t){const l=document.querySelectorAll('.cutin');t=l[l.length-1]}if(!t)return;t.focus();
    const v=t.value,a=t.selectionStart,ls=v.lastIndexOf('\n',a-1)+1,le=(v.indexOf('\n',a)+1||v.length+1)-1,ln=v.slice(ls,le),tok=b.dataset.dir;
    const m=ln.match(/\{([^{}]*)\}\s*$/);const nl=m?ln.slice(0,m.index)+`{${m[1].trim()}, ${tok}}`:(ln.trim()?ln.replace(/\s*$/,'')+' ':'')+`{${tok}}`;
    t.value=v.slice(0,ls)+nl+v.slice(le);const c=ls+nl.length;t.setSelectionRange(c,c);TA=t;t.dispatchEvent(new Event('input',{bubbles:true}));if(!e.shiftKey)close()});
  document.addEventListener('click',e=>{if(!pop.hidden&&!e.target.closest('.dirpop,[data-dirmenu]'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden)close()})}
function openGrammarGuide(){let d=$('#gramdlg');if(!d){d=document.createElement('dialog');d.id='gramdlg';d.className='keydlg gramdlg';document.body.appendChild(d)}
  d.innerHTML=`<h3>씬 문법</h3><pre>${esc(RoughGrammar.GUIDE)}</pre><div class="acts"><button class="btn" data-g="copy">AI용으로 복사</button><button class="btn dark" data-g="x">닫기</button></div>`;
  d.onclick=e=>{const k=e.target.closest('[data-g]')?.dataset.g;if(k==='copy')copyText(RoughGrammar.GUIDE);if(k==='x')d.close()};d.showModal()}
// 컷 번호를 끌어서 순서 바꾸기
{const L=$('#cutlist');let from=-1;
  L.addEventListener('mousedown',e=>{const n=e.target.closest('.cn');if(n)n.closest('li').draggable=true});
  L.addEventListener('dragstart',e=>{const li=e.target.closest('li');if(!li)return;from=+li.dataset.i;li.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(from))});
  L.addEventListener('dragover',e=>{const li=e.target.closest('li');if(from<0||!li)return;e.preventDefault();L.querySelectorAll('.dropbefore').forEach(x=>x.classList.remove('dropbefore'));li.classList.add('dropbefore')});
  L.addEventListener('dragend',()=>{from=-1;L.querySelectorAll('li').forEach(x=>{x.draggable=false;x.classList.remove('dragging','dropbefore')})});
  L.addEventListener('drop',e=>{const li=e.target.closest('li');if(from<0||!li)return;e.preventDefault();let to=+li.dataset.i;if(to===from)return;
    const edits=cutEdits(),n=CUTS.length,f=from;if(to>f)to--;remapCuts(SCUR,()=>{const ord=[...Array(n).keys()];ord.splice(f,1);ord.splice(to,0,f);const [c]=CUTS.splice(f,1),[ed]=edits.splice(f,1);CUTS.splice(to,0,c);edits.splice(to,0,ed);return Object.fromEntries(ord.map((o,k)=>[o,k]))});from=-1;renderCuts();cutChanged();toast('컷 순서를 바꿨어요')});}
renderCuts();renderChars();renderSceneList();
mbox.addEventListener('mousedown',e=>{const b=e.target.closest('[data-mi]');if(b){e.preventDefault();pickMention(+b.dataset.mi)}});
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
// 러프 툴 본체 6/6 — 보기 전환·프롬프트 시안·작화·데이터베이스·시작
// 원본 조각: tools/build_app.py가 6개를 순서대로 이어 rough/app.js를 만듦(사이트는 app.js 하나를 실음 — 조각끼리 불러올 때 서로 부르는 곳이 많아 따로 싣지 않음)
// ---------- 보기 전환 ----------
let VIEW='nai';
function showView(v){if(v==='nai')v='layout';
  // 설정집 = 캐릭터 + 세계관(하위 탭). 상단 탭은 마지막으로 본 쪽을 엶
  if(v==='setbook'){try{v=localStorage.getItem('rough-setbook-sub')||'chars'}catch(_){v='chars'}}if(v==='chars'||v==='world'){try{localStorage.setItem('rough-setbook-sub',v)}catch(_){}}  // 작화는 콘티에 합침(예전 주소·저장된 화면 호환)
  if(!['chars','world','plan','write','layout','nai','webtoon','db'].includes(v))v='write';VIEW=v;document.querySelectorAll('.topnav [data-view]').forEach(b=>b.setAttribute('aria-selected',b.dataset.view===v||(b.dataset.view==='setbook'&&(v==='chars'||v==='world'))));
  ['chars','world','plan','write','layout','nai','webtoon','db'].forEach(k=>$('#v-'+k).hidden=k!==v);
  if(v==='chars'){renderChars();renderLib()}if(v==='world')renderWorld();
  // 숨겨진 채 그려진 컷 글 칸은 높이가 0으로 잡혀 글이 안 보임 → 보일 때 다시 맞춤
  // 편집·콘티에서 바꾼 내용(지운 식자·컷·씬, 제목)을 씬 화면에 다시 반영 — 화면끼리 같은 원고를 봄
  if(v==='write'){if(SCUR>=SCENES.length)SCUR=Math.max(0,SCENES.length-1);CUTS=SCENES[SCUR].cuts;const t=$('#sctitle');if(document.activeElement!==t)t.value=SCENES[SCUR].title||'';
    try{renderCuts();renderSceneList();compute(false);renderSlots();renderSugg()}catch(e){console.warn(e)}}
  if(v==='write')requestAnimationFrame(()=>document.querySelectorAll('.cutin').forEach(grow));
  $('#gscbar').hidden=!['write','layout','nai','webtoon'].includes(v);$('#gDb').setAttribute('aria-pressed',v==='db');
  if(v==='webtoon'){renderWebtoon();edSnap=edState();edButtons();refreshPageMaterials()}
  if(v==='webtoon'&&matchMedia('(max-width:760px)').matches&&window.RoughStudio?.fitWidth)requestAnimationFrame(()=>RoughStudio.fitWidth());
  if(v==='write'||v==='layout'){edSnap=edState();edButtons()}$('#gundo').hidden=!(v==='write'||v==='layout');
  if(v!=='webtoon'&&materialMode)armMaterialLine('');
  if(v==='plan')openComposition();
  if(v==='layout')renderNai();if(v==='db')loadDB();
  scrollTo(0,0);try{localStorage.setItem('rough-view',v)}catch(_){}}
let compositionModule;
function openComposition(){
  if(compositionModule)return;
  compositionModule=Promise.all([import('./composition-ui.js'),import('./claude.js')]).then(([ui,claude])=>{
    ui.mountComposition($('#v-plan'),{
      getKey:()=>AIKEY,
      requestKey:callback=>openKey(callback),
      addScenes:addCompositionScenes,
      getStory:()=>({world:worldBrief(),lore:LORE.map(({name,keys,desc})=>({name,keywords:keys,desc})),
        cast:CHARS.map(({name,aliases,look})=>({name,aliases,look}))}),
      request:claude.requestComposition,
      reportError:claude.explain,
      onDraft:(draft,status)=>suggestEntities(draft,status,claude),
    });
  }).catch(()=>{
    compositionModule=null;
    $('#plan-status').textContent='구성 화면을 불러오지 못했어요. 탭을 다시 열어 주세요.';
  });
}
function addCompositionScenes(cards){
  const added=cards.filter(card=>!SCENES.some(scene=>scene.compositionId===card.id));
  if(!added.length){toast('이 구성안의 씬은 이미 추가했어요');return}
  const scenes=added.map(card=>({id:'s'+crypto.randomUUID(),compositionId:card.id,
    title:card.title.trim(),cuts:card.cuts.slice(),pageEdits:[]}));
  const first=SCENES.length;
  SCENES.push(...scenes);saveScenes();  // 붙인 뒤 저장(전에는 저장이 먼저라 새 씬이 다음 저장까지 안 남았음)
  switchScene(first);
  showView('write');
  toast(`구성안에서 ${scenes.length}개 씬을 추가했어요 · 왼쪽 씬 목록에서 골라 다듬어요`,2600);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)showView(b.dataset.view)});
{const _c=compute;compute=function(...a){_c(...a);if(VIEW==='layout')renderNai();else if(VIEW==='webtoon')renderWebtoon()}}
{const _r=renderSlots;renderSlots=function(...a){_r(...a);if(VIEW==='layout'){renderNai();renderTable()}else if(VIEW==='webtoon'&&!pageDrag&&!gapDrag&&!tailDrag)renderWebtoon()}}

// ---------- 프롬프트 시안 ----------
function copyText(t){navigator.clipboard?.writeText(t).then(()=>toast('프롬프트를 복사했어요'),()=>toast('복사가 막혀 있어요. 글을 직접 선택해 복사하세요'))}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(a==='aikeyopen')openKey(null);
  else if(a==='nairefine')confirmRefine()
  else if(a==='keycancel')closeKey();
  else if(a==='keydel'){setKey('',null);closeKey();toast('키를 지웠어요')}
  else if(a==='keyshow'){const i=$('#kin'),show=i.type==='password';i.type=show?'text':'password';el.textContent=show?'숨기기':'보기';el.setAttribute('aria-pressed',show)}});
$('#filem').addEventListener('change',e=>{attachCuts(e.target.files,target&&target.kind==='cut'?+target.key:null);e.target.value=''});
renderKey();
const rerenderCuts=()=>{renderNai();if(VIEW==='layout'){renderTable();renderReading()}if(typeof edRecord==='function')edRecord()};
for(const el of [$('#ncards'),$('#tbl'),$('#conti')]){
  el.addEventListener('click',e=>{const d=e.target.closest('[data-delcut]');if(d){e.stopPropagation();const id=cutId(SCENES[SCUR].id,+d.dataset.delcut);delete IMG.cut[id];idb.del(id);rerenderCuts();return}
    const s=e.target.closest('[data-cutslot]');if(s){target={kind:'cut',key:s.dataset.cutslot};$('#filem').click()}});
  el.addEventListener('keydown',e=>{const s=e.target.closest('[data-cutslot]');if(s&&(e.key==='Enter'||e.key===' ')){e.preventDefault();s.click()}});
  el.addEventListener('focusin',e=>{const s=e.target.closest('[data-cutslot]');if(s)target={kind:'cut',key:s.dataset.cutslot}});
  el.addEventListener('dragover',e=>{const s=e.target.closest('[data-cutslot]');if(s){e.preventDefault();s.classList.add('over')}});
  el.addEventListener('dragleave',e=>{e.target.closest('[data-cutslot]')?.classList.remove('over')});
  el.addEventListener('drop',e=>{const s=e.target.closest('[data-cutslot]');if(!s)return;e.preventDefault();s.classList.remove('over');attachCuts(e.dataTransfer.files,+s.dataset.cutslot)})}
// ---------- 작화 (NovelAI V4.5) ----------
const NAI=window.RoughNAI;
const NAI_STYLE_DEF='webtoon, korean webtoon, soft shading, flat color, thin lineart, muted colors, watercolor (medium)';
let NAISTYLE=NAI_STYLE_DEF;
try{NAISTYLE=localStorage.getItem('rough-nai-style')||NAI_STYLE_DEF}catch(_){}
function naiChars(){return CHARS.filter(c=>c.name.trim()).map(c=>({name:c.name.trim(),aliases:String(c.aliases||'').split(/[,·]/).map(a=>a.trim()).filter(Boolean),body:c.body||'female',look:c.look||''}))}
function naiRuleCuts(){const ps=state.panels,chars=naiChars(),sc=ps.length?sceneFor(ps[0]):null;
  const ctx={chars,style:NAISTYLE,tags:NAITAGS,refs:{char:n=>!!IMG.char[n],scene:!!sc},worldTags:WORLD.tags||'',loreTags:p=>loreHits(p.act||'').flatMap(e=>loreTagList(e))};return ps.map((p,i)=>({p,i,o:NAI.cut(p,i,ps,ctx)}))}
// Claude 다듬기(NovelAI): 결과는 씬별로 입력 서명과 함께 저장, 기본/Claude 전환
let NAIVIEW='ai',AIN={};try{AIN=JSON.parse(localStorage.getItem('rough-ai-nai')||'{}')}catch(_){}
function naiPayload(){const L=naiRuleCuts(),chars=naiChars();
  const sceneText=L.map(({p})=>[p.act,p.caption,...(p.dialogs||[]).map(d=>d.text)].join(' ')).join(' ');
  return{format:2,title:SCENES[SCUR].title||'',world:worldBrief(),lore:loreHits(sceneText).map(e=>({name:e.name,category:LORE_CAT[e.cat]?.[0]||e.cat,keywords:e.keys||'',description:(e.desc||'').slice(0,600),tags:loreTagList(e).join(', ')})),style:NAISTYLE,chars:chars.filter(c=>L.some(({o})=>o.chars.some(x=>x.name===c.name))).map(c=>({name:c.name,gender:c.body==='male'?'male':'female',tags:NAITAGS[c.name]??NAI.lookTags(c.look).join(', '),look:c.look})),
    cuts:L.map(({p,i,o})=>{const a=state.an[p.chunk];return{n:i+1,size:`${o.size.w}x${o.size.h}`,focus:o.mode,shot:p.shot,angle:p.ang,emotion:p.emo,intensity:p.i,peak:p.vng==='P',role:p.vng+' '+(p.role||''),trans:p.trans||'',gapAfter:RP.gapTag(p.gap??0.3),who:p.who||'',action:p.act,
      dialogs:(p.dialogs||[]).map(d=>({who:d.who||'',note:d.note||'',text:d.text})),caption:p.caption||'',sfx:p.sfx||[],story:a?`${narrLabel(a.narr)} · ${a.goal}`:'',draft:{base:o.base,chars:o.chars.map(c=>({name:c.name,cell:c.pos.cell,prompt:c.prompt}))}}})}}
function ainFor(){const r=AIN[SCENES[SCUR].id];if(!r||!state.panels.length)return null;return{...r,stale:r.sig!==sigOf(naiPayload())}}
function naiCuts(){const L=naiRuleCuts(),ai=NAIVIEW==='ai'&&ainFor();if(!ai||ai.stale)return L;
  const byCut=new Map(ai.cuts.map(c=>[c.n,c]));
  return L.map(x=>({...x,o:NAI.refine(x.o,byCut.get(x.i+1))}))}
let naiBusy=false,NAI_MSG='',NAI_ERR=false,NAI_DONE=0;
// 컷 프롬프트 생성 상태: 콘티 머리의 버튼·상태 글자에 바로 보임(생성 중 → 생성 완료 4초 → 원래대로). 실패하면 빨간 글자로 이유
function naiBtnSync(){const done=!naiBusy&&NAI_DONE&&Date.now()-NAI_DONE<4000;
  document.querySelectorAll('[data-act="nairefine"]').forEach(b=>{b.disabled=naiBusy;b.classList.toggle('busy',naiBusy);b.classList.toggle('done',!!done);b.setAttribute('aria-busy',naiBusy?'true':'false');
    b.innerHTML=naiBusy?'<i class="spin" aria-hidden="true"></i>생성 중…':done?'✓ 생성 완료':'컷 프롬프트 생성'});
  document.querySelectorAll('.ct-naist').forEach(x=>{x.textContent=NAI_MSG;x.classList.toggle('err',NAI_ERR)})}
// 작화 설정 값의 출처: 자동(외형 규칙)·생성(Claude)·직접(작가가 고침)
var ARTGEN;try{ARTGEN=JSON.parse(localStorage.getItem('rough-art-gen')||'{}')}catch(_){ARTGEN={}}ARTGEN.chars||={};
function artSrc(name,v){if(NAITAGS[name]==null)return '자동';if(ARTGEN.chars[name]===v)return '생성';return ''}
let artBusy=false;
async function artGen(){if(artBusy)return;const chars=naiChars().filter(c=>!/^(나|너|모두|사람들)$/.test(c.name));
  if(!chars.length&&!worldBrief()?.name){toast('캐릭터나 세계관을 먼저 적어 주세요');return}
  if(!AIKEY){openKey(artGen);return}
  const st=t=>{const e=$('#artst');if(e)e.textContent=t};artBusy=true;const btn=document.querySelector('[data-act="artgen"]');if(btn)btn.disabled=true;
  const payload={world:worldBrief(),style:NAISTYLE===NAI_STYLE_DEF?'':NAISTYLE,chars:chars.map(c=>({name:c.name,gender:c.body==='male'?'male':'female',look:c.look||'',tags:NAITAGS[c.name]??NAI.lookTags(c.look).join(', ')}))};
  let mod;try{mod=await import('./claude.js');const r=await mod.genArt(AIKEY,payload,{onStatus:st});st('');artCompare(r,chars)}
  catch(err){console.error(err?.status||err?.name||'error');const m=mod?mod.explain(err):'Claude 모듈을 불러오지 못했어요';st(m);if(err?.status===401){setKey('',null);openKey(artGen,m)}}
  finally{artBusy=false;if(btn)btn.disabled=false}}
// 바로 덮어쓰지 않고 지금/제안을 나란히: 작가가 직접 고친 값은 기본으로 체크 해제
function artCompare(r,chars){let d=$('#artdlg');if(!d){d=document.createElement('dialog');d.id='artdlg';d.className='keydlg artdlg';document.body.appendChild(d)}
  const rows=[{k:'style',name:'화풍 태그',cur:NAISTYLE,next:(r.style||'').trim(),on:NAISTYLE===NAI_STYLE_DEF||ARTGEN.style===NAISTYLE}];
  for(const x of r.chars||[]){const c=chars.find(c=>c.name===x.name);if(!c)continue;const cur=NAITAGS[c.name]??NAI.lookTags(c.look).join(', ');rows.push({k:'c:'+c.name,name:c.name,cur,next:(x.tags||'').trim(),on:artSrc(c.name,cur)!==''})}
  d.innerHTML=`<h3>작화 프롬프트 제안</h3><p>체크한 것만 바꿔요. 직접 고친 값은 체크를 풀어 두었어요.</p><div class="artcmp">${rows.map((x,n)=>`<label class="artrow"><input type="checkbox" data-n="${n}"${x.on&&x.next&&x.next!==x.cur?' checked':''}${!x.next||x.next===x.cur?' disabled':''}><b>${esc(x.name)}</b><span class="was">${esc(x.cur||'(비어 있음)')}</span><span class="now">${esc(x.next||'(제안 없음)')}</span></label>`).join('')}</div><div class="btnrow"><button class="btn" data-r="no">취소</button><button class="btn dark" data-r="go">적용</button></div>`;
  d.onclick=e=>{const k=e.target.closest('[data-r]')?.dataset.r;if(!k)return;
    if(k==='go'){let n=0;d.querySelectorAll('input[data-n]:checked').forEach(i=>{const x=rows[+i.dataset.n];n++;
        if(x.k==='style'){NAISTYLE=x.next;ARTGEN.style=x.next;try{localStorage.setItem('rough-nai-style',NAISTYLE)}catch(_){}}
        else{const nm=x.k.slice(2);NAITAGS[nm]=x.next;ARTGEN.chars[nm]=x.next}});
      saveNaiTags();try{localStorage.setItem('rough-art-gen',JSON.stringify(ARTGEN))}catch(_){}$('#naistyle').value=NAISTYLE;renderNai();toast(n?`작화 프롬프트 ${n}개를 바꿨어요 · 컷 프롬프트 생성을 다시 누르면 컷에도 반영돼요`:'바꾼 것이 없어요',2600)}
    d.close()};d.showModal()}
async function naiRefine(){if(naiBusy)return;if(!state.panels.length){toast('컷이 없어요');return}
  if(!AIKEY){openKey(naiRefine);return}const st=t=>{$('#naist').textContent=t;NAI_MSG=t;naiBtnSync()};naiBusy=true;NAI_ERR=false;NAI_DONE=0;$('#naibtn').disabled=true;st('Claude에 보내는 중… 컷이 많으면 1분 안팎 걸려요');const sid=SCENES[SCUR].id,payload=naiPayload();
  let mod;try{mod=await import('./claude.js');const r=await mod.refineNai(AIKEY,payload,{onStatus:st});
    AIN[sid]={sig:sigOf(payload),cuts:r.cuts,model:r.model,at:Date.now()};try{localStorage.setItem('rough-ai-nai',JSON.stringify(AIN))}catch(_){}
    NAIVIEW='ai';naiBusy=false;NAI_DONE=Date.now();st(`컷 ${r.cuts?.length||''}개 프롬프트를 만들었어요 · ${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`);setTimeout(naiBtnSync,4100);toast('컷 프롬프트를 만들었어요 · 카드마다 바뀐 프롬프트를 확인해 주세요',2600);if(SCENES[SCUR].id===sid&&VIEW==='layout'){renderNai();renderTable()}}
  catch(err){console.error(err?.status||err?.name||'error');const m=mod?mod.explain(err):'Claude 모듈을 불러오지 못했어요';naiBusy=false;NAI_ERR=true;st('생성하지 못했어요 · '+m);if(err?.status===401){setKey('',null);openKey(naiRefine,m)}}finally{naiBusy=false;$('#naibtn').disabled=false;naiBtnSync()}}
$('#naiview').addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;NAIVIEW=b.dataset.v;renderNai()});
// 전체 복사: 기본 프롬프트와 캐릭터 프롬프트만, 각 줄 끝에 쉼표, 빈 줄로 구분
// 같은 태그가 두 번 들어가면(예: 1girl, 1girl) 한 번만
const tagDedup=t=>{const seen=new Set();return String(t).split(',').map(x=>x.trim()).filter(x=>x&&!seen.has(x.toLowerCase())&&seen.add(x.toLowerCase())).join(', ')};
const naiCopy=o=>[o.base,...o.chars.map(c=>c.prompt)].map(t=>tagDedup(t)+',').join('\n\n');
// 저장: 설명 없이 프롬프트만(컷 하나 = 기본 + 인물 프롬프트를 빈 줄로, 컷 사이는 빈 줄 두 개)
function naiText(){return naiCuts().map(({o})=>naiCopy(o)).join('\n\n\n')+'\n'}
function renderNai(){if(VIEW==='layout')setTimeout(renderConti);$('#naistyle').value!==NAISTYLE&&document.activeElement!==$('#naistyle')&&($('#naistyle').value=NAISTYLE);
  const chars=naiChars().filter(c=>!/^(나|너|모두|사람들)$/.test(c.name));
  $('#naichars').innerHTML=chars.length?chars.map(c=>{const v=NAITAGS[c.name]??NAI.lookTags(c.look).join(', '),src=artSrc(c.name,v),im=IMG.char[c.name];
    return `<div class="naichar"><span class="av" style="${im?'':`background:${avBg(c.name)}`}">${im?`<img src="${im.src}" alt="">`:esc(c.name.slice(0,1))}</span><b>${esc(c.name)}${src?`<em class="art-src${src==='자동'?' auto':''}">${src}</em>`:''}</b><input data-naitag="${esc(c.name)}" value="${esc(v)}" spellcheck="false" aria-label="${esc(c.name)} 태그" placeholder="예: 1girl, brown hair, ponytail, maid"><button class="link" data-act="naireset" data-n="${esc(c.name)}" title="외형 글에서 규칙으로 다시 만들기">외형에서 다시</button></div>`}).join(''):'<p class="empty">캐릭터 페이지에 인물을 넣어주세요.</p>';
  {const e=$('#artstylesrc');if(e){const t=NAISTYLE===NAI_STYLE_DEF?'기본':ARTGEN.style===NAISTYLE?'생성':'';e.textContent=t;e.className='art-src'+(t==='기본'?' auto':'')}}
  const ps=state.panels,sc=ps.length?sceneFor(ps[0]):null;
  $('#nairefs').innerHTML=chars.map(c=>`<span class="${IMG.char[c.name]?'on':'off'}">${IMG.char[c.name]?'●':'○'} ${esc(c.name)} 캐릭터 이미지 ${IMG.char[c.name]?'있음 → Character Reference':'없음'}</span>`).join('')+`<span class="${sc?'on':'off'}">${sc?'●':'○'} 장면 이미지 ${sc?'있음 → Vibe Transfer':'없음'}</span><button class="btn" data-view="write">씬에서 이미지 등록</button>`;
  const ai=ainFor();$('#naiview').hidden=!ai;document.querySelectorAll('#naiview button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===NAIVIEW));
  if(ai&&!naiBusy)$('#naist').textContent=ai.stale?'현재 초안을 표시해요. Claude로 다시 다듬을 수 있어요':`다듬은 결과 · ${new Date(ai.at).toLocaleString()}`;
  if(!ps.length){$('#ncards').innerHTML='<p class="empty">씬 단계에서 컷을 적어주세요.</p>';$('#naicount').textContent='';return}
  $('#naicount').textContent=`이미지 ${cutCount(SCUR,ps)}/${ps.length}`;if($('#naistat2'))$('#naistat2').textContent=`이미지 ${cutCount(SCUR,ps)}/${ps.length}`;
  const blk=(t,sub,txt)=>`<div class="nf"><header><h4>${t}</h4><button class="btn" data-act="ncopy">복사</button></header><pre>${esc(txt)}</pre></div>`;
  $('#ncards').innerHTML=naiCuts().map(({p,i,o})=>{const im=cutImg(SCUR,i,p),S=o.settings;
    return naiCardC(p,i,o,im,blk);
  }).join('')}
// 콘티 = 컷마다 [그림 넣기 | NovelAI 프롬프트]. 그 밖의 연출 설정·전체 미리보기는 이 화면에서 뺌(연출은 씬 글 {…}로)
// 콘티 작업 상태: 그림 없는 컷만 보기 · 복사한 컷(붙여 넣기 대상) · 지금 컷(J/K)
let CT_EMPTY=false,CT_CUR=-1;const CT_COPIED=new Set();
// 프롬프트 칸: 모든 컷에 똑같이 붙는 화풍 태그는 흐리게(복사에는 그대로 들어감)
// 프롬프트 칸: 모든 컷에 똑같이 붙는 화풍 태그는 흐리게(복사에는 그대로 들어감)
function ctBlk(title,txt,dim){const tags=String(txt||'').split(/,\s*/);
  const html=tags.map((t,k)=>{const sep=k<tags.length-1?', ':'';return dim&&dim.has(t.trim().toLowerCase())?`<span class="ct-dim">${esc(t)}${sep}</span>`:esc(t)+sep}).join('');
  return `<div class="nf"><header><h4>${title}</h4><button class="btn" data-act="ncopy">복사</button></header><pre>${html}</pre></div>`}
function renderConti(){const el=$('#conti');if(!el)return;const ps=state.panels,sc=SCENES[SCUR];
  if(!ps.length){el.innerHTML='<p class="empty">씬 단계에서 컷을 적어주세요.</p>';return}
  const L=naiCuts(),done=cutCount(SCUR,ps),ai=ainFor(),dim=new Set(String(NAISTYLE||'').split(',').map(t=>t.trim().toLowerCase()).filter(Boolean));
  const has=L.map(({p,i})=>!!cutImg(SCUR,i,p));
  const n=ps.length,pct=Math.round(done/n*100);
  // 버튼: 작화 프롬프트 생성(작화 설정 카드) · 컷 프롬프트 생성(여기). 여러 장 넣기는 그림 칸에 여러 장 끌어다 놓기로
  const head=`<div class="ct-head"><div class="ct-hrow"><h2 data-work>${esc(sc.title||'제목 없는 씬')}</h2><span class="grow"></span><button class="link" data-act="naidown" title="이 씬 모든 컷 프롬프트를 txt로">프롬프트 저장</button><button class="tpill" data-act="nairefine">컷 프롬프트 생성</button></div><p class="ct-naist" aria-live="polite"></p>${NAISTYLE===NAI_STYLE_DEF&&!Object.keys(ARTGEN.chars).length?'<p class="ct-hint">작화 프롬프트를 먼저 만들면 컷마다 화풍이 맞춰져요</p>':''}
    <p class="ct-sub">${done===n?'모든 컷에 그림을 넣었어요':done?`그림 ${n-done}장만 더 넣으면 돼요`:'컷마다 프롬프트를 복사해 그림을 만들고 넣어 주세요'}${ai?(ai.stale?' · <span class="ct-warn">현재 초안을 표시 중이에요 · 컷 프롬프트를 다시 생성할 수 있어요</span>':' · 생성한 컷 프롬프트예요'):''}</p>
    <div class="ct-progw"><div class="ct-prog" role="progressbar" aria-label="그림 넣은 컷" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}"><i style="width:${pct}%"></i></div><span>${done}/${n}</span></div>
</div>
    <nav class="ct-nav" aria-label="컷 이동"><div class="ct-dots">${L.map(({i})=>`<button type="button" class="ct-dot${has[i]?' on':''}${i===CT_CUR?' cur':''}" data-ctgo="${i}" title="${i+1}번 컷 · ${has[i]?'그림 있음':'그림 없음'}">${has[i]?'✓':i+1}</button>`).join('')}</div>
      <label class="ct-filter"><span>빈 컷만</span><input type="checkbox" role="switch" data-ctempty${CT_EMPTY?' checked':''}><i aria-hidden="true"></i></label>
      <span class="ct-keys" title="J·K 다음·이전 컷 · C 지금 컷 프롬프트 복사 · Ctrl+V 복사한 컷에 그림 붙여 넣기"><span><kbd>J</kbd><kbd>K</kbd>이동</span><span><kbd>C</kbd>복사</span><span><kbd>Ctrl</kbd><kbd>V</kbd>붙여 넣기</span></span></nav>`;
  el.innerHTML=head+L.map(({p,i,o})=>{const im=cutImg(SCUR,i,p),ref=p.ref;
    return `<article class="ccard${CT_COPIED.has(i)?' copied':''}${i===CT_CUR?' cur':''}" data-ct="${i}"${CT_EMPTY&&im?' hidden':''}>
      <header><b class="ct-no">컷 ${i+1}</b><div class="ct-beat"><p data-work>${esc(p.act)}</p><small>${esc([o.focus,p.shot,p.ang,p.emo].filter(Boolean).join(' · '))} · ${o.size.w}×${o.size.h}${o.size.exact?'':` <span class="ct-crop" title="생성 후 ${esc(o.size.crop)}">자르기</span>`}</small></div>${o.ai?'<span class="tag">Claude</span>':''}<button type="button" class="ct-del" data-ctdel="${i}" title="이 컷을 씬에서 지워요 · 씬·편집에도 반영 · Ctrl+Z로 되돌리기" aria-label="${i+1}번 컷 지우기">지우기</button></header>
      <div class="ct-body">
        <div class="ct-art"><div class="drop ct-drop${im?' has':''}" style="aspect-ratio:${o.size.w}/${o.size.h}" tabindex="0" role="button" data-cutslot="${i}" aria-label="${i+1}번 컷 그림 ${im?'바꾸기':'넣기'}">${im?`<img src="${im.src}" alt="${i+1}번 컷"><span class="ct-swap" aria-hidden="true">그림 바꾸기</span><button class="x" data-delcut="${i}" aria-label="${i+1}번 컷 그림 빼기">×</button>`:`${ref?`<img class="ct-ref" src="${ref.thumb||ref.src}" alt="">`:''}<span class="ct-plus"><b>+</b>그림 넣기<small>${CT_COPIED.has(i)?'Ctrl+V로 붙여 넣기':'끌어다 놓아도 돼요'}</small></span>`}</div></div>
        <div class="ct-prompt"><div class="ct-ph"><span>NovelAI 프롬프트</span><button class="tpill${CT_COPIED.has(i)?' done':''}" data-act="ncopyall" data-i="${i}">${CT_COPIED.has(i)?'✓ 복사했어요':'프롬프트 복사'}</button></div>
          ${ctBlk('기본 프롬프트',o.base,dim)}${o.chars.map((c,n)=>ctBlk(`캐릭터 ${n+1} · ${esc(c.name)} <small>위치 ${c.pos.cell}</small>`,c.prompt,dim)).join('')}</div>
      </div></article>`}).join('')+(CT_EMPTY&&done===ps.length?'<p class="empty ct-alldone">모든 컷에 그림이 있어요</p>':'')}
function ctGo(i,smooth=true){const L=state.panels.length;if(!L)return;i=Math.max(0,Math.min(L-1,i));CT_CUR=i;
  $('#conti').querySelectorAll('.ccard').forEach(c=>c.classList.toggle('cur',+c.dataset.ct===i));$('#conti').querySelectorAll('.ct-dot').forEach(d=>d.classList.toggle('cur',+d.dataset.ctgo===i));
  const c=$('#conti').querySelector(`.ccard[data-ct="${i}"]`);if(c&&!c.hidden)c.scrollIntoView({block:'start',behavior:smooth?'smooth':'auto'})}
{const el=$('#conti');
  el.addEventListener('click',e=>{const x=e.target.closest('[data-ctdel]');if(x){e.stopPropagation();contiDelete(+x.dataset.ctdel);return}});
  el.addEventListener('click',e=>{const d=e.target.closest('[data-ctgo]');if(d){if(CT_EMPTY&&$('#conti').querySelector(`.ccard[data-ct="${d.dataset.ctgo}"]`)?.hidden){CT_EMPTY=false;renderConti()}ctGo(+d.dataset.ctgo);return}
    const c=e.target.closest('.ccard');if(c){CT_CUR=+c.dataset.ct;el.querySelectorAll('.ct-dot').forEach(x=>x.classList.toggle('cur',+x.dataset.ctgo===CT_CUR));el.querySelectorAll('.ccard').forEach(x=>x.classList.toggle('cur',x===c))}
    const a=e.target.closest('[data-act="ncopyall"]');if(a){const i=+a.dataset.i;CT_COPIED.add(i);CT_CUR=i;target={kind:'cut',key:String(i)};setTimeout(renderConti,0);toast(`${i+1}번 컷 프롬프트를 복사했어요 · 생성한 그림을 Ctrl+V로 붙여 넣으면 이 컷에 들어가요`,2600)}});
  el.addEventListener('change',e=>{if(e.target.matches('[data-ctempty]')){CT_EMPTY=e.target.checked;renderConti()}});
  document.addEventListener('keydown',e=>{if(VIEW!=='layout'||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;if(t.closest&&t.closest('input,textarea,select,[contenteditable],dialog'))return;if(!$('#naidrawer')?.hidden)return;
    const k=e.key.toLowerCase(),vis=[...$('#conti').querySelectorAll('.ccard:not([hidden])')].map(c=>+c.dataset.ct);if(!vis.length)return;
    if(k==='j'||k==='k'){e.preventDefault();const p=vis.indexOf(CT_CUR);const n=p<0?(k==='j'?0:vis.length-1):Math.max(0,Math.min(vis.length-1,p+(k==='j'?1:-1)));ctGo(vis[n])}
    else if(k==='c'){e.preventDefault();const i=CT_CUR>=0?CT_CUR:vis[0];$('#conti').querySelector(`[data-act="ncopyall"][data-i="${i}"]`)?.click()}})}
// C안 카드: 번호·장면 한 줄·썸네일과 [이미지 등록|교체] [프롬프트]. 프롬프트·생성 설정은 펼쳐서
function naiCardC(p,i,o,im,blk){const S=o.settings,no=String(i+1).padStart(2,'0');
  const state=im?(im.stale?`<span class="tag warn">그림 등록 후 원고가 바뀜</span>`:''):'';
  const acts=im?.stale?`<button class="btn sm dark" data-act="nstale" data-i="${i}">변경 확인</button>`:`<button class="btn sm${im?'':' dark'}" data-cutslot="${i}">${im?'교체':'이미지 등록'}</button>`;
  return `<div class="pcard cut c"><div class="drop${im?' has':''}" tabindex="0" role="button" data-cutslot="${i}" aria-label="${i+1}번 컷 이미지 ${im?'바꾸기':'등록'}">${im?`<img src="${im.src}" alt="${i+1}번 컷"><button class="x" data-delcut="${i}" aria-label="삭제">×</button>`:'<span aria-hidden="true">+</span>'}</div>
  <div class="cbody"><h3><b>${no}</b> <span data-work>${esc(p.act)}</span></h3>${state}
  <div class="cacts">${acts}<button class="btn sm" data-act="nprompt" aria-expanded="false">프롬프트</button></div>
  <div class="nprompt" hidden><div class="cmeta">${esc([o.focus,p.shot,p.ang,p.emo].filter(Boolean).join(' · '))} · ${o.size.w} × ${o.size.h}${o.size.exact?'':' → 생성 후 '+esc(o.size.crop)}<button class="btn sm" data-act="ncopyall">전체 복사</button></div>
    ${blk('기본 프롬프트','',o.base)}${o.dbNote?`<p class="dbnote">${esc(o.dbNote)}</p>`:''}
    ${o.chars.map((c,n)=>blk(`캐릭터 ${n+1} · ${esc(c.name)}`,`위치 ${c.pos.cell}`,c.prompt)).join('')}
    <div class="nset"><div><b>해상도</b>${o.size.w} × ${o.size.h}</div><div><b>Steps · Guidance</b>${S.steps} · ${S.guidance}</div><div><b>Sampler</b>${S.sampler} · ${S.noise}</div><div><b>img2img</b>Strength ${S.strength} · Noise ${S.noiseImg}</div><div><b>캐릭터 위치</b>${o.chars.map(c=>`${esc(c.name)} ${c.pos.cell}`).join(' · ')||'캐릭터 칸 없음'}</div><div><b>레퍼런스</b>${o.charRef?`Character Reference: ${esc(o.charRef)}`:o.vibe?'Vibe Transfer: 장면 이미지':'없음'}</div></div>
    <div class="nbtns"><button class="btn" data-act="naibase" data-i="${i}">바탕 PNG (${o.size.w}×${o.size.h})</button>${o.charRef?`<button class="btn" data-act="nairef" data-n="${esc(o.charRef)}">캐릭터 레퍼런스 이미지</button>`:o.vibe?'<button class="btn" data-act="naivibe">장면 이미지</button>':''}</div></div>
  </div></div>`}
// 변경 확인: 이미지 등록 때 원고와 지금 원고 비교 → 그림 그대로 쓰기(경고 끄기) 또는 교체
function openStale(i){const p=state.panels[i],r=IMG.cut[cutId(SCENES[SCUR].id,i)];if(!p||!r)return;const strip=k=>String(k||'').replace(/^#\d+:/,'');
  let d=$('#staledlg');if(!d){d=document.createElement('dialog');d.id='staledlg';d.className='keydlg';document.body.appendChild(d)}
  d.innerHTML=`<h3>${i+1}번 컷 · 원고가 바뀌었어요</h3><div class="stalecmp"><div><small>그림을 등록할 때</small><p>${esc(strip(r.sig))}</p></div><div><small>지금</small><p>${esc(strip(p.key))}</p></div></div><img src="${r.src}" alt="" style="max-width:100%;max-height:220px;display:block;margin:8px auto;border-radius:6px"><div class="acts"><button class="btn" data-r="x">닫기</button><button class="btn" data-r="swap">교체</button><button class="btn dark" data-r="keep">그림 그대로 쓰기</button></div>`;
  d.onclick=e=>{const k=e.target.closest('[data-r]')?.dataset.r;if(!k)return;d.close();
    if(k==='keep'){r.sig=p.key;idb.put(r);rerenderCuts();if(VIEW==='webtoon')renderWebtoon();toast('이 그림을 지금 원고에 맞는 것으로 표시했어요')}
    if(k==='swap'){target={kind:'cut',key:String(i)};$('#filem').click()}};
  d.showModal()}
// Claude 실행 확인: 실행·전송을 정하는 자리에서 모델과 보내는 내용을 보여 줌
function confirmRefine(){let d=$('#refinedlg');if(!d){d=document.createElement('dialog');d.id='refinedlg';d.className='keydlg';document.body.appendChild(d)}
  d.innerHTML=`<h3>컷 프롬프트 생성</h3><p>컷의 초점을 유지하면서 장면의 재질·조명·구도와 등장인물의 동작을 구체화해요.</p><ul class="refinel"><li><b>모델</b>Claude Opus 5.5 (내 API 키)</li><li><b>보내는 것</b>이 씬의 컷 글 · 인물 태그 · 화풍 태그</li><li><b>보내지 않는 것</b>이미지 · 다른 씬</li><li><b>API 키</b>${AIKEY?'입력됨':'없음 — 먼저 입력해 주세요'}</li></ul><div class="acts"><button class="btn" data-r="x">닫기</button>${AIKEY?'':'<button class="btn" data-r="key">API 키 입력</button>'}<button class="btn dark" data-r="go"${AIKEY?'':' disabled'}>실행</button></div>`;
  d.onclick=e=>{const k=e.target.closest('[data-r]')?.dataset.r;if(!k)return;d.close();if(k==='key')openKey(null);if(k==='go')naiRefine()};d.showModal()}
// C안: 설정 섹션을 '작화 설정' 서랍으로 옮기고, 위에 상태·도구 막대
// 작화 설정 서랍(화풍·인물 태그·장면 이미지·Claude 다듬기): 콘티 화면에 붙임. 작화 단계는 콘티에 합침
// 작화 설정: 콘티 맨 위에 늘 펼쳐 둠(작품 전체에 걸리는 값이라 컷보다 위계가 높음). 화풍 태그 → 인물 태그
{const card=document.createElement('section');card.className='artcard';card.id='artcard';card.setAttribute('aria-label','작화 설정');
  card.innerHTML='<div class="art-h"><h2>작화 설정</h2><span class="art-scope">작품 전체</span><span class="grow"></span><button class="tpill" data-act="artgen">작화 프롬프트 생성</button></div><p class="art-st" id="artst" aria-live="polite"></p>';
  card.appendChild($('#nsec-style'));card.appendChild($('#nsec-chars'));
  // 쓰지 않는 옛 섹션은 숨겨 두기(다른 코드가 id로 찾음)
  const hold=document.createElement('div');hold.hidden=true;['#nsec-refs','#nsec-imgs','#nsec-ai'].forEach(q=>{const x=$(q);if(x)hold.appendChild(x)});hold.querySelector('#nsec-ai')?.appendChild($('#naiview'));card.appendChild(hold);
  $('#conti').before(card)}
// img2img 바탕: 이 컷의 러프를 NovelAI 해상도로 (밑그림 레퍼런스 사진은 빼고 선만)
// img2img 바탕: 이 컷의 원본 레퍼런스(그림 영역만, 흑백)를 NovelAI 해상도로. 레퍼런스가 없으면 만들지 않음
async function naiBase(i){const p=state.panels[i];if(!p)return;if(!p.ref){toast('이 컷은 맞는 레퍼런스가 없어 바탕 PNG를 만들 수 없어요');return}
  const o=NAI.cut(p,i,state.panels,{chars:naiChars(),style:NAISTYLE,tags:NAITAGS,refs:{}});const r=p.ref,im=await loadImg(r.src);const a=r.art||[0,0,1,1];
  const sx=a[0]*im.width,sy=a[1]*im.height,sw=(a[2]-a[0])*im.width,sh=(a[3]-a[1])*im.height;
  const c=document.createElement('canvas');c.width=o.size.w;c.height=o.size.h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.filter='grayscale(1)';
  const k=Math.max(c.width/sw,c.height/sh),dw=sw*k,dh=sh*k;g.drawImage(im,sx,sy,sw,sh,(c.width-dw)/2,(c.height-dh)/2,dw,dh);
  c.toBlob(b=>{download(`${sceneLabel(SCENES[SCUR],SCUR).replace(/[\\/:*?"<>|]/g,'_')}-컷${i+1}-바탕-${r.source_cut}-${o.size.w}x${o.size.h}.png`,URL.createObjectURL(b));toast(`바탕 PNG를 저장했어요 (${r.source_cut})`)},'image/png')}
function dataUrlDownload(name,src){fetch(src).then(r=>r.blob()).then(b=>download(name,URL.createObjectURL(b)))}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(a==='nstale'){openStale(+el.dataset.i);return}
  if(a==='lprompt'){const i=+el.dataset.i;OPENP.has(i)?OPENP.delete(i):OPENP.add(i);renderTable();return}
  if(a==='nprompt'){const c=el.closest('.pcard'),b=c.querySelector('.nprompt');b.hidden=!b.hidden;el.setAttribute('aria-expanded',!b.hidden);el.textContent=b.hidden?'프롬프트':'프롬프트 접기';return}
  if(a==='ncopy')copyText(el.closest('.nf').querySelector('pre').textContent);
  else if(a==='ncopyall'){const i=+(el.dataset.i??el.closest('.pcard').querySelector('[data-cutslot]').dataset.cutslot);copyText(naiCopy(naiCuts()[i].o))}
  else if(a==='artgen')artGen();
  else if(a==='naidown'){download(`${sceneLabel(SCENES[SCUR],SCUR)}-novelai.txt`,URL.createObjectURL(new Blob([naiText()],{type:'text/plain'})));toast('txt로 저장했어요')}
  else if(a==='naimulti'){target=null;$('#filem').click()}
  else if(a==='naibase')naiBase(+el.dataset.i);
  else if(a==='nairef'){const r=IMG.char[el.dataset.n];if(r)dataUrlDownload(`${el.dataset.n}-character-reference.jpg`,r.src)}
  else if(a==='naivibe'){const sc=state.panels.length&&sceneFor(state.panels[0]);if(sc)dataUrlDownload(`${sc.name||'scene'}-vibe.jpg`,sc.src)}
  else if(a==='naireset'){delete NAITAGS[el.dataset.n];saveNaiTags();renderNai()}});
$('#naichars').addEventListener('change',e=>{const t=e.target.closest('[data-naitag]');if(!t)return;NAITAGS[t.dataset.naitag]=t.value.trim();saveNaiTags();renderNai()});
$('#naistyle').value=NAISTYLE;
$('#naistyle').addEventListener('input',e=>{NAISTYLE=e.target.value;try{localStorage.setItem('rough-nai-style',NAISTYLE)}catch(_){}clearTimeout(window._nst);window._nst=setTimeout(renderNai,300)});

// ---------- 데이터베이스 ----------
let DBBASE='cuts/',DB=null,DBM={},dbSheet='컷표',dbLimit=200,dbSel=-1,dbF={work:'',ep:'',q:''};
const DB_ORDER=['작품 정보','컷표','장면','5컷 리듬','코드표','명경 1화 컷표','명경 1화 묶음','작업 방법'];
const LONG=/내용|메모|원문|대사|의도|리듬 한 줄|설명|비고|상태|연출명 설명/;
async function loadDB(){if(DB===null){$('#dbscroll').innerHTML='<p class="empty" style="padding:24px">불러오는 중</p>';
    for(const u of ['db/db.json','../cuts/db/db.json']){try{const r=await fetch(u);if(!r.ok)continue;DB=await r.json();break}catch(_){}}if(!DB)DB=false
    DBBASE='cuts/';DBM=new Proxy({},{get:(_,id)=>typeof id==='string'?cutFile(id):undefined});}
  renderDB()}
function dbImgId(sheet,cols,row){const g=n=>row[cols.indexOf(n)];
  if(cols.includes('컷ID'))return g('컷ID');if(sheet==='5컷 리듬')return String(g('컷 범위')||'').split('~')[0];if(sheet==='장면')return String(g('전환점 컷')||'').split(/[~,]/)[0].trim();return null}
function dbRows(){const t=DB[dbSheet];const c=t.columns;const wi=c.indexOf('작품'),ei=c.indexOf('화'),q=dbF.q.trim().toLowerCase();
  return t.rows.map((r,i)=>[r,i]).filter(([r])=>(wi<0||!dbF.work||r[wi]===dbF.work)&&(ei<0||!dbF.ep||String(r[ei])===dbF.ep)&&(!q||r.join(' ').toLowerCase().includes(q)))}
function renderDB(){
  if(DB===false){$('#dbtabs').innerHTML='';$('#dbfilter').innerHTML='';$('#dbscroll').innerHTML='<p class="empty" style="padding:24px">DB 파일(rough/db/db.json)을 읽지 못했어요. <code>python3 rough/serve.py</code>로 열어주세요.</p>';return}
  if(!DB[dbSheet])dbSheet=DB_ORDER.find(n=>DB[n]);
  $('#dbdesc').textContent=`웹툰 연출 DB 시트를 그대로 조회해요. 시트 리비전 ${DB.__meta?.revision??''} · 내보낸 날 ${DB.__meta?.exported??''}`;
  $('#dbtabs').innerHTML=DB_ORDER.filter(n=>DB[n]).map(n=>`<button data-s="${esc(n)}" aria-pressed="${n===dbSheet}">${esc(n)}<small>${DB[n].rows.length}</small></button>`).join('');
  const t=DB[dbSheet],c=t.columns,wi=c.indexOf('작품'),ei=c.indexOf('화');
  const works=wi<0?[]:[...new Set(t.rows.map(r=>r[wi]).filter(Boolean))];
  const eps=ei<0?[]:[...new Set(t.rows.filter(r=>wi<0||!dbF.work||r[wi]===dbF.work).map(r=>String(r[ei])).filter(x=>x&&x!=='null'))].sort((a,b)=>a-b);
  $('#dbfilter').innerHTML=(works.length?`<select data-f="work"><option value="">작품 전체</option>${works.map(w=>`<option${w===dbF.work?' selected':''}>${esc(w)}</option>`).join('')}</select>`:'')+
    (eps.length?`<select data-f="ep"><option value="">화 전체</option>${eps.map(x=>`<option value="${x}"${x===dbF.ep?' selected':''}>${x}화</option>`).join('')}</select>`:'')+
    `<input data-f="q" type="search" placeholder="검색 (내용·감정·연출명…)" value="${esc(dbF.q)}"><span class="status" id="dbcount"></span>`;
  renderDBTable()}
function renderDBTable(){const t=DB[dbSheet],c=t.columns,rows=dbRows();const showImg=rows.some(([r])=>DBM[dbImgId(dbSheet,c,r)]);
  $('#dbcount').textContent=`${rows.length}행`;
  const cell=(v,col)=>{if(v===null||v===undefined)return'<td></td>';const s=String(v);return LONG.test(col)?`<td class="long" title="${esc(s)}">${esc(s.length>90?s.slice(0,90)+'…':s)}</td>`:`<td>${esc(s)}</td>`};
  $('#dbscroll').innerHTML=`<table class="db"><thead><tr>${showImg?'<th></th>':''}${c.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,dbLimit).map(([r,i])=>{const id=dbImgId(dbSheet,c,r);
    return `<tr data-i="${i}"${i===dbSel?' class="on"':''}>${showImg?`<td>${DBM[id]?`<img loading="lazy" src="${cutThumb(id)}" onerror="this.onerror=null;this.src='${DBBASE}${DBM[id]}'" alt="">`:''}</td>`:''}${r.map((v,k)=>cell(v,c[k])).join('')}</tr>`}).join('')}</tbody></table>`+(rows.length>dbLimit?`<button class="more" data-act="dbmore">${rows.length-dbLimit}행 더 보기</button>`:'')}
function renderDBSide(i){const t=DB[dbSheet],c=t.columns,r=t.rows[i];const id=dbImgId(dbSheet,c,r);
  const cm=CUTMETA[id],FIT={ok:'그림 위주 · 레퍼런스로 씀',partial:'말풍선 위주·그림이 덜 차지 · 레퍼런스 제외',multi:'여러 칸 섞임·잘림 · 레퍼런스 제외'};
  $('#dbside').innerHTML=(cm?`<div class="dbpair"><figure><img src="${CUT_BASE}${cm.file}" alt="${esc(id)} 원본"><figcaption>원본 · cuts/</figcaption></figure>${cm.fixed?`<figure><img src="${FIX_BASE}${cm.fixed}" alt="${esc(id)} 수정본"><figcaption>피그마 수정본 · cuts-fixed/</figcaption></figure>`:''}</div><p class="dbmeta">칸 모양 <b>${cm.frame==='slant'?'사선':'사각'}</b> · ${cm.fixed?'피그마 수정본 · 레퍼런스로 씀':FIT[cm.fit]||''}</p>`:DBM[id]?`<img src="${DBBASE}${DBM[id]}" alt="${esc(id)}">`:'')+`<dl>${c.map((h,k)=>r[k]===null||r[k]===undefined||r[k]===''?'':`<dt>${esc(h)}</dt><dd>${esc(r[k])}</dd>`).join('')}</dl>`}
$('#dbtabs').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;dbSheet=b.dataset.s;dbLimit=200;dbSel=-1;dbF={work:dbF.work,ep:'',q:''};renderDB();$('#dbside').innerHTML='<p class="empty" style="padding:0">행을 누르면 자세히 보여요</p>'});
$('#dbfilter').addEventListener('input',e=>{const f=e.target.dataset.f;if(!f)return;dbF[f]=e.target.value;if(f==='work')dbF.ep='';dbLimit=200;if(f==='q'){clearTimeout(renderDB.t);renderDB.t=setTimeout(renderDBTable,200)}else renderDB()});
$('#dbscroll').addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(tr){dbSel=+tr.dataset.i;document.querySelectorAll('table.db tr.on').forEach(x=>x.classList.remove('on'));tr.classList.add('on');renderDBSide(dbSel)}
  if(e.target.closest('[data-act="dbmore"]')){dbLimit+=300;renderDBTable()}});
try{const v=localStorage.getItem('rough-view');setTimeout(()=>showView(v||'write'),0)}catch(_){setTimeout(()=>showView('write'),0)}

Promise.all([
  fetch('patterns.json').then(r=>r.json()),
  loadCutIndex(),
]).then(([pt,cuts])=>{
  PATS=pt.patterns;{const el=document.getElementById('patcount');if(el)el.textContent=PATS.length.toLocaleString()}
  // 그림 위주 컷만 레퍼런스로(말풍선 위주·덜 차지·여러 칸 섞인 컷은 자동 판정으로 제외)
  REFS=cuts.items.filter(g=>g.fit==='ok'||g.fixed).map(g=>({...g,kind:'cut',src:g.fixed?FIX_BASE+g.fixed:CUT_BASE+g.file,label:`${g.source_cut} ${g.shot}·${g.angle}${g.frame==='slant'?' · 사선 칸':''}${g.fixed?' · 수정본':''}`}));REF_ALL=cuts.items.length;CUTMETA=Object.fromEntries(cuts.items.map(g=>[g.source_cut,g]));REF_PICK=Object.fromEntries(cuts.items.filter(g=>g.art).map(g=>[g.source_cut,{...g,kind:'cut',src:g.fixed?FIX_BASE+g.fixed:CUT_BASE+g.file,label:`${g.source_cut} ${g.shot}·${g.angle}`,picked:true}]));
  compute(true);if(VIEW==='webtoon')refreshPageMaterials()}).catch(()=>{$('#reading').innerHTML='<p class="empty">패턴을 불러오지 못했어요. python3 rough/serve.py 로 열어주세요.</p>'});
// 학습 모델 7개(합계 약 4MB): 첫 화면이 뜬 뒤(load + 한가할 때) 중요한 순서로 하나씩 불러와 붙임.
// 붙을 때마다 다시 계산하지 않고 잠깐 모았다가 한 번만 계산. 못 불러오면 규칙 판정 그대로
{const Q=[['shot-model.js',()=>window.RoughShot?.shot&&RE.useShotModel(window.RoughShot)],
  ['feel-model.js',()=>window.RoughFeel?.vocab&&RE.useFeelModel(window.RoughFeel)],
  ['angle-model.js',()=>window.RoughAngle?.ang&&RE.useAngleModel(window.RoughAngle)],
  ['layout-model.js',()=>window.RoughLayoutModel?.h&&RE.useLayoutModel(window.RoughLayoutModel)],
  ['rank-model.js',()=>window.RoughRank?.vocab&&RE.useRankModel(window.RoughRank)],
  ['bundle-model.js',()=>window.RoughBundle?.fields&&RE.useBundleModel(window.RoughBundle)],
  ['ref-text.js',()=>window.RoughRefText?.refs&&RE.useRefText(window.RoughRefText)]];
 let dirty=false,tm=0;const flush=()=>{tm=0;if(dirty&&PATS.length){dirty=false;compute(false)}};
 const idle=f=>window.requestIdleCallback?requestIdleCallback(f,{timeout:1500}):setTimeout(f,50);
 const next=()=>{const it=Q.shift();if(!it){flush();return}
  const s=document.createElement('script');s.src=it[0];
  s.onload=()=>{try{if(it[1]())dirty=true}catch(e){console.warn(it[0],e)}clearTimeout(tm);tm=setTimeout(flush,400);idle(next)};
  s.onerror=()=>idle(next);document.head.appendChild(s)};
 const go=()=>idle(next);document.readyState==='complete'?go():addEventListener('load',go,{once:true})}

// ---------- 초기화(설정집 캐릭터·세계관 / 구성 / 씬) ----------
// 각 화면 맨 아래 작은 글자 버튼. 확인 뒤 비우고, 8초 동안 같은 자리가 '되돌리기'가 됨(씬은 Ctrl+Z로도 되돌림)
{const RESET={
  chars:{ask:'이 작품 등장인물을 모두 지울까요? 캐릭터 보관함은 그대로예요.',done:'등장인물을 비웠어요',
    snap:()=>JSON.stringify(CHARS),apply:()=>{CHARS=[];saveChars();renderChars()},restore:v=>{CHARS=JSON.parse(v);saveChars();renderChars()}},
  world:{ask:'세계관 개요와 설정 항목을 모두 지울까요? 세계관 보관함은 그대로예요.',done:'세계관을 비웠어요',
    snap:()=>JSON.stringify({w:WORLD,l:LORE}),apply:()=>{WORLD={name:'',genre:'',era:'',tone:'',summary:'',detail:'',tags:''};LORE=[];saveWorld();renderWorld()},
    restore:v=>{const o=JSON.parse(v);WORLD=o.w;LORE=o.l;saveWorld();renderWorld()}},
  plan:{ask:'지금 유형의 구성 설정과 구성안을 처음 상태로 되돌릴까요?',done:'구성을 처음 상태로 되돌렸어요',
    snap:()=>{try{return localStorage.getItem('rough-composition-v1')}catch(_){return null}},
    apply:()=>$('#v-plan').dispatchEvent(new CustomEvent('plan-load',{detail:null})),
    restore:v=>$('#v-plan').dispatchEvent(new CustomEvent('plan-load',{detail:v?JSON.parse(v):{}}))},
  scenes:{ask:'모든 씬을 지우고 빈 씬 하나로 시작할까요? 컷 글과 편집 내용이 함께 지워져요.',done:'씬을 비웠어요 · Ctrl+Z로 되돌릴 수 있어요',
    snap:()=>edState(),
    apply:()=>{SCENES.splice(0,SCENES.length,{id:'s'+Date.now(),title:'씬 1',cuts:[''],pageEdits:[]});SCUR=0;CUTS=SCENES[0].cuts;$('#sctitle').value='씬 1';saveCuts();renderCuts();compute(false)},
    restore:v=>{edRestore(v);CUTS=SCENES[SCUR].cuts;$('#sctitle').value=SCENES[SCUR].title||'';renderSceneList();renderCuts();compute(false)}}};
 const LAST={};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-reset]');if(!b)return;const k=b.dataset.reset,R=RESET[k];if(!R)return;
  const back=()=>{b.textContent='초기화';b.classList.remove('undo');delete LAST[k]};
  if(LAST[k]){clearTimeout(LAST[k].t);try{R.restore(LAST[k].v);toast('되돌렸어요')}catch(err){console.warn(err);toast('되돌리지 못했어요')}back();return}
  if(!confirm(R.ask))return;const v=R.snap();
  try{R.apply()}catch(err){console.warn(err);toast('초기화하지 못했어요');return}
  toast(R.done,2400);b.textContent='되돌리기';b.classList.add('undo');LAST[k]={v,t:setTimeout(back,8000)}})}
// 콘티를 다시 그려도 컷 프롬프트 생성 상태(생성 중·완료·오류)가 유지되게
{const _rc=renderConti;renderConti=function(...a){const r=_rc(...a);naiBtnSync();return r}}

// 콘티에서 컷 지우기: 씬 화면(cutAct)·편집 화면(deleteCut)과 같은 경로(remapCuts)를 써서 그림·편집값이 같이 따라가고,
// 원고(SCENES)를 바꾸므로 씬·편집 화면에도 그대로 반영. 실행 취소 기록에 남아 Ctrl+Z로 되돌림
function contiDelete(i){const p=state.panels[i];if(!p)return;const slot=cutSlot(p,i);
  if(CUTS.length<=1){toast('씬의 마지막 컷은 지울 수 없어요');return}
  const same=state.panels.filter((q,k)=>cutSlot(q,k)===slot).length;
  const txt=String(CUTS[slot]||'').split('\n')[0].slice(0,40);
  if(!confirm(`${i+1}번 컷을 지울까요?${same>1?`\n같은 글에서 나온 컷 ${same}개가 함께 지워져요.`:''}\n「${txt}」\n씬·편집 화면에서도 지워져요. Ctrl+Z로 되돌릴 수 있어요.`))return;
  const n=CUTS.length,edits=cutEdits();
  remapCuts(SCUR,()=>{CUTS.splice(slot,1);edits.splice(slot,1);return moveMap(n,x=>x===slot?-1:x>slot?x-1:x)});
  saveCuts();compute(false);CT_CUR=Math.min(i,Math.max(0,state.panels.length-1));CT_COPIED.clear();renderConti();
  toast(`${i+1}번 컷을 지웠어요 · 씬·편집에도 반영돼요 · Ctrl+Z로 되돌리기`,2600)}

// ---------- 구성안 → 설정집 제안 ----------
// 구성안 생성이 끝나면 Claude가 설정집에 없는 인물(엑스트라 포함)·장소·물건을 찾고, 어디에 넣을지 물어봄. 고른 것만 바로 추가
async function suggestEntities(draft,status,claude){if(!AIKEY||!draft?.cards?.length)return;
  const payload={cast:CHARS.map(c=>({name:c.name,aliases:c.aliases||''})),lore:LORE.map(l=>({name:l.name,keys:l.keys||''})),world:worldBrief(),
    cards:draft.cards.map(c=>({n:c.n,title:c.title||'',cuts:c.cuts||[]}))};
  status?.('구성안을 만들었어요 · 설정집에 없는 인물·설정을 찾는 중…');
  try{const r=await claude.findEntities(AIKEY,payload,{onStatus:()=>{}});
    const have=new Set(CHARS.flatMap(c=>[c.name,...String(c.aliases||'').split(',')]).map(x=>x.trim()).filter(Boolean).concat(LORE.map(l=>l.name.trim())));
    const items=(r.items||[]).filter(x=>x.name&&!have.has(x.name.trim()));
    status?.(items.length?`구성안을 만들었어요 · 설정집에 없는 것 ${items.length}개를 찾았어요`:'구성안을 만들었어요 · 설정집에 더할 것은 없어요');
    if(items.length)entityDialog(items)}
  catch(err){console.warn(err);status?.('구성안을 만들었어요 · 인물·설정 찾기는 실패했어요('+claude.explain(err)+')')}}
function entityDialog(items){let d=$('#entdlg');if(!d){d=document.createElement('dialog');d.id='entdlg';d.className='keydlg entdlg';document.body.appendChild(d)}
  const CAT=k=>(LORE_CAT[k]||['설정'])[0];
  d.innerHTML=`<h3>설정집에 추가할까요?</h3><p>구성안에 나오지만 설정집에 없는 것을 Claude가 찾았어요. 고른 대로 바로 추가돼요.</p>
  <ol class="entl">${items.map((x,n)=>`<li><div class="enth"><b>${esc(x.name)}</b><small>${esc(x.where)}</small></div>
    <p class="entr">${esc(x.reason)}</p><p class="entd">${x.suggest==='lore'?`${esc(CAT(x.cat))} · ${esc(x.desc)}`:esc(x.look)}</p>
    <div class="seg3 entc" role="radiogroup" aria-label="${esc(x.name)} 추가 위치">${[['char','캐릭터로'],['lore','세계관에'],['skip','추가 안 함']].map(([v,l])=>`<button type="button" data-n="${n}" data-v="${v}" aria-pressed="${x.suggest===v}">${l}</button>`).join('')}</div></li>`).join('')}</ol>
  <div class="acts"><button class="btn" data-r="x">나중에</button><button class="btn dark" data-r="go">선택대로 추가</button></div>`;
  const pick=items.map(x=>x.suggest);
  d.onclick=e=>{const b=e.target.closest('[data-v]');if(b){pick[+b.dataset.n]=b.dataset.v;b.parentElement.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));return}
    const k=e.target.closest('[data-r]')?.dataset.r;if(!k)return;
    if(k==='go'){let nc=0,nl=0;items.forEach((x,n)=>{const v=pick[n];
        if(v==='char'){CHARS.push({name:x.name.trim(),aliases:x.aliases||'',body:x.body==='male'?'male':'female',look:x.look||''});nc++}
        else if(v==='lore'){LORE.push({id:'l'+Date.now().toString(36)+n,name:x.name.trim(),cat:LORE_CAT[x.cat]?x.cat:'term',keys:x.keys||'',desc:x.desc||'',tags:x.tags||''});nl++}});
      if(nc){saveChars();if(VIEW==='chars')renderChars()}if(nl){saveWorld();if(VIEW==='world')renderWorld()}
      if(nc||nl){try{compute(false)}catch(_){}toast([nc&&`캐릭터 ${nc}명`,nl&&`세계관 항목 ${nl}개`].filter(Boolean).join(' · ')+'를 설정집에 추가했어요',2600)}}
    d.close()};
  d.showModal()}
