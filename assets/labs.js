/* ===========================================================
   Cálculo II · Capítulo III — motor de laboratorios gráficos
   Universidad del Cauca · Ingeniería Ambiental

   Contenido:
     · modo docente
     · utilidades (proyección 3D, Simpson, intérprete de funciones)
     · labRevolucion  : discos, arandelas y superficies
     · labCascaras    : cáscaras cilíndricas
     · labSecciones   : secciones transversales conocidas
     · labArco        : longitud de curva (poligonal)
     · labArea        : área entre dos curvas
     · labLibre       : graficador abierto
     · KaTeX (si hay internet)
   =========================================================== */

/* ---------------- modo docente ---------------- */
(function () {
  const btn = document.getElementById('btnDocente');
  if (!btn) return;
  const txt = document.getElementById('txtDocente');
  btn.addEventListener('click', () => {
    const on = document.body.classList.toggle('modo-docente');
    btn.classList.toggle('on', on);
    if (txt) txt.textContent = on ? 'Modo docente activo' : 'Activar modo docente';
    try { localStorage.setItem('modoDocente', on ? '1' : '0'); } catch (e) { }
  });
  try {
    if (localStorage.getItem('modoDocente') === '1') btn.click();
  } catch (e) { }
})();

/* ---------------- paleta ---------------- */
const COL = {
  morado: '#5a2d8c', moradoOsc: '#3d1e63', lila: '#8b5fbf',
  fucsia: '#a4348c', violeta: '#6a4c93', malva: '#b79bd4', gris: '#6d5a85'
};

/* ---------------- utilidades ---------------- */
function limpiar(ctx, cv) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
}

/* proyección 3D: giro (az) alrededor del eje vertical + inclinación (el) */
function proy(X, Y, Z, az, el) {
  const ca = Math.cos(az), sa = Math.sin(az);
  const x1 = X * ca + Z * sa, z1 = -X * sa + Z * ca;
  const ce = Math.cos(el), se = Math.sin(el);
  return { x: x1, y: -(Y * ce - z1 * se), z: Y * se + z1 * ce };
}

/* integral numérica por Simpson (400 subintervalos) */
function simpson(g, a, b, n) {
  n = n || 400;
  const h = (b - a) / n;
  let s = fin(g(a)) + fin(g(b));
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * fin(g(a + i * h));
  return s * h / 3;
}
const fin = v => (isFinite(v) ? v : 0);

/* intérprete seguro de funciones escritas por el usuario */
const MAPA_FN = {
  'sqrt': 'Math.sqrt', 'sin': 'Math.sin', 'sen': 'Math.sin', 'cos': 'Math.cos',
  'tan': 'Math.tan', 'exp': 'Math.exp', 'ln': 'Math.log', 'log': 'Math.log10',
  'abs': 'Math.abs', 'cosh': 'Math.cosh', 'senh': 'Math.sinh', 'sinh': 'Math.sinh',
  'pi': 'Math.PI', 'e': 'Math.E', 'x': 'x'
};
function compilar(txt) {
  let t = (txt || '').toLowerCase().replace(/\s+/g, '');
  if (!t) return null;
  if (!/^[0-9x+\-*/^().,a-z]+$/.test(t))
    throw new Error('Hay un carácter que no puedo leer en «' + txt + '».');
  for (const n of (t.match(/[a-z]+/g) || []))
    if (!(n in MAPA_FN)) throw new Error('No reconozco «' + n + '». Revise la ayuda.');
  t = t.replace(/\^/g, '**').replace(/[a-z]+/g, m => MAPA_FN[m]);
  let f;
  try { f = new Function('x', '"use strict";return (' + t + ');'); }
  catch (e) { throw new Error('La expresión «' + txt + '» está mal escrita.'); }
  if (typeof f(1) !== 'number') throw new Error('La expresión no produce un número.');
  return f;
}

/* ejes 2D con marcas */
function ejes(ctx, cv, M, X, Y, marcas, ymin) {
  const y0 = Y(ymin === undefined ? 0 : 0);
  ctx.strokeStyle = COL.gris; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(M.l, y0); ctx.lineTo(cv.width - 12, y0);
  ctx.moveTo(M.l, M.t - 10); ctx.lineTo(M.l, cv.height - M.b + 6);
  ctx.stroke();
  ctx.fillStyle = COL.gris; ctx.font = 'italic 15px Georgia';
  ctx.fillText('x', cv.width - 20, y0 + 20);
  ctx.fillText('y', M.l - 22, M.t - 2);
  ctx.font = '12px system-ui'; ctx.textAlign = 'center';
  marcas.forEach(v => {
    ctx.beginPath(); ctx.moveTo(X(v), y0 - 4); ctx.lineTo(X(v), y0 + 4); ctx.stroke();
    ctx.fillText(Number.isInteger(v) ? v : v.toFixed(2).replace(/\.?0+$/, ''), X(v), y0 + 20);
  });
  ctx.textAlign = 'left';
}

/* traza una curva saltando los puntos no definidos */
function trazar(ctx, f, a, b, X, Y, color, grosor) {
  let abierto = false;
  ctx.beginPath();
  for (let i = 0; i <= 260; i++) {
    const xv = a + (b - a) * i / 260, yv = f(xv);
    if (!isFinite(yv)) { abierto = false; continue; }
    abierto ? ctx.lineTo(X(xv), Y(yv)) : ctx.moveTo(X(xv), Y(yv));
    abierto = true;
  }
  ctx.strokeStyle = color; ctx.lineWidth = grosor || 2.7; ctx.stroke();
}

