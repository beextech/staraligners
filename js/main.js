(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
};

/* ══════════════ Language (EN / AL) ══════════════ */
const EN = {}, EN_PH = {};
$$('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (!(k in EN)) EN[k] = el.innerHTML; });
$$('[data-i18n-ph]').forEach(el => { EN_PH[el.dataset.i18nPh] = el.getAttribute('placeholder'); });
$$('[data-i18n-aria]').forEach(el => { el._aria = el.getAttribute('aria-label'); });
let lang = store.get('staraligners_lang') === 'al' ? 'al' : 'en';
// The choice is saved in localStorage only when the visitor presses EN / AL
function setLang(l, save){
  lang = l; if (save) store.set('staraligners_lang', l);
  document.documentElement.lang = l === 'al' ? 'sq' : 'en';
  const dict = l === 'al' ? I18N_AL : EN;
  $$('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n]; if (v !== undefined) el.innerHTML = v; });
  $$('[data-i18n-ph]').forEach(el => { const k = el.dataset.i18nPh; const v = l === 'al' ? I18N_AL[k] : EN_PH[k]; if (v) el.setAttribute('placeholder', v); });
  $$('[data-i18n-aria]').forEach(el => { const v = l === 'al' ? I18N_AL[el.dataset.i18nAria] : null; el.setAttribute('aria-label', v ? v + (el.dataset.n ? ' ' + el.dataset.n : '') : el._aria); });
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
  document.dispatchEvent(new Event('sa:lang'));
}
$$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang, true)));

/* ══════════════ Nav ══════════════ */
const nav = $('#nav');
// Glass nav once the page has moved: a 1px sentinel at the top, watched by IntersectionObserver
const sentinel = document.createElement('div'); sentinel.style.cssText = 'position:absolute;top:24px;left:0;width:1px;height:1px;pointer-events:none';
document.body.prepend(sentinel);
new IntersectionObserver(es => nav.classList.toggle('is-scrolled', !es[0].isIntersecting)).observe(sentinel);

const menuBtn = $('#menuBtn'), mMenu = $('#mMenu'), mbar = $('#mbar');
function setMenu(open){
  mMenu.classList.toggle('open', open);
  mMenu.setAttribute('aria-hidden', String(!open));
  menuBtn.setAttribute('aria-expanded', String(open));
  $('#menuLbl').textContent = open ? (lang === 'al' ? 'Mbyll' : 'Close') : (lang === 'al' ? I18N_AL.menu : EN.menu);
  document.body.style.overflow = open ? 'hidden' : '';
  mbar.classList.toggle('hide', open || barHits.size > 0);
}
menuBtn.addEventListener('click', () => { const open = !mMenu.classList.contains('open'); setMenu(open); if (open) setTimeout(() => $('#mMenu a').focus({ preventScroll: true }), 60); });
$$('#mMenu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && mMenu.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

// Active section in nav
const navMap = {};
$$('.nav-links a').forEach(a => navMap[a.getAttribute('href').slice(1)] = a);
const secObs = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  $$('.nav-links a').forEach(x => x.classList.remove('is-active'));
  const a = navMap[e.target.id]; if (a) a.classList.add('is-active');
}), { rootMargin:'-45% 0px -50% 0px' });
['top', 'capabilities', 'results', 'faq', ...Object.keys(navMap)].forEach(id => { const s = document.getElementById(id); if (s) secObs.observe(s); });

// "Become a Partner" links preselect the Partnership interest
$$('[data-interest]').forEach(a => a.addEventListener('click', () => {
  const box = $('#i-' + a.dataset.interest); if (box) box.checked = true;
}));

// Hide mobile bar while the quote form or footer is on screen
const barHits = new Set();
const barObs = new IntersectionObserver(es => {
  es.forEach(e => e.isIntersecting ? barHits.add(e.target) : barHits.delete(e.target));
  if (!mMenu.classList.contains('open')) mbar.classList.toggle('hide', barHits.size > 0);
}, { threshold: 0.05 });
barObs.observe($('#quoteForm')); barObs.observe($('.foot'));

/* ══════════════ Reveal ══════════════ */
const rvObs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); rvObs.unobserve(e.target); }
}), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
$$('.rv').forEach(el => {
  if (el.classList.contains('shot')) return; // clip-path hides these from IntersectionObserver; revealed via the gallery below
  const r = el.getBoundingClientRect();
  if (r.top < innerHeight) el.classList.add('in'); else rvObs.observe(el);
});
const galObs = new IntersectionObserver(es => { if (es[0].isIntersecting) { $$('.shot').forEach(s => s.classList.add('in')); galObs.disconnect(); } }, { threshold: 0.1 });
galObs.observe($('#gallery'));

/* ══════════════ Magnetic buttons ══════════════ */
if (finePointer && !reduced) {
  $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', ((e.clientX - r.left - r.width/2) * 0.18).toFixed(1) + 'px');
      b.style.setProperty('--my', ((e.clientY - r.top - r.height/2) * 0.28).toFixed(1) + 'px');
    });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--mx','0px'); b.style.setProperty('--my','0px'); });
  });
}

/* ══════════════ Arch model (shared by 3D hero, fallback and workflow) ══════════════
   Units are millimetres. Tooth sizes are typical anatomical averages for a lower arch:
   [mesiodistal width, buccolingual depth, crown height, type 0 incisor / 1 canine / 2 premolar / 3 molar]. */
