// 3D 시안: 엔진이 정한 컷(샷·앵글·감정·행동)을 VRoid 모델로 흑백 툰 렌더링한다.
// three.js·three-vrm(MIT)과 CC0 VRoid 기본 체형(rough/models)을 쓴다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { VRMLoaderPlugin, VRMUtils } from './vendor/three-vrm.module.js';

export const MODELS = { female: 'models/Base_Female.vrm', male: 'models/Base_Male.vrm' };
const FACE = /Face(Mouth|Eyeline|Eyelash|Brow)|Eye(Iris|White|Highlight|Extra)/;
const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const grads = {};
function grad(shade) {
  if (grads[shade]) return grads[shade];
  const t = new THREE.DataTexture(new Uint8Array([shade, shade, shade, 255, 255, 255, 255, 255]), 2, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return grads[shade] = t;
}

// ---------- 인물 ----------
class Actor {
  constructor(vrm) { this.vrm = vrm; this.mats = []; }
  static async load(url) {
    const g = await loader.loadAsync(url); const vrm = g.userData.vrm; VRMUtils.rotateVRM0(vrm);
    const a = new Actor(vrm);
    vrm.scene.traverse(o => {
      if (!o.isMesh) return; o.frustumCulled = false;
      const list = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
        const n = m.name || '';
        if (FACE.test(n)) {
          if (/EyeExtra|Highlight/.test(n)) return new THREE.MeshBasicMaterial({ visible: false });
          const b = new THREE.MeshBasicMaterial({ map: m.map, transparent: true, alphaTest: .3, depthWrite: !/Eyeline|Eyelash|Brow|Mouth/.test(n) });
          b.userData.outlineParameters = { visible: false };
          b.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat g=dot(diffuseColor.rgb,vec3(.3,.59,.11));diffuseColor.rgb=vec3(g>.6?1.:g*.3);'); };
          return b;
        }
        const t = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: grad(222) });
        t.userData.outlineParameters = { thickness: .006, color: [0, 0, 0] };
        t.userData.cloth = /CLOTH|Accessory/.test(n);
        a.mats.push(t); return t;
      });
      o.material = Array.isArray(o.material) ? list : list[0];
    });
    return a;
  }
  look({ fill = '#ffffff', clothes = true }) {
    const c = new THREE.Color(fill), l = Math.round(c.getHSL({}).l * 255);
    for (const m of this.mats) { m.color.set(fill); m.gradientMap = grad(l > 200 ? 222 : Math.round(l * .82)); m.visible = clothes || !m.userData.cloth; }
  }
  bone(n) { return this.vrm.humanoid.getNormalizedBoneNode(n); }
  wpos(n) { this.vrm.scene.updateMatrixWorld(true); const b = this.bone(n); return b ? b.getWorldPosition(new THREE.Vector3()) : null; }
  reset() {
    for (const b of Object.values(this.vrm.humanoid.normalizedHumanBones || {})) b?.node?.quaternion.identity();
    const R = (n, x = 0, y = 0, z = 0) => { const b = this.bone(n); if (b) b.rotation.set(x, y, z); };
    R('leftUpperArm', 0, 0, 1.22); R('rightUpperArm', 0, 0, -1.22); R('leftLowerArm', 0, -.15, 0); R('rightLowerArm', 0, .15, 0);
    const m = this.vrm.expressionManager; for (const k of Object.keys(m.expressionMap)) m.setValue(k, 0);
  }
  rot(n, x = 0, y = 0, z = 0) { const b = this.bone(n); if (b) b.rotation.set(x, y, z); }
  face(ex) { const m = this.vrm.expressionManager; for (const [k, v] of Object.entries(ex)) if (m.expressionMap[k]) m.setValue(k, v); }
  // 팔 IK (CCD)
  reach(side, target, it = 20) {
    const ch = [side + 'LowerArm', side + 'UpperArm'], eff = this.bone(side + 'Hand'); const q = new THREE.Quaternion(), a = V(), b = V(), bp = V(), ep = V();
    for (let i = 0; i < it; i++) for (const n of ch) {
      const bn = this.bone(n); this.vrm.scene.updateMatrixWorld(true); bn.getWorldPosition(bp); eff.getWorldPosition(ep);
      a.subVectors(ep, bp).normalize(); b.subVectors(target, bp).normalize(); q.setFromUnitVectors(a, b);
      const bw = bn.getWorldQuaternion(new THREE.Quaternion()), pw = bn.parent.getWorldQuaternion(new THREE.Quaternion()); bn.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
    }
    this.vrm.scene.updateMatrixWorld(true);
  }
  aim(n, child, target) {
    const bn = this.bone(n), ch = this.bone(child); if (!bn || !ch) return; this.vrm.scene.updateMatrixWorld(true);
    const bp = bn.getWorldPosition(V()), cp = ch.getWorldPosition(V());
    const q = new THREE.Quaternion().setFromUnitVectors(cp.sub(bp).normalize(), target.clone().sub(bp).normalize());
    const bw = bn.getWorldQuaternion(new THREE.Quaternion()), pw = bn.parent.getWorldQuaternion(new THREE.Quaternion()); bn.quaternion.copy(pw.invert().multiply(q.multiply(bw))); this.vrm.scene.updateMatrixWorld(true);
  }
  curl(side, k = .6) { const sg = side === 'left' ? 1 : -1; for (const f of ['Index', 'Middle', 'Ring', 'Little']) for (const [s, m] of [['Proximal', 1], ['Intermediate', 1.1], ['Distal', .8]]) this.rot(side + f + s, 0, 0, sg * k * m); }
  place(pos, yaw) { this.vrm.scene.position.copy(pos); this.vrm.scene.rotation.set(0, Math.PI + yaw, 0); this.vrm.scene.updateMatrixWorld(true); }
}

