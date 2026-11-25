/**
 * Varsa Group LLC — Office Supply Tracker.
 *
 * Deploy this as an Apps Script bound to the spreadsheet
 * "Varsa Group - Office Supply Tracker". Do not replace the inventory
 * scanner, ACH, onboarding, or direct-deposit scripts, and do not use
 * those spreadsheets.
 *
 * After you deploy the web app, paste its /exec URL into SHEET_ENDPOINT
 * in supplies.html.
 *
 * Deploy: Deploy → New deployment → Web app
 *   Execute as: Me
 *   Who has access: Anyone
 */
var SUPPLIES_SPREADSHEET_ID = '1dw60YyEb_rs8VhmDB-oQTxtY4FglLCcj0W4g8b_rloY';
var STORES = ['Thomasville Chevron', 'Thomasville OutRun'];
var COUNTS_HEADERS = [
  'Timestamp (CST)',
  'Store',
  'Counter',
  'Category',
  'Item',
  'Unit',
  'Qty',
  'Min',
  'Status',
  'Sort Time (ISO)'
];
var ITEMS_HEADERS = ['Category', 'Item', 'Unit', 'Min Chevron', 'Min OutRun', 'Custom', 'Sort'];
var CURRENT_HEADERS = ['Store', 'Category', 'Item', 'Unit', 'Qty', 'Min', 'Status', 'Last Counted', 'Counter'];

function doGet(e) {
  try {
    var action = param_(e, 'action');
    var payload;
    if (!action) {
      return text_('Varsa Group office supply tracker endpoint is running.');
    }
    if (action === 'bootstrap') {
      payload = { ok: true, items: readItems_(), current: readCurrent_() };
    } else if (action === 'history') {
      payload = { ok: true, history: readHistory_(param_(e, 'store'), param_(e, 'item')) };
    } else if (action === 'current') {
      payload = { ok: true, current: readCurrent_(param_(e, 'store')) };
    } else {
      payload = { ok: false, error: 'unknown action' };
    }
    return jsonpOrJson_(e, payload);
  } catch (err) {
    return jsonpOrJson_(e, { ok: false, error: 'read failed' });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'empty' });
    var data = JSON.parse(e.postData.contents);
    if (!data || data.kind !== 'supplies') return json_({ ok: false, error: 'not supplies' });
    var action = String(data.action || 'count');
    if (action === 'addItem') {
      var added = addItem_(data);
      if (!added.ok) return json_(added);
      return json_({ ok: true, item: added.item });
    }
    var check = validateCount_(data);
    if (!check.ok) return json_({ ok: false, error: check.error });
    saveCount_(check.value);
    return json_({ ok: true, saved: check.value.items.length });
  } catch (err) {
    return json_({ ok: false, error: 'save failed' });
  }
}

function ss_() {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active && active.getId() === SUPPLIES_SPREADSHEET_ID) return active;
  } catch (err) {}
  return SpreadsheetApp.openById(SUPPLIES_SPREADSHEET_ID);
}

function countsSheet_() {
  var ss = ss_();
  var sheet = ss.getSheetByName('Counts');
  if (!sheet) sheet = ss.insertSheet('Counts');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COUNTS_HEADERS);
    sheet.getRange(1, 1, 1, COUNTS_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function itemsSheet_() {
  var ss = ss_();
  var sheet = ss.getSheetByName('Items');
  if (!sheet) sheet = ss.insertSheet('Items');
  return sheet;
}

function currentSheet_() {
  var ss = ss_();
  var sheet = ss.getSheetByName('Current');
  if (!sheet) sheet = ss.insertSheet('Current');
  return sheet;
}

function readItems_() {
  var sheet = itemsSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, 7).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var name = trim_(row[1]);
    if (!name) continue;
    out.push({
      category: trim_(row[0]),
      item: name,
      unit: trim_(row[2]) || 'each',
      minChevron: toNum_(row[3], 1),
      minOutRun: toNum_(row[4], 1),
      custom: String(row[5]).toLowerCase() === 'yes',
      sort: toNum_(row[6], i + 1)
    });
  }
  return out;
}

function readCurrent_(storeFilter) {
  var sheet = currentSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, 9).getDisplayValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var store = trim_(row[0]);
    var item = trim_(row[2]);
    if (!store || !item) continue;
    if (storeFilter && store !== storeFilter) continue;
    var qtyText = trim_(row[4]);
    out.push({
      store: store,
      category: trim_(row[1]),
      item: item,
      unit: trim_(row[3]),
      qty: qtyText === '' ? null : toNum_(qtyText, 0),
      min: toNum_(row[5], 0),
      status: trim_(row[6]) || 'Not counted',
      lastCounted: trim_(row[7]),
      counter: trim_(row[8])
    });
  }
  return out;
}

