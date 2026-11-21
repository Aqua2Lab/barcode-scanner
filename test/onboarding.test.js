'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { PDFDocument } = require('pdf-lib');

function loadOnboarding() {
  const sandbox = {
    console: console,
    document: { getElementById() { return null; } },
    PDFLib: require('pdf-lib')
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('onboarding.js', 'utf8'), sandbox, { filename: 'onboarding.js' });
  return sandbox;
}

const pageJs = loadOnboarding();
const html = fs.readFileSync('onboarding.html', 'utf8');
const css = fs.readFileSync('onboarding.css', 'utf8');
const gs = fs.readFileSync('onboarding-apps-script.gs', 'utf8');
const jsSource = fs.readFileSync('onboarding.js', 'utf8');

const TINY_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda00080001000100003f00fbffd9',
  'hex'
).toString('base64');

function upload(slot) {
  return { slot: slot, contentType: 'image/jpeg', data: TINY_JPEG };
}

const today = new Date(2026, 10, 21);

function baseData(extra) {
  return Object.assign({
    legalFirst: 'Jane',
    legalMiddle: 'Q',
    legalLast: 'Public',
    otherLastNames: '',
    street: '100 Main Street',
    apt: '2',
    city: 'Thomasville',
    state: 'AL',
    zip: '36784',
    phone: '(334) 555-0199',
    email: 'jane.public@example.com',
    dob: '1998-04-15',
    emergencyName: 'John Public',
    emergencyRelationship: 'Spouse',
    emergencyPhone: '334-555-0100',
    store: 'Thomasville Chevron',
    position: 'Cashier',
    positionDetail: '',
    ssn: '401-23-4567',
    ssnConfirm: '401234567',
    filingStatus: 'married',
    twoJobs: true,
    childCount: '1',
    otherDependentCount: '1',
    otherCredits: '',
    otherIncome: '1000',
    deductions: '',
    extraWithholding: '25',
    exempt: false,
    i9Status: 'citizen',
    lprNumber: '',
    workUntil: '',
    alienNumber: '',
    i94Number: '',
    foreignPassport: '',
    passportCountry: '',
    preparerUsed: false,
    docPath: 'BC',
    listA: '',
    listB: pageJs.ONBOARDING_LISTS.B.items[0].title,
    listC: pageJs.ONBOARDING_LISTS.C.items[0].title,
    skipBack: { 'listB-back': true, 'listC-back': true },
    uploads: [upload('listB-front'), upload('listC-front')],
    signatureName: 'Jane Q Public',
    consent: true,
    today: today
  }, extra || {});
}

assert.strictEqual(pageJs.ONBOARDING_SHEET_URL, 'https://script.google.com/macros/s/AKfycbx4oxCdkt9JXtFZc774KINaak7p4mxOkq3biXuepnT23AmxesXwlUnHnp_8yW_kAy-W/exec');
assert.strictEqual(pageJs.ONBOARDING_CHILD_CREDIT, 2200);
assert.strictEqual(pageJs.ONBOARDING_OTHER_DEPENDENT_CREDIT, 500);
assert.strictEqual(pageJs.onboardingValidSsn('401-23-4567'), true);
assert.strictEqual(pageJs.onboardingValidSsn('000-12-3456'), false);
assert.strictEqual(pageJs.onboardingValidSsn('666-12-3456'), false);
assert.strictEqual(pageJs.onboardingValidSsn('900-12-3456'), false);
assert.strictEqual(pageJs.onboardingValidSsn('401-00-4567'), false);
assert.strictEqual(pageJs.onboardingValidSsn('401-23-0000'), false);
assert.strictEqual(pageJs.onboardingValidSsn('123-45-6789'), false);
assert.strictEqual(pageJs.onboardingValidSsn('111-11-1111'), false);
assert.strictEqual(pageJs.onboardingValidSsn('078051120'), false);
assert.strictEqual(pageJs.onboardingValidEmail('jane.public@example.com'), true);
assert.strictEqual(pageJs.onboardingValidEmail('not-an-email'), false);
assert.strictEqual(pageJs.onboardingValidName('José'), true);
assert.strictEqual(pageJs.onboardingEndpointProblem(''), 'unconfigured');
assert.strictEqual(pageJs.onboardingEndpointProblem(pageJs.ONBOARDING_BLOCKED_INVENTORY_URL), 'inventory');
assert.strictEqual(pageJs.onboardingEndpointProblem('https://script.google.com/macros/s/ABC_def-123/exec'), '');
assert.strictEqual(pageJs.onboardingTransportProblem('https:', 'aqua2lab.github.io'), '');
assert.strictEqual(pageJs.onboardingTransportProblem('http:', 'localhost'), '');
assert.strictEqual(pageJs.onboardingTransportProblem('http:', 'example.com'), 'insecure');

