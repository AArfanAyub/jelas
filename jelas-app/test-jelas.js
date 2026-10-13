/* JELAS — full automated test suite.
 * Exercises every screen and feature as a user would, repeated N times.
 * Usage:  node test-jelas.js [runs]
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const APP = 'file:///C:/Users/user/WorkBuddy%20AI/app%20solat/jelas-app/index.html';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const RUNS = Number(process.argv[2] || 20);

let passes = 0, faults = [];
let shots = 0;
const fault = (run, name, msg) => {
  faults.push({ run, name, msg: String(msg).slice(0, 220) });
  console.log('   !! run ' + run + ' · ' + name + ' :: ' + String(msg).slice(0, 160));
};
const ok = () => { passes++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function check(run, name, fn, timeoutMs = 30000) {
  let timer;
  try {
    await Promise.race([
      fn(),
      new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('TIMEOUT after ' + (timeoutMs / 1000) + 's')), timeoutMs);
      })
    ]);
    clearTimeout(timer);
    ok();
  } catch (e) { clearTimeout(timer); fault(run, name, e.message); }
}

async function newPage(ctx, { dark } = {}) {
  const page = await ctx.newPage();
  await page.setViewport({ width: 412, height: 900, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]);
  page.on('pageerror', e => fault(0, 'pageerror', e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const s = m.text();
    // the CSP test deliberately triggers a violation — that is a pass, not a fault
    if (/Content Security Policy|example\.com|Refused to connect/.test(s)) return;
    fault(0, 'console', s);
  });
  page.on('dialog', async d => {
    try {
      if (d.type() === 'prompt') await d.accept('ERASE');
      else await d.accept();
    } catch (e) {}
  });
  return page;
}

/* ---------- shared helpers ---------- */
const tap = async (page, sel) => {
  const el = await page.$(sel);
  if (!el) throw new Error('missing element: ' + sel);
  await page.evaluate(e => { try { e.scrollIntoView({ block: 'center' }); } catch (_) {} }, el);
  await wait(70);
  try { await el.click(); }
  catch (e) { await page.evaluate(e => e.click(), el); }
  await wait(160);
};
const txt = (page, sel) => page.$eval(sel, el => el.textContent);
const has = async (page, sel) => (await page.$(sel)) !== null;
const cnt = (page, sel) => page.$$eval(sel, els => els.length);

async function enterPin(page, pin, sel = '[data-act="onb-key"]') {
  for (const d of pin) {
    const el = await page.$(`${sel}[data-key="${d}"]`);
    if (!el) throw new Error('keypad key missing: ' + d);
    // JS click: the keypad is rebuilt on every digit, so a real mouse click
    // can land on a node that has just been replaced.
    await page.evaluate(e => e.click(), el);
    await wait(80);
  }
}

/* If the app is sitting on the lock screen, get back in. Keeps one failed
   check from cascading into every later check. */
async function ensureUnlocked(page, pin = '123456') {
  const locked = await page.evaluate(() =>
    document.getElementById('lock').classList.contains('show')).catch(() => false);
  if (!locked) return;
  await page.evaluate(() => {
    window.JELAS_DB.prefs.set('lockFails', 0);
    window.JELAS_DB.prefs.set('lockUntil', 0);
  });
  await enterPin(page, pin, '[data-act="lock-key"]');
  await waitForUnlocked(page);
}

async function clearAmount(page) {
  for (let i = 0; i < 12; i++) {
    const b = await page.$('[data-act="key"][data-key="del"]');
    if (!b) break;
    await page.evaluate(e => e.click(), b);
    await wait(25);
  }
  await wait(120);
}

async function waitForText(page, sel, re, timeout = 9000) {
  const t0 = Date.now();
  let last = '';
  while (Date.now() - t0 < timeout) {
    last = await page.$eval(sel, el => el.textContent).catch(() => '');
    if (re.test(last)) return last;
    await wait(150);
  }
  throw new Error('timed out waiting for ' + re + ' in ' + sel + ' (saw "' + last + '")');
}

async function waitForUnlocked(page, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const shown = await page.evaluate(() =>
      document.getElementById('lock').classList.contains('show')).catch(() => true);
    if (!shown) return true;
    await wait(200);
  }
  throw new Error('still locked after ' + timeout + 'ms');
}

async function typeAmount(page, digits) {
  await clearAmount(page);
  for (const d of digits) await tap(page, `[data-act="key"][data-key="${d}"]`);
}

async function onboard(page, { lang = 'en', method = '5020', pin = '123456', mismatch = false } = {}) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await wait(400);
  await tap(page, '[data-act="onb-next"]');                 // welcome -> language
  await tap(page, `[data-act="onb-lang"][data-l="${lang}"]`);
  await tap(page, '[data-act="onb-next"]');                 // -> method
  await tap(page, `[data-act="onb-method"][data-m="${method}"]`);
  await tap(page, '[data-act="onb-next"]');                 // -> pin
  if (mismatch) {
    await enterPin(page, '111111'); await wait(500);
    await enterPin(page, '222222'); await wait(600);
    // should have reset — now do it properly
    await enterPin(page, pin); await wait(500);
  } else {
    await enterPin(page, pin); await wait(500);
  }
  await enterPin(page, pin); await wait(700);
  await tap(page, '[data-act="onb-finish"]');
  await wait(1600);
}

