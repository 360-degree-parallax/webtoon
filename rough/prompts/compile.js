'use strict';

const Engine = require('../engine.js');
const { patterns } = require('../patterns.json');
const color = require('../references/green-midnight/index.json').items;
const creative = require('../references/creative/green-midnight-closeups/index.json').items;
const WIDTH = 690;
const MAX_CUTS = 30;
const STYLES = {
  green: '거친 연필선과 넓은 색면의 한국 웹툰 컬러 러프. 숲빛 녹색, 차콜과 낮은 채도의 웜그레이를 기본으로 하고, 명암은 큰 덩어리로 정리한다.',
  neutral: '거친 연필선과 넓은 색면의 한국 웹툰 컬러 러프. 종이색과 웜그레이를 기본으로 하고 초점에만 포인트 컬러를 둔다.',
  ink: '거친 연필선과 넓은 흑백 명암의 한국 웹툰 콘티. 선 굵기는 초점과 외곽에서만 달라지고 배경은 세 명암으로 단순화한다.',
};
const SHOTS = {
  설정: '장소와 인물의 진입 방향이 한눈에 잡히도록 공간을 먼저 보여준다.',
  전경: '공간과 인물의 거리 관계를 한 프레임 안에 담고 인물 실루엣을 서로 겹치지 않게 둔다.',
  전신: '머리부터 발끝까지 담아 무게 중심과 동작 방향이 읽히게 한다.',
  중경: '상반신 중심으로 시선과 손의 동작이 한 프레임 안에서 읽히게 한다.',
  클로즈업: '얼굴이나 반응을 프레임에 크게 두고 눈·눈썹·입 주변에 선을 집중한다.',
  디테일: '행동을 설명하는 손이나 소품 한 곳을 크게 잡고 주변은 넓은 색면으로 정리한다.',
  '효과 배경': '배경을 큰 면으로 정리해 장면의 감정이나 움직임 방향을 강조한다.',
};
const ANGLES = {
  아이레벨: '인물의 눈높이에서 본다.',
  하이앵글: '위에서 비스듬히 내려다본다.',
  로우앵글: '피사체보다 낮은 위치에서 올려다본다.',
  탑뷰: '정수리 위에서 수직으로 내려다본다.',
};
const ROLES = {
  설정: '배경의 큰 윤곽과 인물의 위치가 먼저 읽히게 한다.',
  전개: '행동의 시작점과 진행 방향을 한눈에 읽히게 한다.',
  공개: '공개되는 대상 하나를 가장 먼저 읽히게 한다.',
  반응: '시선을 받는 인물의 표정이나 멈춘 몸짓을 중심에 둔다.',
  전환: '직전 컷과 다른 공간·시간의 단서를 먼저 보여준다.',
};
const NOTES = {
  'GM-06-009': '인물을 오른쪽의 좁은 프레임에 두고 왼쪽을 비워 시선을 인물 쪽으로 끌어간다.',
  'GM-06-010': '인물을 세로 프레임에 담아 어깨를 비스듬히 돌리고, 시선은 화면 밖에 둔다.',
  'GM-06-012': '긴 세로 프레임 위쪽에 넉넉한 공간을 두고 두 인물을 하단에 겹쳐 배치한다.',
  'GM-06-013': '프레임 오른쪽에 얼굴 절반을 걸치고 왼쪽에는 넓은 차콜 그림자를 둔다.',
  'GM-07-010': '창틀의 긴 수직선과 인물들이 움직이는 아래쪽 영역을 대비시킨다.',
  'GM-07-011': '대각선 격자 바닥 위에 핵심 소품의 윤곽이 한 번에 읽히게 한다.',
  'GM-07-012': '서로 다른 높이의 두 시선이 화면 아래쪽을 향하게 배치한다.',
  'GM-07-014': '세로 프레임의 한쪽에 인물의 표정을 두고 반대편과 아래로 어두운 여백을 이어간다.',
};

const LIGHT = {
  'GM-06-009': '탁한 숲빛 배경에 얼굴과 밝은 셔츠를 따뜻한 명암으로 분리한다.',
  'GM-06-010': '낮은 채도의 녹색 배경 위에 머리와 어깨의 윤곽만 밝게 남긴다.',
  'GM-06-012': '위쪽 배경을 짙은 숲빛으로 눌러 두 인물의 머리와 얼굴이 먼저 보이게 한다.',
  'GM-06-013': '낮은 채도의 보라빛 차콜과 밝은 살빛을 크게 나눈다.',
  'GM-07-010': '회백색 창빛을 큰 면으로 두고 인물의 따뜻한 갈색 실루엣을 아래에 둔다.',
  'GM-07-011': '갈색 바닥을 눌러 밝은 소품과 좁은 붉은 포인트가 먼저 보이게 한다.',
  'GM-07-012': '실내를 웜그레이로 낮추고 머리색과 반응이 미묘하게 살아나도록 한다.',
  'GM-07-014': '인물 쪽의 누른 창빛이 바깥의 검은 여백과 대비되고 아래로 옅어진다.',
};

