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
      if (!(cut.h >= 0.45 && cut.h <= 2.4 && cut.gap >= 0.08 && cut.gap <= 1.2 && R.SHOTS.includes(cut.shot) && R.ANGLES.includes(cut.ang))) bad++;
    }
  }
}
console.log(`컷 배치 범위 검사 ${runs}컷 중 벗어남 ${bad}`);
process.exit(ok === total && bad === 0 ? 0 : 1);
