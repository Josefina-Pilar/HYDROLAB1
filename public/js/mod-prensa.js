/* =========================================================
   HYDROLAB 3D · Módulo 3 – Prensa hidráulica y principio de Pascal
   Taller mecánico: bomba de palanca (pistón chico), elevador con
   pistón grande en un foso, depósito de aceite, conductos
   transparentes, manómetro, mecánico y panel de control.
   ========================================================= */
'use strict';

(() => {
  const A = HYDROLAB;
  const { fmt, fmtFixed, fmtPa, fmtkPa, fmtN, txt, html, clamp, G } = A;
  const VS = 2.5;                 // los diámetros se dibujan 2,5 veces más grandes para que se vean
  const HMAX = 1.6;               // altura máxima de elevación (m)
  const PLAT0 = 0.32;             // altura de la plataforma en reposo
  const PUMP = [-4.2, 0, 2.3];    // base de la bomba
  const PIVOT = [-4.55, 1.3];     // pivote de la palanca (x, y)
  const ARM = 0.35, HANDLE = 1.35;
  const RES = [-5.35, 0, 2.3], RES_W = 0.6, RES_H = 0.8;
  const DEF = { F1: 150, A1: 5, A2: 500, d1: 20, load: 1200 };
  const LOADS = { 1200: 'el auto', 2000: 'la camioneta', 80: 'la caja de herramientas' };

  const M = {
    id: 'prensa',
    title: 'Prensa hidráulica',
    character: { name: 'Carlos Medina', role: 'Mecánico · jefe de taller', avatar: '🧑‍🔧' },
    view: { target: [-0.6, 0.2, 1.3], radius: 11.5, theta: 0.32, phi: 1.1, minR: 3, maxR: 30, maxPhi: 1.62 },
    intro: 'Bienvenido al taller. Con esta <b>bomba de palanca</b> empujo un pistón chico y el aceite lleva esa presión hasta el <b>pistón grande</b> del foso, que levanta el auto. Tocá <b>▲ ACCIONAR PRENSA</b> o arrastrá la palanca.',
    tips: [
      'La presión que genero es <b>P = F₁/A₁</b>. Ese mismo valor llega al pistón grande, que la reparte en un área mucho mayor: <b>F₂ = P·A₂</b>.',
      'Si F₂ es menor que el peso del auto, por más que bombee <b>no sube</b>. Probá con poca fuerza y mirá qué pasa.',
      'Cada bombeo empuja un poquito de aceite. Como el pistón grande es ancho, sube <b>muy poco</b> por bombeo: así se conserva la energía.',
      'Mirá el <b>depósito</b> a la izquierda: el aceite que entra al cilindro grande sale de ahí. Al bajar, vuelve.',
      'En la vista, los diámetros de los pistones están <b>ampliados 2,5 veces</b> para que se vean bien. Las cuentas usan los valores reales.'
    ],
    S: { ...DEF, H: 0, phase: 0, mode: 'idle', strokes: 0, warned: false, example: false },

    build(app) {
      const S3 = this.scene = HL.makeScene({ top: '#1b1640', bottom: '#06040e', fogNear: 25, fogFar: 60, shadowExtent: 9, shadowCenter: [-1.5, 0, 0.5], sunDir: [-0.3, -1, -0.5], hemi: 0.7 });
      const R = S3.root;
      const { MAT, G: GG, geo, Mesh, material: Mt } = HL;
      const neonOr = Mt({ type: 'unlit', color: '#000', emissive: '#ff9a3d', emissiveIntensity: 1.5 });
      const room = HL.labRoom(36, 26, 8, { neon: neonOr, floor: '#141a36', grid: '#2a3270' });
      room.children[0].visible = false;
      R.add(room);
      // Piso con un foso que se extiende hacia adelante (cubierto con vidrio para ver el pistón grande)
      const fm = Mt({ type: 'grid', color: '#141a36', gridColor: '#2a3270', spec: 0.5, shininess: 60 });
      const P = 0.85, ZF = 2.7, zc = (ZF - P) / 2, zd = ZF + P;
      [[0, (-13 - P) / 2, 36, 13 - P], [0, (ZF + 13) / 2, 36, 13 - ZF], [-(18 + P) / 2, zc, 18 - P, zd], [(18 + P) / 2, zc, 18 - P, zd]].forEach(([x, z, w, d]) => {
        const f = new Mesh(GG.box, fm).set([x, -0.05, z], [0, 0, 0], [w, 0.1, d]); f.castShadow = false; R.add(f);
      });
      const pitM = Mt({ color: '#101736', spec: 0.3 });
      R.add(new Mesh(GG.box, pitM).set([0, -2.55, zc], [0, 0, 0], [2 * P, 0.1, zd]));
      [[P, zc, 0.1, zd], [-P, zc, 0.1, zd], [0, -P, 2 * P, 0.1], [0, ZF, 2 * P, 0.1]].forEach(([x, z, w, d]) => R.add(new Mesh(GG.box, pitM).set([x, -1.3, z], [0, 0, 0], [w, 2.5, d])));
      const pitGlass = new Mesh(GG.box, Mt({ color: '#9fdcff', opacity: 0.1, depthWrite: false, spec: 1.2, shininess: 120, fresnel: 0.7 }));
      pitGlass.set([0, -0.01, zc], [0, 0, 0], [2 * P, 0.02, zd]); pitGlass.castShadow = false; R.add(pitGlass);
      R.add(new Mesh(geo.merge([
        { g: GG.box, p: [P, 0.01, zc], s: [0.03, 0.02, zd] }, { g: GG.box, p: [-P, 0.01, zc], s: [0.03, 0.02, zd] },
        { g: GG.box, p: [0, 0.01, -P], s: [2 * P, 0.02, 0.03] }, { g: GG.box, p: [0, 0.01, ZF], s: [2 * P, 0.02, 0.03] }
      ]), neonOr));

      // Pistón grande (cilindro en el foso)
      this.housing = new Mesh(geo.cylinder(1, 1, 1, 32, false), Mt({ color: '#bfe6ff', opacity: 0.2, doubleSide: true, depthWrite: false, spec: 1.4, shininess: 140, fresnel: 0.9 }));
      this.housing.castShadow = false;
      this.oil2 = new Mesh(GG.cyl, Mt({ color: '#ff9a3d', opacity: 0.85, emissive: '#5a2a00', spec: 0.9, shininess: 90 }));
      this.ram = new Mesh(GG.cyl, MAT.chrome);
      this.ramCap = new Mesh(GG.cyl, MAT.steelDark);
      R.add(this.housing, this.oil2, this.ram, this.ramCap);

      // Plataforma elevadora y cargas
      this.lift = new HL.Node('plataforma');
      this.lift.add(new Mesh(GG.box, Mt({ color: '#2b3352', spec: 0.6 })).set([0, 0, 0], [0, 0, 0], [4.8, 0.14, 2.3]));
      [-0.75, 0.75].forEach(z => this.lift.add(new Mesh(GG.box, MAT.yellow).set([0, 0.09, z], [0, 0, 0], [4.6, 0.04, 0.5])));
      this.lift.add(new Mesh(GG.box, neonOr).set([0, -0.02, 1.16], [0, 0, 0], [4.8, 0.03, 0.02]));
      this.car = HL.car('#d63a4a'); this.car.set([0, 0.07, 0]);
      this.suv = HL.car('#2f6fe0', 1.12); this.suv.set([0, 0.07, 0]);
      this.box = HL.crate(); this.box.set([0, 0.07, 0]);
      this.lift.add(this.car, this.suv, this.box);
      R.add(this.lift);

      // Bomba de palanca
      const pump = new HL.Node('bomba').set(PUMP);
      pump.add(new Mesh(GG.box, MAT.steelDark).set([-0.3, 0.06, 0], [0, 0, 0], [2.2, 0.12, 0.9]));
      pump.add(new Mesh(GG.box, MAT.steel).set([PIVOT[0] - PUMP[0], (PIVOT[1] - 0.1) / 2, -0.12], [0, 0, 0], [0.1, PIVOT[1] - 0.1, 0.1]));
      R.add(pump);
      this.cyl1 = new Mesh(geo.cylinder(1, 1, 1, 28, false), Mt({ color: '#bfe6ff', opacity: 0.22, doubleSide: true, depthWrite: false, spec: 1.4, shininess: 140, fresnel: 0.9 }));
      this.cyl1.castShadow = false;
      this.oil1 = new Mesh(GG.cyl, Mt({ color: '#ff9a3d', opacity: 0.85, emissive: '#5a2a00', spec: 0.9 }));
      this.pist1 = new Mesh(GG.cyl, MAT.steelDark);
      this.rod1 = new Mesh(GG.cylLow, MAT.chrome);
      this.lever = new HL.Node('palanca');
      this.lever.add(new Mesh(GG.cylLow, MAT.red).set([HANDLE / 2, 0, 0], [0, 0, Math.PI / 2], [0.035, HANDLE, 0.035]));
      this.lever.add(new Mesh(GG.capsule || GG.cyl, MAT.rubber).set([HANDLE - 0.1, 0, 0], [0, 0, Math.PI / 2], [0.05, 0.25, 0.05]));
      this.lever.add(new Mesh(GG.cyl, MAT.steel).set([0, 0, 0], [Math.PI / 2, 0, 0], [0.07, 0.16, 0.07]));
      this.leverHit = this.lever;
      R.add(this.cyl1, this.oil1, this.pist1, this.rod1, this.lever);

      // Depósito de aceite
      const res = new HL.Node('deposito').set(RES);
      res.add(new Mesh(GG.box, Mt({ color: '#bfe6ff', opacity: 0.18, doubleSide: true, depthWrite: false, spec: 1.2, shininess: 120, fresnel: 0.8 })).set([0, 0.12 + RES_H / 2, 0], [0, 0, 0], [RES_W, RES_H, RES_W]));
      res.children[0].castShadow = false;
      this.resOil = new Mesh(GG.box, Mt({ color: '#ff9a3d', opacity: 0.8, emissive: '#4a2200', spec: 0.8 }));
      res.add(this.resOil);
      R.add(res);
      this.res = res;

      // Conductos transparentes con aceite
      const path = [[PUMP[0], 0.2, PUMP[2]], [-1.25, 0.2, PUMP[2]], [-1.25, 0.2, 0.55], [-0.55, 0.2, 0.55], [-0.55, -2.15, 0.55], [-0.55, -2.15, 0], [0, -2.15, 0]];
      this.path = path;
      R.add(HL.pipe(path, 0.07, Mt({ color: '#bfe6ff', opacity: 0.25, depthWrite: false, spec: 1.4, shininess: 140, fresnel: 0.9 }), { flanges: false }));
      R.add(HL.pipe(path, 0.045, Mt({ color: '#ff9a3d', opacity: 0.75, emissive: '#5a2a00' }), { flanges: false }));
      const back = [[RES[0], 0.2, RES[2]], [PUMP[0] - 0.3, 0.2, RES[2]]];
      R.add(HL.pipe(back, 0.045, Mt({ color: '#ff9a3d', opacity: 0.75, emissive: '#5a2a00' }), { flanges: false }));
      R.add(HL.pipe([[0.55, -2.15, -0.55], [0.55, 0.2, -0.55], [1.6, 0.2, -0.55], [1.6, 0.2, 2.9], [RES[0], 0.2, 2.9], [RES[0], 0.2, RES[2] + 0.3]], 0.04, MAT.steelDark, { flanges: false }));
      this.valve = HL.valve(0.18, '#3ee6b0');
      this.valve.set([1.6, 0.45, 1.6], [0, Math.PI / 2, 0]);
      R.add(this.valve);
      this.gauge = HL.gauge(0.22, '#ff9a3d');
      this.gauge.node.set([-2.4, 0.62, PUMP[2] + 0.02]);
      R.add(this.gauge.node);
      R.add(new Mesh(GG.cylLow, MAT.steel).set([-2.4, 0.36, PUMP[2]], [0, 0, 0], [0.03, 0.3, 0.03]));
      // Partículas de flujo
      this.flow = new HL.Points(40, { color: '#ffe0b8', opacity: 0.95, additive: true });
      this.flowT = Array.from({ length: 40 }, (_, i) => i / 40);
      R.add(this.flow);
      this.segLen = []; let tot = 0;
      for (let i = 0; i < path.length - 1; i++) { const l = HL.v3.dist(path[i], path[i + 1]); this.segLen.push(l); tot += l; }
      this.pathLen = tot;

      // Flechas de fuerza
      this.aF1 = HL.arrow('#b06cff', 0.04);
      this.aF2 = HL.arrow('#3ee6b0', 0.06);
      this.aW = HL.arrow('#ff9a3d', 0.06);
      R.add(this.aF1.node, this.aF2.node, this.aW.node);

      // Mecánico, consola y decorado
      this.mech = HL.characters.mecanico();
      this.mech.pose = 'lever';
      R.add(this.mech.root);
      this.characters = [this.mech];
      app.labels.add('<span class="name3d">Carlos · mecánico</span>', () => this.mech.root.worldPos([0, 2.0, 0]), { group: 'prensa' });
      const cons = HL.console3d(1.8, '#ff9a3d'); cons.set([4.4, 0, 3.6], [0, -0.55, 0]); R.add(cons);
      this.cons = cons;
      const tb = HL.toolBoard(5); tb.set([0, 0, -12.9]); R.add(tb);
      const sh1 = HL.shelf(3); sh1.set([-7, 0, -12.5]); R.add(sh1);
      const sh2 = HL.shelf(3); sh2.set([7, 0, -12.5]); R.add(sh2);
      const ti = HL.tires(5); ti.set([6.5, 0, -3]); R.add(ti);
      const ti2 = HL.tires(3); ti2.set([7.2, 0, -2.2]); R.add(ti2);
      const car2 = HL.car('#e9edf5'); car2.set([9, 0, -7], [0, 0.6, 0]); R.add(car2);

      // Etiquetas
      app.labels.add('<span class="tag3d vi" id="ph-l-F1">F₁</span>', () => this.handleEnd && HL.v3.add(this.handleEnd, [0, 0.95, 0]), { group: 'prensa' });
      app.labels.add('<span class="tag3d mi" id="ph-l-F2">F₂</span>', () => [0.25, PLAT0 + this.Hd - 0.55, 1.25], { group: 'prensa', cls: 'l' });
      app.labels.add('<span class="tag3d or" id="ph-l-W">Peso</span>', () => [0, PLAT0 + this.Hd + this.loadH() + 1.25, 0], { group: 'prensa' });
      app.labels.add('<span class="tag3d cy" id="ph-l-A1">A₁</span>', () => [PUMP[0] + 0.25, 0.6, PUMP[2] + 0.2], { group: 'prensa', cls: 'l' });
      app.labels.add('<span class="tag3d cy" id="ph-l-A2">A₂</span>', () => [0.6, -0.9, 0.9], { group: 'prensa', cls: 'l' });
      app.labels.add('<span class="tag3d sm">depósito de aceite</span>', () => [RES[0], 1.05, RES[2]], { group: 'prensa' });
      app.labels.add('<span class="tag3d sm">válvula de descarga</span>', () => [1.6, 0.85, 1.6], { group: 'prensa' });
      app.labels.add('<span class="digi" id="ph-l-gauge"><small>MANÓMETRO</small>—</span>', () => [-2.4, 1.05, PUMP[2]], { group: 'prensa' });
      app.labels.add('<span class="digi" id="ph-l-panel">—</span>', () => this.cons.worldPos([0, 1.72, -0.28]), { group: 'prensa' });
      app.labels.add('<span class="tag3d sm" id="ph-l-speed"></span>', () => [2.6, PLAT0 + this.Hd + 0.2, 1.3], { group: 'prensa', cls: 'l' });

      S3.pointLights = [
        { pos: [0, -1.2, 1.8], color: HL.color('#56d8ff'), intensity: 4 },
        { pos: [-3.5, 3, 3], color: HL.color('#ff9a3d'), intensity: 3 },
        { pos: [2, 4, 3], color: HL.color('#8b6cff'), intensity: 3 }
      ];

      // Controles
      this.cF1 = A.bindControl('ph-F1', v => { this.S.F1 = v; this.S.warned = false; this.onChange(); });
      this.cA1 = A.bindControl('ph-A1', v => { this.S.A1 = v; this.S.warned = false; this.onChange(); });
      this.cA2 = A.bindControl('ph-A2', v => { this.S.A2 = v; this.S.warned = false; this.onChange(); });
      this.cD1 = A.bindControl('ph-d1', v => { this.S.d1 = v; this.onChange(); });
      this.cLoad = A.bindControl('ph-load', v => { this.S.load = v; this.S.warned = false; this.onChange(); });
      A.byId('ph-up').addEventListener('click', () => this.setMode('up'));
      A.byId('ph-pause').addEventListener('click', () => this.setMode('idle'));
      A.byId('ph-down').addEventListener('click', () => this.setMode('down'));
      A.byId('ph-reset').addEventListener('click', () => this.reset());
      A.byId('ph-example').addEventListener('click', () => this.loadExample());
      this.Hd = 0;
      this.onChange();
    },

    phys() {
      const S = this.S;
      const P = S.F1 / (S.A1 * 1e-4);
      const F2 = P * S.A2 * 1e-4;
      const W = S.load * G;
      const Pn = W / (S.A2 * 1e-4);
      const dStroke = (S.A1 * S.d1) / S.A2 / 100;     // m que sube el pistón grande por bombeo
      return { P, F2, W, Pn, can: F2 >= W, ratio: S.A2 / S.A1, dStroke, F1need: W * S.A1 / S.A2 };
    },

    loadH() { return this.S.load === 80 ? 0.8 : this.S.load === 2000 ? 1.6 : 1.45; },

    onChange() {
      const S = this.S;
      this.car.visible = S.load === 1200;
      this.suv.visible = S.load === 2000;
      this.box.visible = S.load !== 1200 && S.load !== 2000;
      const isEx = S.F1 === 100 && S.A1 === 5 && S.A2 === 50 && S.load === 80;
      A.byId('ph-example-box').hidden = !(S.example && isEx);
      this.S.strokes = S.H / this.phys().dStroke;
    },

    setMode(m) {
      const S = this.S;
      S.mode = m;
      A.byId('ph-up').classList.toggle('active', m === 'up');
      A.byId('ph-down').classList.toggle('active', m === 'down');
      const p = this.phys();
      if (m === 'up') {
        if (!p.can) { S.warned = true; A.say(this.cannotText(p)); }
        else if (S.H >= HMAX - 0.001) A.say('La plataforma ya está arriba del todo. Tocá <b>▼ Bajar</b> para abrir la válvula de descarga.');
        else A.say(`¡Vamos! Con F₁ = ${fmtN(S.F1)} genero ${fmtkPa(p.P)} de presión. En el pistón grande eso da F₂ = ${fmtN(p.F2)}, más que el peso de ${LOADS[S.load] || 'la carga'} (${fmtN(p.W)}). <b>Sube.</b>`);
      } else if (m === 'down') {
        A.say('Abro la <b>válvula de descarga</b>: el peso de la carga empuja el aceite de vuelta al depósito y la plataforma baja despacio.');
      }
    },

    cannotText(p) {
      const S = this.S;
      return `<b>No alcanza.</b> F₂ = ${fmtN(p.F2)}, pero ${LOADS[S.load] || 'la carga'} pesa ${fmtN(p.W)}. Por más que bombee, no sube. Necesito al menos <b>F₁ = ${fmtN(p.F1need)}</b> con estos pistones, o un pistón grande más ancho.`;
    },

    reset() {
      const S = this.S;
      S.example = false; S.mode = 'down';
      this.cF1.set(DEF.F1); this.cA1.set(DEF.A1); this.cA2.set(DEF.A2); this.cD1.set(DEF.d1); this.cLoad.set(DEF.load);
      A.byId('ph-up').classList.remove('active');
      A.byId('ph-down').classList.add('active');
      A.$$('[data-sim="prensa"] button').forEach(b => b.classList.remove('on'));
      A.say('Reinicio el experimento: bajo la plataforma y vuelvo a los valores iniciales (F₁ = 150 N, A₁ = 5 cm², A₂ = 500 cm², el auto de 1200 kg).');
    },

    loadExample() {
      this.S.example = true;
      this.S.H = 0; this.Hd = 0;
      this.cF1.set(100); this.cA1.set(5); this.cA2.set(50); this.cLoad.set(80);
      this.setMode('up');
      A.byId('ph-example-box').hidden = false;
      A.say('Experimento de ejemplo: <b>100 N</b> sobre un pistón de <b>5 cm²</b> y un pistón grande de <b>50 cm²</b>. F₂ = 100 · 50 / 5 = <b>1000 N</b>: diez veces más. Alcanza para la caja de 80 kg (785 N), pero no para un auto.');
    },

    hitTest(ray) { return HL.pick(ray, [this.lever], 0.12); },
    hover(ray) { return this.hitTest(ray) ? 'grab' : null; },
    pointerDown(ray) {
      if (!this.hitTest(ray)) return false;
      this.dragging = true;
      this.S.mode = 'idle';
      A.byId('ph-up').classList.remove('active'); A.byId('ph-down').classList.remove('active');
      this.dragPlane = { p: [PIVOT[0], PIVOT[1], PUMP[2]], n: [0, 0, 1] };
      this.lastPhase = this.S.phase;
      return true;
    },
    pointerMove(ray) {
      const hit = HL.rayPlane(ray, this.dragPlane.p, this.dragPlane.n) || HL.rayPlane(ray, this.dragPlane.p, [0, 0, -1]);
      if (!hit) return;
      const ang = Math.atan2(hit[1] - PIVOT[1], Math.max(0.1, hit[0] - PIVOT[0]));
      const th = this.theta0();
      const ph = clamp((th - ang) / (2 * th), 0, 1);
      this.applyPhase(ph, true);
    },
    pointerUp() { this.dragging = false; },

    theta0() { return Math.asin(clamp((this.S.d1 / 100) / 2 / ARM, 0, 0.95)); },

    /** Avanza la fase de la palanca; en la bajada empuja aceite (válvulas antirretorno) */
    applyPhase(ph, manual) {
      const S = this.S, p = this.phys();
      const d = ph - S.phase;
      if (d > 0 && p.can && S.H < HMAX) {
        S.H = Math.min(HMAX, S.H + d * p.dStroke);
        S.strokes += d;
      }
      if (manual && d > 0.02 && !p.can && !S.warned) { S.warned = true; A.say(this.cannotText(p)); }
      S.phase = ph;
    },

    highlight(v, on) {
      const map = { F1: 'ph-l-F1', A1: 'ph-l-A1', F2: 'ph-l-F2', A2: 'ph-l-A2' };
      const el = A.byId(map[v]); if (el) el.classList.toggle('hl', on);
    },

    enter() {},
    exit() { this.setMode('idle'); },

    update(dt, t) {
      const S = this.S, p = this.phys();
      let pumping = false, flowDir = 0, accel = 1;
      if (S.mode === 'up') {
        pumping = true;
        const f = 1.1;                                           // bombeos visibles por segundo
        if (p.can && S.H < HMAX) {
          const realRate = p.dStroke * f;                        // m/s si cada vaivén fuera un bombeo real
          const vis = Math.max(realRate, 0.14);                  // velocidad mostrada
          accel = vis / realRate;
          const before = S.H;
          S.H = Math.min(HMAX, S.H + vis * dt);
          S.strokes += (S.H - before) / p.dStroke;
          flowDir = 1;
          if (S.H >= HMAX) { S.mode = 'idle'; A.byId('ph-up').classList.remove('active'); A.say(`Arriba del todo: la plataforma subió <b>${fmtFixed(HMAX * 100, 0)} cm</b>. Para eso el pistón chico recorrió en total <b>${fmt(S.strokes * S.d1 / 100, 1)} m</b> en ${fmt(Math.round(S.strokes))} bombeos. Fuerza a cambio de recorrido.`); }
        }
        S.phase = 0.5 - 0.5 * Math.cos(t * f * Math.PI * 2);
      } else if (S.mode === 'down') {
        S.H = Math.max(0, S.H - 0.18 * dt);
        S.strokes = S.H / p.dStroke;
        flowDir = S.H > 0 ? -1 : 0;
        this.valve.userData.wheel.rotation[2] += dt * 3;
        if (S.H <= 0) { S.mode = 'idle'; A.byId('ph-down').classList.remove('active'); }
        S.phase += (0 - S.phase) * Math.min(1, dt * 4);
      }
      if (this.dragging) { pumping = true; flowDir = p.can ? 1 : 0; }
      this.Hd = S.H;

      // Geometría dependiente de las áreas (radios reales × VS)
      const r1 = Math.sqrt(S.A1 * 1e-4 / Math.PI) * VS, r2 = Math.sqrt(S.A2 * 1e-4 / Math.PI) * VS;
      const H = S.H;
      const platY = PLAT0 + H;
      this.lift.position = [0, platY, 0];
      const ramBot = -2.05 + H, hb = -2.38;
      this.housing.set([0, (hb + -0.04) / 2, 0], [0, 0, 0], [r2 + 0.035, -0.04 - hb, r2 + 0.035]);
      this.oil2.set([0, (hb + ramBot) / 2, 0], [0, 0, 0], [r2, Math.max(0.01, ramBot - hb), r2]);
      this.ram.set([0, (ramBot + platY - 0.07) / 2, 0], [0, 0, 0], [r2 * 0.97, platY - 0.07 - ramBot, r2 * 0.97]);
      this.ramCap.set([0, ramBot + 0.03, 0], [0, 0, 0], [r2, 0.06, r2]);

      // Bomba: cilindro chico, pistón, vástago y palanca
      const th0 = this.theta0();
      const th = th0 - 2 * th0 * S.phase;
      const cy0 = 0.22, cy1 = 1.0;
      const attachX = PIVOT[0] + ARM * Math.cos(th), attachY = PIVOT[1] + ARM * Math.sin(th);
      const pistTop = attachY - 0.12 - (PIVOT[1] - 0.12 - 0.86) ;
      const pistY = clamp(pistTop, cy0 + 0.08, cy1 - 0.02);
      this.cyl1.set([PUMP[0], (cy0 + cy1) / 2, PUMP[2]], [0, 0, 0], [r1 + 0.02, cy1 - cy0, r1 + 0.02]);
      this.oil1.set([PUMP[0], (cy0 + pistY) / 2, PUMP[2]], [0, 0, 0], [r1, pistY - cy0, r1]);
      this.pist1.set([PUMP[0], pistY + 0.025, PUMP[2]], [0, 0, 0], [r1, 0.05, r1]);
      const rodTop = [attachX, attachY, PUMP[2]], rodBot = [PUMP[0], pistY + 0.05, PUMP[2]];
      const dv = HL.v3.sub(rodTop, rodBot);
      this.rod1.set(HL.v3.lerp(rodBot, rodTop, 0.5), HL.alignY(dv), [0.018, HL.v3.len(dv), 0.018]);
      this.lever.set([PIVOT[0], PIVOT[1], PUMP[2]], [0, 0, th], [1, 1, 1]);
      this.handleEnd = [PIVOT[0] + HANDLE * Math.cos(th), PIVOT[1] + HANDLE * Math.sin(th), PUMP[2]];

      // Mecánico tomando la palanca
      const he = this.handleEnd;
      this.mech.root.set([he[0] + 0.62, 0, he[2] - 0.02], [0, -Math.PI / 2, 0], [1, 1, 1]);
      this.mech.animate(t, { pose: 'lever', lever: clamp((1.62 - he[1]) / 0.75, 0, 1) });

      // Depósito
      const lvl = clamp(0.68 - (S.A2 * 1e-4 * H) / (RES_W * RES_W), 0.03, 0.75);
      this.resOil.set([0, 0.12 + lvl / 2, 0], [0, 0, 0], [RES_W - 0.04, lvl, RES_W - 0.04]);

      // Manómetro: presión real del aceite
      const Pnow = pumping || S.H > 0 ? (p.can ? p.Pn : p.P * (0.6 + 0.4 * S.phase)) : 0;
      this.gauge.set(Pnow / 3e6);
      this.Pnow = Pnow;

      // Partículas de aceite moviéndose por el conducto
      const speed = flowDir * 0.6;
      const fl = this.flow;
      this.flowT.forEach((u, i) => {
        let v = (u + speed * dt / this.pathLen * 6 + 1) % 1;
        this.flowT[i] = v;
        let d = v * this.pathLen, k = 0;
        while (k < this.segLen.length - 1 && d > this.segLen[k]) { d -= this.segLen[k]; k++; }
        const pt = HL.v3.lerp(this.path[k], this.path[k + 1], clamp(d / this.segLen[k], 0, 1));
        fl.data.set([pt[0], pt[1], pt[2], flowDir ? 0.07 : 0.0001], i * 4);
      });
      fl.dirty = true;

      // Flechas (escala logarítmica)
      const len = F => 0.35 + 1.0 * clamp(Math.log10(Math.max(F, 1) / 10) / 4.5, 0, 1.4);
      this.aF1.set(HL.v3.add(he, [0, 0.12 + len(S.F1), 0]), [0, -1, 0], len(S.F1));
      const F2shown = p.can ? p.W : p.F2;
      this.aF2.set([0, platY - 0.85, 1.25], [0, 1, 0], len(p.F2) * 0.8);
      this.aW.set([0, platY + this.loadH() + 0.15 + len(p.W) * 0.8, 0], [0, -1, 0], len(p.W) * 0.8);
      this.refreshHUD(p, accel, F2shown);
    },

    refreshHUD(p, accel) {
      const S = this.S;
      txt('ph-o-F2', fmtN(p.F2));
      const st = A.byId('ph-o-F2-box');
      st.classList.toggle('ok', p.can); st.classList.toggle('bad', !p.can);
      txt('ph-o-state', p.can ? `✔ alcanza para ${LOADS[S.load] || 'la carga'}` : `✗ no alcanza: faltan ${fmtN(p.W - p.F2)}`);
      txt('ph-o-P', fmtkPa(p.P));
      txt('ph-o-Pn', fmtkPa(p.Pn));
      txt('ph-o-W', `${fmtN(p.W)} (${fmt(S.load)} kg)`);
      txt('ph-o-x', `× ${fmtFixed(p.ratio, 1)}`);
      txt('ph-o-H', `${fmtFixed(S.H * 100, 1)} cm`);
      html('ph-f-sub', `${fmt(S.F1)} N / ${fmt(S.A1, 1)} cm² = F₂ / ${fmt(S.A2)} cm²<br>F₂ = ${fmt(S.F1)} · ${fmt(S.A2)} / ${fmt(S.A1, 1)} = <b>${fmtN(p.F2)}</b>`);
      const travel = S.strokes * S.d1 / 100;
      txt('ph-o-d1', `${fmt(travel, travel < 10 ? 2 : 1)} m`);
      txt('ph-o-d2', `${fmtFixed(S.H, 3)} m`);
      const mx = Math.max(travel, S.H, 1e-6);
      A.byId('ph-r1').style.width = `${(travel / mx) * 100}%`;
      A.byId('ph-r2').style.width = `${(S.H / mx) * 100}%`;
      html('ph-energy', S.H > 0.001
        ? `Para subir ${fmtFixed(S.H * 100, 1)} cm, el pistón chico recorrió <b>${fmt(travel, 2)} m</b> (${fmt(Math.round(S.strokes))} bombeos de ${fmt(S.d1)} cm). Trabajo sobre la carga: peso · H = ${fmt(p.W * S.H, 0)} J. Es el mismo trabajo que hizo el operario: <b>la energía se conserva</b>.`
        : `Cada bombeo de ${fmt(S.d1)} cm sube la plataforma solo <b>${fmt(p.dStroke * 100, 3)} cm</b>: A₁·d₁ = A₂·d₂.`);
      txt('ph-l-F1', `F₁ = ${fmtN(S.F1)}`);
      txt('ph-l-F2', `F₂ = ${fmtN(p.F2)}`);
      txt('ph-l-W', `Peso = ${fmtN(p.W)}`);
      txt('ph-l-A1', `A₁ = ${fmt(S.A1, 1)} cm²`);
      txt('ph-l-A2', `A₂ = ${fmt(S.A2)} cm²`);
      A.byId('ph-l-gauge').innerHTML = `<small>PRESIÓN DEL ACEITE</small>${fmtkPa(this.Pnow || 0)}`;
      A.byId('ph-l-panel').innerHTML = `<small>PANEL · PASCAL</small>F₁ ${fmtN(S.F1)} · A₁ ${fmt(S.A1, 1)} cm²<br>F₂ ${fmtN(p.F2)} · A₂ ${fmt(S.A2)} cm²`;
      txt('ph-l-speed', S.mode === 'up' && accel > 1.5 ? `▶ animación acelerada ×${fmt(Math.round(accel))}` : '');
      A.byId('ph-l-speed').style.display = S.mode === 'up' && accel > 1.5 ? '' : 'none';
    },

    whatif: {
      car() {
        const s = M;
        s.cLoad.set(1200);
        let p = s.phys();
        if (p.F1need > 1000 || p.F1need < 10) { s.cA1.set(5); s.cA2.set(1000); p = s.phys(); }
        s.cF1.set(Math.ceil(p.F1need));
        s.S.H = Math.min(s.S.H, HMAX - 0.01);
        s.setMode('up');
        return `<b>Alcanza con ${fmtN(Math.ceil(p.F1need))}.</b> El auto pesa 1200 · 9,81 = ${fmtN(1200 * G)}. Con A₁ = ${fmt(s.S.A1)} cm² y A₂ = ${fmt(s.S.A2)} cm² la fuerza se multiplica × ${fmt(s.S.A2 / s.S.A1)}, así que basta F₁ = peso · A₁/A₂ ≈ ${fmtN(p.F1need)}. ¡Lo que pesa una mochila!`;
      },
      doubleA2() {
        const s = M; let a = s.S.A2;
        if (a * 2 > 1000) { a = 250; s.cA2.set(a); }
        const before = s.phys().F2;
        s.cA2.set(a * 2);
        const after = s.phys().F2;
        return `<b>F₂ se duplica.</b> A₂ pasa de ${fmt(a)} a ${fmt(2 * a)} cm² y F₂ de ${fmtN(before)} a ${fmtN(after)}. Misma presión sobre el doble de superficie: el doble de fuerza. A cambio, cada bombeo sube la mitad.`;
      },
      smallA2() {
        const s = M;
        s.cLoad.set(80); s.cF1.set(1000); s.cA1.set(50); s.cA2.set(10);
        const p = s.phys();
        s.setMode('up');
        return `<b>La prensa reduce la fuerza.</b> Con A₁ = 50 cm² y A₂ = 10 cm², F₂ = 1000 · 10/50 = ${fmtN(p.F2)}: la quinta parte de lo que hago. Ni siquiera alcanza para la caja de 80 kg (${fmtN(p.W)}). Por eso el pistón de salida siempre es el más ancho.`;
      },
      energy() {
        const s = M, p = s.phys();
        return `<b>No crea energía.</b> Para subir la carga 1 m hace falta un trabajo de peso · 1 m = ${fmt(p.W, 0)} J. Con estos pistones, el pistón chico tiene que recorrer ${fmt(s.S.A2 / s.S.A1, 1)} m en total para lograrlo, empujando con F₁ = ${fmtN(p.F1need)}: ${fmtN(p.F1need)} · ${fmt(s.S.A2 / s.S.A1, 1)} m = ${fmt(p.W, 0)} J. Mirá las barras de «Conservación de la energía».`;
      }
    }
  };
  A.register(M);
})();
