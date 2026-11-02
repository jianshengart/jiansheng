import { RateLimitHandlerPlugin } from '@orpc/ratelimit';
import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/fetch';
import { toWebRequest } from 'h3';

import { createContext } from '../../orpc/context';
import { isCacheableProcedure } from '../../orpc/orpc';
import { router } from '../../orpc/routers';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

const handler = new RPCHandler(router, {
  // Queries come in over GET so the CDN can cache them; everything else stays POST-only.
  allowMethods: (method, procedure) =>
    method === 'POST' || (method === 'GET' && isCacheableProcedure(procedure)),
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [new RateLimitHandlerPlugin()],
});

export default defineEventHandler(async (event) => {
  const { response } = await handler.handle(toWebRequest(event), {
    prefix: '/rpc',
    context: await createContext(event),
  });

  if (!response) {
    setResponseStatus(event, 404, 'Not Found');
    return 'Not found';
  }

  if (event.method === 'GET' && response.ok) {
    response.headers.set(
      'cache-control',
      `s-maxage=1, stale-while-revalidate=${ONE_DAY_IN_SECONDS}`,
    );
  }

  return response;
});
