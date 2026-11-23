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
  $('#dbdesc').textContent=on?'학습 모델이 지금 DB 값과 어긋난다고 본 컷이에요. 맞는 값을 고르거나, 애매하면 메모와 함께 보류해 주세요.':$('#dbdesc').textContent;
  document.querySelector('#v-db h1').textContent=on?'판정':'데이터베이스';
  gBtn.setAttribute('aria-pressed',on);$('#gDb').setAttribute('aria-pressed',VIEW==='db'&&!on);if(on)render()}
gBtn.addEventListener('click',()=>{ON=true;if(VIEW!=='db')showView('db');load().then(()=>{badge();sync()});sync()});
$('#gDb').addEventListener('click',()=>{ON=false;if(typeof renderDB==='function'&&DB)renderDB();sync()});
{const _sv=showView;showView=function(...a){const r=_sv(...a);if(a[0]!=='db')ON=false;sync();return r}}

const pct=p=>Math.round(p*100)+'%';
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
    <figure class="rvimg"><img src="${CUT_BASE}${it.file}" alt="${esc(it.cut)}"></figure>
    <div class="rvq">
      <div class="rvmeta"><b>${esc(it.cut)}</b> · ${esc(it.work)} · <span class="rvfield">${esc(it.field)}</span> <span class="rvpos">${cur+1}/${L.length}</span></div>
      <p class="rvtext">${esc(it.text)}</p>
      <p class="rvask">이 컷의 <b>${esc(it.field)}</b>은? <small>지금 DB 값: ${esc(it.current)}</small></p>
      <div class="rvopts">${it.options.map((o,k)=>`<button data-rvo="${esc(o.label)}" class="${r&&!r.hold&&r.pick===o.label?'on':''}${o.label===it.current?' now':''}"><kbd>${k+1}</kbd>${esc(o.label)}${o.label===it.current?'<em>지금</em>':''}${showP?`<small>${pct(o.p)}</small>`:''}</button>`).join('')}
        <button data-rvhold class="hold${r?.hold?' on':''}"><kbd>5</kbd>보류</button></div>
      <div class="rvnote"${r?.hold?'':' hidden'}><label for="rvnote">보류 메모 <small>무엇이 애매한지 적어 두면 나중에 한 번에 해소할 때 써요</small></label>
        <textarea id="rvnote" rows="3" placeholder="예: 얼굴은 클로즈업인데 손이 크게 걸려 중경 같기도 함 / 두 칸이 합쳐진 컷">${esc(r?.note||'')}</textarea>
        <div class="acts"><button class="btn sm dark" data-rvsave>메모 저장 후 다음 (Ctrl+Enter)</button></div></div>
      <div class="rvnav"><button class="btn sm" data-rvnav="-1">← 이전</button><button class="btn sm" data-rvnav="1">다음 →</button>${r?'<button class="btn sm" data-rvclear>판정 지우기</button>':''}<span class="hint">1~4 고르기 · 5 보류 · ←/→ 이동</span></div>
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
