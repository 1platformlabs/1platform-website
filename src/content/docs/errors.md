---
title: "Error Handling"
description: "Understanding error responses, status codes, and rate limit handling in the 1Platform API."
order: 6
section: "errors"
---

## Error Response Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "data": null,
  "msg": "Descriptive error message"
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request — invalid parameters |
| 401 | Unauthorized — invalid or missing token |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource doesn't exist |
| 422 | Validation Error — check request body |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error — contact support |

## Rate Limiting

When you exceed a rate limit, you'll receive a 429 response with headers indicating when you can retry:

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312800
```

### Handling Rate Limits

```python
import time

def make_request(url, headers):
    response = httpx.get(url, headers=headers)

    if response.status_code == 429:
        reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
        wait = max(reset_time - time.time(), 1)
        time.sleep(wait)
        return make_request(url, headers)

    return response
```

## Common Errors

### Invalid Token

```json
{
  "success": false,
  "msg": "Token has expired or is invalid"
}
```

**Fix:** Exchange your API key for a new token.

### Insufficient Credits

```json
{
  "success": false,
  "msg": "Insufficient credits for this operation"
}
```

**Fix:** Top up your account balance or upgrade your plan.

### Validation Error

```json
{
  "success": false,
  "msg": "Field 'keyword' is required"
}
```

**Fix:** Check the required fields in the [API reference](/docs/api-reference/).
