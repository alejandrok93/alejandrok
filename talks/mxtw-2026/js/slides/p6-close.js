// Slides 43–46 · Cierre (part E of RESTRUCTURE_PLAN_2026-10-28.md).
// 43 is a port of s30.js, 45 and 46 are ports of close.js; 44 is new.
(function () {
  const { C, SIZE, FONT, settle, mix, set, h } = K;

  // Words rise one by one; `accent` words take the orange (copied from act1.js, which is no longer loaded).
  const statement = (k, lines, { top, size, at = 4, stagger = 3, accent = [], accentTone = C.accent, lineHeight = 1.08 }) => {
    const wrap = k.div({ left: 0, right: 0, top: `${top}px`, textAlign: 'center', fontSize: `${size}px`, fontWeight: 800, letterSpacing: '-0.014em', lineHeight });
    let index = 0;
    for (const line of lines) {
      const row = h('div');
      line.split(' ').forEach((word, position) => {
        const clean = word.replace(/[.,]$/, '');
        const tone = accent.includes(clean) ? accentTone : C.ink;
        const span = h('span', { style: { display: 'inline-block', color: tone } }, clean, word.slice(clean.length) ? h('span', { style: { color: C.ink } }, word.slice(clean.length)) : null);
        row.append(position ? ' ' : '', span);
        const start = at + index * stagger;
        k.on((t) => {
          const p = settle(t, start, 20);
          set(span, 'opacity', String(p));
          set(span, 'transform', `translateY(${mix(28, 0, p).toFixed(1)}px)`);
        });
        index++;
      });
      wrap.appendChild(row);
    }
    return wrap;
  };

  // ------------------------------------------------------------------------------- 43
  (function () {
    const FIRST_ITEM = 24;
    const ITEM_GAP = 12;
    const ITEMS = [
      { main: 'Red negada por default' },
      { main: 'Solo capacidades explícitas', detail: '(SDK con los permisos del usuario)' },
      { main: 'Un sandbox por usuario, nunca compartido' },
      { main: 'Límites: tiempo, memoria, CPU' },
      { main: 'Secretos fuera del sandbox' },
      { main: 'Limpia al terminar' },
      { main: 'Registra todo lo que corre' },
      { main: 'Valida antes de ejecutar:', detail: 'no confíes en lo que escribe el modelo' },
    ];
    const END = FIRST_ITEM + (ITEMS.length - 1) * ITEM_GAP + 16 + 40;
    const COLUMN_W = 840;
    const COLUMN_X = [96, 96 + COLUMN_W + 48];
    const GRID_TOP = 252;
    const ROW_H = 182;

    Deck.add({
      id: '43',
      title: 'Checklist para agentes seguros',
      // The whole build autoplays on arrival (~5 s); no clicks.
      steps: [END],
      build(k) {
        k.shapes({ preset: 'header', place: 'translate(0 -34)', at: 4, from: [200, -160] });
        k.header(null, 'Checklist para agentes seguros');
        ITEMS.forEach((item, index) => {
          const column = Math.floor(index / 4);
          const row = index % 4;
          const el = k.div({ left: `${COLUMN_X[column]}px`, top: `${GRID_TOP + row * ROW_H}px`, width: `${COLUMN_W}px`, height: `${ROW_H - 14}px`, borderTop: `2px solid ${C.line}`, paddingTop: '22px', display: 'flex', gap: '22px' },
            h('div', { style: { width: '72px', flexShrink: 0, fontSize: '80px', fontWeight: 800, color: C.accent, lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' } }, String(index + 1)),
            h('div', { style: { fontSize: '42px', lineHeight: 1.2, paddingTop: '4px' } },
              h('span', { style: { fontWeight: 600 } }, item.main),
              item.detail ? h('span', { style: { display: 'block', color: C.muted, fontWeight: 500, fontSize: '40px' } }, item.detail) : null));
          k.reveal(el, FIRST_ITEM + index * ITEM_GAP, { dx: -20, dy: 0 });
        });
        k.footnote(FIRST_ITEM + ITEMS.length * ITEM_GAP, 'Fuente: Harshil Agrawal (Cloudflare), “Why, and how you need to sandbox AI-Generated Code?”, AI Engineer Europe 2026');
      },
    });
  })();

  // ------------------------------------------------------------------------------- 44
  // Mirrors slide 3 («En 30 minutos»): the same four beats, now as conclusions. One click per line.
  (function () {
    const accent = (copy, tone = 'var(--accent)') => `<span style="color:${tone}">${copy}</span>`;
    const LINES = [
      { html: 'Las herramientas hacen capaz a tu agente…', sub: 'hasta que llenan el contexto' },
      { html: `El código es la ${accent('mejor herramienta')}` },
      { html: `Ejecutar código es ${accent('RCE', C.danger)}: trátalo con respeto` },
      { html: `${accent('Insider')} + ${accent('sandbox')} + ${accent('SDK')} con los permisos del usuario` },
    ];
    const LINE_AT = (index) => 10 + index * 30;

    Deck.add({
      id: '44',
      title: 'Recap final',
      steps: LINES.map((line, index) => LINE_AT(index) + 22),
      build(k) {
        k.header(null, 'Lo que nos llevamos', { text: true });
        const list = k.div({ left: '96px', top: '262px', width: '1728px', display: 'flex', flexDirection: 'column', gap: '52px' });
        LINES.forEach((line, index) => {
          const el = h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '40px', paddingTop: '28px', borderTop: `2px solid ${C.line}` } },
            h('div', { style: { width: '64px', flexShrink: 0, fontFamily: FONT.mono, fontSize: '64px', fontWeight: 700, color: C.accent, lineHeight: 1 } }, String(index + 1)),
            h('div', { style: { fontSize: '54px', fontWeight: 700, letterSpacing: '-0.008em', lineHeight: 1.15 } },
              h('div', { html: line.html }),
              line.sub ? h('div', { style: { color: C.muted, fontWeight: 600 } }, line.sub) : null));
          list.appendChild(el);
          k.reveal(el, LINE_AT(index), { dx: -20, dy: 0, len: 18 });
        });
      },
    });
  })();

  // ------------------------------------------------------------------------------- 45
  Deck.add({
    id: '45',
    title: 'Dale una computadora a tu agente. Pero quédate con las llaves.',
    steps: [96],
    flood: true,
    build(k) {
      // Full-bleed MXTW purple (template page 7): white headline, black body.
      k.flood({ at: 0, len: 24 });
      k.shapes({ preset: 'column', place: 'scale(0.62)', tone: '#000', at: 6, from: [-240, -60], before: false });
      k.lockup({ corner: 'br', width: 300, at: 40 });
      statement(k, ['Dale una computadora', 'a tu agente. Pero', 'quédate con las llaves.'], { top: 300, size: 106, accent: ['llaves'], accentTone: '#000', stagger: 3, lineHeight: 1.06 });
    },
  });

  // ------------------------------------------------------------------------------- 46
  Deck.add({
    id: '46',
    title: 'Gracias',
    steps: [70],
    build(k) {
      k.shapes({ preset: 'corner', only: [0, 1, 2], place: 'translate(1920 0) scale(0.44) translate(-1920 0)', at: 2, from: [240, -160] });
      k.lockup({ corner: 'tl', width: 300, inset: [96, 72], at: 20 });
      // «Gracias» rises letter by letter.
      const word = k.div({ left: '92px', top: '586px', fontSize: '196px', fontWeight: 800, letterSpacing: '-0.022em', lineHeight: 1 });
      [...'Gracias'].forEach((letter, index) => {
        const span = h('span', { style: { display: 'inline-block' } }, letter);
        word.appendChild(span);
        k.on((t) => {
          const p = settle(t, 4 + index * 2.5, 22);
          set(span, 'opacity', String(p));
          set(span, 'transform', `translateY(${mix(60, 0, p)}px)`);
        });
      });
      k.reveal(k.div({ left: '96px', top: '852px', fontSize: '42px', fontWeight: 700 }, 'Alejandro Krasovsky'), 26, { dy: 10 });
      k.reveal(k.div({ left: '96px', top: '918px', fontSize: '36px', color: C.muted },
        'Construyo agentes de IA… ', h('span', { style: { color: C.accent, fontWeight: 700 } }, 'seguros.')), 34, { dy: 10 });

      // QR to the speaker's site: dark modules on white, so a phone reads it off a projector.
      const qr = k.div({ left: '1423px', top: '465px', width: '401px', height: '401px', borderRadius: '24px', background: '#FFFFFF', padding: '18px', boxSizing: 'border-box', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' },
        h('img', { src: 'assets/qr-alejandrokrasovsky.svg', alt: 'QR a alejandrokrasovsky.com', draggable: 'false', style: { display: 'block', width: '100%', height: '100%' } }));
      k.on((t) => {
        const p = settle(t, 30, 24);
        set(qr, 'opacity', String(p));
        set(qr, 'transform', `scale(${mix(0.94, 1, p)})`);
      });
      k.reveal(k.div({ left: '1383px', top: '900px', width: '481px', textAlign: 'center', fontFamily: FONT.mono, fontSize: '30px', fontWeight: 700, color: C.ink }, 'alejandrokrasovsky.com'), 44, { dy: 10 });
    },
  });
})();
