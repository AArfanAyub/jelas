# JELAS

A simple, privacy-first money tracker for students. No ads, no accounts, no cloud. Works fully offline.

| | |
|---|---|
| **Web app** | [`jelas-app/`](jelas-app/) — Pure HTML/CSS/JS. Install as PWA or run in any browser. |
| **Android APK** | [`jelas-android/dist/jelas.apk`](jelas-android/dist/jelas.apk) — Prebuilt signed APK included, or build your own via `jelas-android/build-apk.py`. |
| **License** | MIT |

## Quick start

Open `jelas-app/index.html` in any modern browser, or build the APK:

```bash
cd jelas-android
python build-apk.py
```

The signed APK lands in `jelas-android/dist/jelas.apk`.

## Privacy

- Zero network permissions (INTERNET count: 0).
- All data stays on your device.
- PIN-encrypted at rest.

See [`SECURITY.md`](jelas-app/SECURITY.md) for the full security model.

## Trademarks

No third-party trademarks are used in this app. All product category labels are generic descriptive wording.

## Author

Ahmad Arfan bin Ayub
