// Claude로 컷 프롬프트 다듬기: 규칙 엔진이 정한 연출값과 초안을 주고, 씬 전체를 읽어
// 컷끼리 이어지는 구체적인 자연어 프롬프트를 다시 쓰게 한다. 키는 사용자가 자기 것을 넣는다(브라우저 저장).
import Anthropic from './vendor/anthropic-sdk.mjs';

export const MODEL = 'claude-opus-5-5';
const BASE_URL = 'https://api.anthropic.com'; // Claude API로 고정
const client = apiKey => new Anthropic({ apiKey, baseURL: BASE_URL, dangerouslyAllowBrowser: true, maxRetries: 2 });

// 키 확인: 모델 정보 조회(토큰 비용 없음)로 키가 유효하고 이 모델을 쓸 수 있는지 본다
export async function check(apiKey) { await client(apiKey).models.retrieve(MODEL); return true; }

const SYSTEM = `너는 한국 웹툰 연출가이자 이미지 생성 프롬프트 작가다.
입력은 한 씬의 컷 목록이다. 각 컷의 샷·앵글·감정·비율은 연출 엔진이 이미 정했으니 그대로 지킨다.
네 일은 씬 전체를 읽고 추론해서, 이미지 생성 모델(ChatGPT·Gemini)이 한 컷씩 받아도 같은 장면으로 이어지게 컷별 한국어 지시문을 다시 쓰는 것이다.

꼭 할 것
- 연속성: 인물의 위치 관계(누가 화면 어느 쪽, 서로 거리), 손에 든 소품, 의상, 조명 방향, 날씨, 시간대를 컷마다 일관되게 적는다. 앞 컷에서 생긴 것은 다음 컷에도 남긴다.
- 비어 있는 정보 채우기: 원문에 없는 배경 소품, 자세, 시선 방향, 손 위치를 장면 흐름에 맞게 구체적으로 정한다. 원문과 모순되게 지어내지 않는다.
- 감정의 몸 표현: 감정 이름 대신 눈썹·눈꺼풀·입꼬리·어깨·손의 상태로 쓴다. 대사의 괄호 지시(예: 낮게, 다정하게)를 표정과 자세로 옮긴다.
- 카메라: 엔진이 준 샷·앵글·렌즈를 쓰고, 프레임 안 구도(인물이 차지하는 비율, 전경/배경 요소, 시선이 향하는 여백)를 구체적으로 적는다.
- 지면: 대사가 있으면 말풍선 자리, 식자가 있으면 글상자 자리를 비우라고 위치까지 적는다. 이미지 안에 글자·말풍선·효과음 글자는 절대 넣지 않게 한다. 효과음은 동작이나 연출로 표현한다.
- 화풍과 인물 외형은 입력 그대로, 모든 컷에 반복해 적는다(컷 하나만 받아도 그릴 수 있게).

형식
- 각 컷 prompt는 "[컷 n / 전체] 웹툰 한 컷 이미지를 그려줘." 한 줄 뒤에 아래 블록을 이 순서와 제목 그대로 쓴다. 블록 안은 "- " 줄로.
  ■ 출력 규격 — 입력 spec의 비율·크기·표준 비율 안내를 숫자 그대로 옮긴다(바꾸거나 반올림하지 않음). 한 장에 한 컷, 칸 테두리 없이 꽉 차게.
  ■ 화풍
  ■ 참고 이미지 — 사용자는 참고 시트 PNG 한 장(A칸 인물, B칸 장면·색·화풍, C칸 컷별 러프 구도와 '구도 참고' 그림)을 함께 올린다. draft의 이 블록 내용을 그대로 살리고, 시트의 어느 칸을 무엇에 쓰는지 분명히 적는다.
  ■ 연출 의도 — 이 컷의 역할(role), 묶음 목적, 독자가 느낄 것
  ■ 카메라 — 샷, 앵글과 카메라 높이·각도, 렌즈와 심도
  ■ 구도 — 3분할 기준 배치, 인물 크기와 머리 위 여백, 앞·중간·뒤 레이어에 무엇이 있는지, 시선이 처음 닿을 곳
  ■ 인물과 연기 — 인물별 외형 전체, 화면 위치, 몸 방향, 시선 대상, 두 사람 거리, 표정(눈썹·눈꺼풀·입꼬리), 몸(어깨·손·무게중심)
  ■ 동작 — 정확히 어떤 순간을 멈춰 그리는지(동작의 시작/한가운데/끝), 손과 소품의 위치
  ■ 장소·조명 — 구체 배경 소품, 주광 방향과 색, 그림자, 날씨
  ■ 앞뒤 컷과의 이어짐 — trans에 맞는 연결(같은 구도 유지인지, 시점이 바뀌는지, 180도 선), gapAfter에 맞는 마무리(붙임이면 동작 도중, 큰 쉼이면 완결된 그림)
  ■ 비워 둘 자리 — 말풍선·글상자 위치와 크기(화면 비율로)
  ■ 하지 말 것
- 컷마다 최소 25줄 이상, 원문보다 훨씬 구체적으로. 규칙 초안(draft)의 내용은 모두 살리고 더 정확하게 고친다.
- brief는 씬 전체를 한 번에 설명하는 지시문: 화풍, 장소와 시간, 인물별 외형·의상 고정값, 인물 동선(누가 어디서 어디로), 조명 설계, 컷별 비율 목록, 컷 흐름 요약.
- 한국어로 쓴다. 군더더기 인사말 없이 지시문만.`;

