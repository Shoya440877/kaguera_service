// Next.js App Router: 商品ページから寸法 (cm) を抽出する
//
// GET /api/fetch-dimensions?url=<商品ページのURL>
//   -> 200: { ok: true, name, w, d, h, source }
//      失敗: { ok: false, error }
//
// 取得方法:
//   1. 直接 fetch (JSON-LD 等の機械可読データを取れる)
//   2. 失敗時: Jina Reader (https://r.jina.ai) 経由でMarkdownとして取得
//      ※ Akamai 等のbot対策で直接アクセス不可なサイト (無印良品など) もこちらで通過
//
// 抽出優先順: JSON-LD Product → 日本語パターン (幅×奥行×高さ) → W×D×H パターン

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(req: NextRequest) {
  const url = (req.nextUrl.searchParams.get('url') ?? '').trim();

  if (!url) {
    return NextResponse.json({ ok: false, error: "url パラメータが必要です" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ ok: false, error: "URL の形式が不正です" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ ok: false, error: "http(s) のURLのみ対応" }, { status: 400 });
  }

  // 現在はニトリ商品ページのみサポート (Jina Reader 経由で SPA をJSレンダリングして取得)
  if (!/(^|\.)nitori-net\.jp$/i.test(parsed.hostname)) {
    return NextResponse.json({
      ok: false,
      error: "現在は nitori-net.jp の商品ページのみ対応しています",
    }, { status: 400 });
  }

  let body: string | null = null;
  let fetchedVia: string | null = null;
  const errors: string[] = [];

  // 取得戦略:
  //   - JINA_API_KEY がある場合: 常に Jina Reader を使う
  //     (ニトリのような SPA はサーバー HTML が空なので、JS レンダリング必須)
  //   - キーが無い場合: 直接 fetch を試す (Akamai 系は弾かれる)
  const hasJinaKey = !!process.env.JINA_API_KEY;

  if (hasJinaKey) {
    try {
      const jinaUrl = `https://r.jina.ai/${parsed.toString()}`;
      const upstream = await fetch(jinaUrl, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/plain, text/markdown, */*",
          "Accept-Language": "ja,en;q=0.8",
          Authorization: `Bearer ${process.env.JINA_API_KEY}`,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(25000),
      });
      if (upstream.ok) {
        body = await upstream.text();
        fetchedVia = "jina-auth";
      } else {
        errors.push(`jina: HTTP ${upstream.status}`);
      }
    } catch (e: unknown) {
      errors.push(`jina: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    try {
      const upstream = await fetch(parsed.toString(), {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      if (upstream.ok) {
        body = await upstream.text();
        fetchedVia = "direct";
      } else {
        errors.push(`direct: HTTP ${upstream.status}`);
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : null;
      const cause = err && 'cause' in err ? (err.cause as Error | null) : null;
      errors.push(`direct: ${err?.message ?? String(e)}${cause ? " / " + (cause.message || String(cause)) : ""}`);
    }
  }

  if (!body) {
    return NextResponse.json(
      { ok: false, error: `取得失敗: ${errors.join(" | ")}` },
      { status: 502 }
    );
  }

  const result = parseDimensions(body);
  if (!result) {
    return NextResponse.json(
      { ok: false, error: "ページから寸法を抽出できませんでした", fetchedVia },
      { status: 404 }
    );
  }

  // 異常値を除外 (1cm未満 or 5m超は明らかに誤抽出)
  if (
    result.w < 1 || result.d < 1 || result.h < 1 ||
    result.w > 500 || result.d > 500 || result.h > 500
  ) {
    return NextResponse.json(
      { ok: false, error: "抽出した値が範囲外でした", fetchedVia },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { ok: true, ...result, fetchedVia },
    {
      status: 200,
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
    }
  );
}

// =============================================================
// 抽出ロジック
// =============================================================

type DimensionResult = {
  name: string | null;
  w: number;
  d: number;
  h: number;
  source: string;
};

function parseDimensions(html: string): DimensionResult | null {
  const name = extractName(html);

  const fromJsonLd = parseJsonLd(html);
  if (fromJsonLd) return { name: fromJsonLd.name ?? name, ...fromJsonLd, source: "json-ld" };

  // <script>/<style> を除去してから本文テキスト化
  const text = normalize(stripTags(html));

  const fromJp = parseJapanesePattern(text);
  if (fromJp) return { name, ...fromJp, source: "jp-text" };

  const fromWdh = parseWdhPattern(text);
  if (fromWdh) return { name, ...fromWdh, source: "wdh" };

  return null;
}

function extractName(html: string): string | null {
  // Jina Reader が返す Markdown は先頭に "Title: ..." 行を持つ
  const md = html.match(/^\s*Title:\s*([^\n\r]+)/);
  if (md) return md[1].trim();
  const og = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  if (og) return decodeEntities(og[1]).trim();
  const og2 = html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i
  );
  if (og2) return decodeEntities(og2[1]).trim();
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (t) return decodeEntities(t[1]).trim();
  return null;
}

type JsonLdDimensions = { name?: string; w: number; d: number; h: number };

function parseJsonLd(html: string): JsonLdDimensions | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const items = flatten(data);
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const type = obj["@type"];
      const isProduct =
        type === "Product" ||
        (Array.isArray(type) && type.includes("Product"));
      if (!isProduct && !(obj.width || obj.depth || obj.height)) continue;

      const w = readDim(obj.width);
      const d = readDim(obj.depth);
      const h = readDim(obj.height);
      if (w && d && h) {
        return { name: typeof obj.name === 'string' ? obj.name : undefined, w, d, h };
      }
    }
  }
  return null;
}

function flatten(data: unknown): unknown[] {
  // JSON-LD は配列だったり @graph に入っていたりする
  if (Array.isArray(data)) return data.flatMap(flatten);
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) return obj["@graph"].flatMap(flatten);
    return [data];
  }
  return [];
}

function readDim(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  if (typeof v === "object") {
    // QuantitativeValue: { value, unitCode } など
    const obj = v as Record<string, unknown>;
    if (obj.value != null) {
      const n = parseFloat(String(obj.value));
      if (isFinite(n)) return n;
    }
  }
  return null;
}

function parseJapanesePattern(text: string): { w: number; d: number; h: number } | null {
  // 例: 幅91×奥行40×高さ74cm
  //     幅約91 奥行約40 高さ約74cm
  //     幅 91 cm × 奥行き 40 cm × 高さ 74 cm
  const re = /幅[\s約]*([0-9]+(?:\.[0-9]+)?)\s*(?:cm|センチ)?[^0-9]{0,15}?奥行?(?:き)?[\s約]*([0-9]+(?:\.[0-9]+)?)\s*(?:cm|センチ)?[^0-9]{0,15}?高さ[\s約]*([0-9]+(?:\.[0-9]+)?)\s*(?:cm|センチ)/;
  const m = text.match(re);
  if (!m) return null;
  return { w: parseFloat(m[1]), d: parseFloat(m[2]), h: parseFloat(m[3]) };
}

function parseWdhPattern(text: string): { w: number; d: number; h: number } | null {
  // 例: W900 × D600 × H720, W:90 D:60 H:72 (cm)
  const re = /W[\s:.]*([0-9]+(?:\.[0-9]+)?)[^0-9]{0,8}D[\s:.]*([0-9]+(?:\.[0-9]+)?)[^0-9]{0,8}H[\s:.]*([0-9]+(?:\.[0-9]+)?)\s*(?:mm|cm)?/i;
  const m = text.match(re);
  if (!m) return null;
  let w = parseFloat(m[1]);
  let d = parseFloat(m[2]);
  let h = parseFloat(m[3]);
  // mm っぽい桁数 (3桁以上で 100以上) なら cm に補正
  const looksMm = /mm/i.test(m[0]) || (w >= 200 && d >= 200 && h >= 200);
  if (looksMm) {
    w /= 10;
    d /= 10;
    h /= 10;
  }
  return { w, d, h };
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function normalize(s: string): string {
  // 全角数字 → 半角
  s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  // HTMLエンティティを実体化 + 連続空白を1つに
  s = decodeEntities(s).replace(/\s+/g, " ");
  return s;
}
