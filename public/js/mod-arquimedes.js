/* =========================================================
   HYDROLAB 3D · Módulo 4 – Principio de Arquímedes
   Puerto industrial con un barco de carga real (casco integrado
   numéricamente), mar con olas, zona sumergida, presiones sobre
   el casco, peso vs. empuje y un tanque de pruebas de materiales.
   ========================================================= */
'use strict';

(() => {
  const A = HYDROLAB;
  const { fmt, fmtFixed, fmtN, txt, html, clamp, G } = A;
  const SHIP_MASS = 900;               // t (barco vacío)
  const SEABED = -22;
  const TANK = [-24, 2.5, 18];         // tanque de pruebas sobre el muelle
  const TW = 1.2, TD = 0.8, TH = 1.0, TW0 = 0.6;   // ancho, fondo, alto, agua inicial (m)
  const WAVE = 0.32, WSC = 0.12;
  const RHO_NAME = { 1000: 'agua dulce', 1025: 'agua de mar', 1240: 'agua del Mar Muerto' };

  const fmtMN = N => (Math.abs(N) >= 1e6 ? `${fmtFixed(N / 1e6, 2)} MN` : fmtN(N));
  /** Altura de las olas (misma fórmula que el shader del agua) */
  const waveH = (x, z, t) => (Math.sin(x * 0.9 * WSC + t * 1.3) * 0.5 + Math.sin(z * 1.3 * WSC - t * 1.1) * 0.35 + Math.sin((x + z) * 2.1 * WSC + t * 2.2) * 0.15) * WAVE;

  const M = {
    id: 'arquimedes',
    title: 'Principio de Arquímedes',
    character: { name: 'Ing. Lucía Ferreyra', role: 'Ingeniera naval', avatar: '👩‍✈️' },
    view: { target: [0, 0, 0], radius: 88, theta: 2.4, phi: 1.24, minR: 12, maxR: 230, maxPhi: 1.62, minPhi: 0.2 },
    intro: 'Este carguero pesa <b>900 toneladas vacío</b> y es de acero, que es 8 veces más denso que el agua. Aun así flota. Agregá <b>carga</b> y mirá cómo se hunde más: la zona oscura del casco es la parte <b>sumergida</b>.',
    tips: [
      'El empuje <b>no</b> aparece porque el agua «quiera volver a su lugar». Aparece porque el agua <b>presiona más fuerte desde abajo</b> que desde arriba: las flechas rosas sobre el casco lo muestran.',
      'Las presiones de los costados se cancelan entre sí. La que empuja el fondo hacia arriba es la que queda: esa <b>fuerza resultante</b> es el empuje.',
      'Cuando el barco flota quieto, <b>empuje = peso</b>. Si agregás carga, el barco se hunde hasta desplazar más agua y el empuje vuelve a igualar al peso.',
      'Si el peso supera el <b>empuje máximo</b> (el casco entero bajo el agua), ya no hay forma de equilibrarlo: el barco se hunde.',
      'Probá el <b>tanque de pruebas</b> (arriba a la izquierda) para comparar materiales: corcho, madera, hielo, aluminio, hierro…'
    ],
    S: { cargo: 300, rho: 1025, g: 9.81, press: true, ghost: false, waves: true, view: 'port', mrho: 500, trho: 1000, vol: 27 },
    d: 1.5, dv: 0, sinkY: 0,

    build(app) {
      const S3 = this.scene = HL.makeScene({ top: '#3e3a8f', bottom: '#d7a3e8', glow: [0.25, 0.12, 0.2], glowPos: [0.7, 0.35], fog: '#7d78c4', fogNear: 120, fogFar: 420, sky: '#c6b8ff', ground: '#24325e', hemi: 0.75, sun: 1.7, sunDir: [-0.6, -0.55, -0.4], sunColor: '#ffe2c6', shadowExtent: 48, shadowCenter: [0, 0, 6], waterY: 0, waterTint: '#1a5d9e' });
      const R = S3.root;
      const { MAT, G: GG, geo, Mesh, material: Mt } = HL;

      // Mar y fondo
      this.sea = new Mesh(geo.plane(900, 900, 150, 150), Mt({ type: 'water', color: '#1f5fa8', opacity: 0.5, wave: WAVE, waveScale: WSC, spec: 1.6, shininess: 160, fresnel: 0.5, depthWrite: false, doubleSide: true }));
      this.sea.castShadow = false;
      this.sea.userData.sortBias = -200;
      R.add(this.sea);
      const bed = new Mesh(geo.plane(900, 900), Mt({ color: '#2b3a63', caustics: true, spec: 0.1 }));
      bed.set([0, SEABED, 0]); bed.castShadow = false;
      R.add(bed);

      // Muelle
      const pier = new HL.Node('muelle');
      const conc = Mt({ color: '#8a8fa6', spec: 0.15, shininess: 10 });
      pier.add(new Mesh(GG.box, conc).set([0, 1.5, 20], [0, 0, 0], [180, 2, 20]));
      const pil = [];
      for (let x = -88; x <= 88; x += 8) pil.push({ g: GG.cyl, p: [x, -10, 10.6], s: [0.7, 23, 0.7] });
      pier.add(new Mesh(geo.merge(pil), Mt({ color: '#5a6078', spec: 0.1 })));
      pier.add(new Mesh(GG.box, MAT.yellow).set([0, 2.55, 10.3], [0, 0, 0], [180, 0.1, 0.25]));
      this.bollards = [];
      for (let x = -42; x <= 42; x += 14) {
        const b = new HL.Node('bita').set([x, 2.5, 11]);
        b.add(new Mesh(GG.cyl, MAT.steelDark).set([0, 0.35, 0], [0, 0, 0], [0.3, 0.7, 0.3]));
        b.add(new Mesh(GG.cyl, MAT.steelDark).set([0, 0.72, 0], [0, 0, 0], [0.42, 0.12, 0.42]));
        pier.add(b);
        this.bollards.push([x, 3.1, 11]);
      }
      const cols = ['#d63a4a', '#2f6fe0', '#f5c518', '#23a679', '#ff8a3d', '#8a58c9'];
      let k = 0;
      for (let x = 30; x <= 60; x += 6.4) for (let z = 18; z <= 26; z += 2.6) for (let y = 0; y < 1 + (k % 3); y++) {
        pier.add(HL.container(cols[(k + y) % cols.length]).set([x, 2.5 + y * 2.6, z], [0, 0, 0], [1, 1, 1])); k++;
      }
      // Grúa pórtico
      const crane = new HL.Node('grua').set([16, 2.5, 18]);
      const yel = MAT.yellow;
      [[-4, -6], [4, -6], [-4, 6], [4, 6]].forEach(([x, z]) => crane.add(new Mesh(GG.box, yel).set([x, 9, z], [0, 0, 0], [0.8, 18, 0.8])));
      crane.add(new Mesh(GG.box, yel).set([0, 18.5, -6], [0, 0, 0], [9, 1, 1]));
      crane.add(new Mesh(GG.box, yel).set([0, 18.5, 6], [0, 0, 0], [9, 1, 1]));
      crane.add(new Mesh(GG.box, yel).set([0, 19.6, -12], [0, 0, 0], [3, 1.2, 46]));
      crane.add(new Mesh(GG.box, MAT.steelDark).set([0, 18.6, -22], [0, 0, 0], [2.4, 1.2, 2.4]));
      this.hook = new Mesh(GG.cylLow, MAT.rubber);
      crane.add(this.hook);
      pier.add(crane);
      R.add(pier);

      // Barco
      this.ship = HL.ship();
      R.add(this.ship.node);
      this.Vmax = this.ship.volume.volumeAt(this.ship.shape.D);
      this.ropes = this.bollards.filter((_, i) => i % 2 === 0).map(() => { const m = new Mesh(GG.cylLow, Mt({ color: '#e9dcc0', spec: 0.1 })); R.add(m); return m; });

      // Flechas de peso, empuje y presiones sobre el casco
      this.aW = HL.arrow('#ff9a3d', 0.5);
      this.aE = HL.arrow('#3ee6b0', 0.5);
      R.add(this.aW.node, this.aE.node);
      this.pArrows = [];
      [-18, 0, 16].forEach(x => {
        [-4, 0, 4].forEach(z => this.pArrows.push({ x, z, side: 0, a: HL.arrow('#ff5fb8', 0.2) }));
        [1, -1].forEach(sd => [0.25, 0.7].forEach(f => this.pArrows.push({ x, f, side: sd, a: HL.arrow('#ff5fb8', 0.2) })));
      });
      this.pArrows.forEach(p => R.add(p.a.node));
      this.draftBar = new Mesh(GG.cylLow, Mt({ type: 'unlit', color: '#000', emissive: '#56d8ff', emissiveIntensity: 1.6 }));
      R.add(this.draftBar);

      // Cubo de agua desplazada
      this.ghost = new HL.Node('agua desplazada');
      this.ghostBox = new Mesh(GG.box, Mt({ color: '#3aa0ff', opacity: 0.45, depthWrite: false, spec: 1.2, shininess: 120, fresnel: 0.8, doubleSide: true }));
      this.ghostBox.castShadow = false;
      this.ghost.add(this.ghostBox);
      this.ghost.visible = false;
      R.add(this.ghost);

      // Ingeniera naval
      this.eng = HL.characters.naval();
      this.eng.root.set([30, 0.9, -21], [0, -0.9, 0]);
      const pont = new Mesh(GG.box, Mt({ color: '#e9edf5', spec: 0.3 })); pont.set([30, 0.35, -21], [0, 0, 0], [6, 0.9, 4]); R.add(pont);
      this.pont = pont;
      R.add(new Mesh(GG.box, MAT.yellow).set([30, 0.82, -21], [0, 0, 0], [6.05, 0.06, 4.05]));
      this.eng.pose = 'point';
      R.add(this.eng.root);
      this.characters = [this.eng];
      app.labels.add('<span class="name3d">Lucía · ingeniera naval</span>', () => this.eng.root.worldPos([0, 2.05, 0]), { group: 'arquimedes' });

      // Tanque de pruebas
      this.buildTank(R);

      // Etiquetas
      this.L = {};
      this.L.W = app.labels.add('<span class="tag3d or" id="ar-l-W">Peso</span>', () => this.wTip, { group: 'arquimedes', cls: 'l' });
      this.L.E = app.labels.add('<span class="tag3d mi" id="ar-l-E">Empuje</span>', () => this.eTip, { group: 'arquimedes', cls: 'l' });
      this.L.d = app.labels.add('<span class="tag3d cy" id="ar-l-d">calado</span>', () => this.dMid, { group: 'arquimedes', cls: 'l' });
      this.L.wl = app.labels.add('<span class="tag3d pk sm">línea de flotación</span>', () => [-27, 0.3, -6.2], { group: 'arquimedes', cls: 'r' });
      this.L.cargo = app.labels.add('<span class="tag3d sm" id="ar-l-cargo"></span>', () => this.ship.node.worldPos([9, this.ship.shape.D + 9, 0]), { group: 'arquimedes' });
      this.L.ghost = app.labels.add('<span class="tag3d cy" id="ar-l-ghost"></span>', () => this.ghostTop, { group: 'arquimedes' });
      this.L.rho = app.labels.add('<span class="tag3d mi" id="ar-l-rho"></span>', () => [-40, 1.5, -14], { group: 'arquimedes' });
      this.L.press = app.labels.add('<span class="tag3d pk sm">presión del agua sobre el casco</span>', () => [-18, -this.d - 1.2, -6.8], { group: 'arquimedes', cls: 'l' });
      this.L.tank = [
        app.labels.add('<span class="tag3d or sm" id="ar-lt-W">P</span>', () => this.tW, { group: 'arquimedes', cls: 'r' }),
        app.labels.add('<span class="tag3d mi sm" id="ar-lt-E">E</span>', () => this.tE, { group: 'arquimedes', cls: 'l' }),
        app.labels.add('<span class="tag3d sm">tanque de pruebas</span>', () => [TANK[0], TANK[1] + TH + 0.3, TANK[2]], { group: 'arquimedes' })
      ];

      S3.pointLights = [{ pos: [0, 8, -20], color: HL.color('#ff9ad6'), intensity: 1.2 }];

      // Controles
      this.cCargo = A.bindControl('ar-cargo', v => { this.S.cargo = v; this.onCargo(); });
      this.cRho = A.bindControl('ar-rho', v => { this.S.rho = v; this.onCargo(); });
      this.cG = A.bindControl('ar-g', v => { this.S.g = v; });
      A.$$('[data-cargo]').forEach(b => b.addEventListener('click', () => this.cCargo.set(clamp(this.S.cargo + parseFloat(b.dataset.cargo), 0, 3500))));
      A.byId('ar-press').addEventListener('change', e => { this.S.press = e.target.checked; });
      A.byId('ar-ghost').addEventListener('change', e => { this.S.ghost = e.target.checked; });
      A.byId('ar-waves').addEventListener('click', () => {
        this.S.waves = !this.S.waves;
        A.byId('ar-waves').textContent = this.S.waves ? '⏸ Pausar olas' : '▶ Reanudar olas';
      });
      A.byId('ar-reset').addEventListener('click', () => { this.cCargo.set(0); this.cRho.set(1025); this.cG.set(9.81); A.say('Vaciamos el barco: con solo sus 900 t de acero flota muy alto, con poco calado.'); });
      A.$$('[data-arview]').forEach(b => b.addEventListener('click', () => this.setView(b.dataset.arview)));
      this.cM = A.bindControl('ar-mrho', v => { this.S.mrho = v; this.tankInfo(); });
      this.cT = A.bindControl('ar-trho', v => { this.S.trho = v; this.tankInfo(); });
      this.cV = A.bindControl('ar-vol', v => { this.S.vol = v; this.tankInfo(); });
      A.byId('ar-drop').addEventListener('click', () => this.dropBlock());
      this.time0 = 0;
      this.onCargo(true);
      this.tankInfo();
    },

    buildTank(R) {
      const { MAT, G: GG, Mesh, material: Mt } = HL;
      const t = new HL.Node('tanque').set(TANK);
      t.add(HL.glassTank(TW + 0.06, TH, TD + 0.06, { frame: 0.04 }));
      t.children[0].children[2].visible = false;   // sin base grande
      t.add(new Mesh(GG.box, MAT.panel).set([0, -0.05, 0], [0, 0, 0], [TW + 0.3, 0.1, TD + 0.3]));
      this.tWater = HL.waterBody(TW, TD, { color: '#2e86de', wave: 0.006, waveScale: 12, opacity: 0.4 });
      t.add(this.tWater.node);
      this.block = new HL.Node('bloque');
      this.blockMesh = new Mesh(GG.box, Mt({ color: '#d9a46b', spec: 0.3 }));
      this.blockSub = new Mesh(GG.box, Mt({ color: '#163a7a', opacity: 0.35, depthWrite: false }));
      this.blockSub.castShadow = false;
      this.block.add(this.blockMesh, this.blockSub);
      this.block.userData.pickPad = 0.05;
      t.add(this.block);
      this.tArrW = HL.arrow('#ff9a3d', 0.012);
      this.tArrE = HL.arrow('#3ee6b0', 0.012);
      this.tArrN = HL.arrow('#8b6cff', 0.01);
      t.add(this.tArrW.node, this.tArrE.node, this.tArrN.node);
      R.add(t);
      this.tank = t;
      this.by = 0.75; this.bvy = 0; this.bx = 0;
    },

    setView(v) {
      this.S.view = v;
      A.$$('[data-arview]').forEach(b => b.classList.toggle('on', b.dataset.arview === v));
      A.$$('.ar-port').forEach(e => { e.hidden = v !== 'port'; });
      A.$$('.ar-tank').forEach(e => { e.hidden = v !== 'tank'; });
      if (v === 'tank') {
        A.controls.setView({ target: [TANK[0], TANK[1] + 0.5, TANK[2]], radius: 3.6, theta: 0.15, phi: 1.3, minR: 1.2 });
        this.dropBlock();
        A.say('Este es el <b>tanque de pruebas</b>. Elegí un material y soltá el bloque. Mirá cómo sube el nivel del agua: el bloque <b>desplaza</b> líquido.');
      } else {
        A.controls.setView(this.view);
      }
    },

    resetView(app) { if (this.S.view === 'tank') this.setView('tank'); else app.controls.setView(this.view); },

    /* ---------- Física del barco ---------- */
    calc() {
      const S = this.S;
      const m = (SHIP_MASS + S.cargo) * 1000;          // kg
      const W = m * S.g;
      const Vneed = m / S.rho;                          // m³ que debe desplazar para flotar
      const Emax = S.rho * S.g * this.Vmax;
      const sinks = Vneed > this.Vmax;
      const draft = sinks ? this.ship.shape.D : this.ship.volume.draftFor(Vneed);
      return { m, W, Vneed, Emax, sinks, draft, cargoMax: S.rho * this.Vmax / 1000 - SHIP_MASS };
    },

    onCargo(silent) {
      const c = this.calc();
      const n = Math.min(this.ship.slots.length, Math.floor(this.S.cargo / 25));
      this.ship.slots.forEach((s, i) => { s.visible = i < n; });
      if (silent) { this.d = c.draft; return; }
      if (c.sinks && !this.wasSinking) A.say(`<b>¡Se hunde!</b> El barco con su carga pesa ${fmtMN(c.W)}, pero aunque todo el casco quede bajo el agua, el empuje máximo es ${fmtMN(c.Emax)}. El peso gana. Quitá carga para reflotarlo.`);
      else if (!c.sinks && this.wasSinking) A.say('Quitamos carga y el barco vuelve a flotar: ahora el empuje puede igualar al peso.');
      else if (!c.sinks && this.S.cargo > c.cargoMax * 0.92) A.say(`<b>¡Cuidado!</b> Quedan solo ${fmtFixed(this.ship.shape.D - c.draft, 2)} m de casco fuera del agua. Estás muy cerca de la carga máxima (${fmt(Math.floor(c.cargoMax))} t).`);
      this.wasSinking = c.sinks;
    },

    /* ---------- Tanque de pruebas ---------- */
    blockSide() { return Math.cbrt(this.S.vol / 1000); },
    tankSolve(by) {
      const a = this.blockSide();
      const c = (a * a) / (TW * TD);
      let d = (TW0 - by) / (1 - c);
      d = clamp(d, 0, a);
      return { a, d, f: d / a, lvl: TW0 + c * d };
    },
    dropBlock() { this.by = TH + 0.05; this.bvy = 0; this.bx = 0; },
    tankInfo() {
      const S = this.S, Vm = S.vol / 1000;
      const W = S.mrho * G * Vm, Emax = S.trho * G * Vm, r = S.mrho / S.trho;
      const st = Math.abs(r - 1) < 1e-9 ? ['SUSPENDIDO', 'queda quieto donde lo dejes'] : r < 1 ? ['FLOTA', `con el ${fmtFixed(r * 100, 1)} % sumergido`] : ['SE HUNDE', `peso aparente: ${fmtN(W - Emax)}`];
      txt('ar-t-state', st[0]); txt('ar-t-frac', st[1]);
      const box = A.byId('ar-t-state-box');
      box.classList.toggle('ok', r < 1); box.classList.toggle('bad', r > 1);
      txt('ar-t-W', fmtN(W));
      html('ar-t-explain', `Peso del bloque: ${fmt(S.mrho)} · 9,81 · ${fmt(Vm, 3)} = <b>${fmtN(W)}</b>. Si estuviera todo bajo el líquido, el empuje sería ${fmt(S.trho)} · 9,81 · ${fmt(Vm, 3)} = <b>${fmtN(Emax)}</b>. ${r < 1 ? 'Como el empuje puede superar al peso, <b>flota</b>: se hunde solo hasta que E = P.' : r > 1 ? 'Ni todo sumergido el empuje alcanza al peso: <b>se hunde</b> y el fondo sostiene la diferencia.' : 'Peso y empuje son iguales: queda <b>suspendido</b>.'}`);
      const sw = A.$(`.mats button[data-v="${S.mrho}"]`);
      const colr = { 240: '#e9c9a1', 500: '#d9a46b', 917: '#dff4ff', 1380: '#ff9ac6', 2700: '#d8dbe3', 7870: '#8f8a99' }[S.mrho] || '#c9a0ff';
      this.blockMesh.material.color = HL.color(colr);
      this.blockMesh.material.opacity = S.mrho === 917 ? 0.85 : 1;
      this.tWater.setColor(S.trho > 5000 ? '#c9ced8' : S.trho < 960 ? '#e8b93a' : S.trho > 1200 ? '#c98a3d' : '#2e86de', S.trho > 5000 ? 0.85 : 0.4);
      void sw;
    },

    hitTest(ray) { return this.S.view === 'tank' ? HL.pick(ray, [this.block], 0.05) : null; },
    hover(ray) { return this.hitTest(ray) ? 'grab' : null; },
    pointerDown(ray) {
      if (!this.hitTest(ray)) return false;
      this.dragging = true;
      const p = this.block.worldPos();
      const fwd = HL.v3.norm([A.camera.target[0] - A.camera.position[0], 0, A.camera.target[2] - A.camera.position[2]]);
      this.plane = { p, n: fwd };
      const hit = HL.rayPlane(ray, p, fwd) || p;
      this.grab = HL.v3.sub(hit, p);
      return true;
    },
    pointerMove(ray) {
      const hit = HL.rayPlane(ray, this.plane.p, this.plane.n);
      if (!hit) return;
      const a = this.blockSide();
      const p = HL.v3.sub(hit, this.grab);
      this.bx = clamp(p[0] - TANK[0], -TW / 2 + a / 2 + 0.01, TW / 2 - a / 2 - 0.01);
      this.by = clamp(p[1] - TANK[1] - a / 2, 0, TH + 0.4);
      this.bvy = 0;
    },
    pointerUp() { this.dragging = false; },

    highlight(v, on) {
      const map = { rho: 'ar-l-rho', V: 'ar-l-d', g: 'ar-l-W' };
      const el = A.byId(map[v]); if (el) el.classList.toggle('hl', on);
      if (v === 'V') { const g2 = A.byId('ar-l-ghost'); if (g2) g2.classList.toggle('hl', on); }
    },

    enter(app) { this.setView(this.S.view); if (this.S.view === 'port') app.controls.setView(this.view); },
    exit() {},

    update(dt, t) {
      const S = this.S, c = this.calc();
      if (S.waves) this.time0 += dt;
      const tw = this.time0;
      this.sea.material.wave = S.waves ? WAVE : WAVE;
      this.renderTime = tw;

      // Hundimiento dinámico (resorte amortiguado hacia el calado de equilibrio)
      if (c.sinks) {
        this.sinkY = Math.max(SEABED + c.draft - 0.2, this.sinkY - dt * 1.2);
      } else {
        this.sinkY += (0 - this.sinkY) * Math.min(1, dt * 0.8);
      }
      this.dv += (c.draft - this.d) * 7 * dt;
      this.dv *= Math.pow(0.06, dt);
      this.d += this.dv * dt;
      const heave = waveH(0, 0, tw) * 0.6;
      const keelY = -this.d + heave + this.sinkY;
      const roll = Math.sin(tw * 0.7) * 0.012 + (c.sinks ? Math.min(0.12, -this.sinkY * 0.01) : 0);
      const pitch = Math.sin(tw * 0.5 + 1) * 0.006 + (c.sinks ? Math.min(0.08, -this.sinkY * 0.006) : 0);
      this.ship.node.set([0, keelY, 0], [roll, 0, pitch], [1, 1, 1]);
      this.scene.waterY = heave * 0.4;

      // Amarras
      this.ropes.forEach((m, i) => {
        const b = this.bollards[i * 2];
        const sx = clamp(b[0] * 0.55, -24, 24);
        const a = this.ship.node.worldPos([sx, this.ship.shape.D + 0.5, this.ship.shape.half(sx, this.ship.shape.D)]);
        const d = HL.v3.sub(b, a);
        m.set(HL.v3.lerp(a, b, 0.5), HL.alignY(d), [0.08, HL.v3.len(d), 0.08]);
      });
      this.hook.set([0, 18.6 - 6 - Math.sin(tw * 0.4) * 0.5, -22], [0, 0, 0], [0.06, 12, 0.06]);

      // Flechas de peso y empuje (mismo largo cuando flota)
      const Ecur = S.rho * S.g * this.ship.volume.volumeAt(clamp(this.d, 0, this.ship.shape.D));
      const sc = 16 / Math.max(c.W, c.Emax);
      const cg = this.ship.node.worldPos([0, this.ship.shape.D + 3, 0]);
      const lw = c.W * sc, le = Math.min(Ecur, c.Emax) * sc;
      this.aW.set(cg, [0, -1, 0], lw);
      const cb = this.ship.node.worldPos([0, this.d * 0.45, 0]);
      const eStart = HL.v3.add(cb, [0, -le * 0.35, 0]);
      this.aE.set(eStart, [0, 1, 0], le);
      this.wTip = HL.v3.add(cg, [1.2, -lw * 0.35, 0]);
      this.eTip = HL.v3.add(eStart, [1.2, le * 0.25, 0]);

      // Calado
      const bow = this.ship.node.worldPos([24, 0, -this.ship.shape.half(24, 0) - 0.4]);
      const dl = Math.max(0.01, this.scene.waterY - bow[1]);
      this.draftBar.set([bow[0], bow[1] + dl / 2, bow[2]], [0, 0, 0], [0.18, dl, 0.18]);
      this.draftBar.visible = !c.sinks;
      this.dMid = [bow[0] + 0.6, bow[1] + dl / 2, bow[2]];
      this.L.d.visible = !c.sinks;

      // Presiones sobre el casco (perpendiculares, más largas cuanto más profundo)
      const sh = this.ship.shape;
      this.pArrows.forEach(p => {
        if (!S.press || c.sinks) { p.a.node.visible = false; return; }
        let local, dir;
        if (p.side === 0) { local = [p.x, 0.02, p.z]; dir = [0, 1, 0]; }
        else { const z = this.d * p.f; local = [p.x, z, p.side * sh.half(p.x, z)]; dir = [0, 0, -p.side]; }
        const w = this.ship.node.worldPos(local);
        const depth = this.scene.waterY - w[1];
        if (depth <= 0.05) { p.a.node.visible = false; return; }
        const L = 0.6 + 3.2 * (depth / 6);
        p.a.set(HL.v3.sub(w, HL.v3.scale(dir, L + 0.15)), dir, L);
      });
      this.L.press.visible = S.press && !c.sinks;

      // Cubo de agua desplazada (en escala real)
      const Vd = Ecur / (S.rho * S.g);
      const side = Math.cbrt(Math.max(Vd, 0.001));
      this.ghost.visible = S.ghost;
      this.ghost.set([46, 2.5, 16 + 0], [0, 0, 0], [1, 1, 1]);
      this.ghostBox.set([0, side / 2, 0], [0, 0, 0], [side, side, side]);
      this.ghostTop = [46, 2.5 + side + 1, 16];
      this.L.ghost.visible = S.ghost;

      this.eng.root.position[1] = 0.9 + waveH(30, -21, tw) * 0.8;
      this.pont.position[1] = 0.35 + waveH(30, -21, tw) * 0.8;
      const port = S.view === 'port';
      ['W', 'E', 'wl', 'cargo', 'rho'].forEach(k => { this.L[k].visible = port; });
      if (!port) { this.L.d.visible = false; this.L.press.visible = false; this.L.ghost.visible = false; }
      this.eng.animate(t);
      this.updateTank(dt, t);
      this.refreshHUD(c, Ecur, Vd);
    },

    updateTank(dt, t) {
      const S = this.S;
      const showT = S.view === 'tank';
      this.L.tank.forEach(l => { l.visible = showT; });
      this.tArrW.node.visible = this.tArrE.node.visible = showT;
      const ratio = S.trho / S.mrho, gv = 3.2;
      if (!this.dragging) {
        for (let i = 0; i < 12; i++) {
          const h = dt / 12;
          const s = this.tankSolve(this.by);
          const a = gv * (1 - ratio * s.f) - (1.5 + 6 * s.f) * this.bvy;
          this.bvy += a * h;
          this.by -= this.bvy * h * 1;
          if (this.by < 0) { this.by = 0; if (this.bvy > 0) this.bvy = 0; }
          if (this.by > TH + 0.4) { this.by = TH + 0.4; this.bvy = 0; }
        }
      }
      const s = this.tankSolve(this.by);
      this.tWater.setLevel(s.lvl, 0.02);
      const a = s.a;
      this.block.set([this.bx, this.by + a / 2, 0]);
      this.blockMesh.scale = [a, a, a];
      this.blockSub.visible = s.d > 0.001;
      this.blockSub.set([0, -a / 2 + s.d / 2, 0], [0, 0, 0], [a + 0.004, Math.max(0.001, s.d), a + 0.004]);
      const Vm = S.vol / 1000, W = S.mrho * G * Vm, E = S.trho * G * s.d * a * a;
      const sc = 0.35 / Math.max(W, S.trho * G * Vm);
      const yc = this.by + a / 2;
      this.tArrW.set([this.bx - 0.03, yc, a / 2 + 0.03], [0, -1, 0], W * sc);
      this.tArrE.set([this.bx + 0.03, this.by + s.d / 2, a / 2 + 0.03], [0, 1, 0], E * sc);
      const N = this.by < 0.002 ? Math.max(0, W - E) : 0;
      this.tArrN.node.visible = showT && N > 0.01 * W;
      this.tArrN.set([this.bx + a / 2 + 0.04, 0.0, 0], [0, 1, 0], N * sc);
      this.tW = this.tank.worldPos([this.bx - a / 2 - 0.05, yc, a / 2]);
      this.tE = this.tank.worldPos([this.bx + a / 2 + 0.05, this.by + s.d / 2, a / 2]);
      txt('ar-lt-W', `P = ${fmtN(W)}`);
      txt('ar-lt-E', `E = ${fmtN(E)}`);
      txt('ar-t-E', fmtN(E));
      txt('ar-t-V', `${fmtFixed(s.d * a * a * 1000, 2)} L`);
    },

    refreshHUD(c, Ecur, Vd) {
      const S = this.S, D = this.ship.shape.D;
      const st = c.sinks ? ['SE HUNDE', 'el peso supera al empuje máximo', 'bad'] : (D - c.draft < 0.6 ? ['FLOTA · AL LÍMITE', `queda poco casco afuera`, 'warn'] : ['FLOTA EN EQUILIBRIO', 'empuje = peso', 'ok']);
      txt('ar-o-state', st[0]); txt('ar-o-state2', st[1]);
      const box = A.byId('ar-o-state-box');
      ['ok', 'bad', 'warn'].forEach(k => box.classList.toggle(k, st[2] === k));
      txt('ar-o-m', `${fmt(SHIP_MASS + S.cargo)} t`);
      txt('ar-o-W', fmtMN(c.W));
      txt('ar-o-E', fmtMN(Ecur));
      txt('ar-o-V', `${fmt(Vd, 0)} m³`);
      txt('ar-o-d', c.sinks ? `> ${fmt(D)} m` : `${fmtFixed(this.d, 2)} m`);
      txt('ar-o-f', c.sinks ? '0 m' : `${fmtFixed(D - c.draft, 2)} m`);
      const frac = c.W / c.Emax;
      const bar = A.byId('ar-meter');
      bar.style.width = `${clamp(frac, 0, 1) * 100}%`;
      bar.classList.toggle('over', frac > 1);
      html('ar-meter-txt', `El peso es el <b>${fmt(frac * 100, 1)} %</b> del empuje máximo (${fmtMN(c.Emax)}). Carga máxima en ${RHO_NAME[S.rho] || 'este líquido'}: <b>${fmt(Math.max(0, Math.floor(c.cargoMax)))} t</b>.`);
      html('ar-f-sub', `E = ${fmt(S.rho)} · ${fmt(S.g, 2)} · ${fmt(Vd, 0)} m³ = <b>${fmtMN(Ecur)}</b>`);
      const n = Math.min(this.ship.slots.length, Math.floor(S.cargo / 25)), extra = S.cargo - n * 25;
      txt('ar-l-cargo', `carga: ${fmt(S.cargo)} t · ${n} contenedores${extra > 0.5 ? ` + ${fmt(extra)} t en bodega` : ''}`);
      txt('ar-l-W', `Peso ${fmtMN(c.W)}`);
      txt('ar-l-E', `Empuje ${fmtMN(Ecur)}`);
      txt('ar-l-d', `calado ${fmtFixed(this.d, 2)} m`);
      txt('ar-l-rho', `ρ = ${fmt(S.rho)} kg/m³ · ${RHO_NAME[S.rho] || 'agua'}`);
      txt('ar-l-ghost', `agua desplazada: ${fmt(Vd, 0)} m³ · pesa ${fmtMN(Vd * S.rho * S.g)}`);
    },

    whatif: {
      river() {
        const s = M, d0 = s.calc().draft;
        s.cRho.set(1000);
        const d1 = s.calc().draft;
        return `<b>Se hunde un poco más.</b> El agua dulce es menos densa: para lograr el mismo empuje (igual al peso) el barco necesita desplazar más volumen. El calado pasa de ${fmtFixed(d0, 2)} m a ${fmtFixed(d1, 2)} m. Por eso los barcos tienen marcas de carga distintas para río y mar.`;
      },
      moon() {
        const s = M, d0 = s.calc().draft;
        const toMoon = Math.abs(s.S.g - 1.62) > 1e-6;
        s.cG.set(toMoon ? 1.62 : 9.81);
        const c = s.calc();
        return toMoon
          ? `<b>¡El calado no cambia!</b> En la Luna el barco pesa 6 veces menos (${fmtMN(c.W)}), pero el empuje también baja 6 veces, porque E = ρ·<b>g</b>·V. Peso y empuje cambian igual, así que sigue hundido ${fmtFixed(d0, 2)} m. Tocá de nuevo para volver.`
          : 'De vuelta en la Tierra: peso y empuje vuelven a sus valores, y el calado sigue siendo el mismo.';
      },
      max() {
        const s = M, c = s.calc();
        const mx = Math.floor(c.cargoMax / 5) * 5;
        s.cCargo.set(clamp(mx - 5, 0, 3500));
        return `<b>Carga máxima: unas ${fmt(Math.floor(c.cargoMax))} t.</b> Con el casco entero bajo el agua desplazaría ${fmt(s.Vmax, 0)} m³, y el empuje máximo sería ${fmt(s.S.rho)} · 9,81 · ${fmt(s.Vmax, 0)} = ${fmtMN(c.Emax)}. Restando las 900 t del barco queda esa carga. Sumale un contenedor más y mirá qué pasa.`;
      },
      steel() {
        const s = M;
        s.S.press = true; A.byId('ar-press').checked = true;
        const Vin = s.Vmax;
        return `<b>Porque es hueco.</b> El acero pesa 7850 kg por m³, pero el casco encierra ${fmt(Vin, 0)} m³ casi todos de aire. Su densidad <b>promedio</b> (900 t vacío / ${fmt(Vin, 0)} m³ ≈ ${fmt(900000 / Vin, 0)} kg/m³) es mucho menor que la del agua. Las flechas rosas muestran cómo el agua empuja el fondo hacia arriba.`;
      }
    }
  };
  A.register(M);
})();