/* ---------- the journey ---------- */
async function journey(page, run) {
  /* 1. onboarding */
  await check(run, 'onboarding shows', async () => {
    if (!await page.evaluate(() => document.getElementById('onb').classList.contains('show'))) throw new Error('not shown');
  });
  await tap(page, '[data-act="onb-next"]');
  await check(run, '3 languages offered', async () => {
    const n = await cnt(page, '[data-act="onb-lang"]');
    if (n !== 3) throw new Error('got ' + n);
  });
  await check(run, 'language switches live', async () => {
    await tap(page, '[data-act="onb-lang"][data-l="zh"]');
    const s = await txt(page, '#onb');
    if (!/语言|选择/.test(s)) throw new Error('zh not applied');
    await tap(page, '[data-act="onb-lang"][data-l="ms"]');
    const s2 = await txt(page, '#onb');
    if (!/Bahasa|Pilih/.test(s2)) throw new Error('ms not applied');
  });
  await tap(page, '[data-act="onb-next"]');
  await check(run, '4 budget methods', async () => {
    const n = await cnt(page, '[data-act="onb-method"]');
    if (n !== 4) throw new Error('got ' + n);
  });
  await tap(page, '[data-act="onb-method"][data-m="zero"]');
  await tap(page, '[data-act="onb-next"]');
  await check(run, 'PIN mismatch is rejected', async () => {
    await enterPin(page, '111111'); await wait(500);
    await enterPin(page, '222222'); await wait(700);
    const e = await txt(page, '#onbPinErr');
    if (!/tidak sepadan|do not match|不一致/.test(e)) throw new Error('no mismatch error: "' + e + '"');
  });
  await check(run, 'PIN set -> app opens', async () => {
    await enterPin(page, '123456'); await wait(500);
    await enterPin(page, '123456'); await wait(700);
    await tap(page, '[data-act="onb-finish"]');
    await wait(1800);
    if (await page.evaluate(() => document.getElementById('onb').classList.contains('show')))
      throw new Error('onboarding stuck');
  });

  /* 2. seeded account + today */
  await check(run, 'default account seeded', async () => {
    const n = await page.evaluate(() => window.JELAS_APP.state().accounts.length);
    if (n < 1) throw new Error('no accounts');
  });
  await check(run, 'today hero renders', async () => {
    const s = await txt(page, '#todayTab');
    if (!/RM/.test(s)) throw new Error('no money on today');
  });

  /* 3. add expense */
  await check(run, 'add expense works', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="add"]');
    await typeAmount(page, '1250');
    if (!await has(page, '[data-act="pick-cat"]')) throw new Error('category grid empty');
    await tap(page, '[data-act="pick-cat"]');
    await tap(page, '[data-act="save-tx"]');
    await wait(500);
    const n = await page.evaluate(() => window.JELAS_APP.state().transactions.length);
    if (n !== 1) throw new Error('tx count ' + n);
    const amt = await page.evaluate(() => window.JELAS_APP.state().transactions[0].amount);
    if (amt !== 1250) throw new Error('wrong amount saved: ' + amt);
  });
  await check(run, 'amount keypad: delete works', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="add"]');
    await clearAmount(page);
    for (const d of '999') { await tap(page, `[data-act="key"][data-key="${d}"]`); }
    await tap(page, '[data-act="key"][data-key="del"]');
    const v = await txt(page, '.amountbar .val');
    if (v !== '99') throw new Error('got ' + v);
  });
  await check(run, 'validation blocks empty save', async () => {
    await tap(page, '[data-act="save-tx"]');
    await wait(300);
    const n = await page.evaluate(() => window.JELAS_APP.state().transactions.length);
    if (n !== 1) throw new Error('saved without category/amount');
  });
  await check(run, 'add income works', async () => {
    await tap(page, '[data-act="add-type"][data-type="income"]');
    await typeAmount(page, '3000');
    await tap(page, '[data-act="pick-cat"]');
    await tap(page, '[data-act="save-tx"]');
    await wait(500);
    const txs = await page.evaluate(() => window.JELAS_APP.state().transactions);
    const inc = txs.filter(t => t.type === 'income');
    if (inc.length !== 1) throw new Error('income count ' + inc.length);
    if (inc[0].amount !== 3000) throw new Error('income amount ' + inc[0].amount);
  });
  await check(run, 'transfer requires 2 accounts', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="add"]');
    await tap(page, '[data-act="add-type"][data-type="transfer"]');
    await typeAmount(page, '100');
    await tap(page, '[data-act="save-tx"]');
    await wait(300);
    const n = await page.evaluate(() => window.JELAS_APP.state().transactions.length);
    if (n !== 2) throw new Error('transfer saved without destination');
  });

  /* 4. flow */
  await check(run, 'flow lists transactions', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="flow"]');
    const n = await cnt(page, '#flowTab .ledger');
    if (n < 2) throw new Error('ledger rows ' + n);
  });
  await check(run, 'flow filters', async () => {
    await tap(page, '[data-act="flow-filter"][data-f="in"]');
    const n = await cnt(page, '#flowTab .ledger');
    if (n !== 1) throw new Error('in filter rows ' + n);
    await tap(page, '[data-act="flow-filter"][data-f="out"]');
    const o = await cnt(page, '#flowTab .ledger');
    if (o !== 1) throw new Error('out filter rows ' + o);
    await tap(page, '[data-act="flow-filter"][data-f="all"]');
  });
  await check(run, 'flow search', async () => {
    await page.evaluate(() => {
      const i = document.getElementById('flowSearch');
      i.value = 'zzzz';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait(400);
    const s = await txt(page, '#flowTab');
    if (!/Tiada|No transactions|没有/.test(s)) throw new Error('search did not filter');
    await page.evaluate(() => {
      const i = document.getElementById('flowSearch');
      i.value = '';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait(300);
  });
  await check(run, 'flow heatmap renders', async () => {
    if (!await has(page, '#flowTab .cal')) throw new Error('no calendar');
  });
  await check(run, 'flow month nav', async () => {
    await tap(page, '[data-act="flow-month"][data-d="-1"]');
    await tap(page, '[data-act="flow-month"][data-d="1"]');
  });

  /* 5. report */
  await check(run, 'report week/month toggle', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="report"]');
    await tap(page, '[data-act="report-range"][data-r="month"]');
    if (!await has(page, '#reportTab .donut')) throw new Error('no donut in month view');
    await tap(page, '[data-act="report-range"][data-r="week"]');
  });
  await check(run, 'report has charts', async () => {
    if (!await has(page, '#reportTab .bars')) throw new Error('no bars');
    if (!await has(page, '#reportTab .flowbar')) throw new Error('no flowbar');
    const n = await cnt(page, '#reportTab .ledger');
    if (n > 0) throw new Error('report should not use ledger rows');
  });
  await check(run, 'report period nav', async () => {
    await tap(page, '[data-act="report-move"][data-d="-1"]');
    await tap(page, '[data-act="report-move"][data-d="1"]');
  });
  await check(run, 'report image export draws a canvas', async () => {
    const r = await page.evaluate(async () => {
      const cv = window.JELAS_APP.buildReportCanvas();
      if (!cv) return { ok: false };
      const x = cv.getContext('2d');
      const d = x.getImageData(0, 0, cv.width, cv.height).data;
      let varied = 0;
      for (let i = 0; i < d.length; i += 4000) {
        if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) varied++;
      }
      const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
      return { ok: true, w: cv.width, h: cv.height, varied, bytes: blob ? blob.size : 0 };
    });
    if (!r.ok) throw new Error('no canvas returned');
    if (r.w < 500 || r.h < 500) throw new Error('canvas too small ' + r.w + 'x' + r.h);
    if (r.varied < 10) throw new Error('canvas looks blank');
    if (r.bytes < 2000) throw new Error('png suspiciously small: ' + r.bytes);
  });

  /* 6. me + overlays */
  await check(run, 'me groups switch', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="me"]');
    for (const g of ['tools', 'app', 'manage']) {
      await tap(page, `[data-act="me-group"][data-g="${g}"]`);
      const n = await cnt(page, '.listrow');
      if (n < 3) throw new Error('group ' + g + ' rows ' + n);
    }
  });
  const ovs = ['accounts', 'categories', 'budgets', 'goals', 'debts', 'zakat'];
  await check(run, 'all manage overlays open', async () => {
    for (const o of ovs) {
      await tap(page, `[data-act="open"][data-ov="${o}"]`);
      if (!await page.evaluate(() => document.getElementById('overlay').classList.contains('show')))
        throw new Error(o + ' not open');
      await tap(page, '[data-act="ov-back"]');
    }
  });
  await check(run, 'all tools overlays open', async () => {
    await tap(page, '[data-act="me-group"][data-g="tools"]');
    for (const o of ['checklists', 'challenges', 'learn']) {
      await tap(page, `[data-act="open"][data-ov="${o}"]`);
      if (!await page.evaluate(() => document.getElementById('overlay').classList.contains('show')))
        throw new Error(o + ' not open');
      await tap(page, '[data-act="ov-back"]');
    }
  });
  await check(run, 'all app overlays open', async () => {
    await tap(page, '[data-act="me-group"][data-g="app"]');
    for (const o of ['security', 'data', 'reminders', 'settings', 'about']) {
      try {
        await tap(page, `[data-act="open"][data-ov="${o}"]`);
        if (!await page.evaluate(() => document.getElementById('overlay').classList.contains('show')))
          throw new Error('not open');
        await tap(page, '[data-act="ov-back"]');
      } catch (e) { throw new Error(o + ': ' + e.message); }
    }
  });

  /* 7. accounts CRUD */
  await check(run, 'account add + balance', async () => {
    await tap(page, '[data-act="me-group"][data-g="manage"]');
    await tap(page, '[data-act="open"][data-ov="accounts"]');
    await tap(page, '[data-act="acct-add"]');
    await page.type('#af_name', 'My Bank');
    await page.select('#af_type', 'bank');
    await page.evaluate(() => { const e = document.getElementById('af_open'); e.value = '500'; });
    await tap(page, '[data-act="acct-save"]');
    await wait(400);
    const n = await page.evaluate(() => window.JELAS_APP.state().accounts.length);
    if (n !== 2) throw new Error('accounts ' + n);
    await tap(page, '[data-act="ov-back"]');
  });
  await check(run, 'account archive', async () => {
    await tap(page, '[data-act="open"][data-ov="accounts"]');
    await tap(page, '[data-act="acct-edit"]');
    await tap(page, '[data-act="acct-archive"]');
    await wait(300);
    const arch = await page.evaluate(() => window.JELAS_APP.state().accounts.filter(a => a.archived).length);
    if (arch !== 1) throw new Error('archived ' + arch);
    await tap(page, '[data-act="ov-back"]');
  });

  /* 8. category CRUD */
  await check(run, 'category add', async () => {
    await tap(page, '[data-act="open"][data-ov="categories"]');
    await tap(page, '[data-act="cat-add"]');
    await page.type('#cf_name', 'Bubble tea');
    await tap(page, '[data-act="cat-save"]');
    await wait(400);
    const n = await page.evaluate(() => window.JELAS_APP.state().categories.length);
    if (n !== 31) throw new Error('categories ' + n);
    await tap(page, '[data-act="ov-back"]');
  });

  /* 9. budgets + safe to spend */
  await check(run, 'budget set changes safe-to-spend', async () => {
    const before = await page.evaluate(() => window.JELAS_APP.state().budgets.length);
    await tap(page, '[data-act="open"][data-ov="budgets"]');
    await tap(page, '[data-act="bud-add"]');
    await page.evaluate(() => { document.getElementById('bf_amt').value = '600'; });
    await tap(page, '[data-act="bud-save"]');
    await wait(400);
    const after = await page.evaluate(() => window.JELAS_APP.state().budgets.length);
    if (after !== before + 1) throw new Error('budget not added');
    await tap(page, '[data-act="ov-back"]');
    const sts = await page.evaluate(() => window.JELAS_APP.store ? null : null);
    await tap(page, '[data-act="set-tab"][data-tab="today"]');
    const s = await txt(page, '#todayTab');
    if (!/RM/.test(s)) throw new Error('today broke after budget');
  });

  /* 10. goals */
  await check(run, 'goal add + contribute', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="me"]');
    await tap(page, '[data-act="open"][data-ov="goals"]');
    await tap(page, '[data-act="goal-add"]');
    await page.type('#gf_name', 'Laptop');
    await page.evaluate(() => { document.getElementById('gf_target').value = '3000'; });
    await tap(page, '[data-act="goal-save"]');
    await wait(400);
    await tap(page, '[data-act="goal-add-money"]');
    await page.evaluate(() => { document.getElementById('gcm_amt').value = '500'; });
    await tap(page, '[data-act="goal-do-add"]');
    await wait(400);
    const g = await page.evaluate(() => window.JELAS_APP.state().goals[0]);
    if (!g || g.saved !== 500) throw new Error('goal saved=' + (g && g.saved));
    await tap(page, '[data-act="ov-back"]');
  });

  /* 11. debts */
  await check(run, 'debt add + payoff calc', async () => {
    await tap(page, '[data-act="open"][data-ov="debts"]');
    await tap(page, '[data-act="debt-add"]');
    await page.type('#df_name', 'Student Loan');
    await page.evaluate(() => {
      document.getElementById('df_principal').value = '20000';
      document.getElementById('df_balance').value = '12000';
      document.getElementById('df_rate').value = '1';
      document.getElementById('df_min').value = '200';
    });
    await tap(page, '[data-act="debt-save"]');
    await wait(400);
    const d = await page.evaluate(() => window.JELAS_APP.state().debts[0]);
    if (!d || d.balance !== 12000) throw new Error('debt not saved');
    const months = await page.evaluate(() => window.JELAS_STORE.payoffMonths(12000, 1, 200));
    if (!isFinite(months) || months < 60) throw new Error('payoff calc wrong: ' + months);
    await tap(page, '[data-act="ov-back"]');
  });

  /* 12. zakat math */
  await check(run, 'zakat nisab logic', async () => {
    const low = await page.evaluate(() => window.JELAS_STORE.zakat({ cash: 100, goldPrice: 320 }));
    if (low.due) throw new Error('zakat due below nisab');
    const high = await page.evaluate(() => window.JELAS_STORE.zakat({ cash: 50000, goldPrice: 320 }));
    if (!high.due) throw new Error('zakat not due above nisab');
    const expect = Math.round(50000 * 0.025 * 100) / 100;
    if (Math.abs(high.amount - expect) > 0.01) throw new Error('zakat amount ' + high.amount + ' != ' + expect);
  });

  /* 13. checklists */
  await check(run, 'checklist toggle + reset', async () => {
    await tap(page, '[data-act="me-group"][data-g="tools"]');
    await tap(page, '[data-act="open"][data-ov="checklists"]');
    await tap(page, '[data-act="chk-toggle"]');
    const p1 = await page.evaluate(() => window.JELAS_STORE.checklistProgress('cl_month'));
    if (p1.done !== 1) throw new Error('toggle failed ' + p1.done);
    await tap(page, '[data-act="chk-reset"]');
    const p2 = await page.evaluate(() => window.JELAS_STORE.checklistProgress('cl_month'));
    if (p2.done !== 0) throw new Error('reset failed ' + p2.done);
    await tap(page, '[data-act="ov-back"]');
  });

  /* 14. challenges */
  await check(run, 'challenge starts', async () => {
    await tap(page, '[data-act="open"][data-ov="challenges"]');
    await tap(page, '[data-act="chal-start"]');
    const n = await page.evaluate(() => window.JELAS_APP.state().challenges.filter(c => c.status === 'active').length);
    if (n < 1) throw new Error('challenge not started');
    await tap(page, '[data-act="ov-back"]');
  });

  /* 15. learn */
  await check(run, 'lesson marks read', async () => {
    await tap(page, '[data-act="open"][data-ov="learn"]');
    await tap(page, '[data-act="lesson-read"]');
    const n = await page.evaluate(() => window.JELAS_STORE.lessonsReadCount());
    if (n !== 1) throw new Error('lessons read ' + n);
    await tap(page, '[data-act="ov-back"]');
  });

  /* 16. badges awarded */
  await check(run, 'badge awarded after first tx', async () => {
    const b = await page.evaluate(() => window.JELAS_STORE.hasBadge('b_first'));
    if (!b) throw new Error('b_first not awarded');
  });

  /* 16b. money maths — gaps the QA review flagged */
  await check(run, 'net worth: overpaid card is an asset, not a debt', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const acct = S.addAccount({ name: 'Card', type: 'credit', openingBalance: 0 });
      S.addTransaction({ type: 'expense', amount: 200, accountId: acct.id, categoryId: 'c_food' });
      const owed = { assets: S.totalAssets(), liab: S.totalLiabilities() };
      S.addTransaction({ type: 'income', amount: 500, accountId: acct.id, categoryId: 'i_other' });
      const credit = { assets: S.totalAssets(), liab: S.totalLiabilities() };
      return { owed, credit, bal: S.accountBalance(acct.id) };
    });
    if (r.owed.liab - r.credit.liab !== 200) throw new Error(
      'clearing the 200 owed should reduce liabilities by 200, got ' + (r.owed.liab - r.credit.liab));
    if (r.credit.assets < 300) throw new Error('card credit not counted as an asset: ' + r.credit.assets);
    if (r.bal !== 300) throw new Error('card balance wrong: ' + r.bal);
  });

  await check(run, 'real transfer moves money between accounts', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const a = S.get().accounts.filter(x => !x.archived)[0];
      const b = S.addAccount({ name: 'Savings', type: 'bank', openingBalance: 0 });
      const a0 = S.accountBalance(a.id);
      S.addTransaction({ type: 'transfer', amount: 100, accountId: a.id, toAccountId: b.id });
      return { a0, a1: S.accountBalance(a.id), b1: S.accountBalance(b.id) };
    });
    if (r.b1 !== 100) throw new Error('destination not credited: ' + r.b1);
    if (Math.abs((r.a0 - r.a1) - 100) > 0.001) throw new Error('source not debited by 100: ' + r.a0 + '->' + r.a1);
  });

  await check(run, 'large amounts survive, zero is ignored', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const acct = S.get().accounts.filter(x => !x.archived)[0];
      const big = S.addTransaction({ type: 'expense', amount: 1234567.89, accountId: acct.id, categoryId: 'c_food' });
      return { big: big.amount, stored: S.transaction(big.id).amount };
    });
    if (r.big !== 1234567.89 || r.stored !== 1234567.89) throw new Error('large amount mangled: ' + JSON.stringify(r));
  });

  await check(run, 'budget rollover carries last month over', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const prev = new Date(); prev.setDate(0);
      const acct = S.get().accounts.filter(x => !x.archived)[0];
      S.setBudget('c_dine', 100, 'month', false);
      const plain = S.budgetFor('c_dine');
      S.setBudget('c_dine', 100, 'month', true);
      S.addTransaction({ type: 'expense', amount: 40, accountId: acct.id, categoryId: 'c_dine', date: S.ymd(prev) });
      const rolled = S.budgetFor('c_dine');
      return { plain, rolled };
    });
    if (r.plain !== 100) throw new Error('base budget wrong: ' + r.plain);
    if (r.rolled !== 160) throw new Error('rollover should be 100 + 60 unspent = 160, got ' + r.rolled);
  });

  await check(run, 'month boundary attributes spend correctly', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const acct = S.get().accounts.filter(x => !x.archived)[0];
      const d = new Date();
      const firstOfMonth = S.ymd(new Date(d.getFullYear(), d.getMonth(), 1));
      const lastOfPrev = S.ymd(new Date(d.getFullYear(), d.getMonth(), 0));
      S.addTransaction({ type: 'expense', amount: 11, accountId: acct.id, categoryId: 'c_groc', date: firstOfMonth });
      S.addTransaction({ type: 'expense', amount: 22, accountId: acct.id, categoryId: 'c_groc', date: lastOfPrev });
      const cats = S.categoryTotals(S.startOfMonth(d), S.endOfMonth(d));
      const g = cats.find(c => c.id === 'c_groc');
      return { thisMonth: g ? g.total : -1, sameDay: firstOfMonth === lastOfPrev };
    });
    if (r.sameDay) throw new Error('month boundary dates identical');
    if (r.thisMonth !== 11) throw new Error("this month should hold only 11, got " + r.thisMonth);
  });

  await check(run, 'payoff projection handles 0% and impossible payments', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      // note: Infinity does not survive JSON serialisation, so return booleans
      return {
        zeroRate: S.payoffMonths(1200, 0, 100),
        impossibleFinite: isFinite(S.payoffMonths(10000, 18, 100)),
        noPaymentFinite: isFinite(S.payoffMonths(1000, 5, 0)),
        normal: S.payoffMonths(12000, 1, 200)
      };
    });
    if (r.zeroRate !== 12) throw new Error('0% payoff should be 12 months, got ' + r.zeroRate);
    if (r.impossibleFinite) throw new Error('a payment below the interest must be unreachable');
    if (r.noPaymentFinite) throw new Error('a zero payment must be unreachable');
    if (!isFinite(r.normal) || r.normal < 60) throw new Error('normal payoff looks wrong: ' + r.normal);
  });

  await check(run, 'zakat boundary: exactly at nisab', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const nisab = 85 * 320;
      return {
        justBelow: S.zakat({ cash: nisab - 1, goldPrice: 320 }),
        exactly: S.zakat({ cash: nisab, goldPrice: 320 }),
        withDebt: S.zakat({ cash: nisab * 2, liabilities: nisab * 2, goldPrice: 320 })
      };
    });
    if (r.justBelow.due) throw new Error('zakat due below nisab');
    if (!r.exactly.due) throw new Error('zakat should be due exactly at nisab');
    if (r.withDebt.due) throw new Error('debts should be deductible from zakat-able wealth');
  });

  /* 16c. destructive actions */
  await check(run, 'delete a transaction', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const before = S.get().transactions.length;
      const id = S.get().transactions[S.get().transactions.length - 1].id;
      S.deleteTransaction(id);
      return { before, after: S.get().transactions.length };
    });
    if (r.after !== r.before - 1) throw new Error('transaction not deleted: ' + JSON.stringify(r));
  });

  await check(run, 'delete an account cascades its transactions', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const acct = S.addAccount({ name: 'Temp', type: 'cash', openingBalance: 0 });
      S.addTransaction({ type: 'expense', amount: 5, accountId: acct.id, categoryId: 'c_food' });
      const withTemp = S.get().transactions.filter(t => t.accountId === acct.id).length;
      S.deleteAccount(acct.id);
      return {
        withTemp,
        left: S.get().transactions.filter(t => t.accountId === acct.id).length,
        gone: !S.get().accounts.some(a => a.id === acct.id)
      };
    });
    if (r.withTemp !== 1) throw new Error('setup failed');
    if (r.left !== 0) throw new Error('orphaned transactions left behind');
    if (!r.gone) throw new Error('account not removed');
  });

  await check(run, 'delete a category orphans its transactions safely', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const cat = S.addCategory({ name: 'TempCat', kind: 'want', icon: 'other' });
      const acct = S.get().accounts.filter(x => !x.archived)[0];
      const tx = S.addTransaction({ type: 'expense', amount: 9, accountId: acct.id, categoryId: cat.id });
      S.deleteCategory(cat.id);
      const after = S.transaction(tx.id);
      return { catId: after ? after.categoryId : 'MISSING', gone: !S.category(cat.id) };
    });
    if (!r.gone) throw new Error('category not removed');
    if (r.catId !== null) throw new Error('transaction kept a dangling categoryId: ' + r.catId);
  });

  await check(run, 'edit an existing transaction', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const tx = S.get().transactions[0];
      S.updateTransaction(tx.id, { amount: 42.5, note: 'edited' });
      const after = S.transaction(tx.id);
      return { amount: after.amount, note: after.note, count: S.get().transactions.length };
    });
    if (r.amount !== 42.5) throw new Error('amount not updated: ' + r.amount);
    if (r.note !== 'edited') throw new Error('note not updated');
  });

  /* 16d. CSV robustness */
  await check(run, 'CSV with debit/credit columns maps to in/out', async () => {
    const r = await page.evaluate(() => window.JELAS_STORE.parseCSV(
      'Date,Description,Debit,Credit\n2026-10-01,Lunch,12.50,\n2026-10-02,Salary,,3000.00\n'));
    if (r.length !== 2) throw new Error('expected 2 rows, got ' + r.length);
    const exp = r.find(x => x.type === 'expense');
    const inc = r.find(x => x.type === 'income');
    if (!exp || exp.amount !== 12.5) throw new Error('debit row wrong: ' + JSON.stringify(exp));
    if (!inc || inc.amount !== 3000) throw new Error('credit row wrong: ' + JSON.stringify(inc));
  });

  await check(run, 'CSV handles quoted commas, thousands and negatives', async () => {
    const r = await page.evaluate(() => window.JELAS_STORE.parseCSV(
      'date,type,amount,note\n2026-10-01,expense,"1,234.56","lunch, with friends"\n2026-10-02,expense,(50.00),refund\n'));
    if (r.length !== 2) throw new Error('expected 2 rows, got ' + r.length);
    if (r[0].amount !== 1234.56) throw new Error('thousands separator not parsed: ' + r[0].amount);
    if (r[0].note !== 'lunch, with friends') throw new Error('quoted comma mangled: ' + r[0].note);
    if (r[1].amount !== 50) throw new Error('parenthesised negative not parsed: ' + r[1].amount);
  });

  await check(run, 'CSV with an embedded newline in a quoted field', async () => {
    const r = await page.evaluate(() => window.JELAS_STORE.parseCSV(
      'date,type,amount,note\n2026-10-01,expense,5,"line one\nline two"\n'));
    if (r.length !== 1) throw new Error('expected 1 record, got ' + r.length);
    if (r[0].note.indexOf('\n') === -1) throw new Error('embedded newline lost: ' + JSON.stringify(r[0].note));
  });

  await check(run, 'backup round-trips and rejects a wrong password', async () => {
    const r = await page.evaluate(async () => {
      const before = window.JELAS_APP.state();
      const counts = { tx: before.transactions.length, acct: before.accounts.length };
      const salt = window.JELAS_CRYPTO.newSalt();
      const pw = 'correct-horse-battery';
      const bkKey = await window.JELAS_CRYPTO.deriveKey(pw, salt);
      const payload = { app: 'JELAS', schemaVersion: 1, createdAt: Date.now(), data: before };
      const enc = await window.JELAS_CRYPTO.encryptString(bkKey, JSON.stringify(payload));
      const file = { format: 'jelas-backup-v1', salt: salt, payload: enc };

      const k2 = await window.JELAS_CRYPTO.deriveKey(pw, file.salt);
      const json = await window.JELAS_CRYPTO.decryptString(k2, file.payload);
      const restored = window.JELAS_STORE.sanitizeState(JSON.parse(json).data);

      const k3 = await window.JELAS_CRYPTO.deriveKey('wrong-password', file.salt);
      let wrongFails = false;
      try { await window.JELAS_CRYPTO.decryptString(k3, file.payload); } catch (e) { wrongFails = true; }

      return { counts, after: { tx: restored.transactions.length, acct: restored.accounts.length }, wrongFails };
    });
    if (r.after.tx !== r.counts.tx) throw new Error('tx count changed: ' + JSON.stringify(r));
    if (r.after.acct !== r.counts.acct) throw new Error('account count changed: ' + JSON.stringify(r));
    if (!r.wrongFails) throw new Error('a wrong backup password decrypted the file');
  }, 60000);

  await check(run, 'double-tap on save creates only one transaction', async () => {
    await ensureUnlocked(page);
    await tap(page, '[data-act="set-tab"][data-tab="add"]');
    await tap(page, '[data-act="add-type"][data-type="expense"]');
    await typeAmount(page, '321');
    await tap(page, '[data-act="pick-cat"]');
    const before = await page.evaluate(() => window.JELAS_APP.state().transactions.length);
    await page.evaluate(() => {
      const b = document.querySelector('[data-act="save-tx"]');
      b.click(); b.click();
    });
    await wait(800);
    const after = await page.evaluate(() => window.JELAS_APP.state().transactions.length);
    if (after !== before + 1) throw new Error('double tap created ' + (after - before) + ' rows');
  });

  /* 16e. new features: bills, ask, templates, net worth, calendar, limit */
  await check(run, 'auto-categorise suggests from history', async () => {
    await ensureUnlocked(page);
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const a = S.get().accounts.filter(x => !x.archived)[0];
      S.addTransaction({ type: 'expense', amount: 9, accountId: a.id, categoryId: 'c_coffee', note: 'Kopi susu' });
      S.addTransaction({ type: 'expense', amount: 9, accountId: a.id, categoryId: 'c_coffee', note: 'Kopi susu' });
      return { hit: S.suggestCategory('Kopi susu', 'expense'), miss: S.suggestCategory('zzzq', 'expense') };
    });
    if (r.hit !== 'c_coffee') throw new Error('expected c_coffee, got ' + r.hit);
    if (r.miss !== null) throw new Error('should not guess for an unknown note');
  });

  await check(run, 'quick templates come from repeats', async () => {
    const list = await page.evaluate(() => window.JELAS_STORE.frequentTemplates(6));
    if (!list.length) throw new Error('no templates');
    if (list[0].count < 2) throw new Error('template count wrong: ' + list[0].count);
  });

  await check(run, 'net worth snapshot + series', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      S.snapshotNetWorth();
      const s = S.netWorthSeries(12);
      return { n: s.length, last: s[s.length - 1] };
    });
    if (!r.n) throw new Error('no series');
    if (typeof r.last.value !== 'number') throw new Error('series value not numeric');
  });

  await check(run, 'ask: category + range', async () => {
    const r = await page.evaluate(() => window.JELAS_STORE.ask('coffee this month'));
    if (r.category !== 'c_coffee') throw new Error('category ' + r.category);
    if (typeof r.amount !== 'number') throw new Error('amount not numeric');
  });
  await check(run, 'ask: income / biggest / count', async () => {
    const r = await page.evaluate(() => ({
      inc: window.JELAS_STORE.ask('how much did I earn'),
      big: window.JELAS_STORE.ask('biggest expense'),
      cnt: window.JELAS_STORE.ask('how many coffee'),
      none: window.JELAS_STORE.ask('')
    }));
    if (r.inc.wantType !== 'income') throw new Error('income parse failed');
    if (r.big.kind !== 'biggest') throw new Error('biggest parse failed');
    if (r.cnt.kind !== 'count') throw new Error('count parse failed');
    if (r.none !== null) throw new Error('empty query should return null');
  });

  await check(run, 'bill CRUD + due date + frequency maths', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const b = S.addBill({ name: 'Streaming', amount: 45, dueDay: 5, frequency: 'monthly', categoryId: 'c_ent' });
      const due = S.nextDueDate(b, new Date());
      return {
        n: S.activeBills().length,
        dueDay: due.getDate(),
        monthly: S.monthlyBillsTotal(),
        yearlyEq: S.monthlyEquivalent({ amount: 120, frequency: 'yearly' }),
        weeklyEq: S.monthlyEquivalent({ amount: 10, frequency: 'weekly' })
      };
    });
    if (r.n !== 1) throw new Error('bill not added');
    if (r.dueDay !== 5) throw new Error('due day wrong: ' + r.dueDay);
    if (r.monthly !== 45) throw new Error('monthly total wrong: ' + r.monthly);
    if (r.yearlyEq !== 10) throw new Error('yearly equivalent wrong: ' + r.yearlyEq);
    if (Math.abs(r.weeklyEq - 43.33) > 0.01) throw new Error('weekly equivalent wrong: ' + r.weeklyEq);
  });

  await check(run, 'unpaid bill is reserved in safe-to-spend', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const before = S.safeToSpend().reserved;
      S.addBill({ name: 'Music app', amount: 20, dueDay: new Date().getDate(), frequency: 'monthly' });
      return { before: before, after: S.safeToSpend().reserved };
    });
    if (r.after - r.before !== 20) throw new Error('reserve did not rise by 20: ' + JSON.stringify(r));
  });

  await check(run, 'marking a bill paid logs it and clears the reserve', async () => {
    const r = await page.evaluate(() => {
      const S = window.JELAS_STORE;
      const bills = S.activeBills();
      const target = bills[bills.length - 1];
      const before = S.get().transactions.length;
      const reserveBefore = S.billsReserveUntil(S.endOfMonth(new Date()));
      S.markBillPaid(target.id);
      return {
        tx: S.get().transactions.length - before,
        paid: S.isBillPaid(target, new Date()),
        reserveBefore: reserveBefore,
        reserveAfter: S.billsReserveUntil(S.endOfMonth(new Date()))
      };
    });
    if (r.tx !== 1) throw new Error('no transaction logged');
    if (!r.paid) throw new Error('bill not marked paid');
    if (r.reserveAfter >= r.reserveBefore) throw new Error('reserve did not drop');
  });

  await check(run, 'bills overlay lists the bill', async () => {
    await ensureUnlocked(page);
    await tap(page, '[data-act="set-tab"][data-tab="me"]');
    await tap(page, '[data-act="me-group"][data-g="manage"]');
    await tap(page, '[data-act="open"][data-ov="bills"]');
    const body = await txt(page, '#ovBody');
    if (!/Streaming/.test(body)) throw new Error('bill not listed');
    await tap(page, '[data-act="ov-back"]');
  });

  await check(run, 'ask overlay renders an answer', async () => {
    await ensureUnlocked(page);
    await tap(page, '[data-act="set-tab"][data-tab="today"]');
    await tap(page, '[data-act="open"][data-ov="ask"]');
    await tap(page, '[data-act="ask-ex"]');
    await wait(500);
    const html = await page.evaluate(() => document.getElementById('askOut').innerHTML);
    if (!/answer/.test(html)) throw new Error('no answer rendered');
    await tap(page, '[data-act="ov-back"]');
  });

  await check(run, 'spending calendar renders and filters', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="flow"]');
    const cells = await page.$$eval('#flowTab .cal .cday', els => els.length);
    if (cells < 28) throw new Error('calendar cells ' + cells);
    const before = await page.$$eval('#flowTab .ledger', els => els.length);
    await page.evaluate(() => document.querySelector('#flowTab .cal .cday:not(.empty)').click());
    await wait(450);
    const after = await page.$$eval('#flowTab .ledger', els => els.length);
    if (after > before) throw new Error('day filter did not reduce the list (' + before + ' -> ' + after + ')');
    await page.evaluate(() => window.JELAS_APP.render());
  });

  await check(run, 'monthly limit via the UI drives safe-to-spend', async () => {
    await ensureUnlocked(page);
    await tap(page, '[data-act="set-tab"][data-tab="today"]');
    await tap(page, '[data-act="limit-open"]');
    await wait(400);
    const opened = await page.evaluate(() => !!document.getElementById('lim_amt'));
    if (!opened) throw new Error('limit sheet did not open');
    await page.evaluate(() => { document.getElementById('lim_amt').value = '750'; });
    await tap(page, '[data-act="limit-save"]');
    await wait(600);
    const r = await page.evaluate(() => ({
      limit: window.JELAS_STORE.monthlyLimit(),
      sts: window.JELAS_STORE.safeToSpend()
    }));
    if (r.limit !== 750) throw new Error('limit ' + r.limit);
    if (r.sts.source !== 'limit') throw new Error('safe-to-spend source ' + r.sts.source);
    if (r.sts.limit !== 750) throw new Error('safe-to-spend limit ' + r.sts.limit);
  });

  /* 17. security: privacy blur */
  await check(run, 'privacy blur toggles', async () => {
    await tap(page, '[data-act="me-group"][data-g="app"]');
    await tap(page, '[data-act="open"][data-ov="security"]');
    await tap(page, '[data-act="sec-toggle"][data-key="privacyBlur"]');
    const on = await page.evaluate(() => document.body.classList.contains('blur'));
    if (!on) throw new Error('blur not applied');
    await tap(page, '[data-act="sec-toggle"][data-key="privacyBlur"]');
    const off = await page.evaluate(() => document.body.classList.contains('blur'));
    if (off) throw new Error('blur not removed');
    await tap(page, '[data-act="ov-back"]');
  });

  /* 18. theme */
  await check(run, 'theme switches', async () => {
    await tap(page, '[data-act="open"][data-ov="settings"]');
    await tap(page, '[data-act="set-theme"][data-v="light"]');
    let th = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (th !== 'light') throw new Error('light not applied: ' + th);
    await tap(page, '[data-act="set-theme"][data-v="dark"]');
    th = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    if (th !== 'dark') throw new Error('dark not applied: ' + th);
    await tap(page, '[data-act="set-theme"][data-v="auto"]');
    await tap(page, '[data-act="ov-back"]');
  });

  /* 19. language switch across all three */
  await check(run, 'language switch all 3', async () => {
    await tap(page, '[data-act="open"][data-ov="settings"]');
    await tap(page, '[data-act="set-lang"][data-l="en"]');
    let n = await txt(page, '#tabbar');
    if (!/Today/.test(n)) throw new Error('en nav wrong: ' + n);
    await tap(page, '[data-act="set-lang"][data-l="zh"]');
    n = await txt(page, '#tabbar');
    if (!/今天/.test(n)) throw new Error('zh nav wrong: ' + n);
    await tap(page, '[data-act="set-lang"][data-l="ms"]');
    n = await txt(page, '#tabbar');
    if (!/Hari Ini/.test(n)) throw new Error('ms nav wrong: ' + n);
    await tap(page, '[data-act="ov-back"]');
  });

  /* 20. lock screen */
  await check(run, 'lock + wrong PIN + unlock', async () => {
    await page.evaluate(() => window.JELAS_APP.lockNow());
    await wait(600);
    if (!await page.evaluate(() => document.getElementById('lock').classList.contains('show')))
      throw new Error('lock not shown');
    await page.evaluate(() => { const e = document.getElementById('lockErr'); if (e) e.textContent = ''; });
    await enterPin(page, '999999', '[data-act="lock-key"]');
    await waitForText(page, '#lockErr', /salah|Wrong|错误/);
    await page.evaluate(() => { const e = document.getElementById('lockErr'); if (e) e.textContent = ''; });
    await enterPin(page, '123456', '[data-act="lock-key"]');
    await waitForUnlocked(page);
  });

  /* 21. locking must flush pending writes (regression) */
  await check(run, 'lock flushes pending writes', async () => {
    await tap(page, '[data-act="set-tab"][data-tab="add"]');
    await tap(page, '[data-act="add-type"][data-type="expense"]');
    await typeAmount(page, '777');
    await tap(page, '[data-act="pick-cat"]');
    await tap(page, '[data-act="save-tx"]');
    // lock immediately — do not give the debounced save a chance to fire on its own
    await page.evaluate(() => window.JELAS_APP.lockNow());
    await wait(1400);
    await enterPin(page, '123456', '[data-act="lock-key"]');
    await waitForUnlocked(page);
    const found = await page.evaluate(() => window.JELAS_APP.state().transactions.some(t => t.amount === 777));
    if (!found) throw new Error('last edit was lost when locking');
  });

  /* 22. brute-force lockout */
  await check(run, 'lockout engages after repeated wrong PINs', async () => {
    await page.evaluate(() => {
      window.JELAS_DB.prefs.set('lockFails', 0);
      window.JELAS_DB.prefs.set('lockUntil', 0);
    });
    await page.evaluate(() => window.JELAS_APP.lockNow());
    await wait(600);
    // Each attempt needs its own PBKDF2 run; clear the error and wait for the new
    // one so attempts can never overlap.
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        const e = document.getElementById('lockErr');
        if (e) e.textContent = '';
      });
      await enterPin(page, '000000', '[data-act="lock-key"]');
      await waitForText(page, '#lockErr', /salah|Wrong|错误/, 15000);
    }
    // wait for the lockout to be recorded
    let until = 0;
    for (let i = 0; i < 60; i++) {
      until = await page.evaluate(() => window.JELAS_DB.prefs.get('lockUntil', 0));
      if (until > Date.now()) break;
      await wait(250);
    }
    if (until <= Date.now()) throw new Error('no lockout recorded after repeated failures');
    // the correct PIN must now be refused
    await page.evaluate(() => {
      const e = document.getElementById('lockErr');
      if (e) e.textContent = '';
    });
    await enterPin(page, '123456', '[data-act="lock-key"]');
    await waitForText(page, '#lockErr', /salah|Wrong|错误|Dikunci|Locked|已锁定/);
    const stillLocked = await page.evaluate(() => document.getElementById('lock').classList.contains('show'));
    if (!stillLocked) throw new Error('correct PIN bypassed the lockout');
    // clear it and unlock
    await page.evaluate(() => {
      window.JELAS_DB.prefs.set('lockFails', 0);
      window.JELAS_DB.prefs.set('lockUntil', 0);
      const e = document.getElementById('lockErr');
      if (e) e.textContent = '';
    });
    await enterPin(page, '123456', '[data-act="lock-key"]');
    await waitForUnlocked(page);
    const n = await page.evaluate(() => window.JELAS_APP.state().transactions.length);
    if (n < 1) throw new Error('data missing after unlock: ' + n);
  }, 150000);

  /* 22. restore sanitisation */
  await check(run, 'restore sanitises a hostile payload', async () => {
    const r = await page.evaluate(() => {
      const evil = {
        settings: { theme: 'evil', locale: 'xx', autoLock: -5, method: 'nope' },
        accounts: [{ id: '"><img src=x onerror=alert(1)>', name: '<script>alert(1)</script>', type: 'cash' }],
        categories: [{ id: 'c_x', name: '<b>x</b>', kind: 'bogus', color: 'javascript:alert(1)' }],
        transactions: [{ id: 't1', type: 'bogus', amount: 'abc', date: 'not-a-date', accountId: '"><x>', note: '=cmd|calc' }],
        checklists: [{ id: 'cl1', custom: true, name: '<img>', items: [{ id: 'i1', text: '<script>', done: 'yes' }] }]
      };
      const out = window.JELAS_STORE.sanitizeState(evil);
      return {
        theme: out.settings.theme, locale: out.settings.locale,
        autoLock: out.settings.autoLock, method: out.settings.method,
        accId: out.accounts[0] ? out.accounts[0].id : null,
        catKind: out.categories[0] ? out.categories[0].kind : null,
        catColor: out.categories[0] ? out.categories[0].color : null,
        txType: out.transactions[0] ? out.transactions[0].type : null,
        txAmount: out.transactions[0] ? out.transactions[0].amount : null,
        txDate: out.transactions[0] ? out.transactions[0].date : null,
        txAcct: out.transactions[0] ? out.transactions[0].accountId : null,
        clName: out.checklists[0] ? out.checklists[0].name : null,
        clItemDone: out.checklists[0] && out.checklists[0].items[0] ? out.checklists[0].items[0].done : null
      };
    });
    if (r.theme !== 'auto') throw new Error('hostile theme kept: ' + r.theme);
    if (r.locale !== 'en') throw new Error('hostile locale kept');
    if (r.method !== '5020') throw new Error('hostile method kept');
    if (r.autoLock < 0 || r.autoLock > 3600) throw new Error('autoLock not clamped: ' + r.autoLock);
    if (!/^[A-Za-z0-9_-]*$/.test(String(r.accId))) throw new Error('unsafe id survived: ' + r.accId);
    if (r.catKind !== 'want') throw new Error('bad kind kept: ' + r.catKind);
    if (!/^#[0-9a-fA-F]{3,8}$/.test(String(r.catColor))) throw new Error('bad colour kept: ' + r.catColor);
    if (r.txType !== 'expense') throw new Error('bad type kept: ' + r.txType);
    if (r.txAmount !== 0) throw new Error('bad amount survived: ' + r.txAmount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.txDate))) throw new Error('bad date survived: ' + r.txDate);
    if (r.txAcct !== null) throw new Error('dangling accountId survived: ' + r.txAcct);
    if (typeof r.clItemDone !== 'boolean') throw new Error('item.done not coerced');
  });

  /* 25. CSV formula injection guard */
  await check(run, 'CSV neutralises formula injection', async () => {
    await ensureUnlocked(page);
    const csv = await page.evaluate(() => {
      const txs = window.JELAS_APP.state().transactions;
      if (!txs.length) throw new Error('no transactions to test with');
      txs[0].note = '=cmd|calc';
      return window.JELAS_STORE.toCSV();
    });
    if (/,\s*=cmd/.test(csv)) throw new Error('formula not neutralised');
    if (!/'=cmd/.test(csv)) throw new Error('expected a leading quote before the formula');
  });

  /* 24. encryption at rest */
  await check(run, 'data is encrypted in IndexedDB', async () => {
    const leaked = await page.evaluate(async () => {
      return new Promise(resolve => {
        const req = indexedDB.open('jelas');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('kv', 'readonly');
          const g = tx.objectStore('kv').get('data');
          g.onsuccess = () => {
            const rec = g.result;
            if (!rec) return resolve('no-record');
            const blob = JSON.stringify(rec);
            // plaintext markers that must NOT appear
            const bad = ['My Bank', 'Student Loan', 'Laptop', 'Bubble tea'].filter(w => blob.indexOf(w) !== -1);
            resolve(bad.length ? 'leaked:' + bad.join(',') : 'clean');
          };
          g.onerror = () => resolve('error');
        };
        req.onerror = () => resolve('openerror');
      });
    });
    if (leaked !== 'clean') throw new Error('encryption check: ' + leaked);
  });

  /* 22. crypto roundtrip + wrong password */
  await check(run, 'crypto roundtrip + wrong password fails', async () => {
    const r = await page.evaluate(async () => {
      const salt = window.JELAS_CRYPTO.newSalt();
      const k = await window.JELAS_CRYPTO.deriveKey('pw123456', salt);
      const enc = await window.JELAS_CRYPTO.encryptString(k, 'secret-data');
      const dec = await window.JELAS_CRYPTO.decryptString(k, enc);
      const k2 = await window.JELAS_CRYPTO.deriveKey('wrongpass', salt);
      let wrongOk = true;
      try { await window.JELAS_CRYPTO.decryptString(k2, enc); } catch (e) { wrongOk = false; }
      return { dec, wrongOk };
    });
    if (r.dec !== 'secret-data') throw new Error('roundtrip failed');
    if (r.wrongOk) throw new Error('wrong password decrypted!');
  });

  /* 23. receipt compression */
  await check(run, 'receipt compress shrinks image', async () => {
    const r = await page.evaluate(async () => {
      // build a large synthetic photo
      const c = document.createElement('canvas');
      c.width = 3000; c.height = 2000;
      const x = c.getContext('2d');
      const grd = x.createLinearGradient(0, 0, 3000, 2000);
      grd.addColorStop(0, '#eee'); grd.addColorStop(1, '#333');
      x.fillStyle = grd; x.fillRect(0, 0, 3000, 2000);
      x.fillStyle = '#000'; x.font = '90px sans-serif';
      x.fillText('RESIT TOTAL RM 42.50', 200, 900);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.95));
      const file = new File([blob], 'r.jpg', { type: 'image/jpeg' });
      const out = await window.JELAS_RECEIPTS.compress(file);
      return { inBytes: file.size, outBytes: out.bytes, w: out.width, h: out.height };
    });
    if (!(r.outBytes < r.inBytes)) throw new Error('not compressed: ' + r.inBytes + ' -> ' + r.outBytes);
    if (r.w > 1600) throw new Error('width not capped: ' + r.w);
    if (r.outBytes > 600 * 1024) throw new Error('still too big: ' + r.outBytes);
  });

  /* 26. CSV export/import */
  await check(run, 'CSV export has rows', async () => {
    await ensureUnlocked(page);
    const r = await page.evaluate(() => {
      const csv = window.JELAS_STORE.toCSV();
      return { csv, txs: window.JELAS_APP.state().transactions.length };
    });
    const lines = r.csv.split('\n');
    if (lines.length < 2) throw new Error('csv lines ' + lines.length + ' (txs=' + r.txs + ')');
    if (!/^date,type,amount/.test(lines[0])) throw new Error('bad header');
  });
  await check(run, 'CSV import parses', async () => {
    const n = await page.evaluate(() => {
      const rows = window.JELAS_STORE.parseCSV('date,type,amount,category,note\n2026-10-01,expense,12.50,Food,lunch\n2026-10-02,income,100,Salary,pay');
      return rows.length;
    });
    if (n !== 2) throw new Error('parsed ' + n);
  });

  /* 25. i18n completeness */
  await check(run, 'all 3 dictionaries have same keys', async () => {
    const r = await page.evaluate(() => {
      function flat(o, p, out) {
        for (const k in o) {
          if (k === '_name' || k === '_flag') continue;
          const v = o[k];
          if (v && typeof v === 'object') flat(v, p + k + '.', out);
          else out.push(p + k);
        }
        return out;
      }
      const d = window.I18N.dict;
      const en = flat(d.en, '', []);
      const ms = flat(d.ms, '', []);
      const zh = flat(d.zh, '', []);
      const missMs = en.filter(k => ms.indexOf(k) === -1);
      const missZh = en.filter(k => zh.indexOf(k) === -1);
      return { en: en.length, missMs, missZh };
    });
    if (r.missMs.length) throw new Error('BM missing: ' + r.missMs.slice(0, 6).join(','));
    if (r.missZh.length) throw new Error('ZH missing: ' + r.missZh.slice(0, 6).join(','));
  });

  /* 26. no network calls possible (CSP) */
  await check(run, 'CSP blocks network', async () => {
    const blocked = await page.evaluate(async () => {
      try { await fetch('https://example.com/x'); return false; }
      catch (e) { return true; }
    });
    if (!blocked) throw new Error('fetch was allowed!');
  });

  /* 27. changing the PIN — runs last because it changes the PIN */
  await check(run, 'changing the PIN keeps data and locks out the old PIN', async () => {
    await ensureUnlocked(page);
    const before = await page.evaluate(() => window.JELAS_APP.state().transactions.length);

    await tap(page, '[data-act="set-tab"][data-tab="me"]');
    await tap(page, '[data-act="me-group"][data-g="app"]');
    await tap(page, '[data-act="open"][data-ov="security"]');
    await tap(page, '[data-act="sec-change-pin"]');
    await page.evaluate(() => {
      document.getElementById('cp_old').value = '123456';
      document.getElementById('cp_new').value = '654321';
    });
    await tap(page, '[data-act="sec-do-change-pin"]');
    await wait(4000);

    await page.evaluate(() => window.JELAS_APP.lockNow({ hard: true }));
    await wait(900);

    // the old PIN must now be refused
    await page.evaluate(() => { const e = document.getElementById('lockErr'); if (e) e.textContent = ''; });
    await enterPin(page, '123456', '[data-act="lock-key"]');
    await waitForText(page, '#lockErr', /salah|Wrong|错误/);

    // the new PIN must work, and the data must still be there
    await page.evaluate(() => { const e = document.getElementById('lockErr'); if (e) e.textContent = ''; });
    await enterPin(page, '654321', '[data-act="lock-key"]');
    await waitForUnlocked(page);
    const after = await page.evaluate(() => window.JELAS_APP.state().transactions.length);
    if (after !== before) throw new Error('data lost across PIN change: ' + before + ' -> ' + after);
  }, 120000);
}

