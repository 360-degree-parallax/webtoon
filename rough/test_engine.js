// 러프 엔진 검증: node rough/test_engine.js
// 손으로 판정한 예시 장면과 엔진 결과를 비교하고, 모든 패턴에서 컷 배치가 범위 안인지 확인한다.
const fs = require('fs');
const path = require('path');
const R = require('./engine.js');
const PATS = JSON.parse(fs.readFileSync(path.join(__dirname, 'patterns.json'), 'utf8')).patterns;

const CASES = [
  { name: '고백 직전', text: '에드가 | 복도 끝에서 걸어옴\n준 | 놀라 돌아봄 "에드가?"\n에드가 | 준의 손목을 잡음\n준 | 얼굴이 붉어짐\n에드가 | "같이 가자" 미소', narr: '중간 정점', peak: 4 }, // 놀람(2)→손목(3)→붉어짐(4) 같은 강도가 이어지면 마지막 반응 컷을 정점으로 본다
  { name: '충격 공개', text: '정원 | 저택 정원에 비가 내림\n카메론 | 우산을 들고 서 있음\n카메론 | 천천히 고개를 듦\n준 | 피 묻은 손을 내밀며 "내가 했어!"', narr: '끝 정점', goal: '충격 강조', peak: 4 },
  { name: '소품 공개', text: '준 | 책상 서랍을 연다\n준 | 무언가를 발견하고 멈칫\n준 | 낡은 편지를 꺼낸다', narr: '끝 정점', goal: '정보 강조', peak: 3 },
  { name: '말다툼', text: '에드가 | "왜 말 안 했어?"\n준 | "말할 수 없었어"\n에드가 | 화를 내며 "그게 이유야?"\n준 | "미안해"\n에드가 | 돌아서서 나감', goal: '관계 대비' },
  { name: '잔잔한 아침', text: '하늘 | 아침 햇살이 창밖에 펼쳐짐\n준 | 침대에서 기지개를 켬\n준 | 창문을 연다\n준 | 차를 따른다', narr: '무정점', goal: '시간 압축' },
  { name: '장면 전환', text: '거리 | 다음 날, 시장 거리\n카메론 | 상인과 흥정함\n카메론 | 무언가를 보고 멈칫', goal: '장면 전환' },
  { name: '첫 컷 폭발', text: '준 | 갑자기 문을 쾅 열며 "에드가!"\n에드가 | 놀라 돌아봄\n준 | 숨을 고름\n준 | 조용히 다가감', narr: '정점 선행' },
  { name: '여운', text: '준 | 혼자 남은 방 뒷모습\n준 | 창밖을 바라봄\n준 | 찻잔이 식어 있음', goal: '여운' },
];

// 감정 사전: 한 줄 → [감정, 강도]
const FEEL = [
  ['준 | 화들짝 놀라 뒤로 물러남', '놀람', 2], ['준 | 살짝 놀람', '놀람', 1],
  ['카메론 | 버럭 "닥쳐!"', '분노', 3], ['카메론 | 이를 갈며 노려봄', '분노', 2],
  ['에드가 | 마른침을 삼키며 문고리를 잡음', '긴장', 2], ['에드가 | 어둠 속에서 발소리가 들림', '긴장', 1],
  ['준 | 귀가 빨개져 시선을 피함', '설렘', 2], ['준 | 에드가와 깍지를 낌', '설렘', 2],
  ['준 | 머쓱하게 손사래를 침', '당황', 2], ['준 | 말끝을 흐리며 변명함', '당황', 2],
  ['준 | 빈자리를 보며 한숨', '쓸쓸', 2], ['준 | 펑펑 운다', '쓸쓸', 3],
  ['에드가 | 주먹을 꽉 쥐고 일어섬', '결의', 2], ['에드가 | 검을 뽑아 앞으로 나섬', '결의', 2],
  ['에드가 | 준의 머리를 살며시 쓰다듬음', '다정', 1], ['에드가 | 담요를 덮어 줌', '다정', 1],
  ['준 | 활짝 웃으며 손을 흔듦', '기쁨', 1], ['준 | 깔깔 웃음', '기쁨', 1],
  ['준 | 고개를 갸우뚱', '의아', 1], ['준 | 미간을 찌푸리며 수상하게 봄', '의아', 1],
  ['카메론 | 코웃음 치며 등을 돌림', '냉담', 1], ['카메론 | 싸늘하게 내려다봄', '냉담', 1],
  ['준 | 처음 만난 날을 떠올림', '회상', 1], ['준 | 어린 시절 추억', '회상', 1],
  ['준 | 꼬르륵 소리에 얼굴을 감쌈', '개그', 1], ['준 | 우당탕 넘어짐', '개그', 1],
  ['준 | 햇살 아래 나른하게 앉아 있음', '평온', 0], ['거리 | 상인과 흥정함', '평온', 0],
];
let fok = 0;
const fbad = [];
for (const [line, emo, i] of FEEL) {
  const b = R.analyze(line)[0].beats[0];
  if (b.emo === emo && b.i === i) fok++; else fbad.push(`${line} → ${b.emo} ${b.i} (기대 ${emo} ${i}, ${b.emoWhy})`);
}
console.log(`감정 사전 ${fok}/${FEEL.length}` + (fbad.length ? '\n  ' + fbad.join('\n  ') : ''));

