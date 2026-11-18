/* =========================================================
   HYDROLAB 3D · Desafío final – Misiones de ingeniería
   Sala de control con un tanque de pruebas y tres sensores.
   Seis misiones con datos nuevos, respuestas, explicaciones
   y puntaje. Incluye el cuestionario y los problemas aleatorios.
   ========================================================= */
'use strict';

(() => {
  const A = HYDROLAB;
  const { fmt, fmtFixed, fmtPa, fmtkPa, fmtN, txt, html, clamp, G, PATM } = A;
  const TW = 9, TH = 6.5, TD = 3, BASE = 0.08;
  const rnd = (a, b, d = 0) => { const f = 10 ** d; return Math.round((a + Math.random() * (b - a)) * f) / f; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const FL = [{ n: 'agua dulce', r: 1000 }, { n: 'agua de mar', r: 1025 }, { n: 'aceite', r: 920 }];

  /* ---------- Generadores de misiones ---------- */
  const MISSIONS = [
    () => {
      const f = pick(FL), h = rnd(4, 35, 1), P = f.r * G * h;
      return { tag: 'Presión estática', title: '¿A qué profundidad está el buzo?', short: 'Profundidad del buzo',
        text: `El manómetro de un buzo marca que el ${f.n} (ρ = ${fmt(f.r)} kg/m³) le hace una presión de <b>${fmtkPa(P)}</b> (sin contar el aire). ¿A qué profundidad está?`,
        unit: 'm', ans: h, hint: 'Despejá h de P = ρ·g·h: h = P / (ρ·g). Pasá los kPa a Pa (× 1000).',
        sol: `h = P / (ρ·g) = ${fmt(P, 0)} / (${fmt(f.r)} · 9,81) = <b>${fmtFixed(h, 2)} m</b>.` };
    },
    () => {
      const f = pick(FL);
      let hs;
      do { hs = [rnd(0.6, 5.8, 1), rnd(0.6, 5.8, 1), rnd(0.6, 5.8, 1)]; } while (Math.min(...hs) === [...hs].sort((a, b) => a - b)[1] || Math.abs(hs[0] - hs[1]) < 0.3 || Math.abs(hs[1] - hs[2]) < 0.3 || Math.abs(hs[0] - hs[2]) < 0.3);
      const xs = [-3, 0, 3].sort(() => Math.random() - 0.5);
      const low = hs.indexOf(Math.min(...hs));
      const L = ['A', 'B', 'C'];
      return { tag: 'Teorema general', title: '¿Qué sensor registra mayor presión?', short: 'Sensor con más presión', choice: L, ans: L[low], sensors: hs.map((h, i) => ({ h, x: xs[i] })), rho: f.r,
        text: `En el tanque de la sala hay ${f.n} y tres sensores: A, B y C. Mirá sus alturas en la escala del tanque (o en las etiquetas) y elegí el que mide <b>más presión</b>. Podés hacer clic sobre el sensor en la escena.`,
        hint: 'No importa la posición horizontal: solo la altura. El que está más abajo tiene más líquido encima.',
        sol: `El sensor <b>${L[low]}</b> está más abajo (h = ${fmtFixed(hs[low], 1)} m), así que tiene más líquido encima y más presión. Alturas: A ${fmtFixed(hs[0], 1)} m · B ${fmtFixed(hs[1], 1)} m · C ${fmtFixed(hs[2], 1)} m.` };
    },
    () => {
      const f = pick(FL), h1 = rnd(3.5, 6, 1), h2 = rnd(0.5, 3, 1), dP = f.r * G * (h1 - h2);
      return { tag: 'Teorema general', title: 'Diferencia de presión entre sensores', short: 'Diferencia de presión', sensors: [{ h: h1, x: -2.5 }, { h: h2, x: 2.5 }, null], rho: f.r,
        text: `El sensor A está a h₁ = ${fmtFixed(h1, 1)} m y el sensor B a h₂ = ${fmtFixed(h2, 1)} m del fondo del tanque, que tiene ${f.n} (ρ = ${fmt(f.r)} kg/m³). ¿Cuánto más presión mide B que A?`,
        unit: 'Pa', ans: dP, hint: 'Usá P₂ − P₁ = ρ·g·(h₁ − h₂).',
        sol: `P_B − P_A = ρ·g·(h₁ − h₂) = ${fmt(f.r)} · 9,81 · (${fmtFixed(h1, 1)} − ${fmtFixed(h2, 1)}) = <b>${fmtPa(dP)}</b>.` };
    },
    () => {
      const m = pick([950, 1200, 1350, 1600, 2100]), A1 = pick([4, 5, 6, 8, 10]), A2 = pick([400, 500, 600, 800, 1000]);
      const F1 = m * G * A1 / A2;
      return { tag: 'Prensa hidráulica', title: 'Fuerza para levantar un auto', short: 'Levantar un auto',
        text: `En un taller, un elevador hidráulico tiene un pistón chico de <b>${A1} cm²</b> y un pistón grande de <b>${A2} cm²</b>. ¿Qué fuerza mínima hay que hacer sobre el pistón chico para sostener un auto de <b>${m} kg</b>?`,
        unit: 'N', ans: F1, hint: 'Primero calculá el peso del auto (m·g). Después usá F₁/A₁ = F₂/A₂ y despejá F₁.',
        sol: `Peso = ${m} · 9,81 = ${fmtN(m * G)}. F₁ = F₂ · A₁/A₂ = ${fmt(m * G, 1)} · ${A1}/${A2} = <b>${fmt(F1, 1)} N</b>.` };
    },
    () => {
      const L = pick([20, 24, 30]), B = pick([6, 8]), H = pick([2, 2.5, 3]), m0 = pick([60, 80, 100, 120]), f = pick(FL.slice(0, 2));
      const cap = f.r * L * B * H / 1000 - m0;
      return { tag: 'Principio de Arquímedes', title: '¿Cuánta carga lleva sin hundirse?', short: 'Carga máxima de una barcaza',
        text: `Una barcaza con forma de caja mide ${L} m de largo, ${B} m de ancho y ${H} m de alto. Vacía pesa <b>${m0} t</b> y navega en ${f.n} (ρ = ${fmt(f.r)} kg/m³). ¿Cuántas toneladas de carga puede llevar como máximo sin hundirse?`,
        unit: 't', ans: cap, hint: 'Con el casco entero bajo el agua desplaza V = largo · ancho · alto. La masa máxima que puede flotar es ρ·V. Restale la masa de la barcaza.',
        sol: `V = ${L}·${B}·${H} = ${fmt(L * B * H)} m³. Masa máxima que flota = ρ·V = ${fmt(f.r)} · ${fmt(L * B * H)} = ${fmt(f.r * L * B * H)} kg = ${fmt(f.r * L * B * H / 1000, 1)} t. Carga máxima = ${fmt(f.r * L * B * H / 1000, 1)} − ${m0} = <b>${fmt(cap, 1)} t</b>.` };
    },
    () => {
      const V = rnd(0.8, 4, 1), rc = 2400, f = pick(FL.slice(0, 2));
      const T = (rc - f.r) * G * V;
      return { tag: 'Principio de Arquímedes', title: 'La grúa baja un bloque al agua', short: 'Fuerza del cable de la grúa',
        text: `Una grúa del puerto baja un bloque de hormigón (ρ = 2400 kg/m³) de <b>${fmtFixed(V, 1)} m³</b> hasta que queda totalmente sumergido en ${f.n} (ρ = ${fmt(f.r)} kg/m³). ¿Qué fuerza hace el cable, en kN?`,
        unit: 'kN', ans: T / 1000, hint: 'El cable sostiene el peso menos el empuje: T = P − E = ρ_bloque·g·V − ρ_agua·g·V.',
        sol: `P = 2400 · 9,81 · ${fmtFixed(V, 1)} = ${fmtN(rc * G * V)}. E = ${fmt(f.r)} · 9,81 · ${fmtFixed(V, 1)} = ${fmtN(f.r * G * V)}. T = P − E = ${fmt(T, 0)} N = <b>${fmtFixed(T / 1000, 2)} kN</b>. El agua «ayuda» a sostener el bloque.` };
    }
  ];

  const M = {
    id: 'desafio',
    title: 'Desafío final',
    character: { name: 'Ing. Valentina Ruiz', role: 'Evaluadora del laboratorio', avatar: '👩‍🔬' },
    view: { target: [0, 3.2, 0], radius: 17, theta: 0.12, phi: 1.32, minR: 5, maxR: 40, maxPhi: 1.58 },
    intro: 'Llegó el momento de demostrar lo aprendido. Tenés <b>seis misiones de ingeniería</b>. Cada una vale 100 puntos al primer intento y 50 si acertás después. ¡Suerte!',
    tips: [
      'Si te trabás, tocá <b>Pista</b>: no resta puntos. Si mirás la solución, esa misión no suma.',
      'En la misión de los sensores podés <b>hacer clic sobre el sensor</b> directamente en el tanque.',
      'Podés usar coma o punto decimal. Se acepta un error de hasta el 1 %.',
      'También tenés el <b>cuestionario</b> de 10 preguntas y <b>problemas aleatorios</b> en las pestañas de la izquierda.'
    ],
    list: [], cur: 0, points: 0,

    build(app) {
      const S3 = this.scene = HL.makeScene({ top: '#221446', bottom: '#05040f', fogNear: 30, fogFar: 80, shadowExtent: 12, shadowCenter: [0, 2, 0] });
      const R = S3.root;
      const { MAT, G: GG, geo, Mesh, material: Mt } = HL;
      R.add(HL.labRoom(44, 32, 12, { neon: MAT.neonPink }));
      R.add(HL.glassTank(TW, TH + 0.6, TD, { frame: 0.14, neon: MAT.neonPink }));
      this.water = HL.waterBody(TW - 0.15, TD - 0.15, { color: '#2e86de', wave: 0.03, waveScale: 2.5, opacity: 0.38 });
      this.water.setLevel(BASE + TH, BASE);
      R.add(this.water.node);
      const ticks = [];
      for (let k = 0; k <= TH * 2; k++) ticks.push({ g: GG.box, p: [-TW / 2 - 0.1, BASE + k * 0.5, TD / 2 + 0.1], s: [k % 2 ? 0.22 : 0.45, 0.05, 0.05] });
      R.add(new Mesh(geo.merge(ticks), MAT.neonCyan));
      for (let k = 0; k <= TH; k++) app.labels.add(`<span class="tick3d">${k} m</span>`, () => [-TW / 2 - 0.45, BASE + k, TD / 2 + 0.1], { group: 'desafio', cls: 'r' });
      R.add(new Mesh(GG.box, MAT.steelDark).set([0, TH + 1.4, 0], [0, 0, 0], [TW + 1.2, 0.3, 0.4]));
      const cols = ['#56d8ff', '#8b6cff', '#ff5fb8'];
      this.sensors = cols.map((c, i) => {
        const n = new HL.Node('sensor' + 'ABC'[i]);
        n.add(new Mesh(GG.sphere, Mt({ color: '#d8deea', spec: 1.2, shininess: 120 })).set([0, 0, 0], [0, 0, 0], [0.22, 0.27, 0.22]));
        n.add(new Mesh(geo.torus(0.25, 0.03, 28, 6), Mt({ type: 'unlit', color: '#000', emissive: c, emissiveIntensity: 1.8 })).set([0, 0, 0], [Math.PI / 2, 0, 0]));
        n.userData.pickPad = 0.3;
        const cable = new Mesh(GG.cylLow, MAT.rubber);
        R.add(n, cable);
        const lbl = app.labels.add(`<span class="tag3d" style="border-color:${c}">Sensor ${'ABC'[i]}<b class="sh" id="de-sh${i}"></b></span>`, () => n.worldPos([0.35, 0, 0]), { group: 'desafio', cls: 'l' });
        return { node: n, cable, lbl, h: 2 + i, x: -3 + 3 * i, hd: 2 + i, xd: -3 + 3 * i, on: true };
      });
      // Pantalla grande y consolas
      R.add(new Mesh(GG.box, MAT.panel).set([0, 6.2, -15.3], [0, 0, 0], [12, 5, 0.2]));
      R.add(new Mesh(GG.box, Mt({ type: 'unlit', color: '#000', emissive: '#1a1450', emissiveIntensity: 1 })).set([0, 6.2, -15.18], [0, 0, 0], [11.4, 4.4, 0.02]));
      app.labels.add('<div class="station3d" id="de-screen" style="font-size:16px">MISIÓN</div>', () => [0, 6.6, -15], { group: 'desafio' });
      [[-7, 4, 0.6], [7, 4, -0.6]].forEach(([x, z, r]) => { const c = HL.console3d(2.2, '#ff5fb8'); c.set([x, 0, z], [0, r, 0]); R.add(c); });
      [-16, 16].forEach(x => { const r = HL.rack(); r.set([x, 0, -10]); R.add(r); });
      this.eng = HL.characters.ingeniera();
      this.eng.root.set([5.6, 0, 3.6], [0, -0.6, 0]);
      this.eng.pose = 'talk';
      R.add(this.eng.root);
      this.characters = [this.eng];
      app.labels.add('<span class="name3d">Valentina · evaluadora</span>', () => this.eng.root.worldPos([0, 2.05, 0]), { group: 'desafio' });
      S3.pointLights = [{ pos: [0, 7, 4], color: HL.color('#ff5fb8'), intensity: 3 }, { pos: [-4, 3, 4], color: HL.color('#56d8ff'), intensity: 3 }];

      // Interfaz de misiones
      A.byId('m-check').addEventListener('click', () => this.check());
      A.byId('m-input').addEventListener('keydown', e => { if (e.key === 'Enter') this.check(); });
      A.byId('m-hint').addEventListener('click', () => { const m = this.list[this.cur]; this.fb(`💡 <b>Pista:</b> ${m.hint}`, ''); });
      A.byId('m-solve').addEventListener('click', () => { const m = this.list[this.cur]; if (m.status !== 'ok') m.status = 'seen'; this.fb(`<b>Solución:</b> ${m.sol}`, ''); this.paintList(); });
      A.byId('m-next').addEventListener('click', () => this.open((this.cur + 1) % this.list.length));
      A.byId('de-restart').addEventListener('click', () => this.newSet());
      A.byId('mission-list').addEventListener('click', e => { const li = e.target.closest('li'); if (li) this.open(+li.dataset.i); });
      A.byId('m-choices').addEventListener('click', e => { const b = e.target.closest('button'); if (b) this.answerChoice(b.dataset.v); });
      A.$$('[data-detab]').forEach(b => b.addEventListener('click', () => {
        A.$$('[data-detab]').forEach(x => x.classList.toggle('on', x === b));
        ['missions', 'quiz', 'problems'].forEach(k => { A.byId('de-' + k).hidden = k !== b.dataset.detab; });
        document.body.classList.add('sheet-right');
      }));
      this.newSet();
    },

    newSet() {
      this.list = MISSIONS.map(g => Object.assign(g(), { status: '', tries: 0 }));
      this.points = 0;
      this.open(0);
    },

    paintList() {
      const done = this.list.filter(m => m.status === 'ok').length;
      txt('de-points', String(this.points));
      txt('de-done', `${done}/${this.list.length}`);
      html('mission-list', this.list.map((m, i) => `<li data-i="${i}" class="${i === this.cur ? 'cur' : ''} ${m.status}">${m.short}<span>${m.status === 'ok' ? `+${m.earned}` : m.status === 'seen' ? 'vista' : ''}</span></li>`).join(''));
    },

    open(i) {
      this.cur = i;
      const m = this.list[i];
      txt('m-tag', `Misión ${i + 1} · ${m.tag}`);
      txt('m-title', m.title);
      html('m-text', m.text);
      A.byId('m-input').value = '';
      txt('m-unit', m.unit || '');
      A.byId('m-input').parentElement.hidden = !!m.choice;
      const ch = A.byId('m-choices');
      ch.hidden = !m.choice;
      ch.innerHTML = m.choice ? m.choice.map(c => `<button type="button" data-v="${c}">${c}</button>`).join('') : '';
      A.byId('m-check').hidden = !!m.choice;
      this.fb(m.status === 'ok' ? `✔ Ya la resolviste (+${m.earned}). ${m.sol}` : '', m.status === 'ok' ? 'ok' : '');
      const s = m.sensors || [{ h: 4.6, x: -3 }, { h: 3.2, x: 0 }, { h: 1.6, x: 3 }];
      this.sensors.forEach((se, k) => {
        const d = s[k];
        se.on = !!d;
        if (d) { se.h = d.h; se.x = d.x; }
      });
      this.water.setColor(m.rho === 920 ? '#e8b93a' : m.rho === 1025 ? '#1f8fb0' : '#2e86de');
      A.byId('de-screen').innerHTML = `MISIÓN ${i + 1}<small>${m.title}</small>`;
      this.paintList();
    },

    fb(h, cls) { const f = A.byId('m-fb'); f.className = 'm-fb ' + (cls || ''); f.innerHTML = h; },

    award(m) {
      m.earned = m.tries === 0 ? 100 : 50;
      if (m.status === 'seen') m.earned = 0;
      m.status = 'ok';
      this.points += m.earned;
      this.paintList();
      const all = this.list.every(x => x.status === 'ok' || x.status === 'seen');
      if (all) {
        const max = this.list.length * 100;
        const lvl = this.points >= max * 0.9 ? '🏆 Ingeniero/a hidráulico/a senior' : this.points >= max * 0.6 ? '🥈 Ingeniero/a hidráulico/a' : '🥉 Técnico/a de laboratorio';
        setTimeout(() => A.say(`<b>¡Completaste todas las misiones!</b> Puntaje final: <b>${this.points} de ${max}</b>. Nivel: ${lvl}. Podés pedir «Nuevas misiones» para jugar con otros datos.`), 600);
      }
    },

    check() {
      const m = this.list[this.cur];
      if (m.choice || m.status === 'ok') return;
      const v = A.parseNum(A.byId('m-input').value);
      if (!Number.isFinite(v)) { this.fb('Escribí un número (podés usar coma o punto).', 'bad'); return; }
      const err = Math.abs(v - m.ans) / Math.max(Math.abs(m.ans), 1e-9);
      if (err <= 0.01) {
        this.award(m);
        this.fb(`<b>✔ ¡Correcto! +${m.earned} puntos.</b> ${m.sol}`, 'ok');
        A.say(pick(['¡Excelente cálculo!', '¡Perfecto! Así se resuelve.', '¡Muy bien! Esa es la respuesta.']));
      } else {
        m.tries++;
        this.fb(`<b>✗ Todavía no</b> (te desviaste un ${fmtFixed(err * 100, 1)} %). Revisá las unidades o pedí una pista.`, 'bad');
      }
    },

    answerChoice(v) {
      const m = this.list[this.cur];
      if (m.status === 'ok') return;
      const btn = A.$(`#m-choices button[data-v="${v}"]`);
      if (v === m.ans) {
        if (btn) btn.classList.add('right');
        this.award(m);
        this.fb(`<b>✔ ¡Correcto! +${m.earned} puntos.</b> ${m.sol}`, 'ok');
      } else {
        m.tries++;
        if (btn) { btn.classList.remove('wrong'); void btn.offsetWidth; btn.classList.add('wrong'); }
        this.fb('<b>✗ No es ese.</b> Fijate cuál está más abajo en el tanque.', 'bad');
      }
    },

    hitTest(ray) {
      const m = this.list[this.cur];
      if (!m || !m.choice) return null;
      return HL.pick(ray, this.sensors.filter(s => s.on).map(s => s.node), 0.3);
    },
    hover(ray) { return this.hitTest(ray) ? 'pointer' : null; },
    pointerDown(ray) {
      const h = this.hitTest(ray);
      if (!h) return false;
      const i = this.sensors.findIndex(s => s.node === h.node);
      this.answerChoice('ABC'[i]);
      return true;
    },

    enter() { document.body.classList.add('sheet-right'); },
    exit() {},

    update(dt, t) {
      const m = this.list[this.cur];
      this.sensors.forEach((s, i) => {
        s.node.visible = s.on;
        s.cable.visible = s.on;
        s.lbl.visible = s.on;
        if (!s.on) return;
        s.hd += (s.h - s.hd) * Math.min(1, dt * 4);
        s.xd += (s.x - s.xd) * Math.min(1, dt * 4);
        const y = BASE + s.hd;
        s.node.set([s.xd, y, 0], [0, t + i, 0], [1, 1, 1]);
        const top = TH + 1.25;
        s.cable.set([s.xd, (y + 0.27 + top) / 2, 0], [0, 0, 0], [0.03, Math.max(0.01, top - y - 0.27), 0.03]);
        const el = A.byId('de-sh' + i);
        if (el) el.textContent = m && m.sensors ? ` · h = ${fmtFixed(s.h, 1)} m` : '';
      });
      this.eng.animate(t);
    }
  };
  A.register(M);
})();