const saved = pageJs.onboardingValidate(baseData());
assert.strictEqual(saved.ok, true, saved.message);
assert.strictEqual(saved.payload.kind, 'onboarding');
assert.strictEqual(saved.payload.ssn, '401234567');
assert.strictEqual(saved.payload.signatureName, 'Jane Q Public');
assert.strictEqual(saved.payload.signatureDate, '11/21/2026');
assert.strictEqual(saved.payload.dob, '04/15/1998');
assert.strictEqual(saved.payload.w4.filingStatus, 'married');
assert.strictEqual(saved.payload.w4.twoJobs, true);
assert.strictEqual(saved.payload.w4.childAmount, 2200);
assert.strictEqual(saved.payload.w4.otherDependentAmount, 500);
assert.strictEqual(saved.payload.w4.dependentsTotal, 2700);
assert.strictEqual(saved.payload.w4.otherIncome, 1000);
assert.strictEqual(saved.payload.w4.extraWithholding, 25);
assert.strictEqual(saved.payload.w4.exempt, false);
assert.strictEqual(saved.payload.i9.status, 'citizen');
assert.strictEqual(saved.payload.documents.path, 'BC');
assert.strictEqual(saved.payload.uploads.length, 2);
assert.ok(!Object.prototype.hasOwnProperty.call(saved.payload, 'ssnConfirm'));
assert.ok(!saved.message);

const exempt = pageJs.onboardingValidate(baseData({
  exempt: true,
  filingStatus: 'married',
  twoJobs: true,
  childCount: '2',
  otherIncome: '50'
}));
assert.strictEqual(exempt.ok, true, exempt.message);
assert.strictEqual(exempt.payload.w4.exempt, true);
assert.strictEqual(exempt.payload.w4.filingStatus, '');
assert.strictEqual(exempt.payload.w4.twoJobs, false);
assert.strictEqual(exempt.payload.w4.childCount, 0);
assert.strictEqual(exempt.payload.w4.childAmount, '');
assert.strictEqual(exempt.payload.w4.otherIncome, '');

const alien = pageJs.onboardingValidate(baseData({
  i9Status: 'alien',
  workUntil: '2028-08-01',
  foreignPassport: 'ab123456',
  passportCountry: 'Mexico',
  preparerUsed: true,
  preparerFirst: 'Sam',
  preparerMiddle: 'R',
  preparerLast: 'Helper',
  preparerStreet: '5 Oak Avenue',
  preparerCity: 'Thomasville',
  preparerState: 'AL',
  preparerZip: '36784',
  preparerSignature: 'sam r helper',
  docPath: 'A',
  listA: pageJs.ONBOARDING_LISTS.A.items[4].title,
  listB: '',
  listC: '',
  skipBack: { 'listA-back': true, 'listA2-back': true },
  uploads: [upload('listA-front'), upload('listA2-front')]
}));
assert.strictEqual(alien.ok, true, alien.message);
assert.strictEqual(alien.payload.i9.status, 'alien');
assert.strictEqual(alien.payload.i9.foreignPassport, 'AB123456');
assert.strictEqual(alien.payload.i9.passportCountry, 'Mexico');
assert.strictEqual(alien.payload.i9.workAuthExpiration, '08/01/2028');
assert.strictEqual(alien.payload.i9.alienNumber, '');
assert.strictEqual(alien.payload.i9.preparer.signature, 'Sam R Helper');
assert.strictEqual(alien.payload.documents.listASecond, 'Form I-94 or Form I-94A');

const resident = pageJs.onboardingValidate(baseData({
  i9Status: 'resident',
  lprNumber: 'a12345678'
}));
assert.strictEqual(resident.ok, true, resident.message);
assert.strictEqual(resident.payload.i9.alienNumber, 'A12345678');

