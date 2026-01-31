import type { Channel } from '@clawdbot/plugin-sdk';
import { sendToBasecamp } from './send.js';

/**
 * Basecamp Channel implementation
 * Implements the Clawdbot Channel interface for Basecamp integration
 */
export const basecampChannel: Channel = {
  id: 'basecamp',
  name: 'Basecamp',
  
  /**
   * Send a message to Basecamp
   * @param target - callback_url (from webhook)
   * @param message - message text
   * @param options - additional options
   */
  async send(target: string, message: string, options?: any): Promise<void> {
    await sendToBasecamp(target, message);
  },
  
  /**
   * React to a message (not supported by Basecamp)
   */
  async react(target: string, messageId: string, emoji: string): Promise<void> {
    throw new Error('Reactions are not supported by Basecamp chatbots');
  },
  
  /**
   * Delete a message (not supported by Basecamp)
   */
  async delete(target: string, messageId: string): Promise<void> {
    throw new Error('Message deletion is not supported by Basecamp chatbots');
  },
  
  /**
   * Get channel capabilities
   */
  getCapabilities(): string[] {
    return [
      'send',
      'html_formatting',
      'tables',
      'details_summary',
    ];
  },
};
