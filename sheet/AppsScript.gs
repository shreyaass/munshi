/**
 * Expense Manager — combined Apps Script backend (generated file).
 *
 * Source of truth: apps/script/{Code,Sheet,Api,Setup}.gs
 * Paste this whole file into the bound Apps Script project's Code.gs.
 *
 * You still need two more files in the same project:
 *   - ConnectionInfo.html  (File > New > HTML)
 *   - appsscript.json      (Project Settings > Show manifest, then paste)
 *
 * Do not edit this generated copy; edit the sources and regenerate.
 */

/* ===================== apps/script/Code.gs ===================== */
/**
 * Expense Manager — Apps Script Web App
 *
 * The whole backend. Deployed by the sheet's owner as:
 *   Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Contract v1:
 *   POST body: { token, action: "ping" | "readAll" | "batch", payload }
 *   Response:  { ok: true, result } | { ok: false, error }
 *
 * Keep this file's surface frozen. All product logic belongs in the app.
 */

var SCHEMA_VERSION = 2;

var DATA_TABS = ['Expenses', 'Income', 'Transfers', 'Accounts', 'Categories', 'Budgets', 'Recurring'];

var HEADERS = {
  Expenses: ['id', 'date', 'amount_paise', 'category_id', 'account_id', 'payee', 'notes', 'tags', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Income: ['id', 'date', 'amount_paise', 'category_id', 'account_id', 'payee', 'notes', 'tags', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Transfers: ['id', 'date', 'amount_paise', 'from_account_id', 'to_account_id', 'notes', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Accounts: ['id', 'name', 'type', 'opening_balance_paise', 'active', 'updated_at', 'device_id', 'deleted'],
  Categories: ['id', 'name', 'type', 'parent_id', 'icon', 'color', 'monthly_budget_paise', 'active', 'updated_at', 'device_id', 'deleted', 'pinned', 'sort_order'],
  Budgets: ['id', 'month', 'kind', 'category_id', 'amount_paise', 'updated_at', 'device_id', 'deleted'],
  Recurring: ['id', 'amount_paise', 'type', 'category_id', 'account_id', 'payee', 'rule', 'next_date', 'active', 'updated_at', 'device_id', 'deleted'],
  Meta: ['key', 'value']
};

var NUMERIC_FIELDS = {
  amount_paise: true,
  opening_balance_paise: true,
  monthly_budget_paise: true,
  sort_order: true
};

var BOOLEAN_FIELDS = { active: true, deleted: true, pinned: true };

/* -------------------------------------------------------------------------- */
/* Router                                                                      */
/* -------------------------------------------------------------------------- */

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var body = JSON.parse(raw);

    var expected = getToken_();
    if (!expected) {
      return fail_('Setup has not been run. Open Expense Tracker > Setup in the sheet menu.');
    }
    if (!body || body.token !== expected) {
      return fail_('unauthorized: bad token');
    }

    var action = String(body.action || '');
    var payload = body.payload || {};
    var result;

    switch (action) {
      case 'ping':
        result = ping_();
        break;
      case 'readAll':
        result = readAll_(payload);
        break;
      case 'batch':
        result = batch_(payload);
        break;
      default:
        return fail_('unknown action: ' + action);
    }

    return ok_(result);
  } catch (err) {
    return fail_(String((err && err.message) || err));
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Expense Manager API is running. POST JSON to this URL.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function ok_(result) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, result: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function fail_(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: String(message) }))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ===================== apps/script/Sheet.gs ===================== */
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


/* ===================== apps/script/Api.gs ===================== */
/** API handlers. Keep the response shapes matched to packages/core/src/client.ts. */

function ping_() {
  var ss = ss_();
  var meta = readMeta_();

  // An untouched template sets itself up, so "connect" is one tap.
  if (!meta.schema_version) {
    setupSheet(false);
    meta = readMeta_();
  }

  var problems = [];
  var missing = [];

  for (var i = 0; i < DATA_TABS.length; i++) {
    var tab = DATA_TABS[i];
    var sh = ss.getSheetByName(tab);
    if (!sh) { missing.push(tab); continue; }
    try {
      assertHeaders_(tab, ensureHeaders_(sh, tab));
    } catch (err) {
      problems.push(String(err.message || err));
    }
  }
  if (ss.getSheetByName('Meta') === null) missing.push('Meta');

  if (missing.length > 0) {
    problems.push('Missing tabs: ' + missing.join(', ') + '. Run Setup from the sheet menu.');
  }

  var version = Number(meta.schema_version || 0);
  if (version > SCHEMA_VERSION) {
    problems.push('This sheet is schema v' + version + ' but the app only understands v' + SCHEMA_VERSION + '. Update the app.');
  }

  return {
    ok: problems.length === 0,
    version: version,
    currency: meta.currency || 'INR',
    locale: meta.locale || 'en-IN',
    problems: problems
  };
}

function readAll_(payload) {
  var tabs = payload && payload.tabs && payload.tabs.length ? payload.tabs : DATA_TABS;
  var data = {};
  var problems = [];

  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    if (DATA_TABS.indexOf(tab) === -1) continue;
    try {
      data[tab] = readTab_(tab);
    } catch (err) {
      problems.push(String(err.message || err));
    }
  }

  return {
    ok: problems.length === 0,
    version: Number(readMeta_().schema_version || SCHEMA_VERSION),
    data: data,
    problems: problems,
    serverTime: new Date().toISOString()
  };
}

