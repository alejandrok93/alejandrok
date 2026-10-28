/*
 * Presentation engine: fixed 1920×1080 stage, click-step builds, URL hash, progress bar,
 * overlays, presenter sync (window.open + postMessage, so it works from file://), print.
 * No modules, no network.
 */
(function () {
  'use strict';
  const { Kit, h, set, ACCENTS, useAccent } = window.K;

  // Outline numbering (NOTAS_DEL_PONENTE.md). The PDF has one page per entry, in this order.
  // Restructure 2026-10-28 (RESTRUCTURE_PLAN_2026-10-28.md): slides are numbered 1…46.
  const ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '22b', '23', '24', '25', '26', '27', '27b', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
  const ACTS = [
    { n: 0, label: 'Intro', ids: ['1', '2', '3'] },
    { n: 1, label: 'Industria', ids: ['4', '5', '6'] },
    { n: 2, label: 'Herramientas', ids: ['7', '8', '9', '10', '11', '12', '13', '14'] },
    { n: 3, label: 'Resultados', ids: ['15', '16', '17', '18'] },
    { n: 4, label: 'Código', ids: ['19', '20', '21', '22', '22b', '23', '24'] },
    { n: 5, label: 'Riesgo', ids: ['25', '26', '27', '27b', '28', '29', '30', '31'] },
    { n: 6, label: 'Seguridad', ids: ['32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42'] },
    { n: 7, label: 'Cierre', ids: ['43', '44', '45', '46'] },
  ];
  const FPS = 30;

  const params = new URLSearchParams(location.search);
  const MODE = params.has('presenter') ? 'presenter' : params.has('preview') ? 'preview' : 'deck';
  // ?static renders every step without animation (screenshots, QA).
  const STATIC = params.has('static') || MODE === 'preview';

  const defs = {};
  const Deck = {
    ORDER, ACTS, MODE, defs,
    add(def) { defs[def.id] = def; },
  };
  window.Deck = Deck;

  const actOf = (id) => ACTS.find((act) => act.ids.includes(id));

  let slides = [];
  let index = 0;
  let step = 0;
  let current = { t: 0 };
  let anim = null;
  let motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stage, viewport, progressEl, presenterWin = null;

  const lastStep = (slide) => slide.steps.length - 1;
  const stepEnd = (slide, n) => slide.steps[Math.max(0, Math.min(n, lastStep(slide)))];

  function buildSlides() {
    slides = ORDER.map((id) => {
      const def = defs[id] || { id, title: `Slide ${id}`, steps: [1], build(k) { k.div({ inset: 0, display: 'grid', placeItems: 'center', fontSize: '48px', color: '#5D6884' }, `slide ${id}`); } };
      const act = actOf(id);
      const accent = ACCENTS[act.n];
      // Each act has its own MXTW accent: as CSS vars for stylesheets, and in K.C while the slide builds and renders.
      const root = h('section', { class: `slide slide-${id} act-${act.n}${def.flood ? ' is-flood' : ''}`, 'data-id': id });
      useAccent(accent);
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-rgb', window.K.C.accentRGB);
      root.style.setProperty('--accent-soft', window.K.C.accentSoft);
      stage.appendChild(root);
      const kit = new Kit(root);
      kit.slideId = id;
      def.build(kit);
      return { id, def, root, kit, accent, steps: def.steps && def.steps.length ? def.steps : [0], chrome: def.chrome || 'show', t: -1 };
    });
  }

  function render(slide, t) {
    useAccent(slide.accent);
    slide.t = t;
    slide.kit.update(t);
  }

  function show(i, n, { animate = false, from = null } = {}) {
    const previous = slides[index];
    const changed = previous !== slides[i];
    stopAnim();
    index = i;
    step = n;
    const slide = slides[i];
    if (changed) {
      previous.root.classList.remove('is-current');
      if (previous.def.leave) { useAccent(previous.accent); previous.def.leave(previous.kit); }
    }
    slide.root.classList.add('is-current');
    const target = stepEnd(slide, n);
    if (animate && motion && !STATIC) {
      const start = from == null ? 0 : from;
      render(slide, start);
      runAnim(slide, start, target);
    } else {
      render(slide, target);
    }
    useAccent(slide.accent);
    if (changed || slide.__entered !== true) {
      slide.__entered = true;
      if (slide.def.enter) slide.def.enter(slide.kit, { static: STATIC });
    }
    if (slide.def.onStep) slide.def.onStep(slide.kit, n, { static: STATIC || !motion });
    updateHash();
    updateProgress();
    broadcast();
  }

  function runAnim(slide, from, to) {
    const startedAt = performance.now();
    anim = { slide, to, raf: 0 };
    const tick = (now) => {
      const t = Math.min(to, from + ((now - startedAt) / 1000) * FPS);
      render(slide, t);
      if (t < to) anim.raf = requestAnimationFrame(tick);
      else anim = null;
    };
    anim.raf = requestAnimationFrame(tick);
  }
  function stopAnim() {
    if (!anim) return;
    cancelAnimationFrame(anim.raf);
    anim = null;
  }
  // A click during a build skips to the end of that build, like Keynote.
  function finishAnim() {
    if (!anim) return false;
    const { slide, to } = anim;
    stopAnim();
    render(slide, to);
    return true;
  }

  function next() {
    if (finishAnim()) return;
    const slide = slides[index];
    if (step < lastStep(slide)) show(index, step + 1, { animate: true, from: stepEnd(slide, step) });
    else if (index < slides.length - 1) show(index + 1, 0, { animate: true, from: 0 });
  }
  function prev() {
    stopAnim();
    if (step > 0) show(index, step - 1);
    else if (index > 0) show(index - 1, lastStep(slides[index - 1]));
    else show(0, 0);
  }
  function goto(id, n = 0) {
    const i = ORDER.indexOf(String(id).toLowerCase());
    if (i < 0) return toast(`no existe la slide ${id}`);
    show(i, Math.min(n, lastStep(slides[i])));
  }

  // --- hash: #18.2 = slide 18, step 2. #18.2@150 renders frame 150 (QA only). ------------------
  function parseHash() {
    const match = location.hash.replace(/^#/, '').match(/^([0-9]+b?)(?:\.(\d+))?(?:@(\d+(?:\.\d+)?))?$/i);
    if (!match) return null;
    return { id: match[1].toLowerCase(), step: Number(match[2] || 0), at: match[3] != null ? Number(match[3]) : null };
  }
  function updateHash() {
    const slide = slides[index];
    const hash = `#${slide.id}${step > 0 ? `.${step}` : ''}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }
  function applyHash() {
    const target = parseHash();
    if (!target) return false;
    const i = ORDER.indexOf(target.id);
    if (i < 0) return false;
    show(i, Math.min(target.step, lastStep(slides[i])));
    if (target.at != null) render(slides[i], target.at);
    return true;
  }

  // --- progress bar: one segment per act, width proportional to its slides -------------------
  function buildProgress() {
    progressEl = h('div', { class: 'progress' });
    const bars = h('div', { class: 'acts' });
    const labels = h('div', { class: 'labels' });
    for (const act of ACTS) {
      const grow = String(act.ids.length);
      const bar = h('div', { class: 'act', style: { flexGrow: grow, flexBasis: 0 } }, h('div', { class: 'fill' }));
      const label = h('span', { style: { flexGrow: grow, flexBasis: 0 } }, act.n === 0 ? act.label : `${act.n} · ${act.label}`);
      // Every act segment wears its own MXTW accent.
      bar.style.setProperty('--act', ACCENTS[act.n]);
      label.style.setProperty('--act', ACCENTS[act.n]);
      bars.appendChild(bar);
      labels.appendChild(label);
      act.bar = bar;
      act.labelEl = labels.lastChild;
    }
    progressEl.append(labels, bars);
    stage.appendChild(progressEl);
  }
  function updateProgress() {
    if (!progressEl) return;
    const slide = slides[index];
    const act = actOf(slide.id);
    for (const other of ACTS) {
      const position = other.ids.indexOf(slide.id);
      let fraction = 0;
      if (other.n < act.n) fraction = 1;
      else if (other === act) fraction = (position + (step + 1) / slide.steps.length) / other.ids.length;
      set(other.bar.firstChild, 'width', `${(fraction * 100).toFixed(2)}%`);
      other.bar.classList.toggle('done', other.n < act.n);
      other.labelEl.classList.toggle('on', other === act);
    }
    progressEl.className = `progress ${slide.chrome === 'show' ? '' : slide.chrome}${slide.def.flood ? ' on-flood' : ''}`;
  }

  // --- overlays -------------------------------------------------------------------------------
  let toastTimer = 0;
  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1400);
  }
  function toggleHelp(force) {
    document.getElementById('help').classList.toggle('on', force);
  }
  function toggleBlack() {
    document.getElementById('black').classList.toggle('on');
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => toast('pantalla completa no disponible'));
  }
  function toggleMotion() {
    motion = !motion;
    finishAnim();
    toast(motion ? 'animaciones: sí' : 'animaciones: no');
  }

  // --- presenter sync ---------------------------------------------------------------------------
  function stateMessage() {
    const slide = slides[index];
    const hasNextStep = step < lastStep(slide);
    const nextSlide = hasNextStep ? slide : slides[index + 1];
    return {
      type: 'deck:state', id: slide.id, step, steps: slide.steps.length, index, total: slides.length,
      title: slide.def.title || '', act: actOf(slide.id).n,
      next: nextSlide ? { id: nextSlide.id, step: hasNextStep ? step + 1 : 0, title: nextSlide.def.title || '' } : null,
    };
  }
  function broadcast() {
    if (presenterWin && !presenterWin.closed) presenterWin.postMessage(stateMessage(), '*');
  }
  function openPresenter() {
    const url = `${location.pathname}?presenter`;
    presenterWin = window.open(url, 'deck-presenter', 'width=1400,height=860');
    if (!presenterWin) toast('permite ventanas emergentes para la vista del ponente');
  }

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (MODE === 'preview' && data.type === 'deck:show') {
      const i = ORDER.indexOf(data.id);
      if (i >= 0) show(i, data.step || 0);
      return;
    }
    if (MODE !== 'deck') return;
    if (data.type === 'deck:hello') {
      presenterWin = event.source;
      broadcast();
    } else if (data.type === 'deck:nav') {
      if (data.action === 'next') next();
      else if (data.action === 'prev') prev();
      else if (data.action === 'goto') goto(data.id, data.step || 0);
      else if (data.action === 'black') toggleBlack();
    }
  });

  // --- input ------------------------------------------------------------------------------------
  let digits = '';
  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    if (document.getElementById('help').classList.contains('on') && key !== '?') {
      toggleHelp(false);
      if (key === 'Escape') return;
    }
    if (/^[0-9]$/.test(key) || (key.toLowerCase() === 'b' && digits)) {
      digits += key.toLowerCase();
      toast(`ir a ${digits}…`);
      return;
    }
    if (key === 'Enter' && digits) {
      goto(digits);
      digits = '';
      return;
    }
    digits = '';
    switch (key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': prev(); break;
      case 'Home': show(0, 0); break;
      case 'End': show(slides.length - 1, 0); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'b': case 'B': case '.': toggleBlack(); break;
      case 's': case 'S': openPresenter(); break;
      case 'm': case 'M': toggleMotion(); break;
      case '?': toggleHelp(); break;
      case 'Escape': digits = ''; break;
      default: return;
    }
    event.preventDefault();
  }

  function fit() {
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    const x = (window.innerWidth - 1920 * scale) / 2;
    const y = (window.innerHeight - 1080 * scale) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  // Print / Save as PDF: every slide at its final step.
  function renderAllFinal() {
    for (const slide of slides) render(slide, slide.steps[slide.steps.length - 1]);
  }
  function restoreAfterPrint() {
    for (const slide of slides) if (slide !== slides[index]) render(slide, slide.steps[0]);
    render(slides[index], stepEnd(slides[index], step));
  }

  function boot() {
    if (MODE === 'presenter') {
      window.Presenter && window.Presenter.boot();
      return;
    }
    document.body.classList.add(`mode-${MODE}`);
    viewport = document.getElementById('viewport');
    stage = h('div', { class: 'stage' });
    viewport.appendChild(stage);
    buildSlides();
    if (MODE === 'deck') buildProgress();
    fit();
    window.addEventListener('resize', fit);
    for (const slide of slides) render(slide, slide.steps[0]);
    slides[0].root.classList.add('is-current');
    if (!applyHash()) show(0, 0, { animate: !STATIC, from: 0 });
    if (MODE === 'preview' && window.parent !== window) window.parent.postMessage({ type: 'deck:preview-ready' }, '*');
    if (MODE !== 'deck') return;
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', applyHash);
    viewport.addEventListener('click', (event) => {
      if (event.target.closest('a, button, video')) return;
      next();
    });
    window.addEventListener('beforeprint', renderAllFinal);
    window.addEventListener('afterprint', restoreAfterPrint);
  }

  Deck.next = next;
  Deck.prev = prev;
  Deck.goto = goto;
  Deck.state = () => (slides.length ? stateMessage() : null);
  Deck.renderAllFinal = renderAllFinal;
  Deck.boot = boot;
})();
