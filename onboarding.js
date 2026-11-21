// =============================================================================
// ONBOARDING_SHEET_URL
// Paste the web app URL from deploying onboarding-apps-script.gs. See the
// README section "Employee onboarding". Leave this empty until that
// deployment exists.
// TODO: paste the /exec URL here after the Apps Script web app is deployed.
// Do not paste the inventory scanner URL or the ACH payment URL.
// Social Security numbers and identity documents must not go to those sheets.
// =============================================================================
var ONBOARDING_SHEET_URL = 'https://script.google.com/macros/s/AKfycbx4oxCdkt9JXtFZc774KINaak7p4mxOkq3biXuepnT23AmxesXwlUnHnp_8yW_kAy-W/exec';

var ONBOARDING_BLOCKED_INVENTORY_URL = 'https://script.google.com/macros/s/AKfycbzBJ1M9Cu3l9e_PhcxyTLBwOdkX5-cwsnXQ-Z8P-ZX9c_gDtYJ0LoM-pIS6VtvDzL0/exec';

// 2026 Form W-4 Step 3. Qualifying children under 17 are $2,200. Other dependents are $500.
var ONBOARDING_CHILD_CREDIT = 2200;
var ONBOARDING_OTHER_DEPENDENT_CREDIT = 500;

var ONBOARDING_STORES = ['Thomasville Chevron', 'Thomasville Outrun'];
var ONBOARDING_POSITIONS = ['Cashier', 'Sales associate', 'Food service', 'Shift lead', 'Assistant manager', 'Store manager', 'Maintenance', 'Other'];
var ONBOARDING_FILING = {
  single: 'Single or Married filing separately',
  married: 'Married filing jointly or Qualifying surviving spouse',
  hoh: 'Head of household'
};
var ONBOARDING_I9_STATUS = {
  citizen: 'A citizen of the United States',
  national: 'A noncitizen national of the United States',
  resident: 'A lawful permanent resident',
  alien: 'An alien authorized to work'
};
// Option values from the State dropdown on USCIS Form I-9 Edition 01/20/25.
var ONBOARDING_STATES = ['AK','AL','AR','AS','AZ','CA','CO','CT','DC','DE','FL','GA','GU','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MP','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VA','VI','VT','WA','WI','WV','WY','CAN','MEX'];

var ONBOARDING_W4 = {
  first: 'topmostSubform[0].Page1[0].Step1a[0].f1_01[0]',
  last: 'topmostSubform[0].Page1[0].Step1a[0].f1_02[0]',
  address: 'topmostSubform[0].Page1[0].Step1a[0].f1_03[0]',
  city: 'topmostSubform[0].Page1[0].Step1a[0].f1_04[0]',
  ssn: 'topmostSubform[0].Page1[0].f1_05[0]',
  single: 'topmostSubform[0].Page1[0].c1_1[0]',
  married: 'topmostSubform[0].Page1[0].c1_1[1]',
  hoh: 'topmostSubform[0].Page1[0].c1_1[2]',
  twoJobs: 'topmostSubform[0].Page1[0].c1_2[0]',
  childAmt: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]',
  otherDepAmt: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]',
  total: 'topmostSubform[0].Page1[0].f1_08[0]',
  otherIncome: 'topmostSubform[0].Page1[0].f1_09[0]',
  deductions: 'topmostSubform[0].Page1[0].f1_10[0]',
  extra: 'topmostSubform[0].Page1[0].f1_11[0]',
  exempt: 'topmostSubform[0].Page1[0].c1_3[0]',
  employer: 'topmostSubform[0].Page1[0].f1_12[0]'
};

var ONBOARDING_LISTS = {
  A: {
    items: [
      { title: 'U.S. Passport or U.S. Passport Card' },
      { title: 'Permanent Resident Card or Alien Registration Receipt Card (Form I-551)' },
      { title: 'Foreign passport with a temporary I-551 stamp or temporary I-551 printed notation on a machine-readable immigrant visa' },
      { title: 'Employment Authorization Document that contains a photograph (Form I-766)' },
      {
        title: 'Foreign passport and Form I-94 or Form I-94A for an individual temporarily authorized to work for a specific employer because of status or parole',
        detail: 'The Form I-94 or I-94A must show the same name as the passport and an endorsement of status or parole that has not expired, and the job must not conflict with any restriction on the form.',
        combo: true,
        secondTitle: 'Form I-94 or Form I-94A'
      },
      {
        title: 'Passport from the Federated States of Micronesia (FSM) or the Republic of the Marshall Islands (RMI) with Form I-94 or Form I-94A',
        detail: 'The Form I-94 or I-94A must show nonimmigrant admission under the Compact of Free Association Between the United States and the FSM or RMI.',
        combo: true,
        secondTitle: 'Form I-94 or Form I-94A'
      }
    ],
    receipts: [
      { title: 'Receipt for a replacement of a lost, stolen, or damaged List A document' },
      { title: 'Form I-94 issued to a lawful permanent resident that contains an I-551 stamp and a photograph' },
      { title: 'Form I-94 with RE notation or refugee stamp issued to a refugee' }
    ]
  },
  B: {
    note: 'For persons under age 18 who are unable to present a document listed above: school record or report card; clinic, doctor, or hospital record; day-care or nursery school record.',
    items: [
      { title: "Driver's license or ID card issued by a State or outlying possession of the United States, with a photograph or name, date of birth, sex, height, eye color, and address" },
      { title: 'ID card issued by federal, state, or local government agencies or entities, with a photograph or name, date of birth, sex, height, eye color, and address' },
      { title: 'School ID card with a photograph' },
      { title: "Voter's registration card" },
      { title: 'U.S. Military card or draft record' },
      { title: "Military dependent's ID card" },
      { title: 'U.S. Coast Guard Merchant Mariner Card' },
      { title: 'Native American tribal document' },
      { title: 'Driver\'s license issued by a Canadian government authority' },
      { title: 'School record or report card (under age 18 only)' },
      { title: 'Clinic, doctor, or hospital record (under age 18 only)' },
      { title: 'Day-care or nursery school record (under age 18 only)' }
    ],
    receipts: [
      { title: 'Receipt for a replacement of a lost, stolen, or damaged List B document' }
    ]
  },
  C: {
    note: 'The Form I-766 Employment Authorization Document is a List A document, not a List C document. Examples of a Department of Homeland Security employment authorization document are in Sections 7 and 13 of the M-274.',
    items: [
      { title: 'Social Security Account Number card without a work restriction', detail: 'The card cannot say NOT VALID FOR EMPLOYMENT, VALID FOR WORK ONLY WITH INS AUTHORIZATION, or VALID FOR WORK ONLY WITH DHS AUTHORIZATION.' },
      { title: 'Certification of report of birth issued by the Department of State (Forms DS-1350, FS-545, FS-240)' },
      { title: 'Original or certified copy of a birth certificate issued by a State, county, municipal authority, or territory of the United States bearing an official seal' },
      { title: 'Native American tribal document (List C)' },
      { title: 'U.S. Citizen ID Card (Form I-197)' },
      { title: 'Identification Card for Use of Resident Citizen in the United States (Form I-179)' },
      { title: 'Employment authorization document issued by the Department of Homeland Security (List C)' }
    ],
    receipts: [
      { title: 'Receipt for a replacement of a lost, stolen, or damaged List C document' }
    ]
  }
};

