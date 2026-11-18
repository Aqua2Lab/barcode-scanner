'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const bwipjs = require('bwip-js');
const { PNG } = require('pngjs');
const ZXing = require('@zxing/library');
const kit = require('../scanner.js');

function checkDigit(body) {
  return kit.checkDigit(body);
}

async function barcodePng(bcid, text, opts) {
  opts = opts || {};
  const buf = await bwipjs.toBuffer({
    bcid: bcid,
    text: text,
    scale: opts.scale || 3,
    height: opts.height || 12,
    includetext: false,
    paddingwidth: opts.paddingwidth == null ? 10 : opts.paddingwidth,
    paddingheight: opts.paddingheight == null ? 8 : opts.paddingheight,
    backgroundcolor: 'FFFFFF'
  });
  const png = PNG.sync.read(buf);
  return { data: png.data, width: png.width, height: png.height };
}

function stockZxing(data, width, height) {
  const luma = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < luma.length; i++, j += 4) {
    luma[i] = (data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114) | 0;
  }
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.CODE_128
  ]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  const reader = new ZXing.MultiFormatReader();
  reader.setHints(hints);
  const bmp = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.RGBLuminanceSource(luma, width, height)));
  return reader.decodeWithState(bmp);
}

function rotateRGBA(data, width, height) {
  const nw = height, nh = width;
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = y, ny = width - 1 - x;
      const s = (y * width + x) * 4;
      const d = (ny * nw + nx) * 4;
      out[d] = data[s];
      out[d + 1] = data[s + 1];
      out[d + 2] = data[s + 2];
      out[d + 3] = data[s + 3];
    }
  }
  return { data: out, width: nw, height: nh };
}

function pasteCenter(src, sw, sh, W, H) {
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < rgba.length; i += 4) { rgba[i] = rgba[i + 1] = rgba[i + 2] = 255; rgba[i + 3] = 255; }
  const x0 = Math.floor((W - sw) / 2);
  const y0 = Math.floor((H - sh) / 2);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const s = (y * sw + x) * 4;
      const d = ((y0 + y) * W + (x0 + x)) * 4;
      rgba[d] = src[s];
      rgba[d + 1] = src[s + 1];
      rgba[d + 2] = src[s + 2];
      rgba[d + 3] = 255;
    }
  }
  return rgba;
}

