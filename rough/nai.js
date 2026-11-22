/* NovelAI Diffusion V4.5 Full용 출력: 엔진이 정한 컷 값을 Danbooru 태그로 바꾸고,
   V4.5 화면 칸(기본 프롬프트 / 캐릭터 프롬프트+위치 / 해상도 / img2img / 레퍼런스)에 맞춰 나눈다.
   브라우저(window.RoughNAI)와 Node(require) 모두에서 쓴다. */
(function (N) {
  'use strict';
  const SHOT = {
    설정: ['scenery', 'very wide shot', 'wide shot'], 전경: ['wide shot', 'full body'], 전신: ['full body'], 중경: ['upper body'],
    클로즈업: ['portrait', 'close-up', 'face focus'], 디테일: ['close-up'], '효과 배경': ['upper body', 'abstract background'],
  };
  const ANG = { 아이레벨: ['straight-on'], 하이앵글: ['from above'], 로우앵글: ['from below'], 탑뷰: ['from above', 'top-down'] };
  const EXPR = {
    놀람: ['surprised', 'wide-eyed', 'open mouth'], 분노: ['angry', 'frown', 'clenched teeth'], 긴장: ['nervous', 'serious', 'sweat'],
    설렘: ['blush', 'embarrassed', 'looking away', 'parted lips'], 당황: ['flustered', 'sweatdrop', 'wavy mouth'], 쓸쓸: ['sad', 'downcast eyes'],
    결의: ['serious', 'determined', 'v-shaped eyebrows'], 다정: ['gentle smile', 'light smile', 'half-closed eyes'], 기쁨: ['smile', 'happy', 'open mouth'],
    의아: ['confused', 'head tilt', 'raised eyebrow'], 냉담: ['expressionless', 'half-closed eyes'], 회상: ['looking afar', 'nostalgic'],
    개그: ['chibi', 'comedy'], 평온: ['calm', 'closed mouth'],
  };
  const POSE = [
    [['걸어', '걷', '다가'], ['walking']], [['돌아보', '돌아봄', '돌아본', '뒤돌'], ['looking back', 'looking over shoulder']],
    [['손목', '손을 잡', '붙잡'], ['grabbing another\'s wrist', 'holding hands']], [['안기', '안아', '껴안', '포옹'], ['hug']],
    [['어깨'], ['hand on another\'s shoulder']], [['숙이', '숙임', '숙인', '고개를 떨'], ['head down']], [['올려다', '고개를 들'], ['looking up']],
    [['손을 뻗', '내민', '건네'], ['reaching out']], [['가리', '감싸'], ['covering mouth']], [['웃'], ['smile']], [['울', '눈물'], ['tears']],
    [['붉어', '빨개'], ['blush']], [['앉'], ['sitting']], [['서 있', '선 채'], ['standing']], [['코피'], ['nosebleed']], [['총'], ['holding gun', 'rifle']],
    [['단추', '소매'], ['sleeve', 'button']], [['촛불'], ['holding candle', 'candle']], [['계단을 오'], ['walking up stairs']],
  ];
  const PLACE = [
    [['복도'], ['indoors', 'hallway', 'mansion']], [['저택'], ['mansion', 'victorian']], [['정원'], ['outdoors', 'garden']], [['숲', '풀밭'], ['outdoors', 'forest', 'dappled sunlight']],
    [['교실'], ['indoors', 'classroom']], [['부엌'], ['indoors', 'kitchen']], [['계단'], ['stairs']], [['창가', '창밖', '창문'], ['window']], [['무대', '극장'], ['stage', 'theater']],
    [['거리', '골목'], ['outdoors', 'street']], [['카페'], ['indoors', 'cafe']], [['방', '침실'], ['indoors', 'bedroom']], [['연회', '만찬'], ['indoors', 'ballroom', 'chandelier']],
  ];
  const LIGHT = [
    [['밤', '촛불', '달빛', '자정'], ['night', 'candlelight', 'dark']], [['노을', '저녁', '석양'], ['sunset', 'orange sky']], [['아침', '햇살', '햇빛'], ['morning', 'sunlight']],
    [['비가 그친', '비 갠'], ['after rain', 'wet floor']], [['비가 내', '비가 오', '비 오', '빗줄기', '빗속'], ['rain', 'wet']], [['눈 내', '눈이 내', '겨울'], ['snow', 'winter']],
  ];
  const MOOD = { 긴장: ['dramatic lighting', 'high contrast'], 설렘: ['soft lighting', 'bloom'], 쓸쓸: ['muted colors'], 분노: ['high contrast', 'dramatic lighting'], 놀람: ['dramatic lighting'] };
  // 한국어 외형 → 태그
  const COLOR = { 검은: 'black', 검정: 'black', 까만: 'black', 흰: 'white', 하얀: 'white', 붉은: 'red', 빨간: 'red', 파란: 'blue', 푸른: 'blue', 초록: 'green', 녹색: 'green', 노란: 'yellow', 금색: 'yellow', 갈색: 'brown', 밤색: 'brown', 회색: 'grey', 은색: 'silver', 분홍: 'pink', 보라: 'purple', 남색: 'navy blue' };
  const HAIRC = [[['금발'], 'blonde hair'], [['은발'], 'silver hair'], [['흑발', '검은 머리', '까만 머리'], 'black hair'], [['갈색 머리', '밤색 머리', '갈발'], 'brown hair'], [['빨간 머리', '붉은 머리', '적발'], 'red hair'], [['분홍 머리'], 'pink hair'], [['백발', '흰 머리'], 'white hair'], [['회색 머리'], 'grey hair']];
  const HAIRS = [[['짧은 머리', '짧은 금발', '숏컷'], 'short hair'], [['긴 머리', '장발'], 'long hair'], [['단발'], 'bob cut'], [['하나로 묶', '포니테일', '묶은 머리'], 'ponytail'], [['땋은', '땋아'], 'braid'], [['올림머리', '틀어 올린'], 'hair bun'], [['앞머리'], 'bangs']];
  const EYES = { 초록: 'green eyes', 녹색: 'green eyes', 갈색: 'brown eyes', 파란: 'blue eyes', 푸른: 'blue eyes', 붉은: 'red eyes', 빨간: 'red eyes', 검은: 'black eyes', 금색: 'yellow eyes', 노란: 'yellow eyes', 회색: 'grey eyes', 보라: 'purple eyes' };
  const CLOTH = [[['연미복'], 'tailcoat'], [['집사'], 'butler'], [['하인'], 'butler'], [['하녀', '메이드'], 'maid'], [['앞치마'], 'apron'], [['장갑'], 'gloves'], [['드레스'], 'dress'], [['정장'], 'suit'],
    [['교복'], 'school uniform'], [['셔츠'], 'shirt'], [['코트'], 'coat'], [['안경'], 'glasses'], [['리본'], 'hair ribbon'], [['넥타이'], 'necktie'], [['조끼'], 'vest'], [['망토'], 'cape'], [['모자'], 'hat'], [['귀족'], 'aristocrat']];
  const has = (s, ws) => ws.some(w => s.includes(w));
  const tagsOf = (s, table) => table.filter(([ws]) => has(s, ws)).flatMap(([, t]) => t);
  const uniq = a => [...new Set(a.filter(Boolean))];
  const textOf = p => [p.act, p.caption, ...(p.dialogs || []).map(d => d.note)].filter(Boolean).join(' ');

  function lookTags(look) {
    const s = String(look || ''); const out = [];
    HAIRC.forEach(([ws, t]) => { if (has(s, ws)) out.push(t); });
    HAIRS.forEach(([ws, t]) => { if (has(s, ws)) out.push(t); });
    for (const m of s.matchAll(/(\S+?)\s?눈/g)) { const c = Object.keys(EYES).find(k => m[1].startsWith(k)); if (c) out.push(EYES[c]); }
    CLOTH.forEach(([ws, t]) => { const w = ws.find(x => s.includes(x)); if (!w) return; const m = s.match(new RegExp(`(\\S+)\\s${w}`)); const c = m && Object.keys(COLOR).find(k => m[1].startsWith(k)); out.push(c ? `${COLOR[c]} ${t}` : t); });
    return uniq(out);
  }
  const countTag = cs => { const b = cs.filter(c => c.body === 'male').length, g = cs.filter(c => c.body !== 'male').length; return [g ? (g > 1 ? `${g}girls` : '1girl') : '', b ? (b > 1 ? `${b}boys` : '1boy') : ''].filter(Boolean); };

  // 해상도: 64의 배수, 무료 생성 범위(가로×세로 ≤ 1024×1024) 안에서 컷 비율에 가장 가깝게
  function size(r) {
    let best = null;
    for (let w = 512; w <= 1600; w += 64) for (let h = 512; h <= 1600; h += 64) {
      if (w * h > 1048576) continue; const e = Math.abs(Math.log(h / w / r)) * 10 - (w * h) / 1048576;
      if (!best || e < best.e) best = { w, h, e };
    }
    const exact = Math.abs(best.h / best.w - r) < 0.02;
    return { w: best.w, h: best.h, exact, crop: exact ? '' : (best.h / best.w > r ? `위아래를 잘라 가로 100 : 세로 ${Math.round(r * 100)}로` : `좌우를 잘라 가로 100 : 세로 ${Math.round(r * 100)}로`) };
  }
  // 캐릭터 위치: V4.5 5×5 칸(A~E 가로, 1~5 세로), 좌표는 칸 중심 0.1~0.9
  const COLS = ['A', 'B', 'C', 'D', 'E'];
  const pos = (x, y) => ({ x, y, cell: `${COLS[Math.round((x - 0.1) / 0.2)]}${Math.round((y - 0.1) / 0.2) + 1}` });

  function cut(p, i, panels, ctx) {
    const { chars = [], style = '', tags = {}, refs = {} } = ctx;
    const t = textOf(p), all = panels.map(textOf).join(' ');
    const main = chars.find(c => c.name === p.who);
    const oth = chars.filter(c => c.name && c.name !== p.who && (p.act || '').includes(c.name));
    const insert = p.shot === '디테일', tiny = p.shot === '설정' || p.shot === '전경';
    const cast = [main, ...oth].filter(Boolean).slice(0, 6);
    const poses = tagsOf(t, POSE), place = uniq([...tagsOf(t, PLACE), ...(tagsOf(t, PLACE).length ? [] : tagsOf(all, PLACE))]);
    // 빛: 시간대는 컷 글 → 씬 글 순으로 첫 번째 하나만, 날씨는 따로 더함
    const TIME = LIGHT.slice(0, 3), WEATHER = LIGHT.slice(3);
    const first = tbl => (tbl.find(([ws]) => has(t, ws)) || tbl.find(([ws]) => has(all, ws)) || [null, []])[1];
    const light = uniq([...first(TIME), ...first(WEATHER)]);
    const peak = p.vng === 'P';
    const shot = insert ? (poses.some(x => /wrist|hand|shoulder/.test(x)) ? ['close-up', 'hands focus', 'head out of frame'] : cast.length ? ['close-up', 'head out of frame'] : ['close-up', 'still life', 'no humans']) : SHOT[p.shot] || SHOT['중경'];
    const side = i % 2 ? 'left' : 'right';
    const base = uniq([
      ...(cast.length ? countTag(cast) : ['no humans']),
      ...shot, ...(ANG[p.ang] || []),
      ...place, ...(ctx.loreTags ? ctx.loreTags(p) : []), ...light, ...(MOOD[p.emo] || []),
      peak && '1.2::dramatic lighting::',
      (p.dialogs || []).length && 'negative space',
      ...String(ctx.worldTags || '').split(',').map(s => s.trim()),
      ...String(style).split(',').map(s => s.trim()),
    ]);
    // 캐릭터 프롬프트: 외형(사용자 태그 우선) + 표정 + 동작
    const charP = cast.map((c, n) => {
      const isMain = n === 0 && c === main;
      const look = (tags[c.name] && tags[c.name].trim()) || lookTags(c.look).join(', ');
      const x = cast.length === 1 ? (side === 'left' ? 0.3 : 0.7) : n === 0 ? (side === 'left' ? 0.3 : 0.7) : (side === 'left' ? 0.7 : 0.3);
      const y = p.shot === '클로즈업' || p.shot === '효과 배경' ? 0.5 : tiny ? 0.7 : 0.5;
      const prompt = uniq([
        c.body === 'male' ? '1boy' : '1girl', look,
        isMain && !insert && !tiny ? (EXPR[p.emo] || []).join(', ') : '',
        isMain ? poses.join(', ') : '',
        cast.length > 1 ? (n === 0 ? `facing ${side === 'left' ? 'right' : 'left'}` : 'looking at another') : '',
        insert ? 'hands only' : '',
      ]).join(', ');
      return { name: c.name, prompt, pos: pos(x, y), ref: !!refs.char?.(c.name) };
    });
    const sz = size(p.h);
    const strength = insert ? 0.72 : tiny ? 0.62 : peak ? 0.7 : 0.66;
    const charRef = main && refs.char?.(main.name) ? main.name : null;
    const vibe = !charRef && refs.scene ? true : false;
    return {
      base: base.join(', '), chars: charP, size: sz,
      settings: { steps: 28, guidance: 5, rescale: 0, sampler: 'Euler Ancestral', noise: 'karras', strength, noiseImg: 0.1 },
      charRef, vibe, peak, aiChoice: cast.length < 2 && !insert,
    };
  }
  function text(o, i, total, head) {
    const L = [`[컷 ${i + 1} / ${total}] ${head || ''}`.trim(),
      `해상도: ${o.size.w} × ${o.size.h}${o.size.exact ? '' : ` (생성 후 ${o.size.crop} 자르기)`}`,
      `기본 프롬프트:\n${o.base}`,
      ...o.chars.map((c, n) => `캐릭터 ${n + 1} · ${c.name} · 위치 ${c.pos.cell} (x ${c.pos.x}, y ${c.pos.y}):\n${c.prompt}`),
      `설정: Steps ${o.settings.steps} · Guidance ${o.settings.guidance} · Sampler ${o.settings.sampler} · Noise Schedule ${o.settings.noise}`,
      `img2img: 바탕 PNG 업로드, Strength ${o.settings.strength} · Noise ${o.settings.noiseImg}`,
      o.charRef ? `Character Reference: ${o.charRef} 이미지 (V4.5, 한 장만 · Vibe Transfer와 같이 못 씀)` : o.vibe ? 'Vibe Transfer: 장면 이미지 (정보 추출 0.6 · 강도 0.5 정도에서 시작)' : '',
    ].filter(Boolean);
    return L.join('\n\n');
  }
  // 칸 이름(A1~E5) → 좌표
  const cellPos = cell => { const c = COLS.indexOf(String(cell)[0]), r = +String(cell).slice(1) - 1; return c < 0 || !(r >= 0 && r < 5) ? null : pos(+(0.1 + c * 0.2).toFixed(1), +(0.1 + r * 0.2).toFixed(1)); };
  Object.assign(N, { cut, text, lookTags, size, cellPos, SHOT, ANG, EXPR });
})(typeof module !== 'undefined' ? module.exports : (window.RoughNAI = {}));
