'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ArrowLeft, Trash2, ShoppingCart } from 'lucide-react';
import { useFavorites } from '@/lib/favorites';
import { useCart } from '@/lib/cart';
import { getProductById } from '@/lib/products';

function formatPrice(price: number) {
  return `¥${price.toLocaleString('ja-JP')}`;
}

export default function FavoritesPage() {
  const { ids, remove } = useFavorites();
  const { addItem, hasItem } = useCart();

  const products = ids
    .map((id) => getProductById(id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <main className="kaguera-shell py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#E8933A] hover:underline"
        >
          <ArrowLeft size={14} />
          トップに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[#1F160E]">お気に入り</h1>
      <p className="mt-1 text-sm text-[#7A6A5A]">
        {products.length === 0
          ? 'お気に入りはまだありません。'
          : `${products.length} 点のお気に入り。`}
      </p>

      {products.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <Heart size={48} className="text-[#DECCB5]" />
          <p className="text-sm text-[#7A6A5A]">
            商品ページのハートを押すと、ここに追加されます。
          </p>
          <Link href="/#products" className="kaguera-button-primary mt-2">
            商品を見る
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#F0DFC8] bg-white shadow-sm"
            >
              <Link
                href={`/products/${product.id}`}
                className="relative block aspect-[4/3] bg-[#FFF5EB]"
              >
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Link
                  href={`/products/${product.id}`}
                  className="text-sm font-bold text-[#1F160E] transition-colors hover:text-[#E8933A]"
                >
                  {product.name}
                </Link>
                <p className="text-sm text-[#7A6A5A]">{formatPrice(product.price)}</p>

                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => addItem(product.id)}
                    disabled={hasItem(product.id)}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                      hasItem(product.id)
                        ? 'bg-[#E8F5E9] text-[#2A7A50] cursor-default'
                        : 'bg-[#1F160E] text-white hover:bg-[#3C3C3C]'
                    }`}
                  >
                    <ShoppingCart size={13} />
                    {hasItem(product.id) ? '追加済み' : 'カートに入れる'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(product.id)}
                    aria-label="お気に入りから外す"
                    className="rounded-lg border border-[#DECCB5] bg-white px-2.5 text-[#B09070] transition-colors hover:border-red-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
