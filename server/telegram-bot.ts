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
                [
                  { text: "ℹ️ مساعدة", callback_data: "help" },
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

      // Reject photos in any state except awaiting_payment
      if (msg.photo && user.state !== "awaiting_payment") {
        await bot!.sendMessage(
          chatId,
          `❌ لا يمكن إرسال الصور في هذه المرحلة!\n\n` +
          `⚠️ يتم قبول الصور فقط بعد إرسال رقم الهاتف المستهدف وعند طلب تأكيد الدفع.`
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

            // Save contact file ID for later forwarding
            await storage.saveUserContactFile(userId, msg.document.file_id);

            // Update user state to awaiting phone number
            await storage.updateUserState(userId, "awaiting_target_phone");

            // Request target phone number
            await bot!.sendMessage(
              chatId,
              `📞 الآن، يرجى إرسال رقم الهاتف المستهدف\n\n` +
              `مثال: 0501234567\n` +
              `أو: +966501234567\n\n` +
              `⚠️ يرجى إرسال رقم الهاتف فقط`
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

      // Check if user is in awaiting_target_phone state
      if (user.state === "awaiting_target_phone") {
        const phoneText = msg.text || "";
        
        // Basic phone number validation (accepts numbers with optional + and spaces)
        const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
        
        if (phoneRegex.test(phoneText.replace(/\s/g, ''))) {
          await bot!.sendMessage(
            chatId,
            `✅ تم استلام رقم الهاتف المستهدف بنجاح!\n\n` +
            `📞 الرقم: ${phoneText}`
          );

          // Save target phone number
          await storage.saveUserTargetPhone(userId, phoneText);

          // Update user state to awaiting_payment
          await storage.updateUserState(userId, "awaiting_payment");

          // Request payment
          await bot!.sendMessage(
            chatId,
            `💰 مقابل الخدمة: 100 جنيه\n\n` +
            `📱 يرجى الدفع عبر فودافون كاش على الرقم التالي:\n` +
            `📞 01208475662\n\n` +
            `⚠️ هذا الرقم فودافون كاش فقط\n\n` +
            `بعد إتمام الدفع، يرجى إرسال لقطة شاشة للتأكيد أو كتابة "تم الدفع"`
          );
        } else {
          await bot!.sendMessage(
            chatId,
            `❌ رقم الهاتف غير صحيح!\n\n` +
            `يرجى إرسال رقم هاتف صحيح مثل:\n` +
            `• 0501234567\n` +
            `• +966501234567\n\n` +
            `قم بإرسال رقم الهاتف الصحيح للمتابعة...`
          );
        }
        return;
      }

      // Check if user is in awaiting_payment state
      if (user.state === "awaiting_payment") {
        // Accept either a photo (screenshot) or text confirmation
        if (msg.photo || (msg.text && msg.text.includes("تم"))) {
          // Save payment screenshot if it's a photo
          let paymentScreenshotFileId = null;
          if (msg.photo && msg.photo.length > 0) {
            paymentScreenshotFileId = msg.photo[msg.photo.length - 1].file_id;
            await storage.saveUserPaymentScreenshot(userId, paymentScreenshotFileId);
          }

          // Send initial verification message
          const verificationMsg = await bot!.sendMessage(
            chatId,
            `✅ تم استلام تأكيد الدفع!\n\n` +
            `🔍 جاري التحقق اليدوي من الدفع...\n` +
            `⏱️ الوقت المتبقي: 15:00\n\n` +
            `⚠️ يرجى الانتظار، سيتم إعلامك بمجرد اكتمال التحقق.`
          );

          // Get full user data
          const fullUserData = await storage.getUserByTelegramId(userId);
          
          if (fullUserData) {
            // Send directly to admin username @Tradework1300
            const ADMIN_USERNAME = "@Tradework1300";
            
            try {
              // Send user information summary
              const userInfoMessage = 
                `🔔 طلب جديد من مستخدم\n\n` +
                `👤 الاسم: ${fullUserData.firstName || ""} ${fullUserData.lastName || ""}\n` +
                `📱 اسم المستخدم: ${fullUserData.username ? "@" + fullUserData.username : "غير متوفر"}\n` +
                `🆔 معرف تليجرام: ${fullUserData.telegramUserId}\n` +
                `📞 رقم الهاتف المستهدف: ${fullUserData.targetPhone || "غير متوفر"}\n\n` +
                `⏬ الملفات المرفقة أدناه:`;
              
              await bot!.sendMessage(ADMIN_USERNAME, userInfoMessage);
              
              // Forward contact file
              if (fullUserData.contactFileId) {
                await bot!.sendDocument(ADMIN_USERNAME, fullUserData.contactFileId, {
                  caption: "📁 ملف جهات الاتصال"
                });
              }
              
              // Forward payment screenshot
              if (paymentScreenshotFileId) {
                await bot!.sendPhoto(ADMIN_USERNAME, paymentScreenshotFileId, {
                  caption: "💳 لقطة شاشة الدفع"
                });
              }
              
              log(`Successfully forwarded user data to ${ADMIN_USERNAME}`, "telegram");
            } catch (error: any) {
              log(`Error forwarding to admin: ${error.message}`, "telegram");
            }
          }

          // Update user state to verifying_payment
          await storage.updateUserState(userId, "verifying_payment");

          // Start 15-minute countdown
          let remainingSeconds = 15 * 60; // 15 minutes in seconds
          
          const countdownInterval = setInterval(async () => {
            remainingSeconds -= 30; // Update every 30 seconds
            
            if (remainingSeconds <= 0) {
              clearInterval(countdownInterval);
              
              // Update user state to completed
              await storage.updateUserState(userId, "completed");
              
              // Send completion message
              await bot!.sendMessage(
                chatId,
                `🎉 تم التحقق من الدفع بنجاح!\n\n` +
                `✨ تمت المعالجة بنجاح!\n` +
                `يمكنك الآن المتابعة مع باقي ميزات البوت.`
              );
            } else {
              // Update countdown message
              const minutes = Math.floor(remainingSeconds / 60);
              const seconds = remainingSeconds % 60;
              const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              
              try {
                await bot!.editMessageText(
                  `✅ تم استلام تأكيد الدفع!\n\n` +
                  `🔍 جاري التحقق اليدوي من الدفع...\n` +
                  `⏱️ الوقت المتبقي: ${timeString}\n\n` +
                  `⚠️ يرجى الانتظار، سيتم إعلامك بمجرد اكتمال التحقق.`,
                  {
                    chat_id: chatId,
                    message_id: verificationMsg.message_id,
                  }
                );
              } catch (error: any) {
                // Ignore edit errors
                if (!error.message?.includes('message is not modified')) {
                  log(`Error updating countdown: ${error.message}`, "telegram");
                }
              }
            }
          }, 30000); // Update every 30 seconds
        } else {
          await bot!.sendMessage(
            chatId,
            `⚠️ يرجى إرسال:\n` +
            `• لقطة شاشة لتأكيد الدفع، أو\n` +
            `• كتابة "تم الدفع"\n\n` +
            `للمتابعة...`
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
