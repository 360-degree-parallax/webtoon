// 판정 큐: 학습 모델이 사람 라벨과 어긋난다고 본 컷을 하나씩 보여 주고, 선택지 4개 중 하나를 고르거나 메모와 함께 보류
// 데이터: db/review-queue.json(tools/ml/make_review_queue.py) · 결과: 이 브라우저 localStorage('rough-review-v1', 작업 파일에도 들어감)
// 결과는 '결과 복사'·'파일로 저장'으로 꺼내 Claude에게 주면 시트에 반영하고, 보류는 메모를 읽고 해소함
(function(){
const KEY='rough-review-v1';
let Q=null,loading=null,ON=false,cur=0,F={field:'',state:'left'},showP=false,PIN=null; // PIN: 보류 메모를 쓰는 동안 목록에서 빠지지 않게 붙잡는 컷
let R={};try{R=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){R={}}
try{showP=localStorage.getItem('rough-review-p')==='1'}catch(_){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(R))}catch(e){typeof saveFail==='function'&&saveFail(e,'판정 결과')}};
const load=()=>loading||(loading=fetch('db/review-queue.json').then(r=>r.ok?r.json():null).then(d=>{Q=d;return d}).catch(()=>{Q=false}));
const st=it=>{const r=R[it.id];return !r?'left':r.hold?'hold':'done'};
const list=()=>!Q?[]:Q.items.filter(it=>it.id===PIN||((!F.field||it.field===F.field)&&(F.state==='all'||st(it)===F.state)));
const counts=()=>{const c={left:0,hold:0,done:0};(Q?.items||[]).forEach(it=>c[st(it)]++);return c};

// DB 화면에 '판정' 탭을 붙임
const box=document.createElement('div');box.id='reviewbox';box.className='rv';box.hidden=true;
document.querySelector('#v-db .wrap').appendChild(box);
{const _r=renderDB;renderDB=function(...a){_r(...a);sync()}}
// 상단 '판정' 버튼(DB 옆): 누르면 DB 화면을 판정 모드로 엶. 남은 수를 배지로
const gBtn=$('#gReview'),badge=()=>{const c=counts();$('#gReviewN').textContent=Q?(c.left+c.hold||''):''};
load().then(badge);
function sync(){const on=ON&&VIEW==='db';$('#dbfilter').hidden=on;document.querySelector('#v-db .dbgrid').hidden=on;box.hidden=!on;$('#dbtabs').hidden=on;
  $('#dbdesc').textContent=on?'학습 모델이 지금 DB 값과 어긋난다고 본 컷이에요. 맞는 값을 고르거나, 애매하면 메모와 함께 보류해 주세요. 직접 고른 값(지금 값 유지 포함)은 다음 학습에서 일반 라벨의 5배로 반영돼요.':$('#dbdesc').textContent;
  document.querySelector('#v-db h1').textContent=on?'판정':'데이터베이스';
  gBtn.setAttribute('aria-pressed',on);$('#gDb').setAttribute('aria-pressed',VIEW==='db'&&!on);if(on)render()}
gBtn.addEventListener('click',()=>{ON=true;if(VIEW!=='db')showView('db');load().then(()=>{badge();sync()});sync()});
$('#gDb').addEventListener('click',()=>{ON=false;if(typeof renderDB==='function'&&DB)renderDB();sync()});
{const _sv=showView;showView=function(...a){const r=_sv(...a);if(a[0]!=='db')ON=false;sync();return r}}

