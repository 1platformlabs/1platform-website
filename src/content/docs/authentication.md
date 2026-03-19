---
title: "Authentication"
description: "Learn how the dual-token authentication system works in the 1Platform API."
order: 2
section: "authentication"
---

## Dual-Token System

1Platform uses a two-token authentication model for enhanced security:

1. **App Token** — Identifies your application. Sent via `Authorization: Bearer` header.
2. **User Token** — Identifies the user within your application. Sent via `x-user-token` header.

## Getting Your App Token

Exchange your App API key for a JWT token:

```bash
curl -X POST https://api.1platform.pro/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_APP_API_KEY"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## Getting a User Token

With your App Token, create or authenticate a user:

```bash
curl -X POST https://api.1platform.pro/api/v1/users/token \
  -H "Authorization: Bearer YOUR_APP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"api_key": "USER_API_KEY"}'
```

## Using Both Tokens

Most endpoints require both tokens:

```bash
curl https://api.1platform.pro/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_APP_TOKEN" \
  -H "x-user-token: YOUR_USER_TOKEN"
```

## Token Expiration

Tokens have a limited lifetime. When a token expires, exchange your API key for a new one. The response will include expiration information.

## Security Best Practices

- Never expose API keys in client-side code
- Store tokens securely (environment variables, secrets managers)
- Rotate API keys periodically
- Use the minimum required permissions
