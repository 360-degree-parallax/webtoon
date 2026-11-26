// 러프 툴 본체 2/6 — 설정집: 인물·캐릭터 보관함·세계관
// 원본 조각: tools/build_app.py가 6개를 순서대로 이어 rough/app.js를 만듦(사이트는 app.js 하나를 실음 — 조각끼리 불러올 때 서로 부르는 곳이 많아 따로 싣지 않음)
// ---------- 인물 설정 ----------
const NOTP=/하늘|거리|배경|풍경|장소|정원|복도|방$|집$|도시|건물|골목|숲|바다|교실/;
let CHARS=[];
const DEFAULT_CHARS=[{name:'에드가',aliases:'',body:'male',look:'저택의 수석 하인. 늘 존댓말을 쓰고 표정 변화가 적다. 감정을 드러내지 않으려 하지만 준 앞에서는 말끝이 흐려진다. 생각할 때 장갑 낀 손끝을 만지는 버릇이 있다. 키가 크고 자세가 곧다.'},{name:'준',aliases:'',body:'female',look:'저택에 들어온 지 얼마 안 된 하녀. 밝고 말이 빠르며 감정이 얼굴에 그대로 드러난다. 실수가 잦지만 금방 털고 일어난다. 에드가를 어려워하면서도 자꾸 말을 건다.'}];
// 기본 인물의 외형 태그(NovelAI) — 처음 열었을 때만 채움
const DEFAULT_TAGS={'에드가':'black hair, short hair, slicked back hair, green eyes, tall, butler, black tailcoat, white bowtie, white gloves','준':'brown hair, long hair, ponytail, brown eyes, maid, maid headdress, black dress, white apron'};
// 예전 기본 문구(외형을 글로 적던 시절)를 손대지 않았으면 새 특징 문구로 바꾸고 태그를 채운다
const OLD_DEFAULT_LOOK={'에드가':['금발 짧은 머리, 초록 눈, 검은 연미복과 흰 장갑을 낀 하인','검은 머리를 넘긴 짧은 머리, 초록 눈, 검은 연미복과 흰 나비넥타이 차림의 하인'],'준':['밤색 머리를 하나로 묶은 하녀, 갈색 눈, 앞치마 차림']};
let FRESH_CHARS=false;
try{const v=localStorage.getItem('rough-chars');FRESH_CHARS=!v;CHARS=v?JSON.parse(v):DEFAULT_CHARS.map(c=>({...c}))}catch(_){FRESH_CHARS=true;CHARS=DEFAULT_CHARS.map(c=>({...c}))}
const OLD_DEFAULT_HIT=[];CHARS.forEach(c=>{if((OLD_DEFAULT_LOOK[c.name]||[]).includes(c.look)){c.look=DEFAULT_CHARS.find(d=>d.name===c.name).look;OLD_DEFAULT_HIT.push(c.name)}});
function saveChars(){try{localStorage.setItem('rough-chars',JSON.stringify(CHARS))}catch(_){}}
function engineChars(){return CHARS.filter(c=>c.name.trim()).map(c=>({name:c.name.trim(),aliases:String(c.aliases||'').split(/[,·]/).map(x=>x.trim()).filter(Boolean)}))}
// 등장인물 카드 (캐릭터챗 프로필 카드 형태) + 프로필 편집 창
var NAITAGS;try{NAITAGS=JSON.parse(localStorage.getItem('rough-nai-tags')||'{}')}catch(_){NAITAGS={}}
const saveNaiTags=()=>{try{localStorage.setItem('rough-nai-tags',JSON.stringify(NAITAGS))}catch(_){}};
{const fill=n=>{if(DEFAULT_TAGS[n]&&!NAITAGS[n])NAITAGS[n]=DEFAULT_TAGS[n]};if(FRESH_CHARS)CHARS.forEach(c=>fill(c.name));OLD_DEFAULT_HIT.forEach(fill);if(FRESH_CHARS||OLD_DEFAULT_HIT.length){saveNaiTags();saveChars()}}
const hueOf=n=>{let h=0;for(const ch of String(n))h=(h*31+ch.charCodeAt(0))%360;return h};
const avBg=n=>`hsl(${hueOf(n)} 32% 52%)`;
function charTags(c){return (NAITAGS[c.name]??window.RoughNAI.lookTags(c.look).join(', ')).split(',').map(t=>t.trim()).filter(Boolean)}
function charStat(name){const bs=RE.parseCuts(CUTS,engineChars());return{cuts:bs.filter(b=>b.who===name||(b.act||'').includes(name)).length,lines:bs.reduce((a,b)=>a+(b.dialogs||[]).filter(d=>d.who===name).length,0)}}
// 외형 칸 예시: NovelAI 태그 형태(성별에 맞춰)
const tagEx=c=>c.body==='male'?'예: 1boy, black hair, short hair, slicked back hair, green eyes, tall, tailcoat, white bowtie':'예: 1girl, brown hair, long hair, ponytail, brown eyes, maid, apron, white headdress';
function charCard(c,i){const n=c.name.trim(),im=n&&IMG.char[n],st=n?charStat(n):{cuts:0,lines:0};
  return `<article class="cedit" data-ci="${i}" data-old="${esc(n)}">
    <div class="ce-side"><div class="drop ce-img${im?' has':''}" data-cimg tabindex="0" role="button" aria-label="${esc(n||'캐릭터')} 대표 이미지" style="${im?'':`background:${avBg(n||'?')}`}">${im?`<img src="${im.src}" alt=""><button class="x" data-cimgdel aria-label="이미지 지우기">×</button>`:`<span class="ini">${esc((n||'?').slice(0,1))}</span><small>+ 대표 이미지</small>`}</div>
      ${im?`<div class="pal">${im.palette.map(h=>`<i style="background:${h}" title="${h}"></i>`).join('')}</div>`:''}</div>
    <div class="ce-f">
      <div class="ce-top"><input class="ce-name" data-ck="name" value="${esc(c.name)}" maxlength="20" placeholder="이름" aria-label="이름" spellcheck="false"><div class="seg3">${[['female','여자'],['male','남자']].map(([v,l])=>`<button type="button" data-cbody="${v}" aria-pressed="${c.body===v}">${l}</button>`).join('')}</div><span class="cbadge" data-badge></span></div>
      <label class="cf"><span>다른 호칭 <small>쉼표로 구분 · 줄글에서 같은 인물로 찾아요</small></span><input data-ck="aliases" value="${esc(c.aliases||'')}" placeholder="예: 도련님, 에드" spellcheck="false"></label>
      <label class="cf"><span>외형 <small>NovelAI 태그 · 쉼표로 구분 · 비우면 특징 글에서 자동으로 만들어요</small></span><textarea class="ce-tags" data-ck="tags" rows="3" placeholder="${esc(tagEx(c))}" spellcheck="false">${esc(NAITAGS[n]??'')}</textarea></label>
      <label class="cf cf-big"><span>특징 <small data-cnt>${(c.look||'').length}/1000</small></span><textarea data-ck="look" rows="9" maxlength="1000" placeholder="성격, 말투, 버릇, 관계, 태그로 다 못 담는 외형 특징(흉터·분위기·체격) 등을 자유롭게">${esc(c.look||'')}</textarea></label>
      <div class="ce-foot"><span class="cstat">이 씬 ${st.cuts}컷 · 대사 ${st.lines}</span>${n?(INFER_BUSY.has(n)?'<span class="ce-infer busy">외형 추론 중…</span>':`<button type="button" class="link ce-infer" data-act="charinfer" title="구성안·씬 글에서 이 인물이 나오는 대목을 읽고 비어 있는 외형 태그·특징을 채워요">글에서 외형 추론</button>`):''}<span class="grow"></span><button type="button" class="btn" data-act="librevert" hidden>보관함 버전으로</button><button type="button" class="btn" data-act="libsave">보관함에 저장</button><button type="button" class="btn" data-act="chdel">작품에서 빼기</button></div>
    </div></article>`}
