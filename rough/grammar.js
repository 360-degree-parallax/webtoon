// 씬 글 문법 → 편집 설정
// 엔진(engine.js)이 {…} 안의 샷·앵글·길이·간격·하이라이트를 읽고, 나머지(p.dir.fx)와 대사 메모·효과음 크기를 여기서 편집 설정으로 바꾼다.
// 글에서 나온 값은 '기본값'이고, 편집 화면에서 직접 바꾼 값(pageEdits)이 항상 이긴다. 글을 지우면 효과도 사라짐.
(function(){
  const COLORS={검정:'#111111',검은색:'#111111',까만:'#111111',흑:'#111111',어둠:'#0b0d12',밤:'#101621',
    흰색:'#ffffff',하양:'#ffffff',흰:'#ffffff',회색:'#777777',잿빛:'#8a8a8a',빨강:'#7a1c1c',핏빛:'#5c0b0b',붉은:'#7a1c1c',
    파랑:'#1c2c5a',푸른:'#1c2c5a',하늘:'#a9cdf0',노을:'#d9825b',주황:'#d9825b',노랑:'#f2d56b',초록:'#2f5e3a',분홍:'#f2c4cf',보라:'#4b2d63',갈색:'#5b4030',베이지:'#efe4d0'};
  // 말풍선 모양: 지시 낱말·대사 메모(괄호) 속 낱말 → BALLOON_STYLES 키
  const BALLOON_WORDS=[
    [/^(속삭임|속삭이며|작게|소곤)/,'whisper'],[/^(외침|외치며|소리침|소리치며|비명|고함|절규)/,'torn'],
    [/^(생각|속마음|속으로|독백|상상|회상)/,'hazy'],[/^(전화|통화|무전|스피커|방송|화면)/,'phone'],
    [/^(분노|화내며|버럭|격분)/,'charcoal'],[/^(숨|헐떡|거친 숨|호흡|가쁜)/,'breath'],
    [/^(의미심장|충격|각성)/,'radial'],[/^(떨림|떨리며|덜덜|겁먹은)/,'tight-wave'],[/^(나레이션 상자|네모 상자)/,'narration'],
    [/^(둥근 네모|라운드)/,'round-box']];
  const NOTE_WORDS=[[/속삭|소곤|작게/,'whisper'],[/외치|외침|소리치|소리 지르|비명|고함|절규/,'torn'],[/생각|속으로|독백|속마음/,'hazy'],
    [/전화|통화|무전|스피커/,'phone'],[/화내|분노|버럭|격분/,'charcoal'],[/헐떡|숨을|숨 가|가쁘/,'breath'],[/떨며|떨리|덜덜/,'tight-wave']];
  const styleOf=t=>{for(const [re,k] of BALLOON_WORDS)if(re.test(t))return k;
    const named=typeof BALLOON_STYLES!=='undefined'&&BALLOON_STYLES.find(s=>s[0]===t||s[1]===t||s[1].split(' · ')[0]===t);return named?named[0]:null};
  // 지시·메모가 없을 때: 엔진(학습 모델)이 매긴 감정·강도로. 센 감정(강도 3)과 회상만 — 나머지는 기본 말풍선
  // DB에는 말풍선 '모양' 라벨이 없어(개수만 있음) 모양 자체를 학습할 수는 없음 → 감정·강도 모델 위의 규칙
  const autoStyle=(p,d)=>{const e=p?.emo,i=+p?.i||0;if(e==='회상')return'hazy';if(i<3)return /[!?]{2,}/.test(d?.text||'')&&i>=2?'torn':null;
    return e==='분노'?'charcoal':(e==='놀람'||e==='당황')?'torn':e==='긴장'?'tight-wave':null};
  const noteStyle=n=>{if(!n)return null;for(const [re,k] of NOTE_WORDS)if(re.test(n))return k;return null};
  const presetOf=t=>{if(typeof PAGE_BACKGROUNDS==='undefined')return -1;return PAGE_BACKGROUNDS.findIndex(b=>b&&(b.name===t||b.name.replace(/\s/g,'')===t.replace(/\s/g,'')))};
  const colorOf=t=>/^#[\da-f]{6}$/i.test(t)?t.toLowerCase():/^#[\da-f]{3}$/i.test(t)?'#'+[...t.slice(1)].map(c=>c+c).join('').toLowerCase():COLORS[t.replace(/색$/,'')]||COLORS[t]||null;
  const POS={왼쪽:[.25,.5],오른쪽:[.75,.5],위:[.5,.25],아래:[.5,.75],가운데:[.5,.5],중앙:[.5,.5]};
  const DIRS={가로:0,오른쪽:0,'→':0,왼쪽:Math.PI,'←':Math.PI,위:-Math.PI/2,위로:-Math.PI/2,'↑':-Math.PI/2,아래:Math.PI/2,아래로:Math.PI/2,세로:Math.PI/2,'↓':Math.PI/2,사선:-Math.PI/4};
  function line(kind,mods){const e={kind,x:.5,y:.5,angle:0,color:'#27211e',density:kind==='focus'?50:44};
    for(const m of mods){if(/진하게|강하게|빽빽/.test(m))e.density=80;else if(/연하게|약하게|듬성/.test(m))e.density=26;
      else if(POS[m]&&kind==='focus')[e.x,e.y]=POS[m];else if(DIRS[m]!==undefined&&kind==='speed')e.angle=DIRS[m];else{const c=colorOf(m);if(c)e.color=c}}
    return e}
  // p: 엔진 컷(p.dir.fx · p.dialogs[n].fx/note · p.sfxSize). 돌려주는 값: 편집 설정과 같은 모양 + 해석 못 한 낱말(unknown)
  function derive(p){const out={},unknown=[];if(!p)return{edit:null,unknown};
    const fx=p.dir?.fx||[];let cutStyle=null;
    for(const raw of fx){const t=raw.trim(),w=t.split(/\s+/);let m;
      if((m=t.match(/^(?:확대|줌|zoom)\s*([\d.]+)\s*(%|배)?$/i))){let s=+m[1];if(m[2]==='%'||s>=10)s/=100;if(s>1)out.img={s:Math.min(5,+s.toFixed(2))}}
      else if(w[0]==='집중선'){(out.materialLines||={}).focus=line('focus',w.slice(1))}
      else if(w[0]==='속도선'){(out.materialLines||={}).speed=line('speed',w.slice(1))}
      else if((m=t.match(/^(?:배경|전환|배경색)\s+(.+)$/))){const v=m[1].trim(),k=presetOf(v),c=colorOf(v);if(k>0)out.transition=k;else if(c)out.background=c;else unknown.push(t)}
      else if((m=t.match(/^간격\s*(\d+)\s*(?:px)?$/i)))out.gap=Math.min(1600,+m[1]);
      else if((m=t.match(/^씬\s*끝\s*(흰색|하양|유지|이어서|다음)$/)))out.endTo=m[1]==='유지'?'hold':/이어서|다음/.test(m[1])?'next':'white';
      else if(styleOf(t))cutStyle=styleOf(t);
      else unknown.push(t)}
    // 말풍선: 대사 줄의 {…} → 대사 메모(괄호) → 컷 전체 {…} 순
    const ds=(p.dialogs||[]).filter(d=>d.text);const L={};
    ds.forEach((d,n)=>{const own=(d.fx||[]).map(styleOf).find(Boolean),st=own||noteStyle(d.note)||cutStyle;if(st){L['dialog-'+n]={style:st};return}
      const a=autoStyle(p,d);if(a)L['dialog-'+n]={style:a,auto:true}});
    (p.sfxSize||[]).forEach((z,n)=>{if(z>1)L['effect-'+n]={scale:z===2?1.6:2.2}});
    if(Object.keys(L).length)out.letters=L;
    return{edit:Object.keys(out).length?out:null,unknown}}
  const cache=new WeakMap();
  function fromText(p){if(!p||typeof p!=='object')return null;if(!cache.has(p))cache.set(p,derive(p).edit);return cache.get(p)}
  // 글에서 나온 값 위에 직접 바꾼 값을 덮음(식자·효과선은 항목별로)
  function merge(user,p){const g=fromText(p);if(!g)return user;if(!user)return g;
    const o={...g,...user};
    if(g.letters||user.letters){o.letters={...(g.letters||{})};for(const [k,v] of Object.entries(user.letters||{}))o.letters[k]={...(g.letters?.[k]||{}),...v}}
    if(g.materialLines||user.materialLines)o.materialLines={...(g.materialLines||{}),...(user.materialLines||{})};
    if(g.img&&!(user.img&&user.img.s!=null))o.img={...(user.img||{}),s:g.img.s};  // 직접 정한 배율(1배 포함)이 있으면 그게 이김
    return o}
  // 문법 설명: 도움말·'AI용 복사'·구성안 생성 프롬프트가 같은 글을 씀
  const GUIDE=`# 웹툰 러프 씬 문법
컷 하나 = 칸 하나. 칸 안에서 줄마다:
- 행동·구도 묘사: 그냥 적는다. 인물은 @이름 (예: @준 창가로 다가간다.)
- 대사: @인물 "대사"  · 연기 메모는 괄호 @준 "(속삭이며) 가지 마"
- 나레이션(식자): [그날 밤]
- 효과음: -쿵-  크게 --쿵--  아주 크게 ---쿵---
- 연출 지시: 줄 어디에나 {…}. 여러 개는 쉼표로 {클로즈업, 로우앵글}

## 연출 지시 {…}
- 샷: 설정 · 전경 · 전신 · 중경 · 클로즈업 · 디테일 · 효과 배경 (원경·풀샷·바스트·인서트도 알아들음)
- 앵글: 아이레벨 · 하이앵글 · 로우앵글 · 탑뷰 (부감·앙각도 알아들음)
- 감정: {감정 설렘}처럼 「감정」을 붙여서. 놀람·분노·긴장·설렘·당황·쓸쓸·결의·다정·기쁨·의아·냉담·회상·개그·평온 (판정보다 우선)
- 칸 길이: 짧게 · 길게 · 아주 길게 (또는 길이 1.5)
- 다음 컷까지 간격: 붙임 · 쉼 · 큰 쉼 (또는 간격 300 = px)
- 하이라이트: 이 씬에서 가장 센 컷 → {하이라이트}
- 그림 확대: 확대 1.5 · 확대 200%
- 효과선: 집중선 (진하게·연하게·왼쪽·오른쪽·위·아래·흰색) · 속도선 (가로·세로·위로·아래로·왼쪽·사선)
- 배경: 배경 검정 · 배경 흰색 · 배경 노을 · 배경 #101621 · 분위기 전환 배경 ${typeof PAGE_BACKGROUNDS!=='undefined'?PAGE_BACKGROUNDS.filter(Boolean).map(b=>'배경 '+b.name).join(' · '):''}
- 씬 끝 배경: 씬 끝 흰색 · 씬 끝 유지 · 씬 끝 이어서
- 말풍선 모양: 속삭임 · 외침 · 생각 · 전화 · 분노 · 숨 · 떨림 · 의미심장 (대사 줄에 붙이면 그 대사만, 다른 줄이면 컷의 모든 대사. 대사 메모 "(속삭이며)" "(외치며)"도 자동으로 모양이 바뀜)

## 예시
밤, 하녀 방. 창문을 두드리는 소리. {설정, 하이앵글, 배경 별빛}
-똑똑-
[그날 밤]
---
@준 "(속삭이며) 이 시간에 누구지?" {클로즈업}
---
창밖에 서 있는 @에드가. 장미 한 송이를 들고 있다. {하이라이트, 로우앵글, 집중선, 큰 쉼}
--쿵--
(--- 는 컷 구분을 보여 주려고 적은 것. 실제로는 컷마다 칸이 따로 있음)`;
  // 구성안 생성(Claude)에 붙이는 짧은 규칙
  const PROMPT=`컷 글은 아래 문법으로 쓴다. 지시 {…}는 연출 의도가 분명한 곳에만, 한 컷에 0~3개. 모든 컷에 샷을 붙이지 말고 장면 시작(설정), 감정의 정점(하이라이트·클로즈업·로우앵글 등), 시간이 멈추는 순간(큰 쉼·길게), 소리가 큰 순간(--효과음--)처럼 의미 있는 곳에 쓴다. 말풍선 모양은 대사 메모 (속삭이며)(외치며)(속으로)로 표현해도 된다. 효과음은 -텍스트-, 크게는 --텍스트--. 나레이션은 [문구].
지시 낱말: 샷(설정·전경·전신·중경·클로즈업·디테일·효과 배경) / 앵글(아이레벨·하이앵글·로우앵글·탑뷰) / 길이(짧게·길게·아주 길게) / 다음 컷 간격(붙임·쉼·큰 쉼) / 하이라이트 / 확대 1.5 / 집중선·속도선 가로 / 배경 검정·배경 흰색·배경 노을·배경 별빛·배경 불씨 / 씬 끝 흰색·씬 끝 유지 / 말풍선 속삭임·외침·생각·전화·분노·숨·떨림.
예: '창밖의 @에드가, 장미를 들고 있다. {하이라이트, 로우앵글, 집중선}' / '@준 "(속삭이며) 누구지?" {클로즈업}' / '--쾅--'`;
  window.RoughGrammar={derive,merge,fromText,styleOf,colorOf,get GUIDE(){return GUIDE},PROMPT};
})();
