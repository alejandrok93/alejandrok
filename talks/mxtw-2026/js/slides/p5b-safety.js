// Slides 39–42 · Seguridad, second half (part E of RESTRUCTURE_PLAN_2026-10-28.md).
// 39, 41, 42 are ports of s27, s28 and act4.js slide 29; 40 is new.
(function () {
  const { C, SIZE, FONT, ease, easeIO, mix, lerpColor, set, attr, text, h, s } = K;

  // Extra line icons, same 24×24 stroke grid as lib.js.
  const GLYPHS = {
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    trash: '<path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13"/>',
  };
  const glyph = (name, px, tone) => {
    const el = s('svg', { width: px, height: px, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    el.style.display = 'block';
    el.style.flexShrink = '0';
    el.style.color = tone;
    el.innerHTML = GLYPHS[name];
    return el;
  };
  const row = (style, ...kids) => h('div', { style: { display: 'flex', alignItems: 'center', ...style } }, ...kids);

  // ------------------------------------------------------------------------------- 39
  // Port of s27.js. Routes and calls renamed to Chema's SDK; the act kicker is gone.
  (function () {
    const STEP1 = 230;
    const END = 490;

    const SBX = { x: 96, y: 300, w: 470, h: 340 };
    const BRK = { x: 745, y: 290, w: 430, h: 360 };
    const API = { x: 1354, y: 300, w: 470, h: 340 };
    const ATK = { x: 1354, y: 800, w: 470, h: 118 };

    const UP = 420;
    const DOWN = 520;
    const LEAK = 600;
    const TRAVEL = 22;

    // Step 1: a normal SDK call through a per-run grant.
    const CALL = { toBroker: 60, toApi: 100, back: 126, backToSandbox: 150, revoke: 182 };
    // Step 2: a new run registers a webhook that points at the attacker, then the grant blocks it.
    const LEAK_T = { code: 238, toBroker: 252, toApi: 276, register: 300, exfil: 318, block: 392, caption: 422 };

    // Arrival shows the three boxes and the idle arrows; the click starts the call.
    const PRE = 56;
    // The red path, the attacker and «Una fuga…» have landed; the block waits for the next click.
    const LEAK_HOLD = 390;
    const CAPTION_SLACK = 14;

    const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const frame = (box, fill = C.panel, ...kids) =>
      h('div', { style: { position: 'absolute', left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`, borderRadius: '22px', background: fill, border: `3px solid ${C.lineHi}`, padding: '22px 26px' } }, ...kids);
    const toneFrame = (el, tone, glow = 0) => {
      set(el, 'borderColor', tone);
      set(el, 'boxShadow', glow ? `0 0 ${(50 * glow).toFixed(2)}px ${tone}` : 'none');
    };
    const pill = (tone, label) => h('span', { style: { padding: '4px 14px', borderRadius: '999px', border: `2px solid ${tone}`, color: tone, fontSize: `${SIZE.tiny}px`, fontWeight: 700, whiteSpace: 'nowrap' } }, label);

    Deck.add({
      id: '39',
      title: 'Los secretos nunca entran al sandbox',
      steps: [PRE, STEP1, LEAK_HOLD, END],
      build(k) {
        k.header(null, 'Los secretos nunca entran al sandbox');

        const reveal = (el, at, base, { dx = 0, dy = 16, len = 16 } = {}) => k.on((t) => {
          const p = ease(t, at, len);
          set(el, 'opacity', String(p * base(t)));
          set(el, 'transform', `translate(${mix(dx, 0, p)}px, ${mix(dy, 0, p)}px)`);
        });
        // Strictly after the step boundary, so step 1's held last frame still shows step 1.
        const isStep2 = (t) => t >= STEP1 + 4;

        const svg = k.svg();
        const idle = [
          { from: [SBX.x + SBX.w + 6, UP], to: [BRK.x - 8, UP], tone: C.lineHi },
          { from: [BRK.x + BRK.w + 6, UP], to: [API.x - 8, UP], tone: C.lineHi },
          { from: [API.x - 8, DOWN], to: [BRK.x + BRK.w + 6, DOWN], tone: C.line },
          { from: [BRK.x - 8, DOWN], to: [SBX.x + SBX.w + 6, DOWN], tone: C.line },
        ].map((spec) => ({ arrow: k.arrow(svg, spec), tone: spec.tone }));

        const leakIn = k.arrow(svg, { from: [SBX.x + SBX.w + 6, LEAK], to: [BRK.x - 8, LEAK], width: 5 });
        const leakOut = k.arrow(svg, { from: [BRK.x + BRK.w + 6, LEAK], to: [API.x - 8, LEAK], width: 5 });
        const exfil = k.arrow(svg, { from: [API.x + API.w - 70, API.y + API.h + 6], to: [API.x + API.w - 70, ATK.y - 8], width: 5 });

        const packet = (from, to, y, start, tone, when) => {
          const rect = s('rect', { width: 22, height: 18, rx: 5, y: y - 9, fill: tone });
          svg.appendChild(rect);
          k.on((t) => {
            const p = ease(t, start, TRAVEL);
            const visible = when(t) && p > 0 && p < 1;
            attr(rect, 'visibility', visible ? 'visible' : 'hidden');
            if (visible) attr(rect, 'x', (mix(from, to, p) - 11).toFixed(2));
          });
        };
        const step1Only = (t) => !isStep2(t);
        packet(SBX.x + SBX.w, BRK.x, UP, CALL.toBroker, C.accent, step1Only);
        packet(BRK.x + BRK.w, API.x, UP, CALL.toApi, C.accent, step1Only);
        packet(API.x, BRK.x + BRK.w, DOWN, CALL.back, C.safe, step1Only);
        packet(BRK.x, SBX.x + SBX.w, DOWN, CALL.backToSandbox, C.safe, step1Only);
        packet(SBX.x + SBX.w, BRK.x, LEAK, LEAK_T.toBroker, C.danger, isStep2);
        packet(BRK.x + BRK.w, API.x, LEAK, LEAK_T.toApi, C.danger, isStep2);

        const exfilPackets = Array.from({ length: 6 }, () => {
          const rect = s('rect', { x: API.x + API.w - 70 - 11, width: 22, height: 16, rx: 4, fill: C.danger });
          svg.appendChild(rect);
          return rect;
        });
        const barrier = s('rect', { x: BRK.x + BRK.w + 30, y: LEAK - 40, width: 12, height: 80, rx: 6, fill: C.danger });
        svg.appendChild(barrier);

        // --- sandbox ---
        const callBox = (tone, ...kids) => h('div', { style: { fontFamily: FONT.mono, fontSize: `${SIZE.tiny}px`, padding: '8px 12px', borderRadius: '10px', background: C.bgDeep, border: `2px solid ${tone}`, lineHeight: 1.35 } }, ...kids);
        const oldCall = h('div', { style: { position: 'absolute', inset: 0 } }, callBox(C.line, 'sdk.reservas.crear(…)'));
        const leakCall = h('div', { style: { position: 'absolute', inset: 0 } },
          callBox(C.danger, 'sdk.webhooks.crear(url)', h('div', { style: { color: '#FF9BA5' } }, 'url = atacante.example')));
        const sandbox = k.add(frame(SBX, 'rgba(14,14,14,0.8)',
          row({ gap: '12px' }, k.icon('lock', 36, C.safe), h('span', { style: { fontSize: '36px', fontWeight: 700 } }, 'sandbox')),
          h('div', { style: { display: 'flex', gap: '10px', marginTop: '14px' } }, pill(C.safe, 'sin secretos'), pill(C.safe, 'sin red')),
          h('div', { style: { marginTop: '26px', fontSize: `${SIZE.tiny}px`, color: C.muted } }, 'el programa llama al SDK'),
          h('div', { style: { position: 'relative', marginTop: '8px', height: '92px' } }, oldCall, leakCall)));
        k.reveal(sandbox, 8);

        // --- broker ---
        const tokenNote = h('span', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: `${SIZE.tiny}px`, color: C.muted } },
          'los secretos viven aquí');
        const clockIcon = k.icon('clock', 28, C.safe);
        const revokedText = h('span', { style: { color: C.danger, fontWeight: 700 } }, 'revocado al terminar');
        const ttlText = h('span', { style: { fontFamily: FONT.mono, fontWeight: 700 } });
        const expiresText = h('span', null, 'expira en ', ttlText);
        const grant = h('div', { style: { marginTop: '18px', padding: '14px 18px', borderRadius: '14px', border: '2px solid' } },
          h('div', { style: { fontSize: '28px', fontWeight: 700 } }, 'permiso de esta corrida'),
          h('div', { style: { fontSize: `${SIZE.tiny}px`, color: C.muted, marginTop: '4px' } }, '= los permisos del usuario'),
          row({ gap: '10px', marginTop: '10px', fontSize: `${SIZE.tiny}px` }, clockIcon, revokedText, expiresText));
        const blockedNote = row({ marginTop: '14px', gap: '10px', fontSize: `${SIZE.tiny}px`, color: C.danger, fontWeight: 700 },
          k.icon('cross', 26, C.danger), h('span', null, 'rutas que crean canales de envío'));
        const broker = k.add(frame(BRK, C.panel,
          row({ gap: '12px' }, k.icon('shield', 36, C.accent), h('span', { style: { fontSize: '36px', fontWeight: 700 } }, 'broker'), tokenNote),
          grant,
          blockedNote));
        k.reveal(broker, 18);

        // --- your API ---
        const routes = ['reservas.crear', 'clientes.listar', 'webhooks.crear'].map((route) => {
          const note = route === 'webhooks.crear' ? h('span', { style: { fontFamily: FONT.sans, fontWeight: 600 } }, 'registra un webhook') : null;
          const el = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 10px', borderRadius: '8px' } }, route, note);
          return { route, el, note };
        });
        const api = k.add(frame(API, C.panel,
          row({ gap: '12px' }, k.icon('server', 36, C.muted), h('span', { style: { fontSize: '36px', fontWeight: 700 } }, 'tu API')),
          h('div', { style: { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: FONT.mono, fontSize: `${SIZE.tiny}px` } }, routes.map((entry) => entry.el))));
        k.reveal(api, 28);

        [
          { box: SBX, at: 56, label: 'Tiene un SDK, no secretos.' },
          { box: BRK, at: 96, label: 'Dura minutos. Se revoca al terminar.' },
          { box: API, at: 130, label: 'El permiso es el del usuario. La política solo quita.' },
        ].forEach(({ box, at, label }) => {
          const el = k.div({ left: `${box.x + 4}px`, top: `${box.y + box.h + 22 + (box === BRK ? -10 : 0)}px`, width: `${box === API ? 330 + CAPTION_SLACK : box.w + CAPTION_SLACK}px`, fontSize: `${SIZE.tiny}px`, color: C.muted, lineHeight: 1.3 }, label);
          reveal(el, at, (t) => (isStep2(t) ? 0.35 : 1));
        });

        // --- attacker (step 2 only) ---
        const skull = k.icon('skull', 44, C.danger);
        const attackerFrame = frame({ x: 0, y: 0, w: ATK.w, h: ATK.h }, C.dangerSoft,
          row({ gap: '14px' }, skull, h('div', null,
            h('div', { style: { fontFamily: FONT.mono, fontSize: '30px', fontWeight: 700 } }, 'atacante.example'),
            h('div', { style: { fontSize: `${SIZE.tiny}px`, color: C.muted } }, 'recibe la lista de clientes'))));
        const attacker = k.div({ left: `${ATK.x}px`, top: `${ATK.y}px`, width: `${ATK.w}px`, height: `${ATK.h}px` }, attackerFrame);

        const leakLine = k.div({ left: '96px', top: '790px', width: '1150px', fontSize: '32px', fontWeight: 600, color: C.danger }, 'Una fuga desde un sandbox sin internet, por tu propia puerta.');
        reveal(leakLine, 340, (t) => (isStep2(t) ? 1 - 0.35 * ease(t, LEAK_T.block, 16) : 0));
        const lesson = k.div({ left: '96px', top: '880px', fontSize: '60px', fontWeight: 800, letterSpacing: '-0.008em' });
        lesson.innerHTML = `Tu API es tu <span style="color:${C.accent}">frontera de seguridad</span>.`;
        k.reveal(lesson, LEAK_T.caption);

        k.on((t) => {
          const step2 = isStep2(t);
          const runStart = step2 ? LEAK_T.toBroker : CALL.toBroker + TRAVEL;
          const issued = step2 ? ease(t, LEAK_T.toBroker + TRAVEL - 4, 12) : ease(t, CALL.toBroker + TRAVEL - 4, 12);
          const revoked = step2 ? 0 : ease(t, CALL.revoke, 14);
          const ttl = Math.max(0, 300 - Math.max(0, t - runStart) * 0.6);
          const blocked = ease(t, LEAK_T.block, 16);
          const leakLive = step2 ? 1 - blocked : 0;
          const leakTone = lerpColor(C.danger, '#3D3D3D', blocked);
          const registerHit = ease(t, LEAK_T.register, 10) * (1 - blocked);
          const dash = blocked > 0.5 ? '10 12' : 'none';

          for (const { arrow, tone } of idle) arrow.set(ease(t, 40, 14), tone);
          leakIn.set(step2 ? ease(t, LEAK_T.toBroker, TRAVEL) : 0, C.danger);
          leakOut.set(step2 ? ease(t, LEAK_T.toApi, TRAVEL) : 0, leakTone);
          exfil.set(step2 ? ease(t, LEAK_T.exfil, 18) : 0, leakTone);
          attr(leakOut.el.firstChild, 'stroke-dasharray', dash);
          attr(exfil.el.firstChild, 'stroke-dasharray', dash);
          exfilPackets.forEach((rect, index) => {
            const phase = (t - LEAK_T.exfil - 14 - index * 9) / 16;
            const visible = leakLive > 0.5 && phase > 0 && phase < 1;
            attr(rect, 'visibility', visible ? 'visible' : 'hidden');
            if (visible) attr(rect, 'y', mix(API.y + API.h + 10, ATK.y - 24, phase).toFixed(2));
          });
          attr(barrier, 'visibility', step2 ? 'visible' : 'hidden');
          attr(barrier, 'opacity', String(blocked));

          toneFrame(sandbox, step2 && t < LEAK_T.block ? C.danger : C.safe);
          set(oldCall, 'opacity', String(ease(t, 46, 12) * (1 - ease(t, LEAK_T.code - 6, 6))));
          set(leakCall, 'opacity', String(ease(t, LEAK_T.code, 10)));

          toneFrame(broker, C.accent, 0.25 * issued);
          set(tokenNote, 'opacity', String(ease(t, 30, 10)));
          set(grant, 'borderColor', lerpColor('#4AE082', '#FF4D5E', revoked));
          set(grant, 'background', revoked > 0.5 ? C.dangerSoft : C.safeSoft);
          set(grant, 'opacity', String(issued));
          set(grant, 'transform', `translateY(${mix(14, 0, issued)}px)`);
          set(clockIcon, 'color', revoked > 0.5 ? C.danger : C.safe);
          set(revokedText, 'display', revoked > 0.5 ? 'inline' : 'none');
          set(expiresText, 'display', revoked > 0.5 ? 'none' : 'inline');
          text(ttlText, clock(ttl));
          set(blockedNote, 'opacity', String(blocked));

          toneFrame(api, C.lineHi);
          for (const { route, el, note } of routes) {
            const hot = route === 'webhooks.crear' && registerHit > 0.5;
            const hit = route === 'reservas.crear' && !step2 && t >= CALL.toApi + TRAVEL;
            set(el, 'color', hot ? C.danger : hit ? C.safe : C.muted);
            set(el, 'background', hot ? C.dangerSoft : 'transparent');
            if (note) set(note, 'display', hot ? 'block' : 'none');
          }

          set(attacker, 'display', step2 ? 'block' : 'none');
          set(attacker, 'opacity', String(ease(t, LEAK_T.exfil, 12) * mix(1, 0.4, blocked)));
          toneFrame(attackerFrame, leakTone);
          set(skull, 'color', leakTone);
        });
      },
    });
  })();

  // ------------------------------------------------------------------------------- 40
  // The app's buttons and the agent's SDK are the same actions behind the same permission check.
  (function () {
    const ACTIONS = [
      { label: 'Reservar', glyph: 'calendar', fn: 'sdk.reservas.crear()' },
      { label: 'Cancelar', glyph: 'ban', fn: 'sdk.reservas.cancelar()' },
      { label: 'Exportar clientes', glyph: 'download', fn: 'sdk.clientes.exportar()' },
      { label: 'Borrar prospectos', glyph: 'trash', fn: 'sdk.prospectos.borrar()' },
    ];
    const UI = { x: 96, y: 300, w: 620, h: 560 };
    const SDK = { x: 1204, y: 300, w: 620, h: 560 };
    const ROW_Y = [448, 556, 664, 772];
    const ROW_H = 84;
    const LINK = { from: UI.x + UI.w - 40, to: SDK.x + 36 };
    const LINK_AT = (index) => 34 + index * 16;

    const STEP0 = 118;
    const AT = { badge: STEP0 + 8, disable: STEP0 + 30, forbidden: STEP0 + 42, line: STEP0 + 64, sub: STEP0 + 80 };
    const END = STEP0 + 110;

    const panelHead = (icon, label, mono) => row({ gap: '14px', height: '72px', padding: '0 28px', borderBottom: `2px solid ${C.line}`, background: 'rgba(0,0,0,0.45)' },
      icon, h('span', { style: { fontSize: '30px', fontWeight: 700, fontFamily: mono ? FONT.mono : FONT.sans } }, label));

    Deck.add({
      id: '40',
      title: 'Todo lo de la UI, en un SDK',
      // Arrival: both panels and their links. Click: the waiter's role.
      steps: [STEP0, END],
      build(k) {
        const title = k.div({ left: '96px', top: '64px', width: '1728px', fontSize: `${SIZE.title}px`, fontWeight: 700, letterSpacing: '-0.008em', lineHeight: 1.05 });
        title.innerHTML = 'Todo lo que tu app hace,<br>el agente lo hace con un <span style="color:' + C.accent + '">SDK</span>';
        k.reveal(title, 0, { len: 16, dy: 14 });

        const panel = (box) => k.div({ left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`, borderRadius: '22px', border: `2px solid ${C.lineHi}`, background: C.panel, overflow: 'hidden' });

        const ui = panel(UI);
        const dots = row({ gap: '8px', marginRight: '8px' }, ['#FF5F57', '#FEBC2E', '#28C840'].map((dot) => h('i', { style: { width: '14px', height: '14px', borderRadius: '50%', background: dot, opacity: 0.8 } })));
        ui.appendChild(panelHead(dots, 'Tu app'));
        k.reveal(ui, 6, { dx: -16, dy: 0 });

        const code = panel(SDK);
        code.appendChild(panelHead(k.icon('code', 32, C.accent), 'Agente · SDK'));
        k.reveal(code, 14, { dx: 16, dy: 0 });

        const svg = k.svg();
        const links = ACTIONS.map((action, index) => {
          const y = ROW_Y[index];
          const line = s('line', { x1: LINK.from, y1: y, x2: LINK.from, y2: y, 'stroke-width': 3, 'stroke-linecap': 'round' });
          const dot = s('circle', { r: 7, cy: y });
          svg.append(line, dot);
          return { line, dot, y };
        });

        const buttons = ACTIONS.map((action, index) => {
          const isDelete = index === 3;
          const tone = index === 0 ? C.accent : isDelete ? C.danger : C.lineHi;
          const iconEl = glyph(action.glyph, 34, index === 0 ? C.bgDeep : isDelete ? C.danger : C.ink);
          const lockEl = k.icon('lock', 32, C.dim);
          lockEl.style.display = 'none';
          const label = h('span', { style: { fontSize: '32px', fontWeight: 600 } }, action.label);
          const button = k.div({ left: `${UI.x + 40}px`, top: `${ROW_Y[index] - ROW_H / 2}px`, width: `${UI.w - 80}px`, height: `${ROW_H}px`, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '18px', padding: '0 26px',
            border: `2px solid ${tone}`, background: index === 0 ? C.accent : 'transparent', color: index === 0 ? C.bgDeep : isDelete ? C.danger : C.ink },
          iconEl, lockEl, label);
          k.reveal(button, 18 + index * 8, { dx: -12, dy: 0 });
          return { button, iconEl, lockEl, label };
        });

        const calls = ACTIONS.map((action, index) => {
          const codeText = h('span', { style: { fontFamily: FONT.mono, fontSize: '30px', whiteSpace: 'nowrap' } });
          codeText.innerHTML = action.fn.replace(/^sdk\.(\w+)\.(\w+)\(\)$/, `<span style="color:${C.code.text}">sdk.</span><span style="color:${C.code.prop}">$1</span><span style="color:${C.code.text}">.</span><span style="color:${C.code.fn}">$2</span><span style="color:${C.code.punct}">()</span>`);
          const status = h('span', { style: { marginLeft: 'auto', fontFamily: FONT.mono, fontSize: '28px', fontWeight: 700, padding: '4px 14px', borderRadius: '10px', background: C.danger, color: C.bgDeep } }, '403');
          const el = k.div({ left: `${SDK.x + 36}px`, top: `${ROW_Y[index] - ROW_H / 2}px`, width: `${SDK.w - 72}px`, height: `${ROW_H}px`, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px', padding: '0 20px', border: `2px solid ${C.line}`, background: C.bgDeep },
            codeText, status);
          k.reveal(el, LINK_AT(index) + 14, { dx: 12, dy: 0 });
          return { el, codeText, status };
        });

        // Step 2: whoever the user is, the agent acts as that user.
        const badge = k.div({ left: '960px', top: `${UI.y - 2}px`, display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 24px', borderRadius: '999px', border: `2px solid ${C.amber}`, background: 'rgba(245,196,81,0.12)', whiteSpace: 'nowrap' },
          k.icon('user', 36, C.amber),
          h('span', { style: { fontFamily: FONT.mono, fontSize: '32px', fontWeight: 700, color: C.amber } }, 'rol: mesero'));

        const line = k.div({ left: '96px', top: '894px', fontSize: '48px', fontWeight: 800, letterSpacing: '-0.008em' });
        line.innerHTML = `El agente <span style="color:${C.accent}">hereda los permisos</span> del usuario.`;
        k.reveal(line, AT.line);
        const sub = k.div({ left: '96px', top: '962px', fontSize: '32px', color: C.muted }, 'Si el usuario no puede en la UI, el agente no puede por el SDK.');
        k.reveal(sub, AT.sub);

        k.on((t) => {
          const badgeIn = ease(t, AT.badge, 16);
          set(badge, 'opacity', String(badgeIn));
          set(badge, 'transform', `translate(-50%, ${mix(-12, 0, badgeIn)}px)`);
          const off = ease(t, AT.disable, 14);
          const forbidden = ease(t, AT.forbidden, 12);

          links.forEach(({ line: link, dot, y }, index) => {
            const draw = easeIO(t, LINK_AT(index), 20);
            const isDelete = index === 3;
            const tone = isDelete && forbidden > 0 ? lerpColor('#767676', C.danger, forbidden) : C.lineHi;
            attr(link, 'x2', mix(LINK.from, LINK.to, draw).toFixed(1));
            attr(link, 'stroke', tone);
            attr(link, 'stroke-dasharray', isDelete && forbidden > 0.5 ? '10 12' : 'none');
            attr(link, 'visibility', draw > 0 ? 'visible' : 'hidden');
            // One pulse rides each link as it lands.
            const pulse = (t - LINK_AT(index) - 4) / 22;
            attr(dot, 'visibility', pulse > 0 && pulse < 1 ? 'visible' : 'hidden');
            attr(dot, 'cx', mix(LINK.from, LINK.to, Math.max(0, Math.min(1, pulse))).toFixed(1));
            attr(dot, 'fill', C.accent);
          });

          const { button, iconEl, lockEl, label } = buttons[3];
          set(button, 'borderColor', lerpColor(C.danger, '#767676', off));
          set(button, 'color', lerpColor(C.danger, '#767676', off));
          set(button, 'background', off > 0.5 ? 'rgba(118,118,118,0.14)' : 'transparent');
          set(button, 'borderStyle', off > 0.5 ? 'dashed' : 'solid');
          set(iconEl, 'display', off > 0.5 ? 'none' : 'block');
          set(lockEl, 'display', off > 0.5 ? 'block' : 'none');
          set(label, 'textDecoration', off > 0.5 ? 'line-through' : 'none');

          calls.forEach(({ el, codeText, status }, index) => {
            const isDelete = index === 3;
            set(status, 'display', isDelete ? 'inline-block' : 'none');
            if (!isDelete) return;
            set(status, 'opacity', String(forbidden));
            set(status, 'transform', `scale(${mix(0.7, 1, forbidden)})`);
            set(el, 'borderColor', forbidden > 0.5 ? C.danger : C.line);
            set(el, 'background', forbidden > 0.5 ? C.dangerSoft : C.bgDeep);
            set(codeText, 'opacity', String(mix(1, 0.55, forbidden)));
          });
        });
      },
    });
  })();

  // ------------------------------------------------------------------------------- 41
  // Port of s28.js without the Taint lane. Actions are Chema's.
  (function () {
    const STEP1 = 200;
    const STEP2 = 340;
    const END = 390;
    const PRE = 10;

    const ROW_Y = [250, 450, 650];
    const ROW_H = 160;
    const ACTION = { x: 640, w: 520 };
    const RESULT = { x: 1270, w: 560 };
    const COUNT_START = STEP1 + 50;
    const COUNT_TICK = 25;
    // The countdown stops at «3…»: the point is the Cancel button, not the send.
    const COUNT_STOP = COUNT_START + 3 * COUNT_TICK;

    const AT = {
      rows: [
        { label: 10, action: 22, arrow: 40, result: 56 },
        { label: 80, action: 92, arrow: 110, result: 126 },
        { label: STEP1 + 6, action: STEP1 + 16, arrow: STEP1 + 30, result: STEP1 + 42 },
      ],
      toast: 146,
      footnote: 160,
      lesson: STEP2 + 6,
    };

    const LANES = [
      { title: 'Irreversible', tone: C.danger, rule: ['→ pide permiso antes'] },
      { title: 'Reversible', tone: C.safe, rule: ['→ hazlo y ofrece deshacer'] },
      { title: 'Envíos', tone: C.amber, rule: ['→ unos segundos', 'para arrepentirse'] },
    ];

    const button = (label, { filled = false, tone = C.accent, padX = 22 } = {}) =>
      h('div', { style: { padding: `8px ${padX}px`, borderRadius: '12px', border: `2px solid ${tone}`, background: filled ? tone : 'transparent', color: filled ? C.bgDeep : tone, fontSize: '30px', fontWeight: 700, whiteSpace: 'nowrap' } }, label);
    const actionText = (first, second) => h('div', { style: { fontSize: '30px', fontWeight: 600, lineHeight: 1.25 } }, first, h('br'), second);

    Deck.add({
      id: '41',
      title: 'Pedir permiso o poder deshacer?',
      steps: [PRE, STEP1, STEP2, END],
      build(k) {
        k.header(null, 'Pedir permiso o poder deshacer?');
        const centerY = (index) => ROW_Y[index] + ROW_H / 2;

        const svg = k.svg();
        const arrows = AT.rows.map((row, index) => ({ row, arrow: k.arrow(svg, { from: [ACTION.x + ACTION.w + 14, centerY(index)], to: [RESULT.x - 14, centerY(index)] }) }));
        k.on((t) => { for (const { row, arrow } of arrows) arrow.set(ease(t, row.arrow, 14)); });

        LANES.forEach((lane, index) => {
          const el = k.div({ left: '96px', top: `${ROW_Y[index] + 18}px`, width: '520px' },
            h('div', { style: { borderLeft: `6px solid ${lane.tone}`, paddingLeft: '24px' } },
              h('div', { style: { fontSize: '44px', fontWeight: 700, lineHeight: 1.15 } }, lane.title),
              lane.rule.map((line) => h('div', { style: { fontSize: '30px', color: C.muted, lineHeight: 1.3 } }, line))));
          k.reveal(el, AT.rows[index].label, { dx: -16, dy: 0 });
        });

        const card = (index, { x, w }, at, { tone, fill } = {}, ...kids) => {
          const box = k.box({ x, y: ROW_Y[index] + 10, w, h: ROW_H - 20, tone, fill, style: { flexDirection: 'row', justifyContent: 'flex-start', gap: '18px', padding: '0 28px' } }, ...kids);
          return k.reveal(box, at, { dx: -16, dy: 0 });
        };

        card(0, ACTION, AT.rows[0].action, {}, k.icon('outbox', 44, C.muted), actionText('Mandar promo a', '3,000 prospectos'));
        card(0, RESULT, AT.rows[0].result, { tone: C.danger },
          h('div', { style: { fontSize: '36px', fontWeight: 700, flex: 1 } }, 'Confirmas?'),
          button('Sí', { filled: true }),
          button('No'));

        card(1, ACTION, AT.rows[1].action, {}, k.icon('clock', 44, C.muted), actionText('Cambiar la reserva', 'a las 9:30'));
        const toast = h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 20px', borderRadius: '14px', background: C.bgDeep, border: `2px solid ${C.lineHi}` } },
          h('span', { style: { fontSize: `${SIZE.tiny}px`, color: C.muted } }, 'cambiada'),
          h('span', { style: { fontSize: '30px', fontWeight: 700, color: C.accent, textDecoration: 'underline', textUnderlineOffset: '6px' } }, 'Deshacer'));
        card(1, RESULT, AT.rows[1].result, { tone: C.safe },
          k.icon('check', 44, C.safe),
          h('div', { style: { fontSize: '36px', fontWeight: 700, flex: 1 } }, 'Listo'),
          toast);

        card(2, ACTION, AT.rows[2].action, {}, k.icon('mail', 44, C.muted), actionText('Mandar el link', 'del anticipo'));
        const ticks = [5, 4, 3].map((tick) => h('span', { style: { color: C.amber } }, `${tick}… `));
        const countFill = h('div', { style: { height: '100%', background: C.amber } });
        card(2, RESULT, AT.rows[2].result, { tone: C.amber },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 } },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' } },
              h('div', { style: { fontSize: '30px', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '-0.004em' } }, 'Enviando en ', ticks),
              button('Cancelar', { tone: C.ink, padX: 16 })),
            h('div', { style: { height: '8px', borderRadius: '4px', background: C.line, overflow: 'hidden' } }, countFill)));

        const lesson = k.div({ left: '96px', top: '862px', fontSize: '48px', fontWeight: 800, letterSpacing: '-0.008em' });
        lesson.innerHTML = `Tu app tiene que hacer <span style="color:${C.safe}">reversibles</span> ciertas acciones.`;
        k.reveal(lesson, AT.lesson);

        k.footnote(AT.footnote, 'Usuarios de Claude Code aprobaron ~93% de las solicitudes de permiso (Anthropic)');

        k.on((t) => {
          const toastIn = ease(t, AT.toast, 16);
          set(toast, 'opacity', String(toastIn));
          set(toast, 'transform', `translateY(${mix(20, 0, toastIn)}px)`);

          ticks.forEach((tick, index) => set(tick, 'opacity', String(ease(t, COUNT_START + index * COUNT_TICK, 6))));
          const remaining = 1 - Math.max(0, Math.min(t, COUNT_STOP) - COUNT_START) / (5 * COUNT_TICK);
          set(countFill, 'width', `${100 * Math.min(1, remaining)}%`);
        });
      },
    });
  })();

  // ------------------------------------------------------------------------------- 42
  // Port of act4.js slide 29: the provider table becomes a logo column.
  (function () {
    const PROVIDERS = [
      { name: 'E2B', logo: 'e2b', height: 36, wordmark: true },
      { name: 'Daytona', logo: 'daytona', height: 48, wordmark: true },
      { name: 'Vercel', logo: 'vercel', height: 36 },
      { name: 'Cloudflare', logo: 'cloudflare', height: 58 },
      { name: 'Modal', logo: 'modal', height: 56 },
    ];
    const ITEMS = ['Arranque rápido (y que se pueda reanudar)', 'Control real de egress', 'OS propio', 'Observabilidad: qué corrió, qué regresó', 'Que tu framework lo soporte hoy'];

    Deck.add({
      id: '42',
      title: 'Qué proveedor? Lo que importa',
      steps: [96],
      build(k) {
        k.header(null, 'Qué proveedor? Lo que importa', { text: true });
        ITEMS.forEach((item, index) => {
          const at = 8 + index * 8;
          const box = s('svg', { width: 46, height: 46, viewBox: '0 0 46 46' });
          const frame = s('rect', { x: 2, y: 2, width: 42, height: 42, rx: 8, fill: `rgba(${C.accentRGB},0.08)`, stroke: C.accent, 'stroke-width': 2.5 });
          const tick = s('path', { d: 'M13 24l7 7 13-15', fill: 'none', stroke: C.accent, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1 });
          box.append(frame, tick);
          const el = k.div({ left: '96px', top: `${252 + index * 128}px`, display: 'flex', alignItems: 'center', gap: '28px', fontSize: '40px' }, box, h('span', null, item));
          k.reveal(el, at, { dy: 0, dx: -14 });
          k.on((t) => attr(tick, 'stroke-dashoffset', String(1 - easeIO(t, at + 8, 12))));
        });

        const panel = k.div({ left: '1240px', top: '232px', width: '584px', padding: '34px 48px 28px', borderRadius: '22px', border: `2px solid ${C.line}`, background: C.panel });
        k.reveal(panel, 14, { dy: 16 });
        panel.appendChild(h('div', { style: { fontSize: `${SIZE.tiny}px`, fontWeight: 700, letterSpacing: '0.16em', color: C.muted, paddingBottom: '20px', borderBottom: `1.5px solid ${C.line}` } }, 'SANDBOXES'));
        PROVIDERS.forEach((provider, index) => {
          const logo = h('img', { src: `assets/logos/${provider.logo}.svg`, alt: provider.name, style: { height: `${provider.height}px`, width: 'auto', display: 'block' } });
          const el = row({ gap: '20px', height: '100px', borderBottom: index < PROVIDERS.length - 1 ? `1.5px solid ${C.line}` : 'none' },
            logo,
            provider.wordmark ? null : h('span', { style: { fontSize: '40px', fontWeight: 700, letterSpacing: '-0.008em' } }, provider.name));
          panel.appendChild(el);
          k.reveal(el, 26 + index * 7, { dy: 0, dx: 12 });
        });
        const foot = h('div', { style: { fontSize: `${SIZE.tiny}px`, color: C.dim, marginTop: '14px' } }, 'a octubre de 2026');
        panel.appendChild(foot);
        k.fade(foot, 66);
      },
    });
  })();
})();
