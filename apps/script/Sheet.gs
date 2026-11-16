/**
 * Sheet access. Every read and write goes through here so header validation,
 * locking and formula-injection escaping can never be bypassed.
 */

function ss_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet bound to this script. Open the script from the sheet: Extensions > Apps Script.');
  return ss;
}

function sheetFor_(tab) {
  if (DATA_TABS.indexOf(tab) === -1 && tab !== 'Meta') throw new Error('unknown tab: ' + tab);
  var sh = ss_().getSheetByName(tab);
  if (!sh) throw new Error('missing tab: ' + tab + '. Run Setup from the sheet menu.');
  return sh;
}

function headerOf_(sh) {
  var lastCol = Math.max(sh.getLastColumn(), 1);
  return sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) { return String(v == null ? '' : v).trim(); });
}

function assertHeaders_(tab, headers) {
  var expected = HEADERS[tab];
  if (!expected) return;
  for (var i = 0; i < expected.length; i++) {
    if (String(headers[i] || '').toLowerCase() !== expected[i].toLowerCase()) {
      throw new Error('schema mismatch in "' + tab + '" column ' + (i + 1) + ': expected "' + expected[i] + '", found "' + (headers[i] || '') + '"');
    }
  }
}

/** Known numeric columns become numbers; dates become YYYY-MM-DD; booleans become true/false. */
function coerceCell_(field, value) {
  if (value === null || value === undefined || value === '') return '';

  if (NUMERIC_FIELDS[field]) {
    var n = Number(String(value).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  if (BOOLEAN_FIELDS[field]) {
    return value === true || value === 'TRUE' || value === 'true' || value === 1 || value === '1';
  }
  if (field === 'date' || field === 'next_date' || field === 'created_at' || field === 'updated_at') {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), field === 'date' || field === 'next_date' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }
    return String(value);
  }
  return escapeFormula_(value);
}

function escapeFormula_(value) {
  if (typeof value !== 'string') return value;
  // A leading = + - @ (or tab/CR) would be interpreted as a formula.
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function rowsFromValues_(headers, values) {
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var raw = values[r];
    var isEmpty = true;
    for (var c = 0; c < raw.length; c++) {
      if (raw[c] !== '' && raw[c] !== null && raw[c] !== undefined) { isEmpty = false; break; }
    }
    if (isEmpty) continue;

    var row = {};
    for (var i = 0; i < headers.length; i++) {
      var field = headers[i];
      if (!field) continue;
      row[field] = coerceCell_(field, raw[i]);
    }
    out.push(row);
  }
  return out;
}

function readTab_(tab) {
  var sh = sheetFor_(tab);
  var headers = headerOf_(sh);
  assertHeaders_(tab, headers);

  if (sh.getLastRow() < 2) return [];
  var values = sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS[tab].length).getValues();
  return rowsFromValues_(HEADERS[tab], values);
}

function rowToArray_(tab, row, previous) {
  var headers = HEADERS[tab];
  var arr = new Array(headers.length);
  for (var i = 0; i < headers.length; i++) {
    var field = headers[i];
    var value = row.hasOwnProperty(field) ? row[field] : (previous ? previous[i] : '');
    if (field === 'updated_at' && !value) value = new Date().toISOString();
    arr[i] = coerceCell_(field, value);
  }
  return arr;
}

/** Insert or update, matched by `id` in column A. Idempotent. */
function upsertRow_(tab, row) {
  if (!row || !row.id) throw new Error('row.id is required');
  var sh = sheetFor_(tab);
  assertHeaders_(tab, headerOf_(sh));

  var idCol = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]) === String(row.id)) {
      var rowIndex = i + 2;
      var existing = sh.getRange(rowIndex, 1, 1, HEADERS[tab].length).getValues()[0];
      sh.getRange(rowIndex, 1, 1, HEADERS[tab].length).setValues([rowToArray_(tab, row, existing)]);
      return 'updated';
    }
  }

  sh.appendRow(rowToArray_(tab, row));
  return 'inserted';
}

/** Tombstone, never a physical delete — deletes must propagate to other devices. */
function deleteRow_(tab, id) {
  var sh = sheetFor_(tab);
  assertHeaders_(tab, headerOf_(sh));

  var last = sh.getLastRow();
  if (last < 2) return 'not-found';

  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  var headers = HEADERS[tab];
  var deletedCol = headers.indexOf('deleted') + 1;
  var updatedCol = headers.indexOf('updated_at') + 1;
  if (deletedCol < 1) throw new Error('tab "' + tab + '" has no deleted column');

  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sh.getRange(i + 2, deletedCol).setValue(true);
      if (updatedCol > 0) sh.getRange(i + 2, updatedCol).setValue(new Date().toISOString());
      return 'deleted';
    }
  }
  return 'not-found';
}

function readMeta_() {
  var sh = ss_().getSheetByName('Meta');
  if (!sh || sh.getLastRow() < 2) return {};
  var values = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
  var meta = {};
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) meta[String(values[i][0])] = String(values[i][1]);
  }
  return meta;
}

function writeMeta_(key, value) {
  var sh = sheetFor_('Meta');
  var last = sh.getLastRow();
  if (last >= 2) {
    var values = sh.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0]) === String(key)) {
        sh.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
  }
  sh.appendRow([key, value]);
}
