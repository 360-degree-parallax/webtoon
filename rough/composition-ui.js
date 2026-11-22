import {validateSettings,generateComposition,regenerateCard,missingFixedLines,previewDocument} from './composition.js';

const storageKey='rough-composition-v1';
const defaults=()=>({prompt:'',lengthMode:'exact',count:6,min:5,max:7,source:'reorder',
  mustInclude:'',fixed:'',notes:'',cutCount:'',change:'',ending:'aftertaste',density:'normal',
  audience:'first',uiCount:2,placement:'auto',positions:'',behavior:'static'});
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
    for(const section of form.querySelectorAll('[data-plan-mode]'))section.hidden=section.dataset.planMode!==mode;
    for(const part of form.querySelectorAll('[data-plan-length]'))part.hidden=part.dataset.planLength!==row.lengthMode;
    root.querySelector('#plan-amount-label').textContent=mode==='webtoon'?'씬 수':'섹션 수';
    root.querySelector('#plan-manual').hidden=row.placement!=='manual'||!Number(row.uiCount);
  }
  function config(){
    const row=current().form;
    return validateSettings({...row,mode,exact:row.lengthMode==='exact',count:Number(row.count),min:Number(row.min),max:Number(row.max),
      cutCount:Number(row.cutCount),uiCount:Number(row.uiCount),positions:row.positions.trim().split(/[,，\s]+/).filter(Boolean).map(Number),
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
  function cardHTML(card){
    const web=mode==='webtoon',badge=web?card.cutCount+'컷':card.withHTML?'HTML UI':'';
    const story=web?field('turn','감정 변화',card.turn)+field('ending','마지막 컷',card.ending)+
      '<details><summary>컷별 초안 '+card.cutCount+'개</summary><div class="plan-cuts">'+card.cuts.map((cut,i)=>field('cut-'+i,(i+1)+'컷',cut,true)).join('')+'</div></details>'
      :field('copy','카피',card.copy,true)+field('cta','CTA',card.cta)+(card.withHTML?htmlFields(card):'');
    return '<article class="plan-card" data-card="'+card.n+'"><header><span>'+card.n+(web?'번 씬':'번 섹션')+(badge?' · '+badge:'')+'</span>'+
      '<div><button type="button" class="btn" data-do="lock" aria-pressed="'+card.locked+'">'+(card.locked?'잠금 해제':'잠그기')+'</button> '+
      '<button type="button" class="btn" data-do="regen"'+(card.locked?' disabled':'')+'>이 카드 다시 생성</button></div></header>'+
      '<div class="plan-fields">'+field('title','제목',card.title)+field('purpose',web?'장면의 역할':'설득 목적',card.purpose)+story+'</div></article>';
  }
  function render(){
    const draft=current().draft;
    output.innerHTML='';
    if(!draft){writeWarning();return}
    const units=mode==='webtoon'?'씬':'섹션';
    const volume=mode==='webtoon'?' · '+draft.cards.reduce((sum,card)=>sum+card.cutCount,0)+'컷':' · HTML UI '+draft.cards.filter(card=>card.withHTML).length+'개';
    output.innerHTML='<div class="sh"><h2>구성안</h2><span>'+draft.cards.length+units+volume+'</span></div>'+
      '<p class="plan-summary">'+localText(draft.summary)+'</p>'+
      (mode==='webtoon'?'<div class="toolbar plan-send"><button type="button" class="btn dark" data-do="send">씬으로 보내기 →</button></div>':'')+
      draft.cards.map(cardHTML).join('');
    for(const article of output.querySelectorAll('[data-card]')){
      const card=draft.cards.find(row=>row.n===Number(article.dataset.card));
      if(card.withHTML)updateFrame(article,card);
      applyLock(article,card);
    }
    writeWarning();
  }
  function updateFrame(article,card){
    const iframe=article.querySelector('iframe');
    iframe.setAttribute('sandbox',current().draft.behavior==='interactive'?'allow-scripts':'');
    iframe.srcdoc=previewDocument(card.html,current().draft.behavior==='interactive');
  }
  function applyLock(article,card){
    for(const el of article.querySelectorAll('[data-field], [data-do="regen"], [data-do="regen-code"]'))el.disabled=busy||card.locked;
    const lock=article.querySelector('[data-do="lock"]');
    lock.setAttribute('aria-pressed',String(card.locked));lock.textContent=card.locked?'잠금 해제':'잠그기';
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
  form.addEventListener('input',()=>{takeSettings();persist();writeWarning()});
  form.addEventListener('change',()=>{takeSettings();configure();persist()});
  form.addEventListener('submit',event=>{event.preventDefault();generate()});
  output.addEventListener('input',event=>{
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
