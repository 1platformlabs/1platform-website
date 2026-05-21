---
title: "Electronic Invoicing for Online Businesses"
description: "How to accept online payments and issue compliant electronic invoices from one platform — the regulatory rules, the workflow, and the integration model."
pubDate: 2026-05-20
author: "1Platform Team"
category: "payments-invoicing"
readingTime: "10 min read"
tags: ["electronic invoicing", "payments", "compliance", "ecommerce", "fel"]
---

## The Quiet Compliance Shift

For most of the last decade, electronic invoicing was something only large companies worried about. The local tax authority asked enterprises to issue digitally-signed invoices in a specific XML format, and small businesses kept printing PDFs with a logo on top.

That window has closed. Across Latin America, Southern Europe, and increasingly Asia, the rule is converging on the same shape: every commercial transaction must produce an electronic invoice, signed by an authorized provider, transmitted to the tax authority, and delivered to the customer — all within a window typically measured in hours, sometimes minutes.

If you accept online payments and you do not issue compliant electronic invoices, one of three things is true:

1. You are operating below the threshold where the authority cares (usually not for long)
2. You are exposed to fines, withheld payouts, or audits
3. You are about to lose customers who need a tax-deductible invoice you can't produce

The good news: from an engineering perspective, this problem is solved. The bad news: most teams solve it badly, by bolting an invoicing vendor onto a checkout system that knows nothing about it.

This post is about how to do it right when you are launching — or refactoring — an online business.

## What Electronic Invoicing Actually Requires

Across the markets that have implemented it, the core requirements look surprisingly similar:

- **A unique invoice identifier** issued by the tax authority, not your system. You request it from the authority (or from an authorized provider that pre-fetches a batch) and consume one per invoice.
- **A digital signature** using a certificate issued to your business. The certificate authenticates that *your* business issued the invoice, not someone using your tax ID.
- **A structured payload** (usually XML) containing buyer, seller, line items, taxes, totals, and the unique identifier.
- **A transmission step** that sends the signed payload to the authority within a deadline (often 24 or 72 hours, sometimes near-real-time).
- **A delivery step** that sends a human-readable version (PDF) to the customer along with the signed XML.
- **An archival requirement** that obligates you to keep the signed copies for several years.

What this looks like in practice is that every sale becomes a transaction that ends not when the card charges, but when the authority confirms receipt of the signed invoice.

## The Wrong Way: Invoicing as an Afterthought

The most common architecture in the wild looks like this:

1. Customer checks out, pays with a card
2. Payment processor confirms the charge
3. Webhook fires, your backend creates an order
4. A separate cron job (or a second webhook, or a manual export) pushes the order to an invoicing vendor
5. The invoicing vendor issues an invoice, fails silently if anything is wrong, and your team finds out three days later when an accountant emails

The failure modes are predictable:

- **Refunds aren't reflected** because the invoicing vendor doesn't know about the refund webhook
- **Manual order edits diverge** because the dashboard updates only the order, not the invoice
- **Failed authorizations leave ghost invoices** when invoicing fires before capture confirmation
- **Tax rates drift** because the rate lives in two places
- **Currency mismatches** between checkout and invoice because the two systems have different exchange rates

Every one of these is a real outage in production. They are not bugs you can fix once; they are integration debt that keeps producing new bugs as either system changes.

## The Right Way: Invoicing as a First-Class Step

The alternative is to treat invoicing the same way you treat payments: a built-in step in the order pipeline, owned by the same system, with the same data model.

This is what it looks like in 1Platform:

- The checkout already knows your tax ID, the customer's tax ID (if requested), the tax rate, the line items, and the currency
- When the card authorizes, the order is created
- When the card captures, the invoice is *issued in the same transaction*
- If the invoice fails (authority is down, identifier batch is exhausted, signature error), the system retries automatically and surfaces it in the dashboard
- If a refund happens, a credit note is generated automatically
- If an order is edited manually, both the order and the invoice are re-issued together

There is no second system. There is no webhook to maintain. There is no nightly export.

## What You Need to Configure

On the platform side, electronic invoicing is set up once per business. The configuration is:

