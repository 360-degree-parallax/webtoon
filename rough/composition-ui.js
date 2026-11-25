import {validateSettings,generateComposition,regenerateCard,missingFixedLines,previewDocument} from './composition.js';

const storageKey='rough-composition-v1';
const defaults=()=>({prompt:'',lengthMode:'exact',count:6,min:5,max:7,source:'reorder',
  mustInclude:'',fixed:'',notes:'',cutCount:'',change:'',ending:'aftertaste',density:'normal',
  audience:'first',uiCount:2,placement:'auto',positions:'',behavior:'static',epType:'regular',sceneCount:'',coldOpen:'yes'});
// 한 화 분량: 연재작 44화 실측(docs/webtoon-episode-planning.md) — 1화 약 100컷, 일반 75, 짧은 회차 40.
// 그림 컷당 휴대폰 약 1.03화면, 말풍선 약 1.4개, 씬당 약 11컷. 마지막 씬이 가장 길고 콜드 오픈은 약 12%
const EP_PRESET={first:100,regular:75,short:40,mini:4};
// 4~6컷 만화(인스타툰·4컷): 씬 1개, 콜드 오픈 없음, 컷마다 기승전결 역할
const MINI_BEATS={3:['기','전','결'],4:['기','승','전','결'],5:['기','승','승','전','결'],6:['기','승','승','전','결','여운'],7:['기','승','승','승','전','결','여운'],8:['기','승','승','승','전','전','결','여운']};
export function episodePlan(row){
  if(row.epType==='mini'){const cuts=Math.max(3,Math.min(8,Number(row.cutCount)||4));return {mini:true,cuts,scenes:1,lo:1,hi:1,fixed:true,phone:Math.max(1,Math.round(cuts*1.03)),balloons:Math.round(cuts*1.6),perScene:cuts,open:0,dev:0,rise:0,hook:1,beats:MINI_BEATS[cuts]}}
  const cuts=Math.max(10,Math.min(200,Number(row.cutCount)||EP_PRESET[row.epType]||75)),fixed=Number(row.sceneCount)||0;
  const auto=Math.max(2,Math.round(cuts/11)),lo=fixed||Math.max(2,Math.round(cuts/15)),hi=fixed||Math.max(lo,Math.round(cuts/8));
  const open=row.coldOpen==='no'?0:Math.max(3,Math.round(cuts*.12)),hook=Math.max(3,Math.min(5,Math.round(cuts*.05))),rise=Math.round(cuts*.25),dev=Math.max(1,cuts-open-hook-rise);
  return {cuts,scenes:fixed||auto,lo,hi,fixed:!!fixed,phone:Math.round(cuts*1.03),balloons:Math.round(cuts*1.4),perScene:Math.round(cuts/(fixed||auto)),open,dev,rise,hook}}

const localText=value=>String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const splitLines=value=>value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);

