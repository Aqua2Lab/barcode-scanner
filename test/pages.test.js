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
  return { title: sandbox.document.title, html: inserted.join('\n') };
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
assert.strictEqual(chevron.title, 'Thomasville Chevron');
assert.ok(chevron.html.includes('>Chevron<'));
assert.ok(chevron.html.includes('Thomasville Chevron'));
assert.ok(chevron.html.includes('Type UPC instead'));
assert.ok(chevron.html.includes('id="p1"'));
assert.ok(chevron.html.includes('id="manualUpc"'));

const outrun = render('Outrun', 'Thomasville Outrun');
assert.strictEqual(outrun.title, 'Thomasville Outrun');
assert.ok(outrun.html.includes('>Outrun<'));
assert.ok(outrun.html.includes('Thomasville Outrun'));
assert.ok(outrun.html.includes('Type UPC instead'));
assert.strictEqual(
  chevron.html.replace(/Chevron/g, 'STORE').replace(/Thomasville STORE/g, 'NAME'),
  outrun.html.replace(/Outrun/g, 'STORE').replace(/Thomasville STORE/g, 'NAME')
);

assert.ok(app.includes("const it={code,name:$('name').value.trim(),shelf:$('shelf').value,stock:$('stock').value,comment:$('comment').value}"));
assert.ok(!/it\s*=\s*\{[^}]*\bstore\b/.test(app), 'save payload must not add a store field');
assert.ok(app.includes('ScannerKit'));

console.log('store pages share one scanner');