function batch_(payload) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return { ok: false, applied: 0, rejected: [{ tab: '-', id: '-', reason: 'busy: another write is in progress' }] };
  }

  var applied = 0;
  var rejected = [];

  try {
    var upserts = (payload && payload.upserts) || [];
    var deletes = (payload && payload.deletes) || [];

    for (var i = 0; i < upserts.length; i++) {
      var u = upserts[i];
      try {
        validateRow_(u.tab, u.row);
        upsertRow_(u.tab, u.row);
        applied++;
      } catch (err) {
        rejected.push({ tab: u.tab, id: (u.row && u.row.id) || '-', reason: String(err.message || err) });
      }
    }

    for (var j = 0; j < deletes.length; j++) {
      var d = deletes[j];
      try {
        deleteRow_(d.tab, d.id);
        applied++;
      } catch (err) {
        rejected.push({ tab: d.tab, id: d.id, reason: String(err.message || err) });
      }
    }
  } finally {
    lock.releaseLock();
  }

  return { ok: rejected.length === 0, applied: applied, rejected: rejected };
}

function validateRow_(tab, row) {
  if (!row || !row.id) throw new Error('row.id is required');
  if (DATA_TABS.indexOf(tab) === -1) throw new Error('unknown tab: ' + tab);

  if (tab === 'Expenses' || tab === 'Income') {
    var amount = Number(row.amount_paise);
    if (!isFinite(amount) || amount <= 0) throw new Error('amount_paise must be a positive integer');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.date || ''))) throw new Error('date must be YYYY-MM-DD');
  }
  if (tab === 'Transfers') {
    var tAmount = Number(row.amount_paise);
    if (!isFinite(tAmount) || tAmount <= 0) throw new Error('amount_paise must be positive');
    if (String(row.from_account_id) === String(row.to_account_id)) throw new Error('transfer needs two different accounts');
  }
  if (row.deleted === true || row.deleted === 'TRUE') {
    // Tombstones are always allowed.
    return;
  }
}


/* ===================== apps/script/Setup.gs ===================== */
/**
 * Setup, menu and token management.
 *
 * The user deploys the Web App manually (Google does not allow automating it).
 * Everything else — tabs, headers, seed categories/budgets, token — happens here.
 */

var MENU_NAME = 'Expense Tracker';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(MENU_NAME)
    .addItem('1. Setup / repair sheet', 'setupSheet')
    .addItem('2. Show connection info', 'showConnectionInfo')
    .addSeparator()
    .addItem('Validate sheet', 'validateSheet')
    .addItem('Rotate access token', 'rotateToken')
    .addToUi();
}

/** @param {boolean=} showDialog */
function setupSheet(showDialog) {
  var ss = ss_();

  // Additive migration: creates missing tabs, appends missing columns, never
  // moves or deletes anything the user put there.
  DATA_TABS.concat(['Meta']).forEach(function (tab) {
    var sh = ss.getSheetByName(tab) || ss.insertSheet(tab);
    ensureHeaders_(sh, tab);
    try {
      if (sh.getLastRow() > 1) {
        sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).createFilter();
      }
    } catch (err) {
      // A filter already exists — fine.
    }
  });

  removeDefaultSheet_(ss);
  seedIfEmpty_(ss);
  buildGeneratedTabs_(ss);
  writeMeta_('schema_version', String(SCHEMA_VERSION));

  if (!getToken_()) {
    PropertiesService.getScriptProperties().setProperty('API_TOKEN', generateToken_());
  }

  sortTabs_(ss);
  SpreadsheetApp.flush();

  if (showDialog !== false) showConnectionInfo();
  return { ok: true, version: SCHEMA_VERSION, url: serviceUrl_(), token: getToken_() };
}

