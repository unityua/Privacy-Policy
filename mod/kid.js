/* 1in8b mod — bad choices from early childhood. Each one feeds M().dark (crime offers come more often later),
 * some set lasting traits: M().triad (fire + cruelty to animals → serial-killer path weighs more),
 * S.smoker, juvenile records, school trouble, gang ties. */
(() => {
  "use strict";
  const X = window.MOD; if (!X || !X.LAW) return;
  const { T, rand, pickOne, M, inc, money, deed, jail, policeK } = X;
  const K = () => (M().kid = M().kid || {});
  const parents = () => { try { return (S.fam.mom.alive && !S.fam.mom.absent) || (S.fam.dad.alive && !S.fam.dad.absent); } catch { return true; } };
  const juv = (what) => { if (S.age >= 14) { try { recAdd({ k: "juv", s: "juv", y: 0 }); } catch {} return " " + T("Вас поставили на облік у поліції.", "You got a juvenile police record."); } return ""; };
  const triad = () => { const k = K(); if (k.fire && k.animal && !M().triad) M().triad = S.age; };
  const add = (key, def) => X.add(key, Object.assign({ img: key, where: ["kid", "free"] }, def), "kid");

  add("k_bully", {
    name: T("Цькувати однокласника", "Bully a classmate"), ok: () => S.age >= 6 && S.age <= 17, need: ["school"],
    ask: T("У класі є тихий новенький. Усі сміються, коли з нього кепкують.", "There's a quiet new kid in class. Everyone laughs when someone mocks him."),
    start: () => {
      X.dark(1); K().bully = (K().bully || 0) + 1; eff({ so: 3, h: 1 });
      deed("k_bully", T("У школі цькували однокласника.", "Bullied a classmate at school."));
      if (chance(0.3)) { eff({ h: -4, so: -2 }); return T("Ви з друзями цькували новенького. Вчителька викликала батьків.", "You and your friends bullied the new kid. The teacher called your parents in."); }
      return pickOne([T("Ви сховали його рюкзак у туалеті. Клас реготав.", "You hid his backpack in the toilets. The class roared."), T("Ви придумали йому образливе прізвисько. Воно прилипло до нього до випуску.", "You gave him a cruel nickname. It stuck until graduation.")]);
    },
  });
  add("k_steal", {
    name: T("Вкрасти гроші в батьків", "Steal from your parents"), ok: () => S.age >= 5 && S.age <= 15 && parents(), need: ["home"],
    ask: T("Мамин гаманець лежить у коридорі. Там вистачить на цукерки й наліпки.", "Mom's wallet is in the hallway. There's enough for candy and stickers."),
    start: () => {
      X.dark(1); K().steal = (K().steal || 0) + 1; money(inc(0.5) * 0.005, T("Вкрадене в батьків", "Taken from parents"));
      deed("k_steal", T("Крали гроші в батьків.", "Stole money from your parents."));
      if (chance(0.4 + 0.1 * K().steal)) { eff({ h: -6, so: -4 }); return T("Батьки помітили. Вас покарали, і мама довго не дивилася вам в очі.", "Your parents noticed. You were punished, and Mom wouldn't look you in the eye for a long time."); }
      return T("Ніхто не помітив. Це виявилося дуже легко.", "Nobody noticed. It turned out to be very easy.");
    },
  });
  add("k_fire", {
    name: T("Гратися з вогнем", "Play with fire"), ok: () => S.age >= 6 && S.age <= 15,
    ask: T("Ви знайшли коробку сірників. Вогонь заворожує.", "You found a box of matches. The flames are mesmerizing."),
    start: () => {
      X.dark(1); K().fire = (K().fire || 0) + 1; triad();
      deed("k_fire", T("Підпалювали речі.", "Set things on fire."));
      if (chance(0.12)) { money(-inc(0.5) * 0.3, T("Пожежа", "Fire")); eff({ h: -8, so: -6 }); return T("Вогонь перекинувся на сарай сусідів. Приїхали пожежники, батьки платили за збитки.", "The fire spread to the neighbors' shed. Firefighters came; your parents paid for the damage.") + juv(); }
      return T("Ви підпалили сміттєвий бак за гаражами й дивилися, як він горить.", "You set a trash barrel on fire behind the garages and watched it burn.");
    },
  });
  add("k_animal", {
    name: T("Знущатися з тварин", "Be cruel to animals"), ok: () => S.age >= 5 && S.age <= 14,
    ask: T("Біля під'їзду бродяча кішка. Друзі кажуть: «Слабо?»", "There's a stray cat by the entrance. Your friends say: “Bet you won't.”"),
    start: () => {
      X.dark(2); K().animal = 1; triad(); eff({ so: -3 });
      deed("k_animal", T("Знущалися з тварин.", "Were cruel to animals."));
      return chance(0.4) ? T("Сусідка побачила й розповіла батькам. Вони не знали, що з вами робити.", "A neighbor saw and told your parents. They didn't know what to do with you.") : T("Кішка втекла. Друзі сміялися, але дехто з них відтоді вас уникав.", "The cat escaped. Your friends laughed, but some avoided you after that.");
    },
  });
  add("k_skip", {
    name: T("Прогулювати школу", "Skip school"), ok: () => S.age >= 7 && S.age <= 17, need: ["school"],
    ask: T("Зранку так не хочеться на контрольну. Можна піти на майданчик.", "You really don't want to take the test this morning. You could go to the playground."),
    start: () => {
      K().skip = (K().skip || 0) + 1; eff({ sm: -5, h: 3 }); X.dark(0.5);
      deed("k_skip", T("Прогулювали школу.", "Skipped school."));
      if (K().skip >= 3 && !K().held) { K().held = 1; eff({ sm: -8, h: -5 }); return T("Через прогули вас залишили на другий рік.", "Because of truancy you were held back a year."); }
      return chance(0.4) ? (eff({ so: -3 }), T("Класна керівниця подзвонила батькам. Був скандал.", "Your homeroom teacher called your parents. There was a huge row.")) : T("Ви весь день просиділи на гойдалках. Ніхто не дізнався.", "You spent all day on the swings. Nobody found out.");
    },
  });
  add("k_smoke", {
    name: T("Курити / нюхати клей", "Smoke / sniff glue"), ok: () => S.age >= 9 && S.age <= 17,
    view: () => ({ body: T("Старші хлопці за гаражами пропонують сигарету. Дехто нюхає клей із пакета.", "Older kids behind the garages offer a cigarette. Some are sniffing glue from a bag."),
      choices: [{ k: "cig", label: T("Закурити", "Smoke"), sub: T("Звичка на роки", "A habit for years") }, { k: "glue", label: T("Нюхнути клей", "Sniff glue"), sub: T("Мозок↓ Здоров'я↓", "Brain↓ Health↓") }, { k: "no", label: T("Відмовитися", "Refuse"), sub: "" }] }),
    act: (k) => {
      if (k === "no") return !1;
      X.dark(0.5); K().smoke = 1;
      deed("k_smoke", k === "cig" ? T(`Почали курити в ${S.age}.`, `Started smoking at ${S.age}.`) : T("Нюхали клей.", "Sniffed glue."));
      if (k === "cig") { S.smoker = !0; eff({ hl: -2, so: 2 }); return T("Ви закурили першу сигарету. Через рік уже не могли без них.", "You smoked your first cigarette. A year later you couldn't go without."); }
      eff({ hl: -8, sm: -6 }); K().glue = (K().glue || 0) + 1;
      if (K().glue >= 2 && !S.drug && chance(0.3)) { S.drug = { since: S.age, y: 0 }; return T("Клей став щоденним. Потім знайшлося щось сильніше.", "Glue became a daily thing. Then something stronger came along."); }
      return T("Голова паморочилася, світ плив. Наступного дня боліло все.", "Your head spun and the world swam. Everything hurt the next day.");
    },
  });
  add("k_vandal", {
    name: T("Вандалізм", "Vandalism"), ok: () => S.age >= 8 && S.age <= 17,
    ask: T("Друзі взяли балончики з фарбою й камінці. Нова зупинка якраз чиста.", "Friends grabbed spray cans and rocks. The new bus stop is still clean."),
    start: () => {
      X.dark(0.5); K().vandal = (K().vandal || 0) + 1; eff({ so: 2 });
      deed("k_vandal", T("Трощили й розмальовували чуже.", "Vandalized other people's property."));
      if (chance(0.25 * policeK())) { money(-inc(0.5) * 0.08, T("Штраф за вандалізм", "Vandalism fine")); eff({ so: -4 }); return T("Вас спіймали на камеру. Батьки заплатили штраф.", "A camera caught you. Your parents paid the fine.") + juv(); }
      return T("Ви розбили скло на зупинці й лишили свій «тег». Він провисів там роками.", "You smashed the bus-stop glass and left your tag. It stayed there for years.");
    },
  });
  add("k_runaway", {
    name: T("Втекти з дому", "Run away from home"), ok: () => S.age >= 8 && S.age <= 17, need: ["home"],
    ask: T("Після чергової сварки вдома ви складаєте рюкзак.", "After yet another fight at home you pack a backpack."),
    start: () => {
      K().runaway = (K().runaway || 0) + 1; eff({ so: -6 });
      deed("k_runaway", T(`Втекли з дому в ${S.age}.`, `Ran away from home at ${S.age}.`));
      const r = Math.random();
      if (r < 0.55) { eff({ h: -3 }); return T("Через два дні поліція знайшла вас на вокзалі й привезла додому.", "Two days later the police found you at the station and brought you home."); }
      if (r < 0.85) { eff({ h: 2 }); return T("Ви тиждень жили в друга. Батьки шукали вас з волонтерами.", "You lived at a friend's for a week. Your parents searched for you with volunteers."); }
      X.dark(1); eff({ hl: -10, h: -8 }); return T("Ви місяць жили на вулиці. Там ви навчилися речей, яких дітям знати не треба.", "You lived on the street for a month. You learned things children shouldn't know.");
    },
  });
  add("k_fight", {
    name: T("Побитися в школі", "Fight at school"), ok: () => S.age >= 6 && S.age <= 17, need: ["school"],
    ask: T("Старшокласник штовхнув вас у коридорі. Всі дивляться.", "An older kid shoved you in the hallway. Everyone is watching."),
    start: () => {
      K().fight = (K().fight || 0) + 1; X.dark(0.5);
      deed("k_fight", T("Билися в школі.", "Got into fights at school."));
      let t = chance(0.5) ? (eff({ so: 4, h: 3 }), T("Ви вийшли переможцем. Відтепер вас поважали — і трохи боялися.", "You won. From then on people respected you, and feared you a little.")) : (eff({ hl: -6, h: -4 }), T("Вам розбили губу. Наступного дня ви прийшли з синцем.", "You got a split lip and showed up with a bruise the next day."));
      if (chance(0.2)) { eff({ sm: -4 }); t += " " + T("Вас відсторонили від уроків на тиждень.", "You were suspended for a week."); }
      return t;
    },
  });
  add("k_gang", {
    name: T("Вступити в банду", "Join a street gang"), ok: () => S.age >= 11 && S.age <= 17, on: () => !!M().life.k_gang, endIn: ["jail", "front"],
    ask: T("Старші з району кличуть «у свої». Обіцяють захист, гроші й повагу.", "The older guys from the block invite you in. They promise protection, money and respect."),
    start: () => { M().life.k_gang = S.age; X.dark(2); eff({ so: 4 }); deed("k_gang", T(`У ${S.age} вступили в банду.`, `Joined a gang at ${S.age}.`)); return T("Вас прийняли в банду. Перше завдання — віднести «посилку».", "You were accepted into the gang. First job: deliver a “package”."); },
    stopLabel: () => T("Вийти з банди", "Leave the gang"),
    stop: () => { delete M().life.k_gang; if (chance(0.3)) { eff({ hl: -12 }); return T("З банди так просто не йдуть. Вас побили, але відпустили.", "You don't just leave a gang. They beat you, but let you go."); } return T("Ви перестали з ними водитися.", "You stopped hanging out with them."); },
    year: () => {
      X.dark(1); money(inc(0.4) * 0.15, T("Банда", "Gang")); eff({ h: -1, so: 1 });
      if (!S.drug && chance(0.1)) { S.drug = { since: S.age, y: 0 }; log(T("У банді ви почали вживати.", "In the gang you started using drugs."), "bad"); }
      if (chance(0.03)) { log(T("Розбірка з іншою бандою закінчилася ножем.", "A fight with a rival gang ended with a knife."), "bad"); die("hom"); return; }
      if (chance(0.1 * policeK())) { delete M().life.k_gang; log(T("Вас затримали під час пограбування кіоску.", "You were caught robbing a kiosk.") + jail(rand(1, 3), T("Пограбування.", "Robbery.")), "bad"); }
    },
  });

  // ---- the past catches up ----
  X.yearHooks.push(() => {
    const k = K(), dark = M().dark || 0;
    if (k.bully && S.age >= 22 && S.age <= 45 && !k.bullyBack && chance(0.06)) {
      k.bullyBack = 1; eff({ so: -6, h: -4 });
      log(pickOne([T("Колишній однокласник написав пост про те, як ви цькували його в школі. Його поширили тисячі людей.", "A former classmate wrote a post about how you bullied him at school. Thousands shared it."),
        T("Ви випадково зустріли того самого «новенького». Він подивився на вас і мовчки перейшов на інший бік вулиці.", "You ran into that “new kid” by chance. He looked at you and silently crossed the street.")]), "bad");
    }
    if (dark >= 5 && S.age >= 18 && chance(0.25)) eff({ so: -1 });
    if (k.runaway >= 2 && !k.street && S.age < 18 && chance(0.15)) { k.street = 1; M().homeless = { at: S.age }; log(T("Ви вкотре втекли й цього разу не повернулися. Тепер ваш дім — вокзал.", "You ran away again, and this time you didn't go back. The station is your home now."), "bad"); }
    if (M().triad && S.age >= 16 && !k.triadNote && chance(0.2)) { k.triadNote = 1; log(T("Іноді вам здається, що всередині вас є щось холодне й темне.", "Sometimes you feel there's something cold and dark inside you."), "ev"); }
  });
})();
