/* NovelAI 이미지 생성(V4.5) 연결 — 내 NovelAI 영구 API 토큰(계정 설정 → Get Persistent API Token, pst-…)으로 브라우저에서 바로 부름
   - 공식 문서로 공개된 API가 아니라 NovelAI 웹사이트가 쓰는 주소(image.novelai.net/ai/generate-image)를 씀(커뮤니티 라이브러리들과 같은 형식). 바뀌면 깨질 수 있음
   - 브라우저가 다른 사이트 호출을 막으면(CORS) 로컬 서버(python3 rough/serve.py)의 /nai-proxy로 다시 보냄
   - 응답은 ZIP 안의 PNG 한 장 → Blob
   브라우저(window.RoughNaiApi)와 Node(require, 시험용) 모두에서 씀 */
(function (A) {
  'use strict';
  const HOST = 'https://image.novelai.net', PATH = '/ai/generate-image', PROXY = '/nai-proxy' + PATH;
  const MODEL = 'nai-diffusion-4-5-full';
  // 화질 태그(웹사이트의 Add Quality Tags) · 가벼운 제외 프리셋(웹사이트 Light — 캐릭터 시트용으로 multiple views는 뺌)
  const QUALITY = 'very aesthetic, masterpiece, no text';
  const UC_LIGHT = 'lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, too many watermarks, blank page';
  const SAMPLER = { 'Euler Ancestral': 'k_euler_ancestral', Euler: 'k_euler', 'DPM++ 2M': 'k_dpmpp_2m', 'DPM++ 2S Ancestral': 'k_dpmpp_2s_ancestral', 'DPM++ SDE': 'k_dpmpp_sde' };
  const dedup = t => { const seen = new Set(); return String(t || '').split(',').map(x => x.trim()).filter(x => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).join(', '); };
  const snap = v => Math.max(64, Math.round(v / 64) * 64);
  // 크기: 64의 배수, 무료 범위(약 1024×1024 픽셀 수) 안으로 줄임
  function size(w, h, max = 1024 * 1024) { let W = w || 832, H = h || 1216; const k = Math.min(1, Math.sqrt(max / (W * H))); return [snap(W * k), snap(H * k)]; }
  // opts: { prompt, negative, chars:[{prompt, uc, x, y}], width, height, steps, scale, sampler, seed, quality, refs:[base64], refStrength, refFidelity, image(base64, img2img), strength }
  function payload(o) {
    const [width, height] = size(o.width, o.height);
    const chars = (o.chars || []).filter(c => c && c.prompt).map(c => ({ prompt: dedup(c.prompt), uc: dedup(c.uc || 'lowres, aliasing'), center: { x: +(c.x ?? 0.5).toFixed(2), y: +(c.y ?? 0.5).toFixed(2) } }));
    const prompt = dedup([o.prompt, o.quality === false ? '' : QUALITY].filter(Boolean).join(', '));
    const negative = dedup([o.ucPreset === false ? '' : UC_LIGHT, o.negative].filter(Boolean).join(', '));
    const useCoords = chars.some(c => c.center.x !== 0.5 || c.center.y !== 0.5);
    const p = {
      params_version: 3, width, height, scale: o.scale ?? 5, sampler: SAMPLER[o.sampler] || o.sampler || 'k_euler_ancestral', steps: o.steps ?? 28,
      n_samples: 1, ucPreset: 1, qualityToggle: o.quality !== false, dynamic_thresholding: false, controlnet_strength: 1, legacy: false, add_original_image: true,
      cfg_rescale: o.rescale ?? 0, noise_schedule: o.noise || 'karras', legacy_v3_extend: false, skip_cfg_above_sigma: null, use_coords: useCoords, legacy_uc: false,
      normalize_reference_strength_multiple: true, deliberate_euler_ancestral_bug: false, prefer_brownian: true, autoSmea: false,
      seed: o.seed ?? Math.floor(Math.random() * 4294967288), negative_prompt: negative,
      characterPrompts: chars.map(c => ({ prompt: c.prompt, uc: c.uc, center: c.center, enabled: true })),
      v4_prompt: { caption: { base_caption: prompt, char_captions: chars.map(c => ({ char_caption: c.prompt, centers: [c.center] })) }, use_coords: useCoords, use_order: true },
      v4_negative_prompt: { caption: { base_caption: negative, char_captions: chars.map(c => ({ char_caption: c.uc, centers: [c.center] })) }, legacy_uc: false },
    };
    // 캐릭터 참고(Precise Reference): 캐릭터 시트를 붙여 얼굴·옷을 고정(+5 Anlas)
    if ((o.refs || []).length) Object.assign(p, {
      director_reference_images: o.refs, director_reference_descriptions: o.refs.map(() => ({ caption: { base_caption: 'character&style', char_captions: [] }, legacy_uc: false })),
      director_reference_information_extracted: o.refs.map(() => 1), director_reference_strength_values: o.refs.map(() => o.refStrength ?? 1),
      director_reference_secondary_strength_values: o.refs.map(() => 1 - (o.refFidelity ?? 1)) });
    let action = 'generate';
    if (o.image) { action = 'img2img'; Object.assign(p, { image: o.image, strength: o.strength ?? 0.6, noise: 0, extra_noise_seed: Math.floor(Math.random() * 4294967288) }); }
    return { input: prompt, model: MODEL, action, parameters: p };
  }
  // 예상 Anlas(커뮤니티 라이브러리의 계산식). Opus 구독은 1024×1024·28단계 이하 한 장이 무료
  function cost(pl) {
    const p = pl.parameters, steps = p.steps || 28; let res = Math.max(p.width * p.height, 65536); if (res > 832 * 1216 && res <= 1024 * 1024) res = 832 * 1216;
    let one = Math.ceil(2951823174884865e-21 * res + 5753298233447344e-22 * res * steps); one = Math.max(Math.ceil(one * (pl.action === 'img2img' ? (p.strength || 1) : 1)), 2);
    return { anlas: one + ((p.director_reference_images || []).length ? 5 : 0), opusFree: steps <= 28 && res <= 1024 * 1024 && !(p.director_reference_images || []).length };
  }
  // ZIP에서 첫 파일 꺼내기(저장 0 / deflate 8)
  async function unzipFirst(buf) {
    const b = new Uint8Array(buf), v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (v.getUint32(0, true) !== 0x04034b50) { if (b[0] === 0x89 && b[1] === 0x50) return b; throw new Error('NovelAI 응답이 그림 파일이 아니에요'); }
    const method = v.getUint16(8, true), flags = v.getUint16(6, true), nameLen = v.getUint16(26, true), extraLen = v.getUint16(28, true);
    let csize = v.getUint32(18, true); const start = 30 + nameLen + extraLen;
    if ((flags & 8) || !csize) { // 크기가 뒤(중앙 디렉터리)에 있으면 거기서 읽음
      for (let i = b.length - 22; i >= 0; i--) if (v.getUint32(i, true) === 0x06054b50) { const cd = v.getUint32(i + 16, true); csize = v.getUint32(cd + 20, true); break; }
    }
    const data = b.subarray(start, start + csize);
    if (method === 0) return data;
    if (method !== 8) throw new Error('지원하지 않는 압축 방식이에요');
    const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(ds).arrayBuffer());
  }
  const ERR = { 400: '요청 값이 맞지 않아요', 401: 'NovelAI 토큰이 맞지 않아요(계정 설정의 영구 API 토큰 pst-…)', 402: 'Anlas가 부족하거나 구독이 필요해요', 429: '이미 다른 그림을 만드는 중이에요 · 하나씩만 돼요', 500: 'NovelAI 서버 오류예요 · 잠시 뒤 다시', 503: 'NovelAI 서버가 바빠요 · 잠시 뒤 다시' };
  async function post(url, token, body, signal) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal });
    if (!r.ok) { let m = ''; try { const t = await r.text(); try { m = JSON.parse(t).message || ''; } catch (_) { m = t.slice(0, 200); } } catch (_) {} const e = new Error(`${ERR[r.status] || 'NovelAI 오류 ' + r.status}${m ? ' · ' + m : ''}`); e.status = r.status; throw e; }
    return r.arrayBuffer();
  }
  // 그림 만들기 → PNG Blob. 바로 부르기가 막히면(CORS·네트워크) 같은 주소의 로컬 서버 /nai-proxy로
  async function generate(token, opts, { onStatus, signal } = {}) {
    if (!token) throw new Error('NovelAI 토큰을 먼저 넣어 주세요');
    const body = payload(opts); onStatus?.('NovelAI에 보내는 중');
    let buf;
    try { buf = await post(HOST + PATH, token, body, signal); }
    catch (e) {
      if (e.status || e.name === 'AbortError') throw e;
      const local = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      if (!local) { const x = new Error('브라우저가 NovelAI 호출을 막았어요(CORS) · 로컬 서버로 열면 돼요: python3 rough/serve.py'); x.cors = true; throw x; }
      onStatus?.('로컬 서버를 거쳐 보내는 중'); buf = await post(PROXY, token, body, signal);
    }
    onStatus?.('그림 받는 중');
    return new Blob([await unzipFirst(buf)], { type: 'image/png' });
  }
  // 캐릭터 참고 그림: 웹사이트처럼 정해진 크기(세로 1024×1536 · 가로 1536×1024 · 정사각 1472×1472) 캔버스에 비율 유지로 넣고 PNG base64(브라우저 전용)
  async function refImage(src) {
    const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const r = im.naturalWidth / im.naturalHeight, [W, H] = r < 0.8 ? [1024, 1536] : r > 1.25 ? [1536, 1024] : [1472, 1472];
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const k = Math.min(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    return c.toDataURL('image/png').split(',')[1];
  }
  Object.assign(A, { payload, cost, unzipFirst, generate, refImage, size, MODEL });
})(typeof module !== 'undefined' ? module.exports : (window.RoughNaiApi = {}));
