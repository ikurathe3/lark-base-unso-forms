// 別記１（運送引受書）・別記２（運行指示書）の A4 ページを HTML 文字列で生成する
import { APPLY_METHODS } from './settings.js';
import { yen } from './logic.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nl = v => esc(v).replace(/\n/g, '<br>');
const v = (x, cls = '') => `<span class="val ${cls}">${esc(x)}</span>`;

/** 「令和 ８ 年 11 月 20 日（ 金 ） 10 時 05 分」の形。p が null なら空欄 */
function dt(p, { time = 'value', weekday = true } = {}) {
  const n = x => (p ? esc(x) : '');
  const pad = x => (p && time === 'value' ? String(x).padStart(2, '0') : '');
  const t = x => (time === 'value' ? n(x) : '');
  return `<span class="dt">令和<b class="n">${n(p?.reiwa ?? '')}</b>年<b class="n">${n(p?.mo)}</b>月<b class="n">${n(p?.d)}</b>日`
    + (weekday ? `<span class="wd">（<b>${n(p?.weekday)}</b>）</span>` : '')
    + (time !== 'none' ? `<b class="n">${t(p?.h)}</b>時<b class="n">${pad(p?.mi)}</b>分` : '') + '</span>';
}

// 長い住所は文字を小さくして1行に収める
const fit = (text, n) => { const len = [...String(text || '')].length; return len > n * 1.5 ? 'xs' : len > n ? 's' : ''; };
const point = (tag, place, p) => `
  <div class="pt"><span class="tag">【${tag}】</span><span class="k">地　点：</span>${v(place, 'line ' + fit(place, 34))}</div>
  <div class="pt"><span class="tag"></span><span class="k">日　時：</span><span class="line">${dt(p)}</span></div>`;

function applyMethods(settings) {
  const sel = settings.applyMethod || {};
  const box = (m, cls = '') => `<span class="cb ${cls}">${sel.key === m.key ? '☑' : '□'}${esc(m.label)}${m.note
    ? `（<span class="note">${sel.key === m.key ? esc(sel.note) : ''}</span>）` : ''}</span>`;
  const [phone, visit, email, app, web, sns, other] = APPLY_METHODS;
  return `<div class="cbrow">${box(phone)}${box(visit)}${box(email)}</div>
    <div class="cbrow">${box(app, 'span2')}${box(web)}</div>
    <div class="cbrow">${box(sns, 'span2')}${box(other)}</div>`;
}

export function acceptancePage(r, settings) {
  const fx = settings.fixed;
  return `<section class="page acceptance">
  <div class="betsuki">（別記１）</div>
  <h1>運　送　引　受　書</h1>
  <table class="form">
    <colgroup><col style="width:36mm"><col></colgroup>
    <tr><th>運送の申込者</th><td>
      <div class="kv"><span class="k">氏名又は名称：</span>${v(r.applicant.name, 'line w60')}</div>
      <div class="kv"><span class="k">電話番号　　：</span>${v(r.applicant.phone, 'line w60')}</div>
      <div class="kv"><span class="k">その他連絡先：</span>${v(r.applicant.other, 'line w60')}</div>
    </td></tr>
    <tr><th>申込方法</th><td class="methods">${applyMethods(settings)}</td></tr>
    <tr><th>運行の開始/終了<br>の<br>地点及び日時</th><td>
      ${point('開始', r.opStartPlace, r.opStart)}<div class="gap"></div>${point('終了', r.opEndPlace, r.opEnd)}
    </td></tr>
    <tr><th>乗車/降車の<br>地点及び日時</th><td>
      ${point('乗車', r.pickup, r.start)}<div class="gap"></div>${point('降車', r.dropoff, r.end)}
    </td></tr>
    <tr><th>運賃・料金</th><td class="fare">
      <div class="kv"><span class="k">運　賃：</span>${v(yen(r.fare), 'line num w30')}<span>円</span>
        <span class="k sp">料　金：</span>${v(yen(r.charge), 'line num w30')}<span>円</span></div>
      <div class="kv"><span class="k">料金の内訳：</span>${v(r.chargeDetail, 'line grow')}</div>
      <div class="kv"><span class="k">合　計：</span>${v(yen(r.total), 'line num w30')}<span>円（消費税等を含む。）</span></div>
    </td></tr>
  </table>
  <p class="declare">上記のとおり運送を引き受けます。</p>
  <p class="issue">${dt(r.issue, { time: 'none', weekday: false })}</p>
  <table class="contractor">
    <colgroup><col style="width:30mm"><col></colgroup>
    <tr><th colspan="2" class="head">運送引受者：<span class="val">${esc(fx.contractorName)}</span></th></tr>
    <tr><th>住　　　所</th><td>${esc(fx.contractorAddress)}</td></tr>
    <tr><th>電 話 番 号</th><td>${esc(fx.contractorPhone)}</td></tr>
    <tr><th>その他連絡先</th><td>${esc(fx.contractorOther)}</td></tr>
    <tr><th>営 業 区 域</th><td>${esc(fx.businessArea)}</td></tr>
  </table>
</section>`;
}