function reject(patch, field) {
  const result = pageJs.onboardingValidate(baseData(patch));
  assert.strictEqual(result.ok, false, JSON.stringify(patch));
  assert.strictEqual(result.field, field);
  assert.ok(!result.message.includes('401234567'));
  assert.ok(!result.message.includes('401-23-4567'));
  return result;
}

reject({ legalFirst: ' ' }, 'legalFirst');
reject({ email: 'jane@' }, 'email');
reject({ phone: '555-0199' }, 'phone');
reject({ dob: '2016-01-01' }, 'dob');
reject({ dob: '2027-01-01' }, 'dob');
reject({ dob: '1998-02-31' }, 'dob');
reject({ state: 'ZZ' }, 'state');
reject({ zip: '3678' }, 'zip');
reject({ ssn: '000-12-3456', ssnConfirm: '000-12-3456' }, 'ssn');
reject({ ssnConfirm: '401-23-4568' }, 'ssnConfirm');
reject({ filingStatus: '' }, 'filingSingle');
reject({ childCount: '99' }, 'childCount');
reject({ otherIncome: '12.50' }, 'otherIncome');
reject({ i9Status: '' }, 'statusCitizen');
reject({ i9Status: 'resident', lprNumber: '12' }, 'lprNumber');
reject({ i9Status: 'alien', alienNumber: 'A1234567', i94Number: '12345678901' }, 'alienNumber');
reject({ i9Status: 'alien' }, 'alienNumber');
reject({ docPath: '' }, 'docPathA');
reject({ uploads: [upload('listC-front')], skipBack: { 'listC-back': true } }, 'listBFront');
reject({ skipBack: {} }, 'listBBack');
reject({ signatureName: 'Jane Public' }, 'signatureName');
reject({ consent: false }, 'consent');
reject({ preparerUsed: true, preparerSignature: 'Someone Else', preparerFirst: 'Sam', preparerLast: 'Helper', preparerStreet: '5 Oak Avenue', preparerCity: 'Thomasville', preparerState: 'AL', preparerZip: '36784' }, 'preparerSignature');

let posted = null;
pageJs.onboardingPost(pageJs.ONBOARDING_BLOCKED_INVENTORY_URL, saved.payload, function () {
  posted = true;
  return Promise.resolve();
}).then(function (response) {
  assert.strictEqual(response.ok, false);
  assert.strictEqual(response.problem, 'inventory');
  assert.strictEqual(posted, null);
  assert.ok(!response.message.includes('401234567'));
});

const sent = [];
const endpoint = 'https://script.google.com/macros/s/ABC_def-123/exec';
const postedOk = pageJs.onboardingPost(endpoint, saved.payload, function (url, options) {
  sent.push({ url: url, options: options });
  return Promise.resolve();
});

const emptyPost = pageJs.onboardingPost('', saved.payload, function () {
  throw new Error('should not send');
});

function textField(form, name) {
  return form.getTextField(name).getText();
}

