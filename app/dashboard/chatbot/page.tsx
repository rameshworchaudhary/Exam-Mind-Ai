// app/dashboard/chatbot/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Bot, User, Trash2, Sparkles, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { saveChatMessage, incrementUserProfileField } from "@/firebase/firestore";
import { getAuthHeaders } from "@/firebase/auth";
import { generateId } from "@/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "Explain TCP vs UDP with a simple everyday real-life example",
  "How does Dijkstra's algorithm work step-by-step?",
  "What are ACID properties in database management? Give simple examples",
  "Explain the difference between a Process and a Thread in operating systems",
];

export default function ChatbotPage() {
  const { user, refreshProfile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm here to help you study and solve any doubts. Ask me about any topic, equation, or past question, and I'll explain it simply with zero confusing jargon.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [sessionId] = useState(() => generateId());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Save user message
    if (user) {
      await saveChatMessage(user.uid, {
        role: "user",
        content: content.trim(),
        sessionId,
      });
    }

    try {
      const authHeaders = await getAuthHeaders(user);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content })),
          subject,
          uid: user?.uid,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Chat failed");
      }

      const reply = data.reply || "No response received";

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message
      if (user) {
        await saveChatMessage(user.uid, {
          role: "assistant",
          content: reply,
          sessionId,
        });
        await incrementUserProfileField(user.uid, "aiUsageCount", 1);
        await refreshProfile();
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to get response. Please try again.";
      toast.error(errorMsg);
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Conversation cleared. Ready for your next query.",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8.5rem)] flex flex-col gap-3.5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/80 rounded-xl px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm tracking-tight text-foreground">Ask a Study Doubt</h2>
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                Ready to Help
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Clear doubts with simple, step-by-step explanations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Subject Filter */}
          <input
            type="text"
            placeholder="Subject name (e.g. DBMS)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="hidden sm:block px-3 py-1.5 rounded-lg border border-border/80 bg-muted/20 text-xs text-foreground focus:outline-none focus:border-indigo-500 w-44 transition-colors placeholder:text-muted-foreground/60"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            title="Clear chat thread"
            className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 bg-card border border-border/80 rounded-xl flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    message.role === "assistant"
                      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                      : "bg-muted/40 border-border/70 text-foreground"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Bot className="w-3.5 h-3.5" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-xs"
                      : "bg-muted/25 border border-border/60 text-foreground/90 rounded-tl-xs"
                  }`}
                >
                  <div
                    className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans"
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                        .replace(
                          /`(.*?)`/g,
                          "<code class='bg-black/20 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[11px]'>$1</code>"
                        )
                        .replace(/\n/g, "<br/>"),
                    }}
                  />
                  <p
                    className={`text-[10px] font-mono mt-1.5 ${
                      message.role === "user" ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-muted/25 border border-border/60 rounded-xl rounded-tl-xs px-4 py-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-150" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-300" />
                  <span className="text-xs text-muted-foreground ml-1.5 font-mono">Synthesizing...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3 border-t border-border/40 pt-3 bg-muted/10">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Suggested Prompts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-muted/20 hover:bg-muted/40 hover:border-border text-foreground/85 border border-border/60 px-3 py-2 rounded-lg transition-colors text-left truncate"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/60 p-3 bg-muted/10">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask an academic question or paste an exam problem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 px-3.5 py-2 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors placeholder:text-muted-foreground/60"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white w-9 h-9 p-0 rounded-lg transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
