/* JELAS — i18n engine + dictionaries (EN / BM / ZH)
 * 100% original text. English is the default; missing keys fall back to English.
 * Written from scratch for JELAS — no third-party translation data.
 */
(function () {
  'use strict';

  var DICT = {
    en: {
      _name: 'English', _flag: 'EN',
      app: { name: 'JELAS', tagline: 'Money, made clear.' },

      nav: { today: 'Today', flow: 'Flow', add: 'Add', report: 'Report', me: 'Me' },

      common: {
        save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', done: 'Done',
        back: 'Back', next: 'Next', skip: 'Skip', close: 'Close', confirm: 'Confirm',
        yes: 'Yes', no: 'No', add: 'Add', all: 'All', none: 'None', search: 'Search',
        filter: 'Filter', clear: 'Clear', today: 'Today', week: 'Week', month: 'Month',
        year: 'Year', day: 'Day', days: 'days', total: 'Total', average: 'Average',
        amount: 'Amount', date: 'Date', note: 'Note', category: 'Category', account: 'Account',
        type: 'Type', name: 'Name', color: 'Colour', icon: 'Icon', optional: 'optional',
        required: 'Required', loading: 'Loading…', empty: 'Nothing here yet', undo: 'Undo',
        of: 'of', more: 'More', less: 'Less', on: 'On', off: 'Off', never: 'Never',
        yes_delete: 'Yes, delete', keep: 'Keep', reset: 'Reset', apply: 'Apply', ok: 'OK',
        export: 'Export', import: 'Import', share: 'Share', view: 'View', retry: 'Retry',
        delete_warn: 'Delete this? It cannot be undone.'
      },

      txn: {
        title: 'Transaction', edit: 'Edit transaction', updated: 'Transaction updated',
        split_hint: 'Split into parts'
      },

      ins: {
        top_cat: 'Your biggest category is {cat} — {pct}% of your spending.',
        more: 'You spent {pct}% more than last month.',
        less: 'You spent {pct}% less than last month.',
        savings: 'Savings rate this month: {pct}%.',
        small: '{n} small spends (≤RM15) added up to {amt} this month.'
      },

      limit: {
        title: 'Monthly limit',
        set: 'Set monthly limit',
        set_cta: 'Set a monthly limit',
        sub: 'Cap what you spend this month. We do the daily maths for you.',
        not_set: 'No limit yet — set one to see how much you can spend each day.',
        left: 'left this month',
        of: 'of',
        per_day: 'Safe to spend per day',
        days_left: '{n} days left',
        used: 'used',
        alert_warn: 'Heads up — you have used 80% of your monthly limit.',
        alert_over: 'You have reached your monthly limit for this month.',
        remove: 'Remove limit',
        amount_ph: 'e.g. 800',
        need_amount: 'Enter a limit above zero.',
        saved: 'Monthly limit set',
        removed: 'Limit removed',
        on_track: 'On track',
        warning: 'Getting close',
        exceeded: 'Over limit'
      },

      score: {
        title: 'Money score',
        strong: 'Strong', steady: 'Steady', watch: 'Watch it', tight: 'Tight',
        sub: 'Based on your savings rate, budget use and logging habit.'
      },

      bill: {
        title: 'Bills & subscriptions',
        add: 'Add a bill',
        edit: 'Edit bill',
        sub: 'Track what leaves your account on a schedule — and never miss a due date.',
        name: 'Bill name',
        name_ph: 'e.g. Phone plan, Streaming, Rent',
        amount: 'Amount',
        due_day: 'Due day of month',
        frequency: 'Repeats',
        freq_monthly: 'Monthly',
        freq_weekly: 'Weekly',
        freq_yearly: 'Yearly',
        next_7: 'Next 7 days',
        due_today: 'Due today',
        due_tomorrow: 'Due tomorrow',
        due_in: 'Due in {n} days',
        paid_this_month: 'Paid this month',
        mark_paid: 'Mark as paid',
        paid_toast: 'Bill paid and logged',
        monthly_total: 'Monthly commitment',
        yearly_total: 'Per year',
        reserved: 'Reserved for bills',
        no_bills: 'No bills yet. Add your subscriptions and never miss a due date.',
        need_name: 'Give the bill a name.',
        need_amount: 'Enter an amount.',
        delete_warn: 'Delete this bill? Past transactions stay.'
      },

      ask: {
        title: 'Ask JELAS',
        placeholder: 'Ask: food this month, coffee last week…',
        hint: 'Try “food this month”, “coffee last week”, “how much did I earn”, “biggest expense”.',
        total: '{amt} on {what} — {range}',
        spent: 'spending',
        income: 'income',
        net: 'net',
        things: 'everything',
        count: '{n} transactions — {range}',
        average: 'Average {amt} — {range}',
        biggest: 'Biggest was {amt} on {what} — {range}',
        no_match: 'Nothing found for that. Try a category or a time range.',
        ex1: 'food this month', ex2: 'coffee this week', ex3: 'biggest expense', ex4: 'how much did I earn',
        empty: 'Ask a question about your money. Everything is answered on this phone.'
      },

      tpl: {
        title: 'Quick templates',
        sub: 'Your most repeated entries — one tap to log again.',
        uses: 'used {n}×'
      },

      nw: {
        title: 'Net worth trend',
        not_enough: 'Keep using JELAS and your net-worth history builds up here.'
      },

      cal: {
        title: 'Spending calendar',
        tap_day: 'Tap a day to filter'
      },

      onb: {
        welcome_title: 'Money, made clear.',
        welcome_sub: 'JELAS is a private, offline money tracker for students. No account. No cloud. No ads.',
        welcome_cta: 'Get started',
        lang_title: 'Choose your language',
        lang_sub: 'You can change this anytime in Me → Language.',
        method_title: 'How do you want to budget?',
        method_sub: 'Pick one to start — you can switch anytime.',
        m5020: '50 / 30 / 20',
        m5020_d: 'Half on needs, 30% on wants, 20% saved.',
        mzero: 'Zero-based',
        mzero_d: 'Give every ringgit a job. Budget left over must be RM0.',
        menvelope: 'Envelopes',
        menvelope_d: 'One envelope per category. Empty means stop.',
        mpyf: 'Pay yourself first',
        mpyf_d: 'Save first, then budget what is left.',
        pin_title: 'Lock your money',
        pin_sub: 'Set a 6-digit PIN. It encrypts everything on this phone — we never see it.',
        pin_enter: 'Enter a 6-digit PIN',
        pin_confirm: 'Enter it again',
        pin_mismatch: 'PINs do not match. Try again.',
        pin_short: 'PIN must be 6 digits.',
        ready_title: 'You are set',
        ready_sub: 'Everything stays on this phone, encrypted. Let’s log your first ringgit.',
        ready_cta: 'Open JELAS'
      },

      lock: {
        title: 'JELAS is locked',
        sub: 'Enter your PIN to continue',
        wrong: 'Wrong PIN. Try again.',
        locked_for: 'Locked for',
        ds_missing: 'This data is locked to this phone. Restore from a backup instead.',
        use_bio: 'Unlock with device lock',
        bio_fail: 'Device unlock cancelled',
        attempts: 'Wrong attempts'
      },

      today: {
        greeting: 'Hello',
        safe: 'Safe to spend today',
        safe_hint: 'Based on what is left this month',
        spent_today: 'Spent today',
        this_week: 'This week',
        money_in: 'Money in',
        money_out: 'Money out',
        streak: 'Logging streak',
        quick_add: 'Quick add',
        reminder_on: 'Daily reminder is on',
        reminder_off: 'Turn on your daily reminder',
        insight: 'Insight',
        no_spend: 'No spend logged today',
        budget_left: 'Budget left',
        days_left: 'days left',
        overspent: 'Over budget this month',
        on_track: 'You are on track this month'
      },

      flow: {
        title: 'Flow',
        in: 'In', out: 'Out', net: 'Net',
        all_tx: 'All transactions',
        search_ph: 'Search notes, categories…',
        no_results: 'No transactions match.',
        empty_hint: 'Tap + to log your first transaction.',
        heatmap: 'Spending calendar',
        running: 'Running balance',
        this_month: 'This month',
        grouped_none: 'No activity'
      },

      add: {
        title: 'Add',
        expense: 'Expense', income: 'Income', transfer: 'Transfer',
        amount: 'Amount', from: 'From', to: 'To', pick_category: 'Pick a category',
        pick_account: 'Pick an account', note_ph: 'What was it for? (optional)',
        receipt: 'Receipt', add_receipt: 'Attach a receipt',
        save_tx: 'Save', saved: 'Saved', tag: 'Tag', tags_ph: 'e.g. trip, exam',
        repeat_last: 'Repeat last', split: 'Split', date_today: 'Today',
        need_category: 'Please pick a category.', need_amount: 'Please enter an amount.',
        need_account: 'Please pick an account.', transfer_same: 'From and To must differ.',
        suggested: 'Suggested: {cat}'
      },

      report: {
        title: 'Report',
        week: 'Week', month: 'Month',
        in: 'Money in', out: 'Money out', net: 'Net',
        top_cats: 'Top categories',
        vs_last: 'vs last',
        biggest_change: 'Biggest change',
        savings_rate: 'Savings rate',
        budget_adherence: 'Budget used',
        flow_title: 'Where your money moved',
        flow_sources: 'Sources', flow_accounts: 'Accounts', flow_uses: 'Used for',
        net_worth: 'Net worth',
        insights: 'Insights',
        export_img: 'Save report as image',
        subscriptions: 'Subscriptions this month',
        no_data: 'Not enough data yet. Log a few transactions to see your report.',
        pace: 'Spending pace',
        this_month: 'This month',
        last_month: 'Last month',
        daily_avg: 'Daily average',
        biggest: 'Biggest expense',
        days_logged: 'Days logged',
        top_merchants: 'Top merchants',
        no_merchants: 'No notes to group yet',
        vs_last_short: 'vs last',
        spent_so_far: 'spent so far'
      },

      me: {
        title: 'Me',
        accounts: 'Accounts', categories: 'Categories', budgets: 'Budgets',
        limit: 'Monthly limit', bills: 'Bills & subscriptions',
        goals: 'Goals', debts: 'Debts', zakat: 'Zakat', checklists: 'Checklists',
        challenges: 'Challenges', learn: 'Learn', security: 'Security',
        data: 'Data & backup', reminders: 'Reminders', settings: 'Settings',
        language: 'Language', theme: 'Theme', about: 'About JELAS',
        privacy_blur: 'Privacy blur',
        net_worth: 'Net worth', assets: 'Assets', liabilities: 'Liabilities',
        tab_manage: 'Manage', tab_tools: 'Tools', tab_app: 'App'
      },

      acct: {
        title: 'Accounts',
        add: 'Add account',
        type_cash: 'Cash', type_bank: 'Bank', type_tng: 'E-wallet', type_grab: 'Ride & delivery',
        type_shopee: 'Shopping wallet', type_boost: 'Prepaid wallet', type_debit: 'Debit card',
        type_credit: 'Credit card', type_go: 'Savings e-wallet', type_invest: 'Investment', type_loan: 'Loan',
        opening: 'Opening balance', balance: 'Balance', limit: 'Credit limit',
        due_day: 'Due day', statement_day: 'Statement day', utilisation: 'Utilisation',
        archived: 'Archived', archive: 'Archive', unarchive: 'Unarchive',
        name_ph: 'e.g. Cash, Bank, E-wallet', count: 'accounts', total_balance: 'Total balance',
        need_name: 'Please name the account.', delete_warn: 'Delete this account and all its transactions?'
      },

      cat: {
        title: 'Categories',
        add: 'Add category',
        kind_need: 'Need', kind_want: 'Want', kind_save: 'Save', kind_income: 'Income',
        parent: 'Under', none_parent: 'Top level',
        need_name: 'Please name the category.', delete_warn: 'Delete this category? Transactions will become uncategorised.'
      },

      bud: {
        title: 'Budgets',
        add: 'Set budget', per_month: 'per month', per_week: 'per week',
        set_for: 'Budget for', amount_ph: 'RM',
        left: 'left', spent: 'spent', rollover: 'Roll over unused',
        method: 'Method', total_budgeted: 'Total budgeted',
        to_be_budgeted: 'To be budgeted', all_assigned: 'Every ringgit has a job',
        unassigned: 'still unassigned', need_amount: 'Enter an amount.',
        no_budgets: 'No budgets yet. Set one to unlock safe-to-spend.'
      },

      goal: {
        title: 'Goals',
        add: 'New goal', target: 'Target', saved: 'Saved', deadline: 'Deadline',
        progress: 'Progress', contribute: 'Add money', withdraw: 'Withdraw',
        name_ph: 'e.g. Laptop, Trip home', need_name: 'Name your goal.',
        need_target: 'Set a target amount.', complete: 'Goal reached!',
        per_month_needed: 'Save {amt}/month to finish on time',
        no_deadline: 'No deadline',
        emergency: 'Emergency fund', emergency_hint: 'Aim for 3 months of expenses',
        months_covered: 'months covered',
        wishlist: 'Wishlist', add_wish: 'Add a wish', affordable: 'You can afford this',
        not_affordable: 'Not yet — keep saving', cool_down: 'Cool-down timer',
        cool_start: 'Start 24h cool-down', cool_active: 'Cool-down running',
        cool_done: 'Cool-down finished — decide now', no_goals: 'No goals yet.'
      },

      debt: {
        title: 'Debts',
        add: 'Add debt', name_ph: 'e.g. Student loan, Credit card', principal: 'Original amount',
        balance: 'Balance', rate: 'Interest % p.a.', min_pay: 'Minimum payment',
        due_day: 'Due day', payoff: 'Payoff projection', months: 'months to clear',
        monthly: 'Monthly', total_interest: 'Interest paid',
        paid: 'Paid off', add_payment: 'Log a payment', no_debts: 'No debts. Nice.',
        need_name: 'Name the debt.', need_balance: 'Enter the balance.'
      },

      zakat: {
        title: 'Zakat',
        sub: 'Zakat on savings (2.5%) — Malaysia',
        cash: 'Cash & bank', gold: 'Gold value', silver: 'Silver value',
        investments: 'Investments', receivables: 'Money owed to you',
        liabilities: 'Debts you owe', net: 'Zakat-able wealth',
        nisab: 'Nisab (85g gold)', gold_price: 'Gold price per gram (RM)',
        due: 'Zakat due', not_due: 'Below nisab — no zakat due',
        rate_note: 'Rate: 2.5% of zakat-able wealth held for a full year.',
        note: 'Estimate only. Please confirm with your state zakat authority.'
      },

      chk: {
        title: 'Checklists',
        monthly: 'Monthly finance checklist', weekly: 'Weekly review',
        purchase: 'Can I afford this?', custom: 'My checklists',
        progress: 'done', reset_note: 'Resets every period', add_item: 'Add an item',
        add_list: 'New checklist', list_name: 'Checklist name',
        period_week: 'Weekly', period_month: 'Monthly', period_once: 'One-off',
        m_paybills: 'Pay all bills due', m_subs: 'Review subscriptions',
        m_savings: 'Top up savings / goals', m_budget: 'Check budget vs spending',
        m_goals: 'Check goal progress', m_backup: 'Back up my data',
        w_log: 'Log every spend from this week', w_cash: 'Reconcile cash on hand',
        w_budget: 'Review this week’s budget', w_plan: 'Plan next week',
        p_budget: 'Is there budget left in this category?',
        p_need: 'Do I need it, or just want it?',
        p_cool: 'Has the 24h cool-down passed?',
        p_alt: 'Is there a cheaper alternative?',
        p_pay: 'Will this hurt next week’s bills?'
      },

      chal: {
        title: 'Challenges',
        active: 'Active', done: 'Completed',
        no_spend: 'No-spend week', no_spend_d: 'Spend nothing on wants for 7 days',
        save52: '52-week savings', save52_d: 'Save a little more each week',
        streak7: '7-day logging', streak7_d: 'Log something 7 days in a row',
        streak30: '30-day logging', streak30_d: 'Log something 30 days in a row',
        start: 'Start', give_up: 'Give up', completed_on: 'Completed',
        mark_done: 'Mark as done', days_done: '{n} days in', days_left: '{n} days left',
        badges: 'Badges', no_badges: 'No badges yet',
        b_first: 'First step', b_first_d: 'Logged your first transaction',
        b_streak7: 'Consistent', b_streak7_d: '7-day logging streak',
        b_streak30: 'Unstoppable', b_streak30_d: '30-day logging streak',
        b_goal: 'Goal getter', b_goal_d: 'Reached a savings goal',
        b_nospend: 'Iron will', b_nospend_d: 'Finished a no-spend week',
        b_budget: 'Budget boss', b_budget_d: 'Stayed within budget a full month'
      },

      learn: {
        title: 'Learn',
        sub: 'Two-minute reads. No jargon.',
        read: 'Read', read_done: 'Read', progress: 'lessons read',
        l1_t: 'Where your money goes', l1_b: 'Most students lose money in small, frequent spends — drinks, delivery, top-ups. Track one week honestly and the pattern shows up fast. Awareness alone usually cuts spending by 10–15%.',
        l2_t: 'The 50/30/20 rule', l2_b: 'Split income: 50% needs (food, transport, rent), 30% wants (fun, shopping), 20% savings. It is a starting point, not a law — adjust to your income.',
        l3_t: 'Build an emergency fund', l3_b: 'Aim for three months of expenses. Start with RM500. Keep it in a separate account you do not touch. This is what stops a small problem becoming a loan.',
        l4_t: 'Understand your student loan', l4_b: 'A student loan usually arrives as a lump sum for a whole semester. Divide it by the weeks in the semester to get a weekly ceiling. If you spend it faster, you will be broke before the semester ends.',
        l5_t: 'Debt: good vs bad', l5_b: 'Debt that buys an asset (education, tools) can pay off. Debt for consumption (phones, clothes) usually does not. Pay the highest interest first.',
        l6_t: 'Avoid scams', l6_b: 'No legitimate investment guarantees returns. Never share your TAC/OTP. Check an entity on the BNM and SC lists before investing. If it is rushed and secret, it is a scam.',
        l7_t: 'Zakat basics', l7_b: 'If your savings stay above the nisab for a full year, zakat is 2.5%. The nisab follows the value of 85g of gold. Confirm with your state zakat body.',
        l8_t: 'Subscriptions add up', l8_b: 'RM15 here, RM20 there feels small, but five subscriptions is RM100 a month — RM1,200 a year. Audit them every few months and cancel what you do not use.'
      },

      sec: {
        title: 'Security',
        sub: 'Exactly what JELAS can and cannot do.',
        lock: 'App lock', lock_on: 'PIN lock is on',
        bio: 'Device lock unlock', bio_d: 'Use your phone’s lock to reopen JELAS after it auto-locks. Your PIN is still needed on a fresh start.',
        autolock: 'Auto-lock', autolock_d: 'Lock when you leave the app',
        blur: 'Privacy blur', blur_d: 'Hide all amounts behind dots',
        screenshot: 'Block screenshots', screenshot_d: 'Prevent screen capture of the app',
        change_pin: 'Change PIN', current_pin: 'Current PIN', new_pin: 'New PIN',
        pin_changed: 'PIN changed',
        no_internet: 'No internet permission',
        no_internet_d: 'The app has no INTERNET permission. It physically cannot send your data anywhere.',
        encrypted: 'Encrypted on this phone',
        encrypted_d: 'Your data and receipts are encrypted with AES-256-GCM. The key is derived from your PIN (PBKDF2, 600,000 rounds) and never leaves this device.',
        ds_title: 'Hardware-bound encryption',
        ds_d: 'Your PIN is mixed with a secret held in this phone’s secure hardware. Copying the app’s files to another device will not let anyone crack them offline.',
        ds_off: 'Browser build: not hardware-bound. Use the Android app for the strongest protection.',
        no_track: 'No trackers, no ads',
        no_track_d: 'No analytics, no ads, no accounts, no crash reporting.',
        can: 'JELAS can', cannot: 'JELAS cannot',
        can1: 'Store your transactions, receipts and goals on this phone',
        can2: 'Lock itself with your PIN and your device lock',
        can3: 'Read a CSV file you choose to import',
        can4: 'Show a daily reminder notification you set',
        cannot1: 'Connect to the internet (no permission)',
        cannot2: 'See your bank balance or move money',
        cannot3: 'Send anything to any server',
        cannot4: 'Read your contacts, location, photos or messages',
        open_settings: 'Open system settings', verify: 'Verify integrity',
        lock_now: 'Lock now'
      },

      data: {
        title: 'Data & backup',
        backup: 'Back up (encrypted .jelas)',
        backup_d: 'A password-protected file. Keep it safe — without the password it cannot be opened.',
        restore: 'Restore from backup',
        csv_out: 'Export CSV', csv_out_d: 'A plain spreadsheet of your transactions.',
        csv_in: 'Import CSV', csv_in_d: 'Bring in a bank statement you exported.',
        wipe: 'Erase all data', wipe_d: 'Deletes everything on this phone. Cannot be undone.',
        wipe_warn: 'This deletes all your data permanently. Are you sure?',
        wipe_confirm: 'Type {token} to confirm',
        wipe_token: 'ERASE',
        backup_pw: 'Backup password', backup_pw_ph: 'At least 6 characters',
        backup_pw_short: 'Password must be at least 6 characters.',
        backup_done: 'Backup created', restore_done: 'Data restored',
        restore_fail: 'Could not open this file. Wrong password or damaged.',
        csv_done: 'Imported {n} transactions',
        storage: 'Storage used', receipts: 'Receipts', clear_receipts: 'Delete all receipts',
        clear_receipts_warn: 'Delete every stored receipt image? Transactions stay.',
        last_backup: 'Last backup'
      },

      rem: {
        title: 'Reminders',
        daily: 'Daily log reminder', daily_d: 'A gentle nudge to log your spending',
        weekly: 'Weekly review', weekly_d: 'Review your week',
        monthly: 'Monthly check-in', monthly_d: 'Start the month with a clean slate',
        time: 'Time', day: 'Day', notify_perm: 'Allow notifications so reminders can appear.',
        granted: 'Reminders scheduled', denied: 'Notifications are blocked in system settings.',
        notif_note: 'Reminders are created by the phone itself. No internet is used.'
      },

      set: {
        title: 'Settings',
        currency: 'Currency', language: 'Language', theme: 'Theme',
        theme_light: 'Light', theme_dark: 'Dark', theme_auto: 'Follow system',
        reduce_motion: 'Reduce motion', haptics: 'Haptic feedback',
        num_format: 'Number format', about: 'About',
        version: 'Version', made: 'Made for students in Malaysia.',
        license: 'This app and all its content are original work. No third-party code, fonts, images or data are bundled.',
        receipt_scan: 'Receipt scanning (OCR)', receipt_scan_d: 'Read the amount from a receipt photo. Off by default.'
      },

      receipt: {
        title: 'Receipt', attach: 'Attach', retake: 'Retake', remove: 'Remove',
        stored: 'Receipt saved', compressing: 'Compressing…',
        compress_fail: 'Could not process the image. Keeping the original.',
        viewer_hint: 'Pinch to zoom', none: 'No receipt attached',
        size: 'Size', saved_note: 'Compressed and encrypted on this phone.',
        ocr_todo: 'Reading the amount…', ocr_found: 'Found amount', ocr_none: 'Could not read an amount — type it in.',
        ocr_off: 'Receipt scanning is off. Turn it on in Settings.'
      },

      toast: {
        saved: 'Saved', deleted: 'Deleted', updated: 'Updated', copied: 'Copied',
        locked: 'Locked', unlocked: 'Unlocked', goal_added: 'Added to goal',
        pin_set: 'PIN set', exported: 'Exported', imported: 'Imported',
        nothing_undo: 'Nothing to undo', undone: 'Undone', archived: 'Archived',
        restored: 'Restored', check_done: 'Nice — one less thing'
      },

      mood: {
        q: 'How do you feel about money today?',
        great: 'Great', ok: 'Okay', worried: 'Worried', stressed: 'Stressed'
      }
    },

    ms: {
      _name: 'Bahasa Melayu', _flag: 'BM',
      app: { name: 'JELAS', tagline: 'Duit, jadi jelas.' },

      nav: { today: 'Hari Ini', flow: 'Aliran', add: 'Tambah', report: 'Laporan', me: 'Saya' },

      common: {
        save: 'Simpan', cancel: 'Batal', delete: 'Padam', edit: 'Ubah', done: 'Selesai',
        back: 'Kembali', next: 'Seterusnya', skip: 'Langkau', close: 'Tutup', confirm: 'Sahkan',
        yes: 'Ya', no: 'Tidak', add: 'Tambah', all: 'Semua', none: 'Tiada', search: 'Cari',
        filter: 'Tapis', clear: 'Kosongkan', today: 'Hari ini', week: 'Minggu', month: 'Bulan',
        year: 'Tahun', day: 'Hari', days: 'hari', total: 'Jumlah', average: 'Purata',
        amount: 'Jumlah', date: 'Tarikh', note: 'Nota', category: 'Kategori', account: 'Akaun',
        type: 'Jenis', name: 'Nama', color: 'Warna', icon: 'Ikon', optional: 'pilihan',
        required: 'Wajib', loading: 'Memuatkan…', empty: 'Belum ada apa-apa', undo: 'Undur',
        of: 'daripada', more: 'Lagi', less: 'Kurang', on: 'Hidup', off: 'Mati', never: 'Tidak pernah',
        yes_delete: 'Ya, padam', keep: 'Simpan', reset: 'Set semula', apply: 'Guna', ok: 'OK',
        export: 'Eksport', import: 'Import', share: 'Kongsi', view: 'Lihat', retry: 'Cuba lagi',
        delete_warn: 'Padam ini? Tidak boleh diundur.'
      },

      txn: {
        title: 'Transaksi', edit: 'Ubah transaksi', updated: 'Transaksi dikemas kini',
        split_hint: 'Bahagi kepada beberapa bahagian'
      },

      ins: {
        top_cat: 'Kategori terbesar anda ialah {cat} — {pct}% daripada belanja anda.',
        more: 'Anda belanja {pct}% lebih banyak daripada bulan lepas.',
        less: 'Anda belanja {pct}% lebih sedikit daripada bulan lepas.',
        savings: 'Kadar simpanan bulan ini: {pct}%.',
        small: '{n} belanja kecil (≤RM15) berjumlah {amt} bulan ini.'
      },

      limit: {
        title: 'Had bulanan',
        set: 'Tetapkan had bulanan',
        set_cta: 'Tetapkan had bulanan',
        sub: 'Hadkan belanja anda bulan ini. Kami kira jumlah harian untuk anda.',
        not_set: 'Belum ada had — tetapkan satu untuk lihat berapa boleh dibelanjakan setiap hari.',
        left: 'baki bulan ini',
        of: 'daripada',
        per_day: 'Selamat dibelanjakan sehari',
        days_left: '{n} hari lagi',
        used: 'digunakan',
        alert_warn: 'Perhatian — anda telah guna 80% daripada had bulanan.',
        alert_over: 'Anda telah mencapai had bulanan anda.',
        remove: 'Buang had',
        amount_ph: 'cth. 800',
        need_amount: 'Masukkan had melebihi sifar.',
        saved: 'Had bulanan ditetapkan',
        removed: 'Had dibuang',
        on_track: 'Terkawal',
        warning: 'Hampir had',
        exceeded: 'Melebihi had'
      },

      score: {
        title: 'Skor wang',
        strong: 'Kukuh', steady: 'Stabil', watch: 'Perhati', tight: 'Ketat',
        sub: 'Berdasarkan kadar simpanan, penggunaan bajet dan tabiat catatan anda.'
      },

      bill: {
        title: 'Bil & langganan',
        add: 'Tambah bil',
        edit: 'Ubah bil',
        sub: 'Jejak apa yang keluar dari akaun anda mengikut jadual — jangan terlepas tarikh akhir.',
        name: 'Nama bil',
        name_ph: 'cth. Pelan telefon, Penstriman, Sewa',
        amount: 'Jumlah',
        due_day: 'Hari akhir bulan',
        frequency: 'Berulang',
        freq_monthly: 'Bulanan',
        freq_weekly: 'Mingguan',
        freq_yearly: 'Tahunan',
        next_7: '7 hari akan datang',
        due_today: 'Perlu bayar hari ini',
        due_tomorrow: 'Perlu bayar esok',
        due_in: '{n} hari lagi',
        paid_this_month: 'Sudah dibayar bulan ini',
        mark_paid: 'Tanda sudah bayar',
        paid_toast: 'Bil dibayar dan dicatat',
        monthly_total: 'Komitmen bulanan',
        yearly_total: 'Setahun',
        reserved: 'Disediakan untuk bil',
        no_bills: 'Belum ada bil. Tambah langganan anda dan jangan terlepas tarikh akhir.',
        need_name: 'Beri nama pada bil ini.',
        need_amount: 'Masukkan jumlah.',
        delete_warn: 'Padam bil ini? Transaksi lepas kekal.'
      },

      ask: {
        title: 'Tanya JELAS',
        placeholder: 'Tanya: makanan bulan ini, kopi minggu lepas…',
        hint: 'Cuba “makanan bulan ini”, “kopi minggu lepas”, “berapa pendapatan saya”, “belanja terbesar”.',
        total: '{amt} untuk {what} — {range}',
        spent: 'belanja',
        income: 'pendapatan',
        net: 'bersih',
        things: 'semuanya',
        count: '{n} transaksi — {range}',
        average: 'Purata {amt} — {range}',
        biggest: 'Terbesar {amt} untuk {what} — {range}',
        no_match: 'Tiada hasil. Cuba nama kategori atau tempoh masa.',
        ex1: 'makanan bulan ini', ex2: 'kopi minggu ini', ex3: 'belanja terbesar', ex4: 'berapa pendapatan saya',
        empty: 'Tanya soalan tentang wang anda. Semuanya dijawab dalam telefon ini.'
      },

      tpl: {
        title: 'Templat pantas',
        sub: 'Catatan yang paling kerap diulang — satu ketikan untuk catat semula.',
        uses: 'diguna {n}×'
      },

      nw: {
        title: 'Trend nilai bersih',
        not_enough: 'Teruskan guna JELAS dan sejarah nilai bersih anda akan terbina di sini.'
      },

      cal: {
        title: 'Kalendar belanja',
        tap_day: 'Tekan hari untuk tapis'
      },

      onb: {
        welcome_title: 'Duit, jadi jelas.',
        welcome_sub: 'JELAS ialah penjejak wang peribadi yang berfungsi luar talian untuk pelajar. Tiada akaun. Tiada awan. Tiada iklan.',
        welcome_cta: 'Mula sekarang',
        lang_title: 'Pilih bahasa anda',
        lang_sub: 'Anda boleh tukar bila-bila masa di Saya → Bahasa.',
        method_title: 'Bagaimana anda mahu bajet?',
        method_sub: 'Pilih satu untuk mula — boleh tukar bila-bila masa.',
        m5020: '50 / 30 / 20',
        m5020_d: 'Separuh untuk keperluan, 30% untuk kehendak, 20% disimpan.',
        mzero: 'Berbaki sifar',
        mzero_d: 'Beri setiap ringgit satu tugas. Baki bajet mesti RM0.',
        menvelope: 'Sampul',
        menvelope_d: 'Satu sampul setiap kategori. Kosong bermakna berhenti.',
        mpyf: 'Bayar diri dahulu',
        mpyf_d: 'Simpan dahulu, kemudian bajet yang tinggal.',
        pin_title: 'Kunci wang anda',
        pin_sub: 'Tetapkan PIN 6 digit. Ia menyulitkan semua data dalam telefon ini — kami tidak pernah melihatnya.',
        pin_enter: 'Masukkan PIN 6 digit',
        pin_confirm: 'Masukkan semula',
        pin_mismatch: 'PIN tidak sepadan. Cuba lagi.',
        pin_short: 'PIN mesti 6 digit.',
        ready_title: 'Semuanya sedia',
        ready_sub: 'Semua data kekal dalam telefon ini, disulitkan. Jom catat ringgit pertama anda.',
        ready_cta: 'Buka JELAS'
      },

      lock: {
        title: 'JELAS dikunci',
        sub: 'Masukkan PIN anda untuk teruskan',
        wrong: 'PIN salah. Cuba lagi.',
        locked_for: 'Dikunci selama',
        ds_missing: 'Data ini terikat pada telefon ini. Pulihkan daripada sandaran.',
        use_bio: 'Buka dengan kunci peranti',
        bio_fail: 'Bukaan peranti dibatalkan',
        attempts: 'Percubaan salah'
      },

      today: {
        greeting: 'Hai',
        safe: 'Selamat dibelanjakan hari ini',
        safe_hint: 'Berdasarkan baki bulan ini',
        spent_today: 'Dibelanja hari ini',
        this_week: 'Minggu ini',
        money_in: 'Wang masuk',
        money_out: 'Wang keluar',
        streak: 'Rentetan catatan',
        quick_add: 'Tambah pantas',
        reminder_on: 'Peringatan harian hidup',
        reminder_off: 'Hidupkan peringatan harian',
        insight: 'Pandangan',
        no_spend: 'Tiada belanja dicatat hari ini',
        budget_left: 'Baki bajet',
        days_left: 'hari lagi',
        overspent: 'Melebihi bajet bulan ini',
        on_track: 'Bajet anda terkawal bulan ini'
      },

      flow: {
        title: 'Aliran',
        in: 'Masuk', out: 'Keluar', net: 'Bersih',
        all_tx: 'Semua transaksi',
        search_ph: 'Cari nota, kategori…',
        no_results: 'Tiada transaksi sepadan.',
        empty_hint: 'Tekan + untuk catat transaksi pertama anda.',
        heatmap: 'Kalendar belanja',
        running: 'Baki berjalan',
        this_month: 'Bulan ini',
        grouped_none: 'Tiada aktiviti'
      },

      add: {
        title: 'Tambah',
        expense: 'Belanja', income: 'Pendapatan', transfer: 'Pindahan',
        amount: 'Jumlah', from: 'Dari', to: 'Ke', pick_category: 'Pilih kategori',
        pick_account: 'Pilih akaun', note_ph: 'Untuk apa? (pilihan)',
        receipt: 'Resit', add_receipt: 'Lampirkan resit',
        save_tx: 'Simpan', saved: 'Disimpan', tag: 'Tag', tags_ph: 'cth. trip, exam',
        repeat_last: 'Ulang yang lepas', split: 'Bahagi', date_today: 'Hari ini',
        need_category: 'Sila pilih kategori.', need_amount: 'Sila masukkan jumlah.',
        need_account: 'Sila pilih akaun.', transfer_same: 'Dari dan Ke mesti berbeza.',
        suggested: 'Dicadangkan: {cat}'
      },

      report: {
        title: 'Laporan',
        week: 'Minggu', month: 'Bulan',
        in: 'Wang masuk', out: 'Wang keluar', net: 'Bersih',
        top_cats: 'Kategori teratas',
        vs_last: 'berbanding',
        biggest_change: 'Perubahan terbesar',
        savings_rate: 'Kadar simpanan',
        budget_adherence: 'Bajet digunakan',
        flow_title: 'Ke mana wang anda pergi',
        flow_sources: 'Sumber', flow_accounts: 'Akaun', flow_uses: 'Digunakan untuk',
        net_worth: 'Nilai bersih',
        insights: 'Pandangan',
        export_img: 'Simpan laporan sebagai imej',
        subscriptions: 'Langganan bulan ini',
        no_data: 'Data belum cukup. Catat beberapa transaksi untuk lihat laporan.',
        pace: 'Kadar belanja',
        this_month: 'Bulan ini',
        last_month: 'Bulan lepas',
        daily_avg: 'Purata harian',
        biggest: 'Belanja terbesar',
        days_logged: 'Hari dicatat',
        top_merchants: 'Penjual teratas',
        no_merchants: 'Belum ada nota untuk dikumpulkan',
        vs_last_short: 'berbanding',
        spent_so_far: 'dibelanja setakat ini'
      },

      me: {
        title: 'Saya',
        accounts: 'Akaun', categories: 'Kategori', budgets: 'Bajet',
        limit: 'Had bulanan', bills: 'Bil & langganan',
        goals: 'Sasaran', debts: 'Hutang', zakat: 'Zakat', checklists: 'Senarai semak',
        challenges: 'Cabaran', learn: 'Belajar', security: 'Keselamatan',
        data: 'Data & sandaran', reminders: 'Peringatan', settings: 'Tetapan',
        language: 'Bahasa', theme: 'Tema', about: 'Perihal JELAS',
        privacy_blur: 'Kabur privasi',
        net_worth: 'Nilai bersih', assets: 'Aset', liabilities: 'Liabiliti',
        tab_manage: 'Urus', tab_tools: 'Alat', tab_app: 'Apl'
      },

      acct: {
        title: 'Akaun',
        add: 'Tambah akaun',
        type_cash: 'Tunai', type_bank: 'Bank', type_tng: 'E-dompet', type_grab: 'Teksi & penghantaran',
        type_shopee: 'Dompet beli-belah', type_boost: 'Dompet prabayar', type_debit: 'Kad debit',
        type_credit: 'Kad kredit', type_go: 'E-dompet simpanan', type_invest: 'Pelaburan', type_loan: 'Pinjaman',
        opening: 'Baki permulaan', balance: 'Baki', limit: 'Had kredit',
        due_day: 'Hari akhir bayar', statement_day: 'Hari penyata', utilisation: 'Penggunaan',
        archived: 'Diarkib', archive: 'Arkib', unarchive: 'Buka arkib',
        name_ph: 'cth. Tunai, Bank, E-dompet', count: 'akaun', total_balance: 'Jumlah baki',
        need_name: 'Sila namakan akaun.', delete_warn: 'Padam akaun ini dan semua transaksinya?'
      },

      cat: {
        title: 'Kategori',
        add: 'Tambah kategori',
        kind_need: 'Keperluan', kind_want: 'Kehendak', kind_save: 'Simpanan', kind_income: 'Pendapatan',
        parent: 'Di bawah', none_parent: 'Peringkat atas',
        need_name: 'Sila namakan kategori.', delete_warn: 'Padam kategori ini? Transaksi akan jadi tanpa kategori.'
      },

      bud: {
        title: 'Bajet',
        add: 'Tetapkan bajet', per_month: 'sebulan', per_week: 'seminggu',
        set_for: 'Bajet untuk', amount_ph: 'RM',
        left: 'baki', spent: 'dibelanja', rollover: 'Bawa baki ke hadapan',
        method: 'Kaedah', total_budgeted: 'Jumlah dibajetkan',
        to_be_budgeted: 'Untuk dibajetkan', all_assigned: 'Setiap ringgit ada tugas',
        unassigned: 'belum ditetapkan', need_amount: 'Masukkan jumlah.',
        no_budgets: 'Belum ada bajet. Tetapkan satu untuk buka selamat-dibelanja.'
      },

      goal: {
        title: 'Sasaran',
        add: 'Sasaran baharu', target: 'Sasaran', saved: 'Disimpan', deadline: 'Tarikh akhir',
        progress: 'Kemajuan', contribute: 'Tambah wang', withdraw: 'Keluarkan',
        name_ph: 'cth. Laptop, Balik kampung', need_name: 'Namakan sasaran anda.',
        need_target: 'Tetapkan jumlah sasaran.', complete: 'Sasaran dicapai!',
        per_month_needed: 'Simpan {amt}/bulan untuk siap tepat masa',
        no_deadline: 'Tiada tarikh akhir',
        emergency: 'Tabung kecemasan', emergency_hint: 'Sasar 3 bulan perbelanjaan',
        months_covered: 'bulan dilindungi',
        wishlist: 'Senarai hajat', add_wish: 'Tambah hajat', affordable: 'Anda mampu beli ini',
        not_affordable: 'Belum — teruskan menyimpan', cool_down: 'Pemasa tenang',
        cool_start: 'Mula pemasa 24j', cool_active: 'Pemasa berjalan',
        cool_done: 'Pemasa tamat — buat keputusan', no_goals: 'Belum ada sasaran.'
      },

      debt: {
        title: 'Hutang',
        add: 'Tambah hutang', name_ph: 'cth. Pinjaman pelajar, Kad kredit', principal: 'Jumlah asal',
        balance: 'Baki', rate: 'Faedah % setahun', min_pay: 'Bayaran minimum',
        due_day: 'Hari akhir bayar', payoff: 'Unjuran penyelesaian', months: 'bulan untuk selesai',
        monthly: 'Bulanan', total_interest: 'Faedah dibayar',
        paid: 'Sudah langsai', add_payment: 'Catat bayaran', no_debts: 'Tiada hutang. Bagus.',
        need_name: 'Namakan hutang.', need_balance: 'Masukkan baki.'
      },

      zakat: {
        title: 'Zakat',
        sub: 'Zakat simpanan (2.5%) — Malaysia',
        cash: 'Tunai & bank', gold: 'Nilai emas', silver: 'Nilai perak',
        investments: 'Pelaburan', receivables: 'Wang orang berhutang pada anda',
        liabilities: 'Hutang anda', net: 'Harta yang dizakatkan',
        nisab: 'Nisab (85g emas)', gold_price: 'Harga emas per gram (RM)',
        due: 'Zakat perlu dibayar', not_due: 'Bawah nisab — tiada zakat',
        rate_note: 'Kadar: 2.5% daripada harta yang cukup haul (setahun).',
        note: 'Anggaran sahaja. Sila sahkan dengan pihak zakat negeri anda.'
      },

      chk: {
        title: 'Senarai semak',
        monthly: 'Senarai semak kewangan bulanan', weekly: 'Semakan mingguan',
        purchase: 'Bolehkah saya beli ini?', custom: 'Senarai semak saya',
        progress: 'selesai', reset_note: 'Set semula setiap tempoh', add_item: 'Tambah item',
        add_list: 'Senarai semak baharu', list_name: 'Nama senarai semak',
        period_week: 'Mingguan', period_month: 'Bulanan', period_once: 'Sekali sahaja',
        m_paybills: 'Bayar semua bil', m_subs: 'Semak langganan',
        m_savings: 'Tambah simpanan / sasaran', m_budget: 'Semak bajet vs belanja',
        m_goals: 'Semak kemajuan sasaran', m_backup: 'Sandarkan data saya',
        w_log: 'Catat semua belanja minggu ini', w_cash: 'Selaraskan tunai di tangan',
        w_budget: 'Semak bajet minggu ini', w_plan: 'Rancang minggu depan',
        p_budget: 'Ada baki bajet dalam kategori ini?',
        p_need: 'Saya perlu, atau cuma mahu?',
        p_cool: 'Pemasa 24j sudah tamat?',
        p_alt: 'Ada pilihan lebih murah?',
        p_pay: 'Adakah ini menjejaskan bil minggu depan?'
      },

      chal: {
        title: 'Cabaran',
        active: 'Aktif', done: 'Selesai',
        no_spend: 'Minggu tanpa belanja', no_spend_d: 'Jangan belanja untuk kehendak selama 7 hari',
        save52: 'Simpanan 52 minggu', save52_d: 'Simpan lebih sedikit setiap minggu',
        streak7: 'Catatan 7 hari', streak7_d: 'Catat sesuatu 7 hari berturut',
        streak30: 'Catatan 30 hari', streak30_d: 'Catat sesuatu 30 hari berturut',
        start: 'Mula', give_up: 'Berhenti', completed_on: 'Selesai',
        mark_done: 'Tanda selesai', days_done: '{n} hari berlalu', days_left: '{n} hari lagi',
        badges: 'Lencana', no_badges: 'Belum ada lencana',
        b_first: 'Langkah pertama', b_first_d: 'Catat transaksi pertama anda',
        b_streak7: 'Konsisten', b_streak7_d: 'Rentetan catatan 7 hari',
        b_streak30: 'Tidak terhenti', b_streak30_d: 'Rentetan catatan 30 hari',
        b_goal: 'Pencapai sasaran', b_goal_d: 'Capai satu sasaran simpanan',
        b_nospend: 'Keazaman besi', b_nospend_d: 'Habiskan minggu tanpa belanja',
        b_budget: 'Raja bajet', b_budget_d: 'Kekal dalam bajet sebulan penuh'
      },

      learn: {
        title: 'Belajar',
        sub: 'Bacaan dua minit. Tanpa jargon.',
        read: 'Baca', read_done: 'Dibaca', progress: 'pelajaran dibaca',
        l1_t: 'Ke mana wang anda pergi', l1_b: 'Kebanyakan pelajar kehilangan wang pada belanja kecil yang kerap — minuman, penghantaran, tambah nilai. Jejak satu minggu dengan jujur dan coraknya akan muncul. Kesedaran sahaja biasanya mengurangkan belanja 10–15%.',
        l2_t: 'Peraturan 50/30/20', l2_b: 'Bahagikan pendapatan: 50% keperluan (makanan, pengangkutan, sewa), 30% kehendak (hiburan, beli-belah), 20% simpanan. Ia titik mula, bukan undang-undang — laraskan dengan pendapatan anda.',
        l3_t: 'Bina tabung kecemasan', l3_b: 'Sasar tiga bulan perbelanjaan. Mula dengan RM500. Simpan dalam akaun berasingan yang anda tidak sentuh. Inilah yang menghalang masalah kecil menjadi hutang.',
        l4_t: 'Fahami pinjaman pelajar anda', l4_b: 'Pinjaman pelajar biasanya datang sebagai jumlah sekali untuk satu semester. Bahagikan dengan bilangan minggu semester untuk dapat siling mingguan. Jika anda belanja lebih cepat, anda akan kehabisan sebelum semester tamat.',
        l5_t: 'Hutang: baik vs buruk', l5_b: 'Hutang untuk aset (pendidikan, alat) boleh berbaloi. Hutang untuk penggunaan (telefon, pakaian) biasanya tidak. Bayar faedah tertinggi dahulu.',
        l6_t: 'Elak penipuan', l6_b: 'Tiada pelaburan sah yang menjamin pulangan. Jangan kongsi TAC/OTP anda. Semak entiti dalam senarai BNM dan SC sebelum melabur. Jika ia tergesa-gesa dan berahsia, ia penipuan.',
        l7_t: 'Asas zakat', l7_b: 'Jika simpanan anda kekal melebihi nisab selama setahun penuh, zakat ialah 2.5%. Nisab mengikut nilai 85g emas. Sahkan dengan badan zakat negeri anda.',
        l8_t: 'Langganan bertambah', l8_b: 'RM15 di sini, RM20 di sana nampak kecil, tetapi lima langganan ialah RM100 sebulan — RM1,200 setahun. Semak setiap beberapa bulan dan batalkan yang tidak digunakan.'
      },

      sec: {
        title: 'Keselamatan',
        sub: 'Dengan tepat apa yang JELAS boleh dan tidak boleh lakukan.',
        lock: 'Kunci apl', lock_on: 'Kunci PIN hidup',
        bio: 'Buka dengan kunci peranti', bio_d: 'Guna kunci telefon anda untuk buka semula JELAS selepas ia mengunci sendiri. PIN masih diperlukan setiap kali mula.',
        autolock: 'Kunci automatik', autolock_d: 'Kunci apabila anda keluar dari apl',
        blur: 'Kabur privasi', blur_d: 'Sembunyikan semua jumlah di sebalik titik',
        screenshot: 'Sekat tangkapan skrin', screenshot_d: 'Halang tangkapan skrin apl',
        change_pin: 'Tukar PIN', current_pin: 'PIN semasa', new_pin: 'PIN baharu',
        pin_changed: 'PIN ditukar',
        no_internet: 'Tiada kebenaran internet',
        no_internet_d: 'Apl ini tiada kebenaran INTERNET. Ia tidak boleh menghantar data anda ke mana-mana.',
        encrypted: 'Disulitkan dalam telefon ini',
        encrypted_d: 'Data dan resit anda disulitkan dengan AES-256-GCM. Kunci diperoleh daripada PIN anda (PBKDF2, 600,000 pusingan) dan tidak pernah keluar dari peranti ini.',
        ds_title: 'Penyulitan terikat perkakasan',
        ds_d: 'PIN anda digabungkan dengan rahsia dalam perkakasan selamat telefon ini. Menyalin fail apl ke peranti lain tidak membolehkan sesiapa memecahkannya.',
        ds_off: 'Versi pelayar: tidak terikat perkakasan. Guna apl Android untuk perlindungan terkuat.',
        no_track: 'Tiada penjejak, tiada iklan',
        no_track_d: 'Tiada analitik, tiada iklan, tiada akaun, tiada laporan ranap.',
        can: 'JELAS boleh', cannot: 'JELAS tidak boleh',
        can1: 'Simpan transaksi, resit dan sasaran anda dalam telefon ini',
        can2: 'Mengunci dirinya dengan PIN dan kunci peranti anda',
        can3: 'Membaca fail CSV yang anda pilih untuk diimport',
        can4: 'Menunjukkan peringatan harian yang anda tetapkan',
        cannot1: 'Menyambung ke internet (tiada kebenaran)',
        cannot2: 'Melihat baki bank atau memindahkan wang',
        cannot3: 'Menghantar apa-apa ke mana-mana pelayan',
        cannot4: 'Membaca kenalan, lokasi, foto atau mesej anda',
        open_settings: 'Buka tetapan sistem', verify: 'Sahkan integriti',
        lock_now: 'Kunci sekarang'
      },

      data: {
        title: 'Data & sandaran',
        backup: 'Sandarkan (disulitkan .jelas)',
        backup_d: 'Fail dilindungi kata laluan. Simpan dengan selamat — tanpanya ia tidak boleh dibuka.',
        restore: 'Pulihkan daripada sandaran',
        csv_out: 'Eksport CSV', csv_out_d: 'Hamparan biasa bagi transaksi anda.',
        csv_in: 'Import CSV', csv_in_d: 'Bawa masuk penyata bank yang anda eksport.',
        wipe: 'Padam semua data', wipe_d: 'Padam semua dalam telefon ini. Tidak boleh diundur.',
        wipe_warn: 'Ini memadam semua data anda secara kekal. Anda pasti?',
        wipe_confirm: 'Taip {token} untuk sahkan',
        wipe_token: 'PADAM',
        backup_pw: 'Kata laluan sandaran', backup_pw_ph: 'Sekurang-kurangnya 6 aksara',
        backup_pw_short: 'Kata laluan mesti sekurang-kurangnya 6 aksara.',
        backup_done: 'Sandaran dibuat', restore_done: 'Data dipulihkan',
        restore_fail: 'Tidak dapat buka fail ini. Kata laluan salah atau rosak.',
        csv_done: '{n} transaksi diimport',
        storage: 'Storan digunakan', receipts: 'Resit', clear_receipts: 'Padam semua resit',
        clear_receipts_warn: 'Padam semua imej resit tersimpan? Transaksi kekal.',
        last_backup: 'Sandaran terakhir'
      },

      rem: {
        title: 'Peringatan',
        daily: 'Peringatan catatan harian', daily_d: 'Nudge lembut untuk catat belanja anda',
        weekly: 'Semakan mingguan', weekly_d: 'Semak minggu anda',
        monthly: 'Semakan bulanan', monthly_d: 'Mula bulan dengan lembaran bersih',
        time: 'Masa', day: 'Hari', notify_perm: 'Benarkan notifikasi supaya peringatan boleh muncul.',
        granted: 'Peringatan dijadualkan', denied: 'Notifikasi disekat dalam tetapan sistem.',
        notif_note: 'Peringatan dijana oleh telefon sendiri. Tiada internet digunakan.'
      },

      set: {
        title: 'Tetapan',
        currency: 'Mata wang', language: 'Bahasa', theme: 'Tema',
        theme_light: 'Cerah', theme_dark: 'Gelap', theme_auto: 'Ikut sistem',
        reduce_motion: 'Kurangkan gerakan', haptics: 'Getaran',
        num_format: 'Format nombor', about: 'Perihal',
        version: 'Versi', made: 'Dibuat untuk pelajar di Malaysia.',
        license: 'Apl ini dan semua kandungannya ialah karya asli. Tiada kod, fon, imej atau data pihak ketiga dibundelkan.',
        receipt_scan: 'Imbas resit (OCR)', receipt_scan_d: 'Baca jumlah daripada foto resit. Mati secara lalai.'
      },

      receipt: {
        title: 'Resit', attach: 'Lampirkan', retake: 'Ambil semula', remove: 'Buang',
        stored: 'Resit disimpan', compressing: 'Memampatkan…',
        compress_fail: 'Tidak dapat proses imej. Mengekalkan yang asal.',
        viewer_hint: 'Cubit untuk zum', none: 'Tiada resit dilampirkan',
        size: 'Saiz', saved_note: 'Dimampatkan dan disulitkan dalam telefon ini.',
        ocr_todo: 'Membaca jumlah…', ocr_found: 'Jumlah ditemui', ocr_none: 'Tidak dapat baca jumlah — taip sendiri.',
        ocr_off: 'Imbasan resit mati. Hidupkan dalam Tetapan.'
      },

      toast: {
        saved: 'Disimpan', deleted: 'Dipadam', updated: 'Dikemas kini', copied: 'Disalin',
        locked: 'Dikunci', unlocked: 'Dibuka', goal_added: 'Ditambah ke sasaran',
        pin_set: 'PIN ditetapkan', exported: 'Dieksport', imported: 'Diimport',
        nothing_undo: 'Tiada untuk diundur', undone: 'Diundur', archived: 'Diarkib',
        restored: 'Dipulihkan', check_done: 'Bagus — satu lagi selesai'
      },

      mood: {
        q: 'Bagaimana perasaan anda tentang wang hari ini?',
        great: 'Bagus', ok: 'Okey', worried: 'Risau', stressed: 'Tertekan'
      }
    },

    zh: {
      _name: '简体中文', _flag: '中',
      app: { name: 'JELAS', tagline: '让钱一目了然。' },

      nav: { today: '今天', flow: '流水', add: '记一笔', report: '报告', me: '我的' },

      common: {
        save: '保存', cancel: '取消', delete: '删除', edit: '编辑', done: '完成',
        back: '返回', next: '下一步', skip: '跳过', close: '关闭', confirm: '确认',
        yes: '是', no: '否', add: '添加', all: '全部', none: '无', search: '搜索',
        filter: '筛选', clear: '清空', today: '今天', week: '本周', month: '本月',
        year: '年', day: '日', days: '天', total: '合计', average: '平均',
        amount: '金额', date: '日期', note: '备注', category: '分类', account: '账户',
        type: '类型', name: '名称', color: '颜色', icon: '图标', optional: '可选',
        required: '必填', loading: '加载中…', empty: '暂无内容', undo: '撤销',
        of: '/', more: '更多', less: '收起', on: '开', off: '关', never: '从不',
        yes_delete: '确认删除', keep: '保留', reset: '重置', apply: '应用', ok: '好',
        export: '导出', import: '导入', share: '分享', view: '查看', retry: '重试',
        delete_warn: '确定删除？此操作无法撤销。'
      },

      txn: {
        title: '交易', edit: '编辑交易', updated: '交易已更新',
        split_hint: '拆分为多笔'
      },

      ins: {
        top_cat: '你最大的分类是 {cat} — 占支出的 {pct}%。',
        more: '你比上个月多花了 {pct}%。',
        less: '你比上个月少花了 {pct}%。',
        savings: '本月储蓄率：{pct}%。',
        small: '{n} 笔小额支出（≤RM15）本月共 {amt}。'
      },

      limit: {
        title: '每月限额',
        set: '设置每月限额',
        set_cta: '设置每月限额',
        sub: '为这个月的支出设上限，我们帮你算出每天能花多少。',
        not_set: '还没有限额 — 设置一个即可看到每天能花多少。',
        left: '本月剩余',
        of: '共',
        per_day: '每天可安全消费',
        days_left: '还剩 {n} 天',
        used: '已使用',
        alert_warn: '提醒 — 你已使用每月限额的 80%。',
        alert_over: '你已达到本月的支出限额。',
        remove: '移除限额',
        amount_ph: '例如 800',
        need_amount: '请输入大于零的限额。',
        saved: '已设置每月限额',
        removed: '已移除限额',
        on_track: '正常',
        warning: '接近上限',
        exceeded: '已超限'
      },

      score: {
        title: '财务评分',
        strong: '优秀', steady: '稳定', watch: '注意', tight: '紧张',
        sub: '根据你的储蓄率、预算使用和记账习惯计算。'
      },

      bill: {
        title: '账单与订阅',
        add: '添加账单',
        edit: '编辑账单',
        sub: '按周期跟踪固定支出——再也不会错过缴费日。',
        name: '账单名称',
        name_ph: '例如：话费套餐、流媒体、房租',
        amount: '金额',
        due_day: '每月缴费日',
        frequency: '重复周期',
        freq_monthly: '每月',
        freq_weekly: '每周',
        freq_yearly: '每年',
        next_7: '未来 7 天',
        due_today: '今天到期',
        due_tomorrow: '明天到期',
        due_in: '{n} 天后到期',
        paid_this_month: '本月已缴',
        mark_paid: '标记为已缴',
        paid_toast: '账单已缴并记录',
        monthly_total: '每月固定支出',
        yearly_total: '每年',
        reserved: '为账单预留',
        no_bills: '还没有账单。添加订阅，再也不会错过缴费日。',
        need_name: '请填写账单名称。',
        need_amount: '请输入金额。',
        delete_warn: '删除该账单？历史交易会保留。'
      },

      ask: {
        title: '问 JELAS',
        placeholder: '问：本月餐饮、上周咖啡…',
        hint: '试试“本月餐饮”、“上周咖啡”、“我赚了多少”、“最大一笔支出”。',
        total: '{range}{what}：{amt}',
        spent: '支出',
        income: '收入',
        net: '净额',
        things: '全部',
        count: '{range}：{n} 笔交易',
        average: '{range}平均 {amt}',
        biggest: '{range}最大一笔：{what} {amt}',
        no_match: '没有找到。试试分类名称或时间范围。',
        ex1: '本月餐饮', ex2: '本周咖啡', ex3: '最大一笔支出', ex4: '我赚了多少',
        empty: '问一个关于你钱的问题。全部在本机回答。'
      },

      tpl: {
        title: '快捷模板',
        sub: '你最常重复的记录——一键再记一次。',
        uses: '用过 {n} 次'
      },

      nw: {
        title: '净资产趋势',
        not_enough: '继续使用 JELAS，你的净资产历史会在这里累积。'
      },

      cal: {
        title: '支出日历',
        tap_day: '点击某天进行筛选'
      },

      onb: {
        welcome_title: '让钱一目了然。',
        welcome_sub: 'JELAS 是一款专为学生设计的离线记账应用。无需账户，无云端，无广告。',
        welcome_cta: '开始使用',
        lang_title: '选择你的语言',
        lang_sub: '随时可在 我的 → 语言 中更改。',
        method_title: '你想如何做预算？',
        method_sub: '先选一种开始，随时可切换。',
        m5020: '50 / 30 / 20',
        m5020_d: '一半用于必要开支，30% 用于想要，20% 存起来。',
        mzero: '零基预算',
        mzero_d: '给每一令吉安排用途，预算余额必须为 RM0。',
        menvelope: '信封法',
        menvelope_d: '每个分类一个信封，用完即止。',
        mpyf: '先存后花',
        mpyf_d: '先储蓄，再分配剩下的钱。',
        pin_title: '锁好你的钱',
        pin_sub: '设置 6 位数字密码。它用于加密手机上的全部数据——我们看不到。',
        pin_enter: '输入 6 位密码',
        pin_confirm: '再输入一次',
        pin_mismatch: '两次密码不一致，请重试。',
        pin_short: '密码必须为 6 位数字。',
        ready_title: '一切就绪',
        ready_sub: '所有数据都加密保存在这台手机上。来记下第一笔吧。',
        ready_cta: '打开 JELAS'
      },

      lock: {
        title: 'JELAS 已锁定',
        sub: '输入密码继续',
        wrong: '密码错误，请重试。',
        locked_for: '已锁定',
        ds_missing: '此数据与本手机绑定。请改用备份恢复。',
        use_bio: '用设备锁解锁',
        bio_fail: '设备解锁已取消',
        attempts: '错误次数'
      },

      today: {
        greeting: '你好',
        safe: '今日可安全消费',
        safe_hint: '根据本月剩余预算',
        spent_today: '今日已花费',
        this_week: '本周',
        money_in: '收入',
        money_out: '支出',
        streak: '连续记账',
        quick_add: '快速记账',
        reminder_on: '每日提醒已开启',
        reminder_off: '开启每日提醒',
        insight: '洞察',
        no_spend: '今天还没有记录支出',
        budget_left: '剩余预算',
        days_left: '天剩余',
        overspent: '本月已超预算',
        on_track: '本月预算正常'
      },

      flow: {
        title: '流水',
        in: '收入', out: '支出', net: '净额',
        all_tx: '全部交易',
        search_ph: '搜索备注、分类…',
        no_results: '没有匹配的交易。',
        empty_hint: '点击 + 记录第一笔交易。',
        heatmap: '消费日历',
        running: '滚动余额',
        this_month: '本月',
        grouped_none: '暂无记录'
      },

      add: {
        title: '记一笔',
        expense: '支出', income: '收入', transfer: '转账',
        amount: '金额', from: '从', to: '到', pick_category: '选择分类',
        pick_account: '选择账户', note_ph: '用途？（可选）',
        receipt: '收据', add_receipt: '附加收据',
        save_tx: '保存', saved: '已保存', tag: '标签', tags_ph: '例如：旅行、考试',
        repeat_last: '重复上一笔', split: '拆分', date_today: '今天',
        need_category: '请选择分类。', need_amount: '请输入金额。',
        need_account: '请选择账户。', transfer_same: '转出与转入不能相同。',
        suggested: '已建议：{cat}'
      },

      report: {
        title: '报告',
        week: '本周', month: '本月',
        in: '收入', out: '支出', net: '净额',
        top_cats: '主要分类',
        vs_last: '对比',
        biggest_change: '变化最大',
        savings_rate: '储蓄率',
        budget_adherence: '预算使用',
        flow_title: '你的钱流向何处',
        flow_sources: '来源', flow_accounts: '账户', flow_uses: '用途',
        net_worth: '净资产',
        insights: '洞察',
        export_img: '保存报告为图片',
        subscriptions: '本月订阅',
        no_data: '数据还不够。记几笔交易即可查看报告。',
        pace: '支出节奏',
        this_month: '本月',
        last_month: '上月',
        daily_avg: '日均',
        biggest: '最大一笔',
        days_logged: '记账天数',
        top_merchants: '主要商户',
        no_merchants: '还没有可归类的备注',
        vs_last_short: '对比',
        spent_so_far: '累计支出'
      },

      me: {
        title: '我的',
        accounts: '账户', categories: '分类', budgets: '预算',
        limit: '每月限额', bills: '账单与订阅',
        goals: '目标', debts: '债务', zakat: '天课', checklists: '清单',
        challenges: '挑战', learn: '学习', security: '安全',
        data: '数据与备份', reminders: '提醒', settings: '设置',
        language: '语言', theme: '主题', about: '关于 JELAS',
        privacy_blur: '隐私模糊',
        net_worth: '净资产', assets: '资产', liabilities: '负债',
        tab_manage: '管理', tab_tools: '工具', tab_app: '应用'
      },

      acct: {
        title: '账户',
        add: '添加账户',
        type_cash: '现金', type_bank: '银行卡', type_tng: '电子钱包', type_grab: '网约车与外卖',
        type_shopee: '购物钱包', type_boost: '预付钱包', type_debit: '借记卡',
        type_credit: '信用卡', type_go: '储蓄电子钱包', type_invest: '投资', type_loan: '贷款',
        opening: '期初余额', balance: '余额', limit: '信用额度',
        due_day: '还款日', statement_day: '账单日', utilisation: '额度使用',
        archived: '已归档', archive: '归档', unarchive: '取消归档',
        name_ph: '例如：现金、银行卡、电子钱包', count: '个账户', total_balance: '总余额',
        need_name: '请填写账户名称。', delete_warn: '删除该账户及其全部交易？'
      },

      cat: {
        title: '分类',
        add: '添加分类',
        kind_need: '必要', kind_want: '想要', kind_save: '储蓄', kind_income: '收入',
        parent: '归属', none_parent: '顶层',
        need_name: '请填写分类名称。', delete_warn: '删除该分类？相关交易将变为未分类。'
      },

      bud: {
        title: '预算',
        add: '设置预算', per_month: '每月', per_week: '每周',
        set_for: '预算对象', amount_ph: 'RM',
        left: '剩余', spent: '已花', rollover: '结余顺延',
        method: '方法', total_budgeted: '已分配预算',
        to_be_budgeted: '待分配', all_assigned: '每一令吉都有用途',
        unassigned: '尚未分配', need_amount: '请输入金额。',
        no_budgets: '还没有预算。设置一个即可启用“今日可安全消费”。'
      },

      goal: {
        title: '目标',
        add: '新建目标', target: '目标金额', saved: '已存', deadline: '截止日期',
        progress: '进度', contribute: '存入', withdraw: '取出',
        name_ph: '例如：笔记本、回家', need_name: '请为目标命名。',
        need_target: '请设置目标金额。', complete: '目标达成！',
        per_month_needed: '每月存 {amt} 即可按时完成',
        no_deadline: '无截止日期',
        emergency: '应急基金', emergency_hint: '目标为 3 个月开支',
        months_covered: '个月的开支',
        wishlist: '愿望清单', add_wish: '添加愿望', affordable: '你负担得起',
        not_affordable: '还不够——继续存', cool_down: '冷静期',
        cool_start: '开始 24 小时冷静期', cool_active: '冷静期进行中',
        cool_done: '冷静期结束——现在决定', no_goals: '还没有目标。'
      },

      debt: {
        title: '债务',
        add: '添加债务', name_ph: '例如：学生贷款、信用卡', principal: '原始金额',
        balance: '余额', rate: '年利率 %', min_pay: '最低还款',
        due_day: '还款日', payoff: '还清预测', months: '个月还清',
        monthly: '每月', total_interest: '已付利息',
        paid: '已还清', add_payment: '记录还款', no_debts: '没有债务，很好。',
        need_name: '请填写债务名称。', need_balance: '请输入余额。'
      },

      zakat: {
        title: '天课',
        sub: '储蓄天课（2.5%）——马来西亚',
        cash: '现金与银行', gold: '黄金价值', silver: '白银价值',
        investments: '投资', receivables: '别人欠你的钱',
        liabilities: '你欠的债', net: '应课天课的财产',
        nisab: '起征点（85 克黄金）', gold_price: '每克金价（RM）',
        due: '应缴天课', not_due: '低于起征点——无需缴纳',
        rate_note: '税率：满一年（haul）财产的 2.5%。',
        note: '仅供参考。请向所属州属的天课机构确认。'
      },

      chk: {
        title: '清单',
        monthly: '每月财务清单', weekly: '每周回顾',
        purchase: '我买得起吗？', custom: '我的清单',
        progress: '已完成', reset_note: '每个周期自动重置', add_item: '添加条目',
        add_list: '新建清单', list_name: '清单名称',
        period_week: '每周', period_month: '每月', period_once: '一次性',
        m_paybills: '缴清所有到期账单', m_subs: '检查订阅',
        m_savings: '补充储蓄 / 目标', m_budget: '检查预算与实际支出',
        m_goals: '检查目标进度', m_backup: '备份我的数据',
        w_log: '记录本周每一笔支出', w_cash: '核对手上的现金',
        w_budget: '回顾本周预算', w_plan: '规划下周',
        p_budget: '这个分类还有预算吗？',
        p_need: '我是需要，还是只是想要？',
        p_cool: '24 小时冷静期过了吗？',
        p_alt: '有更便宜的替代品吗？',
        p_pay: '这会影响下周的账单吗？'
      },

      chal: {
        title: '挑战',
        active: '进行中', done: '已完成',
        no_spend: '无消费周', no_spend_d: '7 天不花钱在想要的东西上',
        save52: '52 周储蓄', save52_d: '每周多存一点',
        streak7: '连续记账 7 天', streak7_d: '连续 7 天有记录',
        streak30: '连续记账 30 天', streak30_d: '连续 30 天有记录',
        start: '开始', give_up: '放弃', completed_on: '完成于',
        mark_done: '标记为完成', days_done: '已进行 {n} 天', days_left: '还剩 {n} 天',
        badges: '徽章', no_badges: '还没有徽章',
        b_first: '第一步', b_first_d: '记录第一笔交易',
        b_streak7: '持之以恒', b_streak7_d: '连续记账 7 天',
        b_streak30: '势不可挡', b_streak30_d: '连续记账 30 天',
        b_goal: '目标达人', b_goal_d: '达成一个储蓄目标',
        b_nospend: '钢铁意志', b_nospend_d: '完成无消费周',
        b_budget: '预算高手', b_budget_d: '整月守住预算'
      },

      learn: {
        title: '学习',
        sub: '两分钟阅读，没有术语。',
        read: '阅读', read_done: '已读', progress: '篇已读',
        l1_t: '你的钱去了哪里', l1_b: '大多数学生的钱都花在频繁的小额消费上——饮料、外卖、充值。诚实记录一周，规律很快就会显现。仅凭觉察，通常就能减少 10–15% 的开支。',
        l2_t: '50/30/20 法则', l2_b: '把收入分成：50% 必要（吃饭、交通、房租），30% 想要（娱乐、购物），20% 储蓄。这只是起点，不是铁律——按你的收入调整。',
        l3_t: '建立应急基金', l3_b: '目标为三个月的开支，从 RM500 开始。放在一个你不会动的独立账户里。它能阻止小问题变成借贷。',
        l4_t: '了解你的学生贷款', l4_b: '学生贷款通常按学期一次性发放。把它除以学期周数，得到每周上限。如果花得更快，学期还没结束你就没钱了。',
        l5_t: '债务：好与坏', l5_b: '为资产（教育、工具）借钱可能值得；为消费（手机、衣服）借钱通常不值。优先偿还利率最高的。',
        l6_t: '防范诈骗', l6_b: '没有合法投资能保证回报。绝不要分享你的 TAC/OTP。投资前先查 BNM 和 SC 的名单。如果催促你、又神神秘秘，那就是骗局。',
        l7_t: '天课基础', l7_b: '若你的储蓄满一年都高于起征点，天课为 2.5%。起征点按 85 克黄金的价值计算。请向所属州属的天课机构确认。',
        l8_t: '订阅会累积', l8_b: '这里 RM15、那里 RM20 看着不多，但五个订阅就是每月 RM100——一年 RM1,200。每隔几个月检查一次，取消不用的。'
      },

      sec: {
        title: '安全',
        sub: 'JELAS 能做与不能做的，一目了然。',
        lock: '应用锁', lock_on: '密码锁已开启',
        bio: '设备锁解锁', bio_d: '应用自动锁定后，可用手机锁重新打开 JELAS。每次重新启动仍需输入密码。',
        autolock: '自动锁定', autolock_d: '离开应用时锁定',
        blur: '隐私模糊', blur_d: '用圆点隐藏所有金额',
        screenshot: '禁止截屏', screenshot_d: '阻止对应用截屏',
        change_pin: '修改密码', current_pin: '当前密码', new_pin: '新密码',
        pin_changed: '密码已修改',
        no_internet: '无网络权限',
        no_internet_d: '本应用没有 INTERNET 权限，物理上无法把你的数据发送到任何地方。',
        encrypted: '在本机加密',
        encrypted_d: '你的数据与收据使用 AES-256-GCM 加密。密钥由你的密码派生（PBKDF2，600,000 轮），永不离开本设备。',
        ds_title: '硬件绑定加密',
        ds_d: '你的密码与手机安全硬件中的密钥相结合。即使把应用文件复制到其他设备，也无法离线破解。',
        ds_off: '浏览器版本：未绑定硬件。如需最强保护，请使用 Android 应用。',
        no_track: '无追踪，无广告',
        no_track_d: '无分析、无广告、无账户、无崩溃上报。',
        can: 'JELAS 可以', cannot: 'JELAS 不可以',
        can1: '在本机保存你的交易、收据和目标',
        can2: '用密码和设备锁锁定自己',
        can3: '读取你选择导入的 CSV 文件',
        can4: '显示你设置的每日提醒',
        cannot1: '连接互联网（无权限）',
        cannot2: '查看你的银行余额或转账',
        cannot3: '向任何服务器发送任何内容',
        cannot4: '读取你的联系人、位置、照片或短信',
        open_settings: '打开系统设置', verify: '校验完整性',
        lock_now: '立即锁定'
      },

      data: {
        title: '数据与备份',
        backup: '备份（加密 .jelas）',
        backup_d: '受密码保护的文件。请妥善保管——没有密码无法打开。',
        restore: '从备份恢复',
        csv_out: '导出 CSV', csv_out_d: '你交易的普通表格。',
        csv_in: '导入 CSV', csv_in_d: '导入你导出的银行对账单。',
        wipe: '清除全部数据', wipe_d: '删除本机全部数据，无法撤销。',
        wipe_warn: '这将永久删除你的全部数据。确定吗？',
        wipe_confirm: '输入 {token} 以确认',
        wipe_token: '删除',
        backup_pw: '备份密码', backup_pw_ph: '至少 6 个字符',
        backup_pw_short: '密码至少 6 个字符。',
        backup_done: '备份已创建', restore_done: '数据已恢复',
        restore_fail: '无法打开该文件。密码错误或文件损坏。',
        csv_done: '已导入 {n} 笔交易',
        storage: '已用空间', receipts: '收据', clear_receipts: '删除全部收据',
        clear_receipts_warn: '删除所有已保存的收据图片？交易记录保留。',
        last_backup: '上次备份'
      },

      rem: {
        title: '提醒',
        daily: '每日记账提醒', daily_d: '温柔提醒你记录开支',
        weekly: '每周回顾', weekly_d: '回顾你的一周',
        monthly: '每月盘点', monthly_d: '以全新的开始迎接新月份',
        time: '时间', day: '星期', notify_perm: '请允许通知，提醒才能显示。',
        granted: '提醒已设定', denied: '通知已在系统设置中被屏蔽。',
        notif_note: '提醒由手机本身生成，不使用网络。'
      },

      set: {
        title: '设置',
        currency: '货币', language: '语言', theme: '主题',
        theme_light: '浅色', theme_dark: '深色', theme_auto: '跟随系统',
        reduce_motion: '减少动画', haptics: '触感反馈',
        num_format: '数字格式', about: '关于',
        version: '版本', made: '为马来西亚的学生打造。',
        license: '本应用及其全部内容均为原创作品。未捆绑任何第三方代码、字体、图片或数据。',
        receipt_scan: '收据识别（OCR）', receipt_scan_d: '从收据照片读取金额。默认关闭。'
      },

      receipt: {
        title: '收据', attach: '附加', retake: '重拍', remove: '移除',
        stored: '收据已保存', compressing: '压缩中…',
        compress_fail: '无法处理该图片，将保留原图。',
        viewer_hint: '双指缩放', none: '未附加收据',
        size: '大小', saved_note: '已在本机压缩并加密。',
        ocr_todo: '正在读取金额…', ocr_found: '找到金额', ocr_none: '无法读取金额——请手动输入。',
        ocr_off: '收据识别已关闭。请在设置中开启。'
      },

      toast: {
        saved: '已保存', deleted: '已删除', updated: '已更新', copied: '已复制',
        locked: '已锁定', unlocked: '已解锁', goal_added: '已存入目标',
        pin_set: '密码已设置', exported: '已导出', imported: '已导入',
        nothing_undo: '没有可撤销的操作', undone: '已撤销', archived: '已归档',
        restored: '已恢复', check_done: '很好——又少一件事'
      },

      mood: {
        q: '今天你对钱的感觉如何？',
        great: '很好', ok: '还行', worried: '担心', stressed: '有压力'
      }
    }
  };

  var LANGS = ['en', 'ms', 'zh'];
  var current = 'en';

  function get(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /* t('nav.today') or t('data.csv_done', {n: 5}) */
  function t(key, vars) {
    var s = get(DICT[current], key);
    if (s === undefined) s = get(DICT.en, key);
    if (s === undefined) return key;
    if (typeof s !== 'string') return s;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) {
        return (vars[k] !== undefined) ? vars[k] : m;
      });
    }
    return s;
  }

  function setLang(code) {
    if (LANGS.indexOf(code) === -1) code = 'en';
    current = code;
    try { document.documentElement.setAttribute('lang', code === 'zh' ? 'zh-Hans' : (code === 'ms' ? 'ms' : 'en')); } catch (e) {}
    return current;
  }

  function lang() { return current; }
  function langs() { return LANGS.slice(); }
  function langName(code) { return get(DICT[code] || DICT.en, '_name'); }
  function langFlag(code) { return get(DICT[code] || DICT.en, '_flag'); }

  /* Number / money formatting — RM in every language, tabular friendly. */
  function money(n, opts) {
    opts = opts || {};
    if (n == null || isNaN(n)) n = 0;
    var neg = n < 0;
    n = Math.abs(n);
    var dp = (opts.dp != null) ? opts.dp : (Math.abs(n % 1) > 0.0001 ? 2 : 0);
    var s = n.toFixed(dp);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    s = parts.join('.');
    var out = 'RM' + (opts.space ? ' ' : '') + s;
    return neg ? '-' + out : out;
  }

  function compact(n) {
    if (n == null || isNaN(n)) n = 0;
    var a = Math.abs(n), sign = n < 0 ? '-' : '';
    if (a >= 1000000) return sign + (a / 1000000).toFixed(a % 1000000 === 0 ? 0 : 1) + 'M';
    if (a >= 1000) return sign + (a / 1000).toFixed(a % 1000 === 0 ? 0 : 1) + 'k';
    return sign + Math.round(a);
  }

  /* Date formatting, locale-aware but simple and offline. */
  var MONTHS = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
    zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  };
  var DAYS = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
    zh: ['日', '一', '二', '三', '四', '五', '六']
  };

  function fmtDate(iso, style) {
    var d = (iso instanceof Date) ? iso : new Date(iso);
    if (isNaN(d.getTime())) return '';
    var dd = d.getDate(), mm = d.getMonth(), yy = d.getFullYear();
    var m = MONTHS[current] || MONTHS.en;
    var wd = DAYS[current] || DAYS.en;
    if (style === 'short') return dd + ' ' + m[mm];
    if (style === 'weekday') return wd[d.getDay()];
    if (style === 'month') return m[mm] + ' ' + yy;
    if (style === 'monthYear') return m[mm] + ' ' + yy;
    if (current === 'zh') return yy + '年' + (mm + 1) + '月' + dd + '日';
    return dd + ' ' + m[mm] + ' ' + yy;
  }

  function fmtTime(hhmm) {
    // hhmm like "21:00" — 24-hour in all languages (per spec)
    return hhmm;
  }

  window.I18N = {
    t: t, setLang: setLang, lang: lang, langs: langs,
    langName: langName, langFlag: langFlag,
    money: money, compact: compact, fmtDate: fmtDate, fmtTime: fmtTime,
    dict: DICT
  };
})();
