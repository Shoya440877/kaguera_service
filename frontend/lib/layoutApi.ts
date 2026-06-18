import { getProductById } from '@/lib/products';
import type { PlacedProduct } from '@/lib/kaguera';

const BASE = process.env.NEXT_PUBLIC_LAYOUT_API_BASE ?? 'http://localhost:8000';

export type LayoutItemDTO = {
  productId: string;
  x: number;
  y: number;
  rotation: 0 | 90;
  w_cm: number;
  d_cm: number;
  h_cm: number;
};

export type SaveLayoutPayload = {
  title?: string;
  room_width_cm?: number;
  room_depth_cm?: number;
  items: LayoutItemDTO[];
};

export type LoadedLayout = {
  public_id: string;
  title: string;
  room_width_cm: number | null;
  room_depth_cm: number | null;
  items: LayoutItemDTO[];
  view_count: number;
  created_at: string;
};

/** PlacedProduct[] -> API DTO。寸法は商品マスタから補完する（共有先がマスタを持たなくても復元できるよう同梱）。 */
export function toLayoutItems(placed: PlacedProduct[]): LayoutItemDTO[] {
  const items: LayoutItemDTO[] = [];

  for (const item of placed) {
    const product = getProductById(item.productId);

    if (!product) {
      continue;
    }

    items.push({
      productId: item.productId,
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      w_cm: product.size.width,
      d_cm: product.size.depth,
      h_cm: product.size.height,
    });
  }

  return items;
}

export async function saveLayout(payload: SaveLayoutPayload): Promise<{ publicId: string }> {
  const res = await fetch(`${BASE}/api/layouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`save failed: ${res.status}`);
  }

  const data = await res.json();
  return { publicId: data.public_id };
}

export async function loadLayout(publicId: string): Promise<LoadedLayout> {
  const res = await fetch(`${BASE}/api/layouts/${publicId}`, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`not found: ${res.status}`);
  }

  return res.json();
}