/* pinta una malla de caras 3D ordenadas por profundidad */
function pintarCaras(ctx, caras) {
  caras.sort((a, b) => a.z - b.z);
  caras.forEach(c => {
    const lum = 0.52 + 0.48 * Math.abs(Math.cos(c.t));
    ctx.beginPath();
    ctx.moveTo(c.q[0].x, c.q[0].y);
    for (let k = 1; k < c.q.length; k++) ctx.lineTo(c.q[k].x, c.q[k].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(' + Math.round(c.col[0] * lum) + ',' +
      Math.round(c.col[1] * lum) + ',' + Math.round(c.col[2] * lum) + ',.86)';
    ctx.fill();
  });
}

/* helper: crea los controles estándar y devuelve los nodos */
function montarControles(host, cfg) {
  const d = document.createElement('div');
  d.className = 'controles';
  let html = '';
  if (cfg.ejemplos) {
    html += '<div class="ctrl"><label>' + (cfg.etiquetaEjemplos || 'Ejemplo') +
      '</label><div class="chips" data-chips>' +
      cfg.ejemplos.map((e, i) =>
        '<span class="chip' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '">' +
        e.nombre + '</span>').join('') + '</div></div>';
  }
  (cfg.sliders || []).forEach(s => {
    html += '<div class="ctrl"><label>' + s.et + '</label>' +
      '<input type="range" data-s="' + s.id + '" min="' + s.min + '" max="' + s.max +
      '" value="' + s.val + '" step="' + (s.step || 1) + '">' +
      '<span class="valor" data-v="' + s.id + '"></span></div>';
  });
  d.innerHTML = html;
  host.appendChild(d);
  return d;
}

/* ===========================================================
   labRevolucion — región girada alrededor del eje x
   cfg.ejemplos[i] = {nombre, R, r|null, a, b, ymax, tR, tr, exacto}
   cfg.modo = 'solido' | 'superficie'
   =========================================================== */
function labRevolucion(id, cfg) {
  const host = document.getElementById(id);
  host.innerHTML =
    '<div class="lienzos">' +
    '<div class="lienzo-caja"><canvas width="640" height="440"></canvas>' +
    '<div class="cap">' + (cfg.cap2 || 'Región plana') + '</div></div>' +
    '<div class="lienzo-caja"><canvas width="640" height="440"></canvas>' +
    '<div class="cap">' + (cfg.cap3 || 'Sólido generado') + '</div></div></div>';
  const [cv2, cv3] = host.querySelectorAll('canvas');
  const g2 = cv2.getContext('2d'), g3 = cv3.getContext('2d');

  montarControles(host, {
    ejemplos: cfg.ejemplos,
    etiquetaEjemplos: cfg.etiquetaEjemplos,
    sliders: [
      { id: 'pos', et: 'Posición de la rebanada', min: 2, max: 98, val: 50 },
      { id: 'giro', et: 'Girar la vista', min: 0, max: 360, val: 35 },
      { id: 'barr', et: cfg.modo === 'superficie' ? 'Abrir la superficie' : 'Cuánto ha girado', min: 10, max: 360, val: cfg.barrInicial || 340 }
    ]
  });
  const lec = document.createElement('div');
  lec.className = 'lectura'; host.appendChild(lec);

  let sel = 0;
  const S = k => +host.querySelector('[data-s=' + k + ']').value;
  const V = k => host.querySelector('[data-v=' + k + ']');

  host.querySelectorAll('[data-chips] .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      host.querySelectorAll('[data-chips] .chip').forEach(c => c.classList.remove('sel'));
      ch.classList.add('sel'); sel = +ch.dataset.i; pintar();
    });
  });
  host.querySelectorAll('[data-s]').forEach(s => s.addEventListener('input', pintar));

  function pintar() {
    const E = cfg.ejemplos[sel];
    const t = S('pos') / 100, xc = E.a + t * (E.b - E.a);
    const R = E.R(xc), r = E.r ? E.r(xc) : 0;
    const az = S('giro') * Math.PI / 180, barr = S('barr') * Math.PI / 180;
    V('pos').textContent = 'x = ' + xc.toFixed(2);
    V('giro').textContent = S('giro') + '°';
    V('barr').textContent = S('barr') + '°';

    /* ---- 2D ---- */
    limpiar(g2, cv2);
    const M = { l: 52, r: 26, t: 26, b: 46 };
    const W = cv2.width - M.l - M.r, H = cv2.height - M.t - M.b;
    const X = v => M.l + (v - E.a) / (E.b - E.a) * W;
    const Y = v => M.t + H - v / E.ymax * H;

    g2.beginPath();
    let ini = true;
    for (let i = 0; i <= 260; i++) {
      const xv = E.a + (E.b - E.a) * i / 260, yv = E.R(xv);
      if (!isFinite(yv)) continue;
      ini ? (g2.moveTo(X(xv), Y(yv)), ini = false) : g2.lineTo(X(xv), Y(yv));
    }
    for (let i = 260; i >= 0; i--) {
      const xv = E.a + (E.b - E.a) * i / 260, yv = E.r ? E.r(xv) : 0;
      if (!isFinite(yv)) continue;
      g2.lineTo(X(xv), Y(yv));
    }
    g2.closePath();
    g2.fillStyle = E.r ? 'rgba(164,52,140,.17)' : 'rgba(139,95,191,.20)';
    g2.fill();

    const marcas = []; for (let v = Math.ceil(E.a); v <= E.b + 1e-9; v++) marcas.push(v);
    if (!marcas.length) marcas.push(E.a, E.b);
    ejes(g2, cv2, M, X, Y, marcas);

    trazar(g2, E.R, E.a, E.b, X, Y, COL.fucsia);
    if (E.r) trazar(g2, E.r, E.a, E.b, X, Y, COL.lila);

    g2.fillStyle = 'rgba(90,45,140,.32)';
    g2.fillRect(X(xc) - 4, Y(R), 8, Y(r) - Y(R));
    g2.strokeStyle = COL.morado; g2.lineWidth = 1.8;
    g2.strokeRect(X(xc) - 4, Y(R), 8, Y(r) - Y(R));

    g2.setLineDash([4, 3]); g2.lineWidth = 1.3; g2.strokeStyle = COL.morado;
    g2.beginPath(); g2.moveTo(M.l, Y(R)); g2.lineTo(X(xc), Y(R));
    if (E.r) { g2.moveTo(M.l, Y(r)); g2.lineTo(X(xc), Y(r)); }
    g2.stroke(); g2.setLineDash([]);
    g2.font = 'bold 12px system-ui';
    g2.fillStyle = COL.fucsia; g2.fillText('R = ' + R.toFixed(2), X(xc) + 10, Y(R) - 6);
    if (E.r) { g2.fillStyle = COL.lila; g2.fillText('r = ' + r.toFixed(2), X(xc) + 10, Y(r) + 16); }

    g2.font = 'italic 14px Georgia';
    const xm = E.a + (E.b - E.a) * 0.62;
    g2.fillStyle = COL.fucsia; g2.fillText('y = ' + E.tR, X(xm), Y(E.R(xm)) - 12);
    if (E.r) { g2.fillStyle = COL.lila; g2.fillText('y = ' + E.tr, X(xm), Y(E.r(xm)) + 22); }

    /* ---- 3D ---- */
    limpiar(g3, cv3);
    const cx = cv3.width / 2, cy = cv3.height / 2 + 14;
    const esc = Math.min((cv3.width - 90) / (E.b - E.a + 0.6), (cv3.height - 120) / (2 * E.ymax * 0.98));
    const el = 0.42;
    const P = (p, q, w) => {
      const z = proy(p - (E.a + E.b) / 2, q, w, az, el);
      return { x: cx + z.x * esc, y: cy + z.y * esc, z: z.z };
    };
    const caras = [], NX = 30, NT = 36;
    const agregar = (f, col) => {
      for (let i = 0; i < NX; i++) {
        const x1 = E.a + (E.b - E.a) * i / NX, x2 = E.a + (E.b - E.a) * (i + 1) / NX;
        const r1 = f(x1), r2 = f(x2);
        if (!isFinite(r1) || !isFinite(r2) || r1 < 0 || r2 < 0) continue;
        for (let j = 0; j < NT; j++) {
          const t1 = barr * j / NT, t2 = barr * (j + 1) / NT;
          caras.push({
            q: [P(x1, r1 * Math.cos(t1), r1 * Math.sin(t1)),
            P(x2, r2 * Math.cos(t1), r2 * Math.sin(t1)),
            P(x2, r2 * Math.cos(t2), r2 * Math.sin(t2)),
            P(x1, r1 * Math.cos(t2), r1 * Math.sin(t2))],
            z: 0, t: (t1 + t2) / 2, col
          });
        }
      }
    };
    if (E.r) agregar(E.r, [140, 100, 190]);
    agregar(E.R, cfg.modo === 'superficie' ? [150, 110, 200] : [175, 70, 150]);
    caras.forEach(c => c.z = c.q.reduce((s, p) => s + p.z, 0) / c.q.length);
    pintarCaras(g3, caras);

    const e1 = P(E.a - 0.3, 0, 0), e2 = P(E.b + 0.3, 0, 0);
    g3.beginPath(); g3.moveTo(e1.x, e1.y); g3.lineTo(e2.x, e2.y);
    g3.strokeStyle = COL.moradoOsc; g3.lineWidth = 1.8; g3.stroke();
    g3.fillStyle = COL.moradoOsc; g3.font = 'italic 15px Georgia';
    g3.fillText('x', e2.x + 8, e2.y + 5);

    const anillo = rad => {
      const p = [];
      for (let j = 0; j <= 56; j++) {
        const tt = barr * j / 56;
        p.push(P(xc, rad * Math.cos(tt), rad * Math.sin(tt)));
      }
      return p;
    };
    const ext = anillo(R);
    g3.beginPath();
    if (E.r) {
      const int = anillo(r);
      g3.moveTo(ext[0].x, ext[0].y); ext.forEach(p => g3.lineTo(p.x, p.y));
      for (let k = int.length - 1; k >= 0; k--) g3.lineTo(int[k].x, int[k].y);
    } else {
      const c0 = P(xc, 0, 0);
      g3.moveTo(c0.x, c0.y); ext.forEach(p => g3.lineTo(p.x, p.y));
    }
    g3.closePath();
    g3.fillStyle = 'rgba(61,30,99,.46)'; g3.fill();
    g3.strokeStyle = COL.moradoOsc; g3.lineWidth = 2.2; g3.stroke();

    /* ---- lectura ---- */
    let txt;
    if (cfg.modo === 'superficie') {
      const Sup = 2 * Math.PI * simpson(v => {
        const h = 1e-5, d = (E.R(v + h) - E.R(v - h)) / (2 * h);
        return E.R(v) * Math.sqrt(1 + d * d);
      }, E.a + 1e-6, E.b - 1e-6);
      txt = '<b>Franja en x = ' + xc.toFixed(2) + ':</b> radio ' + R.toFixed(3) +
        '.<br><b>Área de la superficie:</b> S ≈ ' + Sup.toFixed(4) +
        (E.exacto ? ' &nbsp;(valor exacto ' + E.exacto + ') ✓' : '');
    } else {
      const Vol = Math.PI * simpson(v => {
        const a1 = E.R(v), a2 = E.r ? E.r(v) : 0;
        return (isFinite(a1) ? a1 * a1 : 0) - (isFinite(a2) ? a2 * a2 : 0);
      }, E.a, E.b);
      txt = '<b>' + (E.r ? 'Arandela' : 'Disco') + ' en x = ' + xc.toFixed(2) + ':</b> R = ' +
        R.toFixed(3) + (E.r ? ', r = ' + r.toFixed(3) : '') +
        '. &nbsp;Área = <span class="mat">π</span>' +
        (E.r ? '(R² − r²)' : 'R²') + ' = ' + (Math.PI * (R * R - r * r)).toFixed(3) +
        '.<br><b>Volumen del sólido:</b> V ≈ ' + Vol.toFixed(4) +
        (E.exacto ? ' &nbsp;(valor exacto ' + E.exacto + ') ✓' : '');
    }
    lec.innerHTML = txt;
  }
  pintar();
}

