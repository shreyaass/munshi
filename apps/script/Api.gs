/** API handlers. Keep the response shapes matched to packages/core/src/client.ts. */

function ping_() {
  var ss = ss_();
  var problems = [];
  var missing = [];

  for (var i = 0; i < DATA_TABS.length; i++) {
    var tab = DATA_TABS[i];
    var sh = ss.getSheetByName(tab);
    if (!sh) { missing.push(tab); continue; }
    try {
      assertHeaders_(tab, headerOf_(sh));
    } catch (err) {
      problems.push(String(err.message || err));
    }
  }
  if (ss.getSheetByName('Meta') === null) missing.push('Meta');

  // An untouched template is set up automatically so "connect" is one tap.
  if (missing.length === DATA_TABS.length + 1 || (missing.length > 0 && !readMeta_().schema_version)) {
    setupSheet_(false);
    problems = [];
    missing = [];
  }

  var meta = readMeta_();
  var version = Number(meta.schema_version || SCHEMA_VERSION);

  if (version !== SCHEMA_VERSION) {
    problems.push('Sheet schema is v' + version + ', this app expects v' + SCHEMA_VERSION + '.');
  }
  if (missing.length) {
    problems.push('Missing tabs: ' + missing.join(', ') + '. Run Setup from the sheet menu.');
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
