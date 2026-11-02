import { db } from '@jiansheng/shared/db';
import { env } from '@jiansheng/shared/env';
import { s3 } from '@jiansheng/shared/s3';
import { products } from '@jiansheng/shared/schema';
import { ORPCError } from '@orpc/server';
import { and, desc, eq } from 'drizzle-orm';
import Stripe from 'stripe';
import z from 'zod';

import { publicProcedure, publicQueryProcedure } from '../orpc';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export const productRouter = {
  get: publicQueryProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .handler(async ({ input }) => {
      const product = await db.query.products.findFirst({
        where: eq(products.id, input.id),
        columns: {
          id: true,
          name: true,
          description: true,
          unitAmount: true,
          currency: true,
        },
        with: {
          images: {
            columns: {
              s3FileId: true,
            },
          },
        },
      });

      if (!product) {
        return null;
      }

      return {
        ...product,
        images: product.images.map((image) => ({
          url: s3.getFileUrl(image.s3FileId),
        })),
      };
    }),

  list: publicQueryProcedure.handler(async () => {
    const productsRes = await db.query.products.findMany({
      where: eq(products.active, true),
      orderBy: [desc(products.id)],
      columns: {
        id: true,
        name: true,
        currency: true,
        unitAmount: true,
      },
      with: {
        images: {
          columns: {
            s3FileId: true,
          },
          limit: 1,
        },
      },
    });

    return productsRes.map((product) => ({
      ...product,
      images: product.images.map((image) => ({
        url: s3.getFileUrl(image.s3FileId),
      })),
    }));
  }),

  getRelated: publicQueryProcedure
    .input(
      z.object({
        workId: z.number().int().positive(),
      }),
    )
    .handler(async ({ input }) => {
      const productsRes = await db.query.products.findMany({
        where: and(eq(products.workId, input.workId), eq(products.active, true)),
        orderBy: [desc(products.id)],
        columns: {
          id: true,
          name: true,
          currency: true,
          unitAmount: true,
        },
        with: {
          images: {
            columns: {
              s3FileId: true,
            },
            limit: 1,
          },
        },
      });

      return productsRes.map((product) => ({
        ...product,
        images: product.images.map((image) => ({
          url: s3.getFileUrl(image.s3FileId),
        })),
      }));
    }),

  createCheckoutSession: publicProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              productId: z.number().int().positive(),
              quantity: z.number().int().positive(),
            }),
          )
          .min(1),
      }),
    )
    .handler(async ({ input }) => {
      const productIds = input.items.map((item) => item.productId);
      const dbProducts = await db.query.products.findMany({
        where: (p, { inArray }) => inArray(p.id, productIds),
      });

      const lineItems: { price: string; quantity: number }[] = [];

      for (const item of input.items) {
        const product = dbProducts.find((p) => p.id === item.productId);
        if (!product) {
          throw new ORPCError('NOT_FOUND', {
            message: `Product ${item.productId} not found`,
          });
        }
        if (!product.active) {
          throw new ORPCError('BAD_REQUEST', {
            message: `Product "${product.name}" is no longer available`,
          });
        }
        if (!product.stripePriceId) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: `Product "${product.name}" has no price configured`,
          });
        }

        lineItems.push({
          price: product.stripePriceId,
          quantity: item.quantity,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        shipping_address_collection: {
          allowed_countries: ['US', 'CA', 'GB', 'AU', 'CN', 'JP', 'KR', 'TW', 'HK', 'SG'],
        },
        success_url: env.STRIPE_CHECKOUT_SUCCESS_URL,
        cancel_url: env.STRIPE_CHECKOUT_CANCEL_URL,
      });

      if (!session.url) {
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          message: 'Failed to create checkout session',
        });
      }

      return { url: session.url };
    }),
};
