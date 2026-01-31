/**
 * Mock implementation of @clawdbot/plugin-sdk for testing
 */

export interface PluginAPI {
  log: {
    info: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
  };
  config: Record<string, unknown>;
  runtime: unknown;
  registerHttpHandler: (handler: unknown) => void;
  registerChannel: (channel: unknown) => void;
  onShutdown: (callback: () => void) => void;
  processMessage: (context: unknown) => Promise<unknown>;
  getSession: (sessionKey: string) => Promise<unknown>;
}

export interface Channel {
  id: string;
  name: string;
  send: (target: string, message: string, options?: unknown) => Promise<void>;
  react?: (_target: string, _messageId: string, _emoji: string) => Promise<void>;
  delete?: (_target: string, _messageId: string) => Promise<void>;
  getCapabilities?: () => string[];
}