const SCHEMA = {
  type: 'object',
  properties: {
    brief: { type: 'string' },
    cuts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { n: { type: 'integer' }, prompt: { type: 'string' } },
        required: ['n', 'prompt'],
        additionalProperties: false,
      },
    },
  },
  required: ['brief', 'cuts'],
  additionalProperties: false,
};

// 공통 호출: 스트리밍 + JSON 스키마 출력 + 거절 시 서버 측 대체 모델
async function run(apiKey, system, schema, userText, onStatus) {
  onStatus?.('Claude가 씬을 읽는 중');
  const stream = client(apiKey).beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // 프롬프트 캐시: 시스템 지시(고정)는 늘, 컷 하나 다시 생성처럼 같은 씬 자료를 거듭 보낼 때는 그 자료 블록까지 캐시
    system: typeof system === 'string' ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : system,
    messages: [{ role: 'user', content: userText }],
  });
  let chars = 0;
  stream.on('text', t => { chars += t.length; onStatus?.(`Claude가 쓰는 중 · ${chars.toLocaleString()}자`); });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('Claude가 이 요청을 거절했어요');
  if (msg.stop_reason === 'max_tokens') throw new Error('응답이 길어 잘렸어요. 컷 수를 줄여 다시 시도해 주세요');
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return { out: JSON.parse(text), model: msg.model, usage: msg.usage };
}

// payload: { title, style, palette, chars:[{name,look}], cuts:[{n, spec, role, trans, gapAfter, shot, angle, lens, emotion, intensity, peak, who, action, dialogs, caption, sfx, story, draft}] }
export async function refine(apiKey, payload, { onStatus } = {}) {
  const r = await run(apiKey, SYSTEM, SCHEMA, `다음 씬의 컷 프롬프트를 다시 써줘. draft는 규칙으로 만든 초안이니 참고만 해.\n\n${JSON.stringify(payload, null, 1)}`, onStatus);
  return { brief: r.out.brief, cuts: r.out.cuts, model: r.model, usage: r.usage };
}