const pct=p=>Math.round(p*100)+'%';
// 선택지 설명(코드표·작화 프롬프트 기준) — 무엇을 눌러야 할지 판단 근거
const DEF={
  샷:{설정:'장소 전체가 보이는 컷, 인물은 작게 또는 없이',전경:'인물 전신과 주변 공간이 넉넉하게',전신:'머리부터 발끝까지, 인물이 화면 높이의 70% 안팎',중경:'허리 위, 상반신과 손동작이 보임',클로즈업:'얼굴과 어깨가 화면을 채움, 표정이 중심',디테일:'손·눈·소품 하나가 화면을 채우는 인서트','효과 배경':'인물 대신 효과선·색면·패턴이 중심','화면 인서트':'휴대폰·모니터·편지 같은 화면·글 자체',SD:'2~3등신으로 줄인 개그 그림'},
  역할:{설정:'장소·상황을 처음 보여 줌(어디서 무엇이)',전개:'행동·대화로 이야기를 앞으로 진행',공개:'새 정보·얼굴·사실이 처음 드러남(펀치)',반응:'앞 컷에 대한 표정·몸짓 반응',전환:'시간·장소·장면이 바뀌는 다리 컷'},
  앵글:{아이레벨:'눈높이에서 봄 — 애매하면 아이레벨',하이앵글:'위에서 내려다봄: 정수리·바닥이 보이고 인물이 작아 보임',로우앵글:'아래에서 올려다봄: 턱 밑·천장·하늘이 보이고 인물이 커 보임',탑뷰:'바로 위에서 수직으로 내려다봄'},
  감정:{평온:'특별한 감정 없이 담담',개그:'웃기려는 과장·SD·만화적 표현',설렘:'두근거림·호감·로맨틱한 긴장',기쁨:'웃음·즐거움',다정:'따뜻한 배려·애정',당황:'예상 못 한 상황에 허둥댐',의아:'궁금함·고개를 갸웃',놀람:'순간적인 충격·깜짝',긴장:'위험·불안·조마조마',냉담:'차갑고 무심함',분노:'화·짜증',쓸쓸:'외로움·슬픔·상실',회상:'과거 장면(톤·테두리로 구분되는 회상)',결의:'마음먹음·단호함'}};
