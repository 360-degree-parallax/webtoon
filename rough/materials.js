(function (root) {
  'use strict';
  const variants=['A','B','C','D'];
  const clean=value=>String(value??'').normalize('NFKC').replace(/\s+/g,'');
  let indexRequest,installed=null,cacheVersion=0;
  const artCache=new Map(),byWord=new Map(),byId=new Map();
  const text=new TextDecoder();
  function error(){return new Error('이 효과음 ZIP을 읽을 수 없어요.')}
  const read=(file,start,end)=>file.slice(start,end).arrayBuffer().then(buf=>new DataView(buf));
  async function archive(file){
    const offset=Math.max(0,file.size-65557);
    const tail=await read(file,offset,file.size);
    let end=tail.byteLength-22;
    while(end>=0&&(tail.getUint32(end,true)!==0x06054b50||end+22+tail.getUint16(end+20,true)!==tail.byteLength))end--;
    if(end<0||tail.getUint16(end+4,true)||tail.getUint16(end+6,true))throw error();
    const count=tail.getUint16(end+10,true),length=tail.getUint32(end+12,true),start=tail.getUint32(end+16,true);
    if(count<1||count>3000||length>1024*1024||start+length>file.size)throw error();
    const catalog=await read(file,start,start+length),files=new Map();
    for(let pos=0;pos<catalog.byteLength;){
      if(pos+46>catalog.byteLength||catalog.getUint32(pos,true)!==0x02014b50)throw error();
      const nameLength=catalog.getUint16(pos+28,true),nameEnd=pos+46+nameLength;
      if(nameEnd>catalog.byteLength)throw error();
      const name=text.decode(new Uint8Array(catalog.buffer,pos+46,nameLength));
      files.set(name,{method:catalog.getUint16(pos+10,true),packed:catalog.getUint32(pos+20,true),
        size:catalog.getUint32(pos+24,true),offset:catalog.getUint32(pos+42,true)});
      pos=nameEnd+catalog.getUint16(pos+30,true)+catalog.getUint16(pos+32,true);
    }
    async function unpack(name){
      const entry=files.get(name),cap=2*1024*1024;
      if(!entry||entry.size>cap||entry.packed>cap||entry.offset+30>start)throw error();
      const head=await read(file,entry.offset,entry.offset+30);
      if(head.getUint32(0,true)!==0x04034b50)throw error();
      const dataStart=entry.offset+30+head.getUint16(26,true)+head.getUint16(28,true);
      if(dataStart+entry.packed>start)throw error();
      const data=file.slice(dataStart,dataStart+entry.packed);
      if(entry.method===0&&data.size===entry.size)return data;
      if(entry.method!==8)throw error();
      const reader=data.stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),parts=[];
      let size=0;
      for(;;){
        const {done,value}=await reader.read();if(done)break;
        size+=value.length;
        if(size>entry.size){await reader.cancel();throw error()}
        parts.push(value);
      }
      if(size!==entry.size)throw error();
      return new Blob(parts);
    }
    const csv=text.decode(await (await unpack('효과음-목록.csv')).arrayBuffer());
    const rows=csv.trim().split(/\r?\n/).slice(1).map(line=>line.split(','));
    const entries=rows.map(([id,word,category,,...paths])=>{
      if(!/^\d{3}$/.test(id)||!word||!category||paths.length!==4||
        paths.some((path,i)=>path!=='png/'+id+'/'+variants[i]+'.png'||!files.has(path)))throw error();
      return {id,word,category,paths,source:unpack};
    });
    if(entries.length!==615||new Set(entries.map(entry=>entry.id)).size!==615)throw error();
    return entries;
  }
  function assetStorage(mode,file){
    return new Promise((resolve,reject)=>{
      const open=indexedDB.open('rough-local-materials',1);
      open.onupgradeneeded=()=>open.result.createObjectStore('packs');
      open.onerror=()=>reject(open.error);open.onblocked=()=>reject(error());
      open.onsuccess=()=>{
        const db=open.result,tx=db.transaction('packs',mode),store=tx.objectStore('packs');
        const op=mode==='readonly'?store.get('sfx'):store.put(file,'sfx');
        tx.oncomplete=()=>{db.close();resolve(op.result)};
        tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||error())};
      };
    });
  }
  function register(rows){
    cacheVersion++;artCache.clear();byWord.clear();byId.clear();
    for(const entry of rows){byWord.set(clean(entry.word),entry);byId.set(entry.id,entry)}
    installed=rows;return rows;
  }
  // 사이트에 기본으로 들어 있는 묶음(rough/sfx/list.csv + png/번호/A~D.png). 그림은 쓸 때 하나씩 받아 옴
  async function builtin(){
    const res=await fetch('sfx/list.csv');if(!res.ok)return [];
    const rows=(await res.text()).trim().split(/\r?\n/).slice(1).map(line=>line.split(','));
    return rows.filter(([id,word,category,,...paths])=>/^\d{3}$/.test(id)&&word&&category&&paths.length===4&&
      paths.every((path,i)=>path==='png/'+id+'/'+variants[i]+'.png'))
      .map(([id,word,category,,...paths])=>({id,word,category,paths,source:path=>fetch('sfx/'+path).then(r=>{if(!r.ok)throw error();return r.blob()})}));
  }
  function ready(){
    if(installed)return Promise.resolve(installed);
    // 이 브라우저에 직접 불러온 ZIP이 있으면 그것, 없으면 사이트 기본 묶음
    if(!indexRequest)indexRequest=assetStorage('readonly').then(async file=>file?archive(file):[])
      .catch(()=>[]).then(async rows=>rows.length?rows:builtin().catch(()=>[])).then(rows=>installed||register(rows));
    return indexRequest;
  }
  async function install(file){
    if(!file)throw error();
    const rows=await archive(file);
    await assetStorage('readwrite',file);
    return register(rows);
  }
  function find(word){
    const key=clean(word);
    return byWord.get(key)||byWord.get(key.replace(/(?:\.{2,}|[…!？?~～—–―]+)$/u,''));
  }
  function dataURL(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error||error());
      reader.readAsDataURL(blob);
    });
  }
  async function load(entry){
    if(!entry)return;
    if(!artCache.has(entry.id)){
      const version=cacheVersion,record={};
      record.pending=Promise.all(entry.paths.map(async path=>{
        const blob=await entry.source(path),header=await read(blob,0,24);
        if(header.byteLength!==24||header.getUint32(0)!==0x89504e47)throw error();
        return {width:header.getUint32(16),height:header.getUint32(20),src:await dataURL(new Blob([blob],{type:'image/png'}))};
      })).then(art=>{record.art=art;return art}).catch(err=>{if(version===cacheVersion)artCache.delete(entry.id);throw err});
      artCache.set(entry.id,record);
    }
    return artCache.get(entry.id).pending;
  }
  function image(entry,variant){return artCache.get(entry?.id)?.art?.[variants.indexOf(variant)]||null}
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function lineEffect(effect,box,random){
    if(!effect||!['focus','speed'].includes(effect.kind))return '';
    const {x,y,w,h}=box,ox=x+effect.x*w,oy=y+effect.y*h;
    const color=/^#[0-9a-f]{6}$/i.test(effect.color)?effect.color:'#27211e';
    const density=clamp(Number(effect.density)||50,12,90),segments=[];
    const point=(px,py)=>px.toFixed(1)+' '+py.toFixed(1);
    const R=Math.hypot(w,h)*1.14, opening=Math.min(w,h)*.23;
    if(effect.kind==='focus'){
      for(let i=0;i<density;i++){
        const a=(i+random()*.75)*2*Math.PI/density,dx=Math.cos(a),dy=Math.sin(a);
        const start=opening*(.92+random()*.79),weight=(.7+random()*2.6)*w/630;
        segments.push('M'+point(ox+dx*start,oy+dy*start)+'L'+point(ox+dx*R-dy*weight,oy+dy*R+dx*weight)+'L'+point(ox+dx*R+dy*weight,oy+dy*R-dx*weight)+'Z');
      }
    }else{
      const angle=effect.angle||0,dx=Math.cos(angle),dy=Math.sin(angle);
      for(let i=0;i<density;i++){
        const cross=(random()-.5)*R,along=(random()-.55)*R;
        const ax=ox+along*dx-cross*dy,ay=oy+along*dy+cross*dx;
        const reach=(.10+random()*.34)*R,weight=(.8+random()*2.5)*w/630;
        segments.push('M'+point(ax,ay)+'L'+point(ax-dx*reach-dy*weight,ay-dy*reach+dx*weight)+'L'+point(ax-dx*reach+dy*weight,ay-dy*reach-dx*weight)+'Z');
      }
    }
    return '<path fill="'+color+'" opacity="'+(effect.kind==='focus'?'.72':'.48')+'" d="'+segments.join(' ')+'"/>';
  }
  root.RoughMaterials={variants,ready,install,find,entry:id=>byId.get(id),load,image,lineEffect};
})(typeof window==='object'?window:globalThis);