// 줄글 → 컷: 문장 나누기·인물 찾기·대사 붙이기
const PROSE = `비가 그친 저녁, 저택 복도는 촛불만 흔들리고 있었다. 에드가는 긴 복도 끝에서 천천히 걸어왔다. 발소리를 들은 준이 놀라 돌아보며 "에드가?" 하고 불렀다.
에드가는 대답 대신 준의 손목을 붙잡았다. 준의 얼굴이 순식간에 붉어졌다. 잠시 침묵이 흐른 뒤, 에드가가 희미하게 웃으며 말했다. "같이 가자."`;
let pok = 0, ptot = 0;
for (const chars of [[{ name: '에드가' }, { name: '준' }], []]) {
  const b = R.analyze(PROSE, chars)[0].beats;
  const checks = [[b.length, 6], [b.map(x => x.who).join(','), ',에드가,준,에드가,준,에드가'], [b[2].said, '에드가?'], [b[5].said, '같이 가자.'], [b[2].emo, '놀람'], [b[4].emo, '설렘']];
  for (const [got, want] of checks) { ptot++; if (got === want) pok++; else console.log('  줄글 X', JSON.stringify(got), '≠', JSON.stringify(want)); }
}
// @멘션: 목록이 없어도 @로 부른 이름을 인물로, 조사가 붙어도 이름만
const MPROSE = `복도는 조용했다. @민수는 교실 문을 열었다. 창가의 @지아가 돌아보며 "왔어?" 하고 웃었다. @민수의 얼굴이 붉어졌다. @지아는 @민수에게 다가가 어깨를 두드렸다.`;
for (const chars of [[], [{ name: '민수' }, { name: '지아', aliases: ['지아야'] }]]) {
  const b = R.analyze(MPROSE, chars)[0].beats;
  const checks = [[b.map(x => x.who).join(','), ',민수,지아,민수,지아'], [b[1].act.includes('@'), false], [b[2].said, '왔어?']];
  for (const [got, want] of checks) { ptot++; if (got === want) pok++; else console.log('  멘션 X', JSON.stringify(got), '≠', JSON.stringify(want)); }
}
ptot++; if (R.mentions('@준이 웃었다', [{ name: '준' }])[0].name === '준') pok++; else console.log('  멘션 X @준이');
// 컷별 입력: [식자], @인물 "(지시)대사", 나머지 행동
{
  const cuts = ['비가 그친 저녁, 저택 복도.\n[그날 밤, 저택]', '발소리에 @준 놀라 돌아본다.\n@준 "(놀라서)에드가?"', '@에드가 대답 대신 @준의 손목을 붙잡는다. -툭-', '@준 "(작게, 떨리며)응…"\n[두근]'];
  const b = R.analyzeCuts(cuts, [{ name: '에드가' }, { name: '준' }])[0].beats;
  const checks = [[b.length, 4], [b.map(x => x.who).join(','), ',준,에드가,준'], [b[2].sfx.join(','), '툭'], [b[2].act.includes('-'), false], [b[0].caption, '그날 밤, 저택'], [b[0].role, '설정'], [b[1].said, '에드가?'], [b[1].dialogs[0].note, '놀라서'], [b[1].emo, '놀람'], [b[3].caption, '두근'], [b[3].dialogs[0].who, '준']];
  for (const [got, want] of checks) { ptot++; if (got === want) pok++; else console.log('  컷 입력 X', JSON.stringify(got), '≠', JSON.stringify(want)); }
}
console.log(`줄글 파싱 ${pok}/${ptot}`);

let ok = 0, total = 0;
for (const c of CASES) {
  const an = R.analyze(c.text)[0];
  const checks = [];
  if (c.narr) checks.push(['서사 형태', c.narr, an.narr]);
  if (c.goal) checks.push(['연출 목적', c.goal, an.goal]);
  if (c.peak) checks.push(['정점 컷', c.peak, an.peaks[0] + 1]);
  const marks = checks.map(([k, want, got]) => { total++; if (want === got) ok++; return `${k} ${want === got ? 'O' : 'X'}(${got}${want === got ? '' : ` ≠ ${want}`})`; });
  const top = R.rank(an, PATS, 1)[0];
  console.log(`${c.name.padEnd(8)} ${marks.join('  ')}  | VNG ${an.vng} · ${an.curve} · ${an.tempo} → ${top.p.src}-${top.p.id} ${top.p.name} ${top.pct}%`);
}
console.log(`\n판정 일치 ${ok}/${total}`);

