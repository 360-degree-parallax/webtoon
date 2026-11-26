#!/usr/bin/env node
// 소품 화면 판단(NAI.propPresence) 시험: tests/fixtures/prop-presence.json의 문장마다 보임·화면 밖(출처)·언급만을 맞히는지
// 사용: node tools/eval_props.js [--all] [--holdout]  (--holdout: 규칙을 고칠 때 보지 않은 확인용 문장)   (--all: 맞힌 것도 보임) · 정확도가 기준(--min, 기본 0.9) 아래면 종료 코드 1
const path = require('path'), N = require(path.join(__dirname, '..', 'rough', 'nai.js'));
const FILE = process.argv.includes('--holdout') ? 'prop-presence-holdout.json' : 'prop-presence.json';
const F = require(path.join(__dirname, '..', 'tests', 'fixtures', FILE));
const min = +(process.argv[process.argv.indexOf('--min') + 1]) || 0.9, all = process.argv.includes('--all');
const got = c => { const r = N.propPresence(c.t, c.p); return r.on ? 'on' : r.why === 'source' ? 'source' : 'absent'; };
let ok = 0, okE = 0, nE = 0; const conf = {}; const bad = [];
for (const c of F.cases) {
  const r = N.propPresence(c.t, c.p), g = got(c), hit = g === c.want; if (hit) ok++;
  conf[c.want + '→' + g] = (conf[c.want + '→' + g] || 0) + 1;
  if (c.emit) { nE++; if (g === 'source' && (r.emit || [])[0] === c.emit) okE++; }
  if (!hit || all) bad.push(`${hit ? '  ' : '✗ '}${c.want.padEnd(6)} ${g.padEnd(6)} ${c.p}: ${c.t}`);
}
const acc = ok / F.cases.length;
console.log(bad.join('\n'));
console.log(`\n${F.cases.length}문장 · 정확도 ${(acc * 100).toFixed(1)}% · 효과 태그 ${okE}/${nE} · 정답→판단 ${JSON.stringify(conf)}`);
process.exit(acc >= min ? 0 : 1);
