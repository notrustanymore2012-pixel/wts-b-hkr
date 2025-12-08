import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Play, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-primary/20 bg-card/50 backdrop-blur-xl shadow-2xl">
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
    </div>
  );
}
