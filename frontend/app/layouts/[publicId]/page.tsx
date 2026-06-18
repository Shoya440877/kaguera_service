import { notFound } from 'next/navigation';
import LayoutRestoreView from '@/components/LayoutRestoreView';
import { loadLayout } from '@/lib/layoutApi';

// 共有レイアウトはリクエスト毎に最新を取得する（ビルド時に静的生成しない）。
export const dynamic = 'force-dynamic';

type Props = {
  params: { publicId: string };
};

export default async function SharedLayoutPage({ params }: Props) {
  const layout = await loadLayout(params.publicId).catch(() => null);

  if (!layout) {
    notFound();
  }

  return <LayoutRestoreView layout={layout} />;
}
