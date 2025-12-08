import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/user/:telegramUserId", async (req, res) => {
    try {
      const telegramUserId = parseInt(req.params.telegramUserId);
      const user = await storage.getUserByTelegramId(telegramUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/agree/:telegramUserId", async (req, res) => {
    try {
      const telegramUserId = parseInt(req.params.telegramUserId);
      const user = await storage.updateUserAgreement(telegramUserId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
