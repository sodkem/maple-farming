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

// ===== 마스터크로노스 아이템 목록 =====
// 아이템 추가 시 KRONOS_ITEM_VERSION + 1
const KRONOS_ITEM_VERSION = 1;
const KRONOS_ITEM_LIST = [
  // 여기에 마스터크로노스 드랍 아이템 추가
];
