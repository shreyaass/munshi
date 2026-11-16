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
