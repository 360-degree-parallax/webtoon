// 컷 그림과 이미지 소재에 공통으로 사용하는 비파괴 가장자리 마스크.
window.RoughImageMaterials = (() => {
  const kinds = ['fade', 'watercolor', 'ink'];
  const directions = {bottom: [0, 0, 0, 1], top: [0, 1, 0, 0], right: [0, 0, 1, 0], left: [1, 0, 0, 0]};
  const number = (value, fallback, min, max) =>
    typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  const rect = ({x, y, w, h}) => `x="${x}" y="${y}" width="${w}" height="${h}"`;
  const url = id => `url(#${id})`;
  const enabled = mask => kinds.includes(mask?.kind) && number(mask.strength, 100, 0, 100) > 0;

  function maskSVG(mask, id, box) {
    if (!enabled(mask)) return '';
    const direction = Object.hasOwn(directions, mask.edge) ? mask.edge : 'bottom';
    const [x1, y1, x2, y2] = directions[direction];
    const edge = number(mask.length, 35, 5, 100) / 100;
    const alpha = 1 - number(mask.strength, 100, 0, 100) / 100;
    const size = Math.min(box.w, box.h);
    const rough = mask.kind !== 'fade';
    const ink = mask.kind === 'ink';
    const displacement = Math.round(Math.min(size * (ink ? .075 : .045), (x1 !== x2 ? box.w : box.h) * edge * .55));
    // Extend the gradient past the mask bounds so displacement keeps the other edges opaque.
    const extended = {x: box.x - displacement, y: box.y - displacement, w: box.w + 2 * displacement, h: box.h + 2 * displacement};
    const gradient = `<linearGradient id="${id}-gradient" gradientUnits="userSpaceOnUse" x1="${box.x + x1 * box.w}" y1="${box.y + y1 * box.h}" x2="${box.x + x2 * box.w}" y2="${box.y + y2 * box.h}"><stop offset="${1 - edge}" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="${alpha}"/></linearGradient>`;
    const filter = rough ? `<filter id="${id}-grain" filterUnits="userSpaceOnUse" ${rect(extended)} color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${ink ? '.034 .065' : '.012 .039'}" numOctaves="${ink ? 3 : 2}" seed="${ink ? 23 : 11}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${displacement}" xChannelSelector="R" yChannelSelector="G"/></filter>` : '';
    return gradient + filter + `<mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" ${rect(box)}><rect ${rect(extended)} fill="${url(id + '-gradient')}"${rough ? ` filter="${url(id + '-grain')}"` : ''}/></mask>`;
  }

  function overlaysSVG(overlays, assets, id, box, gap, pageWidth) {
    let defs = '', art = '';
    for (const [index, layer] of (overlays || []).entries()) {
      if (!layer) continue;  // 숨긴 레이어(요소별 레이어를 끈 한 컷 보기) — 번호는 그대로
      const asset = assets[layer.asset];
      if (!asset || !/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(asset.src) || !(asset.w > 0 && asset.h > 0)) continue;
      const key = `${id}-overlay-${index}`;
      const width = box.w * number(layer.scale, 100, 5, 300) / 100;
      const height = width * asset.h / asset.w;
      const cx = box.x + box.w * number(layer.x, 50, -50, 150) / 100;
      const cy = box.y + box.h * number(layer.y, 50, -50, 150) / 100;
      const bounds = {x: cx - width / 2, y: cy - height / 2, w: width, h: height};
      const mask = maskSVG(layer.mask, key + '-mask', bounds);
      defs += mask;
      if (layer.spill) defs += `<clipPath id="${key}-bounds" data-overlay-overflow="${id}"><rect ${rect({x: 0, y: box.y, w: pageWidth, h: box.h + gap})}/></clipPath>`;
      const label = String(asset.name || '').replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
      art += `<g data-overlay="${index}"${layer.layer ? ` data-overlay-layer="${layer.layer}"` : ''}${label ? ` data-label="${label}"` : ''} clip-path="${url(layer.spill ? key + '-bounds' : id)}" class="ov-pick" data-ov-box="${[bounds.x, bounds.y, bounds.w, bounds.h, box.w, box.h].map(v => Math.round(v * 10) / 10).join(',')}"><g transform="rotate(${number(layer.angle, 0, -180, 180)} ${cx} ${cy})" opacity="${number(layer.opacity, 100, 0, 100) / 100}"${mask ? ` mask="${url(key + '-mask')}"` : ''}><image href="${asset.src}" ${rect(bounds)}/></g></g>`;
    }
    return {defs, art};
  }

  return {enabled, maskSVG, overlaysSVG};
})();
