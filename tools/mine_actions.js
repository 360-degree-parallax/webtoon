#!/usr/bin/env node
// 동작 사전(rough/nai.js POSE) 적중률 재기 + 못 잡은 동작 낱말 순위
// 연출 DB 컷 글(내용)에서 따옴표 대사·캡션을 빼고, 인물이 나오는 컷(샷이 효과 배경·화면 인서트·— 아닌 것)만 봄
// 사용: node tools/mine_actions.js [--top 60]
const fs = require('fs'), path = require('path');
const N = require(path.join(__dirname, '..', 'rough', 'nai.js'));
const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'rough', 'db', 'db.json'), 'utf8'));
const t = d['컷표'], I = k => t.columns.indexOf(k), top = +(process.argv[process.argv.indexOf('--top') + 1]) || 60;
const SKIP = new Set(['효과 배경', '화면 인서트', '—', '', null, undefined]);
const bat = ch => { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? c % 28 : -1; };
const dropN = ch => String.fromCharCode(ch.charCodeAt(0) - 4);  // ㄴ 받침(4) 떼기
let n = 0, hit = 0; const miss = new Map();
for (const r of t.rows) {
  if (SKIP.has(r[I('샷')])) continue;
  const txt = String(r[I('내용')] || '').replace(/["“][^"”]*["”]/g, ' ').replace(/캡션.*$/, ' ').replace(/\([^)]*\)/g, ' ').trim();
  if (!txt) continue; n++;
  if (N.poseTags(txt).length) { hit++; continue; }
  // 꾸미는 말(…는 / …ㄴ·은)로 끝나는 낱말 = 동작 후보 → 어간
  for (const w of txt.split(/[\s,.·…!?]+/)) {
    if (w.length < 2) continue; let stem = null;
    if (w.endsWith('는')) stem = w.slice(0, -1);
    else if (w.endsWith('은') && w.length > 2) stem = w.slice(0, -1);
    else if (bat(w.slice(-1)) === 4) stem = w.slice(0, -1) + dropN(w.slice(-1));
    if (stem && stem.length >= 1 && !/^(있|없|같|많|작|큰|어떤|모든|다른|이런|그런|저런)/.test(stem)) miss.set(stem, (miss.get(stem) || 0) + 1);
  }
}
console.log(`인물 컷 ${n}개 중 동작 태그를 찾은 컷 ${hit}개 (${(hit / n * 100).toFixed(1)}%)`);
console.log('못 잡은 동작 후보(어간 · 컷 수):');
console.log([...miss].sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => `${k} ${v}`).join(' · '));
