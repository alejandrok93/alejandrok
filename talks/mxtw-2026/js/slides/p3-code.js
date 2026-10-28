// Part C2 · Código — slides 19–24 (RESTRUCTURE_PLAN_2026-10-28.md).
(function () {
  const { C, SIZE, FONT, ease, easeIO, settle, mix, clamp01, fmtInt, lerpColor, set, attr, text, h, s } = K;

  const FRAME = { left: 0, top: 0, width: '1920px', height: '1080px' };
  const logo = (name, px) => h('img', { src: `assets/logos/${name}.svg`, alt: '', style: { width: `${px}px`, height: `${px}px`, display: 'block', objectFit: 'contain' } });

  // Phase inside a repeating cycle that starts at `from`; null before the first cycle.
  const cycle = (L, from, period) => (L === Infinity ? Infinity : L < from ? null : (L - from) % period);

  // ------------------------------------------------------------------------------- 19
  const CARD_W = 320;
  const CARD_H = 560;
  const CARD_Y = 290;
  const STAGE_H = 420;

  const deterministic = () => {
    const rows = [1, 2, 3].map((n) => {
      const out = h('span', { class: 'mono', style: { color: C.safe, fontWeight: 700, minWidth: '30px' } }, '9');
      const row = h('div', { class: 'p3-det-row' },
        h('span', { class: 'mono', style: { color: C.dim, fontSize: '26px' } }, `#${n}`),
        h('span', { class: 'mono' }, h('span', { style: { color: C.code.fn } }, 'f'), h('span', { style: { color: C.code.punct } }, '('), h('span', { style: { color: C.code.number } }, '3'), h('span', { style: { color: C.code.punct } }, ')')),
        h('span', { style: { color: C.muted } }, '→'),
        out);
      return { row, out };
    });
    const el = h('div', { class: 'p3-stage-col', style: { gap: '26px' } }, rows.map((r) => r.row));
    const draw = (L) => {
      const phase = cycle(L, 28, 150);
      rows.forEach(({ row, out }, i) => {
        const shown = phase === Infinity ? 1 : phase == null ? 0 : ease(phase, 10 + i * 16, 10) * (1 - ease(phase, 122, 14));
        const flash = phase === Infinity || phase == null ? 0 : ease(phase, 10 + i * 16, 6) * (1 - ease(phase, 18 + i * 16, 16));
        set(out, 'opacity', String(shown));
        set(row, 'borderColor', flash > 0.02 ? lerpColor('#262626', '#4AE082', flash) : C.line);
      });
    };
    return { el, draw };
  };

  const exact = () => {
    const guesses = ['≈39%', '≈44%', '≈41%', '≈37%', '≈43%'];
    const guess = h('div', { class: 'mono', style: { fontSize: '44px', fontWeight: 700, color: C.danger, opacity: 0.8 } }, guesses[1]);
    const value = h('div', { class: 'mono', style: { fontSize: '62px', fontWeight: 800, color: C.safe, letterSpacing: '-0.008em' } }, '41.3%');
    const el = h('div', { class: 'p3-stage-col', style: { gap: '10px' } },
      h('div', { class: 'p3-mini' }, 'en la cabeza'), guess,
      h('div', { style: { width: '200px', height: '2px', background: C.line, margin: '26px 0' } }),
      h('div', { class: 'p3-mini' }, 'en código'), value);
    const draw = (L) => {
      if (L === Infinity) {
        text(guess, guesses[1]);
        set(guess, 'transform', 'none');
        set(value, 'textShadow', '0 0 18px rgba(74,224,130,0.35)');
        return;
      }
      const tick = Math.floor(Math.max(0, L) / 7);
      text(guess, guesses[tick % guesses.length]);
      set(guess, 'transform', `translate(${((tick * 7) % 5) - 2}px, ${((tick * 3) % 5) - 2}px)`);
      const pulse = 0.5 + 0.5 * Math.sin((L / 30) * Math.PI);
      set(value, 'textShadow', `0 0 ${(10 + 14 * pulse).toFixed(1)}px rgba(74,224,130,${(0.2 + 0.25 * pulse).toFixed(3)})`);
    };
    return { el, draw };
  };

  const millions = () => {
    const stripes = Array.from({ length: 12 }, () => h('div', { class: 'p3-stripe' }));
    const table = h('div', { class: 'p3-table' }, stripes);
    const counter = h('div', { class: 'mono', style: { fontSize: '50px', fontWeight: 800, letterSpacing: '-0.008em', fontVariantNumeric: 'tabular-nums' } }, '0');
    const done = h('span', { style: { display: 'inline-flex', marginLeft: '8px' } }, K.icon('check', 30, C.safe));
    const el = h('div', { class: 'p3-stage-col', style: { gap: '18px' } }, table, counter,
      h('div', { class: 'p3-mini', style: { display: 'flex', alignItems: 'center' } }, 'filas', done));
    const curve = (p) => (Math.exp(6 * p) - 1) / (Math.exp(6) - 1);
    let scroll = 0;
    const draw = (L) => {
      const phase = cycle(L, 30, 160);
      const p = phase === Infinity ? 1 : phase == null ? 0 : clamp01(phase / 72);
      const reset = phase === Infinity || phase == null ? 0 : ease(phase, 146, 12);
      const value = curve(p) * 1e6 * (1 - reset);
      text(counter, fmtInt(value));
      set(counter, 'color', p >= 1 && reset < 0.5 ? C.ink : C.muted);
      set(done, 'opacity', String(p >= 1 ? 1 - reset : 0));
      // Rows blur past faster as the count accelerates.
      scroll = phase === Infinity || phase == null ? 0 : (phase < 72 ? curve(p) * 900 : 900 + (phase - 72) * 0.6);
      stripes.forEach((stripe, i) => set(stripe, 'transform', `translateY(${(((i * 22 - scroll) % 264) + 264) % 264 - 22}px)`));
      set(table, 'borderColor', p > 0 && p < 1 ? C.accent : C.line);
    };
    return { el, draw };
  };

  const composes = () => {
    const blocks = [
      { label: 'prospectos', tone: C.ink, from: [-30, -14, -7] },
      { label: '.filter()', tone: C.code.fn, from: [32, 10, 8] },
      { label: '.map()', tone: C.code.fn, from: [-30, 30, -6] },
      { label: '.sort()', tone: C.code.fn, from: [30, 48, 7] },
    ].map((block, i) => {
      const el = h('div', { class: 'p3-block mono', style: { color: block.tone, top: `${i * 58}px`, borderRadius: i === 0 ? '12px 12px 4px 4px' : i === 3 ? '4px 4px 12px 12px' : '4px' } }, block.label);
      return { ...block, el };
    });
    const el = h('div', { class: 'p3-stage-col' }, h('div', { style: { position: 'relative', width: '236px', height: `${4 * 58}px` } }, blocks.map((b) => b.el)));
    const draw = (L) => {
      const phase = cycle(L, 26, 170);
      blocks.forEach(({ el: block, from }, i) => {
        const snap = phase === Infinity ? 1 : phase == null ? 0 : settle(phase, 6 + i * 13, 18) * (1 - easeIO(phase, 140, 24));
        const flash = phase === Infinity || phase == null ? 0 : ease(phase, 16 + i * 13, 4) * (1 - ease(phase, 20 + i * 13, 14));
        set(block, 'transform', `translate(${mix(from[0], 0, snap)}px, ${mix(from[1], 0, snap)}px) rotate(${mix(from[2], 0, snap)}deg)`);
        set(block, 'opacity', String(mix(0.45, 1, snap)));
        set(block, 'borderColor', flash > 0.02 ? lerpColor('#262626', C.accent, flash) : snap > 0.98 ? C.lineHi : C.line);
        set(block, 'boxShadow', flash > 0.02 ? `0 0 ${(22 * flash).toFixed(1)}px rgba(var(--accent-rgb),${(0.5 * flash).toFixed(3)})` : 'none');
      });
    };
    return { el, draw };
  };

  const state = () => {
    const value = h('div', { class: 'mono', style: { fontSize: '64px', fontWeight: 800, color: C.amber, fontVariantNumeric: 'tabular-nums' } }, '0');
    const slot = h('div', { class: 'p3-slot' }, value);
    const chip = h('div', { class: 'p3-drop mono' }, '+1');
    const el = h('div', { class: 'p3-stage-col', style: { gap: '18px' } },
      h('div', { class: 'mono', style: { fontSize: '30px' } }, h('span', { style: { color: C.code.keyword } }, 'let '), h('span', null, 'vistos')),
      h('div', { style: { position: 'relative' } }, chip, slot));
    const EVERY = 22;
    const draw = (L) => {
      // The count never resets: the variable outlives every step of the loop.
      const since = L === Infinity ? 12 * EVERY : L - 30;
      const landed = since < 0 ? 0 : Math.floor(since / EVERY);
      const local = since < 0 ? -1 : since % EVERY;
      const fall = local < 0 || L === Infinity ? 0 : ease(local, 0, 12);
      text(value, fmtInt(landed));
      set(chip, 'opacity', String(local < 0 || L === Infinity ? 0 : (1 - ease(local, 11, 4)) * ease(local, 0, 4)));
      set(chip, 'transform', `translate(-50%, ${mix(-78, 0, fall)}px)`);
      const bump = local < 0 || L === Infinity ? 0 : ease(local, 11, 3) * (1 - ease(local, 14, 8));
      set(slot, 'borderColor', bump > 0.02 ? lerpColor('#3A3524', '#F5C451', bump) : 'rgba(245,196,81,0.4)');
      set(value, 'transform', `scale(${(1 + 0.06 * bump).toFixed(3)})`);
    };
    return { el, draw };
  };

  const S19_END = 84;
  Deck.add({
    id: '19',
    title: 'Mejor con código que de cabeza',
    steps: [S19_END],
    build(k) {
      // Static on purpose: the five cards are read, not watched. Each stage renders its settled state.
      k.header(null, 'Mejor con código que de cabeza', { text: true });
      const cards = [
        ['Determinista', deterministic()],
        ['Cuentas exactas', exact()],
        ['Millones de filas', millions()],
        ['Se compone', composes()],
        ['Guarda estado', state()],
      ];
      cards.forEach(([title, stage], i) => {
        k.div({ left: `${96 + i * (CARD_W + 32)}px`, top: `${CARD_Y}px`, width: `${CARD_W}px`, height: `${CARD_H}px` },
          h('div', { class: 'p3-card' },
            h('div', { class: 'p3-stage', style: { height: `${STAGE_H}px` } }, stage.el),
            h('div', { class: 'p3-card-title' }, title)));
        stage.draw(Infinity);
      });
    },
  });

  // ------------------------------------------------------------------------------- 20
  const AGENTS = [
    ['claude-code', 'Claude Code'],
    ['codex', 'Codex'],
    ['cursor', 'Cursor'],
    ['opencode', 'opencode'],
    ['github-copilot', 'GitHub Copilot'],
    ['gemini-cli', 'Gemini CLI'],
  ];
  Deck.add({
    id: '20',
    title: 'Los modelos escriben muy buen código',
    // Arrival lands the logos; one click per show-of-hands question.
    steps: [44, 74, 106],
    build(k) {
      k.header(null, 'Los modelos escriben muy buen código', { text: true });
      const TILE_W = 268;
      AGENTS.forEach(([file, name], i) => {
        const tile = k.div({ left: `${96 + i * (TILE_W + 24)}px`, top: '230px', width: `${TILE_W}px`, height: '196px' },
          h('div', { class: 'p3-logo-tile' }, logo(file, 76), h('div', { class: 'p3-logo-name' }, name)));
        k.on((t) => {
          const p = settle(t, 10 + i * 5, 20);
          set(tile, 'opacity', String(p * (1 - 0.35 * ease(t, 44, 18))));
          set(tile, 'transform', `translateY(${mix(28, 0, p)}px)`);
        });
      });

      const question = (top, at, ...content) => {
        const hand = h('span', { style: { display: 'inline-block', fontSize: '54px', transformOrigin: '70% 90%' } }, '🙋');
        const card = k.div({ left: '96px', top: `${top}px`, width: '1728px', height: '176px', display: 'flex', alignItems: 'center', gap: '34px', padding: '0 52px', borderRadius: '22px', border: `2px solid ${C.line}`, background: C.panel, fontSize: '50px', fontWeight: 700, letterSpacing: '-0.004em' },
          hand, h('span', { style: { display: 'flex', alignItems: 'center', gap: '18px' } }, ...content));
        k.on((t) => {
          const p = settle(t, at, 22);
          set(card, 'opacity', String(p));
          set(card, 'transform', `translateY(${mix(40, 0, p)}px)`);
          // The hand goes up a beat after the card lands.
          const raise = settle(t, at + 8, 20);
          set(hand, 'transform', `rotate(${mix(-28, 0, raise)}deg) translateY(${mix(10, 0, raise)}px)`);
        });
      };
      question(512, 48, 'Quién usa un coding agent todos los días?');
      const flag = h('span', { class: 'mono', style: { display: 'inline-block', fontSize: '34px', fontWeight: 500, color: C.accent, padding: '10px 24px', borderRadius: '999px', border: '2px solid rgba(var(--accent-rgb),0.55)', background: 'rgba(var(--accent-rgb),0.12)' } }, '--dangerously-skip-permissions');
      question(724, 78, 'Quién lo ha corrido con', flag, '?');
    },
  });

  // ------------------------------------------------------------------------------- 21
  {
    const PANEL_Y = 180;
    const PANEL_H = 552;
    const PANEL_W = 840;
    const LEFT_X = 96;
    const RIGHT_X = 984;
    const ROW_Y = PANEL_Y + 88;
    const ROW_H = 38;
    const BAR_Y = PANEL_Y + 462;
    const BAR_W = 772;
    const LIMIT_K = 1000;
    const TOTAL_K = 1200;
    const PX_PER_K = BAR_W / TOTAL_K;

    // Chema's calls for the owner's question; tokens are illustrative (≈3,000 prospectos, ≈2,000 reservas).
    const CALLS = [
      { call: 'listar_anuncios()', k: 2 },
      { call: 'listar_prospectos(pág. 1)', k: 300 },
      { call: 'listar_prospectos(pág. 2)', k: 300 },
      { call: 'listar_prospectos(pág. 3)', k: 300 },
      { call: 'listar_reservas(pág. 1)', k: 150 },
      { call: 'listar_reservas(pág. 2)', k: 150 },
      { call: 'cruzar_datos(…)', k: 1 },
      { call: 'responder(…)', k: 0 },
    ];
    const INSIDE = [
      ...CALLS.slice(0, 6).map(({ call }) => ({ call, tone: C.ink })),
      { call: '// cruza y cuenta', tone: C.code.comment },
      { call: 'return top3', tone: C.code.keyword },
    ];

    const TRIP_START = 40;
    const TRIP_LEN = 22;
    const LEFT_DONE = TRIP_START + CALLS.length * TRIP_LEN + 4;
    const PROGRAM = { send: 40, run: 70, back: 116, land: 132 };
    const PRE = TRIP_START - 1;
    const STEPS = [PRE, 270, 390];

    const fmtK = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}M` : `${Math.round(v)}K`);

    Deck.add({
      id: '21',
      title: 'Misma tarea, un solo viaje',
      // Arrival shows both empty panels; click 1 runs both sides, click 2 lands the public numbers.
      steps: STEPS,
      build(k) {
        k.header(null, 'Misma tarea, un solo viaje');

        const panel = (x, title, tone, doneAt) => {
          const done = h('div', { style: { position: 'absolute', right: '30px', top: '28px', display: 'flex', alignItems: 'center', gap: '8px', color: tone, fontSize: `${SIZE.tiny}px`, fontWeight: 700 } },
            k.icon('check', 30, tone), ' listo');
          const el = k.div({ left: `${x}px`, top: `${PANEL_Y}px`, width: `${PANEL_W}px`, height: `${PANEL_H}px` },
            h('div', { style: { position: 'absolute', inset: 0, borderRadius: '24px', background: 'rgba(14,14,14,0.55)', border: `2px solid ${C.line}` } }),
            h('div', { style: { position: 'absolute', left: '34px', top: '22px', fontSize: '38px', fontWeight: 700 } }, title),
            done);
          k.reveal(el, 6);
          k.on((t) => set(done, 'opacity', String(ease(t, doneAt, 10))));
        };
        panel(LEFT_X, 'Con herramientas', C.muted, LEFT_DONE);
        panel(RIGHT_X, 'Con código', C.safe, PROGRAM.land + 10);

        // Context gauge per panel: blocks grow left to right; the 1M mark shows where the window ends.
        const gauge = (x, tone, blocks, limit) => {
          const bar = h('div', { class: 'p3-gauge', style: { left: `${x + 34}px`, top: `${BAR_Y}px`, width: `${BAR_W}px` } });
          const parts = blocks.map((block) => {
            const el = h('div', { style: { position: 'absolute', top: 0, bottom: 0, background: block.tone } });
            bar.appendChild(el);
            return { block, el };
          });
          // Past the 1M mark the window is full: that stretch reads as overflow.
          const overflow = limit ? h('div', { style: { position: 'absolute', top: 0, bottom: 0, left: `${LIMIT_K * PX_PER_K}px`, right: 0, background: 'repeating-linear-gradient(135deg, rgba(255,77,94,0.75) 0 10px, rgba(255,77,94,0.35) 10px 20px)' } }) : null;
          if (overflow) bar.appendChild(overflow);
          const value = h('span');
          const valueEl = h('div', { style: { position: 'absolute', left: `${x + 34}px`, top: `${BAR_Y - 54}px`, width: `${BAR_W}px`, textAlign: 'right', fontFamily: FONT.mono, fontSize: '38px', fontWeight: 700, color: tone } },
            '≈ ', value, ' ', h('span', { style: { fontSize: `${SIZE.tiny}px`, color: C.muted, fontWeight: 500 } }, 'tokens'));
          const wrap = k.div(FRAME,
            h('div', { style: { position: 'absolute', left: `${x + 34}px`, top: `${BAR_Y - 44}px`, fontSize: `${SIZE.tiny}px`, color: C.muted, fontWeight: 600 } }, 'contexto del modelo'),
            bar, valueEl);
          let mark = null;
          if (limit) {
            const markX = x + 34 + LIMIT_K * PX_PER_K;
            mark = h('div', { style: { position: 'absolute', left: `${markX - 1}px`, top: `${BAR_Y - 4}px`, width: '3px', height: '50px', background: C.danger, borderRadius: '2px' } });
            wrap.append(mark, h('div', { style: { position: 'absolute', left: `${markX - 80}px`, width: '160px', top: `${BAR_Y + 48}px`, textAlign: 'center', fontFamily: FONT.mono, fontSize: `${SIZE.tiny}px`, color: C.danger } }, 'límite 1M'));
          }
          k.reveal(wrap, 14);
          const update = (t) => {
            let left = 0;
            let total = 0;
            for (const { block, el } of parts) {
              const grow = ease(t, block.at, 10);
              const width = Math.max(block.min || 0, block.k * PX_PER_K) * grow;
              set(el, 'left', `${left}px`);
              set(el, 'width', `${Math.max(0, width - (block.min ? 0 : 3))}px`);
              left += width;
              total += block.k * grow;
            }
            set(bar, 'borderColor', limit && total > LIMIT_K ? C.danger : C.line);
            if (overflow) set(overflow, 'opacity', String(clamp01((total - LIMIT_K) / 60)));
            return total;
          };
          return { update, value };
        };
        const leftBlocks = CALLS.map((call, i) => ({ k: call.k, at: TRIP_START + i * TRIP_LEN + 18, tone: i % 2 ? C.accentAlt : C.accent }));
        const leftGauge = gauge(LEFT_X, C.danger, leftBlocks, true);
        const rightGauge = gauge(RIGHT_X, C.safe, [{ k: 0.2, min: 8, at: PROGRAM.land, tone: C.safe }], false);

        // Left: each call lands as a row, its result chip drops into the gauge.
        const leftRows = CALLS.map((call, i) => {
          const size = h('span', { class: 'mono', style: { marginLeft: 'auto', fontSize: `${SIZE.tiny}px`, fontWeight: 700, color: call.k ? C.accent : C.safe } }, call.k ? `+${fmtK(call.k)}` : '✓');
          const row = k.div({ left: `${LEFT_X + 24}px`, top: `${ROW_Y + i * ROW_H}px`, width: `${PANEL_W - 48}px`, height: `${ROW_H - 4}px` },
            h('div', { class: 'p3-call' },
              h('span', { class: 'mono', style: { color: C.dim, width: '28px' } }, String(i + 1)),
              h('span', { class: 'mono', style: { color: C.code.fn } }, call.call),
              size));
          return { row, size, at: TRIP_START + i * TRIP_LEN };
        });
        const svg = k.svg();
        const drops = CALLS.map(() => {
          const rect = s('rect', { width: 40, height: 18, rx: 5, fill: C.accent });
          svg.appendChild(rect);
          return rect;
        });

        // Right: one program drops into the sandbox, the calls run inside, one result comes out.
        const sandbox = k.box({ x: RIGHT_X + 24, y: ROW_Y - 14, w: PANEL_W - 48, h: CALLS.length * ROW_H + 20, fill: 'rgba(0,0,0,0.6)', radius: 16, dashed: true, tone: C.line });
        const sandboxTag = k.div({ left: `${RIGHT_X + PANEL_W - 210}px`, top: `${ROW_Y - 2}px`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: `${SIZE.tiny}px`, fontWeight: 700, color: C.muted },
          k.icon('lock', 26, C.safe), 'sandbox');
        k.reveal(sandbox, 14);
        k.reveal(sandboxTag, 14);
        const rightRows = INSIDE.map((inside, i) => {
          const dot = h('span', { style: { width: '12px', height: '12px', borderRadius: '6px', background: C.line, flexShrink: 0 } });
          const row = k.div({ left: `${RIGHT_X + 44}px`, top: `${ROW_Y + i * ROW_H}px`, height: `${ROW_H - 4}px`, display: 'flex', alignItems: 'center', gap: '18px' },
            dot, h('span', { class: 'mono', style: { fontSize: `${SIZE.tiny}px`, color: inside.tone } }, inside.call));
          return { row, dot, at: PROGRAM.run + i * 5 };
        });
        const programChip = k.div({ left: `${RIGHT_X + 500}px`, top: `${PANEL_Y + 24}px`, display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 16px', borderRadius: '12px', background: C.accent, color: C.bgDeep, fontWeight: 700, fontSize: `${SIZE.tiny}px` },
          k.icon('code', 26, C.bgDeep), '1 programa');
        const resultChip = s('rect', { width: 24, height: 18, rx: 5, fill: C.safe });
        svg.appendChild(resultChip);

        // Step 1 takeaways, swapped for the public numbers on step 2.
        const takeaways = k.div(FRAME);
        for (const column of [
          { x: LEFT_X, line: 'Cada resultado entra al contexto', tone: C.danger },
          { x: RIGHT_X, line: 'Solo regresa el resultado final', tone: C.safe },
        ]) {
          const el = h('div', { style: { position: 'absolute', left: `${column.x + 34}px`, top: `${PANEL_Y + PANEL_H + 40}px`, display: 'flex', alignItems: 'center', gap: '16px', fontSize: '38px', fontWeight: 600 } },
            h('div', { style: { width: '14px', height: '14px', borderRadius: '7px', background: column.tone } }), column.line);
          takeaways.appendChild(el);
          k.reveal(el, 226);
        }

        [
          { at: 286, value: '−98.7%', label: 'demo de Anthropic', detail: '150K → 2K tokens', tag: 'techo' },
          { at: 298, value: '−99.9%', label: 'Cloudflare', detail: 'toda su API en ~1K tokens', tag: 'techo' },
          { at: 310, value: '−37%', label: 'benchmark de Anthropic', detail: 'pruebas internas', tag: 'tareas difíciles' },
        ].forEach((stat, index) => {
          const real = stat.tag === 'tareas difíciles';
          const card = k.div({ left: `${96 + index * 586}px`, top: `${PANEL_Y + PANEL_H + 18}px`, width: '556px', height: '198px' },
            h('div', { style: { height: '100%', borderRadius: '20px', padding: '14px 28px', background: C.panel, border: `2px solid ${real ? C.accent : C.line}` } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
                h('span', { style: { fontSize: '64px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.008em', fontVariantNumeric: 'tabular-nums', color: real ? C.accent : C.ink } }, stat.value),
                h('span', { style: { fontSize: `${SIZE.tiny}px`, fontWeight: 700, color: real ? C.accent : C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' } }, stat.tag)),
              h('div', { style: { fontSize: '30px', fontWeight: 600, marginTop: '2px' } }, stat.label),
              h('div', { style: { fontSize: `${SIZE.tiny}px`, color: C.muted, marginTop: '2px' } }, stat.detail)));
          k.reveal(card, stat.at, { dy: 30 });
        });
        k.reveal(k.div({ right: '96px', top: '972px', fontSize: `${SIZE.tiny}px`, color: C.dim }, 'Inspirado en Code Mode de Cloudflare'), 322);

        k.on((t) => {
          const used = leftGauge.update(t);
          rightGauge.update(t);
          text(leftGauge.value, used < 0.5 ? '0' : fmtK(used));
          text(rightGauge.value, fmtInt(Math.round(ease(t, PROGRAM.land, 10) * 200)));
          leftRows.forEach(({ row, size, at }, i) => {
            const p = ease(t, at, 10);
            set(row, 'opacity', String(p));
            set(row, 'transform', `translateX(${mix(-14, 0, p)}px)`);
            const active = t >= at && t < at + TRIP_LEN;
            set(row.firstChild, 'background', active ? 'rgba(var(--accent-rgb),0.14)' : 'transparent');
            set(row.firstChild, 'borderColor', active ? 'rgba(var(--accent-rgb),0.5)' : 'transparent');
            set(size, 'opacity', String(ease(t, at + 8, 6)));
            // The result chip falls from the row into the gauge's growing end.
            const fall = (t - at - 8) / 10;
            const visible = CALLS[i].k > 0 && fall > 0 && fall < 1;
            attr(drops[i], 'visibility', visible ? 'visible' : 'hidden');
            if (visible) {
              const before = CALLS.slice(0, i).reduce((sum, call) => sum + call.k, 0) * PX_PER_K;
              const fromX = LEFT_X + PANEL_W - 110;
              const toX = LEFT_X + 34 + Math.min(BAR_W - 40, before);
              const q = easeIO(fall, 0, 1);
              attr(drops[i], 'x', mix(fromX, toX, q).toFixed(1));
              attr(drops[i], 'y', mix(ROW_Y + i * ROW_H + 10, BAR_Y + 8, q).toFixed(1));
            }
          });

          const send = easeIO(t, PROGRAM.send + 8, 20);
          set(programChip, 'opacity', String(ease(t, PROGRAM.send, 8) * (1 - ease(t, PROGRAM.send + 24, 6))));
          set(programChip, 'transform', `translate(${mix(0, -160, send)}px, ${mix(0, 150, send)}px) scale(${mix(1, 0.8, send)})`);
          const running = t >= PROGRAM.run - 4 && t < PROGRAM.back;
          k.tone(sandbox, running ? C.safe : C.line, running ? 0.3 : 0);
          set(sandbox, 'borderStyle', running ? 'solid' : 'dashed');
          rightRows.forEach(({ row, dot, at }) => {
            set(row, 'opacity', String(ease(t, at, 6)));
            set(dot, 'background', t >= at + 3 ? C.safe : C.line);
          });
          const back = (t - PROGRAM.back) / (PROGRAM.land - PROGRAM.back);
          const showBack = back > 0 && back < 1;
          attr(resultChip, 'visibility', showBack ? 'visible' : 'hidden');
          if (showBack) {
            const q = easeIO(back, 0, 1);
            attr(resultChip, 'x', mix(RIGHT_X + PANEL_W / 2, RIGHT_X + 34, q).toFixed(1));
            attr(resultChip, 'y', mix(ROW_Y + CALLS.length * ROW_H - 4, BAR_Y + 8, q).toFixed(1));
          }

          set(takeaways, 'opacity', String(1 - ease(t, STEPS[1], 18)));
        });
      },
    });
  }

  // ------------------------------------------------------------------------------- 22
  {
    // The same 40 signatures and row look as slide 11 (js/slides/p1-tools.js), so the wall reads as
    // "the window you already saw", now centred.
    const TOOLS = [
      'buscar_disponibilidad(fecha)', 'reservar_mesa(fecha, hora, …)',
      'cancelar_reserva(id)', 'cobrar_anticipo(monto, …)',
      'agendar_evento(fecha, titulo)', 'guardar_cliente(nombre, tel)',
      'listar_prospectos(desde)', 'listar_reservas(desde)',
      'listar_anuncios()', 'enviar_menu()',
      'enviar_correo(para, asunto)', 'modificar_reserva(id, hora)',
      'confirmar_reserva(id)', 'agregar_a_espera(fecha, tel)',
      'consultar_menu(categoria)', 'precio_platillo(platillo)',
      'enviar_ubicacion(sucursal)', 'consultar_horario(sucursal)',
      'reembolsar_pago(pagoId)', 'crear_link_pago(monto)',
      'estado_pago(pagoId)', 'buscar_cliente(tel)',
      'editar_cliente(id, datos)', 'etiquetar_cliente(id, tags)',
      'crear_nota(clienteId, texto)', 'mover_etapa(id, etapa)',
      'asignar_mesero(reservaId)', 'escalar_a_humano(motivo)',
      'enviar_promo(clienteId, id)', 'registrar_alergia(id, nota)',
      'menu_del_dia(fecha)', 'cotizar_evento(personas)',
      'reservar_salon(fecha, hora)', 'enviar_factura(pagoId, rfc)',
      'pedir_opinion(clienteId)', 'crear_cupon(pct, vence)',
      'programar_mensaje(tel, hora)', 'listar_eventos(desde)',
      'cancelar_evento(id)', 'resumir_conversacion(id)',
    ];
    const WIN = { x: 440, y: 214, w: 1040 };
    const PAD = 16;
    const COL_GAP = 12;
    const COL_W = (WIN.w - 2 * PAD - COL_GAP) / 2;
    const ROW_H = 28;
    const ROW_STEP = 30;
    WIN.h = 2 * PAD + (TOOLS.length / 2) * ROW_STEP - (ROW_STEP - ROW_H);
    const CENTER = [WIN.x + WIN.w / 2, WIN.y + WIN.h / 2];
    const BUILT = 66;
    const COLLAPSE = 74;
    const END = COLLAPSE + 120;

    Deck.add({
      id: '22',
      title: 'De muchas herramientas a una',
      // Arrival builds the wall; the click collapses it into run_code.
      steps: [BUILT, END],
      build(k) {
        k.header(null, 'De muchas herramientas a una', { text: true });

        const count = h('span', { class: 'mono', style: { color: C.ink, fontWeight: 700 } }, '40');
        const noun = h('span');
        k.reveal(k.div({ right: '96px', top: '86px', fontSize: '34px', color: C.muted, display: 'flex', gap: '12px', alignItems: 'baseline' }, count, noun), 10);

        const frame = k.div({ left: `${WIN.x}px`, top: `${WIN.y}px`, width: `${WIN.w}px`, height: `${WIN.h}px`, borderRadius: '18px', border: `2px solid ${C.lineHi}`, background: C.bgDeep });
        const rows = TOOLS.map((signature, i) => {
          const x = WIN.x + PAD + (i % 2) * (COL_W + COL_GAP);
          const y = WIN.y + PAD + Math.floor(i / 2) * ROW_STEP;
          const open = signature.indexOf('(');
          const el = k.div({ left: `${x}px`, top: `${y}px`, width: `${COL_W}px`, height: `${ROW_H}px` },
            h('div', { class: 'p3-tool mono' },
              h('span', { style: { color: C.ink } }, signature.slice(0, open)),
              h('span', { style: { color: C.muted } }, signature.slice(open))));
          // Every row lands on the centre at about the same moment: the wall implodes.
          return { el, dx: CENTER[0] - (x + COL_W / 2), dy: CENTER[1] - (y + ROW_H / 2), at: 4 + i * 1.2, leave: COLLAPSE + ((i * 7) % 5) };
        });

        const glow = k.div({ left: `${CENTER[0] - 440}px`, top: `${CENTER[1] - 170}px`, width: '880px', height: '340px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(var(--accent-rgb),0.34), rgba(var(--accent-rgb),0))', pointerEvents: 'none' });
        const card = k.div({ left: `${CENTER[0] - 410}px`, top: `${CENTER[1] - 92}px`, width: '820px', height: '184px' },
          h('div', { class: 'p3-runcode' },
            K.icon('code', 66, C.accent),
            h('span', { class: 'mono' }, h('span', { style: { color: C.code.fn } }, 'run_code'), h('span', { style: { color: C.code.punct } }, '('), h('span', { style: { color: C.code.prop } }, 'código'), h('span', { style: { color: C.code.punct } }, ')'))));
        const caption = k.div({ left: 0, right: 0, top: `${CENTER[1] + 190}px`, textAlign: 'center', fontSize: '48px', fontWeight: 700 });
        caption.innerHTML = `Una sola herramienta: <span style="color:${C.accent}">escribir y correr código</span>`;

        k.on((t) => {
          set(frame, 'opacity', String(ease(t, 2, 14) * (1 - ease(t, COLLAPSE + 6, 22))));
          for (const row of rows) {
            const p = ease(t, row.at, 10);
            const fly = easeIO(t, row.leave, 32);
            const fade = clamp01((fly - 0.6) / 0.4);
            set(row.el, 'opacity', String(p * (1 - fade)));
            set(row.el, 'transform', `translate(${(row.dx * fly).toFixed(1)}px, ${(mix(-14, 0, p) + row.dy * fly).toFixed(1)}px) scale(${mix(1, 0.12, fly).toFixed(3)})`);
          }
          const left = Math.round(mix(40, 1, easeIO(t, COLLAPSE + 2, 34)));
          text(count, String(left));
          text(noun, left === 1 ? 'herramienta' : 'herramientas');
          set(count, 'color', left === 1 ? C.accent : C.ink);

          const land = settle(t, COLLAPSE + 34, 24);
          set(card, 'opacity', String(land));
          set(card, 'transform', `scale(${mix(0.55, 1, land).toFixed(3)})`);
          // A flash as the last rows arrive, settling to a steady glow.
          const flash = ease(t, COLLAPSE + 30, 10) * (1 - 0.55 * ease(t, COLLAPSE + 44, 30));
          set(glow, 'opacity', String(flash));
          set(card.firstChild, 'boxShadow', `0 0 ${(70 * flash).toFixed(1)}px rgba(var(--accent-rgb),${(0.55 * flash).toFixed(3)})`);
          const cap = ease(t, COLLAPSE + 62, 18);
          set(caption, 'opacity', String(cap));
          set(caption, 'transform', `translateY(${mix(16, 0, cap)}px)`);
        });
      },
    });
  }

  // ------------------------------------------------------------------------------- 22b
  // Why the collapse matters: with tools, every capability is a dev's job; with code, the agent
  // writes the tool it needs, within what the API allows.
  {
    const PANEL = { y: 250, w: 840, h: 650 };
    const LEFT_X = 96;
    const RIGHT_X = 984;
    const BUILT = [
      { name: 'reservar_mesa', at: 30 },
      { name: 'cobrar_anticipo', at: 46 },
      { name: 'agendar_evento', at: 62 },
      { name: 'guardar_cliente', at: 78 },
    ];
    const NEXT = 96;
    const ARRIVE = NEXT + 30;
    const R = ARRIVE + 4;
    const END = R + 120;

    const panel = (k, x, tone, at) => {
      const el = k.div({ left: `${x}px`, top: `${PANEL.y}px`, width: `${PANEL.w}px`, height: `${PANEL.h}px`, borderRadius: '26px', border: `2px solid ${C.line}`, borderTop: `8px solid ${tone}`, background: C.panel });
      k.reveal(el, at, { len: 18, dy: 24 });
      return el;
    };
    const line = (k, x, y, at, content, style = {}) => k.reveal(k.div({ left: `${x}px`, top: `${y}px`, ...style }, ...content), at, { dy: 10 });

    Deck.add({
      id: '22b',
      title: 'Quién construye las herramientas?',
      // Arrival: the team builds tools one by one. Click: the agent builds its own.
      steps: [ARRIVE, END],
      build(k) {
        k.header(null, 'Quién construye las herramientas?', { text: true });

        // Left: tu equipo, one tool at a time.
        panel(k, LEFT_X, C.lineHi, 4);
        line(k, LEFT_X + 52, PANEL.y + 46, 8, [K.icon('user', 40, C.muted), h('span', null, 'Con herramientas')], { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '40px', fontWeight: 700 });
        line(k, LEFT_X + 52, PANEL.y + 116, 12, ['escribir → probar → revisar → desplegar'], { fontFamily: FONT.mono, fontSize: '26px', color: C.muted });
        BUILT.forEach((tool, i) => {
          const y = PANEL.y + 180 + i * 76;
          const card = k.div({ left: `${LEFT_X + 52}px`, top: `${y}px`, width: `${PANEL.w - 104}px`, height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', boxSizing: 'border-box', borderRadius: '12px', border: `2px solid ${C.line}`, background: C.bgDeep, fontFamily: FONT.mono, fontSize: '30px' },
            h('span', null, tool.name), h('span', { style: { color: C.safe, fontFamily: FONT.sans, fontSize: '26px', fontWeight: 700 } }, '✓ lista'));
          k.reveal(card, tool.at, { len: 14, dy: 16 });
        });
        const next = k.div({ left: `${LEFT_X + 52}px`, top: `${PANEL.y + 180 + 4 * 76}px`, width: `${PANEL.w - 104}px`, height: '60px', display: 'flex', alignItems: 'center', padding: '0 24px', boxSizing: 'border-box', borderRadius: '12px', border: `2px dashed ${C.lineHi}`, color: C.muted, fontSize: '28px' }, '+ capacidad nueva → otra herramienta');
        k.reveal(next, NEXT, { len: 14, dy: 16 });
        line(k, LEFT_X + 52, PANEL.y + PANEL.h - 70, NEXT + 8, ['Tu equipo construye cada una.'], { fontSize: '32px', fontWeight: 700 });

        // Right: the agent writes the tool it needs, for a question nobody built a tool for.
        panel(k, RIGHT_X, C.accent, R);
        line(k, RIGHT_X + 52, PANEL.y + 46, R + 4, [K.icon('code', 40, C.accent), h('span', null, 'Con código')], { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '40px', fontWeight: 700 });
        const ask = k.div({ left: `${RIGHT_X + 52}px`, top: `${PANEL.y + 120}px`, maxWidth: `${PANEL.w - 104}px`, padding: '14px 22px', borderRadius: '16px', background: C.chatOut, fontSize: '30px' }, 'Cuántos cumpleaños hubo en octubre?');
        k.reveal(ask, R + 10, { len: 14, dy: 12 });
        const code = k.div({ left: `${RIGHT_X + 52}px`, top: `${PANEL.y + 196}px`, width: `${PANEL.w - 104}px`, padding: '18px 26px', boxSizing: 'border-box', borderRadius: '14px', border: `2px solid ${C.line}`, background: C.bgDeep, fontFamily: FONT.mono, fontSize: '26px', lineHeight: 1.6, whiteSpace: 'pre' });
        code.innerHTML = `<span style="color:${C.code.keyword}">const</span> r = <span style="color:${C.code.keyword}">await</span> sdk.reservas\n  .<span style="color:${C.code.fn}">listar</span>({ mes: <span style="color:${C.code.string}">'octubre'</span> })\n<span style="color:${C.code.keyword}">return</span> r.<span style="color:${C.code.fn}">filter</span>(x =>\n  x.motivo === <span style="color:${C.code.string}">'cumpleaños'</span>).length`;
        k.reveal(code, R + 30, { len: 16, dy: 12 });
        line(k, RIGHT_X + 52, PANEL.y + 416, R + 56, [h('span', { style: { color: C.muted } }, '→ '), h('span', { style: { fontFamily: FONT.mono, fontWeight: 700, color: C.safe } }, '37 cumpleaños')], { fontSize: '34px' });
        line(k, RIGHT_X + 52, PANEL.y + 482, R + 70, ['Sin herramienta nueva, sin código de tu equipo.'], { fontSize: '28px', color: C.muted });
        line(k, RIGHT_X + 52, PANEL.y + PANEL.h - 70, R + 84, [h('span', null, 'El agente construye la suya.')], { fontSize: '32px', fontWeight: 700, color: C.accent });
        line(k, 0, PANEL.y + PANEL.h + 30, R + 96, ['Mientras tu API lo permita.'], { right: 0, textAlign: 'center', fontSize: '30px', color: C.muted });
      },
    });
  }

  // ------------------------------------------------------------------------------- 23
  {
    const QUESTION = 'Qué anuncio me trae más prospectos que sí reservan?';
    const PROGRAM = `const desde = '2026-08-01'
const anuncios = await sdk.anuncios.listar()
const prospectos = await sdk.prospectos.listar({ desde })
const reservas = await sdk.reservas.listar({ desde })
const reservaron = new Set(reservas.map((r) => r.clienteId))
const tasas = anuncios.map((a) => {
  const suyos = prospectos.filter((p) => p.anuncioId === a.id)
  const si = suyos.filter((p) => reservaron.has(p.id)).length
  return { anuncio: a.nombre, tasa: si / suyos.length }
})
return tasas.sort((a, b) => b.tasa - a.tasa).slice(0, 3)`;

    const TYPE_START = 24;
    const CHARS_PER_FRAME = 4.2;
    const TYPE_END = TYPE_START + Math.ceil(PROGRAM.length / CHARS_PER_FRAME);
    // The flow boxes only start revealing after step 1 ends, so step 1 holds on the finished program alone.
    const RUN = { fetch: TYPE_END + 30, aggregate: TYPE_END + 90, ret: TYPE_END + 132, rows: TYPE_END + 146 };
    // Arrival: the owner's question and the empty run_code panel. Click 1 types, click 2 runs.
    const STEPS = [TYPE_START, TYPE_END + 8, RUN.rows + 90];

    const RESULTS = [
      { ad: 'Promo sábado', rate: 0.41 },
      { ad: 'Cumpleaños', rate: 0.33 },
      { ad: 'Brunch', rate: 0.27 },
    ];
    // Illustrative: ≈12 anuncios + ≈3,000 prospectos + ≈2,000 reservas.
    const ROWS_IN = 5012;
    const FETCHES = [
      { line: 1, call: 'sdk.anuncios.listar' },
      { line: 2, call: 'sdk.prospectos.listar' },
      { line: 3, call: 'sdk.reservas.listar' },
    ];

    const COL = { x: 1290, w: 534 };
    const MID = COL.x + COL.w / 2;
    const API_Y = 196;
    const SANDBOX_Y = 420;
    const TABLE_Y = 690;

    Deck.add({
      id: '23',
      title: 'Una herramienta + un SDK',
      steps: STEPS,
      build(k) {
        k.header(null, 'Una herramienta + un SDK');

        const bubble = k.div({ left: '96px', top: '190px' },
          h('div', { class: 'p3-ask' },
            h('div', { style: { fontSize: `${SIZE.tiny}px`, fontWeight: 700, color: C.accent, marginBottom: '4px' } }, 'el dueño'),
            h('div', null, QUESTION)));
        k.reveal(bubble, 2, { dy: 12 });

        const code = k.code(PROGRAM, { fontSize: 26, lineHeight: 1.5, caret: true });
        const status = h('span', { style: { marginLeft: 'auto', fontSize: `${SIZE.tiny}px`, fontWeight: 600 } });
        const codeFrame = h('div', { style: { borderRadius: '20px', background: C.panel, border: '2px solid', overflow: 'hidden' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 26px', borderBottom: `2px solid ${C.line}`, background: C.panelHi } },
            k.icon('code', 30, C.accent),
            h('span', { style: { fontFamily: FONT.mono, fontSize: `${SIZE.tiny}px`, fontWeight: 700 } }, 'run_code'),
            h('span', { style: { fontSize: `${SIZE.tiny}px`, color: C.muted } }, '· una sola herramienta'),
            status),
          h('div', { style: { padding: '18px 30px' } }, code.el));
        k.reveal(k.div({ left: '96px', top: '326px', width: '1130px' }, codeFrame), 8);

        const apiCall = h('span', { style: { fontFamily: FONT.mono, fontSize: `${SIZE.tiny}px`, color: C.muted } }, 'sdk.*');
        const apiBox = k.box({ x: COL.x, y: API_Y, w: COL.w, h: 92 },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
            k.icon('server', 36, C.muted),
            h('span', { style: { fontSize: `${SIZE.label}px`, fontWeight: 600 } }, 'tu API'),
            apiCall));
        k.reveal(apiBox, RUN.fetch - 14);

        const svg = k.svg();
        const fetchArrow = k.arrow(svg, { from: [MID, API_Y + 96], to: [MID, SANDBOX_Y - 6] });
        const returnArrow = k.arrow(svg, { from: [MID, SANDBOX_Y + 196], to: [MID, TABLE_Y - 6] });
        const packets = Array.from({ length: 30 }, (_, index) => {
          const lane = ((index * 37) % 9) - 4;
          const rect = s('rect', { x: MID - 29 + lane * 18, width: 18, height: 8, rx: 2, fill: C.accent, opacity: 0.85 });
          svg.appendChild(rect);
          return rect;
        });

        const rowsIn = h('span');
        k.reveal(k.div({ left: `${MID + 70}px`, top: `${API_Y + 132}px`, fontFamily: FONT.mono, fontSize: '28px', color: C.accent }, rowsIn, ' filas'), RUN.fetch);

        const sandboxStatus = h('span', { style: { marginLeft: 'auto', fontSize: `${SIZE.tiny}px`, color: C.muted } });
        const bars = RESULTS.map((_, index) => h('div', { style: { height: '16px', borderRadius: '8px', background: index === 0 ? C.safe : 'rgba(74,224,130,0.45)' } }));
        const sandbox = k.box({ x: COL.x, y: SANDBOX_Y, w: COL.w, h: 192, style: { justifyContent: 'flex-start', padding: '18px 26px', alignItems: 'stretch' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
            k.icon('lock', 30, C.safe),
            h('span', { style: { fontSize: `${SIZE.label}px`, fontWeight: 700 } }, 'sandbox'),
            sandboxStatus),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '24px' } }, bars));
        k.reveal(sandbox, RUN.fetch - 10);

        k.reveal(k.div({ left: `${MID + 70}px`, top: `${SANDBOX_Y + 218}px`, fontFamily: FONT.mono, fontSize: '28px', color: C.safe }, '3 filas'), RUN.ret + 4);

        const tableRows = RESULTS.map((result, index) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 22px', fontSize: '30px', borderTop: index ? `1px solid ${C.line}` : 'none' } },
          h('span', null, result.ad),
          h('span', { style: { fontFamily: FONT.mono, color: index === 0 ? C.safe : C.muted, fontWeight: index === 0 ? 700 : 400 } }, `${Math.round(result.rate * 100)}%`)));
        k.reveal(k.div({ left: `${COL.x}px`, top: `${TABLE_Y}px`, width: `${COL.w}px` },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' } },
            k.icon('cpu', 30, C.accent),
            h('span', { style: { fontSize: `${SIZE.label}px`, fontWeight: 700 } }, 'al modelo')),
          h('div', { style: { borderRadius: '14px', border: `2px solid ${C.safe}`, overflow: 'hidden', background: C.bgDeep } }, tableRows)), RUN.ret + 8);

        const takeaway = k.div({ left: '96px', top: '906px', fontSize: '46px', fontWeight: 700 });
        takeaway.innerHTML = `Entran <span style="color:${C.accent}">miles de filas</span>. Salen <span style="color:${C.safe}">tres</span>.`;
        k.reveal(takeaway, RUN.rows + 30);
        const sdkLine = k.div({ left: `${COL.x}px`, top: '938px', fontSize: '30px', color: C.muted });
        sdkLine.innerHTML = `<span class="mono" style="color:${C.ink}">sdk</span>: tu API, tipada, para el agente`;
        k.reveal(sdkLine, RUN.rows + 42);

        k.on((t) => {
          const running = t >= RUN.fetch && t < RUN.rows;
          const fetchIndex = Math.min(2, Math.max(0, Math.floor((t - RUN.fetch) / 20)));
          const highlight = t < RUN.fetch ? -1 : t < RUN.aggregate ? FETCHES[fetchIndex].line : t < RUN.ret ? 4 + (Math.floor((t - RUN.aggregate) / 6) % 6) : t < RUN.rows + 20 ? 10 : -1;
          const aggregate = ease(t, RUN.aggregate, 36);

          set(codeFrame, 'borderColor', running ? C.accent : C.line);
          set(status, 'color', running ? C.accent : C.dim);
          text(status, t >= RUN.rows ? 'terminó' : running ? 'corriendo…' : t <= TYPE_START ? '' : t < TYPE_END ? 'escribiendo…' : 'listo para correr');
          code.setChars(t < TYPE_END + 4 ? Math.max(0, t - TYPE_START) * CHARS_PER_FRAME : Infinity);
          code.highlight(highlight);

          const fetching = t >= RUN.fetch && t < RUN.aggregate;
          k.tone(apiBox, fetching ? C.accent : C.lineHi);
          text(apiCall, t < RUN.fetch ? 'sdk.*' : t < RUN.aggregate ? FETCHES[fetchIndex].call : 'sdk.*');
          set(apiCall, 'color', fetching ? C.accent : C.muted);
          k.tone(sandbox, running ? C.safe : C.lineHi, running ? 0.35 : 0);
          text(sandboxStatus, t >= RUN.aggregate ? 'cruza · cuenta · ordena' : 'recibe los datos');
          bars.forEach((bar, index) => set(bar, 'width', `${mix(0, RESULTS[index].rate / 0.41, ease(aggregate, index * 0.1, 0.5)) * 100}%`));
          tableRows.forEach((row, index) => set(row, 'opacity', String(ease(t, RUN.rows + index * 5, 10))));

          fetchArrow.set(ease(t, RUN.fetch - 8, 12), C.lineHi);
          returnArrow.set(ease(t, RUN.ret, 12), C.safe);
          packets.forEach((rect, index) => {
            const phase = (t - RUN.fetch - 4 - index * 1.8) / 14;
            const visible = phase > 0 && phase < 1;
            attr(rect, 'visibility', visible ? 'visible' : 'hidden');
            if (visible) attr(rect, 'y', mix(API_Y + 100, SANDBOX_Y - 16, phase).toFixed(2));
          });
          text(rowsIn, fmtInt(Math.round(ease(t, RUN.fetch + 4, 56) * ROWS_IN)));
        });
      },
    });
  }

  // ------------------------------------------------------------------------------- 24
  Deck.add({
    id: '24',
    title: 'Recap: código',
    // One line per beat: arrival lands the first, each click adds one.
    steps: [30, 56, 82],
    build(k) {
      k.header(null, 'En resumen', { text: true });
      [
        { icon: 'code', html: 'Los modelos escriben muy buen código', at: 8 },
        { icon: 'server', html: 'Los resultados de las herramientas saturan el contexto', at: 34 },
        { icon: 'check', html: `El código es la herramienta perfecta:<br><span style="color:${C.accent}">determinista y se compone</span>`, at: 60 },
      ].forEach((line, i) => {
        const tile = h('div', { class: 'p3-recap-tile' }, K.icon(line.icon, 50, C.accent));
        const row = k.div({ left: '96px', top: `${270 + i * 190}px`, width: '1728px', display: 'flex', alignItems: 'center', gap: '44px' },
          tile, h('div', { class: 'p3-recap-line', html: line.html }));
        k.on((t) => {
          const p = settle(t, line.at, 22);
          set(row, 'opacity', String(p));
          set(row, 'transform', `translateX(${mix(-24, 0, p)}px)`);
          const flash = ease(t, line.at + 8, 8) * (1 - ease(t, line.at + 18, 18));
          set(tile, 'borderColor', flash > 0.02 ? lerpColor('#2A2A2A', C.accent, flash) : C.line);
          set(tile, 'boxShadow', `0 0 ${(30 * flash).toFixed(1)}px rgba(var(--accent-rgb),${(0.45 * flash).toFixed(3)})`);
        });
      });
    },
  });
})();
