# JELAS — Security Statement

**Version 1.0.0 · 13 October 2026**

This document states exactly what JELAS does to protect your data, and what it does *not*
protect you from. Every claim here is verifiable against the shipped APK — the commands to
check them yourself are at the end.

---

## 1. The short version

JELAS keeps your money data on your phone, encrypted with a key derived from your PIN plus a
secret held in your phone's secure hardware. The app has **no internet permission**, so it
physically cannot send your data anywhere. There is no account, no server, no analytics and no
advertising.

---

## 2. What protects your data

| Layer | Control | How to verify |
|---|---|---|
| **Network** | The app declares **no `INTERNET` permission**. It cannot open a socket. | `aapt2 dump permissions jelas.apk` |
| **Network (2nd layer)** | CSP sets `connect-src 'none'`, and the app code contains **zero** calls to `fetch`, `XMLHttpRequest`, `WebSocket` or `sendBeacon`. | `grep -c fetch js/*.js` → `0` |
| **Network (3rd layer)** | `network_security_config.xml` sets `cleartextTrafficPermitted="false"`. | unzip the APK |
| **At rest** | All data is written to IndexedDB as **one AES-256-GCM ciphertext**, with a fresh random 96-bit IV per write. Receipt images are encrypted the same way. | `grep -c 'AES-GCM' js/crypto.js` |
| **Key derivation** | `PBKDF2-SHA256`, **600,000 rounds** (OWASP guidance), 128-bit random salt. | `grep 'ITERATIONS =' js/crypto.js` |
| **Hardware binding** | On Android, a random 256-bit secret is generated and wrapped by a key in the **Android Keystore** (hardware-backed where the device supports it). It is appended to the PBKDF2 salt, so copying the app's data files off the phone is **not** enough to crack the PIN offline. | Security screen in the app shows *Hardware-bound encryption: On* |
| **PIN storage** | The PIN is **never stored**. A small encrypted "verifier" blob proves a PIN is correct. | `grep -c 'VERIFIER' js/crypto.js` |
| **Access** | 6-digit PIN lock, auto-lock on background, optional device-lock (biometric) re-entry. | — |
| **Brute force** | Escalating lockout: 5 s, then doubling, capped at 15 minutes. Persisted across restarts, and it blocks even the correct PIN while active. | try 6 wrong PINs |
| **Memory** | On lock, the decrypted data is discarded from memory and writes are blocked. | `grep -c 'S.setKey(null)' js/app.js` |
| **Input hardening** | Every record id is coerced to `[A-Za-z0-9_-]` before it can reach the DOM, so a crafted file cannot inject markup. | `grep -c 'function safeId' js/store.js` |
| **Restore hardening** | A `.jelas` backup is treated as untrusted: whitelisted fields, type coercion, length caps, dangling references dropped, 64 MB size cap. | `grep -c 'function sanitizeState' js/store.js` |
| **Export hardening** | CSV cells starting with `= + - @` are prefixed with `'` to prevent spreadsheet formula injection. | `grep -c "\\[=+\\\\-@\\\\t\\\\r\\]" js/store.js` |
| **Screenshot** | Screen capture blocked by default (`FLAG_SECURE`); can be turned off in Security. | — |
| **Shoulder-surfing** | One-tap privacy blur hides every amount on screen. | — |
| **Packaging** | `debuggable=false`, `allowBackup=false`, `fullBackupContent=false`, `usesCleartextTraffic=false`; the reminder receiver is not exported. | `aapt2 dump xmltree jelas.apk --file AndroidManifest.xml` |
| **Signing** | Signed with APK Signature Scheme **v1 + v2 + v3**. | `apksigner verify --verbose jelas.apk` |
| **No third-party code** | The APK contains only our own readable source — no native libraries, no web fonts, no minified vendor bundles. | `find . -name "*.so" -o -name "*.woff*"` |

---

## 3. What JELAS does NOT protect you from

Being honest about limits is part of being trustworthy.

1. **Someone who knows your PIN.** If you tell someone your PIN, or they watch you type it, they
   can read everything. The encryption protects against a *lost or stolen device*, not against
   a person you gave access to.
2. **A rooted or compromised phone.** On a rooted device with a malicious app holding elevated
   privileges, the guarantee weakens substantially. JELAS cannot defend against an attacker who
   already controls the operating system.
3. **The web build is weaker than the APK.** In a browser there is no Android Keystore, so the
   hardware-bound secret is unavailable and protection rests on the PIN alone. The app says so on
   its own Security screen. **Use the Android app for the strongest protection.**
4. **A 6-digit PIN is still 6 digits.** The hardware binding makes offline cracking impractical,
   but a short numeric PIN is not a strong passphrase. The lockout makes guessing at the lock
   screen slow; it does nothing against someone who already knows the PIN.
5. **Clearing app data is permanent.** The key lives on the device. Uninstalling, clearing data,
   or losing the device without a backup means the data is gone. There is no recovery service
   because there is no server. **Make backups.**
6. **The backup password is the weak link.** A `.jelas` backup is deliberately *not* device-bound
   (so it can be restored on a new phone). It is protected by its own password — choose a long one.
7. **Not audited by a third party.** This is an independent project. An AI-assisted security
   review was performed during development and its findings were fixed, but no external firm has
   certified this app. Read the source if you need certainty.
8. **Not a financial service.** JELAS does not connect to any bank or wallet, cannot see your real
   balances, cannot move money, and gives no financial advice. The zakat calculator is an estimate.

---

## 4. Threat model

| Threat | Mitigated? | How |
|---|---|---|
| Phone lost or stolen | **Yes** | AES-256-GCM at rest + PIN lock + hardware-bound key + lockout |
| Someone copies the data files off the device | **Yes** (Android) | The key needs the Keystore secret, which does not leave the device |
| A malicious app reads JELAS data | **Mostly** | App-private storage; no exported components; no shared files |
| Shoulder-surfing | **Yes** | Privacy blur, screenshot blocking |
| A crafted `.jelas` file attacks the app | **Yes** | `sanitizeState()` + `safeId()` + strict CSP |
| Data leaks to a server | **Impossible** | No INTERNET permission; no network APIs in the code |
| Malicious update signed by someone else | **Yes** | APK signature verification; the release keystore is kept private |
| Someone knows your PIN | **No** | Out of scope by definition |
| Rooted / compromised device | **No** | Out of scope |

---

## 5. Verify it yourself

```bash
# 1. No internet permission — expect ONLY POST_NOTIFICATIONS and RECEIVE_BOOT_COMPLETED
aapt2 dump permissions jelas.apk

# 2. Signature schemes
apksigner verify --verbose jelas.apk

# 3. Manifest hardening flags
aapt2 dump xmltree jelas.apk --file AndroidManifest.xml | grep -iE "debuggable|allowBackup|cleartext"

# 4. No native libraries or bundled fonts
unzip -l jelas.apk | grep -E "\.so|\.woff|\.ttf"

# 5. The app source is readable — inspect every line
unzip -o jelas.apk 'assets/*' && ls -R assets/

# 6. No network calls anywhere in the app code
grep -rn "fetch(\|XMLHttpRequest\|WebSocket\|sendBeacon" assets/js/ || echo "none found"
```

---

## 6. Reporting a problem

If you find a security issue, please open an issue describing the problem and how to reproduce
it. Please do not publish exploit details before there has been a chance to fix them.

---

*JELAS is not affiliated with, endorsed by, or sponsored by any bank, wallet or payment provider.
Brand names appear only as labels a user can pick to describe their own accounts.*
