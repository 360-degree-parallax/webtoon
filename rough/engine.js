/* 러프 엔진: 장면 글 → 코드표 값 → 패턴 검색 → 컷 배치.
   브라우저(window.RoughEngine)와 Node(require) 모두에서 쓴다. 기준은 docs/codebook.md, 설계는 docs/rough-plan.md. */
(function (E) {
  const SHOTS = ['설정', '전경', '전신', '중경', '클로즈업', '디테일', '효과 배경'];
  const ANGLES = ['아이레벨', '하이앵글', '로우앵글', '탑뷰'];
  const RANK = { 설정: 0, 전경: 1, 전신: 2, 중경: 3, 클로즈업: 4, 디테일: 5, '효과 배경': 4 };
  const SHOT_FIX = { '화면 인서트': '디테일', SD: '중경' };

  // 감정 사전: [감정, 기본 강도, 낱말들]. 코드표 감정 14종.
  // 여러 감정이 맞으면 기본 강도가 높은 쪽, 같으면 더 긴 낱말(더 구체적인 표현)을 쓴다.
  // 낱말은 활용형이 갈리는 지점까지만 적는다(예: '놀라' → 놀라서·놀라며, '놀란'·'놀람'은 따로).
  const LEX = [
    ['놀람', 2, ['놀라', '놀란', '놀람', '놀랐', '깜짝', '화들짝', '흠칫', '소스라치', '기겁', '헉', '허억', '경악', '충격', '눈이 커', '눈을 크게', '눈이 휘둥그', '동공', '얼어붙', '입을 벌', '입이 떡', '숨을 들이', '뒤로 물러', '설마', '뭐?', '어?!']],
    ['분노', 2, ['화를', '화가', '화내', '화난', '버럭', '격분', '분노', '분해', '소리치', '소리쳤', '소리 지', '고함', '노려', '째려', '쏘아보', '주먹으로', '주먹을 휘', '때리', '때렸', '따귀', '뺨을 때', '멱살', '이를 악', '이를 갈', '으르렁', '성질', '짜증', '핏대', '씩씩', '밀쳐', '밀친', '내던', '집어던', '걷어차', '닥쳐', '꺼져', '용서 못']],
    ['긴장', 2, ['긴장', '숨죽', '숨을 죽', '숨을 참', '마른침', '침을 삼', '멈칫', '다가온', '다가오', '칼을 겨', '칼끝', '총구', '겨누', '위협', '식은땀', '손에 땀', '조여', '경계', '주위를 살', '엿보', '몰래', '숨어', '쫓기', '쫓아', '도망', '포위', '심각']],
    ['설렘', 2, ['붉어', '붉힌', '빨개', '귀가 빨', '얼굴이 달아', '두근', '설레', '심장이', '손을 잡', '손목을 잡', '손목을 붙잡', '손을 붙잡', '깍지', '눈이 마주', '입맞', '키스', '안기', '껴안', '끌어안', '수줍', '부끄러', '쑥스', '시선을 피', '눈을 피', '숨결', '이마를 맞', '반하', '첫눈에', '가까이 다가']],
    ['당황', 2, ['당황', '허둥', '어버버', '얼버무', '진땀', '말을 더듬', '말끝을 흐', '어쩔 줄', '횡설수설', '우왕좌왕', '머쓱', '난처', '곤란', '식겁', '허겁지겁', '아차', '들켰', '변명', '손사래', '버벅']],
    ['쓸쓸', 2, ['눈물', '울음', '운다', '울었', '울며', '우는', '흐느', '쓸쓸', '외로', '혼자 남', '뒷모습', '떠나간', '떠난다', '떠남', '이별', '그리워', '그리움', '공허', '허전', '고개를 떨', '어깨가 처', '한숨', '쓴웃음', '텅 빈', '빈자리', '체념', '무너지', '무너진', '주저앉', '슬픔', '슬퍼', '서글']],
    ['결의', 2, ['결심', '다짐', '각오', '주먹을 쥐', '주먹을 꽉', '일어선', '일어섬', '맹세', '반드시', '이를 꽉', '눈빛이 바뀌', '결연', '단호', '앞으로 나서', '검을 뽑', '칼을 뽑', '마음먹', '포기하지', '지켜낼', '지킬게', '해낼']],
    ['다정', 1, ['미소', '쓰다듬', '다정', '토닥', '상냥', '부드럽게', '챙겨', '안아 주', '안아주', '안아 줌', '안아줌', '안아 준', '안아준', '안아 줬', '안아줬', '웃어 주', '웃어주', '웃어 줌', '웃어줌', '웃어 준', '웃어준', '웃어 줬', '웃어줬', '감싸 주', '감싸주', '감싸 줌', '감싸줌', '감싸 준', '감싸준', '감싸 줬', '감싸줬', '덮어 주', '덮어주', '덮어 줌', '덮어줌', '덮어 준', '덮어준', '덮어 줬', '덮어줬', '닦아 주', '닦아주', '닦아 줌', '닦아줌', '닦아 준', '닦아준', '닦아 줬', '닦아줬', '잡아 주', '잡아주', '잡아 줌', '잡아줌', '잡아 준', '잡아준', '잡아 줬', '잡아줬', '어깨를 두드', '손을 얹', '따뜻하게', '걱정스럽', '고마워', '괜찮아']],
    ['기쁨', 1, ['웃음', '웃는', '웃었', '웃으며', '웃는다', '기뻐', '기쁘', '환호', '신나', '신난', '활짝', '방긋', '싱글벙글', '깔깔', '하하', '만세', '들뜬', '행복', '반가']],
    ['의아', 1, ['갸웃', '갸우뚱', '의아', '이상하', '고개를 기울', '눈을 가늘', '미간을 찌푸', '어리둥절', '멀뚱', '응?', '왜?', '뭐지', '수상', '의심']],
    ['냉담', 1, ['차갑', '무시', '외면', '냉정', '돌아선', '돌아섬', '돌아서', '무표정', '시큰둥', '냉랭', '싸늘', '쌀쌀', '비웃', '코웃음', '시선도 주지', '등을 돌', '무심', '건조하게', '귀찮', '됐어']],
    ['회상', 1, ['예전', '그때', '기억', '회상', '어린 시절', '옛날', '과거', '추억', '떠올', '아련', '그 시절', '처음 만난', '꿈에서']],
    ['개그', 1, ['ㅋ', '엉뚱', '꽈당', '황당', '넘어진', '넘어짐', '삐짐', '삐졌', '투덜', '데굴', '허당', '멍때', '꼬르륵', '콧물', '째릿', '뾰로통', '우당탕', '헤벌쭉', '덜렁', '엥?']],
    // 분위기 단서: 인물 감정 낱말이 함께 있으면 그쪽을 따른다(같은 강도·길이면 앞쪽 항목 우선)
    ['긴장', 1, ['정적', '침묵이', '노크', '발소리', '인기척', '삐걱', '덜컥', '어둠 속', '그림자가', '침묵', '정적이']],
    ['평온', 0, ['평화', '고요', '잔잔', '나른', '햇살', '산책', '차를 마', '한가', '여유', '졸음', '기지개', '조용히']],
  ];
  // 강약: 강하게 +1, 약하게 -1 (감정 낱말이 있으면 최소 1)
  const BOOST = ['갑자기', '확 ', '순간', '번쩍', '쾅', '와락', '벌떡', '펑펑', '미친 듯', '온 힘', '부들부들', '폭발', '격하게', '버럭', '소리를 지르'];
  const SOFT = ['살짝', '조금', '희미', '옅은', '옅게', '작게', '슬며시', '살며시', '애써', '잠깐'];
  const PLACE = ['복도', '방 ', '방에', '거리', '교실', '저택', '정원', '하늘', '성 ', '성의', '집', '카페', '학교', '숲', '바다', '도시', '길', '문 앞', '창밖', '연회장', '침실', '마당', '골목', '광장', '역', '사무실', '궁'];
  const SETV = ['서 있', '걸어', '도착', '들어선', '들어옴', '들어온', '풍경', '전경', '펼쳐', '앉아 있', '등장'];
  const TRANS = ['다음 날', '다음날', '한편', '그 시각', '같은 시각', '그날 밤', '며칠 후', '몇 시간 후', '시간이 흘러', '장면 전환', '아침이', '밤이 되'];
  const REACT = ['놀라', '돌아보', '돌아봄', '돌아본', '붉어', '빨개', '굳어', '굳는', '멈칫', '바라보', '바라봄', '표정', '눈이 커', '당황', '얼어', '숨을 삼', '움찔', '갸웃', '쳐다'];
  const REVEAL = ['드러', '나타나', '나타남', '정체', '사실은', '꺼내', '꺼낸', '꺼냄', '보여주', '고백', '들켜', '발견', '내민', '내밀'];
  const OBJ = ['반지', '편지', '사진', '칼', '열쇠', '휴대폰', '핸드폰', '목걸이', '검을', '책을', '꽃', '쪽지', '문서', '약병', '총', '선물', '상자'];
  const HAND = ['손목을', '손을 잡', '손을 뻗', '손끝', '손가락', '손을 내', '발끝', '옷자락을'];
  const has = (s, ws) => ws.find(w => s.includes(w)) || null;

  // ---------- 1. 파싱 ----------
  // 두 형식을 받는다: 한 줄 한 컷 `인물 | 행동 "대사"`, 또는 줄글(문장 단위로 컷을 나눔).
  // chars: [{name, aliases:[]}] — 줄글에서 인물을 찾는 기준. 비어 있으면 조사가 붙어 반복되는 이름을 추정한다.
  const QO = '"“「『', QC = '"”」』';
  const CONT = ['하고', '라고', '하며', '라며', '하자', '라는', '하는', '고 ', '며 ', '이라'];
  function sentences(text) {
    const out = []; let cur = '', inQ = false;
    const push = () => { const t = cur.trim(); if (t) out.push(t); cur = ''; };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]; cur += ch;
      if (ch === '\n') { push(); continue; }
      if (!inQ && QO.includes(ch) && !(ch === '"' && inQ)) { inQ = true; continue; }
      if (inQ && QC.includes(ch)) {
        inQ = false;
        const prev = text[i - 1] || '', rest = text.slice(i + 1).replace(/^\s+/, '');
        if (/[.!?…~]/.test(prev) && !CONT.some(c => rest.startsWith(c))) push();
        continue;
      }
      if (!inQ && /[.!?…]/.test(ch) && !/[.!?…"”」』]/.test(text[i + 1] || '') && (/\s/.test(text[i + 1] || ' ') || i === text.length - 1)) push();
    }
    push(); return out;
  }
  const PART_S = '(은|는|이|가|도|께서)', PART_O = '(의|을|를|에게|한테|와|과|께)';
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function guessNames(sents) {
    const cnt = {};
    for (const t of sents) for (const m of t.replace(/["“][^"”]*["”]/g, ' ').matchAll(/(?:^|[\s,])([가-힣]{1,4}?)(?:은|는|이|가|의|을|를|에게)(?=[\s,.]|$)/g)) cnt[m[1]] = (cnt[m[1]] || 0) + 1;
    const stop = /^(그|그녀|그것|이것|저것|우리|나|너|자신|사람|누구|무엇|얼굴|목소리|순간|잠시|침묵|복도|방|문|손|눈|발소리|대답|저녁|아침|밤|비|바람|하늘|모두|서로|둘|한참|뒤)$/;
    return Object.entries(cnt).filter(([n, c]) => c >= 2 && !stop.test(n)).sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 6);
  }
  function findWho(t, chars) {
    const body = t.replace(/["“][^"”]*["”]/g, ' ');
    let subj = null, poss = null, si = 1e9, pi = 1e9;
    for (const c of chars) for (const n of [c.name, ...(c.aliases || [])].filter(Boolean)) {
      const ms = new RegExp('(^|[^가-힣])' + escRe(n) + PART_S + '(?=[^가-힣]|$)').exec(body);
      if (ms && ms.index < si) { si = ms.index; subj = c.name; }
      const mp = new RegExp('(^|[^가-힣])' + escRe(n) + '의(?=[^가-힣]|$)').exec(body);
      if (mp && mp.index < pi) { pi = mp.index; poss = c.name; }
    }
    return subj || (poss && !/(손목|손|팔|어깨)을/.test(body) ? poss : null);
  }
  function parseProse(text, chars) {
    const sents = sentences(text);
    const list = chars && chars.length ? chars : guessNames(sents).map(name => ({ name }));
    const beats = []; let last = '';
    for (const t of sents) {
      const said = (t.match(/["“]([^"”]+)["”]/) || [])[1] || '';
      const onlyQuote = /^["“][^"”]*["”][.!?…]*$/.test(t);
      const who = findWho(t, list);
      const act = t.replace(/["“][^"”]*["”]\s*(하고|라고|하며|라며)?/g, ' ').replace(/\s+/g, ' ').trim();
      const prev = beats[beats.length - 1];
      if (onlyQuote && prev && !prev.said) { prev.said = said; prev.line += ' ' + t; prev.key = prev.line; continue; }
      if (!who && !said && prev && !prev.who && beats.length === 1) { prev.act += ' ' + act; prev.line += ' ' + t; prev.key = prev.line; continue; }
      const w = who || (onlyQuote ? last : '');
      if (w) last = w;
      beats.push({ line: t, who: w, act: act || t, said, key: t, prose: true });
    }
    return beats;
  }
  function parse(text, chars) {
    const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const piped = lines.filter(l => l.includes('|')).length;
    if (lines.length && piped >= Math.ceil(lines.length / 2)) return lines.map(line => {
      const parts = line.split('|');
      const who = parts.length > 1 ? parts[0].trim() : '';
      const act = (parts.length > 1 ? parts.slice(1).join('|') : parts[0]).trim();
      const said = (act.match(/["“]([^"”]+)["”]/) || [])[1] || '';
      return { line, who, act, said, key: line };
    });
    return parseProse(String(text || ''), chars);
  }

  // ---------- 2. 감정·강도 ----------
  const longest = (s, ws) => ws.filter(w => s.includes(w)).sort((a, b) => b.length - a.length)[0] || null;
  function feel(b) {
    const s = ' ' + b.act + ' ';
    let emo = '평온', i = b.said ? 1 : 0, why = b.said ? '대사' : '특별한 감정 낱말 없음', hit = null;
    for (const [e, base, ws] of LEX) {
      const w = longest(s, ws);
      if (w && (!hit || base > hit.base || (base === hit.base && w.length > hit.w.length))) hit = { e, base, w };
    }
    if (hit) { emo = hit.e; if (hit.base > 0) i = hit.base; why = `'${hit.w}'`; }
    const ex = (s.match(/!/g) || []).length;
    if (ex) { i += 1; why += ' · 느낌표'; }
    const bw = has(s, BOOST.filter(w => w !== hit?.w));
    if (bw) { i += 1; why += ` · 강하게 '${bw.trim()}'`; }
    const sw = has(s, SOFT);
    if (sw) { i = Math.max(hit && hit.base > 0 ? 1 : 0, i - 1); why += ` · 약하게 '${sw}'`; }
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

  function analyze(text, chars) { return chunk(parse(text, chars)).map(analyzeChunk); }

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
    const exact = cut.src && refs.find(ref => ref.source_cut === cut.src);
    if (exact) return exact;
    let best = null, bs = -1;
    for (const r of refs) {
      const s = (r.shot === cut.shot ? 2 : RANK[r.shot] != null && Math.abs(RANK[r.shot] - RANK[cut.shot]) === 1 ? 0.8 : 0) + (r.angle === cut.ang ? 1 : 0) + (r.kind === 'cre' && cut.shot === '클로즈업' ? 0.3 : 0);
      if (s > bs) { bs = s; best = r; }
    }
    return bs >= 2 ? best : null;
  }

  Object.assign(E, { SHOTS, ANGLES, parse, sentences, guessNames, analyze, analyzeChunk, chunk, rank, score, layout, suggestRef, WEIGHTS: W });
})(typeof module !== 'undefined' ? module.exports : (window.RoughEngine = {}));
