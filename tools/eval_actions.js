#!/usr/bin/env node
// 동작·인물 해석 시험: tests/fixtures/action-script.json의 씬 스크립트 컷을 컷 글 해석(RE.parseCuts) → 컷 프롬프트(NAI.cut)·레이어(NAI.layers)까지 거쳐
//   인물마다 들어가야/없어야 할 태그, 기본 프롬프트·함께 레이어 태그, 주인공(대명사 포함), 같은 태그가 두 번 안 들어가는지 봄
// 사용: node tools/eval_actions.js [--holdout] [--all] [--min 0.9]  (--holdout: 확인용 세트 — 규칙을 고칠 때 보지 않고 재기만 함)
const path = require('path'), R = path.join(__dirname, '..');
const N = require(path.join(R, 'rough', 'nai.js')), E = require(path.join(R, 'rough', 'engine.js'));
// 도구에 내장된 배운 동작도 앱처럼 씀(rough/learned-actions.json — merge_learned.py가 합친 뒤 이 시험으로 확인)
try { const L = require(path.join(R, 'rough', 'learned-actions.json')).items || []; N.useLearned(L.map(x => [[x.ko], String(x.tags).split(',').map(t => t.trim()).filter(Boolean)])); } catch (_) {}
const F = require(path.join(R, 'tests', 'fixtures', process.argv.includes('--holdout') ? 'action-script-holdout.json' : 'action-script.json'));
const A = process.argv, all = A.includes('--all'), min = A.includes('--min') ? +A[A.indexOf('--min') + 1] : 0.9;
const chars = F.chars.map(([name, body]) => ({ name, body }));
const low = s => String(s || '').toLowerCase();
const grp = {}; let ok = 0; const out = [];
for (const c of F.cases) {
  const cuts = c.prev ? [c.prev, c.t] : c.t.split('\n').length > 1 && c.g === '대명사' ? c.t.split('\n') : [c.t];
  const bs = E.parseCuts(cuts, chars.map(x => ({ name: x.name, body: x.body })));
  const b = bs[bs.length - 1];
  const p = { ...b, shot: '중경', ang: '아이레벨', emo: '평온', i: 1, h: 1, vng: 'I' };
  const o = N.cut(p, 0, [p], { chars, props: q => (q.props || []).map(x => ({ name: x.name, tags: 'prop tag' })) });
  const L = N.layers(o, p, {});
  const promptOf = n => low([(o.layerCast || []).find(x => x.name === n)?.prompt, (o.chars || []).find(x => x.name === n)?.prompt].join(', '));
  const errs = [];
  for (const [n, e] of Object.entries(c.char || {})) {
    const pr = promptOf(n);
    (e.has || []).forEach(t => { if (!pr.includes(low(t))) errs.push(`${n}에 ${t} 없음`); });
    (e.not || []).forEach(t => { if (pr.split(/,\s*|::/).some(x => x.trim() === low(t))) errs.push(`${n}에 ${t} 있음`); });
  }
  const base = low(o.base), gp = low(L.group ? L.group.prompt : '');
  (c.base?.has || []).forEach(t => { if (!base.includes(low(t))) errs.push(`기본에 ${t} 없음`); });
  (c.group?.has || []).forEach(t => { if (!gp.includes(low(t)) && !base.includes(low(t))) errs.push(`함께에 ${t} 없음`); });
  if (c.who && p.who !== c.who) errs.push(`주인공 ${p.who || '없음'}`);
  if (c.dup) { const all2 = [o.base, ...(o.layerCast || []).map(x => x.prompt)].join(', ').split(/,\s*/).map(x => x.trim()).filter(Boolean); const seen = new Set(); all2.forEach(x => { if (seen.has(x) && o.base.split(', ').filter(y => y === x).length > 1) errs.push(`중복 ${x}`); seen.add(x); }); }
  const g = grp[c.g] ||= [0, 0]; g[1]++; if (!errs.length) { g[0]++; ok++; }
  if (errs.length || all) out.push(`${errs.length ? '✗' : ' '} [${c.g}] ${c.t.replace(/\n/g, ' ⏎ ')}${errs.length ? '  → ' + errs.join(' · ') : ''}`);
}
console.log(out.join('\n'));
const acc = ok / F.cases.length;
console.log(`\n${F.cases.length}컷 · 정확도 ${(acc * 100).toFixed(1)}%`);
console.log('유형별: ' + Object.entries(grp).map(([k, [a, b]]) => `${k} ${a}/${b}`).join(' · '));
process.exit(acc >= min ? 0 : 1);
