function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('이미지 파일을 읽을 수 없어요.'));
    reader.readAsDataURL(file);
  });
}

async function asPng(source, maxEdge) {
  const image = new Image();
  image.src = source;
  try {
    await image.decode();
  } catch {
    throw new Error('참고 이미지를 읽을 수 없어요. PNG, JPG, WebP 파일을 확인해주세요.');
  }
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png').split(',')[1];
}

function imageDirection(panel) {
  const action = panel.act.replace(/"[^"]*"/g, '').trim();
  const style = $('#imageStyle').value.trim();
  return [
    panel.who && `인물: ${panel.who}`,
    action && `행동: ${action}`,
    `샷: ${panel.shot} / 앵글: ${panel.ang}`,
    `프레임의 높이/너비 비율: ${panel.h}`,
    panel.composition && `구도: ${panel.composition}`,
    style && `이 장면의 공간·캐릭터·색감: ${style}`,
  ].filter(Boolean).join('\n');
}

function imageStatus(panel) {
  if (panel.imagePending) return '이미지 생성 중…';
  if (panel.imageError) return panel.imageError;
  if (!panel.image) return '';
  if (panel.image.direction !== imageDirection(panel) ||
      panel.image.reference !== $('#imageReference').files[0]) {
    return '연출 또는 참고 설정이 바뀌었어요. 재생성하면 반영돼요.';
  }
  return '이미지가 콘티에 들어갔어요.';
}

async function generatePanelImage(panel, index) {
  if (panel.imagePending) return;
  const direction = imageDirection(panel);
  const reference = $('#imageReference').files[0];
  const width = 630;
  const height = Math.round(panel.h * width);
  const size = panel.h < .82 ? '1536x1024' : panel.h < 1.2 ? '1024x1024' :
    panel.h < 2 ? '1024x1536' : '768x2304';
  const drawing = '<rect width="100%" height="100%" fill="white"/>' +
    drawPanel(panel, 0, 0, width, height, index);
  const sketchUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(roughSvg(width, height, drawing));

  panel.imagePending = true;
  panel.imageError = '';
  refreshImagePanel(panel);
  try {
    if (reference && (reference.size > 16 * 1024 * 1024 ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(reference.type))) {
      throw new Error('16MB 이내의 PNG, JPG, WebP 파일을 선택해주세요.');
    }
    const [sketch, character] = await Promise.all([
      asPng(sketchUrl, 900),
      reference ? readImage(reference).then(url => asPng(url, 900)) : null,
    ]);
    const response = await fetch('api/panel-image', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({direction, size, sketch, reference: character}),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      throw new Error(failure.error || '러프 툴 서버를 실행한 뒤 다시 시도해주세요.');
    }
    if (!response.headers.get('Content-Type')?.startsWith('image/jpeg')) {
      throw new Error('서버에서 이미지 파일을 받지 못했어요.');
    }
    const src = await readImage(await response.blob());
    panel.image = {src, direction, reference};
  } catch (error) {
    panel.imageError = error instanceof TypeError ? '서버에 연결하지 못했어요. 연결을 확인해주세요.' : error.message;
  } finally {
    panel.imagePending = false;
    refreshImagePanel(panel);
  }
}

function refreshImagePanel(panel) {
  if (!state.panels.includes(panel)) return;
  if (sheetKind === 'cut' && state.panels[state.sel] === panel) {
    refreshCut();
  } else {
    render();
    renderCutList();
  }
}
