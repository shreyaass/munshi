/**
 * Sheet access. Every read and write goes through here so header handling,
 * locking and formula-injection escaping can never be bypassed.
 *
 * v2: columns are matched BY NAME. Extra columns a user adds are preserved and
 * ignored, and column order no longer matters. Schema migrations are additive.
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

function headerRow_(sh) {
  var needed = Math.max(sh.getLastColumn(), 1);
  return sh.getRange(1, 1, 1, needed).getValues()[0].map(function (v) { return String(v == null ? '' : v).trim(); });
}

/** Lowercase name -> 0-based column index. */
function headerIndex_(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var name = String(headers[i] || '').trim().toLowerCase();
    if (name) map[name] = i;
  }
  return map;
}

function assertHeaders_(tab, headers) {
  var expected = HEADERS[tab];
  if (!expected) return;

  var present = headerIndex_(headers);
  var missing = [];
  for (var i = 0; i < expected.length; i++) {
    if (!(expected[i] in present)) missing.push(expected[i]);
  }
  if (missing.length > 0) {
    throw new Error('schema mismatch in "' + tab + '": missing columns ' + missing.join(', '));
  }
}

/**
 * Additive migration: writes the header row if the tab is empty, otherwise
 * appends any missing required columns to the right of what is already there.
 * Never moves or deletes a user column.
 */
function ensureHeaders_(sh, tab) {
  var expected = HEADERS[tab];
  if (!expected) return headerRow_(sh);

  var headers = headerRow_(sh).filter(function (h) { return h !== ''; });

  if (headers.length === 0) {
    sh.getRange(1, 1, 1, expected.length).setValues([expected.slice()]);
    headers = expected.slice();
  } else {
    var present = headerIndex_(headers);
    var missing = [];
    for (var i = 0; i < expected.length; i++) {
      if (!(expected[i] in present)) missing.push(expected[i]);
    }
    if (missing.length > 0) {
      sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
      headers = headers.concat(missing);
    }
  }

  sh.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#f1f3f4');
  sh.setFrozenRows(1);
  return headers;
}

/** Known numeric columns become numbers; dates become YYYY-MM-DD; booleans become true/false. */
function coerceCell_(field, value) {
  var key = String(field || '').toLowerCase();
  if (value === null || value === undefined || value === '') return '';

  if (NUMERIC_FIELDS[key]) {
    var n = Number(String(value).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  if (BOOLEAN_FIELDS[key]) {
    return value === true || value === 'TRUE' || value === 'true' || value === 1 || value === '1';
  }
  if (key === 'date' || key === 'next_date' || key === 'month') {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), key === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd');
    }
    return String(value);
  }
  if (key === 'created_at' || key === 'updated_at') {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
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

function readTab_(tab) {
  var sh = sheetFor_(tab);
  var headers = ensureHeaders_(sh, tab);
  assertHeaders_(tab, headers);

  var last = sh.getLastRow();
  if (last < 2) return [];

  var values = sh.getRange(2, 1, last - 1, headers.length).getValues();
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

/** Build a values array in the sheet's own column order, preserving unknown columns. */
function valuesForRow_(headers, row, previous) {
  var values = [];
  for (var i = 0; i < headers.length; i++) {
    var field = headers[i];
    if (!field) { values.push(''); continue; }

    if (row.hasOwnProperty(field)) {
      var value = row[field];
      if (field === 'updated_at' && !value) value = new Date().toISOString();
      values.push(coerceCell_(field, value));
    } else {
      values.push(previous && previous[i] !== undefined ? previous[i] : '');
    }
  }
  return values;
}

/** Insert or update, matched by `id`. Idempotent. */
function upsertRow_(tab, row) {
  if (!row || !row.id) throw new Error('row.id is required');

  var sh = sheetFor_(tab);
  var headers = ensureHeaders_(sh, tab);
  assertHeaders_(tab, headers);

  var idCol = headerIndex_(headers)['id'];
  var width = headers.length;
  var last = sh.getLastRow();

  if (idCol !== undefined && last >= 2) {
    var ids = sh.getRange(2, idCol + 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(row.id)) {
        var rowIndex = i + 2;
        var existing = sh.getRange(rowIndex, 1, 1, width).getValues()[0];
        sh.getRange(rowIndex, 1, 1, width).setValues([valuesForRow_(headers, row, existing)]);
        return 'updated';
      }
    }
  }

  sh.appendRow(valuesForRow_(headers, row, null));
  return 'inserted';
}

/** Tombstone, never a physical delete — deletes must propagate to other devices. */
function deleteRow_(tab, id) {
  var sh = sheetFor_(tab);
  var headers = ensureHeaders_(sh, tab);
  assertHeaders_(tab, headers);

  var map = headerIndex_(headers);
  var idCol = map['id'];
  var deletedCol = map['deleted'];
  var updatedCol = map['updated_at'];
  if (idCol === undefined) throw new Error('tab "' + tab + '" has no id column');
  if (deletedCol === undefined) throw new Error('tab "' + tab + '" has no deleted column');

  var last = sh.getLastRow();
  if (last < 2) return 'not-found';

  var ids = sh.getRange(2, idCol + 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sh.getRange(i + 2, deletedCol + 1).setValue(true);
      if (updatedCol !== undefined) sh.getRange(i + 2, updatedCol + 1).setValue(new Date().toISOString());
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
