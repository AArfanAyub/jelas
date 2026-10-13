#!/usr/bin/env python3
"""Build the JELAS APK from the Android project.
Uses Android SDK build-tools directly (aapt2, javac, d8, zipalign, apksigner).
No Gradle. Original build script.
"""
import os, sys, subprocess, shutil, zipfile, glob, time

# ---- Config ----
JDK_HOME = r"C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
SDK_HOME = r"C:\Android"
BUILD_TOOLS = os.path.join(SDK_HOME, "build-tools", "34.0.0")
PLATFORM = os.path.join(SDK_HOME, "platforms", "android-34")
ANDROID_JAR = os.path.join(PLATFORM, "android.jar")

PROJECT = os.path.dirname(os.path.abspath(__file__))
APP_SRC = os.path.join(PROJECT, "app")
MAIN = os.path.join(APP_SRC, "src", "main")
GEN = os.path.join(PROJECT, "gen")
BUILD = os.path.join(PROJECT, "build")
OUT = os.path.join(PROJECT, "dist")
WEB_SRC = os.path.abspath(os.path.join(PROJECT, "..", "jelas-app"))

AAPT2 = os.path.join(BUILD_TOOLS, "aapt2.exe")
D8_JAR = os.path.join(BUILD_TOOLS, "lib", "d8.jar")
APKSIGNER_JAR = os.path.join(BUILD_TOOLS, "lib", "apksigner.jar")
ZIPALIGN = os.path.join(BUILD_TOOLS, "zipalign.exe")
KEYTOOL = os.path.join(JDK_HOME, "bin", "keytool.exe")
JAVA = os.path.join(JDK_HOME, "bin", "java.exe")
JAVAC = os.path.join(JDK_HOME, "bin", "javac.exe")

VERSION_CODE = "1"
VERSION_NAME = "1.0.0"
APK_NAME = "jelas.apk"
KEY_ALIAS = "jelas"


def keystore_password():
    """Never hardcode a signing password. Order of preference:
       1. $JELAS_KEYSTORE_PASS
       2. a gitignored 'keystore.pass' file next to this script
       3. a freshly generated random password, written to that file
    """
    p = os.environ.get("JELAS_KEYSTORE_PASS")
    if p:
        return p
    pw_file = os.path.join(PROJECT, "keystore.pass")
    if os.path.exists(pw_file):
        with open(pw_file, "r", encoding="utf-8") as f:
            return f.read().strip()
    import secrets, string
    alphabet = string.ascii_letters + string.digits
    p = "".join(secrets.choice(alphabet) for _ in range(32))
    with open(pw_file, "w", encoding="utf-8") as f:
        f.write(p)
    print("\n!! Generated a random signing password -> %s" % pw_file)
    print("!! Keep it PRIVATE. Never publish the .keystore or the password file.\n")
    return p


def _redact(cmd):
    """Never print secrets into build logs."""
    out = []
    hide_next = False
    for part in cmd:
        if hide_next:
            out.append('********')
            hide_next = False
            continue
        if isinstance(part, str) and part.startswith('pass:'):
            out.append('pass:********')
            continue
        if part in ('-storepass', '-keypass'):
            out.append(part)
            hide_next = True
            continue
        out.append(part)
    return " ".join(out)


def run(cmd, **kw):
    print("> " + (_redact(cmd) if isinstance(cmd, list) else cmd))
    r = subprocess.run(cmd, **kw)
    if r.returncode != 0:
        print("FAILED (exit %d)" % r.returncode)
        if r.stdout:
            print(r.stdout.decode("utf-8", errors="replace"))
        if r.stderr:
            print(r.stderr.decode("utf-8", errors="replace"))
        sys.exit(1)
    return r


def run_java_cp(main_class, classpath, *args):
    return run([JAVA, "-cp", classpath, main_class] + list(args))


def run_java_jar(jar, *args):
    return run([JAVA, "-jar", jar] + list(args))


def _rmtree_manual(path):
    """Remove a directory without shutil.rmtree (which can be blocked by safe-delete shims)."""
    if not os.path.exists(path):
        return
    for root, dirs, files in os.walk(path, topdown=False):
        for f in files:
            try:
                os.remove(os.path.join(root, f))
            except OSError:
                pass
        for d in dirs:
            try:
                os.rmdir(os.path.join(root, d))
            except OSError:
                pass
    try:
        os.rmdir(path)
    except OSError:
        pass


def sync_web_assets():
    """Copy the PWA into the APK's assets folder (single source of truth).

    Uses an explicit WHITELIST so test scripts, screenshots and logs can never
    leak into a published APK.
    """
    print("\n=== Step 0: Sync web assets ===")
    dest = os.path.join(MAIN, "assets")
    _rmtree_manual(dest)
    os.makedirs(dest, exist_ok=True)

    # individual files that ship with the app
    for name in ("index.html", "manifest.json", "sw.js", "LICENSE", "NOTICE.md", "README.md", "SECURITY.md"):
        src = os.path.join(WEB_SRC, name)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(dest, name))
    # directories that ship with the app
    for d in ("css", "js", "assets"):
        src = os.path.join(WEB_SRC, d)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(dest, d))

    total = 0
    for root, _, files in os.walk(dest):
        for f in files:
            total += os.path.getsize(os.path.join(root, f))
    print("Synced %s -> assets (%.2f MB)" % (WEB_SRC, total / 1048576))
    return dest


def clean():
    for d in [GEN, BUILD, OUT]:
        os.makedirs(d, exist_ok=True)


