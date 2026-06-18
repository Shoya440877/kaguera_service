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

/** 壁の高さ (px) — floor と同じ座標系での Z 方向高さ */
const WALL_H = 72;

/** 壁の共通スタイル */
const WALL_SOLID_BACK  = 'rgba(228,218,204,0.72)';
const WALL_SOLID_LEFT  = 'rgba(216,208,194,0.72)';
const WALL_SEMI_FRONT  = 'rgba(228,218,204,0.30)';
const WALL_SEMI_RIGHT  = 'rgba(216,208,194,0.30)';
const WALL_BORDER_OPAQUE = 'rgba(155,126,90,0.9)';
const WALL_BORDER_SEMI   = 'rgba(155,126,90,0.35)';

/** ガラス窓 */
const GLASS_BG     = 'rgba(185,225,245,0.28)';
const GLASS_BORDER = 'rgba(140,200,230,0.75)';
const GLASS_SHINE  = 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(185,225,245,0.15) 50%, rgba(255,255,255,0.1) 100%)';

/** 色を暗くする */
function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

type Box3D = {
  key: string;
  top: string; left: string; width: string; height: string;
  bh: number;
  elevate?: number;
  topColor: string;
  sideColor: string;
  frontColor: string;
  showSelection?: boolean;
};

/** 90° 回転時にボックス座標を変換する */
function rotateBox90(box: Box3D): Box3D {
  const t = parseFloat(box.top) || 0;
  const l = parseFloat(box.left) || 0;
  const w = parseFloat(box.width) || 0;
  const h = parseFloat(box.height) || 0;
  return {
    ...box,
    left: `${100 - t - h}%`,
    top: `${l}%`,
    width: `${h}%`,
    height: `${w}%`,
  };
}

/** サブカテゴリ別の 3D ボックス構成を返す */
function buildFurnitureBoxes(color: string, subCategory: string, sizeHeight: number, rotation: 0 | 90 = 0): Box3D[] {
  switch (subCategory) {
    case 'bed':
      return [
        {
          key: 'mattress', top: '20%', left: '0', width: '100%', height: '80%',
          bh: 14,
          topColor: '#F5EDE0', sideColor: '#E0D4C0', frontColor: '#E8DCC8',
          showSelection: true,
        },
        {
          key: 'headboard', top: '0', left: '0', width: '100%', height: '22%',
          bh: 28,
          topColor: color, sideColor: darken(color, 45), frontColor: darken(color, 22),
        },
        {
          key: 'pillow', top: '26%', left: '18%', width: '26%', height: '12%',
          bh: 5, elevate: 14,
          topColor: '#FFFFFF', sideColor: '#E8E4E0', frontColor: '#F0ECE8',
        },
      ];

    case 'sofa':
      return [
        {
          key: 'seat', top: '30%', left: '10%', width: '80%', height: '70%',
          bh: 18,
          topColor: color, sideColor: darken(color, 35), frontColor: darken(color, 18),
          showSelection: true,
        },
        {
          key: 'back', top: '0', left: '0', width: '100%', height: '32%',
          bh: 34,
          topColor: darken(color, 12), sideColor: darken(color, 50), frontColor: darken(color, 30),
        },
        {
          key: 'arm-l', top: '0', left: '0', width: '12%', height: '100%',
          bh: 24,
          topColor: darken(color, 8), sideColor: darken(color, 45), frontColor: darken(color, 25),
        },
        {
          key: 'arm-r', top: '0', left: '88%', width: '12%', height: '100%',
          bh: 24,
          topColor: darken(color, 8), sideColor: darken(color, 45), frontColor: darken(color, 25),
        },
      ];

    case 'desk':
    case 'dining_table':
      return [
        {
          key: 'top', top: '0', left: '0', width: '100%', height: '100%',
          bh: 4, elevate: 26,
          topColor: color, sideColor: darken(color, 40), frontColor: darken(color, 20),
          showSelection: true,
        },
        { key: 'leg-bl', top: '5%', left: '5%', width: '8%', height: '8%', bh: 26, topColor: darken(color, 25), sideColor: darken(color, 55), frontColor: darken(color, 40) },
        { key: 'leg-br', top: '5%', left: '87%', width: '8%', height: '8%', bh: 26, topColor: darken(color, 25), sideColor: darken(color, 55), frontColor: darken(color, 40) },
        { key: 'leg-fl', top: '87%', left: '5%', width: '8%', height: '8%', bh: 26, topColor: darken(color, 25), sideColor: darken(color, 55), frontColor: darken(color, 40) },
        { key: 'leg-fr', top: '87%', left: '87%', width: '8%', height: '8%', bh: 26, topColor: darken(color, 25), sideColor: darken(color, 55), frontColor: darken(color, 40) },
      ];

    case 'chair':
      return [
        {
          key: 'seat', top: '35%', left: '0', width: '100%', height: '65%',
          bh: 4, elevate: 20,
          topColor: color, sideColor: darken(color, 35), frontColor: darken(color, 18),
          showSelection: true,
        },
        {
          key: 'back', top: '0', left: '5%', width: '90%', height: '35%',
          bh: 40,
          topColor: darken(color, 10), sideColor: darken(color, 48), frontColor: darken(color, 28),
        },
        { key: 'leg-bl', top: '38%', left: '8%', width: '12%', height: '10%', bh: 20, topColor: darken(color, 20), sideColor: darken(color, 50), frontColor: darken(color, 35) },
        { key: 'leg-br', top: '38%', left: '80%', width: '12%', height: '10%', bh: 20, topColor: darken(color, 20), sideColor: darken(color, 50), frontColor: darken(color, 35) },
        { key: 'leg-fl', top: '85%', left: '8%', width: '12%', height: '10%', bh: 20, topColor: darken(color, 20), sideColor: darken(color, 50), frontColor: darken(color, 35) },
        { key: 'leg-fr', top: '85%', left: '80%', width: '12%', height: '10%', bh: 20, topColor: darken(color, 20), sideColor: darken(color, 50), frontColor: darken(color, 35) },
      ];

    case 'shelf':
      return [{
        key: 'body', top: '0', left: '0', width: '100%', height: '100%',
        bh: 48,
        topColor: color, sideColor: darken(color, 45), frontColor: darken(color, 22),
        showSelection: true,
      }];

    default: {
      const bh = Math.max(16, Math.min(52, Math.round(sizeHeight * 0.22)));
      return [{
        key: 'block', top: '0', left: '0', width: '100%', height: '100%',
        bh,
        topColor: color, sideColor: darken(color, 45), frontColor: darken(color, 22),
        showSelection: true,
      }];
    }
  }

  // この行には到達しないが、TypeScript の安全弁
  return [];
}

