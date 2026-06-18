import { NextRequest, NextResponse } from 'next/server';
import { extractJsonObject, extractTextFromClaudeContent, getAnthropicClient } from '@/lib/anthropic';
import { buildFallbackRecommendationIds } from '@/lib/kaguera';
import { products, type Product } from '@/lib/products';

export const runtime = 'nodejs';

type RecommendRequest = {
  roomInfo?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
  allProducts?: Product[];
};

type RecommendResponse = {
  recommendedProductIds: string[];
};

function sanitizeProductForPrompt(product: Product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    subCategory: product.subCategory,
    price: product.price,
    condition: product.condition,
    size: product.size,
    shopName: product.shopName,
    style: product.style,
    essentialForSingle: product.essentialForSingle,
  };
}

function normalizeRecommendedIds(ids: string[], sourceProducts: Product[]) {
  const productsById = new Map(sourceProducts.map((product) => [product.id, product]));
  const unique: string[] = [];
  const usedSubCategories = new Set<string>();

  for (const id of ids) {
    const product = productsById.get(id);

    if (!product || unique.includes(id) || usedSubCategories.has(product.subCategory)) {
      continue;
    }

    unique.push(id);
    usedSubCategories.add(product.subCategory);

    if (unique.length >= 10) {
      break;
    }
  }

  return unique;
}

export async function POST(req: NextRequest) {
  let roomInfo: Record<string, unknown> | null = null;
  let preferences: Record<string, unknown> | null = null;
  let allProducts: Product[] = products;

  try {
    const body = await req.json() as RecommendRequest;
    roomInfo = body.roomInfo ?? null;
    preferences = body.preferences ?? null;
    allProducts = Array.isArray(body.allProducts) && body.allProducts.length > 0
      ? body.allProducts
      : products;
  } catch {
    roomInfo = null;
    preferences = null;
    allProducts = products;
  }

  const fallbackIds = buildFallbackRecommendationIds(allProducts, {
    mood: typeof preferences?.mood === 'string' ? preferences.mood : undefined,
    budget: typeof preferences?.budget === 'string' ? preferences.budget : undefined,
    priority: typeof preferences?.priority === 'string' ? preferences.priority : undefined,
  });

  try {
    const client = await getAnthropicClient();

    if (!client) {
      return NextResponse.json({ ok: true, recommendedProductIds: fallbackIds, fallback: true });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'あなたは一人暮らし向けの家具家電コーディネーターです。',
                '部屋情報と好みをもとに、7〜10点の家具家電セットを選んでください。',
                '一人暮らしに必要な家具家電を優先し、各サブカテゴリで重複しすぎないようにしてください。',
                '必ず以下の JSON オブジェクトのみで返答してください。',
                '{"recommendedProductIds":["bed-001","refrigerator-001"]}',
                `部屋情報: ${JSON.stringify(roomInfo ?? {}, null, 2)}`,
                `好み: ${JSON.stringify(preferences ?? {}, null, 2)}`,
                `商品一覧: ${JSON.stringify(allProducts.map(sanitizeProductForPrompt), null, 2)}`,
              ].join('\n\n'),
            },
          ],
        },
      ],
    });

    const text = extractTextFromClaudeContent(message.content);
    const parsed = extractJsonObject<Partial<RecommendResponse>>(text);
    const ids = Array.isArray(parsed?.recommendedProductIds)
      ? parsed.recommendedProductIds.filter((value): value is string => typeof value === 'string')
      : [];
    const normalized = normalizeRecommendedIds(ids, allProducts);

    if (normalized.length < 7) {
      throw new Error('Insufficient recommended IDs from Claude');
    }

    return NextResponse.json({ ok: true, recommendedProductIds: normalized, fallback: false });
  } catch (error) {
    console.error('[recommend] error:', error);
    return NextResponse.json({ ok: true, recommendedProductIds: fallbackIds, fallback: true });
  }
}
