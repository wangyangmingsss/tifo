import { config } from './config';

/**
 * DeepSeek V4 API integration for AI-enhanced tweet generation.
 *
 * When DEEPSEEK_API_KEY is set, the Correspondent can optionally
 * use DeepSeek to rewrite template-generated tweets into more
 * natural, varied, and engaging language — while preserving the
 * factual on-chain data (faction names, region IDs, tx hashes).
 *
 * Falls back to the original template text if the API is unavailable
 * or the key is not configured.
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const SYSTEM_PROMPT = `You are TIFO War Correspondent, an AI that writes short, punchy tweets about an on-chain territory war game for the 2026 FIFA World Cup.

Rules:
- Keep tweets under 280 characters
- Preserve ALL factual data exactly: faction names, region IDs, tx hashes, URLs, hashtags, and @handles
- Never change OKLink URLs or remove hashtags/mentions
- Add personality: drama, urgency, humor, or hype — but stay concise
- Do NOT add emojis beyond what's in the original
- Output ONLY the tweet text, nothing else`;

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Enhance a template-generated tweet using DeepSeek V4.
 * Returns the original text if AI is unavailable or fails.
 */
export async function enhanceTweet(templateText: string): Promise<string> {
  const apiKey = config.deepseekApiKey;
  if (!apiKey) return templateText;

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Rewrite this war dispatch tweet with more personality and flair. Keep ALL data intact (names, numbers, URLs, hashtags, @handles):\n\n${templateText}`,
    },
  ];

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 350,
        temperature: 0.8,
        top_p: 0.9,
      }),
    });

    if (!res.ok) {
      console.warn(`[deepseek] API returned ${res.status}, using template text`);
      return templateText;
    }

    const json = (await res.json()) as DeepSeekResponse;
    const enhanced = json.choices?.[0]?.message?.content?.trim();

    if (!enhanced || enhanced.length < 20) {
      console.warn('[deepseek] Empty or too-short response, using template text');
      return templateText;
    }

    // Safety: ensure hashtags and handle are still present
    if (!enhanced.includes('#TIFO') || !enhanced.includes(config.projectHandle)) {
      console.warn('[deepseek] Response missing required tags, using template text');
      return templateText;
    }

    console.log('[deepseek] Tweet enhanced successfully');
    return enhanced;
  } catch (err) {
    console.error('[deepseek] API error:', err);
    return templateText;
  }
}
