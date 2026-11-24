// 帳票に印字する値を組み立てる純粋ロジック（Lark SDK・DOMに依存しない）

export const REIWA_START = Date.UTC(2019, 4, 1) - 9 * 3600 * 1000; // 2019-05-01 00:00 JST

/** タイムスタンプ(ms)を指定タイムゾーンの日時パーツに分解する */
export function dateParts(ms, timeZone = 'Asia/Tokyo') {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(new Date(ms)).map(p => [p.type, p.value])
  );
  const wd = { Sun: '日', Mon: '月', Tue: '火', Wed: '水', Thu: '木', Fri: '金', Sat: '土' }[parts.weekday];
  const y = +parts.year;
  return {
    y, mo: +parts.month, d: +parts.day, h: +parts.hour, mi: +parts.minute, weekday: wd,
    reiwa: ms >= REIWA_START ? y - 2018 : null,
  };
}

/** 時間制運賃：基本時間までは基本料金、超過分は加算単位ごとに加算（端数切り上げ） */
export function timeFare(minutes, { baseFee, baseMinutes, addFee, addMinutes }) {
  if (!(minutes > 0)) return 0;
  const over = Math.max(0, minutes - baseMinutes);
  const units = addMinutes > 0 ? Math.ceil(over / addMinutes - 1e-9) : 0;
  return baseFee + units * addFee;
}

/** "12,000円" や " ¥8220 " などを数値にする。読めなければ null */
export function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[,，¥￥円\s]/g, '').replace(/[０-９．－]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  if (s === '' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export const joinPlace = (address, place) => [address, place].map(v => (v || '').trim()).filter(Boolean).join(' ');

/**
 * 1件分の生データ（フィールドから読んだ値）と設定から、帳票の表示用データを作る。
 * raw: { startAt, endAt, opStartAt, opEndAt, pickupAddress, pickupPlace, dropoffAddress, dropoffPlace,
 *        opStartAddress, opStartPlace, opEndAddress, opEndPlace, driver, vehicle, fare, charge,
 *        chargeDetail, instructions, applicantName, applicantPhone }
 */
export function buildRecord(raw, settings, now = Date.now()) {
  const tz = settings.timeZone || 'Asia/Tokyo';
  const fx = settings.fixed;
  const warnings = [];

  const pickup = joinPlace(raw.pickupAddress, raw.pickupPlace);
  const dropoff = joinPlace(raw.dropoffAddress, raw.dropoffPlace);
  const opStartPlace = joinPlace(raw.opStartAddress, raw.opStartPlace) || pickup;
  const opEndPlace = joinPlace(raw.opEndAddress, raw.opEndPlace) || dropoff;
  const startAt = raw.startAt ?? null, endAt = raw.endAt ?? null;
  const opStartAt = raw.opStartAt ?? startAt, opEndAt = raw.opEndAt ?? endAt;

  if (startAt === null) warnings.push('乗車日時が空です');
  if (endAt === null) warnings.push('降車日時が空です');
  if (!pickup) warnings.push('乗車地点が空です');
  if (!dropoff) warnings.push('降車地点が空です');
  if (!raw.driver) warnings.push('運転者が空です');
  for (const [label, ms] of [['乗車日時', startAt], ['降車日時', endAt]])
    if (ms !== null && ms < REIWA_START) warnings.push(`${label}が令和より前です`);

  // 運賃
  let fare = null;
  const minutes = startAt !== null && endAt !== null ? (endAt - startAt) / 60000 : null;
  if (settings.fare.mode === 'time') {
    if (minutes === null) warnings.push('所要時間が計算できないため運賃を空欄にしました');
    else if (minutes <= 0) { warnings.push('降車日時が乗車日時以前です'); fare = 0; }
    else fare = timeFare(minutes, settings.fare);
  } else {
    fare = toNumber(raw.fare);
    if (raw.fare && fare === null) warnings.push('運賃フィールドを数値として読めません');
  }
  const charge = toNumber(raw.charge);
  const total = fare === null && charge === null ? null : (fare || 0) + (charge || 0);

  // 日付
  const issueMs = settings.dates.issue === 'today' ? now
    : settings.dates.issue === 'ride' ? (opStartAt ?? startAt) : null;
  const issue = issueMs === null ? null : dateParts(issueMs, tz);

  const applicantName = raw.applicantName || fx.applicantName;
  const applicantPhone = raw.applicantPhone || fx.applicantPhone;

  return {
    warnings,
    driver: raw.driver || '',
    vehicle: raw.vehicle || '',
    pickup, dropoff, opStartPlace, opEndPlace,
    start: dateParts(startAt, tz), end: dateParts(endAt, tz),
    opStart: dateParts(opStartAt, tz), opEnd: dateParts(opEndAt, tz),
    minutes, fare, charge, total,
    chargeDetail: raw.chargeDetail || '',
    instructions: raw.instructions || fx.instructions || '',
    applicant: { name: applicantName, phone: applicantPhone, other: fx.applicantOther },
    counterparty: settings.counterpartySameAsApplicant
      ? { name: applicantName, contact: applicantPhone }
      : { name: fx.counterpartyName, contact: fx.counterpartyContact },
    issue,
    instructionDate: settings.dates.instructionDate === 'issue' ? issue : null,
    confirmDate: settings.dates.confirmDate === 'issue' ? issue : null,
  };
}

export const yen = n => (n === null || n === undefined ? '' : Number(n).toLocaleString('ja-JP'));
