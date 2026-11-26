// 회차 관리: 회차마다 씬·구성·등장인물을 따로 저장하고 바꿔 가며 작업. 세계관·작화 설정·글꼴 같은 작품 설정은 모든 회차가 같이 씀(인물은 캐릭터 보관함으로 회차끼리 불러 씀)
// 지금 회차는 늘 원래 저장 칸(rough-scenes 등)에 두고, 다른 회차는 rough-ep:<id>:<칸>에 보관 → 바꿀 때 서로 맞바꾸고 새로 불러옴
(function(){
const META='rough-episodes',KEYS=['rough-scenes','rough-scene-cur','rough-composition-v1','rough-chars'];
const ls={get:k=>{try{return localStorage.getItem(k)}catch(_){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);return true}catch(_){return false}}};
const slot=(id,k)=>`rough-ep:${id}:${k}`;
let meta=null;try{meta=JSON.parse(ls.get(META)||'null')}catch(_){}
if(!meta||!Array.isArray(meta.list)||!meta.list.length){meta={cur:'e1',list:[{id:'e1',title:'1화'}]};ls.set(META,JSON.stringify(meta))}
const save=()=>ls.set(META,JSON.stringify(meta));
const cur=()=>meta.list.find(e=>e.id===meta.cur)||meta.list[0];
const flash=t=>window.RoughWS?.flash?.(t);
const newId=()=>'e'+Date.now().toString(36);
const freshScenes=()=>JSON.stringify([{id:'s'+Date.now(),title:'씬 1',cuts:[''],pageEdits:[]}]);

// 기본 저장 공간이 차면 보관 칸은 IndexedDB(doc:<칸>)로 — 꺼낼 때 둘 다 봄
const DB=()=>typeof idb!=='undefined'?idb:null;
async function slotGet(k){const v=ls.get(k);if(v!=null)return v;const d=await DB()?.getDoc('doc:'+k);return d?.json??null}
async function slotSet(k,v){if(v==null){ls.set(k,null);await DB()?.putDoc({id:'doc:'+k,kind:'doc',json:null});return}if(ls.set(k,v)){await DB()?.putDoc({id:'doc:'+k,kind:'doc',json:null});return}await DB()?.putDoc({id:'doc:'+k,kind:'doc',at:Date.now(),json:v})}
async function stash(){if(typeof flushScenes==='function'){saveScenes();flushScenes()}else if(typeof saveScenes==='function')saveScenes();
  try{const t=thumbOf(cur());if(t&&t.length<400000)cur().thumb=t;else delete cur().thumb;save()}catch(_){}
  window.ROUGH_NOSAVE=true;  // 꺼내 바꾸는 동안·새로 고칠 때 예전 원고가 다시 써지지 않게
  for(const k of KEYS){const v=k==='rough-scenes'&&typeof SCENES!=='undefined'?JSON.stringify(SCENES):k==='rough-chars'&&typeof CHARS!=='undefined'?JSON.stringify(CHARS):ls.get(k);await slotSet(slot(meta.cur,k),v)}}
async function unstash(id){for(const k of KEYS){const v=await slotGet(slot(id,k));
    if(k==='rough-chars'&&v==null)continue;  // 회차별 인물이 생기기 전에 보관한 회차: 지금 인물을 그대로 둠
    if(!ls.set(k,v)&&k==='rough-scenes'){try{localStorage.removeItem(k)}catch(_){}await DB()?.putDoc({id:'doc:rough-scenes',kind:'doc',ep:id,at:Date.now(),cur:0,json:v})}
    await slotSet(slot(id,k),null)}}
async function go(id){if(id===meta.cur)return;await stash();await unstash(id);meta.cur=id;save();location.reload()}

// 그림까지 복제: 컷 그림은 씬 id로 저장되므로 새 씬 id로 옮겨 씀
async function cloneScenes(json){const list=JSON.parse(json||'[]'),map={};const t=Date.now();
  list.forEach((sc,k)=>{const nid='s'+t+'_'+k;map[sc.id]=nid;sc.id=nid});
  if(typeof IMG!=='undefined'&&typeof idb!=='undefined'&&typeof cutId==='function'){
    const jobs=Object.values(IMG.cut).filter(r=>map[r.scene]).map(r=>{const o={...r,id:cutId(map[r.scene],r.idx),scene:map[r.scene]};IMG.cut[o.id]=o;return idb.put(o)});
    await Promise.all(jobs).catch(()=>{})}
  return JSON.stringify(list)}

function nextTitle(){const ns=meta.list.map(e=>parseInt(e.title)).filter(n=>!isNaN(n));return (ns.length?Math.max(...ns)+1:meta.list.length+1)+'화'}
async function add(){const id=newId(),title=nextTitle();await stash();meta.list.push({id,title});
  KEYS.forEach(k=>{if(k!=='rough-chars')ls.set(k,null)});ls.set('rough-scenes',freshScenes());meta.cur=id;save();location.reload()}  // 새 회차는 지금 등장인물로 시작(바꾸거나 빼도 다른 회차는 그대로)
async function dup(){const id=newId(),title=cur().title+' 사본';await stash();
  const json=await cloneScenes(await slotGet(slot(meta.cur,'rough-scenes')));
  meta.list.splice(meta.list.indexOf(cur())+1,0,{id,title});
  ls.set('rough-scenes',json);ls.set('rough-scene-cur','0');ls.set('rough-composition-v1',await slotGet(slot(meta.cur,'rough-composition-v1')));
  meta.cur=id;save();location.reload()}
function rename(){const e=cur(),t=prompt('회차 이름',e.title);if(t==null)return;const v=t.trim().slice(0,30);if(!v)return;e.title=v;save();paint();flash(`회차 이름을 「${v}」(으)로 바꿨어요`)}
function remove(){if(meta.list.length<2){flash('회차가 하나뿐이라 지울 수 없어요');return}const e=cur();
  if(!confirm(`「${e.title}」 회차를 지울까요? 씬·컷·넣은 그림이 모두 지워지고 되돌릴 수 없어요.`))return;
  try{const scs=JSON.parse(ls.get('rough-scenes')||'[]').map(s=>s.id);if(typeof IMG!=='undefined')Object.values(IMG.cut).filter(r=>scs.includes(r.scene)).forEach(r=>{delete IMG.cut[r.id];idb.del(r.id)})}catch(_){}
  const i=meta.list.indexOf(e);meta.list.splice(i,1);const next=meta.list[Math.max(0,i-1)];
  unstash(next.id).then(()=>{meta.cur=next.id;save();setTimeout(()=>location.reload(),150)})}
function move(d){const i=meta.list.indexOf(cur()),j=i+d;if(j<0||j>=meta.list.length)return;[meta.list[i],meta.list[j]]=[meta.list[j],meta.list[i]];save();paint()}

const btn=document.createElement('button');btn.className='btn epbtn';btn.id='epbtn';btn.setAttribute('aria-haspopup','menu');btn.title='회차 바꾸기 · 새 회차 · 복제';
const bar=document.getElementById('gscbar');bar?.parentNode.insertBefore(btn,bar);
function paint(){const t=thumbOf(cur());btn.innerHTML=`${t?`<img class="epth" src="${esc(t)}" alt="">`:''}<b>${esc(cur().title)}</b><small>${meta.list.length>1?`${meta.list.indexOf(cur())+1}/${meta.list.length}`:''}</small><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`}
// 회차 썸네일: 표지로 정한 컷 → 첫 컷의 넣은 그림 → (지금 회차만) 첫 컷 레퍼런스
function scenesOf(e){if(e.id===meta.cur)return typeof SCENES!=='undefined'?SCENES:[];try{return JSON.parse(ls.get(slot(e.id,'rough-scenes'))||'[]')}catch(_){return []}}
function thumbOf(e){const scs=scenesOf(e),im=(sid,i)=>typeof IMG!=='undefined'&&typeof cutId==='function'?IMG.cut[cutId(sid,i)]?.src:null;
  if(e.cover){const v=im(e.cover.scene,e.cover.idx);if(v)return v}
  for(const sc of scs){const n=(sc.cuts||[]).length;for(let i=0;i<n;i++){const v=im(sc.id,i);if(v)return v}}
  if(e.id===meta.cur&&typeof scenePanels==='function'){try{const p=scenePanels(0)[0],r=p?.ref;if(r)return r.fixed?r.src:(r.thumb||(typeof cutThumb==='function'&&cutThumb(r.source_cut))||r.src)}catch(_){}}
  return e.thumb||''}
function countOf(e){const scs=scenesOf(e);return `씬 ${scs.length} · ${scs.reduce((a,s)=>a+(s.cuts||[]).filter(c=>String(c).trim()).length,0)}컷`}
function setCover(){const k=typeof pageSelection==='string'&&pageSelection;if(!k){flash('표지로 쓸 컷을 먼저 골라요');return}const [si,slot]=k.split(':').map(Number);
  cur().cover={scene:SCENES[si].id,idx:slot};save();paint();flash(`씬 ${si+1} · ${slot+1}컷을 「${cur().title}」 표지로 정했어요`)}
function menu(){const SEP={sep:1};return [...meta.list.map(e=>({label:e.title,note:countOf(e),thumb:thumbOf(e),check:e.id===meta.cur,run:()=>go(e.id)})),SEP,
  {label:'새 회차 (빈 원고 · 지금 인물로 시작)',run:add},{label:'이 회차 복제해 새 회차',run:dup},SEP,
  {label:'고른 컷을 이 회차 표지로',disabled:!(typeof pageSelection==='string'&&pageSelection),run:setCover},  {label:'이름 바꾸기',run:rename},{label:'앞으로',disabled:meta.list.indexOf(cur())===0,run:()=>move(-1)},{label:'뒤로',disabled:meta.list.indexOf(cur())===meta.list.length-1,run:()=>move(1)},
  {label:'이 회차 지우기',disabled:meta.list.length<2,run:remove},SEP,{label:'등장인물은 회차마다 따로 · 세계관·작화 설정·글꼴은 같이 써요',disabled:true}]}
btn.addEventListener('click',e=>{e.stopPropagation();const r=btn.getBoundingClientRect();window.RoughWS?.cmOpen?.(menu(),r.left,r.bottom+4)});
paint();setTimeout(paint,1500);setTimeout(paint,4000);  // 그림 저장소를 늦게 읽어 오므로 다시
window.RoughEpisodes={get list(){return meta.list.slice()},get cur(){return cur()},go,add,dup,rename,remove};
})();
