import { RPCJsonSerializer } from '@orpc/client';
import type { DehydratedState } from '@tanstack/vue-query';
import { QueryClient, VueQueryPlugin, dehydrate, hashKey, hydrate } from '@tanstack/vue-query';

const serializer = new RPCJsonSerializer();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        queryKeyHashFn: (queryKey) => {
          const { json, meta } = serializer.serializeJson(queryKey);
          return hashKey([json, meta?.map((entry) => JSON.stringify(entry)).sort()]);
        },
      },
      dehydrate: {
        serializeData: (data) => {
          const { json, meta } = serializer.serializeJson(data);
          return { json, meta };
        },
      },
      hydrate: {
        deserializeData(data) {
          return serializer.deserializeJson(data);
        },
      },
    },
  });
}

export default defineNuxtPlugin({
  name: 'vue-query',
  enforce: 'pre',
  setup(nuxt) {
    const vueQueryState = useState<DehydratedState | null>('vue-query', () => null);
    const queryClient = createQueryClient();

    nuxt.vueApp.use(VueQueryPlugin, { queryClient });

    if (import.meta.server) {
      nuxt.hooks.hook('app:rendered', () => {
        vueQueryState.value = dehydrate(queryClient);
      });
    }

    if (import.meta.client && vueQueryState.value) {
      hydrate(queryClient, vueQueryState.value);
    }
  },
});
