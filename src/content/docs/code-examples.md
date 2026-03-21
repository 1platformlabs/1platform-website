---
title: "Code Examples"
description: "Ready-to-use code examples in Python, JavaScript, and cURL for common 1Platform API operations."
order: 4
section: "code-examples"
---

## Python

### Authentication

```python
import httpx

APP_API_KEY = "ak-your-app-api-key"
USER_API_KEY = "sk-user-abc123"
BASE_URL = "https://api.1platform.pro/api/v1"

# Get app token
response = httpx.post(f"{BASE_URL}/auth/token", json={"apiKey": APP_API_KEY})
app_token = response.json()["data"]["access_token"]

# Get user token
response = httpx.post(
    f"{BASE_URL}/users/token",
    headers={"Authorization": f"Bearer {app_token}"},
    json={"apiKey": USER_API_KEY},
)
user_token = response.json()["data"]["access_token"]

headers = {
    "Authorization": f"Bearer {app_token}",
    "x-user-token": user_token,
}
```

### Generate Content

```python
# Submit content generation job
response = httpx.post(
    f"{BASE_URL}/posts/content/",
    headers=headers,
    json={
        "keyword": "best seo automation tools",
        "lang": "en",
        "country": "us",
    },
)
job_id = response.json()["data"]["job_id"]

# Poll for completion
import time
while True:
    status = httpx.get(
        f"{BASE_URL}/posts/content/jobs/{job_id}",
        headers=headers,
    ).json()
    if status["data"]["status"] == "completed":
        article = status["data"]["result"]
        break
    time.sleep(5)
```

## JavaScript (Node.js)

### Authentication

```javascript
const BASE_URL = 'https://api.1platform.pro/api/v1';

// Get app token
const appRes = await fetch(`${BASE_URL}/auth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ apiKey: 'ak-your-app-api-key' }),
});
const appToken = (await appRes.json()).data.access_token;

// Get user token
const userRes = await fetch(`${BASE_URL}/users/token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${appToken}`,
  },
  body: JSON.stringify({ apiKey: 'sk-user-abc123' }),
});
const userToken = (await userRes.json()).data.access_token;

const headers = {
  Authorization: `Bearer ${appToken}`,
  'x-user-token': userToken,
  'Content-Type': 'application/json',
};
```

### Extract Keywords

```javascript
const keywordsRes = await fetch(`${BASE_URL}/posts/keywords/`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    domain: 'example.com',
    country: 'us',
    lang: 'en',
  }),
});

const keywords = await keywordsRes.json();
console.log(keywords.data);
```

## cURL

### Full Pipeline Example

```bash
# 1. Get app token
APP_TOKEN=$(curl -s -X POST https://api.1platform.pro/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "ak-your-app-api-key"}' | jq -r '.data.access_token')

# 2. Get user token
USER_TOKEN=$(curl -s -X POST https://api.1platform.pro/api/v1/users/token \
  -H "Authorization: Bearer $APP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "sk-user-abc123"}' | jq -r '.data.access_token')

# 3. Extract keywords
curl -X POST https://api.1platform.pro/api/v1/posts/keywords/ \
  -H "Authorization: Bearer $APP_TOKEN" \
  -H "x-user-token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "country": "us", "lang": "en"}'

# 4. Generate content
curl -X POST https://api.1platform.pro/api/v1/posts/content/ \
  -H "Authorization: Bearer $APP_TOKEN" \
  -H "x-user-token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "target keyword", "lang": "en", "country": "us"}'
```
