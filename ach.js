// =============================================================================
// ACH_SHEET_URL
// Paste the web app URL from deploying ach-apps-script.gs. See the README
// section "ACH payment setup". Leave this empty until that deployment exists.
// Do not paste the inventory scanner URL. Bank details must not go to that sheet.
// =============================================================================
var ACH_SHEET_URL = 'https://script.google.com/macros/s/AKfycbw9VHa_vgloJH-l9NE_PTIorVLjI-26ba1jGlT_FpFGh_80qMpGAwmccs9W--RMLX4H/exec';

var ACH_BLOCKED_INVENTORY_URL = 'https://script.google.com/macros/s/AKfycbzBJ1M9Cu3l9e_PhcxyTLBwOdkX5-cwsnXQ-Z8P-ZX9c_gDtYJ0LoM-pIS6VtvDzL0/exec';

var ACH_PURPOSES = ['Employee', 'Vendor', 'Other'];
var ACH_ACCOUNT_TYPES = ['Checking', 'Savings'];

function achDigits(value) {
  return String(value == null ? '' : value).replace(/\D/g, '');
}

function achValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value == null ? '' : value).trim());
}

function achValidRouting(value) {
  var routing = String(value == null ? '' : value).trim();
  if (!/^\d{9}$/.test(routing) || routing === '000000000') return false;
  var d = routing.split('').map(function (n) { return Number(n); });
  var sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

function achEndpointProblem(url) {
  var endpoint = String(url == null ? '' : url).trim().replace(/\/$/, '');
  if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) return 'unconfigured';
  if (endpoint === ACH_BLOCKED_INVENTORY_URL) return 'inventory';
  return '';
}

function achValidate(data) {
  data = data || {};
  var name = String(data.name == null ? '' : data.name).trim();
  var email = String(data.email == null ? '' : data.email).trim();
  var phone = String(data.phone == null ? '' : data.phone).trim();
  var address = String(data.address == null ? '' : data.address).trim();
  var purpose = String(data.purpose == null ? '' : data.purpose).trim();
  var purposeDetail = String(data.purposeDetail == null ? '' : data.purposeDetail).trim();
  var bankName = String(data.bankName == null ? '' : data.bankName).trim();
  var accountType = String(data.accountType == null ? '' : data.accountType).trim();
  var accountNumber = String(data.accountNumber == null ? '' : data.accountNumber).trim();
  var confirmAccount = String(data.confirmAccount == null ? '' : data.confirmAccount).trim();
  var routingNumber = String(data.routingNumber == null ? '' : data.routingNumber).trim();
  var memo = String(data.memo == null ? '' : data.memo).trim();

  if (!name) return { ok: false, field: 'fullName', message: 'Enter your full name.' };
  if (name.length > 120) return { ok: false, field: 'fullName', message: 'That name is too long.' };
  if (!achValidEmail(email)) return { ok: false, field: 'email', message: 'Enter a valid email address.' };
  if (achDigits(phone).length < 10 || achDigits(phone).length > 15) return { ok: false, field: 'phone', message: 'Enter a phone number with at least 10 digits.' };
  if (!address) return { ok: false, field: 'address', message: 'Enter your mailing address.' };
  if (address.length > 400) return { ok: false, field: 'address', message: 'That address is too long.' };
  if (ACH_PURPOSES.indexOf(purpose) < 0) return { ok: false, field: 'purpose', message: 'Choose Employee, Vendor, or Other.' };
  if (purpose === 'Other' && !purposeDetail) return { ok: false, field: 'purposeDetail', message: 'Please explain the purpose.' };
  if (purposeDetail.length > 400) return { ok: false, field: 'purposeDetail', message: 'That explanation is too long.' };
  if (!bankName) return { ok: false, field: 'bankName', message: 'Enter the bank name.' };
  if (ACH_ACCOUNT_TYPES.indexOf(accountType) < 0) return { ok: false, field: 'accountChecking', message: 'Choose Checking or Savings.' };
  if (!/^\d+$/.test(accountNumber)) return { ok: false, field: 'accountNumber', message: 'Use digits only for the account number.' };
  if (accountNumber.length < 4 || accountNumber.length > 17) return { ok: false, field: 'accountNumber', message: 'Enter the account number (4 to 17 digits).' };
  if (confirmAccount !== accountNumber) return { ok: false, field: 'confirmAccount', message: 'Those account numbers do not match. Enter the same number in both fields.' };
  if (!/^\d{9}$/.test(routingNumber)) return { ok: false, field: 'routingNumber', message: 'Enter the 9-digit routing number.' };
  if (!achValidRouting(routingNumber)) return { ok: false, field: 'routingNumber', message: 'That routing number does not look right. Check the 9 digits on your check.' };
  if (memo.length > 500) return { ok: false, field: 'memo', message: 'That memo is too long.' };
  if (!data.authorization) return { ok: false, field: 'authorization', message: 'Check the box to authorize Varsa Group LLC to send payments to this account.' };

  return {
    ok: true,
    payload: {
      kind: 'ach',
      name: name,
      email: email,
      phone: phone,
      address: address,
      purpose: purpose,
      purposeDetail: purpose === 'Other' ? purposeDetail : '',
      bankName: bankName,
      accountType: accountType,
      accountNumber: accountNumber,
      routingNumber: routingNumber,
      memo: memo,
      authorization: true
    }
  };
}

