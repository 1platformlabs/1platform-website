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

API_KEY = "your_api_key"
BASE_URL = "https://api.1platform.pro/api/v1"

# Get app token
response = httpx.post(f"{BASE_URL}/auth/token", json={"api_key": API_KEY})
app_token = response.json()["data"]["token"]

headers = {"Authorization": f"Bearer {app_token}"}
```

### Generate Content

```python
# Submit content generation job
response = httpx.post(
    f"{BASE_URL}/posts/content/",
    headers=headers,
    json={
        "keyword": "best seo automation tools",
        "website_id": "your_website_id",
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

const tokenRes = await fetch(`${BASE_URL}/auth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ api_key: 'your_api_key' }),
});

const { data } = await tokenRes.json();
const headers = { Authorization: `Bearer ${data.token}` };
```

### Extract Keywords

```javascript
const keywordsRes = await fetch(`${BASE_URL}/posts/keywords/`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    domain: 'example.com',
    country: 'us',
    language: 'en',
  }),
});

const keywords = await keywordsRes.json();
console.log(keywords.data);
```

## cURL

### Full Pipeline Example

```bash
# 1. Get token
TOKEN=$(curl -s -X POST https://api.1platform.pro/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_KEY"}' | jq -r '.data.token')

# 2. Extract keywords
curl -X POST https://api.1platform.pro/api/v1/posts/keywords/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "country": "us"}'

# 3. Generate content
curl -X POST https://api.1platform.pro/api/v1/posts/content/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "target keyword", "website_id": "SITE_ID"}'
```
