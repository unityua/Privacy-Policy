/* 1in8b personal mod — core. Loaded right after the game bundle, before the other mod files.
 * The bundle is a classic script: its top-level functions/consts are globals we wrap/extend.
 * Text: Ukrainian + English only (T(uk, en)).
 */
window.MOD = (() => {
  "use strict";
  if (typeof S === "undefined" || typeof DEC === "undefined") { console.warn("[mod] game globals not found"); return null; }

  const EN = LANG === "en";
  const T = (uk, en) => (EN ? en : uk);
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp01 = (v) => Math.max(0, Math.min(0.97, v));

  // ---------- state ----------
  const M = () => {
    const m = (S.flags.mod = S.flags.mod || {});
    m.life = m.life || {}; m.off = m.off || {}; m.deeds = m.deeds || []; m.n = m.n || {};
    return m;
  };
  const alive = () => !!S && S.phase === "life" && !S.deathAt;
  const jailed = () => S.job === "prison";
  const cur = () => S.cur;
  const year = () => { try { return calYr(); } catch { return 2026; } };
  const partner = () => (S.fam.partner && S.fam.partner.alive !== false && !S.fam.partner.divorced ? S.fam.partner : null);
  const kidAge = (k) => S.age - (k.bornAt ?? S.age);
  const minorKids = () => (S.fam.kids || []).filter((k) => k.alive !== false && kidAge(k) < 18);
  const inc = (q = 0.5) => { try { return incomeAt(C(), q); } catch { return 1000; } };
  const money = (v, label) => { S.money += v; try { book(label, v); } catch {} };
  const count = (k, d = 1) => (M().n[k] = (M().n[k] || 0) + d);
  const help = () => { try { return SUIC_HELP(); } catch { return T("Якщо вам важко — Lifeline Ukraine 7333 (цілодобово, безкоштовно).", "If you're struggling, reach out to a local crisis line (findahelpline.com)."); } };
  const yrs = (n) => (EN ? `${n} year${n === 1 ? "" : "s"}`
    : `${n} ${n % 10 === 1 && n % 100 !== 11 ? "рік" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "роки" : "років"}`);
  const ctyName = (id = S.cur) => (CBY[id] ? CBY[id].ko : id);
  const policeK = () => { try { return Math.max(0.6, Math.min(1.6, prisonK(C()))); } catch { return 1; } };

  // ---------- bad deeds (shown in the ending) ----------
  // img = key of a 192x60 PNG in /mod/img (drawn into the end cutscene via MO["mod_<img>"]).
  function deed(key, text, img = key) {
    const m = M();
    m.deeds.push({ a: S.age, k: key, img, t: String(text || "").slice(0, 220) });
    count("deed_" + key);
  }

  // ---------- justice ----------
  // Every prison sentence from the mod goes through here (fixes minors staying "at school" in prison).
  function jail(years, why) {
    years = Math.max(1, Math.round(years));
    const minor = S.age < 18;
    if (minor && !["IRN", "SAU", "PRK"].includes(cur())) years = Math.min(years, 10);
    const life = years >= 40;
    const prevUntil = jailed() ? Math.max(S.age, S.flags.prisonUntil || S.age) : null; // a new sentence while inside adds up
    try { recAdd({ k: "crime", s: "prison", y: years }); } catch {}
    S.school && (S.school = null, S.schoolY = 0);
    S.flags.between = !1;
    let extra = "";
    if (cur() === "PRK" && typeof nkDetain === "function") {
      nkDetain(years, 1);
      extra = T("Вас відправили до табору примусової праці.", "You were sent to a forced-labor camp.");
    } else {
      try { extra = goPrison(years, "crime") || ""; } catch { S.job = "prison"; }
    }
    S.flags.prisonUntil = (prevUntil ?? S.age) + years;
    if (prevUntil != null) S.flags.prisonLen = (S.flags.prisonLen || 0) + years;
    M().n.prison = (M().n.prison || 0) + 1;
    const where = minor ? T("у колонії для неповнолітніх", "in a juvenile detention center") : T("позбавлення волі", "in prison");
    const txt = life ? T("Вирок: довічне ув'язнення.", "Sentence: life in prison.") : T(`Вирок: ${yrs(years)} ${where}.`, `Sentence: ${yrs(years)} ${where}.`);
    deed("prison", (why ? why + " " : "") + txt, cur() === "PRK" ? "c_nkcamp" : "prison");
    return " " + txt + (extra ? " " + String(extra).trim() : "");
  }
  function execute(label) {
    M().executed = 1;
    deed("executed", label, "prison");
    die("hom", label);
    return null;
  }

  // ---------- registries ----------
  const A = {};               // panel/offer options: key -> def
  const GROUPS = { life: [], act: [], fam: [] };
  const EV = {};              // event decisions (voices, world context): key -> def
  const yearHooks = [], birthHooks = [], kidHooks = [], renderHooks = [];
  GROUPS.kid = []; GROUPS.jail = []; GROUPS.front = [];
  function add(key, def, group = "act") { def.group = group; A[key] = def; if (!GROUPS[group].includes(key)) GROUPS[group].push(key); }

  // ---------- circumstances: which options are possible where ----------
  // ctx(): "jail" | "front" | "kid" (<13) | "free". Each option has `where` (contexts it can be chosen in);
  // default by group. Year effects run where `yearIn` (or `where`) allows.
  const onFront = () => !!(M().life.svo || M().life.zsu);
  const ctx = () => (jailed() ? (M().pow ? "pow" : "jail") : onFront() ? "front" : S.serveLeft > 0 ? "army" : S.age < 13 ? "kid" : "free");
  const DEF_WHERE = { life: ["free"], act: ["free"], fam: ["free"], kid: ["kid", "free"], jail: ["jail"], front: ["front"] };
  const whereOf = (a) => a.where || DEF_WHERE[a.group] || ["free"];
  const CTX_WHY = {
    jail: () => T("Недоступно: ви у в'язниці", "Unavailable: you're in prison"),
    front: () => T("Недоступно: ви на фронті", "Unavailable: you're at the front"),
    kid: () => T("Недоступно: ви ще дитина", "Unavailable: you're still a child"),
    army: () => T("Недоступно: ви на строковій службі", "Unavailable: you're doing military service"),
    pow: () => T("Недоступно: ви у полоні", "Unavailable: you're a prisoner of war"),
    free: () => T("Недоступно зараз", "Unavailable right now"),
  };
  // Requirements: def.need = ["home", "docs", ...]. Each check says why an action is impossible right now.
  // Other modules add their own (laws.js: "net", "taliban").
  const REQ = {
    adult: { ok: () => S.age >= 18, why: () => T("Недоступно: лише з 18 років", "Unavailable: 18+ only") },
    able: { ok: () => S.age <= 65, why: () => T("Недоступно: у вашому віці вже ні", "Unavailable: not at your age") },
    home: { ok: () => !M().homeless, why: () => T("Недоступно: у вас немає житла", "Unavailable: you have no home") },
    docs: { ok: () => !M().fugitive, why: () => T("Недоступно: ви в розшуку й живете без документів", "Unavailable: you're wanted and have no papers") },
    fit: { ok: () => !(S.dis && (S.dis.k === "move" || S.dis.k === "sight" || S.dis.wc)) && (S.st.hl ?? 50) >= 25, why: () => T("Недоступно: за станом здоров'я", "Unavailable: your health won't allow it") },
    money: { ok: () => S.money > -inc(0.5) * 3, why: () => T("Недоступно: вам уже ніхто не позичає", "Unavailable: nobody will lend you money anymore") },
    school: { ok: () => !!S.school, why: () => T("Недоступно: ви не ходите до школи", "Unavailable: you don't go to school") },
    kidsHome: { ok: () => minorKids().some((k) => !k.away), why: () => T("Недоступно: діти не живуть з вами", "Unavailable: the children don't live with you") },
  };
  function blocked(k) {
    const a = A[k]; if (!a) return "?";
    const c = ctx();
    if (!whereOf(a).includes(c)) return CTX_WHY[c]();
    for (const t of a.need || []) { const r = REQ[t]; if (r && !r.ok()) return r.why(); }
    return null;
  }
  // Images (192x60 PNGs in /mod/img) known to exist — used in decision pop-ups and the ending.
  const IMGS = new Set(("drugs alco prost cheat murder maniac casino schiz svo beatkids beatpartner theft drugden prison orphanage stream congenital teenpreg " +
    "d_can d_ihd d_od d_cir d_str d_inj d_hiv d_road d_lri d_tb d_fall d_hom d_oinf d_copd d_dia d_kid d_drown d_fire d_ocd d_war d_suic d_exec " +
    "k_bully k_steal k_fire k_animal k_skip k_smoke k_vandal k_runaway k_fight k_gang p_gang p_fight p_escape p_contraband " +
    "f_desert f_surrender f_loot f_wound f_ptsd c_afwed c_hijab c_draft c_shelter c_nkcamp c_protest c_lgbt c_trans c_collectors c_psych c_homeless c_mob c_social c_rehab").split(" "));
  function addEvent(key, def) { EV[key] = def; }
  function fire(key, p = {}, at) {
    // queue an event decision later this year (or show now if at === "now")
    if (!alive()) return;
    if (at === "now") { if (!S.pending) openDecision("mod_ev", Object.assign({ k: key }, p)); return; }
    queue(at ?? 0.2 + Math.random() * 0.7, "dec", "mod_ev", Object.assign({ k: key }, p));
  }

  const res = (r) => (r == null || r === !1 ? r : typeof r === "string" ? { t: r, k: "big" } : r);

  // Generic option decision (panel button or yearly offer).
  DEC.mod_act = {
    ok: (p) => !!(p && A[p.k] && alive() && !blocked(p.k) && ((A[p.k].on && A[p.k].on()) || A[p.k].ok())),
    build: (p) => {
      const a = A[p.k], on = !!(a.on && a.on());
      if (a.view) return Object.assign({ title: a.name }, a.view(on, p));
      if (on && a.stop) return { title: a.name, body: a.onBody ? a.onBody() : "", choices: [
        { k: "stop", label: a.stopLabel ? a.stopLabel() : T("Зупинитися", "Stop"), sub: a.stopSub || "" },
        { k: "no", label: T("Залишити як є", "Keep going"), sub: "" }] };
      return { title: a.name, body: typeof a.ask === "function" ? a.ask() : a.ask, fact: a.fact ? a.fact() : null,
        choices: [{ k: "yes", label: a.yes || T("Так", "Yes"), sub: a.yesSub ? a.yesSub() : "" }, { k: "no", label: a.no || T("Ні", "No"), sub: "" }] };
    },
    apply: (k, p) => {
      const a = A[p.k];
      M().off[p.k] = S.age;
      let r;
      if (a.act) r = a.act(k, p);
      else if (k === "stop") r = a.stop();
      else if (k === "yes") r = a.start();
      else r = a.noDo ? a.noDo() : !1;
      return res(r);
    },
  };
  DEC.mod_ev = {
    ok: (p) => !!(p && EV[p.k] && alive() && (EV[p.k].where || ["free", "kid"]).includes(ctx()) && (EV[p.k].need || []).every((t) => !REQ[t] || REQ[t].ok()) && (!EV[p.k].ok || EV[p.k].ok(p))),
    build: (p) => EV[p.k].view(p),
    apply: (k, p) => res(EV[p.k].act(k, p)),
  };

  // Auto / quiet mode must never choose harmful mod options for the player.
  const origAuto = autoChoice;
  autoChoice = function (pd) {
    if (pd && pd.id === "mod_act") return pd.view.choices.some((c) => c.k === "no") ? "no" : pd.view.choices[pd.view.choices.length - 1].k;
    if (pd && pd.id === "mod_ev") { const d = EV[pd.p && pd.p.k]; const k = d && d.auto; return k && pd.view.choices.some((c) => c.k === k) ? k : pd.view.choices[pd.view.choices.length - 1].k; }
    return origAuto.apply(this, arguments);
  };

  // ---------- yearly loop ----------
  const origPlanYear = planYear;
  planYear = function () {
    const r = origPlanYear.apply(this, arguments);
    try { modYear(); } catch (e) { console.error("[mod] year", e); }
    return r;
  };
  function modYear() {
    if (!alive() || S.isComp) return;
    for (const h of yearHooks) { try { h(); } catch (e) { console.error("[mod] hook", e); } if (!alive()) return; }
    const c = ctx();
    // Lifestyles that can't go on behind bars / at the front end by themselves.
    if (c === "jail" || c === "front") for (const k of Object.keys(M().life)) {
      const a = A[k];
      if (!a || !a.endIn || !a.endIn.includes(c)) continue;
      delete M().life[k];
      log(c === "jail" ? T(`Через ув'язнення: ${a.name.toLowerCase()} — у минулому.`, `Because of prison: ${a.name.toLowerCase()} is in the past.`)
        : T(`Через фронт: ${a.name.toLowerCase()} — у минулому.`, `Because of the front: ${a.name.toLowerCase()} is in the past.`), "ev");
    }
    for (const k of Object.keys(A)) {
      const a = A[k];
      if (a.year && a.on && a.on() && (a.yearIn || whereOf(a)).includes(ctx())) { try { a.year(); } catch (e) { console.error("[mod]", k, e); } if (!alive()) return; }
    }
    // Offer one option per year to every player (all options reach everyone over a lifetime).
    if (S.age < 5 || !chance(S.age < 13 ? 0.4 : 0.5)) return;
    const m = M(), dark = m.dark || 0;
    const CRIME = new Set(["murder", "maniac", "theft", "beatkids", "beatpartner", "drugden", "drugs", "k_gang", "k_steal", "k_fire", "k_animal"]);
    const pool = [];
    for (const k of Object.keys(A)) {
      const a = A[k];
      if (a.noOffer || blocked(k) || !a.ok() || (a.on && a.on()) || (m.off[k] != null && S.age - m.off[k] < (a.group === "kid" || a.group === "jail" || a.group === "front" ? 2 : 4))) continue;
      // a dark past makes crime come knocking more often; prison/front choices come up more there
      const w = (CRIME.has(k) ? 1 + dark * 0.5 : 1) * (a.group === c ? 3 : 1) * (a.weight ? a.weight() : 1);
      pool.push([k, w]);
    }
    if (!pool.length) return;
    let r = Math.random() * pool.reduce((s, [, w]) => s + w, 0), k = pool[0][0];
    for (const [kk, w] of pool) { if ((r -= w) <= 0) { k = kk; break; } }
    queue(0.5 + Math.random() * 0.35, "dec", "mod_act", { k, offer: 1 });
  }

  // ---------- pictures in decision pop-ups ----------
  const imgFor = (pd) => {
    if (!pd || !pd.p) return null;
    const d = pd.id === "mod_act" ? A[pd.p.k] : pd.id === "mod_ev" ? EV[pd.p.k] : null;
    if (!d) return null;
    let i = typeof d.img === "function" ? d.img(pd.p) : d.img !== undefined ? d.img : pd.p.k;
    return i && IMGS.has(i) ? i : null;
  };
  const origShowDecision = showDecision;
  showDecision = function (pd) {
    const r = origShowDecision.apply(this, arguments);
    try {
      const i = imgFor(pd), bd = document.querySelector("#modal .bd");
      if (i && bd && !bd.querySelector(".mod-dec-img")) bd.insertAdjacentHTML("afterbegin", `<img class="mod-dec-img" src="/mod/img/${i}.png" alt="" onerror="this.remove()">`);
    } catch {}
    return r;
  };

  // ---------- birth & children hooks ----------
  const origNewLife = newLife;
  newLife = function () {
    const r = origNewLife.apply(this, arguments);
    try { if (S && !S.isComp) birthHooks.forEach((h) => h()); } catch (e) { console.error("[mod] birth", e); }
    return r;
  };
  const origHaveKid = haveKid;
  haveKid = function () {
    const before = new Set(S.fam.kids);
    const r = origHaveKid.apply(this, arguments);
    try { if (!S.isComp) S.fam.kids.filter((k) => !before.has(k) && k.alive !== false).forEach((k) => kidHooks.forEach((h) => h(k))); } catch (e) { console.error("[mod] kid", e); }
    return r;
  };

  // ---------- birth country picker (Russia & North Korea first) ----------
  const CTRY_KEY = "one8b.mod.country";
  const origChooseCountry = chooseCountry;
  chooseCountry = function (e, a) {
    let id = null;
    try { id = localStorage.getItem(CTRY_KEY); } catch {}
    return id && CBY[id] ? CBY[id] : origChooseCountry(e, a);
  };
  function injectCountryPicker() {
    const home = document.getElementById("homeSel");
    if (!home || document.getElementById("modCountry")) return;
    const first = ["RUS", "PRK"].filter((id) => CBY[id]);
    const rest = COUNTRIES.map((c) => c.id).filter((id) => !first.includes(id))
      .sort((a, b) => String(CBY[a].ko).localeCompare(String(CBY[b].ko), EN ? "en" : "uk"));
    let saved = null;
    try { saved = localStorage.getItem(CTRY_KEY); } catch {}
    const opt = (id) => `<option value="${id}"${id === saved ? " selected" : ""}>${esc(CBY[id].ko)}</option>`;
    const box = document.createElement("div");
    box.className = "optgroup mod-opt";
    box.innerHTML = `<span class="lbl">${T("Країна народження (мод)", "Country of birth (mod)")}</span>` +
      `<select id="modCountry" class="sel"><option value="">${T("Випадково — як у реальній статистиці", "Random — by real statistics")}</option>` +
      first.map(opt).join("") + `<option disabled>──────────</option>` + rest.map(opt).join("") + `</select>` +
      `<span class="hint">${T("Оберіть країну самостійно або залиште випадковий вибір.", "Pick the country yourself or keep it random.")}</span>`;
    home.closest(".optgroup").after(box);
    box.querySelector("select").addEventListener("change", (ev) => {
      try { ev.target.value ? localStorage.setItem(CTRY_KEY, ev.target.value) : localStorage.removeItem(CTRY_KEY); } catch {}
    });
  }

  // ---------- panel ----------
  const GROUP_T = { life: T("Спосіб життя", "Lifestyle"), act: T("Вибори", "Choices"), fam: T("Сім'я", "Family"),
    kid: T("Дитячі витівки", "Childhood mischief"), jail: T("Життя у в'язниці", "Life in prison"), front: T("На фронті", "At the front") };
  const CTX_NOTE = { jail: () => T("Ви у в'язниці: більшість виборів недоступні.", "You're in prison: most choices are unavailable."),
    army: () => T("Ви на строковій службі: казарма, статут, звичне життя на паузі.", "You're doing military service: barracks, rules, normal life on hold."), pow: () => T("Ви у таборі для військовополонених.", "You're in a prisoner-of-war camp."), front: () => T("Ви на фронті: звичне життя на паузі.", "You're at the front: normal life is on hold."), kid: () => T("Ви ще дитина: доступні лише дитячі вибори.", "You're still a child: only childhood choices are available."), free: () => "" };
  function panelHTML() {
    const btn = (k) => {
      const a = A[k], on = !!(a.on && a.on());
      if (a.hideOff && !on) return "";
      const why = blocked(k);
      const ok = !why && (on ? !!(a.stop || a.view || a.act) : a.ok());
      const tip = why || (a.hint ? a.hint() : "");
      return `<button type="button" data-mod="${k}" aria-pressed="${on}"${ok ? "" : " disabled"} title="${esc(tip)}">${esc(a.name)}</button>`;
    };
    const c = ctx();
    let h = `<h3 aria-level="2"><span>${GROUP_T.life}</span><span class="lbl">${T("мод", "mod")}</span></h3>`;
    if (CTX_NOTE[c]()) h += `<div class="mod-ctx">${CTX_NOTE[c]()}</div>`;
    // the group for where you are now comes first; groups for other circumstances stay hidden
    const order = { jail: ["jail", "life", "act", "fam"], front: ["front", "life", "act", "fam"], kid: ["kid", "life", "act", "fam"], pow: ["life", "act"], army: ["life", "act", "fam"], free: ["life", "act", "fam", "kid"] }[c];
    let first = true;
    for (const g of order) {
      const keys = GROUPS[g].filter((k) => g !== "kid" || A[k].ok() || (A[k].on && A[k].on()));
      if (!keys.length) continue;
      const html = keys.map(btn).join("");
      if (!html) continue;
      if (!first || g !== "life") h += `<div class="lbl mod-sub">${GROUP_T[g]}</div>`;
      h += `<div class="chips mod-chips${g === c ? " mod-here" : ""}">${html}</div>`;
      first = false;
    }
    const states = [M().homeless && T("Ви живете на вулиці.", "You're living on the street."), M().fugitive && T("Ви в розшуку.", "You're a wanted fugitive.")].filter(Boolean);
    if (states.length) h = h.replace("</h3>", "</h3><div class=\"mod-ctx\">" + states.join(" ") + "</div>");
    const st = renderHooks.map((f) => { try { return f(); } catch { return ""; } }).filter(Boolean);
    if (st.length) h += `<div class="mod-status">${st.join("<br>")}</div>`;
    return h;
  }
  let lastSig = "";
  function renderMod() {
    const focus = document.querySelector(".panel.p-focus");
    if (!focus || !S || S.phase !== "life") return;
    let el = document.getElementById("modPanel");
    if (!el) {
      el = document.createElement("div");
      el.id = "modPanel"; el.className = "panel p-mod";
      focus.after(el);
      el.addEventListener("click", (ev) => {
        const b = ev.target.closest("button[data-mod]");
        if (!b || b.disabled) return;
        if (S.pending) return toast(T("Спочатку завершіть поточне рішення.", "Finish the current decision first."), 2500);
        openDecision("mod_act", { k: b.dataset.mod });
        if (!S.pending) toast(T("Зараз це недоступно.", "Not available right now."), 2500);
        lastSig = "";
      });
    }
    const sig = [S.age, S.job, S.sex, S.money > 0, !!partner(), minorKids().length, JSON.stringify(M().life), !!M().homeless, !!M().fugitive, S.serveLeft > 0, !!S.school, (S.st.hl | 0) >= 25, !!S.drug, !!S.alc, M().deeds.length, M().dark || 0, ctx()].join("|");
    if (sig !== lastSig) { lastSig = sig; el.innerHTML = panelHTML(); }
  }
  const origRenderAll = renderAll;
  renderAll = function () {
    const r = origRenderAll.apply(this, arguments);
    try { renderMod(); } catch (e) { console.error("[mod] panel", e); }
    return r;
  };

  // ---------- languages: keep only English + Ukrainian ----------
  const KEEP_LANGS = ["en", "uk"];
  try { LANGS.splice(0, LANGS.length, ...LANGS.filter((l) => KEEP_LANGS.includes(l))); } catch {}
  const LANG_RE = /^(?:https?:\/\/1in8b\.life)?\/([a-z]{2}(?:-hans)?)\/(?:$|[?#])/;
  function pruneLangs(root) {
    (root.querySelectorAll ? root : document).querySelectorAll("a[href], link[hreflang]").forEach((a) => {
      const m = (a.getAttribute("href") || "").match(LANG_RE);
      if (m && !KEEP_LANGS.includes(m[1])) a.remove();
    });
  }

  function boot() {
    pruneLangs(document);
    injectCountryPicker();
    new MutationObserver((list) => {
      for (const r of list) for (const n of r.addedNodes) if (n.nodeType === 1) pruneLangs(n);
      injectCountryPicker();
    }).observe(document.body, { childList: true, subtree: true });
    try { renderMod(); } catch {}
    console.log("[mod] loaded:", Object.keys(A).length, "options,", Object.keys(EV).length, "events");
  }

  return {
    EN, T, rand, pickOne, clamp01, M, alive, jailed, cur, year, partner, kidAge, minorKids, inc, money, count, help, yrs, ctyName, policeK,
    deed, jail, execute, A, EV, add, addEvent, fire, yearHooks, birthHooks, kidHooks, renderHooks, ctx, onFront, blocked, IMGS, REQ,
    dark: (n = 1) => (M().dark = (M().dark || 0) + n),
    boot: () => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot()),
    refresh: () => { lastSig = ""; },
  };
})();