// NovelAI Diffusion V4.5 Full: 기본 프롬프트 + 캐릭터 프롬프트(위치)를 Danbooru 태그로 다시 짠다
const SYSTEM_NAI = `너는 NovelAI Diffusion V4.5 Full로 한국 웹툰을 한 컷씩 그리는 프롬프트를 쓴다. 입력은 한 씬의 모든 컷이고, 각 컷에는 규칙 엔진이 만든 초안(draft)과 그 근거가 붙어 있다. 너의 일은 초안을 원문(action·dialogs)과 연출 근거에 맞게 다듬는 것이다. 앞뒤 컷은 연속성(의상·위치·조명·소품 모양)을 맞추는 데 쓴다.

# 판단 순서(위가 이김)
1. 작가 지시: 컷의 note.
2. 고정값: draft의 focus·샷·앵글·인원·인물 칸(누가 화면에 있는지), props의 고정 태그, 화풍(style).
3. 원문 사실: action(행동 글)·dialogs·caption. 원문에 없는 사건·인물·소품을 지어내지 않는다.
4. 연출 근거: angle·emotion·intensity·peak·story·sceneMood·dbRef·dbNote.
5. 초안의 나머지 태그와 규칙 해석(ruleRead·rulePlace). 맞으면 살리고 틀리면 고친다.

# 입력 필드
- focus: 화면에 무엇을 보이는지. 아래 focus별 규칙을 따른다.
- action: 그 컷의 행동 글(대사 제외). who: 주인공. dialogs·caption·sfx는 이미지에 글자로 넣지 않고 표정·분위기 근거로만 쓴다.
- ruleRead: 규칙이 문장을 절 단위로 읽은 결과. byChar는 인물마다 실제로 하는 동작이다(부정·시도·가정·바람 절, '-지만' 앞 절은 이미 뺐고, '-고'로 이어진 앞 동작은 상태만 남겼다. '우는 준'처럼 다른 인물 앞 꾸밈말은 그 인물 몫). crowd는 이름 없는 무리, together는 둘의 위치 관계(hug from behind·side by side…), whoGuess가 true면 '그/그녀'를 앞 컷 인물로 추측한 것이다.
- ruleDropped: 원문에서 하지 않았거나(안/못/-지 않), 하려다 말았거나, 가정한 동작의 태그다. 그 인물에게 이 태그를 쓰지 않는다. 대신 실제로 한 반응(멈칫함·망설임·참는 표정 등)을 그린다.
- ruleActions: 주인공의 동작 태그(절 해석 뒤). missingAction: 규칙 사전이 못 옮긴 동작 문장 — 반드시 네가 태그로 옮긴다.
- rulePlace: 규칙이 찾은 장소 태그. 비었는데 원문에 장소가 있거나 틀렸으면 고친다.
- dbRef: 이 컷 구도의 근거가 된 실제 상용 웹툰 컷(연출 DB)의 내용·샷·앵글이다. 화면 구성(무엇을 크게, 인물을 어디에, 무엇을 잘라 내는지)만 참고하고, 그 내용·인물·소품은 가져오지 않는다.
- dbNote: 같은 샷·감정의 DB 컷들에서 자주 쓰인 연출(색·명암·여백) 요약. story: 이 컷이 속한 묶음의 흐름·연출 목적·연출명.
- offscreen: 글에 나오지만 화면에는 없는 소품(빛·연기가 나온 출처이거나 언급만 됨). 그 소품 자체(이름·모양 태그)는 쓰지 않고 show에 적힌 것(예: light rays)만 쓴다.
- props: 작가가 #으로 모양을 고정한 소품. 아래 소품 규칙을 따른다.

# focus별 규칙
- scenery: no humans, scenery. 공간·깊이·전경과 후경·건축·시간대와 빛. 화면 밖 화자·나레이션 속 인물·앞 컷 인물은 넣지 않는다. chars는 빈 배열.
- distant: 장소와 넓은 프레임을 먼저. 인물은 복도 끝·길 건너편처럼 작은 크기와 위치로. 헤어·눈동자·표정 클로즈업 태그는 쓰지 않는다. draft.chars의 인원과 거리를 지킨다.
- object: no humans, 핵심 소품, object focus, close-up. 재질·표면·형태·빛. 소유자·손·얼굴·비친 인물을 넣지 않는다. chars는 빈 배열.
- detail: extreme close-up. 보이는 신체 부위와 닿는 물체·동작만. 손발 샷은 head out of frame. 외형 전체를 덧붙이지 않는다. chars는 빈 배열.
- effect: no humans, abstract background. 인물·실제 장소 없이 색·빛·선의 방향과 질감. chars는 빈 배열.
- character: base에는 인원·프레이밍·공간·조명·카메라. 외형·표정·동작·시선은 인물 칸마다 따로. draft.chars에 있는 인물만 쓴다. 등록 인물이 없는 컷은 보이는 사람의 동작을 base에. cell은 A~E(좌→우), 1~5(상→하), 원문 위치와 앞뒤 컷 연속성을 따른다.

# 연출을 태그로
- 초안 draft.base에 있는 카메라·감정·씬 무드 태그는 지우지 않는다.
- angle은 감정 연출이다. 로우앵글은 위압·결의·분노(from below, looking down at viewer, dramatic perspective, foreshortening), 하이앵글은 작고 약하고 외로움(from above, looking up, 넓은 빈 공간). 아이레벨이라도 긴장·당황이 크면 dutch angle. 그 감정이 구도·자세·시선에 보이게.
- emotion·intensity(0~3): 표정·몸짓·조명을 감정에 맞게, 높을수록 강하게(2는 1.15::태그::, 3은 1.3::태그:: 가중치). peak 컷은 dynamic angle·강한 명암으로 씬에서 가장 센 구도.
- sceneMood: 씬 전체의 색감·조명(tags)을 모든 컷에 같게 깔고, 컷의 감정 조명은 그 위에. 시간대와 어긋나는 밝기 태그는 쓰지 않는다.
- story와 앞뒤 컷을 보고 이 컷의 역할(설정·고조·정점·여운)에 맞게 프레이밍과 빛의 세기를 정한다. 같은 샷이 이어지면 앞 컷과 구도가 겹치지 않게 시선·각도·인물 위치를 조금씩 바꾼다.

# 동작·인물
- 원문에서 실제로 한 동작은 빠짐없이 그 사람 칸의 태그로(running, falling, swinging sword, shouting…). 태그가 없으면 짧은 영문 구절. 동작이 있는 컷에서 외형·표정만 쓰지 않는다. 큰 움직임은 motion blur·dynamic pose·full body처럼 움직임이 보이는 프레이밍을 곁들인다.
- 동작의 주인을 바꾸지 않는다: A가 B를 안으면 A 칸에 hugging, B 칸에 being hugged. 둘이 닿는 동작·위치 관계(together)는 base에도 쓴다.
- 인물 외형은 입력 chars의 tags를 기준으로 컷마다 같게. 그 컷에서만 달라진 외형(젖은 머리·찢어진 옷 등)은 원문에 있을 때만.
- 인원 태그(1boy·1girl·2girls…)는 base에만 쓴다. 인물 칸은 boy·girl(숫자 없이)로 시작하고 1boy·solo를 다시 쓰지 않는다. 같은 인원 태그가 두 번 들어가면 모델이 인물을 크게 잡는다.
- 인물 칸 길이는 샷에 맞춘다: 설정·전경은 외형 4~6개(머리색·머리 모양·큰 옷), 눈 색·흉터·귀걸이 같은 얼굴 세부는 쓰지 않는다. 전신·중경은 외형 8~9개, 중경은 신발을 뺀다. 클로즈업은 얼굴·상반신 외형만(하의·신발 제외). 넓은 샷은 base의 샷 태그(wide shot·full body·cowboy shot)를 지우거나 약하게 하지 않는다.

# 소품
- 컷의 props에 이름이 있으면 그 컷 base에 그 소품 태그를 넣고, 모든 컷에서 같은 단어·색·재질로 쓴다. 색·모양·크기를 바꾸거나 수식어를 덧붙이지 않는다. props에 이름이 없는 컷에는 넣지 않는다(앞뒤 컷에 나왔더라도).
- tags가 비어 있는 소품만, look(없으면 세계관·컷 글)에 맞춰 영어 태그 2~6개(사물 이름 + 색·재질·특징)를 정해 응답 props에 돌려주고 그 소품이 나오는 모든 컷에 똑같이 쓴다.

# 배우기
- actions: 규칙 사전에 없던 동작을 새로 옮겼으면 {ko: 한국어 기본형이나 짧은 구(예: 응시하다, 하늘을 올려다보다), tags: 영어 태그 1~3개}. 다른 장면에서도 같은 뜻으로 쓰일 일반적인 동작만. 이름·고유명사·부정형·이 장면에만 맞는 표현은 넣지 않는다.
- places: 사전에 없던 일반적인 장소를 찾았으면 {ko: 장소 낱말(예: 온실, 매표소), tags: 영어 태그 1~3개(indoors/outdoors 포함)}.
- 없으면 빈 배열.

# 쓰는 형식
- 영어 소문자 Danbooru 태그를 쉼표와 공백으로. 핵심 시각 요소를 앞에 둔다.
- base 순서: 인원·화면 구성(focus 태그) → 샷·앵글·카메라 → 장소·배경 → 소품 고정 태그 → 둘의 위치 관계 → 시간·날씨·빛 → 감정 조명·씬 무드 → 화풍 → no text.
- 인물 칸 순서: boy/girl → 외형(샷에 맞게 줄임) → 표정 → 동작·자세 → 시선 → 그 컷의 외형 변화.
- 한국어·따옴표·대사·효과음 글자는 태그에 쓰지 않는다. 같은 태그를 두 번 쓰지 않는다. 물체 배치나 빛 방향에 꼭 필요할 때만 짧은 영문 구절.
- world/lore는 화면에 드러나는 요소만. 사용자가 정한 화풍은 base 뒤쪽에 둔다.

# GPT 이미지용 장면 지시(scene)
- 컷마다 scene에 한국어 2~5문장. 이 컷은 GPT 이미지로 그리고, 캐릭터 얼굴·옷·화풍은 함께 올린 캐릭터 시트가 정한다. 그래서 scene에는 외형을 쓰지 않고 상황만 쓴다.
- 쓰는 것: 누가 화면 어디에(왼쪽·가운데·오른쪽, 앞·뒤) 있고, 무엇을 하고(실제로 한 동작만), 몸 방향·손·시선이 어디를 향하는지, 두 사람이 어떻게 닿아 있는지, 보이는 소품이 어디에 어떻게 있는지, 배경·빛이 어떤지.
- ruleDropped의 동작은 "~하지 않는다"로 분명히 적는다(예: 달리지 않고 멈춰 서 있다). offscreen 소품은 쓰지 않고 show만 쓴다. 인물이 없는 focus면 사람을 쓰지 않는다.
- 카메라(샷·앵글)와 출력 규격·금지 사항은 프로그램이 따로 붙이므로 scene에는 쓰지 않는다.

# 내기 전 점검(컷마다)
1. 원문에서 실제로 한 동작이 그 사람 칸에 있는가, ruleDropped 태그는 없는가.
2. draft.chars에 없는 인물을 넣지 않았는가, 인물이 없는 focus에서 chars가 비었는가.
3. offscreen 소품의 물건 태그가 없고 show 태그만 있는가, props 태그는 컷마다 같은가.
4. 샷·앵글·감정 태그가 살아 있는가, 시간대·장소가 앞뒤 컷과 이어지는가.
돌려준 뒤 프로그램이 1~3을 다시 검사해 어긋난 태그는 지운다. 처음부터 맞게 쓴다.`;
const SCHEMA_NAI = {
  type: 'object',
  properties: {
    cuts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          base: { type: 'string' },
          scene: { type: 'string' },
          chars: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, cell: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E'].flatMap(c => [1, 2, 3, 4, 5].map(r => c + r)) }, prompt: { type: 'string' } },
              required: ['name', 'cell', 'prompt'],
              additionalProperties: false,
            },
          },
        },
        required: ['n', 'base', 'scene', 'chars'],
        additionalProperties: false,
      },
    },
    props: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, tags: { type: 'string' } }, required: ['name', 'tags'], additionalProperties: false } },
    actions: { type: 'array', items: { type: 'object', properties: { ko: { type: 'string' }, tags: { type: 'string' } }, required: ['ko', 'tags'], additionalProperties: false } },
    places: { type: 'array', items: { type: 'object', properties: { ko: { type: 'string' }, tags: { type: 'string' } }, required: ['ko', 'tags'], additionalProperties: false } },
  },
  required: ['cuts', 'props', 'actions', 'places'],
  additionalProperties: false,
};
// payload: { title, sceneMood:{emotion, tags}, world:{name, genre, era, tone, summary, detail, tags}, lore:[{name, category, keywords, description, tags}], props:[{name, look, tags}], style, chars:[{name, gender, tags, look}], cuts:[{n, size, focus, shot, angle, emotion, intensity, peak, role, trans, gapAfter, who, action, ruleActions, ruleRead:{byChar, crowd, together, whoGuess}, ruleDropped, rulePlace, missingAction, dbRef:{id, text, shot, angle}, dbNote, props:[name], offscreen:[{name, show}], dialogs, caption, sfx, story, draft:{base, chars:[{name, cell, prompt}]}}] }
export async function refineNai(apiKey, payload, { onStatus } = {}) {
  const r = await run(apiKey, NAI_SYS, SCHEMA_NAI, sceneBlocks(payload, '위 씬의 모든 컷 NovelAI V4.5 태그를 다시 짜줘.'), onStatus);
  return { cuts: r.out.cuts, props: r.out.props || [], actions: r.out.actions || [], places: r.out.places || [], model: r.model, usage: r.usage };
}


