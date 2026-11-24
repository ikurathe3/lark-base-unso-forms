// 設定の既定値・項目定義・保存処理

export const STORAGE_KEY = 'unso-forms-settings-v1';

/** フィールド割り当ての項目。guess は自動割り当て用のキーワード（先頭ほど優先） */
export const FIELD_DEFS = [
  { key: 'startAt', label: '乗車日時', required: true, kind: 'date', guess: ['乗車日時', '出発予定', '出発日時', '乗車', '出発'] },
  { key: 'endAt', label: '降車日時', required: true, kind: 'date', guess: ['降車日時', '到着予定', '到着日時', '降車', '到着'] },
  { key: 'pickupAddress', label: '乗車地点（住所）', required: true, guess: ['乗車住所', 'ピックアップ住所', '出発住所', '乗車地'] },
  { key: 'pickupPlace', label: '乗車地点（場所名）', guess: ['乗車場所', 'ピックアップ場所', '出発場所'] },
  { key: 'dropoffAddress', label: '降車地点（住所）', required: true, guess: ['降車住所', '到着住所', '降車地'] },
  { key: 'dropoffPlace', label: '降車地点（場所名）', guess: ['降車場所', '到着場所'] },
  { key: 'driver', label: '運転者の氏名', required: true, guess: ['運転者', 'ドライバー', '乗務員'] },
  { key: 'vehicle', label: '車両の登録番号', guess: ['ナンバー', '車両番号', '車両 No', '登録番号', '車両'] },
  { key: 'fare', label: '運賃（「フィールドの値」の場合）', kind: 'number', guess: ['運賃'] },
  { key: 'charge', label: '料金', kind: 'number', guess: ['料金'] },
  { key: 'chargeDetail', label: '料金の内訳', guess: ['内訳'] },
  { key: 'instructions', label: 'その他指示事項', guess: ['指示事項', '注意事項', '備考'] },
  { key: 'opStartAt', label: '運行開始日時（乗車と違う場合）', kind: 'date', group: 'op', guess: ['運行開始日時', '出庫'] },
  { key: 'opEndAt', label: '運行終了日時（降車と違う場合）', kind: 'date', group: 'op', guess: ['運行終了日時', '入庫'] },
  { key: 'opStartAddress', label: '運行開始地点（住所）', group: 'op', guess: ['運行開始地点', '開始地点'] },
  { key: 'opStartPlace', label: '運行開始地点（場所名）', group: 'op', guess: [] },
  { key: 'opEndAddress', label: '運行終了地点（住所）', group: 'op', guess: ['運行終了地点', '終了地点'] },
  { key: 'opEndPlace', label: '運行終了地点（場所名）', group: 'op', guess: [] },
  { key: 'applicantName', label: '申込者の名称（レコードごとに違う場合）', group: 'op', guess: ['申込者', '依頼者'] },
  { key: 'applicantPhone', label: '申込者の電話番号（レコードごとに違う場合）', group: 'op', guess: ['申込者電話'] },
];

export const FIXED_DEFS = [
  { section: '事業者（運行指示書の上部・運送引受者）' },
  { key: 'operatorName', label: '事業者名' },
  { key: 'officeName', label: '営業所名' },
  { key: 'manager', label: '運行管理者' },
  { key: 'contractorName', label: '運送引受者（名称）' },
  { key: 'contractorAddress', label: '運送引受者の住所' },
  { key: 'contractorPhone', label: '運送引受者の電話番号' },
  { key: 'contractorOther', label: '運送引受者のその他連絡先' },
  { key: 'businessArea', label: '営業区域' },
  { section: '運送の申込者（運送引受書）' },
  { key: 'applicantName', label: '申込者の氏名又は名称' },
  { key: 'applicantPhone', label: '申込者の電話番号' },
  { key: 'applicantOther', label: '申込者のその他連絡先' },
  { section: '運送契約の相手方（運行指示書）', toggle: 'counterpartySameAsApplicant' },
  { key: 'counterpartyName', label: '相手方の氏名又は名称', hideWhen: 'counterpartySameAsApplicant' },
  { key: 'counterpartyContact', label: '相手方の連絡先', hideWhen: 'counterpartySameAsApplicant' },
  { section: 'その他' },
  { key: 'instructions', label: '指示事項の定型文（フィールドが空のときに印字）', multiline: true },
];

export const APPLY_METHODS = [
  { key: 'phone', label: '電話' }, { key: 'visit', label: '来店' }, { key: 'email', label: '電子メール' },
  { key: 'app', label: 'アプリ', note: true }, { key: 'web', label: 'ウェブサイト', note: true },
  { key: 'sns', label: 'ＳＮＳ', note: true }, { key: 'other', label: 'その他', note: true },
];

export function defaultSettings() {
  return {
    version: 1,
    tableId: '',
    fields: Object.fromEntries(FIELD_DEFS.map(f => [f.key, ''])),
    fixed: Object.fromEntries(FIXED_DEFS.filter(f => f.key).map(f => [f.key, ''])),
    counterpartySameAsApplicant: true,
    applyMethod: { key: 'app', note: '' },
    fare: { mode: 'field', baseFee: 0, baseMinutes: 60, addFee: 0, addMinutes: 30 },
    dates: { issue: 'today', instructionDate: 'issue', confirmDate: 'blank' },
    driverInConfirm: false,
    timeZone: 'Asia/Tokyo',
  };
}

/** 保存データを既定値とマージ（項目追加に強くする） */
export function normalize(saved) {
  const d = defaultSettings();
  if (!saved || typeof saved !== 'object') return d;
  return {
    ...d, ...saved,
    fields: { ...d.fields, ...(saved.fields || {}) },
    fixed: { ...d.fixed, ...(saved.fixed || {}) },
    applyMethod: { ...d.applyMethod, ...(saved.applyMethod || {}) },
    fare: { ...d.fare, ...(saved.fare || {}) },
    dates: { ...d.dates, ...(saved.dates || {}) },
  };
}

// Lark の FieldType: 5=日時, 19=参照, 20=数式, 1001/1002=作成・更新日時
const DATE_TYPES = new Set([5, 19, 20, 1001, 1002]);
const fits = (def, meta) => def.kind === 'date' ? DATE_TYPES.has(meta.type) : meta.type !== 5;

/** フィールド名から自動で割り当てる（未割り当ての項目のみ） */
export function guessFields(fields, metaList) {
  const used = new Set(Object.values(fields).filter(Boolean));
  const out = { ...fields };
  for (const def of FIELD_DEFS) {
    if (out[def.key]) continue;
    for (const word of def.guess) {
      const hit = metaList.find(m => !used.has(m.id) && fits(def, m) && m.name.includes(word));
      if (hit) { out[def.key] = hit.id; used.add(hit.id); break; }
    }
  }
  return out;
}
