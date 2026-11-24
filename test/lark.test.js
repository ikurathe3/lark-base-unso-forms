import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as lark from '../src/lark.js';
import { FIELD_DEFS, defaultSettings } from '../src/settings.js';

const cells = {
  r1: { fS: 1763595000000, fE: '2026/11/20 09:40', fP: '東京都足立区', fD: '山田', fF: '12,290' },
  r2: { fS: 1763595000000, fE: 1763599200000, fP: '千葉県', fD: '佐藤', fF: 8220 },
};
const table = {
  getCellString: async (f, r) => String(cells[r][f] ?? ''),
  getCellValue: async (f, r) => (f === 'fE' && r === 'r1' ? null : cells[r][f] ?? null),
  getViewById: async () => ({ getSelectedRecordIdList: async () => ['r2'] }),
  getRecordIdListByPage: async ({ pageToken }) => pageToken ? { recordIds: ['r2'], hasMore: false } : { recordIds: ['r1'], hasMore: true, pageToken: 'p2' },
  getViewMetaList: async () => [{ id: 'v1' }],
};
lark._setBitable({
  base: { getTableById: async () => table, getSelection: async () => ({ tableId: 't1', viewId: 'v1', recordId: 'r1' }) },
  ui: { selectRecordIdList: async () => ['r1', 'r2'] },
});

test('対象レコードの取得（選択・ビュー全件・ページ送り）', async () => {
  assert.deepEqual(await lark.recordIds('t1', 'selected'), ['r2']);
  assert.deepEqual(await lark.recordIds('t1', 'view'), ['r1', 'r2']);
  assert.deepEqual(await lark.recordIds('t1', 'pick'), ['r1', 'r2']);
});

test('セルの読み取り：日時は数値でも文字列でも、運賃は数値化', async () => {
  const s = defaultSettings();
  Object.assign(s.fields, { startAt: 'fS', endAt: 'fE', pickupAddress: 'fP', driver: 'fD', fare: 'fF' });
  const [a, b] = await lark.readRecords('t1', ['r1', 'r2'], s, FIELD_DEFS);
  assert.equal(a.endAt, Date.parse('2026-11-20T09:40:00+09:00'));
  assert.equal(a.fare, 12290);
  assert.equal(b.endAt, 1763599200000);
  assert.equal(b.driver, '佐藤');
  assert.equal(a.pickupPlace, undefined);
});
