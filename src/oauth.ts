import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import fetch from 'node-fetch';
import type { OAuthCredentials, BasecampConfig } from './types.js';

const CREDENTIALS_DIR = path.join(os.homedir(), '.openclaw', 'credentials');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'basecamp-oauth.json');
const LAUNCHPAD_TOKEN_URL = 'https://launchpad.37signals.com/authorization/token';
const BASECAMP_AUTH_URL = 'https://launchpad.37signals.com/authorization/new';

interface Logger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Load stored OAuth credentials from disk.
 */
export function loadCredentials(): OAuthCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.accessToken || typeof data.accessToken !== 'string') {
      return null;
    }
    return data as OAuthCredentials;
  } catch {
    return null;
  }
}

/**
 * Store OAuth credentials to disk with restricted permissions.
 */
export function storeCredentials(creds: OAuthCredentials): void {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

/**
 * Remove stored credentials.
 */
export function clearCredentials(): void {
  try {
    fs.unlinkSync(CREDENTIALS_FILE);
  } catch {
    // ignore if doesn't exist
  }
}

/**
 * Check if the current access token is expired (or close to expiring).
 */
export function isTokenExpired(creds: OAuthCredentials): boolean {
  if (!creds.expiresAt) {
    return false; // No expiry info, assume valid
  }
  // Consider expired 5 minutes before actual expiry
  return Date.now() >= (creds.expiresAt - 5 * 60 * 1000);
}

/**
 * Validate an access token by making a test API call to Basecamp.
 */
export async function validateToken(accessToken: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch('https://launchpad.37signals.com/authorization.json', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'OpenClaw Basecamp Plugin (https://github.com/openclaw)',
      },
    });
    if (res.ok) {
      return { valid: true };
    }
    return { valid: false, error: `API returned ${res.status}` };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Refresh the access token using the refresh token.
 */
export async function refreshAccessToken(
  config: BasecampConfig,
  creds: OAuthCredentials,
  log?: Logger,
): Promise<OAuthCredentials | null> {
  if (!creds.refreshToken) {
    log?.warn('[oauth] No refresh token available');
    return null;
  }
  const clientId = config.oauth?.clientId;
  const clientSecret = config.oauth?.clientSecret;
  if (!clientId || !clientSecret) {
    log?.warn('[oauth] Cannot refresh: missing clientId or clientSecret in config');
    return null;
  }

  try {
    const params = new URLSearchParams({
      type: 'refresh',
      refresh_token: creds.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const res = await fetch(`${LAUNCHPAD_TOKEN_URL}?${params.toString()}`, {
      method: 'POST',
      headers: { 'User-Agent': 'OpenClaw Basecamp Plugin (https://github.com/openclaw)' },
    });
    if (!res.ok) {
      log?.error(`[oauth] Token refresh failed: ${res.status} ${res.statusText}`);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await res.json() as any;
    const newCreds: OAuthCredentials = {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? creds.refreshToken,
      expiresAt: body.expires_at ? new Date(body.expires_at).getTime() : undefined,
    };
    storeCredentials(newCreds);
    log?.info('[oauth] Token refreshed successfully');
    return newCreds;
  } catch (err) {
    log?.error('[oauth] Token refresh error', err);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if needed.
 * Returns null if no credentials or refresh fails.
 */
export async function getAccessToken(
  config: BasecampConfig,
  log?: Logger,
): Promise<string | null> {
  let creds = loadCredentials();
  if (!creds) {
    return null;
  }
  if (isTokenExpired(creds)) {
    log?.info('[oauth] Token expired, attempting refresh');
    const refreshed = await refreshAccessToken(config, creds, log);
    if (!refreshed) {
      return null;
    }
    creds = refreshed;
  }
  return creds.accessToken;
}

/**
 * Build the OAuth authorization URL for the user to visit.
 */
export function buildAuthUrl(config: BasecampConfig): string | null {
  const clientId = config.oauth?.clientId;
  const redirectUri = config.oauth?.redirectUri;
  if (!clientId || !redirectUri) {
    return null;
  }
  const params = new URLSearchParams({
    type: 'web_server',
    client_id: clientId,
    redirect_uri: redirectUri,
  });
  return `${BASECAMP_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access/refresh tokens.
 */
export async function exchangeCodeForToken(
  config: BasecampConfig,
  code: string,
  log?: Logger,
): Promise<OAuthCredentials | null> {
  const clientId = config.oauth?.clientId;
  const clientSecret = config.oauth?.clientSecret;
  const redirectUri = config.oauth?.redirectUri;
  if (!clientId || !clientSecret || !redirectUri) {
    log?.error('[oauth] Missing clientId, clientSecret, or redirectUri in config');
    return null;
  }
  try {
    const params = new URLSearchParams({
      type: 'web_server',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch(`${LAUNCHPAD_TOKEN_URL}?${params.toString()}`, {
      method: 'POST',
      headers: { 'User-Agent': 'OpenClaw Basecamp Plugin (https://github.com/openclaw)' },
    });
    if (!res.ok) {
      log?.error(`[oauth] Code exchange failed: ${res.status} ${res.statusText}`);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await res.json() as any;
    const creds: OAuthCredentials = {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: body.expires_at ? new Date(body.expires_at).getTime() : undefined,
    };
    storeCredentials(creds);
    log?.info('[oauth] Token obtained and stored successfully');
    return creds;
  } catch (err) {
    log?.error('[oauth] Code exchange error', err);
    return null;
  }
}

/**
 * Get status info about the current OAuth setup.
 */
export function getOAuthStatus(): {
  configured: boolean;
  expiresAt?: string;
  hasRefreshToken: boolean;
} {
  const creds = loadCredentials();
  if (!creds) {
    return { configured: false, hasRefreshToken: false };
  }
  return {
    configured: true,
    expiresAt: creds.expiresAt ? new Date(creds.expiresAt).toISOString() : 'unknown',
    hasRefreshToken: Boolean(creds.refreshToken),
  };
}
