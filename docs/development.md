# Development

## Project Structure

```
openclaw-basecamp-plugin/
├── index.ts                 # Plugin entry point (object export with register)
├── openclaw.plugin.json     # Plugin manifest
├── package.json             # Dependencies + OpenClaw metadata
├── src/
│   ├── channel.ts          # Channel factory with actions & gateway webhook handling
│   ├── monitor.ts          # Webhook handler, dispatch, thinking indicator, block streaming
│   ├── send.ts             # Message formatting & sending to Basecamp
│   ├── chat-detection.ts   # Chat type detection (group vs direct) via Basecamp API
│   ├── oauth.ts            # OAuth token lifecycle (store, refresh, validate, exchange)
│   ├── config-schema.ts    # Config validation & defaults
│   ├── types.ts            # TypeScript interfaces
│   └── __tests__/          # Test files
├── docs/                    # Documentation
└── README.md
```

## Run Tests

```bash
npm test                 # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

## Type Checking

```bash
npm run type-check
```

## Linting

```bash
npm run lint
```
