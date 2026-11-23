#!/usr/bin/env node
// 콘티 엔진 평가: 연출 DB의 5컷 묶음 742개를 '컷 글'로 바꿔 엔진에 넣고, 사람이 붙인 값과 비교한다.
//  1) 글 해석: 서사 형태·감정 곡선·연출 목적·템포·거리 흐름·주된 컷 전환·VNG가 사람 판정과 맞는지
//  2) 패턴 검색: 그 묶음을 뺀 나머지 패턴에서 1위(또는 3위 안) 패턴의 연출명이 사람이 붙인 연출명과 같은지
// 사용: node tools/eval_engine.js [--json 출력] [--tune]   (--tune: 홀수 화로 가중치를 고르고 짝수 화로 확인)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'rough');
const R = require(path.join(ROOT, 'engine.js'));
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'db.json'), 'utf8'));
const PATS = JSON.parse(fs.readFileSync(path.join(ROOT, 'patterns.json'), 'utf8')).patterns;
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

const cut = DB['컷표'], cc = cut.columns, CI = k => cc.indexOf(k);
const rh = DB['5컷 리듬'], rc = rh.columns, RI = k => rc.indexOf(k);
const info = DB['작품 정보'], icol = info.columns;
const chars = {}; // 작품명 → 등장인물(이름만)
// 이름만(성 뺀 두 글자)도 같은 사람으로: 이원준 → 원준, '카를로스 아서 잉그램' → 카를로스
for (const r of info.rows) chars[r[0]] = String(r[icol.indexOf('주요 인물')] || '').split(/[,·]/).map(s => s.trim()).filter(Boolean).map(full => {
  const first = full.split(/\s+/)[0], al = [];
  if (/^[가-힣]{3}$/.test(first)) al.push(first.slice(1));
  return { name: first, aliases: al };
});
const byGroup = {};
for (const r of cut.rows) { const g = r[CI('5컷묶음')]; if (g && r[CI('유형')] === '그림') (byGroup[g] ||= []).push(r); }

