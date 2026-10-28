// Slides 15–18 · Acto 2 · Resultados: the owner's question, the JSON that floods the context, the script that answers it.
(function () {
  'use strict';
  const { C, SIZE, FONT, ease, easeIO, settle, mix, lerpColor, fmtInt, clamp01, set, text, h, tokenize } = K;
  const px = (value) => `${value}px`;

  const QUESTION = 'Qué anuncio me trae más prospectos que sí reservan?';

  // Illustrative numbers (plan, «Chema's world»). Every figure on these slides derives from here.
  const DATA = {
    anuncios: { records: 5, tokens: 2_000 },
    prospectos: { records: 3_000, tokens: 3_000 * 300 },
    reservas: { records: 2_000, tokens: 2_000 * 150 },
  };
  const WINDOW_TOKENS = 1_000_000;
  const ANSWER_TOKENS = 200;
  const ALL_TOKENS = DATA.anuncios.tokens + DATA.prospectos.tokens + DATA.reservas.tokens;
  // The ratio uses the rounded figure the audience reads («≈1.2M»), not the exact sum.
  const SHOWN_TOKENS = Math.round(ALL_TOKENS / 100_000) * 100_000;
  const RATIO = SHOWN_TOKENS / ANSWER_TOKENS;

  const fmtTokens = (value) => {
    if (value >= 999_500) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
    return `${Math.round(value)}`;
  };

  // --- the JSON stack: one row per ≈75K tokens, one colour per source ------------------------------
  const ROW_H = 36;
  const ROW_TOKENS = 75_000;
  const COL_W = 520;
  const WINDOW_ROWS = WINDOW_TOKENS / ROW_TOKENS;
  const FRAME_H = WINDOW_ROWS * ROW_H;
  // prospectos follows the act accent, so it is read at render time (lerpColor needs the hex).
  const TONE = { anuncios: C.amber, get prospectos() { return C.accent; }, reservas: C.code.fn };
  const SOFT = { anuncios: 'rgba(245,196,81,0.10)', prospectos: 'rgba(var(--accent-rgb),0.10)', reservas: 'rgba(124,199,255,0.10)' };

  const ADS = ['Promo sábado', 'Cumpleaños', 'Brunch', 'Video terraza', '2x1 martes'];
  const NAMES = ['Sofía R.', 'Jorge M.', 'Paty L.', 'Beto G.', 'Carmen V.', 'Raúl P.', 'Fer S.', 'Memo T.'];
  const pad = (value, width = 4) => String(value).padStart(width, '0');
  const ROWS = [
    { source: 'anuncios', text: '[{"id":"ad_1","nombre":"Promo sábado","gasto":4200},{"id":"ad_2",…' },
    ...Array.from({ length: DATA.prospectos.tokens / ROW_TOKENS }, (_, index) => ({
      source: 'prospectos',
      text: `{"id":"p_${pad(412 + index * 173)}","anuncio":"${ADS[(index * 3) % ADS.length]}","nombre":"${NAMES[index % NAMES.length]}","creado":"2026-08-${pad((index % 28) + 1, 2)}"}`,
    })),
    ...Array.from({ length: DATA.reservas.tokens / ROW_TOKENS }, (_, index) => ({
      source: 'reservas',
      text: `{"id":"r_${pad(981 + index * 211)}","prospecto":"p_${pad(412 + index * 519)}","fecha":"2026-08-${pad((index * 5) % 28 + 2, 2)}","personas":${2 + (index % 5)}}`,
    })),
  ];
  const rowsOf = (source) => ROWS.filter((row) => row.source === source).length;
  const rowTokens = (source) => DATA[source].tokens / rowsOf(source);

  // Rows stack upward from (x, bottom). The wrap has no height, so it can move as one block.
  const jsonStack = (k, x, bottom) => {
    const wrap = k.div({ left: px(x), top: px(bottom), width: px(COL_W), height: '0px' });
    const rows = ROWS.map((row, index) => {
      const el = h('div', { class: 'p2-row', style: { top: px(-(index + 1) * ROW_H + 2), width: px(COL_W) } }, row.text);
      wrap.appendChild(el);
      return { ...row, index, el };
    });
    return { wrap, rows };
  };
  const paintRow = (row, danger = 0) => {
    const tone = danger > 0 ? lerpColor(TONE[row.source], C.danger, danger) : TONE[row.source];
    set(row.el, 'color', tone);
    set(row.el, 'borderLeftColor', tone);
    set(row.el, 'background', danger > 0 ? `rgba(255,77,94,${(0.1 + 0.06 * danger).toFixed(3)})` : SOFT[row.source]);
  };
  // The 1M-token window drawn around a stack (positions are relative to the stack's wrap).
  const windowFrame = (parent) => {
    const frame = h('div', { style: { position: 'absolute', left: '-18px', top: px(-FRAME_H), width: px(COL_W + 36), height: px(FRAME_H + 18), boxSizing: 'border-box', border: '3px solid #4D4D4D', borderRadius: '6px 6px 16px 16px', pointerEvents: 'none' } });
    parent.appendChild(frame);
    return frame;
  };
  const toneFrame = (frame, over) => {
    set(frame, 'borderColor', lerpColor('#4D4D4D', '#FF4D5E', over));
    set(frame, 'boxShadow', over > 0 ? `0 0 ${(56 * over).toFixed(1)}px rgba(255,77,94,${(0.5 * over).toFixed(3)})` : 'none');
  };

  // A tool call rendered as a code chip.
  const callChip = (source) => {
    const el = h('span', { class: 'p2-call' });
    for (const token of tokenize(source)) el.appendChild(h('span', { style: { color: token.tone } }, token.text));
    return el;
  };

  const CALLS = [
    { source: 'anuncios', call: 'listar_anuncios()', short: 'listar_anuncios()', service: 'Meta Ads', result: `${DATA.anuncios.records} anuncios` },
    { source: 'prospectos', call: 'listar_prospectos(desde: "1 ago")', short: 'listar_prospectos(…)', service: 'Salesforce', result: `≈${fmtInt(DATA.prospectos.records)} prospectos` },
    { source: 'reservas', call: 'listar_reservas(desde: "1 ago")', short: 'listar_reservas(…)', service: 'OpenTable', result: `≈${fmtInt(DATA.reservas.records)} reservas` },
  ];

  // ---------------------------------------------------------------------------------- 15 · la pregunta
  Deck.add({
    id: '15',
    title: 'La pregunta del dueño',
    steps: [64],
    build(k) {
      k.shapes({ preset: 'corner', only: [1, 2, 3], place: 'translate(0 -120) translate(1920 1080) scale(0.6) translate(-1920 -1080)', at: 4, from: [260, 60] });
      const status = h('div', { class: 'chat-status' }, 'en línea');
      const head = h('div', { class: 'chat-head' },
        h('div', { class: 'avatar' }, 'C'),
        h('div', null, h('div', { class: 'chat-name' }, 'Chema'), status));
      const body = h('div', { class: 'chat-body' });
      const chat = k.div({ left: '380px', top: '196px', width: '1160px' }, h('div', { class: 'chat' }, head, body));
      k.reveal(chat, 0, { dy: 24 });

      body.appendChild(h('div', { class: 'day-pill' }, 'Hoy'));
      const who = h('div', { class: 'p2-who' }, 'el dueño del restaurante');
      const bubble = h('div', { class: 'bubble out' });
      bubble.innerHTML = `${QUESTION}<span class="meta">9:14 p.m.<span class="ticks">✓✓</span></span>`;
      const typing = h('div', { class: 'typing p2-typing' }, h('i'), h('i'), h('i'));
      body.append(who, bubble, typing);

      k.reveal(who, 22, { dy: 8 });
      k.on((t) => {
        const p = settle(t, 16, 18);
        set(bubble, 'opacity', String(p));
        set(bubble, 'transformOrigin', 'right bottom');
        set(bubble, 'transform', `translateY(${mix(18, 0, p)}px) scale(${mix(0.96, 1, p)})`);
        // Chema starts typing and the slide holds there (the dots loop in CSS).
        const typingOn = t >= 40;
        set(typing, 'visibility', typingOn ? 'visible' : 'hidden');
        set(typing, 'opacity', String(ease(t, 40, 10)));
        text(status, typingOn ? 'escribiendo…' : 'en línea');
        set(status, 'color', typingOn ? C.safe : C.chatMeta);
      });
    },
  });

  // ---------------------------------------------------------------------------------- 16 · resultados
  Deck.add({
    id: '16',
    title: 'Los resultados también ocupan contexto',
    steps: [100, 206, 300],
    build(k) {
      k.header(null, 'Los resultados también ocupan contexto');
      const COL_X = 1300;
      const BASE = 860;
      const CALL_Y = [250, 450, 650];
      const START = [14, 112, 216];
      const FLIGHT = 26;

      // An open-topped tube: the context has no visible limit yet (slide 17 adds the lid).
      const tube = k.div({
        left: px(COL_X - 18), top: px(BASE - 660), width: px(COL_W + 36), height: '678px', boxSizing: 'border-box',
        border: `3px solid ${C.lineHi}`, borderTop: 'none', borderRadius: '0 0 16px 16px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.9), rgba(0,0,0,0))',
        WebkitMaskImage: 'linear-gradient(0deg, #000 50%, transparent 100%)', maskImage: 'linear-gradient(0deg, #000 50%, transparent 100%)',
      });
      k.fade(tube, 4);
      k.reveal(k.div({ left: px(COL_X), top: px(BASE + 30), width: px(COL_W), textAlign: 'center', fontSize: px(SIZE.small), fontWeight: 600, color: C.muted }, 'contexto del modelo'), 4);

      // The calls, one per step. Each result line wears its source's colour, like its rows.
      const badges = CALLS.map((callDef, index) => {
        const chip = callChip(callDef.call);
        const badge = h('span', { class: 'p2-paid' });
        const line1 = h('div', { style: { display: 'flex', alignItems: 'center', gap: '18px' } }, chip, badge);
        const tone = TONE[callDef.source];
        const line2 = h('div', { style: { marginTop: '16px', display: 'flex', alignItems: 'baseline', gap: '12px', fontSize: '30px', whiteSpace: 'nowrap' } },
          h('span', { style: { color: C.muted } }, `${callDef.service} →`),
          h('span', { style: { color: tone, fontWeight: 700 } }, callDef.result),
          h('span', { style: { color: C.dim } }, '·'),
          h('span', { style: { color: tone, fontFamily: FONT.mono, fontWeight: 500 } }, `≈${fmtTokens(DATA[callDef.source].tokens)} tokens`));
        k.div({ left: '96px', top: px(CALL_Y[index]) }, line1, line2);
        k.reveal(chip, START[index], { dy: 0, dx: -16 });
        k.reveal(line2, START[index] + 14, { dy: 10 });
        return badge;
      });

      // Every new call re-sends what came before: each earlier result gets paid once more.
      const landsAt = START.map((start) => start + 20 + FLIGHT);
      k.on((t) => {
        badges.forEach((badge, index) => {
          const later = landsAt.filter((at, other) => other > index && t >= at);
          const times = 1 + later.length;
          set(badge, 'visibility', times > 1 ? 'visible' : 'hidden');
          if (times < 2) return;
          text(badge, `pagado ×${times}`);
          const pop = settle(t, later[later.length - 1], 14);
          set(badge, 'opacity', String(pop));
          set(badge, 'transform', `scale(${mix(0.7, 1, pop)})`);
        });
      });

      // The arrow, labelled once.
      const svg = k.svg();
      const arrow = k.arrow(svg, { from: [930, 560], to: [1250, 560], width: 4, head: 20 });
      k.on((t) => arrow.set(easeIO(t, 58, 20), C.muted));
      k.reveal(k.div({ left: '900px', top: '416px', width: '380px', textAlign: 'center', fontSize: px(SIZE.tiny), lineHeight: 1.3, color: C.ink, fontWeight: 600 },
        h('div', null, 'el resultado ', h('span', { style: { fontFamily: FONT.mono, color: C.accent } }, '(JSON)')),
        h('div', null, 'regresa al modelo'),
        h('div', { style: { color: C.muted } }, 'como texto')), 64);

      // Rows fly from their call's result line into the stack.
      const stack = jsonStack(k, COL_X, BASE);
      const flights = stack.rows.map((row) => {
        const index = CALLS.findIndex((callDef) => callDef.source === row.source);
        const order = stack.rows.filter((other) => other.source === row.source).indexOf(row);
        const departs = START[index] + 20 + order * (row.source === 'prospectos' ? 3 : 5);
        const from = [880 - COL_X, CALL_Y[index] + 70 - (BASE - (row.index + 1) * ROW_H + 2)];
        paintRow(row);
        return { row, departs, from };
      });
      const counter = k.div({ left: px(COL_X), width: px(COL_W), textAlign: 'center', fontFamily: FONT.mono, fontSize: '38px', fontWeight: 700, whiteSpace: 'nowrap' });
      k.on((t) => {
        let height = 0;
        let tokens = 0;
        for (const { row, departs, from } of flights) {
          const p = easeIO(t, departs, FLIGHT);
          set(row.el, 'display', t >= departs ? 'block' : 'none');
          set(row.el, 'opacity', String(Math.min(1, p * 3)));
          set(row.el, 'transform', `translate(${mix(from[0], 0, p).toFixed(1)}px, ${mix(from[1], 0, p).toFixed(1)}px) scale(${mix(0.5, 1, p).toFixed(3)})`);
          height += ROW_H * p;
          tokens += rowTokens(row.source) * p;
        }
        set(counter, 'top', px(BASE - height - 62));
        set(counter, 'opacity', String(ease(t, START[0] + 30, 12)));
        text(counter, `≈ ${fmtTokens(tokens)} tokens`);
      });

      k.footnote(10, '≈ números ilustrativos');
    },
  });

  // ---------------------------------------------------------------------------------- 17 · no cabe
  Deck.add({
    id: '17',
    title: 'No cabe',
    steps: [50, 290, 340],
    build(k) {
      k.header(null, 'Cabe en la ventana?');
      const COL_X = 1300;
      const BASE = 860;
      const FLOOD = { start: 60, length: 100 };
      const BURST = 128;

      // Left: the three results from slide 16, then their sum.
      CALLS.forEach((callDef, index) => {
        const row = k.div({ left: '96px', top: px(250 + index * 86), width: '820px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
          callChip(callDef.short),
          h('span', { style: { fontFamily: FONT.mono, fontSize: '36px', fontWeight: 700, color: TONE[callDef.source] } }, `≈${fmtTokens(DATA[callDef.source].tokens)}`));
        k.reveal(row, 6 + index * 6, { dy: 10 });
      });
      k.reveal(k.div({ left: '96px', top: '512px', width: '820px', height: '3px', background: C.lineHi }), BURST + 4);
      k.reveal(k.div({ left: '96px', top: '532px', width: '820px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
        h('span', { style: { fontSize: '32px', color: C.muted, fontWeight: 600 } }, 'en total'),
        h('span', { style: { fontFamily: FONT.mono, fontSize: '48px', fontWeight: 700, color: C.danger } }, `≈${fmtTokens(SHOWN_TOKENS)} tokens`)), BURST + 8);

      // Even if it fit, the model would still have to do the math in its head.
      const HEAD = BURST + 70;
      k.reveal(k.div({ left: '96px', top: '660px', fontSize: '32px', color: C.muted, fontWeight: 600 }, 'Y luego, en su cabeza:'), HEAD);
      const steps = k.div({ left: '96px', top: '716px', display: 'flex', alignItems: 'center', gap: '16px' });
      ['cruzar', 'contar', 'dividir'].forEach((word, index) => {
        if (index > 0) steps.appendChild(k.fade(h('span', { style: { color: C.dim, fontSize: '32px' } }, '→'), HEAD + 6 + index * 10));
        steps.appendChild(k.reveal(k.chip(word, { mono: false, fontSize: 32 }), HEAD + 6 + index * 10, { dy: 8 }));
      });
      const guess = h('span', null);
      k.reveal(k.div({ left: '96px', top: '810px', fontFamily: FONT.mono, fontSize: '30px', color: '#FF9BA5', padding: '8px 18px', border: `2px dashed ${C.danger}`, borderRadius: '12px', background: C.bgDeep },
        '212 / 517 = ', guess), HEAD + 44);
      const GUESSES = ['0.41… o eran 571?', '0.37… o 0.44?', '0.41… o eran 571?'];
      k.on((t) => text(guess, GUESSES[Math.min(GUESSES.length - 1, Math.max(0, Math.floor((t - HEAD - 44) / 10)))]));

      // Right: the 1M window. The same rows as slide 16; the ones past the lid spill in red.
      const stack = jsonStack(k, COL_X, BASE);
      const frame = windowFrame(stack.wrap);
      const pill = k.div({ left: px(COL_X), width: px(COL_W), top: px(BASE - FRAME_H - 30), textAlign: 'center' }, h('span', { class: 'p2-pill' }, 'no cabe'));
      const total = h('span', { style: { fontFamily: FONT.mono, fontSize: '44px', fontWeight: 700 } });
      k.reveal(k.div({ left: px(COL_X - 18), top: px(BASE + 34), width: px(COL_W + 36), display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
        h('span', { style: { fontSize: px(SIZE.tiny), color: C.muted, fontWeight: 600 } }, 'ventana · 1M tokens'),
        total), 14);

      k.on((t) => {
        const filled = ROWS.length * easeIO(t, FLOOD.start, FLOOD.length);
        const over = clamp01((filled - WINDOW_ROWS) / 1.5);
        let tokens = 0;
        set(stack.wrap, 'opacity', String(ease(t, 10, 14)));
        for (const row of stack.rows) {
          const shown = clamp01(filled - row.index);
          tokens += rowTokens(row.source) * shown;
          set(row.el, 'display', shown > 0 ? 'block' : 'none');
          set(row.el, 'opacity', String(shown));
          set(row.el, 'transform', `translateX(${mix(70, 0, shown).toFixed(1)}px)`);
          paintRow(row, row.index + 0.5 > WINDOW_ROWS ? ease(t, BURST - 10, 10) : 0);
        }
        toneFrame(frame, over);
        set(total, 'color', over > 0 ? C.danger : C.ink);
        text(total, tokens < 5_000 ? '0' : `≈ ${fmtInt(Math.round(tokens / 10_000) * 10_000)}`);
        // «no cabe» pops, blinks three times, then stays.
        const age = t - BURST;
        const pop = settle(t, BURST, 14);
        const blink = age > 0 && age < 36 && Math.floor(age / 6) % 2 === 1 ? 0.35 : 1;
        set(pill, 'opacity', String(pop * blink));
        set(pill, 'transform', `scale(${mix(0.6, 1, pop).toFixed(3)})`);
      });

      // Click: the punchline.
      const shade = k.div({ inset: '0px' });
      const punchline = k.div({ left: '0px', right: '0px', top: '470px', textAlign: 'center', fontSize: '92px', fontWeight: 800, letterSpacing: '-0.008em' },
        'Le pedimos un ', h('span', { style: { color: C.accent, fontFamily: FONT.mono, fontWeight: 700 } }, 'JOIN'), ' en su cabeza.');
      k.on((t) => {
        const punch = ease(t, 296, 22);
        set(shade, 'background', `rgba(0,0,0,${(0.92 * punch).toFixed(3)})`);
        set(punchline, 'opacity', String(punch));
        set(punchline, 'transform', `translateY(${mix(24, 0, punch).toFixed(1)}px)`);
      });

      k.footnote(10, '≈ números ilustrativos');
    },
  });

  // ---------------------------------------------------------------------------------- 18 · con código
  const SCRIPT = [
    'const conteo = {};',
    'for (const p of prospectos) {',
    '  conteo[p.anuncio] ??= { total: 0, reservan: 0 };',
    '  conteo[p.anuncio].total++;',
    '  if (reservas.has(p.id)) conteo[p.anuncio].reservan++;',
    '}',
    'return Object.entries(conteo)',
    '  .map(([anuncio, c]) => [anuncio, c.reservan / c.total])',
    '  .sort((a, b) => b[1] - a[1]).slice(0, 3);',
  ].join('\n');
  const ANSWER = [['Promo sábado', '41%'], ['Cumpleaños', '33%'], ['Brunch', '27%']];

  Deck.add({
    id: '18',
    title: 'Y si lo resuelve con código?',
    steps: [160, 290, 410],
    build(k) {
      k.header(null, 'Y si lo resuelve con código?');
      const BASE = 860;
      const TYPE = { start: 40, perFrame: 3.2 };
      const RUN = { start: 166, length: 70 }; // the click lands at 160; records stream right after
      const PAIR = { start: 296 };
      const LEFT_X = [96, 150];
      const RIGHT_X = 790;
      const PAIR_BASE = 810;
      const CARD = { x: 1370, h: 174, scale: 26 / 30 }; // h: the answer card's rendered height at 30px

      // The same JSON as slide 17, now as plain data for a script to read.
      const stack = jsonStack(k, LEFT_X[0], BASE);
      const frame = windowFrame(stack.wrap);
      stack.rows.forEach((row) => paintRow(row));
      const dataLabel = k.div({ left: px(LEFT_X[0]), top: px(BASE + 30), width: px(COL_W), textAlign: 'center', fontSize: px(SIZE.small), fontWeight: 600, color: C.muted }, 'el mismo JSON');

      // Records stream from the JSON into the script (they dive under the code panel).
      const PARTICLES = 30;
      const particles = Array.from({ length: PARTICLES }, (_, index) => {
        const row = stack.rows[1 + ((index * 7) % (stack.rows.length - 1))];
        const el = k.div({ left: '0px', top: '0px', fontFamily: FONT.mono, fontSize: px(SIZE.tiny), lineHeight: '30px', padding: '0 10px', borderRadius: '8px', color: TONE[row.source], border: `2px solid ${TONE[row.source]}`, background: C.bgDeep, whiteSpace: 'nowrap', display: 'none' }, '{…}');
        const departs = RUN.start + index * ((RUN.length - 24) / PARTICLES);
        const from = [LEFT_X[0] + COL_W - 90, BASE - (row.index + 1) * ROW_H];
        const to = [790, 300 + ((index * 67) % 320)];
        return { el, departs, from, to };
      });

      // The script types in.
      const code = k.code(SCRIPT, { fontSize: 28, caret: true });
      const panel = k.div({ left: '720px', top: '236px', width: '1104px', padding: '28px 36px', boxSizing: 'border-box' }, code.el);
      panel.className = 'p2-panel';
      const status = h('span', null);
      const statusLine = k.div({ left: '720px', top: '700px', fontFamily: FONT.mono, fontSize: px(SIZE.tiny), color: C.muted }, '▶ registros leídos: ', status);

      // The answer: ≈200 tokens.
      const answer = h('div', { style: { fontFamily: FONT.mono, fontSize: '30px', lineHeight: 1.5, whiteSpace: 'pre' } },
        ANSWER.map(([name, rate], index) => h('div', null,
          h('span', { style: { color: C.code.punct } }, index === 0 ? '{ ' : '  '),
          h('span', { style: { color: C.code.string } }, `"${name}"`),
          h('span', { style: { color: C.code.punct } }, ':'.padEnd(15 - name.length)),
          h('span', { style: { color: C.code.number, fontWeight: 700 } }, `"${rate}"`),
          h('span', { style: { color: C.code.punct } }, index === ANSWER.length - 1 ? ' }' : ','))));
      const answerCard = k.div({ left: '720px', top: '754px', padding: '18px 28px', borderRadius: '16px', border: `2px solid ${C.safe}`, background: 'rgba(74,224,130,0.08)', boxShadow: '0 0 40px rgba(74,224,130,0.18)', transformOrigin: 'left top' }, answer);
      const answerTag = k.div({ left: '1250px', top: '806px', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '30px', color: C.safe, fontWeight: 600 },
        h('span', { style: { color: C.muted } }, '←'), h('span', { style: { fontFamily: FONT.mono } }, `≈${ANSWER_TOKENS} tokens`));

      // The punchline: two windows, side by side.
      const sliverFrame = k.div({ left: px(RIGHT_X - 18), top: px(PAIR_BASE - FRAME_H), width: px(COL_W + 36), height: px(FRAME_H + 18), boxSizing: 'border-box', border: '3px solid #4D4D4D', borderRadius: '6px 6px 16px 16px' });
      const sliver = k.div({ left: px(RIGHT_X), top: px(PAIR_BASE - 6), width: px(COL_W), height: '6px', borderRadius: '3px', background: C.safe, boxShadow: `0 0 18px ${C.safe}, 0 0 46px rgba(74,224,130,0.6)` });
      const connector = k.div({ left: px(RIGHT_X + COL_W + 6), top: px(PAIR_BASE - 5), width: px(CARD.x - RIGHT_X - COL_W - 6), height: '3px', background: C.safe, transformOrigin: 'left center' });
      const sizeLabel = (x, value, tone, sub) => k.div({ left: px(x - 18), top: px(PAIR_BASE + 32), width: px(COL_W + 36), textAlign: 'center' },
        h('div', { style: { fontFamily: FONT.mono, fontSize: '44px', fontWeight: 700, color: tone } }, value),
        h('div', { style: { fontSize: px(SIZE.tiny), color: C.muted, fontWeight: 600, marginTop: '2px' } }, sub));
      const bigLabel = sizeLabel(LEFT_X[1], `≈${fmtTokens(SHOWN_TOKENS)} tokens`, C.danger, 'todo el JSON, al modelo');
      const smallLabel = sizeLabel(RIGHT_X, `≈${ANSWER_TOKENS} tokens`, C.safe, 'solo la respuesta');
      const ratio = h('span', { style: { color: C.accent } });
      const caption = k.div({ left: '0px', right: '0px', top: '962px', textAlign: 'center', fontSize: '50px', fontWeight: 800, letterSpacing: '-0.006em' },
        'Misma respuesta. ', ratio, ' menos contexto.');

      k.on((t) => {
        // Arrival: the rows settle in as one block.
        const arrive = ease(t, 6, 18);
        // While the script runs, a read head sweeps the rows twice.
        const sweep = t >= RUN.start && t < RUN.start + RUN.length - 10 ? Math.floor(((t - RUN.start) / (RUN.length - 10)) * ROWS.length * 2) % ROWS.length : -1;
        for (const row of stack.rows) {
          const shown = ease(t, 4 + row.index * 1.2, 14);
          set(row.el, 'opacity', String(shown));
          set(row.el, 'filter', row.index === sweep ? 'brightness(1.7)' : 'none');
          set(row.el, 'transform', `translateX(${mix(-40, 0, shown).toFixed(1)}px)`);
        }
        set(dataLabel, 'opacity', String(arrive * (1 - ease(t, PAIR.start, 12))));

        const typed = Math.floor((t - TYPE.start) * TYPE.perFrame);
        code.setChars(typed >= code.total ? Infinity : Math.max(0, typed));
        const panelIn = ease(t, TYPE.start - 14, 14);
        const pairOut = 1 - ease(t, PAIR.start, 14);
        set(panel, 'opacity', String(panelIn * pairOut));
        set(panel, 'transform', `translateY(${mix(14, 0, panelIn).toFixed(1)}px)`);

        // Run: the loop body lights up while records stream through.
        const running = t >= RUN.start && t < RUN.start + RUN.length;
        const loopLine = 2 + (Math.floor((t - RUN.start) / 3) % 3);
        code.highlight(running ? loopLine : t >= RUN.start + RUN.length && t < PAIR.start ? 6 : -1, running ? C.accentSoft : C.safeSoft);
        const read = ease(t, RUN.start, RUN.length - 10);
        text(status, `${fmtInt((DATA.prospectos.records + DATA.reservas.records) * read)}`);
        set(statusLine, 'opacity', String(ease(t, RUN.start - 4, 8) * pairOut));
        for (const { el, departs, from, to } of particles) {
          const p = easeIO(t, departs, 24);
          const live = t >= departs && p < 1;
          set(el, 'display', live ? 'block' : 'none');
          if (!live) continue;
          set(el, 'opacity', String(Math.min(1, p * 5).toFixed(3)));
          set(el, 'transform', `translate(${mix(from[0], to[0], p).toFixed(1)}px, ${mix(from[1], to[1], p).toFixed(1)}px)`);
        }

        // The answer lands, then moves into the right-hand window at the punchline.
        const answerIn = settle(t, RUN.start + RUN.length - 6, 18);
        const move = easeIO(t, PAIR.start + 4, 30);
        set(answerCard, 'opacity', String(answerIn));
        set(answerCard, 'left', px(mix(720, CARD.x, move)));
        set(answerCard, 'top', px(mix(754 + mix(16, 0, answerIn), PAIR_BASE - 4 - (CARD.h * CARD.scale) / 2, move)));
        set(answerCard, 'transform', `scale(${mix(1, CARD.scale, move).toFixed(3)})`);
        set(answerTag, 'opacity', String(ease(t, RUN.start + RUN.length + 6, 12) * pairOut));

        // Punchline: the JSON becomes the overflowing window, the answer becomes a sliver.
        const slide = easeIO(t, PAIR.start, 30);
        set(stack.wrap, 'left', px(mix(LEFT_X[0], LEFT_X[1], slide)));
        set(stack.wrap, 'top', px(mix(BASE, PAIR_BASE, slide)));
        const redden = ease(t, PAIR.start + 18, 22);
        for (const row of stack.rows) paintRow(row, redden);
        set(frame, 'opacity', String(ease(t, PAIR.start + 10, 14)));
        toneFrame(frame, redden);
        const second = ease(t, PAIR.start + 24, 16);
        set(sliverFrame, 'opacity', String(second));
        const sliverIn = settle(t, PAIR.start + 46, 16);
        set(sliver, 'opacity', String(sliverIn));
        set(sliver, 'transform', `scaleX(${mix(0.2, 1, sliverIn).toFixed(3)})`);
        const link = ease(t, PAIR.start + 56, 12);
        set(connector, 'opacity', String(link));
        set(connector, 'transform', `scaleX(${link.toFixed(3)})`);
        set(bigLabel, 'opacity', String(ease(t, PAIR.start + 34, 14)));
        set(smallLabel, 'opacity', String(ease(t, PAIR.start + 52, 14)));
        const captionIn = ease(t, PAIR.start + 66, 18);
        set(caption, 'opacity', String(captionIn));
        set(caption, 'transform', `translateY(${mix(16, 0, captionIn).toFixed(1)}px)`);
        const counted = mix(1, RATIO, easeIO(t, PAIR.start + 70, 34));
        text(ratio, `${fmtInt(Math.round(counted / 10) * 10 || 1)}×`);
      });

      k.footnote(10, '≈ números ilustrativos');
    },
  });
})();
