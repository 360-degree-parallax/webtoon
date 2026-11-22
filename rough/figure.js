/* 러프 인물 엔진: 3D 마네킹(머리·몸·손)을 카메라로 투영해 SVG 선화를 만든다.
   - 각 부위는 3D 점 구름 → 투영 → 볼록 껍질. 같은 묶음의 부위는 "선 먼저, 채움 나중"으로 합쳐 외곽선만 남긴다.
   - 얼굴 이목구비는 얼굴 곡면 위의 3D 곡선이라 고개를 돌리면 함께 눕는다.
   브라우저(window.RoughFigure)와 Node(require) 모두에서 쓴다. */
(function (F) {
  'use strict';

  // ---------- 수학 ----------
  const rad = d => d * Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mX = a => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
  const mY = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
  const mZ = a => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };
  const mm = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const mv = (M, p) => [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2], M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2], M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2]];
  const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  function rng(seed) { let a = 0; for (const c of String(seed)) a = Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const f1 = v => (Math.round(v * 10) / 10).toString();

  // ---------- 2D 도형 ----------
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  // 꼭짓점 사이 중점을 지나는 2차 곡선으로 부드럽게 닫는다
  function smooth(poly, minD = 0.8) {
    const p = []; for (const q of poly) { const l = p[p.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > minD) p.push(q); }
    if (p.length > 2 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) <= minD) p.pop();
    const n = p.length; if (n < 3) return '';
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let s = m(p[n - 1], p[0]), d = `M${f1(s[0])} ${f1(s[1])}`;
    for (let i = 0; i < n; i++) { const e = m(p[i], p[(i + 1) % n]); d += `Q${f1(p[i][0])} ${f1(p[i][1])} ${f1(e[0])} ${f1(e[1])}`; }
    return d + 'Z';
  }
  // 열린 곡선(점들을 지나는 부드러운 선)
  function curve(p) {
    if (p.length < 2) return '';
    let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
    if (p.length === 2) return d + `L${f1(p[1][0])} ${f1(p[1][1])}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d;
  }
  const circle2 = (c, r, n = 16) => Array.from({ length: n }, (_, i) => [c[0] + Math.cos(i / n * 6.2832) * r, c[1] + Math.sin(i / n * 6.2832) * r]);
  function ellipsoid(c, s, n = 160) {
    const out = [];
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), t = i * 2.399963; out.push([c[0] + s[0] * Math.cos(t) * r, c[1] + s[1] * y, c[2] + s[2] * Math.sin(t) * r]); }
    return out;
  }

  // ---------- 머리 모델 (단위: 두개골 반지름 = 1, 원점 = 두개골 중심, +z = 얼굴 앞) ----------
  const FACE_TAB = [[0.55, 0.64, 0.76], [0.30, 0.76, 0.86], [0.00, 0.82, 0.93], [-0.20, 0.81, 0.89], [-0.45, 0.76, 0.93], [-0.70, 0.68, 0.93], [-0.98, 0.53, 0.92], [-1.25, 0.31, 0.86], [-1.42, 0.13, 0.76]];
  function faceProf(y) {
    const T = FACE_TAB; if (y >= T[0][0]) return [T[0][1], T[0][2]];
    for (let i = 1; i < T.length; i++) if (y >= T[i][0]) { const t = (y - T[i][0]) / (T[i - 1][0] - T[i][0]); return [T[i][1] + (T[i - 1][1] - T[i][1]) * t, T[i][2] + (T[i - 1][2] - T[i][2]) * t]; }
    const L = T[T.length - 1]; return [L[1], L[2]];
  }
  // 얼굴 곡면 위의 점
  const S = (x, y, lift = 0) => { const [wx, zc] = faceProf(y); const t = Math.min(0.995, Math.abs(x) / wx); return [x, y, zc * Math.sqrt(1 - t * t) + lift]; };
  const HEAD = (() => {
    const cran = ellipsoid([0, 0.05, -0.08], [0.80, 0.98, 0.98], 220);
    const face = [];
    for (let y = 0.55; y >= -1.43; y -= 0.09) { const [wx] = faceProf(y); for (const t of [-0.985, -0.93, -0.8, -0.6, -0.35, 0, 0.35, 0.6, 0.8, 0.93, 0.985]) face.push(S(t * wx, y)); }
    for (const s of [-1, 1]) face.push([s * 0.6, -0.86, -0.06], [s * 0.72, -0.4, -0.16], [s * 0.4, -1.12, 0.14], [s * 0.2, -1.3, 0.3]);
    face.push([0, -1.36, 0.36], [0, -1.44, 0.62]);
    const nose = [[0, -0.1, 0.92], [0.07, -0.18, 0.9], [-0.07, -0.18, 0.9], [0, -0.63, 1.16], [0.035, -0.6, 1.13], [-0.035, -0.6, 1.13], [0.13, -0.68, 0.94], [-0.13, -0.68, 0.94], [0, -0.73, 0.92], [0.09, -0.42, 0.93], [-0.09, -0.42, 0.93]];
    const ear = [[0.02, -0.16, 0.5], [-0.04, -0.34, 0.95], [-0.26, -0.43, 1], [-0.48, -0.36, 0.8], [-0.63, -0.2, 0.4], [-0.57, -0.1, 0.15], [-0.3, -0.03, 0.02], [-0.06, -0.05, 0.1]];
    const earIn = [[-0.08, -0.2, 0.55], [-0.14, -0.3, 0.8], [-0.34, -0.33, 0.8], [-0.46, -0.24, 0.55]];
    return { cran, face, nose, ear, earIn };
  })();

  // ---------- 표정 ----------
  // brow: [안쪽, 가운데, 바깥] 높이 보정. top/bot: 눈 뜬 정도. tiltIn/Out: 눈꼬리 처짐·올라감
  function expression(emo, i) {
    const e = { brow: [0, 0.02, 0], browY: 0.26, top: 0.085, bot: 0.035, tiltIn: 0, tiltOut: 0, iris: 0.078, pupil: 0.032, gaze: [0, 0], closed: null, mouth: 'line', mw: 0.15, open: 0, fx: [] };
    const hi = i >= 3, lo = i <= 1;
    switch (emo) {
      case '놀람': Object.assign(e, { brow: [0.08, 0.12, 0.06], top: hi ? 0.135 : 0.115, bot: 0.05, iris: 0.06, pupil: 0.022, mouth: hi ? 'open' : 'o', open: hi ? 1 : 0.5, fx: hi ? ['shock', 'sweat'] : ['shock'] }); break;
      case '분노': Object.assign(e, { brow: [-0.1, -0.01, 0.07], browY: 0.2, top: 0.075, bot: 0.03, tiltIn: -0.035, tiltOut: 0.025, iris: 0.07, mouth: hi ? 'shout' : 'grit', open: 1, fx: hi ? ['vein', 'dark'] : ['vein'] }); break;
      case '긴장': Object.assign(e, { brow: [-0.03, 0.0, 0.02], browY: 0.23, top: 0.07, bot: 0.03, iris: 0.066, pupil: 0.026, mouth: 'tight', fx: hi ? ['sweat', 'gloom'] : ['sweat'] }); break;
      case '설렘': Object.assign(e, { brow: [0.05, 0.05, 0.0], top: 0.1, bot: 0.04, iris: 0.085, gaze: [0, -0.01], mouth: 'wavy', mw: 0.1, fx: hi ? ['blush', 'blush2', 'sweat'] : ['blush'] }); break;
      case '당황': Object.assign(e, { brow: [0.09, 0.07, -0.02], top: 0.11, bot: 0.045, iris: 0.058, pupil: 0.02, mouth: 'wavy', mw: 0.14, fx: ['sweat', 'blush'] }); break;
      case '쓸쓸': Object.assign(e, { brow: [0.09, 0.03, -0.05], top: 0.055, bot: 0.03, tiltOut: -0.03, gaze: [0, -0.03], mouth: 'frown', mw: 0.12, fx: hi ? ['tear'] : [] }); break;
      case '결의': Object.assign(e, { brow: [-0.07, 0.0, 0.05], browY: 0.21, top: 0.085, bot: 0.03, tiltIn: -0.02, tiltOut: 0.02, mouth: 'tight', mw: 0.16 }); break;
      case '다정': Object.assign(e, { brow: [0.03, 0.04, 0.0], top: 0.06, bot: 0.028, tiltOut: -0.012, mouth: 'smile', mw: 0.15 }); break;
      case '기쁨': Object.assign(e, { brow: [0.04, 0.07, 0.02], closed: 'happy', mouth: hi ? 'grin' : 'smile', mw: 0.18, open: 1, fx: lo ? [] : ['blush'] }); break;
      case '의아': Object.assign(e, { brow: [0.02, 0.1, 0.04], browAsym: 0.08, top: 0.09, mouth: 'o', open: 0.25, mw: 0.08, fx: ['question'] }); break;
      case '냉담': Object.assign(e, { brow: [-0.01, 0.0, 0.0], browY: 0.24, top: 0.048, bot: 0.03, iris: 0.075, mouth: 'flat', mw: 0.13 }); break;
      case '회상': Object.assign(e, { brow: [0.03, 0.03, -0.01], top: 0.05, bot: 0.028, gaze: [0.02, -0.03], mouth: 'line', mw: 0.12 }); break;
      case '개그': Object.assign(e, { brow: [0.06, 0.06, 0.0], closed: 'gag', mouth: 'wavy', mw: 0.2, fx: ['sweat'] }); break;
      default: break; // 평온
    }
    return e;
  }

  // ---------- 그리기 문맥 ----------
  // P: world → [sx, sy, depth]. id(): 문서 안에서 겹치지 않는 번호
  function mkCtx(P, style, ids) {
    return { P, st: style, id: () => 'f' + (ids.n++) };
  }
  // 묶음(부위들의 합집합)을 외곽선 + 채움 + 셀 음영으로
  function group(cx, polys, fill, o = {}) {
    const d = polys.map(p => smooth(p)).join('');
    if (!d) return '';
    const st = cx.st, id = cx.id(), lw = o.lw || st.lw, line = o.line || st.line;
    let s = `<defs><path id="${id}" d="${d}"/></defs>`;
    const use = a => `<use href="#${id}" ${a}/>`;
    if (o.shade && st.shadeOn) {
      const dx = st.light[0] * lw * 2.6, dy = st.light[1] * lw * 2.6;
      s += use(`fill="${o.shade}" stroke="${line}" stroke-width="${f1(lw * 2)}" stroke-linejoin="round"`) + use(`fill="${o.shade}"`) +
        `<clipPath id="${id}c"><use href="#${id}"/></clipPath><g clip-path="url(#${id}c)">` + use(`fill="${fill}" transform="translate(${f1(dx)} ${f1(dy)})"`) + '</g>';
    } else {
      s += use(`fill="${fill}" stroke="${line}" stroke-width="${f1(lw * 2)}" stroke-linejoin="round"`) + use(`fill="${fill}"`);
    }
    return { svg: s, id };
  }
  const stroke = (d, w, c, extra = '') => d ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>` : '';

  // ---------- 머리 그리기 ----------
  // H: {c: 머리 중심(world), r: 반지름, M: 머리 회전(world), CM: 카메라 회전}  → {back, front, anchors}
  function drawHead(cx, H, col, ex, opt = {}) {
    const { P, st } = cx, lw = st.lw;
    const T = p => add(H.c, mv(H.M, mul(p, H.r)));           // 머리 좌표 → world
    const NM = mm(H.CM, H.M);                                   // 법선용: 머리 → 카메라
    const nz = n => mv(NM, norm(n))[2];
    const pj = p => P(T(p)), pj2 = p => { const q = P(T(p)); return [q[0], q[1]]; };
    const c0 = P(H.c), top = P(T([0, 1.03, 0])), R = Math.hypot(top[0] - c0[0], top[1] - c0[1]) || 1; // 화면상 머리 반지름(대략)
    const rpx = P(add(H.c, [0, 0, 0]))[3] * H.r;               // 원근 반영 픽셀 반지름
    const parts = [hull(HEAD.cran.map(pj2)), hull(HEAD.face.map(pj2)), hull(HEAD.nose.map(pj2))];
    const g = group(cx, parts, col.skin, { shade: col.skinShade });
    let back = '', front = g.svg, feat = '';
    const faceZ = nz([0, 0, 1]);                                // 얼굴이 카메라를 향한 정도

    // 귀: 바깥면이 보이면 머리 위에, 아니면 머리 뒤에
    for (const s of [-1, 1]) {
      const pts = HEAD.ear.map(([y, z, k]) => pj2([s * (0.77 + 0.15 * k), y * 0.92 - 0.02, z * 0.92]));
      const eg = group(cx, [pts], col.skin, { shade: col.skinShade, lw: lw * 0.9 });
      const facing = nz([s, 0, -0.35]);
      let inner = '';
      if (facing > 0.3 && rpx > 26) inner = stroke(curve(HEAD.earIn.map(([y, z, k]) => pj2([s * (0.78 + 0.15 * k), y * 0.92 - 0.02, z * 0.92]))), lw * 0.7, st.line);
      if (facing > 0.22) front += eg.svg + inner; else back += eg.svg;
    }

    // ---- 이목구비 (얼굴이 조금이라도 보일 때) ----
    const small = rpx < 13, tiny = rpx < 7;
    if (faceZ > -0.25 && !tiny && !opt.faceless) {
      const sideVis = s => nz([s * 0.55, 0, 0.85]);              // 그쪽 얼굴 반쪽이 보이는 정도
      const lk = st.line;
      // 눈·눈썹
      for (const s of [-1, 1]) {
        const v = sideVis(s); if (v < 0.12) continue;
        const ecx = s * 0.34, ecy = -0.2;
        const asym = ex.browAsym && s > 0 ? ex.browAsym : 0;
        const by = ecy + ex.browY + asym;
        const brow = [[ecx - s * 0.19, by + ex.brow[0]], [ecx - s * 0.02, by + ex.brow[1] + 0.02], [ecx + s * 0.23, by + ex.brow[2] - 0.01]].map(([x, y]) => pj2(S(x, y, 0.02)));
        if (!small) feat += stroke(curve(brow), lw * 0.95, lk);
        const inn = [ecx - s * 0.16, ecy - 0.012 + ex.tiltIn], out = [ecx + s * 0.175, ecy + 0.012 + ex.tiltOut];
        const q = (a, b, c, n = 7) => Array.from({ length: n }, (_, k) => { const t = k / (n - 1), u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]; });
        if (ex.closed === 'happy' || ex.closed === 'gag') {
          const arc = ex.closed === 'happy' ? q(inn, [ecx, ecy + 0.16], out) : q([inn[0], ecy + 0.06], [ecx + s * 0.1, ecy], [inn[0], ecy - 0.06], 5).concat();
          if (ex.closed === 'gag') { // > < 모양
            const a = [[ecx - s * 0.13, ecy + 0.07], [ecx + s * 0.1, ecy], [ecx - s * 0.13, ecy - 0.07]].map(([x, y]) => pj2(S(x, y, 0.01)));
            feat += stroke(`M${f1(a[0][0])} ${f1(a[0][1])}L${f1(a[1][0])} ${f1(a[1][1])}L${f1(a[2][0])} ${f1(a[2][1])}`, lw * 1.3, lk);
          } else feat += stroke(curve(arc.map(([x, y]) => pj2(S(x, y, 0.01)))), lw * 1.5, lk);
          continue;
        }
        if (small) { // 작은 얼굴: 눈꺼풀 선 + 점
          const a = pj2(S(inn[0], ecy + ex.top * 0.6, 0.01)), b = pj2(S(out[0], ecy + ex.top * 0.6, 0.01)), c = pj2(S(ecx + ex.gaze[0], ecy, 0.01));
          feat += stroke(`M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`, lw * 1.1, lk) + `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(Math.max(0.9, rpx * 0.05))}" fill="${lk}"/>`;
          continue;
        }
        const upper = q(inn, [ecx - s * 0.02, ecy + ex.top * 2 - 0.0], out), lower = q(out, [ecx + s * 0.03, ecy - ex.bot * 2], inn);
        const up2 = upper.map(([x, y]) => pj2(S(x, y, 0.012))), lo2 = lower.map(([x, y]) => pj2(S(x, y, 0.012)));
        const cid = cx.id();
        const ic = [ecx + s * 0.0 + ex.gaze[0], ecy + ex.gaze[1] + (ex.top - 0.085) * 0.25];
        const ring = (r, n = 18) => Array.from({ length: n }, (_, k) => pj2(S(ic[0] + Math.cos(k / n * 6.2832) * r, ic[1] + Math.sin(k / n * 6.2832) * r * 1.08, 0.012)));
        const poly = a => 'M' + a.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
        feat += `<clipPath id="${cid}"><path d="${poly(up2.concat(lo2))}"/></clipPath>` +
          `<path d="${poly(up2.concat(lo2))}" fill="${st.eyeWhite}"/>` +
          `<g clip-path="url(#${cid})"><path d="${poly(ring(ex.iris))}" fill="${col.iris || st.iris}" stroke="${lk}" stroke-width="${f1(lw * 0.7)}"/><path d="${poly(ring(ex.pupil, 10))}" fill="${lk}"/>` +
          (rpx > 60 ? `<path d="${poly(Array.from({ length: 8 }, (_, k) => pj2(S(ic[0] - s * 0.0 - 0.028 + Math.cos(k / 8 * 6.2832) * 0.018, ic[1] + 0.03 + Math.sin(k / 8 * 6.2832) * 0.018, 0.014))))}" fill="#fff"/>` : '') + '</g>';
        feat += stroke(curve(up2), lw * 1.5, lk);
        feat += stroke(curve(lo2.slice(0, 4)), lw * 0.6, lk);
        if (rpx > 45 && ex.top < 0.11) { // 쌍꺼풀 선
          const cr = q([inn[0] + s * 0.03, inn[1] + 0.04], [ecx, ecy + ex.top * 2 + 0.05], [out[0] - s * 0.02, out[1] + 0.035], 6).map(([x, y]) => pj2(S(x, y, 0.012)));
          feat += stroke(curve(cr), lw * 0.5, lk);
        }
      }
      // 코
      if (!small) {
        const yawSide = mv(NM, [0, 0, 1])[0];                    // 얼굴이 향한 좌우(+면 화면 오른쪽)
        const ridgeTop = clamp(-0.5 + Math.abs(yawSide) * 0.22, -0.5, -0.34);
        const ridge = [[0, ridgeTop, 0.95 + (-0.1 - ridgeTop) * -0.0 + (ridgeTop + 0.61) * -0.42 + 0.21], [0, -0.61, 1.16], [0, -0.675, 1.02]].map(p => pj2(p));
        feat += stroke(`M${f1(ridge[0][0])} ${f1(ridge[0][1])}L${f1(ridge[1][0])} ${f1(ridge[1][1])}L${f1(ridge[2][0])} ${f1(ridge[2][1])}`, lw * 0.85, lk);
      }
      // 입
      const my = -0.99, mw = ex.mw;
      const mp = (x, y) => pj2(S(x, my + y, 0.012));
      const line = pts => stroke(curve(pts.map(([x, y]) => mp(x, y))), lw * (small ? 0.8 : 1), lk);
      const shape = (pts, fill) => `<path d="${smooth(pts.map(([x, y]) => mp(x, y)), 0.3)}" fill="${fill}" stroke="${lk}" stroke-width="${f1(lw * 0.9)}" stroke-linejoin="round"/>`;
      const tick = small ? '' : line([[-0.04, -0.085], [0.04, -0.085]]);
      const ell = (rx, ry, oy = 0) => Array.from({ length: 12 }, (_, k) => [Math.cos(k / 12 * 6.2832) * rx, oy + Math.sin(k / 12 * 6.2832) * ry]);
      switch (ex.mouth) {
        case 'smile': feat += line([[-mw, 0.03], [-mw * 0.5, -0.015], [0, -0.03], [mw * 0.5, -0.015], [mw, 0.03]]) + tick; break;
        case 'grin': feat += shape([[-mw, 0.03], [-mw * 0.5, 0.01], [0, 0.0], [mw * 0.5, 0.01], [mw, 0.03], [mw * 0.6, -0.1], [0, -0.14], [-mw * 0.6, -0.1]], st.mouthIn); break;
        case 'frown': feat += line([[-mw, -0.03], [-mw * 0.4, 0.008], [0, 0.015], [mw * 0.4, 0.008], [mw, -0.03]]); break;
        case 'flat': feat += line([[-mw, 0], [mw, -0.004]]) + tick; break;
        case 'tight': feat += line([[-mw, 0.004], [0, -0.008], [mw, 0.004]]) + (small ? '' : line([[-0.05, -0.07], [0.05, -0.07]])); break;
        case 'wavy': feat += line([[-mw, 0], [-mw * 0.5, 0.025], [0, -0.012], [mw * 0.5, 0.025], [mw, 0]]); break;
        case 'o': feat += shape(ell(0.045 + 0.03 * ex.open, 0.05 + 0.05 * ex.open, -0.02), st.mouthIn); break;
        case 'open': feat += shape(ell(0.1, 0.13, -0.05), st.mouthIn); break;
        case 'grit': feat += shape([[-mw, 0.02], [mw, 0.02], [mw * 0.95, -0.07], [-mw * 0.95, -0.07]], '#fff') + line([[-mw * 0.9, -0.025], [mw * 0.9, -0.025]]); break;
        case 'shout': feat += shape([[-mw * 0.9, 0.04], [0, 0.06], [mw * 0.9, 0.04], [mw * 0.75, -0.16], [0, -0.22], [-mw * 0.75, -0.16]], st.mouthIn) + (small ? '' : line([[-mw * 0.55, 0.005], [mw * 0.55, 0.005]])); break;
        default: feat += line([[-mw, 0.004], [-mw * 0.3, -0.006], [mw * 0.3, -0.006], [mw, 0.004]]) + tick;
      }
      // 볼 빗금·눈물·힘줄 (얼굴 위)
      const fxc = st.fx;
      if (!small) for (const s of [-1, 1]) {
        if (sideVis(s) < 0.2) continue;
        if (ex.fx.includes('blush')) { const n = ex.fx.includes('blush2') ? 5 : 3; for (let k = 0; k < n; k++) { const x = s * (0.3 + k * 0.065), a = pj2(S(x, -0.5, 0.012)), b = pj2(S(x - 0.045, -0.62, 0.012)); feat += stroke(`M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`, lw * 0.8, fxc.blush); } }
        if (ex.fx.includes('tear')) { const a = pj2(S(s * 0.4, -0.3, 0.012)), b = pj2(S(s * 0.43, -0.75, 0.012)), c = pj2(S(s * 0.4, -0.95, 0.012)); feat += stroke(curve([a, b, c]), lw * 0.8, lk) + `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(rpx * 0.045)}" fill="#fff" stroke="${lk}" stroke-width="${f1(lw * 0.7)}"/>`; }
      }
      if (ex.fx.includes('gloom') && !small) { const cid = cx.id(); let ln = ''; for (let k = -4; k <= 4; k++) { const a = pj2(S(k * 0.13, 0.62, 0.012)), b = pj2(S(k * 0.13, 0.12 + (k % 2 ? 0.08 : 0), 0.012)); ln += stroke(`M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`, lw * 0.6, lk); } feat += ln; }
    }
    if (feat) { const fc = cx.id(); front += `<clipPath id="${fc}"><use href="#${g.id}"/></clipPath><g clip-path="url(#${fc})">${feat}</g>`; }
    // 얼굴 반쪽 그림자(어두운 연출): 머리 실루엣 안에서만
    if (opt.halfShadow && st.shadeOn !== undefined) {
      const side = opt.halfShadow, cid = cx.id();
      const e = circle2([c0[0] + side * rpx * 1.05, c0[1] + rpx * 0.25], rpx * 1.25, 20);
      front += `<clipPath id="${cid}"><use href="#${g.id}"/></clipPath><path d="${smooth(e)}" fill="${st.shadowTone}" opacity="${st.shadowOp}" clip-path="url(#${cid})"/>`;
    }
    return { back, front, id: g.id, rpx, c0, faceZ, anchors: { top: pj([0, 1.03, 0]), chin: pj([0, -1.42, 0.62]), mouth: pj(S(0, -0.99)), brow: pj(S(0, 0.1)), sideL: pj([-0.85, 0.2, 0]), sideR: pj([0.85, 0.2, 0]), crown: pj([0, 1.03, -0.1]) }, T, NM };
  }

  Object.assign(F, { rad, add, sub, mul, dot, cross, norm, len, mix, clamp, mX, mY, mZ, mm, mv, I3, rng, f1, hull, smooth, curve, circle2, ellipsoid, HEAD, S, faceProf, expression, mkCtx, group, stroke, drawHead });
})(typeof module !== 'undefined' ? module.exports : (window.RoughFigure = {}));
