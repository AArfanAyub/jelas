# Publishing JELAS to GitHub

## Option A — Quick manual push (recommended, ~30 seconds)

1. **Create the empty repo** on GitHub (no README, no `.gitignore`):
   <https://github.com/new?name=jelas&description=JELAS+money+tracker&visibility=public>

2. **Copy-paste these two commands** in the project folder:

   ```bash
   git remote add origin https://github.com/AArfanAyub/jelas.git
   git push -u origin main
   ```

   Git Credential Manager will open a browser window to sign you in if this is your first time pushing from this machine.

## Option B — Let me push it for you

If you create the repo using the link above and reply "repo created", I can attempt to push all 60 files automatically via the GitHub API.

## What is in this commit

- `jelas-app/` — Web app source (HTML/CSS/JS, PWA-ready)
- `jelas-android/` — Android wrapper + build script
- `README.md` — Root repo readme
- `.gitignore` — Excludes signing material, logs, and OS files

**Excluded (by design):**
- `jelas-android/jelas.keystore` and `keystore.pass` — never publish signing keys
- `app-solat/` — a different project, not part of JELAS
- `.workbuddy-ai/` — WorkBuddy memory files

## License

MIT — see `jelas-app/LICENSE`.
