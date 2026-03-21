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
  -d '{"apiKey": "ak-your-app-api-key"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800
  },
  "msg": "App token generated successfully"
}
```

Save `data.access_token` as your `$APP_TOKEN`. It expires in 30 minutes (1800 seconds).

## Getting a User Token

With your App Token, authenticate a user:

```bash
curl -X POST https://api.1platform.pro/api/v1/users/token \
  -H "Authorization: Bearer $APP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "sk-user-abc123"}'
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800
  },
  "msg": "User token generated successfully"
}
```

Save `data.access_token` as your `$USER_TOKEN`.

## Using Both Tokens

Most endpoints require both tokens:

```bash
curl https://api.1platform.pro/api/v1/users/profile \
  -H "Authorization: Bearer $APP_TOKEN" \
  -H "x-user-token: $USER_TOKEN"
```

## Token Expiration

Both tokens expire after 30 minutes (1800 seconds). When a token expires, exchange your API key for a new one. Plan for automatic renewal before expiration.

## Security Best Practices

- Never expose API keys in client-side code
- Store tokens securely (environment variables, secrets managers)
- Rotate API keys periodically
- Use the minimum required permissions
