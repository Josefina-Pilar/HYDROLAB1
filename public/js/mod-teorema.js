/* =========================================================
   HYDROLAB 3D · Módulo 2 – Teorema general de la hidrostática
   Tanque industrial con dos sensores de presión móviles,
   escala de altura, indicadores digitales y comparación.
   ========================================================= */
'use strict';

(() => {
  const A = HYDROLAB;
  const { fmt, fmtFixed, fmtPa, fmtkPa, txt, html, clamp, round1, PATM, G } = A;
  const W = 14, DZ = 5, HMAX = 10, BASE = 0.08, XMAX = 6.3;
  const COL = { 1000: '#2e86de', 920: '#e8b93a', 1025: '#1f8fb0', 13534: '#c9ced8' };
  const NAME = { 1000: 'agua', 920: 'aceite', 1025: 'agua de mar', 13534: 'mercurio' };
  const liquidColor = r => COL[r] || (r > 5000 ? '#c9ced8' : r < 960 ? '#e8b93a' : '#2e86de');

  const M = {
    id: 'teorema',
    title: 'Teorema general',
    character: { name: 'Ing. Martín Sosa', role: 'Ingeniero de instrumentación', avatar: '👷' },
    view: { target: [1.6, 5.2, 0], radius: 26, theta: 0.2, phi: 1.36, minR: 6, maxR: 55, maxPhi: 1.6 },
    intro: 'Este tanque industrial tiene <b>10 m de líquido</b> y dos sensores de presión. <b>Arrastralos</b> a distintas alturas y mirá sus pantallas. Después tocá <b>COMPARAR PUNTOS</b>.',
    tips: [
      'Poné los dos sensores <b>a la misma altura</b> pero lejos uno del otro: van a marcar exactamente lo mismo.',
      'La <b>escala de la izquierda</b> mide la altura h desde el fondo. El teorema usa la diferencia h₁ − h₂.',
      'Las <b>láminas de colores</b> son superficies de igual presión: todo punto sobre ellas tiene la misma presión que su sensor.',
      'Con <b>mercurio</b> la misma diferencia de altura da una diferencia de presión 13,5 veces mayor.',
      'Tocá «▶ Comprobar el teorema» y seguí los tres pasos: el sistema te avisa cuando lo logres.'
    ],
    S: { rho: 1000, h1: 8, h2: 3, x1: -3.2, x2: 3.2, P1: 120945, auto: true, compared: false, guide: -1 },
    disp: { h1: 8, h2: 3, x1: -3.2, x2: 3.2 },

    build(app) {
      const S3 = this.scene = HL.makeScene({ top: '#1a1450', bottom: '#05040f', fogNear: 40, fogFar: 100, shadowExtent: 16, shadowCenter: [0, 4, 0] });
      const R = S3.root;
      const { MAT, G: GG, geo, Mesh, material: Mt } = HL;
      R.add(HL.labRoom(60, 44, 18, { neon: MAT.neonViolet }));
      R.add(HL.glassTank(W, HMAX + 0.9, DZ, { frame: 0.18, neon: MAT.neonViolet }));
      this.water = HL.waterBody(W - 0.18, DZ - 0.18, { color: '#2e86de', wave: 0.04, waveScale: 2, opacity: 0.38 });
      this.water.setLevel(BASE + HMAX, BASE);
      R.add(this.water.node);

      // Escala de altura
      const ticks = [];
      for (let k = 0; k <= 20; k++) ticks.push({ g: GG.box, p: [-W / 2 - 0.12, BASE + k * 0.5, DZ / 2 + 0.12], s: [k % 2 ? 0.25 : 0.5, 0.05, 0.05] });
      R.add(new Mesh(geo.merge(ticks), MAT.neonCyan));
      for (let k = 0; k <= 10; k++) app.labels.add(`<span class="tick3d">${k} m</span>`, () => [-W / 2 - 0.55, BASE + k, DZ / 2 + 0.12], { group: 'teorema', cls: 'r' });
      app.labels.add('<span class="tag3d sm">altura h desde el fondo</span>', () => [-W / 2 - 0.8, BASE + HMAX + 0.9, DZ / 2], { group: 'teorema', cls: 'r' });
      app.labels.add('<span class="tag3d sm">superficie libre · aire a 1 atm</span>', () => [W / 2 + 0.3, BASE + HMAX, DZ / 2], { group: 'teorema', cls: 'l' });
      app.labels.add('<span class="tag3d sm">nivel de referencia · h = 0</span>', () => [W / 2 + 0.3, BASE, DZ / 2], { group: 'teorema', cls: 'l' });

      // Pórtico superior con dos carros
      const top = HMAX + 1.9;
      R.add(new Mesh(GG.box, MAT.steelDark).set([0, top, 0], [0, 0, 0], [W + 1.6, 0.35, 0.5]));
      [-W / 2 - 0.6, W / 2 + 0.6].forEach(x => R.add(new Mesh(GG.box, MAT.steelDark).set([x, top / 2, 0], [0, 0, 0], [0.35, top, 0.5])));
      R.add(new Mesh(GG.box, MAT.neonViolet).set([0, top - 0.19, 0.26], [0, 0, 0], [W + 1.6, 0.03, 0.02]));

      const mkSensor = (col, n) => {
        const node = new HL.Node('sensor' + n);
        const neon = Mt({ type: 'unlit', color: '#000', emissive: col, emissiveIntensity: 1.8 });
        node.add(new Mesh(GG.sphere, Mt({ color: '#d8deea', spec: 1.2, shininess: 120, fresnel: 0.5 })).set([0, 0, 0], [0, 0, 0], [0.24, 0.3, 0.24]));
        const ring = new Mesh(geo.torus(0.27, 0.035, 32, 8), neon);
        node.add(ring);
        node.add(new Mesh(GG.sphere, neon).set([0, 0, 0.22], [0, 0, 0], 0.06));
        node.add(new Mesh(GG.cyl, MAT.steelDark).set([0, 0.36, 0], [0, 0, 0], [0.06, 0.2, 0.06]));
        node.userData = { ring, neon, pickPad: 0.35 };
        const cart = new Mesh(GG.box, Mt({ color: col, spec: 0.6, emissive: col, emissiveIntensity: 0.2 }));
        const cable = new Mesh(GG.cylLow, MAT.rubber);
        const iso = new Mesh(GG.box, Mt({ color: col, opacity: 0.13, emissive: col, emissiveIntensity: 0.35, depthWrite: false, doubleSide: true }));
        iso.castShadow = false;
        R.add(node, cart, cable, iso);
        return { node, cart, cable, iso, ring, neon };
      };
      this.s1 = mkSensor('#8b6cff', 1);
      this.s2 = mkSensor('#ff5fb8', 2);
      this.band = new Mesh(GG.box, Mt({ color: '#ff5fb8', opacity: 0.2, emissive: '#ff5fb8', emissiveIntensity: 0.4, depthWrite: false, doubleSide: true }));
      this.band.castShadow = false;
      this.band.visible = false;
      R.add(this.band);

      app.labels.add('<span class="digi vi" id="te-d1"><small>SENSOR 1</small>—</span>', () => [this.disp.x1, top + 0.9, 0], { group: 'teorema' });
      app.labels.add('<span class="digi pk" id="te-d2"><small>SENSOR 2</small>—</span>', () => [this.disp.x2, top + 0.9, 0], { group: 'teorema' });
      this.lbl1 = app.labels.add('<span class="tag3d vi" id="te-t1">P₁</span>', () => [this.disp.x1 - 0.45, BASE + this.disp.h1, DZ / 2 - 0.4], { group: 'teorema', cls: 'r' });
      this.lbl2 = app.labels.add('<span class="tag3d pk" id="te-t2">P₂</span>', () => [this.disp.x2 + 0.45, BASE + this.disp.h2, DZ / 2 - 0.4], { group: 'teorema', cls: 'l' });
      this.lblDh = app.labels.add('<span class="tag3d or" id="te-tdh">Δh</span>', () => [W / 2 + 0.3, BASE + (this.disp.h1 + this.disp.h2) / 2, 0], { group: 'teorema', cls: 'l' });
      this.lblRho = app.labels.add('<span class="tag3d mi" id="te-trho">ρ</span>', () => [0, BASE + HMAX - 0.6, DZ / 2], { group: 'teorema' });
      this.dhBar = new Mesh(GG.cylLow, Mt({ type: 'unlit', color: '#000', emissive: '#ff9a3d', emissiveIntensity: 1.5 }));
      R.add(this.dhBar);

      // Ingeniero
      this.eng = HL.characters.ingeniero();
      this.eng.root.set([W / 2 + 2.6, 0, 3.4], [0, -0.75, 0]);
      this.eng.pose = 'point';
      R.add(this.eng.root);
      this.characters = [this.eng];
      app.labels.add('<span class="name3d">Martín · instrumentación</span>', () => this.eng.root.worldPos([0, 2.05, 0]), { group: 'teorema' });
      const cons = HL.console3d(2, '#8b6cff'); cons.set([W / 2 + 3.8, 0, 0.8], [0, -1.2, 0]); R.add(cons);
      const r1 = HL.rack(); r1.set([-W / 2 - 4, 0, -2], [0, 0.5, 0]); R.add(r1);

      S3.pointLights = [
        { pos: [-4, 9, 5], color: HL.color('#8b6cff'), intensity: 4 },
        { pos: [4, 9, 5], color: HL.color('#ff5fb8'), intensity: 3 },
        { pos: [0, 3, 6], color: HL.color('#56d8ff'), intensity: 3 }
      ];

      // Controles
      this.cRho = A.bindControl('te-rho', v => { this.S.rho = v; this.update0(); this.checkGuide(); });
      this.cH1 = A.bindControl('te-h1', v => { this.S.h1 = v; this.checkGuide(); });
      this.cH2 = A.bindControl('te-h2', v => { this.S.h2 = v; this.checkGuide(); });
      this.cP1 = A.bindControl('te-p1', v => { this.S.P1 = v; });
      A.byId('te-auto').addEventListener('change', e => { this.S.auto = e.target.checked; });
      A.byId('te-compare').addEventListener('click', () => this.compare());
      A.byId('te-guide').addEventListener('click', () => this.startGuide());
      A.byId('te-reset').addEventListener('click', () => this.reset());
      this.update0();
    },

    update0() {
      this.water.setColor(liquidColor(this.S.rho), this.S.rho > 5000 ? 0.5 : 0.38);
    },

    calc() {
      const S = this.S;
      if (S.auto) S.P1 = PATM + S.rho * G * (HMAX - S.h1);
      const dh = S.h1 - S.h2, dP = S.rho * G * dh;
      return { P1: S.P1, P2: S.P1 + dP, dh, dP };
    },

    compare() {
      this.S.compared = true;
      const v = A.byId('te-verdict');
      v.classList.remove('pop'); void v.offsetWidth; v.classList.add('pop');
      const c = this.calc();
      A.say(this.verdictText(c));
    },

    verdictText(c) {
      if (Math.abs(c.dh) < 0.05) return `<b>Empate.</b> Los dos sensores están a la misma altura (${fmtFixed(this.S.h1, 1)} m), así que marcan la misma presión: ${fmtkPa(c.P1)}. No importa que estén separados ${fmtFixed(Math.abs(this.S.x1 - this.S.x2), 1)} m de costado.`;
      const w = c.dh > 0 ? 2 : 1, l = w === 2 ? 1 : 2;
      return `<b>Gana el sensor ${w}.</b> Está ${fmtFixed(Math.abs(c.dh), 1)} m más abajo que el sensor ${l}, así que soporta <b>${fmtPa(Math.abs(c.dP))}</b> más. La franja rosa es la capa de ${NAME[this.S.rho] || 'líquido'} que tiene de más encima: ρ·g·Δh = ${fmt(this.S.rho)} · 9,81 · ${fmtFixed(Math.abs(c.dh), 1)}.`;
    },

    startGuide() {
      this.S.guide = 0;
      A.byId('te-guide-box').hidden = false;
      this.paintGuide();
      A.say('<b>Paso 1:</b> poné los dos sensores <b>a la misma altura</b>, pero en distintos lugares del tanque. Podés arrastrarlos o usar los controles de altura.');
    },
    paintGuide() {
      A.$$('#te-steps li').forEach((li, i) => {
        li.classList.toggle('done', i < this.S.guide || this.S.guide === 3);
        li.classList.toggle('cur', i === this.S.guide);
      });
    },
    checkGuide() {
      const S = this.S;
      if (S.guide < 0 || S.guide > 2) return;
      const dh = S.h1 - S.h2;
      if (S.guide === 0 && Math.abs(dh) < 0.15 && Math.abs(S.x1 - S.x2) > 1.5) {
        S.guide = 1;
        A.say(`✔ <b>¡Comprobado!</b> Ambos marcan ${fmtkPa(this.calc().P1)}: misma altura, misma presión. <b>Paso 2:</b> ahora bajá el sensor 2 hasta que quede <b>3 m más abajo</b> que el sensor 1.`);
      } else if (S.guide === 1 && dh > 2.85 && dh < 3.15) {
        S.guide = 2;
        const c = this.calc();
        A.say(`✔ <b>¡Exacto!</b> ΔP = ρ·g·Δh = ${fmt(S.rho)} · 9,81 · ${fmtFixed(dh, 1)} = ${fmtPa(c.dP)}. <b>Paso 3:</b> sin mover los sensores, cambiá el líquido a <b>mercurio</b>.`);
      } else if (S.guide === 2 && S.rho > 13000 && dh > 2.8 && dh < 3.2) {
        S.guide = 3;
        A.say(`🏆 <b>¡Teorema comprobado!</b> Con mercurio la misma diferencia de altura da ΔP = ${fmtPa(this.calc().dP)}, 13,5 veces más que con agua. La diferencia de presión depende de <b>ρ</b> y de <b>Δh</b>, nada más.`);
      }
      this.paintGuide();
    },

    reset() {
      Object.assign(this.S, { compared: false, guide: -1, x1: -3.2, x2: 3.2 });
      A.byId('te-guide-box').hidden = true;
      A.byId('te-auto').checked = true; this.S.auto = true;
      this.cRho.set(1000); this.cH1.set(8); this.cH2.set(3);
      A.$$('[data-sim="teorema"] button').forEach(b => b.classList.remove('on'));
      A.say('Todo vuelve a empezar: sensor 1 a 8 m y sensor 2 a 3 m de altura, en agua.');
    },

    enter() {},
    exit() {},

    hitTest(ray) { return HL.pick(ray, [this.s1.node, this.s2.node], 0.35); },
    hover(ray) {
      const h = this.hitTest(ray);
      this.hoverId = h ? (h.node === this.s1.node ? 1 : 2) : 0;
      return h ? 'grab' : null;
    },
    pointerDown(ray) {
      const h = this.hitTest(ray);
      if (!h) return false;
      this.drag = h.node === this.s1.node ? 1 : 2;
      const p = h.node.worldPos();
      const fwd = HL.v3.norm([A.camera.target[0] - A.camera.position[0], 0, A.camera.target[2] - A.camera.position[2]]);
      this.plane = { p, n: fwd };
      const hit = HL.rayPlane(ray, p, fwd) || p;
      this.grab = HL.v3.sub(hit, p);
      return true;
    },
    pointerMove(ray) {
      const hit = HL.rayPlane(ray, this.plane.p, this.plane.n);
      if (!hit) return;
      const p = HL.v3.sub(hit, this.grab);
      const k = this.drag;
      this.S['x' + k] = clamp(p[0], -XMAX, XMAX);
      (k === 1 ? this.cH1 : this.cH2).set(round1(clamp(p[1] - BASE, 0, HMAX)));
    },
    pointerUp() { this.drag = 0; this.checkGuide(); },

    highlight(v, on) {
      const map = { rho: 'te-trho', h1: 'te-t1', h2: 'te-t2', g: 'te-trho' };
      const el = A.byId(map[v]); if (el) el.classList.toggle('hl', on);
      if (v === 'h1' || v === 'h2') { const e2 = A.byId('te-tdh'); if (e2) e2.classList.toggle('hl', on); }
    },

    update(dt, t) {
      const S = this.S, d = this.disp;
      const k = Math.min(1, dt * (this.drag ? 25 : 5));
      ['h1', 'h2', 'x1', 'x2'].forEach(key => { d[key] += (S[key] - d[key]) * k; });
      const top = HMAX + 1.9;
      const c = this.calc();
      [[this.s1, d.x1, d.h1, 1], [this.s2, d.x2, d.h2, 2]].forEach(([s, x, h, n]) => {
        const y = BASE + h;
        const win = S.compared && ((n === 2 && c.dh > 0.05) || (n === 1 && c.dh < -0.05));
        const pulse = win ? 1 + Math.sin(t * 6) * 0.18 : (this.hoverId === n ? 1.12 : 1);
        s.node.set([x, y, 0], [0, t * 0.8, 0], [pulse, pulse, pulse]);
        s.ring.rotation = [Math.sin(t * 2 + n) * 0.3, 0, Math.PI / 2];
        s.neon.emissiveIntensity = win ? 2.8 : 1.8;
        s.cart.set([x, top - 0.35, 0], [0, 0, 0], [0.9, 0.35, 0.8]);
        const cl = top - 0.5 - (y + 0.45);
        s.cable.set([x, y + 0.45 + cl / 2, 0], [0, 0, 0], [0.035, Math.max(0.01, cl), 0.035]);
        s.iso.set([0, y, 0], [0, 0, 0], [W - 0.25, 0.02, DZ - 0.25]);
      });
      const lo = Math.min(d.h1, d.h2), hi = Math.max(d.h1, d.h2);
      this.band.visible = S.compared && hi - lo > 0.05;
      this.band.set([0, BASE + (lo + hi) / 2, 0], [0, 0, 0], [W - 0.3, Math.max(0.01, hi - lo), DZ - 0.3]);
      this.dhBar.visible = hi - lo > 0.05;
      this.dhBar.set([W / 2 + 0.15, BASE + (lo + hi) / 2, 0], [0, 0, 0], [0.05, Math.max(0.01, hi - lo), 0.05]);
      this.lblDh.visible = hi - lo > 0.3;
      this.eng.animate(t, { pose: S.compared ? 'talk' : 'point' });
      this.refreshHUD(c);
    },

    refreshHUD(c) {
      const S = this.S;
      this.cP1.setSilent(c.P1);
      this.cP1.disable(S.auto);
      A.byId('te-p1-wrap').classList.toggle('is-disabled', S.auto);
      txt('te-o-P1', fmtkPa(c.P1));
      txt('te-o-P2', fmtkPa(c.P2));
      txt('te-o-dh', `${fmtFixed(c.dh, 1)} m`);
      txt('te-o-dP', `${c.dP > 0 ? '+' : ''}${fmtPa(c.dP)}`);
      html('te-f-sub', `P₂ − P₁ = ${fmt(S.rho)} · 9,81 · (${fmtFixed(S.h1, 1)} − ${fmtFixed(S.h2, 1)}) = <b>${fmtPa(c.dP)}</b><br>P₂ = ${fmtkPa(c.P1)} ${c.dP >= 0 ? '+' : '−'} ${fmtkPa(Math.abs(c.dP))} = <b>${fmtkPa(c.P2)}</b>`);
      A.byId('te-d1').innerHTML = `<small>SENSOR 1 · h₁ = ${fmtFixed(S.h1, 1)} m</small>${fmtkPa(c.P1)}`;
      A.byId('te-d2').innerHTML = `<small>SENSOR 2 · h₂ = ${fmtFixed(S.h2, 1)} m</small>${fmtkPa(c.P2)}`;
      txt('te-t1', `P₁ · h₁ = ${fmtFixed(S.h1, 1)} m`);
      txt('te-t2', `P₂ · h₂ = ${fmtFixed(S.h2, 1)} m`);
      txt('te-tdh', `Δh = ${fmtFixed(Math.abs(c.dh), 1)} m`);
      txt('te-trho', `ρ = ${fmt(S.rho)} kg/m³ · ${NAME[S.rho] || 'líquido'}`);
      html('te-verdict', S.compared ? this.verdictText(c) : '');
    },

    whatif: {
      same() {
        const s = M;
        A.tween(s.S.h2, s.S.h1, 1000, v => s.cH2.set(round1(v)));
        if (Math.abs(s.S.x1 - s.S.x2) < 2) s.S.x2 = s.S.x1 > 0 ? -4 : 4;
        s.S.compared = true;
        return `<b>Las presiones se igualan.</b> El sensor 2 sube hasta ${fmtFixed(s.S.h1, 1)} m, la misma altura que el sensor 1. Los dos quedan sobre la misma lámina de igual presión y marcan lo mismo, aunque estén separados.`;
      },
      side() {
        const s = M;
        const P2 = s.calc().P2;
        const to = s.S.x2 > 0 ? -XMAX + 0.3 : XMAX - 0.3;
        A.tween(s.S.x2, to, 1300, v => { s.S.x2 = v; });
        return `<b>Nada cambia.</b> El sensor 2 cruza el tanque de un lado al otro y su pantalla sigue marcando ${fmtkPa(P2)}. Moverse en horizontal no cambia cuánta agua tiene encima.`;
      },
      mercury() {
        const s = M, dh = s.S.h1 - s.S.h2, r0 = s.S.rho;
        if (r0 > 13000) return 'Ya tenés mercurio en el tanque. Probá volver al agua para comparar.';
        const before = r0 * G * dh;
        s.cRho.set(13534);
        return `<b>La diferencia de presión se multiplica por ${fmtFixed(13534 / r0, 1)}.</b> Con la misma Δh = ${fmtFixed(dh, 1)} m, ΔP pasa de ${fmtPa(before)} a ${fmtPa(13534 * G * dh)}. El mercurio pesa mucho más que el agua.`;
      },
      swap() {
        const s = M, a = s.S.h1, b = s.S.h2;
        A.tween(a, b, 1100, v => s.cH1.set(round1(v)));
        A.tween(b, a, 1100, v => s.cH2.set(round1(v)));
        return `<b>ΔP cambia de signo.</b> Ahora el sensor 2 queda arriba (h₂ = ${fmtFixed(a, 1)} m) y el 1 abajo (h₁ = ${fmtFixed(b, 1)} m). Entonces h₁ − h₂ es negativo y P₂ − P₁ también: el de arriba siempre tiene menos presión.`;
      }
    }
  };
  A.register(M);
})();
