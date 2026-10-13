/* JELAS — application logic
 * Screens, navigation, forms, onboarding, lock, and the Android bridge.
 * Original implementation.
 */
(function () {
  'use strict';

  /* ================= state ================= */
  var S = window.JELAS_STORE;
  var KEY = null;
  var tab = 'today';
  var reportRange = 'week';
  var reportAnchor = new Date();
  var flowAnchor = new Date();
  var flowFilter = 'all';
  var flowQuery = '';
  var flowDay = null;
  var meGroup = 'manage';
  var overlayStack = [];
  var lockBuf = '';
  var lockTries = 0;
  var onbStep = 0;
  var onbLang = 'en';
  var onbMethod = '5020';
  var onbPin = '', onbPin2 = null;
  var lastActivity = Date.now();
  var pendingReceipt = null;
  var addState = null;

  /* ================= tiny helpers ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function t(k, v) { return window.I18N.t(k, v); }
  function money(n) { return window.I18N.money(n); }
  /* Compact form for tight tiles — keeps big numbers from overflowing. */
  function moneyStat(n) {
    var a = Math.abs(Number(n) || 0);
    if (a >= 100000) return (n < 0 ? '-' : '') + 'RM' + window.I18N.compact(a);
    return money(n);
  }
  /* Percentages can go wild on unusual data — keep them readable. */
  function pctText(v) {
    var n = Math.round(Number(v) || 0);
    if (n > 999) return '999+%';
    if (n < -999) return '-999%';
    return n + '%';
  }
  function ic(name, cls) { return window.JELAS_SEED.svg(name, cls); }
  /* Section header: a dot, a label, a hairline — the "clear line" as a divider. */
  function sechead(label) {
    return '<div class="sechead"><span class="dotmark"></span><span class="t">' + esc(label) +
      '</span><span class="line"></span></div>';
  }
  function fmtDate(iso, style) { return window.I18N.fmtDate(iso, style); }
  var DEFAULT_CFG = {
    currency: 'MYR', method: '5020', theme: 'auto', locale: 'en', reduceMotion: false,
    haptics: true, privacyBlur: false, screenshotBlock: true, autoLock: 15, bio: false, receiptScan: false
  };
  function cfg() {
    var st = S.get();
    return (st && st.settings) ? st.settings : DEFAULT_CFG;
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1900);
  }
  function haptic(ms) {
    try {
      if (cfg().haptics && navigator.vibrate) navigator.vibrate(ms || 8);
    } catch (e) {}
  }

  /* ================= fintech feel ================= */
  /* A single glanceable 0–100 that blends savings rate, limit discipline and habit. */
  function moneyScore(date) {
    var d = date ? new Date(date) : new Date();
    var ms = S.monthStats(d);
    var score = 50;
    if (ms.in > 0) {
      var rate = (ms.in - ms.out) / ms.in;
      score += Math.max(-25, Math.min(30, rate * 100));
    } else if (ms.out > 0) {
      score -= 15;
    }
    var lim = S.monthLimitStatus(d);
    if (lim.limit > 0) {
      if (lim.pct <= 70) score += 20;
      else if (lim.pct <= 100) score += 8;
      else score -= 20;
    }
    score += Math.min(15, S.loggingStreak() * 2);
    score = Math.max(0, Math.min(100, Math.round(score)));
    var label, tone;
    if (score >= 55) { label = t(score >= 75 ? 'score.strong' : 'score.steady'); tone = 'good'; }
    else if (score >= 35) { label = t('score.watch'); tone = 'mid'; }
    else { label = t('score.tight'); tone = 'bad'; }
    return { value: score, label: label, tone: tone };
  }

  /* Count hero numbers up from zero. */
  function animateNumbers(root) {
    if (cfg().reduceMotion || !window.requestAnimationFrame) return;
    var els = (root || document).querySelectorAll('.count-me');
    Array.prototype.forEach.call(els, function (el) {
      var to = Number(el.getAttribute('data-count'));
      if (isNaN(to)) return;
      var t0 = performance.now();
      var dur = 720;
      function frame(now) {
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = money(to * e);
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = money(to);
      }
      requestAnimationFrame(frame);
    });
  }

  /* Confetti for a genuinely good moment (bill paid, goal reached). */
  function celebrate() {
    if (cfg().reduceMotion) return;
    try {
      var box = document.createElement('div');
      box.className = 'confetti';
      var colors = ['#1F6F63', '#4F7A4A', '#B0603F', '#B08D3C', '#5FD3A6', '#E4EDEA'];
      for (var i = 0; i < 26; i++) {
        var s = document.createElement('i');
        s.style.left = (Math.random() * 100) + '%';
        s.style.top = '0';
        s.style.background = colors[i % colors.length];
        s.style.animationDelay = Math.round(Math.random() * 280) + 'ms';
        box.appendChild(s);
      }
      document.body.appendChild(box);
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1900);
    } catch (e) {}
  }

  /* Ripple ink from the tap point. */
  function rippleAt(el, ev) {
    if (cfg().reduceMotion) return;
    try {
      var r = el.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      if (!size) return;
      var span = document.createElement('span');
      span.className = 'ripple-ink';
      span.style.width = span.style.height = size + 'px';
      var px = (ev && ev.clientX ? ev.clientX : r.left + r.width / 2) - r.left;
      var py = (ev && ev.clientY ? ev.clientY : r.top + r.height / 2) - r.top;
      span.style.left = (px - size / 2) + 'px';
      span.style.top = (py - size / 2) + 'px';
      el.classList.add('ripple-host');
      el.appendChild(span);
      setTimeout(function () { if (span.parentNode) span.parentNode.removeChild(span); }, 660);
    } catch (e) {}
  }

  /* Android bridge (all optional — the web build works without it) */
  function android() { return window.JelasAndroid || null; }
  function hasAndroid() { return !!android(); }

  /* Hardware-bound secret from the Android Keystore, mixed into the KDF salt.
     Null in a plain browser. */
  function deviceSecret() {
    try {
      var a = android();
      if (!a || typeof a.getDeviceSecret !== 'function') return null;
      var s = a.getDeviceSecret();
      return (s && s.length > 10) ? s : null;
    } catch (e) { return null; }
  }

  /* ---- brute-force lockout (persisted, so restarting the app does not reset it) ---- */
  function lockFails() { return Number(window.JELAS_DB.prefs.get('lockFails', 0)) || 0; }
  function lockUntilTs() { return Number(window.JELAS_DB.prefs.get('lockUntil', 0)) || 0; }
  function bumpLockFails() {
    var n = lockFails() + 1;
    window.JELAS_DB.prefs.set('lockFails', n);
    var delay = 0;
    if (n >= 5) delay = Math.min(15 * 60 * 1000, 5000 * Math.pow(2, n - 5));
    if (delay > 0) window.JELAS_DB.prefs.set('lockUntil', Date.now() + delay);
    return { n: n, delay: delay };
  }
  function resetLockFails() {
    window.JELAS_DB.prefs.set('lockFails', 0);
    window.JELAS_DB.prefs.set('lockUntil', 0);
  }
  function waitLabel(ms) {
    var s = Math.ceil(ms / 1000);
    if (s < 60) return s + 's';
    return Math.ceil(s / 60) + ' min';
  }

  /* ================= theme & chrome ================= */
  function applyTheme() {
    var mode = cfg().theme || 'auto';
    var dark = false;
    if (mode === 'dark') dark = true;
    else if (mode === 'auto') {
      try { dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) {}
    }
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var meta = $('metaTheme');
    if (meta) meta.setAttribute('content', dark ? '#161513' : '#F2EFE8');
    var lm = $('lockMark');
    if (lm) lm.style.background = dark ? '#EDE9E1' : '#1F1D1A';
    document.body.classList.toggle('reduce-motion', !!cfg().reduceMotion);
    document.body.classList.toggle('blur', !!cfg().privacyBlur);
  }

  function applyLang(code) {
    window.I18N.setLang(code);
    cfg().locale = code;
  }

  /* The JELAS mark: a dark rounded tile, one clear line, one settled dot. */
  function markSVG(size) {
    var s = size || 30;
    var id = 'jmg' + s;
    return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#2B2D33"/><stop offset="1" stop-color="#101114"/>' +
      '</linearGradient></defs>' +
      '<rect width="64" height="64" rx="18" fill="url(#' + id + ')"/>' +
      '<line x1="17" y1="32" x2="38.4" y2="32" stroke="#F5F3EE" stroke-width="3.6" stroke-linecap="round"/>' +
      '<circle cx="46.4" cy="32" r="3.9" fill="#2FA08C"/></svg>';
  }

  function renderChrome() {
    $('brandMark').innerHTML = markSVG(30);

    $('headSub').textContent = t('app.tagline');
    $('blurBtn').innerHTML = ic(cfg().privacyBlur ? 'eyeoff' : 'eye');
    $('blurBtn').classList.toggle('on', !!cfg().privacyBlur);
    $('blurBtn').setAttribute('aria-label', t('me.privacy_blur'));
    $('lockBtn').innerHTML = ic('lock');
    $('lockBtn').setAttribute('aria-label', t('sec.lock_now'));

    var items = [
      { id: 'today', icon: 'home' },
      { id: 'flow', icon: 'flow' },
      { id: 'add', icon: 'plus', add: true },
      { id: 'report', icon: 'chart' },
      { id: 'me', icon: 'settings' }
    ];
    $('tabbar').innerHTML = items.map(function (it) {
      if (it.add) {
        return '<button class="addbtn" data-act="set-tab" data-tab="add" aria-label="' + esc(t('nav.add')) + '">' +
          '<span class="fab">' + ic('plus') + '</span></button>';
      }
      return '<button data-act="set-tab" data-tab="' + it.id + '" class="' + (tab === it.id ? 'active' : '') + '">' +
        ic(it.icon) + '<span>' + esc(t('nav.' + it.id)) + '</span></button>';
    }).join('');
  }

  function setTab(name) {
    if (name === 'add') {
      if (!addState) newAddState('expense');
    }
    tab = name;
    ['today', 'flow', 'add', 'report', 'me'].forEach(function (n) {
      var sec = $(n + 'Tab');
      if (sec) sec.classList.toggle('active', n === name);
    });
    var btns = $('tabbar').querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    }
    render();
    window.scrollTo(0, 0);
  }

  /* ================= overlays ================= */
  function openOverlay(name, param) {
    overlayStack.push({ name: name, param: param });
    $('overlay').classList.add('show');
    renderOverlay();
    document.body.style.overflow = 'hidden';
  }
  function closeOverlay() {
    overlayStack.pop();
    if (!overlayStack.length) {
      $('overlay').classList.remove('show');
      document.body.style.overflow = '';
      render();
    } else {
      renderOverlay();
    }
  }
  function closeAllOverlays() {
    overlayStack = [];
    $('overlay').classList.remove('show');
    document.body.style.overflow = '';
    render();
  }
  function renderOverlay() {
    var top = overlayStack[overlayStack.length - 1];
    if (!top) return;
    $('ovBack').innerHTML = ic('chevron');
    $('ovBack').style.transform = 'rotate(180deg)';
    var def = OVERLAYS[top.name];
    if (!def) { closeOverlay(); return; }
    $('ovTitle').textContent = def.title(top.param);
    var act = $('ovAction');
    if (def.action) {
      act.style.display = '';
      act.innerHTML = ic(def.action.icon);
      act.setAttribute('data-act', def.action.act);
      act.setAttribute('aria-label', t('common.add'));
    } else {
      act.style.display = 'none';
      act.removeAttribute('data-act');
      act.removeAttribute('aria-label');
    }
    $('ovBody').innerHTML = def.body(top.param);
    $('overlay').scrollTop = 0;
    if (def.after) def.after(top.param);
  }

  /* sheets */
  function openSheet(html) {
    $('sheetBody').innerHTML = html;
    $('sheetWrap').classList.add('show');
  }
  function closeSheet() { $('sheetWrap').classList.remove('show'); }

  /* ================= add-transaction state ================= */
  function newAddState(type) {
    var accts = S.get().accounts.filter(function (a) { return !a.archived; });
    var last = S.get().transactions[S.get().transactions.length - 1];
    addState = {
      type: type || 'expense',
      amount: '',
      categoryId: null,
      accountId: (last && last.accountId && accts.some(function (a) { return a.id === last.accountId; })) ? last.accountId : (accts[0] ? accts[0].id : null),
      toAccountId: null,
      date: S.todayISO(),
      note: '',
      receiptId: null,
      editId: null
    };
  }
  /* Load an existing transaction into the Add form for editing. */
  function editState(tx) {
    newAddState(tx.type);
    addState.editId = tx.id;
    addState.amount = String(tx.amount);
    addState.categoryId = tx.categoryId;
    addState.accountId = tx.accountId;
    addState.toAccountId = tx.toAccountId;
    addState.date = tx.date;
    addState.note = tx.note || '';
    addState.receiptId = tx.receiptId || null;
  }
  function amountNumber() {
    var a = (addState.amount || '').replace(/[^0-9.]/g, '');
    return a === '' ? 0 : Number(a);
  }
  function formatAmountInput(s) {
    if (!s) return '0';
    var parts = String(s).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  /* ================= render dispatcher ================= */
  function render() {
    renderChrome();
    if (tab === 'today') renderToday();
    else if (tab === 'flow') renderFlow();
    else if (tab === 'add') renderAdd();
    else if (tab === 'report') renderReport();
    else if (tab === 'me') renderMe();
    animateNumbers();
  }

  /* ================= TODAY ================= */
  function renderToday() {
    var now = new Date();
    var sts = S.safeToSpend(now);
    var ms = S.monthStats(now);
    var ws = S.weekStats(now);
    var ds = S.dayStats(now);
    var streak = S.loggingStreak();
    var cats = S.categoryTotals(S.startOfMonth(now), S.endOfMonth(now));
    var budgeted = S.totalBudgeted();
    var spent = ms.out;
    var pct = budgeted > 0 ? Math.min(100, Math.round((spent / budgeted) * 100)) : 0;
    var daysLeft = S.daysInMonth(now) - now.getDate() + 1;
    var rem = S.get().reminders.daily;
    var hour = now.getHours();
    var greetKey = hour < 12 ? 'today.greeting' : 'today.greeting';

    var recentCats = cats.slice(0, 4);
    if (!recentCats.length) {
      recentCats = S.categoriesByKind('want').slice(0, 4).map(function (c) { return { id: c.id, name: c.name, icon: c.icon, color: c.color }; });
    }

    var html = '';

    // hero — the one number that matters
    var lim = S.monthLimitStatus(now);
    var score = moneyScore(now);
    var overLimit = (sts.limit > 0 && sts.remaining < 0) || (!sts.hasBudget && sts.value <= 0);
    html += '<div class="card hero hero-grad rise">' +
      '<div class="row between" style="align-items:flex-start">' +
        '<div class="label">' + esc(t('today.safe')) + '</div>' +
        '<span class="scorechip ' + score.tone + '">' + esc(score.label) + ' · ' + score.value + '</span>' +
      '</div>' +
      '<div class="big count-me' + (overLimit ? ' warn' : '') + '" data-count="' + sts.value + '">' + money(sts.value) + '</div>' +
      '<div class="hint">' + esc(t('today.safe_hint')) + ' · ' + daysLeft + ' ' + esc(t('today.days_left')) + '</div>' +
      '<div class="herofoot">' +
        '<div class="stat"><span class="v v-in">' + money(ms.in) + '</span><span class="k">' + esc(t('today.money_in')) + '</span></div>' +
        '<div class="stat"><span class="v v-out">' + money(ms.out) + '</span><span class="k">' + esc(t('today.money_out')) + '</span></div>' +
        '<div class="stat"><span class="v">' + money(ds.out) + '</span><span class="k">' + esc(t('today.spent_today')) + '</span></div>' +
      '</div>' +
    '</div>';

    // monthly limit — set it in two taps, see the daily allowance instantly
    if (lim.limit > 0) {
      var lvlClass = lim.level === 'over' ? 'over' : (lim.level === 'warn' ? 'warn' : '');
      var lvlText = lim.level === 'over' ? t('limit.exceeded') : (lim.level === 'warn' ? t('limit.warning') : t('limit.on_track'));
      var lvlTone = lim.level === 'over' ? 'v-out' : (lim.level === 'warn' ? '' : 'v-in');
      html += '<div class="card tap rise" data-act="limit-open">' +
        '<div class="row between" style="margin-bottom:12px">' +
          '<span class="small muted" style="letter-spacing:.12em;text-transform:uppercase;font-weight:650">' + esc(t('limit.title')) + '</span>' +
          '<span class="small ' + lvlTone + '" style="font-weight:650">' + esc(lvlText) + '</span>' +
        '</div>' +
        '<div class="ringcard">' +
          '<div class="ringwrap">' + window.JELAS_CHARTS.ring(Math.min(100, lim.pct), { size: 86, label: false, color: lim.level === 'over' ? 'var(--out)' : (lim.level === 'warn' ? 'var(--gold)' : 'var(--teal)') }) +
            '<div class="ringmid"><div class="rv">' + (lim.pct > 999 ? '999+' : lim.pct) + '%</div><div class="rk">' + esc(t('limit.used')) + '</div></div>' +
          '</div>' +
          '<div class="grow">' +
            '<div class="money" style="font-size:22px;font-weight:680;letter-spacing:-.01em">' + money(Math.max(0, lim.remaining)) + '</div>' +
            '<div class="small muted">' + esc(t('limit.left')) + ' · ' + esc(t('limit.of')) + ' ' + money(lim.limit) + '</div>' +
            '<div class="hr" style="margin:10px 0"></div>' +
            '<div class="small"><b>' + money(lim.perDay) + '</b> <span class="muted">' + esc(t('limit.per_day')).toLowerCase() + '</span></div>' +
            '<div class="tiny muted">' + esc(t('limit.days_left', { n: lim.daysLeft })) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="meter ' + lvlClass + '" style="margin-top:14px"><i style="width:' + Math.min(100, lim.pct) + '%"></i></div>' +
      '</div>';
    } else {
      html += '<div class="card tap rise" data-act="limit-open">' +
        '<div class="row">' +
          '<span class="ic-wrap" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--teal-soft);color:var(--teal)">' + ic('target') + '</span>' +
          '<div class="grow"><div class="l-title">' + esc(t('limit.set_cta')) + '</div>' +
          '<div class="l-sub small">' + esc(t('limit.sub')) + '</div></div>' +
          ic('chevron', 'chev') +
        '</div>' +
      '</div>';
    }

    // ask JELAS — a question bar, answered entirely on-device
    html += '<button class="askbar rise" data-act="open" data-ov="ask">' +
      ic('search') + '<span>' + esc(t('ask.placeholder')) + '</span>' +
      '<span class="askgo">' + ic('chevron') + '</span>' +
    '</button>';

    // bills due soon
    if (S.activeBills().length) {
      var soon = S.billsDueWithin(7, now).filter(function (x) { return !S.isBillPaid(x.bill, now); });
      if (!soon.length) {
        // nothing in the next week — surface the next one that is actually unpaid
        var upcoming = S.activeBills().map(function (b) {
          var dd = S.nextDueDate(b, now);
          return { bill: b, due: dd, daysUntil: Math.round((S.startOfDay(dd) - S.startOfDay(now)) / 86400000) };
        }).filter(function (x) { return !S.isBillPaid(x.bill, now); })
          .sort(function (a, b) { return a.due - b.due; });
        soon = upcoming.slice(0, 1);
      }
      var allPaid = !soon.length;
      html += '<div class="card tap rise" data-act="open" data-ov="bills">' +
        '<div class="row between" style="margin-bottom:' + (allPaid ? '0' : '12px') + '">' +
          '<span class="small muted" style="letter-spacing:.12em;text-transform:uppercase;font-weight:650">' + esc(t('bill.title')) + '</span>' +
          '<span class="small muted num">' + money(S.monthlyBillsTotal()) + ' / ' + esc(t('common.month')).toLowerCase() + '</span>' +
        '</div>' +
        (allPaid
          ? '<div class="small v-in">' + esc(t('bill.paid_this_month')) + ' ✓</div>'
          : soon.slice(0, 3).map(function (x) {
              var dlabel = x.daysUntil === 0 ? t('bill.due_today')
                : (x.daysUntil === 1 ? t('bill.due_tomorrow') : t('bill.due_in', { n: x.daysUntil }));
              var urgent = x.daysUntil <= 1;
              return '<div class="row between" style="padding:6px 0">' +
                '<div class="row" style="gap:10px">' +
                  '<span class="ic-wrap" style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:' + (urgent ? 'color-mix(in srgb, var(--out) 14%, transparent)' : 'var(--paper)') + ';color:' + (urgent ? 'var(--out)' : 'var(--muted)') + '">' + ic(x.bill.icon || 'repeat') + '</span>' +
                  '<div><div class="small" style="font-weight:600">' + esc(x.bill.name) + '</div>' +
                  '<div class="tiny ' + (urgent ? 'v-out' : 'muted') + '">' + esc(dlabel) + '</div></div>' +
                '</div>' +
                '<span class="num small" style="font-weight:650">' + money(x.bill.amount) + '</span>' +
              '</div>';
            }).join('')) +
      '</div>';
    }

    // quick templates from what you log most
    var tpl = S.frequentTemplates(4);
    if (tpl.length) {
      html += sechead(t('tpl.title'));
      html += '<div class="chips stagger">' + tpl.map(function (x, i) {
        var c = S.category(x.categoryId);
        return '<button class="chip" data-act="tpl-use" data-i="' + i + '">' +
          ic(c ? c.icon : 'repeat') + esc(c ? c.name : (x.note || '—')) +
          ' <span class="muted tiny">' + money(x.amount) + '</span></button>';
      }).join('') + '</div>';
    }

    // per-category budget progress (only when no monthly limit is set, to avoid duplication)
    if (budgeted > 0 && lim.limit === 0) {
      html += '<div class="card rise">' +
        '<div class="row between" style="margin-bottom:8px">' +
          '<span class="small muted">' + esc(t('today.budget_left')) + '</span>' +
          '<span class="small num">' + money(Math.max(0, budgeted - spent)) + ' / ' + money(budgeted) + '</span>' +
        '</div>' +
        '<div class="meter ' + (pct >= 100 ? 'over' : (pct >= 80 ? 'warn' : '')) + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="small ' + (spent > budgeted ? 'v-out' : 'muted') + '" style="margin-top:8px">' +
          esc(spent > budgeted ? t('today.overspent') : t('today.on_track')) +
        '</div>' +
      '</div>';
    }

    // week flow bar
    html += '<div class="card">' +
      '<div class="row between" style="margin-bottom:10px">' +
        '<span class="small muted">' + esc(t('today.this_week')) + '</span>' +
        '<span class="small num"><span class="v-in">' + money(ws.in) + '</span> · <span class="v-out">' + money(ws.out) + '</span></span>' +
      '</div>' +
      window.JELAS_CHARTS.flowBar(ws.in, ws.out) +
    '</div>';

    // quick add
    html += sechead(t('today.quick_add'));
    html += '<div class="chips">' +
      recentCats.map(function (c) {
        return '<button class="chip" data-act="quick-add" data-cat="' + c.id + '">' + ic(c.icon) + esc(c.name) + '</button>';
      }).join('') +
      '<button class="chip" data-act="quick-add" data-cat="">' + ic('plus') + esc(t('nav.add')) + '</button>' +
    '</div>';

    // streak + reminder
    html += sechead(t('today.streak'));
    html += '<div class="statgrid">' +
      '<div class="statbox"><div class="k">' + esc(t('today.streak')) + '</div><div class="v">' + streak + ' 🔥</div></div>' +
      '<div class="statbox"><div class="k">' + esc(t('common.month')) + '</div><div class="v">' + S.get().transactions.filter(function (x) {
        return x.date.indexOf(S.ymd(now).slice(0, 7)) === 0;
      }).length + '</div></div>' +
      '<div class="statbox"><div class="k">' + esc(t('report.savings_rate')) + '</div><div class="v">' +
        (ms.in > 0 ? pctText(((ms.in - ms.out) / ms.in) * 100) : '—') + '</div></div>' +
    '</div>';

    // reminder
    html += '<div class="card tap" data-act="open" data-ov="reminders" style="margin-top:12px">' +
      '<div class="row">' +
        '<span class="ic-wrap" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--paper);color:' + (rem.on ? 'var(--teal)' : 'var(--muted)') + '">' + ic('bell') + '</span>' +
        '<div class="grow"><div class="l-title">' + esc(rem.on ? t('today.reminder_on') : t('today.reminder_off')) + '</div>' +
        '<div class="l-sub">' + (rem.on ? esc(rem.time) : esc(t('rem.daily_d')) ) + '</div></div>' +
        ic('chevron', 'chev') +
      '</div>' +
    '</div>';

    // insights
    var ins = S.insights();
    if (ins.length) {
      html += sechead(t('today.insight'));
      html += ins.map(function (i) {
        var col = i.tone === 'good' ? 'var(--in)' : i.tone === 'bad' ? 'var(--out)' : 'var(--muted)';
        return '<div class="card" style="display:flex;gap:12px;align-items:flex-start">' +
          '<span style="color:' + col + ';flex:none;margin-top:2px">' + ic(i.icon) + '</span>' +
          '<div class="small">' + esc(i.text) + '</div></div>';
      }).join('');
    }

    // mood
    var todayIso = S.todayISO();
    var mood = S.get().moods[todayIso];
    html += sechead(t('mood.q'));
    html += '<div class="chips">' + [['great', 'in'], ['ok', 'teal'], ['worried', ''], ['stressed', 'out']].map(function (m) {
      return '<button class="chip ' + (mood === m[0] ? 'on' : '') + '" data-act="mood-set" data-mood="' + m[0] + '">' + esc(t('mood.' + m[0])) + '</button>';
    }).join('') + '</div>';

    // today's ledger
    var todayTx = S.get().transactions.filter(function (x) { return x.date === todayIso; })
      .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    html += sechead(t('common.today'));
    if (!todayTx.length) {
      html += '<div class="empty">' + ic('checklist') + '<div class="et">' + esc(t('today.no_spend')) + '</div>' +
        '<div class="small">' + esc(t('flow.empty_hint')) + '</div></div>';
    } else {
      html += todayTx.map(ledgerRow).join('');
    }

    html += '<div class="spacer-lg"></div>';
    $('todayTab').innerHTML = html;
  }

  function ledgerRow(tx) {
    var c = S.category(tx.categoryId);
    var a = S.get().accounts.find(function (x) { return x.id === tx.accountId; });
    var a2 = S.get().accounts.find(function (x) { return x.id === tx.toAccountId; });
    var sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
    var cls = tx.type === 'income' ? 'in' : tx.type === 'expense' ? 'out' : '';
    var title = tx.type === 'transfer'
      ? ((a ? a.name : '?') + ' → ' + (a2 ? a2.name : '?'))
      : (c ? c.name : (tx.note || t('common.category')));
    var sub = [];
    if (tx.type !== 'transfer' && a) sub.push(a.name);
    if (tx.note) sub.push(tx.note);
    if (tx.receiptId) sub.push('📎');
    var iconName = tx.type === 'transfer' ? 'transfer' : (c ? c.icon : 'other');
    return '<div class="ledger" role="button" tabindex="0" data-act="txn-open" data-id="' + tx.id + '">' +
      '<span class="ic-wrap">' + ic(iconName) + '</span>' +
      '<div class="l-main"><div class="l-title nowrap">' + esc(title) + '</div>' +
      (sub.length ? '<div class="l-sub nowrap">' + esc(sub.join(' · ')) + '</div>' : '') + '</div>' +
      '<div class="l-amt ' + cls + '">' + sign + money(tx.amount) + '</div>' +
    '</div>';
  }

  /* ================= FLOW ================= */
  function renderFlow() {
    var now = new Date();
    var from = S.startOfMonth(flowAnchor);
    var to = S.endOfMonth(flowAnchor);
    var ms = S.stats(from, to);
    var all = S.txsBetween(from, to);
    var q = flowQuery.trim().toLowerCase();
    var list = all.filter(function (tx) {
      if (flowFilter === 'in' && tx.type !== 'income') return false;
      if (flowFilter === 'out' && tx.type !== 'expense') return false;
      if (flowFilter === 'transfer' && tx.type !== 'transfer') return false;
      if (q) {
        var c = S.category(tx.categoryId);
        var hay = ((tx.note || '') + ' ' + (c ? c.name : '') + ' ' + (tx.tags || []).join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    // heatmap values
    var vals = {};
    S.get().transactions.forEach(function (tx) {
      if (tx.type !== 'expense') return;
      if (tx.date.indexOf(S.ymd(flowAnchor).slice(0, 7)) === 0) {
        vals[tx.date] = (vals[tx.date] || 0) + tx.amount;
      }
    });

    var html = '';
    html += '<div class="seg">' +
      [['all', 'common.all'], ['in', 'flow.in'], ['out', 'flow.out'], ['transfer', 'add.transfer']].map(function (f) {
        return '<button class="' + (flowFilter === f[0] ? 'active' : '') + '" data-act="flow-filter" data-f="' + f[0] + '">' + esc(t(f[1])) + '</button>';
      }).join('') +
    '</div>';

    html += '<div class="card">' +
      '<div class="row between" style="margin-bottom:10px">' +
        '<button class="iconbtn" data-act="flow-month" data-d="-1" style="width:34px;height:34px">' + ic('chevron') + '</button>' +
        '<span class="small" style="font-weight:600">' + esc(fmtDate(flowAnchor, 'monthYear')) + '</span>' +
        '<button class="iconbtn" data-act="flow-month" data-d="1" style="width:34px;height:34px;transform:rotate(180deg)">' + ic('chevron') + '</button>' +
      '</div>' +
      '<div class="statgrid">' +
        '<div class="statbox"><div class="k">' + esc(t('flow.in')) + '</div><div class="v v-in">' + moneyStat(ms.in) + '</div></div>' +
        '<div class="statbox"><div class="k">' + esc(t('flow.out')) + '</div><div class="v v-out">' + moneyStat(ms.out) + '</div></div>' +
        '<div class="statbox"><div class="k">' + esc(t('flow.net')) + '</div><div class="v">' + moneyStat(ms.net) + '</div></div>' +
      '</div>' +
    '</div>';

    html += '<div class="card">' +
      '<div class="row between" style="margin-bottom:10px">' +
        '<span class="small muted">' + esc(t('cal.title')) + '</span>' +
        (flowDay ? '<button class="chip on" data-act="flow-day-clear">' + esc(fmtDate(flowDay)) + ' ×</button>' : '') +
      '</div>' +
      spendingCalendar(flowAnchor.getFullYear(), flowAnchor.getMonth(), vals) +
    '</div>';

    html += '<div class="searchwrap">' + ic('search') +
      '<input class="input" id="flowSearch" placeholder="' + esc(t('flow.search_ph')) + '" value="' + esc(flowQuery) + '">' +
    '</div>';

    html += '<div id="flowList">' + flowListHTML(list) + '</div>';
    html += '<div class="spacer-lg"></div>';
    $('flowTab').innerHTML = html;

    var si = $('flowSearch');
    if (si) {
      si.addEventListener('input', function () {
        flowQuery = si.value;
        var box = $('flowList');
        if (box) box.innerHTML = flowListHTML(currentFlowList());
      });
    }
  }

  function currentFlowList() {
    var from = S.startOfMonth(flowAnchor), to = S.endOfMonth(flowAnchor);
    var q = flowQuery.trim().toLowerCase();
    return S.txsBetween(from, to).filter(function (tx) {
      if (flowDay && tx.date !== flowDay) return false;
      if (flowFilter === 'in' && tx.type !== 'income') return false;
      if (flowFilter === 'out' && tx.type !== 'expense') return false;
      if (flowFilter === 'transfer' && tx.type !== 'transfer') return false;
      if (q) {
        var c = S.category(tx.categoryId);
        var hay = ((tx.note || '') + ' ' + (c ? c.name : '') + ' ' + (tx.tags || []).join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function flowListHTML(list) {
    if (!list.length) {
      return '<div class="empty">' + ic('flow') + '<div class="et">' + esc(t('flow.no_results')) + '</div></div>';
    }
    var byDay = {};
    list.forEach(function (tx) { (byDay[tx.date] = byDay[tx.date] || []).push(tx); });
    var days = Object.keys(byDay).sort(function (a, b) { return a < b ? 1 : -1; });
    return days.map(function (d) {
      var dayOut = byDay[d].reduce(function (s, x) { return s + (x.type === 'expense' ? x.amount : 0); }, 0);
      var dayIn = byDay[d].reduce(function (s, x) { return s + (x.type === 'income' ? x.amount : 0); }, 0);
      return '<div class="dayhead"><span>' + esc(fmtDate(d)) + '</span>' +
        '<span>' + (dayIn ? '+' + money(dayIn) + ' ' : '') + (dayOut ? '−' + money(dayOut) : '') + '</span></div>' +
        byDay[d].map(ledgerRow).join('');
    }).join('');
  }

  /* A real month calendar: every day shows what you spent on it, and tapping filters. */
  function spendingCalendar(year, month, values) {
    var first = new Date(year, month, 1);
    var dim = new Date(year, month + 1, 0).getDate();
    var startWd = (first.getDay() + 6) % 7;   // Monday first
    var todayIso = S.todayISO();
    var max = 1;
    Object.keys(values).forEach(function (k) { max = Math.max(max, values[k]); });
    var dows = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    var html = '<div class="cal">';
    dows.forEach(function (d) { html += '<div class="cdow">' + d + '</div>'; });
    for (var i = 0; i < startWd; i++) html += '<div class="cday empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var iso = year + '-' + (month + 1 < 10 ? '0' : '') + (month + 1) + '-' + (d < 10 ? '0' : '') + d;
      var v = values[iso] || 0;
      var cls = 'cday';
      if (v > 0) cls += (v / max > 0.6 ? ' heavy' : ' has');
      if (iso === todayIso) cls += ' today';
      html += '<button class="' + cls + '" data-act="flow-day" data-d="' + iso + '" aria-label="' + iso + (v ? ' ' + money(v) : '') + '">' +
        '<span class="cn">' + d + '</span>' +
        (v > 0 ? '<span class="ca">' + window.I18N.compact(v) + '</span>' : '') +
      '</button>';
    }
    html += '</div>';
    return html;
  }

  /* ================= ADD ================= */
  function renderAdd() {
    if (!addState) newAddState('expense');
    var accts = S.get().accounts.filter(function (a) { return !a.archived; });
    var html = '';

    if (addState.editId) {
      html += '<div class="card flat" style="display:flex;align-items:center;gap:10px;color:var(--teal)">' +
        ic('edit') + '<span class="small" style="font-weight:600">' + esc(t('txn.edit')) + '</span></div>';
    }

    html += '<div class="seg">' +
      [['expense', 'add.expense'], ['income', 'add.income'], ['transfer', 'add.transfer']].map(function (x) {
        return '<button class="' + (addState.type === x[0] ? 'active' : '') + '" data-act="add-type" data-type="' + x[0] + '">' + esc(t(x[1])) + '</button>';
      }).join('') +
    '</div>';

    html += '<div class="card">' +
      '<div class="amountbar"><span class="cur">RM</span> <span class="val">' + formatAmountInput(addState.amount) + '</span></div>' +
      '<div class="keypad">' +
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(function (k) {
          if (k === 'del') return '<button class="fn" data-act="key" data-key="del">⌫</button>';
          return '<button data-act="key" data-key="' + k + '">' + k + '</button>';
        }).join('') +
      '</div>' +
    '</div>';

    if (!accts.length) {
      html += '<div class="card center">' + ic('wallet') +
        '<div class="small" style="margin:10px 0">' + esc(t('acct.need_name')) + '</div>' +
        '<button class="btn" data-act="open" data-ov="account-form">' + esc(t('acct.add')) + '</button></div>';
      $('addTab').innerHTML = html;
      return;
    }

    if (addState.type === 'transfer') {
      html += '<div class="field"><label>' + esc(t('add.from')) + '</label><select class="select" data-model="accountId">' +
        accts.map(function (a) { return '<option value="' + a.id + '"' + (addState.accountId === a.id ? ' selected' : '') + '>' + esc(a.name) + ' · ' + money(S.accountBalance(a.id)) + '</option>'; }).join('') +
      '</select></div>';
      html += '<div class="field"><label>' + esc(t('add.to')) + '</label><select class="select" data-model="toAccountId">' +
        '<option value="">—</option>' +
        accts.map(function (a) { return '<option value="' + a.id + '"' + (addState.toAccountId === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') +
      '</select></div>';
    } else {
      var cats = S.get().categories.filter(function (c) {
        if (c.archived) return false;
        return addState.type === 'income' ? c.kind === 'income' : c.kind !== 'income';
      });
      html += sechead(t('add.pick_category'));
      html += '<div class="catgrid">' + cats.map(function (c) {
        return '<button class="catcell ' + (addState.categoryId === c.id ? 'on' : '') + '" data-act="pick-cat" data-cat="' + c.id + '">' +
          '<span class="ic-wrap" style="background:' + esc(c.color) + '1f;color:' + esc(c.color) + '">' + ic(c.icon) + '</span>' +
          '<span>' + esc(c.name) + '</span></button>';
      }).join('') + '</div>';

      html += '<div class="field" style="margin-top:16px"><label>' + esc(t('add.pick_account')) + '</label><select class="select" data-model="accountId">' +
        accts.map(function (a) { return '<option value="' + a.id + '"' + (addState.accountId === a.id ? ' selected' : '') + '>' + esc(a.name) + ' · ' + money(S.accountBalance(a.id)) + '</option>'; }).join('') +
      '</select></div>';
    }

    html += '<div class="row2">' +
      '<div class="field"><label>' + esc(t('common.date')) + '</label><input type="date" class="input" data-model="date" value="' + esc(addState.date) + '"></div>' +
      '<div class="field"><label>' + esc(t('add.receipt')) + '</label>' +
        '<button class="btn ghost full" data-act="add-receipt" style="min-height:48px">' + ic('camera') +
        '<span class="small">' + esc(addState.receiptId ? t('receipt.stored') : t('receipt.attach')) + '</span></button></div>' +
    '</div>';

    html += '<div class="field"><label>' + esc(t('common.note')) + ' <span class="muted tiny">' + esc(t('common.optional')) + '</span></label>' +
      '<input class="input" id="addNote" data-model="note" placeholder="' + esc(t('add.note_ph')) + '" value="' + esc(addState.note) + '">' +
      '<div class="tiny" id="addSug" style="color:var(--teal);display:none;margin-top:6px"></div></div>';

    if (addState.editId) {
      html += '<div class="row2">' +
        '<button class="btn ghost" data-act="cancel-edit">' + esc(t('common.cancel')) + '</button>' +
        '<button class="btn" data-act="save-tx">' + ic('check') + esc(t('common.save')) + '</button>' +
      '</div>';
    } else {
      html += '<div class="row2">' +
        '<button class="btn ghost" data-act="repeat-last">' + ic('repeat') + esc(t('add.repeat_last')) + '</button>' +
        '<button class="btn" data-act="save-tx">' + ic('check') + esc(t('add.save_tx')) + '</button>' +
      '</div>';
    }

    html += '<div class="spacer-lg"></div>';
    $('addTab').innerHTML = html;

    // learn as you type: suggest a category from similar past entries
    var noteEl = $('addNote');
    if (noteEl) {
      noteEl.addEventListener('input', function () {
        addState.note = noteEl.value;
        if (addState.type === 'transfer' || addState.categoryId) return;
        var sug = S.suggestCategory(noteEl.value, addState.type);
        if (!sug) return;
        addState.categoryId = sug;
        var c = S.category(sug);
        var hint = $('addSug');
        if (hint) { hint.textContent = t('add.suggested', { cat: c ? c.name : '' }); hint.style.display = ''; }
        var cells = document.querySelectorAll('#addTab .catcell');
        Array.prototype.forEach.call(cells, function (cell) {
          cell.classList.toggle('on', cell.getAttribute('data-cat') === sug);
        });
      });
    }
  }

  function saveTransaction() {
    var amt = amountNumber();
    if (amt <= 0) { toast(t('add.need_amount')); return; }
    if (!addState.accountId) { toast(t('add.need_account')); return; }
    if (addState.type === 'transfer') {
      if (!addState.toAccountId) { toast(t('add.need_account')); return; }
      if (addState.toAccountId === addState.accountId) { toast(t('add.transfer_same')); return; }
    } else if (!addState.categoryId) {
      toast(t('add.need_category')); return;
    }
    var payload = {
      type: addState.type,
      amount: amt,
      accountId: addState.accountId,
      toAccountId: addState.type === 'transfer' ? addState.toAccountId : null,
      categoryId: addState.type === 'transfer' ? null : addState.categoryId,
      date: addState.date,
      note: addState.note,
      receiptId: addState.receiptId
    };
    var editing = addState.editId;
    var keepType = addState.type;
    if (editing) {
      S.updateTransaction(editing, payload);
      toast(t('txn.updated'));
    } else {
      S.addTransaction(payload);
      toast(t('add.saved'));
    }
    haptic(12);
    newAddState(keepType);
    setTab('today');
    // nudge once when the monthly limit is crossed
    var alert = S.checkLimitAlerts(new Date());
    if (alert === 'over') setTimeout(function () { toast(t('limit.alert_over')); }, 2000);
    else if (alert === 'warn') setTimeout(function () { toast(t('limit.alert_warn')); }, 2000);
  }

  /* ================= REPORT ================= */
  function reportRangeDates() {
    var anchor = reportAnchor, from, to, label;
    if (reportRange === 'week') {
      var ws = S.startOfWeek(anchor);
      from = ws; to = S.addDays(ws, 6);
      label = fmtDate(ws, 'short') + ' – ' + fmtDate(to, 'short');
    } else {
      from = S.startOfMonth(anchor); to = S.endOfMonth(anchor);
      label = fmtDate(anchor, 'monthYear');
    }
    return { from: from, to: to, label: label, anchor: anchor };
  }

  function renderReport() {
    var R = reportRangeDates();
    var from = R.from, to = R.to, label = R.label;
    var st = S.stats(from, to);
    var cats = S.categoryTotals(from, to);
    var tx = S.txsBetween(from, to);

    // previous period
    var prevFrom, prevTo;
    if (reportRange === 'week') {
      prevFrom = S.addDays(from, -7); prevTo = S.addDays(to, -7);
    } else {
      prevFrom = S.startOfMonth(new Date(reportAnchor.getFullYear(), reportAnchor.getMonth() - 1, 1));
      prevTo = S.endOfMonth(prevFrom);
    }
    var prev = S.stats(prevFrom, prevTo);

    var score = moneyScore(reportAnchor);
    var html = '';

    html += '<div class="seg">' +
      '<button class="' + (reportRange === 'week' ? 'active' : '') + '" data-act="report-range" data-r="week">' + esc(t('report.week')) + '</button>' +
      '<button class="' + (reportRange === 'month' ? 'active' : '') + '" data-act="report-range" data-r="month">' + esc(t('report.month')) + '</button>' +
    '</div>';

    // ---- hero: score + the three numbers ----
    html += '<div class="card hero hero-grad rise">' +
      '<div class="row between" style="align-items:center;gap:16px">' +
        '<div class="ringwrap" style="flex:none">' +
          window.JELAS_CHARTS.ring(score.value, { size: 92, label: false, color: score.tone === 'bad' ? '#FF9E7E' : (score.tone === 'mid' ? '#F0C070' : '#5FD3A6') }) +
          '<div class="ringmid"><div class="rv" style="color:#F3F1EC">' + score.value + '</div>' +
          '<div class="rk" style="color:rgba(243,241,236,.6)">' + esc(t('score.title')) + '</div></div>' +
        '</div>' +
        '<div class="grow">' +
          '<div class="scorechip ' + score.tone + '">' + esc(score.label) + '</div>' +
          '<div class="small" style="color:rgba(243,241,236,.66);margin-top:8px">' + esc(t('score.sub')) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="herofoot" style="margin-top:16px">' +
        '<div class="stat"><span class="v v-in">' + money(st.in) + '</span><span class="k">' + esc(t('report.in')) + '</span></div>' +
        '<div class="stat"><span class="v v-out">' + money(st.out) + '</span><span class="k">' + esc(t('report.out')) + '</span></div>' +
        '<div class="stat"><span class="v">' + money(st.net) + '</span><span class="k">' + esc(t('report.net')) + '</span></div>' +
      '</div>' +
      '<div style="margin-top:16px">' + window.JELAS_CHARTS.flowBar(st.in, st.out) + '</div>' +
      '<div class="row between" style="margin-top:10px">' +
        '<button class="iconbtn" data-act="report-move" data-d="-1" style="width:34px;height:34px;color:#F3F1EC">' + ic('chevron') + '</button>' +
        '<span class="small" style="color:rgba(243,241,236,.75);font-weight:600">' + esc(label) + '</span>' +
        '<button class="iconbtn" data-act="report-move" data-d="1" style="width:34px;height:34px;color:#F3F1EC;transform:rotate(180deg)">' + ic('chevron') + '</button>' +
      '</div>' +
    '</div>';

    if (!tx.length) {
      html += '<div class="empty">' + ic('chart') + '<div class="et">' + esc(t('report.no_data')) + '</div></div>';
      html += '<div class="spacer-lg"></div>';
      $('reportTab').innerHTML = html;
      return;
    }

    // ---- quick tiles ----
    var daysWithSpend = {};
    tx.forEach(function (x) { if (x.type === 'expense') daysWithSpend[x.date] = 1; });
    var nDays = Object.keys(daysWithSpend).length || 1;
    var biggest = tx.filter(function (x) { return x.type === 'expense'; })
      .sort(function (a, b) { return b.amount - a.amount; })[0];
    html += '<div class="tiles rise">' +
      '<div class="tile"><div class="tk">' + esc(t('report.daily_avg')) + '</div>' +
        '<div class="tv">' + money(st.out / nDays) + '</div>' +
        '<div class="ts">' + esc(t('report.out')) + '</div></div>' +
      '<div class="tile"><div class="tk">' + esc(t('report.biggest')) + '</div>' +
        '<div class="tv">' + (biggest ? money(biggest.amount) : '—') + '</div>' +
        '<div class="ts nowrap">' + esc(biggest ? ((S.category(biggest.categoryId) || {}).name || biggest.note || '—') : '—') + '</div></div>' +
      '<div class="tile"><div class="tk">' + esc(t('report.days_logged')) + '</div>' +
        '<div class="tv">' + nDays + '</div>' +
        '<div class="ts">' + esc(t('common.days')) + '</div></div>' +
      '<div class="tile"><div class="tk">' + esc(t('report.savings_rate')) + '</div>' +
        '<div class="tv">' + (st.in > 0 ? pctText(((st.in - st.out) / st.in) * 100) : '—') + '</div>' +
        '<div class="ts">' + esc(t('report.net')) + '</div></div>' +
    '</div>';

    // ---- spending pace: this period vs last ----
    if (prev.out > 0 || prev.in > 0) {
      var maxV = Math.max(st.out, prev.out, st.in, prev.in, 1);
      var dOut = prev.out > 0 ? Math.round(((st.out - prev.out) / prev.out) * 100) : 0;
      html += '<div class="sechead"><span class="dotmark"></span><span class="t">' + esc(t('report.pace')) + '</span><span class="line"></span>' +
        '<span class="delta ' + (dOut > 0 ? 'up' : 'down') + '">' + ic(dOut > 0 ? 'up' : 'down') + pctText(Math.abs(dOut)) + '</span></div>';
      html += '<div class="card rise"><div class="cmpbar">' +
        '<div class="cmprow"><span class="cl">' + esc(t('report.this_month')) + '</span>' +
          '<span class="ct"><i style="width:' + ((st.out / maxV) * 100).toFixed(1) + '%;background:var(--out)"></i></span>' +
          '<span class="cv">' + money(st.out) + '</span></div>' +
        '<div class="cmprow"><span class="cl">' + esc(t('report.last_month')) + '</span>' +
          '<span class="ct"><i style="width:' + ((prev.out / maxV) * 100).toFixed(1) + '%;background:var(--line)"></i></span>' +
          '<span class="cv">' + money(prev.out) + '</span></div>' +
        '<div class="cmprow"><span class="cl">' + esc(t('report.in')) + '</span>' +
          '<span class="ct"><i style="width:' + ((st.in / maxV) * 100).toFixed(1) + '%;background:var(--in)"></i></span>' +
          '<span class="cv">' + money(st.in) + '</span></div>' +
      '</div></div>';
    }

    // ---- money flow ----
    var sources = {}, accounts = {};
    tx.forEach(function (x) {
      if (x.type === 'income') sources[x.accountId || 'x'] = (sources[x.accountId || 'x'] || 0) + x.amount;
      if (x.type === 'expense' && x.accountId) accounts[x.accountId] = (accounts[x.accountId] || 0) + x.amount;
    });
    function acctList(map, n) {
      return Object.keys(map).map(function (k) {
        var a = S.get().accounts.find(function (z) { return z.id === k; });
        return { name: a ? a.name : '—', value: map[k] };
      }).sort(function (a, b) { return b.value - a.value; }).slice(0, n);
    }
    var srcList = acctList(sources, 3), midList = acctList(accounts, 3);
    var uses = cats.slice(0, 4).map(function (c) { return { name: c.name, value: c.total }; });
    if (srcList.length && midList.length && uses.length) {
      html += '<div class="sechead"><span class="dotmark"></span><span class="t">' + esc(t('report.flow_title')) + '</span><span class="line"></span></div>';
      html += '<div class="card rise">' + window.JELAS_CHARTS.moneyFlow(srcList, midList, uses) + '</div>';
    }

    // ---- categories ----
    if (cats.length) {
      html += '<div class="sechead"><span class="dotmark"></span><span class="t">' + esc(t('report.top_cats')) + '</span><span class="line"></span></div>';
      html += '<div class="card rise">' +
        '<div style="position:relative">' +
          window.JELAS_CHARTS.donut(cats.slice(0, 6), { empty: t('report.no_data'), size: 176 }) +
          '<div style="position:absolute;inset:0;display:grid;place-content:center;text-align:center;pointer-events:none">' +
            '<div class="money" style="font-size:20px;font-weight:700">' + money(st.out) + '</div>' +
            '<div class="tiny muted" style="letter-spacing:.1em;text-transform:uppercase">' + esc(t('report.out')) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="legend stagger">' + cats.slice(0, 6).map(function (c) {
          var pct = st.out > 0 ? Math.round((c.total / st.out) * 100) : 0;
          return '<div class="lrow"><span class="dot" style="background:' + esc(c.color) + '"></span>' +
            '<span class="lname nowrap">' + esc(c.name) + '</span>' +
            '<span class="lval">' + money(c.total) + '</span>' +
            '<span class="lpct">' + pct + '%</span></div>';
        }).join('') + '</div></div>';
    }

    // ---- top merchants (grouped by note) ----
    var merch = {};
    tx.forEach(function (x) {
      if (x.type !== 'expense' || !x.note) return;
      var key = x.note.trim().toLowerCase();
      if (!key) return;
      merch[key] = (merch[key] || 0) + x.amount;
    });
    var mList = Object.keys(merch).map(function (k) { return { name: k, value: merch[k] }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 5);
    html += '<div class="sechead"><span class="dotmark"></span><span class="t">' + esc(t('report.top_merchants')) + '</span><span class="line"></span></div>';
    if (mList.length) {
      var mMax = mList[0].value || 1;
      html += '<div class="card rise">' + mList.map(function (m, i) {
        return '<div class="rank"><span class="rnum">' + (i + 1) + '</span>' +
          '<span class="rname nowrap">' + esc(m.name) + '</span>' +
          '<span class="rbar"><i style="width:' + ((m.value / mMax) * 100).toFixed(0) + '%"></i></span>' +
          '<span class="rval">' + money(m.value) + '</span></div>';
      }).join('') + '</div>';
    } else {
      html += '<div class="card rise"><div class="small muted">' + esc(t('report.no_merchants')) + '</div></div>';
    }

    // ---- trend ----
    var buckets = [];
    if (reportRange === 'week') {
      for (var i = 0; i < 7; i++) {
        var d = S.addDays(from, i);
        var s = S.stats(S.startOfDay(d), S.startOfDay(d));
        buckets.push({ label: fmtDate(d, 'weekday'), in: s.in, out: s.out });
      }
    } else {
      var wk = 1, cur = S.startOfDay(from);
      while (cur <= to && wk <= 6) {
        var end = S.addDays(cur, 6); if (end > to) end = to;
        var s2 = S.stats(cur, end);
        buckets.push({ label: 'W' + wk, in: s2.in, out: s2.out });
        cur = S.addDays(end, 1); wk++;
      }
    }
    html += '<div class="sechead"><span class="dotmark"></span><span class="t">' + esc(t('report.in')) + ' / ' + esc(t('report.out')) + '</span><span class="line"></span></div>';
    html += '<div class="card rise">' + window.JELAS_CHARTS.bars(buckets) + '</div>';

    // ---- net worth + trend ----
    html += sechead(t('report.net_worth'));
    var nwSeries = S.netWorthSeries(12);
    html += '<div class="card rise">' +
      '<div class="row between"><span class="small muted">' + esc(t('report.net_worth')) + '</span>' +
      '<span class="num" style="font-weight:680;font-size:18px">' + money(S.netWorth()) + '</span></div>' +
      '<div class="hr"></div>' +
      '<div class="row between small"><span class="muted">' + esc(t('me.assets')) + '</span><span class="num v-in">' + money(S.totalAssets()) + '</span></div>' +
      '<div class="row between small" style="margin-top:6px"><span class="muted">' + esc(t('me.liabilities')) + '</span><span class="num v-out">' + money(S.totalLiabilities()) + '</span></div>' +
      (nwSeries.length >= 2
        ? '<div class="hr"></div>' +
          '<div class="small muted" style="margin-bottom:8px">' + esc(t('nw.title')) + '</div>' +
          window.JELAS_CHARTS.line(nwSeries, { height: 130 })
        : '<div class="hr"></div><div class="small muted">' + esc(t('nw.not_enough')) + '</div>') +
    '</div>';

    // ---- insights ----
    var ins = S.insights();
    if (ins.length) {
      html += '<div class="sechead"><span class="dotmark"></span><span class="t">' + esc(t('report.insights')) + '</span><span class="line"></span></div>';
      html += '<div class="stagger">' + ins.map(function (i) {
        var col = i.tone === 'good' ? 'var(--in)' : i.tone === 'bad' ? 'var(--out)' : 'var(--muted)';
        return '<div class="card" style="display:flex;gap:12px;align-items:flex-start">' +
          '<span style="color:' + col + ';flex:none;margin-top:2px">' + ic(i.icon) + '</span>' +
          '<div class="small">' + esc(i.text) + '</div></div>';
      }).join('') + '</div>';
    }

    html += '<button class="btn ghost full" data-act="export-report">' + ic('image') + esc(t('report.export_img')) + '</button>';
    html += '<div class="spacer-lg"></div>';
    $('reportTab').innerHTML = html;
  }

  /* ================= ME ================= */
  function renderMe() {
    var html = '';
    var nw = S.netWorth();

    html += '<div class="card">' +
      '<div class="label small muted" style="letter-spacing:.14em;text-transform:uppercase;font-weight:600">' + esc(t('me.net_worth')) + '</div>' +
      '<div class="big money" style="font-size:32px;font-weight:640;margin:4px 0 10px">' + money(nw) + '</div>' +
      '<div class="row between small muted"><span>' + esc(t('me.assets')) + '</span><span class="num v-in">' + money(S.totalAssets()) + '</span></div>' +
      '<div class="row between small muted" style="margin-top:4px"><span>' + esc(t('me.liabilities')) + '</span><span class="num v-out">' + money(S.totalLiabilities()) + '</span></div>' +
    '</div>';

    html += '<div class="seg">' +
      [['manage', 'me.tab_manage'], ['tools', 'me.tab_tools'], ['app', 'me.tab_app']].map(function (g) {
        return '<button class="' + (meGroup === g[0] ? 'active' : '') + '" data-act="me-group" data-g="' + g[0] + '">' + esc(t(g[1])) + '</button>';
      }).join('') +
    '</div>';

    var groups = {
      manage: [
        ['limit', 'target', S.monthlyLimit() > 0 ? money(S.monthlyLimit()) : t('limit.set_cta')],
        ['bills', 'repeat', S.activeBills().length ? S.activeBills().length + ' · ' + money(S.monthlyBillsTotal()) : t('bill.add')],
        ['accounts', 'wallet', S.get().accounts.filter(function (a) { return !a.archived; }).length + ' ' + t('acct.count')],
        ['categories', 'checklist', S.get().categories.length + ''],
        ['budgets', 'target', money(S.totalBudgeted())],
        ['goals', 'piggy', S.get().goals.length + ''],
        ['debts', 'debt', S.get().debts.length ? money(S.totalLiabilities()) : '—'],
        ['zakat', 'zakat', '']
      ],
      tools: [
        ['checklists', 'checklist', ''],
        ['challenges', 'trophy', S.get().badges.length + ' 🏅'],
        ['learn', 'book', S.lessonsReadCount() + '/' + window.JELAS_SEED.LESSON_ORDER.length]
      ],
      app: [
        ['security', 'shield', ''],
        ['data', 'download', ''],
        ['reminders', 'bell', S.get().reminders.daily.on ? t('common.on') : t('common.off')],
        ['settings', 'settings', window.I18N.langName(cfg().locale)],
        ['about', 'info', '']
      ]
    };

    html += '<div class="card">' + (groups[meGroup] || []).map(function (r) {
      return '<div class="listrow" role="button" tabindex="0" data-act="open" data-ov="' + r[0] + '">' +
        '<span class="ic-wrap">' + ic(r[1]) + '</span>' +
        '<div class="lr-main"><div class="lr-title">' + esc(t('me.' + r[0])) + '</div></div>' +
        (r[2] ? '<span class="lr-val small">' + esc(r[2]) + '</span>' : '') +
        ic('chevron', 'chev') + '</div>';
    }).join('') + '</div>';

    html += '<div class="spacer-lg"></div>';
    $('meTab').innerHTML = html;
  }

  /* ================= OVERLAYS registry ================= */
  var OVERLAYS = {};

  /* A switch is a real control: announced, focusable, keyboard operable. */
  function swHTML(act, key, on, label, sub) {
    return '<div class="switchrow">' +
      '<div class="sw-main">' +
      (label ? '<div class="sw-title">' + esc(label) + '</div>' : '') +
      (sub ? '<div class="sw-sub">' + esc(sub) + '</div>' : '') +
      '</div>' +
      '<div class="switch ' + (on ? 'on' : '') + '" role="switch" tabindex="0" ' +
      'aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label || key) + '" ' +
      'data-act="' + act + '" data-key="' + key + '"></div></div>';
  }

  OVERLAYS.accounts = {
    title: function () { return t('acct.title'); },
    action: { icon: 'plus', act: 'acct-add' },
    body: function () {
      var accts = S.get().accounts;
      var active = accts.filter(function (a) { return !a.archived; });
      var arch = accts.filter(function (a) { return a.archived; });
      if (!accts.length) return '<div class="empty">' + ic('wallet') + '<div class="et">' + esc(t('acct.add')) + '</div></div>';
      var html = '<div class="statbox" style="margin-bottom:14px"><div class="k">' + esc(t('acct.total_balance')) + '</div>' +
        '<div class="v">' + money(active.reduce(function (s, a) { return s + S.accountBalance(a.id); }, 0)) + '</div></div>';
      html += active.map(acctRow).join('');
      if (arch.length) {
        html += sechead(t('acct.archived')) + arch.map(acctRow).join('');
      }
      return html;
    }
  };
  function acctRow(a) {
    var bal = S.accountBalance(a.id);
    var tname = t('acct.type_' + a.type);
    var typeIcon = (window.JELAS_SEED.ACCOUNT_TYPES.find(function (x) { return x.id === a.type; }) || {}).icon || 'wallet';
    return '<div class="listrow" role="button" tabindex="0" data-act="acct-edit" data-id="' + a.id + '">' +
      '<span class="ic-wrap">' + ic(typeIcon) + '</span>' +
      '<div class="lr-main"><div class="lr-title">' + esc(a.name) + '</div><div class="lr-sub">' + esc(tname) + '</div></div>' +
      '<span class="lr-val money">' + money(bal) + '</span>' + ic('chevron', 'chev') + '</div>';
  }

  OVERLAYS['account-form'] = {
    title: function (p) { return p && p.id ? t('common.edit') : t('acct.add'); },
    body: function (p) {
      var a = p && p.id ? S.get().accounts.find(function (x) { return x.id === p.id; }) : null;
      var types = window.JELAS_SEED.ACCOUNT_TYPES;
      return '<div class="field"><label>' + esc(t('common.name')) + '</label>' +
        '<input class="input" id="af_name" placeholder="' + esc(t('acct.name_ph')) + '" value="' + esc(a ? a.name : '') + '"></div>' +
        '<div class="field"><label>' + esc(t('common.type')) + '</label><select class="select" id="af_type">' +
        types.map(function (x) { return '<option value="' + x.id + '"' + (a && a.type === x.id ? ' selected' : '') + '>' + esc(t('acct.type_' + x.id)) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>' + esc(t('acct.opening')) + '</label><input type="number" step="0.01" class="input" id="af_open" value="' + (a ? a.openingBalance : 0) + '"></div>' +
        '<div id="af_meta"></div>' +
        '<div class="row2" style="margin-top:8px">' +
          (a ? '<button class="btn danger" data-act="acct-del" data-id="' + a.id + '">' + esc(t('common.delete')) + '</button>' : '') +
          '<button class="btn" data-act="acct-save" data-id="' + (a ? a.id : '') + '">' + esc(t('common.save')) + '</button>' +
        '</div>' +
        (a ? '<button class="btn ghost full" style="margin-top:10px" data-act="acct-archive" data-id="' + a.id + '" data-arch="' + (a.archived ? '0' : '1') + '">' +
          esc(a.archived ? t('acct.unarchive') : t('acct.archive')) + '</button>' : '');
    },
    after: function (p) {
      var sel = $('af_type');
      if (!sel) return;
      function syncMeta() {
        var v = sel.value;
        var box = $('af_meta');
        if (v === 'credit') {
          box.innerHTML = '<div class="row2"><div class="field"><label>' + esc(t('acct.limit')) + '</label><input type="number" class="input" id="af_limit" value="0"></div>' +
            '<div class="field"><label>' + esc(t('acct.due_day')) + '</label><input type="number" class="input" id="af_due" value="1"></div></div>';
        } else box.innerHTML = '';
      }
      sel.addEventListener('change', syncMeta);
      syncMeta();
    }
  };

  OVERLAYS.categories = {
    title: function () { return t('cat.title'); },
    action: { icon: 'plus', act: 'cat-add' },
    body: function () {
      var kinds = [['need', 'cat.kind_need'], ['want', 'cat.kind_want'], ['save', 'cat.kind_save'], ['income', 'cat.kind_income']];
      var html = '';
      kinds.forEach(function (k) {
        var list = S.categoriesByKind(k[0]);
        if (!list.length) return;
        html += sechead(t(k[1]));
        html += list.map(function (c) {
          return '<div class="listrow" role="button" tabindex="0" data-act="cat-edit" data-id="' + c.id + '">' +
            '<span class="ic-wrap" style="background:' + esc(c.color) + '1f;color:' + esc(c.color) + '">' + ic(c.icon) + '</span>' +
            '<div class="lr-main"><div class="lr-title">' + esc(c.name) + '</div></div>' + ic('chevron', 'chev') + '</div>';
        }).join('');
      });
      return html;
    }
  };

  OVERLAYS['cat-form'] = {
    title: function (p) { return p && p.id ? t('common.edit') : t('cat.add'); },
    body: function (p) {
      var c = p && p.id ? S.category(p.id) : null;
      var icons = window.JELAS_SEED.iconNames();
      var colors = ['#B0603F', '#4F7A4A', '#1F6F63', '#B08D3C', '#5B6B8C', '#8A6BA0', '#A06B8A', '#4F6E7A', '#7A6B3F', '#6B6152'];
      return '<div class="field"><label>' + esc(t('common.name')) + '</label>' +
        '<input class="input" id="cf_name" value="' + esc(c ? c.name : '') + '"></div>' +
        '<div class="field"><label>' + esc(t('common.type')) + '</label><select class="select" id="cf_kind">' +
        [['need', 'cat.kind_need'], ['want', 'cat.kind_want'], ['save', 'cat.kind_save'], ['income', 'cat.kind_income']].map(function (k) {
          return '<option value="' + k[0] + '"' + (c && c.kind === k[0] ? ' selected' : '') + '>' + esc(t(k[1])) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>' + esc(t('common.color')) + '</label><div class="chips" id="cf_colors">' +
        colors.map(function (col) {
          return '<button class="chip ' + (c && c.color === col ? 'on' : '') + '" data-act="cf-color" data-c="' + col + '" style="padding:6px">' +
            '<span style="display:block;width:22px;height:22px;border-radius:7px;background:' + col + '"></span></button>';
        }).join('') + '</div></div>' +
        '<div class="field"><label>' + esc(t('common.icon')) + '</label><div class="catgrid" id="cf_icons">' +
        icons.map(function (n) {
          return '<button class="catcell ' + (c && c.icon === n ? 'on' : '') + '" data-act="cf-icon" data-i="' + n + '">' +
            '<span class="ic-wrap" style="background:var(--paper);color:var(--ink)">' + ic(n) + '</span></button>';
        }).join('') + '</div></div>' +
        '<div class="row2" style="margin-top:12px">' +
          (c ? '<button class="btn danger" data-act="cat-del" data-id="' + c.id + '">' + esc(t('common.delete')) + '</button>' : '') +
          '<button class="btn" data-act="cat-save" data-id="' + (c ? c.id : '') + '">' + esc(t('common.save')) + '</button>' +
        '</div>';
    },
    after: function (p) {
      var c = p && p.id ? S.category(p.id) : null;
      window.__cfSel = { color: c ? c.color : '#1F6F63', icon: c ? c.icon : 'other' };
      var box = $('cf_colors');
      if (box) box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-c]'); if (!b) return;
        window.__cfSel.color = b.getAttribute('data-c');
        Array.prototype.forEach.call(box.children, function (x) { x.classList.toggle('on', x === b); });
      });
      var ib = $('cf_icons');
      if (ib) ib.addEventListener('click', function (e) {
        var b = e.target.closest('[data-i]'); if (!b) return;
        window.__cfSel.icon = b.getAttribute('data-i');
        Array.prototype.forEach.call(ib.children, function (x) { x.classList.toggle('on', x === b); });
      });
    }
  };

  OVERLAYS.budgets = {
    title: function () { return t('bud.title'); },
    action: { icon: 'plus', act: 'bud-add' },
    body: function () {
      var budgets = S.get().budgets;
      var method = cfg().method;
      var html = '';
      html += '<div class="statgrid" style="margin-bottom:14px">' +
        '<div class="statbox"><div class="k">' + esc(t('bud.total_budgeted')) + '</div><div class="v">' + money(S.totalBudgeted()) + '</div></div>' +
        '<div class="statbox"><div class="k">' + esc(t('bud.to_be_budgeted')) + '</div><div class="v">' + money(S.toBeBudgeted()) + '</div></div>' +
        '<div class="statbox"><div class="k">' + esc(t('bud.method')) + '</div><div class="v" style="font-size:13px">' + esc(t('onb.m' + method)) + '</div></div>' +
      '</div>';
      if (!budgets.length) {
        return html + '<div class="empty">' + ic('target') + '<div class="et">' + esc(t('bud.no_budgets')) + '</div></div>';
      }
      html += budgets.map(function (b) {
        var c = S.category(b.categoryId);
        if (!c) return '';
        var spent = S.spentInCategoryMonth(b.categoryId);
        var pct = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
        return '<div class="card">' +
          '<div class="row between" style="margin-bottom:8px">' +
            '<div class="row" style="gap:10px">' +
              '<span class="ic-wrap" style="width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:' + esc(c.color) + '1f;color:' + esc(c.color) + '">' + ic(c.icon) + '</span>' +
              '<div><div class="l-title">' + esc(c.name) + '</div>' +
              '<div class="l-sub">' + money(spent) + ' ' + esc(t('bud.spent')) + ' · ' + money(Math.max(0, b.amount - spent)) + ' ' + esc(t('bud.left')) + '</div></div>' +
            '</div>' +
            '<button class="iconbtn" data-act="bud-edit" data-cat="' + b.categoryId + '" style="width:32px;height:32px">' + ic('edit') + '</button>' +
          '</div>' +
          '<div class="pbar ' + (pct >= 100 ? 'warn' : (pct < 70 ? 'good' : '')) + '"><i style="width:' + pct + '%"></i></div>' +
        '</div>';
      }).join('');
      return html;
    }
  };

  OVERLAYS['bud-form'] = {
    title: function () { return t('bud.add'); },
    body: function (p) {
      var catId = p && p.cat ? p.cat : null;
      var existing = catId ? S.budgetBase(catId) : 0;
      var b = catId ? S.get().budgets.find(function (x) { return x.categoryId === catId; }) : null;
      var cats = S.get().categories.filter(function (c) { return c.kind !== 'income' && !c.archived; });
      return '<div class="field"><label>' + esc(t('bud.set_for')) + '</label><select class="select" id="bf_cat">' +
        cats.map(function (c) { return '<option value="' + c.id + '"' + (catId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>' + esc(t('common.amount')) + '</label><input type="number" step="0.01" class="input" id="bf_amt" value="' + (existing || '') + '" placeholder="' + esc(t('bud.amount_ph')) + '"></div>' +
        '<div class="switchrow"><div class="sw-main"><div class="sw-title">' + esc(t('bud.rollover')) + '</div></div>' +
        '<div class="switch ' + (b && b.rollover ? 'on' : '') + '" id="bf_roll" role="switch" tabindex="0" aria-checked="' + (b && b.rollover ? 'true' : 'false') + '"></div></div>' +
        '<div class="row2" style="margin-top:12px">' +
          (catId ? '<button class="btn danger" data-act="bud-del" data-cat="' + catId + '">' + esc(t('common.delete')) + '</button>' : '') +
          '<button class="btn" data-act="bud-save">' + esc(t('common.save')) + '</button>' +
        '</div>';
    },
    after: function () {
      var sw = $('bf_roll');
      if (!sw) return;
      function flip() {
        sw.classList.toggle('on');
        sw.setAttribute('aria-checked', sw.classList.contains('on') ? 'true' : 'false');
      }
      sw.addEventListener('click', flip);
      sw.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      });
    }
  };

  /* ---------------- monthly limit ---------------- */
  function limitSummaryHTML(lim) {
    var cls = lim.level === 'over' ? 'over' : (lim.level === 'warn' ? 'warn' : '');
    return '<div class="card" style="margin-bottom:14px">' +
      '<div class="row between" style="margin-bottom:10px">' +
        '<span class="small muted">' + esc(t('limit.spent_so_far')) + '</span>' +
        '<span class="num" style="font-weight:660">' + money(lim.spent) + ' ' + esc(t('limit.of')) + ' ' + money(lim.limit) + '</span>' +
      '</div>' +
      '<div class="meter ' + cls + '"><i style="width:' + Math.min(100, lim.pct) + '%"></i></div>' +
      '<div class="row between small" style="margin-top:10px">' +
        '<span class="muted">' + lim.pct + '% ' + esc(t('limit.used')) + '</span>' +
        '<span class="muted">' + esc(t('limit.days_left', { n: lim.daysLeft })) + '</span>' +
      '</div>' +
      '<div class="hr"></div>' +
      '<div class="row between">' +
        '<span class="small muted">' + esc(t('limit.per_day')) + '</span>' +
        '<span class="num" style="font-weight:680;font-size:17px">' + money(lim.perDay) + '</span>' +
      '</div>' +
    '</div>';
  }

  OVERLAYS.limit = {
    title: function () { return t('limit.title'); },
    body: function () {
      var lim = S.monthLimitStatus(new Date());
      var quick = [300, 500, 800, 1200];
      return '<div class="card"><div class="small muted">' + esc(t('limit.sub')) + '</div></div>' +
        '<div class="field"><label>' + esc(t('limit.set')) + '</label>' +
        '<input type="number" step="1" inputmode="numeric" class="input" id="lim_amt" ' +
        'value="' + (lim.limit > 0 ? lim.limit : '') + '" placeholder="' + esc(t('limit.amount_ph')) + '"></div>' +
        '<div class="chips" style="margin-bottom:16px">' +
        quick.map(function (v) {
          return '<button class="chip" data-act="limit-quick" data-v="' + v + '">' + money(v) + '</button>';
        }).join('') + '</div>' +
        (lim.limit > 0 ? limitSummaryHTML(lim) : '') +
        '<div class="row2">' +
          (lim.limit > 0 ? '<button class="btn danger" data-act="limit-remove">' + esc(t('limit.remove')) + '</button>' : '') +
          '<button class="btn" data-act="limit-save">' + esc(t('common.save')) + '</button>' +
        '</div>';
    }
  };

  /* ---------------- ask JELAS ---------------- */
  function runAsk(q) {
    var out = $('askOut');
    if (!out) return;
    var hint = '<div class="card"><div class="small muted">' + esc(t('ask.hint')) + '</div></div>';
    if (!q || !q.trim()) { out.innerHTML = hint; return; }
    var r = S.ask(q);
    if (!r) { out.innerHTML = hint; return; }

    var what = r.category ? ((S.category(r.category) || {}).name || '') : t(r.wantType === 'income' ? 'ask.income' : (r.wantType === 'net' ? 'ask.net' : 'ask.spent'));
    if (r.kind === 'biggest' && r.biggestName) what = r.biggestName;

    var big, caption;
    if (r.kind === 'count') {
      big = String(r.count);
      caption = t('ask.count', { n: r.count, range: r.range }).replace('{n} ', '').replace('{n}', '').trim() || r.range;
      caption = r.range;
    } else if (r.kind === 'average') {
      big = money(r.amount); caption = t('ask.average', { amt: '', range: r.range }).replace('{amt}', '').replace('  ', ' ').trim() || r.range;
    } else {
      big = money(r.amount); caption = what + ' · ' + r.range;
    }

    var html = '<div class="answer">' +
      '<div class="aq">' + esc(q) + '</div>' +
      '<div class="am money">' + esc(big) + '</div>' +
      '<div class="aa">' + esc(caption) + '</div>' +
    '</div>';

    if (!r.count) {
      html += '<div class="card"><div class="small muted">' + esc(t('ask.no_match')) + '</div></div>';
    } else {
      html += '<div class="card stagger">' + r.list.slice(0, 12).map(ledgerRow).join('') + '</div>';
    }
    out.innerHTML = html;
  }

  OVERLAYS.ask = {
    title: function () { return t('ask.title'); },
    body: function () {
      var ex = ['ex1', 'ex2', 'ex3', 'ex4'].map(function (k) { return t('ask.' + k); });
      return '<div class="searchwrap">' + ic('search') +
        '<input class="input" id="askInput" autocomplete="off" placeholder="' + esc(t('ask.placeholder')) + '"></div>' +
        '<div class="askchips">' + ex.map(function (e) {
          return '<button class="chip" data-act="ask-ex" data-q="' + esc(e) + '">' + esc(e) + '</button>';
        }).join('') + '</div>' +
        '<div id="askOut"><div class="card"><div class="small muted">' + esc(t('ask.empty')) + '</div></div></div>';
    },
    after: function () {
      var inp = $('askInput');
      if (!inp) return;
      inp.addEventListener('input', function () { runAsk(inp.value); });
      setTimeout(function () { try { inp.focus(); } catch (e) {} }, 150);
    }
  };

  /* ---------------- bills ---------------- */
  function dueLabel(x) {
    if (x.daysUntil === 0) return t('bill.due_today');
    if (x.daysUntil === 1) return t('bill.due_tomorrow');
    return t('bill.due_in', { n: x.daysUntil });
  }

  OVERLAYS.bills = {
    title: function () { return t('bill.title'); },
    action: { icon: 'plus', act: 'bill-add' },
    body: function () {
      var bills = S.activeBills();
      var now = new Date();
      var html = '';
      if (!bills.length) {
        return '<div class="empty">' + ic('repeat') + '<div class="et">' + esc(t('bill.no_bills')) + '</div></div>';
      }
      var due = S.billsDueWithin(7, now);
      var unpaid = due.filter(function (x) { return !S.isBillPaid(x.bill, now); });
      if (unpaid.length) {
        html += sechead(t('bill.next_7'));
        html += '<div class="card stagger">' + unpaid.map(function (x) {
          return '<div class="billrow">' +
            '<span class="ic-wrap" style="width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--paper)">' + ic(x.bill.icon || 'repeat') + '</span>' +
            '<div class="bmain"><div class="bt">' + esc(x.bill.name) + '</div>' +
            '<div class="bs"><span class="duepill ' + (x.daysUntil <= 1 ? 'soon' : 'ok') + '">' + esc(dueLabel(x)) + '</span></div></div>' +
            '<div><div class="bamt">' + money(x.bill.amount) + '</div>' +
            '<button class="btn soft sm" style="margin-top:6px" data-act="bill-paid" data-id="' + x.bill.id + '">' + esc(t('bill.mark_paid')) + '</button></div>' +
          '</div>';
        }).join('') + '</div>';
      }
      html += '<div class="statgrid" style="margin:16px 0 6px">' +
        '<div class="statbox"><div class="k">' + esc(t('bill.monthly_total')) + '</div><div class="v">' + money(S.monthlyBillsTotal()) + '</div></div>' +
        '<div class="statbox"><div class="k">' + esc(t('bill.yearly_total')) + '</div><div class="v">' + money(S.monthlyBillsTotal() * 12) + '</div></div>' +
        '<div class="statbox"><div class="k">' + esc(t('bill.title')) + '</div><div class="v">' + bills.length + '</div></div>' +
      '</div>';
      html += sechead(t('bill.title'));
      html += '<div class="card stagger">' + bills.map(function (b) {
        var paid = S.isBillPaid(b, now);
        var c = S.category(b.categoryId);
        return '<div class="billrow" role="button" tabindex="0" data-act="bill-edit" data-id="' + b.id + '">' +
          '<span class="ic-wrap" style="width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:' + (c ? esc(c.color) + '1f' : 'var(--paper)') + ';color:' + (c ? esc(c.color) : 'var(--muted)') + '">' + ic(b.icon || 'repeat') + '</span>' +
          '<div class="bmain"><div class="bt">' + esc(b.name) + '</div>' +
          '<div class="bs">' + esc(t('bill.due_day')) + ' ' + b.dueDay + ' · ' + esc(t('bill.freq_' + b.frequency)) +
          ' <span class="duepill ' + (paid ? 'paid' : 'ok') + '">' + esc(paid ? t('bill.paid_this_month') : dueLabel({ daysUntil: Math.round((S.nextDueDate(b, now) - S.startOfDay(now)) / 86400000) })) + '</span></div></div>' +
          '<span class="bamt">' + money(b.amount) + '</span>' +
        '</div>';
      }).join('') + '</div>';
      return html;
    }
  };

  OVERLAYS['bill-form'] = {
    title: function (p) { return p && p.id ? t('bill.edit') : t('bill.add'); },
    body: function (p) {
      var b = p && p.id ? S.get().bills.find(function (x) { return x.id === p.id; }) : null;
      var cats = S.get().categories.filter(function (c) { return c.kind !== 'income' && !c.archived; });
      var icons = ['repeat', 'phone', 'rent', 'utilities', 'entertainment', 'health', 'education', 'gift', 'wallet', 'shield'];
      return '<div class="card"><div class="small muted">' + esc(t('bill.sub')) + '</div></div>' +
        '<div class="field"><label>' + esc(t('bill.name')) + '</label>' +
        '<input class="input" id="bf2_name" placeholder="' + esc(t('bill.name_ph')) + '" value="' + esc(b ? b.name : '') + '"></div>' +
        '<div class="row2">' +
          '<div class="field"><label>' + esc(t('bill.amount')) + '</label>' +
          '<input type="number" step="0.01" class="input" id="bf2_amt" value="' + (b ? b.amount : '') + '"></div>' +
          '<div class="field"><label>' + esc(t('bill.due_day')) + '</label>' +
          '<input type="number" min="1" max="31" class="input" id="bf2_day" value="' + (b ? b.dueDay : 1) + '"></div>' +
        '</div>' +
        '<div class="field"><label>' + esc(t('bill.frequency')) + '</label>' +
        '<select class="select" id="bf2_freq">' +
        ['monthly', 'weekly', 'yearly'].map(function (f) {
          return '<option value="' + f + '"' + (b && b.frequency === f ? ' selected' : '') + '>' + esc(t('bill.freq_' + f)) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>' + esc(t('common.category')) + '</label>' +
        '<select class="select" id="bf2_cat"><option value="">—</option>' +
        cats.map(function (c) {
          return '<option value="' + c.id + '"' + (b && b.categoryId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>' + esc(t('common.icon')) + '</label><div class="catgrid" id="bf2_icons">' +
        icons.map(function (n) {
          return '<button class="catcell ' + ((b ? b.icon : 'repeat') === n ? 'on' : '') + '" data-act="bf2-icon" data-i="' + n + '">' +
            '<span class="ic-wrap" style="background:var(--paper);color:var(--ink)">' + ic(n) + '</span></button>';
        }).join('') + '</div></div>' +
        '<div class="row2" style="margin-top:12px">' +
          (b ? '<button class="btn danger" data-act="bill-del" data-id="' + b.id + '">' + esc(t('common.delete')) + '</button>' : '') +
          '<button class="btn" data-act="bill-save" data-id="' + (b ? b.id : '') + '">' + esc(t('common.save')) + '</button>' +
        '</div>';
    },
    after: function (p) {
      var b = p && p.id ? S.get().bills.find(function (x) { return x.id === p.id; }) : null;
      window.__bf2Icon = (b ? b.icon : 'repeat') || 'repeat';
      var box = $('bf2_icons');
      if (!box) return;
      box.addEventListener('click', function (e) {
        var el = e.target.closest('[data-i]');
        if (!el) return;
        window.__bf2Icon = el.getAttribute('data-i');
        Array.prototype.forEach.call(box.children, function (x) { x.classList.toggle('on', x === el); });
      });
    }
  };

  OVERLAYS.goals = {
    title: function () { return t('goal.title'); },
    action: { icon: 'plus', act: 'goal-add' },
    body: function () {
      var goals = S.get().goals;
      var html = '';
      // emergency fund hint
      var monthlyOut = S.monthStats(new Date()).out;
      html += '<div class="card flat"><div class="small muted">' + esc(t('goal.emergency_hint')) + ' · ' + money(monthlyOut * 3) + '</div></div>';
      if (!goals.length) return html + '<div class="empty">' + ic('piggy') + '<div class="et">' + esc(t('goal.no_goals')) + '</div></div>';
      html += goals.map(function (g) {
        var pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
        var perMonth = '';
        if (g.deadline) {
          var dl = S.parseYMD(g.deadline);
          var months = Math.max(1, Math.round((dl - new Date()) / (30 * 86400000)));
          if (g.saved < g.target) perMonth = t('goal.per_month_needed', { amt: money((g.target - g.saved) / months) });
        }
        return '<div class="card">' +
          '<div class="row" style="gap:14px">' +
            '<div style="flex:none">' + window.JELAS_CHARTS.ring(pct, { size: 64, color: pct >= 100 ? 'var(--in)' : 'var(--teal)' }) + '</div>' +
            '<div class="grow">' +
              '<div class="l-title">' + esc(g.name) + '</div>' +
              '<div class="l-sub money">' + money(g.saved) + ' / ' + money(g.target) + '</div>' +
              (perMonth ? '<div class="l-sub tiny">' + esc(perMonth) + '</div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="row2" style="margin-top:12px">' +
            '<button class="btn soft sm" data-act="goal-add-money" data-id="' + g.id + '">' + esc(t('goal.contribute')) + '</button>' +
            '<button class="btn ghost sm" data-act="goal-del" data-id="' + g.id + '">' + esc(t('common.delete')) + '</button>' +
          '</div>' +
        '</div>';
      }).join('');
      return html;
    }
  };

  OVERLAYS['goal-form'] = {
    title: function () { return t('goal.add'); },
    body: function () {
      return '<div class="field"><label>' + esc(t('common.name')) + '</label><input class="input" id="gf_name" placeholder="' + esc(t('goal.name_ph')) + '"></div>' +
        '<div class="field"><label>' + esc(t('goal.target')) + '</label><input type="number" step="0.01" class="input" id="gf_target"></div>' +
        '<div class="field"><label>' + esc(t('goal.saved')) + '</label><input type="number" step="0.01" class="input" id="gf_saved" value="0"></div>' +
        '<div class="field"><label>' + esc(t('goal.deadline')) + ' <span class="muted tiny">' + esc(t('common.optional')) + '</span></label><input type="date" class="input" id="gf_deadline"></div>' +
        '<button class="btn full" data-act="goal-save">' + esc(t('common.save')) + '</button>';
    }
  };

  OVERLAYS.debts = {
    title: function () { return t('debt.title'); },
    action: { icon: 'plus', act: 'debt-add' },
    body: function () {
      var debts = S.get().debts;
      if (!debts.length) return '<div class="empty">' + ic('debt') + '<div class="et">' + esc(t('debt.no_debts')) + '</div></div>';
      return debts.map(function (d) {
        var months = S.payoffMonths(d.balance, d.rate, d.minPayment);
        var paid = d.balance <= 0;
        return '<div class="card">' +
          '<div class="row between">' +
            '<div><div class="l-title">' + esc(d.name) + '</div>' +
            '<div class="l-sub">' + (paid ? esc(t('debt.paid')) : esc(t('debt.balance')) + ': ' + money(d.balance)) + '</div></div>' +
            '<span class="ic-wrap">' + ic(d.icon || 'debt') + '</span>' +
          '</div>' +
          (paid ? '' : '<div class="small muted" style="margin-top:10px">' +
            esc(t('debt.payoff')) + ': ' + (isFinite(months) ? months + ' ' + esc(t('debt.months')) : '—') +
            (d.minPayment > 0 ? ' · ' + money(d.minPayment) + '/' + esc(t('debt.monthly')).toLowerCase() : '') + '</div>') +
          '<div class="row2" style="margin-top:12px">' +
            (paid ? '' : '<button class="btn soft sm" data-act="debt-pay" data-id="' + d.id + '">' + esc(t('debt.add_payment')) + '</button>') +
            '<button class="btn ghost sm" data-act="debt-del" data-id="' + d.id + '">' + esc(t('common.delete')) + '</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }
  };

  OVERLAYS['debt-form'] = {
    title: function () { return t('debt.add'); },
    body: function () {
      return '<div class="field"><label>' + esc(t('common.name')) + '</label><input class="input" id="df_name" placeholder="' + esc(t('debt.name_ph')) + '"></div>' +
        '<div class="row2">' +
          '<div class="field"><label>' + esc(t('debt.principal')) + '</label><input type="number" step="0.01" class="input" id="df_principal"></div>' +
          '<div class="field"><label>' + esc(t('debt.balance')) + '</label><input type="number" step="0.01" class="input" id="df_balance"></div>' +
        '</div>' +
        '<div class="row2">' +
          '<div class="field"><label>' + esc(t('debt.rate')) + '</label><input type="number" step="0.01" class="input" id="df_rate" value="0"></div>' +
          '<div class="field"><label>' + esc(t('debt.min_pay')) + '</label><input type="number" step="0.01" class="input" id="df_min" value="0"></div>' +
        '</div>' +
        '<button class="btn full" data-act="debt-save">' + esc(t('common.save')) + '</button>';
    }
  };

  OVERLAYS.zakat = {
    title: function () { return t('zakat.title'); },
    body: function () {
      var z = zakatInputs();
      function f(id, label, val) {
        return '<div class="field"><label>' + esc(label) + '</label><input type="number" step="0.01" class="input" data-z="' + id + '" value="' + (val || 0) + '"></div>';
      }
      return '<div class="card"><div class="small muted">' + esc(t('zakat.sub')) + '</div></div>' +
        f('cash', t('zakat.cash'), z.cash) +
        '<div class="row2">' + f('gold', t('zakat.gold'), z.gold) + f('silver', t('zakat.silver'), z.silver) + '</div>' +
        '<div class="row2">' + f('investments', t('zakat.investments'), z.investments) + f('receivables', t('zakat.receivables'), z.receivables) + '</div>' +
        '<div class="row2">' + f('liabilities', t('zakat.liabilities'), z.liabilities) + f('goldPrice', t('zakat.gold_price'), z.goldPrice) + '</div>' +
        '<div id="zakatResult">' + zakatResultHTML() + '</div>';
    }
  };
  function zakatInputs() {
    if (!window.__zakat) window.__zakat = { cash: 0, gold: 0, silver: 0, investments: 0, receivables: 0, liabilities: 0, goldPrice: 320 };
    return window.__zakat;
  }
  function zakatResultHTML() {
    var r = S.zakat(zakatInputs());
    return '<div class="card" style="margin-top:8px">' +
      '<div class="row between small"><span>' + esc(t('zakat.net')) + '</span><span class="num">' + money(r.net) + '</span></div>' +
      '<div class="row between small" style="margin-top:6px"><span>' + esc(t('zakat.nisab')) + '</span><span class="num">' + money(r.nisab) + '</span></div>' +
      '<div class="hr"></div>' +
      '<div class="row between"><span style="font-weight:600">' + esc(r.due ? t('zakat.due') : t('zakat.not_due')) + '</span>' +
      '<span class="num" style="font-weight:660;color:' + (r.due ? 'var(--teal)' : 'var(--muted)') + '">' + money(r.amount) + '</span></div>' +
      '<div class="tiny muted" style="margin-top:10px">' + esc(t('zakat.rate_note')) + '</div>' +
      '<div class="tiny muted" style="margin-top:4px">' + esc(t('zakat.note')) + '</div>' +
    '</div>';
  }

  OVERLAYS.checklists = {
    title: function () { return t('chk.title'); },
    action: { icon: 'plus', act: 'chk-add-list' },
    body: function () {
      return S.get().checklists.map(function (l) {
        var pr = S.checklistProgress(l.id);
        var title = l.custom ? l.name : t('chk.' + l.key);
        return '<div class="card">' +
          '<div class="row between" style="margin-bottom:6px">' +
            '<div class="l-title">' + esc(title) + '</div>' +
            '<span class="pill teal">' + pr.done + '/' + pr.total + '</span>' +
          '</div>' +
          l.items.map(function (i) {
            var label = l.custom ? i.text : t('chk.' + i.key);
            return '<div class="checkitem ' + (i.done ? 'on' : '') + '" role="checkbox" tabindex="0" aria-checked="' + (i.done ? 'true' : 'false') + '" data-act="chk-toggle" data-list="' + l.id + '" data-item="' + i.id + '">' +
              '<span class="cbox">' + ic('check') + '</span><span class="ci-text">' + esc(label) + '</span></div>';
          }).join('') +
          '<div class="row2" style="margin-top:10px">' +
            '<button class="btn ghost sm" data-act="chk-reset" data-list="' + l.id + '">' + esc(t('common.reset')) + '</button>' +
            (l.custom ? '<button class="btn ghost sm" data-act="chk-del" data-list="' + l.id + '">' + esc(t('common.delete')) + '</button>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    }
  };

  OVERLAYS.challenges = {
    title: function () { return t('chal.title'); },
    body: function () {
      var html = '';
      var active = S.get().challenges.filter(function (c) { return c.status === 'active'; });
      if (active.length) {
        html += sechead(t('chal.active'));
        html += active.map(function (c) {
          var daysIn = Math.max(0, Math.round((Date.now() - S.parseYMD(c.startDate).getTime()) / 86400000));
          var total = c.days || 0;
          var pct = total > 0 ? Math.min(100, Math.round((daysIn / total) * 100)) : 0;
          return '<div class="card">' +
            '<div class="row between"><div class="l-title">' + esc(t('chal.' + c.key)) + '</div>' +
            '<span class="pill teal">' + esc(t('chal.active')) + '</span></div>' +
            '<div class="l-sub small">' + esc(t('chal.' + c.key + '_d')) + '</div>' +
            (total > 0
              ? '<div class="pbar" style="margin-top:10px"><i style="width:' + pct + '%"></i></div>' +
                '<div class="tiny muted" style="margin-top:6px">' +
                esc(t('chal.days_done', { n: daysIn })) + ' · ' +
                esc(t('chal.days_left', { n: Math.max(0, total - daysIn) })) + '</div>'
              : '') +
            '<div class="row2" style="margin-top:10px">' +
              '<button class="btn soft sm" data-act="chal-done" data-id="' + c.id + '">' + esc(t('chal.mark_done')) + '</button>' +
              '<button class="btn ghost sm" data-act="chal-end" data-id="' + c.id + '">' + esc(t('chal.give_up')) + '</button>' +
            '</div></div>';
        }).join('');
      }
      html += sechead(t('chal.title'));
      html += window.JELAS_SEED.CHALLENGE_SEED.map(function (c) {
        var started = S.get().challenges.some(function (x) { return x.id === c.id && x.status === 'active'; });
        return '<div class="card"><div class="row" style="gap:12px">' +
          '<span class="ic-wrap">' + ic(c.icon) + '</span>' +
          '<div class="grow"><div class="l-title">' + esc(t('chal.' + c.key)) + '</div>' +
          '<div class="l-sub small">' + esc(t('chal.' + c.key + '_d')) + '</div></div>' +
          '<button class="btn sm ' + (started ? 'ghost' : 'soft') + '" data-act="chal-start" data-id="' + c.id + '"' + (started ? ' disabled' : '') + '>' +
            esc(started ? t('chal.active') : t('chal.start')) + '</button>' +
        '</div></div>';
      }).join('');

      html += sechead(t('chal.badges'));
      html += '<div class="badges">' + window.JELAS_SEED.BADGES.map(function (b) {
        var earned = S.hasBadge(b.id);
        return '<div class="badge ' + (earned ? 'earned' : '') + '">' + ic(b.icon) +
          '<div class="bt">' + esc(t('chal.' + b.key)) + '</div>' +
          '<div class="bs">' + esc(t('chal.' + b.key + '_d')) + '</div></div>';
      }).join('') + '</div>';
      return html;
    }
  };

  OVERLAYS.learn = {
    title: function () { return t('learn.title'); },
    body: function () {
      var order = window.JELAS_SEED.LESSON_ORDER;
      var html = '<div class="card flat"><div class="small muted">' + esc(t('learn.sub')) + ' · ' +
        S.lessonsReadCount() + '/' + order.length + ' ' + esc(t('learn.progress')) + '</div></div>';
      html += order.map(function (id) {
        var read = !!S.get().lessons[id];
        return '<div class="card tap" data-act="lesson-read" data-id="' + id + '">' +
          '<div class="row between"><div class="l-title">' + esc(t('learn.' + id + '_t')) + '</div>' +
          (read ? '<span class="pill teal">' + esc(t('learn.read_done')) + '</span>' : '<span class="pill">' + esc(t('learn.read')) + '</span>') + '</div>' +
          '<div class="small muted" style="margin-top:8px">' + esc(t('learn.' + id + '_b')) + '</div>' +
        '</div>';
      }).join('');
      html += sechead(t('learn.title'));
      html += window.JELAS_SEED.STUDENT_TIPS.map(function (tip) {
        return '<div class="card" style="display:flex;gap:12px;align-items:flex-start">' +
          '<span style="flex:none;color:var(--teal);margin-top:2px">' + ic(tip.icon) + '</span>' +
          '<div><div class="l-title" style="font-size:14px">' + esc(tip.t) + '</div>' +
          '<div class="small muted" style="margin-top:4px">' + esc(tip.b) + '</div></div></div>';
      }).join('');
      return html;
    }
  };

  OVERLAYS.security = {
    title: function () { return t('sec.title'); },
    body: function () {
      var s = cfg();
      var html = '<div class="card"><div class="small muted">' + esc(t('sec.sub')) + '</div></div>';
      html += '<div class="card">';
      html += swHTML('sec-toggle', 'bio', s.bio, t('sec.bio'), t('sec.bio_d'));
      html += swHTML('sec-toggle', 'privacyBlur', s.privacyBlur, t('sec.blur'), t('sec.blur_d'));
      html += swHTML('sec-toggle', 'screenshotBlock', s.screenshotBlock, t('sec.screenshot'), t('sec.screenshot_d'));
      html += '</div>';
      html += '<div class="card">' +
        '<div class="sw-title" style="margin-bottom:8px">' + esc(t('sec.autolock')) + '</div>' +
        '<select class="select" data-act="sec-autolock">' +
        [['0', t('common.never')], ['15', '15s'], ['30', '30s'], ['60', '60s']].map(function (o) {
          return '<option value="' + o[0] + '"' + (String(s.autoLock) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select></div>';

      html += '<div class="card">' +
        '<div class="row between"><span class="sw-title">' + esc(t('sec.lock')) + '</span><span class="pill teal">' + esc(t('sec.lock_on')) + '</span></div>' +
        '<button class="btn ghost full" style="margin-top:12px" data-act="sec-change-pin">' + esc(t('sec.change_pin')) + '</button>' +
        '<button class="btn ghost full" style="margin-top:8px" data-act="sec-lock-now">' + esc(t('sec.lock_now')) + '</button>' +
      '</div>';

      // what it can / cannot do
      html += sechead(t('sec.can')) + '<div class="card">' +
        [t('sec.can1'), t('sec.can2'), t('sec.can3'), t('sec.can4')].map(function (x) {
          return '<div class="row" style="gap:10px;padding:7px 0"><span style="color:var(--in);flex:none">' + ic('check') + '</span><span class="small">' + esc(x) + '</span></div>';
        }).join('') + '</div>';
      html += sechead(t('sec.cannot')) + '<div class="card">' +
        [t('sec.cannot1'), t('sec.cannot2'), t('sec.cannot3'), t('sec.cannot4')].map(function (x) {
          return '<div class="row" style="gap:10px;padding:7px 0"><span style="color:var(--out);flex:none">' + ic('close') + '</span><span class="small">' + esc(x) + '</span></div>';
        }).join('') + '</div>';

      html += sechead(t('sec.title'));
      html += '<div class="card" style="display:flex;gap:12px;align-items:flex-start"><span style="flex:none;color:var(--teal);margin-top:2px">' + ic('shield') + '</span>' +
        '<div><div class="l-title" style="font-size:14px">' + esc(t('sec.no_internet')) + '</div>' +
        '<div class="small muted" style="margin-top:4px">' + esc(t('sec.no_internet_d')) + '</div></div></div>';
      html += '<div class="card" style="display:flex;gap:12px;align-items:flex-start"><span style="flex:none;color:var(--teal);margin-top:2px">' + ic('lock') + '</span>' +
        '<div><div class="l-title" style="font-size:14px">' + esc(t('sec.encrypted')) + '</div>' +
        '<div class="small muted" style="margin-top:4px">' + esc(t('sec.encrypted_d')) + '</div></div></div>';

      var dsOn = window.JELAS_DB.prefs.get('dsBound', false) && hasAndroid();
      html += '<div class="card" style="display:flex;gap:12px;align-items:flex-start">' +
        '<span style="flex:none;color:' + (dsOn ? 'var(--in)' : 'var(--muted)') + ';margin-top:2px">' + ic('shield') + '</span>' +
        '<div><div class="l-title" style="font-size:14px">' + esc(t('sec.ds_title')) +
        (dsOn ? ' <span class="pill in">' + esc(t('common.on')) + '</span>' : '') + '</div>' +
        '<div class="small muted" style="margin-top:4px">' + esc(dsOn ? t('sec.ds_d') : t('sec.ds_off')) + '</div></div></div>';
      html += '<div class="card" style="display:flex;gap:12px;align-items:flex-start"><span style="flex:none;color:var(--teal);margin-top:2px">' + ic('eyeoff') + '</span>' +
        '<div><div class="l-title" style="font-size:14px">' + esc(t('sec.no_track')) + '</div>' +
        '<div class="small muted" style="margin-top:4px">' + esc(t('sec.no_track_d')) + '</div></div></div>';
      return html;
    }
  };

  OVERLAYS.data = {
    title: function () { return t('data.title'); },
    body: function () {
      var last = S.get().meta.lastBackup;
      return '<div class="card">' +
          '<div class="l-title">' + esc(t('data.backup')) + '</div>' +
          '<div class="small muted" style="margin-top:6px">' + esc(t('data.backup_d')) + '</div>' +
          (last ? '<div class="tiny muted" style="margin-top:6px">' + esc(t('data.last_backup')) + ': ' + esc(fmtDate(new Date(last))) + '</div>' : '') +
          '<button class="btn full" style="margin-top:12px" data-act="data-backup">' + ic('download') + esc(t('data.backup')) + '</button>' +
          '<button class="btn ghost full" style="margin-top:8px" data-act="data-restore">' + ic('upload') + esc(t('data.restore')) + '</button>' +
        '</div>' +
        '<div class="card">' +
          '<div class="l-title">' + esc(t('data.csv_out')) + '</div>' +
          '<div class="small muted" style="margin-top:6px">' + esc(t('data.csv_out_d')) + '</div>' +
          '<button class="btn ghost full" style="margin-top:12px" data-act="data-csv-out">' + esc(t('data.csv_out')) + '</button>' +
        '</div>' +
        '<div class="card">' +
          '<div class="l-title">' + esc(t('data.csv_in')) + '</div>' +
          '<div class="small muted" style="margin-top:6px">' + esc(t('data.csv_in_d')) + '</div>' +
          '<button class="btn ghost full" style="margin-top:12px" data-act="data-csv-in">' + esc(t('data.csv_in')) + '</button>' +
        '</div>' +
        '<div class="card">' +
          '<div class="l-title">' + esc(t('data.receipts')) + '</div>' +
          '<div class="small muted" style="margin-top:6px" id="dsReceipts">—</div>' +
          '<button class="btn ghost full" style="margin-top:12px" data-act="data-clear-receipts">' + esc(t('data.clear_receipts')) + '</button>' +
        '</div>' +
        '<div class="card">' +
          '<div class="l-title" style="color:var(--out)">' + esc(t('data.wipe')) + '</div>' +
          '<div class="small muted" style="margin-top:6px">' + esc(t('data.wipe_d')) + '</div>' +
          '<button class="btn danger full" style="margin-top:12px" data-act="data-wipe">' + esc(t('data.wipe')) + '</button>' +
        '</div>';
    },
    after: function () {
      var el = $('dsReceipts');
      if (!el) return;
      window.JELAS_RECEIPTS.totalBytes().then(function (b) {
        var mb = (b / 1048576);
        el.textContent = t('data.storage') + ': ' + (mb < 0.05 ? (b / 1024).toFixed(0) + ' KB' : mb.toFixed(2) + ' MB');
      }).catch(function () { el.textContent = '—'; });
    }
  };

  OVERLAYS.reminders = {
    title: function () { return t('rem.title'); },
    body: function () {
      var r = S.get().reminders;
      var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var html = '<div class="card">' +
        swHTML('rem-toggle', 'daily', r.daily.on, t('rem.daily'), t('rem.daily_d')) +
        (r.daily.on ? '<div class="field" style="margin-top:10px"><label>' + esc(t('rem.time')) + '</label><input type="time" class="input" data-rem="daily" value="' + esc(r.daily.time) + '"></div>' : '') +
      '</div>';
      html += '<div class="card">' +
        swHTML('rem-toggle', 'weekly', r.weekly.on, t('rem.weekly'), t('rem.weekly_d')) +
        (r.weekly.on ? '<div class="row2" style="margin-top:10px">' +
          '<div class="field"><label>' + esc(t('rem.day')) + '</label><select class="select" data-rem-day="weekly">' +
            days.map(function (d, i) { return '<option value="' + i + '"' + (r.weekly.day === i ? ' selected' : '') + '>' + d + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><label>' + esc(t('rem.time')) + '</label><input type="time" class="input" data-rem="weekly" value="' + esc(r.weekly.time) + '"></div>' +
        '</div>' : '') +
      '</div>';
      html += '<div class="card">' +
        swHTML('rem-toggle', 'monthly', r.monthly.on, t('rem.monthly'), t('rem.monthly_d')) +
        (r.monthly.on ? '<div class="field" style="margin-top:10px"><label>' + esc(t('rem.time')) + '</label><input type="time" class="input" data-rem="monthly" value="' + esc(r.monthly.time) + '"></div>' : '') +
      '</div>';
      html += '<div class="tiny muted" style="padding:0 4px">' + esc(t('rem.notif_note')) + '</div>';
      return html;
    }
  };

  OVERLAYS.settings = {
    title: function () { return t('set.title'); },
    body: function () {
      var s = cfg();
      var html = '';
      html += '<div class="card"><div class="sw-title" style="margin-bottom:10px">' + esc(t('set.language')) + '</div>' +
        '<div class="chips">' + window.I18N.langs().map(function (l) {
          return '<button class="chip ' + (s.locale === l ? 'on' : '') + '" data-act="set-lang" data-l="' + l + '">' +
            esc(window.I18N.langName(l)) + '</button>';
        }).join('') + '</div></div>';

      html += '<div class="card"><div class="sw-title" style="margin-bottom:10px">' + esc(t('set.theme')) + '</div>' +
        '<div class="chips">' + [['auto', 'set.theme_auto'], ['light', 'set.theme_light'], ['dark', 'set.theme_dark']].map(function (o) {
          return '<button class="chip ' + (s.theme === o[0] ? 'on' : '') + '" data-act="set-theme" data-v="' + o[0] + '">' + esc(t(o[1])) + '</button>';
        }).join('') + '</div></div>';

      html += '<div class="card"><div class="sw-title" style="margin-bottom:10px">' + esc(t('bud.method')) + '</div>' +
        '<div class="chips">' + [['5020', 'onb.m5020'], ['zero', 'onb.mzero'], ['envelope', 'onb.menvelope'], ['pyf', 'onb.mpyf']].map(function (o) {
          return '<button class="chip ' + (s.method === o[0] ? 'on' : '') + '" data-act="set-method" data-v="' + o[0] + '">' + esc(t(o[1])) + '</button>';
        }).join('') + '</div></div>';

      html += '<div class="card">' +
        swHTML('set-toggle', 'haptics', s.haptics, t('set.haptics'), '') +
        swHTML('set-toggle', 'reduceMotion', s.reduceMotion, t('set.reduce_motion'), '') +
        swHTML('set-toggle', 'receiptScan', s.receiptScan, t('set.receipt_scan'), t('set.receipt_scan_d')) +
      '</div>';
      return html;
    }
  };

  OVERLAYS.about = {
    title: function () { return t('set.about'); },
    body: function () {
      return '<div class="card center">' +
          '<div class="onb-mark" style="margin:0 auto 16px">' + ic('flow') + '</div>' +
          '<div style="font-size:20px;font-weight:660;letter-spacing:.16em">JELAS</div>' +
          '<div class="small muted" style="margin-top:6px">' + esc(t('app.tagline')) + '</div>' +
          '<div class="tiny muted" style="margin-top:10px">' + esc(t('set.version')) + ' 1.0.0</div>' +
        '</div>' +
        '<div class="card"><div class="small">' + esc(t('set.made')) + '</div></div>' +
        '<div class="card"><div class="l-title" style="font-size:14px">' + esc(t('sec.title')) + '</div>' +
          '<div class="small muted" style="margin-top:6px">' + esc(t('sec.no_internet_d')) + '</div></div>' +
        '<div class="card"><div class="l-title" style="font-size:14px">' + esc(t('set.about')) + '</div>' +
          '<div class="small muted" style="margin-top:6px">' + esc(t('set.license')) + '</div></div>' +
        '<div class="card"><div class="small muted">' + esc(t('zakat.note')) + '</div></div>';
    }
  };

  /* ================= ONBOARDING ================= */
  function showOnb() {
    $('onb').classList.add('show');
    renderOnb();
  }
  function renderOnb() {
    $('onbMarkWrap').innerHTML = '<div class="onb-mark">' + markSVG(34) + '</div>';

    var steps = [];
    // 0 welcome
    steps.push('<div class="onb-step' + (onbStep === 0 ? ' show' : '') + '">' +
      '<div class="onb-h">' + esc(t('onb.welcome_title')) + '</div>' +
      '<div class="onb-sub">' + esc(t('onb.welcome_sub')) + '</div></div>');
    // 1 language
    steps.push('<div class="onb-step' + (onbStep === 1 ? ' show' : '') + '">' +
      '<div class="onb-h">' + esc(t('onb.lang_title')) + '</div>' +
      '<div class="onb-sub">' + esc(t('onb.lang_sub')) + '</div>' +
      '<div style="margin-top:22px">' + window.I18N.langs().map(function (l) {
        return '<button class="langopt ' + (onbLang === l ? 'on' : '') + '" data-act="onb-lang" data-l="' + l + '">' +
          '<span class="lg">' + esc(window.I18N.langFlag(l)) + '</span>' +
          '<span><span class="lt">' + esc(window.I18N.langName(l)) + '</span></span></button>';
      }).join('') + '</div></div>');
    // 2 method
    steps.push('<div class="onb-step' + (onbStep === 2 ? ' show' : '') + '">' +
      '<div class="onb-h">' + esc(t('onb.method_title')) + '</div>' +
      '<div class="onb-sub">' + esc(t('onb.method_sub')) + '</div>' +
      '<div style="margin-top:22px">' + [['5020', 'm5020', 'chart'], ['zero', 'mzero', 'target'], ['envelope', 'menvelope', 'wallet'], ['pyf', 'mpyf', 'piggy']].map(function (m) {
        return '<button class="methodopt ' + (onbMethod === m[0] ? 'on' : '') + '" data-act="onb-method" data-m="' + m[0] + '">' +
          '<span class="mi">' + ic(m[2]) + '</span>' +
          '<span><span class="lt">' + esc(t('onb.' + m[1])) + '</span><br><span class="ls">' + esc(t('onb.' + m[1] + '_d')) + '</span></span></button>';
      }).join('') + '</div></div>');
    // 3 pin
    steps.push('<div class="onb-step' + (onbStep === 3 ? ' show' : '') + '">' +
      '<div class="onb-h">' + esc(t('onb.pin_title')) + '</div>' +
      '<div class="onb-sub">' + esc(t('onb.pin_sub')) + '</div>' +
      '<div style="margin-top:22px">' +
        '<div class="dots" id="onbDotsPin" style="justify-content:flex-start"></div>' +
        '<div class="lockerr" id="onbPinErr"></div>' +
        '<div class="lockpad" id="onbPad" style="margin-top:6px"></div>' +
      '</div></div>');
    // 4 ready
    steps.push('<div class="onb-step' + (onbStep === 4 ? ' show' : '') + '">' +
      '<div class="onb-h">' + esc(t('onb.ready_title')) + '</div>' +
      '<div class="onb-sub">' + esc(t('onb.ready_sub')) + '</div></div>');

    $('onbSteps').innerHTML = steps.join('');

    $('onbDots').innerHTML = [0, 1, 2, 3, 4].map(function (i) {
      return '<i class="' + (i === onbStep ? 'on' : '') + '"></i>';
    }).join('');

    var foot = '';
    if (onbStep === 0) foot = '<button class="btn full" data-act="onb-next">' + esc(t('onb.welcome_cta')) + '</button>';
    else if (onbStep === 1) foot = '<button class="btn full" data-act="onb-next">' + esc(t('common.next')) + '</button>';
    else if (onbStep === 2) foot = '<button class="btn full" data-act="onb-next">' + esc(t('common.next')) + '</button>';
    else if (onbStep === 4) foot = '<button class="btn full" data-act="onb-finish">' + esc(t('onb.ready_cta')) + '</button>';
    $('onbFoot').innerHTML = foot;

    if (onbStep === 3) renderOnbPin();
  }

  function renderOnbPin() {
    var val = onbPin2 === null ? onbPin : onbPin2;
    var d = $('onbDotsPin');
    if (!d) return;
    d.innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) {
      return '<i class="' + (i < val.length ? 'on' : '') + '"></i>';
    }).join('');
    var pad = $('onbPad');
    pad.innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(function (k) {
      if (k === '') return '<button class="fn" disabled></button>';
      if (k === 'del') return '<button class="fn" data-act="onb-key" data-key="del">⌫</button>';
      return '<button data-act="onb-key" data-key="' + k + '">' + k + '</button>';
    }).join('');
  }

  function onbKey(k) {
    var val = onbPin2 === null ? onbPin : onbPin2;
    if (k === 'del') val = val.slice(0, -1);
    else if (val.length < 6) val += k;
    if (onbPin2 === null) onbPin = val; else onbPin2 = val;
    var err = $('onbPinErr'); if (err) err.textContent = '';
    renderOnbPin();
    if (val.length === 6) {
      setTimeout(function () {
        if (onbPin2 === null) {
          if (onbPin.length !== 6) return;
          onbPin2 = '';
          renderOnbPin();
        } else {
          if (onbPin2 !== onbPin) {
            var e = $('onbPinErr'); if (e) e.textContent = t('onb.pin_mismatch');
            onbPin = ''; onbPin2 = null;
            setTimeout(renderOnbPin, 400);
          } else {
            onbStep = 4;
            renderOnb();
          }
        }
      }, 160);
    }
  }

  function finishOnboarding() {
    var salt = window.JELAS_CRYPTO.newSalt();
    var secret = deviceSecret();
    window.JELAS_DB.prefs.set('salt', salt);
    window.JELAS_DB.prefs.set('lang', onbLang);
    window.JELAS_DB.prefs.set('dsBound', !!secret);
    applyLang(onbLang);
    window.JELAS_CRYPTO.deriveKey(onbPin, salt, secret).then(function (key) {
      return window.JELAS_CRYPTO.makeVerifier(key).then(function (v) {
        window.JELAS_DB.prefs.set('verifier', v);
        KEY = key;
        var st = S.defaultState({ method: onbMethod, locale: onbLang });
        // seed a default cash account so the app is usable immediately
        st.accounts.push({
          id: S.uid('a'), name: onbLang === 'ms' ? 'Tunai' : onbLang === 'zh' ? '现金' : 'Cash',
          type: 'cash', openingBalance: 0, archived: false, meta: {}, createdAt: Date.now()
        });
        S.init(st, key);
        return S.save(true).then(function () {
          window.JELAS_DB.prefs.set('onboarded', true);
          $('onb').classList.remove('show');
          applyTheme();
          render();
          toast(t('onb.ready_cta'));
        });
      });
    }).catch(function (e) {
      var err = $('onbPinErr'); if (err) err.textContent = 'Crypto error: ' + e.message;
    });
  }

  /* ================= LOCK ================= */
  function showLock() {
    lockBuf = ''; lockTries = 0;
    $('lock').classList.add('show');
    renderLock();
  }
  function hideLock() { $('lock').classList.remove('show'); lockBuf = ''; }
  function renderLock() {
    $('lockTitle').textContent = t('lock.title');
    $('lockSub').textContent = t('lock.sub');
    $('lockErr').textContent = '';
    $('lockDots').innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) {
      return '<i class="' + (i < lockBuf.length ? 'on' : '') + '"></i>';
    }).join('');
    $('lockPad').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(function (k) {
      if (k === '') return '<button class="fn" disabled></button>';
      if (k === 'del') return '<button class="fn" data-act="lock-key" data-key="del">⌫</button>';
      return '<button data-act="lock-key" data-key="' + k + '">' + k + '</button>';
    }).join('');
    var foot = '';
    // Device-lock unlock is available whenever the key is still cached in memory
    // (i.e. after an auto-lock). A cold start always requires the PIN.
    if (cfg().bio && KEY && hasAndroid()) {
      foot += '<button class="btn ghost" data-act="lock-bio">' + ic('key') + esc(t('lock.use_bio')) + '</button>';
    }
    $('lockFoot').innerHTML = foot;
  }
  function lockKey(k) {
    if (k === 'del') lockBuf = lockBuf.slice(0, -1);
    else if (lockBuf.length < 6) lockBuf += k;
    renderLock();
    if (lockBuf.length === 6) attemptUnlock(lockBuf);
  }
  function attemptUnlock(pin) {
    var salt = window.JELAS_DB.prefs.get('salt', null);
    var verifier = window.JELAS_DB.prefs.get('verifier', null);
    if (!salt || !verifier) { toast('Setup error'); return; }

    var until = lockUntilTs();
    if (until > Date.now()) {
      lockBuf = ''; renderLock();
      $('lockErr').textContent = t('lock.wrong') + ' · ' + waitLabel(until - Date.now());
      return;
    }

    var secret = deviceSecret();
    var dsBound = window.JELAS_DB.prefs.get('dsBound', false);
    if (dsBound && !secret) {
      // The data was sealed with the hardware secret, which is unavailable now.
      $('lockErr').textContent = t('lock.ds_missing');
      lockBuf = ''; renderLock();
      return;
    }

    window.JELAS_CRYPTO.deriveKey(pin, salt, secret).then(function (key) {
      return window.JELAS_CRYPTO.checkVerifier(key, verifier).then(function (ok) {
        if (!ok) {
          var r = bumpLockFails();
          lockBuf = '';
          renderLock();
          $('lockErr').textContent = t('lock.wrong') +
            (r.delay > 0 ? ' · ' + t('lock.locked_for') + ' ' + waitLabel(r.delay)
              : ' (' + r.n + '/' + 5 + ')');
          haptic(30);
          return;
        }
        resetLockFails();
        return unlockWith(key);
      });
    }).catch(function (e) {
      $('lockErr').textContent = String(e.message || e);
    });
  }
  function unlockWith(key) {
    KEY = key;
    S.setKey(key);
    return window.JELAS_DB.loadSnapshot(key).then(function (snap) {
      S.init(snap || S.defaultState(), key);
      if (!snap) return S.save(true);
      return true;
    }).then(function () {
      hideLock();
      applyLang(cfg().locale || 'en');
      applyTheme();
      render();
      lastActivity = Date.now();
      scheduleReminders();
      try { S.snapshotNetWorth(); } catch (e) {}
      // keep the OS-level screenshot flag in step with the stored setting
      if (hasAndroid()) { try { android().setSecure(!!cfg().screenshotBlock); } catch (e) {} }
    }).catch(function (e) {
      $('lockErr').textContent = 'Load error: ' + (e.message || e);
    });
  }

  /* ================= reminders ================= */
  function scheduleReminders() {
    if (!hasAndroid()) return;
    try {
      var r = S.get().reminders;
      android().scheduleReminders(JSON.stringify(r));
    } catch (e) {}
  }

  /* ================= file I/O ================= */
  function saveTextFile(name, mime, text) {
    if (hasAndroid()) {
      try {
        var b64 = btoa(unescape(encodeURIComponent(text)));
        var ok = android().saveFile(name, mime, b64);
        if (ok) { toast(t('toast.exported')); return; }
      } catch (e) {}
    }
    // browser fallback
    try {
      var blob = new Blob([text], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast(t('toast.exported'));
    } catch (e) { toast('Export failed'); }
  }

  function pickFile(accept, cb) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept || '*/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      document.body.removeChild(inp);
      if (f) cb(f);
    });
    inp.click();
  }

  function saveBinaryFile(name, mime, arrayBuffer) {
    if (hasAndroid()) {
      try {
        var bytes = new Uint8Array(arrayBuffer), bin = '';
        for (var i = 0; i < bytes.length; i += 0x8000) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        if (android().saveFile(name, mime, btoa(bin))) { toast(t('toast.exported')); return; }
      } catch (e) {}
    }
    try {
      var blob = new Blob([arrayBuffer], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast(t('toast.exported'));
    } catch (e) { toast('Export failed'); }
  }

  /* Draw the current report to a canvas. Fully offline. */
  function buildReportCanvas() {
    var anchor = reportAnchor, from, to, label;
    if (reportRange === 'week') {
      var ws = S.startOfWeek(anchor);
      from = ws; to = S.addDays(ws, 6);
      label = fmtDate(ws, 'short') + ' – ' + fmtDate(to, 'short');
    } else {
      from = S.startOfMonth(anchor); to = S.endOfMonth(anchor);
      label = fmtDate(anchor, 'monthYear');
    }
    var st = S.stats(from, to);
    var cats = S.categoryTotals(from, to);
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';

    var W = 720, H = 1180, S2 = 2;
    var cv = document.createElement('canvas');
    cv.width = W * S2; cv.height = H * S2;
    var x = cv.getContext('2d');
    x.scale(S2, S2);

    var paper = dark ? '#161513' : '#F2EFE8';
    var surface = dark ? '#201E1B' : '#FAF8F3';
    var ink = dark ? '#EDE9E1' : '#1F1D1A';
    var muted = dark ? '#948D80' : '#8A8375';
    var line = dark ? '#35322D' : '#E0DACE';
    var teal = dark ? '#6FB3A5' : '#1F6F63';
    var inC = dark ? '#8FB787' : '#4F7A4A';
    var outC = dark ? '#D08A6E' : '#B0603F';
    var F = 'sans-serif';

    function roundRect(x0, y0, w, h, r) {
      x.beginPath();
      x.moveTo(x0 + r, y0);
      x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
      x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
      x.arcTo(x0, y0 + h, x0, y0, r);
      x.arcTo(x0, y0, x0 + w, y0, r);
      x.closePath();
    }

    x.fillStyle = paper; x.fillRect(0, 0, W, H);

    // header
    x.fillStyle = ink;
    x.fillRect(48, 52, 26, 26);
    x.fillStyle = paper;
    x.fillRect(56, 63, 12, 4);
    x.beginPath(); x.arc(70, 65, 2.6, 0, 7); x.fill();

    x.fillStyle = ink; x.font = 'bold 26px ' + F;
    x.fillText('JELAS', 86, 74);
    x.fillStyle = muted; x.font = '15px ' + F;
    x.fillText(label, 48, 112);
    // money score, right-aligned on the period line
    var sc = moneyScore(anchor);
    x.textAlign = 'right';
    x.fillStyle = teal; x.font = 'bold 15px ' + F;
    x.fillText(t('score.title') + ' ' + sc.value + ' · ' + sc.label, W - 48, 112);
    x.textAlign = 'left';

    // hero card
    x.fillStyle = surface;
    roundRect(48, 140, W - 96, 200, 20); x.fill();
    x.strokeStyle = line; x.lineWidth = 1; x.stroke();

    var cols = [
      { k: t('report.in'), v: st.in, c: inC },
      { k: t('report.out'), v: st.out, c: outC },
      { k: t('report.net'), v: st.net, c: ink }
    ];
    var cw = (W - 96) / 3;
    cols.forEach(function (col, i) {
      var cx = 48 + cw * i + cw / 2;
      x.textAlign = 'center';
      x.fillStyle = muted; x.font = '12px ' + F;
      x.fillText(col.k.toUpperCase(), cx, 186);
      x.fillStyle = col.c; x.font = 'bold 26px ' + F;
      x.fillText(money(col.v), cx, 228);
      x.textAlign = 'left';
    });

    // flow bar
    var barY = 280, barW = W - 192, barX = 96;
    x.fillStyle = line;
    roundRect(barX, barY, barW, 16, 8); x.fill();
    var tot = Math.max(1, st.in + st.out);
    var inW = (st.in / tot) * barW;
    if (inW > 0) {
      x.fillStyle = inC;
      roundRect(barX, barY, Math.max(4, inW), 16, 8); x.fill();
    }
    if (st.out > 0) {
      x.fillStyle = outC;
      roundRect(barX + inW, barY, Math.max(4, barW - inW), 16, 8); x.fill();
    }
    x.fillStyle = muted; x.font = '13px ' + F;
    x.fillText(t('report.flow_title'), 48, barY + 56);

    // donut
    var cy = 520, cx0 = 210, r0 = 108, lw = 32;
    var total = cats.reduce(function (s, c) { return s + c.total; }, 0);
    if (total > 0) {
      x.strokeStyle = line; x.lineWidth = lw;
      x.beginPath(); x.arc(cx0, cy, r0, 0, Math.PI * 2); x.stroke();
      var a0 = -Math.PI / 2;
      cats.slice(0, 6).forEach(function (c) {
        var a1 = a0 + (c.total / total) * Math.PI * 2;
        x.strokeStyle = c.color; x.lineWidth = lw; x.lineCap = 'butt';
        x.beginPath(); x.arc(cx0, cy, r0, a0, a1); x.stroke();
        a0 = a1;
      });
      x.fillStyle = ink; x.font = 'bold 22px ' + F; x.textAlign = 'center';
      x.fillText(money(st.out), cx0, cy + 4);
      x.fillStyle = muted; x.font = '12px ' + F;
      x.fillText(t('report.out').toUpperCase(), cx0, cy + 26);
      x.textAlign = 'left';
    } else {
      x.fillStyle = muted; x.font = '15px ' + F;
      x.fillText(t('report.no_data'), 48, cy);
    }

    // legend
    var ly = cy - 100;
    cats.slice(0, 6).forEach(function (c) {
      x.fillStyle = c.color;
      roundRect(400, ly - 10, 12, 12, 3); x.fill();
      x.fillStyle = ink; x.font = '14px ' + F;
      var nm = c.name.length > 16 ? c.name.slice(0, 15) + '…' : c.name;
      x.fillText(nm, 422, ly);
      x.textAlign = 'right';
      x.fillStyle = muted; x.font = '13px ' + F;
      x.fillText(total > 0 ? Math.round((c.total / total) * 100) + '%' : '0%', W - 150, ly);
      x.fillStyle = ink; x.font = 'bold 14px ' + F;
      x.fillText(money(c.total), W - 48, ly);
      x.textAlign = 'left';
      ly += 34;
    });

    // footer
    x.strokeStyle = line; x.lineWidth = 1;
    x.beginPath(); x.moveTo(48, H - 96); x.lineTo(W - 48, H - 96); x.stroke();
    x.fillStyle = muted; x.font = '13px ' + F;
    x.fillText('JELAS · ' + t('app.tagline'), 48, H - 64);
    x.fillStyle = teal; x.font = '13px ' + F;
    x.fillText(t('report.insights') + ' — ' + t('sec.no_internet'), 48, H - 40);

    return cv;
  }

  function exportReportImage() {
    var cv = buildReportCanvas();
    if (!cv || !cv.toBlob) { toast('Export failed'); return; }
    var name = 'jelas-report-' + S.todayISO() + '.png';
    cv.toBlob(function (blob) {
      if (!blob) { toast('Export failed'); return; }
      var fr = new FileReader();
      fr.onload = function () { saveBinaryFile(name, 'image/png', fr.result); };
      fr.readAsArrayBuffer(blob);
    }, 'image/png');
  }


  /* ================= ACTIONS ================= */
  var ACTIONS = {};

  ACTIONS['set-tab'] = function (el) { closeAllOverlays(); setTab(el.getAttribute('data-tab')); };
  ACTIONS['open'] = function (el) { openOverlay(el.getAttribute('data-ov')); };
  ACTIONS['ov-back'] = function () { closeOverlay(); };
  ACTIONS['sheet-close'] = function () { closeSheet(); };
  ACTIONS['set-blur'] = function () {
    S.setSetting('privacyBlur', !cfg().privacyBlur);
    applyTheme(); renderChrome();
  };
  ACTIONS['set-lock'] = function () { lockNow({ hard: true }); };

  function lockNow(opts) {
    closeAllOverlays();
    var hard = !!(opts && opts.hard);
    // Flush any debounced write BEFORE dropping the key, or the last edit is lost.
    var finish = function () {
      if (hard) KEY = null;      // a hard lock needs the PIN again
      S.setKey(null);            // block writes while locked
      // Drop the decrypted state from memory so it is not sitting in RAM while locked.
      S.init(S.defaultState({ locale: window.JELAS_DB.prefs.get('lang', 'en') }), null);
      showLock();
      if (hasAndroid()) { try { android().onLocked(); } catch (e) {} }
    };
    if (KEY) {
      try { S.save(true).then(finish).catch(finish); }
      catch (e) { finish(); }
    } else {
      finish();
    }
  }

  ACTIONS['mood-set'] = function (el) {
    S.setMood(S.todayISO(), el.getAttribute('data-mood'));
    haptic(); renderToday();
  };

  ACTIONS['quick-add'] = function (el) {
    var cat = el.getAttribute('data-cat');
    newAddState('expense');
    if (cat) addState.categoryId = cat;
    setTab('add');
  };

  ACTIONS['add-type'] = function (el) {
    addState.type = el.getAttribute('data-type');
    if (addState.type === 'transfer') addState.categoryId = null;
    renderAdd();
  };
  ACTIONS['key'] = function (el) {
    var k = el.getAttribute('data-key');
    var v = addState.amount || '';
    if (k === 'del') v = v.slice(0, -1);
    else if (k === '.') { if (v.indexOf('.') === -1) v = (v || '0') + '.'; }
    else {
      if (v.indexOf('.') !== -1 && v.split('.')[1].length >= 2) return;
      if (v === '0') v = k; else v += k;
      if (v.replace('.', '').length > 10) return;
    }
    addState.amount = v;
    renderAdd();
    haptic(6);
  };
  ACTIONS['pick-cat'] = function (el) {
    addState.categoryId = el.getAttribute('data-cat');
    renderAdd();
    haptic();
  };
  ACTIONS['save-tx'] = function () { saveTransaction(); };
  ACTIONS['cancel-edit'] = function () { newAddState('expense'); setTab('today'); };
  ACTIONS['repeat-last'] = function () {
    var txs = S.get().transactions;
    if (!txs.length) { toast(t('toast.nothing_undo')); return; }
    var last = txs[txs.length - 1];
    addState.type = last.type;
    addState.amount = String(last.amount);
    addState.categoryId = last.categoryId;
    addState.accountId = last.accountId;
    addState.note = last.note || '';
    renderAdd();
    toast(t('add.repeat_last'));
  };
  ACTIONS['add-receipt'] = function () {
    pickFile('image/*', function (file) {
      toast(t('receipt.compressing'));
      window.JELAS_RECEIPTS.saveReceipt(KEY, file).then(function (rec) {
        addState.receiptId = rec.id;
        toast(t('receipt.stored'));
        renderAdd();
      }).catch(function () { toast(t('receipt.compress_fail')); });
    });
  };

  ACTIONS['flow-filter'] = function (el) { flowFilter = el.getAttribute('data-f'); renderFlow(); };
  ACTIONS['flow-month'] = function (el) {
    var d = Number(el.getAttribute('data-d'));
    flowAnchor = new Date(flowAnchor.getFullYear(), flowAnchor.getMonth() + d, 1);
    flowDay = null;
    renderFlow();
  };
  ACTIONS['flow-day'] = function (el) {
    var d = el.getAttribute('data-d');
    flowDay = (flowDay === d) ? null : d;
    renderFlow();
  };
  ACTIONS['flow-day-clear'] = function () { flowDay = null; renderFlow(); };
  ACTIONS['report-range'] = function (el) { reportRange = el.getAttribute('data-r'); renderReport(); };
  ACTIONS['report-move'] = function (el) {
    var d = Number(el.getAttribute('data-d'));
    if (reportRange === 'week') reportAnchor = S.addDays(reportAnchor, d * 7);
    else reportAnchor = new Date(reportAnchor.getFullYear(), reportAnchor.getMonth() + d, 1);
    renderReport();
  };
  ACTIONS['me-group'] = function (el) { meGroup = el.getAttribute('data-g'); renderMe(); };

  ACTIONS['txn-open'] = function (el) {
    var tx = S.transaction(el.getAttribute('data-id'));
    if (!tx) return;
    openTxnSheet(tx);
  };
  function openTxnSheet(tx) {
    var c = S.category(tx.categoryId);
    var a = S.get().accounts.find(function (x) { return x.id === tx.accountId; });
    var a2 = S.get().accounts.find(function (x) { return x.id === tx.toAccountId; });
    var html = '<h3>' + esc(tx.type === 'transfer' ? t('add.transfer') : (c ? c.name : t('common.category'))) + '</h3>';
    html += '<div class="amountbar"><span class="val" style="font-size:34px">' + money(tx.amount) + '</span></div>';
    html += '<div class="hr"></div>';
    html += '<div class="row between small" style="padding:6px 0"><span class="muted">' + esc(t('common.date')) + '</span><span>' + esc(fmtDate(tx.date)) + '</span></div>';
    html += '<div class="row between small" style="padding:6px 0"><span class="muted">' + esc(t('common.account')) + '</span><span>' + esc(a ? a.name : '—') + (a2 ? ' → ' + esc(a2.name) : '') + '</span></div>';
    if (tx.note) html += '<div class="row between small" style="padding:6px 0"><span class="muted">' + esc(t('common.note')) + '</span><span>' + esc(tx.note) + '</span></div>';
    if (tx.receiptId) html += '<div id="txnReceipt" style="margin-top:12px"></div>';
    html += '<div class="row2" style="margin-top:16px">' +
      '<button class="btn ghost" data-act="txn-edit" data-id="' + tx.id + '">' + esc(t('common.edit')) + '</button>' +
      '<button class="btn danger" data-act="txn-del" data-id="' + tx.id + '">' + esc(t('common.delete')) + '</button>' +
    '</div>' +
    '<button class="btn ghost full" style="margin-top:8px" data-act="sheet-close">' + esc(t('common.close')) + '</button>';
    openSheet(html);
    if (tx.receiptId) {
      window.JELAS_RECEIPTS.loadBlobURL(KEY, tx.receiptId, false).then(function (url) {
        var el = $('txnReceipt');
        if (el && url) el.innerHTML = '<img src="' + url + '" style="width:100%;border-radius:12px;border:1px solid var(--line)">';
      }).catch(function () {});
    }
  }
  ACTIONS['txn-del'] = function (el) {
    if (!confirm(t('common.delete_warn'))) return;
    S.deleteTransaction(el.getAttribute('data-id'));
    closeSheet(); toast(t('toast.deleted')); render();
  };
  ACTIONS['txn-edit'] = function (el) {
    var tx = S.transaction(el.getAttribute('data-id'));
    if (!tx) return;
    editState(tx);
    closeSheet();
    setTab('add');
  };

  ACTIONS['acct-add'] = function () { openOverlay('account-form'); };
  ACTIONS['acct-edit'] = function (el) { openOverlay('account-form', { id: el.getAttribute('data-id') }); };
  ACTIONS['acct-save'] = function (el) {
    var id = el.getAttribute('data-id');
    var name = ($('af_name').value || '').trim();
    if (!name) { toast(t('acct.need_name')); return; }
    var type = $('af_type').value;
    var open = Number($('af_open').value) || 0;
    var meta = {};
    if (type === 'credit') {
      if ($('af_limit')) meta.limit = Number($('af_limit').value) || 0;
      if ($('af_due')) meta.dueDay = Number($('af_due').value) || 1;
    }
    if (id) S.updateAccount(id, { name: name, type: type, openingBalance: open, meta: meta });
    else S.addAccount({ name: name, type: type, openingBalance: open, meta: meta });
    closeOverlay(); toast(t('toast.saved'));
    if (tab === 'add') renderAdd();
  };
  ACTIONS['acct-del'] = function (el) {
    if (!confirm(t('acct.delete_warn'))) return;
    S.deleteAccount(el.getAttribute('data-id'));
    closeOverlay(); toast(t('toast.deleted'));
  };
  ACTIONS['acct-archive'] = function (el) {
    S.updateAccount(el.getAttribute('data-id'), { archived: el.getAttribute('data-arch') === '1' });
    closeOverlay(); toast(t('toast.archived'));
  };

  ACTIONS['cat-add'] = function () { openOverlay('cat-form'); };
  ACTIONS['cat-edit'] = function (el) { openOverlay('cat-form', { id: el.getAttribute('data-id') }); };
  ACTIONS['cat-save'] = function (el) {
    var id = el.getAttribute('data-id');
    var name = ($('cf_name').value || '').trim();
    if (!name) { toast(t('cat.need_name')); return; }
    var kind = $('cf_kind').value;
    var sel = window.__cfSel || {};
    if (id) S.updateCategory(id, { name: name, kind: kind, color: sel.color, icon: sel.icon });
    else S.addCategory({ name: name, kind: kind, color: sel.color, icon: sel.icon });
    closeOverlay(); toast(t('toast.saved'));
  };
  ACTIONS['cat-del'] = function (el) {
    if (!confirm(t('cat.delete_warn'))) return;
    S.deleteCategory(el.getAttribute('data-id'));
    closeOverlay(); toast(t('toast.deleted'));
  };

  ACTIONS['limit-open'] = function () { openOverlay('limit'); };  ACTIONS['limit-quick'] = function (el) {
    var v = el.getAttribute('data-v');
    if ($('lim_amt')) $('lim_amt').value = v;
  };
  ACTIONS['limit-save'] = function () {
    var v = Number($('lim_amt') ? $('lim_amt').value : 0) || 0;
    if (v <= 0) { toast(t('limit.need_amount')); return; }
    S.setMonthlyLimit(v);
    // reset this month's alert flags so the new limit can alert properly
    var iso = S.todayISO().slice(0, 7);
    if (S.get().meta.limitAlerts) S.get().meta.limitAlerts[iso] = {};
    haptic(14);
    toast(t('limit.saved'));
    closeOverlay();
    render();
  };
  ACTIONS['limit-remove'] = function () {
    S.setMonthlyLimit(0);
    toast(t('limit.removed'));
    closeOverlay();
    render();
  };

  /* ---- templates ---- */
  ACTIONS['tpl-use'] = function (el) {
    var i = Number(el.getAttribute('data-i')) || 0;
    var list = S.frequentTemplates(4);
    var x = list[i];
    if (!x) return;
    newAddState(x.type);
    addState.amount = String(x.amount);
    addState.categoryId = x.categoryId;
    addState.accountId = x.accountId || addState.accountId;
    addState.note = x.note || '';
    setTab('add');
  };

  /* ---- ask ---- */
  ACTIONS['ask-ex'] = function (el) {
    var q = el.getAttribute('data-q');
    var inp = $('askInput');
    if (inp) inp.value = q;
    runAsk(q);
  };

  /* ---- bills ---- */
  ACTIONS['bill-add'] = function () { openOverlay('bill-form'); };
  ACTIONS['bill-edit'] = function (el) { openOverlay('bill-form', { id: el.getAttribute('data-id') }); };
  ACTIONS['bill-save'] = function (el) {
    var id = el.getAttribute('data-id');
    var name = ($('bf2_name').value || '').trim();
    if (!name) { toast(t('bill.need_name')); return; }
    var amt = Number($('bf2_amt').value) || 0;
    if (amt <= 0) { toast(t('bill.need_amount')); return; }
    var patch = {
      name: name,
      amount: amt,
      dueDay: Number($('bf2_day').value) || 1,
      frequency: $('bf2_freq').value,
      categoryId: $('bf2_cat').value || null,
      icon: window.__bf2Icon || 'repeat'
    };
    if (id) S.updateBill(id, patch);
    else S.addBill(patch);
    closeOverlay();
    toast(t('toast.saved'));
    render();
  };
  ACTIONS['bill-del'] = function (el) {
    if (!confirm(t('bill.delete_warn'))) return;
    S.deleteBill(el.getAttribute('data-id'));
    closeOverlay();
    toast(t('toast.deleted'));
    render();
  };
  ACTIONS['bill-paid'] = function (el) {
    var tx = S.markBillPaid(el.getAttribute('data-id'));
    if (!tx) return;
    haptic(16);
    celebrate();
    toast(t('bill.paid_toast'));
    renderOverlay();
    render();
  };

  ACTIONS['bud-add'] = function () { openOverlay('bud-form'); };  ACTIONS['bud-edit'] = function (el) { openOverlay('bud-form', { cat: el.getAttribute('data-cat') }); };
  ACTIONS['bud-save'] = function () {
    var cat = $('bf_cat') ? $('bf_cat').value : null;
    var amt = Number($('bf_amt').value) || 0;
    if (amt <= 0) { toast(t('bud.need_amount')); return; }
    var roll = $('bf_roll') ? $('bf_roll').classList.contains('on') : false;
    S.setBudget(cat, amt, 'month', roll);
    closeOverlay(); toast(t('toast.saved'));
  };
  ACTIONS['bud-del'] = function (el) {
    S.removeBudget(el.getAttribute('data-cat'));
    closeOverlay(); toast(t('toast.deleted'));
  };

  ACTIONS['goal-add'] = function () { openOverlay('goal-form'); };
  ACTIONS['goal-save'] = function () {
    var name = ($('gf_name').value || '').trim();
    if (!name) { toast(t('goal.need_name')); return; }
    var target = Number($('gf_target').value) || 0;
    if (target <= 0) { toast(t('goal.need_target')); return; }
    S.addGoal({ name: name, target: target, saved: Number($('gf_saved').value) || 0, deadline: $('gf_deadline').value || null });
    closeOverlay(); toast(t('toast.saved'));
  };
  ACTIONS['goal-add-money'] = function (el) {
    var id = el.getAttribute('data-id');
    openSheet('<h3>' + esc(t('goal.contribute')) + '</h3>' +
      '<div class="field"><label>' + esc(t('common.amount')) + '</label><input type="number" class="input" id="gcm_amt" placeholder="RM"></div>' +
      '<button class="btn full" data-act="goal-do-add" data-id="' + id + '">' + esc(t('common.save')) + '</button>');
  };
  ACTIONS['goal-do-add'] = function (el) {
    var amt = Number($('gcm_amt').value) || 0;
    if (amt <= 0) { toast(t('add.need_amount')); return; }
    var g = S.contributeGoal(el.getAttribute('data-id'), amt);
    closeSheet();
    toast(t('toast.goal_added'));
    if (g && g.target > 0 && g.saved >= g.target) { celebrate(); haptic(24); }
    renderOverlay();
  };
  ACTIONS['goal-del'] = function (el) {
    if (!confirm(t('common.delete_warn'))) return;
    S.deleteGoal(el.getAttribute('data-id')); renderOverlay();
  };

  ACTIONS['debt-add'] = function () { openOverlay('debt-form'); };
  ACTIONS['debt-save'] = function () {
    var name = ($('df_name').value || '').trim();
    if (!name) { toast(t('debt.need_name')); return; }
    var bal = Number($('df_balance').value) || 0;
    if (bal <= 0) { toast(t('debt.need_balance')); return; }
    S.addDebt({
      name: name, principal: Number($('df_principal').value) || bal, balance: bal,
      rate: Number($('df_rate').value) || 0, minPayment: Number($('df_min').value) || 0
    });
    closeOverlay(); toast(t('toast.saved'));
  };
  ACTIONS['debt-pay'] = function (el) {
    var id = el.getAttribute('data-id');
    openSheet('<h3>' + esc(t('debt.add_payment')) + '</h3>' +
      '<div class="field"><label>' + esc(t('common.amount')) + '</label><input type="number" class="input" id="dpm_amt" placeholder="RM"></div>' +
      '<button class="btn full" data-act="debt-do-pay" data-id="' + id + '">' + esc(t('common.save')) + '</button>');
  };
  ACTIONS['debt-do-pay'] = function (el) {
    var amt = Number($('dpm_amt').value) || 0;
    if (amt <= 0) { toast(t('add.need_amount')); return; }
    S.payDebt(el.getAttribute('data-id'), amt);
    closeSheet(); toast(t('toast.saved')); renderOverlay();
  };
  ACTIONS['debt-del'] = function (el) {
    if (!confirm(t('common.delete_warn'))) return;
    S.deleteDebt(el.getAttribute('data-id')); renderOverlay();
  };

  ACTIONS['chk-toggle'] = function (el) {
    S.toggleCheckItem(el.getAttribute('data-list'), el.getAttribute('data-item'));
    haptic();
    renderOverlay();
  };
  ACTIONS['chk-reset'] = function (el) { S.resetChecklist(el.getAttribute('data-list')); renderOverlay(); };
  ACTIONS['chk-del'] = function (el) { S.deleteChecklist(el.getAttribute('data-list')); renderOverlay(); };
  ACTIONS['chk-add-list'] = function () {
    openSheet('<h3>' + esc(t('chk.add_list')) + '</h3>' +
      '<div class="field"><label>' + esc(t('chk.list_name')) + '</label><input class="input" id="chl_name"></div>' +
      '<div class="field"><label>' + esc(t('common.type')) + '</label><select class="select" id="chl_period">' +
        '<option value="week">' + esc(t('chk.period_week')) + '</option>' +
        '<option value="month">' + esc(t('chk.period_month')) + '</option>' +
        '<option value="once">' + esc(t('chk.period_once')) + '</option></select></div>' +
      '<div class="field"><label>' + esc(t('chk.add_item')) + ' 1</label><input class="input" id="chl_i1"></div>' +
      '<div class="field"><label>' + esc(t('chk.add_item')) + ' 2</label><input class="input" id="chl_i2"></div>' +
      '<button class="btn full" data-act="chk-do-add-list">' + esc(t('common.save')) + '</button>');
  };
  ACTIONS['chk-do-add-list'] = function () {
    var name = ($('chl_name').value || '').trim();
    if (!name) { toast(t('common.required')); return; }
    var items = [($('chl_i1').value || '').trim(), ($('chl_i2').value || '').trim()].filter(Boolean);
    S.addChecklist(name, $('chl_period').value, items);
    closeSheet(); toast(t('toast.saved')); renderOverlay();
  };

  ACTIONS['chal-start'] = function (el) {
    var seed = window.JELAS_SEED.CHALLENGE_SEED.find(function (c) { return c.id === el.getAttribute('data-id'); });
    if (seed) S.startChallenge(seed);
    toast(t('toast.saved')); renderOverlay();
  };
  ACTIONS['chal-end'] = function (el) { S.endChallenge(el.getAttribute('data-id'), false); renderOverlay(); };
  ACTIONS['chal-done'] = function (el) {
    S.endChallenge(el.getAttribute('data-id'), true);
    toast(t('toast.check_done'));
    renderOverlay();
  };

  ACTIONS['lesson-read'] = function (el) { S.markLessonRead(el.getAttribute('data-id')); renderOverlay(); };

  ACTIONS['sec-toggle'] = function (el) {
    var k = el.getAttribute('data-key');
    S.setSetting(k, !cfg()[k]);
    if (k === 'privacyBlur') { applyTheme(); renderChrome(); }
    if (k === 'screenshotBlock' && hasAndroid()) {
      try { android().setSecure(cfg().screenshotBlock); } catch (e) {}
    }
    renderOverlay();
  };
  ACTIONS['sec-lock-now'] = function () { lockNow({ hard: true }); };
  ACTIONS['sec-change-pin'] = function () {
    openSheet('<h3>' + esc(t('sec.change_pin')) + '</h3>' +
      '<div class="field"><label>' + esc(t('sec.current_pin')) + '</label><input type="password" inputmode="numeric" maxlength="6" class="input" id="cp_old"></div>' +
      '<div class="field"><label>' + esc(t('sec.new_pin')) + '</label><input type="password" inputmode="numeric" maxlength="6" class="input" id="cp_new"></div>' +
      '<button class="btn full" data-act="sec-do-change-pin">' + esc(t('common.save')) + '</button>');
  };
  ACTIONS['sec-do-change-pin'] = function () {
    var oldPin = ($('cp_old').value || '').trim();
    var newPin = ($('cp_new').value || '').trim();
    if (!/^\d{6}$/.test(newPin)) { toast(t('onb.pin_short')); return; }
    var salt = window.JELAS_DB.prefs.get('salt', null);
    var verifier = window.JELAS_DB.prefs.get('verifier', null);
    var secret = deviceSecret();
    window.JELAS_CRYPTO.deriveKey(oldPin, salt, secret).then(function (oldKey) {
      return window.JELAS_CRYPTO.checkVerifier(oldKey, verifier).then(function (ok) {
        if (!ok) { toast(t('lock.wrong')); return; }
        var newSalt = window.JELAS_CRYPTO.newSalt();
        return window.JELAS_CRYPTO.deriveKey(newPin, newSalt, secret).then(function (newKey) {
          return window.JELAS_CRYPTO.makeVerifier(newKey).then(function (v) {
            window.JELAS_DB.prefs.set('salt', newSalt);
            window.JELAS_DB.prefs.set('verifier', v);
            KEY = newKey; S.setKey(newKey);
            return S.save(true).then(function () {
              closeSheet(); toast(t('sec.pin_changed'));
            });
          });
        });
      });
    }).catch(function (e) { toast(String(e.message || e)); });
  };

  ACTIONS['data-backup'] = function () {
    openSheet('<h3>' + esc(t('data.backup')) + '</h3>' +
      '<div class="small muted" style="margin-bottom:12px">' + esc(t('data.backup_d')) + '</div>' +
      '<div class="field"><label>' + esc(t('data.backup_pw')) + '</label><input type="password" class="input" id="bk_pw" placeholder="' + esc(t('data.backup_pw_ph')) + '"></div>' +
      '<button class="btn full" data-act="data-do-backup">' + esc(t('data.backup')) + '</button>');
  };
  ACTIONS['data-do-backup'] = function () {
    var pw = ($('bk_pw').value || '');
    if (pw.length < 6) { toast(t('data.backup_pw_short')); return; }
    var salt = window.JELAS_CRYPTO.newSalt();
    window.JELAS_CRYPTO.deriveKey(pw, salt).then(function (bkKey) {
      var payload = {
        app: 'JELAS', schemaVersion: S.get().schemaVersion, createdAt: Date.now(),
        data: S.get()
      };
      return window.JELAS_CRYPTO.encryptString(bkKey, JSON.stringify(payload));
    }).then(function (enc) {
      // salt is a KDF parameter, not a secret — it must sit outside the ciphertext
      var out = { format: 'jelas-backup-v1', kdf: 'PBKDF2-SHA256', iterations: window.JELAS_CRYPTO.ITERATIONS, cipher: 'AES-256-GCM', salt: salt, payload: enc };
      var name = 'jelas-backup-' + S.todayISO() + '.jelas';
      saveTextFile(name, 'application/json', JSON.stringify(out));
      S.get().meta.lastBackup = Date.now();
      S.save(true);
      closeSheet(); renderOverlay();
    }).catch(function (e) { toast('Backup failed: ' + (e.message || e)); });
  };
  ACTIONS['data-restore'] = function () {
    pickFile('.jelas,application/json', function (file) {
      if (file.size > 64 * 1024 * 1024) { toast(t('data.restore_fail')); return; }
      var fr = new FileReader();
      fr.onload = function () {
        if (fr.result == null) { toast(t('data.restore_fail')); return; }
      var txt = String(fr.result);
        if (txt.length > 64 * 1024 * 1024) { toast(t('data.restore_fail')); return; }
        var obj;
        try { obj = JSON.parse(txt); } catch (e) { toast(t('data.restore_fail')); return; }
        if (!obj || obj.format !== 'jelas-backup-v1' || !obj.payload) { toast(t('data.restore_fail')); return; }
        openSheet('<h3>' + esc(t('data.restore')) + '</h3>' +
          '<div class="field"><label>' + esc(t('data.backup_pw')) + '</label><input type="password" class="input" id="rs_pw"></div>' +
          '<button class="btn full" data-act="data-do-restore">' + esc(t('common.confirm')) + '</button>');
        window.__restoreObj = obj;
      };
      fr.readAsText(file);
    });
  };
  ACTIONS['data-do-restore'] = function () {
    var obj = window.__restoreObj;
    var pw = ($('rs_pw').value || '');
    if (!obj) return;
    var salt = obj.salt;
    if (!salt) { toast(t('data.restore_fail')); return; }
    window.JELAS_CRYPTO.deriveKey(pw, salt).then(function (bkKey) {
      return window.JELAS_CRYPTO.decryptString(bkKey, obj.payload);
    }).then(function (json) {
      var payload = JSON.parse(json);
      if (!payload || !payload.data) throw new Error('bad payload');
      // keep the CURRENT PIN key — the backup key is only for transport
      S.init(S.sanitizeState(payload.data), KEY);
      return S.save(true);
    }).then(function () {
      closeSheet(); closeAllOverlays();
      applyTheme();
      toast(t('data.restore_done'));
      render();
    }).catch(function () { toast(t('data.restore_fail')); });
  };
  ACTIONS['data-csv-out'] = function () {
    saveTextFile('jelas-export-' + S.todayISO() + '.csv', 'text/csv', S.toCSV());
  };
  ACTIONS['data-csv-in'] = function () {
    pickFile('.csv,text/csv,text/plain', function (file) {
      var fr = new FileReader();
      fr.onload = function () {
        var rows = S.parseCSV(String(fr.result));
        if (!rows.length) { toast(t('report.no_data')); return; }
        var accounts = S.get().accounts;
        var fallback = accounts.find(function (a) { return !a.archived; });
        function matchAcct(name) {
          if (!name) return null;
          var n = String(name).trim().toLowerCase();
          var hit = accounts.find(function (a) { return a.name.toLowerCase() === n; });
          return hit ? hit.id : null;
        }
        function matchCat(name) {
          if (!name) return null;
          var n = String(name).trim().toLowerCase();
          var hit = S.get().categories.find(function (c) { return c.name.toLowerCase() === n; });
          return hit ? hit.id : null;
        }
        rows.forEach(function (r) {
          S.addTransaction({
            type: r.type,
            amount: r.amount,
            date: r.date,
            accountId: matchAcct(r.accountName) || (fallback ? fallback.id : null),
            toAccountId: matchAcct(r.toAccountName),
            categoryId: matchCat(r.categoryName),
            note: r.note,
            tags: r.tags ? String(r.tags).split(/[|,]/).map(function (s) { return s.trim(); }).filter(Boolean) : []
          });
        });
        S.save(true);
        toast(t('data.csv_done', { n: rows.length }));
        closeOverlay(); render();
      };
      fr.readAsText(file);
    });
  };
  ACTIONS['data-clear-receipts'] = function () {
    if (!confirm(t('data.clear_receipts_warn'))) return;
    window.JELAS_DB.clearReceipts().then(function () {
      S.get().transactions.forEach(function (tx) { tx.receiptId = null; });
      return S.save(true);
    }).then(function () { toast(t('toast.deleted')); renderOverlay(); });
  };
  ACTIONS['data-wipe'] = function () {
    var token = t('data.wipe_token');
    var ans = prompt(t('data.wipe_warn') + '\n\n' + t('data.wipe_confirm', { token: token }));
    if (!ans || ans.trim().toUpperCase() !== token.toUpperCase()) return;
    window.JELAS_DB.wipe().then(function () {
      window.JELAS_DB.prefs.wipe();
      location.reload();
    });
  };
  ACTIONS['export-report'] = function () { exportReportImage(); };

  ACTIONS['rem-toggle'] = function (el) {
    var k = el.getAttribute('data-key');
    var r = S.get().reminders;
    r[k].on = !r[k].on;
    S.save();
    if (r[k].on && hasAndroid()) { try { android().requestNotifPermission(); } catch (e) {} }
    scheduleReminders();
    renderOverlay();
  };
  ACTIONS['set-lang'] = function (el) {
    var l = el.getAttribute('data-l');
    applyLang(l);
    window.JELAS_DB.prefs.set('lang', l);
    S.save(true);
    renderOverlay(); render();
    toast(window.I18N.langName(l));
  };
  ACTIONS['set-theme'] = function (el) { S.setSetting('theme', el.getAttribute('data-v')); applyTheme(); renderOverlay(); };
  ACTIONS['set-method'] = function (el) { S.setSetting('method', el.getAttribute('data-v')); renderOverlay(); };
  ACTIONS['set-toggle'] = function (el) {
    var k = el.getAttribute('data-key');
    S.setSetting(k, !cfg()[k]);
    applyTheme(); renderOverlay();
  };

  /* onboarding actions */
  ACTIONS['onb-next'] = function () {
    if (onbStep === 1) applyLang(onbLang);
    onbStep = Math.min(4, onbStep + 1);
    renderOnb();
  };
  ACTIONS['onb-lang'] = function (el) {
    onbLang = el.getAttribute('data-l');
    applyLang(onbLang);
    renderOnb();
  };
  ACTIONS['onb-method'] = function (el) { onbMethod = el.getAttribute('data-m'); renderOnb(); };
  ACTIONS['onb-key'] = function (el) { onbKey(el.getAttribute('data-key')); };
  ACTIONS['onb-finish'] = function () { finishOnboarding(); };

  /* lock actions */
  ACTIONS['lock-key'] = function (el) { lockKey(el.getAttribute('data-key')); };
  ACTIONS['lock-bio'] = function () {
    if (!hasAndroid()) { toast(t('lock.bio_fail')); return; }
    window.__jelasBioResult = function (ok) {
      if (ok && KEY) { unlockWith(KEY); }
      else { toast(t('lock.bio_fail')); }
    };
    try { android().biometricUnlock(); } catch (e) { toast(t('lock.bio_fail')); }
  };

  /* ================= global event wiring ================= */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    // special: select with data-act
    if (el.tagName === 'SELECT' && act === 'sec-autolock') return;
    var fn = ACTIONS[act];
    if (fn) {
      lastActivity = Date.now();
      if (!el.hasAttribute('disabled')) {
        rippleAt(el, e);
        fn(el, e);
      }
    }
  });

  /* switches are real controls: keyboard operable and announced correctly */
  document.addEventListener('keydown', function (e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    var el = e.target && e.target.closest ? e.target.closest('[role="switch"]') : null;
    if (!el) return;
    e.preventDefault();
    var act = el.getAttribute('data-act');
    if (act && ACTIONS[act]) ACTIONS[act](el);
    else el.click();
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-z')) {
      zakatInputs()[el.getAttribute('data-z')] = Number(el.value) || 0;
      var box = $('zakatResult');
      if (box) box.innerHTML = zakatResultHTML();
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-model')) {
      var k = el.getAttribute('data-model');
      if (addState) { addState[k] = el.value; }
      return;
    }
    if (el.hasAttribute && el.hasAttribute('data-rem')) {
      var k2 = el.getAttribute('data-rem');
      S.get().reminders[k2].time = el.value;
      S.save(); scheduleReminders();
      return;
    }
    if (el.hasAttribute && el.hasAttribute('data-rem-day')) {
      var k3 = el.getAttribute('data-rem-day');
      S.get().reminders[k3].day = Number(el.value);
      S.save(); scheduleReminders();
      return;
    }
    if (el.hasAttribute && el.hasAttribute('data-act') && el.getAttribute('data-act') === 'sec-autolock') {
      S.setSetting('autoLock', Number(el.value));
      return;
    }
  });

  // sheet scrim
  $('sheetScrim').addEventListener('click', closeSheet);

  // Android back button
  window.jelasGoBack = function () {
    if ($('sheetWrap').classList.contains('show')) { closeSheet(); return true; }
    if (overlayStack.length) { closeOverlay(); return true; }
    if (tab !== 'today') { setTab('today'); return true; }
    return false;
  };

  // auto-lock on background
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      lastActivity = Date.now();
    } else {
      var timeout = Number(cfg().autoLock) || 0;
      if (timeout > 0 && KEY && (Date.now() - lastActivity) > timeout * 1000) {
        lockNow();
      }
    }
  });
  document.addEventListener('touchstart', function () { lastActivity = Date.now(); }, { passive: true });
  document.addEventListener('keydown', function () { lastActivity = Date.now(); });

  // system theme change
  try {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (cfg().theme === 'auto') applyTheme();
      });
    }
  } catch (e) {}

  /* ================= boot ================= */
  function boot() {
    // Optional service worker — only for hosted/PWA use, never on file://
    try {
      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      }
    } catch (e) {}

    var lang = window.JELAS_DB.prefs.get('lang', 'en');
    window.I18N.setLang(lang);

    var onboarded = window.JELAS_DB.prefs.get('onboarded', false);
    var salt = window.JELAS_DB.prefs.get('salt', null);

    if (!onboarded || !salt) {
      onbLang = lang;
      applyTheme();
      showOnb();
      return;
    }
    // provisional state so chrome renders before unlock
    S.init(S.defaultState({ locale: lang }), null);
    applyTheme();
    renderChrome();
    showLock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* expose for tests */
  window.JELAS_APP = {
    setTab: setTab, render: render, openOverlay: openOverlay, closeOverlay: closeOverlay,
    openSheet: openSheet, closeSheet: closeSheet, toast: toast,
    state: function () { return S.get(); },
    unlockWith: unlockWith, lockNow: lockNow,
    addState: function () { return addState; },
    newAddState: newAddState,
    tab: function () { return tab; },
    hasAndroid: hasAndroid,
    buildReportCanvas: buildReportCanvas
  };
})();
