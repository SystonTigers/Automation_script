import type { PostJob } from "./types";
import { publishViaMake } from "./adapters/make";
import { setFinalIdempotent } from "./services/idempotency";
import { getTenant } from "./services/tenants";

export default {
  async queue(batch: QueueBatch<PostJob>, env: any, ctx: ExecutionContext) {
    for (const msg of batch.messages) {
      const job = msg.body;
      try {
        const tenant = await getTenant(env, job.tenant);
        const results: Record<string, unknown> = {};

        for (const ch of job.channels) {
          // v1: all go through Make unless flags tell otherwise
          if (tenant.flags?.use_make) {
            results[ch] = await publishViaMake(env, tenant, job.template, job.data);
          } else {
            // future: direct publishers (fb/ig/yt) switch here
            results[ch] = { skipped: "no direct publisher implemented yet" };
          }
        }

        const final = { success: true, data: { results } };
        await setFinalIdempotent(env, job.idemKey, final);
        await msg.ack();
      } catch (err: any) {
        if (msg.retries < 5) {
          await msg.retry(); // CF Queues handles exponential backoff
        } else {
          const final = { success: false, error: { code: "DLQ", message: String(err?.message || err) } };
          await setFinalIdempotent(env, job.idemKey, final);
          await msg.ack();
        }
      }
    }
  }
};
