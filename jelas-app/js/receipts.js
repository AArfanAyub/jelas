/* JELAS — receipts: capture, compress on-device, encrypt, store.
 * Uses only the Canvas API. No libraries. Images never leave the device.
 */
(function () {
  'use strict';

  var MAX_EDGE = 1600;
  var QUALITY = 0.72;
  var THUMB_EDGE = 200;

  function readFileAsImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
      img.src = url;
    });
  }

  function drawToCanvas(img, maxEdge) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('bad image size');
    var scale = Math.min(1, maxEdge / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    return { canvas: c, w: cw, h: ch };
  }

  function canvasToBlob(canvas, quality) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) {
        canvas.toBlob(function (b) { resolve(b); }, 'image/jpeg', quality);
      } else {
        try {
          var data = canvas.toDataURL('image/jpeg', quality);
          var bin = atob(data.split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/jpeg' }));
        } catch (e) { resolve(null); }
      }
    });
  }

  function blobToArrayBuffer(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsArrayBuffer(blob);
    });
  }

  function arrayBufferToBlob(buf, type) {
    return new Blob([buf], { type: type || 'image/jpeg' });
  }

  /* compress(file) -> { full: Blob, thumb: Blob, width, height, bytes } */
  function compress(file) {
    return readFileAsImage(file).then(function (res) {
      try {
        var main = drawToCanvas(res.img, MAX_EDGE);
        var thumb = drawToCanvas(res.img, THUMB_EDGE);
        return Promise.all([
          canvasToBlob(main.canvas, QUALITY),
          canvasToBlob(thumb.canvas, 0.7)
        ]).then(function (blobs) {
          URL.revokeObjectURL(res.url);
          var full = blobs[0], th = blobs[1];
          if (!full) {
            // fallback: keep original
            return { full: file, thumb: th || file, width: main.w, height: main.h, bytes: file.size, fallback: true };
          }
          return {
            full: full, thumb: th || full,
            width: main.w, height: main.h,
            bytes: full.size,
            originalBytes: file.size
          };
        });
      } catch (e) {
        URL.revokeObjectURL(res.url);
        // Fallback-safe: keep the original rather than losing it
        return { full: file, thumb: file, width: 0, height: 0, bytes: file.size, fallback: true };
      }
    });
  }

  /* save a receipt: compress -> encrypt -> IndexedDB */
  function saveReceipt(cryptoKey, file) {
    return compress(file).then(function (c) {
      return Promise.all([
        blobToArrayBuffer(c.full),
        blobToArrayBuffer(c.thumb)
      ]).then(function (bufs) {
        return Promise.all([
          window.JELAS_CRYPTO.encryptBytes(cryptoKey, bufs[0]),
          window.JELAS_CRYPTO.encryptBytes(cryptoKey, bufs[1])
        ]).then(function (enc) {
          var rec = {
            id: window.JELAS_STORE.uid('r'),
            full: enc[0], thumb: enc[1],
            width: c.width, height: c.height,
            bytes: c.bytes, originalBytes: c.originalBytes || c.bytes,
            fallback: !!c.fallback,
            createdAt: Date.now()
          };
          return window.JELAS_DB.putReceipt(rec).then(function () { return rec; });
        });
      });
    });
  }

  function loadBlobURL(cryptoKey, receiptId, useThumb) {
    return window.JELAS_DB.getReceipt(receiptId).then(function (rec) {
      if (!rec) return null;
      var payload = useThumb ? rec.thumb : rec.full;
      return window.JELAS_CRYPTO.decryptBytes(cryptoKey, payload).then(function (buf) {
        return URL.createObjectURL(arrayBufferToBlob(buf));
      });
    });
  }

  function removeReceipt(id) {
    return window.JELAS_DB.delReceipt(id);
  }

  function totalBytes() {
    return window.JELAS_DB.allReceipts().then(function (list) {
      var s = 0;
      list.forEach(function (r) { s += (r.bytes || 0); });
      return s;
    });
  }

  window.JELAS_RECEIPTS = {
    compress: compress,
    saveReceipt: saveReceipt,
    loadBlobURL: loadBlobURL,
    removeReceipt: removeReceipt,
    totalBytes: totalBytes,
    MAX_EDGE: MAX_EDGE,
    QUALITY: QUALITY
  };
})();
