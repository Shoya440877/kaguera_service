'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { getProductById } from '@/lib/products';

function formatPrice(price: number) {
  return `¥${price.toLocaleString('ja-JP')}`;
}

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, clearCart } = useCart();

  const cartProducts = items
    .map((item) => {
      const product = getProductById(item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const totalPrice = cartProducts.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0,
  );

  return (
    <main className="kaguera-shell py-8">
      <div className="mb-6">
        <Link
          href="/mypage"
          className="inline-flex items-center gap-1.5 text-sm text-[#E8933A] hover:underline"
        >
          <ArrowLeft size={14} />
          マイページに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[#1F160E]">カート</h1>
      <p className="mt-1 text-sm text-[#7A6A5A]">
        {cartProducts.length === 0
          ? 'カートに商品がありません。'
          : `${cartProducts.length} 点の商品が入っています。`}
      </p>

      {cartProducts.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <ShoppingCart size={48} className="text-[#DECCB5]" />
          <p className="text-sm text-[#7A6A5A]">
            マイページの「一人暮らしセット」から商品をカートに追加できます。
          </p>
          <Link href="/mypage" className="kaguera-button-primary mt-2">
            マイページへ
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {cartProducts.map((entry) => (
              <div
                key={entry.productId}
                className="flex gap-4 rounded-2xl border border-[#F0DFC8] bg-white p-4 shadow-sm"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#FFF5EB]">
                  <Image
                    src={entry.product.imageUrl}
                    alt={entry.product.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1F160E]">
                    {entry.product.name}
                  </p>
                  <p className="mt-1 text-xs text-[#7A6A5A]">
                    {entry.product.shopName}
                  </p>
                  <p className="mt-1 text-xs text-[#7A6A5A]">
                    W{entry.product.size.width} × D{entry.product.size.depth} × H
                    {entry.product.size.height} cm
                  </p>
                  <p className="mt-2 text-base font-bold text-[#1F160E]">
                    {formatPrice(entry.product.price)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(entry.productId)}
                  className="self-start rounded-lg p-2 text-[#B09070] transition-colors hover:bg-[#FFF0F0] hover:text-red-500"
                  aria-label="削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-[#F0DFC8] bg-[#FFF8F0] p-5">
              <h2 className="text-base font-bold text-[#1F160E]">注文サマリー</h2>

              <div className="mt-4 flex flex-col gap-2">
                {cartProducts.map((entry) => (
                  <div
                    key={entry.productId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-[#7A6A5A]">
                      {entry.product.name}
                    </span>
                    <span className="ml-2 shrink-0 font-semibold text-[#1F160E]">
                      {formatPrice(entry.product.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-[#F0DFC8] pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1F160E]">合計</span>
                  <span className="text-lg font-bold text-[#E8933A]">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/checkout')}
                className="mt-5 w-full rounded-xl bg-[#E8933A] py-3 text-sm font-bold text-white transition-all hover:bg-[#D47B1F] hover:shadow-md"
              >
                購入手続きへ進む
              </button>

              <button
                type="button"
                onClick={clearCart}
                className="mt-2 w-full rounded-xl border border-[#DECCB5] bg-white py-2.5 text-xs font-semibold text-[#7A6A5A] transition-all hover:border-red-300 hover:text-red-500"
              >
                カートを空にする
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
