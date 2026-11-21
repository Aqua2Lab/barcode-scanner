'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function stub() {
  return {
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener() {},
    focus() {},
    value: '',
    textContent: '',
    innerHTML: '',
    appendChild() {},
    getContext() { return {}; }
  };
}

function render(label, name) {
  const inserted = [];
  const sandbox = {
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    performance: { now() { return 0; } },
    fetch() { return Promise.resolve(); },
    navigator: {},
    document: {
      title: '',
      body: {
        getAttribute(attr) {
          if (attr === 'data-label') return label;
          if (attr === 'data-name') return name;
          return null;
        },
        insertAdjacentHTML(where, html) { inserted.push(html); }
      },
      getElementById() { return stub(); },
      createElement() { return stub(); },
      querySelector() { return stub(); }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), sandbox, { filename: 'app.js' });
  return { title: sandbox.document.title, html: inserted.join('\n'), store: sandbox.STORE_LABEL };
}

function page(file) {
  return fs.readFileSync(file, 'utf8');
}

const chevronPage = page('index.html');
const outrunPage = page('outrun.html');
const app = fs.readFileSync('app.js', 'utf8');

assert.ok(!fs.existsSync('chevron.html'), 'root stays the Chevron scanner; no chevron.html');
assert.ok(chevronPage.includes('data-label="Chevron"'));
assert.ok(chevronPage.includes('data-name="Thomasville Chevron"'));
assert.ok(chevronPage.includes('src="app.js"'));
assert.ok(chevronPage.includes('src="scanner.js"'));
assert.ok(!/choose a store|chevron\.html/i.test(chevronPage));

assert.ok(outrunPage.includes('data-label="Outrun"'));
assert.ok(outrunPage.includes('data-name="Thomasville Outrun"'));
assert.ok(outrunPage.includes('src="app.js"'));
assert.ok(outrunPage.includes('src="scanner.js"'));

const chevron = render('Chevron', 'Thomasville Chevron');
assert.strictEqual(chevron.store, 'Chevron');
assert.strictEqual(chevron.title, 'Thomasville Chevron');
assert.ok(chevron.html.includes('>Chevron<'));
assert.ok(chevron.html.includes('Thomasville Chevron'));
assert.ok(chevron.html.includes('Type UPC instead'));
assert.ok(chevron.html.includes('Count individual items, not boxes or cartons. Example: a carton of 10 packs = 10.'));
assert.ok(chevron.html.indexOf('qty-note') < chevron.html.indexOf('id="shelf"'));
assert.ok(chevron.html.includes('id="p1"'));
assert.ok(chevron.html.includes('id="cashier"'));
assert.ok(chevron.html.indexOf('id="p1"') < chevron.html.indexOf('id="cashier"'));
assert.ok(chevron.html.indexOf('id="cashier"') < chevron.html.indexOf('id="p2"'));
assert.ok(chevron.html.includes('id="manualUpc"'));

const outrun = render('Outrun', 'Thomasville Outrun');
assert.strictEqual(outrun.store, 'Outrun');
assert.strictEqual(outrun.title, 'Thomasville Outrun');
assert.ok(outrun.html.includes('>Outrun<'));
assert.ok(outrun.html.includes('Thomasville Outrun'));
assert.ok(outrun.html.includes('Type UPC instead'));
assert.ok(outrun.html.includes('Count individual items, not boxes or cartons. Example: a carton of 10 packs = 10.'));
assert.strictEqual(
  chevron.html.replace(/Chevron/g, 'STORE').replace(/Thomasville STORE/g, 'NAME'),
  outrun.html.replace(/Outrun/g, 'STORE').replace(/Thomasville STORE/g, 'NAME')
);

assert.ok(app.includes("const it={code,name:$('name').value.trim(),shelf:$('shelf').value,stock:$('stock').value,comment:$('comment').value,store:STORE_LABEL,cashier:cashierName()}"));
assert.ok(app.includes("STORE_LABEL = label") || app.includes('STORE_LABEL = label'));
assert.ok(app.includes('ScannerKit'));

