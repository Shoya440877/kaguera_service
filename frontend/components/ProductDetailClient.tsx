'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, ShoppingCart, Heart, MapPin, ExternalLink, Star } from 'lucide-react';
import type { Product } from '@/lib/products';
import { enrichProduct } from '@/lib/productAttributes';
import { useCart } from '@/lib/cart';
import { useFavorites } from '@/lib/favorites';

type Props = { product: Product };

function formatPrice(price: number) {
  return '¥' + price.toLocaleString('ja-JP');
}

const SUB_LABEL: Record<string, string> = {
  sofa: 'ソファ', bed: 'ベッド', desk: 'デスク', chair: 'チェア',
  dining_table: 'ダイニング', shelf: 'シェルフ', wardrobe: 'ワードローブ',
  tv_stand: 'TVボード', refrigerator: '冷蔵庫', tv: 'テレビ',
  microwave: '電子レンジ', washing_machine: '洗濯機', air_conditioner: 'エアコン',
  vacuum: '掃除機', rice_cooker: '炊飯器', kettle: 'ケトル',
};

const STYLE_LABEL: Record<string, string> = {
  modern: 'モダン', natural: 'ナチュラル', minimal: 'ミニマル',
  cozy: 'コージー', industrial: 'インダストリアル',
};

export default function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const { addItem, hasItem } = useCart();
  const favorites = useFavorites();
  const [showQR, setShowQR] = useState(false);
  const [host, setHost] = useState('');

  // クライアント側でホスト名を取得（SSR/静的生成と衝突しない）
  useEffect(() => {
    setHost(window.location.origin);
  }, []);

  const enriched = enrichProduct(product);
  const { id, name, price, condition, size, shopName, description, style, subCategory, color, rating, texture, atmosphere } = enriched;

  const arUrl = host ? `${host}/ar/${id}` : '';
  const webArUrl = `/ar/${id}`;

  return (
    <div className="kaguera-card flex flex-col gap-5 p-6 sm:p-7">
      <div>
        <p className="text-xs font-semibold text-[#E8933A] uppercase tracking-wider mb-1">
          {SUB_LABEL[subCategory] ?? subCategory}
        </p>
        <h1 className="text-2xl font-bold text-[#1F160E] leading-tight">{name}</h1>
        <p className="text-sm text-[#B09070] mt-1">{shopName}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-[#1F160E]">{formatPrice(price)}</span>
        <span className="text-xs text-[#B09070]">（税込）</span>
        <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold ${
          condition === 'new'
            ? 'bg-[#E8933A] text-white'
            : 'bg-white border border-[#E8933A] text-[#E8933A]'
        }`}>
          {condition === 'new' ? '新品' : '中古'}
        </span>
      </div>

      {/* 評価 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = rating! >= n - 0.25;
            const half = !filled && rating! >= n - 0.75;
            return (
              <Star
                key={n}
                size={16}
                className={
                  filled
                    ? 'fill-[#E0B83A] text-[#E0B83A]'
                    : half
                      ? 'fill-[#E0B83A]/50 text-[#E0B83A]'
                      : 'text-[#D8CFC2]'
                }
              />
            );
          })}
        </div>
        <span className="text-sm font-bold text-[#1F160E]">{rating!.toFixed(1)}</span>
        <span className="text-xs text-[#B09070]">/ 5.0</span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#F0DFC8] bg-[#FAF6F2] px-4 py-3 text-sm text-[#3D3020]">
        <span className="font-semibold text-[#E8933A] shrink-0">サイズ</span>
        <span>幅 {size.width}cm × 奥行 {size.depth}cm × 高さ {size.height}cm</span>
      </div>

      <p className="text-sm text-[#3D3020] leading-relaxed">{description}</p>

      <div className="bg-white border border-[#F0DFC8] rounded-xl overflow-hidden text-sm">
        {([
          ['カラー', (
            <span key="c" className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full border border-[#DDD] shrink-0" style={{ background: color }} />
              {color}
            </span>
          )],
          ['スタイル', style.map((s) => STYLE_LABEL[s] ?? s).join(' · ')],
          ['質感', texture],
          ['雰囲気', atmosphere],
          ['販売元', shopName],
        ] as [string, React.ReactNode][]).map(([label, value]) => (
          <div key={label as string} className="flex border-b border-[#F0DFC8] last:border-b-0">
            <span className="w-24 shrink-0 px-4 py-2.5 bg-[#FAF6F2] text-[#E8933A] font-semibold">{label}</span>
            <span className="px-4 py-2.5 text-[#1F160E]">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <button
          onClick={() => setShowQR(true)}
          className="kaguera-button-primary w-full py-3.5"
        >
          <Smartphone size={18} />
          ARで見る
        </button>

        <a
          href={webArUrl}
          className="kaguera-button-neutral w-full"
        >
          <ExternalLink size={15} />
          Web版で見る（テスト用・AR機能なし）
        </a>

        <button
          onClick={() => router.push('/mypage')}
          className="kaguera-button-secondary w-full"
        >
          <MapPin size={16} />
          自分の部屋に追加
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { addItem(id); router.push('/cart'); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1F160E] px-4 py-3 text-sm font-bold text-white transition-all hover:scale-[1.01] hover:bg-[#3C3C3C] hover:shadow-md"
          >
            <ShoppingCart size={16} />
            {hasItem(id) ? 'カートを見る' : 'カートに入れる'}
          </button>
          <button
            type="button"
            onClick={() => { favorites.add(id); router.push('/favorites'); }}
            aria-label="お気に入りに追加"
            aria-pressed={favorites.has(id)}
            className="kaguera-button-neutral w-12 px-0"
          >
            <Heart size={18} className={favorites.has(id) ? 'fill-[#E8933A] text-[#E8933A]' : 'text-[#B09070]'} />
          </button>
        </div>
      </div>

      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQR(false); }}
        >
          <div className="kaguera-card relative flex w-full max-w-sm flex-col items-center gap-5 p-6">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#F0EBE3] transition-colors text-[#B09070]"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <p className="text-base font-bold text-[#1F160E]">スマホで読み取ってAR表示</p>
              <p className="text-xs text-[#B09070] mt-1">
                Android: Chrome で読み取り → WebAR 起動<br />
                iPhone: Safari で読み取り → AR Quick Look 起動
              </p>
            </div>

            <div className="p-4 bg-[#FAFAF7] rounded-xl border border-[#F0DFC8]">
              {arUrl ? (
                <QRCodeSVG
                  value={arUrl}
                  size={200}
                  bgColor="#FAFAF7"
                  fgColor="#1F160E"
                  level="M"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-[#B09070] text-sm">
                  読み込み中...
                </div>
              )}
            </div>

            {arUrl && (
              <p className="text-xs text-[#B09070] break-all text-center">{arUrl}</p>
            )}

            <div className="flex items-center gap-2 bg-[#FAF6F2] rounded-lg px-4 py-2 text-xs text-[#E8933A] border border-[#F0DFC8] w-full justify-center">
              <Smartphone size={13} />
              {name} をARで確認
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
