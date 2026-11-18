// Barcode decode helpers shared by the page and the node tests.
//
// @zxing/library 0.21.3 (the build this page loads) cannot decode UPC-E.
// UPCEReader.decodeMiddle returns only a row offset, so the digits are thrown
// away, and UPCEANReader.decodeRow then looks for an EAN end guard instead of
// the UPC-E end guard. A clean UPC-E image therefore never decodes, which is
// why short pack codes such as 02896223 fail even with TRY_HARDER set.
// UPC-A, EAN-13, EAN-8 and Code 128 go through ZXing. UPC-E is decoded here,
// on the same binarized rows, and expanded to the 12-digit UPC-A that the
// store POS stores.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ScannerKit = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var L_PATTERNS = [
    [3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2],
    [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2]
  ];
  var LG = null;
  // Even = 1, odd = 0, first digit is the high bit. Number-system 1 digit 9 is
  // 0x1A. The 0.21.3 port stores 0x1 there, so that symbol would never match.
  var NS_PATTERNS = [
    [0x38, 0x34, 0x32, 0x31, 0x2C, 0x26, 0x23, 0x2A, 0x29, 0x25],
    [0x07, 0x0B, 0x0D, 0x0E, 0x13, 0x19, 0x1C, 0x15, 0x16, 0x1A]
  ];
  var START_END = [1, 1, 1];
  var UPCE_END = [1, 1, 1, 1, 1, 1];
  var MAX_AVG = 0.48;
  var MAX_IND = 0.7;
  var readerCache = null;

  function lgPatterns() {
    if (LG) return LG;
    LG = [];
    var i, j, rev;
    for (i = 0; i < 10; i++) LG.push(L_PATTERNS[i]);
    for (i = 0; i < 10; i++) {
      rev = [0, 0, 0, 0];
      for (j = 0; j < 4; j++) rev[j] = L_PATTERNS[i][3 - j];
      LG.push(rev);
    }
    return LG;
  }

  function checkDigit(body) {
    var sum = 0, i, alt = 0, d;
    for (i = body.length - 1; i >= 0; i--, alt++) {
      d = body.charCodeAt(i) - 48;
      if (d < 0 || d > 9) return -1;
      sum += d * (alt % 2 === 0 ? 3 : 1);
    }
    return (10 - (sum % 10)) % 10;
  }

  function checksumOk(digits) {
    if (!/^\d{8,14}$/.test(digits)) return false;
    return checkDigit(digits.slice(0, -1)) === (digits.charCodeAt(digits.length - 1) - 48);
  }

  // UPC-E (6, 7 or 8 digits) -> 12-digit UPC-A. valid means the check digit
  // matches the expanded code (or no check digit was supplied and we added it).
  function expandUpcE(input) {
    var d = String(input == null ? '' : input).replace(/\D/g, '');
    if (d.length === 6) d = '0' + d;
    if (d.length !== 7 && d.length !== 8) return null;
    var ns = d.charAt(0);
    if (ns !== '0' && ns !== '1') return null;
    var x = d.slice(1, 7);
    var last = x.charAt(5);
    var body;
    if (last === '0' || last === '1' || last === '2') body = ns + x.charAt(0) + x.charAt(1) + last + '0000' + x.charAt(2) + x.charAt(3) + x.charAt(4);
    else if (last === '3') body = ns + x.charAt(0) + x.charAt(1) + x.charAt(2) + '00000' + x.charAt(3) + x.charAt(4);
    else if (last === '4') body = ns + x.charAt(0) + x.charAt(1) + x.charAt(2) + x.charAt(3) + '00000' + x.charAt(4);
    else body = ns + x.slice(0, 5) + '0000' + last;
    if (body.length !== 11) return null;
    var cd = checkDigit(body);
    if (cd < 0) return null;
    var cds = String(cd);
    var given = d.length === 8 ? d.charAt(7) : null;
    return { upce: ns + x + cds, upca: body + cds, valid: given == null || given === cds };
  }

  function normalizeBarcode(text, format) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) return null;
    var fmt = String(format == null ? '' : format).toLowerCase().replace(/-/g, '_');
    var digits = raw.replace(/\D/g, '');
    var ex;
    if (fmt === 'upc_e' || fmt === '15') {
      ex = expandUpcE(digits);
      if (ex && ex.valid) return { code: ex.upca, upce: ex.upce, upca: ex.upca, format: 'UPC_E', raw: raw };
      // Some native detectors already return the expanded 12-digit UPC-A.
      if (digits.length === 12 && checksumOk(digits)) return { code: digits, upce: null, upca: digits, format: 'UPC_A', raw: raw };
      if (digits) return { code: digits, upce: digits, upca: null, format: 'UPC_E', raw: raw };
    }
    if ((fmt === 'upc_a' || fmt === '14') && digits.length === 12) {
      return { code: digits, upce: null, upca: digits, format: 'UPC_A', raw: raw };
    }
    if ((fmt === 'ean_13' || fmt === '7') && digits.length === 13) {
      if (digits.charAt(0) === '0' && checksumOk(digits)) {
        return { code: digits.slice(1), upce: null, upca: digits.slice(1), format: 'UPC_A', raw: raw };
      }
      return { code: digits, upce: null, upca: null, format: 'EAN_13', raw: raw };
    }
    if (fmt === 'ean_8' || fmt === '6') return { code: digits || raw, upce: null, upca: null, format: 'EAN_8', raw: raw };
    if (fmt === 'code_128' || fmt === '4') return { code: raw, upce: null, upca: null, format: 'CODE_128', raw: raw };
    return { code: raw, upce: null, upca: null, format: fmt ? fmt.toUpperCase() : 'OTHER', raw: raw };
  }

  function interpretManual(input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) return null;
    var digits = raw.replace(/\D/g, '');
    var ex, cleaned;
    if (digits.length === 6 || digits.length === 7 || digits.length === 8) {
      ex = expandUpcE(digits);
      if (ex && ex.valid) return { code: ex.upca, upce: ex.upce, upca: ex.upca, format: 'UPC_E', raw: digits };
    }
    if (digits.length === 8 && checksumOk(digits)) return { code: digits, upce: null, upca: null, format: 'EAN_8', raw: digits };
    if (digits.length === 12 && checksumOk(digits)) return { code: digits, upce: null, upca: digits, format: 'UPC_A', raw: digits };
    if (digits.length === 13 && checksumOk(digits)) {
      if (digits.charAt(0) === '0') return { code: digits.slice(1), upce: null, upca: digits.slice(1), format: 'UPC_A', raw: digits };
      return { code: digits, upce: null, upca: null, format: 'EAN_13', raw: digits };
    }
    if (digits.length >= 4) return { code: digits, upce: null, upca: null, format: 'MANUAL', raw: digits, unverified: true };
    cleaned = raw.replace(/\s+/g, '');
    if (cleaned.length >= 3) return { code: cleaned, upce: null, upca: null, format: 'MANUAL', raw: cleaned, unverified: true };
    return null;
  }

  function zxingReader(ZXing) {
    if (!readerCache || readerCache.lib !== ZXing) {
      var reader = new ZXing.MultiFormatReader();
      var hints = new Map();
      var F = ZXing.BarcodeFormat;
      // UPC_E is intentionally not asked of this reader. In 0.21.3 that reader
      // never returns a result, and running it on every row just slows the scan.
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [F.UPC_A, F.EAN_13, F.EAN_8, F.CODE_128]);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      reader.setHints(hints);
      readerCache = { lib: ZXing, reader: reader };
    }
    readerCache.reader.reset();
    return readerCache.reader;
  }

  function toLuma(rgba, width, height) {
    var out = new Uint8ClampedArray(width * height);
    var i, j = 0;
    for (i = 0; i < out.length; i++, j += 4) {
      out[i] = (rgba[j] * 0.299 + rgba[j + 1] * 0.587 + rgba[j + 2] * 0.114) | 0;
    }
    return out;
  }

  function rotateLuma(luma, width, height) {
    var nw = height, nh = width;
    var out = new Uint8ClampedArray(nw * nh);
    var y, x, nx, ny;
    for (y = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        nx = y;
        ny = width - 1 - x;
        out[ny * nw + nx] = luma[y * width + x];
      }
    }
    return { luma: out, width: nw, height: nh };
  }

  function nearest2(luma, width, height) {
    var nw = width * 2, nh = height * 2;
    var out = new Uint8ClampedArray(nw * nh);
    var y, x, yy, xx, p;
    for (y = 0; y < height; y++) {
      for (x = 0; x < width; x++) {
        p = luma[y * width + x];
        yy = y * 2;
        xx = x * 2;
        out[yy * nw + xx] = p;
        out[yy * nw + xx + 1] = p;
        out[(yy + 1) * nw + xx] = p;
        out[(yy + 1) * nw + xx + 1] = p;
      }
    }
    return { luma: out, width: nw, height: nh };
  }

  function findGuard(ZXing, row, rowOffset, whiteFirst, pattern) {
    var width = row.getSize();
    var counters = new Int32Array(pattern.length);
    var counterPosition = 0;
    var patternStart, isWhite, x, i, patternLength = pattern.length;
    rowOffset = whiteFirst ? row.getNextUnset(rowOffset) : row.getNextSet(rowOffset);
    if (rowOffset >= width) return null;
    patternStart = rowOffset;
    isWhite = whiteFirst;
    for (x = rowOffset; x < width; x++) {
      if (row.get(x) !== isWhite) {
        counters[counterPosition]++;
      } else {
        if (counterPosition === patternLength - 1) {
          if (ZXing.OneDReader.patternMatchVariance(counters, pattern, MAX_IND) < MAX_AVG) {
            return [patternStart, x];
          }
          patternStart += counters[0] + counters[1];
          for (i = 2; i < patternLength; i++) counters[i - 2] = counters[i];
          counters[patternLength - 2] = 0;
          counters[patternLength - 1] = 0;
          counterPosition--;
        } else {
          counterPosition++;
        }
        counters[counterPosition] = 1;
        isWhite = !isWhite;
      }
    }
    return null;
  }

  function findStart(ZXing, row) {
    var next = 0, guard, range, start, quiet;
    for (guard = 0; guard < 40; guard++) {
      range = findGuard(ZXing, row, next, false, START_END);
      if (!range) return null;
      start = range[0];
      next = range[1];
      quiet = start - (next - start);
      if (quiet >= 0) {
        try {
          if (row.isRange(quiet, start, false)) return range;
        } catch (e) { /* range ran off the row */ }
      }
      if (next >= row.getSize()) return null;
    }
    return null;
  }

  function decodeDigit(ZXing, row, counters, offset) {
    try {
      ZXing.OneDReader.recordPattern(row, offset, counters);
    } catch (e) {
      return -1;
    }
    var patterns = lgPatterns();
    var bestVar = MAX_AVG, best = -1, i, v;
    for (i = 0; i < patterns.length; i++) {
      v = ZXing.OneDReader.patternMatchVariance(counters, patterns[i], MAX_IND);
      if (v < bestVar) { bestVar = v; best = i; }
    }
    return best;
  }

  function decodeUpcERow(ZXing, row) {
    var start = findStart(ZXing, row);
    if (!start) return null;
    var counters = new Int32Array(4);
    var rowOffset = start[1];
    var end = row.getSize();
    var digits = '', lg = 0, x, best, c, text = null, ns, d, endRange, e1, quiet, ex;
    for (x = 0; x < 6 && rowOffset < end; x++) {
      best = decodeDigit(ZXing, row, counters, rowOffset);
      if (best < 0) return null;
      digits += String(best % 10);
      for (c = 0; c < 4; c++) rowOffset += counters[c];
      if (best >= 10) lg |= 1 << (5 - x);
    }
    if (digits.length !== 6) return null;
    for (ns = 0; ns <= 1 && !text; ns++) {
      for (d = 0; d < 10; d++) {
        if (lg === NS_PATTERNS[ns][d]) text = String(ns) + digits + String(d);
      }
    }
    if (!text) return null;
    endRange = findGuard(ZXing, row, rowOffset, true, UPCE_END);
    if (!endRange) return null;
    e1 = endRange[1];
    quiet = e1 + (e1 - endRange[0]);
    if (quiet >= row.getSize()) return null;
    try {
      if (!row.isRange(e1, quiet, false)) return null;
    } catch (e) {
      return null;
    }
    ex = expandUpcE(text);
    if (!ex || !ex.valid) return null;
    return ex;
  }

  function scanUpcE(ZXing, bitmap) {
    var height = bitmap.getHeight();
    if (!height) return null;
    // Stay near the middle of the frame (where the guide laser is) and cap the
    // number of rows so a phone can keep scanning while the cashier aims.
    var rowStep = Math.max(1, Math.round(height / 180));
    var middle = height >> 1;
    var limit = Math.min(height, 96);
    var row = null, x, steps, y, attempt, hit;
    // A single noisy row on a glossy pack can checksum-match by chance.
    // Accept a code only after a second, different row reads the same digits.
    var votes = {};
    for (x = 0; x < limit; x++) {
      steps = (x + 1) >> 1;
      y = middle + rowStep * ((x & 1) === 0 ? steps : -steps);
      if (y < 0 || y >= height) break;
      try { row = bitmap.getBlackRow(y, row); }
      catch (e) { continue; }
      for (attempt = 0; attempt < 2; attempt++) {
        if (attempt === 1) {
          try { row.reverse(); } catch (e) { break; }
        }
        hit = decodeUpcERow(ZXing, row);
        if (!hit) continue;
        if (!votes[hit.upce]) votes[hit.upce] = {};
        votes[hit.upce][y] = hit;
        if (Object.keys(votes[hit.upce]).length >= 2) return hit;
      }
    }
    return null;
  }

  function decodeBitmap(ZXing, bitmap) {
    var upce, reader, result;
    // UPC-E first. ZXing 0.21.3 never returns one, and its attempt is expensive.
    upce = scanUpcE(ZXing, bitmap);
    if (upce) return { code: upce.upca, upce: upce.upce, upca: upce.upca, format: 'UPC_E', raw: upce.upce };
    try {
      reader = zxingReader(ZXing);
      result = reader.decodeWithState(bitmap);
      if (result) return normalizeBarcode(result.getText(), ZXing.BarcodeFormat[result.getBarcodeFormat()]);
    } catch (e) { /* not found, or a format this frame doesn't contain */ }
    return null;
  }

  function bitmapFor(ZXing, luma, width, height, Binarizer) {
    return new ZXing.BinaryBitmap(new Binarizer(new ZXing.RGBLuminanceSource(luma, width, height)));
  }

  function decodeLuma(ZXing, luma, width, height, thorough) {
    var hit = decodeBitmap(ZXing, bitmapFor(ZXing, luma, width, height, ZXing.HybridBinarizer));
    if (hit || !thorough) return hit;
    // Global histogram handles flat, low-contrast frames that the hybrid
    // binarizer washes out (glossy packs under store lights).
    try {
      return decodeBitmap(ZXing, bitmapFor(ZXing, luma, width, height, ZXing.GlobalHistogramBinarizer));
    } catch (e) {
      return null;
    }
  }

  // Decode one camera frame (or a generated test image). Tries the image as
  // given, then rotated 90 degrees, because pack barcodes are often sideways
  // in a portrait phone camera. When thorough is set and the frame is not
  // huge, a 2x nearest-neighbor enlarge is tried too so a barcode only one
  // pixel per bar still clears the decoder's minimum bar width.
  function decodeScanImage(ZXing, rgba, width, height, opts) {
    if (!ZXing || !rgba || !width || !height) return null;
    opts = opts || {};
    var luma, hit, rot, big, rot2;
    try {
      luma = rgba.length === width * height ? rgba : toLuma(rgba, width, height);
      hit = decodeLuma(ZXing, luma, width, height, opts.thorough);
      if (hit) return hit;
      if (opts.rotate !== false) {
        rot = rotateLuma(luma, width, height);
        hit = decodeLuma(ZXing, rot.luma, rot.width, rot.height, opts.thorough);
        if (hit) return hit;
      }
      if (opts.thorough && width <= 1200 && height <= 1200) {
        big = nearest2(luma, width, height);
        hit = decodeLuma(ZXing, big.luma, big.width, big.height, false);
        if (hit) return hit;
        if (opts.rotate !== false) {
          rot2 = rotateLuma(big.luma, big.width, big.height);
          hit = decodeLuma(ZXing, rot2.luma, rot2.width, rot2.height, false);
          if (hit) return hit;
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  return {
    checkDigit: checkDigit,
    checksumOk: checksumOk,
    expandUpcE: expandUpcE,
    normalizeBarcode: normalizeBarcode,
    interpretManual: interpretManual,
    decodeScanImage: decodeScanImage
  };
});
