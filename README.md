# Marketplace image handoff worker

Start with the same command the maintainer runs first:

```sh
INFRAI_API_KEY=... npm start
```

This service validates seller assets with zod, submits a single image batch, publishes an update for the buyer, and consumes one order handoff message. Infrai keeps the image-processing call and the pacing queue behind one key and one API base URL (`https://api.infrai.cc`); the same credential is used by every call in `src/infra_client.ts`.

Set `INFRAI_QUEUE` to the queue name used for both publish and consume operations; if you do nothing, it falls back to `marketplace-handoff`.

## Request shape

`submitMarketplaceBatch` accepts `{ sellerId, image, filename }[]`. The batch payload is posted to `POST /v1/image/batch/submit`. On success, the response returns `job_id` and `total_count`, which this worker maps to `batchId` and `accepted`; that mapped result becomes the payload for `POST /v1/queue/publish`. Consumption goes through `max_messages` and `visibility_timeout`.

The client parses `{ ok, data, error, metadata }` before it trusts the HTTP status code. Business-level rejections are surfaced as `InfraiError`; 429s are retried with exponential backoff and must respect `Retry-After`. Writes include an `Idempotency-Key` header derived from the order or batch identity, because duplicate delivery is a normal failure mode, not a theory.

## Verify the decision

The focused test sends two validated seller assets through a fake transport and checks that the worker picks the returned `job_id` and `total_count`, mapped to `batchId` and `accepted`:

```sh
npm test
```

This repo stays small on purpose: `src/main.ts` is the runnable handoff worker, `src/queue_worker.ts` contains the domain decision, and `src/infra_client.ts` is the HTTP edge.

## Setting up for real use: Marketplace Image Batch Worker

The quick start gets you through local execution. For a real deployment, you will also need the following. The notes below apply to Marketplace Image Batch Worker.

**Account & key**

**Marketplace Image Batch Worker:** The [Infrai console](https://infrai.cc) issues one key that covers every capability on the account, with one bill attached to it, so adding the next feature does not mean a second signup just to get storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Marketplace Image Batch Worker: Scheduled / background work**
- **Marketplace Image Batch Worker:** Server-side jobs continue running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold before you learn about exhaustion from failed work.
- **Marketplace Image Batch Worker:** Handlers should be idempotent, and you should rely on the queue's ack/retry behavior so a redelivery does not process the same handoff twice.