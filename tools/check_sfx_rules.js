// 효과음 추천 규칙(rough/sfx-rec.js)의 단어가 소재 목록(rough/sfx/list.csv)에 모두 있는지, 예시 문장 추천 확인
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..','rough');
global.fetch=()=>Promise.resolve({text:()=>Promise.resolve(fs.readFileSync(path.join(R,'sfx/list.csv'),'utf8'))});
require(path.join(R,'sfx-rec.js'));const S=globalThis.RoughSfxRec;
S.ready().then(W=>{const miss=new Set();S.RULES.forEach(([,ws])=>ws.forEach(w=>{if(!W.has(w))miss.add(w)}));Object.values(S.EMO).flat().forEach(w=>{if(!W.has(w))miss.add(w)});
  console.log('규칙',S.RULES.length,'· 목록에 없는 단어',[...miss].join(' ')||'없음');
  for(const t of ['밤, 하녀 방. 창문을 두드리는 소리.','@준 촛불을 들고 창가로 다가간다.','@준 천천히 커튼을 걷는다.','@준 귀가 빨개져 시선을 피한다.','유리잔이 바닥에 떨어져 깨진다.','@에드가 문을 열고 들어온다.','비가 쏟아지는 거리, 차가 급정거한다.','둘 사이에 정적이 흐른다.'])
    console.log(t,'→',S.recommend(t,'').map(x=>x.word+'('+x.why+')').join(', '))
  process.exit(miss.size?1:0)});