/* ===========================================================
   labCascaras — giro alrededor de un eje VERTICAL (x = c)
   cfg.ejemplos[i] = {nombre, h, a, b, ymax, eje, th, exacto}
   =========================================================== */
function labCascaras(id, cfg) {
  const host = document.getElementById(id);
  host.innerHTML =
    '<div class="lienzos">' +
    '<div class="lienzo-caja"><canvas width="640" height="440"></canvas>' +
    '<div class="cap">Región y cáscara representativa</div></div>' +
    '<div class="lienzo-caja"><canvas width="640" height="440"></canvas>' +
    '<div class="cap">Sólido y cáscara cilíndrica</div></div></div>';
  const [cv2, cv3] = host.querySelectorAll('canvas');
  const g2 = cv2.getContext('2d'), g3 = cv3.getContext('2d');

  montarControles(host, {
    ejemplos: cfg.ejemplos,
    etiquetaEjemplos: 'Ejemplo',
    sliders: [
      { id: 'pos', et: 'Posición de la cáscara', min: 3, max: 97, val: 55 },
      { id: 'giro', et: 'Girar la vista', min: 0, max: 360, val: 40 },
      { id: 'barr', et: 'Cuánto ha girado', min: 10, max: 360, val: 300 }
    ]
  });
  const lec = document.createElement('div');
  lec.className = 'lectura'; host.appendChild(lec);

  let sel = 0;
  const S = k => +host.querySelector('[data-s=' + k + ']').value;
  const V = k => host.querySelector('[data-v=' + k + ']');
  host.querySelectorAll('[data-chips] .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      host.querySelectorAll('[data-chips] .chip').forEach(c => c.classList.remove('sel'));
      ch.classList.add('sel'); sel = +ch.dataset.i; pintar();
    });
  });
  host.querySelectorAll('[data-s]').forEach(s => s.addEventListener('input', pintar));

  function pintar() {
    const E = cfg.ejemplos[sel];
    const t = S('pos') / 100, xc = E.a + t * (E.b - E.a);
    const alt = E.h(xc), rad = Math.abs(xc - E.eje);
    const az = S('giro') * Math.PI / 180, barr = S('barr') * Math.PI / 180;
    V('pos').textContent = 'x = ' + xc.toFixed(2);
    V('giro').textContent = S('giro') + '°';
    V('barr').textContent = S('barr') + '°';

    /* ---- 2D ---- */
    limpiar(g2, cv2);
    const xmin = Math.min(E.a, E.eje) - 0.3, xmax = Math.max(E.b, E.eje) + 0.3;
    const M = { l: 44, r: 26, t: 26, b: 46 };
    const W = cv2.width - M.l - M.r, H = cv2.height - M.t - M.b;
    const X = v => M.l + (v - xmin) / (xmax - xmin) * W;
    const Y = v => M.t + H - v / E.ymax * H;

    g2.beginPath(); g2.moveTo(X(E.a), Y(0));
    for (let i = 0; i <= 260; i++) { const xv = E.a + (E.b - E.a) * i / 260; g2.lineTo(X(xv), Y(E.h(xv))); }
    g2.lineTo(X(E.b), Y(0)); g2.closePath();
    g2.fillStyle = 'rgba(139,95,191,.20)'; g2.fill();

    const marcas = []; for (let v = Math.ceil(xmin); v <= xmax; v++) marcas.push(v);
    ejes(g2, cv2, M, X, Y, marcas);

    trazar(g2, E.h, E.a, E.b, X, Y, COL.morado);

    /* eje de rotación */
    g2.setLineDash([7, 4]); g2.strokeStyle = COL.fucsia; g2.lineWidth = 2;
    g2.beginPath(); g2.moveTo(X(E.eje), M.t - 8); g2.lineTo(X(E.eje), Y(0) + 10); g2.stroke();
    g2.setLineDash([]);
    g2.fillStyle = COL.fucsia; g2.font = 'bold 12px system-ui';
    g2.fillText('eje x = ' + E.eje, X(E.eje) - 22, M.t - 12);

    /* cáscara = rectángulo vertical */
    g2.fillStyle = 'rgba(164,52,140,.34)';
    g2.fillRect(X(xc) - 4, Y(alt), 8, Y(0) - Y(alt));
    g2.strokeStyle = COL.fucsia; g2.lineWidth = 1.8;
    g2.strokeRect(X(xc) - 4, Y(alt), 8, Y(0) - Y(alt));

    /* radio */
    g2.strokeStyle = COL.violeta; g2.lineWidth = 1.8;
    g2.beginPath(); g2.moveTo(X(E.eje), Y(0) + 24); g2.lineTo(X(xc), Y(0) + 24); g2.stroke();
    g2.fillStyle = COL.violeta; g2.font = 'bold 12px system-ui';
    g2.fillText('p = ' + rad.toFixed(2), (X(E.eje) + X(xc)) / 2 - 20, Y(0) + 40);
    g2.fillStyle = COL.fucsia;
    g2.fillText('h = ' + alt.toFixed(2), X(xc) + 10, (Y(alt) + Y(0)) / 2);

    /* ---- 3D: eje de giro vertical ---- */
    limpiar(g3, cv3);
    const cx = cv3.width / 2, cy = cv3.height / 2 + 70;
    const Rmax = Math.max(Math.abs(E.a - E.eje), Math.abs(E.b - E.eje));
    const esc = Math.min((cv3.width - 80) / (2 * Rmax + 0.6), (cv3.height - 130) / (E.ymax * 1.9));
    const el = 0.40;
    /* el eje de giro es vertical: Y es la altura */
    const P = (rr, th, hh) => {
      const z = proy(rr * Math.cos(th), hh - E.ymax / 2, rr * Math.sin(th), az, el);
      return { x: cx + z.x * esc, y: cy + z.y * esc, z: z.z };
    };
    const caras = [], NR = 26, NT = 34;
    for (let i = 0; i < NR; i++) {
      const u1 = E.a + (E.b - E.a) * i / NR, u2 = E.a + (E.b - E.a) * (i + 1) / NR;
      const p1 = Math.abs(u1 - E.eje), p2 = Math.abs(u2 - E.eje);
      const h1 = E.h(u1), h2 = E.h(u2);
      if (!isFinite(h1) || !isFinite(h2)) continue;
      for (let j = 0; j < NT; j++) {
        const t1 = barr * j / NT, t2 = barr * (j + 1) / NT;
        /* tapa superior (la superficie del sólido) */
        caras.push({
          q: [P(p1, t1, h1), P(p2, t1, h2), P(p2, t2, h2), P(p1, t2, h1)],
          z: 0, t: (t1 + t2) / 2, col: [160, 110, 200]
        });
      }
    }
    caras.forEach(c => c.z = c.q.reduce((s, p) => s + p.z, 0) / c.q.length);
    pintarCaras(g3, caras);

    /* cáscara resaltada: cilindro de radio rad y altura alt */
    const cil = [];
    for (let j = 0; j < 48; j++) {
      const t1 = barr * j / 48, t2 = barr * (j + 1) / 48;
      cil.push({
        q: [P(rad, t1, 0), P(rad, t2, 0), P(rad, t2, alt), P(rad, t1, alt)],
        z: 0, t: (t1 + t2) / 2, col: [200, 70, 160]
      });
    }
    cil.forEach(c => c.z = c.q.reduce((s, p) => s + p.z, 0) / c.q.length);
    pintarCaras(g3, cil);

    /* eje vertical */
    const b1 = P(0, 0, -0.2), b2 = P(0, 0, E.ymax + 0.2);
    g3.beginPath(); g3.moveTo(b1.x, b1.y); g3.lineTo(b2.x, b2.y);
    g3.strokeStyle = COL.moradoOsc; g3.lineWidth = 2;
    g3.setLineDash([6, 4]); g3.stroke(); g3.setLineDash([]);

    const Vol = 2 * Math.PI * simpson(v => Math.abs(v - E.eje) * fin(E.h(v)), E.a, E.b);
    lec.innerHTML = '<b>Cáscara en x = ' + xc.toFixed(2) + ':</b> radio p = ' +
      rad.toFixed(3) + ', altura h = ' + alt.toFixed(3) +
      '. &nbsp;Área lateral = 2<span class="mat">π</span>ph = ' +
      (2 * Math.PI * rad * alt).toFixed(3) +
      '.<br><b>Volumen del sólido:</b> V = 2<span class="mat">π</span>∫p·h dx ≈ ' +
      Vol.toFixed(4) + (E.exacto ? ' &nbsp;(valor exacto ' + E.exacto + ') ✓' : '');
  }
  pintar();
}

