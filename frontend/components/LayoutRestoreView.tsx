'use client';

import { useState } from 'react';
import Link from 'next/link';
import RoomView2D from '@/components/RoomView2D';
import { FIXED_FLOOR_PLAN } from '@/lib/roomLayout';
import type { PlacedProduct } from '@/lib/kaguera';
import type { LoadedLayout } from '@/lib/layoutApi';

function toPlacedProducts(layout: LoadedLayout): PlacedProduct[] {
  return layout.items.map((item, index) => ({
    instanceId: `shared-${index}`,
    productId: item.productId,
    x: item.x,
    y: item.y,
    rotation: item.rotation,
    source: 'recommended' as const,
  }));
}

export default function LayoutRestoreView({ layout }: { layout: LoadedLayout }) {
  // 読み取り専用ビュー: 選択ハイライトのみ許可し、移動(onMoveItem)は無効化する。
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const items = toPlacedProducts(layout);
  const hasRoom = layout.room_width_cm !== null && layout.room_depth_cm !== null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#E8933A]">
          共有レイアウト
        </span>
        <h1 className="text-2xl font-bold text-[#1F160E]">{layout.title}</h1>
        <p className="text-sm text-[#7A6A5A]">
          {items.length} 点の家具・家電 ・ 閲覧数 {layout.view_count}
        </p>
      </div>

      <RoomView2D
        items={items}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        onMoveItem={() => {}}
        floorPlan={hasRoom ? FIXED_FLOOR_PLAN : null}
      />

      <div className="mt-6">
        <Link href="/mypage#room-planner" className="kaguera-button-primary inline-flex">
          自分のマイページで配置を作る
        </Link>
      </div>
    </main>
  );
}
