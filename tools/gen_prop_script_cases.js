#!/usr/bin/env node
// 씬 스크립트 형식 소품 시험 문장 만들기 → tests/fixtures/prop-script.json
//   소품 40종(빛나는 것·연기 나는 것·소리 나는 것·그냥 물건) × 스크립트 유형(들고 씀·자체 발광·나온 효과가 닿음·떠올림·분실·
//   대사에만·식자에만·배경에 놓임·건넴·대사+행동·떠올리며 쥠 …). 조사는 받침에 맞춰. 정답: on(보임)·source(화면 밖, 나온 효과만)·absent(언급만)
//   손으로 쓴 여러 줄 컷(tests/fixtures/prop-script-hand.json)과 함께 tools/eval_props.js --script로 잼
const fs = require('fs'), path = require('path');
const bat = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 ? c % 28 : 0; };
const J = (w, a, b) => w + (bat(w) ? a : b);                 // 을/를 · 이/가 · 은/는 · 과/와
const RO = w => w + (bat(w) && bat(w) !== 8 ? '으로' : '로');
const CH = ['명경', '준', '에드가', '두나', '아린', '시윤'];
const P = {
  light: ['조마경', '수정구', '반지', '목걸이', '지팡이', '성검', '등불', '램프', '부적', '왕관', '구슬', '횃불'],
  smoke: ['향로', '담배', '모닥불', '찻주전자', '향초'],
  sound: ['종', '피리', '오르골', '라디오', '휴대폰', '시계', '방울'],
  plain: ['편지', '책', '열쇠', '우산', '가면', '단검', '사진', '일기장', '부채', '꽃병', '손수건', '지갑', '머리핀', '안경', '장갑', '쪽지'],
};
const EM = { light: [['빛줄기', '쏟아진'], ['빛', '번진'], ['섬광', '터져 나온'], ['불빛', '새어 나온']], smoke: [['연기', '피어오른'], ['연기', '흘러나온']], sound: [['소리', '울린'], ['선율', '흘러나온'], ['목소리', '흘러나온']] };
const LAND = ['@B의 얼굴을 덮친다.', '@B을 감싼다.', '방 안을 가득 채운다.', '@B의 등을 비춘다.', '어둠을 가른다.'];
const cases = []; let k = 0;
const add = (t, p, want, note) => cases.push({ t, p, want, note });
for (const [cat, list] of Object.entries(P)) for (const p of list) {
  const A = CH[k % CH.length], B = CH[(k + 2) % CH.length]; k++;
  const land = l => l.replace('@B의', '@' + B + '의').replace('@B을', '@' + J(B, '을', '를'));
  add(`@${J(A, '이', '가')} #${J(p, '을', '를')} 집어 든다.`, p, 'on', '들고 씀');
  add(`@${J(A, '이', '가')} #${J(p, '을', '를')} 꽉 움켜쥔다. {클로즈업}`, p, 'on', '들고 씀·연출');
  add(`탁자 위에 #${J(p, '이', '가')} 놓여 있다.`, p, 'on', '배경에 놓임');
  add(`@${J(A, '이', '가')} #${J(p, '을', '를')} @${B}에게 건넨다.`, p, 'on', '건넴');
  add(`@${J(A, '이', '가')} 잃어버린 #${J(p, '을', '를')} 떠올린다.`, p, 'absent', '떠올림');
  add(`@${J(A, '은', '는')} #${p} 생각에 잠긴다.`, p, 'absent', '생각');
  add(`@${J(A, '이', '가')} 방 안을 둘러본다.\n@${A} "#${p} 어디 갔지?"`, p, 'absent', '대사에만');
  add(`[그날 #${J(p, '은', '는')} 사라졌다.]\n@${J(A, '이', '가')} 창밖을 본다.`, p, 'absent', '식자에만');
  add(`@${J(A, '이', '가')} #${J(p, '을', '를')} 쥔 채 그날을 떠올린다.`, p, 'on', '쥐고 떠올림');
  add(`@${A} "이 #${p}만 있으면…"\n@${J(A, '이', '가')} #${J(p, '을', '를')} 품에 안는다.`, p, 'on', '대사+행동');
  add(`서랍을 연 @${A}. 있어야 할 #${J(p, '이', '가')} 없다.`, p, 'absent', '없음');
  if (EM[cat]) {
    const [n, v] = EM[cat][k % EM[cat].length];
    add(`#${p}에서 ${v} ${J(n, '이', '가')} ${land(LAND[k % LAND.length])}`, p, 'source', '나온 효과가 닿음');
    add(`#${p}에서 ${v} ${J(n, '이', '가')} @${A}의 발치까지 닿는다. -${cat === 'sound' ? '딸랑' : '쏴아'}-`, p, 'source', '나온 효과+효과음');
  }
  if (cat === 'light') {
    add(`#${J(p, '이', '가')} 스스로 빛나기 시작한다.`, p, 'on', '자체 발광');
    add(`@${A}의 손안에서 #${J(p, '이', '가')} 희미하게 빛난다.`, p, 'on', '손안에서 빛남');
    add(`#${p}의 빛이 @${J(B, '을', '를')} 감싼다.`, p, 'source', '○○의 빛');
  }
  if (cat === 'smoke') add(`#${p}에서 연기가 피어오른다.`, p, 'on', '자체 연기');
  if (cat === 'sound') add(`@${J(A, '이', '가')} #${J(p, '을', '를')} 흔든다. -딸랑-`, p, 'on', '소리 내며 다룸');
}
fs.writeFileSync(path.join(__dirname, '..', 'tests', 'fixtures', 'prop-script.json'), JSON.stringify({ about: '씬 스크립트 형식 소품 시험(tools/gen_prop_script_cases.js로 만듦) — 컷 글 해석부터 프롬프트까지 거쳐 판단', chars: CH, cases }, null, 1));
console.log('prop-script.json', cases.length, '문장');