const ARCH = (() => {
  const half = [[5.6,6.0,8.8,0],[6.1,6.3,8.9,0],[7.0,7.6,9.8,1],[7.1,7.9,8.2,2],[7.3,8.3,7.8,2],[11.0,10.4,7.4,3],[10.4,10.0,6.9,3]];
  const teeth = [...half.slice().reverse(), ...half].map(t => ({ w:t[0], d:t[1], h:t[2], type:t[3] }));
  const total = teeth.reduce((a,t) => a + t.w, 0);
  let acc = 0; teeth.forEach(t => { t.start = acc; t.c = acc + t.w/2; acc += t.w; });
  const N = 2000, us = [], ls = []; let L = 0, px = null, pz = null;
  const AX = 24, AZ = 40, zf = u => AZ/2 - AZ*(0.5*u*u + 0.5*u*u*u*u), dz = u => -AZ*(u + 2*u*u*u);
  for (let i = 0; i <= N; i++) { const u = -1 + 2*i/N, x = AX*u, z = zf(u); if (px !== null) L += Math.hypot(x-px, z-pz); us.push(u); ls.push(L); px = x; pz = z; }
  const k = total / L;
  function at(s){
    const target = Math.max(0, Math.min(total, s)) / k;
    let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ls[m] < target) lo = m; else hi = m; }
    const f = (target - ls[lo]) / ((ls[hi] - ls[lo]) || 1), u = us[lo] + (us[hi] - us[lo]) * f;
    const x = AX*u*k, z = zf(u)*k;
    let tx = AX, tz = dz(u); const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
    let nx = tz, nz = -tx; if (nx*x + nz*(z + 8*k) < 0) { nx = -nx; nz = -nz; }
    return { x, z, tx, tz, nx, nz };
  }
  const taperOf = [0.62, 0.5, 0.26, 0.16];
  function profile(s){
    let sw = 0, d = 0, h = 0, tp = 0;
    for (const t of teeth) { const w = Math.exp(-Math.pow((s - t.c)/(0.55*t.w), 2)); sw += w; d += w*t.d; h += w*t.h; tp += w*taperOf[t.type]; }
    d /= sw; h /= sw; tp /= sw;
    let j = teeth.findIndex(t => s < t.start + t.w); if (j < 0) j = teeth.length - 1;
    const t = teeth[j], tt = (s - t.start)/t.w, e = Math.min(tt, 1 - tt) * t.w;
    const edge = Math.min(s, total - s);
    return {
      d, h, taper: tp, tooth: t, tt,
      pinch: 1 - 0.17*Math.exp(-Math.pow(e/1.1, 2)),
      hPinch: 1 - 0.2*Math.exp(-Math.pow(e/1.3, 2)),
      scallop: 1.9*Math.exp(-Math.pow(e/1.5, 2)),
      cap: edge <= 0 ? 0 : Math.min(1, edge/3.2)
    };
  }
  // Point on the crown surface: s along the arch, phi 0 (buccal) → π (lingual)
  function surf(s, phi, inset = 0){
    const p = at(s), pr = profile(s);
    const c = Math.cos(phi), sn = Math.sin(phi);
    const lat = Math.sign(c) * Math.pow(Math.abs(c), 0.55);
    const vert = Math.pow(Math.max(sn, 0), 0.55);
    const capL = Math.sqrt(pr.cap), capH = Math.pow(pr.cap, 0.35);
    const halfD = Math.max(0, (pr.d/2)*pr.pinch*capL - inset);
    const lateral = lat * halfD * (1 - pr.taper * Math.pow(vert, 1.8));
    let cusp = 0;
    if (pr.tooth.type >= 2) {
      const along = pr.tooth.type === 3 ? -Math.cos(4*Math.PI*pr.tt) : Math.sin(Math.PI*pr.tt);
      cusp = 0.9 * (0.55 + 0.45*along) * (-Math.cos(2*Math.PI*lat*0.5 + Math.PI)) * Math.pow(vert, 5);
    }
    const y = pr.scallop*(1 - vert) + vert*(pr.h*pr.hPinch*capH - inset) + cusp*capH;
    return [p.x + p.nx*lateral, y, p.z + p.nz*lateral];
  }
  /* Individual crowns. Local frame per tooth: X along the arch (mesiodistal), Z outward (buccal).
     cfg per type: occlusal taper, rounded shoulder height, superellipse exponent, tallest cusp. */
  const TCFG = [
    { taper:.62, edge:.5, n:2.4, fmax:.3 },
    { taper:.5,  edge:.8, n:2.2, fmax:1.5 },
    { taper:.22, edge:1., n:2.3, fmax:1.25 },
    { taper:.12, edge:1.1, n:3., fmax:1.15 }
  ];
  const G = (x, z, s) => Math.exp(-(x*x + z*z) / s);
  function cusp(type, Xm, Z){ // Xm: +1 mesial edge, -1 distal edge; Z: +1 buccal, -1 lingual
    if (type === 0) return .3*Math.exp(-Z*Z/.25);
    if (type === 1) return 1.5*G(Xm*.9, Z, .22) + .35*Math.exp(-Z*Z/.06);
    if (type === 2) return 1.25*G(Xm*.8, Z - .3, .2) + .55*G(Xm*.8, Z + .5, .14) - .35*Math.exp(-Math.pow(Z + .12, 2)/.02)*(1 - Xm*Xm*.6);
    return 1.05*G(Xm - .5, Z - .48, .09) + G(Xm + .02, Z - .5, .09) + .75*G(Xm + .62, Z - .28, .07)
      + 1.15*G(Xm - .45, Z + .48, .09) + 1.05*G(Xm + .4, Z + .48, .09)
      - .55*Math.exp(-Z*Z/.018) - .3*Math.exp(-Math.pow(Xm + .22, 2)/.015)*(Z > 0 ? 1 : .3);
  }
  teeth.forEach(t => {
    const c = TCFG[t.type];
    t.cfg = c; t.side = t.c < total/2 ? 1 : -1;
    t.a = t.w/2*.94; t.b = t.d/2*.9; t.bTop = t.b*(1 - c.taper);
    t.yRim = t.h - .35 - c.edge - c.fmax;
  });
  const smax = (a, b, k) => { const h = Math.max(0, Math.min(1, .5 + .5*(b - a)/k)); return a + (b - a)*h + k*h*(1 - h); };
  // Height of the crown surface under a point (s along the arch, Z across it)
  function crownTop(t, X, Z){
    const e = 2/t.cfg.n, nx = Math.abs(X)/t.a, nz = Math.abs(Z)/t.bTop;
    const rho = Math.pow(Math.pow(nx, 2/e) + Math.pow(nz, 2/e), e/2);
    if (rho >= 1) return t.yRim - (rho - 1)*5;
    return t.yRim + t.cfg.edge*Math.sqrt(1 - Math.pow(rho, 4)) + cusp(t.type, (X/t.a)*t.side, Z/t.bTop)*(1 - Math.pow(rho, 6));
  }
  function topAt(s, Z){
    let j = teeth.findIndex(t => s < t.start + t.w); if (j < 0) j = teeth.length - 1;
    let y = -9;
    for (let q = Math.max(0, j - 1); q <= Math.min(teeth.length - 1, j + 1); q++) y = smax(y, crownTop(teeth[q], s - teeth[q].c, Z), .9);
    return y;
  }
  // Aligner surface fitted over the crowns. off = clearance in mm (negative samples inside the crowns)
  function shell(s, phi, off = .4){
    const p = at(s), pr = profile(s);
    const c = Math.cos(phi), sn = Math.sin(phi);
    const lat = Math.sign(c)*Math.pow(Math.abs(c), .6), vert = Math.pow(Math.max(sn, 0), .5);
    const cap = Math.sqrt(pr.cap);
    const halfD = Math.max(0, (pr.d/2*.9*pr.pinch + off)*cap);
    const lateral = lat*halfD*(1 - pr.taper*Math.pow(vert, 1.6));
    const top = Math.max(topAt(s, lateral) + off, .6)*Math.pow(pr.cap, .3);
    const base = .25 + pr.scallop*.9;
    const y = base + Math.pow(vert, 1.3)*(top - base);
    return [p.x + p.nx*lateral, y, p.z + p.nz*lateral];
  }
  return { teeth, total, at, profile, surf, shell, cusp, k };
})();