const WHY={앵글:'카메라가 뚜렷하게 위·아래일 때만 하이·로우예요. 바닥·천장·턱선·정수리가 보이는지, 세로선(기둥·건물)이 위나 아래로 모이는지 보세요.',샷:'인물이 화면에서 차지하는 크기로 골라 주세요(얼굴만=클로즈업, 허리 위=중경).',역할:'앞뒤 컷과의 흐름으로 골라 주세요 — 아래 앞 컷·뒤 컷을 같이 봐요.',감정:'표정·톤과 글을 같이 봐요. 회상 장면이면 회상을 골라요.'};
function render(){
  if(Q===null){box.innerHTML='<p class="empty">판정 큐를 불러오는 중이에요</p>';return}
  if(Q===false){box.innerHTML='<p class="empty">판정 큐(db/review-queue.json)를 읽지 못했어요.</p>';return}
  const L=list(),c=counts(),total=Q.items.length;if(cur>=L.length)cur=Math.max(0,L.length-1);const it=L[cur],r=it&&R[it.id];
  const fields=[...new Set(Q.items.map(x=>x.field))];
  box.innerHTML=`<div class="rvbar">
    <div class="seg3" role="group" aria-label="분야"><button data-rvf="" aria-pressed="${!F.field}">전체</button>${fields.map(f=>`<button data-rvf="${f}" aria-pressed="${F.field===f}">${f}</button>`).join('')}</div>
    <div class="seg3" role="group" aria-label="상태">${[['left','남음',c.left],['hold','보류',c.hold],['done','끝남',c.done],['all','전체',total]].map(([k,l,n])=>`<button data-rvs="${k}" aria-pressed="${F.state===k}">${l} <small>${n}</small></button>`).join('')}</div>
    <span class="rvprog"><i style="width:${(c.done/total*100).toFixed(1)}%"></i></span><span class="rvn">${c.done}/${total} 판정 · 보류 ${c.hold}</span>
    <span class="grow"></span>
    <label class="rvchk"><input type="checkbox" data-rvp${showP?' checked':''}> 모델 확률 보기</label>
    <button class="btn sm" data-rvx="copy">결과 복사</button><button class="btn sm" data-rvx="file">파일로 저장</button></div>
  ${!it?`<p class="empty">${F.state==='left'?'이 조건에서 남은 컷이 없어요. 수고했어요!':'해당하는 컷이 없어요.'}</p>`:`
  <div class="rvmain">
    <div class="rvleft">
      <figure class="rvimg" data-rvzoom title="눌러서 크게 보기"><img src="${CUT_BASE}${it.file}" alt="${esc(it.cut)}"></figure>
      <div class="rvctx">${[['앞 컷',it.prev],['뒤 컷',it.next]].map(([l,x])=>x?`<figure class="rvnb" data-rvzoom-src="${CUT_BASE}${esc(x.file)}" title="${esc(x.text||'')}"><img loading="lazy" src="${CUT_BASE}${esc(x.file)}" alt=""><figcaption><b>${l}</b> ${esc(x.cut)}<br><span>${esc(x.text||'')}</span></figcaption></figure>`:`<figure class="rvnb none"><figcaption><b>${l}</b> 없음(화의 처음·끝)</figcaption></figure>`).join('')}</div>
    </div>
    <div class="rvq">
      <div class="rvmeta"><b>${esc(it.cut)}</b> · ${esc(it.work)} · <span class="rvfield">${esc(it.field)}</span>${it.new?' <span class="rvnew">새로 추가</span>':''} <span class="rvpos">${cur+1}/${L.length}</span></div>
      ${it.info?.장면?`<div class="rvscene">${esc(it.info.장면)}</div>`:''}
      <p class="rvtext">${esc(it.text)}</p>
      ${it.info?`<div class="rvinfo">${['샷','앵글','역할','감정','강도'].filter(k=>it.info[k]!=null).map(k=>`<span class="${k===it.field?'cur':''}"><small>${k}</small>${esc(String(it.info[k]))}${k==='감정'&&it.info['감정(세부)']&&it.info['감정(세부)']!==it.info.감정?` · ${esc(it.info['감정(세부)'])}`:''}</span>`).join('')}</div>`:''}
      ${it.meta?`<div class="rvinfo rvmeta2"><span><small>그림 분석</small>인물 ${it.meta.머리>=3?'3명 이상':it.meta.머리?it.meta.머리+'명':'없음'}</span>${it.meta['머리 높이']!=null?`<span title="머리 높이를 컷 폭에 견준 값 · 샷별 중앙값 설정 0.09 · 전경 0.14 · 전신 0.25 · 중경 0.35 · 클로즈업 0.59"><small>머리 크기</small>${Math.round(it.meta['머리 높이']*100)}% <small>(${it.meta['머리 높이']<.12?'설정':it.meta['머리 높이']<.2?'전경':it.meta['머리 높이']<.3?'전신':it.meta['머리 높이']<.47?'중경':'클로즈업'} 쪽)</small></span>`:''}${it.meta.주인공?`<span><small>주인공</small>${esc(it.meta.주인공)}</span>`:''}${it.meta.흑백?'<span>흑백</span>':''}</div>`:''}
      <p class="rvwhy">${(()=>{const top=it.options[0],nowp=it.options.find(o=>o.label===it.current);return `모델은 <b>${esc(top.label)}</b>(${pct(top.p)})로 봤고, 지금 DB 값 <b>${esc(it.current)}</b>은 ${nowp?pct(nowp.p):'낮음'}이에요. ${esc(WHY[it.field]||'')}`})()}</p>
      <p class="rvask">이 컷의 <b>${esc(it.field)}</b>은?</p>
      <div class="rvopts">${it.options.map((o,k)=>{const ex=(Q.meta?.examples?.[it.field]?.[o.label]||[]).filter(x=>x.cut!==it.cut).slice(0,3);
        return `<button data-rvo="${esc(o.label)}" class="${r&&!r.hold&&r.pick===o.label?'on':''}${o.label===it.current?' now':''}"><span class="rvo-h"><kbd>${k+1}</kbd><b>${esc(o.label)}</b>${o.label===it.current?'<em>지금</em>':''}<i class="rvbar2"><i style="width:${Math.round(o.p*100)}%"></i></i><small>${pct(o.p)}</small></span>
          <span class="rvdef">${esc(DEF[it.field]?.[o.label]||'')}</span>${ex.length?`<span class="rvex">${ex.map(x=>`<img loading="lazy" src="${typeof cutThumb==='function'?cutThumb(x.cut):CUT_BASE+x.file}" onerror="this.onerror=null;this.src='${CUT_BASE}${x.file}'" alt="" title="예시 ${esc(x.cut)}">`).join('')}<small>예시</small></span>`:''}</button>`}).join('')}
        <button data-rvhold class="hold${r?.hold?' on':''}"><span class="rvo-h"><kbd>5</kbd><b>보류</b></span><span class="rvdef">애매하면 메모와 함께 남겨 두기</span></button></div>
      <div class="rvnote"${r?.hold?'':' hidden'}><label for="rvnote">보류 메모 <small>무엇이 애매한지 적어 두면 나중에 한 번에 해소할 때 써요</small></label>
        <textarea id="rvnote" rows="3" placeholder="예: 얼굴은 클로즈업인데 손이 크게 걸려 중경 같기도 함 / 두 칸이 합쳐진 컷">${esc(r?.note||'')}</textarea>
        <div class="acts"><button class="btn sm dark" data-rvsave>메모 저장 후 다음 (Ctrl+Enter)</button></div></div>
      ${r&&!r.hold?`<div class="rvfb"><input id="rvfb" value="${esc(r.note||'')}" placeholder="이 판정에 덧붙일 말(선택) · 예: 회상 장면이라 감정은 회상이 맞음" aria-label="판정 메모"><button class="btn sm" data-rvfb>메모 남기기</button></div>`:''}
      <div class="rvnav"><button class="btn sm" data-rvnav="-1">← 이전</button><button class="btn sm" data-rvnav="1">다음 →</button>${r?'<button class="btn sm" data-rvclear>판정 지우기</button>':''}<span class="hint">1~4 고르기 · 5 보류 · ←/→ 이동 · 그림 눌러 크게</span></div>
    </div>
  </div>`}
  <div class="rvstrip">${L.slice(Math.max(0,cur-6),cur+18).map(x=>{const i=L.indexOf(x);return `<button data-rvgo="${i}" class="${i===cur?'cur ':''}${st(x)}" title="${esc(x.cut)} · ${esc(x.field)}"><img loading="lazy" src="${typeof cutThumb==='function'?cutThumb(x.cut):CUT_BASE+x.file}" onerror="this.onerror=null;this.src='${CUT_BASE}${x.file}'" alt=""></button>`}).join('')}</div>`;
  badge()}
