/**
 * Setup, menu and token management.
 *
 * The user deploys the Web App manually (Google does not allow automating it).
 * Everything else — tabs, headers, seed accounts/categories, token — happens here.
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

  DATA_TABS.concat(['Meta']).forEach(function (tab) {
    var sh = ss.getSheetByName(tab) || ss.insertSheet(tab);
    var headers = HEADERS[tab];
    var existing = sh.getLastColumn() > 0 ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];

    var needsHeader = sh.getLastRow() === 0;
    for (var i = 0; i < headers.length && !needsHeader; i++) {
      if (String(existing[i] || '').toLowerCase() !== headers[i].toLowerCase()) needsHeader = true;
    }

    if (needsHeader) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f3f4');
    sh.setFrozenRows(1);
    if (sh.getLastRow() > 1) {
      sh.getRange(1, 1, sh.getLastRow(), headers.length).createFilter();
    }
  });

  removeDefaultSheet_(ss);
  seedIfEmpty_(ss);
  writeMeta_('schema_version', String(SCHEMA_VERSION));

  if (!getToken_()) {
    PropertiesService.getScriptProperties().setProperty('API_TOKEN', generateToken_());
  }

  sortTabs_(ss);
  SpreadsheetApp.flush();

  if (showDialog !== false) showConnectionInfo();
  return { ok: true, url: serviceUrl_(), token: getToken_() };
}

function removeDefaultSheet_(ss) {
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) ss.deleteSheet(sheet1);
}

function seedIfEmpty_(ss) {
  if (ss.getSheetByName('Accounts').getLastRow() < 2) {
    var accounts = [
      ['acc-cash', 'Cash', 'cash', 0, true],
      ['acc-bank', 'Bank', 'bank', 0, true],
      ['acc-upi', 'UPI', 'upi', 0, true]
    ];
    accounts.forEach(function (a) { appendSeed_('Accounts', a); });
  }

  if (ss.getSheetByName('Categories').getLastRow() < 2) {
    var expense = [
      ['Food', '🍜', '#f97316'], ['Groceries', '🛒', '#22c55e'], ['Transport', '🚌', '#3b82f6'],
      ['Bills', '⚡', '#eab308'], ['Rent', '🏠', '#a855f7'], ['Shopping', '🛍️', '#ec4899'],
      ['Health', '💊', '#ef4444'], ['Entertainment', '🎬', '#06b6d4'], ['Travel', '✈️', '#0ea5e9'],
      ['Other', '📦', '#64748b']
    ];
    expense.forEach(function (c, i) {
      appendSeed_('Categories', ['cat-exp-' + (i + 1), c[0], 'expense', '', c[1], c[2], 0, true]);
    });

    var income = [['Salary', '💰', '#16a34a'], ['Refund', '↩️', '#0d9488'], ['Interest', '📈', '#7c3aed'], ['Gift', '🎁', '#db2777'], ['Other', '📦', '#64748b']];
    income.forEach(function (c, i) {
      appendSeed_('Categories', ['cat-inc-' + (i + 1), c[0], 'income', '', c[1], c[2], 0, true]);
    });
  }

  var meta = readMeta_();
  if (!meta.schema_version) writeMeta_('schema_version', String(SCHEMA_VERSION));
  if (!meta.currency) writeMeta_('currency', 'INR');
  if (!meta.locale) writeMeta_('locale', 'en-IN');
  if (!meta.week_start) writeMeta_('week_start', '1');
}

/** Seeds use a fixed column order (the header order for that tab). */
function appendSeed_(tab, values) {
  var sh = sheetFor_(tab);
  var headers = HEADERS[tab];
  var row = {};

  if (tab === 'Accounts') {
    row = { id: values[0], name: values[1], type: values[2], opening_balance_paise: values[3], active: values[4] };
  } else if (tab === 'Categories') {
    row = { id: values[0], name: values[1], type: values[2], parent_id: values[3], icon: values[4], color: values[5], monthly_budget_paise: values[6], active: values[7] };
  }

  row.updated_at = new Date().toISOString();
  row.device_id = 'seed';
  row.deleted = false;
  sh.appendRow(rowToArray_(tab, row));
}

function sortTabs_(ss) {
  var order = ['Expenses', 'Income', 'Transfers', 'Accounts', 'Categories', 'Budgets', 'Recurring', 'Meta'];
  order.forEach(function (name, i) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(i + 1);
  });
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
      assertHeaders_(tab, headerOf_(sh));
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
