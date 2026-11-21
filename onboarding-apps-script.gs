/**
 * Varsa Group LLC — new hire onboarding.
 *
 * Deploy this as its own Apps Script, bound to a NEW spreadsheet.
 * Do not replace the inventory scanner's Code.gs, and do not use the
 * inventory spreadsheet or the ACH spreadsheet. Submissions are written
 * to a tab named Onboarding. Document photos go to a private Drive folder
 * named "Varsa Group Onboarding".
 *
 * The sheet and the Drive folder stay private to the Google account that
 * owns the script. "Who has access: Anyone" on the web app only lets the
 * onboarding page submit. It does not share the sheet. Do not log the
 * request body. Social Security numbers and identity documents are in it.
 *
 * Setup is in the repo README, section "Employee onboarding".
 * After you deploy the web app, paste its /exec URL into ONBOARDING_SHEET_URL
 * in onboarding.js.
 *
 * Uses the V8 runtime (the Apps Script default).
 */
var ONBOARDING_CHILD_CREDIT = 2200;
var ONBOARDING_OTHER_DEPENDENT_CREDIT = 500;
var ONBOARDING_STORES = ['Thomasville Chevron', 'Thomasville Outrun'];
var ONBOARDING_POSITIONS = ['Cashier', 'Sales associate', 'Food service', 'Shift lead', 'Assistant manager', 'Store manager', 'Maintenance', 'Other'];
var ONBOARDING_STATES = ['AK','AL','AR','AS','AZ','CA','CO','CT','DC','DE','FL','GA','GU','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MP','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VA','VI','VT','WA','WI','WV','WY','CAN','MEX'];
var ONBOARDING_HEADERS = [
  'Timestamp',
  'Submission ID',
  'Legal First Name',
  'Legal Middle Initial',
  'Legal Last Name',
  'Other Last Names Used',
  'Street',
  'Apt',
  'City',
  'State',
  'ZIP',
  'Phone',
  'Email',
  'Date of Birth',
  'Emergency Contact Name',
  'Emergency Contact Relationship',
  'Emergency Contact Phone',
  'Store',
  'Position',
  'Position Detail',
  'SSN',
  'W-4 Filing Status',
  'W-4 Two Jobs',
  'W-4 Qualifying Children',
  'W-4 Children Amount',
  'W-4 Other Dependents',
  'W-4 Other Dependents Amount',
  'W-4 Other Credits',
  'W-4 Dependents Total',
  'W-4 Other Income',
  'W-4 Deductions',
  'W-4 Extra Withholding',
  'W-4 Exempt',
  'I-9 Status',
  'I-9 A-Number',
  'I-9 I-94 Number',
  'I-9 Foreign Passport',
  'I-9 Passport Country',
  'I-9 Work Auth Expiration',
  'I-9 Preparer Used',
  'Preparer First Name',
  'Preparer Middle Initial',
  'Preparer Last Name',
  'Preparer Street',
  'Preparer City',
  'Preparer State',
  'Preparer ZIP',
  'Document Path',
  'List A Document',
  'List A Second Document',
  'List B Document',
  'List C Document',
  'Upload Links',
  'Employee Signature',
  'Signature Date',
  'Preparer Signature',
  'Consent'
];

