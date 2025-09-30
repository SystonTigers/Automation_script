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
