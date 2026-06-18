'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Box,
  LayoutGrid,
  Sparkles,
  Plus,
  RotateCw,
  Trash2,
  Check,
  X,
  ShoppingCart,
  Loader2,
  Share2,
} from 'lucide-react';
import { useCart } from '@/lib/cart';
import RoomView2D from '@/components/RoomView2D';
import RoomView3D from '@/components/RoomView3D';
import { FIXED_FLOOR_PLAN } from '@/lib/roomLayout';
import { QRCodeSVG } from 'qrcode.react';
import { saveLayout, toLayoutItems } from '@/lib/layoutApi';
import { getProductById, products, type Category, type Product, type SubCategory } from '@/lib/products';
import {
  buildFallbackRecommendationIds,
  clampToRoom,
  getAlternativeProducts,
  getFootprintSize,
  getRecommendationReason,
  ROOM_DIMENSIONS_CM,
  SUBCATEGORY_LABELS,
  type PlacedProduct,
  type RecommendationEntry,
  type RoomProfile,
  type TasteAnswers,
} from '@/lib/kaguera';

type ViewMode = '2d' | '3d';
type FilterCategory = 'all' | Category;
type FilterSubCategory = 'all' | SubCategory;

type Props = {
  tasteAnswers: Partial<TasteAnswers>;
  roomProfile: RoomProfile | null;
};

function formatPrice(price: number) {
  return `¥${price.toLocaleString('ja-JP')}`;
}

function createInstanceId(prefix: string, key: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${key}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rectanglesOverlap(
  left: { x: number; y: number; width: number; depth: number },
  right: { x: number; y: number; width: number; depth: number },
  gap = 8,
) {
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.depth + gap <= right.y ||
    right.y + right.depth + gap <= left.y
  );
}