const refs = [
  ...color.map(ref => ({ ...ref, id: ref.source_cut, kind: 'color', path: 'green-midnight/' + ref.file })),
  ...creative.map(ref => ({ ...ref, kind: 'cre', path: 'creative/green-midnight-closeups/' + ref.file })),
];
const refById = new Map(refs.map(ref => [ref.id, ref]));

function publicRef(ref) {
  return ref && {
    id: ref.id, kind: ref.kind, shot: ref.shot, angle: ref.angle, ratio: ref.h_ratio,
    composition: NOTES[ref.id] || ref.composition || '', lighting: LIGHT[ref.id] || '',
    image: '/rough/references/' + ref.path,
  };
}

function readBeats(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const letter = [];
    let framing = '';
    // Consume dialogue and bracketed directions in reading order.
    const visual = line.replace(/\[(내레이션|효과음|구도)\s*[:：]\s*([^\]]+)\]|"([^"]+)"|“([^”]+)”/g, (_, key, value, straight, curly) => {
      if (key === '구도') framing = value.trim();
      else letter.push({ kind: key || '대사', text: (value ?? straight ?? curly).trim() });
      return '';
    }).trim();
    const bar = visual.indexOf('|');
    const who = bar < 0 ? '' : visual.slice(0, bar).trim();
    const action = (bar < 0 ? visual : visual.slice(bar + 1)).trim();
    return { who, action, framing, letter: letter.filter(item => item.text) };
  });
}

function referenceFor(cut, id) {
  if (id) return { ref: refById.get(id), match: 'manual' };
  const ref = Engine.suggestRef(cut, refs);
  return { ref, match: ref?.source_cut === cut.src ? 'exact' : ref ? 'similar' : null };
}

function lettering(beat, cut) {
  const side = cut.shot === '클로즈업' || cut.shot === '디테일' ? 'left' : 'right';
  const anchors = {
    '대사': { x: side === 'left' ? 10 : 61, y: 10, label: side === 'left' ? '상단 왼쪽' : '상단 오른쪽' },
    '내레이션': { x: 12, y: 6, label: '상단 왼쪽' },
    '효과음': { x: 75, y: 74, label: '하단 오른쪽' },
  };
  const counts = new Map();
  return beat.letter.map(item => {
    const anchor = anchors[item.kind];
    const count = counts.get(item.kind) || 0;
    counts.set(item.kind, count + 1);
    const lineOffset = count * 9 + (item.kind === '대사' && side === 'left' && beat.letter.some(entry => entry.kind === '내레이션') ? 13 : 0);
    const y = Math.min(94, anchor.y + lineOffset);
    return { ...item, ...(item.kind === '대사' && beat.who ? { speaker: beat.who } : {}), x: anchor.x, y,
      position: anchor.label + (lineOffset ? '에서 아래로' : '') };
  });
}

