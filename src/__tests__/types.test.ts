import type { 
  BasecampWebhookPayload, 
  BasecampCreator, 
  BasecampLinePayload,
  BasecampSession 
} from '../types.js';

describe('Type definitions', () => {
  it('should accept valid webhook payload', () => {
    const payload: BasecampWebhookPayload = {
      command: 'test command',
      creator: {
        id: 123,
        attachable_sgid: 'test-sgid',
        name: 'Test User',
        email_address: 'test@example.com',
        personable_type: 'User',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        admin: false,
        owner: false,
        time_zone: 'UTC',
        avatar_url: 'https://example.com/avatar.jpg'
      },
      callback_url: 'https://example.com/callback'
    };

    expect(payload.command).toBe('test command');
    expect(payload.creator.name).toBe('Test User');
    expect(payload.callback_url).toBe('https://example.com/callback');
  });

  it('should accept valid line payload', () => {
    const payload: BasecampLinePayload = {
      content: '<p>Test message</p>'
    };

    expect(payload.content).toBe('<p>Test message</p>');
  });

  it('should accept valid session', () => {
    const session: BasecampSession = {
      sessionId: 'test-session',
      callbackUrl: 'https://example.com/callback',
      lastActive: Date.now()
    };

    expect(session.sessionId).toBe('test-session');
    expect(session.callbackUrl).toBe('https://example.com/callback');
    expect(typeof session.lastActive).toBe('number');
  });

  it('should accept session with creator', () => {
    const creator: BasecampCreator = {
      id: 456,
      attachable_sgid: 'sgid-test',
      name: 'Another User',
      email_address: 'another@example.com',
      personable_type: 'User',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      admin: true,
      owner: true,
      time_zone: 'America/New_York',
      avatar_url: 'https://example.com/avatar2.jpg'
    };

    const session: BasecampSession = {
      sessionId: 'session-with-creator',
      callbackUrl: 'https://example.com/callback',
      lastActive: Date.now(),
      creator
    };

    expect(session.creator?.name).toBe('Another User');
    expect(session.creator?.admin).toBe(true);
  });
});
