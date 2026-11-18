/* =========================================================
   HYDROLAB 3D · Vestíbulo del laboratorio
   Tanques, tuberías, maquinaria, la ingeniera guía y las
   estaciones holográficas que llevan a cada módulo.
   ========================================================= */
'use strict';

/** Escena base reutilizable por todos los módulos */
HL.makeScene = (o = {}) => ({
  root: new HL.Node('escena'),
  background: { top: HL.color(o.top || '#141d48'), bottom: HL.color(o.bottom || '#04060f'), glow: o.glow || [0.04, 0.03, 0.1], glowPos: o.glowPos || [0.5, 0.85] },
  fog: { color: HL.color(o.fog || '#070b1a'), near: o.fogNear ?? 30, far: o.fogFar ?? 90 },
  hemi: { sky: HL.color(o.sky || '#9fb3ff'), ground: HL.color(o.ground || '#1a1430'), intensity: o.hemi ?? 0.6 },
  sun: { dir: o.sunDir || [-0.45, -1, -0.35], color: HL.color(o.sunColor || '#fff4e6'), intensity: o.sun ?? 1.5 },
  shadow: { center: o.shadowCenter || [0, 0, 0], extent: o.shadowExtent || 20 },
  pointLights: [],
  exposure: o.exposure || 1.05,
  waterY: o.waterY ?? -1e6,
  waterTint: HL.color(o.waterTint || '#1d6fb5')
});