// 작화 프롬프트 생성: 세계관·인물 외형 → NovelAI 화풍 태그 + 인물별 외형 태그(모든 컷에 공통으로 붙는 값)
const SYSTEM_ART = `너는 NovelAI Diffusion V4.5용 태그를 짓는 웹툰 작화 감독이다.
입력은 작품의 세계관과 등장인물(이름·성별·특징 글·지금 외형 태그)이다. 특징 글(look)에는 성격·말투와 태그로 다 못 담은 외형 특징이 섞여 있다. 모든 컷에 공통으로 붙일 두 가지를 만든다.

1) style: 화풍 태그. 영어 태그를 쉼표로, 8~16개.
- 웹툰 채색 방식, 선 굵기, 명암 처리, 색감, 질감, 시대·장르 분위기를 고른다(예: korean webtoon, soft shading, thin lineart, muted colors).
- 인물·장소·표정·구도 태그는 넣지 않는다. masterpiece·best quality 같은 품질 태그도 넣지 않는다.
2) chars: 인물마다 외형 태그. 영어 태그를 쉼표로, 10~20개.
- 1girl·1boy 같은 인원 태그는 넣지 않는다(컷 프롬프트가 컷마다 붙인다).
- 머리 색·길이·모양, 눈 색, 나이대 느낌, 체형, 늘 입는 옷과 장신구, 흉터·안경 같은 고정 특징만.
- 표정·자세·동작·장소·조명은 넣지 않는다(컷마다 바뀌는 값이라 컷 프롬프트에서 정함).
- 특징 글에서는 눈에 보이는 것만 태그로 옮기고, 성격·말투는 태그로 만들지 않는다.
- 글과 태그에 없는 것은 세계관(시대·장르)에 어울리게 정하되, 그 내용과 모순되게 지어내지 않는다.
- 지금 태그가 있으면 그 내용을 살리면서 빠진 고정 특징을 채우고 다듬는다.

입력에 있는 인물만, 같은 이름으로 돌려준다. 설명 문장 없이 태그만.`;
const SCHEMA_ART = {
  type: 'object',
  properties: {
    style: { type: 'string' },
    chars: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, tags: { type: 'string' } }, required: ['name', 'tags'], additionalProperties: false } },
  },
  required: ['style', 'chars'],
  additionalProperties: false,
};
// payload: { world:{...}, style, chars:[{name, gender, look, tags}] }
export async function genArt(apiKey, payload, { onStatus } = {}) {
  const r = await run(apiKey, SYSTEM_ART, SCHEMA_ART, `다음 작품의 화풍 태그와 인물 외형 태그를 만들어줘.\n\n${JSON.stringify(payload, null, 1)}`, s => onStatus?.(s.replace('씬을 읽는', '설정을 읽는')));
  return { style: r.out.style, chars: r.out.chars, model: r.model };
}

