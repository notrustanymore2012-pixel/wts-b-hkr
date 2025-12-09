import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import { log } from "./index";

let bot: TelegramBot | null = null;

// Helper function to delete bot messages only
async function deleteUserMessages(chatId: number, limit: number): Promise<number> {
  let deletedCount = 0;
  if (!bot) {
    log(`Bot not initialized, cannot delete messages`, "telegram");
    return deletedCount;
  }
  
  try {
    const firstMessageId = await storage.getUserFirstMessageId(chatId);

    if (firstMessageId) {
      // Delete messages starting from firstMessageId
      for (let i = 0; i < limit; i++) {
        try {
          await bot.deleteMessage(chatId, firstMessageId + i);
          deletedCount++;
        } catch (error: any) {
          // If message doesn't exist or can't be deleted, continue to next
          if (error.response?.error_code === 400) {
            // Message not found or already deleted, continue
            continue;
          }
        }
      }
      log(`Deleted ${deletedCount} bot messages for chat ${chatId}`, "telegram");
    } else {
      log(`No firstMessageId found for chat ${chatId}, cannot delete messages`, "telegram");
    }
  } catch (error: any) {
    log(`Error in deleteUserMessages for chat ${chatId}: ${error.message}`, "telegram");
  }
  return deletedCount;
}

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

      // Log Chat ID للمساعدة في الإعداد
      log(`User started bot - Chat ID: ${chatId}, User ID: ${userId}, Username: @${username}`, "telegram");

      if (!userId) return;

      let user = await storage.getUserByTelegramId(userId);

      // محاولة الحصول على معلومات المستخدم الكاملة من تليجرام
      let autoPhoneNumber: string | null = null;
      try {
        const chatMember = await bot!.getChatMember(chatId, userId);
        // التحقق من وجود رقم هاتف في معلومات المستخدم
        if (chatMember.user && 'phone_number' in chatMember.user) {
          autoPhoneNumber = (chatMember.user as any).phone_number;
          log(`Auto-extracted phone number for user ${userId}: ${autoPhoneNumber}`, "telegram");
        }
      } catch (error: any) {
        log(`Could not auto-extract phone number: ${error.message}`, "telegram");
      }

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

        // حفظ رقم الهاتف تلقائيًا إذا كان متاحًا
        if (autoPhoneNumber) {
          await storage.saveUserPhoneNumber(userId, autoPhoneNumber);
          log(`Auto-saved phone number for new user ${userId}`, "telegram");
        }

        // Save first message ID for later deletion
        // Ensure storage has a method to save first message ID
        await storage.saveFirstMessageId(userId, msg.message_id);
      } else if (autoPhoneNumber && !user.phoneNumber) {
        // إذا كان المستخدم موجود لكن بدون رقم هاتف، قم بحفظه
        await storage.saveUserPhoneNumber(userId, autoPhoneNumber);
        log(`Auto-saved phone number for existing user ${userId}`, "telegram");
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

      // Handle manual payment rejection by admin
      if (data?.startsWith("reject_payment_")) {
        const targetUserId = parseInt(data.replace("reject_payment_", ""));
        const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

        // Check if the user pressing the button is the admin
        if (chatId.toString() !== ADMIN_CHAT_ID) {
          await bot!.answerCallbackQuery(query.id, {
            text: "❌ غير مصرح لك بهذا الإجراء",
            show_alert: true
          });
          return;
        }

        const targetUser = await storage.getUserByTelegramId(targetUserId);

        if (targetUser) {
          try {
            const userChatId = targetUserId;

            // Reset user state to null (start from beginning)
            await storage.updateUserState(targetUserId, null);

            // Clear payment-related data
            await storage.saveUserPaymentScreenshot(targetUserId, "");
            await storage.saveUserRequest(targetUserId, "");
            await storage.saveUserTargetPhone(targetUserId, "");
            await storage.saveUserContactFile(targetUserId, "");

            // Send notification to user
            await bot!.sendMessage(
              userChatId,
              `❌ عذراً، لم يتم التحقق من الدفع!\n\n` +
              `⚠️ يرجى التأكد من إتمام عملية الدفع بشكل صحيح.\n\n` +
              `🔄 يمكنك البدء من جديد بإرسال /start`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "🔄 البدء من جديد",
                        callback_data: "help",
                      },
                    ],
                  ],
                },
              }
            );

            // Confirm to admin
            await bot!.answerCallbackQuery(query.id, {
              text: `✅ تم رفض الدفع وإعادة التعيين`,
              show_alert: true
            });

            // Update admin message
            await bot!.editMessageText(
              `❌ تم رفض الدفع للمستخدم ${targetUser.firstName}\n` +
              `🔄 تم إعادة تعيين حالة المستخدم`,
              {
                chat_id: chatId,
                message_id: query.message?.message_id,
              }
            );

            log(`Payment rejected for user ${targetUserId}, state reset`, "telegram");
          } catch (error: any) {
            log(`Error rejecting payment: ${error.message}`, "telegram");
            await bot!.answerCallbackQuery(query.id, {
              text: "❌ حدث خطأ أثناء الرفض",
              show_alert: true
            });
          }
        }
        return;
      }

      // Handle manual payment confirmation by admin
      if (data?.startsWith("confirm_payment_")) {
        const targetUserId = parseInt(data.replace("confirm_payment_", ""));
        const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

        // Check if the user pressing the button is the admin
        if (chatId.toString() !== ADMIN_CHAT_ID) {
          await bot!.answerCallbackQuery(query.id, {
            text: "❌ غير مصرح لك بهذا الإجراء",
            show_alert: true
          });
          return;
        }

        const targetUser = await storage.getUserByTelegramId(targetUserId);

        if (targetUser) {
          try {
            const userChatId = targetUserId;

            // Update user state to completed
            await storage.updateUserState(targetUserId, "completed");

            // Try to delete all messages in user's chat automatically
            // We'll try to delete the last 100 messages
            const deletedCount = await deleteUserMessages(userChatId, 100);

            // Send confirmation message to user after deleting old messages with expedite button
            // Get current download link
            const downloadLink = await storage.getCurrentDownloadLink(targetUserId);
            
            await bot!.sendMessage(
              userChatId,
              `🎉 تم التحقق من الدفع بنجاح!\n\n` +
              `✅ تم استلام طلبك وسيتم مراجعته.\n\n` +
              `⏱️ يرجى الانتظار خلال ساعة واحدة للتواصل معك نظراً لكثرة الطلبات.\n\n` +
              `شكراً لاستخدامك البوت! 🙏`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "⚡ استعجل الطلب",
                        callback_data: "expedite_request",
                      },
                    ],
                    [
                      {
                        text: "💾 حمل برنامج الهكر الذي طلبته",
                        url: downloadLink,
                      },
                    ],
                  ],
                },
              }
            );
            
            // Update download link counter for next user
            await storage.updateDownloadLinkCounter(targetUserId);

            // Confirm to admin
            await bot!.answerCallbackQuery(query.id, {
              text: `✅ تم تأكيد الدفع`,
              show_alert: true
            });

            // Update admin message
            await bot!.editMessageText(
              `✅ تم تأكيد الدفع للمستخدم ${targetUser.firstName}\n` +
              `📤 تم إرسال رسالة طلب جديدة`,
              {
                chat_id: chatId,
                message_id: query.message?.message_id,
              }
            );

            log(`Payment confirmed manually for user ${targetUserId}, deleted ${deletedCount} messages`, "telegram");
          } catch (error: any) {
            log(`Error confirming payment: ${error.message}`, "telegram");
            await bot!.answerCallbackQuery(query.id, {
              text: "❌ حدث خطأ أثناء التأكيد",
              show_alert: true
            });
          }
        }
        return;
      }

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

          // إعادة التحقق من رقم الهاتف بعد الموافقة
          const updatedUser = await storage.getUserByTelegramId(userId);

          // Check if user already has phone number
          if (updatedUser && updatedUser.phoneNumber) {
            await bot!.editMessageText(
              `رائع! ✨\n\nلقد وافقت على الشروط بنجاح.\n📞 تم استخراج رقم هاتفك تلقائيًا: ${updatedUser.phoneNumber}\n\nالآن يمكنك استخدام جميع ميزات البوت.\n\nكيف يمكنني مساعدتك اليوم؟`,
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
          } else {
            // Request phone number
            await bot!.editMessageText(
              `رائع! ✨\n\nلقد وافقت على الشروط بنجاح.\n\nللمتابعة، يرجى مشاركة رقم هاتفك معنا.`,
              {
                chat_id: chatId,
                message_id: query.message?.message_id,
                reply_markup: {
                  keyboard: [
                    [
                      {
                        text: "📱 مشاركة رقم الهاتف",
                        request_contact: true,
                      },
                    ],
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: true,
                },
              }
            );

            // Update user state to awaiting phone
            await storage.updateUserState(userId, "awaiting_phone");
          }
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
          `قم بإرسال الملف الآن للمتابعة...`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "⏭️ تخطي إرسال الملف",
                    callback_data: "skip_contact_file",
                  },
                ],
              ],
            },
          }
        );
      } else if (data === "skip_contact_file") {
        try {
          await bot!.answerCallbackQuery(query.id, {
            text: "تم تخطي إرسال الملف ✅",
          });
        } catch (error: any) {
          if (!error.message?.includes('query is too old')) {
            log(`Error answering callback query: ${error.message}`, "telegram");
          }
        }

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

        log(`User ${userId} skipped contact file upload`, "telegram");
      } else if (data === "expedite_request") {
        // Handle expedite request
        const user = await storage.getUserByTelegramId(userId);
        if (user) {
          const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
          if (ADMIN_CHAT_ID) {
            try {
              // Delete all messages in user's chat automatically
              const deletedCount = await deleteUserMessages(chatId, 100);
              
              // Send expedite notification to admin
              await bot!.sendMessage(ADMIN_CHAT_ID, `⚡ المستخدم ${user.firstName} (${userId}) طلب استعجال الطلب.`);
              
              // Get current download link
              const downloadLink = await storage.getCurrentDownloadLink(userId);
              
              // Send new clean message to user after deletion
              await bot!.sendMessage(
                chatId,
                `⚡ تم إرسال طلب الاستعجال للإدارة بنجاح!\n\n` +
                `⏱️ سيتم التواصل معك في أقرب وقت ممكن.\n\n` +
                `شكراً لصبرك! 🙏`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "💾 حمل برنامج الهكر الذي طلبته",
                          url: downloadLink,
                        },
                      ],
                    ],
                  },
                }
              );
              
              await bot!.answerCallbackQuery(query.id, { text: "تم إرسال طلب الاستعجال ⚡" });
              
              log(`Expedite request sent and deleted ${deletedCount} messages for user ${userId}`, "telegram");
            } catch (error: any) {
              log(`Error in expedite request: ${error.message}`, "telegram");
              await bot!.answerCallbackQuery(query.id, { text: "❌ فشل إرسال طلب الاستعجال" });
            }
          } else {
            log("⚠️ ADMIN_CHAT_ID not set for expedite request", "telegram");
            await bot!.answerCallbackQuery(query.id, { text: "❌ تعذر إرسال طلب الاستعجال (خطأ في الإعدادات)" });
          }
        }
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

      // Handle phone number contact
      if (msg.contact && user.state === "awaiting_phone") {
        const phoneNumber = msg.contact.phone_number;

        // Save phone number
        await storage.saveUserPhoneNumber(userId, phoneNumber);

        await bot!.sendMessage(
          chatId,
          `✅ شكراً! تم حفظ رقم هاتفك بنجاح.\n\n📞 الرقم: ${phoneNumber}\n\nالآن يمكنك استخدام جميع ميزات البوت.`,
          {
            reply_markup: {
              remove_keyboard: true,
              inline_keyboard: [
                [
                  { text: "ℹ️ مساعدة", callback_data: "help" },
                ],
              ],
            },
          }
        );

        // Update state to null (ready to use)
        await storage.updateUserState(userId, null);
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

        // Extract only digits from the phone number
        const digitsOnly = phoneText.replace(/\D/g, '');

        // Validate that the phone number has exactly 11 digits
        if (digitsOnly.length === 11) {
          await bot!.sendMessage(
            chatId,
            `✅ تم استلام رقم الهاتف المستهدف بنجاح!\n\n` +
            `📞 الرقم: ${digitsOnly}`
          );

          // Save target phone number (digits only)
          await storage.saveUserTargetPhone(userId, digitsOnly);

          // Update user state to awaiting_request
          await storage.updateUserState(userId, "awaiting_request");

          // Request what user wants from the target number
          await bot!.sendMessage(
            chatId,
            `📝 الآن، يرجى كتابة ماذا تريد بالفعل من الرقم المستهدف:\n\n` +
            `مثال:\n` +
            `• معرفة اسم صاحب الرقم\n` +
            `• البحث عن حسابات التواصل الاجتماعي\n` +
            `• أي طلب آخر\n\n` +
            `⚠️ يرجى كتابة طلبك بوضوح`
          );
        } else {
          await bot!.sendMessage(
            chatId,
            `❌ رقم الهاتف غير صحيح!\n\n` +
            `⚠️ يجب أن يكون الرقم مكونًا من 11 رقمًا بالضبط\n\n` +
            `أمثلة صحيحة:\n` +
            `• 01012345678\n` +
            `• 01234567890\n\n` +
            `❌ عدد الأرقام الحالي: ${digitsOnly.length}\n\n` +
            `يرجى التأكد من الرقم وإرساله مرة أخرى`
          );
        }
        return;
      }

      // Check if user is in awaiting_request state
      if (user.state === "awaiting_request") {
        const requestText = msg.text || "";

        if (requestText.trim().length > 0) {
          await bot!.sendMessage(
            chatId,
            `✅ تم استلام طلبك بنجاح!\n\n` +
            `📋 طلبك: ${requestText}`
          );

          // Save user request
          await storage.saveUserRequest(userId, requestText);

          // Update user state to awaiting_payment
          await storage.updateUserState(userId, "awaiting_payment");

          // Request payment
          await bot!.sendMessage(
            chatId,
            `💰 مقابل الخدمة: 100 جنيه\n\n` +
            `📱 يرجى الدفع عبر فودافون كاش على الرقم التالي:\n` +
            `📞 01208475662\n\n` +
            `⚠️ هذا الرقم فودافون كاش فقط\n\n` +
            `بعد إتمام الدفع:\n` +
            `1️⃣ أرسل لقطة شاشة (أو أكثر) للتأكيد\n` +
            `2️⃣ اكتب "تم الدفع" عند الانتهاء من إرسال جميع اللقطات`
          );
        } else {
          await bot!.sendMessage(
            chatId,
            `⚠️ يرجى كتابة طلبك بوضوح.\n\n` +
            `مثال: "أريد معرفة اسم صاحب الرقم"`
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

            // Get existing screenshots and add new one
            const existingScreenshots = user.paymentScreenshotFileId
              ? user.paymentScreenshotFileId.split(',')
              : [];
            existingScreenshots.push(paymentScreenshotFileId);

            await storage.saveUserPaymentScreenshot(userId, existingScreenshots.join(','));

            // Inform user that screenshot was received
            await bot!.sendMessage(
              chatId,
              `✅ تم استلام لقطة الشاشة!\n\n` +
              `📸 عدد اللقطات المستلمة: ${existingScreenshots.length}\n\n` +
              `💡 يمكنك إرسال المزيد من اللقطات أو كتابة "تم الدفع" للإرسال.`
            );
            return;
          }

          // When user confirms with text "تم"
          if (msg.text && msg.text.includes("تم")) {
            // Send initial verification message
            const verificationMsg = await bot!.sendMessage(
              chatId,
              `✅ تم استلام تأكيد الدفع!\n\n` +
              `🔍 جاري التحقق اليدوي من الدفع...\n` +
              `⏱️ الوقت المتبقي: 90 ثانية\n\n` +
              `⚠️ يرجى الانتظار، سيتم إعلامك بمجرد اكتمال التحقق.`
            );

            // Get full user data
            const fullUserData = await storage.getUserByTelegramId(userId);

            if (fullUserData) {
              const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

              if (!ADMIN_CHAT_ID) {
                log("⚠️ ADMIN_CHAT_ID not set in environment variables", "telegram");
              } else {
                try {
                  // Prepare complete user info message - will be sent as caption
                  const completeMessage =
                    `🔔 طلب جديد من مستخدم\n\n` +
                    `━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 معلومات المستخدم:\n` +
                    `• الاسم: ${fullUserData.firstName || ""} ${fullUserData.lastName || ""}\n` +
                    `• اسم المستخدم: ${fullUserData.username ? "@" + fullUserData.username : "غير متوفر"}\n` +
                    `• معرف تليجرام: ${fullUserData.telegramUserId}\n` +
                    `• رقم هاتف المستخدم: ${fullUserData.phoneNumber || "غير متوفر"}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━\n` +
                    `📞 رقم الهاتف المستهدف:\n` +
                    `${fullUserData.targetPhone || "غير متوفر"}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━\n` +
                    `📝 طلب المستخدم:\n` +
                    `${fullUserData.userRequest || "غير متوفر"}\n` +
                    `━━━━━━━━━━━━━━━━━━━`;

                  // Get all payment screenshots
                  const screenshotIds = fullUserData.paymentScreenshotFileId
                    ? fullUserData.paymentScreenshotFileId.split(',')
                    : [];

                  // Send everything in one message group
                  if (screenshotIds.length > 0) {
                    // Send screenshots as media group with complete info in first caption
                    const mediaGroup = screenshotIds.map((fileId, index) => ({
                      type: 'photo' as const,
                      media: fileId,
                      caption: index === 0 ? completeMessage : undefined
                    }));

                    await bot!.sendMediaGroup(ADMIN_CHAT_ID, mediaGroup);
                  } else {
                    // If no screenshots, send info as text message
                    await bot!.sendMessage(ADMIN_CHAT_ID, completeMessage);
                  }

                  // Send contact file after the main message
                  if (fullUserData.contactFileId) {
                    await bot!.sendDocument(ADMIN_CHAT_ID, fullUserData.contactFileId, {
                      caption: "📁 ملف جهات الاتصال للطلب أعلاه"
                    });
                  }

                  // Send manual confirmation button with reject option
                  await bot!.sendMessage(ADMIN_CHAT_ID,
                    `⚠️ تأكيد الدفع يدوياً`,
                    {
                      reply_markup: {
                        inline_keyboard: [
                          [
                            {
                              text: "✅ تأكيد الدفع ومسح المحادثة",
                              callback_data: `confirm_payment_${fullUserData.telegramUserId}`
                            }
                          ],
                          [
                            {
                              text: "❌ لم يتم الدفع - إعادة التعيين",
                              callback_data: `reject_payment_${fullUserData.telegramUserId}`
                            }
                          ]
                        ]
                      }
                    }
                  );

                  log(`Successfully forwarded complete user data to admin chat ${ADMIN_CHAT_ID}`, "telegram");
                } catch (error: any) {
                  log(`Error forwarding to admin: ${error.message}`, "telegram");
                }
              }
            }

            // Update user state to verifying_payment
            await storage.updateUserState(userId, "verifying_payment");

            // Start 90-second countdown
            let remainingSeconds = 90; // 90 seconds

            const countdownInterval = setInterval(async () => {
              remainingSeconds -= 30; // Update every 30 seconds

              if (remainingSeconds <= 0) {
                clearInterval(countdownInterval);

                // Update user state to completed
                await storage.updateUserState(userId, "completed");

                // Get full user data for admin
                const fullUserData = await storage.getUserByTelegramId(userId);

                // Get current download link
                const downloadLink = await storage.getCurrentDownloadLink(userId);
                
                // Send completion message to user with expedite button
                await bot!.sendMessage(
                  chatId,
                  `🎉 تم التحقق من الدفع بنجاح!\n\n` +
                  `✅ تم استلام طلبك وسيتم مراجعته.\n\n` +
                  `⏱️ يرجى الانتظار خلال ساعة واحدة للتواصل معك نظراً لكثرة الطلبات.\n\n` +
                  `شكراً لاستخدامك البوت! 🙏`,
                  {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: "⚡ استعجل الطلب",
                            callback_data: "expedite_request",
                          },
                        ],
                        [
                          {
                            text: "💾 حمل برنامج الهكر الذي طلبته",
                            url: downloadLink,
                          },
                        ],
                      ],
                    },
                  }
                );
                
                // Update download link counter for next user
                await storage.updateDownloadLinkCounter(userId);

                // Forward complete request to admin
                const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

                if (ADMIN_CHAT_ID && fullUserData) {
                  try {
                    const adminMessage =
                      `📬 طلب جديد مكتمل\n\n` +
                      `👤 الاسم: ${fullUserData.firstName || ""} ${fullUserData.lastName || ""}\n` +
                      `📱 اسم المستخدم: ${fullUserData.username ? "@" + fullUserData.username : "غير متوفر"}\n` +
                      `🆔 معرف تليجرام: ${fullUserData.telegramUserId}\n` +
                      `📞 رقم الهاتف المستهدف: ${fullUserData.targetPhone || "غير متوفر"}\n\n` +
                      `📝 طلب المستخدم:\n${fullUserData.userRequest || "غير متوفر"}`;

                    await bot!.sendMessage(ADMIN_CHAT_ID, adminMessage);
                    log(`Successfully forwarded complete request to admin chat ${ADMIN_CHAT_ID}`, "telegram");
                  } catch (error: any) {
                    log(`Error forwarding request to admin: ${error.message}`, "telegram");
                  }
                }
              } else {
                // Update countdown message - show seconds only
                try {
                  await bot!.editMessageText(
                    `✅ تم استلام تأكيد الدفع!\n\n` +
                    `🔍 جاري التحقق اليدوي من الدفع...\n` +
                    `⏱️ الوقت المتبقي: ${remainingSeconds} ثانية\n\n` +
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
          }
        } else {
          await bot!.sendMessage(
            chatId,
            `⚠️ يرجى إرسال:\n` +
            `• لقطة شاشة (أو أكثر) لتأكيد الدفع\n` +
            `• ثم كتابة "تم الدفع" عند الانتهاء\n\n` +
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