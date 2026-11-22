'use strict';

const $ = id => document.getElementById(id);
const form = $('form');
const sample = {
  script: [
    '상담객 | 비가 내리는 밤, 상담방 문 앞에 멈춰 선다 [내레이션: 그날도 비가 내렸다.]',
    '명경도령 | 거울을 닦던 손을 멈추고 눈만 든다 "거기 앉아."',
    '명경도령 | 손끝으로 오래된 조마경을 돌린다 [효과음: 달칵]',
    '상담객 | 거울을 들여다보다 굳어 있던 얼굴이 풀린다',
    '명경도령 | 시선을 피한 채 따뜻한 찻잔을 밀어준다 "식기 전에."',
  ].join('\n'),
  cast: '명경도령 | 흑발, 짙은 녹색 도포, 가는 금색 귀걸이\n상담객 | 검은 머리를 낮게 묶은 여성, 회색 재킷',
  scene: '오래된 한옥 상담방. 창밖은 차가운 비, 방 안은 등불 한 점. 먹빛 바탕에 청록과 호박색.',
};

const state = { result: null, refs: [], edits: new Map(), keys: [], open: 0, changed: false, request: 0 };
const storageKey = 'rough-prompt-editor-v1';
const aspectLabels = { composition: '구도', lighting: '색·빛', length: '컷 길이' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const matches = { exact: '원본 컷 ID 매칭', similar: '유사 구도', manual: '직접 지정' };

function scriptKeys(script) {
  const seen = new Map();
  return script.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const count = seen.get(line) ?? 0;
    seen.set(line, count + 1);
    return JSON.stringify([line, count]);
  });
}

function readForm() {
  return { script: $('script').value, cast: $('cast').value, scene: $('scene').value,
    style: new FormData(form).get('style') };
}

function saveWork() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      fields: readForm(), edits: [...state.edits].slice(-100),
    }));
  } catch {
    // The editor can still operate when browser storage is disabled or full.
  }
}

function restoreWork() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved || typeof saved.fields?.script !== 'string') return false;
    for (const key of ['script', 'cast', 'scene']) $(key).value = saved.fields[key] ?? '';
    for (const input of form.querySelectorAll('[name="style"]')) input.checked = input.value === saved.fields.style;
    state.edits = new Map(Array.isArray(saved.edits) ? saved.edits : []);
    return Boolean(saved.fields.script.trim());
  } catch {
    return false;
  }
}

function cutEdit(index = state.open) {
  const key = state.keys[index];
  if (!state.edits.has(key)) state.edits.set(key, {});
  return state.edits.get(key);
}

function updateCount() {
  const count = $('script').value.split(/\r?\n/).filter(line => line.trim()).length;
  $('cut-count').textContent = `${count}컷 / 최대 30컷`;
  $('generate').disabled = count === 0 || count > 30;
}

function toggleExports(enabled) {
  for (const id of ['copy-all', 'save-layout', 'save-text']) $(id).disabled = !enabled;
}

function markChanged() {
  state.request++;
  saveWork();
  state.changed = true;
  $('form-error').textContent = '';
  updateCount();
  $('generate').textContent = '프롬프트 생성';
  if (!state.result) return;
  $('result-meta').textContent = '입력을 수정했어요. 다시 생성하면 결과가 갱신됩니다.';
  toggleExports(false);
  $('cuts').inert = true;
}

function referenceOptions(panel) {
  const option = ref => `<option value="${esc(ref.id)}"${panel.match === 'manual' && panel.reference?.id === ref.id ? ' selected' : ''}>${esc([ref.id, ref.shot, ref.composition].filter(Boolean).join(' · '))}</option>`;
  return [
    '<option value="">자동 추천</option>',
    ...[['color', '원본 기반 러프'], ['cre', '창작 연출']].map(([kind, label]) =>
      `<optgroup label="${label}">${state.refs.filter(ref => ref.kind === kind).map(option).join('')}</optgroup>`),
  ].join('');
}

function referenceControls(panel) {
  const ref = panel.reference;
  return `<div class="ref-card">
    ${ref ? `<a href="${esc(ref.image)}" target="_blank" rel="noopener" aria-label="${esc(ref.id)} 이미지 열기"><img src="${esc(ref.image)}" alt=""></a>` : '<span></span>'}
    <div>
      <p class="ref-meta">패턴 컷 ${esc(panel.sourceCut)}${ref ? ` · ${esc(matches[panel.match])} ${esc(ref.id)}` : ''}</p>
      <label class="sr-only" for="reference">이 컷의 참고 이미지</label>
      <select id="reference" ${panel.locked ? 'disabled' : ''}>${referenceOptions(panel)}</select>
      ${panel.match === 'manual' ? `<fieldset class="ref-aspects" ${panel.locked ? 'disabled' : ''}>
        <legend>가져올 요소</legend>
        ${Object.entries(aspectLabels).map(([aspect, label]) => `<label><input type="checkbox" data-aspect="${aspect}" ${panel.aspects.includes(aspect) ? 'checked' : ''}> ${label}</label>`).join('')}
      </fieldset>` : ''}
    </div>
  </div>`;
}

