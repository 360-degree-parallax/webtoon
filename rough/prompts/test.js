'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { compile } = require('./compile.js');
const { createApp } = require('./serve.js');

const scene = {
  script: '도령 | 창문을 연다 [내레이션: 비가 그쳤다.]\n도령 | 고개를 든다 “이리 와.” [효과음: 달칵] [구도: 문틈으로 한쪽 눈만 보인다.]',
  cast: '도령 | 검은 도포\n상담객 | 회색 재킷',
  overrides: { 1: 'GM-06-013' },
};

test('compiles exact lettering and layout separately from the artwork prompt', () => {
  const result = compile(scene);
  const [first, next] = result.panels;
  assert.equal(next.reference.id, 'GM-06-013');
  assert.equal(next.match, 'manual');
  assert.equal(next.shot, '클로즈업');
  assert.equal(next.frame.height, 497);
  assert.equal(next.frame.y, first.frame.height + first.frame.gapAfter);
  assert.equal(result.height, next.frame.y + next.frame.height);
  assert.match(next.image, /문틈으로 한쪽 눈만 보인다/);
  assert.match(next.image, /검은 도포/);
  assert.doesNotMatch(next.image, /회색 재킷|이리 와|달칵/);
  assert.deepEqual(next.letter.map(entry => [entry.kind, entry.text]), [['대사', '이리 와.'], ['효과음', '달칵']]);
  assert.match(first.layout, /비가 그쳤다\./);
  assert.match(next.layout, /이리 와\./);
});

test('handles multiple sequences and validates edits and limits', () => {
  const script = Array.from({ length: 12 }, (_, i) => `인물 ${i} | 천천히 걸어간다`).join('\n');
  const result = compile({ script });
  assert.equal(result.panels.length, 12);
  assert.ok(result.chapters.length > 1);
  assert.ok(result.panels.every((cut, i) => i === 0 || cut.frame.y > result.panels[i - 1].frame.y));
  assert.throws(() => compile({ script, overrides: { 1: 'missing' } }), /참고 컷/);
  assert.throws(() => compile({ script: Array(31).fill('걷는다').join('\n') }), /30컷/);
});

test('serves the editor, reference bytes and JSON on a separate loopback route', async t => {
  const app = createApp().listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.address().port}`;
  const root = base + '/rough/prompts/';
  const html = await fetch(root);
  assert.equal(html.status, 200);
  assert.match(await html.text(), /이미지 프롬프트/);
  assert.equal((await fetch(root + 'app.js')).status, 200);
  assert.equal((await fetch(root + 'style.css')).status, 200);

  const refs = await (await fetch(root + 'api/references')).json();
  const ref = refs.find(item => item.id === 'GM-06-013');
  const image = await fetch(base + ref.image);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.equal(new Uint8Array(await image.arrayBuffer())[0], 137);

  const send = (body, extraHeaders) => fetch(root + 'api/compile', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify(body),
  });
  const compiled = await send(scene);
  assert.equal(compiled.status, 200);
  assert.equal((await compiled.json()).panels.length, 2);
  assert.equal((await send({ script: '' })).status, 400);
  assert.equal((await send(scene, { Origin: 'https://example.com' })).status, 403);
  assert.equal((await send({ script: 'a'.repeat(800000) })).status, 413);
  assert.equal((await fetch(base + '/cuts/manifest.csv')).status, 404);
});

test('each reference aspect modifies only the selected part', () => {
  const input = { script: '도령 | 창문을 연다\n도령 | 거울을 든다', scene: '붉은 등불이 켜진 방' };
  const base = compile(input).panels[0];
  const using = aspects => compile({ ...input, overrides: { 0: { id: 'GM-06-013', aspects } } }).panels[0];
  const composition = using(['composition']);
  assert.equal(composition.shot, '클로즈업');
  assert.equal(composition.frame.height, base.frame.height);
  assert.match(composition.image, /얼굴 절반/);
  assert.doesNotMatch(composition.image, /참고 색·빛/);
  const light = using(['lighting']);
  assert.equal(light.shot, base.shot);
  assert.equal(light.angle, base.angle);
  assert.equal(light.frame.height, base.frame.height);
  assert.match(light.image, /참고 색·빛/);
  assert.match(light.image, /붉은 등불이 켜진 방/);
  const length = using(['length']);
  assert.equal(length.shot, base.shot);
  assert.equal(length.angle, base.angle);
  assert.equal(length.frame.height, 497);
  assert.doesNotMatch(length.image, /참고 색·빛|얼굴 절반/);
  assert.deepEqual(using([]).frame, base.frame);
});

test('an approved cut keeps exact text and camera while position follows the new scene', () => {
  const original = compile(scene).panels[1];
  const edited = '  얼굴은 화면 오른쪽,\n침묵은 한 박자 길게.  ';
  const scene2 = { ...scene, script: '바깥에 비가 온다\n' + scene.script, style: 'ink', overrides: {} };
  const outer = compile({ ...scene2, edits: { 2: { image: edited, lock: original.lock } } });
  const moved = outer.panels[2];
  assert.equal(moved.image, edited);
  assert.equal(moved.locked, true);
  assert.equal(moved.reference.id, original.reference.id);
  assert.equal(moved.shot, original.shot);
  assert.equal(moved.angle, original.angle);
  assert.equal(moved.frame.height, original.frame.height);
  assert.notEqual(moved.frame.y, original.frame.y);
  assert.equal(outer.panels[0].locked, false);
  assert.equal(compile({ ...scene2, edits: { 2: { image: edited } } }).panels[2].locked, false);
});
