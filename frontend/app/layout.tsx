import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import { CartProvider } from '@/lib/cart';
import { AuthProvider } from '@/lib/auth';
import { FavoritesProvider } from '@/lib/favorites';

export const metadata: Metadata = {
  title: 'カグエラ (KAGUERA) — 一人暮らし応援EC',
  description:
    '間取り画像をアップロードするだけで、AIがあなたの部屋にぴったりの家具・家電を提案。ARで実空間に置いて確認できる一人暮らし応援EC。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <Header />
              <div className="flex-1">{children}</div>
              <Footer />
              <AuthModal />
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
