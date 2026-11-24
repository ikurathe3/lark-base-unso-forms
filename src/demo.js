// Base の外で開いたときに使う架空のサンプル（実在の事業者・人物とは無関係）
const jst = (s) => Date.parse(s.replace(' ', 'T') + ':00+09:00');

export const demoSettings = (base) => ({
  ...base,
  fixed: {
    ...base.fixed,
    operatorName: 'サンプル交通株式会社', officeName: '本社', manager: '運行　管理',
    contractorName: 'サンプル交通株式会社', contractorAddress: '東京都千代田区丸の内0-0-0',
    contractorPhone: '03-0000-0000', contractorOther: '090-0000-0000', businessArea: '東京都特別区・武三交通圏',
    applicantName: 'サンプル配車サービス株式会社', applicantPhone: '050-0000-0000', applicantOther: 'チャットでの連絡',
    instructions: '配車依頼はアプリ経由。到着10分前に待機場所へ到着すること。',
  },
  applyMethod: { key: 'app', note: '配車アプリ' },
  fare: { mode: 'time', baseFee: 8220, baseMinutes: 60, addFee: 4070, addMinutes: 30 },
});

export const demoRaw = [
  { startAt: jst('2026-11-20 08:30'), endAt: jst('2026-11-20 09:40'), pickupAddress: '東京都足立区千住0-0-0', pickupPlace: '北千住駅西口',
    dropoffAddress: '東京都大田区羽田空港3-3-2', dropoffPlace: '羽田空港第3ターミナル', driver: '千住　太郎', vehicle: '足立 500 あ 00-00' },
  { startAt: jst('2026-11-20 13:00'), endAt: jst('2026-11-20 13:55'), pickupAddress: '千葉県成田市古込1-1', pickupPlace: '成田空港第1ターミナル',
    dropoffAddress: '東京都荒川区南千住0-0-0', dropoffPlace: '', driver: '日野　花子', vehicle: '足立 500 い 11-11' },
  { startAt: jst('2026-11-21 06:00'), endAt: jst('2026-11-21 08:10'), pickupAddress: '東京都墨田区押上1-1-2', pickupPlace: '東京スカイツリー前',
    dropoffAddress: '神奈川県足柄下郡箱根町湯本', dropoffPlace: '箱根湯本駅', driver: '千住　太郎', vehicle: '足立 500 あ 00-00' },
];
