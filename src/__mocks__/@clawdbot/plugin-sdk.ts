/**
 * Mock implementation of @clawdbot/plugin-sdk for testing
 */

export interface PluginAPI {
  log: {
    info: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
  config: any;
  runtime: any;
  registerHttpHandler: (handler: any) => void;
  registerChannel: (channel: any) => void;
  onShutdown: (callback: () => void) => void;
  processMessage: (context: any) => Promise<any>;
  getSession: (sessionKey: string) => Promise<any>;
}

export interface Channel {
  id: string;
  name: string;
  send: (target: string, message: string, options?: any) => Promise<void>;
  react?: (target: string, messageId: string, emoji: string) => Promise<void>;
  delete?: (target: string, messageId: string) => Promise<void>;
  getCapabilities?: () => string[];
}
