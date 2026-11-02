import { db } from '@jiansheng/shared/db';
import { s3 } from '@jiansheng/shared/s3';
import { works, workSeries } from '@jiansheng/shared/schema';
import { desc, eq } from 'drizzle-orm';
import z from 'zod';

import { publicQueryProcedure } from '../orpc';

export const workRouter = {
  listSeries: publicQueryProcedure.handler(async () => {
    const res = await db.query.workSeries.findMany({
      orderBy: [desc(workSeries.id)],
      with: {
        works: {
          columns: {
            id: true,
          },
          orderBy: [desc(works.id)],
          with: {
            images: {
              columns: {
                s3FileId: true,
              },
              limit: 1,
            },
          },
          limit: 4,
        },
      },
    });

    return res.map((series) => ({
      ...series,
      works: series.works.map((work) => ({
        ...work,
        images: work.images.map((image) => ({
          url: s3.getFileUrl(image.s3FileId),
        })),
      })),
    }));
  }),

  getSeries: publicQueryProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .handler(async ({ input }) => {
      const series = await db.query.workSeries.findFirst({
        where: eq(workSeries.id, input.id),
        with: {
          works: {
            orderBy: [desc(works.id)],
            columns: {
              id: true,
            },
            with: {
              images: {
                columns: {
                  s3FileId: true,
                },
                limit: 1,
              },
            },
          },
        },
      });

      if (!series) {
        return null;
      }

      return {
        ...series,
        works: series.works.map((work) => ({
          ...work,
          images: work.images.map((image) => ({
            url: s3.getFileUrl(image.s3FileId),
          })),
        })),
      };
    }),

  get: publicQueryProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .handler(async ({ input }) => {
      const work = await db.query.works.findFirst({
        where: eq(works.id, input.id),
        with: {
          images: true,
          series: true,
        },
      });

      if (!work) {
        return null;
      }

      return {
        ...work,
        images: work.images.map((image) => ({
          url: s3.getFileUrl(image.s3FileId),
        })),
      };
    }),

  list: publicQueryProcedure.handler(async () => {
    const workRes = await db.query.works.findMany({
      orderBy: [desc(works.id)],
      with: {
        images: true,
        series: true,
      },
    });

    return workRes.map((work) => ({
      ...work,
      images: work.images.map((image) => ({
        url: s3.getFileUrl(image.s3FileId),
      })),
    }));
  }),
};