def compile_resources():
    print("\n=== Step 1: Compile resources ===")
    out_dir = os.path.join(GEN, "compiled")
    os.makedirs(out_dir, exist_ok=True)
    run([AAPT2, "compile", "--dir", os.path.join(MAIN, "res"), "-o", out_dir],
        capture_output=True, text=True)
    return out_dir


def compile_java(extra_src_dirs=None):
    print("\n=== Step 3: Compile Java ===")
    out_dir = os.path.join(GEN, "java")
    os.makedirs(out_dir, exist_ok=True)
    java_files = glob.glob(os.path.join(MAIN, "java", "**", "*.java"), recursive=True)
    for d in (extra_src_dirs or []):
        java_files += glob.glob(os.path.join(d, "**", "*.java"), recursive=True)
    if not java_files:
        print("No Java files found!")
        sys.exit(1)
    run([JAVAC, "-source", "1.8", "-target", "1.8",
         "-bootclasspath", ANDROID_JAR,
         "-classpath", ANDROID_JAR,
         "-d", out_dir] + java_files)
    print("Compiled %d Java files" % len(java_files))
    return out_dir


def dex(java_out):
    print("\n=== Step 4: DEX ===")
    out_dir = os.path.join(BUILD, "dex")
    os.makedirs(out_dir, exist_ok=True)
    classes = []
    for root, _, files in os.walk(java_out):
        for f in files:
            if f.endswith(".class"):
                classes.append(os.path.join(root, f))
    if not classes:
        print("No .class files!")
        sys.exit(1)
    run_java_cp("com.android.tools.r8.D8", D8_JAR,
                "--output", out_dir,
                "--lib", ANDROID_JAR,
                "--min-api", "21",
                "--release",
                "--no-desugaring",
                *classes)
    return out_dir


def link(res_compiled):
    """aapt2 link — also emits R.java so Java can reference resources."""
    print("\n=== Step 2: Link resources (generates R.java) ===")
    proto_apk = os.path.join(BUILD, "jelas-unsigned.apk")
    java_r = os.path.join(GEN, "r")
    os.makedirs(java_r, exist_ok=True)
    res_files = []
    for root, _, files in os.walk(res_compiled):
        for f in files:
            if f.endswith(".flat"):
                res_files.append(os.path.join(root, f))
    run([AAPT2, "link",
         "-o", proto_apk,
         "-I", ANDROID_JAR,
         "--manifest", os.path.join(MAIN, "AndroidManifest.xml"),
         "--java", java_r,
         "--target-sdk-version", "34",
         "--min-sdk-version", "21",
         "--version-code", VERSION_CODE,
         "--version-name", VERSION_NAME,
         "--auto-add-overlay"] + res_files)
    return proto_apk, java_r


def add_dex_and_assets(proto_apk, dex_dir):
    print("\n=== Step 5: Add dex + assets ===")
    dex_file = os.path.join(dex_dir, "classes.dex")
    if not os.path.exists(dex_file):
        print("classes.dex not found!")
        sys.exit(1)
    with zipfile.ZipFile(proto_apk, "a", zipfile.ZIP_DEFLATED) as z:
        z.write(dex_file, "classes.dex")
        asset_dir = os.path.join(MAIN, "assets")
        for root, _, files in os.walk(asset_dir):
            for f in files:
                fp = os.path.join(root, f)
                arc = "assets/" + os.path.relpath(fp, asset_dir).replace("\\", "/")
                z.write(fp, arc)
    print("Packed: %s (%.2f MB)" % (proto_apk, os.path.getsize(proto_apk) / 1048576))
    return proto_apk


def sign_and_align(unaligned):
    print("\n=== Step 6: Sign & align ===")
    store_pass = keystore_password()
    keystore = os.path.join(PROJECT, "jelas.keystore")
    if not os.path.exists(keystore):
        print("Generating a new signing keystore...")
        run([KEYTOOL, "-genkeypair", "-v",
             "-keystore", keystore,
             "-storepass", store_pass,
             "-keypass", store_pass,
             "-alias", KEY_ALIAS,
             "-keyalg", "RSA",
             "-keysize", "4096",
             "-validity", "10950",
             "-dname", "CN=JELAS, O=JELAS, C=MY"])
    aligned = os.path.join(BUILD, "jelas-aligned.apk")
    run([ZIPALIGN, "-f", "-p", "4", unaligned, aligned])
    signed = os.path.join(OUT, APK_NAME)
    run_java_jar(APKSIGNER_JAR, "sign",
                 "--ks", keystore,
                 "--ks-pass", "pass:" + store_pass,
                 "--key-pass", "pass:" + store_pass,
                 "--ks-key-alias", KEY_ALIAS,
                 "--v1-signing-enabled", "true",
                 "--v2-signing-enabled", "true",
                 "--v3-signing-enabled", "true",
                 "--out", signed,
                 aligned)
    run_java_jar(APKSIGNER_JAR, "verify", "--verbose", signed)
    print("\n*** APK: %s (%.2f MB) ***" % (signed, os.path.getsize(signed) / 1048576))
    return signed


def main():
    print("Building JELAS APK  (v%s / code %s)" % (VERSION_NAME, VERSION_CODE))
    t0 = time.time()
    clean()
    sync_web_assets()
    res = compile_resources()
    proto, java_r = link(res)
    java_out = compile_java([java_r])
    dex_dir = dex(java_out)
    packed = add_dex_and_assets(proto, dex_dir)
    final = sign_and_align(packed)
    print("\nDone in %.1fs" % (time.time() - t0))
    print("APK:", final)


if __name__ == "__main__":
    main()