function compile({ script, scene = '', cast = '', style = 'green', overrides = {} }) {
  if (typeof script !== 'string' || script.length > 16000 || !script.trim())
    throw new Error('장면을 16,000자 이내로 입력해주세요.');
  if (typeof scene !== 'string' || scene.length > 1200 || typeof cast !== 'string' || cast.length > 1600)
    throw new Error('공간·빛은 1,200자, 캐릭터 설정은 1,600자까지 입력할 수 있어요.');
  if (!Object.hasOwn(STYLES, style) || !overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    throw new Error('프롬프트 설정을 확인해주세요.');
  const beats = readBeats(script);
  if (!beats.length || beats.length > MAX_CUTS) throw new Error('한 번에 1~30컷까지 작성할 수 있어요.');
  if (beats.some(beat => !beat.who && !beat.action && !beat.letter.length && !beat.framing))
    throw new Error('인물이나 행동이 비어 있는 줄을 확인해주세요.');
  for (const [index, id] of Object.entries(overrides)) {
    if (!/^(0|[1-9]\d*)$/.test(index) || +index >= beats.length || !refById.has(id))
      throw new Error('지정한 참고 컷을 확인해주세요.');
  }

  const castLines = cast.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const modelInput = beats.map(beat => {
    const speech = beat.letter.find(item => item.kind === '대사');
    return [beat.who, (beat.action || beat.framing || '말하는 인물이 화면에 머무름') + (speech ? ` “${speech.text}”` : '')].join(' | ');
  }).join('\n');
  const panels = [];
  const chapters = [];
  let y = 0;
  for (const analysis of Engine.analyze(modelInput)) {
    const { p, pct } = Engine.rank(analysis, patterns, 1)[0];
    chapters.push({ from: panels.length + 1, count: analysis.beats.length, pattern: p.src + '-' + p.id,
      name: p.name, similarity: pct, pace: analysis.tempo, curve: analysis.curve, goal: analysis.goal });
    for (const cut of Engine.layout(analysis, p)) {
      const i = panels.length;
      const beat = beats[i];
      const { ref, match } = referenceFor(cut, overrides[i]);
      if (match === 'manual') {
        cut.shot = ref.shot;
        cut.ang = ref.angle;
        cut.h = ref.h_ratio;
      }
      const height = Math.round(cut.h * WIDTH);
      const gap = i === beats.length - 1 ? 0 : Math.round(cut.gap * WIDTH);
      const letter = lettering(beat, cut);
      const descriptions = castLines.filter(line => {
        const name = line.split(/\s*[|:：]\s*/, 1)[0];
        return !/[|:：]/.test(line) || name === beat.who || (name && beat.action.includes(name));
      });
      const useRefDetails = ref && ref.shot === cut.shot && ref.angle === cut.ang;
      const composition = beat.framing || (useRefDetails
        ? (NOTES[ref.id] || (ref.composition ? `${ref.composition} 구도를 사용한다.` : '')) : '');
      const previous = panels.at(-1);
      const distance = previous && previous.chapter === chapters.length && previous.shot !== cut.shot
        ? `직전 컷의 ${previous.shot}에서 이번 컷의 ${cut.shot}로 전환한다.` : '';
      const subject = [beat.who, beat.action].filter(Boolean).join(' · ') || '장면의 중심이 되는 피사체';
      const reserve = [...new Set(letter.map(item => item.position.replace(/에서 아래로$/, '')))].join('·');
      const image = [
        `웹툰 한 컷. ${subject}.`,
        [`${cut.shot} · ${cut.ang}. ${ANGLES[cut.ang] || ''}`, composition || SHOTS[cut.shot], ROLES[cut.role]].filter(Boolean).join(' '),
        `감정은 ${cut.emo}. ${cut.i >= 2 ? '표정 또는 몸짓 한 곳에 긴장을 모은다.' : '표정과 몸짓은 절제한다.'}`,
        scene.trim() ? `공간·조명·색: ${scene.trim()}` : useRefDetails && style === 'green' && LIGHT[ref.id],
        descriptions.length
          ? `인물 연속성: ${descriptions.join(' / ')}. 컷 사이에 얼굴·헤어·복식을 유지한다.`
          : beat.who && beats.some((other, j) => j !== i && other.who === beat.who) && `이 장면의 ${beat.who}는 컷 사이에 얼굴·헤어·복식을 유지한다.`,
        `${STYLES[style]}${scene.trim() ? ' 색과 빛은 장면 입력을 우선한다.' : useRefDetails && style === 'green' && LIGHT[ref.id] ? ' 색과 빛은 참고 컷의 묘사를 우선한다.' : ''}`,
        `화면 비율 가로:세로 ${WIDTH}:${height}. ${reserve ? `${reserve}의 식자 예정 영역은 낮은 대비로 비워 인물의 눈이나 핵심 소품을 겹치지 않게 한다. ` : ''}생성 이미지에는 글자, 말풍선, 효과음, 페이지 번호를 그리지 않는다.`,
      ].filter(Boolean).join('\n');
      const layout = [
        `컷 ${i + 1} · x 0 / y ${y} / ${WIDTH}×${height}px`,
        gap ? `다음 컷까지 여백 ${gap}px.` : '장면의 마지막 컷.',
        distance,
        letter.length ? letter.map(item => `${item.kind} ${item.position} (x ${item.x}%, y ${item.y}%)${item.speaker ? ` · ${item.speaker}` : ''} «${item.text}»`).join('\n') : '식자 없음.',
      ].filter(Boolean).join('\n');
      panels.push({ number: i + 1, chapter: chapters.length, title: subject, sourceCut: cut.src,
        shot: cut.shot, angle: cut.ang, emotion: cut.emo, role: cut.role, image, layout, letter,
        frame: { x: 0, y, width: WIDTH, height, gapAfter: gap }, reference: publicRef(ref), match });
      y += height + gap;
    }
  }
  return { width: WIDTH, height: y, chapters, panels };
}

module.exports = { compile, references: refs.map(publicRef), MAX_CUTS };
