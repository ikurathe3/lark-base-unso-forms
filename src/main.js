import './app.css';
import './forms.css';
import { FIELD_DEFS, FIXED_DEFS, APPLY_METHODS, defaultSettings, normalize, guessFields } from './settings.js';
import { buildRecord } from './logic.js';
import { renderPages } from './forms.js';
import * as lark from './lark.js';
import { demoSettings, demoRaw } from './demo.js';

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let connected = false;
let settings = defaultSettings();
let tableList = [];
let fieldList = [];

// ---------- 初期化 ----------
async function init() {
  connected = !!(await lark.connect());
  $('mode').textContent = connected ? 'Base に接続中' : 'デモ（サンプルデータ）';
  $('mode').classList.toggle('demo', !connected);
  const saved = await lark.loadSettings();
  settings = normalize(saved);
  if (connected) {
    tableList = await lark.tables();
    if (!settings.tableId || !tableList.some(t => t.id === settings.tableId)) settings.tableId = await lark.activeTableId();
    await loadFields();
    if (!saved) settings.fields = guessFields(settings.fields, fieldList);
  } else if (!saved) {
    settings = demoSettings(settings);
  }
  renderSettings();
  if (!connected) { $('target').disabled = true; await load(); }
  else if (!saved) switchTab('settings');
}

async function loadFields() {
  fieldList = settings.tableId ? await lark.fields(settings.tableId) : [];
}

// ---------- タブ ----------
function switchTab(name) {
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
  $('tab-print').hidden = name !== 'print';
  $('tab-settings').hidden = name !== 'settings';
}
for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => switchTab(b.dataset.tab));

// ---------- 読み込み・プレビュー ----------
function missingRequired() {
  return FIELD_DEFS.filter(d => d.required && !settings.fields[d.key])
    .concat(settings.fare.mode === 'field' && !settings.fields.fare ? [FIELD_DEFS.find(d => d.key === 'fare')] : [])
    .map(d => d.label);
}

async function load() {
  const status = $('status');
  $('print').disabled = true;
  $('warnings').replaceChildren();
  $('preview').replaceChildren();
  try {
    let raws;
    if (connected) {
      const missing = missingRequired();
      if (missing.length) throw Error('設定画面で次の項目のフィールドを割り当ててください：' + missing.join('、'));
      status.textContent = '対象レコードを取得しています…';
      const ids = await lark.recordIds(settings.tableId, $('target').value);
      if (!ids.length) throw Error($('target').value === 'selected'
        ? '行が選択されていません。表で行のチェックボックスを選ぶか、対象を「表示中のビューの全件」にしてください。'
        : '対象のレコードがありません。');
      status.textContent = `${ids.length}件を読み込んでいます…`;
      raws = await lark.readRecords(settings.tableId, ids, settings, FIELD_DEFS);
    } else raws = demoRaw;

    const now = Date.now();
    const records = raws.map(r => buildRecord(r, settings, now));
    const docs = { acceptance: $('docA').checked, instruction: $('docI').checked };
    if (!docs.acceptance && !docs.instruction) throw Error('書類を1つ以上選んでください。');
    $('preview').innerHTML = renderPages(records, settings, docs, $('order').value);
    fitPreview();

    const pages = records.length * (+docs.acceptance + +docs.instruction);
    status.textContent = `${records.length}件・${pages}ページを作成しました。内容を確認して「印刷・PDF保存」を押してください。`;
    status.className = 'status';
    const warnItems = records.flatMap((r, i) => r.warnings.map(w => `${i + 1}件目（${r.driver || '運転者未設定'}）：${w}`));
    $('warnings').innerHTML = warnItems.map(w => `<li>${esc(w)}</li>`).join('');
    $('print').disabled = false;
  } catch (e) {
    status.textContent = e.message;
    status.className = 'status error';
  }
}

function fitPreview() {
  const pv = $('preview');
  const pageWidthPx = 210 / 25.4 * 96;
  pv.style.setProperty('--zoom', Math.min(1, (pv.clientWidth - 16) / pageWidthPx).toFixed(3));
}
window.addEventListener('resize', fitPreview);

$('load').addEventListener('click', load);
$('print').addEventListener('click', () => window.print());

// ---------- 設定画面 ----------
function fieldSelect(def) {
  const opts = fieldList.map(f => `<option value="${esc(f.id)}"${settings.fields[def.key] === f.id ? ' selected' : ''}>${esc(f.name)}</option>`).join('');
  return `<div class="row"><label for="f-${def.key}">${esc(def.label)}${def.required ? '<em>*</em>' : ''}</label>
    <select id="f-${def.key}" data-field="${def.key}"><option value="">（使わない）</option>${opts}</select></div>`;
}

function input(path, label, value, { type = 'text', multiline = false } = {}) {
  const id = 'i-' + path.replace(/\./g, '-');
  const control = multiline
    ? `<textarea id="${id}" data-path="${path}" rows="3">${esc(value)}</textarea>`
    : `<input id="${id}" type="${type}" data-path="${path}" value="${esc(value)}">`;
  return `<div class="row"><label for="${id}">${esc(label)}</label>${control}</div>`;
}

function radio(path, value, options) {
  return `<div class="radios">${options.map(([v, label]) =>
    `<label><input type="radio" name="${path}" data-path="${path}" value="${v}"${value === v ? ' checked' : ''}> ${esc(label)}</label>`).join('')}</div>`;
}

