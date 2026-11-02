import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/fetch';
import { BatchHandlerPlugin } from '@orpc/server/plugins';
import { toWebRequest } from 'h3';

import { createContext } from '../../orpc/context';
import { router } from '../../orpc/routers';

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [new BatchHandlerPlugin()],
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

  return response;
});
