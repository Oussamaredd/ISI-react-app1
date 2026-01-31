import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const hotels = pgTable('hotels', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role').default('agent').notNull(),
  hotelId: uuid('hotel_id')
    .notNull()
    .references(() => hotels.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('open').notNull(),
  priority: text('priority').default('medium').notNull(),
  requesterId: uuid('requester_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  hotelId: uuid('hotel_id')
    .notNull()
    .references(() => hotels.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  contentType: text('content_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const hotelsRelations = relations(hotels, ({ many }) => ({
  tickets: many(tickets),
  users: many(users),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  hotel: one(hotels, {
    fields: [users.hotelId],
    references: [hotels.id],
  }),
  assignedTickets: many(tickets, {
    relationName: 'tickets_assigneeId_users_id',
  }),
  requestedTickets: many(tickets, {
    relationName: 'tickets_requesterId_users_id',
  }),
  comments: many(comments),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  hotel: one(hotels, {
    fields: [tickets.hotelId],
    references: [hotels.id],
  }),
  requester: one(users, {
    fields: [tickets.requesterId],
    references: [users.id],
    relationName: 'tickets_requesterId_users_id',
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: 'tickets_assigneeId_users_id',
  }),
  comments: many(comments),
  attachments: many(attachments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export type Hotel = typeof hotels.$inferSelect;
export type User = typeof users.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