function doGet() {
  return ContentService.createTextOutput('Varsa Group onboarding endpoint is running.');
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return onboardingJson_({ ok: false, error: 'empty' });
    var data = JSON.parse(e.postData.contents);
    var check = onboardingValidate_(data);
    if (!check.ok) return onboardingJson_({ ok: false, error: check.error });
    var saved = onboardingSaveFiles_(check.value);
    if (!saved.ok) return onboardingJson_({ ok: false, error: saved.error });
    var sheet = onboardingSheet_();
    var tz = Session.getScriptTimeZone() || 'America/Chicago';
    var stamp = Utilities.formatDate(new Date(), tz, 'MM/dd/yyyy hh:mm:ss a');
    var value = check.value;
    var row = [
      stamp,
      saved.id,
      onboardingPlain_(value.legalFirst),
      onboardingPlain_(value.legalMiddle),
      onboardingPlain_(value.legalLast),
      onboardingPlain_(value.otherLastNames),
      onboardingPlain_(value.street),
      onboardingPlain_(value.apt),
      onboardingPlain_(value.city),
      value.state,
      onboardingText_(value.zip),
      onboardingText_(value.phone),
      onboardingPlain_(value.email),
      onboardingText_(value.dob),
      onboardingPlain_(value.emergencyName),
      onboardingPlain_(value.emergencyRelationship),
      onboardingText_(value.emergencyPhone),
      value.store,
      value.position,
      onboardingPlain_(value.positionDetail),
      onboardingText_(value.ssn),
      value.w4.filingStatusLabel,
      value.w4.twoJobs ? 'Yes' : '',
      value.w4.childCount ? value.w4.childCount : '',
      value.w4.childAmount,
      value.w4.otherDependentCount ? value.w4.otherDependentCount : '',
      value.w4.otherDependentAmount,
      value.w4.otherCredits,
      value.w4.dependentsTotal,
      value.w4.otherIncome,
      value.w4.deductions,
      value.w4.extraWithholding,
      value.w4.exempt ? 'Yes' : '',
      value.i9.statusLabel,
      onboardingText_(value.i9.alienNumber),
      onboardingText_(value.i9.i94Number),
      onboardingPlain_(value.i9.foreignPassport),
      onboardingPlain_(value.i9.passportCountry),
      onboardingText_(value.i9.workAuthExpiration),
      value.i9.preparerUsed ? 'Yes' : 'No',
      value.i9.preparer ? onboardingPlain_(value.i9.preparer.first) : '',
      value.i9.preparer ? onboardingPlain_(value.i9.preparer.middle) : '',
      value.i9.preparer ? onboardingPlain_(value.i9.preparer.last) : '',
      value.i9.preparer ? onboardingPlain_(value.i9.preparer.street) : '',
      value.i9.preparer ? onboardingPlain_(value.i9.preparer.city) : '',
      value.i9.preparer ? value.i9.preparer.state : '',
      value.i9.preparer ? onboardingText_(value.i9.preparer.zip) : '',
      value.documents.path,
      onboardingPlain_(value.documents.listA),
      onboardingPlain_(value.documents.listASecond),
      onboardingPlain_(value.documents.listB),
      onboardingPlain_(value.documents.listC),
      saved.links,
      onboardingPlain_(value.signatureName),
      onboardingText_(value.signatureDate),
      value.i9.preparer ? onboardingPlain_(value.i9.preparer.signature) : '',
      'Yes'
    ];
    if (row.length !== ONBOARDING_HEADERS.length) return onboardingJson_({ ok: false, error: 'columns' });
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, row.length).setValues([row]);
    return onboardingJson_({ ok: true });
  } catch (err) {
    return onboardingJson_({ ok: false, error: 'save failed' });
  }
}

function onboardingSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Onboarding');
  if (!sheet) {
    var existing = ss.getSheets();
    if (existing.length === 1 && existing[0].getLastRow() === 0 && existing[0].getName() === 'Sheet1') {
      sheet = existing[0];
      sheet.setName('Onboarding');
    } else {
      sheet = ss.insertSheet('Onboarding');
    }
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(ONBOARDING_HEADERS);
    sheet.getRange(1, 1, 1, ONBOARDING_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function onboardingFolder_() {
  var name = 'Varsa Group Onboarding';
  var found = DriveApp.getFoldersByName(name);
  if (found.hasNext()) return found.next();
  return DriveApp.createFolder(name);
}

function onboardingSaveFiles_(value) {
  var tz = Session.getScriptTimeZone() || 'America/Chicago';
  var day = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var id = Utilities.getUuid();
  var folderName = day + ' ' + onboardingSafe_(value.legalLast) + ' ' + onboardingSafe_(value.legalFirst) + ' ' + id.slice(0, 8);
  var folder = onboardingFolder_().createFolder(folderName);
  var links = [];
  for (var i = 0; i < value.uploads.length; i++) {
    var upload = value.uploads[i];
    var bytes = Utilities.base64Decode(upload.data);
    if (!bytes || bytes.length < 4 || bytes[0] !== -1 || bytes[1] !== -40) return { ok: false, error: 'photo' };
    var blob = Utilities.newBlob(bytes, 'image/jpeg', upload.slot + '.jpg');
    var file = folder.createFile(blob);
    links.push(upload.slot + ': ' + file.getUrl());
  }
  return { ok: true, id: id, links: links.join('\n') };
}

function onboardingValidate_(data) {
  if (!data || data.kind !== 'onboarding') return { ok: false, error: 'not onboarding' };
  var first = onboardingClean_(data.legalFirst);
  var middle = onboardingClean_(data.legalMiddle);
  var last = onboardingClean_(data.legalLast);
  var otherLast = onboardingClean_(data.otherLastNames);
  var street = onboardingClean_(data.street);
  var apt = onboardingClean_(data.apt);
  var city = onboardingClean_(data.city);
  var state = onboardingClean_(data.state).toUpperCase();
  var zip = onboardingClean_(data.zip).toUpperCase();
  var phone = onboardingClean_(data.phone);
  var email = onboardingClean_(data.email);
  var dob = onboardingClean_(data.dob);
  if (!onboardingName_(first) || !onboardingName_(last)) return { ok: false, error: 'name' };
  if (middle && !/^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]$/.test(middle)) return { ok: false, error: 'middle' };
  if (otherLast && otherLast.length > 80) return { ok: false, error: 'other names' };
  if (!street || street.length > 80 || !city || city.length > 40) return { ok: false, error: 'address' };
  if (apt.length > 20) return { ok: false, error: 'apt' };
  if (ONBOARDING_STATES.indexOf(state) < 0) return { ok: false, error: 'state' };
  if (state === 'CAN') {
    if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(zip)) return { ok: false, error: 'zip' };
  } else if (!/^\d{5}$/.test(zip)) return { ok: false, error: 'zip' };
  var phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return { ok: false, error: 'phone' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: 'email' };
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return { ok: false, error: 'dob' };
  var emergencyName = onboardingClean_(data.emergencyName);
  var emergencyRelationship = onboardingClean_(data.emergencyRelationship);
  var emergencyPhone = onboardingClean_(data.emergencyPhone);
  if (!onboardingName_(emergencyName) || !onboardingName_(emergencyRelationship)) return { ok: false, error: 'emergency' };
  if (emergencyPhone.replace(/\D/g, '').length < 10) return { ok: false, error: 'emergency phone' };
  var store = onboardingClean_(data.store);
  var position = onboardingClean_(data.position);
  var positionDetail = onboardingClean_(data.positionDetail);
  if (ONBOARDING_STORES.indexOf(store) < 0) return { ok: false, error: 'store' };
  if (ONBOARDING_POSITIONS.indexOf(position) < 0) return { ok: false, error: 'position' };
  if (position !== 'Other') positionDetail = '';
  if (position === 'Other' && !positionDetail) return { ok: false, error: 'position detail' };
  var ssn = onboardingClean_(data.ssn);
  if (!onboardingSsn_(ssn)) return { ok: false, error: 'ssn' };
  var w4 = data.w4 || {};
  var filing = onboardingClean_(w4.filingStatus);
  var filingLabel = '';
  if (filing === 'single') filingLabel = 'Single or Married filing separately';
  else if (filing === 'married') filingLabel = 'Married filing jointly or Qualifying surviving spouse';
  else if (filing === 'hoh') filingLabel = 'Head of household';
  else if (filing) return { ok: false, error: 'filing status' };
  var exempt = w4.exempt === true;
  var childCount = onboardingCount_(w4.childCount);
  var otherCount = onboardingCount_(w4.otherDependentCount);
  if (childCount === null || otherCount === null) return { ok: false, error: 'dependents' };
  var childAmount = childCount ? childCount * ONBOARDING_CHILD_CREDIT : '';
  var otherAmount = otherCount ? otherCount * ONBOARDING_OTHER_DEPENDENT_CREDIT : '';
  var otherCredits = onboardingDollars_(w4.otherCredits);
  var otherIncome = onboardingDollars_(w4.otherIncome);
  var deductions = onboardingDollars_(w4.deductions);
  var extra = onboardingDollars_(w4.extraWithholding);
  if (otherCredits === null || otherIncome === null || deductions === null || extra === null) return { ok: false, error: 'amounts' };
  var totalNumber = (childAmount || 0) + (otherAmount || 0) + (otherCredits || 0);
  var dependentsTotal = totalNumber ? totalNumber : '';
  if (exempt) {
    if (filing || w4.twoJobs || childCount || otherCount || childAmount || otherAmount || otherCredits || otherIncome || deductions || extra) {
      return { ok: false, error: 'exempt' };
    }
    filingLabel = '';
  } else if (!filingLabel) return { ok: false, error: 'filing status' };
  if (!onboardingSame_(w4.childAmount, childAmount)) return { ok: false, error: 'child amount' };
  if (!onboardingSame_(w4.otherDependentAmount, otherAmount)) return { ok: false, error: 'dependent amount' };
  if (!onboardingSame_(w4.otherCredits, otherCredits)) return { ok: false, error: 'credits' };
  if (!onboardingSame_(w4.dependentsTotal, dependentsTotal)) return { ok: false, error: 'total' };
  if (!onboardingSame_(w4.otherIncome, otherIncome) || !onboardingSame_(w4.deductions, deductions) || !onboardingSame_(w4.extraWithholding, extra)) {
    return { ok: false, error: 'amounts' };
  }
  if (w4.twoJobs !== true && w4.twoJobs !== false) return { ok: false, error: 'two jobs' };

  var i9 = data.i9 || {};
  var status = onboardingClean_(i9.status);
  var statusLabel = '';
  if (status === 'citizen') statusLabel = 'A citizen of the United States';
  else if (status === 'national') statusLabel = 'A noncitizen national of the United States';
  else if (status === 'resident') statusLabel = 'A lawful permanent resident';
  else if (status === 'alien') statusLabel = 'An alien authorized to work';
  else return { ok: false, error: 'status' };
  var alienNumber = onboardingClean_(i9.alienNumber).toUpperCase();
  var i94Number = onboardingClean_(i9.i94Number).toUpperCase();
  var foreignPassport = onboardingClean_(i9.foreignPassport).toUpperCase();
  var passportCountry = onboardingClean_(i9.passportCountry);
  var workAuth = onboardingClean_(i9.workAuthExpiration);
  if (status === 'citizen' || status === 'national') {
    if (alienNumber || i94Number || foreignPassport || passportCountry || workAuth) return { ok: false, error: 'status fields' };
  }
  if (status === 'resident') {
    if (!/^A\d{7,9}$/.test(alienNumber)) return { ok: false, error: 'a-number' };
    if (i94Number || foreignPassport || passportCountry || workAuth) return { ok: false, error: 'status fields' };
  }
  if (status === 'alien') {
    if (workAuth && !/^\d{2}\/\d{2}\/\d{4}$/.test(workAuth)) return { ok: false, error: 'expiration' };
    var ways = (alienNumber ? 1 : 0) + (i94Number ? 1 : 0) + (foreignPassport ? 1 : 0);
    if (ways !== 1) return { ok: false, error: 'work auth' };
    if (alienNumber && !/^A\d{7,9}$/.test(alienNumber)) return { ok: false, error: 'a-number' };
    if (i94Number && !/^[A-Z0-9]{9,11}$/.test(i94Number)) return { ok: false, error: 'i94' };
    if (foreignPassport && (!/^[A-Z0-9]{6,20}$/.test(foreignPassport) || !passportCountry)) return { ok: false, error: 'passport' };
  }
  var preparer = null;
  if (i9.preparerUsed === true) {
    var raw = i9.preparer || {};
    preparer = {
      first: onboardingClean_(raw.first),
      middle: onboardingClean_(raw.middle),
      last: onboardingClean_(raw.last),
      street: onboardingClean_(raw.street),
      city: onboardingClean_(raw.city),
      state: onboardingClean_(raw.state).toUpperCase(),
      zip: onboardingClean_(raw.zip).toUpperCase(),
      signature: onboardingClean_(raw.signature)
    };
    if (!onboardingName_(preparer.first) || !onboardingName_(preparer.last) || !preparer.street || !preparer.city) return { ok: false, error: 'preparer' };
    if (preparer.middle && !/^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]$/.test(preparer.middle)) return { ok: false, error: 'preparer' };
    if (ONBOARDING_STATES.indexOf(preparer.state) < 0) return { ok: false, error: 'preparer' };
    if (preparer.state === 'CAN') {
      if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(preparer.zip)) return { ok: false, error: 'preparer' };
    } else if (!/^\d{5}$/.test(preparer.zip)) return { ok: false, error: 'preparer' };
    var prepFull = preparer.middle ? preparer.first + ' ' + preparer.middle + ' ' + preparer.last : preparer.first + ' ' + preparer.last;
    if (preparer.signature !== prepFull) return { ok: false, error: 'preparer signature' };
  } else if (i9.preparerUsed !== false) return { ok: false, error: 'preparer' };

  var documents = data.documents || {};
  var path = documents.path;
  if (path !== 'A' && path !== 'BC') return { ok: false, error: 'documents' };
  var listA = onboardingClean_(documents.listA);
  var listASecond = onboardingClean_(documents.listASecond);
  var listB = onboardingClean_(documents.listB);
  var listC = onboardingClean_(documents.listC);
  if (path === 'A') {
    if (!listA || listB || listC) return { ok: false, error: 'documents' };
  } else if (!listB || !listC || listA || listASecond) return { ok: false, error: 'documents' };
  var noBack = {};
  var noBackList = documents.noBack || [];
  if (!Array.isArray(noBackList)) return { ok: false, error: 'documents' };
  for (var n = 0; n < noBackList.length; n++) {
    if (typeof noBackList[n] !== 'string' || noBackList[n].slice(-5) !== '-back') return { ok: false, error: 'documents' };
    noBack[noBackList[n]] = true;
  }
  var required = path === 'A' ? ['listA-front', 'listA-back'] : ['listB-front', 'listB-back', 'listC-front', 'listC-back'];
  if (path === 'A' && listASecond) required = required.concat(['listA2-front', 'listA2-back']);
  required = required.filter(function (slot) { return !noBack[slot]; });
  var uploads = data.uploads || [];
  if (!Array.isArray(uploads) || uploads.length !== required.length) return { ok: false, error: 'uploads' };
  var seen = {};
  var cleanUploads = [];
  for (var u = 0; u < uploads.length; u++) {
    var upload = uploads[u];
    if (!upload || required.indexOf(upload.slot) < 0 || seen[upload.slot]) return { ok: false, error: 'uploads' };
    if (upload.contentType !== 'image/jpeg') return { ok: false, error: 'uploads' };
    var b64 = String(upload.data || '');
    if (b64.length < 80 || b64.length > 400000 || b64.indexOf('/9j') !== 0) return { ok: false, error: 'uploads' };
    seen[upload.slot] = true;
    cleanUploads.push({ slot: upload.slot, contentType: 'image/jpeg', data: b64 });
  }
  if (Object.keys(seen).length !== required.length) return { ok: false, error: 'uploads' };

  var signatureName = onboardingClean_(data.signatureName);
  var signatureDate = onboardingClean_(data.signatureDate);
  var fullName = middle ? first + ' ' + middle + ' ' + last : first + ' ' + last;
  if (signatureName !== fullName) return { ok: false, error: 'signature' };
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(signatureDate)) return { ok: false, error: 'signature date' };
  if (data.consent !== true) return { ok: false, error: 'consent' };

  return {
    ok: true,
    value: {
      legalFirst: first,
      legalMiddle: middle,
      legalLast: last,
      otherLastNames: otherLast,
      street: street,
      apt: apt,
      city: city,
      state: state,
      zip: zip,
      phone: phone,
      email: email,
      dob: dob,
      emergencyName: emergencyName,
      emergencyRelationship: emergencyRelationship,
      emergencyPhone: emergencyPhone,
      store: store,
      position: position,
      positionDetail: positionDetail,
      ssn: ssn,
      w4: {
        filingStatus: filing,
        filingStatusLabel: filingLabel,
        twoJobs: w4.twoJobs === true,
        childCount: childCount,
        childAmount: childAmount,
        otherDependentCount: otherCount,
        otherDependentAmount: otherAmount,
        otherCredits: otherCredits,
        dependentsTotal: dependentsTotal,
        otherIncome: otherIncome,
        deductions: deductions,
        extraWithholding: extra,
        exempt: exempt
      },
      i9: {
        status: status,
        statusLabel: statusLabel,
        alienNumber: alienNumber,
        i94Number: i94Number,
        foreignPassport: foreignPassport,
        passportCountry: passportCountry,
        workAuthExpiration: workAuth,
        preparerUsed: i9.preparerUsed === true,
        preparer: preparer
      },
      documents: {
        path: path,
        listA: listA,
        listASecond: listASecond,
        listB: listB,
        listC: listC
      },
      uploads: cleanUploads,
      signatureName: signatureName,
      signatureDate: signatureDate
    }
  };
}