function readHistory_(store, item) {
  store = trim_(store);
  item = trim_(item);
  if (STORES.indexOf(store) === -1 || !item) return [];
  var sheet = countsSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, 10).getDisplayValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (trim_(row[1]) !== store || trim_(row[4]) !== item) continue;
    rows.push({
      timestamp: trim_(row[0]),
      store: trim_(row[1]),
      counter: trim_(row[2]),
      qty: toNum_(row[6], 0),
      min: toNum_(row[7], 0),
      status: trim_(row[8]),
      sortTime: trim_(row[9])
    });
  }
  rows.sort(function (a, b) {
    if (a.sortTime === b.sortTime) return 0;
    return a.sortTime < b.sortTime ? 1 : -1;
  });
  return rows.slice(0, 20);
}

function validateCount_(data) {
  var store = trim_(data.store);
  var counter = trim_(data.counter);
  if (STORES.indexOf(store) === -1) return { ok: false, error: 'store' };
  if (!counter || counter.length > 80) return { ok: false, error: 'counter' };
  if (!data.items || !data.items.length) return { ok: false, error: 'items' };
  var seen = {};
  var items = [];
  for (var i = 0; i < data.items.length; i++) {
    var raw = data.items[i] || {};
    var category = trim_(raw.category);
    var item = trim_(raw.item);
    var unit = trim_(raw.unit) || 'each';
    if (!category || category.length > 80) return { ok: false, error: 'category' };
    if (!item || item.length > 120) return { ok: false, error: 'item' };
    var key = store + '|' + item.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    if (unit.length > 40) return { ok: false, error: 'unit' };
    if (!isNonNegInt_(raw.qty) || !isNonNegInt_(raw.min)) return { ok: false, error: 'qty' };
    var qty = toNum_(raw.qty, 0);
    var min = toNum_(raw.min, 0);
    items.push({
      category: category,
      item: item,
      unit: unit,
      qty: qty,
      min: min,
      status: qty <= min ? 'Reorder' : 'OK'
    });
  }
  if (!items.length) return { ok: false, error: 'items' };
  return { ok: true, value: { store: store, counter: counter, items: items } };
}

function saveCount_(value) {
  var now = new Date();
  var tz = 'America/Chicago';
  var stamp = Utilities.formatDate(now, tz, 'MM/dd/yyyy hh:mm:ss a');
  var iso = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');
  var rows = [];
  for (var i = 0; i < value.items.length; i++) {
    var it = value.items[i];
    rows.push([
      stamp,
      value.store,
      plain_(value.counter),
      plain_(it.category),
      plain_(it.item),
      plain_(it.unit),
      it.qty,
      it.min,
      it.status,
      iso
    ]);
    upsertItemMin_(value.store, it);
  }
  var sheet = countsSheet_();
  sheet.insertRowsBefore(2, rows.length);
  sheet.getRange(2, 1, rows.length, 10).setValues(rows);
  sheet.getRange(2, 7, rows.length, 2).setNumberFormat('0');
}

function upsertItemMin_(store, it) {
  var sheet = itemsSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return;
  var values = sheet.getRange(2, 1, last - 1, 7).getValues();
  var col = store === 'Thomasville OutRun' ? 5 : 4;
  for (var i = 0; i < values.length; i++) {
    if (trim_(values[i][1]).toLowerCase() === it.item.toLowerCase()) {
      sheet.getRange(i + 2, col).setValue(it.min);
      if (!trim_(values[i][0])) sheet.getRange(i + 2, 1).setValue(it.category);
      if (!trim_(values[i][2])) sheet.getRange(i + 2, 3).setValue(it.unit);
      return;
    }
  }
  addItem_({
    category: it.category,
    item: it.item,
    unit: it.unit,
    minChevron: store === 'Thomasville Chevron' ? it.min : 1,
    minOutRun: store === 'Thomasville OutRun' ? it.min : 1,
    custom: true
  });
}

function addItem_(data) {
  var category = trim_(data.category);
  var item = trim_(data.item);
  var unit = trim_(data.unit) || 'each';
  if (!category || category.length > 80) return { ok: false, error: 'category' };
  if (!item || item.length > 120) return { ok: false, error: 'item' };
  if (unit.length > 40) return { ok: false, error: 'unit' };
  if (!isNonNegInt_(data.minChevron == null ? 1 : data.minChevron)) return { ok: false, error: 'min' };
  if (!isNonNegInt_(data.minOutRun == null ? 1 : data.minOutRun)) return { ok: false, error: 'min' };
  var minChevron = toNum_(data.minChevron, 1);
  var minOutRun = toNum_(data.minOutRun, 1);
  var sheet = itemsSheet_();
  var last = sheet.getLastRow();
  if (last >= 2) {
    var existing = sheet.getRange(2, 2, last - 1, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if (trim_(existing[i][0]).toLowerCase() === item.toLowerCase()) {
        return { ok: false, error: 'duplicate' };
      }
    }
  }
  var sort = last < 2 ? 1 : last;
  sheet.appendRow([category, item, unit, minChevron, minOutRun, 'Yes', sort]);
  var itemRow = sheet.getLastRow();
  addCurrentRows_(itemRow);
  return {
    ok: true,
    item: {
      category: category,
      item: item,
      unit: unit,
      minChevron: minChevron,
      minOutRun: minOutRun,
      custom: true,
      sort: sort
    }
  };
}

