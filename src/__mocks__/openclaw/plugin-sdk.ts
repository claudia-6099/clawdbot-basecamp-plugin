/**
 * Mock implementation of openclaw/plugin-sdk for testing
 */

export interface OpenClawPluginApi {
  config: Record<string, unknown>;
  runtime: {
    logging: {
      getChildLogger: (name: string) => PluginLogger;
    };
    channel: {
      text: {
        chunkMarkdownText: (text: string, limit: number) => string[];
      };
      routing: {
        resolveAgentRoute: (params: unknown) => unknown;
      };
    };
  };
  registerChannel: (opts: { plugin: unknown }) => void;
  registerService: (service: {
    id: string;
    start: () => void;
    stop: () => void;
  }) => void;
  registerGatewayMethod: (
    method: string,
    handler: (ctx: { respond: (ok: boolean, data: unknown) => void }) => void,
  ) => void;
  registerTool: (
    tool: {
      name: string;
      description: string;
      parameters: unknown;
      execute: (id: string, params: unknown) => Promise<unknown>;
    },
    opts?: { optional?: boolean },
  ) => void;
}

export interface PluginLogger {
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}
