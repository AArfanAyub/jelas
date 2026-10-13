/* JELAS — crypto layer
 * AES-256-GCM encryption at rest + PBKDF2 key derivation, via WebCrypto.
 * Original implementation. No third-party crypto code.
 *
 * Model:
 *   PIN  --PBKDF2(SHA-256, 600k, salt || deviceSecret)-->  KEK (AES-GCM-256, non-extractable)
 *   Data --AES-256-GCM(random IV)-->  ciphertext (base64) stored in IndexedDB
 *   Verification: a small "verifier" blob is encrypted with the KEK. If it decrypts,
 *   the PIN was right. The PIN itself is never stored anywhere.
 *
 * The optional deviceSecret comes from the Android Keystore (hardware-backed where
 * available). Mixing it into the KDF salt means that an attacker who copies the
 * IndexedDB file off the device still cannot brute-force the PIN offline, because
 * they do not have the hardware-bound secret. In a plain browser (no bridge) the
 * derivation falls back to PIN-only, and the app says so on the Security page.
 */
(function () {
  'use strict';

  var ITERATIONS = 600000;
  var SALT_BYTES = 16;
  var IV_BYTES = 12;
  var VERIFIER = 'JELAS::v1::verifier';
  var SECRET_BYTES = 32;

  function subtle() {
    if (!(window.crypto && window.crypto.subtle)) {
      throw new Error('WebCrypto unavailable');
    }
    return window.crypto.subtle;
  }

  function available() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues);
  }

  function randomBytes(n) {
    var a = new Uint8Array(n);
    window.crypto.getRandomValues(a);
    return a;
  }

  /* ---- base64 helpers (binary safe) ---- */
  function bufToB64(buf) {
    var bytes = new Uint8Array(buf);
    var bin = '';
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }

  function b64ToBuf(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  /* ---- key derivation ---- */
  /* deriveKey(pin, saltB64, deviceSecretB64?)
   * When a device secret is supplied it is appended to the salt, so the same PIN
   * yields a different key on a different device / without the hardware secret. */
  function deriveKey(pin, saltB64, deviceSecretB64) {
    var enc = new TextEncoder();
    var salt = new Uint8Array(b64ToBuf(saltB64));
    var material;
    if (deviceSecretB64) {
      var ds = new Uint8Array(b64ToBuf(deviceSecretB64));
      material = new Uint8Array(salt.length + SECRET_BYTES);
      material.set(salt, 0);
      material.set(ds.subarray(0, SECRET_BYTES), salt.length);
    } else {
      material = salt;
    }
    return subtle().importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return subtle().deriveKey(
          { name: 'PBKDF2', salt: material, iterations: ITERATIONS, hash: 'SHA-256' },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      });
  }

  function newSalt() {
    return bufToB64(randomBytes(SALT_BYTES));
  }

  /* ---- string / object encryption ---- */
  function encryptString(key, text) {
    var enc = new TextEncoder();
    var iv = randomBytes(IV_BYTES);
    return subtle().encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(text))
      .then(function (ct) {
        return { iv: bufToB64(iv), ct: bufToB64(ct) };
      });
  }

  function decryptString(key, payload) {
    var dec = new TextDecoder();
    var iv = new Uint8Array(b64ToBuf(payload.iv));
    var ct = b64ToBuf(payload.ct);
    return subtle().decrypt({ name: 'AES-GCM', iv: iv }, key, ct)
      .then(function (pt) { return dec.decode(pt); });
  }

  /* ---- binary (receipts) ---- */
  function encryptBytes(key, arrayBuffer) {
    var iv = randomBytes(IV_BYTES);
    return subtle().encrypt({ name: 'AES-GCM', iv: iv }, key, arrayBuffer)
      .then(function (ct) { return { iv: bufToB64(iv), ct: bufToB64(ct) }; });
  }

  function decryptBytes(key, payload) {
    var iv = new Uint8Array(b64ToBuf(payload.iv));
    var ct = b64ToBuf(payload.ct);
    return subtle().decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
  }

  /* ---- verifier (PIN check without storing the PIN) ---- */
  function makeVerifier(key) {
    return encryptString(key, VERIFIER);
  }

  function checkVerifier(key, verifier) {
    return decryptString(key, verifier).then(function (s) {
      return s === VERIFIER;
    }).catch(function () { return false; });
  }

  /* ---- hashing for non-secret integrity (e.g. tamper check) ---- */
  function sha256Hex(text) {
    var enc = new TextEncoder();
    return subtle().digest('SHA-256', enc.encode(text)).then(function (h) {
      var b = new Uint8Array(h), out = '';
      for (var i = 0; i < b.length; i++) out += ('0' + b[i].toString(16)).slice(-2);
      return out;
    });
  }

  window.JELAS_CRYPTO = {
    available: available,
    newSalt: newSalt,
    deriveKey: deriveKey,
    encryptString: encryptString,
    decryptString: decryptString,
    encryptBytes: encryptBytes,
    decryptBytes: decryptBytes,
    makeVerifier: makeVerifier,
    checkVerifier: checkVerifier,
    sha256Hex: sha256Hex,
    bufToB64: bufToB64,
    b64ToBuf: b64ToBuf,
    ITERATIONS: ITERATIONS
  };
})();
