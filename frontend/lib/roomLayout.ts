// ============================================================
// lib/roomLayout.ts
//   マイページで「AIで解析する」を押したあとに表示される
//   2D/3D ルームモデルの固定データ。
//   画像 image.png（1K 間取り）をそのまま形状化している。
// ============================================================

export type FloorPlanAreaKind =
  | 'balcony'
  | 'main'       // 洋室
  | 'closet'     // CL
  | 'sanitary'   // 洗面・脱衣
  | 'bath'       // 浴室
  | 'kitchen'    // キッチン（冷蔵庫・シンク・コンロ）
  | 'entrance'   // 玄関
  | 'toilet';    // トイレ

export type FloorPlanFixture = {
  label: string; // 冷 / 洗 / IH / シンク / 便 など
  x: number;     // エリア内の相対位置 %
  y: number;
};

export type FloorPlanArea = {
  id: string;
  label: string;           // 表示名
  kind: FloorPlanAreaKind;
  x: number;               // PLAN_W を 100 としたときの左端 %
  y: number;               // PLAN_H を 100 としたときの上端 %
  width: number;           // %
  height: number;          // %
  fixtures?: FloorPlanFixture[];
};

/** 設計キャンバスのアスペクト比（image.png ≒ 680 × 460） */
export const FLOOR_PLAN_ASPECT = 680 / 460;

/** image.png を参考にした固定間取り（単位: %） */
export const FIXED_FLOOR_PLAN: FloorPlanArea[] = [
  // バルコニー（左端）
  {
    id: 'balcony',
    label: 'バルコニー',
    kind: 'balcony',
    x: 0,
    y: 14,
    width: 10,
    height: 72,
  },
  // 洋室（メイン）
  {
    id: 'main-room',
    label: '洋室',
    kind: 'main',
    x: 10,
    y: 14,
    width: 48,
    height: 72,
  },
  // CL（クローゼット）
  {
    id: 'closet',
    label: 'CL',
    kind: 'closet',
    x: 58,
    y: 14,
    width: 10,
    height: 22,
  },
  // 洗面・脱衣所（洗 = 洗濯機）
  {
    id: 'sanitary',
    label: '洗面',
    kind: 'sanitary',
    x: 68,
    y: 0,
    width: 16,
    height: 28,
    fixtures: [
      { label: '洗', x: 25, y: 55 },
    ],
  },
  // 浴室（右上）
  {
    id: 'bath',
    label: 'バス',
    kind: 'bath',
    x: 84,
    y: 0,
    width: 16,
    height: 28,
  },
  // キッチン（冷蔵庫・シンク・コンロ）
  {
    id: 'kitchen',
    label: 'キッチン',
    kind: 'kitchen',
    x: 58,
    y: 56,
    width: 26,
    height: 30,
    fixtures: [
      { label: '冷', x: 18, y: 50 },
      { label: 'シンク', x: 52, y: 50 },
      { label: 'IH', x: 82, y: 50 },
    ],
  },
  // 玄関
  {
    id: 'entrance',
    label: '玄関',
    kind: 'entrance',
    x: 84,
    y: 36,
    width: 16,
    height: 30,
  },
  // トイレ
  {
    id: 'toilet',
    label: 'トイレ',
    kind: 'toilet',
    x: 84,
    y: 66,
    width: 16,
    height: 20,
    fixtures: [{ label: '便', x: 50, y: 50 }],
  },
];

/** kind ごとの塗り色（ナチュラル系パレット） */
export const AREA_FILL: Record<FloorPlanAreaKind, string> = {
  balcony: '#E9E2D0',
  main: '#FFF6E4',
  closet: '#F0E4CF',
  sanitary: '#D9ECF2',
  bath: '#D5E8F0',
  kitchen: '#F4E2D2',
  entrance: '#E8DDCB',
  toilet: '#D9ECF2',
};

export const AREA_STROKE = '#E8933A';
