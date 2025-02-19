import { pgTable, uuid, varchar, timestamp, jsonb, text } from "drizzle-orm/pg-core";

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  storageId: uuid("storage_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'file' | 'directory'
  parentId: uuid("parent_id").references(() => files.id),
  path: text("path").notNull(),
  mimeType: varchar("mime_type", { length: 255 }),
  size: varchar("size", { length: 20 }), // string으로 저장하여 큰 파일 크기도 처리
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}),
});

// TypeScript 타입 정의
export type FileEntry = typeof files.$inferSelect;
export type NewFileEntry = typeof files.$inferInsert;
