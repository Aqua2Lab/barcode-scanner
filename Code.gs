function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var headers = ['Timestamp','Barcode','Product','Shelf Qty','Stock Qty','Comment','Store','Cashier'];
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
  } else if (String(sh.getRange(1, 1).getValue()) === 'Timestamp') {
    if (!sh.getRange(1, 7).getValue()) {
      // Add the header in column G only. Columns A-F stay where they are.
      sh.getRange(1, 7).setValue('Store');
    }
    if (!sh.getRange(1, 8).getValue()) {
      // Add the header in column H only. Columns A-G stay where they are.
      sh.getRange(1, 8).setValue('Cashier');
    }
  }
  sh.insertRowBefore(2);
  sh.getRange(2, 1, 1, 8).setValues([[
    Utilities.formatDate(new Date(), 'America/Chicago', 'MM/dd/yyyy hh:mm:ss a'),
    "'" + d.code,
    d.name,
    d.shelf,
    d.stock,
    d.comment || '',
    d.store || '',
    d.cashier || ''
  ]]);
  return ContentService.createTextOutput('ok');
}
