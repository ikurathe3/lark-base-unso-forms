// Lark Base（多維表格）SDK との接続部分。Base の外で開いた場合は null を返し、デモモードにする。
import { STORAGE_KEY } from './settings.js';
import { toNumber } from './logic.js';

let bitable = null;
/** テスト用：SDK の代わりにモックを差し込む */
export const _setBitable = b => { bitable = b; };

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export async function connect() {
  if (window.self === window.top) return null; // iframe でなければ Base 外
  try {
    const sdk = await import('@lark-base-open/js-sdk');
    await withTimeout(sdk.bitable.base.getActiveTable(), 3000);
    bitable = sdk.bitable;
    return bitable;
  } catch { return null; }
}

export async function loadSettings() {
  if (!bitable) { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
  return bitable.bridge.getData(STORAGE_KEY).catch(() => null);
}

export async function saveSettings(settings) {
  if (!bitable) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {} return true; }
  return bitable.bridge.setData(STORAGE_KEY, settings);
}

export async function tables() {
  return bitable.base.getTableMetaList();
}

export async function activeTableId() {
  const sel = await bitable.base.getSelection();
  return sel.tableId || (await (await bitable.base.getActiveTable()).getMeta()).id;
}

export async function fields(tableId) {
  const table = await bitable.base.getTableById(tableId);
  return table.getFieldMetaList();
}

/** 対象レコードの ID 一覧。mode: 'selected'（チェックした行）| 'view'（表示中のビュー全件）| 'pick'（選択ダイアログ） */
export async function recordIds(tableId, mode) {
  const table = await bitable.base.getTableById(tableId);
  const sel = await bitable.base.getSelection();
  const viewId = sel.tableId === tableId ? sel.viewId : null;
  if (mode === 'pick') {
    const vid = viewId || (await table.getViewMetaList())[0].id;
    return bitable.ui.selectRecordIdList(tableId, vid);
  }
  if (mode === 'selected') {
    if (viewId) {
      const view = await table.getViewById(viewId);
      const ids = typeof view.getSelectedRecordIdList === 'function' ? await view.getSelectedRecordIdList().catch(() => []) : [];
      if (ids.length) return ids;
    }
    return sel.recordId && sel.tableId === tableId ? [sel.recordId] : [];
  }
  const ids = [];
  let pageToken;
  do {
    const res = await table.getRecordIdListByPage({ pageSize: 200, pageToken, ...(viewId ? { viewId } : {}) });
    ids.push(...res.recordIds);
    pageToken = res.hasMore ? res.pageToken : undefined;
  } while (pageToken);
  return ids;
}

/** 日時の値をタイムスタンプ(ms)に */
function toMs(value, str) {
  if (typeof value === 'number') return value;
  if (Array.isArray(value) && typeof value[0] === 'number') return value[0];
  const m = String(str || '').match(/(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})日?\s*(\d{1,2})?:?(\d{2})?/);
  if (!m) return null;
  const [, y, mo, d, h = 0, mi = 0] = m.map(x => (x === undefined ? undefined : Number(x)));
  return Date.UTC(y, mo - 1, d, h, mi) - 9 * 3600 * 1000; // 文字列は日本時間として解釈
}

/** 設定のフィールド割り当てに従って 1 レコード分の生データを読む */
export async function readRecords(tableId, ids, settings, defs) {
  const table = await bitable.base.getTableById(tableId);
  const map = settings.fields;
  return Promise.all(ids.map(async id => {
    const raw = { recordId: id };
    await Promise.all(defs.map(async def => {
      const fid = map[def.key];
      if (!fid) return;
      const str = await table.getCellString(fid, id).catch(() => '');
      if (def.kind === 'date') {
        const value = await table.getCellValue(fid, id).catch(() => null);
        raw[def.key] = toMs(value, str);
      } else if (def.kind === 'number') {
        const value = await table.getCellValue(fid, id).catch(() => null);
        raw[def.key] = toNumber(value) ?? toNumber(str) ?? (str || null);
      } else raw[def.key] = (str || '').trim();
    }));
    return raw;
  }));
}

export const toast = (message, type = 'info') => bitable?.ui.showToast({ toastType: type, message }).catch(() => {});
