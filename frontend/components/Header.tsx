'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Home, LayoutDashboard, ShoppingCart, Heart, LogIn, LogOut } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useFavorites } from '@/lib/favorites';
import { useAuth } from '@/lib/auth';

export default function Header() {
  const { totalItems } = useCart();
  const { totalItems: favoritesCount } = useFavorites();
  const { user, logout, openAuthModal } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[#F0DFC8] bg-[rgba(255,245,235,0.88)] backdrop-blur-xl">
      <div className="kaguera-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/icon.png"
            alt="KAGUERA"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div className="flex flex-col leading-none">
            <span className="text-[11px] tracking-[0.18em] text-[#E8933A] font-bold uppercase">
              KAGUERA
            </span>
            <span className="text-[18px] font-bold tracking-tight text-[#1F160E] group-hover:text-[#E8933A] transition-colors">
              カグエラ
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            aria-label="ホーム"
            className="rounded-full p-2.5 text-[#1F160E] transition-all hover:bg-white hover:text-[#E8933A] hover:shadow-sm"
          >
            <Home size={20} strokeWidth={1.8} />
          </Link>
          <Link
            href="/mypage"
            aria-label="マイページ"
            className="rounded-full p-2.5 text-[#1F160E] transition-all hover:bg-white hover:text-[#E8933A] hover:shadow-sm"
          >
            <LayoutDashboard size={20} strokeWidth={1.8} />
          </Link>
          <Link
            href="/favorites"
            aria-label="お気に入り"
            className="relative rounded-full p-2.5 text-[#1F160E] transition-all hover:bg-white hover:text-[#E8933A] hover:shadow-sm"
          >
            <Heart size={20} strokeWidth={1.8} />
            {favoritesCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E8933A] px-1 text-[10px] font-bold text-white">
                {favoritesCount}
              </span>
            )}
          </Link>
          <Link
            href="/cart"
            aria-label="カート"
            className="relative rounded-full p-2.5 text-[#1F160E] transition-all hover:bg-white hover:text-[#E8933A] hover:shadow-sm"
          >
            <ShoppingCart size={20} strokeWidth={1.8} />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E8933A] px-1 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          <div className="w-px h-4 bg-[#F0DFC8] mx-0.5" />

          {user ? (
            <div className="flex items-center gap-1">
              <span className="hidden sm:inline text-xs font-semibold text-[#E8933A] max-w-[80px] truncate">
                {user.name}
              </span>
              <button
                type="button"
                onClick={logout}
                aria-label="ログアウト"
                className="rounded-full p-2.5 text-[#1F160E] transition-all hover:bg-white hover:text-[#E8933A] hover:shadow-sm"
              >
                <LogOut size={20} strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              aria-label="ログイン"
              className="rounded-full p-2.5 text-[#1F160E] transition-all hover:bg-white hover:text-[#E8933A] hover:shadow-sm"
            >
              <LogIn size={20} strokeWidth={1.8} />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
