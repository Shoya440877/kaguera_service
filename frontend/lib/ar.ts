import { type Product, type SubCategory } from '@/lib/products';

export type ArModelPreset =
  | 'sofa' | 'bed' | 'desk' | 'chair' | 'dining_table' | 'shelf' | 'wardrobe' | 'tv_stand'
  | 'refrigerator' | 'tv' | 'microwave' | 'washing_machine' | 'air_conditioner' | 'vacuum'
  | 'rice_cooker' | 'kettle';

export function getArModelPreset(product: Product): ArModelPreset {
  return product.subCategory as ArModelPreset;
}

/** 同梱の3D実モデル。chair/desk/lamp の .glb(+.usdz) のみ存在する。 */
export type ArModel = 'chair' | 'desk' | 'lamp';

const SEATING_SUBCATEGORIES: SubCategory[] = ['sofa', 'chair', 'bed'];

/**
 * 商品の形状に最も近い同梱モデルを返す（chair=座る系 / desk=その他の箱・台系）。
 * 形状はあくまで代表的な目安で、正確なサイズは product.size を UI に併記する。
 */
export function getArModel(product: Product): ArModel {
  return SEATING_SUBCATEGORIES.includes(product.subCategory) ? 'chair' : 'desk';
}

export function buildArRedirectUrl(product: Product) {
  const params = new URLSearchParams({
    product: product.id,
    preset: getArModelPreset(product),
    w: String(product.size.width),
    d: String(product.size.depth),
    h: String(product.size.height),
    name: product.name,
  });

  return `/ar.html?${params.toString()}`;
}
