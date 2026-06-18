import { type Product, type Style, type SubCategory } from '@/lib/products';

export const ROOM_DIMENSIONS_CM = {
  width: 255,
  depth: 340,
} as const;

export type TasteAnswers = {
  mood?: string;
  budget?: string;
  priority?: string;
};

export type RoomProfile = {
  roomType: string;
  sizeLabel: string;
  shape: string;
  windowDirection: string;
  area: number;
  notes?: string;
};

export type PlacementSource = 'manual' | 'recommended';

export type PlacedProduct = {
  instanceId: string;
  productId: string;
  x: number;
  y: number;
  rotation: 0 | 90;
  source: PlacementSource;
  recommendationKey?: string;
};

export type RecommendationEntry = {
  key: string;
  productId: string;
  included: boolean;
  subCategory: SubCategory;
  reason: string;
};

export const SUBCATEGORY_LABELS: Record<SubCategory, string> = {
  sofa: 'ソファ',
  bed: 'ベッド',
  desk: 'デスク',
  chair: 'チェア',
  dining_table: 'ダイニングテーブル',
  shelf: 'シェルフ',
  wardrobe: 'ワードローブ',
  tv_stand: 'TVスタンド',
  refrigerator: '冷蔵庫',
  tv: 'テレビ',
  microwave: '電子レンジ',
  washing_machine: '洗濯機',
  air_conditioner: 'エアコン',
  vacuum: '掃除機',
  rice_cooker: '炊飯器',
  kettle: 'ケトル',
};

const STYLE_BY_MOOD: Record<string, Style> = {
  ナチュラル: 'natural',
  モダン: 'modern',
  ミニマル: 'minimal',
  コージー: 'cozy',
  インダストリアル: 'industrial',
};

const PRIORITY_TO_SUBCATEGORY: Record<string, SubCategory | null> = {
  ベッド: 'bed',
  ソファ: 'sofa',
  机: 'desk',
  こだわりなし: null,
};

const BASE_SUBCATEGORIES_BY_BUDGET: Record<string, SubCategory[]> = {
  low: ['bed', 'refrigerator', 'washing_machine', 'microwave', 'desk', 'chair', 'tv'],
  mid: ['bed', 'refrigerator', 'washing_machine', 'microwave', 'desk', 'chair', 'tv', 'vacuum'],
  high: ['bed', 'refrigerator', 'washing_machine', 'microwave', 'desk', 'chair', 'tv', 'vacuum', 'air_conditioner'],
  premium: ['bed', 'refrigerator', 'washing_machine', 'microwave', 'desk', 'chair', 'tv', 'vacuum', 'air_conditioner', 'rice_cooker'],
};

function getBudgetTier(budget?: string): keyof typeof BASE_SUBCATEGORIES_BY_BUDGET {
  if (budget === '〜10万') return 'low';
  if (budget === '10〜20万') return 'mid';
  if (budget === '20〜30万') return 'high';
  return 'premium';
}

function getPreferredStyle(mood?: string): Style | null {
  return mood ? STYLE_BY_MOOD[mood] ?? null : null;
}

function getPrioritySubCategory(priority?: string): SubCategory | null {
  return priority ? PRIORITY_TO_SUBCATEGORY[priority] ?? null : null;
}

function scoreProduct(product: Product, answers: TasteAnswers): number {
  const preferredStyle = getPreferredStyle(answers.mood);
  const prioritySubCategory = getPrioritySubCategory(answers.priority);
  const budgetTier = getBudgetTier(answers.budget);

  let score = 100;

  if (preferredStyle && product.style.includes(preferredStyle)) {
    score += 45;
  }

  if (prioritySubCategory && product.subCategory === prioritySubCategory) {
    score += 55;
  }

  if (product.essentialForSingle) {
    score += 18;
  }

  if (product.condition === 'new') {
    score += 10;
  }

  if (budgetTier === 'low') {
    score -= product.price / 1800;
  } else if (budgetTier === 'mid') {
    score -= product.price / 3500;
  } else if (budgetTier === 'high') {
    score -= product.price / 6000;
  } else {
    score -= product.price / 11000;
  }

  return score;
}

