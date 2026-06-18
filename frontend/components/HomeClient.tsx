'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Category, SubCategory, Product } from '@/lib/products';
import ProductCard from './ProductCard';

// サブカテゴリ日本語マップ
const SUB_LABEL: Record<SubCategory, string> = {
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

const FURNITURE_SUBS: SubCategory[] = [
  'sofa', 'bed', 'desk', 'chair', 'dining_table', 'shelf', 'wardrobe', 'tv_stand',
];
const APPLIANCE_SUBS: SubCategory[] = [
  'refrigerator', 'tv', 'microwave', 'washing_machine',
  'air_conditioner', 'vacuum', 'rice_cooker', 'kettle',
];

type CategoryTab = 'all' | Category;

type Props = { products: Product[] };

export default function HomeClient({ products }: Props) {
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
  const [activeSub, setActiveSub] = useState<SubCategory | null>(null);

  const subCategories: SubCategory[] =
    activeCategory === 'furniture'
      ? FURNITURE_SUBS
      : activeCategory === 'appliance'
      ? APPLIANCE_SUBS
      : [];

  // カテゴリ or サブカテゴリが変わったらサブをリセット
  function handleCategoryChange(cat: CategoryTab) {
    setActiveCategory(cat);
    setActiveSub(null);
  }

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (activeSub) {
      list = list.filter((p) => p.subCategory === activeSub);
    }
    return list;
  }, [products, activeCategory, activeSub]);

  const categoryTabs: { id: CategoryTab; label: string }[] = [
    { id: 'all', label: 'すべて' },
    { id: 'furniture', label: '家具' },
    { id: 'appliance', label: '家電' },
  ];

  return (
    <section className="kaguera-shell py-10 sm:py-12">
      <div className="kaguera-card-soft p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="kaguera-section-title">おすすめアイテム</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#7A6A5A]">
              家具・家電をカテゴリ別に見比べながら、部屋に合いそうな候補を探せます。
            </p>
          </div>
          <span className="kaguera-chip w-fit border border-[#E3D5C6] bg-white text-[#E8933A] shadow-sm">
            {filtered.length} 件表示中
          </span>
        </div>

        <div className="relative mt-6">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#B09070]"
          />
          <input
            type="search"
            placeholder="家具・家電を検索..."
            readOnly
            className="kaguera-input cursor-default pl-11 pr-4"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {categoryTabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleCategoryChange(id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                activeCategory === id
                  ? 'bg-[#E8933A] text-white shadow-sm'
                  : 'border border-[#D8D0C8] bg-white text-[#3D3020] hover:-translate-y-0.5 hover:border-[#E8933A] hover:text-[#E8933A] hover:shadow-sm'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {subCategories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSub(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeSub === null
                  ? 'bg-[#1F160E] text-white'
                  : 'border border-[#D8D0C8] bg-white text-[#3D3020] hover:-translate-y-0.5 hover:border-[#1F160E] hover:shadow-sm'
              }`}
            >
              すべて
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSub(sub)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeSub === sub
                    ? 'bg-[#1F160E] text-white'
                    : 'border border-[#D8D0C8] bg-white text-[#3D3020] hover:-translate-y-0.5 hover:border-[#1F160E] hover:shadow-sm'
                }`}
              >
                {SUB_LABEL[sub]}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="kaguera-card mt-8 flex flex-col items-center justify-center py-24 text-[#B09070]">
          <span className="mb-4 text-5xl">🪑</span>
          <p className="text-sm">該当する商品が見つかりませんでした</p>
        </div>
      )}
    </section>
  );
}
