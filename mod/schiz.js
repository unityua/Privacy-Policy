/* 1in8b mod — schizophrenia: voices, paranoia, destructive episodes, treatment by country. */
(() => {
  "use strict";
  const X = window.MOD; if (!X || !X.LAW) return;
  const { T, rand, pickOne, M, cur, partner, minorKids, inc, money, LAW, help } = X;
  const sz = () => M().life.schiz;
  const leavePartner = () => { try { S.fam.married ? divorceNow(C(), !1, "ill") : (S.fam.partner = null); } catch { S.fam.partner = null; S.fam.married = !1; } };

  X.add("schiz", {
    name: T("Шизофренія", "Schizophrenia"), ok: () => S.age >= 13 && !sz(), on: () => !!sz(), where: ["free", "jail", "front", "army"], yearIn: ["free", "jail", "front", "kid", "army", "pow"], img: () => (sz() && sz().tx ? "c_psych" : "schiz"),
    hint: () => sz() ? (sz().tx ? T("Лікується", "In treatment") : T("Без лікування", "Untreated")) : "",
    ask: T("Останнім часом ви чуєте голоси, яких ніхто інший не чує.", "Lately you've been hearing voices no one else can hear."),
    start: () => { M().life.schiz = { at: S.age, tx: 0, ep: 0 }; eff({ h: -8, so: -6 }); X.deed("schiz", T("Жили з шизофренією.", "Lived with schizophrenia.")); return T("Вам діагностували шизофренію.", "You were diagnosed with schizophrenia."); },
    view: (on) => on ? { body: sz().tx ? T("Ви приймаєте антипсихотики. Голоси тихіші, але від ліків ви набрали вагу й постійно сонні.", "You're on antipsychotics. The voices are quieter, but the meds made you gain weight and always sleepy.") : T("Без лікування голоси звучать щодня.", "Untreated, the voices speak every day."),
      choices: sz().tx ? [{ k: "off", label: T("Кинути ліки", "Stop the meds"), sub: T("Голоси повернуться", "The voices will return") }, { k: "no", label: T("Продовжувати лікування", "Continue treatment"), sub: "" }]
        : [{ k: "tx", label: T("Почати лікування", "Start treatment"), sub: LAW.rich() ? T("Доступне", "Available") : T("Дорого й не завжди доступне", "Expensive and not always available") }, { k: "no", label: T("Жити далі як є", "Carry on as is"), sub: "" }] }
      : { body: X.A.schiz.ask, choices: [{ k: "yes", label: T("Так, це про мене", "Yes, that's me"), sub: "" }, { k: "no", label: T("Ні", "No"), sub: "" }] },
    act: (k) => {
      if (k === "yes") return X.A.schiz.start();
      if (k === "off") { sz().tx = 0; return T("Ви кинули ліки: «я здоровий(а)».", "You stopped the meds: “I'm fine”."); }
      if (k === "tx") {
        if (!LAW.rich() && chance(0.4)) { money(-inc(0.5) * 0.1, T("Психіатр", "Psychiatrist")); return T("Найближчий психіатр — за 300 км, а ліків в аптеці немає.", "The nearest psychiatrist is 300 km away, and the pharmacy has no medication."); }
        sz().tx = 1; return T("Ви почали регулярне лікування.", "You started regular treatment.");
      }
      return !1;
    },
    year: () => {
      const s = sz(); if (!s) return;
      if (s.tx) {
        money(-inc(0.5) * (LAW.rich() ? 0.02 : 0.08), T("Ліки", "Medication")); eff({ h: -1, hl: -1 });
        if (chance(0.15)) { s.tx = 0; log(T("Голоси переконали вас, що ліки — це отрута. Ви тихо перестали їх пити.", "The voices convinced you the meds were poison. You quietly stopped taking them."), "bad"); }
        else if (chance(0.15)) X.fire("voice");
        return;
      }
      eff({ h: -4, so: -4, sm: -1 });
      const n = chance(0.5) ? 2 : 1;
      for (let i = 0; i < n; i++) X.fire("voice");
      if (chance(0.2)) episode();
      // where there's little psychiatric care: prayer camps, chains
      if (LAW.prayerCamps.has(cur()) && chance(0.15) && !s.camp) {
        s.camp = 1; eff({ hl: -15, h: -15, so: -6 });
        log(cur() === "IDN" ? T("Родина, не знаючи, що робити, тримала вас на ланцюгу в сараї («пасунг»).", "Not knowing what to do, your family kept you chained in a shed (“pasung”).")
          : T("Родина відвезла вас до «молитовного табору», де вас тижнями тримали на ланцюгу й морили голодом, «виганяючи демонів».", "Your family took you to a “prayer camp” where you were chained and starved for weeks to “drive out demons”."), "bad");
      }
      if (S.age - s.at > 3 && chance(0.06) && S.money < inc(0.5) * 0.2) { s.street = 1; M().homeless = { at: S.age }; X.deed("homeless", T("Через хворобу опинилися на вулиці.", "Ended up on the street because of the illness."), "c_homeless"); eff({ hl: -10, so: -10 }); log(T("Ви опинилися на вулиці. Ночували на вокзалі.", "You ended up on the street, sleeping at the train station."), "bad"); }
    },
  }, "life");

  function episode() {
    const s = sz(); s.ep++;
    const r = Math.random();
    if (r < 0.4) {
      money(-inc(0.5) * 0.1, T("Психлікарня", "Psychiatric hospital")); eff({ h: -6 }); X.deed("psych", T("Примусова госпіталізація в психлікарню.", "Involuntary psychiatric hospitalisation."), "c_psych");
      log(T("Під час загострення вас примусово госпіталізували. Три тижні в закритому відділенні.", "During a psychotic break you were involuntarily hospitalised. Three weeks on a locked ward."), "bad");
      if (isWorking() && chance(0.4)) { S.job = "seeking"; log(T("Ви втратили роботу.", "You lost your job."), "bad"); }
    } else if (r < 0.7) {
      eff({ hl: -6, so: -6 }); log(T("Тиждень кататонії: ви не говорили й не їли, просто сиділи, дивлячись у стіну.", "A week of catatonia: you didn't speak or eat, just sat staring at the wall."), "bad");
    } else {
      eff({ so: -8 }); log(T("Ви зникли з дому на кілька днів. Вас знайшли за 200 км, ви не пам'ятали, як туди потрапили.", "You vanished from home for days. You were found 200 km away with no memory of getting there."), "bad");
    }
  }

  // ---------- the voices ----------
  const VOICES = [
    { id: "poison", say: T("«Їжа отруєна. Не їж нічого, що тобі дають».", "“The food is poisoned. Don't eat anything they give you.”"),
      obey: () => (eff({ hl: -10 }), T("Ви тижнями майже нічого не їли. Схудли на 12 кг.", "For weeks you barely ate. You lost 12 kg.")) },
    { id: "watch", say: T("«Сусід стежить за тобою через стіну. Він записує кожне твоє слово».", "“The neighbor is watching you through the wall. He records every word.”"),
      obey: () => chance(0.3) ? (eff({ so: -6 }), T("Ви вибили сусідові двері, щоб знайти камери.", "You broke down the neighbor's door to find the cameras.") + (chance(0.5) ? X.jail(1, T("Хуліганство.", "Hooliganism.")) : T(" Він не став писати заяву.", " He didn't press charges."))) : (eff({ so: -4, h: -3 }), T("Ви заклеїли вікна фольгою й тиждень не виходили з квартири.", "You covered the windows with foil and didn't leave the apartment for a week.")) },
    { id: "burn", say: T("«Документи заражені. Спали їх, поки не пізно».", "“The documents are infected. Burn them before it's too late.”"),
      obey: () => chance(0.15) ? (money(-Math.max(inc(0.5), S.money * 0.5), T("Пожежа", "Fire")), eff({ hl: -10 }), T("Вогонь перекинувся на штори. Квартира вигоріла.", "The fire spread to the curtains. The apartment burned out.")) : (money(-inc(0.5) * 0.1, T("Відновлення документів", "Replacing documents")), T("Ви спалили паспорт і всі документи у ванній.", "You burned your passport and all your papers in the bathtub.")) },
    { id: "job", say: T("«На роботі всі проти тебе. Піди звідти сьогодні ж».", "“Everyone at work is against you. Leave today.”"), ok: () => isWorking(),
      obey: () => (S.job = "seeking", T("Ви встали посеред робочого дня й пішли назавжди.", "You stood up in the middle of the workday and left for good.")) },
    { id: "family", say: T("«Твоя родина — підставні люди. Справжніх замінили».", "“Your family are impostors. The real ones were replaced.”"),
      obey: () => { eff({ so: -15 }); if (partner() && chance(0.4)) { leavePartner(); return T("Ви перестали впускати рідних додому. Партнер не витримав і пішов.", "You stopped letting family into the house. Your partner couldn't take it and left."); } return T("Ви перестали відповідати на дзвінки рідних.", "You stopped answering your family's calls."); } },
    { id: "chosen", say: T("«Ти обраний(а). Віддай усі гроші — так треба для місії».", "“You are the chosen one. Give away all your money; the mission needs it.”"),
      obey: () => (money(-Math.max(0, S.money) * 0.8 - inc(0.5) * 0.2, T("«Місія»", "“The mission”")), T("Ви роздали всі заощадження незнайомцям на вулиці.", "You gave all your savings to strangers on the street.")) },
    { id: "leave", say: T("«Тут небезпечно. Тікай з дому зараз, нікому не кажи».", "“It's not safe here. Run away from home now, tell no one.”"),
      obey: () => (eff({ hl: -8, so: -6 }), T("Ви місяць блукали містами, ночуючи де доведеться.", "You wandered between towns for a month, sleeping wherever you could.")) },
    { id: "kids", say: T("«Діти — не твої. Їх підмінили».", "“The children aren't yours. They were swapped.”"), ok: () => minorKids().length > 0,
      obey: () => { eff({ so: -10 }); if (chance(LAW.socialServ() ? 0.4 : 0.15)) { const ks = minorKids(); ks.forEach((k) => { const i = S.fam.kids.indexOf(k); try { dropKid(i); } catch {} (S.fam.given = S.fam.given || []).push({ name: k.name, sex: k.sex, bornAt: k.bornAt, at: S.age, mod: "removed" }); }); return T("Ви замкнули дітей у кімнаті. Сусіди викликали поліцію, і дітей забрали соціальні служби.", "You locked the kids in a room. Neighbors called the police and social services took the children."); } return T("Ви тижнями не підходили до дітей. Вони плакали за дверима.", "For weeks you wouldn't go near the children. They cried outside the door."); } },
    { id: "attack", say: T("«Той чоловік у під'їзді — агент. Нейтралізуй його, поки він не нейтралізував тебе».", "“That man in the stairwell is an agent. Neutralize him before he neutralizes you.”"), ok: () => S.age >= 15,
      obey: () => { X.deed("schiz", T("Напали на людину під час психозу.", "Attacked someone during psychosis.")); if (chance(0.1)) { X.count("murders"); return T("Під час психозу ви напали на незнайомця. Він не вижив.", "During psychosis you attacked a stranger. He didn't survive.") + (chance(0.6) ? T(" Суд визнав вас неосудним і направив на примусове лікування.", " The court found you not criminally responsible and ordered compulsory treatment.") + X.jail(rand(3, 8)) : " " + (X.punish("murder") || "")); } eff({ so: -8 }); return T("Ви напали на сусіда в під'їзді.", "You attacked a neighbor in the stairwell.") + (chance(0.5) ? X.jail(rand(1, 3), T("Напад під час психозу.", "Assault during psychosis.")) : T(" Вас примусово госпіталізували.", " You were involuntarily hospitalised.")); } },
    { id: "self", say: T("«Ти заслуговуєш на біль. Зроби собі боляче».", "“You deserve pain. Hurt yourself.”"),
      fact: () => help(),
      obey: () => (eff({ hl: -12, h: -8 }), T("Ви завдали собі шкоди. Вас знайшли й відвезли до лікарні. Лікарка дала номер лінії допомоги.", "You hurt yourself. You were found and taken to hospital. The doctor gave you a helpline number.")) },
    { id: "tv", say: T("«Телевізор говорить лише до тебе. Ведучі передають тобі накази».", "“The TV speaks only to you. The hosts are giving you orders.”"),
      obey: () => (eff({ sm: -3, h: -3 }), T("Ви годинами записували «шифри» з новин у зошит.", "You spent hours copying “codes” from the news into a notebook.")) },
  ];
  X.addEvent("voice", {
    ok: () => !!sz(), img: "schiz", where: ["free", "jail", "front", "kid", "army", "pow"],
    view: (p) => {
      const pool = VOICES.filter((v) => !v.ok || v.ok());
      const v = pool.find((x) => x.id === p.v) || pickOne(pool); p.v = v.id;
      return { title: T("Голоси", "The voices"), body: v.say, fact: v.fact ? v.fact() : null, choices: [
        { k: "obey", label: T("Послухатися голосів", "Obey the voices"), sub: "" },
        { k: "resist", label: T("Опиратися", "Resist"), sub: T("Виснажує", "Exhausting") }] };
    },
    auto: "resist",
    act: (k, p) => {
      const v = VOICES.find((x) => x.id === p.v) || VOICES[0];
      if (k === "obey") { X.count("voices_obeyed"); return { t: v.obey(), k: "bad" }; }
      eff({ h: -3 });
      if (chance(0.2)) { const s = sz(); if (s && !s.tx) return T("Ви опиралися всю ніч і зранку самі пішли до лікаря.", "You fought it all night and in the morning went to a doctor yourself.") + (s.tx = LAW.rich() ? 1 : 0, s.tx ? " " + T("Вам призначили лікування.", "You were prescribed treatment.") : ""); }
      return pickOne([T("Ви ввімкнули музику на повну, щоб їх заглушити.", "You turned the music up full to drown them out."), T("Ви сиділи на підлозі, затуливши вуха, доки не стихло.", "You sat on the floor with your ears covered until it passed.")]);
    },
  });
})();
