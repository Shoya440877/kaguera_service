'use client';

import { createElement, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Ruler, Box } from 'lucide-react';
import type { Product } from '@/lib/products';
import { buildArRedirectUrl, getArModel } from '@/lib/ar';

// Google <model-viewer>: Android(Scene Viewer/WebXR) と iOS(Quick Look) を1要素で両対応。
const MODEL_VIEWER_SRC = 'https://unpkg.com/@google/model-viewer@4/dist/model-viewer.min.js';

export default function ArViewer({ product }: { product: Product }) {
  const model = getArModel(product);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    // model-viewer をクライアントで一度だけ読み込む（カスタム要素を登録）
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = MODEL_VIEWER_SRC;
      document.head.appendChild(script);
    }
  }, []);

  const pageUrl = origin ? `${origin}/ar/${product.id}` : '';
  // 寸法どおりの箱で確認できる WebXR 版（Android / Chrome）
  const webXrUrl = buildArRedirectUrl(product);

  // createElement で描画し、カスタム要素の JSX 型付けを回避する。
  // 真偽属性は「存在」で有効になるため空文字を渡す。
  const modelViewer = createElement('model-viewer', {
    src: `/models/${model}.glb`,
    'ios-src': `/models/${model}.usdz`,
    poster: product.imageUrl,
    alt: product.name,
    ar: '',
    'ar-modes': 'webxr scene-viewer quick-look',
    'camera-controls': '',
    'auto-rotate': '',
    'shadow-intensity': '1',
    exposure: '0.9',
    style: { width: '100%', height: '440px', backgroundColor: '#FAF6F2' },
  });

  return (
    <main className="kaguera-shell py-8">
      <div className="mb-6">
        <Link
          href={`/products/${product.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#E8933A] hover:underline"
        >
          <ArrowLeft size={14} />
          商品ページに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-[#1F160E]">{product.name} を AR で見る</h1>
      <p className="mt-1 text-sm text-[#7A6A5A]">
        スマホで開くと、カメラを通して実空間に置いて確認できます（Android: Chrome / iPhone: Safari）。
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-2xl border border-[#F0DFC8] bg-[#FAF6F2]">
          {modelViewer}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#F0DFC8] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1F160E]">
              <Ruler size={16} className="text-[#E8933A]" />
              実サイズ
            </div>
            <p className="mt-2 text-sm text-[#1F160E]">
              幅 {product.size.width} × 奥行 {product.size.depth} × 高さ {product.size.height} cm
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#7A6A5A]">
              ※ 3Dモデルは形状の目安です。設置スペースは上記の実寸を基準にしてください。
            </p>
          </div>

          {pageUrl && (
            <div className="rounded-2xl border border-[#F0DFC8] bg-[#FFF8F0] p-5 text-center">
              <p className="text-sm font-bold text-[#1F160E]">スマホで開く</p>
              <div className="mt-3 flex justify-center rounded-xl bg-white p-3">
                <QRCodeSVG value={pageUrl} size={140} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#7A6A5A]">
                QR を読み取り、「ARで見る」をタップ
              </p>
            </div>
          )}

          <a href={webXrUrl} className="kaguera-button-secondary justify-center">
            <Box size={16} />
            実寸の箱でAR（Android・WebXR）
          </a>
        </div>
      </div>
    </main>
  );
}
