import { InfraiClient } from "./infra_client.ts";
import { consumeHandoff, publishBuyerUpdate, submitMarketplaceBatch } from "./queue_worker.ts";

const client = new InfraiClient();
const queue = process.env.INFRAI_QUEUE ?? "marketplace-handoff";
const assets = [{ sellerId: "seller-42", image: "img_001", filename: "shoe-front.jpg" }, { sellerId: "seller-42", image: "img_002", filename: "shoe-side.jpg" }];
const batch = await submitMarketplaceBatch(client, assets);
await publishBuyerUpdate(client, "order-9081", batch.batchId, queue);
const handoff = await consumeHandoff(client, queue);
console.log(JSON.stringify({ batch, handoff }));
