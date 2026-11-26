#!/usr/bin/env node
// 러프 툴 핵심 회귀 테스트(브라우저). 사용: node tests/e2e/run.js [이름 일부]
// 저장소 루트에서 정적 서버를 띄우고 Chromium으로 rough/index.html을 열어 주요 흐름을 확인함. 하나라도 실패하면 종료 코드 1
const {chromium} = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.csv': 'text/csv; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'};
function serve() {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); r.end(b); });
    }).listen(0, () => res(s));
  });
}
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const T = [];
const test = (name, fn) => T.push({name, fn});

// ---------- 시나리오 ----------
test('처음 열기: 오류 없음 · 단계 5개 · 씬 화면', async ({p, ev}) => {
  assert((await ev(() => [...document.querySelectorAll('.topnav [data-view]')].map(b => b.textContent.replace(/\d/g, '')).join(','))) === '설정집,구성,씬,콘티,편집', '상단 단계');
  assert(await ev(() => VIEW === 'write'), '첫 화면은 씬');
  assert((await ev(() => CUTS.length)) > 0, '컷이 있음');
});
test('설정집: 하위 탭 · 마지막 탭 기억 · 이동 바', async ({p, ev}) => {
  await p.click('.topnav [data-view=setbook]'); await p.waitForTimeout(300);
  assert(await ev(() => VIEW === 'chars'), '설정집 → 캐릭터');
  await p.click('#v-chars .sbtabs [data-view=world]'); await p.waitForTimeout(300);
  await p.click('.topnav [data-view=plan]'); await p.waitForTimeout(300);
  await p.click('.topnav [data-view=setbook]'); await p.waitForTimeout(300);
  assert(await ev(() => VIEW === 'world'), '마지막 하위 탭(세계관) 기억');
  await p.click('.stepnav .sn-next'); await p.waitForTimeout(300);
  assert(await ev(() => VIEW === 'plan'), '이동 바 다음 → 구성');
  await p.keyboard.press('Alt+Shift+ArrowRight'); await p.waitForTimeout(300);
  assert(await ev(() => VIEW === 'write'), 'Alt+Shift+→ → 씬');
});
test('씬 글 고치기 → 저장 → 다시 열어도 남음', async ({p, ev}) => {
  await ev(() => showView('write')); await p.waitForTimeout(400);
  const ta = await p.$('#cutlist li[data-i="0"] .cutin'); await ta.click(); await p.keyboard.press('End'); await p.keyboard.type(' 테스트문장');
  await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(2200);
  assert((await ev(() => SCENES[0].cuts[0])).includes('테스트문장'), '새로 고친 뒤에도 글이 남아 있음');
});
test('편집에서 지운 식자·컷이 씬 화면에 반영', async ({p, ev}) => {
  await ev(() => showView('webtoon')); await p.waitForTimeout(1500);
  const before = await ev(() => SCENES[0].cuts.length);
  await ev(() => RoughWS.deleteLetterEls([...document.querySelectorAll('#reader [data-slot-index]')].filter(g => pageKey(g) === '0:0').flatMap(g => [...g.querySelectorAll('[data-letter]')])));
  await ev(() => selectPageCut([...document.querySelectorAll('#reader [data-slot-index]')].find(g => pageKey(g) === '0:2'))); await p.keyboard.press('Delete'); await p.waitForTimeout(500);
  await p.click('.topnav [data-view=write]'); await p.waitForTimeout(600);
  assert((await ev(() => document.querySelectorAll('#cutlist li').length)) === before - 1, '씬 화면 컷 수가 줄어듦');
  assert(await ev(() => document.querySelector('#cutlist .cutin').value === SCENES[0].cuts[0]), '씬 화면 글 = 원고');
});
test('효과음 추천 칩 → 컷에 넣기', async ({p, ev}) => {
  await ev(() => showView('write')); await p.waitForTimeout(800);
  const li = await ev(() => [...document.querySelectorAll('#cutlist li')].find(l => l.querySelector('[data-sfxadd]'))?.dataset.i);
  assert(li != null, '추천 칩이 있는 컷');
  const w = await ev(i => document.querySelector(`#cutlist li[data-i="${i}"] [data-sfxadd]`).dataset.sfxadd, li);
  await p.click(`#cutlist li[data-i="${li}"] [data-sfxadd]`); await p.waitForTimeout(500);
  assert((await ev(i => CUTS[i], +li)).includes(`-${w}-`), '효과음이 글에 들어감');
});
test('설정집에 없는 인물 → 추가', async ({p, ev}) => {
  await ev(() => showView('write')); await p.waitForTimeout(500);
  const ta = await p.$('#cutlist li[data-i="1"] .cutin'); await ta.click(); await p.keyboard.press('End'); await p.keyboard.type(' @테스트인물은 웃는다.'); await p.waitForTimeout(900);
  await p.click('#cutlist li[data-i="1"] .newchar [data-sug]'); await p.waitForTimeout(400);
  assert(await ev(() => CHARS.some(c => c.name === '테스트인물')), '설정집에 추가됨');
});
test('편집: 효과선·배경 줄 → 수정 카드 · Esc로 풀기', async ({p, ev}) => {
  await ev(() => showView('webtoon')); await p.waitForTimeout(1500);
  await ev(() => { const st = pageSettings(true, '0:1'); st.transition = 2; st.materialLines = {focus: {kind: 'focus', x: .5, y: .5, angle: 0, color: '#27211e', density: 50}}; saveScenes(); renderWebtoon(); editTree(); });
  await p.click('#wtoc [data-tcut="0:1"]'); await p.waitForTimeout(300);
  await p.click('#wtoc [data-tlayer="0:1|line:focus"]'); await p.waitForTimeout(300);
  assert(await ev(() => document.querySelector('.lcard2')?.dataset.kind === 'line' && !document.querySelector('.lcard2').hidden), '효과선 카드');
  await p.click('.lcard2 [data-p=kind][data-v=speed]'); await p.waitForTimeout(300);
  assert(await ev(() => !!SCENES[0].pageEdits[1].materialLines.speed), '집중선 → 속도선');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  assert(await ev(() => !selectedLetter && !window.layerPart), 'Esc로 선택 풀림');
});
test('레퍼런스 필터(인물 수·시선)', async ({p, ev}) => {
  await ev(() => showView('webtoon')); await p.waitForTimeout(1200);
  await ev(() => selectPageCut([...document.querySelectorAll('#reader [data-slot-index]')][0])); await ev(() => document.querySelector('[data-at="ref"]')?.click()); await p.waitForTimeout(600);
  const n = async () => +(await ev(() => document.querySelector('.rf-count')?.textContent || '0')).replace(/[^\d]/g, '');
  const all = await n(); await p.selectOption('select[data-f="np"]', '2'); await p.waitForTimeout(300); const two = await n();
  await p.selectOption('select[data-f="gz"]', 'L'); await p.waitForTimeout(300); const gz = await n();
  assert(all > two && two > gz && gz > 0, `필터가 줄어듦 ${all} > ${two} > ${gz}`);
});
test('콘티 NovelAI: 화면에 보이는 대상을 컷마다 다르게 구성', async ({p, ev}) => {
  await ev(() => {
    CUTS.splice(0, CUTS.length,
      '빈 저택 복도에 달빛이 비친다. {설정}\n@에드가 "(화면 밖)여기로 와."',
      '준의 청동 거울 표면만 보인다. {인서트}',
      '@준의 손끝이 거울에 닿는다. {인서트}',
      '복도 끝 멀리 @에드가가 서 있다. {설정}',
      '섬광과 집중선. {효과만}',
      '@준은 놀라 @에드가를 돌아본다. {클로즈업}',
    );
    AIN[SCENES[SCUR].id] = {sig: 'old', cuts: [{n: 1, base: '1boy, portrait', chars: []}]};
    compute(false);
    showView('layout');
  });
  await p.locator('#conti .ccard').first().waitFor();
  const cards = await ev(() => [...document.querySelectorAll('#conti .ccard')].map(c => ({
    meta: c.querySelector('.ct-beat small').textContent,
    prompts: [...c.querySelectorAll('.ct-prompt pre')].map(pre => pre.textContent),
  })));
  assert(cards.length === 6, '컷 수');
  assert(cards[0].meta.startsWith('배경 ·') && /^(no humans, scenery).*hallway.*moonlight/.test(cards[0].prompts[0]) && cards[0].prompts.length === 1, '화면 밖 화자와 구형 프롬프트 제외');
  assert(/^no humans, mirror, object focus/.test(cards[1].prompts[0]) && cards[1].prompts[0].includes('bronze') && cards[1].prompts.length === 1, '소유자 없이 소품과 재질');
  assert(cards[2].prompts[0].startsWith('hands focus, head out of frame') && cards[2].prompts.length === 1, '신체 디테일에서 외형 전체 제외');
  assert(/^indoors, hallway, scenery, wide shot/.test(cards[3].prompts[0]) && /1boy, far away/.test(cards[3].prompts[1]), '장소 먼저, 인물은 원경');
  assert(cards[4].prompts[0].startsWith('no humans, abstract background, radial lines') && cards[4].prompts.length === 1, '효과만 표시');
  assert(cards[5].prompts.length === 3 && cards[5].prompts[0].includes('face focus'), '인물마다 개별 캐릭터 칸');
  assert(await ev(() => {
    const output = RoughNAI.refine(naiRuleCuts()[0].o, {
      base: '1boy, portrait, black hair, stone floor',
      chars: [{name: '에드가', cell: 'A1', prompt: '1boy'}],
    });
    return output.base.includes('stone floor') && !/1boy|portrait|black hair/.test(output.base) && !output.chars.length;
  }), 'Claude 결과에도 배경 컷 초점 유지');
});
test('콘티: 컷 프롬프트 생성 중·완료가 버튼에 보임', async ({p, ev}) => {
  // claude.js를 가짜로 바꿔 응답을 늦춤(실제 API 키 없이)
  let release; const gate = new Promise(r => release = r); let fail = false;
  await p.route('**/claude.js', async route => { await gate; route.fulfill({contentType: 'text/javascript', body: fail
    ? "export async function refineNai(){const e=new Error('x');e.status=500;throw e}export function explain(){return '서버 오류'}"
    : "export async function refineNai(k,p,{onStatus}){onStatus&&onStatus('Claude가 쓰는 중');return {cuts:p.cuts?p.cuts.map(()=>({p:'test'})):[],model:'test'}}export function explain(){return 'x'}"}); });
  await ev(() => { setKey('sk-test', 'session'); showView('layout'); }); await p.waitForTimeout(800);
  await p.click('#conti [data-act=nairefine]'); await p.click('#refinedlg [data-r=go]'); await p.waitForTimeout(200);
  assert((await p.textContent('#conti [data-act=nairefine]')).includes('생성 중'), '생성 중 표시');
  assert(await p.isDisabled('#conti [data-act=nairefine]'), '생성 중에는 버튼 잠김');
  assert((await p.textContent('#conti .ct-naist')).length > 0, '진행 글자');
  release(); await p.waitForTimeout(500);
  assert((await p.textContent('#conti [data-act=nairefine]')).includes('생성 완료'), '생성 완료 표시');
  assert((await p.textContent('#conti .ct-naist')).includes('만들었어요'), '완료 글자');
  await p.waitForTimeout(4300);
  assert((await p.textContent('#conti [data-act=nairefine]')).trim() === '컷 프롬프트 생성', '4초 뒤 원래대로');
});
test('콘티: 컷 지우기 → 씬·편집에 반영 · Ctrl+Z', async ({p, ev}) => {
  await ev(() => showView('layout')); await p.waitForTimeout(800);
  const before = await ev(() => SCENES[SCUR].cuts.slice()); const n = await ev(() => state.panels.length);
  const slot = await ev(() => cutSlot(state.panels[1], 1));
  await p.click('#conti .ccard[data-ct="1"] [data-ctdel]'); await p.waitForTimeout(500);
  const after = await ev(() => SCENES[SCUR].cuts.slice());
  assert(after.length === before.length - 1 && !after.includes(before[slot]), '원고에서 그 컷이 빠짐');
  assert((await ev(() => document.querySelectorAll('#conti .ccard').length)) < n, '콘티 카드가 줄어듦');
  await p.click('.topnav [data-view=write]'); await p.waitForTimeout(500);
  assert((await ev(() => document.querySelectorAll('#cutlist li').length)) === after.length, '씬 화면 컷 수 반영');
  await ev(() => showView('webtoon')); await p.waitForTimeout(1200);
  assert((await ev(() => SCENES[SCUR].cuts.length)) === after.length, '편집 화면도 같은 원고');
  await ev(() => showView('layout')); await p.waitForTimeout(500);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(600);
  assert(JSON.stringify(await ev(() => SCENES[SCUR].cuts)) === JSON.stringify(before), 'Ctrl+Z로 되돌림');
});
test('구성안 → 설정집 제안 창 → 고른 대로 추가', async ({p, ev}) => {
  await ev(() => setKey('sk-test', 'session'));
  const n0 = await ev(() => [CHARS.length, LORE.length]);
  // 가짜 Claude 응답: 엑스트라 하녀(캐릭터 제안)와 시장 상인들(세계관 제안), 이미 있는 에드가는 걸러져야 함
  await ev(() => { window._fake = { findEntities: async () => ({ items: [
    { name: '하녀1', suggest: 'char', where: '2번 씬 「마차 소리」 2컷 — 떠나냐고 묻는 하녀', reason: '대사가 있음', body: 'female', aliases: '', look: '갈색 단발, 하녀복', cat: 'term', keys: '', desc: '', tags: '' },
    { name: '시장 상인들', suggest: 'lore', where: '1번 씬 배경', reason: '배경 무리', body: 'other', aliases: '', look: '', cat: 'faction', keys: '상인', desc: '광장 시장의 상인들', tags: 'merchants' },
    { name: '에드가', suggest: 'char', where: 'x', reason: 'x', body: 'male', aliases: '', look: '', cat: 'term', keys: '', desc: '', tags: '' } ] }), explain: e => String(e) };
    suggestEntities({ cards: [{ n: 1, title: 't', cuts: ['a'] }] }, () => {}, window._fake); });
  await p.waitForSelector('#entdlg[open]');
  assert((await ev(() => document.querySelectorAll('#entdlg .entl li').length)) === 2, '이미 있는 인물은 빠지고 2개');
  await p.click('#entdlg [data-r=go]'); await p.waitForTimeout(300);
  const n1 = await ev(() => [CHARS.length, LORE.length, CHARS.some(c => c.name === '하녀1'), LORE.some(l => l.name === '시장 상인들' && l.cat === 'faction')]);
  assert(n1[0] === n0[0] + 1 && n1[1] === n0[1] + 1 && n1[2] && n1[3], '캐릭터 1명·세계관 1개 추가');
  await p.reload(); await p.waitForTimeout(2000);
  assert(await ev(() => CHARS.some(c => c.name === '하녀1')), '저장됨');
});
test('콘티: 컷 비율 기준(작품별) 바꾸면 칸 길이가 따라감', async ({p, ev}) => {
  await ev(() => showView('layout')); await p.waitForTimeout(1500);
  const med = async () => ev(() => { const h = state.panels.map(c => c.h).sort((a, b) => a - b); return h[Math.floor(h.length / 2)]; });
  await p.selectOption('#conti [data-ratioref]', '이두나!'); await p.waitForTimeout(400); const a = await med();
  await p.selectOption('#conti [data-ratioref]', '호수의 백조'); await p.waitForTimeout(400); const b = await med();
  assert(a < b, `넓은 작품(${a}) < 세로 긴 작품(${b})`);
  await p.reload(); await p.waitForTimeout(2500); await ev(() => showView('layout')); await p.waitForTimeout(800);
  assert((await p.inputValue('#conti [data-ratioref]')) === '호수의 백조', '고른 기준이 남음');
});
test('콘티: 컷 하나 상세 수정(샷·감정) · 이 컷만 프롬프트 다시 생성', async ({p, ev}) => {
  let req = null;
  await p.route('**/claude.js', route => route.fulfill({contentType: 'text/javascript', body:
    "export async function refineNaiCut(k,p,n,r){window._req={n,r};return {cut:{n,base:'REGEN base',chars:[]},model:'test'}}export function explain(e){return String(e)}"}));
  await ev(() => { setKey('sk-test', 'session'); showView('layout'); }); await p.waitForTimeout(800);
  await p.click('#conti .ccard[data-ct="1"] [data-ctedit]'); await p.waitForTimeout(200);
  assert(await ev(() => !!document.querySelector('#conti .ct-edit[data-i="1"]')), '수정 칸 열림');
  await p.selectOption('#conti .ct-edit[data-i="1"] [data-ctf=shot]', '디테일'); await p.waitForTimeout(400);
  assert(await ev(() => state.panels[1].shot === '디테일'), '샷 바뀜');
  await p.selectOption('#conti .ct-edit[data-i="1"] [data-ctf=emo]', '분노'); await p.waitForTimeout(400);
  assert(await ev(() => state.panels[1].emo === '분노'), '감정 바뀜');
  await p.fill('#conti .ct-edit[data-i="1"] textarea', '역광으로'); await p.click('#conti [data-ctregen="1"]'); await p.waitForTimeout(800);
  assert(await ev(() => window._req && window._req.n === 2 && window._req.r === '역광으로'), '이 컷 번호와 요청을 보냄');
  assert((await p.textContent('#conti .ct-edit[data-i="1"] .ct-edst')).includes('새로 만들었어요'), '완료 표시');
  await p.click('#conti [data-ctauto="1"]'); await p.waitForTimeout(400);
  assert(await ev(() => state.panels[1].shot !== '디테일' || !Object.keys(state.panels[1].lock).length), '엔진 값으로 되돌림');
});
test('#소품: 처음 적은 형태로 세계관에 고정 → 콘티 모든 컷에 같은 태그', async ({p, ev}) => {
  await p.route('**/claude.js', route => route.fulfill({contentType: 'text/javascript', body:
    "export async function refineNai(k,pl){window._pl=pl;return {cuts:pl.cuts.map(c=>({n:c.n,base:'AI base',chars:[]})),props:[{name:'회중시계',tags:'gold pocket watch, rose engraving'}],model:'test'}}export function explain(e){return String(e)}"}));
  await ev(() => { setKey('sk-test', 'session'); showView('write');
    CUTS.splice(0, CUTS.length, '@에드가 #회중시계(금색, 뚜껑에 장미 문양)를 꺼낸다. {디테일}', '#회중시계가 바닥에 떨어진다', '@준 "그 시계…"');
    saveScenes(); renderCuts(); cutChanged(); });
  await p.waitForTimeout(700);
  const it = await ev(() => { const e = LORE.find(x => x.name === '회중시계'); return e && [e.cat, e.desc, e.tags]; });
  assert(it && it[0] === 'item' && it[1] === '금색, 뚜껑에 장미 문양' && !it[2], '세계관 물건으로 등록, 형태 고정');
  const hl = await ev(() => [!!document.querySelector('.cuthl .h-prop'), !!document.querySelector('.cutparse .propfix')]);
  assert(hl[0] && hl[1], '글 강조 · 고정 표시');
  assert(await ev(() => state.panels.length && state.panels[1].props?.[0]?.name === '회중시계' && !state.panels[0].act.includes('#')), '컷 글에서 소품 읽음');
  await ev(() => { CUTS[1] = '#회중시계(은색)가 바닥에 떨어진다'; saveScenes(); renderCuts(); cutChanged(); }); await p.waitForTimeout(600);
  assert(await ev(() => LORE.find(x => x.name === '회중시계').desc === '금색, 뚜껑에 장미 문양' && !!document.querySelector('.cutparse .propclash')), '다른 형태는 경고만, 처음 형태 유지');
  await ev(() => showView('layout')); await p.waitForTimeout(600);
  await p.click('#conti [data-act=nairefine]'); await p.click('#refinedlg [data-r=go]'); await p.waitForTimeout(1200);
  const pl = await ev(() => window._pl && [window._pl.props, window._pl.cuts.map(c => c.props)]);
  assert(pl && pl[0].length === 1 && pl[0][0].look === '금색, 뚜껑에 장미 문양' && pl[1][0][0] === '회중시계' && pl[1][1][0] === '회중시계', 'Claude에 소품과 컷별 소품 전달');
  const r = await ev(() => [LORE.find(x => x.name === '회중시계').tags, naiRuleCuts().slice(0, 2).map(x => x.o.base), !!ainFor() && ainFor().stale]);
  assert(r[0] === 'gold pocket watch, rose engraving', 'Claude가 정한 태그를 설정집에 고정');
  assert(r[1].every(b => b.includes('gold pocket watch, rose engraving')), '두 컷 모두 같은 소품 태그');
  assert(r[2] === false, '태그 저장 뒤에도 생성 결과가 최신');
  assert(await ev(() => document.querySelectorAll('#conti .ct-prop').length >= 2), '콘티 카드에 고정 소품 표시');
});
test('요소별 레이어: 배경·인물·소품 프롬프트 따로 → 넣은 그림이 편집 레이어로', async ({p, ev}) => {
  await ev(() => { showView('write');
    CUTS.splice(0, CUTS.length, '@에드가가 복도 의자에 앉아 #회중시계(금색)를 꺼낸다.', '@에드가가 복도 끝을 바라본다.', '@준 "누구세요?"', '@에드가가 복도 끝을 바라본다.');
    saveScenes(); renderCuts(); cutChanged(); });
  await p.waitForTimeout(600);
  await ev(() => { LORE.find(x => x.name === '회중시계').tags = 'gold pocket watch'; showView('layout'); }); await p.waitForTimeout(500);
  await p.click('#conti [data-layermode]'); await p.waitForTimeout(400);
  const rowsOf = () => ev(() => [...document.querySelectorAll('#conti .ccard[data-ct="0"] .ly-row')].map(r => [r.dataset.ly, r.dataset.key, [...r.querySelectorAll('pre')].map(x => x.textContent).join(' || ')]));
  let rows = await rowsOf();
  assert(rows.map(r => r[0]).join() === 'prop,char,bg', '소품·인물·배경 줄');
  assert(!rows[0][2] && rows[1][2].includes('gold pocket watch') && !/gold pocket watch|clock/.test(rows[2][2]), '꺼내 든 소품은 인물 레이어에 녹여 넣음');
  const bg = rows[2][2], ch = rows[1][2];
  assert(bg.startsWith('no humans, scenery') && !/1boy/.test(bg), '배경: 사람 없이');
  assert(ch.includes('white background') && !/hallway/.test(ch), '인물: 흰 배경에 인물만');
  await p.selectOption('#conti .ccard[data-ct="0"] [data-lyatt]', 'bg'); await p.waitForTimeout(300);
  rows = await rowsOf();
  assert(rows[2][2].includes('gold pocket watch') && !rows[1][2].includes('gold pocket watch'), '배경에 넣기로 바꾸면 배경 프롬프트로');
  await p.selectOption('#conti .ccard[data-ct="0"] [data-lyatt]', 'layer'); await p.waitForTimeout(300);
  rows = await rowsOf(); const pr = rows[0][2];
  assert(pr.includes('gold pocket watch') && pr.includes('white background') && !rows[1][2].includes('gold pocket watch') && !rows[2][2].includes('gold pocket watch'), '따로 레이어: 설정집 태그 그대로, 인물·배경에서는 뺌');
  // 흰 바탕에 빨간 네모 그림을 만들어 넣기
  const mk = `(async()=>{const c=document.createElement('canvas');c.width=80;c.height=100;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,80,100);g.fillStyle='#c00';g.fillRect(20,20,40,60);const b=await new Promise(r=>c.toBlob(r,'image/png'));return new File([b],'x.png',{type:'image/png'})})()`;
  await ev(`(async()=>{await layerPut(await ${mk},0,'char','에드가');await layerPut(await ${mk},0,'prop','회중시계');await layerPut(await ${mk},0,'bg','')})()`);
  await p.waitForTimeout(400);
  const r = await ev(async () => { const sid = SCENES[SCUR].id, LP = layerPlan(SCUR), ed = SCENES[SCUR].pageEdits[LP[0].slot];
    const a = charOf(LP[0], LP[0].chars[0], sid), im = await loadImg(a.src), c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    return { ov: (ed.overlays || []).map(v => v.layer + ':' + v.key), corner: g.getImageData(2, 2, 1, 1).data[3], mid: g.getImageData(40, 50, 1, 1).data[3],
      bg: IMG.lybg[lybId(sid, 0)]?.layerBg != null, same: LP[0].bg.key === LP[1].bg.key, bg1: !!IMG.lybg[lybId(sid, 1)] }; });
  assert(r.ov.includes('char:에드가') && r.ov.includes('prop:회중시계'), '컷 소재에 인물·소품 레이어');
  assert(r.corner === 0 && r.mid === 255, '흰 배경만 투명');
  assert(r.bg && (!r.same || r.bg1), '배경 등록 · 같은 장소 컷은 같은 배경');
  assert(await ev(() => document.querySelectorAll('#conti .ccard[data-ct="0"] .ly-prev img').length === 3), '미리보기에 세 레이어');
  // 같은 자세(1·4번 컷)는 인물 그림 하나를 같이 씀, 다른 자세 컷은 '다른 컷 그림 쓰기'로 고를 수 있음
  await ev(`(async()=>{await layerPut(await ${mk},1,'char','에드가')})()`); await p.waitForTimeout(300);
  const sh = await ev(() => { const LP = layerPlan(SCUR), ov = k => (SCENES[SCUR].pageEdits[LP[k].slot]?.overlays || []).find(v => v.layer === 'char' && v.key === '에드가')?.asset;
    return { same: LP[1].chars[0].pose === LP[3].chars[0].pose, diff: LP[0].chars[0].pose !== LP[1].chars[0].pose, a1: ov(1), a3: ov(3), a0: ov(0) }; });
  assert(sh.same && sh.a1 && sh.a1 === sh.a3, '같은 자세 컷은 같은 인물 그림');
  assert(sh.diff && sh.a0 !== sh.a1, '다른 자세는 따로');
  assert(await ev(() => !!document.querySelector('#conti .ccard[data-ct="0"] [data-lypick]')), '다른 컷 그림 고르기');
  // 기본 크기: 그림 비율·칸 높이에 맞춤(인물은 샷별 높이, 칸 아래에 붙임)
  const fit = await ev(() => { const L = layerPlan(SCUR)[1], v = SCENES[SCUR].pageEdits[L.slot].overlays.find(o => o.layer === 'char'), a = IMG.overlay[v.asset];
    const hf = {설정: .38, 전경: .55, 전신: .92, 중경: .96, 클로즈업: 1, 디테일: .9}[L.p.shot] ?? .9; return [v.auto, v.scale, Math.round(Math.min(140, hf * L.p.h * a.w / a.h * 100))]; });
  assert(fit[0] && Math.abs(fit[1] - Math.max(8, fit[2])) <= 1, '인물 레이어 크기가 그림 비율·칸 높이에 맞음');
  await ev(() => showView('webtoon')); await p.waitForTimeout(1200);
  // 편집: 레이어를 눌러 고르고 끌어서 옮김
  await ev(() => { if (!pageEditing) document.querySelector('#wedit').click(); }); await p.waitForTimeout(600);
  const ovSel = '[data-overlay-layer="char"]';
  await p.locator(ovSel).first().scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const bb = await p.locator(ovSel + ' image').first().boundingBox();
  const before = await ev(sel => { const g = document.querySelector(sel), grp = g.closest('[data-slot-index]'); return {key: pageKey(grp), i: +g.dataset.overlay}; }, ovSel);
  const x0 = await ev(b => pageSettings(true, b.key).overlays[b.i].x, before);
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2 + 40, bb.y + bb.height / 2, {steps: 5}); await p.mouse.up(); await p.waitForTimeout(500);
  const after = await ev(b => { const L = pageSettings(true, b.key).overlays[b.i]; return [L.x, L.auto, window.RoughOverlayPanel.index, pageSelection]; }, before);
  assert(after[0] > x0 && !after[1], '끌어서 옮기면 위치가 바뀌고 자동 크기 표시가 빠짐');
  assert(after[2] === before.i && after[3] === before.key, '누른 레이어가 이미지 패널에서 골라짐');
  assert(await ev(() => !document.querySelector('[data-layercut]')), '흰색 자동 투명 선택창 없음');
  // 크기: 모서리 손잡이 끌기 · 상단 「레이어 크기」
  assert(await ev(() => !!document.querySelector('.ovh [data-ovh="br"]') && !!document.querySelector('[data-ctx="ovscale"]')), '고른 레이어에 모서리 손잡이·상단 레이어 크기');
  const s0 = await ev(b => pageSettings(true, b.key).overlays[b.i].scale, before);
  const hb = await p.locator('.ovh [data-ovh="br"]').boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.mouse.move(hb.x + 60, hb.y + 60, {steps: 6}); await p.mouse.up(); await p.waitForTimeout(500);
  const s1 = await ev(b => pageSettings(true, b.key).overlays[b.i].scale, before);
  assert(s1 > s0, `모서리를 끌면 레이어가 커짐 (${s0}→${s1})`);
  await ev(() => { const r = document.querySelector('[data-ctx="ovscale"]'); r.value = 40; r.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(400);
  assert(await ev(b => pageSettings(true, b.key).overlays[b.i].scale === 40, before), '상단 레이어 크기로 바꿈');
  assert(await ev(() => !!document.querySelector('[data-overlay-layer="char"][data-label^="인물 에드가"]') && !!document.querySelector('[data-overlay-layer="prop"]')), '편집 화면에 레이어로 그려짐');
  // 레이어를 끄면 편집·씬 미리보기가 한 컷 그림으로(레이어 배경이 한 컷 그림을 덮어쓰지 않음)
  const single = await ev(async () => { const c = document.createElement('canvas'); c.width = 60; c.height = 60; c.getContext('2d').fillStyle = '#0a0'; c.getContext('2d').fillRect(0, 0, 60, 60);
    const b = await new Promise(r => c.toBlob(r, 'image/jpeg')); await attachCut(new File([b], 's.jpg', {type: 'image/jpeg'}), 0); return IMG.cut[cutId(SCENES[SCUR].id, 0)].src; });
  await ev(() => setLayerMode(false)); await p.waitForTimeout(800);
  const off = await ev(() => [document.querySelectorAll('[data-overlay-layer]').length, document.querySelectorAll('[data-layer-bg]').length, cutImg(SCUR, 0, state.panels[0])?.src]);
  assert(off[0] === 0 && off[1] === 0 && off[2] === single, '끄면 레이어 없이 한 컷 그림');
  await ev(() => setLayerMode(true)); await p.waitForTimeout(800);
  const on = await ev(() => [document.querySelectorAll('[data-overlay-layer]').length, cutImg(SCUR, 0, state.panels[0])?.layerBg != null, IMG.cut[cutId(SCENES[SCUR].id, 0)].src]);
  assert(on[0] > 0 && on[1] && on[2] === single, '켜면 레이어 배경·레이어로, 한 컷 그림은 그대로 보관');
  await ev(() => setLayerMode(false));
});
test('회차마다 등장인물 따로 · 설정한 인물은 보관함에 자동 → 다른 회차에서 불러오기', async ({p, ev}) => {
  await ev(() => { CHARS.push({name: '리나', aliases: '', body: 'female', look: '은발 단발, 검은 망토'}); saveChars(); }); await p.waitForTimeout(900);
  const a = await ev(() => { const L = LIB.find(x => x.name === '리나'); return L && [L.look, (L.eps || []).length, LIB.some(x => x.name === '에드가')]; });
  assert(a && a[0] === '은발 단발, 검은 망토' && a[1] === 1 && a[2], '설정한 인물이 보관함에 자동으로(나온 회차 기록)');
  await ev(() => { CHARS.find(c => c.name === '리나').look = '은발 단발, 붉은 망토'; saveChars(); }); await p.waitForTimeout(900);
  assert(await ev(() => LIB.filter(x => x.name === '리나').length === 1 && LIB.find(x => x.name === '리나').look === '은발 단발, 붉은 망토'), '고치면 보관함도 갱신');
  const ep1 = await ev(() => RoughEpisodes.cur.id);
  await ev(() => { setTimeout(() => RoughEpisodes.add(), 0); }); await p.waitForTimeout(3000);
  assert(await ev(() => RoughEpisodes.cur.id) !== ep1, '새 회차');
  assert(await ev(() => CHARS.some(c => c.name === '리나')), '새 회차는 지금 인물로 시작');
  await ev(() => { CHARS.splice(CHARS.findIndex(c => c.name === '리나'), 1); CHARS.push({name: '카이', aliases: '', body: 'male', look: '흑발, 안경'}); saveChars(); }); await p.waitForTimeout(900);
  await ev(id => { setTimeout(() => RoughEpisodes.go(id), 0); }, ep1); await p.waitForTimeout(3000);
  const b = await ev(() => [RoughEpisodes.cur.id, CHARS.map(c => c.name)]);
  assert(b[0] === ep1 && b[1].includes('리나') && !b[1].includes('카이'), '1화로 돌아오면 1화 인물 그대로');
  assert(await ev(() => { const L = LIB.find(x => x.name === '카이'); return !!L && (L.eps || []).length === 1; }), '2화 인물도 보관함에');
  await ev(() => showView('chars')); await p.waitForTimeout(500);
  const kai = await ev(() => LIB.find(x => x.name === '카이').id);
  await p.click(`#libgrid [data-libuse="${kai}"]`); await p.waitForTimeout(400);
  assert(await ev(() => CHARS.some(c => c.name === '카이' && c.look === '흑발, 안경')), '보관함에서 이 회차로 불러오기');
});
test('레이어: 두 인물이 함께 나오면 각자 + 함께(상호작용) 레이어', async ({p, ev}) => {
  await ev(() => { showView('write'); CUTS.splice(0, CUTS.length, '@에드가가 @준을 껴안는다.', '@준이 창가에 서 있다.'); saveScenes(); renderCuts(); cutChanged(); }); await p.waitForTimeout(700);
  await ev(() => { showView('layout'); setLayerMode(true); }); await p.waitForTimeout(500);
  const L = await ev(() => { const x = layerPlan(SCUR); return x.map(l => ({g: l.group && {names: l.group.names, blocks: l.group.blocks.map(b => b.text), inter: l.group.interact}, chars: l.chars.map(c => c.prompt)})); });
  assert(L[0].g && L[0].g.names.length === 2 && L[0].g.inter.includes('hug') && /1boy/.test(L[0].g.blocks[0]) && /1girl/.test(L[0].g.blocks[0]) && L[0].g.blocks.length === 3, '함께: 인원·상호작용 + 인물 칸 둘');
  assert(L[0].chars.length === 2 && L[0].chars.every(c => !/\bhug\b/.test(c)), '개별 인물에는 상호작용 태그 없음');
  assert(!L[1].g, '혼자 나오는 컷은 함께 레이어 없음');
  assert(await ev(() => !!document.querySelector('#conti .ccard[data-ct="0"] .ly-row[data-ly="group"]')), '콘티에 함께 줄');
  const mk = `(async()=>{const c=document.createElement('canvas');c.width=80;c.height=100;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,80,100);g.fillStyle='#c00';g.fillRect(20,20,40,60);const b=await new Promise(r=>c.toBlob(r,'image/png'));return new File([b],'x.png',{type:'image/png'})})()`;
  await ev(`(async()=>{const l=layerPlan(SCUR)[0];await layerPut(await ${mk},0,'char','준');await layerPut(await ${mk},0,'group',l.group.key)})()`); await p.waitForTimeout(400);
  const ov = await ev(() => (SCENES[SCUR].pageEdits[layerPlan(SCUR)[0].slot].overlays || []).map(v => v.layer + ':' + v.key));
  assert(ov.some(v => v.startsWith('group:')) && !ov.some(v => v.startsWith('char:')), '함께 그림을 넣으면 그 컷은 개별 인물 대신 함께 그림');
  await ev(() => setLayerMode(false));
});
test('레이어: 흰색 자동 투명(테두리 흰 배경 + 안쪽 완전 흰 빈틈, 작은 흰 점은 남김)', async ({p, ev}) => {
  const a = await ev(() => { const c = document.createElement('canvas'); c.width = 100; c.height = 100; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 100, 100); g.fillStyle = '#c00'; g.fillRect(10, 10, 80, 80); g.fillStyle = '#fff'; g.fillRect(30, 30, 40, 40); g.fillRect(14, 14, 3, 3);
    g.fillStyle = '#f0eee8'; g.fillRect(75, 75, 10, 10);
    const d = whiteCutout(g.getImageData(0, 0, 100, 100), 100, 100), A = (x, y) => d.data[(y * 100 + x) * 4 + 3];
    return [A(3, 3), A(50, 50), A(15, 15), A(20, 20), A(80, 80)]; });
  assert(a[0] === 0, '테두리 흰 배경 투명');
  assert(a[1] === 0, '안쪽 완전 흰 빈틈도 투명');
  assert(a[2] === 255, '작은 흰 점(하이라이트)은 남김');
  assert(a[3] === 255 && a[4] === 255, '그림과 안쪽의 연한 색(완전 흰색 아님)은 남김');
});
test('레이어: 소품은 나온 컷에만 · 소품 중심 컷에도 인물 레이어', async ({p, ev}) => {
  await p.route('**/claude.js', route => route.fulfill({contentType: 'text/javascript', body:
    "export async function refineNai(k,pl){return {cuts:pl.cuts.map(c=>({n:c.n,base:'gold pocket watch, golden pocket watch with chain, indoors',chars:[]})),props:[],model:'test'}}export function explain(e){return String(e)}"}));
  await ev(() => { setKey('sk-test', 'session'); showView('write');
    CUTS.splice(0, CUTS.length, '@준이 #회중시계(금색)를 꺼낸다. {디테일}', '@준이 창가로 다가간다.', '@에드가가 책상 앞에 선다.');
    saveScenes(); renderCuts(); cutChanged(); }); await p.waitForTimeout(700);
  await ev(() => { LORE.find(x => x.name === '회중시계').tags = 'gold pocket watch'; LORE.push({id: 'lbook', name: '책', cat: 'item', keys: '', desc: '낡은 책', tags: 'old book'}); showView('layout'); }); await p.waitForTimeout(500);
  await p.click('#conti [data-act=nairefine]'); await p.click('#refinedlg [data-r=go]'); await p.waitForTimeout(1200);
  await ev(() => setLayerMode(true)); await p.waitForTimeout(500);
  const r = await ev(() => layerPlan(SCUR).map(L => ({props: L.props.map(x => x.name), chars: L.chars.map(c => c.name), bg: L.bg.prompt, base: naiCuts()[L.i].o.base})));
  assert(r[0].chars.includes('준'), '소품 중심(디테일) 컷에도 인물 레이어');
  assert(r[0].props.join() === '회중시계' && !r[1].props.length && !r[2].props.length, '소품은 #으로 적은 컷에만(책상≠책)');
  assert(!/pocket watch/.test(r[1].base) && !/pocket watch/.test(r[2].base) && !/pocket watch/.test(r[1].bg), 'Claude가 옮겨 적은 소품 태그도 다른 컷에서 뺌');
  await ev(() => { const LP = layerPlan(SCUR), ed = SCENES[SCUR].pageEdits[LP[2].slot] ||= {}; ed.overlays = [{asset: 'overlay:x', layer: 'prop', key: '회중시계'}, {asset: 'overlay:mine'}]; syncLayers(SCUR); });
  assert(await ev(() => { const ov = SCENES[SCUR].pageEdits[layerPlan(SCUR)[2].slot].overlays; return ov.length === 1 && !ov[0].layer; }), '컷에 없는 소품 레이어는 빼고 직접 넣은 소재는 둠');
  await ev(() => setLayerMode(false));
});
test('프롬프트에 앵글×감정 · 감정 강도 가중치 · 씬 무드', async ({p, ev}) => {
  await ev(() => { showView('write'); CUTS.splice(0, CUTS.length, '밤, 복도. {설정}', '@에드가가 @준을 내려다본다. {로우앵글, 감정 결의}', '@준이 혼자 남아 고개를 떨군다. {하이앵글, 감정 쓸쓸}'); saveScenes(); renderCuts(); cutChanged(); }); await p.waitForTimeout(700);
  await ev(() => showView('layout')); await p.waitForTimeout(500);
  const c = await ev(() => naiCuts().map(({p, o}) => [p.ang, p.emo, p.i, o.base, o.chars.map(x => x.prompt).join(' | ')]));
  assert(/from below/.test(c[1][3]) && /looking down at viewer|imposing|dramatic perspective/.test(c[1][3]), '로우앵글+결의: 위압 구도');
  assert(/from above/.test(c[2][3]) && /looking up|alone/.test(c[2][3]), '하이앵글+쓸쓸: 작고 외로운 구도');
  assert(c.every(x => !/\bbright\b|high key/.test(x[3])), '밤 장면에 밝은 톤 없음');
  const mood = await ev(() => sceneMoodOf(SCUR));
  await p.selectOption('#conti [data-scenemood]', '설렘'); await p.waitForTimeout(300);
  const c2 = await ev(() => naiCuts().map(({o}) => o.base));
  assert(c2.every(b => b.includes('warm colors') && b.includes('pastel colors')), '씬 무드를 고르면 모든 컷에 같은 색감');
  assert(await ev(() => naiPayload().sceneMood.emotion === '설렘'), 'Claude에도 씬 무드 전달');
  await p.selectOption('#conti [data-scenemood]', ''); await p.waitForTimeout(200);
  assert(await ev(() => !SCENES[SCUR].mood) && typeof mood === 'string', '자동으로 되돌림');
  await ev(() => { CUTS[1] = '@에드가가 @준을 내려다본다. {로우앵글, 감정 분노}'; saveScenes(); compute(false); });
  const strong = await ev(() => state.panels[1].i >= 2 ? /1\.(15|3)::/.test(naiCuts()[1].o.chars.map(x => x.prompt).join(' ')) : true);
  assert(strong, '강한 감정은 표정 가중치');
});
test('프롬프트에 동작: 달리기·칼 뽑기·무릎 꿇기 → 태그, 모르는 동작은 알림', async ({p, ev}) => {
  await ev(() => { showView('write'); CUTS.splice(0, CUTS.length, '@에드가가 나무 사이를 달린다. {전경}', '@에드가가 칼을 뽑아 든다.', '@준이 무릎을 꿇고 소리친다.', '@준이 조용히 숨을 고른다.'); saveScenes(); renderCuts(); cutChanged(); }); await p.waitForTimeout(700);
  await ev(() => showView('layout')); await p.waitForTimeout(500);
  const c = await ev(() => naiCuts().map(({o}) => [o.chars.map(x => x.prompt).join(' | ') + ' ' + (o.layerCast || []).map(x => x.prompt).join(' | '), o.missAct]));
  assert(/\brunning\b/.test(c[0][0]), '달린다 → running');
  assert(/unsheathing|holding sword/.test(c[1][0]), '칼을 뽑는다 → unsheathing');
  assert(/kneeling/.test(c[2][0]) && /shouting/.test(c[2][0]), '무릎 꿇고 소리친다 → kneeling, shouting');
  assert(c[3][1] && await ev(() => !!document.querySelector('#conti .ccard[data-ct="3"] .ct-miss')), '사전에 없는 동작은 카드에 알림');
});
test('소품이 빛·연기의 출처로만 나오면 화면 밖(효과만) · 칩으로 직접 바꾸기', async ({p, ev}) => {
  await ev(() => { showView('write'); CUTS.splice(0, CUTS.length, '@준이 #조마경(둥근 청동 거울)을 들어 비춘다.', '#조마경에서 쏟아진 빛줄기가 @준의 등을 덮친다.', '@준이 #조마경을 떠올린다.'); saveScenes(); renderCuts(); cutChanged(); }); await p.waitForTimeout(700);
  await ev(() => { LORE.find(x => x.name === '조마경').tags = 'bronze mirror, round mirror'; showView('layout'); }); await p.waitForTimeout(500);
  const c = await ev(() => naiCuts().map(({o}) => [o.base, (o.props || []).map(x => x.name).join(), (o.propsOff || []).map(x => x.why).join()]));
  assert(/bronze mirror/.test(c[0][0]) && c[0][1] === '조마경', '들고 비추면 보임');
  assert(!/mirror/.test(c[1][0]) && /light rays/.test(c[1][0]) && c[1][2] === 'source', '빛줄기의 출처면 거울은 빼고 빛만');
  assert(!/mirror/.test(c[2][0]) && c[2][2] === 'absent', '떠올리기만 하면 안 보임');
  assert(await ev(() => naiPayload().cuts[1].offscreen[0].name === '조마경' && !naiPayload().cuts[1].props.length), 'Claude에 화면 밖 소품 전달');
  await p.click('#conti .ccard[data-ct="1"] [data-propvis]'); await p.waitForTimeout(300);
  assert(await ev(() => /bronze mirror/.test(naiCuts()[1].o.base)), '칩을 누르면 화면에 보이게');
  await p.click('#conti .ccard[data-ct="1"] [data-propvis]'); await p.waitForTimeout(300);
  assert(await ev(() => !/mirror/.test(naiCuts()[1].o.base) && !SCENES[SCUR].pageEdits[1]?.propAttach), '다시 누르면 자동(글에서 판단)으로');
});
test('배운 동작: Claude가 옮긴 새 동작을 규칙 사전에 쌓음 · 자동 생성', async ({p, ev}) => {
  await p.route('**/claude.js', route => route.fulfill({contentType: 'text/javascript', body:
    "export async function refineNai(k,pl){window._calls=(window._calls||0)+1;window._pl=pl;return {cuts:pl.cuts.map(c=>({n:c.n,base:'AI',chars:[]})),props:[],actions:[{ko:'팔을 벌리다',tags:'spread arms'},{ko:'Edgar',tags:'x'}],model:'test'}}export function explain(e){return String(e)}"}));
  await ev(() => { setKey('sk-test', 'session'); showView('write'); CUTS.splice(0, CUTS.length, '@준이 팔을 벌린다.', '@준이 달린다.'); saveScenes(); renderCuts(); cutChanged(); }); await p.waitForTimeout(700);
  await ev(() => showView('layout')); await p.waitForTimeout(500);
  assert(await ev(() => !!naiCuts()[0].o.missAct && naiPayload().cuts[0].missingAction && /running/.test(naiPayload().cuts[1].ruleActions)), 'Claude에 규칙이 찾은 동작·못 찾은 동작 전달');
  await p.click('#conti [data-act=nairefine]'); await p.click('#refinedlg [data-r=go]'); await p.waitForTimeout(1200);
  const L = await ev(() => [LEARNED.map(x => x.ko), NAI.poseTags('리나가 팔을 벌린 채 웃는다')]);
  assert(L[0].includes('팔을 벌리다') && !L[0].includes('Edgar'), '새 동작만 배움(영문·고유명사 거름)');
  assert(L[1].includes('spread arms'), '배운 동작은 활용형까지 규칙 사전에');
  assert(await ev(() => document.querySelector('#conti [data-act="learned"]').textContent.includes('1')), '배운 동작 수 표시');
  // 자동 생성: 켜고 씬 글을 바꾸면 콘티에서 한 번 자동으로
  const c0 = await ev(() => window._calls);
  await p.click('#conti [data-naiauto]'); await ev(() => { CUTS[1] = '@준이 넘어진다.'; saveScenes(); compute(false); renderNai(); }); await p.waitForTimeout(2600);
  assert(await ev(c => window._calls === c + 1 && !ainFor().stale, c0), '자동 생성: 바뀐 씬을 한 번 만듦');
  await p.waitForTimeout(2000);
  assert(await ev(c => window._calls === c + 1, c0), '최신이면 다시 안 부름');
  await ev(() => { NAI_AUTO = false; localStorage.setItem('rough-nai-auto', '0'); });
});
test('상단 저장(보관함)·초기화 → 불러오기로 되돌림', async ({p, ev}) => {
  const before = await ev(() => JSON.stringify(SCENES.map(s => s.cuts)));
  await p.click('#wdraft'); await p.fill('#drname', '테스트 저장'); await p.click('#draftdlg [data-dr=save]'); await p.waitForTimeout(500);
  assert((await ev(() => [...document.querySelectorAll('#draftdlg .drl li b')].map(b => b.textContent))).includes('테스트 저장'), '보관함에 생김');
  await p.click('#draftdlg [data-dr=x]');
  await p.click('#wreset'); await p.waitForTimeout(2500);
  assert(await ev(() => SCENES.length === 1 && SCENES[0].cuts.join('') === '' && CHARS.length === 0), '초기화됨');
  await p.click('#wdraft'); await p.waitForTimeout(400);
  const names = await ev(() => [...document.querySelectorAll('#draftdlg .drl li b')].map(b => b.textContent));
  assert(names.some(n => n.startsWith('초기화 전')), '초기화 전 자동 보관');
  await ev(() => [...document.querySelectorAll('#draftdlg .drl li')].find(li => li.querySelector('b').textContent === '테스트 저장').querySelector('[data-dr=load]').click());
  await p.waitForTimeout(2800);
  assert((await ev(() => JSON.stringify(SCENES.map(s => s.cuts)))) === before, '불러오면 원래 원고');
});
test('판정 화면: 큐·선택지 설명·그림 분석', async ({p, ev}) => {
  await p.click('#gReview'); await p.waitForTimeout(1500);
  assert(await ev(() => /\/\d{3,}/.test(document.querySelector('.rvn')?.textContent || '')), '판정 수');
  assert(await ev(() => !!document.querySelector('.rvdef')?.textContent), '선택지 설명');
  assert(await ev(() => !!document.querySelector('.rvwhy')), '모델 판단 문장');
});
test('초기화: 캐릭터·세계관·구성·씬 → 되돌리기', async ({p, ev}) => {
  await ev(() => showView('chars')); await p.waitForTimeout(300);
  const n0 = await ev(() => CHARS.length); assert(n0 > 0, '처음 등장인물');
  await p.click('#v-chars [data-reset=chars]'); await p.waitForTimeout(200);
  assert((await ev(() => CHARS.length)) === 0, '캐릭터 비움');
  assert((await ev(() => document.querySelector('#v-chars [data-reset]').textContent)) === '되돌리기', '되돌리기로 바뀜');
  await p.click('#v-chars [data-reset=chars]'); await p.waitForTimeout(200);
  assert((await ev(() => CHARS.length)) === n0, '캐릭터 되돌림');
  await ev(() => showView('world')); await p.waitForTimeout(300);
  await p.click('#v-world [data-reset=world]'); await p.waitForTimeout(200);
  assert(await ev(() => !WORLD.name && LORE.length === 0), '세계관 비움');
  await p.click('#v-world [data-reset=world]'); await p.waitForTimeout(200);
  assert(await ev(() => !!WORLD.name && LORE.length > 0), '세계관 되돌림');
  await ev(() => showView('plan')); await p.waitForTimeout(1200);
  await p.fill('#plan-form [name=cutCount]', '42'); await p.dispatchEvent('#plan-form', 'change'); await p.waitForTimeout(200);
  await p.click('#v-plan [data-reset=plan]'); await p.waitForTimeout(300);
  assert((await p.inputValue('#plan-form [name=cutCount]')) !== '42', '구성 설정 처음 상태');
  await p.click('#v-plan [data-reset=plan]'); await p.waitForTimeout(300);
  assert((await p.inputValue('#plan-form [name=cutCount]')) === '42', '구성 되돌림');
  await ev(() => showView('write')); await p.waitForTimeout(500);
  const before = await ev(() => JSON.stringify(SCENES.map(s => s.cuts)));
  await p.click('#v-write [data-reset=scenes]'); await p.waitForTimeout(600);
  assert(await ev(() => SCENES.length === 1 && SCENES[0].cuts.join('') === ''), '씬 비움');
  await p.click('#v-write [data-reset=scenes]'); await p.waitForTimeout(600);
  assert((await ev(() => JSON.stringify(SCENES.map(s => s.cuts)))) === before, '씬 되돌림');
  await p.reload(); await p.waitForTimeout(2200);
  assert((await ev(() => JSON.stringify(SCENES.map(s => s.cuts)))) === before, '되돌린 씬이 저장돼 있음');
});
test('구성: 다시 생성 → 방향 입력 칸 · Esc 닫기 · 적은 말 남음', async ({p, ev}) => {
  await ev(() => { const card = n => ({id: 'c' + n, n, title: n + '번 씬', cutCount: 2, cuts: ['컷 하나', '컷 둘'], locked: false, role: '', turn: '', ending: ''});
    localStorage.setItem('rough-composition-v1', JSON.stringify({mode: 'webtoon', webtoon: {form: {}, draft: {summary: '요약', cards: [card(1), card(2)]}}, marketing: {form: {}, draft: null}})); });
  await p.reload(); await p.waitForTimeout(2200); await ev(() => showView('plan')); await p.waitForTimeout(1500);
  await p.click('#pc-1 [data-do=regen]'); await p.waitForTimeout(200);
  assert(await ev(() => !!document.querySelector('#pc-1 .pc-ask textarea') && document.activeElement.matches('.pc-ask textarea')), '입력 칸이 열리고 커서가 감');
  await p.keyboard.press('Escape'); assert(await ev(() => !document.querySelector('.pc-ask')), 'Esc로 닫힘');
  await p.click('#pc-1 [data-do=regen]'); await p.keyboard.type('대사를 줄이고 반전으로'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  assert(await ev(() => !document.querySelector('.pc-ask')), 'Enter로 보냄');
  assert(await ev(() => JSON.parse(localStorage.getItem('rough-composition-v1')).webtoon.draft.cards[0].ask === '대사를 줄이고 반전으로'), '적은 말이 카드에 저장');
  await ev(() => document.querySelector('#keydlg, dialog[open]')?.close?.());
  await p.click('#pc-1 [data-do=regen]'); await p.waitForTimeout(200);
  assert((await p.inputValue('#pc-1 .pc-ask textarea')) === '대사를 줄이고 반전으로', '다음에 열면 채워져 있음');
});
test('다크 모드: 시스템 다크에서 data-scheme=dark', async ({b, url}) => {
  const p = await b.newPage({colorScheme: 'dark'}); await p.goto(url); await p.waitForTimeout(1200);
  assert(await p.evaluate(() => document.documentElement.dataset.scheme === 'dark'), 'data-scheme');
  await p.close();
});
test('저장 공간이 차면 IndexedDB로 → 다시 열 때 복원', async ({p, ev}) => {
  await ev(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'rough-scenes') { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } return o.call(this, k, v); }; SCENES[0].title = 'IDB테스트'; saveScenes(); flushScenes(); });
  await p.waitForTimeout(800); await p.reload(); await p.waitForTimeout(3000);
  assert(await ev(() => SCENES[0].title === 'IDB테스트'), 'IndexedDB에서 원고 복원');
});
test('씬 그림 캐시가 새로 그린 것과 같음(?sacheck)', async ({b, url}) => {
  const p = await b.newPage(); const warn = []; p.on('console', m => { if (/mismatch/.test(m.text())) warn.push(m.text()); });
  await p.goto(url + '?sacheck'); await p.waitForTimeout(2000); await p.evaluate(() => showView('webtoon')); await p.waitForTimeout(1500);
  await p.evaluate(() => { const st = pageSettings(true, '0:0'); st.gap = 120; saveScenes(); renderWebtoon(); renderWebtoon(); });
  await p.waitForTimeout(500); assert(!warn.length, warn.join(' / ')); await p.close();
});

// ---------- 실행 ----------
(async () => {
  const only = process.argv[2]; const srv = await serve(); const url = `http://localhost:${srv.address().port}/rough/index.html`;
  const b = await chromium.launch(); let fail = 0;
  for (const t of T.filter(t => !only || t.name.includes(only))) {
    const ctx = await b.newContext({viewport: {width: 1440, height: 900}}); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    const t0 = Date.now();
    try {
      await p.goto(url); await p.waitForTimeout(2200);
      await p.evaluate(() => localStorage.setItem('rough-coach', '{"start":1,"cut":1,"letter":1}'));
      await t.fn({p, b, url, ev: (f, a) => p.evaluate(f, a)});
      assert(!errs.length, '페이지 오류: ' + errs.join(' / '));
      console.log(`✓ ${t.name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (e) { fail++; console.log(`✗ ${t.name}\n    ${e.message.split('\n')[0]}`); }
    await ctx.close();
  }
  await b.close(); srv.close(); console.log(fail ? `실패 ${fail}개` : '모두 통과'); process.exit(fail ? 1 : 0);
})();