function onboardingCount_(value) {
  if (value === '' || value == null) return 0;
  var number = Number(value);
  if (!isFinite(number) || number < 0 || number > 20 || Math.round(number) !== number) return null;
  return number;
}

function onboardingDollars_(value) {
  if (value === '' || value == null) return '';
  var number = Number(value);
  if (!isFinite(number) || number < 0 || number > 9999999 || Math.round(number) !== number) return null;
  return number === 0 ? '' : number;
}

function onboardingSame_(sent, expected) {
  var left = sent === '' || sent == null ? '' : String(sent);
  var right = expected === '' || expected == null ? '' : String(expected);
  return left === right;
}

function onboardingSsn_(value) {
  if (!/^\d{9}$/.test(value)) return false;
  var area = value.slice(0, 3);
  var group = value.slice(3, 5);
  var serial = value.slice(5);
  if (area === '000' || area === '666' || area.charAt(0) === '9') return false;
  if (group === '00' || serial === '0000') return false;
  if (/^(\d)\1{8}$/.test(value)) return false;
  if (value === '123456789' || value === '078051120' || value === '219099999') return false;
  return true;
}

function onboardingName_(value) {
  return /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF][A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF .'\-]{0,39}$/.test(value);
}

function onboardingClean_(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function onboardingSafe_(value) {
  var text = String(value || '').replace(/[^\w .-]+/g, '').trim();
  return text.slice(0, 40) || 'employee';
}

function onboardingPlain_(value) {
  var text = String(value == null ? '' : value);
  if (/^[=+\-@]/.test(text)) return "'" + text;
  return text;
}

function onboardingText_(value) {
  return "'" + String(value == null ? '' : value);
}

function onboardingJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