function removeDefaultSheet_(ss) {
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) ss.deleteSheet(sheet1);
}

function seedIfEmpty_(ss) {
  // Accounts are deliberately NOT seeded: the app asks for the first account
  // (and its real current balance) during onboarding, so the sheet starts empty.
  if (ss.getSheetByName('Categories').getLastRow() < 2) {
    // name, icon, colour, pinned, sort_order
    // Only a few are pinned; the Add screen fills the remaining slots from
    // whatever the user actually spends on.
    var expense = [
      ['Food', '🍜', '#f97316', true, 1],
      ['Groceries', '🛒', '#22c55e', true, 2],
      ['Transport', '🚌', '#3b82f6', true, 3],
      ['Bills', '⚡', '#eab308', true, 4],
      ['Shopping', '🛍️', '#ec4899', false, 0],
      ['Health', '💊', '#ef4444', false, 0],
      ['Entertainment', '🎬', '#06b6d4', false, 0],
      ['Travel', '✈️', '#0ea5e9', false, 0],
      ['Other', '📦', '#64748b', false, 0]
    ];
    expense.forEach(function (c, i) {
      appendSeed_('Categories', ['cat-exp-' + (i + 1), c[0], 'expense', '', c[1], c[2], 0, true, c[3], c[4]]);
    });

    var income = [
      ['Salary', '💰', '#16a34a', true, 1],
      ['Refund', '↩️', '#0d9488', false, 0],
      ['Interest', '📈', '#7c3aed', false, 0],
      ['Gift', '🎁', '#db2777', false, 0],
      ['Other', '📦', '#64748b', false, 0]
    ];
    income.forEach(function (c, i) {
      appendSeed_('Categories', ['cat-inc-' + (i + 1), c[0], 'income', '', c[1], c[2], 0, true, c[3], c[4]]);
    });
  }

  var meta = readMeta_();
  if (!meta.schema_version) writeMeta_('schema_version', String(SCHEMA_VERSION));
  if (!meta.currency) writeMeta_('currency', 'INR');
  if (!meta.locale) writeMeta_('locale', 'en-IN');
  if (!meta.week_start) writeMeta_('week_start', '1');

  if (ss.getSheetByName('Budgets').getLastRow() < 2) {
    // Standing targets. `month` = * means every month; amount 0 = "not set".
    var budgets = [
      ['bud-total', '*', 'total', '', 0],
      ['bud-daily', '*', 'daily', '', 0]
    ];
    budgets.forEach(function (b) { appendSeed_('Budgets', b); });
  }
}

/** Seeds use the header order for that tab. */
function appendSeed_(tab, values) {
  var sh = sheetFor_(tab);
  var row = {};

  if (tab === 'Accounts') {
    row = { id: values[0], name: values[1], type: values[2], opening_balance_paise: values[3], active: values[4] };
  } else if (tab === 'Categories') {
    row = {
      id: values[0], name: values[1], type: values[2], parent_id: values[3],
      icon: values[4], color: values[5], monthly_budget_paise: values[6],
      active: values[7], pinned: values[8], sort_order: values[9]
    };
  } else if (tab === 'Budgets') {
    row = {
      id: values[0], month: values[1], kind: values[2],
      category_id: values[3], amount_paise: values[4]
    };
  }

  row.updated_at = new Date().toISOString();
  row.device_id = 'seed';
  row.deleted = false;
  sh.appendRow(valuesForRow_(ensureHeaders_(sh, tab), row, null));
}

function sortTabs_(ss) {
  var order = ['Expenses', 'Income', 'Transfers', 'Accounts', 'Categories', 'Budgets', 'Recurring', 'Meta', 'View', 'Read me'];
  order.forEach(function (name, i) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(i + 1);
  });
}

/* -------------------------------------------------------------------------- */
/* Generated tabs: View + Read me                                              */
/* -------------------------------------------------------------------------- */

/**
 * Both tabs are script-owned, never synced:
 *   View    — formula-only summary of Expenses in rupees with names resolved.
 *   Read me — what the tabs mean and which cells are safe to touch.
 * Setup rebuilds them, so they can never drift from the schema.
 */

