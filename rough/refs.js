// 편집 화면 왼쪽 '레퍼런스' 탭: 연출 DB 컷을 조건·내용으로 찾아 고른 컷에 바로 적용
// 피그마 에셋 패널 · 클립스튜디오 소재 팔레트처럼 끌어다 놓기도 됨
(function(){
const panel=$('#wrefs'),tabL=$('#ltab-layers'),tabR=$('#ltab-refs');
const PAGE=48;
const F={q:'',work:'',shot:'',angle:'',emotion:'',panel:'',np:'',mx:'',col:'',gz:'',clean:false,all:false,similar:false};
const MX={L:'왼쪽',C:'가운데',R:'오른쪽'};
let shown=PAGE,picked='',TEXT=null,textLoading=null;
const SHOT_ORDER=['설정','전경','전신','중경','클로즈업','디테일','화면 인서트','효과 배경','SD'];
const PANEL={single:'한 칸',bleed:'끝까지',multi:'여러 칸'};
const codeOf=r=>r.source_cut.slice(0,2);

// 컷 내용(대사·묘사)은 DB 사본에서 한 번만 불러옴
function loadText(){if(TEXT||textLoading)return textLoading;
  textLoading=fetch('db/db.json').then(r=>r.ok?r.json():null).then(d=>{TEXT={};const t=d?.['컷표'];if(!t)return;
    const c=t.columns,ci=c.indexOf('컷ID'),ti=c.indexOf('내용'),si=c.indexOf('장면');
    // 상세 분석 열(tools/merge_cut_context.py가 붙인 '상세 …')도 검색에 씀: '먹 번짐', '하단 흰 여백' 같은 말로 찾기
    const di=c.map((h,i)=>String(h).startsWith('상세 ')&&!/근거|영역/.test(h)?i:-1).filter(i=>i>=0);
    t.rows.forEach(r=>{if(r[ci])TEXT[r[ci]]={text:String(r[ti]||''),scene:String(r[si]||''),detail:di.map(i=>r[i]).filter(Boolean).join(' · ')}});if(!panel.hidden)render()}).catch(()=>{TEXT={}});
  return textLoading}

// 검색어가 상세 분석에서 맞았으면 그 앞뒤 문장을 툴팁에
function detailHit(r){const q=F.q.trim(),d=TEXT?.[r.source_cut]?.detail||'';if(!q||!d)return'';const i=d.toLowerCase().indexOf(q.toLowerCase());return i<0?'':`\n상세: …${d.slice(Math.max(0,i-30),i+q.length+40)}…`}
function items(){return Object.values(REF_PICK).filter(r=>F.all||r.fit==='ok'||r.fixed)}
function selPanel(){if(!pageSelection)return null;const [sc,slot]=pageSelection.split(':').map(Number);
  const ps=scenePanels(sc);return ps.find((p,i)=>cutSlot(p,i)===slot)||null}
const RANK={설정:0,전경:1,전신:2,중경:3,클로즈업:4,디테일:5};
function similarity(r,p){if(!p)return 0;const a=RANK[r.shot],b=RANK[p.shot];
  return (r.shot===p.shot?2:a!=null&&b!=null&&Math.abs(a-b)===1?.8:0)+(r.angle===p.ang?1:0)+(r.emotion&&r.emotion===p.emo?.6:0)+(r.role&&r.role===p.role?.3:0)
    +(p.h&&r.h_ratio?Math.max(0,1-Math.abs(r.h_ratio-p.h)*1.5):0)+(()=>{const n=new Set((String(p.key||'').match(/@[^\s@.,!?"'“”…~{}()\[\]]+/g)||[]).map(x=>x.slice(1))).size;return n&&r.np!=null&&Math.min(r.np,3)===Math.min(n,3)?.5:0})()+(r.balloon_cover!=null?Math.max(0,.4-r.balloon_cover):0)}
function results(){const q=F.q.trim().toLowerCase(),p=F.similar?selPanel():null;
  let out=items().filter(r=>(!F.work||codeOf(r)===F.work)&&(!F.shot||r.shot===F.shot)&&(!F.angle||r.angle===F.angle)&&(!F.emotion||r.emotion===F.emotion)
    &&(!F.panel||r.panel===F.panel)&&(!F.np||(F.np==='3'?(r.np??0)>=3:String(r.np??'')===F.np))&&(!F.mx||r.mx===F.mx)&&(!F.gz||r.gz===F.gz)&&(!F.col||(F.col==='mono'?r.mono===1:r.mono!==1))&&(!F.clean||(r.balloon_cover??0)<.08)&&(!q||[r.source_cut,r.work,r.shot,r.angle,r.emotion,r.role,TEXT?.[r.source_cut]?.text,TEXT?.[r.source_cut]?.scene,TEXT?.[r.source_cut]?.detail].join(' ').toLowerCase().includes(q)));
  if(p){out=out.map(r=>[similarity(r,p),r]).sort((a,b)=>b[0]-a[0]).map(x=>x[1])}
  return out}
const opts=(vals,cur,all)=>`<option value="">${all}</option>`+vals.map(v=>`<option${v===cur?' selected':''}>${esc(v)}</option>`).join('');
const uniq=(k,order)=>{const s=[...new Set(Object.values(REF_PICK).map(r=>r[k]).filter(Boolean))];return order?s.sort((a,b)=>(order.indexOf(a)+1||99)-(order.indexOf(b)+1||99)):s.sort()};
function curRef(){const p=selPanel();return p?.ref||null}

function render(){if(panel.hidden||!panel.isConnected||panel.closest('[hidden]'))return;  // 안 보이는 자리(에셋의 다른 탭 등)면 그리지 않음 — 보일 때 showTab이 다시 그림
  if(!Object.keys(REF_PICK).length){panel.innerHTML='<p class="empty">레퍼런스를 불러오는 중이에요</p>';return}
  const works=[...new Set(Object.values(REF_PICK).map(codeOf))].sort();const names=Object.fromEntries(Object.values(REF_PICK).map(r=>[codeOf(r),r.work]));
  const list=results(),p=selPanel(),cur=curRef(),pickedRef=REF_PICK[picked];
  const edit=pageSelection&&pageSettings()?.ref;
  panel.innerHTML=`<div class="rf-search"><input type="search" id="rfq" value="${esc(F.q)}" placeholder="내용·장면·상세 분석·컷ID 검색" aria-label="레퍼런스 검색"></div>
  <div class="rf-filters">
    <select data-f="work" aria-label="작품">${`<option value="">모든 작품</option>`+works.map(w=>`<option value="${w}"${w===F.work?' selected':''}>${esc(names[w]||w)}</option>`).join('')}</select>
    <select data-f="shot" aria-label="샷">${opts(uniq('shot',SHOT_ORDER),F.shot,'모든 샷')}</select>
    <select data-f="angle" aria-label="앵글">${opts(uniq('angle'),F.angle,'모든 앵글')}</select>
    <select data-f="emotion" aria-label="감정">${opts(uniq('emotion'),F.emotion,'모든 감정')}</select>
    <select data-f="panel" aria-label="칸 모양"><option value="">모든 칸</option>${Object.entries(PANEL).map(([k,v])=>`<option value="${k}"${k===F.panel?' selected':''}>${v}</option>`).join('')}</select>
    <select data-f="np" aria-label="인물 수"><option value="">모든 인물 수</option>${[['0','인물 없음'],['1','1명'],['2','2명'],['3','3명 이상']].map(([k,v])=>`<option value="${k}"${k===F.np?' selected':''}>${v}</option>`).join('')}</select>
    <select data-f="mx" aria-label="주인공 위치"><option value="">주인공 위치 전체</option>${Object.entries(MX).map(([k,v])=>`<option value="${k}"${k===F.mx?' selected':''}>주인공 ${v}</option>`).join('')}</select>
    <select data-f="gz" aria-label="시선"><option value="">시선 전체</option>${[['L','왼쪽을 봄'],['R','오른쪽을 봄'],['F','정면']].map(([k,v])=>`<option value="${k}"${k===F.gz?' selected':''}>${v}</option>`).join('')}</select>
    <select data-f="col" aria-label="색"><option value="">컬러·흑백</option><option value="color"${F.col==='color'?' selected':''}>컬러</option><option value="mono"${F.col==='mono'?' selected':''}>흑백</option></select>
  </div>
  <div class="rf-checks"><label><input type="checkbox" data-c="clean"${F.clean?' checked':''}> 말풍선 거의 없음</label><label><input type="checkbox" data-c="all"${F.all?' checked':''}> 제외 컷도</label></div>
  <div class="rf-sel">${p?`<div class="rf-cur"><span>${esc(pageCut.selectedOptions[0]?.textContent||'선택한 컷')}</span><b>${cur?esc(cur.source_cut):'레퍼런스 없음'}</b>${edit?'<em>직접 고름</em>':''}</div>
    <div class="rf-actions"><button class="btn sm${F.similar?' dark':''}" data-act="rfsimilar" aria-pressed="${F.similar}">비슷한 컷 순</button>${edit?'<button class="btn sm" data-act="rfreset">자동 추천으로</button>':''}</div>`:'<p class="rf-hint">캔버스에서 컷을 고르면 그 컷에 바로 쓸 수 있어요. 결과를 컷 위로 끌어다 놓아도 돼요.</p>'}</div>
  ${pickedRef?detail(pickedRef,!!p):''}
  <div class="rf-count">${list.length.toLocaleString()}컷${TEXT?'':' · 내용 검색 준비 중'}</div>
  <div class="rf-grid">${list.slice(0,shown).map(r=>`<button class="rf-item${r.source_cut===picked?' on':''}${cur&&cur.source_cut===r.source_cut?' cur':''}" data-ref-id="${r.source_cut}" draggable="true" title="${esc(r.source_cut+' · '+r.shot+'·'+r.angle+(TEXT?.[r.source_cut]?.text?' · '+TEXT[r.source_cut].text:'')+detailHit(r))}">
    <img loading="lazy" decoding="async" src="${r.fixed?r.src:(r.thumb||cutThumb(r.source_cut)||r.src)}" onerror="this.onerror=null;this.src='${r.src}'" alt="" draggable="false"><span>${r.source_cut.slice(3)} · ${esc(r.shot)}</span>${r.fit!=='ok'&&!r.fixed?'<i>제외</i>':''}</button>`).join('')}</div>
  ${list.length>shown?`<button class="btn sm rf-more" data-act="rfmore">더 보기 (${(list.length-shown).toLocaleString()})</button>`:''}`;
}
function detail(r,canApply){const t=TEXT?.[r.source_cut];
  return `<div class="rf-detail"><img src="${r.src}" alt="${esc(r.source_cut)}"><div class="rf-meta"><b>${esc(r.source_cut)}</b> · ${esc(r.work)}<br>${esc([r.shot,r.angle,r.role,r.emotion].filter(Boolean).join(' · '))}<br><small>${PANEL[r.panel]||''}${r.frame==='slant'?' · 사선':''}${r.np!=null?` · 인물 ${r.np>=3?'3명 이상':r.np?r.np+'명':'없음'}`:''}${r.mx?` · 주인공 ${MX[r.mx]}`:''}${r.gz&&r.gz!=='F'?` · ${r.gz==='L'?'왼쪽':'오른쪽'}을 봄`:''}${r.mono?' · 흑백':''}${r.salt?` · 그림으로는 ${esc(r.salt)}에 가까움`:''}${r.balloon_cover!=null?` · 말풍선 ${Math.round(r.balloon_cover*100)}%`:''}</small>${t?.text?`<p>${esc(t.text)}</p>`:''}</div>
    <div class="rf-actions">${canApply?`<button class="btn dark sm" data-act="rfapply">이 컷에 쓰기</button>`:''}<button class="btn sm" data-act="rfclose">닫기</button></div></div>`}

function apply(id,key=pageSelection){if(!key||!REF_PICK[id])return;const prev=pageSelection;pageSelection=key;const set=pageSettings(true);set.ref=id;
  // 비율이 다른 그림으로 바꾸면 이전 확대·프레임 높이는 맞지 않으므로 그림 확대만 초기화
  delete set.img;pageSelection=prev;saveScenes();if(typeof compute==='function')compute(false);renderWebtoon();
  toast(`${id} 레퍼런스를 썼어요`);render()}
function reset(){if(!pageSelection)return;const set=pageSettings();if(set){delete set.ref;delete set.img}saveScenes();if(typeof compute==='function')compute(false);renderWebtoon();render()}

function showTab(t){if(document.body.classList.contains('ws-panels')){panel.hidden=false;$('#wtoc').hidden=false;if(t==='refs'){window.RoughWS?.openPanel('refs');loadText();render()}return}
  const refs=t==='refs';tabL.setAttribute('aria-selected',!refs);tabR.setAttribute('aria-selected',refs);$('#wtoc').hidden=refs;panel.hidden=!refs;
  try{localStorage.setItem('rough-left-tab',t)}catch(_){}if(refs){loadText();render()}}
tabL.addEventListener('click',()=>showTab('layers'));tabR.addEventListener('click',()=>showTab('refs'));

let qTimer=0;
panel.addEventListener('input',e=>{if(e.target.id==='rfq'){clearTimeout(qTimer);qTimer=setTimeout(()=>{F.q=e.target.value;shown=PAGE;const pos=e.target.selectionStart;render();const q=$('#rfq');q.focus();q.setSelectionRange(pos,pos)},200)}});
panel.addEventListener('change',e=>{const f=e.target.dataset.f,c=e.target.dataset.c;if(f){F[f]=e.target.value;shown=PAGE;render()}if(c){F[c]=e.target.checked;shown=PAGE;render()}});
panel.addEventListener('click',e=>{const it=e.target.closest('[data-ref-id]');if(it){picked=picked===it.dataset.refId?'':it.dataset.refId;render();panel.querySelector('.rf-detail')?.scrollIntoView({block:'nearest'});return}
  const a=e.target.closest('[data-act]')?.dataset.act;
  if(a==='rfmore'){shown+=PAGE;render()}
  if(a==='rfsimilar'){F.similar=!F.similar;shown=PAGE;render()}
  if(a==='rfapply'&&picked)apply(picked);
  if(a==='rfreset')reset();
  if(a==='rfclose'){picked='';render()}});
panel.addEventListener('dblclick',e=>{const it=e.target.closest('[data-ref-id]');if(it&&pageSelection)apply(it.dataset.refId)});

// 끌어다 놓기: 결과 → 캔버스의 컷
panel.addEventListener('dragstart',e=>{const it=e.target.closest('[data-ref-id]');if(!it)return;e.dataTransfer.setData('application/x-rough-ref',it.dataset.refId);e.dataTransfer.setData('text/plain',it.dataset.refId);e.dataTransfer.effectAllowed='copy'});
let over=null;const mark=g=>{if(over===g)return;over?.classList.remove('drop-target');over=g;g?.classList.add('drop-target')};
pageReader.addEventListener('dragover',e=>{if(!e.dataTransfer.types.includes('application/x-rough-ref'))return;const g=e.target.closest('[data-slot-index]');mark(g);if(g){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
pageReader.addEventListener('dragleave',e=>{if(!pageReader.contains(e.relatedTarget))mark(null)});
pageReader.addEventListener('drop',e=>{const id=e.dataTransfer.getData('application/x-rough-ref');const g=e.target.closest('[data-slot-index]');mark(null);if(!id||!g)return;e.preventDefault();
  selectPageCut(g);apply(id,pageKey(g))});

// 선택한 컷이 바뀌면 패널 갱신, 속성 패널에도 '레퍼런스 바꾸기' 줄
{const _sc=selectPageCut;selectPageCut=function(...a){const prev=pageSelection,r=_sc(...a);if(prev!==pageSelection){if(!panel.hidden)requestAnimationFrame(()=>setTimeout(render,0));refRow()}return r}}
{const _rw=renderWebtoon;renderWebtoon=function(...a){const r=_rw(...a);refRow();return r}}
const row=document.createElement('div');row.className='prop refrow';row.innerHTML='<span>레퍼런스</span><span class="refrow-v"><b id="wrefid">—</b><button class="btn sm" id="wrefchange">바꾸기</button></span>';
$('#wsec-cut .insp-h').after(row);
function refRow(){const r=curRef();$('#wrefid').textContent=r?r.source_cut:'없음';$('#wrefid').title=r?`${r.work} · ${r.shot}·${r.angle}${pageSelection&&pageSettings()?.ref?' · 직접 고름':' · 자동 추천'}`:''}
$('#wrefchange').addEventListener('click',()=>{F.similar=true;shown=PAGE;showTab('refs')});

try{if(localStorage.getItem('rough-left-tab')==='refs')showTab('refs')}catch(_){}
window.RoughRefs={apply,reset,showTab,results,F};
})();