export function explain(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'API 키가 맞지 않아요';
  if (err instanceof Anthropic.PermissionDeniedError) return '이 키로는 Claude Opus 5.5를 쓸 수 없어요';
  if (err instanceof Anthropic.NotFoundError) return '이 키로는 Claude Opus 5.5를 찾을 수 없어요';
  if (err instanceof Anthropic.RateLimitError) return '요청이 많아 잠시 막혔어요. 조금 뒤 다시 눌러주세요';
  if (err instanceof Anthropic.APIConnectionError) return '네트워크에 연결하지 못했어요';
  if (err instanceof Anthropic.APIError) return `API 오류 (${err.status ?? ''}) ${err.message}`;
  return err?.message || String(err);
}

// 구성 단계도 NovelAI와 같은 Claude 연결과 오류 처리를 사용한다.
export function requestComposition(apiKey, system, schema, payload, onStatus) {
  return run(apiKey, system, schema, JSON.stringify(payload), status=>onStatus?.(status.replace('씬을 읽는','기획을 읽는')));
}

// 구성안이 나온 직후: 설정집에 없는 인물(엑스트라 포함)·장소·물건·세력을 찾아 캐릭터/세계관 중 어디에 넣을지 제안
const ENT_SYSTEM = `너는 웹툰 설정 정리 담당이다. 입력은 이번 화 구성안(씬 카드와 컷 초안)과 이미 설정집에 있는 캐릭터·세계관 항목이다.
할 일: 구성안에 나오지만 설정집에 아직 없는 것을 모두 찾아, 각각 캐릭터로 둘지 세계관 항목으로 둘지 제안한다.
- 사람은 이름이 없어도(하녀1, 경비병, 점원, 행인들) 컷에 모습이 나오면 후보다. 이미 있는 캐릭터 이름·별칭과 같은 사람은 빼고, 같은 사람을 여러 이름으로 부르면 하나로 묶는다.
- 대사가 있거나 두 컷 이상 나오거나 이야기에 영향을 주는 사람은 suggest를 "char"로. 배경에 한 번 지나가는 무리·직업군(예: 시장 상인들, 기사단 병사들)은 "lore"(cat: faction)로. 아주 사소하면 "skip".
- 장소·건물·물건·조직·용어·사건도 이름이 붙어 있거나 그림에 반복되면 lore 후보(cat: place|faction|item|term|history|rule).
- where: 어떤 상황에 나오는지 사람이 바로 알아보게 "2번 씬 「마차 소리」 3컷 — 에드가에게 떠나냐고 묻는 하녀"처럼 짧게.
- 캐릭터 look: NovelAI·이미지 생성에 바로 쓸 외형(머리·눈·체형·옷차림·나이대)을 한국어 한 줄로. 원문에 없으면 장면·시대·직업에 맞게 정하되 지어낸 티 나는 고유 설정은 넣지 않는다.
- 세계관 항목 desc는 한두 문장, keys는 컷 글에 나올 법한 호칭을 쉼표로, tags는 영어 이미지 태그 몇 개.
- 최대 12개, 중요한 순서로. 없으면 빈 배열.`;
const ENT_SCHEMA = {
  type: 'object',
  properties: { items: { type: 'array', items: { type: 'object', properties: {
    name: { type: 'string' }, suggest: { type: 'string', enum: ['char', 'lore', 'skip'] }, where: { type: 'string' }, reason: { type: 'string' },
    body: { type: 'string', enum: ['female', 'male', 'other'] }, aliases: { type: 'string' }, look: { type: 'string' },
    cat: { type: 'string', enum: ['place', 'faction', 'item', 'term', 'history', 'rule'] }, keys: { type: 'string' }, desc: { type: 'string' }, tags: { type: 'string' },
  }, required: ['name', 'suggest', 'where', 'reason', 'body', 'aliases', 'look', 'cat', 'keys', 'desc', 'tags'], additionalProperties: false } } },
  required: ['items'], additionalProperties: false,
};
// payload: { cast:[{name,aliases}], lore:[{name,keys}], world:{…}, cards:[{n,title,cuts:[…]}] }
export async function findEntities(apiKey, payload, { onStatus } = {}) {
  const r = await run(apiKey, ENT_SYSTEM, ENT_SCHEMA, JSON.stringify(payload), s => onStatus?.(s.replace('씬을 읽는', '등장인물·설정을 찾는')));
  return { items: r.out.items || [], model: r.model };
}

