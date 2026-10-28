/*
 * Presenter view: index.html?presenter, opened with S from the deck.
 * Talks to the deck window through window.opener + postMessage (works from file://).
 * The two slide previews are iframes of index.html?preview, driven by postMessage too.
 */
(function () {
  'use strict';

  const CSS = `
  body.presenter { overflow: hidden; background: #000; color: var(--ink); font-family: var(--sans); }
  .p-wrap { position: fixed; inset: 0; display: grid; grid-template-rows: auto 1fr; gap: 14px; padding: 14px 18px 18px; }
  .p-top { display: flex; align-items: center; gap: 22px; font-size: 15px; color: var(--muted); }
  .p-top .where { font-family: var(--mono); font-size: 14px; color: var(--muted); }
  .p-top .where b { color: var(--ink); font-weight: 600; }
  .p-top .spacer { flex: 1; }
  .p-timer { font-family: var(--mono); font-size: 34px; color: var(--ink); letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
  .p-timer.paused { color: var(--dim); }
  .p-clock { font-family: var(--mono); font-size: 18px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .p-pace { font-family: var(--mono); font-size: 14px; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line-hi); white-space: nowrap; }
  .p-pace.ok { color: var(--safe); border-color: rgba(74,224,130,0.4); }
  .p-pace.late { color: var(--danger); border-color: rgba(255,77,94,0.45); }
  .p-pace.early { color: var(--amber); border-color: rgba(245,196,81,0.4); }
  .p-btn { font: 500 13px var(--mono); color: var(--ink); background: var(--panel); border: 1px solid var(--line-hi); border-radius: 8px; padding: 7px 11px; cursor: pointer; }
  .p-btn:hover { border-color: var(--accent); }
  .p-main { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 18px; min-height: 0; }
  .p-plan { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 18px; font-size: 15px; color: var(--muted); }
  .p-plan .row { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; padding: 6px 0; border-bottom: 1px solid var(--line); }
  .p-plan .row:last-child { border-bottom: 0; }
  .p-plan .row.on { color: var(--ink); }
  .p-plan .row.on b { color: var(--accent); }
  .p-plan .row span { font-family: var(--mono); font-size: 13px; }
  .p-plan .row.done { color: var(--dim); }
  .p-col { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
  .p-label { font: 600 12px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); display: flex; justify-content: space-between; }
  .p-label .t { color: var(--muted); letter-spacing: 0; text-transform: none; font-family: var(--sans); font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%; }
  .p-frame { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; background: var(--bg-deep); border: 1px solid var(--line); }
  .p-frame.current { border-color: rgba(var(--accent-rgb),0.55); box-shadow: 0 0 0 1px rgba(var(--accent-rgb),0.25); }
  .p-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; pointer-events: none; }
  .p-frame .end { position: absolute; inset: 0; display: grid; place-items: center; color: var(--dim); font: 500 15px var(--mono); }
  .p-steps { display: flex; gap: 6px; }
  .p-steps i { width: 22px; height: 4px; border-radius: 2px; background: var(--line-hi); display: block; }
  .p-steps i.on { background: var(--accent); }
  .p-notes { flex: 1; min-height: 0; overflow: auto; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 18px 22px; font-size: 19px; line-height: 1.55; color: #D9DEEA; }
  .p-notes h3 { margin: 0 0 10px; font-size: 15px; font-family: var(--mono); color: var(--accent); font-weight: 600; letter-spacing: 0.04em; }
  .p-notes p { margin: 0 0 12px; }
  .p-notes ul { margin: 0 0 12px; padding-left: 20px; }
  .p-notes code { font-family: var(--mono); font-size: 0.88em; color: var(--c-fn); background: rgba(124,199,255,0.08); padding: 1px 5px; border-radius: 4px; }
  .p-notes .cue { display: inline; font-style: italic; color: var(--amber); background: rgba(245,196,81,0.08); border-radius: 5px; padding: 1px 6px; }
  .p-notes .joke, .p-notes .fact { display: inline-block; font-size: 0.82em; font-weight: 700; border-radius: 6px; padding: 1px 7px; margin-right: 4px; font-style: normal; }
  .p-notes .joke { color: #1a0d04; background: var(--accent); }
  .p-notes .fact { color: #04140d; background: var(--safe); }
  .p-notes .empty { color: var(--dim); font-style: italic; }
  .p-act { font-size: 14px; color: var(--muted); }
  .p-act b { color: var(--ink); font-weight: 600; }
  .p-orphan { position: fixed; inset: 0; display: grid; place-items: center; text-align: center; color: var(--muted); font-size: 18px; }
  `;

  const esc = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Inline markdown for the notes: `code`, **bold**, *[cue]*, *italic*, 🎤 joke, 📌 fact.
  const inline = (raw) => esc(raw)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*\[([^\]]+)\]\*/g, '<span class="cue">[$1]</span>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/🎤/g, '<span class="joke">🎤 chiste</span>')
    .replace(/📌/g, '<span class="fact">📌 dato</span>');

  const renderBlock = (block) => {
    const lines = block.split('\n');
    if (lines.every((line) => /^\s*- /.test(line))) return `<ul>${lines.map((line) => `<li>${inline(line.replace(/^\s*- /, ''))}</li>`).join('')}</ul>`;
    return `<p>${inline(lines.join(' '))}</p>`;
  };

  // Notes by outline slide number, plus act timings from the «## Acto N — … (≈M min)» headings.
  function parseNotes(md) {
    const notes = {};
    const acts = {};
    let current = null;
    let section = null;
    for (const line of md.split('\n')) {
      const act = line.match(/^## Acto (\d+)\s*—\s*(.*?)\s*\(≈\s*(\d+)\s*min\)/);
      if (act) { acts[act[1]] = { name: act[2], minutes: Number(act[3]) }; current = null; section = null; continue; }
      const slide = line.match(/^### (\d+b?)\.\s*(.*)$/);
      if (slide) { current = slide[1]; notes[current] = { title: slide[2], body: [] }; section = null; continue; }
      if (/^## /.test(line)) { current = null; section = line.replace(/^## /, '').trim(); notes[`§${section}`] = { title: section, body: [] }; continue; }
      if (/^---\s*$/.test(line)) { current = null; continue; }
      if (current) notes[current].body.push(line);
      else if (section && notes[`§${section}`]) notes[`§${section}`].body.push(line);
    }
    const toHtml = (body) => body.join('\n').trim().split(/\n\s*\n/).filter(Boolean).map(renderBlock).join('');
    const html = {};
    for (const [id, note] of Object.entries(notes)) html[id] = { title: note.title, html: toHtml(note.body), raw: note.body };
    // The last slide (Gracias) shows its own notes, or the end of the closing slide, plus the likely questions.
    const last = window.Deck.ORDER[window.Deck.ORDER.length - 1];
    const closing = window.Deck.ORDER[window.Deck.ORDER.length - 2];
    const questions = html['§Preguntas probables (respuestas cortas)'];
    if (questions && (html[last] || notes[closing])) {
      const own = html[last] ? html[last].html : notes[closing].body.join('\n').split(/\n\s*\n/).filter((block) => /Gracias/.test(block)).map(renderBlock).join('');
      html[last] = { title: 'Gracias', html: own + `<h3 style="margin-top:18px">PREGUNTAS PROBABLES</h3>${questions.html}` };
    }
    return { notes: html, acts };
  }

  const fmt = (ms) => {
    const sign = ms < 0 ? '−' : '';
    const total = Math.floor(Math.abs(ms) / 1000);
    return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };

  function boot() {
    document.body.classList.add('presenter');
    document.title = 'Ponente · Dale una computadora a tu agente';
    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
    document.getElementById('viewport').remove();

    const deck = window.opener;
    if (!deck) {
      document.body.insertAdjacentHTML('beforeend', '<div class="p-orphan">Abre esta vista con la tecla <b>&nbsp;S&nbsp;</b> desde la presentación.</div>');
      return;
    }

    const { notes, acts } = parseNotes(window.DECK_NOTES_MD || '');
    const base = location.pathname;
    const wrap = document.createElement('div');
    wrap.className = 'p-wrap';
    wrap.innerHTML = `
      <div class="p-top">
        <span class="where" id="p-where"></span>
        <span class="p-act" id="p-act"></span>
        <span class="spacer"></span>
        <span class="p-pace" id="p-pace">—</span>
        <span class="p-timer paused" id="p-timer">0:00</span>
        <span class="p-clock" id="p-clock"></span>
        <button class="p-btn" id="p-start" title="T">iniciar</button>
        <button class="p-btn" id="p-reset" title="R">reiniciar</button>
        <button class="p-btn" id="p-prev" title="←">◀</button>
        <button class="p-btn" id="p-next" title="→">▶</button>
        <button class="p-btn" id="p-black" title="B">negro</button>
      </div>
      <div class="p-main">
        <div class="p-col">
          <div class="p-label"><span>ahora</span><span class="p-steps" id="p-steps"></span></div>
          <div class="p-frame current"><iframe id="p-cur" src="${base}?preview"></iframe></div>
          <div class="p-notes" id="p-notes"></div>
        </div>
        <div class="p-col">
          <div class="p-label"><span>sigue</span><span class="t" id="p-next-title"></span></div>
          <div class="p-frame"><iframe id="p-nxt" src="${base}?preview"></iframe><div class="end" id="p-end" style="display:none">fin</div></div>
          <div class="p-plan" id="p-plan"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const $ = (id) => document.getElementById(id);

    // Planned start (minutes) of each act, accumulated in notes order.
    const order = window.Deck.ACTS;
    const plan = {};
    let cursor = 0;
    for (const act of order) {
      const minutes = acts[act.n] ? acts[act.n].minutes : 0;
      plan[act.n] = { start: cursor, minutes };
      cursor += minutes;
    }

    let state = null;
    let started = 0;
    let pausedAt = 0;
    let running = false;
    const elapsed = () => (running ? Date.now() - started : pausedAt);
    const startTimer = () => { if (!running) { started = Date.now() - pausedAt; running = true; } };
    const toggleTimer = () => { if (running) { pausedAt = elapsed(); running = false; } else startTimer(); };
    const resetTimer = () => { running = false; pausedAt = 0; };

    const previews = { cur: $('p-cur'), nxt: $('p-nxt') };
    const ready = { cur: false, nxt: false };
    const sendPreviews = () => {
      if (!state) return;
      if (ready.cur) previews.cur.contentWindow.postMessage({ type: 'deck:show', id: state.id, step: state.step }, '*');
      if (ready.nxt && state.next) previews.nxt.contentWindow.postMessage({ type: 'deck:show', id: state.next.id, step: state.next.step }, '*');
    };

    function paint() {
      if (!state) return;
      const act = order.find((candidate) => candidate.n === state.act);
      $('p-where').innerHTML = `<b>${state.id}</b> · ${state.index + 1}/${state.total}`;
      $('p-act').innerHTML = `${state.act === 0 ? 'Intro' : `Acto ${state.act}`} · <b>${esc(acts[state.act] ? acts[state.act].name : act.label)}</b>${plan[state.act] ? ` · ≈${plan[state.act].minutes} min` : ''}`;
      $('p-steps').innerHTML = state.steps > 1 ? Array.from({ length: state.steps }, (_, i) => `<i class="${i <= state.step ? 'on' : ''}"></i>`).join('') : '';
      $('p-next-title').textContent = state.next ? `${state.next.id === state.id ? `paso ${state.next.step}` : state.next.id} · ${state.next.title}` : '';
      $('p-end').style.display = state.next ? 'none' : 'grid';
      previews.nxt.style.visibility = state.next ? 'visible' : 'hidden';
      const note = notes[state.id];
      $('p-notes').innerHTML = note && note.html ? `<h3>${esc(state.id)} · ${esc(note.title)}</h3>${note.html}` : '<p class="empty">Sin notas para esta slide.</p>';
      $('p-notes').scrollTop = 0;
      $('p-plan').innerHTML = order.map((candidate) => {
        const slot = plan[candidate.n];
        const name = acts[candidate.n] ? acts[candidate.n].name : candidate.label;
        const cls = candidate.n === state.act ? 'on' : candidate.n < state.act ? 'done' : '';
        return `<div class="row ${cls}"><b>${candidate.n === 0 ? '' : `${candidate.n} · `}${esc(name)}</b><span>${slot.start}:00 → ${slot.start + slot.minutes}:00</span><span>${candidate.ids[0]}–${candidate.ids[candidate.ids.length - 1]}</span></div>`;
      }).join('');
      sendPreviews();
    }

    // Pace: where the notes' act timings say we should be at this slide.
    function tick() {
      const now = new Date();
      $('p-clock').textContent = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      $('p-timer').textContent = fmt(elapsed());
      $('p-timer').classList.toggle('paused', !running);
      $('p-start').textContent = running ? 'pausar' : 'iniciar';
      const pace = $('p-pace');
      if (!state || !plan[state.act] || (!running && !pausedAt)) { pace.textContent = `meta ${cursor} min`; pace.className = 'p-pace'; return; }
      const act = order.find((candidate) => candidate.n === state.act);
      const position = act.ids.indexOf(state.id) / act.ids.length;
      const expected = (plan[state.act].start + plan[state.act].minutes * position) * 60000;
      const delta = elapsed() - expected;
      if (Math.abs(delta) < 30000) { pace.textContent = 'a tiempo'; pace.className = 'p-pace ok'; }
      else if (delta > 0) { pace.textContent = `${fmt(delta)} atrasado`; pace.className = 'p-pace late'; }
      else { pace.textContent = `${fmt(-delta)} adelantado`; pace.className = 'p-pace early'; }
    }
    setInterval(tick, 500);

    const nav = (action) => deck.postMessage({ type: 'deck:nav', action }, '*');
    window.addEventListener('message', (event) => {
      const data = event.data || {};
      if (data.type === 'deck:state') {
        // The timer starts by itself the first time the talk leaves the cover.
        if (state && !running && !pausedAt && (data.index > 0 || data.step > 0)) startTimer();
        state = data;
        paint();
      } else if (data.type === 'deck:preview-ready') {
        if (event.source === previews.cur.contentWindow) ready.cur = true;
        if (event.source === previews.nxt.contentWindow) ready.nxt = true;
        sendPreviews();
      }
    });
    // Handshake, repeated so a reloaded deck window finds this one again.
    const hello = () => { try { deck.postMessage({ type: 'deck:hello' }, '*'); } catch (error) { /* deck window closed */ } };
    hello();
    setInterval(hello, 2000);

    $('p-start').onclick = toggleTimer;
    $('p-reset').onclick = resetTimer;
    $('p-prev').onclick = () => nav('prev');
    $('p-next').onclick = () => nav('next');
    $('p-black').onclick = () => nav('black');
    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': nav('next'); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': nav('prev'); break;
        case 'b': case 'B': case '.': nav('black'); break;
        case 't': case 'T': toggleTimer(); break;
        case 'r': case 'R': resetTimer(); break;
        default: return;
      }
      event.preventDefault();
    });
    tick();
  }

  window.Presenter = { boot, parseNotes };
})();
