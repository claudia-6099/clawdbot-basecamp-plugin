/**
 * Type declarations for @clawdbot/plugin-sdk
 * This is a stub to allow TypeScript compilation in CI without the actual package
 */
declare module '@clawdbot/plugin-sdk' {
  export interface PluginAPI {
    log: {
      info: (...args: unknown[]) => void;
      debug: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
    };
    config: Record<string, unknown>;
    runtime: unknown;
    registerHttpHandler: (handler: HttpHandler) => void;
    registerChannel: (channel: Channel) => void;
    onShutdown: (callback: () => void) => void;
    processMessage: (context: unknown) => Promise<unknown>;
    getSession: (sessionKey: string) => Promise<unknown>;
  }

  export interface HttpHandler {
    path: string;
    method: string;
    handler: (req: unknown, res: unknown) => Promise<void> | void;
  }

  export interface Channel {
    id: string;
    name: string;
    send: (target: string, message: string, options?: unknown) => Promise<void>;
    react?: (target: string, messageId: string, emoji: string) => Promise<void>;
    delete?: (target: string, messageId: string) => Promise<void>;
    getCapabilities?: () => string[];
  }
}
