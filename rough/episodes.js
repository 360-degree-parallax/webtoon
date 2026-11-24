// 회차 관리: 회차마다 씬·구성을 따로 저장하고 바꿔 가며 작업. 인물·세계관·작화 설정·글꼴 같은 작품 설정은 모든 회차가 같이 씀
// 지금 회차는 늘 원래 저장 칸(rough-scenes 등)에 두고, 다른 회차는 rough-ep:<id>:<칸>에 보관 → 바꿀 때 서로 맞바꾸고 새로 불러옴
(function(){
const META='rough-episodes',KEYS=['rough-scenes','rough-scene-cur','rough-composition-v1'];
const ls={get:k=>{try{return localStorage.getItem(k)}catch(_){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);return true}catch(_){return false}}};
const slot=(id,k)=>`rough-ep:${id}:${k}`;
let meta=null;try{meta=JSON.parse(ls.get(META)||'null')}catch(_){}
if(!meta||!Array.isArray(meta.list)||!meta.list.length){meta={cur:'e1',list:[{id:'e1',title:'1화'}]};ls.set(META,JSON.stringify(meta))}
const save=()=>ls.set(META,JSON.stringify(meta));
const cur=()=>meta.list.find(e=>e.id===meta.cur)||meta.list[0];
const flash=t=>window.RoughWS?.flash?.(t);
const newId=()=>'e'+Date.now().toString(36);
const freshScenes=()=>JSON.stringify([{id:'s'+Date.now(),title:'씬 1',cuts:[''],pageEdits:[]}]);

function stash(){if(typeof saveScenes==='function')saveScenes();KEYS.forEach(k=>ls.set(slot(meta.cur,k),ls.get(k)))}
function unstash(id){KEYS.forEach(k=>{const v=ls.get(slot(id,k));ls.set(k,v);ls.set(slot(id,k),null)})}
function go(id){if(id===meta.cur)return;stash();unstash(id);meta.cur=id;save();location.reload()}

// 그림까지 복제: 컷 그림은 씬 id로 저장되므로 새 씬 id로 옮겨 씀
async function cloneScenes(json){const list=JSON.parse(json||'[]'),map={};const t=Date.now();
  list.forEach((sc,k)=>{const nid='s'+t+'_'+k;map[sc.id]=nid;sc.id=nid});
  if(typeof IMG!=='undefined'&&typeof idb!=='undefined'&&typeof cutId==='function'){
    const jobs=Object.values(IMG.cut).filter(r=>map[r.scene]).map(r=>{const o={...r,id:cutId(map[r.scene],r.idx),scene:map[r.scene]};IMG.cut[o.id]=o;return idb.put(o)});
    await Promise.all(jobs).catch(()=>{})}
  return JSON.stringify(list)}

function nextTitle(){const ns=meta.list.map(e=>parseInt(e.title)).filter(n=>!isNaN(n));return (ns.length?Math.max(...ns)+1:meta.list.length+1)+'화'}
function add(){const id=newId(),title=nextTitle();stash();meta.list.push({id,title});
  KEYS.forEach(k=>ls.set(k,null));ls.set('rough-scenes',freshScenes());meta.cur=id;save();location.reload()}
async function dup(){const id=newId(),title=cur().title+' 사본';stash();
  const json=await cloneScenes(ls.get(slot(meta.cur,'rough-scenes')));
  meta.list.splice(meta.list.indexOf(cur())+1,0,{id,title});
  ls.set('rough-scenes',json);ls.set('rough-scene-cur','0');ls.set('rough-composition-v1',ls.get(slot(meta.cur,'rough-composition-v1')));
  meta.cur=id;save();location.reload()}
function rename(){const e=cur(),t=prompt('회차 이름',e.title);if(t==null)return;const v=t.trim().slice(0,30);if(!v)return;e.title=v;save();paint();flash(`회차 이름을 「${v}」(으)로 바꿨어요`)}
function remove(){if(meta.list.length<2){flash('회차가 하나뿐이라 지울 수 없어요');return}const e=cur();
  if(!confirm(`「${e.title}」 회차를 지울까요? 씬·컷·넣은 그림이 모두 지워지고 되돌릴 수 없어요.`))return;
  try{const scs=JSON.parse(ls.get('rough-scenes')||'[]').map(s=>s.id);if(typeof IMG!=='undefined')Object.values(IMG.cut).filter(r=>scs.includes(r.scene)).forEach(r=>{delete IMG.cut[r.id];idb.del(r.id)})}catch(_){}
  const i=meta.list.indexOf(e);meta.list.splice(i,1);const next=meta.list[Math.max(0,i-1)];
  unstash(next.id);meta.cur=next.id;save();setTimeout(()=>location.reload(),150)}
function move(d){const i=meta.list.indexOf(cur()),j=i+d;if(j<0||j>=meta.list.length)return;[meta.list[i],meta.list[j]]=[meta.list[j],meta.list[i]];save();paint()}

const btn=document.createElement('button');btn.className='btn epbtn';btn.id='epbtn';btn.setAttribute('aria-haspopup','menu');btn.title='회차 바꾸기 · 새 회차 · 복제';
const bar=document.getElementById('gscbar');bar?.parentNode.insertBefore(btn,bar);
function paint(){btn.innerHTML=`<b>${esc(cur().title)}</b><small>${meta.list.length>1?`${meta.list.indexOf(cur())+1}/${meta.list.length}`:''}</small><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`}
function menu(){const SEP={sep:1};return [...meta.list.map(e=>({label:e.title,check:e.id===meta.cur,run:()=>go(e.id)})),SEP,
  {label:'새 회차 (빈 원고)',run:add},{label:'이 회차 복제해 새 회차',run:dup},SEP,
  {label:'이름 바꾸기',run:rename},{label:'앞으로',disabled:meta.list.indexOf(cur())===0,run:()=>move(-1)},{label:'뒤로',disabled:meta.list.indexOf(cur())===meta.list.length-1,run:()=>move(1)},
  {label:'이 회차 지우기',disabled:meta.list.length<2,run:remove},SEP,{label:'인물·세계관·작화 설정·글꼴은 모든 회차가 같이 써요',disabled:true}]}
btn.addEventListener('click',e=>{e.stopPropagation();const r=btn.getBoundingClientRect();window.RoughWS?.cmOpen?.(menu(),r.left,r.bottom+4)});
paint();
window.RoughEpisodes={get list(){return meta.list.slice()},get cur(){return cur()},go,add,dup,rename,remove};
})();
