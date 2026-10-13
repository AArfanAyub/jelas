/* JELAS — storage layer
 * IndexedDB for data + receipt blobs; localStorage for non-secret UI prefs only.
 * All financial data is written as ONE AES-256-GCM encrypted snapshot.
 * Original implementation.
 */
(function () {
  'use strict';

  var DB_NAME = 'jelas';
  var DB_VERSION = 1;
  var STORE_KV = 'kv';
  var STORE_RECEIPTS = 'receipts';
  var LS_PREFIX = 'jelas.';

  var _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
      var req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_KV)) db.createObjectStore(STORE_KV);
        if (!db.objectStoreNames.contains(STORE_RECEIPTS)) db.createObjectStore(STORE_RECEIPTS, { keyPath: 'id' });
      };
      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB open failed')); };
    });
  }

  function tx(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var s = t.objectStore(store);
        var out;
        try { out = fn(s); } catch (e) { reject(e); return; }
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('tx aborted')); };
      });
    });
  }

  function kvGet(key) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE_KV, 'readonly');
        var r = t.objectStore(STORE_KV).get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function kvPut(key, val) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE_KV, 'readwrite');
        t.objectStore(STORE_KV).put(val, key);
        t.oncomplete = function () { resolve(true); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  function kvDel(key) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE_KV, 'readwrite');
        t.objectStore(STORE_KV).delete(key);
        t.oncomplete = function () { resolve(true); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  /* ---- encrypted snapshot ---- */
  function saveSnapshot(key, obj) {
    var json = JSON.stringify(obj);
    return window.JELAS_CRYPTO.encryptString(key, json).then(function (payload) {
      payload.updatedAt = Date.now();
      payload.bytes = json.length;
      return kvPut('data', payload);
    });
  }

  function loadSnapshot(key) {
    return kvGet('data').then(function (payload) {
      if (!payload) return null;
      return window.JELAS_CRYPTO.decryptString(key, payload).then(function (json) {
        return JSON.parse(json);
      });
    });
  }

  function hasSnapshot() {
    return kvGet('data').then(function (p) { return !!p; });
  }

  /* ---- receipts (encrypted blobs) ---- */
  function putReceipt(rec) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE_RECEIPTS, 'readwrite');
        t.objectStore(STORE_RECEIPTS).put(rec);
        t.oncomplete = function () { resolve(rec.id); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  function getReceipt(id) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE_RECEIPTS, 'readonly');
        var r = t.objectStore(STORE_RECEIPTS).get(id);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function delReceipt(id) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE_RECEIPTS, 'readwrite');
        t.objectStore(STORE_RECEIPTS).delete(id);
        t.oncomplete = function () { resolve(true); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  function allReceipts() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE_RECEIPTS, 'readonly');
        var r = t.objectStore(STORE_RECEIPTS).getAll();
        r.onsuccess = function () { resolve(r.result || []); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function clearReceipts() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE_RECEIPTS, 'readwrite');
        t.objectStore(STORE_RECEIPTS).clear();
        t.oncomplete = function () { resolve(true); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  /* ---- wipe everything ---- */
  function wipe() {
    return Promise.all([kvDel('data'), clearReceipts()]).then(function () {
      return true;
    });
  }

  /* ---- localStorage prefs (non-secret only) ---- */
  var prefs = {
    get: function (k, dflt) {
      try {
        var v = localStorage.getItem(LS_PREFIX + k);
        if (v === null) return dflt;
        return JSON.parse(v);
      } catch (e) { return dflt; }
    },
    set: function (k, v) {
      try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); } catch (e) {}
    },
    del: function (k) {
      try { localStorage.removeItem(LS_PREFIX + k); } catch (e) {}
    },
    keys: function () {
      var out = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(LS_PREFIX) === 0) out.push(k.slice(LS_PREFIX.length));
        }
      } catch (e) {}
      return out;
    },
    wipe: function () {
      var ks = prefs.keys();
      for (var i = 0; i < ks.length; i++) prefs.del(ks[i]);
    }
  };

  window.JELAS_DB = {
    open: open,
    kvGet: kvGet, kvPut: kvPut, kvDel: kvDel,
    saveSnapshot: saveSnapshot, loadSnapshot: loadSnapshot, hasSnapshot: hasSnapshot,
    putReceipt: putReceipt, getReceipt: getReceipt, delReceipt: delReceipt,
    allReceipts: allReceipts, clearReceipts: clearReceipts,
    wipe: wipe, prefs: prefs
  };
})();
