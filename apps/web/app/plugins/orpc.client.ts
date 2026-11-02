import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import type { TanstackQueryOperationContext } from '@orpc/tanstack-query';
import {
  createTanstackQueryUtils,
  TANSTACK_QUERY_OPERATION_CONTEXT_SYMBOL,
} from '@orpc/tanstack-query';
import type { router } from '~~/server/orpc/routers';

export default defineNuxtPlugin(() => {
  const link = new RPCLink<TanstackQueryOperationContext>({
    url: '/rpc',
    // Send queries as GET so the CDN can cache them (only procedures built with
    // `publicQueryProcedure` accept GET). Mutations and direct `.call()`s stay POST.
    method: ({ context }) =>
      context[TANSTACK_QUERY_OPERATION_CONTEXT_SYMBOL]?.type === 'query' ? 'GET' : 'POST',
    fetch: (url, init) => globalThis.fetch(url, { ...init, credentials: 'include' }),
  });

  const client: RouterClient<typeof router, TanstackQueryOperationContext> = createORPCClient(link);

  return {
    provide: {
      orpc: createTanstackQueryUtils(client),
    },
  };
});
