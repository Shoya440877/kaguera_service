import { getProductById, products } from '@/lib/products';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProductDetailClient from '@/components/ProductDetailClient';

type Props = { params: { id: string } };

// 静的生成（headers() を使わないのでOK）
export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props) {
  const product = getProductById(params.id);
  if (!product) return {};
  return {
    title: `${product.name} | カグエラ`,
    description: product.description,
  };
}

export default function ProductPage({ params }: Props) {
  const product = getProductById(params.id);
  if (!product) notFound();

  const { name, imageUrl, condition } = product;

  return (
    <main className="kaguera-shell py-8 sm:py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#E3D5C6] bg-white px-4 py-2 text-sm font-medium text-[#E8933A] transition-all hover:-translate-y-0.5 hover:shadow-sm"
      >
        <ArrowLeft size={15} />
        商品一覧に戻る
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div className="flex flex-col gap-3">
          <div className="kaguera-card relative aspect-square overflow-hidden bg-[#FFF5EB]">
            <Image
              src={imageUrl}
              alt={name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <span
              className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm ${
                condition === 'new'
                  ? 'bg-[#E8933A] text-white'
                  : 'bg-white border border-[#E8933A] text-[#E8933A]'
              }`}
            >
              {condition === 'new' ? '新品' : '中古'}
            </span>
          </div>
        </div>

        <ProductDetailClient product={product} />
      </div>
    </main>
  );
}
