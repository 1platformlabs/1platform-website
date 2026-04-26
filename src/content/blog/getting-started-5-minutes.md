---
title: "Getting Started With 1Platform: From Zero to Published Content in 5 Minutes"
description: "A quick-start tutorial showing how to go from account creation to your first published article using the 1Platform API."
pubDate: 2024-10-25
author: "1Platform Team"
category: "api-tutorials"
readingTime: "5 min read"
tags: ["tutorial", "getting-started", "api", "quickstart"]
---

## Prerequisites

All you need is a 1Platform account and a tool to make HTTP requests (cURL, Postman, or any programming language).

## Step 1: Get Your API Token

After creating your account, exchange your API key for a JWT token:

```bash
curl -X POST https://api.1platform.pro/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}'
```

## Step 2: Add Your Website

Register your website with the platform:

```bash
curl -X POST https://api.1platform.pro/api/v1/users/websites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url": "https://yourblog.com", "name": "My Blog"}'
```

## Step 3: Generate Your First Article

Submit a content generation job:

```bash
curl -X POST https://api.1platform.pro/api/v1/posts/content/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"keyword": "your target keyword", "website_id": "WEBSITE_ID"}'
```

## Step 4: Check Job Status

Content generation is async. Poll the job status:

```bash
curl https://api.1platform.pro/api/v1/posts/content/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Step 5: Publish

Once the job completes, the content is ready. If you have CMS publishing configured, it can be published automatically.

That's it! From account creation to published content in 5 steps. Check our [full documentation](https://developer.1platform.pro/) for advanced features.
