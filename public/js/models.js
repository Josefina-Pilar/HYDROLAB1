/* =========================================================
   HYDROLAB · Modelos 3D procedurales
   Personajes, equipos de laboratorio, tuberías, manómetros,
   vehículos, barco y ambientes. Todo se construye con código.
   ========================================================= */
'use strict';

(function (HL) {
  const { geo, Mesh, Node, material: M, color: C } = HL;

  /* ---------- Paleta de materiales reutilizables ---------- */
  const MAT = {
    steel: M({ color: '#b9c2d3', spec: 0.9, shininess: 90, fresnel: 0.35 }),
    steelDark: M({ color: '#4b5568', spec: 0.7, shininess: 70 }),
    chrome: M({ color: '#e8edf6', spec: 1.2, shininess: 140, fresnel: 0.6 }),
    rubber: M({ color: '#16181f', spec: 0.15, shininess: 10 }),
    concrete: M({ color: '#4a5066', spec: 0.05, shininess: 8 }),
    panel: M({ color: '#1a2347', spec: 0.3, shininess: 30 }),
    panelLight: M({ color: '#26336a', spec: 0.3, shininess: 30 }),
    glass: M({ color: '#bfe6ff', opacity: 0.16, doubleSide: true, spec: 1.2, shininess: 120, fresnel: 0.9, depthWrite: false }),
    glassDark: M({ color: '#0a1530', spec: 1.0, shininess: 120, fresnel: 0.6 }),
    neonCyan: M({ type: 'unlit', color: '#000000', emissive: '#56d8ff', emissiveIntensity: 1.6 }),
    neonViolet: M({ type: 'unlit', color: '#000000', emissive: '#9b7bff', emissiveIntensity: 1.6 }),
    neonPink: M({ type: 'unlit', color: '#000000', emissive: '#ff5fb8', emissiveIntensity: 1.6 }),
    neonWhite: M({ type: 'unlit', color: '#000000', emissive: '#f4f7ff', emissiveIntensity: 1.6 }),
    yellow: M({ color: '#f5c518', spec: 0.4, shininess: 40 }),
    orange: M({ color: '#ff8a3d', spec: 0.4, shininess: 40 }),
    red: M({ color: '#d63a4a', spec: 0.4 }),
    white: M({ color: '#eef1f7', spec: 0.3 }),
    blue: M({ color: '#2f6fe0', spec: 0.5, shininess: 50 })
  };
  HL.MAT = MAT;
  const mesh = (g, m, p, r, s) => new Mesh(g, m).set(p, r, s);

  /* ---------- Formas básicas compartidas (para no repetir geometrías) ---------- */
  const G = {
    sphere: geo.sphere(1, 20, 14),
    sphereLow: geo.sphere(1, 12, 8),
    cyl: geo.cylinder(1, 1, 1, 24),
    cylLow: geo.cylinder(1, 1, 1, 12),
    box: geo.box(1, 1, 1),
    cone: geo.cylinder(0, 1, 1, 20),
    dome: geo.dome(1, 20, 8)
  };
  HL.G = G;

  /* =======================================================
     PERSONAJES
     ======================================================= */
  /**
   * Crea una persona articulada (≈ 1,75 m). Opciones:
   * skin, hair, hairStyle ('short'|'bun'|'none'), top, pants, shoes,
   * hat ('hardhat'|'cap'|'none'), hatColor, coat (bata), vest (chaleco reflectivo),
   * diver (traje de buceo), clipboard, tablet
   */
  function human(o = {}) {
    const mm = hex => M({ color: hex, spec: 0.18, shininess: 18 });
    const skin = mm(o.skin || '#e0ac8a');
    const top = mm(o.top || '#2f4f9e');
    const pants = mm(o.pants || '#253049');
    const shoes = M({ color: o.shoes || '#20232c', spec: 0.4, shininess: 40 });
    const hair = mm(o.hair || '#3b2a20');
    const root = new Node('persona');
    const J = {};

    // Cadera
    J.hips = new Node('cadera').set([0, 0.93, 0]);
    root.add(J.hips);
    J.hips.add(mesh(G.sphere, pants, [0, 0.0, 0], [0, 0, 0], [0.17, 0.11, 0.12]));

    // Piernas
    ['L', 'R'].forEach((s, i) => {
      const x = i === 0 ? 0.095 : -0.095;
      const hip = new Node('cad' + s).set([x, -0.02, 0]);
      hip.add(mesh(geo.capsule(0.078, 0.48), pants, [0, -0.21, 0]));
      const knee = new Node('rod' + s).set([0, -0.44, 0]);
      knee.add(mesh(geo.capsule(0.062, 0.46), o.diver ? pants : pants, [0, -0.2, 0]));
      const foot = new Node('pie' + s).set([0, -0.43, 0]);
      if (o.diver) {
        foot.add(mesh(G.box, M({ color: o.fin || '#1c8ad6', spec: 0.5 }), [0, -0.02, 0.18], [0.12, 0, 0], [0.16, 0.025, 0.46]));
      } else {
        foot.add(mesh(geo.capsule(0.055, 0.25), shoes, [0, -0.02, 0.05], [Math.PI / 2, 0, 0], [1.05, 1, 0.75]));
      }
      knee.add(foot);
      hip.add(knee);
      J.hips.add(hip);
      J['hip' + s] = hip; J['knee' + s] = knee;
    });

    // Torso
    J.torso = new Node('torso').set([0, 0.04, 0]);
    J.hips.add(J.torso);
    const torsoG = geo.lathe([[0.0, -0.02], [0.15, 0.0], [0.165, 0.12], [0.185, 0.32], [0.18, 0.43], [0.14, 0.52], [0.06, 0.56], [0.0, 0.565]], 22);
    J.torso.add(mesh(torsoG, top, [0, 0, 0], [0, 0, 0], [1, 1, 0.64]));
    if (o.coat) {
      const coatG = geo.lathe([[0.2, -0.5], [0.19, -0.2], [0.18, 0.0], [0.19, 0.2], [0.195, 0.33], [0.19, 0.43], [0.15, 0.525]], 22);
      J.torso.add(mesh(coatG, mm('#f2f4f8'), [0, 0, 0], [0, 0, 0], [1, 1, 0.7]));
      J.torso.add(mesh(G.box, mm(o.top || '#6d4bd8'), [0, 0.38, 0.12], [0.2, 0, 0], [0.11, 0.18, 0.02]));
    }
    if (o.vest) {
      const vestG = geo.lathe([[0.19, 0.04], [0.195, 0.3], [0.19, 0.44]], 22);
      J.torso.add(mesh(vestG, M({ color: o.vest, spec: 0.3 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.68]));
      const band = geo.lathe([[0.198, 0], [0.198, 0.035]], 22);
      [0.12, 0.26].forEach(y => J.torso.add(mesh(band, M({ color: '#d9dde6', emissive: '#6f7480', spec: 1 }), [0, y, 0], [0, 0, 0], [1, 1, 0.69])));
    }
    if (o.diver) {
      const tank = mesh(geo.capsule(0.095, 0.6), M({ color: '#f2c230', spec: 0.8, shininess: 70 }), [0, 0.28, -0.17]);
      J.torso.add(tank);
      J.torso.add(mesh(G.cylLow, MAT.steelDark, [0, 0.62, -0.17], [0, 0, 0], [0.03, 0.06, 0.03]));
      J.torso.add(mesh(geo.torus(0.12, 0.012, 16, 6), MAT.rubber, [0.05, 0.55, -0.02], [0.3, 0, 1.2]));
      J.torso.add(mesh(G.box, M({ color: '#1c8ad6', spec: 0.4 }), [0, 0.3, 0.115], [0, 0, 0], [0.26, 0.04, 0.02]));
    }

    // Cuello y cabeza
    J.torso.add(mesh(G.cylLow, skin, [0, 0.6, 0], [0, 0, 0], [0.048, 0.1, 0.048]));
    J.head = new Node('cabeza').set([0, 0.66, 0]);
    J.torso.add(J.head);
    J.head.add(mesh(G.sphere, skin, [0, 0.1, 0], [0, 0, 0], [0.098, 0.118, 0.105]));
    J.head.add(mesh(G.sphereLow, skin, [0, 0.085, 0.1], [0, 0, 0], [0.018, 0.024, 0.02]));
    const eyeM = M({ color: '#1b1d2a', spec: 1.2, shininess: 120 });
    [-1, 1].forEach(sx => {
      J.head.add(mesh(G.sphereLow, M({ color: '#ffffff', spec: 0.6 }), [0.034 * sx, 0.115, 0.088], [0, 0, 0], [0.017, 0.012, 0.01]));
      J.head.add(mesh(G.sphereLow, eyeM, [0.034 * sx, 0.115, 0.096], [0, 0, 0], [0.008, 0.008, 0.005]));
      J.head.add(mesh(G.box, hair, [0.036 * sx, 0.142, 0.094], [0, 0, -0.12 * sx], [0.03, 0.006, 0.006]));
    });
    J.head.add(mesh(G.box, M({ color: '#9a5a5a', spec: 0.2 }), [0, 0.048, 0.097], [0, 0, 0], [0.032, 0.006, 0.006]));
    if (o.diver) {
      J.head.add(mesh(G.sphere, M({ color: '#151820', spec: 0.6 }), [0, 0.11, -0.005], [0, 0, 0], [0.104, 0.125, 0.11]));
      J.head.add(mesh(G.box, M({ color: '#2a3247', spec: 0.5 }), [0, 0.12, 0.09], [0, 0, 0], [0.17, 0.08, 0.05]));
      J.head.add(mesh(G.box, M({ color: '#8fe6ff', opacity: 0.55, spec: 2, shininess: 160, fresnel: 0.9 }), [0, 0.12, 0.117], [0, 0, 0], [0.15, 0.06, 0.008]));
      J.head.add(mesh(G.cylLow, MAT.steelDark, [0, 0.03, 0.11], [Math.PI / 2, 0, 0], [0.025, 0.05, 0.025]));
    } else {
      if (o.hairStyle !== 'none') {
        J.head.add(mesh(G.sphere, hair, [0, 0.13, -0.012], [0, 0, 0], [0.104, 0.105, 0.108]));
        if (o.hairStyle === 'bun') J.head.add(mesh(G.sphere, hair, [0, 0.2, -0.09], [0, 0, 0], [0.055, 0.055, 0.055]));
        if (o.hairStyle === 'long') J.head.add(mesh(G.box, hair, [0, 0.02, -0.07], [0.15, 0, 0], [0.19, 0.24, 0.07]));
      }
      if (o.hat === 'hardhat') {
        const hm = M({ color: o.hatColor || '#f5f7fb', spec: 0.9, shininess: 90 });
        J.head.add(mesh(G.dome, hm, [0, 0.135, -0.005], [0, 0, 0], [0.122, 0.12, 0.13]));
        J.head.add(mesh(G.cyl, hm, [0, 0.14, 0.01], [0, 0, 0], [0.145, 0.012, 0.155]));
        J.head.add(mesh(G.box, hm, [0, 0.215, 0], [0, 0, 0], [0.025, 0.035, 0.24]));
      } else if (o.hat === 'cap') {
        const cm = M({ color: o.hatColor || '#2b3a6b', spec: 0.2 });
        J.head.add(mesh(G.dome, cm, [0, 0.14, -0.01], [0, 0, 0], [0.11, 0.09, 0.115]));
        J.head.add(mesh(G.cyl, cm, [0, 0.145, 0.1], [0, 0, 0], [0.07, 0.01, 0.07]));
      }
    }

    // Brazos
    ['L', 'R'].forEach((s, i) => {
      const sx = i === 0 ? 1 : -1;
      const sh = new Node('hombro' + s).set([0.205 * sx, 0.47, 0], [0, 0, 0.1 * sx]);
      sh.add(mesh(G.sphere, o.coat ? mm('#f2f4f8') : top, [0, -0.01, 0], [0, 0, 0], [0.068, 0.068, 0.068]));
      sh.add(mesh(geo.capsule(0.056, 0.32), o.coat ? mm('#f2f4f8') : top, [0, -0.14, 0]));
      const el = new Node('codo' + s).set([0, -0.29, 0]);
      el.add(mesh(geo.capsule(0.048, 0.29), o.coat || o.diver ? (o.coat ? mm('#f2f4f8') : top) : (o.sleeves === 'short' ? skin : top), [0, -0.12, 0]));
      const hand = new Node('mano' + s).set([0, -0.27, 0]);
      hand.add(mesh(G.sphere, o.gloves ? M({ color: o.gloves, spec: 0.2 }) : skin, [0, -0.03, 0.005], [0, 0, 0], [0.045, 0.06, 0.03]));
      el.add(hand);
      sh.add(el);
      J.torso.add(sh);
      J['sh' + s] = sh; J['el' + s] = el; J['hand' + s] = hand;
    });

    if (o.clipboard) {
      const cb = new Node('portapapeles').set([0.02, -0.06, 0.06], [-1.2, 0.2, 0]);
      cb.add(mesh(G.box, M({ color: '#7a5a3a', spec: 0.2 }), [0, 0, 0], [0, 0, 0], [0.2, 0.012, 0.26]));
      cb.add(mesh(G.box, M({ color: '#f7f7f2', spec: 0.1 }), [0, 0.008, 0.01], [0, 0, 0], [0.17, 0.004, 0.21]));
      J.handL.add(cb);
    }
    if (o.tablet) {
      const tb = new Node('tablet').set([0.0, -0.06, 0.07], [-1.15, 0.15, 0]);
      tb.add(mesh(G.box, M({ color: '#1a1d26', spec: 0.8 }), [0, 0, 0], [0, 0, 0], [0.18, 0.012, 0.25]));
      tb.add(mesh(G.box, M({ type: 'unlit', color: '#000', emissive: '#6fd6ff', emissiveIntensity: 0.9 }), [0, 0.008, 0], [0, 0, 0], [0.16, 0.003, 0.22]));
      J.handL.add(tb);
    }

    const person = { root, J, pose: o.pose || 'idle', phase: Math.random() * 10, opts: o };
    person.animate = (t, extra) => animateHuman(person, t, extra);
    return person;
  }

  /** Poses animadas: idle · wave · talk · point · lever · swim · clipboard */
  function animateHuman(p, t, extra = {}) {
    const J = p.J, tt = t + p.phase, pose = extra.pose || p.pose;
    const br = Math.sin(tt * 1.6) * 0.015;
    const reset = () => {
      J.torso.rotation = [br, 0, 0];
      J.head.rotation = [Math.sin(tt * 0.5) * 0.04, Math.sin(tt * 0.35) * 0.18, 0];
      J.shL.rotation = [Math.sin(tt * 1.2) * 0.03, 0, 0.12]; J.elL.rotation = [-0.15, 0, 0];
      J.shR.rotation = [-Math.sin(tt * 1.2) * 0.03, 0, -0.12]; J.elR.rotation = [-0.15, 0, 0];
      J.hipL.rotation = [0, 0, 0.02]; J.kneeL.rotation = [0, 0, 0];
      J.hipR.rotation = [0, 0, -0.02]; J.kneeR.rotation = [0, 0, 0];
      J.hips.position[1] = 0.93;
    };
    reset();
    if (pose === 'wave') {
      J.shR.rotation = [-0.2, 0, -2.5 + Math.sin(tt * 2) * 0.08];
      J.elR.rotation = [0, 0, -0.5 + Math.sin(tt * 6) * 0.45];
      J.head.rotation[1] = -0.15;
    } else if (pose === 'talk' || pose === 'clipboard') {
      const g = Math.sin(tt * 2.2);
      J.shR.rotation = [-0.45 - g * 0.15, 0, -0.25];
      J.elR.rotation = [-0.9 + g * 0.25, 0, 0];
      if (pose === 'clipboard' || p.opts.clipboard || p.opts.tablet) { J.shL.rotation = [-0.35, 0, 0.15]; J.elL.rotation = [-1.35, 0.3, 0]; }
      else { J.shL.rotation = [-0.3 + g * 0.1, 0, 0.2]; J.elL.rotation = [-0.8 - g * 0.2, 0, 0]; }
      J.head.rotation[0] = Math.sin(tt * 3.1) * 0.05;
    } else if (pose === 'point') {
      J.shR.rotation = [-1.35, 0, -0.35 + Math.sin(tt * 1.5) * 0.04];
      J.elR.rotation = [-0.1, 0, 0];
      J.head.rotation[1] = -0.35;
      if (p.opts.clipboard || p.opts.tablet) { J.shL.rotation = [-0.35, 0, 0.15]; J.elL.rotation = [-1.35, 0.3, 0]; }
    } else if (pose === 'lever') {
      const a = extra.lever ?? 0;                  // 0 arriba · 1 abajo
      J.torso.rotation = [0.25 + a * 0.35, 0, 0];
      J.shR.rotation = [-1.5 + a * 0.75, 0, -0.1]; J.elR.rotation = [-0.35, 0, 0];
      J.shL.rotation = [-1.5 + a * 0.75, 0, 0.1]; J.elL.rotation = [-0.35, 0, 0];
      J.hipL.rotation = [-0.25 - a * 0.15, 0, 0.02]; J.kneeL.rotation = [0.3 + a * 0.2, 0, 0];
      J.hipR.rotation = [0.15, 0, -0.02]; J.kneeR.rotation = [0.1, 0, 0];
      J.hips.position[1] = 0.9 - a * 0.05;
      J.head.rotation = [-0.2, 0, 0];
    } else if (pose === 'swim') {
      const k = Math.sin(tt * (extra.kick || 4));
      J.torso.rotation = [0.12, 0, 0];
      J.hipL.rotation = [k * 0.32, 0, 0.04]; J.kneeL.rotation = [0.25 + Math.max(0, -k) * 0.2, 0, 0];
      J.hipR.rotation = [-k * 0.32, 0, -0.04]; J.kneeR.rotation = [0.25 + Math.max(0, k) * 0.2, 0, 0];
      J.shL.rotation = [0.2, 0, 0.35]; J.elL.rotation = [-0.5, 0, 0];
      J.shR.rotation = [0.2, 0, -0.35]; J.elR.rotation = [-0.5, 0, 0];
      J.head.rotation = [-0.25, Math.sin(tt * 0.6) * 0.3, 0];
    }
  }
  HL.human = human;

  /** Personajes del proyecto */
  HL.characters = {
    ingeniera: () => human({ skin: '#e8b996', hair: '#2a1a14', hairStyle: 'bun', top: '#6d4bd8', pants: '#2b3150', coat: true, tablet: true, hat: 'none' }),
    ingeniero: () => human({ skin: '#c98e6c', hair: '#1e1a18', hairStyle: 'short', top: '#2f6fe0', pants: '#2a3352', vest: '#ff8a1f', hat: 'hardhat', hatColor: '#f5f7fb', clipboard: true }),
    mecanico: () => human({ skin: '#b67b5b', hair: '#2e231c', hairStyle: 'short', top: '#2c4ea8', pants: '#2c4ea8', hat: 'cap', hatColor: '#d63a4a', gloves: '#3a3f4c', sleeves: 'long' }),
    naval: () => human({ skin: '#f0c3a0', hair: '#5a3a24', hairStyle: 'long', top: '#1d2b55', pants: '#1a2140', vest: '#ff8a1f', hat: 'hardhat', hatColor: '#f5c518', clipboard: true }),
    buzo: () => human({ skin: '#d7a17f', top: '#2a3142', pants: '#2a3142', diver: true, fin: '#ff5fb8', gloves: '#2a3142', pose: 'swim' })
  };

  /* =======================================================
     EQUIPOS E INFRAESTRUCTURA
     ======================================================= */
  /** Cilindro (u otro objeto alineado en Y) ubicado entre dos puntos */
  function between(g, mat, a, b, r) {
    const d = HL.v3.sub(b, a), l = HL.v3.len(d);
    const m = new Mesh(g, mat);
    m.set(HL.v3.lerp(a, b, 0.5), HL.alignY(d), [r, l, r]);
    return m;
  }
  HL.between = between;

  /** Tubería a lo largo de una polilínea (fusionada en una sola malla) */
  function pipe(points, r, mat, opts = {}) {
    const parts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], d = HL.v3.sub(b, a), l = HL.v3.len(d);
      parts.push({ g: G.cyl, p: HL.v3.lerp(a, b, 0.5), r: HL.alignY(d), s: [r, l, r] });
      if (opts.flanges !== false) {
        parts.push({ g: G.cyl, p: HL.v3.lerp(a, b, 0.04), r: HL.alignY(d), s: [r * 1.35, Math.min(0.06, l * 0.1), r * 1.35] });
        parts.push({ g: G.cyl, p: HL.v3.lerp(a, b, 0.96), r: HL.alignY(d), s: [r * 1.35, Math.min(0.06, l * 0.1), r * 1.35] });
      }
    }
    for (let i = 1; i < points.length - 1; i++) parts.push({ g: G.sphere, p: points[i], s: [r * 1.12, r * 1.12, r * 1.12] });
    return new Mesh(geo.merge(parts), mat);
  }
  HL.pipe = pipe;

  /** Válvula de volante */
  function valve(r = 0.25, col = '#d63a4a') {
    const n = new Node('valvula');
    const m = M({ color: col, spec: 0.6, shininess: 60 });
    const parts = [{ g: geo.torus(r, r * 0.09, 28, 8), r: [Math.PI / 2, 0, 0] }];
    for (let i = 0; i < 4; i++) parts.push({ g: G.cylLow, r: [0, 0, (i * Math.PI) / 2], p: [0, 0, 0], s: [r * 0.05, r * 2, r * 0.05] });
    parts.push({ g: G.cylLow, r: [Math.PI / 2, 0, 0], s: [r * 0.18, r * 0.3, r * 0.18] });
    const wheel = new Mesh(geo.merge(parts), m);
    n.add(wheel);
    n.add(mesh(G.cyl, MAT.steel, [0, 0, -r * 0.6], [Math.PI / 2, 0, 0], [r * 0.12, r * 1.2, r * 0.12]));
    n.userData.wheel = wheel;
    return n;
  }
  HL.valve = valve;

  /** Bomba centrífuga con motor */
  function pump(col = '#2f6fe0') {
    const n = new Node('bomba');
    const m = M({ color: col, spec: 0.6, shininess: 60 });
    n.add(mesh(G.box, MAT.steelDark, [0, 0.06, 0], [0, 0, 0], [1.3, 0.12, 0.6]));
    n.add(mesh(G.cyl, m, [-0.25, 0.4, 0], [0, 0, Math.PI / 2], [0.24, 0.6, 0.24]));
    const fins = [];
    for (let i = 0; i < 8; i++) fins.push({ g: G.box, p: [0, Math.cos((i * Math.PI) / 4) * 0.24, Math.sin((i * Math.PI) / 4) * 0.24], r: [(i * Math.PI) / 4, 0, 0], s: [0.5, 0.02, 0.04] });
    n.add(new Mesh(geo.merge(fins), m).set([-0.25, 0.4, 0]));
    n.add(mesh(G.cyl, MAT.steel, [0.3, 0.4, 0], [0, 0, Math.PI / 2], [0.3, 0.22, 0.3]));
    n.add(mesh(G.cyl, MAT.steel, [0.3, 0.75, 0], [0, 0, 0], [0.09, 0.45, 0.09]));
    return n;
  }
  HL.pump = pump;

  /** Manómetro de aguja: devuelve { node, set(fracción 0..1) } */
  function gauge(r = 0.25, accent = '#56d8ff') {
    const n = new Node('manometro');
    n.add(mesh(G.cyl, MAT.steel, [0, 0, -0.03], [Math.PI / 2, 0, 0], [r * 1.08, 0.06, r * 1.08]));
    n.add(mesh(G.cyl, M({ color: '#f4f6fb', spec: 0.3 }), [0, 0, 0.002], [Math.PI / 2, 0, 0], [r, 0.02, r]));
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
      const a = -2.2 + (4.4 * i) / 10;
      ticks.push({ g: G.box, p: [Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.82, 0.016], r: [0, 0, -a], s: [r * 0.03, r * (i % 5 ? 0.1 : 0.18), 0.005] });
    }
    n.add(new Mesh(geo.merge(ticks), M({ color: '#1b2140', spec: 0.1 })));
    const arc = new Mesh(geo.torus(r * 0.68, r * 0.03, 32, 6), M({ type: 'unlit', color: '#000', emissive: accent, emissiveIntensity: 1 }));
    arc.set([0, 0, 0.014], [Math.PI / 2, 0, 0]);
    n.add(arc);
    const needle = new Node('aguja').set([0, 0, 0.03]);
    needle.add(mesh(G.box, M({ color: '#ff3d6e', spec: 0.6, emissive: '#5a0a1e' }), [0, r * 0.38, 0], [0, 0, 0], [r * 0.05, r * 0.8, 0.01]));
    needle.add(mesh(G.cyl, MAT.steelDark, [0, 0, 0], [Math.PI / 2, 0, 0], [r * 0.08, 0.02, r * 0.08]));
    n.add(needle);
    n.add(mesh(G.cyl, MAT.glass, [0, 0, 0.04], [Math.PI / 2, 0, 0], [r, 0.01, r]));
    return { node: n, set: f => { needle.rotation = [0, 0, 2.2 - 4.4 * Math.max(0, Math.min(1, f))]; } };
  }
  HL.gauge = gauge;

  /** Flecha 3D: devuelve { node, set(origen, dirección, largo) } */
  function arrow(col, thick = 0.06) {
    const n = new Node('flecha');
    const m = M({ color: col, emissive: col, emissiveIntensity: 0.45, spec: 0.6 });
    const shaft = mesh(G.cylLow, m);
    const head = mesh(G.cone, m);
    n.add(shaft, head);
    n.userData.mat = m;
    const api = {
      node: n,
      set(from, dir, len) {
        if (len < 1e-3) { n.visible = false; return; }
        n.visible = true;
        const d = HL.v3.norm(dir), hl = Math.min(len * 0.45, thick * 4.5);
        const rot = HL.alignY(d);
        const sl = Math.max(0.0001, len - hl);
        shaft.set(HL.v3.add(from, HL.v3.scale(d, sl / 2)), rot, [thick, sl, thick]);
        head.set(HL.v3.add(from, HL.v3.scale(d, sl + hl / 2)), rot, [thick * 2.4, hl, thick * 2.4]);
      }
    };
    return api;
  }
  HL.arrow = arrow;

  /** Tanque de vidrio con marco metálico (sin agua) */
  function glassTank(w, h, d, opts = {}) {
    const n = new Node('tanque');
    const t = opts.frame || 0.12;
    const parts = [];
    const xs = [-w / 2, w / 2], zs = [-d / 2, d / 2];
    xs.forEach(x => zs.forEach(z => parts.push({ g: G.box, p: [x, h / 2, z], s: [t, h + t, t] })));
    [0, h].forEach(y => {
      xs.forEach(x => parts.push({ g: G.box, p: [x, y, 0], s: [t, t, d] }));
      zs.forEach(z => parts.push({ g: G.box, p: [0, y, z], s: [w, t, t] }));
    });
    n.add(new Mesh(geo.merge(parts), opts.frameMat || MAT.steelDark));
    const glass = mesh(G.box, MAT.glass, [0, h / 2, 0], [0, 0, 0], [w - t * 0.5, h, d - t * 0.5]);
    glass.castShadow = false;
    glass.userData.sortBias = -0.5;
    n.add(glass);
    n.add(mesh(G.box, MAT.panel, [0, -0.25, 0], [0, 0, 0], [w + 0.6, 0.5, d + 0.6]));
    const strip = mesh(G.box, opts.neon || MAT.neonCyan, [0, -0.02, d / 2 + 0.31], [0, 0, 0], [w + 0.5, 0.04, 0.02]);
    n.add(strip);
    return n;
  }
  HL.glassTank = glassTank;

  /** Agua dentro de un tanque: volumen + superficie con olas */
  function waterBody(w, d, opts = {}) {
    const n = new Node('agua');
    const col = opts.color || '#2e86de';
    const body = new Mesh(G.box, M({ color: col, opacity: opts.opacity ?? 0.42, depthWrite: false, spec: 0.8, shininess: 90, fresnel: 0.4 }));
    body.castShadow = false;
    const surf = new Mesh(geo.plane(w, d, Math.max(8, Math.round(w * 4)), Math.max(8, Math.round(d * 4))), M({ type: 'water', color: opts.surface || col, opacity: 0.55, wave: opts.wave ?? 0.03, waveScale: opts.waveScale ?? 3, spec: 1.6, shininess: 150, doubleSide: true, depthWrite: false }));
    surf.castShadow = false;
    surf.userData.sortBias = -1;
    n.add(body, surf);
    const api = {
      node: n, body, surf,
      setLevel(level, bottom = 0) {
        const hgt = Math.max(0.001, level - bottom);
        body.set([0, bottom + hgt / 2, 0], [0, 0, 0], [w, hgt, d]);
        surf.set([0, level, 0]);
      },
      setColor(hex, op) {
        const c = HL.color(hex);
        body.material.color = c; surf.material.color = c;
        if (op !== undefined) body.material.opacity = op;
      }
    };
    return api;
  }
  HL.waterBody = waterBody;

  /** Consola industrial con pantalla */
  function console3d(w = 1.6, col = '#56d8ff') {
    const n = new Node('consola');
    n.add(mesh(G.box, MAT.panelLight, [0, 0.45, 0], [0, 0, 0], [w, 0.9, 0.7]));
    n.add(mesh(G.box, MAT.panel, [0, 0.95, -0.05], [-0.45, 0, 0], [w, 0.08, 0.75]));
    n.add(mesh(G.box, MAT.panel, [0, 1.35, -0.32], [-0.2, 0, 0], [w * 0.9, 0.62, 0.06]));
    n.add(mesh(G.box, M({ type: 'unlit', color: '#000', emissive: '#0d2a5c', emissiveIntensity: 1 }), [0, 1.36, -0.285], [-0.2, 0, 0], [w * 0.84, 0.54, 0.01]));
    const leds = [];
    for (let i = 0; i < 6; i++) leds.push({ g: G.cylLow, p: [-w / 2 + 0.2 + i * (w - 0.4) / 5, 0.99, 0.12], r: [-0.45, 0, 0], s: [0.035, 0.03, 0.035] });
    n.add(new Mesh(geo.merge(leds), M({ type: 'unlit', color: '#000', emissive: col, emissiveIntensity: 1.4 })));
    return n;
  }
  HL.console3d = console3d;

  /** Rack de servidores con luces */
  function rack() {
    const n = new Node('rack');
    n.add(mesh(G.box, M({ color: '#141a33', spec: 0.5 }), [0, 1.1, 0], [0, 0, 0], [0.8, 2.2, 0.8]));
    const l1 = [], l2 = [];
    for (let i = 0; i < 9; i++) {
      (i % 3 ? l1 : l2).push({ g: G.box, p: [-0.2 + (i % 4) * 0.12, 0.3 + i * 0.2, 0.41], s: [0.06, 0.025, 0.01] });
      l1.push({ g: G.box, p: [0, 0.32 + i * 0.2, 0.405], s: [0.68, 0.01, 0.005] });
    }
    n.add(new Mesh(geo.merge(l1), MAT.neonCyan), new Mesh(geo.merge(l2), MAT.neonViolet));
    return n;
  }
  HL.rack = rack;

  /** Sala de laboratorio: piso, paredes, columnas y luces */
  function labRoom(w, d, h, opts = {}) {
    const n = new Node('sala');
    const floor = mesh(geo.plane(w, d), M({ type: 'grid', color: opts.floor || '#0f1530', gridColor: opts.grid || '#25356e', spec: 0.5, shininess: 60 }));
    floor.castShadow = false;
    n.add(floor);
    const wall = M({ color: opts.wall || '#121a3a', spec: 0.25, shininess: 20 });
    const panels = [];
    for (let x = -w / 2 + 2; x < w / 2; x += 4) panels.push({ g: G.box, p: [x, h / 2, -d / 2 + 0.05], s: [3.8, h - 0.4, 0.1] });
    for (let z = -d / 2 + 2; z < d / 2 - 2; z += 4) {
      panels.push({ g: G.box, p: [-w / 2 + 0.05, h / 2, z], s: [0.1, h - 0.4, 3.8] });
      panels.push({ g: G.box, p: [w / 2 - 0.05, h / 2, z], s: [0.1, h - 0.4, 3.8] });
    }
    const wm = new Mesh(geo.merge(panels), wall); wm.castShadow = false; n.add(wm);
    const pillars = [];
    for (let x = -w / 2; x <= w / 2; x += 8) pillars.push({ g: G.box, p: [x, h / 2, -d / 2 + 0.3], s: [0.5, h, 0.5] });
    n.add(new Mesh(geo.merge(pillars), MAT.panelLight));
    const strips = [];
    for (let x = -w / 2 + 4; x < w / 2; x += 8) strips.push({ g: G.box, p: [x, h * 0.55, -d / 2 + 0.12], s: [0.08, h * 0.7, 0.02] });
    strips.push({ g: G.box, p: [0, 0.1, -d / 2 + 0.12], s: [w, 0.05, 0.02] });
    n.add(new Mesh(geo.merge(strips), opts.neon || MAT.neonViolet));
    const ceiling = [];
    for (let z = -d / 2 + 3; z < d / 2; z += 5) ceiling.push({ g: G.box, p: [0, h, z], s: [w * 0.7, 0.06, 0.25] });
    const cm = new Mesh(geo.merge(ceiling), MAT.neonWhite); cm.castShadow = false; n.add(cm);
    return n;
  }
  HL.labRoom = labRoom;

  /* =======================================================
     VEHÍCULOS
     ======================================================= */
  function car(col = '#d63a4a', size = 1) {
    const n = new Node('auto');
    const body = M({ color: col, spec: 1.1, shininess: 110, fresnel: 0.5 });
    const L = 4.3, W = 1.8;
    const profile = [[-2.15, 0.32], [2.15, 0.32], [2.17, 0.55], [2.05, 0.82], [1.1, 0.92], [0.55, 1.38], [-0.9, 1.42], [-1.65, 0.98], [-2.12, 0.92], [-2.2, 0.6]];
    n.add(new Mesh(geo.extrude(profile, W), body));
    const win = [[0.55, 1.3], [-0.85, 1.34], [-1.5, 0.98], [1.0, 0.95]];
    n.add(new Mesh(geo.extrude(win, W + 0.02), MAT.glassDark).set([0, 0.0, 0]));
    n.add(mesh(G.box, body, [-0.2, 1.17, 0], [0, 0, 0], [0.08, 0.36, W + 0.04]));
    const wheelG = geo.merge([{ g: G.cyl, r: [Math.PI / 2, 0, 0], s: [0.36, 0.26, 0.36] }]);
    const rimG = geo.merge([{ g: G.cyl, r: [Math.PI / 2, 0, 0], s: [0.22, 0.27, 0.22] }]);
    [[1.35, 0.92], [1.35, -0.92], [-1.35, 0.92], [-1.35, -0.92]].forEach(([x, z]) => {
      n.add(new Mesh(wheelG, MAT.rubber).set([x, 0.36, z]));
      n.add(new Mesh(rimG, MAT.chrome).set([x, 0.36, z]));
    });
    n.add(mesh(G.box, MAT.neonWhite, [2.16, 0.68, 0.6], [0, 0, 0], [0.04, 0.1, 0.3]));
    n.add(mesh(G.box, MAT.neonWhite, [2.16, 0.68, -0.6], [0, 0, 0], [0.04, 0.1, 0.3]));
    n.add(mesh(G.box, MAT.neonPink, [-2.21, 0.72, 0.6], [0, 0, 0], [0.03, 0.08, 0.3]));
    n.add(mesh(G.box, MAT.neonPink, [-2.21, 0.72, -0.6], [0, 0, 0], [0.03, 0.08, 0.3]));
    n.add(mesh(G.box, MAT.chrome, [2.18, 0.42, 0], [0, 0, 0], [0.06, 0.08, 1.6]));
    n.scale = [size, size, size];
    return n;
  }
  HL.car = car;

  function crate(col = '#c98a3d') {
    const n = new Node('caja');
    const m = M({ color: col, spec: 0.15 });
    n.add(mesh(G.box, m, [0, 0.4, 0], [0, 0, 0], [0.8, 0.8, 0.8]));
    const s = [];
    [-0.36, 0.36].forEach(x => [-0.36, 0.36].forEach(z => s.push({ g: G.box, p: [x, 0.4, z], s: [0.1, 0.82, 0.1] })));
    n.add(new Mesh(geo.merge(s), M({ color: '#8a5a24', spec: 0.1 })));
    return n;
  }
  HL.crate = crate;

  /** Contenedor marítimo de 20 pies */
  const containerG = (() => {
    const L = 6.06, H = 2.59, W = 2.44, parts = [{ g: G.box, p: [0, H / 2, 0], s: [L, H, W] }];
    for (let i = 0; i < 14; i++) {
      const x = -L / 2 + 0.25 + i * ((L - 0.5) / 13);
      parts.push({ g: G.box, p: [x, H / 2, W / 2 + 0.02], s: [0.08, H * 0.9, 0.04] });
      parts.push({ g: G.box, p: [x, H / 2, -W / 2 - 0.02], s: [0.08, H * 0.9, 0.04] });
    }
    return geo.merge(parts);
  })();
  function container(col) { return new Mesh(containerG, M({ color: col, spec: 0.35, shininess: 30 })); }
  HL.container = container;

  /* =======================================================
     BARCO DE CARGA (casco con forma real e integrable)
     ======================================================= */
  function hullShape(L, B, D) {
    const rb = 1.4, Lb = 13, Ls = 6;
    const hbZ = z => (z >= rb ? B / 2 : (B / 2 - rb) + rb * Math.sqrt(Math.max(0, 1 - Math.pow(1 - z / rb, 2))));
    const fx = (x, z) => {
      if (x > L / 2 - Lb) { const t = (x - (L / 2 - Lb)) / Lb; return Math.max(0.015, 1 - Math.pow(t, 1.7) * (1 + 0.25 * (1 - z / D))); }
      if (x < -L / 2 + Ls) { const t = ((-L / 2 + Ls) - x) / Ls; return 1 - 0.3 * t * t * (1 - 0.5 * z / D); }
      return 1;
    };
    const half = (x, z) => Math.max(0.01, hbZ(z) * fx(x, z));
    return { L, B, D, half };
  }

  /** Volumen sumergido V(calado) por integración numérica */
  function hullVolumeTable(sh, step = 0.01) {
    const nx = 240, nz = 24, dx = sh.L / nx;
    const table = [0];
    let acc = 0;
    for (let z0 = 0; z0 < sh.D - 1e-9; z0 += step) {
      let slab = 0;
      for (let k = 0; k < nz; k++) {
        const z = z0 + ((k + 0.5) / nz) * step;
        let area = 0;
        for (let i = 0; i < nx; i++) area += 2 * sh.half(-sh.L / 2 + (i + 0.5) * dx, z) * dx;
        slab += area * (step / nz);
      }
      acc += slab;
      table.push(acc);
    }
    return { step, table, volumeAt(d) { const f = Math.max(0, Math.min(this.table.length - 1, d / step)); const i = Math.floor(f), t = f - i; return i >= this.table.length - 1 ? this.table[this.table.length - 1] : this.table[i] * (1 - t) + this.table[i + 1] * t; },
      draftFor(V) { const T = this.table; if (V <= 0) return 0; if (V >= T[T.length - 1]) return Infinity; let lo = 0, hi = T.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] < V) lo = m; else hi = m; } return (lo + (V - T[lo]) / (T[hi] - T[lo])) * step; } };
  }

  function ship(opts = {}) {
    const L = opts.L || 60, B = opts.B || 12, D = opts.D || 6;
    const sh = hullShape(L, B, D);
    const n = new Node('barco');
    const NX = 60, NZ = 14;
    const buildSide = (z0, z1, mat) => {
      const pos = [], idx = [];
      const rows = NZ;
      for (const side of [1, -1]) {
        const o = pos.length / 3;
        for (let j = 0; j <= rows; j++) {
          const z = z0 + ((z1 - z0) * j) / rows;
          for (let i = 0; i <= NX; i++) {
            const x = -L / 2 + (L * i) / NX;
            pos.push(x, z, side * sh.half(x, z));
          }
        }
        for (let j = 0; j < rows; j++) for (let i = 0; i < NX; i++) {
          const a = o + j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
          if (side > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
        }
      }
      return new Mesh(geo.fromArrays(pos, idx), mat);
    };
    const lowM = M({ color: '#b3283a', spec: 0.5, shininess: 40, submerge: true });
    const highM = M({ color: '#1d2f6b', spec: 0.6, shininess: 50, submerge: true });
    n.add(buildSide(0, 3.4, lowM), buildSide(3.4, D, highM));
    // Fondo y cubierta
    const cap = (z, up, mat) => {
      const pos = [], idx = [];
      for (let i = 0; i <= NX; i++) { const x = -L / 2 + (L * i) / NX; pos.push(x, z, sh.half(x, z), x, z, -sh.half(x, z)); }
      for (let i = 0; i < NX; i++) { const a = i * 2; if (up) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      return new Mesh(geo.fromArrays(pos, idx), mat);
    };
    n.add(cap(0, false, lowM), cap(D, true, M({ color: '#5d6a7e', spec: 0.3, submerge: true })));
    // Espejo de popa
    const tp = [], ti = [];
    for (let j = 0; j <= NZ; j++) { const z = (D * j) / NZ, h = sh.half(-L / 2, z); tp.push(-L / 2, z, h, -L / 2, z, -h); }
    for (let j = 0; j < NZ; j++) { const a = j * 2; ti.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    n.add(new Mesh(geo.fromArrays(tp, ti), highM));
    // Borda
    const rail = [];
    for (let i = 0; i < NX; i++) {
      const x0 = -L / 2 + (L * i) / NX, x1 = -L / 2 + (L * (i + 1)) / NX;
      [1, -1].forEach(s => rail.push({ g: G.box, p: [(x0 + x1) / 2, D + 0.35, s * sh.half((x0 + x1) / 2, D)], s: [x1 - x0 + 0.02, 0.7, 0.12] }));
    }
    n.add(new Mesh(geo.merge(rail), M({ color: '#e9edf5', spec: 0.4, submerge: true })));
    // Superestructura (puente de mando)
    const sup = new Node('puente').set([-L / 2 + 7, D, 0]);
    const supM = M({ color: '#f1f4fa', spec: 0.5, submerge: true });
    sup.add(mesh(G.box, supM, [0, 3, 0], [0, 0, 0], [7, 6, B - 1.6]));
    sup.add(mesh(G.box, supM, [0.4, 7, 0], [0, 0, 0], [5.2, 2.2, B + 0.4]));
    sup.add(mesh(G.box, M({ type: 'unlit', color: '#000', emissive: '#7fd8ff', emissiveIntensity: 0.9 }), [3.02, 7.1, 0], [0, 0, 0], [0.05, 0.9, B - 0.2]));
    const wins = [];
    for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) wins.push({ g: G.box, p: [3.52, 1.4 + k * 1.6, -B / 2 + 2 + i * ((B - 4) / 4)], s: [0.04, 0.6, 0.9] });
    sup.add(new Mesh(geo.merge(wins), MAT.glassDark));
    sup.add(mesh(G.cyl, M({ color: '#d63a4a', spec: 0.5, submerge: true }), [-2, 9.2, 0], [0, 0, 0], [1.2, 3.2, 1.2]));
    sup.add(mesh(G.cyl, M({ color: '#141824', spec: 0.5 }), [-2, 10.9, 0], [0, 0, 0], [1.25, 0.4, 1.25]));
    sup.add(mesh(G.cylLow, MAT.steel, [0.6, 9.8, 0], [0, 0, 0], [0.08, 3.4, 0.08]));
    n.add(sup);
    // Grúas de cubierta
    [-2, 14].forEach(x => {
      n.add(mesh(G.cyl, MAT.yellow, [x, D + 2.5, 0], [0, 0, 0], [0.35, 5, 0.35]));
      n.add(between(G.cylLow, MAT.yellow, [x, D + 4.6, 0], [x + 9, D + 7.5, 0], 0.18));
    });
    // Contenedores sobre cubierta (posiciones fijas; se muestran según la carga)
    const slots = [];
    const cols = ['#d63a4a', '#2f6fe0', '#f5c518', '#23a679', '#ff8a3d', '#8a58c9', '#e9edf5', '#1d8fb5'];
    const xsC = [-0.5, 6, 12.5, 19];
    const zsC = [-3.7, -1.25, 1.25, 3.7];
    let k = 0;
    for (let tier = 0; tier < 3; tier++) for (const x of xsC) for (const z of zsC) {
      const c = container(cols[(k * 5 + tier * 3) % cols.length]);
      c.material.submerge = true;
      c.set([x, D + 0.05 + tier * 2.6, z], [0, 0, 0], [1, 1, 1]);
      c.visible = false;
      n.add(c); slots.push(c); k++;
    }
    n.userData.slots = slots;
    n.userData.shape = sh;
    return { node: n, shape: sh, slots, volume: hullVolumeTable(sh) };
  }
  HL.ship = ship;

  /* =======================================================
     DECORADO
     ======================================================= */
  function plant() {
    const n = new Node('planta');
    n.add(mesh(G.cyl, M({ color: '#e9edf5', spec: 0.3 }), [0, 0.25, 0], [0, 0, 0], [0.25, 0.5, 0.25]));
    const leaves = [];
    for (let i = 0; i < 9; i++) leaves.push({ g: G.sphereLow, p: [Math.cos(i) * 0.15, 0.7 + (i % 3) * 0.15, Math.sin(i * 1.7) * 0.15], s: [0.18, 0.12, 0.18] });
    n.add(new Mesh(geo.merge(leaves), M({ color: '#2e9e6a', spec: 0.2 })));
    return n;
  }
  HL.plant = plant;

  function shelf(w = 2.2) {
    const n = new Node('estante');
    const parts = [];
    [-w / 2, w / 2].forEach(x => parts.push({ g: G.box, p: [x, 1, 0], s: [0.06, 2, 0.5] }));
    [0.3, 0.9, 1.5, 1.95].forEach(y => parts.push({ g: G.box, p: [0, y, 0], s: [w, 0.04, 0.5] }));
    n.add(new Mesh(geo.merge(parts), MAT.steelDark));
    const cols = ['#d63a4a', '#f5c518', '#2f6fe0', '#23a679', '#ff8a3d'];
    let i = 0;
    [0.32, 0.92, 1.52].forEach(y => {
      for (let x = -w / 2 + 0.25; x < w / 2 - 0.2; x += 0.45) {
        const s = 0.22 + ((i * 37) % 10) / 50;
        n.add(mesh(G.box, M({ color: cols[i % cols.length], spec: 0.3 }), [x, y + s / 2, 0], [0, (i % 3) * 0.2, 0], [0.32, s, 0.34]));
        i++;
      }
    });
    return n;
  }
  HL.shelf = shelf;

  function tires(n = 4) {
    const g = new Node('neumaticos');
    const tg = geo.torus(0.3, 0.13, 24, 10);
    for (let i = 0; i < n; i++) g.add(new Mesh(tg, MAT.rubber).set([0, 0.13 + i * 0.26, 0]));
    return g;
  }
  HL.tires = tires;

  function toolBoard(w = 3) {
    const n = new Node('herramientas');
    n.add(mesh(G.box, M({ color: '#2a356a', spec: 0.2 }), [0, 1.6, 0], [0, 0, 0], [w, 1.4, 0.05]));
    const tools = [];
    for (let i = 0; i < 9; i++) {
      const x = -w / 2 + 0.3 + i * ((w - 0.6) / 8);
      tools.push({ g: G.box, p: [x, 1.65 + (i % 2) * 0.1, 0.05], r: [0, 0, (i % 3 - 1) * 0.3], s: [0.06, 0.5 + (i % 3) * 0.12, 0.03] });
    }
    n.add(new Mesh(geo.merge(tools), MAT.chrome));
    return n;
  }
  HL.toolBoard = toolBoard;

  /** Pedestal holográfico para elegir módulos en el vestíbulo */
  function station(col) {
    const n = new Node('estacion');
    const neon = M({ type: 'unlit', color: '#000', emissive: col, emissiveIntensity: 1.5 });
    n.add(mesh(G.cyl, MAT.panelLight, [0, 0.15, 0], [0, 0, 0], [1.1, 0.3, 1.1]));
    n.add(mesh(G.cyl, MAT.panel, [0, 0.45, 0], [0, 0, 0], [0.8, 0.3, 0.8]));
    n.add(mesh(geo.torus(1.1, 0.025, 48, 6), neon, [0, 0.3, 0]));
    const ring = mesh(geo.torus(0.75, 0.02, 48, 6), neon, [0, 1.3, 0]);
    n.add(ring);
    const beam = mesh(G.cyl, M({ type: 'unlit', color: '#000', emissive: col, emissiveIntensity: 0.35, opacity: 0.25, depthWrite: false, doubleSide: true }), [0, 1.5, 0], [0, 0, 0], [0.7, 2, 0.7]);
    beam.castShadow = false;
    n.add(beam);
    const holo = new Node('holograma').set([0, 1.65, 0]);
    n.add(holo);
    n.userData = { ring, holo, neon, beam };
    return n;
  }
  HL.station = station;

})(window.HL);
