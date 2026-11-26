#!/usr/bin/env node
// 연출 DB 컷마다 동작·인원·상호작용을 채워 rough/db/actions.json으로(시트 「동작」에도 같은 값)
//   동작: 컷 글(내용)에서 대사·캡션을 뺀 행동 묘사를 rough/nai.js 동작 사전으로 태그화(중복 제거)
//   인원: 컷 그림에서 잡은 인물 수(rough/db/cut-meta.json, 그림 없는 컷은 빈칸)
//   상호작용: 두 명 이상일 때 닿거나 마주하는 동작(hug·holding hands·kiss·face-to-face…)
//   확인: 인물 컷인데 동작 태그가 없고 글이 동작처럼 끝나면 '?' — 사람이 볼 후보
// 사용: node tools/build_actions.js [--sheet out.json]  (--sheet: 시트에 쓸 행 [[컷ID, 동작, 인원, 상호작용, 확인]…])
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
const N = require(path.join(R, 'rough', 'nai.js'));
const d = JSON.parse(fs.readFileSync(path.join(R, 'rough', 'db', 'db.json'), 'utf8')), t = d['컷표'], I = k => t.columns.indexOf(k);
const meta = (() => { try { return JSON.parse(fs.readFileSync(path.join(R, 'rough', 'db', 'cut-meta.json'), 'utf8')).cuts; } catch (_) { return {}; } })();
const SKIP = new Set(['효과 배경', '화면 인서트', '—', '', null, undefined]);
const clean = s => String(s || '').replace(/["“][^"”]*["”]/g, ' ').replace(/(캡션|나레이션|자막|문자)\s.*$/, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
const VERBISH = /(는|은|ㄴ|고|며|다)$|[가-힣](는|던|한|된|진|친|린|인|운|든|낀|선|간|온|본|쥔|민)$/;
const out = {}, rows = []; let person = 0, tagged = 0, ask = 0;
for (const r of t.rows) {
  const id = r[I('컷ID')], shot = r[I('샷')], tx = clean(r[I('내용')]), m = meta[id];
  const acts = [...new Set(N.poseTags(tx))], n = m ? m['인물 수'] ?? null : null;
  const inter = (n == null || n >= 2) ? [...new Set(N.interactTags(tx))] : [];
  const isP = !SKIP.has(shot);
  const q = isP && !acts.length && tx && VERBISH.test(tx.split(' ').slice(-2, -1)[0] || '') ? '?' : '';
  if (isP) { person++; if (acts.length) tagged++; if (q) ask++; }
  out[id] = { a: acts.join(', '), n, i: inter.join(', '), q };
  rows.push([id, acts.join(', '), n ?? '', inter.join(', '), q]);
}
fs.writeFileSync(path.join(R, 'rough', 'db', 'actions.json'), JSON.stringify({ made: new Date().toISOString().slice(0, 10), how: '동작 사전(rough/nai.js POSE·INTERACT) + 컷 메타 인물 수', cuts: out }));
const si = process.argv.indexOf('--sheet'); if (si > 0) fs.writeFileSync(process.argv[si + 1], JSON.stringify(rows));
console.log(`컷 ${t.rows.length} · 인물 컷 ${person} 중 동작 ${tagged} (${(tagged / person * 100).toFixed(1)}%) · 확인 후보 ${ask} · 인원 있는 컷 ${rows.filter(x => x[2] !== '').length} · 상호작용 ${rows.filter(x => x[3]).length}`);
