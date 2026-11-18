function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(['Timestamp','Barcode','Product','Shelf Qty','Stock Qty','Comment']);
  sh.insertRowBefore(2);
  sh.getRange(2, 1, 1, 6).setValues([[Utilities.formatDate(new Date(), 'America/Chicago', 'MM/dd/yyyy hh:mm:ss a'), "'" + d.code, d.name, d.shelf, d.stock, d.comment || '']]);
  return ContentService.createTextOutput('ok');
}
