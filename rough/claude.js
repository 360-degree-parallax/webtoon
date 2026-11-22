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

// payload: { title, style, palette, chars:[{name,look}], cuts:[{n, shot, angle, lens, emotion, intensity, peak, ratio, who, action, dialogs, caption, sfx, story, draft}] }
export async function refine(apiKey, payload, { onStatus } = {}) {
  onStatus?.('Claude가 씬을 읽는 중');
  const stream = client(apiKey).beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: `다음 씬의 컷 프롬프트를 다시 써줘. draft는 규칙으로 만든 초안이니 참고만 해.\n\n${JSON.stringify(payload, null, 1)}` }],
  });
  let chars = 0;
  stream.on('text', t => { chars += t.length; onStatus?.(`Claude가 쓰는 중 · ${chars.toLocaleString()}자`); });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('Claude가 이 요청을 거절했어요');
  if (msg.stop_reason === 'max_tokens') throw new Error('응답이 길어 잘렸어요. 컷 수를 줄여 다시 시도해 주세요');
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const out = JSON.parse(text);
  return { brief: out.brief, cuts: out.cuts, model: msg.model, usage: msg.usage };
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
