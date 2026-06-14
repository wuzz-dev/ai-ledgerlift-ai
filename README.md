# LedgerLift AI

LedgerLift AI is a standalone MVP for AP invoice extraction, validation, approval routing, and accounting-ready export. It includes a Vite + React + TypeScript frontend and an Express TypeScript API with deterministic demo mode when no AI keys are configured.

## Features

- Landing page with before/after AP workflow, ROI calculator, pricing, trust signals, and Open Graph metadata.
- Finance dashboard with invoice intake simulator, approval queue, anomaly flags, run history, usage credits, AI cost tracking, time saved metrics, and configuration surfaces.
- `GET /api/health` service health and provider mode.
- `POST /api/runs/invoice` structured invoice extraction, validation checks, anomaly flags, audit trail, usage accounting, and export payload.
- Provider abstraction for OpenAI, Anthropic, Gemini, and deterministic demo fallback.
- No hardcoded secrets.

## Quick Start

```bash
npm install
npm run dev
```

The Vite app runs on `http://localhost:5173` and proxies API calls to `http://localhost:8787`.

Build and run production output:

```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and fill only the providers you plan to use.

| Variable | Purpose |
| --- | --- |
| `PORT` | Express API port, defaults to `8787`. |
| `AI_PROVIDER` | `demo`, `openai`, `anthropic`, or `gemini`. |
| `OPENAI_API_KEY` | OpenAI key for invoice extraction. |
| `ANTHROPIC_API_KEY` | Anthropic key for invoice extraction. |
| `GEMINI_API_KEY` | Gemini key for invoice extraction. |
| `VITE_API_BASE_URL` | Browser API base URL for deployed frontend. |
| `STRIPE_SECRET_KEY` | Placeholder for subscription and metered billing. |
| `WEBHOOK_SIGNING_SECRET` | Placeholder for signed accounting export webhooks. |

If a requested provider key is missing, the API uses deterministic demo extraction so sales demos and builds remain stable.

## API Example

```bash
curl -X POST http://localhost:8787/api/runs/invoice \
  -H "Content-Type: application/json" \
  -d "{\"fileName\":\"invoice.txt\",\"uploadedBy\":\"ap.manager@example.com\",\"text\":\"Vendor: Northstar Office Supply\nInvoice #: INV-44821\nInvoice date: 2026-06-10\nDue date: 2026-07-10\nPO: PO-10045\nPayment terms: Net 30\nTax: 107.52\nTotal: 1451.52\"}"
```

The response includes `extracted`, `validation`, `auditTrail`, `usage`, and `exportPayload`.

## Deployment

Recommended split:

- Frontend: Vercel static deployment from `dist/client`.
- API: Render or Railway Node service running `npm start` after `npm run build`.
- Set `VITE_API_BASE_URL` to the public API URL for production frontend builds.

The included GitHub Actions workflow installs dependencies and runs the production build. Add provider keys and deployment tokens in the orchestrator-managed repository when ready.

## Production Upgrade Path

- Data: replace in-memory run history with Supabase or Postgres tables for `runs`, `vendors`, `purchase_orders`, `audit_events`, and `exports`.
- Jobs: move long-running OCR/LLM extraction to BullMQ + Redis with retry and dead-letter queues.
- Files: store invoice PDFs in S3-compatible storage with signed upload URLs.
- Billing: connect Stripe subscriptions to credit grants and meter overage invoices by processed document.
- Integrations: add QuickBooks, NetSuite, Xero, CSV SFTP, and signed webhook exports.

## Cost Optimization

- Use OCR text extraction before LLM calls and send only invoice-relevant text.
- Cache vendor and PO policy context per customer.
- Route low-value clean invoices through smaller models and reserve larger models for exceptions.
- Batch exports and audit summaries instead of generating per-event prose.

## Launch Checklist

- Define approval thresholds and duplicate invoice windows.
- Import vendor master and active PO data.
- Configure export destination and webhook signing.
- Run 50 historical invoices through demo mode, then compare extracted totals and exceptions.
- Enable provider keys for pilot customers after human review flows are accepted.

## Growth Channels

- Bookkeeper and fractional CFO partnerships.
- AP automation comparison pages focused on SMB finance teams.
- Templates for month-end close checklists and invoice exception playbooks.
- Webinars with accounting firms on reducing AP bottlenecks.
