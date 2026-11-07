import assert from "node:assert/strict";
import { consumeHandoff, publishBuyerUpdate, submitMarketplaceBatch } from "./queue_worker.ts";

class FakeClient { async request(_path: string, _method: string, body: any) { assert.equal(body.items.length, 2); assert.equal("images" in body, false); return { job_id: "batch-7", total_count: 1 }; } }
const result = await submitMarketplaceBatch(new FakeClient() as any, [{ sellerId: "s1", image: "a", filename: "a.jpg" }, { sellerId: "s1", image: "b", filename: "b.jpg" }]);
assert.deepEqual(result, { batchId: "batch-7", accepted: 1 });
const calls: unknown[] = [];
const queueClient = { async request(path: string, method: string, body: unknown) { calls.push({ path, method, body }); } };
await publishBuyerUpdate(queueClient as any, "order-1", "batch-7", "handoff-test");
await consumeHandoff(queueClient as any, "handoff-test");
assert.deepEqual(calls, [
  { path: "/v1/queue/publish", method: "POST", body: { queue: "handoff-test", payload: JSON.stringify({ orderId: "order-1", batchId: "batch-7", state: "images_processed" }) } },
  { path: "/v1/queue/consume", method: "POST", body: { queue: "handoff-test", max_messages: 1, visibility_timeout: 30 } }
]);
console.log("batch decision test passed");
