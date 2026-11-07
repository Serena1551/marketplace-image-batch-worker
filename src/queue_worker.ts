import { z } from "zod";
import { InfraiClient } from "./infra_client.ts";

export const assetSchema = z.object({ sellerId: z.string().min(1), image: z.string().min(1), filename: z.string().min(1) });
export type Asset = z.infer<typeof assetSchema>;
export type BatchResult = { batchId: string; accepted: number };

export async function submitMarketplaceBatch(client: InfraiClient, assets: Asset[]): Promise<BatchResult> {
  const parsed = z.array(assetSchema).min(1).parse(assets);
  const data = await client.request<{ job_id: string; total_count: number }>("/v1/image/batch/submit", "POST", { items: parsed }, `batch-${parsed.map(a => a.image).join("-")}`);
  return { batchId: data.job_id, accepted: data.total_count };
}

export async function publishBuyerUpdate(client: InfraiClient, orderId: string, batchId: string, queue: string) {
  return client.request("/v1/queue/publish", "POST", { queue, payload: JSON.stringify({ orderId, batchId, state: "images_processed" }) }, `order-${orderId}-${batchId}`);
}

export async function consumeHandoff(client: InfraiClient, queue: string) {
  return client.request("/v1/queue/consume", "POST", { queue, max_messages: 1, visibility_timeout: 30 });
}
