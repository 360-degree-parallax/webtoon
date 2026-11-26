// 러프 툴 본체 6/6 — 보기 전환·프롬프트 시안·작화·데이터베이스·시작
// 원본 조각: tools/build_app.py가 6개를 순서대로 이어 rough/app.js를 만듦(사이트는 app.js 하나를 실음 — 조각끼리 불러올 때 서로 부르는 곳이 많아 따로 싣지 않음)
// ---------- 보기 전환 ----------
let VIEW='nai';
function showView(v){if(v==='nai')v='layout';
  // 콘티를 떠나면 '복사했어요' 표시와 붙여 넣기 대상 컷을 풂(돌아왔을 때 예전 복사 표시가 남지 않게)
  if(VIEW==='layout'&&v!=='layout')ctClearCopied();
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
  if(v==='webtoon'){renderWebtoon();refreshPageMaterials()}
  if(v==='webtoon'&&matchMedia('(max-width:760px)').matches&&window.RoughStudio?.fitWidth)requestAnimationFrame(()=>RoughStudio.fitWidth());
  edSwitch(v);$('#gundo').hidden=!(v==='write'||v==='layout');
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
const CT_EDIT=new Set(),CT_BUSY=new Set();
const CT_EMOS=['평온','개그','설렘','기쁨','다정','당황','의아','놀람','긴장','냉담','분노','쓸쓸','회상','결의'];
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
// 컷별 지시사항: 씬마다 컷 번호로 저장. 컷 프롬프트 생성(씬 전체)에도 note로 같이 보냄(서명에는 넣지 않음 — 지시만 적어도 '예전 것' 표시가 뜨지 않게)
var CTNOTE;try{CTNOTE=JSON.parse(localStorage.getItem('rough-ct-note')||'{}')}catch(_){CTNOTE={}}
const ctNote=i=>(CTNOTE[SCENES[SCUR].id]||{})[i]||'';
function setCtNote(i,v){const sid=SCENES[SCUR].id,m=CTNOTE[sid]||={};if(v.trim())m[i]=v;else delete m[i];if(!Object.keys(m).length)delete CTNOTE[sid];try{localStorage.setItem('rough-ct-note',JSON.stringify(CTNOTE))}catch(_){}}
const withNotes=pl=>({...pl,cuts:pl.cuts.map(c=>{const n=ctNote(c.n-1).trim();return n?{...c,note:n}:c})});
async function naiRefine(){if(naiBusy)return;if(!state.panels.length){toast('컷이 없어요');return}
  if(!AIKEY){openKey(naiRefine);return}const st=t=>{$('#naist').textContent=t;NAI_MSG=t;naiBtnSync()};naiBusy=true;NAI_ERR=false;NAI_DONE=0;$('#naibtn').disabled=true;st('Claude에 보내는 중… 컷이 많으면 1분 안팎 걸려요');const sid=SCENES[SCUR].id,payload=naiPayload();
  let mod;try{mod=await import('./claude.js');const r=await mod.refineNai(AIKEY,withNotes(payload),{onStatus:st});
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
    return `<div class="naichar"><span class="av" style="${im?'':`background:${avBg(c.name)}`}">${im?`<img src="${im.src}" alt="">`:esc(c.name.slice(0,1))}</span><b>${esc(c.name)}${src?`<em class="art-src${src==='자동'?' auto':''}">${src}</em>`:''}</b><input data-naitag="${esc(c.name)}" value="${esc(v)}" spellcheck="false" aria-label="${esc(c.name)} 태그" placeholder="예: 1girl, brown hair, ponytail, maid"><button class="link naidel" data-act="naireset" data-n="${esc(c.name)}" title="이 인물 태그 지우기 · 비우면 특징 글에서 자동으로 만들어요"${NAITAGS[c.name]==null?' hidden':''}>지우기</button></div>`}).join(''):'<p class="empty">캐릭터 페이지에 인물을 넣어주세요.</p>';
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
var CT_EMPTY=false,CT_CUR=-1,CT_COPIED=new Set();
function ctClearCopied(){CT_COPIED.clear();if(target&&target.kind==='cut')target=null}
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
  const head=`<div class="ct-head"><div class="ct-hrow"><h2 data-work>${esc(sc.title||'제목 없는 씬')}</h2><span class="grow"></span><button class="link" data-act="naidown" title="이 씬 모든 컷 프롬프트를 txt로">프롬프트 저장</button><button class="tpill" data-act="nairefine">컷 프롬프트 생성</button></div><div class="ct-ratio"><label>컷 비율 기준 <select data-ratioref aria-label="컷 비율 기준">${ratioOptions()}</select></label><small>${ratioNote()}</small><label class="ct-fit" title="켜면 그림을 넣은 컷도 칸 높이를 컷 비율로 두고 그림을 칸에 꽉 채워 잘라요 · 끄면 넣은 그림 비율대로 칸 높이가 바뀌어요"><input type="checkbox" data-fitratio${FIT_RATIO?' checked':''}> 넣은 그림도 컷 비율로 맞추기</label></div><p class="ct-naist" aria-live="polite"></p>${NAISTYLE===NAI_STYLE_DEF&&!Object.keys(ARTGEN.chars).length?'<p class="ct-hint">작화 프롬프트를 먼저 만들면 컷마다 화풍이 맞춰져요</p>':''}
    <p class="ct-sub">${done===n?'모든 컷에 그림을 넣었어요':done?`그림 ${n-done}장만 더 넣으면 돼요`:'컷마다 프롬프트를 복사해 그림을 만들고 넣어 주세요'}${ai?(ai.stale?' · <span class="ct-warn">현재 초안을 표시 중이에요 · 컷 프롬프트를 다시 생성할 수 있어요</span>':' · 생성한 컷 프롬프트예요'):''}</p>
    <div class="ct-progw"><div class="ct-prog" role="progressbar" aria-label="그림 넣은 컷" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}"><i style="width:${pct}%"></i></div><span>${done}/${n}</span></div>
</div>
    <nav class="ct-nav" aria-label="컷 이동"><div class="ct-dots">${L.map(({i})=>`<button type="button" class="ct-dot${has[i]?' on':''}${i===CT_CUR?' cur':''}" data-ctgo="${i}" title="${i+1}번 컷 · ${has[i]?'그림 있음':'그림 없음'}">${has[i]?'✓':i+1}</button>`).join('')}</div>
      <label class="ct-filter"><span>빈 컷만</span><input type="checkbox" role="switch" data-ctempty${CT_EMPTY?' checked':''}><i aria-hidden="true"></i></label>
      <span class="ct-keys" title="J·K 다음·이전 컷 · C 지금 컷 프롬프트 복사 · Ctrl+V 복사한 컷에 그림 붙여 넣기"><span><kbd>J</kbd><kbd>K</kbd>이동</span><span><kbd>C</kbd>복사</span><span><kbd>Ctrl</kbd><kbd>V</kbd>붙여 넣기</span></span></nav>`;
  el.innerHTML=head+L.map(({p,i,o})=>{const im=cutImg(SCUR,i,p),ref=p.ref;
    return `<article class="ccard${CT_COPIED.has(i)?' copied':''}${i===CT_CUR?' cur':''}" data-ct="${i}"${CT_EMPTY&&im?' hidden':''}>
      <header><b class="ct-no">컷 ${i+1}</b><div class="ct-beat"><p data-work>${esc(p.act)}</p><small>${esc([o.focus,p.shot,p.ang,p.emo].filter(Boolean).join(' · '))} · ${o.size.w}×${o.size.h}${o.size.exact?'':` <span class="ct-crop" title="생성 후 ${esc(o.size.crop)}">자르기</span>`}</small></div>${o.ai?'<span class="tag">Claude</span>':''}<button type="button" class="ct-edbtn" data-ctedit="${i}" aria-expanded="${CT_EDIT.has(i)}" title="이 컷의 구도·감정·길이를 고치고 프롬프트를 이 컷만 다시 만들어요">${CT_EDIT.has(i)?'수정 닫기':'이 컷 수정'+(ctNote(i).trim()||['shot','ang','emo','h'].some(f=>p.dir&&p.dir[f]!=null)?' •':'')}</button><button type="button" class="ct-del" data-ctdel="${i}" title="이 컷을 씬에서 지워요 · 씬·편집에도 반영 · Ctrl+Z로 되돌리기" aria-label="${i+1}번 컷 지우기">지우기</button></header>
      ${CT_EDIT.has(i)?ctEditor(p,i):''}
      <div class="ct-body">
        <div class="ct-art"><div class="drop ct-drop${im?' has':''}" style="aspect-ratio:${o.size.w}/${o.size.h}" tabindex="0" role="button" data-cutslot="${i}" aria-label="${i+1}번 컷 그림 ${im?'바꾸기':'넣기'}">${im?`<img src="${im.src}" alt="${i+1}번 컷"><span class="ct-swap" aria-hidden="true">그림 바꾸기</span><button class="x" data-delcut="${i}" aria-label="${i+1}번 컷 그림 빼기">×</button>`:`${ref?`<img class="ct-ref" src="${ref.thumb||ref.src}" alt="">`:''}<span class="ct-plus"><b>+</b>그림 넣기<small>${CT_COPIED.has(i)?'Ctrl+V로 붙여 넣기':'끌어다 놓아도 돼요'}</small></span>`}</div></div>
        <div class="ct-prompt"><div class="ct-ph"><span>NovelAI 프롬프트</span><button class="tpill${CT_COPIED.has(i)?' done':''}" data-act="ncopyall" data-i="${i}">${CT_COPIED.has(i)?'✓ 복사했어요':'프롬프트 복사'}</button></div>
          ${ctBlk('기본 프롬프트',o.base,dim)}${o.chars.map((c,n)=>ctBlk(`캐릭터 ${n+1} · ${esc(c.name)} <small>위치 ${c.pos.cell}</small>`,c.prompt,dim)).join('')}</div>
      </div></article>`}).join('')+(CT_EMPTY&&done===ps.length?'<p class="empty ct-alldone">모든 컷에 그림이 있어요</p>':'')}
