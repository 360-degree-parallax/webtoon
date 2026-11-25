// 단계 이동 바: 모든 화면 아래에 작게 늘 떠 있는 「이전 · 진행 점 · 다음」
// 참고한 흐름: 설문·가입 마법사(이전/다음 고정), 결제·온보딩 단계 표시(지나온 단계 체크), 문서 앱 단축키 이동.
// - 다음 단계 이름과 지금 상태(인물 수·씬·컷 수 등)를 같이 보여 줘서 어디로 가는지 미리 앎
// - 점을 누르면 그 단계로 바로, 마우스를 올리면 상태 요약
// - Alt+Shift+← / → 로 이동, 화면마다 보던 스크롤 위치 기억
(function(){
const STEPS=[['chars','캐릭터'],['world','세계관'],['plan','구성'],['write','씬'],['layout','콘티'],['webtoon','편집']];
const $=s=>document.querySelector(s);
const nav=document.createElement('nav');nav.className='stepnav';nav.setAttribute('aria-label','작업 단계 이동');document.body.appendChild(nav);document.body.classList.add('has-stepnav');

function compo(){try{const m=JSON.parse(localStorage.getItem('rough-composition-v1')||'null');return m?.[m.mode||'webtoon']?.draft||null}catch(_){return null}}
const cutsOf=sc=>(sc.cuts||[]).filter(c=>String(c).trim()).length;
// 단계별 상태: [다 했는지, 짧은 요약]
function status(id){try{
  if(id==='chars'){const n=(typeof CHARS!=='undefined'?CHARS:[]).filter(c=>c.name?.trim()).length;return [n>0,n?`인물 ${n}명`:'인물 없음']}
  if(id==='world'){const w=typeof WORLD!=='undefined'?WORLD:null;return [!!w?.name,w?.name?`「${w.name}」`:'세계관 없음']}
  if(id==='plan'){const d=compo();const n=d?.scenes?.length||d?.plan?.scenes?.length||0;return [!!d,d?(n?`구성안 ${n}씬`:'구성안 있음'):'구성안 없음']}
  if(id==='write'){const s=typeof SCENES!=='undefined'?SCENES:[],c=s.reduce((n,sc)=>n+cutsOf(sc),0);return [c>0,`씬 ${s.length}개 · 컷 ${c}개`]}
  if(id==='layout'){const s=typeof SCENES!=='undefined'?SCENES:[],c=s.reduce((n,sc)=>n+cutsOf(sc),0);return [c>0,c?`컷 ${c}개 배치`:'씬 글이 없어요']}
  if(id==='webtoon'){const s=typeof SCENES!=='undefined'?SCENES:[];const ed=s.reduce((n,sc)=>n+(sc.pageEdits||[]).filter(e=>e&&Object.keys(e).length).length,0);
    const im=typeof IMG!=='undefined'?Object.keys(IMG.cut||{}).length:0;return [ed>0||im>0,im?`그림 ${im}컷 · 손본 컷 ${ed}개`:ed?`손본 컷 ${ed}개`:'아직 손대지 않음']}
}catch(_){}return [false,'']}
const cur=()=>{const v=typeof VIEW!=='undefined'?VIEW:'';return STEPS.findIndex(s=>s[0]===v)};

function paint(){const i=cur();if(i<0){nav.hidden=true;return}nav.hidden=false;
  const P=STEPS[i-1],N=STEPS[i+1];
  const side=(st,d)=>{if(!st)return d>0?`<button type="button" class="sn-btn sn-next" data-sn-x="export" title="마지막 단계 · 이미지·PSD·피그마로 내보내기"><span class="sn-lab"><small>마무리</small><b>내보내기</b></span><span class="sn-ar">›</span></button>`:'<span class="sn-none" aria-hidden="true"></span>';const [ok,sum]=status(st[0]);const n=STEPS.indexOf(st)+1;
    return `<button type="button" class="sn-btn sn-${d<0?'prev':'next'}" data-sn="${st[0]}" title="${d<0?'이전':'다음'}: ${n} ${st[1]}${sum?' · '+sum:''} (Alt+Shift+${d<0?'←':'→'})">${d<0?'<span class="sn-ar">‹</span>':''}<span class="sn-lab"><small>${d<0?'이전':'다음'}</small><b>${n} ${st[1]}</b></span>${d>0?'<span class="sn-ar">›</span>':''}</button>`};
  const h=side(P,-1)+`<ol class="sn-dots">${STEPS.map(([id,name],k)=>{const [ok,sum]=status(id);
      return `<li><button type="button" data-sn="${id}" class="${k===i?'on':''}${ok?' ok':''}" aria-current="${k===i?'step':'false'}" title="${k+1} ${name}${sum?' · '+sum:''}" aria-label="${k+1}단계 ${name}${ok?' (진행함)':''}"><i></i></button></li>`}).join('')}</ol><span class="sn-now" aria-hidden="true">${i+1}/${STEPS.length} ${STEPS[i][1]}</span>`+side(N,1);
  if(h!==nav._h){nav.innerHTML=h;nav._h=h}  // 그대로면 안 바꿈(올려 둔 마우스·포커스 유지)
  place()}

// 편집 화면은 캔버스(가운데 칸) 가운데에 — 양옆 패널을 가리지 않게
function place(){const c=typeof VIEW!=='undefined'&&VIEW==='webtoon'?$('.edcanvas'):null;
  if(c&&c.offsetParent){const r=c.getBoundingClientRect();nav.style.left=Math.round(r.left+r.width/2)+'px'}else nav.style.left=''}
addEventListener('resize',()=>requestAnimationFrame(place));

// 화면별 스크롤 위치 기억(편집 화면은 자체 위치 처리가 있어 제외)
const POS={};
function go(id){const i=cur();if(i>=0&&STEPS[i][0]!=='webtoon')POS[STEPS[i][0]]=scrollY;showView(id)}
nav.addEventListener('click',e=>{if(e.target.closest('[data-sn-x="export"]')){e.stopPropagation();const x=$('#wexport');x?.scrollIntoView?.({block:'nearest'});x?.click();return}const b=e.target.closest('[data-sn]');if(!b)return;go(b.dataset.sn)});
document.addEventListener('keydown',e=>{if(!e.altKey||!e.shiftKey||e.ctrlKey||e.metaKey||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'))return;
  if(document.querySelector('dialog[open]'))return;const i=cur();if(i<0)return;const j=i+(e.key==='ArrowRight'?1:-1);if(j<0||j>=STEPS.length)return;e.preventDefault();go(STEPS[j][0])});

{const _sv=showView;showView=function(v){const r=_sv(v);const y=POS[v];if(y&&v!=='webtoon')requestAnimationFrame(()=>scrollTo(0,y));paint();return r}}
// 상태(인물 수·컷 수 등)는 조용히 따라감: 저장할 때마다 다시 그리면 비싸서 2초에 한 번, 화면이 보일 때만
setInterval(()=>{if(document.visibilityState==='visible'&&!nav.hidden)paint()},2000);
// 예전 화면 아래의 「← 이전 / 다음 →」 줄은 이 바로 대신함
document.querySelectorAll('.view .next').forEach(el=>el.classList.add('sn-replaced'));
paint();
window.RoughStepNav={paint,go};
})();
