(function (exports) {
  'use strict';

  const sans = "Pretendard,'Noto Sans CJK KR',system-ui,sans-serif";
  const serif = "'Noto Serif CJK KR','Batang',serif";
  const ink = '#282521';
  const paper = '#fffefa';
  const escape = text => String(text).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const units = value => Array.from(value).reduce((n, char) =>
    n + (/[^\u0000-\u00ff]/u.test(char) ? (char === '…' ? .85 : 1) : (/\s/.test(char) ? .31 : .58)), 0);

  function wrap(text, limit) {
    const lines = [];
    for (const paragraph of text.trim().split(/\r?\n/)) {
      let line = '';
      for (const word of paragraph.trim().split(/\s+/)) {
        const trial = line ? line + ' ' + word : word;
        if (units(trial) <= limit) {
          line = trial;
          continue;
        }
        if (line) lines.push(line);
        line = '';
        for (const char of word) {
          if (line && units(line + char) > limit && !/[,.!?…。、？！]/u.test(char)) {
            lines.push(line);
            line = '';
          }
          line += char;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  function fit(text, kind, maxWidth) {
    const caption = kind === 'caption';
    const size = caption ? 21 : 24;
    const padding = caption ? 19 : 28;
    const lines = wrap(text, Math.max(4, (maxWidth - padding * 2) / size));
    const step = size * 1.43;
    const width = Math.min(maxWidth, Math.max(caption ? 76 : 95, ...lines.map(l => units(l) * size + padding * 2)));
    const height = lines.length * step + (caption ? 19 : 32);
    return { lines, width, height, size, step };
  }

  function textLines(m, x, y, caption, whisper) {
    const start = y + (m.height - (m.lines.length - 1) * m.step) / 2 + m.size * .33;
    return `<text x="${x}" y="${start}" text-anchor="${caption ? 'start' : 'middle'}" font-family="${caption ? serif : sans}" font-size="${m.size}" font-weight="${whisper ? 400 : 550}" fill="${ink}">${m.lines.map((line, i) =>
      `<tspan x="${x}" dy="${i ? m.step : 0}">${escape(line)}</tspan>`).join('')}</text>`;
  }

  function narration(m, x, y) {
    const { width: w, height: h } = m;
    return `<g aria-label="내레이션"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${paper}" stroke="${ink}" stroke-width="1.8"/>
      <path d="M${x + 6} ${y + 7} V${y + h - 7}" stroke="#a88c5e" stroke-width="2.3"/>
      ${textLines(m, x + 17, y, true)}</g>`;
  }

  function balloon(m, x, y, target, mode = 'speech') {
    const { width: w, height: h } = m;
    const point = (u, v) => `${x + u * w} ${y + v * h}`;
    const offset = clamp((target.x - x) / w, .22, .78);
    const tipX = clamp(target.x, x - 26, x + w + 26);
    const tipY = Math.min(y + h + 36, Math.max(y + h + 12, target.y));
    const tail = mode === 'thought' ? '' :
      `C${point(.95,.90)} ${point(offset + .17,.97)} ${point(offset + .10,.975)}
       Q${point(offset + .10,1.16)} ${tipX} ${tipY}
       Q${point(offset - .11,1.08)} ${point(offset - .12,.984)}
       C${point(.16,.98)} ${point(.00,.81)} ${point(.00,.53)}`;
    const lower = tail || `C${point(.96,1.14)} ${point(.02,1.18)} ${point(0,.53)}`;
    const path = `M${point(0,.53)} C${point(0,.20)} ${point(.17,0)} ${point(.49,.015)}
      C${point(.79,.0)} ${point(1,.18)} ${point(1,.48)} C${point(1,.6)} ${point(.98,.69)} ${point(.96,.72)} ${lower} Z`;
    const dots = mode === 'thought' ? `<circle cx="${x+w*offset}" cy="${y+h+8}" r="4.5" fill="${paper}" stroke="${ink}" stroke-width="1.3"/><circle cx="${x+w*offset+(tipX-x-w*offset)*.45}" cy="${y+h+19}" r="2.8" fill="${paper}" stroke="${ink}" stroke-width="1.1"/>` : '';
    const dash = mode === 'whisper' ? ' stroke-dasharray="4 3"' : '';
    return `<g aria-label="말풍선"><path d="${path}" fill="${paper}" stroke="${ink}" stroke-width="1.9" stroke-linejoin="round"${dash}/>
      ${dots}${textLines(m, x+w/2, y, false, mode === 'whisper')}</g>`;
  }

  function effect(text, x, y, size, flip = false) {
    const soft = /두근|소곤|사락|살랑|스윽|사르르/.test(text);
    const angle = flip ? 9 : -9;
    return `<g aria-label="효과음" transform="translate(${x} ${y}) rotate(${angle}) skewX(${soft ? -9 : -4})" font-family="${soft ? serif : sans}" font-size="${size}" font-weight="${soft ? 700 : 950}" text-anchor="end" stroke-linejoin="round">
      <text fill="#211b16" stroke="#211b16" stroke-width="${size*.17}" transform="translate(1 2)">${escape(text)}</text>
      <text fill="${soft ? '#814139' : '#28231e'}" stroke="#fff7e4" stroke-width="${size*.14}" paint-order="stroke fill">${escape(text)}</text></g>`;
  }

  function panel(p, w, h) {
    const dialogue = p.dialogs?.length ? p.dialogs : p.said ? [{ text: p.said, who: p.who }] : [];
    const captions = p.captions?.length ? p.captions : p.caption ? [p.caption] : [];
    const isBeat = text => /^두근(?:[ .·…]*두근)?[.…]*$/.test(text);
    const labels = [
      ...captions.filter(t => t?.trim() && !isBeat(t)).map(text => ({ text, kind: 'caption' })),
      ...dialogue.filter(d => d.text?.trim()).map(d => ({ ...d, kind: 'speech' })),
    ];
    const inset = Math.round(w * .065);
    const center = /^(클로즈업|디테일)$/.test(p.shot);
    let top = 0;
    let captionCount = 0;
    const speakers = new Map();
    const groups = [];
    for (const label of labels) {
      const caption = label.kind === 'caption';
      const maxWidth = w * (caption ? .58 : .54);
      const m = fit(label.text, label.kind, maxWidth);
      if (!caption && !speakers.has(label.who)) {
        const namedSide = (p.who || '').split(/\s*[·,]\s*/).filter(Boolean).indexOf(label.who);
        speakers.set(label.who, namedSide >= 0 && (p.who || '').includes('·') ? namedSide % 2 : speakers.size % 2);
      }
      const right = !caption && speakers.get(label.who) === (center ? 0 : 1);
      const x = right ? w - inset - m.width : inset;
      const mode = /속마음|독백|생각/.test(label.note || '') ? 'thought'
        : /속삭|나직|소곤/.test(label.note || '') ? 'whisper' : 'speech';
      groups.push({ m, x, top, caption, mode, right });
      top += m.height + (caption ? 13 : 23);
      if (caption) captionCount++;
    }
    // Let the final label overlap just the rim, so faces stay clear in close-ups.
    const overlap = !groups.length ? 0 : groups.at(-1).caption ? 0 : Math.min(24, Math.round(h * .08));
    const above = Math.max(0, Math.ceil(top - overlap + (groups.length && captionCount === groups.length ? 4 : 0)));
    let markup = groups.map(g => g.caption ? narration(g.m, g.x, g.top - above) :
      balloon(g.m, g.x, g.top - above, { x: w * (g.right ? .62 : .38), y: h * .33 }, g.mode)).join('');
    const size = clamp(h * .12, 29, 45);
    const effects = [...(p.sfx || []), ...captions.filter(isBeat)].filter(s => s?.trim());
    const rowsFit = Math.max(1, Math.floor((h - 18) / (size * 1.32)));
    effects.forEach((s, i) => {
      const y = i < rowsFit ? h - 22 - i * size * 1.32 : h + 10 + (i - rowsFit + 1) * size * 1.32;
      const fitted = Math.min(size, (w - 2 * inset) / Math.max(1, units(s)));
      markup += effect(s, w - inset, y, fitted, i % 2 === 1);
    });
    return { above, below: Math.ceil(Math.max(0, effects.length - rowsFit) * size * 1.32 + (effects.length > rowsFit ? 19 : 0)), markup };
  }

  Object.assign(exports, { panel, fit, narration, balloon, effect });
})(typeof module === 'object' ? module.exports : (window.RoughLettering = {}));
