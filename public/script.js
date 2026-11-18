/* =========================================================
   HYDROLAB 3D – Núcleo de la aplicación
   Navegación entre escenarios, cámara, arrastre de objetos,
   paneles de datos, diálogos de personajes, teoría, video
   y cuestionario. Los escenarios están en js/mod-*.js
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   ★ VIDEO PERSONAL «ARQUÍMEDES EN ACCIÓN» ★
   Pegá acá la URL de tu video. Dos opciones:
     • YouTube:  'https://www.youtube.com/watch?v=TU_CODIGO'  (también youtu.be/… o /shorts/…)
     • Archivo:  'assets/video/arquimedes.mp4'               (funciona sin internet)
   Mientras quede vacío, el reproductor muestra instrucciones.
   --------------------------------------------------------- */
const VIDEO_CONFIG = {
  url: 'assets/video/arquimedes.mp4',
  portada: 'assets/video/arquimedes-portada.jpg',
  titulo: 'ARQUÍMEDES EN ACCIÓN'
};

window.HYDROLAB = (() => {

  /* =======================================================
     0. CONSTANTES Y UTILIDADES
     ======================================================= */
  const PATM = 101325;
  const G = 9.81;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const byId = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const round1 = v => Math.round(v * 10) / 10;

  function fmt(x, d = 2) {
    if (!Number.isFinite(x)) return '—';
    const v = Math.abs(x) < 1e-12 ? 0 : x;
    return v.toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  }
  const fmtFixed = (x, d) => (Number.isFinite(x) ? (Math.abs(x) < 1e-12 ? 0 : x).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
  const fmtPa = x => `${fmt(x, Math.abs(x) >= 1000 ? 0 : 2)} Pa`;
  const fmtkPa = x => `${fmtFixed(x / 1000, 2)} kPa`;
  const fmtN = x => {
    const a = Math.abs(x);
    if (a >= 1e6) return `${fmtFixed(x / 1e6, 2)} MN`;
    if (a >= 1e4) return `${fmtFixed(x / 1000, 1)} kN`;
    return `${fmt(x, a >= 100 ? 0 : 1)} N`;
  };
  const txt = (id, t) => { const e = typeof id === 'string' ? byId(id) : id; if (e && e.textContent !== t) e.textContent = t; };
  const html = (id, h) => { const e = typeof id === 'string' ? byId(id) : id; if (e && e.innerHTML !== h) e.innerHTML = h; };

  function tween(from, to, dur, onUpdate, onDone) {
    if (REDUCED) dur = 1;
    const t0 = performance.now();
    let raf, stopped = false;
    const step = now => {
      if (stopped) return;
      const k = clamp((now - t0) / dur, 0, 1);
      onUpdate(lerp(from, to, easeInOut(k)));
      if (k < 1) raf = requestAnimationFrame(step); else if (onDone) onDone();
    };
    raf = requestAnimationFrame(step);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }

  /**
   * Sincroniza slider (id-range), campo numérico (id-num) y botones
   * de valores predefinidos (.chips[data-target=id]).
   */
  function bindControl(id, onChange) {
    const r = byId(id + '-range'), n = byId(id + '-num');
    const min = parseFloat(r.min), max = parseFloat(r.max);
    const chips = $$(`.chips[data-target="${id}"]`);
    let cur = parseFloat(n.value);
    const paint = () => {
      r.style.setProperty('--fill', `${((cur - min) / (max - min)) * 100}%`);
      chips.forEach(c => c.querySelectorAll('button').forEach(b => b.classList.toggle('on', Math.abs(parseFloat(b.dataset.v) - cur) < 1e-9)));
    };
    const apply = (v, src) => {
      if (!Number.isFinite(v)) v = cur;
      cur = clamp(v, min, max);
      if (src !== 'range') r.value = cur;
      if (src !== 'num' && document.activeElement !== n) n.value = +cur.toFixed(4);
      paint();
    };
    const set = (v, src) => { apply(v, src); onChange(cur); };
    r.addEventListener('input', () => set(parseFloat(r.value), 'range'));
    n.addEventListener('input', () => { const v = parseFloat(n.value); if (Number.isFinite(v) && v >= min && v <= max) set(v, 'num'); });
    n.addEventListener('change', () => { set(parseFloat(n.value)); n.value = +cur.toFixed(4); });
    chips.forEach(c => c.addEventListener('click', e => { const b = e.target.closest('button'); if (b) set(parseFloat(b.dataset.v)); }));
    r.value = cur; paint();
    return { get: () => cur, set: v => set(v), setSilent: v => apply(v), disable: on => { r.disabled = on; n.disabled = on; chips.forEach(c => c.classList.toggle('disabled', on)); } };
  }

  /* =======================================================
     1. ESTADO DE LA APLICACIÓN
     ======================================================= */
  const app = {
    PATM, G, fmt, fmtFixed, fmtPa, fmtkPa, fmtN, txt, html, clamp, lerp, tween, bindControl, round1, byId, $, $$, REDUCED,
    modules: {}, order: ['lobby', 'presion', 'teorema', 'prensa', 'arquimedes', 'desafio'],
    current: null, visited: new Set(), started: false,
    renderer: null, camera: null, controls: null, labels: null, time: 0
  };

  app.register = mod => { app.modules[mod.id] = mod; mod.built = false; };

  function toast(msg, ms = 2600) {
    const t = byId('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
  }
  app.toast = toast;

  /* ---------- Diálogos de personajes ---------- */
  const dialog = { tipIndex: 0 };
  app.say = (text, who) => {
    const mod = app.modules[app.current];
    const ch = who || (mod && mod.character);
    if (!ch) return;
    const d = byId('dialog');
    d.hidden = false;
    d.classList.remove('min');
    html('dlg-avatar', ch.avatar || '👩‍🔬');
    txt('dlg-name', ch.name);
    txt('dlg-role', ch.role || '');
    html('dlg-text', text);
    d.classList.remove('speak'); void d.offsetWidth; d.classList.add('speak');
  };
  app.nextTip = () => {
    const mod = app.modules[app.current];
    if (!mod || !mod.tips || !mod.tips.length) return;
    dialog.tipIndex = (dialog.tipIndex + 1) % mod.tips.length;
    const tip = mod.tips[dialog.tipIndex];
    app.say(typeof tip === 'function' ? tip() : tip);
  };

  /* =======================================================
     2. NAVEGACIÓN
     ======================================================= */
  function ensureBuilt(mod) {
    if (mod.built) return;
    mod.build(app);
    mod.built = true;
  }

  function go(id, push = true) {
    if (!app.modules[id]) id = 'lobby';
    const prev = app.modules[app.current];
    if (prev && prev.exit) prev.exit(app);
    const mod = app.modules[id];
    ensureBuilt(mod);
    app.current = id;
    document.body.classList.toggle('in-module', id !== 'lobby');
    document.body.dataset.mod = id;
    $$('.modnav a').forEach(a => a.classList.toggle('active', a.dataset.go === id));
    if (id !== 'lobby') app.visited.add(id);
    $$('.modnav a').forEach(a => a.classList.toggle('visited', app.visited.has(a.dataset.go)));
    byId('pg-fill').style.width = `${(app.visited.size / 5) * 100}%`;
    txt('pg-txt', `${app.visited.size}/5`);
    $$('.mod-ui').forEach(u => u.classList.toggle('on', u.dataset.mod === id));
    $$('.theory').forEach(u => u.classList.toggle('on', u.dataset.mod === id));
    txt('drawer-title', `Teoría · ${mod.title}`);
    byId('lobby-menu').hidden = !(id === 'lobby' && app.started);
    app.labels.showGroup(id);
    app.controls.autoRotate = 0;
    if (mod.view) app.controls.setView(mod.view);
    dialog.tipIndex = 0;
    if (mod.enter) mod.enter(app);
    if (mod.intro) app.say(typeof mod.intro === 'function' ? mod.intro(app) : mod.intro);
    document.title = id === 'lobby' ? 'HYDROLAB – Laboratorio Virtual de Hidrostática' : `${mod.title} · HYDROLAB`;
    if (push && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    setSheet('left');
  }
  app.go = go;

  function setSheet(which) {
    document.body.classList.toggle('sheet-left', which === 'left');
    document.body.classList.toggle('sheet-right', which === 'right');
    $$('.ht').forEach(b => b.classList.toggle('on', b.dataset.sheet === which));
  }

  function startExperience() {
    if (app.started) return;
    app.started = true;
    document.body.classList.remove('is-intro');
    byId('intro').classList.add('out');
    setTimeout(() => { byId('intro').hidden = true; }, 800);
    const lobby = app.modules.lobby;
    if (lobby.start) lobby.start(app);
    byId('lobby-menu').hidden = false;
    app.say(lobby.introAfterStart);
  }
  app.startExperience = startExperience;

  /* =======================================================
     3. INTERACCIÓN CON LA ESCENA (rayos, arrastre, cursor)
     ======================================================= */
  function rayFromEvent(e) {
    const r = app.renderer.canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
    return app.camera.ray(nx, ny);
  }
  app.rayFromEvent = rayFromEvent;

  function initPointer() {
    const canvas = app.renderer.canvas;
    let dragging = null;
    app.controls.onPick = e => {
      const mod = app.modules[app.current];
      if (!mod) return false;
      const ray = rayFromEvent(e);
      if (mod.characters && mod.characters.length) {
        const grab = mod.pointerDown && mod.hitTest ? mod.hitTest(ray) : null;
        const hit = grab ? null : HL.pick(ray, mod.characters.map(c => c.root), 0.1);
        if (hit) { app.nextTip(); return true; }
      }
      if (mod.pointerDown && mod.pointerDown(ray, e)) {
        dragging = mod;
        canvas.setPointerCapture(e.pointerId);
        canvas.classList.add('grabbing');
        const move = ev => dragging && dragging.pointerMove && dragging.pointerMove(rayFromEvent(ev), ev);
        const up = () => {
          if (dragging && dragging.pointerUp) dragging.pointerUp();
          dragging = null;
          canvas.classList.remove('grabbing');
          canvas.removeEventListener('pointermove', move);
          canvas.removeEventListener('pointerup', up);
          canvas.removeEventListener('pointercancel', up);
        };
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        return true;
      }
      return false;
    };
    canvas.addEventListener('pointermove', e => {
      if (dragging || e.buttons) return;
      const mod = app.modules[app.current];
      let cur = '';
      if (mod) {
        const ray = rayFromEvent(e);
        if (mod.hover) cur = mod.hover(ray) || '';
        if (!cur && mod.characters && mod.characters.length && HL.pick(ray, mod.characters.map(c => c.root), 0.1)) cur = 'pointer';
      }
      canvas.classList.toggle('grab', cur === 'grab');
      canvas.classList.toggle('pointer', cur === 'pointer');
    });
  }

  /* =======================================================
     4. BUCLE DE RENDERIZADO
     ======================================================= */
  function loop() {
    let last = performance.now();
    const perf = { n: 0, t: 0, checked: false };
    const frame = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Calidad adaptable: si la computadora no llega a ~24 cuadros por segundo, se simplifican sombras y resolución
      if (!perf.checked && app.time > 2) {
        perf.n++; perf.t += dt;
        if (perf.t > 3) {
          perf.checked = true;
          if (perf.n / perf.t < 24) { app.renderer.lowQuality = true; app.renderer.maxDpr = 1; console.info('[HYDROLAB] Modo de rendimiento activado'); }
        }
      }
      if (!document.hidden) {
        app.time += dt;
        const mod = app.modules[app.current];
        const asp = innerWidth / Math.max(1, innerHeight), mobile = innerWidth <= 900;
        app.controls.radiusScale = asp < 1.3 ? Math.pow(1.3 / asp, 0.85) : 1;
        app.camera.shiftY = mobile && document.body.classList.contains('in-module') ? 0.2 : 0;
        app.controls.update(dt);
        if (mod && mod.update) mod.update(dt, app.time, app);
        app.renderer.time = mod && mod.renderTime !== undefined ? mod.renderTime : app.time;
        if (mod && mod.scene) app.renderer.render(mod.scene, app.camera);
        app.labels.update(app.camera, innerWidth, innerHeight);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* =======================================================
     5. PANELES, TEORÍA, AYUDA, FÓRMULAS
     ======================================================= */
  function initUI() {
    document.addEventListener('click', e => {
      const g = e.target.closest('[data-go]');
      if (g) { e.preventDefault(); if (!app.started && g.dataset.go !== 'lobby') startExperience(); go(g.dataset.go); return; }
      const sh = e.target.closest('[data-sheet]');
      if (sh) { setSheet(sh.dataset.sheet); return; }
      const wi = e.target.closest('.whatif button');
      if (wi) {
        const sim = wi.closest('.whatif').dataset.sim;
        const mod = app.modules[sim];
        if (mod && mod.whatif && mod.whatif[wi.dataset.wi]) {
          $$('button', wi.closest('.whatif')).forEach(b => b.classList.toggle('on', b === wi));
          const ans = mod.whatif[wi.dataset.wi]();
          if (ans) app.say(ans);
        }
      }
    });
    byId('btn-start').addEventListener('click', startExperience);
    byId('btn-theory').addEventListener('click', () => {
      const d = byId('drawer');
      d.hidden = !d.hidden;
      byId('btn-theory').classList.toggle('on', !d.hidden);
    });
    byId('drawer-close').addEventListener('click', () => { byId('drawer').hidden = true; byId('btn-theory').classList.remove('on'); });
    byId('btn-view').addEventListener('click', () => {
      const mod = app.modules[app.current];
      if (mod && mod.resetView) mod.resetView(app); else if (mod && mod.view) app.controls.setView(mod.view);
    });
    byId('btn-help').addEventListener('click', () => { byId('help').hidden = false; });
    byId('help-close').addEventListener('click', () => { byId('help').hidden = true; });
    byId('help').addEventListener('click', e => { if (e.target.id === 'help') byId('help').hidden = true; });
    byId('dlg-next').addEventListener('click', app.nextTip);
    byId('dlg-min').addEventListener('click', () => byId('dialog').classList.toggle('min'));
    byId('dlg-text').addEventListener('click', () => byId('dialog').classList.toggle('open-full'));
    window.addEventListener('popstate', () => go(location.hash.slice(1) || 'lobby', false));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { byId('drawer').hidden = true; byId('help').hidden = true; byId('btn-theory').classList.remove('on'); }
    });

    // Resaltar variables de la fórmula en la escena 3D
    $$('.fcard [data-v], .f-legend [data-v]').forEach(el => {
      const on = state => {
        const mod = app.modules[app.current];
        const v = el.dataset.v;
        $$(`.mod-ui.on [data-v="${v}"]`).forEach(x => x.classList.toggle('hl', state));
        if (mod && mod.highlight) mod.highlight(v, state);
      };
      el.addEventListener('mouseenter', () => on(true));
      el.addEventListener('mouseleave', () => on(false));
    });
  }

  /* =======================================================
     6. VIDEO «ARQUÍMEDES EN ACCIÓN»
     ======================================================= */
  function initVideo() {
    const modal = byId('video-modal'), frame = byId('video-frame');
    let lastFocus = null;
    const ytId = url => { const m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/); return m ? m[1] : null; };
    function open() {
      lastFocus = document.activeElement;
      txt('video-title', VIDEO_CONFIG.titulo || 'ARQUÍMEDES EN ACCIÓN');
      const url = (VIDEO_CONFIG.url || '').trim();
      $$('.yt-fallback', modal).forEach(a => a.remove());
      frame.innerHTML = '';
      const yt = url && ytId(url);
      if (!url) {
        frame.innerHTML = `<div class="video-empty"><h4>🎬 El video todavía no está cargado</h4>
          <p>Abrí <code>script.js</code> y, al principio del archivo, completá <code>VIDEO_CONFIG.url</code> con la dirección de YouTube o con la ruta de tu MP4, por ejemplo <code>assets/video/arquimedes.mp4</code>.</p>
          <p>Las instrucciones completas están en <code>assets/video/LEEME.md</code>.</p></div>`;
      } else if (yt) {
        const ifr = document.createElement('iframe');
        ifr.src = `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`;
        ifr.title = VIDEO_CONFIG.titulo;
        ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        ifr.allowFullscreen = true;
        frame.appendChild(ifr);
        const a = document.createElement('a');
        a.className = 'yt-fallback'; a.href = `https://www.youtube.com/watch?v=${yt}`; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = '¿No se reproduce? Abrir el video en YouTube ↗';
        frame.after(a);
      } else {
        const v = document.createElement('video');
        v.src = url; v.controls = true; v.autoplay = true; v.playsInline = true; v.preload = 'metadata';
        if (VIDEO_CONFIG.portada) v.poster = VIDEO_CONFIG.portada;
        v.addEventListener('error', () => { frame.innerHTML = `<div class="video-empty"><h4>No se encontró el video</h4><p>Revisá que el archivo exista en <code>${url.replace(/</g, '&lt;')}</code> y que sea MP4 (H.264) o WebM.</p></div>`; });
        frame.appendChild(v);
      }
      modal.hidden = false;
      $('.modal-close', modal).focus();
    }
    function close() {
      modal.hidden = true; frame.innerHTML = '';
      $$('.yt-fallback', modal).forEach(a => a.remove());
      if (lastFocus) lastFocus.focus();
    }
    byId('video-open').addEventListener('click', open);
    modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });
  }

  /* =======================================================
     7. CUESTIONARIO (10 preguntas)
     ======================================================= */
  const QUIZ = [
    { q: '¿De qué depende la presión hidrostática que siente un buzo?', o: ['Del área de la pileta', 'De la densidad del agua, la gravedad y la profundidad', 'Del volumen total de agua', 'De la forma del recipiente'], a: 1, e: 'P = ρ·g·h. No depende del área, del volumen total ni de la forma del recipiente.' },
    { q: 'En el mismo líquido, si la profundidad se triplica, la presión hidrostática…', o: ['No cambia', 'Se duplica', 'Se triplica', 'Se multiplica por nueve'], a: 2, e: 'Con el triple de profundidad hay el triple de líquido encima, así que la presión también se triplica.' },
    { q: 'Dos sensores del mismo líquido en reposo están a la misma altura, separados 3 m en horizontal. ¿Qué se cumple?', o: ['P(A) > P(B)', 'P(A) = P(B)', 'P(A) < P(B)', 'Depende de la forma del recipiente'], a: 1, e: 'A la misma altura, los dos puntos tienen la misma cantidad de líquido encima: la presión es la misma.' },
    { q: 'En agua (ρ = 1000 kg/m³), el punto 2 está 3 m más abajo que el punto 1. ¿Cuánto vale P₂ − P₁?', o: ['−29 430 Pa', '3000 Pa', '29 430 Pa', '9810 Pa'], a: 2, e: 'P₂ − P₁ = ρ·g·(h₁ − h₂) = 1000 · 9,81 · 3 = 29 430 Pa. Es positiva porque el punto 2 está más abajo.' },
    { q: 'Una prensa tiene A₁ = 10 cm² y A₂ = 200 cm². Si aplicás F₁ = 50 N, ¿cuánto vale F₂?', o: ['2,5 N', '250 N', '1000 N', '10 000 N'], a: 2, e: 'F₂ = F₁·A₂/A₁ = 50 · 200/10 = 1000 N. La fuerza se multiplica por 20.' },
    { q: 'Con A₂ = 10·A₁, el pistón pequeño baja 20 cm. ¿Cuánto sube el grande?', o: ['200 cm', '20 cm', '10 cm', '2 cm'], a: 3, e: 'El líquido no se comprime: A₁·d₁ = A₂·d₂ ⇒ d₂ = 20 cm / 10 = 2 cm.' },
    { q: '¿Una prensa hidráulica «crea» energía al multiplicar la fuerza?', o: ['Sí, la energía de salida es mayor', 'No: en el caso ideal el trabajo de entrada es igual al de salida', 'Sí, si el fluido es aceite', 'No, porque la fuerza de salida es menor'], a: 1, e: 'F₁·d₁ = F₂·d₂. Se gana fuerza a costa de desplazamiento; la energía se conserva.' },
    { q: 'El empuje sobre un objeto totalmente sumergido depende de…', o: ['La densidad y la masa del objeto', 'La densidad del líquido y el volumen del objeto', 'La profundidad a la que está', 'El material del recipiente'], a: 1, e: 'E = ρ_fluido·g·V_sumergido. Es la diferencia entre la presión que el líquido hace desde abajo y desde arriba.' },
    { q: 'Un bloque de 600 kg/m³ flota en agua dulce. ¿Qué parte queda sumergida?', o: ['40 %', '60 %', '100 %', '6 %'], a: 1, e: 'Al flotar, E = P ⇒ V_sum/V = 600/1000 = 60 %.' },
    { q: 'Un barco pasa del mar (1025 kg/m³) a un río (1000 kg/m³). ¿Qué le pasa?', o: ['Se hunde un poco más', 'Sube un poco', 'No cambia nada', 'Se hunde por completo'], a: 0, e: 'En agua menos densa, para lograr el mismo empuje (igual al peso) necesita desplazar más volumen: el calado aumenta.' }
  ];

  function initQuiz() {
    let i = 0, score = 0, answered = false;
    const res = [];
    const body = byId('q-body'), next = byId('q-next'), dots = byId('q-dots');
    dots.innerHTML = QUIZ.map(() => '<span></span>').join('');
    const paint = () => {
      $$('span', dots).forEach((d, k) => { d.className = res[k] === true ? 'ok' : res[k] === false ? 'bad' : (k === i ? 'cur' : ''); });
      txt('q-score', `${score * 10} pts`);
    };
    const render = () => {
      answered = false; next.disabled = true; next.hidden = false;
      next.textContent = i === QUIZ.length - 1 ? 'Ver resultado →' : 'Siguiente →';
      const q = QUIZ[i];
      body.innerHTML = `<span class="q-num">Pregunta ${i + 1} de ${QUIZ.length}</span><p class="q-text">${q.q}</p>
        <div class="q-opts">${q.o.map((o, k) => `<button type="button" class="q-opt" data-k="${k}" style="--i:${k}"><i>${'ABCD'[k]}</i><span>${o}</span></button>`).join('')}</div><div id="q-fb"></div>`;
      paint();
    };
    body.addEventListener('click', e => {
      const b = e.target.closest('.q-opt');
      if (!b || answered) return;
      answered = true;
      const k = +b.dataset.k, q = QUIZ[i], ok = k === q.a;
      res[i] = ok; if (ok) score++;
      $$('.q-opt', body).forEach(x => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      html('q-fb', `<div class="q-fb"><b>${ok ? '✓ ¡Correcto!' : '✗ No es correcto.'}</b> ${q.e}</div>`);
      next.disabled = false; paint();
    });
    next.addEventListener('click', () => {
      if (i < QUIZ.length - 1) { i++; render(); return; }
      next.hidden = true;
      const pct = score / QUIZ.length;
      body.innerHTML = `<div class="q-final"><b>${score}/${QUIZ.length}</b><p>${pct === 1 ? '¡Puntaje perfecto! Sos investigador/a hidrostático/a.' : pct >= 0.7 ? 'Muy buen trabajo. Revisá las que fallaste y volvé a intentar.' : 'Volvé a los escenarios y probá los «¿Qué sucede si…?».'}</p><button type="button" class="tb play" id="q-retry">↺ Reintentar</button></div>`;
      byId('q-retry').addEventListener('click', () => { i = 0; score = 0; res.length = 0; render(); });
      paint();
    });
    render();
  }

  /* =======================================================
     8. PROBLEMAS NUMÉRICOS ALEATORIOS
     ======================================================= */
  function parseNum(s) {
    s = String(s).trim().replace(/\s/g, '');
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    return parseFloat(s);
  }
  app.parseNum = parseNum;

  function initProblems() {
    const rnd = (a, b, d = 0) => { const f = 10 ** d; return Math.round((a + Math.random() * (b - a)) * f) / f; };
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const FL = [{ n: 'agua dulce', r: 1000 }, { n: 'agua de mar', r: 1025 }, { n: 'aceite', r: 920 }, { n: 'glicerina', r: 1260 }];
    const GENS = [
      () => { const f = pick(FL), h = rnd(2, 40, 1), abs = Math.random() < 0.5, P = f.r * G * h, ans = (abs ? PATM + P : P) / 1000;
        return { type: 'Presión estática', text: `Un buzo desciende a ${fmt(h, 1)} m de profundidad en ${f.n} (ρ = ${fmt(f.r)} kg/m³).`, ask: abs ? '¿Qué presión absoluta soporta? (P_atm = 101 325 Pa)' : '¿Qué presión hace el líquido?', unit: 'kPa', ans,
          sol: abs ? `P<sub>abs</sub> = 101 325 + ${fmt(f.r)}·9,81·${fmt(h, 1)} = ${fmt(PATM + P, 0)} Pa = <b>${fmtFixed(ans, 2)} kPa</b>` : `P = ρ·g·h = ${fmt(f.r)}·9,81·${fmt(h, 1)} = ${fmt(P, 0)} Pa = <b>${fmtFixed(ans, 2)} kPa</b>` }; },
      () => { const f = pick(FL); let h1 = rnd(4, 9, 1), h2 = rnd(0, 3.5, 1); if (Math.random() < 0.35) [h1, h2] = [h2, h1];
        const P1k = rnd(105, 250, 1), P2 = P1k * 1000 + f.r * G * (h1 - h2), ans = P2 / 1000;
        return { type: 'Teorema general', text: `En un tanque con ${f.n} (ρ = ${fmt(f.r)} kg/m³), el punto 1 está a h₁ = ${fmt(h1, 1)} m y el punto 2 a h₂ = ${fmt(h2, 1)} m sobre el fondo. P₁ = ${fmt(P1k, 1)} kPa.`, ask: '¿Cuál es la presión en el punto 2?', unit: 'kPa', ans,
          sol: `P₂ = P₁ + ρ·g·(h₁ − h₂) = ${fmt(P1k * 1000, 0)} + ${fmt(f.r)}·9,81·(${fmt(h1, 1)} − ${fmt(h2, 1)}) = ${fmt(P2, 0)} Pa = <b>${fmtFixed(ans, 2)} kPa</b>` }; },
      () => { const F1 = rnd(20, 500), A1 = rnd(2, 20), A2 = rnd(60, 900), ans = F1 * A2 / A1;
        return { type: 'Prensa hidráulica', text: `Sobre el pistón pequeño (A₁ = ${A1} cm²) se aplican ${F1} N. El pistón grande tiene A₂ = ${A2} cm².`, ask: '¿Qué fuerza se obtiene en el pistón grande?', unit: 'N', ans,
          sol: `F₂ = F₁·A₂/A₁ = ${F1}·${A2}/${A1} = <b>${fmt(ans, 2)} N</b>.` }; },
      () => { const d1 = rnd(10, 40), A1 = rnd(2, 10), A2 = A1 * pick([5, 8, 10, 20, 25]), ans = d1 * A1 / A2;
        return { type: 'Conservación de la energía', text: `En una prensa ideal con A₁ = ${A1} cm² y A₂ = ${A2} cm², el pistón pequeño baja ${d1} cm.`, ask: '¿Cuánto sube el pistón grande?', unit: 'cm', ans,
          sol: `A₁·d₁ = A₂·d₂ ⇒ d₂ = ${d1}·${A1}/${A2} = <b>${fmt(ans, 3)} cm</b>.` }; },
      () => { const f = pick(FL), V = rnd(1, 50), ans = f.r * G * V / 1000;
        return { type: 'Principio de Arquímedes', text: `Un bloque de hierro de ${V} L está totalmente sumergido en ${f.n} (ρ = ${fmt(f.r)} kg/m³).`, ask: '¿Qué empuje recibe?', unit: 'N', ans,
          sol: `E = ρ<sub>fluido</sub>·g·V = ${fmt(f.r)}·9,81·${fmt(V / 1000, 3)} = <b>${fmt(ans, 2)} N</b>.` }; },
      () => { const f = pick(FL), r = pick([240, 500, 870, 917]), rr = r >= f.r ? 500 : r, ans = rr / f.r * 100;
        return { type: 'Principio de Arquímedes', text: `Un objeto de densidad ${fmt(rr)} kg/m³ flota en ${f.n} (ρ = ${fmt(f.r)} kg/m³).`, ask: '¿Qué porcentaje de su volumen queda sumergido?', unit: '%', ans,
          sol: `En flotación E = P ⇒ V<sub>sum</sub>/V = ${fmt(rr)}/${fmt(f.r)} = <b>${fmtFixed(ans, 2)} %</b>.` }; }
    ];
    let cur = null, solved = 0, done = false;
    const input = byId('pb-answer'), fb = byId('pb-feedback');
    const fresh = () => {
      let g; do { g = pick(GENS)(); } while (cur && g.type === cur.type && Math.random() < 0.6);
      cur = g; done = false;
      txt('pb-type', cur.type); txt('pb-statement', cur.text); txt('pb-ask', cur.ask); txt('pb-unit', cur.unit);
      input.value = ''; fb.className = 'm-fb'; fb.innerHTML = '';
    };
    const check = () => {
      const v = parseNum(input.value);
      if (!Number.isFinite(v)) { fb.className = 'm-fb bad'; fb.innerHTML = 'Escribí un número (podés usar coma o punto).'; return; }
      const err = Math.abs(v - cur.ans) / Math.max(Math.abs(cur.ans), 1e-9);
      if (err <= 0.01) { if (!done) { solved++; done = true; txt('pb-score', String(solved)); } fb.className = 'm-fb ok'; fb.innerHTML = `<b>✓ ¡Correcto!</b> ${cur.sol}`; }
      else { fb.className = 'm-fb bad'; fb.innerHTML = `<b>Todavía no</b> (error del ${fmtFixed(err * 100, 1)} %). Revisá las unidades o mirá la solución.`; }
    };
    byId('pb-check').addEventListener('click', check);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    byId('pb-new').addEventListener('click', fresh);
    byId('pb-solution').addEventListener('click', () => { fb.className = 'm-fb'; fb.innerHTML = `<b>Solución:</b> ${cur.sol}`; done = true; });
    fresh();
  }

  /* =======================================================
     9. ARRANQUE
     ======================================================= */
  function start() {
    const canvas = byId('gl');
    const low = (navigator.hardwareConcurrency || 4) <= 4 || /Mobi|Android/i.test(navigator.userAgent);
    try {
      app.renderer = new HL.Renderer(canvas, { maxDpr: low ? 1.25 : 1.6, shadowSize: low ? 1024 : 2048 });
    } catch (err) {
      console.warn(err);
      byId('loading').hidden = true;
      byId('nogl').hidden = false;
      return;
    }
    app.camera = new HL.Camera(45);
    app.controls = new HL.OrbitControls(app.camera, canvas);
    app.labels = new HL.Labels(byId('labels'));
    initUI();
    initPointer();
    initVideo();
    initQuiz();
    initProblems();

    const fill = byId('ld-fill');
    // Al inicio solo se construye el laboratorio principal (y el módulo pedido en la URL).
    // Los demás escenarios se arman la primera vez que se visitan: la página carga más rápido.
    const target0 = location.hash.slice(1);
    const order = ['lobby'].concat(app.modules[target0] && target0 !== 'lobby' ? [target0] : []);
    let k = 0;
    // Se construyen los escenarios de a uno para que la carga se vea fluida
    const buildNext = () => {
      const mod = app.modules[order[k]];
      txt('ld-text', `Preparando: ${mod.title}…`);
      ensureBuilt(mod);
      k++;
      fill.style.width = `${(k / order.length) * 100}%`;
      if (k < order.length) setTimeout(buildNext, 30);
      else {
        const target = location.hash.slice(1);
        if (target && target !== 'lobby' && app.modules[target]) {
          app.started = true;
          document.body.classList.remove('is-intro');
          byId('intro').hidden = true;
          if (app.modules.lobby.start) app.modules.lobby.start(app, true);
          go(target, false);
        } else {
          go('lobby', false);
        }
        loop();
        setTimeout(() => byId('loading').classList.add('done'), 250);
        setTimeout(() => { byId('loading').hidden = true; }, 900);
      }
    };
    setTimeout(buildNext, 30);
  }

  app.start = start;
  return app;
})();