// 설정집에 새로 넣은 인물: 구성안·씬 글에서 그 인물이 나오는 대목을 읽고 외형 태그(NovelAI)·특징 글·성별을 추론
const INFER_SYSTEM = `너는 웹툰 캐릭터 설정 담당이다. 입력은 세계관, 이미 있는 등장인물(외형 태그 예시), 이번 화 구성안 요약, 그리고 새로 추가한 인물들이 나오는 컷 글(mentions)이다.
새 인물마다 세 가지를 정한다.
1) body: female 또는 male. 글의 호칭·대사·직업에서 판단하고, 정말 모르면 이야기에 자연스러운 쪽.
2) tags: NovelAI V4.5용 외형 태그. 영어 소문자 Danbooru 태그를 쉼표로, 10~18개. 1girl·1boy 같은 인원 태그는 넣지 않는다.
   머리 색·길이·모양, 눈 색, 나이대 느낌(young man, old man, child 등), 체형, 늘 입는 옷과 장신구, 흉터·안경 같은 고정 특징만. 표정·자세·장소·조명은 넣지 않는다.
   글에 나온 외모·옷·직업·신분을 먼저 반영하고, 없는 것은 세계관의 시대·장르와 이 인물의 역할에 어울리게 정한다. 이미 있는 인물과 머리 색·옷이 겹쳐 헷갈리지 않게 한다.
3) look: 특징 글(한국어 3~5문장). 이 인물이 이야기에서 맡은 역할, 성격, 말투, 버릇, 다른 인물과의 관계를 글에 근거해 쓰고, 태그로 다 못 담는 외형 특징(분위기·체격·흉터)을 덧붙인다. 글에 없는 큰 비밀이나 과거사는 지어내지 않는다.
입력에 있는 새 인물만, 같은 이름으로 돌려준다.`;
const INFER_SCHEMA = { type: 'object', properties: { chars: { type: 'array', items: { type: 'object', properties: {
  name: { type: 'string' }, body: { type: 'string', enum: ['female', 'male'] }, tags: { type: 'string' }, look: { type: 'string' },
}, required: ['name', 'body', 'tags', 'look'], additionalProperties: false } } }, required: ['chars'], additionalProperties: false };
// payload: { world, cast:[{name, gender, tags}], plan:{prompt, cards:[{n,title,purpose}]}, chars:[{name, mentions:[…]}] }
export async function inferChars(apiKey, payload, { onStatus } = {}) {
  const r = await run(apiKey, INFER_SYSTEM, INFER_SCHEMA, `새로 추가한 인물의 외형 태그와 특징 글을 정해줘.\n\n${JSON.stringify(payload, null, 1)}`, s => onStatus?.(s.replace('씬을 읽는', '인물을 읽는')));
  return { chars: r.out.chars || [], model: r.model };
}