function runPdfs() {
  const w4Bytes = fs.readFileSync('forms/fw4-2026.pdf');
  const i9Bytes = fs.readFileSync('forms/i-9.pdf');
  return Promise.all([
    PDFDocument.load(w4Bytes),
    PDFDocument.load(i9Bytes),
    pageJs.onboardingFillW4(w4Bytes, saved.payload, { flatten: false }),
    pageJs.onboardingFillI9(i9Bytes, alien.payload, { flatten: false }),
    pageJs.onboardingFillW4(w4Bytes, exempt.payload, { flatten: true }),
    pageJs.onboardingFillW4(w4Bytes, saved.payload, { flatten: true }),
    pageJs.onboardingFillI9(i9Bytes, alien.payload, { flatten: true })
  ]).then(function (docs) {
    const blankW4 = docs[0];
    const blankI9 = docs[1];
    const stateOptions = blankI9.getForm().getDropdown('State').getOptions().map(function (option) { return option.trim(); }).filter(Boolean);
    assert.strictEqual(JSON.stringify(stateOptions), JSON.stringify(pageJs.ONBOARDING_STATES));
    assert.strictEqual(blankW4.getTitle(), '2026 Form W-4');
    assert.ok(blankI9.getTitle().indexOf('I-9') >= 0);

    return Promise.all([
      PDFDocument.load(docs[2]),
      PDFDocument.load(docs[3])
    ]).then(function (filled) {
      const w4 = filled[0].getForm();
      const W = pageJs.ONBOARDING_W4;
      assert.strictEqual(textField(w4, W.first), 'Jane Q');
      assert.strictEqual(textField(w4, W.last), 'Public');
      assert.strictEqual(textField(w4, W.address), '100 Main Street, Apt 2');
      assert.strictEqual(textField(w4, W.city), 'Thomasville, AL 36784');
      assert.strictEqual(textField(w4, W.ssn), '401-23-4567');
      assert.strictEqual(textField(w4, W.childAmt), '2,200');
      assert.strictEqual(textField(w4, W.otherDepAmt), '500');
      assert.strictEqual(textField(w4, W.total), '2,700');
      assert.strictEqual(textField(w4, W.otherIncome), '1,000');
      assert.strictEqual(textField(w4, W.extra), '25');
      assert.strictEqual(textField(w4, W.employer), 'Varsa Group LLC, Thomasville Chevron, Thomasville, AL');
      assert.strictEqual(w4.getCheckBox(W.married).isChecked(), true);
      assert.strictEqual(w4.getCheckBox(W.single).isChecked(), false);
      assert.strictEqual(w4.getCheckBox(W.twoJobs).isChecked(), true);
      assert.strictEqual(w4.getCheckBox(W.exempt).isChecked(), false);

      const i9 = filled[1].getForm();
      assert.strictEqual(textField(i9, 'Last Name (Family Name)'), 'Public');
      assert.strictEqual(textField(i9, 'First Name Given Name'), 'Jane');
      assert.strictEqual(textField(i9, 'Employee Middle Initial (if any)'), 'Q');
      assert.strictEqual(textField(i9, 'Employee Other Last Names Used (if any)'), 'N/A');
      assert.strictEqual(textField(i9, 'Apt Number (if any)'), '2');
      assert.strictEqual(textField(i9, 'Date of Birth mmddyyyy'), '04/15/1998');
      assert.strictEqual(textField(i9, 'US Social Security Number'), '401234567');
      assert.strictEqual(textField(i9, 'Employees E-mail Address'), 'jane.public@example.com');
      assert.strictEqual(textField(i9, 'Telephone Number'), '334-555-0199');
      assert.strictEqual(textField(i9, 'Signature of Employee'), 'Jane Q Public');
      assert.strictEqual(textField(i9, "Today's Date mmddyyy"), '11/21/2026');
      assert.strictEqual(i9.getCheckBox('CB_4').isChecked(), true);
      assert.strictEqual(i9.getCheckBox('CB_1').isChecked(), false);
      assert.strictEqual(textField(i9, 'Exp Date mmddyyyy'), '08/01/2028');
      assert.strictEqual(textField(i9, 'Foreign Passport Number and Country of IssuanceRow1'), 'AB123456, Mexico');
      assert.strictEqual(textField(i9, 'Signature of Preparer or Translator 0'), 'Sam R Helper');
      assert.strictEqual(textField(i9, 'Preparer or Translator Last Name (Family Name) 0'), 'Helper');
      assert.strictEqual(i9.getDropdown('State').getSelected()[0], 'AL');
      assert.strictEqual(i9.getDropdown('Preparer State 0').getSelected()[0], 'AL');

      fs.writeFileSync('/tmp/onboarding-w4-filled.pdf', Buffer.from(docs[5]));
      fs.writeFileSync('/tmp/onboarding-w4-exempt.pdf', Buffer.from(docs[4]));
      fs.writeFileSync('/tmp/onboarding-i9-filled.pdf', Buffer.from(docs[6]));
      if (fs.existsSync('/usr/bin/pdftotext')) {
        const w4Text = execFileSync('pdftotext', ['-layout', '/tmp/onboarding-w4-filled.pdf', '-'], { encoding: 'utf8' });
        assert.ok(w4Text.includes('Jane Q'));
        assert.ok(w4Text.includes('401-23-4567'));
        assert.ok(w4Text.includes('Varsa Group LLC'));
        assert.ok(w4Text.includes('Jane Q Public'));
        assert.ok(w4Text.includes('11/21/2026'));
        const i9Text = execFileSync('pdftotext', ['-layout', '/tmp/onboarding-i9-filled.pdf', '-'], { encoding: 'utf8' });
        assert.ok(i9Text.includes('AB123456, Mexico'));
        assert.ok(i9Text.includes('Sam R Helper'));
        assert.ok(i9Text.includes('401234567') || i9Text.includes('4 0 1 2 3 4 5 6 7'));
      }
      if (fs.existsSync('/usr/bin/pdftoppm')) {
        execFileSync('pdftoppm', ['-f', '1', '-l', '1', '-r', '144', '-png', '/tmp/onboarding-w4-filled.pdf', '/tmp/onboarding-w4']);
        const { PNG } = require('pngjs');
        const png = PNG.sync.read(fs.readFileSync('/tmp/onboarding-w4-1.png'));
        const married = blankW4.getForm().getCheckBox(W.married).acroField.getWidgets()[0].getRectangle();
        const exemptBox = blankW4.getForm().getCheckBox(W.exempt).acroField.getWidgets()[0].getRectangle();
        function darkness(rect) {
          const scale = 2;
          const x = Math.round((rect.x + rect.width / 2) * scale);
          const y = Math.round((791.968 - rect.y - rect.height / 2) * scale);
          let dark = 0;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const i = ((y + dy) * png.width + (x + dx)) * 4;
              if (png.data[i] < 80) dark += 1;
            }
          }
          return dark;
        }
        assert.ok(darkness(married) > 0, 'married checkbox should be marked');
        assert.strictEqual(darkness(exemptBox), 0);
      }
    });
  });
}