function render() {
  const { result } = state;
  if (!result) return;
  $('result-meta').textContent = `${result.panels.length}컷 · 세로 ${result.height.toLocaleString('ko-KR')}px`;
  $('plan').hidden = false;
  $('plan').innerHTML = result.chapters.map((c, i) =>
    `<span><strong>${result.chapters.length > 1 ? `${i + 1}묶음 · ` : ''}${esc(c.goal)}</strong> · ${esc(c.curve)} · ${esc(c.pace)} 템포</span>`).join('');
  $('cuts').inert = false;
  $('cuts').innerHTML = result.panels.map((panel, i) => {
    const ref = panel.reference;
    return `<article class="cut">
      <button class="cut-summary" data-open="${i}" type="button" aria-controls="cut-body-${i}" aria-expanded="${i === state.open}" id="cut-${i}">
        <span class="cut-number">${String(i + 1).padStart(2, '0')}</span>
        <span class="cut-title">${esc(panel.title)}</span>
        <span class="cut-shot">${panel.locked ? '<b class="fixed-label">확정</b> · ' : ''}${esc(panel.shot)} · ${esc(panel.role)}</span>
        <span class="chevron" aria-hidden="true">⌄</span>
      </button>
      ${i === state.open ? `<div class="cut-detail" id="cut-body-${i}">
        ${referenceControls(panel)}
        <div class="cut-tools prompt-heading">
          <label for="image-editor">그림 프롬프트</label>
          <div class="cut-buttons">
            ${!panel.locked ? '<button type="button" class="button mini quiet" id="reset-image" data-reset-image>자동 문장으로</button>' : ''}
            <button type="button" class="button mini" data-copy="image">복사</button>
          </div>
        </div>
        <textarea class="prompt editable" id="image-editor" rows="7" maxlength="6000" ${panel.locked ? 'readonly' : ''}>
${esc(panel.image)}</textarea>
        <p class="edit-hint" id="edit-hint" ${panel.locked || panel.image === panel.generated ? 'hidden' : ''}>직접 수정한 문장을 유지 중이에요. 참고 변경을 문장에 반영하려면 자동 문장으로 돌아가세요.</p>
        <div class="cut-tools">
          <h3>식자·배치</h3><button type="button" class="button mini" data-copy="layout">복사</button>
        </div>
        <pre class="prompt" tabindex="0">${esc(panel.layout)}</pre>
        <div class="commit-row">
          <p>${panel.locked ? '문장·구도·컷 길이를 고정했어요.' : '확정한 문장과 구도는 다시 생성해도 유지돼요.'}</p>
          <button type="button" class="button mini ${panel.locked ? '' : 'primary'}" id="toggle-lock" data-lock>${panel.locked ? '확정 풀기' : '이 컷 확정'}</button>
        </div>
      </div>` : `<div id="cut-body-${i}" hidden></div>`}
    </article>`;
  }).join('');
  const reset = $('reset-image');
  if (reset) reset.disabled = result.panels[state.open].image === result.panels[state.open].generated;
  toggleExports(true);
}

async function generate({ focusSelector = null, keepSelection = true } = {}) {
  const request = ++state.request;
  const fields = readForm();
  const keys = scriptKeys(fields.script);
  const selectedKey = keepSelection ? state.keys[state.open] : undefined;
  const overrides = {};
  const edits = {};
  keys.forEach((key, i) => {
    const record = state.edits.get(key);
    if (record?.reference) overrides[i] = record.reference;
    if (record?.image) edits[i] = { image: record.image, ...(record.lock ? { lock: record.lock } : {}) };
  });
  const payload = { ...fields, overrides, edits };
  $('generate').disabled = true;
  $('generate').textContent = '생성 중…';
  $('form-error').textContent = '';
  toggleExports(false);
  $('cuts').inert = true;
  try {
    const response = await fetch('api/compile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error(result?.error || '프롬프트 서버에 연결하지 못했어요.');
    if (request !== state.request) return;
    state.result = result;
    state.keys = keys;
    state.changed = false;
    const moved = keys.indexOf(selectedKey);
    state.open = moved >= 0 ? moved : Math.min(state.open, result.panels.length - 1);
    render();
    if (focusSelector) document.querySelector(focusSelector)?.focus({ preventScroll: true });
    return true;
  } catch (error) {
    if (request === state.request) {
      $('form-error').textContent = error.message;
      if (state.result && !state.changed) {
        render();
        if (focusSelector) document.querySelector(focusSelector)?.focus({ preventScroll: true });
      }
      return false;
    }
  } finally {
    if (request === state.request) {
      updateCount();
      $('generate').textContent = '프롬프트 생성';
    }
  }
}

function applyExample() {
  for (const [key, value] of Object.entries(sample)) $(key).value = value;
  state.open = 0;
  markChanged();
  generate({ keepSelection: false });
}

function allText() {
  return state.result.panels.map(panel => [
    `## ${panel.number}컷 · ${panel.title}`, panel.image, panel.layout,
    `패턴 컷 ${panel.sourceCut}${panel.reference ? ' / 참고 ' + panel.reference.id : ''}`,
  ].join('\n\n')).join('\n\n---\n\n');
}

let noticeTimer;
function notify(message) {
  $('notice').textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $('notice').textContent = ''; }, 2400);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify('복사했어요.');
  } catch {
    notify('복사 권한을 확인하거나 TXT로 저장해주세요.');
  }
}

