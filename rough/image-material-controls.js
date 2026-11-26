(() => {
  const panel = $('#wimagefx'), fileInput = $('#wimage-file'), library = $('#wimage-library');
  const targetSelect = $('#wimage-target'), place = $('#wimage-place'), status = $('#wimage-status');
  const placement = $('#wimage-transform'), maskOptions = $('#wimage-mask-options');
  const defaults = {x: 50, y: 50, scale: 100, angle: 0, opacity: 100, spill: false};
  const maskDefaults = {kind: '', edge: 'bottom', length: 35, strength: 100};
  let index = -1, cutKey = '';

  function nextCut() {
    const cuts = [...pageReader.querySelectorAll('[data-slot-index]')];
    const current = cuts.findIndex(cut => pageKey(cut) === pageSelection);
    return current >= 0 ? cuts[current + 1] : undefined;
  }

  function refresh() {
    panel.hidden = !pageEditing || !pageSelection || !!selectedLetter;
    if (panel.hidden) return;
    if (cutKey !== pageSelection) {
      cutKey = pageSelection;
      index = -1;
      status.textContent = '';
    }
    const settings = pageSettings();
    const layers = settings?.overlays || [];
    if (index >= layers.length) index = -1;
    const previous = library.value;
    const assets = Object.values(IMG.overlay);
    library.replaceChildren(...assets.map(asset => new Option(asset.name, asset.id)));
    if (Object.hasOwn(IMG.overlay, previous)) library.value = previous;
    library.hidden = place.hidden = !assets.length;
    targetSelect.replaceChildren(new Option('컷 그림', '-1'),
      ...layers.map((layer, i) => [layer, i]).filter(([layer]) => !layer.layer || (typeof LAYER_MODE !== 'undefined' && LAYER_MODE))
        .map(([layer, i]) => new Option(`${i + 1} · ${IMG.overlay[layer.asset]?.name || '소재 파일 없음'}`, i)));
    targetSelect.value = index;
    const layer = layers[index];
    placement.hidden = !layer;
    panel.querySelectorAll('[data-image-value]').forEach(input => {
      const value = layer?.[input.dataset.imageValue] ?? defaults[input.dataset.imageValue];
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value;
    });
    $('#wimage-copy').disabled = !nextCut();
    const mask = index < 0 ? settings?.artMask : layer?.mask;
    panel.querySelectorAll('[data-image-mask]').forEach(input => {
      const key = input.dataset.imageMask;
      input.value = mask?.[key] ?? maskDefaults[key];
    });
    maskOptions.hidden = !mask?.kind;
  }

  function update(edit, key = pageSelection) {
    if (!key) return;
    edit(pageSettings(true, key));
    saveScenes();
    renderWebtoon();
  }

  function addToCut(ids) {
    update(settings => {
      const layers = settings.overlays ||= [];
      layers.push(...ids.map(asset => ({asset})));
      index = layers.length - 1;
    });
  }

  async function readPNG(file) {
    const url = URL.createObjectURL(file);
    try {
      const im = await loadImg(url);
      const scale = Math.min(1, 1536 / Math.max(im.naturalWidth, im.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(im.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(im.naturalHeight * scale));
      canvas.getContext('2d').drawImage(im, 0, 0, canvas.width, canvas.height);
      return {id: 'overlay:' + crypto.randomUUID(), kind: 'overlay', name: file.name,
        src: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height};
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const originalSelect = selectPageCut, originalLetter = selectLetter;
  selectPageCut = function (...args) { originalSelect(...args); refresh(); };
  selectLetter = function (...args) { originalLetter(...args); refresh(); };
  targetSelect.addEventListener('change', () => { index = Number(targetSelect.value); refresh(); });
  $('#wimage-add').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const key = pageSelection, [scene, slot] = key.split(':').map(Number);
    const sceneId = SCENES[scene]?.id, cut = SCENES[scene]?.cuts[slot];
    const files = [...fileInput.files], ids = [];
    fileInput.value = '';
    let failed = 0;
    for (const file of files) {
      try {
        if (!(file.type === 'image/png' || /\.png$/i.test(file.name))) throw new Error('PNG');
        const asset = await readPNG(file);
        if (await idb.put(asset) !== asset.id) throw new Error('저장 실패');
        IMG.overlay[asset.id] = asset;
        ids.push(asset.id);
      } catch (_) { failed++; }
    }
    const sameCut = key && pageSelection === key && SCENES[scene]?.id === sceneId && SCENES[scene]?.cuts[slot] === cut;
    if (ids.length && sameCut) addToCut(ids);
    else refresh();
    const added = ids.length ? `소재 ${ids.length}장 ${sameCut ? '배치' : '등록'}` : '';
    status.textContent = [added, failed ? `PNG ${failed}장을 추가하지 못했어요` : ''].filter(Boolean).join(' · ');
  });
  place.addEventListener('click', () => { if (library.value) addToCut([library.value]); });
  $('#wimage-remove').addEventListener('click', () => {
    if (index < 0) return;
    update(settings => { settings.overlays.splice(index, 1); index = -1; });
  });
  $('#wimage-copy').addEventListener('click', () => {
    const next = nextCut(), source = pageSettings()?.overlays?.[index];
    if (!next || !source) return;
    update(settings => (settings.overlays ||= []).push(structuredClone(source)), pageKey(next));
    status.textContent = '다음 컷에 복제했어요';
  });
  panel.addEventListener('change', event => {
    const input = event.target;
    const property = input.dataset.imageValue, maskProperty = input.dataset.imageMask;
    if (!property && !maskProperty) return;
    const value = input.type === 'checkbox' ? input.checked : input.type === 'number'
      ? Math.max(Number(input.min), Math.min(Number(input.max), input.valueAsNumber)) : input.value;
    if (typeof value === 'number' && !Number.isFinite(value)) { refresh(); return; }
    update(settings => {
      const layer = settings.overlays?.[index];
      if (property) { if (layer) { layer[property] = value; delete layer.auto; } return; }
      const subject = layer || settings;
      const field = layer ? 'mask' : 'artMask';
      if (maskProperty === 'kind' && !value) delete subject[field];
      else subject[field] = {...maskDefaults, ...subject[field], [maskProperty]: value};
    });
  });
  // 편집 화면에서 레이어(이미지 소재)를 눌러 고르면 이 패널도 그 레이어로
  window.RoughOverlayPanel = {select(i) { index = Number(i); refresh(); }, get index() { return index; }, refresh};
  refresh();
})();