/* ===========================================================
   labSecciones — sólido de secciones transversales conocidas
   cfg.ejemplos[i] = {nombre, sup, inf, a, b, ymax, forma, area, tf, exacto}
   forma: 'cuadrado' | 'triangulo' | 'semicirculo'
   =========================================================== */
function labSecciones(id, cfg) {
  const host = document.getElementById(id);
  host.innerHTML =
    '<div class="lienzos">' +
    '<div class="lienzo-caja"><canvas width="640" height="440"></canvas>' +
    '<div class="cap">Base del sólido en el plano</div></div>' +
    '<div class="lienzo-caja"><canvas width="640" height="440"></canvas>' +
    '<div class="cap">Secciones transversales levantadas</div></div></div>';
  const [cv2, cv3] = host.querySelectorAll('canvas');
  const g2 = cv2.getContext('2d'), g3 = cv3.getContext('2d');

  montarControles(host, {
    ejemplos: cfg.ejemplos,
    etiquetaEjemplos: 'Forma de la sección',
    sliders: [
      { id: 'pos', et: 'Posición de la sección', min: 2, max: 98, val: 50 },
      { id: 'giro', et: 'Girar la vista', min: 0, max: 360, val: 40 },
      { id: 'n', et: 'Cuántas secciones ver', min: 1, max: 28, val: 14 }
    ]
  });
  const lec = document.createElement('div');
  lec.className = 'lectura'; host.appendChild(lec);

  let sel = 0;
  const S = k => +host.querySelector('[data-s=' + k + ']').value;
  const V = k => host.querySelector('[data-v=' + k + ']');
  host.querySelectorAll('[data-chips] .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      host.querySelectorAll('[data-chips] .chip').forEach(c => c.classList.remove('sel'));
      ch.classList.add('sel'); sel = +ch.dataset.i; pintar();
    });
  });
  host.querySelectorAll('[data-s]').forEach(s => s.addEventListener('input', pintar));

  /* perfil de la sección: devuelve puntos (ancho, alto) normalizados al lado L */
  function perfil(forma, L) {
    if (forma === 'cuadrado') return [[-L / 2, 0], [L / 2, 0], [L / 2, L], [-L / 2, L]];
    if (forma === 'triangulo') return [[-L / 2, 0], [L / 2, 0], [0, L * Math.sqrt(3) / 2]];
    const p = [];                                  /* semicírculo */
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * i / 18;
      p.push([(L / 2) * Math.cos(a), (L / 2) * Math.sin(a)]);
    }
    return p;
  }

  function pintar() {
    const E = cfg.ejemplos[sel];
    const t = S('pos') / 100, xc = E.a + t * (E.b - E.a);
    const L = E.sup(xc) - E.inf(xc);
    const az = S('giro') * Math.PI / 180, N = S('n');
    V('pos').textContent = 'x = ' + xc.toFixed(2);
    V('giro').textContent = S('giro') + '°';
    V('n').textContent = N + ' secciones';

    /* ---- 2D ---- */
    limpiar(g2, cv2);
    const M = { l: 44, r: 26, t: 26, b: 46 };
    const W = cv2.width - M.l - M.r, H = cv2.height - M.t - M.b;
    const X = v => M.l + (v - E.a) / (E.b - E.a) * W;
    const Y = v => M.t + H / 2 - v / E.ymax * (H / 2);

    g2.beginPath();
    for (let i = 0; i <= 260; i++) { const xv = E.a + (E.b - E.a) * i / 260; i ? g2.lineTo(X(xv), Y(E.sup(xv))) : g2.moveTo(X(xv), Y(E.sup(xv))); }
    for (let i = 260; i >= 0; i--) { const xv = E.a + (E.b - E.a) * i / 260; g2.lineTo(X(xv), Y(E.inf(xv))); }
    g2.closePath(); g2.fillStyle = 'rgba(139,95,191,.20)'; g2.fill();
    g2.strokeStyle = COL.morado; g2.lineWidth = 2.4; g2.stroke();

    g2.strokeStyle = COL.gris; g2.lineWidth = 1.3;
    g2.beginPath(); g2.moveTo(M.l, Y(0)); g2.lineTo(cv2.width - 14, Y(0)); g2.stroke();
    g2.fillStyle = COL.gris; g2.font = 'italic 14px Georgia';
    g2.fillText('x', cv2.width - 22, Y(0) + 18);

    g2.strokeStyle = COL.fucsia; g2.lineWidth = 3;
    g2.beginPath(); g2.moveTo(X(xc), Y(E.inf(xc))); g2.lineTo(X(xc), Y(E.sup(xc))); g2.stroke();
    g2.fillStyle = COL.fucsia; g2.font = 'bold 12px system-ui';
    g2.fillText('L = ' + L.toFixed(2), X(xc) + 9, Y(0) - 8);

    /* ---- 3D ---- */
    limpiar(g3, cv3);
    const cx = cv3.width / 2, cy = cv3.height / 2 + 40;
    const Lmax = Math.max(...[0, .25, .5, .75, 1].map(s => E.sup(E.a + s * (E.b - E.a)) - E.inf(E.a + s * (E.b - E.a))));
    const esc = Math.min((cv3.width - 80) / (E.b - E.a + 1), (cv3.height - 110) / (Lmax * 2.1 + 1));
    const el = 0.36;
    const P = (px, anc, alt) => {
      const z = proy(px - (E.a + E.b) / 2, alt - Lmax / 2, anc, az, el);
      return { x: cx + z.x * esc, y: cy + z.y * esc, z: z.z };
    };

    const piezas = [];
    for (let i = 0; i < N; i++) {
      const xv = E.a + (E.b - E.a) * (i + 0.5) / N;
      const Li = E.sup(xv) - E.inf(xv);
      if (!(Li > 0)) continue;
      const pf = perfil(E.forma, Li);
      const q = pf.map(([an, al]) => P(xv, an, al));
      const prof = q.reduce((s, p) => s + p.z, 0) / q.length;
      piezas.push({ q, z: prof, t: 0.6, col: (Math.abs(xv - xc) < (E.b - E.a) / (2 * N)) ? [200, 70, 160] : [150, 115, 205] });
    }
    pintarCaras(g3, piezas);

    const b1 = P(E.a - 0.3, 0, 0), b2 = P(E.b + 0.3, 0, 0);
    g3.beginPath(); g3.moveTo(b1.x, b1.y); g3.lineTo(b2.x, b2.y);
    g3.strokeStyle = COL.moradoOsc; g3.lineWidth = 1.8; g3.stroke();
    g3.fillStyle = COL.moradoOsc; g3.font = 'italic 15px Georgia';
    g3.fillText('x', b2.x + 8, b2.y + 5);

    const Vol = simpson(v => E.area(E.sup(v) - E.inf(v)), E.a, E.b);
    lec.innerHTML = '<b>Sección en x = ' + xc.toFixed(2) + ':</b> lado L = ' + L.toFixed(3) +
      ', área A(x) = ' + E.area(L).toFixed(3) +
      '.<br><b>Volumen del sólido:</b> V = ∫A(x)dx ≈ ' + Vol.toFixed(4) +
      (E.exacto ? ' &nbsp;(valor exacto ' + E.exacto + ') ✓' : '');
  }
  pintar();
}

