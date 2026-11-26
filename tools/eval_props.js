#!/usr/bin/env node
// 소품 화면 판단 시험: 보임(on)·화면 밖 — 나온 효과만(source)·언급만(absent)을 맞히는지
//   기본: tests/fixtures/prop-presence.json (문장 → NAI.propPresence)
//   --holdout: prop-presence-holdout.json (규칙을 고칠 때 보지 않은 확인용)
//   --script: 씬 스크립트 컷(prop-script.json 생성 + prop-script-hand.json 손으로 씀) → 컷 글 해석(RE.parseCut) → 컷 프롬프트(NAI.cut)까지 거쳐
//             그 소품이 o.props(보임)인지 o.propsOff(화면 밖·언급만)인지
// 사용: node tools/eval_props.js [--holdout|--script] [--all] [--min 0.9]   정확도가 --min 아래면 종료 코드 1
const path = require('path'), R = path.join(__dirname, '..');
const N = require(path.join(R, 'rough', 'nai.js')), E = require(path.join(R, 'rough', 'engine.js'));
// 도구에 내장된 배운 동작도 앱처럼 씀(rough/learned-actions.json — merge_learned.py가 합친 뒤 이 시험으로 확인)
try { const L = require(path.join(R, 'rough', 'learned-actions.json')).items || []; N.useLearned(L.map(x => [[x.ko], String(x.tags).split(',').map(t => t.trim()).filter(Boolean)])); } catch (_) {}
const A = process.argv, all = A.includes('--all'), min = A.includes('--min') ? +A[A.indexOf('--min') + 1] : 0.9;
const fx = f => require(path.join(R, 'tests', 'fixtures', f));
const label = r => r.on ? 'on' : r.why === 'source' ? 'source' : 'absent';
let sets;
if (A.includes('--script')) {
  const g = fx('prop-script.json'), h = fx('prop-script-hand.json');
  const names = [...new Set([...g.cases, ...h.cases].map(c => c.p))];
  E.PROP_NAMES = names;  // 앱에서는 설정집 물건 이름(등록된 소품)으로 조사를 떼므로 같게
  const judge = (c, chars) => {
    const ch = chars.map(n => ({ name: n })), b = E.parseCut(c.t, ch, 0);
    const p = { ...b, shot: '중경', ang: '아이레벨', emo: '평온', i: 1, h: 1, vng: 'I' };
    const o = N.cut(p, 0, [p], { chars: ch.map(x => ({ ...x, body: 'male' })), props: q => (q.props || []).map(x => ({ name: x.name, tags: 'prop tag' })) });
    if ((o.props || []).some(x => x.name === c.p)) return 'on';
    const off = (o.propsOff || []).find(x => x.name === c.p); return off ? (off.why === 'source' ? 'source' : 'absent') : 'missing';
  };
  sets = [['생성', g.cases.map(c => [c, judge(c, g.chars)])], ['손으로 씀', h.cases.map(c => [c, judge(c, h.chars)])]];
} else {
  const F = fx(A.includes('--holdout') ? 'prop-presence-holdout.json' : 'prop-presence.json');
  sets = [[A.includes('--holdout') ? '확인용' : '시험', F.cases.map(c => [c, label(N.propPresence(c.t, c.p))])]];
}
let fail = false;
for (const [name, rows] of sets) {
  const conf = {}, out = []; let ok = 0; const byNote = {};
  for (const [c, g] of rows) {
    const hit = g === c.want; if (hit) ok++;
    conf[c.want + '→' + g] = (conf[c.want + '→' + g] || 0) + 1;
    if (c.note) { const b = byNote[c.note] ||= [0, 0]; b[1]++; if (hit) b[0]++; }
    if (!hit || all) out.push(`${hit ? '  ' : '✗ '}${c.want.padEnd(6)} ${g.padEnd(7)} ${c.p}: ${c.t.replace(/\n/g, ' ⏎ ')}`);
  }
  const acc = ok / rows.length; if (acc < min) fail = true;
  if (out.length) console.log(out.join('\n'));
  console.log(`[${name}] ${rows.length}문장 · 정확도 ${(acc * 100).toFixed(1)}% · 정답→판단 ${JSON.stringify(conf)}`);
  const weak = Object.entries(byNote).filter(([, [a, b]]) => a < b);
  if (weak.length) console.log('  유형별 틀림: ' + weak.map(([k, [a, b]]) => `${k} ${b - a}/${b}`).join(' · '));
}
process.exit(fail ? 1 : 0);
