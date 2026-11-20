/**
 * Varsa Group LLC — ACH payment setup.
 *
 * Deploy this as its own Apps Script, bound to a NEW spreadsheet.
 * Do not replace the inventory scanner's Code.gs, and do not use the
 * inventory spreadsheet. Submissions are written to a tab named ACH.
 *
 * Setup is in the repo README, section "ACH payment setup".
 * After you deploy the web app, paste its /exec URL into ACH_SHEET_URL in ach.js.
 */
var ACH_HEADERS = [
  'Timestamp',
  'Full Name',
  'Email',
  'Phone',
  'Mailing Address',
  'Purpose',
  'Purpose Detail',
  'Bank Name',
  'Account Type',
  'Account Number',
  'Routing Number',
  'Memo',
  'Authorization'
];

function doGet() {
  return ContentService.createTextOutput('Varsa Group ACH endpoint is running.');
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return achJson_({ ok: false, error: 'empty' });
    var data = JSON.parse(e.postData.contents);
    var check = achValidate_(data);
    if (!check.ok) return achJson_({ ok: false, error: check.error });
    var sheet = achSheet_();
    var tz = Session.getScriptTimeZone() || 'America/Chicago';
    var stamp = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy hh:mm:ss a');
    sheet.insertRowBefore(2);
    var row = [
      stamp,
      achPlain_(check.value.name),
      achPlain_(check.value.email),
      achText_(check.value.phone),
      achPlain_(check.value.address),
      check.value.purpose,
      achPlain_(check.value.purposeDetail),
      achPlain_(check.value.bankName),
      check.value.accountType,
      achText_(check.value.accountNumber),
      achText_(check.value.routingNumber),
      achPlain_(check.value.memo),
      'Yes'
    ];
    sheet.getRange(2, 1, 1, row.length).setValues([row]);
    return achJson_({ ok: true });
  } catch (err) {
    return achJson_({ ok: false, error: 'save failed' });
  }
}

function achSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ACH');
  if (!sheet) {
    var existing = ss.getSheets();
    if (existing.length === 1 && existing[0].getLastRow() === 0 && existing[0].getName() === 'Sheet1') {
      sheet = existing[0];
      sheet.setName('ACH');
    } else {
      sheet = ss.insertSheet('ACH');
    }
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ACH_HEADERS);
    sheet.getRange(1, 1, 1, ACH_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function achValidate_(data) {
  if (!data || data.kind !== 'ach') return { ok: false, error: 'not ach' };
  var name = achTrim_(data.name);
  var email = achTrim_(data.email);
  var phone = achTrim_(data.phone);
  var address = achTrim_(data.address);
  var purpose = achTrim_(data.purpose);
  var purposeDetail = achTrim_(data.purposeDetail);
  var bankName = achTrim_(data.bankName);
  var accountType = achTrim_(data.accountType);
  var accountNumber = achTrim_(data.accountNumber);
  var routingNumber = achTrim_(data.routingNumber);
  var memo = achTrim_(data.memo);
  if (!name || name.length > 120) return { ok: false, error: 'name' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: 'email' };
  var phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return { ok: false, error: 'phone' };
  if (!address || address.length > 400) return { ok: false, error: 'address' };
  if (purpose !== 'Employee' && purpose !== 'Vendor' && purpose !== 'Other') return { ok: false, error: 'purpose' };
  if (purpose === 'Other' && !purposeDetail) return { ok: false, error: 'purpose detail' };
  if (purpose !== 'Other') purposeDetail = '';
  if (purposeDetail.length > 400) return { ok: false, error: 'purpose detail' };
  if (!bankName || bankName.length > 120) return { ok: false, error: 'bank' };
  if (accountType !== 'Checking' && accountType !== 'Savings') return { ok: false, error: 'account type' };
  if (!/^\d{4,17}$/.test(accountNumber)) return { ok: false, error: 'account' };
  if (!achValidRouting_(routingNumber)) return { ok: false, error: 'routing' };
  if (memo.length > 500) return { ok: false, error: 'memo' };
  if (data.authorization !== true) return { ok: false, error: 'authorization' };
  return {
    ok: true,
    value: {
      name: name,
      email: email,
      phone: phone,
      address: address,
      purpose: purpose,
      purposeDetail: purposeDetail,
      bankName: bankName,
      accountType: accountType,
      accountNumber: accountNumber,
      routingNumber: routingNumber,
      memo: memo
    }
  };
}

function achValidRouting_(value) {
  if (!/^\d{9}$/.test(value) || value === '000000000') return false;
  var d = value.split('').map(function (n) { return Number(n); });
  var sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

function achTrim_(value) {
  return String(value == null ? '' : value).trim();
}

function achPlain_(value) {
  var text = String(value == null ? '' : value);
  if (/^[=+\-@]/.test(text)) return "'" + text;
  return text;
}

function achText_(value) {
  return "'" + String(value == null ? '' : value);
}

function achJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