export function buildFallbackRecommendationIds(allProducts: Product[], answers: TasteAnswers): string[] {
  const prioritySubCategory = getPrioritySubCategory(answers.priority);
  const budgetTier = getBudgetTier(answers.budget);
  const desiredSubCategories = [...BASE_SUBCATEGORIES_BY_BUDGET[budgetTier]];

  if (prioritySubCategory && !desiredSubCategories.includes(prioritySubCategory)) {
    desiredSubCategories.unshift(prioritySubCategory);
  }

  if (budgetTier !== 'low' && !desiredSubCategories.includes('sofa')) {
    desiredSubCategories.push('sofa');
  }

  const ids: string[] = [];
  const used = new Set<SubCategory>();

  for (const subCategory of desiredSubCategories) {
    if (used.has(subCategory)) {
      continue;
    }

    const candidate = [...allProducts]
      .filter((product) => product.subCategory === subCategory)
      .sort((left, right) => scoreProduct(right, answers) - scoreProduct(left, answers))[0];

    if (!candidate) {
      continue;
    }

    used.add(subCategory);
    ids.push(candidate.id);

    if (ids.length >= 10) {
      break;
    }
  }

  return ids.slice(0, 10);
}

export function getAlternativeProducts(
  allProducts: Product[],
  subCategory: SubCategory,
  currentProductId: string,
  answers: TasteAnswers,
  limit = 3,
): Product[] {
  return [...allProducts]
    .filter((product) => product.subCategory === subCategory && product.id !== currentProductId)
    .sort((left, right) => scoreProduct(right, answers) - scoreProduct(left, answers))
    .slice(0, limit);
}

export function getRecommendationReason(subCategory: SubCategory, answers: TasteAnswers): string {
  const preferredStyle = answers.mood ?? 'ナチュラル';

  switch (subCategory) {
    case 'bed':
      return '睡眠環境を最優先にしつつ、部屋の主役になるベッドを選定しました。';
    case 'sofa':
      return `${preferredStyle}寄りの雰囲気を作りやすいソファを候補にしています。`;
    case 'desk':
      return '一人暮らしの作業・食事の両方に使いやすいデスクを優先しました。';
    case 'chair':
      return '机と合わせて使いやすい、圧迫感の少ないチェアを選んでいます。';
    case 'refrigerator':
      return '単身生活で必須の家電として、容量と設置しやすさのバランスを重視しました。';
    case 'washing_machine':
      return '省スペースでも導入しやすい洗濯機を軸にしています。';
    case 'microwave':
      return '自炊にも外食中心にも相性がよい電子レンジを入れています。';
    case 'tv':
      return 'サイズ感を抑えつつ、くつろぎの時間を作れるテレビを候補にしました。';
    case 'vacuum':
      return 'ワンルームでも扱いやすい掃除機を加えています。';
    case 'air_conditioner':
      return '快適性を高めるため、部屋サイズに合うエアコンを追加しました。';
    case 'rice_cooker':
      return '自炊派に寄せて、生活満足度の高い炊飯器を選んでいます。';
    default:
      return '一人暮らしの導線と部屋の雰囲気を崩しにくいアイテムを選びました。';
  }
}

export function getFootprintSize(product: Product, rotation: 0 | 90) {
  return rotation === 90
    ? { width: product.size.depth, depth: product.size.width }
    : { width: product.size.width, depth: product.size.depth };
}

export function clampToRoom(product: Product, x: number, y: number, rotation: 0 | 90) {
  const footprint = getFootprintSize(product, rotation);

  return {
    x: Math.max(0, Math.min(ROOM_DIMENSIONS_CM.width - footprint.width, Number(x.toFixed(1)))),
    y: Math.max(0, Math.min(ROOM_DIMENSIONS_CM.depth - footprint.depth, Number(y.toFixed(1)))),
  };
}
