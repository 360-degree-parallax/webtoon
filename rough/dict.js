// DB 화면 '연출 사전' 탭: 코드표의 연출명마다 설명·판정 기준·작품별 사용 수·대표 묶음(실제 컷)을 보여 줌
(function(){
let DICT=false,dq='',dwork='',focus='';
const EX=3;
const cutsOf=range=>{const m=/^([A-Z]{2}-\d{2})-(\d{3})~(\d{3})$/.exec(String(range||'').trim());if(!m)return[];const out=[];
  for(let n=+m[2];n<=+m[3]&&out.length<8;n++)out.push(`${m[1]}-${String(n).padStart(3,'0')}`);return out};
const top=(arr,n=2)=>{const c={};arr.filter(Boolean).forEach(v=>c[v]=(c[v]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,n)};

function entries(){const code=DB['코드표'],rh=DB['5컷 리듬'];if(!code||!rh)return[];
  const cc=code.columns,rc=rh.columns,g=(r,cols,n)=>r[cols.indexOf(n)];
  const rows=rh.rows.filter(r=>!dwork||g(r,rc,'작품')===dwork);
  return code.rows.filter(r=>r[0]==='연출명').map(r=>{const name=g(r,cc,'값');const used=rows.filter(x=>g(x,rc,'연출명')===name);
    const byWork=top(used.map(x=>g(x,rc,'작품')),9);
    // 대표 묶음: 의도 메모가 있는 것 중 작품이 겹치지 않게
    const seen=new Set(),ex=[];for(const x of used){const w=g(x,rc,'작품');if(seen.has(w)&&used.length>EX)continue;if(!g(x,rc,'메모: 의도(원문)'))continue;seen.add(w);ex.push(x);if(ex.length>=EX)break}
    for(const x of used){if(ex.length>=EX)break;if(!ex.includes(x))ex.push(x)}
    return {name,cat:g(r,cc,'약어'),desc:g(r,cc,'설명'),rule:g(r,cc,'판정 기준·비고'),n:used.length,byWork,
      tempo:top(used.map(x=>g(x,rc,'템포'))),curve:top(used.map(x=>g(x,rc,'감정 곡선'))),trans:top(used.map(x=>g(x,rc,'주된 컷 전환'))),
      ex:ex.map(x=>({id:g(x,rc,'묶음'),work:g(x,rc,'작품'),ep:g(x,rc,'화'),range:g(x,rc,'컷 범위'),vng:g(x,rc,'서사 구조(VNG)'),flow:g(x,rc,'구도 흐름'),why:g(x,rc,'메모: 의도(원문)')||g(x,rc,'연출 목적')}))}})
    .filter(e=>!dq||[e.name,e.desc,e.rule].join(' ').toLowerCase().includes(dq.toLowerCase()))}

function render(){const es=entries(),total=es.reduce((a,e)=>a+e.n,0)||1;
  const works=[...new Set((DB['5컷 리듬']?.rows||[]).map(r=>r[0]).filter(Boolean))];
  $('#dbfilter').innerHTML=`<select data-dict-f="work"><option value="">작품 전체</option>${works.map(w=>`<option${w===dwork?' selected':''}>${esc(w)}</option>`).join('')}</select><input data-dict-f="q" type="search" placeholder="연출명·설명 검색" value="${esc(dq)}"><span class="status">연출명 ${es.length}개 · 묶음 ${total.toLocaleString()}개</span>`;
  $('#dbscroll').innerHTML=`<div class="dict"><nav class="dict-chips">${es.map(e=>`<a href="#dict-${encodeURIComponent(e.name)}" data-dict-jump="${esc(e.name)}">${esc(e.name)}<small>${e.n}</small></a>`).join('')}</nav>
    ${es.map(e=>`<article class="dict-card${e.name===focus?' focus':''}" id="dict-${encodeURIComponent(e.name)}">
      <header><h3>${esc(e.name)}</h3>${e.cat?`<span class="tag">${esc(e.cat)}</span>`:''}<span class="dict-n">${e.n}묶음 · ${Math.round(e.n/total*100)}%</span></header>
      <p class="dict-desc">${esc(e.desc||'')}</p>${e.rule?`<p class="dict-rule"><b>판정</b> ${esc(e.rule)}</p>`:''}
      <div class="dict-stats">${e.byWork.length?`<div><b>작품별</b>${e.byWork.map(([w,n])=>`<span class="wk">${esc(w)} <i style="width:${Math.max(3,Math.round(n/e.n*60))}px"></i> ${n}</span>`).join('')}</div>`:''}
        ${[['템포',e.tempo],['감정 곡선',e.curve],['주된 전환',e.trans]].filter(([,v])=>v.length).map(([k,v])=>`<div><b>${k}</b>${v.map(([x,n])=>`${esc(x)} <small>${n}</small>`).join(' · ')}</div>`).join('')}</div>
      ${e.ex.length?`<div class="dict-ex">${e.ex.map(x=>`<figure><div class="dict-strip">${cutsOf(x.range).map(id=>DBM[id]?`<img loading="lazy" src="${DBBASE}${DBM[id]}" alt="${id}" title="${id}">`:'').join('')}</div>
        <figcaption><b>${esc(x.work)} ${esc(x.ep)}화 · ${esc(x.id)}</b><span>${esc(x.flow||'')}${x.vng?` · VNG ${esc(x.vng)}`:''}</span>${x.why?`<p>${esc(x.why)}</p>`:''}</figcaption></figure>`).join('')}</div>`:'<p class="dict-none">이 조건에서 쓰인 묶음이 없어요</p>'}
    </article>`).join('')}</div>`;
  $('#dbside').innerHTML='<p class="empty" style="padding:0">연출명마다 실제 작품에서 쓴 5컷 묶음을 보여 줘요. 콘티 화면의 연출명을 눌러도 여기로 와요.</p>';
  $('#dbcount')&&($('#dbcount').textContent='');
  if(focus)requestAnimationFrame(()=>document.getElementById('dict-'+encodeURIComponent(focus))?.scrollIntoView({block:'start'}))}

function addTab(){const t=$('#dbtabs');if(!t||!DB)return;t.querySelector('[data-dict]')?.remove();
  t.insertAdjacentHTML('afterbegin',`<button data-dict aria-pressed="${DICT}">연출 사전<small>${(DB['코드표']?.rows||[]).filter(r=>r[0]==='연출명').length}</small></button>`);
  if(DICT)t.querySelectorAll('[data-s]').forEach(b=>b.setAttribute('aria-pressed','false'))}
{const _r=renderDB;renderDB=function(...a){const r=_r(...a);if(DB){addTab();if(DICT)render()}return r}}
$('#dbtabs').addEventListener('click',e=>{if(e.target.closest('[data-dict]')){DICT=true;focus='';renderDB()}else if(e.target.closest('[data-s]'))DICT=false},true);
$('#dbfilter').addEventListener('input',e=>{const f=e.target.dataset.dictF;if(!f)return;e.stopPropagation();if(f==='q'){dq=e.target.value;const pos=e.target.selectionStart;render();const q=$('#dbfilter [data-dict-f=q]');q.focus();q.setSelectionRange(pos,pos)}},true);
$('#dbfilter').addEventListener('change',e=>{const f=e.target.dataset.dictF;if(!f)return;e.stopPropagation();if(f==='work'){dwork=e.target.value;render()}},true);
$('#dbscroll').addEventListener('click',e=>{const j=e.target.closest('[data-dict-jump]');if(j){e.preventDefault();focus=j.dataset.dictJump;document.getElementById('dict-'+encodeURIComponent(focus))?.scrollIntoView({block:'start',behavior:'smooth'});
  document.querySelectorAll('.dict-card').forEach(c=>c.classList.toggle('focus',c.id==='dict-'+encodeURIComponent(focus)))}},true);

// 어디서든 연출명을 누르면 사전으로
function openDict(name){DICT=true;focus=name||'';showView('db')}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-dict-open]');if(b){e.preventDefault();e.stopPropagation();openDict(b.dataset.dictOpen)}},true);
window.RoughDict={openDict};
})();
