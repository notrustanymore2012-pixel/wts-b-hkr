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

  async saveUserContactFile(telegramUserId: number, contactFileId: string) {
    const [user] = await db
      .update(users)
      .set({ contactFileId })
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

  async saveUserPaymentScreenshot(telegramUserId: number, paymentScreenshotFileId: string) {
    const [user] = await db
      .update(users)
      .set({ paymentScreenshotFileId })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveUserRequest(telegramUserId: number, userRequest: string) {
    const [user] = await db
      .update(users)
      .set({ userRequest })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveUserPhoneNumber(telegramUserId: number, phoneNumber: string) {
    const [user] = await db
      .update(users)
      .set({ phoneNumber })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveFirstMessageId(telegramUserId: number, firstMessageId: number) {
    const [user] = await db
      .update(users)
      .set({ firstMessageId })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveUserPhoneNumber(telegramUserId: number, phoneNumber: string) {
    const [user] = await db
      .update(users)
      .set({ phoneNumber })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async saveFirstMessageId(telegramUserId: number, firstMessageId: number) {
    const [user] = await db
      .update(users)
      .set({ firstMessageId })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async getUserFirstMessageId(telegramUserId: number): Promise<number | null> {
    const user = await this.getUserByTelegramId(telegramUserId);
    return user?.firstMessageId || null;
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
    const [user] = await db
      .update(users)
      .set({ userRequest: request })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return user;
  }

  async updateLinkCounter(telegramUserId: number): Promise<User | undefined> {
    const user = await this.getUserByTelegramId(telegramUserId);
    if (!user) return undefined;
    
    const newCounter = ((user.linkCounter || 0) + 1) % 10;
    const [updatedUser] = await db
      .update(users)
      .set({ linkCounter: newCounter })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return updatedUser;
  }

  async getCurrentLink(telegramUserId: number): Promise<string> {
    const links = [
      "https://otieu.com/4/10300338",
      "https://otieu.com/4/10300426",
      "https://otieu.com/4/10300428",
      "https://otieu.com/4/10300429",
      "https://otieu.com/4/10300447",
      "https://otieu.com/4/10300452",
      "https://otieu.com/4/10300459",
      "https://otieu.com/4/10300461",
      "https://otieu.com/4/10300467",
      "https://otieu.com/4/10300469"
    ];
    
    const user = await this.getUserByTelegramId(telegramUserId);
    const counter = user?.linkCounter || 0;
    return links[counter];
  }

  async getCurrentDownloadLink(telegramUserId: number): Promise<string> {
    const downloadLinks = [
      "https://exe.io/MKLLSm",
      "https://shrinkme.click/6nqzNIo"
    ];
    
    const user = await this.getUserByTelegramId(telegramUserId);
    const counter = user?.linkCounter || 0;
    // Use modulo 2 to alternate between the two links
    return downloadLinks[counter % 2];
  }

  async updateDownloadLinkCounter(telegramUserId: number): Promise<User | undefined> {
    const user = await this.getUserByTelegramId(telegramUserId);
    if (!user) return undefined;
    
    const newCounter = (user.linkCounter || 0) + 1;
    const [updatedUser] = await db
      .update(users)
      .set({ linkCounter: newCounter })
      .where(eq(users.telegramUserId, telegramUserId))
      .returning();
    return updatedUser;
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