const gs = fs.readFileSync('Code.gs', 'utf8');
assert.ok(gs.includes("['Timestamp','Barcode','Product','Shelf Qty','Stock Qty','Comment','Store','Cashier']"));
assert.ok(gs.includes('sh.getRange(2, 1, 1, 8)'));
assert.ok(gs.includes("d.store || ''"));
assert.ok(gs.includes("d.cashier || ''"));
assert.ok(gs.includes("sh.getRange(1, 7).setValue('Store')"));
assert.ok(gs.includes("sh.getRange(1, 8).setValue('Cashier')"));
assert.ok(!/insertColumn|moveColumns|deleteColumn/.test(gs));

function memoryStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    data
  };
}

function loadApp(storage) {
  const els = {};
  function el(id) {
    if (!els[id]) {
      const node = stub();
      node.listeners = {};
      node.addEventListener = function (type, fn) {
        (node.listeners[type] || (node.listeners[type] = [])).push(fn);
      };
      els[id] = node;
    }
    return els[id];
  }
  const sandbox = {
    console, setTimeout, clearTimeout,
    performance: { now() { return 0; } },
    fetch() { return Promise.resolve(); },
    navigator: {},
    localStorage: storage,
    document: {
      title: '',
      body: {
        getAttribute(attr) {
          if (attr === 'data-label') return 'Chevron';
          if (attr === 'data-name') return 'Thomasville Chevron';
          return null;
        },
        insertAdjacentHTML() {}
      },
      getElementById(id) { return el(id); },
      createElement() { return stub(); },
      querySelector() { return stub(); }
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('app.js', 'utf8'), sandbox, { filename: 'app.js' });
  return { sandbox, els };
}

const cashierStore = memoryStorage({ barcodeScannerCashier: 'Ava' });
const firstVisit = loadApp(cashierStore);
assert.strictEqual(firstVisit.els.cashier.value, 'Ava');
firstVisit.els.cashier.value = '  Sam ';
firstVisit.els.cashier.listeners.input.forEach(fn => fn());
assert.strictEqual(cashierStore.data.barcodeScannerCashier, 'Sam');
const laterVisit = loadApp(cashierStore);
assert.strictEqual(laterVisit.els.cashier.value, 'Sam');
laterVisit.els.cashier.value = '   ';
laterVisit.els.cashier.listeners.change.forEach(fn => fn());
assert.strictEqual(cashierStore.data.barcodeScannerCashier, '');
const clearedVisit = loadApp(cashierStore);
assert.strictEqual(clearedVisit.els.cashier.value, '');

const qtySandbox = { document: { title: '', body: { getAttribute(){ return 'Chevron'; }, insertAdjacentHTML(){} }, getElementById(){ return stub(); }, createElement(){ return stub(); }, querySelector(){ return stub(); } }, console, setTimeout, clearTimeout, performance: { now(){ return 0; } }, fetch(){ return Promise.resolve(); }, navigator: {} };
qtySandbox.window = qtySandbox;
vm.createContext(qtySandbox);
vm.runInContext(fs.readFileSync('app.js', 'utf8'), qtySandbox, { filename: 'app.js' });
assert.strictEqual(qtySandbox.hasQty('0'), true);
assert.strictEqual(qtySandbox.hasQty(0), true);
assert.strictEqual(qtySandbox.hasQty(''), false);
assert.strictEqual(qtySandbox.hasQty('   '), false);
assert.strictEqual(qtySandbox.hasQty('\n'), false);
assert.strictEqual(qtySandbox.hasQty('4'), true);
assert.ok(fs.readFileSync('app.js', 'utf8').includes("Enter shelf or stock quantity before saving"));
assert.ok(fs.readFileSync('app.js', 'utf8').includes("$('shelf').focus()"));

console.log('store pages share one scanner');
