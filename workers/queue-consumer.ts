import type { ExecutionContext, ExportedHandler, MessageBatch, QueueMessage } from '@cloudflare/workers-types';
import { publishViaMake } from './adapters/make';
import { publishYouTube } from './adapters/youtube';
import { ensureIdempotent } from './runtime/idempotency';
import { getTenant } from './runtime/tenant';
import type { AutomationEnv, PublishJobBody, PublishResult, TenantRecord } from './types';
import { fetchWithBackoff } from './utils/http';

interface QueueMessageBody extends PublishJobBody {}

const consumer: ExportedHandler<AutomationEnv> = {
  async queue(batch: MessageBatch<QueueMessageBody>, env: AutomationEnv, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      await handleMessage(message, env, ctx);
    }
  }
};

export default consumer;

async function handleMessage(message: QueueMessage<QueueMessageBody>, env: AutomationEnv, ctx: ExecutionContext): Promise<void> {
  const job = message.body;
  try {
    const tenant = await getTenant(env, job.tenant);
    if (!tenant) {
      console.warn('Queue message skipped – unknown tenant', { tenant: job.tenant });
      message.ack();
      return;
    }

    const idempotency = job.idempotencyKey
      ? await ensureIdempotent(env, job.tenant, { job: job.idempotencyKey }, job.idempotencyKey)
      : null;

    if (idempotency?.hit) {
      console.log('Idempotency hit for job', { key: job.idempotencyKey });
      message.ack();
      return;
    }

    const results: Record<string, PublishResult> = {};

    for (const channel of job.channels) {
      try {
        results[channel] = await publishForChannel(env, tenant, channel, job);
      } catch (error) {
        console.error('Channel publish failed', { tenant: tenant.id, channel, error: error instanceof Error ? error.message : error });
        if (!tenant.flags?.use_make && env.MAKE_WEBHOOK_URL) {
          results[channel] = await publishViaMake(env, tenant, job.template, { ...job.data, fallback_error: String(error) }, job.idempotencyKey);
          ctx.waitUntil(notifyFailure(env, tenant, channel, error));
        } else {
          message.retry();
          return;
        }
      }
    }

    message.ack();
    await idempotency?.store({ success: true, results });
  } catch (error) {
    console.error('Queue processing error', error);
    message.retry();
  }
}

async function publishForChannel(
  env: AutomationEnv,
  tenant: TenantRecord,
  channel: string,
  job: PublishJobBody
): Promise<PublishResult> {
  if (tenant.flags?.use_make || channel !== 'yt' || !tenant.flags?.direct_yt) {
    return publishViaMake(env, tenant, job.template, job.data, job.idempotencyKey);
  }

  return publishYouTube(env, tenant, job.template, job.data);
}

async function notifyFailure(env: AutomationEnv, tenant: TenantRecord, channel: string, error: unknown): Promise<void> {
  if (!env.ALERT_WEBHOOK_URL) {
    return;
  }
  try {
    await fetchWithBackoff(env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tenant: tenant.id,
        channel,
        message: error instanceof Error ? error.message : String(error)
      })
    }, 2);
  } catch (alertError) {
    console.warn('Failed to send alert notification', alertError);
  }
}
