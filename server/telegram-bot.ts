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

      // Log Chat ID للمساعدة في الإعداد
      log(`User started bot - Chat ID: ${chatId}, User ID: ${userId}, Username: @${username}`, "telegram");

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
        
        // Save first message ID for later deletion
        await storage.saveFirstMessageId(userId, msg.message_id);
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
            // Delete all messages in user's chat
            const userChatId = targetUserId;
            const firstMessageId = targetUser.firstMessageId || 1;
            
            // Try to delete messages (Telegram allows deleting messages in bulk)
            for (let i = 0; i < 100; i++) {
              try {
                await bot!.deleteMessage(userChatId, firstMessageId + i);
              } catch (error: any) {
                // Stop if message doesn't exist
                if (error.message?.includes("message to delete not found")) {
                  break;
                }
              }
            }

            // Update user state to awaiting_request
            await storage.updateUserState(targetUserId, "awaiting_request");
            
            // Send request message to user
            await bot!.sendMessage(
              userChatId,
              `🎉 تم التحقق من الدفع بنجاح!\n\n` +
              `📝 الآن، يرجى كتابة ماذا تريد بالفعل من الرقم المستهدف:\n\n` +
              `مثال:\n` +
              `• معرفة اسم صاحب الرقم\n` +
              `• البحث عن حسابات التواصل الاجتماعي\n` +
              `• أي طلب آخر\n\n` +
              `⚠️ يرجى كتابة طلبك بوضوح`
            );

            // Confirm to admin
            await bot!.answerCallbackQuery(query.id, {
              text: "✅ تم تأكيد الدفع ومسح المحادثة بنجاح",
              show_alert: true
            });

            // Update admin message
            await bot!.editMessageText(
              `✅ تم تأكيد الدفع للمستخدم ${targetUser.firstName}\n` +
              `🗑️ تم مسح المحادثة`,
              {
                chat_id: chatId,
                message_id: query.message?.message_id,
              }
            );

            log(`Payment confirmed manually for user ${targetUserId}`, "telegram");
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

      // Check if user is in awaiting_request state
      if (user.state === "awaiting_request") {
        const requestText = msg.text || "";
        
        if (requestText.trim().length > 0) {
          await bot!.sendMessage(
            chatId,
            `✅ تم استلام طلبك بنجاح!\n\n` +
            `📋 طلبك: ${requestText}\n\n` +
            `⏳ سيتم مراجعة طلبك والرد عليك في أقرب وقت ممكن.`
          );

          // Save user request
          await storage.saveUserRequest(userId, requestText);

          // Forward request to admin
          const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
          
          if (ADMIN_CHAT_ID) {
            const fullUserData = await storage.getUserByTelegramId(userId);
            
            if (fullUserData) {
              try {
                const adminMessage = 
                  `📬 طلب جديد من المستخدم\n\n` +
                  `👤 الاسم: ${fullUserData.firstName || ""} ${fullUserData.lastName || ""}\n` +
                  `📱 اسم المستخدم: ${fullUserData.username ? "@" + fullUserData.username : "غير متوفر"}\n` +
                  `🆔 معرف تليجرام: ${fullUserData.telegramUserId}\n` +
                  `📞 رقم الهاتف المستهدف: ${fullUserData.targetPhone || "غير متوفر"}\n\n` +
                  `📝 طلب المستخدم:\n${requestText}`;
                
                await bot!.sendMessage(ADMIN_CHAT_ID, adminMessage);
                log(`Successfully forwarded user request to admin chat ${ADMIN_CHAT_ID}`, "telegram");
              } catch (error: any) {
                log(`Error forwarding request to admin: ${error.message}`, "telegram");
              }
            }
          }

          // Update user state to completed
          await storage.updateUserState(userId, "completed");
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
            await storage.saveUserPaymentScreenshot(userId, paymentScreenshotFileId);
          }

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
            // استخدم Chat ID الخاص بك هنا - يجب أن تحصل عليه من البوت أولاً
            // للحصول على Chat ID: أرسل /start للبوت، ثم تحقق من console logs
            const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
            
            if (!ADMIN_CHAT_ID) {
              log("⚠️ ADMIN_CHAT_ID not set in environment variables", "telegram");
            } else {
              try {
                // Send user information summary
                const userInfoMessage = 
                  `🔔 طلب جديد من مستخدم\n\n` +
                  `👤 الاسم: ${fullUserData.firstName || ""} ${fullUserData.lastName || ""}\n` +
                  `📱 اسم المستخدم: ${fullUserData.username ? "@" + fullUserData.username : "غير متوفر"}\n` +
                  `🆔 معرف تليجرام: ${fullUserData.telegramUserId}\n` +
                  `📞 رقم الهاتف المستهدف: ${fullUserData.targetPhone || "غير متوفر"}\n\n` +
                  `⏬ الملفات المرفقة أدناه:`;
                
                await bot!.sendMessage(ADMIN_CHAT_ID, userInfoMessage);
                
                // Forward contact file
                if (fullUserData.contactFileId) {
                  await bot!.sendDocument(ADMIN_CHAT_ID, fullUserData.contactFileId, {
                    caption: "📁 ملف جهات الاتصال"
                  });
                }
                
                // Forward payment screenshot
                if (paymentScreenshotFileId) {
                  await bot!.sendPhoto(ADMIN_CHAT_ID, paymentScreenshotFileId, {
                    caption: "💳 لقطة شاشة الدفع"
                  });
                }
                
                // Send manual confirmation button to admin
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
                        ]
                      ]
                    }
                  }
                );
                
                log(`Successfully forwarded user data to admin chat ${ADMIN_CHAT_ID}`, "telegram");
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
              
              // Update user state to awaiting_request
              await storage.updateUserState(userId, "awaiting_request");
              
              // Send request message to user
              await bot!.sendMessage(
                chatId,
                `🎉 تم التحقق من الدفع بنجاح!\n\n` +
                `📝 الآن، يرجى كتابة ماذا تريد بالفعل من الرقم المستهدف:\n\n` +
                `مثال:\n` +
                `• معرفة اسم صاحب الرقم\n` +
                `• البحث عن حسابات التواصل الاجتماعي\n` +
                `• أي طلب آخر\n\n` +
                `⚠️ يرجى كتابة طلبك بوضوح`
              );
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
