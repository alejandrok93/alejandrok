// p0-intro — slides 1–7 (RESTRUCTURE_PLAN_2026-10-28.md, Part A).
(function () {
  const { C, ease, easeIO, settle, mix, set, text, h, s, lerpColor } = K;

  // Fade + rise inside an overflow mask, for big type that should slide up into place.
  const maskLine = (k, parent, content, at, { len = 22, style = {} } = {}) => {
    const inner = h('div', { style: { willChange: 'transform' } }, content);
    const mask = h('div', { style: { overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em', ...style } }, inner);
    parent.appendChild(mask);
    k.on((t) => {
      const p = settle(t, at, len);
      set(inner, 'transform', `translateY(${mix(105, 0, p)}%)`);
      set(inner, 'opacity', String(Math.min(1, p * 1.6)));
    });
    return inner;
  };

  // Typewriter for a single line: shows the first n characters of `full`.
  const typeLine = (k, el, full, start, perChar = 1.1) => {
    k.on((t) => text(el, full.slice(0, Math.max(0, Math.floor((t - start) / perChar)))));
  };

  // Words rise one by one; `accent` words take the orange (from act1.js).
  const statement = (k, lines, { top, size, at = 4, stagger = 3, accent = [], accentTone = C.accent, lineHeight = 1.08 }) => {
    const wrap = k.div({ left: 0, right: 0, top: `${top}px`, textAlign: 'center', fontSize: `${size}px`, fontWeight: 800, letterSpacing: '-0.014em', lineHeight });
    let i = 0;
    for (const line of lines) {
      const row = h('div');
      line.split(' ').forEach((word, index) => {
        const clean = word.replace(/[.,]$/, '');
        const tone = accent.includes(clean) ? accentTone : null;
        const span = h('span', { style: { display: 'inline-block', color: tone || C.ink } }, clean, word.slice(clean.length) ? h('span', { style: { color: C.ink } }, word.slice(clean.length)) : null);
        row.append(index ? ' ' : '', span);
        const start = at + i * stagger;
        k.on((t) => {
          const p = settle(t, start, 20);
          set(span, 'opacity', String(p));
          set(span, 'transform', `translateY(${mix(28, 0, p).toFixed(1)}px)`);
        });
        i++;
      });
      wrap.appendChild(row);
    }
    return wrap;
  };

  const logo = (name, style = {}, ext = 'svg') => h('img', { src: `assets/logos/${name}.${ext}`, alt: '', draggable: 'false', style: { display: 'block', ...style } });

  // ---------------------------------------------------------------------------------- 1 · cover
  Deck.add({
    id: '1',
    title: 'Dale una computadora a tu agente',
    steps: [118],
    chrome: 'hide',
    build(k) {
      // MXTW cover (template page 1): lockup top-left, accent title, grainy B&W photo cut into steps,
      // and the accent shape cluster leaning on the photo's lower-right corner.
      const ACCENT = C.accent;
      set(k.root, 'background', '#000');
      k.lockup({ corner: 'tl', width: 300, inset: [120, 64], at: 2 });

      // Photo: stepped top edge, notched bottom edge, like the template.
      const photo = k.div({
        left: '1150px', top: '140px', width: '620px', height: '846px',
        backgroundImage: 'url(assets/cover-photo-mxtw.jpg)', backgroundSize: 'cover', backgroundPosition: 'center top',
        clipPath: 'polygon(0 25%, 9% 25%, 9% 12%, 40% 12%, 40% 5.5%, 72% 5.5%, 72% 0, 100% 0, 100% 91%, 56% 91%, 56% 100%, 0 100%)',
      });
      k.on((t) => {
        const p = settle(t, 10, 28);
        set(photo, 'opacity', String(p));
        set(photo, 'transform', `translateY(${mix(40, 0, p).toFixed(1)}px)`);
      });
      // The shapes slide in from the right, on the old orange field's timing.
      k.shapes({ preset: 'cover', place: 'translate(30 40)', at: 0, len: 30, stagger: 5, from: [260, 0], spin: 14, before: false });

      const title = k.div({ left: '116px', top: '184px', fontWeight: 500, fontSize: '98px', lineHeight: 1.04, letterSpacing: '-0.01em', color: ACCENT });
      ['Dale una', 'computadora', 'a tu agente'].forEach((line, i) => maskLine(k, title, line, 4 + i * 6));

      k.reveal(k.div({ left: '120px', top: '512px', fontSize: '40px', fontWeight: 400, color: '#fff' }, 'IA que escribe y ejecuta su propio código'), 26, { dy: 12 });

      // Terminal card: the cold-open in miniature.
      const lineStyle = { height: '42px', whiteSpace: 'pre' };
      const rows = [
        { mark: '$', markTone: ACCENT, text: 'agent.run(sandbox)', tone: '#FFFFFF', at: 44 },
        { mark: '→', markTone: '#8C8C8C', text: 'writing code…', tone: '#8C8C8C', at: 66 },
        { mark: '→', markTone: '#8C8C8C', text: 'executing · reading stdout', tone: '#8C8C8C', at: 80 },
        { mark: '✓', markTone: ACCENT, text: 'self-corrected in 3 steps', tone: '#FFFFFF', at: 98 },
      ];
      const body = h('div', { class: 'mono', style: { fontSize: '28px', marginTop: '18px' } });
      const card = k.div({ left: '120px', top: '604px', width: '760px', padding: '24px 36px 20px', background: '#0E0E0E', border: '2px solid rgba(255,255,255,0.16)', borderLeft: `8px solid ${ACCENT}` },
        h('div', { style: { display: 'flex', gap: '12px' } }, [0, 1, 2].map(() => h('i', { style: { width: '16px', height: '16px', background: '#333', display: 'block' } }))),
        body);
      k.reveal(card, 34, { dy: 18 });
      rows.forEach((row) => {
        const mark = h('span', { style: { color: row.markTone } }, row.mark);
        const typed = h('span', { style: { color: row.tone } });
        const line = h('div', { style: lineStyle }, mark, ' ', typed);
        body.appendChild(line);
        k.on((t) => set(line, 'opacity', t >= row.at ? '1' : '0'));
        typeLine(k, typed, row.text, row.at + 2, row.mark === '$' ? 1.1 : 0.55);
      });

      const who = k.div({ left: '120px', top: '890px' },
        h('div', { style: { fontSize: '38px', fontWeight: 500, color: '#fff' } }, 'Alejandro Krasovsky'),
        h('div', { style: { fontSize: '30px', color: ACCENT, marginTop: '4px' } }, window.DECK_CONFIG.coverDate),
        h('div', { style: { fontSize: '30px', fontWeight: 400, color: '#A6A6A6', marginTop: '10px' } }, 'Mexico Tech Week'));
      k.reveal(who, 50, { dy: 12 });
    },
  });

  // ---------------------------------------------------------------------------------- 2 · Quién soy
  // Arrival: the 10 years. Click: the meme (tragedy or best year). Click: programador → builder.
  Deck.add({
    id: '2',
    title: 'Quién soy',
    steps: [30, 66, 128],
    build(k) {
      k.header(null, 'Quién soy', { text: true });
      const column = k.div({ left: '96px', top: '0', height: '1080px', width: '1040px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '64px', paddingBottom: '40px' });
      const line = (at, ...content) => {
        const el = h('div', { class: 'p0-big' }, ...content);
        column.appendChild(el);
        k.reveal(el, at, { dy: 0, dx: -24, len: 20 });
        return el;
      };
      line(6, '10+ años construyendo software');

      const struck = h('span', { class: 'p0-struck' }, 'programador');
      const strike = h('span', { class: 'p0-strike' });
      struck.appendChild(strike);
      const arrow = h('span', { style: { color: C.accent, display: 'inline-block', margin: '0 0.3em' } }, '→');
      const builder = h('span', { style: { color: C.accent, display: 'inline-block' } }, 'builder');
      line(70, struck, arrow, builder);
      k.on((t) => {
        const draw = easeIO(t, 86, 16);
        set(strike, 'transform', `scaleX(${draw})`);
        set(struck, 'color', lerpColor(C.ink, C.dim, draw));
        const land = settle(t, 100, 18);
        set(arrow, 'opacity', String(land));
        set(arrow, 'transform', `translateX(${mix(-18, 0, land)}px)`);
        const pop = settle(t, 106, 20);
        set(builder, 'opacity', String(pop));
        set(builder, 'transform', `translateX(${mix(-14, 0, pop)}px)`);
      });


      const meme = k.div({ left: '1188px', top: '246px', width: '636px', height: '564px', borderRadius: '22px', overflow: 'hidden', border: `2px solid ${C.lineHi}`, boxShadow: '0 40px 100px rgba(0,0,0,0.55)', background: '#fff' },
        h('img', { src: 'assets/meme.jpg', alt: '', style: { display: 'block', width: '100%', height: '100%', objectFit: 'cover' } }));
      k.on((t) => {
        const p = settle(t, 34, 26);
        set(meme, 'opacity', String(Math.min(1, p * 1.4)));
        set(meme, 'transform', `translateY(${mix(40, 0, p).toFixed(1)}px) scale(${mix(0.96, 1, p).toFixed(4)})`);
      });
    },
  });

  // ---------------------------------------------------------------------------------- 3 · En 30 minutos
  const AGENDA = [
    'Los agentes pueden hacer casi todo… si les das herramientas',
    'Pero las herramientas llenan el contexto',
    'El código es la mejor herramienta',
    'Y hay que correrlo de forma segura',
  ];
  Deck.add({
    id: '3',
    title: 'En 30 minutos',
    steps: [34, 58, 82, 106],
    build(k) {
      k.header(null, 'En 30 minutos', { text: true });
      AGENDA.forEach((item, i) => {
        const at = i === 0 ? 10 : 10 + i * 24;
        const number = h('div', { class: 'p0-num mono' }, String(i + 1));
        const label = h('div', { class: 'p0-agenda-text' }, item);
        const row = k.div({ left: '120px', top: `${282 + i * 162}px`, display: 'flex', alignItems: 'center', gap: '44px' }, number, label);
        k.reveal(row, at, { dy: 0, dx: -24, len: 18 });
        // The newest line holds the light; earlier ones step back.
        const next = i < AGENDA.length - 1 ? 10 + (i + 1) * 24 : Infinity;
        k.on((t) => {
          const back = ease(t, next, 14);
          set(label, 'color', lerpColor(C.ink, C.muted, back));
          set(number, 'opacity', String(mix(1, 0.5, back)));
        });
      });
    },
  });

  // ---------------------------------------------------------------------------------- 4 · industria
  const CODERS = [
    { logo: 'claude-code', name: 'Claude Code', maker: 'Anthropic' },
    { logo: 'codex', name: 'Codex', maker: 'OpenAI' },
    { logo: 'opencode', name: 'opencode', maker: 'open source' },
    { logo: 'meta', name: 'Muse', maker: 'Meta' },
  ];
  // Concrete jobs, so the slide shows what agents do, not only who makes them.
  const JOBS = ['Analizar finanzas en Excel', 'Usar tu computadora', 'Hacer presentaciones', 'Investigar en la web'];
  Deck.add({
    id: '4',
    title: 'Los agentes ya resuelven problemas reales',
    steps: [104],
    build(k) {
      k.shapes({ preset: 'header', at: 6, from: [200, -160] });
      k.header(null, 'Los agentes ya resuelven problemas reales', { text: true });
      const row = k.div({ left: '96px', top: '300px', width: '1728px', display: 'flex', gap: '30px' });
      CODERS.forEach((agent, i) => {
        const tile = h('div', { class: 'p0-tile' },
          logo(agent.logo, { width: '96px', height: '96px' }),
          h('div', { class: 'p0-tile-name' }, agent.name),
          h('div', { class: 'p0-tile-maker' }, agent.maker));
        row.appendChild(tile);
        k.on((t) => {
          const p = settle(t, 30 + i * 7, 22);
          set(tile, 'opacity', String(p));
          set(tile, 'transform', `translateY(${mix(36, 0, p).toFixed(1)}px)`);
        });
      });
      k.reveal(k.div({ left: '96px', top: '708px', fontSize: '32px', color: C.muted }, 'Ya pueden:'), 62, { dy: 8 });
      const jobs = k.div({ left: '96px', top: '764px', width: '1728px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px' });
      JOBS.forEach((job, i) => {
        const el = h('div', { style: { borderLeft: `6px solid ${C.accent}`, padding: '18px 0 18px 26px', fontSize: '40px', fontWeight: 700, lineHeight: 1.15 } }, job);
        jobs.appendChild(el);
        k.on((t) => {
          const p = settle(t, 66 + i * 6, 20);
          set(el, 'opacity', String(p));
          set(el, 'transform', `translateY(${mix(24, 0, p).toFixed(1)}px)`);
        });
      });
    },
  });

  // ---------------------------------------------------------------------------------- 5 · industrias
  const INDUSTRIES = [
    { logo: 'harvey', h: 48, field: 'Legal', use: 'Contratos y litigio' },
    { logo: 'intercom', h: 48, field: 'Soporte', use: 'Resuelve tickets solo', wordmark: 'Fin' },
    { logo: 'sierra', h: 58, field: 'Atención', use: 'Soporte de marcas' },
    { logo: 'decagon', h: 50, field: 'Contact center', use: 'Chat y voz' },
    { logo: 'ramp', h: 52, field: 'Finanzas', use: 'Gastos y facturas' },
    { logo: 'claude', h: 48, field: 'Oficina', use: 'Investiga y escribe', wordmark: 'Claude' },
    { logo: 'diago', ext: 'png', h: 52, field: 'WhatsApp', use: 'Agentes de ventas', wordmark: 'DIAGO' },
  ];
  Deck.add({
    id: '5',
    title: 'Y no solo para programar',
    steps: [84],
    build(k) {
      k.header(null, 'Y no solo para programar', { text: true });
      const grid = k.div({ left: '96px', top: '236px', width: '1728px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '36px' });
      INDUSTRIES.forEach((item, i) => {
        const mark = h('div', { class: 'p0-mark' }, logo(item.logo, { height: `${item.h}px`, width: 'auto' }, item.ext),
          item.wordmark ? h('span', { class: 'p0-wordmark' }, item.wordmark) : null);
        const card = h('div', { class: 'p0-card', style: { width: '405px', boxSizing: 'border-box' } },
          mark,
          h('div', { class: 'p0-card-field' }, item.field),
          h('div', { class: 'p0-card-use' }, item.use));
        grid.appendChild(card);
        k.on((t) => {
          const p = settle(t, 12 + i * 7, 22);
          set(card, 'opacity', String(p));
          set(card, 'transform', `translateY(${mix(32, 0, p).toFixed(1)}px)`);
        });
      });
    },
  });

  // ---------------------------------------------------------------------------------- 6 · precio
  // Anthropic list prices per 1M output tokens; data and sources in assets/data/costs.md.
  const BARS = [
    { when: 'oct 2025', model: 'Claude Sonnet 4.5', price: 15, label: '$15', input: 'entrada $3', x: 200, at: 16, tone: C.lineHi, fill: '#2A2A2A' },
    { when: 'oct 2026', model: 'Claude Haiku 5.5', price: 0.5, label: '$0.50', input: 'entrada $0.10', x: 590, at: 44, tone: C.accent, fill: 'var(--accent)' },
  ];
  Deck.add({
    id: '6',
    title: 'El mismo nivel de inteligencia, una fracción del precio',
    steps: [118, 196],
    build(k) {
      const STATEMENT_AT = 122;
      const scene = k.div({ left: 0, top: 0, width: '1920px', height: '1080px' });
      const header = h('div', { class: 'hdr text' }, h('div', { class: 'title', html: 'El mismo nivel de inteligencia,<br>una fracción del precio' }));
      scene.appendChild(header);
      k.reveal(header, 0, { len: 16, dy: 14 });

      const BASE = 752, MAX = 370, W = 250;
      const axis = h('div', { style: { position: 'absolute', left: '150px', top: `${BASE}px`, width: '790px', height: '2px', background: C.lineHi } });
      scene.appendChild(axis);
      k.fade(axis, 8, 16);
      scene.appendChild(h('div', { style: { position: 'absolute', left: '150px', top: '236px', fontSize: '28px', color: C.muted } }, 'USD por 1M tokens de salida'));
      k.fade(scene.lastChild, 10, 16);

      BARS.forEach((bar) => {
        const height = Math.max(10, (bar.price / 15) * MAX);
        const el = h('div', { style: { position: 'absolute', left: `${bar.x}px`, width: `${W}px`, top: `${BASE - height}px`, height: `${height}px`, background: bar.fill, borderRadius: '14px 14px 4px 4px', transformOrigin: 'bottom', boxShadow: bar.price < 1 ? '0 0 40px rgba(var(--accent-rgb),0.35)' : 'none' } });
        const value = h('div', { style: { position: 'absolute', left: `${bar.x - 40}px`, width: `${W + 80}px`, top: `${BASE - height - 92}px`, textAlign: 'center', fontSize: '68px', fontWeight: 800, letterSpacing: '-0.012em', color: bar.price < 1 ? C.accent : C.ink, fontVariantNumeric: 'tabular-nums' } }, bar.label);
        const foot = h('div', { style: { position: 'absolute', left: `${bar.x - 60}px`, width: `${W + 120}px`, top: `${BASE + 22}px`, textAlign: 'center' } },
          h('div', { style: { fontSize: '36px', fontWeight: 700 } }, bar.when),
          h('div', { style: { fontSize: '28px', color: C.muted, marginTop: '4px' } }, bar.model),
          h('div', { class: 'mono', style: { fontSize: '26px', color: C.dim, marginTop: '4px' } }, bar.input));
        scene.append(el, value, foot);
        k.on((t) => {
          const grow = settle(t, bar.at, 28);
          set(el, 'transform', `scaleY(${grow.toFixed(4)})`);
          const show = ease(t, bar.at + 14, 16);
          set(value, 'opacity', String(show));
          // The price rides on top of the growing bar.
          set(value, 'transform', `translateY(${(height * (1 - grow)).toFixed(1)}px)`);
          set(foot, 'opacity', String(ease(t, bar.at, 16)));
        });
      });

      // The takeaway lands after both bars settle.
      const ratio = h('span');
      const hero = h('div', { style: { position: 'absolute', left: '1090px', top: '286px', color: C.accent, fontWeight: 800, fontSize: '300px', lineHeight: 1, letterSpacing: '-0.024em', fontVariantNumeric: 'tabular-nums' } }, ratio, h('span', { style: { letterSpacing: '0' } }, '×'));
      const heroSub = h('div', { style: { position: 'absolute', left: '1100px', top: '600px', fontSize: '60px', fontWeight: 800, letterSpacing: '-0.012em' } }, 'más barato');
      const heroNote = h('div', { style: { position: 'absolute', left: '1102px', top: '688px', width: '700px', fontSize: '32px', color: C.muted, lineHeight: 1.35 } }, 'y mejor en benchmarks públicos');
      scene.append(hero, heroSub, heroNote);
      k.on((t) => {
        const land = settle(t, 76, 24);
        set(hero, 'opacity', String(land));
        set(hero, 'transform', `translateY(${mix(30, 0, land)}px)`);
        text(ratio, String(Math.max(1, Math.round(mix(1, 30, ease(t, 78, 30))))));
        const glow = ease(t, 104, 16);
        set(hero, 'textShadow', `0 0 ${(70 * glow).toFixed(1)}px rgba(var(--accent-rgb),${(0.35 * glow).toFixed(3)})`);
      });
      k.reveal(heroSub, 92, { dy: 10 });
      k.reveal(heroNote, 100, { dy: 10 });

      const source = h('div', { style: { position: 'absolute', left: '96px', top: '944px', width: '1728px', fontSize: '26px', color: C.dim, lineHeight: 1.4 } },
        'Precios de lista de Anthropic (prompts ≤100K tokens). Haiku 5.5 supera a Sonnet 4.5 en Terminal-Bench 4.0 y AutomationBench-AA.',
        h('br'), 'Fuentes: Anthropic, «Pricing» · Artificial Analysis, comparativa Haiku 5.5 vs Sonnet 4.5 (oct 2026)');
      scene.appendChild(source);
      k.fade(source, 104, 16);

      // Step 2: the chart steps back and the invitation rises.
      k.on((t) => {
        const dim = easeIO(t, STATEMENT_AT - 2, 22);
        set(scene, 'opacity', String(mix(1, 0.07, dim)));
        set(scene, 'filter', dim > 0 ? `blur(${(6 * dim).toFixed(2)}px)` : 'none');
      });
      statement(k, ['Nunca ha habido mejor', 'momento para construir'], { top: 404, size: 126, at: STATEMENT_AT + 6, accent: ['construir'], stagger: 4 });
      const glow = k.div({ left: '1060px', top: '520px', width: '640px', height: '220px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(var(--accent-rgb),0.22), transparent)', pointerEvents: 'none' });
      k.on((t) => set(glow, 'opacity', String(ease(t, STATEMENT_AT + 36, 30))));
    },
  });

  // ---------------------------------------------------------------------------------- 7 · Conoce a Chema
  // Typing dots derive from t, so any frame renders the same way.
  const typingDots = (k, bubble) => {
    const dots = [...bubble.querySelectorAll('i')];
    k.on((t) => dots.forEach((dot, i) => {
      const wave = Math.max(0, Math.sin(t * 0.32 - i * 0.9));
      set(dot, 'opacity', String(0.35 + 0.65 * wave));
      set(dot, 'transform', `translateY(${(-5 * wave).toFixed(2)}px)`);
    }));
  };
  const bubble = (k, parent, side, html, meta, at) => {
    const el = h('div', { class: `bubble ${side}` });
    el.innerHTML = `${html}<span class="meta">${meta}${side === 'out' ? '<span class="ticks">✓✓</span>' : ''}</span>`;
    parent.appendChild(el);
    k.on((t) => {
      const p = settle(t, at, 16);
      set(el, 'display', t >= at ? '' : 'none');
      set(el, 'opacity', String(p));
      set(el, 'transform', `translateY(${mix(14, 0, p)}px) scale(${mix(0.97, 1, p)})`);
      set(el, 'transformOrigin', side === 'in' ? 'left bottom' : 'right bottom');
    });
    return el;
  };
  const typing = (k, parent, side, from, to) => {
    const el = h('div', { class: `typing ${side === 'out' ? 'out' : ''}` }, h('i'), h('i'), h('i'));
    parent.appendChild(el);
    typingDots(k, el);
    k.on((t) => {
      set(el, 'display', t >= from && t < to ? '' : 'none');
      set(el, 'opacity', String(ease(t, from, 8)));
    });
    return el;
  };
  const chatHead = (name, status, initial) => h('div', { class: 'chat-head' },
    h('div', { class: 'avatar' }, initial),
    h('div', null, h('div', { class: 'chat-name' }, name), h('div', { class: 'chat-status' }, status)));

  Deck.add({
    id: '7',
    title: 'Conoce a Chema',
    steps: [104],
    build(k) {
      // Opens the Herramientas act: same corner shapes as the other act openers.
      k.shapes({ preset: 'header', at: 6, from: [200, -160] });
      k.header(null, 'Conoce a Chema', { text: true });
      const body = h('div', { class: 'chat-body', style: { minHeight: '400px', paddingTop: '22px' } });
      const chat = k.div({ left: '96px', top: '290px', width: '840px' }, h('div', { class: 'chat' }, chatHead('Chema', 'en línea', 'C'), body));
      k.reveal(chat, 6, { dy: 20 });
      body.appendChild(h('div', { class: 'day-pill' }, 'Hoy'));
      bubble(k, body, 'in', 'hola, tienen lugar el sábado?', '2:07 a.m.', 20);
      typing(k, body, 'out', 34, 62);
      bubble(k, body, 'out', 'Claro! Tengo a las 8 o a las 9:30,<br>para cuántos?', '2:07 a.m.', 62);

      const right = k.div({ left: '1046px', top: '440px', width: '800px' });
      const lines = [
        h('div', { html: 'Agente de WhatsApp<br>de un restaurante', style: { fontSize: '56px', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.01em' } }),
        h('div', { style: { fontSize: '30px', color: C.muted, fontStyle: 'italic', marginTop: '36px' } }, 'Basado en hechos reales. Los nombres se cambiaron.'),
      ];
      lines.forEach((line, i) => { right.appendChild(line); k.reveal(line, 72 + i * 10, { dy: 12 }); });
    },
  });
})();