var READ_ME_MARKER = 'Expense Manager — Read me (schema v' + SCHEMA_VERSION + ')';

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/** 0-based column index -> A1 column letters (0 -> A, 26 -> AA). */
function columnLetter_(index) {
  var n = index + 1;
  var letters = '';
  while (n > 0) {
    var rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function buildGeneratedTabs_(ss) {
  buildView_(ss);
  buildReadMe_(ss);
}

function buildView_(ss) {
  var sh = getOrCreateSheet_(ss, 'View');
  sh.clear();

  var expHeaders = ensureHeaders_(sheetFor_('Expenses'), 'Expenses');
  var catHeaders = ensureHeaders_(sheetFor_('Categories'), 'Categories');
  var accHeaders = ensureHeaders_(sheetFor_('Accounts'), 'Accounts');
  var exp = headerIndex_(expHeaders);
  var cat = headerIndex_(catHeaders);
  var acc = headerIndex_(accHeaders);

  // The view covers the first 5,000 data rows; more than enough for <100 people.
  var LAST = 5001;

  function col(map, name) {
    if (!(name in map)) throw new Error('View: missing column "' + name + '"');
    return columnLetter_(map[name]);
  }
  function range(tab, map, name) {
    var c = col(map, name);
    return tab + '!$' + c + '$2:$' + c + '$' + LAST;
  }

  var idRange = range('Expenses', exp, 'id');
  var deletedRange = range('Expenses', exp, 'deleted');
  var guard = '((' + idRange + '="")+(' + deletedRange + '=TRUE))';

  var catId = col(cat, 'id');
  var catName = col(cat, 'name');
  var accId = col(acc, 'id');
  var accName = col(acc, 'name');

  var catLookup =
    'XLOOKUP(' + range('Expenses', exp, 'category_id') +
    ',Categories!$' + catId + '$2:$' + catId + '$' + LAST +
    ',Categories!$' + catName + '$2:$' + catName + '$' + LAST +
    ',"?")';

  var accLookup =
    'XLOOKUP(' + range('Expenses', exp, 'account_id') +
    ',Accounts!$' + accId + '$2:$' + accId + '$' + LAST +
    ',Accounts!$' + accName + '$2:$' + accName + '$' + LAST +
    ',"?")';

  var formulas = [
    '=ARRAYFORMULA(IF(' + guard + ',"",' + range('Expenses', exp, 'date') + '))',
    '=ARRAYFORMULA(IF(' + guard + ',"",' + range('Expenses', exp, 'amount_paise') + '/100))',
    '=ARRAYFORMULA(IF(' + guard + ',"",' + catLookup + '))',
    '=ARRAYFORMULA(IF(' + guard + ',"",' + accLookup + '))',
    '=ARRAYFORMULA(IF(' + guard + ',"",' + range('Expenses', exp, 'payee') + '))',
    '=ARRAYFORMULA(IF(' + guard + ',"",' + range('Expenses', exp, 'notes') + '))'
  ];

  var header = ['DATE', 'AMOUNT (₹)', 'CATEGORY', 'ACCOUNT', 'PAYEE', 'NOTES'];

  sh.getRange(1, 1, 1, header.length).merge();
  sh.getRange(1, 1).setValue('Live expense view — generated from the Expenses tab. Do not edit; Setup rebuilds it.');
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(12);

  sh.getRange(3, 1, 1, header.length).setValues([header])
    .setFontWeight('bold')
    .setBackground('#f1f3f4');
  sh.getRange(4, 1, 1, formulas.length).setFormulas([formulas]);

  sh.getRange(4, 1, LAST - 3, 1).setNumberFormat('yyyy-mm-dd');
  sh.getRange(4, 2, LAST - 3, 1).setNumberFormat('"₹"#,##0.00');

  sh.setFrozenRows(3);
  sh.setColumnWidths(1, 1, 108);
  sh.setColumnWidths(2, 1, 120);
  sh.setColumnWidths(3, 1, 160);
  sh.setColumnWidths(4, 1, 130);
  sh.setColumnWidths(5, 1, 160);
  sh.setColumnWidths(6, 1, 280);
  sh.setTabColor('#94a3b8');
}

function buildReadMe_(ss) {
  var sh = getOrCreateSheet_(ss, 'Read me');
  var current = sh.getLastRow() >= 1 ? String(sh.getRange(1, 1).getValue()) : '';
  if (current === READ_ME_MARKER) return;

  sh.clear();

  var lines = [
    '# ' + READ_ME_MARKER,
    '',
    'This spreadsheet is the database. The app talks to it through a small Apps Script Web App; the sheet stays private in your Google Drive.',
    '',
    '## Tabs',
    'Expenses / Income — one row per transaction.',
    'Transfers — money moved between your own accounts. Never counted as income or expense.',
    'Accounts — cash, bank, UPI, credit or wallet. active=FALSE hides an account without deleting its history.',
    'Categories — icon, colour, quick-chip pinning (pinned, sort_order).',
    'Budgets — targets. month is * for every month, or YYYY-MM for one month. kind is total, daily or category (category uses category_id).',
    'Recurring — rules for future automatic entries. Not wired into the app yet.',
    'Meta — app settings (schema_version, currency, locale, week_start). Do not edit by hand.',
    'View — generated expense view in rupees with names resolved. Read-only by convention.',
    'Read me — this tab. Setup rewrites it when the schema changes.',
    '',
    '## Columns',
    'Amounts are integer paise: 12500 means ₹125.00. Never type ₹125 or 125.00 into a paise column.',
    'Dates are YYYY-MM-DD. Timestamps are ISO UTC.',
    'id, created_at, updated_at, device_id and deleted are sync bookkeeping. Do not edit them.',
    'deleted=TRUE is a tombstone: the row stays so other devices learn about the delete. Never remove a row by hand.',
    'You may add your own columns anywhere; the app ignores them and preserves them on update.',
    'Do not rename or remove the required columns. Sync matches by name, so a renamed column looks missing.',
    '',
    '## Budgets cheat sheet',
    'id | month | kind | category_id | amount_paise',
    'bud-total | * | total | (empty) | 3000000    → ₹30,000 every month',
    'bud-daily | * | daily | (empty) | 100000     → ₹1,000 a day',
    'bud-2026-12 | 2026-12 | total | (empty) | 4000000    → December only',
    'bud-food | * | category | cat-exp-1 | 800000    → ₹8,000/month on Food',
    '',
    '## Setup and safety',
    'Run Expense Tracker > Setup / repair sheet after updating the script. It only appends missing tabs/columns; it never moves or deletes your data.',
    'Run Expense Tracker > Rotate access token if the token leaks. Every device must then paste the new token.',
    'The app needs the Web App URL and the access token. Treat both as passwords.'
  ];

  sh.getRange(1, 1, lines.length, 1).setValues(
    lines.map(function (line) { return [line.replace(/^#+\s*/, '')]; })
  );

  lines.forEach(function (line, i) {
    var row = sh.getRange(i + 1, 1);
    if (line.indexOf('# ') === 0) {
      row.setFontWeight('bold').setFontSize(14);
    } else if (line.indexOf('## ') === 0) {
      row.setFontWeight('bold').setBackground('#f1f3f4');
    }
  });

  sh.setColumnWidth(1, 760);
  sh.getRange(1, 1, lines.length, 1)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setVerticalAlignment('top');
  sh.setTabColor('#94a3b8');
}

/* -------------------------------------------------------------------------- */
/* Connection info dialog                                                      */
/* -------------------------------------------------------------------------- */

function showConnectionInfo() {
  var tpl = HtmlService.createTemplateFromFile('ConnectionInfo');
  tpl.url = serviceUrl_();
  tpl.token = getToken_() || '(run Setup first)';

  var html = tpl.evaluate()
    .setWidth(470)
    .setHeight(460);
  SpreadsheetApp.getUi().showModalDialog(html, 'Connect Expense Manager');
}

function serviceUrl_() {
  // Works after the first deployment. Returns null while undeployed.
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (err) {
    return '';
  }
}

function validateSheet() {
  var problems = [];
  var ss = ss_();
  DATA_TABS.forEach(function (tab) {
    var sh = ss.getSheetByName(tab);
    if (!sh) { problems.push('Missing tab: ' + tab); return; }
    try {
      assertHeaders_(tab, ensureHeaders_(sh, tab));
    } catch (err) {
      problems.push(String(err.message || err));
    }
  });

  var ui = SpreadsheetApp.getUi();
  if (problems.length === 0) {
    ui.alert('Sheet looks good', 'All tabs and headers match schema v' + SCHEMA_VERSION + '.', ui.ButtonSet.OK);
  } else {
    ui.alert('Problems found', problems.join('\n'), ui.ButtonSet.OK);
  }
}

function rotateToken() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert('Rotate token?', 'Every connected device will need to paste the new token.', ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;

  var token = generateToken_();
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', token);
  ui.alert('New token', token, ui.ButtonSet.OK);
}

function getToken_() {
  return PropertiesService.getScriptProperties().getProperty('API_TOKEN') || '';
}

function generateToken_() {
  var bytes = [];
  for (var i = 0; i < 32; i++) bytes.push(Math.floor(Math.random() * 256));
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}
