'use client';

import { useEffect, useRef } from 'react';
import { getProductById } from '@/lib/products';
import { clampToRoom, getFootprintSize, ROOM_DIMENSIONS_CM, type PlacedProduct } from '@/lib/kaguera';
import { AREA_FILL, AREA_STROKE, FLOOR_PLAN_ASPECT, type FloorPlanArea } from '@/lib/roomLayout';

type Props = {
  items: PlacedProduct[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
  onMoveItem: (itemId: string, x: number, y: number) => void;
  floorPlan?: FloorPlanArea[] | null;
};

export default function RoomView2D({ items, selectedItemId, onSelectItem, onMoveItem, floorPlan }: Props) {
  const roomRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    itemId: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const activeDrag = dragRef.current;
      const roomElement = roomRef.current;

      if (!activeDrag || !roomElement) {
        return;
      }

      const roomRect = roomElement.getBoundingClientRect();
      const deltaX = ((event.clientX - activeDrag.startClientX) / roomRect.width) * ROOM_DIMENSIONS_CM.width;
      const deltaY = ((event.clientY - activeDrag.startClientY) / roomRect.height) * ROOM_DIMENSIONS_CM.depth;
      onMoveItem(activeDrag.itemId, activeDrag.originX + deltaX, activeDrag.originY + deltaY);
    }

    function handlePointerUp() {
      dragRef.current = null;
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onMoveItem]);

  const mainArea = floorPlan?.find((a) => a.kind === 'main') ?? null;

  return (
    <div className="kaguera-card-soft p-4">
      <div
        ref={roomRef}
        className="relative mx-auto w-full overflow-hidden rounded-[1.75rem] border-[5px] border-[#E8933A] bg-[#FFFDFC] shadow-[inset_0_0_0_1px_rgba(139,111,71,0.08)]"
        style={
          floorPlan
            ? { maxWidth: 560, aspectRatio: String(FLOOR_PLAN_ASPECT) }
            : { maxWidth: 430, aspectRatio: '255 / 340' }
        }
        onClick={() => onSelectItem(null)}
      >
        {floorPlan ? (
          <>
            {floorPlan.map((area) => (
              <div
                key={area.id}
                className="absolute"
                style={{
                  left: `${area.x}%`,
                  top: `${area.y}%`,
                  width: `${area.width}%`,
                  height: `${area.height}%`,
                  background: AREA_FILL[area.kind],
                  border: `2px solid ${AREA_STROKE}`,
                  boxSizing: 'border-box',
                }}
              >
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-[#3D3020] text-center leading-tight"
                  style={
                    area.kind === 'balcony'
                      ? { writingMode: 'vertical-rl', letterSpacing: '0.1em' }
                      : { whiteSpace: 'nowrap' }
                  }
                >
                  {area.label}
                </span>
                {area.fixtures?.map((fx, idx) => (
                  <span
                    key={idx}
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white/70 px-1 text-[9px] font-semibold text-[#3D3020]"
                    style={{ left: `${fx.x}%`, top: `${fx.y}%` }}
                  >
                    {fx.label}
                  </span>
                ))}
              </div>
            ))}
            <div className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#E8933A] shadow-sm">
              間取り 2D
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-y-5 right-5 w-12 rounded-full border border-sky-200 bg-sky-100/80" />
            <div className="absolute bottom-0 left-[12%] h-16 w-16 rounded-t-full border-[4px] border-b-0 border-[#C7B39A]" />
            <div className="absolute bottom-0 left-[12%] h-2 w-10 bg-[#C7B39A]" />
            <div className="absolute top-4 left-4 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#E8933A] shadow-sm">
              6畳レイアウト
            </div>
          </>
        )}

        {items.length === 0 && !floorPlan && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[#B09070]">
            家具を追加するか、AIおまかせ配置で部屋モデルを作成できます。
          </div>
        )}

        {items.map((item) => {
          const product = getProductById(item.productId);

          if (!product) {
            return null;
          }

          const clamped = clampToRoom(product, item.x, item.y, item.rotation);
          const footprint = getFootprintSize(product, item.rotation);
          let widthPercent = (footprint.width / ROOM_DIMENSIONS_CM.width) * 100;
          let heightPercent = (footprint.depth / ROOM_DIMENSIONS_CM.depth) * 100;
          let leftPercent = (clamped.x / ROOM_DIMENSIONS_CM.width) * 100;
          let topPercent = (clamped.y / ROOM_DIMENSIONS_CM.depth) * 100;
          // 間取りモードでは家具を「洋室」エリアの内側に射影する
          if (mainArea) {
            widthPercent = (widthPercent * mainArea.width) / 100;
            heightPercent = (heightPercent * mainArea.height) / 100;
            leftPercent = mainArea.x + (leftPercent * mainArea.width) / 100;
            topPercent = mainArea.y + (topPercent * mainArea.height) / 100;
          }
          const isSelected = selectedItemId === item.instanceId;

          return (
            <button
              key={item.instanceId}
              type="button"
              className={`absolute rounded-2xl border text-xl shadow-sm transition-all [touch-action:none] ${
                isSelected
                  ? 'border-[#1F160E] ring-2 ring-[#E8933A]/30 z-20'
                  : 'border-white/80 hover:ring-2 hover:ring-[#E8933A]/20 z-10'
              }`}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                backgroundColor: product.color,
                color: product.color === '#222222' ? '#FFFFFF' : '#1F160E',
              }}
              onClick={(event) => {
                event.stopPropagation();
                onSelectItem(item.instanceId);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                dragRef.current = {
                  itemId: item.instanceId,
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  originX: clamped.x,
                  originY: clamped.y,
                };
                onSelectItem(item.instanceId);
              }}
              aria-label={`${product.name} を移動`}
            >
              <span className="pointer-events-none flex h-full w-full items-center justify-center font-medium">
                {product.icon}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