- **Tax ID and legal name** — what appears on every invoice
- **Authorized provider connection** — the platform handles the integration with the authority's authorized provider for your country
- **Default tax rate** — applied to most products; per-product overrides supported
- **Invoice numbering scheme** — usually you let the platform handle it; some authorities require a specific format
- **Email recipients** — by default the customer and your finance inbox
- **Issuance trigger** — usually `on_capture` (after the payment captures); `on_authorization` is supported but rarely correct

That is it. Most stores spend less than ten minutes on this step, once.

## What Happens Per Transaction

Once configured, here is what the platform does on each sale:

```
1. Customer pays via checkout
2. Payment authorizes
3. Order created (state: authorized)
4. Payment captures
5. Order updated (state: paid)
6. Invoice payload built (line items, taxes, buyer info)
7. Payload signed with your certificate
8. Payload transmitted to the tax authority
9. Authority responds with confirmation + final invoice ID
10. PDF generated, signed XML stored
11. Customer receives invoice via email
12. Finance team copy stored in dashboard
```

Every step is visible in the order detail view. If anything fails, the failure is on the order itself, not buried in a separate vendor's dashboard.

## Refunds, Credit Notes, and Edge Cases

The hardest part of electronic invoicing is not the happy path. It is what happens when something changes after the invoice exists.

**Refund** — Most authorities require a *credit note* (also called a "nota de crédito") rather than deleting the original invoice. The credit note references the original, has its own unique ID, gets signed and transmitted separately. The platform issues it automatically when a refund is processed.

**Partial refund** — A credit note is issued for the refunded amount only. The original invoice remains valid.

**Order edit** — If an order line is corrected before the invoice is issued, the original is replaced. If after, a credit note + a new invoice is issued.

**Customer requests a different tax ID** — You can re-issue an invoice within a short window (usually the same day) by issuing a credit note for the original and a fresh invoice with the corrected tax ID.

**Voided authorization** — No invoice is issued (the trigger was `on_capture` and capture never happened).

Each of these is a built-in flow, not a manual process.

## Multiple Markets, Multiple Authorities

If you sell across borders, the requirements vary by jurisdiction:

- **Guatemala** — FEL (Factura Electrónica en Línea), validated in near-real-time
- **Mexico** — CFDI 4.0, with PAC-signed XML
- **Colombia** — DIAN-validated electronic invoice
- **Chile** — SII DTE
- **Spain** — Verifactu / SII / B2B mandate rolling out
- **Argentina** — AFIP CAE per invoice

The platform abstracts each authority behind a uniform interface. You configure once per business, and the platform routes to the right authorized provider based on the buyer's country and your tax ID. If you sell B2C cross-border, you usually only need one issuance country; if you have legal entities in multiple jurisdictions, you can configure them as separate businesses under one account.

## Why You Should Not Build This Yourself

Every team that has tried to build electronic invoicing in-house has learned the same lesson: the specification is long, the validation rules change without warning, and the authorities' test environments behave differently from production.

The platform earns its keep on this one feature alone. The integrations are maintained centrally. Schema changes are absorbed in releases. Provider outages are routed around with retries. Your team writes zero of this code.

If you are an engineer reading this and your gut says "I could probably do this in a sprint" — please don't. The thing that breaks is not the issuance. It is the long tail of edge cases that surface only at scale, and only after the law has shifted again.

## How to Add Invoicing to an Existing Business

If you already accept online payments somewhere else and you want to add compliant invoicing:

1. **Bring your payments into 1Platform** — easiest path. Once payments are on the platform, invoicing is a single toggle.
2. **Use the invoicing API standalone** — supported, but you take on the synchronization problem. Each manual invoice request includes the buyer, line items, totals, and your `business_id`. The platform issues, signs, transmits, and returns the IDs. You still need to handle refunds and credit notes from your existing payment system.

The first path is what most teams pick once they realize how much logic the second path requires them to write.

## Where to Start

The platform's invoicing flow is documented end-to-end at `developer.1platform.pro` under "Invoicing." The dashboard configuration lives under Business Settings → Invoicing.

If you are starting from scratch, the recommended order is:

1. Add at least one business with a real tax ID
2. Upload your signing certificate
3. Issue one test invoice from the dashboard
4. Wire payments through 1Platform
5. Enable automatic issuance on capture

Most teams complete this in a few hours, including waiting for the certificate upload to be verified.

Electronic invoicing is the kind of feature you only think about when it goes wrong. The point of using a platform that owns it end-to-end is that the day it would have gone wrong, you don't notice — because nothing went wrong.