async function main() {
  const cases = [
    ['02896223', '028200009623'],
    ['04252614', '042100005264'],
    ['01234565', '012345000065']
  ];
  for (const [upce, upca] of cases) {
    const ex = kit.expandUpcE(upce);
    assert.ok(ex && ex.valid, 'expand ' + upce);
    assert.strictEqual(ex.upca, upca, upce + ' expanded');
    assert.strictEqual(ex.upce, upce);
  }

  // Every last-digit rule, including the 0-4 rules the broken port mishandles.
  for (const last of ['0', '1', '2', '3', '4', '5', '7', '9']) {
    const mid = '12345' + last;
    const ex = kit.expandUpcE('0' + mid);
    assert.ok(ex && ex.upca.length === 12, 'rule ' + last);
    assert.ok(kit.checksumOk(ex.upca), 'checksum ' + ex.upca);
    const img = await barcodePng('upce', ex.upce);
    let stockFailed = false;
    try { stockZxing(img.data, img.width, img.height); }
    catch (e) { stockFailed = true; }
    assert.strictEqual(stockFailed, true, 'stock zxing should miss UPC-E ' + ex.upce);
    const hit = kit.decodeScanImage(ZXing, img.data, img.width, img.height, { thorough: true });
    assert.ok(hit, 'decode UPC-E last=' + last + ' ' + ex.upce);
    assert.strictEqual(hit.format, 'UPC_E');
    assert.strictEqual(hit.upce, ex.upce);
    assert.strictEqual(hit.code, ex.upca);
    assert.strictEqual(hit.upca, ex.upca);
  }

  // The pack in the photo: 0 289622 3, including held sideways.
  const marl = await barcodePng('upce', '02896223', { scale: 3 });
  const side = rotateRGBA(marl.data, marl.width, marl.height);
  const sideHit = kit.decodeScanImage(ZXing, side.data, side.width, side.height, { thorough: true });
  assert.ok(sideHit, 'sideways UPC-E');
  assert.strictEqual(sideHit.upce, '02896223');
  assert.strictEqual(sideHit.code, '028200009623');

  // Small code sitting in the middle of a phone-sized frame.
  const tiny = await barcodePng('upce', '02896223', { scale: 2, height: 8, paddingwidth: 8, paddingheight: 4 });
  const frame = pasteCenter(tiny.data, tiny.width, tiny.height, 1280, 720);
  const t0 = Date.now();
  const smallHit = kit.decodeScanImage(ZXing, frame, 1280, 720, { thorough: true });
  const ms = Date.now() - t0;
  assert.ok(smallHit, 'small UPC-E in a 1280x720 frame');
  assert.strictEqual(smallHit.code, '028200009623');
  console.log('small-frame decode', ms + ' ms', tiny.width + 'x' + tiny.height, 'inside 1280x720');

  // One-pixel-per-bar symbol needs the 2x enlarge path.
  const px = await barcodePng('upce', '02896223', { scale: 1, height: 10, paddingwidth: 12, paddingheight: 6 });
  const pxHit = kit.decodeScanImage(ZXing, px.data, px.width, px.height, { thorough: true });
  assert.ok(pxHit, '1px-module UPC-E');
  assert.strictEqual(pxHit.upce, '02896223');

  const upcaBody = '03600029145';
  const upca = upcaBody + checkDigit(upcaBody);
  const upcaImg = await barcodePng('upca', upca);
  const upcaHit = kit.decodeScanImage(ZXing, upcaImg.data, upcaImg.width, upcaImg.height);
  assert.ok(upcaHit, 'UPC-A');
  assert.strictEqual(upcaHit.format, 'UPC_A');
  assert.strictEqual(upcaHit.code, upca);

  const eanBody = '590123412345';
  const ean = eanBody + checkDigit(eanBody);
  const eanImg = await barcodePng('ean13', ean);
  const eanHit = kit.decodeScanImage(ZXing, eanImg.data, eanImg.width, eanImg.height);
  assert.ok(eanHit, 'EAN-13');
  assert.strictEqual(eanHit.format, 'EAN_13');
  assert.strictEqual(eanHit.code, ean);

  const ean8Body = '9638507';
  const ean8 = ean8Body + checkDigit(ean8Body);
  const ean8Img = await barcodePng('ean8', ean8);
  const ean8Hit = kit.decodeScanImage(ZXing, ean8Img.data, ean8Img.width, ean8Img.height);
  assert.ok(ean8Hit, 'EAN-8');
  assert.strictEqual(ean8Hit.format, 'EAN_8');
  assert.strictEqual(ean8Hit.code, ean8);

  const c128 = await barcodePng('code128', 'HELLO123');
  const c128Hit = kit.decodeScanImage(ZXing, c128.data, c128.width, c128.height);
  assert.ok(c128Hit, 'Code128');
  assert.strictEqual(c128Hit.format, 'CODE_128');
  assert.strictEqual(c128Hit.code, 'HELLO123');

  const typed = kit.interpretManual('0 289622 3');
  assert.strictEqual(typed.code, '028200009623');
  assert.strictEqual(typed.upce, '02896223');
  const typedA = kit.interpretManual('028200009623');
  assert.strictEqual(typedA.format, 'UPC_A');
  assert.strictEqual(typedA.code, '028200009623');
  const typedSix = kit.interpretManual('289622');
  assert.strictEqual(typedSix.code, '028200009623');
  const bad = kit.interpretManual('12345678');
  assert.ok(bad && bad.code === '12345678' && bad.unverified, 'bad check digit still accepted');
  assert.strictEqual(kit.interpretManual(''), null);
  assert.strictEqual(kit.interpretManual('  '), null);

  const fromDetector = kit.normalizeBarcode('02896223', 'upc_e');
  assert.strictEqual(fromDetector.code, '028200009623');
  assert.strictEqual(fromDetector.upce, '02896223');
  const expandedDetector = kit.normalizeBarcode('028200009623', 'upc_e');
  assert.strictEqual(expandedDetector.format, 'UPC_A');
  assert.strictEqual(expandedDetector.code, '028200009623');

  const photo = PNG.sync.read(fs.readFileSync(path.join(__dirname, 'fixtures/marlboro-upce.png')));
  const photoHit = kit.decodeScanImage(ZXing, photo.data, photo.width, photo.height, { rotate: true });
  assert.ok(photoHit, 'real pack photo');
  assert.strictEqual(photoHit.upce, '02896223');
  assert.strictEqual(photoHit.code, '028200009623');

  console.log('all barcode decode checks passed');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
