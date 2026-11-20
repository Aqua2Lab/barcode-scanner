'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadAch() {
  const sandbox = {
    console: console,
    document: { getElementById() { return null; } }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('ach.js', 'utf8'), sandbox, { filename: 'ach.js' });
  return sandbox;
}

const ach = loadAch();
const page = fs.readFileSync('ach.html', 'utf8');
const css = fs.readFileSync('ach.css', 'utf8');
const gs = fs.readFileSync('ach-apps-script.gs', 'utf8');
const inventory = fs.readFileSync('Code.gs', 'utf8');

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '(336) 555-0199',
  address: '1 Main St, Thomasville, NC 27360',
  purpose: 'Employee',
  purposeDetail: '',
  bankName: 'First Bank',
  accountType: 'Checking',
  accountNumber: '123456789',
  confirmAccount: '123456789',
  routingNumber: '021000021',
  memo: 'May payroll',
  authorization: true
};

assert.strictEqual(ach.achValidRouting('021000021'), true);
assert.strictEqual(ach.achValidRouting('011000015'), true);
assert.strictEqual(ach.achValidRouting('121000248'), true);
assert.strictEqual(ach.achValidRouting('123456789'), false);
assert.strictEqual(ach.achValidRouting('021000022'), false);
assert.strictEqual(ach.achValidRouting('000000000'), false);
assert.strictEqual(ach.achValidRouting('02100002'), false);
assert.strictEqual(ach.achValidRouting('0210000211'), false);
assert.strictEqual(ach.achValidEmail('ada@example.com'), true);
assert.strictEqual(ach.achValidEmail('not-an-email'), false);
assert.strictEqual(ach.achValidEmail('a@b'), false);

const saved = ach.achValidate(valid);
assert.strictEqual(saved.ok, true);
assert.strictEqual(saved.payload.kind, 'ach');
assert.strictEqual(saved.payload.authorization, true);
assert.strictEqual(saved.payload.purposeDetail, '');
assert.strictEqual(saved.payload.accountNumber, '123456789');
assert.ok(!Object.prototype.hasOwnProperty.call(saved.payload, 'confirmAccount'));
assert.ok(!/ssn|ein|social/i.test(JSON.stringify(saved.payload)));

const other = ach.achValidate(Object.assign({}, valid, { purpose: 'Other', purposeDetail: '  Contractor  ' }));
assert.strictEqual(other.ok, true);
assert.strictEqual(other.payload.purposeDetail, 'Contractor');

function reject(patch, field) {
  const result = ach.achValidate(Object.assign({}, valid, patch));
  assert.strictEqual(result.ok, false, JSON.stringify(patch));
  assert.strictEqual(result.field, field);
  assert.ok(!result.message.includes('123456789'));
  assert.ok(!result.message.includes('021000021'));
  return result;
}

reject({ name: '   ' }, 'fullName');
reject({ email: 'ada@' }, 'email');
reject({ phone: '555-0199' }, 'phone');
reject({ address: '  ' }, 'address');
reject({ purpose: '' }, 'purpose');
reject({ purpose: 'Other', purposeDetail: '  ' }, 'purposeDetail');
reject({ bankName: '' }, 'bankName');
reject({ accountType: '' }, 'accountChecking');
reject({ accountNumber: '12ab', confirmAccount: '12ab' }, 'accountNumber');
reject({ accountNumber: '123', confirmAccount: '123' }, 'accountNumber');
reject({ confirmAccount: '123456788' }, 'confirmAccount');
reject({ routingNumber: '123456789' }, 'routingNumber');
reject({ authorization: false }, 'authorization');

assert.strictEqual(ach.achEndpointProblem(''), 'unconfigured');
assert.strictEqual(ach.achEndpointProblem(ach.ACH_BLOCKED_INVENTORY_URL), 'inventory');
assert.strictEqual(ach.achEndpointProblem('https://script.google.com/macros/s/ABC_def-123/exec'), '');

let posted = null;
const blocked = ach.achPost(ach.ACH_BLOCKED_INVENTORY_URL, saved.payload, function () {
  posted = true;
  return Promise.resolve();
});
blocked.then(function (response) {
  assert.strictEqual(response.ok, false);
  assert.strictEqual(posted, null);
  assert.ok(!response.message.includes('123456789'));
});

