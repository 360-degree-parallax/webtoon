#!/usr/bin/env node
// 연출 DB 5컷 묶음 → 엔진 해석 특징 + 사람 라벨(연출명·칸 높이·간격)을 JSON으로.
// 패턴 랭킹(①)·칸 길이/간격(②) 학습용. eval_engine.js와 같은 방식으로 컷 글을 만들고,
// 감정·강도는 한 작품 빼고 학습한 예측(tools/ml/cache/preds-ngram.json)을 써서 평가 누수를 막음.
// 사용: node tools/ml/dump_bundles.js [out.json]
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..', 'rough');
const R = require(path.join(ROOT, 'engine.js'));
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'db', 'db.json'), 'utf8'));
const PATS = JSON.parse(fs.readFileSync(path.join(ROOT, 'patterns.json'), 'utf8')).patterns;
const cut = DB['컷표'], cc = cut.columns, CI = k => cc.indexOf(k);
const rh = DB['5컷 리듬'], rc = rh.columns, RI = k => rc.indexOf(k);
const info = DB['작품 정보'], icol = info.columns;
const chars = {};
for (const r of info.rows) chars[r[0]] = String(r[icol.indexOf('주요 인물')] || '').split(/[,·]/).map(s => s.trim()).filter(Boolean).map(full => {
  const first = full.split(/\s+/)[0], al = []; if (/^[가-힣]{3}$/.test(first)) al.push(first.slice(1)); return { name: first, aliases: al }; });
const byGroup = {};
for (const r of cut.rows) { const g = r[CI('5컷묶음')]; if (g && r[CI('유형')] === '그림') (byGroup[g] ||= []).push(r); }
function cutText(content) {
  const s = String(content || ''); const quotes = s.match(/["“][^"”]*["”]/g) || [];
  const desc = s.replace(/["“][^"”]*["”]/g, ' ').replace(/[①-⑳]/g, ' ').replace(/\s{2,}/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '').trim();
  return [desc, ...quotes.map(q => '"' + q.slice(1, -1) + '"')].filter(Boolean).join('\n');
}
const predsFile = path.join(__dirname, 'cache', 'preds-ngram.json');
if (fs.existsSync(predsFile)) { const P = JSON.parse(fs.readFileSync(predsFile, 'utf8')), byText = {};
  for (const r of cut.rows) { const p = P[r[CI('컷ID')]]; if (p) byText[cutText(r[CI('내용')])] = p; }
  R.FEEL = b => { const p = byText[b.line]; return p ? { emo: p.emo, i: p.i } : null; }; }
const pid = p => `${p.src}-${p.id}`;
// 패턴 컷(그림)마다 칸 높이·간격 정답: patterns.json의 cuts(h,gap)는 DB에서 만든 값
const patById = Object.fromEntries(PATS.map(p => [pid(p), p]));
const out = [];
for (const r of rh.rows) {
  const g = r[RI('묶음')], rows = byGroup[g]; if (!rows || rows.length < 2) continue;
  const texts = rows.map(x => cutText(x[CI('내용')]));
  const beats = R.parseCuts(texts, chars[r[0]] || []); if (beats.length < 2) continue;
  const an = R.analyzeCuts(texts, chars[r[0]] || [])[0]; if (!an) continue;
  const others = PATS.filter(p => pid(p) !== g);
  const ranked = R.rank(an, others, 40).map(x => ({ id: pid(x.p), name: x.p.name, s: +x.s.toFixed(4), parts: x.parts }));
  const top = R.rank(an, others, 1)[0], lay = top ? R.layout(an, top.p) : [];
  const pat = patById[g], pics = pat ? pat.cuts.filter(c => c.t === '그림') : [];
  out.push({ g, work: r[0], ep: +r[1], name: r[RI('연출명')] || '',
    an: { narr: an.narr, curve: an.curve, goal: an.goal, tempo: an.tempo, dist: an.dist, trans: an.trans, vng: an.vng, peaks: an.peaks },
    beats: an.beats.map(b => ({ emo: b.emo, i: b.i, role: b.role, vng: b.vng, trans: b.trans || '', who: b.who || '', said: !!b.said, nd: (b.dialogs || []).length, cap: (b.captions || []).length, sfx: (b.sfx || []).length, len: (b.act || '').length, text: b.line })),
    truth: pics.map(c => ({ h: c.h, gap: c.gap, shot: c.shot, id: c.id })),
    eng: lay.map(c => ({ h: c.h, gap: c.gap, shot: c.shot })),
    ranked });
}
const file = process.argv[2] || path.join(__dirname, 'cache', 'bundles.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log('bundles', out.length, 'named', out.filter(o => o.name).length, '→', file);