// 설정집 빈 칸 채우기: 채워진 캐릭터·세계관·설정 항목과 구성안·씬 글을 근거로 비어 있는 칸만 제안
const FILL_SYSTEM = `너는 웹툰 설정집 정리 담당이다. 입력은 작품의 설정집(캐릭터·세계관 개요·설정 항목)과 이번 화 구성안 요약, 씬 컷 글이다. 각 칸이 빈 문자열이면 비어 있는 칸이다.
할 일: 비어 있는 칸만 채울 값을 제안한다. 이미 채워진 칸은 근거로만 쓰고 고쳐 쓰지 않는다(돌려줄 때 그 칸은 빈 문자열).
근거 순서: 1) 이미 채워진 설정집 내용 2) 씬 컷 글과 구성안에 나온 사실 3) 세계관의 시대·장르·분위기에 어울리는 추론. 서로 모순되게 지어내지 않고, 근거가 약한 큰 비밀·과거사는 만들지 않는다.
캐릭터
- tags: NovelAI V4.5 외형 태그. 영어 소문자 Danbooru 태그를 쉼표로 10~18개. 1girl·1boy 같은 인원 태그, 표정·자세·장소·조명은 넣지 않는다. 머리·눈·나이대·체형·늘 입는 옷·장신구·고정 특징만. 다른 인물과 헷갈리지 않게.
- look: 특징 글(한국어 3~5문장). 역할, 성격, 말투, 버릇, 관계, 태그로 못 담는 외형 특징.
- aliases: 글에서 이 인물을 부르는 다른 호칭(도련님, 에드 등)만 쉼표로. 없으면 빈 문자열.
세계관 개요(world): name·genre·era·tone은 짧게, summary는 2~3문장, detail은 이야기에 필요한 규칙·사회·장소를 5~10문장, tags는 영어 이미지 태그 6~12개(배경·시대·분위기).
설정 항목(lore): 이미 있는 항목의 빈 keys(컷 글에 나올 법한 호칭을 쉼표로)·desc(한두 문장)·tags(영어 이미지 태그 몇 개)만. 새 항목은 만들지 않는다.
입력에 있는 캐릭터·항목만, 같은 이름으로 돌려준다.`;
const FILL_SCHEMA = { type: 'object', properties: {
  chars: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, aliases: { type: 'string' }, tags: { type: 'string' }, look: { type: 'string' } }, required: ['name', 'aliases', 'tags', 'look'], additionalProperties: false } },
  world: { type: 'object', properties: { name: { type: 'string' }, genre: { type: 'string' }, era: { type: 'string' }, tone: { type: 'string' }, summary: { type: 'string' }, detail: { type: 'string' }, tags: { type: 'string' } }, required: ['name', 'genre', 'era', 'tone', 'summary', 'detail', 'tags'], additionalProperties: false },
  lore: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, keys: { type: 'string' }, desc: { type: 'string' }, tags: { type: 'string' } }, required: ['name', 'keys', 'desc', 'tags'], additionalProperties: false } },
}, required: ['chars', 'world', 'lore'], additionalProperties: false };
// payload: { chars:[{name, gender, aliases, tags, look}], world:{…}|null, lore:[{name, category, keys, desc, tags}], plan, scenes:[{title, cuts:[…]}] }
export async function fillSetbook(apiKey, payload, { onStatus } = {}) {
  const r = await run(apiKey, FILL_SYSTEM, FILL_SCHEMA, `설정집의 비어 있는 칸을 채울 값을 제안해줘.\n\n${JSON.stringify(payload, null, 1)}`, s => onStatus?.(s.replace('씬을 읽는', '설정집을 읽는')));
  return { ...r.out, model: r.model };
}

