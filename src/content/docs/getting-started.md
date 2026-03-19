---
title: "Getting Started"
description: "Set up your 1Platform account and make your first API call in minutes."
order: 1
section: "getting-started"
---

## Welcome to 1Platform

1Platform is a unified API that combines AI content generation, keyword extraction, CMS publishing, indexing automation, link building, payments, and invoicing into a single integration.

## Quick Start

### 1. Create Your Account

Sign up at [app.1platform.pro](https://app.1platform.pro) to get your API key.

### 2. Get Your Token

Exchange your API key for a JWT access token:

```bash
curl -X POST https://api.1platform.pro/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}'
```

### 3. Make Your First Request

Test your connection with a simple profile request:

```bash
curl https://api.1platform.pro/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Base URL

All API requests go to:

```
https://api.1platform.pro/api/v1/
```

## Response Format

Every response follows a consistent JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "msg": "Operation completed successfully"
}
```

## Rate Limits

| Category | Limit |
|----------|-------|
| Health | 100 req/min |
| Auth | 10 req/min |
| Read | 50 req/min |
| Write | 20 req/min |
| Keywords | 10 req/min |
| Content | 5 req/min |
| Indexing | 20 req/min |

## Interactive API Docs

For a complete interactive reference with try-it-out capability, visit [developer.1platform.pro](https://developer.1platform.pro).

## Next Steps

- [Authentication](/docs/authentication/) — Learn about the dual-token system
- [API Reference](/docs/api-reference/) — Explore all available endpoints
- [Code Examples](/docs/code-examples/) — Copy-paste examples in multiple languages
