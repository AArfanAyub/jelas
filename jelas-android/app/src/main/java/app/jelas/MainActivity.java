package app.jelas;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.KeyguardManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * JELAS — Android shell.
 * A hardened WebView wrapper. No INTERNET permission is declared, so the app
 * physically cannot transmit anything. Original implementation.
 */
public class MainActivity extends Activity {

    private WebView webView;
    private static final int REQ_FILE_CHOOSER = 200;
    private static final int REQ_DEVICE_CREDENTIAL = 300;
    private static final int REQ_NOTIF_PERMISSION = 400;
    private android.webkit.ValueCallback<Uri[]> mFilePathCallback;

    /* Hardware-bound secret used as extra key-derivation material. */
    private static final String KEYSTORE_ALIAS = "jelas_device_secret_v1";
    private static final String PREFS_SECRET = "jelas_secret";
    private static final String PREF_SECRET_BLOB = "blob";
    private static final int SECRET_LEN = 32;
    private static final int GCM_IV_LEN = 12;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Never allow screenshots to leak into the recents thumbnail by default.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE);

        webView = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(false);

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);

        // Security hardening
        ws.setAllowFileAccessFromFileURLs(false);
        ws.setAllowUniversalAccessFromFileURLs(false);
        ws.setJavaScriptCanOpenWindowsAutomatically(false);
        ws.setMediaPlaybackRequiresUserGesture(true);
        ws.setGeolocationEnabled(false);
        ws.setSaveFormData(false);
        ws.setSavePassword(false);
        ws.setSupportMultipleWindows(false);

        // Display
        ws.setCacheMode(WebSettings.LOAD_NO_CACHE);
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);
        ws.setTextZoom(100);
        ws.setSupportZoom(false);
        ws.setBuiltInZoomControls(false);

        webView.addJavascriptInterface(new Bridge(), "JelasAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Only ever stay inside our own bundled assets.
                return !(url != null && url.startsWith("file:///android_asset/"));
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface d, int w) { result.confirm(); }
                        })
                        .setOnCancelListener(new DialogInterface.OnCancelListener() {
                            public void onCancel(DialogInterface d) { result.cancel(); }
                        })
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface d, int w) { result.confirm(); }
                        })
                        .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface d, int w) { result.cancel(); }
                        })
                        .setOnCancelListener(new DialogInterface.OnCancelListener() {
                            public void onCancel(DialogInterface d) { result.cancel(); }
                        })
                        .show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, final android.webkit.JsPromptResult result) {
                final android.widget.EditText input = new android.widget.EditText(MainActivity.this);
                input.setText(defaultValue == null ? "" : defaultValue);
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setView(input)
                        .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface d, int w) { result.confirm(input.getText().toString()); }
                        })
                        .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                            public void onClick(DialogInterface d, int w) { result.cancel(); }
                        })
                        .setOnCancelListener(new DialogInterface.OnCancelListener() {
                            public void onCancel(DialogInterface d) { result.cancel(); }
                        })
                        .show();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView v, android.webkit.ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                if (mFilePathCallback != null) mFilePathCallback.onReceiveValue(null);
                mFilePathCallback = cb;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE_CHOOSER);
                } catch (Exception e) {
                    mFilePathCallback = null;
                    toast("Could not open the file picker");
                    return false;
                }
                return true;
            }
        });

        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");

        createNotificationChannel();
    }

    /* ---------------- helpers ---------------- */
    private void toast(final String msg) {
        runOnUiThread(new Runnable() {
            public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show(); }
        });
    }

    private void js(final String code) {
        if (webView == null) return;
        webView.post(new Runnable() {
            public void run() {
                if (webView != null) webView.evaluateJavascript(code, null);
            }
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(ReminderReceiver.CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                        ReminderReceiver.CHANNEL_ID, "JELAS reminders", NotificationManager.IMPORTANCE_DEFAULT);
                ch.setDescription("Gentle reminders to log your spending");
                nm.createNotificationChannel(ch);
            }
        }
    }

    /* ---------------- JS bridge ---------------- */
    class Bridge {

        /** Write a file the user asked to export. Permission-free on every API level. */
        @JavascriptInterface
        public boolean saveFile(String name, String mime, String b64) {
            try {
                byte[] data = Base64.decode(b64, Base64.DEFAULT);
                String safe = (name == null || name.trim().isEmpty()) ? "jelas-export.txt" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, safe);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, mime == null ? "application/octet-stream" : mime);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri == null) return false;
                    OutputStream os = getContentResolver().openOutputStream(uri);
                    if (os == null) return false;
                    os.write(data);
                    os.close();
                    toast("Saved to Downloads: " + safe);
                    return true;
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    if (dir == null) dir = getFilesDir();
                    if (!dir.exists()) dir.mkdirs();
                    File f = new File(dir, safe);
                    FileOutputStream fos = new FileOutputStream(f);
                    fos.write(data);
                    fos.close();
                    toast("Saved: " + f.getAbsolutePath());
                    return true;
                }
            } catch (Exception e) {
                toast("Could not save the file");
                return false;
            }
        }

        @JavascriptInterface
        public void scheduleReminders(String json) {
            try {
                JSONObject o = new JSONObject(json);
                getSharedPreferences(ReminderReceiver.PREFS, MODE_PRIVATE)
                        .edit().putString(ReminderReceiver.KEY_JSON, json).apply();
                ReminderReceiver.reschedule(MainActivity.this, o);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void requestNotifPermission() {
            if (Build.VERSION.SDK_INT >= 33) {
                if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, REQ_NOTIF_PERMISSION);
                }
            }
        }

        @JavascriptInterface
        public void setSecure(final boolean on) {
            runOnUiThread(new Runnable() {
                public void run() {
                    if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            });
        }

        /** Confirm the device lock (PIN / pattern / biometric). Result goes back via __jelasBioResult. */
        @JavascriptInterface
        public void biometricUnlock() {
            runOnUiThread(new Runnable() {
                public void run() {
                    try {
                        KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                        if (km == null || !km.isDeviceSecure()) {
                            js("window.__jelasBioResult && window.__jelasBioResult(false)");
                            return;
                        }
                        Intent i = km.createConfirmDeviceCredentialIntent("JELAS", "Unlock JELAS");
                        if (i == null) {
                            js("window.__jelasBioResult && window.__jelasBioResult(false)");
                            return;
                        }
                        startActivityForResult(i, REQ_DEVICE_CREDENTIAL);
                    } catch (Exception e) {
                        js("window.__jelasBioResult && window.__jelasBioResult(false)");
                    }
                }
            });
        }

        @JavascriptInterface
        public void onLocked() {
            // Nothing to do natively — the WebView already shows the lock screen.
        }

        @JavascriptInterface
        public String platform() {
            return "android";
        }

        /**
         * A random 256-bit secret, wrapped by a key that lives in the Android Keystore
         * (hardware-backed where the device supports it). The WebView mixes this into the
         * PBKDF2 salt, so copying the app's data files off the device is not enough to
         * brute-force the PIN offline.
         *
         * Returns null if it cannot be produced — the app then falls back to PIN-only and
         * says so on its Security page.
         */
        @JavascriptInterface
        public String getDeviceSecret() {
            try {
                byte[] secret = loadOrCreateSecret();
                if (secret == null) return null;
                return Base64.encodeToString(secret, Base64.NO_WRAP);
            } catch (Exception e) {
                return null;
            }
        }
    }

    /* ---------------- device secret ---------------- */
    private byte[] loadOrCreateSecret() throws Exception {
        SharedPreferences sp = getSharedPreferences(PREFS_SECRET, MODE_PRIVATE);
        String blob = sp.getString(PREF_SECRET_BLOB, null);

        // API < 23 has no reliable Keystore AES-GCM; keep a plain random secret there.
        if (Build.VERSION.SDK_INT < 23) {
            if (blob != null) return Base64.decode(blob, Base64.NO_WRAP);
            byte[] fresh = new byte[SECRET_LEN];
            new SecureRandom().nextBytes(fresh);
            sp.edit().putString(PREF_SECRET_BLOB, Base64.encodeToString(fresh, Base64.NO_WRAP)).apply();
            return fresh;
        }

        SecretKey kek = getOrCreateKeystoreKey();
        if (blob != null) {
            byte[] raw = Base64.decode(blob, Base64.NO_WRAP);
            if (raw.length <= GCM_IV_LEN) return null;
            byte[] iv = Arrays.copyOfRange(raw, 0, GCM_IV_LEN);
            byte[] ct = Arrays.copyOfRange(raw, GCM_IV_LEN, raw.length);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, kek, new GCMParameterSpec(128, iv));
            return c.doFinal(ct);
        }

        byte[] fresh = new byte[SECRET_LEN];
        new SecureRandom().nextBytes(fresh);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, kek);
        byte[] iv = c.getIV();
        byte[] ct = c.doFinal(fresh);
        byte[] packed = new byte[iv.length + ct.length];
        System.arraycopy(iv, 0, packed, 0, iv.length);
        System.arraycopy(ct, 0, packed, iv.length, ct.length);
        sp.edit().putString(PREF_SECRET_BLOB, Base64.encodeToString(packed, Base64.NO_WRAP)).apply();
        return fresh;
    }

    private SecretKey getOrCreateKeystoreKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(KEYSTORE_ALIAS)) {
            KeyStore.Entry entry = ks.getEntry(KEYSTORE_ALIAS, null);
            if (entry instanceof KeyStore.SecretKeyEntry) {
                return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            }
        }
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        kg.init(new KeyGenParameterSpec.Builder(KEYSTORE_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setUserAuthenticationRequired(false)
                .build());
        return kg.generateKey();
    }

    /* ---------------- lifecycle ---------------- */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null) {
            webView.evaluateJavascript(
                    "typeof window.jelasGoBack === 'function' ? (window.jelasGoBack() ? 'handled' : 'not-handled') : 'not-handled'",
                    new android.webkit.ValueCallback<String>() {
                        @Override
                        public void onReceiveValue(String value) {
                            if (value != null && value.contains("not-handled") && webView != null) {
                                if (webView.canGoBack()) webView.goBack();
                                else MainActivity.super.onBackPressed();
                            }
                        }
                    });
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE_CHOOSER && mFilePathCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        } else if (requestCode == REQ_DEVICE_CREDENTIAL) {
            js("window.__jelasBioResult && window.__jelasBioResult(" + (resultCode == RESULT_OK) + ")");
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