const step=()=>{if(F.state==='all'||F.state==='done')cur++};  // 남음·보류 보기에서는 고른 컷이 빠지므로 같은 자리가 곧 다음 컷
function pick(label){const it=list()[cur];if(!it)return;const was=PIN===it.id;PIN=null;R[it.id]={pick:label,hold:false,note:'',at:Date.now()};save();if(!was||F.state!=='left')step();render()}
function hold(){const it=list()[cur];if(!it)return;PIN=it.id;R[it.id]={pick:null,hold:true,note:R[it.id]?.note||'',at:Date.now()};save();render();cur=list().indexOf(it);render();$('#rvnote')?.focus()}
function saveNote(){const it=list()[cur];if(!it)return;R[it.id]={pick:null,hold:true,note:($('#rvnote')?.value||'').trim(),at:Date.now()};save();
  const pinned=PIN===it.id;PIN=null;if(!pinned||F.state==='all'||F.state==='done')step();else if(F.state==='hold')cur++;render();toast('보류로 남겼어요')}
function exportData(){const its=Q?.items||[],out=its.filter(it=>R[it.id]).map(it=>({id:it.id,cut:it.cut,field:it.field,col:it.col,current:it.current,
  pick:R[it.id].hold?null:R[it.id].pick,hold:!!R[it.id].hold,note:R[it.id].note||'',at:new Date(R[it.id].at).toISOString()}));
  return {format:'rough-review',queue:Q?.meta||null,exported:new Date().toISOString(),summary:{...counts(),changed:out.filter(x=>x.pick&&x.pick!==x.current).length},decisions:out}}
