import { notFound } from 'next/navigation';
import ArViewer from '@/components/ArViewer';
import { getProductById } from '@/lib/products';

type Props = {
  params: { id: string };
};

export default function ArProductPage({ params }: Props) {
  const product = getProductById(params.id);

  if (!product) {
    notFound();
  }

  return <ArViewer product={product} />;
}
