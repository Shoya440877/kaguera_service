// ============================================================
// lib/productAttributes.ts
//   参考データベース (1syadatabase / 2syadatabase / Asyadatabase /
//   Bsyadatabase / Csyadatabase) の質感・雰囲気・評価を移植し、
//   Product に不足している rating/texture/atmosphere を補完する。
// ============================================================

import type { Product, SubCategory } from './products';

/** 参考5社の属性テーブル (value = [texture, atmosphere, rating]) */
type Attr = { texture: string; atmosphere: string; rating: number };

type ShopTier = '1sya' | '2sya' | 'A' | 'B' | 'C';

/** サブカテゴリを参考DBのカテゴリにマッピング */
const SUB_TO_REF: Record<SubCategory, keyof typeof REF_TABLE['A']> = {
  // 家具
  sofa: 'ソファ',
  bed: 'ベッド',
  desk: 'デスク',
  chair: '椅子',
  dining_table: 'テーブル',
  shelf: '本棚',
  wardrobe: '本棚',
  tv_stand: 'テレビ台',
  // 家電
  refrigerator: '冷蔵庫',
  tv: 'テレビ台',
  microwave: '電子レンジ',
  washing_machine: '洗濯機',
  air_conditioner: '電子レンジ',
  vacuum: '電子レンジ',
  rice_cooker: '電子レンジ',
  kettle: '電子レンジ',
};

