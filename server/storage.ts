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
  updateUserState(telegramUserId: number, state: string): Promise<User | undefined>;
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
    const [user] = await db
      .update(users)
      .set({ agreedToTerms: true, agreedAt: new Date() })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async updateUserState(telegramUserId: number, state: string) {
    const [user] = await db
      .update(users)
      .set({ state })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveUserContactFile(telegramUserId: number, fileId: string) {
    const [user] = await db
      .update(users)
      .set({ contactFileId: fileId })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveUserTargetPhone(telegramUserId: number, targetPhone: string) {
    const [user] = await db
      .update(users)
      .set({ targetPhone })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveUserPaymentScreenshot(telegramUserId: number, fileId: string) {
    const [user] = await db
      .update(users)
      .set({ paymentScreenshotFileId: fileId })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveUserRequest(telegramUserId: number, request: string) {
    // After 900 seconds, send a message to the user asking what they want from the target number,
    // and also send it to the owner.
    const [user] = await db
      .update(users)
      .set({ userRequest: request })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }
}

export const storage = new DbStorage();