/* 2D occlusal drawing helpers (SVG) */
function archSVG(opts){
  const S = opts.scale, ox = opts.ox, oy = opts.oy, zTop = ARCH.at(ARCH.total/2).z;
  const P = (x, z) => [ox + x*S, oy + (zTop - z)*S];
  const shellPath = (extra) => {
    const out = [], inn = [], n = 140;
    for (let i = 0; i <= n; i++) {
      const s = ARCH.total * i/n, p = ARCH.at(s), pr = ARCH.profile(s);
      const hd = ((pr.d/2)*pr.pinch + extra) * Math.sqrt(pr.cap || 0.02);
      out.push(P(p.x + p.nx*hd, p.z + p.nz*hd)); inn.push(P(p.x - p.nx*hd, p.z - p.nz*hd));
    }
    const pts = out.concat(inn.reverse());
    return 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z';
  };
  const teeth = ARCH.teeth.map(t => {
    const p = ARCH.at(t.c), [cx, cy] = P(p.x, p.z);
    const ang = Math.atan2(-p.tz, p.tx) * 180 / Math.PI;
    return { cx, cy, ang, w: t.w*S*0.9, d: t.d*S*0.94, t, p };
  });
  return { P, shellPath, teeth, S };
}
const svgNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent){ const n = document.createElementNS(svgNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
function rng(seed){ return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

/* Hero fallback (shown until WebGL is ready, or instead of it) */
(function drawFallback(){
  const host = $('#heroFallback');
  const svg = el('svg', { viewBox:'0 0 600 460', fill:'none' }, host);
  const A = archSVG({ scale: 8.6, ox: 300, oy: 40 });
  el('path', { d: A.shellPath(1.1), stroke:'#69d0f8', 'stroke-width':'1.4', fill:'rgba(105,208,248,.04)' }, svg);
  A.teeth.forEach(t => el('rect', { x: t.cx - t.w/2, y: t.cy - t.d/2, width: t.w, height: t.d, rx: Math.min(t.w, t.d)*0.38, transform:`rotate(${t.ang.toFixed(2)} ${t.cx.toFixed(1)} ${t.cy.toFixed(1)})`, stroke:'rgba(206,226,242,.35)', 'stroke-width':'1' }, svg));
})();

/* ══════════════ Workflow: scroll-driven stages ══════════════ */
const wfSvg = $('#wfSvg');
const layers = {};
(function buildWorkflow(){
  const A = archSVG({ scale: 7.2, ox: 300, oy: 46 });
  const defs = el('defs', {}, wfSvg);
  const clip = el('clipPath', { id:'shellClip' }, defs); el('path', { d: A.shellPath(1.1) }, clip);
  const mk = n => (layers[n] = el('g', { class: 'wf-l wf-' + n }, wfSvg));

  // 0 · point cloud + scan sweep
  const pts = mk('pts'), R = rng(7);
  A.teeth.forEach(t => {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, rr = 0.82 + R()*0.24;
      const lx = Math.cos(a) * t.w/2 * rr, ly = Math.sin(a) * t.d/2 * rr;
      const rad = t.ang * Math.PI/180;
      el('circle', { cx: (t.cx + lx*Math.cos(rad) - ly*Math.sin(rad)).toFixed(1), cy: (t.cy + lx*Math.sin(rad) + ly*Math.cos(rad)).toFixed(1), r: (0.9 + R()*0.7).toFixed(2), opacity: (0.35 + R()*0.6).toFixed(2) }, pts);
    }
    for (let i = 0; i < 6; i++) el('circle', { cx: (t.cx + (R()-0.5)*t.w*0.5).toFixed(1), cy: (t.cy + (R()-0.5)*t.d*0.5).toFixed(1), r: '0.8', opacity: '.35' }, pts);
  });
  const scan = mk('scan'); const sg = el('g', {}, scan);
  el('rect', { x: 50, y: 30, width: 40, height: 380 }, sg); el('line', { x1: 90, x2: 90, y1: 30, y2: 410 }, sg);

  // 1 · teeth + planned movement
  const teethG = mk('teeth');
  A.teeth.forEach(t => el('rect', { x: t.cx - t.w/2, y: t.cy - t.d/2, width: t.w, height: t.d, rx: Math.min(t.w, t.d)*0.38, transform:`rotate(${t.ang.toFixed(2)} ${t.cx.toFixed(1)} ${t.cy.toFixed(1)})` }, teethG));
  const move = mk('move');
  [[5, -9, 2.2], [6, 7, -1.6], [7, -6, 1.8], [8, 10, -2.4], [4, 5, 1.2], [9, -5, 1.4]].forEach(([i, rot, off]) => {
    const t = A.teeth[i], gx = t.cx + t.p.nx*off*A.S, gy = t.cy - t.p.nz*off*A.S;
    el('rect', { x: gx - t.w/2, y: gy - t.d/2, width: t.w, height: t.d, rx: Math.min(t.w, t.d)*0.38, transform:`rotate(${(t.ang + rot).toFixed(2)} ${gx.toFixed(1)} ${gy.toFixed(1)})` }, move);
    const len = Math.hypot(t.cx - gx, t.cy - gy) || 1, ux = (t.cx - gx)/len, uy = (t.cy - gy)/len;
    const ex = t.cx - ux*3, ey = t.cy - uy*3;
    el('path', { d:`M${gx.toFixed(1)} ${gy.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}M${(ex - ux*5 - uy*3).toFixed(1)} ${(ey - uy*5 + ux*3).toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}L${(ex - ux*5 + uy*3).toFixed(1)} ${(ey - uy*5 - ux*3).toFixed(1)}` }, move);
    el('circle', { cx: gx.toFixed(1), cy: gy.toFixed(1), r: 2 }, move);
  });

  // 2 · aligner shell
  const shell = mk('shell');
  el('path', { d: A.shellPath(1.1) }, shell);
  el('path', { class:'trim', d: A.shellPath(2.6) }, shell);

  // 4 · quality control markers
  const qc = mk('qc');
  [0.04, 0.2, 0.38, 0.5, 0.62, 0.8, 0.96].forEach((f, i) => {
    const s = ARCH.total * f, p = ARCH.at(s), pr = ARCH.profile(s), hd = (pr.d/2)*pr.pinch + 1.1;
    const [x, y] = A.P(p.x + p.nx*hd, p.z + p.nz*hd);
    const g = el('g', {}, qc); g.style.setProperty('--i', i);
    el('circle', { cx: x, cy: y, r: 8 }, g);
    el('line', { x1: x - 13, x2: x - 4, y1: y, y2: y }, g); el('line', { x1: x + 4, x2: x + 13, y1: y, y2: y }, g);
    el('line', { x1: x, x2: x, y1: y - 13, y2: y - 4 }, g); el('line', { x1: x, x2: x, y1: y + 4, y2: y + 13 }, g);
    const tx = el('text', { x: x + (p.nx >= 0 ? 16 : -16), y: y - 10, 'text-anchor': p.nx >= 0 ? 'start' : 'end', class:'ok' }, g); tx.textContent = '✓';
  });

  // 5 · delivery: a sequence of sets
  const sets = mk('sets');
  [2, 1, 0].forEach(i => {
    const g = el('g', {}, sets); g.style.setProperty('--dx', (i*16) + 'px'); g.style.setProperty('--dy', (i*-14) + 'px');
    const p = el('path', { d: A.shellPath(1.1) }, g); p.style.opacity = String(1 - i*0.28);
    const p0 = ARCH.at(0), [lx, ly] = A.P(p0.x, p0.z);
    const t = el('text', { x: lx - 18, y: ly + 18 }, g); t.setAttribute('text-anchor','end'); t.textContent = 'SET 0' + (i + 1);
  });
})();

const STAGE_LAYERS = [ ['pts','scan'], ['teeth','move'], ['shell','teeth:dim'], ['shell'], ['shell','qc'], ['sets'] ];
let wfStage = -1;
function setStage(i){
  if (i === wfStage) return; wfStage = i;
  Object.values(layers).forEach(g => g.classList.remove('on','dim'));
  STAGE_LAYERS[i].forEach(spec => { const [n, mod] = spec.split(':'); layers[n].classList.add(mod === 'dim' ? 'dim' : 'on'); });
  const steps = $$('.wf-step');
  steps.forEach(s => s.classList.toggle('on', +s.dataset.step === i));
  placeRail();
}
// The aligner marker on the rail travels to the active step
const rail = $('.wf-rail');
function placeRail(){
  const s = $$('.wf-step')[Math.max(0, wfStage)], h = s.querySelector('h3');
  rail.style.setProperty('--fill', (h.offsetTop + h.offsetHeight / 2) + 'px');
}
setStage(0);
addEventListener('resize', placeRail);
// Active step = the step crossing the middle of the viewport
const stepObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setStage(+e.target.dataset.step); }), { rootMargin: '-50% 0px -50% 0px' });
$$('.wf-step').forEach(s => stepObs.observe(s));