// ---------- 감정 → 표정 ----------
const FACES = {
  평온: {}, 냉담: { blink: .38 }, 다정: { relaxed: .8 }, 기쁨: { happy: 1 }, 설렘: { relaxed: .55, blink: .2 },
  당황: { sad: .45, oh: .25 }, 의아: { ou: .3 }, 놀람: { Surprised: 1, oh: .5 }, 긴장: { sad: .3, blink: .1 },
  분노: { angry: 1 }, 쓸쓸: { sad: .9, blink: .25 }, 결의: { angry: .45 }, 회상: { blink: .55, relaxed: .3 }, 개그: { happy: .8, aa: .4 },
};
// 강도에 따라 표정 세기를 조절
function faceFor(emo, i) { const f = FACES[emo] || {}; const k = i >= 3 ? 1 : i === 2 ? .85 : .6; return Object.fromEntries(Object.entries(f).map(([a, v]) => [a, Math.min(1, v * (a === 'blink' ? 1 : k))])); }

// ---------- 행동 → 포즈 ----------
const has = (s, ws) => ws.some(w => s.includes(w));
function verbs(act) {
  return {
    walk: has(act, ['걸어', '걷', '다가', '달려', '뛰어']),
    turn: has(act, ['돌아보', '돌아봄', '돌아본', '뒤돌']),
    away: has(act, ['돌아서', '돌아선', '등을 돌', '떠나', '나감', '뒷모습']),
    grab: has(act, ['손목', '손을 잡', '팔을 잡', '붙잡']),
    hug: has(act, ['안기', '안아', '껴안', '끌어안', '포옹', '안김']),
    shoulder: has(act, ['어깨']),
    down: has(act, ['숙이', '숙임', '숙인', '고개를 떨', '내려다', '주저앉']),
    up: has(act, ['올려다', '고개를 들', '고개를 듦', '하늘을']),
    hand: has(act, ['손을 뻗', '손을 내', '내민', '건네', '가리키', '손가락']),
    cover: has(act, ['얼굴을 가', '입을 가', '감싸']),
  };
}

// ---------- 장면 연출 ----------
const SHOT_H = { 설정: 3.6, 전경: 2.6, 전신: 1.95, 중경: .86, 클로즈업: .36, 디테일: .2, '효과 배경': .42 };
const NOT_PERSON = /하늘|거리|배경|풍경|장소|정원|복도|방$|집$|도시|건물|골목|숲|바다|교실/;

