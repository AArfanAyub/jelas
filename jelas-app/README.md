# JELAS

**Money, made clear.**

A private, offline money tracker built for Malaysian students and Gen Z.
No account. No cloud. No ads. No internet permission — it physically cannot send your data anywhere.

<p align="center">
  <img src="assets/icon-192.png" width="96" alt="JELAS icon">
</p>

---

## What it is

**JELAS** is a Malay word with two meanings, and both are the point:
**clear** (you can see exactly where your money goes) and **settled** (your money is sorted out).
*(Verified against Dewan Bahasa dan Pustaka.)*

Everything lives on your phone, encrypted. It works on a plane, in a basement, with the SIM out.

---

## Features

**Track**
- Expense / income / transfer in a few taps, with a big numeric keypad
- Multiple accounts: cash, bank, e-wallet, credit card, investment, loan
- 30 pre-built categories you can rename, recolour and re-icon
- Notes and tags, search and filters, month calendar heatmap
- Recurring-safe design, duplicate-last-entry shortcut

**Understand**
- **Ask JELAS** — type a question in plain language ("coffee this month", "biggest expense", "how much did I earn") and get the answer, entirely on-device. No cloud, no AI service.
- **Monthly limit** — set one number and JELAS works out what you can spend each day, with an 80% nudge and a "you're over" warning
- **Safe to spend today** — the one number that matters, and it *reserves money for bills you haven't paid yet*
- **Money score** — a single 0–100 glance at how the month is going (savings rate + limit discipline + logging habit)
- Weekly and monthly reports: money in, money out, net
- **Money-flow view** — where money came from and where it went
- **Spending pace** — this period vs last, side by side
- **Spending calendar** — a real month grid showing what each day cost; tap a day to filter
- Category donut with the total in the middle, in/out bars, trend lines
- **Top merchants** ranked by what you actually spent
- **Net worth trend** — monthly snapshots, charted over time
- Plain-language insights ("your biggest category is Food at 34%")

**Plan**
- **Bills & subscriptions** — recurring bills with due dates, a "next 7 days" list, your total monthly commitment, and one-tap *mark as paid* that logs the transaction
- **Monthly spending limit** (the headline number) plus per-category budgets with progress bars
- Four budgeting methods: 50/30/20, zero-based, envelopes, pay-yourself-first
- Budget rollover — unspent money carries into next month
- **Smart category suggestion** — type a note and JELAS offers the category you used last time
- **Quick templates** — your most repeated entries, one tap to log again
- Savings goals ("Tabung") with progress rings and a per-month target
- Debt tracker with a payoff projection (student loan, credit card, buy-now-pay-later)
- Zakat calculator (nisab from the gold price, 2.5%)
- Checklists: monthly, weekly, and a "can I afford this?" pre-purchase check
- Challenges and badges, logging streak
- Eight two-minute financial-literacy lessons, written in plain language

**Keep it private**
- **No `INTERNET` permission.** Verified in the shipped APK.
- AES-256-GCM encryption at rest; the key is derived from your PIN via PBKDF2 (600,000 rounds) plus a hardware-bound secret, and never leaves the device
- PIN lock with auto-lock and a brute-force lockout; optional device-lock (biometric) re-entry
- Privacy blur to hide all amounts instantly; optional screenshot blocking
- Encrypted `.jelas` backups; CSV export/import
- Receipts: photographed, compressed on-device, encrypted, never uploaded
- No analytics, no trackers, no accounts, no ads

**Languages** — English (default), Bahasa Melayu, 简体中文. Instant switching, no reload.

---

## Install (Android)

Download `jelas.apk` and open it on your phone. You may need to allow installation from
unknown sources once.

- Minimum: Android 5.0 (API 21)
- Target: Android 14 (API 34)
- Size: ~0.2 MB
- Permissions requested: **notifications** (only if you turn reminders on) and
  **receive boot completed** (so reminders survive a restart). Nothing else.

## Run in a browser

It's a plain static site — no build step:

```bash
cd jelas-app
python -m http.server 8080
# open http://localhost:8080
```

---

## Project layout

```
jelas-app/                 the app (static site — this is the whole product)
  index.html
  css/style.css
  js/
    i18n.js                EN / BM / ZH dictionaries + number/date formatting
    crypto.js              PBKDF2 + AES-256-GCM (WebCrypto)
    db.js                  IndexedDB + encrypted snapshot + prefs
    store.js               state, CRUD, all money maths
    charts.js              hand-coded SVG charts
    receipts.js            canvas compression + encryption
    seed.js                icons, categories, challenges, checklists
    app.js                 screens, navigation, onboarding, lock, bridge
  assets/                  app icon (original artwork)
  sw.js, manifest.json
  NOTICE.md                IP inventory — read this before publishing
  LICENSE                  MIT

jelas-android/             Android shell + no-Gradle APK build
  app/src/main/java/app/jelas/MainActivity.java
  app/src/main/java/app/jelas/ReminderReceiver.java
  app/src/main/AndroidManifest.xml
  build-apk.py             aapt2 + javac + d8 + zipalign + apksigner
```

### Development files (not part of the app)

These live alongside the source but are **gitignored** and are never bundled into the APK —
the build copies an explicit whitelist of files:

| File | Purpose |
|---|---|
| `test-jelas.js` | The automated test suite (45 check groups) |
| `test-out.log`, `test-report.json` | Output of the last test run |
| `shot-*.png`, `smoke-*.png` | Screenshots captured by the suite |
| `gen-icons.py` | Regenerates the app icons from source |
| `dbg.js`, `dbg.log` | Scratch debugging scripts |

## Building the APK

No Gradle. Requires JDK 17 and Android SDK build-tools 34.0.0.

```bash
cd jelas-android
python build-apk.py        # -> dist/jelas.apk
```

## Testing

```bash
cd jelas-app
npm i puppeteer-core       # or use an existing install
node test-jelas.js 20      # runs the full user journey 20 times
```

---

## Privacy statement

JELAS collects nothing, transmits nothing, and has no server. There is no account to
create and no data to delete on anyone else's side, because none of it ever leaves your
device. If you uninstall the app, the data goes with it.

## Licence

MIT — see `LICENSE`. All code, icons, artwork, translations and written content are
original work. See `NOTICE.md` for the full intellectual-property inventory.

**Not affiliated with any bank, wallet or payment provider.** Brand names appear only as
labels you can pick to describe your own accounts.
