import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }).unique().notNull(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  workId: integer('work_id'),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 2000 }),
  active: boolean().default(true).notNull(),
  unitAmount: integer('unit_amount'),
  currency: varchar({ length: 10 }),
  metadata: text(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const productImages = pgTable(
  'product_images',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    productId: integer('product_id'),
    fileName: varchar({ length: 255 }),
    s3FileId: varchar({ length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'fk_product',
    }).onDelete('cascade'),
  ],
);

export const productRelations = relations(products, ({ many }) => ({
  images: many(productImages),
}));

export const productImageRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const contactForms = pgTable('contact_forms', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firstName: varchar({ length: 255 }).notNull(),
  lastName: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  subject: varchar({ length: 255 }).notNull(),
  message: varchar({ length: 2000 }).notNull(),
  unread: boolean().default(true).notNull(),
  starred: boolean().default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
});

export const worksCategories = pgTable('works_categories', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
});

export const workSeries = pgTable('work_series', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  titleEnglish: varchar('title_english', { length: 255 }),
  description: varchar({ length: 2000 }),
});

export const works = pgTable(
  'works',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    titleEnglish: varchar({ length: 255 }),
    description: varchar({ length: 2000 }),
    categoryId: integer('category_id'),
    seriesId: integer('series_id'),
    year: integer(),
    material: varchar({ length: 255 }),
    dimensions: varchar({ length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [worksCategories.id],
      name: 'fk_category',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.seriesId],
      foreignColumns: [workSeries.id],
      name: 'fk_series',
    }).onDelete('set null'),
  ],
);

export const workImages = pgTable(
  'work_images',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    workId: integer('work_id'),
    fileName: varchar({ length: 255 }),
    s3FileId: varchar({ length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workId],
      foreignColumns: [works.id],
      name: 'fk_work',
    }).onDelete('cascade'),
  ],
);

export const workRelations = relations(works, ({ many, one }) => ({
  images: many(workImages),
  category: one(worksCategories),
  series: one(workSeries, {
    fields: [works.seriesId],
    references: [workSeries.id],
  }),
}));

export const workImageRelations = relations(workImages, ({ one }) => ({
  work: one(works, {
    fields: [workImages.workId],
    references: [works.id],
  }),
}));

export const worksCategoryRelations = relations(worksCategories, ({ many }) => ({
  works: many(works),
}));

export const workSeriesRelations = relations(workSeries, ({ many }) => ({
  works: many(works),
}));

export const orderShipments = pgTable('order_shipments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  stripeSessionId: varchar('stripe_session_id', { length: 255 }).unique().notNull(),
  shippingStatus: varchar('shipping_status', { length: 50 }).default('pending').notNull(),
  trackingNumber: varchar('tracking_number', { length: 255 }),
  carrier: varchar({ length: 255 }),
  notes: text(),
  shippedAt: timestamp('shipped_at', { withTimezone: true, mode: 'date' }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const artActivities = pgTable('art_activities', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 2000 }),
  markdown: text(),
  date: timestamp('date', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const artActivityImages = pgTable(
  'art_activity_images',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    activityId: integer('activity_id'),
    fileName: varchar({ length: 255 }),
    s3FileId: varchar({ length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.activityId],
      foreignColumns: [artActivities.id],
      name: 'fk_activity',
    }).onDelete('cascade'),
  ],
);

export const artActivityRelations = relations(artActivities, ({ many }) => ({
  images: many(artActivityImages),
}));

export const artActivityImageRelations = relations(artActivityImages, ({ one }) => ({
  activity: one(artActivities, {
    fields: [artActivityImages.activityId],
    references: [artActivities.id],
  }),
}));

export const pageContents = pgTable('page_contents', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: varchar({ length: 255 }).unique().notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 2000 }),
  markdown: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});
