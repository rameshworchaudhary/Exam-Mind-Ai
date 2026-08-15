// app/dashboard/chatbot/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Brain, User, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { saveChatMessage, getChatHistory, incrementUserProfileField } from "@/firebase/firestore";
import { generateId } from "@/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "Explain the concept of recursion with an example",
  "What is the difference between RAM and ROM?",
  "How does TCP/IP protocol work?",
  "Explain Big O notation in simple terms",
  "What are ACID properties in databases?",
  "How does Dijkstra's algorithm work?",
];

export default function ChatbotPage() {
  const { user, refreshProfile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm ExamMind AI, your personal study assistant 👋\n\nI can help you:\n• Explain concepts and topics\n• Solve doubts and questions\n• Simplify complex topics\n• Prepare for exams\n\nWhat would you like to learn today?",
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
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        content: "Chat cleared! I'm ready to help you again. What would you like to study?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col gap-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">AI Study Assistant</h2>
            <p className="text-xs text-muted-foreground">Powered by GPT-4</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Subject Filter */}
          <input
            type="text"
            placeholder="Subject context (optional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="hidden sm:block px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-xs focus:outline-none focus:ring-1 focus:ring-examind-500 w-48"
          />
          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear chat" className="w-9 h-9">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-indigo-500 to-blue-600"
                      : "bg-gradient-to-br from-examind-500 to-purple-600"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Brain className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-examind-600 text-white rounded-tr-sm"
                      : "bg-muted/70 rounded-tl-sm"
                  }`}
                >
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                        .replace(/`(.*?)`/g, "<code class='bg-black/10 px-1 rounded text-xs'>$1</code>")
                        .replace(/\n/g, "<br/>"),
                    }}
                  />
                  <p className={`text-xs mt-1.5 ${message.role === "user" ? "text-white/50" : "text-muted-foreground"}`}>
                    {message.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-examind-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Try asking:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-muted/70 hover:bg-muted border border-border px-3 py-1.5 rounded-full transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask me anything about your studies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-examind-500 disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-examind-600 hover:bg-examind-700 text-white w-11 h-11 p-0 rounded-xl"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
