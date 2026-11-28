/* 컷 프롬프트 생성기: 엔진이 정한 컷(샷·앵글·감정·역할·행동·대사·식자)과 인물·작품 스타일을 묶어
   이미지 생성용 프롬프트를 만든다. 형식: mj(미드저니 V7), sd(Flux·SD 긍정/부정), natural(자연어, GPT·Gemini 이미지용).
   브라우저(window.RoughPrompt)와 Node(require) 모두에서 쓴다. */
(function (P) {
  'use strict';
  const SHOT = {
    설정: { en: 'establishing shot', frame: 'wide view of the whole location, characters small or absent', ko: '장소 전체가 보이는 설정 컷, 인물은 작게 또는 없이', lens: '24mm wide lens' },
    전경: { en: 'wide shot', frame: 'full figures with generous surrounding space, environment clearly readable', ko: '인물 전신과 주변 공간이 넉넉하게', lens: '28mm lens' },
    전신: { en: 'full-body shot', frame: 'head to toe, figure fills about 70% of the frame height', ko: '머리부터 발끝까지, 인물이 화면 높이의 70% 정도', lens: '35mm lens' },
    중경: { en: 'medium shot', frame: 'waist up, upper body and hand gestures visible', ko: '허리 위, 상반신과 손동작이 보이게', lens: '50mm lens' },
    클로즈업: { en: 'close-up', frame: 'face and shoulders fill the frame, focus on the expression', ko: '얼굴과 어깨가 화면을 채움, 표정에 집중', lens: '85mm lens, shallow depth of field' },
    디테일: { en: 'extreme close-up insert', frame: 'a single detail (hands, eyes or an object) fills the frame, background blurred', ko: '손·눈·소품 하나가 화면을 채우는 인서트, 배경은 흐리게', lens: '100mm macro lens' },
    '효과 배경': { en: 'emotional close-up over an abstract background', frame: 'bust shot over a flat color field with speed lines or pattern', ko: '단색·패턴·집중선 배경 위 상반신', lens: '85mm lens' },
  };
  const ANG = {
    아이레벨: { en: 'eye-level camera', ko: '눈높이 앵글' },
    하이앵글: { en: 'high-angle camera looking down, subject feels small', ko: '위에서 내려다보는 하이앵글, 인물이 작아 보이게' },
    로우앵글: { en: 'low-angle camera looking up, subject feels imposing', ko: '아래에서 올려다보는 로우앵글, 인물이 압도적으로' },
    탑뷰: { en: "top-down bird's-eye view", ko: '바로 위에서 내려다보는 탑뷰' },
  };
  const EXPR = {
    놀람: ['wide eyes, raised eyebrows, lips parted', '눈을 크게 뜨고 눈썹이 올라감, 입이 살짝 벌어짐'],
    분노: ['furrowed brows, glaring eyes, clenched jaw', '찌푸린 눈썹, 노려보는 눈, 꽉 다문 턱'],
    긴장: ['tense face, tight lips, alert eyes, a bead of sweat', '굳은 얼굴, 다문 입술, 경계하는 눈, 식은땀'],
    설렘: ['flushed cheeks, shy lowered eyes, softly parted lips', '붉어진 볼, 수줍게 내리깐 눈, 살짝 벌어진 입술'],
    당황: ['flustered, eyes darting, sweat drop, awkward half-smile', '허둥대는 눈, 땀방울, 어색한 반쯤 웃음'],
    쓸쓸: ['sorrowful eyes, downturned mouth, distant gaze', '슬픈 눈, 처진 입꼬리, 먼 곳을 보는 시선'],
    결의: ['determined gaze, set jaw, straight brows', '단호한 눈빛, 굳게 다문 턱, 곧은 눈썹'],
    다정: ['gentle warm smile, soft eyes', '부드러운 미소, 다정한 눈'],
    기쁨: ['bright smile, eyes crinkled with joy', '환한 웃음, 웃느라 접힌 눈'],
    의아: ['puzzled look, one eyebrow raised, head slightly tilted', '의아한 표정, 한쪽 눈썹을 올리고 고개를 살짝 기울임'],
    냉담: ['cold indifferent stare, half-lidded eyes', '차가운 무관심한 시선, 반쯤 감긴 눈'],
    회상: ['wistful faraway look', '아련하게 먼 곳을 보는 표정'],
    개그: ['exaggerated comedic expression', '과장된 개그 표정'],
    평온: ['calm neutral expression', '차분하고 담담한 표정'],
  };
  const POSE = [
    [['걸어', '걷', '다가', '걸어온'], 'walking forward', '걸어오는 자세'],
    [['돌아보', '돌아봄', '돌아본', '뒤돌'], 'turning to look back over the shoulder', '어깨 너머로 돌아봄'],
    [['손목', '손을 잡', '붙잡'], "grabbing the other person's wrist", '상대의 손목을 붙잡음'],
    [['안기', '안아', '껴안', '포옹'], 'embracing the other person', '끌어안음'],
    [['어깨'], "hand resting on the other person's shoulder", '상대 어깨에 손을 올림'],
    [['숙이', '숙임', '숙인', '고개를 떨'], 'head bowed', '고개를 숙임'],
    [['올려다', '고개를 들', '고개를 듦'], 'looking up', '올려다봄'],
    [['손을 뻗', '내민', '건네', '건네받'], 'reaching out a hand', '손을 내밂'],
    [['가리', '감싸'], 'covering the mouth and nose with one hand', '한 손으로 코와 입을 가림'],
    [['웃'], 'smiling', '웃음'],
    [['울', '눈물'], 'tears welling in the eyes', '눈물이 고임'],
    [['붉어', '빨개'], 'blushing', '얼굴이 붉어짐'],
    [['앉'], 'sitting', '앉아 있음'],
    [['서 있', '선 채'], 'standing', '서 있음'],
    [['코피'], 'nosebleed trickling down', '코피가 흐름'],
    [['털'], 'brushing off the hands', '손을 털어냄'],
    [['총'], 'holding a hunting rifle', '사냥총을 듦'],
    [['단추', '소매'], 'fingers on a cuff button', '소매 단추를 쥔 손가락'],
  ];
  const PLACE = [
    [['복도'], 'long manor corridor', '긴 저택 복도'], [['저택'], 'Victorian manor', '빅토리아풍 저택'], [['정원'], 'manor garden', '저택 정원'],
    [['숲', '풀밭'], 'forest with dappled light through leaves', '나뭇잎 사이로 빛이 드는 숲'], [['교실'], 'classroom', '교실'], [['부엌'], 'kitchen', '부엌'],
    [['계단'], 'staircase', '계단'], [['창가', '창밖', '창문'], 'by the window', '창가'], [['무대', '극장'], 'theatre stage', '극장 무대'],
    [['거리', '골목'], 'street', '거리'], [['카페'], 'cafe', '카페'], [['방', '침실'], 'bedroom interior', '방 안'], [['연회', '만찬'], 'ballroom banquet', '연회장'],
  ];
  const LIGHT = [
    [['밤', '촛불', '달빛', '자정'], 'night, warm candlelight, deep soft shadows', '밤, 따뜻한 촛불 빛, 깊고 부드러운 그림자'],
    [['노을', '저녁', '석양'], 'sunset, golden hour glow', '노을, 금빛 저녁 햇살'],
    [['아침', '햇살', '햇빛'], 'soft morning sunlight', '부드러운 아침 햇살'],
    [['비가 내', '비가 오', '비 오', '빗줄기', '빗속'], 'rainy, damp air, cool tones', '비 오는 축축한 공기, 차가운 톤'],
    [['눈 내', '눈이 내', '겨울'], 'snowy winter light', '눈 내리는 겨울 빛'],
  ];
  const MOOD = { 긴장: ['hard directional light, strong shadows', '강한 방향광, 짙은 그림자'], 설렘: ['soft glow, gentle bloom', '은은한 빛 번짐'], 쓸쓸: ['muted desaturated tones', '채도를 낮춘 가라앉은 톤'], 분노: ['high contrast, harsh light', '높은 대비, 거친 빛'], 놀람: ['sharp contrast on the face', '얼굴에 선명한 명암'] };
  const NEG = ['text', 'letters', 'speech bubble', 'watermark', 'signature', 'logo', 'extra fingers', 'deformed hands', 'photorealistic', '3d render', 'blurry face'];
  const NEG_KO = '글자·말풍선·워터마크·서명, 손가락 왜곡, 실사풍·3D 렌더 느낌';

  // 연출 상세용 표
  const CAM_H = { 아이레벨: '카메라는 인물 눈높이(바닥에서 약 160cm), 수평', 하이앵글: '카메라는 인물 머리 위 약 1m에서 30~45° 내려다봄', 로우앵글: '카메라는 인물 허리~무릎 높이에서 20~35° 올려다봄', 탑뷰: '카메라는 바로 위에서 수직으로 내려다봄' };
  const DOF = { 설정: '팬 포커스, 앞부터 끝까지 선명', 전경: '깊은 심도, 배경도 읽힘', 전신: '중간 심도, 배경은 살짝 흐림', 중경: '인물에 초점, 배경은 부드럽게 흐림', 클로즈업: '눈에 초점, 배경은 크게 흐림(보케)', 디테일: '피사체 한 점에만 초점, 나머지는 거의 형태만', '효과 배경': '배경은 단색·패턴·집중선으로 추상화' };
  const LAYER = { 설정: '앞: 화면 가장자리의 기둥·문틀·커튼 같은 실루엣 / 중간: 인물(있다면 작게) / 뒤: 공간의 끝과 소실점', 전경: '앞: 흐린 소품 하나로 깊이 / 중간: 인물 전신 / 뒤: 장소를 알 수 있는 배경', 전신: '중간: 인물 전신이 중심 / 뒤: 바닥과 벽이 이어져 공간감', 중경: '중간: 허리 위 인물 / 뒤: 흐린 배경 소품 1~2개', 클로즈업: '얼굴이 화면 대부분, 배경은 색과 빛만', 디테일: '피사체가 화면을 채움, 주변은 흐린 색면', '효과 배경': '인물 상반신 + 감정을 드러내는 추상 배경(부드러운 빛 번짐·색면·옅은 꽃잎 정도). 하트·별 같은 기호나 구체적인 상징물은 그리지 않음, 앞뒤 컷과 같은 색조 유지' };
  const HEAD = { 클로즈업: '정수리는 살짝 잘려도 됨, 턱 아래 여유 조금', 중경: '머리 위 여백은 화면 높이의 1/10 정도', 전신: '머리 위와 발 아래 모두 여백, 발끝이 잘리지 않게', 전경: '인물은 화면 높이의 1/3 이하', 설정: '인물은 화면 높이의 1/6 이하이거나 없음', 디테일: '피사체가 화면의 60% 이상', '효과 배경': '가슴 위로, 머리 위 여백 조금' };
  const BODY = {
    놀람: '어깨가 순간 들리고 몸이 살짝 뒤로 젖혀짐, 손끝이 굳음', 분노: '어깨에 힘이 들어가고 주먹을 쥠, 몸이 앞으로 기울어짐', 긴장: '어깨가 굳고 숨을 참는 듯한 자세, 손을 몸 가까이 붙임',
    설렘: '어깨가 살짝 움츠러들고 손을 가슴께에 모음, 시선을 피함', 당황: '한 손이 허공에서 멈추거나 뒷머리로 감, 몸이 반쯤 돌아섬', 쓸쓸: '어깨가 처지고 고개가 아래로, 팔은 힘없이 내려감',
    결의: '등을 곧게 펴고 턱을 당김, 손에 힘이 들어감', 다정: '어깨의 힘이 풀리고 고개를 상대 쪽으로 살짝 기울임', 기쁨: '몸이 열리고 가벼움, 손짓이 커짐', 의아: '고개를 한쪽으로 기울이고 몸은 멈춤',
    냉담: '팔짱 또는 정지된 자세, 상대 쪽으로 몸을 돌리지 않음', 회상: '움직임 없이 멈춤, 시선이 허공', 개그: '과장된 몸짓', 평온: '힘을 뺀 자연스러운 자세' };
  const ROLE = { E: ['설정', '독자에게 장소와 분위기를 알려 주는 컷. 인물보다 공간이 먼저 읽히게'], I: ['도입', '사건이 시작되는 컷. 인물이 무엇을 하는지 분명하게'], Pr: ['고조', '정점을 향해 긴장을 쌓는 컷. 다음 컷을 기대하게 시선과 동작을 열어 둠'], P: ['정점', '이 묶음에서 가장 강한 순간. 화면에서 가장 크고 선명한 대비, 시선이 한 점에 모이게'], R: ['여운', '정점이 지나간 뒤 감정을 정리하는 컷. 움직임을 줄이고 여백을 넉넉히'] };
  const TRANS = { '동작 전환': '앞 컷과 같은 인물·장소, 동작만 한 단계 진행. 조명과 의상, 소품 위치를 그대로 이어감', '주체 전환': '앞 컷과 다른 인물로 시점이 넘어옴. 두 인물을 잇는 선을 넘지 않게(앞 컷에서 오른쪽에 있던 인물은 계속 오른쪽)', '순간 전환': '앞 컷 직후의 찰나. 구도·조명을 거의 그대로 두고 표정과 작은 움직임만 바뀜', '장면 전환': '새 장소나 시간. 첫눈에 바뀐 것이 보이게 공간을 확실히 세움', '양상 전환': '같은 시간의 다른 곳·사물을 보여 주는 분위기 컷' };
  const GAP_NOTE = { 붙임: '다음 컷과 바로 붙어 읽히니 동작이 끝나지 않은 순간에서 멈춤', 보통: '', 쉼: '다음 컷 전에 짧게 숨을 고르니 이 컷 안에서 감정이 한 번 맺히게', '큰 쉼': '뒤에 큰 여백이 오니 이 컷이 한 장면을 마무리하는 그림이 되게' };
  const STD = [[1, 1], [4, 5], [3, 4], [2, 3], [9, 16], [1, 2], [5, 4], [4, 3], [3, 2], [16, 9], [2, 1]];
  const gapTag = g => g < 0.13 ? '붙임' : g < 0.33 ? '보통' : g < 0.65 ? '쉼' : '큰 쉼';
  function spec(h) {
    const r = h; const W = 1024, H = Math.round(W * r / 8) * 8;
    const near = STD.slice().sort((a, b) => Math.abs(Math.log(a[1] / a[0] / r)) - Math.abs(Math.log(b[1] / b[0] / r)))[0];
    const exact = Math.abs(near[1] / near[0] - r) < 0.03;
    const shape = r > 1.15 ? '세로형' : r < 0.87 ? '가로형' : '정사각형에 가까움';
    return { r, W, H, near: `${near[0]}:${near[1]}`, exact, shape, ratio: `가로 100 : 세로 ${Math.round(r * 100)}` };
  }
  const has = (s, ws) => ws.some(w => s.includes(w));
  const jo = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b); };
  const pick = (s, table) => table.filter(([ws]) => has(s, ws));
  const dot = s => String(s || '').trim().replace(/[.。]+$/, '');
  const textOf = p => [p.act, p.caption, ...(p.dialogs || []).map(d => d.note)].filter(Boolean).join(' ');

  function setting(panels) {
    const all = panels.map(p => [p.role === '설정' ? p.act : '', p.caption].join(' ')).join(' ') + ' ' + panels.map(textOf).join(' ');
    return { place: pick(all, PLACE)[0] || null, light: pick(all, LIGHT)[0] || null };
  }
  function others(p, chars) { return chars.filter(c => c.name && c.name !== p.who && (p.act || '').includes(c.name)); }

  function cut(p, i, panels, ctx) {
    const { chars = [], style = '', palette = [], total = panels.length, an = [] } = ctx;
    const S = SHOT[p.shot] || SHOT['중경'], A = ANG[p.ang] || ANG['아이레벨'];
    const own = setting([p]), base = ctx.setting || setting(panels);
    const place = own.place || base.place, light = own.light || base.light;
    // ctx.nai: 같은 컷의 NAI.cut 결과(절 해석·보이는 인물·소품·장소·DB 근거) — 있으면 그것을 따름(NovelAI 프롬프트와 같은 사실로)
    const O = ctx.nai || null, noHuman = O && ['scenery', 'object', 'effect'].includes(O.mode);
    const vis = O ? (O.layerCast || []).map(x => chars.find(c => c.name === x.name) || { name: x.name }) : null;
    let main = chars.find(c => c.name === p.who), oth = others(p, chars);
    if (O) { main = noHuman ? null : vis.find(c => c.name === (O.who || p.who)) || vis[0] || null; oth = noHuman ? [] : vis.filter(c => c !== main); }
    const actOf = n => (O && O.read && O.read.per && O.read.per[n]) || [];
    const sheet = new Set(ctx.refNames || []);
    const expr = EXPR[p.emo] || EXPR['평온'];
    const k = p.i >= 3 ? ['intense', '아주 강하게'] : p.i === 2 ? ['clear', '분명하게'] : ['subtle', '은은하게'];
    const poses = pick(textOf(p), POSE);
    const side = i % 2 ? 'left' : 'right';
    const mood = MOOD[p.emo];
    const peak = p.vng === 'P';
    const dlg = (p.dialogs || []).filter(d => d.text);
    const prev = panels[i - 1], next = panels[i + 1];
    const chunk = an[p.chunk];
    const ar = `${100}:${Math.round(p.h * 100)}`;
    // 캐릭터 시트를 함께 올리면 외형은 짧은 식별 문구만(시트와 글이 어긋나지 않게)
    const look = c => { const t = c && c.look ? c.look.trim().replace(/\s+/g, ' ') : ''; return sheet.has(c && c.name) ? t.split(/[,.·\n]/).map(x => x.trim()).filter(Boolean).slice(0, 2).join(', ') : t; };
    // 영어 (mj / sd)
    const castEn = main ? [`${main.name}${look(main) ? ` (${look(main)})` : ''}${oth.length ? `, placed on the ${side} third` : ''}`, ...oth.map(c => `${c.name}${look(c) ? ` (${look(c)})` : ''} on the ${side === 'left' ? 'right' : 'left'}`)].join('; ') : (oth.length ? oth.map(c => `${c.name}${look(c) ? ` (${look(c)})` : ''}`).join('; ') : '');
    const en = [
      `${S.en}, ${A.en}, ${S.frame}, ${S.lens}`,
      castEn && `characters: ${castEn}`,
      main && `${k[0]} ${p.emo !== '평온' ? 'emotion' : 'mood'}: ${expr[0]}`,
      poses.length && `pose: ${poses.map(x => x[1]).join(', ')}`,
      (place || light) && `setting: ${[place && place[1], light && light[1]].filter(Boolean).join(', ')}`,
      mood && `lighting mood: ${mood[0]}`,
      peak && 'dramatic climax panel, strongest composition of the sequence',
      dlg.length && 'leave clean empty space near the top for a speech bubble',
      style && style.trim(),
      palette.length && `color palette ${palette.slice(0, 5).join(' ')}`,
    ].filter(Boolean);
    const mjFlags = [`--ar ${ar}`, `--no ${NEG.slice(0, 7).join(', ')}`, main && ctx.charRef?.(main.name) ? `--oref <${main.name} 캐릭터 이미지 링크> --ow 100` : '', ctx.sceneRef ? `--sref <장면 이미지 링크>` : ''].filter(Boolean).join(' ');
    const mj = `${en.join('. ')}. story beat (Korean): ${dot(p.act)}. ${mjFlags}`;
    const propEn = (ctx.props?.(p) || []).map(x => x.tags).filter(Boolean);
    if (propEn.length) en.splice(2, 0, `props (keep identical in every panel): ${propEn.join('; ')}`);
    const sdPos = [`korean webtoon panel`, ...propEn, S.en, A.en, S.frame, castEn && castEn, main && expr[0], ...poses.map(x => x[1]), place && place[1], light && light[1], mood && mood[0], peak && 'dramatic composition', dlg.length && 'empty space at top', style.trim()].filter(Boolean).join(', ');
    const sd = { positive: sdPos, negative: NEG.join(', '), size: `${1024} x ${Math.round(1024 * p.h / 8) * 8}` };
    // 한국어 자연어: 출력 규격 → 연출 의도 → 카메라 → 구도 → 인물·연기 → 동작 → 장소·조명 → 이어짐 → 비울 자리 → 금지
    const sp = spec(p.h), R = ROLE[p.vng] || ROLE.I, gt = gapTag(p.gap ?? 0.3);
    const sideKo = side === 'left' ? '왼쪽' : '오른쪽', oppKo = side === 'left' ? '오른쪽' : '왼쪽';
    const handPose = poses.some(x => /손|끌어안|어깨|총/.test(x[2])) || (main && actOf(main.name).length > 0);
    const cast = [main, ...oth].filter(Boolean), insert = p.shot === '디테일' || (O && O.mode === 'detail'), tiny = p.shot === '설정' || p.shot === '전경' || (O && O.mode === 'distant');
    const refs = cast.filter(c => sheet.has(c.name)), propsOn = O ? (ctx.props?.(p) || []).filter(x => (O.props || []).some(v => v.name === x.name)) : (ctx.props?.(p) || []);
    const dropped = (O && O.read && O.read.dropped) || [], together = (O && O.read && O.read.spatial) || [], crowd = (O && O.read && O.read.crowd) || [];
    const HANDF = { 설렘: '손끝이 조심스럽고 망설이는 힘', 긴장: '손가락 마디가 하얗게 설 만큼 꽉 쥠', 분노: '거칠게 움켜쥠, 힘줄이 드러남', 다정: '감싸듯 부드럽게', 놀람: '갑자기 멈춘 손, 손가락이 펴짐', 결의: '단단하고 흔들림 없이' };
    const touch = O && (together.length || cast.some(c => actOf(c.name).some(t => /hug|embrac|holding hands|kiss|carrying|grabbing|headpat|lap pillow|leaning on|being held|piggyback/.test(t))));
    const faceDir = touch ? `두 사람의 위치 관계(${together.join(', ') || '몸이 닿는 동작'})에 맞게 몸 방향을 정함` : oth.length ? `${jo(main.name, '은', '는')} 화면 ${oppKo}을 향해 몸을 3/4쯤 돌림` : main ? `${main.name}의 시선은 화면 ${oppKo} 여백을 향함(시선 방향에 공간을 남김)` : '';
    const dist = touch ? '두 사람은 몸이 닿아 있음(간격 없음)' : oth.length ? (poses.some(x => /손목|끌어안|어깨|손을 내/.test(x[2])) ? '두 사람은 팔 하나 거리, 손이 닿는 거리' : p.emo === '냉담' || p.emo === '분노' ? '두 사람 사이에 한 걸음 이상 거리' : '두 사람은 한 걸음 거리') : '';
    const bub = dlg.length ? `${dlg.length > 1 ? '말풍선 ' + dlg.length + '개' : '말풍선 1개'} 자리: 화면 위쪽 ${main && dlg[0].who === main.name ? sideKo : oppKo} 구석, 화면 넓이의 약 ${dlg.length > 1 ? 30 : 20}%를 비움(인물 머리와 겹치지 않게)` : '';
    const cap = p.caption ? `글상자 자리: 왼쪽 위 모서리, 가로 1/3 · 세로 1/8 정도 비움` : '';
    const sfxLine = (p.sfx || []).length ? `효과음 ${p.sfx.map(x => '"' + x + '"').join(', ')}은 글자로 쓰지 말고 ${p.sfx.length ? '동작이 닿거나 멈추는 바로 그 순간을 포착해 표현(작은 충격선이나 옷자락의 흔들림 정도)' : ''}` : '';
    const lines = [
      `[컷 ${i + 1} / ${total}] 웹툰 한 컷 이미지를 그려줘.`,
      '§',
      `■ 출력 규격`,
      `- 비율: ${sp.ratio} (${sp.shape}, 세로/가로 ${sp.r.toFixed(2)})`,
      `- 크기: ${sp.W} × ${sp.H}px 권장${sp.exact ? ` · 표준 비율 ${sp.near}로 그대로 생성 가능` : ` · 이 비율을 고를 수 없으면 가장 가까운 ${sp.near}로 만들고 위아래(또는 좌우)를 잘라 ${sp.ratio}에 맞춤`}`,
      `- 한 장에 이 컷 하나만. 칸 테두리·여러 칸 나눔·여백 프레임 없이 그림이 화면 끝까지 차게`,
      style && '§', style && `■ 화풍`, style && `- ${style.trim()}`, palette.length ? `- 주요 색: ${palette.slice(0, 5).join(' ')} 계열` : '',
      ...(refs.length ? ['§', `■ 참고 이미지 (함께 올린 캐릭터 시트 ${refs.length}장)`,
        ...refs.map((c, n) => `- ${n + 1}번 이미지 = ${c.name}: 얼굴·머리 모양·의상·색·화풍을 이 시트와 똑같이(포즈·배경은 따르지 말 것)`),
        cast.length > refs.length ? `- 시트가 없는 인물(${cast.filter(c => !sheet.has(c.name)).map(c => c.name).join('·')})은 아래 외형 설명대로, 같은 화풍으로` : '',
        `- 그림 전체 화풍(선·채색·명암)도 캐릭터 시트와 같게`] : []),
      ...(ctx.sheet ? ['§', `■ 참고 이미지 (함께 올린 참고 시트 한 장)`,
        ...cast.map(c => ctx.sheet.charImg.includes(c.name) ? `- ${c.name}: 시트 A칸 '${c.name}' 그림과 얼굴·머리 모양·의상·색을 똑같이` : `- ${c.name}: 시트 A칸 '${c.name}' 외형 설명대로`),
        ctx.sheet.scene ? `- 배경·색: 시트 B칸 장면 이미지의 분위기·빛·색감을 따름` : `- 색·화풍: 시트 B칸의 화풍 설명을 따름`,
        `- 구도: 시트 C칸 '컷 ${i + 1}' 러프의 인물 위치·크기·카메라 방향만 따름. 러프의 선·회색 면·번호·말풍선 표시는 그리지 말 것`,
        ctx.sheet.refs[i] ? `- 시트 C칸 '컷 ${i + 1}' 오른쪽 아래 작은 그림('구도 참고')은 화면 분할과 시선 흐름만 참고, 인물·그림체는 따르지 말 것` : '',
      ] : []),
      '§',
      `■ 연출 의도`,
      `- 이 컷의 역할: ${R[0]} — ${R[1]}`,
      chunk ? `- 묶음 흐름: ${chunk.narr}, 목적은 ${chunk.goal}` : '',
      ctx.dbRef && ctx.dbRef.text ? `- 참고 구도: 상용 웹툰의 실제 컷 「${ctx.dbRef.text}」${ctx.dbRef.shot ? ` (${[ctx.dbRef.shot, ctx.dbRef.angle].filter(Boolean).join('·')})` : ''} — 화면 구성(무엇을 크게, 어디에 두고, 무엇을 자르는지)만 참고하고 내용·인물은 가져오지 말 것` : '',
      ctx.sceneMood ? `- 씬 전체 분위기: ${ctx.sceneMood} — 이 씬의 모든 컷이 같은 색감·조명 톤` : '',
      (p.why && p.why.shot && p.why.shot.length > 1) ? `- 이 샷을 고른 이유: ${p.why.shot.slice(1).join(', ')}` : '',
      '§',
      `■ 카메라`,
      `- 샷: ${p.shot} — ${S.ko}`,
      `- 앵글: ${A.ko}. ${CAM_H[p.ang] || CAM_H['아이레벨']}`,
      `- 렌즈·심도: ${S.lens}, ${DOF[p.shot] || DOF['중경']}`,
      '§',
      `■ 구도`,
      noHuman ? `- 사람은 그리지 않음: ${O.mode === 'object' ? '소품 하나가 주인공(클로즈업, 재질·표면·빛)' : O.mode === 'effect' ? '인물·실제 장소 없이 색·빛·선의 방향과 질감만' : '공간이 주인공(깊이·전경과 후경·건축·빛)'}` : insert ? `- 피사체 배치: ${poses[0] ? `'${poses[0][2]}' 부분(손과 손목)` : '동작의 핵심 부위'}을 화면 중앙에서 살짝 ${sideKo}, 3분할 교차점 근처. 얼굴은 화면에 나오지 않음` : cast.length ? `- 주인공 배치: ${jo(main ? main.name : cast[0].name, '을', '를')} 화면 ${sideKo} 1/3 세로선 위에, ${tiny ? '공간 속에 작게' : '얼굴(눈)은 위쪽 1/3 가로선 근처'}` : `- 인물 없이 공간이 주인공. 소실점은 화면 중앙보다 살짝 ${oppKo}`,
      `- 인물 크기·여백: ${HEAD[p.shot] || HEAD['중경']}`,
      `- 깊이: ${LAYER[p.shot] || LAYER['중경']}`,
      peak ? `- 정점 컷: 화면에서 가장 밝은 곳과 가장 어두운 곳이 ${main && !insert ? main.name + '의 얼굴' : '핵심 피사체'} 바로 옆에서 만나게, 다른 요소는 줄임` : '',
      `- 독자의 시선이 처음 닿을 곳: ${p.shot === '디테일' ? (poses[0] ? `'${poses[0][2]}'의 접점` : '핵심 소품') : main ? `${main.name}의 ${p.shot === '클로즈업' || p.shot === '효과 배경' ? '눈' : '얼굴과 손'}` : '공간의 가장 밝은 지점'}`,
      cast.length ? '§' : '', cast.length ? `■ 인물과 연기` : '',
      ...cast.map((c, n) => `- ${c.name}${sheet.has(c.name) ? ` (${refs.indexOf(c) + 1}번 시트)` : ''}${look(c) ? ` — 외형: ${look(c)}` : ''}${insert ? ' (화면에는 손·소매·옷자락만 보이니 장갑·소매·옷감으로 누구인지 알아보게)' : cast.length > 1 ? ` · 위치: 화면 ${n === 0 ? sideKo : oppKo}` : ''}${actOf(c.name).length ? ` · 하는 동작: ${actOf(c.name).join(', ')}` : ''}`),
      faceDir && !insert ? `- 방향·시선: ${faceDir}${oth.length ? `, ${jo(oth.map(c => c.name).join('·'), '은', '는')} ${main.name} 쪽을 봄` : ''}` : '',
      dist && !insert ? `- 거리: ${dist}` : '',
      insert && main ? `- 손의 연기(${p.emo}, ${k[1]}): ${HANDF[p.emo] || '감정이 손의 힘과 각도에 드러나게'}` : '',
      main && !insert ? `- 표정(${p.emo}, ${k[1]})${tiny ? ' — 작게 보이니 표정보다 자세와 실루엣으로' : ''}: ${expr[1]}${dlg[0]?.note ? ` — 연기 지시 "${dlg[0].note}"를 표정과 자세에 담음` : ''}` : '',
      main && !insert ? `- 몸: ${main && actOf(main.name).length ? `동작(${actOf(main.name).join(', ')})에 맞게, ${p.emo} 느낌은 고개·어깨 각도와 시선으로` : handPose ? (BODY[p.emo] || BODY['평온']).split(',')[0] + ', 손은 동작에 씀' : (BODY[p.emo] || BODY['평온'])}` : '',
      ...(propsOn.length || (O && (O.propsOff || []).length) ? ['§', `■ 소품 (모양 고정 — 모든 컷에서 같은 모양·색·재질·크기)`, ...propsOn.map(x => `- ${x.name}${x.look ? `: ${x.look}` : ''}${x.tags ? ` (${x.tags})` : ''}${x.img ? ' — 함께 올린 소품 이미지와 똑같이' : ''}`),
        ...((O && O.propsOff) || []).map(x => `- ${x.name}: 이 컷 화면에는 그리지 말 것${(x.emit || []).length ? ` — 거기서 나온 ${x.emit.join(', ')}만 보이게` : ''}`)] : []),
      O && O.aiScene ? '§' : '', O && O.aiScene ? `■ 장면 (원문·연출 근거로 정리)` : '', O && O.aiScene ? `- ${O.aiScene}` : '',
      '§',
      `■ 동작`,
      `- ${dot(p.act)}`,
      poses.length && !O ? `- 자세: ${poses.map(x => x[2]).join(', ')}` : '',
      together.length ? `- 두 사람의 위치 관계: ${together.join(', ')}` : '',
      crowd.length ? `- 배경 인물: ${crowd.join(', ')}` : '',
      ...dropped.map(d => `- 그리지 말 것: ${d.who ? d.who + '의 ' : ''}${d.tags.join(', ')} — 원문에서 ${({ neg: '하지 않은', try: '하려다 만', cond: '가정한', con: '앞 절의' })[d.why] || '하지 않은'} 동작`),
      dlg.length ? `- 대사 맥락(그리지 말 것): ${dlg.map(d => `${d.who ? d.who + ' ' : ''}"${d.text}"`).join(' / ')} — 이 말을 하는 입 모양과 표정으로` : '',
      sfxLine ? `- ${sfxLine}` : '',
      (place || light || mood || (O && (O.place || []).length)) ? '§' : '', (place || light || mood || (O && (O.place || []).length)) ? `■ 장소·조명` : '',
      place ? `- 장소: ${place[2]}` : O && (O.place || []).length ? `- 장소: ${O.place.join(', ')}` : '',
      light ? `- 빛: ${light[2]}. 주광은 화면 ${oppKo} 위에서 비스듬히 들어와 ${insert ? '손과 소매의 윤곽에 밝은 테두리를 만듦' : main && !tiny ? main.name + '의 얼굴 ' + oppKo + ' 절반을 밝힘' : '공간에 긴 그림자를 만듦'}` : '',
      mood ? `- 분위기: ${mood[1]}` : '',
      '§',
      `■ 앞뒤 컷과의 이어짐`,
      prev ? `- 앞 컷: ${dot(prev.act)}${p.trans ? ` → ${p.trans}: ${TRANS[p.trans] || ''}` : ''}` : '- 씬의 첫 컷: 장소와 시간을 처음 세움',
      next ? `- 다음 컷: ${dot(next.act)}` : '- 씬의 마지막 컷',
      GAP_NOTE[gt] ? `- 뒤 간격 '${gt}': ${GAP_NOTE[gt]}` : '',
      `- 모든 컷에서 인물 외형·의상·머리 모양·색을 똑같이 유지 (의상 색을 바꾸지 말 것)`,
      `- 씬 전체가 한 화가의 연속된 그림처럼: 앞 컷과 같은 화풍·채도·조명 색온도, 같은 장소면 같은 벽·바닥·소품`,
      (bub || cap) ? '§' : '', (bub || cap) ? `■ 비워 둘 자리 (글자는 넣지 말 것)` : '',
      bub ? `- ${bub}` : '', cap ? `- ${cap}` : '',
      '§',
      `■ 하지 말 것`,
      `- ${NEG_KO}, 칸 테두리, 여러 칸 분할, 화면 안의 어떤 글자도`,
    ].filter(Boolean).map(x => x === '§' ? '' : x);
    const clean = lines.filter((x, n, a) => !(x === '' && (a[n - 1] === '' || n === 0)));
    return { mj, sd, natural: clean.join('\n').trim(), ar, spec: sp };
  }

  function brief(scene, panels, ctx) {
    const { chars = [], style = '', palette = [] } = ctx; const st = ctx.setting || setting(panels);
    const who = [...new Set(panels.map(p => p.who).filter(Boolean))];
    return [
      `# ${scene.title || '제목 없는 씬'} — 씬 브리프 (${panels.length}컷)`,
      style && `화풍: ${style.trim()}`,
      (st.place || st.light) && `장소·시간: ${[st.place && st.place[2], st.light && st.light[2]].filter(Boolean).join(', ')}`,
      palette.length && `색: ${palette.slice(0, 5).join(' ')}`,
      who.length && `등장인물:\n${who.map(n => { const c = chars.find(x => x.name === n); return `- ${n}${c && c.look ? `: ${c.look.trim()}` : ''}`; }).join('\n')}`,
      `컷 흐름 (컷마다 비율이 다름, 각 컷 지시의 출력 규격을 따를 것):\n${panels.map((p, i) => { const sp = spec(p.h); return `${i + 1}. [${sp.ratio} · ${sp.W}×${sp.H}px] ${p.shot}·${p.ang} — ${p.who ? p.who + ', ' : ''}${p.act}${p.said ? ` "${p.said}"` : ''}${p.vng === 'P' ? ' (정점)' : ''}${i < panels.length - 1 ? ` ↓ ${gapTag(p.gap ?? 0.3)}` : ''}`; }).join('\n')}`,
      '모든 컷에서 인물 외형·의상·색을 똑같이 유지하고, 글자와 말풍선은 넣지 않는다.',
    ].filter(Boolean).join('\n\n');
  }

  Object.assign(P, { cut, brief, setting, spec, gapTag, SHOT, ANG, EXPR, NEG });
})(typeof module !== 'undefined' ? module.exports : (window.RoughPrompt = {}));
