import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { eq } from "drizzle-orm";
import { users, type User, type InsertUser } from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getUserByTelegramId(telegramUserId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAgreement(telegramUserId: number): Promise<User | undefined>;
}

export class DbStorage implements IStorage {
  async getUserByTelegramId(telegramUserId: number): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.telegramUserId, telegramUserId))
      .limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserAgreement(telegramUserId: number): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({
        agreedToTerms: true,
        agreedAt: new Date(),
      })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return result[0];
  }
}

export const storage = new DbStorage();