const form = {
  legalFirst: { value: 'Jane' },
  legalMiddle: { value: 'Q' },
  legalLast: { value: 'Public' },
  otherLastNames: { value: '' },
  street: { value: '100 Main Street' },
  apt: { value: '2' },
  city: { value: 'Thomasville' },
  state: { value: 'AL' },
  zip: { value: '36784' },
  phone: { value: '3345550199' },
  email: { value: 'jane.public@example.com' },
  dob: { value: '1998-04-15' },
  emergencyName: { value: 'John Public' },
  emergencyRelationship: { value: 'Spouse' },
  emergencyPhone: { value: '3345550100' },
  store: { value: 'Thomasville Chevron' },
  position: { value: 'Cashier' },
  positionDetail: { value: '' },
  ssn: { value: '401-23-4567' },
  ssnConfirm: { value: '401-23-4567' },
  filingStatus: { value: 'single' },
  twoJobs: { checked: false },
  childCount: { value: '' },
  otherDependentCount: { value: '' },
  otherCredits: { value: '' },
  otherIncome: { value: '' },
  deductions: { value: '' },
  extraWithholding: { value: '' },
  exempt: { checked: false },
  i9Status: { value: 'citizen' },
  lprNumber: { value: '' },
  workUntil: { value: '' },
  alienNumber: { value: '' },
  i94Number: { value: '' },
  foreignPassport: { value: '' },
  passportCountry: { value: '' },
  preparerUsed: { value: 'no' },
  preparerFirst: { value: '' },
  preparerMiddle: { value: '' },
  preparerLast: { value: '' },
  preparerStreet: { value: '' },
  preparerCity: { value: '' },
  preparerState: { value: '' },
  preparerZip: { value: '' },
  preparerSignature: { value: '' },
  docPath: { value: 'A' },
  listA: { value: 'U.S. Passport or U.S. Passport Card' },
  listB: { value: '' },
  listC: { value: '' },
  listANoBack: { checked: true },
  listA2NoBack: { checked: false },
  listBNoBack: { checked: false },
  listCNoBack: { checked: false },
  signatureName: { value: 'Jane Q Public' },
  consent: { checked: true }
};
const fromForm = pageJs.onboardingValidate(pageJs.onboardingReadForm(form, {
  'listA-front': { contentType: 'image/jpeg', data: TINY_JPEG }
}));
assert.strictEqual(fromForm.ok, true, fromForm.message);
assert.strictEqual(fromForm.payload.w4.filingStatus, 'single');
assert.strictEqual(fromForm.payload.documents.listA, 'U.S. Passport or U.S. Passport Card');
assert.strictEqual(JSON.stringify(fromForm.payload.documents.noBack), '["listA-back"]');