function renderSettings() {
  const s = settings;
  const main = FIELD_DEFS.filter(d => !d.group), op = FIELD_DEFS.filter(d => d.group === 'op');
  const fixedHtml = FIXED_DEFS.map(d => {
    if (d.section) return `<h4>${esc(d.section)}</h4>` + (d.toggle
      ? `<label class="check"><input type="checkbox" data-path="${d.toggle}"${s[d.toggle] ? ' checked' : ''}> 運送の申込者と同じ</label>` : '');
    if (d.hideWhen && s[d.hideWhen]) return '';
    return input('fixed.' + d.key, d.label, s.fixed[d.key], { multiline: d.multiline });
  }).join('');

  $('settings-form').innerHTML = `
  ${connected ? `<h3>テーブル</h3>
  <div class="row"><label for="table">対象テーブル</label><select id="table">${tableList.map(t =>
    `<option value="${esc(t.id)}"${t.id === s.tableId ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
  <h3>フィールドの割り当て <button id="guess" type="button" class="small">名前から自動割り当て</button></h3>
  <p class="note">「乗車地点」は住所と場所名を続けて印字します。場所名がなければ住所だけで構いません。</p>
  ${main.map(fieldSelect).join('')}
  <details><summary>運行の開始・終了が乗車・降車と違う場合など</summary>
    <p class="note">割り当てない場合、運行の開始＝乗車、終了＝降車として印字します。</p>${op.map(fieldSelect).join('')}</details>`
    : '<p class="note">デモモードです。Base の拡張機能として開くと、テーブルとフィールドを割り当てられます。ここで変えた設定はこのブラウザーに保存されます。</p>'}

  <h3>運賃</h3>
  ${radio('fare.mode', s.fare.mode, [['field', 'フィールドの値を使う'], ['time', '所要時間から計算する（時間制）']])}
  <div class="fare-time"${s.fare.mode === 'time' ? '' : ' hidden'}>
    <div class="grid2">
      ${input('fare.baseMinutes', '基本時間（分）', s.fare.baseMinutes, { type: 'number' })}
      ${input('fare.baseFee', '基本料金（円）', s.fare.baseFee, { type: 'number' })}
      ${input('fare.addMinutes', '加算単位（分）', s.fare.addMinutes, { type: 'number' })}
      ${input('fare.addFee', '加算料金（円）', s.fare.addFee, { type: 'number' })}
    </div>
    <p class="note">乗車〜降車の時間で計算し、加算単位に満たない端数は切り上げます。</p>
  </div>

  <h3>申込方法</h3>
  <div class="grid2">
    <div class="row"><label for="am">チェックする項目</label><select id="am" data-path="applyMethod.key">${
      APPLY_METHODS.map(m => `<option value="${m.key}"${s.applyMethod.key === m.key ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</select></div>
    ${input('applyMethod.note', '括弧内（アプリ名など）', s.applyMethod.note)}
  </div>

  <h3>固定で印字する内容</h3>
  ${fixedHtml}

  <h3>日付</h3>
  <div class="row"><label>作成年月日・引受日</label>${radio('dates.issue', s.dates.issue, [['today', '印刷した日'], ['ride', '運行日'], ['blank', '空欄（手書き）']])}</div>
  <div class="row"><label>指示年月日</label>${radio('dates.instructionDate', s.dates.instructionDate, [['issue', '作成年月日と同じ'], ['blank', '空欄（手書き）']])}</div>
  <div class="row"><label>確認年月日</label>${radio('dates.confirmDate', s.dates.confirmDate, [['issue', '作成年月日と同じ'], ['blank', '空欄（手書き）']])}</div>
  <label class="check"><input type="checkbox" data-path="driverInConfirm"${s.driverInConfirm ? ' checked' : ''}> 運転者確認（印）の欄に運転者名を印字する</label>
  `;
  bindSettings();
}

function setPath(path, value) {
  const keys = path.split('.');
  let o = settings;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys.at(-1)] = value;
}

function bindSettings() {
  const form = $('settings-form');
  form.querySelectorAll('[data-path]').forEach(el => el.addEventListener('change', () => {
    const value = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    if (el.type === 'radio' && !el.checked) return;
    setPath(el.dataset.path, value);
    if (el.dataset.path === 'fare.mode' || el.dataset.path === 'counterpartySameAsApplicant') renderSettings();
    $('save-status').textContent = '未保存の変更があります';
  }));
  form.querySelectorAll('[data-field]').forEach(el => el.addEventListener('change', () => {
    settings.fields[el.dataset.field] = el.value;
    $('save-status').textContent = '未保存の変更があります';
  }));
  $('table')?.addEventListener('change', async e => {
    settings.tableId = e.target.value;
    settings.fields = Object.fromEntries(FIELD_DEFS.map(f => [f.key, '']));
    await loadFields();
    settings.fields = guessFields(settings.fields, fieldList);
    renderSettings();
    $('save-status').textContent = 'テーブルを変更しました（未保存）';
  });
  $('guess')?.addEventListener('click', () => {
    settings.fields = guessFields(settings.fields, fieldList);
    renderSettings();
    $('save-status').textContent = '自動割り当てしました（未割り当ての項目のみ・未保存）';
  });
}

$('save').addEventListener('click', async () => {
  try {
    await lark.saveSettings(settings);
    $('save-status').textContent = '保存しました';
    lark.toast('設定を保存しました', 'success');
    if (!connected) load();
  } catch (e) {
    $('save-status').textContent = '保存できませんでした：' + e.message;
  }
});

init().catch(e => { $('status').textContent = '初期化に失敗しました：' + e.message; $('status').className = 'status error'; });
