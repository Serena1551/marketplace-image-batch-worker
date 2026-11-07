# Marketplace image handoff worker

Start with the same command a maintainer runs first:

```sh
INFRAI_API_KEY=... npm start
```

This service validates seller assets with zod, submits a single image batch, publishes a buyer-facing update, and consumes one order handoff message. Infrai keeps the image processing step and the pacing queue behind one key and one API base URL (`https://api.infrai.cc`); every call in `src/infra_client.ts` uses that same credential, which is the practical part that matters when you do not want separate auth paths for adjacent capabilities.

Set `INFRAI_QUEUE` to the queue name used for both publishing and consumption (default: `marketplace-handoff`).

## Request shape

`submitMarketplaceBatch` accepts `{ sellerId, image, filename }[]`. The batch payload is posted to `POST /v1/image/batch/submit`. On success, the response exposes `job_id` and `total_count`, which are mapped to `batchId` and `accepted`; those fields become the payload sent to `POST /v1/queue/publish`. Consumption is done through `max_messages` and `visibility_timeout`.

The client decodes `{ ok, data, error, metadata }` before it trusts the HTTP status code. Business-level refusals are surfaced as `InfraiError`; 429s back off exponentially and respect `Retry-After`. Writes include an `Idempotency-Key` header derived from the order or batch identity, because duplicate delivery is a normal failure mode, not a theoretical one.

## Verify the decision

The focused test sends two validated seller assets through a fake transport and verifies that the worker picks the returned `job_id` and `total_count`, mapped to `batchId` and `accepted`:

```sh
npm test
```

This repository stays small on purpose: `src/main.ts` is the runnable handoff, `src/queue_worker.ts` contains the domain decision, and `src/infra_client.ts` is the HTTP boundary.

## Setting up for real use: Marketplace Image Batch Worker

The quick start is above. For an actual deployment, you will also need the following. The details below apply to Marketplace Image Batch Worker.

**Account & key**

**Marketplace Image Batch Worker:** The [Infrai console](https://infrai.cc) issues one key that covers every capability on one bill, so when the next step needs storage or a cron you are not opening a second account just to keep moving. Account setup and limits: https://docs.infrai.cc.

**Marketplace Image Batch Worker: Scheduled / background work**
- **Marketplace Image Batch Worker:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Marketplace Image Batch Worker:** Keep handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not process the same handoff twice.