/** 参考DB (元 Python) を TS 化したテーブル */
const REF_TABLE: Record<ShopTier, Record<string, Attr>> = {
  // 中古1社 — 庶民派/生活感
  '1sya': {
    椅子:       { texture: '木目',        atmosphere: 'レトロ',   rating: 3.2 },
    ソファ:     { texture: '擦れあり布',  atmosphere: '暖かみ',   rating: 3.0 },
    冷蔵庫:     { texture: 'プラスチック', atmosphere: '生活感',   rating: 3.5 },
    電子レンジ: { texture: '樹脂',        atmosphere: '素朴',     rating: 3.4 },
    テーブル:   { texture: '合板',        atmosphere: '庶民的',   rating: 3.1 },
    ベッド:     { texture: 'パイプ',      atmosphere: '質素',     rating: 2.8 },
    テレビ台:   { texture: 'MDF材',       atmosphere: '実用的',   rating: 3.3 },
    洗濯機:     { texture: '樹脂',        atmosphere: '定番',     rating: 3.6 },
    デスク:     { texture: '塗装スチール', atmosphere: '事務的',   rating: 3.0 },
    本棚:       { texture: 'プリント紙',  atmosphere: '馴染み',   rating: 3.2 },
  },
  // 中古2社 — アンティーク/高級中古
  '2sya': {
    椅子:       { texture: '彫刻木',      atmosphere: '伝統的',   rating: 4.5 },
    ソファ:     { texture: 'エイジング革', atmosphere: '芸術的',   rating: 4.8 },
    冷蔵庫:     { texture: 'ホーロー調',  atmosphere: '50s風',    rating: 4.2 },
    電子レンジ: { texture: '金属/ツマミ', atmosphere: 'クラシック', rating: 4.0 },
    テーブル:   { texture: '古材',        atmosphere: '重厚',     rating: 4.7 },
    ベッド:     { texture: '桐材',        atmosphere: '優雅',     rating: 4.3 },
    テレビ台:   { texture: 'アイアン',    atmosphere: '男前',     rating: 4.4 },
    洗濯機:     { texture: 'ステンレス',  atmosphere: 'メカニカル', rating: 3.8 },
    デスク:     { texture: '漆塗り',      atmosphere: '和モダン', rating: 4.6 },
    本棚:       { texture: '飾り彫',      atmosphere: '繊細',     rating: 4.5 },
  },
  // A社 — 北欧/シンプル量産
  A: {
    椅子:       { texture: '合板',        atmosphere: 'シンプル', rating: 4.2 },
    ソファ:     { texture: '布地',        atmosphere: '穏やか',   rating: 3.8 },
    冷蔵庫:     { texture: '鋼板',        atmosphere: '清潔感',   rating: 4.5 },
    電子レンジ: { texture: '樹脂',        atmosphere: 'モダン',   rating: 4.0 },
    テーブル:   { texture: '天然木突板',  atmosphere: '北欧風',   rating: 4.3 },
    ベッド:     { texture: '合成樹脂',    atmosphere: '落ち着いた', rating: 3.9 },
    テレビ台:   { texture: 'プリント紙',  atmosphere: '汎用的',   rating: 4.1 },
    洗濯機:     { texture: 'プラスチック', atmosphere: '定番',     rating: 4.4 },
    デスク:     { texture: '木目調',      atmosphere: '軽やか',   rating: 4.2 },
    本棚:       { texture: '強化紙',      atmosphere: 'スッキリ', rating: 3.7 },
  },
  // B社 — デザイナーズ/カラフル
  B: {
    椅子:       { texture: '樹脂',        atmosphere: 'ポップ',   rating: 4.1 },
    ソファ:     { texture: 'ベロア',      atmosphere: '個性的',   rating: 4.6 },
    冷蔵庫:     { texture: '艶消メタル',  atmosphere: 'クール',   rating: 3.9 },
    電子レンジ: { texture: '塗装鋼板',    atmosphere: '遊び心',   rating: 3.5 },
    テーブル:   { texture: 'ラッカー',    atmosphere: '洗練',     rating: 4.3 },
    ベッド:     { texture: 'スチール',    atmosphere: 'ミニマル', rating: 3.8 },
    テレビ台:   { texture: '鏡面仕上',    atmosphere: '重厚',     rating: 4.2 },
    洗濯機:     { texture: '金属調',      atmosphere: 'スマート', rating: 3.7 },
    デスク:     { texture: 'メラミン',    atmosphere: 'ワーク',   rating: 4.4 },
    本棚:       { texture: 'ビーチ無垢',  atmosphere: 'カジュアル', rating: 4.0 },
  },
  // C社 — 高級/ハイエンド
  C: {
    椅子:       { texture: '本革',        atmosphere: 'プロ仕様', rating: 4.8 },
    ソファ:     { texture: '厚手皮革',    atmosphere: '高級感',   rating: 4.7 },
    冷蔵庫:     { texture: 'ガラスドア',  atmosphere: '近未来的', rating: 4.9 },
    電子レンジ: { texture: 'ステンレス',  atmosphere: '知的',     rating: 4.5 },
    テーブル:   { texture: '無垢材',      atmosphere: 'シック',   rating: 4.6 },
    ベッド:     { texture: 'ウッドフレーム', atmosphere: '豪華',  rating: 4.4 },
    テレビ台:   { texture: '天然木',      atmosphere: '伝統的',   rating: 4.7 },
    洗濯機:     { texture: '静音樹脂',    atmosphere: '清潔感',   rating: 4.8 },
    デスク:     { texture: '金属脚',      atmosphere: '重厚',     rating: 4.9 },
    本棚:       { texture: '木目突板',    atmosphere: '知的',     rating: 4.6 },
  },
};

/** 価格・状態・スタイルから商品の "社ティア" を推定 */
function inferTier(p: Product): ShopTier {
  if (p.condition === 'used') {
    // 中古は価格でアンティーク/普及を分ける
    return p.price >= 40000 ? '2sya' : '1sya';
  }
  // 新品は価格帯で A(普及) / B(個性) / C(高級) を割り当て
  // スタイルで B寄せ (modern/industrial) / C寄せ (cozy+高価格) を補正
  if (p.price >= 80000) return 'C';
  if (p.price >= 30000) {
    if (p.style.includes('modern') || p.style.includes('industrial')) return 'B';
    return 'A';
  }
  return 'A';
}

/** Product に rating/texture/atmosphere を補完して返す */
export function enrichProduct(p: Product): Required<
  Pick<Product, 'rating' | 'texture' | 'atmosphere'>
> & Product {
  const tier = inferTier(p);
  const refKey = SUB_TO_REF[p.subCategory];
  const attr = REF_TABLE[tier][refKey] ?? REF_TABLE.A['椅子'];
  return {
    ...p,
    rating: p.rating ?? attr.rating,
    texture: p.texture ?? attr.texture,
    atmosphere: p.atmosphere ?? attr.atmosphere,
  };
}
