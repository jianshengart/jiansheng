import { ratelimit } from '@orpc/ratelimit';
import { MemoryRateLimiter } from '@orpc/ratelimit/memory';
import { defineMeta, os } from '@orpc/server';

import type { Context } from './context';

const limiter = new MemoryRateLimiter({ maxRequests: 1, window: 30_000 });
const o = os.$context<Context>();

/**
 * Marks a procedure as a read-only query that may be called over `GET` and
 * cached by the CDN. Only procedures carrying this meta accept `GET`.
 */
const [cacheableMeta, getCacheableMeta] = defineMeta(
  'jiansheng:cacheable',
  (incoming: boolean) => incoming,
);

export function isCacheableProcedure(procedure: Parameters<typeof getCacheableMeta>[0]) {
  return getCacheableMeta(procedure) === true;
}

/** For mutations and other calls with side effects. Only reachable over `POST`. */
export const publicProcedure = o;
/** For read-only queries. Reachable over `GET`, and responses are CDN-cached. */
export const publicQueryProcedure = o.meta(cacheableMeta(true));
export const rateLimitedPublicProcedure = o.use(
  ratelimit({
    limiter,
    key: ({ context }) => context.fingerprint,
  }),
);