const empty = ach.achPost('', saved.payload, function () {
  throw new Error('should not send');
});
empty.then(function (response) {
  assert.strictEqual(response.ok, false);
  assert.strictEqual(response.problem, 'unconfigured');
});

const sent = [];
const ok = ach.achPost('https://script.google.com/macros/s/ABC_def-123/exec', saved.payload, function (url, options) {
  sent.push({ url: url, options: options });
  return Promise.resolve();
});
ok.then(function (response) {
  assert.strictEqual(response.ok, true);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].options.mode, 'no-cors');
  assert.strictEqual(sent[0].options.method, 'POST');
  const body = JSON.parse(sent[0].options.body);
  assert.strictEqual(body.kind, 'ach');
  assert.ok(!Object.prototype.hasOwnProperty.call(body, 'confirmAccount'));
});

const failed = ach.achPost('https://script.google.com/macros/s/ABC_def-123/exec', saved.payload, function () {
  return Promise.reject(new Error('offline'));
});
failed.then(function (response) {
  assert.strictEqual(response.ok, false);
  assert.ok(/connection/i.test(response.message));
  assert.ok(!response.message.includes('123456789'));
});

const wrap = { hidden: true };
const detail = { required: false, value: 'temp' };
assert.strictEqual(ach.achSyncPurpose('Other', wrap, detail), true);
assert.strictEqual(wrap.hidden, false);
assert.strictEqual(detail.required, true);
assert.strictEqual(ach.achSyncPurpose('Employee', wrap, detail), false);
assert.strictEqual(wrap.hidden, true);
assert.strictEqual(detail.value, '');

assert.ok(page.includes('<title>Varsa Group LLC – ACH Payment Setup</title>'));
assert.ok(page.includes('src="ach.js"'));
assert.ok(page.includes('href="ach.css"'));
assert.ok(page.includes('id="fullName"'));
assert.ok(page.includes('id="email"'));
assert.ok(page.includes('id="phone"'));
assert.ok(page.includes('id="address"'));
assert.ok(page.includes('>Employee</option>'));
assert.ok(page.includes('>Vendor</option>'));
assert.ok(page.includes('>Other</option>'));
assert.ok(page.includes('id="explain-wrap" hidden'));
assert.ok(page.includes('>Please explain</label>'));
assert.ok(page.includes('value="Checking"'));
assert.ok(page.includes('value="Savings"'));
assert.ok(page.includes('id="accountNumber"'));
assert.ok(page.includes('id="confirmAccount"'));
assert.ok(/id="accountNumber"[^>]*type="password"/.test(page));
assert.ok(/id="confirmAccount"[^>]*type="password"/.test(page));
assert.ok(page.includes('id="routingNumber"'));
assert.ok(page.includes('I authorize Varsa Group LLC to send payments to the bank account above.'));
assert.ok(page.includes('id="thanks"'));
assert.ok(page.includes('Varsa Group LLC received your payment details.'));
assert.ok(!/ssn|ein|social security|tax id/i.test(page));
assert.ok(!page.includes(ach.ACH_BLOCKED_INVENTORY_URL));
assert.ok(css.includes('[hidden]{display:none !important}'));

assert.strictEqual(ach.ACH_SHEET_URL, '');
assert.ok(fs.readFileSync('ach.js', 'utf8').includes('ACH_SHEET_URL'));
assert.ok(!inventory.includes('ACH'));
assert.ok(!inventory.includes('accountNumber'));
assert.ok(gs.includes("getSheetByName('ACH')"));
assert.ok(gs.includes('insertSheet(\'ACH\')') || gs.includes("insertSheet('ACH')"));
assert.ok(!/getSheets\(\)\[0\]/.test(gs));
assert.ok(gs.includes('3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])'));
assert.ok(gs.includes("data.kind !== 'ach'"));
assert.ok(gs.includes('insertRowBefore(2)'));
assert.ok(gs.includes("Authorization"));
assert.ok(!/ssn|ein|social/i.test(gs));

Promise.all([blocked, empty, ok, failed]).then(function () {
  console.log('ach page validates and posts only to its own endpoint');
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
