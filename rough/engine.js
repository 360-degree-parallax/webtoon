/* 러프 엔진: 장면 글 → 코드표 값 → 패턴 검색 → 컷 배치.
   브라우저(window.RoughEngine)와 Node(require) 모두에서 쓴다. 기준은 docs/codebook.md, 설계는 docs/rough-plan.md. */
(function (E) {
  const SHOTS = ['설정', '전경', '전신', '중경', '클로즈업', '디테일', '효과 배경'];
  const ANGLES = ['아이레벨', '하이앵글', '로우앵글', '탑뷰'];
  const RANK = { 설정: 0, 전경: 1, 전신: 2, 중경: 3, 클로즈업: 4, 디테일: 5, '효과 배경': 4 };
  const SHOT_FIX = { '화면 인서트': '디테일', SD: '중경' };

  // 감정 사전: [감정, 기본 강도, 낱말들]. 여러 개가 맞으면 강도가 높은 쪽.
  const LEX = [
    ['놀람', 2, ['놀라', '놀란', '깜짝', '헉', '경악', '충격', '눈이 커', '눈을 크게', '얼어붙']],
    ['분노', 2, ['화를', '화가', '화내', '소리치', '소리 지', '노려', '분노', '주먹으로', '때리', '멱살', '이를 악']],
    ['긴장', 2, ['긴장', '숨죽', '숨을 죽', '멈칫', '다가온', '다가오', '칼을', '위협', '식은땀', '정적', '침묵', '조여', '노크', '발소리']],
    ['설렘', 2, ['붉어', '빨개', '두근', '설레', '심장이', '손을 잡', '손목을 잡', '눈이 마주', '입맞', '키스', '안기']],
    ['당황', 2, ['당황', '허둥', '어버버', '얼버무', '진땀', '말을 더듬', '어쩔 줄']],
    ['쓸쓸', 2, ['눈물', '울음', '흐느', '쓸쓸', '외로', '혼자 남', '뒷모습', '떠나간', '떠난다', '떠남', '이별']],
    ['결의', 2, ['결심', '다짐', '각오', '주먹을 쥐', '일어선', '일어섬', '맹세', '반드시']],
    ['다정', 1, ['미소', '쓰다듬', '안아', '다정', '토닥', '웃어 주', '웃어주']],
    ['기쁨', 1, ['웃음', '웃는', '웃었', '웃는다', '기뻐', '환호', '신나']],
    ['의아', 1, ['갸웃', '의아', '이상하', '고개를 기울']],
    ['냉담', 1, ['차갑', '무시', '외면', '냉정', '돌아선', '돌아섬', '무표정', '시큰둥']],
    ['회상', 1, ['예전', '그때', '기억', '회상', '어린 시절', '옛날']],
    ['개그', 1, ['ㅋ', '엉뚱', '꽈당', '황당', '넘어진', '넘어짐', '삐짐', '투덜']],
  ];
  const BOOST = ['갑자기', '확 ', '순간', '번쩍', '쾅', '와락', '벌떡'];
  const PLACE = ['복도', '방 ', '방에', '거리', '교실', '저택', '정원', '하늘', '성 ', '성의', '집', '카페', '학교', '숲', '바다', '도시', '길', '문 앞', '창밖', '연회장', '침실', '마당', '골목', '광장', '역', '사무실', '궁'];
  const SETV = ['서 있', '걸어', '도착', '들어선', '들어옴', '들어온', '풍경', '전경', '펼쳐', '앉아 있', '등장'];
  const TRANS = ['다음 날', '다음날', '한편', '그 시각', '같은 시각', '그날 밤', '며칠 후', '몇 시간 후', '시간이 흘러', '장면 전환', '아침이', '밤이 되'];
  const REACT = ['놀라', '돌아보', '돌아봄', '돌아본', '붉어', '빨개', '굳어', '굳는', '멈칫', '바라보', '바라봄', '표정', '눈이 커', '당황', '얼어', '숨을 삼', '움찔', '갸웃', '쳐다'];
  const REVEAL = ['드러', '나타나', '나타남', '정체', '사실은', '꺼내', '꺼낸', '꺼냄', '보여주', '고백', '들켜', '발견', '내민', '내밀'];
  const OBJ = ['반지', '편지', '사진', '칼', '열쇠', '휴대폰', '핸드폰', '목걸이', '검을', '책을', '꽃', '쪽지', '문서', '약병', '총', '선물', '상자'];
  const HAND = ['손목을', '손을 잡', '손을 뻗', '손끝', '손가락', '손을 내', '발끝', '옷자락을'];
  const has = (s, ws) => ws.find(w => s.includes(w)) || null;

  // ---------- 1. 파싱 ----------
  function parse(text) {
    return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split('|');
      const who = parts.length > 1 ? parts[0].trim() : '';
      const act = (parts.length > 1 ? parts.slice(1).join('|') : parts[0]).trim();
      const said = (act.match(/["“]([^"”]+)["”]/) || [])[1] || '';
      return { line, who, act, said, key: line };
    });
  }

  // ---------- 2. 감정·강도 ----------
  function feel(b) {
    const s = ' ' + b.act + ' ';
    let emo = '평온', i = b.said ? 1 : 0, why = b.said ? '대사' : '특별한 감정 낱말 없음', hit = null;
    for (const [e, base, ws] of LEX) {
      const w = has(s, ws);
      if (w && (!hit || base > hit.base)) hit = { e, base, w };
    }
    if (hit) { emo = hit.e; i = hit.base; why = `'${hit.w}'`; }
    const ex = (s.match(/!/g) || []).length;
    if (ex) { i += 1; why += ' · 느낌표'; }
    const bw = has(s, BOOST);
    if (bw) { i += 1; why += ` · '${bw.trim()}'`; }
    if (!hit && /\?/.test(s)) { emo = '의아'; i = Math.max(i, 1); why = '물음표'; }
    if (!hit && ex && emo === '평온') emo = '놀람';
    return { emo, i: Math.max(0, Math.min(3, i)), emoWhy: why };
  }

  // ---------- 3. 역할 ----------
  function roleOf(b, idx, prev) {
    const s = ' ' + b.act + ' ';
    let w;
    if ((w = has(s, TRANS))) return ['전환', `전환어 '${w}'`];
    if (idx === 0 && !b.said && ((w = has(s, PLACE)) || (w = has(s, SETV)))) return ['설정', `첫 컷 · 장소/등장 '${w.trim()}'`];
    if ((w = has(s, REACT))) return ['반응', `반응 동사 '${w}'`];
    if ((w = has(s, REVEAL))) return ['공개', `드러남 '${w}'`];
    if (b.i >= 3 || (b.said && b.i >= 2)) return ['공개', '강한 대사·행동'];
    if ((w = has(s, SETV)) || s.includes('들어')) return ['전개', `등장·이동 '${(w || '들어').trim()}'`];
    if (prev && prev.role === '공개' && b.who && prev.who && b.who !== prev.who) return ['반응', '앞 컷 공개를 다른 인물이 받음'];
    return ['전개', '이야기를 이어감'];
  }

  // ---------- 4~5. 묶음 분석 ----------
  function chunk(beats) {
    if (beats.length <= 7) return beats.length ? [beats] : [];
    const out = [];
    for (let k = 0; k < beats.length; k += 5) out.push(beats.slice(k, k + 5));
    const last = out[out.length - 1];
    if (out.length > 1 && last.length <= 2) { out.pop(); out[out.length - 1].push(...last); }
    return out;
  }

  function analyzeChunk(raw) {
    const beats = raw.map(b => ({ ...b, ...feel(b) }));
    beats.forEach((b, k) => {
      const [r, why] = roleOf(b, k, beats[k - 1]); b.role = r; b.roleWhy = why;
      // 드러남은 그 자체로 고비: 공개 컷은 강도 2 이상, 핵심 소품이면 +1
      if (r === '공개' && why.startsWith('드러남')) { const o = has(b.act, OBJ); const ni = Math.min(3, Math.max(b.i, 2) + (o ? 1 : 0)); if (ni > b.i) { b.i = ni; b.emoWhy += ` · 공개${o ? `+소품 '${o}'` : ''}`; } }
    });
    const n = beats.length, I = beats.map(b => b.i);
    const maxI = Math.max(...I), minI = Math.min(...I);

    // VNG
    let peaks = [];
    if (maxI >= 2) {
      const cand = beats.map((b, k) => k).filter(k => I[k] === maxI);
      const spread = cand.filter((k, j) => j === 0 || k - cand[j - 1] > 1);
      peaks = spread.length >= 2 ? spread : [cand.find(k => beats[k].role === '공개') ?? cand[cand.length - 1]];
    }
    let e = 0; while (e < n - 1 && (beats[e].role === '설정' || beats[e].role === '전환')) e++;
    const vng = beats.map((b, k) => {
      if (peaks.includes(k)) return 'P';
      if (k < e) return 'E';
      if (peaks.length && k > peaks[peaks.length - 1]) return 'R';
      if (k === e) return 'I';
      return 'Pr';
    });
    beats.forEach((b, k) => b.vng = vng[k]);

    // 서사 형태
    let narr, narrWhy;
    if (!peaks.length) { narr = '무정점'; narrWhy = '강도 2 이상인 컷이 없음'; }
    else if (peaks.length >= 2) { narr = '정점 연속'; narrWhy = `정점이 ${peaks.length}번`; }
    else {
      const pos = n === 1 ? 1 : peaks[0] / (n - 1);
      narr = pos <= 0.2 ? '정점 선행' : pos >= 0.8 ? '끝 정점' : '중간 정점';
      narrWhy = `${peaks[0] + 1}번 컷이 정점(강도 ${maxI})`;
    }
    // 감정 곡선
    const first = I[0], lastI = I[n - 1];
    let curve;
    if (maxI - minI <= 0.5) curve = '평탄';
    else if (maxI > Math.max(first, lastI) && I.indexOf(maxI) > 0 && I.lastIndexOf(maxI) < n - 1) curve = '산형';
    else if (minI < Math.min(first, lastI) && I.indexOf(minI) > 0 && I.lastIndexOf(minI) < n - 1) curve = '골형';
    else curve = lastI > first ? '상승' : lastI < first ? '하강' : '평탄';
    // 컷 전환 (McCloud)
    const tc = {};
    for (let k = 1; k < n; k++) {
      const a = beats[k - 1], b = beats[k];
      const t = b.role === '전환' ? '장면 전환' : (!a.who && !b.who) ? '양상 전환' : (a.who && b.who && a.who !== b.who) ? '주체 전환' : (a.emo !== b.emo && b.role === '반응') ? '순간 전환' : '동작 전환';
      b.trans = t; tc[t] = (tc[t] || 0) + 1;
    }
    const trans = Object.entries(tc).sort((x, y) => y[1] - x[1])[0]?.[0] || '—';
    // 연출 목적 (순서 규칙)
    const whos = beats.map(b => b.who).filter(Boolean), uniq = [...new Set(whos)];
    let alt = 0; for (let k = 1; k < n; k++) if (beats[k].who && beats[k - 1].who && beats[k].who !== beats[k - 1].who) alt++;
    const P = peaks.length ? beats[peaks[0]] : null;
    let run = 1, cur = 1; for (let k = 1; k < n; k++) { cur = beats[k].who && beats[k].who === beats[k - 1].who ? cur + 1 : 1; run = Math.max(run, cur); }
    const calm = beats.filter(b => b.i <= 1).length;
    const avg = I.reduce((a, c) => a + c, 0) / n;
    const emoCount = {}; beats.forEach(b => emoCount[b.emo] = (emoCount[b.emo] || 0) + 1);
    const domEmo = Object.entries(emoCount).sort((x, y) => y[1] - x[1])[0][0];
    let goal, goalWhy, w;
    if (beats[0].role === '전환') { goal = '장면 전환'; goalWhy = '첫 컷이 전환'; }
    else if (P && (w = has(P.act, OBJ))) { goal = '정보 강조'; goalWhy = `정점 컷의 소품 '${w}'`; }
    else if (P && ['놀람', '분노'].includes(P.emo) && (narr === '끝 정점' || narr === '정점 선행')) { goal = '충격 강조'; goalWhy = `${P.emo}이 ${narr}에 옴`; }
    else if (narr === '끝 정점' && beats.slice(0, Math.ceil(n / 2)).some(b => /\?/.test(b.act))) { goal = '궁금증 유발'; goalWhy = '앞에서 물음을 던지고 끝에 터뜨림'; }
    else if (uniq.length === 2 && n >= 3 && alt >= n - 2) { goal = '관계 대비'; goalWhy = `${uniq.join('·')} 번갈아 ${alt}번`; }
    else if (!peaks.length && run >= 3 && !beats.some(b => b.said) && calm >= n - 1) { goal = '시간 압축'; goalWhy = `한 인물의 연속 동작 ${run}컷, 대사 없음`; }
    else if (['쓸쓸', '회상'].includes(domEmo) || (maxI <= 1 && lastI <= avg) || (curve === '하강' && lastI <= 1 && !beats[n - 1].said)) { goal = '여운'; goalWhy = domEmo === '쓸쓸' || domEmo === '회상' ? `${domEmo}이 주된 감정` : '가라앉으며 끝남'; }
    else if (maxI <= 1) { goal = '감정 지속'; goalWhy = '강한 정점 없이 고르게 이어짐'; }
    else if (domEmo === '긴장') { goal = '긴장 고조'; goalWhy = '긴장 컷이 가장 많음'; }
    else { goal = '몰입 유도'; goalWhy = '정점으로 다가가는 기본 흐름'; }
    // 템포
    const exD = beats.filter(b => /!/.test(b.act)).length / n;
    const len = beats.reduce((a, b) => a + b.act.length, 0) / n;
    let tempoScore = avg + exD - (len > 18 ? 0.3 : 0);
    let tempo = tempoScore >= 1.9 ? '빠름' : tempoScore <= 1.0 ? '느림' : '보통';
    if (goal === '시간 압축') tempo = '빠름';
    if (goal === '여운' || goal === '감정 지속') tempo = '느림';
    // 목표 거리 흐름
    const dist = goal === '관계 대비' ? '교차' : { '끝 정점': '좁혀감', '정점 선행': '넓혀감', '중간 정점': '좁혔다 넓힘', '정점 연속': '교차', '무정점': beats[0].role === '설정' ? '유지·넓게' : '유지·좁게' }[narr];

    return { beats, peaks, narr, narrWhy, curve, trans, goal, goalWhy, tempo, dist, vng: vng.join('→') };
  }

  function analyze(text) { return chunk(parse(text)).map(analyzeChunk); }

  // ---------- 6. 패턴 검색 ----------
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  const W = { narr: 3, curve: 2, goal: 2, vng: 2, count: 1.5, trans: 1, tempo: 1, dist: 1, emo: 1 };
  const WSUM = Object.values(W).reduce((a, c) => a + c, 0);
  function score(an, p) {
    const pics = p.cuts.filter(c => c.t === '그림');
    const pv = String(p.vng || '').split('→').filter(Boolean), av = an.vng.split('→');
    const pe = new Set(pics.map(c => c.emo)), ae = new Set(an.beats.map(b => b.emo));
    const inter = [...ae].filter(x => pe.has(x)).length, uni = new Set([...ae, ...pe]).size || 1;
    const parts = {
      narr: p.narr === an.narr ? 1 : 0,
      curve: p.curve === an.curve ? 1 : 0,
      goal: p.goal === an.goal ? 1 : 0,
      vng: pv.length ? 1 - lev(av, pv) / Math.max(av.length, pv.length) : 0,
      count: 1 - Math.min(1, Math.abs(pics.length - an.beats.length) / Math.max(pics.length, an.beats.length)),
      trans: p.trans === an.trans ? 1 : 0,
      tempo: p.tempo === an.tempo ? 1 : 0,
      dist: p.dist === an.dist ? 1 : 0,
      emo: inter / uni,
    };
    let s = 0; for (const k in W) s += W[k] * parts[k];
    return { p, s, pct: Math.round(s / WSUM * 100), parts };
  }
  function rank(an, patterns, top = 12) {
    return patterns.filter(p => p.cuts.some(c => c.t === '그림')).map(p => score(an, p)).sort((a, b) => b.s - a.s).slice(0, top);
  }

  // ---------- 7. 컷 배치 ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function layout(an, p) {
    const pics = p.cuts.filter(c => c.t === '그림');
    const n = an.beats.length, m = pics.length;
    const maxPI = Math.max(...pics.map(c => c.i || 0));
    let pkPat = -1; pics.forEach((c, j) => { if ((c.i || 0) === maxPI) pkPat = j; });
    const pkBeat = an.peaks.length ? an.peaks[0] : -1;
    const mapIdx = k => {
      if (m === 1) return 0;
      if (pkBeat < 0) return Math.round(k * (m - 1) / Math.max(1, n - 1));
      if (k <= pkBeat) return pkBeat === 0 ? pkPat : Math.round(k * pkPat / pkBeat);
      return Math.min(m - 1, pkPat + Math.round((k - pkBeat) * (m - 1 - pkPat) / Math.max(1, n - 1 - pkBeat)));
    };
    const tf = { 빠름: 0.8, 보통: 1, 느림: 1.2 }[an.tempo];
    return an.beats.map((b, k) => {
      const pc = pics[mapIdx(k)] || pics[0];
      let shot = SHOT_FIX[pc.shot] || (SHOTS.includes(pc.shot) ? pc.shot : '중경');
      const why = { shot: [`패턴 컷 ${pc.id} ${pc.shot}`], ang: [], h: [], gap: [] };
      const ow = has(b.act, OBJ);
      if (b.role === '설정' && RANK[shot] > 1) { shot = has(' ' + b.act + ' ', PLACE) ? '설정' : '전경'; why.shot.push('장소를 먼저 보여줘서 넓게'); }
      if (b.vng === 'P' && ['놀람', '분노', '설렘', '긴장', '당황', '쓸쓸'].includes(b.emo) && RANK[shot] < 4) { shot = '클로즈업'; why.shot.push(`정점의 ${b.emo}이라 얼굴로 당김`); }
      const hw = has(b.act, HAND);
      if (hw && b.vng !== 'P' && RANK[shot] < 5) { shot = '디테일'; why.shot.push(`손 동작 '${hw}'은 인서트로`); }
      if (ow && (b.role === '공개' || (b.vng === 'P' && an.goal === '정보 강조'))) { shot = '디테일'; why.shot.push(`핵심 소품 '${ow}'`); }
      let ang;
      if (ANGLES.includes(pc.ang)) { ang = pc.ang; why.ang.push('패턴 컷 앵글'); }
      else if (['결의', '분노'].includes(b.emo) && b.i >= 2) { ang = '로우앵글'; why.ang.push(`${b.emo}을 크게 보이게 아래에서`); }
      else if (['쓸쓸', '당황'].includes(b.emo) && b.i >= 2) { ang = '하이앵글'; why.ang.push(`${b.emo}을 작게 보이게 위에서`); }
      else if (b.role === '설정' && shot === '설정') { ang = '하이앵글'; why.ang.push('공간을 내려다보며 소개'); }
      else { ang = '아이레벨'; why.ang.push('기본 눈높이'); }
      let h = clamp(pc.h || 1, 0.45, 2.2); why.h.push(`패턴 길이 ${(+pc.h || 1).toFixed(2)}`);
      const im = 1 + 0.15 * (b.i - 1.5); if (Math.abs(im - 1) > 0.01) { h *= im; why.h.push(`강도 ${b.i}`); }
      if (b.vng === 'P' && h < 1.1) { h = 1.1; why.h.push('정점은 크게'); }
      if (tf !== 1) { h *= tf === 0.8 ? 0.9 : 1.1; why.h.push(`템포 ${an.tempo}`); }
      h = +clamp(h, 0.45, 2.4).toFixed(2);
      let gap = (pc.gap ?? 0.3) * tf; why.gap.push(`패턴 여백 × 템포 ${an.tempo}`);
      if (b.vng === 'P') { gap *= 1.6; why.gap.push('정점 뒤 숨 고르기'); }
      if (an.beats[k + 1]?.role === '전환') { gap *= 1.8; why.gap.push('다음 컷이 장면 전환'); }
      gap = +clamp(gap, 0.08, 1.2).toFixed(2);
      return { who: b.who, act: b.act, said: b.said, key: b.key, emo: b.emo, i: b.i, role: b.role, vng: b.vng, trans: b.trans, shot, ang, h, gap, src: pc.id, why };
    });
  }

  // 컷 하나에 가장 가까운 참고 그림
  function suggestRef(cut, refs) {
    let best = null, bs = -1;
    for (const r of refs) {
      const s = (r.shot === cut.shot ? 2 : RANK[r.shot] != null && Math.abs(RANK[r.shot] - RANK[cut.shot]) === 1 ? 0.8 : 0) + (r.angle === cut.ang ? 1 : 0) + (r.kind === 'cre' && cut.shot === '클로즈업' ? 0.3 : 0);
      if (s > bs) { bs = s; best = r; }
    }
    return bs >= 2 ? best : null;
  }

  Object.assign(E, { SHOTS, ANGLES, parse, analyze, analyzeChunk, chunk, rank, score, layout, suggestRef, WEIGHTS: W });
})(typeof module !== 'undefined' ? module.exports : (window.RoughEngine = {}));
