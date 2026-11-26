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
    // 동작(활용형까지): 달린다·달려·달린·달렸… 어간이 바뀌는 것은 따로 적음
    [['달리', '달려', '달린', '달렸', '뛰어가', '뛰어간', '뛰어온', '뛰어오', '질주', '내달'], ['running', 'motion blur']],
    [['뛰어오르', '뛰어올라', '뛰어오른', '점프', '도약', '뛰어내'], ['jumping']], [['넘어지', '넘어진', '넘어져', '고꾸라'], ['falling', 'tripping']],
    [['쓰러지', '쓰러진', '쓰러져'], ['lying on the ground']], [['누워', '누운', '눕', '드러누'], ['lying']], [['엎드'], ['on stomach']],
    [['무릎을 꿇', '무릎 꿇', '무릎을 꿇은'], ['kneeling']], [['웅크', '쪼그려', '쭈그려', '쪼그리', '쭈그리'], ['squatting', 'curled up']],
    [['기어가', '기어간', '기어오'], ['crawling']], [['매달'], ['hanging']], [['기어오르', '기어올라', '올라타', '올라탄'], ['climbing']],
    [['숨어', '숨은', '숨는', '숨었'], ['hiding']], [['날아', '날고', '날았', '날개를 펼'], ['flying']], [['헤엄', '수영'], ['swimming']],
    [['춤'], ['dancing']], [['손을 흔들', '손을 흔든'], ['waving']], [['가리키', '가리킨', '가리켰'], ['pointing']],
    [['고개를 숙여 인사', '절을', '인사를 하', '꾸벅'], ['bowing']], [['팔짱'], ['crossed arms']], [['주먹을 쥐', '주먹을 쥔', '주먹을 꽉'], ['clenched hands']],
    [['머리를 감싸', '머리를 쥐어', '머리를 움켜'], ['head in hands']], [['턱을 괴', '턱을 괸'], ['hand on own chin']], [['벽에 기대', '벽에 기댄'], ['leaning against wall']],
    [['소리치', '소리친', '소리쳤', '외치', '외친', '외쳤', '고함', '버럭'], ['shouting', 'open mouth']], [['비명'], ['screaming']], [['속삭'], ['whispering']],
    [['노려', '째려', '쏘아보', '쏘아본'], ['glaring']], [['눈을 감', '눈 감', '눈을 지그시'], ['closed eyes']], [['한숨'], ['sigh']],
    [['잠들', '잠든', '자고 있', '졸고', '졸린'], ['sleeping']], [['책을 읽', '책을 펼'], ['reading', 'holding book']], [['편지를 쓰', '글을 쓰', '적는다', '적고'], ['writing']],
    [['마시', '마신', '마셨', '들이켜'], ['drinking']], [['먹는', '먹고', '먹었', '먹는다', '베어 물'], ['eating']],
    [['칼을 뽑', '검을 뽑', '칼을 빼', '검을 빼'], ['unsheathing', 'holding sword']], [['칼을 휘', '검을 휘', '베어', '베었', '벤다'], ['swinging sword', 'holding sword']],
    [['칼을 겨', '검을 겨', '칼끝'], ['holding sword', 'pointing sword']], [['활을 당', '활시위'], ['drawing bow', 'holding bow']], [['총을 겨', '총구'], ['aiming', 'holding gun']],
    [['주먹을 날', '주먹질', '때린', '때리', '후려'], ['punching', 'fighting']], [['발로 차', '걷어차'], ['kicking']], [['싸우', '싸운', '격투', '맞붙'], ['fighting']],
    [['막아', '막는', '방패'], ['blocking']], [['돌아서', '등을 돌', '등지고'], ['back turned', 'from behind']], [['일어서', '일어선', '일어나', '일어난'], ['standing up']],
    [['머리를 쓸어', '머리를 넘기', '머리카락을 쓸'], ['hand in own hair']], [['문을 열', '문을 연', '문을 밀'], ['opening door']], [['창문을 열', '창을 열'], ['opening window']],
    [['우산'], ['holding umbrella']], [['휴대폰', '핸드폰', '스마트폰', '전화를 받', '통화'], ['holding phone']], [['담배'], ['smoking']], [['운전'], ['driving']],
    [['몸을 떨', '떨고', '떨린다', '덜덜'], ['trembling']], [['헐떡', '숨을 몰아', '숨이 차'], ['panting', 'heavy breathing']], [['피를 흘', '피투성', '피가 흐'], ['blood']],
    [['휘날', '바람에 날', '머리카락이 날'], ['wind', 'floating hair']], [['젖은', '젖어', '비를 맞'], ['wet']], [['손을 뻗어 잡', '붙잡으려'], ['reaching']],
    [['고개를 갸웃', '갸우뚱'], ['head tilt']], [['뒷걸음', '물러서', '물러선'], ['stepping back']], [['다가서', '다가선', '다가와', '다가온다'], ['walking towards viewer']],
    [['응시', '뚫어지게', '빤히'], ['staring']], [['먼 곳을', '먼 산', '하늘을 바라', '하늘을 본'], ['looking afar']],
    [['돌진', '달려든', '달려들'], ['charging', 'dynamic pose']], [['도망', '달아나', '달아난'], ['running away', 'motion blur']],
  ];
  // 기본형(…다)으로 적은 동작 → 활용형까지: 어간 + ㄴ/ㄹ 받침(달린·달릴) + 아/어 줄임(달려·꺼내·쥐어→쥐어) + 과거(달렸·꺼냈)
  //   ㄹ 탈락(흔들다→흔드는·흔든), ㅂ 불규칙(눕다→누운·누워), 하다(→한·해·했)도. 어간이 한 글자면 어간 자체는 안 넣음(너무 흔해서)
  const HB = 0xAC00, syl = (l, v, t) => String.fromCharCode(HB + (l * 21 + v) * 28 + t), jamo = ch => { const c = ch.charCodeAt(0) - HB; return c < 0 || c >= 11172 ? null : [Math.floor(c / 588), Math.floor(c % 588 / 28), c % 28]; };
  const CONTRACT = { 20: 6, 8: 9, 13: 14, 18: 4 };  // ㅣ→ㅕ, ㅗ→ㅘ, ㅜ→ㅝ, ㅡ→ㅓ
  function forms(base) {
    if (!/다$/.test(base)) return [base];
    const st = base.slice(0, -1), head = st.slice(0, -1), j = jamo(st.slice(-1)); if (!j) return [st];
    const [l, v, t] = j, out = new Set(); if (st.length >= 2) out.add(st);
    const add = x => out.add(head + x);
    if (st.endsWith('하')) { ['한', '할', '해', '했', '하는', '하며', '하고'].forEach(x => out.add(st.slice(0, -1) + x)); return [...out]; }
    if (t === 0) { add(syl(l, v, 4)); add(syl(l, v, 8)); add(syl(l, v, 0) + '는'); add(syl(l, v, 0) + '고'); add(syl(l, v, 0) + '며');
      const cv = CONTRACT[v]; if (cv != null) { const y = v === 20 && l === 11 ? 11 : l; add(syl(y, cv, 0)); add(syl(y, cv, 20)); } else { add(syl(l, v, 20)); } }
    else { out.add(st); add(syl(l, v, t) + '은'); add(syl(l, v, t) + '는'); add(syl(l, v, t) + '어'); add(syl(l, v, t) + '아'); add(syl(l, v, t) + '었'); add(syl(l, v, t) + '았');
      if (t === 8) { add(syl(l, v, 0) + '는'); add(syl(l, v, 4)); add(syl(l, v, 0) + '며'); }
      if (t === 17) { add(syl(l, v, 0) + '운'); add(syl(l, v, 0) + '워'); } }
    return [...out].filter(x => x.length >= 2);
  }
  // DB 컷 글에서 자주 빠지던 동작(tools/mine_actions.js) — 기본형으로 적고 위 forms()로 펼침
  const POSE_BASE = [
    [['놀라다', '깜짝'], ['surprised', 'wide-eyed']], [['눈물을 흘리다', '눈물 흘리다', '눈물이 맺히다', '눈물 고이다', '눈물이 고이다', '울먹이다', '흐느끼다'], ['tears', 'crying']],
    [['당황하다'], ['flustered', 'sweatdrop']], [['감싸다', '감싸 안다'], ['embracing']], [['얼굴을 붉히다', '볼을 붉히다'], ['blush']], [['이마를 짚다', '머리를 짚다'], ['hand on own forehead']],
    [['안다', '껴안다', '끌어안다', '부둥켜안다'], ['hug']], [['얼굴을 묻다', '품에 얼굴을'], ['face in another\'s chest']], [['떠나다', '나가다', '나서다', '들어서다', '들어오다'], ['walking']],
    [['다가오다', '다가가다'], ['walking towards']], [['손을 내밀다', '내밀다'], ['reaching out']], [['떨어지다', '추락하다'], ['falling']], [['수군대다', '수군거리다'], ['whispering', 'crowd']],
    [['눈을 맞추다', '시선을 맞추다', '눈이 마주치다', '마주하다', '마주 보다'], ['eye contact', 'face-to-face']], [['손을 맞잡다', '맞잡다'], ['holding hands']], [['안기다', '품에 안기다'], ['hug', 'being hugged']],
    [['손을 흔들다'], ['waving']], [['막다', '가로막다'], ['blocking', 'outstretched arm']], [['내려다보다'], ['looking down']], [['올려다보다', '우러러보다'], ['looking up']],
    [['쓰다듬다'], ['petting', 'headpat']], [['내려놓다'], ['putting down']], [['부르다', '외쳐 부르다'], ['calling out', 'open mouth']], [['문이 열리다'], ['open door']], [['문이 닫히다'], ['closed door']],
    [['손을 모으다', '두 손을 모으다'], ['own hands together']], [['움켜쥐다', '꽉 쥐다', '부여잡다'], ['clenched hand', 'grabbing']], [['따지다', '쏘아붙이다', '대들다'], ['arguing', 'open mouth', 'angry']],
    [['멍하다', '멍하니'], ['blank stare']], [['손가락질하다'], ['pointing at another']], [['인사하다', '고개 숙이다'], ['bowing']], [['맞닿다', '이마를 맞대다'], ['forehead-to-forehead']],
    [['건네받다', '받아 들다', '받아들다'], ['receiving', 'holding']], [['손짓하다'], ['beckoning']], [['어깨에 얹다', '손을 얹다'], ["hand on another's shoulder"]], [['고개를 돌리다', '얼굴을 돌리다', '눈을 돌리다'], ['looking away']],
    [['손을 뻗다', '팔을 뻗다'], ['outstretched arm', 'reaching']], [['머리를 긁다', '뒷머리를 긁다'], ['scratching head']], [['두드리다', '노크하다'], ['knocking']], [['벗다', '벗어 던지다'], ['undressing']],
    [['움찔하다', '흠칫하다', '움찔'], ['flinch']], [['떠올리다', '회상하다'], ['thinking', 'looking afar']], [['노크하다'], ['knocking']], [['미소 짓다', '미소를 짓다', '웃음 짓다'], ['smile']],
    [['입술을 깨물다'], ['biting own lip']], [['침을 삼키다', '마른침'], ['gulping', 'sweat']], [['이를 악물다', '이를 갈다'], ['clenched teeth']], [['한숨 쉬다', '한숨을 쉬다'], ['sigh']],
    [['고개를 끄덕이다', '끄덕이다'], ['nodding']], [['고개를 젓다', '도리질'], ['shaking head']], [['어깨를 으쓱하다', '으쓱하다'], ['shrugging']], [['하품하다'], ['yawning']],
    [['눈을 뜨다'], ['open eyes']], [['눈을 비비다'], ['rubbing eyes']], [['볼을 꼬집다', '볼을 잡아당기다'], ['cheek pinching']], [['귓속말하다', '귓속말'], ['whispering']],
    [['포옹하다'], ['hug']], [['악수하다'], ['handshake']], [['업다', '업히다'], ['piggyback']], [['키스하다', '입 맞추다', '입을 맞추다'], ['kiss']],
    [['밀치다', '밀어내다', '떠밀다'], ['pushing']], [['끌고 가다', '끌려가다', '잡아끌다'], ['dragging', 'pulling']], [['붙잡다', '부축하다'], ['holding another']], [['뿌리치다'], ['shaking off']],
    [['통화하다'], ['holding phone', 'talking on phone']], [['문자를 보내다', '휴대폰을 보다', '폰을 보다'], ['looking at phone', 'holding phone']], [['서빙하다', '쟁반을 들다'], ['holding tray']],
    [['요리하다'], ['cooking']], [['청소하다', '빗자루'], ['cleaning', 'holding broom']], [['피아노를 치다', '연주하다'], ['playing instrument']], [['그림을 그리다'], ['drawing', 'holding brush']],
    [['붉히다'], ['blush']], [['떨리다', '떨다'], ['trembling']], [['기대다', '기대앉다'], ['leaning']], [['돌아서다', '돌아눕다'], ['back turned']], [['생각에 잠기다', '골똘히', '고민하다', '생각하다'], ['thinking', 'hand on own chin']],
    [['비가 내리다', '빗속', '비를 맞다'], ['rain', 'wet']], [['눈이 내리다', '눈발'], ['snowing']], [['화나다', '화내다', '분노하다', '분개하다'], ['angry']], [['무표정하다'], ['expressionless']],
    [['손목을 잡다', '팔을 잡다', '옷자락을 잡다', '소매를 잡다', '멱살을 잡다'], ["grabbing another's arm"]], [['땀을 흘리다', '식은땀'], ['sweat']], [['빛나다', '반짝이다'], ['glowing', 'sparkle']],
    [['샤워하다'], ['showering', 'wet']], [['옷을 갈아입다', '옷을 입다'], ['changing clothes']], [['화장하다'], ['applying makeup']], [['책상에 엎드리다'], ['head on desk']],
  ];
  // 사람 동작으로 보이는 한국어 어미(동작 태그를 못 찾았을 때 알림용)
  POSE.push(...POSE_BASE.map(([ws, t]) => [[...new Set(ws.flatMap(forms))], t]));
  // Claude가 컷 프롬프트를 만들며 새로 옮긴 동작(배운 동작) — 앱이 N.useLearned([[한국어 낱말들], [태그들]])로 넣음
  let LEARNED_N = 0;
  N.useLearned = list => { POSE.splice(POSE.length - LEARNED_N, LEARNED_N); const L = (list || []).filter(x => Array.isArray(x) && x[0]?.length && x[1]?.length).map(([ws, t]) => [[...new Set(ws.flatMap(forms))], t]); POSE.push(...L); LEARNED_N = L.length; };
  N.forms = forms;
  const VERBISH = /(다|고|며|면서|는|은|ㄴ다|하며|한다)[.!?…]*$|[가-힣](는다|ㄴ다|었다|았다|였다|한다|된다|진다)/;
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
  // 감정별 분위기 조명(모든 구도에) — 위 MOOD에 없던 감정도 채움
  Object.assign(MOOD, { 평온: ['soft lighting'], 기쁨: ['warm lighting', 'sparkle'], 결의: ['dramatic lighting', 'rim lighting'], 당황: ['high contrast'] });
  // 앵글 × 감정: 카메라 높이로 감정을 실음(로우앵글=위압·결의, 하이앵글=작고 외로움). '_'는 그 앵글 기본
  const ANG_FEEL = {
    로우앵글: { 분노: ['looking down at viewer', 'imposing', 'dramatic perspective'], 결의: ['looking down at viewer', 'imposing', 'dramatic perspective'], 냉담: ['looking down at viewer', 'imposing'],
      놀람: ['dramatic perspective'], 설렘: ['looking down at viewer'], 다정: ['looking down at viewer'], 기쁨: ['perspective'], _: ['perspective'] },
    하이앵글: { 쓸쓸: ['looking up', 'alone'], 긴장: ['looking up'], 당황: ['looking up'], 놀람: ['looking up'], 설렘: ['looking up at viewer'], 의아: ['looking up'], _: ['perspective'] },
    탑뷰: { 쓸쓸: ['alone'], _: ['perspective'] },
    아이레벨: { 긴장: ['dutch angle'], 당황: ['dutch angle'], 놀람: ['dutch angle'], 분노: ['dutch angle'], _: [] },
  };
  // 씬 무드: 씬 전체에 같은 색감(색 보정)을 깔아 컷끼리 톤이 맞게
  const SCENE_MOOD = { 설렘: ['warm colors', 'pastel colors'], 다정: ['warm colors'], 기쁨: ['vivid colors', 'warm colors'], 긴장: ['cold colors', 'high contrast'],
    쓸쓸: ['cold colors', 'desaturated'], 분노: ['high contrast', 'red theme'], 냉담: ['cold colors', 'desaturated'], 회상: ['sepia', 'soft focus'], 결의: ['high contrast'], 개그: ['vivid colors'],
    평온: [], 놀람: [], 의아: [], 당황: [] };
  const DARK_MOOD = new Set(['긴장', '쓸쓸', '냉담', '분노']);
  // 감정 강도 → NovelAI 가중치(2: 1.15배, 3: 1.3배)
  const weigh = (tags, i) => !tags.length ? [] : i >= 3 ? [`1.3::${tags.join(', ')}::`] : i === 2 ? [`1.15::${tags.join(', ')}::`] : tags;
  // 씬에서 가장 무게 있는 감정(강도 가중, 평온 제외)이 30% 넘으면 그 감정, 아니면 평온
  function sceneMood(panels) {
    const w = {}; let all = 0;
    for (const p of panels || []) { const k = (p.i ?? 1) + 1; all += k; if (p.emo && p.emo !== '평온') w[p.emo] = (w[p.emo] || 0) + k * (p.vng === 'P' ? 1.5 : 1); }
    const top = Object.entries(w).sort((a, b) => b[1] - a[1])[0];
    return top && top[1] >= all * 0.3 ? top[0] : '평온';
  }
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

  // 소품이 화면에 보이는지 — 같은 컷 글에 여러 번 나오면 한 번이라도 보이면 보임
  //   출처(source): '조마경에서 쏟아진 빛줄기', '조마경의 빛' → 소품은 안 보이고 나온 빛·연기·기운만(EMIT)
  //   언급(absent): '조마경을 떠올린다', '조마경 이야기' → 안 보임
  const EMIT = [[['빛줄기', '광선', '빛기둥', '빛살'], ['light rays', 'beam of light']], [['빛', '광채', '섬광', '광휘'], ['glowing light', 'light particles']],
    [['연기', '안개', '김이'], ['smoke']], [['불꽃', '불길', '화염', '불티'], ['fire', 'sparks']], [['기운', '마력', '힘이', '에너지', '오라'], ['aura', 'magic']],
    [['물줄기', '물이', '물방울'], ['water splash']], [['꽃잎'], ['petals']], [['소리', '울림', '목소리'], []]];
  const EMIT_V = /(나온|나오|나와|쏟아|뿜어|뿜는|뿜은|흘러|새어|번지|번진|번져|퍼지|퍼진|퍼져|뻗어|뻗은|뻗는|솟구|솟아|일어|피어|터져|터진|번쩍|비친|비추|비쳐|쏘아|발한|발하|빛나)/;
  function propPresence(act, name) {
    let at = act.indexOf(name), seen = false, out = null;
    while (at >= 0) {
      seen = true; const rest = act.slice(at + name.length, at + name.length + 28); let r = { on: true };
      const src = /^(에서|으로부터|로부터|에게서|의)\s*/.exec(rest);
      if (src) { const tail = rest.slice(src[0].length), em = EMIT.find(([ws]) => ws.some(w => tail.includes(w)));
        if (em && (src[1] === '의' ? em[0].some(w => tail.startsWith(w)) : EMIT_V.test(tail))) r = { on: false, why: 'source', emit: em[1] }; }
      if (r.on && /^(을|를|이|가|에 대한|에 관한)?\s*(떠올|생각|기억|그리워|그리운|찾아야|찾으러|찾아 헤|잃어버|잃은|이야기|얘기|언급|소문)/.test(rest)) r = { on: false, why: 'absent', emit: [] };
      if (r.on) return r; if (!out || (!out.emit?.length && r.emit?.length)) out = r;
      at = act.indexOf(name, at + name.length);
    }
    return seen ? out : { on: true };
  }
  function cut(p, i, panels, ctx) {
    const { chars = [], style = '', tags = {}, refs = {} } = ctx;
    // 소품 보이기: 컷에서 직접 정한 값(ctx.propVis: 'show'|'hide'|'auto')이 먼저, 없으면 글에서 추론. 안 보이는 소품은 이름을 지운 글로 판정(물건 태그도 안 붙게)
    const rawAct = actionOf(p);
    const propAll = (ctx.props?.(p) || []).map(x => { const v = ctx.propVis?.(p, x.name) || 'auto';
      return { ...x, ...(v === 'hide' ? { on: false, why: 'hidden', emit: [] } : v === 'show' ? { on: true, forced: true } : propPresence(rawAct, x.name)) }; });
    const propsOn = propAll.filter(x => x.on), propsOff = propAll.filter(x => !x.on);
    const emitTags = uniq(propsOff.flatMap(x => x.emit || []));
    const action = propsOff.reduce((a, x) => a.split(x.name).join(' '), rawAct).replace(/\s{2,}/g, ' ');
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
    const props = mode === 'effect' ? [] : propsOn.filter(x => x.tags);
    // 카메라: 앵글 태그 + 앵글×감정(인물이 없으면 시선 태그는 뺌) + 정점 컷은 역동적 구도
    const feel = mode === 'effect' ? [] : [...((ANG_FEEL[p.ang] || {})[p.emo] || (ANG_FEEL[p.ang] || {})._ || [])].filter(t => (hasPerson || !/looking/.test(t)) && (p.ang !== '아이레벨' || (p.i ?? 1) >= 2));
    const cam = mode === 'effect' ? [] : [...(ANG[p.ang] || []), ...feel, peak && 'dynamic angle'];
    const frameTags = [...frame, ...cam, ...props.flatMap(x => splitTags(x.tags)), ...emitTags].filter(Boolean);
    const sm = ctx.sceneMood || '평온', night = light.includes('night') || DARK_MOOD.has(sm);
    const base = joinTags([
      ...frameTags, ...(mode === 'effect' ? [] : tagsOf(action, SURFACE)), ...light,
      ...weigh(MOOD[p.emo] || [], p.i ?? 1),
      ...(mode !== 'effect' ? tone.tags.filter(t => !(light.length && ['dark', 'night'].includes(t)) && !(night && ['bright', 'high key'].includes(t))) : []),
      ...(SCENE_MOOD[sm] || []),
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
        ...(!far && n === 0 ? weigh(EXPR[p.emo] || [], p.i ?? 1) : []), ...actionTags,
      ]);
      return { name: c.name, prompt, pos: pos(x, y), ref: !far && !!refs.char?.(c.name) };
    });
    // 레이어용 인물: 화면 구도(소품·손 중심 컷이라 인물 칸이 비는 경우 포함)와 상관없이 컷에 보이는 인물마다 하나
    const layerCast = mode === 'effect' ? [] : visible.slice(0, 6).map((c, n) => {
      const look = String(tags[c.name] || '').trim() || lookTags(c.look).join(', ');
      const appearance = splitTags(look).filter(tag => !COUNT_TAG.test(tagName(tag)) && tag !== 'no humans');
      const isMain = c === main, drawn = charP.find(x => x.name === c.name);
      const k = Math.min(visible.length, 6), x = k === 1 ? 0.5 : [0.3, 0.7, 0.5, 0.3, 0.7, 0.5][n];
      return { name: c.name, pos: drawn && !far ? drawn.pos : pos(x, n < 3 ? 0.5 : 0.7),
        prompt: joinTags([...countTags([c]), ...appearance, ...(isMain ? weigh(EXPR[p.emo] || [], p.i ?? 1) : []), ...(isMain ? tagsOf(onScreen, POSE) : []), ...(mode === 'detail' ? body : [])]) };
    });
    // 인물이 나오는데 동작 태그를 하나도 못 찾으면 알림(사전에 없는 동작 — 컷 프롬프트 생성(Claude)으로 채우거나 컷 글을 고쳐 달라고)
    const missAct = !!main && !far && ['character', 'detail'].includes(mode) && !tagsOf(onScreen, POSE).length && VERBISH.test(onScreen.trim()) ? onScreen.trim().slice(0, 40) : '';
    const charRef = mode === 'character' && main && refs.char?.(main.name) ? main.name : null;
    const strength = ['detail', 'object'].includes(mode) ? 0.72 : NO_HUMANS.has(mode) || far ? 0.62 : peak ? 0.7 : 0.66;
    return {
      mode, focus: LABELS[mode], frameTags, base, chars: charP, size: size(p.h),
      settings: { steps: 28, guidance: 5, rescale: 0, sampler: 'Euler Ancestral', noise: 'karras', strength, noiseImg: 0.1 },
      charRef, vibe: !charRef && !!refs.scene, peak, aiChoice: !far && cast.length < 2, dbNote: tone.note,
      props: propsOn.map(x => ({ name: x.name, tags: x.tags || '', look: x.look || '', forced: !!x.forced })), propsOff: propsOff.map(x => ({ name: x.name, why: x.why, emit: x.emit || [] })), place, layerCast, missAct,
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
    // 레이어용 인물에도 Claude가 다듬은 인물 묘사를 씀(인원 태그는 초안 것)
    const layerCast = (draft.layerCast || []).map(c => {
      const next = result.chars?.find(item => item.name === c.name);
      if (!next?.prompt?.trim()) return c;
      const identity = splitTags(c.prompt).filter(tag => COUNT_TAG.test(tag));
      return { ...c, prompt: joinTags([...identity, ...splitTags(next.prompt).filter(tag => !COUNT_TAG.test(tagName(tag)) && !/^no humans$/i.test(tagName(tag)))]) };
    });
    return { ...draft, base, chars, layerCast, ai: true, missAct: '' };
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
  // 요소별 레이어: 한 컷을 배경 · 인물마다(+ 함께 나오는 장면) 따로 뽑아 겹침(편집에서 레이어로 고정·이동)
  //   배경: 사람 없이 장소만(컷 크기), 늘 따로. 같은 씬에서 장소·앵글이 같으면 같은 배경을 여러 컷이 같이 씀(key)
  //   인물: 흰 단색 배경에 그 인물 하나. 두 명 이상이면 서로 닿고 마주하는 장면을 그대로 그린 '함께' 레이어도(NovelAI 여러 인물 칸)
  //   소품: 따로 떼기보다 녹여 넣음 — 인물이 들거나 쥐면 그 인물(과 함께) 레이어에, 놓여 있으면 배경에. 'layer'로 고르면 따로 한 장
  const CUTOUT = ['simple background', 'white background'];
  const LAYER_SHOT = { 설정: [0.18, 1.8], 전경: [0.26, 1.75], 전신: [0.42, 1.7], 중경: [0.62, 1.25], 클로즈업: [0.95, 1], 디테일: [0.8, 1], SD: [0.45, 1.2] };
  // 두 사람이 닿거나 마주하는 동작 → 함께 레이어 태그
  const INTERACT = [
    [['껴안', '안아', '안기', '포옹', '품에'], ['hug']], [['손을 잡', '손잡', '깍지'], ['holding hands']], [['손목'], ["grabbing another's wrist"]],
    [['입맞', '키스', '입술을 포'], ['kiss']], [['마주', '서로 바라', '눈을 맞', '눈이 마주'], ['face-to-face', 'eye contact']], [['어깨에 손', '어깨를 잡', '어깨에 얹'], ["hand on another's shoulder"]],
    [['건네', '내민', '건넨'], ['giving', 'reaching out']], [['밀쳐', '밀친', '밀어'], ['pushing']], [['끌어당', '잡아당'], ['pulling']], [['기대', '기댄'], ['leaning on person']],
    [['업고', '업힌', '업어'], ['piggyback']], [['안아 들', '안아들', '공주님'], ['princess carry']], [['등을 맞', '등을 기'], ['back-to-back']], [['볼을 쓰', '머리를 쓰다'], ['headpat']],
    [['벽에 밀', '벽치기', '벽에 손'], ['kabedon']], [['멱살'], ['grabbing collar']], [['춤'], ['dancing together']],
  ];
  // 소품을 인물이 다루는 동사(소품 이름 바로 뒤 몇 글자 안에서): 있으면 그 인물 레이어에 녹임
  //   활용형까지(꺼내다→꺼낸·꺼냈, 들다→든, 쥐다→쥔 …)
  const HOLD = /^.{0,8}?(들|든|쥐|쥔|쥡|꺼내|꺼낸|꺼냈|꺼냅|건네|건넨|건넸|받|내밀|내민|내밉|끼|낀|차고|찬|메고|멘|품|잡|흔들|흔든|보여|보인|들여다|만지|만진|만졌|펼치|펼친|펼쳐|읽|입|쓰고|쓴|두르|두른|감싸|감싼|움켜|움킨|던지|던진|던졌|놓치|놓친|떨어뜨|떨어트|꽂|꽂은|가리키|가리킨|내려놓|올려놓|들어 올|들어올)/;
  const INTER_TAGS = new Set(INTERACT.flatMap(([, t]) => t).concat(['hug', 'holding hands', "grabbing another's wrist", "hand on another's shoulder"]).filter(t => t !== 'reaching out'));
  const propHead = t => { const w = String(t || '').toLowerCase().trim().split(/\s+/); return w.length >= 3 ? w.slice(-2).join(' ') : w.length === 2 ? w[1] : w[0] || ''; };
  function layers(o, p, ctx = {}) {
    const style = splitTags(ctx.style || ''), props = o.props || [], act = String(p.act || '');
    const cast = o.layerCast || o.chars, n = Math.max(1, cast.length);
    // 소품마다 어디에 넣을지: ctx.attach(name) = 'auto'|'bg'|'layer'|'char:이름'
    const attachOf = x => {
      let want = ctx.attach?.(x.name) || 'auto'; if (want === 'show' || want === 'hide') want = 'auto';
      if (want !== 'auto') { const nm = want.startsWith('char:') ? want.slice(5) : ''; return want.startsWith('char:') ? (cast.some(c => c.name === nm) ? { to: 'char', name: nm } : { to: 'bg' }) : { to: want }; }
      const at = act.indexOf(x.name);
      if (!cast.length || at < 0 || !HOLD.test(act.slice(at + x.name.length))) return { to: 'bg', auto: true };
      // 문장의 주어(그 컷 주인공)가 다룸. 주인공이 화면에 없으면 소품 앞에 가장 가까이 나온 인물
      if (cast.some(c => c.name === p.who)) return { to: 'char', name: p.who, auto: true };
      const before = act.slice(0, at), near = cast.map(c => [c.name, before.lastIndexOf(c.name)]).filter(([, k]) => k >= 0).sort((a, b) => b[1] - a[1])[0];
      return { to: 'char', name: near ? near[0] : cast[0].name, auto: true };
    };
    const propA = props.map(x => ({ ...x, at: attachOf(x) }));
    const tagsFor = x => splitTags(x.tags).length ? splitTags(x.tags) : [];
    const allPropTags = new Set(props.flatMap(x => splitTags(x.tags)).map(t => t.toLowerCase()));
    tagsOf(props.map(x => x.name).join(' '), OBJECT).forEach(t => allPropTags.add(String(t).toLowerCase()));  // 소품 이름에서 나온 물건 태그(회중시계→clock)
    const heads = props.map(x => propHead(splitTags(x.tags)[0])).filter(h => h.length >= 4);
    const isProp = t => { const v = tagName(t).toLowerCase(); return allPropTags.has(v) || heads.some(h => v.includes(h)); };
    const clean = t => t !== 'negative space' && t !== 'no text';
    const effect = o.mode === 'effect';
    const bgProps = propA.filter(x => x.at.to === 'bg').flatMap(tagsFor);
    const bgTags = effect ? splitTags(o.base) : ['no humans', 'scenery', ...sceneTags(splitTags(o.base), 'scenery').filter(t => !SHOT_ALL.has(tagName(t).toLowerCase())).filter(t => !isProp(t)), ...bgProps];
    const place = (o.place || []).slice().sort().join('+');
    const bg = { kind: 'bg', label: '배경', key: effect || !place ? `cut${ctx.i ?? 0}` : `${place}|${p.ang || ''}${bgProps.length ? '|' + bgProps.join('+') : ''}`,
      prompt: joinTags([...bgTags.filter(clean), 'no text']), size: o.size, shared: !effect && !!place };
    const [sc, ratio] = LAYER_SHOT[p.shot] || LAYER_SHOT.중경;
    // 자세 키: 화풍·흰 배경을 뺀 인물 태그(외형·표정·자세·든 소품·프레이밍·앵글)를 정렬해 이음 → 같으면 같은 그림을 여러 컷·씬이 같이 씀
    const poseOf = (name, tags) => name + '|' + [...new Set(tags.map(t => tagName(t).toLowerCase()).filter(t => t && !CUTOUT.includes(t) && t !== 'no text' && !style.some(x => tagName(x).toLowerCase() === t)))].sort().join(',');
    const frame = [...(SHOT[p.shot] || []).filter(t => !/scenery|background/.test(t)), ...ANG[p.ang] || [], ...splitTags(o.base).filter(t => /^(looking (down|up)( at viewer)?|imposing|dramatic perspective|perspective|dutch angle|dynamic angle)$/.test(tagName(t)))];
    // 인물 레이어도 배경과 같은 빛·색감(자세 키에는 안 넣음 — 조명만 다른 같은 자세는 같은 그림)
    const lit = splitTags(o.base).filter(t => /light|colors|contrast|sepia|desaturated|pastel|bloom|sparkle|theme|soft focus/i.test(tagName(t)) && !/background|candle/i.test(tagName(t)));
    const held = name => propA.filter(x => x.at.to === 'char' && x.at.name === name);
    // 개별 인물 레이어에는 둘이 닿는 동작 태그(hug 등)를 뺌 — 함께 레이어의 기본 프롬프트로
    const bodyOf = c => [...splitTags(c.prompt).filter(t => !/^(far away)$/i.test(tagName(t)) && !isProp(t) && !(cast.length >= 2 && INTER_TAGS.has(tagName(t).toLowerCase()))), ...held(c.name).flatMap(x => [...tagsFor(x), HOLD.test(act.slice(act.indexOf(x.name) + x.name.length)) && /들|든|쥐|쥔|잡|움켜|움킨|흔들|흔든|꺼내|꺼낸|꺼냈/.test(act.slice(act.indexOf(x.name) + x.name.length, act.indexOf(x.name) + x.name.length + 6)) ? 'holding' : ''].filter(Boolean))];
    const chars = cast.map(c => { const body = [...bodyOf(c), ...frame];
      return { kind: 'char', label: `인물 ${c.name}`, name: c.name, key: c.name, pose: poseOf(c.name, body), holds: held(c.name).map(x => x.name),
        prompt: joinTags([...body, ...lit, ...CUTOUT, ...style, 'no text']),
        size: size(ratio), x: Math.round(c.pos.x * 100), y: Math.round(c.pos.y * 100), scale: Math.round(Math.min(95, sc * 100 * (n > 1 ? 0.75 : 1))) }; });
    // 함께: 두 명 이상 — 기본 프롬프트(인원·상호작용·구도) + 인물 칸마다 그 인물 묘사(NovelAI V4.5 여러 인물)
    let group = null;
    if (cast.length >= 2) {
      const names = cast.map(c => c.name), counts = cast.flatMap(c => splitTags(c.prompt).filter(t => COUNT_TAG.test(tagName(t))));
      const inter = uniq([...tagsOf(act, INTERACT), ...cast.flatMap(c => splitTags(c.prompt).map(tagName).filter(t => INTER_TAGS.has(t.toLowerCase())))]);
      const parts = cast.map(c => ({ name: c.name, cell: c.pos.cell || pos(c.pos.x, c.pos.y).cell, prompt: joinTags(bodyOf(c).filter(t => !COUNT_TAG.test(tagName(t)))) }));
      const base = joinTags([...counts, ...inter, ...frame, ...lit, ...CUTOUT, ...style, 'no text']);
      group = { kind: 'group', label: `함께 ${names.join('·')}`, names, key: [...names].sort().join('+'), interact: inter,
        pose: [...names].sort().join('+') + '#' + poseOf('', [base, ...parts.map(x => x.name + ':' + x.prompt)].flatMap(splitTags)),
        prompt: [base, ...parts.map(x => x.prompt)].join('\n\n'), blocks: [{ title: '기본 프롬프트', text: base }, ...parts.map((x, k) => ({ title: `캐릭터 ${k + 1} · ${x.name} <small>위치 ${x.cell}</small>`, text: x.prompt }))],
        size: size(Math.max(0.75, ratio * 0.85)), x: 50, y: 50, scale: Math.round(Math.min(95, sc * 100 * 1.35)) };
    }
    const focus = ['object', 'detail'].includes(o.mode);
    const propL = propA.map((x, k) => ({ kind: 'prop', label: `소품 ${x.name}`, name: x.name, key: x.name, at: x.at, sep: x.at.to === 'layer',
      prompt: joinTags(['no humans', 'still life', 'object focus', ...tagsFor(x), ...CUTOUT, ...style, 'no text']), size: size(1), needsTags: !x.tags,
      x: focus ? 50 : 30 + (k % 3) * 20, y: focus ? 55 : 78, scale: focus ? 70 : 22 }));
    return { bg, chars, group, props: propL, propsOff: o.propsOff || [] };
  }
  const SHOT_ALL = new Set(Object.values(SHOT).flat().concat(['wide shot', 'very wide shot']).map(t => t.toLowerCase()));
  // 칸 이름(A1~E5) → 좌표
  const cellPos = cell => { const c = COLS.indexOf(String(cell)[0]), r = +String(cell).slice(1) - 1; return c < 0 || !(r >= 0 && r < 5) ? null : pos(+(0.1 + c * 0.2).toFixed(1), +(0.1 + r * 0.2).toFixed(1)); };
  Object.assign(N, { poseTags: t => tagsOf(String(t || ''), POSE), cut, refine, layers, propPresence, sceneMood, SCENE_MOOD, text, lookTags, size, cellPos, FOCUS, SHOT, ANG, EXPR });
})(typeof module !== 'undefined' ? module.exports : (window.RoughNAI = {}));
