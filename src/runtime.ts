import type { PluginAPI } from '@clawdbot/plugin-sdk';

/**
 * Setup runtime bridge for Basecamp plugin
 * This connects the plugin to Clawdbot's core runtime
 */
export function setupRuntime(api: PluginAPI): void {
  // Register the plugin with the runtime
  api.runtime = {
    /**
     * Send a message to Clawdbot for processing
     */
    async sendMessage(context: unknown): Promise<unknown> {
      // This would typically route through Clawdbot's message pipeline
      // For now, we'll use the plugin API's messaging system
      return await api.processMessage(context);
    },
    
    /**
     * Get session information
     */
    async getSession(sessionKey: string): Promise<unknown> {
      return await api.getSession(sessionKey);
    },
  };
}