/* ══════════════ Gallery + lightbox ══════════════ */
const shots = $$('.shot'), lb = $('#lb'), lbImg = $('#lbImg');
let lbIdx = 0, lbReturn = null;
function showLb(i){ lbIdx = (i + shots.length) % shots.length; const im = shots[lbIdx].querySelector('img'); lbImg.src = im.src; lbImg.alt = im.alt; }
function openLb(i){ lbReturn = document.activeElement; showLb(i); lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; $('#lbX').focus(); }
function closeLb(){ lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; if (lbReturn) lbReturn.focus(); }
shots.forEach((b, i) => b.addEventListener('click', () => openLb(i)));
$('#lbX').onclick = closeLb; $('#lbP').onclick = () => showLb(lbIdx - 1); $('#lbN').onclick = () => showLb(lbIdx + 1);
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') showLb(lbIdx - 1); if (e.key === 'ArrowRight') showLb(lbIdx + 1);
});


/* ══════════════ Copy buttons ══════════════ */
function copyText(text, btn){
  const done = () => { if (!btn) return; const lblEl = btn.querySelector('[data-i18n]') || btn; const old = lblEl.innerHTML; lblEl.innerHTML = MSG[lang].copied; setTimeout(() => { lblEl.innerHTML = old; }, 1600); };
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch(e){} ta.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
}
$$('[data-copy]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy, b)));

/* Shared with js/form.js */
window.StarAligners = { $, $$, reduced, copyText, getLang: () => lang };

/* ══════════════ Footer year ══════════════ */
$('#yr').textContent = new Date().getFullYear();

/* ══════════════ 3D (Three.js, loaded lazily from jsDelivr) ══════════════ */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
let threeP = null;
const loadThree = () => threeP || (threeP = import(THREE_URL));
const idle = cb => ('requestIdleCallback' in window) ? requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 200);
function webglOK(){ try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch(e){ return false; } }
const saveData = !!(navigator.connection && navigator.connection.saveData);
const can3D = webglOK() && !saveData;
const small = () => innerWidth < 860;
const clamp01 = v => Math.max(0, Math.min(1, v));
const sstep = (a, b, v) => { const x = clamp01((v - a)/(b - a)); return x*x*(3 - 2*x); };
// Raw sRGB triplet for custom shaders (they skip three's colour management)
const rawBlue = T => new T.Color().setRGB(0x69/255, 0xd0/255, 0xf8/255, T.LinearSRGBColorSpace);

// Runs a render loop only while `host` is on screen and the tab is visible
function loop(host, frame){
  let visible = false, running = false, last = 0;
  const tick = now => {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(.1, (now - last)/1000); last = now;
    const keep = frame(dt, now/1000);
    if (keep === false) { running = false; return; }
    requestAnimationFrame(tick);
  };
  const start = () => { if (!running && visible && !document.hidden) { running = true; last = performance.now(); requestAnimationFrame(tick); } };
  new IntersectionObserver(es => { visible = es[0].isIntersecting; start(); }, { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', start);
  return { kick: start };
}

/* Studio environment for reflections: a dark room with three soft boxes and a blue rim strip */
function studioEnv(T, renderer){
  const sc = new T.Scene();
  sc.add(new T.Mesh(new T.BoxGeometry(20, 20, 20), new T.MeshBasicMaterial({ color: 0x050607, side: T.BackSide })));
  const panel = (w, h, col, k, pos) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); sc.add(m);
  };
  panel(10, 7, 0xffffff, 3.2, [0, 9.5, 1]);
  panel(3, 9, 0xffffff, 2.4, [-9.5, 3, 3]);
  panel(2.5, 7, 0xffffff, 1.1, [9.5, 2, 1]);
  panel(10, 1.4, 0x69d0f8, 2.2, [0, 2.2, -9.5]);
  const pm = new T.PMREMGenerator(renderer), tex = pm.fromScene(sc, .035).texture; pm.dispose();
  return tex;
}