function updateCard(i){const el=document.querySelector(`#chars .cedit[data-ci="${i}"]`),c=CHARS[i];if(!el||!c)return;const st=libState(c);
  const bd=el.querySelector('[data-badge]');bd.textContent=st==='same'?'보관함과 같음':st==='diff'?'보관함과 다름':'';bd.className='cbadge'+(st==='diff'?' diff':'');bd.hidden=!st;
  const sv=el.querySelector('[data-act=libsave]');sv.textContent=st?'보관함 갱신':'보관함에 저장';sv.disabled=st==='same';el.querySelector('[data-act=librevert]').hidden=st!=='diff';
  el.querySelector('[data-cnt]').textContent=`${(c.look||'').length}/1000`;el.querySelector('[data-ck=tags]').placeholder=tagEx(c);
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
  if(k==='charinfer'){if(n)inferChars([n]);return}
  if(k==='libsave')libSave(i);
  else if(k==='librevert'){const L=libOf(c);if(L){libApply(L,c);saveChars();compute(false);renderSlots();toast('보관함 버전으로 되돌렸어요')}}
  else if(k==='chdel'){if(!confirm(`${n||'이 캐릭터'}을(를) 이 작품에서 뺄까요?${c.lib?' 보관함에는 남아 있어요.':' 보관함에 저장하지 않았다면 다시 불러올 수 없어요.'}`))return;if(IMG.char[n]){delete IMG.char[n];idb.del('char:'+n)}CHARS.splice(i,1);saveChars();compute(false);renderSlots();toast('작품에서 뺐어요')}});
