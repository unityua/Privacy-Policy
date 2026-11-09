/* 1in8b mod — bad deeds in the end-of-life cutscene, with pixel-art frames from /mod/img/*.png.
 * The cutscene draws each frame with pxScene(m) -> pxMoment -> MO[act]. We register MO["mod_<img>"]
 * that copies a 192x60 PNG into the frame, and add deed frames in endFrames(). Load this file last.
 */
(() => {
  "use strict";
  const X = window.MOD; if (!X) return;
  const { T, M } = X;

  const IMGS = [...X.IMGS];
  const PIX = {}; // key -> array of [r,g,b] | null, PX.W*PX.H

  function load(key) {
    const img = new Image();
    img.onload = () => {
      try {
        const w = PX.W, h = PX.H, c = document.createElement("canvas");
        c.width = w; c.height = h;
        const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data, out = new Array(w * h);
        for (let i = 0; i < w * h; i++) out[i] = d[i * 4 + 3] > 0 ? [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]] : null;
        PIX[key] = out;
      } catch (e) { console.warn("[mod] img", key, e); }
    };
    img.onerror = () => {}; // not drawn yet: the frame falls back to a dark night scene
    img.src = "/mod/img/" + key + ".png?v=2";
  }
  IMGS.forEach(load);

  // Fallback while an image is missing: a dark night frame.
  function fallback(r) {
    const P = r.P;
    for (let y = 0; y < PX.H; y++) for (let x = 0; x < PX.W; x++) r.sky.px(x, y, y < PX.G ? [43 + y / 3, 51 + y / 3, 80 + y / 4] : P.ol || [59, 64, 70]);
  }
  for (const k of IMGS) {
    MO["mod_" + k] = (r) => {
      const px = PIX[k];
      if (!px) return fallback(r);
      for (let y = 0; y < PX.H; y++) for (let x = 0; x < PX.W; x++) { const c = px[y * PX.W + x]; c && r.sky.px(x, y, c); }
      r.span = [PX.W / 2 - 18, PX.W / 2 + 18];
    };
  }

  // Make sure a mod frame always gets a scene object carrying its act (sceneAt can return null).
  const origSceneFor = sceneFor;
  sceneFor = function (a, act) {
    const s = origSceneFor.apply(this, arguments);
    if (act && String(act).startsWith("mod_")) return Object.assign({ seed: "mod" + a, people: [], stage: "d", mood: "low" }, s || {}, { act });
    return s;
  };

  const ORDER = ["murder", "maniac", "executed", "f_crime", "k_animal", "f_loot", "f_desert", "p_escape", "k_gang", "k_fire", "p_gang", "beatkids", "svo", "drugden", "beatpartner", "orphanage", "stream", "theft", "prison", "prost", "drugs", "alco", "casino", "cheat", "agegap", "schiz", "congenital", "teenpreg", "zsu", "k_bully", "k_steal", "p_contraband", "p_fight", "f_surrender", "k_vandal", "k_runaway", "k_smoke", "k_fight", "k_skip", "social", "mob", "ptsd", "psych", "homeless"];
  function deedFrames(age) {
    const seen = new Set(), out = [];
    const ds = (M().deeds || []).filter((d) => d.a <= age && d.img && IMGS.includes(d.img));
    ds.sort((a, b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k));
    for (const d of ds) { if (seen.has(d.k)) continue; seen.add(d.k); out.push(d); if (out.length >= 6) break; }
    return out.map((d) => ({ a: Math.max(1, d.a), t: d.t, note: false, act: "mod_" + d.img, mod: 1 }));
  }

  const origEndFrames = endFrames;
  endFrames = function (age) {
    const base = origEndFrames.apply(this, arguments) || [];
    let extra = [];
    try { extra = deedFrames(age); } catch (e) { console.error("[mod] end", e); }
    if (!extra.length) return base;
    const ages = new Set(extra.map((f) => f.a));
    // one frame per age: a bad deed replaces an ordinary memory from the same year
    return base.filter((f) => !ages.has(f.a)).concat(extra).sort((a, b) => a.a - b.a);
  };

  // A line in the epilogue summarising the deeds.
  const origEndingData = endingData;
  endingData = function () {
    const d = origEndingData.apply(this, arguments);
    try {
      const n = (M().n) || {}, parts = [];
      const murders = n.murders || 0;
      if (murders) parts.push(T(`вбивств: ${murders}`, `killings: ${murders}`));
      if (n.prison) parts.push(T(`судимостей: ${n.prison}`, `convictions: ${n.prison}`));
      if (n.beatkids) parts.push(T("насильство над дітьми", "child abuse"));
      if (n.beatpartner) parts.push(T("домашнє насильство", "domestic violence"));
      const gone = (M().gone || []).length; if (gone) parts.push(T(`дітей віддано: ${gone}`, `children given away: ${gone}`));
      if (n.crime_theft) parts.push(T(`крадіжок: ${n.crime_theft}`, `thefts: ${n.crime_theft}`));
      if (d && S.deathAt) {
        const c = S.deathAt.cause, key = M().executed ? "d_exec" : "d_" + c;
        if (X.IMGS.has(key)) d.frames.push({ a: S.deathAt.age, t: c === "suic" ? T("Пам'ятаємо.", "Remembered.") : T("Причина смерті: ", "Cause of death: ") + (S.deathAt.label || c) + ".", note: false, m: sceneFor(S.deathAt.age, "mod_" + key), mod: 1 });
      }
      if (d && parts.length) d.epi = (d.epi || []).concat(T("Темний бік цього життя — ", "The dark side of this life: ") + parts.join(", ") + ".");
    } catch (e) { console.error("[mod] epi", e); }
    return d;
  };

  X.boot();
})();
