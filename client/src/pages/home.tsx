import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, MessageCircle, Bot, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HACKER_LINKS = [
  "https://otieu.com/4/10300426",
  "https://otieu.com/4/10300338",
  "https://otieu.com/4/10300428",
  "https://otieu.com/4/10300429",
  "https://otieu.com/4/10300447",
  "https://otieu.com/4/10300452",
  "https://otieu.com/4/10300459",
  "https://otieu.com/4/10300461",
  "https://otieu.com/4/10300467",
  "https://otieu.com/4/10300469",
];

export default function Home() {
  const [agreed, setAgreed] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0);

  const handleStart = () => {
    setStarted(true);
  };

  const handleHackerServices = () => {
    window.open(HACKER_LINKS[currentLinkIndex], '_blank');
    setCurrentLinkIndex((prevIndex) => (prevIndex + 1) % HACKER_LINKS.length);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10 relative overflow-hidden font-sans">
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
                      <span className="ml-2 group-hover:-translate-x-1 transition-transform">فتح البوت في تليجرام</span>
                      <MessageCircle className="w-5 h-5" />
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
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="w-full max-w-md relative z-10"
          >
            <Card className="border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-500 ring-1 ring-green-500/50 shadow-lg shadow-green-500/20">
                  <CheckCircle2 size={40} />
                </div>
                <CardTitle className="text-2xl font-bold">
                  رائع! تمت الموافقة ✨
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  يمكنك الآن استخدام البوت على تليجرام
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    كيفية الاستخدام:
                  </h3>
                  <ol className="text-sm text-muted-foreground space-y-2 mr-5 list-decimal">
                    <li>افتح تطبيق تليجرام على هاتفك أو حاسوبك</li>
                    <li>ابحث عن البوت أو اضغط على الرابط أدناه</li>
                    <li>اضغط على زر "Start" أو "/start"</li>
                    <li>اتبع التعليمات للموافقة على الشروط</li>
                  </ol>
                </div>

                <Button 
                  className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg group"
                  onClick={() => window.open('https://t.me/YOUR_BOT_USERNAME', '_blank')}
                  data-testid="button-open-telegram"
                >
                  <span className="ml-2">فتح البوت في تليجرام</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button 
                  className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg group"
                  onClick={handleHackerServices}
                  data-testid="button-hacker-services"
                >
                  <span className="ml-2">خدمات هكرز</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button 
                  variant="outline"
                  className="w-full h-10"
                  onClick={() => setStarted(false)}
                  data-testid="button-back"
                >
                  العودة
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}