function addCurrentRows_(itemRow) {
  var sheet = currentSheet_();
  var last = sheet.getLastRow();
  if (last < 2) {
    sheet.getRange(1, 1, 1, CURRENT_HEADERS.length).setValues([CURRENT_HEADERS]);
    last = 1;
  }
  var stores = sheet.getRange(2, 1, Math.max(last - 1, 1), 1).getDisplayValues();
  var lastChevron = 1;
  var lastOutrun = 1;
  for (var i = 0; i < stores.length; i++) {
    var name = trim_(stores[i][0]);
    var row = i + 2;
    if (name === 'Thomasville Chevron') lastChevron = row;
    if (name === 'Thomasville OutRun') lastOutrun = row;
  }
  if (lastChevron < 2) lastChevron = last;
  sheet.insertRowAfter(lastChevron);
  var chevRow = lastChevron + 1;
  writeCurrentFormulaRow_(sheet, chevRow, 'Thomasville Chevron', itemRow, 'D');
  if (lastOutrun >= chevRow) lastOutrun += 1;
  if (lastOutrun < 2) lastOutrun = sheet.getLastRow();
  sheet.insertRowAfter(lastOutrun);
  var outRow = lastOutrun + 1;
  writeCurrentFormulaRow_(sheet, outRow, 'Thomasville OutRun', itemRow, 'E');
  refreshTableChrome_(sheet, 9);
  refreshTableChrome_(itemsSheet_(), 7);
}

function writeCurrentFormulaRow_(sheet, row, store, itemRow, minCol) {
  sheet.getRange(row, 1).setValue(store);
  sheet.getRange(row, 2).setFormula('=Items!A' + itemRow);
  sheet.getRange(row, 3).setFormula('=Items!B' + itemRow);
  sheet.getRange(row, 4).setFormula('=Items!C' + itemRow);
  sheet.getRange(row, 5).setFormula('=IFERROR(INDEX(SORT(FILTER(Counts!A$2:J, Counts!B$2:B=A' + row + ', Counts!E$2:E=C' + row + '), 10, FALSE), 1, 7),"")');
  sheet.getRange(row, 6).setFormula('=Items!' + minCol + itemRow);
  sheet.getRange(row, 7).setFormula('=IF(E' + row + '="","Not counted",IF(E' + row + '<=F' + row + ',"Reorder","OK"))');
  sheet.getRange(row, 8).setFormula('=IFERROR(INDEX(SORT(FILTER(Counts!A$2:J, Counts!B$2:B=A' + row + ', Counts!E$2:E=C' + row + '), 10, FALSE), 1, 1),"")');
  sheet.getRange(row, 9).setFormula('=IFERROR(INDEX(SORT(FILTER(Counts!A$2:J, Counts!B$2:B=A' + row + ', Counts!E$2:E=C' + row + '), 10, FALSE), 1, 3),"")');
}

function refreshTableChrome_(sheet, cols) {
  var last = Math.max(sheet.getLastRow(), 2);
  var range = sheet.getRange(1, 1, last, cols);
  var filter = sheet.getFilter();
  if (filter) filter.remove();
  range.createFilter();
  var bandings = sheet.getBandings();
  for (var i = 0; i < bandings.length; i++) {
    try { bandings[i].setRange(range); } catch (err) {}
  }
}

function param_(e, name) {
  if (!e || !e.parameter || e.parameter[name] == null) return '';
  return trim_(e.parameter[name]);
}

function trim_(value) {
  return String(value == null ? '' : value).trim();
}

function toNum_(value, fallback) {
  if (value === '' || value == null) return fallback;
  var n = Number(value);
  return isFinite(n) ? n : fallback;
}

function isNonNegInt_(value) {
  if (value === '' || value == null) return false;
  var n = Number(value);
  return isFinite(n) && n >= 0 && Math.floor(n) === n && n <= 99999;
}

function plain_(value) {
  var text = String(value == null ? '' : value);
  if (/^[=+\-@]/.test(text)) return "'" + text;
  return text;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function text_(value) {
  return ContentService.createTextOutput(value);
}

function jsonpOrJson_(e, obj) {
  var json = JSON.stringify(obj);
  var cb = param_(e, 'callback');
  if (cb && /^[A-Za-z_][A-Za-z0-9_]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