function achSyncPurpose(purpose, wrap, detail) {
  var other = purpose === 'Other';
  if (wrap) wrap.hidden = !other;
  if (detail) {
    detail.required = other;
    if (!other) detail.value = '';
  }
  return other;
}

function achKeepDigits(input, max) {
  var next = achDigits(input.value).slice(0, max);
  if (input.value !== next) input.value = next;
}

function achPost(url, payload, fetchImpl) {
  var problem = achEndpointProblem(url);
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
    return { ok: false, message: 'We could not save your details. Check your connection and try again.' };
  });
}

function achInit() {
  var form = document.getElementById('ach-form');
  if (!form) return;
  var status = document.getElementById('ach-status');
  var thanks = document.getElementById('thanks');
  var submitBtn = document.getElementById('submitBtn');
  var explainWrap = document.getElementById('explain-wrap');
  var purpose = document.getElementById('purpose');
  var purposeDetail = document.getElementById('purposeDetail');
  var accountNumber = document.getElementById('accountNumber');
  var confirmAccount = document.getElementById('confirmAccount');
  var routingNumber = document.getElementById('routingNumber');

  function showStatus(message, isError) {
    status.textContent = message || '';
    status.className = message ? (isError ? 'msg err' : 'msg') : '';
  }

  purpose.addEventListener('change', function () {
    achSyncPurpose(purpose.value, explainWrap, purposeDetail);
  });
  accountNumber.addEventListener('input', function () { achKeepDigits(accountNumber, 17); });
  confirmAccount.addEventListener('input', function () { achKeepDigits(confirmAccount, 17); });
  routingNumber.addEventListener('input', function () { achKeepDigits(routingNumber, 9); });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var accountType = '';
    var choices = form.querySelectorAll('input[name="accountType"]');
    for (var i = 0; i < choices.length; i++) if (choices[i].checked) accountType = choices[i].value;
    var result = achValidate({
      name: form.fullName.value,
      email: form.email.value,
      phone: form.phone.value,
      address: form.address.value,
      purpose: purpose.value,
      purposeDetail: purposeDetail.value,
      bankName: form.bankName.value,
      accountType: accountType,
      accountNumber: accountNumber.value,
      confirmAccount: confirmAccount.value,
      routingNumber: routingNumber.value,
      memo: form.memo.value,
      authorization: form.authorization.checked
    });
    if (!result.ok) {
      showStatus(result.message, true);
      var field = document.getElementById(result.field);
      if (field && field.focus) field.focus();
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
    showStatus('Saving…', false);
    var problem = achEndpointProblem(ACH_SHEET_URL);
    if (problem) console.warn('ACH_SHEET_URL is empty or points at the inventory script. See the README.');
    achPost(ACH_SHEET_URL, result.payload).then(function (response) {
      if (!response.ok) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit payment details';
        showStatus(response.message, true);
        return;
      }
      form.reset();
      accountNumber.value = '';
      confirmAccount.value = '';
      routingNumber.value = '';
      purposeDetail.value = '';
      achSyncPurpose('', explainWrap, purposeDetail);
      showStatus('', false);
      form.hidden = true;
      thanks.hidden = false;
    });
  });
}

if (typeof document !== 'undefined' && document.getElementById) achInit();
