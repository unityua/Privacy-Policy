/* 1in8b mod — lifestyles & choices. Uses MOD (core.js) and MOD.LAW/punish (laws.js). */
(() => {
  "use strict";
  const X = window.MOD; if (!X || !X.LAW) return;
  const { T, rand, pickOne, M, cur, partner, kidAge, minorKids, inc, money, deed, jail, LAW, policeK, help } = X;
  const add = X.add, ev = X.addEvent;
  const rich = () => LAW.rich();
  const leavePartner = (why = "viol") => {
    const p = partner(); if (!p) return;
    try { if (S.fam.married) divorceNow(C(), !1, why); else { p.endAt = S.age; S.fam.partner = null; S.fam.dating = null; } }
    catch { S.fam.partner = null; S.fam.married = !1; }
  };
  const giveKid = (k, how) => {
    const i = S.fam.kids.indexOf(k); if (i < 0) return;
    try { dropKid(i); } catch { S.fam.kids.splice(i, 1); }
    (S.fam.given = S.fam.given || []).push({ name: k.name, sex: k.sex, bornAt: k.bornAt, at: S.age, mod: how });
    (M().gone = M().gone || []).push({ name: k.name, bornAt: k.bornAt, at: S.age, how });
  };
  const nm = (k) => { try { return callName(k.name); } catch { return k.name && k.name.full || "?"; } };

  // ===================== LIFESTYLES =====================
  add("drugs", {
    name: T("Наркоманія", "Drug addiction"), ok: () => S.age >= 13, on: () => !!S.drug, where: ["free", "jail", "front", "army"], yearIn: ["free", "front", "army"], img: () => (S.drug ? "c_rehab" : "drugs"),
    ask: T("Знайомі пропонують «спробувати щось сильніше». Кажуть, що один раз нічого не буде.", "Some acquaintances offer you “something stronger”. Just once, they say."),
    fact: () => { try { return DRUG_HELP(); } catch { return null; } },
    start: () => { S.drug = { since: S.age, y: 0 }; S.flags.drugEver = 1; eff({ h: 4, hl: -4 }); deed("drugs", T("Підсіли на наркотики.", "Got hooked on drugs.")); return T("Ви почали вживати наркотики. Спершу здавалося, що все під контролем.", "You started using drugs. At first it felt like you had it under control."); },
    stopLabel: () => T("Лягти на реабілітацію", "Go to rehab"),
    stop: () => chance(rich() ? 0.55 : 0.3)
      ? (S.drug = null, eff({ h: 4, hl: 4 }), T("Ви пройшли реабілітацію й кинули вживати.", "You went through rehab and got clean."))
      : (eff({ h: -5 }), T("Ви втекли з реабілітаційного центру через тиждень і зірвалися.", "You ran away from rehab after a week and relapsed.")),
    year: () => {
      const y = S.age - (S.drug.since ?? S.age);
      const od = 0.015 * (cur() === "USA" ? 3 : cur() === "CAN" ? 2 : ["RUS", "UKR"].includes(cur()) ? 1.5 : 1) * (y > 3 ? 1.5 : 1);
      if (chance(od)) { log(T("Передозування. Друзі злякалися й не викликали швидку.", "An overdose. Your friends panicked and didn't call an ambulance."), "bad"); die("od"); return; }
      if (!M().hiv && chance(["RUS", "UKR", "ZAF", "NGA"].includes(cur()) ? 0.06 : 0.03)) { M().hiv = S.age; log(T("Через спільний шприц ви заразилися ВІЛ.", "You caught HIV from a shared needle."), "bad"); }
      if (chance(0.15)) { eff({ so: -6 }); log(pickOne([T("Ви винесли з дому батьків телевізор, щоб купити дозу.", "You took your parents' TV to buy a fix."), T("Ви позичили гроші в усіх друзів і не віддали.", "You borrowed from every friend and never paid back."), T("Ви три дні не пам'ятаєте.", "You lost three days.")]), "bad"); }
      if (isWorking() && chance(0.15)) { S.job = "seeking"; log(T("Вас звільнили: ви прийшли на роботу під кайфом.", "You were fired for showing up high."), "bad"); }
      if (chance(0.04 * policeK())) log(T("Вас затримали з дозою в кишені.", "You were caught with drugs in your pocket.") + X.punish("drugs", T("Зберігання наркотиків.", "Drug possession.")), "bad");
    },
  }, "life");

  add("alco", {
    name: T("Алкоголізм", "Alcoholism"), ok: () => S.age >= 13, on: () => !!S.alc, where: ["free", "front", "army"], yearIn: ["free", "front", "army"],
    ask: T("Після важкого дня рука знову тягнеться до пляшки. Можна вже не зупинятися.", "After a rough day you reach for the bottle again. You could just stop holding back."),
    start: () => { S.alc = { since: S.age, y: 0 }; eff({ h: 3, hl: -3 }); deed("alco", T("Спилися.", "Drank yourself into alcoholism.")); return T("Випивка стала щоденною звичкою.", "Drinking became a daily habit."); },
    stopLabel: () => T("Кинути пити", "Quit drinking"),
    stop: () => chance(rich() ? 0.5 : 0.35)
      ? (S.alc = null, eff({ h: 3, hl: 5 }), T("Ви кинули пити.", "You quit drinking."))
      : (eff({ h: -3 }), T("Ви трималися кілька тижнів, але знову запили.", "You held out a few weeks, then started drinking again.")),
    year: () => {
      const y = S.age - (S.alc.since ?? S.age);
      if (y >= 8 && chance(0.03 + 0.003 * (y - 8))) { log(T("Печінка не витримала: цироз.", "Your liver gave out: cirrhosis."), "bad"); die("cir"); return; }
      if (LAW.alcBan.has(cur()) && chance(0.2 * policeK())) log(X.punish("alcohol"), "bad");
      if (chance(0.08)) { eff({ hl: -10 }); log(pickOne([T("П'яним ви впали зі сходів і зламали руку.", "Drunk, you fell down the stairs and broke an arm."), T("Ви прокинулися у витверезнику.", "You woke up in a sobering-up cell."), T("П'яна бійка біля магазину закінчилася струсом мозку.", "A drunken fight outside a shop ended in a concussion.")]), "bad"); }
      if (isWorking() && chance(0.12)) { S.job = "seeking"; log(T("Вас звільнили за прогули й запах перегару.", "You were fired for absences and smelling of booze."), "bad"); }
      if (partner() && chance(0.1)) { log(T("Партнер не витримав вашого пияцтва й пішов.", "Your partner couldn't take your drinking and left."), "bad"); leavePartner(); }
      if (partner() && chance(0.08)) queue(0.7, "dec", "mod_act", { k: "beatpartner", offer: 1 });
    },
  }, "life");

  add("prost", {
    name: T("Проституція", "Prostitution"), ok: () => true, need: ["adult", "able"], on: () => !!M().life.prost, endIn: ["jail", "front"], 
    ask: T("Грошей бракує. Вам пропонують «легкий заробіток» із клієнтами.", "Money is tight. Someone offers you “easy money” with clients."),
    fact: () => LAW.prostLegal.has(cur()) ? T("У цій країні секс-робота легальна й регульована.", "Sex work is legal and regulated in this country.") : T("У цій країні секс-робота незаконна.", "Sex work is illegal in this country."),
    start: () => { M().life.prost = S.age; deed("prost", T("Пішли в секс-роботу.", "Went into sex work.")); if (!M().prostOut && chance(0.5)) { M().prostOut = 1; eff({ so: -12 }); return T("Ви почали заробляти секс-роботою. Коли родина дізналася, з вами перестали говорити.", "You started doing sex work. When your family found out, they stopped talking to you."); } return T("Ви почали заробляти секс-роботою.", "You started doing sex work."); },
    stopLabel: () => T("Покинути", "Get out"),
    stop: () => { delete M().life.prost; eff({ h: 3 }); return chance(0.25) ? (eff({ hl: -8 }), T("Сутенер не хотів вас відпускати. Вас побили, але ви вирвалися.", "Your pimp didn't want to let you go. You got beaten, but you got out.")) : T("Ви покинули секс-роботу.", "You left sex work."); },
    year: () => {
      const legal = LAW.prostLegal.has(cur());
      money(inc(0.4) * (legal ? 0.7 : 0.45), T("Секс-робота", "Sex work"));
      eff({ h: -4, hl: -2, so: -3 });
      if (!legal && chance(0.35)) { money(-inc(0.4) * 0.2, T("Сутенер", "Pimp")); }
      if (chance(legal ? 0.03 : 0.1)) { eff({ hl: -15, h: -10 }); log(T("Клієнт напав на вас. Ви кілька тижнів не могли працювати.", "A client attacked you. You couldn't work for weeks."), "bad"); if (chance(0.03)) { die("hom"); return; } }
      if (chance(0.06)) { eff({ hl: -12 }); log(T("Ви підхопили інфекцію, що передається статевим шляхом.", "You caught a sexually transmitted infection."), "bad"); }
      if (!M().hiv && chance(legal ? 0.005 : 0.025)) { M().hiv = S.age; log(T("Аналіз показав ВІЛ.", "A test came back HIV-positive."), "bad"); }
      if (!legal && chance(0.08 * policeK())) { const t = X.punish("prost"); if (X.jailed()) delete M().life.prost; log(t, "bad"); }
    },
  }, "life");

  add("cheat", {
    name: T("Зрада", "Cheating"), ok: () => S.age >= 16 && !!partner(), on: () => !!M().life.cheat, endIn: ["jail", "front"], 
    ask: T("Колега відверто фліртує з вами. Ваш партнер нічого не дізнається… мабуть.", "A coworker is openly flirting with you. Your partner won't find out… probably."),
    start: () => { M().life.cheat = S.age; eff({ h: 4 }); deed("cheat", T("Зраджували партнеру.", "Cheated on your partner.")); return T("Ви завели таємний роман на стороні.", "You started a secret affair."); },
    stopLabel: () => T("Припинити роман", "End the affair"),
    stop: () => { delete M().life.cheat; return T("Ви припинили роман.", "You ended the affair."); },
    year: () => {
      if (!partner()) return void delete M().life.cheat;
      eff({ h: 1, so: -2 }); money(-inc(0.5) * 0.05, T("Подарунки коханцю", "Gifts for the lover"));
      if (!chance(0.3)) return;
      delete M().life.cheat; eff({ h: -12, so: -10 });
      let t = T("Партнер знайшов листування.", "Your partner found the messages.");
      if (chance(0.7)) { t += " " + T("Він/вона пішов/пішла від вас.", "They left you."); leavePartner("aff"); } else t += " " + T("Вас пробачили, але довіри більше не було.", "They forgave you, but the trust was gone.");
      if (minorKids().length) { t += " " + T("Діти почули сварку.", "The kids heard the fight."); minorKids().forEach((k) => (k.bd = (k.bd || 0) - 4)); }
      if (LAW.adultery.has(cur()) && chance(0.5)) t += " " + (X.punish("adultery") || "");
      log(t, "bad");
    },
  }, "life");

  add("murder", {
    name: T("Вбивство", "Murder"), ok: () => S.age >= 12, where: ["free", "jail"],
    ask: T("Конфлікт із людиною, яку ви ненавидите, дійшов до межі. Можна покласти цьому край назавжди.", "The feud with someone you hate has reached its limit. You could end it for good."),
    start: () => {
      eff({ h: -15, so: -10 }); X.count("murders"); M().guilt = (M().guilt || 0) + 1;
      deed("murder", T("Убили людину.", "Killed a person."));
      if (X.caught(0.55, "murder")) return T("Ви вбили людину. Слідство швидко вийшло на вас.", "You killed a person. Investigators quickly traced it to you.") + " " + (X.punish("murder", T("Вбивство.", "Murder.")) || "");
      M().unsolved = (M().unsolved || 0) + 1;
      return T("Ви вбили людину. Вас не знайшли, але провина не відпускає.", "You killed a person. You weren't caught, but the guilt never leaves.");
    },
  }, "life");

  add("maniac", {
    name: T("Стати маніяком", "Serial killer"), ok: () => S.age >= 16, need: ["able"], on: () => !!M().life.maniac, endIn: ["jail", "front"], weight: () => (M().triad ? 4 : 1),
    ask: T("Темні думки, які ви довго гнали від себе, стають усе голоснішими.", "Dark thoughts you've pushed away for years are getting louder."),
    start: () => { M().life.maniac = S.age; eff({ h: -10, so: -8 }); deed("maniac", T("Стали серійним убивцею.", "Became a serial killer.")); return T("Ви стали на шлях серійного вбивці.", "You became a serial killer."); },
    stopLabel: () => T("Зупинитися", "Stop"),
    stop: () => { delete M().life.maniac; eff({ h: 2 }); return T("Ви зупинилися. Але минуле нікуди не зникає.", "You stopped. But the past doesn't go away."); },
    year: () => {
      const k = X.count("murders"); M().unsolved = (M().unsolved || 0) + 1; eff({ h: -4, so: -5 });
      if (chance(X.clamp01((0.08 + 0.04 * k) * policeK()))) { delete M().life.maniac; log(T(`Слідство пов'язало ${k} вбивств і вийшло на вас.`, `Investigators linked ${k} killings and caught you.`) + " " + (X.punish("serial", T("Серійні вбивства.", "Serial murders.")) || ""), "bad"); }
      else log(pickOne([T("Ще одна людина зникла. Поліція досі нікого не підозрює.", "Another person disappeared. The police still have no suspect."), T("Газети пишуть про «маніяка», що тероризує місто.", "Newspapers write about a “maniac” terrorizing the city."), T("Ви ледь не попалися: свідок бачив ваше обличчя.", "You were nearly caught: a witness saw your face.")]), "bad");
    },
  }, "life");

  add("teenpreg", {
    name: T("Рання вагітність", "Teen pregnancy"), ok: () => S.age >= 14 && S.age <= 19 && !M().teenpreg,
    ask: T("Ви з партнером не думаєте про наслідки й не користуєтесь захистом.", "You and your partner don't think about consequences and skip protection."),
    start: () => {
      M().teenpreg = 1;
      deed("teenpreg", S.sex === "F" ? T(`Народили дитину в ${S.age}.`, `Had a baby at ${S.age}.`) : T(`Стали батьком у ${S.age}.`, `Became a father at ${S.age}.`));
      let extra = "";
      if (chance(0.3)) { eff({ so: -10, h: -6 }); extra = " " + T("Батьки вигнали вас із дому.", "Your parents threw you out."); }
      else if (["sa", "mena"].includes(C().p) && !S.fam.married) { S.fam.married = !0; extra = " " + T("Родини терміново влаштували весілля, щоб «не було ганьби».", "The families rushed a wedding to avoid “shame”."); }
      if (S.sex === "F") { teenBirth(); return extra ? { t: extra.trim(), k: "bad" } : null; }
      haveKid(); eff({ h: -5 });
      if (S.school && chance(0.5)) { S.school = null; S.job = "seeking"; extra += " " + T("Ви кинули навчання, щоб заробляти.", "You dropped out to earn money."); }
      return T(`У ${S.age} років ви стали батьком. До цього ви були зовсім не готові.`, `At ${S.age} you became a father. You weren't ready at all.`) + extra;
    },
  }, "life");

  add("casino", {
    name: T("Депи в казік", "Casino deposits"), ok: () => true, need: ["adult", "money"], on: () => !!M().life.casino, endIn: ["jail", "front"], img: () => (S.money < 0 ? "c_collectors" : "casino"),
    ask: () => LAW.gambleBan.has(cur()) ? T("Азартні ігри тут заборонені, але друг дав посилання на підпільне онлайн-казино з бонусом +200%.", "Gambling is banned here, but a friend sent a link to an illegal online casino with a +200% bonus.") : T("Реклама онлайн-казино обіцяє бонус +200% на перший деп.", "An online casino ad promises a +200% first deposit bonus."),
    start: () => { M().life.casino = S.age; S.gamb = S.gamb || { since: S.age, y: 0 }; S.flags.gambEver = 1; deed("casino", T("Програли все в казино.", "Lost everything at the casino.")); return T("Ви зробили перший деп. Виграли — і вже не могли зупинитися.", "You made your first deposit. You won, and couldn't stop."); },
    stopLabel: () => T("Заблокувати себе", "Self-exclude"),
    stop: () => chance(0.5) ? (delete M().life.casino, S.gamb = null, eff({ h: 3 }), T("Ви видалили всі казино й заблокували себе на сайтах.", "You deleted the casino apps and self-excluded.")) : (eff({ h: -3 }), T("Через тиждень ви створили новий акаунт.", "A week later you made a new account.")),
    year: () => {
      const dep = Math.max(inc(0.3) * 0.15, Math.max(0, S.money) * (0.2 + Math.random() * 0.4));
      if (chance(0.05)) { money(dep * 4, T("Виграш у казино", "Casino win")); eff({ h: 8 }); log(T("Великий занос! Ви все одно все програли наступного місяця.", "A huge win! You lost it all again the next month."), "good"); }
      else { money(-dep, T("Депи в казино", "Casino deposits")); eff({ h: -5, so: -3 }); }
      if (S.money < 0 && chance(0.4)) { money(-inc(0.5) * 0.3, T("Мікрокредити", "Payday loans")); log(T("Ви взяли ще п'ять мікрокредитів, щоб «відігратися».", "You took five more payday loans to “win it back”."), "bad"); }
      if (S.money < -inc(0.5) * 2) {
        if (chance(0.3)) { eff({ hl: -12, h: -8 }); log(T("Колектори прийшли додому й побили вас біля під'їзду.", "Debt collectors came to your home and beat you outside."), "bad"); }
        if (partner() && chance(0.25)) { log(T("Партнер дізнався про борги й пішов, забравши дітей.", "Your partner found out about the debts and left, taking the kids."), "bad"); minorKids().forEach((k) => giveKid(k, "partner")); leavePartner("money"); }
        if (!M().homeless && S.money < -inc(0.5) * 4 && chance(0.2)) { M().homeless = { at: S.age }; log(T("Квартиру забрали за борги. Ви опинилися на вулиці.", "Your apartment was taken for debts. You ended up on the street."), "bad"); X.deed("homeless", T("Втратили житло через казино.", "Lost your home to the casino."), "c_homeless"); }
        if (chance(0.15) && (M().off.suic == null || S.age - M().off.suic >= 3)) queue(0.8, "dec", "mod_act", { k: "suic", offer: 1 });
      }
      if (LAW.gambleBan.has(cur()) && chance(0.05 * policeK())) log(T("Підпільне казино накрила поліція, ваші рахунки заморозили.", "Police shut down the illegal casino and froze your accounts.") + jail(rand(1, 3)), "bad");
    },
  }, "life");

  // ---- trash streamer ----
  add("stream", {
    name: T("Треш-стрімер", "Trash streamer"), ok: () => S.age >= 14, need: ["net", "home", "taliban"], on: () => !!M().life.stream, endIn: ["jail", "front"], 
    hint: () => M().life.stream ? T(`Підписників: ${M().life.stream.subs.toLocaleString()}`, `Subscribers: ${M().life.stream.subs.toLocaleString()}`) : "",
    ask: T("Треш-стрімери заробляють мільйони на донатах. Ви купили веб-камеру й кільцеву лампу.", "Trash streamers make millions in donations. You bought a webcam and a ring light."),
    start: () => { M().life.stream = { subs: rand(30, 300), y: 0, bans: 0 }; deed("stream", T("Стали треш-стрімером.", "Became a trash streamer.")); return T("Ви запустили перший стрім. Глядачів — 12, з них троє — боти.", "You started your first stream. 12 viewers, three of them bots."); },
    view: (on) => on ? { body: T(`У вас ${M().life.stream.subs.toLocaleString()} підписників. Що далі?`, `You have ${M().life.stream.subs.toLocaleString()} subscribers. What next?`), choices: [
      { k: "trash", label: T("Зробити треш-стрім", "Do a trash stream"), sub: T("Підписники↑ · ризик", "Subscribers↑ · risk") },
      { k: "stop", label: T("Кинути стрімити", "Quit streaming"), sub: "" }, { k: "no", label: T("Нічого", "Nothing"), sub: "" }] }
      : { body: X.A.stream.ask, choices: [{ k: "yes", label: T("Почати стрімити", "Start streaming"), sub: "" }, { k: "no", label: T("Ні", "No"), sub: "" }] },
    act: (k) => {
      if (k === "yes") return X.A.stream.start();
      if (k === "stop") { delete M().life.stream; return T("Ви видалили канал. Старі кліпи досі гуляють мережею.", "You deleted the channel. Old clips still circulate online."); }
      if (k === "trash") { X.fire("stream_ev", {}, "now"); return !1; }
      return !1;
    },
    year: () => {
      const s = M().life.stream; s.y++;
      s.subs = Math.max(0, Math.round(s.subs * (0.85 + Math.random() * 0.4)));
      const income = inc(0.5) * Math.min(8, s.subs / 25000);
      if (income > 0) money(income, T("Донати й реклама", "Donations & ads"));
      eff({ hl: -2, so: -1 });
      if (chance(0.7)) X.fire("stream_ev");
    },
  }, "life");
  const subsUp = (f) => { const s = M().life.stream; if (s) s.subs = Math.round(s.subs * f + rand(20, 200)); };
  const ban = () => { const s = M().life.stream; if (!s) return ""; s.bans++; s.subs = Math.round(s.subs / 3); return " " + T("Платформа заблокувала канал. Ви переїхали на запасний — з третиною аудиторії.", "The platform banned the channel. You moved to a backup with a third of the audience."); };
  ev("stream_ev", {
    ok: () => !!M().life.stream && X.ctx() === "free", img: "stream", need: ["net", "home"],
    view: () => ({ title: T("Стрім", "Stream"), body: T("Чат вимагає жесті. Донати сиплються за кожен «челендж».", "Chat demands something extreme. Donations pour in for every “challenge”."), choices: [
      { k: "gross", label: T("З'їсти щось огидне на камеру", "Eat something disgusting on camera"), sub: T("Здоров'я↓", "Health↓") },
      { k: "drunk", label: T("Напитися в прямому ефірі", "Get drunk live"), sub: T("Ризик звикання", "Addiction risk") },
      { k: "prank", label: T("Принижувати перехожих за донати", "Humiliate passers-by for donations"), sub: T("Можуть побити · поліція", "You might get beaten · police") },
      { k: "stunt", label: T("Небезпечний трюк", "Dangerous stunt"), sub: T("Можна загинути", "You could die") },
      { k: "abuse", label: T("Знущатися з «гостя» стріму", "Abuse a stream “guest”"), sub: T("Підписники↑↑ · кримінал", "Subscribers↑↑ · criminal") },
      { k: "calm", label: T("Звичайний стрім", "A normal stream"), sub: T("Підписники↓", "Subscribers↓") }] }),
    auto: "calm",
    act: (k) => {
      const s = M().life.stream; if (!s) return !1;
      const banP = (cur() === "CHN" ? 0.3 : 0.12) + 0.03 * s.bans;
      switch (k) {
        case "gross": subsUp(1.3); eff({ hl: -7 }); return T("Ви з'їли банку зіпсованих консервів. Кліп набрав мільйон переглядів, а ви — отруєння.", "You ate a can of spoiled food. The clip got a million views; you got food poisoning.");
        case "drunk": subsUp(1.4); eff({ hl: -6 }); if (!S.alc && chance(0.25)) S.alc = { since: S.age, y: 0 }; return T("Ви пили 12 годин поспіль під донати. Наступного дня нічого не пам'ятали.", "You drank for 12 hours straight for donations. The next day you remembered nothing.") + (chance(banP) ? ban() : "");
        case "prank": subsUp(1.6); eff({ so: -8 }); X.deed("stream", T("Принижували людей на стрімі заради донатів.", "Humiliated people on stream for donations."));
          if (chance(0.25)) { eff({ hl: -15 }); return T("Перехожий не оцінив «пранк» і зламав вам щелепу. Чат був у захваті.", "A passer-by didn't enjoy the “prank” and broke your jaw. Chat loved it."); }
          return chance(0.2 * policeK()) ? T("Поліція затримала вас за хуліганство.", "Police detained you for hooliganism.") + jail(1) : T("Стрім розлетівся по мережі. Вас ненавидять — і дивляться.", "The stream went viral. People hate you, and watch you.") + (chance(banP) ? ban() : "");
        case "stunt": subsUp(1.8);
          if (chance(0.05)) { log(T("Трюк на даху пішов не так. Стрім обірвався.", "The rooftop stunt went wrong. The stream cut off."), "bad"); die("inj"); return null; }
          if (chance(0.3)) { eff({ hl: -18 }); return T("Ви впали й зламали хребет у двох місцях. Донати на лікування не покрили й половини.", "You fell and broke your spine in two places. Donations didn't cover half the treatment."); }
          return T("Ви стрибнули з мосту в річку під овації чату.", "You jumped off a bridge into the river to the chat's applause.");
        case "abuse": subsUp(2.2); eff({ so: -15, h: -6 }); X.deed("stream", T("Знущалися з людини в прямому ефірі.", "Abused a person on a live stream."));
          if (chance(0.12)) { X.count("murders"); return T("«Гостя» стріму знайшли без свідомості. До ранку вона померла.", "The stream's “guest” was found unconscious. She died by morning.") + " " + (X.punish("murder", T("Смерть людини під час стріму.", "A death during a stream.")) || ""); }
          return chance(0.3 * policeK()) ? T("Відео дійшло до поліції.", "The video reached the police.") + jail(rand(1, 4)) : T("Ви отримали рекордний донат. Платформа поки мовчить.", "You got a record donation. The platform is silent for now.") + (chance(banP * 2) ? ban() : "");
        default: s.subs = Math.round(s.subs * 0.85); return T("Спокійний стрім. Половина глядачів пішла до конкурентів.", "A calm stream. Half the viewers left for competitors.");
      }
    },
  });

  // ===================== CHOICES =====================
  add("svo", {
    name: T("Піти на СВО", "Join the war (SVO)"),
    ok: () => cur() === "RUS" && S.age >= 18 && S.age <= 60 && !M().life.svo, need: ["fit", "docs"],
    on: () => !!M().life.svo, where: ["free", "jail"], yearIn: ["front"], img: "c_draft", hint: () => T("Лише для тих, хто живе в Росії", "Only if you live in Russia"),
    ask: () => X.jailed() ? T("До колонії приїхали вербувальники: «Пів року на фронті — і помилування».", "Recruiters came to the prison: “Six months at the front and you're pardoned”.") : T("Військкомат обіцяє великі виплати за контракт.", "The enlistment office promises big payments for a contract."),
    start: (pre) => {
      const fromJail = X.jailed();
      if (fromJail) { S.job = "seeking"; S.flags.prisonUntil = S.age; }
      M().life.svo = { at: S.age, y: 0 }; money(inc(0.5) * 1.5, T("Підйомні за контракт", "Signing bonus"));
      deed("svo", T("Пішли воювати в Україну.", "Went to fight in Ukraine."));
      return (pre ? pre + " " : "") + (fromJail ? T("Ви підписали контракт просто з колонії.", "You signed the contract straight from prison.") : T("Ви підписали контракт і поїхали на фронт.", "You signed a contract and went to the front."));
    },
    year: () => {
      const s = M().life.svo; s.y++; money(inc(0.5) * 1.2, T("Виплати за контракт", "Contract pay"));
      if (chance(0.22)) { delete M().life.svo; log(T("Ви загинули в «м'ясному штурмі».", "You were killed in a “meat assault”."), "bad"); die("war"); return; }
      if (chance(0.3)) { eff({ hl: -25, h: -10 }); log(T("Вас тяжко поранили. Довгі місяці в госпіталі.", "You were badly wounded. Months in a military hospital."), "bad"); }
      else eff({ h: -8, so: -4 });
      if (chance(0.1)) { X.deed("svo", T("Брали участь у воєнних злочинах.", "Took part in war crimes.")); log(T("Те, що ви бачили й робили в окупованому селі, ви не розповідатимете нікому.", "What you saw and did in an occupied village you'll never tell anyone."), "bad"); eff({ h: -10 }); }
      if (s.y >= 2 && chance(0.4)) { delete M().life.svo; M().ptsd = S.age; eff({ h: -6 }); deed("ptsd", T("Повернулися з війни з ПТСР.", "Came back from the war with PTSD."), "f_ptsd"); log(T("Ви повернулися з фронту. Але війна лишилася з вами.", "You came back from the front. But the war stayed with you."), "big"); }
    },
  }, "act");
  X.yearHooks.push(() => { // PTSD after a war
    if (M().ptsd == null || X.jailed()) return;
    eff({ h: -3 });
    if (chance(0.15)) log(pickOne([T("Вам знову снився окоп.", "You dreamt of the trench again."), T("Від гуркоту петард ви впали на землю посеред вулиці.", "At the bang of firecrackers you threw yourself to the ground in the street.")]), "bad");
    if (!S.alc && chance(0.1)) { S.alc = { since: S.age, y: 0 }; log(T("Ви почали пити, щоб заснути.", "You started drinking to fall asleep."), "bad"); }
    if (partner() && chance(0.1)) queue(0.6, "dec", "mod_act", { k: "beatpartner", offer: 1 });
  });

  add("suic", {
    name: T("Самогубство", "Suicide"), ok: () => S.age >= 13, where: ["free", "jail", "front", "army", "pow"], img: null,
    ask: T("Здається, що виходу немає. Але поруч є люди, які можуть допомогти.", "It feels like there's no way out. But there are people who can help."),
    fact: () => help(), yes: T("Покінчити з життям", "End your life"), no: T("Звернутися по допомогу", "Reach out for help"),
    noDo: () => { eff({ h: 10, so: 5 }); return T("Ви зателефонували на лінію допомоги. Розмова тривала до ранку — і стало трохи легше.", "You called a helpline. The talk lasted until morning, and things felt a little lighter."); },
    start: () => { die("suic"); return null; },
  }, "act");

  add("beatkids", {
    name: T("Бити дітей", "Hit your children"), ok: () => S.age >= 16 && minorKids().length > 0, need: ["kidsHome"],
    ask: T("Дитина знову не слухається. Ви втрачаєте терпіння.", "Your child disobeys again. You're losing your temper."),
    start: () => {
      eff({ so: -10, h: -4 }); minorKids().forEach((k) => (k.bd = (k.bd || 0) - 8)); M().abused = 1; X.count("beatkids");
      deed("beatkids", T("Били своїх дітей.", "Hit your own children."));
      if (chance((LAW.socialServ() ? 0.35 : 0.08) + 0.05 * (M().n.beatkids - 1))) {
        const ks = minorKids(); ks.forEach((k) => giveKid(k, "removed")); deed("social", T("Соцслужби забрали у вас дітей.", "Social services took your children."), "c_social");
        return T("Вчителі помітили синці. Соціальні служби забрали дітей до прийомної сім'ї.", "Teachers noticed the bruises. Social services took the children into foster care.") + (chance(0.4 * policeK()) ? X.punish("dv", T("Насильство над дітьми.", "Child abuse.")) : "");
      }
      return pickOne([T("Ви підняли руку на дитину. Вона почала вас боятися.", "You hit your child. They became afraid of you."), T("Дитина тепер ховається у своїй кімнаті, щойно ви приходите додому.", "Your child now hides in their room whenever you come home.")]);
    },
  }, "act");
  X.yearHooks.push(() => { // abused kids grow up
    if (!M().abused) return;
    for (const k of S.fam.kids) if (k.alive !== false && kidAge(k) === 18 && !k.modCut && chance(0.6)) { k.modCut = 1; eff({ so: -8, h: -6 }); log(T(`${nm(k)} виїхав(ла) з дому й перестав(ла) з вами спілкуватися.`, `${nm(k)} moved out and stopped speaking to you.`), "loss"); }
  });

  add("beatpartner", {
    name: T("Бити партнера", "Hit your partner"), ok: () => S.age >= 16 && !!partner(),
    ask: T("Сварка з партнером розгорається. Ви стискаєте кулаки.", "The fight with your partner escalates. You clench your fists."),
    start: () => {
      eff({ so: -12, h: -4 }); X.count("beatpartner");
      deed("beatpartner", T("Били свого партнера.", "Hit your partner."));
      if (chance(0.15)) { eff({ hl: -8 }); return T("Партнер дав відсіч. Ви обоє опинилися в травмпункті.", "Your partner fought back. You both ended up in the ER."); }
      if (chance((LAW.dvLight.has(cur()) ? 0.04 : 0.15) * policeK())) { const t = T("Партнер звернувся до поліції.", "Your partner went to the police.") + X.punish("dv", T("Домашнє насильство.", "Domestic violence.")); leavePartner(); return t; }
      if (chance(0.3 + 0.1 * (M().n.beatpartner - 1))) { leavePartner(); return T("Наступного дня партнер зібрав речі й пішов.", "The next day your partner packed up and left."); }
      return LAW.dvLight.has(cur()) ? T("Сусіди чули крики, але ніхто не втрутився: «сімейні справи».", "The neighbors heard the screams but nobody intervened: “family business”.") : T("Удома запала важка тиша.", "A heavy silence fell over the house.");
    },
  }, "act");

  add("theft", {
    name: T("Крадіжка", "Theft"), ok: () => S.age >= 13, where: ["free", "army"],
    ask: () => pickOne([T("Двері чужої квартири незачинені, а господарів немає.", "A stranger's door is unlocked and nobody is home."), T("У супермаркеті камера, здається, не працює.", "The supermarket camera seems to be off."), T("У маршрутці в жінки з сумки визирає гаманець.", "A wallet is sticking out of a woman's bag on the bus.")]),
    start: () => {
      deed("theft", T("Крали.", "Stole."));
      if (X.caught(0.3, "theft")) {
        eff({ h: -6, so: -6 });
        if (LAW.mobJustice.has(cur()) && chance(0.3)) {
          if (chance(0.08)) { log(T("Натовп упіймав вас на місці. Поліція приїхала надто пізно.", "A mob caught you on the spot. The police arrived too late."), "bad"); die("hom"); return null; }
          eff({ hl: -20 }); deed("mob", T("Натовп учинив над вами самосуд.", "A mob took justice into its own hands."), "c_mob"); return T("Натовп упіймав вас і жорстоко побив — самосуд.", "A mob caught you and beat you badly: mob justice.");
        }
        if (S.age < 16) { eff({ so: -8 }); return T("Вас спіймали. Поліція привезла вас додому, батьки були в люті. Вас поставили на облік.", "You were caught. The police brought you home; your parents were furious. You got a juvenile record."); }
        return T("Вас спіймали на гарячому.", "You were caught red-handed.") + " " + (X.punish("theft", T("Крадіжка.", "Theft.")) || "");
      }
      const v = inc(0.5) * (0.05 + Math.random() * 0.4); money(v, T("Крадіжка", "Theft")); eff({ h: 2, so: -1 });
      return T(`Ви вкрали речей на ${wonStr(v)}. Цього разу вас ніхто не помітив.`, `You stole ${wonStr(v)} worth of stuff. This time nobody saw you.`);
    },
  }, "act");

  add("drugden", {
    name: T("Наркопритон", "Drug den"), ok: () => true, need: ["adult", "home"], on: () => !!M().life.drugden, endIn: ["jail", "front"], 
    ask: T("Знайомий дилер пропонує відкрити «точку» у вашій квартирі.", "A dealer you know offers to set up a “spot” in your apartment."),
    fact: () => LAW.dpDrug() ? T("У цій країні за торгівлю наркотиками передбачена смертна кара.", "Drug trafficking carries the death penalty in this country.") : null,
    start: () => { M().life.drugden = S.age; deed("drugden", T("Тримали наркопритон.", "Ran a drug den.")); return T("Ви відкрили наркопритон.", "You opened a drug den."); },
    stopLabel: () => T("Закрити притон", "Shut it down"),
    stop: () => { delete M().life.drugden; return chance(0.2) ? (eff({ hl: -10 }), T("Постачальник вирішив, що ви «здали» його, і вас побили.", "Your supplier thought you'd snitched, and you got beaten.")) : T("Ви закрили притон.", "You shut down the drug den."); },
    year: () => {
      money(inc(0.6) * 0.9, T("Наркопритон", "Drug den")); eff({ h: -2, hl: -2, so: -5 });
      if (!S.drug && chance(0.25)) { S.drug = { since: S.age, y: 0 }; log(T("Ви й самі підсіли на товар.", "You got hooked on your own product."), "bad"); }
      if (minorKids().length && chance(LAW.socialServ() ? 0.4 : 0.1)) { minorKids().forEach((k) => giveKid(k, "removed")); deed("social", T("Соцслужби забрали дітей із притону.", "Social services took the children from the drug den."), "c_social"); log(T("Соціальні служби забрали дітей із притону.", "Social services took the children out of the drug den."), "bad"); }
      if (chance(0.03)) { log(T("Клієнт помер від передозування просто у вас у квартирі.", "A customer died of an overdose right in your apartment."), "bad"); eff({ h: -10 }); }
      if (chance(0.04)) { delete M().life.drugden; log(T("Розбірки з конкурентами закінчилися стріляниною.", "A turf war ended in a shootout."), "bad"); die("hom"); return; }
      if (chance(0.16 * policeK())) { delete M().life.drugden; log(T("Поліція накрила притон.", "Police raided the drug den.") + " " + (X.punish("drugdeal", T("Утримання наркопритону.", "Running a drug den.")) || ""), "bad"); }
    },
  }, "act");

  // Gender transition through the game's own S.trans system (keeps biology, changes how you live).
  add("sexchange", {
    name: T("Зміна статі", "Gender transition"), ok: () => !(S.trans && S.trans.at != null), need: ["adult", "docs"], img: "c_trans",
    view: () => {
      const banned = LAW.transBan();
      return { body: banned ? T("У цій країні зміну статі заборонено законом. Лишається лише підпільна гормонотерапія.", "Gender transition is banned by law in this country. Only underground hormones remain.")
        : T("Ви давно відчуваєте, що ваше тіло не відповідає тому, ким ви є.", "You've long felt your body doesn't match who you are."),
        fact: banned && cur() === "RUS" ? T("У 2023 році Росія заборонила медичну й юридичну зміну статі.", "In 2023 Russia banned medical and legal gender transition.") : null,
        choices: [{ k: "yes", label: banned ? T("Підпільний перехід", "Underground transition") : T("Пройти перехід", "Transition"), sub: banned ? T("Без лікарів · переслідування", "No doctors · persecution") : T("Дорого", "Expensive") },
          { k: "no", label: T("Ні", "No"), sub: "" }] };
    },
    act: (k) => {
      if (k !== "yes") return !1;
      const banned = LAW.transBan(), g = S.sex === "M" ? "F" : "M";
      S.trans = Object.assign(S.trans || {}, { g, k: Math.max(0, S.age - 1), at: S.age, o: "both" });
      money(-inc(0.5) * (banned ? 0.3 : 0.7), T("Перехід", "Transition"));
      eff({ h: 10 });
      let t = g === "F" ? T("Ви почали жити як жінка.", "You began living as a woman.") : T("Ви почали жити як чоловік.", "You began living as a man.");
      const r = Math.random();
      t += " " + (r < 0.45 ? (eff({ so: 3 }), T("Близькі вас підтримали.", "Your loved ones supported you.")) : r < 0.8 ? (eff({ so: -6 }), T("Батьки відмовилися називати вас новим ім'ям.", "Your parents refused to use your new name.")) : (eff({ so: -14 }), T("Родина від вас відреклася.", "Your family disowned you.")));
      const p = partner(); if (p && chance(0.5)) { leavePartner(); t += " " + T("Партнер не зміг це прийняти й пішов.", "Your partner couldn't accept it and left."); }
      if (banned) {
        if (chance(0.3)) { eff({ hl: -10 }); t += " " + T("Гормони з чорного ринку зіпсували вам здоров'я.", "Black-market hormones damaged your health."); }
        if (chance(0.15)) { eff({ hl: -15, h: -10 }); t += " " + T("На вас напали на вулиці.", "You were attacked in the street."); }
        if (chance(0.15 * policeK())) t += " " + (X.punish("lgbt") || "");
      }
      return { t, k: "big" };
    },
  }, "act");

  // Orientation through the game's own flags: S.flags.ss (gay), S.flags.bi, S.flags.celib — the game uses
  // them when it generates future partners, so this really changes who you meet.
  add("orient", {
    name: T("Зміна орієнтації", "Change orientation"), ok: () => S.age >= 13, where: ["free", "jail", "front", "army"], img: () => (LAW.lgbtCrime() ? "c_lgbt" : null),
    view: () => ({ body: T("Ви по-новому дивитеся на те, хто вас приваблює.", "You see who you're attracted to in a new light.") + (LAW.lgbtCrime() ? " " + T("Але в цій країні одностатеві стосунки — злочин.", "But same-sex relationships are a crime in this country.") : ""),
      choices: [
        { k: "het", label: T("Гетеросексуальність", "Heterosexual"), sub: "" },
        { k: "gay", label: (S.trans && S.trans.at != null ? S.trans.g : S.sex) === "F" ? T("Лесбійка", "Lesbian") : T("Гей", "Gay"), sub: "" },
        { k: "bi", label: T("Бісексуальність", "Bisexual"), sub: "" },
        { k: "ace", label: T("Асексуальність", "Asexual"), sub: T("Без романтичних стосунків", "No romantic relationships") },
        { k: "no", label: T("Нічого не змінювати", "Change nothing"), sub: "" }] }),
    act: (k) => {
      if (k === "no") return !1;
      S.flags.ss = k === "gay" ? 1 : 0; S.flags.bi = k === "bi" ? 1 : 0; S.flags.celib = k === "ace" ? 1 : void 0; S.flags.oKnow = S.age;
      M().orient = k;
      const me = S.trans && S.trans.at != null ? S.trans.g : S.sex;
      const names = { het: T("гетеросексуальність", "heterosexual"), gay: T("гомосексуальність", "gay"), bi: T("бісексуальність", "bisexual"), ace: T("асексуальність", "asexual") };
      let t = T(`Ви прийняли свою орієнтацію: ${names[k]}.`, `You came to terms with your orientation: ${names[k]}.`);
      const p = partner();
      if (p) {
        const bad = (k === "gay" && p.sex !== me) || (k === "het" && p.sex === me) || (k === "ace" && chance(0.7));
        if (bad) { leavePartner("ori"); eff({ h: -6, so: -4 }); t += " " + T("Ви розійшлися з партнером: так буде чесніше.", "You broke up with your partner; it was more honest."); }
      }
      if (k === "gay" || k === "bi") {
        if (LAW.lgbtCrime()) { eff({ h: -6 }); t += " " + T("Вам доведеться приховувати це все життя.", "You'll have to hide it your whole life."); }
        else if (chance(0.5)) { const r = chance(0.6); eff(r ? { so: 3, h: 3 } : { so: -8 }); t += " " + (r ? T("Батьки прийняли ваш камінг-аут.", "Your parents accepted your coming out.") : T("Батьки не прийняли ваш камінг-аут.", "Your parents didn't accept your coming out.")); }
      }
      return { t, k: "big" };
    },
  }, "act");

  // ===================== FAMILY =====================
  add("orphanage", {
    name: T("Здати дитину в дитбудинок", "Give a child to an orphanage"), ok: () => minorKids().length > 0, need: ["docs", "kidsHome"],
    view: () => ({ body: T("Грошей, сил і бажання виховувати не лишилося. Можна віддати дитину державі.", "You've run out of money, strength and will to raise them. You could hand a child over to the state."),
      fact: T("У світі в інтернатних закладах живуть понад 5 мільйонів дітей; більшість із них мають живих батьків (UNICEF).", "Over 5 million children worldwide live in institutions; most have living parents (UNICEF)."),
      choices: [...minorKids().slice(0, 5).map((k) => ({ k: "kid:" + S.fam.kids.indexOf(k), label: T(`Віддати дитину: ${nm(k)}, ${kidAge(k)} р.`, `Give up ${nm(k)}, age ${kidAge(k)}`), sub: "" })),
        { k: "no", label: T("Залишити дітей", "Keep the children"), sub: "" }] }),
    act: (k) => {
      if (!k.startsWith("kid:")) return !1;
      const kid = S.fam.kids[+k.slice(4)]; if (!kid) return !1;
      const n = nm(kid), a = kidAge(kid);
      giveKid(kid, "orphanage"); eff({ h: -14, so: -8 });
      deed("orphanage", T(`Здали дитину (${n}) в дитбудинок.`, `Gave ${n} up to an orphanage.`));
      return { t: T(`Ви відвезли дитину (${n}, ${a} р.) до дитячого будинку й підписали відмову. Маленьке обличчя у вікні дивилося вслід, поки машина не зникла.`, `You took ${n} (age ${a}) to an orphanage and signed away your rights. A small face watched from the window until the car disappeared.`), k: "bad" };
    },
  }, "fam");
  X.yearHooks.push(() => { // children given away come back into your life
    for (const g of M().gone || []) {
      const age = S.age - g.bornAt;
      if (g.met || age < 18 || age > 40 || !chance(0.15)) continue;
      g.met = 1;
      const nmg = g.name && (g.name.g || g.name.full) || "?";
      log(pickOne([
        T(`${nmg}, якого(яку) ви колись віддали, знайшов(ла) вас. Розмова тривала п'ять хвилин: «Я просто хотів(ла) подивитися вам в очі».`, `${nmg}, the child you gave away, found you. The talk lasted five minutes: “I just wanted to look you in the eye”.`),
        T(`Ви дізналися, що ${nmg} після дитбудинку опинився(лася) на вулиці.`, `You learned that ${nmg} ended up on the street after the orphanage.`),
        T(`${nmg} написав(ла) вам: «Мене всиновили. У мене все добре. Не шукайте мене».`, `${nmg} wrote to you: “I was adopted. I'm fine. Don't look for me”.`),
      ]), "loss");
      eff({ h: -6 });
    }
  });

  // ===================== SHARED CONSEQUENCES =====================
  X.yearHooks.push(() => { // living on the street
    const hm = M().homeless; if (!hm || X.jailed()) return;
    eff({ h: -4, hl: -4, so: -2 });
    if (isWorking() && chance(0.5)) { S.job = "seeking"; log(T("Без адреси й душу вас звільнили з роботи.", "With no address and no shower, you lost your job."), "bad"); }
    if (chance(0.03)) { log(T("Морозна ніч на вулиці виявилася останньою.", "A freezing night on the street was your last."), "bad"); die("ocd"); return; }
    if (chance(S.money > 0 ? 0.5 : 0.2)) { delete M().homeless; eff({ h: 6 }); log(pickOne([T("Соціальний центр знайшов вам ліжко в притулку, а потім — кімнату.", "A social center found you a shelter bed, then a room."), T("Родичі забрали вас до себе.", "Relatives took you in.")]), "good"); }
  });
  X.yearHooks.push(() => {
    // HIV without treatment in poorer countries.
    if (M().hiv != null) { eff({ hl: -2 }); if (S.age - M().hiv >= 5 && chance(rich() ? 0.005 : 0.05)) { log(T("ВІЛ перейшов у СНІД.", "HIV progressed to AIDS."), "bad"); die("hiv"); return; } }
    // A criminal record follows you.
    if ((S.rec || []).length && isWorking() && chance(0.05)) { S.job = "seeking"; log(T("Роботодавець дізнався про вашу судимість і звільнив вас.", "Your employer found out about your record and fired you."), "bad"); }
    // Unsolved murders: cold cases get reopened, guilt eats you.
    if (M().unsolved > 0 && !X.jailed()) {
      eff({ h: -2 });
      if (chance(0.03 * M().unsolved * policeK())) { M().unsolved = 0; log(T("Через роки нова ДНК-експертиза відкрила стару справу. За вами прийшли.", "Years later, a new DNA test reopened the old case. They came for you.") + " " + (X.punish(M().n.murders > 2 ? "serial" : "murder", T("Нерозкрите вбивство.", "Unsolved murder.")) || ""), "bad"); }
    }
  });
})();
