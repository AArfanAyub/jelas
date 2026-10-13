/* JELAS — app state, CRUD and all money calculations.
 * The decrypted state lives in memory only; persistence is always encrypted.
 * Original implementation.
 */
(function () {
  'use strict';

  var SCHEMA = 1;
  var state = null;
  var key = null;          // CryptoKey, held in memory only
  var dirty = false;
  var saveTimer = null;

  /* ---------------- helpers ---------------- */
  function uid(prefix) {
    return (prefix || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* Every id is forced into a safe charset. Because ids are interpolated into
     HTML attributes (data-id="..."), allowing quotes or angle brackets there
     would be an injection vector — especially from a crafted backup file.
     This makes that vector structurally impossible. */
  var ID_RE = /[^A-Za-z0-9_-]/g;
  function safeId(v, prefix) {
    var s = String(v == null ? '' : v).replace(ID_RE, '');
    if (!s) s = uid(prefix || 'x');
    return s.slice(0, 40);
  }
  function todayISO() { return ymd(new Date()); }
  function ymd(d) {
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }
  function parseYMD(s) {
    var p = String(s).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function startOfWeek(d) { // Monday
    var x = startOfDay(d);
    var wd = (x.getDay() + 6) % 7;
    return addDays(x, -wd);
  }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
  function daysInMonth(d) { return endOfMonth(d).getDate(); }
  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }

  /* ---------------- default state ---------------- */
  function defaultState(opts) {
    opts = opts || {};
    return {
      schemaVersion: SCHEMA,
      createdAt: Date.now(),
      settings: {
        currency: 'MYR',
        method: opts.method || '5020',
        theme: 'auto',
        locale: opts.locale || 'en',
        reduceMotion: false,
        haptics: true,
        privacyBlur: false,
        screenshotBlock: true,
        autoLock: 15,
        bio: false,
        receiptScan: false,
        monthlyLimit: 0        // 0 = not set
      },
      accounts: opts.accounts || [],
      categories: JSON.parse(JSON.stringify(window.JELAS_SEED.CATEGORY_SEED)),
      transactions: [],
      budgets: [],
      goals: [],
      debts: [],
      bills: [],
      netWorthHistory: [],
      checklists: JSON.parse(JSON.stringify(window.JELAS_SEED.CHECKLIST_SEED)).map(function (c) {
        c.items = c.items.map(function (i) { return { id: i.id, key: i.key, done: false }; });
        c.lastReset = Date.now();
        return c;
      }),
      challenges: [],
      badges: [],
      lessons: {},
      moods: {},
      wishlist: [],
      reminders: {
        daily: { on: false, time: '21:00' },
        weekly: { on: false, day: 0, time: '20:00' },
        monthly: { on: false, time: '09:00' }
      },
      meta: { lastBackup: null, schemaVersion: SCHEMA, limitAlerts: {} }
    };
  }

  /* ---------------- lifecycle ---------------- */
  function init(snapshot, cryptoKey) {
    key = cryptoKey;
    state = snapshot || defaultState();
    migrate();
    return state;
  }

  function migrate() {
    if (!state.schemaVersion) state.schemaVersion = SCHEMA;
    if (!state.categories || !state.categories.length) {
      state.categories = JSON.parse(JSON.stringify(window.JELAS_SEED.CATEGORY_SEED));
    }
    if (!state.settings) state.settings = defaultState().settings;
    if (!state.reminders) state.reminders = defaultState().reminders;
    if (!state.meta) state.meta = { lastBackup: null, schemaVersion: SCHEMA };
    if (!state.meta.limitAlerts) state.meta.limitAlerts = {};
    if (state.settings.monthlyLimit == null) state.settings.monthlyLimit = 0;
    if (!state.checklists) state.checklists = defaultState().checklists;
    if (!state.wishlist) state.wishlist = [];
    if (!state.bills) state.bills = [];
    if (!state.netWorthHistory) state.netWorthHistory = [];
    if (!state.moods) state.moods = {};
    if (!state.badges) state.badges = [];
  }

  function get() { return state; }
  function setKey(k) { key = k; }

  function save(immediate) {
    if (!key) return Promise.resolve(false);
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!immediate) {
      return new Promise(function (resolve) {
        saveTimer = setTimeout(function () {
          saveTimer = null;
          window.JELAS_DB.saveSnapshot(key, state).then(function () { resolve(true); })
            .catch(function () { resolve(false); });
        }, 250);
      });
    }
    return window.JELAS_DB.saveSnapshot(key, state).then(function () { return true; })
      .catch(function () { return false; });
  }

  /* ---------------- accounts ---------------- */
  function addAccount(a) {
    var acct = {
      id: safeId(a.id, 'a'),
      name: a.name || 'Account',
      type: a.type || 'cash',
      openingBalance: round2(a.openingBalance || 0),
      archived: false,
      meta: a.meta || {},
      createdAt: Date.now()
    };
    state.accounts.push(acct);
    save();
    return acct;
  }
  function updateAccount(id, patch) {
    var a = state.accounts.find(function (x) { return x.id === id; });
    if (!a) return null;
    Object.keys(patch).forEach(function (k) { a[k] = patch[k]; });
    save();
    return a;
  }
  function deleteAccount(id) {
    state.accounts = state.accounts.filter(function (a) { return a.id !== id; });
    state.transactions = state.transactions.filter(function (t) {
      return t.accountId !== id && t.toAccountId !== id;
    });
    save();
  }
  function accountBalance(id) {
    var a = state.accounts.find(function (x) { return x.id === id; });
    if (!a) return 0;
    var bal = num(a.openingBalance);
    state.transactions.forEach(function (t) {
      if (t.type === 'income' && t.accountId === id) bal += num(t.amount);
      else if (t.type === 'expense' && t.accountId === id) bal -= num(t.amount);
      else if (t.type === 'transfer') {
        if (t.accountId === id) bal -= num(t.amount);
        if (t.toAccountId === id) bal += num(t.amount);
      }
    });
    return round2(bal);
  }
  function accountType(id) {
    var a = state.accounts.find(function (x) { return x.id === id; });
    return a ? a.type : 'cash';
  }
  function isLiability(id) {
    var t = accountType(id);
    return t === 'credit' || t === 'loan';
  }
  function totalAssets() {
    var s = 0;
    state.accounts.filter(function (a) { return !a.archived; }).forEach(function (a) {
      var bal = accountBalance(a.id);
      // A liability account (card / loan) with a POSITIVE balance means you are
      // in credit — that is an asset, not a debt.
      if (isLiability(a.id)) { if (bal > 0) s += bal; }
      else s += bal;
    });
    return round2(s);
  }
  function totalLiabilities() {
    var s = 0;
    state.accounts.filter(function (a) { return !a.archived && isLiability(a.id); })
      .forEach(function (a) {
        var bal = accountBalance(a.id);
        if (bal < 0) s += -bal;   // only what is actually owed
      });
    state.debts.forEach(function (d) { s += num(d.balance); });
    return round2(s);
  }
  function netWorth() { return round2(totalAssets() - totalLiabilities()); }

  /* ---------------- categories ---------------- */
  function addCategory(c) {
    var cat = {
      id: safeId(c.id, 'c'),
      name: c.name || 'Category',
      icon: c.icon || 'other',
      color: c.color || '#8A8375',
      kind: c.kind || 'want',
      parentId: c.parentId || null,
      archived: false
    };
    state.categories.push(cat);
    save();
    return cat;
  }
  function updateCategory(id, patch) {
    var c = state.categories.find(function (x) { return x.id === id; });
    if (!c) return null;
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    save();
    return c;
  }
  function deleteCategory(id) {
    state.categories = state.categories.filter(function (c) { return c.id !== id; });
    state.transactions.forEach(function (t) { if (t.categoryId === id) t.categoryId = null; });
    state.budgets = state.budgets.filter(function (b) { return b.categoryId !== id; });
    save();
  }
  function category(id) {
    return state.categories.find(function (c) { return c.id === id; }) || null;
  }
  function categoriesByKind(kind) {
    return state.categories.filter(function (c) { return c.kind === kind && !c.archived; });
  }

  /* ---------------- transactions ---------------- */
  function addTransaction(t) {
    var tx = {
      id: safeId(t.id, 't'),
      type: t.type || 'expense',
      amount: round2(Math.abs(num(t.amount))),
      accountId: t.accountId || null,
      toAccountId: t.toAccountId || null,
      categoryId: t.categoryId || null,
      date: t.date || todayISO(),
      note: t.note || '',
      tags: t.tags || [],
      receiptId: t.receiptId || null,
      recurringId: t.recurringId || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    state.transactions.push(tx);
    afterTx();
    return tx;
  }
  function updateTransaction(id, patch) {
    var t = state.transactions.find(function (x) { return x.id === id; });
    if (!t) return null;
    Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
    t.amount = round2(Math.abs(num(t.amount)));
    t.updatedAt = Date.now();
    afterTx();
    return t;
  }
  function deleteTransaction(id) {
    var t = state.transactions.find(function (x) { return x.id === id; });
    state.transactions = state.transactions.filter(function (x) { return x.id !== id; });
    if (t && t.receiptId) {
      window.JELAS_DB.delReceipt(t.receiptId).catch(function () {});
    }
    afterTx();
  }
  function transaction(id) {
    return state.transactions.find(function (t) { return t.id === id; }) || null;
  }
  function afterTx() {
    recomputeBadges();
    try { snapshotNetWorth(); } catch (e) {}
    save();
  }

  /* ---------------- queries ---------------- */
  function inRange(t, from, to) {
    var d = parseYMD(t.date).getTime();
    return d >= from.getTime() && d <= to.getTime();
  }
  function txsBetween(from, to) {
    return state.transactions.filter(function (t) { return inRange(t, from, to); })
      .sort(function (a, b) {
        var d = parseYMD(b.date).getTime() - parseYMD(a.date).getTime();
        if (d !== 0) return d;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }
  function stats(from, to) {
    var tin = 0, tout = 0;
    state.transactions.forEach(function (t) {
      if (!inRange(t, from, to)) return;
      if (t.type === 'income') tin += num(t.amount);
      else if (t.type === 'expense') tout += num(t.amount);
    });
    return { in: round2(tin), out: round2(tout), net: round2(tin - tout) };
  }
  function categoryTotals(from, to) {
    var map = {};
    state.transactions.forEach(function (t) {
      if (t.type !== 'expense') return;
      if (!inRange(t, from, to)) return;
      var k = t.categoryId || 'uncat';
      map[k] = round2((map[k] || 0) + num(t.amount));
    });
    var arr = Object.keys(map).map(function (k) {
      var c = category(k);
      return {
        id: k,
        name: c ? c.name : '—',
        color: c ? c.color : '#8A8375',
        icon: c ? c.icon : 'other',
        total: map[k]
      };
    });
    arr.sort(function (a, b) { return b.total - a.total; });
    return arr;
  }
  function monthStats(date) {
    var d = date ? new Date(date) : new Date();
    return stats(startOfMonth(d), endOfMonth(d));
  }
  function weekStats(date) {
    var d = date ? new Date(date) : new Date();
    var s = startOfWeek(d);
    return stats(s, addDays(s, 6));
  }
  function dayStats(date) {
    var d = date ? new Date(date) : new Date();
    return stats(startOfDay(d), startOfDay(d));
  }

  /* ---------------- budgets & safe to spend ---------------- */
  /* Effective budget for this month, including any rollover of last month's unspent amount. */
  function budgetFor(categoryId) {
    var b = state.budgets.find(function (x) { return x.categoryId === categoryId; });
    if (!b) return 0;
    var base = num(b.amount);
    if (!b.rollover) return base;
    var prev = new Date();
    prev.setDate(0); // last day of the previous month
    var spentLast = spentInCategoryMonth(categoryId, prev);
    return round2(base + Math.max(0, base - spentLast));
  }
  function budgetBase(categoryId) {
    var b = state.budgets.find(function (x) { return x.categoryId === categoryId; });
    return b ? num(b.amount) : 0;
  }
  function setBudget(categoryId, amount, period, rollover) {
    var b = state.budgets.find(function (x) { return x.categoryId === categoryId; });
    if (b) {
      b.amount = round2(num(amount));
      if (period) b.period = period;
      if (rollover != null) b.rollover = !!rollover;
    } else {
      state.budgets.push({
        id: uid('b'), categoryId: categoryId, amount: round2(num(amount)),
        period: period || 'month', rollover: !!rollover
      });
    }
    save();
  }
  function removeBudget(categoryId) {
    state.budgets = state.budgets.filter(function (b) { return b.categoryId !== categoryId; });
    save();
  }
  function totalBudgeted() {
    var s = 0;
    state.budgets.forEach(function (b) { s += budgetFor(b.categoryId); });
    return round2(s);
  }
  function spentInCategoryMonth(categoryId, date) {
    var d = date ? new Date(date) : new Date();
    var s = 0;
    state.transactions.forEach(function (t) {
      if (t.type !== 'expense' || t.categoryId !== categoryId) return;
      if (inRange(t, startOfMonth(d), endOfMonth(d))) s += num(t.amount);
    });
    return round2(s);
  }
  function monthIncome(date) { return monthStats(date).in; }

  /* ---------------- monthly spending limit ---------------- */
  function monthlyLimit() { return num(state.settings.monthlyLimit); }

  function setMonthlyLimit(n) {
    state.settings.monthlyLimit = Math.max(0, round2(num(n)));
    save();
    return state.settings.monthlyLimit;
  }

  /* Everything the UI needs to render the limit card in one call. */
  function monthLimitStatus(date) {
    var d = date ? new Date(date) : new Date();
    var limit = monthlyLimit();
    var spent = monthStats(d).out;
    var daysLeft = daysInMonth(d) - d.getDate() + 1;
    var remaining = round2(limit - spent);
    var pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    var level = 'none';
    if (limit > 0) level = pct >= 100 ? 'over' : (pct >= 80 ? 'warn' : 'ok');
    return {
      limit: limit, spent: round2(spent), remaining: remaining,
      pct: pct, daysLeft: daysLeft, level: level,
      perDay: limit > 0 ? round2(Math.max(0, remaining) / Math.max(1, daysLeft)) : 0,
      usedDays: d.getDate(),
      dailyBudget: limit > 0 ? round2(limit / daysInMonth(d)) : 0
    };
  }

  /* Fire once per threshold crossing, so the toast does not nag. */
  function checkLimitAlerts(date) {
    var st = monthLimitStatus(date);
    if (st.limit <= 0) return null;
    var iso = ymd(date ? new Date(date) : new Date()).slice(0, 7);
    if (!state.meta.limitAlerts) state.meta.limitAlerts = {};
    var seen = state.meta.limitAlerts[iso] || {};
    var fire = null;
    if (st.pct >= 100 && !seen.over) { seen.over = true; fire = 'over'; }
    else if (st.pct >= 80 && !seen.warn) { seen.warn = true; fire = 'warn'; }
    if (fire) { state.meta.limitAlerts[iso] = seen; save(); }
    return fire;
  }

  /* ---------------- safe to spend ---------------- */
  /* Priority: an explicit monthly limit, then per-category budgets, then income left. */
  function safeToSpend(date) {
    var d = date ? new Date(date) : new Date();
    var left = daysInMonth(d) - d.getDate() + 1;
    var st = monthStats(d);
    // money already promised to bills that are still due this month
    var reserved = billsReserveUntil(endOfMonth(d), d);

    var limit = monthlyLimit();
    if (limit > 0) {
      var remaining = limit - st.out - reserved;
      return {
        value: round2(Math.max(0, remaining) / Math.max(1, left)),
        hasBudget: true, source: 'limit',
        remaining: round2(remaining), limit: limit, spent: round2(st.out), reserved: reserved
      };
    }

    var budgeted = totalBudgeted();
    if (budgeted > 0) {
      var rem2 = budgeted - st.out - reserved;
      return {
        value: round2(Math.max(0, rem2) / Math.max(1, left)),
        hasBudget: true, source: 'budget',
        remaining: round2(rem2), limit: round2(budgeted), spent: round2(st.out), reserved: reserved
      };
    }

    var rem3 = st.in - st.out - reserved;
    return {
      value: round2(Math.max(0, rem3) / Math.max(1, left)),
      hasBudget: false, source: 'income',
      remaining: round2(rem3), limit: 0, spent: round2(st.out), reserved: reserved
    };
  }

  function toBeBudgeted(date) {
    var d = date ? new Date(date) : new Date();
    return round2(monthStats(d).in - totalBudgeted());
  }

  /* ---------------- streak ---------------- */
  function loggingStreak() {
    var days = {};
    state.transactions.forEach(function (t) { days[t.date] = true; });
    var streak = 0;
    var cur = startOfDay(new Date());
    // allow today to be empty without breaking the streak (grace until tomorrow)
    if (!days[ymd(cur)]) cur = addDays(cur, -1);
    while (days[ymd(cur)]) { streak++; cur = addDays(cur, -1); }
    return streak;
  }
  function bestStreak() {
    var list = Object.keys(state.transactions.map(function (t) { return t.date; })
      .reduce(function (m, d) { m[d] = true; return m; }, {})).sort();
    var best = 0, run = 0, prev = null;
    list.forEach(function (d) {
      var dt = parseYMD(d);
      if (prev && (dt.getTime() - prev.getTime()) === 86400000) run++;
      else run = 1;
      if (run > best) best = run;
      prev = dt;
    });
    return best;
  }
  function hasTxOn(iso) {
    return state.transactions.some(function (t) { return t.date === iso; });
  }

  /* ---------------- goals ---------------- */
  function addGoal(g) {
    var goal = {
      id: safeId(g.id, 'g'),
      name: g.name || 'Goal',
      target: round2(num(g.target)),
      saved: round2(num(g.saved)),
      deadline: g.deadline || null,
      icon: g.icon || 'target',
      color: g.color || '#1F6F63',
      emergency: !!g.emergency,
      contributions: [],
      createdAt: Date.now()
    };
    state.goals.push(goal);
    save();
    return goal;
  }
  function contributeGoal(id, amount) {
    var g = state.goals.find(function (x) { return x.id === id; });
    if (!g) return null;
    var amt = round2(num(amount));
    g.saved = round2(g.saved + amt);
    g.contributions.push({ at: Date.now(), amount: amt });
    if (g.saved >= g.target && g.target > 0) awardBadge('b_goal');
    save();
    return g;
  }
  function deleteGoal(id) {
    state.goals = state.goals.filter(function (g) { return g.id !== id; });
    save();
  }

  /* ---------------- debts ---------------- */
  function addDebt(d) {
    var debt = {
      id: safeId(d.id, 'd'),
      name: d.name || 'Debt',
      principal: round2(num(d.principal)),
      balance: round2(num(d.balance)),
      rate: num(d.rate),
      minPayment: round2(num(d.minPayment)),
      dueDay: d.dueDay || null,
      icon: d.icon || 'debt',
      createdAt: Date.now()
    };
    state.debts.push(debt);
    save();
    return debt;
  }
  function payDebt(id, amount) {
    var d = state.debts.find(function (x) { return x.id === id; });
    if (!d) return null;
    d.balance = round2(Math.max(0, d.balance - num(amount)));
    save();
    return d;
  }
  function deleteDebt(id) {
    state.debts = state.debts.filter(function (d) { return d.id !== id; });
    save();
  }
  function payoffMonths(balance, rate, monthly) {
    balance = num(balance); monthly = num(monthly);
    if (monthly <= 0) return Infinity;
    var r = num(rate) / 100 / 12;
    if (r <= 0) return Math.ceil(balance / monthly);
    if (monthly <= balance * r) return Infinity;
    var n = -Math.log(1 - (balance * r) / monthly) / Math.log(1 + r);
    return Math.ceil(n);
  }

  /* ---------------- zakat ---------------- */
  function zakat(z) {
    z = z || {};
    var assets = num(z.cash) + num(z.gold) + num(z.silver) + num(z.investments) + num(z.receivables);
    var net = round2(assets - num(z.liabilities));
    var nisab = round2(85 * num(z.goldPrice || 320));
    var due = net >= nisab && nisab > 0;
    return { assets: round2(assets), net: net, nisab: nisab, due: due, amount: due ? round2(net * 0.025) : 0 };
  }

  /* ---------------- challenges & badges ---------------- */
  function startChallenge(seed) {
    if (state.challenges.some(function (c) { return c.id === seed.id && c.status === 'active'; })) return null;
    var c = {
      id: seed.id, key: seed.key, type: seed.type, days: seed.days || null,
      status: 'active', progress: 0, startDate: todayISO(),
      endDate: seed.days ? ymd(addDays(new Date(), seed.days)) : null
    };
    state.challenges.push(c);
    save();
    return c;
  }
  function endChallenge(id, completed) {
    var c = state.challenges.find(function (x) { return x.id === id; });
    if (!c) return;
    c.status = completed ? 'done' : 'gaveup';
    if (completed && c.key === 'no_spend') awardBadge('b_nospend');
    save();
  }
  function awardBadge(id) {
    if (state.badges.indexOf(id) === -1) {
      state.badges.push(id);
      return true;
    }
    return false;
  }
  function recomputeBadges() {
    var earned = [];
    if (state.transactions.length > 0) earned.push('b_first');
    var s = loggingStreak();
    if (s >= 7) earned.push('b_streak7');
    if (s >= 30) earned.push('b_streak30');
    earned.forEach(function (b) { awardBadge(b); });
    // budget boss: within budget for a full past month
    if (totalBudgeted() > 0) {
      var lastMonth = new Date(); lastMonth.setDate(0);
      var spent = stats(startOfMonth(lastMonth), endOfMonth(lastMonth)).out;
      if (spent > 0 && spent <= totalBudgeted()) awardBadge('b_budget');
    }
  }
  function hasBadge(id) { return state.badges.indexOf(id) !== -1; }

  /* ---------------- checklists ---------------- */
  function toggleCheckItem(listId, itemId) {
    var l = state.checklists.find(function (x) { return x.id === listId; });
    if (!l) return;
    var it = l.items.find(function (i) { return i.id === itemId; });
    if (!it) return;
    it.done = !it.done;
    save();
    return it.done;
  }
  function resetChecklist(listId) {
    var l = state.checklists.find(function (x) { return x.id === listId; });
    if (!l) return;
    l.items.forEach(function (i) { i.done = false; });
    l.lastReset = Date.now();
    save();
  }
  function addChecklist(name, period, items) {
    var l = {
      id: uid('cl'), key: null, name: name, period: period || 'once', icon: 'checklist',
      custom: true, lastReset: Date.now(),
      items: (items || []).map(function (t) { return { id: uid('i'), text: t, done: false }; })
    };
    state.checklists.push(l);
    save();
    return l;
  }
  function addCheckItem(listId, text) {
    var l = state.checklists.find(function (x) { return x.id === listId; });
    if (!l) return;
    l.items.push({ id: uid('i'), text: text, done: false });
    save();
  }
  function deleteChecklist(listId) {
    state.checklists = state.checklists.filter(function (l) { return l.id !== listId; });
    save();
  }
  function checklistProgress(listId) {
    var l = state.checklists.find(function (x) { return x.id === listId; });
    if (!l || !l.items.length) return { done: 0, total: 0, pct: 0 };
    var d = l.items.filter(function (i) { return i.done; }).length;
    return { done: d, total: l.items.length, pct: Math.round((d / l.items.length) * 100) };
  }

  /* ---------------- lessons ---------------- */
  function markLessonRead(id) { state.lessons[id] = true; save(); }
  function lessonsReadCount() { return Object.keys(state.lessons).filter(function (k) { return state.lessons[k]; }).length; }

  /* ---------------- moods ---------------- */
  function setMood(iso, mood) { state.moods[iso] = mood; save(); }

  /* ---------------- wishlist ---------------- */
  function addWish(name, price) {
    state.wishlist.push({ id: uid('w'), name: name, price: round2(num(price)), coolUntil: null, createdAt: Date.now() });
    save();
  }
  function deleteWish(id) { state.wishlist = state.wishlist.filter(function (w) { return w.id !== id; }); save(); }
  function startCoolDown(id, hours) {
    var w = state.wishlist.find(function (x) { return x.id === id; });
    if (!w) return;
    w.coolUntil = Date.now() + (hours || 24) * 3600 * 1000;
    save();
  }
  function canAfford(price) {
    var liquid = 0;
    state.accounts.filter(function (a) { return !a.archived && !isLiability(a.id); })
      .forEach(function (a) { liquid += accountBalance(a.id); });
    var sts = safeToSpend();
    return { ok: liquid >= num(price) && sts.value > 0, liquid: round2(liquid) };
  }

  /* ---------------- settings ---------------- */
  function setSetting(k, v) {
    state.settings[k] = v;
    save();
  }

  /* ---------------- insights ---------------- */
  function insights() {
    var out = [];
    var now = new Date();
    var thisM = monthStats(now);
    var lastMDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var lastM = monthStats(lastMDate);
    var t = window.I18N.t;

    if (state.transactions.length === 0) return out;

    // biggest category this month
    var cats = categoryTotals(startOfMonth(now), endOfMonth(now));
    if (cats.length) {
      var top = cats[0];
      var share = thisM.out > 0 ? Math.round((top.total / thisM.out) * 100) : 0;
      out.push({
        icon: top.icon, tone: 'neutral',
        text: t('ins.top_cat', { cat: top.name, pct: share })
      });
    }
    // month over month
    if (lastM.out > 0) {
      var diff = Math.round(((thisM.out - lastM.out) / lastM.out) * 100);
      if (Math.abs(diff) >= 10) {
        out.push({
          icon: diff > 0 ? 'up' : 'down', tone: diff > 0 ? 'bad' : 'good',
          text: t(diff > 0 ? 'ins.more' : 'ins.less', { pct: Math.abs(diff) })
        });
      }
    }
    // savings rate
    if (thisM.in > 0) {
      var rate = Math.round(((thisM.in - thisM.out) / thisM.in) * 100);
      out.push({
        icon: 'piggy', tone: rate >= 20 ? 'good' : (rate >= 0 ? 'neutral' : 'bad'),
        text: t('ins.savings', { pct: rate })
      });
    }
    // small-spend awareness
    var small = 0, smallCount = 0;
    state.transactions.forEach(function (tx) {
      if (tx.type === 'expense' && inRange(tx, startOfMonth(now), endOfMonth(now)) && num(tx.amount) <= 15) {
        small += num(tx.amount); smallCount++;
      }
    });
    if (smallCount >= 5) {
      out.push({
        icon: 'coffee', tone: 'neutral',
        text: t('ins.small', { n: smallCount, amt: window.I18N.money(small) })
      });
    }
    return out.slice(0, 4);
  }

  /* ---------------- restore validation ---------------- */
  /* A backup file is untrusted input. Everything is whitelisted, type-coerced,
     length-capped and re-keyed so a crafted .jelas file cannot inject markup,
     pollute prototypes, or corrupt the store. */
  function sanitizeState(raw) {
    var out = defaultState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;

    var arr = function (v) { return Array.isArray(v) ? v : []; };
    var str = function (v, max) { return String(v == null ? '' : v).slice(0, max || 200); };
    var numOr = function (v, d) { var n = Number(v); return isNaN(n) ? (d || 0) : n; };

    var s = (raw.settings && typeof raw.settings === 'object') ? raw.settings : {};
    ['currency', 'method', 'theme', 'locale', 'reduceMotion', 'haptics',
      'privacyBlur', 'screenshotBlock', 'autoLock', 'bio', 'receiptScan'].forEach(function (k) {
      if (s[k] !== undefined) out.settings[k] = s[k];
    });
    out.settings.currency = 'MYR';
    out.settings.autoLock = Math.max(0, Math.min(3600, numOr(out.settings.autoLock, 15)));
    out.settings.monthlyLimit = Math.max(0, round2(numOr(s.monthlyLimit)));
    ['reduceMotion', 'haptics', 'privacyBlur', 'screenshotBlock', 'bio', 'receiptScan'].forEach(function (k) {
      out.settings[k] = !!out.settings[k];
    });
    if (['5020', 'zero', 'envelope', 'pyf'].indexOf(out.settings.method) === -1) out.settings.method = '5020';
    if (['auto', 'light', 'dark'].indexOf(out.settings.theme) === -1) out.settings.theme = 'auto';
    if (['en', 'ms', 'zh'].indexOf(out.settings.locale) === -1) out.settings.locale = 'en';

    out.accounts = arr(raw.accounts).slice(0, 500).map(function (a) {
      return {
        id: safeId(a && a.id, 'a'), name: str(a && a.name, 60) || 'Account',
        type: str(a && a.type, 20) || 'cash',
        openingBalance: round2(numOr(a && a.openingBalance)),
        archived: !!(a && a.archived), meta: {},
        createdAt: numOr(a && a.createdAt, Date.now())
      };
    });
    out.categories = arr(raw.categories).slice(0, 500).map(function (c) {
      return {
        id: safeId(c && c.id, 'c'), name: str(c && c.name, 60) || 'Category',
        icon: str(c && c.icon, 30) || 'other',
        color: /^#[0-9a-fA-F]{3,8}$/.test(String(c && c.color)) ? c.color : '#8A8375',
        kind: ['need', 'want', 'save', 'income'].indexOf(c && c.kind) === -1 ? 'want' : c.kind,
        parentId: (c && c.parentId) ? safeId(c.parentId) : null,
        archived: !!(c && c.archived)
      };
    });
    if (!out.categories.length) {
      out.categories = JSON.parse(JSON.stringify(window.JELAS_SEED.CATEGORY_SEED));
    }

    var acctIds = {}, catIds = {};
    out.accounts.forEach(function (a) { acctIds[a.id] = 1; });
    out.categories.forEach(function (c) { catIds[c.id] = 1; });

    out.transactions = arr(raw.transactions).slice(0, 20000).map(function (t) {
      var acc = (t && t.accountId) ? safeId(t.accountId) : '';
      var to = (t && t.toAccountId) ? safeId(t.toAccountId) : '';
      var cat = (t && t.categoryId) ? safeId(t.categoryId) : '';
      return {
        id: safeId(t && t.id, 't'),
        type: ['expense', 'income', 'transfer'].indexOf(t && t.type) === -1 ? 'expense' : t.type,
        amount: round2(Math.abs(numOr(t && t.amount))),
        accountId: acctIds[acc] ? acc : null,
        toAccountId: acctIds[to] ? to : null,
        categoryId: catIds[cat] ? cat : null,
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(t && t.date)) ? t.date : todayISO(),
        note: str(t && t.note, 500),
        tags: arr(t && t.tags).slice(0, 20).map(function (x) { return str(x, 30); }),
        receiptId: (t && t.receiptId) ? safeId(t.receiptId, 'r') : null,
        recurringId: null, createdAt: numOr(t && t.createdAt, Date.now()), updatedAt: Date.now()
      };
    });

    out.budgets = arr(raw.budgets).slice(0, 500).filter(function (b) {
      return b && catIds[safeId(b.categoryId)];
    }).map(function (b) {
      return {
        id: safeId(b.id, 'b'), categoryId: safeId(b.categoryId),
        amount: round2(numOr(b.amount)),
        period: b.period === 'week' ? 'week' : 'month', rollover: !!b.rollover
      };
    });

    out.goals = arr(raw.goals).slice(0, 200).map(function (g) {
      return {
        id: safeId(g && g.id, 'g'), name: str(g && g.name, 60) || 'Goal',
        target: round2(numOr(g && g.target)), saved: round2(numOr(g && g.saved)),
        deadline: (g && g.deadline && /^\d{4}-\d{2}-\d{2}$/.test(String(g.deadline))) ? g.deadline : null,
        icon: str(g && g.icon, 30) || 'target', color: '#1F6F63',
        emergency: !!(g && g.emergency), contributions: [],
        createdAt: numOr(g && g.createdAt, Date.now())
      };
    });

    out.debts = arr(raw.debts).slice(0, 200).map(function (d) {
      return {
        id: safeId(d && d.id, 'd'), name: str(d && d.name, 60) || 'Debt',
        principal: round2(numOr(d && d.principal)), balance: round2(numOr(d && d.balance)),
        rate: numOr(d && d.rate), minPayment: round2(numOr(d && d.minPayment)),
        dueDay: (d && d.dueDay) ? numOr(d.dueDay) : null,
        icon: str(d && d.icon, 30) || 'debt', createdAt: numOr(d && d.createdAt, Date.now())
      };
    });

    out.checklists = arr(raw.checklists).slice(0, 100).map(function (l) {
      return {
        id: safeId(l && l.id, 'cl'), key: (l && l.key) ? str(l.key, 30) : null,
        name: (l && l.custom) ? str(l.name, 60) : null,
        period: ['week', 'month', 'once'].indexOf(l && l.period) === -1 ? 'once' : l.period,
        icon: str(l && l.icon, 30) || 'checklist', custom: !!(l && l.custom),
        lastReset: numOr(l && l.lastReset, Date.now()),
        items: arr(l && l.items).slice(0, 100).map(function (i) {
          return {
            id: safeId(i && i.id, 'i'),
            key: (i && i.key) ? str(i.key, 40) : null,
            text: (i && i.text) ? str(i.text, 200) : null,
            done: !!(i && i.done)
          };
        })
      };
    });
    if (!out.checklists.length) out.checklists = defaultState().checklists;

    out.challenges = arr(raw.challenges).slice(0, 50).map(function (c) {
      return {
        id: safeId(c && c.id, 'ch'), key: str(c && c.key, 30), type: str(c && c.type, 20),
        days: (c && c.days) ? numOr(c.days) : null,
        status: ['active', 'done', 'gaveup'].indexOf(c && c.status) === -1 ? 'active' : c.status,
        progress: numOr(c && c.progress),
        startDate: str(c && c.startDate, 10),
        endDate: (c && c.endDate) ? str(c.endDate, 10) : null
      };
    });

    out.badges = arr(raw.badges).slice(0, 50).map(function (b) { return str(b, 30); });

    var lessons = {};
    if (raw.lessons && typeof raw.lessons === 'object') {
      window.JELAS_SEED.LESSON_ORDER.forEach(function (k) { if (raw.lessons[k]) lessons[k] = true; });
    }
    out.lessons = lessons;

    var moods = {};
    if (raw.moods && typeof raw.moods === 'object') {
      Object.keys(raw.moods).slice(0, 4000).forEach(function (k) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) &&
            ['great', 'ok', 'worried', 'stressed'].indexOf(raw.moods[k]) !== -1) {
          moods[k] = raw.moods[k];
        }
      });
    }
    out.moods = moods;

    out.wishlist = arr(raw.wishlist).slice(0, 200).map(function (w) {
      return {
        id: safeId(w && w.id, 'w'), name: str(w && w.name, 60),
        price: round2(numOr(w && w.price)),
        coolUntil: (w && w.coolUntil) ? numOr(w.coolUntil) : null,
        createdAt: numOr(w && w.createdAt, Date.now())
      };
    });

    out.bills = arr(raw.bills).slice(0, 200).map(function (b) {
      var acc = (b && b.accountId) ? safeId(b.accountId) : '';
      var cat2 = (b && b.categoryId) ? safeId(b.categoryId) : '';
      return {
        id: safeId(b && b.id, 'bl'),
        name: str(b && b.name, 60) || 'Bill',
        amount: round2(numOr(b && b.amount)),
        categoryId: catIds[cat2] ? cat2 : null,
        accountId: acctIds[acc] ? acc : null,
        dueDay: Math.max(1, Math.min(31, numOr(b && b.dueDay, 1))),
        frequency: ['monthly', 'weekly', 'yearly'].indexOf(b && b.frequency) === -1 ? 'monthly' : b.frequency,
        lastPaidYM: /^\d{4}-\d{2}$/.test(String(b && b.lastPaidYM)) ? b.lastPaidYM : null,
        active: !(b && b.active === false),
        icon: str(b && b.icon, 30) || 'repeat',
        createdAt: numOr(b && b.createdAt, Date.now())
      };
    });

    out.netWorthHistory = arr(raw.netWorthHistory).slice(-60).filter(function (e) {
      return e && /^\d{4}-\d{2}$/.test(String(e.ym));
    }).map(function (e) {
      return {
        ym: e.ym,
        assets: round2(numOr(e.assets)),
        liabilities: round2(numOr(e.liabilities)),
        net: round2(numOr(e.net))
      };
    });

    var rem = (raw.reminders && typeof raw.reminders === 'object') ? raw.reminders : {};
    ['daily', 'weekly', 'monthly'].forEach(function (k) {
      if (rem[k] && typeof rem[k] === 'object') {
        out.reminders[k].on = !!rem[k].on;
        if (/^\d{2}:\d{2}$/.test(String(rem[k].time))) out.reminders[k].time = rem[k].time;
      }
    });
    if (rem.weekly && typeof rem.weekly === 'object') {
      out.reminders.weekly.day = Math.max(0, Math.min(6, numOr(rem.weekly.day)));
    }

    out.meta = {
      lastBackup: (raw.meta && raw.meta.lastBackup) ? numOr(raw.meta.lastBackup) : null,
      schemaVersion: SCHEMA,
      limitAlerts: {}
    };
    out.schemaVersion = SCHEMA;
    out.createdAt = numOr(raw.createdAt, Date.now());
    return out;
  }

  /* ---------------- bills & subscriptions ---------------- */
  /* Normalise any frequency to a monthly figure. */
  function monthlyEquivalent(b) {
    var a = num(b.amount);
    if (b.frequency === 'weekly') return round2(a * 52 / 12);
    if (b.frequency === 'yearly') return round2(a / 12);
    return round2(a);
  }

  function addBill(b) {
    var bill = {
      id: safeId(b.id, 'bl'),
      name: String(b.name || 'Bill').slice(0, 60),
      amount: round2(num(b.amount)),
      categoryId: b.categoryId || null,
      accountId: b.accountId || null,
      dueDay: Math.max(1, Math.min(31, num(b.dueDay) || 1)),
      frequency: ['monthly', 'weekly', 'yearly'].indexOf(b.frequency) === -1 ? 'monthly' : b.frequency,
      lastPaidYM: null,
      active: true,
      icon: b.icon || 'repeat',
      createdAt: Date.now()
    };
    state.bills.push(bill);
    save();
    return bill;
  }

  function updateBill(id, patch) {
    var b = state.bills.find(function (x) { return x.id === id; });
    if (!b) return null;
    Object.keys(patch).forEach(function (k) { b[k] = patch[k]; });
    if (b.dueDay) b.dueDay = Math.max(1, Math.min(31, num(b.dueDay)));
    save();
    return b;
  }

  function deleteBill(id) {
    state.bills = state.bills.filter(function (b) { return b.id !== id; });
    save();
  }

  function activeBills() {
    return state.bills.filter(function (b) { return b.active !== false; });
  }

  /* The next time this bill falls due, from a given date. */
  function nextDueDate(bill, from) {
    var d = from ? new Date(from) : new Date();
    var day = Math.max(1, Math.min(31, num(bill.dueDay) || 1));
    var y = d.getFullYear(), m = d.getMonth();
    function make(yy, mm) {
      var dim = new Date(yy, mm + 1, 0).getDate();
      return new Date(yy, mm, Math.min(day, dim));
    }
    var candidate = make(y, m);
    if (startOfDay(candidate) < startOfDay(d)) {
      var nm = m + 1, ny = y;
      if (nm > 11) { nm = 0; ny++; }
      candidate = make(ny, nm);
    }
    return candidate;
  }

  /* Bills due within N days (default 7), soonest first. */
  function billsDueWithin(days, from) {
    var now = from ? new Date(from) : new Date();
    var limit = addDays(startOfDay(now), days == null ? 7 : days);
    return activeBills().map(function (b) {
      var due = nextDueDate(b, now);
      return {
        bill: b,
        due: due,
        daysUntil: Math.round((startOfDay(due) - startOfDay(now)) / 86400000)
      };
    }).filter(function (x) { return x.due <= limit; })
      .sort(function (a, b) { return a.due - b.due; });
  }

  /* Money to set aside for bills still unpaid before a date (used by safe-to-spend). */
  function billsReserveUntil(endDate, from) {
    var now = from ? new Date(from) : new Date();
    var ym = ymd(now).slice(0, 7);
    var total = 0;
    activeBills().forEach(function (b) {
      if (b.lastPaidYM === ym) return;            // already paid this month
      if (nextDueDate(b, now) <= endDate) total += num(b.amount);
    });
    return round2(total);
  }

  function monthlyBillsTotal() {
    var s = 0;
    activeBills().forEach(function (b) { s += monthlyEquivalent(b); });
    return round2(s);
  }

  /* Pay a bill: log the expense and remember it was paid this month. */
  function markBillPaid(id, accountIdOverride) {
    var b = state.bills.find(function (x) { return x.id === id; });
    if (!b) return null;
    var acct = accountIdOverride || b.accountId ||
      (state.accounts.filter(function (a) { return !a.archived; })[0] || {}).id || null;
    var tx = addTransaction({
      type: 'expense',
      amount: b.amount,
      accountId: acct,
      categoryId: b.categoryId,
      date: todayISO(),
      note: b.name,
      tags: ['bill']
    });
    b.lastPaidYM = ymd(new Date()).slice(0, 7);
    save();
    return tx;
  }

  function isBillPaid(b, date) {
    var ym = ymd(date ? new Date(date) : new Date()).slice(0, 7);
    return b.lastPaidYM === ym;
  }

  /* ---------------- auto-categorisation ---------------- */
  /* Learn from what you have already logged: same note wins, partial match votes. */
  function suggestCategory(note, type) {
    if (!note) return null;
    var n = String(note).toLowerCase().trim();
    if (n.length < 2) return null;
    var wantKind = (type === 'income') ? 'income' : null;
    var scores = {};
    state.transactions.forEach(function (t) {
      if (!t.categoryId || !t.note) return;
      var c = category(t.categoryId);
      if (!c) return;
      if (wantKind && c.kind !== 'income') return;
      if (!wantKind && c.kind === 'income') return;
      var tn = String(t.note).toLowerCase();
      if (tn === n) scores[t.categoryId] = (scores[t.categoryId] || 0) + 3;
      else if (tn.indexOf(n) >= 0 || n.indexOf(tn) >= 0) scores[t.categoryId] = (scores[t.categoryId] || 0) + 1;
    });
    var best = null, bestScore = 0;
    Object.keys(scores).forEach(function (k) {
      if (scores[k] > bestScore) { bestScore = scores[k]; best = k; }
    });
    return bestScore >= 2 ? best : null;
  }

  /* ---------------- quick templates ---------------- */
  function frequentTemplates(limit) {
    var map = {};
    state.transactions.forEach(function (t) {
      if (t.type === 'transfer') return;
      var key = t.type + '|' + (t.categoryId || '') + '|' + t.amount + '|' + String(t.note || '').toLowerCase();
      if (!map[key]) map[key] = { count: 0, t: t };
      map[key].count++;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .filter(function (x) { return x.count >= 2; })
      .sort(function (a, b) { return b.count - a.count || (b.t.createdAt || 0) - (a.t.createdAt || 0); })
      .slice(0, limit || 6)
      .map(function (x) {
        return {
          type: x.t.type, amount: x.t.amount, categoryId: x.t.categoryId,
          accountId: x.t.accountId, note: x.t.note, count: x.count
        };
      });
  }

  /* ---------------- net worth history ---------------- */
  function snapshotNetWorth() {
    if (!state.netWorthHistory) state.netWorthHistory = [];
    var ym = ymd(new Date()).slice(0, 7);
    var entry = state.netWorthHistory.find(function (e) { return e.ym === ym; });
    var a = totalAssets(), l = totalLiabilities();
    if (entry) { entry.assets = a; entry.liabilities = l; entry.net = round2(a - l); }
    else state.netWorthHistory.push({ ym: ym, assets: a, liabilities: l, net: round2(a - l) });
    if (state.netWorthHistory.length > 60) {
      state.netWorthHistory.splice(0, state.netWorthHistory.length - 60);
    }
    state.netWorthHistory.sort(function (x, y) { return x.ym < y.ym ? -1 : 1; });
    save();
    return state.netWorthHistory;
  }

  function netWorthSeries(months) {
    var h = state.netWorthHistory || [];
    return h.slice(-1 * (months || 12)).map(function (e) {
      var p = e.ym.split('-');
      return { label: window.I18N.fmtDate(new Date(Number(p[0]), Number(p[1]) - 1, 1), 'month'), value: e.net };
    });
  }

  /* ---------------- Ask JELAS (offline, rule-based) ---------------- */
  function ask(q) {
    var query = String(q || '').toLowerCase().trim();
    if (!query) return null;
    var now = new Date();
    var from, to, rangeKey = 'this_month';
    var label = window.I18N.t('report.this_month');

    function mk(key, f, t2, lbl) { rangeKey = key; from = f; to = t2; label = lbl; }

    if (/\btoday\b|hari ini|今天/.test(query)) {
      mk('today', startOfDay(now), startOfDay(now), window.I18N.t('common.today'));
    } else if (/\byesterday\b|semalam|昨天/.test(query)) {
      var y = addDays(now, -1);
      mk('yesterday', startOfDay(y), startOfDay(y), window.I18N.fmtDate(y));
    } else if (/last week|minggu lepas|上周/.test(query)) {
      var lw = addDays(startOfWeek(now), -7);
      mk('last_week', lw, addDays(lw, 6), window.I18N.t('common.week'));
    } else if (/this week|minggu ini|本周/.test(query)) {
      var tw = startOfWeek(now);
      mk('this_week', tw, addDays(tw, 6), window.I18N.t('common.week'));
    } else if (/last month|bulan lepas|上月/.test(query)) {
      var lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      mk('last_month', startOfMonth(lm), endOfMonth(lm), window.I18N.t('report.last_month'));
    } else if (/this year|tahun ini|今年/.test(query)) {
      mk('this_year', new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31), String(now.getFullYear()));
    } else {
      mk('this_month', startOfMonth(now), endOfMonth(now), window.I18N.t('report.this_month'));
    }

    // what kind of money?
    var wantType = 'expense';
    if (/\bincome\b|\bearn|\bmasuk\b|pendapatan|收入/.test(query)) wantType = 'income';
    else if (/\bnet\b|\bsaved?\b|\bsavings?\b|bersih|净/.test(query)) wantType = 'net';

    // which category?
    var cat = null;
    state.categories.forEach(function (c) {
      if (cat) return;
      var n = c.name.toLowerCase();
      if (query.indexOf(n) >= 0) cat = c;
    });
    // a couple of friendly aliases
    if (!cat) {
      var alias = [
        [/coffee|kopi|咖啡/, 'coffee'], [/food|makan|食物|吃饭/, 'food'],
        [/transport|petrol|minyak|交通/, 'trans'], [/grocery|grocer|barang dapur|杂货/, 'groc'],
        [/rent|sewa|租金/, 'rent'], [/shopping|beli|购物/, 'shop']
      ];
      alias.forEach(function (a) {
        if (cat) return;
        if (a[0].test(query)) {
          var hit = state.categories.find(function (c) { return c.id === 'c_' + a[1]; });
          if (hit) cat = hit;
        }
      });
    }

    var list = state.transactions.filter(function (t) {
      if (!inRange(t, from, to)) return false;
      if (cat && t.categoryId !== cat.id) return false;
      if (!cat) {
        if (wantType === 'expense' && t.type !== 'expense') return false;
        if (wantType === 'income' && t.type !== 'income') return false;
      }
      return true;
    });

    var total = 0;
    list.forEach(function (t) {
      if (wantType === 'net' && !cat) {
        total += (t.type === 'income' ? num(t.amount) : -num(t.amount));
      } else {
        total += num(t.amount);
      }
    });

    var biggest = list.slice().sort(function (a, b) { return b.amount - a.amount; })[0] || null;
    var count = list.length;
    var wantsBiggest = /biggest|largest|terbesar|最大/.test(query);
    var wantsCount = /how many|berapa kali|多少/.test(query);
    var wantsAverage = /average|purata|平均/.test(query);

    var abs = round2(Math.abs(total));
    var kind = wantsCount ? 'count' : (wantsAverage ? 'average' : (wantsBiggest ? 'biggest' : 'total'));
    var bc = biggest ? category(biggest.categoryId) : null;

    return {
      kind: kind,
      amount: kind === 'count' ? count
        : (kind === 'average' ? (count ? round2(abs / count) : 0)
          : (kind === 'biggest' ? (biggest ? round2(biggest.amount) : 0) : abs)),
      isCount: kind === 'count',
      count: count,
      category: cat ? cat.id : null,
      wantType: wantType,
      range: label,
      biggestName: bc ? bc.name : (biggest ? (biggest.note || '—') : null),
      list: list.slice(0, 20)
    };
  }

  /* ---------------- export / import ---------------- */
  function toCSV() {
    var rows = [['date', 'type', 'amount', 'category', 'account', 'to_account', 'note', 'tags']];
    state.transactions.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; })
      .forEach(function (t) {
        var c = category(t.categoryId);
        var a = state.accounts.find(function (x) { return x.id === t.accountId; });
        var a2 = state.accounts.find(function (x) { return x.id === t.toAccountId; });
        rows.push([
          t.date, t.type, t.amount,
          c ? c.name : '', a ? a.name : '', a2 ? a2.name : '',
          t.note || '', (t.tags || []).join('|')
        ]);
      });
    return rows.map(function (r) {
      return r.map(function (cell) {
        var s = String(cell == null ? '' : cell);
        // Spreadsheet formula-injection guard: a note like "=cmd|..." must not
        // execute when the CSV is opened in Excel/Sheets.
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }).join(',');
    }).join('\n');
  }

  /* Split a CSV into records, honouring quoted fields that contain commas,
     newlines and escaped double-quotes. */
  function parseCSVRecords(text) {
    var rows = [], row = [], cur = '', q = false, i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (q) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        cur += ch; i++; continue;
      }
      if (ch === '"') { q = true; i++; continue; }
      if (ch === ',') { row.push(cur); cur = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
      cur += ch; i++;
    }
    row.push(cur);
    rows.push(row);
    return rows.filter(function (r) {
      return r.some(function (c) { return String(c).trim() !== ''; });
    });
  }

  /* Tolerant number parsing: handles "1,234.56", "1.234,56", "(50.00)", "RM 12". */
  function parseAmount(s) {
    if (s == null) return NaN;
    var t = String(s).trim();
    if (!t) return NaN;
    var neg = /^\(.*\)$/.test(t) || /^\s*-/.test(t);
    t = t.replace(/[^0-9.,]/g, '');
    if (!t) return NaN;
    if (t.indexOf(',') >= 0 && t.indexOf('.') >= 0) {
      t = t.replace(/,/g, '');                       // 1,234.56
    } else if (t.indexOf(',') >= 0) {
      var parts = t.split(',');
      if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
        t = parts[0] + '.' + parts[1];               // 1234,56
      } else {
        t = t.replace(/,/g, '');                     // 1,234
      }
    }
    var n = Number(t);
    if (isNaN(n)) return NaN;
    return neg ? -n : n;
  }

  function parseCSV(text) {
    var rows = parseCSVRecords(String(text).replace(/^\uFEFF/, ''));
    if (!rows.length) return [];
    var header = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
    function exact(name) { return header.indexOf(name); }
    function find(re) {
      for (var i = 0; i < header.length; i++) if (re.test(header[i])) return i;
      return -1;
    }
    var idx = {
      date: exact('date') >= 0 ? exact('date') : find(/date|tarikh|日期/),
      type: exact('type') >= 0 ? exact('type') : find(/^type$|jenis|类型/),
      amount: exact('amount') >= 0 ? exact('amount') : find(/^amount$|jumlah|金额/),
      debit: find(/debit|keluar|支出|withdrawal/),
      credit: find(/credit|masuk|收入|deposit/),
      category: exact('category') >= 0 ? exact('category') : find(/categor|kategori|分类/),
      account: exact('account') >= 0 ? exact('account') : find(/^account$|akaun|账户/),
      toAccount: find(/to[_ ]?account|ke akaun|转入/),
      note: exact('note') >= 0 ? exact('note') : find(/note|nota|备注|description|butiran/),
      tags: exact('tags') >= 0 ? exact('tags') : find(/^tags$|^tag$/)
    };
    var hasSplit = idx.debit >= 0 || idx.credit >= 0;

    var out = [];
    for (var i = 1; i < rows.length; i++) {
      var cells = rows[i];
      function cell(ix) { return ix >= 0 && ix < cells.length ? String(cells[ix]).trim() : ''; }

      var amt = NaN, type = 'expense';
      if (hasSplit) {
        var cr = idx.credit >= 0 ? parseAmount(cell(idx.credit)) : NaN;
        var db = idx.debit >= 0 ? parseAmount(cell(idx.debit)) : NaN;
        if (!isNaN(cr) && cr !== 0) { amt = Math.abs(cr); type = 'income'; }
        else if (!isNaN(db) && db !== 0) { amt = Math.abs(db); type = 'expense'; }
      }
      if (isNaN(amt) && idx.amount >= 0) {
        var a = parseAmount(cell(idx.amount));
        if (!isNaN(a)) {
          amt = Math.abs(a);
          type = a < 0 ? 'expense' : 'expense';
          if (idx.type >= 0) {
            var tv = cell(idx.type).toLowerCase();
            if (/income|in\b|masuk|credit|收入/.test(tv)) type = 'income';
            else if (/expense|out|keluar|debit|支出/.test(tv)) type = 'expense';
          } else if (a > 0 && /income/i.test(cell(idx.category))) {
            type = 'income';
          }
        }
      }
      if (isNaN(amt) || amt === 0) continue;

      out.push({
        type: type,
        amount: amt,
        date: normalizeDate(cell(idx.date) || todayISO()),
        categoryName: cell(idx.category),
        accountName: cell(idx.account),
        toAccountName: cell(idx.toAccount),
        note: cell(idx.note),
        tags: cell(idx.tags)
      });
    }
    return out;
  }

  function normalizeDate(s) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      var d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
      if (y < 100) y += 2000;
      if (mo > 12) { var tmp = d; d = mo; mo = tmp; }
      return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d;
    }
    var dt = new Date(s);
    if (!isNaN(dt.getTime())) return ymd(dt);
    return todayISO();
  }

  window.JELAS_STORE = {
    init: init, get: get, setKey: setKey, save: save, defaultState: defaultState,
    uid: uid, todayISO: todayISO, ymd: ymd, parseYMD: parseYMD, addDays: addDays,
    startOfDay: startOfDay, startOfWeek: startOfWeek, startOfMonth: startOfMonth,
    endOfMonth: endOfMonth, daysInMonth: daysInMonth, round2: round2, num: num,

    addAccount: addAccount, updateAccount: updateAccount, deleteAccount: deleteAccount,
    accountBalance: accountBalance, accountType: accountType, isLiability: isLiability,
    totalAssets: totalAssets, totalLiabilities: totalLiabilities, netWorth: netWorth,

    addCategory: addCategory, updateCategory: updateCategory, deleteCategory: deleteCategory,
    category: category, categoriesByKind: categoriesByKind,

    addTransaction: addTransaction, updateTransaction: updateTransaction,
    deleteTransaction: deleteTransaction, transaction: transaction,
    txsBetween: txsBetween, stats: stats, categoryTotals: categoryTotals,
    monthStats: monthStats, weekStats: weekStats, dayStats: dayStats,

    budgetFor: budgetFor, budgetBase: budgetBase, setBudget: setBudget, removeBudget: removeBudget,
    totalBudgeted: totalBudgeted, spentInCategoryMonth: spentInCategoryMonth,
    safeToSpend: safeToSpend, toBeBudgeted: toBeBudgeted,
    monthlyLimit: monthlyLimit, setMonthlyLimit: setMonthlyLimit,
    monthLimitStatus: monthLimitStatus, checkLimitAlerts: checkLimitAlerts,

    loggingStreak: loggingStreak, bestStreak: bestStreak, hasTxOn: hasTxOn,

    addGoal: addGoal, contributeGoal: contributeGoal, deleteGoal: deleteGoal,
    addDebt: addDebt, payDebt: payDebt, deleteDebt: deleteDebt, payoffMonths: payoffMonths,
    zakat: zakat,

    startChallenge: startChallenge, endChallenge: endChallenge,
    awardBadge: awardBadge, hasBadge: hasBadge, recomputeBadges: recomputeBadges,

    toggleCheckItem: toggleCheckItem, resetChecklist: resetChecklist,
    addChecklist: addChecklist, addCheckItem: addCheckItem, deleteChecklist: deleteChecklist,
    checklistProgress: checklistProgress,

    markLessonRead: markLessonRead, lessonsReadCount: lessonsReadCount,
    setMood: setMood,
    addWish: addWish, deleteWish: deleteWish, startCoolDown: startCoolDown, canAfford: canAfford,
    setSetting: setSetting, insights: insights,
    toCSV: toCSV, parseCSV: parseCSV, normalizeDate: normalizeDate,
    safeId: safeId, sanitizeState: sanitizeState,

    addBill: addBill, updateBill: updateBill, deleteBill: deleteBill,
    activeBills: activeBills, nextDueDate: nextDueDate, billsDueWithin: billsDueWithin,
    billsReserveUntil: billsReserveUntil, monthlyBillsTotal: monthlyBillsTotal,
    monthlyEquivalent: monthlyEquivalent, markBillPaid: markBillPaid, isBillPaid: isBillPaid,
    suggestCategory: suggestCategory, frequentTemplates: frequentTemplates,
    snapshotNetWorth: snapshotNetWorth, netWorthSeries: netWorthSeries,
    ask: ask
  };
})();