export function instructionPage(r, settings) {
  const fx = settings.fixed;
  return `<section class="page instruction">
  <div class="betsuki">（別記２）</div>
  <h1>運　行　指　示　書</h1>
  <table class="head-table">
    <colgroup><col style="width:28mm"><col><col style="width:28mm"><col></colgroup>
    <tr><th>事業者名</th><td>${esc(fx.operatorName)}</td><th>営業所名</th><td>${esc(fx.officeName)}</td></tr>
    <tr><th>運行管理者</th><td>${esc(fx.manager)}</td><th>作成年月日</th><td>${dt(r.issue, { time: 'none', weekday: false })}</td></tr>
  </table>
  <table class="form">
    <colgroup><col style="width:48mm"><col></colgroup>
    <tr><th>運行の開始/終了の<br>地点及び日時</th><td>
      ${point('開始', r.opStartPlace, r.opStart)}<div class="gap"></div>${point('終了', r.opEndPlace, r.opEnd)}
    </td></tr>
    <tr class="tall"><th>運転者の氏名</th><td>${v(r.driver, 'big')}</td></tr>
    <tr class="tall"><th>車両の自動車登録番号<br>（ナンバープレート）</th><td>${v(r.vehicle, 'big')}</td></tr>
    <tr><th>運送契約の相手方</th><td>
      <div class="kv"><span class="k">氏名又は名称：</span>${v(r.counterparty.name, 'line w60')}</div>
      <div class="kv"><span class="k">連　絡　先　：</span>${v(r.counterparty.contact, 'line w60')}</div>
    </td></tr>
    <tr><th>その他運行の安全を<br>確保するために<br>必要な事項</th><td class="safety">
      <div class="sub">乗車/降車の地点及び日時</div>
      ${point('乗車', r.pickup, r.start)}<div class="gap"></div>${point('降車', r.dropoff, r.end)}
      <div class="memo"><div class="sub">配車依頼方法、立寄り地、待機場所、注意箇所、その他指示事項</div>
      <div class="memo-body">${nl(r.instructions)}</div></div>
    </td></tr>
  </table>
  <div class="confirm-title">【指示・確認欄】</div>
  <table class="confirm">
    <colgroup><col style="width:30mm"><col><col style="width:30mm"><col></colgroup>
    <tr class="stamp"><th>運行管理者<br>指示（印）</th><td></td><th>運転者<br>確認（印）</th><td>${settings.driverInConfirm ? esc(r.driver) : ''}</td></tr>
    <tr><th>指示年月日</th><td>${dt(r.instructionDate, { time: 'blank', weekday: false })}</td><th>確認年月日</th><td>${dt(r.confirmDate, { time: 'blank', weekday: false })}</td></tr>
  </table>
</section>`;
}

/** order: 'record'＝運行ごとに引受書→指示書 / 'doc'＝引受書をまとめて→指示書をまとめて */
export function renderPages(records, settings, docs = { acceptance: true, instruction: true }, order = 'record') {
  const kinds = [docs.acceptance && acceptancePage, docs.instruction && instructionPage].filter(Boolean);
  const out = order === 'doc'
    ? kinds.flatMap(fn => records.map(r => fn(r, settings)))
    : records.flatMap(r => kinds.map(fn => fn(r, settings)));
  return out.join('\n');
}
