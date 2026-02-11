/**
 * @deprecated Legacy webhook handling code - DO NOT USE
 *
 * This file contains an older implementation that creates sessions using
 * only callback_url (line 80), which causes conversation contamination
 * when multiple users share the same chatbot.
 *
 * Active webhook handling is in monitor.ts, which correctly includes
 * user ID in session construction (line 185).
 *
 * This file is retained only for reference and will be removed in v2.0.0.
 */

import type { BasecampWebhookPayload, BasecampSession } from './types.js';

/**
 * Session storage (in-memory)
 * Key: callback_url (unique per chat/campfire)
 */
const sessions = new Map<string, BasecampSession>();

interface Logger {
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface InboundMessage {
  channel: string;
  sessionKey: string;
  replyTarget: string;
  from: {
    id: string;
    name: string;
    email: string;
  };
  text: string;
  timestamp: number;
}

/**
 * Handle incoming Basecamp webhook payload.
 * Parses the payload and returns the inbound message context
 * for the OpenClaw gateway framework to route to the agent.
 */
export async function handleWebhook(
  log: Logger,
  rawPayload: unknown,
): Promise<{ ok: boolean; error?: string; message?: InboundMessage }> {
  try {
    const payload = rawPayload as BasecampWebhookPayload;

    // Validate payload
    if (!payload.command || !payload.callback_url || !payload.creator) {
      return { ok: false, error: 'Invalid webhook payload' };
    }

    // Log incoming message
    log.info('Received message', {
      from: payload.creator.name,
      command: payload.command,
      callbackUrl: payload.callback_url,
    });

    // Get or create session
    const session = getOrCreateSession(payload);

    return {
      ok: true,
      message: {
        channel: 'basecamp',
        sessionKey: session.sessionId,
        replyTarget: session.callbackUrl,
        from: {
          id: payload.creator.id.toString(),
          name: payload.creator.name,
          email: payload.creator.email_address,
        },
        text: payload.command,
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    log.error('Webhook error', { error });
    return { ok: false, error: 'Internal error processing webhook' };
  }
}

/**
 * Get or create a session for this callback_url
 * @deprecated Uses callback_url only - causes session contamination
 *
 * PROBLEM: This function creates sessions using only the callback_url,
 * which means all users sharing the same Basecamp chatbot get routed
 * to the same session. This causes conversation contamination.
 *
 * SOLUTION: Use monitor.ts instead, which includes user ID in the
 * session key construction (callback_url:user:creator_id).
 */
function getOrCreateSession(payload: BasecampWebhookPayload): BasecampSession {
  const sessionId = payload.callback_url;  // ← BROKEN: Missing user ID

  let session = sessions.get(sessionId);

  if (!session) {
    session = {
      sessionId,
      callbackUrl: payload.callback_url,
      lastActive: Date.now(),
      creator: payload.creator,
    };
    sessions.set(sessionId, session);
  } else {
    session.lastActive = Date.now();
    session.creator = payload.creator;
  }

  return session;
}

/**
 * Clean up old sessions (call periodically)
 */
export function cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActive > maxAgeMs) {
      sessions.delete(sessionId);
    }
  }
}
