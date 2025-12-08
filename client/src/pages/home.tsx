import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, MoreVertical, Search, ArrowLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const [agreed, setAgreed] = useState(false);
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'user' | 'bot', type?: 'text' | 'action'}[]>([
    { id: 1, text: "/start", sender: 'user', type: 'text' },
    { id: 2, text: "مرحباً بك في بوت الخدمات الذكي! 🤖\n\nللبدء في استخدام البوت، يجب عليك الموافقة على شروط وسياسة الاستخدام أولاً.", sender: 'bot', type: 'text' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newUserMsg = { id: Date.now(), text: inputValue, sender: 'user' as const, type: 'text' as const };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");

    // Simulate bot reply
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "هذه نسخة تجريبية من واجهة البوت. 🛠️", 
        sender: 'bot',
        type: 'text'
      }]);
    }, 1000);
  };

  const handleAgree = () => {
    setAgreed(true);
    // Simulate interaction
    setMessages(prev => [
      ...prev, 
      { id: Date.now(), text: "✅ تم الموافقة على الشروط", sender: 'user', type: 'action' },
      { id: Date.now() + 1, text: "شكراً لك! لقد تم تفعيل حسابك بنجاح. يمكنك الآن استخدام جميع مميزات البوت. 🚀", sender: 'bot', type: 'text' }
    ]);
  };

  const handleStart = () => {
    setMessages(prev => [
      ...prev,
      { id: Date.now(), text: "🚀 بدء الاستخدام", sender: 'user', type: 'action' },
      { id: Date.now() + 1, text: "ما هي الخدمة التي تحتاجها اليوم؟", sender: 'bot', type: 'text' }
    ]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Telegram Dark Theme Colors
  const tgColors = {
    bg: "#0e1621", // Main dark background
    header: "#17212b", // Header color
    msgIn: "#182533", // Received message bubble
    msgOut: "#2b5278", // Sent message bubble
    text: "#ffffff",
    textSecondary: "#7f91a4",
    link: "#64b5ef",
    button: "#2b5278",
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black font-sans">
      <div className="w-full max-w-md h-[100dvh] md:h-[800px] bg-[#0e1621] md:rounded-xl md:border md:border-[#17212b] overflow-hidden flex flex-col relative shadow-2xl">
        
        {/* Telegram Header */}
        <div className="h-14 bg-[#17212b] flex items-center justify-between px-4 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <ArrowLeft className="text-[#f5f5f5]" size={24} />
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-[#54a9eb] text-white font-bold text-lg cursor-pointer">
                <AvatarFallback className="bg-[#54a9eb] text-white">B</AvatarFallback>
              </Avatar>
              <div className="flex flex-col -gap-1">
                <span className="text-white font-semibold text-[17px] leading-tight">My Awesome Bot</span>
                <span className="text-[#7f91a4] text-[13px]">bot</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[#f5f5f5]">
            <Search size={22} />
            <MoreVertical size={22} />
          </div>
        </div>

        {/* Chat Area */}
        <div 
          className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#0e1621] relative"
          ref={scrollRef}
          style={{ backgroundImage: "url('https://web.telegram.org/img/bg_0.png')", backgroundBlendMode: 'overlay', backgroundSize: 'cover' }}
        >
          {messages.map((msg) => {
             if (msg.type === 'action') return null; // Don't show action clicks as text messages unless desired
             
             return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-[16px] leading-snug relative shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-[#2b5278] text-white rounded-tr-sm' 
                      : 'bg-[#182533] text-white rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className={`text-[11px] float-right mt-1 ml-2 ${msg.sender === 'user' ? 'text-[#7ca0c1]' : 'text-[#586b7d]'}`}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.sender === 'user' && <Check size={12} className="inline ml-1" />}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Inline Buttons (Only show if not agreed or strictly based on logic) */}
          <AnimatePresence>
            {!agreed && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex flex-col gap-1 mt-2 max-w-[85%] mx-auto"
              >
                 <div className="bg-[#182533]/0 rounded-xl overflow-hidden">
                    <button 
                      onClick={handleAgree}
                      className="w-full bg-[#2b4a66]/40 hover:bg-[#2b4a66]/60 backdrop-blur-sm text-white py-3 text-sm font-medium mb-[2px] rounded-t-lg transition-colors border border-[#2b5278]/30 flex items-center justify-center gap-2"
                    >
                      <span>📜</span> اوافق علي شروط سياسه الاستخدام
                    </button>
                    <button 
                      disabled={true}
                      className="w-full bg-[#1c2a38]/40 text-[#586b7d] py-3 text-sm font-medium rounded-b-lg cursor-not-allowed border border-[#2b5278]/10 flex items-center justify-center gap-2"
                    >
                       <span>🚀</span> يتوافق وابدا
                    </button>
                 </div>
              </motion.div>
            )}

            {agreed && messages.length < 5 && (
               <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               className="flex flex-col gap-1 mt-2 max-w-[85%] mx-auto"
             >
                <div className="bg-[#182533]/0 rounded-xl overflow-hidden">
                   <button 
                     disabled
                     className="w-full bg-[#2b5278] text-white py-3 text-sm font-medium mb-[2px] rounded-t-lg flex items-center justify-center gap-2 opacity-50"
                   >
                     <span>✅</span> تم الموافقة
                   </button>
                   <button 
                     onClick={handleStart}
                     className="w-full bg-[#2b4a66]/40 hover:bg-[#2b4a66]/60 backdrop-blur-sm text-white py-3 text-sm font-medium rounded-b-lg transition-colors border border-[#2b5278]/30 flex items-center justify-center gap-2"
                   >
                      <span>🚀</span> يتوافق وابدا
                   </button>
                </div>
             </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="h-14 bg-[#17212b] flex items-center px-2 gap-2 shrink-0">
           <Button variant="ghost" size="icon" className="h-10 w-10 text-[#7f91a4] hover:bg-[#2b5278]/10 hover:text-white rounded-full">
             <Paperclip size={24} className="rotate-45" />
           </Button>
           <Input 
             value={inputValue}
             onChange={(e) => setInputValue(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             placeholder="Message..."
             className="flex-1 bg-[#0e1621] border-none text-white placeholder:text-[#586b7d] h-10 rounded-2xl focus-visible:ring-0"
           />
           {inputValue ? (
             <Button 
                onClick={handleSend}
                size="icon" 
                className="h-10 w-10 rounded-full bg-[#54a9eb] text-white hover:bg-[#54a9eb]/90 transition-all"
              >
                <Send size={20} />
              </Button>
           ) : (
             <Button variant="ghost" size="icon" className="h-10 w-10 text-[#7f91a4] hover:bg-[#2b5278]/10 hover:text-white rounded-full">
                <span className="text-xl">🎤</span>
             </Button>
           )}
        </div>
      </div>
    </div>
  );
}
