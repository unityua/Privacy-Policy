/* 1in8b mod — choices that only exist in prison or at the front, and what those places do to you. */
(() => {
  "use strict";
  const X = window.MOD; if (!X || !X.LAW) return;
  const { T, rand, pickOne, M, cur, inc, money, deed, jail, policeK, yrs } = X;
  const addJ = (key, def) => X.add(key, Object.assign({ img: key }, def), "jail");
  const addF = (key, def) => X.add(key, Object.assign({ img: key }, def), "front");
  const extend = (n) => { S.flags.prisonUntil = (S.flags.prisonUntil || S.age) + n; S.flags.prisonLen = (S.flags.prisonLen || 0) + n; return " " + T(`До строку додали ${yrs(n)}.`, `${yrs(n)} added to your sentence.`); };
  const shorten = (n) => { S.flags.prisonUntil = Math.max(S.age + 1, (S.flags.prisonUntil || S.age) - n); };
  const leftY = () => Math.max(0, (S.flags.prisonUntil || S.age) - S.age);
  const svo = () => !!M().life.svo;

  // ===================== PRISON =====================
  addJ("p_gang", {
    name: T("Тюремне угруповання", "Prison gang"), ok: () => S.age >= 14, on: () => !!M().life.p_gang, where: ["jail"], yearIn: ["jail"],
    ask: T("«Смотрящий» камери пропонує стати «своїм». Захист — в обмін на послуги.", "The cell's boss offers to make you “one of us”. Protection in exchange for favors."),
    start: () => { M().life.p_gang = S.age; X.dark(1); eff({ so: 3 }); deed("p_gang", T("Стали членом тюремного угруповання.", "Joined a prison gang.")); return T("Вас прийняли. Відтепер за вас заступаються — і від вас чекають «справ».", "You're in. Now they have your back, and they expect “jobs” from you."); },
    stopLabel: () => T("Вийти з угруповання", "Leave the gang"),
    stop: () => { delete M().life.p_gang; eff({ hl: -15, so: -6 }); return T("Вихід коштував вам зламаних ребер.", "Leaving cost you broken ribs."); },
    year: () => {
      eff({ hl: 2 });
      if (chance(0.2)) log(T("Угруповання доручило вам «справу». Адміністрація дізналася.", "The gang gave you a “job”. The administration found out.") + extend(rand(1, 3)), "bad");
      if (chance(0.04)) { log(T("Війна угруповань у колонії. Вас знайшли в душовій.", "A gang war broke out in the colony. You were found in the showers."), "bad"); die("hom"); }
    },
  });
  addJ("p_fight", {
    name: T("Битися за повагу", "Fight for respect"), ok: () => true, where: ["jail"], need: ["fit"],
    ask: T("Новий сусід по камері перевіряє вас на міцність.", "A new cellmate is testing how tough you are."),
    start: () => {
      deed("p_fight", T("Билися у в'язниці.", "Fought in prison.")); X.dark(0.5);
      let t = chance(0.5) ? (eff({ so: 4 }), T("Ви відстояли себе. Більше вас не чіпали.", "You stood your ground. Nobody bothered you after that.")) : (eff({ hl: -12, h: -6 }), T("Вас побили. Тиждень у санчастині.", "You got beaten. A week in the infirmary."));
      if (chance(0.25)) t += " " + T("Вас кинули в ШІЗО на 15 діб.", "You were thrown into solitary for 15 days.") + (chance(0.4) ? extend(1) : "");
      return t;
    },
  });
  addJ("p_contraband", {
    name: T("Контрабанда в зоні", "Smuggle contraband"), ok: () => true, where: ["jail"],
    ask: T("Через «дорогу» можна заносити телефони й наркотики. На зоні це золото.", "Phones and drugs can come in through the “road”. Inside, they're gold."),
    start: () => {
      deed("p_contraband", T("Торгували контрабандою у в'язниці.", "Smuggled contraband in prison.")); X.dark(0.5);
      if (chance(0.3)) return T("Під час шмону знайшли схованку.", "A cell search found your stash.") + extend(rand(1, 3));
      money(inc(0.5) * 0.3, T("Контрабанда", "Contraband"));
      if (!S.drug && chance(0.2)) { S.drug = { since: S.age, y: 0 }; return T("Справа пішла. А потім ви й самі почали вживати товар.", "Business went well. Then you started using the product yourself."); }
      return T("Ви стали людиною, через яку на зону заходять телефони.", "You became the person who gets phones into the colony.");
    },
  });
  addJ("p_escape", {
    name: T("Втеча", "Escape"), ok: () => leftY() >= 2, where: ["jail"], need: ["fit"],
    ask: () => T(`До кінця строку ще ${yrs(leftY())}. У стіні є слабке місце.`, `${yrs(leftY())} left on your sentence. There's a weak spot in the wall.`),
    start: () => {
      deed("p_escape", T("Втекли з в'язниці.", "Escaped from prison."));
      if (chance(0.06)) { log(T("Вартовий на вишці відкрив вогонь.", "The guard in the tower opened fire."), "bad"); die("hom"); return null; }
      if (chance(0.07)) { S.job = "seeking"; S.flags.prisonUntil = S.age; M().fugitive = { at: S.age, left: leftY() || 3 }; eff({ h: 10 }); return T("Ви втекли! Тепер ви живете під чужим ім'ям і здригаєтеся від кожної сирени.", "You escaped! Now you live under a false name and flinch at every siren."); }
      eff({ hl: -10, h: -8 }); return T("Вас спіймали за 200 метрів від стіни.", "You were caught 200 meters from the wall.") + extend(rand(3, 5));
    },
  });
  addJ("p_snitch", {
    name: T("Співпрацювати з адміністрацією", "Snitch to the administration"), ok: () => true, where: ["jail"], img: null,
    ask: T("Опер пропонує скоротити строк, якщо розповідатимете, що коїться в камері.", "An officer offers you a shorter sentence if you report what's going on in the cell."),
    start: () => {
      if (chance(0.12)) { if (chance(0.3)) { log(T("Зеки дізналися, що ви «стукач».", "The inmates found out you were a snitch."), "bad"); die("hom"); return null; } eff({ hl: -25, so: -15 }); return T("Камера дізналася, що ви «стукач». Ви вижили, але відтоді — найнижча каста.", "The cell found out you were a snitch. You survived, but you're the lowest caste now."); }
      shorten(Math.max(1, Math.round(leftY() * 0.3))); eff({ so: -3 }); return T("Ви здали кількох людей. Вам скоротили строк.", "You gave up a few people. Your sentence was cut.");
    },
  });
  addJ("p_study", {
    name: T("Вчитися й працювати", "Study and work"), ok: () => true, where: ["jail"], img: null,
    ask: T("У колонії є бібліотека, школа й цех. Добра поведінка — шанс на УДЗ.", "The colony has a library, a school and a workshop. Good behavior means a shot at parole."),
    start: () => { eff({ sm: 8, h: 3 }); M().pStudy = (M().pStudy || 0) + 1; if (chance(0.35)) { shorten(1); return T("Ви вчилися й працювали. Суд звільнив вас умовно-достроково на рік раніше.", "You studied and worked. The court granted parole a year early."); } return T("Ви отримали атестат і професію зварника.", "You earned a diploma and a welding qualification."); },
  });
  // what prison does to you
  X.yearHooks.push(() => {
    if (X.ctx() === "jail" && !M().pow) {
      if (!M().life.p_gang && chance(0.12)) { eff({ hl: -10, h: -6 }); log(pickOne([T("Вас побили в камері через борг за чай.", "You were beaten in your cell over a tea debt."), T("Охорона влаштувала «прийомку» з кийками.", "The guards gave you a “welcome” with batons.")]), "bad"); }
      if (["RUS", "UKR", "KAZ", "BLR", "IND", "ZAF", "BRA", "PHL"].includes(cur()) && chance(0.04)) {
        if (chance(0.15)) { log(T("Ви заразилися туберкульозом у переповненому бараку. Лікування не допомогло.", "You caught tuberculosis in the overcrowded barracks. Treatment didn't help."), "bad"); die("tb"); return; }
        eff({ hl: -15 }); log(T("У бараку спалах туберкульозу. Ви перехворіли.", "TB broke out in the barracks. You got sick."), "bad");
      }
      if (cur() === "RUS" && S.sex === "M" && S.age <= 55 && !M().life.svo && chance(0.15)) queue(0.5, "dec", "mod_act", { k: "svo", offer: 1 });
    }
    // on the run
    const f = M().fugitive;
    if (f && X.ctx() === "free") {
      eff({ h: -2 });
      if (chance(0.2 * policeK())) { delete M().fugitive; log(T("Вас упізнали на камері в метро. Втеча закінчилася.", "A metro camera recognized you. The run was over.") + jail(f.left + rand(2, 4), T("Втеча з місць позбавлення волі.", "Escaping custody.")), "bad"); }
    }
    // prisoner of war
    if (M().pow && S.age >= M().pow.until) {
      const p = M().pow; delete M().pow;
      S.job = "seeking"; S.flags.prisonUntil = S.age;
      log(T("Вас обміняли й повернули додому.", "You were exchanged and sent home."), "big");
      if (p.side === "RUS" && chance(0.3)) log(T("Удома на вас завели справу за «добровільну здачу в полон».", "Back home you were charged with “voluntary surrender”.") + jail(rand(3, 10)), "bad");
    }
  });

  // ===================== FRONT =====================
  addF("f_desert", {
    name: T("Самовільно залишити частину (СЗЧ)", "Desert (AWOL)"), ok: () => true, where: ["front"],
    ask: T("Ще один штурм — і ви не повернетеся. Можна піти вночі.", "One more assault and you won't come back. You could leave at night."),
    start: () => {
      const ru = svo(); delete M().life.svo; delete M().life.zsu;
      deed("f_desert", T("Дезертирували з фронту.", "Deserted from the front."));
      if (chance(ru ? 0.45 : 0.35)) return T("Військова поліція затримала вас на блокпосту.", "Military police caught you at a checkpoint.") + jail(rand(5, ru ? 10 : 12), T("Дезертирство.", "Desertion."));
      M().fugitive = { at: S.age, left: 5 }; eff({ h: 4, so: -6 });
      return ru ? T("Ви переховуєтеся в селі в родичів. Повістки приходять щотижня.", "You're hiding at relatives' in a village. Notices come every week.") : T("Ви повернулися додому й живете тихо, без документів.", "You went home and live quietly, without papers.");
    },
  });
  addF("f_surrender", {
    name: T("Здатися в полон", "Surrender"), ok: () => svo(), where: ["front"],
    fact: () => T("Проєкт «Хочу жить» допомагає російським військовим здатися в полон до ЗСУ.", "The “I Want to Live” project helps Russian soldiers surrender to Ukrainian forces."),
    ask: T("Вночі ви чуєте по рації частоту «Хочу жить».", "At night you hear the “I Want to Live” frequency on the radio."),
    start: () => {
      deed("f_surrender", T("Здалися в полон.", "Surrendered."));
      if (chance(0.1)) { log(T("Свій дрон помітив, як ви йдете з піднятими руками.", "One of your own drones saw you walking with your hands up."), "bad"); die("war"); return null; }
      if (chance(0.25)) { eff({ hl: -15, h: -10 }); return T("Командир помітив вашу спробу. Тиждень у «ямі».", "Your commander caught you trying. A week in “the pit”."); }
      delete M().life.svo; M().pow = { at: S.age, until: S.age + rand(1, 3), side: "RUS" };
      S.job = "prison"; S.flags.prisonUntil = M().pow.until; S.flags.prisonLen = M().pow.until - S.age; S.flags.paroleAsked = 1;
      return T("Ви здалися. Вас відвезли до табору для військовополонених в Україні. Вперше за довгий час ви спали без вибухів.", "You surrendered and were taken to a POW camp in Ukraine. For the first time in ages you slept without explosions.");
    },
  });
  addF("f_loot", {
    name: T("Мародерство", "Looting"), ok: () => true, where: ["front"],
    ask: T("У покинутому селі стоять цілі хати. Інші вже вантажать пральні машини.", "Houses in the abandoned village are still intact. Others are already loading washing machines."),
    start: () => {
      money(inc(0.5) * 0.4, T("Награбоване", "Loot")); X.dark(1); eff({ h: -2 });
      deed("f_loot", T("Мародерили в окупованому селі.", "Looted an occupied village."));
      if (chance(0.1)) return T("Відео з вами в чужій хаті облетіло мережу. Вас ідентифікували.", "A video of you in someone's house went viral. You were identified.") + (chance(0.5) ? jail(rand(2, 5), T("Мародерство.", "Looting.")) : "");
      return T("Ви відправили додому посилку з чужими речами.", "You shipped home a parcel of other people's things.");
    },
  });
  addF("f_crime", {
    name: T("Злочинний наказ", "Unlawful order"), ok: () => svo(), where: ["front"], img: "svo",
    ask: T("Командир наказує розстріляти полонених. «Свідків не лишати».", "The commander orders you to shoot the prisoners. “Leave no witnesses.”"),
    fact: () => T("Розстріл полонених — воєнний злочин за Женевськими конвенціями.", "Killing prisoners of war is a war crime under the Geneva Conventions."),
    yes: T("Виконати", "Obey"), no: T("Відмовитися", "Refuse"),
    start: () => { X.dark(3); X.count("warcrimes"); eff({ h: -20, so: -5 }); deed("svo", T("Виконали злочинний наказ — воєнний злочин.", "Obeyed an unlawful order: a war crime.")); M().warCrime = S.age; return T("Ви виконали наказ. Ці обличчя ви бачитимете до кінця життя.", "You obeyed the order. You'll see those faces for the rest of your life."); },
    noDo: () => { if (chance(0.1)) { log(T("За відмову вас «обнулили».", "For refusing, you were “zeroed”."), "bad"); die("war"); return null; } eff({ hl: -15, h: 4 }); return T("Ви відмовилися. Вас тиждень тримали в ямі, але руки ваші чисті.", "You refused. They kept you in a pit for a week, but your hands are clean."); },
  });
  addF("f_hero", {
    name: T("Добровільно на складне завдання", "Volunteer for a dangerous mission"), ok: () => true, where: ["front"], img: "f_wound", need: ["fit"],
    ask: T("Треба витягти пораненого побратима з-під обстрілу.", "A wounded comrade needs to be pulled out under fire."),
    start: () => {
      if (chance(0.15)) { log(T("Ви не повернулися з завдання.", "You didn't come back from the mission."), "bad"); die("war"); return null; }
      if (chance(0.5)) { eff({ so: 10, h: 6 }); M().medal = S.age; return T("Ви витягли побратима. Вам вручили медаль.", "You pulled your comrade out. You were awarded a medal."); }
      eff({ hl: -20 }); return T("Вас поранило, але побратим вижив.", "You were wounded, but your comrade survived.");
    },
  });
  // war crimes can come back
  X.yearHooks.push(() => {
    if (M().warCrime != null && X.ctx() === "free" && !M().warCrimeCaught && chance(0.04)) {
      M().warCrimeCaught = 1;
      log(T("Слідчі ідентифікували вас за відео з дрона. Ви в розшуку за воєнні злочини й не можете виїхати з країни.", "Investigators identified you from drone footage. You're wanted for war crimes and can't leave the country."), "bad");
      eff({ h: -6 });
    }
  });
})();
