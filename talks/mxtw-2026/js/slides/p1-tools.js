// Part B · slides 8–14 (Herramientas). See RESTRUCTURE_PLAN_2026-10-28.md.
// Ports s06.js (8), act1.js slides 7–8 (9, 10), s10.js (11) and s11.js (12). Helpers are local on purpose:
// the old files that defined ChatKit / TextKit / S10ToolSchemas are no longer loaded.
(function () {
  'use strict';
  const { C, SIZE, FONT, ease, easeIO, settle, mix, lerpColor, set, text, attr, h, s, bezierPoint } = K;
  const px = (value) => `${value}px`;
  const busy = (t, start, length) => ease(t, start, 6) * (1 - ease(t, start + length, 10));
  const between = (t, from, to) => ease(t, from, 10) * (1 - ease(t, to, 10));

  const logo = (name, size, style = {}) => h('img', { src: `assets/logos/${name}.svg`, alt: '', class: 'p1-logo', style: { width: px(size), height: px(size), ...style } });

  // Typing dots derive from t, so any frame renders the same way.
  const typingDots = (k, el) => {
    const dots = [...el.querySelectorAll('i')];
    k.on((t) => dots.forEach((dot, i) => {
      const wave = Math.max(0, Math.sin(t * 0.32 - i * 0.9));
      set(dot, 'opacity', String(0.35 + 0.65 * wave));
      set(dot, 'transform', `translateY(${(-5 * wave).toFixed(2)}px)`);
    }));
  };
  const Chat = {
    head(name, status, initial) {
      return h('div', { class: 'chat-head' },
        h('div', { class: 'avatar' }, initial),
        h('div', null, h('div', { class: 'chat-name' }, name), h('div', { class: 'chat-status', style: { fontSize: '26px' } }, status)));
    },
    bubble(k, parent, side, html, at, { size } = {}) {
      const el = h('div', { class: `p1-bubble ${side}`, html });
      if (size) el.style.fontSize = px(size);
      parent.appendChild(el);
      k.on((t) => {
        const p = settle(t, at, 16);
        set(el, 'display', t >= at ? '' : 'none');
        set(el, 'opacity', String(p));
        set(el, 'transform', `translateY(${mix(14, 0, p)}px) scale(${mix(0.97, 1, p)})`);
        set(el, 'transformOrigin', side === 'in' ? 'left bottom' : 'right bottom');
      });
      return el;
    },
    typing(k, parent, side, from, to) {
      const el = h('div', { class: `typing ${side === 'out' ? 'out' : ''}` }, h('i'), h('i'), h('i'));
      parent.appendChild(el);
      typingDots(k, el);
      k.on((t) => {
        set(el, 'display', t >= from && t < to ? '' : 'none');
        set(el, 'opacity', String(ease(t, from, 8)));
      });
      return el;
    },
  };

  // A glowing dot that rides an arrow during [start, start + travel].
  const packet = (k, svg, arc, start, travel, tone = C.accent) => {
    const dot = s('circle', { r: 11, fill: tone, style: `filter: drop-shadow(0 0 12px ${tone})` });
    svg.appendChild(dot);
    const control = arc.control || [(arc.from[0] + arc.to[0]) / 2, (arc.from[1] + arc.to[1]) / 2];
    k.on((t) => {
      const p = ease(t, start, travel);
      const visible = p > 0 && p < 1;
      attr(dot, 'visibility', visible ? 'visible' : 'hidden');
      if (!visible) return;
      const [cx, cy] = bezierPoint(arc.from, control, arc.to, p);
      attr(dot, 'cx', cx.toFixed(2));
      attr(dot, 'cy', cy.toFixed(2));
    });
  };

  // Words rise one by one; `accent` words take the orange (from act1.js).
  const statement = (k, lines, { top, size, at = 4, stagger = 3, accent = [], lineHeight = 1.08 }) => {
    const wrap = k.div({ left: 0, right: 0, top: px(top), textAlign: 'center', fontSize: px(size), fontWeight: 800, letterSpacing: '-0.014em', lineHeight });
    let i = 0;
    for (const line of lines) {
      const row = h('div');
      line.split(' ').forEach((word, index) => {
        const clean = word.replace(/[.,]$/, '');
        const tone = accent.includes(clean) ? C.accent : C.ink;
        const span = h('span', { style: { display: 'inline-block', color: tone } }, clean, word.slice(clean.length) ? h('span', { style: { color: C.ink } }, word.slice(clean.length)) : null);
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

  // ============================================================================ 8 · tool call, explained
  // Part 1: a question → buscar_disponibilidad → OpenTable → text → reply.
  // Part 2: a request with missing arguments → Chema asks → the slots fill → reservar_mesa → confirmed.
  {
    const CHAT = { x: 96, y: 196, w: 680, h: 768 };
    const AG = { x: 880, y: 586, w: 272, h: 148 };
    const OT = { x: 1456, y: 586, w: 270, h: 148 };
    const MID = (AG.x + AG.w + OT.x) / 2;
    const LANE = { x: MID - 390, w: 780, callBottom: 562, resultTop: 762 };
    const Y_CALL = 636;
    const Y_RES = 684;
    const IN = { from: [CHAT.x + CHAT.w + 10, Y_CALL], to: [AG.x - 10, Y_CALL] };
    const OUT = { from: [AG.x - 10, Y_RES], to: [CHAT.x + CHAT.w + 10, Y_RES] };
    const CALL = { from: [AG.x + AG.w + 10, Y_CALL], to: [OT.x - 10, Y_CALL] };
    const RESULT = { from: [OT.x - 10, Y_RES], to: [AG.x + AG.w + 10, Y_RES] };
    const HOP = 16; // chat ↔ agente
    const TRAVEL = 22; // agente ↔ OpenTable

    const T = {
      msg1: 20, card1: 54, fill1: 74, S0: 100,
      call1: 106, run1: 128, res1: 156, read1: 180, type1: 182, out1: 204, reply1: 218, S1: 248,
      clear: 252, msg2: 262, card2: 292, fillF: 310, type2: 330, out2: 350, reply2: 364, S2: 396,
      msg3: 400, fillP: 426, fillH: 446, ready: 466, S3: 490,
      call2: 494, run2: 516, res2: 544, read2: 568, type3: 570, out3: 590, reply3: 604, S4: 640,
    };

    // A function call drawn as fill-in-the-blanks: each argument has a slot that fills at `fillAt`.
    const callCard = (k, name, args) => {
      const keyWidth = Math.max(...args.map((arg) => arg.key.length)) + 1;
      const slots = [];
      const lines = [h('div', null, h('span', { class: 'fn' }, name), h('span', { class: 'pn' }, '('))];
      args.forEach((arg, i) => {
        const value = h('span', { style: { color: arg.num ? C.code.number : C.code.string } }, arg.num ? arg.value : `"${arg.value}"`);
        const mark = h('span', { class: 'q' }, '?');
        const chars = (arg.num ? arg.value.length : arg.value.length + 2);
        const slot = h('span', { class: 'p1-slot', style: { width: `calc(${Math.max(chars, 2) + 1.6}ch + 4px)` } }, mark, value);
        const check = h('span', { style: { color: C.safe, fontFamily: FONT.sans, fontWeight: 700, marginLeft: '14px', fontSize: '28px' } }, '✓');
        lines.push(h('div', { class: 'arg' },
          h('span', { class: 'key', style: { width: `${keyWidth}ch` } }, arg.key, h('span', { class: 'pn' }, ':')),
          h('span', { style: { width: '1ch' } }),
          slot, h('span', { class: 'pn' }, i < args.length - 1 ? ',' : ''), check));
        slots.push({ ...arg, slot, mark, value, check });
      });
      lines.push(h('div', { class: 'pn' }, ')'));
      const card = h('div', { class: 'p1-card' }, ...lines);
      return { card, slots };
    };
    const resultCard = (source, tone) => {
      const card = h('div', { class: 'p1-card', style: { borderColor: tone || C.lineHi } });
      for (const line of source.split('\n')) {
        const row = h('div');
        for (const token of K.tokenize(line)) row.appendChild(h('span', { style: { color: token.tone } }, token.text));
        card.appendChild(row);
      }
      return card;
    };
    // Label above or below a card, with up to two texts that crossfade.
    const label = (first, second) => {
      const a = h('span', { html: first });
      const b = h('span', { html: second || '' });
      return { el: h('div', { class: 'p1-label' }, a, b), a, b };
    };

    Deck.add({
      id: '8',
      title: 'Cómo usa Chema una herramienta?',
      steps: [T.S0, T.S1, T.S2, T.S3, T.S4],
      build(k) {
        k.header(null, 'Cómo usa Chema una herramienta?', { text: true });

        // --- chat ---------------------------------------------------------------------------------
        const body = h('div', { class: 'p1-chat-body' });
        const chat = k.div({ left: px(CHAT.x), top: px(CHAT.y), width: px(CHAT.w), height: px(CHAT.h) });
        chat.className = 'p1-chat';
        chat.append(Chat.head('Chema', 'en línea', 'C'), body);
        k.reveal(chat, 4, { dy: 20 });
        Chat.bubble(k, body, 'in', 'Hola, tienen lugar el sábado?', T.msg1);
        Chat.typing(k, body, 'out', T.type1, T.reply1);
        Chat.bubble(k, body, 'out', 'Sí! Tengo a las 8 o a las 9:30.', T.reply1);
        Chat.bubble(k, body, 'in', 'Me puedes reservar una mesa?', T.msg2);
        Chat.typing(k, body, 'out', T.type2, T.reply2);
        Chat.bubble(k, body, 'out', 'Claro! Para cuántos y a qué hora?', T.reply2);
        const answer = Chat.bubble(k, body, 'in', 'Somos <span class="p1-hl">4</span>, a las <span class="p1-hl">8</span>', T.msg3);
        const [hlPeople, hlHour] = answer.querySelectorAll('.p1-hl');
        Chat.typing(k, body, 'out', T.type3, T.reply3);
        Chat.bubble(k, body, 'out', 'Listo, mesa para 4 el sábado a las 8 ✓', T.reply3);

        // --- diagram -----------------------------------------------------------------------------
        const svg = k.svg();
        const inArrow = k.arrow(svg, { ...IN, head: 16 });
        const outArrow = k.arrow(svg, { ...OUT, head: 16 });
        const callArrow = k.arrow(svg, CALL);
        const resultArrow = k.arrow(svg, RESULT);
        // Dashed pins tie each card to the arrow it travels on.
        const pin = (y1, y2) => {
          const line = s('line', { x1: MID, y1, x2: MID, y2, stroke: C.lineHi, 'stroke-width': 2, 'stroke-dasharray': '6 8' });
          svg.appendChild(line);
          return line;
        };
        const callPin = pin(LANE.callBottom, Y_CALL - 8);
        const resultPin = pin(Y_RES + 8, LANE.resultTop);

        [T.msg1, T.msg2, T.msg3].forEach((at) => packet(k, svg, IN, at + 4, HOP));
        [T.out1, T.out2, T.out3].forEach((at) => packet(k, svg, OUT, at, HOP, C.safe));
        [T.call1, T.call2].forEach((at) => packet(k, svg, CALL, at, TRAVEL));
        [T.res1, T.res2].forEach((at) => packet(k, svg, RESULT, at, TRAVEL));

        const status = h('div', { style: { fontSize: px(SIZE.tiny), color: C.muted, whiteSpace: 'nowrap' } });
        const agent = k.div({ left: px(AG.x), top: px(AG.y), width: px(AG.w), height: px(AG.h) },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
            h('div', { class: 'p1-avatar', style: { width: '54px', height: '54px', fontSize: '28px' } }, 'C'),
            h('div', { style: { fontSize: px(SIZE.label), fontWeight: 700 } }, 'agente')),
          status);
        agent.className = 'p1-node';
        k.reveal(agent, 8);

        const runFill = h('div', { style: { height: '100%', width: '0%', background: C.accent } });
        const api = k.div({ left: px(OT.x), top: px(OT.y), width: px(OT.w), height: px(OT.h) },
          logo('opentable', 56),
          h('div', { style: { fontSize: '30px', fontWeight: 700, whiteSpace: 'nowrap' } }, 'OpenTable API'),
          h('div', { style: { width: '170px', height: '6px', borderRadius: '3px', background: C.line, overflow: 'hidden' } }, runFill));
        api.className = 'p1-node';
        k.reveal(api, 12);

        // --- call lane (above the arrows) ----------------------------------------------------------
        const callLane = (contents, labelEl) => k.div({ left: px(LANE.x), width: px(LANE.w), bottom: px(1080 - LANE.callBottom), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }, labelEl, contents);
        const resultLane = (contents, labelEl) => k.div({ left: px(LANE.x), width: px(LANE.w), top: px(LANE.resultTop), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }, labelEl, contents);

        const call1 = callCard(k, 'buscar_disponibilidad', [{ key: 'fecha', value: 'sábado', fillAt: T.fill1 }]);
        const call1Label = label('1 · llamada a herramienta');
        const call1Lane = callLane(call1.card, call1Label.el);

        const call2 = callCard(k, 'reservar_mesa', [
          { key: 'fecha', value: 'sábado', fillAt: T.fillF },
          { key: 'personas', value: '4', num: true, fillAt: T.fillP, hl: hlPeople },
          { key: 'hora', value: '20:00', fillAt: T.fillH, hl: hlHour },
        ]);
        const call2Label = label(`<span style="color:${C.accent}">faltan 2 datos</span>`, '1 · llamada a herramienta');
        const call2Lane = callLane(call2.card, call2Label.el);

        const result1Label = label('2 · resultado (texto)');
        const result1 = resultCard('{ "20:00": "2 mesas",\n  "21:30": "4 mesas" }');
        const result1Lane = resultLane(result1, result1Label.el);
        const result2Label = label('2 · resultado (texto)');
        const result2 = resultCard('{ "confirmada": true }', 'rgba(74,224,130,0.6)');
        const result2Lane = resultLane(result2, result2Label.el);

        k.contextBar({
          x: 1782, y: 236, w: 52, h: 720, appearAt: 16, labels: false, title: 'contexto',
          segments: [
            { height: 96, at: 22, tone: 'rgba(var(--accent-rgb),0.75)' },
            { height: 26, at: T.msg1 + 4 + HOP, tone: '#3D3D3D' },
            { height: 40, at: T.call1 + TRAVEL, tone: '#555555' },
            { height: 62, at: T.res1 + TRAVEL, tone: '#808080' },
            { height: 26, at: T.reply1, tone: '#2E8A52' },
            { height: 26, at: T.msg2 + 4 + HOP, tone: '#3D3D3D' },
            { height: 26, at: T.reply2, tone: '#2E8A52' },
            { height: 26, at: T.msg3 + 4 + HOP, tone: '#3D3D3D' },
            { height: 52, at: T.call2 + TRAVEL, tone: '#555555' },
            { height: 34, at: T.res2 + TRAVEL, tone: '#808080' },
            { height: 26, at: T.reply3, tone: '#2E8A52' },
          ],
        });

        const STATUS = [
          [T.msg1 + 4 + HOP, 'lee el mensaje'], [T.card1, 'elige herramienta'], [T.call1, 'espera…'], [T.res1 + TRAVEL, 'lee el resultado'], [T.out1, 'contesta'],
          [T.msg2 + 4 + HOP, 'lee el mensaje'], [T.fillF + 10, 'faltan 2 datos'], [T.out2, 'pregunta'],
          [T.msg3 + 4 + HOP, 'llena los datos'], [T.call2, 'espera…'], [T.res2 + TRAVEL, 'lee el resultado'], [T.out3, 'contesta'],
        ];

        const fillSlot = (t, slot, active) => {
          const p = settle(t, slot.fillAt, 16);
          const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.12));
          set(slot.mark, 'opacity', String((1 - p) * (active ? pulse : 1)));
          set(slot.value, 'opacity', String(p));
          set(slot.value, 'transform', `scale(${mix(1.5, 1, p).toFixed(3)})`);
          set(slot.slot, 'borderStyle', p > 0.5 ? 'solid' : 'dashed');
          set(slot.slot, 'borderColor', p > 0 ? lerpColor(C.accent, '#4AE082', p) : C.accent);
          set(slot.slot, 'background', `rgba(74,224,130,${(0.14 * p).toFixed(3)})`);
          set(slot.slot, 'boxShadow', p > 0 && p < 1 ? `0 0 ${(30 * (1 - p)).toFixed(1)}px rgba(74,224,130,0.7)` : 'none');
          set(slot.check, 'opacity', String(ease(t, slot.fillAt + 8, 10)));
          if (slot.hl) {
            const glow = ease(t, slot.fillAt - 8, 8);
            set(slot.hl, 'background', `rgba(var(--accent-rgb),${(0.35 * glow).toFixed(3)})`);
            set(slot.hl, 'color', glow > 0.5 ? '#FFFFFF' : '');
            set(slot.hl, 'fontWeight', glow > 0.5 ? '700' : '');
          }
        };
        const showLane = (t, lane, from, to) => {
          const p = settle(t, from, 18) * (1 - ease(t, to, 12));
          set(lane, 'opacity', String(p));
          set(lane, 'transform', `translateY(${mix(14, 0, settle(t, from, 18)).toFixed(1)}px)`);
          return p;
        };

        k.on((t) => {
          // Lanes.
          const c1 = showLane(t, call1Lane, T.card1, T.clear);
          const c2 = showLane(t, call2Lane, T.card2, 1e9);
          const r1 = showLane(t, result1Lane, T.res1 + 4, T.clear);
          const r2 = showLane(t, result2Lane, T.res2 + 4, 1e9);
          attr(callPin, 'opacity', String(Math.max(c1, c2)));
          attr(resultPin, 'opacity', String(Math.max(r1, r2)));
          call1.slots.forEach((slot) => fillSlot(t, slot, false));
          call2.slots.forEach((slot) => fillSlot(t, slot, t >= T.card2 && t < slot.fillAt));
          const ready = ease(t, T.ready, 12);
          set(call2Label.a, 'opacity', String(ease(t, T.fillF + 8, 10) * (1 - ready)));
          set(call2Label.b, 'opacity', String(ready));

          // The call card lights up while it travels; the result card lights up when it lands.
          const flight1 = busy(t, T.call1 - 4, TRAVEL + 30);
          const flight2 = busy(t, T.call2 - 4, TRAVEL + 30);
          k.tone(call1.card, flight1 > 0.2 ? C.accent : C.lineHi, flight1 * 0.5);
          k.tone(call2.card, flight2 > 0.2 || (ready > 0.5 && t < T.call2) ? C.accent : C.lineHi, flight2 * 0.5);
          const land1 = busy(t, T.res1, 30);
          k.tone(result1, land1 > 0.2 ? C.ink : C.lineHi, land1 * 0.25);
          const land2 = busy(t, T.res2, 30);
          k.tone(result2, land2 > 0.2 ? C.safe : 'rgba(74,224,130,0.6)', land2 * 0.5);

          // Arrows draw on first use and stay; they light up while a packet rides them.
          const tone = (on, color = C.accent) => (on > 0.3 ? color : C.lineHi);
          const hopIn = Math.max(busy(t, T.msg1 + 4, HOP), busy(t, T.msg2 + 4, HOP), busy(t, T.msg3 + 4, HOP));
          const hopOut = Math.max(busy(t, T.out1, HOP), busy(t, T.out2, HOP), busy(t, T.out3, HOP));
          inArrow.set(ease(t, T.msg1 + 4, HOP), tone(hopIn));
          outArrow.set(ease(t, T.out1, HOP), tone(hopOut, C.safe));
          callArrow.set(ease(t, T.call1, TRAVEL), tone(Math.max(busy(t, T.call1, TRAVEL), busy(t, T.call2, TRAVEL))));
          resultArrow.set(ease(t, T.res1, TRAVEL), tone(Math.max(busy(t, T.res1, TRAVEL), busy(t, T.res2, TRAVEL))));

          // Nodes.
          const think = Math.max(
            busy(t, T.msg1 + 4 + HOP, T.call1 - T.msg1 - HOP), busy(t, T.res1 + TRAVEL, T.out1 - T.res1 - TRAVEL),
            busy(t, T.msg2 + 4 + HOP, T.out2 - T.msg2 - HOP), busy(t, T.msg3 + 4 + HOP, T.call2 - T.msg3 - HOP),
            busy(t, T.res2 + TRAVEL, T.out3 - T.res2 - TRAVEL));
          k.tone(agent, think > 0.2 ? C.accent : C.lineHi, think * 0.45);
          const run = Math.max(busy(t, T.call1 + TRAVEL - 2, T.res1 - T.call1 - TRAVEL + 6), busy(t, T.call2 + TRAVEL - 2, T.res2 - T.call2 - TRAVEL + 6));
          k.tone(api, run > 0.2 ? C.accent : C.lineHi, run * 0.5);
          const runProgress = t < T.S1 ? ease(t, T.run1, 24) : ease(t, T.run2, 24);
          set(runFill, 'width', `${(100 * runProgress).toFixed(1)}%`);
          set(runFill, 'opacity', String(run));

          let current = '';
          for (const [at, copy] of STATUS) if (t >= at) current = copy;
          text(status, current || 'espera un mensaje');
          set(status, 'color', current === 'faltan 2 datos' ? C.accent : C.muted);
        });
      },
    });
  }

  // ============================================================================ 9 · herramientas
  {
    const TOOLS = [
      { logo: 'opentable', brand: 'OpenTable', tool: 'reservar_mesa' },
      { logo: 'stripe', brand: 'Stripe', tool: 'cobrar_anticipo' },
      { logo: 'googlecalendar', brand: 'Google Calendar', tool: 'agendar_evento' },
      { logo: 'salesforce', brand: 'Salesforce', tool: 'guardar_cliente' },
      { logo: 'gmail', brand: 'Gmail', tool: 'enviar_correo' },
      { logo: 'whatsapp', brand: 'WhatsApp', tool: 'enviar_menu' },
      { logo: 'meta', brand: 'Meta Ads', tool: 'listar_anuncios' },
      { logo: 'mcp', brand: 'MCP', tool: 'conecta lo que sea', open: true },
    ];
    const HUB = { x: 960, y: 520, r: 118 };
    const TILE = { w: 440, h: 116 };
    const COL_X = [110, 1920 - 110 - TILE.w];
    const ROW_Y = [214, 368, 522, 676];
    const FIRST = 20;
    const STAGGER = 12;
    const END = FIRST + TOOLS.length * STAGGER + 56;

    Deck.add({
      id: '9',
      title: 'Herramientas, herramientas, herramientas',
      steps: [END],
      build(k) {
        k.header(null, 'Herramientas, herramientas, herramientas', { text: true });
        const svg = k.svg({ before: false });

        const count = h('span', { style: { fontVariantNumeric: 'tabular-nums' } });
        const hub = k.div({ left: px(HUB.x - HUB.r), top: px(HUB.y - HUB.r), width: px(HUB.r * 2), height: px(HUB.r * 2), borderRadius: '50%', background: C.panel, border: `3px solid ${C.accent}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' },
          h('div', { class: 'p1-avatar', style: { width: '96px', height: '96px', fontSize: '50px' } }, 'C'),
          h('div', { style: { fontSize: '32px', fontWeight: 700 } }, 'Chema'));
        const counter = k.div({ left: px(HUB.x - 300), width: '600px', top: px(HUB.y + HUB.r + 22), textAlign: 'center', fontSize: '30px', fontWeight: 600, color: C.muted }, count, ' capacidades');

        TOOLS.forEach((tool, i) => {
          const side = i % 2;
          const row = Math.floor(i / 2);
          const x = COL_X[side];
          const y = ROW_Y[row];
          const at = FIRST + i * STAGGER;
          const tile = k.div({ left: px(x), top: px(y), width: px(TILE.w), height: px(TILE.h) },
            logo(tool.logo, 54),
            h('div', null,
              h('div', { class: 'brand' }, tool.brand),
              h('div', { class: 'tool', style: tool.open ? { fontFamily: FONT.sans, fontSize: '28px' } : {} }, tool.tool)));
          tile.className = 'p1-tile';
          if (tool.open) tile.style.borderStyle = 'dashed';
          // A wire from the tile's inner edge into the hub.
          const fromX = side ? x : x + TILE.w;
          const fromY = y + TILE.h / 2;
          const angle = Math.atan2(fromY - HUB.y, fromX - HUB.x);
          const toX = HUB.x + Math.cos(angle) * (HUB.r + 6);
          const toY = HUB.y + Math.sin(angle) * (HUB.r + 6);
          const controlX = mix(fromX, toX, 0.55);
          const wire = s('path', { d: `M ${fromX} ${fromY} C ${controlX} ${fromY}, ${controlX} ${toY}, ${toX} ${toY}`, fill: 'none', stroke: C.accent, 'stroke-width': 3, pathLength: 1, 'stroke-dasharray': '1' });
          svg.appendChild(wire);
          k.on((t) => {
            const p = settle(t, at, 18);
            set(tile, 'opacity', String(p));
            set(tile, 'transform', `translateX(${mix(side ? 40 : -40, 0, p).toFixed(1)}px)`);
            const draw = easeIO(t, at + 8, 16);
            attr(wire, 'stroke-dashoffset', String(1 - draw));
            attr(wire, 'opacity', String(mix(1, 0.4, ease(t, at + 26, 16))));
            const flash = busy(t, at + 20, 12);
            k.tone(tile, flash > 0.2 ? C.accent : C.lineHi, flash * 0.45);
          });
        });

        k.on((t) => {
          const shown = settle(t, 6, 20);
          set(hub, 'opacity', String(shown));
          let connected = 0;
          for (let i = 0; i < TOOLS.length; i++) if (t >= FIRST + i * STAGGER + 22) connected++;
          // The hub grows a little with every new capability.
          const growth = TOOLS.reduce((sum, _, i) => sum + ease(t, FIRST + i * STAGGER + 22, 10), 0) / TOOLS.length;
          set(hub, 'transform', `scale(${(mix(0.9, 1, shown) * (1 + 0.1 * growth)).toFixed(4)})`);
          set(hub, 'boxShadow', `0 0 ${(90 * growth).toFixed(1)}px rgba(var(--accent-rgb),${(0.4 * growth).toFixed(3)})`);
          text(count, String(connected));
          set(counter, 'opacity', String(ease(t, FIRST + 22, 12)));
          set(counter, 'transform', `translateY(${(14 * growth).toFixed(1)}px)`);
        });
        k.caption(END - 30, `Más herramientas = <span style="color:${C.accent}">más capacidades</span>`, { y: 866, fontSize: 48 });
      },
    });
  }

  // ============================================================================ 10 · Chema vende
  {
    const T = {
      lead1: 14, find: 32, type1: 44, offer: 66, S0: 92,
      lead2: 96, book: 112, charge: 128, type2: 138, link: 158, S1: 184,
      lead3: 188, event: 204, won: 224, S2: 262,
    };
    const callChip = (k, parent, brand, fn, args, at) => {
      const code = h('span');
      for (const token of K.tokenize(`${fn}(${args})`)) code.appendChild(h('span', { style: { color: token.tone } }, token.text));
      const ok = h('span', { class: 'ok' }, '✓');
      const el = h('div', { class: 'p1-call' }, logo(brand, 30), code, ok);
      parent.appendChild(el);
      k.on((t) => {
        const p = settle(t, at, 16);
        set(el, 'display', t >= at ? '' : 'none');
        set(el, 'opacity', String(p));
        set(el, 'transform', `scale(${mix(0.94, 1, p).toFixed(3)})`);
        const glow = busy(t, at, 14);
        set(el, 'borderColor', glow > 0.2 ? C.accent : C.lineHi);
        set(el, 'boxShadow', glow > 0.2 ? `0 0 ${(30 * glow).toFixed(1)}px rgba(var(--accent-rgb),0.5)` : 'none');
        set(ok, 'opacity', String(ease(t, at + 10, 8)));
      });
      return el;
    };

    Deck.add({
      id: '10',
      title: 'Chema vende',
      steps: [T.S0, T.S1, T.S2],
      build(k) {
        k.header(null, 'Chema vende', { text: true });
        const body = h('div', { class: 'p1-chat-body', style: { gap: '14px', padding: '22px 28px' } });
        const chat = k.div({ left: '96px', top: '184px', width: '1110px', height: '812px' });
        chat.className = 'p1-chat';
        chat.append(Chat.head('Chema', 'en línea', 'C'), body);
        k.reveal(chat, 4, { dy: 20 });

        Chat.bubble(k, body, 'in', 'Quiero festejar un cumpleaños, somos 12, el viernes', T.lead1, { size: 28 });
        callChip(k, body, 'opentable', 'buscar_disponibilidad', 'fecha: "viernes", personas: 12', T.find);
        Chat.typing(k, body, 'out', T.type1, T.offer);
        Chat.bubble(k, body, 'out', 'Qué padre! Para 12 tengo a las 9 p.m. Te la aparto?', T.offer, { size: 28 });
        Chat.bubble(k, body, 'in', 'Va', T.lead2, { size: 28 });
        callChip(k, body, 'opentable', 'reservar_mesa', 'fecha: "viernes", hora: "21:00", personas: 12', T.book);
        callChip(k, body, 'stripe', 'cobrar_anticipo', 'monto: 1200, concepto: "cumpleaños"', T.charge);
        Chat.typing(k, body, 'out', T.type2, T.link);
        Chat.bubble(k, body, 'out', 'Listo. Apártala con $1,200 aquí: <span class="p1-link">buy.stripe.com/…</span>', T.link, { size: 28 });
        Chat.bubble(k, body, 'in', 'Listo, pagado', T.lead3, { size: 28 });
        callChip(k, body, 'googlecalendar', 'agendar_evento', 'fecha: "viernes", titulo: "Cumpleaños · 12"', T.event);

        // The win: the badge lands with a green bloom.
        const badge = k.div({ left: '1290px', top: '470px', display: 'flex', alignItems: 'center', gap: '18px', padding: '20px 36px', borderRadius: '999px', border: '2px solid rgba(74,224,130,0.45)', background: 'rgba(74,224,130,0.10)', color: C.safe, fontSize: '40px', fontWeight: 700, whiteSpace: 'nowrap' },
          h('span', { style: { width: '16px', height: '16px', borderRadius: '50%', background: C.safe, display: 'block' } }), 'Venta cerrada');
        k.on((t) => {
          const p = settle(t, T.won, 20);
          set(badge, 'opacity', String(p));
          set(badge, 'transform', `scale(${mix(0.9, 1, p)})`);
          const bloom = ease(t, T.won + 4, 10) * (1 - 0.6 * ease(t, T.won + 16, 16));
          set(badge, 'boxShadow', `0 0 ${(60 * bloom).toFixed(1)}px rgba(74,224,130,${(0.45 * bloom).toFixed(3)})`);
        });
        k.reveal(k.div({ left: '1294px', top: '604px', width: '580px', fontSize: '38px', fontWeight: 600, lineHeight: 1.35 }, 'Busca, reserva, cobra y agenda'), T.won + 14, { dy: 12 });
        k.reveal(k.div({ left: '1294px', top: '664px', width: '580px', fontSize: '34px', color: C.muted }, 'sin un humano en medio'), T.won + 20, { dy: 12 });
      },
    });
  }

  // ============================================================================ 11–12 · tool schemas fill the window
  // Window pieces are shared by 11 and 12, so 12 starts exactly where 11 ends.
  const Schemas = (() => {
    // Chema's tools first, then plausible restaurant / CRM / payments tools. Each signature ≤ 30 mono chars.
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
    const MATCHES = [0, 1]; // buscar_disponibilidad, reservar_mesa

    const WIN = { x: 96, y: 290, w: 1040, h: 694 };
    const PAD = 16;
    const COL_GAP = 12;
    const COL_W = (WIN.w - 2 * PAD - COL_GAP) / 2;
    const ROW_H = 28;
    const ROW_STEP = 30;
    const FULL_W = WIN.w - 2 * PAD;
    const RIGHT = { x: 1210, w: 620 };
    const ROW_FILL = 'rgba(var(--accent-rgb),0.11)';
    const SCHEMA_FULL_BOTTOM = PAD + (TOOLS.length / 2) * ROW_STEP;
    const CONVO_START_TOP = WIN.h - PAD - 300;
    const FINAL_PERCENT = 92;

    const gridSlot = (index) => ({ left: PAD + (index % 2) * (COL_W + COL_GAP), top: PAD + Math.floor(index / 2) * ROW_STEP });
    const squeezeOf = (conversationHeight) => Math.min(1, Math.max(0, (200 - conversationHeight) / 110));

    const toolRow = (parent, signature) => {
      const open = signature.indexOf('(');
      const el = h('div', {
        style: {
          position: 'absolute', height: px(ROW_H), transformOrigin: 'left center', boxSizing: 'border-box',
          borderLeft: `4px solid ${C.accent}`, borderRadius: '5px', paddingLeft: '12px', fontFamily: FONT.mono,
          fontSize: px(SIZE.tiny), lineHeight: px(ROW_H), whiteSpace: 'nowrap', overflow: 'hidden',
        },
      },
      h('span', { style: { color: C.ink } }, signature.slice(0, open)),
      h('span', { style: { color: C.muted } }, signature.slice(open)));
      parent.appendChild(el);
      return (look) => {
        set(el, 'left', px(look.left));
        set(el, 'top', px(look.top));
        set(el, 'width', px(look.width));
        set(el, 'opacity', String(look.opacity));
        set(el, 'transform', `scale(${look.scale})`);
        set(el, 'borderLeftColor', look.tone);
        set(el, 'background', look.fill);
      };
    };

    const bubble = (k, parent, side, at, copy) => {
      const wrap = h('div', { style: { alignSelf: side === 'in' ? 'flex-start' : 'flex-end' } },
        h('div', {
          style: {
            background: side === 'in' ? C.chatIn : C.chatOut,
            borderRadius: side === 'in' ? '18px 18px 18px 6px' : '18px 18px 6px 18px',
            padding: '10px 18px', fontSize: px(SIZE.small), lineHeight: 1.3, whiteSpace: 'nowrap',
          },
        }, copy));
      parent.appendChild(wrap);
      return k.reveal(wrap, at, { dy: 10 });
    };

    // The customer's conversation: whatever room the tool schemas leave at the bottom of the window.
    const conversation = (parent) => {
      const person = K.icon('user', 28, C.muted);
      const label = h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: px(SIZE.tiny), fontWeight: 600, whiteSpace: 'nowrap' } }, person, 'la conversación del cliente');
      const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
      const el = h('div', {
        style: {
          position: 'absolute', left: px(PAD), right: px(PAD), bottom: px(PAD), boxSizing: 'border-box', borderRadius: '12px',
          overflow: 'hidden', padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: '12px',
        },
      }, label, body);
      parent.appendChild(el);
      return {
        body,
        update(top, squeeze) {
          const tone = lerpColor(C.muted, C.danger, squeeze);
          set(el, 'top', px(top));
          set(el, 'border', `2px solid ${squeeze > 0.05 ? lerpColor('#3D3D3D', C.danger, squeeze) : '#3D3D3D'}`);
          set(el, 'background', squeeze > 0.05 ? `rgba(255,77,94,${0.16 * squeeze})` : C.panel);
          set(el, 'boxShadow', squeeze > 0.5 ? `0 0 ${36 * squeeze}px rgba(255,77,94,0.45)` : 'none');
          set(label, 'color', tone);
          set(person, 'color', tone);
          set(body, 'opacity', String(1 - squeeze));
        },
      };
    };

    const meter = (k) => {
      const value = h('span', { style: { fontWeight: 800, fontVariantNumeric: 'tabular-nums' } });
      const fill = h('div', { style: { height: '100%' } });
      const el = k.div({ left: px(WIN.x), top: px(WIN.y - 76), width: px(WIN.w) },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
          h('div', { style: { fontSize: px(SIZE.tiny), color: C.muted, fontWeight: 600 } }, 'ventana de contexto'),
          h('div', { style: { fontSize: px(SIZE.label), fontWeight: 600, color: C.muted } }, 'contexto usado: ', value)),
        h('div', { style: { marginTop: '8px', height: '10px', borderRadius: '5px', background: C.line, overflow: 'hidden' } }, fill));
      return (percent, opacity) => {
        const tone = percent < 60
          ? lerpColor(C.safe, C.accent, Math.max(0, percent - 30) / 30)
          : lerpColor(C.accent, C.danger, Math.min(1, (percent - 60) / 30));
        set(el, 'opacity', String(opacity));
        set(value, 'color', tone);
        text(value, `${Math.round(percent)}%`);
        set(fill, 'width', `${percent}%`);
        set(fill, 'background', tone);
      };
    };

    const contextWindow = (k) => k.div({
      left: px(WIN.x), top: px(WIN.y), width: px(WIN.w), height: px(WIN.h), boxSizing: 'border-box',
      borderRadius: '18px', border: `2px solid ${C.lineHi}`, background: C.bgDeep, overflow: 'hidden',
    });

    const bullet = (k, at, top, copy) => {
      const el = k.div({ left: px(RIGHT.x), top: px(top), width: px(RIGHT.w), display: 'flex', gap: '22px' },
        h('div', { style: { width: '6px', borderRadius: '3px', background: C.accent, flexShrink: 0 } }),
        h('div', { style: { fontSize: '40px', lineHeight: 1.25, fontWeight: 500 } }, copy));
      return k.reveal(el, at, { dx: -16, dy: 0 });
    };

    return { TOOLS, MATCHES, WIN, PAD, COL_W, ROW_STEP, FULL_W, RIGHT, ROW_FILL, SCHEMA_FULL_BOTTOM, CONVO_START_TOP, FINAL_PERCENT, gridSlot, squeezeOf, toolRow, bubble, conversation, meter, contextWindow, bullet };
  })();

  // ============================================================================ 11 · cada herramienta ocupa contexto
  {
    const { TOOLS, WIN, PAD, COL_W, ROW_STEP, ROW_FILL, CONVO_START_TOP, FINAL_PERCENT, gridSlot, squeezeOf, toolRow, bubble, conversation, meter, contextWindow, bullet } = Schemas;
    const FILL_START = 30;
    const STAGGER = 2.6;
    const toolAt = (index) => FILL_START + index * STAGGER;
    const END = 200;

    Deck.add({
      id: '11',
      title: 'Cada herramienta ocupa contexto',
      steps: [END],
      build(k) {
        k.header(null, 'Cada herramienta ocupa contexto', { text: true });
        const setMeter = meter(k);
        const win = contextWindow(k);
        const rows = TOOLS.map((signature) => toolRow(win, signature));
        const convo = conversation(win);
        bubble(k, convo.body, 'in', 18, 'Tienen lugar el sábado?');

        bullet(k, 40, WIN.y, 'Cada herramienta viaja en el contexto, en cada llamada');
        bullet(k, 150, WIN.y + 230, 'Más herramientas → elige peor y cuesta más');

        k.on((t) => {
          const appear = TOOLS.map((_, index) => ease(t, toolAt(index), 10));
          let rowsFilled = 0;
          for (let row = 0; row < TOOLS.length / 2; row++) rowsFilled += ease(t, toolAt(row * 2), 10);
          const schemaBottom = PAD + rowsFilled * ROW_STEP;
          const conversationTop = Math.max(CONVO_START_TOP, schemaBottom + 2);
          const squeeze = squeezeOf(WIN.h - PAD - conversationTop);
          const percent = (FINAL_PERCENT * appear.reduce((sum, value) => sum + value, 0)) / TOOLS.length;
          const shown = ease(t, 8, 16);
          setMeter(percent, shown);
          set(win, 'opacity', String(shown));
          rows.forEach((setRow, index) => {
            const slot = gridSlot(index);
            setRow({ left: slot.left, top: slot.top - mix(14, 0, appear[index]), width: COL_W, opacity: appear[index], scale: 1, tone: C.accent, fill: ROW_FILL });
          });
          convo.update(conversationTop, squeeze);
        });
      },
    });
  }

  // ============================================================================ 12 · que el agente busque
  {
    const { TOOLS, MATCHES, WIN, PAD, COL_W, ROW_STEP, FULL_W, RIGHT, ROW_FILL, SCHEMA_FULL_BOTTOM, FINAL_PERCENT, gridSlot, squeezeOf, toolRow, bubble, conversation, meter, contextWindow, bullet } = Schemas;
    const SEARCH = 16;
    const HIGHLIGHT = 34;
    const COLLAPSE = 56;
    const COLLAPSE_LEN = 30;
    const STEP1 = 165;
    const ASK = 180;
    const SKILL = 205;
    const END = 330;
    const PRE = SEARCH; // arrival shows 11's full window; the click starts the search
    const SKILL_H = 104;
    const SKILL_TOP = PAD + 3 * ROW_STEP + 8;
    const PERCENT_AFTER_SEARCH = 12;
    const PERCENT_AFTER_SKILL = 24;

    Deck.add({
      id: '12',
      title: 'Que el agente busque',
      steps: [PRE, STEP1, END],
      build(k) {
        k.header(null, 'Que el agente busque', { text: true });
        const setMeter = meter(k);
        const win = contextWindow(k);
        const searchRow = toolRow(win, 'buscar_herramientas(consulta)');
        const rows = TOOLS.map((signature) => toolRow(win, signature));

        const skillCard = h('div', {
          style: {
            position: 'absolute', left: px(PAD), top: px(SKILL_TOP), width: px(FULL_W), height: px(SKILL_H), boxSizing: 'border-box',
            borderRadius: '12px', border: `2px solid ${C.accent}`, background: C.accentSoft, padding: '12px 20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px',
          },
        },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' } },
          h('span', { style: { fontSize: px(SIZE.tiny), fontWeight: 700, color: C.bgDeep, background: C.accent, borderRadius: '8px', padding: '2px 12px' } }, 'Skill'),
          h('span', { style: { fontSize: px(SIZE.small), fontWeight: 700 } }, 'reglas de anticipos para eventos')),
        h('div', { style: { fontSize: px(SIZE.tiny), color: C.muted, whiteSpace: 'nowrap' } }, 'se carga solo cuando alguien reserva un evento'));
        win.appendChild(skillCard);

        const convo = conversation(win);
        bubble(k, convo.body, 'in', -40, 'Tienen lugar el viernes?');
        bubble(k, convo.body, 'out', COLLAPSE + COLLAPSE_LEN + 12, 'Sí! Tengo a las 9 p.m.');
        bubble(k, convo.body, 'in', ASK, 'Va. Es un cumpleaños, somos 12.');

        const found = h('div', { style: { fontSize: px(SIZE.tiny), color: C.safe, fontWeight: 600, marginTop: '12px', fontFamily: FONT.sans } }, '2 herramientas encontradas');
        k.reveal(k.div({ left: px(RIGHT.x), top: px(WIN.y), width: px(RIGHT.w) },
          h('div', { style: { fontSize: px(SIZE.tiny), color: C.muted, fontWeight: 600, marginBottom: '12px' } }, 'el agente busca:'),
          k.chip('buscar_herramientas("reservar")', { fontSize: SIZE.tiny }),
          found), SEARCH);

        bullet(k, COLLAPSE + COLLAPSE_LEN + 24, WIN.y + 200, 'Carga solo las herramientas que necesita');
        bullet(k, SKILL + 30, WIN.y + 360, 'Skills: conocimiento que se carga cuando hace falta');
        k.footnote(SKILL + 60, '−85% tokens en definiciones · Opus 4: 49% → 74% al elegir herramienta · Anthropic, «Advanced tool use»');

        k.on((t) => {
          const highlight = ease(t, HIGHLIGHT, 14);
          const collapse = easeIO(t, COLLAPSE, COLLAPSE_LEN);
          const skill = ease(t, SKILL, 20);
          const searchRowShown = ease(t, COLLAPSE + COLLAPSE_LEN - 10, 14);
          const schemaBottom = mix(SCHEMA_FULL_BOTTOM, PAD + 3 * ROW_STEP, collapse) + skill * (SKILL_H + 16);
          const conversationTop = schemaBottom + 2;
          const squeeze = squeezeOf(WIN.h - PAD - conversationTop);
          const percent = mix(mix(FINAL_PERCENT, PERCENT_AFTER_SEARCH, collapse), PERCENT_AFTER_SKILL, skill);

          setMeter(percent, 1);
          searchRow({ left: PAD, top: PAD, width: FULL_W, opacity: searchRowShown, scale: 1, tone: C.accent, fill: C.accentSoft });
          rows.forEach((setRow, index) => {
            const slot = gridSlot(index);
            const match = MATCHES.indexOf(index);
            if (match >= 0) {
              const targetTop = PAD + (match + 1) * ROW_STEP;
              setRow({
                left: mix(slot.left, PAD, collapse), top: mix(slot.top, targetTop, collapse), width: mix(COL_W, FULL_W, collapse),
                opacity: 1, scale: 1, tone: highlight > 0.5 ? C.safe : C.accent, fill: highlight > 0.5 ? C.safeSoft : ROW_FILL,
              });
              return;
            }
            const gone = ease(t, COLLAPSE + (index % 6), 16);
            setRow({ left: slot.left, top: slot.top, width: COL_W, opacity: mix(1, 0.28, highlight) * (1 - gone), scale: mix(1, 0.85, gone), tone: C.accent, fill: ROW_FILL });
          });
          set(skillCard, 'opacity', String(skill));
          set(skillCard, 'transform', `translateX(${mix(120, 0, skill)}px)`);
          convo.update(conversationTop, squeeze);
          set(found, 'opacity', String(highlight));
        });
      },
    });
  }

  // ============================================================================ 13 · recap
  {
    const ICON = {
      plug: '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
      alert: '<path d="M12 3.5L22 20.5H2z"/><path d="M12 10v4.5"/><path d="M12 17.6v.01" stroke-width="3"/>',
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    };
    const glyph = (name, tone) => {
      const el = s('svg', { width: 54, height: 54, viewBox: '0 0 24 24', fill: 'none', stroke: tone, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      el.innerHTML = ICON[name];
      return el;
    };
    const LINES = [
      { icon: 'plug', tone: 'accent', html: 'Más herramientas → agentes más capaces' },
      { icon: 'alert', tone: C.danger, html: 'Con más de <span style="color:var(--accent)">30–50</span> herramientas, el modelo elige peor' },
      { icon: 'search', tone: C.safe, html: 'Búsqueda de herramientas: carga solo las que necesita' },
    ];
    const AT = [10, 44, 84];

    Deck.add({
      id: '13',
      title: 'Recap: herramientas',
      steps: [AT[0] + 30, AT[1] + 30, AT[2] + 30],
      build(k) {
        k.header(null, 'Recap: herramientas', { text: true });
        LINES.forEach((line, i) => {
          // LINES is built at load time, before the act accent exists: resolve it here.
          line = { ...line, tone: line.tone === 'accent' ? C.accent : line.tone };
          const row = k.div({ left: '96px', top: `${300 + i * 190}px`, width: '1728px', display: 'flex', alignItems: 'center', gap: '40px' },
            h('div', { style: { width: '110px', height: '110px', borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: C.panel, border: `2px solid ${line.tone}` } }, glyph(line.icon, line.tone)),
            h('div', { html: line.html, style: { fontSize: '52px', fontWeight: 700, letterSpacing: '-0.008em', lineHeight: 1.2 } }));
          k.reveal(row, AT[i], { dy: 0, dx: -24, len: 18 });
        });
        k.footnote(AT[1] + 8, 'Fuente: Anthropic docs, «Tool search tool»');
      },
    });
  }

  // ============================================================================ 14 · statement
  Deck.add({
    id: '14',
    title: 'Y luego vino el segundo problema',
    steps: [70],
    build(k) {
      k.shapes({ preset: 'corner', place: 'translate(1920 0) scale(0.72) translate(-1920 0)', at: 2, from: [260, -120] });
      k.lockup({ corner: 'bl', width: 280, at: 20 });
      // Section break into Act 2 (the tool results).
      statement(k, ['Y luego vino el', 'segundo problema.'], { top: 380, size: 128, accent: ['segundo'], stagger: 4 });
    },
  });
})();