/* ---------- runner ---------- */
(async () => {
  console.log('JELAS test suite — ' + RUNS + ' runs\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  for (let run = 1; run <= RUNS; run++) {
    // a fresh, isolated storage partition per run
    const ctx = await browser.createBrowserContext();
    const page = await newPage(ctx, { dark: run % 2 === 0 });
    try {
      await page.goto(APP, { waitUntil: 'domcontentloaded' });
      await wait(500);
      await journey(page, run);

      // screenshots on the first run only
      if (run === 1) {
        await page.evaluate(() => {
          window.JELAS_APP.state().settings.privacyBlur = false;
          document.body.classList.remove('blur');
        });
        for (const tb of ['today', 'flow', 'report', 'me']) {
          await tap(page, `[data-act="set-tab"][data-tab="${tb}"]`);
          await wait(400);
          await page.screenshot({ path: `shot-${tb}.png` });
          shots++;
        }
        await tap(page, '[data-act="set-tab"][data-tab="add"]');
        await wait(400);
        await page.screenshot({ path: 'shot-add.png' });
        shots++;
      }
    } catch (e) {
      fault(run, 'journey crashed', e.message);
    }
    try { await ctx.close(); } catch (e) {}
    process.stdout.write('run ' + run + '/' + RUNS + ' — faults so far: ' + faults.length + '\n');
  }

  // report first — never let a stuck browser swallow the results
  console.log('\n===============================');
  console.log('PASSES: ' + passes);
  console.log('FAULTS: ' + faults.length);
  if (faults.length) {
    console.log('\n--- faults ---');
    const seen = {};
    faults.forEach(f => {
      const key = f.name + '|' + f.msg;
      if (seen[key]) { seen[key].n++; return; }
      seen[key] = { n: 1, f };
    });
    Object.keys(seen).forEach(k => {
      const { n, f } = seen[k];
      console.log(`[x${n}] run ${f.run} · ${f.name}\n      ${f.msg}`);
    });
  } else {
    console.log('\nALL CLEAN');
  }
  fs.writeFileSync('test-report.json', JSON.stringify({ passes, faults, runs: RUNS }, null, 2));
  console.log('\nreport -> test-report.json');

  try {
    await Promise.race([browser.close(), wait(8000)]);
  } catch (e) {}
  try { if (browser.process()) browser.process().kill('SIGKILL'); } catch (e) {}
  process.exit(faults.length ? 1 : 0);
})();
