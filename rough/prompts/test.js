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
  assert.equal((await send({ script: 'a'.repeat(100000) })).status, 413);
  assert.equal((await fetch(base + '/cuts/manifest.csv')).status, 404);
});
