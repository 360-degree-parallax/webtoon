/* Built-in visual asset presets. Original procedural artwork, not cropped reference images. */
window.RoughBuiltinVisuals = (() => {
  const groups=[
    ['mood','감정 심상 배경',[
      ['romance','설렘·다정',24,['설렘','다정']],['tension','긴장·불안',24,['긴장','당황']],['lonely','쓸쓸함·고립',16,['쓸쓸']],['anger','분노·결의',16,['분노','결의']],['comedy','기쁨·개그',16,['기쁨','개그']],['memory','회상·평온',16,['회상','평온']],['surprise','놀람·당황',8,['놀람','당황']]]],
    ['light','조명·그림자',[
      ['window','창문·문틀 그림자',16,[]],['leafshadow','나뭇잎·자연 그림자',12,[]],['blinds','블라인드·커튼 그림자',12,[]],['rays','광선·역광',16,[]],['flare','빛샘·플레어',12,[]],['vignette','국소 명암·비네팅',12,[]]]],
    ['air','환경·공기 효과',[
      ['rain','비·물방울',16,[]],['snow','눈·서리',12,[]],['fog','안개·연기',16,[]],['dust','먼지·빛 입자',12,[]],['petals','꽃잎·나뭇잎',12,[]],['embers','불티·파편',12,[]]]]
  ];
  const entries=groups.flatMap(([group,category,types])=>types.flatMap(([kind,name,count,emotions])=>Array.from({length:count},(_,i)=>({
    id:'builtin:'+kind+':'+String(i+1).padStart(2,'0'),kind,group,category,name:name+' '+String(i+1).padStart(2,'0'),variant:i,
    emotions,semantic_status:'inferred_unreviewed',source:'original_procedural',format:'png',placement:'overlay',
    defaultOpacity:group==='mood'?55:group==='light'?65:80
  }))));
  const map=new Map(entries.map(e=>[e.id,e]));
  function render(id,width=800,height=1000){
    const p=map.get(id); if(!p)throw Error('Unknown built-in material');
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const c=canvas.getContext('2d'),w=width,h=height,v=p.variant;
    let seed=2166136261; for(const ch of id)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
    const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const r=(a,b)=>a+(b-a)*rnd(), choose=a=>a[Math.floor(rnd()*a.length)];
    const rgba=(rgb,a)=>'rgba('+rgb.join(',')+','+Math.max(0,Math.min(1,a))+')';
    const glow=(x,y,radius,rgb,a)=>{const g=c.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,rgba(rgb,a));g.addColorStop(.32,rgba(rgb,a*.65));g.addColorStop(1,rgba(rgb,0));c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);};
    const ellipse=(x,y,rx,ry,angle,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();};
    const line=(x,y,xx,yy,color,weight)=>{c.strokeStyle=color;c.lineWidth=weight;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();};
    const wash=(rgb,alpha=.35)=>{const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,rgba(rgb,alpha));g.addColorStop(.6,rgba(rgb,alpha*.06));g.addColorStop(1,rgba(rgb,alpha*.7));c.fillStyle=g;c.fillRect(0,0,w,h);};
    const spark=(x,y,s,color)=>{c.fillStyle=color;c.beginPath();c.moveTo(x,y-s);c.quadraticCurveTo(x+s*.12,y-s*.12,x+s*.65,y);c.quadraticCurveTo(x+s*.12,y+s*.12,x,y+s);c.quadraticCurveTo(x-s*.12,y+s*.12,x-s*.65,y);c.quadraticCurveTo(x-s*.12,y-s*.12,x,y-s);c.fill();};
    const palette={
      romance:[[239,153,181],[248,201,183],[197,160,218],[255,229,190]],
      tension:[[30,33,54],[51,43,67],[36,58,76],[61,35,48]],
      lonely:[[108,145,173],[144,159,176],[160,157,184],[110,145,140]],
      anger:[[155,22,32],[75,17,29],[220,78,29],[111,39,68]],
      comedy:[[250,205,93],[163,195,247],[244,157,199],[146,214,185]],
      memory:[[212,168,107],[179,154,131],[225,204,166],[164,189,166]],
      surprise:[[101,129,198],[197,171,231],[251,204,129],[111,164,182]]
    };
    const kind=p.kind,level=1+(v%4),style=Math.floor(v/4);
    if(p.group==='mood'){
      const rgb=palette[kind][v%4];wash(rgb,kind==='anger'||kind==='tension'?.6:.3);
      if(kind==='romance'||kind==='memory'||kind==='lonely'){
        for(let i=0;i<18+level*8;i++){let x=r(0,w),y=r(0,h);if(style%2===0&&x>w*.22&&x<w*.78&&y>h*.2&&y<h*.8)continue;glow(x,y,r(w*.025,w*.23),rgb,r(.08,.28));}
        if(style%3===0||kind==='romance')for(let i=0;i<14+level*5;i++){let x=r(0,w),y=r(0,h),s=r(5,32);ellipse(x,y,s,s*r(.28,.72),r(0,Math.PI),rgba(rgb,r(.2,.65)));if(i%5===0)spark(x,y,s*.7,rgba([255,255,255],.6));}
        if(kind==='lonely')for(let i=0;i<40;i++)line(r(0,w),r(0,h),r(0,w),r(0,h),rgba(rgb,.018),r(.5,2));
      }else if(kind==='tension'||kind==='anger'){
        for(let i=0;i<48+level*30;i++){const x=r(-w*.2,w*1.2),y=kind==='tension'?r(-h*.12,h*.2):r(-h*.1,h);const len=r(h*.08,h*.5),dx=kind==='anger'?len*r(.35,.8):r(-6,6);line(x,y,x+dx,y+len,rgba(rgb,r(.08,.55)),r(.6,level*4));}
        for(let i=0;i<10;i++)glow(r(0,w),r(0,h),r(30,w*.3),rgb,.18);
      }else{
        const cx=w*(style%2?.37:.5),cy=h*.43;
        for(let i=0;i<32+level*14;i++){const a=r(0,Math.PI*2),d=r(w*.22,w*.75),x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d;if(kind==='surprise')line(x,y,x+Math.cos(a)*r(50,240),y+Math.sin(a)*r(50,240),rgba(rgb,r(.2,.7)),r(.7,3));else if(style%2)spark(x,y,r(4,24),rgba(rgb,.65));else ellipse(x,y,7+level*3,7+level*3,0,rgba(rgb,.34));}
      }
    }else if(kind==='window'||kind==='blinds'){
      c.save();c.translate(w*.5,h*.5);c.rotate((v%8-3.5)*.15);c.filter='blur('+((v%4)*3+2)+'px)';c.fillStyle=rgba([22,23,37],.24+level*.09);
      if(kind==='window'){const cols=2+style%3,rows=2+v%3;for(let i=0;i<=cols;i++)c.fillRect(-w*.9+i*w*1.8/cols,-h,14+level*10,h*2);for(let j=0;j<=rows;j++)c.fillRect(-w,-h*.8+j*h*1.6/rows,w*2,14+level*9);}
      else for(let j=-14;j<15;j++)c.fillRect(-w*1.3,j*(35+level*11),w*2.6,10+style*7+level*3);
      c.restore();
    }else if(kind==='leafshadow'){
      c.save();c.filter='blur('+(2+level*2)+'px)';for(let b=0;b<4+style*2;b++){let x=r(-w*.15,w*.65),y=r(-h*.15,h*.75),xx=x+r(80,300),yy=y+r(80,360);line(x,y,xx,yy,rgba([25,30,38],.3),5);for(let j=0;j<13;j++){let t=r(0,1),lx=x+(xx-x)*t+r(-55,55),ly=y+(yy-y)*t+r(-55,55);ellipse(lx,ly,r(12,45),r(6,23),r(-2,2),rgba([24,31,39],r(.14,.48)));}}c.restore();
    }else if(kind==='rays'||kind==='flare'){
      const rgb=choose([[255,220,158],[255,246,214],[201,228,255],[255,185,175]]);
      const x=w*(v%3===0?.08:v%3===1?.5:.92),y=h*.05;
      glow(x,y,w*.65,rgb,.65);
      if(kind==='rays'){c.save();c.filter='blur('+(2+level*2)+'px)';for(let i=0;i<10+level*4;i++){const a=r(.15,Math.PI-.15),a2=a+r(.012,.09),l=h*1.5;const g=c.createRadialGradient(x,y,0,x,y,l);g.addColorStop(0,rgba(rgb,.4));g.addColorStop(1,rgba(rgb,0));c.fillStyle=g;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.lineTo(x+Math.cos(a2)*l,y+Math.sin(a2)*l);c.fill();}c.restore();}
      else for(let i=0;i<4+level;i++){const t=(i+1)/(5+level);glow(x+(w*.5-x)*t*2,y+(h*.55-y)*t*1.8,r(12,w*.15),choose([rgb,[173,207,255],[255,176,190]]),r(.12,.3));}
    }else if(kind==='vignette'){
      const x=w*(v%3===0?.35:v%3===1?.5:.65),y=h*(style%2?.34:.52);const g=c.createRadialGradient(x,y,w*.12,x,y,Math.hypot(w,h)*.65);g.addColorStop(0,'rgba(12,13,23,0)');g.addColorStop(.45,'rgba(12,13,23,.02)');g.addColorStop(1,rgba([12,13,23],.35+level*.13));c.fillStyle=g;c.fillRect(0,0,w,h);
    }else if(kind==='rain'){
      const rgb=style%2?[142,174,209]:[223,238,249],slant=(v%4-1.5)*.28;for(let i=0;i<90+level*100;i++){const x=r(-50,w+50),y=r(-50,h+50),l=r(12,90)*(1+style*.25);line(x,y,x+slant*l,y+l,rgba(rgb,r(.12,.65)),r(.6,2.2));}
    }else if(kind==='snow'||kind==='dust'||kind==='embers'){
      const rgb=kind==='snow'?[235,246,255]:kind==='dust'?[255,227,171]:[255,119,39];
      for(let i=0;i<35+level*65;i++){const x=r(0,w),y=r(0,h),s=r(.7,kind==='snow'?9:kind==='dust'?4:6);if(i%5===0)glow(x,y,s*5,rgb,.28);if(kind==='embers')line(x,y,x+s*r(2,5),y-s*2,rgba(rgb,r(.35,.9)),s*.6);else ellipse(x,y,s,s*r(.7,1.1),0,rgba(rgb,r(.18,.9)));}
    }else if(kind==='fog'){
      const rgb=style%2?[75,86,103]:[230,237,243];for(let i=0;i<65+level*25;i++){let x=r(-w*.15,w*1.15),y=h*(style%2?r(.1,.9):r(.52,1.1));glow(x,y,r(w*.07,w*.38),rgb,r(.025,.115));}
    }else if(kind==='petals'){
      const rgb=style%2?[103,158,91]:v%2?[243,158,181]:[255,215,223];
      for(let i=0;i<15+level*12;i++){const x=r(0,w),y=r(0,h),s=r(8,33);c.save();c.translate(x,y);c.rotate(r(0,Math.PI*2));c.fillStyle=rgba(rgb,r(.38,.9));c.beginPath();c.moveTo(-s,0);c.bezierCurveTo(-s*.5,-s*.65,s*.8,-s*.6,s,0);c.bezierCurveTo(s*.4,s*.55,-s*.35,s*.7,-s,0);c.fill();c.restore();}
    }
    return {id:p.id,kind:'overlay',name:p.name,src:canvas.toDataURL('image/png'),w,h,metadata:{...p,width:w,height:h}};
  }
  return {entries,groups,render,get:id=>map.get(id)};
})();
