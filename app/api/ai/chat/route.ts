// app/api/ai/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { chatWithAI } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, subject } = body;
    const uid = await getVerifiedUid(req, body.uid);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid conversation message." },
        { status: 400 }
      );
    }

    // 1. CHECK DAILY CHAT LIMIT (35 messages per day)
    if (uid) {
      const limitCheck = await checkServerDailyUsage(uid, "chat");
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Daily chat limit reached! You have reached your limit of ${limitCheck.limit} AI Chat messages for today. Please try again tomorrow.`,
            limitReached: true,
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
          },
          { status: 429 }
        );
      }
    }

    // 2. RUN AI CHAT (Powered by Groq)
    const reply = await chatWithAI(messages, subject);

    // Ensure AI response is valid before consuming usage quota
    if (!reply || typeof reply !== "string" || reply.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to generate AI response. Please try again." },
        { status: 500 }
      );
    }

    // 3. ATOMICALLY INCREMENT USAGE ONLY AFTER SUCCESSFUL AI RESPONSE
    let usageInfo = null;
    if (uid) {
      usageInfo = await incrementServerDailyUsage(uid, "chat");
    }

    return NextResponse.json({
      success: true,
      reply,
      data: { reply },
      usage: usageInfo
        ? {
            current: usageInfo.chatCount,
            limit: usageInfo.maxChat,
            remaining: usageInfo.chatRemaining,
          }
        : undefined,
    });
  } catch (error) {
    console.error("AI Chat API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "AI Chat request failed";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

