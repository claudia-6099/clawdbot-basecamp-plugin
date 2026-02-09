import { validateConfig, defaultConfig } from '../config-schema.js';

describe('validateConfig', () => {
  it('should return default config when passed empty object', () => {
    const result = validateConfig({});
    expect(result).toEqual(defaultConfig);
  });

  it('should merge partial config with defaults', () => {
    const result = validateConfig({ botName: 'mybot' });
    expect(result.botName).toBe('mybot');
    expect(result.enabled).toBe(defaultConfig.enabled);
    expect(result.webhookPath).toBe(defaultConfig.webhookPath);
    expect(result.port).toBe(defaultConfig.port);
  });

  it('should override all defaults when full config provided', () => {
    const customConfig = {
      enabled: false,
      botName: 'testbot',
      webhookPath: '/custom/webhook',
      port: 8080,
      oauth: { clientId: 'test-id', clientSecret: 'test-secret', redirectUri: 'http://localhost' },
      chatTypeCache: { ttlDays: 14 },
    };
    const result = validateConfig(customConfig);
    expect(result).toEqual(customConfig);
  });

  it('should handle enabled=false', () => {
    const result = validateConfig({ enabled: false });
    expect(result.enabled).toBe(false);
  });

  it('should handle custom port', () => {
    const result = validateConfig({ port: 5000 });
    expect(result.port).toBe(5000);
  });

  it('should handle custom webhook path', () => {
    const result = validateConfig({ webhookPath: '/api/basecamp' });
    expect(result.webhookPath).toBe('/api/basecamp');
  });
});

describe('defaultConfig', () => {
  it('should have expected default values', () => {
    expect(defaultConfig.enabled).toBe(true);
    expect(defaultConfig.botName).toBe('claudia');
    expect(defaultConfig.webhookPath).toBe('/basecamp/webhook');
    expect(defaultConfig.port).toBe(3000);
  });
});