export function mountComposition(root,{getKey,requestKey,addScenes,getStory,request,reportError}) {
  const form=root.querySelector('#plan-form');
  const output=root.querySelector('#plan-output');
  const status=root.querySelector('#plan-status');
  const toolbar=root.querySelector('#plan-mode');
  const settings=form.elements;
  let memory;
  try{memory=JSON.parse(localStorage.getItem(storageKey)||'null')}catch{}
  const modeKnown=value=>value==='webtoon'||value==='marketing';
  const saved=memory||{};
  let mode=modeKnown(saved.mode)?saved.mode:'webtoon',busy=false;
  const modes={
    webtoon:{form:{...defaults(),...saved.webtoon?.form},draft:saved.webtoon?.draft||null},
    marketing:{form:{...defaults(),...saved.marketing?.form},draft:saved.marketing?.draft||null}
  };
  const current=()=>modes[mode];
  const updateStatus=message=>{status.textContent=message};
  function persist(){
    try{localStorage.setItem(storageKey,JSON.stringify({mode,...modes}))}
    catch{updateStatus('저장 공간이 부족해 이 변경을 브라우저에 저장하지 못했어요.')}
  }
  function takeSettings(){
    const row=current().form;
    for(const name of Object.keys(row))if(settings.namedItem(name))row[name]=settings.namedItem(name).value;
  }
  function configure(){
    const row=current().form;
    for(const name of Object.keys(row))if(settings.namedItem(name))settings.namedItem(name).value=row[name];
    for(const btn of toolbar.querySelectorAll('button[data-kind]'))btn.setAttribute('aria-pressed',String(btn.dataset.kind===mode));
    for(const section of root.querySelectorAll('[data-plan-mode]'))section.hidden=section.dataset.planMode!==mode;
    for(const part of form.querySelectorAll('[data-plan-length]'))part.hidden=part.dataset.planLength!==row.lengthMode;
    root.querySelector('#plan-amount-label').textContent=mode==='webtoon'?'씬 수':'섹션 수';
    paintPlan();
    for(const group of root.querySelectorAll('[data-chips]'))for(const b of group.querySelectorAll('[data-v]'))b.setAttribute('aria-pressed',String(settings.namedItem(group.dataset.chips)?.value===b.dataset.v));
    root.querySelector('#plan-manual').hidden=row.placement!=='manual'||!Number(row.uiCount);
  }
  function paintPlan(){const row=current().form,P=episodePlan(row),est=root.querySelector('#plan-est'),shape=root.querySelector('#plan-shape');if(!est)return;
    settings.namedItem('cutCount').placeholder=String(EP_PRESET[row.epType]||75);
    const mini=!!P.mini,ci=settings.namedItem('cutCount');ci.min=mini?3:10;ci.max=mini?8:200;
    root.querySelectorAll('[data-not-mini]').forEach(e=>e.hidden=mini);root.querySelectorAll('[data-mini-only]').forEach(e=>e.hidden=!mini);
    root.querySelectorAll('[data-mini-cuts]').forEach(b=>b.setAttribute('aria-pressed',String(mini&&Number(b.dataset.miniCuts)===P.cuts)));
    const seg=(cls,label,n)=>n?'<div class="'+cls+'" style="flex:'+n+'" title="'+label+' 약 '+n+'컷"><b>'+label+'</b><small>'+n+'컷</small></div>':'';
    if(mini){est.innerHTML='씬 <b>1개</b> · 한 컷에 대사 <b>1~2개</b><br>마지막 컷에 반전·웃음 포인트';
      const cls={기:'s-k1',승:'s-k2',전:'s-k3',결:'s-k4',여운:'s-k1'};shape.innerHTML=P.beats.map((b,i)=>'<div class="'+cls[b]+'" style="flex:1" title="'+(i+1)+'컷 · '+b+'"><b>'+(i+1)+'컷</b><small>'+b+'</small></div>').join('');return}
    est.innerHTML='씬 <b>'+(P.fixed?P.scenes:'약 '+P.scenes)+'개</b>'+(P.fixed?'':' (자동)')+' · 씬당 약 <b>'+P.perScene+'컷</b><br>휴대폰 약 <b>'+P.phone+'화면</b> · 말풍선 약 <b>'+P.balloons+'개</b>';
    shape.innerHTML=seg('s-open','오프닝',P.open)+seg('s-dev','전개',P.dev)+seg('s-rise','고조',P.rise)+seg('s-hook','엔딩 훅',P.hook)}
  function config(){
    const row=current().form;
    const P=mode==='webtoon'?episodePlan(row):null;
    return validateSettings({...row,mode,exact:mode==='webtoon'?P.fixed:row.lengthMode==='exact',count:mode==='webtoon'?P.scenes:Number(row.count),min:mode==='webtoon'?P.lo:Number(row.min),max:mode==='webtoon'?P.hi:Number(row.max),
      cutCount:mode==='webtoon'?P.cuts:0,structure:P?(P.mini?{episode:'mini',coldOpen:false,beats:P.beats,note:'4~6컷 만화: 씬 1개, 컷마다 beats 역할(기·승·전·결·여운), 한 컷에 대사 1~2개, 첫 컷에서 상황을 바로 보여 주고 마지막 컷에서 반전·웃음 포인트로 끝낸다'}:{episode:row.epType,coldOpen:row.coldOpen!=='no',openCuts:P.open,hookCuts:P.hook,note:'연재작 실측: 마지막 씬이 가장 길고, 감정 강도 최고점은 마지막 10% 안, 마지막 컷은 공개(새 정보·표정·대사)'}):undefined,uiCount:Number(row.uiCount),positions:row.positions.trim().split(/[,，\s]+/).filter(Boolean).map(Number),
      fixedLines:splitLines(row.fixed),story:mode==='webtoon'?getStory():undefined});
  }
  function writeWarning(){
    const note=root.querySelector('#plan-fixed-warning');
    const draft=current().draft;
    if(!draft){note.textContent='';return}
    const missing=missingFixedLines({fixedLines:splitLines(current().form.fixed)},draft.cards);
    note.textContent=missing.length?'그대로 써야 하는 문구 누락 · '+missing.join(' / '):'';
  }
  function field(name,label,value,multiline=false){
    const safe=localText(value);
    return '<label>'+label+(multiline?'<textarea rows="3" data-field="'+name+'">'+safe+'</textarea>':
      '<input type="text" data-field="'+name+'" value="'+safe+'">')+'</label>';
  }
  function htmlFields(card){
    return '<div class="plan-code"><div class="seg3"><button type="button" data-do="preview" aria-pressed="true">미리보기</button>'+
      '<button type="button" data-do="code" aria-pressed="false">코드</button></div>'+
      '<iframe title="'+card.n+'번 HTML UI" sandbox="allow-scripts" referrerpolicy="no-referrer" loading="lazy"></iframe>'+
      '<textarea data-field="html" rows="8" hidden aria-label="HTML 코드" spellcheck="false">'+localText(card.html)+'</textarea>'+
      '<div class="toolbar"><button type="button" class="btn" data-do="copy">코드 복사</button>'+
      '<button type="button" class="btn" data-do="download">HTML 저장</button>'+
      '<button type="button" class="btn" data-do="regen-code"'+(card.locked?' disabled':'')+'>HTML만 다시 생성</button></div></div>';
  }
  // 카드: 번호 · 제목(바로 고침) · 컷 수 · 잠금/다시 생성 → 역할·감정 변화·마지막 컷 3칸 → 컷 초안 목록(처음 4컷, 더 보기)
  const OPEN=new Set();
  function cardHTML(card){
    const web=mode==='webtoon';
    const head='<div class="pc-h"><span class="pc-n">'+card.n+'</span><input class="pc-title" data-field="title" value="'+localText(card.title)+'" aria-label="'+card.n+'번 제목">'+
      (web?'<span class="pc-cnt">'+card.cutCount+'컷</span>':card.withHTML?'<span class="pc-cnt">HTML UI</span>':'')+
      '<div class="pc-act"><button type="button" class="btn" data-do="lock" aria-pressed="'+card.locked+'" title="잠그면 다시 생성해도 이 카드는 그대로">'+(card.locked?'잠김':'잠그기')+'</button>'+
      '<button type="button" class="btn" data-do="regen"'+(card.locked?' disabled':'')+'>다시 생성</button></div></div>';
    const meta=(label,name,value)=>'<label><span>'+label+'</span><input data-field="'+name+'" value="'+localText(value)+'"></label>';
    if(!web)return '<article class="plan-card'+(card.locked?' locked':'')+'" data-card="'+card.n+'" id="pc-'+card.n+'">'+head+
      '<div class="plan-fields">'+field('purpose','설득 목적',card.purpose)+field('copy','카피',card.copy,true)+field('cta','CTA',card.cta)+(card.withHTML?htmlFields(card):'')+'</div></article>';
    const open=OPEN.has(card.id),cuts=card.cuts||[],show=open?cuts:cuts.slice(0,4);
    return '<article class="plan-card'+(card.locked?' locked':'')+'" data-card="'+card.n+'" id="pc-'+card.n+'">'+head+
      '<div class="pc-meta">'+meta('장면의 역할','purpose',card.purpose)+meta('감정 변화','turn',card.turn)+meta('마지막 컷','ending',card.ending)+'</div>'+
      '<ol class="pc-cuts">'+show.map((cut,i)=>'<li><textarea rows="1" data-field="cut-'+i+'" aria-label="'+(i+1)+'컷">'+localText(cut)+'</textarea></li>').join('')+'</ol>'+
      (cuts.length>4?'<button type="button" class="pc-more" data-do="more">'+(open?'접기':'컷 '+(cuts.length-4)+'개 더 보기')+'</button>':'')+'</article>';
  }
  function render(){
    const draft=current().draft;
    output.innerHTML='';
    if(!draft){writeWarning();return}
    const web=mode==='webtoon',units=web?'씬':'섹션',total=draft.cards.reduce((sum,card)=>sum+(card.cutCount||0),0),locked=draft.cards.filter(c=>c.locked).length;
    const stat=web?'<span><b>'+draft.cards.length+'</b>씬</span><span><b>'+total+'</b>컷</span><span>휴대폰 약 <b>'+Math.round(total*1.03)+'</b>화면</span>'+(locked?'<span>잠금 <b>'+locked+'</b></span>':''):
      '<span><b>'+draft.cards.length+'</b>섹션</span><span>HTML UI <b>'+draft.cards.filter(card=>card.withHTML).length+'</b></span>';
    output.innerHTML='<div class="po-h"><h2>'+(web?'이번 화 구성':'구성안')+'</h2><span class="grow"></span></div><div class="po-stat">'+stat+'</div>'+
      '<p class="po-sum">'+localText(draft.summary)+'</p>'+
      (web&&total?'<div class="po-flow" aria-hidden="true">'+draft.cards.map(c=>'<i class="'+(c.locked?'lk':'')+'" style="flex:'+(c.cutCount||1)+'" title="'+c.n+'. '+localText(c.title)+' · '+c.cutCount+'컷"></i>').join('')+'</div>':'')+
      '<nav class="po-nav" aria-label="'+units+' 바로가기">'+draft.cards.map(c=>'<a href="#pc-'+c.n+'" data-jump="'+c.n+'"><b>'+c.n+'</b>'+localText(c.title||(c.n+'번'))+(web?' <small>'+c.cutCount+'컷</small>':'')+'</a>').join('')+'</nav>'+
      draft.cards.map(cardHTML).join('')+
      (web?'<div class="po-send"><button type="button" class="btn" data-do="send">씬으로 보내기 →</button></div>':'');
    for(const article of output.querySelectorAll('[data-card]')){
      const card=draft.cards.find(row=>row.n===Number(article.dataset.card));
      if(card.withHTML)updateFrame(article,card);
      applyLock(article,card);
    }
    fitAreas();writeWarning();
  }
  // 컷 초안 칸 높이를 글에 맞춤(field-sizing을 못 쓰는 브라우저)
  function fitAreas(){for(const t of output.querySelectorAll('.pc-cuts textarea')){t.style.height='auto';t.style.height=t.scrollHeight+'px'}}
  function updateFrame(article,card){
    const iframe=article.querySelector('iframe');
    iframe.setAttribute('sandbox',current().draft.behavior==='interactive'?'allow-scripts':'');
    iframe.srcdoc=previewDocument(card.html,current().draft.behavior==='interactive');
  }
  function applyLock(article,card){
    for(const el of article.querySelectorAll('[data-field], [data-do="regen"], [data-do="regen-code"]'))el.disabled=busy||card.locked;
    const lock=article.querySelector('[data-do="lock"]');
    lock.setAttribute('aria-pressed',String(card.locked));lock.textContent=card.locked?'잠김':'잠그기';article.classList.toggle('locked',card.locked);
  }
  function setBusy(value){
    busy=value;
    for(const el of [...form.elements,...toolbar.querySelectorAll('button')])el.disabled=value;
    output.querySelectorAll('button,[data-field]').forEach(el=>{el.disabled=value});
    if(!value&&current().draft)for(const article of output.querySelectorAll('[data-card]')){
      const card=current().draft.cards.find(item=>item.n===Number(article.dataset.card));
      applyLock(article,card);
    }
  }
  async function generate(card=null,scope='card'){
    if(busy)return;
    takeSettings();persist();
    let options;
    try{options=config()}catch(error){updateStatus(error.message);return}
    const key=getKey();
    if(!key){requestKey(()=>generate(card,scope));return}
    const row=current(),draft=row.draft;
    setBusy(true);updateStatus('Claude에 연결하는 중');
    try{
      const call=(system,schema,payload,progress)=>request(key,system,schema,payload,progress);
      if(card){
        const effective={...options,behavior:draft.behavior||options.behavior};
        const result=await regenerateCard(call,effective,draft,card,scope,updateStatus);
        draft.cards=draft.cards.map(item=>item.id===card.id?result:item);
      }else{
        const result=await generateComposition(call,options,draft?.cards||[],updateStatus);
        row.draft={...result,behavior:options.behavior};
      }
      render();updateStatus(card?'카드를 다시 만들었어요.':'구성안을 만들었어요.');persist();
    }catch(error){updateStatus(reportError(error))}
    finally{setBusy(false)}
  }
  toolbar.addEventListener('click',event=>{
    const next=event.target.closest('[data-kind]')?.dataset.kind;
    if(busy||!modeKnown(next)||next===mode)return;
    takeSettings();mode=next;configure();render();updateStatus('');persist();
  });
  root.addEventListener('click',event=>{const m=event.target.closest('[data-mini-cuts]');if(!m||busy)return;settings.namedItem('cutCount').value=m.dataset.miniCuts;takeSettings();configure();persist()});
  root.addEventListener('click',event=>{const b=event.target.closest('[data-chips] [data-v]');if(!b||busy)return;const name=b.closest('[data-chips]').dataset.chips,el=settings.namedItem(name);if(!el)return;el.value=b.dataset.v;if(name==='epType'){settings.namedItem('cutCount').value=String(EP_PRESET[b.dataset.v]);if(b.dataset.v==='mini'){settings.namedItem('ending').value='punch';settings.namedItem('sceneCount').value=''}else if(settings.namedItem('ending').value==='punch')settings.namedItem('ending').value='aftertaste'}takeSettings();configure();persist()});
  form.addEventListener('input',()=>{takeSettings();persist();writeWarning();paintPlan()});
  form.addEventListener('change',()=>{takeSettings();configure();persist()});
  form.addEventListener('submit',event=>{event.preventDefault();generate()});
  output.addEventListener('click',event=>{const a=event.target.closest('[data-jump]');if(!a)return;event.preventDefault();document.getElementById('pc-'+a.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'})});
  output.addEventListener('input',event=>{
    if(event.target.matches('.pc-cuts textarea')){event.target.style.height='auto';event.target.style.height=event.target.scrollHeight+'px'}
    const name=event.target.dataset.field;
    const card=current().draft?.cards.find(row=>row.n===Number(event.target.closest('[data-card]')?.dataset.card));
    if(!name||!card||card.locked||busy)return;
    if(name.startsWith('cut-'))card.cuts[Number(name.slice(4))]=event.target.value;
    else card[name]=event.target.value;
    writeWarning();persist();
  });
  output.addEventListener('click',async event=>{
    const doWhat=event.target.closest('[data-do]')?.dataset.do;
    if(!doWhat||busy)return;
    const draft=current().draft;
    if(doWhat==='send'){addScenes(draft.cards);return}
    if(doWhat==='more'){const art=event.target.closest('[data-card]'),c=draft.cards.find(r=>r.n===Number(art.dataset.card));OPEN.has(c.id)?OPEN.delete(c.id):OPEN.add(c.id);render();document.getElementById('pc-'+c.n)?.scrollIntoView({block:'nearest'});return}
    const article=event.target.closest('[data-card]');
    const card=draft?.cards.find(row=>row.n===Number(article?.dataset.card));
    if(!card)return;
    if(doWhat==='lock'){card.locked=!card.locked;applyLock(article,card);persist();return}
    if(doWhat==='regen'||doWhat==='regen-code'){generate(card,doWhat==='regen-code'?'code':'card');return}
    if(doWhat==='preview'||doWhat==='code'){
      const preview=doWhat==='preview';
      article.querySelector('iframe').hidden=!preview;
      article.querySelector('[data-field="html"]').hidden=preview;
      for(const name of ['preview','code'])article.querySelector('[data-do="'+name+'"]').setAttribute('aria-pressed',String(name===doWhat));
      if(preview)updateFrame(article,card);
    }
    if(doWhat==='copy'){
      try{await navigator.clipboard.writeText(card.html);updateStatus('HTML 코드를 복사했어요.')}
      catch{updateStatus('코드 탭에서 직접 복사해 주세요.')}
    }
    if(doWhat==='download'){
      const url=URL.createObjectURL(new Blob([previewDocument(card.html,draft.behavior==='interactive')],{type:'text/html'}));
      const link=document.createElement('a');link.href=url;link.download='marketing-section-'+card.n+'.html';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  });
  configure();render();
}
