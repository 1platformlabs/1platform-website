---
title: "Integrating Payments Into Your SaaS: A Practical Guide to the Payments API"
description: "A developer-focused walkthrough of adding a payments API to your SaaS — checkout URLs, webhooks, balances, refunds, and the architectural decisions that matter."
pubDate: 2026-05-20
author: "1Platform Team"
category: "payments-invoicing"
readingTime: "11 min read"
tags: ["payments api", "saas", "developer", "webhooks", "billing"]
---

## What "Integrating Payments" Actually Means

The phrase is shorter than the work. When a SaaS says "we are adding payments," there are usually four distinct features hiding behind one ticket:

1. **Checkout** — a hosted page where a user enters a card and gets charged
2. **Webhooks** — server-to-server events when something happens to that charge
3. **Balance and ledger** — an internal record of who paid what and how much they have left
4. **Refunds, retries, and disputes** — the parts the demo never shows

Each of those is a complete system on its own. Done poorly, you ship a checkout that works for happy-path customers and produces support tickets for everyone else. Done well, you ship something that survives the first chargeback, the first webhook outage, and the first time a marketing experiment doubles your traffic.

This post is a developer-focused walkthrough of doing the work well using the 1Platform payments API. The same principles apply if you use a different processor — the platform is just the example.

## The Two-Token Model in 30 Seconds

If you have not integrated with the 1Platform API before, the auth model matters because it affects how you wire payments:

- **App token** (`Authorization: Bearer ak-...`) — server-side, identifies *your application* to the platform
- **User token** (`x-user-token: sk-...`) — identifies *one of your users* whose balance the operation affects

Most payment endpoints require both. The app token says "this request is coming from MyApp." The user token says "and the user it concerns is `user_abc123`." This split lets you reason about authorization without leaking app-level credentials to the browser.

For checkout URL generation, you call the API from your backend (with both tokens). The browser never sees either token; it only sees the resulting checkout URL.

## Step 1 — Generate a Checkout URL

The checkout URL is the centerpiece of the integration. Your backend calls the platform with the amount, the description, and a few options; the platform returns a URL you redirect the user to.

```bash
curl -X POST https://api.1platform.pro/api/v1/users/transactions/checkout \
  -H "Authorization: Bearer $APP_TOKEN" \
  -H "x-user-token: $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 49.00,
    "currency": "USD",
    "description": "Pro plan — monthly",
    "metadata": {
      "plan_id": "pro_monthly",
      "internal_user_id": "u_842"
    },
    "success_url": "https://myapp.com/billing/thanks",
    "cancel_url": "https://myapp.com/billing"
  }'
```

The response contains a `checkout_url` you redirect the browser to. The `metadata` field is a free-form object — anything you put there comes back to you on every webhook for this transaction, which is what lets you reconcile platform events with your internal records.

Two implementation notes:

- The `success_url` and `cancel_url` are where the user lands after the flow. Use them to update the UI optimistically, but **never** mark the user as paid based on hitting `success_url`. The user reaches that URL when the *redirect* completes, not when the *payment* completes. Mark the user as paid only when the webhook arrives.
- `metadata` is your reconciliation key. Put your internal user ID, your internal order ID, anything you need. It is round-tripped on every event.

## Step 2 — Handle Webhooks

The webhook is what tells you the payment actually happened. The platform sends one to a URL you configure, signed with an HMAC of your secret.

The events you care about for payments are:

- `transaction.created` — the customer arrived at checkout (rare to act on)
- `transaction.approved` — the card authorized successfully
- `transaction.captured` — the charge captured and the funds moved
- `transaction.declined` — the card was rejected
- `transaction.refunded` — a refund was issued
- `transaction.disputed` — the customer filed a chargeback

The minimum viable webhook handler looks like this in pseudocode:

```
1. Verify HMAC signature against your secret
2. Parse the event
3. If the event_id was already processed, return 200 (idempotency)
4. Persist the event to your DB
5. Update the user record based on event.type and event.metadata
6. Return 200
```

A few things that trip people up:

- **Verify the signature first.** Always. Otherwise an attacker can forge `transaction.captured` events and grant themselves access.
- **Idempotency is required, not optional.** The platform retries on any non-2xx response, and a network glitch on your side will produce duplicate deliveries even if you returned 200. Keep a table of `event_id` → status.
- **Do not block the response.** Process the event asynchronously if it takes more than a second or two. The platform expects a fast 2xx; long-running tasks belong in a background job triggered by the event.
- **Test the failure path.** Replay an event after marking it processed and verify your handler does nothing.

## Step 3 — Maintain Your Internal Balance Model

If your SaaS is consumption-based (per-API-call, per-message, per-render), you need an internal balance.

The platform itself maintains a balance per user that you can read and adjust:

- `GET /api/v1/users/me/billing` — current balance, monthly usage, plan
- `POST /api/v1/users/balance/credit` — credit the balance (after a successful payment)
- `POST /api/v1/users/balance/debit` — debit the balance (after a successful operation)

