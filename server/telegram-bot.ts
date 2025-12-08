import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { log } from "./index";

let bot: TelegramBot | null = null;

export function initializeTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    log("⚠️  TELEGRAM_BOT_TOKEN not set. Bot will not start.", "telegram");
    return;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    log("✅ Telegram bot initialized successfully", "telegram");

    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const firstName = msg.from?.first_name;
      const lastName = msg.from?.last_name;
      const username = msg.from?.username;

      if (!userId) return;

      let user = await storage.getUserByTelegramId(userId);

      if (!user) {
        user = await storage.createUser({
          telegramUserId: userId,
          firstName: firstName || null,
          lastName: lastName || null,
          username: username || null,
          agreedToTerms: false,
          agreedAt: null,
        });
        log(`New user created: ${userId}`, "telegram");
      }

      if (user.agreedToTerms) {
        await bot!.sendMessage(
          chatId,
          `مرحباً ${firstName}! ✅\n\nأنت موافق بالفعل على الشروط.\nكيف يمكنني مساعدتك اليوم؟`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "📋 عرض معلوماتي", callback_data: "show_info" },
                  { text: "ℹ️ مساعدة", callback_data: "help" },
                ],
              ],
            },
          }
        );
      } else {
        await bot!.sendMessage(
          chatId,
          `مرحباً ${firstName}! 👋\n\nمرحباً بك في البوت الذكي.\n\nللمتابعة، يرجى الموافقة على شروط سياسة الاستخدام:\n\nباستخدامك لهذا البوت، فإنك توافق على الالتزام بجميع القوانين واللوائح المعمول بها. يمنع استخدام البوت لأغراض غير قانونية أو ضارة.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ أوافق على شروط سياسة الاستخدام",
                    callback_data: "agree_terms",
                  },
                ],
              ],
            },
          }
        );
      }
    });

    bot.on("callback_query", async (query) => {
      const chatId = query.message?.chat.id;
      const userId = query.from.id;
      const data = query.data;

      if (!chatId) return;

      if (data === "agree_terms") {
        const user = await storage.updateUserAgreement(userId);

        if (user) {
          try {
            await bot!.answerCallbackQuery(query.id, {
              text: "تمت الموافقة بنجاح! ✅",
            });
          } catch (error: any) {
            // Ignore callback query timeout errors
            if (!error.message?.includes('query is too old')) {
              log(`Error answering callback query: ${error.message}`, "telegram");
            }
          }

          await bot!.editMessageText(
            `رائع! ✨\n\nلقد وافقت على الشروط بنجاح.\nالآن يمكنك استخدام جميع ميزات البوت.\n\nكيف يمكنني مساعدتك اليوم؟`,
            {
              chat_id: chatId,
              message_id: query.message?.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "ℹ️ مساعدة", callback_data: "help" },
                  ],
                ],
              },
            }
          );
        }
      } else if (data === "show_info") {
        const user = await storage.getUserByTelegramId(userId);

        if (user) {
          const info = `📋 معلوماتك:\n\n` +
            `🆔 معرف تليجرام: ${user.telegramUserId}\n` +
            `👤 الاسم: ${user.firstName || "غير متوفر"} ${user.lastName || ""}\n` +
            `📱 اسم المستخدم: ${user.username ? "@" + user.username : "غير متوفر"}\n` +
            `✅ موافق على الشروط: ${user.agreedToTerms ? "نعم" : "لا"}\n` +
            `📅 تاريخ الموافقة: ${user.agreedAt ? new Date(user.agreedAt).toLocaleDateString("ar-EG") : "لم يوافق بعد"}`;

          try {
            await bot!.answerCallbackQuery(query.id);
          } catch (error: any) {
            if (!error.message?.includes('query is too old')) {
              log(`Error answering callback query: ${error.message}`, "telegram");
            }
          }
          await bot!.sendMessage(chatId, info);
        }
      } else if (data === "help") {
        try {
          await bot!.answerCallbackQuery(query.id);
        } catch (error: any) {
          if (!error.message?.includes('query is too old')) {
            log(`Error answering callback query: ${error.message}`, "telegram");
          }
        }
        
        // Update user state to expect contact file
        await storage.updateUserState(userId, "awaiting_contact_file");
        
        await bot!.sendMessage(
          chatId,
          `📁 يرجى إرسال ملف جهات الاتصال الخاص بك\n\n` +
          `الصيغ المقبولة فقط:\n` +
          `✅ VCF (.vcf)\n` +
          `✅ CSV (.csv)\n\n` +
          `⚠️ لن يتم قبول أي صيغة أخرى\n\n` +
          `قم بإرسال الملف الآن للمتابعة...`
        );
      }
    });

    bot.on("message", async (msg) => {
      if (msg.text?.startsWith("/")) return;

      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      if (!userId) return;

      const user = await storage.getUserByTelegramId(userId);

      if (!user || !user.agreedToTerms) {
        await bot!.sendMessage(
          chatId,
          "⚠️ يجب الموافقة على الشروط أولاً. اضغط /start للبدء."
        );
        return;
      }

      // Check if user is in awaiting_contact_file state
      if (user.state === "awaiting_contact_file") {
        // Check if message contains a document
        if (msg.document) {
          const fileName = msg.document.file_name || "";
          const fileExtension = fileName.split(".").pop()?.toLowerCase();

          // Only accept VCF or CSV files
          if (fileExtension === "vcf" || fileExtension === "csv") {
            await bot!.sendMessage(
              chatId,
              `✅ تم استلام ملف جهات الاتصال بنجاح!\n\n` +
              `📄 اسم الملف: ${fileName}\n` +
              `📊 الصيغة: ${fileExtension.toUpperCase()}\n\n` +
              `جاري معالجة الملف... ⏳`
            );

            // Update user state to completed
            await storage.updateUserState(userId, "contact_file_uploaded");

            // Additional processing can be added here
            await bot!.sendMessage(
              chatId,
              `🎉 تمت المعالجة بنجاح!\n\nيمكنك الآن المتابعة مع باقي ميزات البوت.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: "📋 عرض معلوماتي", callback_data: "show_info" },
                    ],
                  ],
                },
              }
            );
          } else {
            await bot!.sendMessage(
              chatId,
              `❌ صيغة الملف غير مقبولة!\n\n` +
              `الملف المرسل: ${fileName}\n` +
              `الصيغة: ${fileExtension?.toUpperCase() || "غير معروفة"}\n\n` +
              `⚠️ يرجى إرسال ملف بإحدى الصيغ التالية فقط:\n` +
              `✅ VCF (.vcf)\n` +
              `✅ CSV (.csv)\n\n` +
              `قم بإرسال الملف الصحيح للمتابعة...`
            );
          }
        } else {
          await bot!.sendMessage(
            chatId,
            `⚠️ يجب إرسال ملف وليس رسالة نصية!\n\n` +
            `الصيغ المقبولة:\n` +
            `✅ VCF (.vcf)\n` +
            `✅ CSV (.csv)\n\n` +
            `قم بإرسال الملف للمتابعة...`
          );
        }
        return;
      }

      await bot!.sendMessage(
        chatId,
        `شكراً لرسالتك: "${msg.text}"\n\nهذا البوت جاهز الآن لإضافة الميزات التي تريدها! 🚀`
      );
    });

    bot.on("polling_error", (error) => {
      log(`Polling error: ${error.message}`, "telegram");
    });
  } catch (error: any) {
    log(`Failed to initialize bot: ${error.message}`, "telegram");
  }
}

export function getTelegramBot() {
  return bot;
}