/* ===========================================================
   labArco — longitud de curva por aproximación poligonal
   cfg.ejemplos[i] = {nombre, f, a, b, ymin, ymax, tf, exacto}
   =========================================================== */
function labArco(id, cfg) {
  const host = document.getElementById(id);
  host.innerHTML =
    '<div class="lienzos"><div class="lienzo-caja" style="flex:1 1 100%">' +
    '<canvas width="920" height="440"></canvas>' +
    '<div class="cap">La poligonal se acerca a la curva al aumentar el número de tramos</div>' +
    '</div></div>';
  const cv = host.querySelector('canvas'), g = cv.getContext('2d');

  montarControles(host, {
    ejemplos: cfg.ejemplos,
    etiquetaEjemplos: 'Curva',
    sliders: [{ id: 'n', et: 'Número de tramos', min: 1, max: 40, val: 5 }]
  });
  const lec = document.createElement('div');
  lec.className = 'lectura'; host.appendChild(lec);

  let sel = 0;
  const S = k => +host.querySelector('[data-s=' + k + ']').value;
  const V = k => host.querySelector('[data-v=' + k + ']');
  host.querySelectorAll('[data-chips] .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      host.querySelectorAll('[data-chips] .chip').forEach(c => c.classList.remove('sel'));
      ch.classList.add('sel'); sel = +ch.dataset.i; pintar();
    });
  });
  host.querySelectorAll('[data-s]').forEach(s => s.addEventListener('input', pintar));

  function pintar() {
    const E = cfg.ejemplos[sel], N = S('n');
    V('n').textContent = N + (N === 1 ? ' tramo' : ' tramos');

    limpiar(g, cv);
    const M = { l: 58, r: 28, t: 28, b: 48 };
    const W = cv.width - M.l - M.r, H = cv.height - M.t - M.b;
    const y0 = E.ymin === undefined ? 0 : E.ymin;
    const X = v => M.l + (v - E.a) / (E.b - E.a) * W;
    const Y = v => M.t + H - (v - y0) / (E.ymax - y0) * H;

    /* ejes */
    g.strokeStyle = COL.gris; g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(M.l, M.t + H); g.lineTo(cv.width - 14, M.t + H);
    g.moveTo(M.l, M.t - 10); g.lineTo(M.l, M.t + H);
    g.stroke();
    g.fillStyle = COL.gris; g.font = 'italic 15px Georgia';
    g.fillText('x', cv.width - 24, M.t + H + 20);
    g.fillText('y', M.l - 24, M.t - 2);
    g.font = '12px system-ui'; g.textAlign = 'center';
    for (let v = Math.ceil(E.a); v <= E.b; v++) {
      g.beginPath(); g.moveTo(X(v), M.t + H - 4); g.lineTo(X(v), M.t + H + 4); g.stroke();
      g.fillText(v, X(v), M.t + H + 20);
    }
    g.textAlign = 'left';

    /* curva real */
    trazar(g, E.f, E.a, E.b, X, Y, COL.lila, 3.2);

    /* poligonal */
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const xv = E.a + (E.b - E.a) * i / N;
      i ? g.lineTo(X(xv), Y(E.f(xv))) : g.moveTo(X(xv), Y(E.f(xv)));
    }
    g.strokeStyle = COL.fucsia; g.lineWidth = 2.2; g.stroke();
    for (let i = 0; i <= N; i++) {
      const xv = E.a + (E.b - E.a) * i / N;
      g.beginPath(); g.arc(X(xv), Y(E.f(xv)), 3.4, 0, 2 * Math.PI);
      g.fillStyle = COL.morado; g.fill();
    }

    g.fillStyle = COL.lila; g.font = 'italic 15px Georgia';
    const xm = E.a + (E.b - E.a) * 0.72;
    g.fillText('y = ' + E.tf, X(xm), Y(E.f(xm)) - 16);

    /* longitudes */
    let poli = 0;
    for (let i = 0; i < N; i++) {
      const x1 = E.a + (E.b - E.a) * i / N, x2 = E.a + (E.b - E.a) * (i + 1) / N;
      poli += Math.hypot(x2 - x1, E.f(x2) - E.f(x1));
    }
    const exact = simpson(v => {
      const h = 1e-5, d = (E.f(v + h) - E.f(v - h)) / (2 * h);
      return Math.sqrt(1 + d * d);
    }, E.a + 1e-5, E.b - 1e-5);
    const err = Math.abs(exact - poli) / exact * 100;
    lec.innerHTML = '<b>Poligonal con ' + N + (N === 1 ? ' tramo' : ' tramos') + ':</b> ' +
      poli.toFixed(5) + '<br><b>Longitud de arco (integral):</b> ' + exact.toFixed(5) +
      (E.exacto ? ' &nbsp;(valor exacto ' + E.exacto + ')' : '') +
      ' &nbsp;·&nbsp; diferencia: ' + err.toFixed(3) + '%';
  }
  pintar();
}