$('#chars').addEventListener('keydown',e=>{if(e.target.matches('[data-cimg]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click()}});
for(const ev of ['dragover','dragleave','drop'])$('#chars').addEventListener(ev,e=>{const d=e.target.closest('[data-cimg]');if(!d)return;e.preventDefault();d.classList.toggle('over',ev==='dragover');
  if(ev==='drop'){const i=cardOf(e),n=i>=0&&CHARS[i].name.trim();const f=[...e.dataTransfer.files].find(f=>f.type.startsWith('image/'));if(!n){toast('이름을 먼저 정해 주세요');return}if(f)attach(f,{kind:'char',key:n})}});
const focusCard=i=>setTimeout(()=>{const el=document.querySelector(`#chars .cedit[data-ci="${i}"]`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.querySelector(CHARS[i].name.trim()?'[data-ck=tags]':'[data-ck=name]').focus({preventScroll:true})}},30);
function addCharFromSugg(name){CHARS.push({name,aliases:'',body:CHARS.filter(c=>c.body==='female').length>CHARS.filter(c=>c.body==='male').length?'male':'female',look:''});saveChars();renderSugg();renderCastSum?.();renderParse?.();
  if(AIKEY){toast(`설정집에 「${name}」을 추가했어요 · 구성·씬 글로 외형을 추론하는 중…`,2600);inferChars([name],{fresh:true})}else toast(`설정집에 「${name}」을 추가했어요 · API 키를 넣으면 구성·씬 글로 외형을 채워 드려요`,3000)}
// ---------- 새 인물 외형 추론: 구성안·씬 글에서 그 인물이 나오는 대목을 모아 Claude에게 ----------
// 비어 있는 칸만 채움(작가가 이미 적은 태그·특징은 그대로). fresh면 방금 넣은 인물이라 성별도 추론값으로
const INFER_BUSY=new Set();
function planBrief(){try{const o=JSON.parse(localStorage.getItem('rough-composition-v1')||'null'),w=o?.webtoon;if(!w)return null;
  return{prompt:String(w.form?.prompt||'').slice(0,2000),cards:(w.draft?.cards||[]).map(c=>({n:c.n,title:c.title||'',purpose:c.purpose||'',cuts:(c.cuts||[])}))}}catch(_){return null}}
function mentionsOf(name,plan){const hit=t=>String(t||'').includes(name),out=[];
  SCENES.forEach((sc,si)=>(sc.cuts||[]).forEach((c,k)=>{if(hit(c)){const prev=sc.cuts[k-1],next=sc.cuts[k+1];out.push(`[씬 ${si+1} ${sc.title||''} · ${k+1}컷] ${[prev&&'(앞) '+String(prev).replace(/\n/g,' / '),String(c).replace(/\n/g,' / '),next&&'(뒤) '+String(next).replace(/\n/g,' / ')].filter(Boolean).join(' ‖ ')}`)}}));
  (plan?.cards||[]).forEach(cd=>(cd.cuts||[]).forEach((c,k)=>{if(hit(c))out.push(`[구성 ${cd.n}번 「${cd.title}」 ${k+1}컷] ${String(c).replace(/\n/g,' / ')}`)}));
  return out.slice(0,40).map(s=>s.slice(0,400))}
async function inferChars(names,{fresh=false,hints={}}={}){names=names.filter(n=>n&&!INFER_BUSY.has(n));if(!names.length)return;if(!AIKEY){openKey(()=>inferChars(names,{fresh}));return}
  names.forEach(n=>INFER_BUSY.add(n));if(VIEW==='chars')renderChars();
  const plan=planBrief(),payload={world:worldBrief(),cast:CHARS.filter(c=>c.name.trim()&&!names.includes(c.name.trim())).map(c=>({name:c.name.trim(),gender:c.body,tags:charTags(c).join(', ')})),
    plan:plan&&{prompt:plan.prompt,cards:plan.cards.map(({n,title,purpose})=>({n,title,purpose}))},chars:names.map(n=>({name:n,mentions:mentionsOf(n,plan),...(hints[n]?{note:hints[n]}:{})}))};
  let mod;try{mod=await import('./claude.js');const r=await mod.inferChars(AIKEY,payload);let k=0;
    for(const x of r.chars){const c=CHARS.find(c=>c.name.trim()===x.name.trim());if(!c)continue;
      if(fresh&&x.body)c.body=x.body;if(!String(c.look||'').trim()&&x.look)c.look=x.look.trim();if(NAITAGS[c.name.trim()]==null&&x.tags){NAITAGS[c.name.trim()]=x.tags.trim();ARTGEN.chars[c.name.trim()]=x.tags.trim()}k++}
    saveChars();saveNaiTags();try{localStorage.setItem('rough-art-gen',JSON.stringify(ARTGEN))}catch(_){}
    toast(k?`${names.join(', ')} 외형을 구성·씬 글로 채웠어요 · 설정집에서 확인해 주세요`:'채울 외형을 찾지 못했어요',2800)}
  catch(err){console.warn(err?.status||err);toast('외형을 추론하지 못했어요 · '+(mod?mod.explain(err):'Claude 모듈을 불러오지 못했어요'),3000);for(const n of names){const c=CHARS.find(c=>c.name.trim()===n);if(c&&!String(c.look||'').trim()&&hints[n]){c.look=hints[n];saveChars()}}if(err?.status===401){setKey('',null);openKey(()=>inferChars(names,{fresh,hints}))}}
  finally{names.forEach(n=>INFER_BUSY.delete(n));if(VIEW==='chars')renderChars();if(VIEW==='layout')renderNai?.()}}
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

// ---------- 설정집 빈 칸 채우기 ----------
// 채워진 캐릭터·세계관·설정 항목 + 구성안 + 씬 글을 근거로 Claude가 빈 칸만 제안 → 고른 것만 넣음(채워진 칸은 건드리지 않음)
let FILL_BUSY=false;
function fillPayload(){const plan=planBrief();
  const scenes=SCENES.map(sc=>({title:sc.title||'',cuts:(sc.cuts||[]).filter(c=>String(c).trim()).map(c=>String(c).slice(0,300))}));
  let budget=14000;for(const sc of scenes){sc.cuts=sc.cuts.filter(c=>(budget-=c.length)>0)}
  return{chars:CHARS.filter(c=>c.name.trim()).map(c=>({name:c.name.trim(),gender:c.body,aliases:c.aliases||'',tags:NAITAGS[c.name.trim()]??'',look:c.look||''})),
    world:WORLD.off?null:Object.fromEntries(WF.map(f=>[f,WORLD[f]||''])),
    lore:LORE.map(e=>({name:e.name||'',category:LORE_CAT[e.cat]?.[0]||e.cat||'',keys:e.keys||'',desc:e.desc||'',tags:e.tags||''})).filter(e=>e.name),
    plan:plan&&{prompt:plan.prompt,cards:plan.cards.map(({n,title,purpose})=>({n,title,purpose}))},scenes}}
const FILL_LABEL={aliases:'다른 호칭',tags:'외형 태그',look:'특징',name:'이름',genre:'장르',era:'시대',tone:'분위기',summary:'요약',detail:'자세한 설정',keys:'키워드',desc:'설명'};
async function fillSetbook(){if(FILL_BUSY)return;if(!AIKEY){openKey(fillSetbook);return}
  const empty=fillPayload();const holes=empty.chars.some(c=>!c.tags||!c.look)||(empty.world&&WF.some(f=>!empty.world[f]))||empty.lore.some(e=>!e.keys||!e.desc||!e.tags);
  if(!holes){toast('비어 있는 칸이 없어요');return}
  FILL_BUSY=true;fillBtns();let mod;
  try{mod=await import('./claude.js');const r=await mod.fillSetbook(AIKEY,empty,{onStatus:t=>fillBtns(t)});const rows=[];
    for(const x of r.chars||[]){const c=CHARS.find(c=>c.name.trim()===String(x.name).trim());if(!c)continue;const n=c.name.trim();
      if(!String(c.aliases||'').trim()&&x.aliases?.trim())rows.push({who:n,f:'aliases',v:x.aliases.trim(),put:v=>{c.aliases=v}});
      if(NAITAGS[n]==null&&x.tags?.trim())rows.push({who:n,f:'tags',v:x.tags.trim(),put:v=>{NAITAGS[n]=v;ARTGEN.chars[n]=v}});
      if(!String(c.look||'').trim()&&x.look?.trim())rows.push({who:n,f:'look',v:x.look.trim(),put:v=>{c.look=v}})}
    if(r.world&&!WORLD.off)for(const f of WF){const v=String(r.world[f]||'').trim();if(v&&!String(WORLD[f]||'').trim())rows.push({who:'세계관',f,v,put:v=>{WORLD[f]=v}})}
    for(const x of r.lore||[]){const e=LORE.find(e=>(e.name||'').trim()===String(x.name).trim());if(!e)continue;
      for(const f of ['keys','desc','tags']){const v=String(x[f]||'').trim();if(v&&!String(e[f]||'').trim())rows.push({who:'설정 · '+e.name,f,v,put:v=>{e[f]=v}})}}
    if(!rows.length){toast('채울 값을 찾지 못했어요');return}fillDialog(rows)}
  catch(err){console.warn(err?.status||err);toast('빈 칸을 채우지 못했어요 · '+(mod?mod.explain(err):'Claude 모듈을 불러오지 못했어요'),3000);if(err?.status===401){setKey('',null);openKey(fillSetbook)}}
  finally{FILL_BUSY=false;fillBtns()}}
function fillBtns(t){document.querySelectorAll('[data-act="sbfill"]').forEach(b=>{b.disabled=FILL_BUSY;b.textContent=FILL_BUSY?(t&&/쓰는 중/.test(t)?t.replace('Claude가 ',''):'채우는 중…'):'빈 칸 채우기'})}
function fillDialog(rows){let d=$('#filldlg');if(!d){d=document.createElement('dialog');d.id='filldlg';d.className='keydlg artdlg filldlg';document.body.appendChild(d)}
  d.innerHTML=`<h3>설정집 빈 칸 채우기</h3><p>채워진 설정과 구성·씬 글을 근거로 비어 있던 칸만 제안했어요. 고친 뒤 체크한 것만 넣어요.</p>
  <div class="artcmp">${rows.map((x,n)=>`<label class="artrow fillrow"><input type="checkbox" data-n="${n}" checked><b>${esc(x.who)} · ${FILL_LABEL[x.f]||x.f}</b><textarea data-fv="${n}" rows="${x.v.length>80?3:1}" spellcheck="false">${esc(x.v)}</textarea></label>`).join('')}</div>
  <div class="btnrow"><button class="btn" data-r="no">취소</button><button class="btn dark" data-r="go">넣기</button></div>`;
  d.onclick=e=>{if(e.target.closest('textarea'))return;const k=e.target.closest('[data-r]')?.dataset.r;if(!k)return;
    if(k==='go'){let n=0;d.querySelectorAll('input[data-n]:checked').forEach(i=>{const x=rows[+i.dataset.n],v=d.querySelector(`[data-fv="${i.dataset.n}"]`).value.trim();if(v){x.put(v);n++}});
      saveChars();saveNaiTags();saveWorld();try{localStorage.setItem('rough-art-gen',JSON.stringify(ARTGEN))}catch(_){}
      if(VIEW==='chars')renderChars();if(VIEW==='world')renderWorld();try{compute(false)}catch(_){}toast(n?`설정집 빈 칸 ${n}개를 채웠어요`:'넣은 것이 없어요')}
    d.close()};d.showModal()}
document.addEventListener('click',e=>{if(e.target.closest('[data-act="sbfill"]'))fillSetbook()});
