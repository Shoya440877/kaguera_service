'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { getProductById } from '@/lib/products';

function formatPrice(price: number) {
  return `¥${price.toLocaleString('ja-JP')}`;
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'tel' | 'text';
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-[#7A6A5A]">{label}</span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        inputMode={inputMode}
        className="rounded-xl border border-[#DECCB5] bg-white px-3 py-2.5 text-sm text-[#1F160E] outline-none transition-colors placeholder:text-[#C9BBA9] focus:border-[#E8933A]"
      />
    </label>
  );
}

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState('');

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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // ※ポートフォリオ用デモ: 実際の決済は行わない。注文番号を発番して完了画面を出すだけ。
    setOrderId(`KGR-${Date.now().toString().slice(-8)}`);
    clearCart();
    setSubmitted(true);
    window.scrollTo({ top: 0 });
  }

  if (submitted) {
    return (
      <main className="kaguera-shell py-12">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <CheckCircle size={56} className="text-[#44AA77]" />
          <h1 className="text-2xl font-bold text-[#1F160E]">ご注文ありがとうございました</h1>
          <p className="text-sm text-[#7A6A5A]">
            注文番号: <span className="font-bold text-[#1F160E]">{orderId}</span>
          </p>
          <p className="rounded-xl border border-[#F0DFC8] bg-[#FAF6F2] px-4 py-3 text-xs text-[#7A6A5A]">
            ※これはポートフォリオ用のデモです。実際の決済・配送は行われません。
          </p>
          <div className="mt-2 flex gap-3">
            <Link href="/" className="kaguera-button-primary">トップへ戻る</Link>
            <Link href="/mypage" className="kaguera-button-secondary">マイページへ</Link>
          </div>
        </div>
      </main>
    );
  }

  if (cartProducts.length === 0) {
    return (
      <main className="kaguera-shell py-12">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-bold text-[#1F160E]">カートが空です</h1>
          <p className="text-sm text-[#7A6A5A]">購入手続きに進む商品がありません。</p>
          <Link href="/#products" className="kaguera-button-primary mt-2">商品を見る</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="kaguera-shell py-8">
      <div className="mb-6">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-sm text-[#E8933A] hover:underline"
        >
          <ArrowLeft size={14} />
          カートに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[#1F160E]">購入手続き</h1>

      <div className="mb-6 mt-2 inline-flex items-center gap-2 rounded-lg border border-[#F0DFC8] bg-[#FAF6F2] px-3 py-2 text-xs text-[#7A6A5A]">
        <ShieldCheck size={14} className="text-[#E8933A]" />
        ポートフォリオ用のデモです。実際の決済は行われません。
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section className="kaguera-card flex flex-col gap-4 p-6">
            <h2 className="text-base font-bold text-[#1F160E]">配送先</h2>
            <Field label="お名前" name="name" placeholder="家具 太郎" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="郵便番号" name="postalCode" placeholder="100-0001" inputMode="numeric" />
              <Field label="電話番号" name="phone" type="tel" placeholder="090-1234-5678" inputMode="tel" />
            </div>
            <Field label="住所" name="address" placeholder="東京都千代田区..." />
          </section>

          <section className="kaguera-card flex flex-col gap-4 p-6">
            <h2 className="text-base font-bold text-[#1F160E]">お支払い情報（デモ）</h2>
            <Field label="カード番号" name="cardNumber" placeholder="4242 4242 4242 4242" inputMode="numeric" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="有効期限 (MM/YY)" name="expiry" placeholder="12/29" />
              <Field label="セキュリティコード" name="cvc" placeholder="123" inputMode="numeric" />
            </div>
            <Field label="カード名義" name="cardName" placeholder="KAGU TARO" />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#F0DFC8] bg-[#FFF8F0] p-5">
            <h2 className="text-base font-bold text-[#1F160E]">注文サマリー</h2>
            <div className="mt-4 flex flex-col gap-2">
              {cartProducts.map((entry) => (
                <div key={entry.productId} className="flex items-center justify-between text-sm">
                  <span className="truncate text-[#7A6A5A]">{entry.product.name}</span>
                  <span className="ml-2 shrink-0 font-semibold text-[#1F160E]">
                    {formatPrice(entry.product.price)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#F0DFC8] pt-4">
              <span className="font-bold text-[#1F160E]">合計</span>
              <span className="text-lg font-bold text-[#E8933A]">{formatPrice(totalPrice)}</span>
            </div>
            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-[#E8933A] py-3 text-sm font-bold text-white transition-all hover:bg-[#D47B1F] hover:shadow-md"
            >
              注文を確定する
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