/* Lower arch model in millimetres: gingiva, 14 crowns, fitted aligner, design mesh */
function buildArch(T, q){
  const flipIfInward = (geo, probe) => {
    geo.computeVertexNormals();
    const n = geo.attributes.normal;
    if (n.getY(probe) < 0) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } geo.computeVertexNormals(); }
    return geo;
  };
  // One crown, baked into arch space
  function toothGeo(t){
    const P = ARCH.at(t.c), c = t.cfg, NT = q.nt, NW = q.nw, NC = q.nc, e = 2/c.n;
    const pos = [], idx = [];
    const put = (X, y, Z) => pos.push(P.x + P.tx*X + P.nx*Z, y, P.z + P.tz*X + P.nz*Z);
    const ol = th => { const cs = Math.cos(th), sn = Math.sin(th); return [Math.sign(cs)*Math.pow(Math.abs(cs), e), Math.sign(sn)*Math.pow(Math.abs(sn), e)]; };
    const yBot = -3.2;
    for (let r = 0; r <= NW; r++) {
      const v = r/NW, y = yBot + (t.yRim - yBot)*v;
      const sc = (.78 + .22*sstep(-1.5, 1.5, y))*(1 + .05*Math.sin(Math.PI*clamp01(y/t.yRim)));
      const bl = t.b*(1 - c.taper*Math.pow(sstep(t.yRim*.3, t.yRim, y), 1.4));
      for (let j = 0; j < NT; j++) { const o = ol(2*Math.PI*j/NT); put(o[0]*t.a*sc, y, o[1]*bl*sc); }
    }
    for (let k = 1; k < NC; k++) {
      const rho = 1 - k/NC;
      for (let j = 0; j < NT; j++) {
        const o = ol(2*Math.PI*j/NT), X = rho*o[0]*t.a, Z = rho*o[1]*t.bTop;
        put(X, t.yRim + c.edge*Math.sqrt(1 - Math.pow(rho, 4)) + ARCH.cusp(t.type, (X/t.a)*t.side, Z/t.bTop)*(1 - Math.pow(rho, 6)), Z);
      }
    }
    put(0, t.yRim + c.edge + ARCH.cusp(t.type, 0, 0), 0);
    const rows = NW + NC, C = rows*NT;
    for (let r = 0; r < rows - 1; r++) for (let j = 0; j < NT; j++) {
      const a = r*NT + j, b = r*NT + (j + 1)%NT, cc = (r + 1)*NT + j, d = (r + 1)*NT + (j + 1)%NT;
      idx.push(a, cc, b, b, cc, d);
    }
    for (let j = 0; j < NT; j++) idx.push((rows - 1)*NT + j, C, (rows - 1)*NT + (j + 1)%NT);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    return flipIfInward(g, C);
  }
  // Gingiva: a horseshoe band with papillae rising between the crowns
  function gumGeo(){
    const NS = q.ns, NP = q.np, L = ARCH.total, E = 3, yB = -7, pos = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const s = -E + (L + 2*E)*i/NS, sc = Math.max(0, Math.min(L, s)), p = ARCH.at(sc), pr = ARCH.profile(sc), ext = s - sc;
      const px = p.x + p.tx*ext, pz = p.z + p.tz*ext;
      const cap = clamp01(Math.min(s + E, L + E - s)/5), cg = Math.sqrt(cap);
      const halfW = (pr.d/2 + 1.7)*cg;
      const top = yB + (.15 + pr.scallop*.95 - yB)*Math.pow(cap, .4);
      for (let j = 0; j <= NP; j++) {
        const ph = Math.PI*j/NP, cs = Math.cos(ph), sn = Math.sin(ph);
        const lat = Math.sign(cs)*Math.pow(Math.abs(cs), .45), vert = Math.pow(sn, .45);
        const lateral = lat*halfW*(1 - .1*Math.pow(vert, 4));
        pos.push(px + p.nx*lateral, yB + vert*(top - yB), pz + p.nz*lateral);
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) { const a = i*(NP + 1) + j, b = a + NP + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    return flipIfInward(g, Math.floor(NS/2)*(NP + 1) + Math.floor(NP/2));
  }
  function shellGeo(off){
    const NS = q.ss, NV = q.sv, pos = [], idx = [];
    for (let i = 0; i <= NS; i++) for (let j = 0; j <= NV; j++) pos.push(...ARCH.shell(ARCH.total*i/NS, Math.PI*j/NV, off));
    for (let i = 0; i < NS; i++) for (let j = 0; j < NV; j++) { const a = i*(NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    return flipIfInward(g, Math.floor(NS/2)*(NV + 1) + Math.floor(NV/2));
  }
  // CAD-style design mesh: lines along the arch plus a section at every crown
  function designGeo(off){
    const v = [], NS = 220, push = (a, b) => v.push(...a, ...b);
    [.1, .3, .5, .7, .9].forEach(f => { for (let i = 0; i < NS; i++) push(ARCH.shell(ARCH.total*i/NS, Math.PI*f, off), ARCH.shell(ARCH.total*(i + 1)/NS, Math.PI*f, off)); });
    const cuts = []; ARCH.teeth.forEach(t => cuts.push(t.start + .01, t.c)); cuts.push(ARCH.total - .01);
    cuts.forEach(s => { for (let j = 0; j < 24; j++) push(ARCH.shell(s, Math.PI*j/24, off), ARCH.shell(s, Math.PI*(j + 1)/24, off)); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); return g;
  }
  const trimGeo = (phi, off) => { const arr = []; for (let i = 0; i <= q.ss; i++) arr.push(new T.Vector3(...ARCH.shell(ARCH.total*i/q.ss, phi, off))); return new T.BufferGeometry().setFromPoints(arr); };
  return { toothGeo, gumGeo, shellGeo, designGeo, trimGeo };
}

// Adds a moving scan band (blue light along x) to a built-in material
function withScan(mat, U, gain = 1){
  mat.onBeforeCompile = sh => {
    sh.uniforms.uScan = U.scan; sh.uniforms.uScanAmt = U.scanAmt; sh.uniforms.uBlue = { value: U.blue.value.clone().multiplyScalar(gain) };
    sh.vertexShader = 'varying vec3 vArch;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvArch = position;');
    sh.fragmentShader = 'uniform float uScan; uniform float uScanAmt; uniform vec3 uBlue; varying vec3 vArch;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uBlue * uScanAmt * (exp(-pow((vArch.x - uScan) / 0.7, 2.0)) * 1.6 + exp(-pow((vArch.x - uScan) / 4.0, 2.0)) * 0.12);');
  };
  return mat;
}

/* ── Hero: the aligner on its own, as a product shot ── */
function initHero(T){
  const stage = $('#heroStage'), canvas = $('#heroCanvas'), mobile = small();
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch(e){ return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(28, 1, .1, 100);
  const ACC = rawBlue(T), B = buildArch(T, { ss: mobile ? 200 : 320, sv: mobile ? 30 : 46 });

  const uniforms = { uAccent: { value: ACC }, uScan: { value: -40 } };
  const shellMat = new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uAccent; uniform float uScan; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
        float f = pow(1.0 - abs(dot(n, vV)), 2.6);
        vec3 L1 = normalize(vec3(-0.35, 0.85, 0.45)); vec3 L2 = normalize(vec3(0.8, 0.15, 0.3));
        float s1 = pow(max(dot(reflect(-L1, n), vV), 0.0), 70.0);
        float s2 = pow(max(dot(reflect(-L2, n), vV), 0.0), 16.0);
        float band = exp(-pow((vP.x - uScan) / 1.1, 2.0));
        vec3 col = vec3(0.75, 0.88, 1.0) * 0.03 + mix(vec3(0.85, 0.93, 1.0), uAccent, 0.55) * f * 0.8 + vec3(1.0) * s1 * 0.9 + uAccent * s2 * 0.3 + uAccent * band * 0.5;
        float a = clamp(0.08 + f * 0.75 + s1 + band * 0.3, 0.0, 1.0);
        gl_FragColor = vec4(col, a);
      }`
  });
  const model = new T.Group();
  model.add(new T.Mesh(B.shellGeo(.4), shellMat));
  const lineMat = new T.LineBasicMaterial({ color: 0x69d0f8, transparent: true, opacity: .5 });
  model.add(new T.Line(B.trimGeo(.0001, .4), lineMat), new T.Line(B.trimGeo(Math.PI - .0001, .4), lineMat));

  // The crowns inside, drawn as scan points that light up as the band passes
  const NP = mobile ? 3200 : 7000, R = rng(11), pp = new Float32Array(NP*3), pr = new Float32Array(NP);
  for (let i = 0; i < NP; i++) { const qq = ARCH.shell(R()*ARCH.total, R()*Math.PI, -.45); pp.set(qq, i*3); pr[i] = R(); }
  const pgeo = new T.BufferGeometry(); pgeo.setAttribute('position', new T.BufferAttribute(pp, 3)); pgeo.setAttribute('aRand', new T.BufferAttribute(pr, 1));
  const pmat = new T.ShaderMaterial({
    uniforms: { ...uniforms, uPx: { value: (mobile ? 2 : 2.4)*renderer.getPixelRatio() } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: `attribute float aRand; uniform float uScan; uniform float uPx; varying float vA; varying float vB;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        float d = position.x - uScan; vB = exp(-pow(d / 1.6, 2.0));
        vA = (d < 0.0 ? 0.14 + 0.2 * exp(d / 12.0) : 0.0) + vB;
        gl_PointSize = uPx * (0.6 + aRand * 0.6) * (1.0 + vB * 1.4); }`,
    fragmentShader: `uniform vec3 uAccent; varying float vA; varying float vB;
      void main(){ vec2 c = gl_PointCoord - 0.5; if (dot(c,c) > 0.25) discard; gl_FragColor = vec4(mix(vec3(0.82, 0.9, 1.0), uAccent, vB), vA * 0.7); }`
  });
  model.add(new T.Points(pgeo, pmat));
  model.position.set(0, -4, -1);
  const pivot = new T.Group(); pivot.add(model); pivot.scale.setScalar(.05); scene.add(pivot);

  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w/h;
    const dist = (w/h > 1.1 ? 6.4 : 7.4);
    camera.position.set(0, dist*.5, dist*.87); camera.lookAt(0, -.05, 0); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (finePointer) addEventListener('pointermove', e => { ptr.tx = e.clientX/innerWidth*2 - 1; ptr.ty = e.clientY/innerHeight*2 - 1; }, { passive: true });
  const hero = $('.hero');
  let yaw = -.55, t0 = null;
  const SCAN_T = 5.2, HOLD_T = 3.2;
  loop(stage, (dt, t) => {
    if (t0 === null) t0 = t;
    const heroP = clamp01(-hero.getBoundingClientRect().top/(hero.offsetHeight || 1));
    ptr.x += (ptr.tx - ptr.x)*.05; ptr.y += (ptr.ty - ptr.y)*.05;
    if (!reduced) yaw += dt*.1;
    pivot.rotation.y = yaw + ptr.x*.3;
    pivot.rotation.x = ptr.y*.08 + heroP*.5;
    pivot.position.y = heroP*.45;
    const cyc = reduced ? SCAN_T : (t - t0) % (SCAN_T + HOLD_T), sp = Math.min(1, cyc/SCAN_T);
    uniforms.uScan.value = -32 + sp*64 + (sp >= 1 ? 40 : 0);
    renderer.render(scene, camera);
    return !reduced;
  });
  requestAnimationFrame(() => stage.classList.add('ready'));
}

/* ── Process: interactive lower arch that follows the six steps ── */
function initArch(T){
  const fig = $('#wfFig'), host = $('#archStage'), canvas = $('#archCanvas'), mobile = small();
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch(e){ return; }
  const hi = !mobile && (navigator.hardwareConcurrency || 4) > 4;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  if (hi) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; }
  const scene = new T.Scene(); scene.environment = studioEnv(T, renderer);
  const camera = new T.PerspectiveCamera(30, 1, .1, 100);

  const q = mobile ? { nt: 32, nw: 8, nc: 10, ns: 200, np: 22, ss: 200, sv: 30 } : { nt: 48, nw: 12, nc: 16, ns: 320, np: 30, ss: 320, sv: 44 };
  const B = buildArch(T, q);
  const U = { scan: { value: -60 }, scanAmt: { value: 0 }, blue: { value: new T.Color(0x69d0f8).multiplyScalar(1.2) } };

  const root = new T.Group(); root.scale.setScalar(.05); root.position.y = -.2; scene.add(root);

  // Lights: overhead key with soft shadows, cool fill, blue rim from behind
  const key = new T.DirectionalLight(0xffffff, 2.1); key.position.set(-2.5, 7, 4);
  if (hi) { key.castShadow = true; key.shadow.mapSize.set(1024, 1024); const sc = key.shadow.camera; sc.left = sc.bottom = -2.4; sc.right = sc.top = 2.4; sc.near = 1; sc.far = 16; key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4; }
  const rim = new T.DirectionalLight(0x69d0f8, 1.6); rim.position.set(2.5, 1.8, -6);
  scene.add(key, rim, new T.HemisphereLight(0xdfe9f2, 0x06080a, .35));

  const gumMat = withScan(new T.MeshPhysicalMaterial({ color: 0x4d5760, roughness: .5, clearcoat: .35, clearcoatRoughness: .4, envMapIntensity: .8 }), U, .25);
  const gum = new T.Mesh(B.gumGeo(), gumMat); gum.receiveShadow = true; root.add(gum);

  const toothMat = withScan(new T.MeshPhysicalMaterial({ color: 0xebeae4, roughness: .34, clearcoat: .55, clearcoatRoughness: .22, sheen: .25, sheenColor: new T.Color(0xffffff), sheenRoughness: .6, envMapIntensity: .95 }), U);
  const ghostMat = new T.MeshBasicMaterial({ color: 0x69d0f8, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
  // Starting positions for step 02: [tooth, rotation (deg), buccal offset (mm)]
  const START = { 4: [0, 1.1], 5: [16, -.8], 6: [-11, .9], 7: [13, .7], 8: [-17, -.9], 9: [0, -.7], 10: [9, 0] };
  const teeth = ARCH.teeth.map((t, i) => {
    const geo = B.toothGeo(t), p = ARCH.at(t.c);
    const mesh = new T.Mesh(geo, toothMat); mesh.castShadow = mesh.receiveShadow = true; mesh.position.set(-p.x, 0, -p.z);
    const pv = new T.Group(); pv.position.set(p.x, 0, p.z); pv.add(mesh); root.add(pv);
    let ghost = null;
    if (START[i]) { ghost = new T.Mesh(geo, ghostMat); ghost.scale.setScalar(1.002); root.add(ghost); }
    return { t, p, pv, start: START[i] || [0, 0] };
  });

  const off = mobile ? .45 : .4;
  const alignerMat = hi
    ? withScan(new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: .07, metalness: 0, transmission: 1, thickness: .6, ior: 1.5, attenuationColor: new T.Color(0xcdeefc), attenuationDistance: 2.5, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.5, transparent: true, side: T.DoubleSide }), U)
    : withScan(new T.MeshPhysicalMaterial({ color: 0xdff4fd, roughness: .08, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.8, transparent: true, opacity: .3, depthWrite: false, side: T.DoubleSide }), U);
  const baseOpacity = alignerMat.opacity;
  const aligner = new T.Group(); root.add(aligner);
  const shellMesh = new T.Mesh(B.shellGeo(off), alignerMat); shellMesh.renderOrder = 2; aligner.add(shellMesh);
  const trimMat = new T.LineBasicMaterial({ color: 0xbfe9fb, transparent: true, opacity: .75, depthWrite: false });
  aligner.add(new T.Line(B.trimGeo(.0001, off), trimMat), new T.Line(B.trimGeo(Math.PI - .0001, off), trimMat));
  const wireMat = new T.LineBasicMaterial({ color: 0x69d0f8, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending });
  const wire = new T.LineSegments(B.designGeo(off + .05), wireMat); wire.renderOrder = 3; root.add(wire);

  // Label anchors live inside the objects they name, so they follow every movement
  const anchor = (parent, xyz) => { const o = new T.Object3D(); o.position.set(...xyz); parent.add(o); return o; };
  const gp = ARCH.at(ARCH.total*.1), gpr = ARCH.profile(ARCH.total*.1), gw = gpr.d/2 + 1.6;
  const t10 = teeth[10];
  const anchors = {
    arch: anchor(gum, [gp.x + gp.nx*gw, -1.2, gp.z + gp.nz*gw]),
    teeth: anchor(t10.pv.children[0], ARCH.shell(t10.t.c, Math.PI*.12, -.5)),
    aligner: anchor(aligner, ARCH.shell(ARCH.total*.9, Math.PI*.3, off)),
    design: anchor(wire, ARCH.shell(ARCH.total*.27, Math.PI*.22, off + .05))
  };
  const svgL = host.querySelector('.co-lines'), labels = {};
  $$('#wfFig .co').forEach(el => {
    const g = el.ownerDocument.createElementNS(svgNS, 'g');
    const line = el.ownerDocument.createElementNS(svgNS, 'line');
    const halo = el.ownerDocument.createElementNS(svgNS, 'circle'); halo.setAttribute('class', 'halo'); halo.setAttribute('r', '7');
    const dot = el.ownerDocument.createElementNS(svgNS, 'circle'); dot.setAttribute('class', 'dot'); dot.setAttribute('r', '3');
    g.append(line, halo, dot); svgL.appendChild(g);
    labels[el.dataset.co] = { el, g, line, halo, dot, w: 0, h: 0 };
  });
  document.addEventListener('sa:lang', () => { for (const k in labels) labels[k].w = 0; });
  const SLOT = { arch: 'lb', teeth: 'rm', aligner: 'rt', design: 'lm' };
  const LABELS = [['arch', 'teeth', 'aligner'], ['teeth'], ['design'], ['aligner'], ['aligner'], ['aligner', 'arch']];
  // Camera per step: [elevation, yaw] in degrees. 02 looks straight down, 04 low and to the side.
  const CAM = [[54, -16], [84, 0], [62, 14], [30, 24], [40, -12], [50, -24]];

  let W = 1, H = 1;
  function resize(){
    W = host.clientWidth; H = host.clientHeight; if (!W || !H) return;
    renderer.setSize(W, H, false); camera.aspect = W/H; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();

  // Drag to rotate (horizontal drags on touch, so vertical swipes still scroll the page)
  const view = { el: CAM[0][0], yaw: CAM[0][1], dYaw: 0, dEl: 0, hx: 0, hy: 0, thx: 0, thy: 0 };
  let drag = null, relax = false;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; relax = false; canvas.setPointerCapture(e.pointerId); fig.classList.add('is-grabbing', 'was-dragged'); });
  canvas.addEventListener('pointermove', e => {
    if (finePointer) { const r = host.getBoundingClientRect(); view.thx = (e.clientX - r.left)/r.width*2 - 1; view.thy = (e.clientY - r.top)/r.height*2 - 1; }
    if (!drag) return;
    view.dYaw -= (e.clientX - drag.x)*.35; view.dEl += (e.clientY - drag.y)*.25;
    view.dYaw = Math.max(-150, Math.min(150, view.dYaw)); view.dEl = Math.max(-40, Math.min(30, view.dEl));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const endDrag = () => { drag = null; fig.classList.remove('is-grabbing'); };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { view.thx = view.thy = 0; });
  canvas.addEventListener('dblclick', () => { relax = true; });

  const S = { lift: 14, solid: 1, wire: 0, ghost: 0, plan: 1, scan: 0 };
  const steps = $$('.wf-step');
  let lastStage = -1, t0 = null, scanT0 = 0;
  const v3 = new T.Vector3(), eased = (v, target, k, dt) => v + (target - v)*(1 - Math.exp(-dt*k));
  loop(fig, (dt, t) => {
    if (t0 === null) t0 = t;
    const st = Math.max(0, wfStage);
    if (st !== lastStage) { lastStage = st; relax = true; scanT0 = t; }
    const r = steps[st].getBoundingClientRect(), p = reduced ? 1 : clamp01((innerHeight*.55 - r.top)/(r.height*.9));

    // Targets for this step
    const intro = reduced ? 0 : 14*(1 - sstep(0, 1, (t - t0 - .3)/1.8));
    const tg = [
      { lift: intro, solid: 1, wire: 0, ghost: 0, plan: 1, scan: 1 },
      { lift: 0, solid: 0, wire: 0, ghost: 1, plan: sstep(.1, .75, p), scan: 0 },
      { lift: 0, solid: 0, wire: 1, ghost: 0, plan: 1, scan: 0 },
      { lift: 11, solid: 1, wire: 0, ghost: 0, plan: 1, scan: 0 },
      { lift: 11, solid: 1, wire: .45, ghost: 0, plan: 1, scan: 1 },
      { lift: 11*(1 - sstep(.05, .6, p)), solid: 1, wire: 0, ghost: 0, plan: 1, scan: 0 }
    ][st];
    const k = reduced ? 60 : 4.5;
    S.lift = st === 0 ? tg.lift : eased(S.lift, tg.lift, k, dt);
    S.solid = eased(S.solid, tg.solid, k, dt); S.wire = eased(S.wire, tg.wire, k, dt);
    S.ghost = eased(S.ghost, tg.ghost, k, dt); S.plan = eased(S.plan, tg.plan, reduced ? 60 : 7, dt); S.scan = eased(S.scan, tg.scan, k, dt);

    // Scan band: sweeps the arch (01) or the finished aligner (05)
    const per = 4.6, ph = ((t - scanT0) % per)/per;
    U.scan.value = reduced ? -60 : -34 + sstep(0, .75, ph)*68;
    U.scanAmt.value = reduced ? 0 : S.scan*(ph < .8 ? 1 : 1 - (ph - .8)/.2);

    teeth.forEach(o => { const m = 1 - S.plan; o.pv.rotation.y = o.start[0]*m*Math.PI/180; o.pv.position.set(o.p.x + o.p.nx*o.start[1]*m, 0, o.p.z + o.p.nz*o.start[1]*m); });
    ghostMat.opacity = S.ghost*(.1 + .22*(1 - S.plan));
    aligner.position.y = S.lift; aligner.visible = S.solid > .01;
    alignerMat.opacity = baseOpacity*S.solid; trimMat.opacity = .75*S.solid;
    wireMat.opacity = S.wire*.85; wire.visible = S.wire > .01; wire.position.y = st >= 3 ? S.lift : 0;

    // Camera: step preset + slow drift + hover + drag
    if (relax && !drag) { view.dYaw = eased(view.dYaw, 0, 2.5, dt); view.dEl = eased(view.dEl, 0, 2.5, dt); }
    view.hx = eased(view.hx, view.thx, 3, dt); view.hy = eased(view.hy, view.thy, 3, dt);
    const drift = reduced ? 0 : Math.sin((t - t0)*.18)*5;
    view.el = eased(view.el, CAM[st][0], 2.2, dt); view.yaw = eased(view.yaw, CAM[st][1], 2.2, dt);
    const el = Math.max(14, Math.min(88, view.el + view.dEl - view.hy*4))*Math.PI/180;
    const yaw = (view.yaw + view.dYaw + drift + view.hx*6)*Math.PI/180;
    const fitR = 2.15, D = fitR/Math.sin(15*Math.PI/180)*Math.max(1, 1.08/camera.aspect)*(mobile ? 1.02 : .96);
    camera.position.set(D*Math.cos(el)*Math.sin(yaw), D*Math.sin(el) - .2, D*Math.cos(el)*Math.cos(yaw));
    camera.up.set(0, 1, 0); camera.lookAt(0, (st >= 3 ? .1 + S.lift*.012 : -.05) + .12, 0);

    renderer.render(scene, camera);

    // Labels: project each anchor, put the text at the nearer edge, draw a leader to it
    const show = LABELS[st], pad = mobile ? 14 : 22, placed = { l: [], r: [] };
    for (const key in labels) {
      const L = labels[key], on = show.includes(key) && (key !== 'aligner' || S.solid > .5) && (key !== 'design' || S.wire > .5);
      L.el.classList.toggle('on', on); L.g.classList.toggle('on', on);
      if (!on && !L.el.classList.contains('on')) continue;
      if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
      anchors[key].getWorldPosition(v3); v3.project(camera);
      const ax = (v3.x*.5 + .5)*W, ay = (-v3.y*.5 + .5)*H;
      // Each label has a home slot in the empty space around the model: a corner, or the side at the anchor's height
      const slot = SLOT[key], side = slot[0];
      let y = slot[1] === 't' ? (mobile ? 76 : 96) : slot[1] === 'b' ? H - (mobile ? 22 : 34) : Math.max(96, Math.min(H - 34, ay));
      placed[side].forEach(o => { if (Math.abs(o - y) < 30) y = o + (y >= o ? 30 : -30); }); placed[side].push(y);
      const tx = side === 'l' ? pad : W - pad - L.w, lx = side === 'l' ? pad + L.w + 10 : W - pad - L.w - 10;
      L.el.style.transform = `translate3d(${tx.toFixed(1)}px,${(y - L.h/2).toFixed(1)}px,0)`;
      L.line.setAttribute('x1', ax.toFixed(1)); L.line.setAttribute('y1', ay.toFixed(1)); L.line.setAttribute('x2', lx.toFixed(1)); L.line.setAttribute('y2', y.toFixed(1));
      L.dot.setAttribute('cx', ax.toFixed(1)); L.dot.setAttribute('cy', ay.toFixed(1)); L.halo.setAttribute('cx', ax.toFixed(1)); L.halo.setAttribute('cy', ay.toFixed(1));
    }
  });
  requestAnimationFrame(() => fig.classList.add('is-3d'));
}

if (can3D) {
  const start = () => idle(() => loadThree().then(T => { initHero(T); }).catch(() => {}));
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
  const wfObs = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return; wfObs.disconnect();
    loadThree().then(T => initArch(T)).catch(() => {});
  }, { rootMargin: '120% 0px' });
  wfObs.observe($('#wf'));
}

setLang(lang);
})();
