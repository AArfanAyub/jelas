/* JELAS — seed data & icon set
 * All icons are original simple line drawings authored for JELAS.
 * All categories, challenges and content are original. No third-party assets.
 */
(function () {
  'use strict';

  /* ---------- Icon set (original, hand-authored line icons, 24x24) ---------- */
  var I = {
    food: '<path d="M4 10h16a8 8 0 0 1-16 0z"/><path d="M9 6c0-1.5 1-2 1-3M13 6c0-1.5 1-2 1-3"/>',
    groceries: '<path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    transport: '<rect x="5" y="4" width="14" height="12" rx="2"/><path d="M5 11h14M8 19v2M16 19v2M8.5 8h.01M15.5 8h.01"/>',
    rent: '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
    utilities: '<path d="M13 3L5 13h5l-1 8 8-10h-5z"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10.5 18h3"/>',
    education: '<path d="M12 4L2.5 9 12 14l9.5-5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    health: '<path d="M12 20s-7-4.3-7-9.3A4 4 0 0 1 12 8a4 4 0 0 1 7 2.7C19 15.7 12 20 12 20z"/><path d="M12 11v4M10 13h4"/>',
    laundry: '<path d="M12 4s5 6 5 9.5A5 5 0 0 1 7 13.5C7 10 12 4 12 4z"/>',
    dining: '<path d="M7 3v8M7 11a2 2 0 0 0 0 0M9 3v6M5 3v6M7 11v10"/><path d="M16 3c-1.5 1-2 3-2 5s.5 3 2 3v10"/>',
    coffee: '<path d="M5 8h11v6a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><path d="M16 9h2a2 2 0 0 1 0 5h-2"/><path d="M5 21h12"/>',
    delivery: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    shopping: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    entertainment: '<circle cx="12" cy="12" r="8"/><path d="M10 9l5 3-5 3z"/>',
    games: '<rect x="4" y="6" width="16" height="12" rx="3"/><path d="M9 12h.01M12 9h.01M15 12h.01M12 15h.01"/>',
    travel: '<path d="M3 13l18-7-4 14-4-5z"/><path d="M13 15l-2 5"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18M12 9v11"/><path d="M12 9C10 5 6 5 6 7.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z"/>',
    repeat: '<path d="M4 9a6 6 0 0 1 6-6h6"/><path d="M14 1l2.5 2.5L14 6"/><path d="M20 15a6 6 0 0 1-6 6H8"/><path d="M10 23l-2.5-2.5L10 18"/>',
    beauty: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
    savings: '<path d="M5 11a7 7 0 0 1 7-7h1a7 7 0 0 1 7 7v3a3 3 0 0 1-3 3h-1v3h-3v-3H9v3H6v-3a3 3 0 0 1-1-3z"/><path d="M9 11h.01"/>',
    emergency: '<path d="M12 3l7 3v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    investment: '<path d="M4 19V5M4 19h16"/><path d="M7 15l3-4 3 2 4-6"/>',
    allowance: '<path d="M8 11V7a4 4 0 0 1 8 0v4"/><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M12 14v3"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    salary: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
    scholarship: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>',
    refund: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4h4"/>',
    other: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
    transfer: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>',
    calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="1"/>',
    debt: '<path d="M12 4v16M8 8h6a3 3 0 0 1 0 6H8"/><path d="M8 14h6"/>',
    zakat: '<path d="M12 3l3 5h5l-4 3.5 1.5 5.5L12 14l-5.5 3 1.5-5.5L4 8h5z"/>',
    checklist: '<path d="M4 7l2 2 3-3M4 15l2 2 3-3M12 8h8M12 16h8"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 17h4M12 13v4M9 20h6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h12"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    chart: '<path d="M5 19V9M10 19V5M15 19v-7M20 19v-11"/>',
    home: '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 5l4 4"/>',
    trash: '<path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    chevdown: '<path d="M6 9l6 6 6-6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
    camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 7l1.5-2h3L15 7"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path d="M20 14a8 8 0 1 1-10-10 6.5 6.5 0 0 0 10 10z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10V6z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    download: '<path d="M12 4v10M8 11l4 4 4-4M5 19h14"/>',
    upload: '<path d="M12 16V6M8 9l4-4 4 4M5 19h14"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>',
    eyeoff: '<path d="M4 4l16 16"/><path d="M9.5 9.6A2.5 2.5 0 0 0 12 14.5M6 6.5C3.7 8 2 12 2 12s3.5 6 10 6c2 0 3.7-.6 5-1.4M11 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.4 3.2"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',
    flame: '<path d="M12 3c1 3-1.5 4-1.5 6.5A2.5 2.5 0 0 0 13 12c1.5-1 1-2.5 1-2.5 2 2 3 3.8 3 5.5a5 5 0 0 1-10 0C7 10.5 10 8 12 3z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    flow: '<path d="M3 8h11a4 4 0 0 1 0 8H8"/><path d="M11 13l-3 3 3 3"/>',
    scan: '<path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3"/><path d="M4 12h16"/>',
    piggy: '<path d="M4 12a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4h-1l-1 2H9l-1-2a4 4 0 0 1-4-4z"/><path d="M8 12h.01M16 10l2-2"/>',
    key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15 12v2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<circle cx="9" cy="9" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 7a3 3 0 0 1 0 6M17 20a6 6 0 0 0-2-4.5"/>'
  };

  function icon(name) {
    return I[name] || I.other;
  }
  function iconNames() { return Object.keys(I); }

  function svg(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      icon(name) + '</svg>';
  }

  /* ---------- Categories ---------- */
  /* kind: need | want | save | income */
  var CATEGORY_SEED = [
    // Needs
    { id: 'c_food', name: 'Food', icon: 'food', color: '#B0603F', kind: 'need' },
    { id: 'c_groc', name: 'Groceries', icon: 'groceries', color: '#8A7A4A', kind: 'need' },
    { id: 'c_trans', name: 'Transport', icon: 'transport', color: '#4F6E7A', kind: 'need' },
    { id: 'c_rent', name: 'Rent', icon: 'rent', color: '#6B6152', kind: 'need' },
    { id: 'c_util', name: 'Utilities', icon: 'utilities', color: '#7A6B3F', kind: 'need' },
    { id: 'c_phone', name: 'Phone & Data', icon: 'phone', color: '#4F7A6B', kind: 'need' },
    { id: 'c_edu', name: 'Education', icon: 'education', color: '#5B6B8C', kind: 'need' },
    { id: 'c_health', name: 'Health', icon: 'health', color: '#A05B5B', kind: 'need' },
    { id: 'c_laundry', name: 'Laundry', icon: 'laundry', color: '#5B8CA0', kind: 'need' },
    // Wants
    { id: 'c_dine', name: 'Eating out', icon: 'dining', color: '#C07A4A', kind: 'want' },
    { id: 'c_coffee', name: 'Drinks & Coffee', icon: 'coffee', color: '#9A7B4F', kind: 'want' },
    { id: 'c_deliv', name: 'Delivery', icon: 'delivery', color: '#B0894A', kind: 'want' },
    { id: 'c_shop', name: 'Shopping', icon: 'shopping', color: '#A06B8A', kind: 'want' },
    { id: 'c_ent', name: 'Entertainment', icon: 'entertainment', color: '#8A6BA0', kind: 'want' },
    { id: 'c_games', name: 'Games', icon: 'games', color: '#6B7AA0', kind: 'want' },
    { id: 'c_travel', name: 'Travel', icon: 'travel', color: '#4F8A7A', kind: 'want' },
    { id: 'c_gift', name: 'Gifts', icon: 'gift', color: '#B06B7A', kind: 'want' },
    { id: 'c_sub', name: 'Subscriptions', icon: 'repeat', color: '#7A7A8A', kind: 'want' },
    { id: 'c_beauty', name: 'Personal care', icon: 'beauty', color: '#A07A9A', kind: 'want' },
    // Save
    { id: 'c_save', name: 'Savings', icon: 'savings', color: '#4F7A4A', kind: 'save' },
    { id: 'c_emerg', name: 'Emergency fund', icon: 'emergency', color: '#3F6B5A', kind: 'save' },
    { id: 'c_invest', name: 'Investment', icon: 'investment', color: '#5A7A4F', kind: 'save' },
    // Income
    { id: 'i_allow', name: 'Allowance', icon: 'allowance', color: '#4F7A4A', kind: 'income' },
    { id: 'i_ptptn', name: 'Student loan', icon: 'doc', color: '#4F7A4A', kind: 'income' },
    { id: 'i_salary', name: 'Salary', icon: 'salary', color: '#4F7A4A', kind: 'income' },
    { id: 'i_part', name: 'Part-time', icon: 'clock', color: '#4F7A4A', kind: 'income' },
    { id: 'i_gift', name: 'Gift received', icon: 'gift', color: '#4F7A4A', kind: 'income' },
    { id: 'i_scholar', name: 'Scholarship', icon: 'scholarship', color: '#4F7A4A', kind: 'income' },
    { id: 'i_refund', name: 'Refund', icon: 'refund', color: '#4F7A4A', kind: 'income' },
    { id: 'i_other', name: 'Other income', icon: 'other', color: '#4F7A4A', kind: 'income' }
  ];

  /* ---------- Account types ---------- */
  var ACCOUNT_TYPES = [
    { id: 'cash', icon: 'wallet', asset: true },
    { id: 'bank', icon: 'home', asset: true },
    { id: 'tng', icon: 'phone', asset: true },
    { id: 'grab', icon: 'transport', asset: true },
    { id: 'shopee', icon: 'shopping', asset: true },
    { id: 'boost', icon: 'utilities', asset: true },
    { id: 'debit', icon: 'wallet', asset: true },
    { id: 'credit', icon: 'debt', asset: false },
    { id: 'go', icon: 'investment', asset: true },
    { id: 'invest', icon: 'investment', asset: true },
    { id: 'loan', icon: 'debt', asset: false }
  ];

  /* ---------- Challenges ---------- */
  var CHALLENGE_SEED = [
    { id: 'ch_nospend', key: 'no_spend', icon: 'star', type: 'nospend', days: 7 },
    { id: 'ch_save52', key: 'save52', icon: 'savings', type: 'save', weeks: 52 },
    { id: 'ch_streak7', key: 'streak7', icon: 'flame', type: 'streak', days: 7 },
    { id: 'ch_streak30', key: 'streak30', icon: 'flame', type: 'streak', days: 30 }
  ];

  /* ---------- Badges ---------- */
  var BADGES = [
    { id: 'b_first', key: 'b_first', icon: 'check' },
    { id: 'b_streak7', key: 'b_streak7', icon: 'flame' },
    { id: 'b_streak30', key: 'b_streak30', icon: 'flame' },
    { id: 'b_goal', key: 'b_goal', icon: 'target' },
    { id: 'b_nospend', key: 'b_nospend', icon: 'star' },
    { id: 'b_budget', key: 'b_budget', icon: 'shield' }
  ];

  /* ---------- Checklists ---------- */
  var CHECKLIST_SEED = [
    {
      id: 'cl_month', key: 'monthly', period: 'month', icon: 'calendar', builtin: true,
      items: [
        { id: 'm1', key: 'm_paybills' }, { id: 'm2', key: 'm_subs' },
        { id: 'm3', key: 'm_savings' }, { id: 'm4', key: 'm_budget' },
        { id: 'm5', key: 'm_goals' }, { id: 'm6', key: 'm_backup' }
      ]
    },
    {
      id: 'cl_week', key: 'weekly', period: 'week', icon: 'calendar', builtin: true,
      items: [
        { id: 'w1', key: 'w_log' }, { id: 'w2', key: 'w_cash' },
        { id: 'w3', key: 'w_budget' }, { id: 'w4', key: 'w_plan' }
      ]
    },
    {
      id: 'cl_buy', key: 'purchase', period: 'once', icon: 'shield', builtin: true,
      items: [
        { id: 'p1', key: 'p_budget' }, { id: 'p2', key: 'p_need' },
        { id: 'p3', key: 'p_cool' }, { id: 'p4', key: 'p_alt' }, { id: 'p5', key: 'p_pay' }
      ]
    }
  ];

  /* ---------- Learn (titles + body live in i18n; this is order) ---------- */
  var LESSON_ORDER = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'];

  /* ---------- Student money guide (evergreen, generic, no brand claims) ---------- */
  var STUDENT_TIPS = [
    { icon: 'scholarship', t: 'Always ask for a student rate', b: 'Many services quietly offer student pricing — music, software, cloud storage, phone plans, cinemas and public transport. Ask before you pay full price.' },
    { icon: 'doc', t: 'Split your student loan by week', b: 'Divide the lump sum by the number of weeks in the semester. That weekly number is your real ceiling, not the big balance you see.' },
    { icon: 'coffee', t: 'Watch the small, frequent spends', b: 'A RM6 drink most days is about RM180 a month. Small amounts are easy to miss and add up faster than one big purchase.' },
    { icon: 'shield', t: 'Keep an emergency buffer', b: 'Even RM500 set aside stops a flat tyre or a clinic visit from turning into a loan from a friend.' },
    { icon: 'repeat', t: 'Audit subscriptions monthly', b: 'Free trials turn into charges. Check what renewed this month and cancel what you did not use.' },
    { icon: 'target', t: 'Give every ringgit a job', b: 'Money without a plan disappears. Assign it the moment it arrives — even if the plan is "save RM50".' }
  ];

  window.JELAS_SEED = {
    ICONS: I,
    icon: icon,
    iconNames: iconNames,
    svg: svg,
    CATEGORY_SEED: CATEGORY_SEED,
    ACCOUNT_TYPES: ACCOUNT_TYPES,
    CHALLENGE_SEED: CHALLENGE_SEED,
    BADGES: BADGES,
    CHECKLIST_SEED: CHECKLIST_SEED,
    LESSON_ORDER: LESSON_ORDER,
    STUDENT_TIPS: STUDENT_TIPS
  };
})();
