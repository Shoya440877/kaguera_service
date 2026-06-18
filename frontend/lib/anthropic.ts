export async function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return null;
  }

  const { Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({ apiKey });
}

export function extractTextFromClaudeContent(
  content: Array<{ type: string; text?: string }>,
): string {
  return content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

export function extractJsonObject<T>(input: string): T | null {
  const match = input.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
