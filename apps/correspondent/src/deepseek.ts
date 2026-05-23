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

/**
 * Generate a tweet entirely from structured event data using DeepSeek.
 * This produces more natural, varied tweets compared to template-based generation.
 * Falls back to the provided fallback text if AI is unavailable.
 */
export async function generateTweetFromData(
  eventData: {
    type: 'capture' | 'defection' | 'match_event' | 'countdown';
    details: Record<string, unknown>;
  },
  fallbackText: string,
): Promise<string> {
  const apiKey = config.deepseekApiKey;
  if (!apiKey) return fallbackText;

  const GENERATE_PROMPT = `You are TIFO War Correspondent, an AI agent that writes original tweets about an on-chain territory war game for the 2026 FIFA World Cup on X Layer.

Given structured event data, write an original, engaging tweet.

Rules:
- Keep under 280 characters
- Include all factual data provided
- Add personality: drama, urgency, humor, or hype
- Always include #TIFO and ${config.projectHandle}
- Include the OKLink verification URL if a txHash is provided
- Format OKLink URLs as: https://www.oklink.com/xlayer-test/tx/{txHash}
- Output ONLY the tweet text`;

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: GENERATE_PROMPT },
    {
      role: 'user',
      content: `Generate an original tweet for this ${eventData.type} event:\n\n${JSON.stringify(eventData.details, null, 2)}`,
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
        temperature: 0.9,
        top_p: 0.95,
      }),
    });

    if (!res.ok) {
      console.warn(`[deepseek] generateTweetFromData: API returned ${res.status}, using fallback`);
      return fallbackText;
    }

    const json = (await res.json()) as DeepSeekResponse;
    const generated = json.choices?.[0]?.message?.content?.trim();

    if (!generated || generated.length < 20 || generated.length > 280) {
      console.warn('[deepseek] generateTweetFromData: invalid response length, using fallback');
      return fallbackText;
    }

    if (!generated.includes('#TIFO')) {
      console.warn('[deepseek] generateTweetFromData: missing #TIFO tag, using fallback');
      return fallbackText;
    }

    console.log('[deepseek] Original tweet generated successfully');
    return generated;
  } catch (err) {
    console.error('[deepseek] generateTweetFromData error:', err);
    return fallbackText;
  }
}