/* ===========================================================
   labArea — área entre dos curvas
   cfg.ejemplos[i] = {nombre, sup, inf, a, b, ymin, ymax, tsup, tinf, exacto}
   =========================================================== */
function labArea(id, cfg) {
  const host = document.getElementById(id);
  host.innerHTML =
    '<div class="lienzos"><div class="lienzo-caja" style="flex:1 1 100%">' +
    '<canvas width="920" height="440"></canvas>' +
    '<div class="cap">Región entre las curvas y rectángulo representativo</div>' +
    '</div></div>';
  const cv = host.querySelector('canvas'), g = cv.getContext('2d');

  montarControles(host, {
    ejemplos: cfg.ejemplos,
    etiquetaEjemplos: 'Ejemplo',
    sliders: [
      { id: 'pos', et: 'Rectángulo representativo', min: 2, max: 98, val: 45 },
      { id: 'n', et: 'Rectángulos de Riemann', min: 0, max: 40, val: 0 }
    ]
  });
  const lec = document.createElement('div');
  lec.className = 'lectura'; host.appendChild(lec);

  let sel = 0;
  const S = k => +host.querySelector('[data-s=' + k + ']').value;
  const V = k => host.querySelector('[data-v=' + k + ']');
  host.querySelectorAll('[data-chips] .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      host.querySelectorAll('[data-chips] .chip').forEach(c => c.classList.remove('sel'));
      ch.classList.add('sel'); sel = +ch.dataset.i; pintar();
    });
  });
  host.querySelectorAll('[data-s]').forEach(s => s.addEventListener('input', pintar));

  function pintar() {
    const E = cfg.ejemplos[sel];
    const t = S('pos') / 100, xc = E.a + t * (E.b - E.a), N = S('n');
    V('pos').textContent = 'x = ' + xc.toFixed(2);
    V('n').textContent = N === 0 ? 'ninguno' : N;

    limpiar(g, cv);
    const M = { l: 58, r: 28, t: 28, b: 48 };
    const W = cv.width - M.l - M.r, H = cv.height - M.t - M.b;
    const y0 = E.ymin === undefined ? 0 : E.ymin;
    const X = v => M.l + (v - E.a) / (E.b - E.a) * W;
    const Y = v => M.t + H - (v - y0) / (E.ymax - y0) * H;

    /* región */
    g.beginPath();
    for (let i = 0; i <= 260; i++) { const xv = E.a + (E.b - E.a) * i / 260; i ? g.lineTo(X(xv), Y(E.sup(xv))) : g.moveTo(X(xv), Y(E.sup(xv))); }
    for (let i = 260; i >= 0; i--) { const xv = E.a + (E.b - E.a) * i / 260; g.lineTo(X(xv), Y(E.inf(xv))); }
    g.closePath(); g.fillStyle = 'rgba(139,95,191,.22)'; g.fill();

    /* rectángulos de Riemann */
    if (N > 0) {
      for (let i = 0; i < N; i++) {
        const xv = E.a + (E.b - E.a) * (i + 0.5) / N;
        const w = W / N;
        g.fillStyle = 'rgba(164,52,140,.20)';
        g.fillRect(X(E.a + (E.b - E.a) * i / N), Y(E.sup(xv)), w, Y(E.inf(xv)) - Y(E.sup(xv)));
        g.strokeStyle = 'rgba(164,52,140,.55)'; g.lineWidth = 1;
        g.strokeRect(X(E.a + (E.b - E.a) * i / N), Y(E.sup(xv)), w, Y(E.inf(xv)) - Y(E.sup(xv)));
      }
    }

    /* ejes */
    g.strokeStyle = COL.gris; g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(M.l, Y(0)); g.lineTo(cv.width - 14, Y(0));
    g.moveTo(M.l, M.t - 10); g.lineTo(M.l, M.t + H + 6);
    g.stroke();
    g.fillStyle = COL.gris; g.font = 'italic 15px Georgia';
    g.fillText('x', cv.width - 24, Y(0) + 18);
    g.fillText('y', M.l - 24, M.t - 2);
    g.font = '12px system-ui'; g.textAlign = 'center';
    for (let v = Math.ceil(E.a); v <= E.b; v++) {
      g.beginPath(); g.moveTo(X(v), Y(0) - 4); g.lineTo(X(v), Y(0) + 4); g.stroke();
      g.fillText(v, X(v), Y(0) + 19);
    }
    g.textAlign = 'left';

    trazar(g, E.sup, E.a, E.b, X, Y, COL.fucsia, 3);
    trazar(g, E.inf, E.a, E.b, X, Y, COL.lila, 3);

    /* rectángulo representativo */
    const h = E.sup(xc) - E.inf(xc);
    g.fillStyle = 'rgba(90,45,140,.38)';
    g.fillRect(X(xc) - 5, Y(E.sup(xc)), 10, Y(E.inf(xc)) - Y(E.sup(xc)));
    g.strokeStyle = COL.morado; g.lineWidth = 2;
    g.strokeRect(X(xc) - 5, Y(E.sup(xc)), 10, Y(E.inf(xc)) - Y(E.sup(xc)));
    g.fillStyle = COL.morado; g.font = 'bold 13px system-ui';
    g.fillText('altura = ' + h.toFixed(2), X(xc) + 12, (Y(E.sup(xc)) + Y(E.inf(xc))) / 2);

    g.font = 'italic 15px Georgia';
    const xm = E.a + (E.b - E.a) * 0.74;
    g.fillStyle = COL.fucsia; g.fillText('y = ' + E.tsup, X(xm), Y(E.sup(xm)) - 14);
    g.fillStyle = COL.lila; g.fillText('y = ' + E.tinf, X(xm), Y(E.inf(xm)) + 24);

    const A = simpson(v => E.sup(v) - E.inf(v), E.a, E.b);
    let riem = '';
    if (N > 0) {
      let s = 0;
      for (let i = 0; i < N; i++) {
        const xv = E.a + (E.b - E.a) * (i + 0.5) / N;
        s += (E.sup(xv) - E.inf(xv)) * (E.b - E.a) / N;
      }
      riem = '<br><b>Suma de ' + N + ' rectángulos:</b> ' + s.toFixed(4);
    }
    lec.innerHTML = '<b>Rectángulo en x = ' + xc.toFixed(2) + ':</b> altura = ' +
      h.toFixed(3) + ', área = altura × dx.' +
      '<br><b>Área de la región:</b> A = ∫(superior − inferior)dx ≈ ' + A.toFixed(4) +
      (E.exacto ? ' &nbsp;(valor exacto ' + E.exacto + ') ✓' : '') + riem;
  }
  pintar();
}

