import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { BatchLinkPlugin } from '@orpc/client/plugins';
import type { RouterClient } from '@orpc/server';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import type { router } from '~~/server/orpc/routers';

export default defineNuxtPlugin(() => {
  const link = new RPCLink({
    url: '/rpc',
    fetch: (url, init) => globalThis.fetch(url, { ...init, credentials: 'include' }),
    // Pages fire several queries at once; send them as one request (one auth
    // session lookup and one function invocation) like tRPC's httpBatchLink did.
    plugins: [new BatchLinkPlugin({ groups: [{ condition: () => true, context: {} }] })],
  });

  const client: RouterClient<typeof router> = createORPCClient(link);

  return {
    provide: {
      orpc: createTanstackQueryUtils(client),
    },
  };
});