var ONBOARDING_SLOT_FIELD = {
  'listA-front': 'listAFront',
  'listA-back': 'listABack',
  'listA2-front': 'listA2Front',
  'listA2-back': 'listA2Back',
  'listB-front': 'listBFront',
  'listB-back': 'listBBack',
  'listC-front': 'listCFront',
  'listC-back': 'listCBack'
};

function onboardingDigits(value) {
  return String(value == null ? '' : value).replace(/\D/g, '');
}

function onboardingNormalizeText(value) {
  return String(value == null ? '' : value)
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function onboardingPad(n) {
  n = String(n);
  return n.length < 2 ? '0' + n : n;
}

function onboardingParseIso(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  if (year < 1900 || year > 2100) return null;
  var date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { y: year, m: month, d: day };
}

function onboardingFormatMDY(iso) {
  var parts = onboardingParseIso(iso);
  if (!parts) return '';
  return onboardingPad(parts.m) + '/' + onboardingPad(parts.d) + '/' + parts.y;
}

function onboardingAge(iso, today) {
  var parts = onboardingParseIso(iso);
  if (!parts) return -1;
  var current = today || new Date();
  var age = current.getFullYear() - parts.y;
  if ((current.getMonth() + 1) * 100 + current.getDate() < parts.m * 100 + parts.d) age -= 1;
  return age;
}

function onboardingTodayMDY(date) {
  var current = date || new Date();
  return onboardingPad(current.getMonth() + 1) + '/' + onboardingPad(current.getDate()) + '/' + current.getFullYear();
}

function onboardingValidEmail(value) {
  var email = String(value || '');
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function onboardingValidSsn(value) {
  var ssn = onboardingDigits(value);
  if (!/^\d{9}$/.test(ssn)) return false;
  var area = ssn.slice(0, 3);
  var group = ssn.slice(3, 5);
  var serial = ssn.slice(5);
  if (area === '000' || area === '666' || area.charAt(0) === '9') return false;
  if (group === '00' || serial === '0000') return false;
  if (/^(\d)\1{8}$/.test(ssn)) return false;
  if (ssn === '123456789' || ssn === '078051120' || ssn === '219099999') return false;
  return true;
}

function onboardingFormatSsn(digits) {
  return digits.slice(0, 3) + '-' + digits.slice(3, 5) + '-' + digits.slice(5);
}

function onboardingFormatSsnInput(value) {
  var digits = onboardingDigits(value).slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return digits.slice(0, 3) + '-' + digits.slice(3);
  return onboardingFormatSsn(digits);
}

function onboardingValidName(value) {
  return /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF][A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF .'\-]{0,39}$/.test(value);
}

function onboardingValidMiddle(value) {
  return value === '' || /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]$/.test(value);
}

function onboardingValidStreet(value) {
  return /^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF][A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF .,'#\/\-]{1,79}$/.test(value);
}

function onboardingValidCity(value) {
  return /^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF][A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF .'\-]{1,39}$/.test(value);
}

function onboardingValidApt(value) {
  if (!value) return true;
  return /^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF][A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF .'#\-]{0,19}$/.test(value);
}

function onboardingValidDetail(value) {
  return /^[A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF][A-Za-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF .,'#\/\-]{0,79}$/.test(value);
}

function onboardingNormalizeZip(state, zip) {
  var text = onboardingNormalizeText(zip).toUpperCase();
  if (state === 'CAN') {
    var compact = text.replace(/\s/g, '');
    return /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact) ? compact : '';
  }
  return /^\d{5}$/.test(text) ? text : '';
}

function onboardingNormalizeANumber(value) {
  var raw = onboardingNormalizeText(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.charAt(0) === 'A') raw = raw.slice(1);
  return /^\d{7,9}$/.test(raw) ? 'A' + raw : '';
}

function onboardingCount(value) {
  var text = String(value == null ? '' : value).trim();
  if (!text) return { ok: true, count: 0 };
  if (!/^\d{1,2}$/.test(text)) return { ok: false, count: 0 };
  var count = Number(text);
  if (count > 20) return { ok: false, count: 0 };
  return { ok: true, count: count };
}

function onboardingWholeDollars(value) {
  var text = String(value == null ? '' : value).trim().replace(/[$,]/g, '');
  if (!text) return { ok: true, amount: '' };
  if (!/^\d{1,7}$/.test(text)) return { ok: false, amount: '' };
  var amount = Number(text);
  return { ok: true, amount: amount === 0 ? '' : amount };
}

function onboardingMoney(amount) {
  return String(Math.round(Number(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function onboardingFullName(first, middle, last) {
  return middle ? first + ' ' + middle + ' ' + last : first + ' ' + last;
}

function onboardingPhonePdf(phone) {
  var digits = onboardingDigits(phone);
  if (digits.length === 10) return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
  if (digits.length === 11 && digits.charAt(0) === '1') return digits.slice(1, 4) + '-' + digits.slice(4, 7) + '-' + digits.slice(7);
  return onboardingNormalizeText(phone);
}

function onboardingEndpointProblem(url) {
  var endpoint = String(url == null ? '' : url).trim().replace(/\/$/, '');
  if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) return 'unconfigured';
  if (endpoint === ONBOARDING_BLOCKED_INVENTORY_URL) return 'inventory';
  return '';
}

function onboardingTransportProblem(protocol, hostname) {
  if (protocol === 'https:') return '';
  var host = String(hostname || '');
  if (protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]')) return '';
  return 'insecure';
}

function onboardingFindDoc(listName, title) {
  var list = ONBOARDING_LISTS[listName];
  if (!list || !title) return null;
  var all = list.items.concat(list.receipts || []);
  for (var i = 0; i < all.length; i++) if (all[i].title === title) return all[i];
  return null;
}

function onboardingExpectedSlots(docPath, listATitle, noBack) {
  var skip = {};
  (noBack || []).forEach(function (slot) { skip[slot] = true; });
  var slots = [];
  function add(slot) { if (!skip[slot]) slots.push(slot); }
  if (docPath === 'A') {
    add('listA-front');
    add('listA-back');
    var item = onboardingFindDoc('A', listATitle);
    if (item && item.combo) {
      add('listA2-front');
      add('listA2-back');
    }
  } else if (docPath === 'BC') {
    add('listB-front');
    add('listB-back');
    add('listC-front');
    add('listC-back');
  }
  return slots;
}

function onboardingValidJpeg(upload) {
  if (!upload || upload.contentType !== 'image/jpeg') return false;
  var data = String(upload.data || '');
  if (data.length < 80 || data.length > 400000) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return false;
  return data.indexOf('/9j') === 0;
}

function onboardingValidate(data) {
  data = data || {};
  function fail(field, message) {
    return { ok: false, field: field, message: message };
  }
  var first = onboardingNormalizeText(data.legalFirst);
  var middle = onboardingNormalizeText(data.legalMiddle);
  var last = onboardingNormalizeText(data.legalLast);
  var otherLast = onboardingNormalizeText(data.otherLastNames);
  var street = onboardingNormalizeText(data.street);
  var apt = onboardingNormalizeText(data.apt);
  var city = onboardingNormalizeText(data.city);
  var state = onboardingNormalizeText(data.state).toUpperCase();
  var phone = onboardingNormalizeText(data.phone);
  var email = onboardingNormalizeText(data.email);
  var dob = String(data.dob || '').trim();
  var emergencyName = onboardingNormalizeText(data.emergencyName);
  var emergencyRelationship = onboardingNormalizeText(data.emergencyRelationship);
  var emergencyPhone = onboardingNormalizeText(data.emergencyPhone);
  var store = onboardingNormalizeText(data.store);
  var position = onboardingNormalizeText(data.position);
  var positionDetail = onboardingNormalizeText(data.positionDetail);
  var today = data.today instanceof Date ? data.today : new Date();

  if (!onboardingValidName(first)) return fail('legalFirst', 'Enter your legal first name.');
  if (!onboardingValidMiddle(middle)) return fail('legalMiddle', 'Enter one middle initial, or leave it blank.');
  if (!onboardingValidName(last)) return fail('legalLast', 'Enter your legal last name.');
  if (otherLast && !onboardingValidDetail(otherLast)) return fail('otherLastNames', 'Check the other last names. Leave the box blank if you have none.');
  if (!onboardingValidStreet(street)) return fail('street', 'Enter the street number and name.');
  if (!onboardingValidApt(apt)) return fail('apt', 'Check the apartment number, or leave it blank.');
  if (!onboardingValidCity(city)) return fail('city', 'Enter the city or town.');
  if (ONBOARDING_STATES.indexOf(state) < 0) return fail('state', 'Choose a state.');
  var zip = onboardingNormalizeZip(state, data.zip);
  if (!zip) return fail('zip', state === 'CAN' ? 'Enter the Canadian postal code.' : 'Enter the 5-digit ZIP code.');
  if (onboardingDigits(phone).length < 10 || onboardingDigits(phone).length > 15 || phone.length > 40) return fail('phone', 'Enter a phone number with at least 10 digits.');
  if (!onboardingValidEmail(email)) return fail('email', 'Enter a valid email address.');
  var age = onboardingAge(dob, today);
  if (age < 14 || age > 100) return fail('dob', age >= 0 && age < 14 ? 'Enter your date of birth. This form is for employees who are at least 14.' : 'Enter your date of birth.');
  if (!onboardingValidName(emergencyName)) return fail('emergencyName', 'Enter an emergency contact name.');
  if (!onboardingValidName(emergencyRelationship)) return fail('emergencyRelationship', 'Enter how you know the emergency contact.');
  if (onboardingDigits(emergencyPhone).length < 10 || onboardingDigits(emergencyPhone).length > 15) return fail('emergencyPhone', 'Enter the emergency contact phone number.');
  if (ONBOARDING_STORES.indexOf(store) < 0) return fail('store', 'Choose Thomasville Chevron or Thomasville Outrun.');
  if (ONBOARDING_POSITIONS.indexOf(position) < 0) return fail('position', 'Choose a position.');
  if (position === 'Other' && !onboardingValidDetail(positionDetail)) return fail('positionDetail', 'Enter the position.');
  if (position !== 'Other') positionDetail = '';
  if (!onboardingValidSsn(data.ssn)) return fail('ssn', 'Enter a Social Security number in the form 123-45-6789.');
  if (onboardingDigits(data.ssn) !== onboardingDigits(data.ssnConfirm)) return fail('ssnConfirm', 'Those Social Security numbers do not match. Enter the same number in both fields.');
  var ssn = onboardingDigits(data.ssn);

  var exempt = data.exempt === true;
  var filingStatus = exempt ? '' : String(data.filingStatus || '');
  var twoJobs = !exempt && data.twoJobs === true;
  var child = exempt ? { ok: true, count: 0 } : onboardingCount(data.childCount);
  var otherDeps = exempt ? { ok: true, count: 0 } : onboardingCount(data.otherDependentCount);
  var otherCredits = exempt ? { ok: true, amount: '' } : onboardingWholeDollars(data.otherCredits);
  var otherIncome = exempt ? { ok: true, amount: '' } : onboardingWholeDollars(data.otherIncome);
  var deductions = exempt ? { ok: true, amount: '' } : onboardingWholeDollars(data.deductions);
  var extra = exempt ? { ok: true, amount: '' } : onboardingWholeDollars(data.extraWithholding);
  if (!exempt && !ONBOARDING_FILING[filingStatus]) return fail('filingSingle', 'Choose a filing status in Step 1(c).');
  if (!child.ok) return fail('childCount', 'Enter the number of qualifying children under 17, or leave it blank.');
  if (!otherDeps.ok) return fail('otherDependentCount', 'Enter the number of other dependents, or leave it blank.');
  if (!otherCredits.ok) return fail('otherCredits', 'Enter other credits in whole dollars, or leave the box blank.');
  if (!otherIncome.ok) return fail('otherIncome', 'Enter other income in whole dollars, or leave the box blank.');
  if (!deductions.ok) return fail('deductions', 'Enter deductions in whole dollars, or leave the box blank.');
  if (!extra.ok) return fail('extraWithholding', 'Enter extra withholding in whole dollars, or leave the box blank.');
  var childAmount = child.count ? child.count * ONBOARDING_CHILD_CREDIT : '';
  var otherDependentAmount = otherDeps.count ? otherDeps.count * ONBOARDING_OTHER_DEPENDENT_CREDIT : '';
  var creditSum = (childAmount || 0) + (otherDependentAmount || 0) + (otherCredits.amount || 0);
  var dependentsTotal = creditSum ? creditSum : '';

  var i9Status = String(data.i9Status || '');
  if (!ONBOARDING_I9_STATUS[i9Status]) return fail('statusCitizen', 'Choose a citizenship or immigration status.');
  var alienNumber = '';
  var i94Number = '';
  var foreignPassport = '';
  var passportCountry = '';
  var workAuthExpiration = '';
  if (i9Status === 'resident') {
    alienNumber = onboardingNormalizeANumber(data.lprNumber);
    if (!alienNumber) return fail('lprNumber', 'Enter the USCIS or A-Number. It is the letter A plus 7 to 9 digits.');
  }
  if (i9Status === 'alien') {
    if (String(data.workUntil || '').trim()) {
      if (!onboardingParseIso(data.workUntil)) return fail('workUntil', 'Enter the work authorization expiration date, or leave it blank if there is none.');
      workAuthExpiration = onboardingFormatMDY(data.workUntil);
    }
    var enteredAlien = onboardingNormalizeText(data.alienNumber);
    var enteredI94 = onboardingNormalizeText(data.i94Number).replace(/\s/g, '');
    var enteredPassport = onboardingNormalizeText(data.foreignPassport).replace(/\s/g, '');
    var enteredCountry = onboardingNormalizeText(data.passportCountry);
    if (enteredAlien) {
      alienNumber = onboardingNormalizeANumber(enteredAlien);
      if (!alienNumber) return fail('alienNumber', 'Enter the USCIS A-Number as the letter A plus 7 to 9 digits.');
    }
    if (enteredI94) {
      if (!/^[A-Za-z0-9]{9,11}$/.test(enteredI94)) return fail('i94Number', 'Enter the 9 to 11 character Form I-94 admission number.');
      i94Number = enteredI94.toUpperCase();
    }
    if (enteredPassport || enteredCountry) {
      if (!/^[A-Za-z0-9]{6,20}$/.test(enteredPassport)) return fail('foreignPassport', 'Enter the foreign passport number.');
      if (!/^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF][A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF .'\-]{1,39}$/.test(enteredCountry)) return fail('passportCountry', 'Enter the country that issued the foreign passport.');
      foreignPassport = enteredPassport.toUpperCase();
      passportCountry = enteredCountry;
    }
    var ways = (alienNumber ? 1 : 0) + (i94Number ? 1 : 0) + (foreignPassport ? 1 : 0);
    if (ways !== 1) return fail('alienNumber', 'Enter one of these: USCIS A-Number, Form I-94 admission number, or foreign passport number and country of issuance.');
  }

  var preparerUsed = data.preparerUsed === true;
  var preparer = null;
  if (preparerUsed) {
    var prepFirst = onboardingNormalizeText(data.preparerFirst);
    var prepMiddle = onboardingNormalizeText(data.preparerMiddle);
    var prepLast = onboardingNormalizeText(data.preparerLast);
    var prepStreet = onboardingNormalizeText(data.preparerStreet);
    var prepCity = onboardingNormalizeText(data.preparerCity);
    var prepState = onboardingNormalizeText(data.preparerState).toUpperCase();
    var prepZip = onboardingNormalizeZip(prepState, data.preparerZip);
    var prepSigned = onboardingNormalizeText(data.preparerSignature);
    if (!onboardingValidName(prepFirst)) return fail('preparerFirst', 'Enter the preparer or translator’s first name.');
    if (!onboardingValidMiddle(prepMiddle)) return fail('preparerMiddle', 'Enter one middle initial for the preparer, or leave it blank.');
    if (!onboardingValidName(prepLast)) return fail('preparerLast', 'Enter the preparer or translator’s last name.');
    if (!onboardingValidStreet(prepStreet)) return fail('preparerStreet', 'Enter the preparer or translator’s street address.');
    if (!onboardingValidCity(prepCity)) return fail('preparerCity', 'Enter the preparer or translator’s city.');
    if (ONBOARDING_STATES.indexOf(prepState) < 0) return fail('preparerState', 'Choose the preparer or translator’s state.');
    if (!prepZip) return fail('preparerZip', 'Enter the preparer or translator’s ZIP code.');
    var prepFull = onboardingFullName(prepFirst, prepMiddle, prepLast);
    if (!prepSigned || prepSigned.toLowerCase() !== prepFull.toLowerCase()) return fail('preparerSignature', 'The preparer or translator types their own legal name as their signature.');
    preparer = {
      first: prepFirst,
      middle: prepMiddle,
      last: prepLast,
      street: prepStreet,
      city: prepCity,
      state: prepState,
      zip: prepZip,
      signature: prepFull
    };
  }

  var docPath = data.docPath === 'A' || data.docPath === 'BC' ? data.docPath : '';
  if (!docPath) return fail('docPathA', 'Choose List A, or List B and List C.');
  var listA = '';
  var listASecond = '';
  var listB = '';
  var listC = '';
  if (docPath === 'A') {
    var docA = onboardingFindDoc('A', data.listA);
    if (!docA) return fail('listA', 'Choose the List A document you are uploading.');
    listA = docA.title;
    if (docA.combo) listASecond = docA.secondTitle;
  } else {
    var docB = onboardingFindDoc('B', data.listB);
    var docC = onboardingFindDoc('C', data.listC);
    if (!docB) return fail('listB', 'Choose the List B document you are uploading.');
    if (!docC) return fail('listC', 'Choose the List C document you are uploading.');
    listB = docB.title;
    listC = docC.title;
  }
  var skip = data.skipBack || {};
  var relevantBacks = docPath === 'A'
    ? ['listA-back'].concat(listASecond ? ['listA2-back'] : [])
    : ['listB-back', 'listC-back'];
  var noBack = [];
  relevantBacks.forEach(function (slot) {
    if (skip[slot]) noBack.push(slot);
  });
  var expected = onboardingExpectedSlots(docPath, listA, noBack);
  var bySlot = {};
  (data.uploads || []).forEach(function (upload) {
    if (upload && upload.slot) bySlot[upload.slot] = upload;
  });
  var uploads = [];
  for (var s = 0; s < expected.length; s++) {
    var slot = expected[s];
    if (!bySlot[slot] || !onboardingValidJpeg(bySlot[slot])) {
      var back = slot.slice(-5) === '-back';
      return fail(ONBOARDING_SLOT_FIELD[slot], back ? 'Add a photo of the back, or check that this document has no second side.' : 'Add a photo of the front of this document.');
    }
    uploads.push({ slot: slot, contentType: 'image/jpeg', data: String(bySlot[slot].data) });
  }

  var fullName = onboardingFullName(first, middle, last);
  var signed = onboardingNormalizeText(data.signatureName);
  if (!signed || signed.toLowerCase() !== fullName.toLowerCase()) return fail('signatureName', 'Type your legal name exactly as it appears above. That typed name is your signature.');
  if (data.consent !== true) return fail('consent', 'Check the box to sign Form W-4 and Form I-9 with your typed name.');

  return {
    ok: true,
    payload: {
      kind: 'onboarding',
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
      dob: onboardingFormatMDY(dob),
      emergencyName: emergencyName,
      emergencyRelationship: emergencyRelationship,
      emergencyPhone: emergencyPhone,
      store: store,
      position: position,
      positionDetail: positionDetail,
      ssn: ssn,
      w4: {
        filingStatus: filingStatus,
        twoJobs: twoJobs,
        childCount: child.count,
        childAmount: childAmount,
        otherDependentCount: otherDeps.count,
        otherDependentAmount: otherDependentAmount,
        otherCredits: otherCredits.amount,
        dependentsTotal: dependentsTotal,
        otherIncome: otherIncome.amount,
        deductions: deductions.amount,
        extraWithholding: extra.amount,
        exempt: exempt
      },
      i9: {
        status: i9Status,
        alienNumber: alienNumber,
        i94Number: i94Number,
        foreignPassport: foreignPassport,
        passportCountry: passportCountry,
        workAuthExpiration: workAuthExpiration,
        preparerUsed: preparerUsed,
        preparer: preparer
      },
      documents: {
        path: docPath,
        listA: listA,
        listASecond: listASecond,
        listB: listB,
        listC: listC,
        noBack: noBack
      },
      uploads: uploads,
      signatureName: fullName,
      signatureDate: onboardingTodayMDY(today),
      consent: true
    }
  };
}

function onboardingPost(url, payload, fetchImpl) {
  var problem = onboardingEndpointProblem(url);
  if (problem) {
    return Promise.resolve({ ok: false, problem: problem, message: 'This form is not connected yet. Please contact Varsa Group LLC and try again later.' });
  }
  var send = fetchImpl || fetch;
  return send(String(url).trim(), {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  }).then(function () {
    return { ok: true };
  }).catch(function () {
    return { ok: false, message: 'We could not save your form. Check your connection and try again.' };
  });
}

function onboardingW4Values(payload) {
  var texts = {};
  var checks = [];
  texts[ONBOARDING_W4.first] = payload.legalMiddle ? payload.legalFirst + ' ' + payload.legalMiddle : payload.legalFirst;
  texts[ONBOARDING_W4.last] = payload.legalLast;
  texts[ONBOARDING_W4.address] = payload.apt ? payload.street + ', Apt ' + payload.apt : payload.street;
  texts[ONBOARDING_W4.city] = payload.city + ', ' + payload.state + ' ' + payload.zip;
  texts[ONBOARDING_W4.ssn] = onboardingFormatSsn(payload.ssn);
  texts[ONBOARDING_W4.employer] = 'Varsa Group LLC, ' + payload.store + ', Thomasville, AL';
  var w4 = payload.w4;
  if (w4.exempt) {
    checks.push(ONBOARDING_W4.exempt);
  } else {
    if (w4.filingStatus === 'single') checks.push(ONBOARDING_W4.single);
    if (w4.filingStatus === 'married') checks.push(ONBOARDING_W4.married);
    if (w4.filingStatus === 'hoh') checks.push(ONBOARDING_W4.hoh);
    if (w4.twoJobs) checks.push(ONBOARDING_W4.twoJobs);
    if (w4.childAmount) texts[ONBOARDING_W4.childAmt] = onboardingMoney(w4.childAmount);
    if (w4.otherDependentAmount) texts[ONBOARDING_W4.otherDepAmt] = onboardingMoney(w4.otherDependentAmount);
    if (w4.dependentsTotal) texts[ONBOARDING_W4.total] = onboardingMoney(w4.dependentsTotal);
    if (w4.otherIncome) texts[ONBOARDING_W4.otherIncome] = onboardingMoney(w4.otherIncome);
    if (w4.deductions) texts[ONBOARDING_W4.deductions] = onboardingMoney(w4.deductions);
    if (w4.extraWithholding) texts[ONBOARDING_W4.extra] = onboardingMoney(w4.extraWithholding);
  }
  return { texts: texts, checks: checks };
}

function onboardingI9Values(payload) {
  var texts = {};
  function put(name, value) {
    if (value) texts[name] = String(value);
  }
  put('Last Name (Family Name)', payload.legalLast);
  put('First Name Given Name', payload.legalFirst);
  put('Employee Middle Initial (if any)', payload.legalMiddle);
  put('Employee Other Last Names Used (if any)', payload.otherLastNames || 'N/A');
  put('Address Street Number and Name', payload.street);
  put('Apt Number (if any)', payload.apt || 'N/A');
  put('City or Town', payload.city);
  put('ZIP Code', payload.zip);
  put('Date of Birth mmddyyyy', payload.dob);
  put('US Social Security Number', payload.ssn);
  put('Employees E-mail Address', payload.email);
  put('Telephone Number', onboardingPhonePdf(payload.phone));
  put('Signature of Employee', payload.signatureName);
  put("Today's Date mmddyyy", payload.signatureDate);
  var checks = [];
  var i9 = payload.i9;
  if (i9.status === 'citizen') checks.push('CB_1');
  if (i9.status === 'national') checks.push('CB_2');
  if (i9.status === 'resident') {
    checks.push('CB_3');
    put('3 A lawful permanent resident Enter USCIS or ANumber', i9.alienNumber);
  }
  if (i9.status === 'alien') {
    checks.push('CB_4');
    put('Exp Date mmddyyyy', i9.workAuthExpiration);
    put('USCIS ANumber', i9.alienNumber);
    put('Form I94 Admission Number', i9.i94Number);
    if (i9.foreignPassport) put('Foreign Passport Number and Country of IssuanceRow1', i9.foreignPassport + ', ' + i9.passportCountry);
  }
  var dropdowns = { State: payload.state };
  if (i9.preparerUsed && i9.preparer) {
    var prep = i9.preparer;
    put('Last Name Family Name from Section 1', payload.legalLast);
    put('First Name Given Name from Section 1', payload.legalFirst);
    put('Middle initial if any from Section 1', payload.legalMiddle);
    put('Signature of Preparer or Translator 0', prep.signature);
    put('Sig Date mmddyyyy 0', payload.signatureDate);
    put('Preparer or Translator Last Name (Family Name) 0', prep.last);
    put('Preparer or Translator First Name (Given Name) 0', prep.first);
    put('PT Middle Initial 0', prep.middle);
    put('Preparer or Translator Address (Street Number and Name) 0', prep.street);
    put('Preparer or Translator City or Town 0', prep.city);
    put('Zip Code 0', prep.zip);
    dropdowns['Preparer State 0'] = prep.state;
  }
  return { texts: texts, checks: checks, dropdowns: dropdowns };
}

function onboardingDrawX(page, rect, font) {
  page.drawText('X', {
    x: rect.x + 0.4,
    y: rect.y + 0.2,
    size: Math.max(rect.width, rect.height),
    font: font,
    color: PDFLib.rgb(0, 0, 0)
  });
}

function onboardingFillPdf(pdfBytes, plan, options) {
  options = options || {};
  return PDFLib.PDFDocument.load(pdfBytes).then(function (doc) {
    var form = doc.getForm();
    return doc.embedFont(PDFLib.StandardFonts.Helvetica).then(function (font) {
      var marks = [];
      Object.keys(plan.texts).forEach(function (name) {
        form.getTextField(name).setText(plan.texts[name]);
      });
      (plan.checks || []).forEach(function (name) {
        var field = form.getCheckBox(name);
        field.check();
        if (plan.markChecks) {
          var widgets = field.acroField.getWidgets();
          for (var i = 0; i < widgets.length; i++) {
            var rect = widgets[i].getRectangle();
            marks.push({ x: Number(rect.x), y: Number(rect.y), width: Number(rect.width), height: Number(rect.height) });
          }
        }
      });
      Object.keys(plan.dropdowns || {}).forEach(function (name) {
        form.getDropdown(name).select(plan.dropdowns[name]);
      });
      form.updateFieldAppearances(font);
      var page = doc.getPages()[0];
      (plan.draw || []).forEach(function (item) {
        page.drawText(item.text, { x: item.x, y: item.y, size: item.size || 11, font: font, color: PDFLib.rgb(0, 0, 0) });
      });
      if (options.flatten !== false) form.flatten();
      marks.forEach(function (rect) { onboardingDrawX(page, rect, font); });
      return doc.save();
    });
  });
}

function onboardingFillW4(pdfBytes, payload, options) {
  var plan = onboardingW4Values(payload);
  plan.markChecks = true;
  var sigSize = payload.signatureName.length > 42 ? 8 : 11;
  plan.draw = [
    { text: payload.signatureName, x: 108, y: 97, size: sigSize },
    { text: payload.signatureDate, x: 468, y: 97, size: 10 }
  ];
  return onboardingFillPdf(pdfBytes, plan, options);
}

function onboardingFillI9(pdfBytes, payload, options) {
  return onboardingFillPdf(pdfBytes, onboardingI9Values(payload), options);
}

var onboardingPdfCache = {};

function onboardingLoadPdf(path) {
  if (onboardingPdfCache[path]) return Promise.resolve(onboardingPdfCache[path]);
  return fetch(path).then(function (res) {
    if (!res.ok) throw new Error('form');
    return res.arrayBuffer();
  }).then(function (buf) {
    onboardingPdfCache[path] = buf;
    return buf;
  });
}

function onboardingPreparePdfs(payload) {
  return Promise.all([
    onboardingLoadPdf('forms/fw4-2026.pdf').then(function (bytes) { return onboardingFillW4(bytes, payload); }),
    onboardingLoadPdf('forms/i-9.pdf').then(function (bytes) { return onboardingFillI9(bytes, payload); })
  ]).then(function (pair) { return { w4: pair[0], i9: pair[1] }; });
}

function onboardingDownloadName(prefix, payload) {
  var slug = (payload.legalFirst + '-' + payload.legalLast).replace(/[^A-Za-z0-9\-]+/g, '');
  return prefix + '-' + slug + '.pdf';
}

function onboardingAttachDownload(anchor, bytes, filename) {
  if (!anchor) return;
  var blob = new Blob([bytes], { type: 'application/pdf' });
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.hidden = false;
}

function onboardingChecked(form, name) {
  return !!(form[name] && form[name].checked);
}

function onboardingFieldValue(form, name) {
  return form[name] ? form[name].value : '';
}

function onboardingReadForm(form, files) {
  var uploads = [];
  Object.keys(files || {}).forEach(function (slot) {
    var file = files[slot];
    if (file) uploads.push({ slot: slot, contentType: file.contentType, data: file.data });
  });
  return {
    legalFirst: onboardingFieldValue(form, 'legalFirst'),
    legalMiddle: onboardingFieldValue(form, 'legalMiddle'),
    legalLast: onboardingFieldValue(form, 'legalLast'),
    otherLastNames: onboardingFieldValue(form, 'otherLastNames'),
    street: onboardingFieldValue(form, 'street'),
    apt: onboardingFieldValue(form, 'apt'),
    city: onboardingFieldValue(form, 'city'),
    state: onboardingFieldValue(form, 'state'),
    zip: onboardingFieldValue(form, 'zip'),
    phone: onboardingFieldValue(form, 'phone'),
    email: onboardingFieldValue(form, 'email'),
    dob: onboardingFieldValue(form, 'dob'),
    emergencyName: onboardingFieldValue(form, 'emergencyName'),
    emergencyRelationship: onboardingFieldValue(form, 'emergencyRelationship'),
    emergencyPhone: onboardingFieldValue(form, 'emergencyPhone'),
    store: onboardingFieldValue(form, 'store'),
    position: onboardingFieldValue(form, 'position'),
    positionDetail: onboardingFieldValue(form, 'positionDetail'),
    ssn: onboardingFieldValue(form, 'ssn'),
    ssnConfirm: onboardingFieldValue(form, 'ssnConfirm'),
    filingStatus: onboardingFieldValue(form, 'filingStatus'),
    twoJobs: onboardingChecked(form, 'twoJobs'),
    childCount: onboardingFieldValue(form, 'childCount'),
    otherDependentCount: onboardingFieldValue(form, 'otherDependentCount'),
    otherCredits: onboardingFieldValue(form, 'otherCredits'),
    otherIncome: onboardingFieldValue(form, 'otherIncome'),
    deductions: onboardingFieldValue(form, 'deductions'),
    extraWithholding: onboardingFieldValue(form, 'extraWithholding'),
    exempt: onboardingChecked(form, 'exempt'),
    i9Status: onboardingFieldValue(form, 'i9Status'),
    lprNumber: onboardingFieldValue(form, 'lprNumber'),
    workUntil: onboardingFieldValue(form, 'workUntil'),
    alienNumber: onboardingFieldValue(form, 'alienNumber'),
    i94Number: onboardingFieldValue(form, 'i94Number'),
    foreignPassport: onboardingFieldValue(form, 'foreignPassport'),
    passportCountry: onboardingFieldValue(form, 'passportCountry'),
    preparerUsed: onboardingFieldValue(form, 'preparerUsed') === 'yes',
    preparerFirst: onboardingFieldValue(form, 'preparerFirst'),
    preparerMiddle: onboardingFieldValue(form, 'preparerMiddle'),
    preparerLast: onboardingFieldValue(form, 'preparerLast'),
    preparerStreet: onboardingFieldValue(form, 'preparerStreet'),
    preparerCity: onboardingFieldValue(form, 'preparerCity'),
    preparerState: onboardingFieldValue(form, 'preparerState'),
    preparerZip: onboardingFieldValue(form, 'preparerZip'),
    preparerSignature: onboardingFieldValue(form, 'preparerSignature'),
    docPath: onboardingFieldValue(form, 'docPath'),
    listA: onboardingFieldValue(form, 'listA'),
    listB: onboardingFieldValue(form, 'listB'),
    listC: onboardingFieldValue(form, 'listC'),
    skipBack: {
      'listA-back': onboardingChecked(form, 'listANoBack'),
      'listA2-back': onboardingChecked(form, 'listA2NoBack'),
      'listB-back': onboardingChecked(form, 'listBNoBack'),
      'listC-back': onboardingChecked(form, 'listCNoBack')
    },
    uploads: uploads,
    signatureName: onboardingFieldValue(form, 'signatureName'),
    consent: onboardingChecked(form, 'consent')
  };
}

function onboardingRenderList(container, list) {
  if (!container || !container.ownerDocument) return;
  var doc = container.ownerDocument;
  container.textContent = '';
  var ol = doc.createElement('ol');
  ol.className = 'doc-list';
  list.items.forEach(function (item) {
    var li = doc.createElement('li');
    li.textContent = item.title;
    if (item.detail) {
      var detail = doc.createElement('p');
      detail.className = 'hint';
      detail.textContent = item.detail;
      li.appendChild(detail);
    }
    ol.appendChild(li);
  });
  container.appendChild(ol);
  if (list.note) {
    var note = doc.createElement('p');
    note.className = 'hint';
    note.textContent = list.note;
    container.appendChild(note);
  }
  if (list.receipts && list.receipts.length) {
    var heading = doc.createElement('p');
    heading.className = 'hint';
    heading.textContent = 'Acceptable receipts, for a temporary period:';
    container.appendChild(heading);
    var ul = doc.createElement('ul');
    ul.className = 'doc-list';
    list.receipts.forEach(function (item) {
      var li = doc.createElement('li');
      li.textContent = item.title;
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }
}

function onboardingFillSelect(select, values) {
  if (!select) return;
  var doc = select.ownerDocument;
  select.textContent = '';
  var blank = doc.createElement('option');
  blank.value = '';
  blank.textContent = 'Select…';
  select.appendChild(blank);
  values.forEach(function (value) {
    var option = doc.createElement('option');
    option.value = typeof value === 'string' ? value : value.title;
    option.textContent = option.value;
    select.appendChild(option);
  });
}

function onboardingPopulate(doc) {
  onboardingFillSelect(doc.getElementById('state'), ONBOARDING_STATES);
  onboardingFillSelect(doc.getElementById('preparerState'), ONBOARDING_STATES);
  onboardingFillSelect(doc.getElementById('listA'), ONBOARDING_LISTS.A.items.concat(ONBOARDING_LISTS.A.receipts));
  onboardingFillSelect(doc.getElementById('listB'), ONBOARDING_LISTS.B.items.concat(ONBOARDING_LISTS.B.receipts));
  onboardingFillSelect(doc.getElementById('listC'), ONBOARDING_LISTS.C.items.concat(ONBOARDING_LISTS.C.receipts));
  onboardingRenderList(doc.getElementById('listAItems'), ONBOARDING_LISTS.A);
  onboardingRenderList(doc.getElementById('listBItems'), ONBOARDING_LISTS.B);
  onboardingRenderList(doc.getElementById('listCItems'), ONBOARDING_LISTS.C);
  var dob = doc.getElementById('dob');
  if (dob) dob.max = new Date().getFullYear() + '-' + onboardingPad(new Date().getMonth() + 1) + '-' + onboardingPad(new Date().getDate());
}

function onboardingKeepSsn(input) {
  var next = onboardingFormatSsnInput(input.value);
  if (input.value !== next) input.value = next;
}

function onboardingSyncMirrors(form) {
  function set(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
  }
  set('i9First', onboardingNormalizeText(onboardingFieldValue(form, 'legalFirst')));
  set('i9Middle', onboardingNormalizeText(onboardingFieldValue(form, 'legalMiddle')));
  set('i9Last', onboardingNormalizeText(onboardingFieldValue(form, 'legalLast')));
  set('i9Other', onboardingNormalizeText(onboardingFieldValue(form, 'otherLastNames')) || 'N/A');
  set('i9Street', onboardingNormalizeText(onboardingFieldValue(form, 'street')));
  set('i9Apt', onboardingNormalizeText(onboardingFieldValue(form, 'apt')) || 'N/A');
  set('i9City', onboardingNormalizeText(onboardingFieldValue(form, 'city')));
  set('i9State', onboardingFieldValue(form, 'state'));
  set('i9Zip', onboardingNormalizeText(onboardingFieldValue(form, 'zip')).toUpperCase());
  set('i9Dob', onboardingFieldValue(form, 'dob') ? onboardingFormatMDY(onboardingFieldValue(form, 'dob')) : '');
  set('i9Email', onboardingNormalizeText(onboardingFieldValue(form, 'email')));
  set('i9Phone', onboardingNormalizeText(onboardingFieldValue(form, 'phone')));
  var mask = document.getElementById('i9SsnMask');
  if (mask) {
    var ssn = onboardingDigits(onboardingFieldValue(form, 'ssn'));
    mask.textContent = ssn.length === 9
      ? 'Social Security number ending in ' + ssn.slice(5) + ' is printed on Form I-9.'
      : 'The Social Security number from Form W-4, Step 1(b), is printed on Form I-9.';
  }
}

function onboardingSyncCredits(form) {
  var el = document.getElementById('creditMath');
  if (!el || !form.childCount) return;
  var kids = onboardingCount(form.childCount.value);
  var others = onboardingCount(form.otherDependentCount.value);
  var credits = onboardingWholeDollars(form.otherCredits.value);
  if (!kids.ok || !others.ok || !credits.ok) {
    el.textContent = '';
    return;
  }
  var childAmount = kids.count ? kids.count * ONBOARDING_CHILD_CREDIT : 0;
  var otherAmount = others.count ? others.count * ONBOARDING_OTHER_DEPENDENT_CREDIT : 0;
  var extra = credits.amount || 0;
  var total = childAmount + otherAmount + extra;
  el.textContent = total ? 'Step 3 total on Form W-4: $' + onboardingMoney(total) + '.' : '';
}

function onboardingSyncExempt(form) {
  var on = onboardingChecked(form, 'exempt');
  var rest = document.getElementById('w4-rest');
  if (rest) rest.hidden = on;
  if (!on) return;
  var radios = form.querySelectorAll ? form.querySelectorAll('input[name="filingStatus"]') : [];
  for (var i = 0; i < radios.length; i++) radios[i].checked = false;
  if (form.twoJobs) form.twoJobs.checked = false;
  ['childCount', 'otherDependentCount', 'otherCredits', 'otherIncome', 'deductions', 'extraWithholding'].forEach(function (name) {
    if (form[name]) form[name].value = '';
  });
  onboardingSyncCredits(form);
}

function onboardingSyncStatus(form) {
  var status = onboardingFieldValue(form, 'i9Status');
  var resident = document.getElementById('i9-resident');
  var alien = document.getElementById('i9-alien');
  if (resident) resident.hidden = status !== 'resident';
  if (alien) alien.hidden = status !== 'alien';
}

function onboardingSyncPreparer(form) {
  var fields = document.getElementById('preparer-fields');
  if (fields) fields.hidden = onboardingFieldValue(form, 'preparerUsed') !== 'yes';
}

function onboardingSyncPosition(form) {
  var wrap = document.getElementById('position-detail');
  if (wrap) wrap.hidden = onboardingFieldValue(form, 'position') !== 'Other';
}

function onboardingSyncDocs(form) {
  var path = onboardingFieldValue(form, 'docPath');
  var listA = document.getElementById('docs-a');
  var listBC = document.getElementById('docs-bc');
  if (listA) listA.hidden = path !== 'A';
  if (listBC) listBC.hidden = path !== 'BC';
  var item = onboardingFindDoc('A', onboardingFieldValue(form, 'listA'));
  var extra = document.getElementById('docs-a2');
  if (extra) extra.hidden = !(path === 'A' && item && item.combo);
  var label = document.getElementById('listA2Label');
  if (label && item && item.secondTitle) label.textContent = 'Photo of ' + item.secondTitle + ' (front)';
}

function onboardingCompressImage(file) {
  return new Promise(function (resolve, reject) {
    if (!file || !/^image\//.test(file.type || '')) {
      reject(new Error('image'));
      return;
    }
    var url = URL.createObjectURL(file);
    var image = new Image();
    image.onload = function () {
      URL.revokeObjectURL(url);
      var maxSide = 1280;
      var scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      var quality = 0.72;
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 350000 && quality > 0.42) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve({ contentType: 'image/jpeg', data: dataUrl.split(',')[1] });
    };
    image.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    image.src = url;
  });
}

function onboardingClearSensitive(form, files, previews) {
  form.reset();
  Object.keys(files).forEach(function (slot) { delete files[slot]; });
  Object.keys(previews).forEach(function (slot) {
    if (previews[slot]) URL.revokeObjectURL(previews[slot]);
    delete previews[slot];
  });
  if (!form.querySelectorAll) return;
  var images = form.querySelectorAll('img.preview');
  for (var i = 0; i < images.length; i++) {
    images[i].removeAttribute('src');
    images[i].hidden = true;
  }
  onboardingSyncExempt(form);
  onboardingSyncStatus(form);
  onboardingSyncPreparer(form);
  onboardingSyncDocs(form);
  onboardingSyncPosition(form);
  onboardingSyncMirrors(form);
}

function onboardingInit() {
  if (typeof document === 'undefined' || !document.getElementById) return;
  var form = document.getElementById('onboarding-form');
  if (!form || !form.addEventListener) return;
  var status = document.getElementById('onboarding-status');
  var thanks = document.getElementById('thanks');
  var submitBtn = document.getElementById('submitBtn');
  var files = {};
  var previews = {};

  function showStatus(message, isError) {
    if (!status) return;
    status.textContent = message || '';
    status.className = message ? (isError ? 'msg err' : 'msg') : '';
  }

  onboardingPopulate(document);
  var dateLine = document.getElementById('signatureDate');
  if (dateLine) dateLine.textContent = onboardingTodayMDY(new Date());
  onboardingSyncExempt(form);
  onboardingSyncStatus(form);
  onboardingSyncPreparer(form);
  onboardingSyncDocs(form);
  onboardingSyncPosition(form);
  onboardingSyncMirrors(form);

  form.addEventListener('input', function (event) {
    if (event.target === form.ssn || event.target === form.ssnConfirm) onboardingKeepSsn(event.target);
    onboardingSyncMirrors(form);
    onboardingSyncCredits(form);
    if (status && status.className.indexOf('err') >= 0) showStatus('', false);
  });
  form.addEventListener('change', function (event) {
    var target = event.target || {};
    if (target === form.exempt) onboardingSyncExempt(form);
    if (target.name === 'i9Status') onboardingSyncStatus(form);
    if (target.name === 'preparerUsed') onboardingSyncPreparer(form);
    if (target.name === 'docPath' || target === form.listA) onboardingSyncDocs(form);
    if (target === form.position) onboardingSyncPosition(form);
    onboardingSyncMirrors(form);
  });

  var inputs = form.querySelectorAll('input[type=file]');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].addEventListener('change', function (event) {
      var input = event.target;
      var slot = input.getAttribute('data-slot');
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) {
        input.value = '';
        showStatus('That photo is too large. Take a closer photo of the document.', true);
        return;
      }
      onboardingCompressImage(file).then(function (jpeg) {
        files[slot] = jpeg;
        var img = document.getElementById(input.id + 'Preview');
        if (img) {
          if (previews[slot]) URL.revokeObjectURL(previews[slot]);
          previews[slot] = URL.createObjectURL(file);
          img.src = previews[slot];
          img.hidden = false;
        }
      }).catch(function () {
        input.value = '';
        delete files[slot];
        showStatus('Use a JPEG or PNG photo. If the picture will not load, take it again.', true);
      });
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (onboardingTransportProblem(location.protocol, location.hostname)) {
      showStatus('Open this page over a secure (https) connection before submitting.', true);
      return;
    }
    var result = onboardingValidate(onboardingReadForm(form, files));
    if (!result.ok) {
      showStatus(result.message, true);
      var field = document.getElementById(result.field);
      if (field && field.focus) field.focus();
      return;
    }
    if (onboardingEndpointProblem(ONBOARDING_SHEET_URL)) console.warn('ONBOARDING_SHEET_URL is empty or points at the inventory script. See the README.');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
    showStatus('Saving…', false);
    var payload = result.payload;
    onboardingPreparePdfs(payload).then(function (pdfs) {
      return onboardingPost(ONBOARDING_SHEET_URL, payload).then(function (response) {
        if (!response.ok) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit onboarding form';
          showStatus(response.message, true);
          return;
        }
        onboardingClearSensitive(form, files, previews);
        showStatus('', false);
        form.hidden = true;
        thanks.hidden = false;
        onboardingAttachDownload(document.getElementById('downloadW4'), pdfs.w4, onboardingDownloadName('W-4', payload));
        onboardingAttachDownload(document.getElementById('downloadI9'), pdfs.i9, onboardingDownloadName('I-9', payload));
      });
    }).catch(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit onboarding form';
      showStatus('We could not prepare your forms. Check your connection and try again.', true);
    });
  });
}

if (typeof document !== 'undefined' && document.getElementById) onboardingInit();
