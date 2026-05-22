import crypto from 'crypto';
import https from 'https';
import { config } from './config';

/**
 * Twitter/X API v2 client using OAuth 1.0a User Context.
 *
 * Posts tweets on behalf of the project's X account.
 * Uses raw Node.js https — no external SDK dependency.
 *
 * Reference: https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
 */

interface TweetResponse {
  data?: { id: string; text: string };
  errors?: { message: string }[];
  detail?: string;
  title?: string;
}

// OAuth 1.0a signature generation
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function buildAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  token: string,
  tokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  };

  const signature = generateSignature(method, url, oauthParams, consumerSecret, tokenSecret);
  oauthParams['oauth_signature'] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

export async function postTweet(text: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  const { apiKey, apiSecret, accessToken, accessSecret } = config.twitter;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { success: false, error: 'Twitter OAuth credentials not configured' };
  }

  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';
  const body = JSON.stringify({ text });

  const authHeader = buildAuthHeader(method, url, apiKey, apiSecret, accessToken, accessSecret);

  return new Promise((resolve) => {
    const req = https.request(
      url,
      {
        method,
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed: TweetResponse = JSON.parse(data);
            if (parsed.data?.id) {
              resolve({ success: true, tweetId: parsed.data.id });
            } else {
              const errMsg =
                parsed.errors?.[0]?.message || parsed.detail || parsed.title || 'Unknown error';
              resolve({ success: false, error: errMsg });
            }
          } catch {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${data.slice(0, 200)}` });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.write(body);
    req.end();
  });
}

/**
 * Post a tweet, or log it in dry-run mode.
 * Returns the tweet URL if successful.
 */
export async function publishTweet(text: string): Promise<string | null> {
  if (config.dryRun) {
    console.log(`[tweet] DRY RUN — would post:\n${'─'.repeat(50)}\n${text}\n${'─'.repeat(50)}`);
    return null;
  }

  console.log(`[tweet] Posting tweet (${text.length} chars)...`);
  const result = await postTweet(text);

  if (result.success && result.tweetId) {
    const tweetUrl = `https://x.com/${config.projectHandle.replace('@', '')}/status/${result.tweetId}`;
    console.log(`[tweet] Posted successfully: ${tweetUrl}`);
    return tweetUrl;
  } else {
    console.error(`[tweet] Failed to post: ${result.error}`);
    return null;
  }
}
