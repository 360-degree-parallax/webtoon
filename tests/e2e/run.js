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
