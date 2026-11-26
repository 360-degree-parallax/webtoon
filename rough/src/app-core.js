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
    RE.layout(a,r.p).forEach(c=>{const L=locks[c.key]||{};c.auto={shot:c.shot,ang:c.ang,h:c.h,emo:c.emo};Object.assign(c,L);c.lock=L;c.chunk=ci;c.ref=pickRef(c,SCENES[SCUR]?.pageEdits,state.panels.length);state.panels.push(c)})});
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
// 넣은 그림도 컷 비율로 맞추기(기본 켬): 칸 높이는 콘티의 컷 길이, 그림은 칸을 꽉 채우게 잘림. 컷마다 pageEdits.fit('ratio'|'img')로 따로 정할 수 있음
var FIT_RATIO=true;try{FIT_RATIO=localStorage.getItem('rough-fit-ratio')!=='0'}catch(_){}
const fitRatio=edit=>edit?.fit?edit.fit==='ratio':FIT_RATIO;
// 칸보다 그림이 세로로 길면 위쪽을 더 남기고(얼굴이 위에 있는 컷이 많음, 넘치는 부분의 25%만 위에서 자름), 가로로 길면 가운데
function fitImage(im,bx,y,bw,h){if(!im.w||!im.h)return `<image href="${im.src}" x="${bx}" y="${y}" width="${bw}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
  const ih=bw*im.h/im.w;if(ih>=h){const top=y-(ih-h)*.25;return `<image href="${im.src}" x="${bx}" y="${top.toFixed(1)}" width="${bw}" height="${ih.toFixed(1)}" preserveAspectRatio="none"/>`}
  const iw=h*im.w/im.h;return `<image href="${im.src}" x="${(bx-(iw-bw)/2).toFixed(1)}" y="${y}" width="${iw.toFixed(1)}" height="${h}" preserveAspectRatio="none"/>`}
function renderSVG(panels,sel=-1,pre='c',nums=true,imgs=null,clean=false,{edits,interactive=false,rough=false,sceneEnd=null}={}){let y=40,o='',gaps='',backgrounds='',defs='',lastEnd=null;const multi=panels.length>1;
  let prev=null,handles='',tightGaps='';
  panels.forEach((p,i)=>{const slot=cutSlot(p,i),edit=RoughGrammar.merge(edits?.[slot],p);const im=imgs&&imgs[i];const B=panelBox(p,i,multi);let bx=B.x,bw=B.w;let h=Math.round(im&&im.w&&!fitRatio(edit)?bw*im.h/im.w:p.h*bw);
    // 편집 화면에서 끌어 바꾼 칸 크기(x·폭·높이)
    if(edit?.frame){bx=edit.frame.x;bw=edit.frame.w;h=edit.frame.h}const on=i===sel;const blank=!!edit?.blank;const u=im||blank?null:underlay(p);
    // 코드로 그린 러프 그림은 쓰지 않음: 등록 이미지 → 원본 컷 레퍼런스(그림 영역만 잘라) → 빈 칸에 샷·앵글 표시
    let art=im?fitImage(im,bx,y,bw,h):'';
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
    o+=`<g data-p="${i}"${interactive?` data-slot-index="${slot}"`: ''}${fdata}>${poly?`<polygon${interactive?' class="page-frame"':''} points="${poly}" ${frameFill} ${stroke}/><clipPath id="${pre}${i}"><polygon points="${poly}"/></clipPath>`:`<rect${interactive?' class="page-frame"':''} x="${bx}" y="${y}" width="${bw}" height="${h}" ${frameFill} ${stroke}/><clipPath id="${pre}${i}"><rect x="${bx}" y="${y}" width="${bw}" height="${h}"/></clipPath>`}<g data-cut-art="" clip-path="url(#${pre}${i})"${mask?` mask="url(#${maskId})"`: ''}><g data-art=""${im?.layerBg!=null&&im?.layerBg!==undefined&&'layerBg' in im?' data-layer-bg=""':''}${zoomTf(edit?.img,bx,y,bw,h)}>${art}</g></g>${overlay.art}`+
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