export class Director {
  constructor() { this.actors = {}; this.renderer = null; this.cast = {}; }
  async ensure(name, model, onProgress) {
    const key = name + '|' + model;
    if (!this.actors[key]) { onProgress?.(`${name} 모델 불러오는 중`); this.actors[key] = await Actor.load(MODELS[model]); }
    return this.actors[key];
  }
  static guessCast(names) {
    const cast = {}; let k = 0;
    for (const n of names) cast[n] = NOT_PERSON.test(n) ? 'none' : (k++ % 2 ? 'male' : 'female');
    return cast;
  }
  async renderStrip(panels, { cast, width = 690, clothes = true, onProgress } = {}) {
    if (!this.renderer) { this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); this.renderer.setPixelRatio(1); this.fx = new OutlineEffect(this.renderer, { defaultThickness: .006, defaultColor: [0, 0, 0] }); }
    const ws = width - 60; let y = 30; const imgs = [];
    const names = Object.keys(cast).filter(n => cast[n] !== 'none');
    for (const n of names) await this.ensure(n, cast[n], onProgress);
    for (let i = 0; i < panels.length; i++) {
      onProgress?.(`${i + 1}/${panels.length}컷 그리는 중`);
      const p = panels[i], h = Math.round(p.h * ws);
      imgs.push({ c: this.cut(p, i, panels, ws, h, cast, clothes), y, h, p });
      y += h + Math.round(p.gap * ws) + 16;
    }
    const out = document.createElement('canvas'); out.width = width; out.height = y + 14; const g = out.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height);
    for (const { c, y: yy, h, p } of imgs) {
      g.drawImage(c, 30, yy); g.lineWidth = 3; g.strokeStyle = '#111'; g.strokeRect(30, yy, ws, h);
      if (p.said) balloon(g, 30, yy, ws, h, p.said);
    }
    return out;
  }
  cut(p, idx, panels, w, h, cast, clothes) {
    const scene = new THREE.Scene(); const dark = p.shot === '효과 배경';
    scene.background = new THREE.Color(dark ? '#2a2a2a' : '#ffffff');
    scene.add(new THREE.AmbientLight('#fff', 1.5)); const L = new THREE.DirectionalLight('#fff', 2.4); L.position.set(-1.2, 2, 2); scene.add(L);
    const act = p.act || '', vb = verbs(act);
    const isChar = n => n && cast[n] && cast[n] !== 'none';
    // 컷에 나오는 인물: 주인공 + 행동에 이름이 나온 인물 (넓은 샷이면 같은 묶음 인물 모두)
    const chunkNames = [...new Set(panels.filter(q => q.chunk === p.chunk).map(q => q.who).filter(isChar))];
    let inFrame = [];
    if (isChar(p.who)) inFrame.push(p.who);
    for (const n of Object.keys(cast)) if (isChar(n) && n !== p.who && act.includes(n)) inFrame.push(n);
    if (['설정', '전경'].includes(p.shot)) for (const n of chunkNames) if (!inFrame.includes(n)) inFrame.push(n);
    if (!inFrame.length && ['설정', '전경', '전신', '중경'].includes(p.shot) && chunkNames.length) inFrame = chunkNames.slice(0, 1);
    const actors = inFrame.map(n => this.actors[n + '|' + cast[n]]).filter(Boolean);
    const side = idx % 2 ? -1 : 1;
    // 배치
    const main = actors[0], other = actors[1];
    actors.forEach((a, k) => { a.reset(); a.look({ fill: k === 0 || !isChar(p.who) ? '#ffffff' : '#c4c4c4', clothes }); scene.add(a.vrm.scene); });
    if (main && !other) main.place(V(0, 0, 0), vb.away ? Math.PI * .85 : vb.turn ? side * Math.PI * .5 : side * .3);
    if (main && other) {
      const close = vb.grab || vb.hug || vb.shoulder;
      const d = vb.hug ? .3 : close ? .42 : .7;
      main.place(V(-side * d / 2, 0, close ? .05 : 0), side * (close ? 1.25 : .9));
      other.place(V(side * d / 2, 0, close ? -.05 : 0), -side * (close ? 1.25 : .9) + (vb.turn ? side * .3 : 0));
      for (let k = 2; k < actors.length; k++) actors[k].place(V((k % 2 ? 1 : -1) * (d / 2 + .6 * (k - 1)), 0, -.6), 0);
    }
    // 표정·포즈
    if (main) {
      main.face(faceFor(p.emo, p.i));
      if (vb.turn) { const y = main.vrm.scene.rotation.y - Math.PI, k = -Math.atan2(Math.sin(y), Math.cos(y)); main.rot('spine', 0, k * .25, 0); main.rot('neck', 0, k * .3, 0); main.rot('head', .05, k * .3, 0); }
      if (vb.down) { main.rot('neck', .35, 0, 0); main.rot('head', .2, 0, 0); }
      if (vb.up) { main.rot('neck', -.3, 0, 0); main.rot('head', -.2, 0, 0); }
      if (vb.walk) { main.rot('leftUpperLeg', -.35, 0, 0); main.rot('rightUpperLeg', .3, 0, 0); main.rot('leftLowerLeg', .3, 0, 0); main.rot('rightLowerLeg', .15, 0, 0); main.rot('leftUpperArm', .35, 0, 1.25); main.rot('rightUpperArm', -.35, 0, -1.25); }
      if (vb.cover) { const hp = main.wpos('head'); main.reach('right', hp.clone().add(V(0, -.06, .1))); main.reach('left', hp.clone().add(V(0, -.07, .1))); }
      if (vb.hand && !other) { const c = main.wpos('upperChest') || main.wpos('chest'); const fwd = V(Math.sin(main.vrm.scene.rotation.y - Math.PI), 0, Math.cos(main.vrm.scene.rotation.y - Math.PI)); main.reach('right', c.clone().add(fwd.multiplyScalar(.45)).add(V(0, -.05, 0))); }
      if (other) {
        other.face(faceFor(panels.find(q => q.who === inFrame[1] && q.chunk === p.chunk)?.emo || '평온', 1));
        main.vrm.scene.updateMatrixWorld(true); other.vrm.scene.updateMatrixWorld(true);
        const toMain = main.wpos('hips').sub(other.wpos('hips')).setY(0).normalize();
        if (vb.shoulder || vb.hug) {
          const Lp = other.wpos('leftUpperArm'), Rp = other.wpos('rightUpperArm'), lat = Lp.clone().sub(Rp).setY(0).normalize();
          const P = (s, l, u, f) => (s === 'left' ? Lp : Rp).clone().add(lat.clone().multiplyScalar(s === 'left' ? l : -l)).add(V(0, u, 0)).add(toMain.clone().multiplyScalar(f));
          if (vb.hug) { main.reach('right', P('left', .02, -.12, -.12)); main.reach('left', P('right', .02, -.12, -.12)); }
          else for (const [mine, hers] of [['right', 'left'], ['left', 'right']]) { main.reach(mine, P(hers, .045, .035, .075)); main.aim(mine + 'Hand', mine + 'MiddleProximal', P(hers, .05, .04, -.08)); main.curl(mine, .7); }
          if (vb.hug) { other.reach('right', main.wpos('spine').add(V(0, .05, 0))); }
        } else if (vb.grab) {
          const wrist = other.wpos('leftHand') || other.wpos('rightHand'); main.reach('right', wrist.clone().add(V(0, .01, 0))); main.curl('right', .75);
        }
      }
    }
    for (const a of actors) a.vrm.update(0);
    // 카메라
    const cam = new THREE.PerspectiveCamera(30, w / h, .02, 80);
    let center, H = SHOT_H[p.shot] || 1;
    const head = main?.wpos('head');
    if (!main) center = V(0, 1, 0);
    else if (p.shot === '클로즈업' || dark) center = head.clone().add(V(0, .02, 0));
    else if (p.shot === '디테일') {
      if (vb.grab || vb.hand || vb.shoulder || vb.hug) center = main.wpos('rightHand'); else { center = head.clone().add(V(0, .03, 0)); H = .16; }
    } else if (p.shot === '중경') center = (other ? head.clone().lerp(other.wpos('head'), .5) : head.clone()).add(V(0, -.28, 0));
    else if (p.shot === '전신') center = V(0, .85, 0);
    else center = V(0, .8, 0);
    if (other && ['중경', '전신'].includes(p.shot)) H *= 1.35;
    // 세로로 긴 컷은 세로 기준, 가로로 긴 컷은 가로 기준으로 같은 대상이 들어오게
    const fovV = THREE.MathUtils.degToRad(cam.fov), aspect = w / h;
    const need = Math.max(H, (H * .75) / aspect);
    const dist = (need / 2) / Math.tan(fovV / 2);
    const yaw = side * (p.shot === '설정' ? .5 : .28);
    let pos = V(center.x + Math.sin(yaw) * dist, center.y, center.z + Math.cos(yaw) * dist);
    if (p.ang === '하이앵글' || (p.shot === '설정' && p.ang === '아이레벨')) pos.y += dist * (p.shot === '설정' ? .45 : .55);
    if (p.ang === '로우앵글') pos.y = Math.max(.08, pos.y - dist * .5);
    if (p.ang === '탑뷰') { pos = V(center.x, center.y + dist * 1.05, center.z + .02); cam.up.set(0, 0, -1); }
    cam.position.copy(pos); cam.lookAt(center);
    // 넓은 샷은 바닥 격자로 공간감
    if (['설정', '전경', '전신'].includes(p.shot) && !dark) {
      const grid = new THREE.GridHelper(14, 28, 0xd8d8d8, 0xe6e6e6); scene.add(grid);
    }
    this.renderer.setSize(w, h); this.fx.render(scene, cam);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(this.renderer.domElement, 0, 0);
    for (const a of actors) scene.remove(a.vrm.scene);
    return c;
  }
}

function balloon(g, x, y, w, h, text) {
  const t = text.slice(0, 22); g.font = '600 20px Pretendard, "Apple SD Gothic Neo", sans-serif';
  const tw = Math.min(w * .5, g.measureText(t).width + 44), bh = 62, bx = x + w - tw - 22, by = y + 18;
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(bx + tw * .3, by + bh - 6); g.lineTo(bx + tw * .18, by + bh + 22); g.lineTo(bx + tw * .45, by + bh - 4); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(bx + tw / 2, by + bh / 2, tw / 2, bh / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, bx + tw / 2, by + bh / 2 + 1);
}
