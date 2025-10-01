
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
import type { MessageBatch } from '@cloudflare/workers-types';
import type { Env, PostJob } from './types';
import { publishWithFallback } from './adapters/publisher';
import { getTenant } from './services/tenants';
import { setFinalIdempotent } from './services/idempotency';

export default {
  async queue(batch: MessageBatch<PostJob>, env: Env) {
    const promises = batch.messages.map(async (message) => {
      const job = message.body;
      try {
        const tenant = await getTenant(env, job.tenant);
        const results: Record<string, unknown> = {};
        for (const channel of job.channels) {
          results[channel] = await publishWithFallback(
            env,
            tenant,
            channel,
            job.template,
            job.data,
          );
        }
        await setFinalIdempotent(env, job.idemKey, { success: true, data: { results } });
        await message.ack();
      } catch (error) {
        console.error('Queue processing failed', { error, job });
        if (message.attempts < 5) {
          await message.retry();
        } else {
          await setFinalIdempotent(env, job.idemKey, {
            success: false,
            error: { code: 'DLQ', message: error instanceof Error ? error.message : String(error) },
          });
          await message.ack();
        }
      }
    });
    await Promise.all(promises);
  },
};