/** 回転を適用した最終ボックス配列を返す */
function getFurnitureBoxes(color: string, subCategory: string, sizeHeight: number, rotation: 0 | 90 = 0): Box3D[] {
  const boxes = buildFurnitureBoxes(color, subCategory, sizeHeight, rotation);
  if (rotation === 90) {
    return boxes.map(rotateBox90);
  }
  return boxes;
}

export default function RoomView3D({ items, selectedItemId, onSelectItem, onMoveItem, floorPlan }: Props) {
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
      if (!activeDrag || !roomElement) return;
      const roomRect = roomElement.getBoundingClientRect();
      const deltaX = ((event.clientX - activeDrag.startClientX) / roomRect.width)  * ROOM_DIMENSIONS_CM.width;
      const deltaY = ((event.clientY - activeDrag.startClientY) / roomRect.height) * ROOM_DIMENSIONS_CM.depth;
      onMoveItem(activeDrag.itemId, activeDrag.originX + deltaX, activeDrag.originY + deltaY);
    }
    function handlePointerUp() { dragRef.current = null; }
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
      <div className="relative h-[430px] overflow-hidden rounded-[1.5rem] bg-[#B8C8D8]">
        <div className="absolute left-4 top-4 z-30 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-[#E8933A] shadow-sm">
          {floorPlan ? '間取り 3D' : 'Isometric 3D'}
        </div>

        <div className="absolute inset-x-0 bottom-0 top-10 flex items-center justify-center [perspective:1200px]">
          <div
            ref={roomRef}
            className="relative [transform-style:preserve-3d] [transform:rotateX(48deg)_rotateZ(-38deg)]"
            style={
              floorPlan
                ? { width: '78%', aspectRatio: String(FLOOR_PLAN_ASPECT) }
                : { width: '68%', aspectRatio: '255 / 340' }
            }
            onClick={() => onSelectItem(null)}
          >
            {/* ================================================
                床面（タイルグリッド）
            ================================================ */}
            <div
              className="absolute inset-0"
              style={{
                background: '#F5EDE0',
                backgroundImage: `
                  linear-gradient(rgba(139,111,71,0.18) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(139,111,71,0.18) 1px, transparent 1px)
                `,
                backgroundSize: '8% 11%',
                boxShadow: '0 40px 80px rgba(44,44,44,0.28)',
                borderRadius: '4px',
              }}
            />

            {/* ================================================
                エリア色（床に重ねる）+ ラベル
            ================================================ */}
            {floorPlan && floorPlan.map((area) => (
              <div
                key={area.id}
                className="absolute"
                style={{
                  left: `${area.x}%`, top: `${area.y}%`,
                  width: `${area.width}%`, height: `${area.height}%`,
                  background: AREA_FILL[area.kind] + 'CC',
                  border: `1px solid ${AREA_STROKE}55`,
                  boxSizing: 'border-box',
                }}
              />
            ))}
            {floorPlan && floorPlan.map((area) => (
              <span
                key={area.id + '-lbl'}
                className="pointer-events-none absolute text-[10px] font-bold text-[#3D2F20]"
                style={{
                  left: `${area.x + area.width / 2}%`,
                  top:  `${area.y + area.height / 2}%`,
                  transform: 'translate(-50%,-50%) rotateX(-48deg) rotateZ(38deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                {area.label}
              </span>
            ))}

            {/* ================================================
                ① 奥の壁（y=0 から立ち上げ）— やや不透明
            ================================================ */}
            <div style={{
              position: 'absolute', left: 0, top: 0, width: '100%', height: WALL_H,
              transformOrigin: 'top', transform: 'rotateX(90deg)',
              background: WALL_SOLID_BACK,
              borderTop:   `3px solid ${WALL_BORDER_OPAQUE}`,
              borderLeft:  `1px solid ${WALL_BORDER_SEMI}`,
              borderRight: `1px solid ${WALL_BORDER_SEMI}`,
              boxSizing: 'border-box',
            }} />

            {/* ② 左の壁（x=0 から立ち上げ）— やや不透明 */}
            <div style={{
              position: 'absolute', left: 0, top: 0, width: WALL_H, height: '100%',
              transformOrigin: 'left', transform: 'rotateY(-90deg)',
              background: WALL_SOLID_LEFT,
              borderLeft:   `3px solid ${WALL_BORDER_OPAQUE}`,
              borderTop:    `1px solid ${WALL_BORDER_SEMI}`,
              borderBottom: `1px solid ${WALL_BORDER_SEMI}`,
              boxSizing: 'border-box',
            }} />

            {/* ③ 手前の壁（y=100% から立ち上げ）— 半透明 */}
            <div style={{
              position: 'absolute', left: 0, top: '100%', width: '100%', height: WALL_H,
              transformOrigin: 'top', transform: 'rotateX(90deg)',
              background: WALL_SEMI_FRONT,
              border: `1px solid ${WALL_BORDER_SEMI}`,
              boxSizing: 'border-box',
            }} />

            {/* ④ 右の壁（x=100% から立ち上げ）— 半透明 */}
            <div style={{
              position: 'absolute', left: '100%', top: 0, width: WALL_H, height: '100%',
              transformOrigin: 'left', transform: 'rotateY(-90deg)',
              background: WALL_SEMI_RIGHT,
              border: `1px solid ${WALL_BORDER_SEMI}`,
              boxSizing: 'border-box',
            }} />

            {/* ================================================
                窓ガラス（間取りモード時のみ）
            ================================================ */}
            {floorPlan && (
              <>
                {/* 左外壁の窓：バルコニーに面した大窓（y=14〜86%） */}
                <div style={{
                  position: 'absolute', left: 0, top: '14%', width: WALL_H, height: '72%',
                  transformOrigin: 'left', transform: 'rotateY(-90deg)',
                  background: GLASS_SHINE,
                  border: `2px solid ${GLASS_BORDER}`,
                  boxSizing: 'border-box',
                }} />
                {/* 左外壁の窓: 窓枠の桟（上下中央横線） */}
                <div style={{
                  position: 'absolute', left: 0, top: '50%', width: WALL_H, height: 3,
                  transformOrigin: 'left', transform: 'translateY(-50%) rotateY(-90deg)',
                  background: GLASS_BORDER,
                }} />

                {/* 奥外壁の窓：洗面・バス側の小窓（x=68〜100%, y=0） */}
                <div style={{
                  position: 'absolute', left: '68%', top: 0, width: '32%', height: WALL_H,
                  transformOrigin: 'top', transform: 'rotateX(90deg)',
                  background: GLASS_SHINE,
                  border: `2px solid ${GLASS_BORDER}`,
                  boxSizing: 'border-box',
                }} />
                {/* 奥外壁の窓: 窓枠の桟（縦中央線） */}
                <div style={{
                  position: 'absolute', left: '84%', top: 0, width: 3, height: WALL_H,
                  transformOrigin: 'top', transform: 'rotateX(90deg)',
                  background: GLASS_BORDER,
                }} />

                {/* 右外壁の窓：バス・玄関側の小窓（y=0〜36%） */}
                <div style={{
                  position: 'absolute', left: '100%', top: 0, width: WALL_H, height: '36%',
                  transformOrigin: 'left', transform: 'rotateY(-90deg)',
                  background: GLASS_SHINE,
                  border: `2px solid ${GLASS_BORDER}`,
                  boxSizing: 'border-box',
                }} />
              </>
            )}

            {/* デフォルトルーム（間取りなし）の装飾 */}
            {!floorPlan && (
              <>
                {/* 左壁に窓 */}
                <div style={{
                  position: 'absolute', left: 0, top: '20%', width: WALL_H, height: '50%',
                  transformOrigin: 'left', transform: 'rotateY(-90deg)',
                  background: GLASS_SHINE,
                  border: `2px solid ${GLASS_BORDER}`,
                  boxSizing: 'border-box',
                }} />
                <div className="absolute inset-y-[11%] right-[9%] w-[9%] rounded-full border border-sky-200 bg-sky-100/85" />
                <div className="absolute bottom-0 left-[14%] h-[18%] w-[18%] rounded-t-full border-[6px] border-b-0 border-[#C7B39A]" />
              </>
            )}

            {/* 空のとき */}
            {items.length === 0 && !floorPlan && (
              <div
                className="absolute inset-0 flex items-center justify-center text-sm text-[#B09070]"
                style={{ transform: 'rotateX(-48deg) rotateZ(38deg)' }}
              >
                3D表示の準備ができています
              </div>
            )}

            {/* ================================================
                家具ブロック（上面 ＋ 右側面 ＋ 前面）
            ================================================ */}
            {items.map((item) => {
              const product = getProductById(item.productId);
              if (!product) return null;

              const clamped  = clampToRoom(product, item.x, item.y, item.rotation);
              const footprint = getFootprintSize(product, item.rotation);
              let widthPercent  = (footprint.width / ROOM_DIMENSIONS_CM.width)  * 100;
              let heightPercent = (footprint.depth  / ROOM_DIMENSIONS_CM.depth)  * 100;
              let leftPercent   = (clamped.x        / ROOM_DIMENSIONS_CM.width)  * 100;
              let topPercent    = (clamped.y         / ROOM_DIMENSIONS_CM.depth)  * 100;

              if (mainArea) {
                widthPercent  = (widthPercent  * mainArea.width)  / 100;
                heightPercent = (heightPercent * mainArea.height) / 100;
                leftPercent   = mainArea.x + (leftPercent  * mainArea.width)  / 100;
                topPercent    = mainArea.y + (topPercent   * mainArea.height) / 100;
              }

              const isSelected = selectedItemId === item.instanceId;
              const boxes = getFurnitureBoxes(product.color, product.subCategory, product.size.height, item.rotation);
              const maxBh = Math.max(...boxes.map((b) => b.bh + (b.elevate ?? 0)));

              return (
                <button
                  key={item.instanceId}
                  type="button"
                  className="absolute [transform-style:preserve-3d] [touch-action:none]"
                  style={{
                    left:   `${leftPercent}%`,
                    top:    `${topPercent}%`,
                    width:  `${widthPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                  onClick={(e) => { e.stopPropagation(); onSelectItem(item.instanceId); }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dragRef.current = {
                      itemId: item.instanceId,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      originX: clamped.x,
                      originY: clamped.y,
                    };
                    onSelectItem(item.instanceId);
                  }}
                  aria-label={`${product.name} を移動`}
                >
                  {boxes.map((box) => (
                    <div
                      key={box.key}
                      className="absolute [transform-style:preserve-3d]"
                      style={{
                        top: box.top, left: box.left, width: box.width, height: box.height,
                        transform: box.elevate ? `translateZ(${box.elevate}px)` : undefined,
                      }}
                    >
                      {/* 上面 */}
                      <div className="absolute inset-0 rounded-sm" style={{
                        background: box.topColor,
                        transform: `translateZ(${box.bh}px)`,
                        ...(box.showSelection ? {
                          border: isSelected ? '2px solid #1F160E' : '1px solid rgba(255,255,255,0.8)',
                          boxShadow: isSelected
                            ? '0 0 0 3px rgba(139,111,71,0.35)'
                            : '0 4px 12px rgba(0,0,0,0.25)',
                        } : {}),
                      }} />
                      {/* 右側面 */}
                      <div style={{
                        position: 'absolute', right: 0, top: 0, width: box.bh, height: '100%',
                        transformOrigin: 'right center', transform: 'rotateY(-90deg)',
                        background: box.sideColor,
                        borderRight: '1px solid rgba(0,0,0,0.15)',
                      }} />
                      {/* 前面 */}
                      <div style={{
                        position: 'absolute', left: 0, bottom: 0, width: '100%', height: box.bh,
                        transformOrigin: 'center bottom', transform: 'rotateX(-90deg)',
                        background: box.frontColor,
                        borderBottom: '1px solid rgba(0,0,0,0.1)',
                      }} />
                    </div>
                  ))}

                  {/* アイコン（正立） */}
                  <span
                    className="absolute left-1/2 top-1/2 text-base leading-none pointer-events-none"
                    style={{
                      transform: `translate(-50%,-50%) translateZ(${maxBh + 1}px) rotateX(-48deg) rotateZ(38deg)`,
                    }}
                  >
                    {product.icon}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
