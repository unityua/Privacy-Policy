/* 1in8b mod — congenital conditions for the player and their children; age-gap relationships. */
(() => {
  "use strict";
  const X = window.MOD; if (!X || !X.LAW) return;
  const { T, rand, pickOne, M, cur, partner, kidAge, minorKids, inc, money, LAW } = X;

  // k: key, p: base probability at birth, sev: yearly health drain untreated, die: yearly death risk untreated (poor care)
  const CONDS = {
    down: { name: T("синдром Дауна", "Down syndrome"), p: 0.0012, sm: -25, hl: -1, die: 0.004, note: T("Ви вчилися повільніше за інших, але були найлагіднішою дитиною в класі.", "You learned more slowly than others, but were the gentlest child in class.") },
    cp: { name: T("ДЦП (дитячий церебральний параліч)", "cerebral palsy"), p: 0.002, hl: -2, move: 1, die: 0.002 },
    heart: { name: T("вроджена вада серця", "a congenital heart defect"), p: 0.006, hl: -3, die: 0.03, fix: 1.2 },
    cleft: { name: T("розщілина губи й піднебіння", "a cleft lip and palate"), p: 0.0015, hl: -1, so: -3, fix: 0.4 },
    spina: { name: T("спина біфіда", "spina bifida"), p: 0.0007, hl: -2, move: 1, die: 0.01 },
    cf: { name: T("муковісцидоз", "cystic fibrosis"), p: 0.0004, hl: -4, die: 0.04 },
    deaf: { name: T("вроджена глухота", "congenital deafness"), p: 0.001, dis: "hear" },
    blind: { name: T("вроджена сліпота", "congenital blindness"), p: 0.0004, dis: "sight" },
    fas: { name: T("фетальний алкогольний синдром", "fetal alcohol syndrome"), p: 0, sm: -15, so: -3, hl: -1 },
    nas: { name: T("неонатальний абстинентний синдром", "neonatal abstinence syndrome"), p: 0, hl: -3, die: 0.02, oneoff: 1 },
  };
  const poorK = () => { try { const c = C(); return c.ppp < 5000 ? 1.8 : c.ppp < 20000 ? 1.3 : 1; } catch { return 1; } };
  const momAgeK = (a) => (a >= 40 ? 8 : a >= 35 ? 3 : 1);

  function roll(momAge, momAlc, momDrug) {
    if (momAlc && chance(0.3)) return "fas";
    if (momDrug && chance(0.5)) return "nas";
    for (const [k, c] of Object.entries(CONDS)) {
      if (!c.p) continue;
      const p = c.p * poorK() * (k === "down" ? momAgeK(momAge) : 1) * 1.5; // a bit above real-world so it shows up
      if (chance(p)) return k;
    }
    return null;
  }

  // ---- the player born with a condition ----
  X.birthHooks.push(() => {
    let momAge = 28; try { momAge = S.fam.mom.age; } catch {}
    const k = roll(momAge, false, false);
    if (!k) return;
    applyCond(S, k, true);
  });
  function applyCond(who, k, isMe) {
    const c = CONDS[k];
    if (isMe) {
      M().cong = { k, at: 0, fixed: 0 };
      if (c.dis) { S.dis = { k: c.dis, at: 0, src: "birth", aid: 0, wc: 0, told: 0, tellAt: 1 }; }
      if (c.move) { S.dis = S.dis || { k: "move", at: 0, src: "birth", aid: 0, wc: chance(0.5) ? 1 : 0, told: 1, tellAt: 1 }; }
      if (c.sm) eff({ sm: c.sm });
      log(T(`Ви народилися з діагнозом: ${c.name}.`, `You were born with ${c.name}.`), "big");
      X.deed("congenital", T(`Народилися з діагнозом: ${c.name}.`, `Born with ${c.name}.`), "congenital");
    } else {
      who.modCong = { k, fixed: 0 };
      eff({ h: -8 });
      let t = T(`У дитини ${nmK(who)} діагностували: ${c.name}.`, `Your child ${nmK(who)} was diagnosed with ${c.name}.`);
      if (k === "fas") t += " " + T("Лікарі прямо сказали: через алкоголь під час вагітності.", "The doctors said it plainly: because of drinking during pregnancy.");
      if (k === "nas") t += " " + T("Немовля тижнями кричало від ломки в реанімації.", "The newborn screamed through withdrawal for weeks in intensive care.");
      log(t, "big");
      X.deed("congenital", t, "congenital");
      if (minorKids().length) queue(0.6, "dec", "mod_ev", { k: "cong_kid", i: S.fam.kids.indexOf(who) });
    }
  }
  const nmK = (k) => { try { return callName(k.name); } catch { return "?"; } };

  // ---- children ----
  X.kidHooks.push((kid) => {
    const p = partner();
    const momIsMe = S.sex === "F";
    const momAge = momIsMe ? S.age : p && p.sex === "F" ? p.age : S.age;
    const k = roll(momAge, momIsMe && !!S.alc, momIsMe && !!S.drug);
    if (k) applyCond(kid, k, false);
  });

  X.addEvent("cong_kid", { img: "congenital",
    ok: (p) => !!S.fam.kids[p.i] && !!S.fam.kids[p.i].modCong,
    view: (p) => {
      const kid = S.fam.kids[p.i], c = CONDS[kid.modCong.k];
      const cost = inc(0.5) * (c.fix || 0.5) * (cur() === "USA" ? 3 : LAW.rich() ? 0.3 : 1);
      p.cost = cost;
      return { title: T("Що робити далі?", "What now?"), body: T(`Діагноз ${nmK(kid)}: ${c.name}. Лікування коштуватиме близько ${wonStr(cost)}.`, `${nmK(kid)}'s diagnosis: ${c.name}. Treatment will cost about ${wonStr(cost)}.`),
        choices: [{ k: "treat", label: T("Лікувати за будь-яку ціну", "Treat at any cost"), sub: wonStr(cost) },
          { k: "home", label: T("Доглядати вдома", "Care for them at home"), sub: T("Без дорогого лікування", "Without costly treatment") },
          { k: "orph", label: T("Відмовитися від дитини", "Give the child up"), sub: T("Спеціалізований інтернат", "A specialized institution") }] };
    },
    auto: "home",
    act: (k, p) => {
      const kid = S.fam.kids[p.i]; if (!kid) return !1;
      if (k === "treat") { money(-p.cost, T("Лікування дитини", "Child's treatment")); kid.modCong.fixed = 1; eff({ h: -2 }); return T("Ви взяли кредит і оплатили лікування. Шанси дитини стали значно кращими.", "You took a loan and paid for treatment. Your child's odds got much better."); }
      if (k === "orph") {
        const n = nmK(kid);
        try { dropKid(p.i); } catch {} (S.fam.given = S.fam.given || []).push({ name: kid.name, sex: kid.sex, bornAt: kid.bornAt, at: S.age, mod: "orphanage" });
        (M().gone = M().gone || []).push({ name: kid.name, bornAt: kid.bornAt, at: S.age, how: "orphanage" });
        eff({ h: -12, so: -8 }); X.deed("orphanage", T(`Відмовилися від хворої дитини (${n}).`, `Gave up your sick child (${n}).`));
        return { t: T(`Ви підписали відмову від ${n} просто в пологовому.`, `You signed away ${n} right in the maternity ward.`), k: "bad" };
      }
      eff({ h: -4, so: -2 }); money(-inc(0.5) * 0.1, T("Догляд", "Care"));
      return T("Ви доглядали дитину вдома, як могли.", "You cared for the child at home as best you could.");
    },
  });

  // ---- yearly effects ----
  X.yearHooks.push(() => {
    const m = M().cong;
    if (m) {
      const c = CONDS[m.k];
      if (c.hl) eff({ hl: c.hl * (m.fixed ? 0.3 : 1) });
      if (c.so && !m.fixed) eff({ so: c.so * 0.3 });
      const care = LAW.rich() || m.fixed ? 0.2 : 1;
      if (c.die && S.age > 0 && chance(c.die * care)) { log(T(`Ускладнення, пов'язані з діагнозом (${c.name}), виявилися смертельними.`, `Complications of ${c.name} proved fatal.`), "bad"); die(m.k === "cf" ? "lri" : "ocd"); return; }
      if (c.fix && !m.fixed && S.age >= 1 && S.age <= 18 && chance(LAW.rich() ? 0.6 : 0.12)) { m.fixed = 1; log(T("Вам зробили операцію. Стало значно краще.", "You had surgery. Things got much better."), "good"); }
      if (S.age >= 6 && S.age <= 17 && !m.bully && chance(0.2) && ["down", "cp", "cleft", "fas"].includes(m.k)) { m.bully = 1; eff({ h: -8, so: -6 }); log(T("У школі з вас знущалися через вашу хворобу.", "You were bullied at school because of your condition."), "bad"); }
    }
    for (const kid of S.fam.kids) {
      if (!kid.modCong || kid.alive === false) continue;
      const c = CONDS[kid.modCong.k];
      if (kidAge(kid) < 18) { money(-inc(0.5) * 0.05, T("Догляд за дитиною з інвалідністю", "Care for a disabled child")); eff({ h: -1 }); }
      const care = LAW.rich() || kid.modCong.fixed ? 0.2 : 1;
      if (c.die && chance(c.die * care)) { kid.alive = false; kid.diedAt = S.age; eff({ h: -25, so: -5 }); log(T(`Ваша дитина ${nmK(kid)} померла через ускладнення (${c.name}).`, `Your child ${nmK(kid)} died of complications (${c.name}).`), "loss"); }
    }
  });

  // ---- big age-gap relationship (adults only, 18+) ----
  X.add("agegap", {
    name: T("Стосунки з великою різницею у віці", "Big age-gap relationship"), ok: () => S.age >= 35 && !partner(), img: null, need: ["home"],
    ask: () => T("Вам симпатизує доросла людина, молодша за вас більш ніж на 15 років (18–21 рік).", "An adult more than 15 years younger than you (18–21) is into you."),
    start: () => {
      const age = rand(18, 21);
      M().agegap = { at: S.age, age };
      X.deed("agegap", T(`Зустрічалися з ${age}-річною людиною у ${S.age}.`, `Dated a ${age}-year-old at ${S.age}.`), "cheat");
      eff({ h: 6, so: -10 });
      let t = T(`Ви почали зустрічатися з ${age}-річною людиною.`, `You started dating a ${age}-year-old.`);
      const r = Math.random();
      t += " " + (r < 0.4 ? T("Друзі за спиною називають вас «кризою середнього віку».", "Friends call it your “midlife crisis” behind your back.") : r < 0.75 ? (eff({ so: -6 }), T("Ваші дорослі діти й батьки перестали з вами говорити.", "Your adult kids and parents stopped speaking to you.")) : (eff({ so: -8 }), T("Хтось виклав ваші фото в соцмережі. Коментарі були жорстокими.", "Someone posted your photos online. The comments were brutal.")));
      if (LAW.adultery.has(cur()) && !S.fam.married && chance(0.3)) t += " " + T("Стосунки поза шлюбом тут — злочин.", "Relationships outside marriage are a crime here.") + X.jail(rand(1, 3));
      return { t, k: "big" };
    },
  }, "act");
})();