The pattern that works:

- **Don't manage two ledgers.** Use the platform's balance as the source of truth. Your own DB caches it.
- **Debit before the operation, not after.** Reserve the balance, perform the operation, commit or refund.
- **Make refunds idempotent.** If you refund $5 twice because two webhooks fired, your support team will hate you.

A consumption flow looks like:

```
1. User triggers operation in your app
2. Your backend calls debit(user, cost)
3. If debit fails (insufficient balance), return 402 to the client
4. Perform the operation
5. If the operation fails, refund(user, cost)
6. Return result
```

The `402 Payment Required` response is standardized in the API — your frontend can detect it and offer the user a top-up flow without your code special-casing each endpoint.

## Step 4 — Build the Top-Up Flow

When a user runs out of balance, they need a fast path back to "paying customer." The shortest version:

1. Frontend hits a debit-protected endpoint and receives 402
2. Frontend shows a modal with three suggested top-up amounts and a custom field
3. User picks an amount
4. Frontend calls your backend to generate a checkout URL with the chosen amount
5. User redirects to checkout, pays
6. Webhook fires `transaction.captured`
7. Your webhook handler calls `credit(user, amount)`
8. Frontend polls the user balance until it updates (or use the platform's webhook → in-app notification flow)

The polling step is often skipped on first implementation and surfaces as a "I paid but I have no credits" support ticket. Solve it by either polling (simple) or by pushing the update to the client via SSE/WebSocket (cleaner).

## Step 5 — Subscriptions vs. Pay-as-You-Go

If your SaaS has both flat-rate plans and consumption pricing, you need to decide how they interact.

The model the platform supports out of the box:

- **Plan** = a recurring fee that grants a monthly allowance (or unlimited usage of some endpoints)
- **Balance** = top-up credits used for any consumption beyond the allowance

A user on the "Pro" plan gets a monthly allowance of N units; once they exceed it, the balance is consumed; once the balance is empty, the next operation returns 402. The platform handles the renewal billing as recurring transactions, which fire the same webhooks as one-off charges.

The implementation cost is mostly making your API surface honest about which endpoints are plan-included and which are pay-per-call. The platform gives you a per-endpoint pricing config and a `X-Operation-Cost` response header so the frontend can show the cost of every call before it runs.

## Step 6 — Refunds, Disputes, and the Long Tail

The unglamorous part of the integration.

**Refunds** — `POST /api/v1/users/transactions/{id}/refund` with an optional `amount` (full refund if omitted). The webhook fires `transaction.refunded`. If invoicing is enabled, a credit note is issued automatically. Your handler should debit the user's balance by the refunded amount.

**Disputes** — Out of your control. The platform notifies you with `transaction.disputed`. You usually have a window to upload evidence; check the platform dashboard. Disputes cost the chargeback fee even if you win, so the right strategy is to prevent them with clear billing descriptors, accessible refund policies, and prompt customer support.

**Failed renewals** — A subscription renewal can fail (expired card, insufficient funds). The webhook fires `transaction.declined`. You usually want to retry once with a delay and then downgrade the user to a free tier rather than locking them out.

**Currency switching** — If you sell across regions, decide once whether you charge in the user's local currency (better UX, exchange-rate risk on your side) or in a single base currency (simpler accounting, friction on the customer side). The platform supports both; the API call differs only in the `currency` field.

## What Not to Do

A short list of mistakes that come up regularly:

- **Don't mark users as paid in `success_url`.** Wait for the webhook.
- **Don't trust unsigned webhooks.** Verify HMAC.
- **Don't write `if amount == 49.00` checks in your handler.** Use `metadata` to identify the plan, then look up the price from your config.
- **Don't poll the platform every minute to check transaction status.** Webhooks are designed for this.
- **Don't run debit and operation in different transactions if your DB supports a single one.** A partial failure that debits without performing the operation is a bad bug.
- **Don't store card numbers.** The platform's checkout is hosted for a reason. You should never see, log, or touch a PAN.

## Where to Start

The full payments API is documented at `developer.1platform.pro` under "Payments." The end-to-end Payments + Invoicing flow walks through every endpoint mentioned above with copy-pasteable examples.

For a SaaS that already has users and just needs to add payments, the minimum integration is:

1. One backend endpoint that generates checkout URLs
2. One webhook handler for `transaction.captured` and `transaction.refunded`
3. One UI modal that opens the checkout URL when a user hits 402
4. One internal job that retries failed renewals

Most teams ship the first version in a few days and harden it across two iterations. The platform handles compliance, PCI scope, fraud screening, and authority reporting; your team focuses on the integration logic that lives on top.

If you want to talk through architectural decisions for a non-trivial billing model — usage caps, team accounts, prorated upgrades — the developer page at `/for-developers/` is the right entry point.

Payments is one of those features that looks easy from the marketing pages and turns into a multi-quarter project when you do it from scratch. The point of building on a payments API that already owns the hard parts is that the work you ship is the work your users actually notice.
