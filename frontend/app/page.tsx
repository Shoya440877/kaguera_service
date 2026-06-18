import { products } from '@/lib/products';
import HomeClient from '@/components/HomeClient';

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[#F0DFC8]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(240,235,227,0.9)_0%,rgba(250,250,247,0.76)_55%,rgba(247,243,236,0.92)_100%)]" />
        <div className="absolute -left-16 top-10 h-52 w-52 rounded-full bg-[#E9D8BF]/45 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#F4E8D7]/80 blur-3xl" />
        <div className="kaguera-shell relative py-16 text-center sm:py-24">
          <p className="text-xs font-bold tracking-[0.22em] text-[#E8933A] uppercase mb-4">
            KAGUERA — 一人暮らしのためのAR家具EC
          </p>
          <h1 className="mb-5 text-3xl font-bold leading-tight text-[#1F160E] sm:text-5xl">
            あなたの部屋にぴったりの家具を、
            <br className="hidden sm:block" />
            AIが選ぶ。
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-[#6A5A4A] sm:text-base">
            間取り画像をアップロードするだけで、AIがあなたの部屋にぴったりの家具・家電を提案。
            ARで実際の空間に置いて確認できます。
          </p>

          <div className="flex flex-col items-center gap-3">
            <a
              href="/mypage#room-planner"
              className="kaguera-button-primary rounded-full px-8 py-3.5 text-base"
            >
              🤖 AIおまかせ配置
            </a>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <a
                href="/onboarding.html"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#F0DFC8] bg-white px-4 py-2 text-xs font-semibold text-[#7A6A5A] shadow-sm transition-all hover:border-[#E8933A] hover:text-[#E8933A]"
              >
                📱 ARで試し置き
              </a>
              <a
                href="#products"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#F0DFC8] bg-white px-4 py-2 text-xs font-semibold text-[#7A6A5A] shadow-sm transition-all hover:border-[#E8933A] hover:text-[#E8933A]"
              >
                商品を見る →
              </a>
            </div>
          </div>
        </div>
      </section>

      <div id="products">
        <HomeClient products={products} />
      </div>
    </main>
  );
}