HYDROLAB.register({
  id: 'lobby',
  title: 'Laboratorio principal',
  character: { name: 'Ing. Valentina Ruiz', role: 'Directora del laboratorio', avatar: '👩‍🔬' },
  view: { target: [0, 2.2, 2], radius: 22, theta: 0, phi: 1.2, minR: 8, maxR: 45, maxPhi: 1.45 },
  intro: () => (HYDROLAB.started ? HYDROLAB.modules.lobby.introAfterStart : '¡Hola! Soy <b>Valentina</b>, la directora de HYDROLAB. Acá investigamos cómo se comportan los líquidos quietos. Tocá <b>INICIAR EXPERIENCIA</b> y te muestro las estaciones.'),
  introAfterStart: 'Estas son las <b>cuatro estaciones</b> del laboratorio y el <b>desafío final</b>. Hacé clic en una plataforma o elegila abajo. Te recomiendo seguir el orden: 1, 2, 3 y 4.',
  tips: [
    'Podés <b>girar la cámara</b> arrastrando sobre un lugar vacío y <b>acercarte</b> con la rueda del mouse.',
    'En cada estación hay un personaje que te va a guiar. Hacé <b>clic sobre él</b> para escuchar otro consejo.',
    'El botón <b>📖 Teoría</b> de arriba abre la explicación de cada tema, con las fórmulas y ejemplos.',
    'Todos los valores que vas a ver salen de las fórmulas: P = ρ·g·h, P₂ − P₁ = ρ·g·(h₁ − h₂), F₁/A₁ = F₂/A₂ y E = ρ·g·V.'
  ],

  build(app) {
    const S = this.scene = HL.makeScene({ fogNear: 35, fogFar: 85, shadowExtent: 22, shadowCenter: [0, 0, -2] });
    const R = S.root;
    const { MAT, G, geo, Mesh, material: M } = HL;
    R.add(HL.labRoom(64, 44, 13, { neon: MAT.neonViolet }));

    // Tanque cilíndrico central (columna de agua)
    const col = new HL.Node('columna').set([0, 0, -12]);
    col.add(new Mesh(geo.cylinder(2.6, 2.6, 0.6, 40), MAT.panelLight).set([0, 0.3, 0]));
    const glass = new Mesh(geo.cylinder(2.2, 2.2, 8, 40, false), M({ color: '#bfe6ff', opacity: 0.14, doubleSide: true, spec: 1.4, shininess: 140, fresnel: 1, depthWrite: false }));
    glass.set([0, 4.6, 0]); glass.castShadow = false; col.add(glass);
    const water = new Mesh(geo.cylinder(2.15, 2.15, 6.6, 40), M({ color: '#2f7fe0', opacity: 0.45, depthWrite: false, spec: 1, shininess: 100 }));
    water.set([0, 3.9, 0]); water.castShadow = false; col.add(water);
    const top = new Mesh(geo.cylinder(2.15, 2.15, 0.02, 40), M({ type: 'water', color: '#5cc2ff', opacity: 0.6, wave: 0.03, waveScale: 4, depthWrite: false }));
    top.set([0, 7.2, 0]); col.add(top);
    [0.6, 8.6].forEach(y => col.add(new Mesh(geo.torus(2.25, 0.09, 48, 10), MAT.steel).set([0, y, 0])));
    col.add(new Mesh(geo.torus(2.4, 0.03, 48, 6), MAT.neonCyan).set([0, 0.62, 0]));
    R.add(col);
    this.bubbles = new HL.Points(60, { color: '#d9f4ff', opacity: 0.8 });
    this.bubbleState = Array.from({ length: 60 }, () => ({ x: (Math.random() - 0.5) * 3.2, y: 0.8 + Math.random() * 6, z: (Math.random() - 0.5) * 3.2, v: 0.6 + Math.random() * 0.9, s: 0.05 + Math.random() * 0.08 }));
    this.bubbles.set([0, 0, -12]);
    R.add(this.bubbles);

    // Tanques rectangulares laterales
    [[-13, '#2f6fe0'], [13, '#7a5cff']].forEach(([x, c]) => {
      const t = HL.glassTank(5, 5, 3.4);
      t.set([x, 0.5, -13]);
      R.add(t);
      const w = HL.waterBody(4.85, 3.25, { color: c, wave: 0.035, waveScale: 3 });
      w.setLevel(3.9, 0.06);
      w.node.set([x, 0.5, -13]);
      R.add(w.node);
      const g = HL.gauge(0.42, '#56d8ff');
      g.node.set([x + 1.6, 3.2, -11.25]);
      g.set(0.55);
      R.add(g.node);
    });

    // Tuberías, válvulas y bombas
    R.add(HL.pipe([[-10.4, 1.2, -13], [-6, 1.2, -13], [-6, 1.2, -12], [-2.4, 1.2, -12]], 0.2, MAT.steel));
    R.add(HL.pipe([[2.4, 1.2, -12], [6, 1.2, -12], [6, 1.2, -13], [10.4, 1.2, -13]], 0.2, MAT.steel));
    R.add(HL.pipe([[-13, 5.6, -13], [-13, 10, -13], [13, 10, -13], [13, 5.6, -13]], 0.16, MAT.steelDark));
    R.add(HL.pipe([[0, 8.6, -12], [0, 10, -12], [0, 10, -13]], 0.16, MAT.steelDark, { flanges: false }));
    this.valves = [];
    [[-6, 1.2, -12.5, 0], [6, 1.2, -12.5, 0], [-6, 10, -13, 1], [6, 10, -13, 1]].forEach(([x, y, z, up]) => {
      const v = HL.valve(0.32, up ? '#ff5fb8' : '#d63a4a');
      v.set([x, y + (up ? -0.5 : 0.55), z + (up ? 0.5 : 0)], up ? [0, 0, 0] : [Math.PI / 2, 0, 0]);
      R.add(v); this.valves.push(v);
    });
    const p1 = HL.pump('#3d7bff'); p1.set([-8, 0, -9], [0, 0.3, 0]); R.add(p1);
    const p2 = HL.pump('#8b6cff'); p2.set([8, 0, -9], [0, -0.3, 0]); R.add(p2);
    [-24, -21.8, 21.8, 24].forEach((x, i) => { const r = HL.rack(); r.set([x, 0, -18 + (i % 2) * 2.2], [0, x < 0 ? 0.3 : -0.3, 0]); R.add(r); });
    const c1 = HL.console3d(2.2); c1.set([-17, 0, -5], [0, 0.6, 0]); R.add(c1);
    const c2 = HL.console3d(2.2, '#ff5fb8'); c2.set([17, 0, -5], [0, -0.6, 0]); R.add(c2);
    [[-27, 6], [27, 6], [-27, -8], [27, -8]].forEach(([x, z]) => { const p = HL.plant(); p.set([x, 0, z]); R.add(p); });

    // Estaciones de los módulos
    const defs = [
      { id: 'presion', name: 'Presión estática', sub: 'Módulo 1', col: '#56d8ff', pos: [-10, 0, 3] },
      { id: 'teorema', name: 'Teorema general', sub: 'Módulo 2', col: '#8b6cff', pos: [-5, 0, 6] },
      { id: 'prensa', name: 'Prensa hidráulica', sub: 'Módulo 3', col: '#ff9a3d', pos: [0, 0, 7.2] },
      { id: 'arquimedes', name: 'Principio de Arquímedes', sub: 'Módulo 4', col: '#3ee6b0', pos: [5, 0, 6] },
      { id: 'desafio', name: 'Desafío final', sub: 'Misiones', col: '#ff5fb8', pos: [10, 0, 3] }
    ];
    this.stations = defs.map(d => {
      const st = HL.station(d.col);
      st.set(d.pos);
      st.userData.id = d.id;
      st.userData.pickPad = 0.2;
      const holo = st.userData.holo;
      const hm = M({ color: d.col, emissive: d.col, emissiveIntensity: 0.55, spec: 1, opacity: 0.92 });
      if (d.id === 'presion') {
        const b = HL.characters.buzo(); b.root.set([0, -0.45, 0], [0, 0, 0], 0.55); holo.add(b.root); this.miniDiver = b;
      } else if (d.id === 'teorema') {
        holo.add(new Mesh(G.cyl, MAT.steel).set([0, 0.2, 0], [0, 0, 0], [0.03, 1.1, 0.03]));
        holo.add(new Mesh(G.sphere, M({ color: '#8b6cff', emissive: '#4a2fc0' })).set([-0.25, 0.5, 0], [0, 0, 0], 0.13));
        holo.add(new Mesh(G.sphere, M({ color: '#ff5fb8', emissive: '#a02a6a' })).set([0.25, -0.1, 0], [0, 0, 0], 0.13));
        holo.add(new Mesh(G.box, hm).set([0, 0.2, 0], [0, 0, 0], [0.8, 0.9, 0.5]));
        holo.children[3].material = M({ color: d.col, opacity: 0.25, depthWrite: false, emissive: d.col, emissiveIntensity: 0.3 });
      } else if (d.id === 'prensa') {
        const c = HL.car('#ff9a3d', 0.2); c.set([0, -0.15, 0]); holo.add(c);
        holo.add(new Mesh(G.box, MAT.steel).set([0, -0.2, 0], [0, 0, 0], [0.95, 0.05, 0.45]));
      } else if (d.id === 'arquimedes') {
        const sh = HL.ship(); sh.slots.slice(0, 10).forEach(c => { c.visible = true; });
        sh.node.set([0, -0.25, 0], [0, 0, 0], 0.022); holo.add(sh.node);
      } else {
        const star = [];
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.18 : 0.42; star.push([Math.cos(a) * r, Math.sin(a) * r]); }
        holo.add(new Mesh(geo.extrude(star, 0.12), hm).set([0, 0.1, 0]));
      }
      R.add(st);
      st.userData.label = app.labels.add(`<div class="station3d">${d.name}<small>${d.sub} · clic para entrar</small></div>`, () => st.worldPos([0, 3.1, 0]), { group: 'lobby' });
      return st;
    });

    // Ingeniera que da la bienvenida
    this.eng = HL.characters.ingeniera();
    this.eng.root.set([3.2, 0, 10.2], [0, -0.35, 0]);
    this.eng.pose = 'wave';
    R.add(this.eng.root);
    this.characters = [this.eng];
    app.labels.add('<span class="name3d">Valentina · Directora</span>', () => this.eng.root.worldPos([0, 2.05, 0]), { group: 'lobby' });

    S.pointLights = [
      { pos: [0, 5, -9], color: HL.color('#56d8ff'), intensity: 6 },
      { pos: [-13, 4, -10], color: HL.color('#3d7bff'), intensity: 4 },
      { pos: [13, 4, -10], color: HL.color('#8b6cff'), intensity: 4 },
      { pos: [0, 3, 8], color: HL.color('#ff5fb8'), intensity: 2.5 }
    ];
  },

  start(app) {
    this.eng.pose = 'talk';
    app.controls.setView({ target: [0, 1.8, 3], radius: 21, theta: 0, phi: 1.12 });
  },

  enter(app) {
    if (!app.started) {
      app.controls.setView({ target: [-2, 2.6, 2], radius: 19, theta: -0.35, phi: 1.28 }, true);
      app.controls.autoRotate = 0.03;
      this.eng.pose = 'wave';
    } else {
      app.controls.setView({ target: [0, 1.8, 3], radius: 21, theta: 0, phi: 1.12 });
      this.eng.pose = 'talk';
    }
  },

  resetView(app) { this.enter(app); },

  hitTest(ray) { return HL.pick(ray, this.stations, 0.2); },
  hover(ray) {
    const h = this.hitTest(ray);
    this.stations.forEach(s => { s.userData.hover = h && h.node === s; });
    return h ? 'pointer' : null;
  },
  pointerDown(ray) {
    const h = this.hitTest(ray);
    if (!h) return false;
    if (!HYDROLAB.started) HYDROLAB.startExperience();
    HYDROLAB.go(h.node.userData.id);
    return true;
  },

  update(dt, t) {
    this.eng.animate(t);
    this.stations.forEach(s => { s.userData.label.visible = HYDROLAB.started; });
    if (this.miniDiver) this.miniDiver.animate(t);
    this.stations.forEach((s, i) => {
      const u = s.userData;
      u.holo.rotation[1] = t * 0.6 + i;
      u.holo.position[1] = 1.65 + Math.sin(t * 1.4 + i) * 0.08;
      const k = u.hover ? 1.15 : 1;
      u.holo.scale = [k, k, k];
      u.ring.rotation[1] = -t;
      u.neon.emissiveIntensity = u.hover ? 2.6 : 1.5;
    });
    this.valves.forEach((v, i) => { v.userData.wheel.rotation[2] = Math.sin(t * 0.4 + i) * 0.3; });
    const b = this.bubbles;
    this.bubbleState.forEach((p, i) => {
      p.y += p.v * dt;
      if (p.y > 7.1) { p.y = 0.8; p.x = (Math.random() - 0.5) * 3.2; p.z = (Math.random() - 0.5) * 3.2; }
      b.data.set([p.x + Math.sin(t * 2 + i) * 0.05, p.y, p.z, p.s], i * 4);
    });
    b.dirty = true;
  }
});
