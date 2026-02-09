import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import fetch from 'node-fetch';
import type { BasecampConfig, ChatTypeCacheEntry } from './types.js';
import { getAccessToken, refreshAccessToken, loadCredentials, clearCredentials } from './oauth.js';

const CACHE_DIR = path.join(os.homedir(), '.openclaw', 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'basecamp-chat-types.json');
const DEFAULT_TTL_DAYS = 7;

interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

interface ChatTypeResult {
  chatType: 'direct' | 'group' | 'unknown';
  chatName?: string;
}

/**
 * Parse Basecamp callback URL into account/bucket/chat IDs.
 *
 * Expected format:
 *   https://3.basecamp.com/{accountId}/integrations/{integrationId}/buckets/{bucketId}/chats/{chatId}/lines
 */
export function parseCallbackUrl(callbackUrl: string): {
  accountId: string;
  bucketId: string;
  chatId: string;
} | null {
  try {
    const url = new URL(callbackUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    // Expected path: /{accountId}/integrations/{integrationId}/buckets/{bucketId}/chats/{chatId}/lines
    const bucketsIdx = parts.indexOf('buckets');
    const chatsIdx = parts.indexOf('chats');
    if (bucketsIdx === -1 || chatsIdx === -1 || parts.length < 1) {
      return null;
    }
    const accountId = parts[0];
    const bucketId = parts[bucketsIdx + 1];
    const chatId = parts[chatsIdx + 1];
    if (!accountId || !bucketId || !chatId) {
      return null;
    }
    return { accountId, bucketId, chatId };
  } catch {
    return null;
  }
}

// ── Cache management ──

function loadCache(): Record<string, ChatTypeCacheEntry> {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, ChatTypeCacheEntry>): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function getCacheKey(accountId: string, bucketId: string, chatId: string): string {
  return `${accountId}:${bucketId}:${chatId}`;
}

export function getCachedChatType(
  accountId: string,
  bucketId: string,
  chatId: string,
  ttlDays?: number,
): ChatTypeCacheEntry | null {
  const cache = loadCache();
  const key = getCacheKey(accountId, bucketId, chatId);
  const entry = cache[key];
  if (!entry) {
    return null;
  }
  const ttlMs = (ttlDays ?? DEFAULT_TTL_DAYS) * 24 * 60 * 60 * 1000;
  if (Date.now() - entry.cachedAt > ttlMs) {
    return null; // Expired
  }
  return entry;
}

function setCachedChatType(
  accountId: string,
  bucketId: string,
  chatId: string,
  type: 'direct' | 'group',
  chatName?: string,
): void {
  const cache = loadCache();
  const key = getCacheKey(accountId, bucketId, chatId);
  cache[key] = { type, chatName, cachedAt: Date.now() };
  saveCache(cache);
}

/**
 * Get the number of cached chat type entries.
 */
export function getCacheSize(): number {
  return Object.keys(loadCache()).length;
}

// ── Basecamp API query ──

async function queryBasecampChat(
  accountId: string,
  bucketId: string,
  chatId: string,
  accessToken: string,
): Promise<{ status: number; body?: Record<string, unknown> }> {
  const url = `https://3.basecampapi.com/${accountId}/buckets/${bucketId}/chats/${chatId}.json`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'OpenClaw Basecamp Plugin (https://github.com/openclaw)',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    return { status: res.status };
  }
  const body = await res.json() as Record<string, unknown>;
  return { status: res.status, body };
}

/**
 * Parse the Basecamp API response into a chat type.
 *
 * - 200 + bucket.type === "Project" → "group"
 * - 404 → "direct" (pings are not accessible via the chats endpoint)
 * - anything else → "unknown"
 */
export function parseChatType(
  status: number,
  body?: Record<string, unknown>,
): ChatTypeResult {
  if (status === 200 && body) {
    const bucket = body.bucket as Record<string, unknown> | undefined;
    if (bucket?.type === 'Project') {
      const chatName = (body.topic as string) || undefined;
      return { chatType: 'group', chatName };
    }
    // 200 but not a project bucket — still treat as group (some other bucket type)
    return { chatType: 'group', chatName: (body.topic as string) || undefined };
  }
  if (status === 404) {
    return { chatType: 'direct' };
  }
  return { chatType: 'unknown' };
}

// ── Main entry point ──

/**
 * Detect whether a Basecamp callback URL corresponds to a direct (ping) or group (campfire) chat.
 *
 * Flow:
 * 1. Parse callback URL for IDs
 * 2. Check cache
 * 3. Query Basecamp API (with token refresh on 401)
 * 4. Cache definitive results (never cache "unknown")
 */
export async function getChatType(
  callbackUrl: string,
  config: BasecampConfig,
  log?: Logger,
): Promise<ChatTypeResult> {
  const parsed = parseCallbackUrl(callbackUrl);
  if (!parsed) {
    log?.warn(`[chat-detection] Could not parse callback URL: ${callbackUrl}`);
    return { chatType: 'unknown' };
  }
  const { accountId, bucketId, chatId } = parsed;
  const ttlDays = config.chatTypeCache?.ttlDays;

  // 1. Check cache
  const cached = getCachedChatType(accountId, bucketId, chatId, ttlDays);
  if (cached) {
    log?.info(`[chat-detection] Cache hit: ${cached.type} (${accountId}:${bucketId}:${chatId})`);
    return { chatType: cached.type, chatName: cached.chatName };
  }

  // 2. Get access token
  let accessToken = await getAccessToken(config, log);
  if (!accessToken) {
    log?.warn('[chat-detection] No OAuth token available — cannot detect chat type');
    return { chatType: 'unknown' };
  }

  // 3. Query API
  let result = await queryBasecampChat(accountId, bucketId, chatId, accessToken);

  // 4. Handle 401 — attempt token refresh and retry once
  if (result.status === 401) {
    log?.info('[chat-detection] Got 401, attempting token refresh');
    const creds = loadCredentials();
    if (creds) {
      const refreshed = await refreshAccessToken(config, creds, log);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        result = await queryBasecampChat(accountId, bucketId, chatId, accessToken);
      } else {
        clearCredentials();
        log?.error('[chat-detection] Token refresh failed — credentials cleared');
        return { chatType: 'unknown' };
      }
    }
  }

  // 5. Parse result
  const chatTypeResult = parseChatType(result.status, result.body);
  log?.info(`[chat-detection] API result: ${chatTypeResult.chatType} (status=${result.status})`);

  // 6. Cache definitive results only
  if (chatTypeResult.chatType !== 'unknown') {
    setCachedChatType(accountId, bucketId, chatId, chatTypeResult.chatType, chatTypeResult.chatName);
  }

  return chatTypeResult;
}
