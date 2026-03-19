---
title: "API Reference"
description: "Complete reference of all 1Platform API endpoints organized by domain."
order: 3
section: "api-reference"
---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/token` | Exchange App API key for JWT token |
| POST | `/users/token` | Exchange User API key for JWT user token |
| POST | `/users` | Register new user account |

## AI Content & SEO

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/posts/keywords/` | Extract keywords from domain |
| POST | `/posts/content/` | Submit content generation job (async) |
| GET | `/posts/content/jobs/{job_id}` | Poll content generation job status |
| POST | `/posts/indexing/` | Submit URL for Google indexing |

## AI Generations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/generations/comments` | Generate fictional comments |
| POST | `/users/generations/images` | Generate AI images or source stock |
| POST | `/users/generations/profile` | Generate complete profile cards |

## User Profile & Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Retrieve authenticated user profile |
| GET | `/users/billing` | Retrieve billing and subscription info |
| GET | `/users/subscriptions/{id}` | Get subscription plan details |
| GET | `/users/categories` | Browse content categories |

## Website Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/websites` | Add website |
| GET | `/users/websites` | List user websites |
| PATCH | `/users/websites/{id}` | Update website |
| GET | `/users/websites/{id}` | Get website details |
| DELETE | `/users/websites/{id}` | Remove website |
| POST | `/users/websites/{id}/legal` | Auto-generate legal pages |

## External Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/websites/{id}/publisuites` | Link building marketplace |
| POST | `/users/websites/{id}/searchconsole` | Google Search Console integration |

## Payments & Invoicing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/transactions` | Create payment transaction |
| GET | `/users/transactions` | Retrieve transaction history |
| POST | `/businesses` | Create business entity |
| POST | `/businesses/{id}/invoices` | Create electronic invoice (FEL) |
| GET | `/businesses/{id}/invoices` | List invoices |

For the full interactive API documentation with request/response schemas, visit [developer.1platform.pro](https://developer.1platform.pro).
