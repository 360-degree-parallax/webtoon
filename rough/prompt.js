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
  const has = (s, ws) => ws.some(w => s.includes(w));
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
    const main = chars.find(c => c.name === p.who), oth = others(p, chars);
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
    const look = c => (c && c.look ? c.look.trim().replace(/\s+/g, ' ') : '');
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
    const sdPos = [`korean webtoon panel`, S.en, A.en, S.frame, castEn && castEn, main && expr[0], ...poses.map(x => x[1]), place && place[1], light && light[1], mood && mood[0], peak && 'dramatic composition', dlg.length && 'empty space at top', style.trim()].filter(Boolean).join(', ');
    const sd = { positive: sdPos, negative: NEG.join(', '), size: `${1024} x ${Math.round(1024 * p.h / 8) * 8}` };
    // 한국어 자연어
    const castKo = [main, ...oth].filter(Boolean).map((c, n) => `${c.name}${n === 0 && oth.length ? `(화면 ${side === 'left' ? '왼쪽' : '오른쪽'})` : n > 0 ? `(화면 ${side === 'left' ? '오른쪽' : '왼쪽'})` : ''}${look(c) ? ` — 외형: ${look(c)}` : ''}`);
    const lines = [
      `[컷 ${i + 1} / ${total}] 웹툰 한 컷 이미지를 그려줘. 비율은 가로 100 : 세로 ${Math.round(p.h * 100)}.`,
      style && `화풍: ${style.trim()}`,
      (place || light) && `장소·조명: ${[place && place[2], light && light[2], mood && mood[1]].filter(Boolean).join(', ')}`,
      `카메라: ${p.shot}(${S.ko}), ${A.ko}, ${S.lens}.${castKo.length === 1 ? ` 인물은 화면 ${side === 'left' ? '왼쪽' : '오른쪽'} 1/3에.` : ''}`,
      castKo.length ? `인물: ${castKo.join(' / ')}` : '인물 없음(배경 위주).',
      main && `표정: ${p.emo} ${k[1]} — ${expr[1]}${dlg[0]?.note ? ` (연기 지시: ${dlg[0].note})` : ''}`,
      `동작·내용: ${dot(p.act)}${poses.length ? ` (${poses.map(x => x[2]).join(', ')})` : ''}`,
      dlg.length && `대사: ${dlg.map(d => `${d.who ? d.who + ' ' : ''}"${d.text}"`).join(' / ')} — 말풍선과 글자는 넣지 말고 위쪽에 말풍선 자리를 비워둬.`,
      p.caption && `식자: [${p.caption}] — 글자는 넣지 말고 왼쪽 위에 글상자 자리를 비워둬.`,
      (p.sfx || []).length && `효과음: ${p.sfx.join(', ')} — 글자는 넣지 말고 효과가 느껴지는 동작으로.`,
      `연출: ${peak ? '이 묶음의 정점 컷이라 가장 강한 구도로. ' : ''}${chunk ? `묶음은 ${chunk.narr}, ${chunk.goal}. ` : ''}${prev ? `앞 컷: ${dot(prev.act)}. ` : ''}${next ? `다음 컷: ${dot(next.act)}.` : ''}`.trim(),
      palette.length && `색: ${palette.slice(0, 5).join(' ')} 계열`,
      `하지 말 것: ${NEG_KO}.`,
    ].filter(Boolean);
    return { mj, sd, natural: lines.join('\n'), ar };
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
      `컷 흐름:\n${panels.map((p, i) => `${i + 1}. ${p.shot}·${p.ang} — ${p.who ? p.who + ', ' : ''}${p.act}${p.said ? ` "${p.said}"` : ''}${p.vng === 'P' ? ' (정점)' : ''}`).join('\n')}`,
      '모든 컷에서 인물 외형·의상·색을 똑같이 유지하고, 글자와 말풍선은 넣지 않는다.',
    ].filter(Boolean).join('\n\n');
  }

  Object.assign(P, { cut, brief, setting, SHOT, ANG, EXPR, NEG });
})(typeof module !== 'undefined' ? module.exports : (window.RoughPrompt = {}));