box.addEventListener('click',e=>{const t=e.target;
  const z=t.closest('[data-rvzoom],[data-rvzoom-src]');if(z){const src=z.dataset.rvzoomSrc||z.querySelector('img')?.src;if(src)zoom(src);return}
  if(t.closest('[data-rvfb]')){const it=list()[cur];if(it&&R[it.id]){R[it.id].note=($('#rvfb')?.value||'').trim();save();toast('메모를 남겼어요')}return}
  const f=t.closest('[data-rvf]');if(f){F.field=f.dataset.rvf;cur=0;PIN=null;render();return}
  const s=t.closest('[data-rvs]');if(s){F.state=s.dataset.rvs;cur=0;PIN=null;render();return}
  const o=t.closest('[data-rvo]');if(o){pick(o.dataset.rvo);return}
  if(t.closest('[data-rvhold]')){hold();return}
  if(t.closest('[data-rvsave]')){saveNote();return}
  if(t.closest('[data-rvclear]')){const it=list()[cur];if(it){delete R[it.id];if(PIN===it.id)PIN=null;save();render()}return}
  const n=t.closest('[data-rvnav]');if(n){PIN=null;cur=Math.max(0,Math.min(list().length-1,cur+ +n.dataset.rvnav));render();return}
  const g=t.closest('[data-rvgo]');if(g){PIN=null;cur=+g.dataset.rvgo;render();return}
  const x=t.closest('[data-rvx]');if(x){const d=exportData(),txt=JSON.stringify(d,null,1);
    if(x.dataset.rvx==='copy')navigator.clipboard?.writeText(txt).then(()=>toast(`판정 ${d.decisions.length}건(보류 ${d.summary.hold})을 복사했어요. Claude에게 붙여 넣어 주세요`,3500),()=>toast('복사가 막혀 있어요. 파일로 저장해 주세요'));
    else download(`판정-${new Date().toISOString().slice(0,10)}.json`,URL.createObjectURL(new Blob([txt],{type:'application/json'})));return}});
function zoom(src){let d=$('#rvzoomdlg');if(!d){d=document.createElement('dialog');d.id='rvzoomdlg';d.className='rvzoom';d.addEventListener('click',()=>d.close());document.body.appendChild(d)}d.innerHTML=`<img src="${src}" alt="">`;d.showModal()}
box.addEventListener('change',e=>{if(e.target.matches('[data-rvp]')){showP=e.target.checked;try{localStorage.setItem('rough-review-p',showP?'1':'0')}catch(_){}render()}});
document.addEventListener('keydown',e=>{if(!ON||box.hidden||VIEW!=='db')return;const typing=e.target.closest('textarea,input,select');
  if(typing){if(e.target.id==='rvnote'&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();saveNote()}return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;const it=list()[cur];
  if(/^[1-4]$/.test(e.key)&&it){const o=it.options[+e.key-1];if(o){e.preventDefault();pick(o.label)}}
  else if(e.key==='5'||e.key==='h'){e.preventDefault();hold()}
  else if(e.key==='ArrowRight'){e.preventDefault();cur=Math.min(list().length-1,cur+1);render()}
  else if(e.key==='ArrowLeft'){e.preventDefault();cur=Math.max(0,cur-1);render()}});
window.RoughReview={exportData,get queue(){return Q}};
})();
