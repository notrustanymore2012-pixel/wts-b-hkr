import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramUserId: bigint("telegram_user_id", { mode: "number" }).notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  phoneNumber: text("phone_number"),
  agreedToTerms: boolean("agreed_to_terms").notNull().default(false),
  agreedAt: timestamp("agreed_at"),
  state: text("state"),
  contactFileId: text("contact_file_id"),
  targetPhone: text("target_phone"),
  paymentScreenshotFileId: text("payment_screenshot_file_id"),
  userRequest: text("user_request"),
  firstMessageId: bigint("first_message_id", { mode: "number" }),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
