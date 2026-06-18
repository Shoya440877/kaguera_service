import { notFound, redirect } from 'next/navigation';
import { buildArRedirectUrl } from '@/lib/ar';
import { getProductById } from '@/lib/products';

type Props = {
  params: {
    id: string;
  };
};

export default function ArProductPage({ params }: Props) {
  const product = getProductById(params.id);

  if (!product) {
    notFound();
  }

  redirect(buildArRedirectUrl(product));
}