// 콘티에서 샷·앵글·감정 바꾸기: 컷 글의 {…} 연출 지시로 적음 → 씬 글·판정·러프·프롬프트·편집이 모두 같은 값을 봄
const CT_DIR={shot:['샷'],ang:['앵글'],emo:['감정'],h:['길이']};
const panelVal=(p,f)=>f==='h'?lenWord(p.h):p[f];
const cutIdxOf=p=>{const m=String(p?.key||'').match(/^#(\d+):/);return m?+m[1]:-1};
// 같은 종류의 지시는 글 전체에서 지우고, 값이 있으면 첫 줄 끝 {…}에 이어 붙임
function writeDir(text,f,val){const cat=x=>{const d=RE.readDirs([x]);return !!d[f]};
  let lines=String(text||'').split('\n').map(l=>l.replace(/\{([^{}\n]*)\}/g,(m,inner)=>{const ts=inner.split(/[,，·\/]/).map(x=>x.trim()).filter(Boolean).filter(x=>!cat(x));return ts.length?`{${ts.join(', ')}}`:''}).replace(/[ \t]{2,}/g,' ').replace(/\s+$/,''));
  if(val){const tok=f==='emo'?'감정 '+val:f==='h'?'길이 '+val:val;let k=lines.findIndex(l=>l.trim());if(k<0){lines=[`{${tok}}`];k=0}else{const l=lines[k],m=l.match(/\{([^{}]*)\}\s*$/);lines[k]=m?l.slice(0,m.index)+`{${m[1].trim()}, ${tok}}`:l+` {${tok}}`}}
  return lines.join('\n')}
function setCutDir(i,f,val){const p=state.panels[i],k=cutIdxOf(p);if(!p||k<0||CUTS[k]==null)return;
  const next=writeDir(CUTS[k],f,val);if(next===CUTS[k])return;if(locks[p.key])delete locks[p.key][f];
  CUTS[k]=next;saveScenes();compute(false);renderNai();
  const now=state.panels[i];toast(`${i+1}번 컷 ${CT_DIR[f][0]}: ${val?val:'자동 · '+(now?panelVal(now,f):'')}${ainFor()?.cuts?.some(c=>c.n===i+1)?' · 이 컷 다시 생성을 누르면 프롬프트에 반영돼요':''}`,2600)}
function ctGo(i,smooth=true){const L=state.panels.length;if(!L)return;i=Math.max(0,Math.min(L-1,i));CT_CUR=i;
  $('#conti').querySelectorAll('.ccard').forEach(c=>c.classList.toggle('cur',+c.dataset.ct===i));$('#conti').querySelectorAll('.ct-dot').forEach(d=>d.classList.toggle('cur',+d.dataset.ctgo===i));
  const c=$('#conti').querySelector(`.ccard[data-ct="${i}"]`);if(c&&!c.hidden)c.scrollIntoView({block:'start',behavior:smooth?'smooth':'auto'})}
{const el=$('#conti');
  el.addEventListener('click',e=>{const x=e.target.closest('[data-ctdel]');if(x){e.stopPropagation();contiDelete(+x.dataset.ctdel);return}});
  el.addEventListener('click',e=>{const x=e.target.closest('[data-ctedit]');if(x){e.stopPropagation();const i=+x.dataset.ctedit;CT_EDIT.has(i)?CT_EDIT.delete(i):CT_EDIT.add(i);renderConti();return}
    const g=e.target.closest('[data-ctregen]');if(g){e.stopPropagation();const i=+g.dataset.ctregen;contiRegenCut(i,g.closest('.ct-edit')?.querySelector('textarea')?.value.trim()||'');return}
    const a=e.target.closest('[data-ctauto]');if(a){e.stopPropagation();ctAuto(+a.dataset.ctauto)}});
  // 샷·앵글·감정·길이: 컷 글에 {…}로 적어 씬 글·편집·다시 열기에도 남음
  el.addEventListener('change',e=>{const s=e.target.closest('[data-ctf]');if(!s)return;setCutDir(+s.closest('.ct-edit').dataset.i,s.dataset.ctf,s.value)});
  el.addEventListener('change',e=>{if(!e.target.matches('[data-ctfit]'))return;const i=+e.target.closest('.ct-edit').dataset.i,k=cutIdxOf(state.panels[i]);if(k<0)return;setCutFit(k,e.target.value);renderConti();toast(`${i+1}번 컷 칸 높이: ${e.target.value==='ratio'?'컷 비율':e.target.value==='img'?'넣은 그림 비율':'작품 설정대로'}`)});
  el.addEventListener('change',e=>{if(!e.target.matches('[data-fitratio]'))return;setFitRatio(e.target.checked)});
  el.addEventListener('click',e=>{const d=e.target.closest('[data-ctgo]');if(d){if(CT_EMPTY&&$('#conti').querySelector(`.ccard[data-ct="${d.dataset.ctgo}"]`)?.hidden){CT_EMPTY=false;renderConti()}ctGo(+d.dataset.ctgo);return}
    const c=e.target.closest('.ccard');if(c){CT_CUR=+c.dataset.ct;el.querySelectorAll('.ct-dot').forEach(x=>x.classList.toggle('cur',+x.dataset.ctgo===CT_CUR));el.querySelectorAll('.ccard').forEach(x=>x.classList.toggle('cur',x===c))}
    const a=e.target.closest('[data-act="ncopyall"]');if(a){const i=+a.dataset.i;CT_COPIED.add(i);CT_CUR=i;target={kind:'cut',key:String(i)};setTimeout(renderConti,0);toast(`${i+1}번 컷 프롬프트를 복사했어요 · 생성한 그림을 Ctrl+V로 붙여 넣으면 이 컷에 들어가요`,2600)}});
  el.addEventListener('change',e=>{if(e.target.matches('[data-ctempty]')){CT_EMPTY=e.target.checked;renderConti()}});
  el.addEventListener('input',e=>{const n=e.target.dataset.ctnote;if(n!=null)setCtNote(+n,e.target.value)});
  el.addEventListener('keydown',e=>{const n=e.target.dataset?.ctnote;if(n!=null&&e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();contiRegenCut(+n,e.target.value.trim())}});
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
  else if(a==='naireset'){delete NAITAGS[el.dataset.n];saveNaiTags();renderNai();toast(`${el.dataset.n} 태그를 지웠어요 · 특징 글에서 자동으로 만들어요`)}});
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
{const Q=[['ratio-profiles.js',()=>applyRatio()],['shot-model.js',()=>window.RoughShot?.shot&&RE.useShotModel(window.RoughShot)],
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
    if(k==='go'){let nc=0,nl=0;const added=[],hints={};items.forEach((x,n)=>{const v=pick[n];
        if(v==='char'){CHARS.push({name:x.name.trim(),aliases:x.aliases||'',body:x.body==='male'?'male':'female',look:''});added.push(x.name.trim());if(x.look)hints[x.name.trim()]=`구성 정리 메모(외형): ${x.look}${x.where?` · 나오는 곳: ${x.where}`:''}`;nc++}
        else if(v==='lore'){LORE.push({id:'l'+Date.now().toString(36)+n,name:x.name.trim(),cat:LORE_CAT[x.cat]?x.cat:'term',keys:x.keys||'',desc:x.desc||'',tags:x.tags||''});nl++}});
      if(nc){saveChars();if(VIEW==='chars')renderChars()}if(nl){saveWorld();if(VIEW==='world')renderWorld()}
      if(nc||nl){try{compute(false)}catch(_){}toast([nc&&`캐릭터 ${nc}명`,nl&&`세계관 항목 ${nl}개`].filter(Boolean).join(' · ')+`를 설정집에 추가했어요${added.length?' · 캐릭터 외형을 구성·씬 글로 추론하는 중…':''}`,2600)}
      if(added.length)inferChars(added,{hints})}
    d.close()};
  d.showModal()}

// ---------- 컷 비율 기준(상용 웹툰 실측) ----------
// rough/ratio-profiles.js: 연출 DB 9작품의 그림 상자 높이/폭(샷별 10·50·90%). 기본은 전체 평균, 작품을 고르면 그 작품 비율로, '엔진 그대로'는 끔
function ratioRef(){try{return localStorage.getItem('rough-ratio-ref')||'__all'}catch(_){return '__all'}}
function applyRatio(){const R=window.RoughRatio;if(!R)return false;const k=ratioRef();
  if(k==='off'){RE.useRatio(null);return true}const P=R[k]||R.__all;RE.useRatio(P,k==='__all'||!R[k]?'상용 평균':k);return true}
function ratioOptions(){const R=window.RoughRatio||{},k=ratioRef(),o=(v,l)=>`<option value="${esc(v)}"${v===k?' selected':''}>${esc(l)}</option>`;
  return o('__all','상용 웹툰 평균 (9작품)')+Object.keys(R).filter(w=>w!=='__all').sort().map(w=>o(w,`${w} 비율 (중앙 ${R[w].all[1]})`)).join('')+o('off','엔진 그대로')}
function ratioNote(){const R=window.RoughRatio,k=ratioRef();if(!R)return '';if(k==='off')return '엔진이 정한 길이를 그대로 써요';const P=R[k]||R.__all;
  return `세로/가로 중앙 ${P.all[1]} · 보통 ${P.all[0]}~${P.all[2]} · 샷마다 그 작품 실측에 맞춰요`}
document.addEventListener('change',e=>{const s=e.target.closest('[data-ratioref]');if(!s)return;try{localStorage.setItem('rough-ratio-ref',s.value)}catch(_){}
  applyRatio();compute(false);if(VIEW==='layout'){renderNai();renderConti()}const R=window.RoughRatio;
  toast(s.value==='off'?'컷 길이를 엔진 그대로 써요':`컷 비율을 ${s.value==='__all'?'상용 웹툰 평균':s.value}에 맞췄어요 · 편집 화면에도 반영돼요`,2400)});

// ---------- 콘티 컷 하나 상세 수정 ----------
// 샷·앵글·감정·길이를 이 컷만 바꾸고(컷 글의 {…} 지시로 저장 → 씬·편집·다시 열기에도 남음), 작가 요청(씬별 저장)을 적어 프롬프트를 이 컷만 Claude로 다시 만듦
function ctEditor(p,i){const L=p.dir||{},has=f=>L[f]!==undefined&&L[f]!==null,sel=(f,list,cur,auto,lab)=>`<label><span>${lab}</span><select data-ctf="${f}" class="${has(f)?'set':''}"><option value="">${has(f)?'↺ 자동으로':`자동 · ${esc(cur??'')}`}</option>${list.map(([l,v])=>`<option value="${esc(v)}"${has(f)&&String(L[f])===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  const busy=CT_BUSY.has(i);
  return `<div class="ct-edit" data-i="${i}"><div class="ct-edrow">${sel('shot',RE.SHOTS.map(x=>[x,x]),p.shot,p.auto?.shot,'샷')}${sel('ang',RE.ANGLES.map(x=>[x,x]),p.ang,p.auto?.ang,'앵글')}${sel('emo',CT_EMOS.map(x=>[x,x]),p.emo,p.auto?.emo||p.emo,'감정')}${sel('h',LEN.map(([w,h])=>[w,h]),lenWord(p.h),p.auto?lenWord(p.auto.h):'','길이')}<label><span>칸 높이</span><select data-ctfit><option value="">작품 설정 · ${FIT_RATIO?'컷 비율':'그림 비율'}</option><option value="ratio"${cutEdits()[cutIdxOf(p)]?.fit==='ratio'?' selected':''}>컷 비율(그림은 잘라서 채움)</option><option value="img"${cutEdits()[cutIdxOf(p)]?.fit==='img'?' selected':''}>넣은 그림 비율</option></select></label>
    ${['shot','ang','emo','h'].some(has)?`<button type="button" class="link" data-ctauto="${i}">엔진 값으로</button>`:''}</div>
    <label class="ct-edreq"><span>프롬프트 요청 <small>씬별로 저장 · 컷 프롬프트 생성(씬 전체)에도 같이 보내요</small></span><textarea rows="2" data-ctnote="${i}" maxlength="500" placeholder="예: 비 오는 밤, 역광, 손에 든 편지를 강조 · Ctrl+Enter로 다시 생성">${esc(ctNote(i))}</textarea></label>
    <div class="ct-edact"><span class="ct-edst" aria-live="polite">${esc(CT_MSG[i]||'')}</span><span class="grow"></span><button type="button" class="tpill${busy?' busy':''}" data-ctregen="${i}"${busy?' disabled':''}>${busy?'<i class="spin" aria-hidden="true"></i>생성 중…':'이 컷 프롬프트 다시 생성'}</button></div></div>`}
const CT_MSG={};
// 엔진 값으로: 이 컷 글의 샷·앵글·감정·길이 지시를 모두 지움
function ctAuto(i){const p=state.panels[i],k=cutIdxOf(p);if(!p||k<0)return;let x=CUTS[k];for(const f of ['shot','ang','emo','h'])x=writeDir(x,f,'');delete locks[p.key];if(x!==CUTS[k]){CUTS[k]=x;saveScenes()}compute(false);renderNai();toast('이 컷을 엔진 값으로 되돌렸어요')}
async function contiRegenCut(i,req){if(CT_BUSY.has(i))return;if(!AIKEY){openKey(()=>contiRegenCut(i,req));return}
  setCtNote(i,req);CT_BUSY.add(i);CT_MSG[i]='Claude에 보내는 중…';renderConti();const sid=SCENES[SCUR].id,payload=naiPayload();
  let mod;try{mod=await import('./claude.js');const r=await mod.refineNaiCut(AIKEY,payload,i+1,req,{onStatus:t=>{CT_MSG[i]=t;const x=$('#conti')?.querySelector(`.ct-edit[data-i="${i}"] .ct-edst`);if(x)x.textContent=t}});
    const prev=AIN[sid],cuts=(prev&&!ainFor()?.stale?prev.cuts:[]).filter(c=>c.n!==i+1).concat([r.cut]);
    AIN[sid]={sig:sigOf(naiPayload()),cuts,model:r.model,at:Date.now()};try{localStorage.setItem('rough-ai-nai',JSON.stringify(AIN))}catch(_){}
    NAIVIEW='ai';CT_MSG[i]=`✓ ${i+1}번 컷 프롬프트를 새로 만들었어요`;toast(CT_MSG[i],2200)}
  catch(err){console.warn(err);CT_MSG[i]='생성하지 못했어요 · '+(mod?mod.explain(err):'Claude 모듈을 불러오지 못했어요');if(err?.status===401){setKey('',null);openKey(()=>contiRegenCut(i,req))}}
  finally{CT_BUSY.delete(i);if(SCENES[SCUR].id===sid&&VIEW==='layout'){renderNai();renderConti()}}}

// 넣은 그림도 컷 비율로 맞추기: 작품 전체 설정 / 컷 하나(pageEdits.fit)
function setFitRatio(on){FIT_RATIO=!!on;try{localStorage.setItem('rough-fit-ratio',on?'1':'0')}catch(_){}SA_CACHE?.clear?.();if(VIEW==='layout')renderConti();if(VIEW==='webtoon')renderWebtoon();render?.();
  toast(on?'그림을 넣은 컷도 컷 비율로 맞춰요 · 그림은 칸에 꽉 채워 잘려요(편집에서 끌어 위치 조정)':'그림을 넣은 컷은 그림 비율대로 칸 높이를 정해요',2600)}
function setCutFit(slot,v,si=SCUR){const sc=SCENES[si];if(!sc)return;const e=sc.pageEdits||(sc.pageEdits=[]);if(v){(e[slot]||(e[slot]={})).fit=v}else if(e[slot])delete e[slot].fit;saveScenes();SA_CACHE?.clear?.()}
