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
function switchScene(i){if(i<0||i>=SCENES.length)return;saveScenes();if(i!==SCUR&&typeof ctClearCopied==='function')ctClearCopied();SCUR=i;CUTS=SCENES[i].cuts;saveScenes();
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
const HL_TOK=/(\{[^{}\n]*\})|((?:^|(?<=\s))(-{1,3})[^\s-][^-\n]{0,10}?\3(?=\s|$|[.,!?]))|(@[^\s"“”.,!?{}()]+)|((?<![가-힣A-Za-z0-9_&#])#[가-힣A-Za-z_][가-힣A-Za-z0-9_]{0,19}(?:\([^()\n]{1,160}\))?)/g;
const HL_DLG=/^(?:@[^\s"“]+\s*)?["“].*["”]\s*[.!?…]*$/,HL_MIX=/["“][^"”]+["”]/;
const dirBad=t=>!!t.trim()&&RoughGrammar.derive({dir:RE.readDirs([t])}).unknown.length>0;
// {…} 안을 항목별로: 못 읽은 항목만 빨갛게
const dirHL=tok=>`<i class="h-dir">{${tok.slice(1,-1).split(/([,，·\/])/).map((x,k)=>k%2?esc(x):dirBad(x)?`<i class="bad">${esc(x)}</i>`:esc(x)).join('')}}</i>`;
function cutHL(text){return String(text??'').split('\n').map(line=>{const bare=line.replace(/\{[^{}\n]*\}/g,'').replace(/(^|\s)-{1,3}[^\s-][^-\n]{0,10}?-{1,3}(?=\s|$|[.,!?])/g,'$1').trim();
    const kind=!bare?'':HL_DLG.test(bare)?'dlg':/^\[.*\]$/.test(bare)?'cap':HL_MIX.test(bare)?'mix':'act';
    let o='',last=0;line.replace(HL_TOK,(m,d,sfx,_dash,at,pr,off)=>{o+=esc(line.slice(last,off));last=off+m.length;
      o+=d?dirHL(d):sfx?`<i class="h-sfx">${esc(m)}</i>`:pr?`<i class="h-prop">${esc(m)}</i>`:`<i class="h-who">${esc(m)}</i>`;return m});
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
    if(typeof loreHits==='function'){const pr=new Set((b.props||[]).map(x=>propOf(x.name)?.id).filter(Boolean));
      loreHits(RE.stripProps(CUTS[i])).forEach(e=>out.push(`<span${pr.has(e.id)?' class="propfix" title="#소품: 모든 컷에서 이 형태로 고정'+(e.desc?' — '+esc(e.desc):' · 형태는 세계관에서 적어 주세요')+'"':''}>◆ ${esc(e.name)}${pr.has(e.id)?'<small>고정</small>':''}</span>`));
      const nw=(b.props||[]).filter(x=>!propOf(x.name));if(nw.length)out.push(`<span class="newchar"><small>새 소품</small>${nw.map(x=>`<button type="button" data-propadd="${i}" title="세계관 물건에 「${esc(x.name)}」 고정${x.look?' — '+esc(x.look):''}">+ ◆${esc(x.name)}</button>`).join('')}</span>`);
      propClash(CUTS[i]).forEach(x=>out.push(`<span class="propclash" title="설정집 형태로 고정돼요. 바꾸려면 세계관 페이지에서 고쳐 주세요">◆ ${esc(x.name)}: 적은 형태와 설정집이 달라요 — 설정집 「${esc(x.e.desc.slice(0,40))}」</span>`))}
    {const un=unknownNames([CUTS[i]]);if(un.length)out.push(`<span class="newchar"><small>설정집에 없음</small>${un.map(n=>`<button type="button" data-sug="${esc(n)}" title="설정집 캐릭터에 「${esc(n)}」 추가">+ ${esc(n)}</button>`).join('')}</span>`)}
    // 쓰는 중 알림: 그/그녀를 누구로 읽었는지 · 동작은 있는데 누가 하는지 모름 · 한 컷에 동작 2개(앞 동작은 그림에서 빠짐 → 컷 나누기)
    const NR=window.RoughNAI;if(NR&&NR.readAction&&(b.actText||'').trim()){const t=b.actText.trim(),names=engineChars().map(c=>c.name).filter(Boolean),ra=NR.readAction(t,names,b.who||'');
      if(b.whoGuess)out.push(`<span class="readhint" title="'그·그녀'를 앞 컷에 나온 인물로 읽었어요 · 다른 사람이면 @이름으로 적어 주세요"><small>그·그녀</small>→ ${esc(b.who)}</span>`);
      else if(!b.who&&names.length&&NR.poseTags(t).length&&!ra.crowd.length)out.push(`<span class="readhint warn" title="동작은 읽었는데 누가 하는지 몰라요 · @이름으로 적으면 그 인물 프롬프트에 들어가요"><small>누가?</small>@이름을 붙여 주세요</span>`);
      const sq=ra.dropped.find(d=>d.why==='seq'&&d.last&&/고$/.test(d.word));
      if(sq)out.push(`<span class="readhint"><small>동작 2개</small>「${esc(sq.word)}」 앞 동작은 그림에서 빠져요 <button type="button" data-cutsplit="${i}" data-w="${esc(sq.word)}" title="「${esc(sq.word)}」 뒤에서 컷을 둘로 나눠요 · Ctrl+Z로 되돌리기">컷 나누기</button></span>`)}
    // 효과음 추천: 효과음이 없는 컷에만, 눌러서 바로 넣기(sfx-rec.js)
    if(window.RoughSfxRec&&!(b.sfx||[]).length){const emo=(state.panels||[]).find(p=>String(p.key||'').startsWith('#'+i+':'))?.emo;
      const rs=RoughSfxRec.recommend(CUTS[i],emo,3);if(rs.length)out.push(`<span class="sfxrec"><small>효과음</small>${rs.map(r=>`<button type="button" data-sfxadd="${esc(r.word)}" data-i="${i}" title="${esc(r.why)} 때문에 추천 · ${esc(r.cat)}">+ ${esc(r.word)}</button>`).join('')}</span>`)}
    el.innerHTML=out.join('')});
  const m=$('#scmeta2');if(m)m.textContent=`대사 ${nd} · 식자 ${nc} · 효과음 ${ns}`}
const cutChanged=()=>{saveCuts();scSaved();clearTimeout(tmr);tmr=setTimeout(()=>{ensureProps(CUTS,{withLookOnly:true});compute(true);renderSlots();renderSugg();renderParse()},350)};
let scSavedAt=0;function scSaved(){scSavedAt=Date.now();scSaveLabel()}
function scSaveLabel(){const el=$('#scsave');if(!el)return;if(SAVE_FAIL){saveFailLabel();return}if(!scSavedAt)return;const s=Math.round((Date.now()-scSavedAt)/1000);el.textContent=s<5?'저장됨 · 방금':s<60?`저장됨 · ${s}초 전`:`저장됨 · ${Math.round(s/60)}분 전`;el.classList.add('on')}
setInterval(scSaveLabel,5000);
$('#cutlist').addEventListener('input',e=>{const t=e.target.closest('.cutin');if(!t)return;CUTS[+t.closest('li').dataset.i]=t.value;grow(t);syncHL(t);cutChanged();mSel=0;showMbox()});
$('#cutlist').addEventListener('focusin',e=>{const t=e.target.closest('.cutin');if(t)TA=t});
$('#cutlist').addEventListener('focusout',e=>{const t=e.target.closest('.cutin');if(!t)return;if(ensureProps([t.value]).added.length)renderParse();const r=splitMixed(t.value);if(!r.n||r.text===t.value)return;
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
// 컷 나누기(쓰는 중 알림): 「…고」 뒤에서 둘로 — 앞 컷은 '…다.'로 끝내고, 뒤 컷은 같은 인물(@이름)로 시작, 그 뒤 줄(대사 등)은 뒤 컷으로
function splitCutAt(i,w){const lines=String(CUTS[i]||'').split('\n'),k=lines.findIndex(l=>l.includes(w+' '));if(k<0)return;
  const L=lines[k],at=L.indexOf(w+' '),head=L.slice(0,at)+w.replace(/고$/,'다.'),rest=L.slice(at+w.length+1).trim(),who=(head.match(/@[^\s"“.,!?{}()]+/)||[''])[0].replace(/(이|가|은|는|도)$/,'');
  const a=[...lines.slice(0,k),head].join('\n'),b2=[(who&&!/^@/.test(rest)?who+' ':'')+rest,...lines.slice(k+1)].join('\n');
  if(typeof edRecord==='function'){edRecord();edLast=0}
  const n=CUTS.length;remapCuts(SCUR,()=>{cutEdits().splice(i+1,0,null);CUTS[i]=a;CUTS.splice(i+1,0,b2);return moveMap(n,x=>x>i?x+1:x)});renderCuts();cutChanged();toast('컷을 둘로 나눴어요 · Ctrl+Z로 되돌리기',2000)}
$('#cutlist').addEventListener('mousedown',e=>{if(e.target.closest('[data-cutsplit]'))e.preventDefault()});
$('#cutlist').addEventListener('click',e=>{const b=e.target.closest('[data-cutsplit]');if(b)splitCutAt(+b.dataset.cutsplit,b.dataset.w)});
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
  const sp=a>0&&!/\s/.test(t.value[a-1])?' ':'';
  const [pre,post]=k==='caption'?[nl+'[',']']:k==='sfx'?[' -','- ']:k==='prop'?[sp+'#','']:[nl+'@',''];
  t.value=t.value.slice(0,a)+pre+sel+post+t.value.slice(z);const c=a+pre.length+sel.length;t.setSelectionRange(c,c);TA=t;
  t.dispatchEvent(new Event('input',{bubbles:true}))});
// 연출 넣기 메뉴: 누르면 지금 줄 끝에 {…}. 같은 줄에 이미 {…}가 있으면 그 안에 쉼표로 이어 붙임
const DIR_MENU=[['샷',['설정','전경','전신','중경','클로즈업','디테일','효과 배경']],['앵글',['아이레벨','하이앵글','로우앵글','탑뷰']],
  ['감정',['감정 설렘','감정 긴장','감정 놀람','감정 분노','감정 당황','감정 쓸쓸','감정 결의','감정 다정','감정 기쁨','감정 의아','감정 냉담','감정 회상','감정 개그','감정 평온']],
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