assert.ok(html.includes('<title>Varsa Group LLC – New Hire Onboarding</title>'));
assert.ok(html.includes('src="onboarding.js"'));
assert.ok(html.includes('src="vendor/pdf-lib.min.js"'));
assert.ok(html.includes('href="onboarding.css"'));
assert.ok(html.includes('Under penalties of perjury, I declare that this certificate, to the best of my knowledge and belief, is true, correct, and complete.'));
assert.ok(html.includes('I claim exemption from withholding for 2026'));
assert.ok(html.includes('Multiply the number of qualifying children under age 17 by $2,200'));
assert.ok(html.includes('Multiply the number of other dependents by $500'));
assert.ok(html.includes('Single or Married filing separately'));
assert.ok(html.includes('Married filing jointly or Qualifying surviving spouse'));
assert.ok(html.includes('Head of household'));
assert.ok(html.includes('A citizen of the United States'));
assert.ok(html.includes('A noncitizen national of the United States'));
assert.ok(html.includes('A lawful permanent resident'));
assert.ok(html.includes('An alien authorized to work until'));
assert.ok(html.includes('USCIS A-Number'));
assert.ok(html.includes('Form I-94 admission number'));
assert.ok(html.includes('Foreign passport number'));
assert.ok(html.includes('Country of issuance'));
assert.ok(html.includes('Thomasville Chevron'));
assert.ok(html.includes('Thomasville Outrun'));
assert.ok(html.includes('id="downloadW4"'));
assert.ok(html.includes('id="downloadI9"'));
assert.ok(!html.includes(pageJs.ONBOARDING_BLOCKED_INVENTORY_URL));
assert.ok(jsSource.includes('U.S. Passport or U.S. Passport Card'));
assert.ok(jsSource.includes('NOT VALID FOR EMPLOYMENT'));
assert.ok(jsSource.includes('VALID FOR WORK ONLY WITH INS AUTHORIZATION'));
assert.ok(jsSource.includes('VALID FOR WORK ONLY WITH DHS AUTHORIZATION'));
assert.ok(jsSource.includes("Driver's license or ID card"));
assert.ok(jsSource.includes('TODO: paste the /exec URL'));
assert.ok(!/console\.log/.test(jsSource));
assert.ok(!/localStorage|sessionStorage|indexedDB/.test(jsSource));
assert.ok(css.includes('[hidden]{display:none !important}'));
assert.ok(gs.includes("getSheetByName('Onboarding')"));
assert.ok(gs.includes("insertSheet('Onboarding')"));
assert.ok(gs.includes('insertRowBefore(2)'));
assert.ok(gs.includes("data.kind !== 'onboarding'"));
assert.ok(gs.includes('DriveApp'));
assert.ok(gs.includes('Varsa Group Onboarding'));
assert.ok(gs.includes('ONBOARDING_CHILD_CREDIT = 2200'));
assert.ok(gs.includes('ONBOARDING_OTHER_DEPENDENT_CREDIT = 500'));
assert.ok(!/Logger\.log/.test(gs));
assert.ok(!/getSheets\(\)\[0\]/.test(gs));
assert.ok(gs.includes('row.length !== ONBOARDING_HEADERS.length'));
const headerBlock = gs.slice(gs.indexOf('var ONBOARDING_HEADERS'), gs.indexOf('];', gs.indexOf('var ONBOARDING_HEADERS')));
assert.strictEqual(headerBlock.split('\n').filter(function (line) { return line.indexOf("'") >= 0; }).length, 57);

Promise.all([
  postedOk.then(function (response) {
    assert.strictEqual(response.ok, true);
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].options.mode, 'no-cors');
    assert.strictEqual(sent[0].options.method, 'POST');
    const body = JSON.parse(sent[0].options.body);
    assert.strictEqual(body.kind, 'onboarding');
    assert.strictEqual(body.ssn, '401234567');
    assert.ok(!Object.prototype.hasOwnProperty.call(body, 'ssnConfirm'));
  }),
  emptyPost.then(function (response) {
    assert.strictEqual(response.ok, false);
    assert.strictEqual(response.problem, 'unconfigured');
  }),
  runPdfs()
]).then(function () {
  console.log('onboarding form validates, posts only to its own endpoint, and fills W-4 and I-9');
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
