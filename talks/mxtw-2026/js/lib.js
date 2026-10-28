/*
 * Shared kit for every slide. A slide is a pure function of time: `t` is a frame number at 30 fps,
 * exactly like the Remotion sources in ../visuals/src. Build steps are windows of one timeline, so
 * rendering any (slide, step) is just update(stepEnd) — going backwards or jumping can never glitch.
 *
 * Slide authoring contract (see js/slides/s06.js for a full port):
 *
 *   Deck.add({
 *     id: '6',                // outline slide number ('2b' allowed)
 *     title: '¿Cómo usa…?',   // for presenter view / README
 *     steps: [40, 390],       // cumulative end frames. steps[0] plays on arrival, each later entry is one click.
 *     chrome: 'show',         // progress bar: 'show' | 'dim' | 'hide'
 *     build(k) {              // k = Kit bound to this slide; k.root is the slide element
 *       const box = k.box({x: 100, y: 100, w: 300, h: 150}, 'hola');
 *       k.reveal(box, 10);
 *       k.on((t) => { ... });  // any custom per-frame binding
 *     },
 *   });
 */
(function () {
  'use strict';

  // MXTW 2026 brand (mexicotechweek.mx CSS + the official template): pure black, white type,
  // one flat accent per act. `accent*` is rewritten per slide by useAccent(), so read it at build or
  // render time, never into a module-level constant.
  const C = {
    bg: '#000000', bgDeep: '#000000', panel: '#0E0E0E', panelHi: '#161616',
    line: 'rgba(255,255,255,0.16)', lineHi: 'rgba(255,255,255,0.32)',
    ink: '#FFFFFF', muted: '#A6A6A6', dim: '#767676',
    accent: '#9161F1', accentSoft: 'rgba(145,97,241,0.16)', accentRGB: '145,97,241', accentAlt: '#7B52CC',
    danger: '#FF4D5E', dangerSoft: 'rgba(255,77,94,0.16)',
    safe: '#4AE082', safeSoft: 'rgba(74,224,130,0.16)', amber: '#F5C451',
    chatBg: '#0B0B0B', chatIn: '#232323', chatOut: '#144D37', chatMeta: '#8C8C8C',
    code: { text: '#EDEDED', keyword: '#C9A2FF', string: '#9FE0A8', number: '#F7C46C', comment: '#6E6E6E', fn: '#7CC7FF', punct: '#9A9A9A', prop: '#F2B9A0' },
  };
  // One accent per act, in Deck.ACTS order: Intro, Herramientas, Resultados, Código, Riesgo, Seguridad, Cierre.
  // Green stays free for `safe` and lime sits far from it, so the semantic colours never read as the act colour.
  // One MXTW accent per act: Intro, Industria (shares the opening purple), Herramientas, Resultados, Código, Riesgo, Seguridad, Cierre.
  const ACCENTS = ['#9161F1', '#9161F1', '#FFD800', '#F9A0D1', '#BED700', '#FF5B29', '#4F8FE6', '#9161F1'];
  const rgbOf = (hex) => [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
  const useAccent = (hex) => {
    const rgb = rgbOf(hex);
    C.accent = hex;
    C.accentRGB = rgb.join(',');
    C.accentSoft = `rgba(${C.accentRGB},0.16)`;
    C.accentAlt = `#${rgb.map((v) => Math.round(v * 0.82).toString(16).padStart(2, '0')).join('')}`;
  };
  const SIZE = { title: 72, kicker: 26, big: 56, body: 40, label: 32, small: 28, tiny: 26, code: 28 };
  const FONT = { sans: "'Instrument Sans', 'Geist', system-ui, sans-serif", mono: "'JetBrains Mono', ui-monospace, monospace" };
  const FPS = 30;

  // --- easing (same curves as theme.ts) -------------------------------------------------------
  const bezier = (x1, y1, x2, y2) => {
    const sample = (a1, a2, p) => ((1 - 3 * a2 + 3 * a1) * p + (3 * a2 - 6 * a1)) * p * p + 3 * a1 * p;
    const slope = (a1, a2, p) => 3 * (1 - 3 * a2 + 3 * a1) * p * p + 2 * (3 * a2 - 6 * a1) * p + 3 * a1;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let p = x;
      for (let i = 0; i < 8; i++) {
        const err = sample(x1, x2, p) - x;
        const d = slope(x1, x2, p);
        if (Math.abs(err) < 1e-6 || d === 0) break;
        p -= err / d;
      }
      return sample(y1, y2, p);
    };
  };
  const OUT = bezier(0.22, 1, 0.36, 1);
  const IN_OUT = bezier(0.65, 0, 0.35, 1);
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  // 0→1 eased progress of a span that starts at `start` and lasts `length` frames.
  const ease = (t, start, length = 18) => OUT(clamp01((t - start) / length));
  const easeIO = (t, start, length = 24) => IN_OUT(clamp01((t - start) / length));
  // Critically damped settle, normalised so it lands exactly on 1 with no overshoot.
  const settle = (t, start, duration = 22) => {
    const x = clamp01((t - start) / duration);
    const f = (v) => 1 - (1 + 7 * v) * Math.exp(-7 * v);
    return f(x) / f(1);
  };
  const linear = (t, start, length) => clamp01((t - start) / length);
  const mix = (from, to, p) => from + (to - from) * p;
  const lerpColor = (from, to, p) => {
    const parse = (hex) => [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
    const a = parse(from), b = parse(to);
    return `rgb(${a.map((v, i) => Math.round(mix(v, b[i], p))).join(',')})`;
  };
  const fmtInt = (v) => Math.round(v).toLocaleString('en-US');
  // Interpolate across keyframes, like Remotion's interpolate with clamping.
  const interp = (t, input, output, easing = (x) => x) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    let i = 0;
    while (t > input[i + 1]) i++;
    const p = easing((t - input[i]) / (input[i + 1] - input[i]));
    return mix(output[i], output[i + 1], p);
  };

  // --- DOM ------------------------------------------------------------------------------------
  const SVGNS = 'http://www.w3.org/2000/svg';
  const append = (el, kids) => {
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return el;
  };
  // h('div', {class, style, html, text, ...attrs}, ...children)
  const h = (tag, props, ...kids) => {
    const el = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value == null) continue;
        if (key === 'class') el.className = value;
        else if (key === 'style') typeof value === 'string' ? (el.style.cssText = value) : Object.assign(el.style, value);
        else if (key === 'html') el.innerHTML = value;
        else if (key === 'text') el.textContent = value;
        else el.setAttribute(key, value);
      }
    }
    return append(el, kids);
  };
  const s = (tag, attrs, ...kids) => {
    const el = document.createElementNS(SVGNS, tag);
    if (attrs) for (const [key, value] of Object.entries(attrs)) if (value != null) el.setAttribute(key, value);
    return append(el, kids);
  };
  // Cached style write: skips the DOM when the value did not change.
  const set = (el, prop, value) => {
    const cache = el.__c || (el.__c = {});
    if (cache[prop] === value) return;
    cache[prop] = value;
    if (prop.startsWith('--')) el.style.setProperty(prop, value);
    else el.style[prop] = value;
  };
  const attr = (el, name, value) => {
    const cache = el.__a || (el.__a = {});
    if (cache[name] === value) return;
    cache[name] = value;
    el.setAttribute(name, value);
  };
  const text = (el, value) => {
    if (el.__t === value) return;
    el.__t = value;
    el.textContent = value;
  };
  const abs = (x, y, w, h2) => {
    const style = { position: 'absolute', left: `${x}px`, top: `${y}px` };
    if (w != null) style.width = `${w}px`;
    if (h2 != null) style.height = `${h2}px`;
    return style;
  };

  // --- geometry -------------------------------------------------------------------------------
  const bezierPoint = (from, control, to, p) => {
    const q = 1 - p;
    return [q * q * from[0] + 2 * q * p * control[0] + p * p * to[0], q * q * from[1] + 2 * q * p * control[1] + p * p * to[1]];
  };
  const bezierAngle = (from, control, to, p) => {
    const dx = 2 * (1 - p) * (control[0] - from[0]) + 2 * p * (to[0] - control[0]);
    const dy = 2 * (1 - p) * (control[1] - from[1]) + 2 * p * (to[1] - control[1]);
    return Math.atan2(dy, dx);
  };

  // --- icons (same paths as components.tsx) ---------------------------------------------------
  const ICONS = {
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    outbox: '<path d="M4 14v5h16v-5"/><path d="M12 3v11M7 8l5-5 5 5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="3"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18" stroke-width="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    server: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M8 7.5h.01M8 16.5h.01" stroke-width="3"/>',
    skull: '<path d="M12 3a7 7 0 0 0-7 7c0 2.6 1.3 4.2 3 5v3h8v-3c1.7-.8 3-2.4 3-5a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="10.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10.5" r="1.4" fill="currentColor" stroke="none"/><path d="M10 18v3M14 18v3"/>',
  };
  const icon = (name, px = 40, tone = C.ink) => {
    const el = s('svg', { width: px, height: px, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    el.style.display = 'block';
    el.style.flexShrink = '0';
    el.style.color = tone;
    el.innerHTML = ICONS[name];
    return el;
  };

  // --- code tokenizer (same rules as code.tsx) ------------------------------------------------
  const KEYWORDS = new Set(['const', 'let', 'for', 'of', 'if', 'return', 'await', 'async', 'new', 'function', 'export', 'import', 'from', 'create', 'unique', 'index', 'on']);
  const tokenize = (line) => {
    const pattern = /(\/\/.*$)|('[^']*'?|"[^"]*"?)|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/gm;
    const tokens = [];
    for (const match of line.matchAll(pattern)) {
      const [whole, comment, str, num, word, space] = match;
      const rest = line.slice(match.index + whole.length);
      const before = line.slice(0, match.index);
      let tone = C.code.punct;
      if (comment) tone = C.code.comment;
      else if (str) tone = C.code.string;
      else if (num) tone = C.code.number;
      else if (word && KEYWORDS.has(word)) tone = C.code.keyword;
      else if (word && /^\s*\(/.test(rest)) tone = C.code.fn;
      else if (word && /\.$/.test(before)) tone = C.code.prop;
      else if (word || space) tone = C.code.text;
      tokens.push({ text: whole, tone });
    }
    return tokens;
  };

  // --- MXTW angular motif ----------------------------------------------------------------------
  // The four polygons of the official template (local units, ~310 wide), with their centres.
  const SHAPE_PATHS = {
    notch: ['M472.8 0H0L37.37 360.12 235.85 327.53 437.06 362.47 472.8 0Z', 236.4, 181.2],
    bow: ['M306.8 0H0L39.66 154.54 0 307.65H306.8L267.14 154.54 306.8 0Z', 153.4, 153.8],
    tab: ['M246.4 308.5H62.1V275.91H0V0H308.5V275.91H246.4V308.5Z', 154.3, 154.3],
    dip: ['M0 306.8V0L156.57 29.32 309.35 0V306.8H0Z', 154.7, 153.4],
  };
  // Clusters lifted from the template pages, in 1920×1080 px: [shape, centre x, centre y, degrees, scale].
  // cover = page 1 (beside the photo), column = page 3 (left edge), corner = page 5 (top-right edge), header = ours.
  const SHAPE_PRESETS = {
    cover: [['notch', 1794, 583, 42.0, 0.458], ['tab', 1766, 666, -5.7, 0.853], ['bow', 1724, 902, 10.4, 0.617]],
    column: [['notch', 149, 182, 12.5, 0.796], ['bow', 109, 499, 34.7, 1.072], ['tab', 271, 781, 48.8, 1.372]],
    corner: [['notch', 1742, 145, 31.6, 1.241], ['bow', 1856, 546, 16.0, 1.349], ['tab', 1764, 691, 18.0, 1.524], ['dip', 1766, 1079, -32.1, 0.783]],
    // Compact top-right cluster for slides with a header: stays right of the title and above y ≈ 280.
    header: [['dip', 1655, -18, -32.1, 0.42], ['notch', 1795, 72, 28.0, 0.6], ['bow', 1898, 205, 16.0, 0.5]],
  };

  // --- Kit: helpers bound to one slide ---------------------------------------------------------
  class Kit {
    constructor(root) {
      this.root = root;
      this.bindings = [];
      this.C = C;
      this.SIZE = SIZE;
      this.FONT = FONT;
    }
    // Register fn(t), run on every render.
    on(fn) { this.bindings.push(fn); return fn; }
    update(t) { for (const fn of this.bindings) fn(t); }
    add(el, parent) { (parent || this.root).appendChild(el); return el; }
    // Absolutely positioned div appended to the slide.
    div(style, ...kids) { return this.add(h('div', { style: { position: 'absolute', ...style } }, ...kids)); }

    // Fade + small rise, the default entrance. `base` multiplies the final opacity.
    reveal(el, at, { len = 16, dy = 16, dx = 0, base = 1, extra = '' } = {}) {
      this.on((t) => {
        const p = ease(t, at, len);
        set(el, 'opacity', String(p * base));
        set(el, 'transform', `translate(${mix(dx, 0, p)}px, ${mix(dy, 0, p)}px) ${extra}`);
      });
      return el;
    }
    // Fade only.
    fade(el, at, len = 14, base = 1) {
      this.on((t) => set(el, 'opacity', String(ease(t, at, len) * base)));
      return el;
    }

    header(kicker, title, { text = false } = {}) {
      const el = h('div', { class: `hdr${text ? ' text' : ''}` },
        // Act kickers are retired (2026-10-28): the progress bar carries the act structure.
        h('div', { class: 'title', html: title }));
      this.add(el);
      this.reveal(el, 0, { len: 16, dy: 14 });
      return el;
    }

    box({ x, y, w, h: height, tone = C.lineHi, fill = C.panel, radius = 20, dashed = false, style = {} }, ...kids) {
      const el = h('div', { class: 'box', style: { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${height}px`, borderRadius: `${radius}px`, background: fill, border: `2px ${dashed ? 'dashed' : 'solid'} ${tone}`, ...style } }, ...kids);
      return this.add(el);
    }
    // Recolour a box border and glow (glow 0..1, like Box's `glow`).
    tone(el, tone, glow = 0) {
      set(el, 'borderColor', tone);
      set(el, 'boxShadow', glow > 0 ? `0 0 ${(48 * glow).toFixed(1)}px ${tone}` : 'none');
    }

    chip(content, { tone = C.accent, mono = true, fontSize = SIZE.tiny, style = {} } = {}) {
      return h('div', { class: 'chip', style: { borderColor: tone, fontFamily: mono ? FONT.mono : FONT.sans, fontSize: `${fontSize}px`, ...style } }, content);
    }

    icon(name, px, tone) { return icon(name, px, tone); }

    // Full-frame SVG layer; pass `before` to insert under existing content.
    svg({ before = false } = {}) {
      const el = s('svg', { class: 'full-svg', width: 1920, height: 1080, viewBox: '0 0 1920 1080' });
      if (before) this.root.insertBefore(el, this.root.firstChild);
      else this.root.appendChild(el);
      return el;
    }

    // Quadratic arrow drawn up to `progress`, with an arrowhead on its tip (components.tsx Arrow).
    arrow(svg, { from, to, control, width = 4, dashed = false, head = 18 }) {
      const middle = control || [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
      const g = s('g');
      const line = s('polyline', { fill: 'none', 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-dasharray': dashed ? '10 12' : null });
      const tip = s('polygon');
      g.append(line, tip);
      svg.appendChild(g);
      let last = '';
      return {
        el: g,
        set(progress, tone = C.lineHi, opacity = 1) {
          if (progress <= 0) { attr(g, 'visibility', 'hidden'); return; }
          attr(g, 'visibility', 'visible');
          attr(g, 'opacity', String(opacity));
          attr(line, 'stroke', tone);
          attr(tip, 'fill', tone);
          const key = progress.toFixed(4);
          if (key === last) return;
          last = key;
          const steps = 48;
          const points = [];
          for (let i = 0; i <= steps; i++) points.push(bezierPoint(from, middle, to, (i / steps) * progress));
          const [tx, ty] = points[points.length - 1];
          const angle = bezierAngle(from, middle, to, Math.max(progress, 0.01));
          const left = [tx - head * Math.cos(angle - 0.45), ty - head * Math.sin(angle - 0.45)];
          const right = [tx - head * Math.cos(angle + 0.45), ty - head * Math.sin(angle + 0.45)];
          attr(line, 'points', points.map((p) => p.join(',')).join(' '));
          attr(tip, 'points', [[tx, ty], left, right].map((p) => p.join(',')).join(' '));
        },
      };
    }

    // Syntax-highlighted block with a typing budget: setChars(n) shows the first n characters.
    code(source, { fontSize = SIZE.code, lineHeight = 1.55, caret = false } = {}) {
      const el = h('div', { class: 'code', style: { fontSize: `${fontSize}px`, lineHeight } });
      const lines = source.split('\n').map((line) => {
        const row = h('div', { class: 'ln', style: { minHeight: `${fontSize * lineHeight}px` } });
        const spans = tokenize(line).map((token) => {
          const span = h('span', { style: { color: token.tone } });
          span.__full = token.text;
          row.appendChild(span);
          return span;
        });
        const caretEl = caret ? h('span', { class: 'caret', style: { width: `${fontSize * 0.55}px`, height: `${fontSize * 1.1}px`, display: 'none' } }) : null;
        if (caretEl) row.appendChild(caretEl);
        el.appendChild(row);
        return { row, spans, caretEl, length: line.length };
      });
      let shownBudget = -1;
      const api = {
        el,
        total: source.length,
        setChars(visible = Infinity) {
          if (visible === shownBudget) return;
          shownBudget = visible;
          let budget = visible;
          for (const line of lines) {
            const isTyping = budget >= 0 && budget <= line.length;
            let remaining = Math.max(0, Math.min(line.length, budget));
            budget -= line.length + 1;
            for (const span of line.spans) {
              const part = remaining > 0 ? span.__full.slice(0, remaining) : '';
              remaining -= part.length;
              text(span, part);
            }
            if (line.caretEl) set(line.caretEl, 'display', caret && isTyping && visible !== Infinity ? 'inline-block' : 'none');
          }
        },
        highlight(index, background = C.accentSoft) {
          lines.forEach((line, i) => set(line.row, 'background', i === index ? background : 'transparent'));
        },
        lines,
      };
      api.setChars(Infinity);
      return api;
    }

    caption(at, html, { y = 960, tone = C.ink, fontSize = SIZE.body } = {}) {
      const el = this.div({ left: 0, right: 0, top: `${y}px`, textAlign: 'center', fontSize: `${fontSize}px`, fontWeight: 600, color: tone });
      el.innerHTML = html;
      return this.reveal(el, at);
    }
    footnote(at, html) {
      const el = this.div({ right: '96px', bottom: '40px', fontSize: `${SIZE.tiny}px`, color: C.dim });
      el.innerHTML = html;
      return this.reveal(el, at);
    }

    // MXTW shape cluster, time-driven: each polygon slides in from `from` (px) and unwinds `spin`
    // degrees with the critically damped settle, staggered. `place` is an SVG transform for the whole
    // cluster (e.g. 'translate(40 -60) scale(0.8)'); `flip` mirrors it onto the left edge.
    shapes({ preset = 'corner', items, at = 0, stagger = 4, len = 30, from = [220, -140], spin = 16, tone, place = '', flip = false, only, before = true } = {}) {
      const svg = this.svg({ before });
      svg.classList.add('mx-shapes');
      const group = s('g', { transform: `${flip ? 'translate(1920 0) scale(-1 1) ' : ''}${place}` });
      svg.appendChild(group);
      let list = items || SHAPE_PRESETS[preset];
      if (only) list = list.filter((item, index) => only.includes(index));
      const fill = tone || C.accent;
      list.forEach(([kind, x, y, rot, scale], index) => {
        const [d, cx, cy] = SHAPE_PATHS[kind];
        const path = s('path', { d, fill });
        group.appendChild(path);
        const start = at + index * stagger;
        this.on((t) => {
          const p = settle(t, start, len);
          const q = 1 - p;
          attr(path, 'opacity', String(Math.min(1, p * 2.5)));
          attr(path, 'transform', `translate(${(x + from[0] * q).toFixed(1)} ${(y + from[1] * q).toFixed(1)}) rotate(${(rot + spin * q).toFixed(2)}) scale(${scale}) translate(${-cx} ${-cy})`);
        });
      });
      return svg;
    }

    // Full-bleed accent field (template pages 7–8): an angular wipe from the right, settled by `at + len`.
    // Pair it with `flood: true` on the slide def so the progress bar switches to black.
    flood({ at = 0, len = 22, tone } = {}) {
      const el = h('div', { style: { position: 'absolute', inset: 0, background: tone || C.accent, pointerEvents: 'none' } });
      this.root.insertBefore(el, this.root.firstChild);
      this.on((t) => {
        const p = settle(t, at, len);
        // The leading edge leans like the template's cut shapes; at p = 1 the field covers the slide.
        const top = mix(118, -20, p), bottom = mix(100, -38, p);
        set(el, 'clipPath', p >= 1 ? 'none' : `polygon(${top.toFixed(2)}% 0, 100% 0, 100% 100%, ${bottom.toFixed(2)}% 100%)`);
      });
      return el;
    }

    // Official «Mexico Tech Week · powered by Tecnológico de Monterrey» lockup (assets/mxtw-lockup.svg, white).
    // corner: 'tl' | 'tr' | 'bl' | 'br'. The asset is 418×107, so height ≈ width / 3.9.
    lockup({ corner = 'br', width = 300, at = 0, inset = [96, 72], style = {} } = {}) {
      const [sideX, sideY] = [corner[1] === 'l' ? 'left' : 'right', corner[0] === 't' ? 'top' : 'bottom'];
      const el = this.div({ [sideX]: `${inset[0]}px`, [sideY]: `${inset[1]}px`, width: `${width}px`, pointerEvents: 'none', ...style },
        h('img', { src: 'assets/mxtw-lockup.svg', alt: 'Mexico Tech Week · powered by Tecnológico de Monterrey', draggable: 'false', style: { display: 'block', width: '100%', height: 'auto' } }));
      el.classList.add('mx-lockup');
      return this.fade(el, at, 18);
    }

    // Number that counts from→to over [start, start+len]; `format` turns the value into text.
    count(el, from, to, start, len, format = fmtInt) {
      this.on((t) => text(el, format(mix(from, to, ease(t, start, len)))));
      return el;
    }

    // Vertical context-window gauge (ContextBar.tsx): segments stack from the bottom.
    contextBar({ x, y, w, h: height, segments, title = 'ventana de contexto', labels = true, appearAt = 0 }) {
      const wrap = this.div({ left: 0, top: 0, width: '1920px', height: '1080px', pointerEvents: 'none' });
      wrap.appendChild(h('div', { style: { ...abs(x + w / 2 - 200, y - 52, 400), textAlign: 'center', fontSize: `${SIZE.tiny}px`, color: C.muted, fontWeight: 600 } }, title));
      const frame = h('div', { style: { ...abs(x, y, w, height), borderRadius: '14px', border: `2px solid ${C.lineHi}`, background: C.bgDeep, overflow: 'hidden' } });
      wrap.appendChild(frame);
      const parts = segments.map((segment) => {
        const bar = h('div', { style: { position: 'absolute', left: 0, right: 0, background: segment.tone } });
        frame.appendChild(bar);
        const label = labels ? h('div', { style: { position: 'absolute', right: `${1920 - x + 18}px`, fontSize: `${SIZE.tiny}px`, lineHeight: 1.3, color: segment.textTone || C.muted, whiteSpace: 'nowrap' } }, segment.label) : null;
        if (label) wrap.appendChild(label);
        return { segment, bar, label };
      });
      this.on((t) => {
        set(wrap, 'opacity', String(ease(t, appearAt, 16)));
        let bottom = 0;
        for (const { segment, bar, label } of parts) {
          const grow = ease(t, segment.at, 14);
          const segHeight = segment.height * grow;
          set(bar, 'top', `${height - bottom - segHeight}px`);
          set(bar, 'height', `${segHeight}px`);
          set(bar, 'borderTop', grow > 0 ? `2px solid ${C.bgDeep}` : 'none');
          if (label) {
            const center = y + height - bottom - segHeight / 2;
            set(label, 'top', `${center - SIZE.tiny * 0.65}px`);
            set(label, 'opacity', String(ease(t, segment.at + 4, 12)));
          }
          bottom += segHeight;
        }
      });
      return wrap;
    }
  }

  window.K = { C, ACCENTS, useAccent, SHAPE_PATHS, SHAPE_PRESETS, SIZE, FONT, FPS, ease, easeIO, settle, linear, mix, lerpColor, fmtInt, interp, clamp01, h, s, set, attr, text, abs, bezierPoint, bezierAngle, icon, tokenize, Kit };
})();
