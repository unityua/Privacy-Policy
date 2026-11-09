/* 1in8b mod — country laws & world context. Uses MOD from core.js. */
(() => {
  "use strict";
  const X = window.MOD; if (!X) return;
  const { T, rand, pickOne, M, cur, year, partner, inc, money, jail, execute, deed, policeK, ctyName } = X;

  const set = (s) => new Set(s.split(" "));
  // Probability that a conviction ends in a death sentence that is carried out.
  const DP_MURDER = { CHN: .35, IRN: .6, SAU: .6, IRQ: .3, EGY: .3, USA: .06, SGP: .5, VNM: .3, PAK: .08, BGD: .08, BLR: .3, PRK: .8, JPN: .05, AFG: .6, SOM: .35, YEM: .4, SYR: .3, IND: .01, KWT: .2, ARE: .1, SDN: .2, TWN: .02, NGA: .03 };
  const DP_DRUG = { CHN: .2, IRN: .3, SAU: .35, SGP: .6, MYS: .1, IDN: .05, VNM: .25, PRK: .6, KWT: .1 };
  const LAW = {
    dpMurder: (c = cur()) => DP_MURDER[c] || 0,
    dpDrug: (c = cur()) => DP_DRUG[c] || 0,
    alcBan: set("AFG IRN SAU KWT LBY SOM SDN YEM MRT"),
    gambleBan: set("PRK SAU IRN AFG ARE QAT KWT PAK BGD CHN IDN BRN"),
    prostLegal: set("DEU NLD AUT CHE GRC TUR NZL BEL COL MEX BRA ARG URY"),
    prostHarsh: set("CHN IRN SAU AFG ARE PRK USA EGY"),
    sharia: set("AFG IRN SAU YEM SOM MRT SDN"),
    adultery: set("AFG IRN SAU YEM SOM MRT SDN PAK QAT"),
    lgbtDeath: set("AFG IRN SAU YEM MRT SOM BRN UGA"),
    lgbtCrime: () => { try { return SS_BAN.has(cur()); } catch { return false; } },
    transBan: () => { try { return cur() === "RUS" || cur() === "PRK" || SS_BAN.has(cur()); } catch { return false; } },
    noNet: set("PRK ERI TKM"),
    dvLight: set("RUS BLR UZB TKM TJK AFG PAK EGY"),         // domestic violence barely prosecuted
    socialServ: () => { try { return C().p === "hi"; } catch { return false; } },
    mobJustice: set("NGA KEN UGA TZA IND BGD PAK HTI GTM BOL MOZ ZAF COD"),
    prayerCamps: set("GHA NGA IDN SOM ETH KEN TZA BEN TGO CIV LBR SLE"),
    rich: () => { try { return C().ppp >= 30000; } catch { return false; } },
  };
  X.LAW = LAW;
  X.REQ.net = { ok: () => !LAW.noNet.has(cur()) && !M().homeless, why: () => LAW.noNet.has(cur()) ? T("Недоступно: у цій країні немає вільного інтернету", "Unavailable: there's no open internet in this country") : T("Недоступно: на вулиці немає ні інтернету, ні техніки", "Unavailable: no internet or gear on the street") };
  X.REQ.taliban = { ok: () => !(cur() === "AFG" && S.sex === "F" && (year() >= 2021 || (year() >= 1996 && year() <= 2001))), why: () => T("Недоступно: Талібан забороняє жінкам з'являтися на публіці й навіть говорити вголос на вулиці", "Unavailable: the Taliban bar women from appearing in public, even from speaking aloud outside") };

  // Chance to be caught: base x local policing x (repeat offences make it likelier).
  X.caught = (base, kind) => {
    const n = M().n["crime_" + kind] || 0;
    X.count("crime_" + kind);
    return chance(X.clamp01((base + 0.06 * n) * policeK()));
  };

  // Country-aware punishment. Returns log text, or null if the character was executed.
  X.punish = (kind, why) => {
    const c = cur();
    switch (kind) {
      case "murder": {
        if (S.age >= 18 && chance(LAW.dpMurder(c)))
          return execute(T(`Суд визнав вас винним у вбивстві й засудив до смертної кари (${ctyName()}).`, `The court found you guilty of murder and sentenced you to death (${ctyName()}).`));
        return jail(rand(10, 25), why);
      }
      case "serial": {
        if (S.age >= 18 && chance(Math.min(0.95, LAW.dpMurder(c) * 1.6)))
          return execute(T("За серію вбивств вас засудили до смертної кари.", "For the serial killings you were sentenced to death."));
        return jail(60, why);
      }
      case "drugdeal": {
        if (S.age >= 18 && chance(LAW.dpDrug(c)))
          return execute(T("За торгівлю наркотиками суд виніс смертний вирок.", "For drug trafficking the court handed down a death sentence."));
        return jail(LAW.dpDrug(c) ? rand(10, 20) : rand(4, 12), why);
      }
      case "drugs": return jail(LAW.dpDrug(c) ? rand(3, 8) : rand(1, 3), why);
      case "theft": {
        if (LAW.sharia.has(c) && S.age >= 18 && chance(0.15)) {
          eff({ hl: -20, h: -15, so: -8 });
          try { S.dis = S.dis || { k: "move", at: S.age, src: "acc", aid: 0, wc: 0, told: 1, tellAt: S.age }; } catch {}
          deed("theft", T("Суд шаріату засудив вас до тілесного покарання за крадіжку.", "A sharia court sentenced you to corporal punishment for theft."), "prison");
          return T("Суд шаріату засудив вас до тілесного покарання. Ви назавжди залишились із каліцтвом.", "A sharia court sentenced you to corporal punishment. You were left permanently disabled.") + jail(rand(1, 3));
        }
        return jail(rand(1, 4), why);
      }
      case "alcohol": {
        eff({ hl: -8, h: -10, so: -6 });
        return T("За вживання алкоголю вас публічно покарали батогами.", "You were publicly flogged for drinking alcohol.") + (chance(0.4) ? jail(1) : "");
      }
      case "adultery": {
        if (["AFG", "IRN", "SOM"].includes(c) && chance(c === "AFG" ? 0.35 : 0.1))
          return execute(T("За «перелюб» вас засудили до страти.", "You were sentenced to death for “adultery”."));
        eff({ hl: -6, h: -12, so: -12 });
        return T("За «перелюб» вас покарали батогами.", "You were flogged for “adultery”.") + jail(rand(1, 5));
      }
      case "prost": {
        if (LAW.prostLegal.has(c)) return T("Поліція перевірила документи, але в цій країні секс-робота легальна.", "Police checked your papers, but sex work is legal here.");
        if (c === "CHN") return T("Вас відправили на «перевиховання».", "You were sent to “re-education”.") + jail(2);
        return T("Вас затримали під час рейду.", "You were detained in a raid.") + (LAW.prostHarsh.has(c) ? jail(rand(1, 3)) : (money(-inc(0.5) * 0.1, T("Штраф", "Fine")), T(" Виписали штраф.", " You were fined.")));
      }
      case "lgbt": {
        if (LAW.lgbtDeath.has(c) && chance(0.3))
          return execute(T("За стосунки з людиною своєї статі вас засудили до страти.", "You were sentenced to death for a same-sex relationship."));
        if (c === "RUS") return T("Вас звинуватили в «екстремізмі» через «ЛГБТ-рух».", "You were charged with “extremism” over the “LGBT movement”.") + jail(rand(2, 6));
        return T("Вас заарештували за стосунки з людиною своєї статі.", "You were arrested over a same-sex relationship.") + jail(rand(2, 10));
      }
      case "dv": return jail(LAW.dvLight.has(c) ? 1 : rand(1, 4), why);
      default: return jail(rand(1, 3), why);
    }
  };

  // ---------- world context: yearly country pressure ----------
  const ev = (key, def) => X.addEvent(key, def);
  const taliban = () => cur() === "AFG" && S.sex === "F" && (year() >= 2021 || (year() >= 1996 && year() <= 2001));
  const noteOnce = (k, text, kind = "bad") => { const m = M(); m.notes = m.notes || {}; if (m.notes[k]) return; m.notes[k] = S.age; log(text, kind); };

  X.yearHooks.push(() => {
    const c = cur(), a = S.age, y = year();

    // Afghanistan under the Taliban: life as a woman.
    if (taliban() && a >= 10) {
      eff({ h: -3, so: -2, hl: -1 });
      if (a >= 12) noteOnce("af_school", T("Дівчатам старшим за 12 років заборонили ходити до школи.", "Girls over 12 were banned from school."));
      const lines = [
        T("Талібан заборонив жінкам ходити в парки, спортзали й лазні.", "The Taliban banned women from parks, gyms and bathhouses."),
        T("Без супроводу родича-чоловіка (махрама) жінкам не можна їхати далі за 72 км.", "Women can't travel more than 72 km without a male guardian (mahram)."),
        T("Жінкам заборонили, щоб їхні голоси чули на вулиці.", "Women were banned from letting their voices be heard in public."),
        T("Салони краси закрили, і десятки тисяч жінок втратили роботу.", "Beauty salons were shut down and tens of thousands of women lost their jobs."),
        T("Вікна, що виходять на жіночі кімнати, наказали замурувати.", "Windows overlooking women's rooms had to be bricked up."),
        T("Жінкам заборонили навчатися на медсестер і акушерок.", "Women were banned from training as nurses and midwives."),
      ];
      if (chance(0.5)) log(pickOne(lines), "bad");
      if (a >= 14 && a <= 20 && !S.fam.married && !M().afWed && chance(0.45)) X.fire("af_wed");
      if (a >= 12 && a <= 25 && !M().afSchool && chance(0.25)) X.fire("af_school");
      if (a >= 16 && chance(0.12)) X.fire("af_out");
    }

    // Iran: compulsory hijab & morality police.
    if (c === "IRN" && S.sex === "F" && a >= 9 && chance(0.25)) X.fire("ir_hijab");

    // Russia: mobilisation & persecution.
    if (c === "RUS" && y >= 2022) {
      if (S.sex === "M" && a >= 18 && a <= 50 && !M().life.svo && !X.jailed() && chance(0.08)) X.fire("ru_mob");
      if (S.sex === "M" && a >= 18 && a <= 27 && !M().life.svo && !X.jailed() && chance(0.05)) noteOnce("ru_draft" + a, T("Прийшла повістка на строкову службу. Знайомі кажуть, що строковиків теж відправляють «за поребрик».", "A conscription notice arrived. People say conscripts get sent to the front too."), "ev");
      if (chance(0.06)) X.fire("ru_protest");
    }
    // Ukraine: full-scale war.
    if (c === "UKR" && y >= 2022) {
      eff({ h: -2 });
      if (chance(0.3)) log(pickOne([
        T("Ніч у сховищі: ракетна атака на місто.", "A night in the shelter: missile attack on the city."),
        T("Через удари по енергосистемі світло давали лише кілька годин на день.", "Strikes on the power grid meant electricity only a few hours a day."),
        T("Шахеди летіли над будинком усю ніч.", "Shahed drones flew over the house all night."),
      ]), "ev");
      if (chance(0.25)) X.fire("ua_raid");
      if (chance(0.002)) { log(T("Ракета влучила в будинок.", "A missile hit the building."), "bad"); die("war"); return; }
      if (S.sex === "M" && a >= 25 && a <= 60 && !X.jailed() && !M().life.zsu && chance(0.08)) X.fire("ua_mob");
    }
    // North Korea: surveillance state.
    if (c === "PRK") {
      eff({ h: -1, so: -1 });
      if (a >= 14 && chance(0.12)) X.fire("nk_media");
      if (chance(0.08)) log(T("Сусід доніс на сусіда. На зборах інміньбану всіх змусили «самокритикуватися».", "A neighbor informed on a neighbor. At the inminban meeting everyone had to do “self-criticism”."), "ev");
    }
    // China: social credit after a conviction.
    if (c === "CHN" && (S.rec || []).length && chance(0.3))
      noteOnce("cn_credit", T("Через судимість у «соціальному рейтингу» вам заборонили купувати квитки на швидкісні потяги й літаки.", "Because of your record, the “social credit” system banned you from buying train and plane tickets."));
    // Same-sex relationship where it is a crime.
    const p = partner();
    if (p && p.sex === S.sex && LAW.lgbtCrime() && !X.jailed() && chance(0.06)) {
      log(X.punish("lgbt") || "", "bad");
    }
  });

  // ---------- context events ----------
  ev("af_wed", { img: "c_afwed",
    view: () => ({ title: T("Шлюб, який вирішили за вас", "A marriage decided for you"),
      body: T(`Родина домовилася видати вас заміж за чоловіка на ${rand(15, 30)} років старшого. За вас уже отримали «ціну нареченої».`, `Your family arranged to marry you to a man ${rand(15, 30)} years older. They've already accepted a bride price.`),
      fact: T("В Афганістані близько 28% жінок виходять заміж до 18 років (UNICEF).", "In Afghanistan about 28% of women marry before 18 (UNICEF)."),
      choices: [{ k: "accept", label: T("Погодитися", "Accept"), sub: "" }, { k: "refuse", label: T("Відмовитися", "Refuse"), sub: T("Родина може відвернутися", "Your family may turn on you") }, { k: "flee", label: T("Втекти", "Run away"), sub: T("Ризиковано", "Risky") }] }),
    auto: "accept",
    act: (k) => {
      M().afWed = 1;
      if (k === "accept") { eff({ h: -12, so: -4 }); S.fam.married = !0; return T("Вас видали заміж. Відтепер ви жили в домі чоловіка й не могли вийти без дозволу.", "You were married off. From then on you lived in your husband's house and couldn't leave without permission."); }
      if (k === "refuse") { eff({ h: -8, so: -15, hl: -6 }); return chance(0.5) ? T("Батько бив вас кілька днів, поки ви не замовкли. Весілля перенесли.", "Your father beat you for days until you went quiet. The wedding was postponed.") : T("Родина відмовилася від вас. Ви жили в домі тітки, без права виходити.", "Your family disowned you. You lived in an aunt's house, not allowed out."); }
      if (chance(0.4)) { eff({ h: 6 }); return T("Ви втекли до Пакистану з караваном біженців.", "You fled to Pakistan with a refugee convoy."); }
      eff({ h: -15, hl: -10 });
      return T("Вас спіймали на блокпосту без махрама й повернули родині.", "You were caught at a checkpoint without a mahram and returned to your family.") + (chance(0.3) ? X.jail(1, T("«Моральний злочин».", "“Moral crime”.")) : "");
    },
  });
  ev("af_school", { img: null,
    view: () => ({ title: T("Таємна школа", "A secret school"), body: T("Сусідка навчає дівчат у підвалі. Якщо дізнається Талібан — покарають усіх.", "A neighbor teaches girls in a basement. If the Taliban find out, everyone will be punished."),
      choices: [{ k: "go", label: T("Ходити", "Go"), sub: T("Знання↑ · ризик", "Knowledge↑ · risk") }, { k: "no", label: T("Не ризикувати", "Don't risk it"), sub: "" }] }),
    auto: "no",
    act: (k) => {
      M().afSchool = 1;
      if (k === "no") return !1;
      if (chance(0.2)) { eff({ h: -10, so: -5 }); return T("Таліби накрили підпільну школу. Вчительку забрали, а вашого батька змусили підписати зобов'язання.", "The Taliban raided the secret school. The teacher was taken and your father had to sign a pledge."); }
      eff({ sm: 10, h: 5 }); return T("Ви таємно вчилися читати й рахувати. Це було ваше маленьке повстання.", "You secretly learned to read and do math. It was your small rebellion.");
    },
  });
  ev("af_out", { img: null,
    view: () => ({ title: T("Вийти з дому", "Leaving the house"), body: T("Вам треба до лікаря, але жодного чоловіка-родича немає вдома.", "You need a doctor, but no male relative is home."),
      choices: [{ k: "go", label: T("Піти самій", "Go alone"), sub: T("Без махрама", "Without a mahram") }, { k: "wait", label: T("Чекати", "Wait"), sub: T("Здоров'я↓", "Health↓") }] }),
    auto: "wait",
    act: (k) => {
      if (k === "wait") { eff({ hl: -6 }); return T("Ви чекали три дні. Біль став сильнішим.", "You waited three days. The pain got worse."); }
      if (chance(0.35)) { eff({ h: -10, so: -4 }); return T("Патруль «поліції моралі» зупинив вас і відвіз додому. Чоловіка-родича оштрафували.", "A “vice and virtue” patrol stopped you and drove you home. Your male relative was fined."); }
      eff({ hl: 4 }); return T("Ви дійшли до лікарки, закутавшись у паранджу.", "You made it to the (female) doctor wrapped in a burqa.");
    },
  });
  ev("ir_hijab", { img: "c_hijab",
    view: () => ({ title: T("Поліція моралі", "Morality police"), body: T("Патруль «Гашт-е Ершад» зупинив вас: «хіджаб неправильно вдягнутий».", "A Gasht-e Ershad patrol stops you: “your hijab is improper”."),
      fact: T("2022 року 22-річна Махса Аміні померла після затримання поліцією моралі.", "In 2022, 22-year-old Mahsa Amini died after being detained by the morality police."),
      choices: [{ k: "comply", label: T("Поправити хіджаб", "Fix the hijab"), sub: "" }, { k: "refuse", label: T("Відмовитися", "Refuse"), sub: T("«Жінка, життя, свобода»", "“Woman, Life, Freedom”") }] }),
    auto: "comply",
    act: (k) => {
      if (k === "comply") { eff({ h: -3 }); return T("Ви поправили хустку й пішли далі, стиснувши зуби.", "You fixed your scarf and walked on, jaw clenched."); }
      if (chance(0.5)) { eff({ h: -6, hl: -6 }); return T("Вас затримали й побили у фургоні.", "You were detained and beaten in the van.") + (chance(0.4) ? X.jail(rand(1, 3), T("«Порушення громадської моралі».", "“Violating public morals”.")) : ""); }
      eff({ h: 4, so: 3 }); return T("Перехожі заступилися за вас, і патруль поїхав.", "Passers-by stood up for you and the patrol drove off.");
    },
  });
  ev("ru_mob", { img: "c_draft",
    view: () => ({ title: T("Повістка", "Draft notice"), body: T("Вам вручили повістку з військкомату. «Часткова мобілізація».", "You were handed a notice from the enlistment office. “Partial mobilisation”."),
      choices: [{ k: "go", label: T("Піти воювати", "Go to war"), sub: "" }, { k: "hide", label: T("Ховатися", "Hide"), sub: T("Ризик кримінальної справи", "Risk of prosecution") }, { k: "flee", label: T("Виїхати з країни", "Leave the country"), sub: T("Гроші↓", "Money↓") }] }),
    auto: "go",
    act: (k) => {
      if (k === "go") return X.A.svo.start(T("Вас мобілізували.", "You were mobilised."));
      if (k === "hide") return chance(0.25 * policeK()) ? T("Вас знайшли через камери з розпізнаванням облич.", "Facial-recognition cameras found you.") + X.jail(rand(2, 5), T("Ухилення від мобілізації.", "Evading mobilisation.")) : (eff({ h: -6, so: -4 }), T("Ви місяцями не виходили з квартири.", "You didn't leave your apartment for months."));
      money(-inc(0.5) * 0.4, T("Виїзд за кордон", "Leaving abroad")); eff({ h: -4, so: -6 });
      return T("Ви виїхали через Верхній Ларс і кілька місяців жили в Грузії, а потім повернулися, коли все стихло.", "You left via Upper Lars and lived in Georgia for months, coming back once things calmed down.");
    },
  });
  ev("ru_protest", { img: "c_protest", ok: () => S.age >= 16,
    view: () => ({ title: T("Антивоєнний пікет", "Anti-war protest"), body: T("Знайомі виходять на одиночні пікети з чистими аркушами.", "Friends are holding solo protests with blank sheets of paper."),
      choices: [{ k: "go", label: T("Вийти з плакатом", "Hold a sign"), sub: T("«Дискредитація армії»", "“Discrediting the army”") }, { k: "no", label: T("Промовчати", "Stay quiet"), sub: "" }] }),
    auto: "no",
    act: (k) => k === "no" ? (eff({ h: -2 }), !1) : chance(0.7) ? T("Вас затримали за 30 секунд.", "You were detained within 30 seconds.") + (chance(0.4) ? X.jail(rand(2, 7), T("«Фейки про армію».", "“Fakes about the army”.")) : (money(-inc(0.5) * 0.1, T("Штраф", "Fine")), T(" Штраф за «дискредитацію армії».", " A fine for “discrediting the army”."))) : (eff({ h: 4, so: 2 }), T("Вас не помітили. Ви відчули, що не мовчите.", "Nobody noticed. You felt you weren't silent.")),
  });
  ev("ua_mob", { img: "c_draft",
    view: () => ({ title: T("Мобілізація", "Mobilisation"), body: T("ТЦК вручив вам повістку.", "The recruitment center (TCC) handed you a summons."),
      choices: [{ k: "go", label: T("Піти до ЗСУ", "Join the army"), sub: "" }, { k: "hide", label: T("Не виходити з дому", "Stay home"), sub: T("Штраф · ризик", "Fine · risk") }, { k: "bribe", label: T("Дати хабар за «бронь»", "Bribe for an exemption"), sub: T("Гроші↓↓", "Money↓↓") }] }),
    auto: "go",
    act: (k) => {
      if (k === "go") { M().life.zsu = { at: S.age, y: 0 }; eff({ h: -4, so: 4 }); X.deed("zsu", T("Ви пішли захищати країну.", "You went to defend your country."), "svo"); return T("Ви пішли служити до ЗСУ.", "You joined the Armed Forces of Ukraine."); }
      if (k === "bribe") { money(-inc(0.5) * 1.5, T("Хабар", "Bribe")); return chance(0.2) ? T("Схему викрило ДБР.", "The State Bureau of Investigation exposed the scheme.") + X.jail(rand(1, 3)) : T("Ви купили «бронь».", "You bought an exemption."); }
      eff({ h: -6, so: -5 }); money(-inc(0.5) * 0.1, T("Штраф ТЦК", "TCC fine")); return T("Ви роками не виходили з дому без потреби. Отримали штраф.", "For years you didn't leave home unless you had to. You were fined.");
    },
  });
  X.add("zsu", { name: T("Служба в ЗСУ", "Army service"), ok: () => false, noOffer: true, hideOff: true, yearIn: ["front"], where: ["front"], on: () => !!M().life.zsu,
    year: () => { const s = M().life.zsu; s.y++;
      if (chance(0.07)) { delete M().life.zsu; log(T("Ви загинули, захищаючи Україну.", "You were killed defending Ukraine."), "bad"); die("war"); return; }
      if (chance(0.25)) { eff({ hl: -20, h: -8 }); log(T("Вас поранило осколком. Місяці реабілітації.", "Shrapnel wounded you. Months of rehab."), "bad"); } else eff({ h: -5 });
      if (s.y >= 3 && chance(0.3)) { delete M().life.zsu; log(T("Вас демобілізували. Війна лишилася всередині.", "You were demobilised. The war stayed inside you."), "big"); } } }, "act");
  ev("ua_raid", { img: "c_shelter", ok: () => S.age >= 12,
    view: () => ({ title: T("Повітряна тривога", "Air-raid alert"), body: T("Третя ночі. Сирена й сповіщення: «Балістика з півночі».", "3 a.m. A siren and an alert: “Ballistic missiles from the north.”"),
      choices: [{ k: "shelter", label: T("Спуститися в метро", "Go down to the metro"), sub: T("Знову не виспитеся", "No sleep again") }, { k: "stay", label: T("Лишитися вдома за двома стінами", "Stay home behind two walls"), sub: T("Ризик", "Risk") }] }),
    auto: "shelter",
    act: (k) => {
      if (k === "shelter") { eff({ hl: -1, h: -2 }); return T("Ви до ранку сиділи на кариматі в метро серед сотень людей.", "You sat on a camping mat in the metro until morning among hundreds of people."); }
      if (chance(0.01)) { log(T("Уламки влучили у ваш будинок.", "Debris hit your building."), "bad"); die("war"); return null; }
      if (chance(0.1)) { eff({ hl: -12, h: -6 }); return T("Вибуховою хвилею вибило вікна. Вас посікло склом.", "The blast wave blew out the windows. Glass cut you."); }
      eff({ h: -1 }); return T("Ви лежали в коридорі й рахували вибухи.", "You lay in the hallway counting the explosions.");
    },
  });
  ev("nk_media", { img: "c_nkcamp",
    view: () => ({ title: T("Флешка з Півдня", "A USB stick from the South"), body: T("Друг пропонує подивитися південнокорейську дораму з контрабандної флешки.", "A friend offers to show you a South Korean drama from a smuggled USB stick."),
      fact: T("За закон 2020 року за перегляд південнокорейського контенту в КНДР загрожує до 15 років таборів, а за поширення — страта.", "Under a 2020 law, watching South Korean media in North Korea means up to 15 years in a camp; distributing it can mean death."),
      choices: [{ k: "watch", label: T("Подивитися", "Watch"), sub: "" }, { k: "no", label: T("Відмовитися", "Refuse"), sub: "" }] }),
    auto: "no",
    act: (k) => k === "no" ? !1 : chance(0.2) ? T("На вас донесли.", "Someone informed on you.") + X.jail(rand(5, 15), T("Перегляд «ворожих» фільмів.", "Watching “hostile” films.")) : (eff({ h: 6 }), T("Ви вперше побачили, як живуть по той бік кордону.", "For the first time you saw how people live across the border.")),
  });
})();
