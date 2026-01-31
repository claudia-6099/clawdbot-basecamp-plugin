import type { PluginAPI } from '@clawdbot/plugin-sdk';
import type { BasecampWebhookPayload, BasecampSession } from './types.js';
import { sendToBasecamp } from './send.js';

/**
 * Session storage (in-memory)
 * Key: callback_url (unique per chat/campfire)
 */
const sessions = new Map<string, BasecampSession>();

/**
 * Register webhook handler with Clawdbot
 */
export function registerWebhookHandler(
  api: PluginAPI,
  webhookPath: string
): void {
  api.registerHttpHandler({
    path: webhookPath,
    method: 'POST',
    handler: async (req: unknown, res: unknown) => {
      // Type assertion for request/response
      const request = req as {body: BasecampWebhookPayload};
      const response = res as {status: (code: number) => {json: (data: unknown) => void}};
      try {
        const payload = request.body;
        
        // Validate payload
        if (!payload.command || !payload.callback_url || !payload.creator) {
          response.status(400).json({ error: 'Invalid webhook payload' });
          return;
        }

        // Log incoming message
        api.log.info('[Basecamp] Received message', {
          from: payload.creator.name,
          command: payload.command,
          callbackUrl: payload.callback_url,
        });

        // Get or create session
        const session = getOrCreateSession(payload);

        // Route message to Clawdbot
        await routeToClawdbot(api, session, payload);

        // Always return 200 OK to Basecamp (even if processing fails)
        response.status(200).json({ ok: true });
      } catch (error) {
        api.log.error('[Basecamp] Webhook error', { error });
        response.status(200).json({ ok: true }); // Still return 200 to Basecamp
      }
    },
  });

  api.log.info(`[Basecamp] Webhook registered at ${webhookPath}`);
}

/**
 * Get or create a session for this callback_url
 */
function getOrCreateSession(payload: BasecampWebhookPayload): BasecampSession {
  const sessionId = payload.callback_url;
  
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
    session.creator = payload.creator; // Update creator info
  }
  
  return session;
}

/**
 * Route message to Clawdbot for processing
 */
async function routeToClawdbot(
  api: PluginAPI,
  session: BasecampSession,
  payload: BasecampWebhookPayload
): Promise<void> {
  try {
    // Build message context for Clawdbot
    const messageContext = {
      channel: 'basecamp',
      sessionKey: session.sessionId,
      from: {
        id: payload.creator.id.toString(),
        name: payload.creator.name,
        email: payload.creator.email_address,
      },
      text: payload.command,
      timestamp: Date.now(),
    };

    // Use api.runtime to send message to Clawdbot
    // The response will be handled asynchronously
    const runtime = api.runtime as {sendMessage: (context: unknown) => Promise<{text?: string}>};
    const response = await runtime.sendMessage(messageContext);

    // Send response back to Basecamp
    if (response && response.text) {
      await sendToBasecamp(session.callbackUrl, response.text);
    }
  } catch (error) {
    api.log.error('[Basecamp] Error routing to Clawdbot', { error });
    
    // Send error message to Basecamp
    await sendToBasecamp(
      session.callbackUrl,
      '<p>❌ Sorry, something went wrong processing your message.</p>'
    );
  }
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
