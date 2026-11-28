/**
 * @OnlyCurrentDoc
 *
 * Munshi (Expense Manager) — Apps Script Web App
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

var SCHEMA_VERSION = 3;

var DATA_TABS = [
  'Expenses',
  'Income',
  'Transfers',
  'Accounts',
  'Categories',
  'Budgets',
  'Recurring',
  'Goals',
  'Contributions',
  'GoalPeriods'
];

var HEADERS = {
  Expenses: ['id', 'date', 'amount_paise', 'category_id', 'account_id', 'payee', 'notes', 'tags', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Income: ['id', 'date', 'amount_paise', 'category_id', 'account_id', 'payee', 'notes', 'tags', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Transfers: ['id', 'date', 'amount_paise', 'from_account_id', 'to_account_id', 'notes', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Accounts: ['id', 'name', 'type', 'opening_balance_paise', 'active', 'updated_at', 'device_id', 'deleted', 'kind', 'is_savings', 'last4', 'bank_name'],
  Categories: ['id', 'name', 'type', 'parent_id', 'icon', 'color', 'monthly_budget_paise', 'active', 'updated_at', 'device_id', 'deleted', 'pinned', 'sort_order'],
  Budgets: ['id', 'month', 'kind', 'category_id', 'amount_paise', 'updated_at', 'device_id', 'deleted'],
  Recurring: ['id', 'amount_paise', 'type', 'category_id', 'account_id', 'payee', 'rule', 'next_date', 'active', 'updated_at', 'device_id', 'deleted'],
  Goals: ['id', 'name', 'target_paise', 'recurrence', 'deadline', 'start_date', 'end_date', 'priority', 'linked_account_id', 'icon', 'status', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Contributions: ['id', 'date', 'amount_paise', 'goal_id', 'from_account_id', 'to_account_id', 'notes', 'created_at', 'updated_at', 'device_id', 'deleted'],
  GoalPeriods: ['id', 'goal_id', 'period_key', 'target_paise', 'contributed_paise', 'status', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Meta: ['key', 'value']
};

var NUMERIC_FIELDS = {
  amount_paise: true,
  opening_balance_paise: true,
  monthly_budget_paise: true,
  sort_order: true,
  target_paise: true,
  priority: true,
  contributed_paise: true
};

var BOOLEAN_FIELDS = { active: true, deleted: true, pinned: true, is_savings: true };

/* -------------------------------------------------------------------------- */
/* Router                                                                      */
/* -------------------------------------------------------------------------- */

function doPost(e) {
  try {
    cacheLiveExecUrl_();
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var body = JSON.parse(raw);

    var expected = getToken_();
    if (!expected) {
      return fail_('Setup has not been run. Open Munshi > 1. Setup / repair sheet in the sheet menu.');
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
  cacheLiveExecUrl_();
  return ContentService
    .createTextOutput('Munshi API is running. POST JSON to this URL.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/** Caches the real /exec deployment URL when invoked over a live Web App request. */
function cacheLiveExecUrl_() {
  try {
    var u = ScriptApp.getService().getUrl() || '';
    if (/\/exec$/.test(u)) {
      var props = PropertiesService.getScriptProperties();
      if (props.getProperty('WEBAPP_URL') !== u) {
        props.setProperty('WEBAPP_URL', u);
      }
    }
  } catch (err) {
    // Non-fatal: manual save in ConnectionInfo still works.
  }
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
