// ===== 아이템 목록 =====
// 새 이미지 받으면 이 파일만 수정 + ITEM_VERSION + 1
// imgId: maplestory.io 아이템 ID (URL의 숫자 부분)

const ITEM_VERSION = 2;

const ITEM_LIST = [
  // ── 그룹 1: 월묘 장비 ──
  { name: '목비 표창',              rate: 0.01,  group: 1, imgId: '2070002' },
  { name: '블루 문',                rate: 0.01,  group: 1, imgId: '1032011' },
  { name: '옐로우 하프슈즈',        rate: 0.01,  group: 1, imgId: '1072109' },
  { name: '골드 브레이스',          rate: 0.01,  group: 1, imgId: '1082072' },
  { name: '블루 카운터',            rate: 0.008, group: 1, imgId: '1312007' },
  { name: '노란색 우산',            rate: 0.008, group: 1, imgId: '1302016' },
  { name: '파란색 모험가의 망토',    rate: 0.006, group: 1, imgId: '1102001' },
  { name: '투구 민첩 주문서 60%',   rate: 0.006, group: 1, imgId: '2040029' },
  { name: '아다만티움 타워 실드',    rate: 0.005, group: 1, imgId: '1092014' },
  { name: '신발 점프력 주문서 10%', rate: 0.003, group: 1, imgId: '2040705' },
  { name: '네오자드',               rate: 0.002, group: 1, imgId: '1482006' },

  // ── 그룹 2: 월묘 원석 ──
  { name: '은의 원석',              rate: 0.4,   group: 2, imgId: '4010004' },
  { name: '사파이어의 원석',        rate: 0.3,   group: 2, imgId: '4020005' },
  { name: '지혜의 크리스탈 원석',   rate: 0.1,   group: 2, imgId: '4004001' },
  { name: '마법의 돌',              rate: 0.08,  group: 2, imgId: '4006000' },
];

// ===== 마스터크로노스 아이템 목록 (잃어버린 시간의 길) =====
// 아이템 추가 시 KRONOS_ITEM_VERSION + 1
const KRONOS_ITEM_VERSION = 2;
const KRONOS_ITEM_LIST = [
  // ── 그룹 1: 잃시길 드랍 ──
  { name: '브라운 피에뜨',              rate: 0.01,  group: 1, imgId: '1040079' },
  { name: '브라운 피에뜨 바지',          rate: 0.01,  group: 1, imgId: '1060069' },
  { name: '레드 피에르슈즈',             rate: 0.01,  group: 1, imgId: '1072118' },
  { name: '황 진원장화',                 rate: 0.01,  group: 1, imgId: '1072000' },
  { name: '미스릴 스케일러',             rate: 0.01,  group: 1, imgId: '1082069' },
  { name: '활 제작의 촉진제',            rate: 0.008, group: 1, imgId: '4130012' },
  { name: '다크 칼라스',                 rate: 0.007, group: 1, imgId: '1050049' },
  { name: '아이보리 솔더메일',           rate: 0.007, group: 1, imgId: '1041088' },
  { name: '아이보리 솔더메일 바지',       rate: 0.007, group: 1, imgId: '1061087' },
  { name: '청월 장갑',                   rate: 0.007, group: 1, imgId: '1082065' },
  { name: '토비 표창',                   rate: 0.007, group: 1, imgId: '2070004' },
  { name: '블루 골든윈드슈즈',           rate: 0.006, group: 1, imgId: '1072141' },
  { name: '골든 모울',                   rate: 0.006, group: 1, imgId: '1422005' },
  { name: '다크 슬레인',                 rate: 0.006, group: 1, imgId: '1472021' },
  { name: '투구 민첩 주문서 60%',        rate: 0.006, group: 1, imgId: '2040029' },
  { name: '두손도끼 공격력 주문서 10%',  rate: 0.004, group: 1, imgId: '2044102' },
  { name: '스태프 마력 주문서 10%',      rate: 0.004, group: 1, imgId: '2043802' },
];