/* ===========================================================
   labLibre — graficador abierto
   =========================================================== */
function labLibre(id, cfg) {
  cfg = cfg || {};
  const host = document.getElementById(id);
  host.innerHTML =
    '<div class="controles">' +
    '<div class="entrada"><label>Radio exterior <span class="mat">R(x)</span></label>' +
    '<input type="text" data-f="R" value="' + (cfg.R || 'sqrt(x)') + '" spellcheck="false"></div>' +
    '<div class="entrada"><label>Radio interior <span class="mat">r(x)</span></label>' +
    '<input type="text" data-f="r" value="" placeholder="vacío = disco macizo" spellcheck="false"></div>' +
    '<div class="entrada"><label>Intervalo</label>desde ' +
    '<input type="number" data-f="a" value="' + (cfg.a !== undefined ? cfg.a : 0) + '" step="0.25"> hasta ' +
    '<input type="number" data-f="b" value="' + (cfg.b !== undefined ? cfg.b : 4) + '" step="0.25">' +
    '<button class="btn" data-ir>Graficar</button></div>' +
    '<div class="sugerencias">' +
    (cfg.sugerencias || []).map(s =>
      '<span class="chip" data-ext="' + s.R + '" data-int="' + (s.r || '') +
      '" data-a="' + s.a + '" data-b="' + s.b + '">' + s.nombre + '</span>').join('') +
    '</div></div>' +
    '<div class="aviso" data-aviso></div>' +
    '<div class="lienzos" style="margin-top:14px">' +
    '<div class="lienzo-caja"><canvas width="640" height="440"></canvas>' +
    '<div class="cap">Región plana</div></div>' +
    '<div class="lienzo-caja"><canvas width="640" height="440"></canvas>' +
    '<div class="cap">Sólido de revolución</div></div></div>' +
    '<div class="controles">' +
    '<div class="ctrl"><label>Girar la vista</label>' +
    '<input type="range" data-s="giro" min="0" max="360" value="35">' +
    '<span class="valor" data-v="giro"></span></div>' +
    '<div class="ctrl"><label>Abrir el sólido</label>' +
    '<input type="range" data-s="barr" min="10" max="360" value="330">' +
    '<span class="valor" data-v="barr"></span></div></div>' +
    '<div class="lectura" data-lec></div>' +
    '<div class="ayuda-sint"><b>Cómo escribir la función.</b> ' +
    'Potencias con <code>^</code> (<code>x^2</code>) · multiplicación con <code>*</code> ' +
    '(<code>2*x</code>) · raíz <code>sqrt(x)</code> · trigonométricas <code>sen(x)</code>, ' +
    '<code>cos(x)</code>, <code>tan(x)</code> · exponencial <code>exp(x)</code> o ' +
    '<code>e^x</code> · logaritmos <code>ln(x)</code> y <code>log(x)</code> · ' +
    'hiperbólicas <code>cosh(x)</code>, <code>senh(x)</code> · valor absoluto ' +
    '<code>abs(x)</code> · constante <code>pi</code>.<br>El volumen se calcula por la ' +
    'regla de Simpson con 400 subintervalos: es una aproximación muy buena, no un valor exacto.</div>';

  const [cv2, cv3] = host.querySelectorAll('canvas');
  const g2 = cv2.getContext('2d'), g3 = cv3.getContext('2d');
  const F = k => host.querySelector('[data-f=' + k + ']');
  const av = host.querySelector('[data-aviso]'), lec = host.querySelector('[data-lec]');
  const S = k => +host.querySelector('[data-s=' + k + ']').value;
  const V = k => host.querySelector('[data-v=' + k + ']');
  let G = null;

  host.querySelector('[data-ir]').addEventListener('click', preparar);
  ['R', 'r', 'a', 'b'].forEach(k => F(k).addEventListener('keydown', e => { if (e.key === 'Enter') preparar(); }));
  host.querySelectorAll('[data-s]').forEach(s => s.addEventListener('input', pintar));
  host.querySelectorAll('.sugerencias .chip').forEach(ch => {
    ch.addEventListener('click', () => {
      F('R').value = ch.getAttribute('data-ext');
      F('r').value = ch.getAttribute('data-int');
      F('a').value = ch.getAttribute('data-a');
      F('b').value = ch.getAttribute('data-b');
      preparar();
    });
  });

  function aviso(m) {
    if (m) { av.textContent = m; av.classList.add('ver'); }
    else av.classList.remove('ver');
  }

  function preparar() {
    try {
      const fR = compilar(F('R').value);
      if (!fR) throw new Error('Escriba al menos el radio exterior R(x).');
      const fr = compilar(F('r').value);
      const a = parseFloat(F('a').value), b = parseFloat(F('b').value);
      if (!isFinite(a) || !isFinite(b)) throw new Error('Los límites deben ser números.');
      if (b <= a) throw new Error('El límite derecho debe ser mayor que el izquierdo.');
      let ymax = 0, malos = 0;
      for (let i = 0; i <= 300; i++) {
        const xv = a + (b - a) * i / 300, vR = fR(xv), vr = fr ? fr(xv) : 0;
        if (!isFinite(vR) || !isFinite(vr)) { malos++; continue; }
        ymax = Math.max(ymax, Math.abs(vR), Math.abs(vr));
      }
      if (malos > 150) throw new Error('La función no está definida en casi todo el intervalo. Por ejemplo 1/x o ln(x) necesitan empezar después de 0.');
      if (!ymax || !isFinite(ymax)) throw new Error('No pude evaluar la función en ese intervalo.');
      aviso(null);
      G = { fR, fr, a, b, ymax: ymax * 1.12, malos };
      pintar();
    } catch (e) { aviso('⚠ ' + e.message); }
  }

  function pintar() {
    if (!G) return;
    const { fR, fr, a, b, ymax } = G;
    const az = S('giro') * Math.PI / 180, barr = S('barr') * Math.PI / 180;
    V('giro').textContent = S('giro') + '°';
    V('barr').textContent = S('barr') + '°';

    limpiar(g2, cv2);
    const M = { l: 54, r: 26, t: 26, b: 46 };
    const W = cv2.width - M.l - M.r, H = cv2.height - M.t - M.b;
    const X = v => M.l + (v - a) / (b - a) * W, Y = v => M.t + H - v / ymax * H;

    g2.beginPath();
    let ini = true;
    for (let i = 0; i <= 300; i++) {
      const xv = a + (b - a) * i / 300, yv = fR(xv);
      if (!isFinite(yv)) continue;
      ini ? (g2.moveTo(X(xv), Y(Math.max(yv, 0))), ini = false) : g2.lineTo(X(xv), Y(Math.max(yv, 0)));
    }
    for (let i = 300; i >= 0; i--) {
      const xv = a + (b - a) * i / 300, yv = fr ? fr(xv) : 0;
      if (!isFinite(yv)) continue;
      g2.lineTo(X(xv), Y(Math.max(yv, 0)));
    }
    g2.closePath();
    g2.fillStyle = fr ? 'rgba(164,52,140,.17)' : 'rgba(139,95,191,.20)';
    g2.fill();

    const marcas = [a, b]; if (a < 0 && b > 0) marcas.push(0);
    ejes(g2, cv2, M, X, Y, marcas);
    trazar(g2, fR, a, b, X, Y, COL.fucsia);
    if (fr) trazar(g2, fr, a, b, X, Y, COL.lila);
    g2.fillStyle = COL.fucsia; g2.font = 'italic 14px Georgia';
    g2.fillText('R(x) = ' + F('R').value, M.l + 10, M.t + 6);
    if (fr) { g2.fillStyle = COL.lila; g2.fillText('r(x) = ' + F('r').value, M.l + 10, M.t + 24); }

    limpiar(g3, cv3);
    const cx = cv3.width / 2, cy = cv3.height / 2 + 14;
    const esc = Math.min((cv3.width - 90) / (b - a + 0.6), (cv3.height - 120) / (2 * ymax * 0.98));
    const el = 0.42;
    const P = (p, q, w) => {
      const z = proy(p - (a + b) / 2, q, w, az, el);
      return { x: cx + z.x * esc, y: cy + z.y * esc, z: z.z };
    };
    const caras = [], NX = 32, NT = 38;
    const agregar = (f, col) => {
      for (let i = 0; i < NX; i++) {
        const x1 = a + (b - a) * i / NX, x2 = a + (b - a) * (i + 1) / NX;
        const r1 = f(x1), r2 = f(x2);
        if (!isFinite(r1) || !isFinite(r2) || r1 < 0 || r2 < 0) continue;
        for (let j = 0; j < NT; j++) {
          const t1 = barr * j / NT, t2 = barr * (j + 1) / NT;
          caras.push({
            q: [P(x1, r1 * Math.cos(t1), r1 * Math.sin(t1)),
            P(x2, r2 * Math.cos(t1), r2 * Math.sin(t1)),
            P(x2, r2 * Math.cos(t2), r2 * Math.sin(t2)),
            P(x1, r1 * Math.cos(t2), r1 * Math.sin(t2))],
            z: 0, t: (t1 + t2) / 2, col
          });
        }
      }
    };
    if (fr) agregar(fr, [140, 100, 190]);
    agregar(fR, [175, 70, 150]);
    caras.forEach(c => c.z = c.q.reduce((s, p) => s + p.z, 0) / c.q.length);
    pintarCaras(g3, caras);

    const e1 = P(a - 0.3, 0, 0), e2 = P(b + 0.3, 0, 0);
    g3.beginPath(); g3.moveTo(e1.x, e1.y); g3.lineTo(e2.x, e2.y);
    g3.strokeStyle = COL.moradoOsc; g3.lineWidth = 1.8; g3.stroke();
    g3.fillStyle = COL.moradoOsc; g3.font = 'italic 15px Georgia';
    g3.fillText('x', e2.x + 8, e2.y + 5);

    const Vol = Math.PI * simpson(v => {
      const vR = fR(v), vr = fr ? fr(v) : 0;
      if (!isFinite(vR) || !isFinite(vr)) return 0;
      return vR * vR - vr * vr;
    }, a, b);
    lec.innerHTML = '<b>Método de ' + (fr ? 'arandelas' : 'discos') + '.</b> &nbsp;' +
      (fr ? 'V = <span class="mat">π</span>∫([R]²−[r]²)dx' : 'V = <span class="mat">π</span>∫[R]²dx') +
      ' sobre [' + a + ', ' + b + ']<br><b>Volumen aproximado:</b> ' + Vol.toFixed(4) +
      ' unidades cúbicas' +
      (G.malos ? ' <span style="color:#a4348c">(se omitieron los puntos donde la función no está definida)</span>' : '');
  }
  preparar();
}

/* ===========================================================
   KaTeX: si hay internet, las fórmulas se ven como en LaTeX.
   Si no carga, queda el HTML de respaldo.
   =========================================================== */
window.addEventListener('load', () => {
  if (typeof katex === 'undefined') return;
  document.querySelectorAll('[data-tex]').forEach(el => {
    try {
      katex.render(el.getAttribute('data-tex'), el, {
        displayMode: el.classList.contains('formula') ||
          el.classList.contains('resultado') ||
          el.classList.contains('tex-display'),
        throwOnError: false
      });
    } catch (e) { }
  });
});
