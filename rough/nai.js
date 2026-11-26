/* NovelAI Diffusion V4.5 Full용 출력: 엔진이 정한 컷 값을 Danbooru 태그로 바꾸고,
   V4.5 화면 칸(기본 프롬프트 / 캐릭터 프롬프트+위치 / 해상도 / img2img / 레퍼런스)에 맞춰 나눈다.
   브라우저(window.RoughNAI)와 Node(require) 모두에서 쓴다. */
(function (N) {
  'use strict';
  const SHOT = {
    설정: ['very wide shot'], 전경: ['wide shot'], 전신: ['full body'], 중경: ['upper body'],
    클로즈업: ['portrait', 'close-up', 'face focus'], 디테일: ['close-up'], '효과 배경': ['abstract background'],
    // 연출 DB에 있는 샷 값(화면 인서트 52컷, SD 27컷)
    '화면 인서트': ['close-up', 'screen'], SD: ['chibi', 'super deformed', 'simple background'],
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
    [['걸어', '걷', '다가온', '다가간'], ['walking']], [['돌아보', '돌아봄', '돌아본', '뒤돌'], ['looking back', 'looking over shoulder']],
    [['손목', '손을 잡', '붙잡'], ['grabbing another\'s wrist', 'holding hands']], [['안기', '안아', '껴안', '포옹'], ['hug']],
    [['어깨에 손', '어깨에 얹'], ['hand on another\'s shoulder']], [['숙이', '숙임', '숙인', '고개를 떨'], ['head down']], [['올려다', '고개를 들'], ['looking up']],
    [['손을 뻗', '내민', '건네'], ['reaching out']], [['입을 가리', '입을 감싸'], ['covering mouth']], [['웃'], ['smile']], [['울며', '울고', '울었', '운다', '눈물'], ['tears']],
    [['붉어', '빨개'], ['blush']], [['앉'], ['sitting']], [['서 있', '선 채'], ['standing']], [['코피'], ['nosebleed']], [['총'], ['holding gun', 'rifle']],
    [['단추', '소매'], ['sleeve', 'button']], [['촛불을 들', '촛대를 들'], ['holding candle']], [['계단을 오'], ['walking up stairs']],
  ];
  const PLACE = [
    [['복도'], ['indoors', 'hallway']], [['저택'], ['mansion']], [['정원'], ['outdoors', 'garden']], [['숲', '풀밭'], ['outdoors', 'forest']],
    [['교실'], ['indoors', 'classroom']], [['부엌'], ['indoors', 'kitchen']], [['계단'], ['stairs']], [['창가', '창밖', '창문'], ['window']], [['무대', '극장'], ['stage', 'theater']],
    [['거리'], ['outdoors', 'street']], [['골목'], ['outdoors', 'alley']], [['카페'], ['indoors', 'cafe']], [['침실'], ['indoors', 'bedroom']], [['연회', '만찬'], ['indoors', 'ballroom', 'chandelier']],
  ];
  const TIME = [
    [['밤', '자정'], ['night']], [['노을', '저녁', '석양'], ['sunset']], [['아침'], ['morning']], [['새벽'], ['dawn']],
  ];
  const LIGHT = [
    [['촛불', '촛대'], ['candlelight']], [['달빛'], ['moonlight']], [['햇살', '햇빛'], ['sunlight']],
    [['역광'], ['backlighting']], [['노을'], ['orange sky']], [['안개'], ['fog']],
    [['비가 그친', '비 갠'], ['after rain', 'wet ground']], [['비가 내', '비가 오', '비 오', '빗줄기', '빗속'], ['rain']],
    [['눈 내', '눈이 내'], ['snow']],
  ];
  const OBJECT = [
    [['조마경', '거울'], ['mirror']], [['명경패', '나무 패'], ['wooden plaque']],
    [['열쇠'], ['key']], [['반지'], ['ring']], [['편지', '쪽지'], ['letter']], [['탁자', '테이블'], ['table']],
    [['휴대전화', '휴대폰', '핸드폰', '스마트폰'], ['smartphone']], [['모니터'], ['computer monitor']],
    [['촛대', '촛불'], ['candle']], [['찻잔', '머그컵'], ['cup']], [['창문', '창틀'], ['window']],
    [['문고리', '손잡이'], ['doorknob']], [['문틈', '문짝'], ['door']], [['간판'], ['signboard']],
    [['책상'], ['desk']], [['책장'], ['bookshelf']], [['책 위', '책이', '책을'], ['book']],
    [['자물쇠'], ['padlock']], [['화병', '꽃병'], ['vase']], [['사진'], ['photograph']],
    [['손목시계', '벽시계', '회중시계'], ['clock']], [['유리잔'], ['drinking glass']],
  ];
  const ANIMALS = [
    [['여우'], ['fox']], [['고양이'], ['cat']], [['까마귀'], ['crow']], [['나비'], ['butterfly']],
  ];
  const SURFACE = [
    [['청동'], ['bronze']], [['황동'], ['brass']], [['스테인드글라스'], ['stained glass']],
    [['물방울'], ['water droplets']], [['물웅덩이', '고인 물'], ['puddle']],
    [['실금'], ['hairline crack']], [['금이 간', '갈라진'], ['cracked surface']], [['아치형'], ['arch']],
  ];
  const FX = [
    [['집중선', '방사형'], ['radial lines']], [['속도선'], ['speed lines']],
    [['섬광', '번쩍'], ['flash of light']], [['불꽃'], ['sparks']], [['먹 번짐', '잉크 번짐'], ['ink bloom']],
    [['그라데이션'], ['gradient background']],
  ];
  const MOOD = { 긴장: ['dramatic lighting', 'high contrast'], 설렘: ['soft lighting', 'bloom'], 쓸쓸: ['muted colors'], 분노: ['high contrast', 'dramatic lighting'], 놀람: ['dramatic lighting'],
    회상: ['soft focus', 'light particles', 'vignetting'], 다정: ['warm lighting'], 냉담: ['cold colors'], 개그: ['simple background'] };
  // 연출 DB 덩어리 색 → 빛·색 태그 (nai-stats.js가 감정별로 고른 색)
  const TONE = { '어두운 톤': ['dark', 'low key'], 검정: ['dark background'], '밝은 톤': ['bright', 'high key'], '중간 톤·회색': ['muted colors'],
    '중간 컬러·주황': ['warm lighting', 'orange theme'], '중간 컬러·붉은색': ['red theme'], '중간 컬러·분홍': ['pink theme'], '중간 컬러·파랑': ['blue theme'],
    '중간 컬러·남색': ['blue theme', 'night'], '중간 컬러·보라': ['purple theme'], '중간 컬러·초록': ['green theme'], '중간 컬러·노랑': ['yellow theme'], '중간 컬러·청록': ['aqua theme'],
    '강조색·붉은색': ['red theme'], '강조색·분홍': ['pink theme'], '강조색·파랑': ['blue theme'], '강조색·주황': ['orange theme'], '강조색·노랑': ['yellow theme'], '강조색·초록': ['green theme'] };
  const FXBG = { '어두운 톤': 'dark background', 검정: 'black background', '밝은 톤': 'white background', '중간 컬러·분홍': 'pink background', '강조색·분홍': 'pink background',
    '중간 컬러·파랑': 'blue background', '강조색·파랑': 'blue background', '중간 컬러·주황': 'orange background', '중간 컬러·붉은색': 'red background', '강조색·붉은색': 'red background',
    '중간 컬러·보라': 'purple background', '중간 컬러·노랑': 'yellow background', '중간 컬러·초록': 'green background', '중간 컬러·남색': 'blue background', '중간 컬러·청록': 'aqua background' };
  const STATS = () => (typeof window !== 'undefined' && window.RoughNAIStats) || N.STATS || null;
  // 감정 하나에 대한 DB 근거 태그와 설명
  function dbTone(emo, shot) {
    const st = STATS(), r = st && st.emo && st.emo[emo];
    if (!r) return { tags: [], note: '' };
    if (shot === '효과 배경' && r.fx && FXBG[r.fx]) return { tags: [FXBG[r.fx]], note: `DB 근거: ${emo} 효과 배경 ${r.fxN}컷 중 ${Math.round(r.fxShare * 100)}%가 ${r.fx}` };
    if (r.tone && TONE[r.tone]) return { tags: TONE[r.tone], note: `DB 근거: ${emo} 그림 컷 ${r.n}개 중 ${Math.round(r.share * 100)}%가 ${r.tone}` };
    return { tags: [], note: '' };
  }
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
  const actionOf = p => String(p.act || '').replace(/^(?:.+ )?대사$|^효과음 .*$/, '');
  function splitTags(text) {
    return (String(text || '').match(/\s*(?:-?\d+(?:\.\d+)?::.*?::|[^,\s][^,]*)/g) || []).map(t => t.trim());
  }
  function joinTags(items) {
    const seen = new Set();
    return items.filter(t => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase())).join(', ');
  }

  function lookTags(look) {
    const s = String(look || ''); const out = [];
    HAIRC.forEach(([ws, t]) => { if (has(s, ws)) out.push(t); });
    HAIRS.forEach(([ws, t]) => { if (has(s, ws)) out.push(t); });
    for (const m of s.matchAll(/(\S+?)\s?눈/g)) { const c = Object.keys(EYES).find(k => m[1].startsWith(k)); if (c) out.push(EYES[c]); }
    CLOTH.forEach(([ws, t]) => { const w = ws.find(x => s.includes(x)); if (!w) return; const m = s.match(new RegExp(`(\\S+)\\s${w}`)); const c = m && Object.keys(COLOR).find(k => m[1].startsWith(k)); out.push(c ? `${COLOR[c]} ${t}` : t); });
    return uniq(out);
  }
  const countTags = cast => [['male', 'boy'], ['female', 'girl'], ['other', 'other']].flatMap(([body, tag]) => {
    const n = cast.filter(c => c.body === body).length;
    return n ? [n + tag + (n > 1 ? 's' : '')] : [];
  });
  const FOCUS = {
    '배경 중심': 'scenery', '원경 인물': 'distant', '소품 중심': 'object',
    '신체 디테일': 'detail', '효과만': 'effect', '인물 중심': 'character',
  };
  const LABELS = {
    scenery: '배경', distant: '배경 · 원경 인물', object: '소품', detail: '신체 디테일', effect: '효과', character: '인물',
  };
  const EMPTY = /인물\s*(?:없이|없[는음다]|미등장|제외)|(?:사람|아무도)\s*(?:이\s*)?없|사람\s*없이|빈\s*(?:복도|방|거리|교실|골목|공간|저택)|텅\s*빈|\b(?:no humans|empty (?:hallway|room|street))\b/i;
  const OFFSCREEN = /화면\s*(?:밖|외)|컷\s*밖|장면\s*밖|목소리만|목소리가\s*(?:들린|들려)|\boff[- ]?screen\b/i;
  const DISTANT = /멀리(?:서|에)?|원경\s*(?:인물|실루엣)|작은\s*실루엣|멀어지는\s*뒷모습|\b(?:distant (?:figure|silhouette)|far away)\b/i;
  const PERSON = /인물|남자|여자|소년|소녀|사람|실루엣|뒷모습|고개를|돌아보|뒤돌|서 있|웃는|걸어|걷는|\b(?:person|woman|man|girl|boy|figure|silhouette)\b/i;
  const OBJECT_ONLY = /소품\s*(?:컷|인서트|만|에\s*초점)|표면만|정물|\b(?:object focus|still life)\b/i;
  const BODY = [
    [/(?:손목|손끝|손가락|주먹|손만|손[이가을의]|\b(?:hands?|fingers?)\b)/i, ['hands focus', 'head out of frame']],
    [/(?:발끝|발목|발만|발[이가을의]|구두|신발|\b(?:feet|foot|boots)\b)/i, ['feet focus', 'head out of frame']],
    [/(?:눈동자|동공|눈[이가을만]|\b(?:eyes?|pupil)\b)/i, ['eye focus']],
    [/(?:입술|입[이가을만]|\blips?\b)/i, ['lips']],
    [/(?:얼굴|턱|뺨|\bface\b)/i, ['face focus']],
  ];
  const escapeName = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function namesCharacter(text, c) {
    return [c.name, ...(c.aliases || [])].filter(Boolean).some(name => new RegExp(
      '(?:^|[^가-힣\\w])' + escapeName(name) + '(?:께서|에게|한테|이랑|으로|[은는이가도의을를와과께랑에로])?(?=[^가-힣\\w]|$)', 'i',
    ).test(text));
  }
  function focusOf(p, action, hasPerson, objects, localPlace, body) {
    const explicit = (p.dir?.fx || []).findLast(t => Object.hasOwn(FOCUS, t));
    if (explicit) return FOCUS[explicit];
    if (p.shot === '효과 배경' && (!hasPerson || EMPTY.test(action))) return 'effect';
    if (p.shot === '화면 인서트' || OBJECT_ONLY.test(action)) return 'object';
    if (body.length && (p.shot === '디테일' || /(?:손|발|눈|입술)만/.test(action)) && !EMPTY.test(action)) return 'detail';
    if (objects.length && (p.shot === '디테일' || (p.shot === '클로즈업' && !hasPerson))) return 'object';
    if (EMPTY.test(action)) return 'scenery';
    if (hasPerson) return p.shot === '설정' || DISTANT.test(action) ? 'distant' : 'character';
    if (tagsOf(action, FX).length && !localPlace.length && !objects.length) return 'effect';
    return objects.length && !localPlace.length ? 'object' : 'scenery';
  }
  const NO_HUMANS = new Set(['scenery', 'object', 'effect']);
  const COUNT_TAG = /^(?:\d+\s*(?:girls?|boys?|others?|people)|multiple (?:girls|boys|others|people)|solo)$/i;
  const SUBJECT_TAG = /^(?:portrait|(?:face|eye|hands?|feet) focus|(?:upper|lower|full) body|cowboy shot|looking at viewer|pov(?: hands)?|person|people|man|woman|character|(?:distant |small )?(?:figure|silhouette|human figure)|crowd|(?:\w+ )*(?:hair|eyes|face)|smile|open mouth|(?:standing|sitting|walking))$/i;
  const CLOSE_TAG = /^(?:portrait|close-up|face focus|eye focus|upper body|cowboy shot|full body|looking at viewer|pov)$/i;
  const tagName = tag => tag.replace(/^[{\[]+|[}\]]+$/g, '').replace(/^-?[\d.]+::|::$/g, '').trim();
  function sceneTags(items, mode) {
    return items.filter(item => {
      // 여러 태그를 한 가중치로 묶은 경우에도 각각의 내용은 검사한다.
      return tagName(item).split(',').every(part => {
        const tag = part.trim();
        if (/^(?:no humans|no text)$/i.test(tag) || COUNT_TAG.test(tag)) return false;
        if ((NO_HUMANS.has(mode) || mode === 'detail') && SUBJECT_TAG.test(tag)) return false;
        return mode !== 'distant' || !CLOSE_TAG.test(tag);
      });
    });
  }

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
    const action = actionOf(p);
    const onScreen = action.split(/(?<=[.!?。])\s+|[;；]/).filter(part => !OFFSCREEN.test(part)).join(' ');
    const dialogs = p.dialogs || [];
    const speaking = dialogs.filter(d => !OFFSCREEN.test(d.note || '') && !(d.fx || []).includes('전화')).map(d => d.who);
    const speakers = new Set(dialogs.map(d => d.who));
    const visible = chars.filter(c => c.name && (
      namesCharacter(onScreen, c) || speaking.includes(c.name)
      || (c.name === p.who && !speakers.has(c.name) && !OFFSCREEN.test(action))
    ));
    const main = visible.find(c => c.name === p.who) || visible[0];
    const animals = tagsOf(onScreen, ANIMALS);
    const hasPerson = !!main || (!animals.length && PERSON.test(onScreen)) || (!!p.said && !dialogs.length);
    const objects = tagsOf(action, OBJECT);
    const localPlace = tagsOf(action, PLACE);
    const body = BODY.find(([pattern]) => pattern.test(onScreen))?.[1] || [];
    const mode = focusOf(p, action, hasPerson, objects, localPlace, body);
    const far = mode === 'distant';
    const showCast = mode === 'character' || far;
    const cast = showCast && main ? [main, ...visible.filter(c => c !== main)].slice(0, 6) : [];
    const nearest = table => {
      for (let offset = 1; offset < panels.length; offset++) {
        for (const next of [panels[i - offset], panels[i + offset]]) {
          if (!next || next.chunk !== p.chunk) continue;
          const found = tagsOf(actionOf(next), table);
          if (found.length) return found;
        }
      }
      return [];
    };
    const place = localPlace.length ? localPlace
      : ['scenery', 'distant', 'character'].includes(mode) ? nearest(PLACE) : [];
    const time = tagsOf(action, TIME);
    const light = mode === 'effect' ? [] : [...(time.length ? time : nearest(TIME)), ...tagsOf(action, LIGHT)];
    const tone = ['object', 'detail'].includes(mode) ? { tags: [], note: '' } : dbTone(p.emo, mode === 'effect' ? '효과 배경' : p.shot);
    const peak = p.vng === 'P';
    const frame = {
      scenery: ['no humans', 'scenery', ...animals, ...place, ...objects, p.shot === '설정' ? 'very wide shot' : p.shot === '클로즈업' ? 'close-up' : 'wide shot'],
      distant: [...place, 'scenery', 'wide shot', 'distant figure', ...countTags(cast), ...objects],
      object: ['no humans', ...objects, ...(p.shot === '화면 인서트' ? ['screen'] : []), 'object focus', 'close-up', ...place],
      detail: [...body, 'extreme close-up', ...objects, ...place],
      effect: ['no humans', 'abstract background', ...tagsOf(action + ' ' + (p.dir?.fx || []).join(' '), FX), ...tone.tags],
      character: [...countTags(cast), !cast.length && 'person', ...(SHOT[p.shot] || SHOT['중경']), ...place, ...objects],
    }[mode];
    // #소품(고정): 설정집 물건의 태그를 그대로, 화면 구도 태그 바로 뒤에(컷마다 같은 모양). 효과 배경 컷에는 안 넣음
    const props = mode === 'effect' ? [] : (ctx.props?.(p) || []).filter(x => x.tags);
    const frameTags = [...frame, ...(mode === 'effect' ? [] : ANG[p.ang] || []), ...props.flatMap(x => splitTags(x.tags))].filter(Boolean);
    const base = joinTags([
      ...frameTags, ...(mode === 'effect' ? [] : tagsOf(action, SURFACE)), ...light,
      ...(showCast || mode === 'effect' ? MOOD[p.emo] || [] : []),
      ...(mode !== 'effect' ? tone.tags.filter(t => !light.length || !['dark', 'night'].includes(t)) : []),
      (dialogs.length || p.caption) && 'negative space',
      ...sceneTags([...(ctx.loreTags?.(p) || []), ...splitTags(ctx.worldTags), ...splitTags(style)], mode), 'no text',
    ]);
    const charP = cast.map((c, n) => {
      const look = String(tags[c.name] || '').trim() || lookTags(c.look).join(', ');
      const appearance = splitTags(look).filter(tag => !COUNT_TAG.test(tagName(tag))
        && tag !== 'no humans' && (!far || !/hair|eyes?|face|portrait|close-up|looking at viewer/i.test(tag)));
      const actionTags = n === 0 ? tagsOf(onScreen, POSE).filter(tag => !far || /walk|stand|sitting/.test(tag)) : [];
      const x = cast.length === 1 ? 0.5 : [0.3, 0.7, 0.5, 0.3, 0.7, 0.5][n];
      const y = n < 3 ? (far ? 0.7 : 0.5) : (far ? 0.9 : 0.7);
      const prompt = joinTags([
        ...countTags([c]), far && 'far away', ...appearance,
        ...(!far && n === 0 ? EXPR[p.emo] || [] : []), ...actionTags,
      ]);
      return { name: c.name, prompt, pos: pos(x, y), ref: !far && !!refs.char?.(c.name) };
    });
    const charRef = mode === 'character' && main && refs.char?.(main.name) ? main.name : null;
    const strength = ['detail', 'object'].includes(mode) ? 0.72 : NO_HUMANS.has(mode) || far ? 0.62 : peak ? 0.7 : 0.66;
    return {
      mode, focus: LABELS[mode], frameTags, base, chars: charP, size: size(p.h),
      settings: { steps: 28, guidance: 5, rescale: 0, sampler: 'Euler Ancestral', noise: 'karras', strength, noiseImg: 0.1 },
      charRef, vibe: !charRef && !!refs.scene, peak, aiChoice: !far && cast.length < 2, dbNote: tone.note,
      props: (ctx.props?.(p) || []).map(x => ({ name: x.name, tags: x.tags || '', look: x.look || '' })),
    };
  }

  function refine(draft, result) {
    if (typeof result?.base !== 'string') return draft;
    const additions = sceneTags(splitTags(result.base), draft.mode);
    const chars = draft.chars.map(c => {
      const next = result.chars?.find(item => item.name === c.name);
      if (!next?.prompt?.trim() || draft.mode === 'distant') return c;
      const identity = splitTags(c.prompt).filter(tag => COUNT_TAG.test(tag));
      const description = splitTags(next.prompt).filter(tag => !COUNT_TAG.test(tagName(tag)) && !/^no humans$/i.test(tagName(tag)));
      return { ...c, prompt: joinTags([...identity, ...description]), pos: cellPos(next.cell) || c.pos };
    });
    const base = joinTags([...draft.frameTags, ...additions, ...splitTags(draft.base)]);
    return { ...draft, base, chars, ai: true };
  }
  function text(o, i, total, head) {
    const L = [`[컷 ${i + 1} / ${total}] ${head || ''}`.trim(),
      `해상도: ${o.size.w} × ${o.size.h}${o.size.exact ? '' : ` (생성 후 ${o.size.crop} 자르기)`}`,
      `기본 프롬프트:\n${o.base}`,
      (o.props || []).length ? `고정 소품: ${o.props.map(x => `${x.name}${x.tags ? ` (${x.tags})` : ''}`).join(' · ')}` : '',
      ...o.chars.map((c, n) => `캐릭터 ${n + 1} · ${c.name} · 위치 ${c.pos.cell} (x ${c.pos.x}, y ${c.pos.y}):\n${c.prompt}`),
      `설정: Steps ${o.settings.steps} · Guidance ${o.settings.guidance} · Sampler ${o.settings.sampler} · Noise Schedule ${o.settings.noise}`,
      `img2img: 바탕 PNG 업로드, Strength ${o.settings.strength} · Noise ${o.settings.noiseImg}`,
      o.charRef ? `Character Reference: ${o.charRef} 이미지 (V4.5, 한 장만 · Vibe Transfer와 같이 못 씀)` : o.vibe ? 'Vibe Transfer: 장면 이미지 (정보 추출 0.6 · 강도 0.5 정도에서 시작)' : '',
    ].filter(Boolean);
    return L.join('\n\n');
  }
  // 칸 이름(A1~E5) → 좌표
  const cellPos = cell => { const c = COLS.indexOf(String(cell)[0]), r = +String(cell).slice(1) - 1; return c < 0 || !(r >= 0 && r < 5) ? null : pos(+(0.1 + c * 0.2).toFixed(1), +(0.1 + r * 0.2).toFixed(1)); };
  Object.assign(N, { cut, refine, text, lookTags, size, cellPos, FOCUS, SHOT, ANG, EXPR });
})(typeof module !== 'undefined' ? module.exports : (window.RoughNAI = {}));
