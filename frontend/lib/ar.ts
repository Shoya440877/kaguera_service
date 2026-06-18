import { type Product } from '@/lib/products';

export type ArModelPreset =
  | 'sofa' | 'bed' | 'desk' | 'chair' | 'dining_table' | 'shelf' | 'wardrobe' | 'tv_stand'
  | 'refrigerator' | 'tv' | 'microwave' | 'washing_machine' | 'air_conditioner' | 'vacuum'
  | 'rice_cooker' | 'kettle';

export function getArModelPreset(product: Product): ArModelPreset {
  return product.subCategory as ArModelPreset;
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
