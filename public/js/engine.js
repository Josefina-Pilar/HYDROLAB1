/* =========================================================
   HYDROLAB · HydroGL
   Motor 3D liviano sobre WebGL 2, escrito para este proyecto.
   Incluye: matemática 3D, geometrías procedurales, materiales con
   iluminación, sombras, agua animada, cámara orbital, selección de
   objetos con el mouse y etiquetas HTML ancladas a la escena.
   Funciona sin internet y sin dependencias externas.
   ========================================================= */
'use strict';

window.HL = window.HL || {};

(function (HL) {

  /* ---------------------------------------------------------
     1. MATEMÁTICA
     --------------------------------------------------------- */
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: a => Math.hypot(a[0], a[1], a[2]),
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
    dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  };

  const m4 = {
    identity() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
    multiply(a, b, out = new Float32Array(16)) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      for (let i = 0; i < 4; i++) {
        const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
        out[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        out[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        out[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        out[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      }
      return out;
    },
    perspective(fovy, aspect, near, far) {
      const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far), m = new Float32Array(16);
      m[0] = f / aspect; m[5] = f; m[10] = (far + near) * nf; m[11] = -1; m[14] = 2 * far * near * nf;
      return m;
    },
    ortho(l, r, b, t, n, f) {
      const m = new Float32Array(16);
      m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
      m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); m[15] = 1;
      return m;
    },
    lookAt(eye, target, up) {
      let z = v3.norm(v3.sub(eye, target));
      let x = v3.cross(up, z);
      if (v3.len(x) < 1e-6) x = v3.cross([0, 0, 1], z);
      x = v3.norm(x);
      const y = v3.cross(z, x), m = new Float32Array(16);
      m[0] = x[0]; m[1] = y[0]; m[2] = z[0];
      m[4] = x[1]; m[5] = y[1]; m[6] = z[1];
      m[8] = x[2]; m[9] = y[2]; m[10] = z[2];
      m[12] = -v3.dot(x, eye); m[13] = -v3.dot(y, eye); m[14] = -v3.dot(z, eye); m[15] = 1;
      return m;
    },
    invert(a, out = new Float32Array(16)) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return null;
      det = 1 / det;
      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    },
    /** Traslación · Rotación (orden Y·X·Z) · Escala */
    compose(p, r, s, out = new Float32Array(16)) {
      const cx = Math.cos(r[0]), sx = Math.sin(r[0]), cy = Math.cos(r[1]), sy = Math.sin(r[1]), cz = Math.cos(r[2]), sz = Math.sin(r[2]);
      const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
      const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
      const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
      out[0] = r00 * s[0]; out[1] = r10 * s[0]; out[2] = r20 * s[0]; out[3] = 0;
      out[4] = r01 * s[1]; out[5] = r11 * s[1]; out[6] = r21 * s[1]; out[7] = 0;
      out[8] = r02 * s[2]; out[9] = r12 * s[2]; out[10] = r22 * s[2]; out[11] = 0;
      out[12] = p[0]; out[13] = p[1]; out[14] = p[2]; out[15] = 1;
      return out;
    },
    transformPoint(m, p) {
      const x = p[0], y = p[1], z = p[2];
      const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
      return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w];
    },
    transformDir(m, d) {
      return [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];
    },
    normalMatrix(m, out = new Float32Array(9)) {
      const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
      const C00 = e * i - f * h, C01 = -(d * i - f * g), C02 = d * h - e * g;
      const C10 = -(b * i - c * h), C11 = a * i - c * g, C12 = -(a * h - b * g);
      const C20 = b * f - c * e, C21 = -(a * f - c * d), C22 = a * e - b * d;
      let det = a * C00 + b * C01 + c * C02;
      det = det ? 1 / det : 0;
      out[0] = C00 * det; out[1] = C10 * det; out[2] = C20 * det;
      out[3] = C01 * det; out[4] = C11 * det; out[5] = C21 * det;
      out[6] = C02 * det; out[7] = C12 * det; out[8] = C22 * det;
      return out;
    }
  };

  /** Rotación (Y·X) que alinea el eje +Y con la dirección d */
  function alignY(d) {
    const n = v3.norm(d);
    const rx = Math.acos(Math.max(-1, Math.min(1, n[1])));
    const ry = Math.atan2(n[0], n[2]);
    return [rx, ry, 0];
  }

  /** Color: '#rrggbb' → [r,g,b] lineal */
  function color(hex) {
    if (Array.isArray(hex)) return hex;
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.pow(v / 255, 2.2));
    return c;
  }

  HL.v3 = v3; HL.m4 = m4; HL.alignY = alignY; HL.color = color;

  /* ---------------------------------------------------------
     2. GEOMETRÍAS
     --------------------------------------------------------- */
  class Geometry {
    constructor(pos, nor, idx) {
      this.pos = pos instanceof Float32Array ? pos : new Float32Array(pos);
      this.nor = nor instanceof Float32Array ? nor : new Float32Array(nor);
      this.idx = idx instanceof Uint32Array ? idx : new Uint32Array(idx);
      this.vao = null;
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < this.pos.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          const v = this.pos[i + k];
          if (v < mn[k]) mn[k] = v;
          if (v > mx[k]) mx[k] = v;
        }
      }
      this.bbox = { min: mn, max: mx };
    }
  }

  function computeNormals(pos, idx) {
    const nor = new Float32Array(pos.length);
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]];
      const e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
      const n = v3.cross(e1, e2);
      for (const v of [a, b, c]) { nor[v] += n[0]; nor[v + 1] += n[1]; nor[v + 2] += n[2]; }
    }
    for (let i = 0; i < nor.length; i += 3) {
      const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]) || 1;
      nor[i] /= l; nor[i + 1] /= l; nor[i + 2] /= l;
    }
    return nor;
  }

  const geo = {
    fromArrays(pos, idx, nor) { return new Geometry(pos, nor || computeNormals(pos, idx), idx); },

    box(w, h, d) {
      const x = w / 2, y = h / 2, z = d / 2;
      const faces = [
        [[1, 0, 0], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]],
        [[-1, 0, 0], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]],
        [[0, 1, 0], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]],
        [[0, -1, 0], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]],
        [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]],
        [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]]
      ];
      const pos = [], nor = [], idx = [];
      faces.forEach(([n, vs], f) => {
        vs.forEach(v => { pos.push(...v); nor.push(...n); });
        const o = f * 4;
        idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
      });
      return new Geometry(pos, nor, idx);
    },

    /** Plano horizontal (XZ) subdividido, normal +Y */
    plane(w, d, sx = 1, sz = 1) {
      const pos = [], nor = [], idx = [];
      for (let j = 0; j <= sz; j++) {
        for (let i = 0; i <= sx; i++) {
          pos.push(-w / 2 + (w * i) / sx, 0, -d / 2 + (d * j) / sz);
          nor.push(0, 1, 0);
        }
      }
      for (let j = 0; j < sz; j++) {
        for (let i = 0; i < sx; i++) {
          const a = j * (sx + 1) + i, b = a + 1, c = a + sx + 1, e = c + 1;
          idx.push(a, c, b, b, c, e);
        }
      }
      return new Geometry(pos, nor, idx);
    },

    /** Superficie de revolución alrededor de Y. profile: [[r, y], ...] de abajo hacia arriba */
    lathe(profile, seg = 24, a0 = 0, a1 = Math.PI * 2) {
      const n = profile.length;
      const segN = [];
      for (let i = 0; i < n - 1; i++) {
        const dr = profile[i + 1][0] - profile[i][0], dy = profile[i + 1][1] - profile[i][1];
        const l = Math.hypot(dr, dy);
        segN.push(l < 1e-9 ? null : [dy / l, -dr / l]);
      }
      const vn = profile.map((_, i) => {
        const p = i > 0 ? segN[i - 1] : null, q = i < n - 1 ? segN[i] : null;
        if (p && q) { const s = [p[0] + q[0], p[1] + q[1]]; const l = Math.hypot(s[0], s[1]) || 1; return [s[0] / l, s[1] / l]; }
        return p || q || [1, 0];
      });
      const pos = [], nor = [], idx = [];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= seg; j++) {
          const t = a0 + ((a1 - a0) * j) / seg, c = Math.cos(t), s = Math.sin(t);
          pos.push(profile[i][0] * c, profile[i][1], profile[i][0] * s);
          nor.push(vn[i][0] * c, vn[i][1], vn[i][0] * s);
        }
      }
      for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < seg; j++) {
          const a = i * (seg + 1) + j, b = a + seg + 1, c = a + 1, d = b + 1;
          idx.push(a, b, c, c, b, d);
        }
      }
      return new Geometry(pos, nor, idx);
    },

    cylinder(rTop, rBot, h, seg = 24, capped = true) {
      const y0 = -h / 2, y1 = h / 2;
      const prof = capped
        ? [[0, y0], [rBot, y0], [rBot, y0], [rTop, y1], [rTop, y1], [0, y1]]
        : [[rBot, y0], [rTop, y1]];
      return geo.lathe(prof, seg);
    },

    sphere(r, ws = 24, hs = 16) {
      const prof = [];
      for (let i = 0; i <= hs; i++) {
        const p = (i / hs) * Math.PI;
        prof.push([r * Math.sin(p), -r * Math.cos(p)]);
      }
      return geo.lathe(prof, ws);
    },

    /** Media esfera (cúpula) apoyada en y=0 */
    dome(r, ws = 24, hs = 10) {
      const prof = [[0, 0], [r, 0]];
      for (let i = 0; i <= hs; i++) {
        const p = (i / hs) * Math.PI / 2;
        prof.push([r * Math.cos(p), r * Math.sin(p)]);
      }
      prof[1] = [r, 0];
      return geo.lathe([[0, 0], [r, 0], ...prof.slice(2)], ws);
    },

    /** Cápsula vertical: largo total = len (incluye las semiesferas) */
    capsule(r, len, seg = 16, hs = 6) {
      const half = Math.max(0, len / 2 - r);
      const prof = [];
      for (let i = 0; i <= hs; i++) { const p = (i / hs) * Math.PI / 2; prof.push([r * Math.sin(p), -half - r * Math.cos(p)]); }
      for (let i = 0; i <= hs; i++) { const p = (i / hs) * Math.PI / 2; prof.push([r * Math.cos(p), half + r * Math.sin(p)]); }
      return geo.lathe(prof, seg);
    },

    torus(R, r, seg = 32, tube = 12) {
      const pos = [], nor = [], idx = [];
      for (let i = 0; i <= seg; i++) {
        const u = (i / seg) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
        for (let j = 0; j <= tube; j++) {
          const v = (j / tube) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
          pos.push((R + r * cv) * cu, r * sv, (R + r * cv) * su);
          nor.push(cv * cu, sv, cv * su);
        }
      }
      for (let i = 0; i < seg; i++) {
        for (let j = 0; j < tube; j++) {
          const a = i * (tube + 1) + j, b = a + tube + 1;
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
      return new Geometry(pos, nor, idx);
    },

    /** Extruye un polígono 2D (plano XY) a lo largo de Z, centrado */
    extrude(shape, depth) {
      let pts = shape.slice();
      let area = 0;
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (area < 0) pts = pts.reverse();
      const tri = earcut(pts);
      const z = depth / 2, pos = [], nor = [], idx = [];
      const n = pts.length;
      pts.forEach(p => { pos.push(p[0], p[1], z); nor.push(0, 0, 1); });
      pts.forEach(p => { pos.push(p[0], p[1], -z); nor.push(0, 0, -1); });
      for (let i = 0; i < tri.length; i += 3) {
        idx.push(tri[i], tri[i + 1], tri[i + 2]);
        idx.push(n + tri[i], n + tri[i + 2], n + tri[i + 1]);
      }
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const nn = [dy / l, -dx / l, 0];
        const o = pos.length / 3;
        pos.push(a[0], a[1], z, b[0], b[1], z, a[0], a[1], -z, b[0], b[1], -z);
        for (let k = 0; k < 4; k++) nor.push(...nn);
        idx.push(o + 2, o + 3, o + 1, o + 2, o + 1, o);
      }
      return new Geometry(pos, nor, idx);
    },

    /** Une varias geometrías (con su transformación) en una sola */
    merge(parts) {
      const pos = [], nor = [], idx = [];
      parts.forEach(({ g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] }) => {
        const m = m4.compose(p, r, s), nm = m4.normalMatrix(m), o = pos.length / 3;
        for (let i = 0; i < g.pos.length; i += 3) {
          const q = m4.transformPoint(m, [g.pos[i], g.pos[i + 1], g.pos[i + 2]]);
          pos.push(q[0], q[1], q[2]);
          const x = g.nor[i], y = g.nor[i + 1], zz = g.nor[i + 2];
          const nx = nm[0] * x + nm[3] * y + nm[6] * zz, ny = nm[1] * x + nm[4] * y + nm[7] * zz, nz = nm[2] * x + nm[5] * y + nm[8] * zz;
          const l = Math.hypot(nx, ny, nz) || 1;
          nor.push(nx / l, ny / l, nz / l);
        }
        for (let i = 0; i < g.idx.length; i++) idx.push(g.idx[i] + o);
      });
      return new Geometry(pos, nor, idx);
    }
  };

  /** Triangulación por recorte de orejas (polígono simple antihorario) */
  function earcut(pts) {
    const n = pts.length, V = [...Array(n).keys()], out = [];
    const area = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inside = (p, a, b, c) => area(a, b, p) >= 0 && area(b, c, p) >= 0 && area(c, a, p) >= 0;
    let guard = 0;
    while (V.length > 3 && guard++ < 5000) {
      let found = false;
      for (let i = 0; i < V.length; i++) {
        const i0 = V[(i + V.length - 1) % V.length], i1 = V[i], i2 = V[(i + 1) % V.length];
        const a = pts[i0], b = pts[i1], c = pts[i2];
        if (area(a, b, c) <= 1e-12) continue;
        let ok = true;
        for (const j of V) {
          if (j === i0 || j === i1 || j === i2) continue;
          if (inside(pts[j], a, b, c)) { ok = false; break; }
        }
        if (!ok) continue;
        out.push(i0, i1, i2);
        V.splice(i, 1);
        found = true;
        break;
      }
      if (!found) break;
    }
    if (V.length === 3) out.push(V[0], V[1], V[2]);
    return out;
  }

  HL.Geometry = Geometry; HL.geo = geo; HL.computeNormals = computeNormals;

  /* ---------------------------------------------------------
     3. ESCENA: NODOS, MALLAS, PUNTOS
     --------------------------------------------------------- */
  let NODE_ID = 0;
  class Node {
    constructor(name = '') {
      this.id = ++NODE_ID;
      this.name = name;
      this.position = [0, 0, 0];
      this.rotation = [0, 0, 0];
      this.scale = [1, 1, 1];
      this.children = [];
      this.parent = null;
      this.visible = true;
      this.world = m4.identity();
      this.userData = {};
    }
    add(...cs) { cs.forEach(c => { if (c.parent) c.parent.remove(c); c.parent = this; this.children.push(c); }); return this; }
    remove(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); c.parent = null; } return this; }
    set(p, r, s) { if (p) this.position = p.slice(); if (r) this.rotation = r.slice(); if (s) this.scale = typeof s === 'number' ? [s, s, s] : s.slice(); return this; }
    updateWorld(parent) {
      const local = m4.compose(this.position, this.rotation, this.scale);
      this.world = parent ? m4.multiply(parent, local, this.world) : local;
      for (const c of this.children) c.updateWorld(this.world);
    }
    traverse(fn) { fn(this); for (const c of this.children) c.traverse(fn); }
    worldPos(local = [0, 0, 0]) { return m4.transformPoint(this.world, local); }
    isShown() { let n = this; while (n) { if (!n.visible) return false; n = n.parent; } return true; }
  }

  class Mesh extends Node {
    constructor(g, mat, name) {
      super(name);
      this.geometry = g;
      this.material = mat;
      this.castShadow = true;
      this.nmat = new Float32Array(9);
    }
  }

  class Points extends Node {
    constructor(count, opts = {}) {
      super('points');
      this.count = count;
      this.data = new Float32Array(count * 4);   // x, y, z, tamaño
      this.color = color(opts.color || '#ffffff');
      this.opacity = opts.opacity ?? 0.8;
      this.additive = !!opts.additive;
      this.buffer = null;
      this.dirty = true;
    }
  }

  /** Material: propiedades de superficie */
  function material(o = {}) {
    return {
      type: o.type || 'std',            // std · water · grid · unlit
      color: color(o.color || '#cccccc'),
      opacity: o.opacity ?? 1,
      emissive: color(o.emissive || '#000000'),
      emissiveIntensity: o.emissiveIntensity ?? 1,
      spec: o.spec ?? 0.25,
      shininess: o.shininess ?? 40,
      fresnel: o.fresnel ?? 0.15,
      doubleSide: !!o.doubleSide,
      depthWrite: o.depthWrite ?? (o.opacity === undefined || o.opacity >= 1),
      caustics: !!o.caustics,
      submerge: !!o.submerge,           // tiñe lo que queda bajo uWaterY
      wave: o.wave ?? 0,                // amplitud de las olas (tipo water)
      waveScale: o.waveScale ?? 1,
      gridColor: color(o.gridColor || '#3a4f9a'),
      receiveShadow: o.receiveShadow ?? true
    };
  }
  HL.Node = Node; HL.Mesh = Mesh; HL.Points = Points; HL.material = material;

  /* ---------------------------------------------------------
     4. SHADERS
     --------------------------------------------------------- */
  const VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNor;
  uniform mat4 uModel, uViewProj, uLightVP;
  uniform mat3 uNormalMat;
  uniform float uTime, uWave, uWaveScale;
  out vec3 vWorld, vNormal;
  out vec4 vLight;
  void main(){
    vec4 w = uModel * vec4(aPos, 1.0);
    vec3 n = normalize(uNormalMat * aNor);
  #ifdef WATER
    float k = uWaveScale;
    float t = uTime;
    float h = sin(w.x*0.9*k + t*1.3)*0.5 + sin(w.z*1.3*k - t*1.1)*0.35 + sin((w.x+w.z)*2.1*k + t*2.2)*0.15;
    float dx = cos(w.x*0.9*k + t*1.3)*0.45*k + cos((w.x+w.z)*2.1*k + t*2.2)*0.315*k;
    float dz = cos(w.z*1.3*k - t*1.1)*0.455*k + cos((w.x+w.z)*2.1*k + t*2.2)*0.315*k;
    w.y += h * uWave;
    n = normalize(vec3(-dx*uWave, 1.0, -dz*uWave));
  #endif
    vWorld = w.xyz;
    vNormal = n;
    vLight = uLightVP * w;
    gl_Position = uViewProj * w;
  }`;

  const FS = `#version 300 es
  precision highp float;
  precision highp sampler2DShadow;
  in vec3 vWorld, vNormal;
  in vec4 vLight;
  uniform vec3 uColor, uEmissive, uCamPos, uSunDir, uSunColor, uSky, uGround, uFogColor, uWaterTint, uGridColor;
  uniform float uOpacity, uSpec, uShin, uFresnel, uTime, uWaterY, uShadowOn, uRecv, uExposure;
  uniform vec2 uFog;
  uniform sampler2DShadow uShadow;
  uniform int uPointCount;
  uniform vec3 uPointPos[4];
  uniform vec3 uPointColor[4];
  out vec4 outColor;

  float shadowAt(){
    if (uShadowOn < 0.5 || uRecv < 0.5) return 1.0;
    vec3 p = vLight.xyz / vLight.w * 0.5 + 0.5;
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
    float s = 0.0;
    vec2 ts = vec2(1.0) / vec2(textureSize(uShadow, 0));
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++)
      s += texture(uShadow, vec3(p.xy + vec2(x, y) * ts * 1.25, p.z - 0.0015));
    return s / 9.0;
  }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }

  void main(){
    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(uCamPos - vWorld);
    vec3 base = uColor;
  #ifdef GRID
    vec2 g = abs(fract(vWorld.xz - 0.5) - 0.5) / fwidth(vWorld.xz);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    vec2 g5 = abs(fract(vWorld.xz / 5.0 - 0.5) - 0.5) / fwidth(vWorld.xz / 5.0);
    float line5 = 1.0 - min(min(g5.x, g5.y), 1.0);
    base = mix(base, uGridColor, line * 0.35 + line5 * 0.6);
  #endif
    vec3 col;
  #ifdef UNLIT
    col = base + uEmissive;
  #else
    float sh = shadowAt();
    vec3 L = normalize(-uSunDir);
    float diff = max(dot(N, L), 0.0);
    vec3 amb = mix(uGround, uSky, N.y * 0.5 + 0.5);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), uShin) * uSpec;
    col = base * (amb + uSunColor * diff * sh) + uSunColor * spec * sh;
    for (int i = 0; i < 4; i++) {
      if (i >= uPointCount) break;
      vec3 d = uPointPos[i] - vWorld;
      float dist = length(d);
      float att = 1.0 / (1.0 + 0.09 * dist * dist);
      vec3 Lp = d / dist;
      col += base * uPointColor[i] * max(dot(N, Lp), 0.0) * att;
      col += uPointColor[i] * pow(max(dot(N, normalize(Lp + V)), 0.0), uShin) * uSpec * att;
    }
    float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += uSky * fr * uFresnel;
    col += uEmissive;
  #endif
  #ifdef CAUSTICS
    float c1 = sin(vWorld.x * 3.1 + uTime * 1.7) * sin(vWorld.z * 2.7 - uTime * 1.3);
    float c2 = sin((vWorld.x + vWorld.z) * 4.3 - uTime * 2.1);
    col += uWaterTint * pow(max(c1 * 0.5 + c2 * 0.5, 0.0), 3.0) * 0.6;
  #endif
  #ifdef SUBMERGE
    if (vWorld.y < uWaterY) {
      float depth = clamp((uWaterY - vWorld.y) / 8.0, 0.0, 1.0);
      col = mix(col, uWaterTint * (0.55 - depth * 0.3), 0.45 + depth * 0.35);
    }
    float band = 1.0 - smoothstep(0.0, 0.07, abs(vWorld.y - uWaterY));
    col = mix(col, vec3(1.0, 0.25, 0.45), band * 0.85);
  #endif
    float alpha = uOpacity;
  #ifdef WATER
    float fw = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    alpha = clamp(uOpacity + fw * 0.35, 0.0, 1.0);
    col += uSky * fw * 0.5;
  #endif
    float fogF = clamp((length(uCamPos - vWorld) - uFog.x) / max(uFog.y - uFog.x, 0.001), 0.0, 1.0);
    col = mix(col, uFogColor, fogF);
    col = aces(col * uExposure);
    col = pow(col, vec3(1.0 / 2.2));
    outColor = vec4(col, alpha);
  }`;

  const DEPTH_VS = `#version 300 es
  layout(location=0) in vec3 aPos;
  uniform mat4 uModel, uLightVP;
  void main(){ gl_Position = uLightVP * uModel * vec4(aPos, 1.0); }`;
  const DEPTH_FS = `#version 300 es
  precision mediump float;
  out vec4 o;
  void main(){ o = vec4(1.0); }`;

  const BG_VS = `#version 300 es
  out vec2 vUv;
  void main(){
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.9999, 1.0);
  }`;
  const BG_FS = `#version 300 es
  precision mediump float;
  in vec2 vUv;
  uniform vec3 uTop, uBottom, uGlow;
  uniform vec2 uGlowPos;
  out vec4 o;
  void main(){
    vec3 c = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
    float g = exp(-distance(vUv, uGlowPos) * 3.2);
    c += uGlow * g;
    o = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
  }`;

  const PT_VS = `#version 300 es
  layout(location=0) in vec4 aP;
  uniform mat4 uViewProj;
  uniform float uScale;
  void main(){
    vec4 p = uViewProj * vec4(aP.xyz, 1.0);
    gl_Position = p;
    gl_PointSize = clamp(aP.w * uScale / max(p.w, 0.01), 1.0, 64.0);
  }`;
  const PT_FS = `#version 300 es
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  out vec4 o;
  void main(){
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.25, r);
    float ring = smoothstep(0.32, 0.45, r) * (1.0 - smoothstep(0.45, 0.5, r));
    o = vec4(pow(uColor, vec3(1.0/2.2)), (a * 0.35 + ring) * uOpacity);
  }`;

  /* ---------------------------------------------------------
     5. RENDERIZADOR
     --------------------------------------------------------- */
  class Renderer {
    constructor(canvas, opts = {}) {
      const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
      if (!gl) throw new Error('WebGL2 no disponible');
      this.gl = gl;
      this.canvas = canvas;
      this.programs = {};
      this.time = 0;
      this.maxDpr = opts.maxDpr || 1.75;
      this.shadowSize = opts.shadowSize || 2048;
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.getExtension('OES_texture_float_linear');
      this.depthProg = this.compile(DEPTH_VS, DEPTH_FS);
      this.bgProg = this.compile(BG_VS, BG_FS);
      this.ptProg = this.compile(PT_VS, PT_FS);
      this.emptyVao = gl.createVertexArray();
      this.initShadow();
      this.resize();
    }

    compile(vs, fs, defines = []) {
      const gl = this.gl;
      const head = defines.map(d => `#define ${d}\n`).join('');
      const fix = src => src.replace('#version 300 es', '#version 300 es\n' + head);
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, fix(src));
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        const name = info.name.replace('[0]', '');
        u[name] = gl.getUniformLocation(p, info.name);
      }
      return { p, u };
    }

    program(mat) {
      const defs = [];
      if (mat.type === 'water') defs.push('WATER');
      if (mat.type === 'grid') defs.push('GRID');
      if (mat.type === 'unlit') defs.push('UNLIT');
      if (mat.caustics) defs.push('CAUSTICS');
      if (mat.submerge) defs.push('SUBMERGE');
      const key = defs.join('|');
      if (!this.programs[key]) this.programs[key] = this.compile(VS, FS, defs);
      return this.programs[key];
    }

    initShadow() {
      const gl = this.gl, s = this.shadowSize;
      this.shadowTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, s, s);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      this.shadowFbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
      const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      this.dpr = dpr;
    }

    vao(g) {
      if (g.vao) return g.vao;
      const gl = this.gl, vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const b1 = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b1); gl.bufferData(gl.ARRAY_BUFFER, g.pos, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      const b2 = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b2); gl.bufferData(gl.ARRAY_BUFFER, g.nor, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      g.vao = vao;
      return vao;
    }

    render(scene, camera) {
      const gl = this.gl;
      this.resize();
      const W = this.canvas.width, H = this.canvas.height;
      camera.aspect = W / H;
      camera.update();
      scene.root.updateWorld(null);

      const meshes = [], points = [];
      const collect = (n) => {
        if (!n.visible) return;
        if (n instanceof Mesh) meshes.push(n);
        else if (n instanceof Points) points.push(n);
        for (const c of n.children) collect(c);
      };
      collect(scene.root);
      meshes.forEach(m => m4.normalMatrix(m.world, m.nmat));

      // --- Sombras ---
      const sun = scene.sun;
      const sdir = v3.norm(sun.dir);
      const sc = scene.shadow || { center: [0, 0, 0], extent: 20 };
      const eye = v3.sub(sc.center, v3.scale(sdir, sc.extent * 2));
      const lv = m4.lookAt(eye, sc.center, Math.abs(sdir[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0]);
      const lp = m4.ortho(-sc.extent, sc.extent, -sc.extent, sc.extent, 0.1, sc.extent * 4);
      const lightVP = m4.multiply(lp, lv);
      const shadowOn = scene.shadows !== false && !this.lowQuality;
      if (shadowOn) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
        gl.viewport(0, 0, this.shadowSize, this.shadowSize);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.depthProg.p);
        gl.uniformMatrix4fv(this.depthProg.u.uLightVP, false, lightVP);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(2, 4);
        gl.disable(gl.CULL_FACE);
        for (const m of meshes) {
          if (!m.castShadow || m.material.opacity < 0.99 || m.material.type === 'water' || m.material.type === 'unlit') continue;
          gl.uniformMatrix4fv(this.depthProg.u.uModel, false, m.world);
          gl.bindVertexArray(this.vao(m.geometry));
          gl.drawElements(gl.TRIANGLES, m.geometry.idx.length, gl.UNSIGNED_INT, 0);
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.CULL_FACE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      // --- Fondo ---
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.depthMask(false);
      gl.useProgram(this.bgProg.p);
      const bg = scene.background;
      gl.uniform3fv(this.bgProg.u.uTop, bg.top);
      gl.uniform3fv(this.bgProg.u.uBottom, bg.bottom);
      gl.uniform3fv(this.bgProg.u.uGlow, bg.glow || [0, 0, 0]);
      gl.uniform2fv(this.bgProg.u.uGlowPos, bg.glowPos || [0.5, 0.8]);
      gl.bindVertexArray(this.emptyVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.depthMask(true);

      // --- Objetos ---
      const viewProj = camera.viewProj;
      const opaque = [], transparent = [];
      for (const m of meshes) (m.material.opacity < 1 || m.material.type === 'water' ? transparent : opaque).push(m);
      const camPos = camera.position;
      transparent.forEach(m => { m._d = v3.dist(camPos, [m.world[12], m.world[13], m.world[14]]) + (m.userData.sortBias || 0); });
      transparent.sort((a, b) => b._d - a._d);

      const pl = (scene.pointLights || []).slice(0, 4);
      const ppos = new Float32Array(12), pcol = new Float32Array(12);
      pl.forEach((l, i) => { ppos.set(l.pos, i * 3); pcol.set(v3.scale(l.color, l.intensity ?? 1), i * 3); });

      let current = null;
      const drawMesh = (m) => {
        const mat = m.material, pr = this.program(mat);
        if (pr !== current) {
          current = pr;
          gl.useProgram(pr.p);
          const u = pr.u;
          gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
          if (u.uLightVP) gl.uniformMatrix4fv(u.uLightVP, false, lightVP);
          gl.uniform3fv(u.uCamPos, camPos);
          if (u.uSunDir) { gl.uniform3fv(u.uSunDir, sdir); gl.uniform3fv(u.uSunColor, v3.scale(sun.color, sun.intensity)); }
          if (u.uSky) { gl.uniform3fv(u.uSky, v3.scale(scene.hemi.sky, scene.hemi.intensity)); gl.uniform3fv(u.uGround, v3.scale(scene.hemi.ground, scene.hemi.intensity)); }
          gl.uniform3fv(u.uFogColor, scene.fog.color);
          gl.uniform2f(u.uFog, scene.fog.near, scene.fog.far);
          if (u.uTime) gl.uniform1f(u.uTime, this.time);
          if (u.uExposure) gl.uniform1f(u.uExposure, scene.exposure || 1);
          if (u.uShadowOn !== undefined && u.uShadowOn) gl.uniform1f(u.uShadowOn, shadowOn ? 1 : 0);
          if (u.uShadow) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex); gl.uniform1i(u.uShadow, 0); }
          if (u.uPointCount) { gl.uniform1i(u.uPointCount, pl.length); gl.uniform3fv(u.uPointPos, ppos); gl.uniform3fv(u.uPointColor, pcol); }
          if (u.uWaterY) gl.uniform1f(u.uWaterY, scene.waterY ?? -1e6);
          if (u.uWaterTint) gl.uniform3fv(u.uWaterTint, scene.waterTint || [0.1, 0.4, 0.7]);
        }
        const u = pr.u;
        gl.uniformMatrix4fv(u.uModel, false, m.world);
        if (u.uNormalMat) gl.uniformMatrix3fv(u.uNormalMat, false, m.nmat);
        gl.uniform3fv(u.uColor, mat.color);
        if (u.uEmissive) gl.uniform3fv(u.uEmissive, v3.scale(mat.emissive, mat.emissiveIntensity));
        gl.uniform1f(u.uOpacity, mat.opacity);
        if (u.uSpec) { gl.uniform1f(u.uSpec, mat.spec); gl.uniform1f(u.uShin, mat.shininess); gl.uniform1f(u.uFresnel, mat.fresnel); }
        if (u.uRecv) gl.uniform1f(u.uRecv, mat.receiveShadow ? 1 : 0);
        if (u.uWave) { gl.uniform1f(u.uWave, mat.wave); gl.uniform1f(u.uWaveScale, mat.waveScale); }
        if (u.uGridColor) gl.uniform3fv(u.uGridColor, mat.gridColor);
        if (mat.doubleSide) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
        gl.depthMask(mat.depthWrite);
        gl.bindVertexArray(this.vao(m.geometry));
        gl.drawElements(gl.TRIANGLES, m.geometry.idx.length, gl.UNSIGNED_INT, 0);
      };

      gl.disable(gl.BLEND);
      opaque.forEach(drawMesh);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      transparent.forEach(drawMesh);

      // --- Puntos (burbujas, partículas) ---
      if (points.length) {
        gl.useProgram(this.ptProg.p);
        gl.uniformMatrix4fv(this.ptProg.u.uViewProj, false, viewProj);
        gl.uniform1f(this.ptProg.u.uScale, H * 0.9);
        gl.depthMask(false);
        for (const pt of points) {
          if (!pt.buffer) {
            pt.vao = gl.createVertexArray();
            gl.bindVertexArray(pt.vao);
            pt.buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, pt.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, pt.data.byteLength, gl.DYNAMIC_DRAW);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
          }
          gl.bindVertexArray(pt.vao);
          if (pt.dirty) { gl.bindBuffer(gl.ARRAY_BUFFER, pt.buffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pt.data); pt.dirty = false; }
          if (pt.additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform3fv(this.ptProg.u.uColor, pt.color);
          gl.uniform1f(this.ptProg.u.uOpacity, pt.opacity);
          gl.drawArrays(gl.POINTS, 0, pt.count);
        }
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
    }
  }
  HL.Renderer = Renderer;

  /* ---------------------------------------------------------
     6. CÁMARA Y CONTROLES ORBITALES
     --------------------------------------------------------- */
  class Camera {
    constructor(fov = 45) {
      this.fov = fov; this.near = 0.1; this.far = 1500; this.aspect = 1;
      this.position = [0, 5, 10]; this.target = [0, 0, 0];
      this.view = m4.identity(); this.proj = m4.identity(); this.viewProj = m4.identity(); this.invViewProj = m4.identity();
    }
    update() {
      this.view = m4.lookAt(this.position, this.target, [0, 1, 0]);
      this.proj = m4.perspective((this.fov * Math.PI) / 180, this.aspect, this.near, this.far);
      if (this.shiftY) this.proj[9] = -this.shiftY;
      this.viewProj = m4.multiply(this.proj, this.view);
      m4.invert(this.viewProj, this.invViewProj);
    }
    /** Rayo desde coordenadas normalizadas (-1..1) */
    ray(nx, ny) {
      const p1 = m4.transformPoint(this.invViewProj, [nx, ny, 1]);
      return { o: this.position.slice(), d: v3.norm(v3.sub(p1, this.position)) };
    }
    project(p, w, h) {
      const m = this.viewProj;
      const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
      const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
      const ww = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      if (ww <= 0.01) return null;
      return { x: (x / ww * 0.5 + 0.5) * w, y: (1 - (y / ww * 0.5 + 0.5)) * h };
    }
  }

  class OrbitControls {
    constructor(camera, dom) {
      this.cam = camera; this.dom = dom;
      this.target = [0, 0, 0]; this.radius = 20; this.theta = 0.6; this.phi = 1.1;
      this.goal = { target: [0, 0, 0], radius: 20, theta: 0.6, phi: 1.1 };
      this.minR = 2; this.maxR = 200; this.minPhi = 0.15; this.maxPhi = 1.52;
      this.enabled = true; this.autoRotate = 0;
      this.pointers = new Map();
      this.onPick = null;          // función(evento) → true si un objeto tomó el puntero
      this.dragging = false;
      this.bind();
    }
    setView(v, instant = false) {
      Object.assign(this.goal, { target: v.target ? v.target.slice() : this.goal.target, radius: v.radius ?? this.goal.radius, theta: v.theta ?? this.goal.theta, phi: v.phi ?? this.goal.phi });
      if (v.minR) this.minR = v.minR; if (v.maxR) this.maxR = v.maxR;
      if (v.minPhi) this.minPhi = v.minPhi; if (v.maxPhi) this.maxPhi = v.maxPhi;
      if (instant) { this.target = this.goal.target.slice(); this.radius = this.goal.radius; this.theta = this.goal.theta; this.phi = this.goal.phi; }
    }
    bind() {
      const el = this.dom;
      el.addEventListener('contextmenu', e => e.preventDefault());
      el.addEventListener('pointerdown', e => {
        if (!this.enabled) return;
        if (this.onPick && this.pointers.size === 0 && this.onPick(e)) return;
        el.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey });
        this.dragging = true;
        this.autoRotateHold = true;
      });
      el.addEventListener('pointermove', e => {
        const p = this.pointers.get(e.pointerId);
        if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        if (this.pointers.size === 1) {
          if (p.button === 2 || p.shift) this.pan(dx, dy);
          else { this.goal.theta -= dx * 0.006; this.goal.phi = Math.min(this.maxPhi, Math.max(this.minPhi, this.goal.phi - dy * 0.006)); }
        } else if (this.pointers.size === 2) {
          const others = [...this.pointers.entries()].find(([id]) => id !== e.pointerId)[1];
          const d0 = Math.hypot(p.x - others.x, p.y - others.y), d1 = Math.hypot(e.clientX - others.x, e.clientY - others.y);
          if (d0 > 0) this.zoom(d0 / d1);
          this.pan(dx / 2, dy / 2);
        }
        p.x = e.clientX; p.y = e.clientY;
      });
      const up = e => { this.pointers.delete(e.pointerId); if (!this.pointers.size) this.dragging = false; };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', e => {
        if (!this.enabled) return;
        e.preventDefault();
        this.zoom(Math.exp(e.deltaY * 0.0012));
      }, { passive: false });
    }
    zoom(f) { this.goal.radius = Math.min(this.maxR, Math.max(this.minR, this.goal.radius * f)); }
    pan(dx, dy) {
      const s = this.goal.radius * 0.0016;
      const right = [Math.cos(this.theta), 0, -Math.sin(this.theta)];
      const up = [0, 1, 0];
      this.goal.target = v3.add(this.goal.target, v3.add(v3.scale(right, -dx * s), v3.scale(up, dy * s)));
    }
    update(dt) {
      const k = 1 - Math.pow(0.0015, dt);
      if (this.autoRotate && !this.dragging) this.goal.theta += this.autoRotate * dt;
      this.theta += (this.goal.theta - this.theta) * k;
      this.phi += (this.goal.phi - this.phi) * k;
      this.radius += (this.goal.radius - this.radius) * k;
      this.target = v3.lerp(this.target, this.goal.target, k);
      const sp = Math.sin(this.phi), rr = this.radius * (this.radiusScale || 1);
      this.cam.target = this.target.slice();
      this.cam.position = [this.target[0] + rr * sp * Math.sin(this.theta), this.target[1] + rr * Math.cos(this.phi), this.target[2] + rr * sp * Math.cos(this.theta)];
    }
  }
  HL.Camera = Camera; HL.OrbitControls = OrbitControls;

  /* ---------------------------------------------------------
     7. SELECCIÓN (RAYOS)
     --------------------------------------------------------- */
  function worldAABB(node) {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    node.traverse(n => {
      if (!(n instanceof Mesh) || !n.isShown()) return;
      const b = n.geometry.bbox;
      for (let i = 0; i < 8; i++) {
        const p = m4.transformPoint(n.world, [i & 1 ? b.max[0] : b.min[0], i & 2 ? b.max[1] : b.min[1], i & 4 ? b.max[2] : b.min[2]]);
        for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
      }
    });
    return { min: mn, max: mx };
  }
  function rayAABB(r, b, pad = 0) {
    let t0 = -Infinity, t1 = Infinity;
    for (let k = 0; k < 3; k++) {
      const inv = 1 / (r.d[k] || 1e-12);
      let a = (b.min[k] - pad - r.o[k]) * inv, c = (b.max[k] + pad - r.o[k]) * inv;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      if (t0 > t1) return null;
    }
    return t1 < 0 ? null : Math.max(t0, 0);
  }
  function rayPlane(r, point, normal) {
    const den = v3.dot(r.d, normal);
    if (Math.abs(den) < 1e-6) return null;
    const t = v3.dot(v3.sub(point, r.o), normal) / den;
    return t < 0 ? null : v3.add(r.o, v3.scale(r.d, t));
  }
  function pick(r, nodes, pad = 0) {
    let best = null;
    for (const n of nodes) {
      if (!n.isShown()) continue;
      const t = rayAABB(r, worldAABB(n), n.userData.pickPad ?? pad);
      if (t !== null && (!best || t < best.t)) best = { node: n, t };
    }
    return best;
  }
  HL.worldAABB = worldAABB; HL.rayPlane = rayPlane; HL.pick = pick;

  /* ---------------------------------------------------------
     8. ETIQUETAS HTML ANCLADAS A LA ESCENA
     --------------------------------------------------------- */
  class Labels {
    constructor(container) { this.root = container; this.items = []; }
    add(html, getPos, opts = {}) {
      const el = document.createElement('div');
      el.className = 'lbl3d ' + (opts.cls || '');
      el.innerHTML = `<div class="in">${html}</div>`;
      this.root.appendChild(el);
      const it = { el, inner: el.firstChild, getPos, group: opts.group || 'global', visible: true, dx: opts.dx || 0, dy: opts.dy || 0 };
      this.items.push(it);
      return it;
    }
    showGroup(g) { this.active = g; }
    update(camera, w, h) {
      for (const it of this.items) {
        const on = it.visible && (it.group === 'global' || it.group === this.active);
        if (!on) { if (it.el.style.display !== 'none') it.el.style.display = 'none'; continue; }
        const p = it.getPos();
        const s = p && camera.project(p, w, h);
        if (!s || s.x < -200 || s.x > w + 200 || s.y < -200 || s.y > h + 200) { it.el.style.display = 'none'; continue; }
        it.el.style.display = '';
        it.el.style.transform = `translate(${(s.x + it.dx).toFixed(1)}px, ${(s.y + it.dy).toFixed(1)}px)`;
      }
    }
  }
  HL.Labels = Labels;

})(window.HL);
