import { NextRequest, NextResponse } from 'next/server';
import { extractJsonObject, extractTextFromClaudeContent, getAnthropicClient } from '@/lib/anthropic';

export const runtime = 'nodejs';

export type RoomAnalysisResult = {
  roomType: string;
  size: string;
  shape: string;
  windowDirection: string;
  area: number;
};

const FALLBACK: RoomAnalysisResult = {
  roomType: '1K',
  size: '6畳',
  shape: '長方形',
  windowDirection: '南',
  area: 9.9,
};

type AnalyzeRoomRequest = {
  imageBase64?: string;
  mediaType?: string;
};

export async function POST(req: NextRequest) {
  let imageBase64: string | null = null;
  let mediaType: string = 'image/jpeg';

  try {
    const body = await req.json() as AnalyzeRoomRequest;
    imageBase64 = body.imageBase64 ?? null;
    mediaType = body.mediaType ?? 'image/jpeg';
  } catch {
    imageBase64 = null;
  }

  if (!imageBase64) {
    return NextResponse.json({ ok: true, result: FALLBACK, fallback: true });
  }

  try {
    const client = await getAnthropicClient();

    if (!client) {
      return NextResponse.json({ ok: true, result: FALLBACK, fallback: true });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: [
                'この間取り画像を解析し、必ず JSON オブジェクトのみで返答してください。',
                '推測でよいので、一人暮らし向け物件として最も妥当な値を選んでください。',
                'キーは roomType, size, shape, windowDirection, area のみを使用してください。',
                'size は "6畳" のような文字列、windowDirection は "南" のような方角文字列、area は平方メートルの数値にしてください。',
                '例:',
                '{"roomType":"1K","size":"6畳","shape":"長方形","windowDirection":"南","area":9.9}',
              ].join('\n'),
            },
          ],
        },
      ],
    });

    const text = extractTextFromClaudeContent(message.content);
    const parsed = extractJsonObject<Partial<RoomAnalysisResult>>(text);

    if (!parsed) {
      throw new Error('JSON not found in Claude response');
    }

    return NextResponse.json({
      ok: true,
      result: {
        ...FALLBACK,
        ...parsed,
        area: typeof parsed.area === 'number' ? parsed.area : FALLBACK.area,
      },
      fallback: false,
    });
  } catch (e) {
    console.error('[analyze-room] error:', e);
    return NextResponse.json({ ok: true, result: FALLBACK, fallback: true });
  }
}
