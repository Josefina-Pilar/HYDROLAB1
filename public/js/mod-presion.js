/* =========================================================
   HYDROLAB 3D · Módulo 1 – Presión estática en los fluidos
   Un tanque de 20 m de profundidad con un buzo que se puede
   arrastrar. Manómetro, flechas de presión y cálculo P = ρ·g·h.
   ========================================================= */
'use strict';

(() => {
  const A = HYDROLAB;
  const { fmt, fmtFixed, fmtPa, fmtkPa, fmtN, txt, html, clamp, round1, PATM } = A;
  const SURF = 20.5;          // altura de la superficie del agua (m)
  const W = 6, D = 4;         // ancho y fondo del tanque (m)
  const XB = 10;              // posición del tanque de comparación
  const PREF = 1300 * 9.81 * 20;
  const SENSOR = [0, 1.3, 0.14]; // sensor en el pecho del buzo (coordenadas locales)
  const DIVER_ROT = [0.55, 1.2, 0];

  const liquidName = r => ({ 1000: 'agua dulce', 1025: 'agua de mar', 920: 'aceite', 1260: 'glicerina', 720: 'nafta' })[r] || 'líquido';
  const liquidColor = r => (r < 800 ? '#f2d45c' : r < 960 ? '#e8b93a' : r > 1200 ? '#c98a3d' : r > 1010 ? '#1f8fb0' : '#2e86de');

  const M = {
    id: 'presion',
    title: 'Presión estática',
    character: { name: 'Ing. Valentina Ruiz', role: 'Guía del laboratorio', avatar: '👩‍🔬' },
    diverChar: { name: 'Tomás', role: 'Buzo profesional', avatar: '🤿' },
    view: { target: [0, 10.5, 0], radius: 40, theta: 0.35, phi: 1.4, minR: 6, maxR: 70, maxPhi: 1.62, minPhi: 0.3 },
    intro: 'Este tanque tiene <b>20 metros de profundidad</b>. Tomás, nuestro buzo, lleva un sensor de presión en el pecho. <b>Arrastralo hacia abajo</b> o tocá «Descenso automático» y mirá cómo cambia el manómetro.',
    tips: [
      'Las <b>flechas rosas</b> muestran la presión del agua sobre el sensor: empuja <b>desde todos lados</b>, también desde abajo. Cuanto más abajo está Tomás, más largas son.',
      'La presión depende solo de cuánta agua hay <b>encima</b>. Probá el botón «¿Qué sucede si el tanque es mucho más ancho?».',
      'Cambiá el líquido: con <b>agua de mar</b> la presión sube un poco y con <b>aceite</b> baja, porque P es proporcional a la densidad ρ.',
      'A unos <b>10 m</b> de profundidad, el agua ya hace casi la misma presión que todo el aire de la atmósfera. ¡Por eso duelen los oídos!',
      'Pasá el mouse sobre las letras <b>ρ, g y h</b> de la fórmula (panel derecho) para ver qué representa cada una en la escena.'
    ],
    S: { h: 5, rho: 1000, g: 9.81, compare: false, follow: true, arrows: true, playing: false, wide: 1 },
    trace: [],

    build(app) {
      const S3 = this.scene = HL.makeScene({ top: '#101a44', bottom: '#03050d', fogNear: 45, fogFar: 120, shadowExtent: 18, shadowCenter: [3, 6, 0], sunDir: [-0.35, -1, -0.45] });
      const R = S3.root;
      const { MAT, G, geo, Mesh, material: Mt } = HL;
      R.add(HL.labRoom(60, 44, 30, { neon: MAT.neonCyan }));

      const mkTank = (x, col) => {
        const n = new HL.Node('tanque').set([x, 0, 0]);
        n.add(HL.glassTank(W, SURF + 1.2, D, { frame: 0.16 }));
        const water = HL.waterBody(W - 0.15, D - 0.15, { color: col, wave: 0.05, waveScale: 2.2, opacity: 0.32 });
        water.setLevel(SURF, 0.08);
        n.add(water.node);
        const floor = new Mesh(geo.plane(W - 0.2, D - 0.2), Mt({ color: '#1b3d6b', caustics: true, spec: 0.2 }));
        floor.set([0, 0.09, 0]); floor.castShadow = false;
        n.add(floor);
        // Escala de profundidad sobre el poste delantero izquierdo
        const ticks = [];
        for (let k = 0; k <= 20; k++) ticks.push({ g: G.box, p: [-W / 2 - 0.05, SURF - k, D / 2 + 0.12], s: [k % 5 ? 0.25 : 0.5, 0.05, 0.05] });
        n.add(new Mesh(geo.merge(ticks), MAT.neonCyan));
        return { node: n, water };
      };
      this.tankA = mkTank(0, '#2e86de');
      this.tankB = mkTank(XB, '#e8b93a');
      this.tankB.node.visible = false;
      R.add(this.tankA.node, this.tankB.node);
      for (let k = 0; k <= 20; k += 2) {
        app.labels.add(`<span class="tick3d">${k} m</span>`, () => this.tankA.node.worldPos([-W / 2 - 0.45, SURF - k, D / 2 + 0.12]), { group: 'presion', cls: 'r' });
      }

      // Pasarela superior con consola, manómetro e ingeniera
      const walk = new HL.Node('pasarela').set([0, SURF + 1.2, D / 2 + 1.6]);
      walk.add(new Mesh(G.box, MAT.panelLight).set([3, -0.1, 0], [0, 0, 0], [14, 0.2, 3]));
      const rail = [];
      for (let x = -4; x <= 10; x += 1) rail.push({ g: G.box, p: [x, 0.5, 1.45], s: [0.05, 1, 0.05] });
      rail.push({ g: G.box, p: [3, 1, 1.45], s: [14, 0.06, 0.06] });
      walk.add(new Mesh(geo.merge(rail), MAT.steel));
      walk.add(new Mesh(G.box, MAT.neonCyan).set([3, -0.2, 1.5], [0, 0, 0], [14, 0.04, 0.03]));
      for (const x of [-3.6, 9.6]) walk.add(new Mesh(G.box, MAT.panel).set([x, -(SURF + 1.2) / 2, 0], [0, 0, 0], [0.4, SURF + 1.2, 0.4]));
      const cons = HL.console3d(1.8); cons.set([-2.4, 0, 0.2], [0, 0.25, 0]); walk.add(cons);
      this.gaugeA = HL.gauge(0.55, '#56d8ff');
      this.gaugeA.node.set([-2.5, 2.0, -0.1], [0, 0.25, 0]);
      walk.add(this.gaugeA.node);
      this.gaugeB = HL.gauge(0.55, '#ffc65c');
      this.gaugeB.node.set([7.2, 2.0, -0.1], [0, -0.2, 0]);
      this.gaugeB.node.visible = false;
      walk.add(this.gaugeB.node);
      R.add(walk);
      this.walk = walk;
      this.eng = HL.characters.ingeniera();
      this.eng.root.set([1.4, 0, 0.4], [0, -0.5, 0]);
      this.eng.pose = 'point';
      walk.add(this.eng.root);
      this.characters = [this.eng];
      app.labels.add('<span class="name3d">Valentina</span>', () => this.eng.root.worldPos([0, 2.05, 0]), { group: 'presion' });

      // Buzos
      this.diver = HL.characters.buzo();
      this.diver.root.userData.pickPad = 0.25;
      R.add(this.diver.root);
      this.diverB = HL.characters.buzo();
      this.diverB.root.visible = false;
      R.add(this.diverB.root);
      app.labels.add('<span class="name3d">Tomás · buzo</span>', () => this.diver.root.worldPos([0, 2.1, 0]), { group: 'presion', dy: -6 });

      // Flechas de presión (6 direcciones)
      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
      const mkArrows = () => dirs.map(d => { const a = HL.arrow('#ff5fb8', 0.045); R.add(a.node); return { a, d }; });
      this.arrA = mkArrows();
      this.arrB = mkArrows();

      // Cable del sensor hasta el manómetro
      this.cableA = new Mesh(G.cylLow, Mt({ color: '#f5c518', spec: 0.5 }));
      this.cableB = new Mesh(G.cylLow, Mt({ color: '#f5c518', spec: 0.5 }));
      R.add(this.cableA, this.cableB);

      // Indicadores visuales de h, ρ y g
      this.hBar = new Mesh(G.cylLow, Mt({ type: 'unlit', color: '#000', emissive: '#56d8ff', emissiveIntensity: 1.4 }));
      R.add(this.hBar);
      this.gArrow = HL.arrow('#ff9a3d', 0.07);
      R.add(this.gArrow.node);
      this.lblH = app.labels.add('<span class="tag3d cy" id="pr-l3-h">h</span>', () => this.hMid, { group: 'presion', cls: 'l' });
      this.lblRho = app.labels.add('<span class="tag3d mi" id="pr-l3-rho">ρ</span>', () => [this.sensorA[0] - 1.4, this.sensorA[1] + 1.6, D / 2], { group: 'presion', cls: 'r' });
      this.lblG = app.labels.add('<span class="tag3d or" id="pr-l3-g">g</span>', () => this.gPos, { group: 'presion', cls: 'l' });
      this.lblSurf = app.labels.add('<span class="tag3d sm">superficie · h = 0</span>', () => this.tankA.node.worldPos([W / 2 + 0.3, SURF, D / 2]), { group: 'presion', cls: 'l' });
      this.lblWrist = app.labels.add('<span class="digi" id="pr-l3-digi">—</span>', () => this.sensorA, { group: 'presion', cls: 'r', dx: -40 });
      this.lblWristB = app.labels.add('<span class="digi" id="pr-l3-digiB" style="color:#ffe08a;border-color:#e8b93a">—</span>', () => this.sensorB, { group: 'presion', cls: 'l', dx: 40 });
      this.lblGauge = app.labels.add('<span class="digi" id="pr-l3-gauge"><small>MANÓMETRO</small>—</span>', () => this.walk.worldPos([-2.5, 2.75, -0.1]), { group: 'presion' });
      this.lblOil = app.labels.add('<span class="tag3d or">Tanque de aceite · ρ = 920 kg/m³</span>', () => this.tankB.node.worldPos([0, SURF + 1.9, 0]), { group: 'presion' });

      // Burbujas
      this.bub = new HL.Points(50, { color: '#e6f8ff', opacity: 0.9 });
      this.bubS = Array.from({ length: 50 }, () => ({ x: 0, y: -10, z: 0, v: 1, s: 0.08, b: 0 }));
      R.add(this.bub);

      S3.pointLights = [
        { pos: [0, SURF + 3, 4], color: HL.color('#7fd8ff'), intensity: 5 },
        { pos: [0, 4, 4], color: HL.color('#bfe9ff'), intensity: 5 },
        { pos: [XB, 8, 4], color: HL.color('#ffc65c'), intensity: 2 }
      ];

      // Controles del panel
      this.cH = A.bindControl('pr-h', v => { this.S.h = v; if (!this.dragging && !this.S.playing) this.markManual(); });
      this.cRho = A.bindControl('pr-rho', v => { this.S.rho = v; this.trace = []; this.refreshLiquid(); });
      this.cG = A.bindControl('pr-g', v => { this.S.g = v; this.trace = []; });
      A.byId('pr-compare').addEventListener('change', e => this.setCompare(e.target.checked));
      A.byId('pr-follow').addEventListener('change', e => { this.S.follow = e.target.checked; if (!e.target.checked) app.controls.setView(this.view); });
      A.byId('pr-arrows').addEventListener('change', e => { this.S.arrows = e.target.checked; });
      A.byId('pr-play').addEventListener('click', () => this.play());
      A.byId('pr-pause').addEventListener('click', () => this.pause());
      A.byId('pr-reset').addEventListener('click', () => this.reset());
      this.hShown = this.S.h;
      this.refreshLiquid();
    },

    refreshLiquid() {
      this.tankA.water.setColor(liquidColor(this.S.rho));
    },

    markManual() { this.milestone = -1; },

    setCompare(on) {
      this.S.compare = on;
      if (on && this.S.wide > 1.01) A.tween(this.S.wide, 1, 800, v => { this.S.wide = v; });
      A.byId('pr-compare').checked = on;
      this.tankB.node.visible = on;
      this.diverB.root.visible = on;
      this.gaugeB.node.visible = on;
      this.cRho.disable(on);
      if (on) this.cRho.set(1000);
      if (!this.S.follow) A.controls.setView(on ? { target: [XB / 2, 10.5, 0], radius: 48 } : this.view);
    },

    play() {
      if (this.S.h >= 19.95) { this.cH.set(0); this.trace = []; }
      this.S.playing = true;
      this.milestone = Math.floor(this.S.h / 5);
      A.byId('pr-play').classList.add('active');
      A.say('¡Allá voy! Voy a bajar despacio y el sistema va a registrar la presión cada medio metro.', this.diverChar);
    },
    pause() {
      this.S.playing = false;
      A.byId('pr-play').classList.remove('active');
    },
    reset() {
      this.pause();
      this.trace = [];
      if (this.S.wide !== 1) this.whatif.wide.call(this);
      this.cH.set(0);
      A.say('Volvimos a la superficie. Ahí la presión que hace el agua es <b>cero</b>: solo actúa el aire, unos 101 325 Pa.');
    },

    enter(app) {
      this.diver.pose = 'swim';
      if (this.S.follow) app.controls.setView({ target: [0, this.sensorY(this.hShown), 0], radius: 8.5, theta: 0.55, phi: 1.5 });
    },
    exit() { this.pause(); },
    resetView(app) {
      this.S.follow = false; A.byId('pr-follow').checked = false;
      app.controls.setView(this.S.compare ? { target: [XB / 2, 10.5, 0], radius: 48, theta: 0.35, phi: 1.4 } : this.view);
    },

    sensorY(h) { return SURF - h; },

    placeDiver(person, x, h, t) {
      const rot = [DIVER_ROT[0] + Math.sin(t * 0.7) * 0.04, DIVER_ROT[1] + Math.sin(t * 0.3) * 0.15, 0];
      const m = HL.m4.compose([0, 0, 0], rot, [1, 1, 1]);
      const off = HL.m4.transformPoint(m, SENSOR);
      const target = [x, this.sensorY(h), 0];
      person.root.set(HL.v3.sub(target, off), rot, [1, 1, 1]);
      return target;
    },

    hitTest(ray) { return HL.pick(ray, [this.diver.root], 0.25); },
    hover(ray) { return this.hitTest(ray) ? 'grab' : null; },
    pointerDown(ray) {
      const h = this.hitTest(ray);
      if (!h) return false;
      this.dragging = true;
      this.pause();
      this.markManual();
      const fwd = HL.v3.norm([A.camera.target[0] - A.camera.position[0], 0, A.camera.target[2] - A.camera.position[2]]);
      this.dragPlane = { p: this.sensorA.slice(), n: fwd };
      const hit = HL.rayPlane(ray, this.dragPlane.p, this.dragPlane.n);
      this.grabDy = hit ? hit[1] - this.sensorA[1] : 0;
      return true;
    },
    pointerMove(ray) {
      const hit = HL.rayPlane(ray, this.dragPlane.p, this.dragPlane.n);
      if (!hit) return;
      this.cH.set(round1(clamp(SURF - (hit[1] - this.grabDy), 0, 20)));
    },
    pointerUp() { this.dragging = false; },

    highlight(v, on) {
      const map = { h: 'pr-l3-h', rho: 'pr-l3-rho', g: 'pr-l3-g' };
      const el = A.byId(map[v]);
      if (el) el.classList.toggle('hl', on);
      if (v === 'h') this.hGlow = on;
    },

    update(dt, t, app) {
      const S = this.S;
      if (S.playing) {
        const nh = Math.min(20, S.h + dt * 1.6);
        this.cH.set(nh);
        if (nh >= 20) {
          this.pause();
          A.say(`¡Llegué al fondo, a <b>20 m</b>! Acá el agua hace ${fmtkPa(S.rho * S.g * 20)} de presión: cuatro veces lo que medí a 5 m. Mirá el gráfico: es una <b>línea recta</b>.`, this.diverChar);
        }
        const step = Math.floor(nh / 5);
        if (step > this.milestone && step >= 1 && step < 4) {
          this.milestone = step;
          const P = S.rho * S.g * step * 5;
          const msgs = {
            1: `A <b>5 m</b> ya noto la presión en los oídos: el agua hace ${fmtkPa(P)} sobre mí.`,
            2: `A <b>10 m</b> la presión del agua es ${fmtkPa(P)}, casi igual a toda la atmósfera (101 kPa). En total soporto el <b>doble</b> que en la superficie.`,
            3: `A <b>15 m</b>: ${fmtkPa(P)}. Cada metro que bajo suma la misma cantidad de presión, porque suma el mismo peso de agua encima.`
          };
          A.say(msgs[step], this.diverChar);
        }
        const last = this.trace[this.trace.length - 1];
        if (!last || nh - last.h >= 0.5) this.trace.push({ h: nh, P: S.rho * S.g * nh });
      }
      // Movimiento suave del buzo hacia la profundidad elegida
      const prev = this.hShown;
      this.hShown += (S.h - this.hShown) * Math.min(1, dt * (this.dragging ? 20 : 4));
      const vel = (this.hShown - prev) / Math.max(dt, 1e-3);
      DIVER_ROT[0] = 0.55 + clamp(vel * 0.1, -0.35, 0.45);
      const h = this.hShown;
      this.sensorA = this.placeDiver(this.diver, 0, h, t);
      this.diver.animate(t, { pose: 'swim', kick: 3 + Math.abs(vel) * 2 });
      if (S.compare) { this.sensorB = this.placeDiver(this.diverB, XB, h, t + 1); this.diverB.animate(t + 1, { pose: 'swim', kick: 3 }); }
      this.eng.animate(t);

      // Ancho del tanque (pregunta «¿y si el tanque es más ancho?»)
      this.tankA.node.scale = [S.wide, 1, 1];

      // Presiones
      const rhoA = S.compare ? 1000 : S.rho;
      const PA = rhoA * S.g * h, PB = 920 * S.g * h;
      const setArrows = (arr, c, P, on) => {
        const L = P > 0 ? 0.35 + 1.7 * Math.min(1.3, P / PREF) : 0;
        arr.forEach(({ a, d }) => {
          if (!on || L <= 0) { a.node.visible = false; return; }
          const from = HL.v3.add(c, HL.v3.scale(d, 0.32 + L));
          a.set(from, HL.v3.scale(d, -1), L);
        });
      };
      setArrows(this.arrA, this.sensorA, PA, S.arrows);
      setArrows(this.arrB, this.sensorB || [0, -50, 0], PB, S.arrows && S.compare);
      this.gaugeA.set(PA / 300000);
      this.gaugeB.set(PB / 300000);

      // Cables
      const anchorA = this.walk.worldPos([-2.5, 1.2, 0.1]);
      const setCable = (m, a, b) => { const d = HL.v3.sub(b, a); m.set(HL.v3.lerp(a, b, 0.5), HL.alignY(d), [0.025, HL.v3.len(d), 0.025]); };
      setCable(this.cableA, anchorA, this.sensorA);
      this.cableB.visible = S.compare;
      if (S.compare) setCable(this.cableB, this.walk.worldPos([7.2, 1.2, 0.1]), this.sensorB);

      // Barra h (de la superficie al sensor)
      const hx = this.sensorA[0] + 1.1, hz = this.sensorA[2];
      const hl = Math.max(0.01, SURF - this.sensorA[1]);
      this.hBar.set([hx, SURF - hl / 2, hz], [0, 0, 0], [this.hGlow ? 0.07 : 0.04, hl, this.hGlow ? 0.07 : 0.04]);
      this.hBar.visible = h > 0.15;
      this.hMid = [hx, SURF - hl / 2, hz];
      const gx = this.sensorA[0] + 2.4, gy = Math.min(SURF - 0.3, this.sensorA[1] + 1.8);
      this.gArrow.set([gx, gy, hz], [0, -1, 0], 1.3);
      this.gPos = [gx + 0.15, gy - 0.9, hz];
      this.lblH.visible = h > 0.6;
      this.lblOil.visible = this.lblWristB.visible = S.compare;
      this.lblRho.visible = true;

      this.scene.pointLights[1].pos = HL.v3.add(this.sensorA, [1.5, 1.2, 2.5]);
      // Burbujas que suben desde el regulador
      const head = this.diver.J.head.worldPos([0, 0.05, 0.12]);
      const pts = this.bub;
      this.bubS.forEach((b, i) => {
        if (b.y > SURF - 0.05 || b.y < -5) {
          if (Math.random() < dt * 6) Object.assign(b, { x: head[0], y: head[1], z: head[2], v: 1.2 + Math.random(), s: 0.06 + Math.random() * 0.08 });
          else b.y = -10;
        } else {
          b.y += b.v * dt; b.x += Math.sin(t * 3 + i) * dt * 0.2;
        }
        pts.data.set([b.x, b.y, b.z, b.s], i * 4);
      });
      pts.dirty = true;

      // Cámara que sigue al buzo
      if (S.follow && !app.controls.dragging) {
        const tgt = S.compare ? [XB / 2, this.sensorA[1] + 1, 0] : [0, this.sensorA[1] + 0.8, 0];
        app.controls.goal.target = tgt;
        if (S.compare && app.controls.goal.radius < 26) app.controls.goal.radius = 26;
      }
      this.refreshHUD(PA, PB);
    },

    refreshHUD(PA, PB) {
      const S = this.S, h = this.hShown;
      const rho = S.compare ? 1000 : S.rho;
      txt('pr-o-h', `${fmtFixed(S.h, 1)} m`);
      if (S.compare) {
        txt('pr-o-P-lbl', 'Presión del agua (ρ = 1000)');
        txt('pr-o-abs-lbl', 'Presión del aceite (ρ = 920)');
        txt('pr-o-abs', fmtPa(920 * S.g * S.h));
      } else {
        txt('pr-o-P-lbl', 'Presión del líquido (ρ·g·h)');
        txt('pr-o-abs-lbl', 'Presión absoluta (+ aire)');
        txt('pr-o-abs', fmtPa(PATM + rho * S.g * S.h));
      }
      const P = rho * S.g * S.h;
      txt('pr-o-P', fmtPa(P));
      txt('pr-o-Pk', `${fmtkPa(P)}`);
      txt('pr-o-atm', `${fmtFixed((PATM + P) / PATM, 2)} atm`);
      html('pr-f-sub', `P = ${fmt(rho)} · ${fmt(S.g, 2)} · ${fmtFixed(S.h, 1)} = <b>${fmtPa(P)}</b>`);
      txt('pr-l-rho', `${fmt(rho)} kg/m³ (${S.compare ? 'agua dulce' : liquidName(rho)})`);
      txt('pr-l-g', `${fmt(S.g, 2)} m/s²`);
      txt('pr-l-h', `${fmtFixed(S.h, 1)} m`);
      txt('pr-l3-h', `h = ${fmtFixed(h, 1)} m`);
      txt('pr-l3-rho', `ρ = ${fmt(rho)} kg/m³ · ${S.compare ? 'agua dulce' : liquidName(rho)}`);
      txt('pr-l3-g', `g = ${fmt(S.g, 2)} m/s²`);
      txt('pr-l3-digi', fmtkPa(PA));
      txt('pr-l3-digiB', fmtkPa(PB));
      A.byId('pr-l3-gauge').innerHTML = `<small>MANÓMETRO · AGUA</small>${fmtkPa(PA)}`;
      txt('pr-trace-lbl', this.trace.length ? `· ${this.trace.length} mediciones` : '');
      this.drawChart();
    },

    drawChart() {
      const S = this.S, c = A.byId('pr-chart');
      const key = `${S.rho}|${S.g}|${S.h}|${this.trace.length}|${S.compare}`;
      if (key === this._ck) return;
      this._ck = key;
      const rho = S.compare ? 1000 : S.rho;
      const X0 = 34, X1 = 292, Y0 = 8, Y1 = 108;
      const Pmax = Math.max(rho, S.compare ? 1000 : 0) * S.g * 20 * 1.08;
      const xp = h => X0 + (h / 20) * (X1 - X0), yp = p => Y1 - (p / Pmax) * (Y1 - Y0);
      let s = '';
      for (let h = 0; h <= 20; h += 5) s += `<line x1="${xp(h)}" x2="${xp(h)}" y1="${Y0}" y2="${Y1}" stroke="rgba(150,170,255,.12)"/><text x="${xp(h)}" y="${Y1 + 12}" text-anchor="middle">${h} m</text>`;
      s += `<text x="${X0 - 4}" y="${Y0 + 6}" text-anchor="end">${fmt(Pmax / 1000, 0)}</text><text x="${X0 - 4}" y="${Y1}" text-anchor="end">0</text><text x="${X0 - 4}" y="${(Y0 + Y1) / 2}" text-anchor="end">kPa</text>`;
      if (S.compare) s += `<line x1="${xp(0)}" y1="${yp(0)}" x2="${xp(20)}" y2="${yp(920 * S.g * 20)}" stroke="#ffc65c" stroke-width="2" stroke-dasharray="5 4"/>`;
      s += `<line x1="${xp(0)}" y1="${yp(0)}" x2="${xp(20)}" y2="${yp(rho * S.g * 20)}" stroke="#56d8ff" stroke-width="2"/>`;
      this.trace.forEach(p => { s += `<circle cx="${xp(p.h)}" cy="${yp(p.P)}" r="2.4" fill="#ff5fb8"/>`; });
      s += `<circle cx="${xp(S.h)}" cy="${yp(rho * S.g * S.h)}" r="5" fill="#fff" stroke="#ff5fb8" stroke-width="2.5"/>`;
      c.innerHTML = s;
    },

    whatif: {
      double() {
        const self = M;
        let a = self.S.h; if (a < 0.5) a = 5; if (a > 10) a = 8;
        self.pause(); self.cH.set(a); self.hShown = a;
        const P0 = (self.S.compare ? 1000 : self.S.rho) * self.S.g * a;
        A.tween(a, 2 * a, 1600, v => self.cH.set(round1(v)));
        return `<b>La presión se duplica.</b> A ${fmt(a, 1)} m el agua hacía ${fmtPa(P0)}; a ${fmt(2 * a, 1)} m hace ${fmtPa(2 * P0)}. Con el doble de agua encima, el peso que presiona también es el doble.`;
      },
      wide() {
        const self = M;
        if (self.S.compare) self.setCompare(false);
        const to = self.S.wide > 1.5 ? 1 : 2.3;
        A.tween(self.S.wide, to, 1200, v => { self.S.wide = v; });
        const P = (self.S.compare ? 1000 : self.S.rho) * self.S.g * self.S.h;
        return to > 1
          ? `<b>¡La presión no cambia!</b> Ahora el tanque es más del doble de ancho y tiene muchísima más agua, pero a ${fmtFixed(self.S.h, 1)} m el manómetro sigue marcando ${fmtPa(P)}. Solo importa cuánta agua hay <b>justo encima</b> del sensor. Tocá de nuevo para volver.`
          : `Volvimos al tanque normal y la presión sigue siendo ${fmtPa(P)}. El ancho del tanque no aparece en P = ρ·g·h.`;
      },
      moon() {
        const self = M;
        const onMoon = Math.abs(self.S.g - 1.62) < 1e-6;
        const before = (self.S.compare ? 1000 : self.S.rho) * self.S.g * self.S.h;
        self.cG.set(onMoon ? 9.81 : 1.62);
        const after = (self.S.compare ? 1000 : self.S.rho) * self.S.g * self.S.h;
        return onMoon ? `De vuelta en la Tierra: la presión volvió a ${fmtPa(after)}.`
          : `<b>En la Luna la presión es 6 veces menor.</b> Con g = 1,62 m/s², a ${fmtFixed(self.S.h, 1)} m pasa de ${fmtPa(before)} a ${fmtPa(after)}. Allá el agua pesa menos, así que aprieta menos. Tocá de nuevo para volver.`;
      },
      oil() {
        const self = M;
        self.setCompare(true);
        if (self.S.h < 1) self.cH.set(10);
        const Pw = 1000 * self.S.g * self.S.h, Po = 920 * self.S.g * self.S.h;
        return `<b>El aceite presiona menos.</b> A la misma profundidad (${fmtFixed(self.S.h, 1)} m): agua ${fmtPa(Pw)} y aceite ${fmtPa(Po)}. El aceite es más liviano (menos denso). Arrastrá a Tomás: el otro buzo copia su profundidad.`;
      }
    }
  };
  A.register(M);
})();
