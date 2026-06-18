import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { Product } from '@/lib/products';
import { enrichProduct } from '@/lib/productAttributes';

type Props = { product: Product };

/** 価格を ¥XX,XXX 形式にフォーマット */
function formatPrice(price: number): string {
  return '¥' + price.toLocaleString('ja-JP');
}

export default function ProductCard({ product }: Props) {
  const enriched = enrichProduct(product);
  const { id, name, price, condition, imageUrl, size, subCategory, icon, rating, atmosphere, texture } = enriched;

  return (
    <Link
      href={`/products/${id}`}
      className="group kaguera-card flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-[#FFF5EB]">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
          onError={() => {/* Unsplash 取得失敗時は背景色のまま */}}
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-5xl select-none opacity-0 group-[&_img[data-error]]:opacity-100 pointer-events-none"
          aria-hidden
        >
          {icon}
        </span>

        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${
            condition === 'new'
              ? 'bg-[#E8933A] text-white'
              : 'bg-white text-[#E8933A] border border-[#E8933A]'
          }`}
        >
          {condition === 'new' ? '新品' : '中古'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#E8933A] font-semibold uppercase tracking-wider">
            {subCategoryLabel(subCategory)}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#E8933A]">
            <Star size={11} className="fill-[#E0B83A] text-[#E0B83A]" />
            {rating?.toFixed(1)}
          </span>
        </div>

        <p className="text-sm font-bold text-[#1F160E] leading-snug line-clamp-2">
          {name}
        </p>

        <div className="flex flex-wrap gap-1">
          <span className="inline-block rounded-full bg-[#F5EFE4] px-2 py-0.5 text-[10px] text-[#E8933A]">
            {atmosphere}
          </span>
          <span className="inline-block rounded-full bg-[#F5EFE4] px-2 py-0.5 text-[10px] text-[#E8933A]">
            {texture}
          </span>
        </div>

        <p className="mt-0.5 text-base font-bold text-[#1F160E]">
          {formatPrice(price)}
          <span className="text-xs font-normal text-[#B09070] ml-1">（税込）</span>
        </p>

        <div className="mt-auto rounded-xl bg-[#FAF7F2] px-3 py-2 text-[11px] text-[#7A6A5A]">
          W{size.width} × D{size.depth} × H{size.height} cm
        </div>
      </div>
    </Link>
  );
}

/** サブカテゴリの日本語ラベル */
function subCategoryLabel(sub: Product['subCategory']): string {
  const map: Record<Product['subCategory'], string> = {
    sofa: 'ソファ',
    bed: 'ベッド',
    desk: 'デスク',
    chair: 'チェア',
    dining_table: 'ダイニング',
    shelf: 'シェルフ',
    wardrobe: 'ワードローブ',
    tv_stand: 'TVボード',
    refrigerator: '冷蔵庫',
    tv: 'テレビ',
    microwave: '電子レンジ',
    washing_machine: '洗濯機',
    air_conditioner: 'エアコン',
    vacuum: '掃除機',
    rice_cooker: '炊飯器',
    kettle: 'ケトル',
  };
  return map[sub] ?? sub;
}