// DB 내용 → 툴의 컷 글: 묘사 한 줄 + 대사는 줄마다 "…"
function cutText(content) {
  const s = String(content || ''); const quotes = s.match(/["“][^"”]*["”]/g) || [];
  const desc = s.replace(/["“][^"”]*["”]/g, ' ').replace(/[①-⑳]/g, ' ').replace(/\s{2,}/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '').trim();
  return [desc, ...quotes.map(q => '"' + q.slice(1, -1) + '"')].filter(Boolean).join('\n');
}
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }

if (process.env.W_TRY) Object.assign(R.WEIGHTS, JSON.parse(process.env.W_TRY));
// --preds 파일: 컷ID → {emo, i}(한 작품 빼고 학습한 모델 예측). 컷 글로 찾아 엔진 감정·강도를 바꿔 넣고 평가. --preds-only emo|i 로 한쪽만
if (arg('--feel-mode')) R.FEEL_MODE = arg('--feel-mode');
if (arg('--feel-shift')) R.FEEL_SHIFT = +arg('--feel-shift');
if (arg('--preds')) { const P = JSON.parse(fs.readFileSync(arg('--preds'), 'utf8')), only = arg('--preds-only'), byText = {};
  for (const r of cut.rows) { const p = P[r[CI('컷ID')]]; if (p) byText[cutText(r[CI('내용')])] = p; }
  R.FEEL = b => { const p = byText[b.line]; if (!p) return null; return only === 'emo' ? { emo: p.emo } : only === 'i' ? { i: p.i } : { emo: p.emo, i: p.i }; }; }
const cases = [];
for (const r of rh.rows) {
  const g = r[RI('묶음')], rows = byGroup[g]; if (!rows || rows.length < 2) continue;
  const beats = R.parseCuts(rows.map(x => cutText(x[CI('내용')])), chars[r[0]] || []);
  if (beats.length < 2) continue;
  cases.push({ g, work: r[0], ep: +r[1], label: { name: r[RI('연출명')] || '', narr: r[RI('서사 형태')], curve: r[RI('감정 곡선')], goal: r[RI('연출 목적')], tempo: r[RI('템포')], dist: r[RI('거리 흐름')], trans: r[RI('주된 컷 전환')], vng: String(r[RI('서사 구조(VNG)')] || '') }, an: R.analyzeChunk(beats) });
}
const FIELDS = ['narr', 'curve', 'goal', 'tempo', 'dist', 'trans'];
const KO = { narr: '서사 형태', curve: '감정 곡선', goal: '연출 목적', tempo: '템포', dist: '거리 흐름', trans: '주된 컷 전환' };
const pid = p => `${p.src}-${p.id}`;
function evaluate(list, top = 3) {
  const out = { n: list.length, field: {}, vng: 0, hit1: 0, hit3: 0, named: 0, base: {} };
  for (const f of FIELDS) { out.field[f] = list.filter(c => c.an[f] === c.label[f]).length / list.length; const cnt = {}; list.forEach(c => cnt[c.label[f]] = (cnt[c.label[f]] || 0) + 1); out.base[f] = Math.max(...Object.values(cnt)) / list.length; }
  let v = 0;
  for (const c of list) { const a = c.an.vng.split('→'), b = c.label.vng.split('→').filter(Boolean); v += b.length ? 1 - lev(a, b) / Math.max(a.length, b.length) : 0;
    if (!c.label.name) continue; out.named++;
    const ranked = R.rank(c.an, PATS.filter(p => pid(p) !== c.g), top).map(x => x.p.name);
    if (ranked[0] === c.label.name) out.hit1++; if (ranked.includes(c.label.name)) out.hit3++; }
  out.vng = v / list.length; out.hit1 /= out.named; out.hit3 /= out.named;
  const nc = {}; list.forEach(c => c.label.name && (nc[c.label.name] = (nc[c.label.name] || 0) + 1)); out.base.name = Math.max(...Object.values(nc)) / out.named;
  return out;
}
const pct = x => (x * 100).toFixed(1) + '%';
function report(title, e) {
  return `### ${title} (${e.n}묶음)\n\n| 항목 | 엔진 일치 | 가장 흔한 값만 찍었을 때 |\n|---|---|---|\n` +
    FIELDS.map(f => `| ${KO[f]} | ${pct(e.field[f])} | ${pct(e.base[f])} |`).join('\n') +
    `\n| VNG 유사도(편집 거리) | ${pct(e.vng)} | — |\n| 연출명: 1위 패턴 | ${pct(e.hit1)} | ${pct(e.base.name)} |\n| 연출명: 3위 안 | ${pct(e.hit3)} | — |\n`;
}

let md = `# 콘티 엔진 평가 (연출 DB 기준)\n\n생성: \`node tools/eval_engine.js\` · DB 리비전 ${DB.__meta?.revision} · 패턴 ${PATS.length}개\n\n` +
  `DB의 5컷 묶음마다 그림 컷 '내용'을 컷 글로 바꿔 엔진에 넣고 사람이 붙인 값과 비교했어요. 패턴 검색은 그 묶음 자신을 후보에서 빼고 셌어요.\n` +
  `'가장 흔한 값만 찍었을 때'는 아무것도 보지 않고 가장 많은 값을 고르는 기준선이에요. 엔진이 이보다 낮으면 그 항목은 글만으로는 판단이 어렵다는 뜻이에요.\n\n`;
const all = evaluate(cases);
md += report('전체', all);
for (const w of [...new Set(cases.map(c => c.work))]) md += '\n' + report(w, evaluate(cases.filter(c => c.work === w)));

// 가중치 조정: 홀수 화로 고르고 짝수 화로 확인(과적합 방지)
if (process.argv.includes('--tune')) {
  const train = cases.filter(c => c.ep % 2 === 1), test = cases.filter(c => c.ep % 2 === 0);
  const W0 = { ...R.WEIGHTS }, keys = Object.keys(W0);
  const score = () => { const e = evaluate(train, 3); return e.hit1 * 2 + e.hit3; };
  let best = score(), bestW = { ...W0 };
  for (let round = 0; round < 3; round++) for (const k of keys) for (const m of [0, 0.5, 1.5, 2, 3]) {
    Object.assign(R.WEIGHTS, bestW, { [k]: W0[k] * m || (m === 0 ? 0 : 1) }); const s = score(); if (s > best + 1e-9) { best = s; bestW = { ...R.WEIGHTS }; } }
  Object.assign(R.WEIGHTS, W0); const before = evaluate(test);
  Object.assign(R.WEIGHTS, bestW); const after = evaluate(test);
  Object.assign(R.WEIGHTS, W0);
  md += `\n## 가중치 조정 (홀수 화로 고르고 짝수 화로 확인)\n\n| | 짝수 화 연출명 1위 | 3위 안 |\n|---|---|---|\n| 지금 가중치 | ${pct(before.hit1)} | ${pct(before.hit3)} |\n| 고른 가중치 | ${pct(after.hit1)} | ${pct(after.hit3)} |\n\n` +
    `지금: \`${JSON.stringify(W0)}\`\n\n고른 것: \`${JSON.stringify(bestW)}\`\n`;
  if (arg('--weights')) fs.writeFileSync(arg('--weights'), JSON.stringify({ before: W0, after: bestW, test: { before, after } }, null, 1));
}
if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ all, cases: cases.map(c => ({ g: c.g, label: c.label, an: { narr: c.an.narr, curve: c.an.curve, goal: c.an.goal, tempo: c.an.tempo, dist: c.an.dist, trans: c.an.trans, vng: c.an.vng } })) }, null, 0));
const out = arg('--md'); if (out) fs.writeFileSync(out, md); else process.stdout.write(md);