export default function RoomPlannerSection({ tasteAnswers, roomProfile }: Props) {
  const { addItem: addToCart, hasItem: isInCart } = useCart();
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [placedItems, setPlacedItems] = useState<PlacedProduct[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationEntry[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterSubCategory, setFilterSubCategory] = useState<FilterSubCategory>('all');
  const [openAlternativesFor, setOpenAlternativesFor] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [copied, setCopied] = useState(false);

  // モーダル表示中は Esc で閉じられるようにする（a11y）
  useEffect(() => {
    if (!isAddModalOpen && !shareUrl) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAddModalOpen(false);
        setShareUrl(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAddModalOpen, shareUrl]);

  const currentSelectedItem = selectedItemId
    ? placedItems.find((item) => item.instanceId === selectedItemId) ?? null
    : null;
  const currentSelectedProduct = currentSelectedItem
    ? getProductById(currentSelectedItem.productId) ?? null
    : null;

  const availableSubCategories = filterCategory === 'furniture'
    ? products.filter((product) => product.category === 'furniture')
    : filterCategory === 'appliance'
    ? products.filter((product) => product.category === 'appliance')
    : products;

  const modalProducts = availableSubCategories.filter((product) => {
    if (filterSubCategory === 'all') {
      return true;
    }

    return product.subCategory === filterSubCategory;
  });

  const modalSubCategories = Array.from(new Set(
    products
      .filter((product) => filterCategory === 'all' || product.category === filterCategory)
      .map((product) => product.subCategory),
  ));

  function buildOccupiedRects(items: PlacedProduct[], excludeId?: string) {
    return items
      .filter((item) => item.instanceId !== excludeId)
      .map((item) => {
        const product = getProductById(item.productId);

        if (!product) {
          return null;
        }

        const footprint = getFootprintSize(product, item.rotation);
        const clamped = clampToRoom(product, item.x, item.y, item.rotation);

        return {
          x: clamped.x,
          y: clamped.y,
          width: footprint.width,
          depth: footprint.depth,
        };
      })
      .filter((rect): rect is { x: number; y: number; width: number; depth: number } => Boolean(rect));
  }

  function findAvailablePosition(product: Product, occupiedItems: PlacedProduct[], excludeId?: string) {
    const footprint = getFootprintSize(product, 0);
    const occupiedRects = buildOccupiedRects(occupiedItems, excludeId);

    for (let y = 12; y <= ROOM_DIMENSIONS_CM.depth - footprint.depth - 12; y += 14) {
      for (let x = 12; x <= ROOM_DIMENSIONS_CM.width - footprint.width - 12; x += 14) {
        const candidate = { x, y, width: footprint.width, depth: footprint.depth };
        const overlaps = occupiedRects.some((rect) => rectanglesOverlap(candidate, rect));

        if (!overlaps) {
          return candidate;
        }
      }
    }

    return {
      ...clampToRoom(
        product,
        (ROOM_DIMENSIONS_CM.width - footprint.width) / 2,
        (ROOM_DIMENSIONS_CM.depth - footprint.depth) / 2,
        0,
      ),
      width: footprint.width,
      depth: footprint.depth,
    };
  }

  function buildRecommendedPlacements(nextRecommendations: RecommendationEntry[], existingItems: PlacedProduct[]) {
    const manualItems = existingItems.filter((item) => item.source === 'manual');
    const existingRecommended = new Map(
      existingItems
        .filter((item) => item.source === 'recommended' && item.recommendationKey)
        .map((item) => [item.recommendationKey as string, item]),
    );

    const recommendedItems: PlacedProduct[] = [];

    for (const entry of nextRecommendations.filter((item) => item.included)) {
      const product = getProductById(entry.productId);

      if (!product) {
        continue;
      }

      const currentItem = existingRecommended.get(entry.key);

      if (currentItem) {
        const clamped = clampToRoom(product, currentItem.x, currentItem.y, currentItem.rotation);
        const footprint = getFootprintSize(product, currentItem.rotation);
        const occupied = buildOccupiedRects([...manualItems, ...recommendedItems], currentItem.instanceId);
        const candidate = {
          x: clamped.x,
          y: clamped.y,
          width: footprint.width,
          depth: footprint.depth,
        };

        if (!occupied.some((rect) => rectanglesOverlap(candidate, rect))) {
          recommendedItems.push({
            ...currentItem,
            productId: product.id,
            x: clamped.x,
            y: clamped.y,
            source: 'recommended',
            recommendationKey: entry.key,
          });
          continue;
        }
      }

      const available = findAvailablePosition(product, [...manualItems, ...recommendedItems], currentItem?.instanceId);
      recommendedItems.push({
        instanceId: currentItem?.instanceId ?? `recommended-${entry.key}`,
        productId: product.id,
        x: available.x,
        y: available.y,
        rotation: currentItem?.rotation ?? 0,
        source: 'recommended',
        recommendationKey: entry.key,
      });
    }

    return recommendedItems;
  }

  function applyRecommendations(nextRecommendations: RecommendationEntry[]) {
    setRecommendations(nextRecommendations);
    setPlacedItems((current) => {
      const manualItems = current.filter((item) => item.source === 'manual');
      const recommendedItems = buildRecommendedPlacements(nextRecommendations, current);
      return [...manualItems, ...recommendedItems];
    });
  }

  function addManualProduct(product: Product) {
    const footprint = getFootprintSize(product, 0);
    const centered = clampToRoom(
      product,
      (ROOM_DIMENSIONS_CM.width - footprint.width) / 2,
      (ROOM_DIMENSIONS_CM.depth - footprint.depth) / 2,
      0,
    );

    const nextItem: PlacedProduct = {
      instanceId: createInstanceId('manual', product.id),
      productId: product.id,
      x: centered.x,
      y: centered.y,
      rotation: 0,
      source: 'manual',
    };

    setPlacedItems((current) => [...current, nextItem]);
    setSelectedItemId(nextItem.instanceId);
    setIsAddModalOpen(false);
  }

  function moveItem(itemId: string, x: number, y: number) {
    setPlacedItems((current) =>
      current.map((item) => {
        if (item.instanceId !== itemId) {
          return item;
        }

        const product = getProductById(item.productId);

        if (!product) {
          return item;
        }

        const clamped = clampToRoom(product, x, y, item.rotation);
        const footprint = getFootprintSize(product, item.rotation);
        const candidate = { x: clamped.x, y: clamped.y, width: footprint.width, depth: footprint.depth };
        const occupied = buildOccupiedRects(current, itemId);

        if (occupied.some((rect) => rectanglesOverlap(candidate, rect, 0))) {
          return item;
        }

        return { ...item, x: clamped.x, y: clamped.y };
      }),
    );
  }

  function rotateSelectedItem() {
    if (!currentSelectedItem || !currentSelectedProduct) {
      return;
    }

    const nextRotation = currentSelectedItem.rotation === 0 ? 90 : 0;
    const clamped = clampToRoom(currentSelectedProduct, currentSelectedItem.x, currentSelectedItem.y, nextRotation);
    const footprint = getFootprintSize(currentSelectedProduct, nextRotation);
    const candidate = { x: clamped.x, y: clamped.y, width: footprint.width, depth: footprint.depth };
    const occupied = buildOccupiedRects(placedItems, currentSelectedItem.instanceId);

    if (occupied.some((rect) => rectanglesOverlap(candidate, rect, 0))) {
      setRotateError(true);
      setTimeout(() => setRotateError(false), 2000);
      return;
    }

    setPlacedItems((current) =>
      current.map((item) => {
        if (item.instanceId !== currentSelectedItem.instanceId) {
          return item;
        }

        return {
          ...item,
          rotation: nextRotation,
          x: clamped.x,
          y: clamped.y,
        };
      }),
    );
  }

  function deleteSelectedItem() {
    if (!currentSelectedItem) {
      return;
    }

    if (currentSelectedItem.source === 'recommended' && currentSelectedItem.recommendationKey) {
      const nextRecommendations = recommendations.map((entry) =>
        entry.key === currentSelectedItem.recommendationKey
          ? { ...entry, included: false }
          : entry,
      );
      applyRecommendations(nextRecommendations);
    } else {
      setPlacedItems((current) => current.filter((item) => item.instanceId !== currentSelectedItem.instanceId));
    }

    setSelectedItemId(null);
  }

  function toggleRecommendation(entryKey: string, included: boolean) {
    const nextRecommendations = recommendations.map((entry) =>
      entry.key === entryKey
        ? { ...entry, included }
        : entry,
    );
    applyRecommendations(nextRecommendations);
  }

  function replaceRecommendation(entryKey: string, nextProductId: string) {
    const nextRecommendations = recommendations.map((entry) =>
      entry.key === entryKey
        ? { ...entry, productId: nextProductId, included: true }
        : entry,
    );
    applyRecommendations(nextRecommendations);
    setOpenAlternativesFor(null);
  }

  function buildRecommendationEntries(productIds: string[]): RecommendationEntry[] {
    const entries: RecommendationEntry[] = [];
    const usedSubCategories = new Set<SubCategory>();

    for (const productId of productIds) {
      const product = getProductById(productId);

      if (!product || usedSubCategories.has(product.subCategory)) {
        continue;
      }

      usedSubCategories.add(product.subCategory);
      entries.push({
        key: product.subCategory,
        productId: product.id,
        included: true,
        subCategory: product.subCategory,
        reason: getRecommendationReason(product.subCategory, tasteAnswers),
      });

      if (entries.length >= 10) {
        break;
      }
    }

    return entries;
  }

  async function handleAutoRecommend() {
    if (!roomProfile) {
      return;
    }

    setIsRecommending(true);
    setRecommendError(false);

    let recommendedIds: string[] = [];
    let failed = false;

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomInfo: roomProfile,
          preferences: tasteAnswers,
          allProducts: products,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.recommendedProductIds)) {
          recommendedIds = data.recommendedProductIds.filter(
            (value: unknown): value is string => typeof value === 'string',
          );
        }
      } else {
        failed = true;
      }
    } catch {
      // ネットワーク例外は握りつぶさず通知。配置自体はフォールバックで必ず出す。
      failed = true;
    }

    // API が空配列 / 失敗でも、ローカルロジックで必ず候補を出す
    if (recommendedIds.length === 0) {
      recommendedIds = buildFallbackRecommendationIds(products, tasteAnswers);
    }

    applyRecommendations(buildRecommendationEntries(recommendedIds));
    setSelectedItemId(null);
    setIsRecommending(false);

    if (failed) {
      setRecommendError(true);
      setTimeout(() => setRecommendError(false), 4000);
    }
  }

  async function handleSave() {
    if (placedItems.length === 0) {
      return;
    }

    setIsSaving(true);
    setSaveError(false);

    try {
      const { publicId } = await saveLayout({
        title: roomProfile
          ? `${roomProfile.roomType} / ${roomProfile.sizeLabel} の配置`
          : '無題のレイアウト',
        room_width_cm: ROOM_DIMENSIONS_CM.width,
        room_depth_cm: ROOM_DIMENSIONS_CM.depth,
        items: toLayoutItems(placedItems),
      });
      setShareUrl(`${window.location.origin}/layouts/${publicId}`);
      setCopied(false);
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード非対応環境では手動コピーにフォールバック
    }
  }

  return (
    <section id="room-planner" className="kaguera-card flex flex-col gap-6 p-6 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1F160E]">部屋モデル ＆ AIレコメンド</h2>
          <p className="text-sm text-[#7A6A5A] mt-1">
            6畳ワンルームをベースに、2D / 3D の部屋モデルで家具配置を試せます。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ id: '2d', label: '2D', icon: LayoutGrid }, { id: '3d', label: '3D', icon: Box }].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id as ViewMode)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                viewMode === id
                  ? 'bg-[#E8933A] text-white shadow-sm'
                  : 'border border-[#DCCFC0] bg-white text-[#3D3020] hover:border-[#E8933A] hover:text-[#E8933A]'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[#F5EEE5] px-3 py-1 font-semibold text-[#E8933A]">
          部屋モデル: 255cm × 340cm
        </span>
        {roomProfile && (
          <>
            <span className="rounded-full bg-[#F6F3ED] px-3 py-1 text-[#7A6A5A]">
              {roomProfile.roomType} / {roomProfile.sizeLabel}
            </span>
            <span className="rounded-full bg-[#F6F3ED] px-3 py-1 text-[#7A6A5A]">
              形状: {roomProfile.shape}
            </span>
            <span className="rounded-full bg-[#F6F3ED] px-3 py-1 text-[#7A6A5A]">
              窓: {roomProfile.windowDirection}
            </span>
          </>
        )}
        {tasteAnswers.mood && (
          <span className="rounded-full bg-[#EDF4EE] px-3 py-1 text-[#2A7A50]">
            好み: {tasteAnswers.mood}
          </span>
        )}
        {tasteAnswers.budget && (
          <span className="rounded-full bg-[#EDF4EE] px-3 py-1 text-[#2A7A50]">
            予算: {tasteAnswers.budget}
          </span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="kaguera-button-secondary"
            >
              <Plus size={16} />
              家具を追加
            </button>

            <button
              type="button"
              onClick={handleAutoRecommend}
              disabled={!roomProfile || isRecommending}
              className="kaguera-button-primary"
            >
              {isRecommending ? (
                <><Loader2 size={16} className="animate-spin" />配置中…</>
              ) : (
                <><Sparkles size={16} />AIおまかせで配置</>
              )}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={placedItems.length === 0 || isSaving}
              className="kaguera-button-secondary"
            >
              {isSaving ? (
                <><Loader2 size={16} className="animate-spin" />保存中…</>
              ) : (
                <><Share2 size={16} />保存して共有</>
              )}
            </button>
          </div>

          {!roomProfile ? (
            <div className="rounded-2xl border border-dashed border-[#DECCB5] bg-[#FCF8F2] px-4 py-3 text-sm text-[#E8933A]">
              AIおまかせ配置は、部屋解析の実行後に有効になります。
            </div>
          ) : null}

          {recommendError && (
            <div className="rounded-2xl border border-[#F0C8C8] bg-[#FDF3F3] px-4 py-3 text-sm text-[#C0564A]">
              AIレコメンドに接続できなかったため、簡易ロジックで提案を表示しています。
            </div>
          )}

          {saveError && (
            <div className="rounded-2xl border border-[#F0C8C8] bg-[#FDF3F3] px-4 py-3 text-sm text-[#C0564A]">
              共有サーバーに接続できませんでした。バックエンドが起動しているか確認してください。
            </div>
          )}

          {viewMode === '2d' ? (
            <RoomView2D
              items={placedItems}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onMoveItem={moveItem}
              floorPlan={roomProfile ? FIXED_FLOOR_PLAN : null}
            />
          ) : (
            <RoomView3D
              items={placedItems}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onMoveItem={moveItem}
              floorPlan={roomProfile ? FIXED_FLOOR_PLAN : null}
            />
          )}

          <div className="rounded-2xl border border-[#F0DFC8] bg-[#FAF7F2] p-4">
            <p className="text-sm font-semibold text-[#1F160E]">
              {currentSelectedProduct ? `選択中: ${currentSelectedProduct.name}` : '家具をクリックすると編集できます'}
            </p>
            <p className="mt-1 text-xs text-[#7A6A5A]">
              2Dビューではドラッグで精密に移動、3Dビューでは雰囲気確認向けにざっくり移動できます。
            </p>

            {currentSelectedProduct && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={rotateSelectedItem}
                    className="kaguera-button-secondary py-2.5"
                  >
                    <RotateCw size={15} />
                    90°回転
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedItem}
                    className="kaguera-button-danger py-2.5"
                  >
                    <Trash2 size={15} />
                    削除
                  </button>
                </div>
                {rotateError && (
                  <p className="text-sm font-semibold text-red-500">
                    回転できません — 他の家具と重なってしまいます
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#F0DFC8] bg-[#FFF8F0] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1F160E]">一人暮らしセット</h3>
                <p className="text-xs text-[#7A6A5A] mt-1">
                  必要なものだけ残して、同カテゴリの別候補にも差し替えられます。
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#E8933A] border border-[#E3D5C6]">
                {recommendations.filter((entry) => entry.included).length} 点配置中
              </span>
            </div>

            {recommendations.filter((e) => e.included).length > 0 && (() => {
              const includedIds = recommendations.filter((e) => e.included).map((e) => e.productId);
              const allInCart = includedIds.every((id) => isInCart(id));
              return (
                <button
                  type="button"
                  onClick={() => includedIds.forEach((id) => addToCart(id))}
                  disabled={allInCart}
                  className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
                    allInCart
                      ? 'bg-[#E8F5E9] text-[#2A7A50] cursor-default'
                      : 'bg-[#1F160E] text-white hover:bg-[#3C3C3C]'
                  }`}
                >
                  {allInCart ? (
                    <><Check size={15} />すべてカートに追加済み</>
                  ) : (
                    <><ShoppingCart size={15} />まとめてカートに入れる</>
                  )}
                </button>
              );
            })()}
          </div>

          {recommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DECCB5] bg-[#FAF7F2] px-4 py-6 text-sm text-[#E8933A]">
              AIおまかせで配置を押すと、家具・家電のセット提案がここに表示されます。
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recommendations.map((entry) => {
                const product = getProductById(entry.productId);

                if (!product) {
                  return null;
                }

                const alternatives = getAlternativeProducts(products, entry.subCategory, product.id, tasteAnswers, 3);

                return (
                  <div key={entry.key} className="rounded-2xl border border-[#F0DFC8] bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <label className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-[#1F160E]">
                        <input
                          type="checkbox"
                          checked={entry.included}
                          onChange={(event) => toggleRecommendation(entry.key, event.target.checked)}
                          className="h-4 w-4 rounded border-[#DECCB5] text-[#E8933A] focus:ring-[#E8933A]"
                        />
                        {entry.included ? 'いる' : 'いらない'}
                      </label>

                      <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-[#FFF5EB]">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#F5EEE5] px-2.5 py-1 text-[11px] font-semibold text-[#E8933A]">
                            {SUBCATEGORY_LABELS[product.subCategory]}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            product.condition === 'new'
                              ? 'bg-[#E8933A] text-white'
                              : 'border border-[#E8933A] bg-white text-[#E8933A]'
                          }`}>
                            {product.condition === 'new' ? '新品' : '中古'}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-bold text-[#1F160E]">{product.name}</p>
                        <p className="mt-1 text-sm text-[#7A6A5A]">{formatPrice(product.price)}</p>
                        <p className="mt-2 text-xs leading-relaxed text-[#7A6A5A]">{entry.reason}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addToCart(product.id)}
                        disabled={isInCart(product.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                          isInCart(product.id)
                            ? 'bg-[#E8F5E9] text-[#2A7A50] cursor-default'
                            : 'bg-[#1F160E] text-white hover:bg-[#3C3C3C]'
                        }`}
                      >
                        {isInCart(product.id) ? (
                          <><Check size={13} />カートに追加済み</>
                        ) : (
                          <><ShoppingCart size={13} />カートに入れる</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenAlternativesFor(openAlternativesFor === entry.key ? null : entry.key)}
                        className="kaguera-button-secondary rounded-lg px-3 py-2 text-xs"
                      >
                        他の選択肢を見る
                      </button>
                    </div>

                    {openAlternativesFor === entry.key && (
                      <div className="mt-4 grid gap-2 rounded-xl bg-[#FAF7F2] p-3">
                        {alternatives.map((alternative) => (
                          <button
                            key={alternative.id}
                            type="button"
                            onClick={() => replaceRecommendation(entry.key, alternative.id)}
                            className="flex items-center justify-between rounded-xl border border-[#E3D5C6] bg-white px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#1F160E]">{alternative.name}</p>
                              <p className="mt-1 text-xs text-[#7A6A5A]">
                                {formatPrice(alternative.price)} / {alternative.shopName}
                              </p>
                            </div>
                            <span className="text-xl">{alternative.icon}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="家具・家電を追加"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsAddModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-5xl rounded-[1.75rem] bg-[#FAFAF7] shadow-2xl border border-[#E3D8CA] max-h-[88vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#F0DFC8] px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#1F160E]">家具・家電を追加</h3>
                <p className="text-sm text-[#7A6A5A] mt-1">
                  選択した商品は部屋の中央に配置されます。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="閉じる"
                className="rounded-full p-2 text-[#7A6A5A] transition-colors hover:bg-white hover:text-[#1F160E]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'すべて' },
                  { id: 'furniture', label: '家具' },
                  { id: 'appliance', label: '家電' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setFilterCategory(tab.id as FilterCategory);
                      setFilterSubCategory('all');
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      filterCategory === tab.id
                        ? 'bg-[#E8933A] text-white shadow-sm'
                        : 'border border-[#D8C9B7] bg-white text-[#3D3020]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilterSubCategory('all')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    filterSubCategory === 'all'
                      ? 'bg-[#1F160E] text-white'
                      : 'border border-[#D8C9B7] bg-white text-[#3D3020]'
                  }`}
                >
                  すべて
                </button>
                {modalSubCategories.map((subCategory) => (
                  <button
                    key={subCategory}
                    type="button"
                    onClick={() => setFilterSubCategory(subCategory)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      filterSubCategory === subCategory
                        ? 'bg-[#1F160E] text-white'
                        : 'border border-[#D8C9B7] bg-white text-[#3D3020]'
                    }`}
                  >
                    {SUBCATEGORY_LABELS[subCategory]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 overflow-y-auto px-6 pb-6 sm:grid-cols-2 xl:grid-cols-3 max-h-[58vh]">
              {modalProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addManualProduct(product)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#F0DFC8] bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] bg-[#FFF5EB]">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#F5EEE5] px-2.5 py-1 text-[11px] font-semibold text-[#E8933A]">
                        {SUBCATEGORY_LABELS[product.subCategory]}
                      </span>
                      <span className="text-xl">{product.icon}</span>
                    </div>
                    <p className="text-sm font-bold text-[#1F160E]">{product.name}</p>
                    <p className="text-sm text-[#7A6A5A]">{formatPrice(product.price)}</p>
                    <p className="text-xs text-[#7A6A5A]">
                      W{product.size.width} × D{product.size.depth} × H{product.size.height} cm
                    </p>
                    <div className="mt-auto inline-flex items-center gap-2 text-xs font-semibold text-[#2A7A50]">
                      <Check size={14} />
                      この商品を部屋に追加
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {shareUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="レイアウトを共有"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShareUrl(null);
            }
          }}
        >
          <div className="w-full max-w-sm rounded-[1.75rem] border border-[#E3D8CA] bg-[#FAFAF7] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1F160E]">レイアウトを共有</h3>
              <button
                type="button"
                onClick={() => setShareUrl(null)}
                aria-label="閉じる"
                className="rounded-full p-2 text-[#7A6A5A] transition-colors hover:bg-white hover:text-[#1F160E]"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-sm text-[#7A6A5A]">
              QR を読み取るか URL を共有すると、別の端末で配置を復元できます。
            </p>
            <div className="mt-4 flex justify-center rounded-2xl bg-white p-4">
              <QRCodeSVG value={shareUrl} size={180} />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E3D5C6] bg-white px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-[#3D3020]">{shareUrl}</span>
              <button
                type="button"
                onClick={handleCopyShareUrl}
                className="shrink-0 rounded-lg bg-[#1F160E] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#3C3C3C]"
              >
                {copied ? 'コピー済み' : 'コピー'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
