---
title: "Webhooks"
description: "Receive real-time notifications when events occur in your 1Platform account."
order: 5
section: "webhooks"
---

## Payment Webhooks

1Platform sends webhook notifications when payment transaction statuses change.

### Webhook Endpoint

Configure your server to receive POST requests at your webhook URL.

### Webhook Payload

```json
{
  "event": "transaction.status_changed",
  "data": {
    "transaction_id": "txn_abc123",
    "status": "completed",
    "amount": 99.99,
    "currency": "GTQ",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Handling Webhooks

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhooks/payments")
async def handle_payment_webhook(request: Request):
    payload = await request.json()
    event = payload["event"]

    if event == "transaction.status_changed":
        transaction = payload["data"]
        # Process the transaction update
        print(f"Transaction {transaction['transaction_id']}: {transaction['status']}")

    return {"received": True}
```

### Security

- Verify webhook signatures when available
- Respond with a 200 status code promptly
- Process webhooks asynchronously for long-running operations
- Implement idempotency to handle duplicate deliveries

### Retry Policy

Failed webhook deliveries are retried with exponential backoff. Ensure your endpoint is reliable and responds within 10 seconds.
