import { db } from '@jiansheng/shared/db';
import { pageContents } from '@jiansheng/shared/schema';
import { eq, inArray } from 'drizzle-orm';
import z from 'zod';

import { publicQueryProcedure } from '../orpc';

const PAGE_SLUGS = ['about', 'contact'] as const;
const pageSlugSchema = z.enum(PAGE_SLUGS);

type PageSlug = z.infer<typeof pageSlugSchema>;

const defaultPageContent: Record<
  PageSlug,
  { title: string; description: string; markdown: string }
> = {
  about: {
    title: 'About',
    description: 'Learn more about Zhang Jiansheng and his art practice.',
    markdown: '# About\n\nThis page is currently being updated.',
  },
  contact: {
    title: 'Contact',
    description: 'Get in touch with Zhang Jiansheng Art for inquiries and collaborations.',
    markdown: `### Contact Me

I'd love to hear from you! Whether you have a project you'd like to discuss, a collaboration opportunity, or just want to say hello, feel free to reach out. I'm always interested in exploring new ideas and connecting with like-minded people.`,
  },
};

async function ensureDefaultPages() {
  const existing = await db.query.pageContents.findMany({
    where: inArray(pageContents.slug, PAGE_SLUGS),
  });

  const existingSlugs = new Set(existing.map((item) => item.slug));
  const missingSlugs = PAGE_SLUGS.filter((slug) => !existingSlugs.has(slug));

  if (!missingSlugs.length) {
    return;
  }

  await db.insert(pageContents).values(
    missingSlugs.map((slug) => ({
      slug,
      title: defaultPageContent[slug].title,
      description: defaultPageContent[slug].description,
      markdown: defaultPageContent[slug].markdown,
    })),
  );
}

export const pageContentRouter = {
  getBySlug: publicQueryProcedure
    .input(
      z.object({
        slug: pageSlugSchema,
      }),
    )
    .handler(async ({ input }) => {
      await ensureDefaultPages();

      return await db.query.pageContents.findFirst({
        where: eq(pageContents.slug, input.slug),
      });
    }),
};