function file(name, type, content) {
  const link = document.createElement('a');
  link.download = name;
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

form.addEventListener('input', markChanged);
form.addEventListener('submit', event => { event.preventDefault(); generate(); });
$('example').addEventListener('click', applyExample);
$('cuts').addEventListener('click', event => {
  if (state.changed) return;
  const open = event.target.closest('[data-open]');
  if (open) {
    state.open = state.open === +open.dataset.open ? -1 : +open.dataset.open;
    render();
    $('cut-' + open.dataset.open)?.focus({ preventScroll: true });
  }
  const panel = state.result.panels[state.open];
  const button = event.target.closest('[data-copy]');
  if (button && panel) copy(panel[button.dataset.copy]);
  if (!panel) return;
  if (event.target.closest('[data-reset-image]')) {
    delete cutEdit().image;
    panel.image = panel.generated;
    $('image-editor').value = panel.image;
    $('reset-image').disabled = true;
    $('edit-hint').hidden = true;
    saveWork();
    $('image-editor').focus();
  }
  if (event.target.closest('[data-lock]')) toggleLock(panel);
});

async function toggleLock(panel) {
  const record = cutEdit();
  if (panel.locked) {
    const lock = record.lock;
    delete record.lock;
    if (await generate({ focusSelector: '#toggle-lock' }) === false) record.lock = lock;
    saveWork();
    return;
  }
  const text = $('image-editor').value;
  if (!text.trim() || text.length > 6000) {
    notify('프롬프트를 6,000자 이내로 수정해주세요.');
    return;
  }
  record.image = text;
  panel.image = text;
  record.lock = panel.lock;
  panel.locked = true;
  saveWork();
  render();
  $('toggle-lock')?.focus();
}

$('cuts').addEventListener('input', event => {
  if (state.changed || event.target.id !== 'image-editor') return;
  const panel = state.result.panels[state.open];
  if (panel.locked) return;
  const value = event.target.value;
  const record = cutEdit();
  if (value.trim() && value !== panel.generated) record.image = value;
  else delete record.image;
  panel.image = record.image ?? panel.generated;
  $('reset-image').disabled = panel.image === panel.generated;
  $('edit-hint').hidden = panel.image === panel.generated;
  saveWork();
});

$('cuts').addEventListener('change', async event => {
  if (state.changed) return;
  const panel = state.result.panels[state.open];
  if (!panel || panel.locked) return;
  const aspect = event.target.dataset?.aspect;
  if (event.target.id !== 'reference' && !aspect) return;
  const record = cutEdit();
  const before = record.reference;
  if (event.target.id === 'reference') {
    if (event.target.value) record.reference = { id: event.target.value, aspects: before?.aspects ?? ['composition'] };
    else delete record.reference;
  } else if (before) {
    const parts = new Set(before.aspects);
    if (event.target.checked) parts.add(aspect);
    else parts.delete(aspect);
    record.reference = { id: before.id, aspects: [...parts] };
  }
  const success = await generate({ focusSelector: aspect ? `[data-aspect="${aspect}"]` : '#reference' });
  if (success === false) {
    if (before) record.reference = before;
    else delete record.reference;
  }
  if (success) saveWork();
});
$('copy-all').addEventListener('click', () => copy(allText()));
$('save-text').addEventListener('click', () => file('rough-prompts.txt', 'text/plain;charset=utf-8', allText()));
$('save-layout').addEventListener('click', () => file('rough-layout.json', 'application/json', JSON.stringify({
  width: state.result.width, height: state.result.height, chapters: state.result.chapters,
  panels: state.result.panels.map(({ number, frame, letter, sourceCut, reference, aspects, locked }) => ({ number, frame, letter, sourceCut, reference, aspects, locked })),
}, null, 2)));

const restored = restoreWork();
updateCount();
if (restored) generate();
fetch('api/references').then(response => {
  if (!response.ok) throw new Error();
  return response.json();
}).then(refs => {
  state.refs = refs;
  if (state.result && !state.changed) render();
}).catch(() => { $('form-error').textContent = '참고 컷 목록을 불러오지 못했어요.'; });
