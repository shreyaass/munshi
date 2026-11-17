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