// 컷 하나만 다시 생성: 씬 전체는 연속성 확인용으로 주고, only의 컷만 반환하게 함. request는 작가가 적은 방향
// 시스템 지시와 씬 자료는 앞에(캐시), 바뀌는 요청은 뒤에 — 같은 씬에서 컷을 여러 번 다시 만들 때 앞부분은 캐시에서 읽음
const sceneBlocks = (payload, ask) => [{ type: 'text', text: `씬 자료:\n${JSON.stringify(payload, null, 1)}`, cache_control: { type: 'ephemeral' } }, { type: 'text', text: ask }];
const NAI_SYS = [{ type: 'text', text: SYSTEM_NAI, cache_control: { type: 'ephemeral' } }];
const onlyAsk = ns => `\n이번에는 cuts 중 n=${ns.join(', ')}인 컷만 쓴다. 반환 cuts에는 그 컷만 넣는다. 다른 컷은 앞뒤 연속성(의상·위치·조명)을 맞추는 데만 쓴다. 작가 요청이 있으면 그 컷의 샷·인원 같은 draft 값은 지키면서 요청을 가장 먼저 반영한다.`;
export async function refineNaiCut(apiKey, payload, n, request, { onStatus } = {}) {
  const r = await run(apiKey, NAI_SYS, SCHEMA_NAI, sceneBlocks(payload, `위 씬에서 ${n}번 컷의 NovelAI V4.5 태그만 다시 짜줘.${onlyAsk([n])}${request ? `\n작가 요청: ${request}` : ''}`), onStatus);
  const cut = (r.out.cuts || []).find(c => c.n === n) || (r.out.cuts || [])[0];
  if (!cut) throw new Error('그 컷의 프롬프트가 오지 않았어요');
  return { cut: { ...cut, n }, props: r.out.props || [], actions: r.out.actions || [], places: r.out.places || [], model: r.model };
}
// 씬 생성 응답에서 빠진 컷만 한 번 더(씬 자료는 같아서 캐시를 탐)
export async function refineNaiCuts(apiKey, payload, ns, { onStatus } = {}) {
  const r = await run(apiKey, NAI_SYS, SCHEMA_NAI, sceneBlocks(payload, `위 씬에서 ${ns.join(', ')}번 컷의 NovelAI V4.5 태그만 짜줘. 앞서 받은 응답에 이 컷들이 빠져 있었다.${onlyAsk(ns)}`), onStatus);
  return { cuts: (r.out.cuts || []).filter(c => ns.includes(c.n)), props: r.out.props || [], actions: r.out.actions || [], places: r.out.places || [], model: r.model };
}
