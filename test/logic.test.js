import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeFare, dateParts, toNumber, joinPlace, buildRecord } from '../src/logic.js';
import { defaultSettings, guessFields } from '../src/settings.js';
import { renderPages } from '../src/forms.js';

const P = { baseFee: 8220, baseMinutes: 60, addFee: 4070, addMinutes: 30 };
const jst = s => Date.parse(s.replace(' ', 'T') + ':00+09:00');

test('時間制運賃：担当者ツールと同じ結果になる', () => {
  assert.equal(timeFare(0, P), 0);
  assert.equal(timeFare(-5, P), 0);
  assert.equal(timeFare(1, P), 8220);
  assert.equal(timeFare(60, P), 8220);
  assert.equal(timeFare(60.01, P), 12290);
  assert.equal(timeFare(90, P), 12290);
  assert.equal(timeFare(91, P), 16360);
  assert.equal(timeFare(130, P), 20430);
});

test('和暦・曜日（日本時間）', () => {
  const p = dateParts(jst('2026-11-20 08:05'));
  assert.deepEqual([p.reiwa, p.mo, p.d, p.h, p.mi, p.weekday], [8, 11, 20, 8, 5, '金']);
  assert.equal(dateParts(jst('2019-04-30 23:59')).reiwa, null);
  assert.equal(dateParts(jst('2019-05-01 00:00')).reiwa, 1);
  assert.equal(dateParts(Date.parse('2026-11-19T15:30:00Z')).d, 20); // UTC 15:30 = JST 翌0:30
});

test('数値の読み取り', () => {
  assert.equal(toNumber('12,290円'), 12290);
  assert.equal(toNumber('￥８２２０'), 8220);
  assert.equal(toNumber(''), null);
  assert.equal(toNumber('未定'), null);
  assert.equal(joinPlace('東京都足立区', ' 北千住駅 '), '東京都足立区 北千住駅');
  assert.equal(joinPlace('', ''), '');
});

test('buildRecord：開始/終了は乗車/降車で補完、警告、日付モード', () => {
  const s = defaultSettings();
  s.fare = { mode: 'time', ...P };
  s.fixed.applicantName = '申込者A';
  const raw = { startAt: jst('2026-11-20 08:30'), endAt: jst('2026-11-20 09:40'), pickupAddress: '住所1', pickupPlace: '駅', dropoffAddress: '住所2', driver: '運転者' };
  const r = buildRecord(raw, s, jst('2026-11-25 10:00'));
  assert.equal(r.fare, 12290);
  assert.equal(r.total, 12290);
  assert.equal(r.opStartPlace, '住所1 駅');
  assert.equal(r.opEnd.h, 9);
  assert.equal(r.issue.d, 25);
  assert.equal(r.counterparty.name, '申込者A');
  assert.equal(r.confirmDate, null);
  assert.deepEqual(r.warnings, []);

  s.dates.issue = 'ride';
  assert.equal(buildRecord(raw, s).issue.d, 20);
  s.fare.mode = 'field';
  const r2 = buildRecord({ ...raw, fare: '10,000', charge: 500, driver: '' }, s);
  assert.equal(r2.total, 10500);
  assert.ok(r2.warnings.includes('運転者が空です'));
});

test('フィールドの自動割り当て：日時項目には日時型だけを当てる', () => {
  const metas = [
    { id: 'a', name: '乗車住所', type: 1 }, { id: 'b', name: '乗車日時', type: 5 },
    { id: 'c', name: '降車日時', type: 5 }, { id: 'd', name: 'ドライバー', type: 11 }, { id: 'e', name: '運賃', type: 2 },
  ];
  const f = guessFields(defaultSettings().fields, metas);
  assert.equal(f.startAt, 'b');
  assert.equal(f.endAt, 'c');
  assert.equal(f.pickupAddress, 'a');
  assert.equal(f.driver, 'd');
  assert.equal(f.fare, 'e');
});

test('HTMLエスケープとページ数', () => {
  const s = defaultSettings();
  const r = buildRecord({ driver: '<script>', startAt: jst('2026-11-20 08:30'), endAt: jst('2026-11-20 09:00') }, s);
  const html = renderPages([r, r], s);
  assert.ok(!html.includes('<script>'));
  assert.equal(html.match(/class="page /g).length, 4);
  assert.equal(renderPages([r], s, { acceptance: false, instruction: true }).match(/class="page /g).length, 1);
});
