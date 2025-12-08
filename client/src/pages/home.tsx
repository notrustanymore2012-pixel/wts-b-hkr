import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Play, Bot, Send, Paperclip, MoreVertical, Phone, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const [agreed, setAgreed] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'user' | 'bot'}[]>([
    { id: 1, text: "مرحباً بك! أنا البوت الخاص بك. لقد وافقت على الشروط، كيف يمكنني مساعدتك اليوم؟", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    setStarted(true);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newUserMsg = { id: Date.now(), text: inputValue, sender: 'user' as const };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");

    // Simulate bot reply
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        text: "هذا رد تلقائي تجريبي. في التطبيق الكامل، سيتم ربط هذا بالبوت الفعلي باستخدام التوكن الخاص بك.", 
        sender: 'bot' 
      }]);
    }, 1000);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, started]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div
            key="agreement"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md relative z-10"
          >
            <Card className="border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 text-primary ring-1 ring-primary/50 shadow-lg shadow-primary/20">
                  <Bot size={32} />
                </div>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                  تفعيل البوت
                </CardTitle>
                <CardDescription className="text-lg">
                  مرحباً بك! يرجى الموافقة للمتابعة
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 text-sm text-muted-foreground leading-relaxed text-right">
                  <p>
                    باستخدامك لهذا البوت، فإنك توافق على الالتزام بجميع القوانين واللوائح المعمول بها. يمنع استخدام البوت لأغراض غير قانونية أو ضارة.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      variant={agreed ? "default" : "outline"}
                      className={`w-full h-14 text-lg justify-between px-6 transition-all duration-300 ${agreed ? "bg-green-600 hover:bg-green-700 border-transparent" : "hover:bg-secondary/80"}`}
                      onClick={() => setAgreed(!agreed)}
                      data-testid="button-agree-terms"
                    >
                      <div className="flex items-center gap-3">
                        <AnimatePresence mode="wait">
                          {agreed ? (
                            <motion.div
                              key="check"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <CheckCircle2 className="w-6 h-6" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="shield"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <ShieldCheck className="w-6 h-6 text-muted-foreground" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <span>اوافق علي شروط سياسه الاستخدام</span>
                      </div>
                    </Button>
                  </motion.div>

                  <motion.div
                    animate={{ opacity: agreed ? 1 : 0.5 }}
                  >
                    <Button 
                      disabled={!agreed}
                      onClick={handleStart}
                      className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 disabled:shadow-none transition-all duration-300 group"
                      data-testid="button-start"
                    >
                      <span className="ml-2 group-hover:-translate-x-1 transition-transform">يتوافق وابدا</span>
                      <Play className="w-5 h-5 fill-current rotate-180" />
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
              <CardFooter className="justify-center text-xs text-muted-foreground/50 pb-6">
                محمي ومشفر بالكامل
              </CardFooter>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="w-full max-w-md h-[600px] relative z-10"
          >
            <Card className="h-full border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-border/50 bg-secondary/30 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary ring-1 ring-primary/50">
                      <Bot size={20} />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">البوت الذكي</h3>
                    <p className="text-xs text-green-500">متصل الآن</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10">
                    <Phone size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10">
                    <Video size={18} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10">
                    <MoreVertical size={18} />
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth" ref={scrollRef}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-secondary text-secondary-foreground rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-border/50 bg-secondary/30 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors">
                    <Paperclip size={20} />
                  </Button>
                  <Input 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                  <Button 
                    onClick={handleSend}
                    size="icon" 
                    className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all hover:scale-105"
                  >
                    <Send size={18} className={inputValue ? "ml-1" : ""} />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
