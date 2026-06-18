import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-[#F0DFC8] bg-[#1F160E] text-[#CCBBAA]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/icon.png"
                alt="KAGUERA"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] tracking-[0.18em] text-[#E8933A] font-bold uppercase">
                  KAGUERA
                </span>
                <span className="text-base font-bold text-white">
                  カグエラ
                </span>
              </div>
            </Link>
            <p className="text-xs leading-relaxed text-[#9A8A7A]">
              気づいたら、いい暮らし。
              <br />
              AIとARで、一人暮らしの家具選びをもっと簡単に。
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#E8933A]">
              サービス
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>
                <Link href="/mypage#room-planner" className="transition-colors hover:text-white">
                  AIおまかせ配置
                </Link>
              </li>
              <li>
                <Link href="/onboarding.html" className="transition-colors hover:text-white">
                  AR試し置き
                </Link>
              </li>
              <li>
                <Link href="/mypage" className="transition-colors hover:text-white">
                  マイページ
                </Link>
              </li>
              <li>
                <Link href="/cart" className="transition-colors hover:text-white">
                  カート
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#E8933A]">
              カテゴリ
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>
                <Link href="/#products" className="transition-colors hover:text-white">
                  ソファ・椅子
                </Link>
              </li>
              <li>
                <Link href="/#products" className="transition-colors hover:text-white">
                  ベッド・寝具
                </Link>
              </li>
              <li>
                <Link href="/#products" className="transition-colors hover:text-white">
                  デスク・収納
                </Link>
              </li>
              <li>
                <Link href="/#products" className="transition-colors hover:text-white">
                  家電
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#E8933A]">
              サポート
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>
                <span className="cursor-default">ご利用ガイド</span>
              </li>
              <li>
                <span className="cursor-default">よくある質問</span>
              </li>
              <li>
                <span className="cursor-default">お問い合わせ</span>
              </li>
              <li>
                <span className="cursor-default">利用規約</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-[#3D3020] py-6 text-xs text-[#7A6A5A] sm:flex-row sm:justify-between">
          <p>&copy; 2026 KAGUERA（カグエラ）All rights reserved.</p>
          <p>大学のチーム開発で制作したアプリを、個人で再設計・再実装したものです。</p>
        </div>
      </div>
    </footer>
  );
}
