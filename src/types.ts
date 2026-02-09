/**
 * Basecamp Webhook Payload
 * POSTed to the webhook endpoint when user mentions the bot or sends a ping
 */
export interface BasecampWebhookPayload {
  /** The user's message/command text */
  command: string;
  
  /** Information about the user who triggered the bot */
  creator: BasecampCreator;
  
  /** URL to POST responses to (unique per chat/campfire) */
  callback_url: string;
}

/**
 * User information from Basecamp
 */
export interface BasecampCreator {
  id: number;
  attachable_sgid: string;
  name: string;
  email_address: string;
  personable_type: string;
  title?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
  owner: boolean;
  time_zone: string;
  avatar_url: string;
  company?: {
    id: number;
    name: string;
  };
}

/**
 * Basecamp Line (message) payload
 * POSTed to callback_url to send a message
 */
export interface BasecampLinePayload {
  /** HTML-formatted message content */
  content: string;
}

/**
 * Plugin configuration
 */
export interface BasecampConfig {
  enabled: boolean;
  botName: string;
  webhookPath: string;
  port: number;
}

/**
 * Session context for Basecamp conversations
 */
export interface BasecampSession {
  /** Unique session identifier (callback_url) */
  sessionId: string;
  
  /** Callback URL to POST responses to */
  callbackUrl: string;
  
  /** Last active timestamp */
  lastActive: number;
  
  /** User information */
  creator?: BasecampCreator;
}
