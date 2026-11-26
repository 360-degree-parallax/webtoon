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
    system,
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
const SYSTEM_NAI = `너는 NovelAI Diffusion V4.5 Full로 한국 웹툰 한 컷씩을 그리는 프롬프트를 쓴다. 같은 씬의 다른 컷은 연속성을 확인하는 데 사용한다. draft에 이미 정해진 프레이밍과 인원은 유지한다.

컷의 focus에 맞춰 base와 chars를 작성한다.
- scenery: no humans, scenery. 화면에 보이는 공간, 깊이, 전경·후경, 건축, 시간대와 빛을 구체화한다. 화면 밖 화자, 나레이션에 언급된 인물, 이전 컷 인물은 넣지 않는다. chars는 빈 배열.
- distant: 장소와 넓은 프레임을 먼저 쓴다. 인물은 복도 끝, 길 건너편 등 작은 크기와 위치로 묘사한다. 인물 클로즈업·헤어·눈동자·표정을 강조하지 않는다. draft.chars의 인원과 원경 거리를 유지한다.
- object: no humans, 핵심 소품, object focus, close-up. 소품의 재질·표면·형태·빛을 묘사한다. 소유자, 손, 얼굴, 거울에 비친 인물을 추가하지 않는다. chars는 빈 배열.
- detail: extreme close-up. 화면에 보이는 신체 부위와 닿는 물체·동작만 쓴다. 손발 샷은 head out of frame. 외형 전체를 덧붙이지 않는다. chars는 빈 배열.
- effect: no humans, abstract background. 인물이나 실제 장소의 묘사 없이 색, 빛, 선의 방향과 질감을 쓴다. chars는 빈 배열.
- character: base에는 인원·프레이밍·공간·조명. 외형·표정·동작·시선은 캐릭터마다 분리한다. draft.chars에서 화면에 보이는 인물만 사용한다. 등록 인물이 없는 경우 컷에 보이는 사람의 동작을 base에 쓴다. cell은 A~E(좌→우), 1~5(상→하)이며 원문 위치와 연속성을 따른다.

영어 소문자 태그를 쉼표와 공백으로 구분한다. 핵심 시각 요소를 앞에 둔다. 물체 배치나 빛의 방향에 필요하면 짧은 영문 구절을 추가한다. 샷·앵글·해상도는 입력을 따른다. world/lore의 정보는 화면에 드러나는 요소만 쓴다. 대사·나레이션·효과음은 이미지에 쓰지 않는다. 사용자가 정한 화풍은 기본 프롬프트 뒤에 둔다.`;
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
        required: ['n', 'base', 'chars'],
        additionalProperties: false,
      },
    },
  },
  required: ['cuts'],
  additionalProperties: false,
};
// payload: { title, world:{name, genre, era, tone, summary, detail, tags}, lore:[{name, category, keywords, description, tags}], style, chars:[{name, gender, tags, look}], cuts:[{n, size, focus, shot, angle, emotion, intensity, peak, role, trans, gapAfter, who, action, dialogs, caption, sfx, story, draft:{base, chars:[{name, cell, prompt}]}}] }
export async function refineNai(apiKey, payload, { onStatus } = {}) {
  const r = await run(apiKey, SYSTEM_NAI, SCHEMA_NAI, `다음 씬의 NovelAI V4.5 태그를 다시 짜줘.\n\n${JSON.stringify(payload, null, 1)}`, onStatus);
  return { cuts: r.out.cuts, model: r.model, usage: r.usage };
}


// 작화 프롬프트 생성: 세계관·인물 외형 → NovelAI 화풍 태그 + 인물별 외형 태그(모든 컷에 공통으로 붙는 값)
const SYSTEM_ART = `너는 NovelAI Diffusion V4.5용 태그를 짓는 웹툰 작화 감독이다.
입력은 작품의 세계관과 등장인물(이름·성별·외형 글·지금 태그)이다. 모든 컷에 공통으로 붙일 두 가지를 만든다.

1) style: 화풍 태그. 영어 태그를 쉼표로, 8~16개.
- 웹툰 채색 방식, 선 굵기, 명암 처리, 색감, 질감, 시대·장르 분위기를 고른다(예: korean webtoon, soft shading, thin lineart, muted colors).
- 인물·장소·표정·구도 태그는 넣지 않는다. masterpiece·best quality 같은 품질 태그도 넣지 않는다.
2) chars: 인물마다 외형 태그. 영어 태그를 쉼표로, 10~20개.
- 1girl·1boy 같은 인원 태그는 넣지 않는다(컷 프롬프트가 컷마다 붙인다).
- 머리 색·길이·모양, 눈 색, 나이대 느낌, 체형, 늘 입는 옷과 장신구, 흉터·안경 같은 고정 특징만.
- 표정·자세·동작·장소·조명은 넣지 않는다(컷마다 바뀌는 값이라 컷 프롬프트에서 정함).
- 외형 글에 없는 것은 세계관(시대·장르)에 어울리게 정하되, 외형 글과 모순되게 지어내지 않는다.
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