// 범위 검사: 모든 패턴 × 예시 장면
let bad = 0, runs = 0;
for (const c of CASES) {
  const an = R.analyze(c.text)[0];
  for (const p of PATS.filter(p => p.cuts.some(x => x.t === '그림'))) {
    for (const cut of R.layout(an, p)) {
      runs++;
      if (!(cut.h >= 0.45 && cut.h <= 2.4 && cut.gap >= 0.06 && cut.gap <= 1.2 && R.SHOTS.includes(cut.shot) && R.ANGLES.includes(cut.ang))) bad++;
    }
  }
}
console.log(`컷 배치 범위 검사 ${runs}컷 중 벗어남 ${bad}`);
// 소품 화면 판단(보임·화면 밖·언급만): 시험 문장 + 확인용 문장, 각각 90% 이상
const NAI = require('./nai.js'), FX = f => require('../tests/fixtures/' + f).cases;
const propAcc = cs => cs.filter(c => { const r = NAI.propPresence(c.t, c.p); return (r.on ? 'on' : r.why === 'source' ? 'source' : 'absent') === c.want; }).length / cs.length;
const pa = propAcc(FX('prop-presence.json')), ph = propAcc(FX('prop-presence-holdout.json'));
console.log(`소품 화면 판단 ${(pa * 100).toFixed(1)}% · 확인용 ${(ph * 100).toFixed(1)}%`);
// 씬 스크립트 컷으로 컷 글 해석 → 컷 프롬프트까지(tools/eval_props.js --script와 같은 판단)
const sr = require('child_process').spawnSync(process.execPath, [require('path').join(__dirname, '..', 'tools', 'eval_props.js'), '--script', '--min', '0.95'], { encoding: 'utf8' });
console.log((sr.stdout.match(/^\[.*$/gm) || []).join('\n'));
// Claude 결과 점검·보정(NAI.audit): 안 한 동작·화면 밖 소품·없는 인물·한글 태그·중복·인물 없는 컷의 인물 칸
const auditOk = (() => { const NA = require('./nai.js'), chars = [{ name: '명경', body: 'male' }, { name: '준', body: 'female' }];
  const mk = (act, props = []) => { const p = { act, actText: act, who: '명경', shot: '중경', ang: '아이레벨', emo: '평온', i: 1, h: 1, vng: 'I' }; return NA.cut(p, 0, [p], { chars, props: () => props }); };
  const o = mk('명경이 달리지 않고 준을 바라본다. 회중시계에서 빛줄기가 쏟아져 준을 덮친다.', [{ name: '회중시계', tags: 'pocket watch, gold' }]);
  const r = NA.audit(o, { n: 1, base: '2people, pocket watch, light rays, "그만해", 2people', chars: [{ name: '명경', cell: 'B3', prompt: '1boy, running, looking at another' }, { name: '에드가', cell: 'C3', prompt: '1boy' }] });
  const s = NA.audit(mk('텅 빈 복도.'), { base: 'no humans, hallway', chars: [{ name: '명경', cell: 'C3', prompt: '1boy' }] });
  const ok = r.result.base === '2people, light rays' && r.result.chars.length === 1 && !/running/.test(r.result.chars[0].prompt) && /looking at another/.test(r.result.chars[0].prompt)
    && s.result.chars.length === 0 && NA.audit(o, null).fixes.length === 1 && NA.audit(o, { base: 'x', chars: [] }).fixes.length === 0;
  console.log(`Claude 결과 보정 ${ok ? 'O' : 'X'} · ${r.fixes.length}건(${r.fixes.join(' / ')})`); return ok; })();
// 동작·인물 해석(부정·시도·대조·누가·대명사·무리·위치·장소·외형): 시험 세트 + 확인용 세트
const ar = ['', '--holdout'].map(f => require('child_process').spawnSync(process.execPath, [require('path').join(__dirname, '..', 'tools', 'eval_actions.js'), ...(f ? [f] : []), '--min', '0.9'], { encoding: 'utf8' }));
console.log('동작 해석 ' + ar.map((r, k) => (k ? '확인용 ' : '') + ((r.stdout.match(/정확도 [\d.]+%/) || ['?'])[0])).join(' · '));
process.exit(ok === total && bad === 0 && fok === FEEL.length && pok === ptot && pa >= .9 && ph >= .9 && sr.status === 0 && ar.every(r => r.status === 0) && auditOk ? 0 : 1);
